/**
 * QR 인식 도우미
 * - 브라우저 내장 BarcodeDetector(안드로이드 크롬 등)를 우선 쓰고,
 *   없으면(iPhone Safari 등) jsQR 로 직접 인식합니다.
 * - 영상 프레임(실시간)과 사진 파일(촬영) 모두 지원합니다. 서버로 이미지를 보내지 않습니다.
 */
import jsQR from 'jsqr';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue?: string }[]> };

let nativeDetector: Detector | null | undefined;

async function getNativeDetector(): Promise<Detector | null> {
  if (nativeDetector !== undefined) return nativeDetector;
  nativeDetector = null;
  try {
    const BD = (globalThis as any).BarcodeDetector;
    if (BD) {
      const formats: string[] = await BD.getSupportedFormats();
      if (formats.includes('qr_code')) nativeDetector = new BD({ formats: ['qr_code'] });
    }
  } catch {
    nativeDetector = null;
  }
  return nativeDetector ?? null;
}

function decodeWithJsQr(source: CanvasImageSource, width: number, height: number, canvas?: HTMLCanvasElement): string | null {
  if (!width || !height) return null;
  // 큰 이미지는 축소해서 속도 확보 (긴 변 1280px)
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const c = canvas || document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const res = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
  return res?.data ? res.data : null;
}

/** 실시간 영상 한 프레임에서 QR 읽기 */
export async function decodeQrFromVideo(video: HTMLVideoElement, scratch?: HTMLCanvasElement): Promise<string | null> {
  if (!video || video.readyState < 2) return null;
  const det = await getNativeDetector();
  if (det) {
    try {
      const r = await det.detect(video);
      if (r.length && r[0].rawValue) return r[0].rawValue;
      return null;
    } catch {
      // 일부 기기에서 detect 실패 → jsQR 로 계속
    }
  }
  return decodeWithJsQr(video, video.videoWidth, video.videoHeight, scratch);
}

/** 촬영한 사진(또는 앨범 사진) 파일에서 QR 읽기 */
export async function decodeQrFromFile(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('사진을 열 수 없습니다.'));
      img.src = url;
    });
    const det = await getNativeDetector();
    if (det) {
      try {
        const r = await det.detect(img);
        if (r.length && r[0].rawValue) return r[0].rawValue;
      } catch {}
    }
    return decodeWithJsQr(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ZepLinkCheck {
  ok: boolean; // 열어도 되는 http(s) 주소인지
  url: string;
  host: string;
  isZep: boolean; // zep.us 도메인 여부
  matchesConfigured: boolean | null; // 운영실 등록 링크와 같은지 (등록 없으면 null)
  message: string;
}

/** QR 내용이 안전하게 열 수 있는 ZEP QUIZ 링크인지 확인 */
export function checkZepQuizLink(raw: string, configuredUrl?: string): ZepLinkCheck {
  const text = String(raw || '').trim();
  let u: URL | null = null;
  try {
    u = new URL(text);
  } catch {
    return { ok: false, url: text, host: '', isZep: false, matchesConfigured: null, message: '퀴즈 QR이 아니에요. 다시 찍어 주세요.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, url: text, host: u.host, isZep: false, matchesConfigured: null, message: '열 수 없는 형식의 주소입니다.' };
  }
  const host = u.hostname.toLowerCase();
  const isZep = host === 'zep.us' || host.endsWith('.zep.us');
  let matchesConfigured: boolean | null = null;
  if (configuredUrl) {
    try {
      const c = new URL(configuredUrl);
      matchesConfigured = c.hostname.toLowerCase() === host && c.pathname.replace(/\/$/, '') === u.pathname.replace(/\/$/, '');
    } catch {
      matchesConfigured = null;
    }
  }
  let message = isZep ? 'ZEP 퀴즈를 찾았어요!' : `ZEP 주소가 아니에요 (${host}). 선생님께 물어보세요.`;
  if (isZep && matchesConfigured === false) message = '다른 수업의 퀴즈 같아요. QR을 다시 확인해 주세요.';
  if (isZep && matchesConfigured === true) message = '이 수업의 ZEP 퀴즈가 맞아요!';
  return { ok: true, url: u.toString(), host, isZep, matchesConfigured, message };
}
