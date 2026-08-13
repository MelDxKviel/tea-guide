import { withBase } from '../lib/urls';

export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(withBase('/sw.js'), { scope: withBase('/') }).catch(() => {
      // Offline support is optional.
    });
  });
}
