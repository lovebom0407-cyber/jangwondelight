import React from 'react';
import { ParticipantState } from '../../types';
import { HarryAvatar, MalfoyAvatar, DumbledoreAvatar } from '../characterAssets';
import { Telescope, Award, FileText, Sparkles, Star } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
}

export const EndingScreen: React.FC<Props> = ({ state, onNavigate }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-6 pb-24 animate-fade-in pt-3 max-w-[430px] mx-auto">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#102039] border border-[#e4bb70]/40 text-xs font-semibold uppercase tracking-widest text-[#e4bb70]">
          <Star className="w-3.5 h-3.5 fill-[#e4bb70]" />
          <span>별빛 7개 · 다 모았어요!</span>
        </div>
        <h2 className="font-serif text-3xl font-extrabold text-[#f6ebd5] leading-tight">
          마법사의 돌을<br />
          지켰어요!
        </h2>
      </div>

      {/* Sparkling 7 Celestial Stars */}
      <div className="flex justify-center gap-2 py-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="text-2xl text-[#ffd880] drop-shadow-[0_0_15px_#ffce69] animate-pulse"
          >
            ✦
          </span>
        ))}
      </div>

      {/* Dumbledore's praise & Draco's cooperation */}
      <div className="flex items-end justify-center -space-x-3 py-1">
        <div className="z-10 -rotate-6"><HarryAvatar size={72} framed={true} /></div>
        <div className="z-20 scale-105 mb-1"><DumbledoreAvatar size={92} framed={true} /></div>
        <div className="z-10 rotate-6"><MalfoyAvatar size={72} framed={true} /></div>
      </div>
      <p className="text-xs text-[#e4bb70] font-semibold -mt-2">
        덤블도어의 칭찬 · 말포이의 “같이 하자”
      </p>

      {/* The Climax Golden Mystery Box */}
      <div className="w-full rounded-3xl border-2 border-[#e5b84c] bg-gradient-to-b from-[#1c2e4d] via-[#101e35] to-[#071120] p-6 shadow-[0_0_40px_rgba(229,184,76,0.35)] space-y-4">
        <div className="text-4xl text-[#ffe394] drop-shadow-[0_0_20px_#e5b84c]">
          ✧ ☾ ✦
        </div>

        <h3 className="font-serif text-2xl font-black text-[#ffe8a8] leading-snug">
          마지막 별빛은<br />
          상자 안에 없습니다.<br /><br />
          고개를 들어<br />
          하늘을 바라보세요.
        </h3>

        <div className="w-16 h-0.5 bg-[#e5b84c]/60 mx-auto" />

        <p className="font-serif text-sm text-[#d3e2f5] leading-relaxed">
          별빛지도가 다시 반짝여요.<br />
          이제 엄마 아빠와 함께 진짜 밤하늘의 별을 보러 가요!
        </p>
      </div>

      {/* Celestial Invitation Card */}
      <div className="w-full rounded-2xl border border-[#b7985b]/40 bg-[#0d1d36]/95 p-5 text-left space-y-2.5 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-[#ffd880]">
          <Telescope className="w-4 h-4 text-[#ffd880]" />
          <span>전문가 천체관측 안내</span>
        </div>
        <p className="font-serif text-base font-bold text-[#f6ebd5]">
          장소: 현장 안내에 따른 천체관측 장소
        </p>
        <p className="text-sm text-[#b8ccdf] leading-relaxed">
          엄마 아빠 손을 잡고 천체관측 장소로 걸어가요. 선생님이 망원경으로 별을 보여 주실 거예요. (날씨에 따라 보이는 별이 달라질 수 있어요)
        </p>
      </div>

      {/* Congratulatory Praise Card */}
      <div className="w-full rounded-2xl border border-[#b7985b]/40 bg-[#0d1d36]/95 p-5 text-left space-y-2 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-[#62d29e]">
          <Award className="w-4 h-4 text-[#62d29e]" />
          <span>참 잘했어요, {state.name}!</span>
        </div>
        <p className="text-sm text-[#d0e0f3] leading-relaxed">
          일곱 수업을 모두 마치고 마법사의 돌을 지킨 장원 별밤학교 마법사예요!
        </p>
      </div>

      {/* Actions */}
      <div className="w-full space-y-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('survey')}
          className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Google 교육 효과 설문 (3~5분) →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('portfolio')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-[#f6ebd5] bg-[#172c4a] hover:bg-[#1f3a61] border border-[#b7985b]/50 shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#e4bb70]" />
          <span>나의 완성 포트폴리오 · PDF 저장하기</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onNavigate('passport')}
            className="py-3 px-3 rounded-xl text-xs font-semibold text-[#d8c7a7] bg-[#112038]/70 hover:bg-[#162c4c] border border-[#b7985b]/30 transition-colors cursor-pointer"
          >
            완성 패스포트 보기
          </button>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="py-3 px-3 rounded-xl text-xs font-semibold text-[#d8c7a7] bg-[#112038]/70 hover:bg-[#162c4c] border border-[#b7985b]/30 transition-colors cursor-pointer"
          >
            탐험 지도 보기
          </button>
        </div>
      </div>
    </div>
  );
};
