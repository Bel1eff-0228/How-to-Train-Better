import {exerciseSchema,type Exercise,type Equipment,type Muscle,type Profile} from './schema';

// Editorial movement taxonomy, not an assertion that synergists receive equivalent stimulus.
type Row=[string,string,Muscle[],Muscle[],Exercise['pattern'],Equipment[],Exercise['difficulty']?,Exercise['laterality']?];
const rows:Row[]=[
 ['db-squat','哑铃杯式深蹲',['quads','glutes'],['core'],'squat',['dumbbells']],
 ['leg-press','器械腿举',['quads','glutes'],[],'squat',['leg-press']],
 ['bw-squat','徒手深蹲',['quads','glutes'],['core'],'squat',[]],
 ['sit-stand','椅子坐站',['quads','glutes'],[],'squat',['chair']],
 ['barbell-squat','杠铃背蹲',['quads','glutes'],['core'],'squat',['barbell','rack'],'intermediate'],
 ['db-lunge','哑铃后撤箭步蹲',['quads','glutes'],['core'],'lunge',['dumbbells'],'intermediate','unilateral'],
 ['bw-lunge','徒手分腿蹲',['quads','glutes'],['core'],'lunge',[],'beginner','unilateral'],
 ['db-split-squat','哑铃分腿蹲',['quads','glutes'],['core'],'lunge',['dumbbells'],'intermediate','unilateral'],
 ['leg-extension','器械腿屈伸',['quads'],[],'isolation',['leg-extension']],
 ['db-rdl','哑铃罗马尼亚硬拉',['hamstrings','glutes'],['back','core'],'hinge',['dumbbells']],
 ['barbell-rdl','杠铃罗马尼亚硬拉',['hamstrings','glutes'],['back','core'],'hinge',['barbell'],'intermediate'],
 ['leg-curl','器械腿弯举',['hamstrings'],[],'isolation',['leg-curl']],
 ['bridge','徒手臀桥',['glutes'],['hamstrings'],'hinge',[]],
 ['db-bridge','哑铃臀桥',['glutes'],['hamstrings'],'hinge',['dumbbells']],
 ['barbell-hip-thrust','杠铃臀推',['glutes'],['hamstrings'],'hinge',['barbell','bench'],'intermediate'],
 ['heel-bridge','脚跟支撑臀桥',['hamstrings','glutes'],[],'hinge',[]],
 ['db-press','哑铃地板卧推',['chest'],['triceps','shoulders'],'horizontal-push',['dumbbells']],
 ['db-bench','哑铃平板卧推',['chest'],['triceps','shoulders'],'horizontal-push',['dumbbells','bench']],
 ['chest-press','器械推胸',['chest'],['triceps','shoulders'],'horizontal-push',['chest-press']],
 ['barbell-bench','杠铃卧推',['chest'],['triceps','shoulders'],'horizontal-push',['barbell','bench','rack'],'intermediate'],
 ['pushup','俯卧撑',['chest'],['triceps','shoulders','core'],'horizontal-push',[],'intermediate'],
 ['knee-pushup','跪姿俯卧撑',['chest'],['triceps','shoulders'],'horizontal-push',[]],
 ['wall-push','墙壁俯卧撑',['chest'],['triceps','shoulders'],'horizontal-push',['wall']],
 ['cable-fly','站姿绳索夹胸',['chest'],[],'isolation',['cable']],
 ['db-floor-fly','轻重量哑铃地板飞鸟',['chest'],[],'isolation',['dumbbells'],'intermediate'],
 ['db-row','单臂哑铃划船（另一手撑自身大腿）',['back'],['biceps'],'horizontal-pull',['dumbbells'],'beginner','unilateral'],
 ['db-bent-row','双臂哑铃俯身划船',['back'],['biceps','core'],'horizontal-pull',['dumbbells']],
 ['cable-row','坐姿绳索划船',['back'],['biceps'],'horizontal-pull',['cable']],
 ['machine-row','器械划船',['back'],['biceps'],'horizontal-pull',['row-machine']],
 ['db-supported-row','哑铃胸托划船',['back'],['biceps'],'horizontal-pull',['dumbbells','bench']],
 ['barbell-row','杠铃俯身划船',['back'],['biceps','core'],'horizontal-pull',['barbell'],'intermediate'],
 ['band-row','坐姿弹力带划船（脚部固定）',['back'],['biceps'],'horizontal-pull',['bands']],
 ['lat-pulldown','高位下拉',['back'],['biceps'],'vertical-pull',['lat-pulldown']],
 ['pullup','引体向上',['back'],['biceps','core'],'vertical-pull',['pullup-bar'],'advanced'],
 ['db-shoulder-press','站姿哑铃推举',['shoulders'],['triceps','core'],'vertical-push',['dumbbells']],
 ['barbell-press','杠铃站姿推举',['shoulders'],['triceps','core'],'vertical-push',['barbell'],'intermediate'],
 ['pike-pushup','屈体俯卧撑',['shoulders'],['triceps'],'vertical-push',[],'advanced'],
 ['db-lateral','哑铃侧平举',['shoulders'],[],'isolation',['dumbbells']],
 ['cable-lateral','单臂绳索侧平举',['shoulders'],[],'isolation',['cable'],'beginner','unilateral'],
 ['db-reverse-fly','哑铃俯身反向飞鸟',['shoulders'],['back'],'isolation',['dumbbells']],
 ['db-curl','双臂哑铃弯举',['biceps'],[],'isolation',['dumbbells']],
 ['db-hammer','双臂哑铃锤式弯举',['biceps'],[],'isolation',['dumbbells']],
 ['cable-curl','绳索弯举',['biceps'],[],'isolation',['cable']],
 ['db-triceps','双手单哑铃头上臂屈伸',['triceps'],[],'isolation',['dumbbells']],
 ['cable-triceps','绳索下压',['triceps'],[],'isolation',['cable']],
 ['db-calf','哑铃站姿提踵',['calves'],[],'isolation',['dumbbells']],
 ['bw-calf','徒手站姿提踵',['calves'],[],'isolation',[]],
 ['dead-bug','死虫式',['core'],[],'core',[],'beginner','unilateral'],
 ['bird-dog','鸟狗式',['core'],['glutes'],'core',[],'beginner','unilateral'],
 ['reverse-crunch','仰卧反向卷腹',['core'],[],'core',[]],
];
const base=rows.map(([id,name,primary,secondary,pattern,equipment,difficulty='beginner',laterality='bilateral'])=>({id,name,primary,secondary,pattern,equipment,difficulty,laterality,secondsPerRep:4,alternatives:[] as string[]}));
export const exercises:readonly Exercise[]=base.map(e=>exerciseSchema.parse({...e,alternatives:base.filter(a=>a.id!==e.id&&a.pattern===e.pattern&&a.primary.some(m=>e.primary.includes(m))).map(a=>a.id)}));
export const exerciseById=new Map(exercises.map(e=>[e.id,e]));
export const gymEquipment:Equipment[]=['dumbbells','bench','barbell','rack','cable','lat-pulldown','leg-press','leg-curl','leg-extension','chest-press','row-machine','pullup-bar','wall'];
const ranks={beginner:0,intermediate:1,advanced:2};
export function availableExercises(p:Profile):Exercise[]{
 const level=p.experience==='advanced'?2:p.experience==='intermediate'?1:0;
 return exercises.filter(e=>e.equipment.every(r=>p.availableEquipment.includes(r))&&ranks[e.difficulty]<=level&&!p.excludedExerciseIds.includes(e.id));
}
export function alternativesFor(id:string,p:Profile):string[]{const e=exerciseById.get(id);return availableExercises(p).filter(a=>e?.alternatives.includes(a.id)).map(a=>a.id);}
export function auditCatalog(){
 if(exerciseById.size!==exercises.length)throw new Error('重复动作ID');
 for(const e of exercises){exerciseSchema.parse(e);for(const id of e.alternatives){const a=exerciseById.get(id);if(!a||id===e.id||a.pattern!==e.pattern||!a.primary.some(m=>e.primary.includes(m)))throw new Error(`无效替代动作: ${e.id}`);}}
 return {count:exercises.length,muscles:Object.fromEntries(['chest','back','shoulders','quads','hamstrings','glutes','biceps','triceps','calves','core'].map(m=>[m,exercises.filter(e=>e.primary.includes(m as Muscle)).length]))};
}
