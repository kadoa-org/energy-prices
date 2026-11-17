import React from 'react';

// One bar per row, its length the row's value against the largest, with the value printed after it. Shares the
// split bar layout so it sits beside SplitBars charts with the same name column.
export default function ValueBars({ rows, colour, format = (v) => v, head }) {
  const max = Math.max(...rows.map((r) => r.value));
  const nameWidth = `${Math.min(Math.max(...rows.map((r) => r.name.length), 8) + 1, 30)}ch`;
  // The value column fits its longest label.
  const totalWidth = `${Math.max(...rows.map((r) => String(format(r.value)).length)) + 1}ch`;
  return <div className="split" style={{ '--split-name': nameWidth, '--split-total': totalWidth }}>
    {head && <div className="split__row split__row--head" aria-hidden="true"><span /><span /><span className="split__head">{head}</span></div>}
    <ol className="split__list">
      {rows.map((r) => <li className="split__row" key={r.name}>
        <span className="split__name">{r.name}</span>
        <span className="split__bar split__bar--value"><span className="split__part" style={{ width: `${(r.value / max) * 100}%`, background: r.colour ?? colour }} /></span>
        <span className="split__total">{format(r.value)}</span>
      </li>)}
    </ol>
  </div>;
}
