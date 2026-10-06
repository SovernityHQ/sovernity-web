/**
 * Phone Menu: toggles `aria-expanded` on the button and `.is-open` on the nav.
 * Escape closes and returns focus; a click outside, or the viewport widening past the phone
 * breakpoint (where the Menu is hidden), closes it.
 */
export function initMenu(button: HTMLButtonElement, nav: HTMLElement): void {
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  set(false);
  button.addEventListener('click', () => set(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    set(false);
    button.focus();
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node | null;
    if (isOpen() && t && !button.contains(t) && !nav.contains(t)) set(false);
  });
  if (typeof matchMedia === 'function') {
    matchMedia('(min-width: 701px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }
}
