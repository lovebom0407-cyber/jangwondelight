import React, { useEffect, useRef, useState } from 'react';
import { CharacterFull, CharacterFace } from './characterAssets';
import { fillName } from '../services/script';
import { useMasterMode } from '../services/masterMode';
import { sfx, useMusicOverride } from '../services/sound';
import {
  Aim, DUEL_MAX_LEVEL, DUEL_PLAYER_MAX, DuelSkill, DuelState, Opponent,
  duelLost, duelWon, foeMove, initialDuel, josa, needsAimDuel, playerMove, retryDuel, usesLeft
} from '../services/duel';

/**
 * 결투 클럽 대련 화면 (포켓몬식)
 *  기술 고르기 → (공격) 줄어드는 고리 조준 → 메시지 → 상대 차례 [⚡ 지금 피해!] → 반복
 *  지면 [다시 대련] → 상대가 조금 약해짐
 */
interface Props {
  opponent: Opponent;
  skills: DuelSkill[];
  playerName?: string;
  onWin: (tries: number) => void;
  onExit: () => void;
}

type Phase = 'intro' | 'choose' | 'aim' | 'message' | 'dodge' | 'won' | 'lost';
const AIM_MS = 1300;

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

export const DuelGame: React.FC<Props> = ({ opponent: o, skills, playerName, onWin, onExit }) => {
  const master = useMasterMode();
  const [st, setStRaw] = useState<DuelState>(() => initialDuel(o, 0));
  const stRef = useRef(st);
  const setSt = (v: DuelState) => { stRef.current = v; setStRaw(v); };
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<string[]>([fillName(`${o.name}: "${o.hello}"`, playerName)]);
  const [after, setAfter] = useState<null | 'foe' | 'won' | 'lost' | 'choose'>(null);
  const [fx, setFx] = useState<'none' | 'hitFoe' | 'hitMe'>('none');
  const [tries, setTries] = useState(1);
  const [pending, setPending] = useState<DuelSkill | null>(null);
  const [aimT, setAimT] = useState(0);
  const aimDone = useRef(false);
  const [armed, setArmed] = useState(false);
  const dodge = useRef<{ armed: boolean; hit: boolean; timers: any[] }>({ armed: false, hit: false, timers: [] });

  useEffect(() => { if (fx === 'none') return; const t = setTimeout(() => setFx('none'), 450); return () => clearTimeout(t); }, [fx]);
  useEffect(() => () => dodge.current.timers.forEach(clearTimeout), []);

  // 소리: 대결 배경음 + 상황별 효과음
  useMusicOverride('battle');
  useEffect(() => { if (fx === 'hitFoe') sfx('hit'); else if (fx === 'hitMe') sfx('hurt'); }, [fx]);
  useEffect(() => {
    if (phase === 'won') sfx('fanfare');
    else if (phase === 'lost') sfx('fail');
    else if (phase === 'aim') sfx('cast');
  }, [phase]);

  // 조준 고리
  useEffect(() => {
    if (phase !== 'aim') return;
    const t0 = performance.now();
    aimDone.current = false;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / AIM_MS);
      setAimT(t);
      if (t >= 1) { if (!aimDone.current) resolveAim('miss'); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const ring = 2.2 - 1.8 * aimT;
  const aimOf = (sc: number): Aim => (Math.abs(sc - 1) <= 0.14 ? 'perfect' : Math.abs(sc - 1) <= 0.38 ? 'good' : 'miss');
  const resolveAim = (a: Aim) => { if (aimDone.current || !pending) return; aimDone.current = true; cast(pending, a); };

  const cast = (sk: DuelSkill, a: Aim) => {
    const r = playerMove(stRef.current, o, sk, a);
    setSt(r.state);
    if (r.hitFoe) setFx('hitFoe');
    if (duelWon(r.state)) { setQueue([...r.messages, fillName(`${o.name}: "${o.bye}"`, playerName)]); setAfter('won'); }
    else { setQueue(r.messages); setAfter('foe'); }
    setPending(null);
    setPhase('message');
  };
  const choose = (sk: DuelSkill) => {
    if (usesLeft(stRef.current, sk) <= 0) return;
    if (needsAimDuel(sk)) { setPending(sk); setPhase('aim'); } else { sfx('sparkle'); cast(sk, 'good'); }
  };

  const finishFoe = (dodged: boolean) => {
    const r = foeMove(stRef.current, o, dodged);
    setSt(r.state);
    if (r.hitMe) setFx('hitMe');
    if (duelWon(r.state)) { setQueue([...r.messages, fillName(`${o.name}: "${o.bye}"`, playerName)]); setAfter('won'); }
    else if (duelLost(r.state)) { setQueue([...r.messages, '기운이 다 떨어졌어요…']); setAfter('lost'); }
    else { setQueue(r.messages.length ? r.messages : ['…']); setAfter('choose'); }
    setPhase('message');
  };
  const startFoe = () => {
    setPhase('dodge');
    setArmed(false);
    const d = dodge.current;
    d.timers.forEach(clearTimeout);
    d.armed = false; d.hit = false;
    const wait = 600 + Math.random() * 900;
    const win = 700 + stRef.current.level * 250;
    d.timers = [
      setTimeout(() => { d.armed = true; setArmed(true); }, wait),
      setTimeout(() => { d.armed = false; setArmed(false); finishFoe(d.hit); }, wait + win)
    ];
  };
  const tapDodge = () => {
    const d = dodge.current;
    if (d.armed && !d.hit) { d.hit = true; sfx('dodge'); d.armed = false; setArmed(false); d.timers.forEach(clearTimeout); finishFoe(true); }
  };

  const advance = () => {
    if (queue.length > 1) { setQueue(q => q.slice(1)); return; }
    setQueue([]);
    if (phase === 'intro' || after === 'choose' || after === null) { setAfter(null); setPhase('choose'); }
    else if (after === 'foe') { setAfter(null); startFoe(); }
    else if (after === 'won') setPhase('won');
    else if (after === 'lost') setPhase('lost');
  };
  const retry = () => {
    setSt(retryDuel(o, stRef.current));
    setTries(t => t + 1);
    setAfter(null);
    setQueue([fillName(`${o.name}: "좋아, 한 번 더! 이번엔 조금 살살 할게."`, playerName)]);
    setPhase('intro');
  };

  const low = st.hp <= 30;
  return (
    <div className="event-duel-stage fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#3b2a17] via-[#1f2a44] to-[#0b1426] select-none">
      <div className="relative flex-1 min-h-0">
        {/* 상대 */}
        <div className="absolute top-3 left-3 w-[56%] rounded-xl bg-[#fdf3dc] px-3 py-2 shadow-lg border-2 border-[#3a2c18] z-10">
          <div className="text-sm font-bold text-[#1d1408] flex items-center gap-1">
            {o.name} <span className="text-[11px] text-[#8a5d24]">· {o.title}</span>
            {st.charging && <span className="text-[11px] text-[#dc2626] animate-pulse">🌪️ 큰 기술!</span>}
            {st.foePower && <span className="text-[11px] text-[#dc2626]">💪</span>}
          </div>
          <Bar value={st.foe} max={st.foeMax} color="linear-gradient(90deg,#a78bfa,#6366f1)" label="기운" />
          {tries > 1 && <div className="text-[10px] font-bold text-[#7c3aed] mt-0.5">재대련 {tries}번째 · 살살 {'▼'.repeat(Math.min(DUEL_MAX_LEVEL, st.level))}</div>}
        </div>
        <div
          data-foe
          className={`absolute top-6 right-0 w-[48%] h-[54%] transition-all duration-500 ${fx === 'hitFoe' ? 'animate-battle-hit' : ''} ${phase === 'won' ? 'opacity-40 scale-90' : ''}`}
        >
          <CharacterFull speaker={o.name} height="100%" className="w-full" />
        </div>
        {/* 조준 */}
        {phase === 'aim' && pending && (
          <button type="button" onClick={() => resolveAim(aimOf(ring))} className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="absolute w-40 h-40 rounded-full border-4 border-dashed border-[#ffd880]/80" />
              <div className="absolute w-40 h-40 rounded-full border-[6px]" style={{ transform: `scale(${ring})`, borderColor: Math.abs(ring - 1) <= 0.14 ? '#4ade80' : '#f8fafc' }} />
              <span className="text-5xl">{pending.icon}</span>
            </div>
            <span className="mt-6 px-4 py-2 rounded-full bg-black/60 text-[#ffd880] font-bold text-lg">고리가 겹칠 때 톡!</span>
          </button>
        )}
        {/* 나 */}
        <div className={`absolute bottom-3 left-3 ${fx === 'hitMe' ? 'animate-battle-hit' : ''}`}>
          <CharacterFace speaker="해리" size={88} framed />
        </div>
        <div className="absolute bottom-4 right-3 left-[40%] rounded-xl bg-[#fdf3dc] px-3 py-2 shadow-lg border-2 border-[#3a2c18]">
          <div className="text-sm font-bold text-[#1d1408]">
            {(playerName || '나').trim()} {st.shield && '🪐'}{st.reflect && '🪞'}{st.dodgeNext && '🐱'}{st.buff && '♞'}
          </div>
          <Bar value={st.hp} max={DUEL_PLAYER_MAX} color="linear-gradient(90deg,#f59e0b,#fde68a)" label="내 기운" danger={low} />
        </div>
      </div>

      <div className="event-battle-actions px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border-4 border-[#3a2c18] bg-[#fffaf0] p-3 shadow-2xl min-h-[170px]">
          {phase === 'choose' && (
            <div className="space-y-2">
              <p className="text-base font-bold text-[#1d1408]">
                {st.charging ? '⚠️ 큰 기술이 와요! 방패·거울·고양이!' : low ? '기운이 약해! 회복할까?' : fillName('{nameA}, 어떤 기술을 쓸까?', playerName)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {skills.map(sk => {
                  const left = usesLeft(st, sk);
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      data-skill={sk.id}
                      disabled={left <= 0}
                      onClick={() => choose(sk)}
                      className="min-h-[58px] px-2 rounded-xl bg-gradient-to-b from-[#fff1c9] to-[#f1cf83] border-2 border-[#c7963d] text-[#20170a] flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-35 text-left"
                    >
                      <span className="text-2xl">{sk.icon}</span>
                      <span className="leading-tight">
                        <span className="block text-[14px] font-bold">{sk.name}</span>
                        <span className="block text-[10px] text-[#6b4a1a]">{sk.desc}{left < 99 ? ` · 남은 ${left}` : ''}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onExit} className="flex-1 min-h-[34px] rounded-lg text-xs font-bold text-[#6b4a1a] bg-[#f4e3bd] cursor-pointer">그만하기</button>
                {master && (
                  <button type="button" onClick={() => { setSt({ ...stRef.current, foe: 0 }); setQueue([]); setPhase('won'); }} className="flex-1 min-h-[34px] rounded-lg font-bold text-xs text-white bg-[#7c3aed] cursor-pointer">🧪 마스터: 바로 이기기</button>
                )}
              </div>
            </div>
          )}
          {phase === 'aim' && <p className="text-lg font-bold text-[#1d1408] text-center pt-10">🎯 조준 중…</p>}
          {phase === 'dodge' && (
            <button
              type="button"
              data-dodge={armed ? 'on' : 'wait'}
              onClick={tapDodge}
              className={`w-full min-h-[150px] rounded-2xl text-2xl font-extrabold transition-all cursor-pointer ${armed ? 'bg-[#ef4444] text-white scale-105 shadow-[0_0_30px_#ef4444]' : 'bg-[#3a2c18]/10 text-[#3a2c18]'}`}
            >
              {armed ? '⚡ 지금 피해! 톡!' : `${josa(o.name, '이', '가')} 주문을 준비해요… 준비!`}
            </button>
          )}
          {(phase === 'message' || phase === 'intro') && (
            <button type="button" onClick={advance} className="w-full text-left min-h-[140px] flex flex-col justify-between cursor-pointer">
              <p className="text-[18px] font-bold leading-snug text-[#1d1408]">{queue[0]}</p>
              <span className="self-end text-sm text-[#8a5d24] animate-pulse">▼ 눌러서 계속</span>
            </button>
          )}
          {phase === 'won' && (
            <div className="space-y-3 text-center" data-duel-won>
              <p className="text-xl font-extrabold text-[#1d1408]">🎉 {josa(o.name, '과', '와')}의 대련 승리!</p>
              <button type="button" onClick={() => onWin(tries)} className="w-full min-h-[54px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
                계속 →
              </button>
            </div>
          )}
          {phase === 'lost' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CharacterFace speaker={o.name} size={56} framed />
                <p className="text-[16px] font-bold text-[#1d1408] leading-snug">{fillName('좋은 대련이었어, {nameA}! 한 번 더 해 볼래?', playerName)}</p>
              </div>
              <button type="button" onClick={retry} className="w-full min-h-[56px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
                🔁 다시 대련! (상대가 살살 ▼)
              </button>
              <button type="button" onClick={onExit} className="w-full min-h-[40px] rounded-xl text-sm font-bold text-[#6b4a1a] bg-[#f4e3bd] cursor-pointer">대련장으로</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
