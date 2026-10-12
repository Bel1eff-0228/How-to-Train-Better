import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBook,ROOT} from '../tools/build.mjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import core from '../tools/core.cjs';
const entries=(await loadBook()).sections.flatMap(s=>s.entries);
test('网友常用搜索直接到达对应完整条目',()=>{
 for(const [query,id] of [['感冒','TB-08-09'],['瘦肚子','TB-05-01'],['瘦小腿','TB-05-01'],['瘦屁股','TB-05-01'],['平台期','TB-05-04']])
   assert(entries.filter(e=>core.matches(e,{q:query})).some(e=>e.id===id));
});
test('新条目保留危险信号、非处方示例和来源，防止构建漏字段',()=>{
 const cold=entries.find(e=>e.id==='TB-08-09'),calf=entries.find(e=>e.id==='TB-05-01');
 assert(cold.human.includes('暂停训练')&&cold.adjust.includes('不是恢复大重量'));
 assert(cold.help.includes('急救')&&cold.example.includes('示例'));
 assert(calf.human.includes('全身')&&calf.human.includes('不能指定'));
 assert(entries.find(e=>e.id==='TB-08-02').help.includes('急救'));
 for(const id of ['TB-05-01','TB-05-01'])assert.equal(entries.find(e=>e.id===id).grade,'B');
});
test('筛选简称与解释分开保留',async()=>{
 const app=await readFile(path.join(ROOT,'assets/app.js'),'utf8');
 const doc=await readFile(path.join(ROOT,'docs/阅读说明.md'),'utf8');
 assert(app.includes("ratio:'性价比'"));assert(!app.includes('性价比 · 编辑判断'));assert(doc.includes('编辑'));
});
