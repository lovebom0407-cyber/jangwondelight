import React from 'react';
import { ParticipantState } from '../../types';
import { HOUSES } from '../../data/storyData';
import { FacelessSortingHat } from '../characterAssets';
import { Sparkles, Star } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
}

export const AssignedScreen: React.FC<Props> = ({ state, onNavigate }) => {
  const houseIndex = state.house !== null ? state.house : 0;
  const house = HOUSES[houseIndex];

  if (state.experienceMode === 'junior') return <div className="junior-ui space-y-6 text-center pb-16"><FacelessSortingHat size={180}/><h1>모자가 골랐어요!</h1><div className="text-6xl" style={{color:house.color}}>{house.symbol}</div><h1 style={{color:house.color}}>{house.name}</h1><p>{state.name}, 반가워요!</p><button type="button" className="junior-main" onClick={()=>onNavigate('map')}>🗺️ 보물 찾으러 출발!</button></div>;
  return (
    <div className="flex flex-col items-center text-center space-y-6 pb-12 animate-fade-in">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          장원 별밤학교 · 기숙사 배정
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          당신의 기숙사는…
        </h2>
      </div>

      {/* House Shield Emblem */}
      <div className="relative group">
        <div
          className="w-28 h-34 rounded-t-3xl rounded-b-[45px] border-4 flex flex-col items-center justify-center shadow-2xl transition-transform hover:scale-105 duration-300"
          style={{
            borderColor: house.color,
            backgroundColor: `${house.color}22`,
            boxShadow: `0 0 45px ${house.color}44`
          }}
        >
          <span
            className="text-6xl font-serif select-none"
            style={{ color: house.color, textShadow: `0 0 20px ${house.color}` }}
          >
            {house.symbol}
          </span>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#081326] border text-[11px] font-bold text-white whitespace-nowrap" style={{ borderColor: house.color }}>
          {house.animal}
        </div>
      </div>

      {/* House Title & Motto */}
      <div className="space-y-2 max-w-sm">
        <h1
          className="font-serif text-3xl sm:text-4xl font-black tracking-tight"
          style={{ color: house.color, textShadow: `0 0 25px ${house.color}66` }}
        >
          {house.name}
        </h1>
        <p className="text-sm font-semibold text-[#f6ebd5]">
          {house.animal}의 마음 · {house.trait}
        </p>
        <p className="text-xs text-[#aeb9cb] italic">
          “{house.motto}”
        </p>
      </div>

      {/* Glowing Starlight Lantern with House Color */}
      <div className="relative my-2">
        <div
          className="w-16 h-22 rounded-t-3xl rounded-b-2xl border-2 flex items-center justify-center text-3xl"
          style={{
            borderColor: '#a07c48',
            background: `radial-gradient(ellipse at 50% 40%, ${house.color}, #161822 75%)`,
            boxShadow: `0 0 40px ${house.color}66`
          }}
        >
          <Star className="w-8 h-8 text-white fill-white animate-pulse" />
        </div>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-5 border-2 border-[#a07c48] rounded-full" />
      </div>

      {/* Sorting Hat Congratulations Avatar */}
      <div className="flex flex-col items-center py-1">
        <FacelessSortingHat size={110} />
        <span className="text-[11px] font-semibold text-[#e4bb70] mt-1.5">
          마법 분류모자의 배정 완료
        </span>
      </div>

      {/* Congratulations Parchment Card */}
      <div className="w-full max-w-sm rounded-2xl border-2 border-[#c39b5e] bg-gradient-to-br from-[#f8e9ca] via-[#eed4a4] to-[#deb87a] p-5 text-[#2d2215] shadow-xl text-left space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8a5d24]" />
          <h3 className="font-serif text-base font-bold text-[#23170a]">
            입학을 축하합니다, {state.name}!
          </h3>
        </div>
        <p className="text-xs sm:text-[13px] text-[#4b3922] leading-relaxed">
          {house.name}의 상징인 <strong>기숙사 색 랜턴</strong>과 <strong>별빛 패스포트</strong>를 수여합니다.<br />
          {state.family ? `함께하는 가족(${state.family})과 함께 ` : ''}학교 곳곳의 일곱 부스를 탐험하며 비어 있는 별지도를 환하게 채워주세요!
        </p>
      </div>

      <div className="w-full max-w-sm pt-2">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>별빛 패스포트 받고 탐험 출발 →</span>
        </button>
      </div>
    </div>
  );
};
