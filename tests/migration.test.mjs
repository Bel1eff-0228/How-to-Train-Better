import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBook} from '../tools/build.mjs';
import core from '../tools/core.cjs';
import reading from '../tools/reading.cjs';
const book=await loadBook(),entries=book.sections.flatMap(s=>s.entries),ids=entries.map(e=>e.id),aliases=core.aliases(entries);
test('合并条目保留旧收藏、已读和继续阅读，重复记录去重',()=>{
 const old={...reading.empty(),saved:['TB-05-11','TB-05-12','TB-05-01','TB-01-01'],read:['TB-05-12'],lastId:'TB-05-11'};
 const result=reading.decode(old,ids,aliases);
 assert.deepEqual(result.saved,['TB-05-01','TB-01-01']);assert.deepEqual(result.read,['TB-05-01']);assert.equal(result.lastId,'TB-05-01');
 assert.deepEqual(reading.decode(result,ids,aliases),result);
});
test('兼容编号不能覆盖现有条目或由两条重复声明',()=>{
 for(const id of ['TB-01-01','TB-05-11','not-an-id']){
  const sections=structuredClone(book.sections);sections[0].entries[0].legacyIds=id;assert(core.validate(sections).length>0);
 }
});
