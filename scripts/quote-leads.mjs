import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

for (const file of await walk('src/content')) {
  const original = await readFile(file, 'utf8');
  const parts = original.split('---');
  if (parts.length < 3) continue;
  const fm = parts[1]
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*[\w]+):\s+(.*)$/);
      if (!match) return line;
      const [, key, value] = match;
      if (!value || value.startsWith('"') || value.startsWith("'") || value.startsWith('[') || value.startsWith('{')) {
        return line;
      }
      if (value.includes(':')) {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return line;
    })
    .join('\n');
  await writeFile(file, `---${fm}---${parts.slice(2).join('---')}`);
}
console.log('quoted frontmatter scalars with colons');
