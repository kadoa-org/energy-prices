import React from 'react';
import { CAR_BOX_HEIGHT, CAR_SHAPES, carSvg } from './carShapes.mjs';

// How far a sum of fuel money takes each version: one lane per version, furthest first, with model and fuel in two
// aligned columns. The version's car, drawn to scale and coloured by fuel, is parked with its nose at the distance
// reached, behind a dashed trail from the start. Every car carries its distance, so the scale is light: the start line
// and a dashed line at each round tick, labelled in the header row, whose title (`unit`) names the units. Phones keep
// the furthest ticks whose labels do not overlap. Car size follows --range-car (px per inch), smaller on phones.
// keys: the legend above the lanes, [{ label, value, colour, textColour }], one per fuel with its price. note: an
// optional line under the legend on where the prices come from.
const STEPS = [100, 200, 250, 500, 1000, 2000];
// On a phone the track is about 140px, so each character of a tick label takes about this share of it.
const PHONE_CHAR = 0.06;
export default function CarRange({ runs, unit, keys, note }) {
  // A tenth of headroom past the furthest car, rounded up to the smallest round step that gives six ticks or fewer.
  const reach = runs[0].miles * 1.1;
  const step = STEPS.find((s) => reach / s <= 6) ?? STEPS.at(-1);
  const max = Math.ceil(reach / step) * step;
  const at = (v) => `${(v / max) * 100}%`;
  // A tick near the end has its label right-aligned to its line.
  const end = (v) => v / max > 0.85;
  let room = Infinity;
  const ticks = Array.from({ length: max / step - 1 }, (_, i) => (i + 1) * step).reverse().map((v) => {
    const label = v.toLocaleString('en-US'), share = label.length * PHONE_CHAR, x = v / max;
    const from = end(v) ? x - share : x - share / 2, fits = from >= 0 && x + (end(v) ? 0 : share / 2) <= room;
    if (fits) room = from - 0.03;
    return { v, label, wide: fits ? '' : ' crange__wide' };
  });
  const nameWidth = `${Math.min(Math.max(...runs.map((r) => r.name.length), 8) + 1, 22)}ch`;
  const lines = <>
    <span className="crange__zero" aria-hidden="true" />
    {ticks.map((t) => <span className={`crange__place${t.wide}`} key={t.v} style={{ left: at(t.v) }} aria-hidden="true" />)}
  </>;
  // The scale's title is a header, not a row: muted and right-aligned against the ticks it names, with a rule under
  // the header row to separate it from the models.
  return <div className="crange" style={{ '--range-name': nameWidth }}>
    <ul className="crange__key">{keys.map((k) => <li key={k.label}><b style={{ color: k.textColour }}><i style={{ background: k.colour }} />{k.label}</b><span>{k.value}</span></li>)}</ul>
    {note && <p className="crange__note">{note}</p>}
    <div className="crange__row crange__row--head" aria-hidden="true">
      <span className="crange__start">{unit}</span>
      <span className="crange__track">{ticks.map((t) => <span className={`crange__label${t.wide}${end(t.v) ? ' crange__label--end' : ''}`} key={t.v} style={{ left: at(t.v) }}>{t.label}</span>)}</span>
    </div>
    <ol className="crange__list">
      {runs.map((r) => {
        // Cars in the last stretch of the axis carry their value behind them, so it stays inside on a phone.
        const len = CAR_SHAPES[r.model].L, car = `${len} * var(--range-car)`, behind = r.miles / max > 0.62;
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
