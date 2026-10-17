---
type: design
status: proposed
date: 2026-10-16
---
# Savings page copy, draft 2 (2026-10-16)

Source copy for the cloud-vs-Mac calculator page. Every visible string on the page and in its head is here: title, meta and Open Graph text, alt text, labels, messages and the no-JavaScript note. The build copies these strings exactly as written. The figures come from the calculator sources doc, `docs/calculator-sources.md`, which is carried in this same PR and copied unchanged from spike commit 7d1c146. It also needs founder approval. If a figure changes there, change it here too.

**Filing:** this draft was written in sovernity-web so the PR can carry it. Once the founder approves it, file it in SovernityHQ/SovernityUrsa-HQ as `knowledge/design/2026-10-06-ursa-website/2026-10-16-savings-copy.md`. The HQ file then becomes the master copy.

Conventions (as in HQ `knowledge/design/2026-10-06-ursa-website/2026-10-06-website-copy.md`):
- `[[X: …]]` marks an open decision. Each one is listed under Decisions at the end. None may reach the built page: the strict `npm run check` fails on them, and `--draft` only warns.
- `{name}` marks a value the calculator fills in, listed under Values below. `npm run check` doesn't catch a leftover `{…}`. So the built HTML ships with the default result already filled in (20 messages, every day, Typical), and the script only replaces it.
- *Note:* marks a line for the page builder. Notes aren't shown on the page. Everything else is shown.
- **Fixed** marks a line that must appear exactly as written.
- Where alternatives are offered, the default comes first.
- Spelling is British, as on the rest of the site (centre, quantised).
- One name for each side: "Cloud AI" as the column heading, "in the cloud" in running text, and "your Mac". Tokens are "read" (input) and "written" (output). The words input and output appear only in the Sources lines, where they quote OpenAI.

The header, Ursa sub-nav and Ursa footer are the shared ones in the HQ website copy. So the footer carries the **Fixed** line "For adults 18+. May not be suitable for some minors."

---

## Page head
- Path: [[D1: `/ursa/savings/`]]
- `<title>` and og:title (must be identical): **Cloud or Mac: what a message costs · Sovernity Ursa**
- Meta description and og:description (must be identical): Estimate what your AI messages cost in the cloud and on your own Mac, the energy each uses and the carbon it emits.
- og:type: website. og:site_name: Sovernity Ursa. og:url and canonical: `https://sovernity.com` plus the D1 path. These and og:image are absolute `https://sovernity.com/…` URLs, as the checker requires.
- og:image: the shared Ursa card (`/assets/img/og-ursa.png`, image/png, 1200 × 630). og:image:alt: The Sovernity Ursa app icon and the Big Dipper.
- twitter:card: summary_large_image.

## Hero
- Product tag: **Sovernity Ursa**
- **Headline** (the page's one h1; default): What does a message cost?
  - Alternative: Cloud or Mac: what a message costs
- **Lede:** Every message to a cloud AI runs on a server in a data centre. With Ursa, a message like it runs on your Mac. Choose how many messages you send and how long they are, and see what each costs in money, energy and carbon.

## Calculator inputs
- Section heading (visually hidden, for screen readers): Your messages
- **Count.** Visible `<label>`: Messages. A number field, default `20`, whole numbers from 1 to 100,000.
  - Error, shown under the field when the entry is empty, not a whole number, or outside that range: Enter a whole number from 1 to 100,000.
- **Period.** Visible `<label>`: every. Choices: day (default) · week · month · year.
  - The two inputs read as one line: "20 messages every day". With a count of 1: "1 message every day".
  - *Note:* no aria-label on either input. The visible label is the accessible name.
- **Size.** Group label: Message size. Three choices, each shown with a one-line hint:
  - **Short chat:** A quick question and answer: about 75 words read, 225 written.
  - **Typical** (default): A message in an ongoing conversation, with the earlier messages sent along: about 750 words read, 375 written.
  - **Long document:** A question about a long document of about 15 pages: 7,500 words read, 1,100 written.
  - Hint under the choices: A token is a piece of a word. In English, one token is about three quarters of a word.
  - *Note:* the tokens behind each preset, read / written: Short chat 100 / 300, Typical 1,000 / 500, Long document 10,000 / 1,500. Word counts are tokens × ¾, rounded to two significant figures (1,125 → 1,100).

## Results
- Section heading: **Every {period}**
- Line under the heading: {count} {size_phrase}, in the cloud and on your Mac. Example: "20 typical messages, in the cloud and on your Mac".
- Column headings: **Cloud AI** · **Your Mac**
  - Under "Cloud AI": GPT-6 Sol, at its API price
  - Under "Your Mac": Mac mini M4 running Ursa
- Rows, with their cells:
  - **Cost:** {cloud_cost} · {mac_cost}. Small print under the row: Cloud AI at the API price. Your Mac: electricity only.
  - **Energy:** {cloud_energy} · {mac_energy}
  - **Carbon:** {cloud_carbon} · {mac_carbon}
- Comparison, under the table:
  - **Cost:** On your Mac, about {cost_ratio} times cheaper.
  - **Energy and carbon:** About the same, within the margin of error. These estimates are too rough to say which uses less.
- Line shown unless Period is year: Over a year: {year_cloud_cost} in the cloud, {year_mac_cost} on your Mac.
- Link: How we calculate this, to `#method`. *Note:* if an arrow is added, mark it aria-hidden.

*Note:* the comparison follows the sources doc's framing (its "Read this first"). Cost is about 100 times lower. The Mac uses 12–45% less energy across the three presets, which is inside the error bars, so the page says "about the same" rather than showing a percentage. [[D2: framing. Default: "About the same, within the margin of error" for energy and carbon. Alternative: show "{pct}% less" (the Mac's saving, rounded to the nearest 5%), followed by "within the margin of error for these estimates"]].

### Values
| Value | Form | Example (defaults) |
|---|---|---|
| `{count}` | Whole number with thousands separators | 20; 1,000 |
| `{period}` | day · week · month · year | day |
| `{size_phrase}` | short chats · typical messages · messages about a long document. With a count of 1: short chat · typical message · message about a long document | typical messages |
| `{cloud_cost}`, `{mac_cost}`, `{year_cloud_cost}`, `{year_mac_cost}` | $0.01 and over: dollars to two decimal places, with thousands separators ($0.14, $1,234.50). Under $0.01: cents to two significant figures (0.13¢) | $0.14 · 0.13¢; year $51.10 · $0.47 |
| `{cloud_energy}`, `{mac_energy}` | Under 1,000 Wh: Wh. From 1,000 Wh: kWh. Two significant figures, trailing zeros kept (0.080 Wh) | 10 Wh · 7.1 Wh |
| `{cloud_carbon}`, `{mac_carbon}` | Under 1,000 g: g CO₂e. From 1,000 g: kg CO₂e. Two significant figures, trailing zeros kept | 4.6 g CO₂e · 3.3 g CO₂e |
| `{cost_ratio}` | Cloud cost ÷ Mac cost, from unrounded values, rounded to two significant figures | 110 |

- "CO₂e" is written `<abbr title="Carbon dioxide equivalent">CO₂e</abbr>`. The method note spells it out too, so it doesn't depend on hover.

## No JavaScript
- Shown in `<noscript>` above the pre-filled result: The calculator needs JavaScript. Below is the result for 20 typical messages a day. Every figure it uses is listed under How we calculate this.

## `#method` How we calculate this

Intro: These are estimates. We use the best published figures we could find, and our own estimates where none exist. The sources are listed below.

- **Cloud cost** is what OpenAI charges developers for GPT-6 Sol: $2 per million tokens read and $10 per million written. As of October 2026, it is the model ChatGPT gives paid users by default. Most people pay for ChatGPT by subscription, not per message, so the API price stands in for what a message costs to run.
- **A like-for-like note:** GPT-6 Sol is a more capable class of model than Gemma 4 12B, the model Ursa runs. A small cloud model such as GPT-6 Luna costs $0.10 per million tokens read and $0.50 per million written. Against that, your Mac is about 5 to 6 times cheaper.
- **Cost on your Mac counts electricity only**, at $0.18 per kWh, about the average household price in the US. It doesn't include what you paid for the Mac, or the one-time download of Ursa's AI model.
- **Energy on your Mac is the Mac's own draw at the wall**, for the whole computer: a Mac mini M4 with 16 GB of memory running Gemma 4 12B. We estimate about 30 W while it writes a reply, at about 15 tokens a second, and about 35 W while it reads your message, at about 130 tokens a second. The writing figures are scaled from measurements of a similar model on the same Mac. The reading figures are our own estimate. No one has yet published measurements of Gemma 4 12B on this Mac.
- **Energy in the cloud** is 0.0006 Wh for each token written and 0.0002 Wh for each token read. That includes the data centre's cooling and other overhead. The estimate is for a 2025 chatbot reply from a GPT-4o-class model; no figures have been published for GPT-6 Sol itself.
- **Both sides use the same grid carbon intensity**: 458 g of carbon dioxide equivalent (CO₂e) per kWh, the world average for 2025. Some data centres report lower figures by buying renewable energy certificates. A home can't claim those, so we use the same figure for both sides, and the carbon comparison depends only on the energy each side uses.

### What this doesn't count
- What it took to build your Mac: its price, and the energy used to make it.
- Training the AI models, in the cloud or for Ursa.
- The network between you and the data centre.
- That your Mac may be on anyway. It draws about 4 W when idle, and we count all of its draw, not just the extra.

## `#sources` Sources

Heading: **Sources**. One entry per figure, in this order, each with its source and a link. *Note:* the link hosts are listed under Before the page ships.

### Cloud price
OpenAI, API pricing, Standard tier, short context, not cached: GPT-6 Sol (`gpt-6.1-sol`), $2.00 per 1M input tokens and $10.00 per 1M output tokens. GPT-6 Luna (`gpt-6-luna`), $0.10 and $0.50. Checked 16 October 2026. → https://developers.openai.com/api/docs/pricing

### Message sizes
- Short chat and Long document: Jegham et al., "How Hungry is AI?", 2025, the short and long prompt settings. → https://arxiv.org/abs/2505.09598
- Typical: tokens read come from the same paper's medium setting. Tokens written come from Epoch AI, "How much energy does ChatGPT use?", 2025. → https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use

### Cloud energy
- Epoch AI, "How much energy does ChatGPT use?", 2025: about 0.3 Wh for a 500-token reply, and about 2.4 Wh with 10,000 tokens read, data-centre overhead included. The figure per token read comes from the difference between the two. → https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
- For comparison: Google's measurement of Gemini, 2025: 0.24 Wh for the median Gemini Apps text prompt. → https://arxiv.org/abs/2508.15734

### Mac power and speed
- Writing: Jeff Geerling, Mac mini M4 AI benchmarks, 2024. A 13B model of similar size drew about 30 W at the wall and wrote 13.6 to 14.8 tokens a second, from which we estimate 15 tokens a second for Gemma 4 12B. Idle: 4.5 W. → [[D3: https://github.com/geerlingguy/ai-benchmarks/issues/2, or our own wall-meter measurement]]
- Reading: our estimate. Community llama.cpp results on an M4 show 221 tokens a second for a 7B model. Scaled to 12B, that is about 130. We put the draw at 35 W, between the writing draw and Apple's maximum.
- Apple, Mac mini power consumption: 4 W idle, 65 W maximum. → https://support.apple.com/en-us/103253

### Grid carbon
Ember, Global Electricity Review 2026: a world average of 458 g CO₂e per kWh in 2025. → https://ember-energy.org/latest-insights/global-electricity-review-2026/electricity-demand-and-supply-trends/

### Electricity price
US Energy Information Administration, Electric Power Monthly, Table 5.3: the US household average was 18.19¢ per kWh, January to July 2026. → https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3

## Disclaimer (end of page, above the footer)
These are estimates, not measurements of your own use. Real figures depend on the model, how long your messages are, which Mac you have and where your electricity comes from. Prices and figures were last checked on 16 October 2026, and they change only when we update this page.

---

## Rules this copy is checked against
These rules in sovernity-web's `scripts/check-rules.ts` apply:
- `banned`: the Ursa banned words and phrases.
- The banned-word rule that follows `banned` in `RULES`: one word, in any form, allowed only in the seal.
- `vera`: the VERA-MH score.
- `fixed-lines`.

The shared Ursa footer carries the adult line. The AI line is required only on `/ursa/`. On 2026-10-16 this whole file, notes included, was run through `findBanned(…, 'ursa')` and the patterns of the other two rules, with no hits. Run it again after any edit.

## Before the page ships
- Add the link hosts to `OUTBOUND_HOSTS`: `developers.openai.com`, `epoch.ai`, `arxiv.org`, `ember-energy.org` and `www.eia.gov`. `support.apple.com` is already listed. A Geerling link also needs `/geerlingguy/ai-benchmarks` allowed on `github.com`. The llama.cpp reading-speed line stays unlinked, so it needs no rule.
- A person opens OpenAI's pricing page once to confirm both prices, and OpenAI's help page to confirm that GPT-6 Sol is ChatGPT's default for paid users. The sources doc saw the default only in search snippets. If no one can confirm it, drop the sentence "As of October 2026, it is the model ChatGPT gives paid users by default" from the method note.

## Decisions for the founder
1. **D1, path.** `/ursa/savings/`, an Ursa page with the Ursa skin, sub-nav and footer, or a studio page such as `/savings/`. Also: where is it linked from? The Ursa sub-nav today reads Overview · Privacy · Support.
2. **D2, framing.** For energy and carbon, "About the same" (default), or the percentage with a margin-of-error note. Either way the page doesn't claim the Mac is greener.
3. **D3, Mac power source.** Cite Geerling, which needs the GitHub path rule, or run our own wall-meter measurement of Ursa first and cite that.
4. **Reference model.** The copy names GPT-6 Sol at $2/$10 per 1M tokens, as the sources doc proposes, and mentions GPT-6 Luna only in the like-for-like note. If a small-model toggle is approved instead, the Results section needs a toggle label and the note is dropped.
5. **Trademarks.** The page names OpenAI, ChatGPT, GPT-6 and Gemini, but the shared Ursa footer acknowledges only Apple's trademarks. Add a line on this page: "OpenAI, ChatGPT and GPT are trademarks of OpenAI. Gemini is a trademark of Google LLC." Or leave the footer as it is.
6. **Approve the copy.** Founder sign-off: ____ (date) ____
