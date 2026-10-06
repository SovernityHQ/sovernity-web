import { readdir, readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const INCLUDE = /<!-- include:([a-z0-9-]+) -->/g;

export function expandIncludes(html: string, partials: Map<string, string>): string {
  return html.replace(INCLUDE, (_m, name: string) => {
    const body = partials.get(name);
    if (body === undefined) throw new Error(`unknown partial "${name}"`);
    if (INCLUDE.test(body)) { INCLUDE.lastIndex = 0; throw new Error(`nested include in partial "${name}"`); }
    INCLUDE.lastIndex = 0;
    return body.replace(/\n$/, '');
  });
}

export function markCurrent(html: string, pagePath: string): string {
  return html.replace(/<a href="([^"]+)" data-current="(exact|section)"/g, (_m, href: string, mode: string) => {
    const hit = mode === 'exact' ? href === pagePath : href === '/' ? pagePath === '/' : pagePath.startsWith(href);
    return hit ? `<a href="${href}" aria-current="page"` : `<a href="${href}"`;
  });
}

function pageUrl(rel: string): string {
  const posix = rel.split(sep).join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) return '/' + posix.slice(0, -'index.html'.length);
  return '/' + posix;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue; // .gitkeep, .DS_Store
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

export async function buildSite(srcDir: string, outDir: string): Promise<string[]> {
  const partialDir = join(srcDir, '_partials');
  const partials = new Map<string, string>();
  for (const f of await readdir(partialDir).catch(() => [] as string[])) {
    if (f.endsWith('.html')) partials.set(f.slice(0, -5), await readFile(join(partialDir, f), 'utf8'));
  }
  await rm(outDir, { recursive: true, force: true });
  const pages: string[] = [];
  for (const file of (await walk(srcDir)).sort()) {
    const rel = relative(srcDir, file);
    if (rel.split(sep)[0] === '_partials') continue;
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    if (rel.endsWith('.html')) {
      const html = markCurrent(expandIncludes(await readFile(file, 'utf8'), partials), pageUrl(rel));
      await writeFile(dest, html);
      pages.push(rel.split(sep).join('/'));
    } else {
      await copyFile(file, dest);
    }
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pages = await buildSite(join(root, 'site'), join(root, '_site'));
  console.log(`built ${pages.length} page(s) into _site/`);
}
