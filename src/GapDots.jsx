import React from 'react';

// Two dots per row on one scale from zero, joined by a line: the investor-owned and nonprofit price change in each
// state. Rows come sorted by the gap, so where the investor-owned dot sits right of the other, it rose faster, and a
// divider marks where that stops. Built on the labelled ranking's row layout, so names line up with the bar charts.
export default function GapDots({ rows, a, b, format, divider }) {
  const max = Math.ceil(Math.max(...rows.flatMap((r) => [r.a, r.b])) / 10) * 10;
  const ticks = Array.from({ length: max / 20 + 1 }, (_, i) => i * 20).filter((t) => t <= max);
  const at = (v) => `${(Math.max(v, 0) / max) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 24)}ch`;
  const split = rows.findIndex((r) => r.a <= r.b);
  return <div className="ranking ranking--labelled dots" style={{ '--ranking-name': nameWidth }}>
    <div className="ranking__row ranking__row--label" aria-hidden="true">
      <span />
      <span className="ranking__track">{ticks.map((t) => <span className="dots__tick" key={t} style={{ left: at(t) }}>{t}%</span>)}</span>
    </div>
    <ol className="ranking__list">
      {rows.map((r, i) => <React.Fragment key={r.name}>
        {i === split && split > 0 && <li className="dots__divider">{divider(rows.length - split)}</li>}
        <li className="ranking__row" title={`${r.name}: ${a.label} ${format(r.a)}, ${b.label} ${format(r.b)}`}>
          {r.href ? <a className="ranking__name" href={r.href}>{r.name}</a> : <span className="ranking__name ranking__name--plain">{r.name}</span>}
          <span className="ranking__track">
            {ticks.map((t) => <span className="dots__grid" key={t} style={{ left: at(t) }} aria-hidden="true" />)}
            <span className="dots__line" style={{ left: at(Math.min(r.a, r.b)), width: `calc(${at(Math.max(r.a, r.b))} - ${at(Math.min(r.a, r.b))})` }} />
            <span className="dots__dot" style={{ left: at(r.b), background: b.colour }} />
            <span className="dots__dot" style={{ left: at(r.a), background: a.colour }} />
          </span>
        </li>
      </React.Fragment>)}
    </ol>
  </div>;
}
