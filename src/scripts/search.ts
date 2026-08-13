import { searchTeas, type SearchDocument } from '../lib/search';
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

  const render = (): void => {
    const hits = searchTeas(docs, input.value, 8);
    active = -1;
    if (!input.value.trim() || hits.length === 0) {
      panel.hidden = hits.length === 0 && Boolean(input.value.trim()) ? false : true;
      panel.classList.toggle('is-open', Boolean(input.value.trim()));
      panel.innerHTML = input.value.trim() ? '<p>Ничего не нашлось</p>' : '';
      return;
    }
    panel.hidden = false;
    panel.classList.add('is-open');
    panel.innerHTML = hits
      .map(
        (hit, index) =>
          `<a href="${teaPath(hit.slug)}" data-index="${index}"><strong>${hit.nameRu}</strong> · ${hit.nameZh}</a>`,
      )
      .join('');
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    const links = [...panel.querySelectorAll('a')];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(links.length - 1, active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(0, active - 1);
    } else if (event.key === 'Enter' && active >= 0 && links[active]) {
      event.preventDefault();
      links[active].click();
    } else {
      return;
    }
    links.forEach((link, index) => link.setAttribute('aria-selected', String(index === active)));
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target as Node)) {
      panel.hidden = true;
      panel.classList.remove('is-open');
    }
  });
}
