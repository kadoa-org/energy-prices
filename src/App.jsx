import React, { useEffect, useState } from 'react';
import { AboutPage, Button, DataTable, GitHubButton, LiveBadge, NavBar, PhaseBanner, Section, SiteFooter, SiteHeader } from './kit';
import { METHODS } from './methodology';
import { ChangeTag, ChartCard, FilterSelect, KeyFigures, SectionHeading, ShowMore } from './Figures';
import LineChart, { SERIES_COLOURS } from './LineChart';
import CommandPalette from './CommandPalette';
import StateExplorer from './StateExplorer';
import OilShocks from './OilShocks';
import FuelWork from './FuelWork';
import PriceSpread from './PriceSpread';
import GapDots from './GapDots';
import PriceGaps from './PriceGaps';
import FuelDots from './FuelDots';
import CarRange from './CarRange';
import { NEW_YORK_TO, carRange } from './cars.mjs';
import { StapleChart, StapleRanking, ValueRanking, monthTime, stapleScales } from './StaplesChart';
import { BASE, HOME, addDays, addMonths, cents, dataPath, dateLabel, money, monthLabel, number, pctLabel } from './model.mjs';
import { priceText } from './format.mjs';

const REPO = 'https://github.com/kadoa-org/energy-prices';
const stateUrl = (slug) => `${BASE}/electricity/${slug}`;
const utilityUrl = (stateSlug, slug) => `${BASE}/electricity/${stateSlug}/${slug}`;
const OWNERSHIP = { 'Investor Owned': 'Investor-owned', Cooperative: 'Cooperative', Municipal: 'Municipal', Federal: 'Federal', State: 'State', 'Political Subdivision': 'Public power district' };
const fuelUrl = (slug) => `${BASE}/fuel/${slug}`;
const FUELS = [['gasoline', 'Gasoline'], ['diesel', 'Diesel'], ['heating-oil', 'Heating oil'], ['propane', 'Propane'], ['crude-oil', 'Crude oil']];
const perGallon = (v) => money(v, v >= 100 ? 0 : 2);
function Download({ file, common, children = 'Download CSV (gzip)' }) { return <a className="dk-btn" href={`${dataPath(common)}/downloads/${file}`} download>{children}</a>; }
function Change({ value }) {
  if (value === null || value === undefined) return <span className="dk-hint">No comparison</span>;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : '';
  return <span className={`change change--${dir}`}>{dir && <span className={`tri ${dir === 'down' ? 'tri--down' : ''}`} aria-hidden="true" />}{pctLabel(value)}</span>;
}

export function Shell({ page, children }) {
  const kind = page?.kind;
  const announce = page?.common?.announce;
  // Search opens from the header button, so it works on a phone, and from Cmd+K or Ctrl+K.
  const [search, setSearch] = useState(false);
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((o) => !o); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  return <><a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader brand="⚡ US Energy Price Monitor" brandHref={HOME} brandSuffix={<a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">by Kadoa</a>} right={<span className="header-right"><LiveBadge>Updated weekly</LiveBadge><GitHubButton repo="kadoa-org/energy-prices" /><Button inverse onClick={() => setSearch(true)} aria-label="Search (Cmd+K)">Search <kbd className="header-kbd">⌘K</kbd></Button></span>} />
    <CommandPalette open={search} onClose={() => setSearch(false)} dataPath={dataPath(page?.common)} />
    <NavBar collapse items={[{ href: HOME, label: 'Overview', active: kind === 'home' }, { href: `${BASE}/fuel`, label: 'Fuel prices', active: kind === 'fuel' || kind === 'fuels' }, { href: `${BASE}/electricity`, label: 'Electricity', active: kind === 'electricity' || kind === 'state' || kind === 'electricityMap' }, { href: `${BASE}/rate-cases`, label: 'Rate cases', active: kind === 'rateCases' }, { href: `${BASE}/insights`, label: 'Insights', active: kind === 'insights' || kind === 'insight' }, { href: `${BASE}/about`, label: 'About the data', end: true, active: kind === 'about' }]} />
    {/* The newest insight, on every page but its own; the data build decides what and until when. */}
    {announce && page.key !== announce.key && <PhaseBanner tag="New" label="Insight:" href={announce.href}>{announce.title}</PhaseBanner>}
    <main id="main-content" className="dk-container main">{children}</main><SiteFooter current="energy-prices" /></>;
}
export function Loading({ error = false }) {
  return <Shell><div role={error ? 'alert' : 'status'}>{error ? 'This page could not be loaded. Check the address or return to the overview.' : 'Loading energy prices…'}</div>{error ? <p><a href={HOME}>Return to the overview</a></p> : <div className="skeleton" aria-hidden="true"><div className="skeleton-title" /><div className="skeleton-line" /><div className="skeleton-chart" /></div>}</Shell>;
}

// ── Overview
function Headlines({ h }) {
  const week = `Week of ${dateLabel(h.gasoline.date)}`;
  return <KeyFigures
    context={`Prices are not adjusted for inflation. Consumer prices overall rose ${pctLabel(h.energyCpi.allItems)} in the year to ${monthLabel(h.energyCpi.month)}.`}
    items={[
      { label: 'Regular gas', title: `EIA weekly retail price, US average, ${week}`, value: perGallon(h.gasoline.value), note: <><ChangeTag value={h.gasoline.yearChange} size="small" /> on a year ago</> },
      { label: 'Diesel', title: `EIA weekly retail price, US average, ${week}`, value: perGallon(h.diesel.value), note: <><ChangeTag value={h.diesel.yearChange} size="small" /> on a year ago</> },
      { label: 'Home electricity', title: `EIA average residential price, US, 12 months to ${monthLabel(h.electricity.date)}`, value: `${cents(h.electricity.price12)} a kWh`, note: <><ChangeTag value={h.electricity.price12Change} size="small" /> on a year ago</> },
      { label: 'Energy inflation', title: `BLS CPI-U energy, 12 months to ${monthLabel(h.energyCpi.month)}`, value: pctLabel(h.energyCpi.change), note: `Year to ${monthLabel(h.energyCpi.month)}` },
    ]}
  />;
}
function SinceBase({ staples, common }) {
  const items = staples.items;
  const scales = stapleScales(items);
  const from = monthTime(staples.from), to = monthTime(staples.month);
  const regionColumns = [{ key: 'name', header: 'Region', render: (r) => r.name }, ...items.map((it) => ({ key: it.name, header: it.name, align: 'right', render: (r) => (r.items[it.name] ? <><Change value={r.items[it.name].change} /><span className="cell-note">{priceText(r.items[it.name].price, it.unit)}</span></> : '–') }))];
  const columns = [
    { key: 'name', header: 'Fuel', render: (r) => (r.slug ? <a className="cell-link" href={r.slug === 'electricity' ? `${BASE}/electricity` : fuelUrl(r.slug)}>{r.name}</a> : r.name) },
    { key: 'unit', header: 'Unit', hideBelow: 'sm', render: (r) => r.unit },
    { key: 'basePrice', header: monthLabel(`${staples.from}-01`), align: 'right', render: (r) => priceText(r.basePrice, r.unit) },
    { key: 'price', header: monthLabel(`${staples.month}-01`), align: 'right', render: (r) => priceText(r.price, r.unit) },
    { key: 'change', header: 'Change', align: 'right', render: (r) => <Change value={r.change} /> },
    { key: 'yearChange', header: 'Past year', align: 'right', hideBelow: 'sm', render: (r) => <Change value={r.yearChange} /> },
  ];
  return <ChartCard
    id="since-title"
    title={`Change in energy prices since ${staples.from.slice(0, 4)}`}
    description={`Percent change in average US prices since ${monthLabel(`${staples.from}-01`)}, from BLS.`}
    date={`Up to and including ${monthLabel(`${staples.month}-01`)}`}
    tabs={[
      { label: 'Chart', content: <ul className="staples__grid">
        {items.map((r) => <li className="staples__item" key={r.name}>
          <div className="staples__head">{r.slug ? <a href={r.slug === 'electricity' ? `${BASE}/electricity` : fuelUrl(r.slug)}>{r.name}</a> : <span className="staples__name">{r.name}</span>}<ChangeTag value={r.change} size="small" /></div>
          <span className="staples__price">{priceText(r.price, r.unit)} <span className="staples__unit">{r.unit}, from {priceText(r.basePrice, r.unit)}</span></span>
          <StapleChart item={r} scale={scales.get(r.name)} from={from} to={to} />
        </li>)}
      </ul> },
      { label: 'Against inflation', short: 'Inflation', content: <StapleRanking ranking={staples.ranking} cpi={staples.cpi} from={monthLabel(`${staples.from}-01`)} /> },
      { label: 'By region', short: 'Regions', content: <><p className="dk-hint table-intro">Change since {monthLabel(`${staples.from}-01`)}, with the latest price under it.</p><DataTable rows={staples.regions} columns={regionColumns} rowKey={(r) => r.name} /></> },
      { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={items} columns={columns} rowKey={(r) => r.name} /> },
      { label: 'Download', content: <><p className="download-intro">The BLS price and CPI series behind this chart, with every other series on the site, as a gzipped CSV.</p><Download file="energy-prices.csv.gz" common={common}>Download all data (CSV, gzip)</Download></> },
    ]}
    footer={<p className="chart-note">Source: <a href="https://www.bls.gov/cpi/factsheets/average-prices.htm" target="_blank" rel="noreferrer">BLS average prices</a> and <a href="https://www.bls.gov/cpi/" target="_blank" rel="noreferrer">Consumer Price Index</a>, US city average. Not adjusted for inflation.</p>}
  />;
}
function Pump({ pump, common }) {
  const columns = [
    { key: 'area', header: 'Area', render: (r) => r.area },
    { key: 'gasoline', header: 'Regular', align: 'right', render: (r) => <><span className="cell-quote">{perGallon(r.gasoline.value)}</span><span className="cell-note"><Change value={r.gasoline.yearChange} /></span></> },
    { key: 'diesel', header: 'Diesel', align: 'right', render: (r) => (r.diesel ? <><span className="cell-quote">{perGallon(r.diesel.value)}</span><span className="cell-note"><Change value={r.diesel.yearChange} /></span></> : '–') },
  ];
  const last = pump.gasoline.at(-1)[0];
  return <ChartCard
    id="pump-title"
    title="Gas and diesel prices"
    description="US average price a gallon, including taxes. Updated weekly."
    date={`Up to and including the week of ${dateLabel(last)}`}
    tabs={[
      { label: 'Chart', content: <LineChart series={[{ label: 'Regular gas', points: pump.gasoline }, { label: 'Diesel', points: pump.diesel, colour: SERIES_COLOURS[1] }]} format={perGallon} yTitle="Price a gallon" label={`Weekly US retail gasoline and diesel prices since ${monthLabel(pump.gasoline[0][0])}. Regular gasoline was ${perGallon(pump.gasoline.at(-1)[1])} and diesel ${perGallon(pump.diesel.at(-1)[1])} in the week of ${dateLabel(last)}.`} /> },
      { label: 'By region', short: 'Regions', content: <><p className="dk-hint table-intro">Latest week, with the change on a year ago under each price.</p><DataTable rows={pump.rows} columns={columns} rowKey={(r) => r.geoCode} /></> },
      { label: 'Download', content: <><p className="download-intro">Every week for every area and grade EIA surveys, as gzipped CSVs.</p><div className="download-row"><Download file="fuel-gasoline.csv.gz" common={common}>Gasoline CSV (gzip)</Download><Download file="fuel-diesel.csv.gz" common={common}>Diesel CSV (gzip)</Download></div></> },
    ]}
    footer={<p className="chart-note">Source: <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA Gasoline and Diesel Fuel Update</a>. <a href={fuelUrl('gasoline')}>Gasoline by area</a> · <a href={fuelUrl('diesel')}>Diesel by area</a></p>}
  />;
}
// A panel header holds one line; a longer name would push its chart out of line with the rest of the row.
const SHORT_NAMES = { 'District of Columbia': 'DC' };
// Every state as a small line chart of its twelve-month average price since 2019, the US first, then the largest rise
// first. One shared scale, so a steeper line is a bigger rise; a state far above the rest gets its own.
function StateTrends({ states, usTrend }) {
  const items = [{ name: 'US average', trend: usTrend }, ...[...states].sort((a, b) => (b.priceSince2019 ?? -Infinity) - (a.priceSince2019 ?? -Infinity))]
    .filter((s) => s.trend?.length > 1)
    .map((s) => ({ ...s, points: s.trend, unit: 'per kWh', baseDate: `${s.trend[0][0]}-01`, change: s.trend.at(-1)[1] }));
  if (!items.length) return null;
  const scales = stapleScales(items);
  const from = monthTime(items[0].points[0][0]), to = monthTime(items[0].points.at(-1)[0]);
  return <>
    <p className="dk-hint table-intro">Twelve-month average price, change since the 2019 average. Largest rise first.</p>
    <ul className="staples__grid">
      {items.map((r) => <li className="staples__item" key={r.name}>
        <div className="staples__head">{r.slug ? <a href={stateUrl(r.slug)} title={r.name}>{SHORT_NAMES[r.name] ?? r.name}</a> : <span className="staples__name">{r.name}</span>}<ChangeTag value={r.change} size="small" /></div>
        <span className="staples__price">{priceText(r.points.at(-1)[2], 'per kWh')} <span className="staples__unit">a kWh</span></span>
        <StapleChart item={r} scale={scales.get(r.name)} from={from} to={to} />
      </li>)}
    </ul>
  </>;
}
function StatesCard({ states, us, month, common, full = false, usTrend, cpi, usSince2019, cpiTrend }) {
  const [sort, setSort] = useState({ key: 'price12', dir: 'desc' });
  const ranked = [...states].sort((a, b) => b.price12 - a.price12);
  const value = (r, k) => (k === 'name' ? r.name : r[k] ?? -Infinity);
  const sorted = [...states].sort((a, b) => { const av = value(a, sort.key), bv = value(b, sort.key); return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
  const columns = [
    { key: 'name', header: 'State', sortable: true, render: (r) => <a className="cell-link" href={stateUrl(r.slug)}>{r.name}</a> },
    { key: 'price12', header: 'Price a kWh', align: 'right', sortable: true, render: (r) => cents(r.price12) },
    { key: 'price12Change', header: 'Past year', align: 'right', sortable: true, render: (r) => <Change value={r.price12Change} /> },
    ...(full ? [
      { key: 'priceSince2019', header: 'Since 2019', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => <Change value={r.priceSince2019} /> },
      { key: 'bill12', header: 'Monthly bill', align: 'right', sortable: true, render: (r) => money(r.bill12, 0) },
      { key: 'use12', header: 'Monthly use', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => `${number(r.use12)} kWh` },
    ] : []),
  ];
  return <ChartCard
    id="states-title"
    title="Electricity prices by state"
    description="Average price for homes over the last 12 months, in cents a kilowatt-hour."
    date={`12 months to ${monthLabel(month)}`}
    tabs={[
      cpiTrend && usTrend && { label: 'Map', hash: 'map', content: <StateExplorer states={states} usTrend={usTrend} cpiTrend={cpiTrend} href={stateUrl} views={['map']} /> },
      { label: 'Chart', content: <ShowMore total={ranked.length} initial={15} noun="states">{(n) => <ValueRanking rows={ranked.slice(0, n).map((s) => ({ name: s.name, value: s.price12, href: stateUrl(s.slug) }))} average={us.price12} averageLabel="US average" format={cents} />}</ShowMore> },
      usTrend && { label: 'Since 2019', content: <StateTrends states={states} usTrend={usTrend} /> },
      { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={sorted.length} initial={15} noun="states">{(n) => <DataTable rows={sorted.slice(0, n)} columns={columns} rowKey={(r) => r.slug} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))} />}</ShowMore> },
      { label: 'Download', content: <><p className="download-intro">Monthly residential price, average bill and use for every state, with natural gas prices, as a gzipped CSV.</p><Download file="energy-prices.csv.gz" common={common}>Download all data (CSV, gzip)</Download></> },
    ]}
  />;
}
function Overview({ page }) {
  return <>
    <div className="title-block"><h1 className="dk-h1">US Energy Price Monitor</h1><p className="lede">Weekly US fuel prices and monthly electricity prices, from EIA and BLS.</p></div>
    <Headlines h={page.headlines} />
    <SinceBase staples={page.staples} common={page.common} />
    <Pump pump={page.pump} common={page.common} />
    <StatesCard states={page.states} us={{ price12: page.headlines.electricity.price12 }} month={page.headlines.electricity.date} common={page.common} usTrend={page.usTrend} cpi={page.electricityCpi} usSince2019={page.usSince2019} cpiTrend={page.electricityCpiTrend} />
    {page.europe && <EuropeCard europe={page.europe} common={page.common} id="europe-overview-title" />}
  </>;
}

// ── Fuel pages
// Fuel, then grade, then location, arranged as topic, breakdown and place: an index of fuels with a card each, grades
// drawn as lines of one chart, and location as an area type and area name pair ("Filter results by location") that
// moves between pages.
const RANGES = [['365', '1 year'], ['1825', '5 years'], ['all', 'All']];
const AREA_TYPES = [['us', 'United States'], ['padd', 'Region'], ['state', 'State'], ['city', 'City']];
const AREA_GROUPS = { us: 'United States', padd: 'Regions', state: 'States', city: 'Cities' };
// "Regular" reads as a word in a sentence; "WTI, Cushing" keeps its capitals.
const gradeWord = (g) => (/^[A-Z][a-z]+$/.test(g) ? g.toLowerCase() : g);
// What a card says about coverage, in place of a second link to the same page.
const locationUrl = (fuelSlug, slug) => (slug ? `${BASE}/fuel/${fuelSlug}/${slug}` : fuelUrl(fuelSlug));
function Breadcrumbs({ items }) {
  return <nav className="govuk-breadcrumbs" aria-label="Breadcrumb"><ol className="govuk-breadcrumbs__list">
    {items.map((it) => <li className="govuk-breadcrumbs__list-item" key={it.label}>{it.href ? <a className="govuk-breadcrumbs__link" href={it.href}>{it.label}</a> : <span aria-current="page">{it.label}</span>}</li>)}
  </ol></nav>;
}
// The fuels as a sub navigation for sibling sections: the current one marked.
function FuelNav({ current }) {
  return <nav className="sub-navigation" aria-label="Fuels"><ul className="sub-navigation__list">{FUELS.map(([slug, name]) => <li className="sub-navigation__item" key={slug}><a className="sub-navigation__link" href={fuelUrl(slug)} aria-current={slug === current ? 'page' : undefined}>{name}</a></li>)}</ul></nav>;
}
function FuelIndex({ page }) {
  return <>
    <div className="title-block"><h1 className="dk-h1">Fuel prices</h1><p className="lede">Weekly US prices for road and heating fuels, from EIA.</p></div>
    <ul className="fuel-cards">
      {page.cards.map((c) => <li className="fuel-card" key={c.slug}>
        <h2 className="fuel-card__title"><a href={fuelUrl(c.slug)}>{c.title}</a></h2>
        <p className="fuel-card__desc">{c.spot ? `${c.grades[0]} spot price` : `US average${c.grades.length > 1 ? `, ${gradeWord(c.grades[0])}` : ''}`}, {c.unit}. Week of {dateLabel(c.summary.date)}.{c.seasonal ? ' Surveyed October to March.' : ''}</p>
        <p className="fuel-card__figure">{perGallon(c.summary.value)} {c.summary.yearAgo && <><ChangeTag value={c.summary.yearChange} size="small" /> <span className="fuel-card__note">on a year ago</span></>}</p>
        <LineChart compact series={[{ label: c.name, points: c.spark }]} format={perGallon} gapDays={c.seasonal ? 21 : 35} label={`${c.title}, US average, past year.`} />
        <p className="fuel-card__more">{c.areas > 1 ? `${c.areas} areas: regions, states and cities.` : c.grades.join(' and ')}</p>
      </li>)}
    </ul>
  </>;
}
// Area type, then area name. Each area is its own page, so choosing one navigates; the type only narrows the names.
function LocationFilter({ fuel, location, locations }) {
  const [type, setType] = useState(location.type);
  const types = AREA_TYPES.filter(([t]) => locations.some((l) => l.type === t));
  const names = locations.filter((l) => l.type === type);
  const go = (slug) => { window.location.href = locationUrl(fuel.slug, slug); };
  return <details className="govuk-details location-filter" open>
    <summary className="govuk-details__summary"><span className="govuk-details__summary-text">Filter results by location</span></summary>
    <div className="govuk-details__text location-filter__row">
      <label>Area type<select value={type} onChange={(e) => { const t = e.target.value; setType(t); if (t === 'us') go(null); }}>{types.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
      <label>Area name<select value={type === location.type ? location.slug ?? '' : ''} disabled={type === 'us'} onChange={(e) => go(e.target.value || null)}>
        {type !== location.type && <option value="">Select area name</option>}
        {names.map((l) => <option key={l.slug ?? 'us'} value={l.slug ?? ''}>{l.name}</option>)}
      </select></label>
      {location.slug && <a className="location-filter__reset" href={fuelUrl(fuel.slug)}>Reset</a>}
    </div>
  </details>;
}
// Every area and grade at once, Fingertips' "Compare areas" view: one table per area type, a column per grade.
function CompareAreas({ fuel, location, compare, format }) {
  const columns = [
    { key: 'name', header: 'Area', width: '40%', render: (r) => (r.slug === location.slug ? <strong>{r.name}</strong> : <a className="cell-link" href={locationUrl(fuel.slug, r.slug)}>{r.name}</a>) },
    ...fuel.grades.map((g) => ({ key: g, header: fuel.grades.length > 1 ? g : 'Latest', align: 'right', width: `${60 / fuel.grades.length}%`, render: (r) => (r.grades[g] ? <><span className="cell-quote">{format(r.grades[g].value)}</span><span className="cell-note"><Change value={r.grades[g].yearChange} /></span></> : '–') })),
  ];
  const groups = AREA_TYPES.map(([t]) => [t, compare.filter((r) => r.type === t)]).filter(([, rows]) => rows.length);
  return <Section title="Compare prices by area" hint={`Latest week for every area EIA surveys, ${fuel.unit}, with the change on a year ago under each price.`}>
    {groups.map(([t, rows]) => <div className="compare-group" key={t}>
      {groups.length > 1 && <h3 className="compare-group__title">{AREA_GROUPS[t]}</h3>}
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.slug ?? 'us'} />
    </div>)}
  </Section>;
}
function Fuel({ page }) {
  const { fuel, location, lines, usSummary, compare, locations, common } = page;
  // The range is kept in the address (?range=all) so a link can open the long view.
  const [range, setRangeState] = useState(() => { try { const r = new URLSearchParams(window.location.search).get('range'); return RANGES.some(([v]) => v === r) ? r : '365'; } catch { return '365'; } });
  const setRange = (v) => { setRangeState(v); try { const u = new URL(window.location.href); v === '365' ? u.searchParams.delete('range') : u.searchParams.set('range', v); window.history.replaceState(null, '', u); } catch {} };
  const [visible, setVisible] = useState(26);
  const isUS = !location.slug;
  const h = lines[0].summary;
  const format = perGallon;
  const unit = fuel.unit;
  const from = range === 'all' ? null : addDays(h.date, -Number(range));
  const stale = h.date < addDays(common.lastWeek, -21);
  const byGrade = fuel.grades.length > 1 || lines.length > 1;
  // The dashed line: the first price on the chart grown with all consumer prices (CPI-U). A week takes its month's CPI
  // or the latest month before it (BLS skipped October 2025, and the newest weeks run ahead of the CPI).
  const inflation = (() => {
    // Over a year inflation barely moves the line, so it is drawn only on the five-year and full views.
    if (!page.cpi || range === '365') return null;
    const cpi = new Map(page.cpi), months = page.cpi.map(([m]) => m);
    const at = (d) => cpi.get(d.slice(0, 7)) ?? cpi.get(months.filter((m) => m < d.slice(0, 7)).at(-1));
    // The CPI file starts in 1997, so an "All" chart's line starts at the first week with a CPI month.
    const pts = lines[0].points.filter(([d]) => (!from || d >= from) && d <= h.date && d.slice(0, 7) >= months[0]);
    if (pts.length < 2 || !at(pts[0][0])) return null;
    const [, base] = pts[0], c0 = at(pts[0][0]);
    return pts.map(([d]) => [d, Number(((base * at(d)) / c0).toFixed(3))]);
  })();
  // Beyond five years a weekly line is mostly noise at chart width, so the long view plots monthly averages.
  const monthlyView = range === 'all';
  const toMonthly = (pts) => { const m = new Map(); for (const [d, v] of pts) { const k = `${d.slice(0, 7)}-15`; const a = m.get(k) ?? []; a.push(v); m.set(k, a); } return [...m].map(([k, a]) => [k, a.reduce((x, y) => x + y, 0) / a.length]); };
  const shownPoints = (pts) => (monthlyView ? toMonthly(pts) : pts);
  const series = [...lines.map((l, i) => ({ label: byGrade ? l.grade : location.name, points: shownPoints(l.points), colour: SERIES_COLOURS[i] })), inflation && { label: 'With inflation', points: inflation, compare: true }].filter(Boolean);
  // The table has a column per grade, one row per week, newest first.
  const maps = lines.map((l) => new Map(l.points));
  const dates = [...new Set(lines.flatMap((l) => l.points.map((p) => p[0])))].filter((d) => !from || d >= from).sort().reverse();
  const tableColumns = [{ key: 'date', header: 'Week of', render: (d) => dateLabel(d) }, ...lines.map((l, i) => ({ key: l.grade, header: byGrade ? l.grade : `Price ${unit}`, align: 'right', render: (d) => (maps[i].has(d) ? format(maps[i].get(d)) : '–') }))];
  // A spot price is a market price, not an average of places: WTI and Brent are named, not called the US average.
  const place = fuel.spot ? 'spot price' : isUS ? 'US average' : location.name;
  return <>
    <Breadcrumbs items={[{ label: 'Fuel prices', href: `${BASE}/fuel` }, isUS ? { label: fuel.name } : { label: fuel.name, href: fuelUrl(fuel.slug) }, !isUS && { label: location.name }].filter(Boolean)} />
    <FuelNav current={fuel.slug} />
    <div className="hero detail-hero"><div><h1 className="dk-h1">{isUS ? fuel.title : `${fuel.title} in ${location.name}`}</h1><p className="lede">{fuel.description}</p></div></div>
    <KeyFigures
      description={fuel.spot ? `${lines[0].grade} spot price, ${unit}.` : `${place}${fuel.grades.length > 1 ? `, ${gradeWord(lines[0].grade)}` : ''}, ${unit}.`}
      context={isUS ? undefined : `${location.name}: ${format(h.value)} ${unit}, against a US average of ${format(usSummary.value)}.`}
      items={[
        { label: 'Latest', value: format(h.value), note: `Week of ${dateLabel(h.date)}` },
        { label: 'Past week', value: h.weekAgo ? <ChangeTag value={h.weekChange} /> : '–', note: h.weekAgo ? `From ${format(h.weekAgo[1])}` : 'No survey a week earlier' },
        { label: 'Past year', value: h.yearAgo ? <ChangeTag value={h.yearChange} /> : '–', note: h.yearAgo ? `From ${format(h.yearAgo[1])}` : 'No survey a year earlier' },
        { label: '12-month range', value: `${format(h.low[1])} to ${format(h.high[1])}`, note: 'Lowest and highest week' },
      ]}
    />
    {stale && fuel.seasonal && <p className="dk-inset">EIA surveys {fuel.name.toLowerCase()} from October to March. These are the last figures of the winter of {Number(h.date.slice(0, 4)) - 1} to {h.date.slice(0, 4)}.{page.survey && <> {page.survey.publisher} surveys all year: {format(page.survey.summary.value)} {unit} in the week of {dateLabel(page.survey.summary.date)}.</>}</p>}
    {locations.length > 1 && <LocationFilter fuel={fuel} location={location} locations={locations} />}
    {page.survey && stale && <StateSurvey survey={page.survey} eia={lines[0]} fuel={fuel} location={location} format={format} />}
    <ChartCard
      id="chart-title"
      title={fuel.spot ? `${fuel.title}, ${fuel.grades.join(' and ')}` : `${fuel.title}, ${place}${byGrade ? ', by grade' : ''}`}
      description={page.cpi && range !== '365' ? `${monthlyView ? 'Monthly average' : 'Weekly price'}, ${unit}. The dashed line is the first ${byGrade ? `${lines[0].grade.toLowerCase()} ` : ''}price shown, grown with inflation.` : `${monthlyView ? 'Monthly average' : 'Weekly price'}, ${unit}.`}
      date={`Up to and including the week of ${dateLabel(h.date)}`}
      tabs={[
        { label: 'Chart', content: <>
          <div className="chart-filters"><FilterSelect value={range} options={RANGES} onChange={(v) => { setRange(v); setVisible(26); }} /></div>
          <LineChart series={series} from={from} to={h.date} format={format} axis={(v) => (Number.isInteger(v) ? `$${v}` : money(v))} monthly={monthlyView} yTitle={`Price ${unit}`} gapDays={monthlyView ? 70 : fuel.seasonal ? 21 : 35} label={`${fuel.title}, ${place}: ${lines.map((l) => `${byGrade ? `${l.grade} ` : ''}${format(l.summary.value)}`).join(', ')} ${unit} in the week of ${dateLabel(h.date)}.`} />
        </> },
        { label: 'Tabular data', short: 'Tabular', content: <>
          <DataTable rows={dates.slice(0, visible)} columns={tableColumns} rowKey={(d) => d} empty="No weeks in this period." />
          {dates.length > visible && <div className="table-more"><Button onClick={() => setVisible((n) => n + 52)}>Show more</Button><span className="dk-hint">Showing {visible} of {number(dates.length)}</span></div>}
        </> },
        { label: 'Download', content: <><p className="download-intro">Every week for every area and grade EIA surveys, as a gzipped CSV.</p><Download file={`fuel-${fuel.slug}.csv.gz`} common={common} /></> },
      ]}
      footer={<p className="chart-note">Source: <a href={fuel.slug === 'crude-oil' ? 'https://www.eia.gov/dnav/pet/pet_pri_spt_s1_w.htm' : fuel.seasonal ? 'https://www.eia.gov/petroleum/heatingoilpropane/' : 'https://www.eia.gov/petroleum/gasdiesel/'} target="_blank" rel="noreferrer">US Energy Information Administration</a>.</p>}
    />
    {page.oilHistory && <ChartCard
      id="shocks-title"
      title="More frequent energy shocks this decade"
      description="Price of crude oil since 1970, dollars a barrel, with the major shocks labelled. Not adjusted for inflation."
      date={`Up to and including the week of ${dateLabel(page.oilHistory.latest.date)}`}
      tabs={[
        { label: 'Chart', content: <OilShocks history={page.oilHistory} /> },
        { label: 'Shocks', content: <DataTable rows={page.oilHistory.shocks} columns={[{ key: 'name', header: 'Shock', render: (r) => r.name }, { key: 'date', header: 'Week', render: (r) => dateLabel(r.date) }, { key: 'value', header: 'Price a barrel', align: 'right', render: (r) => money(r.value) }]} rowKey={(r) => r.name} /> },
      ]}
      footer={<p className="chart-note">Source: <a href="https://www.eia.gov/petroleum/data.php" target="_blank" rel="noreferrer">US Energy Information Administration</a>. Weekly Brent spot from May 1987; before that, the cost of imported crude to US refiners, monthly from 1974 and annual before.</p>}
    />}
    {page.survey && !stale && <StateSurvey survey={page.survey} eia={lines[0]} fuel={fuel} location={location} format={format} />}
    {page.surveys && <SurveyTable rows={page.surveys} fuel={fuel} format={format} />}
    {page.related && <p className="related-link">Pump prices follow crude oil: <a href={fuelUrl(page.related.slug)}>{page.related.grade}</a> {format(page.related.summary.value)} {page.related.unit}, <ChangeTag value={page.related.summary.yearChange} size="small" /> on a year ago.</p>}
    {page.europe && <EuropeCard europe={page.europe} product={fuel.slug} common={common} />}
    {compare.length > 1 && <CompareAreas fuel={fuel} location={location} compare={compare} format={format} />}
    {page.monthly && <MonthlyAreas monthly={page.monthly} fuel={fuel} common={common} />}
  </>;
}
// A state's own weekly survey beside EIA's. EIA stops in March; the state keeps going, so the summer is only here.
function StateSurvey({ survey, eia, fuel, location, format }) {
  const from = addDays(survey.summary.date, -400);
  const series = [{ label: survey.publisher, points: survey.points, colour: SERIES_COLOURS[0] }, { label: 'EIA', points: eia.points, colour: SERIES_COLOURS[1] }];
  const columns = [
    { key: 'region', header: 'Region', render: (r) => r.region },
    { key: 'price', header: `Price ${fuel.unit}`, align: 'right', render: (r) => format(r.price) },
    { key: 'weekChange', header: 'Past week', align: 'right', render: (r) => <Change value={r.weekChange} /> },
  ];
  return <ChartCard
    id="survey-title"
    title={`${fuel.name} in ${location.name}, all year`}
    description={`${survey.publisher} surveys every week of the year. EIA surveys from October to March.`}
    date={`Up to and including the week of ${dateLabel(survey.summary.date)}`}
    tabs={[
      { label: 'Chart', content: <LineChart series={series} from={from} to={survey.summary.date} format={format} yTitle={`Price ${fuel.unit}`} gapDays={21} label={`${fuel.name} in ${location.name}: ${format(survey.summary.value)} ${fuel.unit} in the week of ${dateLabel(survey.summary.date)}, from ${survey.publisher}.`} /> },
      survey.regions.length > 0 && { label: 'By region', short: 'Regions', content: <DataTable rows={survey.regions} columns={columns} rowKey={(r) => r.id} /> },
    ]}
    footer={<p className="chart-note">Source: {survey.publisher}, collected with Kadoa. EIA figures from the US Energy Information Administration.</p>}
  />;
}
function SurveyTable({ rows, fuel, format }) {
  const columns = [
    { key: 'region', header: 'Area', render: (r) => <>{r.statewide ? STATE_NAMES[r.state] ?? r.state : r.region}<span className="cell-note">{r.statewide ? 'Statewide' : STATE_NAMES[r.state] ?? r.state}</span></> },
    { key: 'price', header: `Price ${fuel.unit}`, align: 'right', render: (r) => format(r.price) },
    { key: 'weekChange', header: 'Past week', align: 'right', render: (r) => <Change value={r.weekChange} /> },
    { key: 'publisher', header: 'Survey', hideBelow: 'sm', render: (r) => r.publisher },
  ];
  return <Section title="State surveys, all year" hint={`${[...new Set(rows.map((r) => r.publisher))].length} states survey ${fuel.name.toLowerCase()} every week, including summer. Week of ${dateLabel(rows[0].date)}.`}>
    <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />
    <p className="chart-note">Source: state energy offices, collected with Kadoa.</p>
  </Section>;
}
const STATE_NAMES = { CT: 'Connecticut', MA: 'Massachusetts', ME: 'Maine', NY: 'New York' };

// BLS monthly averages for the metro areas and census divisions EIA's weekly survey leaves out.
function MonthlyAreas({ monthly, fuel, common }) {
  const [sort, setSort] = useState({ key: 'price', dir: 'desc' });
  const rows = [...monthly.rows].sort((a, b) => ((a[sort.key] ?? -Infinity) > (b[sort.key] ?? -Infinity) ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1));
  const TYPE = { us: 'US', region: 'Region', division: 'Division', metro: 'Metro area' };
  const columns = [
    { key: 'area', header: 'Area', sortable: true, render: (r) => <>{r.area}<span className="cell-note">{TYPE[r.areaType]}</span></> },
    { key: 'price', header: 'Price a gallon', align: 'right', sortable: true, render: (r) => perGallon(r.price) },
    { key: 'yearChange', header: 'Past year', align: 'right', sortable: true, render: (r) => <Change value={r.yearChange} /> },
    { key: 'since2019', header: 'Since Aug 2019', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => <Change value={r.since2019} /> },
  ];
  return <Section title="Gas prices by metro area" hint={`Monthly average price in ${monthLabel(monthly.month)}, from the BLS consumer price survey.`}>
    <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} sort={sort} onSort={(key) => setSort((x) => ({ key, dir: x.key === key && x.dir === 'desc' ? 'asc' : 'desc' }))} />
    {/* The fuel's CSV carries these BLS series alongside EIA's weekly ones. */}
    <p className="download-intro section-download">Monthly BLS prices for these areas since 2019 are in the {fuel.name.toLowerCase()} download. <Download file={`fuel-${fuel.slug}.csv.gz`} common={common} /></p>
  </Section>;
}

// ── Electricity
function Electricity({ page }) {
  const ranked = [...page.states].sort((a, b) => b.price12 - a.price12);
  return <>
    <div className="title-block"><h1 className="dk-h1">Electricity prices by state</h1><p className="lede">What US homes pay for electricity, and their average monthly bill, from EIA.</p></div>
    <KeyFigures
      context="Twelve-month figures, because bills rise and fall with the weather."
      items={[
        { label: 'US average price', value: `${cents(page.us.price12)} a kWh`, note: <><ChangeTag value={page.us.price12Change} size="small" /> on a year ago</> },
        { label: 'US average bill', value: `${money(page.us.bill12, 0)} a month`, note: <><ChangeTag value={page.us.bill12Change} size="small" /> on a year ago</> },
        { label: 'Highest price', value: <a href={stateUrl(ranked[0].slug)}>{ranked[0].name}</a>, note: `${cents(ranked[0].price12)} a kWh` },
        { label: 'Lowest price', value: <a href={stateUrl(ranked.at(-1).slug)}>{ranked.at(-1).name}</a>, note: `${cents(ranked.at(-1).price12)} a kWh` },
      ]}
    />
    {page.usHistory && <>
      <HistoryCard id="us-price-title" title="US electricity price" description="Average residential price a kilowatt-hour, by month, with the 12-month average." end={page.us.month} state={page.usHistory.price} stateName="Monthly" us={page.usHistory.price12} compareLabel="12-month average" format={(v) => `${v.toFixed(2)}¢`} axis={(v) => `${v}¢`} yTitle="Cents a kWh" columns="Cents a kWh" file="energy-prices.csv.gz" common={page.common} note={<>Source: <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA Electric Power Monthly</a>. Revenue over kilowatt-hours sold, including fixed charges.</>} downloadText="Every series on this site, including monthly US and state electricity figures, as a gzipped CSV." />
      <HistoryCard id="us-bill-title" title="Average monthly electricity bill" description="What an average home pays a month, with the 12-month average." end={page.us.month} state={page.usHistory.bill} stateName="Monthly" us={page.usHistory.bill12} compareLabel="12-month average" format={(v) => money(v, 0)} yTitle="Dollars a month" columns="Bill" file="energy-prices.csv.gz" common={page.common} note={<>Source: <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA Electric Power Monthly</a>.</>} downloadText="Every series on this site, including monthly US and state electricity figures, as a gzipped CSV." />
    </>}
    <StatesCard states={page.states} us={page.us} month={page.us.month} common={page.common} full usTrend={page.us.trend} cpi={page.electricityCpi} usSince2019={page.us.priceSince2019} cpiTrend={page.electricityCpiTrend} />
    <UtilityChangeCard utilities={page.largest} us={page.us} cpi={page.electricityCpi} common={page.common} />
    {page.europe && <EuropeCard europe={page.europe} product="electricity" common={page.common} />}
    <UtilitiesTable title="Prices at the largest utilities" hint={`The ${page.largest.length} utilities serving 250,000 homes or more, of ${number(page.utilityCount)} tracked. Past 12 months.`} utilities={page.largest} showState />
  </>;
}
// The largest utilities ranked by how much their home price rose since 2019, against the US average over the same
// months: a state average hides the spread (New York's +58% blends NYSEG's +120% and LIPA's +36%), and a reader wants
// to know whether their own utility is unusual. Inflation is in the description, as on the state map.
function UtilityChangeCard({ utilities, us, cpi, common }) {
  const rows = utilities.filter((u) => u.priceSince2019 != null).sort((a, b) => b.priceSince2019 - a.priceSince2019);
  const name = (u) => `${u.name} (${u.state})`;
  return <ChartCard
    id="utility-change-title" title="Price change at the largest utilities since 2019"
    description={`Change in the average home price per kWh, past 12 months against 2019, for the ${rows.length} utilities serving 250,000 homes or more. The US average rose ${Math.round(us.priceSince2019)}%${cpi ? `, against ${Math.round(cpi.change)}% inflation` : ''}.`}
    date={`12 months to ${monthLabel(us.month)}`}
    tabs={[
      { label: 'Chart', content: <ShowMore total={rows.length} initial={15} noun="utilities">{(n) => <ValueRanking rows={rows.slice(0, n).map((u) => ({ name: name(u), value: u.priceSince2019, href: utilityUrl(u.stateSlug, u.slug) }))} average={us.priceSince2019} averageLabel="US average" format={pctLabel} />}</ShowMore> },
      { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={rows.length} initial={15} noun="utilities">{(n) => <DataTable rows={rows.slice(0, n)} rowKey={(u) => u.code} columns={[
        { key: 'name', header: 'Utility', render: (u) => <><a className="cell-link" href={utilityUrl(u.stateSlug, u.slug)}>{u.name}</a><span className="cell-note">{u.state}, {OWNERSHIP[u.ownership] ?? u.ownership}</span></> },
        { key: 'since', header: 'Since 2019', align: 'right', render: (u) => pctLabel(u.priceSince2019) },
        { key: 'price', header: 'Price a kWh', align: 'right', render: (u) => cents(u.price12) },
      ]} />}</ShowMore> },
      { label: 'Download', content: <><p className="download-intro">Every series on this site, including monthly revenue, sales and customers for each utility, as a gzipped CSV.</p><Download file="energy-prices.csv.gz" common={common} /></> },
    ]}
    footer={<p className="chart-note">Source: <a href="https://www.eia.gov/electricity/data/eia861m/" target="_blank" rel="noreferrer">EIA-861M</a> monthly utility sales and revenue; US average from <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA Electric Power Monthly</a>. In states with retail choice, the price for homes that buy their power from the utility.</p>}
  />;
}
// Europe for comparison, one card per product or one with a product select. Each row is the change in a country's
// price since its 2019 average; the US is the dashed line, measured over the same half year (electricity, gas) or the
// same four weeks (petrol, diesel). Prices stay in each currency and unit, not converted.
const EUROPE_PRODUCTS = {
  electricity: { label: 'Electricity', noun: 'home electricity', unitEU: 'a kWh', unitUS: 'a kWh', usPrice: (v) => cents(v), euPrice: (v) => `€${v.toFixed(2)}`, source: <><a href="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table" target="_blank" rel="noreferrer">Eurostat</a> household electricity prices, all taxes included, 2,500 to 4,999 kWh a year; US from <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA Electric Power Monthly</a></> },
  gas: { label: 'Natural gas', noun: 'home natural gas', unitEU: 'a kWh', unitUS: 'a thousand cubic feet', usPrice: (v) => money(v), euPrice: (v) => `€${v.toFixed(3)}`, source: <><a href="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_202/default/table" target="_blank" rel="noreferrer">Eurostat</a> household gas prices, all taxes included, 20 to 199 GJ a year; US residential price from <a href="https://www.eia.gov/naturalgas/monthly/" target="_blank" rel="noreferrer">EIA Natural Gas Monthly</a></> },
  gasoline: { label: 'Petrol', noun: 'pump petrol', unitEU: 'a litre', unitUS: 'a gallon', usPrice: (v) => money(v), euPrice: (v) => `€${v.toFixed(2)}`, source: <>European Commission <a href="https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en" target="_blank" rel="noreferrer">Weekly Oil Bulletin</a>, Euro-super 95 with taxes; US regular gasoline from <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA</a>. Euro-super 95 is a grade above US regular</> },
  diesel: { label: 'Diesel', noun: 'pump diesel', unitEU: 'a litre', unitUS: 'a gallon', usPrice: (v) => money(v), euPrice: (v) => `€${v.toFixed(2)}`, source: <>European Commission <a href="https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en" target="_blank" rel="noreferrer">Weekly Oil Bulletin</a>, automotive diesel with taxes; US on-highway diesel from <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA</a></> },
};
const halfLabel = (iso) => `${iso.slice(5, 7) === '01' ? 'First' : 'Second'} half of ${iso.slice(0, 4)}`;
const periodLabel = (p) => (p.kind === 'half' ? halfLabel(p.from) : `Average of the 4 weeks from ${dateLabel(p.from)} to ${dateLabel(p.to)}`);
function EuropeCard({ europe, product: fixed, common, id = 'europe-title' }) {
  const available = Object.keys(EUROPE_PRODUCTS).filter((k) => (fixed ? k === fixed : europe[k]));
  const [product, setProduct] = useState(available[0]);
  const data = fixed ? europe : europe[product];
  const spec = EUROPE_PRODUCTS[product];
  if (!data || !spec) return null;
  const rows = [...data.countries].sort((a, b) => b.since2019 - a.since2019);
  const tableRows = [{ code: 'US', name: 'United States', since2019: data.us.since2019, price: `${spec.usPrice(data.us.price)} ${spec.unitUS}` }, ...rows.map((c) => ({ ...c, price: `${spec.euPrice(c.price)} ${spec.unitEU}` }))];
  const picker = !fixed && available.length > 1 && <div className="chart-filters"><FilterSelect label="Energy" value={product} options={available.map((k) => [k, EUROPE_PRODUCTS[k].label])} onChange={setProduct} /></div>;
  return <ChartCard
    id={id} title={fixed ? 'How the US compares with Europe' : 'US energy prices compared with Europe'}
    description={`Change in the price of ${spec.noun} since 2019 in the EU and its members, against the US over the same period.`}
    date={periodLabel(data.period)}
    tabs={[
      { label: 'Chart', content: <>{picker}<ShowMore total={rows.length} initial={15} noun="countries">{(n) => <ValueRanking rows={rows.slice(0, n).map((c) => ({ name: c.name, value: c.since2019 }))} average={data.us.since2019} averageLabel="United States" format={pctLabel} />}</ShowMore></> },
      { label: 'Tabular data', short: 'Tabular', content: <>{picker}<DataTable rows={tableRows} rowKey={(r) => r.code} columns={[
        { key: 'name', header: 'Country', render: (r) => r.name },
        { key: 'since2019', header: 'Since 2019', align: 'right', render: (r) => pctLabel(r.since2019) },
        { key: 'price', header: 'Price', align: 'right', render: (r) => r.price },
      ]} /></> },
      { label: 'Download', content: <><p className="download-intro">Every series on this site, including the European prices, as a gzipped CSV.</p><Download file="energy-prices.csv.gz" common={common} /></> },
    ]}
    footer={<p className="chart-note">Source: {spec.source}. Europe in euros, the US in dollars. Not adjusted for inflation.</p>}
  />;
}
function UtilitiesTable({ title, hint, utilities, stateSlug, showState = false }) {
  const [sort, setSort] = useState({ key: showState ? 'price12' : 'customers', dir: 'desc' });
  const value = (r, k) => (k === 'name' ? r.name : r[k] ?? -Infinity);
  const rows = [...utilities].sort((a, b) => { const av = value(a, sort.key), bv = value(b, sort.key); return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
  const columns = [
    { key: 'name', header: 'Utility', sortable: true, render: (r) => <><a className="cell-link" href={utilityUrl(stateSlug ?? r.stateSlug, r.slug)}>{r.name}</a><span className="cell-note">{showState ? `${r.state}, ` : ''}{OWNERSHIP[r.ownership] ?? r.ownership}</span></> },
    { key: 'price12', header: 'Price a kWh', align: 'right', sortable: true, render: (r) => cents(r.price12) },
    { key: 'price12Change', header: 'Past year', align: 'right', sortable: true, render: (r) => <Change value={r.price12Change} /> },
    { key: 'bill12', header: 'Monthly bill', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => money(r.bill12, 0) },
    { key: 'customers', header: 'Homes', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => number(r.customers) },
  ];
  return <Section title={title} hint={hint}>
    <DataTable rows={rows} columns={columns} rowKey={(r) => r.code} sort={sort} onSort={(key) => setSort((x) => ({ key, dir: x.key === key && x.dir === 'desc' ? 'asc' : 'desc' }))} />
  </Section>;
}
// A share below this means most homes in the state buy from someone the table cannot list, and the page says so.
const CHOICE_COVERAGE = 0.6;
function coverageNote(coverage, stateName) {
  if (coverage == null) return '';
  const share = `${Math.round(coverage * 100)}%`;
  return coverage < CHOICE_COVERAGE
    ? `These utilities serve ${share} of homes in ${stateName}. Most of the rest buy power from a retail supplier or a town program, which EIA does not list by name.`
    : `These utilities serve ${share} of homes in ${stateName}; smaller utilities serve the rest.`;
}
const STATE_RANGES = [['1825', '5 years'], ['3650', '10 years'], ['all', 'All']];
// A place against its reference (a state against the US, a utility against its state), measure by measure: the
// twelve-month figures the headlines use, and the latest month beside them, because other sites quote the latest
// month and a reader comparing the two should see both.
function VersusTable({ left, right, rows }) {
  const columns = [
    { key: 'label', header: '', render: (r) => r.label },
    { key: 'left', header: left, align: 'right', render: (r) => r.left },
    { key: 'right', header: right, align: 'right', render: (r) => r.right },
  ];
  return <Section title={`${left} vs ${right === 'US' ? 'the US' : right}`}>
    <DataTable rows={rows.filter(Boolean)} columns={columns} rowKey={(r) => r.label} plain />
  </Section>;
}
const changeOrDash = (v) => (v == null ? '–' : <Change value={v} />);
function HistoryCard({ id, title, description, end, state, stateName, us, format, axis, yTitle, columns, file, common, note, compareLabel = 'US average', downloadText }) {
  const [range, setRange] = useState('1825');
  const from = range === 'all' ? null : addDays(end, -Number(range));
  const rows = [...state].filter(([d]) => !from || d >= from).reverse();
  return <ChartCard
    id={id} title={title} description={description} date={`Up to and including ${monthLabel(end)}`}
    tabs={[
      { label: 'Chart', content: <>
        <div className="chart-filters"><FilterSelect value={range} options={STATE_RANGES} onChange={setRange} /></div>
        <LineChart series={[{ label: compareLabel, points: us, compare: true }, { label: stateName, points: state }]} from={from} to={end} format={format} axis={axis} yTitle={yTitle} monthly gapDays={45} label={`${title}, ${stateName}, with the ${compareLabel}.`} />
      </> },
      { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={rows.length} initial={24} step={60} noun="months">{(n) => <DataTable rows={rows.slice(0, n)} columns={[{ key: 'd', header: 'Month', render: (r) => monthLabel(r[0]) }, { key: 'v', header: columns, align: 'right', render: (r) => format(r[1]) }]} rowKey={(r) => r[0]} />}</ShowMore> },
      { label: 'Download', content: <><p className="download-intro">{downloadText ?? `Monthly price, bill, use and natural gas price for ${stateName}, as a gzipped CSV.`}</p><Download file={file} common={common} /></> },
    ]}
    footer={<p className="chart-note">{note}</p>}
  />;
}
function State({ page }) {
  const { state: s, us, common, history, usHistory } = page;
  const source = <>Source: <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA Electric Power Monthly</a>.</>;
  const file = `electricity-${s.slug}.csv.gz`;
  return <>
    <p className="back-link"><a href={`${BASE}/electricity`}>All states</a></p>
    <div className="hero detail-hero"><div><h1 className="dk-h1">Electricity prices in {s.name}</h1><p className="lede">What homes in {s.name} pay for electricity, from EIA.</p></div></div>
    <KeyFigures
      context={`Over the 12 months to ${monthLabel(s.month)}, ${s.name} homes paid ${cents(s.price12)} a kWh, against a US average of ${cents(us.price12)}.`}
      items={[
        { label: 'Average price', value: `${cents(s.price12)} a kWh`, note: <><ChangeTag value={s.price12Change} size="small" /> on a year ago</> },
        { label: 'Average bill', value: `${money(s.bill12, 0)} a month`, note: <><ChangeTag value={s.bill12Change} size="small" /> on a year ago</> },
        { label: 'Average use', value: `${number(s.use12)} kWh`, note: `A month. US ${number(us.use12)} kWh` },
        { label: 'Price rank', value: `${page.rankPrice} of ${page.stateCount}`, note: '1 is the most expensive' },
      ]}
    />
    <VersusTable left={s.name} right="US" rows={[
      { label: `Average price, 12 months to ${monthLabel(s.month)}`, left: cents(s.price12), right: cents(us.price12) },
      { label: `Price in ${monthLabel(s.month)}`, left: cents(s.price?.value), right: cents(us.price?.value) },
      { label: 'Average monthly bill, 12 months', left: money(s.bill12, 0), right: money(us.bill12, 0) },
      { label: `Bill in ${monthLabel(s.month)}`, left: money(history.bill.at(-1)?.[1], 0), right: money(usHistory.bill.at(-1)?.[1], 0) },
      { label: 'Average monthly use', left: `${number(s.use12)} kWh`, right: `${number(us.use12)} kWh` },
      { label: 'Price change, past year', left: changeOrDash(s.price12Change), right: changeOrDash(us.price12Change) },
      { label: 'Price change since 2019', left: changeOrDash(s.priceSince2019), right: changeOrDash(us.priceSince2019) },
    ]} />
    <HistoryCard id="price-title" title="Electricity price" description="Average residential price a kilowatt-hour, by month." end={s.month} state={history.price} stateName={s.name} us={usHistory.price} format={(v) => `${v.toFixed(2)}¢`} axis={(v) => `${v}¢`} yTitle="Cents a kWh" columns="Cents a kWh" file={file} common={common} note={<>{source} Revenue over kilowatt-hours sold, including fixed charges.</>} />
    <HistoryCard id="bill-title" title="Average monthly bill" description="What an average home pays a month. Bills peak in summer and winter." end={s.month} state={history.bill} stateName={s.name} us={usHistory.bill} format={(v) => money(v, 0)} yTitle="Dollars a month" columns="Bill" file={file} common={common} note={<>{source} EIA's own method for its average bill table.</>} />
    {history.gas.length > 0 && <HistoryCard id="gas-title" title="Natural gas price" description="Average residential price a thousand cubic feet, by month. Summer prices are high because fixed charges are spread over little gas." end={history.gas.at(-1)[0]} state={history.gas} stateName={s.name} us={usHistory.gas} format={(v) => money(v)} yTitle="Dollars a Mcf" columns="Price a Mcf" file={file} common={common} note={<>Source: <a href="https://www.eia.gov/naturalgas/monthly/" target="_blank" rel="noreferrer">EIA Natural Gas Monthly</a>.</>} />}
    {page.utilities?.length > 0 && <UtilitiesTable title={`Utilities in ${s.name}`} hint={`Past 12 months, utilities with 10,000 homes or more. ${coverageNote(page.coverage, s.name)}`} utilities={page.utilities} stateSlug={s.slug} />}
    {page.rateCases?.length > 0 && <><RateCaseTables cases={page.rateCases} where={` in ${s.name}`} /><p className="chart-note related-link"><a href={`${BASE}/rate-cases`}>Rate cases in other states</a></p></>}
    {page.heating.length > 0 && <p className="dk-hint">Heating fuels in {s.name}: {page.heating.map((f, i) => <React.Fragment key={f.slug}>{i ? ', ' : ''}<a href={`${fuelUrl(f.slug)}?area=${s.code}`}>{f.name.toLowerCase()}</a></React.Fragment>)}.</p>}
  </>;
}

function Utility({ page }) {
  const { utility: u, state: st, common, history, stateHistory } = page;
  const file = `utility-${st.slug}-${u.slug}.csv.gz`;
  const source = <>Source: <a href="https://www.eia.gov/electricity/data/eia861m/" target="_blank" rel="noreferrer">EIA-861M monthly utility survey</a>.</>;
  const choice = page.coverage != null && page.coverage < CHOICE_COVERAGE;
  return <>
    <p className="back-link"><a href={stateUrl(st.slug)}>{st.name}</a></p>
    <div className="hero detail-hero"><div><h1 className="dk-h1">{u.name} electricity rates</h1><p className="lede">What homes pay {u.name} for electricity, from EIA.</p><p className="dk-hint">{OWNERSHIP[u.ownership] ?? u.ownership} utility, {number(u.customers)} homes in {st.name}. EIA lists it as {u.eiaName}.</p></div></div>
    <KeyFigures
      context={u.price12 != null && st.price12 != null ? `Over the 12 months to ${monthLabel(u.month)}, ${u.name} homes paid ${cents(u.price12)} a kWh, against ${cents(st.price12)} across ${st.name}.` : undefined}
      items={[
        { label: 'Average price', value: u.price12 != null ? `${cents(u.price12)} a kWh` : '–', note: u.price12Change != null ? <><ChangeTag value={u.price12Change} size="small" /> on a year ago</> : 'No year to compare' },
        { label: 'Average bill', value: u.bill12 != null ? `${money(u.bill12, 0)} a month` : '–', note: u.bill12Change != null ? <><ChangeTag value={u.bill12Change} size="small" /> on a year ago</> : 'No year to compare' },
        { label: 'Average use', value: u.use12 != null ? `${number(u.use12)} kWh` : '–', note: `A month. ${st.name} ${number(st.use12)} kWh` },
        page.rank && { label: `Price rank in ${st.name}`, value: `${page.rank} of ${page.utilityCount}`, note: '1 is the most expensive' },
      ]}
    />
    {choice && <p className="dk-inset">Many homes in {st.name} buy power from a retail supplier. These figures cover {u.name}'s own customers, who buy delivery and power from it.</p>}
    <VersusTable left={u.name} right={st.name} rows={[
      { label: `Average price, 12 months to ${monthLabel(u.month)}`, left: cents(u.price12), right: cents(st.price12) },
      { label: `Price in ${monthLabel(u.month)}`, left: cents(history.price.at(-1)?.[1]), right: cents(stateHistory.price.at(-1)?.[1]) },
      { label: 'Average monthly bill, 12 months', left: money(u.bill12, 0), right: money(st.bill12, 0) },
      { label: `Bill in ${monthLabel(u.month)}`, left: money(history.bill.at(-1)?.[1], 0), right: money(stateHistory.bill.at(-1)?.[1], 0) },
      { label: 'Average monthly use', left: u.use12 != null ? `${number(u.use12)} kWh` : '–', right: `${number(st.use12)} kWh` },
      { label: 'Price change, past year', left: changeOrDash(u.price12Change), right: changeOrDash(st.price12Change) },
      { label: 'Price change since 2019', left: changeOrDash(u.priceSince2019), right: changeOrDash(st.priceSince2019) },
    ]} />
    <HistoryCard id="price-title" title="Electricity price" description="Average residential price a kilowatt-hour, by month." end={u.month} state={history.price} stateName={u.name} us={stateHistory.price} compareLabel={`${st.name} average`} format={(v) => `${v.toFixed(2)}¢`} axis={(v) => `${v}¢`} yTitle="Cents a kWh" columns="Cents a kWh" file={file} common={common} note={<>{source} Revenue over kilowatt-hours sold, including fixed charges.</>} downloadText={`Monthly residential revenue, sales and customers for ${u.name} in ${st.name}, as a gzipped CSV.`} />
    <HistoryCard id="bill-title" title="Average monthly bill" description="What an average home pays a month." end={u.month} state={history.bill} stateName={u.name} us={stateHistory.bill} compareLabel={`${st.name} average`} format={(v) => money(v, 0)} yTitle="Dollars a month" columns="Bill" file={file} common={common} note={source} downloadText={`Monthly residential revenue, sales and customers for ${u.name} in ${st.name}, as a gzipped CSV.`} />
  </>;
}
// ── Rate cases
const SERVICE = { electric: 'Electricity', gas: 'Gas', steam: 'Steam' };
const STATUS = { pending: 'Open', decided: 'Decided', settled: 'Settled', withdrawn: 'Withdrawn' };
const millions = (v) => (v >= 1000 ? `$${Number((v / 1000).toFixed(2))} billion` : `$${v >= 10 ? Math.round(v) : Number(v.toFixed(1))} million`);
const asked = (c) => [c.requested != null && millions(c.requested), c.requestedPct != null && `${Number(c.requestedPct.toFixed(1))}%`].filter(Boolean).join(', ') || '–';
function CaseTable({ cases, open, showState }) {
  const columns = [
    { key: 'utility', header: 'Utility', render: (c) => <>{c.url ? <a className="cell-link" href={c.url} target="_blank" rel="noreferrer">{c.utility}</a> : c.utility}<span className="cell-note">{showState ? `${c.state}, ` : ''}{SERVICE[c.service].toLowerCase()}, {c.caseId}</span></> },
    open
      ? { key: 'filed', header: 'Filed', hideBelow: 'sm', render: (c) => (c.filed ? dateLabel(c.filed) : '–') }
      : { key: 'decided', header: 'Decided', render: (c) => (c.decided ? dateLabel(c.decided) : '–') },
    { key: 'asked', header: 'Asked for', align: 'right', render: asked },
    open
      ? { key: 'expected', header: 'Decision due', hideBelow: 'sm', render: (c) => c.expected ?? '–' }
      : { key: 'approved', header: 'Approved', align: 'right', render: (c) => (c.approved != null ? millions(c.approved) : '–') },
  ];
  return <DataTable rows={cases} columns={columns} rowKey={(c) => `${c.state}-${c.caseId}-${c.service}`} empty="No cases." />;
}
function RateCaseTables({ cases, showState, where = '' }) {
  const open = cases.filter((c) => c.status === 'pending');
  const done = cases.filter((c) => c.status === 'decided' || c.status === 'settled');
  return <>
    {open.length > 0 && <Section title={`Open rate cases${where}`} hint="Increases a utility has asked for, as filed. The regulator usually approves less."><CaseTable cases={open} open showState={showState} /></Section>}
    {done.length > 0 && <Section title={`Rate cases decided${where}, past two years`} hint="Approved is the first year's increase, where the regulator states it."><CaseTable cases={done} showState={showState} /></Section>}
  </>;
}
function RateCases({ page }) {
  const initial = typeof window === 'undefined' ? 'all' : new URLSearchParams(window.location.search).get('state') ?? 'all';
  const [state, setState] = useState(page.states.some((s) => s.code === initial) ? initial : 'all');
  const [service, setService] = useState('all');
  const pick = (v) => { setState(v); try { const u = new URL(window.location.href); v === 'all' ? u.searchParams.delete('state') : u.searchParams.set('state', v); window.history.replaceState(null, '', u); } catch {} };
  const cases = page.cases.filter((c) => (state === 'all' || c.state === state) && (service === 'all' || c.service === service));
  const open = page.cases.filter((c) => c.status === 'pending');
  const biggest = [...open].filter((c) => c.requested != null).sort((a, b) => b.requested - a.requested)[0];
  return <>
    <div className="title-block"><h1 className="dk-h1">Utility rate cases</h1><p className="lede">Utilities need a state regulator's approval to raise rates. Open cases and recent decisions, from each regulator's own pages.</p></div>
    <KeyFigures
      items={[
        { label: 'Open cases', value: number(open.length), note: `In ${page.states.length} states` },
        biggest && { label: 'Largest open request', value: millions(biggest.requested), note: `${biggest.utility}, ${biggest.state}` },
        { label: 'Decided', value: number(page.cases.length - open.length), note: 'In the past two years' },
        { label: 'States', value: page.states.map((s) => s.code).join(', '), note: 'Checked weekly' },
      ]}
    />
    <div className="chart-filters case-filters">
      <FilterSelect label="State" value={state} options={[['all', 'All states'], ...page.states.map((s) => [s.code, s.name])]} onChange={pick} />
      <FilterSelect label="Service" value={service} options={[['all', 'Electricity and gas'], ['electric', 'Electricity'], ['gas', 'Gas']]} onChange={setService} />
    </div>
    <RateCaseTables cases={cases} showState={state === 'all'} />
    {cases.length === 0 && <p className="dk-hint">No cases match these filters.</p>}
    <p className="chart-note">Source: state utility commissions, collected with Kadoa. A figure is shown only where the commission's page prints it. <a href={`${dataPath(page.common)}/downloads/rate-cases.csv.gz`} download>Download CSV (gzip)</a></p>
  </>;
}

function About() {
  return <AboutPage
    dataset="energy-prices"
    lede="Weekly US fuel prices, monthly home electricity and gas prices by state and utility, and utility rate cases."
    steps={[
      { title: 'Monitor', text: 'Kadoa checks EIA, BLS and state agencies for new figures every week.' },
      { title: 'Extract', text: 'It reads government data files and state web pages and pulls out each price and rate case.' },
      { title: 'Clean', text: 'Missing values stay blank, and implausible ones are rejected.' },
      { title: 'Publish', text: 'New figures go live on the site and in the CSV downloads.' },
    ]}
    sources={[
      { name: 'US Energy Information Administration (EIA)', href: 'https://www.eia.gov/', what: 'Fuel prices, and electricity and gas prices by state and utility' },
      { name: 'US Bureau of Labor Statistics (BLS)', href: 'https://www.bls.gov/cpi/', what: 'Average prices and the Consumer Price Index' },
      { name: 'State utility commissions', href: `${BASE}/rate-cases`, what: 'Rate cases, linked case by case' },
      { name: 'State energy offices', href: `${BASE}/fuel/heating-oil`, what: 'Heating oil and propane surveys in CT, ME, MA and NY' },
      { name: 'Eurostat', href: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table', what: 'European household electricity and gas prices' },
      { name: 'EU Weekly Oil Bulletin', href: 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en', what: 'European petrol, diesel and heating oil prices' },
      { name: 'US Census Bureau', href: 'https://www.census.gov/foreign-trade/index.html', what: 'US exports by product, for the gold exports insight' },
    ]}
    methods={METHODS}
    corrections={<>Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.</>}
  />;
}

// The state tile map on its own page, so a link to it (HN, Reddit, a newsletter) gets its own title and preview card.
function ElectricityMap({ page }) {
  return <>
    <Breadcrumbs items={[{ label: 'Electricity', href: `${BASE}/electricity` }, { label: 'Map' }]} />
    <div className="title-block"><h1 className="dk-h1">Home electricity prices by state since 2019</h1><p className="lede">Change in the average home price per kilowatt-hour, 12 months to {monthLabel(page.us.month)} against 2019. The US average rose {Math.round(page.us.priceSince2019)}%, against {Math.round(page.electricityCpi.change)}% inflation.</p></div>
    <section className="chart-panel-card map-page" aria-label="Map of electricity prices by state">
      <StateExplorer states={page.states} usTrend={page.us.trend} cpiTrend={page.electricityCpiTrend} href={stateUrl} />
    </section>
  </>;
}

// ── Insights: an index of cards (the Congress Trading Monitor's layout), and one page per analysis.
function InsightsIndex({ page }) {
  return <>
    <div className="title-block"><h1 className="dk-h1">Insights</h1><p className="lede">Analysis built on the monitor's EIA, BLS and Census data.</p></div>
    <ul className="insight-cards">{page.insights.map((i) => <li className="insight-card" key={i.slug}><h2 className="insight-card__title"><a href={`${BASE}/insights/${i.slug}`}>{i.title}</a></h2><p className="insight-card__desc">{i.summary}</p></li>)}</ul>
  </>;
}
// Gold against the biggest US exports since 2020. Values are Census millions of dollars.
const billions = (v) => `$${(v / 1000).toFixed(1)}B`;
// Aircraft engines are context, in a dark grey that stays apart from the blue, orange and turquoise for colour-blind readers (7.1:1 on white).
const AIRCRAFT = '#55595c';
const GOLD_NAMES = { nonmonetary_gold: 'Gold', crude_oil: 'Crude oil', pharmaceutical_preparations: 'Pharmaceuticals' };
const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
// Consecutive months read as one stretch: "October and November 2025 and January to March 2026".
function monthRuns(months) {
  const runs = [];
  for (const m of months) {
    const last = runs.at(-1)?.at(-1);
    if (last && addMonths(`${last}-01`, 1).slice(0, 7) === m && last.slice(0, 4) === m.slice(0, 4)) runs.at(-1).push(m);
    else runs.push([m]);
  }
  const name = (m) => monthLabel(`${m}-01`).split(' ')[0];
  return listOf(runs.map((r) => (r.length === 1 ? monthLabel(`${r[0]}-01`) : `${name(r[0])} ${r.length === 2 ? 'and' : 'to'} ${name(r.at(-1))} ${r[0].slice(0, 4)}`)));
}
function GoldExportsInsight({ page }) {
  const g = page.gold, l = g.latest;
  const month = (m) => monthLabel(`${m}-01`);
  const rows = [...g.rows].reverse();
  const topName = (r) => GOLD_NAMES[r.top] ?? r.topLabel;
  const columns = [
    { key: 'month', header: 'Month', render: (r) => month(r.month) },
    { key: 'gold', header: 'Gold', align: 'right', render: (r) => billions(r.gold) },
    { key: 'crude', header: 'Crude oil', align: 'right', render: (r) => billions(r.crude) },
    { key: 'pharma', header: 'Pharmaceuticals', align: 'right', hideBelow: 'sm', render: (r) => billions(r.pharma) },
    { key: 'engines', header: 'Aircraft engines', align: 'right', hideBelow: 'sm', render: (r) => (r.engines == null ? '–' : billions(r.engines)) },
    { key: 'top', header: 'Top export', hideBelow: 'sm', render: topName },
  ];
  const line = (key) => g.rows.map((r) => [`${r.month}-01`, r[key]]);
  // The 12-month totals carry the headline; single months are the second view, since gold leads one month and is
  // fifth the next.
  // Data published before the 12-month totals existed has none: the page then shows the monthly chart alone.
  const t = g.totals?.at(-1);
  const total = (key) => g.totals.map((r) => [`${r.month}-01`, r[key]]);
  // One line: the chart shows the rest, and About the data explains it.
  const lede = t && g.leadSince
    ? 'Over the last 12 months, gold took the lead from crude oil and pharmaceuticals.'
    : g.led.length ? `Gold was the largest US export in ${monthRuns(g.led)}, ahead of crude oil and pharmaceuticals.` : '';
  return <>
    <div className="title-block"><h1 className="dk-h1">{page.title}</h1><p className="lede">{lede}</p></div>
    <ChartCard
      id="gold-title"
      title="Gold against the biggest US exports"
      tabs={[
        t && { label: '12-month total', short: '12 months', content: <LineChart series={[{ label: 'Gold', points: total('gold'), colour: SERIES_COLOURS[1] }, { label: 'Crude oil', points: total('crude'), colour: SERIES_COLOURS[0] }, { label: 'Pharmaceuticals', points: total('pharma'), colour: SERIES_COLOURS[2] }, { label: 'Aircraft engines', points: total('engines'), colour: AIRCRAFT }]} format={billions} axis={(v) => `$${v / 1000}B`} yTitle="Exports over the previous 12 months" monthly gapDays={45} label={`US exports in the 12 months to ${month(t.month)}: gold ${billions(t.gold)}, crude oil ${billions(t.crude)}, pharmaceuticals ${billions(t.pharma)}, aircraft engines ${billions(t.engines)}.`} /> },
        { label: 'Monthly', content: <LineChart series={[{ label: 'Gold', points: line('gold'), colour: SERIES_COLOURS[1] }, { label: 'Crude oil', points: line('crude'), colour: SERIES_COLOURS[0] }, { label: 'Pharmaceuticals', points: line('pharma'), colour: SERIES_COLOURS[2] }, { label: 'Aircraft engines', points: line('engines'), colour: AIRCRAFT }]} format={billions} axis={(v) => `$${v / 1000}B`} yTitle="Exports a month" monthly gapDays={45} label={`US exports in ${month(l.month)}: gold ${billions(l.gold)}, crude oil ${billions(l.crude)}, pharmaceuticals ${billions(l.pharma)}, aircraft engines ${billions(l.engines)}.`} /> },
        { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={rows.length} initial={24} step={120} noun="months">{(n) => <DataTable rows={rows.slice(0, n)} columns={columns} rowKey={(r) => r.month} />}</ShowMore> },
        { label: 'Download', content: <><p className="download-intro">Every month since {month(g.rows[0].month)}: gold, crude oil, pharmaceutical and aircraft engine exports and the top export category, in millions of dollars, as a gzipped CSV.</p><Download file="gold-top-export.csv.gz" common={page.common} /></> },
      ].filter(Boolean)}
      footer={<p className="chart-note">Source: <a href="https://www.census.gov/foreign-trade/Press-Release/current_press_release/index.html" target="_blank" rel="noreferrer">US Census Bureau</a> exports by end-use category, seasonally adjusted.</p>}
    />
    {/* Background for readers who ask what is being counted. The figures here are fixed to the years they name. */}
    <section className="insight-notes">
      <SectionHeading>About the data</SectionHeading>
      <ul>
        <li>These are dollars, not tonnes. The gold price roughly doubled from early 2024 to late 2025, so part of the rise is price.</li>
        <li>Census counts gold traded as a commodity: bars, doré and scrap. Central bank reserves are left out, so countries moving their reserves out of the US don&apos;t show up here.</li>
        <li>Most of it goes to Switzerland, home of the biggest refineries: $47.9B of the $86.9B exported in 2025. The UK, home of the London bullion market, took $19.6B.</li>
        <li>Some of it is gold going back out. Traders rushed about $78B of gold into the US in early 2025, ahead of possible tariffs. From April 2025 to June 2026, exports beat imports by about $115B (<a href="https://www.bea.gov/data/intl-trade-investment/international-transactions" target="_blank" rel="noreferrer">BEA</a>).</li>
        <li>Central bank demand may play a part. Foreign central banks now hold more gold than US Treasuries. Trade data doesn&apos;t show who ends up with it.</li>
      </ul>
    </section>
  </>;
}
function FuelWorkInsight({ page }) {
  const w = page.work, l = w.latest;
  const rows = [...w.rows].reverse();
  const columns = [
    { key: 'month', header: 'Month', render: (r) => monthLabel(`${r.month}-01`) },
    { key: 'dieselMinutes', header: 'Diesel, minutes', align: 'right', render: (r) => r.dieselMinutes.toFixed(1) },
    { key: 'gasMinutes', header: 'Gas, minutes', align: 'right', render: (r) => r.gasMinutes.toFixed(1) },
    { key: 'diesel', header: 'Diesel price', align: 'right', hideBelow: 'sm', render: (r) => perGallon(r.diesel) },
    { key: 'gas', header: 'Gas price', align: 'right', hideBelow: 'sm', render: (r) => perGallon(r.gas) },
    { key: 'pay', header: 'Hourly pay', align: 'right', hideBelow: 'sm', render: (r) => money(r.pay) },
  ];
  return <>
    <div className="title-block"><h1 className="dk-h1">{page.title}</h1><p className="lede">Minutes of average US hourly pay to buy a gallon of <strong style={{ color: SERIES_COLOURS[1] }}>diesel</strong> or <strong style={{ color: SERIES_COLOURS[0] }}>regular gas</strong>.{w.widestGap ? ` In ${monthLabel(`${l.month}-01`)} the two were ${(l.dieselMinutes - l.gasMinutes).toFixed(1)} minutes apart, the widest gap on record.` : ''}</p></div>
    <ChartCard
      id="work-title"
      title="Minutes of work per gallon"
      tabs={[
        { label: 'Chart', content: <FuelWork work={w} /> },
        { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={rows.length} initial={24} step={120} noun="months">{(n) => <DataTable rows={rows.slice(0, n)} columns={columns} rowKey={(r) => r.month} />}</ShowMore> },
        { label: 'Download', content: <><p className="download-intro">Every month since April 1994: diesel and gas prices, hourly pay and minutes of work, as a gzipped CSV.</p><Download file="fuel-minutes-of-work.csv.gz" common={page.common} /></> },
      ]}
      footer={<p className="chart-note">Source: <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA</a> retail fuel prices, <a href="https://www.bls.gov/ces/" target="_blank" rel="noreferrer">BLS</a> hourly pay.</p>}
    />
    <section className="insight-notes">
      <SectionHeading>About the data</SectionHeading>
      <ul>
        <li>We divide the month&apos;s average price of a gallon by average hourly pay, then turn that into minutes.</li>
        <li>Pay is BLS average hourly earnings for production and nonsupervisory workers, before tax.</li>
        <li>EIA&apos;s diesel prices start in 1994.</li>
      </ul>
    </section>
  </>;
}

// Investor-owned against public and co-op utilities, from EIA's annual survey of every utility. Investor-owned is the
// story (orange); public and co-op are blue and turquoise; inflation is the grey dashed comparison.
const OWNER_COLOURS = { iou: SERIES_COLOURS[1], public: SERIES_COLOURS[0], coop: SERIES_COLOURS[2] };
const centsKwh = (v) => `${v.toFixed(1)}¢`;
const sortBy = (rows, sort, value) => [...rows].sort((a, b) => { const av = value(a, sort.key), bv = value(b, sort.key); return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
const toggle = (key) => (s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' });
function UtilityOwnershipInsight({ page }) {
  const o = page.ownership, { base, latest } = o;
  const [stateSort, setStateSort] = useState({ key: 'name', dir: 'asc' });
  const [utilitySort, setUtilitySort] = useState({ key: 'change', dir: 'desc' });
  const since = o.rows.filter((r) => r.year >= base);
  const at = (rows, pick) => rows.map((r) => [`${r.year}-01-01`, pick(r)]).filter(([, v]) => v != null);
  const owners = [['iou', 'Investor-owned'], ['public', 'Public'], ['coop', 'Co-op']];
  const first = o.rows[0], last = o.rows.at(-1);
  const stateValue = (r, k) => ({ name: r.name, iou: r.iou.change, nfp: r.nfp.change, iouPrice: r.iou.to, nfpPrice: r.nfp.to })[k];
  const stateColumns = [
    { key: 'name', header: 'State', sortable: true, render: (r) => <a className="cell-link" href={stateUrl(r.slug)}>{r.name}</a> },
    { key: 'iou', header: 'Investor-owned', align: 'right', sortable: true, render: (r) => <Change value={r.iou.change} /> },
    { key: 'nfp', header: 'Nonprofit', align: 'right', sortable: true, render: (r) => <Change value={r.nfp.change} /> },
    { key: 'iouPrice', header: `Investor-owned, ${latest}`, align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.iou.to) },
    { key: 'nfpPrice', header: `Nonprofit, ${latest}`, align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.nfp.to) },
  ];
  const utilityColumns = [
    { key: 'name', header: 'Utility', sortable: true, render: (r) => (r.href ? <a className="cell-link" href={r.href}>{r.name}</a> : r.name) },
    { key: 'state', header: 'State', sortable: true, hideBelow: 'sm' },
    { key: 'ownership', header: 'Owner', sortable: true },
    { key: 'from', header: String(base), align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.from) },
    { key: 'to', header: String(latest), align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.to) },
    { key: 'change', header: 'Change', align: 'right', sortable: true, render: (r) => <Change value={r.change} /> },
  ];
  const states = sortBy(o.states, stateSort, stateValue);
  const utilities = sortBy(o.utilities, utilitySort, (r, k) => r[k]);
  // Cents a kWh for each owner, with the change since the base year beside it from the base on.
  const yearColumns = [
    { key: 'year', header: 'Year' },
    ...owners.map(([k, label]) => ({ key: k, header: label, align: 'right', render: (r) => <>{centsKwh(r.price[k])}{r.year > base && <span className="dk-hint"> {pctLabel(r.since[k])}</span>}</> })),
    { key: 'inflation', header: `Inflation since ${base}`, align: 'right', hideBelow: 'sm', render: (r) => (r.year > base ? pctLabel(r.inflation) : '–') },
    ...owners.map(([k, label]) => ({ key: `bill-${k}`, header: `${label}, monthly bill`, align: 'right', hideBelow: 'sm', render: (r) => money(r.bill[k], 0) })),
  ];
  // States by how much faster investor-owned prices rose than nonprofit ones.
  const byGap = [...o.states].sort((x, y) => (y.iou.change - y.nfp.change) - (x.iou.change - x.nfp.change)).map((s) => ({ name: s.name, href: stateUrl(s.slug), a: s.iou.change, b: s.nfp.change }));
  const e = o.spread.edges;
  const spreadRows = [...Array(e.length + 1).keys()].map((i) => ({ band: i === 0 ? `Under ${e[0]}¢` : i === e.length ? `${e.at(-1)}¢ or more` : `${e[i - 1]} to ${e[i]}¢`, iou: o.spread.iou.shares[i], public: o.spread.public.shares[i], coop: o.spread.coop.shares[i] }));
  const spreadColumns = [{ key: 'band', header: 'Price a kWh' }, ...owners.map(([k, label]) => ({ key: k, header: label, align: 'right', render: (r) => `${r[k].toFixed(1)}%` }))];
  const source = (cpi) => <p className="chart-note">Source: <a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noreferrer">EIA</a> annual survey of utilities (Form 861), homes buying supply and delivery from their utility{cpi ? <>; <a href="https://www.bls.gov/cpi/" target="_blank" rel="noreferrer">BLS</a> CPI</> : null}.</p>;
  const b1 = last.bill;
  // Percentages in sentences go without the sign the tables use.
  const pc = (v) => pctLabel(Math.abs(v)).replace(/^\+/, '');
  return <>
    <div className="title-block"><h1 className="dk-h1">{page.title}</h1><p className="lede">In {latest}, homes paid {centsKwh(last.price.iou)} a kilowatt-hour at <strong style={{ color: OWNER_COLOURS.iou }}>investor-owned</strong> utilities, {centsKwh(last.price.public)} at <strong style={{ color: OWNER_COLOURS.public }}>public</strong> utilities and {centsKwh(last.price.coop)} at <strong style={{ color: OWNER_COLOURS.coop }}>co-ops</strong>. Since {base}, investor-owned prices rose {pc(o.change.iou)} and public ones {pc(o.change.public)}, against {pc(o.inflation)} inflation.</p></div>
    {/* One card per finding; tabs only switch between views of the same figures (change or cents, chart or table). */}
    <ChartCard
      id="price-title"
      title="Average home price by utility owner"
      description={`Change since ${base} against inflation, or cents per kilowatt-hour since ${first.year}.`}
      tabs={[
        { label: `Change since ${base}`, short: 'Change', content: <LineChart series={[...owners.map(([k, label]) => ({ label, points: at(since, (r) => r.since[k]), colour: OWNER_COLOURS[k] })), { label: 'Inflation', points: at(since, (r) => r.inflation), compare: true }]} format={pctLabel} axis={(v) => `${v}%`} yTitle={`Price change since ${base}`} yearly gapDays={400} label={`Change in the average home price per kWh from ${base} to ${latest}: investor-owned ${pctLabel(o.change.iou)}, public ${pctLabel(o.change.public)}, co-op ${pctLabel(o.change.coop)}; inflation ${pctLabel(o.inflation)}.`} /> },
        { label: 'Cents per kWh', short: 'Cents', content: <LineChart series={owners.map(([k, label]) => ({ label, points: at(o.rows, (r) => r.price[k]), colour: OWNER_COLOURS[k] }))} format={centsKwh} axis={(v) => `${v}¢`} yTitle="Cents a kWh" yearly gapDays={400} label={`Average home price per kWh in ${first.year} and ${latest}: investor-owned ${centsKwh(first.price.iou)} and ${centsKwh(last.price.iou)}, public ${centsKwh(first.price.public)} and ${centsKwh(last.price.public)}, co-op ${centsKwh(first.price.coop)} and ${centsKwh(last.price.coop)}.`} /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={[...o.rows].reverse()} columns={yearColumns} rowKey={(r) => r.year} /> },
        { label: 'Download', content: <><p className="download-intro">Every year since {first.year}: home revenue, kWh sold, homes, price and bill by utility owner, for the US and each state, as a gzipped CSV.</p><Download file="investor-owned-utilities.csv.gz" common={page.common} /></> },
      ]}
      footer={source(true)}
    />
    <ChartCard
      id="spread-title"
      title={`Home prices in ${latest}`}
      description="Share of homes by their utility's average price per kilowatt-hour, in 2-cent bands."
      tabs={[
        { label: 'Chart', content: <PriceSpread edges={o.spread.edges} panels={[
          { key: 'iou', label: 'Investor-owned', colour: OWNER_COLOURS.iou, shares: o.spread.iou.shares, note: `${pc(o.spread.iou.from12to20)} of homes paid 12 to 20 cents, and ${pc(o.spread.iou.from30)} paid 30 cents or more.` },
          { key: 'public', label: 'Public', colour: OWNER_COLOURS.public, shares: o.spread.public.shares, note: `${pc(o.spread.public.under14)} paid under 14 cents.${o.spread.highPublic.names.length ? ` The bump at the high end is ${listOf(o.spread.highPublic.names)}, ${pc(o.spread.highPublic.share)} of public homes.` : ''}` },
          { key: 'coop', label: 'Co-op', colour: OWNER_COLOURS.coop, shares: o.spread.coop.shares, note: `${pc(o.spread.coop.under14)} paid under 14 cents.` },
        ]} /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={spreadRows} columns={spreadColumns} rowKey={(r) => r.band} /> },
      ]}
      footer={source(false)}
    />
    <ChartCard
      id="states-title"
      title={`Price change by state, ${base} to ${latest}`}
      description={<>States sorted by how far <strong style={{ color: OWNER_COLOURS.iou }}>investor-owned</strong> prices pulled ahead of <strong style={{ color: OWNER_COLOURS.public }}>nonprofit</strong> (public and co-op) prices. The gap is widest at the top.</>}
      tabs={[
        { label: 'Chart', content: <GapDots rows={byGap} a={{ label: 'investor-owned', colour: OWNER_COLOURS.iou }} b={{ label: 'nonprofit', colour: OWNER_COLOURS.public }} format={pctLabel} divider={(n) => `Nonprofit prices rose as fast or faster in these ${n}`} /> },
        { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={states.length} initial={15} noun="states">{(n) => <DataTable rows={states.slice(0, n)} columns={stateColumns} rowKey={(r) => r.code} sort={stateSort} onSort={(key) => setStateSort(toggle(key))} />}</ShowMore> },
      ]}
      footer={source(false)}
    />
    {o.noHydro && o.sameState && (() => {
      // The headline comparison first, then the stricter checks: no hydro states, the same state, the most rural utilities.
      const checks = [
        { name: 'Public, all states', a: last.price.iou, b: last.price.public, gap: o.premium, colour: OWNER_COLOURS.public },
        { name: 'Public, no hydro states', a: o.noHydro.iouPrice, b: o.noHydro.publicPrice, gap: o.noHydro.premium, colour: OWNER_COLOURS.public },
        { name: 'Public and co-ops, same state', a: o.sameState.iouPrice, b: o.sameState.nfpPrice, gap: o.sameState.premium, colour: `linear-gradient(90deg, ${OWNER_COLOURS.public} 50%, ${OWNER_COLOURS.coop} 50%)` },
        { name: 'Co-ops, most rural', a: last.price.iou, b: last.price.coop, gap: o.coopPremium, colour: OWNER_COLOURS.coop },
      ];
      return <ChartCard
        id="checks-title"
        title="Price gap after accounting for location"
        description={`Average home price per kilowatt-hour in ${latest}. Hydro states get the most power from dams: ${listOf(o.noHydro.states)}.`}
        tabs={[
          { label: 'Chart', content: <PriceGaps rows={checks} a={{ label: 'Investor-owned', colour: OWNER_COLOURS.iou }} keys={[{ label: 'Public', colour: OWNER_COLOURS.public }, { label: 'Co-ops', colour: OWNER_COLOURS.coop }]} format={(v, tick) => (tick ? `${v}¢` : `${v.toFixed(1)}¢`)} gap={(r) => `+${Math.round(r.gap)}%`} /> },
          { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={checks} columns={[{ key: 'name', header: 'Investor-owned against' }, { key: 'a', header: 'Investor-owned', align: 'right', render: (r) => centsKwh(r.a) }, { key: 'b', header: 'Compared with', align: 'right', render: (r) => centsKwh(r.b) }, { key: 'gap', header: 'Gap', align: 'right', render: (r) => `+${r.gap.toFixed(1)}%` }]} rowKey={(r) => r.name} /> },
        ]}
        footer={source(false)}
      />;
    })()}
    <ChartCard
      id="utilities-title"
      title={`Largest utilities, ${base} to ${latest}`}
      description={<>Change in the average home price at utilities with 250,000 or more homes: <strong style={{ color: OWNER_COLOURS.iou }}>investor-owned</strong>, <strong style={{ color: OWNER_COLOURS.public }}>public</strong> and <strong style={{ color: OWNER_COLOURS.coop }}>co-op</strong>.</>}
      tabs={[
        { label: 'Chart', content: <ShowMore total={o.utilities.length} initial={20} noun="utilities">{(n) => <ValueRanking rows={o.utilities.slice(0, n).map((u) => ({ name: `${u.name}, ${u.state}`, value: u.change, href: u.href, colour: OWNER_COLOURS[{ 'Investor-owned': 'iou', Public: 'public', 'Co-op': 'coop' }[u.ownership]] }))} average={o.inflation} averageLabel="Inflation" format={pctLabel} />}</ShowMore> },
        { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={utilities.length} initial={15} noun="utilities">{(n) => <DataTable rows={utilities.slice(0, n)} columns={utilityColumns} rowKey={(r) => r.code} sort={utilitySort} onSort={(key) => setUtilitySort(toggle(key))} />}</ShowMore> },
      ]}
      footer={source(true)}
    />
    {o.reliability && <ChartCard
      id="outages-title"
      title="Outage minutes a year by utility owner"
      description="Minutes without power for the average home, not counting major storms."
      tabs={[
        { label: 'Chart', content: <LineChart series={owners.map(([k, label]) => ({ label, points: at(o.reliability.rows, (r) => r[k]), colour: OWNER_COLOURS[k] }))} format={(v) => `${Math.round(v)} min`} axis={(v) => `${v}`} yTitle="Minutes a year" yearly gapDays={400} label={`Outage minutes a year for the average home in ${o.reliability.latest}, without major storms: investor-owned ${o.reliability.rows.at(-1).iou}, public ${o.reliability.rows.at(-1).public}, co-op ${o.reliability.rows.at(-1).coop}.`} /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={[...o.reliability.rows].reverse()} columns={[{ key: 'year', header: 'Year' }, ...owners.map(([k, label]) => ({ key: k, header: label, align: 'right', render: (r) => (r[k] == null ? '–' : `${r[k]} min`) }))]} rowKey={(r) => r.year} /> },
      ]}
      footer={<p className="chart-note">Source: <a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noreferrer">EIA</a> annual survey of utilities (Form 861), reliability.</p>}
    />}
    <section className="insight-notes">
      <SectionHeading>About the data</SectionHeading>
      <ul>
        <li>Public power is common in cities and near federal dams, where power is cheap, and public utilities pay no income tax and borrow tax-free. That explains some of the gap, not why it grew.</li>
        <li>Most of the gap opened from {o.surge.from} to {o.surge.to}, during the energy price spike: {pc(o.surge.iou)} at investor-owned utilities, {pc(o.surge.nfp)} at public utilities and co-ops.{Math.abs(o.before.iou - o.before.nfp) < 1.5 && Math.abs(o.after.iou - o.after.nfp) < 1.5 ? ' Before and since, both rose at about the same pace.' : ''}</li>
        <li>After inflation, investor-owned prices {o.real.iou < 0 ? 'fell' : 'rose'} {pc(o.real.iou)}. Public and co-op prices {o.real.nfp < 0 ? 'fell' : 'rose'} {pc(o.real.nfp)}.</li>
        <li>Co-op homes have the highest bills, {money(b1.coop, 0)} a month in {latest}, because they use the most power.</li>
        <li>Homes that buy power from a retail supplier aren&apos;t in the investor-owned figures. Counting them, prices on investor-owned lines rose {pc(o.change.wires)}.</li>
        <li>Price is what homes paid divided by the kilowatt-hours they used, from EIA&apos;s yearly survey of utilities. Federal utilities and the smallest ones are left out.</li>
        <li>The data shows what homes paid, not why. Investor-owned utilities earn a return for shareholders on what they build. Public utilities and co-ops have no shareholders. See the <a href={`${BASE}/rate-cases`}>rate cases</a> for increases utilities are asking for now.</li>
      </ul>
    </section>
  </>;
}

// PJM's capacity price and home electricity prices by state. PJM states are the story (orange), states partly on its
// grid a light orange, the rest grey; the US average is the dashed line.
const PJM_COLOURS = { pjm: SERIES_COLOURS[1], partial: '#eeae86', other: '#c3c6c8' };
function PjmPricesInsight({ page }) {
  const p = page.pjm, g = p.groups;
  const [sort, setSort] = useState({ key: 'change', dir: 'desc' });
  const span = `${monthLabel(p.start)} to ${monthLabel(p.yearEnd)}`;
  // One decimal throughout: whole percents would tie Pennsylvania and Maryland and round the lede's 13.8 to 14.
  const pct1 = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
  const pc = (v) => `${Math.abs(v).toFixed(1)}%`;
  const during = p.capacity.find((c) => c.year === '2025/26');
  const ranking = p.rows.map((r) => ({ name: r.name, value: r.change, href: stateUrl(r.slug), colour: PJM_COLOURS[r.group] }));
  const gridLabel = { pjm: 'PJM', partial: 'Partly PJM', other: 'No' };
  const stateColumns = [
    { key: 'name', header: 'State', sortable: true, render: (r) => <a className="cell-link" href={stateUrl(r.slug)}>{r.name}</a> },
    { key: 'group', header: 'On PJM grid', sortable: true, hideBelow: 'sm', render: (r) => gridLabel[r.group] },
    { key: 'from', header: 'Year before', align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.from) },
    { key: 'to', header: span, align: 'right', sortable: true, hideBelow: 'sm', render: (r) => centsKwh(r.to) },
    { key: 'change', header: 'Change', align: 'right', sortable: true, render: (r) => pct1(r.change) },
  ];
  const yearColumns = [
    { key: 'end', header: '12 months to', render: (r) => monthLabel(r.end) },
    { key: 'choice', header: 'PJM, retail choice', align: 'right', render: (r) => pct1(r.choice) },
    { key: 'others', header: 'Not on PJM grid', align: 'right', render: (r) => pct1(r.others) },
  ];
  const source = <p className="chart-note">Source: <a href="https://www.eia.gov/electricity/monthly/" target="_blank" rel="noreferrer">EIA</a> state home electricity revenue and sales; <a href="https://www.pjm.com/markets-and-operations/rpm" target="_blank" rel="noreferrer">PJM</a> capacity auctions.</p>;
  // The key sits inside the chart panel, above the bars; the card's description stays plain.
  const key = <div className="chart-legend" style={{ justifyContent: 'flex-start' }}>
    {[['pjm', 'On the PJM grid'], ['partial', 'Partly on it'], ['other', 'Not on it']].map(([k, label]) => <span className="chart-legend__item" key={k}><span className="chart-legend__swatch" style={{ width: 14, height: 14, background: PJM_COLOURS[k] }} />{label}</span>)}
    <span className="chart-legend__item"><span className="chart-legend__swatch chart-legend__swatch--compare" style={{ width: 0, height: 14, borderTop: 'none', borderLeft: '2px dashed #0b0c0c' }} />US average</span>
  </div>;
  return <>
    <div className="title-block"><h1 className="dk-h1">{page.title}</h1><p className="lede">PJM runs the grid for 13 states and DC. In June 2025, the price it pays power plants to stand by for peak demand rose ninefold. Over the next year, home electricity prices rose {pc(g.choice.change)} in six of its states, and {pc(g.others.change)} in states off the grid.</p></div>
    <ChartCard
      id="states-title"
      title="Change in home electricity price by state"
      description="Average home price in the year after the capacity price rose, against the year before."
      tabs={[
        { label: 'Chart', content: <ShowMore total={ranking.length} initial={15} noun="states">{(n) => <>{key}<ValueRanking rows={ranking.slice(0, n)} average={p.us} averageLabel="US" format={pct1} /></>}</ShowMore> },
        { label: 'Tabular data', short: 'Tabular', content: <ShowMore total={p.rows.length} initial={15} noun="states">{(n) => <DataTable rows={sortBy(p.rows, sort, (r, k) => r[k]).slice(0, n)} columns={stateColumns} rowKey={(r) => r.code} sort={sort} onSort={(key) => setSort(toggle(key))} />}</ShowMore> },
        { label: 'Download', content: <><p className="download-intro">Every state: average home price for the year before and for {span}, and the change, as a gzipped CSV.</p><Download file="pjm-power-prices.csv.gz" common={page.common} /></> },
      ]}
      footer={source}
    />
    <ChartCard
      id="gap-title"
      title={`Level in the year before the new price, then ${p.gap} points apart`}
      description="Change in the average home price from a year earlier."
      tabs={[
        { label: 'Chart', content: <LineChart series={[{ label: 'PJM, retail choice', points: p.trend.choice, colour: PJM_COLOURS.pjm }, { label: 'Not on PJM grid', points: p.trend.others, colour: SERIES_COLOURS[0] }]} format={pct1} axis={(v) => `${v}%`} yTitle="Change from a year earlier" monthly gapDays={45} label={`Change in the twelve-month average home price from a year earlier, to ${monthLabel(p.latest)}: PJM states with retail choice ${pct1(g.choice.latest)}, states not on the PJM grid ${pct1(g.others.latest)}.`} /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={[...p.years].reverse()} columns={yearColumns} rowKey={(r) => r.end} /> },
      ]}
      footer={source}
    />
    <section className="insight-notes">
      <SectionHeading>About the data</SectionHeading>
      <ul>
        <li>Price is what homes paid divided by the kilowatt-hours they used, over twelve months.</li>
        <li>The six PJM states with retail choice are {listOf(p.states.choice)}. Most homes there get default supply bought at auction, so the capacity price feeds straight into bills.</li>
        <li>In the year before, both groups rose about the same: {pc(g.choice.before)} and {pc(g.others.before)}. PJM states also rose faster in 2023 and 2024, after the 2022 gas spike, but by {p.priorGap} points at most. This year the gap was {p.gap} points.</li>
        <li>Gas rose too, {p.henryHub}% at Henry Hub, but that hit every state.</li>
        <li>{listOf(p.states.integrated)} are on PJM&apos;s grid too, but their utilities own most of their plants and pay less of the capacity price. Prices there rose {pc(g.integrated.change)}. States only partly on the grid ({listOf(p.states.partial)}) are in neither group.</li>
        <li>PJM&apos;s market monitor says data centers added ${(p.dataCenters / 1e9).toFixed(1)} billion to the {during.year} capacity bill. The price has stayed near the auction&apos;s cap since.</li>
        <li>EIA&apos;s 2025 and 2026 figures are preliminary and don&apos;t net out New Jersey&apos;s $100 bill credit.</li>
      </ul>
    </section>
  </>;
}


// ── Car fuel costs: a month of driving in each version of the best-selling US models, at this week's prices.
const FUEL_COLOURS = { gas: '#b1b4b6', hybrid: SERIES_COLOURS[2], diesel: SERIES_COLOURS[1], electric: SERIES_COLOURS[0] };
const FUEL_LABELS = { gas: 'Gas', hybrid: 'Hybrid', diesel: 'Diesel', electric: 'Electric, charged at home' };
// Where the five added electric models' sales come from.
const COX_EV_SALES = 'https://www.coxautoinc.com/insights/q3-2026-ev-sales-report-commentary';
// Darker shades of the fuel colours for text, each at least 4.5:1 on white.
const FUEL_TEXT = { gas: '#505a5f', hybrid: '#1b7a72', diesel: '#a8420a', electric: '#154275' };
function CarFuelInsight({ page }) {
  const c = page.cars, p = c.prices;
  const miles = (v) => `${number(Math.round(v))} mi`;
  const range = carRange(c.rows, c.milesYear / 12).map((r) => ({ ...r, key: `${r.model}-${r.fuel}`.replace(/\W/g, ''), name: `${r.make} ${r.model}`, fuelLabel: r.fuel, colour: FUEL_COLOURS[r.fuel], textColour: FUEL_TEXT[r.fuel], text: number(Math.round(r.miles)) }));
  // The lede's shortest and furthest runs: "diesel Chevrolet Silverado", "Tesla Model Y charged at home".
  const near = range.at(-1), far = range[0];
  const runName = (r) => (r.fuel === 'electric' ? `${r.name} charged at home` : `${r.fuel} ${r.name}`);
  const rangeColumns = [
    { key: 'name', header: 'Model', render: (r) => r.name },
    { key: 'fuel', header: 'Version', render: (r) => FUEL_LABELS[r.fuel] },
    { key: 'miles', header: 'Miles on $100', align: 'right', render: (r) => miles(r.miles) },
  ];
  const usd = (v) => `$${Math.round(v)}`;
  const gallon = (v) => `$${v.toFixed(2)}`;
  const use = (v) => (v.fuel === 'electric' ? `${v.use} kWh per 100 miles` : `${v.use} mpg`);
  const rows = c.rows.map((r) => ({ name: `${r.make} ${r.model}`, dots: r.versions.map((v) => ({ label: FUEL_LABELS[v.fuel], value: v.month, colour: FUEL_COLOURS[v.fuel] })) }));
  const used = ['gas', 'hybrid', 'diesel', 'electric'].filter((f) => c.rows.some((r) => r.versions.some((v) => v.fuel === f)));
  const table = c.rows.flatMap((r) => r.versions.map((v) => ({ key: `${r.model}-${v.fuel}`, name: `${r.make} ${r.model}`, fuel: FUEL_LABELS[v.fuel], use: use(v), month: v.month })));
  const columns = [
    { key: 'name', header: 'Model', render: (r) => r.name },
    { key: 'fuel', header: 'Version', render: (r) => r.fuel },
    { key: 'use', header: 'EPA rating', hideBelow: 'sm', render: (r) => r.use },
    { key: 'month', header: 'A month', align: 'right', render: (r) => usd(r.month) },
  ];
  const source = <p className="chart-note">Source: <a href="https://www.fueleconomy.gov/feg/download.shtml" target="_blank" rel="noreferrer">EPA</a> fuel economy; <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA</a> pump and electricity prices; <a href="https://www.fhwa.dot.gov/policyinformation/statistics/2024/vm1.cfm" target="_blank" rel="noreferrer">FHWA</a> miles; <a href={COX_EV_SALES} target="_blank" rel="noreferrer">Cox Automotive</a> electric car sales.</p>;
  return <>
    <div className="title-block"><h1 className="dk-h1">{page.title}</h1><p className="lede">$100 of fuel takes a {runName(near)} {number(Math.round(near.miles))} miles, and a {runName(far)} {number(Math.round(far.miles))}.</p></div>
    <ChartCard
      id="range-title"
      title="Miles on $100 of fuel"
      description={`At ${gallon(p.regular)} a gallon for gas, ${gallon(p.diesel)} for diesel and ${cents(p.electricity)} a kWh for home charging. Cars are drawn to scale.`}
      tabs={[
        { label: 'Chart', content: <CarRange runs={range} places={NEW_YORK_TO} start="Road miles from New York" /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={range} columns={rangeColumns} rowKey={(r) => r.key} /> },
      ]}
      footer={<p className="chart-note">Source: <a href="https://www.fueleconomy.gov/feg/download.shtml" target="_blank" rel="noreferrer">EPA</a> fuel economy; <a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noreferrer">EIA</a> pump and electricity prices; <a href={COX_EV_SALES} target="_blank" rel="noreferrer">Cox Automotive</a> electric car sales.</p>}
    />
    <ChartCard
      id="cars-title"
      title="Monthly fuel cost per car model"
      description={`Fuel or home charging for ${number(c.miles)} miles, the average vehicle's month, at this week's prices. Best sellers first, then the best-selling electric models.`}
      tabs={[
        { label: 'Chart', content: <FuelDots rows={rows} keys={used.map((f) => ({ label: FUEL_LABELS[f], colour: FUEL_COLOURS[f] }))} format={usd} /> },
        { label: 'Tabular data', short: 'Tabular', content: <DataTable rows={table} columns={columns} rowKey={(r) => r.key} /> },
        { label: 'Download', content: <><p className="download-intro">Every version: sales, EPA rating, number of EPA configurations and the monthly cost, as a gzipped CSV.</p><Download file="car-fuel-costs.csv.gz" common={page.common} /></> },
      ]}
      footer={source}
    />
    <section className="insight-notes">
      <SectionHeading>About the data</SectionHeading>
      <ul>
        <li>Prices are US averages: regular {gallon(p.regular)}, premium {gallon(p.premium)} and diesel {gallon(p.diesel)} a gallon in the week of {dateLabel(c.week)}, and {cents(p.electricity)} a kWh for home electricity in {monthLabel(c.powerMonth)}. Diesel costs {c.dieselPremium}% more than regular.</li>
        <li>Every car drives {number(c.milesYear)} miles a year, the average for cars, SUVs and pickups on US roads in 2024.</li>
        <li>Mileage is EPA&apos;s combined rating for the {c.rows[0].epaYear} models, the middle of each version&apos;s configurations. Gas and hybrid versions count only those that run on regular, so a Raptor does not set the F-150&apos;s figure. Real-world mileage is usually a little worse.</li>
        <li>Best sellers are January to September 2026, from the carmakers&apos; own reports. The F-Series uses F-150 ratings, since EPA does not rate Super Duty trucks, and the Ford Transit van is left out because EPA does not rate it.</li>
        <li>The Model Y is the only electric model among the {c.lists.top} best sellers, so the next {c.lists.electric} best-selling electric models are added, from Cox Automotive&apos;s estimates for the same months, leaving out delivery vans.</li>
        <li>Electric cars are charged at home. Public fast chargers cost several times more per kWh.</li>
        <li>Hybrids save {usd(c.hybridSavings.min)} to {usd(c.hybridSavings.max)} a month on all {c.hybridSavings.models} models sold both ways.</li>
        <li>Miles on $100 are $100 divided by each version&apos;s cost per mile. Road distances from New York are rounded: {NEW_YORK_TO.map((t) => `${number(t.miles)} miles to ${t.place}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. The cars are drawn from each model&apos;s published length, height and wheelbase.</li>
      </ul>
    </section>
  </>;
}

const INSIGHT_VIEWS = { 'car-fuel-costs': CarFuelInsight, 'pjm-power-prices': PjmPricesInsight, 'investor-owned-utilities': UtilityOwnershipInsight, 'gold-top-export': GoldExportsInsight, 'fuel-minutes-of-work': FuelWorkInsight };
function Insight({ page }) {
  const View = INSIGHT_VIEWS[page.slug];
  return <View page={page} />;
}

export default function App({ page }) {
  const View = { home: Overview, fuels: FuelIndex, fuel: Fuel, electricity: Electricity, electricityMap: ElectricityMap, rateCases: RateCases, state: State, utility: Utility, about: About, insights: InsightsIndex, insight: Insight }[page.kind];
  return <Shell page={page}><View page={page} /></Shell>;
}
