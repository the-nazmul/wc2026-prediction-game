# ⚽ World Cup 2026 Predictor

A zero-dependency prediction game for the FIFA World Cup 2026 (USA · Canada · Mexico,
11 June – 19 July 2026). Pick a name, predict every match, and battle your friends on
the leaderboard.

**Play it:** https://the-nazmul.github.io/wc2026-prediction-game/

## How it works

1. **Pick a name** — any number of players can join on the same device.
2. **Predict the group stage** — for each of the 72 group matches, pick the winner
   (or a draw) and the goal difference. Group tables compute live: 3 pts a win, 1 a draw,
   ranked by points → goal difference → head-to-head.
3. **The bracket builds itself** — per the real FIFA rules: the top two of each of the
   12 groups advance plus the **8 best third-placed teams**, slotted into the official
   Round of 32 match plan (matches 73–88, including the restricted third-place slots).
4. **Call the knockouts** — Round of 32 → Round of 16 → quarter-finals → semi-finals →
   third-place match → final → champion. Goal difference 0 in a knockout means level
   after extra time, through on penalties.
5. **Score it** — as the real tournament plays out, enter outcomes under **Results**,
   and the leaderboard ranks everyone:

   | Points | For |
   |---|---|
   | **1** | correct group-match result (winner or draw) |
   | **+0.5** | exact goal difference on a correctly-called win |
   | **1** | each knockout match (by official match number) whose winner you called |
   | **+0.5** | same two teams in that tie *and* the exact goal difference |

   Maximum: 72 × 1.5 + 32 × 1.5 = **156 points**.

## Data & storage

- Teams and groups follow the December 2025 final draw with the March 2026 playoff
  winners (Czechia, Bosnia-Herzegovina, Türkiye, Sweden, Iraq, DR Congo).
- All picks live in your browser's `localStorage` — use **Export/Import** on the home
  screen to back up or move a game between devices.

## Simplifications

- Predictions are winner + goal difference (not exact scores), so "goals scored"
  tiebreakers can't apply; ties fall back to head-to-head, then draw seeding.
- Third-place teams are allocated to bracket slots by a constraint solver consistent
  with the slot restrictions in FIFA's Annex C (all 495 qualification combinations are
  covered — see the test suite).
- Group fixtures are simplified to matchdays (no kickoff times or venues).

## Development

No build step — plain HTML/CSS/JS (ES modules).

```sh
node dev-server.mjs 4173   # serve locally at http://127.0.0.1:4173
node tests/logic.test.mjs  # run the tournament-engine tests
```

Unofficial fan project — not affiliated with FIFA.
