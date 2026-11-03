import {AgentError} from './errors';

export function validateOrigin(request:Request){
 const internal=new URL(request.url);
 const configured=process.env.APP_ORIGIN;
 let allowed:string;
 if(configured){
  let url:URL;try{url=new URL(configured);}catch{throw new AgentError('ORIGIN_CONFIG','服务端访问来源尚未正确配置。',503);}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new AgentError('ORIGIN_CONFIG','服务端访问来源尚未正确配置。',503);
  allowed=url.origin;
 }else{
  if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(internal.hostname))throw new AgentError('ORIGIN_CONFIG','服务端访问来源尚未正确配置。',503);
  allowed=internal.origin;
 }
 const origin=request.headers.get('origin');
 const accepted=origin===allowed;
 if(process.env.ORIGIN_DIAGNOSTICS==='true'){
  const external=new URL(allowed);
  // Only relationship booleans: never log raw headers, cookies or request bodies.
  console.info(JSON.stringify({event:'origin_check',configured:!!configured,originPresent:!!origin,accepted,
   requestUrlMatches:internal.origin===allowed,
   hostMatches:request.headers.get('host')===external.host,
   forwardedHostMatches:request.headers.get('x-forwarded-host')===external.host,
   forwardedProtoMatches:request.headers.get('x-forwarded-proto')===external.protocol.slice(0,-1)}));
 }
 if(!accepted)throw new AgentError('ORIGIN','请求来源不允许。',403);
}
