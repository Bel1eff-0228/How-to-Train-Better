import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBook} from '../tools/build.mjs';
import reading from '../tools/reading.cjs';
import api from '../tools/public.cjs';
const book=await loadBook(),entries=book.sections.flatMap(s=>s.entries);
test('每条实用字段可解析、搜索、分享，不只留在Markdown',()=>{for(const e of entries){const output=api.citation(e,'v0.8.0');for(const k of ['how','example','adjust']){assert(e[k]?.length>15,e.id+' '+k);assert(e.hay.includes(e[k].normalize('NFKC').toLowerCase()));assert(output.includes(e[k]));}if(e.sec==='8'){for(const k of ['help','triggers','avoid'])assert(e[k]);assert(output.includes(e.help));}}});
test('24项避坑均来自正文，保留原六个编号',()=>{assert.equal(reading.myths.length,24);assert.equal(new Set(reading.myths).size,24);for(const id of reading.myths)assert(entries.find(e=>e.id===id)?.pitfall);for(const id of ['TB-04-01','TB-05-02','TB-05-01','TB-05-03','TB-03-06','TB-04-05'])assert(reading.myths.includes(id));});
test('两个通用模板保留完整实践信息与C级判断',()=>{for(const id of ['TB-01-11','TB-07-13']){const e=entries.find(e=>e.id===id);assert.equal(e.grade,'C');assert(e.how.includes('工作组')&&e.how.includes('热身'));assert(e.example.includes('替代'));assert(e.adjust.includes('退回'));}});
