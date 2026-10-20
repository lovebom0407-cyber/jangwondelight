/**
 * 외전 1 · 호그와트 결투 클럽 대련 (포켓몬식 턴제)
 * - 등장인물 7명과 차례로 대련. 이길 때마다 그 인물에게서 새 기술 1개를 배움.
 * - 기술은 4칸까지 골라 가져감(포켓몬처럼). 공격 기술은 고리 조준, 상대 공격은 [피해!] 타이밍.
 * - 지면 다시 도전할 때마다 상대가 약해짐(level 0..3).
 * - 유치원 눈높이: 다치지 않고 "기운 게이지"로만 표현, 대련이 끝나면 서로 인사.
 */
import { CharacterName } from '../types';

export type DuelSkillKind = 'attack' | 'shield' | 'heal' | 'buff' | 'reflect' | 'dodge' | 'ultimate';

export interface DuelSkill {
  id: string;
  name: string;
  icon: string;
  kind: DuelSkillKind;
  min: number; // 공격: 피해 최소 / 회복: 회복량
  max: number;
  once?: boolean; // 대련마다 한 번만
  uses?: number; // 대련마다 쓸 수 있는 횟수 (없으면 무제한)
  sure?: boolean; // 조준이 빗나가도 '좋음'으로 (헤르미온느)
  desc: string;
  line: string;
}

export const STARTER_SKILLS: DuelSkill[] = [
  { id: 'star-arrow', name: '별빛 화살', icon: '✨', kind: 'attack', min: 15, max: 21, desc: '기본 공격', line: '반짝! 별빛 화살!' },
  { id: 'ring-shield', name: '고리 방패', icon: '🪐', kind: 'shield', min: 0, max: 0, uses: 3, desc: '다음 공격을 막아요 (3번)', line: '빙글빙글 고리 방패!' },
  { id: 'brave-shout', name: '용기의 외침', icon: '📣', kind: 'heal', min: 28, max: 28, uses: 2, desc: '기운 +28 (2번)', line: '"나는 할 수 있어!" 기운이 솟아요!' }
];

/** 대련에서 이기면 배우는 기술 (상대 키 → 기술) */
export const EARNED_SKILLS: Record<string, DuelSkill> = {
  ron: { id: 'chess-plan', name: '체스 작전', icon: '♞', kind: 'buff', min: 5, max: 5, uses: 2, desc: '다음 공격 강하게 (2번)', line: '론의 체스 작전! 다음 공격이 세진다!' },
  hermione: { id: 'smart-spell', name: '척척 주문', icon: '📚', kind: 'attack', min: 19, max: 25, sure: true, desc: '빗나가지 않는 공격', line: '책에서 배운 정확한 주문!' },
  draco: { id: 'mirror', name: '반사 거울', icon: '🪞', kind: 'reflect', min: 0, max: 0, uses: 2, desc: '다음 공격을 되돌려요 (2번)', line: '반짝 거울이 공격을 튕겨 낼 준비!' },
  hagrid: { id: 'dragon-puff', name: '아기 용 콧김', icon: '🐉', kind: 'attack', min: 30, max: 38, once: true, desc: '강한 공격 (한 번)', line: '후우~ 아기 용 콧김이다!' },
  mcgonagall: { id: 'cat-form', name: '고양이 변신', icon: '🐱', kind: 'dodge', min: 10, max: 10, uses: 2, desc: '완전 회피 + 반격 (2번)', line: '야옹! 날쌘 고양이로 변신!' },
  snape: { id: 'potion', name: '반짝 물약', icon: '🧪', kind: 'heal', min: 45, max: 45, once: true, desc: '기운 +45 (한 번)', line: '꿀꺽! 반짝 물약으로 기운이 가득!' },
  dumbledore: { id: 'phoenix-song', name: '불사조 노래', icon: '🔥', kind: 'ultimate', min: 30, max: 30, once: true, desc: '기운 회복 + 큰 공격 (한 번)', line: '불사조의 노래가 울려 퍼져요!' }
};

export const ALL_DUEL_SKILLS: DuelSkill[] = [...STARTER_SKILLS, ...Object.values(EARNED_SKILLS)];
export const skillById = (id: string) => ALL_DUEL_SKILLS.find(s => s.id === id);

export interface Opponent {
  key: string; // EARNED_SKILLS 키
  name: CharacterName;
  title: string;
  hp: number;
  atk: [number, number];
  heals?: boolean;
  charges?: boolean; // 4번째마다 큰 기술 예고
  powerUp?: boolean; // 3번째마다 힘 모으기(다음 공격 1.5배)
  evade?: number; // 아이 공격을 피할 확률 (완벽 조준은 못 피함)
  attackNames: string[];
  bigName: string;
  hello: string;
  bye: string;
}

export const OPPONENTS: Opponent[] = [
  { key: 'ron', name: '론', title: '첫 대련', hp: 90, atk: [11, 16], attackNames: ['체스 말 돌진', '빗자루 휘익'], bigName: '퀸 체크메이트', charges: true, hello: '{nameA}, 나랑 첫 대련 하자! 살살 할게!', bye: '와, 너 진짜 잘한다! 내 체스 작전을 알려 줄게!' },
  { key: 'hermione', name: '헤르미온느', title: '똑똑한 대련', hp: 110, atk: [12, 17], heals: true, attackNames: ['책장 바람', '반짝 주문'], bigName: '도서관 폭풍', charges: true, hello: '규칙대로 정정당당하게! 준비됐니?', bye: '정말 훌륭했어! 빗나가지 않는 주문을 알려 줄게.' },
  { key: 'draco', name: '말포이', title: '라이벌 대련', hp: 145, atk: [16, 22], powerUp: true, attackNames: ['은빛 번개', '뱀 그림자'], bigName: '은빛 폭풍', charges: true, hello: '흥, 이번엔 내가 이길걸?', bye: '…인정할게. 넌 대단해. 내 거울 마법 가져가.' },
  { key: 'hagrid', name: '해그리드', title: '힘센 대련', hp: 165, atk: [18, 24], charges: true, attackNames: ['커다란 손바닥 바람', '호박 굴리기'], bigName: '아기 용 재채기', hello: '하하! 살살 해 주라, {nameA}!', bye: '허허, 힘이 장사구나! 아기 용 콧김을 써 보렴.' },
  { key: 'mcgonagall', name: '맥고나걸', title: '변신술 대련', hp: 165, atk: [16, 22], evade: 0.22, charges: true, attackNames: ['책상 변신', '날쌘 발톱 바람'], bigName: '변신술 폭풍', hello: '집중하세요. 빈틈을 보이면 피할 거예요.', bye: '훌륭해요. 고양이 변신을 허락하지요.' },
  { key: 'snape', name: '스네이프', title: '물약 대련', hp: 180, atk: [16, 23], heals: true, powerUp: true, charges: true, attackNames: ['보글보글 물약', '검은 망토 바람'], bigName: '가마솥 대폭발', hello: '…대충 할 생각이면 시작도 하지 마라.', bye: '…나쁘지 않군. 반짝 물약을 가져가라.' },
  { key: 'dumbledore', name: '덤블도어', title: '마지막 대련', hp: 195, atk: [17, 24], heals: true, evade: 0.15, charges: true, attackNames: ['별빛 지팡이', '레몬 사탕 회오리'], bigName: '은하수 물결', hello: '{nameA}, 네가 모은 모든 기술을 보여 주렴.', bye: '정말 멋졌단다. 불사조의 노래를 선물하마.' }
];

/** 받침에 따라 조사 고르기: josa('론','이','가') → '론이' */
export function josa(word: string, withF: string, without: string): string {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withF : without);
}

export const DUEL_PLAYER_MAX = 100;
export const DUEL_MAX_LEVEL = 3;
export const MAX_LOADOUT = 4;

export type Aim = 'perfect' | 'good' | 'miss';
const AIM_MULT: Record<Aim, number> = { perfect: 1.6, good: 1.0, miss: 0.45 };

export interface DuelState {
  level: number;
  foeMax: number;
  foe: number;
  hp: number;
  shield: boolean;
  buff: boolean;
  reflect: boolean;
  dodgeNext: boolean;
  used: string[];
  foeHealed: boolean;
  foeTurns: number;
  charging: boolean;
  foePower: boolean;
  turn: number;
}

const lv = (l: number) => Math.max(0, Math.min(DUEL_MAX_LEVEL, l));
export const foeMaxOf = (o: Opponent, level: number) => Math.round(o.hp * (1 - 0.15 * lv(level)));

export const initialDuel = (o: Opponent, level = 0): DuelState => ({
  level: lv(level), foeMax: foeMaxOf(o, level), foe: foeMaxOf(o, level), hp: DUEL_PLAYER_MAX,
  shield: false, buff: false, reflect: false, dodgeNext: false, used: [], foeHealed: false, foeTurns: 0, charging: false, foePower: false, turn: 0
});

/** 이번 대련에서 남은 사용 횟수 (무제한이면 99) */
export const usesLeft = (s: Pick<DuelState, 'used'>, sk: DuelSkill) => {
  const max = sk.once ? 1 : sk.uses ?? 99;
  return max - s.used.filter(x => x === sk.id).length;
};

export const needsAimDuel = (s: DuelSkill) => s.kind === 'attack' || s.kind === 'ultimate';

type Rng = () => number;
const roll = (rng: Rng, a: number, b: number) => Math.round(a + rng() * (b - a));

export interface DuelTurn { state: DuelState; messages: string[]; hitFoe: boolean; hitMe: boolean }

export function playerMove(prev: DuelState, o: Opponent, sk: DuelSkill, aim: Aim = 'good', rng: Rng = Math.random): DuelTurn {
  const s: DuelState = { ...prev, used: [...prev.used], turn: prev.turn + 1 };
  const msgs = [sk.line];
  if (usesLeft(prev, sk) <= 0) return { state: prev, messages: ['그 기술은 이번 대련에서 다 썼어요!'], hitFoe: false, hitMe: false };
  if (sk.once || sk.uses) s.used.push(sk.id);
  let dmg = 0;
  const a: Aim = sk.sure && aim === 'miss' ? 'good' : aim;
  switch (sk.kind) {
    case 'attack':
    case 'ultimate': {
      dmg = roll(rng, sk.min, sk.max) * AIM_MULT[a];
      if (sk.kind === 'ultimate') { s.hp = DUEL_PLAYER_MAX; msgs.push('기운이 가득 찼어요!'); }
      if (s.buff) { dmg *= 1.6; s.buff = false; msgs.push('체스 작전 성공! 힘이 쑥!'); }
      if (a === 'perfect') msgs.push('완벽한 조준!');
      else if (a === 'miss') msgs.push('앗, 조금 빗나갔어요.');
      if (o.evade && a !== 'perfect' && rng() < o.evade) { dmg = 0; msgs.push(`${o.name}: "어림없지!" 쏙 피했어요!`); }
      break;
    }
    case 'shield': s.shield = true; break;
    case 'heal': s.hp = Math.min(DUEL_PLAYER_MAX, s.hp + sk.min); msgs.push(`기운 +${sk.min}`); break;
    case 'buff': s.buff = true; dmg = sk.min; break;
    case 'reflect': s.reflect = true; break;
    case 'dodge': s.dodgeNext = true; dmg = sk.min; break;
  }
  dmg = Math.round(dmg);
  s.foe = Math.max(0, s.foe - dmg);
  if (dmg > 0) msgs.push(`${o.name}의 기운 -${dmg}`);
  if (o.heals && s.foe > 0 && !s.foeHealed && s.foe <= s.foeMax * 0.35) {
    s.foeHealed = true;
    const h = Math.round(s.foeMax * (0.18 - 0.04 * s.level));
    s.foe = Math.min(s.foeMax, s.foe + h);
    msgs.push(`${o.name}: "아직이야!" 기운 +${h}`);
  }
  return { state: s, messages: msgs, hitFoe: dmg > 0, hitMe: false };
}

export function foeMove(prev: DuelState, o: Opponent, dodged = false, rng: Rng = Math.random): DuelTurn {
  const s: DuelState = { ...prev };
  const msgs: string[] = [];
  if (s.foe <= 0) return { state: s, messages: msgs, hitFoe: false, hitMe: false };
  s.foeTurns += 1;
  const scale = 1 - 0.18 * s.level;
  // 힘 모으기 (공격 대신)
  if (o.powerUp && !s.charging && !s.foePower && s.foeTurns % 3 === 0) {
    s.foePower = true;
    msgs.push(`${josa(o.name, '이', '가')} 힘을 모아요… 다음 공격이 세져요!`);
    return { state: s, messages: msgs, hitFoe: false, hitMe: false };
  }
  let dmg: number;
  if (s.charging) {
    s.charging = false;
    msgs.push(`${o.name}: "${o.bigName}!" 🌪️`);
    dmg = roll(rng, o.atk[0], o.atk[1]) * 1.9;
  } else {
    msgs.push(`${o.name}: "${o.attackNames[s.foeTurns % o.attackNames.length]}!"`);
    dmg = roll(rng, o.atk[0], o.atk[1]);
  }
  if (s.foePower) { dmg *= 1.5; s.foePower = false; }
  dmg *= scale;
  if (s.dodgeNext) { s.dodgeNext = false; dmg = 0; msgs.push('고양이처럼 쏙! 완전히 피했어요!'); }
  else if (s.shield) { s.shield = false; dmg = 0; msgs.push('고리 방패가 막았어요!'); }
  else if (s.reflect) {
    s.reflect = false;
    const back = Math.round(dmg * 0.6);
    s.foe = Math.max(0, s.foe - back);
    dmg *= 0.4;
    msgs.push(`반사 거울! ${o.name}의 기운 -${back}`);
  } else if (dodged) { dmg *= 0.45; msgs.push('휙! 잘 피했어요!'); }
  dmg = Math.round(dmg);
  s.hp = Math.max(0, s.hp - dmg);
  if (dmg > 0) msgs.push(`내 기운 -${dmg}`);
  if (o.charges && s.hp > 0 && s.foe > 0 && s.foeTurns % 4 === 3) {
    s.charging = true;
    msgs.push(`${josa(o.name, '이', '가')} 큰 기술을 준비해요! (방패·거울·고양이로 막아 봐!)`);
  }
  return { state: s, messages: msgs, hitFoe: s.foe < prev.foe, hitMe: dmg > 0 };
}

export const duelWon = (s: DuelState) => s.foe <= 0;
export const duelLost = (s: DuelState) => s.hp <= 0 && s.foe > 0;
export const retryDuel = (o: Opponent, prev: DuelState) => initialDuel(o, prev.level + 1);

/** 이긴 상대 수에 따라 배운 기술 */
export const learnedDuelSkills = (beaten: number): DuelSkill[] => OPPONENTS.slice(0, beaten).map(o => EARNED_SKILLS[o.key]);

/** 기본 가져갈 기술 4개: 기본 3개 + 가장 최근에 배운 기술로 채움 */
export function defaultLoadout(beaten: number): string[] {
  const earned = learnedDuelSkills(beaten).map(s => s.id);
  if (!earned.length) return STARTER_SKILLS.map(s => s.id);
  return ['star-arrow', ...earned.slice(-2).reverse(), 'brave-shout'].slice(0, MAX_LOADOUT);
}

export function sanitizeLoadout(ids: string[] | undefined, beaten: number): string[] {
  const allowed = new Set([...STARTER_SKILLS, ...learnedDuelSkills(beaten)].map(s => s.id));
  const list = Array.from(new Set((ids || []).filter(id => allowed.has(id)))).slice(0, MAX_LOADOUT);
  return list.length ? list : defaultLoadout(beaten);
}
