import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { createBlankState } from '../src/services/storage';
import { isDriveEndpoint, portfolioRequestId, portfolioFileName, readDriveReceipt, submitPortfolioPdf } from '../src/services/driveSubmission';

const script = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
const requestId = 'a'.repeat(64);
const pdf = '%PDF-1.4\nThis is a synthetic protocol test, not a rendered student PDF.\n%%EOF';
const payload = (id = requestId) => ({ postData: { contents: JSON.stringify({ v: 1, requestId: id,
  mimeType: 'application/pdf', fileName: '장원초_3학년_테스트.pdf', base64: Buffer.from(pdf).toString('base64') }) } });

function server(now = Date.parse('2026-10-21T18:00:00+09:00')) {
  const properties = new Map<string, string>();
  const files = new Map<string, any>();
  const filesById = new Map<string, any>();
  let creations = 0, failReceipt = false, failCreate = false, failRename = false;
  const response = (value: string) => ({ value, setMimeType() { return this; } });
  const folder = { getName: () => '2026 장원 별밤학교 미션 인증샷',
    getFilesByName: (name: string) => ({ hasNext: () => files.has(name), next: () => files.get(name) }),
    createFile: (blob: any) => { if (failCreate) { failCreate = false; throw Error('simulated Drive failure'); }
      creations++; const id = 'fake-file-id-' + creations;
      const file = { name: blob.name, getId: () => id, setName(name: string) { if (failRename) { failRename = false; throw Error('simulated rename failure'); } files.delete(this.name); this.name = name; files.set(name, this); return this; } };
      files.set(blob.name, file); filesById.set(id, file); return file; } };
  class Clock extends Date { static now() { return now; } }
  const context: any = { Date: Clock, console: { log() {}, warn() {} },
    DriveApp: { getFolderById: (id: string) => { assert.equal(id, '1nVOwpeKQ5URIGDwiOmECRaJZTWBEUEPk'); return folder; }, getFileById: (id: string) => filesById.get(id) },
    Utilities: { base64Decode: (data: string) => Array.from(Buffer.from(data, 'base64')),
      newBlob: (bytes: number[], type: string, name: string) => ({ bytes, type, name }) },
    ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'javascript' }, createTextOutput: response },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key: string) => properties.get(key) || null,
      setProperty: (key: string, value: string) => { if (failReceipt && key.startsWith('r_') && JSON.parse(value).state === 'saved') { failReceipt = false; throw Error('simulated receipt loss'); } properties.set(key, value); },
      setProperties: (data: Record<string, string>) => Object.entries(data).forEach(([key, value]) => properties.set(key, value))
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, hasLock: () => true, releaseLock() {} }) }
  };
  vm.runInNewContext(script + '\nthis.api = { doPost, doGet, checkUploadFolder };', context);
  return { api: context.api, properties, files, creations: () => creations,
    loseReceipt: () => { failReceipt = true; }, loseWrite: () => { failCreate = true; }, loseRename: () => { failRename = true; },
    setTime: (value: number) => { now = value; } };
}
const post = (s: ReturnType<typeof server>, id = requestId) => JSON.parse(s.api.doPost(payload(id)).value);
const status = (s: ReturnType<typeof server>, id = requestId, callback = 'byeolbamReceipt_' + 'b'.repeat(32)) =>
  s.api.doGet({ parameter: { action: 'status', requestId: id, callback } }).value;

const s = server();
assert.equal(post(s).state, 'saved'); assert.equal(s.creations(), 1);
assert.deepEqual([...s.files.keys()], ['장원초_3학년_테스트.pdf']);
assert.equal(post(s).state, 'saved'); assert.equal(s.creations(), 1);
const receipt = status(s);
assert.match(receipt, /"state":"saved"/);
assert.ok(!/장원|테스트|fake-file-id|fileName|folderId|base64/.test(receipt));
assert.ok(!status(s, requestId, 'alert);evil(').includes('evil'));
assert.equal(s.api.checkUploadFolder().ready, true);
console.log('PASS: designated folder only; repeated request writes one PDF; receipts expose no identity or file access');

const lost = server(); lost.loseReceipt();
assert.equal(post(lost).state, 'pending'); assert.equal(lost.creations(), 1);
assert.match(status(lost), /"state":"pending"/);
assert.equal(post(lost).state, 'saved'); assert.equal(lost.creations(), 1);
assert.equal(lost.properties.get('fileCount'), '1');
const failed = server(); failed.loseWrite(); assert.equal(post(failed).state, 'pending');
assert.equal(post(failed).state, 'saved'); assert.equal(failed.creations(), 1); assert.equal(failed.properties.get('fileCount'), '1');
const rename = server(); rename.loseRename(); assert.equal(post(rename).state, 'pending');
assert.equal(post(rename).state, 'saved'); assert.equal(rename.creations(), 1); assert.deepEqual([...rename.files.keys()], ['장원초_3학년_테스트.pdf']);
console.log('PASS: failed Drive writes and lost success receipts recover without duplicate files or duplicate reservations');

const invalid = server();
const bad = payload(); const badData = JSON.parse(bad.postData.contents); badData.base64 = Buffer.from('not a PDF').toString('base64'); bad.postData.contents = JSON.stringify(badData);
assert.notEqual(JSON.parse(invalid.api.doPost(bad).value).state, 'saved'); assert.equal(invalid.creations(), 0);
const limit = server(); limit.properties.set('fileCount', '1000'); assert.equal(post(limit).state, 'rejected'); assert.equal(limit.creations(), 0);
const size = server(); size.properties.set('totalBytes', String(5 * 1024 * 1024 * 1024)); assert.equal(post(size).state, 'rejected'); assert.equal(size.creations(), 0);
console.log('PASS: invalid PDFs, file count and total storage limits do not create files');

// A PDF larger than the remaining budget must not close every other participant's receipt.
const nearFull = server(); nearFull.properties.set('totalBytes', String(5 * 1024 * 1024 * 1024 - Buffer.byteLength(pdf) + 1));
assert.equal(post(nearFull).state, 'rejected');
assert.match(status(nearFull, 'd'.repeat(64)), /"state":"unknown"/);
const smallPdf = payload('d'.repeat(64));
smallPdf.postData.contents = JSON.stringify({ ...JSON.parse(smallPdf.postData.contents), base64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') });
assert.equal(JSON.parse(nearFull.api.doPost(smallPdf).value).state, 'saved');
const oldClosed = server(); oldClosed.properties.set('closed', 'CLOSED_OR_LIMIT');
assert.match(status(oldClosed), /"state":"unknown"/); assert.equal(post(oldClosed).state, 'saved');

// An unfinished reservation must become a confirmed rejection after the deadline.
const expired = server(); expired.loseWrite(); assert.equal(post(expired).state, 'pending');
expired.setTime(Date.parse('2026-10-23T00:00:01+09:00'));
assert.equal(post(expired).state, 'rejected');
assert.match(status(expired), /"state":"rejected"/);
const lateRename = server(); lateRename.loseRename(); assert.equal(post(lateRename).state, 'pending');
lateRename.setTime(Date.parse('2026-10-23T00:00:01+09:00'));
assert.equal(post(lateRename).state, 'saved'); assert.equal(lateRename.creations(), 1);

// A damaged receipt must not turn the status endpoint into an uncaught script error.
const corrupt = server(); corrupt.properties.set('r_' + requestId, '{damaged');
assert.match(status(corrupt), /"reason":"RECEIPT_UNREADABLE"/);
assert.equal(post(corrupt).state, 'pending'); assert.equal(corrupt.creations(), 0);
const legacySaved = server(); legacySaved.properties.set('r_' + requestId, JSON.stringify({ state: 'saved', fileId: 'legacy-id' }));
legacySaved.properties.set('fileCount', 'damaged');
assert.match(status(legacySaved), /"state":"saved"/); assert.equal(post(legacySaved).state, 'saved');
assert.equal(legacySaved.creations(), 0);
const corruptCount = server(); corruptCount.properties.set('totalBytes', 'NaN');
assert.match(status(corruptCount), /"reason":"COUNTERS_UNREADABLE"/); assert.equal(post(corruptCount).state, 'pending');
assert.equal(corruptCount.creations(), 0);

const badPdf = server();
assert.equal(JSON.parse(badPdf.api.doPost(bad).value).state, 'rejected');
assert.equal(badPdf.creations(), 0);
for (const contents of ['{broken', 'null', '[]']) assert.equal(JSON.parse(badPdf.api.doPost({ postData: { contents } }).value).state, 'rejected');
const frozenName = server(); frozenName.loseRename(); assert.equal(post(frozenName).state, 'pending');
const altered = payload(); altered.postData.contents = JSON.stringify({ ...JSON.parse(altered.postData.contents), fileName: '다른이름.pdf' });
assert.equal(JSON.parse(frozenName.api.doPost(altered).value).state, 'saved');
assert.deepEqual([...frozenName.files.keys()], ['장원초_3학년_테스트.pdf']); assert.equal(frozenName.creations(), 1);
const longName = server(); const longPayload = payload(); const longFilename = Array(4).fill('별'.repeat(60)).join('_') + '.pdf';
longPayload.postData.contents = JSON.stringify({ ...JSON.parse(longPayload.postData.contents), fileName: longFilename });
assert.equal(JSON.parse(longName.api.doPost(longPayload).value).state, 'saved');
assert.deepEqual([...longName.files.keys()], [longFilename]);
console.log('PASS: a single oversize reservation cannot close all uploads; expired pending receipts reject; damaged receipts stay readable; invalid PDFs reject');

assert.ok(isDriveEndpoint('https://script.google.com/macros/s/EXAMPLE_TEST/exec'));
for (const endpoint of ['https://example.com/exec', 'https://script.google.com.evil.test/macros/s/x/exec', 'https://script.google.com/macros/s/x/dev', 'https://script.google.com/macros/s/x/exec?q=1']) assert.equal(isDriveEndpoint(endpoint), false);
const participant = { ...createBlankState(), name: '테스트', grade: '3학년', reflection: { family: '고마워요' } };
const version = await portfolioRequestId(participant);
assert.equal(version, await portfolioRequestId(JSON.parse(JSON.stringify(participant))))
assert.notEqual(version, await portfolioRequestId({ ...participant, reflection: { family: '사랑해요' } }));
assert.notEqual(version, await portfolioRequestId({ ...participant, records: { 0: { evidenceId: 'replacement' } } }));
assert.ok(!/[\\/:*?"<>|]/.test(portfolioFileName({ ...participant, name: '별/밤:*?' })));
assert.equal(portfolioFileName({...participant,school:'장원초',grade:'3학년',classroom:'02반',name:'홍길동'}),'장원초등학교_3학년_2반_홍길동.pdf');
assert.equal(portfolioFileName({...participant,school:'도계초등학교',grade:'2학년',classroom:'1',name:'김별빛'}),'도계초등학교_2학년_1반_김별빛.pdf');
assert.equal(portfolioFileName({...participant,school:'도계유치원',grade:'유치원',classroom:'해님반',name:'별이'}),'도계유치원_유치원_해님반_별이.pdf');
assert.notEqual(version, await portfolioRequestId({...participant,classroom:'2'}));
assert.equal(await portfolioRequestId({...participant,classroom:'02반'}),await portfolioRequestId({...participant,classroom:'2'}));
console.log('PASS: endpoint allowlist and stable content IDs; edited reflections or photos create a new version');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://event.test' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, FileReader: dom.window.FileReader });
const endpoint = 'https://script.google.com/macros/s/EXAMPLE_TEST/exec';
let states: string[] = [], posts = 0, mismatch = false, serverVersion = 3;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: unknown, options: any) => {
 assert.equal(url,'/api/portfolio');assert.equal(options.credentials,'same-origin');assert.equal(options.mode,undefined);
 const body=JSON.parse(options.body);if(body.action==='status')return {ok:true,json:async()=>({requestId:mismatch?'c'.repeat(64):body.requestId,state:states.shift()||'unknown',version:serverVersion})};
 posts++;assert.equal(body.mimeType,'application/pdf');return {ok:true,json:async()=>({requestId:body.requestId,state:'pending',version:3})};
}) as any;
const blob = new dom.window.Blob([pdf], { type: 'application/pdf' }) as unknown as Blob;
try {
  states = ['unknown', 'saved']; assert.equal((await submitPortfolioPdf(endpoint, requestId, blob, 'test.pdf')).state, 'saved'); assert.equal(posts, 1);
  states = ['saved']; assert.equal((await submitPortfolioPdf(endpoint, requestId, blob, 'test.pdf')).state, 'saved'); assert.equal(posts, 1);
  mismatch = true; await assert.rejects(readDriveReceipt(endpoint, requestId), /올바르지/); mismatch = false;
  await assert.rejects(submitPortfolioPdf('', requestId, blob, 'test.pdf'), /준비/);
  serverVersion=1; const previousPosts=posts; states=['unknown'];await assert.rejects(submitPortfolioPdf(endpoint, requestId, blob, 'test.pdf'), /파일명 설정/);assert.equal(posts,previousPosts);serverVersion=2;
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: any) => originalTimeout(fn, 0)) as any;
  try {
    states = Array(6).fill('unknown');
    await assert.rejects(submitPortfolioPdf(endpoint, requestId, blob, 'test.pdf'), /저장 확인을 받지 못/);
  } finally { globalThis.setTimeout = originalTimeout; }
  assert.equal(document.head.querySelectorAll('script').length, 0);
  assert.equal(Object.keys(window).filter(k => k.startsWith('byeolbamReceipt_')).length, 0);
} finally { globalThis.fetch = originalFetch; dom.window.close(); }
console.log('PASS: relay POST is not success; only matching saved receipts confirm; retries check first; no browser JSONP');
