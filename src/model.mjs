// Shared by the data build, the prerender and the browser, so a figure is computed once and read the same everywhere.
export const BASE = '/energy-prices';
export const HOME = `${BASE}/`;
export const SITE = 'https://www.kadoa.com';

// The page a path shows, as the key of its data file, or null for a path the site does not have.
export function pageKey(pathname) {
  const rest = pathname.replace(/\/+$/, '').replace(/^\/energy-prices/, '').replace(/^\//, '');
  if (!rest) return 'home';
  if (/^(about|electricity|fuel)$/.test(rest)) return rest;
  if (/^fuel\/[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(rest) || /^electricity\/[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(rest)) return rest;
  return null;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateLabel = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1].slice(0, 3)} ${y}`; };
export const monthLabel = (iso) => { if (!iso) return ''; const [y, m] = iso.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
export const number = (n) => Number(n).toLocaleString('en-US');
export const money = (v, digits = 2) => (v === null || v === undefined ? '–' : `$${v.toFixed(digits)}`);
export const cents = (v) => (v === null || v === undefined ? '–' : `${v.toFixed(1)}¢`);
export const pctLabel = (v) => (v === null || v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%`);
export const pct = (now, then) => (now == null || !then ? null : (now / then - 1) * 100);
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const dataPath = (common) => common?.dataPath ?? `${BASE}/data`;

const DAY = 86400000;
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso, n) => new Date(t(iso) + n * DAY).toISOString().slice(0, 10);
export const addMonths = (iso, n) => { const d = new Date(t(iso)); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

// The point closest to `iso` within `tolerance` days, or null. A weekly series is compared with the week nearest a
// date, never with whatever point happens to exist months away across a gap (heating oil is only surveyed in winter).
export function nearest(points, iso, tolerance) {
  let best = null, gap = Infinity;
  for (const p of points) { const g = Math.abs(t(p[0]) - t(iso)) / DAY; if (g < gap) { gap = g; best = p; } }
  return gap <= tolerance ? best : null;
}

// A weekly price against the week before and the same week a year earlier, plus its 52-week range.
export function weeklySummary(points) {
  if (!points.length) return null;
  const latest = points.at(-1);
  const weekAgo = nearest(points, addDays(latest[0], -7), 3);
  const yearAgo = nearest(points, addDays(latest[0], -364), 6);
  const year = points.filter((p) => p[0] > addDays(latest[0], -365));
  const low = year.reduce((a, p) => (p[1] < a[1] ? p : a), year[0]);
  const high = year.reduce((a, p) => (p[1] > a[1] ? p : a), year[0]);
  return { date: latest[0], value: latest[1], weekAgo, yearAgo, weekChange: weekAgo ? pct(latest[1], weekAgo[1]) : null, yearChange: yearAgo ? pct(latest[1], yearAgo[1]) : null, low, high };
}

// A monthly figure against the same month a year earlier. Electricity and gas prices are seasonal (summer rates,
// winter volumes), so a month is only ever compared with the same calendar month.
export function monthlySummary(points) {
  if (!points.length) return null;
  const latest = points.at(-1);
  const yearAgo = points.find((p) => p[0] === addMonths(latest[0], -12)) ?? null;
  return { date: latest[0], value: latest[1], yearAgo, yearChange: yearAgo ? pct(latest[1], yearAgo[1]) : null };
}

// The mean of the twelve months ending `end`, or null when any of them is missing: a partial year would compare a
// winter-heavy stretch with a full one.
export function trailingMean(points, end) {
  const months = Array.from({ length: 12 }, (_, i) => addMonths(end, -i));
  const byDate = new Map(points);
  const values = months.map((m) => byDate.get(m));
  return values.every((v) => typeof v === 'number') ? values.reduce((a, v) => a + v, 0) / 12 : null;
}

// The twelve-month average price, weighted by what was sold: total revenue over total kWh, in cents. A plain mean of
// monthly prices would give a mild April the same say as a July when homes use twice the power.
export function trailingPrice(revenue, sales, end) {
  const months = Array.from({ length: 12 }, (_, i) => addMonths(end, -i));
  const rev = new Map(revenue), kwh = new Map(sales);
  let r = 0, k = 0;
  for (const m of months) { if (!rev.has(m) || !kwh.has(m)) return null; r += rev.get(m); k += kwh.get(m); }
  return k > 0 ? (r / k) * 100 : null;
}
