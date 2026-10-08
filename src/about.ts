import { revealOnScroll } from './motion.ts';
import { initStudioTracker, stampOnLoad } from './seal.ts';

/** About: section reveal, the seal tracker, and the small seal stamped on the headshot. */
export function initAbout(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-seal-word]'));
  revealOnScroll(sections, 'in');
  initStudioTracker(sections);

  // Stamps when the founder section scrolls in (CSS waits for `.in`).
  const stamp = document.querySelector('.ab-pstamp');
  if (stamp) stampOnLoad(stamp);
}
