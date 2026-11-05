import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {profileSchema} from '../plan';
import {profileSchema as modernProfileSchema,TrainingConflict} from '../training/schema';
import {type CompatiblePlan,previousPlan} from './contract';
import {type ModelCall} from './model';
import {create_training_plan,revise_training_plan} from './agent';
import {AgentError} from './errors';
import {validateOrigin} from './origin';
let start=0,count=0,active=0;
export const MAX_REQUEST_BYTES=40000;
export const MAX_TOKEN_CHARS=35000;
function secret(){const s=process.env.PLAN_SIGNING_SECRET;if(!s||s.length<32)throw new AgentError('NOT_CONFIGURED','服务端计划签名尚未配置。',503);return s;}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('hex');}
export async function handle(request:Request,revise=false,model?:ModelCall){
 try{
  validateOrigin(request);
  if(Date.now()-start>60000){start=Date.now();count=0;}if(++count>20||active>=3)throw new AgentError('RATE_LIMIT','请求较多，请稍后重试。',429);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AgentError('INPUT','需要JSON请求。',400);
  const reader=request.body?.getReader();if(!reader)throw new AgentError('INPUT','请求为空。',400);let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_REQUEST_BYTES){await reader.cancel();throw new AgentError('SIZE','请求过大。',413);}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  secret();active++;
  try{
   let plan:CompatiblePlan,apiVersion:'2.0'|'2.1'='2.0';
   if(revise){const input=z.object({token:z.string().max(MAX_TOKEN_CHARS),message:z.string().min(1).max(500),apiVersion:z.enum(['2.0','2.1']).optional()}).strict().parse(body);const parts=input.token.split('.');const [encoded,signature]=parts;const expected=sign(encoded);if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(encoded)||!signature||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new AgentError('INVALID_STATE','原计划验证失败，请重新生成。',400);
    const old=z.object({plan:z.unknown(),expires:z.number().finite(),apiVersion:z.enum(['2.0','2.1']).optional()}).strict().parse(JSON.parse(Buffer.from(encoded,'base64url').toString()));
    if(old.expires<Date.now())throw new AgentError('EXPIRED','计划已过期，请重新生成。',400);
    previousPlan(old.plan);apiVersion=input.apiVersion??old.apiVersion??'2.0';plan=await revise_training_plan(old.plan,input.message,model);
   }else{
    const input=z.union([z.object({apiVersion:z.literal('2.1'),profile:modernProfileSchema,adultConfirmed:z.literal(true)}).strict(),z.object({apiVersion:z.literal('2.0').optional(),profile:profileSchema.strict(),adultConfirmed:z.literal(true)}).strict()]).parse(body);
    apiVersion=input.apiVersion??'2.0';plan=await create_training_plan(input.profile,model);
   }
   const encoded=Buffer.from(JSON.stringify({plan:plan.trainingPlan,expires:Date.now()+86400000,apiVersion})).toString('base64url');
   const token=encoded+'.'+sign(encoded);if(token.length>MAX_TOKEN_CHARS)throw new AgentError('PLAN_SIZE','计划超过传输上限，请减少复杂条件。',422);
   return Response.json({...apiVersion==='2.1'?plan.trainingPlan:plan,token},{headers:{'Cache-Control':'no-store'}});
  }finally{active--;}
 }catch(e){if(e instanceof TrainingConflict)return Response.json({error:e.message,code:e.code,options:e.code==='TIME_CONFLICT'?['增加单次时间','调整分化偏好','确认更多实际可用器械']:['检查实际器械、频率和限制','修改条件后重新提交']},{status:422});if(e instanceof AgentError)return Response.json({error:e.message,code:e.code},{status:e.status});if(e instanceof z.ZodError||e instanceof SyntaxError)return Response.json({error:'输入或模型结构校验失败，请检查条件后重试。',code:'SCHEMA_ERROR'},{status:422});return Response.json({error:'服务暂时无法完成请求，原计划未修改。',code:'INTERNAL_ERROR'},{status:500});}
}
