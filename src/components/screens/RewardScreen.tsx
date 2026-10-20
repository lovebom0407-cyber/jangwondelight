import React from 'react';
import { ParticipantState } from '../../types';
import { getMissionNumber } from '../../data/standardMissions';
import { getMissions } from '../../data/storyData';
import { SPELLS } from '../../services/battle';
import { SpellMiniGame } from '../SpellMiniGame';
import { ArrowRight } from 'lucide-react';

/**
 * 별빛을 받은 뒤: 그 수업의 마법을 미니게임으로 배우고 마법 책에 넣기.
 * 일곱 마법을 다 모으면 마지막 이야기(볼드모트 마법 대결)로 이어집니다.
 */
interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onStartFinale: () => void;
}

export const RewardScreen: React.FC<Props> = ({ state, onUpdateState, onNavigate, onStartFinale }) => {
  const lastIndex = typeof state.selectedMissionIndex === 'number'
    ? state.selectedMissionIndex
    : (state.completed[state.completed.length - 1] ?? 0);
  const missions = getMissions(state.experienceMode);
  const mission = missions[lastIndex] || missions[0];
  const learned = state.spells || [];
  const alreadyLearned = learned.includes(lastIndex);
  const isFinishedAll = new Set(state.completed).size >= 7;

  const learn = () => {
    onUpdateState({ spells: Array.from(new Set([...learned, lastIndex])) });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-5 pb-16 animate-fade-in pt-2 max-w-[430px] mx-auto">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102039] border border-[#e4bb70]/40 text-xs font-semibold text-[#e4bb70]">
          0{getMissionNumber(lastIndex, state.experienceMode)} · {mission.starlight} 획득!
        </div>
        <h2 className="font-serif text-2xl font-extrabold text-[#f6ebd5]">
          {alreadyLearned ? '마법 책' : '새 마법을 배워 볼까?'}
        </h2>
      </div>

      {!alreadyLearned ? (
        <SpellMiniGame missionIndex={lastIndex} playerName={state.name} onLearned={learn} />
      ) : (
        <>
          {/* 마법 책 */}
          <div className="w-full grid grid-cols-4 gap-2">
            {SPELLS.map(sp => {
              const has = learned.includes(sp.missionIndex);
              return (
                <div
                  key={sp.id}
                  className={`rounded-2xl p-2 flex flex-col items-center gap-1 border-2 ${
                    has ? 'bg-[#fdf3dc] border-[#c7963d] text-[#1d1408]' : 'bg-[#0b1629] border-[#22354f] text-[#4b5d78]'
                  } ${sp.missionIndex === lastIndex ? 'ring-4 ring-[#ffd880] animate-pulse' : ''}`}
                >
                  <span className={`text-3xl ${has ? '' : 'grayscale opacity-40'}`}>{has ? sp.icon : '❔'}</span>
                  <span className="text-[10px] font-bold leading-tight">{has ? sp.name : `0${getMissionNumber(sp.missionIndex, state.experienceMode)}`}</span>
                </div>
              );
            })}
            <div className="rounded-2xl p-2 flex flex-col items-center justify-center border-2 border-dashed border-[#7c3aed]/60 text-[#c4b5fd]">
              <span className="text-2xl">⚔️</span>
              <span className="text-[10px] font-bold leading-tight">볼드모트</span>
            </div>
          </div>
          <p className="text-sm text-[#cbd8eb]">
            마법 {learned.length} / 7 · {learned.length >= 7 ? '이제 볼드모트를 물리치러 가자!' : '모든 마법을 모으면 볼드모트와 대결해요!'}
          </p>

          {/* 이번 수업 보상 */}
          {(() => {
            const got = (state.rewards?.tickets || []).filter(t => (t.source ? t.source === `mission:${lastIndex}` || (t.source === 'all-clear' && t.mission === lastIndex) : t.mission === lastIndex && t.kind !== 'prize'));
            if (!got.length) return null;
            const left = (state.rewards?.tickets || []).filter(t => !t.used && t.kind !== 'badge').length;
            return (
              <div data-reward-box className="rounded-3xl p-4 bg-gradient-to-br from-[#1e3a8a] to-[#312e81] border-2 border-dashed border-[#fde68a] text-white space-y-3 shadow-[0_0_30px_rgba(253,230,138,0.25)] animate-fade-in">
                <p className="text-lg font-extrabold text-[#fde68a]">🎁 수업 클리어 보상! 룰렛 이용권 도착</p>
                <div className="flex flex-wrap gap-2">
                  {got.map(t => (
                    <span key={t.id} className="px-3 py-2 rounded-xl bg-white/15 font-bold text-base">{t.emoji} {t.label}</span>
                  ))}
                </div>
                <button type="button" onClick={() => onNavigate('tickets')} className="w-full min-h-[54px] rounded-2xl font-extrabold text-lg text-[#1e1b4b] bg-gradient-to-r from-[#fde68a] to-[#f59e0b] cursor-pointer active:scale-95">
                  🎒 아이템 보관함 열기 ({left}장)
                </button>
              </div>
            );
          })()}

          <button
            type="button"
            onClick={() => (isFinishedAll && !state.story?.finaleDone ? onStartFinale() : onNavigate(isFinishedAll ? 'ending' : 'map'))}
            className="w-full min-h-[56px] px-6 rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isFinishedAll ? (state.story?.finaleDone ? '엔딩 보기' : '⚔️ 볼드모트에게 가기') : '다음 수업 고르기'} <ArrowRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};
