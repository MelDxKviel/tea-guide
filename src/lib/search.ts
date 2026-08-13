export interface SearchDocument {
  id: string;
  slug: string;
  nameRu: string;
  nameZh: string;
  pinyin: string;
  aliases: string[];
  categoryId: string;
  subgroupId?: string;
}

export interface SearchHit {
  id: string;
  slug: string;
  nameRu: string;
  nameZh: string;
  pinyin: string;
  score: number;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`′’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function haystacks(doc: SearchDocument): string[] {
  return [doc.nameRu, doc.nameZh, doc.pinyin, ...doc.aliases].map(normalizeSearch).filter(Boolean);
}

export function searchTeas(docs: SearchDocument[], query: string, limit = 8): SearchHit[] {
  const q = normalizeSearch(query);
  if (!q) return [];

  const hits: SearchHit[] = [];
  for (const doc of docs) {
    let best = 0;
    for (const field of haystacks(doc)) {
      if (field === q) best = Math.max(best, 100);
      else if (field.startsWith(q)) best = Math.max(best, 80);
      else if (field.includes(q)) best = Math.max(best, 60);
    }
    if (best > 0) {
      hits.push({
        id: doc.id,
        slug: doc.slug,
        nameRu: doc.nameRu,
        nameZh: doc.nameZh,
        pinyin: doc.pinyin,
        score: best,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.nameRu.localeCompare(b.nameRu, 'ru')).slice(0, limit);
}
