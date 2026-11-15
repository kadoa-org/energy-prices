import React from 'react';

// Two dots per row on one scale from zero: an open dot for the cost of what was built for a group, a filled one for
// what it paid, joined by a line, with both figures in columns at the end. Rows may come in titled groups. Built like the
// price-gap dumbbells, so names and tracks line up with the other charts.
export default function CausedBilled({ groups, format, tick, step, labels: [forLabel, paidLabel] = ['For them', 'Paid'] }) {
  const rows = groups.flatMap((g) => g.rows);
  const max = Math.ceil(Math.max(...rows.flatMap((r) => [r.caused, r.billed])) / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const at = (v) => `${(Math.max(v, 0) / max) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 30)}ch`;
  return <div className="cb" style={{ '--cb-name': nameWidth }}>
    <div className="cb__key" aria-hidden="true"><span><i className="cb__open" />{forLabel}</span><span><i className="cb__filled" />{paidLabel}</span></div>
    <div className="cb__row cb__row--axis" aria-hidden="true">
      <span />
      <span className="cb__track">{ticks.map((t) => <span className="cb__tick" key={t} style={{ left: at(t) }}>{tick(t)}</span>)}</span>
      <span className="cb__head">{forLabel}</span><span className="cb__head">{paidLabel}</span>
    </div>
    {groups.map((g) => <section key={g.label ?? 'rows'} className="cb__group">
      {g.label && <h3 className="cb__group-title">{g.label}{g.note && <span className="cb__group-note"> {g.note}</span>}</h3>}
      <ol className="cb__list">
        {g.rows.map((r) => <li className="cb__row" key={r.name} title={`${r.name}: ${forLabel.toLowerCase()} ${format(r.caused)}, ${paidLabel.toLowerCase()} ${format(r.billed)}`}>
          <span className="cb__name">{r.name}</span>
          <span className="cb__track">
            {ticks.map((t) => <span className="cb__grid" key={t} style={{ left: at(t) }} aria-hidden="true" />)}
            <span className="cb__line" style={{ left: at(Math.min(r.caused, r.billed)), width: `calc(${at(Math.max(r.caused, r.billed))} - ${at(Math.min(r.caused, r.billed))})`, background: r.colour }} />
            <span className="cb__dot cb__dot--open" style={{ left: at(r.caused), borderColor: r.colour }} />
            <span className="cb__dot" style={{ left: at(r.billed), background: r.colour }} />
          </span>
          <span className="cb__val">{format(r.caused)}</span>
          <span className="cb__val cb__val--strong" style={{ color: r.text ?? r.colour }}>{format(r.billed)}</span>
        </li>)}
      </ol>
    </section>)}
  </div>;
}
