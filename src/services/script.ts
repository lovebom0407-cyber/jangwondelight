import { BattleStep, ChoiceStep, DialogueLine, ScriptStep } from '../types';

export const isChoice = (s: ScriptStep): s is ChoiceStep => !Array.isArray(s) && (s as ChoiceStep).kind === 'choice';
export const isBattle = (s: ScriptStep): s is BattleStep => !Array.isArray(s) && (s as BattleStep).kind === 'battle';

/** 선택지까지 펼친 모든 대사 (테스트·운영실 미리보기용) */
export function flattenScript(steps: ScriptStep[]): DialogueLine[] {
  const out: DialogueLine[] = [];
  for (const s of steps) {
    if (isBattle(s)) continue;
    if (isChoice(s)) {
      out.push([s.speaker, s.text]);
      for (const o of s.options) out.push(...o.replies);
    } else out.push(s);
  }
  return out;
}

function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/**
 * 이름 넣기
 *  {name}  → 지우
 *  {nameA} → 지우야 / 민준아   (부르는 말)
 *  {nameI} → 지우가 / 민준이가
 *  {nameN} → 지우는 / 민준이는
 */
export function fillName(text: string, rawName?: string): string {
  const name = (rawName || '').trim() || '친구';
  const b = hasBatchim(name);
  return text
    .replace(/\{nameA\}/g, name + (b ? '아' : '야'))
    .replace(/\{nameI\}/g, name + (b ? '이가' : '가'))
    .replace(/\{nameN\}/g, name + (b ? '이는' : '는'))
    .replace(/\{name\}/g, name);
}
