// Side-view silhouettes of the best sellers in cars.mjs, drawn from each model's published length, wheelbase, front
// overhang, height and tyre size (inches), plus the cues that tell them apart: hood height, roof slope, rear pillar,
// window kick, arch shape, plastic cladding. Coordinates are inches, x from the rear bumper and y up from the ground,
// so every model shares one scale. carSvg() returns the inner SVG for a viewBox of `0 0 ${L} 80`, facing right.
const GLASS = '#e3e7ea', TYRE = '#4f565b', HUB = '#d5d8db', CLAD = '#7c8388', GAP = '#fff';
export const CAR_BOX_HEIGHT = 80;

// Pickups: cab and bed. SUVs: hatch from (hatchBaseX, hatchBaseY) up to the roof's rear end. Sedans: trunk deck.
export const CAR_SHAPES = {
  'F-Series': { cls: 'pickup', L: 232, WB: 145, FO: 37, R: 16, gc: 11, hoodF: 52, hoodR: 55, noseDrop: 2, cowlX: 160, wsTopX: 136, roofF: 77, roofR: 76.5, cabRearX: 70, bedRailH: 51, beltF: 55, beltR: 54.5, pillars: [110], arch: 'square' },
  Silverado: { cls: 'pickup', L: 231.7, WB: 147.4, FO: 36, R: 16, gc: 10, hoodF: 57, hoodR: 57.5, noseDrop: 0.5, cowlX: 162, wsTopX: 138, roofF: 75.5, roofR: 75, cabRearX: 72, bedRailH: 54, beltF: 57.5, beltR: 56, pillars: [112], arch: 'square' },
  Pickup: { cls: 'pickup', L: 233, WB: 145, FO: 38, R: 16, gc: 10, hoodF: 50, hoodR: 55, noseDrop: 5, noseR: 7, cowlX: 164, wsTopX: 134, roofF: 76.5, roofR: 75.5, cabRearX: 69, bedRailH: 51.5, beltF: 54, beltR: 53, pillars: [111], arch: 'round' },
  Sierra: { cls: 'pickup', L: 231.7, WB: 147.4, FO: 36, R: 16, gc: 10, hoodF: 58, hoodR: 58, noseDrop: 0, cowlX: 162, wsTopX: 138, roofF: 75.5, roofR: 75, cabRearX: 72, bedRailH: 54, beltF: 57.5, beltR: 56, pillars: [112], arch: 'square' },
  Tacoma: { cls: 'pickup', L: 213, WB: 131.9, FO: 35, R: 15.5, gc: 11, hoodF: 49, hoodR: 52.5, noseDrop: 2, cowlX: 147, wsTopX: 122, roofF: 74.5, roofR: 74, cabRearX: 64, bedRailH: 51, beltF: 52.5, beltR: 52.5, kick: { len: 13, y: 57 }, pillars: [100], arch: 'round' },
  Maverick: { cls: 'pickup', L: 199.7, WB: 121.1, FO: 36, R: 14.5, gc: 8.5, hoodF: 42, hoodR: 45.5, noseDrop: 3, cowlX: 138, wsTopX: 108, roofF: 68.5, roofR: 67, cabRearX: 56, bedRailH: 45, beltF: 46, beltR: 46.5, pillars: [96], arch: 'square' },
  'CR-V': { cls: 'suv', L: 184.8, WB: 106.3, FO: 37, R: 14.5, gc: 8, hoodF: 38.5, hoodR: 42.5, noseDrop: 5, cowlX: 125, wsTopX: 102, roofF: 66, roofR: 63.5, roofRearX: 16, bumperH: 33, hatchBaseX: 3, hatchBaseY: 43, beltF: 42.5, beltR: 45, dPillar: 8, pillars: [88, 52], arch: 'round' },
  'Model Y': { cls: 'suv', L: 187, WB: 113.8, FO: 36, R: 15, gc: 7, hoodF: 31, hoodR: 37.5, noseDrop: 6, noseR: 9, cowlX: 133, wsTopX: 98, roofF: 63.2, roofMid: [68, 63.9], roofR: 55, roofRearX: 32, bumperH: 36, hatchBaseX: 5, hatchBaseY: 42, beltF: 38.5, beltR: 42, dPillar: 6, dloRear: [36, 46], pillars: [92], arch: 'round', smooth: true },
  RAV4: { cls: 'suv', L: 181.5, WB: 105.9, FO: 36, R: 14.5, gc: 8.5, hoodF: 40.5, hoodR: 43.5, noseDrop: 3, cowlX: 123, wsTopX: 103, roofF: 67, roofR: 66, roofRearX: 12, bumperH: 34, hatchBaseX: 2, hatchBaseY: 44, beltF: 43.5, beltR: 45, dPillar: 7, pillars: [86, 52], arch: 'square', clad: true },
  Rogue: { cls: 'suv', L: 183, WB: 106.5, FO: 37.5, R: 14.5, gc: 8, hoodF: 37.5, hoodR: 42, noseDrop: 5, cowlX: 124, wsTopX: 101, roofF: 66, roofR: 62.5, roofRearX: 20, bumperH: 32, hatchBaseX: 4, hatchBaseY: 42, beltF: 42, beltR: 47, dPillar: 9, pillars: [87, 53], arch: 'round' },
  Equinox: { cls: 'suv', L: 185, WB: 107, FO: 37, R: 15, gc: 8.5, hoodF: 41.5, hoodR: 44, noseDrop: 2.5, cowlX: 126, wsTopX: 105, roofF: 67, roofR: 66, roofRearX: 11, bumperH: 35, hatchBaseX: 1.5, hatchBaseY: 45, beltF: 44, beltR: 45, dPillar: 6, pillars: [88, 53], arch: 'square', clad: true },
  Explorer: { cls: 'suv', L: 198.8, WB: 119.1, FO: 35, R: 15.5, gc: 8, hoodF: 41, hoodR: 45.5, noseDrop: 4, cowlX: 134, wsTopX: 111, roofF: 69.5, roofR: 66.5, roofRearX: 18, bumperH: 35, hatchBaseX: 3, hatchBaseY: 46, beltF: 45.5, beltR: 48, dPillar: 10, pillars: [97, 62], arch: 'round' },
  Tucson: { cls: 'suv', L: 182.3, WB: 108.5, FO: 36, R: 14.5, gc: 7.5, hoodF: 36.5, hoodR: 41.5, noseDrop: 5, cowlX: 124, wsTopX: 100, roofF: 65.3, roofR: 61.5, roofRearX: 22, bumperH: 32, hatchBaseX: 4, hatchBaseY: 41.5, beltF: 41.5, beltR: 45.5, dPillar: 8, pillars: [88, 54], arch: 'square' },
  Trax: { cls: 'suv', L: 179.3, WB: 106.3, FO: 35, R: 14, gc: 7, hoodF: 34.5, hoodR: 39, noseDrop: 4.5, cowlX: 121, wsTopX: 97, roofF: 61.6, roofR: 58, roofRearX: 20, bumperH: 30.5, hatchBaseX: 4, hatchBaseY: 39.5, beltF: 39, beltR: 42, dPillar: 8, pillars: [85, 52], arch: 'round', clad: true },
  Forester: { cls: 'suv', L: 183.3, WB: 105.1, FO: 36, R: 14.5, gc: 8.7, hoodF: 39, hoodR: 42, noseDrop: 3.5, cowlX: 126, wsTopX: 108, roofF: 67.6, roofR: 67, roofRearX: 10, bumperH: 34, hatchBaseX: 1.5, hatchBaseY: 42.5, beltF: 40.5, beltR: 41.5, dPillar: 5, pillars: [90, 52], arch: 'square', clad: true },
  Sportage: { cls: 'suv', L: 183.5, WB: 108.5, FO: 36.5, R: 14.5, gc: 7.5, hoodF: 37.5, hoodR: 41.5, noseDrop: 4.5, cowlX: 125, wsTopX: 101, roofF: 65.1, roofR: 61.5, roofRearX: 21, bumperH: 32, hatchBaseX: 4, hatchBaseY: 42, beltF: 41.5, beltR: 44, dPillar: 7, pillars: [89, 52], pillarW: [3.5, 6], arch: 'round', clad: true },
  'Grand Cherokee': { cls: 'suv', L: 193.5, WB: 116.7, FO: 34.5, R: 15.5, gc: 8.5, hoodF: 42.5, hoodR: 45.5, noseDrop: 1.5, cowlX: 133, wsTopX: 111, roofF: 69, roofR: 67, roofRearX: 15, bumperH: 36, hatchBaseX: 2.5, hatchBaseY: 46.5, beltF: 45.5, beltR: 47, dPillar: 6, pillars: [96, 59], arch: 'square' },
  Crosstrek: { cls: 'suv', L: 176.4, WB: 104.9, FO: 35, R: 14, gc: 8.7, hoodF: 36, hoodR: 40, noseDrop: 4, cowlX: 119, wsTopX: 96, roofF: 62.6, roofR: 60, roofRearX: 17, bumperH: 32, hatchBaseX: 3, hatchBaseY: 40.5, beltF: 40, beltR: 42, dPillar: 6, pillars: [84, 50], arch: 'square', clad: true },
  Traverse: { cls: 'suv', L: 204.6, WB: 120.9, FO: 37, R: 15.5, gc: 8, hoodF: 42, hoodR: 45, noseDrop: 2.5, cowlX: 141, wsTopX: 117, roofF: 69, roofR: 68, roofRearX: 12, bumperH: 36, hatchBaseX: 2, hatchBaseY: 46, beltF: 45, beltR: 46, dPillar: 6, pillars: [103, 66], arch: 'square' },
  Wrangler: { cls: 'offroad', L: 188.4, WB: 118.4, FO: 28, R: 16.5, gc: 12 },
  Camry: { cls: 'sedan', L: 193.5, WB: 111.2, FO: 38.5, R: 13.5, gc: 5.5, hoodF: 29, hoodR: 35.5, noseDrop: 6, cowlX: 133, wsTopX: 103, roofF: 56.5, roofR: 53, roofRearX: 70, deckFrontX: 32, deckH: 39, beltF: 35.5, beltR: 39, pillars: [96], arch: 'round' },
  Corolla: { cls: 'sedan', L: 182.5, WB: 106.3, FO: 36, R: 13, gc: 5.3, hoodF: 28.5, hoodR: 35, noseDrop: 6, cowlX: 124, wsTopX: 97, roofF: 56, roofR: 53, roofRearX: 64, deckFrontX: 30, deckH: 38.5, beltF: 35.5, beltR: 38.5, pillars: [90], arch: 'round' },
  Civic: { cls: 'sedan', L: 184.8, WB: 107.7, FO: 36, R: 13, gc: 5, hoodF: 29, hoodR: 35, noseDrop: 5.5, cowlX: 121, wsTopX: 95, roofF: 55.3, roofR: 52, roofRearX: 60, deckFrontX: 22, deckH: 38.5, beltF: 35, beltR: 37.5, pillars: [87], arch: 'round' },
  Accord: { cls: 'sedan', L: 195.7, WB: 111.4, FO: 38, R: 13.5, gc: 5.5, hoodF: 29.5, hoodR: 36, noseDrop: 5.5, cowlX: 129, wsTopX: 100, roofF: 56.7, roofR: 52.5, roofRearX: 64, deckFrontX: 24, deckH: 39.5, beltF: 36, beltR: 39, pillars: [94], arch: 'round' },
  Elantra: { cls: 'sedan', L: 184.1, WB: 107.1, FO: 36, R: 13, gc: 5.3, hoodF: 28.5, hoodR: 35, noseDrop: 6, cowlX: 125, wsTopX: 99, roofF: 55.3, roofMid: [80, 55.6], roofR: 51, roofRearX: 56, deckFrontX: 20, deckH: 38.5, beltF: 35, beltR: 38.8, pillars: [91], arch: 'round' },
  // The best-selling electric models after the Model Y.
  'Model 3': { cls: 'sedan', L: 184.8, WB: 113.2, FO: 34, R: 13.3, gc: 5.5, hoodF: 27.5, hoodR: 33.5, noseDrop: 7, cowlX: 133, wsTopX: 99, roofF: 56.2, roofMid: [74, 56.7], roofR: 51.5, roofRearX: 50, deckFrontX: 19, deckH: 37.5, beltF: 34, beltR: 37, pillars: [92], arch: 'round' },
  'Ioniq 5': { cls: 'suv', L: 182.5, WB: 118.1, FO: 31.5, R: 14.6, gc: 6.5, hoodF: 35, hoodR: 39.5, noseDrop: 4, cowlX: 128, wsTopX: 104, roofF: 62.6, roofR: 61.5, roofRearX: 9, bumperH: 33, hatchBaseX: 1.5, hatchBaseY: 41, beltF: 39.5, beltR: 40.5, dPillar: 9, pillars: [92, 55], arch: 'square', clad: true },
  bZ: { cls: 'suv', L: 184.6, WB: 112.2, FO: 36, R: 14.6, gc: 7.5, hoodF: 35.5, hoodR: 40, noseDrop: 5, cowlX: 126, wsTopX: 101, roofF: 64.6, roofR: 61.5, roofRearX: 22, bumperH: 32, hatchBaseX: 4, hatchBaseY: 41.5, beltF: 40.5, beltR: 44, dPillar: 9, pillars: [88, 55], arch: 'square', clad: true },
  'Equinox EV': { cls: 'suv', L: 190.7, WB: 116.3, FO: 37, R: 14.8, gc: 7, hoodF: 37, hoodR: 41.5, noseDrop: 4, cowlX: 130, wsTopX: 105, roofF: 64.2, roofR: 61, roofRearX: 20, bumperH: 33, hatchBaseX: 4, hatchBaseY: 42, beltF: 41.5, beltR: 44.5, dPillar: 9, pillars: [93, 57], arch: 'round' },
  R1S: { cls: 'suv', L: 200.8, WB: 121.1, FO: 38, R: 17, gc: 10, hoodF: 43, hoodR: 46, noseDrop: 3, noseR: 6, cowlX: 139, wsTopX: 117, roofF: 71.5, roofR: 70.5, roofRearX: 9, bumperH: 38, hatchBaseX: 1.5, hatchBaseY: 47.5, beltF: 46.5, beltR: 48, dPillar: 6, pillars: [101, 63], arch: 'round' },
};

const f = (n) => Math.round(n * 100) / 100;
// Inches to SVG coordinates: y flips so the ground is the bottom of the box.
const P = ([x, y]) => `${f(x)},${f(CAR_BOX_HEIGHT - y)}`;
// A closed path through [x, y, r] points, each corner rounded with radius r.
function rounded(pts) {
  let d = '';
  pts.forEach((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length], next = pts[(i + 1) % pts.length], r = p[2] ?? 0;
    const towards = (q, len) => { const dx = q[0] - p[0], dy = q[1] - p[1], dist = Math.hypot(dx, dy) || 1, k = Math.min(len, dist / 2) / dist; return [p[0] + dx * k, p[1] + dy * k]; };
    d += `${i ? 'L' : 'M'}${P(towards(prev, r))} Q${P(p)} ${P(towards(next, r))} `;
  });
  return `${d}Z`;
}
// x where the segment p→q crosses height y.
const xAt = (p, q, y) => p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]);
// Height of a polyline (sorted by x) at x, inside its range.
function yOn(line, x) {
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    if (x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])) return a[1] + ((x - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1]);
  }
  throw new Error(`x ${x} is outside the roof line`);
}

const roundArch = ([cx, cy], r, fill) => `<circle cx="${f(cx)}" cy="${f(CAR_BOX_HEIGHT - cy)}" r="${f(r)}" fill="${fill}"/>`;
// A flat-topped arch with angled corners, as on GM trucks, the RAV4, Equinox, Tucson and Jeeps.
const squareArch = ([cx, cy], r, fill) => `<path d="${rounded([[cx - r, -2, 0], [cx - r, cy + r * 0.3, 2], [cx - r * 0.55, cy + r * 0.95, 2], [cx + r * 0.55, cy + r * 0.95, 2], [cx + r, cy + r * 0.3, 2], [cx + r, -2, 0]])}" fill="${fill}"/>`;
// Cladding and flares are clipped to the body, so they frame each arch without showing below the sills.
function wheels(m, arch, clip) {
  return [m.L - m.FO - m.WB, m.L - m.FO].map((cx) => {
    const c = [cx, m.R], cy = f(CAR_BOX_HEIGHT - m.R);
    const trim = m.clad || m.cls === 'offroad' ? `<g clip-path="url(#${clip})">${arch(c, m.R + (m.cls === 'offroad' ? 7 : 5), CLAD)}</g>` : '';
    return `${trim}${arch(c, m.R + 2, GAP)}<circle cx="${f(cx)}" cy="${cy}" r="${m.R}" fill="${TYRE}"/><circle cx="${f(cx)}" cy="${cy}" r="${f(m.R * 0.45)}" fill="${HUB}"/>`;
  }).join('');
}
function pillars(m, roof, belt, body) {
  return (m.pillars ?? []).map((x, i) => {
    const w = m.pillarW?.[i] ?? 4.5, lean = 1.2, top = yOn(roof, x) + 0.5, bot = yOn(belt, x) - 0.5;
    return `<path d="M${P([x - w / 2, bot])} L${P([x + w / 2, bot])} L${P([x + w / 2 - lean, top])} L${P([x - w / 2 - lean, top])} Z" fill="${body}"/>`;
  }).join('');
}

function pickup(m) {
  const ws = [[m.cowlX, m.hoodR], [m.wsTopX, m.roofF]];
  const body = [[1, m.gc, 2], [0, m.gc + 4, 2], [0, m.bedRailH, 1.5], [m.cabRearX, m.bedRailH, 1], [m.cabRearX, m.roofR, 4], [m.wsTopX, m.roofF, 4], [m.cowlX, m.hoodR, 2], [m.L - 4, m.hoodF, m.noseR ?? 3], [m.L, m.hoodF - m.noseDrop, 2], [m.L, m.gc + 8, 2], [m.L - 3, m.gc, 2]];
  const x0 = m.cabRearX + 4, top = Math.min(m.roofF, m.roofR) - 5, front = xAt(...ws, m.beltF) - 3, k = m.kick;
  // A kick: the rear window's lower edge climbs toward the back of the cab.
  const dlo = [...(k ? [[x0, k.y, 1], [x0 + k.len, m.beltR, 2]] : [[x0, m.beltR, 1]]), [front, m.beltF, 1], [xAt(...ws, top) - 3, top, 1.5], [x0, top, 1.5]];
  return { body, dlo, roof: [[m.cabRearX, m.roofR], [m.wsTopX, m.roofF]], belt: [[x0, m.beltR], [front, m.beltF]] };
}
function suv(m) {
  const ws = [[m.cowlX, m.hoodR], [m.wsTopX, m.roofF]], hatch = [[m.hatchBaseX, m.hatchBaseY], [m.roofRearX, m.roofR]];
  const body = [[1, m.gc, 2], [0, m.gc + 4, 3], [0, m.bumperH, 3], [m.hatchBaseX, m.hatchBaseY, 2], [m.roofRearX, m.roofR, m.smooth ? 14 : 6], ...(m.roofMid ? [[...m.roofMid, 20]] : []), [m.wsTopX, m.roofF, m.smooth ? 10 : 6], [m.cowlX, m.hoodR, 2], [m.L - 5, m.hoodF, m.noseR ?? 5], [m.L, m.hoodF - m.noseDrop, 3], [m.L, m.gc + 6, 3], [m.L - 3, m.gc, 2]];
  const roof = [[m.roofRearX, m.roofR], ...(m.roofMid ? [m.roofMid] : []), [m.wsTopX, m.roofF]];
  // A fastback (Model Y) ends its side glass at set points, like a sedan; upright hatches offset the D-pillar.
  const inset = 4.5, rearTopY = m.roofR - inset;
  const rearB = m.dloRear ? m.dloRear[0] : xAt(...hatch, m.beltR) + m.dPillar, rearT = m.dloRear ? m.dloRear[1] : xAt(...hatch, rearTopY) + m.dPillar * 0.6;
  const front = xAt(...ws, m.beltF) - 3, frontTopY = m.roofF - inset;
  const dlo = [[rearB, m.beltR, 1], [front, m.beltF, 1], [xAt(...ws, frontTopY) - 3, frontTopY, 2], ...(m.roofMid ? [[m.roofMid[0], m.roofMid[1] - inset, 12]] : []), [rearT, m.dloRear ? yOn(roof, rearT) - inset : rearTopY, 3]];
  return { body, dlo, roof, belt: [[rearB, m.beltR], [front, m.beltF]] };
}
function sedan(m) {
  const ws = [[m.cowlX, m.hoodR], [m.wsTopX, m.roofF]];
  const body = [[1, m.gc, 2], [0, m.gc + 5, 3], [0, m.deckH - 4, 4], [3, m.deckH, 3], [m.deckFrontX, m.deckH + 0.5, 3], [m.roofRearX, m.roofR, 10], ...(m.roofMid ? [[...m.roofMid, 20]] : []), [m.wsTopX, m.roofF, 8], [m.cowlX, m.hoodR, 2], [m.L - 6, m.hoodF, 6], [m.L, m.hoodF - m.noseDrop, 4], [m.L, m.gc + 5, 3], [m.L - 3, m.gc, 2]];
  const roof = [[m.roofRearX, m.roofR], ...(m.roofMid ? [m.roofMid] : []), [m.wsTopX, m.roofF]];
  // The side glass stops well ahead of the rear window, which faces backwards: the C-pillar is a wide sail.
  const inset = 3.5, rearB = m.roofRearX - 6, rearT = m.roofRearX + 8;
  const front = xAt(...ws, m.beltF) - 3, frontTopY = m.roofF - inset;
  const dlo = [[rearB, m.beltR, 1], [front, m.beltF, 1], [xAt(...ws, frontTopY) - 3, frontTopY, 2], ...(m.roofMid ? [[m.roofMid[0], m.roofMid[1] - inset, 12]] : []), [rearT, yOn(roof, rearT) - inset, 4]];
  return { body, dlo, roof, belt: [[rearB, m.beltR], [front, m.beltF]] };
}

// body: the fill colour; id: unique on the page, for the clip path that keeps cladding inside the body.
export function carSvg(model, { body, id }) {
  const m = CAR_SHAPES[model];
  if (!m) throw new Error(`No silhouette for ${model}; add one to carShapes.mjs`);
  if (m.cls === 'offroad') {
    // The Wrangler: a tub with a hardtop, near-upright windscreen, flat hood, black flares and the spare wheel on the
    // tailgate, seen edge-on from the side as a tall rounded bar.
    const outline = rounded([[13, m.gc, 2], [12, m.gc + 4, 2], [12, 71, 2], [14, 73.6, 2.5], [131, 73.6, 2], [133.5, 72.5, 1], [137, 49.5, 1], [185, 48, 2], [188.4, 46, 1.5], [188.4, m.gc + 10, 2], [185, m.gc, 2]]);
    const posts = [104, 68].map((x) => `<path d="M${P([x - 1.75, 50])} L${P([x + 1.75, 50])} L${P([x + 1.75, 73])} L${P([x - 1.75, 73])} Z" fill="${body}"/>`).join('');
    return `<clipPath id="${id}"><path d="${outline}"/></clipPath><rect x="1" y="${CAR_BOX_HEIGHT - 55}" width="11" height="33" rx="4" fill="${TYRE}"/><path d="${outline}" fill="${body}"/><path d="${rounded([[18, 51, 1], [131, 51, 1], [130.5, 71, 1], [18, 71, 1.5]])}" fill="${GLASS}"/>${posts}${wheels(m, squareArch, id)}`;
  }
  const { body: outlinePts, dlo, roof, belt } = { pickup, suv, sedan }[m.cls](m);
  const outline = rounded(outlinePts);
  const clad = m.clad ? `<path d="${rounded([[4, m.gc, 2], [m.L - 4, m.gc, 2], [m.L - 4, m.gc + 6, 1], [4, m.gc + 6, 1]])}" fill="${CLAD}"/>` : '';
  return `<clipPath id="${id}"><path d="${outline}"/></clipPath><path d="${outline}" fill="${body}"/><path d="${rounded(dlo)}" fill="${GLASS}"/>${pillars(m, roof, belt, body)}${clad}${wheels(m, m.arch === 'square' ? squareArch : roundArch, id)}`;
}
