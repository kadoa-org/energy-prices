import React from 'react';
import { CAR_BOX_HEIGHT, CAR_SHAPES, carSvg } from './carShapes.mjs';

// How far a sum of fuel money takes each version: one lane per version, furthest first, with model and fuel in two
// aligned columns. The version's car, drawn to scale and coloured by fuel, is parked with its nose at the miles
// reached, behind a dashed trail from the start. Dashed lines mark places at road distances from the start, so the
// lengths read as trips; places without `phone` are left off on phones. Car size follows --range-car (px per inch),
// smaller on phones.
export default function CarRange({ runs, places, start, step = 500 }) {
  // A tenth of headroom past the furthest car; its value sits behind it, so it never runs off the chart.
  const max = Math.ceil((runs[0].miles * 1.1) / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const at = (v) => `${(v / max) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...runs.map((r) => r.name.length), 8) + 1, 22)}ch`;
  const lines = <>
    {ticks.map((t) => <span className="dots__grid" key={`t${t}`} style={{ left: at(t) }} aria-hidden="true" />)}
    {places.map((p) => <span className={`crange__place${p.phone ? '' : ' crange__wide'}`} key={p.place} style={{ left: at(p.miles) }} aria-hidden="true" />)}
  </>;
  return <div className="crange" style={{ '--range-name': nameWidth }}>
    <div className="crange__row crange__row--head" aria-hidden="true">
      <span className="crange__start">{start}</span>
      <span className="crange__track">{places.map((p) => <span className={`crange__label${p.phone ? '' : ' crange__wide'}`} key={p.place} style={{ left: at(p.miles) }}>{p.place}</span>)}</span>
    </div>
    <ol className="crange__list">
      {runs.map((r, i) => {
        const len = CAR_SHAPES[r.model].L, car = `${len} * var(--range-car)`, behind = i === 0;
        return <li className="crange__row" key={r.key} title={`${r.name}, ${r.fuelLabel}: ${r.text}`}>
          <span className="crange__name">{r.name}</span>
          <span className="crange__fuel" style={{ color: r.textColour }}>{r.fuelLabel}</span>
          <span className="crange__track">
            {lines}
            <span className="crange__trail" style={{ width: `max(0px, calc(${at(r.miles)} - ${car} - 4px))`, borderColor: r.colour }} aria-hidden="true" />
            <svg className="crange__car" viewBox={`0 0 ${len} ${CAR_BOX_HEIGHT}`} style={{ left: at(r.miles), width: `calc(${car})` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: carSvg(r.model, { body: r.colour, id: `car-${r.key}` }) }} />
            <span className={`crange__val${behind ? ' crange__val--behind' : ''}`} style={{ left: behind ? `calc(${at(r.miles)} - ${car})` : at(r.miles), color: r.textColour }}>{r.text}</span>
          </span>
        </li>;
      })}
    </ol>
    <div className="crange__row crange__row--axis" aria-hidden="true">
      <span /><span />
      <span className="crange__track">{ticks.map((t, i) => <span className="dots__tick" key={t} style={{ left: at(t) }}>{t.toLocaleString('en-US')}{i === ticks.length - 1 ? ' mi' : ''}</span>)}</span>
    </div>
  </div>;
}
