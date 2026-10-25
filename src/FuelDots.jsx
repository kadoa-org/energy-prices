import React from 'react';

// One row per model, one dot per version (gas, hybrid, diesel, electric) on a dollar scale from zero, joined by a line
// from the cheapest to the dearest. Each dot carries its value: the dearest to its right, the others to their left,
// so labels never sit between two dots of the same row. Built on the labelled ranking's row layout.
export default function FuelDots({ rows, keys, format, step = 50 }) {
  // A tenth of headroom past the dearest dot, so its label to the right stays inside the chart.
  const max = Math.ceil((Math.max(...rows.flatMap((r) => r.dots.map((d) => d.value))) * 1.1) / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const at = (v) => `${(v / max) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 24)}ch`;
  return <div className="ranking ranking--labelled dots fdots" style={{ '--ranking-name': nameWidth }}>
    <div className="fdots__key" aria-hidden="true">{keys.map((k) => <span key={k.label}><i style={{ background: k.colour }} />{k.label}</span>)}</div>
    <div className="ranking__row ranking__row--label" aria-hidden="true">
      <span />
      <span className="ranking__track">{ticks.map((t) => <span className="dots__tick" key={t} style={{ left: at(t) }}>{format(t)}</span>)}</span>
    </div>
    <ol className="ranking__list">
      {rows.map((r) => {
        const dots = [...r.dots].sort((a, b) => a.value - b.value), lo = dots[0].value, hi = dots.at(-1).value;
        return <li className="ranking__row" key={r.name} title={`${r.name}: ${dots.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
          <span className="ranking__name ranking__name--plain">{r.name}</span>
          <span className="ranking__track">
            {ticks.map((t) => <span className="dots__grid" key={t} style={{ left: at(t) }} aria-hidden="true" />)}
            {dots.length > 1 && <span className="dots__line" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />}
            {dots.map((d) => <span className="dots__dot" key={d.label} style={{ left: at(d.value), background: d.colour }} />)}
            {dots.map((d, i) => <span className={`fdots__val${i === dots.length - 1 ? ' fdots__val--right' : ''}`} key={`v${d.label}`} style={{ left: at(d.value) }}>{format(d.value)}</span>)}
          </span>
        </li>;
      })}
    </ol>
  </div>;
}
