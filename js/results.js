// Live results sync from ESPN's public World Cup scoreboard (CORS-open, no key).
// Finished matches are written into the official picks; live/scheduled matches
// only update score metadata. ESPN team abbreviations match our team codes.

import { ALL_GROUP_FIXTURES, TEAMS, KO_START } from './data.js';
import { resolveBracket } from './logic.js';

const API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const WINDOWS = ['20260611-20260627', '20260628-20260719'];
const KO_START_MS = Date.parse(KO_START);

const pairKey = (x, y) => [x, y].sort().join('-');
const FIXTURE_BY_PAIR = Object.fromEntries(
  ALL_GROUP_FIXTURES.map(fx => [pairKey(fx.home, fx.away), fx]));

export async function fetchEvents() {
  const events = [];
  for (const w of WINDOWS) {
    const res = await fetch(`${API}?dates=${w}&limit=200`);
    if (!res.ok) throw new Error(`results API responded ${res.status}`);
    const data = await res.json();
    for (const e of data.events ?? []) {
      const c = e.competitions?.[0];
      const h = c?.competitors?.find(x => x.homeAway === 'home');
      const a = c?.competitors?.find(x => x.homeAway === 'away');
      if (!h || !a) continue;
      events.push({
        date: e.date,
        h: h.team?.abbreviation,
        a: a.team?.abbreviation,
        hs: Number(h.score ?? 0),
        as: Number(a.score ?? 0),
        hWin: h.winner === true,
        aWin: a.winner === true,
        state: c.status?.type?.state ?? 'pre', // pre | in | post
        completed: c.status?.type?.completed === true,
      });
    }
  }
  return events;
}

// Apply events to official picks + score metadata. Pure (uses passed state only),
// so it is testable with a fake payload. Returns counts for the status line.
export function applyEvents(state, events) {
  const official = state.official;
  const scores = state.scores;
  let finals = 0, live = 0;

  const koEvents = [];
  for (const ev of events) {
    if (!TEAMS[ev.h] || !TEAMS[ev.a]) continue; // placeholder slots (1E, 3RD, …)
    if (ev.state === 'in') live++;
    if (Date.parse(ev.date) < KO_START_MS) {
      const fx = FIXTURE_BY_PAIR[pairKey(ev.h, ev.a)];
      if (!fx) continue;
      const flip = fx.home !== ev.h;
      const hs = flip ? ev.as : ev.hs;
      const as = flip ? ev.hs : ev.as;
      if (ev.state !== 'pre') scores[fx.id] = { hs, as, state: ev.state };
      if (ev.completed) {
        official.group[fx.id] = hs === as
          ? { o: 'D', gd: 0 }
          : { o: hs > as ? 'H' : 'A', gd: Math.abs(hs - as) };
        finals++;
      }
    } else {
      koEvents.push(ev);
    }
  }

  // Knockouts: map each event to its official match number by team pair against
  // the resolved official bracket; iterate as later rounds become resolvable.
  let pending = koEvents;
  for (let pass = 0; pass < 6 && pending.length; pass++) {
    const b = resolveBracket(official);
    const next = [];
    let progressed = false;
    for (const ev of pending) {
      let mapped = false;
      for (let no = 73; no <= 104; no++) {
        const m = b.matches[no];
        if (!m.home || !m.away) continue;
        if (pairKey(m.home.code, m.away.code) !== pairKey(ev.h, ev.a)) continue;
        const flip = m.home.code !== ev.h;
        if (ev.state !== 'pre') {
          scores[`M${no}`] = { hs: flip ? ev.as : ev.hs, as: flip ? ev.hs : ev.as, state: ev.state };
        }
        if (ev.completed) {
          const w = ev.hWin ? ev.h : ev.aWin ? ev.a : (ev.hs > ev.as ? ev.h : ev.a);
          official.ko[no] = { w, gd: Math.abs(ev.hs - ev.as) };
          finals++;
          progressed = true;
        }
        mapped = true;
        break;
      }
      if (!mapped) next.push(ev);
    }
    pending = next;
    if (!progressed) break;
  }

  return { finals, live };
}

export async function syncResults(state) {
  const events = await fetchEvents();
  return applyEvents(state, events);
}
