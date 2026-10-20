import React,{useEffect,useRef,useState} from 'react';
import {FacelessSortingHat} from '../characterAssets';
import type {ParticipantState} from '../../types';
import {HOUSES} from '../../data/storyData';
import {assignEventHouse} from '../../services/houseAssignment';
interface Props{state:ParticipantState;onUpdateState:(p:Partial<ParticipantState>)=>void;onNavigate:(s:any)=>void;}
type Assignment=Awaited<ReturnType<typeof assignEventHouse>>;
export function ThinkingScreen({state,onUpdateState,onNavigate}:Props){
 const junior=state.experienceMode==='junior';
 const thoughts=junior?[`${state.name}, 반가워! 장원 별밤학교에 온 걸 환영해.`,'흐음… 너의 마음속에는 어떤 별이 빛나고 있을까?']:[`${state.name}, 장원 별밤학교에 온 걸 환영한다!`,'흐음… 새로운 모험을 향한 호기심이 반짝이는구나.','가족과 친구를 아끼는 마음까지… 이제 너의 별을 찾았단다!'];
 const [index,setIndex]=useState(0),[assignment,setAssignment]=useState<Assignment|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const callbacks=useRef({onUpdateState,onNavigate});callbacks.current={onUpdateState,onNavigate};const finished=useRef(false);
 const needsPhoto=!state.photo&&!state.sortingPhotoSkipped;
 useEffect(()=>{
  if(needsPhoto){callbacks.current.onNavigate('camera');return;}
  const controller=new AbortController();setAssignment(null);setError('');setIndex(0);finished.current=false;
  assignEventHouse(state,controller.signal).then(value=>{if(!controller.signal.aborted)setAssignment(value)}).catch(()=>{if(!controller.signal.aborted)setError('모자가 잠깐 쉬고 있어요. 다시 눌러 배정을 이어 가요.');});
  return()=>controller.abort();
 },[state.participantId,state.name,attempt,needsPhoto]);
 const waiting=index>=thoughts.length&&!assignment;
 const last=index>=thoughts.length&&!!assignment;
 const text=index<thoughts.length?thoughts[index]:assignment?`그래! ${state.name}, 너의 기숙사는 ${HOUSES[assignment.house].name}! 함께 멋진 모험을 떠나렴.`:'흐으음… 마음속 별빛을 조금 더 살펴볼까?';
 useEffect(()=>{
  if(error||waiting||needsPhoto)return;
  const timer=setTimeout(()=>{
   if(last&&assignment){if(finished.current)return;finished.current=true;callbacks.current.onUpdateState(assignment);callbacks.current.onNavigate('assigned');}
   else setIndex(n=>n+1);
  },last?3600:2800);
  return()=>clearTimeout(timer);
 },[text,error,waiting,needsPhoto,last]);
 return <div className={`${junior?'junior-ui ':''}space-y-5 text-center pb-16 animate-fade-in`} data-sorting-speaking>
  <header className="space-y-2"><p className="sky-kicker">장원 별밤학교 · 기숙사 배정</p><h1 className="font-serif text-2xl font-bold">쉿! 모자가 생각 중이에요 🎩</h1></header>
  {state.photo&&<div className="relative w-full max-w-[210px] mx-auto aspect-[3/4] rounded-3xl overflow-hidden border-2 border-[#d8b568]"><img src={state.photo} alt="마법모자를 쓴 입학 사진" className="w-full h-full object-cover"/><span className="absolute bottom-2 left-2 right-2 rounded-full bg-[#071324]/80 px-3 py-2 text-sm">{state.name}의 마법 입학 사진</span></div>}
  <div className="flex flex-col items-center gap-2"><FacelessSortingHat size={state.photo?90:210} className={!error?'sorting-hat-speaking':''}/><div className="sorting-hat-bubble w-full" role="status" aria-live="polite" aria-atomic="true"><p className="text-xs font-bold text-[#8b5f28] mb-2">마법 분류모자</p><p data-hat-line className="font-serif text-lg font-bold leading-relaxed">“{text}”</p></div></div>
  {error?<div role="alert" className="space-y-3"><p>{error}</p><button type="button" className="field-primary w-full" onClick={()=>setAttempt(n=>n+1)}>모자에게 다시 부탁하기</button></div>:<p className="text-sm text-[#b8c8dd]">{waiting?'모자가 나의 별을 찾고 있어요…':'모자의 말풍선을 읽어 봐요.'}</p>}
  <button type="button" className="field-back" onClick={()=>onNavigate('camera')}>📷 사진 다시 찍기</button>
 </div>;
}
