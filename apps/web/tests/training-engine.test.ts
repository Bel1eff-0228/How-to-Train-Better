import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,revisePlan,validatePlan} from '../lib/training/engine';
import {auditCatalog,availableExercises,exerciseById,gymEquipment,exercises} from '../lib/training/exercises';
import {daySeconds,exerciseSeconds,weeklyVolume} from '../lib/training/metrics';
import {profileSchema,type Profile,TrainingConflict} from '../lib/training/schema';
import {upgradeProfile,importLegacyPlan,readPlan} from '../lib/training/compatibility';
import {initialProfile,makePlan} from '../lib/plan';
const advanced:Profile=profileSchema.parse({goal:'hypertrophy',experience:'advanced',days:4,minutes:60,environment:'gym',availableEquipment:gymEquipment,priorityMuscles:['chest']});
const beginner:Profile={...advanced,experience:'beginner',days:3,minutes:45,environment:'dumbbells',availableEquipment:['dumbbells'],priorityMuscles:[]};
test('动作库：50项、完整肌群/模式与替代引用，健身房允许已确认哑铃',()=>{
 assert.equal(auditCatalog().count,50);assert.ok(Object.values(auditCatalog().muscles).every(n=>n>0));
 assert.ok(availableExercises(advanced).some(e=>e.id==='db-press'));
 assert.ok(!availableExercises({...advanced,availableEquipment:['dumbbells']}).some(e=>e.equipment.includes('bench')));
 assert.equal(new Set(exercises.map(e=>e.pattern)).size,9);
});
test('A：进阶4天胸优先上下肢完整结构，周量和RIR可追溯',()=>{
 const p=buildPlan(advanced);assert.equal(p.split,'upper-lower');assert.equal(p.days.length,4);
 assert.ok(p.weeklyVolume.every(v=>v.exposureFrequency>0));
 const neutral=buildPlan({...advanced,priorityMuscles:[]});
 assert.ok(p.weeklyVolume.find(v=>v.muscle==='chest')!.directSets>neutral.weeklyVolume.find(v=>v.muscle==='chest')!.directSets);
 assert.ok(p.days[0].exercises.some(e=>e.warmupSets>0));assert.ok(p.days.every(d=>d.estimatedSeconds<=3600));
 assert.ok(p.days.every(d=>d.exercises.filter(e=>['db-rdl','barbell-rdl'].includes(e.exerciseId)).length<=1));
 assert.ok(p.days[2].exercises.some(e=>e.exerciseId==='lat-pulldown'));
 assert.deepEqual(p,buildPlan(advanced));
});
test('B：新手哑铃3天不暗含训练凳/拉力器；A/B稳定',()=>{
 const p=buildPlan(beginner);assert.equal(p.split,'full-body');
 for(const d of p.days)for(const e of d.exercises){assert.ok(exerciseById.get(e.exerciseId)!.equipment.every(r=>r==='dumbbells'));assert.equal(exerciseById.get(e.exerciseId)!.difficulty,'beginner');}
 assert.deepEqual(p.days[0].exercises,p.days[2].exercises);
});
test('C：增肌/减脂保留动作基础，余力、恢复、活动及饮食策略有差异',()=>{
 const a=buildPlan(advanced),b=buildPlan({...advanced,goal:'fat-loss'});
 assert.deepEqual(a.days.map(d=>d.exercises.map(e=>e.exerciseId)),b.days.map(d=>d.exercises.map(e=>e.exerciseId)));
 assert.notDeepEqual(a.days[0].exercises.map(e=>e.rir),b.days[0].exercises.map(e=>e.rir));
 for(const key of ['recoveryGuidance','activityGuidance','nutritionGuidance'] as const)assert.notDeepEqual(a[key],b[key]);
 assert.equal(b.profile.budget,0);
});
test('D：4→2重新编排，条件与旧计划保留，明确分化冲突不静默降级',()=>{
 const old=buildPlan(advanced),snapshot=structuredClone(old),next=revisePlan(old,{days:2});
 assert.equal(next.split,'full-body');assert.equal(next.version,2);assert.deepEqual(old,snapshot);
 assert.notDeepEqual(next.days,old.days.slice(0,2));assert.ok(next.weeklyVolume.every(v=>v.exposureFrequency>0));
 assert.deepEqual(next.profile.priorityMuscles,old.profile.priorityMuscles);
 assert.throws(()=>revisePlan(buildPlan({...advanced,split:'four-day'}),{days:2}),/需要/);
});
test('E：30分钟计入热身、组休、转换与单侧，所有目标/经验/频率可行或明确冲突',()=>{
 let succeeded=0;
 for(const goal of ['hypertrophy','fat-loss','strength','fitness'] as const)for(const experience of ['beginner','novice','intermediate','advanced'] as const)for(const days of [2,3,4,5,6]){
  try{const p=buildPlan({...beginner,goal,experience,days,minutes:30});succeeded++;for(const d of p.days){assert.equal(d.estimatedSeconds,daySeconds(d));assert.ok(d.estimatedSeconds<=1800);assert.equal(d.generalWarmupSeconds,300);}}
  catch(e){assert.ok(e instanceof TrainingConflict);assert.equal(e.code,'TIME_CONFLICT');}
 }
 assert.ok(succeeded>=70);
 const p=buildPlan(beginner).days[0].exercises.find(e=>e.exerciseId==='db-row')!;
 const e=exerciseById.get(p.exerciseId)!;
 const expected=60+p.warmupSets*(8*4*2+45)+p.workSets*p.reps.max*4*2+(p.workSets-1)*p.restSeconds;
 assert.equal(e.laterality,'unilateral');assert.equal(exerciseSeconds(p),expected);
});
test('六种结构、PPL拉日无推举，主肌群不缺失',()=>{
 for(const [split,days] of [['full-body',3],['upper-lower',4],['ppl',3],['four-day',4],['five-day',5],['ppl-ab',6]] as const){
  const p=buildPlan({...advanced,split,days,minutes:90});assert.equal(p.split,split);assert.ok(p.weeklyVolume.every(v=>v.exposureFrequency>0));
  if(split.startsWith('ppl'))assert.ok(p.days[1].exercises.every(e=>!exerciseById.get(e.exerciseId)!.pattern.includes('push')));
 }
});
test('周量：热身排除、主次肌群分列、全周总组不重复，篡改结果被拒绝',()=>{
 const p=buildPlan(beginner);assert.deepEqual(p.weeklyVolume,weeklyVolume(p.days));
 const presses=p.days.flatMap(d=>d.exercises).filter(e=>exerciseById.get(e.exerciseId)!.primary.includes('chest')).reduce((n,e)=>n+e.workSets,0);
 assert.equal(p.weeklyVolume.find(v=>v.muscle==='chest')!.directSets,presses);
 assert.ok(p.weeklyVolume.find(v=>v.muscle==='triceps')!.indirectSets>0);
 for(const tamper of [(q:typeof p)=>q.days[0].estimatedSeconds++,(q:typeof p)=>q.weeklyVolume[0].directSets++,(q:typeof p)=>q.days[0].exercises[0].exerciseId='bogus',(q:typeof p)=>q.totalWorkSets++]){const q=structuredClone(p);tamper(q);assert.throws(()=>validatePlan(q));}
});
test('无可用拉类器械、排除全部背动作、未评估限制和非法输入明确失败',()=>{
 assert.throws(()=>buildPlan({...beginner,availableEquipment:[]}),/缺少/);
 assert.throws(()=>buildPlan({...advanced,excludedExerciseIds:exercises.filter(e=>e.primary.includes('back')).map(e=>e.id)}),/缺少/);
 assert.throws(()=>buildPlan({...beginner,notes:'肩痛'}),/评估/);
 assert.throws(()=>buildPlan({...beginner,days:7}));
 assert.throws(()=>buildPlan({...beginner,excludedExerciseIds:['fake']}));
});
test('旧版Profile/Plan兼容：保留原值，不伪造未知数据，不改旧API',()=>{
 assert.throws(()=>upgradeProfile(initialProfile),/确认/);
 const modern=upgradeProfile({...initialProfile,equipment:'哑铃'});assert.deepEqual(modern.availableEquipment,['dumbbells']);
 const old=makePlan(initialProfile);assert.deepEqual(importLegacyPlan(old).plan,old);assert.equal(readPlan(old).kind,'legacy-v2.0');
 assert.equal(readPlan(buildPlan(beginner)).kind,'v2.1');assert.equal('weeklyVolume' in importLegacyPlan(old).plan,false);
});
test('时间及结构防篡改：减少热身、把拉日换推举不能通过验证',()=>{
 const a=buildPlan(beginner);a.days[0].exercises[0].warmupSets=0;
 a.days[0].estimatedSeconds=daySeconds(a.days[0]);a.days[0].estimatedMinutes=Math.ceil(a.days[0].estimatedSeconds/60);
 assert.throws(()=>validatePlan(a),/热身/);
 const b=buildPlan({...advanced,days:6,split:'ppl-ab',minutes:90});
 const shoulder=b.days[1].exercises.find(e=>e.exerciseId==='db-reverse-fly')!;shoulder.exerciseId='db-shoulder-press';shoulder.alternativeIds=[];
 assert.throws(()=>validatePlan(b),/分化/);
});
test('800组条件矩阵：不同目标/经验/频率/时长/器械，结果合法或返回明确时间冲突',()=>{
 let ok=0,conflicts=0;
 for(const goal of ['hypertrophy','fat-loss','strength','fitness'] as const)
 for(const experience of ['beginner','novice','intermediate','advanced'] as const)
 for(const days of [2,3,4,5,6])for(const minutes of [30,45,60,75,90] as const)
 for(const availableEquipment of [gymEquipment,['dumbbells'] as Profile['availableEquipment']]){
  try{const p=buildPlan({...advanced,goal,experience,days,minutes,availableEquipment});assert.ok(p.days.every(d=>d.estimatedSeconds<=minutes*60));ok++;}
  catch(e){assert.ok(e instanceof TrainingConflict);assert.equal(e.code,'TIME_CONFLICT');assert.equal(minutes,30);conflicts++;}
 }
 assert.equal(ok,800);assert.equal(conflicts,0);
});
