import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOrigin} from '../lib/agent/origin';
import {handle} from '../lib/agent/http';
const site='https://trainbetter-ai-test.onrender.com';
test('Render代理：只信服务端APP_ORIGIN，生成和修改路由均保留来源检查',async()=>{
 const env=process.env as Record<string,string|undefined>,old=env.APP_ORIGIN,node=env.NODE_ENV,secret=env.PLAN_SIGNING_SECRET;
 try{env.NODE_ENV='production';env.APP_ORIGIN=site;env.PLAN_SIGNING_SECRET='fixture-only-signing-secret-32-characters';
 const request=(origin:string|null,revise=false)=>new Request('http://localhost:10000/api/plan/'+(revise?'revise':'create'),{method:'POST',headers:{...(origin===null?{}:{Origin:origin}),Host:'localhost:10000','X-Forwarded-Host':'trainbetter-ai-test.onrender.com','X-Forwarded-Proto':'https','Content-Type':'application/json'},body:'{}'});
 assert.doesNotThrow(()=>validateOrigin(request(site)));
 for(const revise of [false,true]){
  const good=await handle(request(site,revise),revise);assert.equal(good.status,422);assert.equal((await good.json()).code,'SCHEMA_ERROR'); // Reached input validation, no model call.
  for(const origin of [null,'null','https://evil.example',site+'.evil.example','http://trainbetter-ai-test.onrender.com',site+'/']){
   const bad=await handle(request(origin,revise),revise);assert.equal(bad.status,403);assert.equal((await bad.json()).code,'ORIGIN');
  }
 }
 const spoof=request('https://evil.example');spoof.headers.set('host','evil.example');spoof.headers.set('x-forwarded-host','evil.example');assert.throws(()=>validateOrigin(spoof),/请求来源/);
 const forged=request(site);forged.headers.set('x-forwarded-host','evil.example');assert.doesNotThrow(()=>validateOrigin(forged)); // Forwarded headers never grant trust.
 delete env.APP_ORIGIN;assert.equal((await handle(request(site))).status,503);
 env.APP_ORIGIN=site+'/path';assert.equal((await handle(request(site))).status,503);
 }finally{for(const [k,v] of Object.entries({APP_ORIGIN:old,NODE_ENV:node,PLAN_SIGNING_SECRET:secret})){if(v===undefined)delete env[k];else env[k]=v;}}
});
