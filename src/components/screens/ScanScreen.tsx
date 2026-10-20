import React, { useState, useEffect, useRef } from 'react';
import { ParticipantState } from '../../types';
import { getMissionNumber } from '../../data/standardMissions';
import { getMissions, validateStationCode, getAdminCodes } from '../../data/storyData';
import { decodeQrFromVideo, decodeQrFromFile } from '../../services/qrDecode';
import { ArrowLeft, QrCode, RefreshCw, KeyRound, AlertTriangle, Settings } from 'lucide-react';

interface Props {
  state: ParticipantState;
  onNavigate: (screen: any) => void;
  onUnlockSuccess: (index: number) => void;
  onShowToast: (msg: string) => void;
}

export const ScanScreen: React.FC<Props> = ({
  state,
  onNavigate,
  onUnlockSuccess,
  onShowToast
}) => {
  const activeIndex = typeof state.selectedMissionIndex === 'number'
    ? state.selectedMissionIndex
    : 0;
  const missions = getMissions(state.experienceMode);
  const mission = missions[activeIndex] || missions[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const epochRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const isScanningRef = useRef<boolean>(false);

  const [manualCode, setManualCode] = useState('');
  const [cameraStatus, setCameraStatus] = useState('후면 카메라를 준비하고 있어요…');
  const [qrSupported, setQrSupported] = useState<boolean | null>(null);

  const adminCodes = getAdminCodes();
  const isCurrentCodeConfigured = Boolean(adminCodes[activeIndex] && adminCodes[activeIndex].trim() !== '');

  const stopActiveStream = () => {
    epochRef.current++;
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    const currentEpoch = ++epochRef.current;
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setCameraStatus('후면 카메라 연결 중…');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('이 브라우저에서는 카메라를 열 수 없습니다.');
      }
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 960 },
          height: { ideal: 1280 }
        }
      });

      if (currentEpoch !== epochRef.current || !isMountedRef.current) {
        acquired.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = acquired;
      if (videoRef.current) {
        videoRef.current.srcObject = acquired;
        await videoRef.current.play().catch(() => {});
      }
      if (isMountedRef.current) {
        setCameraStatus('현장 QR을 화면 중앙 사각형 안에 맞춰주세요');
        setupBarcodeDetector(currentEpoch);
      }
    } catch {
      if (currentEpoch !== epochRef.current || !isMountedRef.current) return;
      setCameraStatus('카메라를 열 수 없습니다. 아래 수동 코드 입력을 이용해 주세요.');
    }
  };

  const setupBarcodeDetector = async (launchEpoch: number) => {
    // BarcodeDetector(안드로이드) 또는 jsQR(iPhone 등) 로 인식
    setQrSupported(true);
    isScanningRef.current = true;
    const scratch = document.createElement('canvas');
    const scanLoop = async () => {
      if (!isScanningRef.current || launchEpoch !== epochRef.current || !isMountedRef.current) return;
      try {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const raw = await decodeQrFromVideo(videoRef.current, scratch);
          if (raw) {
            handleCodeSubmit(raw);
            return;
          }
        }
      } catch {}
      if (isScanningRef.current && launchEpoch === epochRef.current && isMountedRef.current) {
        setTimeout(scanLoop, 350);
      }
    };
    scanLoop();
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    const handleVisibility = () => {
      if (document.hidden) {
        stopActiveStream();
      } else if (isMountedRef.current) {
        startCamera();
      }
    };

    const handlePageHide = () => {
      stopActiveStream();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      stopActiveStream();
    };
  }, []);

  const handleCodeSubmit = (codeToTest: string) => {
    const res = validateStationCode(codeToTest, state, activeIndex);
    if (!res.ok) {
      onShowToast(res.message || '현장 코드가 올바르지 않습니다.');
      return;
    }
    if (typeof res.index === 'number') {
      stopActiveStream();
      onUnlockSuccess(res.index);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCodeSubmit(manualCode);
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      <button
        type="button"
        onClick={() => {
          stopActiveStream();
          onNavigate('map');
        }}
        className="inline-flex items-center gap-1.5 text-xs text-[#d8c7a7] hover:text-white px-3 py-2 rounded-lg bg-[#112038]/60 border border-[#b7985b]/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 탐험 지도
      </button>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-[#e4bb70]">
          FIELD QR · 0{getMissionNumber(activeIndex, state.experienceMode)}
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#f6ebd5]">
          {mission.lessonName}
        </h2>
        <p className="text-sm text-[#d8c7a7]">현장 부스: {mission.title}</p>
        <p className="text-xs text-[#aeb9cb]">
          <strong className="text-[#ffd880]">{mission.place}</strong>에 비치된 현장 QR이나 코드를 인증하세요.
        </p>
      </div>

      {/* Code Not Configured Warning Banner */}
      {!isCurrentCodeConfigured && (
        <div className="p-4 rounded-xl bg-[#28180d] border border-[#d27529] text-xs text-[#ffcca3] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#ffa961]">
            <AlertTriangle className="w-4 h-4 text-[#ffa961]" />
            <span>현장 인증 코드 미설정 안내</span>
          </div>
          <p className="leading-relaxed">
            운영진 원칙에 따라 모든 미션의 QR/수동 코드는 초기 공란으로 비워져 있습니다.<br />
            실제 행사를 진행하기 전, <strong>운영실(Admin)</strong>에서 이 장소의 인증 코드를 입력해야 참가자가 잠금을 해제할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              stopActiveStream();
              onNavigate('admin');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#d27529] text-[#1c0d03] font-bold text-xs hover:brightness-105 transition-all mt-1 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>운영실에서 코드 설정하기 →</span>
          </button>
        </div>
      )}

      {/* QR Camera View */}
      <div className="relative w-full aspect-[4/3] bg-[#030814] rounded-2xl overflow-hidden border-2 border-[#b7985b]/60 shadow-xl">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Scan Target Reticle */}
        <div className="absolute inset-[15%] border-2 border-[#ffd880] rounded-xl pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#ffd880] shadow-[0_0_12px_#ffd880] animate-pulse" />
        </div>

        {/* Label */}
        <div className="absolute bottom-2 inset-x-3 text-center text-xs py-1.5 px-3 rounded-lg bg-[#000000]/70 text-[#f7e6c4] backdrop-blur-xs">
          {cameraStatus}
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-[#8ea3c2] px-1">
        <span>
          {qrSupported === false
            ? 'QR 자동 인식이 지원되지 않는 브라우저입니다. 아래 직접 입력을 이용하세요.'
            : '올바른 현장 코드를 스캔하면 자동으로 다음 단계로 넘어갑니다.'}
        </span>
        <button
          type="button"
          onClick={startCamera}
          className="hover:text-white flex items-center gap-1 text-[11px] p-1 text-[#ffd880] cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> 다시 연결
        </button>
      </div>

      {/* 화면 안 카메라가 막혀도: 휴대폰 기본 카메라로 QR 사진 찍기 */}
      <label className="w-full min-h-[52px] rounded-xl font-bold text-base text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] flex items-center justify-center gap-2 cursor-pointer">
        <QrCode className="w-5 h-5" /> QR 사진 찍기
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const raw = await decodeQrFromFile(f).catch(() => null);
            if (raw) handleCodeSubmit(raw);
            else onShowToast('QR을 못 찾았어요. 더 가까이 찍어 주세요.');
          }}
        />
      </label>

      {/* Manual Code Input Form */}
      <form
        onSubmit={handleFormSubmit}
        className="rounded-2xl border border-[#b7985b]/40 bg-[#0d1c32]/90 p-5 space-y-3.5 shadow-lg"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#ffd880]">
          <KeyRound className="w-4 h-4" />
          <label htmlFor="manual-code-input">현장 코드 직접 입력</label>
        </div>

        <input
          id="manual-code-input"
          type="text"
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          placeholder="현장 안내판에 적힌 코드를 입력하세요"
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-lg bg-[#081222] border border-[#485f83] text-[#f6ebd5] placeholder:text-[#6a7d99] text-sm focus:outline-none focus:ring-2 focus:ring-[#e4bb70]"
        />

        <button
          type="submit"
          className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>현장 확인하고 미션 열기</span>
        </button>
      </form>
    </div>
  );
};
