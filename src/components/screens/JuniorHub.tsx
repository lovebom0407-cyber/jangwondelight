import React from 'react';
import { FestivalGuide } from '../FestivalGuide';
import { ParticipantState } from '../../types';
import { getMissions } from '../../data/storyData';
import { CharacterFace } from '../characterAssets';
import { fillName } from '../../services/script';
import { unusedCount } from '../../services/rewards';
interface Props { state: ParticipantState; onNavigate:(s:any)=>void; onSelectMission:(i:number)=>void; onResumeDialogue:()=>void; onStartFinale:()=>void; }
const PICTURES=['💬','👨‍👩‍👧','🧥','🎃','📸','🤖','🤝'];
const LABELS=['한마디 남기기','가족 사진','의상 빌리기','호박바구니','네컷사진','AI 놀이','가족과 체험'];
export function JuniorHub({state,onNavigate,onSelectMission,onStartFinale}:Props){
 const missions=getMissions('junior');
 const done=new Set(state.completed);const next=[0,1,2,3,4,5,6].find(i=>!done.has(i));
 return <div className="junior-ui space-y-6 pb-24" data-experience="junior">
  <header className="junior-welcome"><CharacterFace speaker="헤드위그" size={80} framed/><div><p>{fillName('{nameA}, 반가워!', state.name)}</p><h1>별빛을 모아 볼까?</h1></div></header>
  <div className="junior-stars" aria-label={`${done.size}개 미션 완료`}>{missions.map((_,i)=><span key={i} className={done.has(i)?'earned':''}>{done.has(i)?'⭐':'☆'}</span>)}</div>
  <p className="junior-instruction">사진 찍고 → 별빛 받고 → 선물 받자!</p>
  <button type="button" data-primary-treasure className="junior-main" onClick={()=>onNavigate('treasure')}><span>🔦🗺️</span><b>별빛 보물찾기!</b><small>가족과 보물을 찾아요</small></button>
  <FestivalGuide />
  {next!==undefined ? <button type="button" className="junior-secondary junior-next-mission" onClick={()=>onSelectMission(next)}><span>{PICTURES[next]}</span><b>{next===0?'한마디 쓰러 가기':`${LABELS[next]} 찍으러 가기`}</b><small className="junior-booth-name" data-junior-booth={next}>📍 {missions[next].place}</small><small>{next===0?'패들렛에 글 쓰기 → 인증샷':'가족과 함께 해요'}</small></button> : <button type="button" className="junior-secondary junior-next-mission" onClick={()=>state.story.finaleDone?onNavigate('portfolio'):onStartFinale()}><span>✨</span><b>{state.story.finaleDone?'우리 가족 PDF 보기':'마지막 별빛 마법!'}</b><small>{state.story.finaleDone?'사진 7장과 추억을 간직해요':'볼드모트와 만나러 가요'}</small></button>}
  <div className="junior-actions"><button type="button" onClick={()=>onNavigate('junior-sky')}><span>🔭</span><b>하늘 보기</b></button><button type="button" onClick={()=>onNavigate('tickets')}><span>🎁</span><b>선물 보기</b><small>{unusedCount(state)>0?`${unusedCount(state)}장 있어요`:'별빛을 모아요'}</small></button></div>
  <details className="junior-missions"><summary>📷 사진 미션 모두 보기</summary><div className="junior-grid">{missions.map((m,i)=><button type="button" key={i} data-junior-mission={i} onClick={()=>onSelectMission(i)}><span>{done.has(i)?'⭐':PICTURES[i]}</span><b>{i+1}. {LABELS[i]}</b><small className="junior-booth-name" data-junior-booth={i}>📍 {m.place}</small><small>{done.has(i)?'잘했어요!':i===0?'한마디 쓰는 모습':'사진 한 장'}</small></button>)}</div></details>
  <button type="button" className="junior-secondary" onClick={()=>onNavigate('arcade')}>🧹 마법 게임 하기</button>
  <p className="junior-parent">보호자와 함께 이동해요. 도움은 의상대여 장소의 선생님께!</p>
  <button type="button" className="field-back" onClick={()=>onNavigate('start')}>학년 다시 선택</button>
 </div>;
}
