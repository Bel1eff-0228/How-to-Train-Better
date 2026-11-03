import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {profileSchema,type Plan} from '../plan';
import {create_training_plan,revise_training_plan} from './agent';
import {AgentError} from './errors';
let start=0,count=0,active=0;
function secret(){const s=process.env.PLAN_SIGNING_SECRET;if(!s||s.length<32)throw new AgentError('NOT_CONFIGURED','服务端计划签名尚未配置。',503);return s;}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('hex');}
export async function handle(request:Request,revise=false){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AgentError('ORIGIN','请求来源不允许。',403);
  if(Date.now()-start>60000){start=Date.now();count=0;}if(++count>20||active>=3)throw new AgentError('RATE_LIMIT','请求较多，请稍后重试。',429);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AgentError('INPUT','需要JSON请求。',400);
  const reader=request.body?.getReader();if(!reader)throw new AgentError('INPUT','请求为空。',400);let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>40000){await reader.cancel();throw new AgentError('SIZE','请求过大。',413);}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  secret();active++;
  try{
   let plan:Plan;
   if(revise){const input=z.object({token:z.string().max(35000),message:z.string().min(1).max(500)}).strict().parse(body);const [encoded,signature]=input.token.split('.');const expected=sign(encoded);if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new AgentError('INVALID_STATE','原计划验证失败，请重新生成。',400);
    const old=JSON.parse(Buffer.from(encoded,'base64url').toString()) as {plan:Plan;expires:number};if(old.expires<Date.now())throw new AgentError('EXPIRED','计划已过期，请重新生成。',400);plan=await revise_training_plan(old.plan,input.message);
   }else{const input=z.object({profile:profileSchema,adultConfirmed:z.literal(true)}).strict().parse(body);plan=await create_training_plan(input.profile);}
   const encoded=Buffer.from(JSON.stringify({plan,expires:Date.now()+86400000})).toString('base64url');return Response.json({...plan,token:encoded+'.'+sign(encoded)},{headers:{'Cache-Control':'no-store'}});
  }finally{active--;}
 }catch(e){if(e instanceof AgentError)return Response.json({error:e.message,code:e.code},{status:e.status});if(e instanceof z.ZodError||e instanceof SyntaxError)return Response.json({error:'输入或模型结构校验失败，请检查条件后重试。',code:'SCHEMA_ERROR'},{status:422});return Response.json({error:'服务暂时无法完成请求，原计划未修改。',code:'INTERNAL_ERROR'},{status:500});}
}
