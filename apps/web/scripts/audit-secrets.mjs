// Read-only heuristic scan: prints paths/object IDs only, never matched values.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
const root=path.resolve('../..');
const local=parseEnv(fs.readFileSync('.env.local','utf8'));
const secrets=[local.MODEL_API_KEY,local.PLAN_SIGNING_SECRET].filter(x=>x&&x.length>=16);
function suspicious(s){return secrets.some(x=>s.includes(x))||/\bsk-[A-Za-z0-9_-]{24,}\b/.test(s)||/(?:MODEL_API_KEY|PLAN_SIGNING_SECRET)\s*=\s*["']?[a-f0-9]{32,}/i.test(s);}
const excluded=new Set(['.cache','node_modules','.next','.git','output','dist','tmp']);
let files=0;const hits=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(excluded.has(e.name)||e.isSymbolicLink())continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(!e.name.startsWith('.env')&&/\.(?:ts|tsx|js|mjs|json|md|yml|yaml|ps1|py|txt)$/.test(e.name)&&fs.statSync(p).size<2e6){files++;if(suspicious(fs.readFileSync(p,'utf8')))hits.push(path.relative(root,p));}}}
walk(root);console.log(JSON.stringify({scope:'current-source',files,hits,excludes:[...excluded],envLocalDeliberatelyExcluded:true}));
for(const repo of ['.cache/recovered-origin','.cache/pages-publish']){
 const cwd=path.join(root,repo);if(!fs.existsSync(path.join(cwd,'.git')))continue;
 const git=(args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024,stdio:['pipe','pipe','ignore']});
 let blobs=0;const findings=[];
 for(const line of git(['rev-list','--objects','--all','--reflog']).trim().split('\n')){
  const [oid,...parts]=line.split(' '),name=parts.join(' ');
  if(!name||!/(?:\.env[^/]*|\.(?:ts|tsx|js|mjs|json|md|yml|yaml|ps1|py|txt))$/.test(name))continue;
  if(git(['cat-file','-t',oid]).trim()!=='blob'||Number(git(['cat-file','-s',oid]))>2e6)continue;
  blobs++;if(suspicious(git(['cat-file','blob',oid])))findings.push({oid,path:name});
 }
 const trackedEnv=git(['ls-files']).split('\n').filter(x=>/(^|\/)\.env(?:\.|$)/.test(x)&&!x.endsWith('.example'));
 console.log(JSON.stringify({scope:repo,shallow:git(['rev-parse','--is-shallow-repository']).trim(),blobs,findings,trackedEnv}));
}
// Test the current ignore file without initializing/modifying a repository.
const ignoreRepo=path.join(root,'.cache/recovered-origin');
const result=execFileSync('git',['--git-dir='+path.join(ignoreRepo,'.git'),'--work-tree='+root,'check-ignore','--no-index','apps/web/.env.local'],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','ignore']});
console.log(JSON.stringify({envLocalMatchesCurrentIgnore:result.trim()==='apps/web/.env.local',rootHasGit:fs.existsSync(path.join(root,'.git'))}));
