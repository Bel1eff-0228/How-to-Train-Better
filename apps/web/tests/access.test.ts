import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proxy} from '../proxy';
test('生产访问保护：缺失配置拒绝，页面/API需认证，健康检查不调用模型',()=>{
 const env=process.env as Record<string,string|undefined>,old=env.NODE_ENV,key=env.TEST_ACCESS_PASSWORD;
 try{env.NODE_ENV='production';delete env.TEST_ACCESS_PASSWORD;
 assert.equal(proxy(new NextRequest('https://test.example/')).status,503);
 assert.equal(proxy(new NextRequest('https://test.example/api/health')).status,200);
 env.TEST_ACCESS_PASSWORD='test-only-password-more-than-20';
 for(const path of ['/','/api/plan/create','/api/plan/revise']){
 assert.equal(proxy(new NextRequest('https://test.example'+path)).status,401);
 const authorization:string='Basic '+Buffer.from('tester:'+env.TEST_ACCESS_PASSWORD).toString('base64');
 assert.equal(proxy(new NextRequest('https://test.example'+path,{headers:{authorization}})).status,200);
 }
 }finally{if(old===undefined)delete env.NODE_ENV;else env.NODE_ENV=old;if(key===undefined)delete env.TEST_ACCESS_PASSWORD;else env.TEST_ACCESS_PASSWORD=key;}
});
