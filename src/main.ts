import { initThemeToggle } from './theme.ts';
import { initMenu } from './nav.ts';
import { initHome } from './home.ts';

const root = document.documentElement;
root.classList.add('js');

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

const store = storage();
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-theme-toggle]')) initThemeToggle(b, root, store);

const menu = document.querySelector<HTMLButtonElement>('button[data-menu]');
const navId = menu?.getAttribute('aria-controls');
const menuNav = navId ? document.getElementById(navId) : null;
if (menu && menuNav) initMenu(menu, menuNav);

/** Page modules, keyed by `<body data-page>`. Later tasks add theirs here with a static import. */
const pages: Record<string, () => void> = {
  home: initHome,
};
pages[document.body.dataset.page ?? '']?.();
