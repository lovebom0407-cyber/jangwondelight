import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ParticipantState } from '../../types';
import { fillName } from '../../services/script';
import {
  Prize, Ticket, applySpin, emptyRewards, hasSpecial, loadRewardConfig, pickPrize, redeemTicket
} from '../../services/rewards';
import { CharacterFace } from '../characterAssets';
import { useMasterMode } from '../../services/masterMode';
import { sfx } from '../../services/sound';

/**
 * 🎒 아이템 보관함 — 룰렛 이용권 / 쿠폰(떡볶이·오뎅·간식) / 별빛 배지 / 특별 게임 이용권
 *  - 룰렛: 실제로 돌아가는 원판. 결과는 돌리기 시작할 때 저장(새로고침으로 다시 돌리기 방지)
 *  - 교환권: 부스 선생님이 [꾹 눌러 사용 확인] → 사용 완료
 *  - 특별 게임: 일곱 수업을 다 마친 사람만 (트롤 보스전)
 */
interface Props {
  state: ParticipantState;
  onUpdateState: (partial: Partial<ParticipantState>) => void;
  onNavigate: (screen: any) => void;
  onShowToast: (msg: string) => void;
}

type View = { kind: 'list' } | { kind: 'spin'; ticketId: string };

export const RewardsScreen: React.FC<Props> = ({ state, onUpdateState, onNavigate, onShowToast }) => {
  const isJunior = state.experienceMode === 'junior';
  const [view, setView] = useState<View>({ kind: 'list' });
  const rewards = state.rewards || emptyRewards();
  const tickets = rewards.tickets;
  const unused = tickets.filter(t => !t.used && t.kind !== 'badge');
  const badges = tickets.filter(t => t.kind === 'badge').length;
  const used = tickets.filter(t => t.used && t.kind !== 'badge');
  const special = hasSpecial(state);

  if (view.kind === 'spin') {
    return (
      <RouletteView
        key={view.ticketId}
        state={state}
        ticketId={view.ticketId}
        onUpdateState={onUpdateState}
        onBack={() => setView({ kind: 'list' })}
        onSpinAgain={id => setView({ kind: 'spin', ticketId: id })}
      />
    );
  }

  const order: Record<string, number> = { roulette: 0, prize: 1, snack: 2, special: 3 };
  const sorted = [...unused].sort((a, b) => order[a.kind] - order[b.kind]);

  if (isJunior) {
    const spins = sorted.filter(t => t.kind === 'roulette');
    return <div className="junior-ui space-y-6 pb-28" data-experience="junior-gifts">
      <button type="button" className="junior-secondary" onClick={() => onNavigate('map')}>← 사진 미션으로</button>
      <h1>🎁 나의 선물</h1>
      {spins.length > 0 ? <button type="button" className="junior-main" onClick={() => setView({kind:'spin',ticketId:spins[0].id})}><span>🎡</span><b>룰렛 돌리기</b><small>{spins.length}번 돌릴 수 있어요</small></button> : <p className="junior-instruction">사진 미션을 하면<br/>룰렛을 돌릴 수 있어요!</p>}
      {sorted.filter(t => t.kind !== 'roulette').map(t => <TicketCard key={t.id} t={t} junior onSpin={()=>{}} onPlay={()=>onNavigate('arcade')} onRedeem={()=>{onUpdateState({rewards:redeemTicket(rewards,t.id)});sfx('coin');onShowToast(`${t.label} 사용 완료!`);}}/>)}
      <p className="junior-instruction">🍢 먹거리 선물은<br/>선생님께 보여 주세요.</p>
      <details className="junior-parent field-learning"><summary>보호자 · 선물과 사용 기록</summary><div className="field-learning-body"><p>⭐ 별빛 배지 {badges}개 · 아이템 보관 개수 제한 없음</p><p>네 미션을 마치면 분식 이용권, 일곱 미션을 마치면 특별게임 이용권을 받아요. 음식과 수량은 현장 안내를 따라요.</p><p>선생님이 1.2초 눌러 사용을 확인해요. 사용한 이용권은 {used.length}장이에요.</p><ul>{used.map(t=><li key={t.id}>{t.emoji} {t.label} · 사용 완료</li>)}</ul><p>룰렛 결과 기록 · {rewards.spins?.length || 0}회</p><ol>{[...(rewards.spins||[])].reverse().map((s,i)=><li key={`${s.at}-${i}`}>{s.name || s.prizeId}{s.capped?' → 이전 버전 배지 기록':''}</li>)}</ol></div></details>
    </div>;
  }

  return (
    <div className={`space-y-5 pb-28 animate-fade-in ${state.experienceMode === 'junior' ? 'junior-ui' : ''}`}>
      <button type="button" onClick={() => onNavigate('map')} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> 탐험 지도
      </button>
      <div className="flex items-end gap-3">
        <CharacterFace speaker="해그리드" size={64} framed />
        <div className="flex-1 rounded-2xl rounded-bl-sm bg-[#fdf3dc] text-[#2c1d0a] px-3 py-2 shadow">
          <div className="text-[11px] font-bold text-[#8a5d24]">해그리드의 아이템 보관함</div>
          <p className="text-[15px] font-medium leading-snug">
            {fillName(unused.length ? '{nameA}, 수업을 잘 마쳐서 받은 보물이야! 하나씩 열어 보렴.' : '{nameA}, 수업마다 룰렛 한 장, 네 수업을 마치면 분식 이용권을 줄게!', state.name)}
          </p>
        </div>
      </div>

      <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">🎒 아이템 보관함 <span className="text-base text-[#ffd880]">({unused.length}장)</span></h2>

      <div className="flex flex-wrap gap-2 text-xs">
        <span data-badges className="px-3 py-1.5 rounded-full bg-[#1e1b4b] border border-[#a5b4fc]/50 text-[#e0e7ff] font-bold">⭐ 별빛 배지 {badges}개 · 미션마다 자동 지급</span>
        <span className="px-3 py-1.5 rounded-full bg-[#451a03] border border-[#fdba74]/50 text-[#fed7aa] font-bold">🎟️ 아이템 보관 무제한</span>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-2xl p-5 bg-[#0c192d]/80 border border-[#485f83]/40 text-center text-sm text-[#a3b7d4]">
          수업마다 룰렛 1장 · 네 수업을 마치면 분식 이용권 · 일곱 수업을 마치면 특별게임 이용권을 받아요.
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(t => (
          <TicketCard
            key={t.id}
            t={t}
            onSpin={() => setView({ kind: 'spin', ticketId: t.id })}
            onPlay={() => onNavigate('arcade')}
            onRedeem={() => {
              onUpdateState({ rewards: redeemTicket(rewards, t.id) });
              sfx('coin');
              onShowToast(`${t.label} 사용 완료!`);
            }}
          />
        ))}
      </div>

      <p className="field-muted">분식 이용권과 상품 쿠폰은 현장 선생님께 보여 주세요. 교환하는 음식과 수량은 현장 안내를 따라요. 사용 확인은 되돌릴 수 없어요. 이용권 기록은 이 참가자의 기기에 보관됩니다.</p>
      {!!rewards.spins?.length && <details className="field-learning"><summary>룰렛 결과 기록 · {rewards.spins.length}회</summary><ol className="field-learning-body">{[...rewards.spins].reverse().map((s,i) => <li key={`${s.at}-${i}`}>{new Date(s.at).toLocaleTimeString('ko-KR', { timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit' })} · {s.name || loadRewardConfig().prizes.find(p => p.id === s.prizeId)?.name || s.prizeId}{s.capped ? ' → 이전 버전 배지 기록' : ''}</li>)}</ol></details>}

      {/* 특별 게임 (아직 없을 때 안내) */}
      {!special && <div className={`rounded-2xl p-4 border-2 ${special ? 'border-[#a3e635] bg-[#132a12]' : 'border-[#334155] bg-[#0b1426]'} space-y-2`}>
        <div className="flex items-center gap-2 font-bold text-[#f6ebd5]">
          <span className="text-2xl">{special ? '🎮' : '🔒'}</span> 특별 게임 · 트롤 보스전
        </div>
        <p className="text-sm text-[#cbd5e1]">
          {special ? '지하실에 트롤이 나타났어! 지팡이로 별빛 화살을 쏘아 물리치자.' : '일곱 수업을 모두 마친 사람만 열 수 있어요.'}
        </p>
        {special && (
          <button type="button" onClick={() => onNavigate('arcade')} className="w-full min-h-[52px] rounded-xl font-bold text-lg text-[#1a2e05] bg-gradient-to-r from-[#d9f99d] to-[#84cc16] cursor-pointer">
            🎮 미니게임 탭에서 하기
          </button>
        )}
      </div>}

      {used.length > 0 && (
        <details className="rounded-2xl p-4 bg-[#0c192d]/60 border border-[#485f83]/30 text-sm text-[#a3b7d4]">
          <summary className="cursor-pointer font-bold">사용한 이용권 {used.length}장</summary>
          <ul className="mt-2 space-y-1">
            {used.map(t => (
              <li key={t.id} className="flex justify-between gap-2">
                <span>{t.emoji} {t.label}</span>
                <span className="text-xs opacity-70">{t.usedAt ? new Date(t.usedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

/* ---------------- 이용권 카드 ---------------- */
const TicketCard: React.FC<{ t: Ticket; junior?: boolean; onSpin: () => void; onPlay: () => void; onRedeem: () => void }> = ({ t, junior, onSpin, onPlay, onRedeem }) => {
  const bg =
    t.kind === 'roulette' ? 'from-[#1e3a8a] to-[#312e81] border-[#93c5fd]'
    : t.kind === 'special' ? 'from-[#365314] to-[#1a2e05] border-[#a3e635]'
    : 'from-[#7c2d12] to-[#451a03] border-[#fdba74]';
  return (
    <div data-ticket={t.kind} className={`relative rounded-2xl p-4 bg-gradient-to-br ${bg} border-2 border-dashed text-white shadow-lg overflow-hidden`}>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#050b16]" />
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#050b16]" />
      <div className="flex items-center gap-3">
        <span className="text-5xl">{t.emoji}</span>
        <div className="flex-1">
          <div className="text-lg font-extrabold">{t.label}</div>
          <div className="text-xs opacity-80">
            {t.source === 'roulette' ? '룰렛 당첨' : t.source?.startsWith('arcade:') ? '미니게임 보상' : typeof t.mission === 'number' ? `0${t.mission + 1}번 수업 보상` : '보상'}
            {t.kind === 'prize' || t.kind === 'snack' ? ' · 부스 선생님께 보여 주세요' : ''}
          </div>
        </div>
      </div>
      <div className="mt-3">
        {t.kind === 'roulette' && (
          <button type="button" onClick={onSpin} className="w-full min-h-[52px] rounded-xl font-extrabold text-lg text-[#1e1b4b] bg-gradient-to-r from-[#fde68a] to-[#f59e0b] cursor-pointer active:scale-95">
            🎡 룰렛 돌리러 가기
          </button>
        )}
        {t.kind === 'special' && (
          <button type="button" onClick={onPlay} className="w-full min-h-[52px] rounded-xl font-extrabold text-lg text-[#1a2e05] bg-gradient-to-r from-[#d9f99d] to-[#84cc16] cursor-pointer">
            {junior ? '🎮 특별 게임 하기' : '🎮 미니게임 탭에서 하기'}
          </button>
        )}
        {(t.kind === 'prize' || t.kind === 'snack') && <HoldToConfirm onConfirm={onRedeem} />}
      </div>
    </div>
  );
};

/* 선생님 확인: 1.2초 꾹 누르기 */
const HoldToConfirm: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  const [p, setP] = useState(0);
  const timer = useRef<any>(null);
  const held = useRef(false);
  const start = () => {
    if (held.current) return;
    held.current = true;
    const t0 = performance.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const v = Math.min(1, (performance.now() - t0) / 1200);
      setP(v);
      if (v >= 1) { clearInterval(timer.current); setP(0); onConfirm(); }
    }, 30);
  };
  const stop = () => { held.current = false; clearInterval(timer.current); setP(0); };
  useEffect(() => () => clearInterval(timer.current), []);
  return (
    <button
      type="button"
      data-hold
      aria-label="선생님 확인: 1.2초 길게 눌러 사용 완료. 키보드는 Enter 또는 스페이스를 길게 누르세요."
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } }}
      onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') stop(); }}
      onBlur={stop}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={e => e.preventDefault()}
      className="relative w-full min-h-[48px] rounded-xl font-bold text-sm text-[#451a03] bg-[#fff7ed] overflow-hidden select-none touch-none cursor-pointer"
    >
      <span className="absolute inset-y-0 left-0 bg-[#fdba74]" style={{ width: `${p * 100}%` }} />
      <span className="relative">👩‍🏫 선생님 확인: 꾹 눌러서 사용 완료</span>
    </button>
  );
};

/* ---------------- 룰렛 ---------------- */
const RouletteView: React.FC<{
  state: ParticipantState;
  ticketId: string;
  onUpdateState: (p: Partial<ParticipantState>) => void;
  onBack: () => void;
  onSpinAgain: (id: string) => void;
}> = ({ state, ticketId, onUpdateState, onBack, onSpinAgain }) => {
  const isJunior = state.experienceMode === 'junior';
  const cfg = useMemo(() => loadRewardConfig(), []);
  const prizes = cfg.prizes;
  const seg = 360 / prizes.length;
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const spinLock = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const [result, setResult] = useState<{ prize: Prize; issued: Ticket | null; capped: boolean } | null>(null);
  const ticket = (state.rewards?.tickets || []).find(t => t.id === ticketId);
  const valid = !!ticket && ticket.kind === 'roulette' && !ticket.used;
  const master = useMasterMode();

  const spin = () => {
    if (spinLock.current || spinning || !valid || !state.rewards) return;
    spinLock.current = true;
    const idx = pickPrize(prizes);
    const prize = prizes[idx];
    // 결과를 먼저 저장 (중간에 나가도 이용권이 두 번 쓰이지 않도록)
    const r = applySpin(state.rewards, ticketId, prize, cfg);
    onUpdateState({ rewards: r.rewards });
    const center = idx * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const base = rot - (((rot % 360) + 360) % 360);
    setRot(base + 360 * 6 + ((360 - center) % 360) + jitter);
    setSpinning(true);
    // 딱딱딱… 점점 느려지는 룰렛 소리
    { const total = master ? 0.5 : 4.1; let tt = 0, gap = 0.045; while (tt < total - 0.25) { const at = tt; timers.current.push(setTimeout(() => sfx('tick'), at * 1000)); gap *= 1.085; tt += gap; } }
    timers.current.push(setTimeout(() => {
      setSpinning(false);
      setResult({ prize, issued: r.issued, capped: r.capped });
      sfx(prize.kind === 'item' ? 'fanfare' : prize.kind === 'again' ? 'sparkle' : 'fail');
      try { navigator.vibrate?.(prize.kind === 'lose' ? 80 : [40, 60, 40, 60, 120]); } catch {}
    }, master ? 600 : 4300));
  };

  const R = 140;
  const slice = (i: number) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    return `M150 150 L${150 + R * Math.cos(a0)} ${150 + R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${150 + R * Math.cos(a1)} ${150 + R * Math.sin(a1)} Z`;
  };

  return (
    <div className={`space-y-5 pb-28 animate-fade-in ${state.experienceMode === 'junior' ? 'junior-ui' : ''}`}>
      <button type="button" onClick={onBack} disabled={spinning} className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 cursor-pointer disabled:opacity-40">
        <ArrowLeft className="w-4 h-4" /> 보관함
      </button>
      <h2 className="font-serif text-2xl font-bold text-center text-[#f6ebd5]">🎡 별빛 룰렛</h2>
      <p className="text-center text-sm text-[#cbd5e1]">{fillName('{nameA}, 버튼을 눌러 룰렛을 돌려 봐!', state.name)}</p>
      {!isJunior && <p className="field-muted text-center">이용권 1장으로 한 번 돌려요. 결과는 돌리는 순간 저장되어, 새로 열어도 보관함의 결과 기록에서 확인할 수 있어요. 당첨된 상품은 아이템으로 받아요.</p>}

      <div className="relative w-full max-w-[340px] aspect-square mx-auto">
        {/* 바늘 */}
        <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-20 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-[#fde68a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        <svg
          viewBox="0 0 300 300"
          data-wheel
          className="w-full h-full drop-shadow-[0_0_30px_rgba(253,230,138,0.35)]"
          style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${master ? 0.5 : 4.2}s cubic-bezier(0.15, 0.7, 0.1, 1)` : 'none' }}
        >
          <circle cx="150" cy="150" r="148" fill="#3a2c18" />
          {prizes.map((p, i) => {
            const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
            const tx = 150 + R * 0.62 * Math.cos(mid);
            const ty = 150 + R * 0.62 * Math.sin(mid);
            return (
              <g key={p.id}>
                <path d={slice(i)} fill={p.color} stroke="#fdf3dc" strokeWidth="2" />
                <g transform={`translate(${tx} ${ty}) rotate(${(i + 0.5) * seg})`}>
                  <text textAnchor="middle" y="-4" fontSize="26">{p.emoji}</text>
                  <text textAnchor="middle" y="18" fontSize={p.name.length > 5 ? 11 : 14} fontWeight="800" fill="#fff">{i + 1}</text>
                </g>
              </g>
            );
          })}
          <circle cx="150" cy="150" r="24" fill="#fde68a" stroke="#3a2c18" strokeWidth="4" />
          <text x="150" y="158" textAnchor="middle" fontSize="22">⭐</text>
        </svg>
      </div>

      {!result && (
        <button
          type="button"
          onClick={spin}
          disabled={spinning || !valid}
          className="w-full min-h-[64px] rounded-2xl font-extrabold text-2xl text-[#1e1b4b] bg-gradient-to-r from-[#fde68a] via-[#fbbf24] to-[#f59e0b] shadow-[0_0_30px_rgba(251,191,36,0.5)] cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {spinning ? '빙글빙글…' : valid ? '돌려라! 🎡' : '이미 사용한 이용권이에요'}
        </button>
      )}

      {result && (
        <div className="rounded-3xl border-4 border-[#3a2c18] bg-[#fffaf0] p-5 text-center space-y-3 shadow-2xl animate-fade-in" data-result={result.prize.kind}>
          <div className="text-6xl animate-bounce">{result.prize.emoji}</div>
          <p className="text-2xl font-extrabold text-[#1d1408]">
            {result.prize.kind === 'item' ? `${result.prize.name} 당첨!` : result.prize.kind === 'again' ? '한 번 더 돌려요!' : '아쉬워요, 꽝!'}
          </p>
          <p className="text-sm text-[#3a2814]">
            {result.prize.kind === 'item'
              ? `보관함에 [${result.issued?.label || '쿠폰'}]이 들어갔어요. 분식 부스 선생님께 보여 주세요!`
              : result.prize.kind === 'again'
              ? '룰렛 이용권을 한 장 더 받았어요!'
              : fillName('괜찮아, {nameA}! 다음 수업을 마치면 또 돌릴 수 있어.', state.name)}
          </p>
          {result.prize.kind === 'again' && result.issued ? (
            <button type="button" onClick={() => { setResult(null); onSpinAgain(result.issued!.id); }} className="w-full min-h-[56px] rounded-2xl font-bold text-lg text-[#1e1b4b] bg-gradient-to-r from-[#fde68a] to-[#f59e0b] cursor-pointer">
              🎡 다시 돌리기
            </button>
          ) : (
            <button type="button" onClick={onBack} className="w-full min-h-[56px] rounded-2xl font-bold text-lg text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] cursor-pointer">
              보관함으로 ✦
            </button>
          )}
        </div>
      )}

      <details className="field-learning" open={!isJunior}><summary>{isJunior ? '어떤 선물이 나올까?' : '룰렛 항목 보기'}</summary><div className="p-3 grid grid-cols-2 gap-2 text-xs text-[#d8e5f3]" aria-label="룰렛 항목">
        {prizes.map((p,i) => <span key={p.id} className="p-3 rounded-xl bg-[#0c192d] border border-[#485f83]/40 leading-relaxed"><b>{i+1}. {p.emoji} {p.name}</b></span>)}
      </div><p className="field-muted text-center p-3">원판 번호는 위 목록과 같아요.</p></details>
    </div>
  );
};
