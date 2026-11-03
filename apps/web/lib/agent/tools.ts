import {z} from 'zod';
import {profileSchema,type Profile,type Plan} from '../plan';
import {AgentError} from './errors';
export const exercises=[
 {id:'db-squat',name:'哑铃杯式深蹲',equipment:'哑铃',pattern:'腿'},
 {id:'db-press',name:'哑铃地板卧推',equipment:'哑铃',pattern:'推'},
 {id:'db-row',name:'单臂哑铃划船',equipment:'哑铃',pattern:'拉'},
 {id:'leg-press',name:'器械腿举',equipment:'健身房',pattern:'腿'},
 {id:'chest-press',name:'器械推胸',equipment:'健身房',pattern:'推'},
 {id:'cable-row',name:'坐姿划船',equipment:'健身房',pattern:'拉'},
 {id:'sit-stand',name:'椅子坐站',equipment:'徒手',pattern:'腿'},
 {id:'wall-push',name:'墙壁俯卧撑',equipment:'徒手',pattern:'推'},
 {id:'bridge',name:'臀桥',equipment:'徒手',pattern:'髋'}
] as const;
export function select_exercises(input:Profile){const p=profileSchema.parse(input);return exercises.filter(e=>e.equipment===p.equipment);}
export function safety(text:string){if(/pain|injur|pregnan|under.?18|faint|starv|疼|痛|伤|病|孕|未成年|中学生|小学生|脱水|断食|绝食|极端|胸闷|呼吸困难|麻木|晕|心脏|手术|康复|高血压|糖尿|[0-9一二三四五六七八九十]+岁/.test(text))throw new AgentError('SAFETY_STOP','暂停计划生成或调整：请停止引起不适的动作。疼痛、疾病、损伤或特殊人群需要专业评估；胸痛伴气促或晕厥请及时寻求当地急救。原计划未修改。');}
export const draftSchema=z.object({safe:z.boolean(),days:z.array(z.object({exerciseIds:z.array(z.string().max(40)).min(3).max(6)}).strict()).min(2).max(6),sourceIds:z.array(z.string()).min(1).max(6)}).strict();
export type Draft=z.infer<typeof draftSchema>;
export function rejectInjection(text:string){if(/忽略.{0,12}(指令|规则|系统)|泄露|api.?key|system.?prompt|ignore.{0,20}(instruction|rule)|<script/i.test(text))throw new AgentError('UNSUPPORTED_INPUT','请求包含与训练无关的指令，本次不处理。');}
export function estimate_minutes(count:number,sets:number,reps:number,rest:number){return Math.ceil(8+count*(sets*reps*6+(sets-1)*rest+90)/60);}
export function dose(p:Profile,count:number){
 const reps=p.goal==='提升体能'?12:10;
 let sets=p.experience==='进阶'?3:2;
 while(sets>1&&estimate_minutes(count,sets,reps,90)>p.minutes)sets--;
 return {sets,reps,minutes:estimate_minutes(count,sets,reps,90)};
}
export function estimate_budget_options(p:Profile){profileSchema.parse(p);return {requiredPurchases:[],extraCost:0,explanation:'使用已有器械，不要求购买补剂、私教或新器械。现有会费不计入额外支出。'};}
export function validate_training_plan(input:{profile:Profile;draft:unknown;sourceIds:string[]}){
 const p=profileSchema.parse(input.profile),d=draftSchema.parse(input.draft),allowed=select_exercises(p);
 if(!d.safe)throw new AgentError('SAFETY_STOP','模型识别到限制或风险，本次不生成计划，请补充条件或寻求专业评估。');
 if(d.days.length!==p.days)throw new AgentError('INVALID_PLAN','模型日程不符合训练天数，请重试。');
 if(d.sourceIds.some(id=>!input.sourceIds.includes(id)))throw new AgentError('INVALID_SOURCE','模型引用不在本次检索结果中。');
 for(const day of d.days){if(new Set(day.exerciseIds).size!==day.exerciseIds.length||day.exerciseIds.some(id=>!allowed.some(e=>e.id===id)))throw new AgentError('INVALID_EXERCISE','动作不存在、重复或器械条件不符。');if(dose(p,day.exerciseIds.length).minutes>p.minutes)throw new AgentError('TIME_LIMIT','计划超过单次时间限制。');}
 return d;
}
export function build_training_plan(input:{profile:Profile;draft:unknown;sourceIds:string[];version:number;changes?:string[]}):Plan{
 const d=validate_training_plan(input),p=input.profile,allowed=select_exercises(p);
 const labels:Record<number,string[]>={2:['周一','周四'],3:['周一','周三','周五'],4:['周一','周二','周四','周六'],5:['周一','周二','周三','周五','周六'],6:['周一','周二','周三','周四','周五','周六']};
 return {mode:'ai',version:input.version,profile:p,changes:input.changes??[],reasons:[`根据你的${p.equipment}条件选择动作，按每周${p.days}天排布。`,'组次是保守的编辑起点，不是研究验证的个人最优负荷；选择还能保留2–3次余力的重量，不追求力竭。','时长按每次动作6秒、组间90秒、转场及8分钟准备估算；实际耗时因人而异，超时结束而非赶动作。',estimate_budget_options(p).explanation,'恢复良好、动作稳定后再逐步调整；一般健身信息，不是医疗诊断。'],days:d.days.map((day,i)=>({label:labels[p.days][i],focus:i%2?'轻量练习（保留余力）':'全身力量基础',minutes:dose(p,day.exerciseIds.length).minutes,exercises:day.exerciseIds.map(id=>{const e=allowed.find(e=>e.id===id)!;return {name:e.name,sets:p.days>3&&i%2===1?1:dose(p,day.exerciseIds.length).sets,reps:`${dose(p,day.exerciseIds.length).reps} 次（单侧动作每侧）`,rest:'90 秒',alternative:`降低${e.equipment==='徒手'?'动作难度或幅度':'重量'}；仍不适则停止，不强行替换`};})}))};
}
