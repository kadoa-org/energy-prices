import { describe, expect, test } from 'bun:test';
import { CARS, carCosts, carFullRange, carRange } from '../src/cars.mjs';
import { CAR_SHAPES, carSvg } from '../src/carShapes.mjs';

describe('carCosts', () => {
  const prices = { regular: 4, midgrade: 4.5, premium: 5, diesel: 6, electricity: 20 };
  test('costs a month of driving from the median configuration of each version', () => {
    const silverado = carCosts(prices, 1000).find((c) => c.model === 'Silverado');
    const diesel = silverado.versions.find((v) => v.fuel === 'diesel');
    expect(diesel.use).toBe(23);
    expect(diesel.month).toBeCloseTo((1000 / 23) * 6, 2);
    const y = carCosts(prices, 1000).find((c) => c.model === 'Model Y').versions[0];
    expect(y.fuel).toBe('electric');
    expect(y.month).toBeCloseTo(1000 * (y.use / 100) * 0.2, 2);
  });
  test('splits a plug-in hybrid between battery and gas by its utility factor', () => {
    const plugin = carCosts(prices, 1000).find((c) => c.model === 'Wrangler').versions.find((v) => v.fuel === 'plugin');
    expect(plugin.month).toBeCloseTo(1000 * 0.487 * 0.68 * 0.2 + ((1000 * 0.513) / 20) * 4, 2);
    expect(carFullRange().find((r) => r.model === 'Wrangler' && r.fuel === 'plugin').miles).toBe(370);
  });
  test('prices only electric versions at the charging price, so plug-in hybrids keep home power', () => {
    const rows = carCosts(prices, 1000, 60);
    const y = rows.find((c) => c.model === 'Model Y').versions[0];
    expect(y.month).toBeCloseTo(1000 * (y.use / 100) * 0.6, 2);
    const plugin = rows.find((c) => c.model === 'Wrangler').versions.find((v) => v.fuel === 'plugin');
    expect(plugin.month).toBeCloseTo(1000 * 0.487 * 0.68 * 0.2 + ((1000 * 0.513) / 20) * 4, 2);
  });
  test('lists versions in a fixed fuel order and keeps every best seller', () => {
    const rows = carCosts(prices);
    expect(rows).toHaveLength(CARS.length);
    expect(rows.find((c) => c.model === 'Civic').versions.map((v) => v.fuel)).toEqual(['gas', 'hybrid']);
  });
});

describe('carRange', () => {
  const prices = { regular: 4, midgrade: 4.5, premium: 5, diesel: 6, electricity: 20 };
  test('gives every version the miles $100 buys at its cost per mile, furthest first', () => {
    const rows = carCosts(prices, 1000), range = carRange(rows, 1000);
    expect(range).toHaveLength(rows.reduce((n, r) => n + r.versions.length, 0));
    const diesel = range.find((r) => r.model === 'Silverado' && r.fuel === 'diesel');
    expect(diesel.miles).toBeCloseTo((100 / 6) * 23, 0);
    expect(range.every((r, i) => i === 0 || range[i - 1].miles >= r.miles)).toBe(true);
  });
});

describe('carFullRange', () => {
  test('gives every version a range: EPA range for electric ones, standard tank times middle mpg for the rest', () => {
    const range = carFullRange();
    expect(range).toHaveLength(carCosts({ regular: 4, midgrade: 4.5, premium: 5, diesel: 6, electricity: 20 }).reduce((n, r) => n + r.versions.length, 0));
    const silverado = CARS.find((c) => c.model === 'Silverado');
    expect(range.find((r) => r.model === 'Silverado' && r.fuel === 'diesel').miles).toBe(23 * silverado.tanks.diesel);
    expect(range.find((r) => r.model === 'Model Y').miles).toBe((306 + 321) / 2);
    expect(range.every((r, i) => i === 0 || range[i - 1].miles >= r.miles)).toBe(true);
  });
});

describe('carSvg', () => {
  test('draws every best seller, so a new model cannot reach the page without a silhouette', () => {
    for (const c of CARS) {
      expect(CAR_SHAPES[c.model]).toBeDefined();
      expect(carSvg(c.model, { body: '#000', id: 'car' })).toContain('<path');
    }
  });
});
