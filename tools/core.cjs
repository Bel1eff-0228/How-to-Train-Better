/* Markdown parsing adapted from HowToLiveBetter, © 2026 eternity4719 (MIT).
 * Fitness metadata, validation and query semantics © 2026 How to Train Better. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrainGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const dims = ['sec', 'lens', 'grade', 'ratio', 'money', 'time', 'will'];
  const allowed = { lens:['增肌','力量','减脂','心肺健康','运动表现','省钱省时','恢复'], grade:['A','B','C'], ratio:['极高','高','一般','待定'], money:['0','少','多'], time:['少','中','多'], will:['否','些','是'] };
  const fields = { '常见问法':'questions','成本':'cost','说人话':'human','原理':'why','收益':'gain','证据等级':'evidence','性价比':'value','来源':'src','备注':'note','核验日期':'verified' };
  const optionalFields={'条目类型':'kind','补剂名称':'supplement','推荐度':'recommendation','适用人群':'population','怎么做':'how','举例':'example','何时调整':'adjust','何时求助':'help','可能诱因':'triggers','暂时不要':'avoid','避坑':'pitfall'};
  function filesFromReadme(md) { return [...new Set([...md.matchAll(/\]\((book\/[^)#]+\.md)\)/g)].map(m=>m[1]))]; }
  function parseChapter(md, file='') {
    const head = /^# (\d+)\. (.+)$/m.exec(md);
    if (!head) throw new Error('章节标题格式错误：'+file);
    const sec = { n:head[1], title:head[2], file, intro:[], entries:[] };
    let entry;
    for (const line of md.split(/\r?\n/)) {
      let m;
      if ((m=/^### (\d+)\. (.+)$/.exec(line))) { entry={sec:sec.n,n:m[1],title:m[2],file}; sec.entries.push(entry); }
      else if (entry && (m=/^<!-- 成本标签: (.+) -->$/.exec(line))) {
        const names={'编号':'id','钱':'money','时间':'time','毅力':'will','口径':'lens','性价比':'ratio'};
        for (const pair of m[1].split(/\s+/)) { const [k,v]=pair.split('='); if (names[k]) entry[names[k]]=v; }
      } else if (entry && (m=/^- ([^：]+)：(.*)$/.exec(line)) && (fields[m[1]]||optionalFields[m[1]])) entry[fields[m[1]]||optionalFields[m[1]]]=m[2];
      else if (!entry && line && !line.startsWith('#')) sec.intro.push(line);
    }
    for (const e of sec.entries) {
      if(e.sec==='6'&&!e.kind)e.kind='补剂推荐'; // Older corpora remain readable.
      e.grade=e.evidence?.match(/^[ABC]/)?.[0] || '';
      e.dispute=/争议：/.test(e.note || '');
      e.hay=Object.values(e).filter(v=>typeof v==='string').join('\n').normalize('NFKC').toLowerCase();
    }
    return sec;
  }
  function validate(sections) {
    const ids=new Set(), anchors=new Set(), errors=[];
    for (const s of sections) for (const e of s.entries) {
      for (const k of ['id','money','time','will','lens','ratio',...Object.values(fields)]) if (!e[k]) errors.push(`${s.n}-${e.n} 缺少 ${k}`);
      if (!/^TB-\d{2}-\d{2}$/.test(e.id || '')) errors.push('编号格式错误：'+e.id);
      if (e.id !== `TB-${e.sec.padStart(2,'0')}-${e.n.padStart(2,'0')}`) errors.push('编号与章条号不一致：'+e.id);
      if (ids.has(e.id)) errors.push('重复编号：'+e.id); ids.add(e.id);
      if (anchors.has(`${e.sec}-${e.n}`)) errors.push('重复章条号'); anchors.add(`${e.sec}-${e.n}`);
      for (const [k,values] of Object.entries(allowed)) if (!values.includes(e[k])) errors.push(`${e.id} 非法 ${k}: ${e[k]}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.verified || '')) errors.push('日期格式错误：'+e.id);
      if (!e.src?.match(/https:\/\//)) errors.push('来源缺少链接：'+e.id);
      if (!e.value?.startsWith(e.ratio+'｜')) errors.push('性价比标签与正文不一致：'+e.id);
      if(e.sec==='6'){
        if(!e.supplement||!e.population||!['补剂推荐','选购比较'].includes(e.kind))errors.push('补剂类型或适用信息缺失：'+e.id);
        if(e.kind==='补剂推荐'&&!/^[ABC]｜.+/.test(e.recommendation||''))errors.push('补剂推荐缺少条件或评级：'+e.id);
        if(e.kind==='选购比较'&&e.recommendation)errors.push('选购比较不能使用整篇推荐评级：'+e.id);
      }
    }
    for (const s of sections) for (const e of s.entries) for (const m of Object.values(e).filter(v=>typeof v==='string').join('\n').matchAll(/第\s*(\d+)\s*章第\s*(\d+)\s*条/g)) if (!anchors.has(`${m[1]}-${m[2]}`)) errors.push(`${e.id} 无效交叉引用 ${m[0]}`);
    return errors;
  }
  function matches(e,state={}) {
    const terms=(state.q||'').normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.every(t=>e.hay.includes(t))) return false;
    for (const d of dims) { const vals=Array.from(state[d]||[]); if(vals.length && !vals.includes(e[d])) return false; }
    return !state.dispute || e.dispute;
  }
  return { dims, allowed, fields, filesFromReadme, parseChapter, validate, matches };
});
