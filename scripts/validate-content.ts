import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import {
  categorySchema,
  recipeSchema,
  sourceSchema,
  subgroupSchema,
  teaSchema,
} from '../src/lib/content/schemas';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

interface Issue {
  file: string;
  message: string;
}

const issues: Issue[] = [];

async function listFiles(dir: string, ext: string[]): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full, ext)));
    } else if (ext.some((item) => entry.name.endsWith(item))) {
      files.push(full);
    }
  }
  return files;
}

function fail(file: string, message: string): void {
  issues.push({ file, message });
}

async function main(): Promise<void> {
  const teaFiles = await listFiles(path.join(root, 'src/content/teas'), ['.md']);
  const categoryFiles = await listFiles(path.join(root, 'src/content/categories'), ['.md']);
  const subgroupFiles = await listFiles(path.join(root, 'src/content/subgroups'), ['.md']);
  const recipeFiles = await listFiles(path.join(root, 'src/data/recipes'), ['.yaml', '.yml']);

  const teas = [];
  const categories = [];
  const subgroups = [];
  const recipes = [];
  const sources = [];

  for (const file of teaFiles) {
    const raw = await readFile(file, 'utf8');
    const { data, content } = matter(raw);
    const parsed = teaSchema.safeParse(data);
    if (!parsed.success) {
      fail(file, parsed.error.issues.map((item) => item.message).join('; '));
      continue;
    }
    if (!content.trim()) fail(file, 'empty article body');
    teas.push(parsed.data);
  }

  for (const file of categoryFiles) {
    const { data } = matter(await readFile(file, 'utf8'));
    const parsed = categorySchema.safeParse(data);
    if (!parsed.success) fail(file, parsed.error.message);
    else categories.push(parsed.data);
  }

  for (const file of subgroupFiles) {
    const { data } = matter(await readFile(file, 'utf8'));
    const parsed = subgroupSchema.safeParse(data);
    if (!parsed.success) fail(file, parsed.error.message);
    else subgroups.push(parsed.data);
  }

  for (const file of recipeFiles) {
    const parsed = recipeSchema.safeParse(parseYaml(await readFile(file, 'utf8')));
    if (!parsed.success) fail(file, parsed.error.issues.map((item) => item.message).join('; '));
    else recipes.push(parsed.data);
  }

  const sourcesRaw = parseYaml(await readFile(path.join(root, 'src/data/sources.yaml'), 'utf8'));
  if (!Array.isArray(sourcesRaw)) {
    fail('src/data/sources.yaml', 'expected an array of sources');
  } else {
    for (const item of sourcesRaw) {
      const parsed = sourceSchema.safeParse(item);
      if (!parsed.success) fail('src/data/sources.yaml', parsed.error.issues.map((issue) => issue.message).join('; '));
      else sources.push(parsed.data);
    }
  }

  const teaIds = new Set(teas.map((item) => item.id));
  const slugs = new Set<string>();
  const recipeIds = new Set(recipes.map((item) => item.id));
  const sourceIds = new Set(sources.map((item) => item.id));
  const subgroupIds = new Set(subgroups.map((item) => item.id));
  const categoryIds = new Set(categories.map((item) => item.id));

  for (const tea of teas) {
    if (slugs.has(tea.slug)) fail(tea.id, `duplicate slug ${tea.slug}`);
    slugs.add(tea.slug);
    if (tea.slug === tea.categoryId) fail(tea.id, 'tea slug collides with category id');
    if (tea.subgroupId && !subgroupIds.has(tea.subgroupId)) {
      fail(tea.id, `missing subgroup ${tea.subgroupId}`);
    }
    if (!categoryIds.has(tea.categoryId)) fail(tea.id, `missing category ${tea.categoryId}`);
    for (const recipeId of tea.recipeIds) {
      if (!recipeIds.has(recipeId)) fail(tea.id, `missing recipe ${recipeId}`);
    }
    for (const sourceId of tea.sources) {
      if (!sourceIds.has(sourceId)) fail(tea.id, `missing source ${sourceId}`);
    }
  }

  for (const recipe of recipes) {
    if (!teaIds.has(recipe.teaId)) fail(recipe.id, `recipe references missing tea ${recipe.teaId}`);
    for (const ref of recipe.sourceRefs) {
      if (!sourceIds.has(ref.sourceId)) fail(recipe.id, `recipe references missing source ${ref.sourceId}`);
    }
  }

  for (const subgroup of subgroups) {
    if (!categoryIds.has(subgroup.categoryId)) {
      fail(subgroup.id, `subgroup references missing category ${subgroup.categoryId}`);
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`× ${issue.file}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Content OK: ${teas.length} teas, ${recipes.length} recipes, ${sources.length} sources, ${categories.length} categories, ${subgroups.length} subgroups.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
