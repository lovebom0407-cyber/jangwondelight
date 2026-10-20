import React from 'react';
import type {ConstellationDef} from '../services/celestialMath';
import {CONSTELLATION_SOURCE as source} from '../data/constellationReference';
export function ConstellationSources({constellation:c}:{constellation:ConstellationDef}) {
 return <details className="field-learning"><summary>성도 기준 · {c.stars.length}개 별 확인하기</summary><div className="field-learning-body space-y-2"><p>{source.note}</p><p>북쪽은 위, 동쪽은 왼쪽. 실제 별의 좌표를 같은 축척으로 옮겼어요. 가까이 붙어 있는 별은 아래 별 목록에서 골라 이을 수 있어요.</p><p>위치·밝기: ESA Hipparcos · ICRS / J1991.25. 별 이름: Yale Bright Star Catalogue.</p><a className="block underline min-h-[44px]" href={c.chartUrl} target="_blank" rel="noopener noreferrer">{c.koreanName} IAU 게시 성도 보기 ↗</a><p className="text-xs">{source.figureCredit} · 연결선 재구성 · <a href={source.figureLicenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{source.figureLicense}</a></p></div></details>;
}
