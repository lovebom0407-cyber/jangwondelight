import {createScore,type Instrument,type MusicMode,type ScoreNote} from './orchestraScore';
export type MusicPlayback='waiting'|'preparing'|'playing'|'muted'|'paused'|'unavailable';
type Context=AudioContext|OfflineAudioContext;
const SAMPLE_RATE=22050,TAIL=4,hz=(pitch:number)=>440*2**((pitch-69)/12);
const spectra=new WeakMap<BaseAudioContext,Map<string,PeriodicWave>>(),noiseBuffers=new WeakMap<BaseAudioContext,AudioBuffer>();
function spectrum(c:Context,voice:Instrument){
 let bank=spectra.get(c);if(!bank){bank=new Map();spectra.set(c,bank)}let wave=bank.get(voice);if(wave)return wave;
 const real=new Float32Array(32),imag=new Float32Array(32);
 for(let i=1;i<24;i++)imag[i]=voice==='flute'?(i===1?1:i===2?0.12:i===3?0.06:0):voice==='horn'?Math.exp(-i/6)/i**0.65:voice==='bass'?(i===1?1:i===2?0.28:i===3?0.08:0):Math.exp(-i/10)/i;
 wave=c.createPeriodicWave(real,imag);bank.set(voice,wave);return wave;
}
function noiseBuffer(c:Context){
 let buffer=noiseBuffers.get(c);if(buffer)return buffer;buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=buffer.getChannelData(0);let seed=75219;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/2147483648-1)*0.7}noiseBuffers.set(c,buffer);return buffer;
}
function spatial(c:Context,out:AudioNode,pan:number){if(typeof c.createStereoPanner!=='function')return out;const p=c.createStereoPanner();p.pan.value=pan;p.connect(out);return p;}
function envelope(c:Context,out:AudioNode,t:number,duration:number,peak:number,attack:number,release:number){
 const g=c.createGain();g.connect(out);const sustain=Math.max(attack+0.02,duration);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.setValueAtTime(peak*0.78,t+sustain);g.gain.exponentialRampToValueAtTime(0.00001,t+sustain+release);return {g,end:t+sustain+release+0.02};
}
function note(c:Context,out:AudioNode,n:ScoreNote,t:number,beat:number,track?:(node:AudioScheduledSourceNode)=>void){
 const duration=n.length*beat,target=spatial(c,out,n.pan),f=hz(n.pitch);
 if(n.voice==='shimmer'){
  const source=c.createBufferSource();source.buffer=noiseBuffer(c);const filter=c.createBiquadFilter();filter.type='highpass';filter.frequency.value=3600;
  const {g,end}=envelope(c,target,t,duration*0.25,n.level,0.12,duration*0.75);source.connect(filter);filter.connect(g);track?.(source);source.start(t);source.stop(end);return;
 }
 if(n.voice==='timpani'){
  const source=c.createOscillator();source.frequency.setValueAtTime(f*1.4,t);source.frequency.exponentialRampToValueAtTime(f*0.72,t+0.17);
  const {g,end}=envelope(c,target,t,0.025,n.level,0.004,duration);source.connect(g);track?.(source);source.start(t);source.stop(end);return;
 }
 if(n.voice==='celesta'){
  [1,2.76,5.41].forEach((ratio,i)=>{if(f*ratio>c.sampleRate*0.45)return;const source=c.createOscillator();source.frequency.value=f*ratio;
   const {g,end}=envelope(c,target,t,0.008,n.level*[1,0.23,0.055][i],0.004,(duration+0.85)/(1+i*0.8));source.connect(g);track?.(source);source.start(t);source.stop(end);
  });return;
 }
 const plucked=n.voice==='pizzicato',strings=n.voice==='strings',attack=plucked?0.006:strings?0.19:n.voice==='horn'?0.07:0.05,release=plucked?0.19:strings?0.55:0.23;
 const {g,end}=envelope(c,target,t,plucked?0.012:duration,n.level,attack,release),filter=c.createBiquadFilter();filter.type='lowpass';filter.Q.value=0.5;
 filter.frequency.setValueAtTime(n.voice==='horn'?700:strings?1500:plucked?2600:2100,t);if(n.voice==='horn')filter.frequency.linearRampToValueAtTime(2200,t+0.18);filter.connect(g);
 const detunes=strings?[-5,5]:[0];detunes.forEach(detune=>{
  const source=c.createOscillator();source.setPeriodicWave(spectrum(c,n.voice));source.frequency.value=f;source.detune.value=detune;
  const level=c.createGain();level.gain.value=1/detunes.length;source.connect(level);level.connect(filter);track?.(source);source.start(t);source.stop(end);
  if(n.voice==='flute'){const vibrato=c.createOscillator(),depth=c.createGain();vibrato.frequency.value=5.1;depth.gain.value=7;vibrato.connect(depth);depth.connect(source.detune);track?.(vibrato);vibrato.start(t);vibrato.stop(end)}
 });
}
function room(c:Context,destination:AudioNode){
 const input=c.createGain(),dry=c.createGain(),wet=c.createGain(),convolver=c.createConvolver();dry.gain.value=0.87;wet.gain.value=0.20;
 const impulse=c.createBuffer(2,Math.ceil(c.sampleRate*2.8),c.sampleRate);let seed=38651;
 for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/2147483648-1)*Math.exp(-i/(c.sampleRate*0.44))}}
 convolver.buffer=impulse;input.connect(dry);dry.connect(destination);input.connect(convolver);convolver.connect(wet);wet.connect(destination);return input;
}
/** Circular overlap preserves release/reverb across the loop boundary. */
export function foldLoop(c:AudioContext,rendered:AudioBuffer,frames:number){
 const loop=c.createBuffer(2,frames,rendered.sampleRate);let peak=0;
 for(let ch=0;ch<2;ch++){const source=rendered.getChannelData(ch),data=loop.getChannelData(ch);data.set(source.subarray(0,frames));
  const tail=Math.min(source.length-frames,frames);for(let i=0;i<tail;i++)data[i]+=source[frames+i]*Math.min(1,(tail-i)/(rendered.sampleRate*0.25));
  for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
 const scale=peak>0?Math.min(2.5,0.76/peak):1;for(let ch=0;ch<2;ch++){const data=loop.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=scale}return loop;
}
export async function renderScore(c:AudioContext,mode:MusicMode){
 const Offline=window.OfflineAudioContext||(window as any).webkitOfflineAudioContext;if(!Offline)throw Error('Realtime orchestra fallback');
 const score=createScore(mode),beat=60/score.bpm,frames=Math.round(score.beats*beat*SAMPLE_RATE),offline:OfflineAudioContext=new Offline(2,frames+TAIL*SAMPLE_RATE,SAMPLE_RATE),bus=room(offline,offline.destination);
 score.notes.forEach(n=>note(offline,bus,n,n.beat*beat,beat));return foldLoop(c,await offline.startRendering(),frames);
}
interface Playing{source:AudioBufferSourceNode;gain:GainNode;mode:MusicMode;started:number;offset:number;}
export class OrchestraPlayer{
 private desired:MusicMode|null=null;private enabled=true;private active=true;private epoch=0;private current:Playing|null=null;
 private cache=new Map<MusicMode,Promise<AudioBuffer>>();private offsets=new Map<MusicMode,number>();private live=new Set<Playing>();
 private fallbackTimer:ReturnType<typeof setInterval>|null=null;private fallbackVoices=new Set<AudioScheduledSourceNode>();private fallbackGain:GainNode|null=null;private fallbackMode:MusicMode|null=null;
 private state:MusicPlayback='waiting';private renderer=renderScore;
 constructor(private c:AudioContext,private out:AudioNode,private changed:(state:MusicPlayback)=>void,renderer?:typeof renderScore){if(renderer)this.renderer=renderer}
 private status(state:MusicPlayback){if(this.state!==state){this.state=state;this.changed(state)}}
 configure(mode:MusicMode|null,enabled:boolean,active:boolean){
  if(this.desired===mode&&this.enabled===enabled&&this.active===active&&(this.current||this.fallbackTimer))return;
  this.desired=mode;this.enabled=enabled;this.active=active;const epoch=++this.epoch;
  if(!enabled||!active||!mode){this.stop();this.status(!enabled?'muted':'paused');return}
  if(this.current?.mode===mode||this.fallbackMode===mode){this.status('playing');return}
  this.status(this.current?'playing':'preparing');let pending=this.cache.get(mode);if(!pending){pending=this.renderer(this.c,mode);this.cache.set(mode,pending)}
  pending.then(buffer=>{
   if(epoch!==this.epoch||!this.enabled||!this.active||this.desired!==mode)return;
   this.stopFallback();const now=this.c.currentTime,source=this.c.createBufferSource(),gain=this.c.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.out);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+0.7);
   const offset=(this.offsets.get(mode)||0)%buffer.duration,playing={source,gain,mode,started:now,offset};if(this.current)this.release(this.current,0.7);
   this.current=playing;this.live.add(playing);source.onended=()=>{this.live.delete(playing);source.disconnect();gain.disconnect()};source.start(now,offset);this.status('playing');
  }).catch(()=>{this.cache.delete(mode);if(epoch===this.epoch&&this.enabled&&this.active&&this.desired===mode){try{this.startFallback(mode);this.status('playing')}catch{this.stop();this.status('unavailable')}}});
 }
 private release(p:Playing,seconds:number){const now=this.c.currentTime;this.offsets.set(p.mode,(p.offset+Math.max(0,now-p.started))%(p.source.buffer?.duration||1));p.gain.gain.cancelScheduledValues(now);p.gain.gain.setValueAtTime(p.gain.gain.value,now);p.gain.gain.linearRampToValueAtTime(0,now+seconds);try{p.source.stop(now+seconds+0.02)}catch{}}
 private stop(){for(const p of this.live)this.release(p,0.08);this.current=null;this.stopFallback()}
 private stopFallback(){
  if(this.fallbackTimer!==null)clearInterval(this.fallbackTimer);this.fallbackTimer=null;this.fallbackMode=null;
  for(const voice of this.fallbackVoices){try{voice.stop(this.c.currentTime+0.03)}catch{}}this.fallbackVoices.clear();if(this.fallbackGain){const gain=this.fallbackGain;gain.gain.setTargetAtTime(0,this.c.currentTime,0.015);setTimeout(()=>gain.disconnect(),120)}this.fallbackGain=null;
 }
 private startFallback(mode:MusicMode){
  this.stop();const score=createScore(mode),beat=60/score.bpm,length=score.beats*beat,gain=this.c.createGain();gain.gain.value=0.8;gain.connect(this.out);const bus=room(this.c,gain);this.fallbackGain=gain;
  let cycle=this.c.currentTime+0.05,index=0;const track=(voice:AudioScheduledSourceNode)=>{this.fallbackVoices.add(voice);voice.onended=()=>{this.fallbackVoices.delete(voice);voice.disconnect()}};
  const pump=()=>{while(cycle+score.notes[index].beat*beat<this.c.currentTime+0.2){const n=score.notes[index];note(this.c,bus,n,cycle+n.beat*beat,beat,track);if(++index===score.notes.length){index=0;cycle+=length}}};
  this.fallbackMode=mode;pump();this.fallbackTimer=setInterval(pump,60);
 }
 dispose(){this.epoch++;this.stop();for(const p of this.live){try{p.source.stop()}catch{}p.source.disconnect();p.gain.disconnect()}this.live.clear();this.cache.clear()}
 debug(){return {mode:this.desired,playing:this.current?.mode||this.fallbackMode,state:this.state,live:this.live.size,cached:this.cache.size,realtime:this.fallbackTimer!==null}}
}
