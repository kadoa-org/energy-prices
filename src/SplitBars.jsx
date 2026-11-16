import React from 'react';

// One full-width bar per row, split into parts that add up to the whole, like a pie laid flat: each part's share of
// the row's total sets its width. A part prints its own label inside when it is wide enough; on a phone only the
// wider parts keep theirs. Rows may come in titled groups. Each row's total goes in a column at the end.
export default function SplitBars({ rows, groups = [{ rows }], keys, head, inside = () => null }) {
  const all = groups.flatMap((g) => g.rows);
  const nameWidth = `${Math.min(Math.max(...all.map((r) => r.name.length), 8) + 1, 30)}ch`;
  return <div className="split" style={{ '--split-name': nameWidth }}>
    <div className="split__key" aria-hidden="true">{keys.map((k) => <span key={k.label}><i style={{ background: k.colour }} />{k.label}</span>)}</div>
    {head && <div className="split__row split__row--head" aria-hidden="true"><span /><span /><span className="split__head">{head}</span></div>}
    {groups.map((g, gi) => <section className="split__group" key={g.label ?? gi}>
      {g.label && <h3 className="split__group-title">{g.label}{g.note && <span className="split__note"> {g.note}</span>}</h3>}
      <ol className="split__list">
        {g.rows.map((r) => {
          const total = r.parts.reduce((t, p) => t + p.value, 0);
          return <li className="split__row" key={r.name} title={`${r.name}: ${r.parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}`}>
            <span className="split__name">{r.name}</span>
            <span className="split__bar">
              {r.parts.map((p) => {
                const share = total ? (p.value / total) * 100 : 0;
                return share > 0 && <span className={`split__part${share < 30 ? ' split__part--narrow' : ''}`} key={p.label} style={{ width: `${share}%`, background: p.colour, color: p.ink ?? '#fff' }}>{share >= 12 ? inside(p, share) : null}</span>;
              })}
            </span>
            <span className="split__total">{r.total}</span>
          </li>;
        })}
      </ol>
    </section>)}
  </div>;
}
