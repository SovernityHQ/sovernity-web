/** Phone Menu: toggles `aria-expanded` on the button and `.is-open` on the nav; Escape closes and returns focus. */
export function initMenu(button: HTMLButtonElement, nav: HTMLElement): void {
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  set(false);
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
    set(false);
    button.focus();
  });
}
