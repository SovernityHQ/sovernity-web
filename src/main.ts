import { initThemeToggle } from './theme.ts';
import { initMenu } from './nav.ts';
import { initHome } from './home.ts';
import { initAbout } from './about.ts';
import { initTracker, initSectionDippers } from './dipper.ts';
import { initCopyButtons } from './copy.ts';
import { revealOnScroll } from './motion.ts';

const root = document.documentElement;

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

const store = storage();
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-theme-toggle]')) initThemeToggle(b, root, store);

const menu = document.querySelector<HTMLButtonElement>('button[data-menu]');
const navId = menu?.getAttribute('aria-controls');
const menuNav = navId ? document.getElementById(navId) : null;
if (menu && menuNav) initMenu(menu, menuNav);

// Only now: html.js hides the no-JS fallbacks (wrapped phone nav, no toggle), so it waits until the theme toggles and
// the Menu are wired. If either throws, the page keeps its complete no-JS layout. Same synchronous module run as
// before, so the timing against first paint is unchanged.
root.classList.add('js');

// Theme-aware pictures: `<source data-themed media="(prefers-color-scheme: dark)">` follows a stored
// Light or Dark too, not only the system.
function syncThemedSources(): void {
  const t = root.dataset.theme;
  const media = t === 'dark' ? 'all' : t === 'light' ? 'not all' : '(prefers-color-scheme: dark)';
  for (const s of document.querySelectorAll<HTMLSourceElement>('source[data-themed]')) if (s.media !== media) s.media = media;
}
syncThemedSources();
new MutationObserver(syncThemedSources).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

/** Ursa: the sub-nav tracker, the section Dippers, section reveal and (at launch) the checksum Copy button. */
function initUrsa(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-step]'));
  const trk = document.querySelector<SVGElement>('.ursa-subnav .r2u-trk');
  if (trk) initTracker(trk, sections);
  initSectionDippers(Array.from(document.querySelectorAll<SVGElement>('main .r2u-dip')));
  revealOnScroll(sections.filter((s) => s.hasAttribute('data-sky')), 'r2u-in');
  initCopyButtons(document);
}

/** Page modules, keyed by `<body data-page>`. Later tasks add theirs here with a static import. */
const pages: Record<string, () => void> = {
  home: initHome,
  about: initAbout,
  ursa: initUrsa,
};
pages[document.body.dataset.page ?? '']?.();
