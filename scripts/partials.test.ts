import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_BOOT } from './check-rules.ts';

const partials = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', '_partials');

test('head partial carries the theme boot script byte for byte', async () => {
  const head = await readFile(join(partials, 'head.html'), 'utf8');
  assert.ok(head.includes(THEME_BOOT), 'site/_partials/head.html must contain THEME_BOOT exactly');
});
