import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandIncludes, markCurrent, buildSite } from './build.ts';

test('expands an include marker', () => {
  const p = new Map([['footer', '<footer>F</footer>']]);
  assert.equal(expandIncludes('<main></main>\n<!-- include:footer -->\n', p), '<main></main>\n<footer>F</footer>\n');
});
test('unknown include is an error', () => {
  assert.throws(() => expandIncludes('<!-- include:nope -->', new Map()), /unknown partial "nope"/);
});
test('include inside a partial is an error', () => {
  const p = new Map([['a', '<!-- include:b -->'], ['b', 'x']]);
  assert.throws(() => expandIncludes('<!-- include:a -->', p), /nested include/);
});
test('marks exact and section links', () => {
  const html = '<a href="/ursa/" data-current="section">Ursa</a><a href="/ursa/" data-current="exact">Overview</a><a href="/ursa/privacy/" data-current="exact">Privacy</a>';
  assert.equal(markCurrent(html, '/ursa/privacy/'),
    '<a href="/ursa/" aria-current="page">Ursa</a><a href="/ursa/">Overview</a><a href="/ursa/privacy/" aria-current="page">Privacy</a>');
});
test('home section link only matches home', () => {
  assert.equal(markCurrent('<a href="/" data-current="section">S</a>', '/about/'), '<a href="/">S</a>');
});
test('buildSite copies assets, skips _partials, expands pages', async () => {
  const src = await mkdtemp(join(tmpdir(), 'sw-src-')); const out = await mkdtemp(join(tmpdir(), 'sw-out-'));
  await mkdir(join(src, '_partials')); await mkdir(join(src, 'ursa')); await mkdir(join(src, 'assets'));
  await writeFile(join(src, '_partials', 'f.html'), '<b>f</b>');
  await writeFile(join(src, 'ursa', 'index.html'), '<!-- include:f -->');
  await writeFile(join(src, 'assets', 'x.css'), 'a{}');
  const pages = await buildSite(src, out);
  assert.deepEqual(pages, ['ursa/index.html']);
  assert.equal(await readFile(join(out, 'ursa', 'index.html'), 'utf8'), '<b>f</b>');
  assert.equal(await readFile(join(out, 'assets', 'x.css'), 'utf8'), 'a{}');
  await assert.rejects(access(join(out, '_partials')));
});
