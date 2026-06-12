// Sanity tests for the tournament engine. Run: node tests/logic.test.mjs
import {
  GROUP_IDS, groupFixtures, ALL_GROUP_FIXTURES, R32_SLOTS, KO_DATES,
} from '../js/data.js';
import {
  emptyPicks, computeTable, assignThirds, resolveBracket, scorePlayer,
  mergedPicks, isGroupLocked, isKoLocked,
} from '../js/logic.js';
import { applyEvents } from '../js/results.js';

let failures = 0;
function check(name, cond) {
  if (!cond) { failures++; console.error(`✗ ${name}`); }
  else console.log(`✓ ${name}`);
}

// set a result from team x's perspective regardless of fixture orientation
function setResult(picks, g, x, y, res, gd = 0) {
  const fx = groupFixtures(g).find(m =>
    (m.home === x && m.away === y) || (m.home === y && m.away === x));
  if (!fx) throw new Error(`no fixture ${x}-${y}`);
  const xHome = fx.home === x;
  picks.group[fx.id] = res === 'D'
    ? { o: 'D', gd: 0 }
    : { o: (res === 'W') === xHome ? 'H' : 'A', gd };
  return fx.id;
}

// --- fixtures cover every pairing exactly once per group ---
for (const g of GROUP_IDS) {
  const fx = groupFixtures(g);
  const pairs = new Set(fx.map(m => [m.home, m.away].sort().join('-')));
  check(`group ${g}: 6 unique pairings`, fx.length === 6 && pairs.size === 6);
}
check('72 group fixtures total', ALL_GROUP_FIXTURES.length === 72);
check('all fixtures carry kickoff times', ALL_GROUP_FIXTURES.every(m => !Number.isNaN(Date.parse(m.t))));
check('all 32 knockout kickoffs present', Object.keys(KO_DATES).length === 32);

// --- group table: points, GD, ranking ---
{
  const picks = emptyPicks();
  setResult(picks, 'A', 'MEX', 'RSA', 'W', 2);
  setResult(picks, 'A', 'CZE', 'KOR', 'W', 1);
  setResult(picks, 'A', 'MEX', 'KOR', 'D');
  setResult(picks, 'A', 'CZE', 'RSA', 'W', 1);
  setResult(picks, 'A', 'MEX', 'CZE', 'W', 1);
  setResult(picks, 'A', 'KOR', 'RSA', 'W', 2);
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
  setResult(picks, 'A', 'MEX', 'RSA', 'W', 1);
  setResult(picks, 'A', 'RSA', 'KOR', 'W', 1);
  setResult(picks, 'A', 'KOR', 'MEX', 'W', 1);
  setResult(picks, 'A', 'CZE', 'KOR', 'W', 3);
  setResult(picks, 'A', 'CZE', 'RSA', 'W', 3);
  setResult(picks, 'A', 'CZE', 'MEX', 'W', 3);
  const { teams } = computeTable('A', picks);
  check('CZE wins group with 9 pts', teams[0].code === 'CZE' && teams[0].pts === 9);
  check('3-way tie resolved deterministically', teams.length === 4);
}

// --- third-place allocation: every 8-of-12 combination must be assignable ---
{
  const combos = [];
  const pickCombo = (start, cur) => {
    if (cur.length === 8) { combos.push([...cur]); return; }
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
    const valid = slots.every(s => s.away.groups.includes(a[s.id]))
      && new Set(Object.values(a)).size === 8;
    if (valid) ok++;
  }
  check('all 495 third-place combinations allocate validly', ok === 495);
}

// --- full bracket resolution with deterministic picks ---
function fullPicks({ favorite = 'H', gd = 1, mutate = null } = {}) {
  const picks = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) picks.group[m.id] = { o: favorite, gd };
  if (mutate) mutate(picks);
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
  const s = scorePlayer(fullPicks(), official);
  check('perfect score = 156', s.total === 156);

  const draws = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) draws.group[m.id] = { o: 'D', gd: 0 };
  const s2 = scorePlayer(draws, official);
  check('all-draws vs all-home-wins scores 0 group pts', s2.groupPts === 0 && s2.groupGd === 0);

  // correct result wrong GD -> 1 pt no bonus (GD tweak that cannot reorder the group)
  const official2 = fullPicks({ mutate: p => { p.group.A1 = { o: 'H', gd: 5 }; } });
  const close = JSON.parse(JSON.stringify(official2));
  close.group.A1 = { o: 'H', gd: 4 };
  const s3 = scorePlayer(close, official2);
  check('wrong GD drops only the 0.5 bonus', s3.total === 156 - 0.5);

  const s4 = scorePlayer(emptyPicks(), official);
  check('empty picks score 0', s4.total === 0);

  const officialDraws = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) officialDraws.group[m.id] = { o: 'D', gd: 0 };
  const s5 = scorePlayer(draws, officialDraws);
  check('correct draw = 1 pt, no GD bonus (72 total)', s5.total === 72);
}

// --- partial official results: only entered matches score ---
{
  const official = emptyPicks();
  official.group.A1 = { o: 'H', gd: 2 };
  const s = scorePlayer(fullPicks(), official);
  check('partial results score only entered matches', s.groupScored === 1 && s.koScored === 0);
}

// --- kickoff locking ---
{
  const t0 = Date.parse('2026-06-11T18:59Z');
  const t1 = Date.parse('2026-06-11T19:00Z');
  check('A1 open before kickoff', !isGroupLocked('A1', t0));
  check('A1 locked from kickoff', isGroupLocked('A1', t1));
  check('A2 still open at A1 kickoff', !isGroupLocked('A2', t1));
  check('M73 open before June 28', !isKoLocked(73, Date.parse('2026-06-28T18:59Z')));
  check('M73 locked from kickoff', isKoLocked(73, Date.parse('2026-06-28T19:00Z')));
  check('final locked only on July 19', !isKoLocked(104, Date.parse('2026-07-19T18:59Z')) && isKoLocked(104, Date.parse('2026-07-19T19:00Z')));
}

// --- results sync mapping ---
{
  const state = { official: emptyPicks(), scores: {} };
  const r = applyEvents(state, [
    // A1 is MEX (home) v RSA — event arrives flipped; MEX won 2-0
    { date: '2026-06-11T19:00Z', h: 'RSA', a: 'MEX', hs: 0, as: 2, hWin: false, aWin: true, state: 'post', completed: true },
    // draw
    { date: '2026-06-12T19:00Z', h: 'CAN', a: 'BIH', hs: 1, as: 1, hWin: false, aWin: false, state: 'post', completed: true },
    // live match: score recorded, no official result yet
    { date: '2026-06-12T02:00Z', h: 'KOR', a: 'CZE', hs: 1, as: 0, hWin: false, aWin: false, state: 'in', completed: false },
    // placeholder knockout event must be ignored
    { date: '2026-06-29T20:30Z', h: '1E', a: '3RD', hs: 0, as: 0, hWin: false, aWin: false, state: 'pre', completed: false },
  ]);
  check('two finals applied', r.finals === 2 && r.live === 1);
  check('flipped event maps to our orientation', state.official.group.A1?.o === 'H' && state.official.group.A1?.gd === 2);
  const b1 = ALL_GROUP_FIXTURES.find(m => [m.home, m.away].sort().join() === 'BIH,CAN');
  check('draw applied', state.official.group[b1.id]?.o === 'D');
  check('live match not in official results', !state.official.group.A2 && state.scores.A2?.state === 'in');
}
{
  // knockout mapping against the resolved official bracket, incl. penalties
  const state = { official: fullPicks(), scores: {} };
  state.official.ko = {};
  const b = resolveBracket(state.official);
  const m73 = b.matches[73];
  const r = applyEvents(state, [{
    date: '2026-06-28T19:00Z',
    h: m73.away.code, a: m73.home.code, // flipped on purpose
    hs: 1, as: 1, hWin: false, aWin: true, // away (= our home) wins on penalties
    state: 'post', completed: true,
  }]);
  check('KO event maps to match 73', r.finals === 1 && !!state.official.ko[73]);
  check('penalty winner with GD 0', state.official.ko[73]?.w === m73.home.code && state.official.ko[73]?.gd === 0);
  check('KO score meta oriented to bracket', state.scores.M73?.hs === 1 && state.scores.M73?.as === 1);
}

// --- reality-anchored merge: late joiners and played-match overrides ---
{
  const official = emptyPicks();
  official.group.A1 = { o: 'H', gd: 2 }; // MEX 2-0 RSA, already played

  // late joiner never picked A1 but fills everything else, bracket built on merged reality
  const late = emptyPicks();
  for (const m of ALL_GROUP_FIXTURES) if (m.id !== 'A1') late.group[m.id] = { o: 'H', gd: 1 };
  for (let i = 0; i < 8; i++) {
    const b = resolveBracket(mergedPicks(late, official));
    for (let no = 73; no <= 104; no++) {
      const m = b.matches[no];
      if (m.home && m.away && !late.ko[no]) late.ko[no] = { w: m.home.code, gd: 1 };
    }
  }
  const merged = mergedPicks(late, official);
  check('late joiner group completes via official result', computeTable('A', merged).complete);
  check('late joiner bracket resolves', !!resolveBracket(merged).champion);
  const s = scorePlayer(late, official);
  check('no points for the unpicked played match', s.groupPts === 0 && s.groupScored === 0);

  // player who picked A1 wrong: reality overrides their table, scoring unaffected
  // (all-H universe: MEX wins A1, A4, loses A5 -> 6 pts; their own A1 pick said MEX lost -> 3 pts)
  const wrong = fullPicks();
  wrong.group.A1 = { o: 'A', gd: 1 };
  const mw = mergedPicks(wrong, official);
  const mexes = computeTable('A', mw).teams.find(t => t.code === 'MEX');
  check('official result overrides table-building', mexes.pts === 6 && mexes.gd === 2);
  const sw = scorePlayer(wrong, official);
  check('wrong pick on played match scores 0', sw.groupPts === 0);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll tests passed.');
process.exit(failures ? 1 : 0);
