import React, { useEffect, useRef, useState } from 'react';
import type { ParticipantState } from '../types';
import { DRIVE_UPLOAD_ENDPOINT } from '../data/driveUploadConfig';
import { isDriveEndpoint, portfolioFileName, portfolioRequestId, submitPortfolioPdf } from '../services/driveSubmission';

export function DriveSubmissionPanel({ state, makePdf, busy, onBusyChange, photoCount, additionalPhotoCount = 0 }: {
  state: ParticipantState; makePdf: () => Promise<Blob | null>; busy: boolean; onBusyChange: (busy: boolean) => void; photoCount: number; additionalPhotoCount?: number;
}) {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [submittedVersion, setSubmittedVersion] = useState<ParticipantState | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setConsent(false); setMessage(''); }, [state]);
  const available = isDriveEndpoint(DRIVE_UPLOAD_ENDPOINT);
  const complete = photoCount === 7 && [0, 1, 2, 3, 4, 5, 6].every(i => state.completed.includes(i));
  const saved = submittedVersion === state;
  const submit = async () => {
    if (lock.current || busy || !consent || !available || !complete) return;
    lock.current = true; onBusyChange(true); setMessage('최종 PDF 만드는 중…');
    try {
      const requestId = await portfolioRequestId(state);
      const blob = await makePdf();
      if (!alive.current) return;
      if (!blob) throw new Error('PDF를 만들지 못했어요.');
      await submitPortfolioPdf(DRIVE_UPLOAD_ENDPOINT, requestId, blob, portfolioFileName(state), setMessage);
      if (alive.current) { setSubmittedVersion(state); setMessage('제출 완료! 선생님 Google Drive 폴더에 PDF를 저장했어요.'); }
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : '제출 확인을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { lock.current = false; if (alive.current) onBusyChange(false); }
  };
  return <section className="print:hidden rounded-2xl border border-[#a1ddd5]/40 bg-[#102b38] p-5 space-y-3" aria-label="선생님께 PDF 제출">
    <h3 className="font-bold text-lg text-[#b4f2de]">📨 선생님께 최종 PDF 제출</h3>
    <p className="text-sm leading-relaxed text-[#d2e5e4]">이름·학년, 활동 사진 7장{additionalPhotoCount > 0 ? `과 추가 ZEP 활동사진 ${additionalPhotoCount}장` : ''}과 소감이 들어간 PDF 한 파일을 선생님이 지정한 Google Drive 폴더에 보내요.</p>
    {!available ? <p className="text-sm text-[#f5d9a2]" role="status">선생님이 제출 기능을 준비하고 있어요. 먼저 아래에서 PDF를 기기에 저장해 주세요.</p> : <>
      {!complete && <p className="text-sm text-[#f5d9a2]">사진 미션 7개와 이 기기에 보관된 사진 7장을 확인한 뒤 제출할 수 있어요. 현재 사진 {photoCount}/7장</p>}
      <label className="flex items-start gap-3 p-3 rounded-xl bg-black/20 text-sm leading-relaxed text-white min-h-[48px]">
        <input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="w-6 h-6 shrink-0 mt-0.5 accent-[#a1ddd5]" />
        <span>보호자가 PDF 내용을 확인했고, 행사 기록을 위해 선생님께 제출하는 데 동의해요.</span>
      </label>
    </>}
    <button type="button" onClick={submit} disabled={!available || !consent || !complete || busy || saved} className="w-full min-h-[56px] rounded-xl bg-[#b4f2de] text-[#102b38] font-bold text-base px-3 py-3 disabled:opacity-50">{busy ? '제출 확인 중…' : saved ? '✓ 제출 완료' : '최종 PDF 제출하기'}</button>
    {message && <p role="status" aria-live="polite" className="text-sm leading-relaxed text-[#f5e9c7] break-words">{message}</p>}
    <p className="text-xs leading-relaxed text-[#abc9ce]">제출 버튼을 누를 때만 전송해요. 사진 원본과 미션 진행은 이 기기에 남아요. 인터넷이 불안하면 PDF를 저장해 선생님께 보여 주세요.</p>
  </section>;
}
