// Browser UI acceptance: real engine fixtures, intercepted API, NO live model calls.
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildPlan} from '../lib/training/engine';
import {equipment,muscles} from '../lib/ui/plan-data';
import {gymEquipment} from '../lib/training/exercises';
import {makePlan,initialProfile} from '../lib/plan';
async function main(){
 const base='http://127.0.0.1:3214',password='ui-browser-fixture-only-password';
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3214'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore',env:{...process.env,TEST_ACCESS_PASSWORD:password,APP_ORIGIN:base,MODEL_API_KEY:'',NEXT_TELEMETRY_DISABLED:'1'}});
 let browser;
 try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({channel:'msedge',headless:true});mkdirSync('test-results',{recursive:true});
 const a={goal:'hypertrophy',experience:'advanced',days:4,minutes:60,environment:'gym',availableEquipment:gymEquipment,priorityMuscles:['chest']};
 const plans={a:buildPlan(a),b:buildPlan({...a,experience:'beginner',days:3,minutes:45,environment:'dumbbells',availableEquipment:['dumbbells'],priorityMuscles:[]}),c:buildPlan({...a,goal:'fat-loss'}),d:buildPlan({...a,days:2},{version:2}),e:buildPlan({...a,days:6}),legacy:makePlan({...initialProfile,equipment:'哑铃'})};
 let checks=0;
 for(const width of [320,390,430,1440]){
 const context=await browser.newContext({viewport:{width,height:900},httpCredentials:{username:'tester',password},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let response:unknown={...plans.a,token:'browser-fixture-not-valid-signature'},status=200,delay=0,hold=false;let expectedProfile=plans.a.profile;
 await page.route('**/api/plan/*',async route=>{const body=route.request().postDataJSON();assert.equal(body.apiVersion,'2.1');if(route.request().url().endsWith('/create')){assert.deepEqual(body.profile,expectedProfile);assert.equal(body.adultConfirmed,true);}if(hold)return;if(delay)await new Promise(r=>setTimeout(r,delay));await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});});
 assert.equal((await page.goto(base))?.status(),200);
 await page.getByRole('heading',{name:/从这里展开/}).waitFor();await page.evaluate(()=>{const label=document.createElement('div');label.textContent='浏览器测试 · 引擎计划 / 模拟 API（非真实模型验收）';label.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:100;background:#193d33;color:white;font:12px sans-serif;padding:5px;text-align:center;pointer-events:none';document.body.append(label);});
 await page.screenshot({path:resolve('test-results/ui-home-'+width+'.png'),fullPage:true});
 assert.equal(await page.locator('meta[name="viewport"]').getAttribute('content'),'width=device-width, initial-scale=1, viewport-fit=cover');
 await page.getByRole('checkbox',{name:/我已年满18岁/}).check();
 const generate=page.getByRole('button',{name:'生成训练计划',exact:true});
 async function fillProfile(p:typeof plans.a.profile){
 expectedProfile=p;
 await page.getByLabel('训练目标',{exact:true}).selectOption(p.goal);
 await page.getByLabel('训练经验',{exact:true}).selectOption(p.experience);
 await page.getByLabel('每周训练天数',{exact:true}).selectOption(String(p.days));
 await page.getByLabel('单次训练时间',{exact:true}).selectOption(String(p.minutes));
 await page.getByLabel('训练场所',{exact:true}).selectOption(p.environment);
 const inventory=page.getByRole('group',{name:'实际可用器械',exact:true});
 for(const [id,name] of Object.entries(equipment))await inventory.getByRole('checkbox',{name,exact:true}).setChecked(p.availableEquipment.includes(id as typeof p.availableEquipment[number]));
 if(await page.locator('.advanced').getAttribute('open')===null)await page.locator('.advanced > summary').click();
 await page.getByLabel('分化偏好',{exact:true}).selectOption(p.split);
 const priority=page.getByRole('group',{name:'优先训练肌群（最多 2 项）',exact:true});
 for(const [id,name] of Object.entries(muscles))await priority.getByRole('checkbox',{name,exact:true}).setChecked(p.priorityMuscles.includes(id as typeof p.priorityMuscles[number]));
 }
 await fillProfile(plans.a.profile);
 delay=200;await generate.click();await page.getByRole('status').waitFor();delay=0;
 await page.getByRole('heading',{name:'你的训练周计划',exact:true}).waitFor();
 async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);}
 for(const key of ['a','b','c','e'] as const){
 response={...plans[key],token:'browser-fixture-not-valid-signature'};
 if(key!=='a'){await fillProfile(plans[key].profile);await generate.click();await page.getByRole('heading',{name:'你的训练周计划',exact:true}).waitFor();await page.waitForFunction(n=>document.querySelectorAll('.result-panel > .plan-view > .day-card').length===n,plans[key].days.length);}
 const main=page.locator('.result-panel > .plan-view');
 assert.equal(await main.locator('.day-card').count(),plans[key].days.length);
 await main.locator('.day-card').evaluateAll(ds=>ds.forEach(d=>d.setAttribute('open','')));
 await main.locator('.volume-overview > summary').click();
 for(const text of plans[key].nutritionGuidance)assert.ok((await main.textContent())!.includes(text));
 assert.ok((await main.textContent())!.includes('保留次数 RIR'));await noOverflow();checks++;
 if(key==='a'){await main.locator('.plan-overview').scrollIntoViewIfNeeded();await page.screenshot({path:resolve('test-results/ui-plan-'+width+'.png')});}if(key==='e')await page.screenshot({path:resolve('test-results/ui-six-days-'+width+'.png'),fullPage:true});
 }
 response={...plans.a,token:'browser-fixture-not-valid-signature'};await fillProfile(plans.a.profile);await generate.click();await page.waitForFunction(()=>document.querySelectorAll('.result-panel > .plan-view > .day-card').length===4);
 response={...plans.d,token:'browser-fixture-not-valid-signature'};
 await page.getByLabel('调整要求',{exact:true}).fill('每周2天，改为自动分化');
 await page.getByRole('button',{name:'调整我的计划',exact:true}).click();
 await page.getByRole('heading',{name:'本次计划变化',exact:true}).waitFor();assert.ok((await page.locator('.comparison').textContent())!.includes('4天 → 2天'));
 assert.equal(await page.locator('.result-panel > .plan-view > .day-card').count(),2);
 await page.screenshot({path:resolve('test-results/ui-revision-'+width+'.png'),fullPage:true});checks++;
 for(const code of ['MODEL_HTTP_ERROR','MODEL_TIMEOUT','TIME_CONFLICT','NO_CHANGE','SPLIT_FREQUENCY']){
 status=code==='MODEL_HTTP_ERROR'?503:422;response={code,error:'浏览器测试故障：'+code};
 await page.getByRole('button',{name:'调整我的计划',exact:true}).click();await page.getByText('这次没有修改计划',{exact:true}).waitFor();
 assert.equal(await page.locator('.result-panel > .plan-view > .day-card').count(),2);checks++;
 }
 status=200;response={...plans.d,token:'browser-fixture-not-valid-signature'};await page.getByRole('button',{name:'重试',exact:true}).click();await page.getByText('这次没有修改计划',{exact:true}).waitFor({state:'detached'});
 status=503;response={code:'MODEL_HTTP_ERROR',error:'测试503'};await generate.click();await page.getByText('这次没有生成计划',{exact:true}).waitFor();assert.equal(await page.locator('.result-panel > .plan-view > .day-card').count(),2);
 status=200;response={schemaVersion:'2.1'};await page.getByRole('button',{name:'重试',exact:true}).click();await page.getByText(/返回的计划未通过数据格式校验/).waitFor();
 response=plans.legacy;await page.getByRole('button',{name:'重试',exact:true}).click();await page.getByRole('heading',{name:'你的每周日程',exact:true}).waitFor();assert.ok((await page.locator('.result-panel > .plan-view').textContent())!.includes('不补造'));checks++;
 if(await page.locator('.advanced').getAttribute('open')===null)await page.locator('.advanced > summary').click();await page.getByLabel('训练限制与补充说明（可选）',{exact:true}).fill('膝盖疼痛');await generate.click();await page.getByRole('alert').filter({hasText:'当前规则引擎'}).waitFor();checks++;
 // Large text, keyboard focus and scroll use an actual Chromium browser, not iPhone Safari.
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');await noOverflow();await page.screenshot({path:resolve('test-results/ui-large-text-'+width+'.png'),fullPage:true});await page.locator('textarea').first().focus();await page.keyboard.press('Tab');
 assert.ok(await page.evaluate(()=>document.activeElement!==document.body));await noOverflow();assert.deepEqual(errors,[]);
 const buttons=await page.locator('button:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert.ok(buttons.every(h=>h>=44));
 const interactionText=await page.locator('button,a,summary').allTextContents();assert.ok(interactionText.every(t=>!/[↗＋✦◌]/u.test(t)));
 if(width===390){await page.locator('textarea').first().fill('');await page.clock.install();hold=true;await generate.click();await page.getByRole('status').waitFor();await page.clock.fastForward(91000);await page.getByText('等待计划响应超时，请稍后重试。',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'你的每周日程',exact:true}).count(),1);checks++;}await context.close();console.log('PASS viewport '+width+'; all A-G UI fixtures/errors/compatibility, focus/large text/touch targets');}
 console.log(JSON.stringify({browser:'Microsoft Edge / Chromium',checks,liveModelRequests:0,webkitInstalled:existsSync(webkit.executablePath()),screenshots:'test-results/ui-*.png',realIPhoneTested:false}));
 }finally{await browser?.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
