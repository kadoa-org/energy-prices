// What a month of driving costs in each version of the 25 best-selling US models and the 5 best-selling electric ones,
// at this week's pump prices and the latest home electricity price. Sales are January to September 2026 as the
// carmakers report them (compiled by GoodCarBadCar; Tesla and GM monthly figures are estimates). Each version lists
// its EPA configurations as [combined mpg, fuel grade], or [kWh per 100 miles, 'electricity', EPA range in miles] for
// electric ones, or [gas mpg, fuel grade, kWh per 100 miles on battery, EPA utility factor, EPA range in miles] for
// plug-in hybrids; `tanks` gives the standard fuel tank of the other versions in US gallons, from the carmakers. Gas
// and hybrid versions keep only the regular-fuel configurations where a model has them, so premium high-output trims
// (Raptor, Ram RHO) do not set the figure. Electric models sold under their own name (Silverado EV, Equinox EV) are
// not versions of the gas ones. Left out: Ram's eTorque mild hybrid, rated no better than the gas truck; Super Duty
// pickups and the Ford Transit van, which EPA does not rate; plug-in versions EPA has not rated for 2026 (RAV4, Rogue,
// Prius). A plug-in hybrid's miles split between battery and gas by EPA's utility factor, its estimate of the share a
// typical owner who charges every night drives on electricity. F-Series uses the F-150's figures.
export const CAR_SALES_PERIOD = { from: '2026-01', to: '2026-09' };
// FHWA Highway Statistics 2024, table VM-1: average miles a year per light-duty vehicle.
export const MILES_A_YEAR = 10787;
export const CARS = [
  { make: 'Ford', model: 'F-Series', sold: 561508, epaYear: 2026, tanks: { gas: 36, hybrid: 30.6 }, versions: { gas: [[16, 'regular'], [17, 'regular'], [18, 'regular'], [19, 'regular'], [19, 'regular'], [19, 'regular'], [20, 'regular'], [20, 'regular'], [21, 'regular']], hybrid: [[23, 'regular'], [24, 'regular']] } },
  { make: 'Chevrolet', model: 'Silverado', sold: 422713, epaYear: 2026, tanks: { gas: 24, diesel: 24 }, versions: { gas: [[15, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [18, 'regular'], [18, 'regular'], [19, 'regular'], [19, 'regular'], [20, 'regular']], diesel: [[21, 'diesel'], [23, 'diesel'], [23, 'diesel'], [23, 'diesel'], [24, 'diesel'], [25, 'diesel']] } },
  { make: 'Honda', model: 'CR-V', sold: 336844, epaYear: 2026, tanks: { gas: 14, hybrid: 14 }, versions: { gas: [[29, 'regular'], [30, 'regular']], hybrid: [[35, 'regular'], [37, 'regular'], [40, 'regular']] } },
  { make: 'Ram', model: 'Pickup', sold: 325348, epaYear: 2026, tanks: { gas: 26 }, versions: { gas: [[20, 'regular'], [21, 'regular']] } },
  { make: 'Tesla', model: 'Model Y', sold: 265000, epaYear: 2026, versions: { electric: [[24.3, 'electricity', 321], [25.2, 'electricity', 357], [25.7, 'electricity', 303], [26.5, 'electricity', 294], [27.5, 'electricity', 327], [32.0, 'electricity', 306]] } },
  { make: 'Toyota', model: 'Camry', sold: 260684, epaYear: 2026, tanks: { hybrid: 13 }, versions: { hybrid: [[43, 'regular'], [46, 'regular'], [46, 'regular'], [50, 'regular'], [51, 'regular']] } },
  { make: 'GMC', model: 'Sierra', sold: 257344, epaYear: 2026, tanks: { gas: 24, diesel: 24 }, versions: { gas: [[15, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [16, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [17, 'regular'], [18, 'regular'], [18, 'regular'], [19, 'regular'], [20, 'regular']], diesel: [[19, 'diesel'], [23, 'diesel'], [24, 'diesel'], [25, 'diesel']] } },
  { make: 'Toyota', model: 'RAV4', sold: 253664, epaYear: 2026, tanks: { hybrid: 14.5 }, versions: { hybrid: [[38, 'regular'], [41, 'regular'], [41, 'regular'], [41, 'regular'], [42, 'regular'], [43, 'regular']] } },
  { make: 'Toyota', model: 'Tacoma', sold: 214875, epaYear: 2026, tanks: { gas: 18.2, hybrid: 18.2 }, versions: { gas: [[20, 'regular'], [21, 'regular'], [21, 'regular'], [21, 'regular'], [21, 'regular'], [22, 'regular'], [23, 'regular'], [23, 'regular']], hybrid: [[23, 'regular'], [23, 'regular']] } },
  { make: 'Nissan', model: 'Rogue', sold: 201991, epaYear: 2026, tanks: { gas: 14.5 }, versions: { gas: [[29, 'regular'], [31, 'regular'], [32, 'regular']] } },
  { make: 'Toyota', model: 'Corolla', sold: 195141, epaYear: 2026, tanks: { gas: 13.2, hybrid: 11.3 }, versions: { hybrid: [[44, 'regular'], [47, 'regular'], [48, 'regular'], [50, 'regular']], gas: [[33, 'regular'], [33, 'regular'], [34, 'regular'], [34, 'regular'], [35, 'regular'], [35, 'regular']] } },
  { make: 'Honda', model: 'Civic', sold: 195135, epaYear: 2026, tanks: { gas: 12.4, hybrid: 10.6 }, versions: { gas: [[34, 'regular'], [34, 'regular'], [36, 'regular']], hybrid: [[48, 'regular'], [49, 'regular']] } },
  { make: 'Chevrolet', model: 'Equinox', sold: 191578, epaYear: 2026, tanks: { gas: 14.8 }, versions: { gas: [[26, 'regular'], [27, 'regular']] } },
  { make: 'Ford', model: 'Explorer', sold: 189210, epaYear: 2026, tanks: { gas: 17.9 }, versions: { gas: [[19, 'regular'], [20, 'regular'], [21, 'regular'], [21, 'regular'], [23, 'regular'], [24, 'regular']] } },
  { make: 'Hyundai', model: 'Tucson', sold: 181687, epaYear: 2026, tanks: { gas: 14.3, hybrid: 13.7 }, versions: { gas: [[26, 'regular'], [28, 'regular']], hybrid: [[36, 'regular'], [38, 'regular']], plugin: [[35, 'regular', 44, 0.602, 420]] } },
  { make: 'Chevrolet', model: 'Trax', sold: 167910, epaYear: 2026, tanks: { gas: 13.2 }, versions: { gas: [[29, 'regular'], [30, 'regular']] } },
  { make: 'Subaru', model: 'Forester', sold: 156476, epaYear: 2026, tanks: { gas: 16.6, hybrid: 16.6 }, versions: { gas: [[26, 'regular'], [28, 'regular'], [29, 'regular']], hybrid: [[35, 'regular']] } },
  { make: 'Kia', model: 'Sportage', sold: 145746, epaYear: 2026, tanks: { gas: 14.3, hybrid: 13.7 }, versions: { gas: [[24, 'regular'], [26, 'regular'], [28, 'regular']], hybrid: [[35, 'regular'], [42, 'regular']], plugin: [[36, 'regular', 43, 0.613, 470]] } },
  { make: 'Honda', model: 'Accord', sold: 145521, epaYear: 2026, tanks: { gas: 14.8, hybrid: 12.8 }, versions: { gas: [[31, 'regular'], [32, 'regular']], hybrid: [[44, 'regular'], [48, 'regular']] } },
  { make: 'Jeep', model: 'Grand Cherokee', sold: 139764, epaYear: 2026, tanks: { gas: 23 }, versions: { gas: [[21, 'regular'], [21, 'regular'], [22, 'regular'], [22, 'regular'], [22, 'regular'], [22, 'regular'], [23, 'regular'], [23, 'regular']], plugin: [[23, 'regular', 58, 0.536, 470]] } },
  { make: 'Subaru', model: 'Crosstrek', sold: 138249, epaYear: 2026, tanks: { gas: 16.6, hybrid: 16.6 }, versions: { gas: [[26, 'regular'], [29, 'regular']], hybrid: [[36, 'regular']] } },
  { make: 'Jeep', model: 'Wrangler', sold: 131011, epaYear: 2026, tanks: { gas: 21.5 }, versions: { gas: [[19, 'regular'], [19, 'regular'], [20, 'regular'], [21, 'regular'], [21, 'regular']], plugin: [[20, 'regular', 68, 0.487, 370]] } },
  { make: 'Hyundai', model: 'Elantra', sold: 128603, epaYear: 2026, tanks: { gas: 12.4, hybrid: 11 }, versions: { gas: [[31, 'regular'], [34, 'regular'], [35, 'regular']], hybrid: [[50, 'regular'], [54, 'regular']] } },
  { make: 'Ford', model: 'Maverick', sold: 123681, epaYear: 2026, tanks: { gas: 16.5, hybrid: 13.8 }, versions: { gas: [[23, 'regular'], [24, 'regular'], [25, 'regular'], [26, 'regular']], hybrid: [[36, 'regular'], [37, 'regular'], [38, 'regular']] } },
  { make: 'Chevrolet', model: 'Traverse', sold: 120171, epaYear: 2026, tanks: { gas: 19.4 }, versions: { gas: [[21, 'regular'], [22, 'regular']] } },
  // The Model Y is the only electric model in the top 25, so the five best-selling electric models after it follow,
  // with January to September 2026 sales from Cox Automotive's estimates (Kelley Blue Book EV Sales Report, Q3 2026),
  // leaving out delivery vans. Every consumer configuration counts, as for the Model Y; the Ioniq 5 robotaxi does not,
  // nor the bZ Woodland, which Cox counts as its own model.
  { make: 'Tesla', model: 'Model 3', sold: 106962, epaYear: 2026, list: 'electric', versions: { electric: [[24.3, 'electricity', 321], [24.6, 'electricity', 363], [26.4, 'electricity', 346], [29.6, 'electricity', 309], [30.2, 'electricity', 314]] } },
  { make: 'Hyundai', model: 'Ioniq 5', sold: 31112, epaYear: 2026, list: 'electric', versions: { electric: [[29.0, 'electricity', 245], [30.0, 'electricity', 318], [31.7, 'electricity', 290], [34.5, 'electricity', 269], [35.8, 'electricity', 259], [43.0, 'electricity', 221]] } },
  { make: 'Toyota', model: 'bZ', sold: 24944, epaYear: 2026, list: 'electric', versions: { electric: [[25.5, 'electricity', 314], [25.8, 'electricity', 236], [26.9, 'electricity', 299], [27.5, 'electricity', 296], [28.0, 'electricity', 288], [28.9, 'electricity', 278]] } },
  { make: 'Chevrolet', model: 'Equinox EV', sold: 18154, epaYear: 2026, list: 'electric', versions: { electric: [[31.1, 'electricity', 319], [32.6, 'electricity', 307], [35.1, 'electricity', 288]] } },
  { make: 'Rivian', model: 'R1S', sold: 17259, epaYear: 2026, list: 'electric', versions: { electric: [[39.5, 'electricity', 329], [39.5, 'electricity', 329], [39.9, 'electricity', 410], [39.9, 'electricity', 270], [39.9, 'electricity', 410], [40.9, 'electricity', 330], [40.9, 'electricity', 330], [42.0, 'electricity', 380], [42.0, 'electricity', 380], [42.9, 'electricity', 300], [42.9, 'electricity', 258], [42.9, 'electricity', 300], [43.1, 'electricity', 317], [43.1, 'electricity', 317], [43.2, 'electricity', 370], [43.2, 'electricity', 370], [44.4, 'electricity', 289], [44.4, 'electricity', 289], [44.4, 'electricity', 374], [44.6, 'electricity', 371], [46.9, 'electricity', 292], [46.9, 'electricity', 292], [47.3, 'electricity', 338], [49.8, 'electricity', 329], [50.1, 'electricity', 325]] } },
  // Outside both lists, for comparison: the car readers ask about first. Sales are the regular Prius only, from Toyota's
  // September 2026 report (the Prius Plug-in Hybrid sold 12,492 more); 11.3 gallons is the FWD tank (AWD 10.5).
  { make: 'Toyota', model: 'Prius', sold: 16731, epaYear: 2026, list: 'comparison', tanks: { hybrid: 11.3 }, versions: { hybrid: [[49, 'regular'], [52, 'regular'], [54, 'regular'], [57, 'regular']] } },
];
// How many models the best-seller list holds, how many electric models follow it, and the models added for comparison.
export const CAR_LISTS = { top: CARS.filter((c) => !c.list).length, electric: CARS.filter((c) => c.list === 'electric').length, comparison: CARS.filter((c) => c.list === 'comparison').map((c) => c.model) };
// The US average price at public DC fast chargers with per-kWh pricing, from Paren's quarterly report. Updated by hand
// each quarter: no collector fetches it.
export const FAST_CHARGING = { cents: 54.0, quarter: 'Q3 2026', url: 'https://www.paren.app/reports/us-ev-fast-charging-q3-2026' };
export const FUEL_ORDER =['gas', 'hybrid', 'plugin', 'diesel', 'electric'];
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
// prices: dollars a gallon for regular, midgrade, premium and diesel; cents a kWh for electricity.
// charging: cents a kWh for electric versions, home power unless given (FAST_CHARGING for a trip). Plug-in hybrids
// always charge at home, since most cannot use fast chargers.
export function carCosts(prices, miles = MILES_A_YEAR / 12, charging = prices.electricity) {
  const power = (kwh, m, cents) => (m * kwh) / 100 * (cents / 100);
  const cost = ([use, grade, kwh, uf]) => (grade === 'electricity' ? power(use, miles, charging)
    : kwh ? power(kwh, miles * uf, prices.electricity) + (miles * (1 - uf) / use) * prices[grade] : (miles / use) * prices[grade]);
  return CARS.map((c) => ({
    make: c.make, model: c.model, sold: c.sold, epaYear: c.epaYear, list: c.list ?? 'top',
    versions: FUEL_ORDER.filter((f) => c.versions[f]).map((fuel) => ({ fuel, month: round(median(c.versions[fuel].map(cost))), use: median(c.versions[fuel].map(([u]) => u)), configs: c.versions[fuel].length })),
  }));
}

// Road miles from New York by the main interstate route, rounded: the marks on the $100 chart. Phones drop the marks
// without `phone`, which sit too close to the start to label.
// Units for display. Costs are worked out in miles and US gallons; metric shows kilometres, litres, litres per 100 km
// and kWh per 100 km. A US gallon is 3.785411784 litres; 235.215 / mpg is litres per 100 km.
export const KM_PER_MILE = 1.609344, LITRES_PER_GALLON = 3.785411784;
export const UNITS = {
  us: { label: 'Miles and gallons', distance: 1, short: 'mi', long: 'miles', title: 'Miles', volume: 1, perVolume: 'a gallon',
    fuelUse: (mpg) => `${mpg} mpg`, powerUse: (kwh) => `${kwh} kWh per 100 miles` },
  metric: { label: 'Kilometres and litres', distance: KM_PER_MILE, short: 'km', long: 'kilometres', title: 'Kilometres', volume: LITRES_PER_GALLON, perVolume: 'a litre',
    fuelUse: (mpg) => `${(100 * LITRES_PER_GALLON / (mpg * KM_PER_MILE)).toFixed(1)} L per 100 km`, powerUse: (kwh) => `${(kwh / KM_PER_MILE).toFixed(1)} kWh per 100 km` },
};
export const NEW_YORK_TO = [{ place: 'Washington', miles: 226 }, { place: 'Chicago', miles: 790, phone: true }, { place: 'Denver', miles: 1780, phone: true }];
// How far a sum of fuel money takes each version of carCosts' rows: the sum over the version's cost per mile, where a
// month of driving is `miles` miles. Furthest first.
export function carRange(rows, miles, dollars = 100) {
  return rows.flatMap((r) => r.versions.map((v) => ({ make: r.make, model: r.model, fuel: v.fuel, miles: (dollars * miles) / v.month })))
    .sort((a, b) => b.miles - a.miles);
}
// How far each version goes on a full tank or charge, furthest first: the middle of its configurations' EPA ranges for
// electric and plug-in versions (battery plus tank), and its standard tank times its middle EPA combined mpg for the rest.
export function carFullRange() {
  return CARS.flatMap((c) => FUEL_ORDER.filter((f) => c.versions[f]).map((fuel) => {
    const configs = c.versions[fuel];
    const miles = fuel === 'electric' ? median(configs.map(([, , range]) => range)) : fuel === 'plugin' ? median(configs.map((x) => x[4]))
      : median(configs.map(([mpg]) => mpg)) * c.tanks?.[fuel];
    if (!(miles > 0)) throw new Error(`No full-tank range for the ${fuel} ${c.make} ${c.model}`);
    return { make: c.make, model: c.model, fuel, miles };
  })).sort((a, b) => b.miles - a.miles);
}
