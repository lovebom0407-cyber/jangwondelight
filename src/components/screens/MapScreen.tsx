import React, { useState } from 'react';
import { FestivalGuide } from '../FestivalGuide';
import { ParticipantState } from '../../types';
import {
  HOUSES,
  getMissions,
  getOrderedMissions,
  LATECOMER_SUMMARY_GUIDE,
  OFFLINE_PRINTED_SHEET_GUIDE
} from '../../data/storyData';
import { HarryAvatar, HagridAvatar, CharacterAvatar } from '../characterAssets';
import { SPELLS } from '../../services/battle';
import { unusedCount } from '../../services/rewards';
import {
  Check,
  Sparkles,
  Star,
  ChevronRight,
  MessageSquare,
  Compass,
  Info,
  X,
  FileText,
  Clock
} from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
  onSelectMission: (index: number) => void;
  onResumeDialogue: () => void;
  onStartFinale: () => void;
}

export const MapScreen: React.FC<Props> = ({
  state,
  onNavigate,
  onSelectMission,
  onResumeDialogue,
  onStartFinale
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const house = state.house !== null ? HOUSES[state.house] : HOUSES[0];
  const uniqueCompleted = new Set(state.completed || []);
  const completedCount = uniqueCompleted.size;
  const isAllCompleted = completedCount >= 7;
  const missions = getMissions(state.experienceMode);
  const displayMissions = getOrderedMissions(state.experienceMode);

  const rewardLeft = unusedCount(state);
  // Find a friendly recommended booth (first uncompleted)
  const recommendedIndex = displayMissions.find(m => !uniqueCompleted.has(m.id))?.id ?? displayMissions[0].id;

  return (
    <div className="map-screen space-y-6 pb-20 animate-fade-in mx-auto">
      {/* Top Header Card */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('admin-login')}
          className="text-xs font-bold text-[#9fb6d6] hover:text-[#e4bb70] px-2.5 py-1 rounded-lg border border-[#3b5985] bg-[#102038]/70 cursor-pointer"
          aria-label="운영실 (교사 로그인)"
        >
          ⚙ 운영실
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate('tickets')}
            className={`relative px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${rewardLeft ? 'bg-[#fde68a] text-[#1e1b4b] border-[#f59e0b] animate-pulse' : 'bg-[#11223b] text-[#e4bb70] border-[#b7985b]/40'}`}
          >
            🎒 보관함{rewardLeft ? ` ${rewardLeft}` : ''}
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11223b] border border-[#b7985b]/40 text-xs font-bold text-[#e4bb70]">
            <Star className="w-3.5 h-3.5 fill-[#e4bb70]" />
            <span>{completedCount} / 7</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
            {state.name}님의 별빛지도
          </h2>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center gap-1 text-[11px] text-[#ffd880] hover:underline cursor-pointer bg-[#152744] px-2 py-1 rounded-lg border border-[#30507d]"
          >
            <Info className="w-3 h-3" />
            <span>탐험 안내</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#aeb9cb] flex-wrap">
          <span className="font-semibold text-[#ffd880]">
            {state.school || '장원초'} {state.grade || '3학년'}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-semibold" style={{ color: house.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: house.color }} />
            {house.name}
          </span>
          <span>·</span>
          <span>{state.family ? `${state.family}과 함께` : '가족과 함께'}</span>
        </div>
      </div>

      <section className="sky-hero">
        <p className="sky-kicker">TONIGHT'S HIGHLIGHT · 10. 21. WED</p>
        <h1>마법의 끝에서,<br /><em>진짜 별을 만나요.</em></h1>
        <p className="mt-4">19:50–21:00 · 운동장 천체관측 부스<br /><strong>전문가와 망원경으로 만나는 밤하늘</strong></p>
        <button type="button" className="field-primary mt-5" onClick={() => onNavigate('field-guide')}>천체관측 준비 · 자료 · 영상 →</button>
        <small>부스 완료와 관계없이 참여해요. 오늘 볼 천체와 순서는 현장의 전문가 안내를 따라요.</small>
      </section>
      <FestivalGuide />
      <div className="field-quick">
        <button type="button" onClick={() => onNavigate('arcade')}>🧹 마법 연습실<small>스니치 찾기 · 지팡이 슈팅<br />지금 바로 연습해요</small></button>
        <button type="button" onClick={() => onNavigate('tickets')}>🎟 나의 이용권<small>룰렛 · 분식 · 특별게임<br />받은 보상을 확인해요</small></button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="field-back" onClick={() => onNavigate('passport')}>별빛 패스포트</button>
        <button type="button" className="field-back" onClick={() => onNavigate('journal')}>탐험 수첩</button>
        <button type="button" className="field-back" onClick={() => onNavigate('bag')}>나의 랜턴</button>
      </div>
      {/* Progress Gems (7 distinct booths) */}
      <div className="flex justify-center gap-2.5 py-1">
        {displayMissions.map((m, position) => {
          const i = m.id;
          const earned = uniqueCompleted.has(i);
          const isSelected = state.selectedMissionIndex === i;
          return (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                earned
                  ? 'bg-gradient-to-br from-[#ffe79c] to-[#d6992d] text-[#221603] shadow-[0_0_15px_#ffce69]'
                  : isSelected
                  ? 'border-2 border-[#e4bb70] bg-[#162744] text-[#e4bb70] shadow-[0_0_10px_rgba(228,187,112,0.3)] animate-pulse'
                  : 'bg-[#0f1b2e] border border-[#3b4c68] text-[#556987]'
              }`}
              title={`0${position + 1} ${m.lessonName} · ${m.title}`}
            >
              {earned ? '✦' : position + 1}
            </div>
          );
        })}
      </div>

      {/* 마법 책 (미니게임으로 배운 마법) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#0f1f38] border border-[#d8b568]/40">
        <span className="text-xs font-bold text-[#ffd880] shrink-0">마법 책</span>
        <div className="flex gap-1.5">
          {SPELLS.map(sp => (
            <span
              key={sp.id}
              title={sp.name}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                (state.spells || []).includes(sp.missionIndex) ? 'bg-[#fdf3dc]' : 'bg-[#0b1629] opacity-40 grayscale'
              }`}
            >
              {(state.spells || []).includes(sp.missionIndex) ? sp.icon : '❔'}
            </span>
          ))}
        </div>
      </div>

      {/* Starlight Observatory Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#142848] via-[#1c3866] to-[#142848] border border-[#ffd880]/40 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#28497d] flex items-center justify-center text-[#ffd880] shrink-0 border border-[#4872af]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#ffd880]">별빛 관측실</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#d97706] text-white font-bold">
                해리와 함께
              </span>
            </div>
            <p className="text-[11px] text-[#cbdcf2] leading-tight">
              오늘의 별자리 10개 · 별 잇기 연습
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('observatory')}
          className="px-3.5 py-2 rounded-xl bg-[#ffd880] hover:bg-[#f6cb63] text-[#1a1204] font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          입장하기 →
        </button>
      </div>

      {/* Harry & Hermione Guide Box (Free Order Announcement) */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#12243f] to-[#0c182c] border border-[#b7985b]/40 shadow-lg text-left">
        <div className="flex -space-x-2 shrink-0">
          <HarryAvatar size={48} />
          <HagridAvatar size={48} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-[#ffd880]">
            해리와 해그리드의 탐험 안내
          </p>
          <p className="text-xs text-[#cbd8eb] leading-relaxed">
            {isAllCompleted
              ? '별빛을 다 모았어! 덤블도어 교장 선생님한테 가 보자.'
              : `가고 싶은 수업을 골라! 엄마 아빠 손 잡고 걸어가자. “${missions[recommendedIndex]?.lessonName}”은 어때?`}
          </p>
        </div>
      </div>

      {/* Dialogue Resume Card if a scene was left unfinished */}
      {state.story?.scene && (
        <div className="p-4 rounded-2xl bg-[#231d10] border-2 border-[#e5b84c] shadow-xl flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#ffd880] animate-bounce" />
            <div>
              <p className="text-xs font-bold text-[#ffd880]">대화가 진행 중입니다</p>
              <p className="text-xs text-[#ecd6b0]">중단된 마법사 캐릭터 대화를 이어서 확인하세요.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResumeDialogue}
            className="px-3.5 py-2 rounded-lg bg-[#e5b84c] text-[#201502] font-bold text-xs hover:brightness-105 transition-all cursor-pointer"
          >
            이어하기 →
          </button>
        </div>
      )}

      {/* Field Map Stations (Free selection) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#aeb9cb] px-1">
          <span className="font-bold text-[#e4bb70]">일곱 수업 자유선택 지도</span>
          <span className="text-[11px] text-[#ffd880]">★ 누르면 대화가 시작돼요</span>
        </div>

        <div className="space-y-3">
          {displayMissions.map((m, position) => {
            const i = m.id;
            const isDone = uniqueCompleted.has(i);
            const isUnlocked = state.unlocked === i;
            const isPending = state.pendingMission === i;
            const isSelected = state.selectedMissionIndex === i;

            // Status label
            let statusText = m.starlight;
            let statusColor = 'text-[#7e92b0]';
            if (isDone) {
              statusText = '별빛 받음 ✓';
              statusColor = 'text-[#62d29e]';
            } else if (isPending) {
              statusText = '인증샷 남았어요';
              statusColor = 'text-[#ffd880] font-bold';
            } else if (isUnlocked) {
              statusText = '하는 중';
              statusColor = 'text-[#60a5fa] font-bold';
            }

            return (
              <button
                key={m.id}
                type="button"
                data-mission-id={m.id}
                data-mission-number={position + 1}
                onClick={() => onSelectMission(i)}
                className={`mission-card w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                  isDone
                    ? 'bg-[#0d1c31]/90 border-[#4da87f]/60 hover:border-[#67cfa1]'
                    : isSelected
                    ? 'bg-gradient-to-r from-[#172c4e] to-[#10213b] border-[#e4bb70] shadow-[0_0_20px_rgba(228,187,112,0.25)] ring-1 ring-[#e4bb70]/50'
                    : 'bg-[#091322] border-[#22354f] hover:border-[#385680] hover:bg-[#0e1b2f]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div
                    className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg shrink-0 transition-transform ${
                      isDone
                        ? 'bg-[#3b8764] text-white'
                        : isSelected
                        ? 'bg-[#e4bb70] text-[#221603] shadow-md group-hover:scale-105'
                        : 'bg-[#152339] text-[#7185a5] group-hover:text-[#ffd880]'
                    }`}
                  >
                    {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <CharacterAvatar speaker={m.speaker} size={44} />}
                  </div>

                  <div className="space-y-0.5 min-w-0 break-words">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={statusColor}>
                        0{position + 1}
                      </span>
                      <span className="text-[#647998]">·</span>
                      <span className={statusColor}>
                        {statusText}
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-bold text-[#f6ebd5] leading-tight">
                      {m.lessonName}
                    </h3>
                    <p className="text-xs text-[#9eb2ce]">
                      {m.title !== m.lessonName ? `${m.title} · ` : ''}{m.place}
                    </p>
                    <p className="pt-1 text-xs font-bold text-[#ffd880] leading-relaxed" data-visit-label>
                      {isDone ? '기록보기' : m.visitLabel || `${m.place} 부스 방문`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-[#aeb9cb] group-hover:text-white group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Finale Action if 7/7 complete */}
      {isAllCompleted && (
        <button
          type="button"
          onClick={() => (state.story?.finaleDone ? onNavigate('ending') : onStartFinale())}
          className="w-full min-h-[54px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.4)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
        >
          <Sparkles className="w-5 h-5" />
          <span>{state.story?.finaleDone ? '마지막 이야기 다시 보기 →' : '⚔️ 볼드모트에게 가기 →'}</span>
        </button>
      )}

      {/* Quick Guide Modal for Latecomers & Offline Sheet */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0b172a] border border-[#d8b568]/50 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#22395d] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#ffd880]" />
                <h3 className="font-serif text-base font-bold text-[#f6ebd5]">
                  {LATECOMER_SUMMARY_GUIDE.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-[#8ea8cc] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#cbd8eb] leading-relaxed">
              <p className="font-semibold text-[#ffd880]">
                {LATECOMER_SUMMARY_GUIDE.summary}
              </p>
              <div className="p-3 rounded-xl bg-[#0f2038] border border-[#1e385e] space-y-1 text-[#f6ebd5]">
                {LATECOMER_SUMMARY_GUIDE.steps.map((s, idx) => (
                  <p key={idx}>{s}</p>
                ))}
              </div>
            </div>

            {/* Offline Printed Sheet guidance */}
            <div className="p-3.5 rounded-2xl bg-[#1b1509] border border-[#d97706]/70 space-y-1.5 text-xs text-[#fed7aa]">
              <div className="flex items-center gap-1.5 font-bold text-[#f59e0b]">
                <FileText className="w-4 h-4 text-[#f59e0b]" />
                <span>{OFFLINE_PRINTED_SHEET_GUIDE.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#fef3c7]">
                {OFFLINE_PRINTED_SHEET_GUIDE.desc}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#ffd880] text-[#1c1204] font-bold text-xs hover:bg-[#f6cb63] transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
