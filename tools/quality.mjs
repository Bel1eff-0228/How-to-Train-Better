import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {corpusFingerprint} from './evaluation.mjs';
export async function loadQuality(root,corpus){
  const cases=await readFile(path.join(root,'evaluation/cases.json'),'utf8'),skill=await readFile(path.join(root,'skills/train-better-guide/SKILL.md'),'utf8'),total=JSON.parse(cases).cases.length;
  const fingerprint=corpusFingerprint({parts:corpus.parts,skill,cases});
  let report;try{report=JSON.parse(await readFile(path.join(root,'evaluation/reports/current.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!report)return {total,status:'not_run',message:`问答题集共 ${total} 题，目前尚无本轮评测报告。`};
  if(report.fingerprint!==fingerprint)return {total,status:'stale',message:`正文、技能或题集已改变，之前的问答报告需要重跑。当前题集共 ${total} 题。`};
  return {total,status:'current',fingerprint,runId:report.runId,answered:report.answered,passed:report.passed,failed:report.failed,pending:report.pending,notRun:report.notRun,independent:report.independent,message:`问答题集共 ${total} 题；本轮实际回答 ${report.answered} 题，复核通过 ${report.passed} 题，未通过 ${report.failed} 题，待复核 ${report.pending} 题，未运行 ${report.notRun} 题。`};
}
