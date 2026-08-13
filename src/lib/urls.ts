/** Join the configured base path with a site-absolute path. */
export function withBase(path: string, base = import.meta.env.BASE_URL): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!base || base === '/') return normalized;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmedBase}${normalized}`;
}

export function teaPath(slug: string): string {
  return withBase(`/tea/${slug}/`);
}

export function categoryPath(categoryId: string): string {
  return withBase(`/tea/${categoryId}/`);
}

export function subgroupPath(categoryId: string, subgroupId: string): string {
  return withBase(`/tea/${categoryId}/${subgroupId}/`);
}

export function teawarePath(slug?: string): string {
  return slug ? withBase(`/teaware/${slug}/`) : withBase('/teaware/');
}

export function guidePath(slug?: string): string {
  return slug ? withBase(`/guides/${slug}/`) : withBase('/guides/');
}

export function sessionPath(): string {
  return withBase('/session/');
}

export function homePath(): string {
  return withBase('/');
}

export function catalogPath(): string {
  return withBase('/tea/');
}

export function canonicalUrl(site: URL | string | undefined, pathname: string): string | undefined {
  if (!site) return undefined;
  const origin = typeof site === 'string' ? site : site.href;
  const baseOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${baseOrigin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
