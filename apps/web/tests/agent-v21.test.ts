import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {create_training_plan,revise_training_plan,knowledgeFor} from '../lib/agent/agent';
import {buildPlan,validatePlan} from '../lib/training/engine';
import {profileSchema,type Plan} from '../lib/training/schema';
import {gymEquipment,exerciseById} from '../lib/training/exercises';
import {handle,MAX_REQUEST_BYTES,MAX_TOKEN_CHARS} from '../lib/agent/http';
import {checkedPatch} from '../lib/agent/intent';
import {initialProfile,makePlan} from '../lib/plan';
import {type ModelCall} from '../lib/agent/model';
import {AgentError} from '../lib/agent/errors';
const a=profileSchema.parse({goal:'hypertrophy',experience:'advanced',days:4,minutes:60,environment:'gym',availableEquipment:gymEquipment,priorityMuscles:['chest'],budget:150});
const contextSizes:number[]=[];
const model:ModelCall=async(_s,payload)=>{
 contextSizes.push(JSON.stringify(payload).length);
 const p=payload as {task:string;request:string;knowledge:{id:string}[]};
 if(p.task==='revise-intent'){
  const patch=p.request==='只有哑铃'?{environment:'dumbbells',availableEquipment:['dumbbells']}:p.request==='重点改为背部'?{priorityMuscles:['back']}:{days:2};
  return {safe:true,patch,evidence:Object.fromEntries(Object.keys(patch).map(k=>[k,p.request]))};
 }
 return {safe:true,explanations:[{decisionId:'split',sourceIds:[p.knowledge[0].id]}]};
};
test('v2.1 A/B/C：所有新计划由50动作规则产生，模型不能改处方',async()=>{
 const generated=await create_training_plan(a,model),expected=buildPlan(a);
 assert.deepEqual(generated.trainingPlan.days,expected.days);
 const cutting=await create_training_plan({...a,goal:'fat-loss'},model);assert.notDeepEqual(cutting.trainingPlan.recoveryGuidance,generated.trainingPlan.recoveryGuidance);
 const beginner=await create_training_plan({...a,days:3,minutes:45,experience:'beginner',environment:'dumbbells',availableEquipment:['dumbbells']},model);
 assert.ok(beginner.trainingPlan.days.flatMap(d=>d.exercises).every(e=>exerciseById.get(e.exerciseId)!.equipment.every(x=>x==='dumbbells')));
 await assert.rejects(()=>create_training_plan(a,async()=>({safe:true,explanations:[],days:[]})));
});
test('v2.1 D：改频率/器械/重点，未指定字段保留，无副作用',async()=>{
 const old=await create_training_plan(a,model),copy=structuredClone(old);
 const two=await revise_training_plan(old,'这周只能练两次',model);
 assert.equal(two.trainingPlan.split,'full-body');assert.equal(two.profile.days,2);assert.equal(two.profile.budget,150);assert.deepEqual(two.trainingPlan.profile.priorityMuscles,['chest']);assert.deepEqual(old,copy);
 const dumbbells=await revise_training_plan(old,'只有哑铃',model);assert.deepEqual(dumbbells.trainingPlan.profile.availableEquipment,['dumbbells']);assert.equal(dumbbells.profile.days,4);
 const back=await revise_training_plan(old,'重点改为背部',model);assert.deepEqual(back.trainingPlan.profile.priorityMuscles,['back']);assert.notDeepEqual(back.trainingPlan.days,old.trainingPlan.days);
 assert.deepEqual(checkedPatch({safe:true,patch:{days:2},evidence:{days:'每周2天'}},'每周2天',a),{days:2});
 assert.throws(()=>checkedPatch({safe:true,patch:{days:2,budget:0},evidence:{days:'每周2天',budget:'每周2天'}},'每周2天',a),/budget/);
});
test('30分钟冲突复核：16个原失败条件现在全部安全容纳；不可能的限制仍冲突',()=>{
 for(const experience of ['beginner','novice','intermediate','advanced'] as const)for(const days of [2,3])for(const availableEquipment of [gymEquipment,['dumbbells'] as typeof gymEquipment]){
  const p=buildPlan({...a,goal:'strength',experience,days,minutes:30,availableEquipment});assert.ok(p.days.every(d=>d.estimatedSeconds<=1800));assert.ok(p.warnings.some(w=>w.includes('时间有限')||w.includes('省时')));
 }
 assert.throws(()=>buildPlan({...a,availableEquipment:[],days:2,minutes:30}),/缺少/);
 assert.throws(()=>buildPlan({...a,days:2,split:'four-day'}),/需要/);
});
test('检索依据实际目标/分化变化，保留原路径、完整条目与证据标记',()=>{
 const muscle=knowledgeFor(buildPlan(a)),cutting=knowledgeFor(buildPlan({...a,goal:'fat-loss'}));
 assert.notDeepEqual(muscle.map(x=>x.id),cutting.map(x=>x.id));assert.ok(muscle.every(x=>x.file.startsWith('book/')&&x.src));
});
test('v2.1 E + 旧API：签名6天大计划可修改；过期/追加签名/篡改失败',async()=>{
 const saved=process.env.PLAN_SIGNING_SECRET;const key='fixture-v21-signing-secret-only-32-characters';process.env.PLAN_SIGNING_SECRET=key;
 const req=(body:unknown,revise=false)=>new Request('http://localhost/api/plan/'+(revise?'revise':'create'),{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body)});
 const largeModel:ModelCall=async(s,payload)=>{const p=payload as {task:string;decisions:{id:string}[];knowledge:{id:string}[]};if(p.task!=='explain')return model(s,payload);contextSizes.push(JSON.stringify(payload).length);return {safe:true,explanations:p.decisions.map((d,i)=>({decisionId:d.id,sourceIds:p.knowledge.slice(i%3,i%3+3).map(k=>k.id)}))};};
 try{
  let r=await handle(req({apiVersion:'2.1',profile:{...a,days:6,minutes:90},adultConfirmed:true}),false,largeModel);assert.equal(r.status,200);
  const six=await r.json();assert.equal(six.days.length,6);assert.equal(six.schemaVersion,'2.1');assert.ok(six.token.length<MAX_TOKEN_CHARS);
  const body={token:six.token,message:'这周只能练两次'};assert.ok(Buffer.byteLength(JSON.stringify(body))<MAX_REQUEST_BYTES);
  r=await handle(req(body,true),true,model);assert.equal(r.status,200);const two=await r.json();assert.equal(two.days.length,2);assert.equal(two.profile.budget,150);
  assert.ok(contextSizes.every(n=>n<50000));
  for(const token of [six.token+'.extra',six.token.slice(0,-1)+'z'])assert.equal((await handle(req({token,message:'每周2天'},true),true,model)).status,400);
  const old=makePlan({...initialProfile,equipment:'哑铃'});
  const token=(expires:number)=>{const encoded=Buffer.from(JSON.stringify({plan:old,expires})).toString('base64url');return encoded+'.'+createHmac('sha256',key).update(encoded).digest('hex');};
  assert.equal((await handle(req({token:token(Date.now()-1),message:'每周2天'},true),true,model)).status,400);
  r=await handle(req({token:token(Date.now()+60000),message:'每周2天'},true),true,model);assert.equal(r.status,200);const migrated=await r.json();assert.equal(migrated.trainingPlan.schemaVersion,'2.1');assert.equal(migrated.profile.equipment,'哑铃');
  r=await handle(req({profile:initialProfile,adultConfirmed:true}),false,model);assert.equal(r.status,200);const legacy=await r.json();assert.equal(legacy.mode,'ai');assert.equal(legacy.trainingPlan.schemaVersion,'2.1');
 }finally{if(saved===undefined)delete process.env.PLAN_SIGNING_SECRET;else process.env.PLAN_SIGNING_SECRET=saved;}
});
test('v2.1 F：503/超时/结构错误/伪造来源不返回计划',async()=>{
 const saved=process.env.PLAN_SIGNING_SECRET;process.env.PLAN_SIGNING_SECRET='fixture-v21-error-signing-secret-32';
 try{for(const provider of [async()=>{throw new AgentError('MODEL_HTTP','供应商503',502);},async()=>{throw new AgentError('MODEL_TIMEOUT','超时',502);},async()=>({safe:true,days:[]}),async()=>({safe:true,explanations:[{decisionId:'split',sourceIds:['FAKE']}]})] as ModelCall[]){
  const request=new Request('http://localhost/api/plan/create',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({apiVersion:'2.1',profile:a,adultConfirmed:true})});
  const response=await handle(request,false,provider);assert.ok([422,502].includes(response.status));const body=await response.json();assert.ok(!('days' in body)&&!('token' in body));
 }}finally{if(saved===undefined)delete process.env.PLAN_SIGNING_SECRET;else process.env.PLAN_SIGNING_SECRET=saved;}
});
test('v2.1 风险或未评估备注不丢弃，不调用模型伪装成功',async()=>{
 let calls=0;const never:ModelCall=async()=>{calls++;throw new Error('must not call');};
 for(const notes of ['肩痛','PAIN','有其他特殊限制'])await assert.rejects(()=>create_training_plan({...a,notes},never));
 assert.equal(calls,0);
});
