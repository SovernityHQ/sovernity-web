import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readChoice, nextChoice } from './theme.ts';

const store = (v: string | null) => ({ getItem: () => v });
test('reads a stored choice', () => {
  assert.equal(readChoice(store('dark')), 'dark');
  assert.equal(readChoice(store('light')), 'light');
});
test('unknown or missing value is system', () => {
  assert.equal(readChoice(store('purple')), 'system');
  assert.equal(readChoice(store(null)), 'system');
  assert.equal(readChoice(null), 'system');
});
test('storage that throws is system', () => {
  assert.equal(readChoice({ getItem: () => { throw new Error('denied'); } }), 'system');
});
test('cycles system, light, dark', () => {
  assert.deepEqual([nextChoice('system'), nextChoice('light'), nextChoice('dark')], ['light', 'dark', 'system']);
});
