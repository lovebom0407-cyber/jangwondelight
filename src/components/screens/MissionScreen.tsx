import React, { useEffect, useState, useRef } from 'react';
import { ParticipantState } from '../../types';
import { getMissionNumber } from '../../data/standardMissions';
import { getMissions } from '../../data/storyData';
import { ZEP_QUIZ_GUIDE } from '../../data/photoMissions';
import { HINT_HELPER } from '../../data/characters';
import { fillName } from '../../services/script';
import { useMasterMode } from '../../services/masterMode';
import { CharacterAvatar } from '../characterAssets';
import { ObservationSessions, isObservationBooth } from '../ObservationSessions';
import { QuizActivityPhoto } from '../QuizActivityPhoto';
import { captureEvidencePhoto, authorizeEvidence, getEvidence } from '../../services/evidenceDb';
import { ArrowLeft, Camera, Check, ExternalLink, Image as ImageIcon, Lightbulb, QrCode, RotateCcw, Sparkles } from 'lucide-react';

/**
 * 미션 화면 (간단 버전)
 *  ① 가족과 현장 활동 (퀴즈는 별도 플랫폼)
 *  ② 활동 인증샷 (휴대폰 기본 카메라로 촬영 → 기기에 저장)
 *  → [별빛 받기]
 * 설명은 캐릭터 말풍선 한두 줄로만.
 */
interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onShowToast: (msg: string) => void;
  onAwardStar: (missionIndex: number) => void | Promise<void>;
}

export const MissionScreen: React.FC<Props> = ({ state, onUpdateState, onNavigate, onShowToast, onAwardStar }) => {
  const index = typeof state.selectedMissionIndex === 'number'
    ? state.selectedMissionIndex
    : typeof state.unlocked === 'number' ? state.unlocked : 0;
  const isJunior = state.experienceMode === 'junior';
  const missions = getMissions(state.experienceMode);
  const mission = missions[index] || missions[0];
  const usesZepQuiz = mission.usesZepQuiz ?? false;
  const astronomyResources = isJunior ? index === 1 : mission.astronomyResources;
  const rec = state.records?.[index] || {};
  const isDone = state.completed.includes(index);
  const master = useMasterMode();
  const [photoTab, setPhotoTab] = useState<'activity' | 'quiz'>('activity');

  const [showHint, setShowHint] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const current = useRef(state); current.current = state;
  const mounted = useRef(true);
  const photoEpoch = useRef(0);
  const claimingRef = useRef(false);
  const releasePhoto = useRef<(() => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    setPhotoTab('activity');
    setConsent(false); setSaving(false); setClaiming(false); claimingRef.current = false;
    return () => { mounted.current = false; photoEpoch.current++; releasePhoto.current?.(); releasePhoto.current = null; };
  }, [state.participantId, index]);

  // 저장된 인증샷 다시 불러오기 (새로고침 후에도 보이게)
  useEffect(() => {
    let alive = true;
    setPhoto(null);
    if (rec.evidenceId) {
      getEvidence(rec.evidenceId)
        .then(item => {
          if (alive && item && item.participantId === state.participantId && item.mission === index && item.kind !== 'zep_quiz' && item.activitySlot !== 'quiz') setPhoto(item.jpeg);
        })
        .catch(() => {});
    } else {
      setPhoto(null);
    }
    return () => { alive = false; };
  }, [rec.evidenceId, index, state.participantId]);

  const updateRecord = (patch: Record<string, unknown>, extra: Partial<ParticipantState> = {}) => {
    onUpdateState({
      ...extra,
      records: { ...current.current.records, [index]: { ...current.current.records?.[index], ...patch } }
    });
  };

  const onPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('사진 파일을 골라 주세요.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) { onShowToast('15MB 이하의 사진을 골라 주세요.'); return; }
    releasePhoto.current?.();
    const epoch = ++photoEpoch.current;
    const participantId = state.participantId;
    const isCurrent = () => mounted.current && epoch === photoEpoch.current && current.current.participantId === participantId && current.current.selectedMissionIndex === index;
    setSaving(true);
    setConsent(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    const release = () => { img.onload = null; img.onerror = null; URL.revokeObjectURL(url); };
    releasePhoto.current = release;
    img.onload = async () => {
      if (!isCurrent()) { release(); return; }
      try {
        if (!img.naturalWidth || !img.naturalHeight) throw new Error('Empty image');
        const c = document.createElement('canvas');
        const r = Math.min(1, 1080 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * r);
        c.height = Math.round(img.naturalHeight * r);
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const jpeg = c.toDataURL('image/jpeg', 0.82);
        if (!jpeg.startsWith('data:image/jpeg;base64,')) throw new Error('Photo encoding failed');
        const item = await captureEvidencePhoto({ participantId, mission: index, jpeg });
        if (!isCurrent()) return;
        setPhoto(jpeg);
        updateRecord(
          { evidenceId: item.id, capturedAt: item.capturedAt, uploadStatus: 'pending', status: 'pending_verification' },
          { selectedMissionIndex: index, unlocked: index, pendingMission: index }
        );
      } catch {
        if (isCurrent()) onShowToast('사진을 저장하지 못했어요. 다시 찍어 주세요.');
      } finally {
        release();
        if (isCurrent()) { releasePhoto.current = null; setSaving(false); }
      }
    };
    img.onerror = () => {
      release();
      if (isCurrent()) { releasePhoto.current = null; setSaving(false); onShowToast('사진을 열지 못했어요. 다시 찍어 주세요.'); }
    };
    img.src = url;
  };

  const claimStar = async () => {
    if (saving || claimingRef.current) return;
    // 마스터(테스트) 모드: 사진·동의 없이도 바로 별빛 받기
    if (master && (!rec.evidenceId || !photo || !consent)) {
      onAwardStar(index);
      return;
    }
    if (!rec.evidenceId || !photo) {
      onShowToast('활동 사진을 먼저 찍어 주세요.');
      return;
    }
    if (!consent) {
      onShowToast('사진 기록 보관 동의에 체크해 주세요.');
      return;
    }
    claimingRef.current = true; setClaiming(true);
    const participantId = state.participantId;
    const evidenceId = rec.evidenceId;
    const epoch = photoEpoch.current;
    const isCurrentClaim = () => mounted.current && epoch === photoEpoch.current && current.current.participantId === participantId && current.current.selectedMissionIndex === index;
    try {
      await authorizeEvidence(evidenceId);
      if (!isCurrentClaim() || current.current.records[index]?.evidenceId !== evidenceId) return;
      // A family may photograph several booths before claiming their stars.
      // Re-select this stored photo for verification without requiring a retake.
      onUpdateState({ pendingMission: index });
      await onAwardStar(index);
    } catch {
      if (isCurrentClaim()) onShowToast('사진 보관 확인을 저장하지 못했어요. 다시 별빛 받기를 눌러 주세요.');
    } finally {
      if (isCurrentClaim()) { claimingRef.current = false; setClaiming(false); }
    }
  };

  const speaker = mission.speakers[0];
  const say = fillName(
    isDone
      ? `{nameA}, ${mission.starlight}을 이미 받았어! 정말 잘했어.`
      : !photo
          ? '잘했어, {nameA}! 이제 활동하는 모습을 사진으로 찍어 줘!'
          : '멋진 사진이야, {nameA}! 별빛을 받으러 가자!',
    state.name
  );

  return (
    <div className={`space-y-4 pb-24 animate-fade-in max-w-[430px] mx-auto ${isJunior ? 'junior-ui' : ''}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="inline-flex items-center gap-1 min-h-[40px] text-xs text-[#d8c7a7] px-3 rounded-xl bg-[#112038]/70 border border-[#b7985b]/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 지도
        </button>
        <span className="text-base font-bold text-[#e4bb70]">{getMissionNumber(index, state.experienceMode)}. {isJunior ? mission.title : mission.lessonName}</span>
      </div>

      {isJunior && <section className="rounded-2xl border-2 border-[#90c7c9] bg-[#153c51] p-4 space-y-2" data-junior-booth-guide>
        <p className="text-base font-bold text-[#cfeaed]">📍 여기로 가요</p>
        <h2 className="text-xl font-extrabold leading-relaxed text-[#fff0bd] break-words">{mission.place}</h2>
        <p className="text-base text-[#e7f6fa]">보호자와 함께 부스를 찾아가요.</p>
      </section>}

      {isObservationBooth(index, state.experienceMode) && <ObservationSessions grade={state.grade} />}

      {/* 캐릭터 말풍선 */}
      <div className="flex items-end gap-3">
        <CharacterAvatar speaker={speaker} size={84} framed />
        <div className="relative flex-1 rounded-2xl rounded-bl-sm bg-[#fdf3dc] text-[#2c1d0a] px-4 py-3 shadow-lg">
          <div className="text-[11px] font-bold text-[#8a5d24]">{speaker}</div>
          <p className="text-[18px] font-bold leading-relaxed">{isJunior ? (isDone ? '⭐ 잘했어! 별빛을 받았어!' : mission.photoTip) : say}</p>
        </div>
      </div>

      {mission.externalActivity && <section className="field-paper space-y-3" data-external-activity-guide>
        <h3>① {mission.externalActivity.title}</h3>
        <p>{mission.externalActivity.prompt}</p>
        <a className="field-primary flex items-center justify-center gap-2 text-center min-h-[60px]" href={mission.externalActivity.url} target="_blank" rel="noopener noreferrer">패들렛에 한마디 쓰기 <ExternalLink className="w-5 h-5 shrink-0" /></a>
        <p className="text-sm">패들렛이 새 창에서 열려요. 글을 게시한 뒤 이 앱으로 돌아와 주세요.</p>
        <ol className="list-decimal pl-5 space-y-2">{mission.externalActivity.steps.map(step => <li key={step}>{step}</li>)}</ol>
      </section>}

      {mission.zepActivity?.separatePhoto && <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={`${getMissionNumber(index, state.experienceMode)}번 인증샷 종류`}>
        <button type="button" id="mission-tab-activity" role="tab" aria-selected={photoTab === 'activity'} aria-controls="mission-photo-activity" disabled={saving || claiming} className={`min-h-[56px] rounded-xl border-2 px-2 font-bold text-sm border-[#e4bb70] disabled:opacity-50 ${photoTab === 'activity' ? 'bg-[#e4bb70] text-[#20170a]' : 'bg-[#102744] text-[#f6ebd5]'}`} onClick={() => setPhotoTab('activity')}>체험 인증샷</button>
        <button type="button" id="mission-tab-quiz" role="tab" aria-selected={photoTab === 'quiz'} aria-controls="mission-photo-quiz" disabled={saving || claiming} className={`min-h-[56px] rounded-xl border-2 px-2 font-bold text-sm border-[#e4bb70] disabled:opacity-50 ${photoTab === 'quiz' ? 'bg-[#e4bb70] text-[#20170a]' : 'bg-[#102744] text-[#f6ebd5]'}`} onClick={() => setPhotoTab('quiz')}>ZEP QUIZ 인증샷</button>
      </div>}

      {photoTab === 'activity' && mission.zepActivity && <section className="field-paper space-y-3" data-additional-zep-guide><h3>{mission.zepActivity.title}</h3><p>{mission.zepActivity.description}</p>{!mission.zepActivity.separatePhoto && <><p>{ZEP_QUIZ_GUIDE.intro}</p><ol className="space-y-2 list-decimal pl-5">{ZEP_QUIZ_GUIDE.steps.slice(0, 2).map(step => <li key={step}>{step}</li>)}</ol></>}</section>}

      {photoTab === 'quiz' && mission.zepActivity?.separatePhoto ? <QuizActivityPhoto key={`${state.participantId}:${index}`} participantId={state.participantId} missionId={index} activity={mission.zepActivity} record={rec} onRecord={patch => updateRecord(patch)} onShowToast={onShowToast} /> : <div id="mission-photo-activity" role={mission.zepActivity?.separatePhoto ? 'tabpanel' : undefined} aria-labelledby={mission.zepActivity?.separatePhoto ? 'mission-tab-activity' : undefined} className="space-y-4">{isDone ? (
        <div className="rounded-2xl border-2 border-[#4da87f] bg-[#0c2622] p-5 text-center space-y-2">
          <div className="text-4xl">✦</div>
          <div className="font-serif text-lg font-bold text-[#9be3c1]">{mission.starlight} 획득 완료</div>
          <p className="text-sm text-[#cfece1]">{mission.unlockedClueTitle}</p>
          {mission.zepActivity?.separatePhoto && photo && <img src={photo} alt="활동 인증샷" className="w-full max-h-72 object-contain rounded-xl" />}
          {!(state.spells || []).includes(index) && (
            <button type="button" onClick={() => onNavigate('reward')} className="mt-2 w-full min-h-[52px] rounded-xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] cursor-pointer">
              ✨ 이 수업의 마법 배우기
            </button>
          )}
          <button type="button" onClick={() => onNavigate('map')} className="mt-2 w-full min-h-[48px] rounded-xl font-bold text-[#20170a] bg-[#e4bb70] cursor-pointer">
            다른 수업 고르기
          </button>
        </div>
      ) : (
        <>
          {!mission.externalActivity && <section className="field-paper"><h3>{usesZepQuiz ? '① 부스 QR로 퀴즈에 참여해요' : isJunior ? '① 가족과 함께 해요' : '① 가족과 현장 체험'}</h3>
            {usesZepQuiz ? <div className="space-y-3" data-zep-guide>
              <p>{mission.boothGuide}</p>
              <p className="font-bold">{ZEP_QUIZ_GUIDE.intro}</p>
              <ol className="space-y-3 list-none p-0">{ZEP_QUIZ_GUIDE.steps.map((step, i) => <li key={i} className="flex items-start gap-3"><span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#172d48] text-[#f4d79a] font-bold" aria-hidden="true">{i + 1}</span><span className="text-base leading-relaxed">{step}</span></li>)}</ol>
            </div> : <p>{mission.boothGuide}</p>}
            {astronomyResources && <button type="button" className="field-primary mt-3" onClick={() => onNavigate('field-guide')}>천문 학습자료 · 영상 보기 →</button>}
          </section>}

          {/* ② 활동 인증샷 */}
          <section className={`rounded-2xl border-2 p-4 space-y-3 ${photo ? 'border-[#4da87f] bg-[#0c2622]' : 'border-[#d8b568] bg-[#0f1f38]'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#f6ebd5]">② 활동 인증샷{usesZepQuiz ? ' 올리기' : ''}</h3>
              {photo && <span className="text-xs font-bold text-[#9be3c1] flex items-center gap-1"><Check className="w-4 h-4" /> 저장됨</span>}
            </div>
            <p className="text-base font-bold text-[#f4d79a]">{mission.photoTip}</p>
            <p className="text-sm text-[#c8dcf5] leading-relaxed" data-photo-description>{mission.photoDescription}</p>
            <div className="rounded-xl bg-[#172d48] p-3 text-sm text-[#d6e4f3] leading-relaxed"><b className="block text-[#e4bb70] mb-1">사진에 담아 주세요</b>{mission.photoFrameGuide}</div>

            {photo ? (
              <div className="space-y-2">
                <img src={photo} alt="활동 인증샷" className="w-full max-h-72 object-cover rounded-xl" />
                <label className="w-full min-h-[42px] rounded-xl text-sm font-bold text-[#f6ebd5] bg-[#1d3356] border border-[#3b5985] flex items-center justify-center gap-1.5 cursor-pointer">
                  <RotateCcw className="w-4 h-4" /> 다시 찍기
                  <input type="file" accept="image/*" capture="environment" disabled={saving || claiming} className="sr-only" onChange={onPhotoFile} />
                </label>
              </div>
            ) : (
              <>
                <label className={`w-full min-h-[60px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] flex items-center justify-center gap-2 cursor-pointer ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Camera className="w-6 h-6" /> {saving ? '저장 중…' : '사진 찍기'}
                  <input type="file" accept="image/*" capture="environment" disabled={saving || claiming} className="sr-only" onChange={onPhotoFile} />
                </label>
                <label className="w-full text-xs text-[#9fb6d6] underline underline-offset-2 flex items-center justify-center gap-1 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5" /> 앨범에서 고르기
                  <input type="file" accept="image/*" disabled={saving || claiming} className="sr-only" onChange={onPhotoFile} />
                </label>
              </>
            )}
          </section>

          {/* 별빛 받기 */}
          <label className="flex items-center gap-2 text-sm text-[#d8e4f5] px-1 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="w-5 h-5 accent-[#e4bb70]" />
            {mission.externalActivity ? '(보호자) 패들렛에 한마디를 작성한 것을 확인했고, 활동 사진을 기기에 학교 행사 기록으로 보관하는 데 동의해요' : usesZepQuiz ? '(보호자) QR로 퀴즈에 참여한 활동사진임을 확인했고, 기기에 학교 행사 기록으로 보관하는 데 동의해요' : '(보호자) 활동 사진을 기기에 학교 행사 기록으로 보관하는 데 동의해요'}
          </label>
          <button
            type="button"
            onClick={claimStar}
            disabled={saving || claiming || (!photo && !master)}
            className="w-full min-h-[62px] rounded-2xl font-bold text-xl text-[#20170a] bg-gradient-to-r from-[#ffe79c] via-[#f4c95d] to-[#d6992d] shadow-[0_0_25px_rgba(255,206,105,0.45)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:shadow-none"
          >
            <Sparkles className="w-6 h-6" /> {isJunior ? '③ 별빛 받기!' : '별빛 받기'}
          </button>

          {master && (
            <button
              type="button"
              onClick={() => onAwardStar(index)}
              className="w-full min-h-[52px] rounded-2xl font-bold text-base text-white bg-[#7c3aed] border-2 border-[#c4b5fd] cursor-pointer"
            >
              🧪 마스터: 인증샷 없이 별빛 받기
            </button>
          )}

          {/* 헤드위그 힌트 */}
          <div className="flex items-start gap-3 pt-1">
            <CharacterAvatar speaker={HINT_HELPER} size={48} />
            <div className="flex-1">
              <button
                type="button"
                onClick={() => setShowHint(v => !v)}
                className="min-h-[40px] px-3 rounded-xl text-sm font-bold text-[#2c1d09] bg-[#e4bb70] flex items-center gap-1 cursor-pointer"
              >
                <Lightbulb className="w-4 h-4" /> {showHint ? '힌트 닫기' : '힌트 쪽지'}
              </button>
              {showHint && <p className="pt-2 text-sm text-[#f6ebd5]">{mission.hint}</p>}
            </div>
          </div>
        </>
      )}</div>}

    </div>
  );
};
