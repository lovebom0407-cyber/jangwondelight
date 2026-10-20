import React, { useMemo, useState } from 'react';
import { DEFAULT_REWARD_CONFIG, Prize, PrizeKind, RewardConfig, effectiveWeights, loadRewardConfig, saveRewardConfig } from '../../services/rewards';
import { listAllLocalParticipants } from '../../services/storage';

/** 운영실 · 보상/룰렛 설정 (이 기기에 저장) */
export const RewardSettingsPanel: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const [cfg, setCfg] = useState<RewardConfig>(() => loadRewardConfig());
  const total = cfg.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0) || 1;
  const eff = effectiveWeights(cfg.prizes);
  const effTotal = eff.reduce((a, b) => a + b, 0) || 1;

  const setPrize = (i: number, patch: Partial<Prize>) =>
    setCfg(c => ({ ...c, prizes: c.prizes.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));

  const stats = useMemo(() => {
    const out = { roulette: 0, rouletteUsed: 0, badge: 0, special: 0, prizes: {} as Record<string, { got: number; used: number }> };
    for (const p of listAllLocalParticipants()) {
      for (const t of p.rewards?.tickets || []) {
        if (t.kind === 'roulette') { out.roulette++; if (t.used) out.rouletteUsed++; }
        if (t.kind === 'badge') out.badge++;
        if (t.kind === 'special') out.special++;
        if (t.kind === 'prize' || t.kind === 'snack') {
          const k = t.label;
          out.prizes[k] = out.prizes[k] || { got: 0, used: 0 };
          out.prizes[k].got++;
          if (t.used) out.prizes[k].used++;
        }
      }
    }
    return out;
  }, []);

  const save = () => {
    if (cfg.prizes.length < 2 || !cfg.prizes.some(p => p.kind !== 'lose' && p.weight > 0) || !cfg.prizes.some(p => p.kind === 'lose')) {
      onShowToast('룰렛 칸은 2개 이상, 꽝과 비율이 양수인 당첨 항목이 있어야 해요.');
      return;
    }
    saveRewardConfig(cfg);
    onShowToast('보상 설정을 이 기기에 저장했어요.');
  };

  return (
    <div className="space-y-4 text-sm text-[#d8e4f5]">
      <div className="rounded-xl p-4 bg-[#0c192d]/80 border border-[#485f83]/40 space-y-2">
        <p className="font-bold text-[#ffd880]">지급 규칙</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cfg.missionItem} onChange={e => setCfg({ ...cfg, missionItem: e.target.checked })} />
          수업을 하나 마칠 때마다 룰렛 이용권 1장
        </label>
        <p>🎟️ 아이템·쿠폰 보관 개수 제한 없음 · 미션마다 별빛 배지 자동 지급</p>
        <label className="flex items-center gap-2 flex-wrap">
          🎮 미니게임 스테이지를 처음 깰 때 아이템 확률
          <input type="number" min={0} max={100} value={Math.round(cfg.arcadeChance * 100)} onChange={e => setCfg({ ...cfg, arcadeChance: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })} className="w-16 px-2 py-1 rounded bg-[#fff8e9] text-[#2c1e10]" />
          % · 획득 개수 제한 없음
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cfg.specialOnAllClear} onChange={e => setCfg({ ...cfg, specialOnAllClear: e.target.checked })} />
          일곱 수업을 모두 마치면 🎮 특별 게임 이용권(트롤 보스전 열림)
        </label>
        <p className="text-xs text-[#9fb6d6]">쿠폰은 분식 부스 선생님이 학생 휴대폰의 [선생님 확인] 버튼을 꾹 눌러 사용 처리합니다. 룰렛의 꽝 합계는 5%로 고정되고 나머지 항목은 입력한 비율대로 조정됩니다.</p>
      </div>

      <div className="rounded-xl p-4 bg-[#0c192d]/80 border border-[#485f83]/40 space-y-2">
        <p className="font-bold text-[#ffd880]">룰렛 칸 · 확률</p>
        {cfg.prizes.map((p, i) => (
          <div key={p.id} className="grid grid-cols-[42px_minmax(0,1fr)_48px] gap-2 items-center rounded-xl border border-[#37516b] p-3">
            <input value={p.emoji} onChange={e => setPrize(i, { emoji: e.target.value })} className="px-1 py-1.5 rounded bg-[#fff8e9] text-center text-[#2c1e10]" aria-label="그림" />
            <input value={p.name} maxLength={20} onChange={e => setPrize(i, { name: e.target.value })} className="px-2 py-1.5 rounded bg-[#fff8e9] text-[#2c1e10]" aria-label="이름" />
            <input type="number" min={0} value={p.weight} onChange={e => setPrize(i, { weight: Math.max(0, Number(e.target.value) || 0) })} className="px-1 py-1.5 rounded bg-[#fff8e9] text-[#2c1e10]" aria-label="확률 비율" />
            <select value={p.kind} onChange={e => setPrize(i, { kind: e.target.value as PrizeKind })} className="px-1 py-1.5 rounded bg-[#fff8e9] text-[#2c1e10] text-xs">
              <option value="item">상품</option>
              <option value="again">한 번 더</option>
              <option value="lose">꽝</option>
            </select>
            <button type="button" onClick={() => setCfg(c => ({ ...c, prizes: c.prizes.filter((_, k) => k !== i) }))} className="text-[#fca5a5] cursor-pointer" aria-label="삭제">✕</button>
            <div className="col-span-3 text-[11px] text-[#9fb6d6] -mt-1">실제 약 {Math.round((eff[i] / effTotal) * 100)}%{p.kind === 'lose' && Math.round((eff[i] / effTotal) * 100) !== Math.round((Math.max(0, p.weight) / total) * 100) ? ' (꽝 합계 5%로 조정)' : ''}</div>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setCfg(c => ({ ...c, prizes: [...c.prizes, { id: 'p' + Date.now().toString(36), name: '새 상품', emoji: '🎁', weight: 10, kind: 'item', color: ['#a855f7', '#ec4899', '#14b8a6'][c.prizes.length % 3] }] }))} className="px-3 py-2 rounded-lg bg-[#162a47] cursor-pointer">+ 칸 추가</button>
          <button type="button" onClick={() => setCfg(DEFAULT_REWARD_CONFIG)} className="px-3 py-2 rounded-lg bg-[#162a47] cursor-pointer">기본값으로</button>
        </div>
      </div>

      <button type="button" onClick={save} className="w-full min-h-[48px] rounded-xl font-bold text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] cursor-pointer">보상 설정 저장</button>

      <div className="rounded-xl p-4 bg-[#0c192d]/80 border border-[#485f83]/40 space-y-1">
        <p className="font-bold text-[#ffd880]">이 기기 보상 현황</p>
        <p>🎡 룰렛 이용권 {stats.roulette}장 (돌림 {stats.rouletteUsed})</p>
        <p>⭐ 별빛 배지 {stats.badge}개</p>
        <p>🎮 특별 게임 이용권 {stats.special}장</p>
        {Object.entries(stats.prizes).map(([k, v]) => <p key={k}>· {k}: {v.got}장 (사용 {v.used})</p>)}
      </div>
    </div>
  );
};
