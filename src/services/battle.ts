/**
 * 볼드모트 마법 대결 (포켓몬식 턴제) — 막상막하 버전
 * - 아이가 배운 마법 = 기술. 공격 마법은 "조준 타이밍"(완벽/좋음/빗나감)에 따라 위력이 달라짐.
 * - 볼드모트 공격 때 "피하기" 버튼을 제때 누르면 피해가 줄어듦.
 * - 볼드모트는 4턴마다 큰 기술(어둠의 폭풍)을 예고 후 사용, 체력이 낮아지면 한 번 회복.
 * - 빛 게이지가 0이 되면 짐 → [다시 도전]. 다시 도전할 때마다 볼드모트가 약해짐(level 1..3).
 * - 표현은 유치원 눈높이: 다치지 않고 "어둠/빛 게이지"로만 표현.
 */
export type SpellKind = 'attack' | 'shield' | 'sleep' | 'heal' | 'chaos' | 'ultimate';

export interface Spell {
  id: string;
  missionIndex: number;
  name: string;
  icon: string;
  kind: SpellKind;
  line: string;
}

export const SPELLS: Spell[] = [
  { id: 'star-arrow', missionIndex: 0, name: '별빛 화살', icon: '✨', kind: 'attack', line: '반짝! 별빛 화살이 쏙 날아가요!' },
  { id: 'ring-shield', missionIndex: 1, name: '토성 고리 방패', icon: '🪐', kind: 'shield', line: '빙글빙글 고리 방패가 생겼어요!' },
  { id: 'lullaby', missionIndex: 2, name: '플러피 자장가', icon: '🎵', kind: 'sleep', line: '자장자장~ 볼드모트가 꾸벅꾸벅 졸아요!' },
  { id: 'lumos', missionIndex: 3, name: '루모스 빛 주문', icon: '💡', kind: 'attack', line: '루모스! 지팡이 끝이 환하게 빛나요!' },
  { id: 'brave-shout', missionIndex: 4, name: '용기의 외침', icon: '📣', kind: 'heal', line: '"나는 할 수 있어!" 빛 게이지가 차올라요!' },
  { id: 'transfigure', missionIndex: 5, name: '변신 마법', icon: '🦋', kind: 'chaos', line: '펑! 어둠 구름을 나비로 바꿔요!' },
  { id: 'family', missionIndex: 6, name: '다 함께 가족 마법', icon: '💖', kind: 'ultimate', line: '하나, 둘, 셋! 모두의 빛이 하나로 모여요!' }
];

export const BASIC_SPELL: Spell = { id: 'sparkle', missionIndex: -1, name: '반짝 빛', icon: '⭐', kind: 'attack', line: '반짝 빛을 쏘았어요!' };

export const PLAYER_MAX = 100;
export const BASE_FOE_MAX = 160;
export const MAX_LEVEL = 3;

/** 다시 도전할수록 볼드모트가 약해짐 (level 0 = 처음) */
export function foeMaxFor(level: number): number {
  const l = Math.max(0, Math.min(MAX_LEVEL, level));
  return Math.round(BASE_FOE_MAX * (1 - 0.18 * l));
}
const foeAtkScale = (level: number) => 1 - 0.2 * Math.max(0, Math.min(MAX_LEVEL, level));

export type Aim = 'perfect' | 'good' | 'miss';
export const AIM_MULT: Record<Aim, number> = { perfect: 1.6, good: 1.0, miss: 0.45 };

export interface BattleState {
  level: number;
  foeMax: number;
  foe: number;
  light: number;
  shield: boolean;
  foeSleep: number;
  ultimateUsed: boolean;
  foeHealed: boolean;
  turn: number;
  foeTurns: number;
  charging: boolean; // 다음 볼드모트 차례에 큰 기술
}

export const initialBattle = (level = 0): BattleState => ({
  level,
  foeMax: foeMaxFor(level),
  foe: foeMaxFor(level),
  light: PLAYER_MAX,
  shield: false,
  foeSleep: 0,
  ultimateUsed: false,
  foeHealed: false,
  turn: 0,
  foeTurns: 0,
  charging: false
});

export function availableSpells(collected: number[]): Spell[] {
  const set = new Set(collected);
  const list = SPELLS.filter(s => set.has(s.missionIndex));
  return list.length ? list : [BASIC_SPELL];
}

/** 조준 타이밍이 필요한 마법인지 */
export const needsAim = (s: Spell) => s.kind === 'attack' || s.kind === 'chaos' || s.kind === 'ultimate';

type Rng = () => number;
const roll = (rng: Rng, min: number, max: number) => Math.round(min + rng() * (max - min));

export interface TurnResult {
  state: BattleState;
  messages: string[];
  hitFoe: boolean;
  hitMe: boolean;
}

/** 아이 차례 */
export function castSpell(prev: BattleState, spell: Spell, aim: Aim = 'good', rng: Rng = Math.random): TurnResult {
  const s: BattleState = { ...prev, turn: prev.turn + 1 };
  const msgs = [spell.line];
  let dmg = 0;
  const mult = needsAim(spell) ? AIM_MULT[aim] : 1;
  switch (spell.kind) {
    case 'attack':
      dmg = roll(rng, 15, 21) * mult;
      break;
    case 'chaos':
      dmg = roll(rng, 8, 30) * mult;
      break;
    case 'ultimate':
      if (s.ultimateUsed) {
        msgs.splice(0, 1, '가족 마법은 한 번만 쓸 수 있어요. 대신 반짝 빛!');
        dmg = 12 * mult;
      } else {
        s.ultimateUsed = true;
        dmg = 38 * mult;
      }
      break;
    case 'shield':
      s.shield = true;
      dmg = 6;
      break;
    case 'sleep':
      s.foeSleep = 1;
      s.charging = false;
      dmg = 6;
      msgs.push('모으던 어둠도 흩어졌어요!');
      break;
    case 'heal':
      s.light = Math.min(PLAYER_MAX, s.light + 30);
      dmg = 5;
      break;
  }
  dmg = Math.round(dmg);
  if (needsAim(spell)) {
    if (aim === 'perfect') msgs.push('완벽한 조준! 효과가 굉장했다!');
    else if (aim === 'miss') msgs.push('앗, 조금 빗나갔어요!');
  }
  s.foe = Math.max(0, s.foe - dmg);
  if (dmg > 0) msgs.push(`어둠 게이지 -${dmg}`);

  // 볼드모트가 지치면 한 번 어둠을 모아 회복
  if (s.foe > 0 && !s.foeHealed && s.foe <= s.foeMax * 0.35) {
    s.foeHealed = true;
    const heal = Math.round(s.foeMax * (0.16 - 0.03 * s.level));
    s.foe = Math.min(s.foeMax, s.foe + heal);
    msgs.push(`볼드모트: "아직이다!" 어둠을 모아 +${heal} 회복했어요!`);
  }
  return { state: s, messages: msgs, hitFoe: dmg > 0, hitMe: false };
}

/** 볼드모트 차례. dodged = 피하기 버튼을 제때 눌렀는지 */
export function foeTurn(prev: BattleState, dodged = false, rng: Rng = Math.random): TurnResult {
  const s: BattleState = { ...prev };
  const msgs: string[] = [];
  if (s.foe <= 0) return { state: s, messages: msgs, hitFoe: false, hitMe: false };
  if (s.foeSleep > 0) {
    s.foeSleep -= 1;
    msgs.push('볼드모트는 쿨쿨 자고 있어요. 💤');
    return { state: s, messages: msgs, hitFoe: false, hitMe: false };
  }
  s.foeTurns += 1;
  const scale = foeAtkScale(s.level);
  let dmg: number;
  if (s.charging) {
    s.charging = false;
    msgs.push('볼드모트: "어둠의 폭풍이다!" 🌪️');
    dmg = roll(rng, 28, 34) * scale;
  } else {
    msgs.push(rng() < 0.5 ? '볼드모트: "어둠 구름이다!"' : '볼드모트: "별빛아, 꺼져라!"');
    dmg = roll(rng, 15, 22) * scale;
  }
  if (s.shield) {
    s.shield = false;
    msgs.push('토성 고리 방패가 막아 냈어요! 휴~');
    dmg = 0;
  } else if (dodged) {
    dmg = dmg * 0.45;
    msgs.push('휙! 잘 피했어요!');
  }
  dmg = Math.round(dmg);
  s.light = Math.max(0, s.light - dmg);
  if (dmg > 0) msgs.push(`빛 게이지 -${dmg}`);
  // 다음 차례 큰 기술 예고 (4번째마다)
  if (s.light > 0 && s.foeTurns % 4 === 3) {
    s.charging = true;
    msgs.push('볼드모트가 어둠을 모으고 있어요… 다음엔 큰 공격! (자장가나 방패를 써 봐!)');
  }
  return { state: s, messages: msgs, hitFoe: false, hitMe: dmg > 0 };
}

export const isWon = (s: BattleState) => s.foe <= 0;
export const isLost = (s: BattleState) => s.light <= 0 && s.foe > 0;

/** 재도전: 레벨을 올려 볼드모트를 약하게 */
export const retryBattle = (prev: BattleState): BattleState => initialBattle(Math.min(MAX_LEVEL, prev.level + 1));
