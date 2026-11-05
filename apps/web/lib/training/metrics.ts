import {exerciseById} from './exercises';
import {muscleSchema,type Day,type Prescription,TrainingConflict} from './schema';

// Upper end of rep range; bilateral execution means both limbs together.
// Unilateral repetitions are performed on BOTH sides before the specified rest.
export function exerciseSeconds(p:Prescription):number{
 const e=exerciseById.get(p.exerciseId);if(!e)throw new TrainingConflict('UNKNOWN_EXERCISE',p.exerciseId);
 const sides=e.laterality==='unilateral'?2:1;
 return Math.ceil(p.transitionSeconds+p.warmupSets*(p.warmupReps*e.secondsPerRep*sides+p.warmupRestSeconds)+p.workSets*p.reps.max*e.secondsPerRep*sides+Math.max(0,p.workSets-1)*p.restSeconds);
}
export function daySeconds(day:Pick<Day,'generalWarmupSeconds'|'exercises'>):number{return day.generalWarmupSeconds+day.exercises.reduce((s,e)=>s+exerciseSeconds(e),0);}
export function weeklyVolume(days:Day[]){
 return muscleSchema.options.map(muscle=>{
  let directSets=0,indirectSets=0,directFrequency=0,exposureFrequency=0;
  for(const d of days){let direct=0,indirect=0;for(const p of d.exercises){const e=exerciseById.get(p.exerciseId)!;if(e.primary.includes(muscle))direct+=p.workSets;else if(e.secondary.includes(muscle))indirect+=p.workSets;}directSets+=direct;indirectSets+=indirect;directFrequency+=Number(direct>0);exposureFrequency+=Number(direct+indirect>0);}
  return {muscle,directSets,indirectSets,directFrequency,exposureFrequency};
 });
}
