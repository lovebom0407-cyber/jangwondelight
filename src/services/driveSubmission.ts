import type { ParticipantState } from '../types';
import { classroomLabel, fullSchoolName, normalizeClassroom } from './participantInfo';

export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export type DriveReceipt = { requestId: string; state: 'unknown' | 'pending' | 'saved' | 'rejected'; reason?: string; version?: number };
const ENDPOINT = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
export const isDriveEndpoint = (value: string) => ENDPOINT.test(value);
const filePart = (value: unknown) => String(value ?? '').normalize('NFC')
  .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').trim().replace(/[. ]+$/g, '').slice(0, 60);
export const portfolioFileName = (s: ParticipantState) =>
  [fullSchoolName(s.school), s.grade || '학년미입력', classroomLabel(s.classroom), s.name || '이름미입력']
    .map(filePart).join('_') + '.pdf';

/** Stable across reloads and PDF creation timestamps; changes when portfolio content changes. */
export async function portfolioRequestId(state: ParticipantState): Promise<string> {
  const content = JSON.stringify({ v: 1, participantId: state.participantId,
    name: state.name, school: state.school, grade: state.grade, classroom: normalizeClassroom(state.classroom), family: state.family,
    house: state.house, photo: state.photo, finishedAt: state.finishedAt,
    completed: state.completed.slice().sort(), records: state.records,
    reflection: state.reflection, observatory: state.observatory, observation: state.fieldObservation });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
}

/** Same-origin server relay follows Google's redirects outside the mobile browser. */
async function portfolioGateway(body: unknown, timeoutMs = 55000): Promise<DriveReceipt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/api/portfolio', { method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:controller.signal });
    if (!response.ok) throw new Error('서버가 제출 확인을 완료하지 못했어요. 잠시 후 다시 눌러 주세요.');
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('저장 확인이 지연되고 있어요. 다시 제출하면 기존 접수를 먼저 확인해요.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function readDriveReceipt(endpoint: string, requestId: string, timeoutMs = 55000): Promise<DriveReceipt> {
  if (!isDriveEndpoint(endpoint) || !/^[a-f0-9]{64}$/.test(requestId)) throw new Error('제출 주소를 확인해 주세요.');
  const receipt = await portfolioGateway({ action:'status', requestId }, timeoutMs);
  if (receipt?.requestId !== requestId || !['unknown','pending','saved','rejected'].includes(receipt.state)) throw new Error('제출 확인 응답이 올바르지 않아요.');
  return receipt;
}

export function pdfBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('PDF 파일을 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

/** Runs only after the guardian presses submit. Opaque POST completion is NEVER a receipt. */
export async function submitPortfolioPdf(endpoint: string, requestId: string, blob: Blob, fileName: string,
  onPhase: (phase: string) => void = () => {}) {
  if (!isDriveEndpoint(endpoint)) throw new Error('선생님이 제출 기능을 준비하고 있어요. PDF를 먼저 저장해 주세요.');
  if (blob.type !== 'application/pdf' || !blob.size || blob.size > MAX_PDF_BYTES) throw new Error('Netlify에서는 4MB 이하의 PDF만 제출할 수 있어요. PDF를 기기에 저장하고 선생님께 알려 주세요.');
  onPhase('이전에 제출했는지 확인 중…');
  const previous = await readDriveReceipt(endpoint, requestId);
  if ((previous.version || 1) < 2) throw new Error('선생님이 PDF 파일명 설정을 업데이트하고 있어요. 먼저 PDF를 기기에 저장해 주세요.');
  if (previous.state === 'saved') return previous;
  if (previous.state === 'rejected') throw new Error('접수가 마감되었거나 저장 공간이 부족해요. 선생님께 알려 주세요.');
  const base64 = await pdfBase64(blob);
  onPhase('PDF 전송 중… 화면을 열어 두세요.');
  try {
    await portfolioGateway({ v:1, requestId, fileName, mimeType:'application/pdf', base64 }, 50000);
  } catch { /* A lost response can still have saved the file; verify the receipt. */ }
  onPhase('선생님 폴더에 저장되었는지 확인 중…');
  const deadline = Date.now() + 180000;
  for (const delay of [0, 1500, 3000]) {
    if (delay) await new Promise(r => setTimeout(r, delay));
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const receipt = await readDriveReceipt(endpoint, requestId, Math.min(55000, remaining));
      if (receipt.state === 'saved') return receipt;
      if (receipt.state === 'rejected') throw new Error('UPLOAD_REJECTED');
    } catch (error) {
      if (error instanceof Error && error.message === 'UPLOAD_REJECTED') throw new Error('접수를 완료하지 못했어요. PDF를 저장하고 선생님께 알려 주세요.');
    }
  }
  throw new Error('아직 저장 확인을 받지 못했어요. 다시 제출하면 기존 접수를 먼저 확인해요. PDF도 기기에 보관해 주세요.');
}
