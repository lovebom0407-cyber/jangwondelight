import {ConstellationSources} from '../ConstellationSources';
import { ObservationSessions } from '../ObservationSessions';
import React,{useState} from 'react';
import { ParticipantState } from '../../types';
import { CONSTELLATIONS } from '../../services/celestialMath';
import { SKY_VIDEOS } from '../../data/fieldGuide';
interface Props {state:ParticipantState;onNavigate:(s:any)=>void;onUpdateState:(p:Partial<ParticipantState>)=>void;}
export function JuniorSkyScreen({state,onNavigate,onUpdateState}:Props){
 const[view,setView]=useState<'home'|'stars'|'observe'|'video'>('home');const[selected,setSelected]=useState<string|null>(null);const[step,setStep]=useState(0);const[play,setPlay]=useState(false);
 const c=CONSTELLATIONS.find(c=>c.id===selected);const finished=!!c&&step>=c.lines.length;
 const nextIndex=c&&!finished?c.lines[step][1]:null;
 const pick=(id:string)=>{setSelected(id);setStep(0);setView('stars');};
 const connect=(i:number)=>{if(!c||finished||c.lines[step][1]!==i)return;const n=step+1;setStep(n);if(n===c.lines.length)onUpdateState({observatory:{...(state.observatory||{completedConstellations:[]}),completedConstellations:[...new Set([...(state.observatory?.completedConstellations||[]),c.id])],lastViewedConstellation:c.id}});};
 return <div className="junior-ui space-y-5 pb-24" data-experience="junior-sky">
  <button type="button" className="junior-secondary" onClick={()=>view==='home'?onNavigate('map'):(setView('home'),setSelected(null),setPlay(false))}>← {view==='home'?'사진 미션으로':'다른 하늘 놀이'}</button>
  {view==='home'&&<><h1>🔭 별 보러 갈까?</h1><button type="button" className="junior-main" onClick={()=>setView('stars')}><span>⭐</span><b>별 모양 만들기</b><small>반짝이는 별을 눌러요</small></button><div className="junior-actions"><button type="button" onClick={()=>setView('observe')}><span>🔭</span><b>진짜 별 보기</b></button><button type="button" onClick={()=>setView('video')}><span>🌙</span><b>달 영상 보기</b></button></div></>}
  {view==='stars'&&!c&&<><h1>어떤 별을 이을까?</h1><div className="junior-grid">{CONSTELLATIONS.map(c=><button type="button" key={c.id} data-junior-constellation={c.id} onClick={()=>pick(c.id)}><span>{c.id==='cassiopeia'?'W':c.id==='pegasus'?'◇':'✦'}</span><b>{c.koreanName}</b><small>{c.region === 'west' ? '서쪽 하늘' : c.region === 'north' ? '북쪽 하늘' : '가을 하늘'}</small></button>)}</div></>}
  {view==='stars'&&c&&<><h1>{c.koreanName}</h1><p>⭐ 별 {c.stars.length}개 · 선 {c.lines.length}개</p><p className="junior-instruction">{finished?'⭐ 별자리를 완성했어요!':'크게 반짝이는 별을 눌러요!'}</p><svg viewBox="0 0 100 100" className="junior-star-board" role="group" aria-label={`${c.koreanName} 별 잇기`}>
   {c.lines.map(([a,b],i)=><line key={i} x1={c.stars[a].puzzleX} y1={c.stars[a].puzzleY} x2={c.stars[b].puzzleX} y2={c.stars[b].puzzleY} stroke={i<step?'#ffe095':'#2e4663'} strokeWidth={i<step?1.6:.6} strokeDasharray={i<step?'':'2 2'}/>)}
   {c.stars.map((s,i)=>({s,i})).sort((a,b)=>Number(a.i===nextIndex)-Number(b.i===nextIndex)).map(({s,i})=>{const next=!finished&&c.lines[step][1]===i;return <g key={s.id} role={next?'button':'img'} tabIndex={next?0:-1} data-junior-star={i} aria-label={`${s.name}${next?' 다음 별':''}`} onClick={()=>connect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connect(i);}}}><circle cx={s.puzzleX} cy={s.puzzleY} r={Math.max(.5,1.3-s.mag*.12)} fill={next?'#ffe095':'#dbeafe'} stroke={next?'#fff3cf':'none'} strokeWidth={.3} className={next?'junior-star-glow':''}/></g>})}
  </svg>{!finished&&<button type="button" data-next-star={nextIndex} className="junior-main" onClick={()=>connect(nextIndex!)}>✨ 반짝이는 별 잇기<small>선 {step+1} / {c.lines.length}</small></button>}<ConstellationSources constellation={c}/>{finished&&<button type="button" className="junior-main" onClick={()=>setSelected(null)}>🎉 다른 별도 만들기</button>}<details className="field-learning"><summary>가족과 읽어 봐요</summary><p className="p-4 text-base leading-relaxed">{c.findingGuide}</p></details></>}
  {view==='observe'&&<><h1>망원경으로 별을 봐요</h1><ObservationSessions grade={state.grade}/><div className="junior-observe"><span>🔭</span><p>10월 21일 저녁<br/><b>7시 50분~9시</b><br/>운동장 관측 부스로 와요.</p></div><ol className="junior-promises"><li>👨‍👩‍👧 가족 손잡고 걸어요.</li><li>🌙 휴대폰 불빛을 낮춰요.</li><li>👩‍🏫 선생님이 알려 주실 때 봐요.</li></ol><p>구름이 많으면 안 보일 수 있어요.<br/>오늘 볼 별은 선생님이 알려 주세요.</p></>}
  {view==='video'&&<><h1>🌙 달로 떠나 볼까?</h1><div className="field-video-frame">{play?<iframe title="NASA 달 여행" src={`https://www.youtube-nocookie.com/embed/${SKY_VIDEOS[0].id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button type="button" className="junior-main" onClick={()=>setPlay(true)}>▶ 달 영상 보기</button>}</div><p>울퉁불퉁한 달의 모습을 찾아봐요.</p><a className="junior-secondary" href={`https://www.youtube.com/watch?v=${SKY_VIDEOS[0].id}`} target="_blank" rel="noopener noreferrer">영상이 안 나오면 여기로 ↗</a><small>NASA Goddard · 영어 영상 · 약 5분</small></>}
 </div>;
}
