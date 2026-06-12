// UI: hash-routed views over localStorage state. No dependencies.

import {
  GROUP_IDS, GROUPS, TEAMS, groupFixtures, R32_SLOTS, slotLabel,
  BRACKET_DISPLAY, ROUND_NAMES, ROUND_OF,
} from './data.js';
import {
  emptyPicks, computeTable, resolveBracket, scorePlayer,
  countGroupPicks, countKoPicks, thirdPlaceRanking,
} from './logic.js';

const LS_KEY = 'wc26-predictor';
const TOTAL_GROUP = 72;
const TOTAL_KO = 32;
const MAX_GD = 9;

// ----- state -----

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      players: raw.players ?? {},
      official: raw.official ?? emptyPicks(),
      active: raw.active ?? null,
    };
  } catch {
    return { players: {}, official: emptyPicks(), active: null };
  }
}

const state = load();

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    players: state.players, official: state.official, active: state.active,
  }));
}

function activePicks() {
  return state.active ? state.players[state.active] : null;
}

// picks object being edited in the current view (player or official results)
function targetPicks() {
  return isResultsRoute() ? state.official : activePicks();
}

// ----- routing -----

const ROUTES = ['home', 'groups', 'bracket', 'leaderboard', 'results-groups', 'results-bracket', 'rules'];

function route() {
  const r = location.hash.replace(/^#\/?/, '') || 'home';
  return ROUTES.includes(r) ? r : 'home';
}

function isResultsRoute() {
  return route().startsWith('results-');
}

window.addEventListener('hashchange', render);

// ----- helpers -----

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function teamChip(t, extra = '') {
  if (!t) return `<span class="chip placeholder ${extra}">—</span>`;
  return `<span class="chip ${extra}"><span class="flag">${t.flag}</span><span class="tname">${esc(t.name)}</span></span>`;
}

function progress(picks) {
  return { g: countGroupPicks(picks), k: countKoPicks(picks) };
}

// ----- views -----

function viewHome() {
  const players = Object.keys(state.players);
  const officialP = progress(state.official);
  const rows = players.map(name => {
    const p = progress(state.players[name]);
    const done = p.g === TOTAL_GROUP && p.k === TOTAL_KO;
    const b = resolveBracket(state.players[name]);
    return `
      <div class="card player-card ${state.active === name ? 'active' : ''}">
        <div class="player-head">
          <button class="player-name" data-action="select-player" data-name="${esc(name)}" title="Make active">
            ${state.active === name ? '⭐ ' : ''}${esc(name)}
          </button>
          <button class="icon-btn" data-action="delete-player" data-name="${esc(name)}" title="Delete player">✕</button>
        </div>
        <div class="bars">
          <div class="bar-row"><span>Groups</span><div class="bar"><i style="width:${(p.g / TOTAL_GROUP) * 100}%"></i></div><span>${p.g}/${TOTAL_GROUP}</span></div>
          <div class="bar-row"><span>Bracket</span><div class="bar"><i style="width:${(p.k / TOTAL_KO) * 100}%"></i></div><span>${p.k}/${TOTAL_KO}</span></div>
        </div>
        <div class="player-foot">
          ${b.champion ? `<span class="mini-champ">🏆 ${b.champion.flag} ${esc(b.champion.name)}</span>` : `<span class="muted">No champion picked yet</span>`}
          ${done ? '<span class="badge done">Complete</span>' : '<span class="badge">In progress</span>'}
        </div>
      </div>`;
  }).join('');

  return `
    <section class="hero card">
      <h1>⚽ World Cup 2026 Predictor</h1>
      <p>48 teams, 12 groups, 104 matches across USA, Canada and Mexico.
      Pick every group game (winner + goal difference), watch your Round of 32 build itself
      under the real FIFA rules, then call your bracket all the way to the champion.</p>
      <p class="muted">Scoring: <b>1 pt</b> per correct result · <b>+0.5</b> for the exact goal difference ·
      knockout picks score on the real bracket. <a href="#/rules">Full rules</a></p>
    </section>
    <section class="card">
      <h2>Players</h2>
      <form class="add-player" data-action="add-player-form">
        <input id="new-player" type="text" maxlength="20" placeholder="Enter your name…" autocomplete="off" />
        <button type="submit" class="btn primary">Join the game</button>
      </form>
      ${players.length ? `<div class="player-grid">${rows}</div>` : '<p class="muted">No players yet — add a name to start predicting.</p>'}
    </section>
    <section class="card">
      <h2>Official results</h2>
      <p class="muted">${officialP.g + officialP.k > 0
        ? `${officialP.g}/${TOTAL_GROUP} group results and ${officialP.k}/${TOTAL_KO} knockout results entered.`
        : 'No official results entered yet. As the real tournament plays out, enter results to score the leaderboard.'}</p>
      <div class="btn-row">
        <a class="btn" href="#/results-groups">Enter results</a>
        <a class="btn" href="#/leaderboard">Leaderboard</a>
        <button class="btn" data-action="export">Export data</button>
        <button class="btn" data-action="import">Import data</button>
      </div>
    </section>`;
}

function gdStepper(matchKey, gd, kind, isPens) {
  return `
    <div class="gd">
      <span class="gd-label">${kind === 'ko' && gd === 0 ? 'Pens' : '±' + gd}</span>
      <button class="gd-btn" data-action="${kind}-gd" data-key="${matchKey}" data-delta="-1" ${gd <= (kind === 'ko' ? 0 : 1) ? 'disabled' : ''}>−</button>
      <button class="gd-btn" data-action="${kind}-gd" data-key="${matchKey}" data-delta="1" ${gd >= MAX_GD ? 'disabled' : ''}>+</button>
    </div>`;
}

function viewGroups() {
  const picks = targetPicks();
  if (!picks) return needPlayer();
  const results = isResultsRoute();

  const groups = GROUP_IDS.map(g => {
    const { teams, complete } = computeTable(g, picks);
    const fixtures = groupFixtures(g);

    const matchRows = fixtures.map(m => {
      const p = picks.group[m.id];
      const h = TEAMS[m.home], a = TEAMS[m.away];
      const sel = (o) => p?.o === o ? 'selected' : '';
      return `
        <div class="match-row" data-md="MD${m.md}">
          <button class="pick home ${sel('H')}" data-action="pick" data-key="${m.id}" data-o="H">${h.flag} ${esc(h.name)}</button>
          <button class="pick draw ${sel('D')}" data-action="pick" data-key="${m.id}" data-o="D">draw</button>
          <button class="pick away ${sel('A')}" data-action="pick" data-key="${m.id}" data-o="A">${esc(a.name)} ${a.flag}</button>
          ${p && p.o !== 'D' ? gdStepper(m.id, p.gd, 'group') : '<div class="gd gd-empty"></div>'}
        </div>`;
    }).join('');

    const tableRows = teams.map((t, i) => `
      <tr class="${i < 2 ? 'q-direct' : i === 2 ? 'q-third' : ''}">
        <td>${i + 1}</td><td class="t-cell">${t.flag} ${esc(t.name)}</td>
        <td>${t.pts}</td><td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
      </tr>`).join('');

    return `
      <div class="card group-card">
        <h3>Group ${g} ${complete ? '<span class="badge done">✓</span>' : ''}</h3>
        <div class="matches">${matchRows}</div>
        <table class="mini-table">
          <thead><tr><th>#</th><th>Team</th><th>Pts</th><th>GD</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }).join('');

  const { g } = progress(picks);
  const allDone = g === TOTAL_GROUP;
  return `
    ${modeBanner()}
    <div class="stage-head">
      <h2>Group stage ${results ? 'results' : 'predictions'}</h2>
      <span class="badge ${allDone ? 'done' : ''}">${g}/${TOTAL_GROUP} matches</span>
      <button class="btn small" data-action="clear-groups">Clear all</button>
    </div>
    <p class="muted">Tap a team to pick the winner (or <i>draw</i>), then set the goal difference with −/+.
    Top two of each group qualify; the 8 best third-placed teams complete the Round of 32.</p>
    <div class="group-grid">${groups}</div>
    ${allDone ? `<div class="next-cta card"><p>Group stage complete — the Round of 32 is set under FIFA rules.</p>
      <a class="btn primary" href="#/${results ? 'results-bracket' : 'bracket'}">Continue to the bracket →</a></div>` : ''}`;
}

function thirdsPanel(bracket) {
  if (!bracket.thirdsRank) return '';
  const rows = bracket.thirdsRank.map((t, i) => `
    <tr class="${i < 8 ? 'q-third' : 'q-out'}">
      <td>${i + 1}</td><td class="t-cell">${t.flag} ${esc(t.name)} <span class="muted">(${t.group})</span></td>
      <td>${t.pts}</td><td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
    </tr>`).join('');
  return `
    <details class="card thirds">
      <summary>Best third-placed teams (top 8 advance)</summary>
      <table class="mini-table"><thead><tr><th>#</th><th>Team</th><th>Pts</th><th>GD</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </details>`;
}

function koMatchCard(m, slotDef) {
  const labelH = slotDef ? slotLabel(slotDef.home) : `Winner M${m.no === 103 ? '—' : ''}`;
  let phH = 'TBD', phA = 'TBD';
  if (slotDef) { phH = slotLabel(slotDef.home); phA = slotLabel(slotDef.away); }
  else if (m.no === 103) { phH = 'Loser SF1'; phA = 'Loser SF2'; }
  else if (m.no === 104) { phH = 'Winner SF1'; phA = 'Winner SF2'; }

  const side = (t, ph) => {
    if (!t) return `<div class="ko-team empty">${esc(ph)}</div>`;
    const isW = m.winner?.code === t.code;
    const isL = m.winner && !isW;
    return `<button class="ko-team ${isW ? 'won' : ''} ${isL ? 'lost' : ''}"
      data-action="ko-pick" data-key="${m.no}" data-team="${t.code}">
      <span class="flag">${t.flag}</span><span class="tname">${esc(t.name)}</span>
      ${isW ? '<span class="tick">✓</span>' : ''}</button>`;
  };

  return `
    <div class="ko-match" id="m${m.no}">
      <div class="ko-no">M${m.no}</div>
      ${side(m.home, phH)}
      ${side(m.away, phA)}
      ${m.winner ? gdStepper(m.no, m.gd, 'ko') : '<div class="gd gd-empty small"></div>'}
    </div>`;
}

function viewBracket() {
  const picks = targetPicks();
  if (!picks) return needPlayer();
  const results = isResultsRoute();
  const b = resolveBracket(picks);
  const slotById = Object.fromEntries(R32_SLOTS.map(s => [s.id, s]));

  const col = (key, nos) => `
    <div class="ko-col">
      <h4>${ROUND_NAMES[key]}</h4>
      <div class="ko-col-matches">${nos.map(no => koMatchCard(b.matches[no], key === 'r32' ? slotById[no] : null)).join('')}</div>
    </div>`;

  const finals = `
    <div class="ko-col">
      <h4>${ROUND_NAMES.final}</h4>
      <div class="ko-col-matches">
        ${koMatchCard(b.matches[104], null)}
        <div class="champ-box ${b.champion ? 'has' : ''}">
          <div class="champ-label">🏆 Champion</div>
          <div class="champ-team">${b.champion ? `${b.champion.flag} ${esc(b.champion.name)}` : 'TBD'}</div>
        </div>
        <h4 class="bronze-h">${ROUND_NAMES.bronze}</h4>
        ${koMatchCard(b.matches[103], null)}
        ${b.third ? `<div class="champ-box small has"><div class="champ-label">🥉 Third place</div>
          <div class="champ-team">${b.third.flag} ${esc(b.third.name)}</div></div>` : ''}
      </div>
    </div>`;

  const { k } = progress(picks);
  return `
    ${modeBanner()}
    <div class="stage-head">
      <h2>Knockout ${results ? 'results' : 'bracket'}</h2>
      <span class="badge ${k === TOTAL_KO ? 'done' : ''}">${k}/${TOTAL_KO} picks</span>
      <button class="btn small" data-action="clear-ko">Clear bracket</button>
    </div>
    ${b.groupsComplete
      ? '<p class="muted">Tap a team to advance it. Goal difference 0 means level after extra time — through on penalties. Changing an earlier pick clears any later picks it invalidates.</p>'
      : `<p class="warn">⚠ Finish all 72 group ${results ? 'results' : 'picks'} to unlock third-place slots — matches between confirmed winners/runners-up can be picked already.</p>`}
    ${thirdsPanel(b)}
    <div class="bracket-scroll"><div class="bracket">
      ${col('r32', BRACKET_DISPLAY.r32)}
      ${col('r16', BRACKET_DISPLAY.r16)}
      ${col('qf', BRACKET_DISPLAY.qf)}
      ${col('sf', BRACKET_DISPLAY.sf)}
      ${finals}
    </div></div>`;
}

function viewLeaderboard() {
  const players = Object.keys(state.players);
  const op = progress(state.official);
  const scored = op.g + op.k;

  if (!players.length) return `<div class="card"><h2>Leaderboard</h2><p class="muted">No players yet.</p></div>`;

  const rows = players
    .map(name => ({ name, s: scorePlayer(state.players[name], state.official) }))
    .sort((a, b) => b.s.total - a.s.total)
    .map((r, i) => `
      <tr class="${i === 0 && r.s.total > 0 ? 'leader' : ''}">
        <td>${i === 0 && r.s.total > 0 ? '👑' : i + 1}</td>
        <td class="t-cell">${esc(r.name)}</td>
        <td>${r.s.groupPts}</td><td>${r.s.groupGd}</td>
        <td>${r.s.koPts}</td><td>${r.s.koGd}</td>
        <td class="total">${r.s.total}</td>
      </tr>`).join('');

  return `
    <div class="card">
      <h2>🏆 Leaderboard</h2>
      <p class="muted">${scored
        ? `Scored against ${op.g}/${TOTAL_GROUP} group results and ${op.k}/${TOTAL_KO} knockout results.`
        : 'No official results yet — everyone is on 0. Enter results as the tournament plays out.'}</p>
      <table class="board">
        <thead><tr><th></th><th>Player</th><th>Group<br>results</th><th>Group<br>GD bonus</th><th>KO<br>winners</th><th>KO<br>GD bonus</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted small-print">Max possible: ${TOTAL_GROUP} × 1.5 + ${TOTAL_KO} × 1.5 = 156 pts.</p>
    </div>`;
}

function viewRules() {
  return `
    <div class="card rules">
      <h2>How it works</h2>
      <h3>1 · Predict the groups</h3>
      <p>For each of the 72 group matches, pick the winner (or a draw) and the goal difference.
      Wins are 3 pts, draws 1. Group tables rank by points, then goal difference, then head-to-head,
      exactly as you'd expect. The top two in each of the 12 groups advance, joined by the
      <b>8 best third-placed teams</b> — ranked across groups by points then goal difference.</p>
      <h3>2 · The bracket builds itself</h3>
      <p>Your Round of 32 follows the official FIFA match plan (matches 73–88), including the
      restricted third-place slots (e.g. match 74 takes a third from groups A/B/C/D/F).
      Pick winners through the Round of 32, Round of 16, quarter-finals, semi-finals,
      the third-place match and the final. Goal difference 0 in a knockout = level after extra time,
      through on penalties.</p>
      <h3>3 · Scoring</h3>
      <ul>
        <li><b>1 point</b> — correct group-match result (winner or draw).</li>
        <li><b>+0.5</b> — exact goal difference on a correctly-called win (a draw is always GD 0, so no bonus there).</li>
        <li><b>1 point</b> — each knockout match (by official match number) where your predicted winner really won.</li>
        <li><b>+0.5</b> — you also had the exact same two teams in that tie and the exact goal difference.</li>
        <li>The final and third-place match score like any knockout match — call the champion to take the last point.</li>
      </ul>
      <h3>Simplifications</h3>
      <p class="muted">Since predictions are winner + goal difference (not exact scores), "goals scored"
      tiebreakers can't apply; ties fall back to head-to-head then draw seeding. Third-place teams are
      allocated to bracket slots by a constraint solver consistent with FIFA's Annex C slot restrictions.
      Group fixtures are simplified to matchdays.</p>
      <a class="btn primary" href="#/home">← Back</a>
    </div>`;
}

function needPlayer() {
  return `<div class="card center">
    <h2>Pick a name first</h2>
    <p class="muted">Create or select a player on the home screen to start predicting.</p>
    <a class="btn primary" href="#/home">Go to players</a></div>`;
}

function modeBanner() {
  if (isResultsRoute()) {
    return `<div class="banner results-banner">📋 <b>OFFICIAL RESULTS MODE</b> — you are entering real tournament outcomes, not predictions.
      <a href="#/${route() === 'results-groups' ? 'groups' : 'bracket'}">Switch to my picks</a></div>`;
  }
  return state.active
    ? `<div class="banner">Predicting as <b>${esc(state.active)}</b> <a href="#/home">switch player</a></div>`
    : '';
}

// ----- actions -----

function invalidateDownstream(picks) {
  // Re-resolve until stable: drop ko picks whose winner is no longer one of the
  // two teams in that slot (covers chained invalidation through the rounds).
  for (let pass = 0; pass < 6; pass++) {
    const b = resolveBracket(picks);
    let changed = false;
    for (const [no, p] of Object.entries(picks.ko)) {
      const m = b.matches[no];
      if (!m || !m.home || !m.away || (p.w !== m.home.code && p.w !== m.away.code)) {
        delete picks.ko[no];
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function onAction(el) {
  const a = el.dataset.action;
  const picks = targetPicks();

  if (a === 'select-player') { state.active = el.dataset.name; save(); render(); return; }
  if (a === 'delete-player') {
    const name = el.dataset.name;
    if (confirm(`Delete player "${name}" and all their picks?`)) {
      delete state.players[name];
      if (state.active === name) state.active = Object.keys(state.players)[0] ?? null;
      save(); render();
    }
    return;
  }
  if (a === 'export') {
    const blob = new Blob([JSON.stringify({ players: state.players, official: state.official }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'wc26-predictions.json';
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (a === 'import') { document.getElementById('import-file').click(); return; }

  if (!picks) return;

  if (a === 'pick') {
    const key = el.dataset.key, o = el.dataset.o;
    const cur = picks.group[key];
    if (cur?.o === o) delete picks.group[key];               // tap again to clear
    else picks.group[key] = { o, gd: o === 'D' ? 0 : (cur && cur.o !== 'D' ? cur.gd : 1) };
    invalidateDownstream(picks);
    save(); render(); return;
  }
  if (a === 'group-gd') {
    const p = picks.group[el.dataset.key];
    if (p) p.gd = Math.min(MAX_GD, Math.max(1, p.gd + Number(el.dataset.delta)));
    save(); render(); return;
  }
  if (a === 'ko-pick') {
    const no = el.dataset.key, team = el.dataset.team;
    const cur = picks.ko[no];
    if (cur?.w === team) delete picks.ko[no];
    else picks.ko[no] = { w: team, gd: cur?.gd ?? 1 };
    invalidateDownstream(picks);
    save(); render(); return;
  }
  if (a === 'ko-gd') {
    const p = picks.ko[el.dataset.key];
    if (p) p.gd = Math.min(MAX_GD, Math.max(0, p.gd + Number(el.dataset.delta)));
    save(); render(); return;
  }
  if (a === 'clear-groups') {
    if (confirm('Clear every group pick (and dependent bracket picks)?')) {
      picks.group = {}; invalidateDownstream(picks); save(); render();
    }
    return;
  }
  if (a === 'clear-ko') {
    if (confirm('Clear all bracket picks?')) { picks.ko = {}; save(); render(); }
    return;
  }
}

function onSubmit(e) {
  const form = e.target.closest('[data-action="add-player-form"]');
  if (!form) return;
  e.preventDefault();
  const input = document.getElementById('new-player');
  const name = input.value.trim();
  if (!name) return;
  if (state.players[name]) { alert('That name is taken — pick another.'); return; }
  state.players[name] = emptyPicks();
  state.active = name;
  save();
  location.hash = '#/groups';
  render();
}

function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.players) throw new Error('bad file');
      if (!confirm('Replace all current players and results with the imported file?')) return;
      state.players = data.players;
      state.official = data.official ?? emptyPicks();
      state.active = Object.keys(state.players)[0] ?? null;
      save(); render();
    } catch {
      alert('Could not read that file — expected a wc26-predictions.json export.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ----- render -----

const VIEWS = {
  home: viewHome,
  groups: viewGroups,
  bracket: viewBracket,
  leaderboard: viewLeaderboard,
  'results-groups': viewGroups,
  'results-bracket': viewBracket,
  rules: viewRules,
};

function render() {
  const r = route();
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('on', a.dataset.route === r ||
      (a.dataset.route === 'results-groups' && isResultsRoute()));
  });
  document.getElementById('app').innerHTML = VIEWS[r]();
  window.scrollTo({ top: 0 });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && el.dataset.action !== 'add-player-form') onAction(el);
});
document.addEventListener('submit', onSubmit);
document.getElementById('import-file').addEventListener('change', onImportFile);

render();
