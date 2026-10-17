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
 * no requests. An invalid count shows the error under the field; the result keeps the last good count but still
 * follows the period and size. An emptied field waits for `change` before it shows the error, so retyping doesn't flash it.
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

  let last = 20;
  const update = (e?: Event): void => {
    const n = parseCount(count.value);
    const p = period.value;
    const preset = new FormData(form).get('preset');
    const showError = n === null && (count.value.trim() !== '' || e?.type !== 'input');
    if (n !== null) last = n;
    if (error) error.hidden = !showError;
    // The error is the field's description only while it shows.
    if (showError) { count.setAttribute('aria-invalid', 'true'); count.setAttribute('aria-describedby', 'sv-count-err'); }
    else { count.removeAttribute('aria-invalid'); count.removeAttribute('aria-describedby'); }
    if (!isPeriod(p) || !isPresetId(preset)) return;
    if (countLabel) countLabel.textContent = last === 1 ? 'message' : 'messages';
    for (const [name, value] of Object.entries(savingsOutputs(last, p, preset))) {
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
