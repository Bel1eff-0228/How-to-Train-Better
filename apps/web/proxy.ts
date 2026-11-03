import {NextResponse,type NextRequest} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';

// Controlled test deployment: protect pages and APIs before any model call.
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname==='/api/health')return NextResponse.next();
 const password=process.env.TEST_ACCESS_PASSWORD;
 if(process.env.NODE_ENV!=='production'&&!password)return NextResponse.next();
 if(!password||password.length<20)return new NextResponse('Test access is not configured.',{status:503,headers:{'Cache-Control':'no-store'}});
 const header=request.headers.get('authorization')??'';
 const expected=createHash('sha256').update(`tester:${password}`).digest();
 const supplied=header.startsWith('Basic ')&&header.length<2048?Buffer.from(header.slice(6),'base64').toString('utf8'):'';
 if(!timingSafeEqual(expected,createHash('sha256').update(supplied).digest()))return new NextResponse('Private test. Authentication required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="TrainBetter Test", charset="UTF-8"','Cache-Control':'no-store'}});
 return NextResponse.next();
}
