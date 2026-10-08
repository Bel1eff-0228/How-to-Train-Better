// Inspect maintained files and public export; not a medical or security certification. MIT.
import {readFile,readdir,stat,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {ROOT,loadBook} from './build.mjs';
import {digest} from './evaluation.mjs';
const ignored=new Set(['.cache','.git','node_modules','dist']);
const inventory=[],issues=[];
async function walk(relative=''){
 for(const item of await readdir(path.join(ROOT,relative),{withFileTypes:true})){
  if(ignored.has(item.name)||item.name==='__pycache__')continue;
  const file=path.posix.join(relative,item.name);
  if(file==='docs/qa/file-audit.json')continue; // A report cannot contain its own final hash.
  if(item.isSymbolicLink()){issues.push('Symlink requires review: '+file);continue;}
  if(item.isDirectory())await walk(file);
  else if(item.isFile()){const bytes=await readFile(path.join(ROOT,file));inventory.push({path:file,bytes:bytes.length,sha256:digest(bytes)});}
 }
}
await walk();
const book=await loadBook(),entries=book.sections.flatMap(s=>s.entries);
for(const e of entries){if(/保证.*(增肌|减脂|提升)/.test(e.human)&&!/(不|不能|无法|别)/.test(e.human))issues.push('Review absolute claim: '+e.id);}
const release=JSON.parse(await readFile(path.join(ROOT,'dist/source-release.json'),'utf8'));
const source=path.join(ROOT,release.source.folder),manifest=JSON.parse(await readFile(path.join(source,'manifest.json'),'utf8'));
for(const item of manifest.files){
 const bytes=await readFile(path.join(source,item.path));if(digest(bytes)!==item.sha256)issues.push('Export changed: '+item.path);
 if(/(?:^|\/)(?:\.cache|node_modules|\.env)(?:[/.]|$)|^evaluation\/(?:runs|reports|history|prompts)\/|^docs\/qa\//.test(item.path))issues.push('Private file in export: '+item.path);
 if(/\.(?:md|html|json|ya?ml|[cm]?js|py|txt|css)$/.test(item.path)){
  const text=bytes.toString('utf8');if(/[A-Z]:[\\/](?:Users|How-to-Train-Better)/i.test(text))issues.push('Local path: '+item.path);
 }
 if(item.path.endsWith('.md')){
  const text=bytes.toString('utf8');
  for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
   const target=m[1];if(/^(?:https?:|#)/.test(target))continue;
   const resolved=path.resolve(source,path.dirname(item.path),target.split('#')[0]);
   try{if(!resolved.startsWith(source+path.sep)||!(await stat(resolved)).isFile())issues.push('Broken local link: '+item.path+' -> '+target);}catch{issues.push('Broken local link: '+item.path+' -> '+target);}
  }
 }
}
const report={date:new Date().toISOString().slice(0,10),version:release.version,maintainedFiles:inventory.length,publicFiles:manifest.files.length,chapters:book.sections.length,entries:entries.length,issues,scope:'Maintained files hashed; exported files checked for integrity, local links and selected private-data patterns. Historical snapshots require separate checksum verification. This is not exhaustive security or medical review.',inventory};
await mkdir(path.join(ROOT,'docs/qa'),{recursive:true});await writeFile(path.join(ROOT,'docs/qa/file-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({maintainedFiles:report.maintainedFiles,publicFiles:report.publicFiles,issues},null,2));if(issues.length)process.exitCode=1;
