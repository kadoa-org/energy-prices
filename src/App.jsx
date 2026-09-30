import React, { useEffect, useState } from 'react';
import { Button, DataTable, GitHubButton, LiveBadge, NavBar, Section, SiteFooter, SiteHeader } from './kit';
import { ChangeTag, ChartCard, FilterSelect, KeyFigures, SectionHeading, ShowMore } from './Figures';
import LineChart, { SERIES_COLOURS } from './LineChart';
import CommandPalette from './CommandPalette';
import TileMap from './TileMap';
import { StapleChart, StapleRanking, ValueRanking, monthTime, stapleScales } from './StaplesChart';
import { BASE, HOME, addDays, addMonths, cents, dataPath, dateLabel, money, monthLabel, number, pctLabel } from './model.mjs';
import { priceText } from './format.mjs';

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
  // Search opens from the header button, so it works on a phone, and from Cmd+K or Ctrl+K.
  const [search, setSearch] = useState(false);
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((o) => !o); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  return <><a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader brand="⚡ US Energy Price Monitor" brandHref={HOME} brandSuffix={<a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">by Kadoa</a>} right={<span className="header-right"><LiveBadge>Updated weekly</LiveBadge><GitHubButton repo="kadoa-org/energy-prices" /><Button inverse onClick={() => setSearch(true)} aria-label="Search (Cmd+K)">Search <kbd className="header-kbd">⌘K</kbd></Button></span>} />
    <CommandPalette open={search} onClose={() => setSearch(false)} dataPath={dataPath(page?.common)} />
    <NavBar items={[{ href: HOME, label: 'Overview', active: kind === 'home' }, { href: `${BASE}/fuel`, label: 'Fuel prices', active: kind === 'fuel' || kind === 'fuels' }, { href: `${BASE}/electricity`, label: 'Electricity', active: kind === 'electricity' || kind === 'state' || kind === 'electricityMap' }, { href: `${BASE}/about`, label: 'About the data', active: kind === 'about' }]} />
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
function StatesCard({ states, us, month, common, full = false, usTrend, cpi, usSince2019 }) {
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
      cpi && usSince2019 != null && { label: 'Map', hash: 'map', content: <TileMap states={states} cpi={cpi} usChange={usSince2019} usPrice={us.price12} month={month} href={stateUrl} /> },
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
    <StatesCard states={page.states} us={{ price12: page.headlines.electricity.price12 }} month={page.headlines.electricity.date} common={page.common} usTrend={page.usTrend} cpi={page.electricityCpi} usSince2019={page.usSince2019} />
  </>;
}

// ── Fuel pages
// Fuel, then grade, then location, arranged as GOV.UK statistics services arrange topic, breakdown and place: an index
// of fuels with a card each (the UKHSA "Health topics" page), grades drawn as lines of one chart (UKHSA's "by age"
// charts), and location as an area type and area name pair ("Filter results by location") that moves between pages.
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
// The fuels as a sub navigation (the MOJ pattern GOV.UK services use for sibling sections): the current one marked.
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
  const [range, setRange] = useState('365');
  const [visible, setVisible] = useState(26);
  const isUS = !location.slug;
  const h = lines[0].summary;
  const format = perGallon;
  const unit = fuel.unit;
  const from = range === 'all' ? null : addDays(h.date, -Number(range));
  const stale = h.date < addDays(common.lastWeek, -21);
  const byGrade = fuel.grades.length > 1 || lines.length > 1;
  const series = lines.map((l, i) => ({ label: byGrade ? l.grade : location.name, points: l.points, colour: SERIES_COLOURS[i] }));
  // The table has a column per grade, one row per week, newest first.
  const maps = lines.map((l) => new Map(l.points));
  const dates = [...new Set(lines.flatMap((l) => l.points.map((p) => p[0])))].filter((d) => !from || d >= from).sort().reverse();
  const tableColumns = [{ key: 'date', header: 'Week of', render: (d) => dateLabel(d) }, ...lines.map((l, i) => ({ key: l.grade, header: byGrade ? l.grade : `Price ${unit}`, align: 'right', render: (d) => (maps[i].has(d) ? format(maps[i].get(d)) : '–') }))];
  // A spot price is a market price, not an average of places: WTI and Brent are named, not called the US average.
  const place = fuel.spot ? 'spot price' : isUS ? 'US average' : location.name;
  return <>
    <Breadcrumbs items={[{ label: 'Fuel prices', href: `${BASE}/fuel` }, isUS ? { label: fuel.name } : { label: fuel.name, href: fuelUrl(fuel.slug) }, !isUS && { label: location.name }].filter(Boolean)} />
    <FuelNav current={fuel.slug} />
    <div className="hero detail-hero"><div><h1 className="dk-h1">{isUS ? fuel.title : `${fuel.title} in ${location.name}`}</h1><p className="lede">{fuel.description}</p></div><Download file={`fuel-${fuel.slug}.csv.gz`} common={common} /></div>
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
    {stale && fuel.seasonal && <p className="dk-inset">EIA surveys {fuel.name.toLowerCase()} from October to March. These are the last figures of the winter of {Number(h.date.slice(0, 4)) - 1} to {h.date.slice(0, 4)}.</p>}
    {locations.length > 1 && <LocationFilter fuel={fuel} location={location} locations={locations} />}
    <ChartCard
      id="chart-title"
      title={fuel.spot ? `${fuel.title}, ${fuel.grades.join(' and ')}` : `${fuel.title}, ${place}${byGrade ? ', by grade' : ''}`}
      description={`Weekly price, ${unit}.`}
      date={`Up to and including the week of ${dateLabel(h.date)}`}
      tabs={[
        { label: 'Chart', content: <>
          <div className="chart-filters"><FilterSelect value={range} options={RANGES} onChange={(v) => { setRange(v); setVisible(26); }} /></div>
          <LineChart series={series} from={from} to={h.date} format={format} yTitle={`Price ${unit}`} gapDays={fuel.seasonal ? 21 : 35} label={`${fuel.title}, ${place}: ${lines.map((l) => `${byGrade ? `${l.grade} ` : ''}${format(l.summary.value)}`).join(', ')} ${unit} in the week of ${dateLabel(h.date)}.`} />
        </> },
        { label: 'Tabular data', short: 'Tabular', content: <>
          <DataTable rows={dates.slice(0, visible)} columns={tableColumns} rowKey={(d) => d} empty="No weeks in this period." />
          {dates.length > visible && <div className="table-more"><Button onClick={() => setVisible((n) => n + 52)}>Show more</Button><span className="dk-hint">Showing {visible} of {number(dates.length)}</span></div>}
        </> },
        { label: 'Download', content: <><p className="download-intro">Every week for every area and grade EIA surveys, as a gzipped CSV.</p><Download file={`fuel-${fuel.slug}.csv.gz`} common={common} /></> },
      ]}
      footer={<p className="chart-note">Source: <a href={fuel.slug === 'crude-oil' ? 'https://www.eia.gov/dnav/pet/pet_pri_spt_s1_w.htm' : fuel.seasonal ? 'https://www.eia.gov/petroleum/heatingoilpropane/' : 'https://www.eia.gov/petroleum/gasdiesel/'} target="_blank" rel="noreferrer">US Energy Information Administration</a>.</p>}
    />
    {page.related && <p className="related-link">Pump prices follow crude oil: <a href={fuelUrl(page.related.slug)}>{page.related.grade}</a> {format(page.related.summary.value)} {page.related.unit}, <ChangeTag value={page.related.summary.yearChange} size="small" /> on a year ago.</p>}
    {compare.length > 1 && <CompareAreas fuel={fuel} location={location} compare={compare} format={format} />}
    {page.monthly && <MonthlyAreas monthly={page.monthly} fuel={fuel} common={common} />}
  </>;
}
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
    <StatesCard states={page.states} us={page.us} month={page.us.month} common={page.common} full usTrend={page.us.trend} cpi={page.electricityCpi} usSince2019={page.us.priceSince2019} />
    <UtilitiesTable title="Prices at the largest utilities" hint={`The ${page.largest.length} utilities serving 250,000 homes or more, of ${number(page.utilityCount)} tracked. Past 12 months.`} utilities={page.largest} showState />
  </>;
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
    <div className="hero detail-hero"><div><h1 className="dk-h1">Electricity prices in {s.name}</h1><p className="lede">What homes in {s.name} pay for electricity, from EIA.</p></div><Download file={file} common={common} /></div>
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
    <div className="hero detail-hero"><div><h1 className="dk-h1">{u.name} electricity rates</h1><p className="lede">What homes pay {u.name} for electricity, from EIA.</p><p className="dk-hint">{OWNERSHIP[u.ownership] ?? u.ownership} utility, {number(u.customers)} homes in {st.name}. EIA lists it as {u.eiaName}.</p></div><Download file={file} common={common} /></div>
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
function About({ page }) {
  return <article className="prose">
    <h1 className="dk-h1">About the data</h1>
    <p className="lede">Every figure on this site comes from two US government agencies and is public domain.</p>
    <h2>Sources</h2>
    <ul>
      <li><a href="https://www.eia.gov/petroleum/gasdiesel/">EIA Gasoline and Diesel Fuel Update</a>: weekly pump prices, every Monday.</li>
      <li><a href="https://www.eia.gov/petroleum/heatingoilpropane/">EIA Heating Oil and Propane Update</a>: weekly home heating prices, October to March.</li>
      <li><a href="https://www.eia.gov/electricity/monthly/">EIA Electric Power Monthly</a>: residential revenue, sales and customers by state, about two months behind.</li>
      <li><a href="https://www.eia.gov/naturalgas/monthly/">EIA Natural Gas Monthly</a>: residential gas prices by state.</li>
      <li><a href="https://www.eia.gov/electricity/data/eia861m/">EIA-861M</a>: residential revenue, sales and customers for each utility, monthly since 2019. It lists utilities that sell both delivery and power; in retail-choice states most homes buy power from a supplier EIA does not name.</li>
      <li><a href="https://www.bls.gov/cpi/">BLS Consumer Price Index</a> and <a href="https://www.bls.gov/cpi/factsheets/average-prices.htm">average prices</a>: monthly, by region, and gasoline and diesel for 18 metro areas.</li>
    </ul>
    <p>The project is open source and contributions are welcome: <a href="https://github.com/kadoa-org/energy-prices">github.com/kadoa-org/energy-prices</a>.</p>
    <h2>How to read it</h2>
    <ul>
      <li>Prices are in dollars of the day, not adjusted for inflation.</li>
      <li>A weekly change compares the latest week with the week before and the week nearest a year earlier.</li>
      <li>Electricity figures cover the past 12 months. A single month would mostly show the weather. "Since 2019" compares them with the 2019 average.</li>
      <li>The average price is revenue over kilowatt-hours sold, so it includes fixed charges. The average bill is revenue over customers.</li>
      <li>Red means a price went up, green that it went down.</li>
    </ul>
    <p className="dk-hint">{number(page.counts.series)} series and {number(page.counts.rows)} figures, updated weekly, last on {dateLabel(page.common.generatedAt.slice(0, 10))}. Built by <a href="https://www.kadoa.com">Kadoa</a>.</p>
  </article>;
}

// The state tile map on its own page, so a link to it (HN, Reddit, a newsletter) gets its own title and preview card.
function ElectricityMap({ page }) {
  return <>
    <Breadcrumbs items={[{ label: 'Electricity', href: `${BASE}/electricity` }, { label: 'Map' }]} />
    <div className="title-block"><h1 className="dk-h1">Home electricity prices by state since 2019</h1><p className="lede">Change in the average home price per kilowatt-hour, 12 months to {monthLabel(page.us.month)} against 2019. The US average rose {Math.round(page.us.priceSince2019)}%, against {Math.round(page.electricityCpi.change)}% inflation.</p></div>
    <section className="chart-panel-card map-page" aria-label="Map of electricity prices by state">
      <TileMap states={page.states} cpi={page.electricityCpi} usChange={page.us.priceSince2019} usPrice={page.us.price12} month={page.us.month} href={stateUrl} />
    </section>
  </>;
}

export default function App({ page }) {
  const View = { home: Overview, fuels: FuelIndex, fuel: Fuel, electricity: Electricity, electricityMap: ElectricityMap, state: State, utility: Utility, about: About }[page.kind];
  return <Shell page={page}><View page={page} /></Shell>;
}
