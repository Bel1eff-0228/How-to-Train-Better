'use client';
import {useRef,useState} from 'react';
import {ArrowRight, ArrowUpRight, CalendarDays, CircleAlert, LoaderCircle, RotateCcw, ShieldCheck, SlidersHorizontal, Dumbbell} from 'lucide-react';
import ProfileForm from './ProfileForm';
import PlanView from './PlanView';
import RevisionPanel from './RevisionPanel';
import type {Profile} from '@/lib/training/schema';
import {decodePlan, type DisplayPlan, PlanRequestError, errorHelp, planDifferences, operationMessage, readableText} from '@/lib/ui/plan-data';
import Logo from './Logo';
async function api(path:string,body:unknown):Promise<DisplayPlan>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{const r=await fetch('/api/plan/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
 let data;try{data=await r.json();}catch{if(controller.signal.aborted)throw new PlanRequestError('CLIENT_TIMEOUT','等待计划响应超时。');throw new PlanRequestError(r.status===503?'SERVICE_UNAVAILABLE':'INVALID_RESPONSE','服务暂时没有返回可读取的计划。');}
 if(!r.ok)throw new PlanRequestError(data.code||'SERVICE_UNAVAILABLE',data.error||'服务暂不可用',Array.isArray(data.options)?data.options.filter((x:unknown)=>typeof x==='string').slice(0,8):[]);
 try{return decodePlan(data);}catch{throw new PlanRequestError('INVALID_RESPONSE','返回的计划未通过数据格式校验，未替换当前计划。');}
 }catch(e){if(controller.signal.aborted)throw new PlanRequestError('CLIENT_TIMEOUT','等待计划响应超时，请稍后重试。');throw e;}finally{clearTimeout(timer);}
}
export default function Planner(){
 const [plan,setPlan]=useState<DisplayPlan|null>(null),[history,setHistory]=useState<DisplayPlan[]>([]),[previous,setPrevious]=useState<DisplayPlan|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState<PlanRequestError|null>(null),[operation,setOperation]=useState<'create'|'revise'>('create');
 const retry=useRef<{action:()=>Promise<DisplayPlan>;operation:'create'|'revise'}|null>(null),results=useRef<HTMLElement>(null),lock=useRef(false);
 async function run(action:()=>Promise<DisplayPlan>,op:'create'|'revise'){
 if(lock.current)return;lock.current=true;retry.current={action,operation:op};setOperation(op);setBusy(true);setError(null);requestAnimationFrame(()=>results.current?.scrollIntoView({block:'start',behavior:'instant'}));
 try{const next=await action();if(plan)setHistory(h=>[plan,...h].slice(0,5));setPrevious(op==='revise'?plan:null);setPlan(next);requestAnimationFrame(()=>results.current?.focus({preventScroll:true}));}
 catch(e){setError(e instanceof PlanRequestError?e:new PlanRequestError('NETWORK_ERROR','连接中断或服务不可用，请检查网络后重试。'));}
 finally{lock.current=false;setBusy(false);}
 }
 return <><a className="skip" href="#main">跳到主要内容</a><header className="nav"><a className="brand" href="#" aria-label="TrainBetter AI 首页"><Logo/>TrainBetter <b>AI</b></a><a href="#setup" className="nav-cta">制定计划<ArrowUpRight size={18} aria-hidden="true"/></a></header>
 <main id="main"><section className="hero"><div><span className="eyebrow">TRAIN SMART. LIVE BETTER.</span><h1>让科学健身，<br/><em>不再昂贵和复杂。</em></h1><p className="hero-description">从你的时间、器械和目标出发，<br/>安排一周训练，也为生活的变化留出空间。</p><a className="primary" href="#setup">开始制定计划<ArrowRight size={20} aria-hidden="true"/></a><p className="hero-foot">免费体验 · 无需注册 · 当前为受控测试版</p></div>
 <aside className="hero-card"><Dumbbell size={32} strokeWidth={1.5} aria-hidden="true"/><h2>不是一份通用模板。<br/>是有依据的训练安排。</h2><ul><li><CalendarDays size={20} aria-hidden="true"/><span><strong>一周结构，清楚可见</strong><small>分化、动作、组次与休息集中查看</small></span></li><li><SlidersHorizontal size={20} aria-hidden="true"/><span><strong>条件变化，完整重排</strong><small>保留旧计划，逐项比较实际变化</small></span></li><li><ShieldCheck size={20} aria-hidden="true"/><span><strong>约束先行，来源可查</strong><small>规则编排与校验，AI理解和解释</small></span></li></ul><a className="text-link" href="https://bel1eff-0228.github.io/How-to-Train-Better/">阅读健身指南<ArrowUpRight size={17} aria-hidden="true"/></a></aside></section>
 <div className="notice intro-note"><ShieldCheck size={20} aria-hidden="true"/><p><strong>一般健身信息，仅面向成年人。</strong>不用于医疗诊断、伤病康复或个人最优处方。出现疼痛或身体不适时，先停止相关训练并寻求专业评估。</p></div>
 <section className="workspace" id="setup"><aside className="form-panel panel"><span className="eyebrow">01 / YOUR CONDITIONS</span><h2>从实际条件开始。</h2><p className="muted">核心条件在前，更多偏好按需展开。</p><ProfileForm busy={busy} onSubmit={(profile:Profile)=>void run(()=>api('create',{apiVersion:'2.1',profile,adultConfirmed:true}),'create')}/></aside>
 <section className="result-panel panel" ref={results} tabIndex={-1} aria-label="计划结果" aria-busy={busy}><div aria-live="polite">{busy&&<div className="loading" role="status"><LoaderCircle className="spinner" size={22} aria-hidden="true"/><div><strong>{operation==='revise'?'正在修改完整计划…':'正在生成你的训练计划…'}</strong><p>正在理解条件、查阅知识并校验结果。{plan?'下方保留当前计划。':'请稍候，最多等待90秒。'}</p></div></div>}</div>
 {error&&<div className="error" role="alert"><CircleAlert size={22} aria-hidden="true"/><div><strong>{operation==='create'?'这次没有生成计划':'这次没有修改计划'}</strong><p>{readableText(operationMessage(error.message,operation))}</p><p>{errorHelp(error.code)}</p>{error.options.length>0&&<ul>{error.options.map((s,i)=><li key={i}>{s}</li>)}</ul>}<button className="secondary" disabled={busy} onClick={()=>retry.current&&void run(retry.current.action,retry.current.operation)}><RotateCcw size={16} aria-hidden="true"/>重试</button></div></div>}
 {plan?<>{previous&&<section className="comparison"><span className="eyebrow">WHAT CHANGED</span><h2>本次计划变化</h2><ul>{planDifferences(previous,plan).map((s,i)=><li key={i}>{s}</li>)}</ul><p className="hint">旧计划保留在下方历史中；这些变化由前后两份完整计划直接比较。</p></section>}<PlanView data={plan}/>{plan.token?<RevisionPanel busy={busy} onRevise={message=>void run(()=>api('revise',{token:plan.token,message,apiVersion:'2.1'}),'revise')}/>:<p className="notice">此计划没有有效修改凭据，请重新生成后再调整。</p>}
 {history.length>0&&<details className="history"><summary>查看修改前与历史计划（{history.length}）</summary>{history.map((old,i)=><details key={i}><summary>历史 V{old.plan.version} · 每周 {old.plan.profile.days} 天</summary><PlanView data={old} previous/></details>)}</details>}</>:<div className="empty"><CalendarDays size={48} strokeWidth={1.2} aria-hidden="true"/><span className="eyebrow">02 / YOUR TRAINING WEEK</span><h2>你的训练周，<br/>从这里展开。</h2><p>填写条件后，查看每日动作、训练量<br/>与安排依据。这里不会展示虚构结果。</p></div>}
 <p className="session-note">计划仅保留在本次页面会话中，刷新会清空。请勿在生成或修改期间关闭页面。</p></section></section>
 <footer><a href="/privacy">隐私与使用说明<ArrowUpRight size={16} aria-hidden="true"/></a><p className="brand">TrainBetter AI</p><p>基于《高性价比健身指南》探索开发 · 栗子豪</p><p>训练条件将发送至服务端及配置的模型服务商。请勿填写个人身份信息。本应用不记录原始问答日志。</p></footer></main></>;
}
