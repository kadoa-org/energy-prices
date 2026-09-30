// Renders public/data/og-electricity-map.png (1200x630), the link preview for /electricity/map, from the page's own data
// so it updates with every publish. Uses the installed Google Chrome (CHROME_PATH overrides), as the food site's
// preview does, so no browser download is needed. The layout and bins come from TileMap.jsx.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { GRID, binFor, changeBins } from '../src/TileMap.jsx';

const root = resolve(import.meta.dirname, '..');
const page = JSON.parse(readFileSync(join(root, 'public/data/electricity/map.json'), 'utf8'));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}; set CHROME_PATH to render the map preview`);
// Mirrors the .tile--b*/o* colours in styles.css.
const FILL = { 'tile--b2': ['#9ecae1', '#0b0c0c'], 'tile--b1': ['#deebf7', '#0b0c0c'], 'tile--o1': ['#fdbe85', '#0b0c0c'], 'tile--o2': ['#f16913', '#fff'], 'tile--o3': ['#a63603', '#fff'] };
const bins = changeBins(page.electricityCpi.change);
const byCode = Object.fromEntries(page.states.map((s) => [s.code, s]));
const T = 54, G = 4;
const tiles = Object.entries(GRID).filter(([c]) => byCode[c]).map(([code, [col, row]]) => {
  const s = byCode[code], [bg, ink] = FILL[binFor(bins, s.priceSince2019, Math.round).cls];
  return `<div style="position:absolute;left:${col * (T + G)}px;top:${row * (T + G)}px;width:${T}px;height:${T}px;background:${bg};color:${ink}"><b class="c">${code}</b><b class="p">+${Math.round(s.priceSince2019)}%</b></div>`;
}).join('');
const month = new Date(`${page.us.month.slice(0, 7)}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;font-family:Arial,Helvetica,sans-serif;color:#0b0c0c;background:#fff;display:flex;flex-direction:column}
.bar{background:#1d70b8;color:#fff;padding:18px 48px;font-size:26px;font-weight:700;display:flex;justify-content:space-between;align-items:center}.bar span{font-weight:400;font-size:21px}
.main{flex:1;display:flex;gap:36px;padding:34px 48px 0}
.text{width:370px}h1{font-size:42px;line-height:1.1;margin:0 0 22px}
.fig{margin:0 0 18px}.fig b{display:block;font-size:46px}.fig span{font-size:20px;color:#505a5f}
.map{position:relative;flex:1}.map div{box-sizing:border-box;padding:5px 6px}.c{display:block;font-size:12px;opacity:.85}.p{display:block;font-size:17px;margin-top:3px}
.foot{padding:0 48px 22px;font-size:17px;color:#505a5f}
</style></head><body>
<div class="bar">⚡ US Energy Price Monitor<span>kadoa.com/energy-prices</span></div>
<div class="main"><div class="text"><h1>Home electricity prices by state since 2019</h1>
<div class="fig"><b>+${Math.round(page.us.priceSince2019)}%</b><span>US average, to ${page.us.price12.toFixed(1)}¢ a kWh</span></div>
<div class="fig"><b>+${Math.round(page.electricityCpi.change)}%</b><span>all prices (inflation)</span></div></div>
<div class="map">${tiles}</div></div>
<div class="foot">12 months to ${month} against 2019. Source: EIA, BLS. Built by Kadoa.</div></body></html>`;
const dir = mkdtempSync(join(tmpdir(), 'energy-og-'));
try {
  writeFileSync(join(dir, 'og.html'), html);
  const out = join(root, 'public/data/og-electricity-map.png');
  const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630', '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--screenshot=${out}`, `file://${join(dir, 'og.html')}`], { stdio: 'pipe' });
  if (run.status !== 0 || !existsSync(out)) throw new Error(`Chrome could not render the map preview: ${run.stderr?.toString().slice(0, 300)}`);
  console.log('Wrote public/data/og-electricity-map.png');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
