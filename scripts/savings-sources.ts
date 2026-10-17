// The Sources list on /savings/, rendered at build time as the `savings-sources` partial. The words are the copy's
// (docs/copy/2026-10-16-savings-copy.md, Sources), written as HTML; every link comes from the source of a figure in
// src/savings-data.ts, so the page and the calculator cite the same URLs.
import { FIGURES, PRESETS, type Figure } from '../src/savings-data.ts';

/** One line of the list: its HTML (copy text, already escaped) and the figure whose source it links, if any. */
export interface SourceEntry { html: string; cites?: Figure }
export interface SourceGroup { heading: string; entries: SourceEntry[] }

const CO2E = '<abbr title="Carbon dioxide equivalent">CO₂e</abbr>';

export const SOURCE_GROUPS: readonly SourceGroup[] = [
  {
    heading: 'Cloud price',
    entries: [{
      html: 'OpenAI, API pricing, Standard tier, short context, not cached: GPT-6 Sol (<code>gpt-6.1-sol</code>), $2.00 per 1M input tokens and $10.00 per 1M output tokens. GPT-6 Luna (<code>gpt-6-luna</code>), $0.10 and $0.50. Checked 16 October 2026.',
      cites: FIGURES.cloudPriceInput,
    }],
  },
  {
    heading: 'Message sizes',
    entries: [
      {
        html: 'Short chat and Long document: Jegham et al., "How Hungry is AI?", 2025, the short and long prompt settings.',
        cites: PRESETS.short.inputTokens,
      },
      {
        html: 'Typical: tokens read come from the same paper\'s medium setting. Tokens written come from Epoch AI, "How much energy does ChatGPT use?", 2025.',
        cites: PRESETS.typical.outputTokens,
      },
    ],
  },
  {
    heading: 'Cloud energy',
    entries: [
      {
        html: 'Epoch AI, "How much energy does ChatGPT use?", 2025: about 0.3 Wh for a 500-token reply, and about 2.4 Wh with 10,000 tokens read, data-centre overhead included. The figure per token read comes from the difference between the two.',
        cites: FIGURES.cloudWhPerOutputToken,
      },
      {
        html: 'For comparison: Google\'s measurement of Gemini, 2025: 0.24 Wh for the median Gemini Apps text prompt.',
        cites: FIGURES.geminiWhPerPrompt,
      },
    ],
  },
  {
    heading: 'Mac power and speed',
    entries: [
      {
        html: 'Writing: Jeff Geerling, Mac mini M4 AI benchmarks, 2024. A 13B model of similar size drew about 30 W at the wall and wrote 13.6 to 14.8 tokens a second, from which we estimate 15 tokens a second for Gemma 4 12B. Idle: 4.5 W.',
        cites: FIGURES.macWattsWriting,
      },
      // Unlinked, as the copy says: the spike's host list doesn't cover the llama.cpp discussion.
      { html: 'Reading: our estimate. Community llama.cpp results on an M4 show 221 tokens a second for a 7B model. Scaled to 12B, that is about 130. We put the draw at 35 W, between the writing draw and Apple\'s maximum.' },
      { html: 'Apple, Mac mini power consumption: 4 W idle, 65 W maximum.', cites: FIGURES.macMaxWatts },
    ],
  },
  {
    heading: 'Grid carbon',
    entries: [{
      html: `Ember, Global Electricity Review 2026: a world average of 458 g ${CO2E} per kWh in 2025.`,
      cites: FIGURES.gridGramsCo2ePerKwh,
    }],
  },
  {
    heading: 'Electricity price',
    entries: [{
      html: 'US Energy Information Administration, Electric Power Monthly, Table 5.3: the US household average was 18.19¢ per kWh, January to July 2026.',
      cites: FIGURES.electricityUsdPerKwh,
    }],
  },
];

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** A figure's source as a full https URL (the module stores it without the scheme; see `Figure.source`). */
export const sourceUrl = (f: Figure): string => `https://${f.source}`;

/** The `<h3>` groups and lists that go under the page's Sources heading. */
export function renderSources(groups: readonly SourceGroup[] = SOURCE_GROUPS): string {
  return groups.map((g) => {
    const items = g.entries.map((e) => {
      if (!e.cites) return `      <li>${e.html}</li>`;
      const url = escapeAttr(sourceUrl(e.cites));
      return `      <li>${e.html} <span aria-hidden="true">→</span> <a href="${url}">${url}</a></li>`;
    });
    return `    <h3>${g.heading}</h3>\n    <ul class="sv-src">\n${items.join('\n')}\n    </ul>`;
  }).join('\n');
}
