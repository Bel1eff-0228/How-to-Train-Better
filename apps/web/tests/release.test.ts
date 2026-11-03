import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dose,safety} from '../lib/agent/tools';
import {initialProfile} from '../lib/plan';
test('30分钟三动作在所有目标经验下可执行',()=>{for(const goal of ['增肌','减脂','提升体能'] as const)for(const experience of ['新手','初级','进阶'] as const){const d=dose({...initialProfile,minutes:30,goal,experience},3);assert(d.minutes<=30);assert(d.sets>=1);}});
test('经验和体能目标影响编辑起点但受时长约束',()=>{assert(dose({...initialProfile,minutes:90,experience:'进阶'},3).sets>dose(initialProfile,3).sets);assert.equal(dose({...initialProfile,goal:'提升体能'},3).reps,12);});
test('补充英文风险与呼吸困难',()=>{for(const text of ['knee pain','injury','呼吸困难','麻木'])assert.throws(()=>safety(text));});
