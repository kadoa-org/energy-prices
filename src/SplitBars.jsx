import React from 'react';

// One full-width bar per row, split into parts that add up to the whole, like a pie laid flat: each part's share of
// the row's total sets its width. A part may print its own label inside when it is wide enough. The row's total goes
// in a column at the end, so rows of very different sizes still compare by share.
export default function SplitBars({ rows, keys, head, inside = () => null }) {
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 30)}ch`;
  return <div className="split" style={{ '--split-name': nameWidth }}>
    <div className="split__key" aria-hidden="true">{keys.map((k) => <span key={k.label}><i style={{ background: k.colour }} />{k.label}</span>)}</div>
    <div className="split__row split__row--head" aria-hidden="true"><span /><span /><span className="split__head">{head}</span></div>
    <ol className="split__list">
      {rows.map((r) => {
        const total = r.parts.reduce((t, p) => t + p.value, 0);
        return <li className="split__row" key={r.name} title={`${r.name}: ${r.parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}`}>
          <span className="split__name">{r.name}{r.note && <span className="split__note"> {r.note}</span>}</span>
          <span className="split__bar">
            {r.parts.map((p) => {
              const share = total ? (p.value / total) * 100 : 0;
              const text = share >= 20 ? inside(p, share) : null;
              return share > 0 && <span className="split__part" key={p.label} style={{ width: `${share}%`, background: p.colour, color: p.ink ?? '#fff' }}>{text}</span>;
            })}
          </span>
          <span className="split__total">{r.total}</span>
        </li>;
      })}
    </ol>
  </div>;
}
