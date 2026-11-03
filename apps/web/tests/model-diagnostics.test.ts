import {test} from 'node:test';
import assert from 'node:assert/strict';
import {callModel,modelConfig} from '../lib/agent/model';
import {AgentError} from '../lib/agent/errors';
test('供应商故障分类：HTTP、响应JSON、正文JSON、空正文、截断、超时、网络',async()=>{
 const original=globalThis.fetch;
 const names=['MODEL_API_KEY','MODEL_BASE_URL','MODEL_NAME','MODEL_DIAGNOSTICS','MODEL_THINKING','MODEL_TIMEOUT_MS'];
 const saved=names.map(n=>process.env[n]);
 Object.assign(process.env,{MODEL_API_KEY:'test-only',MODEL_BASE_URL:'https://api.deepseek.com',MODEL_NAME:'deepseek-flash',MODEL_DIAGNOSTICS:'false'});
 delete process.env.MODEL_THINKING;
 const envelope=(content:string,finish_reason='stop')=>Response.json({choices:[{finish_reason,message:{content}}]});
 const cases:[string,()=>Promise<Response>][]=[
  ['MODEL_HTTP_ERROR',async()=>new Response('',{status:401})],
  ['MODEL_ENVELOPE_JSON',async()=>new Response('not-json')],
  ['MODEL_CONTENT_JSON',async()=>envelope('{')],
  ['MODEL_EMPTY',async()=>envelope('')],
  ['MODEL_TRUNCATED',async()=>envelope('{','length')],
  ['MODEL_TIMEOUT',async()=>{throw new DOMException('test','TimeoutError');}],
  ['MODEL_NETWORK',async()=>{throw new TypeError('test');}],
 ];
 try{for(const [code,fetcher] of cases){globalThis.fetch=fetcher;await assert.rejects(()=>callModel('JSON',{}),(e:unknown)=>e instanceof AgentError&&e.code===code);}
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.equal(body.thinking.type,'disabled');return envelope('{"ok":true}');};
 assert.deepEqual(await callModel('JSON',{}),{ok:true});
 }finally{globalThis.fetch=original;names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});}
});
test('配置覆盖、空值和实际发送的thinking一致，503重试取消正文',async()=>{
 const original=globalThis.fetch,env={...process.env};
 try{
 Object.assign(process.env,{MODEL_API_KEY:'test-only',MODEL_BASE_URL:'https://api.deepseek.com',MODEL_NAME:'deepseek-flash',MODEL_DIAGNOSTICS:'false'});
 for(const value of [undefined,'','disabled','enabled']){
  if(value===undefined)delete process.env.MODEL_THINKING;else process.env.MODEL_THINKING=value;
  const expected=value||'disabled';assert.equal(modelConfig().thinking,expected);
  globalThis.fetch=async(_url,init)=>{assert.equal(JSON.parse(String(init?.body)).thinking.type,expected);return Response.json({choices:[{message:{content:'{}'}}]});};
  await callModel('JSON',{});
 }
 process.env.MODEL_THINKING='typo';assert.throws(()=>modelConfig(),/MODEL_THINKING/);
 delete process.env.MODEL_THINKING;
 let cancelled=false,count=0;
 globalThis.fetch=async()=>{count++;return count===1?new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:503}):Response.json({choices:[{message:{content:'{}'}}]});};
 await callModel('JSON',{});assert.equal(count,2);assert.equal(cancelled,true);
 globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.error(new DOMException('test','TimeoutError'));}}));
 await assert.rejects(()=>callModel('JSON',{}),(e:unknown)=>e instanceof AgentError&&e.code==='MODEL_TIMEOUT');
 }finally{globalThis.fetch=original;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
});
