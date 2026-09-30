import React from 'react';

// One square per state, laid out like the US map, coloured by how far the 12-month average home electricity price has
// moved since 2019, with inflation over the same period as the dividing line. Each tile links to its state page.
// Tile grid, 12 columns by 8 rows, checked against a state map. Maine, the northernmost state in the East, stands
// alone above New Hampshire, with Vermont beside New Hampshire; Massachusetts sits over
// Connecticut and Rhode Island, New York over Pennsylvania, New Jersey on the coast over Delaware. Wisconsin is north
// of Illinois, Illinois west of Indiana, Michigan over Indiana and Ohio with the Great Lakes gap. Nevada sits above
// Utah, the usual tile-map compromise for the West.
const GRID = {
  AK: [0, 0], ME: [10, 0],
  VT: [9, 1], NH: [10, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], WI: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IL: [6, 3], IN: [7, 3], OH: [8, 3], PA: [9, 3], CT: [10, 3], RI: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], NJ: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5], DE: [10, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [8, 7],
};

// Bins on the rounded percent a tile prints, so two tiles showing the same number never differ in colour. The two
// blues are at or below inflation, the three oranges above it.
function bins(cpi) {
  const c = Math.round(cpi);
  return [
    { max: 19, cls: 'tile--b2', label: 'Under 20%' },
    { max: c, cls: 'tile--b1', label: `20% to ${c}%` },
    { max: 45, cls: 'tile--o1', label: `${c + 1}% to 45%` },
    { max: 60, cls: 'tile--o2', label: '46% to 60%' },
    { max: Infinity, cls: 'tile--o3', label: 'Over 60%' },
  ];
}

export default function TileMap({ states, cpi, usChange, href }) {
  const byCode = Object.fromEntries(states.filter((s) => s.code).map((s) => [s.code, s]));
  const placed = Object.entries(GRID).filter(([code]) => byCode[code]);
  if (placed.length < 45) return null;
  const scale = bins(cpi.change);
  const binOf = (v) => scale.find((b) => Math.round(v) <= b.max);
  const all = placed.flatMap(([code]) => byCode[code].trend.map((p) => p[1]));
  const lo = Math.min(0, ...all), hi = Math.max(...all);
  const faster = placed.filter(([code]) => Math.round(byCode[code].priceSince2019) > Math.round(cpi.change)).length;
  return (
    <div className="tilemap">
      <p className="tilemap__intro">
        Change in the 12-month average price since 2019. The US average rose {Math.round(usChange)}%, all prices {Math.round(cpi.change)}%
        {cpi.months < 12 ? ' (BLS published no index for October 2025)' : ''}. {faster} of {placed.length} rose faster than inflation.
      </p>
      <ul className="tilemap__legend" aria-hidden="true">
        {scale.map((b) => <li key={b.label}><span className={`tilemap__swatch ${b.cls}`} />{b.label}</li>)}
      </ul>
      <ol className="tilemap__grid">
        {placed.map(([code, [col, row]]) => {
          const s = byCode[code], v = s.priceSince2019;
          // Shared scale for every line, so their heights compare across tiles.
          const pts = s.trend.map((p, i) => `${((i / (s.trend.length - 1)) * 100).toFixed(1)},${(30 - ((p[1] - lo) / (hi - lo)) * 28).toFixed(1)}`).join(' ');
          return (
            <li key={code} className={`tile ${binOf(v).cls}`} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              <a href={href(s.slug)} aria-label={`${s.name}: up ${Math.round(v)}% since 2019`}>
                <span className="tile__code">{code}</span>
                <span className="tile__pct">+{Math.round(v)}%</span>
                <svg className="tile__line" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} /></svg>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
