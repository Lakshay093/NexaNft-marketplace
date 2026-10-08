import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, cp, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const inputs = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const separator = argument.indexOf('=');
    if (separator < 1)
      throw new Error('Use --api=HTTPS_URL [--web=HTTPS_URL] [--android=HTTPS_URL]');
    return [argument.slice(0, separator), argument.slice(separator + 1)];
  }),
);
function publicURL(name, required = true) {
  const value = inputs[name];
  if (!value && !required) return undefined;
  if (!value) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
    throw new Error(`${name} must be a public HTTPS URL without credentials or query parameters`);
  return url.toString().replace(/\/$/, '');
}
const api = publicURL('--api');
if (!api.endsWith('/api')) throw new Error('--api must include the /api path');
const demoTransfers = inputs['--demo-transfers'] ?? 'false';
if (!['true', 'false'].includes(demoTransfers))
  throw new Error('--demo-transfers must be true or false');
const webURL = publicURL('--web', false);
const androidURL = publicURL('--android', false);
const githubURL = publicURL('--github', false);
const output = path.join(root, 'cloud-output', String(Date.now()));
const webDirectory = path.join(output, 'web');
const landingDirectory = webURL ? path.join(output, 'landing') : null;
await mkdir(webDirectory, { recursive: true });
if (landingDirectory) await mkdir(landingDirectory, { recursive: true });
const childEnv = {
  ...process.env,
  EXPO_PUBLIC_API_URL: api,
  EXPO_PUBLIC_ENABLE_DEMO_TRANSFERS: demoTransfers,
  VITE_API_URL: api,
  VITE_ANDROID_URL: androidURL ?? '',
  VITE_IOS_URL: '',
  VITE_GITHUB_URL: githubURL ?? '',
};
if (webURL) childEnv.VITE_DEMO_URL = webURL;
if (androidURL) childEnv.VITE_ANDROID_URL = androidURL;
if (githubURL) childEnv.VITE_GITHUB_URL = githubURL;
function run(file, args, cwd) {
  const result = spawnSync(process.execPath, [file, ...args], {
    cwd,
    env: childEnv,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0)
    throw new Error(`Cloud client build failed: ${path.basename(file)}`);
}
const expoCLI = path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli');
run(
  expoCLI,
  ['export', '--platform', 'web', '--clear', '--output-dir', webDirectory],
  path.join(root, 'mobile'),
);
// Metro can reuse a transform containing the API URL from an earlier local export.
// Check the emitted code before letting this directory be published.
const bundleDirectory = path.join(webDirectory, '_expo/static/js/web');
const bundles = await Promise.all(
  (await readdir(bundleDirectory))
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFile(path.join(bundleDirectory, file), 'utf8')),
);
if (!bundles.some((bundle) => bundle.includes(JSON.stringify(api))))
  throw new Error('Cloud web export does not contain the configured HTTPS API URL');
if (
  demoTransfers === 'true' &&
  !bundles.some((bundle) => /Collect (?:·|\\xb7|\\u00b7) demo transfer/.test(bundle))
)
  throw new Error('Cloud web export does not contain the enabled Collect action');
if (landingDirectory) {
  run(path.join(root, 'scripts/copy-guide.mjs'), [], root);
  const typeScriptCLI = path.join(
    path.dirname(require.resolve('typescript/package.json')),
    'bin/tsc',
  );
  run(typeScriptCLI, ['--noEmit'], path.join(root, 'landing'));
  const viteCLI = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  run(viteCLI, ['build'], path.join(root, 'landing'));
  await cp(path.join(root, 'landing/dist'), landingDirectory, { recursive: true });
}
const staticConfig = {
  framework: null,
  rewrites: [{ source: '/(.*)', destination: '/index.html' }],
};
for (const directory of [webDirectory, landingDirectory].filter(Boolean))
  await writeFile(
    path.join(directory, 'vercel.json'),
    JSON.stringify(staticConfig, null, 2) + '\n',
  );
const manifest = {
  api,
  demoTransfers: demoTransfers === 'true',
  webURL,
  androidURL,
  githubURL,
  webDirectory,
  landingDirectory,
};
await writeFile(
  path.join(root, 'cloud-output/latest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(JSON.stringify(manifest, null, 2));
