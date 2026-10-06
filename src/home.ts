import { prefersReducedMotion, revealOnScroll } from './motion.ts';
import { initStudioTracker, stampOnLoad } from './seal.ts';

/** Studio home: section reveal, the seal tracker, the pulsing north star and the closing stamp. */
export function initHome(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-seal-word]'));
  revealOnScroll(sections, 'in');
  initStudioTracker(sections);

  if (!prefersReducedMotion()) {
    for (const p of document.querySelectorAll('.home-ursa .polaris')) p.classList.add('is-pulsing');
  }

  // Stamps when its section scrolls in (CSS waits for `.in`).
  const stamp = document.querySelector('.home-stamp');
  if (stamp) stampOnLoad(stamp);
}
