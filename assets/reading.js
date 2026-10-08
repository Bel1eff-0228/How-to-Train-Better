/* Optional reading tools. All answers are rendered from the current book corpus. */
'use strict';
window.mountReading=function({entries,el,textInto,go,selectRoute,selectView,getState,refresh}){
  const data=window.TrainReading,$=id=>document.getElementById(id),byId=new Map(entries.map(e=>[e.id,e]));
  let library=data.empty(),canSave=true;
  const buttons=new Map(),routeProgress=new Map();
  function announce(text){$('reading-message').textContent=text;}
  function warn(text){$('reading-notice').hidden=false;$('reading-notice').textContent=text;}
  try{
    const raw=localStorage.getItem(data.key);
    if(raw){try{library=data.decode(raw,byId.keys());}catch{warn('原有阅读记录无法读取；本次从空记录开始。你可以导入之前导出的备份。');}}
    localStorage.setItem(data.key+'-probe','1');localStorage.removeItem(data.key+'-probe');
  }catch{canSave=false;warn('浏览器未允许保存记录：本次仍可收藏和标记已读，关闭后可能丢失。请导出阅读备份。');}
  function persist(){try{localStorage.setItem(data.key,JSON.stringify(library));canSave=true;}catch{canSave=false;warn('阅读记录暂时无法保存到浏览器。请在关闭页面前导出阅读备份。');}}
  function openEntry(id){const e=byId.get(id);if(e)go(`#e-${e.sec}-${e.n}`);}
  function linkEntry(id,label){const e=byId.get(id),a=el('a','',label||e.title);a.href=`#e-${e.sec}-${e.n}`;a.onclick=ev=>{ev.preventDefault();openEntry(id);};return a;}
  function setLast(id){if(!byId.has(id)||library.lastId===id)return;library.lastId=id;persist();syncResume();}
  function syncResume(){const e=byId.get(library.lastId);$('resume').hidden=!e;if(e){$('resume').textContent='继续阅读：'+e.title;$('resume').onclick=()=>openEntry(e.id);}}
  function toggle(id,kind){const list=new Set(library[kind]);list.has(id)?list.delete(id):list.add(id);library[kind]=[...list];persist();refresh();sync();}
  function cardTools(e){
    const box=el('div','reading-actions');
    for(const [kind,label] of [['saved','收藏'],['read','标记已读']]){const b=el('button','reading-action',label);b.dataset.reading=kind;b.dataset.entry=e.id;b.onclick=()=>toggle(e.id,kind);box.append(b);buttons.set(e.id+'-'+kind,b);}
    const back=el('button','reading-back','我的阅读 ↑');back.onclick=()=>{showPanel('library');go('#reading-hub');};box.append(back);return box;
  }
  function showPanel(name){for(const b of document.querySelectorAll('[data-panel]'))b.setAttribute('aria-pressed',String(b.dataset.panel===name));for(const panel of ['routes','myths','library','catalog','supplements','advanced'])$(panel+'-panel').hidden=panel!==name;}
  for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>showPanel(b.dataset.panel);
  $('jump-results').onclick=ev=>{ev.preventDefault();go('#toolbar');};
  for(const route of data.routes){
    const b=el('button','route-option');b.dataset.route=route.id;b.append(el('strong','',route.title),el('span','',route.hint));const progress=el('small');routeProgress.set(route.id,progress);b.append(progress);b.onclick=()=>selectRoute(route.id);$('route-options').append(b);
  }
  function renderRoute(){
    const route=data.routes.find(r=>r.id===getState().route);$('route-detail').hidden=!route;$('route-active').hidden=!route;
    document.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===route?.id)));
    if(!route)return;
    $('route-title').textContent=route.title;$('route-label').textContent='正在读：'+route.title;
    const list=$('route-steps');list.replaceChildren();
    for(const id of route.ids){const e=byId.get(id),li=el('li');li.append(linkEntry(id),el('span','step-meta',`第 ${e.sec} 章第 ${e.n} 条${library.read.includes(id)?' · 已读':''}`));list.append(li);}
    const next=route.ids.find(id=>!library.read.includes(id));$('route-next').hidden=!next;if(next){$('route-next').textContent='阅读下一条：'+byId.get(next).title;$('route-next').onclick=()=>openEntry(next);}
    $('route-complete').hidden=!!next;
  }
  $('route-exit').onclick=()=>selectRoute('');
  for(const id of data.myths){
    const e=byId.get(id),details=el('details','myth-card');details.dataset.myth=id;
    const q='别这样做：'+(e.pitfall||e.title);
    const summary=el('summary');summary.append(el('span','',q),el('span','myth-hint','可以怎么做 →'));details.append(summary);
    const answer=el('div','myth-answer');const human=el('p','human');textInto(human,e.human);answer.append(human);
    for(const [label,value] of [['可以这样做',e.how],['举个例子',e.example],['何时调整',e.adjust],['何时求助',e.help],['为什么',e.why],['证据与限制',e.evidence],['别漏掉这些条件',e.note]]){if(!value)continue;const p=el('p');p.append(el('strong','',label+'：'));textInto(p,value);answer.append(p);}
    const source=el('details','src');source.append(el('summary','','查看来源'));const body=el('div','body');textInto(body,e.src);source.append(body);answer.append(source,linkEntry(id,`读完整条目 · 第 ${e.sec} 章第 ${e.n} 条`));details.append(answer);$('myth-list').append(details);
  }
  for(const [view,label] of [['all','全部条目'],['saved','我的收藏'],['unread','还没读过'],['read','已读条目']]){const b=el('button','chip',label);b.dataset.readview=view;b.onclick=()=>{selectView(view);$('toolbar').scrollIntoView({block:'start'});};$('reading-views').append(b);}
  $('reading-export').onclick=()=>{
    const blob=new Blob([JSON.stringify(library,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='HowToTrainBetter-reading.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('已生成阅读备份。换浏览器或离线文件后，可在这里导入。');
  };
  $('reading-import').onclick=()=>$('reading-file').click();
  $('reading-file').onchange=async()=>{
    const file=$('reading-file').files[0];if(!file)return;
    try{if(file.size>1024*1024)throw Error('备份文件过大，请选择小于 1 MB 的阅读备份');const incoming=data.decode(await file.text(),byId.keys());library=data.merge(library,incoming);persist();refresh();sync();announce('已合并备份，保留原有收藏和已读记录。其他版本中不存在于本版的编号会被忽略。'+(canSave?'':'请保留导出的备份。'));}
    catch(error){announce('未导入：'+error.message+'。现有记录未改变。');}
    finally{$('reading-file').value='';}
  };
  addEventListener('storage',ev=>{if(ev.key!==data.key)return;try{library=ev.newValue?data.decode(ev.newValue,byId.keys()):data.empty();refresh();sync();}catch{warn('另一个窗口的阅读记录格式无法识别；当前记录保持不变。');}});
  function sync(){
    for(const e of entries)for(const kind of ['saved','read']){const b=buttons.get(e.id+'-'+kind);if(!b)continue;const active=library[kind].includes(e.id);b.setAttribute('aria-pressed',String(active));b.textContent=kind==='saved'?(active?'★ 已收藏':'☆ 收藏'):(active?'✓ 已读':'标记已读');b.setAttribute('aria-label',b.textContent+'：'+e.title);}
    $('reading-count').textContent=`已读 ${library.read.length} / ${entries.length} 条 · 收藏 ${library.saved.length} 条`;
    $('reading-progress').max=entries.length;$('reading-progress').value=library.read.length;
    for(const r of data.routes)routeProgress.get(r.id).textContent=`${r.ids.length} 条导读 · 已读 ${r.ids.filter(id=>library.read.includes(id)).length}`;
    for(const b of document.querySelectorAll('[data-readview]'))b.setAttribute('aria-pressed',String(b.dataset.readview===getState().view));
    $('view-label').hidden=getState().view==='all';$('view-label').textContent=({saved:'筛选：我的收藏',unread:'筛选：还没读过',read:'筛选：已读条目'})[getState().view]||'';
    syncResume();renderRoute();
  }
  function matches(e){const {route,view}=getState(),r=data.routes.find(r=>r.id===route);return (!r||r.ids.includes(e.id))&&(view==='saved'?library.saved.includes(e.id):view==='read'?library.read.includes(e.id):view==='unread'?!library.read.includes(e.id):true);}
  function observe(){
    if(!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){const article=r.target.closest('article');if(article?.offsetHeight)setLast(article.dataset.id);}},{rootMargin:'-64px 0px -60% 0px'});
    document.querySelectorAll('article.card .card-h').forEach(n=>observer.observe(n));
  }
  return {cardTools,matches,sync,setLast,observe};
};
