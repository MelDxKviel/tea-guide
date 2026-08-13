import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('src/data/recipes');
await mkdir(out, { recursive: true });

const recipes = [];

const inf = (...seconds) => seconds.map((durationSeconds, i) => ({ number: i + 1, durationSeconds }));

function add(recipe) {
  recipes.push(recipe);
}

function wuyi(id, teaId) {
  add({
    id: `${id}-gongfu-gaiwan`,
    teaId,
    method: 'gongfu',
    vessel: 'gaiwan',
    referenceVolumeMl: 110,
    referenceLeafGrams: 8,
    temperature: { recommendedCelsius: 100, minCelsius: 98, maxCelsius: 100 },
    rinse: { durationSeconds: 5, optional: true, note: 'Коротко. В стандарте секунда не зафиксирована.' },
    infusions: inf(15, 12, 15, 25, 40, 55, 75, 100),
    extension: { initialSeconds: 130, incrementSeconds: 30 },
    notes: [
      'Граммовка внутри официального диапазона DB35 5–15 г / 110 мл.',
      'Секунды — практические уишаньские источники, не текст стандарта.',
    ],
    sourceRefs: [
      { sourceId: 'gb-t-18745-2006', supports: ['origin'] },
      { sourceId: 'db35-t-1545-2015', supports: ['leaf_ratio', 'water_volume'] },
      { sourceId: 'db35-ratio-report', supports: ['leaf_ratio', 'water_volume'] },
      { sourceId: 'wuyi-qiyuan', supports: ['leaf_ratio', 'infusion_times', 'vessel'] },
      { sourceId: 'baike-wuyi-yancha', supports: ['infusion_times', 'origin'] },
      { sourceId: 'caas-linzhi', supports: ['temperature', 'vessel'] },
    ],
    confidence: 'medium',
  });
  add({
    id: `${id}-gongfu-yixing`,
    teaId,
    method: 'gongfu',
    vessel: 'yixing',
    referenceVolumeMl: 110,
    referenceLeafGrams: 8,
    temperature: { recommendedCelsius: 100, minCelsius: 98, maxCelsius: 100 },
    rinse: { durationSeconds: 5, optional: true },
    infusions: inf(15, 12, 15, 25, 40, 55, 75, 100),
    extension: { initialSeconds: 130, incrementSeconds: 30 },
    notes: ['Отдельного проверенного исинского рецепта нет — тот же baseline, что и для гайвани.'],
    sourceRefs: [
      { sourceId: 'db35-t-1545-2015', supports: ['leaf_ratio'] },
      { sourceId: 'caas-linzhi', supports: ['vessel', 'temperature'] },
      { sourceId: 'wuyi-qiyuan', supports: ['infusion_times'] },
    ],
    confidence: 'medium',
  });
}

for (const [id, teaId] of [
  ['da-hong-pao', 'da-hong-pao'],
  ['rou-gui', 'rou-gui'],
  ['shui-xian', 'shui-xian'],
  ['tie-luohan', 'tie-luohan'],
  ['bai-ji-guan', 'bai-ji-guan'],
]) {
  wuyi(id, teaId);
}

function anxi(teaId, grams = 7) {
  add({
    id: `${teaId}-gongfu-gaiwan`,
    teaId,
    method: 'gongfu',
    vessel: 'gaiwan',
    referenceVolumeMl: 110,
    referenceLeafGrams: grams,
    temperature: { recommendedCelsius: 100, minCelsius: 95, maxCelsius: 100 },
    rinse: { durationSeconds: 5, optional: false, note: 'Традиционный аньсийский гунфу включает смыв пены.' },
    infusions: inf(12, 15, 20, 30, 45, 60, 80),
    notes: ['Ориентир по объёму — около 1/5 гайвани. Цисян можно сделать мягче граммовкой, не температурой.'],
    sourceRefs: [
      { sourceId: 'gb-t-30357-2', supports: ['origin'] },
      { sourceId: 'gb-t-19598-2025', supports: ['origin'] },
      { sourceId: 'baike-anxi-tgy', supports: ['leaf_ratio', 'temperature', 'vessel'] },
      { sourceId: 'teapoems-tgy', supports: ['leaf_ratio', 'rinse', 'infusion_times', 'temperature'] },
      { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
      { sourceId: 'caas-linzhi', supports: ['temperature'] },
    ],
    confidence: 'medium',
  });
}

anxi('tie-guan-yin', 7);
anxi('huang-jin-gui', 7);

function dancong(teaId) {
  add({
    id: `${teaId}-gongfu-gaiwan`,
    teaId,
    method: 'gongfu',
    vessel: 'gaiwan',
    referenceVolumeMl: 120,
    referenceLeafGrams: 6,
    temperature: { recommendedCelsius: 100, minCelsius: 95, maxCelsius: 100 },
    rinse: { durationSeconds: 3, optional: false, note: 'Почти сразу слить.' },
    infusions: inf(3, 5, 8, 12, 20, 30, 45, 60),
    extension: { initialSeconds: 80, incrementSeconds: 20 },
    notes: ['Чаочжоуская школа ещё плотнее по листу. Здесь взят современный ориентир 6 г / 120 мл.'],
    sourceRefs: [
      { sourceId: 'chabaike-dancong', supports: ['leaf_ratio', 'water_volume', 'temperature', 'rinse', 'infusion_times'] },
      { sourceId: 'lifeweek-dancong', supports: ['origin', 'history'] },
      { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
    ],
    confidence: 'medium',
  });
}

dancong('mi-lan-xiang');
dancong('ya-shi-xiang');

add({
  id: 'dong-ding-gongfu-gaiwan',
  teaId: 'dong-ding',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 7,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 5, optional: true },
  infusions: inf(20, 25, 35, 50, 70, 90),
  sourceRefs: [
    { sourceId: 'tres-ws-5283', supports: ['temperature'] },
    { sourceId: 'teagraphy-tres', supports: ['temperature'] },
    { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
    { sourceId: 'hanyitea-dongding', supports: ['infusion_times', 'rinse'] },
  ],
  confidence: 'medium',
});

add({
  id: 'gao-shan-gongfu-gaiwan',
  teaId: 'gao-shan-oolong',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 6,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 5, optional: true },
  infusions: inf(18, 22, 30, 45, 65, 85),
  notes: ['Высокогорный улун — зонтичное имя, не один GI. Секунды практические.'],
  sourceRefs: [
    { sourceId: 'tres-ws-5283', supports: ['temperature'] },
    { sourceId: 'teagraphy-tres', supports: ['temperature'] },
    { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
  ],
  confidence: 'medium',
});

add({
  id: 'dongfang-meiren-gongfu-gaiwan',
  teaId: 'dongfang-meiren',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 120,
  referenceLeafGrams: 5,
  temperature: { recommendedCelsius: 85, minCelsius: 80, maxCelsius: 90 },
  infusions: inf(45, 35, 40, 55, 75),
  notes: ['Тайваньская опытная станция: 80–90 °C лучше кипятка. Промывку обычно пропускают.'],
  sourceRefs: [
    { sourceId: 'tres-ws-5283', supports: ['temperature'] },
    { sourceId: 'teagraphy-tres', supports: ['temperature'] },
  ],
  confidence: 'medium',
});

function redWestern(teaId, temp, extraSources = []) {
  add({
    id: `${teaId}-western`,
    teaId,
    method: 'western',
    referenceVolumeMl: 150,
    referenceLeafGrams: 3,
    temperature: { recommendedCelsius: temp, minCelsius: temp - 5, maxCelsius: 100 },
    durationSeconds: 180,
    notes: ['Категорийный ориентир института чая: около 1:50, 3–5 минут.'],
    sourceRefs: [
      { sourceId: 'caas-linzhi', supports: ['leaf_ratio', 'temperature', 'western_method'] },
      { sourceId: 'gb-t-23776-2018', supports: ['leaf_ratio', 'water_volume'] },
      ...extraSources,
    ],
    confidence: 'high',
  });
}

add({
  id: 'keemun-gongfu-gaiwan',
  teaId: 'keemun',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 5,
  temperature: { recommendedCelsius: 93, minCelsius: 90, maxCelsius: 95 },
  infusions: inf(20, 25, 35, 50, 70),
  sourceRefs: [
    { sourceId: 'chawh-keemun', supports: ['temperature', 'leaf_ratio'] },
    { sourceId: 'qmhtea-keemun', supports: ['temperature'] },
    { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
    { sourceId: 'gb-t-13738-2', supports: ['origin'] },
  ],
  confidence: 'medium',
});
redWestern('keemun', 95, [{ sourceId: 'chawh-keemun', supports: ['western_method', 'temperature'] }]);

add({
  id: 'zhengshan-xiaozhong-gongfu-gaiwan',
  teaId: 'zhengshan-xiaozhong',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 5,
  temperature: { recommendedCelsius: 100 },
  infusions: inf(15, 20, 30, 45, 70),
  sourceRefs: [
    { sourceId: 'caas-linzhi', supports: ['temperature'] },
    { sourceId: 'gb-t-13738-3', supports: ['origin'] },
  ],
  confidence: 'medium',
});
redWestern('zhengshan-xiaozhong', 100);

add({
  id: 'dian-hong-gongfu-gaiwan',
  teaId: 'dian-hong',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 6,
  temperature: { recommendedCelsius: 95, minCelsius: 90, maxCelsius: 100 },
  infusions: inf(12, 18, 25, 35, 50, 70),
  notes: ['Крупный юньнаньский лист: закладка чуть больше, чем у цимэня.'],
  sourceRefs: [
    { sourceId: 'fujian-daily-2022', supports: ['leaf_ratio'] },
    { sourceId: 'caas-linzhi', supports: ['temperature'] },
    { sourceId: 'gb-t-13738-2', supports: ['origin'] },
  ],
  confidence: 'medium',
});
redWestern('dian-hong', 95);

add({
  id: 'jin-jun-mei-gongfu-gaiwan',
  teaId: 'jin-jun-mei',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 3.5,
  temperature: { recommendedCelsius: 90, minCelsius: 80, maxCelsius: 90 },
  rinse: { durationSeconds: 3, optional: true },
  infusions: inf(15, 25, 35, 45, 60, 75, 90),
  notes: [
    'Источники расходятся: 80–90 °C и 3 г против 100 °C и 5 г с мгновенными проливами.',
    'Взят более осторожный почечный вариант, чтобы не заварить кипятком вкрутую.',
  ],
  sourceRefs: [
    { sourceId: 'baike-jinjunmei', supports: ['leaf_ratio', 'temperature', 'rinse', 'infusion_times'] },
    { sourceId: 'manzao-jinjunmei', supports: ['leaf_ratio', 'temperature'] },
  ],
  confidence: 'medium',
});

add({
  id: 'xi-hu-long-jing-gongfu-gaiwan',
  teaId: 'xi-hu-long-jing',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 120,
  referenceLeafGrams: 3,
  temperature: { recommendedCelsius: 85, minCelsius: 80, maxCelsius: 85 },
  infusions: inf(40, 25, 80),
  notes: ['Секунды — из технического регламента шифэнского лунцзина (при участии Института чая).'],
  sourceRefs: [
    { sourceId: 'xhlj-association', supports: ['temperature', 'origin'] },
    { sourceId: 'shifeng-longjing', supports: ['leaf_ratio', 'water_volume', 'temperature', 'infusion_times', 'vessel'] },
    { sourceId: 'gb-t-18650-2008', supports: ['origin'] },
  ],
  confidence: 'high',
});

add({
  id: 'xi-hu-long-jing-western',
  teaId: 'xi-hu-long-jing',
  method: 'western',
  referenceVolumeMl: 150,
  referenceLeafGrams: 3,
  temperature: { recommendedCelsius: 85, minCelsius: 80, maxCelsius: 85 },
  durationSeconds: 150,
  notes: ['Без крышки. 1:50, 2–3 минуты.'],
  sourceRefs: [
    { sourceId: 'xhlj-association', supports: ['temperature'] },
    { sourceId: 'caas-linzhi', supports: ['western_method', 'leaf_ratio', 'temperature'] },
    { sourceId: 'jiemian-longjing', supports: ['leaf_ratio', 'western_method', 'temperature'] },
  ],
  confidence: 'high',
});

function green(teaId, temp = 85, westernSec = 150, gongfu = [70, 80], grams = 3) {
  add({
    id: `${teaId}-gongfu-gaiwan`,
    teaId,
    method: 'gongfu',
    vessel: 'gaiwan',
    referenceVolumeMl: 120,
    referenceLeafGrams: grams,
    temperature: { recommendedCelsius: temp, minCelsius: temp - 5, maxCelsius: temp + 5 },
    infusions: inf(...gongfu),
    notes: ['Для зелёных основной бытовой способ — стекло. Гайвань здесь вспомогательная.'],
    sourceRefs: [
      { sourceId: 'caas-linzhi', supports: ['temperature', 'leaf_ratio'] },
      { sourceId: 'people-health-tea', supports: ['temperature'] },
    ],
    confidence: 'medium',
  });
  add({
    id: `${teaId}-western`,
    teaId,
    method: 'western',
    referenceVolumeMl: 150,
    referenceLeafGrams: grams,
    temperature: { recommendedCelsius: temp, minCelsius: temp - 5, maxCelsius: temp + 5 },
    durationSeconds: westernSec,
    notes: ['Без крышки и без промывки.'],
    sourceRefs: [
      { sourceId: 'caas-linzhi', supports: ['western_method', 'temperature', 'leaf_ratio'] },
      { sourceId: 'people-health-tea', supports: ['temperature', 'western_method'] },
    ],
    confidence: 'high',
  });
}

green('dongting-bi-luo-chun', 85, 150, [70, 80], 3);
green('huang-shan-mao-feng', 85, 150, [50, 70, 90], 3);
green('lu-an-gua-pian', 90, 150, [40, 60, 90], 4);
green('xin-yang-mao-jian', 85, 150, [50, 70, 90], 3);
green('en-shi-yu-lu', 85, 120, [40, 60, 90], 3);

add({
  id: 'bai-hao-yin-zhen-gongfu-gaiwan',
  teaId: 'bai-hao-yin-zhen',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 90, minCelsius: 85, maxCelsius: 90 },
  infusions: inf(30, 35, 40, 50, 65),
  sourceRefs: [
    { sourceId: 'ipucha-white', supports: ['leaf_ratio', 'temperature', 'infusion_times'] },
    { sourceId: 'caas-linzhi', supports: ['temperature'] },
    { sourceId: 'baike-fuding-white', supports: ['origin'] },
  ],
  confidence: 'medium',
});
add({
  id: 'bai-hao-yin-zhen-western',
  teaId: 'bai-hao-yin-zhen',
  method: 'western',
  referenceVolumeMl: 150,
  referenceLeafGrams: 3,
  temperature: { recommendedCelsius: 90, minCelsius: 85, maxCelsius: 90 },
  durationSeconds: 150,
  sourceRefs: [
    { sourceId: 'caas-linzhi', supports: ['western_method', 'temperature'] },
    { sourceId: 'rednet-brew', supports: ['temperature'] },
  ],
  confidence: 'medium',
});

add({
  id: 'bai-mu-dan-gongfu-gaiwan',
  teaId: 'bai-mu-dan',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 95, minCelsius: 90, maxCelsius: 95 },
  infusions: inf(20, 15, 20, 25, 35, 50),
  sourceRefs: [
    { sourceId: 'ipucha-white', supports: ['leaf_ratio', 'temperature', 'infusion_times'] },
    { sourceId: 'baike-fuding-white', supports: ['origin'] },
  ],
  confidence: 'medium',
});

add({
  id: 'shou-mei-gongfu-gaiwan',
  teaId: 'shou-mei',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 5, optional: true, note: 'Для выдержанного шоу мэй промывка уместнее.' },
  infusions: inf(30, 20, 25, 35, 50),
  sourceRefs: [
    { sourceId: 'ipucha-white', supports: ['leaf_ratio', 'temperature', 'infusion_times', 'rinse'] },
    { sourceId: 'caas-linzhi', supports: ['thermos_method'] },
  ],
  confidence: 'medium',
});
add({
  id: 'shou-mei-thermos',
  teaId: 'shou-mei',
  method: 'thermos',
  referenceVolumeMl: 400,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 100 },
  durationSeconds: 1200,
  notes: ['Институт чая допускает термос для выдержанного белого, не для молодой серебряной иглы.'],
  sourceRefs: [{ sourceId: 'caas-linzhi', supports: ['thermos_method'] }],
  confidence: 'medium',
});

add({
  id: 'sheng-puer-gongfu-gaiwan',
  teaId: 'sheng-puer',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 120,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 95, minCelsius: 90, maxCelsius: 100 },
  rinse: { durationSeconds: 5, optional: false, note: 'Разбудить прессовку и смыть пыль.' },
  infusions: inf(10, 12, 15, 20, 25, 35, 50, 70),
  extension: { initialSeconds: 100, incrementSeconds: 30 },
  notes: ['Базовый профиль категории, не конкретная фабрика и год. Источники расходятся по 90 vs 100 °C.'],
  sourceRefs: [
    { sourceId: 'gb-t-22111-2008', supports: ['origin'] },
    { sourceId: 'sohu-puer', supports: ['leaf_ratio', 'temperature', 'rinse'] },
  ],
  confidence: 'medium',
});

add({
  id: 'shu-puer-gongfu-gaiwan',
  teaId: 'shu-puer',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 120,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 8, optional: false, note: 'Для шу промывка обязательна.' },
  infusions: inf(12, 15, 20, 25, 35, 50, 70, 90),
  extension: { initialSeconds: 120, incrementSeconds: 30 },
  notes: ['Базовый профиль шу, не рецепт конкретного блина.'],
  sourceRefs: [
    { sourceId: 'gb-t-22111-2008', supports: ['origin'] },
    { sourceId: 'sohu-puer', supports: ['leaf_ratio', 'temperature', 'rinse'] },
    { sourceId: 'caas-linzhi', supports: ['vessel'] },
  ],
  confidence: 'medium',
});
add({
  id: 'shu-puer-gongfu-yixing',
  teaId: 'shu-puer',
  method: 'gongfu',
  vessel: 'yixing',
  referenceVolumeMl: 120,
  referenceLeafGrams: 8,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 8, optional: false },
  infusions: inf(12, 15, 20, 25, 35, 50, 70, 90),
  extension: { initialSeconds: 120, incrementSeconds: 30 },
  notes: ['Тот же baseline, что и для гайвани. Исин держит тепло — удобно для шу.'],
  sourceRefs: [
    { sourceId: 'sohu-puer', supports: ['leaf_ratio', 'temperature'] },
    { sourceId: 'caas-linzhi', supports: ['vessel'] },
  ],
  confidence: 'medium',
});

add({
  id: 'liu-bao-gongfu-gaiwan',
  teaId: 'liu-bao',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 6,
  temperature: { recommendedCelsius: 100 },
  rinse: { durationSeconds: 5, optional: false },
  infusions: inf(15, 20, 25, 35, 50, 70, 90),
  sourceRefs: [
    { sourceId: 'caas-linzhi', supports: ['vessel'] },
    { sourceId: 'zhihu-liubao', supports: ['leaf_ratio'] },
    { sourceId: 'rednet-brew', supports: ['temperature', 'rinse'] },
  ],
  confidence: 'medium',
});
add({
  id: 'liu-bao-thermos',
  teaId: 'liu-bao',
  method: 'thermos',
  referenceVolumeMl: 400,
  referenceLeafGrams: 6,
  temperature: { recommendedCelsius: 100 },
  durationSeconds: 900,
  notes: ['Традиционный деревенский способ, не таблица из GB.'],
  sourceRefs: [{ sourceId: 'caas-linzhi', supports: ['vessel'] }],
  confidence: 'medium',
});

add({
  id: 'junshan-yinzhen-gongfu-gaiwan',
  teaId: 'junshan-yinzhen',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 150,
  referenceLeafGrams: 3,
  temperature: { recommendedCelsius: 88, minCelsius: 85, maxCelsius: 90 },
  infusions: inf(30, 60, 120),
  notes: ['В стакане зрелищнее. Температура по институту чая, не обваривающий кипяток «для шоу».'],
  sourceRefs: [
    { sourceId: 'hunan-junshan', supports: ['origin', 'history', 'vessel'] },
    { sourceId: 'baike-junshan', supports: ['leaf_ratio', 'vessel'] },
    { sourceId: 'rednet-brew', supports: ['temperature', 'infusion_times'] },
    { sourceId: 'caas-linzhi', supports: ['temperature'] },
  ],
  confidence: 'medium',
});

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    return obj
      .map((item) => {
        if (item && typeof item === 'object') {
          const [first, ...rest] = toYaml(item, indent + 1).split('\n');
          return `${pad}- ${first.trim()}\n${rest.join('\n')}`;
        }
        const text = String(item);
        const quoted = /[:#']/.test(text) ? JSON.stringify(text) : text;
        return `${pad}- ${quoted}`;
      })
      .join('\n');
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .map(([key, value]) => {
        if (value === undefined) return '';
        if (Array.isArray(value)) {
          return `${pad}${key}:\n${toYaml(value, indent + 1)}`;
        }
        if (value && typeof value === 'object') {
          return `${pad}${key}:\n${toYaml(value, indent + 1)}`;
        }
        if (typeof value === 'string') {
          const q = value.includes(':') || value.includes('#') || value.includes("'") || /[\n"]/.test(value);
          return `${pad}${key}: ${q ? JSON.stringify(value) : value}`;
        }
        return `${pad}${key}: ${value}`;
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(obj);
}

for (const recipe of recipes) {
  const file = path.join(out, `${recipe.id}.yaml`);
  await writeFile(file, `${toYaml(recipe)}\n`, 'utf8');
}

console.log(`Wrote ${recipes.length} recipes`);
