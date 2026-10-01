import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from './kit';
import { FilterSelect, ShowMore } from './Figures';
import LineChart, { SERIES_COLOURS } from './LineChart';
import { ValueRanking } from './StaplesChart';
import { changeBins, binFor, PRICE_BINS } from './TileMap';
import { cents, monthLabel } from './model.mjs';
import PATHS from './usStatePaths.json';

// Home electricity prices by state as one chart with four views, the pattern of Our World in Data's charts: a US map,
// lines over time, a ranked bar and a table, all reading the same measure at the same month. A time bar steps
// through every month since the 2019 base (each point is a 12-month average) and can play through them. The view,
// measure, month and chosen states live in the address (?view=map&show=price&month=2024-07&states=CA~TX), so a
// shared link opens exactly that view.
const VIEWS = [['map', 'Map'], ['line', 'Line'], ['bar', 'Bar'], ['table', 'Table']];
const SHOWS = [['change', 'Change since 2019'], ['price', 'Price']];
// The map is colour only, as Our World in Data's and ONS maps are: exact figures are on hover, in Bar and Table, and
// in the ranked list on phones. States too small to find or hover get a box with their code beside the map.
const SIDE = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'];
const LINE_COLOURS = [...SERIES_COLOURS, '#801650', '#3d3d3d'];
const MAX_LINES = 5;
const round1 = (v) => Math.round(v * 10) / 10;
const pct = (v) => (v == null ? '–' : `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}%`);
const shortMonth = (m) => `${monthLabel(`${m}-01`).slice(0, 3)} ${m.slice(0, 4)}`;

function readParams() {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return { view: q.get('view'), show: q.get('show'), month: q.get('month'), states: q.get('states')?.split('~').filter(Boolean) };
}

export default function StateExplorer({ states, usTrend, cpiTrend, href, views = VIEWS.map(([v]) => v) }) {
  const months = usTrend.map((p) => p[0]);
  const last = months.length - 1;
  const [view, setView] = useState(views[0]);
  const [show, setShow] = useState('change');
  const [at, setAt] = useState(last);
  const [picked, setPicked] = useState(null);
  const [hover, setHover] = useState(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);
  const placed = states.filter((s) => PATHS[s.code] && s.trend?.length);

  // The address is read once after hydration (the prerendered page shows the default view) and kept in sync after.
  useEffect(() => {
    const p = readParams();
    if (views.includes(p.view)) setView(p.view);
    if (SHOWS.some(([v]) => v === p.show)) setShow(p.show);
    if (p.month && months.includes(p.month)) setAt(months.indexOf(p.month));
    if (p.states?.length) setPicked(p.states.filter((c) => placed.some((s) => s.code === c)).slice(0, MAX_LINES));
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const set = (k, v, dflt) => (v === dflt || v == null ? q.delete(k) : q.set(k, v));
    set('view', view, views[0]); set('show', show, 'change'); set('month', months[at], months[last]);
    set('states', picked ? picked.join('~') : null, null);
    const qs = q.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [view, show, at, picked]);
  useEffect(() => {
    if (!playing) return undefined;
    timer.current = setInterval(() => setAt((i) => { if (i >= last) { setPlaying(false); return i; } return i + 1; }), 180);
    return () => clearInterval(timer.current);
  }, [playing]);

  const isPrice = show === 'price';
  const month = months[at];
  const cpiAt = cpiTrend?.find((p) => p[0] === month)?.[1];
  const value = (s, i = at) => { const p = s.trend[i]; return p ? (isPrice ? p[2] * 100 : p[1]) : null; };
  const label = (v) => (isPrice ? (v == null ? '–' : cents(v)) : pct(v));
  const scale = isPrice ? PRICE_BINS : changeBins(cpiAt ?? 0);
  const binOf = (v) => (v == null ? null : isPrice ? binFor(PRICE_BINS, v, round1) : binFor(scale, v, Math.round));
  const usValue = isPrice ? usTrend[at][2] * 100 : usTrend[at][1];
  const ranked = useMemo(() => [...placed].sort((a, b) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity)), [placed, at, show]);
  const faster = cpiAt == null ? null : placed.filter((s) => Math.round(value(s)) > Math.round(cpiAt)).length;
  const defaultLines = [ranked[0], ranked[1], ranked.at(-1)].filter(Boolean).map((s) => s.code);
  const lines = picked ?? defaultLines;

  const summary = isPrice
    ? `Average home price per kilowatt-hour, 12 months to ${monthLabel(`${month}-01`)}. US average ${cents(usValue)}; ${ranked[0].name} ${cents(value(ranked[0]))}, ${ranked.at(-1).name} ${cents(value(ranked.at(-1)))}.`
    : `Change in the 12-month average price since 2019, to ${monthLabel(`${month}-01`)}. The US average rose ${Math.round(usValue)}%${cpiAt != null ? `, all prices ${Math.round(cpiAt)}%. ${faster} of ${placed.length} rose faster than inflation` : ''}.`;

  const hovered = hover && placed.find((s) => s.code === hover);
  const sideBoxes = SIDE.filter((c) => placed.some((s) => s.code === c));

  return (
    <div className="explorer">
      {views.length > 1 ? <div className="govuk-tabs">
        <ul className="govuk-tabs__list" role="tablist">
          {VIEWS.filter(([v]) => views.includes(v)).map(([v, l]) => <li key={v} className={`govuk-tabs__list-item${view === v ? ' govuk-tabs__list-item--selected' : ''}`} role="presentation">
            <button type="button" role="tab" aria-selected={view === v} tabIndex={view === v ? 0 : -1} className="govuk-tabs__tab" onClick={() => setView(v)}
              onKeyDown={(e) => { const vs = views; const k = vs.indexOf(view); if (e.key === 'ArrowRight') setView(vs[(k + 1) % vs.length]); if (e.key === 'ArrowLeft') setView(vs[(k - 1 + vs.length) % vs.length]); }}>{l}</button>
          </li>)}
        </ul>
        <div className="govuk-tabs__panel" role="tabpanel">{body()}</div>
      </div> : body()}
    </div>
  );
  function body() {
    return <>
      <div className="chart-filters">
        <FilterSelect label="Show" value={show} options={SHOWS} onChange={setShow} />
        {view === 'line' && lines.length < MAX_LINES && <FilterSelect label="Add a state" value="" options={[['', 'Choose a state'], ...[...placed].sort((a, b) => a.name.localeCompare(b.name)).filter((st) => !lines.includes(st.code)).map((st) => [st.code, st.name])]}
          onChange={(c) => c && setPicked([...lines, c])} />}
      </div>
      {view === 'line' && <ul className="explorer__chips" aria-label="States on the chart">
        {lines.map((c, i) => { const st = placed.find((x) => x.code === c); return st && <li key={c}><span className="explorer__dot" style={{ background: LINE_COLOURS[i % LINE_COLOURS.length] }} />{st.name}
          <button type="button" aria-label={`Remove ${st.name}`} onClick={() => setPicked(lines.filter((x) => x !== c))}>×</button></li>; })}
      </ul>}
      <p className="dk-hint table-intro">{summary}</p>

      {view === 'map' && <>
        <ul className="tilemap__legend" aria-hidden="true">
          {scale.map((b) => <li key={b.label}><span className={`tilemap__swatch ${b.cls}`} />{b.label}</li>)}
        </ul>
        <div className="explorer__map">
          <svg viewBox="-40 0 1080 620" role="img" aria-label={`Map: ${summary}`}>
            {placed.map((s) => {
              const g = PATHS[s.code], v = value(s), b = binOf(v);
              return <a key={s.code} href={href(s.slug)} onMouseEnter={() => setHover(s.code)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.code)} onBlur={() => setHover(null)} aria-label={`${s.name}: ${label(v)}`}>
                <path d={g.d} className={`explorer__state ${b?.cls ?? ''}${hover === s.code ? ' is-hover' : ''}`} />
              </a>;
            })}
            {sideBoxes.map((code, i) => {
              const s = placed.find((x) => x.code === code), v = value(s), b = binOf(v);
              return <a key={code} className="explorer__sidebox" href={href(s.slug)} onMouseEnter={() => setHover(code)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(code)} onBlur={() => setHover(null)} aria-label={`${s.name}: ${label(v)}`}>
                <rect x={968} y={120 + i * 40} width={70} height={34} className={`explorer__state ${b?.cls ?? ''}${hover === code ? ' is-hover' : ''}`} />
                <text x={1003} y={142 + i * 40} textAnchor="middle" className={`explorer__side ${b?.cls ?? ''}`}>{code}</text>
              </a>;
            })}
          </svg>
          {hovered && <div className="explorer__card" role="status">
            <strong>{hovered.name}</strong>
            <span>{label(value(hovered))} <em>{isPrice ? `a kWh, ${monthLabel(`${month}-01`)}` : `since 2019, to ${monthLabel(`${month}-01`)}`}</em></span>
            <span className="dk-hint">{isPrice ? `${pct(hovered.trend[at][1])} since 2019` : `${cents(hovered.trend[at][2] * 100)} a kWh`}</span>
          </div>}
        </div>
      </>}

      {view === 'line' && <div className="explorer__line">
        <LineChart
          series={[{ label: 'US average', points: usTrend.map((p) => [`${p[0]}-01`, isPrice ? p[2] * 100 : p[1]]), compare: true },
            ...lines.map((c, i) => { const s = placed.find((x) => x.code === c); return s && { label: s.name, colour: LINE_COLOURS[i % LINE_COLOURS.length], points: s.trend.map((p) => [`${p[0]}-01`, isPrice ? p[2] * 100 : p[1]]) }; }).filter(Boolean)]}
          from={`${months[0]}-01`} to={`${months[at]}-01`} monthly gapDays={45}
          format={isPrice ? cents : (v) => label(v)} yTitle={isPrice ? 'Cents a kWh' : 'Change since 2019'}
          label={`Lines: ${summary}`} />
      </div>}

      {view === 'bar' && <ShowMore total={ranked.length} initial={15} noun="states">{(n) => (
        <ValueRanking rows={ranked.slice(0, n).map((s) => ({ name: s.name, value: value(s), href: href(s.slug) }))} average={usValue} averageLabel="US average" format={label} />
      )}</ShowMore>}

      {view === 'table' && <ShowMore total={ranked.length} initial={15} noun="states">{(n) => (
        <DataTable rows={ranked.slice(0, n)} rowKey={(s) => s.code} columns={[
          { key: 'name', header: 'State', render: (s) => <a className="cell-link" href={href(s.slug)}>{s.name}</a> },
          { key: 'change', header: 'Since 2019', align: 'right', render: (s) => pct(s.trend[at][1]) },
          { key: 'price', header: 'Price a kWh', align: 'right', render: (s) => cents(s.trend[at][2] * 100) },
        ]} />
      )}</ShowMore>}

      {view !== 'line' && <div className="explorer__time">
        <button type="button" className="explorer__play" onClick={() => { if (at >= last) setAt(0); setPlaying((p) => !p); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <span className="dk-hint">{shortMonth(months[0])}</span>
        <input type="range" min={0} max={last} value={at} onChange={(e) => { setPlaying(false); setAt(Number(e.target.value)); }} aria-label="Month" aria-valuetext={monthLabel(`${month}-01`)} />
        <strong>{monthLabel(`${month}-01`)}</strong>
      </div>}
      {view === 'line' && <div className="explorer__time">
        <span className="dk-hint">Lines end at</span>
        <input type="range" min={1} max={last} value={Math.max(at, 1)} onChange={(e) => setAt(Number(e.target.value))} aria-label="End month" aria-valuetext={monthLabel(`${month}-01`)} />
        <strong>{monthLabel(`${month}-01`)}</strong>
      </div>}
      {view === 'map' && <>{/* Phones: the outlines are too small for labels, so every state's figure follows in a ranked list. */}
        <ol className="tilemap__list explorer__list">
          {ranked.map((st) => (
            <li key={st.code}>
              <span className={`tilemap__swatch ${binOf(value(st))?.cls ?? ''}`} aria-hidden="true" />
              <a href={href(st.slug)}>{st.name}</a>
              <span className="tilemap__list-value">{label(value(st))}</span>
            </li>
          ))}
        </ol></>}
    </>;
  }
}
