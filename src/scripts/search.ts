import { highlightMatch, searchTeas, type SearchDocument } from '../lib/search';
import { teaPath } from '../lib/urls';

export function mountSearch(): void {
  const root = document.querySelector<HTMLElement>('[data-search]');
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('[data-search-input]');
  const panel = root.querySelector<HTMLElement>('[data-search-results]');
  const raw = root.querySelector('[data-search-index]')?.textContent;
  if (!input || !panel || !raw) return;

  let docs: SearchDocument[] = [];
  try {
    docs = JSON.parse(raw) as SearchDocument[];
  } catch {
    return;
  }

  let active = -1;

  const close = (): void => {
    panel.hidden = true;
    panel.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };

  const paintActive = (): void => {
    const links = [...panel.querySelectorAll<HTMLAnchorElement>('a')];
    links.forEach((link, index) => {
      const on = index === active;
      link.setAttribute('aria-selected', String(on));
      link.classList.toggle('is-active', on);
    });
    links[active]?.scrollIntoView({ block: 'nearest' });
  };

  const render = (): void => {
    const query = input.value;
    const hits = searchTeas(docs, query, 8);
    active = -1;
    if (!query.trim()) {
      close();
      panel.innerHTML = '';
      return;
    }
    panel.hidden = false;
    panel.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    if (hits.length === 0) {
      panel.innerHTML = `<p class="search__empty" role="status">Ничего не нашлось</p>`;
      return;
    }
    panel.innerHTML = hits
      .map((hit, index) => {
        const name = highlightMatch(hit.nameRu, query);
        return `<a href="${teaPath(hit.slug)}" id="search-opt-${index}" role="option" data-index="${index}"><span>${name}</span><small>${hit.nameZh} · ${hit.pinyin}</small></a>`;
      })
      .join('');
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    const links = [...panel.querySelectorAll<HTMLAnchorElement>('a')];
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (panel.hidden) render();
      active = Math.min(links.length - 1, active + 1);
      paintActive();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(0, active - 1);
      paintActive();
      return;
    }
    if (event.key === 'Enter' && active >= 0 && links[active]) {
      event.preventDefault();
      links[active].click();
    }
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target as Node)) close();
  });
}
