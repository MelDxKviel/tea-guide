import { z } from 'astro/zod';

export const teaCategoryId = z.enum([
  'oolong',
  'green-tea',
  'red-tea',
  'white-tea',
  'yellow-tea',
  'dark-tea',
  'puer',
]);

export const gongfuVessel = z.enum(['gaiwan', 'yixing']);
export const brewingMethod = z.enum(['gongfu', 'western', 'thermos', 'cold_brew']);
export const recipeConfidence = z.enum(['high', 'medium']);
export const roastingLevel = z.enum(['none', 'light', 'medium', 'high']);
export const sourceLanguage = z.enum(['zh-CN', 'ru', 'en']);
export const sourceType = z.enum([
  'government',
  'standard',
  'research',
  'industry',
  'regional-association',
  'producer',
  'specialist',
]);
export const sourceSupport = z.enum([
  'leaf_ratio',
  'water_volume',
  'temperature',
  'rinse',
  'infusion_times',
  'vessel',
  'western_method',
  'thermos_method',
  'cold_brew_method',
  'origin',
  'history',
  'taste',
  'roasting',
]);

export const temperatureSchema = z.object({
  recommendedCelsius: z.number().min(1).max(100),
  minCelsius: z.number().min(1).max(100).optional(),
  maxCelsius: z.number().min(1).max(100).optional(),
});

export const rinseSchema = z.object({
  durationSeconds: z.number().positive(),
  optional: z.boolean(),
  note: z.string().optional(),
});

export const infusionSchema = z.object({
  number: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  note: z.string().optional(),
});

export const sourceRefSchema = z.object({
  sourceId: z.string().min(1),
  supports: z.array(sourceSupport).min(1),
});

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    teaId: z.string().min(1),
    method: brewingMethod,
    vessel: gongfuVessel.optional(),
    referenceVolumeMl: z.number().positive(),
    referenceLeafGrams: z.number().positive(),
    temperature: temperatureSchema.optional(),
    strengthMultipliers: z
      .object({
        soft: z.number().positive(),
        normal: z.number().positive(),
        strong: z.number().positive(),
      })
      .optional(),
    rinse: rinseSchema.optional(),
    infusions: z.array(infusionSchema).optional(),
    durationSeconds: z.number().positive().optional(),
    extension: z
      .object({
        initialSeconds: z.number().positive(),
        incrementSeconds: z.number().nonnegative().optional(),
      })
      .optional(),
    notes: z.array(z.string()).optional(),
    sourceRefs: z.array(sourceRefSchema).min(1),
    confidence: recipeConfidence,
  })
  .superRefine((value, ctx) => {
    if (value.method === 'gongfu') {
      if (!value.infusions || value.infusions.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'gongfu recipe must have infusions',
          path: ['infusions'],
        });
      }
    }
    if (value.method === 'cold_brew' || value.method === 'western' || value.method === 'thermos') {
      if (!value.durationSeconds) {
        ctx.addIssue({
          code: 'custom',
          message: `${value.method} recipe must have durationSeconds`,
          path: ['durationSeconds'],
        });
      }
    }
    if (value.infusions) {
      const numbers = value.infusions.map((item) => item.number);
      numbers.forEach((num, index) => {
        if (num !== index + 1) {
          ctx.addIssue({
            code: 'custom',
            message: 'infusion numbers must be sequential starting at 1',
            path: ['infusions', index, 'number'],
          });
        }
      });
    }
    if (value.temperature) {
      const { minCelsius, maxCelsius, recommendedCelsius } = value.temperature;
      if (minCelsius !== undefined && minCelsius > recommendedCelsius) {
        ctx.addIssue({ code: 'custom', message: 'minCelsius cannot exceed recommended', path: ['temperature'] });
      }
      if (maxCelsius !== undefined && maxCelsius < recommendedCelsius) {
        ctx.addIssue({ code: 'custom', message: 'maxCelsius cannot be below recommended', path: ['temperature'] });
      }
    }
  });

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().min(1),
  language: sourceLanguage,
  sourceType: sourceType,
  accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const teaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  names: z.object({
    ru: z.string().min(1),
    zhHans: z.string().min(1),
    pinyin: z.string().min(1),
    aliases: z.array(z.string()).optional(),
  }),
  categoryId: teaCategoryId,
  subgroupId: z.string().optional(),
  origin: z.object({
    country: z.string().min(1),
    province: z.string().optional(),
    region: z.string().optional(),
    locality: z.string().optional(),
  }),
  roasting: z
    .object({
      level: roastingLevel,
      displayLabel: z.string().optional(),
    })
    .optional(),
  flavorProfile: z.array(z.string()).optional(),
  recommendedVessels: z.array(gongfuVessel).optional(),
  recipeIds: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
  relatedTeaIds: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  lead: z.string().min(1),
  accent: z.string().optional(),
});

export const categorySchema = z.object({
  id: teaCategoryId,
  slug: z.string().min(1),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  sortOrder: z.number().int(),
});

export const subgroupSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  categoryId: teaCategoryId,
  title: z.string().min(1),
  region: z.string().optional(),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  sortOrder: z.number().int(),
});

export const guideSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  sortOrder: z.number().int(),
  updated: z.coerce.date().optional(),
});

export const teawareSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  vessel: z.enum(['gaiwan', 'yixing', 'thermos']).optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  sortOrder: z.number().int(),
});
