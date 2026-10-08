// Export parsed canonical content for document builders. MIT.
import {loadBook,ROOT} from './build.mjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import Reading from './reading.cjs';
import profile from '../assets/profile.cjs';
const book=await loadBook();
const entries=book.sections.flatMap(s=>s.entries.map(e=>({...e,section:s.n})));
process.stdout.write(JSON.stringify({version:JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8')).version,profile,sections:book.sections,pitfalls:Reading.myths.map(id=>entries.find(e=>e.id===id))}));
