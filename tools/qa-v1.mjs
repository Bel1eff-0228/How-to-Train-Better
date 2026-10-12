// Verify merged links and real browser storage across the version update.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd();
const pw=await import(pathToFileURL(path.resolve(path.dirname(process.execPath),'../node_modules/playwright/index.mjs')).href);
const browser=await pw.chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(root,'dist/HowToTrainBetter.html')).href;
 await ctx.addInitScript(()=>localStorage.setItem('htb-reading-v1',JSON.stringify({format:'how-to-train-better-reading',version:1,saved:['TB-05-11','TB-05-12'],read:['TB-05-12'],lastId:'TB-05-11'})));
 for(const hash of ['#e-5-11','#e-5-12']){
  await page.goto(url+hash);await page.waitForSelector('body[data-ready="true"]');
  await page.waitForFunction(()=>document.activeElement?.id==='e-5-1');
  assert.equal(await page.locator('article').count(),100);
  assert.equal(await page.locator('#e-5-1 [data-reading="saved"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#e-5-1 [data-reading="read"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#e-5-11').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  results.push(`${hash} 转到合并正文，旧收藏和已读保留，手机无溢出`);
 }
 for(const q of ['瘦大腿','瘦小腿','瘦肚子','瘦屁股']){
  await page.locator('#q').fill(q);assert(await page.locator('#e-5-1').isVisible());
 }
 results.push('四类局部减脂搜索都能找到合并条目');
 await page.locator('#q').fill('');
 await page.locator('#e-1-12').scrollIntoViewIfNeeded();
 await mkdir(path.join(root,'output/v1.0预览'),{recursive:true});
 await page.screenshot({path:path.join(root,'output/v1.0预览/手机器械入门.png')});
 await page.locator('#q').fill('瘦大腿');await page.locator('#e-5-1').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(root,'output/v1.0预览/手机局部减脂.png')});
 assert.deepEqual(errors,[]);
 await mkdir(path.join(root,'docs/qa'),{recursive:true});
 await writeFile(path.join(root,'docs/qa/v1-browser.json'),JSON.stringify({version:'1.0.0',results,errors},null,2)+'\n');
 console.log(results.join('\n'));
}finally{await browser.close();}
