/** Original scores for 장원 별밤학교, without external recordings or film melodies. */
export type MusicMode='calm'|'game'|'battle';
export type Instrument='celesta'|'strings'|'flute'|'horn'|'pizzicato'|'bass'|'timpani'|'shimmer';
export interface ScoreNote{voice:Instrument;pitch:number;beat:number;length:number;level:number;pan:number;}
export interface Score{mode:MusicMode;title:string;bpm:number;beats:number;notes:ScoreNote[];}
export const MUSIC_TITLES:Record<MusicMode,string>={calm:'별빛 입학식',game:'별빛을 따라 날아라',battle:'별빛 수호대'};
const rows=(s:string)=>s.split(';').map(row=>row.split(',').map(Number));
const chords={
 calm:rows('50,57,62,65;46,53,58,62;43,50,55,58;45,52,57,61;50,57,62,65;48,55,60,64;41,48,53,57;45,52,57,61;46,53,58,62;43,50,55,58;50,57,62,65;45,52,57,61;43,50,55,58;46,53,58,62;45,52,57,61;50,57,62,65'),
 game:rows('43,50,55,59;40,47,52,55;48,55,60,64;38,45,50,54;43,50,55,59;45,52,57,60;48,55,60,64;38,45,50,54;40,47,52,55;48,55,60,64;43,50,55,59;38,45,50,54;45,52,57,60;48,55,60,64;38,45,50,54;43,50,55,59'),
 battle:rows('40,47,52,55;48,55,60,64;45,52,57,60;47,54,59,63;40,47,52,55;38,45,50,54;48,55,60,64;47,54,59,63;48,55,60,64;45,52,57,60;40,47,52,55;47,54,59,63;45,52,57,60;48,55,60,64;47,54,59,63;40,47,52,55')
};
const melodies={
 calm:rows('74,81,77,76,72,74;77,74,70,72,77,81;79,74,70,69,67,74;73,76,81,79,76,73;77,81,86,84,81,77;79,76,72,74,79,84;81,77,72,69,72,77;76,73,69,71,73,76;82,81,77,74,77,81;79,77,74,70,74,79;81,77,74,72,69,74;76,81,85,83,81,76;79,74,70,72,74,77;82,77,74,70,74,77;81,79,76,73,76,81;77,74,69,65,69,74'),
 game:rows('79,83,81,74;76,79,83,86;84,79,76,72;78,81,86,81;83,86,88,86;84,81,76,79;84,88,86,84;81,78,74,78;83,79,76,71;79,84,88,86;83,86,91,86;81,86,90,86;84,81,76,72;88,84,79,76;81,78,74,78;83,79,74,79'),
 battle:rows('76,78,83;79,76,72;81,79,76;78,75,71;83,86,83;81,78,74;84,83,79;83,78,75;84,88,84;81,84,88;83,79,76;87,83,78;88,84,81;84,79,76;83,78,75;79,78,76')
};
export function createScore(mode:MusicMode):Score{
 const bpm=mode==='calm'?90:mode==='game'?116:108,barLength=mode==='game'?4:3,notes:ScoreNote[]=[];
 const add=(voice:Instrument,pitch:number,beat:number,length:number,level:number,pan=0)=>notes.push({voice,pitch,beat,length,level,pan});
 for(let bar=0;bar<16;bar++){
  const start=bar*barLength,ch=chords[mode][bar],melody=melodies[mode][bar],phrase=0.8+(bar%4)*0.065;
  ch.slice(1).forEach((pitch,i)=>add('strings',pitch+12,start,barLength-0.12,(mode==='battle'?0.055:0.043)*phrase,(i-1)*0.48));
  add('bass',ch[0],start,barLength*0.62,0.15*phrase,-0.08);add('bass',ch[0]+12,start+barLength*0.66,barLength*0.31,0.075*phrase,0.08);
  if(mode==='calm'){
   melody.forEach((pitch,i)=>add('celesta',pitch,start+i*0.5,0.65,0.13*phrase,i%2?-0.22:0.22));
   [0,1,2].forEach(i=>add('pizzicato',ch[1+i%3]+12,start+i,0.32,0.045,(i-1)*0.35));
   if(bar>=8&&bar%2===0){add('flute',melody[0]-12,start+0.5,1.8,0.09,-0.3);add('flute',melody[4]-12,start+2.3,0.65,0.07,-0.3)}
   if(bar%4===0)add('shimmer',88,start,2.2,0.022,0.45);
  }else if(mode==='game'){
   for(let i=0;i<8;i++)add('pizzicato',ch[1+[0,2,1,2][i%4]]+12,start+i*0.5,0.28,0.10*phrase,(i%3-1)*0.4);
   melody.forEach((pitch,i)=>add(bar<8?'flute':'celesta',pitch,start+i,0.83,(bar<8?0.12:0.16)*phrase,bar<8?-0.2:0.2));
   if(bar%2===0)ch.slice(1,3).forEach((pitch,i)=>add('horn',pitch,start+2,1.2,0.045,i?-0.4:0.4));
   add('timpani',43,start,0.45,0.08);if(bar%4===3)add('shimmer',88,start+3,0.8,0.025,0.5);
  }else{
   for(let i=0;i<6;i++)add('pizzicato',ch[[0,1,2,1,3,1][i]],start+i*0.5,0.26,(i%2?0.085:0.12)*phrase,(i%2?-1:1)*0.28);
   melody.forEach((pitch,i)=>{add('horn',pitch-12,start+i,0.8,0.11*phrase,-0.24);if(bar>=8)add('strings',pitch,start+i,0.78,0.055,0.35)});
   add('timpani',40,start,0.65,0.15);add('timpani',47,start+2,0.55,0.10);
   if(bar%4===0)add('shimmer',88,start,2.0,0.045,0.4);if(bar%4===3)add('celesta',melody[2]+12,start+2.5,0.75,0.09,0.3);
  }
 }
 notes.sort((a,b)=>a.beat-b.beat);return {mode,title:MUSIC_TITLES[mode],bpm,beats:16*barLength,notes};
}
