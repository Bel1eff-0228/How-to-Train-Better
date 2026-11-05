import {z} from 'zod';
import {type Plan as LegacyPlan,profileSchema as legacyProfileSchema} from '../plan';
import {profileSchema,type Profile,type Plan} from '../training/schema';
import {legacyPlanSchema,upgradeProfile} from '../training/compatibility';
import {validatePlan} from '../training/engine';
import {exerciseById} from '../training/exercises';
export const sourceSchema=z.object({id:z.string(),title:z.string(),path:z.string(),chapter:z.string(),item:z.string(),source:z.string(),verified:z.string(),flags:z.array(z.string())}).strict();
export type Source=z.infer<typeof sourceSchema>;
export type AgentPlan=Plan&{sources:Source[];explanations:string[]};
export type CompatiblePlan=Omit<LegacyPlan,'profile'> & {profile:Omit<LegacyPlan['profile'],'goal'|'experience'> & {goal:string;experience:string};trainingPlan:AgentPlan;sources:Source[]};
export const legacyGymEquipment=['leg-press','chest-press','cable'] as const;
export function normalizeProfile(raw:unknown):Profile{
 if(typeof raw==='object'&&raw!==null&&'environment' in raw)return profileSchema.parse(raw);
 const p=legacyProfileSchema.strict().parse(raw);
 return upgradeProfile(p,p.equipment==='健身房'?[...legacyGymEquipment]:undefined);
}
export function parseAgentPlan(raw:unknown):AgentPlan{
 const envelope=z.object({sources:z.array(sourceSchema).max(8),explanations:z.array(z.string().max(2000)).max(8)}).passthrough().parse(raw);
 const {sources,explanations,...rest}=envelope;
 return {...validatePlan(rest),sources,explanations};
}
export function previousPlan(raw:unknown):{profile:Profile;version:number;modern?:AgentPlan}{
 if(typeof raw==='object'&&raw!==null&&'trainingPlan' in raw)return previousPlan(raw.trainingPlan);
 if(typeof raw==='object'&&raw!==null&&'schemaVersion' in raw){const modern=parseAgentPlan(raw);return {profile:modern.profile,version:modern.version,modern};}
 const legacy=legacyPlanSchema.parse(raw);return {profile:normalizeProfile(legacy.profile),version:legacy.version};
}
export function compatiblePlan(plan:AgentPlan):CompatiblePlan{
 const p=plan.profile;
 const goal=({hypertrophy:'增肌','fat-loss':'减脂',strength:'力量',fitness:'提升体能'} as const)[p.goal];
 const experience=({beginner:'新手',novice:'初级',intermediate:'中级',advanced:'进阶'} as const)[p.experience];
 const profile={goal,experience,days:p.days,minutes:p.minutes,equipment:({gym:'健身房',dumbbells:'哑铃',bodyweight:'徒手'} as const)[p.environment],budget:p.budget,notes:p.notes};
 return {mode:'ai',version:plan.version,profile,trainingPlan:plan,sources:plan.sources,changes:plan.changes,reasons:[...plan.reasons,...plan.explanations,...plan.activityGuidance,...plan.recoveryGuidance,...plan.nutritionGuidance,...plan.warnings],days:plan.days.map(d=>({label:d.label,focus:`${plan.split} · ${d.variant}`,minutes:d.estimatedMinutes,exercises:d.exercises.map(e=>({name:exerciseById.get(e.exerciseId)!.name,sets:e.workSets,reps:`${e.reps.min}–${e.reps.max}次${exerciseById.get(e.exerciseId)!.laterality==='unilateral'?'（每侧）':''} · RIR ${e.rir} · 另做${e.warmupSets}组热身`,rest:`${e.restSeconds}秒`,alternative:e.alternativeIds.slice(0,2).map(id=>exerciseById.get(id)!.name).join(' / ')||'无已验证的器械替代；不适停止'}))}))};
}
