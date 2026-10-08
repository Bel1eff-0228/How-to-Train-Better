/* Reading navigation and local bookmark format. MIT; no fitness claims live here. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrainReading=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // This is an editorial reading order, not a personal training prescription.
  const routes=[
    {id:'start',title:'刚开始，不知道先看什么',hint:'从频率、重量到恢复',ids:['TB-01-01','TB-01-04','TB-01-06','TB-04-06']},
    {id:'fat-loss',title:'想减脂，总被各种说法绕晕',hint:'从热量到体重与出汗',ids:['TB-03-01','TB-02-01','TB-05-04','TB-05-02']},
    {id:'muscle',title:'想增肌，先弄清基本功',hint:'从训练量到吃与睡',ids:['TB-01-03','TB-01-05','TB-03-02','TB-04-04']},
    {id:'busy',title:'时间有限，也想开始练',hint:'从时长到场地与安排',ids:['TB-01-02','TB-01-01','TB-02-06','TB-02-04']},
    {id:'recovery',title:'练后不舒服，想了解恢复',hint:'先读疼痛边界，再看酸痛和休息',ids:['TB-04-06','TB-04-01','TB-04-02','TB-04-03']},
    {id:'spending',title:'准备花钱，先做点功课',hint:'蛋白粉、肌酸、私教与场地',ids:['TB-03-06','TB-05-05','TB-05-06','TB-02-06']}
  ];
  const myths=["TB-04-01","TB-05-02","TB-05-01","TB-05-03","TB-03-06","TB-04-05","TB-01-05","TB-01-06","TB-07-04","TB-07-10","TB-02-05","TB-07-07","TB-05-04","TB-02-08","TB-03-05","TB-03-02","TB-06-01","TB-06-12","TB-06-06","TB-06-17","TB-08-01","TB-08-03","TB-06-16","TB-06-20"];
  const format='how-to-train-better-reading',key='htb-reading-v1';
  function empty(){return {format,version:1,saved:[],read:[],lastId:''};}
  function decode(raw,ids){
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    if(!data||data.format!==format||data.version!==1||!Array.isArray(data.saved)||!Array.isArray(data.read)||typeof data.lastId!=='string'||[...data.saved,...data.read].some(x=>typeof x!=='string'))throw Error('文件不是支持的阅读备份（版本 1）');
    const valid=new Set(ids),keep=list=>[...new Set(list)].filter(id=>valid.has(id));
    return {...empty(),saved:keep(data.saved),read:keep(data.read),lastId:valid.has(data.lastId)?data.lastId:''};
  }
  function merge(a,b){return {...empty(),saved:[...new Set([...a.saved,...b.saved])],read:[...new Set([...a.read,...b.read])],lastId:b.lastId||a.lastId};}
  function validate(entries){const ids=new Set(entries.map(e=>e.id)),errors=[],routeIds=new Set();for(const route of routes){if(routeIds.has(route.id))errors.push('重复导读编号：'+route.id);routeIds.add(route.id);if(new Set(route.ids).size!==route.ids.length)errors.push('导读条目重复：'+route.id);for(const id of route.ids)if(!ids.has(id))errors.push('导读引用缺失：'+id);}for(const id of myths)if(!ids.has(id))errors.push('误区引用缺失：'+id);return errors;}
  return {routes,myths,key,empty,decode,merge,validate};
});
