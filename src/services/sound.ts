/** 오리지널 오케스트라와 효과음을 기기 안에서 재생합니다. */
import { useEffect, useState } from 'react';
import {OrchestraPlayer,type MusicPlayback} from './orchestraAudio';
import type {MusicMode} from './orchestraScore';
export type {MusicMode} from './orchestraScore';

export type Sfx =
  | 'tap' | 'star' | 'sparkle' | 'win' | 'fanfare' | 'fail' | 'cast' | 'hit' | 'hurt' | 'dodge'
  | 'pop' | 'note' | 'bump' | 'tick' | 'coin' | 'beep' | 'go' | 'page' | 'unlock';

const KEY = 'jangwon-starlight-sound-v1';
const MUSIC_POLICY='original-orchestra-v1';
type Settings={music:boolean;sfx:boolean;volume:number};
const playbackListeners=new Set<()=>void>();
let playback:MusicPlayback='waiting';
function setPlayback(value:MusicPlayback){if(value!==playback){playback=value;playbackListeners.forEach(fn=>fn())}}
const listeners = new Set<() => void>();

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); return {music:p.musicPolicy===MUSIC_POLICY?p.music!==false:true,sfx:p.sfx===true,volume:typeof p.volume==='number'&&Number.isFinite(p.volume)?Math.max(0.1,Math.min(1,p.volume)):0.5}; }
  } catch {}
  return {music:true,sfx:false,volume:0.5};
}
let settings: Settings = loadSettings();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus:GainNode|null=null;
let orchestra:OrchestraPlayer|null=null;
let unlocked=false,pageActive=true,ducked=false;
let sfxBus: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let wet: GainNode | null = null;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC){setPlayback('unavailable');return null;}
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus=ctx.createGain();musicBus.gain.value=settings.volume*0.8;musicBus.connect(master);
    orchestra=new OrchestraPlayer(ctx,musicBus,setPlayback);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? 0.55 : 0;
    // 잔향 (성당 같은 마법학교 느낌)
    reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = buf;
    wet = ctx.createGain(); wet.gain.value = 0.32;
    sfxBus.connect(master);
    sfxBus.connect(reverb);
    reverb.connect(wet); wet.connect(master);
  } catch {ctx=null;setPlayback('unavailable');}
  return ctx;
}

/* ---------------- 악기 ---------------- */
function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function celesta(out: AudioNode, f: number, t: number, vol = 0.18, dec = 1.3) {
  const c = ctx!;
  const g = c.createGain(); env(g, t, 0.005, vol, dec); g.connect(out);
  const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4.01;
  const g2 = c.createGain(); env(g2, t, 0.003, vol * 0.25, dec * 0.35); g2.connect(out);
  o1.connect(g); o2.connect(g2);
  o1.start(t); o2.start(t); o1.stop(t + dec + 0.1); o2.stop(t + dec + 0.1);
}
function pad(out: AudioNode, fs: number[], t: number, dur: number, vol = 0.05) {
  const c = ctx!;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
  const g = c.createGain(); g.connect(lp);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.6, dur * 0.3));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const f of fs) for (const det of [-6, 6]) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
}
function pluck(out: AudioNode, f: number, t: number, vol = 0.12, dec = 0.28, type: OscillatorType = 'triangle') {
  const c = ctx!;
  const g = c.createGain(); env(g, t, 0.004, vol, dec); g.connect(out);
  const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g);
  o.start(t); o.stop(t + dec + 0.05);
}
function noise(out: AudioNode, t: number, dur: number, vol: number, f0: number, f1: number, q = 1.2) {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = b;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = c.createGain(); env(g, t, 0.01, vol, dur);
  src.connect(bp); bp.connect(g); g.connect(out);
  src.start(t); src.stop(t + dur + 0.05);
}
function brass(out: AudioNode, f: number, t: number, dur: number, vol = 0.1) {
  const c = ctx!;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.08);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  lp.connect(g); g.connect(out);
  for (const det of [-5, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
}

/* 원본 악보의 반복과 부드러운 음악 전환. */
let mode: MusicMode | null = null;
let modeStack: MusicMode[] = [];
const modeListeners = new Set<() => void>();
function applyMode(next: MusicMode | null) {
  if (next === mode) return;
  mode = next;
  modeListeners.forEach(fn => fn());
  syncMusic();
}

function syncMusic(){
 if(!unlocked||!orchestra){if(!settings.music)setPlayback('muted');return;}
 orchestra.configure(mode,settings.music,pageActive);
}
function resumeContext(){if(!ctx)return;if(ctx.state!=='running')ctx.resume().then(syncMusic).catch(()=>setPlayback('waiting'));else syncMusic();}

/* ---------------- 효과음 ---------------- */
function playSfx(name: Sfx) {
  if (!ctx || !sfxBus || !settings.sfx || !pageActive) return;
  const t = ctx.currentTime + 0.01;
  const o = sfxBus;
  switch (name) {
    case 'tap': pluck(o, 1320, t, 0.05, 0.06, 'sine'); break;
    case 'page': noise(o, t, 0.12, 0.05, 2500, 5000, 0.7); break;
    case 'beep': pluck(o, 660, t, 0.14, 0.15, 'square'); break;
    case 'go': pluck(o, 990, t, 0.16, 0.3, 'square'); celesta(o, midi(88), t + 0.05, 0.1, 0.6); break;
    case 'pop': pluck(o, 900, t, 0.12, 0.08, 'sine'); pluck(o, 1500, t + 0.03, 0.08, 0.1, 'sine'); break;
    case 'note': celesta(o, midi([76, 79, 83, 84][Math.floor(Math.random() * 4)]), t, 0.16, 0.6); break;
    case 'bump': pluck(o, 110, t, 0.22, 0.2, 'sine'); noise(o, t, 0.12, 0.08, 400, 120); break;
    case 'tick': pluck(o, 2200, t, 0.06, 0.03, 'square'); break;
    case 'coin': celesta(o, midi(88), t, 0.16, 0.5); celesta(o, midi(95), t + 0.09, 0.16, 0.8); break;
    case 'sparkle': [88, 91, 95, 100].forEach((n, k) => celesta(o, midi(n), t + k * 0.07, 0.12, 0.9)); break;
    case 'star': [76, 83, 88, 91, 95].forEach((n, k) => celesta(o, midi(n), t + k * 0.09, 0.14, 1.2)); pad(o, [midi(64), midi(71), midi(76)], t, 1.4, 0.03); break;
    case 'unlock': [72, 76, 79, 84, 88].forEach((n, k) => celesta(o, midi(n), t + k * 0.08, 0.14, 1)); noise(o, t, 0.6, 0.04, 1500, 8000, 0.6); break;
    case 'win': [72, 76, 79].forEach((n, k) => pluck(o, midi(n), t + k * 0.08, 0.13, 0.25, 'triangle')); celesta(o, midi(84), t + 0.26, 0.15, 1); break;
    case 'fanfare':
      brass(o, midi(67), t, 0.16, 0.09); brass(o, midi(67), t + 0.17, 0.16, 0.09);
      brass(o, midi(72), t + 0.34, 0.6, 0.11); brass(o, midi(76), t + 0.34, 0.6, 0.07);
      [84, 88, 91].forEach((n, k) => celesta(o, midi(n), t + 0.4 + k * 0.08, 0.1, 1));
      break;
    case 'fail': pluck(o, midi(64), t, 0.13, 0.3, 'triangle'); pluck(o, midi(60), t + 0.22, 0.13, 0.5, 'triangle'); break;
    case 'cast': noise(o, t, 0.35, 0.09, 400, 4000, 1.5); [84, 88].forEach((n, k) => celesta(o, midi(n), t + 0.12 + k * 0.06, 0.1, 0.6)); break;
    case 'hit': noise(o, t, 0.18, 0.16, 1800, 300, 0.9); pluck(o, 160, t, 0.16, 0.15, 'sine'); break;
    case 'hurt': pluck(o, 90, t, 0.22, 0.3, 'sine'); noise(o, t, 0.25, 0.1, 600, 150, 0.8); break;
    case 'dodge': noise(o, t, 0.22, 0.09, 600, 3500, 2); break;
  }
}

/* ---------------- 공개 API ---------------- */
export const sound = {
  /** 첫 터치 때 호출 (자동 재생 정책) */
  unlock() {
    const c = ensure();
    if (!c) return;
    unlocked=true;resumeContext();
  },
  setMusic(m: MusicMode | null) { applyMode(modeStack.length ? modeStack[modeStack.length - 1] : m); baseMode = m; },
  /** 대결 화면처럼 잠깐 다른 음악 (끝나면 popMusic) */
  pushMusic(m: MusicMode) { modeStack.push(m); applyMode(m); },
  popMusic() { modeStack.pop(); applyMode(modeStack.length ? modeStack[modeStack.length - 1] : baseMode); },
  sfx(name: Sfx) { try { playSfx(name); } catch {} },
  get settings() { return settings; },
  set(next: Partial<Settings>) {
    settings = { ...settings, ...next };
    settings.volume=Number.isFinite(settings.volume)?Math.max(0.1,Math.min(1,settings.volume)):0.5;
    try { localStorage.setItem(KEY, JSON.stringify({...settings,musicPolicy:MUSIC_POLICY})); } catch {}
    if (ctx && sfxBus) {
      const now = ctx.currentTime;
      sfxBus.gain.cancelScheduledValues(now); sfxBus.gain.linearRampToValueAtTime(settings.sfx ? 0.55 : 0, now + 0.1);
    }
    if(musicBus&&ctx)musicBus.gain.setTargetAtTime(settings.volume*(ducked?0.045:0.8),ctx.currentTime,0.12);
    syncMusic();
    listeners.forEach(f => f());
  },
  setPageActive(active:boolean){pageActive=active;if(active&&unlocked)resumeContext();else syncMusic();},
  duckMusic(value:boolean){ducked=value;if(musicBus&&ctx)musicBus.gain.setTargetAtTime(settings.volume*(value?0.045:0.8),ctx.currentTime,0.22);},
  /** 테스트용: 현재 상태 */
  debug() { return {mode,stack:[...modeStack],ctx:ctx?.state||'none',settings,playback,unlocked,ducked,orchestra:orchestra?.debug()}; }
};
let baseMode: MusicMode | null = null;

export const sfx = (name: Sfx) => sound.sfx(name);

export function useSoundSettings(): Settings {
  const [s, setS] = useState(settings);
  useEffect(() => { const f = () => setS({ ...settings }); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return s;
}

/** 컴포넌트가 떠 있는 동안 다른 배경음 (예: 대결) */
export function useMusicOverride(m: MusicMode) {
  useEffect(() => { sound.pushMusic(m); return () => sound.popMusic(); }, [m]);
}

if (typeof window !== 'undefined') (window as any).__byeolbamSound = sound;

export function useMusicMode(): MusicMode | null {
  const [value, setValue] = useState(mode);
  useEffect(() => {
    const update = () => setValue(mode);
    modeListeners.add(update); update();
    return () => { modeListeners.delete(update); };
  }, []);
  return value;
}

export function useMusicPlayback():MusicPlayback{
 const [value,setValue]=useState(playback);
 useEffect(()=>{const update=()=>setValue(playback);playbackListeners.add(update);update();return()=>{playbackListeners.delete(update)}},[]);
 return value;
}
