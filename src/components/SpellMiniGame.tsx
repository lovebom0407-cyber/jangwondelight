import React, { useEffect, useState } from 'react';
import { SPELLS } from '../services/battle';
import { fillName } from '../services/script';
import { CharacterFace } from './characterAssets';
import { CharacterName } from '../types';
import { useMasterMode } from '../services/masterMode';
import { GAME_COMPONENTS } from './ActionGames';
import { sfx } from '../services/sound';

/**
 * 마법 배우기 액션 미니게임 (수업마다 1개)
 * 준비 → 3·2·1 → 실시간 게임 → 성공(마법 획득) / 실패(다시! 더 쉽게)
 * 다시 할 때마다 difficulty가 올라가 게임이 느려지고 시간이 늘어나요 (영원히 못 하는 일은 없음).
 */
export interface GameCfg {
  title: string;
  teacher: CharacterName;
  hint: string;
  howTo: string;
}

export const MINI_GAMES: Record<number, GameCfg> = {
  0: { title: '별빛 화살 슈팅', teacher: '덤블도어', hint: '어둠 구름이 내려와요! 지팡이를 움직여 별빛 화살을 쏘자! 어둠 방울은 피하고!', howTo: '지팡이를 끌어 움직이면 화살 자동 발사! 구름 15개 맞히기' },
  1: { title: '날개 열쇠 추격전', teacher: '헤르미온느', hint: '날아다니는 열쇠 중 주황 고리 열쇠만 잡아야 해!', howTo: '주황 고리 🔑만 톡! 6번 잡기 (잡을수록 빨라져요)' },
  2: { title: '플러피 자장가 리듬', teacher: '스네이프', hint: '음표가 노란 선에 닿을 때 맞춰 눌러 플러피를 재워라.', howTo: '음표가 선에 닿을 때 아래 버튼 톡!' },
  3: { title: '깜깜 도서관 루모스', teacher: '헤르미온느', hint: '도서관이 깜깜해! 지팡이 불빛으로 파란 책을 찾아줘.', howTo: '손가락으로 비추고, 파란 📘 책 6권을 톡!' },
  4: { title: '마법 체스 돌격', teacher: '맥고나걸', hint: '바늘이 초록칸에 올 때 용기를 외쳐 기사를 움직여요!', howTo: '바늘이 초록칸에 있을 때 화면 톡! 5칸 전진' },
  5: { title: '변신 방울 대소동', teacher: '맥고나걸', hint: '위에 나온 모양으로 변신한 방울만 터뜨려요!', howTo: '목표 모양 방울만 톡! 10개 (목표가 바뀌어요)' },
  6: { title: '퀴디치! 황금 스니치', teacher: '해그리드', hint: '빗자루를 타고 황금 스니치를 잡아라! 블러저 조심!', howTo: '손가락으로 빗자루를 끌어 스니치 5번 잡기' }
};

interface Props {
  missionIndex: number;
  playerName?: string;
  onLearned: () => void;
}

type Phase = 'ready' | 'count' | 'play' | 'fail' | 'done';

export const SpellMiniGame: React.FC<Props> = ({ missionIndex, playerName, onLearned }) => {
  const cfg = MINI_GAMES[missionIndex] || MINI_GAMES[0];
  const Game = GAME_COMPONENTS[missionIndex] || GAME_COMPONENTS[0];
  const spell = SPELLS.find(s => s.missionIndex === missionIndex) || SPELLS[0];
  const master = useMasterMode();
  const [phase, setPhase] = useState<Phase>('ready');
  const [tries, setTries] = useState(0);
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (phase !== 'count') return;
    if (count <= 0) { sfx('go'); setPhase('play'); return; }
    sfx('beep');
    const t = setTimeout(() => setCount(c => c - 1), 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  const start = () => { setCount(3); setRound(r => r + 1); setPhase('count'); };
  const end = (ok: boolean) => {
    sfx(ok ? 'win' : 'fail');
    try { navigator.vibrate?.(ok ? [40, 60, 40] : 120); } catch {}
    if (ok) setTimeout(() => setPhase('done'), 400);
    else { setTries(t => t + 1); setPhase('fail'); }
  };
  const difficulty = Math.min(3, tries);

  const teacherBubble = (text: string) => (
    <div className="flex items-end gap-3">
      <CharacterFace speaker={cfg.teacher} size={64} framed />
      <div className="flex-1 rounded-2xl rounded-bl-sm bg-[#fdf3dc] text-[#2c1d0a] px-3 py-2 shadow">
        <div className="text-[11px] font-bold text-[#8a5d24]">마법 배우기 · {cfg.title}</div>
        <p className="text-[15px] font-medium leading-snug">{text}</p>
      </div>
    </div>
  );

  const masterBtn = master && phase !== 'done' && (
    <button type="button" onClick={() => setPhase('done')} className="w-full min-h-[46px] rounded-xl font-bold text-white bg-[#7c3aed] border-2 border-[#c4b5fd] cursor-pointer">
      🧪 마스터: 바로 배우기
    </button>
  );

  if (phase === 'done') {
    return (
      <div className="w-full rounded-3xl border-4 border-[#3a2c18] bg-[#fffaf0] p-5 text-center space-y-3 shadow-2xl animate-fade-in">
        <div className="text-6xl animate-bounce">{spell.icon}</div>
        <p className="text-sm font-bold text-[#8a5d24]">새 마법을 배웠다!</p>
        <p className="text-xl font-extrabold text-[#1d1408]">{fillName('{nameN}', playerName)} [{spell.name}]을 배웠다!</p>
        <p className="text-sm text-[#3a2814]">볼드모트를 만나면 이 마법을 쓸 수 있어요.</p>
        <button type="button" onClick={() => { sfx('sparkle'); onLearned(); }} className="w-full min-h-[56px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
          마법 책에 넣기 ✦
        </button>
      </div>
    );
  }

  if (phase === 'ready' || phase === 'fail') {
    const failText = fillName(
      tries >= 3 ? '{nameA}, 이번엔 아주 천천히 해 줄게. 할 수 있어!' : '아깝다! 이번엔 조금 더 쉽게 해 줄게. 다시 해 보자!',
      playerName
    );
    return (
      <div className="w-full space-y-3 animate-fade-in">
        {teacherBubble(phase === 'fail' ? failText : fillName(`{nameA}, ${cfg.hint}`, playerName))}
        <div className="rounded-3xl border-2 border-[#d8b568]/60 bg-gradient-to-b from-[#132a4d] to-[#060c18] p-5 text-center space-y-3">
          <div className="text-6xl">{phase === 'fail' ? '😮' : spell.icon}</div>
          <p className="text-lg font-extrabold text-[#ffd880]">{cfg.title}</p>
          <p className="text-[15px] text-white/90">{cfg.howTo}</p>
          {tries > 0 && <p className="text-sm text-[#a7f3d0]">도전 {tries + 1}번째 · 쉬워짐 {'▼'.repeat(difficulty)}</p>}
          <button
            type="button"
            onClick={start}
            className="w-full min-h-[60px] rounded-2xl font-extrabold text-xl text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_0_24px_rgba(255,206,105,0.5)] cursor-pointer active:scale-95"
          >
            {phase === 'fail' ? '🔁 다시! (더 쉽게)' : '▶ 시작!'}
          </button>
        </div>
        {masterBtn}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="text-center text-sm font-bold text-[#ffd880]">{cfg.title} · {cfg.howTo}</div>
      <div className="relative">
        {phase === 'play' ? (
          <Game key={round} difficulty={difficulty} onEnd={end} />
        ) : (
          <div className="relative w-full aspect-[3/4] max-h-[62dvh] mx-auto rounded-3xl border-2 border-[#d8b568]/60 bg-gradient-to-b from-[#132a4d] to-[#060c18] flex items-center justify-center">
            <span key={count} className="text-8xl font-extrabold text-[#ffd880] animate-ping-once">{count > 0 ? count : '시작!'}</span>
          </div>
        )}
      </div>
      {masterBtn}
    </div>
  );
};
