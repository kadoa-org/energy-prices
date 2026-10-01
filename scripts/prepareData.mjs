// Builds the site's data files from the energy pipeline export: one JSON file per page and gzipped CSV downloads.
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip, gzipSync } from 'node:zlib';
import { BASE, addDays, addMonths, money, monthlySummary, pct, slugify, trailingMean, trailingPrice, weeklySummary } from '../src/model.mjs';
import { utilityName } from '../src/names.mjs';

const root = resolve(import.meta.dirname, '..');
// The dataset pipeline lives outside this repository; point ENERGY_DATASET_DIR at its folder (a local .env works).
const dataset = process.env.ENERGY_DATASET_DIR;
if (!dataset) throw new Error('ENERGY_DATASET_DIR is not set; it must point at the energy dataset pipeline folder');
const pointer = JSON.parse(await readFile(join(dataset, 'exports/latest.json'), 'utf8'));
if (!/^[a-zA-Z0-9_.-]+$/.test(pointer.path)) throw new Error('Invalid export pointer');
const dir = join(dataset, 'exports', pointer.path);
const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
const defs = JSON.parse(await readFile(join(dir, 'series.json'), 'utf8'));
const byId = new Map(defs.map((d) => [d.id, d]));
const points = new Map(defs.map((d) => [d.id, []]));
let total = 0;
for await (const line of createInterface({ input: createReadStream(join(dir, manifest.files.ndjson)).pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line) continue;
  total++;
  const o = JSON.parse(line);
  const list = points.get(o.series_id);
  if (!list) throw new Error(`Observation for unknown series ${o.series_id}`);
  list.push([o.date, o.value]);
}
if (total !== manifest.rows) throw new Error(`Export row count mismatch: ${total} lines, manifest says ${manifest.rows}`);
for (const list of points.values()) list.sort((a, b) => a[0].localeCompare(b[0]));
const find = (pred) => defs.find(pred);
const series = (id) => { const p = points.get(id); if (!p?.length) throw new Error(`Series ${id} is missing or empty`); return p; };
const round = (v, d = 3) => (v === null || v === undefined ? null : Number(v.toFixed(d)));

const out = join(root, 'public/data');
await rm(out, { recursive: true, force: true });
for (const sub of ['fuel', 'electricity', 'downloads']) await mkdir(join(out, sub), { recursive: true });
const pages = [];
const page = async (key, path, body) => { pages.push({ key, path }); const file = join(out, `${key}.json`); await mkdir(dirname(file), { recursive: true }); await writeFile(file, JSON.stringify({ key, ...body, common })); };
const csv = (rows) => gzipSync(['date,series_id,area,product,measure,unit,value', ...rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v)).join(','))].join('\n') + '\n');
const csvRows = (ids) => ids.flatMap((id) => { const d = byId.get(id); return points.get(id).map(([date, v]) => [date, id, d.geoName, d.product, d.measure, d.unit, v]); });

const lastWeek = defs.filter((d) => d.frequency === 'W').map((d) => points.get(d.id).at(-1)?.[0]).filter(Boolean).sort().at(-1);
const lastMonth = series('eia-elec:PRICE.US-RES.M').at(-1)[0];
// Rate cases, collected with Kadoa from each state commission's case pages. Figures arrive already checked against
// the commission's own wording; open cases first, then the most recent decisions.
const STATUS_ORDER = { pending: 0, settled: 1, decided: 1, withdrawn: 2 };
const rateCases = JSON.parse(await readFile(join(dir, manifest.files.rateCases), 'utf8'))
  .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || String(b.decision_date ?? b.filed_date ?? '').localeCompare(String(a.decision_date ?? a.filed_date ?? '')));
// The expected decision is free text from the commission's page. Kept when it names a time ("Q3 2026", "Fall 2026",
// "mid-March 2027"), dropped when it describes something else, such as NY's "rate year ending April 30, 2027".
const ORDINAL = { first: 1, second: 2, third: 3, fourth: 4 };
const expectedDecision = (v) => {
  if (!v || /rate year/i.test(v)) return null;
  const t = v.trim().replace(/\.$/, '').replace(/^(the )?(first|second|third|fourth) quarter of (\d{4})$/i, (_, __, q, y) => `Q${ORDINAL[q.toLowerCase()]} ${y}`);
  return /\d{4}/.test(t) ? t[0].toUpperCase() + t.slice(1) : null;
};
const rateCaseRow = (c) => ({ state: c.state, caseId: c.case_id, service: c.service, utility: c.utility, status: c.status, filed: c.filed_date, decided: c.decision_date, expected: expectedDecision(c.expected_decision), requested: c.requested_revenue_musd, requestedPct: c.requested_percent, approved: c.approved_revenue_musd, billImpact: c.residential_bill_impact, url: c.case_url });
const common = { generatedAt: manifest.generatedAt, sourceRun: manifest.runId, lastWeek, lastMonth, rows: manifest.rows, series: manifest.series };

const FROM_MONTH = '2019-08-01';
// ── Fuels. One page per fuel, every area EIA surveys, the US average charted first.
const AREA_ORDER = { us: 0, padd: 1, state: 2, city: 3 };
const FUELS = [
  { slug: 'gasoline', name: 'Gasoline', seo: 'Gas', title: 'Gas prices', products: [['gasoline_regular', 'Regular'], ['gasoline_midgrade', 'Midgrade'], ['gasoline_premium', 'Premium']], measure: 'retail_price', unit: 'a gallon', description: 'Weekly average retail price at the pump, all formulations, including taxes.' },
  { slug: 'diesel', name: 'Diesel', seo: 'Diesel', title: 'Diesel prices', products: [['diesel', 'On-highway diesel']], measure: 'retail_price', unit: 'a gallon', description: 'Weekly average retail price of on-highway diesel, including taxes.' },
  { slug: 'heating-oil', name: 'Heating oil', seo: 'Heating Oil', title: 'Heating oil prices', products: [['heating_oil', 'Residential heating oil']], measure: 'residential_price', unit: 'a gallon', description: 'Weekly residential price, surveyed from October to March only.', seasonal: true },
  { slug: 'propane', name: 'Propane', seo: 'Propane', title: 'Propane prices', products: [['propane', 'Residential propane']], measure: 'residential_price', unit: 'a gallon', description: 'Weekly residential price, surveyed from October to March only.', seasonal: true },
  { slug: 'crude-oil', name: 'Crude oil', seo: 'Crude Oil', title: 'Crude oil prices', products: [['crude_wti', 'WTI, Cushing'], ['crude_brent', 'Brent, Europe']], measure: 'spot_price', unit: 'a barrel', description: 'Weekly average spot price of crude oil, the main input to what drivers pay.' },
];
// Fuel, then grade, then location. A location is its own page (/fuel/gasoline/texas) so each can answer its own
// search; the US average is the fuel page itself. Grades are a breakdown of one price, so they travel together as
// lines of one chart rather than as a filter.
const AREA_SLUG = (name) => slugify(name.replace(/\s*\(PADD [^)]*\)/, ''));
const fuelHeadlines = {};
const fuelCards = [];
const searchEntries = [];
const fuelData = [];
const dropped = [];
// State heating surveys, collected with Kadoa. Their weeks match EIA's in winter (the same state offices run EIA's
// survey), and four states keep surveying all year, region by region. Statewide figures sit beside EIA's on the state
// page; every region is listed on the US page. A region whose last survey is three weeks older than the newest is
// left out rather than shown as current.
const surveyDefs = defs.filter((d) => d.source.startsWith('state-heating-') && d.measure === 'residential_price');
const surveyLast = surveyDefs.map((d) => points.get(d.id).at(-1)?.[0]).filter(Boolean).sort().at(-1);
const surveyRows = (product) => surveyDefs.filter((d) => d.product === product && points.get(d.id).at(-1)?.[0] >= addDays(surveyLast, -21)).map((d) => {
  const s = weeklySummary(points.get(d.id));
  return { id: d.id, state: d.state, statewide: d.geoType === 'state', region: d.geoType === 'state' ? 'Statewide' : d.geoName.replace(/, [A-Z]{2}$/, ''), publisher: d.sourceSeries.split('/')[0], price: s.value, date: s.date, weekChange: round(s.weekChange, 2) };
}).sort((a, b) => a.state.localeCompare(b.state) || b.statewide - a.statewide || a.region.localeCompare(b.region));
const stateSurvey = (rows, code) => {
  const mine = rows.filter((r) => r.state === code); const statewide = mine.find((r) => r.statewide);
  return statewide ? { publisher: statewide.publisher, summary: weeklySummary(points.get(statewide.id)), points: points.get(statewide.id), regions: mine.filter((r) => !r.statewide) } : null;
};
for (const fuel of FUELS) {
  const byGeo = new Map();
  for (const [product, grade] of fuel.products) {
    // Fuel pages are EIA's weekly survey. The state heating surveys Kadoa collects (source state-heating-*) share the
    // product and measure but use their own regions and methods, so they stay out until they get their own view.
    for (const d of defs.filter((x) => x.source === 'eia-pet' && x.product === product && x.measure === fuel.measure)) {
      const key = `${d.geoType}:${d.geoCode}`;
      const loc = byGeo.get(key) ?? { type: d.geoType, geoCode: d.geoCode, name: d.geoName, grades: [] };
      loc.grades.push({ grade, id: d.id, summary: weeklySummary(points.get(d.id)) });
      byGeo.set(key, loc);
    }
  }
  // EIA keeps discontinued series in its bulk file (Illinois heating oil ends in 1991). An area whose last survey is two
  // years older than the US average's is not a current price and is left out.
  const usLast = [...byGeo.values()].find((l) => l.type === 'us')?.grades[0].summary.date;
  for (const [k, l] of byGeo) if (usLast && l.grades[0].summary.date < addDays(usLast, -730)) { dropped.push(`${fuel.slug}/${l.name} (last ${l.grades[0].summary.date})`); byGeo.delete(k); }
  const locations = [...byGeo.values()].sort((a, b) => AREA_ORDER[a.type] - AREA_ORDER[b.type] || a.name.localeCompare(b.name));
  const used = new Set();
  for (const l of locations) {
    if (l.type === 'us') { l.slug = null; continue; }
    // A state and a city can share a name (New York); the city then carries its type.
    let slug = AREA_SLUG(l.name);
    if (used.has(slug)) slug = `${slug}-${l.type}`;
    used.add(slug);
    l.slug = slug;
  }
  const us = locations[0];
  if (us?.type !== 'us') throw new Error(`${fuel.slug}: no US average`);
  fuelHeadlines[fuel.slug] = { ...us.grades[0].summary, id: us.grades[0].id };
  // BLS monthly averages by region, census division and metro area, for gasoline and diesel: 18 metros EIA's weekly
  // survey does not cover (Atlanta, Dallas, Phoenix and others). Monthly, so they sit in their own table.
  const blsProduct = { gasoline: 'gasoline_regular', diesel: 'diesel' }[fuel.slug];
  const BLS_ORDER = { us: 0, region: 1, division: 2, metro: 3 };
  const monthlyDefs = blsProduct ? defs.filter((d) => d.source === 'bls-ap' && d.product === blsProduct && points.get(d.id).at(-1)?.[0] === points.get(`bls-ap:APU0000${blsProduct === 'diesel' ? '74717' : '74714'}`).at(-1)[0]) : [];
  const monthly = monthlyDefs.length ? {
    month: points.get(monthlyDefs[0].id).at(-1)[0],
    rows: monthlyDefs.sort((a, b) => BLS_ORDER[a.geoType] - BLS_ORDER[b.geoType] || a.geoName.localeCompare(b.geoName)).map((d) => {
      const list = points.get(d.id); const last = list.at(-1); const yearAgo = list.find((p) => p[0] === addMonths(last[0], -12)); const base = list.find((p) => p[0] === FROM_MONTH);
      return { id: d.id, area: d.geoName, areaType: d.geoType, price: last[1], yearChange: round(pct(last[1], yearAgo?.[1]), 2), since2019: round(pct(last[1], base?.[1]), 2) };
    }),
  } : null;
  const surveys = fuel.seasonal ? surveyRows(fuel.products[0][0]) : [];
  await writeFile(join(out, `downloads/fuel-${fuel.slug}.csv.gz`), csv(csvRows([...locations.flatMap((l) => l.grades.map((g) => g.id)), ...monthlyDefs.map((d) => d.id), ...surveys.map((r) => r.id)])));
  const fuelMeta = { slug: fuel.slug, name: fuel.name, seo: fuel.seo, title: fuel.title, unit: fuel.unit, description: fuel.description, seasonal: !!fuel.seasonal, spot: fuel.measure === 'spot_price', grades: fuel.products.map(([, g]) => g) };
  const nav = locations.map((l) => ({ slug: l.slug, name: l.name, type: l.type }));
  // The matrix: every location and its latest price per grade, for the Compare areas table.
  const compare = locations.map((l) => ({ slug: l.slug, name: l.name, type: l.type, grades: Object.fromEntries(l.grades.map((g) => [g.grade, { value: g.summary.value, date: g.summary.date, weekChange: round(g.summary.weekChange, 2), yearChange: round(g.summary.yearChange, 2) }])) }));
  fuelData.push({ fuel, fuelMeta, locations, us, nav, compare, monthly, surveys });
  const spark = points.get(us.grades[0].id).filter((p) => p[0] > addDays(us.grades[0].summary.date, -365));
  fuelCards.push({ ...fuelMeta, summary: us.grades[0].summary, spark, areas: locations.length });
}
// Pump prices follow crude, so the gasoline and diesel pages carry crude's headline for a link.
const crude = fuelCards.find((c) => c.slug === 'crude-oil');
for (const { fuel, fuelMeta, locations, us, nav, compare, monthly, surveys } of fuelData) {
  const related = ['gasoline', 'diesel'].includes(fuel.slug) && crude ? { slug: crude.slug, title: crude.title, grade: crude.grades[0], summary: crude.summary, unit: crude.unit } : null;
  for (const l of locations) {
    const key = l.slug ? `fuel/${fuel.slug}/${l.slug}` : `fuel/${fuel.slug}`;
    await page(key, `${BASE}/${key}`, {
      kind: 'fuel', fuel: fuelMeta, location: { slug: l.slug, name: l.name, type: l.type },
      lines: l.grades.map((g) => ({ grade: g.grade, id: g.id, summary: g.summary, points: points.get(g.id) })),
      usSummary: us.grades[0].summary, locations: nav, compare, monthly: l.slug ? null : monthly, related,
      surveys: l.slug ? null : surveys.length ? surveys : null, survey: l.type === 'state' ? stateSurvey(surveys, l.geoCode) : null,
    });
    const v = l.grades[0].summary.value;
    searchEntries.push({ group: 'Fuels', label: l.slug ? `${fuel.title} in ${l.name}` : `${fuel.title}, US`, hint: `${l.slug ? { padd: "Region", state: "State", city: "City" }[l.type] : "US average"}${fuelMeta.grades.length > 1 ? `, ${fuelMeta.spot ? l.grades[0].grade : l.grades[0].grade.toLowerCase()}` : ""}`, right: `$${v >= 100 ? v.toFixed(0) : v.toFixed(2)}`, href: `${BASE}/${key}` });
  }
}
await page('fuel', `${BASE}/fuel`, { kind: 'fuels', cards: fuelCards });

// ── Electricity by state. Twelve-month figures lead because monthly bills swing with the weather: a July bill in Texas
// is half as much again as an April one.
const STATE_CODES = [...new Set(defs.filter((d) => d.source === 'eia-elec' && d.geoType === 'state').map((d) => d.geoCode))];
const elec = (measure, code) => find((d) => d.source === 'eia-elec' && d.measure === measure && d.geoCode === code)?.id;
const derived = (m, code) => `derived:elec-${m}-res-${code}`;
const gasId = (code) => find((d) => d.source === 'eia-ng' && d.geoCode === code)?.id;
// "Since 2019" compares the latest twelve months with calendar 2019, the first full year of the utility figures, so
// states and utilities are measured from the same base.
const baseEnd = '2019-12-01';
// EIA withholds residential sales for a state now and then (Colorado May 2026, New Mexico April to June) while still
// publishing revenue and price for the month. Price is revenue over sales, so the withheld figure is implied exactly
// by the two published ones and is filled from them; without it a whole twelve-month average would go blank.
function impliedSales(code) {
  const sales = new Map(series(elec('residential_sales', code)));
  const price = new Map(series(elec('residential_price', code)));
  for (const [date, rev] of series(elec('residential_revenue', code))) if (!sales.has(date) && price.get(date) > 0) sales.set(date, (rev * 100) / price.get(date));
  return [...sales].sort((a, b) => a[0].localeCompare(b[0]));
}
function stateFigures(code) {
  const price = series(elec('residential_price', code)), rev = series(elec('residential_revenue', code)), sales = impliedSales(code);
  const customers = new Map(series(elec('residential_customers', code)));
  const bill = series(derived('bill', code));
  const use = sales.filter(([d]) => customers.get(d) > 0).map(([d, k]) => [d, (k * 1e6) / customers.get(d)]);
  const end = price.at(-1)[0], prior = addMonths(end, -12);
  const price12 = trailingPrice(rev, sales, end), pricePrior = trailingPrice(rev, sales, prior), price2019 = trailingPrice(rev, sales, baseEnd);
  const bill12 = trailingMean(bill, end), billPrior = trailingMean(bill, prior), bill2019 = trailingMean(bill, baseEnd);
  const gas = gasId(code) ? monthlySummary(points.get(gasId(code))) : null;
  // The twelve-month average price at every month since December 2019, as the change from the 2019 average: a monthly
  // price mostly shows the weather, a rolling year shows the trend. Points are [month, percent, dollars a kWh].
  const trend = [];
  for (let m = baseEnd; m <= end; m = addMonths(m, 1)) {
    const p = trailingPrice(rev, sales, m);
    if (p != null && price2019) trend.push([m.slice(0, 7), round(pct(p, price2019), 1), round(p / 100, 4)]);
  }
  return {
    code, name: byId.get(elec('residential_price', code)).geoName, month: end,
    price: monthlySummary(price), price12: round(price12, 2), price12Change: round(pct(price12, pricePrior), 2), priceSince2019: round(pct(price12, price2019), 2),
    bill12: round(bill12, 2), bill12Change: round(pct(bill12, billPrior), 2), billSince2019: round(pct(bill12, bill2019), 2), use12: round(trailingMean(use, end), 0),
    gas, trend,
  };
}
const us = stateFigures('US');
// Inflation on the electricity figures' own basis: the 2019 average of CPI-U all items against the average of the 12
// months to the latest electricity month. BLS published no October 2025 index, so a window may hold 11 months; fewer
// than 11 means the comparison is not made rather than made on a thin base.
function cpiSinceFor(end) {
  const byMonth = new Map(series('bls-cpi:CUUR0000SA0').map(([d, v]) => [d.slice(0, 7), v]));
  const window = (last) => Array.from({ length: 12 }, (_, i) => byMonth.get(addMonths(last, -i).slice(0, 7))).filter((v) => typeof v === 'number');
  const base = window(baseEnd), latest = window(end);
  if (base.length < 11 || latest.length < 11) return null;
  const mean = (xs) => xs.reduce((a, v) => a + v, 0) / xs.length;
  return { change: round(pct(mean(latest), mean(base)), 2), months: latest.length, month: end };
}
const electricityCpi = cpiSinceFor(us.month);
// The same comparison at every month since the 2019 base, for the map's time slider: [month, percent].
const electricityCpiTrend = [];
for (let m = baseEnd; m <= us.month; m = addMonths(m, 1)) { const c = cpiSinceFor(m); if (c) electricityCpiTrend.push([m.slice(0, 7), c.change]); }
const states = STATE_CODES.filter((c) => c !== 'US').map(stateFigures).map((s) => ({ ...s, slug: slugify(s.name) })).sort((a, b) => a.name.localeCompare(b.name));
// ── Utilities (EIA-861M): the same twelve-month figures for each utility with 10,000 or more homes, per state it serves.
const utilityGroups = new Map();
for (const d of defs.filter((x) => x.source === 'eia-861m')) {
  const g = utilityGroups.get(d.geoCode) ?? { code: d.geoCode, state: d.state, raw: d.geoName, ownership: d.ownership, ids: {} };
  g.ids[d.measure] = d.id;
  utilityGroups.set(d.geoCode, g);
}
const utilitiesByState = new Map();
for (const g of utilityGroups.values()) {
  const { residential_revenue: revId, residential_sales: salesId, residential_customers: custId } = g.ids;
  if (!revId || !salesId || !custId) continue;
  const rev = points.get(revId), sales = points.get(salesId), cust = points.get(custId);
  const custAt = new Map(cust), salesAt = new Map(sales);
  const end = rev.at(-1)[0], prior = addMonths(end, -12);
  // Revenue is in thousand dollars and sales in MWh, so revenue over sales is dollars a kWh, as for the states.
  const price = rev.filter(([d]) => salesAt.get(d) > 0).map(([d, r]) => [d, round((r / salesAt.get(d)) * 100, 2)]);
  const bill = rev.filter(([d]) => custAt.get(d) > 0).map(([d, r]) => [d, round((r * 1000) / custAt.get(d), 2)]);
  const use = sales.filter(([d]) => custAt.get(d) > 0).map(([d, k]) => [d, round((k * 1000) / custAt.get(d), 0)]);
  const price12 = trailingPrice(rev, sales, end), bill12 = trailingMean(bill, end);
  const u = {
    code: g.code, state: g.state, name: utilityName(g.raw), eiaName: g.raw, ownership: g.ownership, month: end, customers: cust.at(-1)[1],
    price12: round(price12, 2), price12Change: round(pct(price12, trailingPrice(rev, sales, prior)), 2), priceSince2019: round(pct(price12, trailingPrice(rev, sales, baseEnd)), 2),
    bill12: round(bill12, 2), bill12Change: round(pct(bill12, trailingMean(bill, prior)), 2), use12: round(trailingMean(use, end), 0),
    history: { price, bill, use }, ids: [revId, salesId, custId],
  };
  const list = utilitiesByState.get(g.state) ?? [];
  list.push(u);
  utilitiesByState.set(g.state, list);
}
for (const list of utilitiesByState.values()) {
  list.sort((a, b) => b.customers - a.customers);
  const seen = new Map();
  for (const u of list) { const base = slugify(u.name); const n = seen.get(base) ?? 0; seen.set(base, n + 1); u.slug = n ? `${base}-${u.code.split('-')[0]}` : base; }
}
const utilityRow = ({ history, ids, ...u }) => u;
for (const s of states) {
  const code = s.code;
  const ids = [elec('residential_price', code), derived('bill', code), derived('use', code), gasId(code)].filter(Boolean);
  await writeFile(join(out, `downloads/electricity-${s.slug}.csv.gz`), csv(csvRows(ids)));
  // Heating fuels EIA surveys in this state, for a link from its page.
  const heating = FUELS.filter((f) => f.seasonal).filter((f) => defs.some((d) => d.product === f.products[0][0] && d.geoType === 'state' && d.geoCode === code)).map((f) => ({ slug: f.slug, name: f.name }));
  const rankPrice = 1 + states.filter((o) => o.price12 > s.price12).length;
  const rankBill = 1 + states.filter((o) => o.bill12 > s.bill12).length;
  const utilities = utilitiesByState.get(code) ?? [];
  const stateCustomers = new Map(series(elec('residential_customers', code))).get(s.month);
  // The share of the state's homes the listed utilities serve, on the state's latest month. Low in retail-choice
  // states, where most homes buy from a retail supplier that EIA does not itemise.
  const coverage = stateCustomers ? round(utilities.filter((u) => u.month === s.month).reduce((a, u) => a + u.customers, 0) / stateCustomers, 3) : null;
  const ranked = utilities.filter((u) => u.price12 != null).sort((a, b) => b.price12 - a.price12);
  const stateRef = { name: s.name, slug: s.slug, code, month: s.month, price12: s.price12, bill12: s.bill12, use12: s.use12, price12Change: s.price12Change, priceSince2019: s.priceSince2019 };
  for (const u of utilities) {
    await writeFile(join(out, `downloads/utility-${s.slug}-${u.slug}.csv.gz`), csv(csvRows(u.ids)));
    await page(`electricity/${s.slug}/${u.slug}`, `${BASE}/electricity/${s.slug}/${u.slug}`, {
      kind: 'utility', utility: utilityRow(u), state: stateRef, coverage, rank: u.price12 == null ? null : 1 + ranked.findIndex((x) => x.code === u.code), utilityCount: ranked.length,
      history: u.history, stateHistory: { price: points.get(elec('residential_price', code)), bill: points.get(derived('bill', code)) },
    });
  }
  searchEntries.push({ group: 'Electricity', label: `Electricity in ${s.name}`, hint: `State, ${money(s.bill12, 0)} a month`, right: `${s.price12.toFixed(1)}¢`, href: `${BASE}/electricity/${s.slug}` });
  for (const u of utilities) if (u.price12 != null) searchEntries.push({ group: 'Utilities', label: u.name, hint: `${s.name}, ${money(u.bill12, 0)} a month`, right: `${u.price12.toFixed(1)}¢`, href: `${BASE}/electricity/${s.slug}/${u.slug}` });
  await page(`electricity/${s.slug}`, `${BASE}/electricity/${s.slug}`, {
    rateCases: rateCases.filter((c) => c.state === code).map(rateCaseRow),
    kind: 'state', state: (({ trend, ...rest }) => rest)(s), us: (({ trend, ...rest }) => rest)(us), rankPrice, rankBill, stateCount: states.length, heating, utilities: utilities.map(utilityRow), coverage,
    history: { price: points.get(elec('residential_price', code)), bill: points.get(derived('bill', code)), use: points.get(derived('use', code)), gas: gasId(code) ? points.get(gasId(code)) : [] },
    usHistory: { price: points.get(elec('residential_price', 'US')), bill: points.get(derived('bill', 'US')), gas: points.get(gasId('US')) },
  });
}
// The largest utilities nationally, for the electricity page: every one serving 250,000 homes or more.
const stateSlug = new Map(states.map((s) => [s.code, s.slug]));
const largest = [...utilitiesByState.values()].flat().filter((u) => u.customers >= 250_000 && u.price12 != null).map((u) => ({ ...utilityRow(u), stateSlug: stateSlug.get(u.state) }));
// The US aggregate for the electricity page: the monthly figure, and its twelve-month average at every month, which
// shows the trend under the summer and winter swings.
const rolling = (list, value) => list.slice(11).map(([d]) => [d, value(d)]).filter(([, v]) => v != null);
const usRev = series(elec('residential_revenue', 'US')), usSales = impliedSales('US'), usBill = series(derived('bill', 'US'));
const usHistory = {
  price: points.get(elec('residential_price', 'US')),
  price12: rolling(usRev, (d) => round(trailingPrice(usRev, usSales, d), 2)),
  bill: usBill,
  bill12: rolling(usBill, (d) => round(trailingMean(usBill, d), 2)),
};
await page('electricity', `${BASE}/electricity`, { kind: 'electricity', us, usHistory, electricityCpi, electricityCpiTrend, states: states.map(({ gas, ...s }) => s), largest, utilityCount: [...utilitiesByState.values()].flat().length });
// The state tile map as its own page (a shareable link with its own title and preview image).
await page('electricity/map', `${BASE}/electricity/map`, { kind: 'electricityMap', us: { month: us.month, price12: us.price12, priceSince2019: us.priceSince2019, trend: us.trend }, electricityCpi, electricityCpiTrend, states: states.map((s) => ({ code: s.code, name: s.name, slug: s.slug, price12: s.price12, priceSince2019: s.priceSince2019, trend: s.trend })) });

// ── Since 2019. BLS average prices for the fuels households buy, as the change since August 2019, before the pandemic
// moved energy prices; the same base month the food site uses, so the two read together.
const FROM = '2019-08-01';
const STAPLES = [
  ['APU000074714', 'Gasoline', 'a gallon', 'gasoline'],
  ['APU000074717', 'Diesel', 'a gallon', 'diesel'],
  ['APU000072610', 'Electricity', 'per kWh', 'electricity'],
  ['APU000072620', 'Natural gas', 'per therm', null],
  ['APU000072511', 'Heating oil', 'a gallon', 'heating-oil'],
];
const since = (list) => { const base = list.find((p) => p[0] >= FROM); return { base, points: list.filter((p) => p[0] >= base[0]).map(([d, v]) => [d.slice(0, 7), round(pct(v, base[1]), 2), v]) }; };
const staples = STAPLES.map(([code, name, unit, slug]) => {
  const list = series(`bls-ap:${code}`); const { base, points: pts } = since(list); const last = list.at(-1);
  const yearAgo = list.find((p) => p[0] === addMonths(last[0], -12));
  return { name, unit, slug, seriesId: `bls-ap:${code}`, baseDate: base[0], basePrice: base[1], price: last[1], change: round(pct(last[1], base[1]), 2), yearChange: yearAgo ? round(pct(last[1], yearAgo[1]), 2) : null, points: pts };
});
const cpiSince = (code) => { const list = series(`bls-cpi:CUUR0000${code}`); const base = list.find((p) => p[0] === FROM); const last = list.at(-1); const yearAgo = list.find((p) => p[0] === addMonths(last[0], -12)); return { month: last[0], change: round(pct(last[1], base[1]), 2), yearChange: round(pct(last[1], yearAgo?.[1]), 2) }; };
const CPI = [['SA0E', 'All energy'], ['SETB01', 'Gasoline'], ['SEHF01', 'Electricity'], ['SEHF02', 'Utility gas'], ['SEHE01', 'Fuel oil'], ['SAF11', 'Food at home']];
const allItems = cpiSince('SA0');
const ranking = CPI.map(([code, name]) => ({ name, ...cpiSince(code), staple: code === 'SA0E' })).sort((a, b) => b.change - a.change);
const REGIONS = [['0000', 'US average'], ['0100', 'Northeast'], ['0200', 'Midwest'], ['0300', 'South'], ['0400', 'West']];
const regions = REGIONS.map(([area, name]) => ({ name, items: Object.fromEntries(STAPLES.map(([code, label]) => { const id = `bls-ap:APU${area}${code.slice(7)}`; const list = points.get(id) ?? []; const base = list.find((p) => p[0] === FROM); const last = list.at(-1); return [label, base && last ? { price: last[1], change: round(pct(last[1], base[1]), 2) } : null]; })) }));

// ── Home.
const regionalPump = defs.filter((d) => d.product === 'gasoline_regular' && ['us', 'padd'].includes(d.geoType)).sort((a, b) => AREA_ORDER[a.geoType] - AREA_ORDER[b.geoType]).map((d) => {
  const dieselId = find((x) => x.product === 'diesel' && x.geoCode === d.geoCode)?.id;
  return { area: d.geoName, geoCode: d.geoCode, gasoline: weeklySummary(points.get(d.id)), diesel: dieselId ? weeklySummary(points.get(dieselId)) : null };
});
const energyCpi = monthlySummary(series('bls-cpi:CUUR0000SA0E'));

const allCpi = monthlySummary(series('bls-cpi:CUUR0000SA0'));
const weekly2y = (id) => points.get(id).filter((p) => p[0] >= '2019-08-01');
await page('home', BASE, {
  kind: 'home',
  headlines: { gasoline: fuelHeadlines.gasoline, diesel: fuelHeadlines.diesel, electricity: { ...us.price, price12: us.price12, price12Change: us.price12Change }, bill: { value: us.bill12, change: us.bill12Change }, energyCpi: { month: energyCpi.date, change: energyCpi.yearChange, allItems: allCpi.yearChange } },
  staples: { from: FROM.slice(0, 7), month: staples[0].points.at(-1)[0], items: staples, ranking, cpi: allItems, regions },
  pump: { rows: regionalPump, gasoline: weekly2y('eia-pet:EMM_EPMR_PTE_NUS_DPG.W'), diesel: weekly2y('eia-pet:EMD_EPD2D_PTE_NUS_DPG.W') },
  states: states.map((s) => ({ code: s.code, name: s.name, slug: s.slug, price12: s.price12, price12Change: s.price12Change, priceSince2019: s.priceSince2019, trend: s.trend })),
  usTrend: us.trend,
  usSince2019: us.priceSince2019,
  electricityCpi,
  electricityCpiTrend,
});
const rateCaseStates = [...new Set(rateCases.map((c) => c.state))].map((code) => { const st = states.find((x) => x.code === code); return { code, name: st.name, slug: st.slug }; }).sort((a, b) => a.name.localeCompare(b.name));
await page('rate-cases', `${BASE}/rate-cases`, { kind: 'rateCases', cases: rateCases.map(rateCaseRow), states: rateCaseStates });
const caseCsv = ['state,case_id,service,utility,status,filed_date,decision_date,expected_decision,requested_usd_million,requested_percent,approved_usd_million,residential_bill_impact,case_url', ...rateCases.map((c) => [c.state, c.case_id, c.service, c.utility, c.status, c.filed_date, c.decision_date, c.expected_decision, c.requested_revenue_musd, c.requested_percent, c.approved_revenue_musd, c.residential_bill_impact, c.case_url].map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v)).join(','))].join('\n') + '\n';
await writeFile(join(out, 'downloads/rate-cases.csv.gz'), gzipSync(caseCsv));
for (const c of rateCases) searchEntries.push({ group: 'Rate cases', label: `${c.utility} ${c.service === 'gas' ? 'gas' : 'electric'} rate case`, hint: `${c.state}, ${c.case_id}, ${c.status}`, href: `${BASE}/rate-cases?state=${c.state}` });
await page('about', `${BASE}/about`, { kind: 'about', counts: { series: manifest.series, rows: manifest.rows, states: states.length } });

// The search index: every page a reader might type a name for, with the figure that identifies it.
const pageEntries = [
  { group: 'Pages', label: 'Overview', hint: 'Headlines, since 2019, pump prices, states', href: BASE },
  { group: 'Pages', label: 'Fuel prices', hint: 'Gasoline, diesel, heating oil, propane, crude oil', href: `${BASE}/fuel` },
  { group: 'Pages', label: 'Electricity prices by state', hint: 'Price, bill and use for every state', href: `${BASE}/electricity` },
  { group: 'Pages', label: 'Utility rate cases', hint: 'Open and recent requests to raise rates', href: `${BASE}/rate-cases` },
  { group: 'Pages', label: 'About the data', hint: 'Sources and methods', href: `${BASE}/about` },
];
await writeFile(join(out, 'search.json'), JSON.stringify([...pageEntries, ...searchEntries]));
await copyFile(join(dir, manifest.files.csv), join(out, 'downloads/energy-prices.csv.gz'));
await writeFile(join(out, 'routes.json'), JSON.stringify(pages));
console.log(JSON.stringify({ discontinued: dropped }));
console.log(JSON.stringify({ pages: pages.length, lastWeek, lastMonth, sourceRun: manifest.runId }));
