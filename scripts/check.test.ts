import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import * as R from './check-rules.ts';

test('visibleText drops comments, scripts, styles and tags', () => {
  assert.equal(R.visibleText('<!-- therapy --><p>Hi&nbsp;<b>there</b></p><script>x</script><style>p{}</style>'), 'Hi there');
});
test('placeholders found in text and attributes', () => {
  assert.deepEqual(R.findPlaceholders('<p>v [[S6: 1.0.0]]</p><img alt="[[F2: x]]">'), ['[[S6: 1.0.0]]', '[[F2: x]]']);
});
test('banned words with the allowed therapist phrases', () => {
  assert.deepEqual(R.findBanned('Ursa is an AI, not a person or a therapist.', 'ursa'), []);
  assert.deepEqual(R.findBanned('It is not therapy.', 'ursa'), []);
  assert.deepEqual(R.findBanned('Like a therapist, it listens.', 'ursa'), ['therapist']);
  assert.deepEqual(R.findBanned('Your AI companion', 'ursa'), ['companion']);
  assert.deepEqual(R.findBanned('Nothing leaves your iPhone', 'ursa'), ['nothing leaves your iphone']);
  assert.deepEqual(R.findBanned('fully open-source', 'chat'), ['open-source']);
  assert.deepEqual(R.findBanned('treatments', 'ursa'), ['treatments']);
  assert.deepEqual(R.findBanned('therapists and a diagnosis', 'ursa'), ['therapists', 'diagnosis']);
  assert.deepEqual(R.findBanned('companions, diagnosed', 'ursa'), ['companions', 'diagnosed']);
  assert.deepEqual(R.findBanned('psychotherapy', 'ursa'), []);
  assert.deepEqual(R.findBanned('It’s not a therapist', 'ursa'), []);
});
test('same-origin refs', () => {
  for (const ok of ['/assets/a.css', '#x', 'data:image/png;base64,AA']) assert.ok(R.isSameOriginRef(ok), ok);
  for (const bad of ['https://fonts.googleapis.com/x', '//cdn.x/y', 'http://a', 'a.png', '/\\evil.com', '\\evil/']) assert.ok(!R.isSameOriginRef(bad), bad);
});
test('resource refs include srcset candidates and link hrefs, not anchors', () => {
  assert.deepEqual(R.findResourceRefs('<img src="/a.png" srcset="/a.png 1x, /b.png 2x"><link rel="icon" href="/f.svg"><a href="https://x.com">x</a>'), ['/a.png', '/a.png', '/b.png', '/f.svg']);
});
test('css urls', () => {
  assert.deepEqual(R.findCssUrls(`@font-face{src:url("/f.woff2") format("woff2")} @import url(https://x/y.css);`), ['/f.woff2', 'https://x/y.css']);
});
test('network apis', () => {
  assert.deepEqual(R.findNetworkApis('const r = await fetch(u); new WebSocket(a); import("x")'), ['fetch', 'WebSocket', 'import(']);
  assert.deepEqual(R.findNetworkApis('el.dataset.fetched = 1'), []);
});
test('outbound links', () => {
  assert.deepEqual(R.findOutboundLinks('<a href="https://988lifeline.org/">988</a><a href="/ursa/">u</a><a href="mailto:support@sovernity.com">m</a>'), ['https://988lifeline.org/', 'mailto:support@sovernity.com']);
});
test('inline scripts: whole tags, src scripts excluded', () => {
  assert.deepEqual(R.findInlineScripts(`<script src="/a.js"></script>${R.THEME_BOOT}<!-- <script>x</script> -->`), [R.THEME_BOOT]);
});
test('page groups', () => {
  assert.equal(R.pageGroup('chat/privacy/index.html'), 'chat');
  assert.equal(R.pageGroup('ursa/terms/index.html'), 'ursa');
  assert.equal(R.pageGroup('about/index.html'), 'studio');
});

const AI = 'Ursa is an AI, not a person or a therapist.';
const ADULT = 'For adults 18+. May not be suitable for some minors.';
function page(opts: { head?: string; body?: string; footer?: string; title?: string } = {}): string {
  return `<!doctype html><html lang="en"><head><title>${opts.title ?? 'T'}</title><meta name="description" content="d">${R.THEME_BOOT}${opts.head ?? ''}</head><body><main><h1>H</h1>${opts.body ?? ''}</main>${opts.footer ?? ''}</body></html>`;
}
const ursaFooter = `<footer><p>${ADULT}</p>${['privacy', 'terms', 'crisis-protocol', 'support'].map((s) => `<a href="/ursa/${s}/">${s}</a>`).join('')}</footer>`;
async function site(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'check-'));
  for (const [rel, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, rel)), { recursive: true });
    await writeFile(join(dir, rel), body);
  }
  return dir;
}
const ursaPages = (extra: string = '') => ({
  'ursa/index.html': page({ body: `<p>${AI}</p><p>${ADULT}</p><p>${ADULT}</p>${extra}`, footer: ursaFooter }),
  'ursa/privacy/index.html': page({ footer: ursaFooter }),
  'ursa/terms/index.html': page({ footer: ursaFooter }),
  'ursa/crisis-protocol/index.html': page({ body: `<p>${ADULT}</p>`, footer: ursaFooter }),
  'ursa/support/index.html': page({ footer: ursaFooter }),
});
const ruleIds = (errors: string[]) => [...new Set(errors.map((e) => e.split(':')[0]))].sort();

test('checkSite: empty site (only dotfiles) is clean and notes skipped page rules', async () => {
  const dir = await site({ '.gitkeep': '' });
  const r = await R.checkSite(dir, { draft: false });
  assert.deepEqual(r.errors, []);
  assert.ok(r.ok.includes('ok fixed-lines (no page yet)'));
  assert.ok(r.ok.includes('ok no-badge-yet (no page yet)'));
});

test('checkSite: a good Ursa site passes', async () => {
  const dir = await site({ ...ursaPages(), 'index.html': page() });
  const r = await R.checkSite(dir, { draft: false });
  assert.deepEqual(r.errors, []);
});

test('checkSite: third-party link and missing internal link are reported by rule id', async () => {
  const dir = await site({
    ...ursaPages(),
    'a/index.html': page({ head: '<link rel="stylesheet" href="https://fonts.googleapis.com/css">' }),
    'b/index.html': page({ body: '<a href="/missing/">x</a>' }),
  });
  const r = await R.checkSite(dir, { draft: false });
  assert.deepEqual(ruleIds(r.errors), ['internal-links', 'root-absolute']);
  assert.ok(r.errors.some((e) => e.startsWith('root-absolute: a/index.html')));
  assert.ok(r.errors.some((e) => e.startsWith('internal-links: b/index.html')));
});

test('checkSite: --draft turns placeholders into warnings', async () => {
  const dir = await site({ ...ursaPages('<p>v [[S6: 1.0.0]]</p>') });
  const strict = await R.checkSite(dir, { draft: false });
  assert.deepEqual(ruleIds(strict.errors), ['placeholders']);
  const draft = await R.checkSite(dir, { draft: true });
  assert.deepEqual(draft.errors, []);
  assert.ok(draft.warnings.some((w) => w.startsWith('placeholders: ursa/index.html')));
});

test('checkSite: copy, fixed-line, badge, inline-script and meta rules', async () => {
  const dir = await site({
    'ursa/index.html': page({ body: '<p>Coming soon. Secure and your companion. 34.3</p><a href="https://apps.apple.com/x">a</a><img src="/x.png">', footer: '<footer></footer>' }),
    'x/index.html': '<html lang="en"><head><title>T</title></head><body onclick="x()"><script>alert(1)</script><h1>a</h1><h1>b</h1></body></html>',
    'x.png': '',
  });
  const r = await R.checkSite(dir, { draft: false });
  assert.deepEqual(ruleIds(r.errors), ['banned', 'fixed-lines', 'inline-script', 'meta', 'no-badge-yet', 'secure', 'ursa-footer', 'vera']);
});

test('checkSite: JS network and /releases/latest', async () => {
  const dir = await site({ 'js/a.js': 'fetch("https://x.com")', 'css/a.css': 'a{background:url(https://x/y)}', 'index.html': page({ body: '<a href="https://github.com/SovernityHQ/sovernity-web/releases/latest">x</a>' }) });
  const r = await R.checkSite(dir, { draft: false });
  assert.deepEqual(ruleIds(r.errors), ['js-network', 'latest', 'root-absolute']);
});

test('checkSite: chat-policy compares the generated block to the master', async () => {
  const line = 'Version 1.0-beta.3 · Effective: 2026-09-01';
  const longLine = 'We keep your conversations only on this Mac and never send them anywhere.';
  const chat = await site({
    'Resources/Legal/PRIVACY_POLICY.md': `# P\n${line}\n`,
    'docs/legal/PRIVACY_POLICY.md': `intro\n**Version 1.0-beta.3 · Effective: 2026-09-01**\n\n## Heading\n- **${longLine}**\n| a | table row that is long enough to be skipped by the check |\n`,
  });
  const good = page({ body: `<p>${line}</p>\n<!-- BEGIN GENERATED PRIVACY POLICY -->\n<p><strong>${line}</strong></p>\n<li><strong>${longLine.replace('and never', 'and&nbsp;never')}</strong></li>\n<!-- END GENERATED PRIVACY POLICY -->` });
  const ok = await site({ 'chat/privacy/index.html': good });
  assert.deepEqual((await R.checkSite(ok, { draft: false, chatRepo: chat })).errors.filter((e) => e.startsWith('chat-policy')), []);
  const stale = await site({ 'chat/privacy/index.html': good.replace('beta.3', 'beta.2').replace('only on', 'mostly on') });
  const r = await R.checkSite(stale, { draft: false, chatRepo: chat });
  assert.ok(r.errors.filter((e) => e.startsWith('chat-policy')).length >= 2);
  const none = await R.checkSite(ok, { draft: false });
  assert.ok(none.warnings.includes('chat-policy skipped (needs the private Chat repo)'));
});

test('resource refs: poster, object data, svg image/use, image-set strings', () => {
  assert.deepEqual(R.findResourceRefs('<video poster="/p.png"></video><object data="/o.svg"></object><svg><image href="/i.png"/><use xlink:href="/u.svg#a"/></svg>'), ['/p.png', '/o.svg', '/i.png', '/u.svg#a']);
  assert.deepEqual(R.findCssUrls('a{background:image-set("/a.png" 1x, url(/b.png) 2x)} b{background:-webkit-image-set(\'https://x/c.png\' 1x)}'), ['/b.png', '/a.png', 'https://x/c.png']);
});
test('network apis: workers and service workers', () => {
  assert.deepEqual(R.findNetworkApis('new Worker("/w.js"); navigator.serviceWorker.register("/s.js")'), ['newWorker(', 'serviceWorker.register']);
});

test('checkSite: attribute text feeds banned, secure and vera', async () => {
  const dir = await site({ ...ursaPages(), 'x/index.html': page({
    head: '<meta property="og:description" content="Your AI companion">',
    body: '<img src="/x.png" alt="VERA-MH 34.3"><img src="/x.png" alt="secure chat"><svg><title>Secure</title></svg><svg aria-label="secure seal"></svg>', }), 'x.png': '' });
  const r = await R.checkSite(dir, { draft: false });
  assert.ok(r.errors.some((e) => e.startsWith('banned: x/index.html: "companion"')));
  assert.ok(r.errors.some((e) => e.startsWith('vera: x/index.html')));
  assert.ok(r.errors.some((e) => e.startsWith('secure: x/index.html')));
  const seal = await site({ ...ursaPages(), 'y/index.html': page({ body: '<svg aria-label="Secure seal"><title>Secure</title></svg>' }) });
  assert.deepEqual((await R.checkSite(seal, { draft: false })).errors, []);
});

test('checkSite: chat scans raw markup with the chat list', async () => {
  const dir = await site({ 'chat/index.html': page({ body: '<div data-x="open-source"></div><script type="application/ld+json">{"d":"audited"}</script>' }) });
  const r = await R.checkSite(dir, { draft: false });
  const banned = r.errors.filter((e) => e.startsWith('banned:')).join('\n');
  assert.match(banned, /open-source/);
  assert.match(banned, /audited/);
});

test('checkSite: outbound is an allowlist', async () => {
  const bad = ['tel:+1555', 'javascript:alert(1)', ' https://evil.example/', '\\\\evil/', 'https://github.com/other/repo', 'mailto:x@y.com', 'rel/path', '//cdn.x/y'];
  const dir = await site({ ...ursaPages(), 'z/index.html': page({ body: bad.map((h) => `<a href="${h}">x</a>`).join('') + '<a href="/ursa/">ok</a><a href="#a">ok</a><a href="https://988lifeline.org/">ok</a><a href="mailto:support@sovernity.com?subject=hi">ok</a>' }) });
  const r = await R.checkSite(dir, { draft: false });
  const out = r.errors.filter((e) => e.startsWith('outbound: z/index.html'));
  // ' https://evil.example/' is trimmed by the attribute parser, then rejected on host
  assert.equal(out.length, bad.length);
  assert.ok(r.errors.some((e) => e.startsWith('inline-script: z/index.html') && e.includes('javascript:')));
});

test('checkSite: root-absolute and internal-links cover extra attributes and inline CSS', async () => {
  const dir = await site({ ...ursaPages(), 'w/index.html': page({
    head: '<style>a{background:url(/gone.png)} b{background:image-set("https://x/y.png" 1x)}</style>',
    body: '<video poster="rel.png"></video><div style="background:url(/gone2.png)"></div><a href="/bad%zz">x</a><img src="/\\evil.png" alt="a">' }) });
  const r = await R.checkSite(dir, { draft: false });
  const has = (id: string, needle: string) => assert.ok(r.errors.some((e) => e.startsWith(`${id}: w/index.html`) && e.includes(needle)), `${id} ${needle}`);
  has('root-absolute', 'rel.png');
  has('root-absolute', 'https://x/y.png');
  has('root-absolute', '/\\evil.png');
  has('internal-links', '/gone.png');
  has('internal-links', '/gone2.png');
  has('internal-links', '/bad%zz');
});

test('checkSite: js-network scans .mjs and protocol-relative strings', async () => {
  const dir = await site({ 'a.mjs': 'new Worker("/w.js")', 'b.js': 'const u = "//evil.example/x";' });
  const r = await R.checkSite(dir, { draft: false });
  assert.ok(r.errors.some((e) => e.startsWith('js-network: a.mjs')));
  assert.ok(r.errors.some((e) => e.startsWith('js-network: b.js') && e.includes('//')));
});
