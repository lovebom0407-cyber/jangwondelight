import React from 'react';
import { ParticipantState } from '../../types';
import { getOrderedMissions } from '../../data/storyData';
import { BookOpen, CheckCircle, Lock, ArrowLeft } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
}

export const JournalScreen: React.FC<Props> = ({ state, onNavigate }) => {
  const missions = getOrderedMissions(state.experienceMode);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <button
        type="button"
        onClick={() => onNavigate('map')}
        className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 탐험 지도
      </button>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          STARLIGHT JOURNAL
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          별빛 탐험 수첩
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          일곱 부스에서 완수한 배움의 디지털 기록 모음입니다.
        </p>
      </div>

      {/* Parchment Case File */}
      <div className="rounded-3xl border-2 border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#eed4a4] to-[#deb87a] p-6 text-[#2d2215] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#bfa26f] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7a4e18] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>디지털 별지도 기록 ({new Set(state.completed || []).size} / 7)</span>
          </div>
          <span className="text-[11px] font-mono text-[#8a5d25]">
            {new Set(state.completed || []).size === 7 ? '전체 해금 완료 ✓' : '기록 수집 중'}
          </span>
        </div>

        <div className="space-y-3">
          {missions.map((m, i) => {
            const isCompleted = state.completed.includes(m.id);
            const userNote = state.records?.[m.id]?.userNote;

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-[#fffcf4] border-[#4fa078] text-[#1b3f2f] shadow-xs'
                    : 'bg-[#f4e0bc]/50 border-[#ccb387] text-[#6d573d] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-[#298c5a] shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#988167] shrink-0" />
                      )}
                      <strong className="font-serif text-xs font-bold">
                        {isCompleted ? m.unlockedClueTitle : `0${i + 1}. 아직 잠겨 있는 기록`}
                      </strong>
                    </div>

                    <p className="text-[11px] text-[#554129] pl-6 leading-relaxed">
                      {isCompleted
                        ? m.unlockedClueDesc
                        : `${m.lessonName}(${m.title}) 활동과 인증샷을 마치면 열립니다.`}
                    </p>

                    {isCompleted && userNote && (
                      <div className="ml-6 mt-1 p-2 rounded-lg bg-[#f0f8f4] border border-[#b2ddca] text-[10px] text-[#1e5842]">
                        <strong>가족의 한 줄 기록: </strong> {userNote}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#8f6e3c] shrink-0">
                    0{i + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('map')}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-md hover:brightness-105 transition-all cursor-pointer"
      >
        탐험 지도로 돌아가기 →
      </button>
    </div>
  );
};
