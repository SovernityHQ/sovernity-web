// Pure helpers for scripts/shoot.ts: WCAG contrast, CSS colour parsing, the shot matrix.

export type Rgb = [number, number, number];
export type Rgba = [number, number, number, number];

export type Shot = {
  page: string;
  theme: 'light' | 'dark';
  width: 1440 | 390;
  js: boolean;
  motion: 'full' | 'reduce';
  stored?: 'light' | 'dark';
};

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Parses a computed `rgb()`/`rgba()` colour (comma or space syntax). Throws on anything else. */
export function parseRgb(css: string): Rgba {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(css.trim());
  if (!m) throw new Error(`unparseable colour "${css}"`);
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), alpha];
}

/** Source-over composite of `top` onto an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgb): Rgb {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i]! * a + bottom[i]! * (1 - a)) as Rgb;
}

/** WCAG large text: at least 24 px, or at least 18.66 px (14 pt) and bold. */
export function isLargeText(px: number, weight: number): boolean {
  return px >= 24 || (px >= 18.66 && weight >= 700);
}

/** The 80 per-page shots (10 pages); shoot.ts adds the stored-theme shots. */
export function matrix(pages: string[]): Shot[] {
  const out: Shot[] = [];
  for (const page of pages) {
    for (const theme of ['light', 'dark'] as const) {
      for (const width of [1440, 390] as const) out.push({ page, theme, width, js: true, motion: 'full' });
    }
    out.push({ page, theme: 'light', width: 1440, js: true, motion: 'reduce' });
    out.push({ page, theme: 'dark', width: 390, js: true, motion: 'reduce' });
    out.push({ page, theme: 'light', width: 1440, js: false, motion: 'full' });
    out.push({ page, theme: 'dark', width: 390, js: false, motion: 'full' });
  }
  return out;
}

/** `/` → `home`, `/ursa/privacy/` → `ursa-privacy`, `/ursa/nope/` (the 404 shot) → `404`. */
export function pageSlug(page: string): string {
  if (page === '/ursa/nope/') return '404';
  return page.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
}

/** `<theme>-<width>-<js|nojs>-<motion>[-stored-x]` */
export function shotName(s: Shot): string {
  return `${s.theme}-${s.width}-${s.js ? 'js' : 'nojs'}-${s.motion}${s.stored ? `-stored-${s.stored}` : ''}`;
}
