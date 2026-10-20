/**
 * 마스터(테스트) 모드 — 운영진이 흐름을 빠르게 확인하기 위한 모드
 * - 운영실(로그인 필요)에서만 켤 수 있고, 화면 위 띠에서 언제든 끌 수 있습니다.
 * - 켜면: 인증샷 없이 별빛 받기, 대화 건너뛰기, 미니게임 바로 배우기, 볼드모트 바로 이기기, 현장 코드 확인 생략.
 * - 이 기기(브라우저)에만 적용됩니다. 마스터 모드로 받은 별빛은 기록에 masterSkip 표시가 남습니다.
 */
const KEY = 'jangwon-starlight-master-mode-v1';
const EVENT = 'jangwon-master-mode-change';

export function isMasterMode(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setMasterMode(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {}
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function onMasterModeChange(fn: (on: boolean) => void): () => void {
  const h = () => fn(isMasterMode());
  try {
    window.addEventListener(EVENT, h);
    window.addEventListener('storage', h);
  } catch {}
  return () => {
    try {
      window.removeEventListener(EVENT, h);
      window.removeEventListener('storage', h);
    } catch {}
  };
}

/** React 훅 */
import { useEffect, useState } from 'react';
export function useMasterMode(): boolean {
  const [on, setOn] = useState<boolean>(isMasterMode());
  useEffect(() => onMasterModeChange(setOn), []);
  return on;
}
