import type { PresetId } from './savings.ts';

/** Number formats for the savings page, as the copy's Values table gives them (US English, thousands separators). */

const nf = new Intl.NumberFormat('en-US');

/** Rounded to two significant figures, trailing zeros kept: 0.080, 7.1, 10, 450, 1,200. */
export function sig2(x: number): string {
  if (x === 0) return '0';
  const r = Number(x.toPrecision(2));
  return Math.abs(r) >= 100 ? nf.format(r) : r.toPrecision(2);
}

/** Whole number with thousands separators: 20, 1,000. */
export function formatCount(n: number): string {
  return nf.format(n);
}

/** $0.01 and over: dollars to two decimal places ($0.14, $1,234.50). Under $0.01: cents to two significant figures (0.13¢). */
export function formatCost(usd: number): string {
  // Cents while the two-significant-figure cents value is under 1 (0.64¢); from there dollars, so 0.996¢ reads $0.01, not 1.0¢.
  if (usd !== 0 && Number((usd * 100).toPrecision(2)) < 1) return `${sig2(usd * 100)}¢`;
  return `$${(Math.round(usd * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A value and a unit that steps up by 1,000 (Wh → kWh, g → kg), chosen on the rounded value so 999.7 Wh reads 1.0 kWh. */
function scaled(x: number, small: string, big: string): string {
  return Number(x.toPrecision(2)) >= 1000 ? `${sig2(x / 1000)} ${big}` : `${sig2(x)} ${small}`;
}

/** Wh under 1,000 Wh, kWh from there, two significant figures. */
export const formatEnergy = (wh: number): string => scaled(wh, 'Wh', 'kWh');

/** g under 1,000 g, kg from there, two significant figures. The page adds "CO₂e" after it. */
export const formatCarbon = (g: number): string => scaled(g, 'g', 'kg');

/** Cloud cost ÷ Mac cost, from unrounded values, to two significant figures: 110. */
export const formatRatio = (ratio: number): string => sig2(ratio);

const SIZE_PHRASES: Readonly<Record<PresetId, readonly [one: string, many: string]>> = {
  short: ['short chat', 'short chats'],
  typical: ['typical message', 'typical messages'],
  long: ['message about a long document', 'messages about a long document'],
};

/** "typical messages", or "typical message" with a count of 1. */
export function sizePhrase(preset: PresetId, count: number): string {
  return SIZE_PHRASES[preset][count === 1 ? 0 : 1];
}

export const COUNT_MIN = 1;
export const COUNT_MAX = 100_000;

/** The count field's value as a whole number from 1 to 100,000, or null (the page then shows its error). Separators are allowed. */
export function parseCount(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '');
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= COUNT_MIN && n <= COUNT_MAX ? n : null;
}
