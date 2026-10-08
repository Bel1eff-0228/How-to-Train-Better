// Offline corpus embedding adapted from HowToLiveBetter tools/offline/build.mjs (MIT).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import core from './core.cjs';
import reading from './reading.cjs';
import {loadQuality} from './quality.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(ROOT,p),'utf8');
export async function loadBook(){
  const readme=await read('README.md'), files=core.filesFromReadme(readme);
  if (!files.length) throw new Error('目录中没有章节');
  const parts=Object.fromEntries(await Promise.all(files.map(async f=>[f,await read(f)])));
  const sections=files.map(f=>core.parseChapter(parts[f],f));
  const errors=core.validate(sections); if(errors.length) throw new Error(errors.join('\n'));
  const disk=(await readdir(path.join(ROOT,'book'))).filter(f=>f.endsWith('.md'));
  if(disk.length!==files.length) throw new Error('目录与 book 文件数不一致');
  return {readme,parts,sections};
}
export async function build(){
  const corpus=await loadBook(), entries=corpus.sections.flatMap(s=>s.entries);
  const quality=await loadQuality(ROOT,corpus);
  const navigationErrors=reading.validate(entries);if(navigationErrors.length)throw Error(navigationErrors.join('\n'));
  const stats={version:JSON.parse(await read('package.json')).version,chapters:corpus.sections.length,entries:entries.length,grades:Object.fromEntries(['A','B','C'].map(g=>[g,entries.filter(e=>e.grade===g).length])),sources:[...new Set(entries.flatMap(e=>[...e.src.matchAll(/\[S\d+\]/g)].map(m=>m[0])))].length,verified:[...new Set(entries.map(e=>e.verified))].sort().at(-1)};
  let html=await read('index.html');
  for(const [tag,file,wrapper] of [
    ['<link rel="stylesheet" href="assets/styles.css">','assets/styles.css','style'],
    ...['tools/core.cjs','tools/reading.cjs','tools/public.cjs','assets/profile.cjs','assets/reading.js','assets/reader-tools.js','assets/app.js'].map(file=>[`<script src="${file}"></script>`,file,'script'])
  ]){const content=await read(file);html=html.replace(tag,()=>`<${wrapper}>${content}</${wrapper}>`);}
  const licenses={notice:await read('licenses/NOTICE.txt'),content:await read('LICENSE'),code:await read('LICENSE-CODE')};
  const data=JSON.stringify({readme:corpus.readme,parts:corpus.parts,licenses}).replace(/</g,'\\u003c');
  html=html.replace('<!-- CORPUS -->',()=>`<script>window.__CORPUS__=${data};</script>`);
  html=html.replace('data-build="live"','data-build="offline"');
  if(/<script[^>]+src=|<link[^>]+rel="stylesheet"|googletagmanager|google-analytics|fonts\.googleapis/.test(html)) throw new Error('离线文件仍有外部运行资源');
  await mkdir(path.join(ROOT,'dist'),{recursive:true});
  await writeFile(path.join(ROOT,'dist/HowToTrainBetter.html'),html);
  await writeFile(path.join(ROOT,'dist/stats.json'),JSON.stringify(stats,null,2)+'\n');
  await writeFile(path.join(ROOT,'dist/quality.json'),JSON.stringify(quality,null,2)+'\n');
  await mkdir(path.join(ROOT,'docs'),{recursive:true});
  const mapping='# 条目与来源对照\n\n由 tools/build.mjs 根据正文生成；维护请修改 book/。\n\n| 编号 | 条目 | 来源 | 证据 | 性价比 | 核验日期 |\n| --- | --- | --- | --- | --- | --- |\n'+entries.map(e=>`| ${e.id} | 第 ${e.sec} 章第 ${e.n} 条：${e.title} | ${[...e.src.matchAll(/\[S\d+\]/g)].map(m=>m[0]).join('、')} | ${e.grade} | ${e.ratio} | ${e.verified} |`).join('\n')+'\n';
  await writeFile(path.join(ROOT,'docs/引用对照.md'),mapping);
  let readme=corpus.readme.replace(/<!-- STATS:START -->[\s\S]*?<!-- STATS:END -->/,`<!-- STATS:START -->\n**${stats.chapters} 章 · ${stats.entries} 条 · ${stats.sources} 个来源 · A ${stats.grades.A} / B ${stats.grades.B} / C ${stats.grades.C}**\n<!-- STATS:END -->`);
  if(readme!==corpus.readme) { await writeFile(path.join(ROOT,'README.md'),readme); return build(); }
  console.log(`已生成离线版：${stats.chapters} 章 ${stats.entries} 条，${stats.sources} 个来源。`);
  return stats;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await build();
