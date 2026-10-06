// Screenshot matrix and page assertions: builds, serves _site/ through serve.ts, and drives
// headless Chrome over the DevTools protocol (Node's built-in WebSocket).
// Usage: npm run shoot -- [--only /ursa/]… [--out .shots]
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { startServer } from './serve.ts';
import { contrastRatio, parseRgb, composite, isLargeText, luminance, matrix, pageSlug, shotName, type Shot, type Rgb } from './shoot-lib.ts';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HEIGHT = 900;
const TILE = 1800;
const NOT_FOUND_URL = '/ursa/nope/';
const SEND_TIMEOUT = 30_000;
const SCREENSHOT_TIMEOUT = 120_000;
// Reduced motion: more than this many requestAnimationFrame callbacks in the last 2 s of the
// settle wait means the page runs a rAF loop. A few one-off measurement frames are fine.
const RAF_LIMIT = 10;
const RAF_WINDOW_MS = 2000;

// ---------- CDP ----------

type Msg = { id?: number; method?: string; params?: any; result?: any; error?: { message: string }; sessionId?: string };
type Pending = { ok: (v: any) => void; fail: (e: Error) => void; method: string; timer: ReturnType<typeof setTimeout> };

class Cdp {
  private ws: WebSocket;
  private next = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<(m: Msg) => void>();
  dead: Error | undefined;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(String(ev.data)) as Msg;
        if (m.id !== undefined) {
          const p = this.pending.get(m.id);
          if (!p) return;
          this.pending.delete(m.id);
          clearTimeout(p.timer);
          if (m.error) p.fail(new Error(`${p.method}: ${m.error.message}`)); else p.ok(m.result);
        } else {
          for (const l of this.listeners) l(m);
        }
      } catch (e) {
        this.abort(new Error(`CDP listener failed: ${(e as Error).message}`));
      }
    });
    ws.addEventListener('close', () => this.abort(new Error('CDP connection closed')));
    ws.addEventListener('error', () => this.abort(new Error('CDP connection error')));
  }

  static open(url: string): Promise<Cdp> {
    return new Promise((ok, fail) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => ok(new Cdp(ws)), { once: true });
      ws.addEventListener('error', () => fail(new Error(`cannot connect to ${url}`)), { once: true });
    });
  }

  /** Rejects every pending call and refuses new ones. */
  abort(err: Error): void {
    if (!this.dead) this.dead = err;
    for (const [id, p] of this.pending) { clearTimeout(p.timer); this.pending.delete(id); p.fail(err); }
    try { this.ws.close(); } catch { /* already closed */ }
  }

  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    if (this.dead) return Promise.reject(this.dead);
    const id = this.next++;
    const ms = method === 'Page.captureScreenshot' ? SCREENSHOT_TIMEOUT : SEND_TIMEOUT;
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => { this.pending.delete(id); fail(new Error(`${method}: no reply in ${ms / 1000} s`)); }, ms);
      this.pending.set(id, { ok, fail, method, timer });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(fn: (m: Msg) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

type Chrome = { cdp: Cdp; stop(): Promise<void> };

/** Hard stop for the `exit` handler: synchronous, so it works even when the event loop is gone. */
let chromeKill: (() => void) | undefined;

async function launchChrome(): Promise<Chrome> {
  const profile = await mkdtemp(join(tmpdir(), 'sovernity-shoot-'));
  let proc: ChildProcess | undefined;
  const kill = () => {
    if (proc && proc.exitCode === null && proc.signalCode === null) proc.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  };
  chromeKill = kill;
  try {
    let spawnError: Error | undefined;
    proc = spawn(CHROME, [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
      '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank',
    ], { stdio: 'ignore' });
    proc.on('error', (e) => { spawnError = e; });
    let line = '';
    for (let i = 0; i < 150 && !line && !spawnError && proc.exitCode === null; i++) {
      line = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
      if (!line) await sleep(100);
    }
    if (spawnError) throw new Error(`cannot start Chrome: ${spawnError.message}`);
    if (!line) throw new Error('Chrome did not write DevToolsActivePort');
    const [port, path] = line.trim().split('\n');
    const cdp = await Cdp.open(`ws://127.0.0.1:${port}${path}`);
    const p = proc;
    return {
      cdp,
      async stop() {
        if (!cdp.dead) await cdp.send('Browser.close').catch(() => {});
        cdp.abort(new Error('Chrome stopped'));
        if (p.exitCode === null && p.signalCode === null) await Promise.race([new Promise((ok) => p.once('exit', ok)), sleep(5000)]);
        kill();
        chromeKill = undefined;
      },
    };
  } catch (e) {
    kill();
    chromeKill = undefined;
    throw e;
  }
}

// ---------- in-page code (must be self-contained: it is sent as source) ----------

function rafCounter(): void {
  const raf = window.requestAnimationFrame.bind(window);
  const times: number[] = [];
  (window as any).__shootRaf = times;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => raf((t) => { times.push(performance.now()); cb(t); });
}

type TextSample = { what: string; color: string; opacity: number; layers: string[]; image: boolean; px: number; weight: number };

function probe(rafWindow: number): object {
  const textEls: TextSample[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (el.closest('svg, script, style, noscript, template')) continue;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
    if (!own) continue;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (cs.visibility !== 'visible' || box.width <= 1 || box.height <= 1) continue;
    const layers: string[] = [];
    let image = false;
    let opacity = 1;
    for (let a: Element | null = el; a; a = a.parentElement) opacity *= Number(getComputedStyle(a).opacity);
    if (opacity === 0) continue;
    for (let a: Element | null = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage !== 'none') image = true;
      const bg = s.backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') layers.push(bg);
      if (/^rgb\(/.test(bg)) break;
    }
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
    textEls.push({ what: `${el.tagName.toLowerCase()}${cls} "${text}"`, color: cs.color, opacity, layers, image, px: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) });
  }
  const body = getComputedStyle(document.body).backgroundColor;
  const raf = (window as any).__shootRaf as number[] | undefined;
  const now = performance.now();
  const menu = document.querySelector('.menu-btn');
  const menuBox = menu ? menu.getBoundingClientRect() : null;
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    running: document.getAnimations().filter((a) => a.playState === 'running').length,
    rafRecent: raf ? raf.filter((t) => t > now - rafWindow).length : null,
    closedDetails: Array.from(document.querySelectorAll('details')).filter((d) => !d.open).length,
    hiddenNavLinks: Array.from(document.querySelectorAll('nav a')).filter((a) => {
      const r = a.getBoundingClientRect();
      return r.width === 0 || r.height === 0 || !a.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    }).map((a) => a.getAttribute('href')),
    menuShown: menuBox ? menuBox.width > 0 || menuBox.height > 0 : false,
    dataTheme: document.documentElement.dataset.theme ?? null,
    pageBg: body === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.documentElement).backgroundColor : body,
    textEls,
  };
}

type Probe = {
  scrollWidth: number; innerWidth: number; running: number; rafRecent: number | null; closedDetails: number;
  hiddenNavLinks: string[]; menuShown: boolean; dataTheme: string | null; pageBg: string; textEls: TextSample[];
};

// ---------- one shot ----------

type Result = { shot: Shot; dir: string; failures: string[]; warnings: string[]; tiles: number };

async function shoot(cdp: Cdp, base: string, shot: Shot, outDir: string): Promise<Result> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const dir = join(outDir, pageSlug(shot.page), shotName(shot));
  await mkdir(dir, { recursive: true });
  const reduce = shot.motion === 'reduce';
  const is404 = shot.page === NOT_FOUND_URL;
  const pageUrl = base + shot.page;

  // A fresh browser context per shot: no localStorage, cache or cookies carried over.
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  let targetId: string | undefined;
  const origin = new URL(base).origin;
  const statuses = new Map<string, number>();
  const animations: string[] = [];
  let docStatus: number | undefined;
  let loaded!: () => void;
  const loadFired = new Promise<void>((ok) => { loaded = ok; });
  let sessionId: string | undefined;
  const off = cdp.on((m) => {
    if (!sessionId || m.sessionId !== sessionId) return;
    const p = m.params;
    switch (m.method) {
      case 'Network.requestWillBeSent': {
        const u = String(p.request.url);
        if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== origin) failures.push(`external request: ${u}`);
        break;
      }
      case 'Network.responseReceived':
        statuses.set(p.response.url, p.response.status);
        if (p.type === 'Document') { if (docStatus === undefined) docStatus = p.response.status; }
        else if (p.response.status >= 400) failures.push(`failed resource: ${p.response.status} ${p.response.url}`);
        break;
      case 'Runtime.consoleAPICalled':
        if (p.type === 'error' || p.type === 'assert') failures.push(`console ${p.type}: ${p.args.map((a: any) => a.value ?? a.description ?? '').join(' ')}`);
        break;
      case 'Runtime.exceptionThrown':
        failures.push(`exception: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`);
        break;
      case 'Log.entryAdded': {
        const e = p.entry;
        // The 404 page's own document response is expected to be a 404.
        if (e.level === 'error' && !(is404 && e.source === 'network' && e.url === pageUrl)) failures.push(`log error (${e.source}): ${e.text}${e.url ? ` ${e.url}` : ''}`);
        break;
      }
      case 'Animation.animationStarted':
        if (reduce) animations.push(`${p.animation.type} ${p.animation.name || '(unnamed)'}`);
        break;
      case 'Page.loadEventFired':
        loaded();
        break;
    }
  });

  try {
    ({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId }));
    ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }));
    const s = (method: string, params: object = {}) => cdp.send(method, params, sessionId);

    await Promise.all([s('Page.enable'), s('Network.enable'), s('Runtime.enable'), s('Log.enable')]);
    if (reduce) {
      await s('Animation.enable');
      await s('Page.addScriptToEvaluateOnNewDocument', { source: `(${rafCounter.toString()})()` });
    }
    await s('Emulation.setDeviceMetricsOverride', { width: shot.width, height: HEIGHT, deviceScaleFactor: 1, mobile: shot.width === 390 });
    await s('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-color-scheme', value: shot.theme },
      { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' },
    ] });
    if (!shot.js) await s('Emulation.setScriptExecutionDisabled', { value: true });
    if (shot.stored) {
      await s('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('sovernity-theme','${shot.stored}')}catch(e){}` });
    }
    const nav = await s('Page.navigate', { url: pageUrl });
    if (nav.errorText) throw new Error(`navigate: ${nav.errorText}`);
    await Promise.race([loadFired, sleep(15000).then(() => { throw new Error('load event timed out'); })]);

    const evaluate = async (expression: string, awaitPromise = false) => {
      const r = await s('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    };
    await Promise.race([evaluate('document.fonts.ready.then(() => true)', true), sleep(5000)]);
    const height: number = await evaluate('document.documentElement.scrollHeight');
    for (let y = 0; y < height; y += 600) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(60); }
    for (let y = height; y > 0; y -= 600) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(30); }
    await evaluate('window.scrollTo(0, 0)');
    await sleep(2500);

    const pr: Probe = await evaluate(`(${probe.toString()})(${RAF_WINDOW_MS})`);
    if (docStatus !== (is404 ? 404 : 200)) failures.push(`document status ${docStatus}, expected ${is404 ? 404 : 200}`);
    if (pr.scrollWidth > pr.innerWidth) failures.push(`horizontal overflow: scrollWidth ${pr.scrollWidth} > innerWidth ${pr.innerWidth}`);
    if (pr.innerWidth !== shot.width) failures.push(`viewport is ${pr.innerWidth} px, expected ${shot.width}`);
    if (reduce) {
      if (animations.length) failures.push(`reduced motion but ${animations.length} animation(s) started: ${[...new Set(animations)].join(', ')}`);
      if (pr.running) failures.push(`reduced motion but ${pr.running} animation(s) running at the end`);
      if (pr.rafRecent === null) failures.push('reduced motion: rAF counter missing');
      else if (pr.rafRecent > RAF_LIMIT) failures.push(`reduced motion but ${pr.rafRecent} requestAnimationFrame callbacks in the last ${RAF_WINDOW_MS / 1000} s (limit ${RAF_LIMIT})`);
    }
    if (!shot.js) {
      if (pr.closedDetails) failures.push(`JS off: ${pr.closedDetails} <details> closed`);
      if (pr.hiddenNavLinks.length) failures.push(`JS off: nav links not visible: ${pr.hiddenNavLinks.join(', ')}`);
      if (pr.menuShown) failures.push('JS off: .menu-btn is showing');
    }
    if (shot.stored) {
      if (pr.dataTheme !== shot.stored) failures.push(`stored ${shot.stored}: html[data-theme] is ${pr.dataTheme}`);
      try {
        const l = luminance(parseRgb(pr.pageBg).slice(0, 3) as Rgb);
        if (shot.stored === 'dark' ? l >= 0.2 : l <= 0.5) failures.push(`stored ${shot.stored}: page background ${pr.pageBg} (luminance ${l.toFixed(2)}) is not ${shot.stored}`);
      } catch (e) {
        failures.push(`stored ${shot.stored}: ${(e as Error).message}`);
      }
    }
    for (const t of pr.textEls) {
      try {
        const opaque = t.layers.length && parseRgb(t.layers[t.layers.length - 1]!)[3] === 1;
        let bg: Rgb = opaque ? parseRgb(t.layers[t.layers.length - 1]!).slice(0, 3) as Rgb : [255, 255, 255];
        for (let i = t.layers.length - (opaque ? 2 : 1); i >= 0; i--) bg = composite(parseRgb(t.layers[i]!), bg);
        const [r, g, b, a] = parseRgb(t.color);
        const fg = composite([r, g, b, a * t.opacity], bg);
        const ratio = contrastRatio(fg, bg);
        const need = isLargeText(t.px, t.weight) ? 3 : 4.5;
        const line = `contrast ${ratio.toFixed(2)} < ${need} (${t.color}${t.opacity < 1 ? ` at opacity ${t.opacity.toFixed(2)}` : ''} on rgb(${bg.map(Math.round).join(', ')}), ${t.px}px/${t.weight}): ${t.what}`;
        if (!opaque) warnings.push(`no opaque background found, assumed white: ${t.what}`);
        if (ratio < need) (t.image ? warnings : failures).push(t.image ? `${line} [background-image in the way, unverified]` : line);
      } catch (e) {
        warnings.push(`contrast skipped: ${(e as Error).message}: ${t.what}`);
      }
    }
    if (is404 && statuses.get(`${origin}/assets/css/tokens.css`) !== 200) failures.push('404 page: /assets/css/tokens.css did not load');

    const metrics = await s('Page.getLayoutMetrics');
    const full = Math.ceil(metrics.cssContentSize.height);
    const capture = async (y: number, h: number, file: string) => {
      const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: shot.width, height: h, scale: 1 } });
      await writeFile(join(dir, file), Buffer.from(data, 'base64'));
    };
    await capture(0, full, 'full.png');
    let tiles = 0;
    for (let y = 0; y < full; y += TILE) await capture(y, Math.min(TILE, full - y), `tile-${String(++tiles).padStart(2, '0')}.png`);
    return { shot, dir, failures, warnings, tiles };
  } catch (e) {
    failures.push(`shot aborted: ${(e as Error).message}`);
    return { shot, dir, failures, warnings, tiles: 0 };
  } finally {
    off();
    if (targetId) await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }
}

// ---------- CLI ----------

async function discoverPages(site: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '_partials') await walk(p); }
      else if (e.name.endsWith('.html')) out.push(relative(site, p).split(sep).join('/'));
    }
  };
  await walk(site);
  return out.sort().map((rel) =>
    rel === '404.html' ? NOT_FOUND_URL
      : rel === 'index.html' ? '/'
      : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length)
      : '/' + rel);
}

function arg(name: string): string[] {
  const out: string[] = [];
  const argv = process.argv.slice(2);
  argv.forEach((a, i) => {
    if (a === name) {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) { console.error(`${name} needs a value`); process.exit(2); }
      out.push(v);
    }
  });
  return out;
}

/** The output folder is wiped, so it must sit strictly inside the repo and outside its source folders. */
function safeOutDir(root: string, out: string): string {
  const dir = resolve(root, out);
  const rel = relative(root, dir);
  const top = rel.split(sep)[0];
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || ['site', 'src', 'scripts', 'templates', '_site', 'node_modules', '.git', '.github'].includes(top!)) {
    console.error(`refusing --out ${out}: it must be a folder inside the repo, outside site/, src/, scripts/ and the other repo folders`);
    process.exit(2);
  }
  return dir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const site = join(root, '_site');
  const outDir = safeOutDir(root, arg('--out')[0] ?? '.shots');

  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  const only = arg('--only');
  const pages = only.length ? only : await discoverPages(site);
  const shots = matrix(pages);
  for (const page of pages.filter((p) => p === '/' || p === '/ursa/')) {
    shots.push({ page, theme: 'dark', width: 1440, js: true, motion: 'full', stored: 'light' });
    shots.push({ page, theme: 'light', width: 1440, js: true, motion: 'full', stored: 'dark' });
  }

  const results: Result[] = [];
  let fatal: string | undefined;
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  let chrome: Chrome | undefined;
  let cleaning: Promise<void> | undefined;
  const cleanup = () => cleaning ??= (async () => {
    await chrome?.stop().catch(() => chromeKill?.());
    await server?.close().catch(() => {});
  })();

  const writeReport = async () => {
    const failed = results.filter((r) => r.failures.length);
    const lines = [
      '# Shot report', '',
      ...(fatal ? [`**Run aborted:** ${fatal}`, ''] : []),
      `${results.length} of ${shots.length} shot(s) taken, ${failed.length} with failures, ${results.reduce((n, r) => n + r.warnings.length, 0)} warning(s).`, '',
      '| page | shot | tiles | result |', '| --- | --- | --- | --- |',
      ...results.map((r) => `| ${r.shot.page} | ${shotName(r.shot)} | ${r.tiles} | ${r.failures.length ? `FAIL (${r.failures.length})` : 'ok'} |`),
    ];
    for (const r of results.filter((x) => x.failures.length || x.warnings.length)) {
      lines.push('', `## ${r.shot.page} ${shotName(r.shot)}`, '', `\`${relative(root, r.dir)}\``, '');
      for (const f of r.failures) lines.push(`- FAIL ${f}`);
      for (const w of r.warnings) lines.push(`- warn ${w}`);
    }
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'report.md'), lines.join('\n') + '\n');
    const bad = failed.length || fatal;
    console.log(`\n${bad ? `shoot failed: ${failed.length} shot(s) with failures${fatal ? `; aborted: ${fatal}` : ''}` : 'shoot passed'}; report at ${relative(root, join(outDir, 'report.md'))}`);
    return bad ? 1 : 0;
  };

  process.on('exit', () => chromeKill?.());
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143]] as const) {
    process.once(sig, () => {
      fatal = `interrupted by ${sig}`;
      void cleanup().then(writeReport).finally(() => process.exit(code));
    });
  }

  try {
    await rm(outDir, { recursive: true, force: true });
    server = await startServer(site, 0);
    chrome = await launchChrome();
    for (const [i, shot] of shots.entries()) {
      if (chrome.cdp.dead) { fatal = chrome.cdp.dead.message; break; }
      const r = await shoot(chrome.cdp, server.url, shot, outDir);
      results.push(r);
      console.log(`${String(i + 1).padStart(3)}/${shots.length} ${r.failures.length ? 'FAIL' : 'ok  '} ${shot.page} ${shotName(shot)}`);
    }
  } catch (e) {
    fatal = (e as Error).message;
  } finally {
    await cleanup();
  }
  process.exit(await writeReport());
}
