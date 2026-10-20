import { resumeSortingScreen } from '../../services/houseAssignment';
import { experienceForGrade } from '../../services/experience';
import React, { useEffect, useState } from 'react';
import { normalizeClassroom } from '../../services/participantInfo';
import { ArrowLeft, UserPlus, History, ShieldAlert, School, GraduationCap, ExternalLink } from 'lucide-react';
import { ParticipantState } from '../../types';
import { createBlankState, loadParticipant, normalizeIdentity, saveDraft, saveParticipant } from '../../services/storage';
import { EXTERNAL_APPLICATION_URL, EXTERNAL_APPLICATION_DEADLINE } from '../../data/eventPlanData';

const SCHOOL_OPTIONS = [
  { value: '장원초', label: '장원초등학교' },
  { value: '흥전초', label: '흥전초등학교' },
  { value: '도계한빛유치원', label: '도계한빛유치원' }
];
const isPresetSchool = (value: string | undefined) => SCHOOL_OPTIONS.some(option => option.value === value);

interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onShowToast: (msg: string) => void;
}

export const EnrollScreen: React.FC<Props> = ({
  state,
  onUpdateState,
  onNavigate,
  onShowToast
}) => {
  const isJunior = state.experienceMode === 'junior';
  const [name, setName] = useState(state.name);
  const [school, setSchool] = useState<string>(!state.school || isPresetSchool(state.school) ? state.school || '장원초' : '기타');
  const [otherSchool, setOtherSchool] = useState(state.school && !isPresetSchool(state.school) && state.school !== '기타' ? state.school : '');
  const [classroom, setClassroom] = useState(state.classroom || '');
  const [grade, setGrade] = useState<string>(() => {
    const saved = state.grade || '';
    return experienceForGrade(saved) === (isJunior ? 'junior' : 'standard') && saved
      ? saved : isJunior ? '유치원' : '3학년';
  });
  const [family, setFamily] = useState(state.family || (isJunior ? '가족' : ''));
  const actualSchool = school === '기타' ? otherSchool.trim() : school;
  const elementary = /^[1-6]학년$/.test(grade);
  useEffect(() => { saveDraft(name, family, actualSchool, grade, classroom); }, [name, family, actualSchool, grade, classroom]);

  const [busy, setBusy] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const cleanName = normalizeIdentity(name);
    if (!cleanName) { onShowToast('학생 이름을 입력해 주세요.'); return; }
    if (!actualSchool) { onShowToast('학교 이름을 입력해 주세요.'); return; }
    const cleanClassroom = normalizeClassroom(classroom);
    if (elementary && !/^[1-9]\d?$/.test(cleanClassroom)) { onShowToast('반을 숫자로 입력해 주세요. 예: 1반은 1'); return; }
    const existing = loadParticipant(cleanName);
    const cleanFamily = family.trim() || existing?.family || '';
    if (!cleanFamily) { onShowToast('함께하는 가족을 입력해 주세요.'); return; }
    setBusy(true);
    try {
      const next: ParticipantState = { ...(existing || createBlankState()), name:cleanName, family:cleanFamily, school:actualSchool, grade, classroom:cleanClassroom,
        experienceMode:experienceForGrade(grade), cloudPhotoConsent:false };
      if (next.experienceMode === 'junior') {
        next.story = { ...next.story, introDone:true, scene:null };
      }
      saveParticipant(next);
      onUpdateState(next);
      onShowToast(existing ? '이 기기의 탐험 기록을 불러왔어요.' : '이 기기에 기록을 저장하며 탐험해요.');
      onNavigate(resumeSortingScreen(next));
    } catch { onShowToast('기기에 저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.'); }
    finally { setBusy(false); }
  };

  if (isJunior) return <div className="junior-ui space-y-6 pb-16" data-experience="junior-enroll">
    <button type="button" className="junior-secondary" onClick={() => onNavigate('start')}>← 처음으로</button>
    <h1>👋 내 이름은?</h1><p className="junior-instruction">가족과 함께 적어 주세요.</p>
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-xl font-bold" htmlFor="junior-name">이름<input id="junior-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} required autoComplete="off" className="junior-input" placeholder="이름을 써 주세요"/></label>
      <fieldset><legend className="text-xl font-bold mb-3">나의 학년</legend><div className="junior-grade">{['유치원','1학년','2학년'].map(g => <button type="button" key={g} aria-pressed={grade === g} onClick={() => setGrade(g)}>{g}</button>)}</div></fieldset>
      <label htmlFor="student-school" className="block text-lg font-bold">학교 · 유치원<select id="student-school" value={school} onChange={e=>setSchool(e.target.value)} className="junior-input">{SCHOOL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="기타">다른 학교 · 유치원</option></select></label>
      {school === '기타' && <label htmlFor="student-other-school" className="block text-lg font-bold">학교·유치원 이름<input id="student-other-school" className="junior-input" required maxLength={40} value={otherSchool} onChange={e=>setOtherSchool(e.target.value)} placeholder="학교 이름을 적어 주세요" /></label>}
      <label htmlFor="student-classroom" className="block text-lg font-bold">{elementary ? '우리 반' : '유치원 반 이름 (선택)'}<input id="student-classroom" className="junior-input" value={classroom} onChange={e=>setClassroom(e.target.value)} maxLength={20} inputMode={elementary?'numeric':'text'} required={elementary} placeholder={elementary?'예: 1반이면 1':'예: 해님반'} /></label>
      <p className="junior-parent">학교·학년·반·이름으로 마지막 PDF를 저장해요.</p>
      <p className="junior-parent">사진과 별빛은 이 기기에 보관해요. 같은 휴대폰·브라우저를 사용해 주세요.</p>
      <button type="submit" className="junior-main" disabled={busy}>{busy?'잠깐만 기다려요…':'⭐ 마법학교로 출발!'}</button>
    </form>
  </div>;
  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-[430px] mx-auto">
      <button
        type="button"
        onClick={() => onNavigate('start')}
        className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 시작 화면
      </button>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          ADMISSION · 01
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          별밤학교 입학 신청서
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          오늘 밤 탐험을 함께할 학생과 가족의 정보를 입력해 주세요.
        </p>
      </div>

      {/* External Registration Notice Box */}
      <div className="rounded-2xl p-4 bg-[#1e1509] border border-[#d97706]/70 text-xs text-[#fde68a] space-y-2 shadow-md">
        <div className="flex items-center gap-1.5 font-bold text-[#f59e0b]">
          <ShieldAlert className="w-4 h-4 text-[#f59e0b] shrink-0" />
          <span>현장 접수도 가능해요</span>
        </div>
        <p className="leading-relaxed text-[#fef3c7] text-[11px]">
          본 앱의 입학 등록은 당일 현장 부스 탐험 및 포트폴리오 작성을 위한 기록용입니다.
          행사 물품 및 먹거리 준비를 위한 <strong>사전 참가신청은 마감되었으며, 현장 접수는 운영본부에서</strong> 안내받을 수 있습니다. 의상은 수량과 사이즈에 따라 대여가 제한될 수 있습니다.
        </p>
        <a
          href={EXTERNAL_APPLICATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#fbbf24] hover:underline font-bold"
        >
          <span>사전 신청 시스템 (기존 신청 확인용)</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border-2 border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#eed4a4] to-[#deb87a] p-5 text-[#2d2215] shadow-xl space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#665644]">
          <History className="w-4 h-4 text-[#8a5d24]" />
          <span>기존 기록 복원 안내</span>
        </div>

        <p className="text-xs text-[#523d24] leading-relaxed">
          같은 휴대폰의 같은 브라우저에서 이름으로 기록을 불러옵니다. 다른 기기로 자동 복원되지 않습니다.<br />
          동명이인이 있을 경우 <strong>“김장원 (3학년 1반)”</strong>처럼 학년·반을 함께 적어주세요.
        </p>

        {/* Student Name */}
        <div className="space-y-1.5 pt-1">
          <label htmlFor="student-name" className="block text-xs font-bold text-[#2a1d0f]">
            학생 이름 *
          </label>
          <input
            id="student-name"
            type="text"
            maxLength={30}
            required
            value={name}
            onChange={e => {
              setName(e.target.value);
            }}
            placeholder="예: 김장원 또는 이별빛 (3-1)"
            className="w-full min-h-[46px] px-3.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-[#2c1e10] placeholder:text-[#99836a] text-sm focus:outline-none focus:ring-2 focus:ring-[#845b23]"
          />
        </div>
        {/* School & Grade Pickers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="student-school" className="block text-xs font-bold text-[#2a1d0f] flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-[#8a5d24]" />
              <span>소속 학교 *</span>
            </label>
            <select
              id="student-school"
              value={school}
              onChange={e => {
                setSchool(e.target.value);
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-[#2c1e10] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#845b23]"
            >
              {SCHOOL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              <option value="기타">기타 (인근 학교)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-grade" className="block text-xs font-bold text-[#2a1d0f] flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#8a5d24]" />
              <span>학년 구분 *</span>
            </label>
            <select
              id="student-grade"
              value={grade}
              onChange={e => {
                setGrade(e.target.value);
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-[#2c1e10] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#845b23]"
            >
              <option value="3학년">3학년</option>
              <option value="4학년">4학년</option>
              <option value="5학년">5학년</option>
              <option value="6학년">6학년</option>
              <option value="가족">가족 (학부모)</option>
            </select>
          </div>
        </div>

        {school === '기타' && <div className="space-y-1.5"><label htmlFor="student-other-school" className="block text-xs font-bold">학교 이름 *</label><input id="student-other-school" required maxLength={40} value={otherSchool} onChange={e=>setOtherSchool(e.target.value)} placeholder="예: 도계초등학교" className="w-full min-h-[46px] px-3.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-sm" /></div>}
        <div className="space-y-1.5">
          <label htmlFor="student-classroom" className="block text-xs font-bold">반 {elementary ? '*' : '(선택)'}</label>
          <input id="student-classroom" value={classroom} onChange={e=>setClassroom(e.target.value)} maxLength={20} required={elementary} inputMode={elementary?'numeric':'text'} placeholder="예: 2반이면 2" className="w-full min-h-[46px] px-3.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-sm" />
          <p className="text-[11px] text-[#6d5538]">최종 PDF는 학교_학년_반_이름.pdf 형식으로 저장해요.</p>
        </div>

        {/* Family Member */}
        <div className="space-y-1.5">
          <label htmlFor="student-family" className="block text-xs font-bold text-[#2a1d0f]">
            함께하는 가족 구성원 *
          </label>
          <input
            id="student-family"
            type="text"
            maxLength={80}
            required
            value={family}
            onChange={e => {
              setFamily(e.target.value);
            }}
            placeholder="예: 엄마, 아빠, 동생"
            className="w-full min-h-[46px] px-3.5 py-2 rounded-lg bg-[#fff8e9] border border-[#b59564] text-[#2c1e10] placeholder:text-[#99836a] text-sm focus:outline-none focus:ring-2 focus:ring-[#845b23]"
          />
        </div>
        <button
          disabled={busy}
          type="submit"
          className="w-full min-h-[50px] mt-2 px-6 py-3.5 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{busy ? '기기에 저장 중…' : '기기에 저장하고 탐험 시작하기 →'}</span>
        </button>
      </form>

      {/* Camera & Privacy Notice */}
      <div className="rounded-xl p-4 bg-[#0c192d]/80 border border-[#485f83]/40 text-xs text-[#a3b7d4] space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#ffd880]">
          <ShieldAlert className="w-4 h-4 text-[#ffd880]" />
          <span>개인정보 및 카메라 권한 안내</span>
        </div>
        <p className="leading-relaxed">
          다음 단계에서 기숙사 배정을 위한 전면 카메라 권한을 요청합니다.
          사진과 탐험 기록은 기기에 보관하며 자동 전송하지 않습니다. 보호자가 최종 PDF 제출을 누를 때만 선생님께 PDF를 보냅니다.
        </p>
      </div>
    </div>
  );
};
