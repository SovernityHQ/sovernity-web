import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFeedback } from './copy.ts';

test('a successful copy says Copied and announces it', () => {
  assert.deepEqual(copyFeedback(true), { label: 'Copied', message: 'Checksum copied' });
});
test('a failed copy keeps the label and says the text is selected', () => {
  assert.deepEqual(copyFeedback(false), { label: 'Copy', message: 'Checksum selected. Press Command-C to copy it.' });
});
