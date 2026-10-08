import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'landing/public'), { recursive: true });
await writeFile(
  path.join(root, 'landing/public/project-guide.md'),
  await readFile(path.join(root, 'README.md'), 'utf8'),
);
