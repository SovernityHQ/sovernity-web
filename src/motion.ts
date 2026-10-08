export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Adds `cls` to each element once it scrolls into view; at once with reduced motion or no IntersectionObserver. */
export function revealOnScroll(els: Element[], cls: string, rootMargin = '0px 0px -12% 0px'): void {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    for (const el of els) el.classList.add(cls);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add(cls);
      io.unobserve(en.target);
    }
  }, { threshold: 0, rootMargin });
  for (const el of els) io.observe(el);
}
