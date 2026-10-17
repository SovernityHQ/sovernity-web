import { calculate, isPeriod, isPresetId, type Period, type PresetId } from './savings.ts';
import { formatCarbon, formatCost, formatCount, formatEnergy, formatRatio, parseCount, sizePhrase } from './savings-format.ts';

/** Every `[data-out]` value on the page for one input, keyed by its `data-out` name. Pure, so the page's written-in default can be tested against it. */
export function savingsOutputs(count: number, period: Period, preset: PresetId): Record<string, string> {
  const r = calculate(count, period, preset);
  return {
    period,
    count: formatCount(count),
    size: sizePhrase(preset, count),
    cloudCost: formatCost(r.cloud.costUsd),
    macCost: formatCost(r.local.costUsd),
    cloudEnergy: formatEnergy(r.cloud.energyWh),
    macEnergy: formatEnergy(r.local.energyWh),
    cloudCarbon: formatCarbon(r.cloud.co2eG),
    macCarbon: formatCarbon(r.local.co2eG),
    ratio: r.costRatio === null ? '' : formatRatio(r.costRatio),
    yearCloudCost: formatCost(r.year.cloud.costUsd),
    yearMacCost: formatCost(r.year.local.costUsd),
  };
}

/**
 * Savings calculator: shows the form (hidden without JS) and rewrites the result on every input, in the page, with
 * no requests. An invalid count shows the error under the field and leaves the last good result in place.
 */
export function initSavings(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-savings-form]');
  const result = document.querySelector<HTMLElement>('[data-savings-result]');
  if (!form || !result) return;
  const count = form.elements.namedItem('count');
  const period = form.elements.namedItem('period');
  if (!(count instanceof HTMLInputElement) || !(period instanceof HTMLSelectElement)) return;
  const error = form.querySelector<HTMLElement>('[data-count-error]');
  const countLabel = form.querySelector<HTMLElement>('[data-count-label]');
  const year = result.querySelector<HTMLElement>('[data-year]');
  const outs = new Map(Array.from(result.querySelectorAll<HTMLElement>('[data-out]'), (el) => [el.dataset.out ?? '', el]));

  const update = (): void => {
    const n = parseCount(count.value);
    const p = period.value;
    const preset = new FormData(form).get('preset');
    if (error) error.hidden = n !== null;
    if (n === null) { count.setAttribute('aria-invalid', 'true'); return; }
    count.removeAttribute('aria-invalid');
    if (!isPeriod(p) || !isPresetId(preset)) return;
    if (countLabel) countLabel.textContent = n === 1 ? 'message' : 'messages';
    for (const [name, value] of Object.entries(savingsOutputs(n, p, preset))) {
      const el = outs.get(name);
      if (el && el.textContent !== value) el.textContent = value;
    }
    if (year) year.hidden = p === 'year';
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  form.hidden = false;
  // A restored form (back/forward cache, autofill) may not hold the defaults the HTML was written for.
  update();
}
