/** Contents scroll-spy: the entry for the section in view gets `aria-current="true"` (legal.css styles it). */

/**
 * Index of the current section: the last one whose top (viewport px) has reached the reading line, or -1 before the
 * first. At the bottom of the page the last section is current, since a short last section never reaches the line.
 */
export function currentSection(tops: readonly number[], line: number, atBottom: boolean): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;
  let current = -1;
  for (let i = 0; i < tops.length; i++) if ((tops[i] ?? Infinity) <= line) current = i;
  return current;
}

/** Wires every `[data-toc]` list on the page (desktop aside and phone `<details>`) to the sections they link to. */
export function initToc(doc: Document): void {
  const links = Array.from(doc.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]'));
  const ids = [...new Set(links.map((a) => decodeURIComponent(a.hash.slice(1))))];
  const sections = ids.map((id) => doc.getElementById(id)).filter((el): el is HTMLElement => el !== null);
  if (sections.length === 0) return;
  const subnav = doc.querySelector<HTMLElement>('.ursa-subnav');
  let shown = '';
  let queued = false;

  const update = (): void => {
    queued = false;
    // Below the sticky sub-nav, a little past where a Contents click lands the heading ([id] scroll-margin-top: 96px).
    const line = Math.max(subnav?.getBoundingClientRect().bottom ?? 0, 0) + 48;
    const se = doc.scrollingElement ?? doc.documentElement;
    const atBottom = window.innerHeight + window.scrollY >= se.scrollHeight - 2;
    const i = currentSection(sections.map((s) => s.getBoundingClientRect().top), line, atBottom);
    const id = i >= 0 ? sections[i]?.id ?? '' : '';
    if (id === shown) return;
    shown = id;
    for (const a of links) {
      if (id && decodeURIComponent(a.hash.slice(1)) === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const queue = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
}
