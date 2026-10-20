import React,{useEffect,useRef,useState} from 'react';
import {MUSIC_TITLES} from '../services/orchestraScore';
import {sound,useMusicMode,useMusicPlayback,useSoundSettings} from '../services/sound';
import type {AppScreen} from '../types';
const LABELS={waiting:'첫 화면 터치 후 자동 재생',preparing:'오케스트라 준비 중…',playing:'자동 반복 재생 중',muted:'음악 꺼짐',paused:'잠시 쉬는 중',unavailable:'소리 시작을 다시 눌러요'};
export function EventMusic({screen}:{screen:AppScreen}){
 const settings=useSoundSettings(),mode=useMusicMode(),playback=useMusicPlayback(),panel=useRef<HTMLElement>(null);
 const [options,setOptions]=useState(false);const blocked=screen==='admin'||screen==='admin-login';
 useEffect(()=>{
  const visibility=()=>sound.setPageActive(document.visibilityState!=='hidden'),duck=()=>sound.duckMusic(!!document.querySelector('main iframe'));
  visibility();duck();document.addEventListener('visibilitychange',visibility);
  const observer=window.MutationObserver?new window.MutationObserver(duck):null;observer?.observe(document.body,{childList:true,subtree:true});
  return()=>{document.removeEventListener('visibilitychange',visibility);observer?.disconnect();sound.duckMusic(false);sound.setPageActive(false)};
 },[]);
 useEffect(()=>{
  if(blocked)return;document.documentElement.classList.add('event-audio-controls');
  const measure=()=>document.documentElement.style.setProperty('--event-music-height',`${Math.ceil(panel.current?.getBoundingClientRect().bottom||52)}px`);
  measure();const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;if(panel.current)resize?.observe(panel.current);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});
  return()=>{resize?.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);document.documentElement.classList.remove('event-audio-controls');document.documentElement.style.removeProperty('--event-music-height')};
 },[blocked]);
 if(blocked)return null;
 return <section ref={panel} data-event-music data-music-active={playback==='playing'} className="event-music-panel print:hidden" aria-label="별밤학교 음악">
  <div className="event-music-controls">
   <button type="button" data-nosfx="1" data-music-toggle aria-pressed={settings.music} onClick={()=>{sound.unlock();sound.set({music:!settings.music})}}>{settings.music?'🎵 음악 켜짐':'🔇 음악 꺼짐'}</button>
   <div className="event-music-label"><span>{MUSIC_TITLES[mode||'calm']}</span><small role="status" aria-live="polite">{LABELS[playback]}</small></div>
   <button type="button" data-nosfx="1" data-music-settings aria-label="볼륨과 효과음 설정" aria-expanded={options} onClick={()=>setOptions(v=>!v)}>⚙</button>
   {options&&<>
    {(playback==='waiting'||playback==='unavailable')&&settings.music&&<button type="button" data-nosfx="1" data-music-resume onClick={()=>sound.unlock()}>소리 시작</button>}
    <label className="event-music-volume">음악 볼륨<input type="range" min="10" max="100" step="5" value={Math.round(settings.volume*100)} aria-label="음악 볼륨" onChange={e=>sound.set({volume:Number(e.target.value)/100})}/><span>{Math.round(settings.volume*100)}%</span></label>
    <button type="button" data-nosfx="1" data-sound-toggle="sfx" aria-pressed={settings.sfx} onClick={()=>{sound.unlock();sound.set({sfx:!settings.sfx})}}>{settings.sfx?'🔔 효과음 켬':'🔕 효과음 끔'}</button>
   </>}
  </div>
 </section>;
}
