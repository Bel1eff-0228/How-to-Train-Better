import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialProfile,makePlan,revisePlan,profileSchema} from '../lib/plan';
test('拒绝无效条件',()=>{assert.equal(profileSchema.safeParse({...initialProfile,days:7}).success,false);assert.equal(profileSchema.safeParse({...initialProfile,budget:-1}).success,false);});
test('2至6天均按输入展示且标记demo',()=>{for(let days=2;days<=6;days++){const p=makePlan({...initialProfile,days});assert.equal(p.days.length,days);assert.equal(p.mode,'demo');}});
test('调整保留原计划与无关条件',()=>{const p=makePlan(initialProfile),before=JSON.stringify(p),n=revisePlan(p,'我这周只能练两次');assert.equal(n.profile.days,2);assert.equal(n.profile.budget,p.profile.budget);assert.equal(n.profile.equipment,p.profile.equipment);assert.equal(n.version,2);assert.equal(JSON.stringify(p),before);});
test('器械和时长修改',()=>{const p=makePlan(initialProfile);assert.equal(revisePlan(p,'只有哑铃').profile.equipment,'哑铃');assert.equal(revisePlan(p,'每次只有30分钟').profile.minutes,30);});
test('不忽略不支持的限制或混合请求',()=>{assert.throws(()=>makePlan({...initialProfile,notes:'膝盖疼'}));const p=makePlan(initialProfile);for(const text of ['我膝盖疼只能练两次','练两次，只有哑铃','随便安排','练七次'])assert.throws(()=>revisePlan(p,text));});
