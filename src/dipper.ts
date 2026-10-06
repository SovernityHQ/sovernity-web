import { prefersReducedMotion } from './motion.ts';

/** The Big Dipper in path order S1…S7 (viewBox 0 0 210 120); the route closes S7→S4. */
export const STARS: readonly (readonly [number, number])[] = [[12, 78], [52, 50], [86, 56], [128, 62], [196, 40], [200, 92], [142, 104]];

const TOTAL = 9;

export type TrackerState = { lit: number; lines: number; halo: number | null; done: boolean; label: string };

/**
 * The sub-nav tracker at a section step (design note §3, canvas R2Ursa renderVals): the hero lights
 * S1, each of the next six sections draws the segment into the next star, Questions (8) closes the
 * bowl S7→S4 with the halo on S4, and Download (9) completes the figure.
 */
export function trackerState(step: number, total = TOTAL): TrackerState {
  const k = Math.max(1, Math.min(total, step));
  const lit = Math.min(k, 7);
  const lines = Math.min(k - 1, 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    lit,
    lines,
    halo: k === total ? null : k === 8 ? 4 : lit,
    done: k >= total,
    label: `${pad(k)} / ${pad(total)}`,
  };
}

/**
 * The step of the last section (in page order, steps 1…n) whose top is above 55% of the viewport;
 * 1 when none is, and `total` (the last step) when the page is scrolled to the bottom.
 */
export function currentStep(sectionTops: number[], viewportH: number, atBottom: boolean, total = TOTAL): number {
  if (atBottom) return total;
  let step = 1;
  sectionTops.forEach((top, i) => { if (top < viewportH * 0.55) step = i + 1; });
  return step;
}

/** Drives the sub-nav tracker (`.r2u-ts`, `.r2u-tl`, `.r2u-th`, `.r2u-count`) from the scroll position. */
export function initTracker(svg: SVGElement, sections: HTMLElement[]): void {
  const stars = Array.from(svg.querySelectorAll<SVGCircleElement>('.r2u-ts'));
  const lines = Array.from(svg.querySelectorAll<SVGPathElement>('.r2u-tl'));
  const halo = svg.querySelector<SVGCircleElement>('.r2u-th');
  const count = svg.closest('.ursa-brand')?.querySelector('.r2u-count') ?? null;
  let shown = -1;

  const update = () => {
    const se = document.scrollingElement ?? document.documentElement;
    const atBottom = se.scrollTop > 0 && se.scrollTop + window.innerHeight >= se.scrollHeight - 2;
    const step = currentStep(sections.map((s) => s.getBoundingClientRect().top), window.innerHeight, atBottom);
    if (step === shown) return;
    shown = step;
    const st = trackerState(step);
    stars.forEach((s, i) => s.classList.toggle('on', i < st.lit));
    lines.forEach((l, i) => l.classList.toggle('on', i < st.lines));
    if (halo) {
      const at = st.halo === null ? undefined : STARS[st.halo - 1];
      if (at) {
        halo.setAttribute('cx', String(at[0]));
        halo.setAttribute('cy', String(at[1]));
      }
      halo.classList.toggle('on', at !== undefined);
    }
    svg.classList.toggle('is-done', st.done);
    if (count) count.textContent = st.label;
  };

  // At most one update per frame, however many scroll events arrive.
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}

/**
 * Section Dippers: `.is-drawing` while in view, so the new segment draws and its star lights each
 * time the Dipper scrolls in. At rest (no class) the figure is complete. Nothing with reduced motion.
 */
export function initSectionDippers(dips: SVGElement[]): void {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) en.target.classList.toggle('is-drawing', en.isIntersecting);
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  for (const d of dips) io.observe(d);
}
