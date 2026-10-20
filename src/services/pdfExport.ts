/**
 * 포트폴리오 PDF 만들기 (인쇄 창 없이 바로 PDF 파일 생성)
 * - 화면의 각 페이지(section)를 그림으로 떠서 A4 PDF로 묶습니다.
 * - 저장: Claude 미리보기 안이면 downloads 기능, 그 밖에는 일반 파일 다운로드.
 *   휴대폰에서는 공유하기(파일 앱·카톡 등)로도 보낼 수 있습니다.
 */
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';

export async function buildPortfolioPdf(root: HTMLElement): Promise<Blob> {
  const pages = Array.from(root.querySelectorAll<HTMLElement>(':scope > section'));
  const targets = pages.length ? pages : [root];
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = 210;
  const pageH = 297;
  const margin = 8;

  for (let i = 0; i < targets.length; i++) {
    const el = targets[i];
    // 휴대폰 폭이 아니라 A4 비율에 맞는 넓은 폭(760px)으로 잠시 펼쳐서 캡처
    const prev = el.style.cssText;
    el.style.width = '760px';
    el.style.maxWidth = 'none';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let dataUrl = '';
    try {
      dataUrl = await toJpeg(el, {
        quality: 0.92,
        pixelRatio: 2,
        backgroundColor: '#fffdf8',
        skipFonts: true,
        cacheBust: false,
        width: el.scrollWidth,
        height: el.scrollHeight
      });
    } finally {
      el.style.cssText = prev;
    }
    const img = await loadImage(dataUrl);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', (pageW - w) / 2, margin, w, h, undefined, 'FAST');
  }
  return pdf.output('blob');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('이미지를 만들지 못했어요.'));
    im.src = src;
  });
}

export type SaveOutcome = 'saved' | 'downloaded' | 'declined' | 'failed';

/** 파일 저장: 미리보기 downloads 기능 → 일반 다운로드 순서로 시도 */
export async function saveBlob(blob: Blob, filename: string): Promise<SaveOutcome> {
  // 1) Claude 미리보기(아티팩트) 안
  try {
    const claude = (window as any).claude;
    if (claude?.use) {
      const downloads = await Promise.race([
        claude.use('downloads'),
        new Promise(r => setTimeout(() => r(null), 3000))
      ]);
      if (downloads) {
        try {
          await (downloads as any).save({ filename, data: blob });
          return 'saved';
        } catch (e: any) {
          if (e?.code === 'declined') return 'declined';
        }
      }
    }
  } catch {}

  // 2) 일반 브라우저 다운로드
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** 휴대폰 공유하기 (파일 앱·메신저로 보내기) */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return true;
    }
  } catch {}
  return false;
}

export const canShareFiles = (): boolean => {
  try {
    const nav: any = navigator;
    return Boolean(nav.canShare && nav.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] }));
  } catch {
    return false;
  }
};
