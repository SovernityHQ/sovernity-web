# Calculator figures: sources for founder approval

Spike for the cloud-vs-Mac message calculator. Every figure the calculator needs, with value, unit, source, publisher, as-of date and why it was chosen. No code changes. All pages were accessed on **2026-10-16** unless noted.

**Status: draft, waiting for founder approval.** Decisions needed are listed at the end.

## Read this first: what the figures say

Using the recommended values below, a message on a Mac mini M4 costs about **100× less** than the same message at the cloud reference model's API price. It uses **roughly the same energy and carbon**: 10–45% less depending on the preset, which is inside the error bars. Copy built on these figures can say "costs a fraction of a cent" and "no data centre". It should **not** say "uses far less energy" or "much greener". Details are in [Worked check](#worked-check-the-recommended-figures-together).

---

## 1. Cloud reference model

**Proposed: OpenAI GPT-6 Sol.** API id `gpt-6.1-sol`, the Sol row in OpenAI's Standard table; the page's embedded price data also lists `gpt-6-sol` at the same price.

| Figure | Value | Unit | Source | Publisher | As of |
|---|---|---|---|---|---|
| Input price | **2.00** | USD per 1M tokens (= $0.000002/token) | https://developers.openai.com/api/docs/pricing | OpenAI | Page undated; accessed 2026-10-16 |
| Output price | **10.00** | USD per 1M tokens (= $0.00001/token) | same | OpenAI | same |

Prices are Standard tier, short context (≤272K tokens), not batch, not cached. I checked them in the raw page HTML myself: `gpt-6.1-sol $2.00 … $10.00`. OpenAI's pricing page blocks automated fetches, so a person should open it once before launch.

**Why GPT-6 Sol**

- **ChatGPT is still the chatbot most people use.** Similarweb web traffic gives ChatGPT about 53% in May 2026, Gemini about 27% and Claude about 9% (https://aisearch.similarweb.com/blog/gen-ai-stats/, Similarweb, 2026-07-29). OpenAI reported 800M weekly users in Oct 2025 (https://techcrunch.com/2025/10/06/sam-altman-says-chatgpt-has-hit-800m-weekly-active-users).
- **GPT-6 Sol is ChatGPT's default for paid users** from about 2026-10-07 (help.openai.com/en/articles/20001354, seen in search snippets only because the page returns 403). Free and Go users get GPT-5.6 Luna.
- **Its price is the market's mid-tier price.** Claude Sonnet 5 and 5.5 are also $2/$10 (https://platform.claude.com/docs/en/about-claude/pricing, Anthropic; the planned rise to $3/$15 was cancelled). Gemini 3.1 Pro Preview is $2/$12 at ≤200K tokens (https://ai.google.dev/gemini-api/docs/pricing, Google, "Last updated 2026-10-16 UTC"). The result barely changes whichever of the three we pick.
- **Rejected:** `gpt-5.6-sol` ($4/$20), because it is on promotional pricing "at least through November 21, 2026" with no stated end price. `chat-latest` ($5/$30), because the page doesn't say which model it points to.

**Caveat: a fairer like-for-like.** Gemma 4 12B is closer in capability to the small tier: `gpt-6-luna` and Claude Haiku 5.5 at $0.10/$0.50, GPT-5.6 Luna at $0.20/$1.20. At those prices the cloud cost per message is 20× lower. Option: a "compare with a small cloud model" toggle priced at `gpt-6-luna` $0.10/$0.50 (OpenAI, same page). **Founder decision.**

**Caveat: API price vs what people actually pay.** Most people pay a flat ChatGPT subscription, not per token. The API price stands in for "what this message costs to serve". The page should say that.

## 2. Tokens per message, by preset

| Preset | Input tokens | Output tokens | Main source | Why |
|---|---|---|---|---|
| **Short chat** | **100** | **300** | Jegham et al., "How Hungry is AI?", §4.2 "short" config: https://arxiv.org/abs/2505.09598 (arXiv, v6 2025-11-24) | A published benchmark setting, and within the measured chat averages below (prompts 70–296, replies 215–441) |
| **Typical** | **1,000** | **500** | Input: Jegham "medium" (1k). Output: Epoch AI, "How much energy does ChatGPT use?": https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use (Epoch AI, 2025-02-07), which assumes 500 output tokens | Input of 1k reflects re-sent conversation history: WildChat averages 296 tokens in, 441 out, over 2.54 turns, so turn 2 already sends ~1,030 tokens. Output of 500 matches the cluster of usage sources: WildChat 441, OpenRouter ~400, Mistral 400, Epoch 500 |
| **Long document** | **10,000** | **1,500** | Jegham "long" (10k in / 1.5k out); Epoch's 10k-token case ("a short paper or long magazine article") | Label it **"a long document, ~15 pages"**: 10k tokens ≈ 7,500 words at OpenAI's ¾ word per token. Don't call it a 10-page document |

**Supporting usage data** (measured averages, all counted with the Llama-2 tokenizer)

| Dataset | Avg prompt tokens | Avg response tokens | Avg turns | Source |
|---|---|---|---|---|
| LMSYS-Chat-1M | 69.5 | 214.5 | 2.0 | Zheng et al., https://arxiv.org/abs/2309.11998, Table 1 (v4, 2024-03-10) |
| WildChat | 295.58 | 441.34 | 2.54 | Zhao et al., https://arxiv.org/abs/2405.01470, Table 1 (2024-05-02) |
| ShareGPT | 94.46 | 348.45 | 3.51 | same WildChat Table 1 |
| OpenRouter API traffic, late 2025 | >6,000 | ~400 | — | OpenRouter + a16z, "State of AI", https://openrouter.ai/state-of-ai (Dec 2025). Mostly coding and agent traffic, not consumer chat |

**Contested: tokens per message.**
- Input ranges from **~20 to >6,000** tokens per request (Alpaca 19.7 up to OpenRouter's 6K+). Within real chat logs alone it spans **70–296**.
- Output ranges from **~65 to 1,500** (measured chat 215–441; assumed values 300–1,500).
- Presets avoid having to pick one average, and each preset cites a published setting. Tokenizers also differ (Claude 4.7+ produces ~30% more tokens for the same text), so token counts are an approximation across vendors.

## 3. Cloud inference energy per token

| Figure | Value | Unit | Source | Publisher | As of |
|---|---|---|---|---|---|
| Cloud energy per **output** token | **0.0006** | Wh/token, data-centre overhead included | Epoch AI, "How much energy does ChatGPT use?" https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use | Epoch AI (Josh You) | 2025-02-07 |
| Cloud energy per **input** token | **0.0002** | Wh/token | same: (2.4 Wh at 10k input − 0.3 Wh) ÷ 10,000 | Epoch AI | 2025-02-07 |

**Why Epoch's figure:** Epoch is the only source that states its token count (0.3 Wh ÷ 500 output tokens, overhead included at 10–20% above server power). Its per-query result also sits between the two first-party disclosures: Google's measured 0.24 Wh and OpenAI's 0.34 Wh.

**All sources**

| Source | Per message | Tokens | Overhead (PUE) | ≈ Wh per output token |
|---|---|---|---|---|
| Google, Elsworth et al., https://arxiv.org/abs/2508.15734 (2025-08-21) | 0.24 Wh median Gemini Apps text prompt (May 2025); 0.10 Wh counting active accelerators only | **Not disclosed** | Included, PUE 1.09 | 0.0005 if 500 tokens (assumed) |
| Epoch AI (2025-02-07) | ~0.3 Wh, GPT-4o | 500 out | Included | **0.0006** |
| Sam Altman, "The Gentle Singularity", https://blog.samaltman.com/the-gentle-singularity (2025-06-10) | 0.34 Wh "average query" | Not stated | Not stated | 0.0007 if 500 tokens (assumed) |
| Jegham et al., https://arxiv.org/abs/2505.09598 (v6 2025-11-24) | GPT-4o 0.42 Wh short / 1.22 Wh medium; Claude 3.7 Sonnet 0.95 Wh short; o3 1.18 Wh short | 100/300, 1k/1k | Included (Azure 1.12, AWS 1.14) | 0.0012–0.0014 (GPT-4o); 0.0032 (Claude 3.7). Estimated from API latency, not measured |
| ML.ENERGY leaderboard and blog, https://ml.energy (Dec 2025–Feb 2026) | Qwen3-32B on B200: 0.15–0.21 J/token | per token | **GPU only** | 0.00004–0.00006 GPU only; ~0.0001 with host and overhead |
| Mistral Large 2 lifecycle analysis, https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai (2025-07-22) | 1.14 gCO2e per 400-token reply | 400 out | n/a | No energy figure; carbon includes training, so it can't be converted |

**Contested: cloud Wh/token.** The range is **0.0001 to 0.0014 Wh per output token**: open models at high batch at the low end, Jegham's GPT-4o at the high end. Reasoning modes run 2–8× higher still. Chosen value: **0.0006**. Nobody has published energy for GPT-6 Sol. The figure describes a 2025 GPT-4o-class chatbot reply, and the page should say so. PUE figures: Google 1.09 (https://datacenters.google/efficiency, to Q2 2026); AWS 1.15 (2024); industry average >1.5 (Uptime Institute 2025 survey).

## 4. Local Mac: power and throughput

**Named configuration: Mac mini M4 (10-core CPU, 10-core GPU), 16 GB, running Ursa's Gemma 4 12B instruction-tuned model, MLX 4-bit** (`SovernityHQ/gemma-4-12b-it-mlx-4bit`, ~6.74 GB). This is the cheapest Mac that meets Ursa's stated minimum ("Apple silicon and 16 GB of memory", `site/ursa/index.html`). It has a fan, so it sustains load, unlike the passively cooled MacBook Air, which throttles to ~8 W. Power is **wall power**: the whole computer, as Apple measures it.

| Figure | Value | Unit | Basis | Source | Publisher | As of |
|---|---|---|---|---|---|---|
| Power while generating | **30** | W (wall) | Measured peaks for a 13B 4-bit model on a Mac mini M4: 29.8 W (HDMI only) and 35.8 W (with 10 GbE); 8B model 29.4–30.1 W | https://github.com/geerlingguy/ai-benchmarks/issues/2 (checked myself) | Jeff Geerling | 2024-11-20 |
| Idle power | 4.5 (Geerling) / 4 (Apple) | W | For a "marginal" variant that subtracts idle | Geerling (above); https://support.apple.com/en-us/103253 | Jeff Geerling; Apple | 2024-11-20; page published 2026-09-21 |
| Ceiling | 65 | W max | Apple's maximum for the M4 16 GB / 256 GB; confirms 30–35 W is plausible | https://support.apple.com/en-us/103253 | Apple | 2026-09-21 |
| Generation speed | **15** | tokens/s | Proxy: 13B Q4 on the same Mac gives 13.6–14.75 tok/s (Geerling). Gemma 4 12B 4-bit MLX on an M4 Pro gives 33.5 tok/s; × (120 ÷ 273 GB/s memory bandwidth) ≈ 14.7 | Geerling (above); https://rapidmlx.com/models/gemma-4-12b-4bit (Rapid-MLX, a vendor, 2026-10-03); llama.cpp Apple-silicon results https://github.com/ggml-org/llama.cpp/discussions/4167 | various | 2024-11 to 2026-10 |
| Prompt reading speed | **130** | tokens/s | Proxy: M4 reads 221 tok/s on a 7B Q4 model (llama.cpp #4167); × 7/12 ≈ 130. Rapid-MLX on an M4 Pro (~235 tok/s), scaled by GPU cores, gives ≈ 120–145 | llama.cpp #4167; Rapid-MLX | ggml-org community; Rapid-MLX | 2024–2026 |
| Power while reading the prompt | **35** | W (wall) | Estimate (compute-bound, so above generation and below the 65 W max). No direct measurement exists | — | — | — |
| **Derived:** energy per output token | **0.00056** | Wh/token | 30 W ÷ 15 tok/s = 2.0 J | derived | — | — |
| **Derived:** energy per input token | **0.000075** | Wh/token | 35 W ÷ 130 tok/s = 0.27 J | derived | — | — |

**Contested: local figures.** Generation speed ranges **13.5–17 tok/s** (MLX usually runs 10–20% faster than llama.cpp/Ollama). Power while generating ranges **29.4–35.8 W** peak. **Every figure here is a proxy**: no one has published wall-power or speed measurements of Gemma 4 12B on MLX on a base M4. Recommended before launch: a one-hour run of Ursa on a Mac mini M4 16 GB with a wall power meter. That would make the local side first-party. Excluded as unreliable: GreenBench (arXiv 2608.28667), because it assumes system power rather than measuring it; the Contra Collective blog, because its numbers are inconsistent; llmcheck.net, because its speeds are estimates.

## 5. Grid carbon intensity (used for both sides)

| Figure | Value | Unit | Source | Publisher | As of |
|---|---|---|---|---|---|
| Grid carbon intensity | **458** | gCO2e/kWh (world average, lifecycle) | Ember, Global Electricity Review 2026: https://ember-energy.org/latest-insights/global-electricity-review-2026/electricity-demand-and-supply-trends/ ("…458 gCO2e/kWh in 2025") | Ember | Data for 2025; published 2026-04-21 |

**Why this figure:** it is the newest primary source, and Our World in Data reproduces it (458.29; https://ourworldindata.org/grapher/carbon-intensity-electricity, updated 2026-06-30). The world average suits a global audience. Using the **same location-based figure for both sides** is the physical, like-for-like comparison: the GHG Protocol requires location-based reporting, and a home user can't claim a data centre's renewable-energy certificates. With one shared figure, the result depends only on energy per message.

**Contested: grid intensity.**

| Basis | Range found | Sources |
|---|---|---|
| World | 435–471 g/kWh | IEA Electricity 2026: ~435, direct CO2 only, not fetched (403). Ember/OWID: 458 (2025) and 471 (2024), lifecycle |
| US | 348–384 g/kWh | EPA eGRID2023: 349.7 CO2e (https://www.epa.gov/egrid/summary-data, rev2 2025-06-12). EIA FAQ: 367 (https://www.eia.gov/tools/faqs/faq.php?id=74&t=11, 2023 data). Ember/OWID US: 384 (2025) |
| Google, market-based | 94 g/kWh | arXiv 2508.15734 |

Using Google's market-based 94 g/kWh for the cloud side only would cut cloud carbon about 5×. The page should name that choice in one line.

## 6. Electricity price (local side)

| Figure | Value | Unit | Source | Publisher | As of |
|---|---|---|---|---|---|
| Electricity price | **0.18** | USD/kWh (household) | US EIA Electric Power Monthly, Table 5.3: https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3. US residential average 18.19 ¢/kWh for Jan–Jul 2026; 17.30 ¢ for 2025 | US EIA | Released 2026-09-24 |

**Why this figure:** 18¢ matches both the US average and GlobalPetrolPrices' world household average of $0.179/kWh (https://www.globalpetrolprices.com/electricity_prices/, Q3 2026). It is honest for US and global readers alike.

**Contested: electricity price.** The range is **$0.08/kWh** (China, India) to **$0.41/kWh** (Germany 0.409, UK 0.405). The EU average is €0.2896/kWh, about $0.33 (Eurostat, H2 2025, https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics). It barely matters: at any price in that range, a local message costs well under a hundredth of a cent.

## Worked check: the recommended figures together

| Preset | Cloud energy (Wh) | Mac energy (Wh) | Cloud price | Mac electricity | Cloud CO2e (g) | Mac CO2e (g) |
|---|---|---|---|---|---|---|
| Short chat (100 / 300) | 0.20 | 0.17 | $0.0032 | $0.00003 | 0.092 | 0.080 |
| Typical (1,000 / 500) | 0.50 | 0.36 | $0.0070 | $0.00006 | 0.23 | 0.16 |
| Long document (10,000 / 1,500) | 2.9 | 1.6 | $0.035 | $0.00029 | 1.33 | 0.73 |

- Cloud energy = in × 0.0002 + out × 0.0006 Wh.
- Mac energy = in × 0.000075 + out × 0.00056 Wh.
- Price = in × $2/1M + out × $10/1M. Mac electricity = Wh × $0.18/kWh.
- Carbon = Wh × 458 g/kWh.
- The cloud long-document energy matches Epoch's own ~2.5 Wh at 10k input plus a 500-token reply.

**What the calculator can't count, and the page should say:**
- the Mac's purchase price and the energy used to make it;
- AI model training, on both sides;
- the network;
- the fact that the Mac is often switched on anyway (the "marginal" variant subtracts its 4.5 W idle);
- the fact that most people pay for ChatGPT by subscription, not per token.

## 7. Outbound allowlist hostnames

**No runtime requests are needed.** The calculator should ship its figures inside the page, matching the site's "no third-party requests" rule in README.md. Nothing is fetched live, so prices and figures change only when we republish.

The allowlist that matters is `OUTBOUND_HOSTS` in `scripts/check-rules.ts`, which checks the source links on the page.

**Hosts to add for the recommended figures** (exact hostnames):

| Hostname | Cites |
|---|---|
| `developers.openai.com` | Reference-model prices |
| `epoch.ai` | Cloud energy per token; Typical output tokens |
| `arxiv.org` | Jegham et al. (presets); Google's Gemini energy paper |
| `ember-energy.org` | Grid carbon intensity |
| `www.eia.gov` | Electricity price |

**Already on the allowlist:** `support.apple.com` (Mac mini power page).

**Needs a rule change, not just a host:** `github.com` is allowed only under `/SovernityHQ/sovernity-web`. Citing Jeff Geerling's measurements needs `github.com/geerlingguy/ai-benchmarks` added as a second allowed path. Alternative: cite our own wall-meter run once it exists, and drop Geerling.

**Optional**, only if the page also shows ranges or secondary sources:

| Hostname | Cites |
|---|---|
| `www.globalpetrolprices.com` | World electricity price |
| `ourworldindata.org` | Carbon intensity mirror |
| `www.epa.gov` | US carbon figure |
| `platform.claude.com` | Comparison price |
| `datacenters.google` | Google PUE |
| `rapidmlx.com` | Vendor speed benchmark |

## Decisions for the founder

1. **Reference model.** Approve GPT-6 Sol at $2/$10 per 1M tokens. Decide whether to add a small-model toggle (gpt-6-luna, $0.10/$0.50).
2. **Presets.** Approve 100/300, 1,000/500 and 10,000/1,500 tokens, with the long preset labelled "~15 pages".
3. **Framing.** Accept that energy and carbon come out roughly equal, and cost about 100× lower, and write copy to match.
4. **Carbon and price.** Approve 458 gCO2e/kWh (world, location-based, same for both sides) and $0.18/kWh.
5. **Local measurement.** Approve the proxy figures (Mac mini M4 16 GB: 30 W, 15 tok/s; 35 W, 130 tok/s prompt), or ask for a first-party wall-meter run of Ursa before launch. That run is recommended.
6. **Allowlist.** Approve the five hosts above plus the extra GitHub path, or the alternative of our own measurement.
