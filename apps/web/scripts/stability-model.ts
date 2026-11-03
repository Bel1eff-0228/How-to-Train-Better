import {create_training_plan,revise_training_plan} from '../lib/agent/agent';
import {modelConfig} from '../lib/agent/model';
import {initialProfile} from '../lib/plan';
import {AgentError} from '../lib/agent/errors';
import {ZodError} from 'zod';

// Live calls only. Operator must confirm rotation before starting this bounded run.
async function main(){
 if(!process.argv.includes('--rotation-confirmed'))throw new Error('Confirm credential rotation before live testing.');
 process.env.MODEL_DIAGNOSTICS='true';process.env.MODEL_DAILY_CALL_LIMIT='16';
 const fetchOriginal=globalThis.fetch;let requests=0;
 globalThis.fetch=async(...args)=>{if(++requests>16)throw new AgentError('TEST_CALL_LIMIT','测试调用上限已到。',429);return fetchOriginal(...args);};
 let passed=0;
 for(let round=1;round<=4;round++){
  if(round%2)process.env.MODEL_THINKING='disabled';else delete process.env.MODEL_THINKING;
  const config=modelConfig();let stage='create';const start=Date.now();
  console.info(JSON.stringify({round,mode:round%2?'explicit-disabled':'code-default',...config}));
  try{
   const old=await create_training_plan({...initialProfile,equipment:'哑铃',budget:0});
   if(old.days.length!==3||old.days.some(d=>d.minutes>45))throw new AgentError('BUSINESS_CHECK','生成约束不符');
   console.info(JSON.stringify({round,stage,success:true,elapsedMs:Date.now()-start}));
   stage='revise';const before=JSON.stringify(old),reviseStart=Date.now();
   const next=await revise_training_plan(old,'这周只能练两次');
   if(next.days.length!==2||next.days.some(d=>d.minutes>45)||next.profile.equipment!=='哑铃'||next.profile.budget!==0||JSON.stringify(old)!==before)throw new AgentError('BUSINESS_CHECK','修改约束不符');
   passed++;console.info(JSON.stringify({round,stage,success:true,elapsedMs:Date.now()-reviseStart}));
  }catch(e){console.info(JSON.stringify({round,stage,success:false,elapsedMs:Date.now()-start,code:e instanceof AgentError?e.code:e instanceof ZodError?'SCHEMA_VALIDATION':'TEST_FAILED',...(e instanceof ZodError?{issues:e.issues.map(i=>({path:i.path,code:i.code}))}:{})}));}
 }
 console.info(JSON.stringify({summary:true,rounds:4,passed,requests:Math.min(requests,16),maxOutputTokensPerCall:2200}));
 if(passed<4)process.exitCode=1;
}
void main();
