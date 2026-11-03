import {NextResponse,type NextRequest} from 'next/server';
import {checkTestAccess} from './lib/test-access';

// Controlled test deployment: protect pages and APIs before any model call.
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname==='/api/health')return NextResponse.next();
 const password=process.env.TEST_ACCESS_PASSWORD;
 if(process.env.NODE_ENV!=='production'&&!password)return NextResponse.next();
 try{
 const result=checkTestAccess(password,request.headers.get('authorization'));
 if(process.env.AUTH_DIAGNOSTICS==='true')console.info(JSON.stringify({event:'test_access',version:2,result}));
 if(result.startsWith('CONFIG_'))return new NextResponse('Test access configuration needs attention.',{status:503,headers:{'Cache-Control':'no-store'}});
 if(result!=='OK')return new NextResponse('Private test. Authentication required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="TrainBetter Test", charset="UTF-8"','Cache-Control':'no-store'}});
 const response=NextResponse.next();response.headers.set('Cache-Control','private, no-store');return response;
 }catch{
 if(process.env.AUTH_DIAGNOSTICS==='true')console.error(JSON.stringify({event:'test_access',version:2,result:'AUTH_INTERNAL'}));
 return new NextResponse('Test access unavailable.',{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
