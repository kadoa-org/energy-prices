// Renders every route to static HTML with its title, description, structured data and sitemap. The page's data is
// not inlined: the HTML names the data folder and the browser fetches the page file before hydrating, so a state page
// is a few kilobytes of HTML instead of carrying twenty years of monthly figures twice.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { SITE, cents, dateLabel, money, monthLabel, pctLabel } from '../src/model.mjs';

const root = resolve(import.meta.dirname, '..'); const dist = join(root, 'dist/energy-prices');
const template = await readFile(join(dist, 'index.html'), 'utf8');
// Data comes from the local build when present, otherwise from the published run on the CDN (Vercel builds).
const CDN = process.env.BUNNY_CDN_BASE || 'https://kadoa-datasets.b-cdn.net';
const local = join(root, 'public/data');
let dataPath = '/energy-prices/data'; let load;
if (process.env.DATA_SOURCE !== 'cdn' && existsSync(join(local, 'routes.json'))) {
  load = async (name) => JSON.parse(await readFile(join(local, `${name}.json`), 'utf8'));
} else {
  // The run to build comes from data-run.json in the repository when present: publishData writes it and the rebuild
  // commit carries it, so the build never depends on the CDN edge serving a fresh latest.json (the pull zone caches
  // it). Without it, the pointer is read from Bunny storage with a read-only key when set, otherwise from the edge.
  let pointer;
  const pinned = join(root, 'data-run.json');
  if (existsSync(pinned)) pointer = JSON.parse(await readFile(pinned, 'utf8'));
  else {
    const storageKey = process.env.BUNNY_STORAGE_READONLY_KEY;
    const pointerUrl = storageKey
      ? `https://${process.env.BUNNY_STORAGE_HOST || 'ny.storage.bunnycdn.com'}/${process.env.BUNNY_STORAGE_ZONE || 'kadoa-datasets'}/energy-prices/latest.json`
      : `${CDN}/energy-prices/latest.json?v=${Date.now()}`;
    const res = await fetch(pointerUrl, { headers: storageKey ? { AccessKey: storageKey } : { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`Cannot read data pointer (${storageKey ? 'storage' : 'CDN'}): HTTP ${res.status}`);
    pointer = await res.json();
  } dataPath = `${CDN}${pointer.base}`;
  console.log(`Building from published run ${pointer.runId} (${pointer.lastWeek})`);
  load = async (name) => { const r = await fetch(`${dataPath}/${name}.json`); if (!r.ok) throw new Error(`Cannot read ${name}: HTTP ${r.status}`); return r.json(); };
}
const routes = await load('routes');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const absolute = (p) => (p.startsWith('http') ? p : SITE + p);
const NAME = 'US Energy Price Monitor';
// Titles follow what people search: "gas prices today", "electricity prices in Texas", "average electric bill".
function seo(page, path) {
  const c = page.common; const updated = c.generatedAt.slice(0, 10); const canonical = `${SITE}${path}`;
  const crumbs = [{ name: NAME, url: `${SITE}/energy-prices` }];
  const dataset = (name, description, extra) => ({ '@context': 'https://schema.org', '@type': 'Dataset', name, description, url: canonical, spatialCoverage: 'United States', license: 'https://www.usa.gov/government-works', creator: { '@type': 'Organization', name: 'Kadoa', url: SITE }, dateModified: updated, ...extra });
  let title, description, ld, image = null;
  if (page.kind === 'home') {
    const h = page.headlines;
    title = 'Energy Prices Today: US Gas, Diesel and Electricity Prices';
    description = `US energy prices today: regular gasoline ${money(h.gasoline.value)} and diesel ${money(h.diesel.value)} a gallon in the week of ${dateLabel(h.gasoline.date)}, electricity ${cents(h.electricity.price12)} a kWh. Weekly EIA prices by region, electricity by state and the change since 2019.`;
    ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: canonical, description, publisher: { '@type': 'Organization', name: 'Kadoa', url: SITE }, dateModified: updated }];
  } else if (page.kind === 'fuels') {
    title = 'Fuel Prices Today: US Gasoline, Diesel, Heating Oil and Propane';
    description = `Fuel prices today: ${page.cards.map((c) => `${c.name.toLowerCase()} ${money(c.summary.value)} ${c.unit}`).join(', ')}, US averages from EIA's weekly surveys, with charts and prices by region, state and city.`;
    crumbs.push({ name: 'Fuel prices', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, url: canonical, numberOfItems: page.cards.length, itemListElement: page.cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `${SITE}/energy-prices/fuel/${c.slug}` })) }];
  } else if (page.kind === 'fuel') {
    const f = page.fuel; const loc = page.location; const s = page.lines[0].summary; const isUS = !loc.slug;
    const g = page.lines[0].grade; const grade = f.grades.length > 1 ? (/^[A-Z][a-z]+$/.test(g) ? ` ${g.toLowerCase()}` : ` (${g})`) : '';
    if (isUS) title = f.slug === 'crude-oil' ? 'Crude Oil Prices Today: Weekly WTI and Brent Price Chart' : `${f.seo} Prices Today: Weekly US ${f.seo} Price Chart by Region`;
    else title = `${f.seo} Prices in ${loc.name} Today: Weekly Price Chart`;
    description = isUS
      ? `${f.title} today: ${money(s.value)} ${f.unit} ${f.spot ? `${page.lines[0].grade} spot price` : `US average${grade}`} in the week of ${dateLabel(s.date)}, ${pctLabel(s.yearChange)} on a year earlier. Weekly EIA prices ${page.locations.length > 1 ? `for ${page.locations.length} areas` : `for ${f.grades.join(' and ')}`} with history and free CSV download.`
      : `${f.title} in ${loc.name} today: ${money(s.value)} ${f.unit}${grade} in the week of ${dateLabel(s.date)}${s.yearChange != null ? `, ${pctLabel(s.yearChange)} on a year earlier` : ''}, against a US average of ${money(page.usSummary.value)}. Weekly EIA prices with history and free CSV download.`;
    crumbs.push({ name: 'Fuel prices', url: `${SITE}/energy-prices/fuel` }, { name: f.name, url: `${SITE}/energy-prices/fuel/${f.slug}` });
    if (!isUS) crumbs.push({ name: loc.name, url: canonical });
    ld = [dataset(isUS ? `US ${f.name.toLowerCase()} prices, weekly` : `${f.name} prices in ${loc.name}, weekly`, description, { temporalCoverage: `${page.lines[0].points[0][0]}/${s.date}`, spatialCoverage: isUS ? 'United States' : `${loc.name}, United States`, isBasedOn: 'https://www.eia.gov/petroleum/', distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${absolute(dataPath)}/downloads/fuel-${f.slug}.csv.gz` }] })];
  } else if (page.kind === 'electricity') {
    title = 'Electricity Prices by State: Average Price per kWh and Monthly Bill';
    description = `Residential electricity prices by state: US average ${cents(page.us.price12)} a kWh and ${money(page.us.bill12, 0)} a month over the 12 months to ${monthLabel(page.us.month)}, with each state's price, bill, use and change since 2019, from EIA.`;
    crumbs.push({ name: 'Electricity', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, url: canonical, numberOfItems: page.states.length, itemListElement: page.states.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: `Electricity prices in ${s.name}`, url: `${SITE}/energy-prices/electricity/${s.slug}` })) }];
  } else if (page.kind === 'electricityMap') {
    title = 'Electricity Prices by State Map: Change Since 2019 and Price per kWh';
    description = `Map of home electricity prices by US state: the US average rose ${Math.round(page.us.priceSince2019)}% since 2019 to ${cents(page.us.price12)} a kWh over the 12 months to ${monthLabel(page.us.month)}, against ${Math.round(page.electricityCpi.change)}% inflation. Each state's change and price, from EIA.`;
    crumbs.push({ name: 'Electricity', url: `${SITE}/energy-prices/electricity` }, { name: 'Map', url: canonical });
    ld = [dataset('Residential electricity prices by US state since 2019', description, { temporalCoverage: `2019-01/${page.us.month.slice(0, 7)}`, spatialCoverage: 'United States', isBasedOn: 'https://www.eia.gov/electricity/' })];
    image = `${absolute(dataPath)}/og-electricity-map.png`;
  } else if (page.kind === 'state') {
    const s = page.state;
    title = `Electricity Prices in ${s.name}: Cost per kWh and Average Bill`;
    description = `${s.name} electricity prices: ${cents(s.price12)} a kWh and an average bill of ${money(s.bill12, 0)} a month over the 12 months to ${monthLabel(s.month)}, ${pctLabel(s.price12Change)} on a year earlier. Monthly history since 2001 from EIA, against the US average.`;
    crumbs.push({ name: 'Electricity', url: `${SITE}/energy-prices/electricity` }, { name: s.name, url: canonical });
    ld = [dataset(`${s.name} residential electricity prices`, description, { temporalCoverage: `${page.history.price[0][0]}/${s.month}`, spatialCoverage: `${s.name}, United States`, isBasedOn: 'https://www.eia.gov/electricity/', distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${absolute(dataPath)}/downloads/electricity-${s.slug}.csv.gz` }] })];
  } else if (page.kind === 'utility') {
    const u = page.utility; const st = page.state;
    title = `${u.name} Electricity Rates: Price per kWh and Average Bill (${st.name})`;
    description = `${u.name} electricity rates: ${cents(u.price12)} a kWh and an average bill of ${money(u.bill12, 0)} a month for ${u.customers.toLocaleString('en-US')} homes in ${st.name}, 12 months to ${monthLabel(u.month)}${u.price12Change != null ? `, ${pctLabel(u.price12Change)} on a year earlier` : ''}. Monthly history since 2019 from EIA, against the ${st.name} average.`;
    crumbs.push({ name: 'Electricity', url: `${SITE}/energy-prices/electricity` }, { name: st.name, url: `${SITE}/energy-prices/electricity/${st.slug}` }, { name: u.name, url: canonical });
    ld = [dataset(`${u.name} residential electricity prices, ${st.name}`, description, { temporalCoverage: `${page.history.price[0][0]}/${u.month}`, spatialCoverage: `${st.name}, United States`, isBasedOn: 'https://www.eia.gov/electricity/data/eia861m/', distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${absolute(dataPath)}/downloads/utility-${st.slug}-${u.slug}.csv.gz` }] })];
  } else if (page.kind === 'rateCases') {
    const open = page.cases.filter((c) => c.status === 'pending');
    title = 'Utility Rate Cases: Electric and Gas Rate Increase Requests by State';
    description = `${open.length} open electric and gas rate cases in ${page.states.map((s) => s.name).join(', ')}: what each utility asked for, the expected decision, and what regulators approved in the past two years.`;
    crumbs.push({ name: 'Rate cases', url: canonical });
    ld = [dataset('US utility rate cases', description, { spatialCoverage: 'United States', distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${absolute(dataPath)}/downloads/rate-cases.csv.gz` }] })];
  } else if (page.kind === 'insights') {
    title = 'Energy Price Insights: Charts and Analysis';
    description = `Analysis built on the US Energy Price Monitor's EIA and BLS data: ${page.insights.map((i) => i.title.toLowerCase()).join('; ')}.`;
    crumbs.push({ name: 'Insights', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, url: canonical, numberOfItems: page.insights.length, itemListElement: page.insights.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.title, url: `${SITE}/energy-prices/insights/${i.slug}` })) }];
  } else if (page.kind === 'insight') {
    const l = page.work.latest;
    title = `${page.title}: Minutes of Work per Gallon Since 1994`;
    description = `A gallon of diesel took ${l.dieselMinutes.toFixed(1)} minutes of average US hourly pay in ${monthLabel(`${l.month}-01`)} and regular gas ${l.gasMinutes.toFixed(1)}${page.work.widestGap ? ', the widest gap on record' : ''}. Monthly since 1994 from EIA prices and BLS earnings, with the 2008, 2022 and 2026 spikes.`;
    crumbs.push({ name: 'Insights', url: `${SITE}/energy-prices/insights` }, { name: 'Minutes of work per gallon', url: canonical });
    ld = [dataset('Minutes of work per gallon of US diesel and gasoline, monthly since 1994', description, { temporalCoverage: `${page.work.rows[0].month}/${l.month}`, isBasedOn: ['https://www.eia.gov/petroleum/gasdiesel/', 'https://www.bls.gov/ces/'], distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${absolute(dataPath)}/downloads/fuel-minutes-of-work.csv.gz` }] })];
  } else {
    title = 'About the Data: Sources and Methods';
    description = 'Where the energy price data comes from (EIA, BLS, state utility commissions and energy offices), how changes are calculated, and how to download it.';
    crumbs.push({ name: 'About the data', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: canonical, description, dateModified: updated }];
  }
  if (crumbs.length > 1) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((cr, i) => ({ '@type': 'ListItem', position: i + 1, name: cr.name, item: cr.url })) });
  return { title, description, canonical, ld, image };
}
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { render } = await server.ssrLoadModule('/src/render.jsx');
  const lastmod = {};
  for (const route of routes) {
    const page = await load(route.key); page.common = { ...page.common, dataPath };
    const body = render(page);
    const { title, description, canonical, ld, image } = seo(page, route.path);
    const head = `<meta name="data-base" content="${esc(dataPath)}"/><meta property="og:type" content="website"/><meta property="og:site_name" content="${NAME}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(description)}"/><meta property="og:url" content="${canonical}"/>${image ? `<meta property="og:image" content="${esc(image)}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${esc(image)}"/>` : '<meta name="twitter:card" content="summary"/>'}<meta name="robots" content="index,follow,max-image-preview:large"/>${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replaceAll('<', '\\u003c')}</script>`).join('')}`;
    const html = template.replace(/<title>.*?<\/title>/, `<title>${esc(`${title} | ${NAME}`)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}"/>`).replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}"/>`).replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const dir = join(dist, route.path.replace(/^\/energy-prices\/?/, '')); await mkdir(dir, { recursive: true }); await writeFile(join(dir, 'index.html'), html); if (route.key !== 'home') await writeFile(dir + '.html', html);
    lastmod[route.path] = page.common.generatedAt.slice(0, 10);
  }
  const priority = (r) => (r.key === 'home' ? '1.0' : r.key === 'electricity' || r.key === 'fuel' || /^fuel\/[a-z-]+$/.test(r.key) ? '0.9' : r.key.startsWith('fuel/') ? '0.7' : r.key.split('/').length === 3 ? '0.7' : r.key.startsWith('electricity/') ? '0.8' : '0.6');
  await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${lastmod[r.path]}</lastmod><changefreq>weekly</changefreq><priority>${priority(r)}</priority></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/energy-prices/sitemap.xml\n`);
  console.log(`Prerendered ${routes.length} pages`);
} finally { await server.close(); }
