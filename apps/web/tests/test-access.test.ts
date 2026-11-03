import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkTestAccess} from '../lib/test-access';
const password='fixture-only-password:with-colon';
const auth=(user='tester',p=password)=>'Basic '+Buffer.from(user+':'+p).toString('base64');
test('认证分别定位配置、用户名、密码和请求头问题',()=>{
 assert.equal(checkTestAccess(undefined,null),'CONFIG_MISSING');
 assert.equal(checkTestAccess('short',null),'CONFIG_TOO_SHORT');
 for(const p of [' '+password,password+'\n','"'+password+'"'])assert.equal(checkTestAccess(p,null),'CONFIG_FORMAT');
 assert.equal(checkTestAccess(password,null),'HEADER_MISSING');
 for(const h of ['Bearer abc','Basic !!!','Basic '+Buffer.from('no-colon').toString('base64'),'Basic /w=='])assert.equal(checkTestAccess(password,h),'HEADER_INVALID');
 assert.equal(checkTestAccess(password,auth('Tester')),'USERNAME_MISMATCH');
 assert.equal(checkTestAccess(password,auth('tester','incorrect')),'PASSWORD_MISMATCH');
 assert.equal(checkTestAccess(password,auth()),'OK');
 assert.equal(checkTestAccess(password,auth().replace('Basic ','basic   ')),'OK');
});
