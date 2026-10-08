import {readFile,writeFile,readdir,mkdir,copyFile,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest} from './evaluation.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folders=['assets','book','dist','docs','skills','tools','tests','evaluation','licenses','.github'];
const files=['AGENTS.md','README.md','CHANGELOG.md','CONTRIBUTING.md','package.json','index.html','LICENSE','LICENSE-CODE','.gitignore'];
async function collect(root){const out=[];async function walk(rel){for(const item of await readdir(path.join(root,rel),{withFileTypes:true})){const p=(rel+'/'+item.name).replaceAll('\\','/');if(p==='evaluation/private'||item.name.startsWith('.'))continue;if(item.isSymbolicLink())throw Error('发布文件不能是符号链接：'+p);if(item.isDirectory())await walk(p);else if(item.isFile())out.push(p);}}for(const folder of folders)await walk(folder);for(const f of files){if((await lstat(path.join(root,f))).isSymbolicLink())throw Error('发布文件不能是符号链接：'+f);out.push(f);}return out.sort();}
export async function verifySnapshot(dir){
  const manifest=JSON.parse(await readFile(path.join(dir,'snapshot.json'),'utf8')),errors=[];
  if(manifest.schema!==1||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('快照清单无效');
  const seen=new Set();for(const item of manifest.files){if(typeof item.path!=='string'||path.isAbsolute(item.path)||item.path.includes('\\')||item.path.split('/').some(p=>p==='..'||p==='.')||seen.has(item.path))throw Error('快照路径非法或重复');seen.add(item.path);const full=path.resolve(dir,item.path);if(!full.startsWith(path.resolve(dir)+path.sep))throw Error('快照路径越界');try{if((await lstat(full)).isSymbolicLink())throw Error('符号链接');const bytes=await readFile(full);if(bytes.length!==item.bytes||digest(bytes)!==item.sha256)errors.push(item.path+' 内容已改变');}catch{errors.push(item.path+' 缺失或不可读取');}}
  if(digest(JSON.stringify(manifest.files))!==manifest.fingerprint)errors.push('快照清单指纹不一致');return {manifest,errors};
}
export async function snapshot(root=ROOT){
  const entries=[];for(const rel of await collect(root)){const bytes=await readFile(path.join(root,rel));entries.push({path:rel,bytes:bytes.length,sha256:digest(bytes)});}
  const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('版本号格式无效');
  const fingerprint=digest(JSON.stringify(entries)),dir=path.join(root,'.cache/releases',`v${version}-${fingerprint.slice(0,12)}`);
  await mkdir(dir,{recursive:true});for(const item of entries){const dest=path.join(dir,item.path);await mkdir(path.dirname(dest),{recursive:true});try{await copyFile(path.join(root,item.path),dest,constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;if(digest(await readFile(dest))!==item.sha256)throw Error('已有快照被修改，拒绝覆盖：'+dest);}}
  const manifest={schema:1,version,fingerprint,files:entries};try{await writeFile(path.join(dir,'snapshot.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  const result=await verifySnapshot(dir);if(result.errors.length)throw Error(result.errors.join('\n'));return {dir,...result};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{if(process.argv[2]==='--verify'){if(!process.argv[3])throw Error('请提供快照目录');const r=await verifySnapshot(path.resolve(process.argv[3]));if(r.errors.length)throw Error(r.errors.join('\n'));console.log(`快照校验通过：${r.manifest.files.length} 个文件。`);}else if(process.argv.length===2){const r=await snapshot();console.log(`已保存并校验 ${r.manifest.files.length} 个文件：${r.dir}`);}else throw Error('用法：node tools/snapshot.mjs [--verify 快照目录]');}catch(e){console.error(e.message);process.exitCode=1;}
}
