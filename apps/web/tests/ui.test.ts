import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan} from '../lib/training/engine';
import {gymEquipment} from '../lib/training/exercises';
import {initialProfile,makePlan} from '../lib/plan';
import {decodePlan,planDifferences} from '../lib/ui/plan-data';
const profile={goal:'hypertrophy',experience:'advanced',days:4,minutes:60,environment:'gym',availableEquipment:gymEquipment,priorityMuscles:['chest']};
test('UI canonical and compatible responses preserve all v2.1 data and token',()=>{
 const plan=buildPlan(profile);const canonical=decodePlan({...plan,token:'fixture',sources:[],explanations:['fixture']});
 const compat=decodePlan({trainingPlan:{...plan,explanations:['fixture']},token:'fixture'});
 assert.deepEqual(canonical,compat);assert.equal(canonical.kind,'modern');assert.deepEqual(canonical.plan.days,plan.days);
});
test('UI legacy fallback never invents RIR, warmup or volume; invalid modern cannot fall back',()=>{
 const p=makePlan({...initialProfile,equipment:'哑铃'}),read=decodePlan(p);assert.equal(read.kind,'legacy');assert.deepEqual(read.plan,p);
 assert.throws(()=>decodePlan({...p,trainingPlan:{schemaVersion:'2.1'}}));
 assert.throws(()=>decodePlan({...buildPlan(profile),days:[]}));
});
test('UI comparison derives actual split/frequency/priority/volume/time changes',()=>{
 const a=decodePlan(buildPlan(profile)),b=decodePlan(buildPlan({...profile,days:2,priorityMuscles:['back']}));
 const lines=planDifferences(a,b).join('\n');
 for(const word of ['分化','每周训练','重点肌群','每天预计耗时','直接组'])assert.ok(lines.includes(word));
 assert.equal(a.plan.days.length,4);assert.equal(b.plan.days.length,2);
});

test('UI revision errors never mislabel a model failure as initial generation',async()=>{
 const {operationMessage,errorHelp}=await import('../lib/ui/plan-data');
 assert.equal(operationMessage('模型服务返回HTTP 503，本次未生成计划。','revise'),'模型服务返回HTTP 503，本次未完成调整。');
 assert.ok(errorHelp('MODEL_HTTP_ERROR').includes('暂时不可用'));
});
test('UI localizes engine terms without mutating the canonical plan',async()=>{
 const {readableText}=await import('../lib/ui/plan-data');
 assert.equal(readableText('advanced与分化偏好选择upper-lower；重点chest'),'进阶与分化偏好选择上下肢分化；重点胸部');
 const p=buildPlan(profile),copy=structuredClone(p);p.reasons.forEach(readableText);assert.deepEqual(p,copy);
});
