// Renders public/data/og-pjm-power-prices.png (1200x630), the link preview for the PJM insight, from the page's own data
// so it matches the page: the title and the states with the biggest one-year rises, PJM states in orange. Uses the
// installed Google Chrome like ogMap.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const file = join(root, 'public/data/insights/pjm-power-prices.json');
if (!existsSync(file)) { console.log('No PJM insight in this build; skipped its preview'); process.exit(0); }
const page = JSON.parse(readFileSync(file, 'utf8')), p = page.pjm;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}; set CHROME_PATH to render the PJM preview`);
// The colours of the page's bar chart (PJM_COLOURS in App.jsx).
const FILL = { pjm: '#c84c04', partial: '#eeae86', other: '#c3c6c8' };
const rows = p.rows.slice(0, 8), max = rows[0].change;
const pct = (v) => `+${v.toFixed(1)}%`;
const bars = rows.map((r) => `<div class="row"><span class="n${r.group === 'pjm' ? ' b' : ''}">${r.name}</span><span class="t"><i style="width:${(r.change / max) * 100}%;background:${FILL[r.group]}"></i><em${r.group === 'pjm' ? ' class="b"' : ''}>${pct(r.change)}</em></span></div>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;font-family:Arial,Helvetica,sans-serif;color:#0b0c0c;background:#fff;display:flex;flex-direction:column}
.bar{background:#1d70b8;color:#fff;padding:18px 48px;font-size:26px;font-weight:700;display:flex;justify-content:space-between;align-items:center}.bar span{font-weight:400;font-size:21px}
h1{font-size:40px;line-height:1.12;margin:28px 48px 8px}
.key{margin:0 48px 18px;font-size:20px;color:#505a5f}.key b{color:#c84c04}.key b.q{color:#a85a2a}
.chart{margin:0 48px;flex:1}.row{display:flex;align-items:center;height:41px}
.n{width:250px;font-size:21px;text-align:right;padding-right:16px;color:#505a5f}.b{font-weight:700;color:#0b0c0c}
.t{flex:1;position:relative;display:flex;align-items:center;padding-right:110px}.t i{display:block;height:24px}
.t em{font-style:normal;font-size:20px;margin-left:10px;white-space:nowrap}
.foot{padding:0 48px 20px;font-size:17px;color:#505a5f}
</style></head><body>
<div class="bar">⚡ US Energy Price Monitor<span>kadoa.com/energy-prices</span></div>
<h1>${page.title}</h1>
<div class="key">Change in home electricity price over a year: states <b>on the PJM grid</b> or <b class="q">partly on it</b>. US ${pct(p.us)}.</div>
<div class="chart">${bars}</div>
<div class="foot">Source: EIA, PJM. Built by Kadoa.</div></body></html>`;
const dir = mkdtempSync(join(tmpdir(), 'energy-og-'));
try {
  writeFileSync(join(dir, 'og.html'), html);
  const out = join(root, 'public/data/og-pjm-power-prices.png');
  const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630', '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--screenshot=${out}`, `file://${join(dir, 'og.html')}`], { stdio: 'pipe' });
  if (run.status !== 0 || !existsSync(out)) throw new Error(`Chrome could not render the PJM preview: ${run.stderr?.toString().slice(0, 300)}`);
  console.log('Wrote public/data/og-pjm-power-prices.png');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
