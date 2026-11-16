// New power line costs on four US grids in 2025, by whose new demand caused them and who is billed for them, from
// Feng and You, "Data centres asymmetrically exacerbate energy burdens through wholesale price increases and
// regressive grid cost shifting", Nature Energy, 9 November 2026 (doi 10.1038/s41560-026-02163-x). Figures are the
// study's published source data: Source Data Fig. 3 (the 2025 Sankey link tables), summed by customer class and,
// for PJM, by utility zone. US$ million. Costs are of transmission projects each grid approved for load growth.
// "Caused" is the study's attribution of each project to the new demand that triggered it; "billed" is its estimate
// of what each class pays under the grid's cost-allocation rules (for data centers, modelled from their estimated use).
export const GRID_COSTS_STUDY = { doi: '10.1038/s41560-026-02163-x', url: 'https://www.nature.com/articles/s41560-026-02163-x', data: 'https://doi.org/10.5281/zenodo.23019736', year: 2025 };

// By grid: caused and billed for data centers, homes and everyone else (industry, commerce and other new demand).
export const GRID_COSTS = [
  { grid: 'PJM', name: 'PJM (Mid-Atlantic, Ohio, Chicago)', caused: { dataCenters: 3256.2, homes: 69.9, other: 2628.0 }, billed: { dataCenters: 1217.5, homes: 3188.6, other: 1547.1 } },
  { grid: 'ERCOT', name: 'ERCOT (Texas)', caused: { dataCenters: 3001.3, homes: 1995.7, other: 12911.7 }, billed: { dataCenters: 1432.4, homes: 8441.9, other: 8033.5 } },
  { grid: 'MISO', name: 'MISO (Midwest)', caused: { dataCenters: 1497.8, homes: 931.6, other: 4985.4 }, billed: { dataCenters: 292.6, homes: 3262.7, other: 3860.6 } },
  { grid: 'CAISO', name: 'CAISO (California)', caused: { dataCenters: 494.3, homes: 482.6, other: 1785.8 }, billed: { dataCenters: 173.8, homes: 1267.0, other: 1321.8 } },
];

// PJM by utility zone: costs caused by new demand in the zone (and the data center part of it), costs PJM's Schedule 12
// rules bill to the zone, and of those, the part for lines in the zone's own area and the part for lines in Dominion's
// area (the Sankey's responsibility-zone to allocation-zone links).
export const PJM_ZONE_COSTS = [
  { zone: 'AECO', name: 'Atlantic City Electric (NJ)', caused: 0.2, dataCenters: 0, billed: 28.2, ownArea: 0.2, dominionArea: 10.9 },
  { zone: 'AEP', name: 'AEP (OH, WV, VA, IN and others)', caused: 400.8, dataCenters: 105.7, billed: 484.5, ownArea: 250.8, dominionArea: 95.8 },
  { zone: 'APS', name: 'Allegheny Power (PA, WV, MD)', caused: 1973.4, dataCenters: 655.9, billed: 427.9, ownArea: 346.7, dominionArea: 68.1 },
  { zone: 'ATSI', name: 'FirstEnergy Ohio', caused: 233.2, dataCenters: 35.3, billed: 364.1, ownArea: 233.2, dominionArea: 51.1 },
  { zone: 'BGE', name: 'BGE (Baltimore)', caused: 58.8, dataCenters: 0, billed: 219.7, ownArea: 58.8, dominionArea: 45.1 },
  { zone: 'COMED', name: 'ComEd (Chicago)', caused: 239.2, dataCenters: 102.0, billed: 453.4, ownArea: 239.2, dominionArea: 83.7 },
  { zone: 'DAY', name: 'AES Ohio (Dayton)', caused: 25, dataCenters: 0, billed: 60.0, ownArea: 25, dominionArea: 13.7 },
  { zone: 'DEOK', name: 'Duke Energy Ohio and Kentucky', caused: 58.4, dataCenters: 0, billed: 112.0, ownArea: 58.4, dominionArea: 20.9 },
  { zone: 'DOM', name: 'Dominion (Virginia)', caused: 2265.2, dataCenters: 2265.2, billed: 2383.0, ownArea: 1607.2, dominionArea: 1607.2 },
  { zone: 'DPL', name: 'Delmarva (DE, MD)', caused: 40.9, dataCenters: 0, billed: 99.7, ownArea: 40.9, dominionArea: 17.0 },
  { zone: 'DUQ', name: 'Duquesne (Pittsburgh)', caused: 0, dataCenters: 0, billed: 27.8, ownArea: 0, dominionArea: 10.9 },
  { zone: 'EKPC', name: 'East Kentucky Power', caused: 0, dataCenters: 0, billed: 38.8, ownArea: 0, dominionArea: 15.2 },
  { zone: 'JCPL', name: 'Jersey Central (NJ)', caused: 2.0, dataCenters: 0, billed: 66.9, ownArea: 2.0, dominionArea: 25.4 },
  { zone: 'METED', name: 'Met-Ed (PA)', caused: 64.0, dataCenters: 0, billed: 95.1, ownArea: 64.0, dominionArea: 12.1 },
  { zone: 'PECO', name: 'PECO (Philadelphia)', caused: 1.1, dataCenters: 0, billed: 87.8, ownArea: 1.1, dominionArea: 33.8 },
  { zone: 'PENELEC', name: 'Penelec (PA)', caused: 5.9, dataCenters: 0, billed: 36.0, ownArea: 5.9, dominionArea: 11.7 },
  { zone: 'PEPCO', name: 'Pepco (DC, MD)', caused: 0, dataCenters: 0, billed: 188.8, ownArea: 0, dominionArea: 67.0 },
  { zone: 'PPL', name: 'PPL (PA)', caused: 562.9, dataCenters: 92.0, billed: 646.3, ownArea: 562.9, dominionArea: 32.5 },
  { zone: 'PSEG', name: 'PSE&G (NJ)', caused: 23.1, dataCenters: 0, billed: 129.0, ownArea: 23.1, dominionArea: 41.3 },
  { zone: 'RECO', name: 'Rockland Electric (NJ)', caused: 0, dataCenters: 0, billed: 4.3, ownArea: 0, dominionArea: 1.7 },
];

// What the study's cost shifts do to households, from Source Data Fig. 4. Both are in percentage points.
// By area: increase in the share of a county's households spending more than 6% of income on energy (the study's
// energy poverty line), as the geometric mean across counties in each Rural-Urban Continuum group (Fig. 4e group
// summary; it leaves out the 91 of 1,556 counties with no increase).
// By income: increase in energy spending as a share of household income, as the median across the study's county
// income records in each band of income relative to the local median (Fig. 4f income points, unweighted, as the study plots them).
export const ENERGY_BURDEN = {
  byArea: [
    { group: 'Rural', counties: 754, increase: 2.889 },
    { group: 'Suburban', counties: 279, increase: 2.391 },
    { group: 'Urban', counties: 432, increase: 1.646 },
  ],
  byIncome: [
    { band: '0-30%', name: 'Under 30% of local median', records: 63722, increase: 1.609 },
    { band: '30-60%', name: '30 to 60%', records: 33594, increase: 0.848 },
    { band: '60-80%', name: '60 to 80%', records: 15443, increase: 0.645 },
    { band: '80-100%', name: '80 to 100%', records: 9006, increase: 0.574 },
    { band: '100-150%', name: '100 to 150%', records: 3784, increase: 0.525 },
    { band: '150%+', name: 'Over 150%', records: 847, increase: 0.373 },
  ],
};
