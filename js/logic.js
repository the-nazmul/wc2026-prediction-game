// Tournament engine: group tables, best-thirds allocation, bracket resolution, scoring.
//
// A picks object has the shape:
//   { group: { [fixtureId]: { o: 'H'|'D'|'A', gd: number } },   gd >= 1 for H/A, 0 for D
//     ko:    { [matchNo]:   { w: teamCode, gd: number } } }      gd 0 = level, decided on penalties

import {
  GROUP_IDS, GROUPS, groupFixtures, R32_SLOTS,
  R16_WIRING, QF_WIRING, SF_WIRING, BRONZE, FINAL,
  FIXTURE_BY_ID, KO_DATES,
} from './data.js';

export function emptyPicks() {
  return { group: {}, ko: {} };
}

// A match locks for predictions once its real-world kickoff has passed.
export function isGroupLocked(fixtureId, now) {
  const fx = FIXTURE_BY_ID[fixtureId];
  return !!fx && now >= Date.parse(fx.t);
}

export function isKoLocked(matchNo, now) {
  const t = KO_DATES[matchNo];
  return !!t && now >= Date.parse(t);
}

// Compute a group table from match picks.
// Tiebreakers: points, goal difference, head-to-head points, head-to-head GD, draw seed.
// (Goals scored is unknown in a winner+GD model, so it is not used — see README.)
export function computeTable(groupId, picks) {
  const teams = GROUPS[groupId].map((t, i) => ({
    ...t, group: groupId, seed: i, pts: 0, gd: 0, w: 0, d: 0, l: 0, played: 0,
  }));
  const by = Object.fromEntries(teams.map(t => [t.code, t]));
  const results = [];
  let complete = true;

  for (const m of groupFixtures(groupId)) {
    const p = picks.group?.[m.id];
    if (!p) { complete = false; continue; }
    const h = by[m.home], a = by[m.away];
    h.played++; a.played++;
    if (p.o === 'D') {
      h.pts += 1; a.pts += 1; h.d++; a.d++;
    } else {
      const winner = p.o === 'H' ? h : a;
      const loser = p.o === 'H' ? a : h;
      winner.pts += 3; winner.w++; winner.gd += p.gd;
      loser.l++; loser.gd -= p.gd;
    }
    results.push({ home: m.home, away: m.away, o: p.o, gd: p.gd });
  }

  const h2h = (x, y) => {
    const r = results.find(r =>
      (r.home === x.code && r.away === y.code) || (r.home === y.code && r.away === x.code));
    if (!r || r.o === 'D') return 0;
    const winner = r.o === 'H' ? r.home : r.away;
    return winner === x.code ? -1 : 1; // x won -> x first
  };

  const sorted = [...teams].sort((x, y) =>
    y.pts - x.pts || y.gd - x.gd || h2h(x, y) || x.seed - y.seed);
  return { teams: sorted, complete };
}

export function allTables(picks) {
  const tables = {};
  let complete = true;
  for (const g of GROUP_IDS) {
    tables[g] = computeTable(g, picks);
    if (!tables[g].complete) complete = false;
  }
  return { tables, complete };
}

// Rank the twelve third-placed teams; the best eight advance.
export function thirdPlaceRanking(tables) {
  const thirds = GROUP_IDS.map(g => tables[g].teams[2]);
  thirds.sort((x, y) => y.pts - x.pts || y.gd - x.gd || x.group.localeCompare(y.group));
  return thirds;
}

// Assign the 8 qualified third-placed groups to the 8 restricted bracket slots.
// FIFA publishes a 495-row allocation table (Annex C); a constraint-respecting
// assignment reproduces a valid allocation. Backtracking in slot order, trying
// better-ranked thirds first, keeps it deterministic.
export function assignThirds(qualifiedGroupsInRankOrder) {
  const slots = R32_SLOTS.filter(s => s.away.type === 'third');
  const assignment = {};
  const used = new Set();

  const bt = (i) => {
    if (i === slots.length) return true;
    const slot = slots[i];
    for (const g of qualifiedGroupsInRankOrder) {
      if (used.has(g) || !slot.away.groups.includes(g)) continue;
      used.add(g);
      assignment[slot.id] = g;
      if (bt(i + 1)) return true;
      used.delete(g);
      delete assignment[slot.id];
    }
    return false;
  };
  return bt(0) ? assignment : null;
}

// Resolve the whole bracket for a picks object.
// Every match gets { no, home, away, winner, loser, gd } where home/away/winner
// may be null while upstream picks are missing or invalid.
export function resolveBracket(picks) {
  const { tables, complete } = allTables(picks);

  let thirdsRank = null;
  let thirdAssign = null;
  if (complete) {
    thirdsRank = thirdPlaceRanking(tables);
    thirdAssign = assignThirds(thirdsRank.slice(0, 8).map(t => t.group));
  }

  const matches = {};
  const apply = (no, home, away) => {
    const pick = picks.ko?.[no];
    let winner = null, loser = null, gd = null;
    if (home && away && pick && (pick.w === home.code || pick.w === away.code)) {
      winner = pick.w === home.code ? home : away;
      loser = pick.w === home.code ? away : home;
      gd = pick.gd;
    }
    matches[no] = { no, home, away, winner, loser, gd };
  };

  const slotTeam = (slot, matchNo) => {
    if (slot.type === 'winner') return tables[slot.group].complete ? tables[slot.group].teams[0] : null;
    if (slot.type === 'runner') return tables[slot.group].complete ? tables[slot.group].teams[1] : null;
    if (!thirdAssign) return null;
    return tables[thirdAssign[matchNo]].teams[2];
  };

  for (const s of R32_SLOTS) apply(s.id, slotTeam(s.home, s.id), slotTeam(s.away, s.id));
  for (const w of [...R16_WIRING, ...QF_WIRING, ...SF_WIRING]) {
    apply(w.id, matches[w.from[0]].winner, matches[w.from[1]].winner);
  }
  apply(BRONZE.id, matches[BRONZE.from[0]].loser, matches[BRONZE.from[1]].loser);
  apply(FINAL.id, matches[FINAL.from[0]].winner, matches[FINAL.from[1]].winner);

  return {
    matches, tables, thirdsRank, thirdAssign,
    groupsComplete: complete,
    champion: matches[FINAL.id].winner,
    runnerUp: matches[FINAL.id].loser,
    third: matches[BRONZE.id].winner,
  };
}

// Played matches belong to reality: official results override predictions when
// building tables and brackets (points are still only earned on matches the
// player actually picked). Lets late joiners play and converges every bracket
// to the real Round of 32 as the group stage completes.
export function mergedPicks(player, official) {
  const group = { ...player.group };
  for (const [fid, res] of Object.entries(official?.group ?? {})) group[fid] = res;
  return { group, ko: player.ko };
}

// ----- Scoring -----
// Group match: correct result (winner or draw) = 1 pt.
//   Decisive result with the exact goal difference = +0.5 (draws are always GD 0,
//   so the bonus only applies to wins).
// Knockout match (per official slot 73..104): predicted winner actually won = 1 pt.
//   If the predicted fixture had the same two teams AND the exact goal difference
//   (0 = decided on penalties) = +0.5.
export const SCORE = { result: 1, gdBonus: 0.5 };

export function scorePlayer(playerPicks, officialPicks) {
  const s = {
    groupPts: 0, groupGd: 0, koPts: 0, koGd: 0,
    groupScored: 0, koScored: 0, total: 0,
  };

  for (const g of GROUP_IDS) {
    for (const m of groupFixtures(g)) {
      const pp = playerPicks.group?.[m.id];
      const op = officialPicks.group?.[m.id];
      if (!pp || !op) continue;
      s.groupScored++;
      if (pp.o === op.o) {
        s.groupPts += SCORE.result;
        if (op.o !== 'D' && pp.gd === op.gd) s.groupGd += SCORE.gdBonus;
      }
    }
  }

  const pb = resolveBracket(mergedPicks(playerPicks, officialPicks));
  const ob = resolveBracket(officialPicks);
  for (let no = 73; no <= 104; no++) {
    const pm = pb.matches[no], om = ob.matches[no];
    if (!om?.winner) continue;
    s.koScored++;
    if (!pm?.winner) continue;
    if (pm.winner.code === om.winner.code) {
      s.koPts += SCORE.result;
      const sameFixture =
        (pm.home.code === om.home.code && pm.away.code === om.away.code) ||
        (pm.home.code === om.away.code && pm.away.code === om.home.code);
      if (sameFixture && pm.gd === om.gd) s.koGd += SCORE.gdBonus;
    }
  }

  s.total = s.groupPts + s.groupGd + s.koPts + s.koGd;
  return s;
}

export function countGroupPicks(picks) {
  return Object.keys(picks.group ?? {}).length;
}

// Picks that currently resolve to a valid winner in this player's bracket.
export function countKoPicks(picks) {
  const b = resolveBracket(picks);
  let n = 0;
  for (let no = 73; no <= 104; no++) if (b.matches[no].winner) n++;
  return n;
}
