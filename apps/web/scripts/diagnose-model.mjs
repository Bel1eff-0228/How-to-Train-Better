const base=process.env.MODEL_BASE_URL,model=process.env.MODEL_NAME,key=process.env.MODEL_API_KEY;
if(!base||!model||!key)throw new Error('Missing model configuration');
for(const mode of ['default','disabled']){
 const started=Date.now();let status=null;
 try{const r=await fetch(base.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,max_tokens:2200,response_format:{type:'json_object'},...(mode==='disabled'?{thinking:{type:'disabled'}}:{}),messages:[{role:'user',content:'Return JSON only: {"ok":true}'}]}),signal:AbortSignal.timeout(60000)});status=r.status;const data=await r.json();const c=data.choices?.[0];let jsonParsed=false,expectedValue=false;try{const parsed=JSON.parse(c?.message?.content);jsonParsed=true;expectedValue=parsed?.ok===true;}catch{}
 console.log(JSON.stringify({mode,status,elapsedMs:Date.now()-started,errorCode:typeof data.error?.code==='string'?data.error.code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60):null,finishReason:c?.finish_reason,contentLength:c?.message?.content?.length??0,reasoningLength:c?.message?.reasoning_content?.length??0,jsonParsed,expectedValue}));
 }catch(e){console.log(JSON.stringify({mode,status,elapsedMs:Date.now()-started,errorType:e.name,causeCode:e.cause?.code??null}));}
}
