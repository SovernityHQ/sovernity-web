import { readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';

/**
 * The one inline script every page may carry, as the full `<script>…</script>` tag, byte for byte.
 * `findInlineScripts` returns whole tags, so the comparison is tag against tag.
 * (site/_partials/head.html must contain exactly this string; Task 4 pins that with a test.)
 */
export const THEME_BOOT =
  '<script>try{var t=localStorage.getItem("sovernity-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>';

export const OUTBOUND_HOSTS: readonly string[] = [
  'www.linkedin.com', '988lifeline.org', 'github.com', 'huggingface.co', 'tailscale.com',
  'www.obdev.at', 'objective-see.org', 'support.apple.com', 'www.apple.com', 'apps.apple.com',
  'opensource.org', 'openfontlicense.org', 'www.apache.org', 'ai.google.dev',
];
/** Extra hosts for Chat pages only: its generated privacy policy (§6) links GitHub's privacy policy. */
export const CHAT_OUTBOUND_HOSTS: readonly string[] = ['docs.github.com'];
const GITHUB_PATH = '/SovernityHQ/sovernity-web';
const SUPPORT_MAILBOX = 'support@sovernity.com';
/** Chat's contact address, named in its generated privacy policy (§10), which is copied verbatim from Chat's master. Chat pages only. */
const CHAT_MAILBOX = 'milo.sovernity@shieber.com';

/** Regex sources, matched with word boundaries; inflections included (therapists, diagnosis, treatments). */
const URSA_BANNED_WORDS = ['companions?', 'therap(?:y|ies)', 'therapists?', 'diagnos\\w*', 'treatments?', 'zodiac'];
const URSA_BANNED_PHRASES = [
  'off the record', 'nothing leaves your iphone', 'on-device dictation', 'private dictation',
  'you are not alone', 'the stars say',
];
const ALLOWED_PHRASES = ['not a person or a therapist', 'not a therapist', 'not therapy'];
const CHAT_BANNED = [
  'open source', 'open-source', 'opensource', 'foss', 'free software', 'reproducible build',
  'reproducibly built', 'audited', 'military-grade', 'hipaa compliant', 'zero-knowledge', 'unhackable',
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  mdash: '—', ndash: '–', middot: '·', hellip: '…', copy: '©', reg: '®', trade: '™', times: '×', rarr: '→', larr: '←',
};

/** Single-pass decode (so `&amp;lt;` becomes `&lt;`), like Python's html.unescape for the entities we use. */
export function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g, (m, dec?: string, hex?: string, name?: string) => {
    if (dec !== undefined || hex !== undefined) {
      const cp = dec !== undefined ? Number(dec) : parseInt(hex as string, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return NAMED_ENTITIES[name as string] ?? m;
  });
}

const INLINE_TAGS = new Set(['a', 'b', 'i', 'em', 'strong', 'span', 'code', 'small', 'sub', 'sup', 'abbr', 'mark', 'u', 's', 'kbd', 'time', 'cite', 'q', 'wbr']);
const TAG = /<[a-zA-Z/][^\s>/]*(?:"[^"]*"|'[^']*'|[^'">])*>/g;

function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}
/** HTML with comments removed and script/style bodies emptied (tags kept), for tag-level scans. */
function markup(html: string): string {
  return stripComments(html).replace(/(<(script|style)\b[^>]*>)[\s\S]*?(<\/\2\s*>)/gi, '$1$3');
}

/** Visible text: no comments, scripts, styles or tags; entities decoded; whitespace collapsed. Block tags separate words, inline tags don't. */
export function visibleText(html: string): string {
  const noCode = stripComments(html).replace(/<![a-zA-Z][^>]*>/g, ' ').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const noTags = noCode.replace(TAG, (t) => {
    const name = /^<\/?([a-zA-Z0-9-]+)/.exec(t)?.[1]?.toLowerCase() ?? '';
    return INLINE_TAGS.has(name) ? '' : ' ';
  });
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim();
}

export function findPlaceholders(html: string): string[] {
  const src = stripComments(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  return src.match(/\[\[[\s\S]*?\]\]/g) ?? [];
}

function normaliseQuotes(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

export function findBanned(text: string, group: 'ursa' | 'chat'): string[] {
  let t = normaliseQuotes(text).toLowerCase();
  const hits: string[] = [];
  if (group === 'chat') {
    for (const term of CHAT_BANNED) if (t.includes(term)) hits.push(term);
    return hits;
  }
  for (const p of ALLOWED_PHRASES) t = t.split(p).join(' ');
  for (const w of URSA_BANNED_WORDS) {
    for (const m of t.matchAll(new RegExp(`\\b${w}\\b`, 'g'))) if (!hits.includes(m[0])) hits.push(m[0]);
  }
  for (const p of URSA_BANNED_PHRASES) if (t.includes(p)) hits.push(p);
  return hits;
}

export function isSameOriginRef(ref: string): boolean {
  if (ref.includes('\\')) return false;
  return (ref.startsWith('/') && !ref.startsWith('//')) || ref.startsWith('#') || ref.toLowerCase().startsWith('data:');
}

const SITE_ORIGIN = 'https://sovernity.com';
/** An absolute URL on this site (`https://sovernity.com/` plus a root path). Allowed only where a crawler needs one:
 *  `<link rel="canonical">` and the og:url / og:image / twitter:image meta content. Never a fetched resource. */
export function isSiteUrl(ref: string): boolean {
  return ref.startsWith(`${SITE_ORIGIN}/`) && isSameOriginRef(ref.slice(SITE_ORIGIN.length));
}
const SITE_URL_METAS = ['og:url', 'og:image', 'twitter:image'];

function attrsOf(tag: string): [string, string][] {
  const out: [string, string][] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const body = tag.replace(/^<[^\s>/]+/, '');
  for (const m of body.matchAll(re)) out.push([m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim()]);
  return out;
}
function tagsOf(html: string): { name: string; attrs: [string, string][]; raw: string }[] {
  return (markup(html).match(TAG) ?? [])
    .filter((t) => !t.startsWith('</'))
    .map((raw) => ({ name: /^<([a-zA-Z0-9-]+)/.exec(raw)?.[1]?.toLowerCase() ?? '', attrs: attrsOf(raw), raw }));
}
function srcsetCandidates(v: string): string[] {
  return v.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
}

const isCanonical = (attrs: [string, string][]) => attrs.some(([k, v]) => k === 'rel' && v.toLowerCase() === 'canonical');

/** The URL in a `<meta http-equiv="refresh" content="5; url=…">`, or null when it only reloads. */
function refreshTarget(content: string): string | null {
  const m = /^\s*[\d.]*\s*[;,]?\s*(?:url\s*=\s*)?(['"]?)(.*?)\1\s*$/i.exec(content);
  return m && m[2] ? m[2] : null;
}

/** Every resource reference (`<link rel="canonical">` names the page, it isn't fetched): `src`, `srcset` candidates, `<link href>`,
 *  plus anything the browser requests or navigates to on its own or by a form: meta refresh targets, `ping`, form `action`
 *  and `formaction`; and CSS urls in `<style>` blocks and `style` attributes. */
export function findResourceRefs(html: string): string[] {
  const refs: string[] = [];
  for (const { name, attrs } of tagsOf(html)) {
    if (name === 'meta' && attrs.some(([k, v]) => k === 'http-equiv' && v.toLowerCase() === 'refresh')) {
      const target = refreshTarget(attrs.find(([k]) => k === 'content')?.[1] ?? '');
      if (target !== null) refs.push(target);
    }
    for (const [k, v] of attrs) {
      if (k === 'src') refs.push(v);
      else if (k === 'srcset') refs.push(...srcsetCandidates(v));
      else if (k === 'href' && name === 'link' && !isCanonical(attrs)) refs.push(v);
      else if (k === 'poster' || (k === 'data' && name === 'object')) refs.push(v);
      else if ((k === 'href' || k === 'xlink:href') && ['image', 'use', 'feimage'].includes(name)) refs.push(v);
      else if (k === 'style') refs.push(...findCssUrls(v));
      else if (k === 'ping') refs.push(...v.split(/\s+/).filter(Boolean));
      else if ((k === 'action' && name === 'form') || k === 'formaction') refs.push(v);
    }
  }
  for (const m of stripComments(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) refs.push(...findCssUrls(m[1]));
  return refs;
}

export function findCssUrls(css: string): string[] {
  const out: string[] = [];
  const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi;
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]);
  // image-set("/a.png" 1x, ...) takes bare strings; url(...) inside it was collected above.
  for (const set of clean.matchAll(/(?:-webkit-)?image-set\(((?:[^()]|\([^)]*\))*)\)/gi)) {
    for (const m of set[1].replace(/url\([^)]*\)/gi, ' ').matchAll(/"([^"]*)"|'([^']*)'/g)) out.push(m[1] ?? m[2]);
  }
  return out;
}

export function findNetworkApis(js: string): string[] {
  return js.match(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|\bimport\s*\(|\bnew\s+(?:Shared)?Worker\s*\(|\bserviceWorker\s*\.\s*register\b/g)?.map((s) => s.replace(/\s+/g, '')) ?? [];
}

/** Complete `<script>…</script>` tags without a `src`, exactly as written. */
export function findInlineScripts(html: string): string[] {
  const out: string[] = [];
  for (const m of stripComments(html).matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)) {
    if (!attrsOf(`<script ${m[1]}>`).some(([k]) => k === 'src')) out.push(m[0]);
  }
  return out;
}

export function pageGroup(rel: string): 'ursa' | 'studio' | 'chat' {
  const p = rel.split(sep).join('/');
  return p.startsWith('chat/') ? 'chat' : p.startsWith('ursa/') ? 'ursa' : 'studio';
}

// ---------------------------------------------------------------- chat-policy (port of publish-website.sh gates 1 and 2)

const POLICY_LINE = /Version 1\.0-beta\.[0-9]* · Effective: [0-9-]*/;
const PY_LINE_BREAKS = new RegExp("\\r\\n|[\\n\\r\\v\\f\\x1c-\\x1e\\x85\\u2028\\u2029]");
const ws = (s: string) => s.replace(/\s+/g, ' ').trim();

export function policyLine(text: string): string | null {
  return POLICY_LINE.exec(text)?.[0] ?? null;
}

/** Lines of the generated block, as the old script's `have` set. Returns null if the markers are missing. */
export function generatedBlockLines(html: string): Set<string> | null {
  if (!html.includes('BEGIN GENERATED PRIVACY POLICY')) return null;
  let blk = html.split('BEGIN GENERATED PRIVACY POLICY')[1].split('END GENERATED PRIVACY POLICY')[0];
  blk = blk.replace(/<!--[\s\S]*?-->/g, '');
  const txt = decodeEntities(blk.replace(/<[^>]+>/g, ''));
  return new Set(txt.split(PY_LINE_BREAKS).filter((l) => l.trim()).map(ws));
}

/** Master lines (over 40 chars after normalisation) that are absent from `have`. Null if the master has no Version line. */
export function missingMasterLines(master: string, have: Set<string>): string[] | null {
  const start = master.indexOf('**Version 1.0-beta');
  if (start < 0) return null;
  const missing: string[] = [];
  for (let line of master.slice(start).split(PY_LINE_BREAKS)) {
    line = line.trim();
    if (!line || line.startsWith('|')) continue; // tables render as cells, not lines
    // Emphasis markers first (see the old script's comment: a bullet strip would eat half a bold run).
    line = line.replaceAll('**', '').replaceAll('`', '');
    line = line.replace(/^#+\s*/, '');
    line = line.replace(/^[-*]\s+/, '');
    line = ws(line);
    if ([...line].length > 40 && !have.has(line)) missing.push(line);
  }
  return missing;
}

// ---------------------------------------------------------------- the site check

export interface CheckResult { errors: string[]; warnings: string[]; ok: string[] }

const RULES = [
  'placeholders', 'banned', 'secure', 'fixed-lines', 'ursa-footer', 'root-absolute', 'internal-links', 'outbound',
  'latest', 'js-network', 'inline-script', 'meta', 'no-badge-yet', 'vera', 'chat-policy',
] as const;
const AI_LINE = 'Ursa is an AI, not a person or a therapist.';
const ADULT_LINE = 'For adults 18+. May not be suitable for some minors.';
const URSA_FOOTER_LINKS = ['/ursa/privacy/', '/ursa/terms/', '/ursa/crisis-protocol/', '/ursa/support/'];

async function walk(dir: string, base = ''): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(join(dir, base), { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue; // .gitkeep and friends
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await walk(dir, rel)); else out.push(rel);
  }
  return out.sort();
}
function block(html: string, tag: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}\\s*>`, 'i').exec(stripComments(html));
  return m ? m[1] : null;
}
/** The inner markup of the first element whose start tag matches, up to its own end tag (same-name nesting counted). */
function elementBody(html: string, match: (attrs: [string, string][]) => boolean): string | null {
  const src = markup(html);
  let name = '';
  let start = -1;
  let depth = 0;
  for (const m of src.matchAll(TAG)) {
    const t = m[0];
    const close = t.startsWith('</');
    const n = /^<\/?([a-zA-Z0-9-]+)/.exec(t)?.[1]?.toLowerCase() ?? '';
    if (start < 0) {
      if (!close && match(attrsOf(t))) { name = n; start = m.index + t.length; depth = 1; }
      continue;
    }
    if (n !== name) continue;
    if (close) { if (--depth === 0) return src.slice(start, m.index); }
    else if (!t.endsWith('/>')) depth++;
  }
  return null;
}
const hasClass = (cls: string) => (attrs: [string, string][]) => attrs.some(([k, v]) => k === 'class' && v.split(/\s+/).includes(cls));
const hasId = (id: string) => (attrs: [string, string][]) => attrs.some(([k, v]) => k === 'id' && v === id);

/** Text carried by attributes: every meta content, alt, title, aria-*, placeholder, value. */
function attributeText(tags: { name: string; attrs: [string, string][] }[]): string[] {
  return tags.flatMap(({ name, attrs }) => attrs.filter(([k]) =>
    k === 'alt' || k === 'title' || k === 'placeholder' || k === 'value' || k.startsWith('aria-') || (k === 'content' && name === 'meta')).map(([, v]) => v));
}
const hostAllowed = (u: URL, group: 'ursa' | 'chat'): boolean => (group === 'chat' && CHAT_OUTBOUND_HOSTS.includes(u.hostname)) || OUTBOUND_HOSTS.includes(u.hostname) &&
  (u.hostname !== 'github.com' || u.pathname === GITHUB_PATH || u.pathname.startsWith(`${GITHUB_PATH}/`));

export async function checkSite(dir: string, opts: { draft: boolean; chatRepo?: string }): Promise<CheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skipped = new Map<string, string>();
  const err = (rule: string, page: string, msg: string) => errors.push(`${rule}: ${page}: ${msg}`);

  const files = await walk(dir);
  const fileSet = new Set(files);
  const pages = files.filter((f) => f.endsWith('.html'));
  const html = new Map<string, string>();
  for (const p of pages) html.set(p, await readFile(join(dir, p), 'utf8'));
  const resolves = (url: string): boolean => {
    let path: string;
    try { path = decodeURIComponent(url.replace(/[?#].*$/, '')).replace(/^\//, ''); } catch { return false; }
    if (path === '') return fileSet.has('index.html');
    if (path.endsWith('/')) return fileSet.has(`${path}index.html`);
    return fileSet.has(path) || fileSet.has(`${path}/index.html`);
  };

  for (const [rel, src] of html) {
    const text = visibleText(src);
    const tags = tagsOf(src);

    for (const ph of findPlaceholders(src)) {
      (opts.draft ? warnings : errors).push(`placeholders: ${rel}: ${ph}`);
    }

    const attrText = attributeText(tags);
    const group = pageGroup(rel) === 'chat' ? 'chat' : 'ursa';
    const banned = new Set(findBanned([text, ...attrText].join(' \n '), group));
    // Old gate 3 grepped the whole comment-stripped file, so chat also scans raw markup, data-*, scripts, JSON-LD.
    if (group === 'chat') for (const h of findBanned(stripComments(src), 'chat')) banned.add(h);
    for (const hit of banned) err('banned', rel, `"${hit}"`);

    // "Secure" is a studio/Ursa/legal rule (Global Constraints); Chat's policy text ("secure-delete pass") is Chat's own.
    const noSvgSrc = stripComments(src).replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, ' ');
    const secureText = [visibleText(noSvgSrc), ...attributeText(tagsOf(noSvgSrc))].join(' \n ');
    if (group !== 'chat' && /secure/i.test(secureText)) err('secure', rel, '"secure" in body text or attributes (allowed in the seal only)');

    for (const ref of findResourceRefs(src)) {
      if (!isSameOriginRef(ref)) err('root-absolute', rel, `not a root-absolute same-origin reference: ${ref}`);
    }

    const seen = new Set<string>();
    const linked: string[] = [...findResourceRefs(src)];
    for (const { attrs } of tags) {
      for (const [k, v] of attrs) {
        if (k === 'srcset') linked.push(...srcsetCandidates(v));
        else if (k === 'href' || k === 'src') linked.push(v);
      }
    }
    for (const u of linked) {
      if (!u.startsWith('/') || u.startsWith('//') || u.includes('\\') || seen.has(u)) continue;
      seen.add(u);
      if (!resolves(u)) err('internal-links', rel, `no file for ${u}`);
    }

    for (const { name, attrs } of tags) {
      if (name !== 'a' && name !== 'area') continue;
      for (const [k, href] of attrs) {
        if (k !== 'href') continue;
        let good = false;
        if (href.includes('\\')) good = false;
        else if ((href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#')) good = true;
        else if (/^mailto:/i.test(href)) {
          const box = href.slice(7).split('?')[0].toLowerCase();
          good = box === SUPPORT_MAILBOX || (group === 'chat' && box === CHAT_MAILBOX);
        }
        else if (/^https?:\/\//i.test(href)) {
          try { const u = new URL(href); good = u.protocol === 'https:' && hostAllowed(u, group); } catch { good = false; }
        }
        if (!good) err('outbound', rel, `href not allowed (root-absolute, #anchor, allowlisted https host or ${SUPPORT_MAILBOX} only): ${href}`);
      }
    }

    // Comments don't ship a link (Chat's D-060 note mentions the old form); markup, attributes and scripts do.
    if (stripComments(src).includes('/releases/latest')) err('latest', rel, 'contains /releases/latest');

    const inline = findInlineScripts(src);
    if (inline.length !== 1 || inline[0] !== THEME_BOOT) {
      err('inline-script', rel, `inline scripts must be exactly the theme boot script (found ${inline.length})`);
    }
    for (const { name, attrs } of tags) {
      for (const [k, v] of attrs) {
        if (/^on[a-z]+$/.test(k)) err('inline-script', rel, `<${name}> has an ${k} attribute`);
        if (/^javascript:/i.test(v.replace(/[\s\u0000-\u001f]/g, '')) && ['href', 'src', 'action', 'formaction', 'data', 'xlink:href'].includes(k)) {
          err('inline-script', rel, `<${name}> has a javascript: ${k}`);
        }
      }
    }

    const htmlTag = tags.find((t) => t.name === 'html');
    if (!htmlTag || !htmlTag.attrs.some(([k, v]) => k === 'lang' && v === 'en')) err('meta', rel, '<html lang="en"> missing');
    const title = block(src, 'title');
    if (title === null || !visibleText(title)) err('meta', rel, '<title> missing or empty');
    if (!tags.some((t) => t.name === 'meta' && t.attrs.some(([k, v]) => k === 'name' && v.toLowerCase() === 'description') &&
      t.attrs.some(([k, v]) => k === 'content' && v.trim()))) err('meta', rel, '<meta name="description"> missing');
    // Social cards and canonical: every indexable page carries the set; a noindex page (404) carries none of it.
    const metaKey = (t: { attrs: [string, string][] }) => t.attrs.find(([k]) => k === 'property' || k === 'name')?.[1].toLowerCase() ?? '';
    const metaVal = (key: string) => tags.find((t) => t.name === 'meta' && metaKey(t) === key)?.attrs.find(([k]) => k === 'content')?.[1];
    const canonicals = tags.filter((t) => t.name === 'link' && isCanonical(t.attrs));
    const social = tags.filter((t) => t.name === 'meta' && /^(og|twitter):/.test(metaKey(t)));
    const noindex = /\bnoindex\b/i.test(metaVal('robots') ?? '');
    for (const t of tags.filter((x) => x.name === 'meta')) {
      const v = t.attrs.find(([k]) => k === 'content')?.[1] ?? '';
      if (/^(https?:)?\/\//i.test(v) && !(SITE_URL_METAS.includes(metaKey(t)) && isSiteUrl(v))) {
        err('meta', rel, `absolute URL allowed only as https://sovernity.com/… in og:url, og:image, twitter:image: ${metaKey(t)}=${v}`);
      }
    }
    if (noindex) {
      // A redirect page (meta refresh to a root path, e.g. /privacy.html -> /chat/privacy/) may name its target as canonical.
      const refresh = tags.find((t) => t.name === 'meta' && t.attrs.some(([k, v]) => k === 'http-equiv' && v.toLowerCase() === 'refresh'));
      const target = refresh ? refreshTarget(refresh.attrs.find(([k]) => k === 'content')?.[1] ?? '') : null;
      const targetUrl = target !== null && target.startsWith('/') && isSiteUrl(`${SITE_ORIGIN}${target}`) ? `${SITE_ORIGIN}${target}` : null;
      const canonicalOk = canonicals.length === 0 ||
        (canonicals.length === 1 && targetUrl !== null && canonicals[0].attrs.find(([k]) => k === 'href')?.[1] === targetUrl);
      if (!canonicalOk || social.length) {
        err('meta', rel, 'a noindex page carries no og: or twitter: tags, and no canonical unless it redirects (meta refresh) to that same root path');
      }
    } else {
      const self = `${SITE_ORIGIN}/${rel.replace(/index\.html$/, '')}`;
      const canonical = canonicals.length === 1 ? canonicals[0].attrs.find(([k]) => k === 'href')?.[1] : undefined;
      if (canonical !== self) err('meta', rel, `expected one <link rel="canonical" href="${self}"> (found ${canonicals.length === 1 ? canonical : `${canonicals.length}`})`);
      if (metaVal('og:url') !== self) err('meta', rel, `og:url must be ${self}`);
      for (const k of ['og:type', 'og:site_name', 'og:image:width', 'og:image:height']) if (!metaVal(k)) err('meta', rel, `${k} missing`);
      if (title === null || metaVal('og:title') !== decodeEntities(title).trim()) err('meta', rel, 'og:title must equal <title>');
      if (metaVal('og:description') === undefined || metaVal('og:description') !== metaVal('description')) err('meta', rel, 'og:description must equal the meta description');
      const image = metaVal('og:image') ?? '';
      if (!isSiteUrl(image) || !resolves(image.slice(SITE_ORIGIN.length))) err('meta', rel, `og:image must be a https://sovernity.com/ file that exists (${image || 'missing'})`);
      if (metaVal('twitter:card') !== 'summary_large_image') err('meta', rel, 'twitter:card must be summary_large_image');
    }
    const h1s = tags.filter((t) => t.name === 'h1').length;
    if (h1s !== 1) err('meta', rel, `expected one <h1>, found ${h1s}`);
    for (const t of tags.filter((x) => x.name === 'img')) {
      const alt = t.attrs.find(([k]) => k === 'alt');
      const presentation = t.attrs.some(([k, v]) => k === 'role' && v === 'presentation');
      if (!alt) err('meta', rel, `<img> without alt: ${t.raw.slice(0, 80)}`);
      else if (alt[1] === '' && !presentation) err('meta', rel, `<img> with empty alt needs role="presentation": ${t.raw.slice(0, 80)}`);
    }

    if (/\b34\.3\b/.test([text, ...attrText].join(' \n '))) err('vera', rel, 'the VERA-MH score "34.3" must not appear');
  }

  // Page-specific rules.
  const ursaIndex = html.get('ursa/index.html');
  const norm = (s: string) => normaliseQuotes(visibleText(s));
  if (ursaIndex === undefined) {
    skipped.set('fixed-lines', 'no page yet');
    skipped.set('no-badge-yet', 'no page yet');
  } else {
    const t = norm(ursaIndex);
    if (!t.includes(AI_LINE)) err('fixed-lines', 'ursa/index.html', `missing "${AI_LINE}"`);
    // Beside both download areas, each counted on its own (the footer carries the line too, and is checked below).
    for (const [where, match] of [['the hero (.r2u-hero)', hasClass('r2u-hero')], ['the download section (#download)', hasId('download')]] as const) {
      const area = elementBody(ursaIndex, match);
      if (area === null || !norm(area).includes(ADULT_LINE)) err('fixed-lines', 'ursa/index.html', `"${ADULT_LINE}" missing from ${where}`);
    }
    if (visibleText(ursaIndex).includes('Coming soon')) {
      for (const [rel, src] of html) {
        if (tagsOf(src).some((x) => x.name === 'meta' && x.attrs.some(([k, v]) => k === 'name' && v === 'apple-itunes-app'))) {
          err('no-badge-yet', rel, 'apple-itunes-app meta while the page says "Coming soon"');
        }
        if (/apps\.apple\.com/.test(markup(src))) err('no-badge-yet', rel, 'apps.apple.com link while the page says "Coming soon"');
      }
    }
  }
  const crisis = html.get('ursa/crisis-protocol/index.html');
  if (crisis !== undefined) {
    const main = block(crisis, 'main');
    if (main === null || !norm(main).includes(ADULT_LINE)) err('fixed-lines', 'ursa/crisis-protocol/index.html', `"${ADULT_LINE}" missing from <main>`);
  }
  const ursaPages = [...html].filter(([rel]) => pageGroup(rel) === 'ursa');
  for (const [rel, src] of ursaPages) {
    const footer = block(src, 'footer');
    if (footer === null || !norm(footer).includes(ADULT_LINE)) err('fixed-lines', rel, `"${ADULT_LINE}" missing from the footer`);
    const hrefs = new Set(tagsOf(src).filter((t) => t.name === 'a').flatMap((t) => t.attrs.filter(([k]) => k === 'href').map(([, v]) => v)));
    for (const l of URSA_FOOTER_LINKS) if (!hrefs.has(l)) err('ursa-footer', rel, `missing link to ${l}`);
  }
  if (ursaPages.length === 0) skipped.set('ursa-footer', 'no page yet');

  // CSS and JS files.
  for (const f of files) {
    if (f.endsWith('.css')) {
      for (const u of findCssUrls(await readFile(join(dir, f), 'utf8'))) {
        if (!isSameOriginRef(u)) err('root-absolute', f, `not a root-absolute same-origin reference: ${u}`);
        else if (u.startsWith('/') && !resolves(u)) err('internal-links', f, `no file for ${u}`);
      }
    }
    const isJs = f.endsWith('.js') || f.endsWith('.mjs');
    if (f.endsWith('.css') || isJs) {
      if ((await readFile(join(dir, f), 'utf8')).includes('/releases/latest')) err('latest', f, 'contains /releases/latest');
    }
    if (isJs) {
      const js = await readFile(join(dir, f), 'utf8');
      for (const api of new Set(findNetworkApis(js))) err('js-network', f, `uses ${api}`);
      if (/https?:/i.test(js)) err('js-network', f, 'contains an http: or https: string');
      if (/["'`]\/\//.test(js)) err('js-network', f, 'contains a string starting with // (protocol-relative URL)');
    }
  }

  // Chat policy (needs the private Chat repo).
  const chatRepo = opts.chatRepo;
  if (!chatRepo) {
    warnings.push('chat-policy skipped (needs the private Chat repo)');
    skipped.set('chat-policy', 'skipped, no Chat repo');
  } else {
    const page = html.get('chat/privacy/index.html');
    if (page === undefined) skipped.set('chat-policy', 'no page yet');
    else {
      const rel = 'chat/privacy/index.html';
      try {
        const bundled = await readFile(join(chatRepo, 'Resources/Legal/PRIVACY_POLICY.md'), 'utf8');
        const want = policyLine(bundled);
        if (want === null) err('chat-policy', rel, 'could not read the Version/Effective line from Resources/Legal/PRIVACY_POLICY.md');
        else {
          if (!page.includes(want) && !visibleText(page).includes(want)) {
            err('chat-policy', rel, `page does not carry the shipped build's policy line: ${want} (page has: ${policyLine(page) ?? policyLine(visibleText(page)) ?? '<none found>'})`);
          }
          // Chat's CLAIMS (iii) reads the policy line at https://sovernity.com/privacy.html, the old address that now points here.
          const moved = html.get('privacy.html');
          if (moved === undefined) err('chat-policy', 'privacy.html', `missing: Chat's CLAIMS (iii) reads the policy line (${want}) at /privacy.html`);
          else if (!visibleText(moved).includes(want)) {
            err('chat-policy', 'privacy.html', `does not carry the shipped build's policy line: ${want} (page has: ${policyLine(visibleText(moved)) ?? '<none found>'})`);
          }
        }
        const master = await readFile(join(chatRepo, 'docs/legal/PRIVACY_POLICY.md'), 'utf8');
        const have = generatedBlockLines(page);
        if (have === null) err('chat-policy', rel, 'page is missing the BEGIN/END GENERATED PRIVACY POLICY markers');
        else {
          const missing = missingMasterLines(master, have);
          if (missing === null) err('chat-policy', rel, 'master has no "**Version 1.0-beta" line');
          else if (missing.length) {
            err('chat-policy', rel, `${missing.length} master line(s) absent from the page`);
            for (const l of missing.slice(0, 5)) err('chat-policy', rel, `MISSING: ${l.slice(0, 120)}`);
          }
        }
      } catch (e) {
        err('chat-policy', rel, `cannot read the Chat repo files: ${(e as Error).message}`);
      }
    }
  }

  const ok: string[] = [];
  for (const rule of RULES) {
    const failed = errors.some((e) => e.startsWith(`${rule}:`)) || warnings.some((w) => w.startsWith(`${rule}:`));
    if (failed) continue;
    const note = skipped.get(rule);
    if (rule === 'chat-policy' && note === 'skipped, no Chat repo') continue;
    ok.push(note ? `ok ${rule} (${note})` : `ok ${rule}`);
  }
  return { errors, warnings, ok };
}
