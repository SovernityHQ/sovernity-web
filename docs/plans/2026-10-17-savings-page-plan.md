# Plan: /savings/ studio page with live calculator and sources

Ticket: build `/savings/` on the studio frame, with the approved copy verbatim, a live calculator, a no-JS default result, a sources list rendered from the assumptions module, the outbound allowlist update, and a link from the studio site.

## Inputs
- Copy: `docs/copy/2026-10-16-savings-copy.md` (PR #5). Not yet filed in HQ, so this repo's copy is the source.
- Data and maths: `src/savings-data.ts`, `src/savings.ts` (PR #6).

## Copy decisions taken (each one flagged in the PR for the founder)
- D1 path: `/savings/`, a studio page (the ticket decides this). Studio header and footer, `studio.css`. The head text stays as the copy gives it (title "… · Sovernity Ursa", og:site_name Sovernity Ursa, the Ursa OG card).
- D2: the default, "About the same, within the margin of error".
- D3: the default, the Geerling GitHub issue, which needs `/geerlingguy/ai-benchmarks` allowed on github.com.
- Reference model: the default, GPT-6 Sol, with the Luna like-for-like note.
- Trademarks: the default (first-listed) option, the line on this page, above the footer.
- Count label: the copy says the visible label is "Messages" and that the inputs read "20 messages every day" / "1 message every day". The page follows the reading: the label shows "messages", and "message" at a count of 1.
- Sources: the copy leaves the llama.cpp line unlinked, and the spike's host list (`docs/calculator-sources.md`) doesn't cover it, so it stays unlinked: linking it would need a GitHub path the spike didn't list, and the ticket allows only the spike's hosts. Every other source entry is a link. Flagged in the PR.

## Files
1. `src/savings-format.ts` (+ test): pure formatters per the copy's Values table: count, cost ($ to 2 dp, or ¢ to 2 sig figs under $0.01), energy (Wh / kWh), carbon (g / kg), ratio, size phrase (singular at 1), and `parseCount` for the 1–100,000 whole-number rule. `src/savings-data.ts`: add the Gemini comparison figure (0.24 Wh, arxiv 2508.15734) so every linked source is in the module.
2. `scripts/savings-render.ts` (+ test): renders the Sources section HTML, the copy's text verbatim, with each link's href built from `FIGURES`/`PRESETS` `source` (`https://` added back). `scripts/build.ts` registers it as a generated partial (`<!-- include:savings-sources -->`), so the list can't drift from the module.
3. `site/savings/index.html`: studio head/header/footer, hero, inputs form (hidden without JS via `hidden`, shown by the script), results with the default result (20 typical messages a day) written in, `<noscript>` note, `#method`, what isn't counted, `#sources`, disclaimer, trademark line. A test pins every `data-out` default in the HTML to `calculate(20, 'day', 'typical')` formatted.
4. `src/savings-page.ts`: reads the form, recomputes on `input`/`change`, writes the `data-out` cells, label plural, year line, error state (`aria-invalid`, error text). No network. Registered in `src/main.ts` as `savings`.
5. `site/assets/css/studio.css`: `.sv-*` rules, light/dark via tokens, phone width.
6. `scripts/check-rules.ts`: add `developers.openai.com`, `epoch.ai`, `arxiv.org`, `ember-energy.org`, `www.eia.gov` to `OUTBOUND_HOSTS`; allow the Geerling GitHub path. Test in `scripts/check.test.ts`: each allowed, a neighbour host and other GitHub paths still rejected.
7. Link: studio home Ursa section gets a link "What does a message cost?" (the page's own headline) to `/savings/`.

## Checks
`npm run typecheck`, `npm test`, `npm run build`, `npm run check` (strict), `npm run shoot -- --only /savings/ --only /` and inspect light/dark/390/no-JS shots.

## Done condition
`_site/savings/index.html` builds, links in from `/`, updates live with no network, shows the default result and full sources without JS, all checks pass strict, shots look right; draft PR open.
