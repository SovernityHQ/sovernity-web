import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRotation } from './seal.ts';

test('nextRotation puts the word under the tick', () => {
  assert.equal(nextRotation(0, 0), 0);
  assert.equal(nextRotation(0, 90), -90);
});

test('nextRotation takes the shorter way round', () => {
  // A word at 266.47° is reached by turning +93.53°, not −266.47°.
  assert.ok(Math.abs(nextRotation(0, 266.47) - 93.53) < 1e-9);
  // From −100 (word at 100° under the tick) to a word at 186.73°: −86.73° more.
  assert.ok(Math.abs(nextRotation(-100, 186.73) - -186.73) < 1e-9);
});

test('nextRotation accumulates instead of jumping back across 360°', () => {
  let r = 0;
  for (const a of [100, 190, 270, 0, 100]) r = nextRotation(r, a);
  // Four quarter-ish steps clockwise of the word order turn the ring one full turn the other way.
  assert.equal(r, -460);
});
