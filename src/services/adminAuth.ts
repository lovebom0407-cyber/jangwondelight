/**
 * 장원 별밤학교 운영자 로그인 — 웹앱 자체 인증 (Firebase 미연동)
 *
 * - 운영자 계정: och9431@gw1.kr / 초기 비밀번호 1234
 * - 비밀번호는 평문으로 저장하지 않고 PBKDF2-SHA256(무작위 salt) 해시로 이 기기의 localStorage에 저장합니다.
 *   저장된 값이 없으면 초기 비밀번호(1234)로 로그인합니다.
 * - 로그인 상태는 sessionStorage(탭 단위, 4시간 만료)에만 둡니다.
 * - 5회 연속 실패 시 1분 동안 로그인을 막습니다.
 *
 * 한계(운영자에게 안내): 서버 검증이 없는 기기별 잠금입니다.
 *  · 비밀번호 변경은 그 기기(브라우저)에만 적용됩니다.
 *  · 브라우저의 사이트 데이터를 지우면 초기 비밀번호(1234)로 돌아갑니다.
 *  · 기술적으로 능숙한 사람은 브라우저 개발자 도구로 우회할 수 있습니다.
 */
import { AdminAuthState } from '../types';

export const DEFAULT_OPERATOR_EMAIL = 'och9431@gw1.kr';
export const INITIAL_OPERATOR_PASSWORD = '1234';
export const MIN_PASSWORD_LENGTH = 4;

const CRED_KEY = 'jangwon-starlight-admin-cred-v1';
const SESSION_KEY = 'jangwon-starlight-admin-session-v1';
const LOCK_KEY = 'jangwon-starlight-admin-lock-v1';
const SESSION_MS = 4 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;
const PBKDF2_ITERATIONS = 120000;

interface StoredCredential {
  email: string;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
  changedAt: string;
}

interface StoredSession {
  email: string;
  exp: number;
}

/* ----------------------------- storage helpers ----------------------------- */
function lsGet(key: string): string | null {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}
function lsRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}
function ssGet(key: string): string | null {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null; } catch { return null; }
}
function ssSet(key: string, val: string) {
  try { sessionStorage.setItem(key, val); } catch {}
}
function ssRemove(key: string) {
  try { sessionStorage.removeItem(key); } catch {}
}

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(b64), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

async function deriveHash(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('이 브라우저는 보안 암호화 기능을 지원하지 않습니다.');
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toB64(bits);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCredential(): StoredCredential | null {
  const raw = lsGet(CRED_KEY);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    if (c && typeof c.hash === 'string' && typeof c.salt === 'string') return c;
  } catch {}
  return null;
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

async function checkPassword(password: string): Promise<boolean> {
  const cred = readCredential();
  if (!cred) return password === INITIAL_OPERATOR_PASSWORD;
  const hash = await deriveHash(password, fromB64(cred.salt), cred.iterations || PBKDF2_ITERATIONS);
  return timingSafeEqual(hash, cred.hash);
}

/* ----------------------------- lockout ----------------------------- */
function readLock(): { fails: number; until: number } {
  try {
    const raw = lsGet(LOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { fails: 0, until: 0 };
}
function registerFail() {
  const l = readLock();
  const fails = l.fails + 1;
  lsSet(LOCK_KEY, JSON.stringify(fails >= MAX_FAILS ? { fails: 0, until: Date.now() + LOCK_MS } : { fails, until: 0 }));
}
function clearFails() {
  lsRemove(LOCK_KEY);
}

/* ----------------------------- session & subscribers ----------------------------- */
let inMemorySession: StoredSession | null = null;
let signedInWithInitialPassword = false;
const subscribers = new Set<(state: AdminAuthState) => void>();

function readSession(): StoredSession | null {
  if (inMemorySession && inMemorySession.exp > Date.now()) return inMemorySession;
  const raw = ssGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const s: StoredSession = JSON.parse(raw);
    if (s && s.exp > Date.now() && normalizeEmail(s.email) === normalizeEmail(DEFAULT_OPERATOR_EMAIL)) {
      inMemorySession = s;
      return s;
    }
  } catch {}
  ssRemove(SESSION_KEY);
  return null;
}

function currentState(): AdminAuthState {
  const s = readSession();
  return {
    isAuthenticated: Boolean(s),
    isAdmin: Boolean(s),
    user: s ? { uid: 'local-operator', email: s.email } : null,
    loading: false,
    error: null
  };
}

function notify() {
  const st = currentState();
  for (const sub of subscribers) {
    try { sub(st); } catch {}
  }
}

/* ----------------------------- public API ----------------------------- */

/** 웹앱 자체 인증은 항상 사용 가능 */
export function isLocalAdminAvailable(): boolean {
  return true;
}

export function isUsingInitialPassword(): boolean {
  return signedInWithInitialPassword;
}

/** 이 기기에 변경된 비밀번호가 저장되어 있는지 (없으면 초기 비밀번호 사용 중) */
export function hasCustomPassword(): boolean {
  return Boolean(readCredential());
}

export async function signInAdmin(email: string, pass: string): Promise<{ uid: string; email: string | null }> {
  const lock = readLock();
  if (lock.until > Date.now()) {
    const sec = Math.ceil((lock.until - Date.now()) / 1000);
    throw new Error(`로그인 실패가 반복되어 잠시 잠겼습니다. ${sec}초 후 다시 시도해 주세요.`);
  }
  const okEmail = normalizeEmail(email) === normalizeEmail(DEFAULT_OPERATOR_EMAIL);
  const okPass = okEmail && (await checkPassword(String(pass ?? '')));
  if (!okEmail || !okPass) {
    registerFail();
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  clearFails();
  const session: StoredSession = { email: DEFAULT_OPERATOR_EMAIL, exp: Date.now() + SESSION_MS };
  inMemorySession = session;
  ssSet(SESSION_KEY, JSON.stringify(session));
  signedInWithInitialPassword = !readCredential();
  notify();
  return { uid: 'local-operator', email: DEFAULT_OPERATOR_EMAIL };
}

/** 로그인한 운영자의 비밀번호 변경 (현재 비밀번호 확인 후, 이 기기에 해시로 저장) */
export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!readSession()) throw new Error('운영자 로그인 상태가 아닙니다. 다시 로그인해 주세요.');
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  if (newPassword === currentPassword) throw new Error('새 비밀번호가 현재 비밀번호와 같습니다.');
  if (newPassword === INITIAL_OPERATOR_PASSWORD) throw new Error('초기 비밀번호(1234)와 다른 비밀번호를 사용해 주세요.');
  if (!(await checkPassword(currentPassword))) throw new Error('현재 비밀번호가 올바르지 않습니다.');

  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const hash = await deriveHash(newPassword, salt, PBKDF2_ITERATIONS);
  const cred: StoredCredential = {
    email: DEFAULT_OPERATOR_EMAIL,
    salt: toB64(salt),
    hash,
    iterations: PBKDF2_ITERATIONS,
    changedAt: new Date().toISOString()
  };
  lsSet(CRED_KEY, JSON.stringify(cred));
  if (!readCredential()) throw new Error('이 기기에 비밀번호를 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해 주세요.');
  signedInWithInitialPassword = false;
}

export async function signOutAdmin(): Promise<void> {
  inMemorySession = null;
  signedInWithInitialPassword = false;
  ssRemove(SESSION_KEY);
  notify();
}

export function isCurrentSessionAdmin(): boolean {
  return Boolean(readSession());
}

/** 저장 작업 직전에 세션이 살아 있는지 확인 (만료 시 false) */
export async function verifyAdminSessionLive(_forceRefresh = true): Promise<boolean> {
  const ok = Boolean(readSession());
  if (!ok) notify();
  return ok;
}

export function subscribeAdminAuth(onChange: (state: AdminAuthState) => void): () => void {
  subscribers.add(onChange);
  try { onChange(currentState()); } catch {}
  return () => {
    subscribers.delete(onChange);
  };
}
