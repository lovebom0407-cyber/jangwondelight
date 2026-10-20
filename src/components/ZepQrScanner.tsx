import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, Image as ImageIcon, QrCode, RefreshCw, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { checkZepQuizLink, decodeQrFromFile, decodeQrFromVideo, ZepLinkCheck } from '../services/qrDecode';

/**
 * 현장 ZEP QUIZ QR 촬영 모드
 * - [실시간 스캔] 후면 카메라 화면에서 QR을 자동 인식
 * - [사진 찍어 인식] 카메라 앱으로 QR을 찍으면(또는 앨범 사진) 그 사진에서 인식
 * - 인식된 주소가 zep.us 인지, 운영실 등록 링크와 같은지 확인한 뒤에만 [ZEP 퀴즈 열기] 버튼을 보여 줍니다.
 * - 촬영한 사진은 기기 안에서만 처리하고 저장·전송하지 않습니다.
 */
interface Props {
  missionLabel: string;
  configuredUrl?: string;
  onClose: () => void;
  onLinkConfirmed: (url: string) => void;
}

type Mode = 'live' | 'photo';

export const ZepQrScanner: React.FC<Props> = ({ missionLabel, configuredUrl, onClose, onLinkConfirmed }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number>(0);

  const [mode, setMode] = useState<Mode>('photo');
  const [status, setStatus] = useState('카메라를 준비하고 있어요…');
  const [cameraOk, setCameraOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ZepLinkCheck | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    loopRef.current++;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOk(false);
  }, []);

  const handleRaw = useCallback(
    (raw: string) => {
      const check = checkZepQuizLink(raw, configuredUrl);
      setResult(check);
      stopCamera();
      try { navigator.vibrate?.(80); } catch {}
    },
    [configuredUrl, stopCamera]
  );

  const startCamera = useCallback(async () => {
    const epoch = ++loopRef.current;
    setResult(null);
    setStatus('후면 카메라 연결 중…');
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera');
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }
      });
      if (epoch !== loopRef.current) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOk(true);
      setStatus('ZEP QUIZ QR을 가운데 사각형에 맞춰 주세요');
      if (!scratchRef.current) scratchRef.current = document.createElement('canvas');
      const tick = async () => {
        if (epoch !== loopRef.current) return;
        const v = videoRef.current;
        if (v) {
          const raw = await decodeQrFromVideo(v, scratchRef.current!).catch(() => null);
          if (raw && epoch === loopRef.current) { handleRaw(raw); return; }
        }
        if (epoch === loopRef.current) setTimeout(tick, 300);
      };
      tick();
    } catch {
      if (epoch !== loopRef.current) return;
      setStatus('카메라 화면을 열 수 없어요. 사진으로 찍어 주세요.');
      setMode('photo');
    }
  }, [handleRaw]);

  useEffect(() => {
    if (mode === 'live' && !result) startCamera();
    else stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const onVis = () => { if (document.hidden) stopCamera(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stopCamera]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setResult(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const raw = await decodeQrFromFile(file);
      if (raw) handleRaw(raw);
      else setStatus('QR을 못 찾았어요. 더 가까이 찍어 주세요.');
    } catch {
      setStatus('사진을 읽지 못했어요. 다시 찍어 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    setPhotoPreview(null);
    if (mode === 'live') startCamera();
    else setStatus('QR이 잘 보이게 다시 찍어 주세요.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="ZEP QUIZ QR 촬영">
      <div className="w-full max-w-md bg-[#0b172a] border border-[#d8b568]/50 rounded-2xl p-4 space-y-3 max-h-[95dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#e4bb70] font-semibold">{missionLabel}</div>
            <h3 className="font-serif text-base font-bold text-[#f6ebd5] flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#ffd880]" /> 퀴즈 QR 찍기
            </h3>
          </div>
          <button type="button" onClick={() => { stopCamera(); onClose(); }} className="p-2 text-[#9fb6d6] cursor-pointer" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result && mode === 'live' && (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-[#2b4b7a]">
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-[18%] border-[3px] border-[#ffd880] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] pointer-events-none" />
            <div className="absolute bottom-2 inset-x-2 text-center text-xs py-1.5 px-2 rounded-lg bg-black/70 text-[#f7e6c4]">
              {status}
            </div>
            <button type="button" onClick={() => setMode('photo')} className="absolute top-2 left-2 px-2.5 py-1.5 rounded-lg bg-black/70 text-[11px] text-[#ffd880] cursor-pointer">
              ← 사진으로 찍기
            </button>
            {!cameraOk && (
              <button type="button" onClick={startCamera} className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/70 text-[11px] text-[#ffd880] flex items-center gap-1 cursor-pointer">
                <RefreshCw className="w-3 h-3" /> 다시 연결
              </button>
            )}
          </div>
        )}

        {!result && mode === 'photo' && (
          <div className="space-y-2">
            <label className={`w-full min-h-[140px] rounded-2xl bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] text-[#20170a] flex flex-col items-center justify-center gap-2 cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
              <Camera className="w-10 h-10" />
              <span className="text-lg font-bold">{busy ? '읽는 중…' : 'QR 사진 찍기'}</span>
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" />
            </label>
            {photoPreview && <img src={photoPreview} alt="찍은 QR 사진" className="w-full max-h-48 object-contain rounded-lg bg-black" />}
            {status !== '카메라를 준비하고 있어요…' && <p className="text-sm text-[#ffcf99]">{status}</p>}
            <button type="button" onClick={() => setMode('live')} className="w-full text-xs text-[#9fb6d6] underline underline-offset-2 cursor-pointer">
              카메라 화면으로 비춰서 찾기
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                result.ok && result.isZep && result.matchesConfigured !== false
                  ? 'bg-[#0b2a20] border-[#2d7363] text-[#c9f0dd]'
                  : 'bg-[#2a1a0c] border-[#a8662c] text-[#ffe0c2]'
              }`}
            >
              {result.ok && result.isZep && result.matchesConfigured !== false
                ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="font-bold">{result.message}</div>
                <div className="font-mono text-[10px] break-all opacity-80 pt-1">{result.url}</div>
              </div>
            </div>

            {result.ok && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onLinkConfirmed(result.url)}
                className={`w-full min-h-[50px] rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 ${
                  result.isZep
                    ? 'text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d]'
                    : 'text-[#ffe0c2] bg-[#3a2410] border border-[#a8662c]'
                }`}
              >
                {result.isZep ? '퀴즈 열기' : '선생님께 확인했어요, 열기'} <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button type="button" onClick={retry} className="w-full min-h-[44px] rounded-xl text-sm font-bold bg-[#172b49] border border-[#3b5985] text-[#f6ebd5] cursor-pointer">
              다시 찍기
            </button>

          </div>
        )}


      </div>
    </div>
  );
};
