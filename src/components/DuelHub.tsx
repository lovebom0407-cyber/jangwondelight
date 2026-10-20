import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { ParticipantState } from '../types';
import { Ticket } from '../services/rewards';
import { CharacterFace } from './characterAssets';
import { DuelGame } from './DuelGame';
import { fillName } from '../services/script';
import { sfx } from '../services/sound';
import {
  EARNED_SKILLS, MAX_LOADOUT, OPPONENTS, STARTER_SKILLS, DuelSkill, josa, learnedDuelSkills, sanitizeLoadout, skillById
} from '../services/duel';

/**
 * 외전 1 · 결투 클럽 대련장
 * - 상대 7명 사다리(앞 사람을 이겨야 다음 상대), 이긴 상대와는 다시 대련 가능
 * - 이길 때마다 새 기술 획득 카드
 * - 기술 4개 고르기 (포켓몬처럼)
 */
interface Props {
  state: ParticipantState;
  onBack: () => void;
  onReplayStory: () => void;
  onSave: (beaten: number, loadout: string[]) => void;
  bonusItem?: Ticket | null;
}

export const DuelHub: React.FC<Props> = ({ state, onBack, onReplayStory, onSave, bonusItem }) => {
  const beaten = Math.min(7, state.arcade?.cleared?.ep1 || 0);
  const loadout = sanitizeLoadout(state.arcade?.duel?.loadout, beaten);
  const [fighting, setFighting] = useState<number | null>(null);
  const [newSkill, setNewSkill] = useState<DuelSkill | null>(null);
  const [editing, setEditing] = useState(false);
  const [replaced, setReplaced] = useState<string | null>(null);
  const owned = [...STARTER_SKILLS, ...learnedDuelSkills(beaten)];

  if (fighting !== null) {
    const o = OPPONENTS[fighting];
    return (
      <DuelGame
        key={fighting}
        opponent={o}
        skills={loadout.map(id => skillById(id)!).filter(Boolean)}
        playerName={state.name}
        onExit={() => setFighting(null)}
        onWin={() => {
          const first = fighting >= beaten;
          const nb = Math.max(beaten, fighting + 1);
          let lo = loadout;
          if (first) {
            const sk = EARNED_SKILLS[o.key];
            // 빈칸이 있으면 바로 장착, 꽉 찼으면 가장 오래된 기술(기본 공격·회복 제외) 대신 넣기
            if (!lo.includes(sk.id)) {
              if (lo.length < MAX_LOADOUT) lo = [...lo, sk.id];
              else {
                const out = lo.find(id => id !== 'star-arrow' && id !== 'brave-shout') || lo[lo.length - 1];
                lo = lo.map(id => (id === out ? sk.id : id));
                setReplaced(skillById(out)?.name || null);
              }
            }
            setNewSkill(sk);
            setTimeout(() => sfx('unlock'), 300);
          }
          onSave(nb, lo);
          setFighting(null);
        }}
      />
    );
  }

  const toggle = (id: string) => {
    let lo = loadout.includes(id) ? loadout.filter(x => x !== id) : [...loadout, id];
    if (lo.length > MAX_LOADOUT) lo = lo.slice(lo.length - MAX_LOADOUT);
    if (!lo.length) return;
    onSave(beaten, lo);
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> 미니게임 목록
      </button>
      <div className="text-center space-y-1">
        <div className="text-5xl">⚔️</div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">결투 클럽 대련 대회</h2>
        <p className="text-sm text-[#cbd5e1]">이길 때마다 상대의 비법 기술을 배워요!</p>
        <p className="text-sm font-bold text-[#ffd880]">🏆 {beaten} / 7 대련 승리</p>
        <button type="button" onClick={onReplayStory} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#c7d2fe] bg-[#1e1b4b] border border-[#a5b4fc]/60 cursor-pointer">📖 외전 이야기 다시 보기</button>
      </div>

      {/* 새 기술 획득 */}
      {newSkill && (
        <div data-new-skill={newSkill.id} className="rounded-3xl border-4 border-[#3a2c18] bg-[#fffaf0] p-5 text-center space-y-2 shadow-2xl animate-fade-in">
          <p className="text-sm font-bold text-[#8a5d24]">새 기술을 배웠다!</p>
          <div className="text-6xl animate-bounce">{newSkill.icon}</div>
          <p className="text-xl font-extrabold text-[#1d1408]">{fillName(`{nameN} [${newSkill.name}]${josa(newSkill.name, '을', '를').slice(newSkill.name.length)} 배웠다!`, state.name)}</p>
          <p className="text-sm text-[#3a2814]">{newSkill.desc}</p>
          <p className="text-xs text-[#6b4a1a]">{replaced ? `[${replaced}] 대신 기술 칸에 넣었어요. [기술 바꾸기]로 언제든 바꿀 수 있어요.` : '기술 칸에 바로 넣었어요.'}</p>
          {bonusItem && <p data-stage-item={bonusItem.kind} className="text-sm font-bold text-[#1e3a8a]">🎁 보너스 아이템: {bonusItem.emoji} {bonusItem.label}</p>}
          <button type="button" onClick={() => { setNewSkill(null); setReplaced(null); }} className="w-full min-h-[50px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">좋아! ✦</button>
        </div>
      )}

      {/* 내 기술 4개 */}
      <div className="rounded-2xl p-3 bg-[#0e1b2f] border-2 border-[#d8b568]/50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-[#ffd880]">🎒 내 기술 {loadout.length}/{MAX_LOADOUT}</p>
          <button type="button" data-edit-loadout onClick={() => setEditing(e => !e)} className="px-3 py-1 rounded-lg text-xs font-bold text-[#20170a] bg-[#f4d79a] cursor-pointer">{editing ? '다 골랐어요' : '기술 바꾸기'}</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_LOADOUT }).map((_, i) => {
            const sk = loadout[i] ? skillById(loadout[i]) : null;
            return (
              <div key={i} className={`rounded-xl p-1.5 text-center border-2 ${sk ? 'bg-[#fdf3dc] border-[#c7963d] text-[#1d1408]' : 'border-dashed border-[#334155] text-[#4b5d78]'}`}>
                <div className="text-2xl">{sk ? sk.icon : '＋'}</div>
                <div className="text-[10px] font-bold leading-tight">{sk ? sk.name : '빈칸'}</div>
              </div>
            );
          })}
        </div>
        {editing && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-[#9fb6d6]">톡 눌러서 넣고 빼요. 4개까지!</p>
            <div className="grid grid-cols-2 gap-2">
              {owned.map(sk => {
                const on = loadout.includes(sk.id);
                return (
                  <button key={sk.id} type="button" data-own={sk.id} onClick={() => toggle(sk.id)} className={`rounded-xl px-2 py-2 flex items-center gap-1.5 text-left border-2 cursor-pointer ${on ? 'bg-[#fde68a] border-[#f59e0b] text-[#1d1408]' : 'bg-[#0b1629] border-[#334155] text-[#cbd5e1]'}`}>
                    <span className="text-2xl">{sk.icon}</span>
                    <span className="leading-tight"><span className="block text-[13px] font-bold">{sk.name}</span><span className="block text-[10px] opacity-80">{sk.desc}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 대련 상대 */}
      <div className="space-y-2">
        {OPPONENTS.map((o, i) => {
          const done = i < beaten;
          const next = i === beaten;
          const locked = i > beaten;
          const sk = EARNED_SKILLS[o.key];
          return (
            <div
              key={o.key}
              data-opponent={o.key}
              className={`rounded-2xl p-3 flex items-center gap-3 border-2 ${done ? 'bg-[#0d1c31] border-[#4da87f]/60' : next ? 'bg-gradient-to-r from-[#172c4e] to-[#10213b] border-[#e4bb70] shadow-[0_0_18px_rgba(228,187,112,0.3)]' : 'bg-[#091322] border-[#22354f] opacity-70'}`}
            >
              <div className={locked ? 'grayscale opacity-50' : ''}><CharacterFace speaker={o.name} size={52} framed /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-[#e4bb70]">{i + 1}번째 · {o.title}</div>
                <div className="text-base font-bold text-[#f6ebd5]">{locked ? '???' : o.name}</div>
                <div className="text-[11px] text-[#9fb6d6]">보상 기술: {done ? `${sk.icon} ${sk.name}` : locked ? '???' : `${sk.icon} ?`}</div>
              </div>
              {locked ? (
                <Lock className="w-5 h-5 text-[#4b5d78]" />
              ) : (
                <button
                  type="button"
                  data-fight={o.key}
                  onClick={() => { setNewSkill(null); setReplaced(null); setEditing(false); setFighting(i); }}
                  className={`px-3 py-2 rounded-xl font-extrabold text-sm cursor-pointer ${next ? 'text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] animate-pulse' : 'text-[#d1fae5] bg-[#14532d]'}`}
                >
                  {next ? '대련하기 ⚔️' : '다시 대련'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {beaten >= 7 && (
        <p className="text-center text-sm font-bold text-[#a5b4fc]">🏆 {fillName('{nameN} 결투 클럽 우승자!', state.name)} 외전 2가 열렸어요.</p>
      )}
      <p className="text-center text-[11px] text-[#7f95b5]">{josa('대련', '은', '는')} 진짜 싸움이 아니라 마법 연습이에요. 시작과 끝에 인사!</p>
    </div>
  );
};
