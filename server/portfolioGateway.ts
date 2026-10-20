import {DRIVE_UPLOAD_ENDPOINT} from '../src/data/driveUploadConfig';
const MAX_PDF=4*1024*1024;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const validId=(id:unknown)=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
/** Server-side Google redirects avoid phone cookies, JSONP and browser cross-origin restrictions. */
export async function googleReceipt(requestId:string,requestFetch:typeof fetch=fetch){
 const callback='byeolbamReceipt_'+crypto.randomUUID().replace(/-/g,'');
 const url=`${DRIVE_UPLOAD_ENDPOINT}?action=status&requestId=${requestId}&callback=${callback}`;
 for(let attempt=0;attempt<2;attempt++){
  try{const r=await requestFetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});const text=await r.text();
   if(!r.ok||!text.startsWith(callback+'(')||!text.endsWith(');'))throw Error('BAD_RECEIPT');
   const value=JSON.parse(text.slice(callback.length+1,-2));
   if(value.requestId!==requestId||!['unknown','pending','saved','rejected'].includes(value.state))throw Error('BAD_RECEIPT');
   return value;
  }catch(error){if(attempt===1)throw error;}
 }
 throw Error('RECEIPT_UNAVAILABLE');
}
export async function handlePortfolio(request:Request,requestFetch:typeof fetch=fetch){
 if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'ORIGIN_DENIED'},403);
 if(Number(request.headers.get('Content-Length')||0)>Math.ceil(MAX_PDF*4/3)+5000)return json({error:'PDF_TOO_LARGE'},413);
 let body:any;try{const text=await request.text();if(text.length>Math.ceil(MAX_PDF*4/3)+5000)return json({error:'PDF_TOO_LARGE'},413);body=JSON.parse(text)}catch{return json({error:'INVALID_BODY'},400)}
 if(!validId(body?.requestId))return json({error:'INVALID_REQUEST'},400);
 try{
  if(body.action==='status')return json(await googleReceipt(body.requestId,requestFetch));
  if(body.v!==1||body.mimeType!=='application/pdf'||typeof body.base64!=='string'||!body.base64.startsWith('JVBERi0')||body.base64.length>Math.ceil(MAX_PDF*4/3)||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64)||typeof body.fileName!=='string'||body.fileName.length>300)return json({error:'INVALID_PDF'},400);
  // A POST transport result is never a saved acknowledgement. The client reads the receipt next.
  try{await requestFetch(DRIVE_UPLOAD_ENDPOINT,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(35000),headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({v:1,requestId:body.requestId,fileName:body.fileName,mimeType:body.mimeType,base64:body.base64})})}catch{/* Google may have saved the PDF before its response was lost. */}
  return json({requestId:body.requestId,state:'pending',version:3});
 }catch{return json({error:'RECEIPT_UNAVAILABLE'},502)}
}
