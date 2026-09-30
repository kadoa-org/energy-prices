import React from 'react';

// One square per state, laid out like the US map, coloured by how far the 12-month average home electricity price has
// moved since 2019, with inflation over the same period as the dividing line. Each tile links to its state page.
// Tile grid, 12 columns by 7 rows, checked against a state map. Vermont, New Hampshire and Maine share the top row,
// level with the northern border states below them rather than towering over them; Massachusetts sits over
// Connecticut and Rhode Island, New York over Pennsylvania, New Jersey on the coast over Delaware. Wisconsin is north
// of Illinois, Illinois west of Indiana, Michigan over Indiana and Ohio with the Great Lakes gap. Nevada sits above
// Utah, the usual tile-map compromise for the West.
const GRID = {
  AK: [0, 0], VT: [9, 0], NH: [10, 0], ME: [11, 0],
  WA: [1, 1], ID: [2, 1], MT: [3, 1], ND: [4, 1], MN: [5, 1], WI: [6, 1], MI: [7, 1], NY: [9, 1], MA: [10, 1],
  OR: [1, 2], NV: [2, 2], WY: [3, 2], SD: [4, 2], IA: [5, 2], IL: [6, 2], IN: [7, 2], OH: [8, 2], PA: [9, 2], CT: [10, 2], RI: [11, 2],
  CA: [1, 3], UT: [2, 3], CO: [3, 3], NE: [4, 3], MO: [5, 3], KY: [6, 3], WV: [7, 3], VA: [8, 3], MD: [9, 3], NJ: [10, 3],
  AZ: [2, 4], NM: [3, 4], KS: [4, 4], AR: [5, 4], TN: [6, 4], NC: [7, 4], SC: [8, 4], DC: [9, 4], DE: [10, 4],
  OK: [4, 5], LA: [5, 5], MS: [6, 5], AL: [7, 5], GA: [8, 5],
  HI: [0, 6], TX: [4, 6], FL: [8, 6],
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
