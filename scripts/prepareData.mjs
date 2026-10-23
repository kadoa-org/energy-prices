// Builds the site's data files from the energy pipeline export: one JSON file per page and gzipped CSV downloads.
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip, gzipSync } from 'node:zlib';
import { BASE, addDays, addMonths, money, monthLabel, monthlySummary, pct, slugify, trailingMean, trailingPrice, weeklySummary } from '../src/model.mjs';
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
// Each page is serialised when it is made, but written at the end with the final `common`, so something every page
// carries (the banner for the newest insight) can come from analysis that runs after the first pages.
const queued = [];
const COMMON = '"__common__"';
const page = async (key, path, body) => { pages.push({ key, path }); queued.push([key, JSON.stringify({ key, ...body, common: '__common__' })]); };
const csv = (rows) => gzipSync(['date,series_id,area,product,measure,unit,value', ...rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v)).join(','))].join('\n') + '\n');
const csvRows = (ids) => ids.flatMap((id) => { const d = byId.get(id); return points.get(id).map(([date, v]) => [date, id, d.geoName, d.product, d.measure, d.unit, v]); });

const lastWeek = defs.filter((d) => d.frequency === 'W').map((d) => points.get(d.id).at(-1)?.[0]).filter(Boolean).sort().at(-1);
const lastMonth = series('eia-elec:PRICE.US-RES.M').at(-1)[0];
// Europe for comparison: each product's change since its 2019 average in the EU and its members, against the US over
// the same period. Household electricity and gas come from Eurostat per half year, so the US is EIA's monthly average
// over the same six months. Petrol and diesel come from the EU Weekly Oil Bulletin, so both sides are the average of
// the US's latest four weekly prices, on the same Mondays. Prices stay in each currency and unit.
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const meanBetween = (pts, from, to) => avg(pts.filter(([d]) => d >= from && d < to).map(([, v]) => v));
const meanOn = (pts, dates) => avg(pts.filter(([d]) => dates.has(d)).map(([, v]) => v));
const base2019 = (pts) => meanBetween(pts, '2019-01-01', '2020-01-01');
function europeHalfYear(dataset, usId) {
  const eu = defs.filter((d) => d.source === 'eurostat' && d.sourceSeries.startsWith(`${dataset}/`));
  const usPts = points.get(usId) ?? [];
  // The latest half the EU average covers, and only if the US monthly series reaches its last month.
  const half = points.get(`eurostat:${dataset}.EU27_2020`)?.at(-1)?.[0];
  if (!half || !usPts.length || usPts.at(-1)[0] < addMonths(half, 5)) return null;
  const end = addMonths(half, 6), usNow = meanBetween(usPts, half, end);
  return {
    period: { kind: 'half', from: half },
    us: { price: round(usNow, 3), since2019: round(pct(usNow, base2019(usPts)), 1) },
    countries: eu.map((d) => {
      const p = points.get(d.id), at = (date) => p.find(([x]) => x === date)?.[1];
      return { code: d.geoCode, name: d.geoName, price: round(at(half), 4), since2019: round(pct(at(half), avg(['2019-01-01', '2019-07-01'].map(at).filter((v) => v != null))), 1) };
    }).filter((c) => c.price != null && c.since2019 != null),
  };
}
function europeWeekly(key, usId) {
  const usPts = points.get(usId) ?? [];
  const weeks = usPts.slice(-4).map(([d]) => d);
  if (weeks.length < 4) return null;
  const dates = new Set(weeks);
  return {
    period: { kind: 'weeks', from: weeks[0], to: weeks.at(-1) },
    us: { price: round(meanOn(usPts, dates), 3), since2019: round(pct(meanOn(usPts, dates), base2019(usPts)), 1) },
    countries: defs.filter((d) => d.source === 'ec-oil' && d.id.endsWith(`.${key}`)).map((d) => {
      const p = points.get(d.id), now = meanOn(p, dates);
      // A country that missed one of the four weeks is left out rather than averaged over fewer weeks.
      const reported = p.filter(([x]) => dates.has(x)).length;
      return reported === dates.size ? { code: d.geoCode, name: d.geoName, price: round(now, 3), since2019: round(pct(now, base2019(p)), 1) } : null;
    }).filter((c) => c && c.since2019 != null),
  };
}
const EUROPE = {
  electricity: europeHalfYear('nrg_pc_204', 'eia-elec:PRICE.US-RES.M'),
  gas: europeHalfYear('nrg_pc_202', 'eia-ng:N3010US3.M'),
  gasoline: europeWeekly('euro95', 'eia-pet:EMM_EPMR_PTE_NUS_DPG.W'),
  diesel: europeWeekly('diesel', 'eia-pet:EMD_EPD2D_PTE_NUS_DPG.W'),
};
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
// All-items CPI by month for the dashed line on a fuel chart: the first price on the chart grown with inflation.
const cpiMonthly = series('bls-cpi:CUUR0000SA0').filter(([d]) => d >= '1990-01-01').map(([d, v]) => [d.slice(0, 7), v]);
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
// The oil price since 1970 with its shocks labelled, for the crude oil page. EIA's weekly Brent starts in May 1987;
// before that, EIA's cost of imported crude to US refiners, monthly from 1974 and annual (plotted mid-year) for
// 1970 to 1973, so the 1973 embargo jump shows. Each shock points at its highest (or for Covid, lowest) point in a fixed window.
const brentWeekly = points.get('eia-pet:RBRTE.W') ?? [];
const oilHistory = (() => {
  const annual = (points.get('eia-pet:R1300____3.A') ?? []).filter(([d]) => d >= '1970-01-01' && d < '1974-01-01').map(([d, v]) => [`${d.slice(0, 4)}-07`, v]);
  const monthly = (points.get('eia-pet:R1300____3.M') ?? []).filter(([d]) => d >= '1974-01-01' && d < '1987-05-01').map(([d, v]) => [d.slice(0, 7), v]);
  const last = brentWeekly.at(-1);
  if (!annual.length || !monthly.length || !last) return null;
  const pts = [...annual.map(([m, v]) => [`${m}-01`, v]), ...monthly.map(([m, v]) => [`${m}-15`, v]), ...brentWeekly];
  const pick = (from, to, low = false) => pts.filter(([m]) => m.slice(0, 7) >= from && m.slice(0, 7) <= to).reduce((a, p) => ((low ? p[1] < a[1] : p[1] > a[1]) ? p : a));
  const shocks = [
    ['OPEC embargo', pts.find(([m]) => m >= '1974-01-01')],
    ['Iran revolution', pick('1979-01', '1981-12')],
    ['First Gulf War', pick('1990-08', '1990-12')],
    ['Second Gulf War', pick('2003-02', '2003-04')],
    ['Financial crisis', pick('2008-01', '2008-12')],
    ['Covid-19 pandemic', pick('2020-03', '2020-06', true)],
    ['Russia invades Ukraine', pick('2022-01', '2022-12')],
    ['Iran war', pick('2026-02', '2026-06')],
  ].map(([name, [d, v]]) => ({ name, date: d, value: v }));
  return { points: pts, shocks, latest: { date: last[0], value: last[1] } };
})();
// Minutes of work to buy a gallon of diesel and regular gas: EIA weekly US retail prices averaged by month, divided by
// BLS average hourly earnings of production and nonsupervisory employees (CES0500000008). Only whole months with a pay
// figure count, so the first diesel month (from 21 March 1994) and the month after the latest pay release drop out.
// Events use the oil price chart's names, each at the diesel peak in its window (Covid at the gas low).
const fuelWork = (() => {
  const pay = new Map((points.get('bls-ces:CES0500000008') ?? []).map(([d, v]) => [d.slice(0, 7), v]));
  const byMonth = (id) => { const m = new Map(); for (const [d, v] of points.get(id) ?? []) { const k = d.slice(0, 7); m.set(k, [...(m.get(k) ?? []), v]); } return m; };
  const gas = byMonth('eia-pet:EMM_EPMR_PTE_NUS_DPG.W'), diesel = byMonth('eia-pet:EMD_EPD2D_PTE_NUS_DPG.W');
  const firstDiesel = (points.get('eia-pet:EMD_EPD2D_PTE_NUS_DPG.W') ?? [])[0]?.[0];
  if (!firstDiesel || !pay.size) return null;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const rows = [...diesel.keys()].filter((k) => k > firstDiesel.slice(0, 7) && gas.has(k) && pay.has(k)).sort().map((k) => {
    const g = mean(gas.get(k)), d = mean(diesel.get(k)), w = pay.get(k);
    return { month: k, gas: round(g), diesel: round(d), pay: w, gasMinutes: round((g / w) * 60, 4), dieselMinutes: round((d / w) * 60, 4) };
  });
  const within = (a, b) => rows.filter((r) => r.month >= a && r.month <= b);
  const top = (rs, k, low = false) => rs.reduce((p, r) => ((low ? r[k] < p[k] : r[k] > p[k]) ? r : p));
  const events = [
    ['Second Gulf War', top(within('2002-10', '2003-06'), 'dieselMinutes')],
    ['Financial crisis', top(within('2008-01', '2008-12'), 'dieselMinutes')],
    ['Covid-19 pandemic', top(within('2020-01', '2020-12'), 'gasMinutes', true)],
    ['Russia invades Ukraine', top(within('2022-01', '2022-12'), 'dieselMinutes')],
    ['Iran war', top(within('2026-02', '2026-06'), 'dieselMinutes')],
  ].map(([name, r]) => ({ name, month: r.month, dieselMinutes: r.dieselMinutes, gasMinutes: r.gasMinutes }));
  const latest = rows.at(-1), gap = (r) => r.dieselMinutes - r.gasMinutes;
  const widestGap = rows.every((r) => gap(r) <= gap(latest) + 1e-9);
  return { rows, events, latest, widestGap };
})();
// Pump prices follow crude, so the gasoline and diesel pages carry crude's headline for a link.
const crude = fuelCards.find((c) => c.slug === 'crude-oil');
for (const { fuel, fuelMeta, locations, us, nav, compare, monthly, surveys } of fuelData) {
  const related = ['gasoline', 'diesel'].includes(fuel.slug) && crude ? { slug: crude.slug, title: crude.title, grade: crude.grades[0], summary: crude.summary, unit: crude.unit } : null;
  for (const l of locations) {
    const key = l.slug ? `fuel/${fuel.slug}/${l.slug}` : `fuel/${fuel.slug}`;
    await page(key, `${BASE}/${key}`, {
      kind: 'fuel', fuel: fuelMeta, location: { slug: l.slug, name: l.name, type: l.type },
      lines: l.grades.map((g) => ({ grade: g.grade, id: g.id, summary: g.summary, points: points.get(g.id) })),
      cpi: fuel.measure === 'spot_price' ? null : cpiMonthly,
      usSummary: us.grades[0].summary, locations: nav, compare, monthly: l.slug ? null : monthly, related,
      oilHistory: fuel.slug === 'crude-oil' && !l.slug ? oilHistory : null,
      europe: !l.slug ? (EUROPE[fuel.slug] ?? null) : null,
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
await page('electricity', `${BASE}/electricity`, { kind: 'electricity', us, usHistory, electricityCpi, electricityCpiTrend, states: states.map(({ gas, ...s }) => s), largest, utilityCount: [...utilitiesByState.values()].flat().length, europe: EUROPE.electricity });
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
  europe: EUROPE,
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
// ── Insights: one page per analysis, so a link (Reddit, a newsletter) opens the chart with its own title.
const INSIGHTS = [];
if (fuelWork) {
  const l = fuelWork.latest;
  INSIGHTS.push({ slug: 'fuel-minutes-of-work', title: `Diesel costs ${Math.round(l.dieselMinutes)} minutes of work per gallon, gas ${Math.round(l.gasMinutes)}`, summary: 'Minutes of average US hourly pay to buy a gallon of diesel or regular gas, since 1994.' });
  await page('insights/fuel-minutes-of-work', `${BASE}/insights/fuel-minutes-of-work`, { kind: 'insight', slug: 'fuel-minutes-of-work', title: INSIGHTS[0].title, work: fuelWork });
  const csv = ['month,diesel_usd_per_gallon,regular_gas_usd_per_gallon,average_hourly_earnings_usd,diesel_minutes_of_work,gas_minutes_of_work', ...fuelWork.rows.map((r) => [r.month, r.diesel, r.gas, r.pay, r.dieselMinutes, r.gasMinutes].join(','))].join('\n') + '\n';
  await writeFile(join(out, 'downloads/fuel-minutes-of-work.csv.gz'), gzipSync(csv));
}
// Gold exports: US exports by Census end-use category (seasonally adjusted, $ million). Gold, crude oil and
// pharmaceuticals have led the list in most months since 2020; the top category each month is taken over every
// category.
const goldExports = (() => {
  const census = defs.filter((d) => d.source === 'census-exports');
  if (!census.length) return null;
  const byMonth = (id) => new Map(series(id).map(([d, v]) => [d.slice(0, 7), v]));
  const all = census.map((d) => ({ id: d.id.split(':')[1], label: d.sourceSeries, at: byMonth(d.id) }));
  const get = (id) => all.find((c) => c.id === id)?.at ?? new Map();
  const gold = get('nonmonetary_gold'), crude = get('crude_oil'), pharma = get('pharmaceutical_preparations'), engines = get('civilian_aircraft_engines');
  const rows = [...gold.keys()].sort().filter((m) => crude.has(m) && pharma.has(m)).map((month) => {
    const top = all.filter((c) => c.at.has(month)).reduce((a, c) => (c.at.get(month) > a.at.get(month) ? c : a));
    return { month, gold: gold.get(month), crude: crude.get(month), pharma: pharma.get(month), engines: engines.get(month) ?? null, top: top.id, topLabel: top.label, topValue: top.at.get(month) };
  });
  // The baseline before the surge: 2021 to 2024, the four full years before gold took off.
  const base = rows.filter((r) => r.month >= '2021-01' && r.month <= '2024-12');
  // 12-month totals: "top export" is a claim about a year, and month by month gold swings from under $2B to over
  // $18B, leading in one month and fifth in the next. Each total sums the month and the 11 before it, and the top
  // category is taken over every category's total, as for single months.
  const sum12 = (at, i) => {
    const w = rows.slice(i - 11, i + 1).map((r) => at.get(r.month));
    return w.every((v) => v != null) ? round(w.reduce((s, v) => s + v, 0), 1) : null;
  };
  const totals = rows.slice(11).map((r, j) => {
    const i = j + 11;
    const top = all.map((c) => ({ c, v: sum12(c.at, i) })).filter((x) => x.v != null).reduce((a, x) => (x.v > a.v ? x : a));
    return { month: r.month, gold: sum12(gold, i), crude: sum12(crude, i), pharma: sum12(pharma, i), engines: sum12(engines, i), top: top.c.id };
  });
  const leads = (r) => r.top === 'nonmonetary_gold';
  // the first month of gold's current run at the top of the 12-month totals
  const runStart = leads(totals.at(-1)) ? totals[totals.findLastIndex((r) => !leads(r)) + 1].month : null;
  return {
    rows,
    totals,
    leadSince: runStart,
    led: rows.slice(-12).filter((r) => r.top === 'nonmonetary_gold').map((r) => r.month),
    baseline: base.length === 48 ? round(base.reduce((s, r) => s + r.gold, 0) / 48, 1) : null,
    latest: rows.at(-1),
  };
})();
if (goldExports) {
  // The headline the social chart uses: "now" holds while gold leads the latest 12-month totals, "became" once it
  // has led any single month.
  const slug = 'gold-top-export';
  const title = goldExports.leadSince
    ? 'Gold is now the top US export'
    : goldExports.rows.some((r) => r.top === 'nonmonetary_gold')
      ? "Gold became America's top export"
      : `US gold exports were $${(goldExports.latest.gold / 1000).toFixed(1)}B in ${monthLabel(`${goldExports.latest.month}-01`)}`;
  // Newest first on the index.
  INSIGHTS.unshift({ slug, title, summary: 'US exports of gold against crude oil, pharmaceuticals and aircraft engines since 2020, over 12 months and month by month, by Census product category.' });
  await page(`insights/${slug}`, `${BASE}/insights/${slug}`, { kind: 'insight', slug, title, gold: goldExports });
  const csv = ['month,gold_usd_million,crude_oil_usd_million,pharmaceuticals_usd_million,aircraft_engines_usd_million,top_category,top_category_usd_million', ...goldExports.rows.map((r) => [r.month, r.gold, r.crude, r.pharma, r.engines ?? '', /[",]/.test(r.topLabel) ? `"${r.topLabel.replaceAll('"', '""')}"` : r.topLabel, r.topValue].join(','))].join('\n') + '\n';
  await writeFile(join(out, `downloads/${slug}.csv.gz`), gzipSync(csv));
}
// Investor-owned against public and co-op utilities (EIA-861, annual, every utility on the full survey). The home
// price is residential revenue over kWh sold on bundled service (supply and delivery from the same utility), the basis
// of EIA's own utility price tables, summed over a group before dividing so each group is weighted by what its homes
// bought. 2020 is the base: the last year before prices took off. Inflation is CPI-U over the same calendar years.
const OWNERSHIP_BASE = 2020;
// Before the base, and the years the gap opened (2021 to 2023, through the 2022 energy price spike).
const OWNERSHIP_BEFORE = 2015, OWNERSHIP_SURGE = 2023;
const ownershipLabel = (o) => ({ 'Investor Owned': 'Investor-owned', Cooperative: 'Co-op' })[o] ?? 'Public';
const utilityOwnership = (() => {
  if (!points.get('eia-861:investor_owned-US-REV')?.length) return null;
  const byYear = (id) => new Map((points.get(id) ?? []).map(([d, v]) => [Number(d.slice(0, 4)), v]));
  // Revenue in thousand dollars over MWh is dollars a kWh; a group is the sum of its EIA groups, year by year.
  const totals = (groups, geo) => {
    const out = new Map();
    for (const g of groups) {
      const rev = byYear(`eia-861:${g}-${geo}-REV`), sales = byYear(`eia-861:${g}-${geo}-SALES`), cust = byYear(`eia-861:${g}-${geo}-CUST`);
      for (const [y, r] of rev) {
        if (!sales.get(y)) continue;
        const t = out.get(y) ?? { rev: 0, sales: 0, cust: 0 };
        t.rev += r; t.sales += sales.get(y); t.cust += cust.get(y) ?? 0;
        out.set(y, t);
      }
    }
    return out;
  };
  const kwh = (t) => (t ? t.rev / t.sales : null);
  const price = (t) => (t ? round(kwh(t) * 100, 2) : null);
  const bill = (t) => (t?.cust ? round((t.rev * 1000) / t.cust / 12, 2) : null);
  const use = (t) => (t?.cust ? round((t.sales * 1000) / t.cust / 12, 0) : null);
  // Not-for-profit is public and co-op together; "on investor-owned wires" adds the homes that buy from a retail
  // supplier (delivery-only plus energy-only revenue, and Texas retail providers), most of them in investor-owned areas.
  const GROUPS = { iou: ['investor_owned'], public: ['public'], coop: ['cooperative'], nfp: ['public', 'cooperative'], wires: ['investor_owned', 'retail_choice'] };
  const us = Object.fromEntries(Object.entries(GROUPS).map(([k, g]) => [k, totals(g, 'US')]));
  const years = [...us.iou.keys()].sort((a, b) => a - b);
  const latest = years.at(-1), base = OWNERSHIP_BASE;
  if (!us.iou.has(base) || latest <= base) return null;
  const change = (k, from = base, to = latest, groups = us) => (groups[k].has(from) && groups[k].has(to) ? round(pct(kwh(groups[k].get(to)), kwh(groups[k].get(from))), 1) : null);
  const cpiByYear = new Map();
  for (const [d, v] of series('bls-cpi:CUUR0000SA0')) { const y = Number(d.slice(0, 4)); cpiByYear.set(y, [...(cpiByYear.get(y) ?? []), v]); }
  // BLS published no October 2025 index, so a year may average 11 months; fewer is not a year.
  const cpiYear = (y) => (cpiByYear.get(y)?.length >= 11 ? avg(cpiByYear.get(y)) : null);
  const inflation = cpiYear(latest) && cpiYear(base) ? round(pct(cpiYear(latest), cpiYear(base)), 1) : null;
  const real = (k) => (inflation == null ? null : round(((1 + change(k) / 100) / (1 + inflation / 100) - 1) * 100, 1));
  const rows = years.map((year) => ({
    year,
    price: { iou: price(us.iou.get(year)), public: price(us.public.get(year)), coop: price(us.coop.get(year)), nfp: price(us.nfp.get(year)) },
    bill: { iou: bill(us.iou.get(year)), public: bill(us.public.get(year)), coop: bill(us.coop.get(year)) },
    homes: { iou: us.iou.get(year)?.cust ?? null, public: us.public.get(year)?.cust ?? null, coop: us.coop.get(year)?.cust ?? null },
    // Change since the base from the unrounded totals, so the chart agrees with the title to the decimal.
    since: { iou: change('iou', base, year), public: change('public', base, year), coop: change('coop', base, year) },
    inflation: cpiYear(year) && cpiYear(base) ? round(pct(cpiYear(year), cpiYear(base)), 1) : null,
  }));
  // Within each state: investor-owned against not-for-profit, where the state has both in both years. The nationwide
  // comparison could be geography (public power is common where power is cheap); this one is not.
  const stateRows = states.map((s) => {
    const iou = totals(GROUPS.iou, s.code), nfp = totals(GROUPS.nfp, s.code);
    if (![iou.get(base), iou.get(latest), nfp.get(base), nfp.get(latest)].every(Boolean)) return null;
    const side = (t) => ({ from: price(t.get(base)), to: price(t.get(latest)), change: round(pct(kwh(t.get(latest)), kwh(t.get(base))), 1), homes: t.get(latest).cust, ratio: kwh(t.get(latest)) / kwh(t.get(base)) });
    return { code: s.code, name: s.name, slug: s.slug, iou: side(iou), nfp: side(nfp) };
  }).filter(Boolean);
  // Both groups weighted by the same state mix (each state's homes in either group): the national change with
  // geography held equal.
  const weight = (r) => r.iou.homes + r.nfp.homes, weights = stateRows.reduce((a, r) => a + weight(r), 0);
  const mixed = (k) => round((stateRows.reduce((a, r) => a + weight(r) * r[k].ratio, 0) / weights - 1) * 100, 1);
  // The largest utilities by homes, each with its own price change, linked to its page when EIA-861M lists it.
  const utilities = defs.filter((d) => d.source === 'eia-861' && d.geoType === 'utility' && d.measure === 'residential_revenue').map((d) => {
    const rev = byYear(d.id), sales = byYear(d.id.replace(/-REV$/, '-SALES')), cust = byYear(d.id.replace(/-REV$/, '-CUST'));
    const homes = cust.get(latest);
    if (!(homes >= 250_000) || !sales.get(base) || !sales.get(latest) || !rev.has(base) || !rev.has(latest)) return null;
    const st = states.find((s) => s.code === d.state);
    const own = (utilitiesByState.get(d.state) ?? []).find((u) => u.code === d.geoCode);
    return {
      code: d.geoCode, name: utilityName(d.geoName), state: d.state, ownership: ownershipLabel(d.ownership), homes,
      from: round((rev.get(base) / sales.get(base)) * 100, 2), to: round((rev.get(latest) / sales.get(latest)) * 100, 2),
      change: round(pct(rev.get(latest) / sales.get(latest), rev.get(base) / sales.get(base)), 1),
      href: own && st ? `${BASE}/electricity/${st.slug}/${own.slug}` : null,
    };
  }).filter(Boolean).sort((a, b) => b.change - a.change);
  // How prices spread across homes in the latest year: each utility's average home price, its homes counted in
  // 2-cent bands from under 10 cents to 30 cents and over. Every utility on the full survey, small ones included.
  const EDGES = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
  const bandOf = (cents) => { const i = EDGES.findIndex((e) => cents < e); return i === -1 ? EDGES.length : i; };
  const groupOfUtility = (own) => (own === 'Investor Owned' ? 'iou' : own === 'Cooperative' ? 'coop' : own === 'Federal' ? null : 'public');
  const homesByBand = { iou: EDGES.map(() => 0).concat(0), public: EDGES.map(() => 0).concat(0), coop: EDGES.map(() => 0).concat(0) };
  for (const d of defs.filter((x) => x.source === 'eia-861' && x.geoType === 'utility' && x.measure === 'residential_revenue')) {
    const g = groupOfUtility(d.ownership);
    const rev = byYear(d.id).get(latest), sales = byYear(d.id.replace(/-REV$/, '-SALES')).get(latest), homes = byYear(d.id.replace(/-REV$/, '-CUST')).get(latest);
    if (!g || !rev || !sales || !homes) continue;
    homesByBand[g][bandOf((rev / sales) * 100)] += homes;
  }
  const spread = Object.fromEntries(Object.entries(homesByBand).map(([g, homes]) => {
    const all = homes.reduce((a, h) => a + h, 0), share = (from, to) => round((homes.slice(bandOf(from), to == null ? undefined : bandOf(to)).reduce((a, h) => a + h, 0) / all) * 100, 1);
    return [g, { shares: homes.map((h) => round((h / all) * 100, 1)), under14: share(0, 14), from12to20: share(12, 20), from30: share(30) }];
  }));
  const homesIn = (k) => us[k].get(latest).cust;
  return {
    base, latest, rows, inflation,
    change: { iou: change('iou'), public: change('public'), coop: change('coop'), nfp: change('nfp'), wires: change('wires') },
    real: { iou: real('iou'), nfp: real('nfp') },
    before: { from: OWNERSHIP_BEFORE, to: base, iou: change('iou', OWNERSHIP_BEFORE, base), nfp: change('nfp', OWNERSHIP_BEFORE, base) },
    surge: { from: base, to: OWNERSHIP_SURGE, iou: change('iou', base, OWNERSHIP_SURGE), nfp: change('nfp', base, OWNERSHIP_SURGE) },
    after: { from: OWNERSHIP_SURGE, to: latest, iou: change('iou', OWNERSHIP_SURGE, latest), nfp: change('nfp', OWNERSHIP_SURGE, latest) },
    use: { iou: use(us.iou.get(latest)), public: use(us.public.get(latest)), coop: use(us.coop.get(latest)) },
    // Public utilities' and co-ops' share of all homes, counting retail-choice homes with the investor-owned side.
    nfpShare: round(homesIn('nfp') / (homesIn('nfp') + homesIn('wires')), 3),
    // How much more a kWh cost at investor-owned than at public utilities in the latest year, from the unrounded totals.
    premium: round(pct(kwh(us.iou.get(latest)), kwh(us.public.get(latest))), 1),
    states: stateRows.map(({ iou, nfp, ...s }) => ({ ...s, iou: (({ ratio, ...x }) => x)(iou), nfp: (({ ratio, ...x }) => x)(nfp) })),
    // At the precision shown (0.1 point), so a tie on the page (South Dakota in 2025) never counts as faster.
    faster: stateRows.filter((r) => r.iou.change > r.nfp.change).length,
    // States where investor-owned homes paid more a kWh in the latest year, the headline's comparison within each state.
    pricier: stateRows.filter((r) => r.iou.to > r.nfp.to).length,
    reliability: (() => {
      // Outage minutes a year for the average home, without major storms (EIA-861 reliability, SAIDI), each group
      // weighted by the customers its utilities report for. Within each state, investor-owned against public and co-op
      // together, as for prices. Absent from exports made before the reliability series existed.
      const saidi = (g, geo) => byYear(`eia-861:${g}-${geo}-SAIDI`), cust = (g, geo) => byYear(`eia-861:${g}-${geo}-RCUST`);
      if (!saidi('investor_owned', 'US').size) return null;
      const OWNERS = ['investor_owned', 'public', 'cooperative'], KEYS = { investor_owned: 'iou', public: 'public', cooperative: 'coop' };
      const years = [...saidi('investor_owned', 'US').keys()].sort((a, b) => a - b);
      const rows = years.map((year) => ({ year, ...Object.fromEntries(OWNERS.map((g) => [KEYS[g], saidi(g, 'US').has(year) ? round(saidi(g, 'US').get(year), 0) : null])) }));
      const last = years.at(-1);
      const nfp = (geo) => {
        let w = 0, v = 0;
        for (const g of ['public', 'cooperative']) { const c = cust(g, geo).get(last), m = saidi(g, geo).get(last); if (c && m != null) { w += c; v += m * c; } }
        return w ? v / w : null;
      };
      const both = states.map((s) => ({ iou: saidi('investor_owned', s.code).get(last), nfp: nfp(s.code) })).filter((r) => r.iou != null && r.nfp != null);
      return { latest: last, rows, states: both.length, longer: both.filter((r) => r.iou > r.nfp).length };
    })(),
    mixed: { iou: mixed('iou'), nfp: mixed('nfp') },
    utilities,
    // The large public utilities at 20 cents or more (Los Angeles and Long Island in 2025), named under the chart since
    // they are the outlier readers ask about, with their share of public homes.
    spread: { edges: EDGES, ...spread, highPublic: (() => {
      const high = utilities.filter((u) => u.ownership === 'Public' && u.to >= 20).sort((a, b) => b.homes - a.homes);
      return { names: high.map((u) => u.name), share: round((high.reduce((a, u) => a + u.homes, 0) / homesIn('public')) * 100, 1) };
    })() },
  };
})();
if (utilityOwnership) {
  const o = utilityOwnership, slug = 'investor-owned-utilities';
  const title = `Investor-owned utilities charge ${Math.round(o.premium)}% more for electricity than public ones`;
  INSIGHTS.unshift({ slug, title, summary: `Average home electricity price at investor-owned utilities against public utilities and co-ops, by state and by utility, since ${o.rows[0].year}.` });
  await page(`insights/${slug}`, `${BASE}/insights/${slug}`, { kind: 'insight', slug, title, ownership: o });
  // Every group, the US and each state, every year: what EIA reports, and the price and bill derived from it.
  const groupIds = defs.filter((d) => d.source === 'eia-861' && d.geoType !== 'utility' && d.measure === 'residential_revenue');
  const lines = ['year,area,group,revenue_usd_thousand,sales_mwh,homes,price_cents_per_kwh,bill_usd_per_month'];
  for (const d of groupIds.sort((a, b) => a.geoCode.localeCompare(b.geoCode) || a.ownership.localeCompare(b.ownership))) {
    const sales = new Map(points.get(d.id.replace(/-REV$/, '-SALES'))), cust = new Map(points.get(d.id.replace(/-REV$/, '-CUST')) ?? []);
    for (const [date, rev] of points.get(d.id)) {
      const kwhs = sales.get(date), homes = cust.get(date);
      if (!kwhs) continue;
      lines.push([date.slice(0, 4), d.geoCode, d.ownership, rev, kwhs, homes ?? '', round((rev / kwhs) * 100, 2), homes ? round((rev * 1000) / homes / 12, 2) : ''].join(','));
    }
  }
  await writeFile(join(out, `downloads/${slug}.csv.gz`), gzipSync(lines.join('\n') + '\n'));
}
// PJM's capacity price and home electricity prices (EIA state residential revenue and sales). PJM's auction price for
// reserving power plants rose ninefold for the year from 1 June 2025. Its first year at that price, June 2025 to May
// 2026, is compared with the twelve months before, as revenue over kWh for the whole twelve months; a group sums
// revenue and kWh over its states before dividing, so each state counts by what its homes bought.
const PJM = {
  // On PJM's grid, where homes can choose a supplier and most take the utility's default supply, bought at auction.
  choice: ['NJ', 'PA', 'MD', 'DE', 'DC', 'OH'],
  // On PJM's grid, where the utilities own most of their plants, so they pay less of the capacity price.
  integrated: ['VA', 'WV'],
  // Only partly on PJM's grid (ComEd in Illinois, AEP and Duke areas elsewhere): shown, but in neither group.
  partial: ['IL', 'MI', 'NC', 'TN', 'KY', 'IN'],
  start: '2025-06-01',
  // RTO clearing price, dollars per MW-day, by delivery year from 1 June (PJM Base Residual Auction reports).
  capacity: [['2023/24', 34.13], ['2024/25', 28.92], ['2025/26', 269.92], ['2026/27', 329.17], ['2027/28', 333.44], ['2028/29', 325]],
  // Henry Hub spot, dollars per MMBtu, average of the same two years (EIA), for the gas caveat.
  henryHub: { before: 2.93, during: 3.62 },
  // Monitoring Analytics (PJM's market monitor), 5 Jan 2026: capacity revenue in 2025/26 due to data-center load.
  dataCenters2025: 9.33e9,
};
const pjmPrices = (() => {
  const yearEnd = addMonths(PJM.start, 11), priorEnd = addMonths(PJM.start, -1);
  if (lastMonth < yearEnd) return null;
  const monthly = new Map([...STATE_CODES, 'US'].map((code) => [code, { rev: new Map(series(elec('residential_revenue', code))), sales: new Map(impliedSales(code)) }]));
  const onGrid = [...PJM.choice, ...PJM.integrated];
  const others = STATE_CODES.filter((c) => c !== 'US' && !onGrid.includes(c) && !PJM.partial.includes(c));
  // Twelve months to `end`, summed over the states before dividing, in cents a kWh; null if any state misses a month.
  const price = (codes, end) => {
    let r = 0, k = 0;
    for (const code of codes) {
      const { rev, sales } = monthly.get(code);
      for (let i = 0; i < 12; i++) { const m = addMonths(end, -i); if (!rev.has(m) || !sales.has(m)) return null; r += rev.get(m); k += sales.get(m); }
    }
    return k > 0 ? (r / k) * 100 : null;
  };
  const change = (codes, end) => round(pct(price(codes, end), price(codes, addMonths(end, -12))), 1);
  const group = (code) => (PJM.choice.includes(code) || PJM.integrated.includes(code) ? 'pjm' : PJM.partial.includes(code) ? 'partial' : 'other');
  const rows = states.map((s) => ({ code: s.code, name: s.name, slug: s.slug, group: group(s.code), from: round(price([s.code], priorEnd), 2), to: round(price([s.code], yearEnd), 2), change: change([s.code], yearEnd) }))
    .filter((r) => r.change != null).sort((a, b) => b.change - a.change);
  const lead = rows.findIndex((r) => r.group !== 'pjm');
  const sides = { choice: PJM.choice, integrated: PJM.integrated, partial: PJM.partial, others };
  const groups = Object.fromEntries(Object.entries(sides).map(([k, codes]) => [k, { from: round(price(codes, priorEnd), 2), to: round(price(codes, yearEnd), 2), change: change(codes, yearEnd), before: change(codes, priorEnd), latest: change(codes, lastMonth) }]));
  // The change from a year earlier at every month since 2019, and for each twelve months to May (the delivery year).
  const trend = { choice: [], others: [] };
  for (let m = '2019-01-01'; m <= lastMonth; m = addMonths(m, 1)) for (const k of ['choice', 'others']) { const v = change(sides[k], m); if (v != null) trend[k].push([m, v]); }
  const years = [];
  for (let m = '2019-05-01'; m <= yearEnd; m = addMonths(m, 12)) years.push({ end: m, choice: change(PJM.choice, m), others: change(others, m) });
  const gaps = years.slice(0, -1).map((y) => y.choice - y.others);
  return {
    start: PJM.start, yearEnd, priorEnd, latest: lastMonth, lead, rows, groups, trend, years,
    us: change(['US'], yearEnd),
    gap: round(groups.choice.change - groups.others.change, 1),
    priorGap: round(Math.max(...gaps), 1),
    capacity: PJM.capacity.map(([year, price]) => ({ year, price })),
    henryHub: round(pct(PJM.henryHub.during, PJM.henryHub.before), 0),
    dataCenters: PJM.dataCenters2025,
    states: { choice: PJM.choice, integrated: PJM.integrated, partial: PJM.partial },
  };
})();
if (pjmPrices) {
  const p = pjmPrices, slug = 'pjm-power-prices';
  const WORDS = ['', 'biggest jump', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const title = p.lead >= 2 ? `The ${WORDS[p.lead]} biggest jumps in home power prices were all on one grid` : `Home power prices rose ${p.groups.choice.change}% on the PJM grid, ${p.groups.others.change}% elsewhere`;
  // Listed after the utility ownership insight, which stays the newest one.
  const after = INSIGHTS.findIndex((i) => i.slug === 'investor-owned-utilities') + 1;
  INSIGHTS.splice(after, 0, { slug, title, summary: 'Change in the average home electricity price by state in the first year of PJM\'s ninefold capacity price, June 2025 to May 2026.' });
  await page(`insights/${slug}`, `${BASE}/insights/${slug}`, { kind: 'insight', slug, title, pjm: p });
  const lines = ['state,name,grid,price_cents_kwh_jun2024_may2025,price_cents_kwh_jun2025_may2026,change_pct'];
  for (const r of p.rows) lines.push([r.code, /[",]/.test(r.name) ? `"${r.name}"` : r.name, { pjm: 'PJM', partial: 'partly PJM', other: 'not PJM' }[r.group], r.from, r.to, r.change].join(','));
  await writeFile(join(out, `downloads/${slug}.csv.gz`), gzipSync(lines.join('\n') + '\n'));
}
if (INSIGHTS.length) await page('insights', `${BASE}/insights`, { kind: 'insights', insights: INSIGHTS });
await page('about', `${BASE}/about`, { kind: 'about', counts: { series: manifest.series, rows: manifest.rows, states: states.length } });
// The newest insight, announced in a banner under the navigation on every other page until the date given. Decided
// here at build time, so the prerendered page and the browser agree. The banner has its own text, about 50
// characters with the number first, so it fits a phone in one or two lines; the page keeps the full title.
const ANNOUNCE = {
  slug: 'investor-owned-utilities',
  until: '2026-11-30',
  text: utilityOwnership && `Investor-owned utilities charge ${Math.round(utilityOwnership.premium)}% more for power`,
};
const announced = INSIGHTS.find((i) => i.slug === ANNOUNCE.slug);
if (announced && ANNOUNCE.text && new Date().toISOString().slice(0, 10) <= ANNOUNCE.until) common.announce = { key: `insights/${announced.slug}`, href: `${BASE}/insights/${announced.slug}`, title: ANNOUNCE.text };
const commonJson = JSON.stringify(common);
for (const [key, json] of queued) {
  const file = join(out, `${key}.json`);
  await mkdir(dirname(file), { recursive: true });
  const at = json.lastIndexOf(COMMON);
  if (at < 0) throw new Error(`Page ${key} lost its common placeholder`);
  await writeFile(file, json.slice(0, at) + commonJson + json.slice(at + COMMON.length));
}

// The search index: every page a reader might type a name for, with the figure that identifies it.
const pageEntries = [
  { group: 'Pages', label: 'Overview', hint: 'Headlines, since 2019, pump prices, states', href: BASE },
  { group: 'Pages', label: 'Fuel prices', hint: 'Gasoline, diesel, heating oil, propane, crude oil', href: `${BASE}/fuel` },
  { group: 'Pages', label: 'Electricity prices by state', hint: 'Price, bill and use for every state', href: `${BASE}/electricity` },
  { group: 'Pages', label: 'Utility rate cases', hint: 'Open and recent requests to raise rates', href: `${BASE}/rate-cases` },
  { group: 'Pages', label: 'About the data', hint: 'Sources and methods', href: `${BASE}/about` },
  ...INSIGHTS.map((i) => ({ group: 'Insights', label: i.title, hint: i.summary, href: `${BASE}/insights/${i.slug}` })),
];
await writeFile(join(out, 'search.json'), JSON.stringify([...pageEntries, ...searchEntries]));
await copyFile(join(dir, manifest.files.csv), join(out, 'downloads/energy-prices.csv.gz'));
await writeFile(join(out, 'routes.json'), JSON.stringify(pages));
console.log(JSON.stringify({ discontinued: dropped }));
console.log(JSON.stringify({ pages: pages.length, lastWeek, lastMonth, sourceRun: manifest.runId }));
