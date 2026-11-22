import React, { useEffect, useRef, useState } from 'react';

// Global fossil CO2 emissions: one bar per year for the change on the year before, falls in blue, the projected year
// in orange with its range as a whisker, and past shocks named under their falls. Drawn as SVG at the card's own
// width, like OilShocks; a phone keeps the bars and the 2020 and projection labels.
const BLUE = '#12436d', ORANGE = '#c84c04', RISE = '#c3c6c8', MUTED = '#6b7276', INK = '#0b0c0c', GRID = 'rgba(0,0,0,0.05)', AXIS = 'rgba(0,0,0,0.45)';
const SHOCKS = [
  { years: [1974, 1975], name: '1973 oil crisis' },
  { years: [1980, 1981, 1982], name: '1979 oil crisis' },
  { years: [1992], name: 'Soviet collapse' },
  { years: [2009], name: 'Financial crisis' },
  { years: [2020], name: 'Covid', side: true, phone: true },
];
// Names that need a shorter form to fit a phone's width beside their value.
const SHORT_NAMES = { 'International flights and shipping': 'Flights and shipping' };
const pct = (v, d = 1) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(d)}%`;

function useWidth(initial) {
  const box = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!box.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return [box, width];
}

export default function Co2Changes({ rows, projection }) {
  const [box, width] = useWidth(1100);
  const narrow = width < 640;
  const H = narrow ? 320 : 440, P = { l: narrow ? 36 : 44, r: 4, t: narrow ? 64 : 44, b: 30 };
  const YMIN = -6, YMAX = 8, first = rows[0][0];
  const slot = (width - P.l - P.r) / rows.length, bw = Math.max(slot * 0.68, 1.5);
  const x = (year) => P.l + (year - first) * slot + slot / 2;
  const y = (v) => P.t + ((YMAX - v) / (YMAX - YMIN)) * (H - P.t - P.b);
  const by = Object.fromEntries(rows.map(([year, , change]) => [year, change]));
  const ticks = []; for (let v = narrow ? -4 : YMIN; v <= YMAX; v += narrow ? 4 : 2) ticks.push(v);
  const years = []; for (let yr = 1970; yr <= 2020; yr += narrow ? 20 : 10) years.push(yr);
  const px = x(projection.projectionYear), now = by[projection.projectionYear];
  const falls = rows.filter(([year, , c]) => c < 0 && year !== projection.projectionYear).map(([year]) => year);
  const label = `Yearly change in global fossil CO2 emissions since ${first}. Emissions fell in ${falls.join(', ')}. ${projection.projectionYear} is projected at ${pct(now)}, with a range of ${pct(projection.low)} to ${pct(projection.high)}.`;
  return <div ref={box} className="co2-changes">
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => <g key={v}><line x1={P.l} x2={width - P.r} y1={y(v)} y2={y(v)} stroke={v ? GRID : AXIS} /><text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="co2-changes__tick">{v ? pct(v, 0) : '0%'}</text></g>)}
      {years.map((yr) => <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" className="co2-changes__tick">{yr}</text>)}
      {rows.map(([year, , c]) => {
        const y0 = y(Math.max(c, 0)), y1 = y(Math.min(c, 0));
        return <rect key={year} x={x(year) - bw / 2} y={y0} width={bw} height={Math.max(y1 - y0, 1)} fill={year === projection.projectionYear ? ORANGE : c < 0 ? BLUE : RISE}><title>{`${year}: ${pct(c)}`}</title></rect>;
      })}
      <line x1={px} x2={px} y1={y(projection.high)} y2={y(projection.low)} stroke={INK} strokeWidth={1.5} />
      {[projection.low, projection.high].map((v) => <line key={v} x1={px - 5} x2={px + 5} y1={y(v)} y2={y(v)} stroke={INK} strokeWidth={1.5} />)}
      {SHOCKS.filter((s) => !narrow || s.phone).map((s) => {
        const worst = Math.min(...s.years.map((yr) => by[yr]));
        // A side label goes right of its bar, or left on a phone, where the right edge is too close.
        const cx = s.side ? x(s.years[0]) + (narrow ? -(bw / 2 + 6) : bw / 2 + 8) : (x(s.years[0]) + x(s.years.at(-1))) / 2;
        const ty = s.side ? y(worst) - 14 : y(worst) + 20, anchor = s.side ? (narrow ? 'end' : 'start') : 'middle';
        return <g key={s.name} className="co2-changes__label"><text x={cx} y={ty} textAnchor={anchor} className="co2-changes__value">{pct(worst)}</text><text x={cx} y={ty + 18} textAnchor={anchor} className="co2-changes__note">{s.name}</text></g>;
      })}
      {/* The projection's label sits above the 2020s bars, over its column. No leader line: one would run into the
          whisker and read as part of the range. */}
      <g className="co2-changes__label">
        <text x={px + 4} y={P.t - 32} textAnchor="end" className="co2-changes__value co2-changes__value--now">{projection.projectionYear}: {pct(now)}</text>
        <text x={px + 4} y={P.t - 14} textAnchor="end" className="co2-changes__note">Projected, {pct(projection.low)} to {pct(projection.high)}</text>
      </g>
    </svg>
  </div>;
}

// Projected change by region or fuel: a bar from zero for the central estimate and a whisker for the range, on one
// shared scale so the two lists compare. Rows without a range get the bar alone.
export function Co2Ranges({ rows, min = -4.5, max = 7.5 }) {
  const [box, width] = useWidth(900);
  const narrow = width < 640;
  // Name, then the value in its own column, then the plot, so a long range never runs into a label.
  // On a phone the name and value share a line above the bar, and the bars take the full width.
  const ROW = 34, NAME = narrow ? 0 : 290, VALUE = 64, top = narrow ? 22 : 0, rowH = narrow ? ROW + 20 : ROW;
  const H = rows.length * rowH + 28 + top;
  const left = narrow ? 12 : NAME + VALUE + 16;
  const x = (v) => left + ((v - min) / (max - min)) * (width - left - 8);
  const step = narrow ? 4 : 2, ticks = []; for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  return <div ref={box} className="co2-changes">
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={rows.map((r) => `${r.name} ${pct(r.change)}`).join(', ')}>
      {ticks.map((v) => <g key={v}><line x1={x(v)} x2={x(v)} y1={0} y2={H - 24} stroke={v ? GRID : AXIS} /><text x={x(v)} y={H - 6} textAnchor="middle" className="co2-changes__tick">{v ? pct(v, 0) : '0%'}</text></g>)}
      {rows.map((r, i) => {
        const cy = i * rowH + top + ROW / 2 + (narrow ? 10 : 0), fill = r.change < 0 ? BLUE : ORANGE;
        const x0 = x(Math.min(r.change, 0)), x1 = x(Math.max(r.change, 0));
        return <g key={r.name}>
          {narrow
            ? <text x={0} y={cy - 18} className="co2-changes__name">{SHORT_NAMES[r.name] ?? r.name} <tspan className="co2-changes__value" style={{ fill }}>{pct(r.change)}</tspan></text>
            : <><text x={NAME} y={cy + 5} textAnchor="end" className="co2-changes__name">{r.name}</text><text x={NAME + VALUE + 8} y={cy + 5} textAnchor="end" className="co2-changes__value" style={{ fill }}>{pct(r.change)}</text></>}
          <rect x={x0} y={cy - 9} width={Math.max(x1 - x0, 1)} height={18} fill={fill} />
          {r.low != null && <><line x1={x(r.low)} x2={x(r.high)} y1={cy} y2={cy} stroke={INK} strokeWidth={1.5} />{[r.low, r.high].map((v) => <line key={v} x1={x(v)} x2={x(v)} y1={cy - 6} y2={cy + 6} stroke={INK} strokeWidth={1.5} />)}</>}
        </g>;
      })}
    </svg>
  </div>;
}
