import React from 'react';
import { CharacterFull, FacelessSortingHat } from '../characterAssets';
import { CHARACTERS } from '../../data/characters';
import { getOrderedMissions } from '../../data/storyData';
import type { ExperienceMode } from '../../services/experience';
import { ArrowLeft } from 'lucide-react';

interface Props {
  mode?: ExperienceMode;
  onNavigate: (screen: any) => void;
}

export const CharactersScreen: React.FC<Props> = ({ onNavigate, mode = 'standard' }) => {
  const missions = getOrderedMissions(mode);
  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-[430px] mx-auto">
      <button
        type="button"
        onClick={() => onNavigate('start')}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-xs text-[#d8c7a7] hover:text-white px-3.5 py-2 rounded-xl bg-[#112038]/70 border border-[#b7985b]/30 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> 시작 화면으로
      </button>

      <div className="space-y-1.5">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70] font-semibold">
          CHARACTERS · {CHARACTERS.length}
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#f6ebd5]">
          장원 별밤학교의 등장인물
        </h2>
        <p className="text-[14px] text-[#b4c4db] leading-relaxed">
          마법사의 돌을 지키러 함께 가는 친구들과 선생님들이에요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CHARACTERS.map(char => (
          <article
            key={char.id}
            className="rounded-2xl border bg-gradient-to-b from-[#13233f] via-[#0b1629] to-[#060c18] p-3 shadow-xl flex flex-col text-left"
            style={{ borderColor: `${char.accent}66` }}
          >
            <CharacterFull speaker={char.id} height={210} className="w-full" />
            <div className="pt-2 space-y-1">
              <h3 className="font-serif text-base font-bold text-[#f6ebd5]">{char.name}</h3>
              <div className="text-[11px] font-semibold" style={{ color: char.accent }}>
                {char.role}
              </div>
              <p className="text-[11px] text-[#cad6ea] leading-snug">{char.desc}</p>
              <p className="text-[10px] text-[#8fa7c7] leading-snug pt-0.5">{mode === 'junior' ? char.lessons : missions.map((m, i) => m.speakers.includes(char.name) ? `0${i + 1} ${m.lessonName}` : '').filter(Boolean).join(' · ') || char.lessons}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-[#d8b568]/30 bg-[#0b1629] p-4 flex items-center gap-3">
        <FacelessSortingHat size={72} />
        <p className="text-xs text-[#cad6ea] leading-relaxed">
          <strong className="text-[#ffd880]">분류모자</strong>는 입학할 때 머리에 쓰면 “너는 이 기숙사!” 하고 정해 주는 마법 모자예요.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('enroll')}
        className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
      >
        별밤학교 입학하기 →
      </button>
    </div>
  );
};
