/** 행사 보상: 수업마다 룰렛 1장, 네 수업 후 분식 1장, 일곱 후 특별게임.
 * 추가 게임 보상과 추첨 쿠폰은 기존 확률을 보존하며 수량 제한을 두지 않습니다.
 * 실물 교환은 현장 운영자가 1.2초 확인하며 참가자 기록에 보관합니다.
 */
import { ParticipantState } from '../types';

export type TicketKind = 'roulette' | 'snack' | 'special' | 'prize' | 'badge';

export interface Ticket {
  id: string;
  kind: TicketKind; // snack = 네 수업 완료 후 확정 분식 이용권
  label: string;
  emoji: string;
  mission?: number; // 몇 번 수업에서 받았는지
  source?: string; // 'mission:3' | 'arcade:2:5' | 'roulette'
  createdAt: string;
  used: boolean;
  usedAt?: string;
  prizeId?: string; // 쿠폰 종류
}

export interface RewardState {
  tickets: Ticket[];
  grantedFor: number[]; // 보상을 이미 준 수업
  stageGranted?: string[]; // 보상 판정을 이미 한 미니게임 스테이지 ('게임:스테이지')
  spins?: { at: string; prizeId: string; name?: string; ticketId?: string; capped?: boolean }[];
}

export type PrizeKind = 'item' | 'again' | 'lose';
export interface Prize {
  id: string;
  name: string;
  emoji: string;
  weight: number; // 확률 비율
  kind: PrizeKind;
  color: string;
}

export interface RewardConfig {
  prizes: Prize[];
  missionItem: boolean; // 수업마다 랜덤 아이템
  specialOnAllClear: boolean;
  maxCoupons: number; // 한 사람이 받을 수 있는 실물 쿠폰 최대 수
  arcadeChance: number; // 미니게임 스테이지 클리어 시 아이템 확률 (0~1)
  arcadeMax: number; // 미니게임에서 받을 수 있는 아이템 최대 수
}

export const LOSE_SHARE = 0.05;

export const DEFAULT_PRIZES: Prize[] = [
  {
    "id": "tteok",
    "name": "떡볶이 1인분",
    "emoji": "🌶️",
    "weight": 8,
    "kind": "item",
    "color": "#ef4444"
  },
  {
    "id": "odeng",
    "name": "어묵 1인분",
    "emoji": "🍢",
    "weight": 13,
    "kind": "item",
    "color": "#f59e0b"
  },
  {
    "id": "sotteok",
    "name": "소떡소떡 1인분",
    "emoji": "🍡",
    "weight": 13,
    "kind": "item",
    "color": "#f97316"
  },
  {
    "id": "combo",
    "name": "떡볶이+어묵",
    "emoji": "🥢",
    "weight": 8,
    "kind": "item",
    "color": "#ec4899"
  },
  {
    "id": "choice",
    "name": "분식 선택권 1개",
    "emoji": "🎟️",
    "weight": 9,
    "kind": "item",
    "color": "#14b8a6"
  },
  {
    "id": "choice2",
    "name": "분식 선택권 2개",
    "emoji": "✌️",
    "weight": 6,
    "kind": "item",
    "color": "#0891b2"
  },
  {
    "id": "trio",
    "name": "분식 3종 세트",
    "emoji": "🍱",
    "weight": 5,
    "kind": "item",
    "color": "#a855f7"
  },
  {
    "id": "snack",
    "name": "작은 간식 1개",
    "emoji": "🍬",
    "weight": 10,
    "kind": "item",
    "color": "#22c55e"
  },
  {
    "id": "snack2",
    "name": "작은 간식 2개",
    "emoji": "🍭",
    "weight": 7,
    "kind": "item",
    "color": "#16a34a"
  },
  {
    "id": "teacher",
    "name": "선생님께 분식 요청",
    "emoji": "🙋",
    "weight": 3,
    "kind": "item",
    "color": "#6366f1"
  },
  {
    "id": "henna",
    "name": "헤나 이용권",
    "emoji": "🎨",
    "weight": 5,
    "kind": "item",
    "color": "#db2777"
  },
  {
    "id": "again",
    "name": "한 번 더!",
    "emoji": "🔁",
    "weight": 8,
    "kind": "again",
    "color": "#3b82f6"
  },
  {
    "id": "lose",
    "name": "꽝",
    "emoji": "💨",
    "weight": 5,
    "kind": "lose",
    "color": "#64748b"
  }
];

/** 쿠폰 이름 (교환권에 찍히는 말) */
const COUPON_LABEL: Record<string, string> = {
  henna: '헤나 이용권',
  sotteok: '소떡소떡 1인분 쿠폰',
  choice: '분식 선택권 1개',
  choice2: '분식 선택권 2개',
  trio: '떡볶이·어묵·소떡소떡 세트 쿠폰',
  snack2: '작은 간식 2개 쿠폰',
  teacher: '선생님께 분식 이용권 요청권',
  tteok: '떡볶이 1인분 쿠폰',
  odeng: '오뎅 1인분 쿠폰',
  combo: '떡볶이 + 오뎅 1인분씩 쿠폰',
  snack: '작은 간식 1개 쿠폰'
};

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  prizes: DEFAULT_PRIZES,
  missionItem: true,
  specialOnAllClear: true,
  maxCoupons: Number.POSITIVE_INFINITY,
  arcadeChance: 0.3,
  arcadeMax: Number.POSITIVE_INFINITY
};

/** 스테이지 랜덤 아이템 뽑기 칸 */
const ITEM_POOL: { kind: 'roulette' | 'prize'; prizeId?: string; weight: number }[] = [
  { kind: 'roulette', weight: 45 },
  { kind: 'prize', prizeId: 'snack', weight: 20 },
  { kind: 'prize', prizeId: 'tteok', weight: 10 },
  { kind: 'prize', prizeId: 'odeng', weight: 10 }
];

const CONFIG_KEY = 'jangwon-starlight-reward-config-v2';
const CATALOG_REVISION = 4;

const clampInt = (v: any, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : d);

export function loadRewardConfig(): RewardConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      let prizes: Prize[] = Array.isArray(p.prizes)
        ? p.prizes
            .filter((x: any) => x && typeof x.name === 'string' && x.name.trim())
            .map((x: any, i: number) => ({
              id: String(x.id || `p${i}`),
              name: String(x.name).slice(0, 20),
              emoji: String(x.emoji || '🎁').slice(0, 4),
              weight: Math.max(0, Math.min(1000, Number(x.weight) || 0)),
              kind: (['item', 'again', 'lose'].includes(x.kind) ? x.kind : 'item') as PrizeKind,
              color: typeof x.color === 'string' ? x.color : DEFAULT_PRIZES[i % DEFAULT_PRIZES.length].color
            }))
        : DEFAULT_PRIZES;
      if (p.catalogRevision !== CATALOG_REVISION) {
        const ids = new Set(prizes.map(x => x.id));
        prizes = [...prizes, ...DEFAULT_PRIZES.filter(x => !ids.has(x.id))];
      }
      return {
        prizes: prizes.length >= 2 && prizes.some(x => x.kind === 'lose') && prizes.some(x => x.kind !== 'lose' && x.weight > 0) ? prizes : DEFAULT_PRIZES,
        missionItem: p.missionItem !== false,
        specialOnAllClear: p.specialOnAllClear !== false,
        maxCoupons: Number.POSITIVE_INFINITY,
        arcadeChance: Math.max(0, Math.min(1, Number.isFinite(Number(p.arcadeChance)) ? Number(p.arcadeChance) : 0.3)),
        arcadeMax: Number.POSITIVE_INFINITY
      };
    }
  } catch {}
  return DEFAULT_REWARD_CONFIG;
}

export function saveRewardConfig(cfg: RewardConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...cfg, catalogRevision: CATALOG_REVISION })); } catch {}
}

const newId = () => {
  try { return crypto.randomUUID(); } catch { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
};

export const emptyRewards = (): RewardState => ({ tickets: [], grantedFor: [], stageGranted: [] });

export function sanitizeRewards(raw: any): RewardState {
  if (!raw || typeof raw !== 'object') return emptyRewards();
  const tickets: Ticket[] = Array.isArray(raw.tickets)
    ? raw.tickets
        .filter((t: any) => t && typeof t.id === 'string' && ['roulette', 'snack', 'special', 'prize', 'badge'].includes(t.kind))
        .map((t: any) => ({
          id: t.id, kind: t.kind, label: String(t.label || ''), emoji: String(t.emoji || '🎁'),
          mission: Number.isInteger(t.mission) ? t.mission : undefined,
          source: t.source ? String(t.source) : undefined,
          createdAt: String(t.createdAt || ''), used: !!t.used, usedAt: t.usedAt ? String(t.usedAt) : undefined,
          prizeId: t.prizeId ? String(t.prizeId) : undefined
        }))
    : [];
  const grantedFor = Array.isArray(raw.grantedFor) ? raw.grantedFor.filter((n: any) => Number.isInteger(n) && n >= 0 && n < 7) : [];
  const stageGranted = Array.isArray(raw.stageGranted) ? raw.stageGranted.filter((x: any) => typeof x === 'string') : [];
  const spins = Array.isArray(raw.spins) ? raw.spins.filter((s: any) => s && s.prizeId) : undefined;
  return { tickets, grantedFor: Array.from(new Set(grantedFor)), stageGranted, ...(spins ? { spins } : {}) };
}

/** 지금까지 받은 실물 쿠폰 수 (쓴 것 포함) */
export const couponCount = (r: RewardState) => r.tickets.filter(t => t.kind === 'prize').length;
export const couponsLeft = (r: RewardState, cfg: RewardConfig = loadRewardConfig()) => Number.POSITIVE_INFINITY;

const prizeInfo = (prizeId: string, cfg: RewardConfig) => {
  const p = cfg.prizes.find(x => x.id === prizeId) || DEFAULT_PRIZES.find(x => x.id === prizeId);
  return { label: COUPON_LABEL[prizeId] || `${p?.name || '상품'} 쿠폰`, emoji: p?.emoji || '🎁' };
};

function makeCoupon(prizeId: string, cfg: RewardConfig, extra: Partial<Ticket>): Ticket {
  const info = prizeInfo(prizeId, cfg);
  return { id: newId(), kind: 'prize', label: info.label, emoji: info.emoji, prizeId, createdAt: new Date().toISOString(), used: false, ...extra };
}
const makeBadge = (extra: Partial<Ticket>): Ticket => ({ id: newId(), kind: 'badge', label: '별빛 배지', emoji: '⭐', createdAt: new Date().toISOString(), used: false, ...extra });
const makeRoulette = (extra: Partial<Ticket>): Ticket => ({ id: newId(), kind: 'roulette', label: '룰렛 이용권', emoji: '🎡', createdAt: new Date().toISOString(), used: false, ...extra });

/** 랜덤 아이템 1개 (배지 없이 아이템만 지급) */
export function drawItem(r: RewardState, cfg: RewardConfig, extra: Partial<Ticket>, rng: () => number = Math.random): Ticket {
  const total = ITEM_POOL.reduce((a, x) => a + x.weight, 0);
  let x = rng() * total;
  let pick = ITEM_POOL[ITEM_POOL.length - 1];
  for (const it of ITEM_POOL) { x -= it.weight; if (x < 0) { pick = it; break; } }
  if (pick.kind === 'roulette') return makeRoulette(extra);
  return makeCoupon(pick.prizeId || 'snack', cfg, extra);
}

/** 수업 보상 확정 지급. 이미 지급한 수업이면 그대로. */
export function grantForClear(rewards: RewardState | undefined, missionIndex: number, clearCount: number, cfg: RewardConfig = loadRewardConfig(), rng: () => number = Math.random): RewardState {
  const r = sanitizeRewards(rewards);
  if (!Number.isInteger(missionIndex) || missionIndex < 0 || missionIndex > 6) return r;
  const add: Ticket[] = r.tickets.some(t => t.source === `mission-badge:${missionIndex}`) ? [] : [makeBadge({mission:missionIndex,source:`mission-badge:${missionIndex}`})];
  if (r.grantedFor.includes(missionIndex)) return {...r,tickets:[...r.tickets,...add]};
  if (cfg.missionItem) add.push(makeRoulette({ mission: missionIndex, source: `mission:${missionIndex}` }));
  if (clearCount >= 4 && !r.tickets.some(t => t.kind === 'snack')) add.push({ id: newId(), kind: 'snack', label: '분식 이용권', emoji: '🥢', source: 'four-clear', createdAt: new Date().toISOString(), used: false });
  if (cfg.specialOnAllClear && clearCount >= 7 && !r.tickets.some(t => t.kind === 'special'))
    add.push({ id: newId(), kind: 'special', label: '특별 게임 이용권', emoji: '🎮', mission: missionIndex, source: 'all-clear', createdAt: new Date().toISOString(), used: false });
  return { ...r, tickets: [...r.tickets, ...add], grantedFor: [...r.grantedFor, missionIndex] };
}

/** 미니게임 탭 스테이지를 처음 깼을 때: 가끔 아이템 */
export function grantForStage(rewards: RewardState | undefined, gameKey: string, stage: number, cfg: RewardConfig = loadRewardConfig(), rng: () => number = Math.random): { rewards: RewardState; item: Ticket | null } {
  const r = sanitizeRewards(rewards);
  const id = `${gameKey}:${stage}`;
  if ((r.stageGranted || []).includes(id)) return { rewards: r, item: null };
  const marked = { ...r, stageGranted: [...(r.stageGranted || []), id] };
  if (rng() >= cfg.arcadeChance) return { rewards: marked, item: null };
  const item = drawItem(r, cfg, { source: `arcade:${id}` }, rng);
  return { rewards: { ...marked, tickets: [...marked.tickets, item] }, item };
}

/** 꽝 전체 합계는 정확히 5%. 나머지 항목은 설정 비율을 유지합니다. */
export function effectiveWeights(prizes: Prize[]): number[] {
  const w = prizes.map(p => Number.isFinite(p.weight) ? Math.max(0,p.weight) : 0);
  const loseIdx = prizes.map((p,i) => p.kind === 'lose' ? i : -1).filter(i => i >= 0);
  const other = prizes.reduce((sum,p,i) => sum + (p.kind !== 'lose' ? w[i] : 0),0);
  if (!loseIdx.length) return w;
  if (other <= 0) return prizes.map(p => p.kind === 'lose' ? 0 : 1);
  const loseSum = loseIdx.reduce((sum,i) => sum+w[i],0);
  const needed = other * LOSE_SHARE / (1-LOSE_SHARE);
  return w.map((v,i) => loseIdx.includes(i) ? (loseSum > 0 ? v/loseSum : 1/loseIdx.length)*needed : v);
}

/** 확률에 따라 룰렛 칸 고르기 */
export function pickPrize(prizes: Prize[], rng: () => number = Math.random): number {
  const w = effectiveWeights(prizes);
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let x = rng() * total;
  for (let i = 0; i < prizes.length; i++) { x -= w[i]; if (x < 0) return i; }
  return prizes.length - 1;
}

/** 룰렛 이용권 1장을 써서 결과 반영 (당첨 상품은 수량 제한 없이 지급) */
export function applySpin(rewards: RewardState, ticketId: string, prize: Prize, cfg: RewardConfig = loadRewardConfig()): { rewards: RewardState; issued: Ticket | null; capped: boolean } {
  const r = sanitizeRewards(rewards);
  const t = r.tickets.find(x => x.id === ticketId);
  if (!t || t.kind !== 'roulette' || t.used) return { rewards: r, issued: null, capped: false };
  const now = new Date().toISOString();
  const tickets = r.tickets.map(x => (x.id === ticketId ? { ...x, used: true, usedAt: now } : x));
  let issued: Ticket | null = null;
  let capped = false;
  if (prize.kind === 'item') {
    issued = makeCoupon(prize.id, cfg, { mission: t.mission, source: 'roulette' });
  } else if (prize.kind === 'again') issued = makeRoulette({ label: '룰렛 이용권 (한 번 더)', mission: t.mission, source: 'roulette' });
  return {
    rewards: { ...r, tickets: issued ? [...tickets, issued] : tickets, spins: [...(r.spins || []), { at: now, prizeId: prize.id, name: prize.name, ticketId, capped }] },
    issued,
    capped
  };
}

/** 선생님 확인: 쿠폰 사용 처리 */
export function redeemTicket(rewards: RewardState, ticketId: string): RewardState {
  const r = sanitizeRewards(rewards);
  return { ...r, tickets: r.tickets.map(t => (t.id === ticketId && !t.used && (t.kind === 'prize' || t.kind === 'snack') ? { ...t, used: true, usedAt: new Date().toISOString() } : t)) };
}

/**
 * 이미 마친 수업인데 보상을 못 받은 경우(보상 기능이 생기기 전에 마쳤거나 옛 버전) 빠진 아이템을 채워 줌.
 */
export function reconcileRewards(
  rewards: RewardState | undefined,
  completed: number[],
  records: Record<number, { completedAt?: string } | undefined> = {},
  cfg: RewardConfig = loadRewardConfig()
): RewardState {
  let r = sanitizeRewards(rewards);
  const done = Array.from(new Set(completed.filter(n => Number.isInteger(n) && n >= 0 && n < 7)));
  const order = [...done].sort((a, b) => String(records[a]?.completedAt || '').localeCompare(String(records[b]?.completedAt || '')) || a - b);
  const missing = order.filter(m => !r.grantedFor.includes(m));
  if (missing.length) {
    const already = done.length - missing.length;
    missing.forEach((m, k) => { r = grantForClear(r, m, already + k + 1, cfg); });
  }
  for (const mission of done) r = grantForClear(r, mission, done.length, cfg);
  if (done.length >= 7 && cfg.specialOnAllClear && !r.tickets.some(t => t.kind === 'special')) {
    r = { ...r, tickets: [...r.tickets, { id: newId(), kind: 'special', label: '특별 게임 이용권', emoji: '🎮', mission: order[order.length - 1], source: 'all-clear', createdAt: new Date().toISOString(), used: false }] };
  }
  if (done.length >= 4 && !r.tickets.some(t => t.kind === 'snack')) {
    r = { ...r, tickets: [...r.tickets, { id: newId(), kind: 'snack', label: '분식 이용권', emoji: '🥢', source: 'four-clear', createdAt: new Date().toISOString(), used: false }] };
  }
  return r;
}

export const unusedCount = (s: Pick<ParticipantState, 'rewards'>) => (s.rewards?.tickets || []).filter(t => !t.used && t.kind !== 'badge').length;
/** 특별 게임(트롤 보스전) 열림: 특별 게임 이용권이 있거나 일곱 수업을 모두 마쳤으면 */
export const hasSpecial = (s: Pick<ParticipantState, 'rewards'> & { completed?: number[] }) =>
  (s.rewards?.tickets || []).some(t => t.kind === 'special') || new Set(s.completed || []).size >= 7;
