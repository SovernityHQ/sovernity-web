// Screenshot matrix and page assertions: builds, serves _site/ through serve.ts, and drives
// headless Chrome over the DevTools protocol (Node's built-in WebSocket).
// Usage: npm run shoot -- [--only /ursa/] [--out .shots]
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { startServer } from './serve.ts';
import { contrastRatio, parseRgb, composite, isLargeText, matrix, pageSlug, shotName, type Shot, type Rgb } from './shoot-lib.ts';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HEIGHT = 900;
const TILE = 1800;
const NOT_FOUND_URL = '/ursa/nope/';

// ---------- CDP ----------

type Msg = { id?: number; method?: string; params?: any; result?: any; error?: { message: string }; sessionId?: string };

class Cdp {
  private ws: WebSocket;
  private next = 1;
  private pending = new Map<number, { ok: (v: any) => void; fail: (e: Error) => void; method: string }>();
  private listeners = new Set<(m: Msg) => void>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data)) as Msg;
      if (m.id !== undefined) {
        const p = this.pending.get(m.id);
        if (!p) return;
        this.pending.delete(m.id);
        if (m.error) p.fail(new Error(`${p.method}: ${m.error.message}`)); else p.ok(m.result);
      } else {
        for (const l of this.listeners) l(m);
      }
    });
  }

  static open(url: string): Promise<Cdp> {
    return new Promise((ok, fail) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => ok(new Cdp(ws)), { once: true });
      ws.addEventListener('error', () => fail(new Error(`cannot connect to ${url}`)), { once: true });
    });
  }

  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = this.next++;
    return new Promise((ok, fail) => {
      this.pending.set(id, { ok, fail, method });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(fn: (m: Msg) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close(): void { this.ws.close(); }
}

async function launchChrome(): Promise<{ cdp: Cdp; stop(): Promise<void> }> {
  const profile = await mkdtemp(join(tmpdir(), 'sovernity-shoot-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank',
  ], { stdio: 'ignore' });
  let line = '';
  for (let i = 0; i < 150 && !line; i++) {
    line = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
    if (!line) await sleep(100);
  }
  if (!line) { proc.kill(); throw new Error('Chrome did not write DevToolsActivePort'); }
  const [port, path] = line.trim().split('\n');
  const cdp = await Cdp.open(`ws://127.0.0.1:${port}${path}`);
  return {
    cdp,
    async stop() {
      await cdp.send('Browser.close').catch(() => {});
      cdp.close();
      await Promise.race([new Promise((ok) => proc.once('exit', ok)), sleep(5000)]);
      if (proc.exitCode === null) proc.kill('SIGKILL');
      await rm(profile, { recursive: true, force: true });
    },
  };
}

// ---------- in-page probes (run with Runtime.evaluate; must be self-contained) ----------

type TextSample = { what: string; color: string; layers: string[]; image: boolean; px: number; weight: number };

function probe(): object {
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
    for (let a: Element | null = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage !== 'none') image = true;
      const bg = s.backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') layers.push(bg);
      if (/^rgb\(/.test(bg)) break;
    }
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
    textEls.push({ what: `${el.tagName.toLowerCase()}${cls} "${text}"`, color: cs.color, layers, image, px: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) });
  }
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    running: document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
      const t = (a.effect as KeyframeEffect | null)?.target;
      return `${(a as CSSAnimation).animationName ?? a.constructor.name} on ${t ? t.tagName.toLowerCase() + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : '') : '?'}`;
    }),
    closedDetails: Array.from(document.querySelectorAll('details')).filter((d) => !d.open).length,
    hiddenNavLinks: Array.from(document.querySelectorAll('nav a')).filter((a) => {
      const r = a.getBoundingClientRect(); return r.width === 0 || r.height === 0;
    }).map((a) => a.getAttribute('href')),
    textEls,
  };
}

type Probe = { scrollWidth: number; innerWidth: number; running: string[]; closedDetails: number; hiddenNavLinks: string[]; textEls: TextSample[] };

// ---------- one shot ----------

type Result = { shot: Shot; dir: string; failures: string[]; warnings: string[]; tiles: number };

async function shoot(cdp: Cdp, base: string, shot: Shot, outDir: string): Promise<Result> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const dir = join(outDir, pageSlug(shot.page), shotName(shot));
  await mkdir(dir, { recursive: true });

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method: string, params: object = {}) => cdp.send(method, params, sessionId);

  const origin = new URL(base).origin;
  const statuses = new Map<string, number>();
  let docStatus: number | undefined;
  let loaded!: () => void;
  const loadFired = new Promise<void>((ok) => { loaded = ok; });
  const off = cdp.on((m) => {
    if (m.sessionId !== sessionId) return;
    const p = m.params;
    switch (m.method) {
      case 'Network.requestWillBeSent': {
        const u = String(p.request.url);
        if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== origin) failures.push(`external request: ${u}`);
        break;
      }
      case 'Network.responseReceived':
        statuses.set(p.response.url, p.response.status);
        if (p.type === 'Document' && docStatus === undefined) docStatus = p.response.status;
        break;
      case 'Runtime.consoleAPICalled':
        if (p.type === 'error') failures.push(`console error: ${p.args.map((a: any) => a.value ?? a.description ?? '').join(' ')}`);
        break;
      case 'Runtime.exceptionThrown':
        failures.push(`exception: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`);
        break;
      case 'Page.loadEventFired':
        loaded();
        break;
    }
  });

  try {
    await Promise.all([s('Page.enable'), s('Network.enable'), s('Runtime.enable')]);
    await s('Emulation.setDeviceMetricsOverride', { width: shot.width, height: HEIGHT, deviceScaleFactor: 1, mobile: shot.width === 390 });
    await s('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-color-scheme', value: shot.theme },
      { name: 'prefers-reduced-motion', value: shot.motion === 'reduce' ? 'reduce' : 'no-preference' },
    ] });
    if (!shot.js) await s('Emulation.setScriptExecutionDisabled', { value: true });
    if (shot.stored) {
      await s('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('sovernity-theme','${shot.stored}')}catch(e){}` });
    }
    const nav = await s('Page.navigate', { url: base + shot.page });
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

    const pr: Probe = await evaluate(`(${probe.toString()})()`);
    if (pr.scrollWidth > pr.innerWidth) failures.push(`horizontal overflow: scrollWidth ${pr.scrollWidth} > innerWidth ${pr.innerWidth}`);
    if (pr.innerWidth !== shot.width) failures.push(`viewport is ${pr.innerWidth} px, expected ${shot.width}`);
    if (shot.motion === 'reduce' && pr.running.length) failures.push(`reduced motion but ${pr.running.length} running animation(s): ${pr.running.join(', ')}`);
    if (!shot.js) {
      if (pr.closedDetails) failures.push(`JS off: ${pr.closedDetails} <details> closed`);
      if (pr.hiddenNavLinks.length) failures.push(`JS off: nav links not visible: ${pr.hiddenNavLinks.join(', ')}`);
    }
    for (const t of pr.textEls) {
      try {
        const opaque = t.layers.length && parseRgb(t.layers[t.layers.length - 1]!)[3] === 1;
        let bg: Rgb = opaque ? parseRgb(t.layers[t.layers.length - 1]!).slice(0, 3) as Rgb : [255, 255, 255];
        for (let i = t.layers.length - (opaque ? 2 : 1); i >= 0; i--) bg = composite(parseRgb(t.layers[i]!), bg);
        const fg = composite(parseRgb(t.color), bg);
        const ratio = contrastRatio(fg, bg);
        const need = isLargeText(t.px, t.weight) ? 3 : 4.5;
        const line = `contrast ${ratio.toFixed(2)} < ${need} (${t.color} on rgb(${bg.map(Math.round).join(', ')}), ${t.px}px/${t.weight}): ${t.what}`;
        if (!opaque) warnings.push(`no opaque background found, assumed white: ${t.what}`);
        if (ratio < need) (t.image ? warnings : failures).push(t.image ? `${line} [background-image in the way, unverified]` : line);
      } catch (e) {
        warnings.push(`contrast skipped: ${(e as Error).message}: ${t.what}`);
      }
    }
    if (shot.page === NOT_FOUND_URL) {
      if (docStatus !== 404) failures.push(`404 page: status ${docStatus}, expected 404`);
      if (statuses.get(`${origin}/assets/css/tokens.css`) !== 200) failures.push('404 page: /assets/css/tokens.css did not load');
    }

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
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const site = join(root, '_site');
  const outDir = resolve(root, arg('--out')[0] ?? '.shots');

  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  const only = arg('--only');
  const pages = only.length ? only : await discoverPages(site);
  const shots = matrix(pages);
  for (const page of pages.filter((p) => p === '/' || p === '/ursa/')) {
    shots.push({ page, theme: 'dark', width: 1440, js: true, motion: 'full', stored: 'light' });
    shots.push({ page, theme: 'light', width: 1440, js: true, motion: 'full', stored: 'dark' });
  }

  await rm(outDir, { recursive: true, force: true });
  const server = await startServer(site, 0);
  const chrome = await launchChrome();
  const results: Result[] = [];
  try {
    for (const [i, shot] of shots.entries()) {
      const r = await shoot(chrome.cdp, server.url, shot, outDir);
      results.push(r);
      console.log(`${String(i + 1).padStart(3)}/${shots.length} ${r.failures.length ? 'FAIL' : 'ok  '} ${shot.page} ${shotName(shot)}`);
    }
  } finally {
    await chrome.stop();
    await server.close();
  }

  const failed = results.filter((r) => r.failures.length);
  const lines = [
    '# Shot report', '',
    `${results.length} shot(s), ${failed.length} with failures, ${results.reduce((n, r) => n + r.warnings.length, 0)} warning(s).`, '',
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
  console.log(`\n${failed.length ? `shoot failed: ${failed.length} shot(s) with failures` : 'shoot passed'}; report at ${relative(root, join(outDir, 'report.md'))}`);
  process.exit(failed.length ? 1 : 0);
}
