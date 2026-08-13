import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { BrewingRecipe } from '../brewing/types';
import type { SearchDocument } from '../search';

export async function allTeas(): Promise<CollectionEntry<'teas'>[]> {
  const teas = await getCollection('teas');
  return teas.sort((a, b) => a.data.names.ru.localeCompare(b.data.names.ru, 'ru'));
}

export async function allCategories(): Promise<CollectionEntry<'categories'>[]> {
  const items = await getCollection('categories');
  return items.sort((a, b) => a.data.sortOrder - b.data.sortOrder);
}

export async function teasByCategory(categoryId: string): Promise<CollectionEntry<'teas'>[]> {
  return (await allTeas()).filter((tea) => tea.data.categoryId === categoryId);
}

export async function teasBySubgroup(subgroupId: string): Promise<CollectionEntry<'teas'>[]> {
  return (await allTeas()).filter((tea) => tea.data.subgroupId === subgroupId);
}

export async function subgroupsOf(categoryId: string): Promise<CollectionEntry<'subgroups'>[]> {
  const items = await getCollection('subgroups');
  return items
    .filter((item) => item.data.categoryId === categoryId)
    .sort((a, b) => a.data.sortOrder - b.data.sortOrder);
}

export async function recipesForTea(teaId: string): Promise<CollectionEntry<'recipes'>[]> {
  const recipes = await getCollection('recipes');
  return recipes.filter((recipe) => recipe.data.teaId === teaId);
}

export function asRecipe(entry: CollectionEntry<'recipes'>): BrewingRecipe {
  return entry.data as BrewingRecipe;
}

export async function getRecipe(id: string): Promise<CollectionEntry<'recipes'> | undefined> {
  return getEntry('recipes', id);
}

export async function getSource(id: string): Promise<CollectionEntry<'sources'> | undefined> {
  return getEntry('sources', id);
}

export function toSearchDocuments(teas: CollectionEntry<'teas'>[]): SearchDocument[] {
  return teas.map((tea) => ({
    id: tea.data.id,
    slug: tea.data.slug,
    nameRu: tea.data.names.ru,
    nameZh: tea.data.names.zhHans,
    pinyin: tea.data.names.pinyin,
    aliases: tea.data.names.aliases ?? [],
    categoryId: tea.data.categoryId,
    subgroupId: tea.data.subgroupId,
  }));
}

export const featuredTeaIds = [
  'da-hong-pao',
  'tie-guan-yin',
  'shu-puer',
  'xi-hu-long-jing',
  'dian-hong',
  'jin-jun-mei',
];
