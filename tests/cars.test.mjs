import { describe, expect, test } from 'bun:test';
import { CARS, carCosts } from '../src/cars.mjs';

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
  test('lists versions in a fixed fuel order and keeps every best seller', () => {
    const rows = carCosts(prices);
    expect(rows).toHaveLength(CARS.length);
    expect(rows.find((c) => c.model === 'Civic').versions.map((v) => v.fuel)).toEqual(['gas', 'hybrid']);
  });
});
