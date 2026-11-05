import {CalendarDays, Target, Clock3} from 'lucide-react';
import type {DisplayPlan} from '@/lib/ui/plan-data';
import {goals,experiences,splits,muscles,readableText} from '@/lib/ui/plan-data';
import DayCard from './DayCard';
import VolumeOverview from './VolumeOverview';
function TextList({title,items}:{title:string;items:string[]}){return items.length?<section className="guidance"><h3>{title}</h3><ul>{items.map((s,i)=><li key={i}>{readableText(s)}</li>)}</ul></section>:null;}
export default function PlanView({data,previous=false}:{data:DisplayPlan;previous?:boolean}){
 if(data.kind==='legacy'){const p=data.plan;return <section className="plan-view"><span className="eyebrow">V2.0 兼容视图</span><h2>{previous?'修改前的计划':'你的每周日程'}</h2><p className="notice">旧版数据没有可靠的热身组、RIR与肌群统计，保留原内容，不补造这些指标。{p.mode==='demo'?'此计划为开发演示数据，不是真实AI结果。':''}</p>{p.days.map((d,i)=><details className="legacy-day" open key={i}><summary>{d.label} · {d.focus}</summary><p>原记录时长：{d.minutes} 分钟</p>{d.exercises.map((e,j)=><article key={j}><h3>{e.name}</h3><p>{e.sets} 组 · {e.reps} · 休息 {e.rest}</p><p>替代建议：{e.alternative}</p></article>)}</details>)}<TextList title="原计划依据" items={p.reasons}/></section>;}
 const p=data.plan;
 return <section className="plan-view"><div className="section-heading"><div><span className="eyebrow">YOUR TRAINING WEEK · V{p.version}</span><h2>{previous?'修改前的计划':'你的训练周计划'}</h2></div><span className="badge">规则校验 · AI 解释</span></div>
 <div className="plan-overview"><div className="plan-split"><Target size={22} aria-hidden="true"/><strong>{splits[p.split]}</strong><span>{goals[p.profile.goal]} · {experiences[p.profile.experience]}</span></div><dl className="plan-stats"><div><dt><CalendarDays size={16} aria-hidden="true"/>每周安排</dt><dd>{p.days.length}<small> 天</small></dd></div><div><dt><Clock3 size={16} aria-hidden="true"/>单次预计</dt><dd>{Math.min(...p.days.map(d=>d.estimatedMinutes))}–{Math.max(...p.days.map(d=>d.estimatedMinutes))}<small> 分钟</small></dd></div><div><dt>全周正式组</dt><dd>{p.totalWorkSets}<small> 组</small></dd></div></dl><p>重点肌群：{p.profile.priorityMuscles.map(m=>muscles[m]).join('、')||'均衡发展'} · 单次上限 {p.profile.minutes} 分钟</p></div>
 <TextList title="为什么这样安排" items={p.reasons}/>{p.warnings.length>0&&<div className="notice"><TextList title="开始前请留意" items={p.warnings}/></div>}
 <h3 className="day-section-title">每日训练 <span className="hint">点击训练日展开动作</span></h3>{p.days.map((_,i)=><DayCard key={p.version+'-'+i} plan={p} index={i}/>)}
 <VolumeOverview plan={p}/>
 <div className="strategy-grid"><TextList title="活动安排" items={p.activityGuidance}/><TextList title="恢复策略" items={p.recoveryGuidance}/><TextList title="饮食与预算" items={p.nutritionGuidance}/><TextList title="渐进超负荷" items={[p.progression]}/></div>
 <TextList title="本次调整原因" items={p.changes}/><TextList title="AI 与知识依据" items={data.explanations}/>
 <details className="sources"><summary>查看知识来源与适用边界</summary><p className="hint">规则计算不代表个人最优处方；知识来源可追溯，但不替代专业评估。</p>{data.sources.map(s=><article key={s.id}><strong>{s.title}</strong><p className="hint">{s.path}</p><p>{s.source}</p>{s.flags.length>0&&<p className="hint">{s.flags.join('；')}</p>}</article>)}<ul>{p.sourcePaths.map(s=><li key={s}>{s}</li>)}</ul></details>
 </section>;
}
