import {create_training_plan,revise_training_plan} from '../lib/agent/agent';
import {modelConfig} from '../lib/agent/model';
import {gymEquipment} from '../lib/training/exercises';
import {AgentError} from '../lib/agent/errors';
import {ZodError} from 'zod';

// Synthetic profiles only. Hard ceiling includes provider retries; no response/request bodies logged.
async function main(){
 if(!process.argv.includes('--live'))throw new Error('Explicit --live required.');
 if(!process.env.MODEL_API_KEY||!process.env.MODEL_NAME||!process.env.MODEL_BASE_URL){console.log(JSON.stringify({configured:false}));process.exitCode=1;return;}
 const original=globalThis.fetch;let requests=0;const maxRequests=7;
 globalThis.fetch=async(...args)=>{if(requests>=maxRequests)throw new AgentError('TEST_LIMIT','真实测试调用上限已达到',429);const number=++requests,start=Date.now();try{const result=await original(...args);console.log(JSON.stringify({httpRequest:number,status:result.status,headersMs:Date.now()-start}));return result;}catch{console.log(JSON.stringify({httpRequest:number,status:null,headersMs:Date.now()-start}));throw new AgentError('MODEL_NETWORK','真实测试网络失败',502);}};
 process.env.MODEL_DIAGNOSTICS='true';
 console.log(JSON.stringify({live:true,maxRequests,...modelConfig()}));
 const p={goal:'hypertrophy',experience:'advanced',days:4,minutes:60,environment:'gym',availableEquipment:gymEquipment,priorityMuscles:['chest'],budget:0};
 let stage='A-create',started=Date.now();
 try{
  const a=await create_training_plan(p);console.log(JSON.stringify({stage,ok:true,elapsedMs:Date.now()-started,days:a.days.length,split:a.trainingPlan.split}));
  stage='D-revise';started=Date.now();const two=await revise_training_plan(a,'这周只能练两次');
  if(two.days.length!==2||two.trainingPlan.split!=='full-body'||two.profile.budget!==0)throw new AgentError('BUSINESS_CHECK','修改约束不符');
  console.log(JSON.stringify({stage,ok:true,elapsedMs:Date.now()-started,days:two.days.length}));
  stage='E-create';started=Date.now();const six=await create_training_plan({...p,days:6,minutes:90});
  console.log(JSON.stringify({stage,ok:true,elapsedMs:Date.now()-started,days:six.days.length}));
  stage='E-revise';started=Date.now();const changed=await revise_training_plan(six,'重点改为背部');
  if(changed.trainingPlan.profile.priorityMuscles.join()!=='back'||changed.days.length!==6)throw new AgentError('BUSINESS_CHECK','修改约束不符');
  console.log(JSON.stringify({stage,ok:true,elapsedMs:Date.now()-started,days:changed.days.length}));
 }catch(e){console.log(JSON.stringify({stage,ok:false,elapsedMs:Date.now()-started,code:e instanceof AgentError?e.code:e instanceof ZodError?'SCHEMA_ERROR':'CHECK_FAILED',...(e instanceof ZodError?{issues:e.issues.map(i=>({path:i.path,code:i.code}))}:{})}));process.exitCode=1;}
 finally{globalThis.fetch=original;console.log(JSON.stringify({requests,maxRequests}));}
}
void main();
