/**
 * Copy buttons: `<button data-copy-target="id">` copies the text of `#id` (the SHA-256 at launch).
 * Uses the Clipboard API; when that fails it selects the text so the visitor can copy it by hand.
 * The result is announced in a polite live region.
 */
export function initCopyButtons(root: ParentNode): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-copy-target]')) {
    const target = document.getElementById(button.dataset.copyTarget ?? '');
    if (!target) continue;
    const live = document.createElement('span');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    button.after(live);

    button.addEventListener('click', async () => {
      const text = (target.textContent ?? '').trim();
      try {
        await navigator.clipboard.writeText(text);
        live.textContent = 'Checksum copied';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }
}
