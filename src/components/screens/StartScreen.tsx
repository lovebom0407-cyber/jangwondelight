import { resumeSortingScreen } from '../../services/houseAssignment';
import { FestivalGuide } from '../FestivalGuide';
import type { ExperienceMode } from '../../services/experience';
import React, { useState } from 'react';
import {
  CastleBanner,
  CharacterFull,
  CharacterFace
} from '../characterAssets';
import { CHARACTERS } from '../../data/characters';
import {
  Sparkles,
  Compass,
  Calendar,
  BookOpen,
  Star,
  ArrowRight,
  Play,
  Info,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ParticipantState } from '../../types';
import { HOUSES, LATECOMER_SUMMARY_GUIDE, OFFLINE_PRINTED_SHEET_GUIDE } from '../../data/storyData';
import {
  OFFICIAL_EVENT_TITLE,
  OFFICIAL_EVENT_DATE,
  OFFICIAL_SCHEDULE,
  EXTERNAL_APPLICATION_URL,
  EXTERNAL_APPLICATION_DEADLINE,
  SAFETY_AND_FACILITY_GUIDELINES
} from '../../data/eventPlanData';

interface Props {
  state?: ParticipantState;
  onNavigate: (screen: any) => void;
  onChooseMode?: (mode: ExperienceMode) => void;
}

export const StartScreen: React.FC<Props> = ({ state, onNavigate, onChooseMode }) => {
  const [selectedMode, setSelectedMode] = useState<ExperienceMode | null>(null);
  const choose = (mode: ExperienceMode) => { setSelectedMode(mode); onChooseMode?.(mode); };
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const hasProfile = Boolean(state?.name && typeof state?.house === 'number');
  const house = hasProfile && typeof state?.house === 'number' ? HOUSES[state.house] : null;

  if (!selectedMode) return <div className="junior-ui age-choice space-y-6 pb-16" data-age-choice>
    <div className="text-center"><CharacterFull speaker="해리" height={190}/><p className="sky-kicker mt-4">2026. 10. 21. · 장원 별밤학교</p><h1>나의 학년을 골라요</h1><p>가족과 함께 마법 모험을 떠나요!</p></div>
    <button type="button" className="age-card age-junior" data-choose-mode="junior" onClick={() => choose('junior')}><span>🌟</span><div><b>유치원·1·2학년</b><p>큰 그림으로 쉽고 재미있게</p></div><span>→</span></button>
    <button type="button" className="age-card age-standard" data-choose-mode="standard" onClick={() => choose('standard')}><span>✨</span><div><b>3~6학년</b><p>마법 이야기와 함께 모험하기</p></div><span>→</span></button>
    <FestivalGuide />
    <p className="junior-parent text-center">학년을 바꿔도 모은 별빛과 사진은 그대로예요.</p>
  </div>;
  if (selectedMode === 'junior') return <div className="junior-ui space-y-6 pb-16" data-experience="junior-start">
    <CharacterFull speaker="해리" height={210}/><h1>장원 별밤학교에<br/>어서 와!</h1><p className="junior-instruction">가족과 사진 찍고 별빛을 모아요.</p>
    {hasProfile && <button type="button" className="junior-main" onClick={() => onNavigate(resumeSortingScreen(state!))}>⭐ {state?.name} 이어서 하기</button>}
    {hasProfile && <button type="button" className="junior-secondary" onClick={()=>onNavigate('camera')}>🎩 마법모자 다시 쓰기</button>}
    <button type="button" className="junior-main" onClick={() => onNavigate('enroll')}>👋 내 이름 쓰고 시작!</button>
    <FestivalGuide />
    <button type="button" className="junior-secondary" onClick={() => setSelectedMode(null)}>← 학년 다시 선택</button>
  </div>;
  return (
    <div className="start-screen flex flex-col items-center text-center gap-6 pb-14 animate-fade-in mx-auto">
      <button type="button" className="field-back self-start" onClick={() => setSelectedMode(null)}>← 학년 다시 선택</button>
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#102039] border border-[#e4bb70]/40 text-xs font-semibold tracking-widest text-[#e4bb70] shadow-sm">
        <Star className="w-3.5 h-3.5 fill-[#e4bb70]" />
        <span>{OFFICIAL_EVENT_DATE} 장원초·흥전초 가족 별밤 축제</span>
      </div>

      {/* Atmospheric Castle Banner */}
      <div className="hero-art" aria-label="별밤학교에서 기다리는 마법 친구들">
        <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
        <CastleBanner className="hero-castle" />
        <span className="hero-star hero-star-one" aria-hidden="true">✦</span>
        <span className="hero-star hero-star-two" aria-hidden="true">✧</span>
        <div className="hero-characters">
          <CharacterFull speaker="hermione" height="100%" className="hero-friend" />
          <CharacterFull speaker="harry" height="100%" className="hero-lead" />
          <CharacterFull speaker="ron" height="100%" className="hero-friend" />
        </div>
        <div className="hero-caption"><span /> 일곱 개의 별빛, 우리 가족의 모험 <span /></div>
      </div>

      {/* Main Title Lockup */}
      <div className="hero-title space-y-2.5">
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#f6ebd5] tracking-tight leading-tight">
          장원 별밤학교
        </h1>
        <p className="font-serif text-sm sm:text-base font-semibold text-[#f0d499] italic">
          마법 친구들과 모험하고, 망원경 너머 진짜 별을 만나요.
        </p>
        <p className="text-xs sm:text-sm text-[#b8c8dd] max-w-xs mx-auto leading-relaxed pt-1">
          가족과 미션을 즐기고, 19:50부터 전문가와 밤하늘을 관측해요. 관측은 미션 완료와 관계없이 참여할 수 있어요.
        </p>
      </div>

      {/* Event Schedule & Official Registration Notice Bar */}
      <div className="event-notice w-full p-3.5 rounded-xl bg-[#0e1a2f] border border-[#2b446a] text-left flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#ffd880] shrink-0" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#f6ebd5]">
              10/21(수) 행사 일정 & 참가 안내
            </div>
            <div className="text-[11px] text-[#9db7d9]">
              본교 사전프로그램(15:40) · 가족프로그램(17:00)
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowEventInfoModal(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#1f375c] hover:bg-[#2b4c80] text-xs font-bold text-[#ffd880] transition-colors shrink-0 cursor-pointer"
        >
          안내 보기
        </button>
      </div>

      <button type="button" className="field-primary" onClick={() => onNavigate('treasure')}>🔦 별빛 보물찾기 · 방법과 지도 보기 →</button>
      <FestivalGuide />
      <button type="button" className="field-primary" onClick={() => onNavigate('field-guide')}>오늘의 천체관측 · 자료 · 영상 먼저 보기 →</button>
      {hasProfile && <button type="button" className="field-primary" onClick={()=>onNavigate('camera')}>🎩 카메라로 마법모자 다시 쓰기</button>}
      {/* Action Buttons */}
      <div className="start-actions w-full space-y-3 pt-1">
        {hasProfile && state && (
          <button
            type="button"
            onClick={() => onNavigate(resumeSortingScreen(state!))}
            className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#ffd985] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.45)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer ring-2 ring-[#ffe6a4]/60"
          >
            <Play className="w-5 h-5 fill-[#20170a]" />
            <span>
              {state.name} 탐험 이어하기 ({new Set(state.completed || []).size}/7 기록) →
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigate('enroll')}
          className={`w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
            hasProfile
              ? 'text-[#f6ebd5] bg-[#102038] hover:bg-[#162c4c] border border-[#b7985b]/50'
              : 'text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>{hasProfile ? '새 이름으로 입학하기' : '별밤학교 입학하기 →'}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('prologue')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl text-[14px] font-medium text-[#f6ebd5] bg-[#102038]/85 hover:bg-[#162c4c] border border-[#b7985b]/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-[#e4bb70]" />
          <span>별밤 이야기 듣기</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('observatory')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl text-[14px] font-medium text-[#e4bb70] bg-[#102038]/50 hover:bg-[#162c4c] border border-[#e4bb70]/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4 text-[#e4bb70]" />
          <span>별빛 관측실 (도계 밤하늘 & 카시오페이아)</span>
        </button>
      </div>

      {/* Guest Characters Row */}
      <div className="character-gallery w-full rounded-2xl border border-[#d8b568]/40 bg-gradient-to-b from-[#12233f]/90 via-[#0a1527]/90 to-[#060e1b]/95 p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#d8b568]/20 text-xs">
          <span className="font-bold text-[#e4bb70] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>등장인물</span>
          </span>
          <button
            type="button"
            onClick={() => onNavigate('characters')}
            className="text-[11px] text-[#cbd8eb] hover:text-[#ffd880] flex items-center gap-0.5 cursor-pointer"
          >
            소개 보기 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-x-2 gap-y-3 pt-3">
          {CHARACTERS.map(c => (
            <div key={c.id} className="flex flex-col items-center">
              <CharacterFace speaker={c.id} size={54} />
              <span className="text-[10px] font-bold text-[#f6ebd5] pt-1">{c.name}</span>
              <span className="text-[9px] text-[#e4bb70] text-center leading-tight">{c.role.split(' · ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info & Discreet Operator Link */}
      <div className="pt-2 space-y-2">
        <p className="text-xs text-[#7d8fa7]">
          장원초등학교만의 특별한 별밤 이야기 · 사랑하는 가족과 함께 탐험해요
        </p>
        <div>
          <button
            type="button"
            onClick={() => onNavigate('admin-login')}
            className="text-sm font-bold text-[#cbd8eb] hover:text-[#e4bb70] transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] px-4 rounded-xl border border-[#3b5985] bg-[#102038]/70"
          >
            <span>⚙ 운영실 (교사 로그인)</span>
          </button>
        </div>
      </div>

      {/* Event Information & Official Application Modal */}
      {showEventInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0b172a] border border-[#d8b568]/50 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#22395d] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#ffd880]" />
                <h3 className="font-serif text-lg font-bold text-[#f6ebd5]">
                  2026 별밤 축제 상세 안내
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEventInfoModal(false)}
                className="p-1 rounded-lg text-[#8ea8cc] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Registration Notice */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2a1b0b] to-[#1a1106] border border-[#d97706] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#f59e0b]">
                <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
                <span>현장 접수 및 의상 안내</span>
              </div>
              <p className="text-xs text-[#fed7aa] leading-relaxed">
                본 앱은 당일 탐험 기록용입니다. 사전 신청은 마감되었으며 현장 접수도 가능합니다. 의상 대여는 준비된 수량과 사이즈에 따라 제한될 수 있습니다.
              </p>
              <a
                href={EXTERNAL_APPLICATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>사전 신청 시스템 (기존 신청 확인용)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Confirmed Schedule */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-[#e4bb70] uppercase tracking-wider">
                확정 행사 타임라인
              </h4>
              <div className="space-y-2">
                {OFFICIAL_SCHEDULE.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#0f2038] border border-[#1e385e] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#ffd880]">{item.timeStr}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1b3457] text-[#9ec1ec]">
                        {item.category}
                      </span>
                    </div>
                    <div className="font-medium text-xs text-[#f6ebd5]">{item.title}</div>
                    <p className="text-[11px] text-[#cbd8eb] leading-relaxed">{item.desc}</p>
                    {item.safetyNote && (
                      <p className="text-[10px] text-[#fcd34d] font-medium pt-0.5">
                        {item.safetyNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Safety & Etiquette */}
            <div className="p-3 rounded-2xl bg-[#091424] border border-[#1b3152] space-y-1.5 text-xs text-[#9eb5d3]">
              <div className="font-bold text-[#e4bb70]">보호자 동행 및 시설·안전 수칙:</div>
              <p>• {SAFETY_AND_FACILITY_GUIDELINES.guardianAccompaniment}</p>
              <p>• {SAFETY_AND_FACILITY_GUIDELINES.registrationAndHandover}</p>
              <p>• {SAFETY_AND_FACILITY_GUIDELINES.indoorSlippers}</p>
              <p>• {SAFETY_AND_FACILITY_GUIDELINES.rainAlternativePlan}</p>
              <p>• {SAFETY_AND_FACILITY_GUIDELINES.healthAndEmergency}</p>
              <p className="text-[11px] text-[#ffd880]">• {SAFETY_AND_FACILITY_GUIDELINES.unconfirmedNotice}</p>
            </div>

            {/* Latecomer & Offline Paper Sheet Assistance */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-[#13233b] border border-[#2b446a] space-y-1">
                <span className="font-bold text-[#ffd880] block">{LATECOMER_SUMMARY_GUIDE.title}</span>
                <p className="text-[11px] text-[#b8d0ea]">{LATECOMER_SUMMARY_GUIDE.summary}</p>
                <div className="text-[10px] text-[#9fc0e5] space-y-0.5 pt-1">
                  {LATECOMER_SUMMARY_GUIDE.steps.map((st, sidx) => (
                    <div key={sidx}>{st}</div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#111f32] border border-[#263c5e] space-y-1">
                <span className="font-bold text-[#62d29e] block">{OFFLINE_PRINTED_SHEET_GUIDE.title}</span>
                <p className="text-[11px] text-[#a9c5e5] leading-relaxed">
                  {OFFLINE_PRINTED_SHEET_GUIDE.desc}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1524] border border-[#1d304c] text-[11px] text-[#8ea4be]">
                * 바비큐 먹거리 및 페이스페인팅은 안내형 선택 체험이며, 7개 별빛 기록 수집의 필수 조건이 아닙니다. (푸드트럭은 미운영)
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEventInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#ffd880] text-[#1c1204] font-bold text-xs hover:bg-[#f6cb63] transition-colors"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
