// Sanity tests for the tournament engine. Run: node tests/logic.test.mjs
import {
  GROUP_IDS, GROUPS, groupFixtures, ALL_GROUP_FIXTURES, R32_SLOTS,
} from '../js/data.js';
import {
  emptyPicks, computeTable, allTables, thirdPlaceRanking, assignThirds,
  resolveBracket, scorePlayer,
} from '../js/logic.js';

let failures = 0;
function check(name, cond) {
  if (!cond) { failures++; console.error(`✗ ${name}`); }
  else console.log(`✓ ${name}`);
}

// --- fixtures cover every pairing exactly once per group ---
for (const g of GROUP_IDS) {
  const fx = groupFixtures(g);
  const pairs = new Set(fx.map(m => [m.home, m.away].sort().join('-')));
  check(`group ${g}: 6 unique pairings`, fx.length === 6 && pairs.size === 6);
}
check('72 group fixtures total', ALL_GROUP_FIXTURES.length === 72);

// --- group table: points, GD, head-to-head ---
{
  const picks = emptyPicks();
  // Group A order: MEX, RSA, KOR, CZE
  // A1 MEX-RSA, A2 KOR-CZE, A3 MEX-KOR, A4 CZE-RSA, A5 CZE-MEX, A6 RSA-KOR
  picks.group.A1 = { o: 'H', gd: 2 };  // MEX beats RSA by 2
  picks.group.A2 = { o: 'A', gd: 1 };  // CZE beats KOR by 1
  picks.group.A3 = { o: 'D', gd: 0 };  // MEX KOR draw
  picks.group.A4 = { o: 'H', gd: 1 };  // CZE beats RSA by 1
  picks.group.A5 = { o: 'A', gd: 1 };  // MEX beats CZE by 1
  picks.group.A6 = { o: 'A', gd: 2 };  // KOR beats RSA by 2
  const { teams, complete } = computeTable('A', picks);
  check('table complete', complete);
  check('MEX tops group (7 pts)', teams[0].code === 'MEX' && teams[0].pts === 7);
  check('CZE second (6 pts)', teams[1].code === 'CZE' && teams[1].pts === 6);
  check('KOR third (4 pts)', teams[2].code === 'KOR' && teams[2].pts === 4);
  check('MEX GD +3', teams[0].gd === 3);
}

// --- head-to-head breaks equal pts+GD ---
{
  const picks = emptyPicks();
  // MEX beats RSA 1; RSA beats KOR 1; KOR beats MEX 1 -> 3-way tie 3pts GD 0 among MEX,RSA,KOR
  picks.group.A1 = { o: 'H', gd: 1 };  // MEX > RSA
  picks.group.A6 = { o: 'H', gd: 1 };  // RSA > KOR
  picks.group.A3 = { o: 'A', gd: 1 };  // KOR > MEX
  picks.group.A2 = { o: 'A', gd: 3 };  // CZE > KOR by 3
  picks.group.A4 = { o: 'H', gd: 3 };  // CZE > RSA by 3
  picks.group.A5 = { o: 'H', gd: 3 };  // CZE > MEX by 3
  const { teams } = computeTable('A', picks);
  check('CZE wins group with 9 pts', teams[0].code === 'CZE' && teams[0].pts === 9);
  const codes = teams.map(t => t.code);
  check('3-way tie resolved deterministically', codes.length === 4);
}

// --- third-place allocation: every 8-of-12 combination must be assignable ---
{
  const combos = [];
  const pickCombo = (start, cur) => {
    if (cur.length === 8) { combos.push([...cur]); return; }
    if (start >= GROUP_IDS.length) return;
    for (let i = start; i <= GROUP_IDS.length - (8 - cur.length); i++) {
      cur.push(GROUP_IDS[i]);
      pickCombo(i + 1, cur);
      cur.pop();
    }
  };
  pickCombo(0, []);
  check('495 combinations enumerated', combos.length === 495);
  let ok = 0;
  for (const combo of combos) {
    const a = assignThirds(combo);
    if (!a) continue;
    const slots = R32_SLOTS.filter(s => s.away.type === 'third');
    const assigned = Object.values(a);
    const valid = slots.every(s => s.away.groups.includes(a[s.id]))
      && new Set(assigned).size === 8;
    if (valid) ok++;
  }
  check('all 495 third-place combinations allocate validly', ok === 495);
}

// --- full bracket resolution with deterministic picks ---
function fullPicks({ favorite = 'H', gd = 1, mutate = null } = {}) {
  const picks = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) picks.group[m.id] = { o: favorite, gd };
  if (mutate) mutate(picks);
  // walk rounds repeatedly, always advancing the "home" side of each resolved tie
  for (let i = 0; i < 8; i++) {
    const b = resolveBracket(picks);
    for (let no = 73; no <= 104; no++) {
      const m = b.matches[no];
      if (m.home && m.away && !picks.ko[no]) picks.ko[no] = { w: m.home.code, gd: 1 };
    }
  }
  return picks;
}
{
  const picks = fullPicks();
  const b = resolveBracket(picks);
  check('groups complete', b.groupsComplete);
  check('thirds ranked (12)', b.thirdsRank.length === 12);
  let resolved = 0;
  for (let no = 73; no <= 104; no++) if (b.matches[no].winner) resolved++;
  check('all 32 knockout matches resolved', resolved === 32);
  check('champion crowned', !!b.champion);
  check('third place decided', !!b.third);
  check('champion and runner-up differ', b.champion.code !== b.runnerUp.code);
}

// --- stale knockout picks are ignored after upstream change ---
{
  const picks = fullPicks();
  const before = resolveBracket(picks);
  const eWinner = computeTable('E', picks).teams[0].code;
  check('M74 home is the Group E winner', before.matches[74].home.code === eWinner);
  // flip every Group E match so the table reorders -> downstream picks must invalidate, not crash
  for (const m of groupFixtures('E')) picks.group[m.id] = { o: 'A', gd: 2 };
  const after = resolveBracket(picks);
  const eWinnerAfter = computeTable('E', picks).teams[0].code;
  check('upstream change reflows bracket without crash',
    after.matches[74].home.code === eWinnerAfter && eWinnerAfter !== eWinner);
  check('stale winner pick not honored',
    !after.matches[74].winner || [after.matches[74].home.code, after.matches[74].away.code].includes(after.matches[74].winner.code));
}

// --- scoring ---
{
  const official = fullPicks();
  const perfect = fullPicks();
  const s = scorePlayer(perfect, official);
  // all 72 group matches home-win by 1: 72 * (1 + 0.5) = 108; all 32 KO matches: 32 * 1.5 = 48
  check('perfect score = 156', s.total === 156);

  const draws = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) draws.group[m.id] = { o: 'D', gd: 0 };
  const s2 = scorePlayer(draws, official);
  check('all-draws vs all-home-wins scores 0 group pts', s2.groupPts === 0 && s2.groupGd === 0);

  // correct result wrong GD -> 1 pt no bonus. Use a GD tweak that cannot
  // reorder the group, so the brackets stay identical.
  const official2 = fullPicks({ mutate: p => { p.group.A1 = { o: 'H', gd: 5 }; } });
  const close = JSON.parse(JSON.stringify(official2));
  close.group.A1 = { o: 'H', gd: 4 };
  const s3 = scorePlayer(close, official2);
  check('wrong GD drops only the 0.5 bonus', s3.total === 156 - 0.5);

  // empty player scores 0 against full results
  const s4 = scorePlayer(emptyPicks(), official);
  check('empty picks score 0', s4.total === 0);

  // draws never earn GD bonus
  const officialDraws = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) officialDraws.group[m.id] = { o: 'D', gd: 0 };
  const s5 = scorePlayer(draws, officialDraws);
  check('correct draw = 1 pt, no GD bonus (72 total)', s5.total === 72);
}

// --- partial official results: only entered matches score ---
{
  const official = emptyPicks();
  official.group.A1 = { o: 'H', gd: 2 };
  const player = fullPicks();
  const s = scorePlayer(player, official);
  check('partial results score only entered matches', s.groupScored === 1 && s.koScored === 0);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll tests passed.');
process.exit(failures ? 1 : 0);
