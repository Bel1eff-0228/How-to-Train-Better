import {createHash,timingSafeEqual} from 'node:crypto';
export function checkTestAccess(password:string|undefined,header:string|null){
 if(!password)return 'CONFIG_MISSING';
 if(password.length<20)return 'CONFIG_TOO_SHORT';
 // Flag copy/paste mistakes rather than silently changing the secret.
 if(password!==password.trim()||/[\r\n\u0000]/.test(password)||/^['"]|['"]$/.test(password))return 'CONFIG_FORMAT';
 if(!header)return 'HEADER_MISSING';
 const match=/^Basic +([A-Za-z0-9+/]+={0,2})$/i.exec(header);
 if(header.length>2048||!match)return 'HEADER_INVALID';
 const bytes=Buffer.from(match[1],'base64');
 if(bytes.toString('base64').replace(/=+$/,'')!==match[1].replace(/=+$/,''))return 'HEADER_INVALID';
 let decoded:string;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return 'HEADER_INVALID';}
 const colon=decoded.indexOf(':');if(colon<0)return 'HEADER_INVALID';
 const user=decoded.slice(0,colon),supplied=decoded.slice(colon+1);
 const equal=timingSafeEqual(createHash('sha256').update(password).digest(),createHash('sha256').update(supplied).digest());
 if(user!=='tester')return 'USERNAME_MISMATCH';
 return equal?'OK':'PASSWORD_MISMATCH';
}
