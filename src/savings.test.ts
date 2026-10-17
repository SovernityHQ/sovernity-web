import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, PRESETS, type Figure } from './savings-data.ts';
import { calculate, isPeriod, isPresetId, messageTokens, PERIOD_DAYS, PERIODS, PRESET_IDS, type Footprint, type Period, type PresetId } from './savings.ts';

/** Equal to within a relative 1e-9 (floating-point noise only). */
const close = (actual: number, expected: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${what}: ${actual} ≠ ${expected}`);
const closeFootprint = (actual: Footprint, expected: Footprint, what: string) => {
  close(actual.costUsd, expected.costUsd, `${what} cost`);
  close(actual.energyWh, expected.energyWh, `${what} energy`);
  close(actual.co2eG, expected.co2eG, `${what} CO2e`);
};

const allFigures: [string, Figure][] = [
  ...Object.entries(FIGURES),
  ...Object.entries(PRESETS).flatMap(([id, p]): [string, Figure][] => [[`${id}.inputTokens`, p.inputTokens], [`${id}.outputTokens`, p.outputTokens]]),
];

test('every figure has a value, unit, label, source URL, publisher and as-of date', () => {
  for (const [name, f] of allFigures) {
    assert.ok(Number.isFinite(f.value) && f.value > 0, `${name} value`);
    for (const k of ['unit', 'label', 'publisher'] as const) assert.ok(f[k].trim().length > 0, `${name} ${k}`);
    assert.doesNotMatch(f.source, /^[a-z]+:|^\/\//i, `${name} source carries no scheme`);
    assert.match(new URL(`https://${f.source}`).hostname, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/, `${name} source`);
    assert.match(f.asOf, /^\d{4}-\d{2}-\d{2}$/, `${name} asOf`);
  }
});

test('the figures are the recommended values in docs/calculator-sources.md, copied by hand (change both together)', () => {
  const expected: Record<keyof typeof FIGURES, number> = {
    cloudPriceInput: 2, cloudPriceOutput: 10, smallCloudPriceInput: 0.1, smallCloudPriceOutput: 0.5,
    cloudWhPerInputToken: 0.0002, cloudWhPerOutputToken: 0.0006,
    macWattsWriting: 30, macTokensPerSecondWriting: 15, macWattsReading: 35, macTokensPerSecondReading: 130,
    macWhPerInputToken: 0.000075, macWhPerOutputToken: 0.00056, macIdleWatts: 4, macMaxWatts: 65,
    gridGramsCo2ePerKwh: 458, electricityUsdPerKwh: 0.18,
  };
  assert.deepEqual(Object.fromEntries(Object.entries(FIGURES).map(([k, f]) => [k, f.value])), expected);
  assert.deepEqual(messageTokens('short'), { input: 100, output: 300 });
  assert.deepEqual(messageTokens('typical'), { input: 1000, output: 500 });
  assert.deepEqual(messageTokens('long'), { input: 10000, output: 1500 });
});

test('the Mac Wh per token figures are W ÷ tok/s, rounded as in the sources doc', () => {
  const whPerToken = (w: number, tps: number) => w / tps / 3600;
  close(Number(whPerToken(FIGURES.macWattsWriting.value, FIGURES.macTokensPerSecondWriting.value).toPrecision(2)), FIGURES.macWhPerOutputToken.value, 'output');
  close(Number(whPerToken(FIGURES.macWattsReading.value, FIGURES.macTokensPerSecondReading.value).toPrecision(2)), FIGURES.macWhPerInputToken.value, 'input');
});

// Per message, worked by hand from the figures (the sources doc's worked-check table):
// cloud Wh = in × 0.0002 + out × 0.0006; cloud $ = (in × 2 + out × 10) ÷ 1M;
// Mac Wh = in × 0.000075 + out × 0.00056; Mac $ = Wh ÷ 1000 × 0.18; g CO2e = Wh ÷ 1000 × 458.
const HAND: Record<PresetId, { cloud: Footprint; local: Footprint }> = {
  short: {
    cloud: { energyWh: 0.2, costUsd: 0.0032, co2eG: 0.0916 },
    local: { energyWh: 0.1755, costUsd: 0.00003159, co2eG: 0.080379 },
  },
  typical: {
    cloud: { energyWh: 0.5, costUsd: 0.007, co2eG: 0.229 },
    local: { energyWh: 0.355, costUsd: 0.0000639, co2eG: 0.16259 },
  },
  long: {
    cloud: { energyWh: 2.9, costUsd: 0.035, co2eG: 1.3282 },
    local: { energyWh: 1.59, costUsd: 0.0002862, co2eG: 0.72822 },
  },
};

for (const preset of PRESET_IDS) {
  test(`${preset}: one message a day matches the hand-computed values`, () => {
    const r = calculate(1, 'day', preset);
    const h = HAND[preset];
    assert.deepEqual(r.tokens, messageTokens(preset));
    closeFootprint(r.cloud, h.cloud, 'cloud');
    closeFootprint(r.local, h.local, 'local');
    closeFootprint(r.savings, {
      costUsd: h.cloud.costUsd - h.local.costUsd,
      energyWh: h.cloud.energyWh - h.local.energyWh,
      co2eG: h.cloud.co2eG - h.local.co2eG,
    }, 'savings');
    close(r.costRatio ?? NaN, h.cloud.costUsd / h.local.costUsd, 'cost ratio');
  });

  for (const period of PERIODS) {
    test(`${preset} × ${period}: count 0 gives zero everywhere`, () => {
      const r = calculate(0, period, preset);
      for (const t of [r, r.year]) {
        assert.equal(t.messages, 0);
        assert.deepEqual(t.tokens, { input: 0, output: 0 });
        for (const side of [t.cloud, t.local, t.savings]) assert.deepEqual(side, { costUsd: 0, energyWh: 0, co2eG: 0 });
        assert.equal(t.costRatio, null);
      }
    });

    test(`${preset} × ${period}: a large count scales linearly, and the year carries it over`, () => {
      const count = 100_000;
      const r = calculate(count, period, preset);
      const one = calculate(1, period, preset);
      const perYear = PERIOD_DAYS.year / PERIOD_DAYS[period];
      const scale = (f: Footprint, k: number): Footprint => ({ costUsd: f.costUsd * k, energyWh: f.energyWh * k, co2eG: f.co2eG * k });
      assert.equal(r.messages, count);
      assert.deepEqual(r.tokens, { input: messageTokens(preset).input * count, output: messageTokens(preset).output * count });
      closeFootprint(r.cloud, scale(HAND[preset].cloud, count), 'cloud');
      closeFootprint(r.local, scale(HAND[preset].local, count), 'local');
      closeFootprint(r.savings, scale(one.savings, count), 'savings');
      close(r.year.messages, count * perYear, 'year messages');
      closeFootprint(r.year.cloud, scale(r.cloud, perYear), 'year cloud');
      closeFootprint(r.year.local, scale(r.local, perYear), 'year local');
    });

    test(`${preset} × ${period}: local energy, CO2e and cost are above zero for any count above zero`, () => {
      for (const count of [1e-9, 0.5, 1, 7, 20, 1234, 100_000, 1e12]) {
        const r = calculate(count, period, preset);
        for (const t of [r, r.year]) {
          assert.ok(t.local.energyWh > 0, `energy at ${count}`);
          assert.ok(t.local.co2eG > 0, `CO2e at ${count}`);
          assert.ok(t.local.costUsd > 0, `cost at ${count}`);
        }
      }
    });
  }
}

test('a month is a twelfth of a year and a week is seven days', () => {
  close(calculate(5, 'month', 'typical').year.messages, 60, 'month');
  close(calculate(5, 'week', 'typical').year.messages, 5 * 365 / 7, 'week');
  close(calculate(5, 'year', 'typical').year.messages, 5, 'year');
});

test('the copy draft example: 20 typical messages a day', () => {
  const r = calculate(20, 'day', 'typical');
  close(r.cloud.costUsd, 0.14, 'cloud $');
  close(r.local.costUsd, 0.001278, 'Mac $ (0.13¢)');
  close(r.cloud.energyWh, 10, 'cloud Wh');
  close(r.local.energyWh, 7.1, 'Mac Wh');
  close(r.cloud.co2eG, 4.58, 'cloud g');
  close(r.local.co2eG, 3.2518, 'Mac g');
  close(r.year.cloud.costUsd, 51.1, 'year cloud $');
  close(r.year.local.costUsd, 0.46647, 'year Mac $ ($0.47)');
  assert.equal(Number(r.costRatio?.toPrecision(2)), 110);
});

test('a negative or non-finite count is rejected', () => {
  for (const bad of [-1, NaN, Infinity, -Infinity]) assert.throws(() => calculate(bad, 'day', 'typical'), RangeError);
});

test('-0 is treated as 0', () => {
  assert.ok(Object.is(calculate(-0, 'day', 'typical').cloud.costUsd, 0));
});

test('an unknown period or preset, as read from a form field, is rejected', () => {
  assert.throws(() => calculate(1, 'fortnight' as Period, 'typical'), RangeError);
  assert.throws(() => calculate(1, 'day', 'huge' as PresetId), RangeError);
  assert.throws(() => calculate(1, 'day', 'toString' as PresetId), RangeError);
});

test('the guards accept exactly the periods and presets', () => {
  assert.ok(PERIODS.every(isPeriod));
  assert.ok(PRESET_IDS.every(isPresetId));
  assert.deepEqual([...PRESET_IDS].sort(), ['long', 'short', 'typical']);
  for (const bad of ['', 'Day', 'fortnight', 'toString', undefined, 1]) {
    assert.equal(isPeriod(bad), false);
    assert.equal(isPresetId(bad), false);
  }
});
