import React, { useState } from 'react';
import { FilterSelect } from './Figures';
import { cents, monthLabel } from './model.mjs';

// One square per state, laid out like the US map, coloured by how far the 12-month average home electricity price has
// moved since 2019, with inflation over the same period as the dividing line. Each tile links to its state page.
// Tile grid, 12 columns by 8 rows, checked against a state map. Maine, the northernmost state in the East, stands
// alone above New Hampshire, with Vermont beside New Hampshire; Massachusetts sits over
// Connecticut and Rhode Island, New York over Pennsylvania, New Jersey on the coast over Delaware. Wisconsin is north
// of Illinois, Illinois west of Indiana, Michigan over Indiana and Ohio with the Great Lakes gap. Nevada sits above
// Utah, the usual tile-map compromise for the West.
export const GRID = {
  AK: [0, 0], ME: [10, 0],
  VT: [9, 1], NH: [10, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], WI: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IL: [6, 3], IN: [7, 3], OH: [8, 3], PA: [9, 3], CT: [10, 3], RI: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], NJ: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5], DE: [10, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [8, 7],
};

// Change bins on the rounded percent a tile prints, so two tiles showing the same number never differ in colour: two
// blues at or below inflation, three oranges above it.
export function changeBins(cpi) {
  const c = Math.round(cpi);
  return [
    { max: 19, cls: 'tile--b2', label: 'Under 20%' },
    { max: c, cls: 'tile--b1', label: `20% to ${c}%` },
    { max: 45, cls: 'tile--o1', label: `${c + 1}% to 45%` },
    { max: 60, cls: 'tile--o2', label: '46% to 60%' },
    { max: Infinity, cls: 'tile--o3', label: 'Over 60%' },
  ];
}
// Price bins in cents a kWh on the one-decimal price a tile prints, light to dark as the price rises. A separate hue
// from the change view, so switching views never suggests blue still means "below inflation".
export const PRICE_BINS = [
  { max: 13.95, cls: 'tile--p1', label: 'Under 14¢' },
  { max: 17.95, cls: 'tile--p2', label: '14¢ to 18¢' },
  { max: 21.95, cls: 'tile--p3', label: '18¢ to 22¢' },
  { max: 27.95, cls: 'tile--p4', label: '22¢ to 28¢' },
  { max: Infinity, cls: 'tile--p5', label: '28¢ or more' },
];
export const binFor = (bins, v, rounding) => bins.find((b) => rounding(v) <= b.max);
const round1 = (v) => Math.round(v * 10) / 10;
const VIEWS = [['change', 'Change since 2019'], ['price', 'Price now']];

export default function TileMap({ states, cpi, usChange, usPrice, month, href }) {
  const [view, setView] = useState('change');
  const byCode = Object.fromEntries(states.filter((s) => s.code).map((s) => [s.code, s]));
  const placed = Object.entries(GRID).filter(([code]) => byCode[code]);
  if (placed.length < 45) return null;
  const isPrice = view === 'price';
  const scale = isPrice ? PRICE_BINS : changeBins(cpi.change);
  const binOf = (v) => (isPrice ? binFor(PRICE_BINS, v, round1) : binFor(scale, v, Math.round));
  // Change lines share one scale in percent, price lines one scale in cents, so heights compare across tiles.
  const at = isPrice ? (p) => p[2] * 100 : (p) => p[1];
  const all = placed.flatMap(([code]) => byCode[code].trend.map(at));
  const lo = isPrice ? Math.min(...all) : Math.min(0, ...all), hi = Math.max(...all);
  const faster = placed.filter(([code]) => Math.round(byCode[code].priceSince2019) > Math.round(cpi.change)).length;
  const byPrice = [...placed].map(([code]) => byCode[code]).sort((a, b) => b.price12 - a.price12);
  return (
    <div className="tilemap">
      <div className="tilemap__controls"><FilterSelect label="Show" value={view} options={VIEWS} onChange={setView} /></div>
      <p className="dk-hint table-intro tilemap__intro">
        {isPrice
          ? <>Average price for homes over the 12 months to {monthLabel(month)}. The US average is {cents(usPrice)} a kWh; {byPrice[0].name} pays the most at {cents(byPrice[0].price12)} and {byPrice.at(-1).name} the least at {cents(byPrice.at(-1).price12)}.</>
          : <>Change in the 12-month average price since 2019. The US average rose {Math.round(usChange)}%, all prices {Math.round(cpi.change)}%. {faster} of {placed.length} rose faster than inflation.</>}
      </p>
      <ul className="tilemap__legend" aria-hidden="true">
        {scale.map((b) => <li key={b.label}><span className={`tilemap__swatch ${b.cls}`} />{b.label}</li>)}
        {!isPrice && <li className="tilemap__key"><b>{cents(usPrice)}</b> = price a kWh now</li>}
      </ul>
      <ol className="tilemap__grid">
        {placed.map(([code, [col, row]]) => {
          const s = byCode[code], v = isPrice ? s.price12 : s.priceSince2019;
          const pts = s.trend.map((p, i) => `${((i / (s.trend.length - 1)) * 100).toFixed(1)},${(30 - ((at(p) - lo) / (hi - lo)) * 28).toFixed(1)}`).join(' ');
          const label = isPrice ? cents(v) : `+${Math.round(v)}%`;
          return (
            <li key={code} className={`tile ${binOf(v).cls}`} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              <a href={href(s.slug)} aria-label={isPrice ? `${s.name}: ${cents(v)} a kWh` : `${s.name}: up ${Math.round(v)}% since 2019`}>
                <span className="tile__code">{code}</span>
                <span className="tile__pct">{label}</span>
                {!isPrice && <span className="tile__price">{cents(s.price12)}</span>}
                <svg className="tile__line" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} /></svg>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
