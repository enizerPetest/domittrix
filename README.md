# DonutTrix Community + Arcade 4.3

A Node.js community site with real server-backed accounts and chat, a moderator panel, and **30 playable free-play mini-games** inspired by the user's DonutFlip screenshot gallery. The visual design is original DonutTrix purple/blue styling rather than a copy of the reference site.

## Included games

1. Mines
2. Cases (fixed display-case matching puzzle)
3. Case Battles (two-player hot-seat score challenge)
4. Flip
5. Blackjack
6. Dice
7. Towers
8. Mines Duel (two-player hot-seat)
9. Coinflip
10. Crash (timing/survival challenge)
11. UNO-style card match against a simple bot
12. Connect Four (two-player hot-seat)
13. Floor is Lava
14. Draw (canvas sketch pad)
15. Rock Paper Scissors
16. Stripmine
17. Upgrader (2048-style tile merge)
18. Limbo (number guessing puzzle)
19. Plinko
20. Hilo
21. Double (odd/even)
22. Roulette (color prediction)
23. Pig Race
24. Stocks (fictional chart prediction only)
25. Slide (15-puzzle)
26. Chicken (lane-crossing game)
27. Keno (daily number-pattern puzzle)
28. Blitz (15-second reflex grid)
29. Snakes
30. Daily Race (same deterministic course for everyone on the same local date)

Personal bests and play counts sync to the signed-in account in SQLite (browser local storage remains as a fallback). Record direction is stored per game so lower-is-better challenges rank correctly. Room-code online multiplayer is available for Connect Four, UNO, Mines Duel and Case Battles; the server checks turns, moves and card ownership, and UNO hands remain private to each player. The server tracks wins for these four online modes. Scores are not balances and cannot be transferred, purchased, wagered or withdrawn. The games do not connect to Minecraft, DonutSMP, real-money accounts, payment providers or a bot. Chance-themed games are free prediction/arcade exercises only and contain no betting interface, chips or payout system.

## Wallet screen

The wallet tab is a visual-only dashboard placeholder. It does not display a fabricated balance, accept deposits or withdrawals, or move funds. Connect only a separately verified and appropriate service if you later choose to build a real account feature.

## Community features

- Account registration and login; passwords are hashed with bcrypt.
- Profile with optional Minecraft IGN text field.
- Server-backed arcade records and online wins leaderboard.
- Shared chat stored in SQLite.
- Admin panel for suspending/restoring ordinary accounts and deleting chat messages.
- Responsive desktop and mobile layout.

## Requirements

- Node.js 20.6 or newer (Node.js 22 LTS recommended).
- Windows PowerShell, macOS Terminal or Linux shell.

## Start on Windows

1. Extract the `DonutTrix` folder.
2. Open PowerShell in that folder.
3. Install packages:

   ```powershell
   npm install
   ```

4. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Generate a private session secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. Open `.env`, set `SESSION_SECRET` to the generated value, and set `ADMIN_USER` to the username you want to use for the administrator account. Keep `.env` private.
7. Run the source checks:

   ```powershell
   npm run check
   ```

8. Start the site:

   ```powershell
   npm start
   ```

9. Open `http://localhost:3000`. Register an account whose username exactly matches `ADMIN_USER` to receive the administrator role.

## Admin panel

The administrator account can open **Profile → Admin panel** or visit `/admin.html` while signed in. It can view members, suspend/restore ordinary accounts, and remove chat messages. It cannot impersonate users or view passwords.

To change the configured admin username, edit `ADMIN_USER` in `.env`, restart the server, and sign in with that account.

## Data and hosting

The server creates `donuttrix.db` beside `server.js`; it stores accounts, profile IGN values, chat messages, game records and online room state. Back up this file before moving or updating the project. Online multiplayer requires the site to be reachable by both players over the same public HTTPS/HTTP host; `localhost` only works on the same device. The room-code games poll the server once per second while open. API responses are not cached, and basic browser security headers are enabled.

For an internet-facing deployment, use a Node.js host with persistent storage, configure HTTPS, set `NODE_ENV=production`, and keep `.env` and `donuttrix.db` private. Do not use a temporary filesystem for the database. Never ask users for their Microsoft password or Minecraft session token.

## Checks

```powershell
npm run check
npm test
npm start
```

### Arcade records

Leaderboard score direction is controlled by the server. Move-count records use lower-is-better ordering; other arcade records use higher-is-better ordering. Client requests cannot override this rule. Single-player leaderboards display best scores; online room leaderboards display wins. Daily puzzle layouts use a UTC date key so players in different time zones receive the same daily pattern.
