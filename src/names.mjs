// Utility names as people search for them. EIA's register abbreviates to fit a column ("Cleveland Electric Illum Co",
// "Jersey Central Power & Lt Co") and tags municipal utilities with their state; pages show a readable name and keep
// EIA's own spelling beside it, so a reader can match either.
const OVERRIDES = {
  'Consolidated Edison Co-NY Inc': 'Con Edison',
  'Pacific Gas & Electric Co.': 'Pacific Gas and Electric (PG&E)',
  'San Diego Gas & Electric Co': 'San Diego Gas & Electric (SDG&E)',
  'Southern California Edison Co': 'Southern California Edison (SCE)',
  'Public Service Elec & Gas Co': 'PSE&G',
  'Virginia Electric & Power Co': 'Dominion Energy Virginia',
  'Union Electric Co - (MO)': 'Ameren Missouri',
  'Northern States Power Co - Minnesota': 'Xcel Energy (Northern States Power Minnesota)',
  'Northern States Power Co': 'Xcel Energy (Northern States Power)',
  'Public Service Co of Colorado': 'Xcel Energy (Public Service Company of Colorado)',
  'Southwestern Public Service Co': 'Xcel Energy (Southwestern Public Service)',
  'Massachusetts Electric Co': 'National Grid (Massachusetts Electric)',
  'Niagara Mohawk Power Corp.': 'National Grid (Niagara Mohawk)',
  'The Narragansett Electric Co': 'Rhode Island Energy',
  'NSTAR Electric Company': 'Eversource (NSTAR Electric)',
  'Connecticut Light & Power Co': 'Eversource (Connecticut Light & Power)',
  'Public Service Co of NH': 'Eversource (Public Service of New Hampshire)',
  'Wisconsin Electric Power Co': 'We Energies',
  'Interstate Power and Light Co': 'Alliant Energy (Interstate Power and Light)',
  'Wisconsin Power & Light Co': 'Alliant Energy (Wisconsin Power and Light)',
  'Ohio Power Co': 'AEP Ohio',
  'Appalachian Power Co': 'Appalachian Power (AEP)',
  'Indiana Michigan Power Co': 'Indiana Michigan Power (AEP)',
  'Southwestern Electric Power Co': 'SWEPCO (AEP)',
  'Public Service Co of Oklahoma': 'PSO (AEP)',
  'Commonwealth Edison Co': 'ComEd',
  'PECO Energy Co': 'PECO',
  'Los Angeles Department of Water & Power': 'LADWP',
  'Sacramento Municipal Util Dist': 'SMUD',
  'JEA': 'JEA (Jacksonville)',
};
const WORDS = [
  [/\bElec\b/g, 'Electric'], [/\bCooperativ\b/g, 'Cooperative'], [/\bCoop\b|\bCo-op\b/g, 'Cooperative'], [/\bAssn\b/g, 'Association'],
  [/\bPub\b/g, 'Public'], [/\bServ\b/g, 'Service'], [/\bIllum\b/g, 'Illuminating'], [/\bLt\b/g, 'Light'], [/\bUtils\b/g, 'Utilities'],
  [/\bUtil\b/g, 'Utility'], [/\bDist\b/g, 'District'], [/\bE M C\b/g, 'EMC'], [/\bMember Corp\b|\bMembers Corp\b/g, 'EMC'], [/\bE C C\b/g, 'ECC'],
];
// Corporate suffixes carry no meaning for a reader and differ between years of the same register.
const SUFFIX = /(,?\s+(Co|Co\.|Company|Inc|Inc\.|LLC|L\.L\.C\.|Corp|Corp\.|Corporation|Ltd))+\.?$/;

export function utilityName(raw) {
  if (OVERRIDES[raw]) return OVERRIDES[raw];
  let name = raw.replace(/\s*-\s*\([A-Z]{2}\)\s*$/, '').trim();
  for (const [re, to] of WORDS) name = name.replace(re, to);
  name = name.replace(SUFFIX, '').replace(/^The\s+/, '').trim();
  return name || raw;
}
