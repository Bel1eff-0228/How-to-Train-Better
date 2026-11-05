import {useState} from 'react';
import {ArrowRight, Plus} from 'lucide-react';
export default function RevisionPanel({busy,onRevise}:{busy:boolean;onRevise:(s:string)=>void}){
 const [text,setText]=useState('');
 return <section className="revision"><span className="eyebrow">ADAPT YOUR PLAN</span><h2>计划，跟着生活调整。</h2><p className="muted">以当前完整计划为基础，只改你提出的条件。明确指定过分化时，改变天数也需说明新的分化选择。</p><div className="chips">{['每周2天，改为自动分化','只有哑铃','重点改为背部'].map(s=><button type="button" disabled={busy} key={s} onClick={()=>setText(s)}>{s}<Plus size={16} aria-hidden="true"/></button>)}</div><form onSubmit={e=>{e.preventDefault();if(text.trim())onRevise(text.trim());}}><label className="field">调整要求<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={200} required rows={3} placeholder="例如：每周2天，改为自动分化" disabled={busy}/></label><p className="hint">最多200字。不支持的要求会明确提示，不会悄悄忽略。</p><button className="primary" disabled={busy||!text.trim()}>{busy?'正在处理…':'调整我的计划'}<ArrowRight size={18} aria-hidden="true"/></button></form></section>;
}
