'use client';
import {useState} from 'react';
import {ArrowRight, ChevronDown, SlidersHorizontal} from 'lucide-react';
import {profileSchema, TrainingConflict, type Profile, type Equipment, type Muscle} from '@/lib/training/schema';
import {buildPlan} from '@/lib/training/engine';
import {chooseSplit} from '@/lib/training/splits';
import {equipment, goals, experiences, muscles, splits, errorHelp, readableText} from '@/lib/ui/plan-data';
const initial:Profile={goal:'hypertrophy',experience:'beginner',days:3,minutes:45,environment:'dumbbells',availableEquipment:['dumbbells'],split:'auto',priorityMuscles:[],excludedExerciseIds:[],budget:0,notes:''};
export default function ProfileForm({busy,onSubmit}:{busy:boolean;onSubmit:(p:Profile)=>void}){
 const [p,setP]=useState(initial),[adult,setAdult]=useState(false),[error,setError]=useState('');
 const set=<K extends keyof Profile>(key:K,value:Profile[K])=>setP(old=>({...old,[key]:value}));
 function submit(e:React.FormEvent){e.preventDefault();setError('');const parsed=profileSchema.safeParse(p);if(!parsed.success){setError('请检查预算、训练时间和补充说明，填写有效的训练条件。');return;}if(!adult){setError('请先确认成年及一般健身使用范围。');return;}try{buildPlan(parsed.data);onSubmit(parsed.data);}catch(e){setError(e instanceof TrainingConflict?readableText(e.message)+' '+errorHelp(e.code):'这些条件暂时无法编排，请核对器械和时间。');}}
 return <form onSubmit={submit} className="profile-form"><fieldset disabled={busy}><legend className="sr-only">训练条件</legend>
 <div className="form-grid"><label className="field">训练目标<select aria-label="训练目标" value={p.goal} onChange={e=>set('goal',e.target.value as Profile['goal'])}>{Object.entries(goals).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
 <label className="field">训练经验<select aria-label="训练经验" value={p.experience} onChange={e=>set('experience',e.target.value as Profile['experience'])}>{Object.entries(experiences).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label className="field">每周训练天数<select aria-label="每周训练天数" value={p.days} onChange={e=>set('days',Number(e.target.value))}>{[2,3,4,5,6].map(v=><option key={v} value={v}>{v} 天</option>)}</select></label>
 <label className="field">单次训练时间<select aria-label="单次训练时间" value={p.minutes} onChange={e=>set('minutes',Number(e.target.value) as Profile['minutes'])}>{[30,45,60,75,90].map(v=><option key={v} value={v}>{v} 分钟</option>)}</select></label></div>
 <label className="field">训练场所<select aria-label="训练场所" value={p.environment} onChange={e=>{const v=e.target.value as Profile['environment'];setP(old=>({...old,environment:v,availableEquipment:v==='dumbbells'?['dumbbells']:[]}));}}><option value="gym">健身房</option><option value="dumbbells">哑铃训练</option><option value="bodyweight">徒手 / 居家</option></select></label>
 <fieldset className="inventory"><legend>实际可用器械</legend><p className="hint">只选现场确实有的器械；健身房也可以使用哑铃。徒手动作自动纳入候选。</p><div className="check-grid">{Object.entries(equipment).map(([v,l])=><label className="check-option" key={v}><input type="checkbox" checked={p.availableEquipment.includes(v as Equipment)} onChange={e=>set('availableEquipment',e.target.checked?[...p.availableEquipment,v as Equipment]:p.availableEquipment.filter(x=>x!==v))}/>{l}</label>)}</div></fieldset>
 <details className="advanced"><summary><SlidersHorizontal size={18} aria-hidden="true"/>更多训练偏好<ChevronDown size={18} aria-hidden="true"/></summary><div className="details-body">
 <label className="field">分化偏好<select aria-label="分化偏好" value={p.split} onChange={e=>set('split',e.target.value as Profile['split'])}>{Object.entries(splits).map(([v,l])=>{let available=true;try{chooseSplit({...p,split:v as Profile['split']});}catch{available=false;}return <option value={v} key={v} disabled={!available}>{l}{!available?'（与当前天数不符）':''}</option>;})}</select></label>
 <fieldset className="inventory"><legend>优先训练肌群（最多 2 项）</legend><div className="check-grid">{Object.entries(muscles).map(([v,l])=><label className="check-option" key={v}><input type="checkbox" checked={p.priorityMuscles.includes(v as Muscle)} disabled={!p.priorityMuscles.includes(v as Muscle)&&p.priorityMuscles.length>=2} onChange={e=>set('priorityMuscles',e.target.checked?[...p.priorityMuscles,v as Muscle]:p.priorityMuscles.filter(x=>x!==v))}/>{l}</label>)}</div></fieldset>
 <label className="field">每月额外预算（元）<input type="number" min="0" max="100000" step="1" value={p.budget} onChange={e=>set('budget',e.target.value===''?0:Number(e.target.value))}/><span className="hint">0 元也可使用；预算不是必须花完的额度。</span></label>
 <label className="field">训练限制与补充说明（可选）<textarea aria-label="训练限制与补充说明（可选）" rows={3} maxLength={500} value={p.notes} onChange={e=>set('notes',e.target.value)} aria-describedby="limitations-help"/></label><p className="hint" id="limitations-help">当前版本不能评估自由文本限制。填写后会暂停编排并提示进一步评估；不要为生成计划隐去真实疼痛或伤病。请勿填写姓名、联系方式和详细病史。</p>
 </div></details>
 <label className="adult"><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)}/>我已年满18岁，了解此服务提供一般健身信息，不用于医疗或康复，同意将条件发送至模型服务商处理。</label>
 {error&&<p role="alert" className="error">{error}</p>}<button className="primary full" type="submit">{busy?'正在处理…':'生成训练计划'}<ArrowRight size={19} aria-hidden="true"/></button>
 </fieldset></form>;
}
