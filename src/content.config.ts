import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  categorySchema,
  guideSchema,
  recipeSchema,
  sourceSchema,
  subgroupSchema,
  teaSchema,
  teawareSchema,
} from './lib/content/schemas';

const teas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/teas' }),
  schema: teaSchema,
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categories' }),
  schema: categorySchema,
});

const subgroups = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/subgroups' }),
  schema: subgroupSchema,
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: guideSchema,
});

const teaware = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/teaware' }),
  schema: teawareSchema,
});

const recipes = defineCollection({
  loader: glob({
    pattern: '**/*.{yaml,yml}',
    base: './src/data/recipes',
    generateId: ({ entry }) => entry.replace(/\.(ya?ml)$/, ''),
  }),
  schema: recipeSchema,
});

const sources = defineCollection({
  loader: file('./src/data/sources.yaml'),
  schema: sourceSchema,
});

export const collections = {
  teas,
  categories,
  subgroups,
  guides,
  teaware,
  recipes,
  sources,
};
