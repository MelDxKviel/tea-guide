import type { APIRoute } from 'astro';
import { withBase } from '../lib/urls';

export const GET: APIRoute = () => {
  const body = {
    name: 'Tea Guide',
    short_name: 'Tea Guide',
    description: 'Заваривание китайского чая проливами',
    lang: 'ru',
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    background_color: '#f2ebe0',
    theme_color: '#1d4536',
    icons: [
      { src: withBase('/favicon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
