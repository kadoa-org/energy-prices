// Global fossil CO2 emissions (coal, oil, gas, cement and flaring, net of the cement carbonation sink) from the Global
// Carbon Budget 2026: Friedlingstein et al., Earth System Science Data preprint essd-2026-895, 10 November 2026, data
// doi 10.18160/GCP-2026. Rows are [year, billion tonnes of CO2, % change on the year before, leap-year adjusted as in
// the paper]. 2026 is the paper's projection. Built by services/custom/datasets/co2-emissions/site-module.mjs in the
// kadoa-backend datasets branch.
export const CO2_STUDY = { url: 'https://essd.copernicus.org/preprints/essd-2026-895/', data: 'https://doi.org/10.18160/GCP-2026', projectionYear: 2026, low: -1.5, high: 0.6 };

export const CO2_ROWS = [[1960,9.35,5.8],[1961,9.385,0.655],[1962,9.721,3.576],[1963,10.271,5.656],[1964,10.836,5.215],[1965,11.313,4.688],[1966,11.868,4.908],[1967,12.24,3.131],[1968,12.919,5.263],[1969,13.784,6.985],[1970,14.627,6.119],[1971,15.213,4.001],[1972,15.915,4.333],[1973,16.778,5.708],[1974,16.684,-0.562],[1975,16.641,-0.255],[1976,17.626,5.63],[1977,18.117,3.069],[1978,18.779,3.654],[1979,19.265,2.585],[1980,19.122,-1.011],[1981,18.622,-2.347],[1982,18.472,-0.808],[1983,18.673,1.086],[1984,19.241,2.763],[1985,19.927,3.848],[1986,20.22,1.47],[1987,20.966,3.691],[1988,21.789,3.641],[1989,22.092,1.67],[1990,22.633,2.448],[1991,23.087,2.006],[1992,22.388,-3.292],[1993,22.614,1.286],[1994,22.839,0.995],[1995,23.376,2.35],[1996,24.082,2.74],[1997,24.233,0.902],[1998,24.142,-0.375],[1999,24.642,2.073],[2000,25.29,2.349],[2001,25.457,0.933],[2002,26.016,2.199],[2003,27.388,5.273],[2004,28.34,3.193],[2005,29.345,3.83],[2006,30.264,3.13],[2007,31.184,3.041],[2008,31.701,1.381],[2009,31.143,-1.493],[2010,32.935,5.756],[2011,34.095,3.521],[2012,34.487,0.875],[2013,34.803,1.191],[2014,35.043,0.689],[2015,34.998,-0.128],[2016,34.99,-0.295],[2017,35.566,1.925],[2018,36.343,2.183],[2019,36.516,0.479],[2020,34.539,-5.674],[2021,36.308,5.409],[2022,36.894,1.614],[2023,37.545,1.766],[2024,38.041,1.045],[2025,38.398,1.214],[2026,38.24,-0.411]];

// Projected change in 2026 fossil emissions with the paper's range (Executive Summary and section 3.1.4). The paper
// gives no range for international flights and shipping.
export const CO2_2026_REGIONS = [
  { name: 'India', change: 4.4, low: 1.7, high: 7.1 },
  { name: 'Rest of the world', change: -0.7, low: -2.9, high: 1.5 },
  { name: 'China', change: -0.9, low: -2.6, high: 0.8 },
  { name: 'Japan', change: -1.0, low: -2.5, high: 0.6 },
  { name: 'International flights and shipping', change: -1.0, low: null, high: null },
  { name: 'United States', change: -1.3, low: -3.4, high: 0.8 },
  { name: 'European Union', change: -1.5, low: -4.0, high: 0.9 },
];
export const CO2_2026_FUELS = [
  { name: 'Coal', change: 0.6, low: -0.6, high: 1.7 },
  { name: 'Natural gas', change: -0.3, low: -1.6, high: 0.9 },
  { name: 'Cement', change: -0.6, low: -2.6, high: 1.5 },
  { name: 'Oil', change: -1.9, low: -2.6, high: -1.2 },
];
