import React, { useEffect, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App, { Loading } from './App';
import { BASE, pageKey } from './model.mjs';
import './styles.css';

// Pages are prerendered in full, and their data ships as a separate file rather than inline, so the HTML stays small.
// The prerendered page names its file; hydration waits for it. A page with no prerender (the dev server) fetches the
// same file by key.
const root = document.getElementById('root');
const key = pageKey(window.location.pathname);
// The prerender names the data folder (the published run on the CDN); the dev server serves it under the site.
const dataBase = document.querySelector('meta[name="data-base"]')?.content ?? `${BASE}/data`;
const src = key ? `${dataBase}/${key}.json` : null;
const withBase = (page) => ({ ...page, common: { ...page.common, dataPath: dataBase } });
function Client() {
  const [state, setState] = useState({ page: null, error: false });
  useEffect(() => {
    if (!src) { setState({ page: null, error: true }); return undefined; }
    const controller = new AbortController();
    fetch(src, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((page) => setState({ page: withBase(page), error: false })).catch((e) => { if (e.name !== 'AbortError') setState({ page: null, error: true }); });
    return () => controller.abort();
  }, []);
  return state.page ? <App page={state.page} /> : <Loading error={state.error} />;
}
if (root.hasChildNodes() && src) {
  fetch(src).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((page) => hydrateRoot(root, <App page={withBase(page)} />)).catch((error) => {
    // The prerendered page stays readable without its data; it only loses the tabs and selects.
    console.error('Page data could not be loaded; the page stays static', src, error);
  });
} else createRoot(root).render(<Client />);
