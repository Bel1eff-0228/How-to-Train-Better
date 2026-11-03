import {callModel} from '../lib/agent/model';
import {create_training_plan,revise_training_plan} from '../lib/agent/agent';
import {initialProfile} from '../lib/plan';
import {AgentError} from '../lib/agent/errors';
import {ZodError} from 'zod';
async function main(){let stage='connection';try{
 const result=await callModel('Only return JSON: {"ok":true}',{task:'connection check'});
 if(!(result as {ok?:boolean})?.ok)throw new Error('Connection response schema mismatch');
 console.log('真实供应商连接：通过');
 stage='create';
 const a=await create_training_plan({...initialProfile,equipment:'哑铃',budget:0});
 if(a.days.length!==3||a.days.some(d=>d.minutes>45))throw new Error('A constraints failed');
 console.log('真实模型 A：3天/45分钟/哑铃通过结构及约束校验，内容仍需人工复核');
 stage='revise';
 const b=await revise_training_plan(a,'这周只能练两次');
 if(b.days.length!==2||b.profile.equipment!=='哑铃'||b.profile.budget!==0)throw new Error('B constraints failed');
 console.log('真实模型 B：改为2天且保留器械预算通过');
}catch(e){console.error(JSON.stringify({stage,code:e instanceof AgentError?e.code:e instanceof ZodError?'SCHEMA_VALIDATION':'CHECK_FAILED',...(e instanceof ZodError?{issues:e.issues.map(i=>({path:i.path,code:i.code}))}:{} )}));process.exitCode=1;}

}
void main();
