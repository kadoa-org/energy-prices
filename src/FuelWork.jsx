import React, { useEffect, useRef, useState } from 'react';
import { SERIES_COLOURS } from './LineChart';

// Minutes of work per gallon of diesel and regular gas since 1994, drawn as SVG at the card's own width like the oil
// shocks chart. Each event is labelled at its peak with both values; the line ends name the series, so there is no
// legend. A phone keeps the two most recent events.
const GAS = SERIES_COLOURS[0], DIESEL = SERIES_COLOURS[1], MUTED = '#6b7276', GRID = 'rgba(0,0,0,0.05)', AXIS = 'rgba(0,0,0,0.35)';
const mt = (m) => Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 0.5) / 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthText = (m) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
// Label placement at full width: 'below' for a low, 'left' to end at the point, 'high' for a raised label with a leader.
const PLACE = { 'Second Gulf War': 'left', 'Covid-19 pandemic': 'below', 'Russia invades Ukraine': 'left', 'Iran war': 'high' };

export default function FuelWork({ work }) {
  const box = useRef(null);
  const [width, setWidth] = useState(1100);
  useEffect(() => {
    if (!box.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const narrow = width < 640;
  const { rows, events, latest, widestGap } = work;
  const H = narrow ? 340 : 520, P = { l: narrow ? 30 : 36, r: narrow ? 92 : 170, t: narrow ? 54 : 64, b: 30 };
  const x0 = mt(rows[0].month), x1 = mt(latest.month);
  const x = (m) => P.l + ((mt(m) - x0) / (x1 - x0)) * (width - P.l - P.r);
  const max = Math.ceil(Math.max(...rows.map((r) => r.dieselMinutes)) / 2) * 2;
  const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = []; for (let v = 0; v <= max; v += narrow ? 4 : 2) ticks.push(v);
  const years = []; for (let yr = 1995; yr <= 2025; yr += narrow ? 10 : 5) years.push(yr);
  const path = (k) => rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.month).toFixed(1)},${y(r[k]).toFixed(1)}`).join('');
  const shown = narrow ? events.filter((e) => e.name === 'Financial crisis' || e.name === 'Iran war') : events;
  const vals = (e) => <><tspan fill={DIESEL}>{e.dieselMinutes.toFixed(1)}</tspan><tspan fill={MUTED} fontWeight="400"> / </tspan><tspan fill={GAS}>{e.gasMinutes.toFixed(1)} min</tspan></>;
  const gap = latest.dieselMinutes - latest.gasMinutes;
  const label = `Minutes of work per gallon since 1994. ${events.map((e) => `${e.name} (${e.month.slice(0, 4)}): diesel ${e.dieselMinutes.toFixed(1)}, gas ${e.gasMinutes.toFixed(1)}`).join('; ')}. ${monthText(latest.month)}: diesel ${latest.dieselMinutes.toFixed(1)}, gas ${latest.gasMinutes.toFixed(1)} minutes${widestGap ? ', the widest gap on record' : ''}.`;
  return <div ref={box} className="fuel-work">
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => <g key={v}><line x1={P.l} x2={x(latest.month)} y1={y(v)} y2={y(v)} stroke={v ? GRID : AXIS} /><text x={0} y={y(v) - 5} className="fuel-work__tick">{v}{v === ticks.at(-1) ? (narrow ? ' min' : ' minutes of work per gallon') : ''}</text></g>)}
      {years.map((yr) => <g key={yr}><line x1={x(`${yr}-01`)} x2={x(`${yr}-01`)} y1={H - P.b} y2={H - P.b + 5} stroke={AXIS} /><text x={x(`${yr}-01`)} y={H - 10} textAnchor="middle" className="fuel-work__tick">{yr}</text></g>)}
      <path d={path('gasMinutes')} fill="none" stroke={GAS} strokeWidth={narrow ? 1.5 : 2} strokeLinejoin="round" />
      <path d={path('dieselMinutes')} fill="none" stroke={DIESEL} strokeWidth={narrow ? 1.5 : 2} strokeLinejoin="round" />
      {shown.map((e) => {
        const px = x(e.month), dy = y(e.dieselMinutes), gy = y(e.gasMinutes), place = narrow ? (e.name === 'Iran war' ? 'high' : 'right') : PLACE[e.name] ?? 'up';
        const dots = <><circle cx={px} cy={dy} r="3.5" fill={DIESEL} stroke="#fff" strokeWidth="1.5" /><circle cx={px} cy={gy} r="3.5" fill={GAS} stroke="#fff" strokeWidth="1.5" /></>;
        if (place === 'high') {
          // A phone ends the label at the point, so it clears the 2008 label on the left.
          const lx = narrow ? px - 6 : Math.min(px, x(latest.month) - 30), ly = P.t - (narrow ? 34 : 40), anchor = narrow ? 'end' : 'middle';
          return <g key={e.name}>{dots}<path d={`M${narrow ? px - 2 : lx},${ly + 24}L${px},${dy - 8}`} fill="none" stroke={MUTED} /><text x={lx} y={ly} textAnchor={anchor} className="fuel-work__note halo">{e.month.slice(0, 4)}, {e.name}</text><text x={lx} y={ly + 18} textAnchor={anchor} className="fuel-work__val halo">{vals(e)}</text></g>;
        }
        // A phone stacks the label left of the peak, clear of the Iran war leader line on the right.
        if (place === 'right') return <g key={e.name}>{dots}<text x={px - 8} y={dy + 14} textAnchor="end" className="fuel-work__note halo">{e.month.slice(0, 4)}</text><text x={px - 8} y={dy + 30} textAnchor="end" className="fuel-work__val halo">{vals(e)}</text></g>;
        if (place === 'below') return <g key={e.name}>{dots}<text x={px} y={gy + 24} textAnchor="middle" className="fuel-work__val halo">{vals(e)}</text><text x={px} y={gy + 42} textAnchor="middle" className="fuel-work__note halo">{e.month.slice(0, 4)}, {e.name}</text></g>;
        const anchor = place === 'left' ? 'end' : 'middle', lx = place === 'left' ? px - 8 : px;
        return <g key={e.name}>{dots}<text x={lx} y={dy - 30} textAnchor={anchor} className="fuel-work__note halo">{e.month.slice(0, 4)}, {e.name}</text><text x={lx} y={dy - 12} textAnchor={anchor} className="fuel-work__val halo">{vals(e)}</text></g>;
      })}
      <circle cx={x(latest.month)} cy={y(latest.dieselMinutes)} r="4.5" fill={DIESEL} stroke="#fff" strokeWidth="1.5" />
      <circle cx={x(latest.month)} cy={y(latest.gasMinutes)} r="4.5" fill={GAS} stroke="#fff" strokeWidth="1.5" />
      <text x={x(latest.month) + 10} y={y(latest.dieselMinutes) - 20} className="fuel-work__note">{monthText(latest.month)}</text>
      <text x={x(latest.month) + 10} y={y(latest.dieselMinutes) + 5} className="fuel-work__end" fill={DIESEL}>{narrow ? '' : 'Diesel '}{latest.dieselMinutes.toFixed(1)} min</text>
      <text x={x(latest.month) + 10} y={y(latest.gasMinutes) + 5} className="fuel-work__end" fill={GAS}>{narrow ? '' : 'Gas '}{latest.gasMinutes.toFixed(1)} min</text>
      {widestGap && !narrow && <>
        <line x1={x(latest.month) + 4} x2={x(latest.month) + 4} y1={y(latest.dieselMinutes) + 12} y2={y(latest.gasMinutes) - 12} stroke={MUTED} />
        <text x={x(latest.month) + 12} y={(y(latest.dieselMinutes) + y(latest.gasMinutes)) / 2 - 3} className="fuel-work__note">{gap.toFixed(1)} min apart,</text>
        <text x={x(latest.month) + 12} y={(y(latest.dieselMinutes) + y(latest.gasMinutes)) / 2 + 15} className="fuel-work__note">widest on record</text>
      </>}
    </svg>
  </div>;
}
