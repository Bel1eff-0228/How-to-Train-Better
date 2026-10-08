/* Public reading, citation and feedback controls. MIT. */
window.mountReaderTools=function({sections,entries,version,el,textInto,go}){
  const $=id=>document.getElementById(id),api=window.TrainPublic;
  const profile=window.TrainProfile,author=$('author-body');
  for(const text of [profile.role,profile.experience,profile.purpose,...profile.credentials])author.append(el('p','',text));
  author.append(el('h3','','我的教学方法'));
  for(const [title,text] of profile.methods){const p=el('p');p.append(el('strong','',title+'：'),document.createTextNode(text));author.append(p);}
  author.append(el('p','small',profile.boundary));
  if(profile.contact?.label&&/^(https:\/\/|mailto:)/.test(profile.contact.url||'')){const a=el('a','reading-primary',profile.contact.label);a.href=profile.contact.url;a.rel='noopener noreferrer';author.append(a);}
  function entryLink(e,label){const a=el('a','',label);a.href=`#e-${e.sec}-${e.n}`;a.onclick=ev=>{ev.preventDefault();go(a.hash);};return a;}
  const supplements=entries.filter(e=>e.sec==='6'&&e.kind==='补剂推荐');
  for(const grade of ['A','B','C']){
    const section=el('section','supplement-group');section.dataset.recommendation=grade;
    section.append(el('h3','',`推荐 ${grade} · ${supplements.filter(e=>e.recommendation.startsWith(grade)).length} 类`));
    for(const e of supplements.filter(e=>e.recommendation.startsWith(grade))){const card=el('div','supplement-summary');card.append(entryLink(e,e.supplement),el('p','',e.human),el('p','small','适用：'+e.population),el('p','small',`目标：${e.lens} · 性价比：${e.ratio} · 证据：${e.grade}`),el('p','small','限制：'+e.note));if(e.id==='TB-06-01')card.append(entryLink(entries.find(x=>x.id==='TB-06-19'),'怎么选：乳清与酵母蛋白'));section.append(card);}
    $('supplement-list').append(section);
  }
  for(const e of entries.filter(e=>e.kind==='选购比较')){const card=el('div','comparison-summary');card.append(entryLink(e,e.title),el('p','',e.human),el('p','small','选购比较不参与推荐 A/B/C 筛选；证据 '+e.grade+' · 性价比 '+e.ratio));$('comparison-list').append(card);}
  for(const b of document.querySelectorAll('[data-supplement-grade]'))b.onclick=()=>{for(const button of document.querySelectorAll('[data-supplement-grade]'))button.setAttribute('aria-pressed',String(button===b));for(const group of document.querySelectorAll('.supplement-group'))group.hidden=!!b.dataset.supplementGrade&&group.dataset.recommendation!==b.dataset.supplementGrade;};
  for(const e of entries.filter(e=>e.sec==='7')){const li=el('li');li.append(entryLink(e,e.title),el('p','small',e.human));$('advanced-list').append(li);}
  const dialog=$('reader-dialog'),area=$('reader-copy-text');
  function show(title,text,hint){$('reader-dialog-title').textContent=title;area.value=text;$('reader-dialog-hint').textContent=hint;$('reader-copy-status').textContent='';dialog.showModal();area.focus();area.select();}
  $('reader-dialog-close').onclick=()=>dialog.close();
  $('reader-copy').onclick=async()=>{let timer;$('reader-copy-status').textContent='正在复制…';try{await Promise.race([navigator.clipboard.writeText(area.value),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('clipboard timeout')),1500);})]);$('reader-copy-status').textContent='已复制。';}catch{area.focus();area.select();$('reader-copy-status').textContent='请使用复制快捷键或长按选中文字复制。';}finally{clearTimeout(timer);}};
  for(const section of sections){const d=el('details','catalog-chapter');d.open=section.n==='1';d.append(el('summary','',`${section.n}. ${section.title} · ${section.entries.length} 条`));const list=el('ol');for(const e of section.entries){const li=el('li'),a=el('a','',e.questions.match(/^[^？?]+[？?]/)?.[0]||e.title);a.href=`#e-${e.sec}-${e.n}`;a.onclick=ev=>{ev.preventDefault();go(a.hash);};li.append(a,el('small','',e.title));list.append(li);}d.append(list);$('catalog-list').append(d);}
  for(const source of api.sources(entries)){const d=el('details','source-record');d.id='source-'+source.id;d.append(el('summary','',source.id+' · '+source.text.split('https:')[0].slice(0,100)));const body=el('p');textInto(body,source.text);d.append(body);const links=el('p','source-used');links.append(document.createTextNode('相关条目：'));for(const id of source.entries){const e=entries.find(e=>e.id===id),a=el('a','',`第${e.sec}章第${e.n}条`);a.href=`#e-${e.sec}-${e.n}`;a.onclick=ev=>{ev.preventDefault();go(a.hash);};links.append(a,document.createTextNode('　'));}d.append(links);$('source-list').append(d);}
  let printSources=[];
  addEventListener('beforeprint',()=>{printSources=[...document.querySelectorAll('article:not([hidden]) details:not([open])')];printSources.forEach(d=>d.open=true);});
  addEventListener('afterprint',()=>{printSources.forEach(d=>d.open=false);printSources=[];});
  $('print-guide').onclick=()=>window.print();
  function cardTools(e){const row=el('div','share-actions');for(const [label,action] of [['复制条目',()=>show('复制条目与来源',api.citation(e,version),'已包含证据、适用限制与署名；分享时请保留这些内容。')],['反馈这条',()=>show('记录问题与建议',api.feedback(e,version),'请补充具体问题后复制，发给向你提供本指南的人。这里不会自动发送或收集信息，无需填写个人病史。')]]){const b=el('button','reading-action',label);b.onclick=action;b.setAttribute('aria-label',label+'：'+e.title);row.append(b);}return row;}
  return {cardTools};
};
