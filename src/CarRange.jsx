import React from 'react';
import { CAR_BOX_HEIGHT, CAR_SHAPES, carSvg } from './carShapes.mjs';

// How far a sum of fuel money takes each version: one lane per version, furthest first, with model and fuel in two
// aligned columns. The version's car, drawn to scale and coloured by fuel, is parked with its nose at the miles
// reached, behind a dashed trail from the start. Every car carries its miles, so there is no mile grid: the scale is
// the start line and a dashed line for each place, labelled with its road distance from the start. Places without
// `phone` are left off on phones. Car size follows --range-car (px per inch), smaller on phones.
export default function CarRange({ runs, places, start, step = 500 }) {
  // A tenth of headroom past the furthest car, rounded up to a whole step.
  const max = Math.ceil((runs[0].miles * 1.1) / step) * step;
  const at = (v) => `${(v / max) * 100}%`;
  const nameWidth = `${Math.min(Math.max(...runs.map((r) => r.name.length), 8) + 1, 22)}ch`;
  const lines = <>
    <span className="crange__zero" aria-hidden="true" />
    {places.map((p) => <span className={`crange__place${p.phone ? '' : ' crange__wide'}`} key={p.place} style={{ left: at(p.miles) }} aria-hidden="true" />)}
  </>;
  // The start's name sits right above the place labels, at the left edge of the lanes where every trail begins.
  return <div className="crange" style={{ '--range-name': nameWidth }}>
    <div className="crange__row crange__row--start" aria-hidden="true"><span /><span /><span className="crange__track">{start}</span></div>
    <div className="crange__row crange__row--head" aria-hidden="true">
      <span /><span />
      <span className="crange__track">{places.map((p) => <span className={`crange__label${p.phone ? '' : ' crange__wide'}`} key={p.place} style={{ left: at(p.miles) }}><b>{p.place}</b>{p.miles.toLocaleString('en-US')}</span>)}</span>
    </div>
    <ol className="crange__list">
      {runs.map((r) => {
        // Cars in the last stretch of the axis carry their value behind them, so it stays inside on a phone.
        const len = CAR_SHAPES[r.model].L, car = `${len} * var(--range-car)`, behind = r.miles / max > 0.7;
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
  </div>;
}
