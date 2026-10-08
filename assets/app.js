/* How to Train Better. Layout and reading flow adapted from HowToLiveBetter (MIT). */
(() => {
  'use strict';
  const core=window.TrainGuide,$=id=>document.getElementById(id);
  const labels={lens:'想改善什么',grade:'证据等级',ratio:'性价比 · 编辑判断',money:'花钱',time:'花时间',will:'坚持难度'};
  const names={money:{'0':'不花钱','少':'少','多':'多'},time:{'少':'少','中':'中','多':'多'},will:{'否':'低','些':'中','是':'高'}};
  const state={q:'',dispute:false,sort:'chapter',route:'',view:'all',...Object.fromEntries(core.dims.map(d=>[d,new Set()]))};
  let sections=[],entries=[],nodes=new Map(),blocks=[],reading,readerTools;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function syncTheme(){const dark=document.documentElement.classList.contains('dark');$('theme').textContent=dark?'浅色':'深色';$('theme').setAttribute('aria-pressed',String(dark));}
  syncTheme();
  $('theme').onclick=()=>{document.documentElement.classList.toggle('dark');syncTheme();try{localStorage.setItem('htb-theme',document.documentElement.classList.contains('dark')?'dark':'light')}catch{}};
  const narrow=matchMedia('(max-width:960px)');
  function menu(open){$('sidebar').classList.toggle('open',open);$('backdrop').classList.toggle('open',open);$('menu').setAttribute('aria-expanded',String(open));$('sidebar').inert=narrow.matches&&!open;$('sidebar').setAttribute('aria-hidden',String(narrow.matches&&!open));}
  narrow.addEventListener('change',()=>menu(false));menu(false);
  $('menu').onclick=()=>menu(!$('sidebar').classList.contains('open'));$('backdrop').onclick=()=>menu(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu(false);$('menu').focus();}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('q').focus();}});
  function textInto(parent,text){
    const re=/https?:\/\/[^\s；]+|第\s*(\d+)\s*章第\s*(\d+)\s*条|\[(S\d+)\]/g;let pos=0,m;
    while((m=re.exec(text))){parent.append(document.createTextNode(text.slice(pos,m.index)));const a=el('a',m[1]?'xref':'',m[0]);
      if(m[1]||m[3]){a.href=m[3]?`#source-${m[3]}`:`#e-${m[1]}-${m[2]}`;a.onclick=e=>{e.preventDefault();go(a.hash);};}
      else{a.href=m[0];a.target='_blank';a.rel='noopener noreferrer';}
      parent.append(a);pos=re.lastIndex;
    }parent.append(document.createTextNode(text.slice(pos)));
  }
  function row(rows,key,value){rows.append(el('div','k',key));const v=el('div','v'+(key==='备注'?' note':''));textInto(v,value);rows.append(v);}
  function card(e){
    const article=el('article','card');article.id=`e-${e.sec}-${e.n}`;article.dataset.id=e.id;
    const h=el('div','card-h');h.append(el('span','idx',e.n+'.'),el('h3','',e.title));const anchor=el('a','anchor','#');anchor.href='#'+article.id;anchor.setAttribute('aria-label',`跳到第${e.sec}章第${e.n}条`);anchor.onclick=ev=>{ev.preventDefault();go(anchor.hash)};h.append(anchor);article.append(h);
    const badges=el('div','badges');for(const [cls,t] of [[e.grade,e.grade+' 级'],['r'+({'极高':3,'高':2,'一般':1,'待定':1}[e.ratio]),'性价比 '+e.ratio],['tip',e.lens],['plain',names.money[e.money]==='不花钱'?'不花钱':'花钱：'+names.money[e.money]],['plain','时间：'+e.time]]) badges.append(el('span','badge '+cls,t));if(e.dispute)badges.append(el('span','badge warn','有争议'));article.append(badges);
    const human=el('p','human');textInto(human,e.human);article.append(human);
    const rows=el('div','rows practical');for(const [k,v] of [['适用人群',e.population],['何时求助',e.help],['现在怎么做',e.how],['举个例子',e.example],['何时调整',e.adjust],['暂时不要',e.avoid]])if(v)row(rows,k,v);article.append(rows);
    const evidence=el('details','evidence-details');evidence.append(el('summary','','为什么这样建议 · 成本与证据'));const reasoning=el('div','rows');for(const [k,v] of [['补剂推荐',e.recommendation],['可能诱因',e.triggers],['原理',e.why],['成本',e.cost],['收益',e.gain],['证据',e.evidence],['性价比',e.value],['备注',e.note]])if(v)row(reasoning,k,v);evidence.append(reasoning);article.append(evidence);
    const details=el('details','src');details.append(el('summary','',`来源与常见问法 · ${[...e.src.matchAll(/\[S\d+\]/g)].length} 个来源`));const body=el('div','body');textInto(body,e.src);body.append(el('p','source-text','常见问法：'+e.questions));details.append(body);article.append(details,el('div','entry-meta',`${e.id} · 第 ${e.sec} 章第 ${e.n} 条 · 来源核验 ${e.verified}`),reading.cardTools(e),readerTools.cardTools(e));return article;
  }
  function controls(){
    const all=el('button','sec-link all','全部章节');all.dataset.dim='sec';all.dataset.v='';$('chapters').append(all);
    for(const s of sections){const b=el('button','sec-link',s.n+'. '+s.title);b.dataset.dim='sec';b.dataset.v=s.n;$('chapters').append(b);const toc=el('div','toc-sub');toc.dataset.chapter=s.n;toc.hidden=true;for(const e of s.entries){const a=el('a','',e.n+'. '+e.title);a.href=`#e-${e.sec}-${e.n}`;a.onclick=ev=>{ev.preventDefault();go(a.hash)};toc.append(a);}$('chapters').append(toc);}
    for(const [dim,values] of Object.entries(core.allowed)){const g=el('div','group');g.append(el('div','gt',labels[dim]));const chips=el('div','chips');for(const v of values){const b=el('button','chip',names[dim]?.[v]||v);b.dataset.dim=dim;b.dataset.v=v;chips.append(b);}g.append(chips);$('filters').append(g);}
    $('sidebar').addEventListener('click',ev=>{const b=ev.target.closest('button[data-dim]');if(!b)return;const {dim,v}=b.dataset;if(dim==='sec'){state.sec.clear();if(v)state.sec.add(v);menu(false);}else{state[dim].has(v)?state[dim].delete(v):state[dim].add(v);}update();});
  }
  function readState(){const p=new URLSearchParams(location.search);state.q=p.get('q')||'';for(const d of core.dims)state[d]=new Set((p.get(d)||'').split(',').filter(v=>d==='sec'?sections.some(s=>s.n===v):core.allowed[d].includes(v)));state.dispute=p.get('dispute')==='1';state.sort=p.get('sort')==='value'?'value':'chapter';state.route=window.TrainReading.routes.some(r=>r.id===p.get('route'))?p.get('route'):'';state.view=['saved','read','unread'].includes(p.get('view'))?p.get('view'):'all';}
  function url(){const p=new URLSearchParams();if(state.q)p.set('q',state.q);for(const d of core.dims)if(state[d].size)p.set(d,[...state[d]].join(','));if(state.dispute)p.set('dispute','1');if(state.sort!=='chapter')p.set('sort',state.sort);if(state.route)p.set('route',state.route);if(state.view!=='all')p.set('view',state.view);try{history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash)}catch{}}
  function clearFilters(){state.q='';state.dispute=false;state.sort='chapter';state.route='';state.view='all';core.dims.forEach(d=>state[d].clear());}
  function reset(){clearFilters();update();}
  function matches(e){return core.matches(e,state)&&(!reading||reading.matches(e));}
  function update(write=true){
    const active=document.activeElement,activeCard=active?.closest('article.card');
    if(state.lens.size!==1)state.sort='chapter';
    $('q').value=state.q;$('dispute').checked=state.dispute;$('sort').value=state.sort;$('sort').options[1].disabled=state.lens.size!==1;
    document.querySelectorAll('button[data-dim]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v?state[b.dataset.dim].has(b.dataset.v):state.sec.size===0)));
    document.querySelectorAll('.toc-sub').forEach(n=>n.hidden=!state.sec.has(n.dataset.chapter));
    const visible=entries.filter(matches),ids=new Set(visible.map(e=>e.id));
    for(const e of entries)nodes.get(e.id).hidden=!ids.has(e.id);
    $('cnt').textContent=visible.length;$('empty').hidden=visible.length>0;
    if(state.sort==='value'){
      const rank={'极高':0,'高':1,'一般':2,'待定':3},gr={A:0,B:1,C:2};
      visible.sort((a,b)=>rank[a.ratio]-rank[b.ratio]||gr[a.grade]-gr[b.grade]||Number(a.sec)-Number(b.sec)||Number(a.n)-Number(b.n));
      blocks.forEach(b=>b.el.hidden=true);let sorted=$('sorted');if(!sorted){sorted=el('section','sec-block');sorted.id='sorted';$('results').append(sorted);}sorted.replaceChildren();sorted.hidden=false;
      const h=el('div','sec-h');h.append(el('h2','',`${[...state.lens][0]} · 同目标比较`));sorted.append(h,el('p','intro','先按编辑性价比、再按证据等级排列；条目编号不变，待定排在最后。'));
      visible.forEach(e=>sorted.append(nodes.get(e.id)));
    }else{
      if($('sorted'))$('sorted').hidden=true;
      for(const b of blocks){b.s.entries.forEach(e=>b.el.append(nodes.get(e.id)));const count=b.s.entries.filter(e=>ids.has(e.id)).length;b.el.hidden=!count;b.count.textContent=count+' 条';}
    }
    reading?.sync();if(write)url();
    if(activeCard){if(activeCard.offsetHeight)active.focus({preventScroll:true});else{$('toolbar').tabIndex=-1;$('toolbar').focus({preventScroll:true});}}
  }
  function go(hash,push=true){const node=document.getElementById(hash.slice(1));if(!node)return;for(let p=node;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;const e=entries.find(e=>nodes.get(e.id)===node);if((e&&!matches(e))||!node.offsetHeight)reset();menu(false);if(push){try{history.pushState(null,'',hash)}catch{location.hash=hash}}node.scrollIntoView({block:'start'});node.tabIndex=-1;node.focus({preventScroll:true});if(e)reading?.setLast(e.id);}
  $('q').addEventListener('input',()=>{state.q=$('q').value;update();});$('dispute').onchange=()=>{state.dispute=$('dispute').checked;update()};$('sort').onchange=()=>{state.sort=$('sort').value;update()};$('reset').onclick=reset;$('reset-empty').onclick=reset;
  addEventListener('popstate',()=>{readState();update(false);if(location.hash)go(location.hash,false)});addEventListener('hashchange',()=>{if(location.hash)go(location.hash,false)});
  async function read(p){const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`${p} (${r.status})`);return r.text();}
  async function showLicenses(embedded){
    try{
      const licenses=embedded?embedded.licenses:Object.fromEntries(await Promise.all([['notice','licenses/NOTICE.txt'],['content','LICENSE'],['code','LICENSE-CODE']].map(async([key,file])=>[key,await read(file)])));
      for(const key of ['notice','content','code']){if(!licenses?.[key])throw new Error('缺失许可');$('license-'+key).textContent=licenses[key];}
      $('license-status').textContent='许可范围与完整协议已随本页载入，可在此查看。';
    }catch{$('license-status').textContent='完整许可读取失败。请在完整项目中查看 licenses/NOTICE.txt、LICENSE 与 LICENSE-CODE；不能仅凭摘要认定整包授权。';}
  }
  async function init(){
    const embedded=window.__CORPUS__,readme=embedded?embedded.readme:await read('README.md'),files=core.filesFromReadme(readme);
    if(!files.length)throw new Error('目录里没有章节');
    const parts=embedded?embedded.parts:Object.fromEntries(await Promise.all(files.map(async f=>[f,await read(f)])));
    sections=files.map(f=>core.parseChapter(parts[f],f));
    const errors=core.validate(sections);if(errors.length)throw new Error(errors[0]);entries=sections.flatMap(s=>s.entries);
    const readingErrors=window.TrainReading.validate(entries);if(readingErrors.length)throw new Error(readingErrors[0]);
    reading=window.mountReading({entries,el,textInto,go,getState:()=>state,refresh:()=>update(),selectRoute:id=>{clearFilters();state.route=id;update();},selectView:view=>{clearFilters();state.view=view;update();}});
    readerTools=window.mountReaderTools({sections,entries,version:readme.match(/How to Train Better · (v[\d.]+)/)?.[1]||'当前版本',el,textInto,go});
    $('tot').textContent=entries.length;$('stats').replaceChildren();
    for(const t of [`${sections.length} 章 · ${entries.length} 条`,...['A','B','C'].map(g=>g+' 级 '+entries.filter(e=>e.grade===g).length),'来源 '+new Set(entries.flatMap(e=>[...e.src.matchAll(/\[S\d+\]/g)].map(m=>m[0]))).size])$('stats').append(el('span','',t));
    const date=entries.map(e=>e.verified).sort().at(-1);$('version-note').textContent=`最近来源核验：${date}。各条目的具体日期见正文；当前副本不会自动更新，获取新版后可导入原有阅读备份。`;
    if(embedded){$('entry-links').replaceChildren(el('span','',`阅读版 · ${date} · 外部文献链接需联网`));if(location.protocol!=='file:'){const a=el('a','','下载离线版');a.href='HowToTrainBetter.html';a.download='HowToTrainBetter.html';$('entry-links').append(document.createTextNode(' · '),a);}}
    await showLicenses(embedded);
    controls();
    for(const s of sections){const block=el('section','sec-block');block.id='sec-'+s.n;const h=el('div','sec-h');h.append(el('h2','',s.n+'. '+s.title));const count=el('span','shown');h.append(count);block.append(h);s.intro.forEach(t=>block.append(el('p','intro',t)));for(const e of s.entries){const c=card(e);nodes.set(e.id,c);block.append(c);}$('results').append(block);blocks.push({el:block,s,count});}
    readState();update(false);$('reading-hub').hidden=false;$('status').hidden=true;document.body.dataset.ready='true';reading.observe();if(location.hash)go(location.hash,false);
  }
  init().catch(error=>{$('status').textContent=`读取正文失败：${error.message}。直接双击使用请打开 dist 文件夹内的 HowToTrainBetter.html；维护预览请启动本地页面。`;$('stats').replaceChildren(el('span','','正文未加载'));document.body.dataset.ready='error';});
})();
