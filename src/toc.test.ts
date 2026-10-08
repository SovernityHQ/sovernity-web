import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentSection } from './toc.ts';

const tops = [400, 900, 1500];

test('no section is current before the first reaches the reading line', () => {
  assert.equal(currentSection(tops, 120, false), -1);
});
test('a section is current once its top passes the reading line', () => {
  assert.equal(currentSection([100, 900, 1500], 120, false), 0);
  assert.equal(currentSection([-600, 120, 700], 120, false), 1);
  assert.equal(currentSection([-1600, -900, 50], 120, false), 2);
});
test('the last section is current at the bottom of the page, even when its top never reaches the line', () => {
  assert.equal(currentSection([-1600, -100, 400], 120, true), 2);
});
test('no sections, nothing current', () => {
  assert.equal(currentSection([], 120, true), -1);
});
