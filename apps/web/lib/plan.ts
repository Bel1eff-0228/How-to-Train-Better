import { z } from 'zod';
export const profileSchema = z.object({goal:z.enum(['增肌','减脂','提升体能']),experience:z.enum(['新手','初级','进阶']),days:z.number().int().min(2).max(6),minutes:z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(75),z.literal(90)]),equipment:z.enum(['健身房','哑铃','徒手']),budget:z.number().min(0,'预算不能为负数').max(100000,'请填写合理预算'),notes:z.string().max(500,'补充说明最多500字')});
export type Profile=z.infer<typeof profileSchema>;
export type Exercise={name:string;sets:number;reps:string;rest:string;alternative:string};
export type Day={label:string;focus:string;minutes:number;exercises:Exercise[]};
export type Plan={version:number;profile:Profile;days:Day[];reasons:string[];changes:string[];mode:'demo'|'ai';token?:string;sources?:{id:string;title:string;path:string;chapter:string;item:string;source:string;verified:string;flags:string[]}[]};
export const initialProfile:Profile={goal:'增肌',experience:'新手',days:3,minutes:45,equipment:'健身房',budget:0,notes:''};
const catalog:Record<Profile['equipment'],string[][]>={健身房:[['坐姿腿举','徒手坐站'],['器械推胸','墙壁俯卧撑'],['坐姿划船','弹力带划船']],哑铃:[['哑铃杯式深蹲','徒手坐站'],['哑铃地板卧推','墙壁俯卧撑'],['单臂哑铃划船','轻重量双臂划船']],徒手:[['椅子坐站','扶椅浅蹲'],['墙壁俯卧撑','更靠近墙站立'],['臀桥','缩小动作幅度']]};
export function makePlan(raw:Profile,version=1,changes:string[]=[]):Plan{
 const profile=profileSchema.parse(raw);
 if(profile.notes.trim()) throw new Error('当前演示无法评估个人限制或补充说明，因此不会据此生成计划。请保留这些信息，等待接入真实评估；仅体验界面时可以清空说明。');
 const weekdays:Record<number,string[]>={2:['周一','周四'],3:['周一','周三','周五'],4:['周一','周二','周四','周六'],5:['周一','周二','周三','周五','周六'],6:['周一','周二','周三','周四','周五','周六']};
 return {mode:'demo',version,profile,changes,days:weekdays[profile.days].map((label,i)=>({label,focus:i%2===0?'力量基础 · 示例':'轻松活动 · 示例',minutes:profile.minutes,exercises:i%2===0?catalog[profile.equipment].map(([name,alternative])=>({name,alternative,sets:2,reps:'8–12 次（演示）',rest:'60–90 秒'})):[{name:'轻松步行',alternative:'舒适的原地踏步',sets:1,reps:'按实际耐受调整',rest:'需要时休息'}]})),reasons:[`按每周 ${profile.days} 天、每次 ${profile.minutes} 分钟展示日程；时长为输入上限，不是已计算的训练耗时。`,`动作卡片来自固定开发模板，器械选择为「${profile.equipment}」。`,`目标「${profile.goal}」和经验「${profile.experience}」已记录，但本阶段不据此生成个性化负荷。`,`每月额外预算 ¥${profile.budget} 已记录；演示不推荐额外购买，也未计算真实成本。`]};
}
export function revisePlan(plan:Plan,input:string):Plan{
 const text=input.trim(); if(!text||text.length>200)throw new Error('请输入1—200字的调整要求。');
 const days=text.match(/^(?:我)?(?:这周|每周)?(?:只能|只想|可以|想)?(?:练|训练)([二两三四五六2-6])(?:次|天)[。！!]?$/);
 const minutes=text.match(/^(?:每次|单次)(?:只有|改成|改为)?(30|45|60|75|90)分钟[。！!]?$/);
 const equipment=text.match(/^(?:只有|改成|改为|只用)(哑铃|徒手|健身房)[。！!]?$/);
 const next={...plan.profile};let change='';
 if(days){const n:Record<string,number>={二:2,两:2,三:3,四:4,五:5,六:6};next.days=n[days[1]]??Number(days[1]);change=`每周训练：${plan.profile.days} 天 → ${next.days} 天`;}
 else if(minutes){next.minutes=Number(minutes[1]) as Profile['minutes'];change=`单次时间：${plan.profile.minutes} 分钟 → ${next.minutes} 分钟`;}
 else if(equipment){next.equipment=equipment[1] as Profile['equipment'];change=`可用器械：${plan.profile.equipment} → ${next.equipment}`;}
 else throw new Error('演示仅支持一次调整一个条件，例如“我这周只能练两次”“每次只有30分钟”“只有哑铃”。其他要求暂不处理，原计划已保留。');
 if(JSON.stringify(next)===JSON.stringify(plan.profile))throw new Error('这个条件与当前计划一致，无需修改。');
 return makePlan(next,plan.version+1,[change,'其余输入条件保持不变；按固定演示模板重新排布日程。']);
}
