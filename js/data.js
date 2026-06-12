// FIFA World Cup 2026 — teams, groups, fixtures and knockout bracket wiring.
// Groups per the December 2025 final draw, with March 2026 playoff winners
// (Czechia, Bosnia-Herzegovina, Türkiye, Sweden, Iraq, DR Congo) filled in.

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

// Round-robin pattern by team index within the group (3 matchdays, 6 matches).
const RR = [
  [0, 1], [2, 3], // matchday 1
  [0, 2], [3, 1], // matchday 2
  [3, 0], [1, 2], // matchday 3
];

export function groupFixtures(g) {
  const t = GROUPS[g];
  return RR.map(([h, a], i) => ({
    id: `${g}${i + 1}`,
    group: g,
    md: Math.floor(i / 2) + 1,
    home: t[h].code,
    away: t[a].code,
  }));
}

export const ALL_GROUP_FIXTURES = GROUP_IDS.flatMap(groupFixtures);

// ----- Knockout wiring (official FIFA match numbers 73–104) -----
// slot types: winner/runner of a group, or a best-third slot restricted to a set of groups.
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

export const KO_MATCH_NOS = [];
for (let n = 73; n <= 104; n++) KO_MATCH_NOS.push(n);

export const ROUND_OF = (no) =>
  no <= 88 ? 'r32' : no <= 96 ? 'r16' : no <= 100 ? 'qf' : no <= 102 ? 'sf' : no === 103 ? 'bronze' : 'final';

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
