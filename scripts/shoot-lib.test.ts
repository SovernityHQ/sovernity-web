import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parseRgb, isLargeText, matrix } from './shoot-lib.ts';

test('black on white is 21:1', () => { assert.equal(Math.round(contrastRatio([0,0,0],[255,255,255])), 21); });
test('studio muted on paper passes AA', () => {
  assert.ok(contrastRatio([0x5E,0x5A,0x53],[0xF5,0xF3,0xEE]) >= 4.5);
});
test('parses rgb and rgba', () => {
  assert.deepEqual(parseRgb('rgb(1, 2, 3)'), [1,2,3,1]);
  assert.deepEqual(parseRgb('rgba(1, 2, 3, 0.5)'), [1,2,3,0.5]);
});
test('large text thresholds', () => {
  assert.ok(isLargeText(24, 400)); assert.ok(isLargeText(19, 700)); assert.ok(!isLargeText(18, 400));
});
test('matrix size', () => { assert.equal(matrix(Array.from({ length: 10 }, (_, i) => `/p${i}/`)).length, 80); });
