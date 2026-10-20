import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { createBlankState, saveParticipant, loadParticipant, clearLegacyCloudCredentials } from '../src/services/storage';
const memory=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k),key:(i:number)=>[...memory.keys()][i]||null,get length(){return memory.size}},configurable:true});
const old={...createBlankState(),name:'기존기록 유지',house:0,completed:[0,2],records:{0:{evidenceId:'keep-photo'}},cloudPhotoConsent:true};
saveParticipant(old);localStorage.setItem('jangwon-cloud-login-v1:old','secret');localStorage.setItem('jangwon-cloud-dirty-v1:old','pending');localStorage.setItem('unrelated-setting','keep');
clearLegacyCloudCredentials();assert.equal(localStorage.getItem('jangwon-cloud-login-v1:old'),null);assert.equal(localStorage.getItem('jangwon-cloud-dirty-v1:old'),null);assert.equal(localStorage.getItem('unrelated-setting'),'keep');
const restored=loadParticipant(old.name)!;assert.equal(restored.participantId,old.participantId);assert.equal(restored.records[0].evidenceId,'keep-photo');assert.deepEqual(restored.completed,[0,2]);assert.equal(restored.cloudPhotoConsent,false);
console.log('PASS: local name recovery preserves identity, photos and progress while disabling old cloud consent and credentials');
const manifest=JSON.parse(await readFile('package.json','utf8'));
assert.ok(!manifest.dependencies?.firebase);assert.ok(!manifest.devDependencies?.['firebase-admin']);
const graph=await build({entryPoints:['src/main.tsx'],bundle:true,platform:'browser',format:'esm',packages:'external',loader:{'.css':'empty'},write:false,metafile:true,logLevel:'silent'});
for(const file of Object.keys(graph.metafile!.inputs))assert.ok(!/firebase|participantCloud|cloudPayload|cloudConfig|CloudBackup/.test(file),file);
for(const output of Object.values(graph.metafile!.outputs))for(const dependency of output.imports)assert.ok(!/firebase|@firebase/.test(dependency.path),dependency.path);
const forbidden=/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebasestorage\.app|firebaseapp\.com|dotted-chiller-q0w9t|ai-studio-2026-967a9e73/;
assert.ok(!forbidden.test(graph.outputFiles[0].text));
console.log('PASS: full app import graph and dependency manifest contain no Firebase client, authentication or cloud backup modules');
if(process.argv.includes('--built')){
  async function chunks(dir:string):Promise<string[]>{const files:string[]=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())files.push(...await chunks(file));else if(entry.name.endsWith('.js'))files.push(file)}return files}
  const files=await chunks('dist');assert.ok(files.length>0,'Built JavaScript chunks must exist');
  for(const file of files){const source=await readFile(file,'utf8');assert.ok(!forbidden.test(source),file);assert.ok(!/ROSTER_ASSIGNMENTS|ROSTER_NAMESPACE|2026 장원 별밤학교 참가 인원/.test(source),file);}
  console.log(`PASS: all ${files.length} published JavaScript chunks contain no Firebase service endpoints or private roster identifiers`);
}
