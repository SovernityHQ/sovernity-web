export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'sovernity-theme';
const LABEL: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const CHANGE = 'sovernity-themechange';

/** The stored choice; anything unknown, missing or unreadable (private windows throw) is system. */
export function readChoice(storage: Pick<Storage, 'getItem'> | null): ThemeChoice {
  try {
    const v = storage?.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyChoice(root: HTMLElement, choice: ThemeChoice): void {
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}

export function nextChoice(c: ThemeChoice): ThemeChoice {
  return c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system';
}

function store(storage: Storage | null, choice: ThemeChoice): void {
  try {
    if (choice === 'system') storage?.removeItem(KEY);
    else storage?.setItem(KEY, choice);
  } catch {
    // Storage denied: the choice still applies to this page view.
  }
}

/**
 * Wires one toggle button. Its `[data-theme-label]` child shows the current choice
 * (the button's accessible name reads "Theme: System" and so on). Every toggle on the page
 * stays in step through a change event on `root`.
 */
export function initThemeToggle(button: HTMLButtonElement, root: HTMLElement, storage: Storage | null): void {
  const label = button.querySelector<HTMLElement>('[data-theme-label]') ?? button;
  const show = (c: ThemeChoice) => {
    label.textContent = LABEL[c];
    button.dataset.choice = c;
  };
  show(readChoice(storage));
  root.addEventListener(CHANGE, (e) => show((e as CustomEvent<ThemeChoice>).detail));
  button.addEventListener('click', () => {
    const c = nextChoice((button.dataset.choice as ThemeChoice | undefined) ?? 'system');
    applyChoice(root, c);
    store(storage, c);
    root.dispatchEvent(new CustomEvent<ThemeChoice>(CHANGE, { detail: c }));
  });
}
