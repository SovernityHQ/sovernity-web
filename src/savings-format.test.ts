import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCarbon, formatCost, formatCount, formatEnergy, formatRatio, parseCount, sig2, sizePhrase } from './savings-format.ts';
import { calculate } from './savings.ts';

test('sig2 keeps two significant figures and trailing zeros', () => {
  assert.equal(sig2(0.0799), '0.080');
  assert.equal(sig2(7.123), '7.1');
  assert.equal(sig2(10), '10');
  assert.equal(sig2(9.96), '10');
  assert.equal(sig2(109.5), '110');
  assert.equal(sig2(449), '450');
  assert.equal(sig2(123_456), '120,000');
  assert.equal(sig2(0), '0');
});

test('count has thousands separators', () => {
  assert.equal(formatCount(20), '20');
  assert.equal(formatCount(1000), '1,000');
  assert.equal(formatCount(100_000), '100,000');
});

test('cost: dollars from $0.01, cents below', () => {
  assert.equal(formatCost(0.14), '$0.14');
  assert.equal(formatCost(51.1), '$51.10');
  assert.equal(formatCost(1234.5), '$1,234.50');
  assert.equal(formatCost(0.01), '$0.01');
  assert.equal(formatCost(0.00996), '$0.01', 'rounds up to a cent, not "1.0¢"');
  assert.equal(formatCost(0.0064), '0.64¢', 'under a cent stays in cents');
  assert.equal(formatCost(0.005), '0.50¢');
  assert.equal(formatCost(0.00994), '0.99¢');
  assert.equal(formatCost(0), '$0.00');
  assert.equal(formatCost(0.001278), '0.13¢');
  assert.equal(formatCost(0.00004), '0.0040¢');
});

test('energy and carbon step up a unit at 1,000', () => {
  assert.equal(formatEnergy(10), '10 Wh');
  assert.equal(formatEnergy(0.0799), '0.080 Wh');
  assert.equal(formatEnergy(999.7), '1.0 kWh');
  assert.equal(formatEnergy(1500), '1.5 kWh');
  assert.equal(formatEnergy(106_000_000), '110,000 kWh');
  assert.equal(formatCarbon(4.58), '4.6 g');
  assert.equal(formatCarbon(2_400), '2.4 kg');
});

test('size phrase is singular at a count of 1', () => {
  assert.equal(sizePhrase('typical', 20), 'typical messages');
  assert.equal(sizePhrase('typical', 1), 'typical message');
  assert.equal(sizePhrase('short', 2), 'short chats');
  assert.equal(sizePhrase('short', 1), 'short chat');
  assert.equal(sizePhrase('long', 3), 'messages about a long document');
  assert.equal(sizePhrase('long', 1), 'message about a long document');
});

test('count field: whole numbers from 1 to 100,000', () => {
  for (const [raw, want] of [['20', 20], [' 1 ', 1], ['100000', 100_000], ['1,000', 1000]] as const) assert.equal(parseCount(raw), want, raw);
  for (const raw of ['', '0', '100001', '1.5', '-3', '1e3', 'abc', '2 0']) assert.equal(parseCount(raw), null, raw);
});

test('the copy\'s default example: 20 typical messages a day', () => {
  const r = calculate(20, 'day', 'typical');
  assert.deepEqual(
    [formatCost(r.cloud.costUsd), formatCost(r.local.costUsd), formatEnergy(r.cloud.energyWh), formatEnergy(r.local.energyWh),
      formatCarbon(r.cloud.co2eG), formatCarbon(r.local.co2eG), formatRatio(r.costRatio ?? 0), formatCost(r.year.cloud.costUsd), formatCost(r.year.local.costUsd)],
    ['$0.14', '0.13¢', '10 Wh', '7.1 Wh', '4.6 g', '3.3 g', '110', '$51.10', '$0.47'],
  );
});
