import {z} from 'zod';
import {profileSchema,type Profile} from '../training/schema';
import {AgentError} from './errors';
// Zod defaults must NOT populate a partial change (would erase priorities/budget).
const patchSchema=z.record(z.string(),z.unknown()).transform(raw=>{
 const parsed=profileSchema.partial().strict().parse(raw);
 return Object.fromEntries(Object.keys(raw).map(k=>[k,parsed[k as keyof Profile]])) as Partial<Profile>;
});
export const intentSchema=z.object({safe:z.boolean(),patch:patchSchema,evidence:z.record(z.string(),z.string().min(1).max(500))}).strict();
const aliases:Record<string,string[]>={hypertrophy:['增肌'],'fat-loss':['减脂'],strength:['力量'],fitness:['体能'],beginner:['新手'],novice:['初级'],intermediate:['中级'],advanced:['进阶'],gym:['健身房'],dumbbells:['哑铃'],bodyweight:['徒手'],bench:['训练凳','卧推凳'],barbell:['杠铃'],rack:['深蹲架'],cable:['绳索','龙门架'],'lat-pulldown':['高位下拉'],'leg-press':['腿举机'],'leg-curl':['腿弯举机'],'leg-extension':['腿屈伸机'],'chest-press':['推胸机'],'row-machine':['划船机'],'pullup-bar':['单杠'],bands:['弹力带'],wall:['墙'],chair:['椅子'],auto:['自动'],'full-body':['全身'],'upper-lower':['上下肢'],ppl:['推拉腿'],'four-day':['四分化'],'five-day':['五天专项'],'ppl-ab':['六天推拉腿','推拉腿A/B'],chest:['胸'],back:['背'],shoulders:['肩'],quads:['股四头','大腿前侧'],hamstrings:['腘绳','大腿后侧'],glutes:['臀'],biceps:['肱二头'],triceps:['肱三头'],calves:['小腿'],core:['核心','腹']};
function mentioned(value:string,span:string){return (aliases[value]??[value]).some(v=>span.includes(v));}
export function checkedPatch(raw:unknown,request:string,old:Profile):Partial<Profile>{
 const result=intentSchema.parse(raw);if(!result.safe)throw new AgentError('SAFETY_STOP','修改涉及风险或无法确定的条件，原计划保留。');
 const patch=result.patch;
 if(Object.keys(result.evidence).some(k=>!(k in patch)))throw new AgentError('INTENT_DRIFT','修改依据包含无关字段。');
 for(const [key,value] of Object.entries(patch)){
  const span=result.evidence[key];if(!span||!request.includes(span))throw new AgentError('INTENT_DRIFT','修改条件缺少原文依据，请明确说明。');
  if(/不要|不改|保持|不变|维持/.test(span))throw new AgentError('INTENT_DRIFT','不能把要求保留的条件当作修改。请只说明要改变的字段。');
  let valid=false;
  if(key==='days'){const match=span.match(/(?:每周|这周|一周|周|练|训练)\D{0,5}([2-6二两三四五六])\s*(?:天|次|练)/);const n:Record<string,number>={二:2,两:2,三:3,四:4,五:5,六:6};valid=!!match&&(n[match[1]]??Number(match[1]))===value;}
  else if(key==='minutes')valid=new RegExp(`(?:每次|单次|一次)[^，。；]{0,8}${value}\\s*分钟`).test(span);
  else if(key==='budget'){const m=span.match(/预算\D{0,5}(\d+)\s*元/);valid=!!m&&Number(m[1])===value;}
  else if(key==='notes')valid=value===span;
  else if(Array.isArray(value)){
   valid=value.length>0&&value.every(v=>mentioned(v,span));
   if(key==='priorityMuscles')valid=(valid&&/优先|重点|强化/.test(span))||(value.length===0&&/取消.*(重点|优先)/.test(span));
   if(key==='excludedExerciseIds')valid=valid&&/排除|不做|取消/.test(span);
   if(key==='availableEquipment')valid=valid&&/只有|只用|器械|设备|可用/.test(span);
  }else valid=typeof value==='string'&&mentioned(value,span);
  if(!valid)throw new AgentError('INTENT_DRIFT',`无法核实${key}的修改值，请直接说明新条件。`);
 }
 if(patch.availableEquipment&&!patch.environment)patch.environment=patch.availableEquipment.length===1&&patch.availableEquipment[0]==='dumbbells'?'dumbbells':old.environment;
 if(patch.environment&&!patch.availableEquipment&&patch.environment!==old.environment)throw new AgentError('CONFIRM_EQUIPMENT','改变环境时请明确实际可用器械，例如“只有哑铃”。');
 if(!Object.keys(patch).some(k=>JSON.stringify(patch[k as keyof Profile])!==JSON.stringify(old[k as keyof Profile])))throw new AgentError('NO_CHANGE','没有识别到明确修改，原计划保留。');
 return patch;
}
