import React from 'react';
import { ParticipantState } from '../../types';
import { HOUSES, getOrderedMissions } from '../../data/storyData';
import { Sparkles, CheckCircle2, Circle, ArrowLeft, Award, Shield } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
}

export const PassportScreen: React.FC<Props> = ({ state, onNavigate }) => {
  const house = state.house !== null ? HOUSES[state.house] : HOUSES[0];
  const missions = getOrderedMissions(state.experienceMode);

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-[430px] mx-auto">
      <button
        type="button"
        onClick={() => onNavigate('map')}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-xs text-[#d8c7a7] hover:text-white px-3.5 py-2 rounded-xl bg-[#112038]/70 border border-[#b7985b]/30 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> 탐험 지도
      </button>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70] font-semibold">
          OFFICIAL STARLIGHT PASSPORT
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#f6ebd5]">
          우리 가족의 별빛 패스포트
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          장원 별밤 마법학교 공식 모험 여권 · {new Set(state.completed || []).size}/7 스탬프 날인
        </p>
      </div>

      {/* Luxury Leather Passport Outer Cover Frame */}
      <div className="rounded-3xl border-2 border-[#d8b568] bg-gradient-to-br from-[#122035] via-[#091526] to-[#040a14] p-2 shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        {/* Inside Parchment Page */}
        <div className="rounded-2xl border border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#f1dbb1] to-[#deb87a] p-5 sm:p-6 text-[#2d2215] shadow-inner space-y-5">
          {/* Header & Crest */}
          <div className="flex items-start justify-between border-b-2 border-[#bfa26f]/70 pb-4">
            <div className="space-y-1.5 flex-1 pr-3">
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#885d26]">
                <Shield className="w-3.5 h-3.5 text-[#885d26]" />
                <span>JANGWON ELEMENTARY SCHOOL</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-black text-[#261708] leading-tight">
                {state.name}
              </h3>
              <p className="text-xs text-[#523d24]">
                <strong>동반 가족:</strong> {state.family || '가족과 함께'}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#26190c]/10 border border-[#bfa26f] text-xs font-bold" style={{ color: house.color }}>
                <span className="text-base">{house.symbol}</span>
                <span>{house.name} · {house.animal}</span>
              </div>
            </div>

            {/* Official Student Portrait Photo with Passport Gold Corner Marks */}
            <div className="relative shrink-0 w-22 h-28 rounded-xl overflow-hidden border-2 border-[#8a5d24] bg-[#1a120b] shadow-md flex items-center justify-center">
              {state.photo ? (
                <img
                  src={state.photo}
                  alt={`${state.name} 입학 사진`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2">
                  <span className="text-3xl font-serif block" style={{ color: house.color }}>
                    {house.symbol}
                  </span>
                  <span className="text-[10px] text-[#cca568] block mt-1">입학 완료</span>
                </div>
              )}
              {/* Gold seal watermark */}
              <div className="absolute bottom-1 right-1 text-[9px] px-1 rounded bg-[#000000]/60 text-[#ffe5a3] font-mono">
                2026.10
              </div>
            </div>
          </div>

          {/* 7 Mission Visa Stamps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#6d491c] uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#8a5d24]" />
                <span>일곱 부스 공식 완수 스탬프</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-[#805723]">
                {new Set(state.completed || []).size} / 7 STAMPS
              </span>
            </div>

            <div className="grid gap-2.5">
              {missions.map((m, i) => {
                const isCompleted = state.completed.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isCompleted
                        ? 'bg-[#fffdf7] border-[#3fa374] text-[#134931] font-bold shadow-xs'
                        : 'bg-[#f4e2bf]/60 border-[#ccb387] text-[#715c41] opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#8a5d25]">0{i + 1}</span>
                      <div>
                        <span className="font-serif text-[13px]">{m.lessonName} · {m.title}</span>
                        {isCompleted && (
                          <span className="block text-[11px] text-[#347b59] font-normal leading-tight pt-0.5">
                            {m.unlockedClueTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-[11px] text-[#1e8751] font-bold shrink-0 bg-[#e4f7ed] px-2.5 py-1 rounded-full border border-[#9ed9bb]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>날인 완료</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-[#8c7456] shrink-0">
                        <Circle className="w-3.5 h-3.5" />
                        <span>미완료</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        {new Set(state.completed || []).size >= 7 ? (
          <button
            type="button"
            onClick={() => onNavigate('portfolio')}
            className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>완성 포트폴리오 · PDF 저장하기 →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          >
            탐험 이어가기 →
          </button>
        )}
      </div>
    </div>
  );
};
