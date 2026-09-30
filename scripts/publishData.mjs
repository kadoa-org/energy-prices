// Uploads public/data to BunnyCDN under a versioned run folder, then moves the latest pointer. A run folder never
// changes once published, so an edge can never serve a mix of old and new pages; only the tiny pointer changes in place.
// Optional: calls a Vercel deploy hook so the site re-prerenders from the new data.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
// Credentials live beside the dataset pipeline, outside this repository (ENERGY_DATASET_DIR, a local .env works).
const dataset = process.env.ENERGY_DATASET_DIR;
for (const file of dataset ? [join(dataset, '.env'), join(dataset, '..', '.env')] : []) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) { const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
}
const KEY = process.env.BUNNY_STORAGE_KEY || process.env.BUNNY_API_KEY;
const HOST = process.env.BUNNY_STORAGE_HOST || 'ny.storage.bunnycdn.com';
const ZONE = process.env.BUNNY_STORAGE_ZONE || 'kadoa-datasets';
const CDN = process.env.BUNNY_CDN_BASE || 'https://kadoa-datasets.b-cdn.net';
const PREFIX = 'energy-prices';
const KEEP_RUNS = 7;
const CONCURRENCY = Number(process.env.PUBLISH_CONCURRENCY || 32);
const dryRun = process.argv.includes('--dry-run');
if (!KEY) throw new Error('BUNNY_STORAGE_KEY or BUNNY_API_KEY is required');

// Upload from a snapshot so a data rebuild during the upload cannot delete files underneath it.
const snapshot = mkdtempSync(join(tmpdir(), 'energy-prices-publish-'));
const copy = spawnSync('cp', [process.platform === 'darwin' ? '-Rc' : '-R', join(root, 'public/data'), join(snapshot, 'data')], { stdio: 'inherit' });
if (copy.status !== 0) throw new Error('Could not snapshot public/data');
process.on('exit', () => rmSync(snapshot, { recursive: true, force: true }));
const dataDir = join(snapshot, 'data');
const homeBody = await readFile(join(dataDir, 'home.json'));
const home = JSON.parse(homeBody);
// The id carries the export time, so a retry with the same data resumes into the same folder, and a hash of home.json,
// so a rebuild that changes the pages lands in a fresh folder instead of behind a stale cache.
const sha256 = (body) => createHash('sha256').update(body).digest('hex');
const runId = `${home.common.generatedAt.slice(0, 19).replaceAll(':', '-')}-${sha256(homeBody).slice(0, 8)}`;
const base = `${PREFIX}/data/${runId}`;
const types = { '.json': 'application/json', '.csv': 'text/csv', '.gz': 'application/gzip', '.png': 'image/png' };
const storageUrl = (path) => `https://${HOST}/${ZONE}/${path}`;
const headers = { AccessKey: KEY };

async function* walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const p = join(dir, entry.name); if (entry.isDirectory()) yield* walk(p); else if (!entry.name.startsWith('.')) yield p; } }
const sizeOf = (body) => (typeof body === 'string' ? Buffer.byteLength(body) : (body?.byteLength ?? 0));
// A PUT is retried on an HTTP failure and on a dropped connection alike; both are transient at this volume of requests.
async function put(path, body, contentType, hash) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let reason;
    try {
      const res = await fetch(storageUrl(path), { method: 'PUT', headers: { ...headers, 'Content-Type': contentType, Checksum: hash.toUpperCase() }, body, signal: AbortSignal.timeout(30_000 + sizeOf(body) / 50) });
      if (res.ok) return;
      reason = `HTTP ${res.status}`;
    } catch (error) { reason = error.code ?? error.name; }
    if (attempt === 4) throw new Error(`PUT ${path} failed: ${reason}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}

const uploads = [];
for await (const local of walk(dataDir)) {
  const rel = relative(dataDir, local);
  const body = await readFile(local);
  uploads.push({ local, remote: `${base}/${rel}`, hash: sha256(body), size: body.length, type: types[rel.slice(rel.lastIndexOf('.'))] ?? 'application/octet-stream' });
}
console.log(JSON.stringify({ runId, files: uploads.length, megabytes: Math.round(uploads.reduce((n, u) => n + u.size, 0) / 1e6), target: `${CDN}/${base}/`, dryRun }));
if (dryRun) process.exit(0);

let index = 0; let done = 0; const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (index < uploads.length) {
    const u = uploads[index++];
    await put(u.remote, await readFile(u.local), u.type, u.hash);
    if (++done % 200 === 0) console.log(`  ${done}/${uploads.length} uploaded`);
  }
}));
const pointer = { runId, base: `/${base}`, generatedAt: home.common.generatedAt, lastWeek: home.common.lastWeek, lastMonth: home.common.lastMonth, publishedAt: new Date().toISOString() };
const pointerBody = JSON.stringify(pointer);
await put(`${PREFIX}/latest.json`, pointerBody, 'application/json', sha256(pointerBody));
console.log(`Uploaded ${done} files in ${Math.round((Date.now() - started) / 1000)}s; pointer ${CDN}/${PREFIX}/latest.json -> ${runId}`);

// Builds read the pointer from storage (never cached), so the storage copy is what must be right.
const check = await fetch(storageUrl(`${PREFIX}/latest.json`), { headers });
const stored = check.ok ? (await check.json()).runId : null;
if (stored !== runId) throw new Error(`Storage pointer reads ${stored}, expected ${runId}`);
console.log('Storage pointer verified');
if (process.env.BUNNY_ACCOUNT_API_KEY) {
  const purge = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(`${CDN}/${PREFIX}/latest.json`)}&async=false`, { method: 'POST', headers: { AccessKey: process.env.BUNNY_ACCOUNT_API_KEY } });
  console.log(`Purged CDN pointer copy: HTTP ${purge.status}`);
}

// Keep a week of runs so a build in flight never loses its folder; delete the rest.
const listing = await fetch(storageUrl(`${PREFIX}/data/`), { headers });
if (listing.ok) {
  const runs = (await listing.json()).filter((e) => e.IsDirectory).map((e) => e.ObjectName).sort();
  for (const old of runs.slice(0, Math.max(0, runs.length - KEEP_RUNS))) {
    const res = await fetch(storageUrl(`${PREFIX}/data/${old}/`), { method: 'DELETE', headers });
    console.log(`${res.ok ? 'Pruned' : 'Could not prune'} run ${old}`);
  }
}
if (process.env.VERCEL_DEPLOY_HOOK_URL) {
  const res = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
  console.log(`Vercel deploy hook: HTTP ${res.status}`);
} else console.log('No VERCEL_DEPLOY_HOOK_URL set; trigger a redeploy to publish the new data');
