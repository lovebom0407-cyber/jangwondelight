import React from 'react';
export function DeviceStorageNotice() {
  return <aside className="mb-5 rounded-2xl border border-[#a1ddd5]/25 bg-[#102039] p-4 text-left" aria-label="기기 저장 안내" data-device-storage>
    <p className="font-bold text-sm text-[#a1ddd5]">📱 사진과 기록은 이 기기에 보관해요</p>
    <p className="text-xs text-[#cbd8eb] leading-relaxed mt-2">사진·미션·이용권은 자동 전송하지 않아요. 보호자가 최종 PDF 제출을 누를 때만 선생님께 보내요. 같은 휴대폰의 같은 브라우저에서 이름으로 이어서 할 수 있어요.</p>
    <details className="mt-2 text-xs text-[#b8c8dd]"><summary>보호자 · 기록 보관 안내</summary><p className="leading-relaxed mt-2">다른 기기에는 자동으로 옮겨지지 않아요. 사이트 데이터를 지우거나 시크릿 모드를 종료하면 기록이 사라질 수 있어요. 행사 사진은 앨범에도 보관해 주세요.</p></details>
  </aside>;
}
