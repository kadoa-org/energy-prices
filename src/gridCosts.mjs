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

// PJM by utility zone: costs caused by new demand in the zone (and the data center part of it), and costs PJM's
// Schedule 12 rules bill to the zone.
export const PJM_ZONE_COSTS = [
  { zone: 'AECO', name: 'Atlantic City Electric (NJ)', caused: 0.2, dataCenters: 0, billed: 28.2 },
  { zone: 'AEP', name: 'AEP (OH, WV, VA, IN and others)', caused: 400.8, dataCenters: 105.7, billed: 484.5 },
  { zone: 'APS', name: 'Allegheny Power (PA, WV, MD)', caused: 1973.4, dataCenters: 655.9, billed: 427.9 },
  { zone: 'ATSI', name: 'FirstEnergy Ohio', caused: 233.2, dataCenters: 35.3, billed: 364.1 },
  { zone: 'BGE', name: 'BGE (Baltimore)', caused: 58.8, dataCenters: 0, billed: 219.7 },
  { zone: 'COMED', name: 'ComEd (Chicago)', caused: 239.2, dataCenters: 102.0, billed: 453.4 },
  { zone: 'DAY', name: 'AES Ohio (Dayton)', caused: 25, dataCenters: 0, billed: 60.0 },
  { zone: 'DEOK', name: 'Duke Energy Ohio and Kentucky', caused: 58.4, dataCenters: 0, billed: 112.0 },
  { zone: 'DOM', name: 'Dominion (Virginia)', caused: 2265.2, dataCenters: 2265.2, billed: 2383.0 },
  { zone: 'DPL', name: 'Delmarva (DE, MD)', caused: 40.9, dataCenters: 0, billed: 99.7 },
  { zone: 'DUQ', name: 'Duquesne (Pittsburgh)', caused: 0, dataCenters: 0, billed: 27.8 },
  { zone: 'EKPC', name: 'East Kentucky Power', caused: 0, dataCenters: 0, billed: 38.8 },
  { zone: 'JCPL', name: 'Jersey Central (NJ)', caused: 2.0, dataCenters: 0, billed: 66.9 },
  { zone: 'METED', name: 'Met-Ed (PA)', caused: 64.0, dataCenters: 0, billed: 95.1 },
  { zone: 'PECO', name: 'PECO (Philadelphia)', caused: 1.1, dataCenters: 0, billed: 87.8 },
  { zone: 'PENELEC', name: 'Penelec (PA)', caused: 5.9, dataCenters: 0, billed: 36.0 },
  { zone: 'PEPCO', name: 'Pepco (DC, MD)', caused: 0, dataCenters: 0, billed: 188.8 },
  { zone: 'PPL', name: 'PPL (PA)', caused: 562.9, dataCenters: 92.0, billed: 646.3 },
  { zone: 'PSEG', name: 'PSE&G (NJ)', caused: 23.1, dataCenters: 0, billed: 129.0 },
  { zone: 'RECO', name: 'Rockland Electric (NJ)', caused: 0, dataCenters: 0, billed: 4.3 },
];
