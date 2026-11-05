import {type Profile,type Muscle,TrainingConflict} from './schema';

export type Split=Exclude<Profile['split'],'auto'>;
export type Template={name:string;slots:Muscle[];variant:'A'|'B'};
const upper:Muscle[]=['chest','back','shoulders','biceps','triceps'];
const lower:Muscle[]=['quads','hamstrings','glutes','calves','core'];
const full:Muscle[]=['chest','back','quads','hamstrings','shoulders','core','calves'];
const push:Muscle[]=['chest','shoulders','triceps','core'];
const pull:Muscle[]=['back','back','shoulders','biceps'];
export function chooseSplit(p:Profile):Split{
 if(p.split!=='auto'){
  const allowed:Record<Split,number[]>={'full-body':[2,3,4,5,6],'upper-lower':[2,3,4,5,6],ppl:[3,6],'four-day':[4],'five-day':[5],'ppl-ab':[6]};
  if(!allowed[p.split].includes(p.days))throw new TrainingConflict('SPLIT_FREQUENCY',`${p.split}需要每周${allowed[p.split].join('或')}天；请选择自动推荐或修改频率。`);
  return p.split;
 }
 if(p.days<=3)return 'full-body';
 if(p.experience==='beginner'||p.experience==='novice'||p.minutes===30)return 'upper-lower';
 return p.days===4?'upper-lower':p.days===5?'five-day':'ppl-ab';
}
export function templates(p:Profile,split:Split):Template[]{
 const d=(name:string,slots:Muscle[],i:number):Template=>({name,slots:[...slots],variant:i%2?'B':'A'});
 if(split==='full-body')return Array.from({length:p.days},(_,i)=>d('全身',full,i));
 if(split==='upper-lower')return Array.from({length:p.days},(_,i)=>d(i%2?'下肢':'上肢',i%2?lower:upper,Math.floor(i/2)));
 if(split==='ppl'||split==='ppl-ab')return Array.from({length:p.days},(_,i)=>d(['推','拉','腿'][i%3],[push,pull,lower][i%3],Math.floor(i/3)));
 const four=[d('胸与肱三头肌',['chest','chest','triceps','core'],0),d('背与肱二头肌',['back','back','biceps','core'],0),d('肩与手臂',['shoulders','shoulders','biceps','triceps'],0),d('腿与臀',['quads','hamstrings','glutes','calves'],0)];
 return split==='four-day'?four:[...four,d('专项强化与全身补充',[...new Set<Muscle>([...p.priorityMuscles,'chest','back','quads','hamstrings','core'])],1)];
}
