import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { changeAdminPassword, MIN_PASSWORD_LENGTH } from '../../services/adminAuth';

interface Props {
  adminEmail?: string | null;
  onChanged: () => void;
  onShowToast: (msg: string) => void;
}

/**
 * 운영자 비밀번호 변경 패널
 * - 현재 비밀번호 확인 후 이 기기에 PBKDF2 해시로 저장 (Firebase 미연동)
 * - 비밀번호는 화면 상태에만 머물고 어디에도 저장하지 않습니다.
 */
export const AdminPasswordPanel: React.FC<Props> = ({ adminEmail, onChanged, onShowToast }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!current || !next || !confirm) {
      setError('세 칸을 모두 입력해 주세요.');
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호와 확인 값이 다릅니다.');
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
      onChanged();
      onShowToast('운영자 비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.');
    } catch (err: any) {
      setError(err?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#081220] border border-[#485f83] text-[#f6ebd5] placeholder:text-[#6a7d99] text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bb70] disabled:opacity-50';

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32] p-4 space-y-3 text-left"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-[#ffd880]" />
        <h3 className="font-serif text-sm font-bold text-[#ffd880]">운영자 비밀번호 변경</h3>
      </div>
      <p className="text-[11px] text-[#9eb2ce] leading-relaxed">
        계정: <strong className="text-[#f6ebd5]">{adminEmail || '알 수 없음'}</strong> · 새 비밀번호는 {MIN_PASSWORD_LENGTH}자 이상.
        변경한 비밀번호는 <strong className="text-[#ffd880]">이 기기(이 브라우저)에만</strong> 저장됩니다. 운영실을 여는 다른 기기에서도 각각 바꿔 주세요.
      </p>

      <div className="space-y-1">
        <label htmlFor="pw-current" className="text-xs font-semibold text-[#e4bb70]">현재 비밀번호</label>
        <input
          id="pw-current"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          disabled={busy}
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="pw-next" className="text-xs font-semibold text-[#e4bb70]">새 비밀번호</label>
        <input
          id="pw-next"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={next}
          onChange={e => setNext(e.target.value)}
          disabled={busy}
          className={inputCls}
        />
        {tooShort && <p className="text-[11px] text-[#ffb088]">{MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.</p>}
      </div>
      <div className="space-y-1">
        <label htmlFor="pw-confirm" className="text-xs font-semibold text-[#e4bb70]">새 비밀번호 확인</label>
        <input
          id="pw-confirm"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          disabled={busy}
          className={inputCls}
        />
        {mismatch && <p className="text-[11px] text-[#ffb088]">새 비밀번호와 일치하지 않습니다.</p>}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-[#a9bccf] cursor-pointer">
        <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-[#e4bb70]" />
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        비밀번호 보이기
      </label>

      {error && (
        <p role="alert" className="text-xs text-[#ffd2c2] bg-[#3a1610] border border-[#b5452c] rounded-lg p-2.5">{error}</p>
      )}
      {done && (
        <p role="status" className="text-xs text-[#9be3c1] bg-[#0b2a20] border border-[#2d7363] rounded-lg p-2.5 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> 비밀번호가 변경되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={busy || tooShort || mismatch}
        className="w-full min-h-[46px] rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {busy ? '변경 중…' : '비밀번호 변경하기'}
      </button>
    </form>
  );
};
