import assert from 'node:assert/strict';
import {loadRewardConfig,DEFAULT_REWARD_CONFIG,emptyRewards,grantForClear,reconcileRewards,grantForStage,applySpin,drawItem,sanitizeRewards,DEFAULT_PRIZES} from '../src/services/rewards';
const memory=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>memory.set(k,v)},configurable:true});
localStorage.setItem('jangwon-starlight-reward-config-v2',JSON.stringify({...DEFAULT_REWARD_CONFIG,maxCoupons:0,arcadeMax:0}));const cfg=loadRewardConfig();assert.equal(cfg.maxCoupons,Infinity);assert.equal(cfg.arcadeMax,Infinity);
for(let n=0;n<=100;n++)assert.notEqual(drawItem(emptyRewards(),cfg,{},()=>n/100).kind,'badge');
let r=emptyRewards();for(let n=1;n<=400;n++)r=grantForStage(r,'archive',n,{...cfg,arcadeChance:1},()=>.7).rewards;
assert.equal(r.tickets.length,400);assert.equal(sanitizeRewards(r).stageGranted?.length,400);assert.equal(grantForStage(r,'archive',1,{...cfg,arcadeChance:1},()=>.7).item,null);
for(let n=0;n<100;n++){const t={id:'spin'+n,kind:'roulette' as const,label:'',emoji:'',createdAt:'',used:false};r={...r,tickets:[...r.tickets,t]};const spin=applySpin(r,t.id,DEFAULT_PRIZES[0],{...cfg,maxCoupons:0});assert.equal(spin.issued?.kind,'prize');assert.equal(spin.capped,false);r=spin.rewards}
assert.equal(sanitizeRewards(r).spins?.length,100);
let mission=grantForClear(undefined,2,1,cfg);mission={...mission,tickets:mission.tickets.filter(t=>t.kind!=='badge')};const oldCount=mission.tickets.length;mission=reconcileRewards(mission,[2],{},cfg);assert.equal(mission.tickets.length,oldCount+1);assert.equal(mission.tickets.filter(t=>t.source==='mission-badge:2').length,1);assert.deepEqual(JSON.parse(JSON.stringify(reconcileRewards(mission,[2],{},cfg))),JSON.parse(JSON.stringify(mission)));
console.log('PASS: legacy zero caps become unlimited; 400 rewards and 100 spins survive reload; rewards never substitute a badge; mission badge backfill is once-only');
