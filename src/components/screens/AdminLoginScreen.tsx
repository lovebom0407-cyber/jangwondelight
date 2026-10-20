import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldAlert, KeyRound, AlertTriangle, LogIn, ExternalLink } from 'lucide-react';
import { isLocalAdminAvailable, signInAdmin, DEFAULT_OPERATOR_EMAIL } from '../../services/adminAuth';

interface Props {
  onNavigate: (screen: any) => void;
  onLoginSuccess: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminLoginScreen: React.FC<Props> = ({
  onNavigate,
  onLoginSuccess,
  onShowToast
}) => {
  const [email, setEmail] = useState(DEFAULT_OPERATOR_EMAIL);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configured = isLocalAdminAvailable();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!configured) {
      setErrorMessage('이 브라우저에서 운영자 로그인을 사용할 수 없습니다.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('아이디(이메일)와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInAdmin(email, password);
      onShowToast('관리자 인증에 성공했습니다. 운영실로 이동합니다.');
      // 화면 전환은 App 이 직접 처리 (가드에 이전 로그인 상태가 남아 있지 않도록 navigate 호출 안 함)
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '인증에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-[430px] mx-auto">
      <button
        type="button"
        onClick={() => onNavigate('start')}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-xs text-[#d8c7a7] hover:text-white px-3.5 py-2 rounded-xl bg-[#112038]/70 border border-[#b7985b]/30 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> 시작 화면으로
      </button>

      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102039] border border-[#e4bb70]/40 text-xs font-semibold uppercase tracking-widest text-[#e4bb70]">
          <KeyRound className="w-3.5 h-3.5" />
          <span>JANGWON · CONTROL ROOM</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#f6ebd5]">
          별밤학교 운영실 로그인
        </h2>
        <p className="text-xs text-[#aeb9cb]">
          학교 교사 및 운영진 전용 · 웹앱 자체 운영자 계정
        </p>
      </div>

      <div className="rounded-xl border border-[#b7985b]/30 bg-[#0d1c32]/80 p-3.5 text-xs text-[#b8c9df] leading-relaxed flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-[#ffd880] shrink-0 mt-0.5" />
        <span>
          운영실 로그인은 이 기기의 브라우저 안에서 확인합니다. 로그인은 이 탭에서 최대 4시간 유지되며, 탭을 닫거나 로그아웃하면 끝납니다.
          5번 연속 틀리면 1분 동안 잠깁니다.
        </span>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-[#ff6b6b]/50 bg-[#2d1111] p-3.5 text-xs text-[#ffc5c5] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#ff8585] shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border-2 border-[#d8b568]/40 bg-gradient-to-b from-[#13233f] via-[#0b1629] to-[#060c18] p-6 shadow-2xl space-y-4 text-left"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="admin-email-input"
            className="text-xs font-semibold text-[#ffd880] block"
          >
            운영자 이메일
          </label>
          <input
            id="admin-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting || !configured}
            autoComplete="username"
            placeholder={DEFAULT_OPERATOR_EMAIL}
            required
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#081220] border border-[#485f83] text-[#f6ebd5] placeholder:text-[#6a7d99] text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bb70] disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="admin-password-input"
            className="text-xs font-semibold text-[#ffd880] block"
          >
            비밀번호
          </label>
          <input
            id="admin-password-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isSubmitting || !configured}
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            required
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#081220] border border-[#485f83] text-[#f6ebd5] placeholder:text-[#6a7d99] text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bb70] disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !configured}
          className="w-full min-h-[50px] px-6 py-3 rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-[0_6px_25px_rgba(229,185,88,0.35)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pt-1"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-[#20170a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          <span>{isSubmitting ? '관리자 권한 검증 중…' : '운영실 로그인'}</span>
        </button>

        <p className="text-[11px] text-[#8fa7c7] leading-relaxed">
          비밀번호를 잊었다면: 이 기기 브라우저의 사이트 데이터(저장된 데이터)를 지우면 초기 비밀번호로 돌아갑니다. 이때 이 기기에 저장된 학생 기록·운영 설정도 함께 지워지니 먼저 운영실에서 기록을 백업하세요.
        </p>

        {!configured && (
          <p className="text-[11px] text-[#ffb088] text-center pt-1">
            * 이 브라우저에서 운영자 로그인 기능을 사용할 수 없습니다.
          </p>
        )}
      </form>

      {/* Student Link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate('start')}
          className="text-xs text-[#8fa2be] hover:text-[#ffd880] transition-colors cursor-pointer"
        >
          학생 탐험 모드로 돌아가기
        </button>
      </div>
    </div>
  );
};
