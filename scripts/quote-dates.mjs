import { readFile, writeFile } from 'node:fs/promises';

const file = 'src/data/sources.yaml';
const text = await readFile(file, 'utf8');
await writeFile(file, text.replace(/accessedAt: (\d{4}-\d{2}-\d{2})/g, 'accessedAt: "$1"'));
console.log('quoted dates');
