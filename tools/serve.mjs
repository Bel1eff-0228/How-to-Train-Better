import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {ROOT} from './build.mjs';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.cjs':'text/javascript','.md':'text/plain','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name.split(/[\\/]/).some(part=>part.startsWith('.'))||/^\/(evaluation|node_modules)(\/|$)/.test(name)){res.writeHead(403);res.end();return;}
    const file=path.resolve(ROOT,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(ROOT+path.sep)) {res.writeHead(403);res.end();return;}
    if(!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(file));
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('没有找到这个文件');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`本地阅读：http://127.0.0.1:${server.address().port}`));
