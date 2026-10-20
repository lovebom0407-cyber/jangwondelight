import React,{useRef,useState,useEffect} from 'react';
import {MagicHatAROverlay} from '../characterAssets';
import {Camera,RefreshCw,ArrowLeft} from 'lucide-react';
import type {ParticipantState} from '../../types';
import {SORTING_HAT_DATA_URL,portraitCrop} from '../../services/sortingPortrait';
interface Props{state:ParticipantState;onUpdateState:(p:Partial<ParticipantState>)=>void;onNavigate:(s:any)=>void;onShowToast:(s:string)=>void;}
export function CameraSortScreen({state,onUpdateState,onNavigate,onShowToast}:Props){
 const videoRef=useRef<HTMLVideoElement|null>(null),selfieRef=useRef<HTMLInputElement|null>(null),albumRef=useRef<HTMLInputElement|null>(null);
 const stream=useRef<MediaStream|null>(null),cameraEpoch=useRef(0),captureEpoch=useRef(0),alive=useRef(true),locked=useRef(false),urls=useRef(new Set<string>());
 const [status,setStatus]=useState('전면 카메라를 열고 있어요…'),[hatY,setHatY]=useState(0),[hatScale,setHatScale]=useState(82),[preview,setPreview]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const junior=state.experienceMode==='junior';
 const stop=()=>{cameraEpoch.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
 const start=async()=>{
  stop();const epoch=cameraEpoch.current;setStatus('전면 카메라 연결 중…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('CAMERA_UNAVAILABLE');
   const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:960},height:{ideal:1280}}});
   if(!alive.current||epoch!==cameraEpoch.current){acquired.getTracks().forEach(t=>t.stop());return;}
   stream.current=acquired;if(videoRef.current){videoRef.current.srcObject=acquired;await videoRef.current.play();}
   if(alive.current&&epoch===cameraEpoch.current)setStatus('모자를 맞추고 아래 촬영 버튼을 눌러요');
  }catch{
   if(alive.current&&epoch===cameraEpoch.current){stop();setStatus('촬영 버튼을 누르면 휴대폰 기본 카메라가 열려요');}
  }
 };
 useEffect(()=>{
  alive.current=true;if(!preview)void start();
  const visibility=()=>{if(document.hidden)stop();else if(alive.current&&!preview)void start();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',stop);
  return()=>{alive.current=false;captureEpoch.current++;locked.current=false;stop();urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current.clear();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',stop);};
 },[state.participantId,preview]);
 const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('사진을 열지 못했어요. 다시 찍거나 다른 사진을 골라 주세요.'));image.src=src;});
 const compose=async(source:CanvasImageSource,width:number,height:number,mirror:boolean,epoch:number)=>{
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;const ctx=canvas.getContext('2d');if(!ctx)throw Error('사진을 만들지 못했어요. 카메라를 다시 연결해 주세요.');
  const crop=portraitCrop(width,height);ctx.save();if(mirror){ctx.translate(600,0);ctx.scale(-1,1);}ctx.drawImage(source,crop.x,crop.y,crop.width,crop.height);ctx.restore();
  const hat=await loadImage(SORTING_HAT_DATA_URL);if(!alive.current||epoch!==captureEpoch.current)return;
  const w=600*hatScale/100;ctx.drawImage(hat,(600-w)/2,800*hatY/100,w,w*220/240);
  const photo=canvas.toDataURL('image/jpeg',.84);if(!photo.startsWith('data:image/jpeg'))throw Error('사진을 저장하지 못했어요. 다시 찍어 주세요.');
  stop();locked.current=false;setBusy(false);onUpdateState({photo,sortingPhotoSkipped:false,sortingPhotoCapturedAt:new Date().toISOString()});setPreview(photo);
 };
 const runCapture=async(work:(epoch:number)=>Promise<void>)=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');const epoch=++captureEpoch.current;
  try{await work(epoch);}catch(err){if(alive.current&&epoch===captureEpoch.current){const message=err instanceof Error?err.message:'사진을 다시 찍어 주세요.';setError(message);onShowToast(message);}}
  finally{if(alive.current&&epoch===captureEpoch.current){locked.current=false;setBusy(false);}}
 };
 const capture=()=>{
  const video=videoRef.current;if(!video||video.readyState<2||!video.videoWidth){selfieRef.current?.click();return;}
  void runCapture(epoch=>compose(video,video.videoWidth,video.videoHeight,true,epoch));
 };
 const upload=(event:React.ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(file.type&&!file.type.startsWith('image/')){setError('사진 파일을 선택해 주세요.');return;}
  void runCapture(async epoch=>{const url=URL.createObjectURL(file);urls.current.add(url);try{const image=await loadImage(url);if(alive.current&&epoch===captureEpoch.current)await compose(image,image.naturalWidth,image.naturalHeight,false,epoch);}finally{if(urls.current.delete(url))URL.revokeObjectURL(url);}});
 };
 const retake=()=>{captureEpoch.current++;locked.current=false;setBusy(false);setError('');setPreview(null);};
 const listen=()=>{if(!preview||busy)return;stop();onNavigate('thinking');};
 const skip=()=>{captureEpoch.current++;stop();onUpdateState({photo:null,sortingPhotoSkipped:true,sortingPhotoCapturedAt:undefined});onNavigate('thinking');};
 return <div className={`${junior?'junior-ui ':''}space-y-5 pb-16 animate-fade-in`} data-sorting-camera>
  <button type="button" className={junior?'junior-secondary':'field-back'} onClick={()=>onNavigate('enroll')}><ArrowLeft size={18}/> 입학 정보로</button>
  <header className="space-y-2"><p className="sky-kicker">장원 별밤학교 · 마법모자</p><h1 className="font-serif text-3xl font-bold">{preview?'찰칵! 모자를 썼어요 🎩':'마법모자를 써 볼까요?'}</h1><p>{preview?'내 사진을 확인하고 모자의 이야기를 들어요.':'① 카메라 켜기 → ② 사진 찍기 → ③ 모자와 대화'}</p></header>
  <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-[#030814] border-2 border-[#d8b568]" data-camera-preview>
   {preview?<img src={preview} alt="마법모자를 쓴 내 입학 사진" className="absolute inset-0 w-full h-full object-cover"/>:<><video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"/><div className="absolute left-[28%] top-[38%] w-[44%] h-[42%] rounded-full border-2 border-dashed border-[#ffe6a4]/70 pointer-events-none"/><MagicHatAROverlay hatY={hatY} hatScale={hatScale}/><p role="status" className="absolute bottom-3 inset-x-3 p-3 rounded-xl bg-black/75 text-center text-sm">{status}</p></>}
  </div>
  {error&&<p role="alert" className="text-[#ffd4b8]">{error}</p>}
  {preview?<><button type="button" data-hat-listen className={junior?'junior-main':'field-primary w-full min-h-[60px] text-lg'} onClick={listen}>🎩 모자에게 배정받기</button><button type="button" className={junior?'junior-secondary':'field-secondary w-full min-h-[48px]'} onClick={retake}>📷 다시 찍기</button></>:<>
   <button type="button" data-capture disabled={busy} className={junior?'junior-main':'field-primary w-full min-h-[60px] text-lg'} onClick={capture}><Camera className="inline mr-2"/>{busy?'모자 사진을 만드는 중…':'마법모자 쓰고 사진 찍기'}</button>
   <details className="field-learning"><summary>모자 위치·크기 조절</summary><div className="p-4 space-y-4"><label className="block" htmlFor="hat-y-slider">모자 높이<input id="hat-y-slider" type="range" min={-12} max={30} value={hatY} onChange={e=>setHatY(Number(e.target.value))} className="w-full accent-[#e4bb70]"/></label><label className="block" htmlFor="hat-size-slider">모자 크기<input id="hat-size-slider" type="range" min={45} max={110} value={hatScale} onChange={e=>setHatScale(Number(e.target.value))} className="w-full accent-[#e4bb70]"/></label></div></details>
   <button type="button" disabled={busy} className="field-secondary w-full min-h-[48px]" onClick={()=>void start()}><RefreshCw className="inline mr-2" size={17}/>카메라 다시 연결</button>
   <details className="field-learning"><summary>카메라 사용이 어려우면 여기를 눌러요</summary><div className="p-4 space-y-3"><p>휴대폰 기본 카메라나 앨범 사진으로도 모자를 쓸 수 있어요.</p><button type="button" disabled={busy} className="field-primary w-full min-h-[48px]" onClick={()=>selfieRef.current?.click()}>휴대폰 카메라로 찍기</button><button type="button" disabled={busy} className="field-secondary w-full min-h-[48px]" onClick={()=>albumRef.current?.click()}>사진 파일 선택</button><p className="text-sm">촬영이 어려울 때는 보호자와 함께 사진 없이 참여할 수도 있어요.</p><button type="button" disabled={busy} className="field-secondary w-full min-h-[48px]" onClick={skip}>사진 없이 배정받기</button></div></details>
  </>}
  <input ref={selfieRef} data-native-selfie type="file" accept="image/*" capture="user" className="hidden" onChange={upload}/><input ref={albumRef} data-album type="file" accept="image/*" className="hidden" onChange={upload}/>
  <p className="text-xs text-[#aeb9cb]">입학 사진은 이 기기에 보관해요. 보호자와 함께 촬영해요.</p>
 </div>;
}
