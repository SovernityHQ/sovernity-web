---
type: design
status: proposed
date: 2026-10-16
---
# Savings page copy, draft 1 (2026-10-16)

Source copy for the cloud-vs-Mac calculator page. Every visible string on the page and in its head (title, meta and Open Graph text, alt text, ARIA labels, the no-JavaScript note) is here. The build copies these strings exactly as written. The figures come from the calculator sources doc (`docs/calculator-sources.md`, sovernity-web spike commit 7d1c146), which also needs founder approval; if a figure changes there, change it here too.

**Filing:** this draft was written in sovernity-web, so the PR can carry it. Once the founder approves it, file it in SovernityHQ/SovernityUrsa-HQ as `knowledge/design/2026-10-06-ursa-website/2026-10-16-savings-copy.md`. That HQ file is then the master copy.

Conventions (as in `2026-10-06-website-copy.md`):
- `[[X: …]]` marks an open decision. The founder decision it belongs to is listed at the end. None may reach the built page (`npm run check` fails on them).
- `{name}` marks a value the calculator fills in at run time, for example `{cloud_cost}`. The braces aren't shown.
- **Fixed** marks a line that must appear exactly as written.
- Where alternatives are offered, the default comes first.
- British spelling, as on the rest of the site (centre, quantised).

The header, Ursa sub-nav and Ursa footer are the shared ones in `2026-10-06-website-copy.md`, so the footer carries the **Fixed** line "For adults 18+. May not be suitable for some minors."

---

## Page head
- Path: [[D1: `/ursa/savings/`]]
- `<title>` and og:title: **Cloud or Mac: what a message costs · Sovernity Ursa**
- Meta description and og:description (these must be identical): Estimate what your AI messages cost on a cloud model and on your own Mac, and how much energy and carbon each uses.
- og:site_name: Sovernity Ursa
- og:image: the shared Ursa card (`/assets/img/og-ursa.png`). og:image:alt: The Sovernity Ursa app icon and the Big Dipper.

## Hero
- Product tag: **Sovernity Ursa**
- **Headline (default):** What does a message cost?
  - Alternative: Cloud or Mac: what a message costs
- **Lede:** Every message to a cloud AI runs on a server in a data centre. With Ursa, the same message runs on your Mac. Pick how many messages you send and how long they are to see what each costs in money, energy and carbon.

## Calculator inputs
- Section heading (visually hidden, for screen readers): Your messages
- **Count:** label "Messages". Number field, default `20`, whole numbers from 1 to 100,000. ARIA label: Number of messages.
- **Period:** label "Every". Choices: day (default) · week · month · year. ARIA label: How often.
  - Reads as one line: "20 messages every day".
- **Size:** label "Message size". Three choices, each with a one-line hint:
  - **Short chat:** A quick question and answer. About 75 words in, 225 out.
    - Tokens: 100 in, 300 out.
  - **Typical** (default): A message in an ongoing conversation, with the earlier messages sent along. About 750 words in, 375 out.
    - Tokens: 1,000 in, 500 out.
  - **Long document:** Asking about a long document, about 15 pages. About 7,500 words in, 1,100 out.
    - Tokens: 10,000 in, 1,500 out.
  - Hint under the choices: A token is a piece of a word. In English, one token is about three-quarters of a word.

  Word counts use ¾ word per token, rounded (1,500 tokens ≈ 1,125 words, shown as 1,100).

## Results
- Section heading: **Per {period_noun}**. `{period_noun}` is day, week, month or year, from the Period input.
- Under the heading: {count} {size_name} messages, on the cloud and on your Mac. For example: "20 typical messages, on the cloud and on your Mac".
- Column headings: **Cloud AI** · **Your Mac**
  - Under "Cloud AI": GPT-6 Sol, at its API price
  - Under "Your Mac": Mac mini M4 running Ursa
- Row labels:
  - **Cost**. Cloud: the API price. Mac: the electricity.
  - **Energy**
  - **Carbon**
- Units and formats:
  - Cost: `$0.14`, two decimal places. Below $0.01, show "under $0.01".
  - Energy: in Wh up to 1,000 Wh (`7.2 Wh`), then in kWh (`2.6 kWh`). Two significant figures.
  - Carbon: in grams up to 1,000 g (`3.3 g CO₂e`), then in kg (`1.2 kg CO₂e`). Two significant figures.
  - Hover text (title) on "CO₂e": Carbon dioxide equivalent: all greenhouse gases, counted as the CO₂ that would warm the planet as much.
- Comparison line, under the table:
  - **Cost:** Your Mac: about {cost_ratio}× less. Round the ratio to two significant figures, e.g. "about 120× less".
  - **Energy and carbon:** About the same. These estimates have wide margins, so the gap between the two isn't meaningful.
- Per-year line, shown when Period isn't year: Over a year: {year_cloud_cost} on the cloud, {year_mac_cost} on your Mac.
- Link under the results: How we calculate this ↓ (to `#method`)

The comparison line follows the sources doc's recommended framing: cost is about 100× lower; energy and carbon come out roughly equal (10–45% lower on the Mac, inside the error bars). So the page shows "about the same" for energy and carbon, not a percentage. [[D2: framing. Default: "About the same" for energy and carbon. Alternative: show "{pct}% less", followed by "within the margin of error for these estimates"]].
## No JavaScript
- Shown in `<noscript>` in place of the calculator: The calculator needs JavaScript. Every figure it uses is listed under How we calculate this, below.

## `#method` How we calculate this

Intro: These are estimates. Each side uses the best published figures we could find, and the sources are listed below.

- **Cloud cost** is what OpenAI charges developers for GPT-6 Sol, the model ChatGPT gives paid users by default: $2 per million tokens sent in and $10 per million tokens written. Most people pay for ChatGPT by subscription, not per message. The API price stands in for what a message costs to run.
- **Cost on your Mac counts electricity only**, at $0.18 per kWh, about the average household price in the US. It doesn't include what you paid for the Mac, or the one-time download of Ursa's AI model.
- **Energy on your Mac is the Mac's own draw at the wall**, for the whole computer: a Mac mini M4 with 16 GB of memory running Gemma 4 12B, Ursa's model. That is about 30 W while it writes a reply, at about 15 tokens a second, and about 35 W while it reads your message, at about 130 tokens a second.
- **Energy in the cloud** is 0.0006 Wh for each token written and 0.0002 Wh for each token read, including the data centre's cooling and other overhead. This estimate is for a typical chatbot reply in 2025. No one has published figures for GPT-6 Sol itself.
- **Both sides use the same grid carbon intensity**: 458 g CO₂e per kWh, the world average for 2025. Some data centres report lower figures by buying renewable energy certificates. A home can't claim those, so we use the same figure for both sides. That way the carbon comparison depends only on the energy each side uses.

### What this doesn't count
- What it took to build your Mac: its price, and the energy used to make it.
- Training the AI models, in the cloud or for Ursa.
- The network between you and the data centre.
- That your Mac may be on anyway. While it sits idle it draws about 4.5 W, and we count all of its draw, not just the extra.

## `#sources` Sources

Heading: **Sources**. One line per figure, in this order, each with the source name and a link (link hosts are in the sources doc §7).

### Cloud price
OpenAI, API pricing, Standard tier: GPT-6 Sol, $2.00 per 1M input tokens, $10.00 per 1M output tokens. Checked 16 October 2026. → https://developers.openai.com/api/docs/pricing

### Message sizes
- Short chat and Long document: Jegham et al., "How Hungry is AI?" (2025), the short and long prompt settings. → https://arxiv.org/abs/2505.09598
- Typical: input from the same paper's medium setting; output from Epoch AI, "How much energy does ChatGPT use?" (2025). → https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use

### Cloud energy
Epoch AI, "How much energy does ChatGPT use?" (February 2025): about 0.3 Wh for a 500-token reply, with data-centre overhead included. → https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
- For comparison: Google, "Measuring the environmental impact of delivering AI at Google scale" (2025), 0.24 Wh for a median Gemini text prompt. → https://arxiv.org/abs/2508.15734

### Mac power and speed
- Jeff Geerling, Mac mini M4 AI benchmarks (2024): about 30 W at the wall and 13.6–14.8 tokens a second, for a 13B model of similar size, from which we estimate 15 tokens a second for Gemma 4 12B. → [[D3: https://github.com/geerlingguy/ai-benchmarks/issues/2, or our own wall-meter measurement]]
- Apple, Mac mini power consumption: 4 W idle, 65 W maximum. → https://support.apple.com/en-us/103253

### Grid carbon
Ember, Global Electricity Review 2026: world average 458 g CO₂e per kWh in 2025. → https://ember-energy.org/latest-insights/global-electricity-review-2026/electricity-demand-and-supply-trends/

### Electricity price
US Energy Information Administration, Electric Power Monthly, Table 5.3: US household average 18.19 ¢ per kWh, January to July 2026. → https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3

## Disclaimer (end of page, above the footer)
These are estimates, not measurements of your own use. Real figures depend on the model, how long your messages are, which Mac you have and where your electricity comes from. Prices and figures were last checked on 16 October 2026 and change only when we update this page.

---

## Rules this copy is checked against
`scripts/check-rules.ts` in sovernity-web, rules `banned` (the Ursa banned words and phrases), the banned-word rule that follows it in `RULES` (one word, in any form, allowed only in the seal) and `vera` (the VERA-MH score), plus `fixed-lines`. The shared Ursa footer carries the adult line. The AI line is required only on `/ursa/`. On 2026-10-16 this whole file, notes included, was run through `findBanned(…, 'ursa')` and the patterns of those two rules, with no hits. Run it again after any edit.

Before the page ships, add the link hosts to `OUTBOUND_HOSTS`: `developers.openai.com`, `epoch.ai`, `arxiv.org`, `ember-energy.org` and `www.eia.gov`. `support.apple.com` is already listed. A Geerling link also needs `/geerlingguy/ai-benchmarks` allowed on `github.com`.

## Decisions for the founder
1. **D1, path.** `/ursa/savings/` (an Ursa page: Ursa skin, sub-nav and footer), or a studio page such as `/savings/`. Also: where is it linked from? (The Ursa sub-nav today: Overview · Privacy · Support.)
2. **D2, framing.** "About the same" for energy and carbon (default), or show the percentage with a margin-of-error note. Either way the page doesn't claim the Mac is greener.
3. **D3, Mac power source.** Cite Geerling (needs the GitHub path rule), or run our own wall-meter measurement of Ursa first and cite that.
4. **Reference model.** The copy names GPT-6 Sol at $2/$10 per 1M tokens, as the sources doc proposes. If a small-model toggle (gpt-6-luna) is approved, the Results and Method sections need one more line each.
5. **Approve the copy.** Founder sign-off: ____ (date) ____
