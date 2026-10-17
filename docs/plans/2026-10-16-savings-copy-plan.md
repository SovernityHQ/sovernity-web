# Plan: savings page copy (HQ copy file draft)

Ticket: draft savings page copy into the HQ copy file for founder approval.

## Where the file goes
The HQ copy files live in SovernityHQ/SovernityUrsa-HQ under `knowledge/design/2026-10-06-ursa-website/` (e.g. `2026-10-06-support-copy.md`). This session can only write inside the sovernity-web worktree, so the draft is written here as `docs/copy/2026-10-16-savings-copy.md`, in the same format (front matter, `[[X: …]]` placeholders, **Fixed** lines). Once the founder approves it, it is filed in HQ as `knowledge/design/2026-10-06-ursa-website/2026-10-16-savings-copy.md`, and the page build copies from there.

## Inputs
- Spike sources doc: `docs/calculator-sources.md`, local commit 7d1c146 on `devhq/spike-source-and-cite-every-calculator-f-3wke9v` (not pushed). Reference model GPT-6 Sol $2/$10 per 1M tokens; presets 100/300, 1,000/500, 10,000/1,500; cloud 0.0002/0.0006 Wh per token; Mac mini M4 16 GB, Gemma 4 12B MLX 4-bit, 30 W / 15 tok/s, 35 W / 130 tok/s; 458 gCO2e/kWh; $0.18/kWh.
- Format and shared pieces: HQ `2026-10-06-website-copy.md` (Ursa header, sub-nav, footer).
- Rules: `scripts/check-rules.ts`: URSA_BANNED_WORDS, URSA_BANNED_PHRASES, "secure" (any case, any form), the fixed lines (adult line in the Ursa footer), "34.3".

## Steps
1. Write the copy file, covering: title, meta/OG description, OG image alt, headline and lede, inputs (message count, period, size presets with token counts), result labels (cost, energy, carbon, for cloud and Mac, plus the difference), "How we calculate this" (electricity-only local cost; Mac purchase price and model download excluded; Mac's own wall draw; same grid intensity on both sides), sources section headings plus one cited line per figure, the estimates disclaimer, and the shared header/footer.
2. Framing follows the spike's recommendation: cost is about 100× lower; energy and carbon are roughly equal. No "greener" or "far less energy" claims.
3. Open questions go into a founder-decisions list at the end (page path, framing, small-model toggle, Geerling citation).
4. Check the file: run every copy string through `findBanned(…, 'ursa')`, the `/secure/i` test and the "34.3" test from check-rules.ts with an ad hoc script. Then run `npm test`, `npm run typecheck` and `npm run check -- --draft` so nothing regresses.
5. Draft PR in sovernity-web; review by fresh subagents (rules and facts against the spike doc); verify; ship. The PR description asks for founder approval, and approval is recorded by the founder.

## Done condition
The copy file holds every visible and meta string for the page. The method note states the three assumptions. The rule check reports zero hits. A draft PR is open for the founder.
