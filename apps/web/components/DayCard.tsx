import {ChevronDown, Clock3, Dumbbell} from 'lucide-react';
import {exerciseById} from '@/lib/training/exercises';
import type {Plan} from '@/lib/training/schema';
import {muscles,equipment,dayTitle} from '@/lib/ui/plan-data';
export default function DayCard({plan,index}:{plan:Plan;index:number}){
 const day=plan.days[index];
 return <details className="day-card" open={index===0}><summary><span className="day-number">DAY {String(index+1).padStart(2,'0')}</span><span className="day-heading"><strong>{day.label} · {dayTitle(plan,index)}</strong><span>{day.variant} 变式 · {day.exercises.length} 个动作</span></span><span className="day-time"><Clock3 size={16} aria-hidden="true"/>{day.estimatedMinutes} 分钟</span><ChevronDown className="chevron" size={20} aria-hidden="true"/></summary>
 <div className="day-body"><p className="hint">先进行 {day.generalWarmupSeconds/60} 分钟一般热身。预计时间已包含动作热身、组间休息、单侧动作及器械转换。</p>
 <ol className="exercise-list">{day.exercises.map((p,i)=>{const e=exerciseById.get(p.exerciseId);if(!e)return <li key={p.exerciseId}>动作数据暂不可用，请重新生成。</li>;return <li key={p.exerciseId} className="exercise-card"><div className="exercise-heading"><span className="exercise-index">{String(i+1).padStart(2,'0')}</span><div><span className="exercise-kind">{e.pattern==='isolation'?'孤立动作':e.pattern==='core'?'辅助 · 核心':'复合动作'}</span><h4>{e.name}</h4><p className="hint">{e.primary.map(m=>muscles[m]).join('、')}{e.secondary.length?' · 间接参与：'+e.secondary.map(m=>muscles[m]).join('、'):''}</p></div></div>
 <dl className="prescription"><div><dt>正式组</dt><dd>{p.workSets} 组 × {p.reps.min}–{p.reps.max} 次</dd></div><div><dt>保留次数 RIR</dt><dd>{p.rir} 次</dd></div><div><dt>组间休息</dt><dd>{p.restSeconds} 秒</dd></div><div><dt>动作热身</dt><dd>{p.warmupSets?p.warmupSets+' 组 × '+p.warmupReps+' 次':'无额外热身组'}</dd></div></dl>
 <p className="hint"><Dumbbell size={15} aria-hidden="true"/> {e.equipment.map(x=>equipment[x]).join('、')||'徒手'} · {e.laterality==='unilateral'?'单侧动作：次数按每侧计算，双侧完成计一组。':'双侧动作。'} RIR 指一组结束时预计还能完成的次数。{p.warmupSets>0?'热身组选用轻重量，组间休息 '+p.warmupRestSeconds+' 秒。':''} 动作间转换预留 {p.transitionSeconds} 秒。</p>
 {p.alternativeIds.length>0&&<details className="alternatives"><summary>可用替代动作<ChevronDown size={16} aria-hidden="true"/></summary><p>{p.alternativeIds.map(id=>exerciseById.get(id)?.name??id).join('、')}</p><p className="hint">来自当前条件允许的动作库；此处仅展示备选，替换后仍需重新核对训练量与耗时。当前界面不支持单动作一键替换。</p></details>}
 </li>;})}</ol></div></details>;
}
