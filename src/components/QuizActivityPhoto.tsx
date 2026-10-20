import React, { useEffect, useRef, useState } from 'react';
import type { Mission, MissionRecord } from '../types';
import { authorizeEvidence, captureEvidencePhoto, getEvidence } from '../services/evidenceDb';
import { ZEP_QUIZ_GUIDE } from '../data/photoMissions';

/** A second activity photo; it never replaces the existing booth photo. */
export function QuizActivityPhoto({ participantId, missionId, activity, record, onRecord, onShowToast }: {
  participantId: string; missionId: number; activity: NonNullable<Mission['zepActivity']>;
  record: MissionRecord; onRecord: (patch: Partial<MissionRecord>) => void; onShowToast: (message: string) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const mounted = useRef(true), epoch = useRef(0), locked = useRef(false);
  const release = useRef<(() => void) | null>(null);
  const latest = useRef({ participantId, missionId, evidenceId: record.quizActivityEvidenceId });
  latest.current = { participantId, missionId, evidenceId: record.quizActivityEvidenceId };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; epoch.current++; release.current?.(); }; }, []);
  useEffect(() => {
    let alive = true; setPhoto(null); setConfirmed(false); setConsent(false);
    if (record.quizActivityEvidenceId) getEvidence(record.quizActivityEvidenceId).then(item => {
      if (alive && item?.participantId === participantId && item.mission === missionId && item.kind === 'activity' && item.activitySlot === 'quiz') { setPhoto(item.jpeg); setConfirmed(item.authorized === true); }
    }).catch(() => { if (alive) onShowToast('퀴즈 활동사진을 읽지 못했어요. 다시 열어 주세요.'); });
    return () => { alive = false; };
  }, [participantId, missionId, record.quizActivityEvidenceId]);

  const capture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || locked.current) return;
    if (!file.type.startsWith('image/')) { onShowToast('사진 파일을 골라 주세요.'); return; }
    if (file.size > 15 * 1024 * 1024) { onShowToast('15MB 이하의 사진을 골라 주세요.'); return; }
    const request = ++epoch.current;
    const current = () => mounted.current && request === epoch.current && latest.current.participantId === participantId && latest.current.missionId === missionId;
    locked.current = true; setBusy(true); setConsent(false);
    const url = URL.createObjectURL(file), img = new Image();
    const cleanup = () => { img.onload = null; img.onerror = null; URL.revokeObjectURL(url); };
    release.current = cleanup;
    img.onload = async () => {
      try {
        if (!current()) return;
        if (!img.naturalWidth || !img.naturalHeight) throw Error('Invalid image');
        const c = document.createElement('canvas'), ratio = Math.min(1, 1080 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * ratio); c.height = Math.round(img.naturalHeight * ratio);
        const ctx = c.getContext('2d'); if (!ctx) throw Error('Canvas unavailable');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const jpeg = c.toDataURL('image/jpeg', 0.82); if (!jpeg.startsWith('data:image/jpeg;base64,')) throw Error('Encoding failed');
        const item = await captureEvidencePhoto({ participantId, mission: missionId, jpeg, activitySlot: 'quiz' });
        if (!current()) return;
        setPhoto(jpeg); setConfirmed(false);
        onRecord({ quizActivityEvidenceId: item.id, quizActivityCapturedAt: item.capturedAt, quizActivityConfirmedAt: undefined });
      } catch { if (current()) onShowToast('퀴즈 활동사진을 저장하지 못했어요. 다시 찍어 주세요.'); }
      finally { cleanup(); if (current()) { locked.current = false; setBusy(false); release.current = null; } }
    };
    img.onerror = () => { cleanup(); if (current()) { locked.current = false; setBusy(false); onShowToast('사진을 열지 못했어요.'); } };
    img.src = url;
  };
  const confirm = async () => {
    const id = record.quizActivityEvidenceId; if (!id || !photo || !consent || locked.current) return;
    locked.current = true; setBusy(true); const request = epoch.current;
    const current = () => mounted.current && request === epoch.current && latest.current.participantId === participantId && latest.current.missionId === missionId && latest.current.evidenceId === id;
    try {
      const item = await getEvidence(id); if (!current()) return;
      if (item?.participantId !== participantId || item.mission !== missionId || item.activitySlot !== 'quiz' || item.kind !== 'activity') throw Error('Invalid photo');
      await authorizeEvidence(id); if (!current()) return;
      setConfirmed(true); onRecord({ quizActivityConfirmedAt: new Date().toISOString() }); onShowToast('ZEP QUIZ 활동 인증샷을 기기에 보관했어요.');
    } catch { if (current()) onShowToast('사진 보관 확인을 저장하지 못했어요. 다시 눌러 주세요.'); }
    finally { if (current()) { locked.current = false; setBusy(false); } }
  };
  return <section data-quiz-activity className="field-paper space-y-4" role="tabpanel" id="mission-photo-quiz" aria-labelledby="mission-tab-quiz">
    <h3>{activity.title} 인증샷</h3><p>{activity.description}</p><p>{ZEP_QUIZ_GUIDE.intro}</p>
    <ol className="space-y-2 list-decimal pl-5">{ZEP_QUIZ_GUIDE.steps.map(step => <li key={step}>{step}</li>)}</ol>
    <p className="font-bold">{activity.photoTip}</p><p className="text-sm">{activity.frameGuide}</p>
    {photo && <img src={photo} alt="ZEP QUIZ 활동 인증샷" className="w-full max-h-72 object-contain rounded-xl" />}
    <label className="field-primary text-center">{busy ? '저장 중…' : photo ? '퀴즈 활동사진 다시 찍기' : '퀴즈 활동사진 찍기'}<input type="file" accept="image/*" capture="environment" disabled={busy} className="sr-only" onChange={capture} /></label>
    <label className="block text-center underline cursor-pointer">앨범에서 퀴즈 활동사진 고르기<input type="file" accept="image/*" disabled={busy} className="sr-only" onChange={capture} /></label>
    {photo && (confirmed ? <p role="status" className="font-bold">✓ ZEP QUIZ 인증샷 보관 완료</p> : <>
      <label className="flex items-start gap-3"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="w-6 h-6 shrink-0" /><span>보호자가 퀴즈에 참여한 활동사진임을 확인했고, 기기에 행사 기록으로 보관하는 데 동의해요.</span></label>
      <button type="button" className="field-primary disabled:opacity-50" disabled={busy || !consent} onClick={confirm}>ZEP 인증샷 보관하기</button>
    </>)}
    <p className="text-sm">기존 체험 인증샷은 그대로 보관돼요. 이 사진은 확인 후 최종 PDF에 추가돼요.</p>
  </section>;
}
