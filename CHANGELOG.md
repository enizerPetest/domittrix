# Changelog

## 3.0.0 — Arcade update

- Replaced the two-card mini-game placeholder with a searchable, filterable 30-game arcade.
- Added game detail screens, controls, instructions, per-device best records and round counters.
- Implemented touch controls for the tile-upgrade, slide and snake modes.
- Added local hot-seat modes for Connect Four, Mines Duel and Case Battles, plus a local UNO-style bot match.
- Added free-play versions of chance-themed games without betting, chips, balances, purchases, deposits, payouts or cash-outs.
- Kept community accounts, Minecraft IGN profile field, server-stored chat and admin moderation.
- Added a `games.js` syntax check to `npm run check`.

## 4.1 — Arcade records and leaderboard ordering

- Added a persisted `lower_is_better` mode to each personal game record, including a safe SQLite migration for existing installations.
- Personal stats now expose the record direction so the UI can label or compare best scores correctly.
- Leaderboards now sort low-score games ascending and high-score games descending after wins, instead of incorrectly treating every score as higher-is-better.
- Wallet remains a presentation-only shell; no balance or transfer endpoints were added.


## 4.2 — Arcade integrity
- Score direction is now enforced by the server for move-count games; client-supplied flags can no longer change leaderboard ordering.
- Kept all game records in free-play mode with no stakes, deposits, or payouts.

## 4.3.0
- Fixed leaderboard labels: single-player games show best scores, while online room games show wins.
- Standardized daily Keno and Daily Race seeds on the UTC date so the daily layout is consistent across time zones.
- Added browser security headers and disabled caching for API responses.
- Expired chat throttle entries are now cleaned up with the authentication limiter.
