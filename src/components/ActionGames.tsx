import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../services/sound';

/**
 * 마법 배우기 액션 미니게임 7종 (실시간, 휴대폰 터치용)
 * 공통: 좌표는 게임판 기준 % (0~100). difficulty 0=처음, 올라갈수록 쉬워짐(느려지고 시간↑).
 * 끝나면 onEnd(성공 여부).
 */
export interface GameProps {
  difficulty: number;
  onEnd: (success: boolean) => void;
  /** 미니게임 탭 스테이지 1~10 (높을수록 어려움). 없으면 수업 모드 기본 난이도 */
  stage?: number;
}

/* ---------------- 공통 도구 ---------------- */
function useLoop(running: boolean, step: (dt: number, t: number) => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        elapsed += dt;
        stepRef.current(dt, elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

function useRerender() {
  const [, set] = useState(0);
  return useCallback(() => set(n => (n + 1) % 1000000), []);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
let uid = 1;

/** 스테이지(1~10) → 속도 배율 (1단계 0.8배 ~ 10단계 1.61배). 수업 모드는 1 */
export const stageSpeed = (stage?: number) => (stage ? 0.7 + (Math.max(1, Math.min(5, stage)) - 1) * 0.06 : 1);
/** 스테이지에 따라 1단계 값 → 10단계 값 사이를 고름. 수업 모드는 lesson 값 */
const byStage = (stage: number | undefined, lesson: number, s1: number, s10: number) =>
  stage ? Math.round(s1 + ((s10 - s1) * (stage - 1)) / 9) : lesson;

function pointFromEvent(e: React.PointerEvent, el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
}

const Hud: React.FC<{ score: number; goal: number; timeLeft: number; timeMax: number; label?: string }> = ({ score, goal, timeLeft, timeMax, label }) => (
  <div className="absolute top-2 left-2 right-2 z-20 flex items-center gap-2 pointer-events-none">
    <span className="px-2.5 py-1 rounded-full bg-black/60 text-[#ffd880] text-sm font-extrabold whitespace-nowrap">
      {label ?? '⭐'} {score} / {goal}
    </span>
    <div className="flex-1 h-3 rounded-full bg-black/50 overflow-hidden border border-white/20">
      <div
        className="h-full transition-[width] duration-200"
        style={{ width: `${Math.max(0, (timeLeft / timeMax) * 100)}%`, background: timeLeft / timeMax < 0.25 ? '#ef4444' : 'linear-gradient(90deg,#fde68a,#f59e0b)' }}
      />
    </div>
    <span className={`text-sm font-bold ${timeLeft < 6 ? 'text-[#fca5a5] animate-pulse' : 'text-white'}`}>{Math.ceil(timeLeft)}초</span>
  </div>
);

const Pop: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <span className="absolute -translate-x-1/2 -translate-y-1/2 text-xl font-extrabold text-[#fde68a] pointer-events-none animate-ping" style={{ left: `${x}%`, top: `${y}%` }}>
    {text}
  </span>
);

const Board: React.FC<{ children: React.ReactNode; boardRef?: React.Ref<HTMLDivElement>; className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ children, boardRef, className = '', ...rest }) => (
  <div
    ref={boardRef}
    data-board
    className={`relative w-full aspect-[3/4] max-h-[62dvh] mx-auto rounded-3xl border-2 border-[#d8b568]/60 overflow-hidden select-none touch-none ${className}`}
    {...rest}
  >
    {children}
  </div>
);

/* ======================================================================
 * 01 별빛 화살 — 지팡이 슈팅: 내려오는 어둠 구름을 톡 쏘아 맞히기
 * ==================================================================== */
export interface ShooterProps extends GameProps {
  mode?: 'clouds' | 'boss';
  onScore?: (score: number) => void;
}

/**
 * 지팡이 슈팅 엔진 (01 별빛 화살 / 특별 게임 트롤 보스전 공용)
 * - 손가락으로 지팡이를 끌면 전후좌우로 따라 움직임 (키보드 방향키·WASD도 가능)
 * - 별빛 화살은 자동으로 계속 발사, 화면을 톡 하면 그 자리로 이동
 * - 어둠 방울·돌에 맞으면 잠깐 멈춤(구름 모드) / 하트 감소(보스 모드)
 */
export const WandShooter: React.FC<ShooterProps> = ({ difficulty, onEnd, mode = 'clouds', onScore, stage }) => {
  const boss = mode === 'boss';
  const K = stageSpeed(stage);
  const goal = boss ? 1 : byStage(stage, 15, 10, 30);
  const timeMax = boss ? 60 + difficulty * 10 : (stage ? 26 + goal * 0.9 : 32) + difficulty * 6;
  const bossMax = Math.max(20, byStage(stage, 44, 30, 75) - difficulty * 7);
  const heartsMax = 3 + difficulty;
  const minY = boss ? 50 : 38;
  const board = useRef<HTMLDivElement>(null);
  const g = useRef({
    me: { x: 50, y: 86 },
    target: null as null | { x: number; y: number },
    keys: { l: 0, r: 0, u: 0, d: 0 },
    fire: 0,
    clouds: [] as { id: number; x: number; y: number; vy: number; ph: number; drop: number }[],
    bolts: [] as { id: number; x: number; y: number; vx: number; vy: number }[],
    foes: [] as { id: number; x: number; y: number; vx: number; vy: number; e: string }[],
    pops: [] as { id: number; x: number; y: number; t: number; txt: string }[],
    spawn: 0, score: 0, time: timeMax, over: false, stun: 0, inv: 0, hearts: heartsMax,
    troll: { x: 50, vx: 1, hp: bossMax, hit: 0, throwT: 1.5 }
  });
  const rr = useRerender();

  // 키보드 (컴퓨터에서 테스트할 때)
  useEffect(() => {
    const map: Record<string, 'l' | 'r' | 'u' | 'd'> = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd' };
    const down = (e: KeyboardEvent) => { const k = map[e.key]; if (k) { g.current.keys[k] = 1; g.current.target = null; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { const k = map[e.key]; if (k) g.current.keys[k] = 0; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    const me = s.me;

    // 1) 지팡이 이동 (속도 제한 → 미끄러지듯 따라옴)
    if (s.stun > 0) s.stun -= dt;
    else {
      const maxSp = 150;
      let vx = (s.keys.r - s.keys.l) * maxSp;
      let vy = (s.keys.d - s.keys.u) * maxSp;
      if (s.target && !vx && !vy) {
        const dx = s.target.x - me.x, dy = s.target.y - me.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.5) { const sp = Math.min(maxSp, d * 9); vx = (dx / d) * sp; vy = (dy / d) * sp; }
      }
      me.x = Math.min(92, Math.max(8, me.x + vx * dt));
      me.y = Math.min(94, Math.max(minY, me.y + vy * dt));
    }
    if (s.inv > 0) s.inv -= dt;

    // 2) 자동 발사
    s.fire -= dt;
    if (s.fire <= 0 && s.stun <= 0) {
      s.fire = 0.2;
      s.bolts.push({ id: uid++, x: me.x, y: me.y - 6, vx: 0, vy: -160 });
    }
    s.bolts.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });

    const hitMe = (x: number, y: number, r: number) => Math.hypot(x - me.x, (y - me.y) * 0.75) < r;
    const ouch = (txt: string) => {
      if (boss) {
        if (s.inv > 0) return;
        s.hearts -= 1; s.inv = 1.1; s.stun = 0.35;
      } else s.stun = 0.7;
      s.pops.push({ id: uid++, x: me.x, y: me.y - 8, t: 0.6, txt });
      sfx('bump');
      try { navigator.vibrate?.(60); } catch {}
    };

    if (!boss) {
      // 3a) 어둠 구름
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.3, 0.95 - t * 0.014) / K + difficulty * 0.18;
        // 가만히 있으면 못 맞히도록 대부분 지팡이에서 떨어진 곳에 나타남
        let cx = rnd(8, 92);
        if (Math.random() < 0.75) for (let k = 0; k < 6 && Math.abs(cx - me.x) < 22; k++) cx = rnd(8, 92);
        s.clouds.push({ id: uid++, x: cx, y: -5, vy: rnd(11, 17) * K * (1 - difficulty * 0.15) + t * 0.3, ph: rnd(0, 6), drop: rnd(0.8, 2.5) });
      }
      for (const c of s.clouds) {
        c.y += c.vy * dt;
        c.x += Math.sin(t * 2 + c.ph) * 9 * dt;
        c.drop -= dt;
        if (c.drop <= 0 && c.y > 5 && c.y < 60) {
          c.drop = rnd(2, 3.5) / K + difficulty;
          s.foes.push({ id: uid++, x: c.x, y: c.y + 4, vx: 0, vy: 30 * K * (1 - difficulty * 0.15), e: '💧' });
        }
        if (c.y < 100 && hitMe(c.x, c.y, 9)) { c.y = 999; ouch('앗! 구름에 부딪혔어'); }
      }
      for (const b of s.bolts) for (const c of s.clouds) {
        if (b.y > -50 && c.y < 200 && Math.hypot(b.x - c.x, (b.y - c.y) * 0.75) < 8 + difficulty) {
          s.pops.push({ id: uid++, x: c.x, y: Math.max(8, c.y), t: 0.5, txt: '💥' });
          c.y = 999; b.y = -999; s.score++; sfx('pop');
        }
      }
      s.clouds = s.clouds.filter(c => c.y < 105);
    } else {
      // 3b) 트롤 보스
      const tr = s.troll;
      const rage = tr.hp < bossMax * 0.4;
      tr.x += tr.vx * (rage ? 30 : 20) * K * (1 - difficulty * 0.12) * dt;
      if (tr.x < 15 || tr.x > 85) { tr.vx *= -1; tr.x = Math.min(85, Math.max(15, tr.x)); }
      if (tr.hit > 0) tr.hit -= dt;
      tr.throwT -= dt;
      if (tr.throwT <= 0) {
        tr.throwT = (rage ? 0.75 : 1.15) / K + difficulty * 0.25;
        const sp = 42 * K * (1 - difficulty * 0.12);
        const aims = rage ? [-0.25, 0, 0.25] : [0];
        const base = Math.atan2(me.y - 24, me.x - tr.x);
        for (const a of aims) s.foes.push({ id: uid++, x: tr.x, y: 24, vx: Math.cos(base + a) * sp, vy: Math.sin(base + a) * sp, e: '🪨' });
      }
      for (const b of s.bolts) {
        if (b.y > -50 && Math.abs(b.x - tr.x) < 11 && b.y < 29 && b.y > 12) {
          b.y = -999; tr.hp -= 1; tr.hit = 0.12; if (tr.hp % 3 === 0) sfx('hit');
          if (tr.hp % 5 === 0) s.pops.push({ id: uid++, x: tr.x + rnd(-6, 6), y: 20, t: 0.4, txt: '💥' });
        }
      }
      s.score = bossMax - tr.hp;
    }

    // 4) 적 탄환 (어둠 방울 / 돌)
    for (const f of s.foes) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (hitMe(f.x, f.y, 6)) { f.y = 999; ouch(boss ? '쿵! 돌에 맞았어' : '앗! 어둠 방울'); }
    }
    s.foes = s.foes.filter(f => f.y < 105 && f.y > -10 && f.x > -10 && f.x < 110);
    s.bolts = s.bolts.filter(b => b.y > -10);
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);

    onScore?.(s.score);
    if (boss ? s.troll.hp <= 0 : s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0 || (boss && s.hearts <= 0)) { s.over = true; onEnd(false); }
    rr();
  });

  const steer = (e: React.PointerEvent) => {
    if (!board.current) return;
    if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0) return;
    const p = pointFromEvent(e, board.current);
    // 손가락에 가리지 않게 지팡이를 손가락보다 조금 위에
    g.current.target = { x: p.x, y: p.y - (e.pointerType === 'mouse' ? 0 : 8) };
  };

  const s = g.current;
  return (
    <Board
      boardRef={board}
      onPointerDown={steer}
      onPointerMove={steer}
      className={boss ? 'bg-gradient-to-b from-[#2a1d12] via-[#1f2a1c] to-[#0b1426]' : 'bg-gradient-to-b from-[#1b1140] via-[#14284d] to-[#0b1426]'}
    >
      <Hud score={boss ? s.score : s.score} goal={boss ? bossMax : goal} timeLeft={s.time} timeMax={timeMax} label={boss ? '🧌' : '☁️'} />
      {boss && (
        <>
          <div className="absolute top-9 left-2 z-20 text-lg pointer-events-none">{'❤️'.repeat(Math.max(0, s.hearts))}{'🤍'.repeat(Math.max(0, heartsMax - s.hearts))}</div>
          <div className="absolute top-10 right-2 left-[45%] h-2.5 rounded-full bg-black/50 overflow-hidden pointer-events-none z-20">
            <div className="h-full bg-[#84cc16]" style={{ width: `${(s.troll.hp / bossMax) * 100}%` }} />
          </div>
          <span
            data-troll
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[64px] pointer-events-none"
            style={{ left: `${s.troll.x}%`, top: '21%', filter: s.troll.hit > 0 ? 'brightness(2.2)' : undefined }}
          >
            🧌
          </span>
        </>
      )}
      {s.clouds.map(c => (
        <span data-cloud key={c.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl pointer-events-none" style={{ left: `${c.x}%`, top: `${c.y}%`, filter: 'grayscale(1) brightness(0.45) drop-shadow(0 0 6px #7c3aed)' }}>☁️</span>
      ))}
      {s.foes.map(f => (
        <span key={f.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl pointer-events-none" style={{ left: `${f.x}%`, top: `${f.y}%`, filter: f.e === '💧' ? 'hue-rotate(220deg) brightness(0.7)' : undefined }}>{f.e}</span>
      ))}
      {s.bolts.map(b => (
        <span key={b.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>✨</span>
      ))}
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text={p.txt} />)}
      <span
        data-wand
        className={`absolute -translate-x-1/2 -translate-y-1/2 text-5xl pointer-events-none drop-shadow-[0_0_12px_#fde68a] ${s.stun > 0 ? 'animate-battle-hit' : ''}`}
        style={{ left: `${s.me.x}%`, top: `${s.me.y}%`, opacity: s.inv > 0 && Math.floor(s.inv * 10) % 2 ? 0.4 : 1 }}
      >
        🪄
      </span>
      <span className="absolute left-2 bottom-2 right-2 text-[11px] text-white/75 pointer-events-none">
        손가락으로 지팡이를 끌어 움직여요 · 별빛 화살은 자동 발사! {boss ? '돌을 피해요!' : '어둠 방울을 피해요!'}
      </span>
    </Board>
  );
};

/* ======================================================================
 * 02 토성 고리 방패 — 빗자루 열쇠 추격: 고리 달린 열쇠만 잡기 (잡을수록 빨라짐)
 * ==================================================================== */
export const KeyChase: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const goal = byStage(stage, 6, 4, 10);
  const decoys = byStage(stage, 7, 4, 12);
  const timeMax = (stage ? 18 + goal * 1.8 : 30) + difficulty * 6;
  const board = useRef<HTMLDivElement>(null);
  const mk = (target: boolean) => ({ id: uid++, x: rnd(15, 85), y: rnd(20, 85), vx: rnd(-1, 1), vy: rnd(-1, 1), target, turn: rnd(0.4, 1.2) });
  const g = useRef({ keys: [mk(true), ...Array.from({ length: decoys }, () => mk(false))], score: 0, time: timeMax, over: false, pops: [] as { id: number; x: number; y: number; t: number; txt: string }[], broom: { x: 50, y: 90 } });
  const rr = useRerender();

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    for (const k of s.keys) {
      const speed = k.target ? (34 + s.score * 6) * K * (1 - difficulty * 0.15) : 22 * K;
      k.turn -= dt;
      if (k.turn <= 0) {
        k.turn = k.target ? rnd(0.3, 0.8) : rnd(0.8, 1.6);
        const a = rnd(0, Math.PI * 2);
        k.vx = Math.cos(a); k.vy = Math.sin(a);
      }
      k.x += k.vx * speed * dt; k.y += k.vy * speed * dt;
      if (k.x < 6 || k.x > 94) { k.vx *= -1; k.x = Math.min(94, Math.max(6, k.x)); }
      if (k.y < 14 || k.y > 94) { k.vy *= -1; k.y = Math.min(94, Math.max(14, k.y)); }
    }
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0) { s.over = true; onEnd(false); }
    rr();
  });

  const tap = (e: React.PointerEvent) => {
    if (!board.current) return;
    const p = pointFromEvent(e, board.current);
    const s = g.current;
    s.broom = p;
    const tk = s.keys.find(k => k.target)!;
    if (Math.hypot(tk.x - p.x, (tk.y - p.y) * 0.75) < 10 + difficulty * 2) {
      s.score++; sfx('pop');
      s.pops.push({ id: uid++, x: tk.x, y: tk.y, t: 0.5, txt: '찰칵!' });
      Object.assign(tk, mk(true), { id: tk.id });
    } else {
      s.pops.push({ id: uid++, x: p.x, y: p.y, t: 0.35, txt: '휙' });
    }
  };

  const s = g.current;
  return (
    <Board boardRef={board} onPointerDown={tap} className="bg-gradient-to-b from-[#3b2a17] via-[#2a2140] to-[#141a33]">
      <Hud score={s.score} goal={goal} timeLeft={s.time} timeMax={timeMax} label="🔑" />
      {s.keys.map(k => (
        <span
          key={k.id}
          data-target={k.target ? '1' : undefined}
          className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center rounded-full ${k.target ? 'w-14 h-14 text-4xl ring-4 ring-[#f59e0b] bg-[#f59e0b]/25 shadow-[0_0_18px_#f59e0b]' : 'w-10 h-10 text-3xl opacity-80'}`}
          style={{ left: `${k.x}%`, top: `${k.y}%`, transform: `translate(-50%,-50%) rotate(${k.vx * 25}deg)` }}
        >
          {k.target ? '🔑' : '🗝️'}
        </span>
      ))}
      <span className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none transition-all duration-150" style={{ left: `${s.broom.x}%`, top: `${s.broom.y}%` }}>🧹</span>
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text={p.txt} />)}
      <span className="absolute left-2 bottom-2 text-[11px] text-white/70 pointer-events-none">주황 고리 열쇠만 톡! 잡을수록 빨라져요</span>
    </Board>
  );
};

/* ======================================================================
 * 03 플러피 자장가 — 리듬 게임: 떨어지는 음표를 선에 맞춰 탭
 * ==================================================================== */
export const FluffyRhythm: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const total = byStage(stage, 24, 16, 36);
  const goal = stage ? Math.max(8, Math.ceil(total * (0.55 + 0.03 * stage)) - difficulty * 3) : Math.max(10, 16 - difficulty * 3);
  const speed = 38 * K * (1 - difficulty * 0.15);
  const gap = Math.max(0.42, 0.75 / K) + difficulty * 0.15;
  const LINE = 80;
  const makeNotes = () => {
    let at = 1.2;
    return Array.from({ length: total }, () => {
      at += gap * rnd(0.75, 1.3);
      return { id: uid++, lane: Math.floor(Math.random() * 3), at, y: -10, state: 'wait' as 'wait' | 'hit' | 'miss' };
    });
  };
  const g = useRef({
    notes: makeNotes(),
    score: 0, miss: 0, combo: 0, over: false, flash: [0, 0, 0], judge: '' as string, judgeT: 0
  });
  const rr = useRerender();
  const timeMax = g.current.notes[total - 1].at + 3;
  const [t0, setT0] = useState(0);

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    setT0(t);
    for (const n of s.notes) {
      n.y = -10 + (t - n.at) * speed + 0;
      if (n.state === 'wait' && n.y > LINE + 12) { n.state = 'miss'; s.miss++; s.combo = 0; s.judge = '놓쳤어요'; s.judgeT = 0.5; }
    }
    s.flash = s.flash.map(f => Math.max(0, f - dt));
    s.judgeT -= dt;
    const done = s.notes.every(n => n.state !== 'wait');
    if (s.score >= goal && done) { s.over = true; onEnd(true); }
    else if (done) { s.over = true; onEnd(s.score >= goal); }
    rr();
  });

  const hitLane = (lane: number) => {
    const s = g.current;
    s.flash[lane] = 0.15;
    let best: (typeof s.notes)[number] | null = null;
    for (const n of s.notes) if (n.lane === lane && n.state === 'wait' && Math.abs(n.y - LINE) < 11) if (!best || Math.abs(n.y - LINE) < Math.abs(best.y - LINE)) best = n;
    if (best) {
      best.state = 'hit';
      s.score++; s.combo++; sfx('note');
      s.judge = Math.abs(best.y - LINE) < 4 ? `완벽! ${s.combo}콤보` : `좋아! ${s.combo}콤보`;
      s.judgeT = 0.5;
    }
  };

  const s = g.current;
  const sleep = Math.min(1, s.score / goal);
  return (
    <div className="space-y-2">
      <Board className="bg-gradient-to-b from-[#20143d] to-[#0b1426]">
        <Hud score={s.score} goal={goal} timeLeft={Math.max(0, timeMax - t0)} timeMax={timeMax} label="🎵" />
        <div className="absolute top-10 inset-x-0 text-center text-5xl pointer-events-none" style={{ filter: `brightness(${1 - sleep * 0.4})` }}>
          🐶🐶🐶 <span className="text-3xl">{'💤'.repeat(Math.round(sleep * 3))}</span>
        </div>
        {[0, 1, 2].map(l => (
          <div key={l} className="absolute top-0 bottom-0 border-x border-white/5" style={{ left: `${l * 33.33}%`, width: '33.33%', background: s.flash[l] > 0 ? 'rgba(253,230,138,0.18)' : undefined }} />
        ))}
        <div className="absolute inset-x-0 h-1 bg-[#fde68a] shadow-[0_0_12px_#fde68a]" style={{ top: `${LINE}%` }} />
        {s.notes.filter(n => n.state === 'wait' && n.y > -8).map(n => (
          <span data-note key={n.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none" style={{ left: `${16.66 + n.lane * 33.33}%`, top: `${n.y}%` }}>🎵</span>
        ))}
        {s.judgeT > 0 && <div className="absolute inset-x-0 text-center text-2xl font-extrabold text-[#fde68a] pointer-events-none" style={{ top: `${LINE - 14}%` }}>{s.judge}</div>}
      </Board>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(l => (
          <button key={l} data-lane-btn={l} type="button" onPointerDown={() => hitLane(l)} className="min-h-[72px] rounded-2xl text-3xl font-bold bg-gradient-to-b from-[#fff1c9] to-[#f1cf83] border-2 border-[#c7963d] active:scale-95 touch-none cursor-pointer">
            {['🎹', '🎶', '🎹'][l]}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ======================================================================
 * 04 루모스 — 깜깜한 도서관을 지팡이 불빛으로 비추며 숨은 책 찾기
 * ==================================================================== */
export const LumosSearch: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const goal = byStage(stage, 6, 4, 10);
  const timeMax = (stage ? 22 + goal * 2.4 : 32) + difficulty * 8;
  const R = (stage ? 21 - stage * 0.8 : 17) + difficulty * 3;
  const board = useRef<HTMLDivElement>(null);
  const g = useRef({
    books: Array.from({ length: goal }, () => ({ id: uid++, x: rnd(10, 90), y: rnd(18, 92), found: false, drift: rnd(0, 6) })),
    light: { x: 50, y: 60 }, score: 0, time: timeMax, over: false, pops: [] as { id: number; x: number; y: number; t: number }[]
  });
  const rr = useRerender();

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    // 책이 살짝 움직여요 (도서관 책이 날아다니는 느낌)
    s.books.forEach(b => { if (!b.found) { b.x += Math.sin(t * 0.9 + b.drift) * 3 * K * K * dt; b.y += Math.cos(t * 0.7 + b.drift) * 3 * K * K * dt; } });
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0) { s.over = true; onEnd(false); }
    rr();
  });

  const move = (e: React.PointerEvent) => {
    if (!board.current) return;
    g.current.light = pointFromEvent(e, board.current);
  };
  const down = (e: React.PointerEvent) => {
    if (!board.current) return;
    const p = pointFromEvent(e, board.current);
    const s = g.current;
    const lightBefore = s.light;
    s.light = p;
    const hit = s.books.find(b => !b.found && Math.hypot(b.x - p.x, (b.y - p.y) * 0.75) < 9 && Math.hypot(b.x - lightBefore.x, (b.y - lightBefore.y) * 0.75) < R + 10);
    if (hit) { hit.found = true; s.score++; sfx('pop'); s.pops.push({ id: uid++, x: hit.x, y: hit.y, t: 0.6 }); }
  };

  const s = g.current;
  return (
    <Board boardRef={board} onPointerMove={move} onPointerDown={down} className="bg-[#3b2a17]">
      {/* 책장 배경 */}
      <div className="absolute inset-0 grid grid-rows-6 opacity-70 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b-4 border-[#6b4423] text-2xl tracking-tighter overflow-hidden whitespace-nowrap leading-[2.4]">📕📗📙📒📕📗📙📒📕📗📙</div>
        ))}
      </div>
      {s.books.map(b => (
        <span key={b.id} data-book={b.found ? undefined : '1'} className={`absolute -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none ${b.found ? 'opacity-40' : 'drop-shadow-[0_0_10px_#fde68a]'}`} style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {b.found ? '✅' : '📘'}
        </span>
      ))}
      {/* 어둠 + 지팡이 불빛 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at ${s.light.x}% ${s.light.y}%, rgba(255,240,180,0.12) 0%, rgba(0,0,0,0) ${R * 0.7}%, rgba(4,6,14,0.96) ${R + 4}%)` }}
      />
      <span className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl pointer-events-none" style={{ left: `${s.light.x}%`, top: `${s.light.y + R * 0.6}%` }}>🪄</span>
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text="찾았다!" />)}
      <Hud score={s.score} goal={goal} timeLeft={s.time} timeMax={timeMax} label="📘" />
      <span className="absolute left-2 bottom-2 text-[11px] text-white/80 pointer-events-none">손가락으로 비추고, 파란 책을 톡!</span>
    </Board>
  );
};

/* ======================================================================
 * 05 용기의 외침 — 마법 체스: 바늘이 초록칸에 올 때 탭해서 기사를 전진
 * ==================================================================== */
export const ChessTiming: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const goal = 5;
  const timeMax = (stage ? 30 - stage : 26) + difficulty * 6;
  const g = useRef({ needle: 0, dir: 1, zone: { c: 50, w: (stage ? 30 - stage * 1.8 : 24) + difficulty * 6 }, score: 0, time: timeMax, over: false, msg: '', msgT: 0, enemy: 0 });
  const rr = useRerender();

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    const sp = (70 + s.score * 18) * K * (1 - difficulty * 0.15);
    s.needle += s.dir * sp * dt;
    if (s.needle > 100) { s.needle = 100; s.dir = -1; }
    if (s.needle < 0) { s.needle = 0; s.dir = 1; }
    s.msgT -= dt;
    if (s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0) { s.over = true; onEnd(false); }
    rr();
  });

  const tap = () => {
    const s = g.current;
    if (Math.abs(s.needle - s.zone.c) <= s.zone.w / 2) {
      s.score++; sfx('pop');
      s.msg = s.score >= goal ? '체크메이트!' : ['전진!', '좋아!', '용감해!', '거의 다 왔어!'][s.score % 4];
      s.zone = { c: rnd(20, 80), w: Math.max(stage && stage >= 7 ? 9 : 12, s.zone.w - 3) };
    } else {
      s.enemy = Math.min(3, s.enemy + 1);
      s.msg = '앗! 다시!';
    }
    s.msgT = 0.6;
  };

  const s = g.current;
  return (
    <Board className="bg-gradient-to-b from-[#1f2937] to-[#0b1426]" onPointerDown={tap}>
      <Hud score={s.score} goal={goal} timeLeft={s.time} timeMax={timeMax} label="♞" />
      {/* 체스판 */}
      <div className="absolute left-1/2 top-[14%] -translate-x-1/2 w-[78%] grid grid-cols-6 border-4 border-[#a16207] rounded-lg overflow-hidden pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center text-4xl ${i % 2 ? 'bg-[#d6b88a]' : 'bg-[#6b4423]'}`}>
            {i === s.score ? '♞' : i === 5 ? '♚' : ''}
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-[34%] -translate-x-1/2 text-center pointer-events-none">
        <div className="text-5xl">🦁</div>
        {s.msgT > 0 && <div className="text-2xl font-extrabold text-[#fde68a]">{s.msg}</div>}
      </div>
      {/* 타이밍 바 */}
      <div className="absolute left-[8%] right-[8%] top-[62%] h-12 rounded-full bg-black/50 border-2 border-white/30 overflow-hidden pointer-events-none">
        <div data-zone className="absolute top-0 bottom-0 bg-[#22c55e]/80" style={{ left: `${s.zone.c - s.zone.w / 2}%`, width: `${s.zone.w}%` }} />
        <div data-needle className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_white]" style={{ left: `calc(${s.needle}% - 4px)` }} />
      </div>
      <div className="absolute left-1/2 bottom-[5%] -translate-x-1/2 px-5 py-3 whitespace-nowrap rounded-2xl text-lg font-extrabold text-[#20170a] bg-gradient-to-b from-[#ffe79c] to-[#d6992d] pointer-events-none">
        📣 초록에서 톡! 용기!
      </div>
    </Board>
  );
};

/* ======================================================================
 * 06 변신 마법 — 떠오르는 방울 중 목표 모양만 빠르게 톡 (목표가 계속 바뀜)
 * ==================================================================== */
const SHAPES = ['🦋', '⭐', '🐰', '🌸', '🐸', '🍄'];
export const TransfigureMatch: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const goal = byStage(stage, 10, 8, 20);
  const timeMax = (stage ? 18 + goal * 1.4 : 30) + difficulty * 6;
  const board = useRef<HTMLDivElement>(null);
  const g = useRef({ bubbles: [] as { id: number; x: number; y: number; vy: number; e: string }[], target: '🦋', score: 0, time: timeMax, over: false, spawn: 0, pops: [] as { id: number; x: number; y: number; t: number; txt: string }[], since: 0 });
  const rr = useRerender();

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    s.spawn -= dt;
    s.since += dt;
    if (s.spawn <= 0) {
      s.spawn = 0.45 / K + difficulty * 0.12;
      // 목표가 너무 오래 안 나오면 꼭 하나 띄우기
      const forceTarget = s.since > 1.6 || Math.random() < 0.3;
      if (forceTarget) s.since = 0;
      const pool = SHAPES.filter(x => x !== s.target);
      s.bubbles.push({ id: uid++, x: rnd(10, 90), y: 108, vy: rnd(18, 30) * K * (1 - difficulty * 0.15), e: forceTarget ? s.target : pool[Math.floor(Math.random() * pool.length)] });
    }
    s.bubbles.forEach(b => (b.y -= b.vy * dt));
    s.bubbles = s.bubbles.filter(b => b.y > -10);
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0) { s.over = true; onEnd(false); }
    rr();
  });

  const tap = (e: React.PointerEvent) => {
    if (!board.current) return;
    const p = pointFromEvent(e, board.current);
    const s = g.current;
    const hit = s.bubbles.find(b => Math.hypot(b.x - p.x, (b.y - p.y) * 0.75) < 9 + difficulty);
    if (!hit) return;
    if (hit.e === s.target) {
      s.score++; sfx('pop');
      s.pops.push({ id: uid++, x: hit.x, y: hit.y, t: 0.5, txt: '펑!' });
      hit.y = -99;
      if (s.score % 2 === 0) s.target = SHAPES[(SHAPES.indexOf(s.target) + 1 + Math.floor(Math.random() * 4)) % SHAPES.length];
    } else {
      s.pops.push({ id: uid++, x: hit.x, y: hit.y, t: 0.4, txt: '아니야!' });
    }
  };

  const s = g.current;
  return (
    <Board boardRef={board} onPointerDown={tap} className="bg-gradient-to-b from-[#0f3d3a] via-[#14284d] to-[#1b1140]">
      <Hud score={s.score} goal={goal} timeLeft={s.time} timeMax={timeMax} label="🪄" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-[#fdf3dc] text-[#1d1408] font-extrabold text-lg pointer-events-none shadow-lg">
        <span data-target-e={s.target} className="text-3xl align-middle">{s.target}</span> 로 변신!
      </div>
      {s.bubbles.map(b => (
        <span key={b.id} data-e={b.e} className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center text-4xl pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {b.e}
        </span>
      ))}
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text={p.txt} />)}
    </Board>
  );
};

/* ======================================================================
 * 07 가족 마법 — 퀴디치! 빗자루를 끌어서 황금 스니치 잡기, 블러저 피하기
 * ==================================================================== */
export const QuidditchSnitch: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const goal = byStage(stage, 5, 3, 8);
  const timeMax = 40 + difficulty * 8;
  const board = useRef<HTMLDivElement>(null);
  const g = useRef({
    me: { x: 50, y: 80 }, aim: { x: 50, y: 80 }, stun: 0,
    snitch: { x: 50, y: 30, vx: 1, vy: 0, turn: 0, wing: 0 },
    bludgers: Array.from({ length: Math.max(1, (stage ? 1 + Math.floor(stage / 3) : 3) - difficulty) }, () => ({ id: uid++, x: rnd(10, 90), y: rnd(15, 50), vx: rnd(-1, 1), vy: rnd(0.3, 1) })),
    score: 0, time: timeMax, over: false, pops: [] as { id: number; x: number; y: number; t: number; txt: string }[]
  });
  const rr = useRerender();

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.time = timeMax - t;
    // 빗자루: 손가락 쪽으로 부드럽게 날아감
    if (s.stun <= 0) {
      const k = Math.min(1, dt * (5.5 + difficulty * .6));
      s.me.x += (s.aim.x - s.me.x) * k;
      s.me.y += (s.aim.y - s.me.y) * k;
    } else s.stun -= dt;
    // 스니치: 지그재그로 빠르게, 가까이 오면 도망
    const sn = s.snitch;
    sn.turn -= dt;
    sn.wing += dt * 30;
    const near = Math.hypot(sn.x - s.me.x, sn.y - s.me.y) < 22;
    if (sn.turn <= 0 || near) {
      sn.turn = rnd(0.25, 0.7);
      let a = rnd(0, Math.PI * 2);
      if (near) a = Math.atan2(sn.y - s.me.y, sn.x - s.me.x) + rnd(-0.9, 0.9);
      sn.vx = Math.cos(a); sn.vy = Math.sin(a);
    }
    const sp = (near ? 44 : 30) * K * (1 - difficulty * 0.15) + s.score * 4;
    sn.x += sn.vx * sp * dt; sn.y += sn.vy * sp * dt;
    if (sn.x < 6 || sn.x > 94) { sn.vx *= -1; sn.x = Math.min(94, Math.max(6, sn.x)); }
    if (sn.y < 12 || sn.y > 92) { sn.vy *= -1; sn.y = Math.min(92, Math.max(12, sn.y)); }
    // 블러저: 튕겨 다님
    for (const b of s.bludgers) {
      const bs = 26 * K * (1 - difficulty * 0.15);
      b.x += b.vx * bs * dt; b.y += b.vy * bs * dt;
      if (b.x < 5 || b.x > 95) b.vx *= -1;
      if (b.y < 12 || b.y > 95) b.vy *= -1;
      if (s.stun <= 0 && Math.hypot(b.x - s.me.x, b.y - s.me.y) < 7) {
        s.stun = 0.9; sfx('bump');
        s.pops.push({ id: uid++, x: s.me.x, y: s.me.y - 6, t: 0.6, txt: '쿵! 블러저!' });
        b.vx *= -1; b.vy *= -1;
      }
    }
    // 잡기
    if (Math.hypot(sn.x - s.me.x, sn.y - s.me.y) < 8 + difficulty * 2) {
      s.score++; sfx('win');
      s.pops.push({ id: uid++, x: sn.x, y: sn.y, t: 0.7, txt: '잡았다!' });
      sn.x = s.me.x > 50 ? rnd(8, 30) : rnd(70, 92);
      sn.y = rnd(15, 40);
    }
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.score >= goal) { s.over = true; onEnd(true); }
    else if (s.time <= 0) { s.over = true; onEnd(false); }
    rr();
  });

  const steer = (e: React.PointerEvent) => {
    if (!board.current) return;
    if (e.type === 'pointermove' && e.buttons === 0 && e.pointerType === 'mouse') return;
    g.current.aim = pointFromEvent(e, board.current);
  };

  const s = g.current;
  return (
    <Board boardRef={board} onPointerDown={steer} onPointerMove={steer} className="bg-gradient-to-b from-[#5b8fd6] via-[#3d6fb5] to-[#2f7a3b]">
      <Hud score={s.score} goal={goal} timeLeft={s.time} timeMax={timeMax} label="🟡" />
      {/* 골대 */}
      <div className="absolute bottom-0 inset-x-0 flex justify-around pointer-events-none text-3xl opacity-80">⭕⭕⭕</div>
      {s.bludgers.map(b => (
        <span key={b.id} className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1f2937] border-2 border-black shadow-[0_0_8px_black] pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }} />
      ))}
      <span data-snitch className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center" style={{ left: `${s.snitch.x}%`, top: `${s.snitch.y}%` }}>
        <span className="text-lg" style={{ transform: `scaleY(${0.5 + Math.abs(Math.sin(s.snitch.wing)) * 0.5})` }}>🪽</span>
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#fff7c2] to-[#d4a017] shadow-[0_0_12px_#fde047]" />
        <span className="text-lg -scale-x-100" style={{ transform: `scaleX(-1) scaleY(${0.5 + Math.abs(Math.sin(s.snitch.wing)) * 0.5})` }}>🪽</span>
      </span>
      <span className={`absolute -translate-x-1/2 -translate-y-1/2 text-5xl pointer-events-none ${s.stun > 0 ? 'animate-battle-hit opacity-70' : ''}`} style={{ left: `${s.me.x}%`, top: `${s.me.y}%` }}>
        🧹
      </span>
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text={p.txt} />)}
      <span className="absolute left-2 bottom-8 text-[11px] text-white/90 pointer-events-none">손가락으로 빗자루를 끌어 스니치를 잡아요! 검은 블러저 조심!</span>
    </Board>
  );
};

/* ======================================================================
 * 외전 1 노버트를 부탁해 — 가로 비행: 빗자루를 위아래로, 장애물 피해 천문탑까지
 * ==================================================================== */
export const NorbertFlight: React.FC<GameProps> = ({ difficulty, onEnd, stage }) => {
  const K = stageSpeed(stage);
  const duration = byStage(stage, 32, 26, 40) + difficulty * -2; // 비행 거리(초)
  const heartsMax = 3 + difficulty;
  const board = useRef<HTMLDivElement>(null);
  const g = useRef({
    me: { x: 20, y: 50 }, targetY: 50, keys: { u: 0, d: 0 },
    obs: [] as { id: number; x: number; y: number; vy: number; ph: number; e: string; r: number }[],
    beams: [] as { id: number; x: number; y0: number; h: number; w: number; t: number; on: boolean }[],
    stars: [] as { id: number; x: number; y: number }[],
    pops: [] as { id: number; x: number; y: number; t: number; txt: string }[],
    spawn: 1.2, beamT: 4, starT: 0.8, hearts: heartsMax, inv: 0, got: 0, prog: 0, over: false, scroll: 0
  });
  const rr = useRerender();

  useEffect(() => {
    const map: Record<string, 'u' | 'd'> = { ArrowUp: 'u', ArrowDown: 'd', w: 'u', s: 'd' };
    const down = (e: KeyboardEvent) => { const k = map[e.key]; if (k) { g.current.keys[k] = 1; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { const k = map[e.key]; if (k) g.current.keys[k] = 0; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useLoop(true, (dt, t) => {
    const s = g.current;
    if (s.over) return;
    s.prog = Math.min(1, t / duration);
    s.scroll += dt * 30 * K;
    const me = s.me;
    // 이동 (위아래 + 살짝 앞뒤)
    if (s.keys.u || s.keys.d) s.targetY = Math.min(90, Math.max(14, me.y + (s.keys.d - s.keys.u) * 30));
    const dy = s.targetY - me.y;
    me.y += Math.sign(dy) * Math.min(Math.abs(dy), 130 * dt);
    if (s.inv > 0) s.inv -= dt;
    const vx = 32 * K * (1 - difficulty * 0.12);
    // 장애물: 박쥐(위아래로 출렁), 먹구름(느린 큰 것)
    if (s.prog < 0.93) {
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = rnd(0.7, 1.3) / K + difficulty * 0.2;
        const bat = Math.random() < 0.6;
        s.obs.push({ id: uid++, x: 108, y: rnd(16, 88), vy: bat ? rnd(14, 26) : 0, ph: rnd(0, 6), e: bat ? '🦇' : '⛈️', r: bat ? 6 : 9 });
      }
      // 필치의 등불: 예고(깜빡임) 후 세로 빛기둥
      s.beamT -= dt;
      if (s.beamT <= 0 && (stage ?? 3) >= 2) {
        s.beamT = rnd(3.5, 5.5) / K + difficulty;
        const top = Math.random() < 0.5;
        s.beams.push({ id: uid++, x: 104, y0: top ? 10 : 48, h: 44, w: 14, t: 0, on: false });
      }
      s.starT -= dt;
      if (s.starT <= 0) { s.starT = rnd(0.6, 1.1); s.stars.push({ id: uid++, x: 108, y: rnd(16, 88) }); }
    }
    for (const o of s.obs) {
      o.x -= vx * (o.e === '⛈️' ? 0.7 : 1) * dt;
      if (o.vy) o.y = Math.min(90, Math.max(12, o.y + Math.sin(t * 3 + o.ph) * o.vy * dt));
    }
    for (const st of s.stars) st.x -= vx * dt;
    for (const b of s.beams) { b.t += dt; b.on = b.t > 1.0; b.x -= vx * 0.8 * dt; }
    s.beams = s.beams.filter(b => b.x > -15);
    const ouch = (txt: string) => {
      if (s.inv > 0) return;
      s.hearts -= 1; s.inv = 1.2;
      s.pops.push({ id: uid++, x: me.x + 6, y: me.y - 8, t: 0.7, txt });
      sfx('bump');
      try { navigator.vibrate?.(70); } catch {}
    };
    for (const o of s.obs) if (Math.hypot(o.x - me.x, (o.y - me.y) * 0.75) < o.r) { o.x = -50; ouch(o.e === '🦇' ? '앗! 박쥐!' : '우르릉!'); }
    for (const b of s.beams) if (b.on && Math.abs(b.x - me.x) < b.w / 2 + 3 && me.y > b.y0 && me.y < b.y0 + b.h) ouch('필치에게 들킬 뻔!');
    for (const st of s.stars) if (Math.hypot(st.x - me.x, (st.y - me.y) * 0.75) < 7) { st.x = -50; s.got++; sfx('note'); s.pops.push({ id: uid++, x: me.x + 4, y: me.y - 6, t: 0.4, txt: '⭐' }); }
    s.obs = s.obs.filter(o => o.x > -10);
    s.stars = s.stars.filter(x => x.x > -10);
    s.pops.forEach(p => (p.t -= dt));
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.hearts <= 0) { s.over = true; onEnd(false); }
    else if (s.prog >= 1) { s.over = true; onEnd(true); }
    rr();
  });

  const steer = (e: React.PointerEvent) => {
    if (!board.current) return;
    if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0) return;
    g.current.targetY = Math.min(90, Math.max(14, pointFromEvent(e, board.current).y));
  };

  const s = g.current;
  return (
    <Board boardRef={board} onPointerDown={steer} onPointerMove={steer} className="bg-gradient-to-b from-[#0b1035] via-[#1b1650] to-[#0b1426]">
      {/* 흐르는 별 배경 */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(#fde68a 1px, transparent 1.5px)', backgroundSize: '38px 46px', backgroundPosition: `${-s.scroll * 4}px 0` }} />
      <div className="absolute bottom-0 inset-x-0 h-[12%] pointer-events-none bg-[#0a0f1f]" style={{ clipPath: 'polygon(0 60%,8% 20%,12% 60%,20% 10%,26% 60%,40% 30%,48% 60%,60% 0,66% 60%,80% 25%,88% 60%,100% 15%,100% 100%,0 100%)' }} />
      {/* 진행 막대 + 하트 */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center gap-2 pointer-events-none">
        <span className="text-base">{'❤️'.repeat(Math.max(0, s.hearts))}{'🤍'.repeat(Math.max(0, heartsMax - s.hearts))}</span>
        <div className="relative flex-1 h-3 rounded-full bg-black/50 border border-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-[#a5b4fc] to-[#fde68a]" style={{ width: `${s.prog * 100}%` }} />
          <span className="absolute -top-2 text-base" style={{ left: `calc(${s.prog * 100}% - 8px)` }}>🧹</span>
          <span className="absolute -right-1 -top-2 text-base">🗼</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-black/60 text-[#ffd880] text-sm font-extrabold">⭐{s.got}</span>
      </div>
      {s.beams.map(b => (
        <div
          key={b.id}
          data-beam={b.on ? 'on' : 'warn'}
          className="absolute pointer-events-none rounded-xl"
          style={{
            left: `${b.x - b.w / 2}%`, width: `${b.w}%`, top: `${b.y0}%`, height: `${b.h}%`,
            background: b.on ? 'linear-gradient(180deg, rgba(253,224,71,0.85), rgba(253,224,71,0.25))' : undefined,
            border: b.on ? undefined : '2px dashed rgba(253,224,71,0.7)',
            opacity: b.on ? 1 : (Math.floor(b.t * 8) % 2 ? 0.9 : 0.3)
          }}
        >
          <span className="absolute left-1/2 -translate-x-1/2 top-1 text-2xl">🔦</span>
        </div>
      ))}
      {s.stars.map(st => <span key={st.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl pointer-events-none" style={{ left: `${st.x}%`, top: `${st.y}%` }}>⭐</span>)}
      {s.obs.map(o => <span key={o.id} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${o.x}%`, top: `${o.y}%`, fontSize: o.e === '⛈️' ? 44 : 32 }}>{o.e}</span>)}
      {s.prog > 0.9 && <span className="absolute right-[4%] top-[18%] text-[64px] pointer-events-none">🗼</span>}
      <span
        data-player
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-end"
        style={{ left: `${s.me.x}%`, top: `${s.me.y}%`, opacity: s.inv > 0 && Math.floor(s.inv * 10) % 2 ? 0.35 : 1 }}
      >
        <span className="text-4xl">🧹</span><span className="text-2xl -ml-3 -mb-1">📦</span><span className="text-xl -ml-2 -mb-3">🐉</span>
      </span>
      {s.pops.map(p => <Pop key={p.id} x={p.x} y={p.y} text={p.txt} />)}
      <span className="absolute left-2 bottom-2 right-2 text-[11px] text-white/80 pointer-events-none">손가락을 위아래로! 노란 점선 칸은 곧 필치의 등불이 켜져요 — 반대쪽으로!</span>
    </Board>
  );
};

export const GAME_COMPONENTS: Record<number, React.FC<GameProps>> = {
  0: WandShooter,
  1: KeyChase,
  2: FluffyRhythm,
  3: LumosSearch,
  4: ChessTiming,
  5: TransfigureMatch,
  6: QuidditchSnitch
};
