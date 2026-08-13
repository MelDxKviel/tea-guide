export type TeaMarkKind =
  | 'wuyi-strip'
  | 'rolled'
  | 'phoenix'
  | 'taiwan-ball'
  | 'bug-bitten'
  | 'red-wire'
  | 'smoked'
  | 'golden-tip'
  | 'bud-needles'
  | 'flat-spear'
  | 'spiral'
  | 'hairy-spear'
  | 'seed-leaf'
  | 'green-needle'
  | 'steam-needle'
  | 'silver-needle'
  | 'peony'
  | 'coarse-white'
  | 'sheng-cake'
  | 'shu-cake'
  | 'brick'
  | 'yellow-needle';

const BY_ID: Record<string, TeaMarkKind> = {
  'da-hong-pao': 'wuyi-strip',
  'rou-gui': 'wuyi-strip',
  'shui-xian': 'wuyi-strip',
  'tie-luohan': 'wuyi-strip',
  'bai-ji-guan': 'wuyi-strip',
  'tie-guan-yin': 'rolled',
  'huang-jin-gui': 'rolled',
  'mi-lan-xiang': 'phoenix',
  'ya-shi-xiang': 'phoenix',
  'dong-ding': 'taiwan-ball',
  'gao-shan-oolong': 'taiwan-ball',
  'dongfang-meiren': 'bug-bitten',
  keemun: 'red-wire',
  'zhengshan-xiaozhong': 'smoked',
  'dian-hong': 'golden-tip',
  'jin-jun-mei': 'bud-needles',
  'xi-hu-long-jing': 'flat-spear',
  'dongting-bi-luo-chun': 'spiral',
  'huang-shan-mao-feng': 'hairy-spear',
  'lu-an-gua-pian': 'seed-leaf',
  'xin-yang-mao-jian': 'green-needle',
  'en-shi-yu-lu': 'steam-needle',
  'bai-hao-yin-zhen': 'silver-needle',
  'bai-mu-dan': 'peony',
  'shou-mei': 'coarse-white',
  'sheng-puer': 'sheng-cake',
  'shu-puer': 'shu-cake',
  'liu-bao': 'brick',
  'junshan-yinzhen': 'yellow-needle',
};

export function teaMarkKind(teaId: string): TeaMarkKind {
  return BY_ID[teaId] ?? 'wuyi-strip';
}

export function teaMarkCaption(kind: TeaMarkKind): string {
  switch (kind) {
    case 'wuyi-strip':
      return 'Полосчатый лист янчи';
    case 'rolled':
      return 'Скрученный шарик улуна';
    case 'phoenix':
      return 'Длинный лист даньцуна';
    case 'taiwan-ball':
      return 'Полушарик тайваньского улуна';
    case 'bug-bitten':
      return 'Пёстрый лист с укусом цикадки';
    case 'red-wire':
      return 'Тонкая проволочка красного чая';
    case 'smoked':
      return 'Лист сяочжуна';
    case 'golden-tip':
      return 'Крупный лист с золотым ворсом';
    case 'bud-needles':
      return 'Почечные иглы';
    case 'flat-spear':
      return 'Плоские копья лунцзина';
    case 'spiral':
      return 'Мелкая спираль билочуня';
    case 'hairy-spear':
      return 'Ворсистый побег';
    case 'seed-leaf':
      return 'Лист без почки, форма семечка';
    case 'green-needle':
      return 'Тонкие зелёные острия';
    case 'steam-needle':
      return 'Ровные паровые иглы';
    case 'silver-needle':
      return 'Серебряные почки';
    case 'peony':
      return 'Почка с листом';
    case 'coarse-white':
      return 'Крупный белый лист';
    case 'sheng-cake':
      return 'Прессованный блин шэна';
    case 'shu-cake':
      return 'Тёмный блин шу';
    case 'brick':
      return 'Прессованный хэйча';
    case 'yellow-needle':
      return 'Жёлтые почки';
  }
}
