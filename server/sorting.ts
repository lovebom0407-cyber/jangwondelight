import {ROSTER_ASSIGNMENTS,ROSTER_NAMESPACE} from './rosterSnapshot';
import {SORTING_POLICY_REVISION,UNLISTED_HOUSES} from '../src/data/sortingPolicy';
export function rosterName(value:unknown){return String(value??'').normalize('NFKC').trim().replace(/\([^)]*\)\s*$/,'').replace(/\s+/g,'').slice(0,80)}
export async function rosterKey(name:string,namespace=ROSTER_NAMESPACE){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(namespace+'|'+rosterName(name)))),v=>v.toString(16).padStart(2,'0')).join('')}
export async function resolveHouse(name:string,fallback:unknown,assignments=ROSTER_ASSIGNMENTS,namespace=ROSTER_NAMESPACE){
 const known=assignments[await rosterKey(name,namespace)];
 if(Number.isInteger(known))return known;
 if(UNLISTED_HOUSES.includes(fallback as 1|2|3))return Number(fallback);
 // Rejection sampling keeps each of the three permitted houses equally likely.
 const values=new Uint32Array(1);let value:number;
 do{crypto.getRandomValues(values);value=values[0]}while(value>=4294967295);
 return UNLISTED_HOUSES[value%UNLISTED_HOUSES.length];
}
export async function handleSorting(request:Request){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(request.method!=='POST')return new Response('{}',{status:405,headers});
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return new Response('{}',{status:403,headers});
 try{const text=await request.text();if(text.length>1500)return new Response('{}',{status:413,headers});const data=JSON.parse(text);const name=rosterName(data.name);if(!name)return new Response('{}',{status:400,headers});const house=await resolveHouse(name,data.previousHouse);return new Response(JSON.stringify({house,revision:SORTING_POLICY_REVISION}),{headers})}catch{return new Response('{}',{status:400,headers})}
}
