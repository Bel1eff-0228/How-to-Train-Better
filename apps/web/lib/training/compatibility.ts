import {z} from 'zod';
import {profileSchema as legacyProfileSchema,type Profile as LegacyProfile} from '../plan';
import {profileSchema,type Profile,type Equipment,TrainingConflict} from './schema';
import {validatePlan} from './engine';

// Existing API and signed payload are NOT rewritten. Missing facts stay unknown.
export const legacyPlanSchema=z.object({
 version:z.number().int().positive(),profile:legacyProfileSchema,mode:z.enum(['ai','demo']),
 days:z.array(z.object({label:z.string(),focus:z.string(),minutes:z.number().positive(),exercises:z.array(z.object({name:z.string(),sets:z.number().int().positive(),reps:z.string(),rest:z.string(),alternative:z.string()}))})),
 reasons:z.array(z.string()),changes:z.array(z.string()),token:z.string().optional(),sources:z.array(z.object({id:z.string(),title:z.string(),path:z.string(),chapter:z.string(),item:z.string(),source:z.string(),verified:z.string(),flags:z.array(z.string())})).optional(),
});
export function importLegacyPlan(raw:unknown){return {kind:'legacy-v2.0' as const,plan:legacyPlanSchema.parse(raw),requiresRegeneration:true as const,notice:'旧计划缺少可靠的动作ID、热身与RIR；保留原展示，不能伪造新统计。'};}
export function readPlan(raw:unknown){return typeof raw==='object'&&raw!==null&&'schemaVersion' in raw?{kind:'v2.1' as const,plan:validatePlan(raw)}:importLegacyPlan(raw);}
export function upgradeProfile(raw:LegacyProfile,confirmedEquipment?:Equipment[]):Profile{
 const old=legacyProfileSchema.parse(raw);
 if(old.equipment==='健身房'&&!confirmedEquipment)throw new TrainingConflict('CONFIRM_EQUIPMENT','旧版仅记录健身房，需确认实际器械清单后升级，不能假设所有器械可用。');
 return profileSchema.parse({goal:({增肌:'hypertrophy',减脂:'fat-loss',提升体能:'fitness'} as const)[old.goal],experience:({新手:'beginner',初级:'novice',进阶:'advanced'} as const)[old.experience],days:old.days,minutes:old.minutes,environment:({健身房:'gym',哑铃:'dumbbells',徒手:'bodyweight'} as const)[old.equipment],availableEquipment:confirmedEquipment??(old.equipment==='哑铃'?['dumbbells']:[]),budget:old.budget,notes:old.notes,split:'auto',priorityMuscles:[],excludedExerciseIds:[]});
}
