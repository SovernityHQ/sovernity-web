/** What the Copy button shows and announces after a copy attempt (canvas R2Ursa copyLabel / copyMsg). */
export function copyFeedback(ok: boolean): { label: string; message: string } {
  return ok
    ? { label: 'Copied', message: 'Checksum copied' }
    : { label: 'Copy', message: 'Checksum selected. Press Command-C to copy it.' };
}

const RESET_MS = 2200;

/**
 * Copy buttons: `<button data-copy-target="id">` copies the text of `#id` (the SHA-256 at launch).
 * Uses the Clipboard API; when that fails it selects the text so the visitor can copy it by hand.
 * The button's label (its `<span>`, else the button) reads "Copied" for a moment, and the result
 * is announced in a polite live region.
 */
export function initCopyButtons(root: ParentNode): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-copy-target]')) {
    const target = document.getElementById(button.dataset.copyTarget ?? '');
    if (!target) continue;
    const label = button.querySelector('span') ?? button;
    const rest = label.textContent ?? 'Copy';
    const live = document.createElement('span');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    button.after(live);
    let timer: ReturnType<typeof setTimeout> | undefined;

    button.addEventListener('click', async () => {
      const text = (target.textContent ?? '').trim();
      let ok = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        ok = false;
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      const fb = copyFeedback(ok);
      label.textContent = fb.label;
      live.textContent = fb.message;
      clearTimeout(timer);
      timer = setTimeout(() => {
        label.textContent = rest;
        live.textContent = '';
      }, RESET_MS);
    });
  }
}
