import corpus from '../../generated/knowledge.json';
import {z} from 'zod';
export function retrieve_fitness_knowledge(input:{query:string;limit?:number}){
 const {query,limit}=z.object({query:z.string().min(1).max(1000),limit:z.number().int().min(1).max(8).default(6)}).parse(input);
 const terms=query.split(/[\s，、]+/).filter(Boolean);
 return corpus.entries.map(e=>({...e,score:terms.reduce((n,t)=>n+(JSON.stringify(e).includes(t)?1:0),0),flags:[...(e.grade==='C'?['编辑实践建议，非已验证最优方案']:[]),...(e.dispute?['存在争议']:[]),...(!e.src?['缺少来源']:[]),...(Date.now()-Date.parse(e.verified)>365*86400000?['超过一年未核验，需复查']:[])]})).filter(e=>e.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
}
