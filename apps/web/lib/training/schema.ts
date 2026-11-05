import {z} from 'zod';

export const muscleSchema=z.enum(['chest','back','shoulders','quads','hamstrings','glutes','biceps','triceps','calves','core']);
export type Muscle=z.infer<typeof muscleSchema>;
export const equipmentSchema=z.enum(['dumbbells','bench','barbell','rack','cable','lat-pulldown','leg-press','leg-curl','leg-extension','chest-press','row-machine','pullup-bar','bands','wall','chair']);
export type Equipment=z.infer<typeof equipmentSchema>;
export const patternSchema=z.enum(['squat','hinge','lunge','horizontal-push','vertical-push','horizontal-pull','vertical-pull','isolation','core']);
export const splitSchema=z.enum(['auto','full-body','upper-lower','ppl','four-day','five-day','ppl-ab']);
const unique=<T>(a:T[])=>new Set(a).size===a.length;
export const exerciseSchema=z.object({
 id:z.string().regex(/^[a-z][a-z0-9-]+$/),name:z.string().min(1),
 primary:z.array(muscleSchema).min(1).refine(unique),secondary:z.array(muscleSchema).refine(unique),
 pattern:patternSchema,equipment:z.array(equipmentSchema).refine(unique),
 difficulty:z.enum(['beginner','intermediate','advanced']),laterality:z.enum(['bilateral','unilateral']),
 alternatives:z.array(z.string()).refine(unique),secondsPerRep:z.number().positive(),
}).strict().refine(e=>!e.primary.some(m=>e.secondary.includes(m)),'主次肌群不能重复');
export type Exercise=z.infer<typeof exerciseSchema>;
export const profileSchema=z.object({
 goal:z.enum(['hypertrophy','fat-loss','strength','fitness']),experience:z.enum(['beginner','novice','intermediate','advanced']),
 days:z.number().int().min(2).max(6),minutes:z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(75),z.literal(90)]),
 environment:z.enum(['gym','dumbbells','bodyweight']),availableEquipment:z.array(equipmentSchema).refine(unique),
 split:splitSchema.default('auto'),priorityMuscles:z.array(muscleSchema).max(2).refine(unique).default([]),
 excludedExerciseIds:z.array(z.string().max(60)).max(60).refine(unique).default([]),
 budget:z.number().min(0).max(100000).default(0),notes:z.string().max(500).default(''),
}).strict();
export type Profile=z.infer<typeof profileSchema>;
export const prescriptionSchema=z.object({
 exerciseId:z.string(),workSets:z.number().int().min(1).max(6),warmupSets:z.number().int().min(0).max(3),
 reps:z.object({min:z.number().int().positive(),max:z.number().int().positive()}).strict().refine(r=>r.min<=r.max),
 rir:z.number().int().min(1).max(5),restSeconds:z.number().int().min(30).max(300),
 warmupReps:z.number().int().min(1).max(15),warmupRestSeconds:z.number().int().min(15).max(180),
 transitionSeconds:z.number().int().min(0).max(180),alternativeIds:z.array(z.string()),
}).strict();
export type Prescription=z.infer<typeof prescriptionSchema>;
export const daySchema=z.object({label:z.string(),focus:z.array(muscleSchema),variant:z.enum(['A','B']),generalWarmupSeconds:z.number().int().min(180),exercises:z.array(prescriptionSchema).min(1),estimatedSeconds:z.number().int().positive(),estimatedMinutes:z.number().int().positive()}).strict();
export type Day=z.infer<typeof daySchema>;
export const volumeSchema=z.object({muscle:muscleSchema,directSets:z.number().int().nonnegative(),indirectSets:z.number().int().nonnegative(),directFrequency:z.number().int().nonnegative(),exposureFrequency:z.number().int().nonnegative()}).strict();
export const policySchema=z.object({baseSets:z.number().int().min(1).max(4),priorityExtraSets:z.number().int().min(0).max(1),weeklyDirectTarget:z.object({min:z.number().int().nonnegative(),max:z.number().int().positive()}).refine(r=>r.min<=r.max),label:z.string()}).strict();
export type Policy=z.infer<typeof policySchema>;
export const planSchema=z.object({schemaVersion:z.literal('2.1'),version:z.number().int().positive(),mode:z.literal('rules'),profile:profileSchema,split:splitSchema.exclude(['auto']),days:z.array(daySchema).min(2).max(6),weeklyVolume:z.array(volumeSchema).length(10),totalWorkSets:z.number().int().positive(),policy:policySchema,reasons:z.array(z.string()),warnings:z.array(z.string()),activityGuidance:z.array(z.string()),recoveryGuidance:z.array(z.string()),nutritionGuidance:z.array(z.string()),progression:z.string(),changes:z.array(z.string()),sourcePaths:z.array(z.string())}).strict();
export type Plan=z.infer<typeof planSchema>;
export class TrainingConflict extends Error {
 constructor(public code:string,message:string){super(message);this.name='TrainingConflict';}
}
