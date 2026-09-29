// Prices in the unit people read them in: electricity in cents a kilowatt-hour, everything else in dollars.
export const priceText = (v, unit) => (v == null ? '–' : /kWh/.test(unit) ? `${(v * 100).toFixed(1)}¢` : `$${v.toFixed(2)}`);
