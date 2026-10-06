import { prefersReducedMotion, revealOnScroll } from './motion.ts';
import { initSectionSeal, stampOnLoad } from './seal.ts';

/** Studio home: section reveal, the margin seal tracker, the pulsing north star and the closing stamp. */
export function initHome(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-seal-word]'));
  revealOnScroll(sections, 'in');

  const tracker = document.querySelector<SVGElement>('[data-seal-tracker] .seal-tracker');
  if (tracker) {
    initSectionSeal(tracker, sections, sections.map((s) => s.dataset.sealWord ?? ''));
    stampOnLoad(tracker);
  }

  if (!prefersReducedMotion()) {
    for (const p of document.querySelectorAll('.home-ursa .polaris')) p.classList.add('is-pulsing');
  }

  // Stamps when its section scrolls in (CSS waits for `.in`).
  const stamp = document.querySelector('.home-stamp');
  if (stamp) stampOnLoad(stamp);
}
