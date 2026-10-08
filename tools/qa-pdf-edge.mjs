// Render the existing PDF in Edge's native viewer; this does not print HTML. MIT.
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(import.meta.dirname,'..');
let pw;try{pw=await import('playwright');}catch{pw=await import(pathToFileURL(path.resolve(path.dirname(process.execPath),'../node_modules/playwright/index.mjs')).href);}
const requested=process.argv.slice(2).map(Number);
if(!requested.length||requested.some(n=>!Number.isInteger(n)||n<1))throw Error('Supply one-based PDF page numbers');
const folder=path.join(ROOT,'.cache/pdf-edge');await mkdir(folder,{recursive:true});
const pdf=path.join(ROOT,'dist/HowToTrainBetter.pdf');
const b=await pw.chromium.launch({channel:'msedge',headless:true});
try{
 for(const n of requested){const page=await b.newPage({viewport:{width:1200,height:1500}});await page.goto(pathToFileURL(pdf).href+'#page='+n);await page.waitForTimeout(2200);await page.screenshot({path:path.join(folder,'page-'+String(n).padStart(3,'0')+'.png')});await page.close();}
 await writeFile(path.join(ROOT,'docs/qa/pdf-edge-results.json'),JSON.stringify({version:JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8')).version,sha256:createHash('sha256').update(await readFile(pdf)).digest('hex'),browser:await b.version(),pagesCaptured:requested,visualReview:'pending: inspect screenshots; capture alone is not verification'},null,2)+'\n');
}finally{await b.close()}
