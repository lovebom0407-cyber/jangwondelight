import React,{useState,useRef,useEffect} from 'react';
import {ParticipantState} from '../../types';
import {CharacterFull} from '../characterAssets';
import {initialBattle,castSpell,foeTurn,SPELLS,isWon,isLost,retryBattle,BattleState} from '../../services/battle';
export function JuniorFinale({state,onUpdateState,onNavigate}:{state:ParticipantState;onUpdateState:(p:Partial<ParticipantState>)=>void;onNavigate:(s:any)=>void}){
 const key=`jangwon-junior-final:${state.participantId}`;
 const[st,setSt]=useState<BattleState>(()=>{let level=2;try{level=Math.max(2,Math.min(3,Number(localStorage.getItem(key))||2))}catch{}return initialBattle(level);});
 const[message,setMessage]=useState('함께 별빛을 밝혀 볼까?');const[busy,setBusy]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const hit=()=>{if(busy||isWon(st)||isLost(st))return;setBusy(true);let next=castSpell(st,SPELLS[0],'perfect').state;if(!isWon(next))next=foeTurn(next,true).state;setSt(next);setMessage(isWon(next)?'해냈어요! 우리 가족 별빛 최고!':isLost(next)?'괜찮아! 더 쉽게 다시 해 보자.':'반짝! 한 번 더 밝혀 줘!');if(isLost(next))try{localStorage.setItem(key,'3')}catch{}timer.current=setTimeout(()=>setBusy(false),450);};
 const finish=()=>{onUpdateState({story:{...state.story,introDone:true,finaleDone:true,scene:null}});onNavigate('map');};
 return <div className="junior-ui space-y-5 pb-12" data-experience="junior-final"><button type="button" className="junior-secondary" onClick={()=>onNavigate('map')}>← 잠깐 쉬기</button><h1>{isWon(st)?'⭐ 별빛을 지켰어요!':'마지막 별빛 마법!'}</h1><div className="junior-duel-art"><CharacterFull speaker={isWon(st)?'해리':'볼드모트'} height={200}/></div><p className="junior-instruction" role="status">{message}</p><div className="junior-meter"><label>어둠<progress max={st.foeMax} value={st.foe}/></label><label>우리 별빛<progress max={100} value={st.light}/></label></div>{isWon(st)?<button type="button" className="junior-main" onClick={finish}>🎉 모험을 마쳤어요!</button>:isLost(st)?<button type="button" className="junior-main" onClick={()=>{setSt(retryBattle(st));setBusy(false);setMessage('이번에는 더 쉽게! 할 수 있어!');}}>🔁 더 쉽게 다시 하기</button>:<button type="button" className="junior-main" onClick={hit} disabled={busy}>✨ 별빛 마법 쏘기</button>}<p className="junior-parent">다치지 않는 마법 놀이예요. 천천히 눌러요.</p></div>;
}
