import assert from 'node:assert/strict';
import { CONSTELLATIONS,calculateObservationStatus,DOGYE_LOCATION } from '../src/services/celestialMath';
import { SKY_CATALOG } from '../src/services/skyCatalog';
import { DEFAULT_PRIZES,effectiveWeights,pickPrize,loadRewardConfig,saveRewardConfig,emptyRewards,applySpin,DEFAULT_REWARD_CONFIG,sanitizeRewards } from '../src/services/rewards';
import { PHOTO_MISSIONS } from '../src/data/photoMissions';
import { getMissions, getStationPlaces } from '../src/data/storyData';
import { experienceForGrade } from '../src/services/experience';
import { createBlankState,cleanParticipantState } from '../src/services/storage';
import { validateScreenGuard } from '../src/services/screenGuard';
const memory=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)},configurable:true});
let checks=0;function check(name:string,fn:()=>void){fn();checks++;console.log(`PASS: ${name}`)}
check('exactly the ten requested constellations and three regions',()=>{
 assert.deepEqual(CONSTELLATIONS.map(c=>c.id),['cygnus','lyra','aquila','pegasus','andromeda','aquarius','pisces','piscis_austrinus','cassiopeia','cepheus']);
 assert.deepEqual(['west','autumn','north'].map(r=>CONSTELLATIONS.filter(c=>c.region===r).length),[3,5,2]);
 assert.ok(!SKY_CATALOG.stars.some(s=>/큰곰|작은곰|용자리|오리온/.test(s.con)));
 assert.equal(new Set(SKY_CATALOG.stars.map(s=>s.id)).size,SKY_CATALOG.stars.length);
});
check('every constellation has a connected playable star graph and valid sky coordinates',()=>{
 for(const c of CONSTELLATIONS){const reachable=new Set([0]);for(let i=0;i<c.stars.length;i++)for(const[a,b]of c.lines){assert.ok(a>=0&&b>=0&&a<c.stars.length&&b<c.stars.length);if(reachable.has(a)||reachable.has(b)){reachable.add(a);reachable.add(b)}}assert.equal(reachable.size,c.stars.length,c.id);for(const s of c.stars){assert.ok(s.ra>=0&&s.ra<24&&s.dec>=-90&&s.dec<=90);assert.ok(s.puzzleX>=8&&s.puzzleX<=92&&s.puzzleY>=8&&s.puzzleY<=92)}for(const h of[19,20,21]){const st=calculateObservationStatus(c,new Date(`2026-10-21T${h}:00:00+09:00`),DOGYE_LOCATION);assert.ok(Number.isFinite(st.altitude)&&st.altitude>=-90&&st.altitude<=90);assert.ok(st.azimuth>=0&&st.azimuth<=360)}}
});
check('thirteen roulette choices; exact 5% lose under legacy and multiple-lose settings',()=>{
 assert.equal(DEFAULT_PRIZES.length,13);assert.equal(DEFAULT_PRIZES.reduce((s,p)=>s+p.weight,0),100);
 for(const prizes of[DEFAULT_PRIZES,DEFAULT_PRIZES.map(p=>p.kind==='lose'?{...p,weight:999}:p),[...DEFAULT_PRIZES,{...DEFAULT_PRIZES.at(-1)!,id:'lose2',weight:40}]]){const w=effectiveWeights(prizes);const sum=w.reduce((a,b)=>a+b,0);const loss=prizes.reduce((a,p,i)=>a+(p.kind==='lose'?w[i]:0),0)/sum;assert.ok(Math.abs(loss-.05)<1e-10)}
 let seed=42;const rng=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};let loses=0;for(let i=0;i<100000;i++)if(DEFAULT_PRIZES[pickPrize(DEFAULT_PRIZES,rng)].kind==='lose')loses++;assert.ok(loses>4700&&loses<5300,String(loses));
});
check('old six-choice configuration gains missing choices without deleting personalized values or old tickets',()=>{
 const oldIds=['tteok','odeng','combo','snack','again','lose'];const old=DEFAULT_PRIZES.filter(p=>oldIds.includes(p.id)).map(p=>p.id==='tteok'?{...p,name:'선생님 설정 떡볶이'}:p);
 localStorage.setItem('jangwon-starlight-reward-config-v2',JSON.stringify({...DEFAULT_REWARD_CONFIG,prizes:old}));const cfg=loadRewardConfig();assert.equal(cfg.prizes.length,13);assert.equal(cfg.prizes.find(p=>p.id==='tteok')!.name,'선생님 설정 떡볶이');saveRewardConfig(cfg);assert.equal(loadRewardConfig().prizes.length,13);
 const past={...emptyRewards(),tickets:[{id:'old',kind:'prize',label:'기존 교환권',emoji:'🎟️',createdAt:'2026-10-10',used:true,usedAt:'2026-10-10'}]};assert.equal(sanitizeRewards(past).tickets[0].used,true);memory.clear();
});
check('saved revision-3 roulette gains exactly one henna coupon and retains teacher changes',()=>{
 const old=DEFAULT_PRIZES.filter(p=>p.id!=='henna').map(p=>p.id==='tteok'?{...p,name:'기존 떡볶이'}:p);
 localStorage.setItem('jangwon-starlight-reward-config-v2',JSON.stringify({...DEFAULT_REWARD_CONFIG,catalogRevision:3,prizes:old}));const cfg=loadRewardConfig();assert.equal(cfg.prizes.filter(p=>p.id==='henna').length,1);assert.equal(cfg.prizes.find(p=>p.id==='tteok')!.name,'기존 떡볶이');saveRewardConfig(cfg);assert.equal(loadRewardConfig().prizes.filter(p=>p.id==='henna').length,1);
 const rewards={...emptyRewards(),tickets:[{id:'henna-spin',kind:'roulette' as const,label:'룰렛',emoji:'',createdAt:'',used:false}]};const result=applySpin(rewards,'henna-spin',cfg.prizes.find(p=>p.id==='henna')!,cfg);assert.equal(result.issued?.label,'헤나 이용권');assert.equal(result.issued?.kind,'prize');memory.clear();
});
check('each newly added winning choice issues the correct coupon',()=>{
 for(const prize of DEFAULT_PRIZES.filter(p=>p.kind==='item')){const r={...emptyRewards(),tickets:[{id:'r',kind:'roulette' as const,label:'룰렛',emoji:'',createdAt:'',used:false}]};const out=applySpin(r,'r',prize);assert.equal(out.issued?.prizeId,prize.id);assert.ok(out.issued?.label);assert.equal(out.rewards.spins?.length,1);assert.equal(applySpin(out.rewards,'r',prize).issued,null)}
});
check('seven photo tasks have distinct scenes, framing guidance and stable mission IDs',()=>{
 const m=getMissions('junior');assert.equal(PHOTO_MISSIONS.length,7);assert.deepEqual(m.map(m=>m.id),[0,1,2,3,4,5,6]);assert.deepEqual(m.map(m=>m.title),PHOTO_MISSIONS.map(p=>p.title));assert.ok(m.every(m=>m.photoDescription&&m.photoFrameGuide));assert.ok(m[0].photoDescription!.includes('패들렛'));assert.equal(m[0].usesZepQuiz,false);assert.equal(m[0].externalActivity?.url,'https://padlet.com/och9431/padlet-s024og0gfvauur8r2cy3');assert.equal(getMissions('standard')[0].externalActivity,undefined);const places=m.map(m=>m.place);places[0]='AI 성과공유 부스 · ZEP QUIZ';places[2]='교사 맞춤 대여 장소';localStorage.setItem('jangwon-starlight-station-places-v1',JSON.stringify(places));assert.equal(getStationPlaces()[0],'AI 성과공유 부스');assert.equal(getStationPlaces()[2],'교사 맞춤 대여 장소');memory.clear();assert.ok(m[3].photoFrameGuide!.includes('호박바구니'));assert.ok(m[6].photoDescription!.includes('활동'));assert.ok(m[1].photoDescription!.includes('같은 사진'));
});
check('grade routing and experience switching preserve participant rewards, photos and progress',()=>{
 for(const g of['유치원','1학년','2학년'])assert.equal(experienceForGrade(g),'junior');for(const g of['3학년','4학년','5학년','6학년'])assert.equal(experienceForGrade(g),'standard');
 const old={...createBlankState(),name:'전환검증',grade:'2학년',house:0,completed:[2,4],photo:'data:image/jpeg;base64,AAA',observatory:{completedConstellations:['ursa_major','cassiopeia']}};const c=cleanParticipantState(old)!;assert.equal(c.experienceMode,'junior');assert.deepEqual(c.completed,[2,4]);assert.equal(c.photo,old.photo);assert.ok(c.observatory!.completedConstellations.includes('ursa_major'));assert.equal(validateScreenGuard('junior-final',c),'map');assert.equal(validateScreenGuard('junior-final',{...c,completed:[0,1,2,3,4,5,6]}),'junior-final');
});
console.log(`ALL ${checks} UPDATE CONTRACT CHECKS PASSED`);
