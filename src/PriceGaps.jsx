import React from 'react';

// A dumbbell per comparison: the investor-owned price and the price it is compared with, joined by a line, with the
// gap at the end of the row. The key names every dot colour used; a row's colour may be a gradient for a mixed group.
// Positions encode the price, so the scale need not start at zero; it spans the prices with a little room. Names
// line up with the labelled bar charts on the same page.
export default function PriceGaps({ rows, a, keys = [], format, gap, step = 2 }) {
  const values = rows.flatMap((r) => [r.a, r.b]);
  const min = Math.floor(Math.min(...values) / step) * step - step, max = Math.ceil(Math.max(...values) / step) * step + step;
  const ticks = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
  const at = (v) => `${((v - min) / (max - min)) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 30)}ch`;
  return <div className="pgaps" style={{ '--pgaps-name': nameWidth }}>
    <div className="pgaps__key" aria-hidden="true">
      {[a, ...keys].map((k) => <span key={k.label}><i style={{ background: k.colour }} />{k.label}</span>)}
    </div>
    <div className="pgaps__row pgaps__row--axis" aria-hidden="true">
      <span />
      <span className="pgaps__track">{ticks.map((t) => <span className="pgaps__tick" key={t} style={{ left: at(t) }}>{format(t, true)}</span>)}</span>
      <span className="pgaps__gap-head">Gap</span>
    </div>
    <ol className="pgaps__list">
      {rows.map((r) => <li className="pgaps__row" key={r.name} title={`${r.name}: ${a.label} ${format(r.a)}, compared with ${format(r.b)}, ${gap(r)}`}>
        <span className="pgaps__name">{r.name}</span>
        <span className="pgaps__track">
          {ticks.map((t) => <span className="pgaps__grid" key={t} style={{ left: at(t) }} aria-hidden="true" />)}
          <span className="pgaps__line" style={{ left: at(r.b), width: `calc(${at(r.a)} - ${at(r.b)})` }} />
          <span className="pgaps__dot" style={{ left: at(r.b), background: r.colour }} />
          <span className="pgaps__dot" style={{ left: at(r.a), background: a.colour }} />
          <span className="pgaps__val pgaps__val--b" style={{ left: at(r.b) }}>{format(r.b)}</span>
          <span className="pgaps__val pgaps__val--a" style={{ left: at(r.a), color: a.colour }}>{format(r.a)}</span>
        </span>
        <span className="pgaps__gap" style={{ color: a.colour }}>{gap(r)}</span>
      </li>)}
    </ol>
  </div>;
}
