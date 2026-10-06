import { prefersReducedMotion } from './motion.ts';

/**
 * The ring rotation (degrees) that puts a word centred at `wordAngle` (clockwise from the top)
 * under the tick, reached from `current` by the shorter way round.
 */
export function nextRotation(current: number, wordAngle: number): number {
  const d = ((((-wordAngle - current) % 360) + 540) % 360) - 180;
  return current + d;
}

/** Presses the seal in like a stamp: adds `.is-stamped` once (CSS runs the keyframes). No-op with reduced motion. */
export function stampOnLoad(el: Element): void {
  if (prefersReducedMotion()) return;
  el.classList.add('is-stamped');
}

/**
 * The margin tracker. `words[i]` names the ring word for `sections[i]`; the ring (`.seal-ring`)
 * turns so the current section's word (`.seal-word[data-word]`, centred at `data-angle`) sits under
 * the tick and gets `.is-lit`. A `[data-seal-count]` inside the closest `[data-seal-tracker]` shows
 * the section number. Call it once per seal (home: the margin tracker and the header seal). CSS shows the
 * margin tracker above 1320 px, the header seal at 701–1320 px and neither at 700 px and below, and drops
 * the transitions with reduced motion.
 */
export function initSectionSeal(seal: SVGElement, sections: HTMLElement[], words: string[]): void {
  const ring = seal.querySelector<SVGGElement>('.seal-ring');
  if (!ring || sections.length === 0) return;
  const wordEls = Array.from(seal.querySelectorAll<SVGElement>('.seal-word'));
  const count = seal.closest('[data-seal-tracker]')?.querySelector('[data-seal-count]') ?? null;
  let rot = 0;
  let current = -1;

  const go = (i: number) => {
    if (i === current) return;
    current = i;
    const lit = wordEls.find((w) => w.dataset.word === words[i]);
    if (lit) {
      rot = nextRotation(rot, Number(lit.dataset.angle) || 0);
      ring.style.transform = `rotate(${rot}deg)`;
    }
    for (const w of wordEls) w.classList.toggle('is-lit', w === lit);
    if (count) count.textContent = String(i + 1).padStart(2, '0');
  };

  const pick = () => {
    const line = window.innerHeight * 0.45;
    let s = 0;
    sections.forEach((el, i) => { if (el.getBoundingClientRect().top < line) s = i; });
    go(s);
  };

  // At most one pick per frame, however many scroll events arrive.
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; pick(); });
  };

  pick();
  // The first position is set without a turn; later changes animate (CSS, under .is-ready).
  requestAnimationFrame(() => requestAnimationFrame(() => seal.classList.add('is-ready')));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}
