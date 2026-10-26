// What a month of driving costs in each version of the 25 best-selling US models, at this week's pump prices and the
// latest home electricity price. Sales are January to September 2026 as the carmakers report them (compiled by
// GoodCarBadCar; Tesla and GM monthly figures are estimates). Each version lists its EPA configurations as [combined
// mpg, fuel grade], or [kWh per 100 miles, 'electricity'] for electric ones. Gas and hybrid versions keep only the
// regular-fuel configurations where a model has them, so premium high-output trims (Raptor, Ram RHO) do not set the
// figure. Left out: the Silverado EV and Equinox EV, sold as separate models; Ram's eTorque mild hybrid, rated no
// better than the gas truck; Super Duty pickups and the Ford Transit van, which EPA does not rate. F-Series uses the
// F-150's figures.
export const CAR_SALES_PERIOD = { from: '2026-01', to: '2026-09' };
// FHWA Highway Statistics 2024, table VM-1: average miles a year per light-duty vehicle.
export const MILES_A_YEAR = 10787;
export const CARS = [
  { make: 'Ford', model: 'F-Series', sold: 561508, epaYear: 2026, versions: { gas: [[16, 'regular'], [17, 'regular'], [18, 'regular'], [19, 'regular'], [19, 'regular'], [19, 'regular'], [20, 'regular'], [20, 'regular'], [21, 'regular']], hybrid: [[23, 'regular'], [24, 'regular']] } },
  { make: 'Chevrolet', model: 'Silverado', sold: 422713, epaYear: 2026, versions: { gas: [[15, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [18, 'regular'], [18, 'regular'], [19, 'regular'], [19, 'regular'], [20, 'regular']], diesel: [[21, 'diesel'], [23, 'diesel'], [23, 'diesel'], [23, 'diesel'], [24, 'diesel'], [25, 'diesel']] } },
  { make: 'Honda', model: 'CR-V', sold: 336844, epaYear: 2026, versions: { gas: [[29, 'regular'], [30, 'regular']], hybrid: [[35, 'regular'], [37, 'regular'], [40, 'regular']] } },
  { make: 'Ram', model: 'Pickup', sold: 325348, epaYear: 2026, versions: { gas: [[20, 'regular'], [21, 'regular']] } },
  { make: 'Tesla', model: 'Model Y', sold: 265000, epaYear: 2026, versions: { electric: [[24.3, 'electricity'], [25.2, 'electricity'], [25.7, 'electricity'], [26.5, 'electricity'], [27.5, 'electricity'], [32.0, 'electricity']] } },
  { make: 'Toyota', model: 'Camry', sold: 260684, epaYear: 2026, versions: { hybrid: [[43, 'regular'], [46, 'regular'], [46, 'regular'], [50, 'regular'], [51, 'regular']] } },
  { make: 'GMC', model: 'Sierra', sold: 257344, epaYear: 2026, versions: { gas: [[15, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [18, 'regular'], [18, 'regular'], [19, 'regular'], [20, 'regular']], diesel: [[19, 'diesel'], [23, 'diesel'], [24, 'diesel'], [25, 'diesel']] } },
  { make: 'Toyota', model: 'RAV4', sold: 253664, epaYear: 2026, versions: { hybrid: [[38, 'regular'], [41, 'regular'], [41, 'regular'], [41, 'regular'], [42, 'regular'], [43, 'regular']] } },
  { make: 'Toyota', model: 'Tacoma', sold: 214875, epaYear: 2026, versions: { gas: [[20, 'regular'], [21, 'regular'], [21, 'regular'], [21, 'regular'], [21, 'regular'], [22, 'regular'], [23, 'regular'], [23, 'regular']], hybrid: [[23, 'regular'], [23, 'regular']] } },
  { make: 'Nissan', model: 'Rogue', sold: 201991, epaYear: 2026, versions: { gas: [[29, 'regular'], [31, 'regular'], [32, 'regular']] } },
  { make: 'Toyota', model: 'Corolla', sold: 195141, epaYear: 2026, versions: { hybrid: [[44, 'regular'], [47, 'regular'], [48, 'regular'], [50, 'regular']], gas: [[33, 'regular'], [33, 'regular'], [34, 'regular'], [34, 'regular'], [35, 'regular'], [35, 'regular']] } },
  { make: 'Honda', model: 'Civic', sold: 195135, epaYear: 2026, versions: { gas: [[34, 'regular'], [34, 'regular'], [36, 'regular']], hybrid: [[48, 'regular'], [49, 'regular']] } },
  { make: 'Chevrolet', model: 'Equinox', sold: 191578, epaYear: 2026, versions: { gas: [[26, 'regular'], [27, 'regular']] } },
  { make: 'Ford', model: 'Explorer', sold: 189210, epaYear: 2026, versions: { gas: [[19, 'regular'], [20, 'regular'], [21, 'regular'], [21, 'regular'], [23, 'regular'], [24, 'regular']] } },
  { make: 'Hyundai', model: 'Tucson', sold: 181687, epaYear: 2026, versions: { gas: [[26, 'regular'], [28, 'regular']], hybrid: [[36, 'regular'], [38, 'regular']] } },
  { make: 'Chevrolet', model: 'Trax', sold: 167910, epaYear: 2026, versions: { gas: [[29, 'regular'], [30, 'regular']] } },
  { make: 'Subaru', model: 'Forester', sold: 156476, epaYear: 2026, versions: { gas: [[26, 'regular'], [28, 'regular'], [29, 'regular']], hybrid: [[35, 'regular']] } },
  { make: 'Kia', model: 'Sportage', sold: 145746, epaYear: 2026, versions: { gas: [[24, 'regular'], [26, 'regular'], [28, 'regular']], hybrid: [[35, 'regular'], [42, 'regular']] } },
  { make: 'Honda', model: 'Accord', sold: 145521, epaYear: 2026, versions: { gas: [[31, 'regular'], [32, 'regular']], hybrid: [[44, 'regular'], [48, 'regular']] } },
  { make: 'Jeep', model: 'Grand Cherokee', sold: 139764, epaYear: 2026, versions: { gas: [[21, 'regular'], [21, 'regular'], [22, 'regular'], [22, 'regular'], [22, 'regular'], [22, 'regular'], [23, 'regular'], [23, 'regular']] } },
  { make: 'Subaru', model: 'Crosstrek', sold: 138249, epaYear: 2026, versions: { gas: [[26, 'regular'], [29, 'regular']], hybrid: [[36, 'regular']] } },
  { make: 'Jeep', model: 'Wrangler', sold: 131011, epaYear: 2026, versions: { gas: [[19, 'regular'], [19, 'regular'], [20, 'regular'], [21, 'regular'], [21, 'regular']] } },
  { make: 'Hyundai', model: 'Elantra', sold: 128603, epaYear: 2026, versions: { gas: [[31, 'regular'], [34, 'regular'], [35, 'regular']], hybrid: [[50, 'regular'], [54, 'regular']] } },
  { make: 'Ford', model: 'Maverick', sold: 123681, epaYear: 2026, versions: { gas: [[23, 'regular'], [24, 'regular'], [25, 'regular'], [26, 'regular']], hybrid: [[36, 'regular'], [37, 'regular'], [38, 'regular']] } },
  { make: 'Chevrolet', model: 'Traverse', sold: 120171, epaYear: 2026, versions: { gas: [[21, 'regular'], [22, 'regular']] } },
];
export const FUEL_ORDER = ['gas', 'hybrid', 'diesel', 'electric'];
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
// prices: dollars a gallon for regular, midgrade, premium and diesel; cents a kWh for electricity.
export function carCosts(prices, miles = MILES_A_YEAR / 12) {
  const cost = ([use, grade]) => (grade === 'electricity' ? (miles * use) / 100 * (prices.electricity / 100) : (miles / use) * prices[grade]);
  return CARS.map((c) => ({
    make: c.make, model: c.model, sold: c.sold, epaYear: c.epaYear,
    versions: FUEL_ORDER.filter((f) => c.versions[f]).map((fuel) => ({ fuel, month: round(median(c.versions[fuel].map(cost))), use: median(c.versions[fuel].map(([u]) => u)), configs: c.versions[fuel].length })),
  }));
}

// Road miles from New York by the main interstate route, rounded: the marks on the $100 chart. Phones drop the marks
// without `phone`, which sit too close to the start to label.
export const NEW_YORK_TO = [{ place: 'Washington', miles: 226 }, { place: 'Chicago', miles: 790, phone: true }, { place: 'Denver', miles: 1780, phone: true }];
// How far a sum of fuel money takes each version of carCosts' rows: the sum over the version's cost per mile, where a
// month of driving is `miles` miles. Furthest first.
export function carRange(rows, miles, dollars = 100) {
  return rows.flatMap((r) => r.versions.map((v) => ({ make: r.make, model: r.model, fuel: v.fuel, miles: (dollars * miles) / v.month })))
    .sort((a, b) => b.miles - a.miles);
}
