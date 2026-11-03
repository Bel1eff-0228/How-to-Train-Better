import {AgentError} from './errors';
export type ModelCall=(system:string,payload:unknown)=>Promise<unknown>;
let windowStart=0,calls=0;
export function modelConfig(){
 const base=process.env.MODEL_BASE_URL??'';
 let endpoint:URL;try{endpoint=new URL(base);}catch{throw new AgentError('CONFIG_ERROR','模型服务地址无效。',503);}
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new AgentError('CONFIG_ERROR','模型服务地址必须为不含凭据或查询参数的HTTPS地址。',503);
 const raw=process.env.MODEL_THINKING?.trim();
 if(raw&&raw!=='disabled'&&raw!=='enabled')throw new AgentError('CONFIG_ERROR','MODEL_THINKING只支持enabled或disabled。',503);
 const thinking=raw||(endpoint.hostname==='api.deepseek.com'?'disabled':undefined);
 const timeoutMs=Math.min(120000,Math.max(1000,Number(process.env.MODEL_TIMEOUT_MS)||60000));
 return {thinking,timeoutMs,thinkingSource:raw?'environment':'code-default'};
}
export const callModel:ModelCall=async(system,payload)=>{
 const key=process.env.MODEL_API_KEY,base=process.env.MODEL_BASE_URL,model=process.env.MODEL_NAME;
 if(!key||!base||!model)throw new AgentError('MODEL_NOT_CONFIGURED','AI服务尚未配置，请由维护者配置服务端模型和密钥。',503);
 if(process.env.NODE_ENV==='production'&&process.env.AGENT_SINGLE_INSTANCE!=='true')throw new AgentError('DEPLOYMENT_LIMIT','公开部署需确认单实例限流模式，或接入共享限流存储。',503);
 if(!base.startsWith('https://'))throw new AgentError('CONFIG_ERROR','模型服务地址必须使用HTTPS。',503);
 const data=JSON.stringify(payload);if(data.length>50000)throw new AgentError('CONTEXT_LIMIT','请求上下文过长，请简化条件。');
 const {timeoutMs,thinking,thinkingSource}=modelConfig();
 for(let attempt=0;attempt<2;attempt++){
  if(Date.now()-windowStart>86400000){windowStart=Date.now();calls=0;}
  const cap=Math.min(1000,Math.max(1,Number(process.env.MODEL_DAILY_CALL_LIMIT)||100));
  if(calls>=cap)throw new AgentError('BUDGET_LIMIT','今日AI调用额度已用完，请稍后再试。',429);calls++;
  const started=Date.now();let httpStatus:number|null=null,headersAt:number|null=null,bodyAt:number|null=null;
  let phase='headers';
  const log=(details:Record<string,unknown>)=>{if(process.env.MODEL_DIAGNOSTICS==='true')console.info(JSON.stringify({event:'model',attempt:attempt+1,httpStatus,elapsedMs:Date.now()-started,headersMs:headersAt===null?null:headersAt-started,bodyMs:headersAt===null?null:(bodyAt??Date.now())-headersAt,thinking:thinking??'provider-default',thinkingSource,timeoutMs,...details}));};
  try{const response=await fetch(base.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,max_tokens:2200,...(thinking?{thinking:{type:thinking}}:{}),response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:data}]}),signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
   httpStatus=response.status;headersAt=Date.now();phase='body';
   log({phase:'http'});
   if(response.status>=500&&attempt===0){await response.body?.cancel();log({phase:'retry',code:'MODEL_HTTP_ERROR'});await new Promise(resolve=>setTimeout(resolve,500));continue;}
   if(!response.ok){phase='http-status';await response.body?.cancel();throw new AgentError('MODEL_HTTP_ERROR',`模型服务返回HTTP ${response.status}，本次未生成计划。`,502);}
   const rawBody=await response.text();bodyAt=Date.now();phase='envelope-json';let result;try{result=JSON.parse(rawBody);}catch(e){if(e instanceof SyntaxError)throw new AgentError('MODEL_ENVELOPE_JSON','模型服务返回的响应不是有效JSON。',502);throw e;}
   const choice=result?.choices?.[0],content=choice?.message?.content;
   log({phase:'output',finishReason:choice?.finish_reason==='stop'?'stop':choice?.finish_reason==='length'?'length':'other',contentLength:typeof content==='string'?content.length:0,reasoningLength:typeof choice?.message?.reasoning_content==='string'?choice.message.reasoning_content.length:0});
   if(choice?.finish_reason==='length')throw new AgentError('MODEL_TRUNCATED','模型输出达到长度上限，计划未完整生成。',502);
   if(typeof content!=='string'||!content.trim())throw new AgentError('MODEL_EMPTY','模型未返回有效正文，本次未生成计划。',502);
   if(content.length>20000)throw new AgentError('MODEL_OUTPUT_LIMIT','模型输出超过允许长度。',502);
   phase='content-json';try{return JSON.parse(content);}catch{throw new AgentError('MODEL_CONTENT_JSON','模型正文不是有效JSON，本次未生成计划。',502);}
  }catch(e){const error=e instanceof AgentError?e:new AgentError(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'MODEL_TIMEOUT':'MODEL_NETWORK',e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'模型请求超时或被取消，请重试。':'无法连接模型服务，请检查网络。',502);log({phase:'failure',failedPhase:phase,code:error.code});throw error;}
 }throw new AgentError('MODEL_FAILURE','模型服务失败。',502);
};
