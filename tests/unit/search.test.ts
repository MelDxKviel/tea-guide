import { describe, expect, it } from 'vitest';
import { searchTeas, type SearchDocument } from '../../src/lib/search';

const docs: SearchDocument[] = [
  {
    id: 'da-hong-pao',
    slug: 'da-hong-pao',
    nameRu: 'Да Хун Пао',
    nameZh: '大红袍',
    pinyin: 'Dà Hóng Páo',
    aliases: ['дахунпао', 'красный халат'],
    categoryId: 'oolong',
  },
  {
    id: 'tie-guan-yin',
    slug: 'tie-guan-yin',
    nameRu: 'Те Гуань Инь',
    nameZh: '铁观音',
    pinyin: 'Tiě Guānyīn',
    aliases: [],
    categoryId: 'oolong',
  },
];

describe('search', () => {
  it('finds by russian, chinese, pinyin and aliases', () => {
    expect(searchTeas(docs, 'дахунпао')[0]?.id).toBe('da-hong-pao');
    expect(searchTeas(docs, 'да хун пао')[0]?.id).toBe('da-hong-pao');
    expect(searchTeas(docs, '大红袍')[0]?.id).toBe('da-hong-pao');
    expect(searchTeas(docs, 'Dà Hóng Páo')[0]?.id).toBe('da-hong-pao');
    expect(searchTeas(docs, 'da hong pao')[0]?.id).toBe('da-hong-pao');
  });

  it('is tolerant of case and spaces', () => {
    expect(searchTeas(docs, 'ТЕ  гуань')[0]?.id).toBe('tie-guan-yin');
  });
});
