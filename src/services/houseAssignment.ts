import type {ParticipantState} from '../types';
import {SORTING_POLICY_REVISION} from '../data/sortingPolicy';
export const HOUSE_ASSIGNMENT_REVISION=SORTING_POLICY_REVISION;
export function resumeSortingScreen(state:ParticipantState){
 if(state.house!==null&&state.houseAssignmentRevision===HOUSE_ASSIGNMENT_REVISION)return 'map' as const;
 return state.photo||state.sortingPhotoSkipped?'thinking' as const:'camera' as const;
}
export async function assignEventHouse(state:ParticipantState,signal?:AbortSignal){
 const controller=new AbortController();const abort=()=>controller.abort();
 if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,20000);
 try{
  const response=await fetch('/api/sorting',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,previousHouse:state.house}),signal:controller.signal});
  if(!response.ok)throw Error('모자의 배정을 확인하지 못했어요. 다시 눌러 주세요.');
  const data=await response.json() as {house?:unknown;revision?:unknown};
  if(typeof data.house!=='number'||!Number.isInteger(data.house)||data.house<0||data.house>3||data.revision!==HOUSE_ASSIGNMENT_REVISION)throw Error('기숙사 배정을 확인해 주세요.');
  return {house:data.house as number,houseAssignmentRevision:HOUSE_ASSIGNMENT_REVISION};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
