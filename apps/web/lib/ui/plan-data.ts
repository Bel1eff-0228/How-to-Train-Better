import {z} from 'zod';
import {planSchema,type Plan,type Profile,type Muscle,type Equipment} from '../training/schema';
import {legacyPlanSchema} from '../training/compatibility';
import type {Plan as LegacyPlan} from '../plan';

export const muscles:Record<Muscle,string>={chest:'胸部',back:'背部',shoulders:'肩部',quads:'大腿前侧',hamstrings:'大腿后侧',glutes:'臀部',biceps:'肱二头肌',triceps:'肱三头肌',calves:'小腿',core:'核心'};
export const equipment:Record<Equipment,string>={dumbbells:'哑铃',bench:'训练凳',barbell:'杠铃',rack:'深蹲架',cable:'绳索 / 龙门架','lat-pulldown':'高位下拉机','leg-press':'腿举机','leg-curl':'腿弯举机','leg-extension':'腿屈伸机','chest-press':'推胸机','row-machine':'划船器械','pullup-bar':'单杠',bands:'弹力带',wall:'墙面',chair:'稳固椅子'};
export const goals:Record<Profile['goal'],string>={hypertrophy:'增肌','fat-loss':'减脂',strength:'提升力量',fitness:'提升体能'};
export const experiences:Record<Profile['experience'],string>={beginner:'新手',novice:'初级',intermediate:'中级',advanced:'进阶'};
export const splits:Record<Profile['split'],string>={auto:'自动推荐','full-body':'全身训练','upper-lower':'上下肢分化',ppl:'推拉腿','four-day':'胸背肩腿四分化','five-day':'五天专项强化','ppl-ab':'六天推拉腿 A/B'};
// Display translation only; never change signed data, prescriptions or source paths.
const terms:Record<string,string>={...equipment,...goals,...experiences,...muscles,...splits,gym:'健身房',bodyweight:'徒手',priorityMuscles:'重点肌群',availableEquipment:'实际器械',environment:'训练场所',days:'每周天数',minutes:'单次时间',budget:'预算',experience:'经验',goal:'目标'};
const termPattern=new RegExp('\\b('+Object.keys(terms).sort((a,b)=>b.length-a.length).join('|')+')\\b','g');
export function readableText(text:string){return text.replace(termPattern,term=>terms[term]);}
const source=z.object({id:z.string(),title:z.string(),path:z.string(),source:z.string(),flags:z.array(z.string())}).passthrough();
const extras=z.object({sources:z.array(source).optional(),explanations:z.array(z.string()).optional(),token:z.string().optional()});
export type DisplayPlan={kind:'modern';plan:Plan;sources:z.infer<typeof source>[];explanations:string[];token?:string}|{kind:'legacy';plan:LegacyPlan;token?:string};
export function decodePlan(raw:unknown):DisplayPlan{
 if(typeof raw!=='object'||raw===null)throw new Error('返回的计划格式不正确，请重试。');
 const outer=raw as Record<string,unknown>;
 const modern='trainingPlan' in outer?outer.trainingPlan:'schemaVersion' in outer?raw:undefined;
 if(modern!==undefined){
  const meta=extras.parse(modern);const {sources:_,explanations:__,token:___,...core}=modern as Record<string,unknown>;void _;void __;void ___;
  return {kind:'modern',plan:planSchema.parse(core),sources:meta.sources??[],explanations:meta.explanations??[],token:z.string().optional().parse(outer.token??meta.token)};
 }
 const plan=legacyPlanSchema.parse(raw);return {kind:'legacy',plan,token:plan.token};
}
export function dayTitle(plan:Plan,index:number){
 const d=plan.days[index],priority=plan.profile.priorityMuscles.filter(m=>d.focus.includes(m));
 return priority.length?`${priority.map(m=>muscles[m]).join('、')}优先`:`${d.focus.map(m=>muscles[m]).join(' · ')}`;
}
export function planDifferences(previous:DisplayPlan,current:DisplayPlan){
 if(previous.kind!=='modern'||current.kind!=='modern')return ['旧版计划缺少热身、RIR与肌群统计，不能与新版做精确训练量对比。'];
 const a=previous.plan,b=current.plan;const rows:string[]=[];
 const add=(label:string,old:string,next:string)=>{if(old!==next)rows.push(`${label}：${old} → ${next}`);};
 add('目标',goals[a.profile.goal],goals[b.profile.goal]);add('经验',experiences[a.profile.experience],experiences[b.profile.experience]);
 add('每月额外预算',`${a.profile.budget}元`,`${b.profile.budget}元`);
 add('分化',splits[a.split],splits[b.split]);add('每周训练',`${a.days.length}天`,`${b.days.length}天`);
 add('单次时间上限',`${a.profile.minutes}分钟`,`${b.profile.minutes}分钟`);
 add('每天预计耗时',a.days.map(d=>`${d.label} ${d.estimatedMinutes}分钟`).join(' / '),b.days.map(d=>`${d.label} ${d.estimatedMinutes}分钟`).join(' / '));
 add('重点肌群',a.profile.priorityMuscles.map(m=>muscles[m]).join('、')||'均衡',b.profile.priorityMuscles.map(m=>muscles[m]).join('、')||'均衡');
 add('器械',a.profile.availableEquipment.map(e=>equipment[e]).join('、'),b.profile.availableEquipment.map(e=>equipment[e]).join('、'));
 add('全周正式组',`${a.totalWorkSets}组`,`${b.totalWorkSets}组`);
 for(const v of b.weeklyVolume){const old=a.weeklyVolume.find(x=>x.muscle===v.muscle);if(old)add(`${muscles[v.muscle]}直接组`,`${old.directSets}组 / ${old.directFrequency}天`,`${v.directSets}组 / ${v.directFrequency}天`);}
 return rows.length?rows:['所比较的训练结构与周量相同；请查看本次修改条件和解释。'];
}
export class PlanRequestError extends Error{constructor(public code:string,message:string,public options:string[]=[]){super(message);}}
export function errorHelp(code:string){
 if(code==='SPLIT_FREQUENCY')return '例如：把四分化改成两天时，请同时说明“改为自动分化”。也可以在条件表中选择自动推荐。';
 if(code==='INTENT_DRIFT'||code==='NO_CHANGE')return '请一次明确一个新条件，例如“每周2天”“只有哑铃”或“重点改为背部”。';
 if(code==='UNASSESSED_LIMITATION'||code==='SAFETY_STOP')return '涉及疼痛、疾病或未评估限制时不继续生成；请先寻求专业评估。当前不支持自由文本限制自动编排。';
 if(code==='TIME_CONFLICT')return '可增加单次时长，或改为自动分化；不会通过缩短必要热身和休息来凑时间。';
 if(code==='EQUIPMENT_COVERAGE'||code==='CONFIRM_EQUIPMENT')return '请核对实际器械清单。没有可用背部训练器械等条件时，系统不会编造可行动作。';
 if(code==='MODEL_TIMEOUT'||code==='CLIENT_TIMEOUT')return '本次等待已结束；如已有计划，仍会保留。稍后重试，避免连续点击。';
 if(code==='MODEL_HTTP_ERROR'||code==='MODEL_HTTP'||code==='SERVICE_UNAVAILABLE')return '模型服务暂时不可用，稍后重试；不会用演示数据替代结果。';
 return '如已有计划，不会因失败而丢失。核对条件后重试；若持续失败，请稍后再试。';
}
export function operationMessage(message:string,operation:'create'|'revise'){
 return operation==='revise'?message.replaceAll('本次未生成计划','本次未完成调整').replaceAll('计划未完整生成','修改结果不完整'):message;
}
