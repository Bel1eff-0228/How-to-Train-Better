import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadBook,ROOT} from './build.mjs';
import {evaluate,corpusFingerprint} from './evaluation.mjs';
export async function runEvaluation({answersPath,reviewPath,out='evaluation/reports/current'}={}){
  const book=await loadBook(),casesText=await readFile(path.join(ROOT,'evaluation/cases.json'),'utf8'),skill=await readFile(path.join(ROOT,'skills/train-better-guide/SKILL.md'),'utf8');
  const readJSON=async p=>p?JSON.parse(await readFile(path.resolve(ROOT,p),'utf8')):undefined;
  const result=evaluate({suite:JSON.parse(casesText),entries:book.sections.flatMap(s=>s.entries),answers:await readJSON(answersPath),review:await readJSON(reviewPath),fingerprint:corpusFingerprint({parts:book.parts,skill,cases:casesText})});
  result.version=JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8')).version;
  const output=path.resolve(ROOT,out);if(!output.startsWith(ROOT+path.sep))throw Error('报告必须保存于项目内');
  await mkdir(path.dirname(output),{recursive:true});await writeFile(output+'.json',JSON.stringify(result,null,2)+'\n');
  const names={not_run:'未运行',pending_review:'待复核',stale_review:'答案或依据已变，需重评',failed:'未通过',passed:'本轮复核通过'};
  const md=`# 问答评测报告\n\n版本：${result.version}；运行：${result.runId||'尚无答卷'}。\n\n总计 ${result.total} 题；实际回答 ${result.answered}；本轮复核通过 ${result.passed}；未通过 ${result.failed}；待复核 ${result.pending}；未运行 ${result.notRun}。\n\n答题者：${result.producer||'无'}；独立答题标记：${result.independent?'是':'否'}；复核者：${result.reviewer||'无'}。独立标记由运行记录声明，不代表外部专业认证。\n\n自动检查只核对结构和引用入口，语义评分由复核者填写。通过只适用于本次已测题目，不外推为所有问题通过。未运行题不计入通过。\n\n| 题号 | 类别 | 状态 | 备注 |\n| --- | --- | --- | --- |\n`+result.cases.map(c=>`| ${c.id} | ${c.category} | ${names[c.status]} | ${(c.notes||c.checks?.errors.join('；')||'—').replace(/\|/g,'／').replace(/\n/g,' ')} |`).join('\n')+`\n\n知识与技能指纹：\`${result.fingerprint}\`。正文、技能或题集改变后，应重新运行评测；旧报告不自动代表新版本。\n`;
  await writeFile(output+'.md',md);console.log(`评测：${result.answered}/${result.total} 题有答卷，${result.passed} 题复核通过，${result.failed} 题未通过，${result.pending} 题待复核。`);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i+=2){const map={'--answers':'answersPath','--review':'reviewPath','--out':'out'};if(!map[args[i]]||!args[i+1])throw Error('用法：node tools/evaluate.mjs [--answers 答卷.json] [--review 复核.json] [--out 报告路径前缀]');opts[map[args[i]]]=args[i+1];}if(!opts.answersPath){opts.answersPath='evaluation/runs/baseline.answers.json';opts.reviewPath='evaluation/runs/baseline.review.json';}const r=await runEvaluation(opts);if(r.failed)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
}
