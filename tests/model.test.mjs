import { describe, expect, test } from 'bun:test';
import { monthlySummary, nearest, pageKey, trailingMean, trailingPrice, weeklySummary } from '../src/model.mjs';

describe('pageKey', () => {
  test('maps paths to data files and rejects unknown ones', () => {
    expect(pageKey('/energy-prices')).toBe('home');
    expect(pageKey('/energy-prices/')).toBe('home');
    expect(pageKey('/energy-prices/fuel')).toBe('fuel');
    expect(pageKey('/energy-prices/fuel/gasoline')).toBe('fuel/gasoline');
    expect(pageKey('/energy-prices/fuel/gasoline/texas')).toBe('fuel/gasoline/texas');
    expect(pageKey('/energy-prices/electricity/new-york/')).toBe('electricity/new-york');
    expect(pageKey('/energy-prices/electricity/new-york/con-edison')).toBe('electricity/new-york/con-edison');
    expect(pageKey('/energy-prices/electricity/a/b/c')).toBeNull();
    expect(pageKey('/energy-prices/../etc')).toBeNull();
  });
});

describe('weekly comparisons', () => {
  const weeks = Array.from({ length: 60 }, (_, i) => [new Date(Date.UTC(2025, 7, 4) + i * 7 * 86400000).toISOString().slice(0, 10), 3 + i / 100]);
  test('compares with the week before and the week nearest a year earlier', () => {
    const s = weeklySummary(weeks);
    expect(s.weekAgo[0]).toBe(weeks.at(-2)[0]);
    expect(s.yearAgo[0]).toBe(weeks.at(-53)[0]);
    expect(s.yearChange).toBeCloseTo((3.59 / 3.07 - 1) * 100, 6);
  });
  test('gives no comparison across a seasonal gap', () => {
    const winter = [['2025-03-24', 4], ['2025-10-06', 4.2]];
    expect(weeklySummary(winter).weekAgo).toBeNull();
    expect(nearest(winter, '2025-06-01', 6)).toBeNull();
  });
});

describe('monthly comparisons', () => {
  const months = Array.from({ length: 26 }, (_, i) => [new Date(Date.UTC(2024, 5 + i, 1)).toISOString().slice(0, 10), 10 + i]);
  test('compares with the same calendar month', () => {
    const s = monthlySummary(months);
    expect(s.date).toBe('2026-07-01');
    expect(s.yearAgo[0]).toBe('2025-07-01');
  });
  test('twelve-month figures need all twelve months', () => {
    expect(trailingMean(months, '2026-07-01')).toBe((24 + 35) / 2 + 0);
    expect(trailingMean(months.filter((p) => p[0] !== '2026-01-01'), '2026-07-01')).toBeNull();
  });
  test('the twelve-month price is weighted by sales', () => {
    const end = '2026-12-01';
    const rev = Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}-01`, i === 6 ? 300 : 100]);
    const kwh = Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}-01`, i === 6 ? 2000 : 1000]);
    // 1,400 USD million over 13,000 million kWh is 10.77 cents, not the plain mean of eleven 10s and one 15.
    expect(trailingPrice(rev, kwh, end)).toBeCloseTo((1400 / 13000) * 100, 6);
  });
});
