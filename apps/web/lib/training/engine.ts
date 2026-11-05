import {availableExercises,alternativesFor,exerciseById} from './exercises';
import {chooseSplit,templates} from './splits';
import {daySeconds,weeklyVolume} from './metrics';
import {profileSchema,planSchema,policySchema,TrainingConflict,type Profile,type Plan,type Policy,type Day,type Prescription,type Muscle} from './schema';

export function defaultPolicy(p:Profile):Policy{
 const experienced=p.experience==='intermediate'||p.experience==='advanced';
 return {baseSets:experienced?3:2,priorityExtraSets:1,weeklyDirectTarget:{min:experienced?6:2,max:experienced?18:12},label:'可调整的编辑起点，不是个人最优阈值；间接组不折算为直接组'};
}
function checkLimits(p:Profile){
 if(p.notes.trim())throw new TrainingConflict('UNASSESSED_LIMITATION','当前规则引擎不解释自由文本限制；需先由后续意图与风险模块评估，不能忽略说明直接生成。');
 for(const id of p.excludedExerciseIds)if(!exerciseById.has(id))throw new TrainingConflict('UNKNOWN_EXERCISE',`排除动作不存在：${id}`);
}
const weekdays:Record<number,string[]>={2:['周一','周四'],3:['周一','周三','周五'],4:['周一','周二','周四','周六'],5:['周一','周二','周三','周五','周六'],6:['周一','周二','周三','周四','周五','周六']};
export function buildPlan(raw:unknown,options:{version?:number;policy?:Policy;changes?:string[]}={}):Plan{
 const p=profileSchema.parse(raw);checkLimits(p);
 const policy=policySchema.parse(options.policy??defaultPolicy(p));
 const split=chooseSplit(p),pool=availableExercises(p),warnings:string[]=[];
 const days:Day[]=templates(p,split).map((t,i)=>{
  const slots=[...t.slots];
  for(const m of p.priorityMuscles)if(slots.includes(m)&&!slots.slice(slots.indexOf(m)+1).includes(m))slots.push(m);
  // Priority muscles come first; otherwise preserve template order and deterministic catalogue order.
  slots.sort((a,b)=>Number(p.priorityMuscles.includes(b))-Number(p.priorityMuscles.includes(a)));
  const used=new Set<string>();const selected:Prescription[]=[];
  for(const m of slots){
   const candidates=pool.filter(e=>e.primary.includes(m)&&!used.has(e.id)&&(t.name!=='拉'||m!=='shoulders'||e.id==='db-reverse-fly'));
   // Repeat slots request a different exercise, but do not manufacture an unavailable alternative.
   if(!candidates.length){if(selected.some(s=>exerciseById.get(s.exerciseId)!.primary.includes(m))){warnings.push(`${t.name}：${m}没有第二个可用动作，保留原动作并通过组数强化。`);continue;}throw new TrainingConflict('EQUIPMENT_COVERAGE',`${t.name}缺少适合经验与实际器械的${m}动作；请调整器械、排除项或分化。`);}
   // Compound first; B rotates within the same movement pattern, not random core replacement.
   const occurrence=selected.filter(s=>exerciseById.get(s.exerciseId)!.primary.includes(m)).length;
   const b=t.variant==='B';
   const preferred:Partial<Record<Muscle,string[]>>={
    chest:occurrence?['cable-fly','db-floor-fly']:b?['db-bench','barbell-bench','db-press','knee-pushup']:['chest-press','db-bench','db-press','knee-pushup'],
    back:occurrence||b?['lat-pulldown','db-bent-row','cable-row','band-row']:['cable-row','machine-row','db-row','band-row'],
    quads:b?['db-squat','leg-press','bw-squat']:['leg-press','db-squat','bw-squat'],
    hamstrings:b?['leg-curl','db-rdl','heel-bridge']:['db-rdl','leg-curl','heel-bridge'],
    // A separate hip-extension task instead of a second RDL with a different implement.
    glutes:['db-bridge','barbell-hip-thrust','bridge'],
    shoulders:t.name==='拉'?['db-reverse-fly']:t.name==='上肢'||occurrence?['db-lateral','cable-lateral']:['db-shoulder-press','db-lateral'],
    biceps:b?['db-hammer','cable-curl','db-curl']:['db-curl','cable-curl'],
    triceps:b?['db-triceps','cable-triceps']:['cable-triceps','db-triceps'],
    calves:['db-calf','bw-calf'],core:b?['bird-dog','dead-bug']:['dead-bug','bird-dog'],
   };
   const order=preferred[m]??[];
   const rank=(id:string)=>order.includes(id)?order.indexOf(id):100;
   candidates.sort((a,b)=>rank(a.id)-rank(b.id)||Number(a.pattern==='isolation')-Number(b.pattern==='isolation'));
   const e=candidates[0];used.add(e.id);
   const compound=!['isolation','core'].includes(e.pattern);
   const strength=p.goal==='strength'&&compound;
   const priority=e.primary.some(x=>p.priorityMuscles.includes(x));
   const sets=Math.min(6,policy.baseSets+(priority?policy.priorityExtraSets:0));
   selected.push({exerciseId:e.id,workSets:sets,warmupSets:compound?(strength?2:1):0,reps:strength?{min:5,max:8}:e.pattern==='isolation'?{min:10,max:15}:{min:8,max:12},rir:p.experience==='beginner'||p.goal==='fat-loss'?3:2,restSeconds:strength?180:compound?120:60,warmupReps:8,warmupRestSeconds:45,transitionSeconds:60,alternativeIds:alternativesFor(e.id,p)});
  }
  const day:Day={label:weekdays[p.days][i],focus:[...new Set(t.slots)],variant:t.variant,generalWarmupSeconds:300,exercises:selected,estimatedSeconds:1,estimatedMinutes:1};
  // Time is a hard constraint: reduce accessory/nonpriority sets first, never cut rest or warm-up to fit.
  while(daySeconds(day)>p.minutes*60){
   const reducible=day.exercises.filter(e=>e.workSets>1).sort((a,b)=>Number(exerciseById.get(a.exerciseId)!.primary.some(m=>p.priorityMuscles.includes(m)))-Number(exerciseById.get(b.exerciseId)!.primary.some(m=>p.priorityMuscles.includes(m)))||b.workSets-a.workSets);
   if(!reducible.length){
    // A second priority exercise is optional; coverage, warm-up and rests are not.
    const redundant=day.exercises.findLastIndex((_,index)=>day.focus.every(m=>day.exercises.some((s,j)=>j!==index&&exerciseById.get(s.exerciseId)!.primary.includes(m))));
    if(redundant>=0){day.exercises.splice(redundant,1);warnings.push(`${day.label}时间有限，取消重复覆盖动作，重点肌群保留基础训练；不保证额外强化量。`);continue;}
    let replacement:{index:number;entry:Prescription;saving:number}|undefined;
    for(const [index,current] of day.exercises.entries())for(const id of current.alternativeIds){
     if(day.exercises.some(e=>e.exerciseId===id))continue;
     const candidate={...current,exerciseId:id,alternativeIds:alternativesFor(id,p)};
     const trial={...day,exercises:day.exercises.map((e,j)=>j===index?candidate:e)};
     const saving=daySeconds(day)-daySeconds(trial);
     if(saving>0&&day.focus.every(m=>trial.exercises.some(e=>exerciseById.get(e.exerciseId)!.primary.includes(m)))&&(!replacement||saving>replacement.saving))replacement={index,entry:candidate,saving};
    }
    if(replacement){day.exercises[replacement.index]=replacement.entry;warnings.push(`${day.label}改用覆盖相同肌群的省时动作，保留热身、休息和器械限制。`);continue;}
    throw new TrainingConflict('TIME_CONFLICT',`${day.label}至少需要${Math.ceil(daySeconds(day)/60)}分钟，超过${p.minutes}分钟；可增加单次时间、改分化或补充可用器械，原条件未被改写。`);
   }
   reducible[0].workSets--;
  }
  if(day.exercises.some(e=>e.workSets<policy.baseSets))warnings.push(`${day.label}为满足时间上限减少正式组；未缩短热身和休息。`);
  day.estimatedSeconds=daySeconds(day);day.estimatedMinutes=Math.ceil(day.estimatedSeconds/60);return day;
 });
 // Configurable volume ceiling is a hard editorial guardrail; minimum is a transparent soft target.
 let volume=weeklyVolume(days);
 for(const m of volume){
  while(volume.find(v=>v.muscle===m.muscle)!.directSets>policy.weeklyDirectTarget.max){
   warnings.push(`${m.muscle}按配置周量上限减少正式组；该上限是编辑策略，不是生理极限。`);
   const entries=days.flatMap(d=>d.exercises).filter(e=>e.workSets>1&&exerciseById.get(e.exerciseId)!.primary.includes(m.muscle));
   if(!entries.length)throw new TrainingConflict('VOLUME_CONFLICT',`${m.muscle}最低每动作1组仍超过配置周量上限。`);
   entries.sort((a,b)=>b.workSets-a.workSets)[0].workSets--;volume=weeklyVolume(days);
  }
 }
 for(const d of days){d.estimatedSeconds=daySeconds(d);d.estimatedMinutes=Math.ceil(d.estimatedSeconds/60);}
 for(const v of volume){if(v.directSets<policy.weeklyDirectTarget.min)warnings.push(`${v.muscle}直接组${v.directSets}，低于编辑参考${policy.weeklyDirectTarget.min}；间接参与${v.indirectSets}组不等同直接组。`);if(v.exposureFrequency<2)warnings.push(`${v.muscle}本周仅${v.exposureFrequency}天参与；当前偏好/时间下非每肌群每周两次结构。`);}
 const cutting=p.goal==='fat-loss';
 const plan:Plan={schemaVersion:'2.1',version:options.version??1,mode:'rules',profile:p,split,days,policy,weeklyVolume:volume,totalWorkSets:days.reduce((n,d)=>n+d.exercises.reduce((s,e)=>s+e.workSets,0),0),changes:options.changes??[],warnings:[...new Set(warnings)],
  reasons:[`按${p.days}天、${p.minutes}分钟、${p.experience}与分化偏好选择${split}；具体器械清单优先于环境名称。`,`重点肌群：${p.priorityMuscles.join('、')||'均衡'}；在对应训练日提前安排并尝试增加正式组，受时间与周量上限约束。`,'总正式组每个动作只计一次；多主肌群分别统计直接组，汇总肌群列不能作为全周总组相加。','所有耗时为规划估算，不是实测；休息或热身需要延长时应减少任务，不能赶动作。','仅使用已有器械，额外预算不构成购买补剂或器械的要求。'],
  activityGuidance:cutting?['在可恢复前提下增加步行等日常活动；额外有氧单列，不挤占本计划力量训练时间。']:p.goal==='fitness'?['在力量训练之外按耐受安排有氧；额外活动时间不包含在本表中。']:['保持日常活动，避免额外疲劳影响主要力量训练。'],
  recoveryGuidance:cutting?['减脂期间先保持可完成的力量训练，使用更保守的余力起点；若表现持续下降或恢复变差，先减少辅助组，不自动加量。']:['表现与恢复稳定后才逐步增加次数、负荷或少量组数；不要同时提高所有变量。'],
  nutritionGuidance:cutting?['通过可持续饮食调整支持整体减脂，保留正常进食和蛋白质来源；本计划不估算个人热量缺口。']:p.goal==='hypertrophy'?['保证足够饮食和蛋白质来源支持训练与恢复；不强制补剂，不虚构精确热量。']:['规律进食支持训练与恢复，不根据本表推算个人热量需求。'],
  progression:'当所有正式组在动作稳定、达到次数范围上端且仍符合目标余力时，再尝试可用的最小加重并回到次数下端；没有表现记录时不自动增加重量。核心动作保持稳定。',
  sourcePaths:['book/07-练过一年后把训练变量想清楚.md#第2、5、6、7、10、13条','docs/v2.1-audit-and-research.md'],
 };
 return validatePlan(plan);
}
export function validatePlan(raw:unknown):Plan{
 const plan=planSchema.parse(raw),p=plan.profile;checkLimits(p);
 if(chooseSplit(p)!==plan.split||plan.days.length!==p.days)throw new TrainingConflict('STRUCTURE','天数或分化不符');
 const allowed=new Set(availableExercises(p).map(e=>e.id));
 const expectedTemplates=templates(p,plan.split);
 for(const [index,d] of plan.days.entries()){
  const expected=expectedTemplates[index];
  if(d.label!==weekdays[p.days][index]||d.variant!==expected.variant||JSON.stringify(d.focus)!==JSON.stringify([...new Set(expected.slots)]))throw new TrainingConflict('STRUCTURE','训练日、变式或目标肌群与分化不符');
  if(new Set(d.exercises.map(e=>e.exerciseId)).size!==d.exercises.length)throw new TrainingConflict('DUPLICATE','同日动作重复');
  for(const e of d.exercises){
   if(!allowed.has(e.exerciseId))throw new TrainingConflict('EQUIPMENT','动作或器械不允许');if(e.alternativeIds.some(id=>!alternativesFor(e.exerciseId,p).includes(id)))throw new TrainingConflict('ALTERNATIVE','替代动作不允许');
   const movement=exerciseById.get(e.exerciseId)!;const compound=!['isolation','core'].includes(movement.pattern);
   if(!movement.primary.some(m=>expected.slots.includes(m))||(expected.name==='拉'&&movement.pattern.includes('push')))throw new TrainingConflict('STRUCTURE','动作不符合当日分化');
   if((compound&&e.warmupSets<(p.goal==='strength'?2:1))||e.transitionSeconds<60||e.restSeconds<(compound?(p.goal==='strength'?180:120):60)||d.generalWarmupSeconds<300)throw new TrainingConflict('TIMING_POLICY','不得省略必要热身、转换或休息来压缩时间');
  }
  if(expected.slots.some(m=>!d.exercises.some(e=>exerciseById.get(e.exerciseId)!.primary.includes(m))))throw new TrainingConflict('COVERAGE','当日缺少分化要求的目标肌群');
  if(d.estimatedSeconds!==daySeconds(d)||d.estimatedMinutes!==Math.ceil(daySeconds(d)/60)||daySeconds(d)>p.minutes*60)throw new TrainingConflict('TIME','时间不符或超限');
 }
 const volume=weeklyVolume(plan.days);
 if(JSON.stringify(volume)!==JSON.stringify(plan.weeklyVolume))throw new TrainingConflict('VOLUME','周量统计不符');
 if(volume.some(v=>v.directSets>plan.policy.weeklyDirectTarget.max))throw new TrainingConflict('VOLUME','周量超过策略上限');
 for(const m of ['chest','back','shoulders','quads','hamstrings','glutes','biceps','triceps','calves','core'] as Muscle[])if(!volume.some(v=>v.muscle===m&&v.exposureFrequency>0))throw new TrainingConflict('COVERAGE',`缺少${m}覆盖`);
 const total=plan.days.flatMap(d=>d.exercises).reduce((s,e)=>s+e.workSets,0);if(plan.totalWorkSets!==total)throw new TrainingConflict('TOTAL','总正式组不符');
 return plan;
}
// Typed patch only. Natural-language interpretation remains outside this engine.
export function revisePlan(previous:Plan,patch:Partial<Profile>):Plan{
 const old=validatePlan(previous);const next=profileSchema.parse({...old.profile,...patch});
 const changes=Object.keys(next).filter(k=>JSON.stringify(next[k as keyof Profile])!==JSON.stringify(old.profile[k as keyof Profile])).map(k=>`${k}已调整`);
 if(!changes.length)throw new TrainingConflict('NO_CHANGE','条件没有变化');
 return buildPlan(next,{version:old.version+1,changes:[...changes,'重新分配全部训练日与周量，保留未修改条件。'],policy:old.policy});
}
