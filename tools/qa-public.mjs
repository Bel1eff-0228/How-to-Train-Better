/* Verify the exact reader package in isolation from project-only files. MIT. */
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT} from './build.mjs';
import {digest} from './evaluation.mjs';
const release=JSON.parse(await readFile(path.join(ROOT,'dist/public-release.json'),'utf8'));
const folder=path.join(ROOT,release.folder),manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
assert.equal(digest(await readFile(path.join(ROOT,release.archive))),release.sha256);
const allowed=new Set([...manifest.files.map(f=>f.path),'manifest.json']);
assert.deepEqual([...allowed].sort(),['HowToTrainBetter.pdf','HowToTrainBetter.html','LICENSE','LICENSE-CODE','NOTICE.txt','index.html','manifest.json','开始阅读.txt'].sort());
for(const file of manifest.files){const data=await readFile(path.join(folder,file.path));assert.equal(digest(data),file.sha256);assert.equal(data.length,file.bytes);}
let pw;try{pw=createRequire(import.meta.url)('playwright');}catch{pw=await import(pathToFileURL(path.resolve(path.dirname(process.execPath),'../node_modules/playwright/index.mjs')).href);}
const requests=[],errors=[],results=[];
const note=s=>{results.push(s);console.log('PASS '+s);};
const server=createServer(async(req,res)=>{try{const filename=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';if(!allowed.has(filename)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',filename.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');res.end(await readFile(path.join(folder,filename)));}catch{res.writeHead(500);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await pw.chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext(),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base);await page.waitForSelector('body[data-ready="true"]');assert.equal(await page.locator('article').count(),94);
  assert(!requests.some(u=>/evaluation|quality|\.md|\/assets\/|\/tools\//.test(u)));assert(requests.every(u=>u.startsWith(base)));assert.equal(await page.locator('#quality').count(),0);note('独立网站目录94条可读，仅加载公开包内文件');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'下载离线版',exact:true}).click();const download=await downloadPromise;assert.equal(digest(await readFile(await download.path())),digest(await readFile(path.join(folder,'HowToTrainBetter.html'))));note('网站下载得到完全一致的离线文件');
  const missing=await page.request.get(base+'/evaluation/cases.json');assert.equal(missing.status(),404);note('独立目录不暴露内部题库');
  const offline=await browser.newContext({offline:true,viewport:{width:390,height:844}}),p=await offline.newPage(),remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.goto(pathToFileURL(path.join(folder,'HowToTrainBetter.html')).href);await p.waitForSelector('body[data-ready="true"]');await p.locator('#q').fill('膳食纤维');assert(Number(await p.locator('#cnt').textContent())>0);await p.locator('#licensing > summary').click();assert(await p.locator('#license-notice').isVisible());assert.equal(remote.length,0);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));note('读者包离线手机阅读、搜索和许可均可用');
  assert.deepEqual(errors,[]);await writeFile(path.join(ROOT,'docs/qa/public-results.json'),JSON.stringify({date:'2026-10-03',release,results,errors},null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
