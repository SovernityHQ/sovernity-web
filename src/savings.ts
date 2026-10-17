import { FIGURES, PRESETS } from './savings-data.ts';

export const PERIODS = ['day', 'week', 'month', 'year'] as const;
export type Period = (typeof PERIODS)[number];
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/** For values read from form fields. */
export const isPeriod = (v: unknown): v is Period => (PERIODS as readonly unknown[]).includes(v);
export const isPresetId = (v: unknown): v is PresetId => (PRESET_IDS as unknown[]).includes(v);

/** Days in each period. A month is an average one, so twelve months make a year. */
export const PERIOD_DAYS: Readonly<Record<Period, number>> = { day: 1, week: 7, month: 365 / 12, year: 365 };

export interface Tokens { input: number; output: number }
/** One side's totals: cost in USD, energy in Wh, carbon in g CO2e. */
export interface Footprint { costUsd: number; energyWh: number; co2eG: number }

export interface Totals {
  /** Messages counted: the count for the period, or the count scaled to a year. */
  messages: number;
  tokens: Tokens;
  cloud: Footprint;
  local: Footprint;
  /** Cloud minus local. Positive when the Mac uses less. */
  savings: Footprint;
  /** Cloud cost ÷ local cost, unrounded. Null when there are no messages. */
  costRatio: number | null;
}

/** Totals for the chosen period, and the same use carried over a year (`year` equals the period totals when the period is a year). */
export interface Result extends Totals { year: Totals }

/** Tokens read and written for one message of the preset. */
export function messageTokens(preset: PresetId): Tokens {
  const p = PRESETS[preset];
  return { input: p.inputTokens.value, output: p.outputTokens.value };
}

const co2e = (wh: number) => (wh / 1000) * FIGURES.gridGramsCo2ePerKwh.value;

/**
 * Totals for `messages` messages of `preset`. Cloud cost is the API price per token; local cost is
 * the Mac's energy at the household electricity price. Both sides share the same grid carbon intensity.
 */
function totals(messages: number, preset: PresetId): Totals {
  const per = messageTokens(preset);
  const tokens = { input: per.input * messages, output: per.output * messages };

  const cloudWh = tokens.input * FIGURES.cloudWhPerInputToken.value + tokens.output * FIGURES.cloudWhPerOutputToken.value;
  const cloud = {
    costUsd: (tokens.input * FIGURES.cloudPriceInput.value + tokens.output * FIGURES.cloudPriceOutput.value) / 1e6,
    energyWh: cloudWh,
    co2eG: co2e(cloudWh),
  };

  const localWh = tokens.input * FIGURES.macWhPerInputToken.value + tokens.output * FIGURES.macWhPerOutputToken.value;
  const local = {
    costUsd: (localWh / 1000) * FIGURES.electricityUsdPerKwh.value,
    energyWh: localWh,
    co2eG: co2e(localWh),
  };

  return {
    messages,
    tokens,
    cloud,
    local,
    savings: {
      costUsd: cloud.costUsd - local.costUsd,
      energyWh: cloud.energyWh - local.energyWh,
      co2eG: cloud.co2eG - local.co2eG,
    },
    costRatio: local.costUsd > 0 ? cloud.costUsd / local.costUsd : null,
  };
}

/**
 * `count` messages of `preset` sent every `period`: totals for one period, plus the same over a year.
 * Throws a RangeError for a negative or non-finite count, or an unknown period or preset. Any finite
 * count ≥ 0 is accepted; the page owns its narrower input rule (whole numbers from 1 to 100,000).
 */
export function calculate(count: number, period: Period, preset: PresetId): Result {
  if (!Number.isFinite(count) || count < 0) throw new RangeError(`count must be a finite number ≥ 0, got ${count}`);
  if (!isPeriod(period)) throw new RangeError(`unknown period ${String(period)}`);
  if (!isPresetId(preset)) throw new RangeError(`unknown preset ${String(preset)}`);
  const n = count + 0; // -0 → 0
  return { ...totals(n, preset), year: totals((n * PERIOD_DAYS.year) / PERIOD_DAYS[period], preset) };
}
