import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, INK, LABEL_INK, PAPER, RULE, dayLabel, monthTicks, tickLabel, withGaps } from './chartSetup.mjs';

// The detail chart for every page: one series in the chart blue, with an optional comparison (the US average on a
// state page) in grey behind it. It is the food site's price chart with the energy units: a weekly or monthly value
// rather than a quoted range, so the line is the value itself and there is no band to explain.
// A stretch with no survey (heating oil in summer) is a hole in the line, never a bridge.

function scale(values, count) {
  const min = Math.min(...values), max = Math.max(...values);
  const raw = Math.max(max - min, max * 0.15) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= raw);
  const pad = (max - min || step) * 0.1;
  return { min: Math.max(0, min - pad), max: max + pad * 0.6, step };
}
const GREY = '#8a9195';
// Kadoa sky-800 (10.2:1 on white), Kadoa orange (darkened to 4.7:1) and the Analysis Function turquoise (3.2:1). Blue and orange first because that pair stays apart for readers with red-green colour blindness. Used when
// a chart shows a breakdown (gasoline grades, WTI and Brent) rather than a series and its comparison.
export const SERIES_COLOURS = ['#154275', '#c84c04', '#28a197'];
// Writes each line's name just right of its last point, in the line's colour, nudged apart when two lines end close.
// The same 600px as the legend's container query in styles.css, so exactly one of the two is shown.
const END_LABEL_MIN_WIDTH = 600;
const END_LABEL_ROOM = 150;
const endLabelsOn = (chart, opts) => opts.enabled && chart.width >= END_LABEL_MIN_WIDTH;
const END_LABELS = {
  id: 'endLabels',
  beforeLayout(chart, _args, opts) {
    chart.options.layout.padding.right = endLabelsOn(chart, opts) ? END_LABEL_ROOM : 20;
  },
  afterDatasetsDraw(chart, _args, opts) {
    if (!endLabelsOn(chart, opts)) return;
    const { ctx, chartArea } = chart;
    const gap = 17;
    const labels = chart.data.datasets.map((d, i) => {
      const pts = chart.getDatasetMeta(i).data.filter((p) => Number.isFinite(p.y));
      const last = pts.at(-1);
      return last && { text: d.label, colour: d.borderColor, y: last.y, x: last.x };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < gap) labels[i].y = labels[i - 1].y + gap;
    ctx.save();
    ctx.font = '600 14px ' + (Chart.defaults.font.family ?? 'sans-serif');
    ctx.textBaseline = 'middle';
    for (const l of labels) { ctx.fillStyle = l.colour; ctx.fillText(l.text, Math.max(l.x, chartArea.right) + 10, l.y); }
    ctx.restore();
  },
};
const MONTH_ONLY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (t) => { const d = new Date(t); return `${MONTH_ONLY[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// series: [{ label, points: [[iso, value]], compare?, colour? }]. format(v) prints a value in its unit; axis(v) the
// ticks. `compact` is the card size used on index pages: shorter, no axis titles.
export default function LineChart({ series, from, to, format, axis = format, yTitle, xTitle, monthly = false, gapDays = 21, label, compact = false }) {
  const canvas = useRef(null);
  const shown = series.map((s) => ({ ...s, points: s.points.filter(([d]) => (!from || d >= from) && (!to || d <= to)) })).filter((s) => s.points.length);
  useEffect(() => {
    if (!shown.length || !canvas.current) return undefined;
    const all = shown.flatMap((s) => s.points);
    const start = Date.parse(from ?? all.reduce((a, p) => (p[0] < a ? p[0] : a), all[0][0]));
    const end = Date.parse(to ?? all.reduce((a, p) => (p[0] > a ? p[0] : a), all[0][0]));
    const span = Math.max(end - start, DAY);
    const narrow = canvas.current.clientWidth < 600;
    // Two or more lines are named at their ends on a wide chart, which reads faster than a legend; a phone keeps the
    // legend above the chart because the labels would squeeze the plot. Width is judged by the plugin on every
    // layout, because the chart often mounts before its card has its final width.
    const endLabels = !compact && shown.length > 1;
    const y = scale(all.map((p) => p[1]), compact ? 3 : narrow ? 5 : 6);
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: {
        // The comparison is drawn first so the series of the page sits on top of it.
        datasets: [...shown].sort((a, b) => Number(!!b.compare) - Number(!!a.compare)).map((s) => ({
          label: s.label,
          data: withGaps(s.points.map(([d, v]) => ({ x: Date.parse(d), y: v })), gapDays),
          parsing: false,
          borderColor: s.compare ? GREY : (s.colour ?? INK),
          borderWidth: s.compare ? 1.5 : 2,
          borderDash: s.compare ? [5, 3] : undefined,
          pointRadius: (c) => (!s.compare && c.raw?.x === Date.parse(s.points.at(-1)[0]) ? 3.5 : 0),
          pointBackgroundColor: s.colour ?? INK, pointBorderColor: PAPER, pointBorderWidth: 1.5,
          pointHoverRadius: 4, pointHitRadius: 24, clip: false,
        })),
      },
      options: {
        layout: { padding: { top: compact ? 6 : 12, right: compact ? 10 : 20, bottom: 2 } },
        interaction: { mode: 'index', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: start, max: end,
            border: { color: BASELINE },
            grid: { color: RULE, drawTicks: false },
            title: { display: !compact && !!xTitle, text: xTitle, color: AXIS_INK, font: { size: 14 }, padding: { top: 10 } },
            ticks: { autoSkip: false, maxRotation: 0, padding: 8, color: AXIS_INK, callback: (v) => tickLabel(v, span) },
            afterBuildTicks: (ax) => { ax.ticks = monthTicks(start, end, narrow || compact ? 4 : 6).map((value) => ({ value })); },
          },
          y: {
            min: y.min, max: y.max,
            border: { display: false },
            grid: { color: RULE, drawTicks: false },
            afterBuildTicks: (ax) => { const ticks = []; for (let v = Math.ceil(y.min / y.step) * y.step; v <= y.max + 1e-9; v += y.step) ticks.push({ value: Number(v.toFixed(4)) }); ax.ticks = ticks; },
            title: { display: !compact, text: yTitle, color: AXIS_INK, font: { size: 14 } },
            ticks: { padding: 8, color: AXIS_INK, callback: (v) => axis(v) },
          },
        },
        plugins: {
          endLabels: { enabled: endLabels },
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK, borderColor: RULE, borderWidth: 1, cornerRadius: 0,
            displayColors: false, padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            callbacks: {
              title: (items) => (monthly ? monthOf(items[0].parsed.x) : `Week of ${dayLabel(items[0].parsed.x)}`),
              label: (item) => `${shown.length > 1 ? `${item.dataset.label}: ` : ''}${format(item.parsed.y)}`,
            },
          },
        },
      },
      plugins: [END_LABELS],
    });
    return () => chart.destroy();
  });
  if (!shown.length) return <div className="chart chart--empty">No figures in this period. Choose a longer period.</div>;
  return <div className="chart" style={compact ? { '--chart-height': '150px' } : undefined}>
    {shown.length > 1 && <div className="chart-legend chart-legend--narrow" aria-hidden="true">{shown.map((s) => <span className="chart-legend__item" key={s.label}><span className={`chart-legend__swatch${s.compare ? ' chart-legend__swatch--compare' : ''}`} style={!s.compare && s.colour ? { background: s.colour } : undefined} />{s.label}</span>)}</div>}
    <div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div>
  </div>;
}
