# sovernity.com

The source of [sovernity.com](https://sovernity.com): the Sovernity studio pages, **Sovernity Ursa** (product page, privacy, terms, crisis protocol, support) and **Sovernity Chat** (under `/chat/`).

This repository is now edited by hand. It is no longer generated from SovernityChat (that publish script is retired).

No cookies, no analytics, no third-party requests.

## Layout

- `site/` page sources (hand-written HTML), with shared pieces in `site/_partials/` (not deployed).
- `site/assets/` CSS, fonts, images.
- `src/` browser TypeScript (theme toggle, phone menu, Dipper, seal motion), compiled by `tsc` into `_site/assets/js/`.
- `scripts/` build, check, serve and shoot scripts (Node runs the `.ts` files directly).
- `templates/` the launch markup (download block, App Store badge, Smart App Banner) for the stage-2 swap. Not deployed.
- `_site/` build output (gitignored).

## Commands

Node 24 or newer.

```
npm ci
npm test                                  # unit tests
npm run typecheck
npm run build                             # site/ -> _site/
npm run check [-- --draft] [--chat-repo PATH]
npm run serve                             # local server that mimics GitHub Pages
npm run shoot                             # screenshot matrix and visual assertions; needs local Chrome, not run in CI
```

`check` fails while any `[[...]]` placeholder is left in a page; `--draft` turns those into warnings. CI uses `--draft` on pull requests and strict mode on `main`.

## Copy rules

Copy comes verbatim from the HQ copy files, and banned words, fixed lines, the outbound-link allowlist and the no-third-party rules are enforced by `scripts/check-rules.ts`. Read that file before editing any page text.

## Chat privacy policy

The Chat privacy page must stay equal to the policy bundled in the app. Before any edit to it, run `npm run check -- --chat-repo PATH` against a SovernityChat checkout.

## Publishing

Pull request, then the founder merges, then the workflow (`.github/workflows/pages.yml`) typechecks, tests, builds, checks and deploys `_site/` to GitHub Pages. Only pushes to `main` deploy.

**Pages is still on the legacy source (`main`, `/`).** Merging to `main` before the source is switched to GitHub Actions would serve the repository root, not `_site/`. Switch the source first. Publishing is in two stages (launch markup in `templates/` goes in at stage 2) and needs founder approval. The order of steps is in the HQ runbook: `knowledge/ledgers/ursa-website/publish-runbook.md` (in SovernityHQ/SovernityUrsa-HQ; written later).
