// UI: hash-routed views over localStorage state. No dependencies.

import {
  GROUP_IDS, TEAMS, groupFixtures, ALL_GROUP_FIXTURES, R32_SLOTS, slotLabel,
  BRACKET_DISPLAY, ROUND_NAMES,
} from './data.js';
import {
  emptyPicks, computeTable, resolveBracket, scorePlayer,
  mergedPicks, isGroupLocked, isKoLocked,
} from './logic.js';
import { syncResults } from './results.js';

const LS_KEY = 'wc26-predictor';
const TOTAL_GROUP = 72;
const TOTAL_KO = 32;
const MAX_GD = 9;
const SYNC_EVERY = 30 * 60 * 1000;

// ----- state -----

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      players: raw.players ?? {},
      official: raw.official ?? emptyPicks(),
      scores: raw.scores ?? {},
      sync: raw.sync ?? { at: 0, ok: null },
      active: raw.active ?? null,
    };
  } catch {
    return { players: {}, official: emptyPicks(), scores: {}, sync: { at: 0, ok: null }, active: null };
  }
}

const state = load();
let syncing = false;

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    players: state.players, official: state.official,
    scores: state.scores, sync: state.sync, active: state.active,
  }));
}

function activePicks() {
  return state.active ? state.players[state.active] : null;
}

function targetPicks() {
  return isResultsRoute() ? state.official : activePicks();
}

// ----- results sync -----

async function doSync() {
  if (syncing) return;
  syncing = true;
  render();
  try {
    const { finals, live } = await syncResults(state);
    state.sync = { at: Date.now(), ok: true, finals, live };
  } catch (err) {
    state.sync = { ...state.sync, ok: false };
    console.warn('results sync failed:', err);
  }
  syncing = false;
  save();
  render();
}

function maybeAutoSync() {
  if (navigator.onLine !== false && Date.now() - (state.sync.at || 0) > SYNC_EVERY) doSync();
}

function ago(ts) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function syncLine() {
  if (syncing) return '<span class="sync-line">syncing live results…</span>';
  if (state.sync.ok === false) return `<span class="sync-line err">results sync failed · <button class="linklike" data-action="sync">retry</button></span>`;
  const finals = Object.values(state.official.group).length + Object.values(state.official.ko).length;
  return `<span class="sync-line">${finals} results auto-synced · ${ago(state.sync.at)} · <button class="linklike" data-action="sync">refresh</button></span>`;
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

// Player views are reality-anchored: played matches show official results,
// predictions fill the rest. Official (results mode) picks pass through as-is.
function viewPicks(picks) {
  return picks === state.official ? picks : mergedPicks(picks, state.official);
}

// Progress denominators exclude matches that locked before this player picked
// them — they can never be filled in, and that's fine.
function progress(rawPicks) {
  const isOfficial = rawPicks === state.official;
  const now = Date.now();
  let g = 0, gT = 0;
  for (const m of ALL_GROUP_FIXTURES) {
    if (rawPicks.group[m.id]) { g++; gT++; }
    else if (isOfficial || !isGroupLocked(m.id, now)) gT++;
  }
  const b = resolveBracket(viewPicks(rawPicks));
  let k = 0, kT = 0;
  for (let no = 73; no <= 104; no++) {
    if (rawPicks.ko[no] && b.matches[no].winner) { k++; kT++; }
    else if (isOfficial || !isKoLocked(no, now)) kT++;
  }
  return { g, gT, k, kT };
}

// In results mode a match locks once the API has its final score (authoritative);
// in player mode it locks at real-world kickoff.
function groupEditable(fid) {
  if (isResultsRoute()) return state.scores[fid]?.state !== 'post';
  return !isGroupLocked(fid, Date.now());
}

function koEditable(no) {
  if (isResultsRoute()) return state.scores[`M${no}`]?.state !== 'post';
  return !isKoLocked(no, Date.now());
}

function scoreChip(meta) {
  if (!meta) return '';
  const live = meta.state === 'in';
  return `<span class="ft ${live ? 'live' : ''}">${live ? 'LIVE' : 'FT'} ${meta.hs}–${meta.as}</span>`;
}

// tick/cross for a player's settled pick
function verdictMark(pick, official) {
  if (!pick || !official || isResultsRoute()) return '';
  const hit = pick.o === official.o;
  return `<span class="mark ${hit ? 'ok' : 'no'}">${hit ? '✓' : '✗'}</span>`;
}

// ----- views -----

function viewHome() {
  const players = Object.keys(state.players);

  const rows = players.map(name => {
    const p = progress(state.players[name]);
    const b = resolveBracket(viewPicks(state.players[name]));
    const s = scorePlayer(state.players[name], state.official);
    return `
      <tr class="${state.active === name ? 'sel' : ''}">
        <td><button class="linklike strong" data-action="select-player" data-name="${esc(name)}">${esc(name)}</button></td>
        <td class="num">${p.g}<span class="of">/${p.gT}</span></td>
        <td class="num">${p.k}<span class="of">/${p.kT}</span></td>
        <td>${b.champion ? `${b.champion.flag} ${esc(b.champion.name)}` : '<span class="of">—</span>'}</td>
        <td class="num strong">${s.total}</td>
        <td class="num"><button class="icon-btn" data-action="delete-player" data-name="${esc(name)}" title="Remove">✕</button></td>
      </tr>`;
  }).join('');

  return `
    <div class="masthead">
      <h1>Predict the World Cup.</h1>
      <p>Call all 104 matches, group stage to final. Best bracket wins.</p>
    </div>
    <form class="join" data-action="add-player-form">
      <input id="new-player" type="text" maxlength="20" placeholder="Your name" autocomplete="off" />
      <button type="submit" class="btn primary">Play</button>
    </form>
    ${players.length ? `
    <div class="panel">
      <table class="tbl">
        <thead><tr><th>Player</th><th class="num">Groups</th><th class="num">Bracket</th><th>Champion</th><th class="num">Pts</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="foot-line">${state.active ? `Picking as <b>${esc(state.active)}</b> — tap a name to switch.` : 'Tap a name to start picking.'}</p>` : ''}
    <p class="foot-line">${syncLine()}</p>
    <p class="foot-line"><button class="linklike" data-action="export">Export</button> · <button class="linklike" data-action="import">Import</button> · <a href="#/rules">Scoring</a></p>`;
}

function gdControl(key, gd, kind, editable) {
  const label = kind === 'ko' && gd === 0 ? 'PSO' : `+${gd}`;
  if (!editable) return `<span class="gd-static">${label}</span>`;
  return `
    <span class="gd">
      <button class="gd-btn" data-action="${kind}-gd" data-key="${key}" data-delta="-1" ${gd <= (kind === 'ko' ? 0 : 1) ? 'disabled' : ''}>−</button>
      <span class="gd-val">${label}</span>
      <button class="gd-btn" data-action="${kind}-gd" data-key="${key}" data-delta="1" ${gd >= MAX_GD ? 'disabled' : ''}>+</button>
    </span>`;
}

function viewGroups() {
  const picks = targetPicks();
  if (!picks) return needPlayer();
  const results = isResultsRoute();

  const cards = GROUP_IDS.map(g => {
    const { teams, complete } = computeTable(g, viewPicks(picks));

    const matchRows = groupFixtures(g).map(m => {
      const p = picks.group[m.id];
      const h = TEAMS[m.home], a = TEAMS[m.away];
      const editable = groupEditable(m.id);
      const meta = state.scores[m.id];
      const off = state.official.group[m.id];
      const sel = (o) => p?.o === o ? 'sel' : '';
      const dis = editable ? '' : 'disabled';
      const right = !editable || (meta && !results)
        ? `${scoreChip(meta)}${off?.o ? verdictMark(p, off) : ''}${!meta && !editable ? '<span class="gd-static">⏱</span>' : ''}`
        : (p && p.o !== 'D' ? gdControl(m.id, p.gd, 'group', true) : '');
      return `
        <div class="mrow ${editable ? '' : 'locked'}">
          <button class="side h ${sel('H')}" data-action="pick" data-key="${m.id}" data-o="H" ${dis}>${h.flag} ${esc(h.name)}</button>
          <button class="side d ${sel('D')}" data-action="pick" data-key="${m.id}" data-o="D" ${dis}>=</button>
          <button class="side a ${sel('A')}" data-action="pick" data-key="${m.id}" data-o="A" ${dis}>${esc(a.name)} ${a.flag}</button>
          <span class="mright">${right}</span>
        </div>`;
    }).join('');

    const tableRows = teams.map((t, i) => `
      <tr class="${i < 2 ? 'q1' : i === 2 ? 'q3' : ''}">
        <td class="pos">${i + 1}</td><td>${t.flag} ${esc(t.name)}</td>
        <td class="num">${t.pts}</td><td class="num">${t.gd > 0 ? '+' : ''}${t.gd}</td>
      </tr>`).join('');

    return `
      <section class="gcard ${complete ? 'done' : ''}">
        <header><span>Group ${g}</span>${complete ? '<i class="dot"></i>' : ''}</header>
        <div class="mlist">${matchRows}</div>
        <table class="tbl mini">
          <tbody>${tableRows}</tbody>
        </table>
      </section>`;
  }).join('');

  const { g, gT } = progress(picks);
  return `
    ${modeBar()}
    <div class="stage-head">
      <h2>${results ? 'Group results' : 'Group stage'}</h2>
      <span class="count">${g}/${gT}</span>
      ${results ? syncLine() : ''}
      <span class="spacer"></span>
      <button class="linklike" data-action="clear-groups">clear</button>
    </div>
    ${g === 0 && !results ? '<p class="hint">Tap a team to pick the winner — <b>=</b> for a draw — then set the goal margin. Played matches show real scores and are locked.</p>' : ''}
    <div class="ggrid">${cards}</div>
    ${g === gT ? `<p class="next"><a class="btn primary" href="#/${results ? 'results-bracket' : 'bracket'}">Bracket →</a></p>` : ''}`;
}

function thirdsPanel(bracket) {
  if (!bracket.thirdsRank) return '';
  const rows = bracket.thirdsRank.map((t, i) => `
    <tr class="${i < 8 ? 'q3' : 'out'}">
      <td class="pos">${i + 1}</td><td>${t.flag} ${esc(t.name)} <span class="of">${t.group}</span></td>
      <td class="num">${t.pts}</td><td class="num">${t.gd > 0 ? '+' : ''}${t.gd}</td>
    </tr>`).join('');
  return `
    <details class="panel thirds">
      <summary>Best thirds — top 8 advance</summary>
      <table class="tbl mini"><tbody>${rows}</tbody></table>
    </details>`;
}

function koMatchCard(m, slotDef, officialBracket) {
  let phH = 'TBD', phA = 'TBD';
  if (slotDef) { phH = slotLabel(slotDef.home); phA = slotLabel(slotDef.away); }
  else if (m.no === 103) { phH = 'Loser SF 1'; phA = 'Loser SF 2'; }
  else if (m.no === 104) { phH = 'Winner SF 1'; phA = 'Winner SF 2'; }

  const editable = koEditable(m.no);
  const results = isResultsRoute();
  const off = state.official.ko[m.no];
  const meta = state.scores[`M${m.no}`];

  // show the real score only when this bracket's tie is the real tie
  const om = officialBracket?.matches[m.no];
  const samePair = m.home && m.away && om?.home && om?.away &&
    [m.home.code, m.away.code].sort().join() === [om.home.code, om.away.code].sort().join();

  const side = (t, ph) => {
    if (!t) return `<div class="ko-team empty">${esc(ph)}</div>`;
    const isW = m.winner?.code === t.code;
    return `<button class="ko-team ${isW ? 'won' : ''} ${m.winner && !isW ? 'lost' : ''}"
      data-action="ko-pick" data-key="${m.no}" data-team="${t.code}" ${editable ? '' : 'disabled'}>
      <span>${t.flag}</span><span class="tn">${esc(t.name)}</span></button>`;
  };

  let foot = '';
  if ((samePair || results) && meta) {
    foot = `${scoreChip(meta)}${off && off.gd === 0 ? '<span class="of">pens</span>' : ''}`;
    if (!results && off && m.winner) foot += `<span class="mark ${m.winner.code === off.w ? 'ok' : 'no'}">${m.winner.code === off.w ? '✓' : '✗'}</span>`;
  } else if (m.winner && editable) {
    foot = gdControl(m.no, m.gd, 'ko', true);
  } else if (m.winner) {
    foot = `<span class="gd-static">${m.gd === 0 ? 'PSO' : '+' + m.gd}</span>`;
  }

  return `
    <div class="ko-match ${editable ? '' : 'locked'}">
      <i class="ko-no">${m.no}</i>
      ${side(m.home, phH)}
      ${side(m.away, phA)}
      <div class="ko-foot">${foot}</div>
    </div>`;
}

function viewBracket() {
  const picks = targetPicks();
  if (!picks) return needPlayer();
  const results = isResultsRoute();
  const b = resolveBracket(viewPicks(picks));
  const ob = results ? b : resolveBracket(state.official);
  const slotById = Object.fromEntries(R32_SLOTS.map(s => [s.id, s]));

  const col = (key, nos) => `
    <div class="ko-col">
      <h4>${ROUND_NAMES[key]}</h4>
      <div class="ko-stack">${nos.map(no => koMatchCard(b.matches[no], key === 'r32' ? slotById[no] : null, ob)).join('')}</div>
    </div>`;

  const finals = `
    <div class="ko-col">
      <h4>Final</h4>
      <div class="ko-stack">
        ${koMatchCard(b.matches[104], null, ob)}
        <div class="champ ${b.champion ? 'has' : ''}">
          <i>Champion</i>
          <b>${b.champion ? `${b.champion.flag} ${esc(b.champion.name)}` : '—'}</b>
        </div>
        <h4>Third place</h4>
        ${koMatchCard(b.matches[103], null, ob)}
      </div>
    </div>`;

  const { k, kT } = progress(picks);
  return `
    ${modeBar()}
    <div class="stage-head">
      <h2>${results ? 'Knockout results' : 'Bracket'}</h2>
      <span class="count">${k}/${kT}</span>
      ${results ? syncLine() : ''}
      <span class="spacer"></span>
      <button class="linklike" data-action="clear-ko">clear</button>
    </div>
    ${b.groupsComplete ? '' : `<p class="hint">Complete all 72 group ${results ? 'results' : 'picks'} to unlock the third-place slots.</p>`}
    ${thirdsPanel(b)}
    <div class="bwrap"><div class="bracket">
      ${col('r32', BRACKET_DISPLAY.r32)}
      ${col('r16', BRACKET_DISPLAY.r16)}
      ${col('qf', BRACKET_DISPLAY.qf)}
      ${col('sf', BRACKET_DISPLAY.sf)}
      ${finals}
    </div></div>`;
}

function viewLeaderboard() {
  const players = Object.keys(state.players);
  if (!players.length) return `${modeBar()}<p class="hint">No players yet — <a href="#/home">add a name</a>.</p>`;

  const scored = Object.keys(state.official.group).length + Object.keys(state.official.ko).length;
  const rows = players
    .map(name => ({ name, s: scorePlayer(state.players[name], state.official) }))
    .sort((x, y) => y.s.total - x.s.total)
    .map((r, i) => `
      <tr class="${i === 0 && r.s.total > 0 ? 'lead' : ''}">
        <td class="pos">${i + 1}</td>
        <td class="strong">${esc(r.name)}</td>
        <td class="num">${r.s.groupPts}</td><td class="num">${r.s.groupGd}</td>
        <td class="num">${r.s.koPts}</td><td class="num">${r.s.koGd}</td>
        <td class="num total">${r.s.total}</td>
      </tr>`).join('');

  return `
    <div class="stage-head"><h2>Leaderboard</h2><span class="count">${scored} matches scored</span>
      <span class="spacer"></span>${syncLine()}</div>
    <div class="panel">
      <table class="tbl">
        <thead><tr><th></th><th>Player</th><th class="num">Result</th><th class="num">+GD</th><th class="num">KO</th><th class="num">+GD</th><th class="num">Pts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function viewRules() {
  return `
    <div class="stage-head"><h2>Scoring</h2></div>
    <div class="panel pad">
      <table class="tbl rules-tbl">
        <tbody>
          <tr><td class="num strong">1</td><td>correct group-match result — winner or draw</td></tr>
          <tr><td class="num strong">+0.5</td><td>exact goal margin on a correctly-called win</td></tr>
          <tr><td class="num strong">1</td><td>knockout match whose winner you called (by official match number)</td></tr>
          <tr><td class="num strong">+0.5</td><td>same two teams in that tie and the exact margin (0 = penalties)</td></tr>
        </tbody>
      </table>
      <p class="hint">Max 156. Top two per group advance plus the 8 best thirds, slotted by the
      official FIFA match plan. Results sync automatically from the live tournament feed;
      a match locks for picks at kickoff. Margin-only predictions can't use goals-scored
      tiebreakers — ties fall back to head-to-head, then draw seeding.</p>
    </div>`;
}

function needPlayer() {
  return `<p class="hint">Pick a name first — <a href="#/home">add a player</a>.</p>`;
}

function modeBar() {
  if (isResultsRoute()) {
    return `<div class="modebar results">OFFICIAL RESULTS — synced matches are locked; enter the rest by hand
      <a href="#/${route() === 'results-groups' ? 'groups' : 'bracket'}">my picks →</a></div>`;
  }
  return state.active
    ? `<div class="modebar">${esc(state.active)} <a href="#/home">switch</a></div>`
    : '';
}

// ----- actions -----

function invalidateDownstream(picks) {
  for (let pass = 0; pass < 6; pass++) {
    const b = resolveBracket(viewPicks(picks));
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
    if (confirm(`Remove ${name} and all their picks?`)) {
      delete state.players[name];
      if (state.active === name) state.active = Object.keys(state.players)[0] ?? null;
      save(); render();
    }
    return;
  }
  if (a === 'sync') { doSync(); return; }
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
    const key = el.dataset.key;
    if (!groupEditable(key)) return;
    const o = el.dataset.o;
    const cur = picks.group[key];
    if (cur?.o === o) delete picks.group[key];
    else picks.group[key] = { o, gd: o === 'D' ? 0 : (cur && cur.o !== 'D' ? cur.gd : 1) };
    invalidateDownstream(picks);
    save(); render(); return;
  }
  if (a === 'group-gd') {
    if (!groupEditable(el.dataset.key)) return;
    const p = picks.group[el.dataset.key];
    if (p) p.gd = Math.min(MAX_GD, Math.max(1, p.gd + Number(el.dataset.delta)));
    save(); render(); return;
  }
  if (a === 'ko-pick') {
    const no = el.dataset.key;
    if (!koEditable(no)) return;
    const team = el.dataset.team;
    const cur = picks.ko[no];
    if (cur?.w === team) delete picks.ko[no];
    else picks.ko[no] = { w: team, gd: cur?.gd ?? 1 };
    invalidateDownstream(picks);
    save(); render(); return;
  }
  if (a === 'ko-gd') {
    if (!koEditable(el.dataset.key)) return;
    const p = picks.ko[el.dataset.key];
    if (p) p.gd = Math.min(MAX_GD, Math.max(0, p.gd + Number(el.dataset.delta)));
    save(); render(); return;
  }
  if (a === 'clear-groups') {
    if (confirm('Clear group picks? Locked (played) matches are kept.')) {
      for (const id of Object.keys(picks.group)) {
        if (groupEditable(id)) delete picks.group[id];
      }
      invalidateDownstream(picks); save(); render();
    }
    return;
  }
  if (a === 'clear-ko') {
    if (confirm('Clear bracket picks? Locked (played) matches are kept.')) {
      for (const no of Object.keys(picks.ko)) {
        if (koEditable(no)) delete picks.ko[no];
      }
      save(); render();
    }
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
  if (state.players[name]) { alert('That name is taken.'); return; }
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
      if (!confirm('Replace all current players with the imported file?')) return;
      state.players = data.players;
      state.active = Object.keys(state.players)[0] ?? null;
      save(); render();
    } catch {
      alert('Not a wc26-predictions.json export.');
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
  document.querySelectorAll('.nav a').forEach(x => {
    x.classList.toggle('on', x.dataset.route === r ||
      (x.dataset.route === 'results-groups' && isResultsRoute()));
  });
  document.getElementById('app').innerHTML = VIEWS[r]();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && el.dataset.action !== 'add-player-form') onAction(el);
});
document.addEventListener('submit', onSubmit);
document.getElementById('import-file').addEventListener('change', onImportFile);

render();
maybeAutoSync();
