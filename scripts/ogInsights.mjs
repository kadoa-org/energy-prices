// Link previews for every energy insight, from the built page data, with the shared layout in og-insight.mjs. Each
// image goes next to the page data as og-<slug>.png, so it is published with the run it describes.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderOgImages } from './og-insight.mjs';
import { carRange } from '../src/cars.mjs';

const root = resolve(import.meta.dirname, '..');
const data = join(root, 'public/data');
const load = (slug) => { const f = join(data, `insights/${slug}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
// The site's series colours (SERIES_COLOURS in LineChart.jsx) and the PJM chart's colours (PJM_COLOURS in App.jsx).
const BLUE = '#154275', ORANGE = '#c84c04', TEAL = '#28a197', LIGHT = '#eeae86', GREY = '#c3c6c8';
const pct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const month = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const images = [];

const cars = load('car-fuel-costs');
if (cars) {
  // The furthest and shortest runs on $100, with the furthest hybrid between them.
  const c = cars.cars, range = carRange(c.rows, c.milesYear / 12), hybrid = range.find((r) => r.fuel === 'hybrid');
  const run = (r) => ({ value: Math.round(r.miles).toLocaleString('en-US'), label: `${r.make} ${r.model}, ${r.fuel}`, colour: { electric: BLUE, hybrid: TEAL, diesel: ORANGE, gas: '#6f777b' }[r.fuel] });
  images.push({
    out: join(data, 'og-car-fuel-costs.png'), title: cars.title, source: 'EPA, EIA',
    key: 'Miles on $100 of fuel or home charging at this week\'s prices.',
    figures: [range[0], ...(hybrid && hybrid !== range[0] ? [hybrid] : []), range.at(-1)].map(run),
  });
}
const pjm = load('pjm-power-prices');
if (pjm) {
  const p = pjm.pjm;
  images.push({
    out: join(data, 'og-pjm-power-prices.png'), title: pjm.title, source: 'EIA, PJM',
    key: `Change in home electricity price over a year: states <b style="color:${ORANGE}">on the PJM grid</b> or <b style="color:#a85a2a">partly on it</b>. US ${pct(p.us)}.`,
    rows: p.rows.map((r) => ({ label: r.name, value: r.change, text: pct(r.change), colour: { pjm: ORANGE, partial: LIGHT, other: GREY }[r.group], strong: r.group === 'pjm' })),
  });
}
const iou = load('investor-owned-utilities');
if (iou) {
  const o = iou.ownership, last = o.rows.at(-1);
  images.push({
    out: join(data, 'og-investor-owned-utilities.png'), title: iou.title, source: 'EIA annual survey of utilities',
    key: `Average home price per kilowatt-hour in ${o.latest}.`,
    figures: [{ value: `${last.price.iou.toFixed(1)}¢`, label: 'Investor-owned', colour: ORANGE }, { value: `${last.price.public.toFixed(1)}¢`, label: 'Public utilities', colour: BLUE }, { value: `${last.price.coop.toFixed(1)}¢`, label: 'Co-ops', colour: TEAL }],
  });
}
const gold = load('gold-top-export');
if (gold) {
  const t = gold.gold.totals.at(-1), b = (v) => `$${(v / 1000).toFixed(1)}B`;
  images.push({
    out: join(data, 'og-gold-top-export.png'), title: gold.title, source: 'US Census Bureau',
    key: `US exports over the 12 months to ${month(t.month)}.`,
    rows: [['Gold', t.gold, ORANGE, true], ['Crude oil', t.crude, BLUE], ['Pharmaceuticals', t.pharma, TEAL], ['Aircraft engines', t.engines, GREY]].map(([label, value, colour, strong]) => ({ label, value, text: b(value), colour, strong })),
  });
}
const fuel = load('fuel-minutes-of-work');
if (fuel) {
  const l = fuel.work.latest;
  images.push({
    out: join(data, 'og-fuel-minutes-of-work.png'), title: fuel.title, source: 'EIA, BLS',
    key: `Minutes of average US hourly pay to buy a gallon, ${month(l.month)}.`,
    figures: [{ value: `${l.dieselMinutes.toFixed(1)} min`, label: 'Diesel', colour: ORANGE }, { value: `${l.gasMinutes.toFixed(1)} min`, label: 'Regular gas', colour: BLUE }],
  });
}
renderOgImages({ name: 'US Energy Price Monitor', icon: '⚡', url: 'kadoa.com/energy-prices' }, images);
