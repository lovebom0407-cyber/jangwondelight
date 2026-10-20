import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CharacterFull, CharacterFace } from './characterAssets';
import { fillName } from '../services/script';
import { useMasterMode } from '../services/masterMode';
import { sfx, useMusicOverride } from '../services/sound';
import { loadCurrentParticipant } from '../services/storage';
import {
  Aim, BattleState, PLAYER_MAX, Spell, availableSpells, castSpell, foeTurn, initialBattle,
  isLost, isWon, needsAim, retryBattle, MAX_LEVEL
} from '../services/battle';

/**
 * 볼드모트 마법 대결 화면 — 막상막하 + 조준·피하기 + 재도전
 *  1) 마법 고르기 → 2) (공격 마법) 줄어드는 고리에 맞춰 탭 = 조준 → 3) 메시지
 *  4) 볼드모트 차례: "피해라!" 버튼이 켜질 때 탭하면 피해 감소 → 5) 메시지 → 반복
 *  빛 게이지 0 → 패배 화면 → [다시 도전] (볼드모트 약해짐)
 */
interface Props {
  playerName?: string;
  collected: number[];
  onWin: () => void;
}

type Phase = 'intro' | 'choose' | 'aim' | 'message' | 'dodge' | 'won' | 'lost';

const Bar: React.FC<{ value: number; max: number; color: string; label: string; danger?: boolean }> = ({ value, max, color, label, danger }) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-[11px] font-bold text-[#1d1408]">
      <span>{label}</span>
      <span className={danger ? 'text-[#dc2626]' : ''}>{Math.max(0, Math.round(value))}/{max}</span>
    </div>
    <div className="h-3 rounded-full bg-[#3a2c18]/30 overflow-hidden border border-[#3a2c18]/40">
      <div className={`h-full rounded-full transition-all duration-500 ${danger ? 'animate-pulse' : ''}`} style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  </div>
);

const AIM_MS = 1400;

export const BattleGame: React.FC<Props> = ({ playerName, collected, onWin }) => {
  const assistKey = useMemo(() => `jangwon-battle-assist-v1:${loadCurrentParticipant()?.participantId || playerName || 'guest'}`, []);
  const [initialLevel] = useState(() => { try { return Math.max(0, Math.min(MAX_LEVEL, Number(localStorage.getItem(assistKey)) || 0)); } catch { return 0; } });
  const spells = useMemo(() => availableSpells(collected), [collected]);
  const master = useMasterMode();
  const [st, setStRaw] = useState<BattleState>(() => initialBattle(initialLevel));
  const stRef = useRef<BattleState>(st);
  const setSt = (v: BattleState | ((p: BattleState) => BattleState)) => {
    const next = typeof v === 'function' ? (v as (p: BattleState) => BattleState)(stRef.current) : v;
    stRef.current = next;
    setStRaw(next);
  };
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<string[]>([fillName('볼드모트가 나타났다! {nameA}, 별빛 마법으로 어둠을 물리치자!', playerName)]);
  const [after, setAfter] = useState<null | 'foe' | 'won' | 'lost' | 'choose'>(null);
  const [fx, setFx] = useState<'none' | 'hitFoe' | 'hitMe'>('none');
  const [tries, setTries] = useState(initialLevel + 1);

  // 조준
  const [pending, setPending] = useState<Spell | null>(null);
  const [aimT, setAimT] = useState(0);
  const aimStart = useRef(0);
  const aimDone = useRef(false);

  // 피하기
  const [dodgeArmed, setDodgeArmed] = useState(false);
  const dodgeRef = useRef<{ armed: boolean; hit: boolean; timers: any[] }>({ armed: false, hit: false, timers: [] });

  useEffect(() => {
    if (fx === 'none') return;
    const t = setTimeout(() => setFx('none'), 500);
    return () => clearTimeout(t);
  }, [fx]);

  // 소리: 대결 배경음 + 상황별 효과음
  useMusicOverride('battle');
  useEffect(() => { if (fx === 'hitFoe') sfx('hit'); else if (fx === 'hitMe') sfx('hurt'); }, [fx]);
  useEffect(() => {
    if (phase === 'won') sfx('fanfare');
    else if (phase === 'lost') sfx('fail');
    else if (phase === 'aim') sfx('cast');
  }, [phase]);

  /* ---------- 조준 애니메이션 ---------- */
  useEffect(() => {
    if (phase !== 'aim') return;
    aimStart.current = performance.now();
    aimDone.current = false;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - aimStart.current) / AIM_MS);
      setAimT(t);
      if (t >= 1) {
        if (!aimDone.current) resolveAim('miss');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 고리 크기: 2.2배 → 0.4배, 목표는 1.0배
  const ringScale = 2.2 - 1.8 * aimT;
  const aimFromScale = (sc: number): Aim => {
    const d = Math.abs(sc - 1);
    if (d <= 0.14) return 'perfect';
    if (d <= 0.38) return 'good';
    return 'miss';
  };

  const resolveAim = (aim: Aim) => {
    if (aimDone.current || !pending) return;
    aimDone.current = true;
    doCast(pending, aim);
  };

  const doCast = (sp: Spell, aim: Aim) => {
    const r = castSpell(stRef.current, sp, aim);
    setSt(r.state);
    if (r.hitFoe) setFx('hitFoe');
    if (isWon(r.state)) {
      setQueue([...r.messages, '볼드모트: "으윽… 별빛이 너무 밝아!"', '볼드모트가 어둠 구름이 되어 멀리 날아갔어요!']);
      setAfter('won');
    } else {
      setQueue(r.messages);
      setAfter('foe');
    }
    setPending(null);
    setPhase('message');
  };

  const choose = (sp: Spell) => {
    if (needsAim(sp)) {
      setPending(sp);
      setPhase('aim');
    } else { sfx('sparkle'); doCast(sp, 'good'); }
  };

  /* ---------- 볼드모트 차례 + 피하기 ---------- */
  const startFoeTurn = () => {
    if (stRef.current.foeSleep > 0) {
      finishFoeTurn(false);
      return;
    }
    setPhase('dodge');
    setDodgeArmed(false);
    const d = dodgeRef.current;
    d.timers.forEach(clearTimeout);
    d.armed = false;
    d.hit = false;
    const wait = 700 + Math.random() * 900;
    const windowMs = 750 + stRef.current.level * 250; // 재도전할수록 피하기 쉬워짐
    d.timers = [
      setTimeout(() => { d.armed = true; setDodgeArmed(true); }, wait),
      setTimeout(() => { d.armed = false; setDodgeArmed(false); finishFoeTurn(d.hit); }, wait + windowMs)
    ];
  };

  const tapDodge = () => {
    const d = dodgeRef.current;
    if (d.armed && !d.hit) {
      d.hit = true;
      sfx('dodge');
      d.armed = false;
      setDodgeArmed(false);
      d.timers.forEach(clearTimeout);
      finishFoeTurn(true);
    }
  };

  const finishFoeTurn = (dodged: boolean) => {
    const r = foeTurn(stRef.current, dodged);
    setSt(r.state);
    if (r.hitMe) setFx('hitMe');
    if (isLost(r.state)) {
      try { localStorage.setItem(assistKey, String(Math.min(MAX_LEVEL, r.state.level + 1))); } catch {}
      setQueue([...r.messages, '빛 게이지가 모두 꺼졌어요…']);
      setAfter('lost');
    } else {
      setQueue(r.messages.length ? r.messages : ['…']);
      setAfter('choose');
    }
    setPhase('message');
  };

  useEffect(() => () => dodgeRef.current.timers.forEach(clearTimeout), []);

  /* ---------- 메시지 넘기기 ---------- */
  const advance = () => {
    if (queue.length > 1) {
      setQueue(q => q.slice(1));
      return;
    }
    setQueue([]);
    if (phase === 'intro' || after === 'choose' || after === null) {
      setAfter(null);
      setPhase('choose');
    } else if (after === 'foe') {
      setAfter(null);
      startFoeTurn();
    } else if (after === 'won') {
      setPhase('won');
    } else if (after === 'lost') {
      setPhase('lost');
    }
  };

  const retry = () => {
    const next = retryBattle(stRef.current);
    try { localStorage.setItem(assistKey, String(next.level)); } catch {}
    setSt(next);
    setTries(t => t + 1);
    setAfter(null);
    setQueue([fillName('다시 도전! 볼드모트도 많이 지쳤어. {nameA}, 이번엔 할 수 있어!', playerName)]);
    setPhase('intro');
  };

  const msg = queue[0];
  const lowLight = st.light <= 30;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[#2a1a45] via-[#162a4d] to-[#0b1426] select-none" onClick={e => e.stopPropagation()}>
      {/* 무대 */}
      <div className="relative flex-1 min-h-0">
        <div className={`absolute ${master ? 'top-10' : 'top-[max(0.75rem,env(safe-area-inset-top))]'} left-3 right-[42%] rounded-xl bg-[#fdf3dc] px-3 py-2 shadow-lg border-2 border-[#3a2c18]`}>
          <div className="text-sm font-bold text-[#1d1408] flex items-center gap-1">
            볼드모트 {st.foeSleep > 0 && '💤'} {st.charging && <span className="text-[#dc2626] animate-pulse">🌪️ 큰 공격 준비!</span>}
          </div>
          <Bar value={st.foe} max={st.foeMax} color="linear-gradient(90deg,#7c3aed,#c084fc)" label="어둠 게이지" />
          {tries > 1 && <div className="text-[10px] text-[#7c3aed] font-bold pt-0.5">도전 {tries}번째 · 볼드모트 약해짐 {'▼'.repeat(Math.min(MAX_LEVEL, st.level))}</div>}
        </div>
        <div
          className={`absolute top-6 right-0 w-[50%] h-[54%] transition-all duration-500 ${fx === 'hitFoe' ? 'animate-battle-hit' : ''} ${phase === 'won' ? 'opacity-0 scale-50 duration-1000' : ''}`}
          style={{ opacity: phase === 'won' ? 0 : 0.45 + 0.55 * (st.foe / st.foeMax) }}
        >
          <CharacterFull speaker="볼드모트" height="100%" className="w-full" />
        </div>

        {/* 조준 고리 */}
        {phase === 'aim' && pending && (
          <button
            type="button"
            onClick={() => resolveAim(aimFromScale(ringScale))}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="absolute w-40 h-40 rounded-full border-4 border-dashed border-[#ffd880]/80" />
              <div className="absolute w-40 h-40 rounded-full bg-[#ffd880]/15" />
              <div
                className="absolute w-40 h-40 rounded-full border-[6px]"
                style={{ transform: `scale(${ringScale})`, borderColor: Math.abs(ringScale - 1) <= 0.14 ? '#4ade80' : '#f8fafc' }}
              />
              <span className="text-5xl">{pending.icon}</span>
            </div>
            <span className="mt-6 px-4 py-2 rounded-full bg-black/60 text-[#ffd880] font-bold text-lg">고리가 겹칠 때 톡! 조준!</span>
          </button>
        )}

        <div className={`absolute bottom-3 left-3 flex items-end -space-x-3 ${fx === 'hitMe' ? 'animate-battle-hit' : ''}`}>
          <CharacterFace speaker="해리" size={92} framed />
          <CharacterFace speaker="헤드위그" size={60} framed />
        </div>
        <div className="absolute bottom-4 right-3 left-[44%] rounded-xl bg-[#fdf3dc] px-3 py-2 shadow-lg border-2 border-[#3a2c18]">
          <div className="text-sm font-bold text-[#1d1408]">{(playerName || '나').trim()} & 해리 {st.shield && '🪐'}</div>
          <Bar value={st.light} max={PLAYER_MAX} color="linear-gradient(90deg,#f59e0b,#fde68a)" label="빛 게이지" danger={lowLight} />
        </div>
      </div>

      {/* 아래 패널 */}
      <div className="event-battle-actions px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border-4 border-[#3a2c18] bg-[#fffaf0] p-3 shadow-2xl min-h-[160px]">
          {phase === 'choose' && (
            <div className="space-y-2">
              <p className="text-base font-bold text-[#1d1408]">
                {st.charging ? '⚠️ 큰 공격이 와요! 방패나 자장가가 좋아요!' : lowLight ? '빛이 약해! 용기의 외침으로 채울까?' : fillName('{nameA}, 어떤 마법을 쓸까?', playerName)}
              </p>
              {master && (
                <button type="button" onClick={() => { setSt(s => ({ ...s, foe: 0 })); setQueue([]); setPhase('won'); }} className="w-full min-h-[40px] rounded-xl font-bold text-white bg-[#7c3aed] cursor-pointer">
                  🧪 마스터: 바로 이기기
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {spells.map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    disabled={sp.kind === 'ultimate' && st.ultimateUsed}
                    onClick={() => choose(sp)}
                    className="min-h-[54px] px-2 rounded-xl bg-gradient-to-b from-[#fff1c9] to-[#f1cf83] border-2 border-[#c7963d] text-[#20170a] text-[15px] font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <span className="text-xl">{sp.icon}</span>
                    <span className="leading-tight text-left">{sp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'aim' && <p className="text-lg font-bold text-[#1d1408] text-center pt-10">🎯 조준 중…</p>}

          {phase === 'dodge' && (
            <button
              type="button"
              onClick={tapDodge}
              className={`w-full min-h-[140px] rounded-2xl text-2xl font-extrabold transition-all cursor-pointer ${
                dodgeArmed ? 'bg-[#ef4444] text-white scale-105 shadow-[0_0_30px_#ef4444]' : 'bg-[#3a2c18]/10 text-[#3a2c18]'
              }`}
            >
              {dodgeArmed ? '⚡ 지금 피해! 톡!' : '볼드모트가 주문을 외워요… 준비!'}
            </button>
          )}

          {phase === 'message' || phase === 'intro' ? (
            <button type="button" onClick={advance} className="w-full text-left min-h-[130px] flex flex-col justify-between cursor-pointer">
              <p className="text-[18px] font-bold leading-snug text-[#1d1408]">{msg}</p>
              <span className="self-end text-sm text-[#8a5d24] animate-pulse">▼ 눌러서 계속</span>
            </button>
          ) : null}

          {phase === 'won' && (
            <div className="space-y-3 text-center">
              <p className="text-xl font-extrabold text-[#1d1408]">🎉 볼드모트를 물리쳤어요!</p>
              <p className="text-base text-[#3a2814]">{fillName(tries > 1 ? '포기하지 않은 {nameA}, 정말 대단해!' : '{nameA}, 별빛 마법 최고야!', playerName)}</p>
              <button type="button" onClick={onWin} className="w-full min-h-[54px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
                이야기 계속하기 →
              </button>
            </div>
          )}

          {phase === 'lost' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CharacterFace speaker="덤블도어" size={60} framed />
                <p className="text-[16px] font-bold text-[#1d1408] leading-snug">
                  {fillName('괜찮아, {nameA}. 넘어져도 다시 일어서는 게 진짜 용기란다. 한 번 더 해 보자!', playerName)}
                </p>
              </div>
              <button type="button" onClick={retry} className="w-full min-h-[56px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
                🔁 다시 도전! (볼드모트 약해짐 ▼)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
