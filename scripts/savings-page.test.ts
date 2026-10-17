import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES, PRESETS, type Figure } from '../src/savings-data.ts';
import { savingsOutputs } from '../src/savings-page.ts';
import { renderSources, SOURCE_GROUPS, sourceUrl } from './savings-sources.ts';
import { visibleText } from './check-rules.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pageSrc = () => readFile(join(root, 'site', 'savings', 'index.html'), 'utf8');

test('the written-in default result is calculate(20, day, typical), formatted', async () => {
  const html = await pageSrc();
  const inPage = Object.fromEntries([...html.matchAll(/<(\w+)[^>]*\bdata-out="(\w+)"[^>]*>([^<]*)<\/\1>/g)].map((m) => [m[2], m[3]]));
  assert.deepEqual(inPage, savingsOutputs(20, 'day', 'typical'));
});

test('the page form defaults are the same 20, day, Typical', async () => {
  const html = await pageSrc();
  assert.match(html, /<input id="sv-count"[^>]*value="20"/);
  assert.match(html, /<option value="day" selected>/);
  assert.match(html, /<input id="sv-p-typical"[^>]*checked>/);
  assert.equal((html.match(/<input [^>]*\bchecked\b/g) ?? []).length, 1);
});

test('the Sources list links every source in the assumptions module except the unlinked llama.cpp line', () => {
  const allFigures: Figure[] = [...Object.values(FIGURES), ...Object.values(PRESETS).flatMap((p) => [p.inputTokens, p.outputTokens])];
  const moduleUrls = new Set(allFigures.map(sourceUrl));
  const html = renderSources();
  const linked = new Set([...html.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => {
    assert.equal(m[1], m[2].replace(/&amp;/g, '&'), 'link text is the URL');
    return m[1].replace(/&amp;/g, '&');
  }));
  for (const u of linked) assert.ok(moduleUrls.has(u), `${u} comes from the module`);
  assert.deepEqual([...moduleUrls].filter((u) => !linked.has(u)), [`https://${FIGURES.macTokensPerSecondReading.source}`]);
});

test('the Sources list carries the copy\'s headings and lines, in order', () => {
  assert.deepEqual(SOURCE_GROUPS.map((g) => g.heading), ['Cloud price', 'Message sizes', 'Cloud energy', 'Mac power and speed', 'Grid carbon', 'Electricity price']);
  const text = visibleText(renderSources());
  for (const line of [
    'GPT-6 Sol (gpt-6.1-sol), $2.00 per 1M input tokens and $10.00 per 1M output tokens. GPT-6 Luna (gpt-6-luna), $0.10 and $0.50. Checked 16 October 2026.',
    'Short chat and Long document: Jegham et al., "How Hungry is AI?", 2025, the short and long prompt settings.',
    'Idle: 4.5 W.',
    'a world average of 458 g CO₂e per kWh in 2025.',
    'the US household average was 18.19¢ per kWh, January to July 2026.',
  ]) assert.ok(text.includes(line), line);
});
