import { prefersReducedMotion, revealOnScroll } from './motion.ts';
import { initStudioTracker, stampOnLoad } from './seal.ts';

/** Studio home: section reveal, the seal tracker, the north-star pointer glow and the closing stamp. */
export function initHome(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-seal-word]'));
  revealOnScroll(sections, 'in');
  initStudioTracker(sections);

  // The pointer glow runs only while the Ursa panel is in view (CSS animates under `.is-live`).
  const ursa = document.querySelector('.home-ursa');
  if (ursa && !prefersReducedMotion() && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const en of entries) en.target.classList.toggle('is-live', en.isIntersecting);
    }, { rootMargin: '0px 0px -12% 0px' }).observe(ursa);
  }

  // Stamps when its section scrolls in (CSS waits for `.in`).
  const stamp = document.querySelector('.home-stamp');
  if (stamp) stampOnLoad(stamp);
}
