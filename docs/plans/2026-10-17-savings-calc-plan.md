# Plan: savings assumptions module and pure calculation

Ticket: assumptions module and pure calculation functions with unit tests.

## Inputs
- Figures: `docs/calculator-sources.md` (identical to spike commit 7d1c146; founder approval still pending, so the module uses its recommended values).
- Page contract: `docs/copy/2026-10-16-savings-copy.md`: count 1–100,000, period day · week · month · year, presets Short chat / Typical / Long document, default 20 Typical a day → cloud $0.14, Mac 0.13¢, 10 Wh / 7.1 Wh, 4.6 / 3.3 g CO₂e, year $51.10 / $0.47, ratio 110.

## Files
1. `src/savings-data.ts`: `Figure` type `{ value, unit, label, source, publisher, asOf, note? }` and a `FIGURES` object, one entry per figure: Sol and Luna prices, cloud Wh per input/output token, Mac W and tok/s (writing and reading), Mac Wh per input/output token (derived, as the doc rounds them: 0.000075 and 0.00056), Mac idle W and max W, grid 458 gCO₂e/kWh, electricity $0.18/kWh. `PRESETS` holds the three presets' input/output tokens, each with its source. Estimates and derived figures cite the source they rest on and say so in `note`.
2. `src/savings.ts`: `Period`, `PresetId`, `PERIOD_DAYS` (day 1, week 7, month 365/12, year 365), `messageTokens`, `calculate(count, period, preset)` returning tokens and, for cloud and local: cost $, Wh, gCO₂e, plus `savings` (cloud − local) and `costRatio`. `count` is messages per day, week, month or year (whatever the selected period is), and the outputs are totals for that period. It throws a RangeError for a negative or non-finite count. It imports the figures only, with no DOM.
3. `src/savings.test.ts` (picked up by the existing `src/**/*.test.ts` glob): every figure has its fields and a well-formed https source; values equal the doc; derived Mac Wh/token agree with W ÷ tok/s to the doc's rounding; preset × period grid (count 0 → all zeros, count 100,000 → finite and scaled linearly); local energy, CO₂e and cost > 0 for any count > 0; hand-computed per-message values for each preset (the doc's worked-check table); the copy's default example.

## Divergence
- 2026-10-17: `npm run check` (`js-network`) fails on any `http(s):` or `//` string in built JS, and `savings-data.ts` builds to `assets/js/savings-data.js`. So `source` is stored as the URL without `https://`, and the page links the sources in its HTML. The test checks that `https://` + source parses to a real hostname.

## Checks
`npm test`, `npm run typecheck`, `npm run check`.

## Done condition
The three files exist and match the doc, the tests cover the acceptance criteria, and all checks pass. A draft PR is open.
