import {loadBook} from '../../../tools/build.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {sections}=await loadBook();
const skill=await readFile(new URL('../../../skills/train-better-guide/SKILL.md',import.meta.url),'utf8');
const entries=sections.flatMap(s=>s.entries).map(({hay,...e})=>e);
await mkdir(new URL('../generated/',import.meta.url),{recursive:true});
await writeFile(new URL('../generated/knowledge.json',import.meta.url),JSON.stringify({skillPath:'skills/train-better-guide/SKILL.md',skillHash:createHash('sha256').update(skill).digest('hex'),entries},null,2));
console.log(`Indexed ${entries.length} entries; full fields preserved.`);
