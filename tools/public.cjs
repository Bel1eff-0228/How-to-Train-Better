/* Reader utilities and citation export. MIT. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TrainPublic=api;})(globalThis,function(){
  const attribution='栗子豪 · 高性价比健身指南（How to Train Better）';
  function sources(entries){const result=new Map();for(const e of entries)for(const match of e.src.matchAll(/\[(S\d+)\]\s*([\s\S]*?)(?=\[S\d+\]|$)/g)){const id=match[1],text=match[2].trim().replace(/[；\s]+$/,'');if(!result.has(id))result.set(id,{id,text,entries:[]});const source=result.get(id);if(!source.entries.includes(e.id))source.entries.push(e.id);}return [...result.values()].sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));}
  function citation(e,version){return `${attribution} · ${version}\n第 ${e.sec} 章第 ${e.n} 条（${e.title}） · ${e.id}\n\n${e.human}\n\n${[["条目类型",e.kind],["适用人群",e.population],["何时求助",e.help],["怎么做",e.how],["举例",e.example],["何时调整",e.adjust],["暂时不要",e.avoid]].filter(([,v])=>v).map(([k,v])=>k+"："+v).join("\n")}\n\n原理：${e.why}\n${e.recommendation?`补剂推荐：${e.recommendation}（不等于证据等级）\n`:""}${e.population?`适用人群：${e.population}\n`:""}性价比：${e.value}\n证据：${e.evidence}\n适用限制：${e.note}\n来源：${e.src}\n来源核验：${e.verified}\n\n节选分享，保留核心结论、证据与限制。原创正文 CC BY-NC 4.0，非商业使用请保留署名及许可链接，另有修改请标明：https://creativecommons.org/licenses/by-nc/4.0/`;} 
  function feedback(e,version){return `指南版本：${version}\n条目：${e.id} 第 ${e.sec} 章第 ${e.n} 条 ${e.title}\n问题类型（内容／来源／页面使用）：\n哪里有疑问：\n希望如何修改：\n可核查来源（如有）：\n`;}
  return {sources,citation,feedback,attribution};
});
