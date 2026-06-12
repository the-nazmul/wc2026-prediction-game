// FIFA World Cup 2026 — teams, groups, real fixtures and knockout bracket wiring.
// Groups per the December 2025 final draw with March 2026 playoff winners.
// Fixture pairings/kickoffs and knockout match dates from the official schedule.

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const GROUPS = {
  A: [
    { code: 'MEX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'RSA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'KOR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'CZE', name: 'Czechia', flag: '🇨🇿' },
  ],
  B: [
    { code: 'CAN', name: 'Canada', flag: '🇨🇦' },
    { code: 'SUI', name: 'Switzerland', flag: '🇨🇭' },
    { code: 'QAT', name: 'Qatar', flag: '🇶🇦' },
    { code: 'BIH', name: 'Bosnia-Herzegovina', flag: '🇧🇦' },
  ],
  C: [
    { code: 'BRA', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MAR', name: 'Morocco', flag: '🇲🇦' },
    { code: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { code: 'HAI', name: 'Haiti', flag: '🇭🇹' },
  ],
  D: [
    { code: 'USA', name: 'United States', flag: '🇺🇸' },
    { code: 'TUR', name: 'Türkiye', flag: '🇹🇷' },
    { code: 'PAR', name: 'Paraguay', flag: '🇵🇾' },
    { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
  ],
  E: [
    { code: 'GER', name: 'Germany', flag: '🇩🇪' },
    { code: 'ECU', name: 'Ecuador', flag: '🇪🇨' },
    { code: 'CIV', name: 'Ivory Coast', flag: '🇨🇮' },
    { code: 'CUW', name: 'Curaçao', flag: '🇨🇼' },
  ],
  F: [
    { code: 'NED', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'JPN', name: 'Japan', flag: '🇯🇵' },
    { code: 'SWE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'TUN', name: 'Tunisia', flag: '🇹🇳' },
  ],
  G: [
    { code: 'BEL', name: 'Belgium', flag: '🇧🇪' },
    { code: 'EGY', name: 'Egypt', flag: '🇪🇬' },
    { code: 'IRN', name: 'Iran', flag: '🇮🇷' },
    { code: 'NZL', name: 'New Zealand', flag: '🇳🇿' },
  ],
  H: [
    { code: 'ESP', name: 'Spain', flag: '🇪🇸' },
    { code: 'URU', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'CPV', name: 'Cape Verde', flag: '🇨🇻' },
  ],
  I: [
    { code: 'FRA', name: 'France', flag: '🇫🇷' },
    { code: 'NOR', name: 'Norway', flag: '🇳🇴' },
    { code: 'SEN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'IRQ', name: 'Iraq', flag: '🇮🇶' },
  ],
  J: [
    { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
    { code: 'AUT', name: 'Austria', flag: '🇦🇹' },
    { code: 'ALG', name: 'Algeria', flag: '🇩🇿' },
    { code: 'JOR', name: 'Jordan', flag: '🇯🇴' },
  ],
  K: [
    { code: 'POR', name: 'Portugal', flag: '🇵🇹' },
    { code: 'COL', name: 'Colombia', flag: '🇨🇴' },
    { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿' },
    { code: 'COD', name: 'DR Congo', flag: '🇨🇩' },
  ],
  L: [
    { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { code: 'CRO', name: 'Croatia', flag: '🇭🇷' },
    { code: 'PAN', name: 'Panama', flag: '🇵🇦' },
    { code: 'GHA', name: 'Ghana', flag: '🇬🇭' },
  ],
};

// code -> team (with group attached)
export const TEAMS = {};
for (const g of GROUP_IDS) {
  GROUPS[g].forEach((t, i) => { TEAMS[t.code] = { ...t, group: g, seed: i }; });
}

// Real group fixtures (official schedule, UTC kickoffs).
const f = (id, md, home, away, t) => ({ id, group: id[0], md, home, away, t });
export const FIXTURES = {
  A: [f('A1', 1, 'MEX', 'RSA', '2026-06-11T19:00Z'), f('A2', 1, 'KOR', 'CZE', '2026-06-12T02:00Z'), f('A3', 2, 'CZE', 'RSA', '2026-06-18T16:00Z'), f('A4', 2, 'MEX', 'KOR', '2026-06-19T01:00Z'), f('A5', 3, 'CZE', 'MEX', '2026-06-25T01:00Z'), f('A6', 3, 'RSA', 'KOR', '2026-06-25T01:00Z')],
  B: [f('B1', 1, 'CAN', 'BIH', '2026-06-12T19:00Z'), f('B2', 1, 'QAT', 'SUI', '2026-06-13T19:00Z'), f('B3', 2, 'SUI', 'BIH', '2026-06-18T19:00Z'), f('B4', 2, 'CAN', 'QAT', '2026-06-18T22:00Z'), f('B5', 3, 'BIH', 'QAT', '2026-06-24T19:00Z'), f('B6', 3, 'SUI', 'CAN', '2026-06-24T19:00Z')],
  C: [f('C1', 1, 'BRA', 'MAR', '2026-06-13T22:00Z'), f('C2', 1, 'HAI', 'SCO', '2026-06-14T01:00Z'), f('C3', 2, 'SCO', 'MAR', '2026-06-19T22:00Z'), f('C4', 2, 'BRA', 'HAI', '2026-06-20T00:30Z'), f('C5', 3, 'MAR', 'HAI', '2026-06-24T22:00Z'), f('C6', 3, 'SCO', 'BRA', '2026-06-24T22:00Z')],
  D: [f('D1', 1, 'USA', 'PAR', '2026-06-13T01:00Z'), f('D2', 1, 'AUS', 'TUR', '2026-06-14T04:00Z'), f('D3', 2, 'USA', 'AUS', '2026-06-19T19:00Z'), f('D4', 2, 'TUR', 'PAR', '2026-06-20T03:00Z'), f('D5', 3, 'PAR', 'AUS', '2026-06-26T02:00Z'), f('D6', 3, 'TUR', 'USA', '2026-06-26T02:00Z')],
  E: [f('E1', 1, 'GER', 'CUW', '2026-06-14T17:00Z'), f('E2', 1, 'CIV', 'ECU', '2026-06-14T23:00Z'), f('E3', 2, 'GER', 'CIV', '2026-06-20T20:00Z'), f('E4', 2, 'ECU', 'CUW', '2026-06-21T00:00Z'), f('E5', 3, 'CUW', 'CIV', '2026-06-25T20:00Z'), f('E6', 3, 'ECU', 'GER', '2026-06-25T20:00Z')],
  F: [f('F1', 1, 'NED', 'JPN', '2026-06-14T20:00Z'), f('F2', 1, 'SWE', 'TUN', '2026-06-15T02:00Z'), f('F3', 2, 'NED', 'SWE', '2026-06-20T17:00Z'), f('F4', 2, 'TUN', 'JPN', '2026-06-21T04:00Z'), f('F5', 3, 'JPN', 'SWE', '2026-06-25T23:00Z'), f('F6', 3, 'TUN', 'NED', '2026-06-25T23:00Z')],
  G: [f('G1', 1, 'BEL', 'EGY', '2026-06-15T19:00Z'), f('G2', 1, 'IRN', 'NZL', '2026-06-16T01:00Z'), f('G3', 2, 'BEL', 'IRN', '2026-06-21T19:00Z'), f('G4', 2, 'NZL', 'EGY', '2026-06-22T01:00Z'), f('G5', 3, 'EGY', 'IRN', '2026-06-27T03:00Z'), f('G6', 3, 'NZL', 'BEL', '2026-06-27T03:00Z')],
  H: [f('H1', 1, 'ESP', 'CPV', '2026-06-15T16:00Z'), f('H2', 1, 'KSA', 'URU', '2026-06-15T22:00Z'), f('H3', 2, 'ESP', 'KSA', '2026-06-21T16:00Z'), f('H4', 2, 'URU', 'CPV', '2026-06-21T22:00Z'), f('H5', 3, 'CPV', 'KSA', '2026-06-27T00:00Z'), f('H6', 3, 'URU', 'ESP', '2026-06-27T00:00Z')],
  I: [f('I1', 1, 'FRA', 'SEN', '2026-06-16T19:00Z'), f('I2', 1, 'IRQ', 'NOR', '2026-06-16T22:00Z'), f('I3', 2, 'FRA', 'IRQ', '2026-06-22T21:00Z'), f('I4', 2, 'NOR', 'SEN', '2026-06-23T00:00Z'), f('I5', 3, 'NOR', 'FRA', '2026-06-26T19:00Z'), f('I6', 3, 'SEN', 'IRQ', '2026-06-26T19:00Z')],
  J: [f('J1', 1, 'ARG', 'ALG', '2026-06-17T01:00Z'), f('J2', 1, 'AUT', 'JOR', '2026-06-17T04:00Z'), f('J3', 2, 'ARG', 'AUT', '2026-06-22T17:00Z'), f('J4', 2, 'JOR', 'ALG', '2026-06-23T03:00Z'), f('J5', 3, 'ALG', 'AUT', '2026-06-28T02:00Z'), f('J6', 3, 'JOR', 'ARG', '2026-06-28T02:00Z')],
  K: [f('K1', 1, 'POR', 'COD', '2026-06-17T17:00Z'), f('K2', 1, 'UZB', 'COL', '2026-06-18T02:00Z'), f('K3', 2, 'POR', 'UZB', '2026-06-23T17:00Z'), f('K4', 2, 'COL', 'COD', '2026-06-24T02:00Z'), f('K5', 3, 'COL', 'POR', '2026-06-27T23:30Z'), f('K6', 3, 'COD', 'UZB', '2026-06-27T23:30Z')],
  L: [f('L1', 1, 'ENG', 'CRO', '2026-06-17T20:00Z'), f('L2', 1, 'GHA', 'PAN', '2026-06-17T23:00Z'), f('L3', 2, 'ENG', 'GHA', '2026-06-23T20:00Z'), f('L4', 2, 'PAN', 'CRO', '2026-06-23T23:00Z'), f('L5', 3, 'CRO', 'GHA', '2026-06-27T21:00Z'), f('L6', 3, 'PAN', 'ENG', '2026-06-27T21:00Z')],
};

export function groupFixtures(g) {
  return FIXTURES[g];
}

export const ALL_GROUP_FIXTURES = GROUP_IDS.flatMap(groupFixtures);
export const FIXTURE_BY_ID = Object.fromEntries(ALL_GROUP_FIXTURES.map(x => [x.id, x]));

// Group events end before this; knockout events start after (used to classify API events).
export const KO_START = '2026-06-28T12:00Z';

// ----- Knockout wiring (official FIFA match numbers 73–104) -----
export const R32_SLOTS = [
  { id: 73, home: { type: 'runner', group: 'A' }, away: { type: 'runner', group: 'B' } },
  { id: 74, home: { type: 'winner', group: 'E' }, away: { type: 'third', groups: ['A', 'B', 'C', 'D', 'F'] } },
  { id: 75, home: { type: 'winner', group: 'F' }, away: { type: 'runner', group: 'C' } },
  { id: 76, home: { type: 'winner', group: 'C' }, away: { type: 'runner', group: 'F' } },
  { id: 77, home: { type: 'winner', group: 'I' }, away: { type: 'third', groups: ['C', 'D', 'F', 'G', 'H'] } },
  { id: 78, home: { type: 'runner', group: 'E' }, away: { type: 'runner', group: 'I' } },
  { id: 79, home: { type: 'winner', group: 'A' }, away: { type: 'third', groups: ['C', 'E', 'F', 'H', 'I'] } },
  { id: 80, home: { type: 'winner', group: 'L' }, away: { type: 'third', groups: ['E', 'H', 'I', 'J', 'K'] } },
  { id: 81, home: { type: 'winner', group: 'D' }, away: { type: 'third', groups: ['B', 'E', 'F', 'I', 'J'] } },
  { id: 82, home: { type: 'winner', group: 'G' }, away: { type: 'third', groups: ['A', 'E', 'H', 'I', 'J'] } },
  { id: 83, home: { type: 'runner', group: 'K' }, away: { type: 'runner', group: 'L' } },
  { id: 84, home: { type: 'winner', group: 'H' }, away: { type: 'runner', group: 'J' } },
  { id: 85, home: { type: 'winner', group: 'B' }, away: { type: 'third', groups: ['E', 'F', 'G', 'I', 'J'] } },
  { id: 86, home: { type: 'winner', group: 'J' }, away: { type: 'runner', group: 'H' } },
  { id: 87, home: { type: 'winner', group: 'K' }, away: { type: 'third', groups: ['D', 'E', 'I', 'J', 'L'] } },
  { id: 88, home: { type: 'runner', group: 'D' }, away: { type: 'runner', group: 'G' } },
];

export const R16_WIRING = [
  { id: 89, from: [74, 77] },
  { id: 90, from: [73, 75] },
  { id: 91, from: [76, 78] },
  { id: 92, from: [79, 80] },
  { id: 93, from: [83, 84] },
  { id: 94, from: [81, 82] },
  { id: 95, from: [86, 88] },
  { id: 96, from: [85, 87] },
];

export const QF_WIRING = [
  { id: 97, from: [89, 90] },
  { id: 98, from: [93, 94] },
  { id: 99, from: [91, 92] },
  { id: 100, from: [95, 96] },
];

export const SF_WIRING = [
  { id: 101, from: [97, 98] },
  { id: 102, from: [99, 100] },
];

export const BRONZE = { id: 103, from: [101, 102] }; // losers of the semifinals
export const FINAL = { id: 104, from: [101, 102] };  // winners of the semifinals

// Official knockout kickoffs (UTC) by match number.
export const KO_DATES = {
  73: '2026-06-28T19:00Z', 74: '2026-06-29T20:30Z', 75: '2026-06-30T01:00Z', 76: '2026-06-29T17:00Z',
  77: '2026-06-30T21:00Z', 78: '2026-06-30T17:00Z', 79: '2026-07-01T01:00Z', 80: '2026-07-01T16:00Z',
  81: '2026-07-02T00:00Z', 82: '2026-07-01T20:00Z', 83: '2026-07-02T23:00Z', 84: '2026-07-02T19:00Z',
  85: '2026-07-03T03:00Z', 86: '2026-07-03T22:00Z', 87: '2026-07-04T01:30Z', 88: '2026-07-03T18:00Z',
  89: '2026-07-04T21:00Z', 90: '2026-07-04T17:00Z', 91: '2026-07-05T20:00Z', 92: '2026-07-06T00:00Z',
  93: '2026-07-06T19:00Z', 94: '2026-07-07T00:00Z', 95: '2026-07-07T16:00Z', 96: '2026-07-07T20:00Z',
  97: '2026-07-09T20:00Z', 98: '2026-07-10T19:00Z', 99: '2026-07-11T21:00Z', 100: '2026-07-12T01:00Z',
  101: '2026-07-14T19:00Z', 102: '2026-07-15T19:00Z', 103: '2026-07-18T21:00Z', 104: '2026-07-19T19:00Z',
};

export const ROUND_NAMES = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  bronze: 'Third place',
  final: 'Final',
};

// Column display order so adjacent matches feed the same next-round tie.
export const BRACKET_DISPLAY = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  r16: [89, 90, 93, 94, 91, 92, 95, 96],
  qf: [97, 98, 99, 100],
  sf: [101, 102],
};

export function slotLabel(slot) {
  if (slot.type === 'winner') return `Winner Group ${slot.group}`;
  if (slot.type === 'runner') return `Runner-up Group ${slot.group}`;
  return `3rd: ${slot.groups.join('/')}`;
}
