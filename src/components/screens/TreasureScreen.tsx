import React, {useState} from 'react';
import type {ParticipantState} from '../../types';
export function TreasureScreen({state,onNavigate}:{state:ParticipantState;onNavigate:(s:any)=>void}) {
 const [large,setLarge]=useState(false); const junior=state.experienceMode==='junior';
 return <div className={`${junior?'junior-ui':''} space-y-5 pb-28`} data-treasure>
  <button type="button" className={junior?'junior-secondary':'field-back'} onClick={()=>onNavigate(state.house===null?'start':'map')}>← {junior?'사진 미션으로':'탐험으로'}</button>
  <header className="space-y-2"><p className="text-[#e4bb70] font-bold">BLACK LIGHT ADVENTURE</p><h1 className="text-3xl font-black text-[#ffe095]">🔦 별빛 보물찾기</h1><p className="text-lg">가족과 함께, 빛으로 숨은 보물을 찾아요!</p></header>
  <div className="rounded-3xl border-2 border-[#e4bb70] bg-[#17263d] p-5 text-center space-y-2"><p className="text-2xl font-black text-[#ffe095]">👨‍👩‍👧 가족당 최대 3개</p><p className="text-xl font-bold">⏰ 오후 6시까지</p><p><b>운영본부</b>에서 가장 높은 등급의 보물 <b>1개</b>를 선물로 바꿔요.<br/>18:00 이후에는 교환할 수 없어요.</p></div>
  <section className="rounded-2xl border border-[#e4bb70] bg-[#17263d] p-5 space-y-3" aria-labelledby="treasure-shapes-title">
   <h2 id="treasure-shapes-title" className="text-xl font-black text-[#ffe095]">🔎 보물은 총 5가지 모양이에요!</h2>
   <p className="text-lg">보물은 눈꽃, 알파벳 대문자 J와 W, 초승달, 별 이렇게 총 5가지 모양이에요!</p>
   <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center" aria-label="다섯 가지 보물 모양">{[['❄️','눈꽃'],['J','대문자 J'],['W','대문자 W'],['☾','초승달'],['★','별']].map(([symbol,label])=><li key={label} className="rounded-xl bg-[#102039] border border-[#e4bb70]/40 p-3"><span aria-hidden="true" className="block text-3xl font-black text-[#ffe095]">{symbol}</span><b className="block text-base mt-2">{label}</b></li>)}</ul>
  </section>
  <section className="rounded-2xl border border-[#e4bb70] bg-[#263650] p-5 space-y-2" aria-labelledby="treasure-grade-title"><h2 id="treasure-grade-title" className="text-xl font-black text-[#ffe095]">✨ 가장 높은 등급 1개를 선물로!</h2><p className="text-lg">보물마다 등급이 있어요. <b>찾은 보물 3개 중 가장 높은 등급의 보물 1개를 선물로 바꿔 드려요.</b></p></section>
  <ol className="space-y-3 text-lg" aria-label="보물찾기 방법">
   <li className="field-paper"><b>1. 🔦 블랙라이트 준비!</b><p>입장할 때 받은 블랙라이트를 들고 가족과 출발해요.</p></li>
   <li className="field-paper"><b>2. 🗺️ 금빛 점선 안에서 찾기!</b><p>아래 지도에 표시된 범위 안을 블랙라이트로 비춰 봐요. 눈꽃·J·W·초승달·별 모양을 찾아요. 주차장에는 들어가지 않아요.</p></li>
   <li className="field-paper"><b>3. 📷 직접 가져오거나 사진 찍기!</b><p>가져올 수 있는 보물은 직접 가져오고, 가져올 수 없는 보물은 사진을 찍어 오세요!</p></li>
   <li className="field-paper"><b>4. 🎁 운영본부에서 교환!</b><p>가족당 최대 3개를 찾고, 보물이나 사진을 오후 6시까지 운영본부에 보여 주세요. 찾은 보물 3개 중 가장 높은 등급의 보물 1개를 선물로 바꿔 드려요.</p></li>
  </ol>
  <section className="space-y-3" aria-labelledby="treasure-map-title"><h2 id="treasure-map-title" className="text-2xl font-bold">🗺️ 우리 가족 보물지도</h2><p>금빛 점선 안쪽이 탐색 가능 구역이에요. 주차장은 탐색 구역에서 제외돼요.</p>
   <div className="rounded-2xl bg-[#071324] border border-[#e4bb70]/50 overflow-auto" tabIndex={0} aria-label={large?'확대 지도, 좌우로 밀어서 보기':'보물지도'}><img src="/assets/treasure-map-designed.svg" alt="장원초등학교 보물찾기 지도. 운동장과 학교 안 주변 길의 탐색 범위가 금빛 점선으로 표시되어 있으며, 주차장은 점선 밖 탐색 제외 구역입니다." className="block max-w-none h-auto" style={{width:large?'200%':'100%'}}/></div>
   <button type="button" className={junior?'junior-secondary':'field-primary'} aria-expanded={large} onClick={()=>setLarge(v=>!v)}>{large?'🔍 지도 전체 보기':'🔍 지도 크게 보기'}</button>
   {large&&<p>지도를 옆으로 밀어서 구석까지 확인해요.</p>}
   <a href="/assets/treasure-map-designed.svg" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center underline text-[#ffe095]">보물지도 크게 열기 ↗</a>
  </section>
  <div className="field-paper space-y-2"><h2 className="text-xl font-bold">약속하고 출발해요 🤝</h2><p>🔦 블랙라이트를 눈에 비추지 않아요.</p><p>👨‍👩‍👧 가족과 함께, 천천히 걸어요.</p><p>🗺️ 지도 범위 안에서 찾아요. 주차장과 학교 밖 도로로 나가지 않아요.</p></div>
 </div>;
}
