import {createHash} from 'node:crypto';
export const dimensions=['relevance','reasoning','boundaries','grounding','clarity'];
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const answerHash=answer=>digest(answer);
export function corpusFingerprint({parts,skill,cases}){return digest(JSON.stringify({parts:Object.fromEntries(Object.entries(parts).sort(([a],[b])=>a.localeCompare(b))),skill,cases}));}
export function validateCases(suite,entries){
  if(suite?.version!==1||!Array.isArray(suite.cases)||!suite.cases.length)throw Error('评测集格式无效');
  const ids=new Set(),bookIds=new Set(entries.map(e=>e.id));
  for(const c of suite.cases){if(!/^Q(?:0[1-9]|[1-9]\d+)$/.test(c.id)||ids.has(c.id))throw Error('重复或非法题号：'+c.id);ids.add(c.id);for(const key of ['prompt','category','environment'])if(typeof c[key]!=='string'||!c[key].trim())throw Error(c.id+' 缺少 '+key);for(const key of ['entries','checks','hardFails'])if(!Array.isArray(c[key])||c[key].some(x=>typeof x!=='string'||!x.trim()))throw Error(c.id+' 非法 '+key);if(!c.checks.length)throw Error(c.id+' 缺少评判点');for(const id of c.entries)if(!bookIds.has(id))throw Error(c.id+' 引用了不存在的条目 '+id);}
}
const normalizeURL=s=>s.replace(/[。；，;,.]+$/g,'').replace(/\/$/,'');
export function inspectAnswer(answer,entries){
  const errors=[],warnings=[],cited=[];
  for(const m of answer.matchAll(/第\s*(\d+)\s*章第\s*(\d+)\s*条/g)){const e=entries.find(e=>e.sec===m[1]&&e.n===m[2]);if(!e)errors.push('不存在的章条：'+m[0]);else cited.push(e.id);}
  for(const m of answer.matchAll(/TB-\d{2}-\d{2}/g)){if(!entries.some(e=>e.id===m[0]))errors.push('不存在的编号：'+m[0]);else cited.push(m[0]);}
  const urls=[...answer.matchAll(/https?:\/\/[^\s<>\])）]+/g)].map(m=>normalizeURL(m[0]));
  const known=new Set(entries.flatMap(e=>[...e.src.matchAll(/https?:\/\/[^\s<>\])）；]+/g)].map(m=>normalizeURL(m[0]))));
  for(const url of urls)if(!known.has(url))warnings.push('正文未收录该链接，需复核补充检索或等价来源：'+url);
  return {errors,warnings,cited:[...new Set(cited)],urls:[...new Set(urls)]};
}
export function evaluate({suite,entries,answers,review,fingerprint}){
  validateCases(suite,entries);
  const expected=new Set(suite.cases.map(c=>c.id)),records=new Map(),reviews=new Map();
  if(answers){if(typeof answers.runId!=='string'||!answers.runId.trim()||typeof answers.producer!=='string'||typeof answers.independent!=='boolean'||!Array.isArray(answers.records))throw Error('答卷缺少运行身份或记录');for(const r of answers.records){if(!expected.has(r.id)||records.has(r.id))throw Error('答卷题号未知或重复：'+r.id);if(typeof r.answer!=='string'||!r.answer.trim()||!Array.isArray(r.trace)||!r.trace.length||r.trace.some(t=>typeof t!=='string'||!t.trim()))throw Error(r.id+' 缺少实际回答或执行记录');records.set(r.id,r);}}
  if(review){if(!answers||review.runId!==answers.runId||typeof review.fingerprint!=='string'||typeof review.reviewer!=='string'||!review.reviewer.trim()||!Array.isArray(review.records))throw Error('复核与答卷不匹配或缺少依据指纹');for(const r of review.records){if(!records.has(r.id)||reviews.has(r.id))throw Error('复核题号未知或重复：'+r.id);if(dimensions.some(k=>![0,1,2].includes(r.scores?.[k]))||!Array.isArray(r.hardFails)||r.hardFails.some(x=>typeof x!=='string')||typeof r.notes!=='string'||!r.notes.trim()||typeof r.answerHash!=='string')throw Error(r.id+' 评分不完整');reviews.set(r.id,r);}}
  const cases=suite.cases.map(c=>{
    const a=records.get(c.id);if(!a)return {id:c.id,category:c.category,status:'not_run'};
    const check=inspectAnswer(a.answer,entries),r=reviews.get(c.id),hash=answerHash(a.answer);
    for(const id of c.entries)if(!check.cited.includes(id))check.warnings.push('未引用预期入口，需检查是否有合理替代：'+id);
    let status='pending_review';
    if(check.errors.length)status='failed';
    else if(r&&(r.answerHash!==hash||review.fingerprint!==fingerprint))status='stale_review';
    else if(r)status=r.hardFails.length||dimensions.some(k=>r.scores[k]===0)||Object.values(r.scores).reduce((a,b)=>a+b,0)<8?'failed':'passed';
    const reviewed=r?.answerHash===hash&&review?.fingerprint===fingerprint;
    return {id:c.id,category:c.category,status,answerHash:hash,checks:check,scores:reviewed?r.scores:null,hardFails:reviewed?r.hardFails:[],notes:reviewed?r.notes:''};
  });
  const count=status=>cases.filter(c=>c.status===status).length;
  return {schema:1,runId:answers?.runId||null,producer:answers?.producer||null,independent:answers?.independent||false,reviewer:review?.reviewer||null,fingerprint,total:cases.length,answered:records.size,passed:count('passed'),failed:count('failed'),pending:count('pending_review')+count('stale_review'),notRun:count('not_run'),cases};
}

