import React from 'react';

// How home prices spread within each kind of utility: one histogram per owner, stacked on one scale, each bar the share
// of the group's homes whose utility's average price falls in a 2-cent band. HTML bars rather than a canvas, so the
// labels keep their size at phone width. Tick labels sit in a gutter left of the bars, so a tall bar never covers one.
export default function PriceSpread({ edges, panels }) {
  const bands = edges.length + 1;
  const label = (i) => (i === 0 ? `under ${edges[0]}¢` : i === edges.length ? `${edges.at(-1)}¢ or more` : `${edges[i - 1]} to ${edges[i]}¢`);
  const max = Math.ceil(Math.max(...panels.flatMap((p) => p.shares)) / 10) * 10;
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);
  // Axis labels at the 10, 20 and 30 cent edges; the last band is everything from 30 cents.
  const axis = [10, 20, 30].map((c) => ({ c, at: edges.indexOf(c) + 1 })).filter((t) => t.at > 0);
  return <div className="spread">
    {panels.map((p) => <figure className="spread__panel" key={p.key}>
      <figcaption className="spread__caption"><strong style={{ color: p.colour }}>{p.label}</strong> {p.note}</figcaption>
      <div className="spread__plot" role="img" aria-label={`${p.label}: ${p.shares.map((s, i) => `${s}% of homes at ${label(i)}`).join(', ')}.`}>
        {ticks.map((t) => <div className={`spread__grid${t === 0 ? ' spread__grid--base' : ''}`} key={t} style={{ bottom: `${(t / max) * 100}%` }}>
          <span className="spread__tick">{t}%</span>
        </div>)}
        <div className="spread__bars" style={{ '--bands': bands }}>
          {p.shares.map((s, i) => <div className="spread__band" key={i} title={`${label(i)}: ${s}% of homes`}><span className="spread__bar" style={{ height: `${(s / max) * 100}%`, background: p.colour }} /></div>)}
        </div>
      </div>
      <div className="spread__axis" aria-hidden="true">
        {axis.map((t) => <span key={t.c} style={{ left: `${(t.at / bands) * 100}%` }}>{t.c}¢{t.c === edges.at(-1) ? '+' : ''}</span>)}
      </div>
    </figure>)}
  </div>;
}
