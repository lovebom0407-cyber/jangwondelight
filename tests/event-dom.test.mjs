// DOM integration tests, not a browser layout test. Only the device photo store is mocked.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink, readFile } from 'node:fs/promises';
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url:'https://event.test/', pretendToBeVisual:true });
for (const key of ['window','document','navigator','localStorage','sessionStorage','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Event','MouseEvent','File','Image']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo=()=>{};
// Any attempted background transmission makes these local-only flows fail.
const networkRequests=[];const originalFetch=globalThis.fetch;
const sortingRequests=[];globalThis.fetch=async(url,options)=>{if(url==='/api/sorting'){sortingRequests.push(JSON.parse(options.body));return {ok:true,json:async()=>({house:1,revision:'2026-10-17-three-houses'})}}networkRequests.push(String(url));throw Error('Unexpected network request')};
const originalXHR=window.XMLHttpRequest,originalWS=window.WebSocket;
window.XMLHttpRequest=class{constructor(){networkRequests.push('XMLHttpRequest');throw Error('Unexpected XHR')}};
window.WebSocket=class{constructor(){networkRequests.push('WebSocket');throw Error('Unexpected WebSocket')}};

HTMLElement.prototype.getBoundingClientRect=function(){return { x:0,y:0,left:0,top:0,right:360,bottom:480,width:360,height:480 };};
HTMLElement.prototype.setPointerCapture=()=>{};
HTMLElement.prototype.releasePointerCapture=()=>{};
let now=0,id=0;const frames=new Map(),timers=new Map();
Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
globalThis.requestAnimationFrame=fn=>{const n=++id;frames.set(n,fn);return n};
globalThis.cancelAnimationFrame=n=>frames.delete(n);
const originalTimers={setTimeout,clearTimeout,setInterval,clearInterval};
globalThis.setTimeout=(fn,ms=0)=>{const n=++id;timers.set(n,{fn,at:now+ms});return n};
globalThis.setInterval=(fn,ms=0)=>{const n=++id;timers.set(n,{fn,at:now+ms,interval:ms});return n};
globalThis.clearTimeout=globalThis.clearInterval=n=>timers.delete(n);
window.setTimeout=globalThis.setTimeout;window.clearTimeout=globalThis.clearTimeout;
window.setInterval=globalThis.setInterval;window.clearInterval=globalThis.clearInterval;
const React=await import('react');const {act}=React;const {createRoot}=await import('react-dom/client');
const bundle=new URL('./.event-dom-bundle.mjs',import.meta.url);
const out=await build({stdin:{contents:`export {default as App} from './src/App';export {portfolioFileName} from './src/services/driveSubmission';export {DRIVE_UPLOAD_ENDPOINT} from './src/data/driveUploadConfig';export {PortfolioScreen} from './src/components/screens/PortfolioScreen';export {TreasureScreen} from './src/components/screens/TreasureScreen';export {JuniorHub} from './src/components/screens/JuniorHub';export {FieldGuideScreen} from './src/components/screens/FieldGuideScreen';export {RewardsScreen} from './src/components/screens/RewardsScreen';export {MissionScreen} from './src/components/screens/MissionScreen';export {ArcadeScreen,openedGames} from './src/components/screens/ArcadeScreen';export {QuidditchSnitch,WandShooter} from './src/components/ActionGames';export {BattleGame} from './src/components/BattleGame';export {ObservatoryScreen} from './src/components/screens/ObservatoryScreen';export {JuniorSkyScreen} from './src/components/screens/JuniorSkyScreen';export {JuniorFinale} from './src/components/screens/JuniorFinale';export {CONSTELLATIONS} from './src/services/celestialMath';export {MapScreen} from './src/components/screens/MapScreen';export {PassportScreen} from './src/components/screens/PassportScreen';export {JournalScreen} from './src/components/screens/JournalScreen';export {getMissions,getOrderedMissions} from './src/data/storyData';export {putEvidence,getEvidence} from './src/services/evidenceDb';export * from './src/services/storage';export * from './src/services/rewards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false,plugins:[{name:'device-photo-store',setup(b){b.onResolve({filter:/evidenceDb$/},()=>({path:'evidence',namespace:'memory-evidence'}));b.onLoad({filter:/.*/,namespace:'memory-evidence'},()=>({contents:`const pool=new Map(),listeners=new Set();export const putEvidence=async e=>{pool.set(e.id,e)};export const getEvidence=async id=>{if(globalThis.__evidenceReadWait)await globalThis.__evidenceReadWait;return pool.get(id)||null};export const getAllEvidence=async()=>[...pool.values()];export const captureEvidencePhoto=async p=>{const e={...p,id:crypto.randomUUID(),capturedAt:new Date().toISOString(),kind:'activity',status:'pending',authorized:false};pool.set(e.id,e);if(globalThis.__captureWait)await globalThis.__captureWait;return e};export const authorizeEvidence=async id=>{if(typeof globalThis.__authorizeCalls==='number')globalThis.__authorizeCalls++;if(globalThis.__authorizeFail)throw Error('storage unavailable');if(globalThis.__authorizeWait)await globalThis.__authorizeWait;const e=pool.get(id);if(!e)throw Error('missing');e.authorized=true;listeners.forEach(fn=>fn(e))};export const captureZepQuizResult=captureEvidencePhoto;export const updateZepSubmissionStatus=async()=>{};export const removeParticipantEvidence=async id=>{for(const [k,e]of pool)if(e.participantId===id)pool.delete(k)};export const onEvidenceChange=fn=>{listeners.add(fn);return()=>listeners.delete(fn)}`}))}}]});
await writeFile(bundle,out.outputFiles[0].text);
const app=await import(bundle);let root=createRoot(document.getElementById('root'));const container=document.getElementById('root');let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS: '+name)}
async function render(element){await act(async()=>{root.render(element)});}
async function reset(){await act(async()=>root.unmount());frames.clear();timers.clear();container.innerHTML='';root=createRoot(container);}
const text=()=>container.textContent;
const buttons=()=>[...container.querySelectorAll('button')];
function find(label){const b=buttons().find(e=>e.textContent.includes(label));assert.ok(b,`button missing: ${label}`);return b;}
async function click(el){await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));}
async function input(el,value){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
async function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+16);await act(async()=>{for(const [n,t]of [...timers])if(t.at<=now){if(t.interval)t.at=now+t.interval;else timers.delete(n);t.fn();}const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));});}}
async function pointer(el,x,y,type='pointerdown'){const e=new Event(type,{bubbles:true});for(const[k,v]of Object.entries({clientX:x/100*360,clientY:y/100*480,pointerType:'touch',buttons:1,pointerId:1}))Object.defineProperty(e,k,{value:v});await act(async()=>el.dispatchEvent(e));}
const blank=()=>({...app.createBlankState(),name:'현장검증학생',family:'엄마',house:0,houseAssignmentRevision:'2026-10-17-three-houses',story:{introDone:true,finaleDone:false,scene:null,evidence:[]}});
let state=blank(),toasts=[];let nav='';
function FieldHarness(){const[s,set]=React.useState(state);return React.createElement(app.FieldGuideScreen,{state:s,onUpdateState:p=>{state={...s,...p};set(state);app.saveParticipant(state)},onNavigate:s=>nav=s,onShowToast:s=>toasts.push(s)});}
function RewardHarness(){const[s,set]=React.useState(state);return React.createElement(app.RewardsScreen,{state:s,onUpdateState:p=>{state={...s,...p};set(state);app.saveParticipant(state)},onNavigate:s=>nav=s,onShowToast:s=>toasts.push(s)});}
try {
 await check('name login → camera denied fallback → house assignment → story → map',async()=>{
  localStorage.clear();await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('별밤학교 입학하기'));
  await input(container.querySelector('#student-name'),'현장검증학생');await input(container.querySelector('#student-family'),'엄마');await input(container.querySelector('#student-classroom'),'2');
  await click(find('기기에 저장하고 탐험 시작하기'));assert.equal(container.querySelector('main').dataset.screen,'camera');assert.equal(app.portfolioFileName(app.loadCurrentParticipant()),'장원초등학교_3학년_2반_현장검증학생.pdf');
  await click(find('사진 없이 배정받기'));await advance(16000);assert.ok(text().includes('기숙사'));
  const go=buttons().find(b=>b.textContent.includes('탐험')||b.textContent.includes('별빛지도'));assert.ok(go);await click(go);
  // Introduction has genuine branching: select an option when needed, otherwise advance.
  for(let i=0;i<65 && container.querySelector('[role=dialog]');i++){
    const d=container.querySelector('[role=dialog]');const options=[...d.querySelectorAll('button')].filter(b=>!b.textContent.includes('운영')&&!b.textContent.includes('건너'));
    assert.ok(options.length);await click(options[0]);
  }
  assert.equal(container.querySelector('main').dataset.screen,'map');assert.ok(text().includes('진짜 별'));
 });
 await reset();
 await check('name registration works immediately without server login or backup fields',async()=>{
  localStorage.clear();await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('별밤학교 입학하기'));assert.equal(container.querySelector('#recovery-code'),null);assert.ok(!text().includes('Firebase'));assert.equal(container.querySelector('input[type=checkbox]'),null);await input(container.querySelector('#student-name'),'기기저장검증');await input(container.querySelector('#student-family'),'아빠');await input(container.querySelector('#student-classroom'),'1');await click(find('기기에 저장하고 탐험 시작하기'));assert.equal(container.querySelector('main').dataset.screen,'camera');assert.equal(app.loadCurrentParticipant().cloudPhotoConsent,false);await reset();
 });
 await check('pre-login field guide available; all four panels usable',async()=>{
  state={...app.createBlankState()};await render(React.createElement(FieldHarness));assert.ok(text().includes('19:50'));assert.ok(container.querySelector('[data-observation-sessions]'));assert.equal(container.querySelector('[data-observation-sessions] a'),null);
  for(const label of ['자료·영상','관측 기록','행사 안내','관측 준비']){await click(find(label));assert.ok(container.querySelector('[role=tabpanel]'));}
 });
 await check('night mode and source video load only after deliberate tap',async()=>{
  await click(find('어두운 관측 모드'));assert.equal(document.documentElement.dataset.night,'true');
  await click(find('자료·영상'));assert.equal(container.querySelector('iframe'),null);await click(find('달 여행 영상 재생'));
  assert.match(container.querySelector('iframe').src,/youtube-nocookie/);await click(find('행사 안내'));assert.equal(container.querySelector('iframe'),null);
 });
 await reset();state=blank();
 await check('observation memo persists and survives profile reload',async()=>{
  await render(React.createElement(FieldHarness));await click(find('관측 기록'));
  await input(container.querySelector('textarea'),'달의 경계에서 울퉁불퉁한 그림자를 보았어요.');
  await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.match(app.loadParticipant(state.name).fieldObservation.note,/그림자/);assert.ok(toasts.at(-1).includes('기기에 저장'));
 });
 await reset();
 await check('mobile shell has six navigable menu actions and no quiz prerequisite',async()=>{
  state=blank();app.saveParticipant(state);await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('탐험 이어하기'));assert.equal(container.querySelectorAll('nav button').length,6);
  for(const s of ['treasure','field-guide','observatory','arcade','tickets','map']){await click(container.querySelector(`[data-nav="${s}"]`));assert.equal(container.querySelector('main').dataset.screen,s);}
  assert.ok(container.querySelector('[data-game="0"]')===null);await click(container.querySelector('[data-nav="arcade"]'));assert.ok(container.querySelector('[data-game="6"]'));assert.ok(container.querySelector('[data-game="0"]'));assert.equal(container.querySelector('[data-game="troll"]'),null);
 });
 await reset();
 await check('student mission contains field activity and photo, without built-in quiz',async()=>{
  state={...blank(),selectedMissionIndex:2,unlocked:2};await render(React.createElement(app.MissionScreen,{state,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.ok(text().includes('가족과 현장 체험'));assert.ok(!buttons().some(b=>b.textContent.includes('퀴즈')));assert.ok(text().includes('사진 찍기'));
 });
 await reset();
 await check('four completions issue exactly one food pass; seven issue one special pass',async()=>{
  let r=app.emptyRewards();for(let i=0;i<7;i++){r=app.grantForClear(r,i,i+1);assert.equal(r.tickets.filter(t=>t.kind==='snack').length,i>=3?1:0);}
  assert.equal(r.tickets.filter(t=>t.kind==='roulette').length,7);assert.equal(r.tickets.filter(t=>t.kind==='special').length,1);
  assert.equal(app.reconcileRewards(r,[0,1,2,3,4,5,6]).tickets.length,r.tickets.length);
 });
 await check('roulette double tap consumes once; result recovers after unmount',async()=>{
  state={...blank(),completed:[0],rewards:app.grantForClear(undefined,0,1)};await render(React.createElement(RewardHarness));await click(find('룰렛 돌리러'));assert.ok(text().includes('룰렛 항목 보기'));assert.ok(text().includes('헤나'));assert.ok(!text().includes('확률'));assert.ok(!/\d+\s*%/.test(text()));assert.equal(container.querySelector('[aria-label*=확률]'),null);
  const b=find('돌려라');await act(async()=>{b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});assert.equal(state.rewards.spins.length,1);
  assert.equal(state.rewards.tickets.filter(t=>t.kind==='roulette'&&t.used).length,1);assert.match(container.querySelector('[data-wheel]').getAttribute('style'),/rotate/);
  await reset();state=app.loadParticipant(state.name);await render(React.createElement(RewardHarness));assert.ok(text().includes('룰렛 결과 기록'));assert.ok(text().includes(state.rewards.spins[0].name));
 });
 await reset();
 await check('short press cancels coupon use; long press redeems once',async()=>{
  state={...blank(),completed:[0,1,2,3],rewards:app.reconcileRewards(undefined,[0,1,2,3])};await render(React.createElement(RewardHarness));let b=container.querySelector('[data-hold]');
  await pointer(b,50,50);await advance(500);await pointer(b,50,50,'pointerup');assert.equal(state.rewards.tickets.find(t=>t.kind==='snack').used,false);
  b=container.querySelector('[data-hold]');await pointer(b,50,50);await advance(1300);assert.equal(state.rewards.tickets.find(t=>t.kind==='snack').used,true);assert.ok(text().includes('사용한 이용권'));assert.equal(app.redeemTicket(state.rewards,state.rewards.tickets.find(t=>t.kind==='snack').id).tickets.length,state.rewards.tickets.length);
 });
 await reset();
 await check('snitch game responds to touch and can actually be won',async()=>{
  const previousRandom=Math.random;Math.random=()=>0.15;
  let result=null;await render(React.createElement(app.QuidditchSnitch,{stage:1,difficulty:2,onEnd:x=>result=x}));
  for(let i=0;i<1000&&result===null;i++){const s=container.querySelector('[data-snitch]');await pointer(container.querySelector('[data-board]'),parseFloat(s.style.left),parseFloat(s.style.top));await advance(64);}
  Math.random=previousRandom;assert.equal(result,true);
 });
 await reset();
 await check('wand shooting hits clouds, completes, and releases animation loop',async()=>{
  const previousRandom=Math.random;Math.random=()=>0.5;
  let result=null;await render(React.createElement(app.WandShooter,{stage:1,difficulty:2,onEnd:x=>result=x}));
  for(let i=0;i<1200&&result===null;i++){const c=container.querySelector('[data-cloud]');if(c)await pointer(container.querySelector('[data-board]'),parseFloat(c.style.left),80);await advance(48);}
  Math.random=previousRandom;assert.equal(result,true);await reset();assert.equal(frames.size,0);
 });
 await check('backgrounding freezes game time; returning does not force timeout',async()=>{
  let result=null;await render(React.createElement(app.QuidditchSnitch,{stage:1,difficulty:0,onEnd:x=>result=x}));await advance(1000);const hud=text();Object.defineProperty(document,'hidden',{value:true,configurable:true});await advance(60000);assert.equal(text(),hud);assert.equal(result,null);Object.defineProperty(document,'hidden',{value:false,configurable:true});await advance(1000);assert.equal(result,null);
 });
 await reset();
 await check('failure screen offers easier retry; next attempt displays assistance',async()=>{
  state=blank();await render(React.createElement(app.ArcadeScreen,{state,onUpdateState:()=>{},onNavigate:()=>{}}));await click(container.querySelector('[data-game="1"]'));await click(container.querySelector('[data-stage="1"]'));await advance(45000);assert.ok(text().includes('다시!'));await click(find('다시!'));assert.ok(text().includes('쉬워짐'));
 });
 await reset();
 await check('final battle loss → weaker retry persists after screen recreation → win',async()=>{
  state=blank();app.saveParticipant(state);localStorage.removeItem(`jangwon-battle-assist-v1:${state.participantId}`);let won=false;
  const battle=()=>React.createElement(app.BattleGame,{playerName:state.name,collected:[0],onWin:()=>won=true});
  await render(battle());
  for(let i=0;i<160&&!text().includes('다시 도전!');i++){
    const next=buttons().find(b=>b.textContent.includes('눌러서 계속'));
    const attack=buttons().find(b=>b.textContent.includes('별빛 화살'));
    if(next)await click(next);else if(attack)await click(attack);else await advance(3000);
  }
  assert.ok(text().includes('다시 도전!'));await click(find('다시 도전!'));assert.ok(text().includes('약해짐'));
  assert.equal(localStorage.getItem(`jangwon-battle-assist-v1:${state.participantId}`),'1');await reset();await render(battle());assert.ok(text().includes('약해짐'));
  // Repeated mistakes and misses remain playable; the assistant tier reaches 3.
  for(let i=0;i<700&&!won;i++){
    const next=buttons().find(b=>b.textContent.includes('눌러서 계속'));
    const retry=buttons().find(b=>b.textContent.includes('다시 도전!'));
    const attack=buttons().find(b=>b.textContent.includes('별빛 화살'));
    const finish=buttons().find(b=>b.textContent.includes('이야기 계속하기'));
    if(next)await click(next);else if(retry)await click(retry);else if(attack)await click(attack);else if(finish)await click(finish);else await advance(3000);
  }
  assert.equal(won,true);await reset();
 });
 await check('junior age choice → admission → camera → explicit fallback → silent hat captions → treasure primary → photo missions',async()=>{
  localStorage.clear();await render(React.createElement(app.App));assert.ok(container.querySelector('[data-age-choice]'));await click(find('유치원·1·2학년'));await click(find('내 이름 쓰고 시작'));assert.ok(container.querySelector('[data-experience="junior-enroll"]'));
  await input(container.querySelector('#junior-name'),'별이');await click(find('2학년'));await input(container.querySelector('#student-classroom'),'3');await click(find('마법학교로 출발!'));assert.equal(container.querySelector('main').dataset.screen,'camera');await click(find('사진 없이 배정받기'));assert.equal(container.querySelector('main').dataset.screen,'thinking');await advance(13000);assert.equal(container.querySelector('main').dataset.screen,'assigned');await click(find('보물 찾으러 출발'));assert.ok(container.querySelector('[data-experience="junior"]'));assert.equal(container.querySelectorAll('nav button').length,5);assert.ok(container.querySelector('[data-primary-treasure]'));assert.equal(app.loadCurrentParticipant().grade,'2학년');assert.equal(app.loadCurrentParticipant().classroom,'3');
  await click(find('한마디 쓰러'));assert.equal(container.querySelector('main').dataset.screen,'mission');assert.equal(container.querySelector('[role=dialog]'),null);assert.ok(text().includes('장원 별밤학교에 남기는 한마디!'));
  // Supply an owner-scoped stored activity photo; this test mocks IndexedDB only.
  const saved=app.loadCurrentParticipant();await app.putEvidence({id:'junior-photo',participantId:saved.participantId,mission:0,jpeg:'data:image/jpeg;base64,AAA',capturedAt:new Date().toISOString(),status:'pending',authorized:false,kind:'activity'});saved.records[0]={...saved.records[0],evidenceId:'junior-photo',capturedAt:new Date().toISOString()};saved.pendingMission=0;app.saveParticipant(saved);await reset();await render(React.createElement(app.App));await click(find('유치원·1·2학년'));await click(find('이어서 하기'));await click(find('한마디 쓰러'));
  await click(container.querySelector('input[type=checkbox]'));await click(find('③ 별빛 받기!'));assert.equal(container.querySelector('main').dataset.screen,'map');const done=app.loadCurrentParticipant();assert.deepEqual(done.completed,[0]);assert.equal(done.spells.length,1);assert.equal(done.rewards.tickets.filter(t=>t.kind==='roulette').length,1);await reset();
 });
 await check('legacy unlisted courage resumes through policy check, preserving photos, badges and item history',async()=>{
  localStorage.clear();const old={...blank(),experienceMode:'standard',house:0,houseAssignmentRevision:'2026-10-17',photo:'data:image/jpeg;base64,AAA',completed:[2],records:{2:{evidenceId:'legacy-photo'}},sortingPhotoSkipped:false};app.saveParticipant(old);
  const before=app.loadCurrentParticipant();before.rewards.tickets[1].used=true;before.rewards.tickets[1].usedAt='2026-10-17T00:00:00.000Z';app.saveParticipant(before);await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('탐험 이어하기'));assert.equal(container.querySelector('main').dataset.screen,'thinking');assert.equal(container.querySelector('[data-sorting-camera]'),null);await advance(13000);assert.equal(container.querySelector('main').dataset.screen,'assigned');
  const after=app.loadCurrentParticipant();assert.equal(after.participantId,before.participantId);assert.equal(after.house,1);assert.equal(after.houseAssignmentRevision,'2026-10-17-three-houses');assert.equal(after.photo,before.photo);assert.deepEqual(after.completed,before.completed);assert.deepEqual(after.records,before.records);assert.deepEqual(after.rewards,before.rewards);await reset();
 });
 await check('all seven missions show their own photo instructions and framing guidance',async()=>{
  for(let i=0;i<7;i++){const m=app.getMissions()[i];state={...blank(),selectedMissionIndex:i,unlocked:i};await render(React.createElement(app.MissionScreen,{state,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.ok(text().includes(m.photoDescription));assert.ok(text().includes(m.photoFrameGuide));if(i===3)assert.ok(text().includes('AI OCEANS'));if(i===5){assert.ok(text().includes('타투'));assert.ok(text().includes('페이스페인팅 후 인증샷'));}await reset();}
 });
 await check('standard map follows new field order; labels are visible on mobile and clicks keep stored mission IDs',async()=>{
  const before={...blank(),experienceMode:'standard',completed:[0,2],records:{0:{evidenceId:'astro-preserved'},2:{evidenceId:'costume-preserved'}}};
  const snapshot=JSON.stringify(before);let selected=null;
  await render(React.createElement(app.MapScreen,{state:before,onNavigate:()=>{},onSelectMission:id=>selected=id,onResumeDialogue:()=>{},onStartFinale:()=>{}}));
  const cards=[...container.querySelectorAll('[data-mission-id]')];assert.deepEqual(cards.map(c=>Number(c.dataset.missionId)),[1,2,3,4,5,0,6]);
  const labels=['행사장 아무곳이나','기록보기','AI 체험존 부스 방문','네컷 사진 부스 방문','페이스페인팅 부스 방문','기록보기','AI 성과공유 부스 방문 · 패들렛 작성'];
  for(let i=0;i<cards.length;i++){assert.equal(cards[i].dataset.missionNumber,String(i+1));const label=cards[i].querySelector('[data-visit-label]');assert.equal(label.textContent,labels[i]);assert.ok(!label.className.includes('hidden'));await click(cards[i]);assert.equal(selected,Number(cards[i].dataset.missionId));}
  assert.ok(cards[5].textContent.includes('19:50'));assert.ok(cards[5].textContent.includes('천문수업'));assert.ok(cards[2].textContent.includes('AI OCEANS'));assert.ok(cards[6].textContent.includes('장원 별밤학교에 남기는 한마디!'));assert.equal(JSON.stringify(before),snapshot);await reset();
  for(const id of [0,6]){const pupil={...before,selectedMissionIndex:id,unlocked:id,completed:[]};await render(React.createElement(app.MissionScreen,{state:pupil,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.equal(container.querySelector('[data-zep-guide]'),null);if(id===0){assert.ok(!text().includes('ZEP'));assert.ok(text().includes('천체관측하는 모습'));}assert.ok(text().includes(id===0?'6. 천문수업':'7. 협력 마법 실습'));assert.ok(text().includes(id===0?'19:50':'AI 성과공유'));assert.ok(text().includes(id===0?'사진으로':'패들렛'));assert.equal(container.querySelectorAll('input[type=radio]').length,0);await reset();}
  for(const [mode,id] of [['standard',6],['junior',0]])for(const completed of [[],[id]]){
   const pupil={...before,experienceMode:mode,selectedMissionIndex:id,unlocked:id,completed};const snapshot=JSON.stringify(pupil);let awards=0;
   await render(React.createElement(app.MissionScreen,{state:pupil,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>awards++}));
   const link=container.querySelector('[data-external-activity-guide] a');assert.equal(link.href,'https://padlet.com/och9431/padlet-s024og0gfvauur8r2cy3');assert.equal(link.target,'_blank');assert.ok(link.rel.includes('noopener'));assert.ok(text().includes('장원 별밤학교에 남기는 한마디!'));assert.ok(!text().includes('ZEP'));assert.ok(!text().includes('역사'));assert.equal(awards,0);assert.equal(JSON.stringify(pupil),snapshot);await reset();
  }
  const junior={...before,experienceMode:'junior',selectedMissionIndex:6,unlocked:6};await render(React.createElement(app.MissionScreen,{state:junior,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.equal(container.querySelector('[data-zep-guide]'),null);assert.ok(text().includes('가족과 함께 활동'));await reset();
 });
 await check('observation assigns sessions by grade without a survey, preserving progress and other booths',async()=>{
  localStorage.clear();const pupil={...blank(),experienceMode:'standard',grade:'3학년'};app.saveParticipant(pupil);
  await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('탐험 이어하기'));await click(container.querySelector('[data-mission-id="0"]'));
  const entry=container.querySelector('[data-observation-sessions]');assert.ok(entry);assert.equal(entry.querySelector('a'),null);assert.equal(entry.querySelector('[data-assigned-observation-session]').dataset.assignedObservationSession,'1');assert.ok(entry.textContent.includes('3학년 학생은 1부'));assert.ok(!text().includes('설문'));assert.equal(container.querySelector('[role=dialog]'),null);assert.deepEqual(app.loadCurrentParticipant().completed,[]);
  await click(find('천문수업 이야기 계속하기'));assert.ok(container.querySelector('[role=dialog]'));await reset();
  for(const [grade,session] of [['유치원',1],['1학년',1],['2학년',1],['3학년',1],['4학년',2],['5학년',2],['6학년',2]])for(const done of [false,true]){
   const junior=['유치원','1학년','2학년'].includes(grade),id=junior?6:0;const state={...pupil,grade,experienceMode:junior?'junior':'standard',selectedMissionIndex:id,unlocked:id,completed:done?[id]:[]};const snapshot=JSON.stringify(state);
   await render(React.createElement(app.MissionScreen,{state,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));const guide=container.querySelector('[data-observation-sessions]');assert.equal(guide.querySelector('[data-assigned-observation-session]').dataset.assignedObservationSession,String(session));assert.ok(guide.textContent.includes('유치원·1·2·3학년'));assert.ok(guide.textContent.includes('4·5·6학년'));assert.equal(guide.querySelector('a'),null);assert.equal(container.querySelector('input[type=radio]'),null);assert.equal(JSON.stringify(state),snapshot);await reset();
  }
  for(const [mode,id]of[['standard',5],['junior',0]]){await render(React.createElement(app.MissionScreen,{state:{...pupil,experienceMode:mode,selectedMissionIndex:id,unlocked:id},onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.equal(container.querySelector('[data-observation-sessions]'),null);await reset();}
  await render(React.createElement(app.JuniorSkyScreen,{state:{...pupil,grade:'유치원',experienceMode:'junior'},onNavigate:()=>{},onUpdateState:()=>{}}));await click(find('진짜 별 보기'));assert.equal(container.querySelector('[data-assigned-observation-session]').dataset.assignedObservationSession,'1');assert.ok(!text().includes('설문'));await reset();
 });
 await check('booths 03 and 05 store separate quiz photos without replacing its completed activity photo; PDF includes both owner-scoped photos',async()=>{
  for(const missionId of [3,5]){
  const OriginalImage=globalThis.Image,originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalContext=dom.window.HTMLCanvasElement.prototype.getContext,originalData=dom.window.HTMLCanvasElement.prototype.toDataURL;const images=[];
  let pupil={...blank(),experienceMode:'standard',selectedMissionIndex:missionId,unlocked:missionId,completed:[missionId],records:{[missionId]:{evidenceId:'original-book-photo',status:'completed'}}};
  await app.putEvidence({id:'original-book-photo',participantId:pupil.participantId,mission:missionId,jpeg:'data:image/jpeg;base64,T1JJR0lOQUw=',kind:'activity',authorized:true});
  function PhotoHarness(){const[s,set]=React.useState(pupil);return React.createElement(app.MissionScreen,{state:s,onUpdateState:p=>{pupil={...s,...p};app.saveParticipant(pupil);set(pupil)},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{throw Error('Extra photo must not award another badge')}})}
  try{
   Object.defineProperty(globalThis,'Image',{value:class{naturalWidth=800;naturalHeight=600;constructor(){images.push(this)}set src(v){this.url=v}},configurable:true});URL.createObjectURL=()=> 'blob:extra-photo';URL.revokeObjectURL=()=>{};dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage:()=>{}});dom.window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,UVVJWg==';
   await render(React.createElement(PhotoHarness));assert.equal(container.querySelector('img[alt="활동 인증샷"]').src,'data:image/jpeg;base64,T1JJR0lOQUw=');await click(find('ZEP QUIZ 인증샷'));assert.ok(text().includes(missionId===3?'그림책·AI OCEANS':'천문 사전지식 ZEP QUIZ'));const fileInput=container.querySelector('input[type=file]');Object.defineProperty(fileInput,'files',{value:[new File(['photo'],'quiz.jpg',{type:'image/jpeg'})]});await act(async()=>fileInput.dispatchEvent(new Event('change',{bubbles:true})));await act(async()=>images[0].onload());
   assert.equal(pupil.records[missionId].evidenceId,'original-book-photo');assert.ok(pupil.records[missionId].quizActivityEvidenceId);assert.deepEqual(pupil.completed,[missionId]);assert.equal(find('ZEP 인증샷 보관하기').disabled,true);
   await click(container.querySelector('input[type=checkbox]'));globalThis.__authorizeFail=true;await click(find('ZEP 인증샷 보관하기'));delete globalThis.__authorizeFail;assert.equal(pupil.records[missionId].quizActivityConfirmedAt,undefined);await click(find('ZEP 인증샷 보관하기'));assert.ok(pupil.records[missionId].quizActivityConfirmedAt);assert.equal((await app.getEvidence(pupil.records[missionId].quizActivityEvidenceId)).activitySlot,'quiz');assert.equal(app.loadCurrentParticipant().records[missionId].evidenceId,'original-book-photo');
   await click(find('체험 인증샷'));assert.equal(container.querySelector('img[alt="활동 인증샷"]').src,'data:image/jpeg;base64,T1JJR0lOQUw=');await click(find('ZEP QUIZ 인증샷'));assert.ok(text().includes('보관 완료'));await reset();
   await render(React.createElement(app.PortfolioScreen,{state:pupil,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{}}));assert.equal(container.querySelectorAll('#portfolio-printable-document > section').length,3);assert.equal(container.querySelectorAll('#portfolio-printable-document figure').length,8);assert.equal(container.querySelector('[data-extra-quiz-photo] img').src,'data:image/jpeg;base64,UVVJWg==');assert.ok(container.querySelector('[data-extra-quiz-photo] figcaption').textContent.startsWith(missionId===3?'03 추가':'05 추가'));assert.ok(container.querySelectorAll('#portfolio-printable-document figure')[missionId===3?2:4].textContent.includes(missionId===3?'AI OCEANS':'페이스페인팅'));await reset();
   await render(React.createElement(app.PortfolioScreen,{state:{...pupil,participantId:'other-owner'},onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{}}));assert.equal(container.querySelector('[data-extra-quiz-photo]'),null);assert.equal(container.querySelectorAll('#portfolio-printable-document figure img').length,0);await reset();
  }finally{delete globalThis.__authorizeFail;Object.defineProperty(globalThis,'Image',{value:OriginalImage,configurable:true});URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.HTMLCanvasElement.prototype.getContext=originalContext;dom.window.HTMLCanvasElement.prototype.toDataURL=originalData;}
  }
 });
 await check('booth 05 adds astronomy preknowledge ZEP while keeping the tattoo and face-painting photo instructions',async()=>{
  await render(React.createElement(app.MissionScreen,{state:{...blank(),experienceMode:'standard',selectedMissionIndex:5,unlocked:5},onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));assert.ok(container.querySelector('[data-additional-zep-guide]').textContent.includes('천문 사전지식 ZEP QUIZ'));assert.ok(container.querySelector('[data-photo-description]').textContent.includes('타투 또는 페이스페인팅'));assert.equal(container.querySelector('[data-quiz-activity]'),null);await click(find('ZEP QUIZ 인증샷'));assert.ok(container.querySelector('[data-quiz-activity]').textContent.includes('천문 사전지식'));assert.equal(container.querySelector('input[type=file][capture]').getAttribute('capture'),'environment');assert.ok(text().includes('퀴즈 활동사진 찍기'));await click(find('체험 인증샷'));assert.ok(container.querySelector('[data-photo-description]').textContent.includes('타투 또는 페이스페인팅'));assert.ok(!text().includes('점수 제출'));await reset();
 });
 await check('leaving the extra quiz-photo tab during a save cancels late record changes and preserves the original photo',async()=>{
  const OriginalImage=globalThis.Image,originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalContext=dom.window.HTMLCanvasElement.prototype.getContext,originalData=dom.window.HTMLCanvasElement.prototype.toDataURL;const images=[];let updates=0,release;
  try{Object.defineProperty(globalThis,'Image',{value:class{naturalWidth=800;naturalHeight=600;constructor(){images.push(this)}set src(v){this.url=v}},configurable:true});URL.createObjectURL=()=> 'blob:late-quiz-photo';URL.revokeObjectURL=()=>{};dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage:()=>{}});dom.window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,UVVJWg==';globalThis.__captureWait=new Promise(r=>release=r);
   const pupil={...blank(),experienceMode:'standard',selectedMissionIndex:3,unlocked:3,records:{3:{evidenceId:'unchanged-primary'}}};await render(React.createElement(app.MissionScreen,{state:pupil,onUpdateState:()=>updates++,onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));await click(find('ZEP QUIZ 인증샷'));const input=container.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new File(['photo'],'quiz.jpg',{type:'image/jpeg'})]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));let pending;await act(async()=>{pending=images[0].onload();await Promise.resolve()});await click(find('체험 인증샷'));await act(async()=>{release();await pending});assert.equal(updates,0);assert.equal(pupil.records[3].evidenceId,'unchanged-primary');await reset();
  }finally{delete globalThis.__captureWait;Object.defineProperty(globalThis,'Image',{value:OriginalImage,configurable:true});URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.HTMLCanvasElement.prototype.getContext=originalContext;dom.window.HTMLCanvasElement.prototype.toDataURL=originalData;}
 });
 await check('reordered PDF, passport and journal keep each photo, completion and note attached to its original ID',async()=>{
  const pupil={...blank(),experienceMode:'standard',completed:[0,2],records:{}};
  for(let id=0;id<7;id++){const evidenceId='reordered-photo-'+id;const jpeg='data:image/jpeg;base64,UEhPVE8'+id;await app.putEvidence({id:evidenceId,participantId:pupil.participantId,mission:id,jpeg,capturedAt:new Date().toISOString(),kind:'activity'});pupil.records[id]={evidenceId,userNote:'원래미션기록-'+id};}
  await render(React.createElement(app.PortfolioScreen,{state:pupil,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{}}));const figures=[...container.querySelectorAll('#portfolio-printable-document figure')];assert.equal(figures.length,7);
  const ids=[1,2,3,4,5,0,6];for(let i=0;i<7;i++){assert.equal(figures[i].querySelector('img').src,'data:image/jpeg;base64,UEhPVE8'+ids[i]);assert.ok(figures[i].querySelector('figcaption').textContent.startsWith((i+1)+'. '));}assert.ok(figures[5].textContent.includes('천체관측 체험'));assert.ok(figures[6].textContent.includes('패들렛'));
  await reset();await render(React.createElement(app.PassportScreen,{state:pupil,onNavigate:()=>{}}));const stamps=[...container.querySelectorAll('span')].filter(el=>el.textContent==='날인 완료');assert.equal(stamps.length,2);assert.ok(stamps[0].parentElement.parentElement.textContent.includes('02'));assert.ok(stamps[1].parentElement.parentElement.textContent.includes('06'));
  await reset();await render(React.createElement(app.JournalScreen,{state:pupil,onNavigate:()=>{}}));assert.ok(text().includes('원래미션기록-0'));assert.ok(text().includes('원래미션기록-2'));assert.ok(!text().includes('원래미션기록-1'));await reset();
 });
 await check('standard observatory supports all ten puzzles, preserves retired records, and contains no camera tab',async()=>{
  let obs={...blank(),observatory:{completedConstellations:['ursa_major']}};function ObsHarness(){const[s,set]=React.useState(obs);return React.createElement(app.ObservatoryScreen,{state:s,onUpdateState:p=>{obs={...s,...p};set(obs)},onBackToMap:()=>{}})}
  await render(React.createElement(ObsHarness));assert.equal(container.querySelectorAll('[data-constellation]').length,10);assert.ok(!text().includes('카메라 별 찾기'));await click(find('대화 닫기'));
  for(const c of app.CONSTELLATIONS){await click(container.querySelector(`[data-constellation="${c.id}"]`));assert.equal(container.querySelectorAll('[data-puzzle-star] text').length,0);for(const[a,b]of c.lines){await click(container.querySelector(`[data-puzzle-star="${a}"]`));await click(container.querySelector(`[data-puzzle-star="${b}"]`));}assert.ok(obs.observatory.completedConstellations.includes(c.id));const resume=buttons().find(b=>b.textContent.includes('계속 탐색하기'));if(resume)await click(resume);}
  assert.equal(obs.observatory.completedConstellations.length,11);assert.ok(text().includes('10/10'));assert.ok(text().includes('나만의 성좌'));await click(find('도계 밤하늘 지도'));assert.equal(container.querySelectorAll('[data-sky-constellation]').length,10);await reset();
 });
 await check('junior sky uses guided star taps for the same ten constellations',async()=>{
  let child={...blank(),experienceMode:'junior',observatory:{completedConstellations:[]}};function SkyHarness(){const[s,set]=React.useState(child);return React.createElement(app.JuniorSkyScreen,{state:s,onUpdateState:p=>{child={...s,...p};set(child)},onNavigate:()=>{}})}
  await render(React.createElement(SkyHarness));await click(find('별 모양 만들기'));assert.equal(container.querySelectorAll('[data-junior-constellation]').length,10);for(const c of app.CONSTELLATIONS){await click(container.querySelector(`[data-junior-constellation="${c.id}"]`));assert.equal(container.querySelectorAll('[data-junior-star] text').length,0);assert.ok(!/\d+번 별/.test(text()));for(const[,b]of c.lines)await click(container.querySelector(`[data-junior-star="${b}"]`));assert.ok(child.observatory.completedConstellations.includes(c.id));await click(find('다른 별도 만들기'));}await reset();
 });
 await check('junior final duel can be finished with one large spell action and preserves the seven missions',async()=>{
  let child={...blank(),experienceMode:'junior',completed:[0,1,2,3,4,5,6]};let route='';await render(React.createElement(app.JuniorFinale,{state:child,onUpdateState:p=>child={...child,...p},onNavigate:s=>route=s}));for(let i=0;i<12&&!text().includes('모험을 마쳤어요!');i++){await click(find('별빛 마법 쏘기'));await advance(500);}await click(find('모험을 마쳤어요!'));assert.equal(child.story.finaleDone,true);assert.equal(route,'map');assert.equal(child.completed.length,7);await reset();
 });
 await check('junior gifts group roulette tickets into one action and persist its result',async()=>{
  state={...blank(),experienceMode:'junior',completed:[0,1,2,3],rewards:app.reconcileRewards(undefined,[0,1,2,3])};await render(React.createElement(RewardHarness));assert.ok(container.querySelector('[data-experience="junior-gifts"]'));assert.equal(buttons().filter(b=>b.textContent.includes('룰렛 돌리기')).length,1);assert.ok(text().includes('4번 돌릴 수 있어요'));assert.ok(container.querySelector('[data-hold]'));await click(find('룰렛 돌리기'));assert.ok(container.querySelector('[data-wheel]'));assert.equal([...container.querySelectorAll('details')].find(d=>d.textContent.includes('어떤 선물')).open,false);assert.ok(!text().includes('확률'));assert.ok(!/\d+\s*%/.test(text()));assert.equal(container.querySelector('[aria-label*=확률]'),null);await click(find('돌려라'));await advance(4400);assert.equal(state.rewards.spins.length,1);assert.equal(state.rewards.tickets.filter(t=>t.kind==='roulette'&&t.used).length,1);await reset();await render(React.createElement(RewardHarness));assert.ok(text().includes(state.rewards.spins[0].name));await reset();
 });
 await check('junior games share seven games, have five stages and a working easy practice button',async()=>{
  state={...blank(),experienceMode:'junior',spells:[0,1,2,3,4,5,6]};await render(React.createElement(app.ArcadeScreen,{state,onUpdateState:()=>{},onNavigate:()=>{}}));assert.deepEqual([...container.querySelectorAll('[data-game]')].map(b=>b.dataset.game),['0','1','2','3','4','5','6']);assert.equal(container.querySelector('[data-locked-episode]'),null);await click(container.querySelector('[data-game="6"]'));assert.equal(container.querySelectorAll('[data-stage]').length,5);await click(container.querySelector('[data-practice]'));await advance(1900);assert.ok(container.querySelector('[data-board]'));await click(find('게임 고르기'));assert.ok(container.querySelector('[data-experience="junior-games"]'));await reset();
 });
 await check('choosing the older grade group starts enrollment at grade three and preserves existing progress',async()=>{
  localStorage.clear();state={...blank(),grade:'2학년',experienceMode:'junior',completed:[0,1],records:{0:{evidenceId:'kept-photo'}}};app.saveParticipant(state);await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('새 이름으로 입학하기'));assert.equal(container.querySelector('#student-grade').value,'3학년');assert.deepEqual(app.loadCurrentParticipant().completed,[0,1]);assert.equal(app.loadCurrentParticipant().records[0].evidenceId,'kept-photo');await reset();
 });
 await check('legacy cloud keys are removed and online events preserve local progress and age choice',async()=>{
  localStorage.clear();state={...blank(),experienceMode:'junior',completed:[0,2],records:{0:{evidenceId:'kept-photo'}},cloudPhotoConsent:true};app.saveParticipant(state);localStorage.setItem('jangwon-cloud-login-v1:legacy','obsolete-secret');localStorage.setItem('jangwon-cloud-dirty-v1:legacy','obsolete-pending');await render(React.createElement(app.App));assert.equal(localStorage.getItem('jangwon-cloud-login-v1:legacy'),null);assert.equal(localStorage.getItem('jangwon-cloud-dirty-v1:legacy'),null);await click(find('유치원·1·2학년'));await click(find('이어서 하기'));await act(async()=>window.dispatchEvent(new Event('online')));const saved=app.loadCurrentParticipant();assert.deepEqual(saved.completed,[0,2]);assert.equal(saved.records[0].evidenceId,'kept-photo');assert.equal(saved.cloudPhotoConsent,false);assert.ok(text().includes('기기에 보관'));assert.ok(!text().includes('복구 코드'));await reset();
 });
 await check('changing photo missions clears the previous preview while a new read is pending',async()=>{
  const a={...blank(),selectedMissionIndex:0,unlocked:0,records:{0:{evidenceId:'preview-old'}}};await app.putEvidence({id:'preview-old',participantId:a.participantId,mission:0,jpeg:'data:image/jpeg;base64,OLD',kind:'activity'});const props={onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}};await render(React.createElement(app.MissionScreen,{...props,state:a}));assert.ok(container.querySelector('img[alt="활동 인증샷"]'));let release;globalThis.__evidenceReadWait=new Promise(r=>release=r);await render(React.createElement(app.MissionScreen,{...props,state:{...a,selectedMissionIndex:1,unlocked:1,records:{1:{evidenceId:'missing'}}}}));assert.equal(container.querySelector('img[alt="활동 인증샷"]'),null);await act(async()=>release());delete globalThis.__evidenceReadWait;await reset();
 });
 await check('late photo storage completion cannot update a screen or profile after leaving it',async()=>{
  const OriginalImage=globalThis.Image,originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalContext=dom.window.HTMLCanvasElement.prototype.getContext,originalData=dom.window.HTMLCanvasElement.prototype.toDataURL;const images=[],revoked=[];let updates=0,release;
  try{Object.defineProperty(globalThis,'Image',{value:class{naturalWidth=800;naturalHeight=600;constructor(){images.push(this)}set src(v){this.url=v}},configurable:true});URL.createObjectURL=()=> 'blob:test-photo';URL.revokeObjectURL=u=>revoked.push(u);dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage:()=>{}});dom.window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,AAA';globalThis.__captureWait=new Promise(r=>release=r);
   const s={...blank(),selectedMissionIndex:0,unlocked:0};await render(React.createElement(app.MissionScreen,{state:s,onUpdateState:()=>updates++,onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>{}}));const fileInput=container.querySelector('input[type=file]');Object.defineProperty(fileInput,'files',{value:[new File(['photo'],'photo.jpg',{type:'image/jpeg'})]});await act(async()=>fileInput.dispatchEvent(new Event('change',{bubbles:true})));let pending;await act(async()=>{pending=images[0].onload();await Promise.resolve()});await reset();await act(async()=>{release();await pending});assert.equal(updates,0);assert.ok(revoked.includes('blob:test-photo'));
  }finally{delete globalThis.__captureWait;Object.defineProperty(globalThis,'Image',{value:OriginalImage,configurable:true});URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.HTMLCanvasElement.prototype.getContext=originalContext;dom.window.HTMLCanvasElement.prototype.toDataURL=originalData;}await reset();
 });
 await check('photo authorization failure keeps the mission open and does not grant a star',async()=>{
  const s={...blank(),selectedMissionIndex:0,unlocked:0,records:{0:{evidenceId:'auth-fail-photo'}}};await app.putEvidence({id:'auth-fail-photo',participantId:s.participantId,mission:0,jpeg:'data:image/jpeg;base64,AAA',kind:'activity'});let awarded=0;const notices=[];await render(React.createElement(app.MissionScreen,{state:s,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:m=>notices.push(m),onAwardStar:()=>awarded++}));await click(container.querySelector('input[type=checkbox]'));globalThis.__authorizeFail=true;await click(find('별빛 받기'));delete globalThis.__authorizeFail;assert.equal(awarded,0);assert.ok(notices.at(-1).includes('저장하지 못했어요'));assert.equal(find('별빛 받기').disabled,false);await reset();
 });
 await check('double tapping a pending photo confirmation authorizes once and leaving cancels its award',async()=>{
  const s={...blank(),selectedMissionIndex:0,unlocked:0,records:{0:{evidenceId:'auth-delayed-photo'}}};await app.putEvidence({id:'auth-delayed-photo',participantId:s.participantId,mission:0,jpeg:'data:image/jpeg;base64,AAA',kind:'activity'});let awarded=0,release;globalThis.__authorizeCalls=0;globalThis.__authorizeWait=new Promise(r=>release=r);await render(React.createElement(app.MissionScreen,{state:s,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{},onAwardStar:()=>awarded++}));await click(container.querySelector('input[type=checkbox]'));const b=find('별빛 받기');await act(async()=>{b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});assert.equal(globalThis.__authorizeCalls,1);await reset();await act(async()=>release());assert.equal(awarded,0);delete globalThis.__authorizeWait;delete globalThis.__authorizeCalls;
 });
 await check('full device storage does not mark an unsaved star complete and can be retried',async()=>{
  localStorage.clear();const child={...blank(),experienceMode:'junior',grade:'1학년',records:{0:{evidenceId:'quota-photo'}},pendingMission:0};await app.putEvidence({id:'quota-photo',participantId:child.participantId,mission:0,jpeg:'data:image/jpeg;base64,AAA',kind:'activity',authorized:false});app.saveParticipant(child);await render(React.createElement(app.App));await click(find('유치원·1·2학년'));await click(find('이어서 하기'));await click(find('한마디 쓰러'));await click(container.querySelector('input[type=checkbox]'));const originalSet=dom.window.Storage.prototype.setItem,originalError=console.error;
  try{dom.window.Storage.prototype.setItem=function(){throw new Error('Quota exceeded')};console.error=()=>{};await click(find('③ 별빛 받기!'));assert.equal(container.querySelector('main').dataset.screen,'mission');assert.deepEqual(app.loadCurrentParticipant().completed,[]);assert.ok(text().includes('저장소 공간 오류'));}finally{dom.window.Storage.prototype.setItem=originalSet;console.error=originalError;}await click(find('③ 별빛 받기!'));assert.equal(container.querySelector('main').dataset.screen,'map');assert.deepEqual(app.loadCurrentParticipant().completed,[0]);await reset();
 });
 await check('seven previously photographed junior missions can be claimed in any order and unlock the finale',async()=>{
  localStorage.clear();const child={...blank(),experienceMode:'junior',grade:'1학년',records:{},pendingMission:6};for(let i=0;i<7;i++){const id='stored-photo-'+i;child.records[i]={evidenceId:id};await app.putEvidence({id,participantId:child.participantId,mission:i,jpeg:'data:image/jpeg;base64,AAA',kind:'activity',authorized:false});}app.saveParticipant(child);await render(React.createElement(app.App));await click(find('유치원·1·2학년'));await click(find('이어서 하기'));
  for(const i of [3,1,6,0,5,2,4]){await click(container.querySelector(`[data-junior-mission="${i}"]`));await click(container.querySelector('input[type=checkbox]'));await click(find('③ 별빛 받기!'));assert.equal(container.querySelector('main').dataset.screen,'map');assert.ok(app.loadCurrentParticipant().completed.includes(i));}
  const done=app.loadCurrentParticipant();assert.equal(done.completed.length,7);assert.equal(done.rewards.tickets.filter(t=>t.kind==='roulette').length,7);assert.equal(done.rewards.tickets.filter(t=>t.kind==='snack').length,1);assert.equal(done.rewards.tickets.filter(t=>t.kind==='special').length,1);await click(find('마지막 별빛 마법!'));assert.equal(container.querySelector('main').dataset.screen,'junior-final');await reset();
 });
 await check('final portfolio contains three pages and seven owned mission photos; Drive submission waits for guardian consent',async()=>{
  const pupil={...blank(),experienceMode:'junior',completed:[0,1,2,3,4,5,6],records:{}};
  for(let i=0;i<7;i++){const id='portfolio-photo-'+i;pupil.records[i]={evidenceId:id};await app.putEvidence({id,participantId:pupil.participantId,mission:i,jpeg:'data:image/jpeg;base64,PHOTO'+i,kind:'activity',authorized:true});}
  await render(React.createElement(app.PortfolioScreen,{state:pupil,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{}}));
  assert.equal(container.querySelectorAll('#portfolio-printable-document > section').length,3);
  assert.equal(container.querySelectorAll('#portfolio-printable-document figure img').length,7);
  assert.equal(find('최종 PDF 제출하기').disabled,true);if(app.DRIVE_UPLOAD_ENDPOINT){assert.equal(container.querySelector('input[type=checkbox]').checked,false);assert.ok(!text().includes('제출 기능을 준비'));}else{assert.ok(text().includes('제출 기능을 준비'));}
  await app.putEvidence({id:'portfolio-photo-0',participantId:'another-pupil',mission:0,jpeg:'data:image/jpeg;base64,OTHER',kind:'activity'});
  const switched={...pupil,participantId:'new-pupil'};await render(React.createElement(app.PortfolioScreen,{state:switched,onUpdateState:()=>{},onNavigate:()=>{},onShowToast:()=>{}}));
  assert.equal(container.querySelectorAll('#portfolio-printable-document figure img').length,0);
  await reset();let route='';await render(React.createElement(app.JuniorHub,{state:{...pupil,story:{...pupil.story,finaleDone:true}},onNavigate:s=>route=s,onSelectMission:()=>{},onResumeDialogue:()=>{},onStartFinale:()=>{}}));
  await click(find('우리 가족 PDF 보기'));assert.equal(route,'portfolio');await reset();
 });
 await check('older profiles can add their classroom in the portfolio without losing photos or mission progress',async()=>{
  let legacy={...blank(),name:'홍길동',school:'장원초',grade:'3학년',classroom:'',completed:[0,2],records:{0:{evidenceId:'preserved-photo'}}};const identity=legacy.participantId;
  function InfoHarness(){const[s,set]=React.useState(legacy);return React.createElement(app.PortfolioScreen,{state:s,onUpdateState:p=>{legacy={...s,...p};app.saveParticipant(legacy);set(legacy)},onNavigate:()=>{},onShowToast:()=>{}})}
  await render(React.createElement(InfoHarness));assert.ok(text().includes('반미입력'));
  await input(container.querySelector('#pdf-classroom'),'2');
  assert.ok(container.querySelector('[data-pdf-filename]').textContent.includes('장원초등학교_3학년_2반_홍길동.pdf'));
  const saved=app.loadCurrentParticipant();assert.equal(saved.participantId,identity);assert.equal(saved.classroom,'2');assert.deepEqual(saved.completed,[0,2]);assert.equal(saved.records[0].evidenceId,'preserved-photo');await reset();
 });
 await check('custom school and classroom persist from admission into the generated filename',async()=>{
  localStorage.clear();await render(React.createElement(app.App));await click(find('3~6학년'));await click(find('별밤학교 입학하기'));
  await input(container.querySelector('#student-name'),'김별빛');await input(container.querySelector('#student-family'),'아빠');
  const school=container.querySelector('#student-school');await act(async()=>{school.value='기타';school.dispatchEvent(new Event('change',{bubbles:true}))});
  await input(container.querySelector('#student-other-school'),'도계초등학교');await input(container.querySelector('#student-classroom'),'04반');
  assert.equal(app.loadDraft().school,'도계초등학교');assert.equal(app.loadDraft().classroom,'4');
  await click(find('기기에 저장하고 탐험 시작하기'));const saved=app.loadCurrentParticipant();assert.equal(saved.classroom,'4');assert.equal(app.portfolioFileName(saved),'도계초등학교_3학년_4반_김별빛.pdf');await reset();
 });
 await check('treasure rules, original map and enlargement remain accessible in both modes',async()=>{
  for(const mode of ['standard','junior']){await render(React.createElement(app.TreasureScreen,{state:{...blank(),experienceMode:mode},onNavigate:()=>{}}));assert.ok(text().includes('가족당 최대 3개'));assert.ok(text().includes('18:00'));assert.ok(text().includes('운영본부'));const map=container.querySelector('img');assert.equal(map.getAttribute('src'),'/assets/treasure-map-designed.svg');await click(find('지도 크게 보기'));assert.equal(map.style.width,'200%');await click(find('지도 전체 보기'));assert.equal(map.style.width,'100%');await reset();}
 });
 await check('mobile CSS supports safe area, 48px actions, 16px input and compact navigation',async()=>{
  const css=await readFile('src/index.css','utf8');assert.match(css,/min-height: 48px/);assert.match(css,/font-size: 16px/);assert.match(css,/max-width:380px/);assert.match(css,/prefers-reduced-motion/);const appSource=await readFile('src/App.tsx','utf8');assert.match(appSource,/safe-area-inset-bottom/);
 });
 await check('only explicit sorting sends a name; photo, rewards, sky and reconnect flows make no background fetch, XHR or WebSocket requests',async()=>{assert.ok(sortingRequests.length>=2);assert.ok(sortingRequests.every(r=>Object.keys(r).sort().join(',')==='name,previousHouse'));assert.deepEqual(networkRequests,[])});
 console.log(`ALL ${passed} EVENT DOM CHECKS PASSED (layout rendering remains unverified)`);
} finally {await act(async()=>root.unmount());await unlink(bundle);Object.assign(globalThis,originalTimers);globalThis.fetch=originalFetch;window.XMLHttpRequest=originalXHR;window.WebSocket=originalWS;dom.window.close();}
