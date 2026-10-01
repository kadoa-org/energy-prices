// Writes src/usStatePaths.json: one SVG path per state from us-atlas (Census Bureau cartographic boundaries, ISC
// licence), already in Albers USA so the map needs no projection at runtime. Rerun only when us-atlas changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const root = resolve(import.meta.dirname, '..');
const topo = JSON.parse(readFileSync(join(root, 'node_modules/us-atlas/states-albers-10m.json'), 'utf8'));
const FIPS = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', 10: 'DE', 11: 'DC', 12: 'FL', 13: 'GA', 15: 'HI', 16: 'ID', 17: 'IL', 18: 'IN', 19: 'IA', 20: 'KS', 21: 'KY', 22: 'LA', 23: 'ME', 24: 'MD', 25: 'MA', 26: 'MI', 27: 'MN', 28: 'MS', 29: 'MO', 30: 'MT', 31: 'NE', 32: 'NV', 33: 'NH', 34: 'NJ', 35: 'NM', 36: 'NY', 37: 'NC', 38: 'ND', 39: 'OH', 40: 'OK', 41: 'OR', 42: 'PA', 44: 'RI', 45: 'SC', 46: 'SD', 47: 'TN', 48: 'TX', 49: 'UT', 50: 'VT', 51: 'VA', 53: 'WA', 54: 'WV', 55: 'WI', 56: 'WY' };
const path = geoPath().digits(1);
const out = {};
for (const f of feature(topo, topo.objects.states).features) {
  const code = FIPS[f.id] ?? FIPS[Number(f.id)];
  if (!code) continue;
  const [x, y] = path.centroid(f); const a = path.area(f);
  out[code] = { d: path(f), x: Math.round(x), y: Math.round(y), area: Math.round(a) };
}
if (Object.keys(out).length !== 51) throw new Error(`Expected 51 states, got ${Object.keys(out).length}`);
writeFileSync(join(root, 'src/usStatePaths.json'), JSON.stringify(out));
console.log('Wrote src/usStatePaths.json', Object.keys(out).length, 'states');
