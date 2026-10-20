/** 장원 별밤학교 — 최종 PDF만 접수. Firebase, 파일 공개, 폴더 목록 조회 기능 없음. */
const CONFIG = Object.freeze({
  folderId: '1nVOwpeKQ5URIGDwiOmECRaJZTWBEUEPk',
  maxPdfBytes: 10 * 1024 * 1024,
  maxFiles: 1000,
  maxTotalBytes: 5 * 1024 * 1024 * 1024,
  closesAt: '2026-10-23T00:00:00+09:00'
});

function checkUploadFolder() {
  const folder = DriveApp.getFolderById(CONFIG.folderId);
  console.log('접수 폴더 확인: ' + folder.getName());
  return { ready: true, name: folder.getName() };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const requestId = String(p.requestId || '');
  const callback = String(p.callback || '');
  if (p.action !== 'status' || !/^[a-f0-9]{64}$/.test(requestId) || !/^byeolbamReceipt_[a-f0-9]{32}$/.test(callback)) {
    return output_({ service: 'jangwon-final-pdf', version: 3 });
  }
  let receipt;
  try {
    const properties = PropertiesService.getScriptProperties();
    const record = readRecord_(properties, 'r_' + requestId);
    // Recalculate availability: v2's legacy "closed" marker could be set by just one large PDF.
    const closed = !record && (Date.now() > Date.parse(CONFIG.closesAt) ||
      readCounter_(properties, 'fileCount') >= CONFIG.maxFiles ||
      readCounter_(properties, 'totalBytes') >= CONFIG.maxTotalBytes);
    receipt = { requestId: requestId, state: record ? record.state : closed ? 'rejected' : 'unknown', version: 3 };
    if (record && record.reason) receipt.reason = safeReason_(record.reason);
  } catch (error) {
    // Always return a valid callback, even if one stored receipt is damaged.
    receipt = { requestId: requestId, state: 'pending', reason: safeReason_(error && error.message), version: 3 };
  }
  // No name, photo, Drive file ID, file URL, folder listing, or raw exception is exposed.
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(receipt) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let requestId = '';
  let lock = null;
  try {
    const text = e && e.postData && e.postData.contents;
    if (!text || text.length > Math.ceil(CONFIG.maxPdfBytes * 4 / 3) + 4000) throw new Error('INVALID_BODY');
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error('INVALID_BODY'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_REQUEST');
    requestId = String(data.requestId || '');
    if (!/^[a-f0-9]{64}$/.test(requestId) || data.v !== 1 || data.mimeType !== 'application/pdf') throw new Error('INVALID_REQUEST');
    if (typeof data.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) throw new Error('INVALID_PDF');
    const bytes = Utilities.base64Decode(data.base64);
    if (!bytes.length || bytes.length > CONFIG.maxPdfBytes || String.fromCharCode.apply(null, bytes.slice(0, 5)) !== '%PDF-') throw new Error('INVALID_PDF');
    const tail = String.fromCharCode.apply(null, bytes.slice(-1024));
    if (tail.indexOf('%%EOF') === -1) throw new Error('INVALID_PDF');

    lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return output_({ requestId: requestId, state: 'pending' });
    const properties = PropertiesService.getScriptProperties();
    const key = 'r_' + requestId;
    const existing = readRecord_(properties, key);
    if (existing && existing.state === 'saved') return output_({ requestId: requestId, state: 'saved' });
    if (existing && existing.state === 'rejected') return output_({ requestId: requestId, state: 'rejected' });
    const folder = DriveApp.getFolderById(CONFIG.folderId);
    // Filename is recorded BEFORE the write so a lost response/property write is recoverable.
    const stem = String(data.fileName || '별밤학교.pdf').replace(/\.pdf$/i, '')
      .replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, '_').trim().replace(/[. ]+$/g, '').slice(0, 243) || '별밤학교';
    const finalName = existing && (existing.finalName || (existing.fileId && existing.fileName)) || stem + '.pdf';
    const fileName = existing ? existing.fileName : '별밤학교_접수중_' + requestId + '.pdf';
    // Recover a completed upload whose final rename/receipt was interrupted.
    if (existing && existing.fileId) {
      confirmPdfFile_(properties, key, DriveApp.getFileById(existing.fileId), finalName);
      return output_({ requestId: requestId, state: 'saved' });
    }
    const found = folder.getFilesByName(fileName);
    if (found.hasNext()) {
      confirmPdfFile_(properties, key, found.next(), finalName);
      return output_({ requestId: requestId, state: 'saved' });
    }
    const count = readCounter_(properties, 'fileCount');
    const totalBytes = readCounter_(properties, 'totalBytes');
    const reservation = existing ? Number(existing.reservedBytes || 0) : 0;
    const extraBytes = Math.max(0, bytes.length - reservation);
    if (Date.now() > Date.parse(CONFIG.closesAt) || (!existing && count >= CONFIG.maxFiles) || totalBytes + extraBytes > CONFIG.maxTotalBytes) {
      // Reject this upload only. A large PDF must not shut down every smaller upload.
      // A failed reservation already has a bounded record; update it so JSONP cannot stay pending forever.
      if (existing) properties.setProperty(key, JSON.stringify(Object.assign({}, existing,
        { state: 'rejected', reason: Date.now() > Date.parse(CONFIG.closesAt) ? 'CLOSED' : 'STORAGE_LIMIT' })));
      return output_({ requestId: requestId, state: 'rejected', version: 3 });
    }
    properties.setProperties({
      [key]: JSON.stringify({ state: 'pending', fileName: fileName, finalName: finalName, reservedBytes: Math.max(reservation, bytes.length) }),
      fileCount: String(count + (existing ? 0 : 1)), totalBytes: String(totalBytes + extraBytes)
    });
    const file = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', fileName));
    // Do not change sharing. PDF inherits only the teacher folder's existing permissions.
    if (!file.getId()) throw new Error('WRITE_NOT_CONFIRMED');
    confirmPdfFile_(properties, key, file, finalName);
    return output_({ requestId: requestId, state: 'saved' });
  } catch (error) {
    // A failed/lost response is never reported as success. The same requestId can be retried.
    const reason = safeReason_(error && error.message);
    console.warn('PDF 접수 미완료: ' + reason);
    return output_({ requestId: requestId, state: /^INVALID_/.test(reason) ? 'rejected' : 'pending', reason: reason, version: 3 });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

/** Corrupt receipts never cause a new file write or expose their stored contents. */
function readRecord_(properties, key) {
  const raw = properties.getProperty(key);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (!record || ['pending', 'saved', 'rejected'].indexOf(record.state) === -1 ||
        (record.state === 'pending' && typeof record.fileName !== 'string') ||
        (record.reservedBytes !== undefined && (!Number.isSafeInteger(record.reservedBytes) || record.reservedBytes < 0))) throw new Error();
    return record;
  } catch (_) { throw new Error('RECEIPT_UNREADABLE'); }
}

function readCounter_(properties, key) {
  const value = Number(properties.getProperty(key) || 0);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('COUNTERS_UNREADABLE');
  return value;
}

function safeReason_(reason) {
  const allowed = ['INVALID_BODY', 'INVALID_REQUEST', 'INVALID_PDF', 'RECEIPT_UNREADABLE',
    'COUNTERS_UNREADABLE', 'CLOSED', 'STORAGE_LIMIT'];
  return allowed.indexOf(reason) >= 0 ? reason : 'SERVICE_UNAVAILABLE';
}

/** Store the ID before renaming so retries cannot create a second file after a lost response. */
function confirmPdfFile_(properties, key, file, finalName) {
  properties.setProperty(key, JSON.stringify({ state: 'pending', fileName: finalName, fileId: file.getId() }));
  file.setName(finalName);
  properties.setProperty(key, JSON.stringify({ state: 'saved', fileName: finalName, fileId: file.getId() }));
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
