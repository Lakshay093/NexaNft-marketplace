import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../mobile/dist');
const port = Number(process.env.MOBILE_PREVIEW_PORT ?? 8081);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    let target = file;
    try {
      if (!(await stat(target)).isFile()) target = path.join(root, 'index.html');
    } catch {
      target = path.join(root, 'index.html');
    }
    const bytes = await readFile(target);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream',
    });
    res.end(bytes);
  } catch {
    res.writeHead(500);
    res.end('Export the mobile web app before starting this preview.');
  }
}).listen(port, '127.0.0.1', () => console.info(`Mobile export preview: http://localhost:${port}`));
