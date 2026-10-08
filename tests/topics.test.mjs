import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {loadBook,ROOT} from '../tools/build.mjs';
import core from '../tools/core.cjs';
import api from '../tools/public.cjs';
const book=await loadBook(),entries=book.sections.flatMap(s=>s.entries);
test('补剂推荐条件独立于证据，导出保留适用人群',()=>{
 const supplements=entries.filter(e=>e.sec==='6'&&e.kind==='补剂推荐');assert.equal(supplements.length,20);
 assert.deepEqual(['A','B','C'].map(g=>supplements.filter(e=>e.recommendation.startsWith(g+'｜')).length),[3,11,6]);
 for(const e of supplements){assert(e.population);const text=api.citation(e,'v0.9.0');assert(text.includes(e.recommendation));assert(text.includes(e.population));assert(text.includes(e.value));}
 const invalid=structuredClone(book.sections);invalid[5].entries[0].recommendation='D｜假的';assert(core.validate(invalid).length);
});
test('补剂运动表现标签不暗示改善心肺健康',()=>{
 for(const n of ['3','4','6','7','8'])assert.equal(entries.find(e=>e.sec==='6'&&e.n===n).lens,'运动表现');
});
test('进阶术语可定位且保持原编号与来源',()=>{
 for(const [q,id] of [['TUT','TB-07-04'],['RIR','TB-07-02'],['RPE','TB-07-03'],['渐进式超负荷','TB-07-05']])assert(entries.filter(e=>core.matches(e,{q})).some(e=>e.id===id));
});
test('技能入口短且明确按需读取references',async()=>{
 const skill=await readFile(path.join(ROOT,'skills/train-better-guide/SKILL.md'),'utf8');assert(skill.split(/\r?\n/).length<500);assert(skill.includes('references/INDEX.md'));assert(skill.includes('不提供个人剂量'));assert(skill.includes('第7章'));
});

test('选购比较不参与推荐评级，分享保留类型',()=>{const e=entries.find(e=>e.id==='TB-06-19');assert.equal(e.kind,'选购比较');assert(!e.recommendation);assert(api.citation(e,'v0.9.0').includes('条目类型：选购比较'));const bad=structuredClone(book.sections);bad[5].entries.find(e=>e.id==='TB-06-19').recommendation='B｜误评级';assert(core.validate(bad).length);assert.equal(entries.find(e=>e.id==='TB-03-11').sec,'3');});
