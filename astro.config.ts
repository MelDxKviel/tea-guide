import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL ?? 'https://localhost:4321';
const base = normalizeBase(process.env.BASE_PATH ?? '/');
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/session/'),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.join(root, 'src'),
      },
    },
  },
});

function normalizeBase(value: string): string {
  if (!value || value === '/') return '/';
  const withLead = value.startsWith('/') ? value : `/${value}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}
