import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE } from './model.mjs';

// Cmd+K search, from the food site: driven by search.json, which names every page (fuels by area, states,
// utilities) with the figure that identifies it. Picking an item is a full navigation.
const GROUPS = ['Pages', 'Fuels', 'Electricity', 'Utilities'];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
export default function CommandPalette({ open, onClose, dataPath = `${BASE}/data` }) {
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0); const [index, setIndex] = useState(null);
  const inputRef = useRef(null); const listRef = useRef(null);
  useEffect(() => { if (!open) return; setQ(''); setIdx(0); const t = setTimeout(() => inputRef.current?.focus(), 10); return () => clearTimeout(t); }, [open]);
  useEffect(() => { if (!open || index) return; fetch(`${dataPath}/search.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then(setIndex).catch(() => setIndex([])); }, [open, index]);
  const items = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    const all = index ?? [];
    // Every word must appear in the label or hint; a label that starts with the query ranks first.
    const scored = all.map((it) => {
      const text = norm(`${it.label} ${it.hint ?? ''}`);
      if (!words.every((w) => text.includes(w))) return null;
      return { ...it, score: (norm(it.label).startsWith(words[0] ?? '') ? 0 : 1) + GROUPS.indexOf(it.group) / 10 };
    }).filter(Boolean).sort((a, b) => a.score - b.score);
    if (!words.length) return GROUPS.flatMap((g) => scored.filter((it) => it.group === g).slice(0, g === 'Pages' ? 4 : 5));
    return scored.slice(0, 40);
  }, [q, index]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const pick = items[idx]; if (pick) { onClose(); window.location.href = pick.href; } }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [open, items, idx, onClose]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' }); }, [idx]);
  if (!open) return null;
  let lastGroup = null;
  return <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search">
    <div className="cmdk-backdrop" onClick={onClose} />
    <div className="cmdk-box">
      <div className="cmdk-head"><label htmlFor="cmdk-input" className="sr-only">Search fuels, states and utilities</label><input id="cmdk-input" ref={inputRef} className="dk-input cmdk-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a fuel, state, city or utility" /><kbd>Esc</kbd></div>
      <div className="cmdk-list" ref={listRef}>
        {items.length === 0 ? <div className="cmdk-empty">{index ? 'No matches' : 'Loading…'}</div> : items.map((it, i) => {
          const header = it.group !== lastGroup; lastGroup = it.group;
          return <React.Fragment key={it.href}>
            {header && <div className="cmdk-group">{it.group}</div>}
            <a href={it.href} data-idx={i} className={`cmdk-item${idx === i ? ' cmdk-item--active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={onClose}><span className="cmdk-label">{it.label}</span><span className="cmdk-hint">{it.hint}</span>{it.right && <span className="cmdk-right">{it.right}</span>}</a>
          </React.Fragment>;
        })}
      </div>
      <div className="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate <kbd>↵</kbd> open</div>
    </div>
  </div>;
}
