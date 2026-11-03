import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:3200';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [390,1440]){const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const r=await page.goto(BASE);assert.equal(r.status(),200);
await page.getByText('从这里开始。',{exact:false}).waitFor();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'生成训练计划'}).click();await page.getByText('这次没有修改计划',{exact:true}).waitFor();
await page.getByRole('button',{name:'重试',exact:true}).click();await page.getByText('这次没有修改计划',{exact:true}).waitFor();
assert.equal(await page.getByRole('heading',{name:'你的每周日程'}).count(),0);
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
const response=await page.request.post(BASE+'/api/plan/revise',{data:{token:'invalid',message:'改成两天'}});assert(response.status()>=400);
await page.screenshot({path:`test-results/agent-${width}.png`,fullPage:true});console.log(`PASS ${width}: page 200, config error visible, no fake result, revise fails closed, no overflow/runtime error`);await page.close();}}finally{await browser.close();}
