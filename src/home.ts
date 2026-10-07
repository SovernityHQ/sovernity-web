import { prefersReducedMotion, revealOnScroll } from './motion.ts';
import { initStudioTracker, stampOnLoad } from './seal.ts';

/** Studio home: section reveal, the seal tracker, the follow-the-pointers sequence and the closing stamp. */
export function initHome(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-seal-word]'));
  revealOnScroll(sections, 'in');
  initStudioTracker(sections);

  // Follow the pointers (CSS): plays once `.is-live` is set, as the Dipper comes into view. Only when the figure is
  // wholly out of the viewport again does it stop (the twinkle too) and re-arm: `.is-armed` holds the dim start, so a
  // visitor never sees it dim unless the sequence is about to play, and `.is-seen` shortens the next wait.
  const dip = document.querySelector('.home-dipcol');
  if (dip && !prefersReducedMotion() && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      if (!entries.at(-1)?.isIntersecting) return;
      dip.classList.add('is-live');
      dip.classList.remove('is-armed');
    }, { rootMargin: '0px 0px -12% 0px' }).observe(dip);
    new IntersectionObserver((entries) => {
      if (entries.at(-1)?.isIntersecting !== false) return;
      if (dip.classList.contains('is-live')) dip.classList.add('is-seen');
      dip.classList.remove('is-live');
      dip.classList.add('is-armed');
    }).observe(dip);
  }

  // Stamps when its section scrolls in (CSS waits for `.in`).
  const stamp = document.querySelector('.home-stamp');
  if (stamp) stampOnLoad(stamp);
}
