// Local static server for _site/ that behaves like GitHub Pages:
// `/x` → 301 `/x/` when x/index.html exists, `/x/` → x/index.html, unknown → 404.html with status 404.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function isFile(p: string): Promise<boolean> {
  return stat(p).then((s) => s.isFile(), () => false);
}

export async function startServer(dir: string, port: number): Promise<{ url: string; close(): Promise<void> }> {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    const send = async (status: number, file: string) => {
      const body = await readFile(file);
      res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      const file = resolve(root, '.' + path);
      if (file === root || file.startsWith(root + sep)) {
        if (path.endsWith('/')) {
          if (await isFile(join(file, 'index.html'))) return await send(200, join(file, 'index.html'));
        } else if (await isFile(file)) {
          return await send(200, file);
        } else if (await isFile(join(file, 'index.html'))) {
          res.writeHead(301, { location: path + '/' });
          return res.end();
        }
      }
      if (await isFile(join(root, '404.html'))) return await send(404, join(root, '404.html'));
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } catch {
      res.writeHead(400);
      res.end();
    }
  });
  await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', ok); });
  const { port: bound } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${bound}`,
    close: () => new Promise<void>((ok) => { server.closeAllConnections(); server.close(() => ok()); }),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = join(dirname(fileURLToPath(import.meta.url)), '..', '_site');
  const { url } = await startServer(site, Number(process.env.PORT ?? 8080));
  console.log(`serving _site/ at ${url}/`);
}
