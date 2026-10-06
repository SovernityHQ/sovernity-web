import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackerState, currentStep } from './dipper.ts';

test('hero lights star 1 with no lines', () => {
  assert.deepEqual(trackerState(1), { lit: 1, lines: 0, halo: 1, done: false, label: '01 / 09' });
});
test('section 7 lights all seven stars, six lines', () => {
  assert.deepEqual(trackerState(7), { lit: 7, lines: 6, halo: 7, done: false, label: '07 / 09' });
});
test('questions close the bowl with the halo on S4', () => {
  assert.deepEqual(trackerState(8), { lit: 7, lines: 7, halo: 4, done: false, label: '08 / 09' });
});
test('download completes the figure', () => {
  assert.deepEqual(trackerState(9), { lit: 7, lines: 7, halo: null, done: true, label: '09 / 09' });
});
test('out-of-range steps clamp', () => {
  assert.equal(trackerState(0).lit, 1);
  assert.equal(trackerState(42).done, true);
});
test('current step is the last section above 55% of the viewport', () => {
  assert.equal(currentStep([0, 300, 900, 1600], 1000, false), 2);
  assert.equal(currentStep([800, 1600], 1000, false), 1);
  assert.equal(currentStep([0, 300], 1000, true), 9);
});
