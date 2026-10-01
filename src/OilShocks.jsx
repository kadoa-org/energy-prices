import React, { useEffect, useRef, useState } from 'react';

// The oil price since 1970 with each shock labelled at its peak (Covid at its low), drawn as SVG at the card's own
// width so text stays readable: a phone keeps the four most recent labels. Colours follow the UKHSA dashboard:
// GOV.UK dark blue line, grey secondary text, 5% black gridlines.
const BLUE = '#12436d', MUTED = '#6b7276', INK = '#0b0c0c', GRID = 'rgba(0,0,0,0.05)', AXIS = 'rgba(0,0,0,0.35)';
// Label offsets in pixels at full width: [above the point, sideways], or 'side' for a label to the left of a low.
const PLACE = {
  'OPEC embargo': [-40, 0], 'Iran revolution': [-26, 0], 'First Gulf War': [-26, 0], 'Second Gulf War': [-110, -60],
  'Financial crisis': [-16, 0], 'Covid-19 pandemic': 'side', 'Russia invades Ukraine': [-26, -60], 'Iran war': [-64, -20],
};
const t = (d) => Date.parse(`${d}T00:00:00Z`);

export default function OilShocks({ history }) {
  const box = useRef(null);
  const [width, setWidth] = useState(1100);
  useEffect(() => {
    if (!box.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const narrow = width < 640;
  const H = narrow ? 300 : 520, P = { l: narrow ? 40 : 52, r: narrow ? 44 : 56, t: 34, b: 30 };
  const { points, shocks, latest } = history;
  const x0 = t(points[0][0]), x1 = t(latest.date);
  const x = (d) => P.l + ((t(d) - x0) / (x1 - x0)) * (width - P.l - P.r);
  const max = Math.ceil(Math.max(...points.map((p) => p[1])) / 20) * 20;
  const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const k = narrow ? 0.6 : 1;
  const ticks = []; for (let v = 0; v <= max; v += narrow ? 40 : 20) ticks.push(v);
  const years = []; for (let yr = 1970; yr <= 2020; yr += narrow ? 10 : 5) years.push(yr);
  const shown = narrow ? shocks.slice(-4) : shocks;
  const path = points.map(([d, v], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const label = `Crude oil price since 1970: ${shocks.map((s) => `${s.name} $${Math.round(s.value)}`).join(', ')}; $${Math.round(latest.value)} a barrel in the week of ${latest.date}.`;
  return <div ref={box} className="oil-shocks">
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => <g key={v}><line x1={P.l} x2={width - P.r} y1={y(v)} y2={y(v)} stroke={v ? GRID : AXIS} /><text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="oil-shocks__tick">${v}</text></g>)}
      {years.map((yr) => <g key={yr}><line x1={x(`${yr}-01-01`)} x2={x(`${yr}-01-01`)} y1={H - P.b} y2={H - P.b + 5} stroke={AXIS} /><text x={x(`${yr}-01-01`)} y={H - 10} textAnchor="middle" className="oil-shocks__tick">{yr}</text></g>)}
      <path d={path} fill="none" stroke={BLUE} strokeWidth={narrow ? 1.5 : 2} strokeLinejoin="round" />
      {shown.map((s) => {
        const px = x(s.date), py = y(s.value), place = PLACE[s.name] ?? [-26, 0];
        if (place === 'side') return <g key={s.name}><line x1={px - 5} x2={px - 18} y1={py} y2={py} stroke={MUTED} /><text x={px - 22} y={py + 4} textAnchor="end" className="oil-shocks__note">{s.name}</text></g>;
        const ly = py + place[0] * k, lx = px + place[1] * k;
        return <g key={s.name}><line x1={px} x2={px} y1={ly + 7} y2={py - 4} stroke={MUTED} /><text x={lx} y={ly} textAnchor="middle" className="oil-shocks__note">{s.name}</text></g>;
      })}
      <line x1={x(latest.date) + 3} x2={x(latest.date) + 10} y1={y(latest.value)} y2={y(latest.value)} stroke={MUTED} />
      <text x={x(latest.date) + 13} y={y(latest.value) + 5} className="oil-shocks__end">${Math.round(latest.value)}</text>
    </svg>
  </div>;
}
