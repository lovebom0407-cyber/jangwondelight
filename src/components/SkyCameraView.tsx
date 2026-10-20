import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Compass, Crosshair, Download, Hand, MapPin, RotateCcw, Smartphone, X } from 'lucide-react';
import { DOGYE_LOCATION, ObserverLocation, calculateLST, equatorialToHorizontal, getCompassDirection } from '../services/celestialMath';
import {
  SKY_CATALOG,
  CameraBasis,
  Vec3,
  adjustBasis,
  altAzToVec,
  angularDistanceDeg,
  basisFromAltAz,
  basisFromDeviceOrientation,
  projectToScreen,
  vecToAltAz
} from '../services/skyCatalog';

/**
 * 카메라 별 찾기 (스텔라리움식 AR)
 * - 후면 카메라 화면 위에 현재 시각·위치 기준으로 계산한 별과 별자리 선을 겹쳐 그립니다.
 * - 방향은 휴대폰 나침반·기울기 센서로 잡고, 센서가 없으면 손가락으로 돌려 보는 수동 모드로 동작합니다.
 * - 나침반 오차는 [기준 별 맞추기]로 보정합니다.
 * - 사진은 기기에만 저장(다운로드)하며 서버로 보내지 않습니다. 현장 미션 완료와는 무관합니다.
 */

type Mode = 'idle' | 'sensor' | 'manual';

interface Props {
  onClose?: () => void;
}

interface Placed {
  id: string;
  name: string;
  con: string;
  mag: number;
  vec: Vec3;
  alt: number;
  az: number;
}

const DEFAULT_VFOV = 60; // 일반 휴대폰 후면 카메라 세로 화각 근삿값 (도)

export const SkyCameraView: React.FC<Props> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const orientRef = useRef<{ alpha: number; beta: number; gamma: number; absolute: boolean } | null>(null);
  const manualRef = useRef<{ alt: number; az: number }>({ alt: 45, az: 30 });
  const dragRef = useRef<{ x: number; y: number; alt: number; az: number } | null>(null);
  const rafRef = useRef<number>(0);

  const [mode, setMode] = useState<Mode>('idle');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sensorNote, setSensorNote] = useState<string | null>(null);
  const [location, setLocation] = useState<ObserverLocation>(DOGYE_LOCATION);
  const [locationLabel, setLocationLabel] = useState('학교 기준 좌표');
  const [headingOffset, setHeadingOffset] = useState(0);
  const [vfov, setVfov] = useState(DEFAULT_VFOV);
  const [showLines, setShowLines] = useState(true);
  const [redMode, setRedMode] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [readout, setReadout] = useState<{ alt: number; az: number; nearest: Placed | null; dist: number } | null>(null);
  const [calibTarget, setCalibTarget] = useState<string>('');
  const [capture, setCapture] = useState<{ url: string; caption: string } | null>(null);

  // 1분마다 시각 갱신 (별 위치는 1분에 약 0.25°씩 움직임)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // 현재 시각·위치 기준 별 고도·방위
  const placed: Placed[] = useMemo(() => {
    const lst = calculateLST(now, location.longitude);
    return SKY_CATALOG.stars.map(s => {
      const { altitude, azimuth } = equatorialToHorizontal(s.ra, s.dec, lst, location.latitude);
      return { id: s.id, name: s.name, con: s.con, mag: s.mag, alt: altitude, az: azimuth, vec: altAzToVec(altitude, azimuth) };
    });
  }, [now, location]);
  const placedById = useMemo(() => new Map(placed.map(p => [p.id, p])), [placed]);
  const visibleBright = useMemo(
    () => placed.filter(p => p.alt > 5 && p.mag < 2.6).sort((a, b) => a.mag - b.mag),
    [placed]
  );

  /* ----------------------------- 카메라 ----------------------------- */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저에서는 카메라를 쓸 수 없습니다. 손가락으로 돌려 보는 모드로 이용해 주세요.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch (err: any) {
      const name = err?.name || '';
      setCameraError(
        name === 'NotAllowedError'
          ? '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라를 허용하거나, 손가락으로 돌려 보는 모드로 이용해 주세요.'
          : '카메라를 시작하지 못했습니다. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.'
      );
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ----------------------------- 센서 ----------------------------- */
  const handleOrientation = useCallback((e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    if (e.beta == null || e.gamma == null) return;
    let alpha: number | null = null;
    let absolute = false;
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      alpha = (360 - e.webkitCompassHeading) % 360; // iOS: 나침반 기준
      absolute = true;
    } else if (e.alpha != null) {
      alpha = e.alpha;
      absolute = Boolean((e as any).absolute) || e.type === 'deviceorientationabsolute';
    }
    if (alpha == null) return;
    // absolute 이벤트가 오면 상대값 이벤트는 무시
    if (orientRef.current?.absolute && !absolute) return;
    orientRef.current = { alpha, beta: e.beta, gamma: e.gamma, absolute };
  }, []);

  const stopSensors = useCallback(() => {
    window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
    window.removeEventListener('deviceorientation', handleOrientation as any, true);
  }, [handleOrientation]);

  useEffect(() => () => stopSensors(), [stopSensors]);

  const startSensors = useCallback(async () => {
    setSensorNote(null);
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) {
      setSensorNote('이 기기에는 방향 센서가 없습니다. 손가락으로 돌려 보는 모드로 전환합니다.');
      setMode('manual');
      return;
    }
    try {
      if (typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission(); // iOS 13+
        if (res !== 'granted') {
          setSensorNote('방향 센서 권한이 거부되었습니다. 손가락으로 돌려 보는 모드로 전환합니다.');
          setMode('manual');
          return;
        }
      }
    } catch {
      setSensorNote('방향 센서 권한을 요청하지 못했습니다. 손가락으로 돌려 보는 모드로 전환합니다.');
      setMode('manual');
      return;
    }
    orientRef.current = null;
    window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
    window.addEventListener('deviceorientation', handleOrientation as any, true);
    setMode('sensor');
    // 2초 안에 값이 안 들어오면 수동 모드 안내
    setTimeout(() => {
      if (!orientRef.current) {
        setSensorNote('센서 값이 들어오지 않습니다(컴퓨터이거나 권한이 막혀 있을 수 있음). 손가락으로 돌려 보는 모드로 전환합니다.');
        setMode('manual');
      } else if (!orientRef.current.absolute) {
        setSensorNote('이 기기는 나침반 북쪽 기준을 제공하지 않습니다. [기준 별 맞추기]로 방향을 꼭 보정해 주세요.');
      }
    }, 2000);
  }, [handleOrientation]);

  const startAll = async () => {
    await startSensors();
    await startCamera();
  };

  /* ----------------------------- 위치 ----------------------------- */
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationLabel('위치 기능 없음 · 학교 기준 좌표 사용');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          name: '현재 위치',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevationMeters: pos.coords.altitude || 0
        });
        setLocationLabel(`현재 위치 (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`);
      },
      () => setLocationLabel('위치 권한 거부 · 학교 기준 좌표 사용'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  /* ----------------------------- 렌더링 ----------------------------- */
  const getBasis = useCallback((): CameraBasis | null => {
    const screenAngle =
      (typeof screen !== 'undefined' && (screen as any).orientation?.angle) ?? ((window as any).orientation || 0);
    if (mode === 'sensor' && orientRef.current) {
      const o = orientRef.current;
      return adjustBasis(basisFromDeviceOrientation(o.alpha, o.beta, o.gamma), screenAngle || 0, headingOffset);
    }
    if (mode === 'manual') {
      return basisFromAltAz(manualRef.current.alt, manualRef.current.az);
    }
    return null;
  }, [mode, headingOffset]);

  useEffect(() => {
    if (mode === 'idle') return;
    let lastReadout = 0;
    const draw = (ts: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const basis = getBasis();
      if (!basis) return;
      const focal = (H / 2) / Math.tan((vfov * Math.PI) / 360);
      const cx = W / 2, cy = H / 2;
      const gold = redMode ? '#ff6b6b' : '#ffd880';
      const ink = redMode ? '#ff9a9a' : '#f6ebd5';
      const soft = redMode ? 'rgba(255,90,90,0.55)' : 'rgba(255,216,128,0.55)';

      // 지평선 (고도 0°) 및 방위 표시
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = redMode ? 'rgba(255,120,120,0.6)' : 'rgba(120,200,160,0.7)';
      ctx.beginPath();
      let started = false;
      for (let az = 0; az <= 360; az += 2) {
        const p = projectToScreen(altAzToVec(0, az), basis, focal);
        if (!p) { started = false; continue; }
        const x = cx + p.x, y = cy + p.y;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      const dirs: [number, string][] = [[0, '북 N'], [45, '북동'], [90, '동 E'], [135, '남동'], [180, '남 S'], [225, '남서'], [270, '서 W'], [315, '북서']];
      for (const [az, label] of dirs) {
        const p = projectToScreen(altAzToVec(0, az), basis, focal);
        if (!p) continue;
        ctx.fillStyle = redMode ? '#ff8080' : '#9be3c1';
        ctx.fillText(label, cx + p.x, cy + p.y + 16);
      }

      // 별자리 선
      if (showLines) {
        ctx.strokeStyle = soft;
        ctx.lineWidth = 1.2;
        for (const fig of SKY_CATALOG.figures) {
          for (const [a, b] of fig.lines) {
            const sa = placedById.get(a), sb = placedById.get(b);
            if (!sa || !sb) continue;
            const pa = projectToScreen(sa.vec, basis, focal), pb = projectToScreen(sb.vec, basis, focal);
            if (!pa || !pb) continue;
            ctx.beginPath();
            ctx.moveTo(cx + pa.x, cy + pa.y);
            ctx.lineTo(cx + pb.x, cy + pb.y);
            ctx.stroke();
          }
        }
      }

      // 별
      const labeledCons = new Set<string>();
      for (const s of placed) {
        const p = projectToScreen(s.vec, basis, focal);
        if (!p) continue;
        const x = cx + p.x, y = cy + p.y;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const r = Math.max(1.6, 4.6 - s.mag * 1.1);
        ctx.globalAlpha = s.alt < 0 ? 0.35 : 1;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (s.mag < 2.2 || s.id === 'umi-alpha') {
          ctx.font = '12px "Noto Sans KR", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillStyle = ink;
          ctx.fillText(s.name.replace(/ \(.+\)$/, ''), x + r + 4, y + 4);
        }
        if (!labeledCons.has(s.con) && s.alt > -5) {
          labeledCons.add(s.con);
          ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = gold;
          ctx.fillText(s.con, x, y - r - 10);
        }
        ctx.globalAlpha = 1;
      }

      // 중앙 조준선
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.moveTo(cx - 34, cy); ctx.lineTo(cx - 14, cy);
      ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 34, cy);
      ctx.moveTo(cx, cy - 34); ctx.lineTo(cx, cy - 14);
      ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy + 34);
      ctx.stroke();

      // 판독값 (5Hz)
      if (ts - lastReadout > 200) {
        lastReadout = ts;
        const { alt, az } = vecToAltAz(basis.forward);
        let nearest: Placed | null = null;
        let best = 999;
        for (const s of placed) {
          if (s.alt < -2) continue;
          const d = angularDistanceDeg(s.vec, basis.forward);
          if (d < best) { best = d; nearest = s; }
        }
        setReadout({ alt, az, nearest: best < 12 ? nearest : null, dist: best });
      }
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, getBasis, placed, placedById, showLines, redMode, vfov]);

  /* ----------------------------- 손가락 조작 (수동 모드) ----------------------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'manual') return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ...manualRef.current };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const wrap = wrapRef.current;
    if (!d || !wrap || mode !== 'manual') return;
    const degPerPx = vfov / wrap.clientHeight;
    let az = d.az - (e.clientX - d.x) * degPerPx;
    az = ((az % 360) + 360) % 360;
    const alt = Math.max(-10, Math.min(90, d.alt + (e.clientY - d.y) * degPerPx));
    manualRef.current = { alt, az };
  };
  const onPointerUp = () => { dragRef.current = null; };

  const pointTo = (alt: number, az: number) => {
    manualRef.current = { alt: Math.max(-10, Math.min(90, alt)), az };
  };

  /* ----------------------------- 보정 ----------------------------- */
  const calibrate = () => {
    const target = placedById.get(calibTarget);
    if (!target || mode !== 'sensor' || !orientRef.current) return;
    // 보정 전 상태에서의 카메라 방위와 목표 별 방위 차이를 offset 으로 사용
    const o = orientRef.current;
    const screenAngle = ((screen as any).orientation?.angle ?? (window as any).orientation) || 0;
    const raw = adjustBasis(basisFromDeviceOrientation(o.alpha, o.beta, o.gamma), screenAngle, 0);
    const { az } = vecToAltAz(raw.forward);
    let diff = target.az - az;
    diff = ((diff + 540) % 360) - 180;
    setHeadingOffset(Math.round(diff * 10) / 10);
  };

  /* ----------------------------- 사진 저장 ----------------------------- */
  const takePhoto = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = canvas.width, H = canvas.height;
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#02060d';
    ctx.fillRect(0, 0, W, H);
    const v = videoRef.current;
    if (cameraOn && v && v.videoWidth) {
      // object-fit: cover 와 동일하게 자르기
      const vr = v.videoWidth / v.videoHeight, cr = W / H;
      let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
      if (vr > cr) { sw = v.videoHeight * cr; sx = (v.videoWidth - sw) / 2; } else { sh = v.videoWidth / cr; sy = (v.videoHeight - sh) / 2; }
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
    }
    ctx.drawImage(canvas, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    const line1 = `장원 별밤학교 별 찾기 · ${now.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}`;
    const line2 = `${readout ? `${getCompassDirection(readout.az)} 방위 ${readout.az.toFixed(0)}° · 고도 ${readout.alt.toFixed(0)}°` : ''}${readout?.nearest ? ` · 가운데: ${readout.nearest.name} (${readout.nearest.con})` : ''}`;
    const stamp = `${line1.replace('장원 별밤학교 별 찾기 · ', '')} · ${line2}`;
    ctx.fillStyle = 'rgba(2,6,13,0.78)';
    ctx.fillRect(0, H - 50 * dpr, W, 50 * dpr);
    ctx.fillStyle = '#ffd880';
    ctx.font = `bold ${12 * dpr}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(line1, 10 * dpr, H - 30 * dpr, W - 20 * dpr);
    ctx.fillStyle = '#f6ebd5';
    ctx.font = `${11 * dpr}px "Noto Sans KR", sans-serif`;
    ctx.fillText(line2, 10 * dpr, H - 12 * dpr, W - 20 * dpr);
    setCapture({ url: out.toDataURL('image/jpeg', 0.9), caption: stamp });
  };

  /* ----------------------------- UI ----------------------------- */
  const reset = () => {
    stopCamera();
    stopSensors();
    setMode('idle');
    setHeadingOffset(0);
    setCapture(null);
  };

  if (mode === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[#0d1d33] border border-[#233b61] space-y-3">
          <h3 className="font-serif font-bold text-base text-[#fdf8ed] flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#ffd880]" /> 카메라로 별 찾기
          </h3>
          <p className="text-xs text-[#c8dcf5] leading-relaxed">
            휴대폰을 밤하늘로 들면 지금 시각과 위치로 계산한 별·별자리 이름이 카메라 화면 위에 겹쳐 보여요.
            가운데 조준선이 가리키는 방향(방위·고도)과 가장 가까운 별을 알려 주고, 화면을 사진으로 저장할 수 있어요.
          </p>
          <ul className="text-[11px] text-[#9fb6d6] space-y-1 list-disc list-inside">
            <li>카메라와 방향 센서 권한을 물어보면 [허용]을 눌러 주세요.</li>
            <li>휴대폰 나침반은 주변 금속·전자기기 때문에 10° 이상 틀릴 수 있어요. 밝은 별로 [기준 별 맞추기]를 하면 정확해져요.</li>
            <li>어두운 별은 카메라에 잘 찍히지 않아도 위치 표시는 계산으로 보여 줍니다. 행성과 달은 표시하지 않아요.</li>
            <li>주변을 잘 살피며 걷지 말고 서서 사용해 주세요. 낮에는 태양 쪽으로 카메라를 향하지 마세요.</li>
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={startAll}
              className="min-h-[50px] rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] via-[#e5b958] to-[#c7963d] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" /> 휴대폰 들고 시작하기
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="min-h-[50px] rounded-xl font-bold text-sm text-[#f6ebd5] bg-[#172b49] border border-[#3b5985] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Hand className="w-4 h-4" /> 손가락으로 돌려 보기 (센서 없이)
            </button>
          </div>
          {cameraError && <p className="text-xs text-[#ffb088]">{cameraError}</p>}
        </div>
      </div>
    );
  }

  const r = readout;
  return (
    <div className="space-y-3">
      <div
        ref={wrapRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-[#2b4b7a] bg-gradient-to-b from-[#030812] to-[#0a1830] touch-none select-none ${redMode ? 'sepia-0' : ''}`}
        style={{ height: 'min(70dvh, 620px)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
          style={redMode ? { filter: 'grayscale(1) brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(4)' } : undefined}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* 판독 패널 */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
          <div className="px-3 py-2 rounded-xl bg-[#02060d]/80 border border-[#ffd880]/40 text-[11px] text-[#f6ebd5] leading-snug">
            {r ? (
              <>
                <div className="font-bold text-[#ffd880]">
                  {getCompassDirection(r.az)} · 방위 {r.az.toFixed(0)}° · 고도 {r.alt.toFixed(0)}°
                </div>
                <div>
                  {r.nearest
                    ? <>가운데 근처: <strong>{r.nearest.name}</strong> ({r.nearest.con}, {r.dist.toFixed(0)}° 떨어짐)</>
                    : '가운데 근처에 표시된 밝은 별이 없어요'}
                </div>
              </>
            ) : (
              <span>방향을 읽는 중…</span>
            )}
          </div>
          <div className="px-2 py-1 rounded-lg bg-[#02060d]/80 text-[10px] text-[#9fb6d6]">
            {mode === 'sensor' ? '센서 모드' : '손가락 모드'}
          </div>
        </div>

        {mode === 'manual' && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 justify-center">
            {[['북', 0], ['북동', 45], ['동', 90], ['남', 180], ['서', 270]].map(([l, az]) => (
              <button
                key={l as string}
                type="button"
                onClick={() => pointTo(40, az as number)}
                className="px-2.5 py-1.5 rounded-lg bg-[#02060d]/80 border border-[#3b5985] text-[11px] text-[#f6ebd5] cursor-pointer"
              >
                {l}쪽
              </button>
            ))}
            <span className="w-full text-center text-[10px] text-[#9fb6d6]">화면을 끌어서 하늘을 돌려 보세요</span>
          </div>
        )}
      </div>

      {sensorNote && <p className="text-xs text-[#ffcf99] bg-[#2a1a0c] border border-[#a8662c] rounded-lg p-2.5">{sensorNote}</p>}
      {cameraError && <p className="text-xs text-[#ffb088]">{cameraError}</p>}

      {/* 조작 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={takePhoto}
          className="min-h-[48px] rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Camera className="w-4 h-4" /> 별 사진 찍기
        </button>
        {cameraOn ? (
          <button type="button" onClick={stopCamera} className="min-h-[48px] rounded-xl text-sm font-bold bg-[#172b49] border border-[#3b5985] text-[#f6ebd5] cursor-pointer">
            카메라 끄기
          </button>
        ) : (
          <button type="button" onClick={startCamera} className="min-h-[48px] rounded-xl text-sm font-bold bg-[#172b49] border border-[#3b5985] text-[#f6ebd5] cursor-pointer">
            카메라 켜기
          </button>
        )}
        {mode === 'manual' ? (
          <button type="button" onClick={startSensors} className="min-h-[44px] rounded-xl text-xs font-bold bg-[#10203a] border border-[#2b446a] text-[#cbd8eb] flex items-center justify-center gap-1 cursor-pointer">
            <Smartphone className="w-3.5 h-3.5" /> 센서 모드로
          </button>
        ) : (
          <button type="button" onClick={() => { stopSensors(); setMode('manual'); }} className="min-h-[44px] rounded-xl text-xs font-bold bg-[#10203a] border border-[#2b446a] text-[#cbd8eb] flex items-center justify-center gap-1 cursor-pointer">
            <Hand className="w-3.5 h-3.5" /> 손가락 모드로
          </button>
        )}
        <button type="button" onClick={reset} className="min-h-[44px] rounded-xl text-xs font-bold bg-[#10203a] border border-[#2b446a] text-[#cbd8eb] flex items-center justify-center gap-1 cursor-pointer">
          <RotateCcw className="w-3.5 h-3.5" /> 처음으로
        </button>
      </div>

      {/* 보정 */}
      {mode === 'sensor' && (
        <div className="p-3 rounded-xl bg-[#0d1d33] border border-[#233b61] space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffd880]">
            <Crosshair className="w-4 h-4" /> 기준 별 맞추기 (나침반 보정)
          </div>
          <p className="text-[11px] text-[#9fb6d6] leading-relaxed">
            실제 하늘에서 찾은 밝은 별을 골라, 그 별을 화면 가운데 조준선에 맞춘 뒤 [보정]을 누르세요.
          </p>
          <div className="flex gap-2">
            <select
              value={calibTarget}
              onChange={e => setCalibTarget(e.target.value)}
              className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-[#081322] border border-[#264169] text-xs text-[#f6ebd5]"
            >
              <option value="">지금 보이는 밝은 별 선택…</option>
              {visibleBright.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.con} ({getCompassDirection(s.az)} {s.alt.toFixed(0)}°)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={calibrate}
              disabled={!calibTarget}
              className="px-3 rounded-lg bg-[#e4bb70] text-[#1c1204] text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              보정
            </button>
          </div>
          <label className="block text-[11px] text-[#c8dcf5]">
            방위 보정 {headingOffset > 0 ? '+' : ''}{headingOffset.toFixed(1)}°
            <input type="range" min={-60} max={60} step={0.5} value={headingOffset} onChange={e => setHeadingOffset(Number(e.target.value))} className="w-full accent-[#e4bb70]" />
          </label>
        </div>
      )}

      {/* 설정 */}
      <div className="p-3 rounded-xl bg-[#0b1729] border border-[#1e3352] space-y-2 text-[11px] text-[#c8dcf5]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} className="accent-[#e4bb70]" /> 별자리 선
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={redMode} onChange={e => setRedMode(e.target.checked)} className="accent-[#e4bb70]" /> 빨간 야간 모드 (눈부심 줄이기)
          </label>
        </div>
        <label className="block">
          화면 크기 맞춤 (세로 화각 {vfov}°) — 표시된 별 간격이 실제보다 넓거나 좁으면 조절하세요
          <input type="range" min={35} max={90} step={1} value={vfov} onChange={e => setVfov(Number(e.target.value))} className="w-full accent-[#e4bb70]" />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#ffd880]" /> {locationLabel}</span>
          <button type="button" onClick={useMyLocation} className="px-2.5 py-1.5 rounded-lg bg-[#172b49] border border-[#3b5985] text-[11px] text-[#f6ebd5] cursor-pointer">
            내 위치로 계산
          </button>
        </div>
        <div className="flex items-center gap-1 text-[#8fa7c7]">
          <Compass className="w-3.5 h-3.5" /> 기준 시각 {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} (자동 갱신) · 대기 굴절·행성·달 미포함
        </div>
      </div>

      {/* 촬영 결과 */}
      {capture && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b172a] border border-[#d8b568]/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#ffd880]">별 사진</span>
              <button type="button" onClick={() => setCapture(null)} className="p-1 text-[#9fb6d6] cursor-pointer" aria-label="닫기">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={capture.url} alt="별 이름이 표시된 하늘 사진" className="w-full rounded-lg" />
            <p className="text-[11px] text-[#c8dcf5]">{capture.caption}</p>
            <a
              href={capture.url}
              download={`별밤학교-별찾기-${now.toISOString().slice(0, 16).replace(/[:T]/g, '')}.jpg`}
              className="print-allow w-full min-h-[46px] rounded-xl font-bold text-sm text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d] flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> 기기에 저장하기
            </a>
            <p className="text-[10px] text-[#8fa7c7]">사진은 이 기기에만 저장되며 서버로 보내지 않아요. 별빛 수업 완료와는 별개입니다.</p>
          </div>
        </div>
      )}
      {onClose && null}
    </div>
  );
};
