/**
 * Every figure the savings calculator uses, as recommended in `docs/calculator-sources.md`
 * (spike commit 7d1c146). If a figure changes there, change it here and in the copy file too.
 * Pages were accessed on 2026-10-16. `asOf` is the date the source gives, or that access date
 * where the source is undated.
 */

export interface Figure {
  value: number;
  unit: string;
  label: string;
  /**
   * The source's https URL without its `https://`. This file ships as page JS, and the site check
   * (`js-network`) allows no URL strings in JS. The page links each source in its HTML; the build can
   * render that list from these entries by adding the scheme back, so the two can't drift.
   */
  source: string;
  publisher: string;
  asOf: string;
  /** How the figure was derived or estimated, where it isn't read straight off the source. */
  note?: string;
}

const OPENAI_PRICING = 'developers.openai.com/api/docs/pricing';
const EPOCH = 'epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use';
const JEGHAM = 'arxiv.org/abs/2505.09598';
const GEERLING = 'github.com/geerlingguy/ai-benchmarks/issues/2';
const LLAMA_CPP = 'github.com/ggml-org/llama.cpp/discussions/4167';
const APPLE_POWER = 'support.apple.com/en-us/103253';

export const FIGURES = {
  cloudPriceInput: {
    value: 2.0, unit: 'USD per 1M tokens', label: 'GPT-6 Sol API price, input tokens',
    source: OPENAI_PRICING, publisher: 'OpenAI', asOf: '2026-10-16',
    note: 'Standard tier, short context, not batch, not cached. Page undated; accessed 2026-10-16.',
  },
  cloudPriceOutput: {
    value: 10.0, unit: 'USD per 1M tokens', label: 'GPT-6 Sol API price, output tokens',
    source: OPENAI_PRICING, publisher: 'OpenAI', asOf: '2026-10-16',
    note: 'Standard tier, short context, not batch, not cached. Page undated; accessed 2026-10-16.',
  },
  smallCloudPriceInput: {
    value: 0.1, unit: 'USD per 1M tokens', label: 'GPT-6 Luna API price, input tokens',
    source: OPENAI_PRICING, publisher: 'OpenAI', asOf: '2026-10-16',
    note: 'Like-for-like comparison only. Page undated; accessed 2026-10-16.',
  },
  smallCloudPriceOutput: {
    value: 0.5, unit: 'USD per 1M tokens', label: 'GPT-6 Luna API price, output tokens',
    source: OPENAI_PRICING, publisher: 'OpenAI', asOf: '2026-10-16',
    note: 'Like-for-like comparison only. Page undated; accessed 2026-10-16.',
  },
  cloudWhPerInputToken: {
    value: 0.0002, unit: 'Wh/token', label: 'Cloud energy per input token, data-centre overhead included',
    source: EPOCH, publisher: 'Epoch AI', asOf: '2025-02-07',
    note: '(2.4 Wh at 10k input − 0.3 Wh) ÷ 10,000 = 0.00021, rounded as in the sources doc.',
  },
  cloudWhPerOutputToken: {
    value: 0.0006, unit: 'Wh/token', label: 'Cloud energy per output token, data-centre overhead included',
    source: EPOCH, publisher: 'Epoch AI', asOf: '2025-02-07',
    note: '0.3 Wh ÷ 500 output tokens, GPT-4o.',
  },
  macWattsWriting: {
    value: 30, unit: 'W (wall)', label: 'Mac mini M4 16 GB power while generating',
    source: GEERLING, publisher: 'Jeff Geerling', asOf: '2024-11-20',
    note: 'Proxy: a 13B 4-bit model peaked at 29.8 W on the same Mac.',
  },
  macTokensPerSecondWriting: {
    value: 15, unit: 'tokens/s', label: 'Gemma 4 12B 4-bit MLX generation speed on a Mac mini M4',
    source: GEERLING, publisher: 'Jeff Geerling', asOf: '2024-11-20',
    note: 'Proxy: a 13B Q4 model wrote 13.6–14.75 tok/s on the same Mac.',
  },
  macWattsReading: {
    value: 35, unit: 'W (wall)', label: 'Mac mini M4 16 GB power while reading the prompt',
    source: APPLE_POWER, publisher: 'Sovernity estimate', asOf: '2026-10-16',
    note: 'Our estimate; no direct measurement exists. The source backs only the 65 W maximum it sits below; it is above the 30 W writing draw.',
  },
  macTokensPerSecondReading: {
    value: 130, unit: 'tokens/s', label: 'Gemma 4 12B 4-bit prompt reading speed on a Mac mini M4',
    source: LLAMA_CPP, publisher: 'ggml-org community', asOf: '2026-10-16',
    note: 'Proxy: 221 tok/s for a 7B Q4 model on an M4, × 7/12.',
  },
  macWhPerInputToken: {
    value: 0.000075, unit: 'Wh/token', label: 'Mac energy per input token',
    source: LLAMA_CPP, publisher: 'Sovernity estimate', asOf: '2026-10-16',
    note: 'Derived: 35 W ÷ 130 tok/s = 0.27 J, rounded as in the sources doc.',
  },
  macWhPerOutputToken: {
    value: 0.00056, unit: 'Wh/token', label: 'Mac energy per output token',
    source: GEERLING, publisher: 'Sovernity estimate', asOf: '2026-10-16',
    note: 'Derived: 30 W ÷ 15 tok/s = 2.0 J, rounded as in the sources doc. Both inputs are proxies from Geerling\'s measurements.',
  },
  macIdleWatts: {
    value: 4, unit: 'W', label: 'Mac mini M4 idle power',
    source: APPLE_POWER, publisher: 'Apple', asOf: '2026-09-21',
    note: 'Geerling measured 4.5 W. Not used in the calculation, which counts all of the Mac\'s draw.',
  },
  macMaxWatts: {
    value: 65, unit: 'W', label: 'Mac mini M4 16 GB maximum power',
    source: APPLE_POWER, publisher: 'Apple', asOf: '2026-09-21',
  },
  geminiWhPerPrompt: {
    value: 0.24, unit: 'Wh/prompt', label: 'Median Gemini Apps text prompt energy, data-centre overhead included',
    source: 'arxiv.org/abs/2508.15734', publisher: 'Google', asOf: '2025-08-21',
    note: 'For comparison only, on the Sources list. Not used in the calculation.',
  },
  gridGramsCo2ePerKwh: {
    value: 458, unit: 'gCO2e/kWh', label: 'World average grid carbon intensity, lifecycle, 2025',
    source: 'ember-energy.org/latest-insights/global-electricity-review-2026/electricity-demand-and-supply-trends/',
    publisher: 'Ember', asOf: '2026-04-21',
    note: 'Location-based, used for both sides.',
  },
  electricityUsdPerKwh: {
    value: 0.18, unit: 'USD/kWh', label: 'US household electricity price',
    source: 'www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3',
    publisher: 'US EIA', asOf: '2026-09-24',
    note: '18.19¢/kWh average for Jan–Jul 2026.',
  },
} as const satisfies Record<string, Figure>;

export interface Preset {
  label: string;
  inputTokens: Figure;
  outputTokens: Figure;
}

export const PRESETS = {
  short: {
    label: 'Short chat',
    inputTokens: {
      value: 100, unit: 'tokens', label: 'Short chat, tokens read',
      source: JEGHAM, publisher: 'Jegham et al.', asOf: '2025-11-24', note: 'The paper\'s "short" setting.',
    },
    outputTokens: {
      value: 300, unit: 'tokens', label: 'Short chat, tokens written',
      source: JEGHAM, publisher: 'Jegham et al.', asOf: '2025-11-24', note: 'The paper\'s "short" setting.',
    },
  },
  typical: {
    label: 'Typical',
    inputTokens: {
      value: 1000, unit: 'tokens', label: 'Typical, tokens read',
      source: JEGHAM, publisher: 'Jegham et al.', asOf: '2025-11-24', note: 'The paper\'s "medium" setting.',
    },
    outputTokens: {
      value: 500, unit: 'tokens', label: 'Typical, tokens written',
      source: EPOCH, publisher: 'Epoch AI', asOf: '2025-02-07',
    },
  },
  long: {
    label: 'Long document',
    inputTokens: {
      value: 10000, unit: 'tokens', label: 'Long document, tokens read',
      source: JEGHAM, publisher: 'Jegham et al.', asOf: '2025-11-24', note: 'The paper\'s "long" setting.',
    },
    outputTokens: {
      value: 1500, unit: 'tokens', label: 'Long document, tokens written',
      source: JEGHAM, publisher: 'Jegham et al.', asOf: '2025-11-24', note: 'The paper\'s "long" setting.',
    },
  },
} as const satisfies Record<string, Preset>;
