import type { APIRoute } from 'astro';
import { withBase } from '../lib/urls';

export const GET: APIRoute = ({ site }) => {
  const sitemapPath = withBase('/sitemap-index.xml').replace(/^\//, '');
  const sitemap = site ? new URL(sitemapPath, site).href : withBase('/sitemap-index.xml');
  const body = `User-agent: *\nAllow: /\n\nDisallow: ${withBase('/session/')}\n\nSitemap: ${sitemap}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
