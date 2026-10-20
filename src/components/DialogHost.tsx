import React, { useEffect, useState } from 'react';

/**
 * 앱 안에서 띄우는 확인/알림 창
 * window.confirm·alert 는 미리보기(iframe)·일부 앱 내 브라우저에서 막혀서 눌러도 아무 일이 없으므로 대신 사용.
 *   if (await confirmDialog('정말 지울까요?', { danger: true })) { ... }
 *   alertDialog('이름을 입력해 주세요!');
 */
interface Req {
  id: number;
  message: string;
  kind: 'confirm' | 'alert';
  okLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

let seq = 1;
const queue: Req[] = [];
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());

export function confirmDialog(message: string, opts: { okLabel?: string; cancelLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise(resolve => {
    queue.push({ id: seq++, message, kind: 'confirm', resolve, ...opts });
    notify();
  });
}

export function alertDialog(message: string): Promise<boolean> {
  return new Promise(resolve => {
    queue.push({ id: seq++, message, kind: 'alert', resolve });
    notify();
  });
}

export const DialogHost: React.FC = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const cur = queue[0];
  if (!cur) return null;
  const close = (v: boolean) => {
    queue.shift();
    cur.resolve(v);
    notify();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6" role="dialog" aria-modal="true" data-app-dialog={cur.kind}>
      <div className="w-full max-w-sm rounded-2xl bg-[#fdf3dc] text-[#1d1408] border-4 border-[#3a2c18] p-5 shadow-2xl space-y-4 animate-fade-in">
        <p className="text-[15px] font-bold leading-relaxed whitespace-pre-line">{cur.message}</p>
        <div className="flex gap-2">
          {cur.kind === 'confirm' && (
            <button type="button" data-dialog-cancel onClick={() => close(false)} className="flex-1 min-h-[48px] rounded-xl font-bold text-[#3a2814] bg-[#ead9b4] cursor-pointer">
              {cur.cancelLabel || '취소'}
            </button>
          )}
          <button
            type="button"
            data-dialog-ok
            onClick={() => close(true)}
            className={`flex-1 min-h-[48px] rounded-xl font-bold cursor-pointer ${cur.danger ? 'text-white bg-[#b91c1c]' : 'text-[#20170a] bg-gradient-to-r from-[#f4d79a] to-[#c7963d]'}`}
          >
            {cur.okLabel || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};
