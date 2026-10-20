import React, { useState } from 'react';

const GUIDE_IMAGE = '/assets/festival-guide-20261020.png';

export function FestivalGuide() {
  const [open, setOpen] = useState(false);
  const [large, setLarge] = useState(false);
  return <details className="festival-guide" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>
      <span aria-hidden="true">🗺️</span>
      <span><b>행사장 안내도</b><small>부스 위치와 운영 시간을 한눈에 봐요</small></span>
      <span className="festival-guide-arrow" aria-hidden="true">⌄</span>
    </summary>
    {open && <div className="festival-guide-body">
      <p>가족과 함께 갈 부스를 찾아봐요. 크게 보면 작은 글씨도 읽을 수 있어요.</p>
      <div className="festival-guide-scroll" tabIndex={0} role="region" aria-label={large ? '확대된 행사장 안내도, 좌우로 밀어서 보기' : '행사장 안내도 그림'}>
        <img src={GUIDE_IMAGE} width={1585} height={992} alt="2026 장원 별밤학교 축제 안내도. 운영본부·의상대여·응급상황대응 부스, 네컷사진존, 페이스페인팅존, AI 체험존, 성과공유 전시부스, 분식존, 바비큐존, 천체관측존과 식사장소를 안내합니다." style={{ width: large ? '300%' : '100%' }} decoding="async" />
      </div>
      <button type="button" className="field-primary" aria-expanded={large} onClick={() => setLarge(v => !v)}>{large ? '🔍 안내도 전체 보기' : '🔍 안내도 크게 보기'}</button>
      {large && <p>그림을 좌우로 밀어서 원하는 부스를 확인해요.</p>}
      <div className="festival-guide-links">
        <a href={GUIDE_IMAGE} target="_blank" rel="noopener noreferrer">원본 크게 열기 ↗</a>
        <a href={GUIDE_IMAGE} download="2026_장원_별밤학교_행사장_안내도.png">안내도 저장하기 ↓</a>
      </div>
      <p className="festival-guide-note">현장 운영 상황에 따라 선생님의 안내를 따라 주세요.</p>
    </div>}
  </details>;
}
