'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('cookie-session');
const path = require('path');
const { MULTIPLAYER_GAMES, RECORD_GAMES, LOWER_SCORE_GAMES } = require('./lib/arcade-rules');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = String(process.env.ADMIN_USER || '').trim().toLowerCase();
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET is missing or too short. Put a random value of at least 32 characters in .env.');
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

const ROOT = __dirname;
const db = new Database(path.join(ROOT, 'donuttrix.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  pass TEXT NOT NULL,
  ign TEXT,
  admin INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS chat_id_idx ON chat(id);
CREATE TABLE IF NOT EXISTS game_records (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  best REAL,
  plays INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  lower_is_better INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, game)
);
CREATE TABLE IF NOT EXISTS game_rooms (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  game TEXT NOT NULL,
  host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  state_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS game_rooms_status_idx ON game_rooms(status, updated_at);
`);

// Migrate an earlier DonutTrix database without exposing its old wallet fields.
const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map(column => column.name));
const recordColumns = new Set(db.prepare('PRAGMA table_info(game_records)').all().map(column => column.name));
if (!recordColumns.has('lower_is_better')) db.exec('ALTER TABLE game_records ADD COLUMN lower_is_better INTEGER NOT NULL DEFAULT 0');
if (!userColumns.has('banned')) db.exec('ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
if (!userColumns.has('created_at')) {
  db.exec('ALTER TABLE users ADD COLUMN created_at TEXT');
  db.exec("UPDATE users SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL");
}
if (ADMIN_USER) {
  db.prepare('UPDATE users SET admin=1 WHERE lower(name)=?').run(ADMIN_USER);
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(express.json({ limit: '12kb' }));
app.use(session({
  name: 'donuttrix_session',
  keys: [SESSION_SECRET],
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}));
app.use(express.static(path.join(ROOT, 'public')));

const bad = (res, message, status = 400) => res.status(status).json({ error: message });
const auth = (req, res, next) => {
  const id = req.session && Number(req.session.uid);
  const user = Number.isSafeInteger(id) && id > 0
    ? db.prepare('SELECT id,name,ign,admin,banned,created_at FROM users WHERE id=?').get(id)
    : null;
  if (!user) return bad(res, 'Please log in first.', 401);
  if (user.banned) {
    req.session = null;
    return bad(res, 'This account has been suspended.', 403);
  }
  req.user = user;
  next();
};
const adminOnly = (req, res, next) => req.user.admin ? next() : bad(res, 'Admins only.', 403);

const attempts = new Map();
function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = attempts.get(key);
  if (!bucket || now - bucket.started > 15 * 60 * 1000) {
    bucket = { started: now, count: 0 };
    attempts.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > 20) return bad(res, 'Too many attempts. Try again in 15 minutes.', 429);
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of attempts) {
    if (now - bucket.started > 15 * 60 * 1000) attempts.delete(key);
  }
  for (const [userId, sentAt] of chatLastSent) {
    if (now - sentAt > 60 * 60 * 1000) chatLastSent.delete(userId);
  }
}, 5 * 60 * 1000).unref();

// Accounts
app.post('/api/register', authRateLimit, (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  const password = String((req.body || {}).password || '');
  if (!/^\w{3,20}$/.test(name) || password.length < 8 || password.length > 72) {
    return bad(res, 'Username: 3-20 letters, numbers or underscores. Password: 8-72 characters.');
  }
  try {
    const isAdmin = ADMIN_USER && name.toLowerCase() === ADMIN_USER ? 1 : 0;
    const result = db.prepare('INSERT INTO users(name,pass,admin) VALUES(?,?,?)')
      .run(name, bcrypt.hashSync(password, 12), isAdmin);
    req.session.uid = Number(result.lastInsertRowid);
    res.json({ ok: true });
  } catch (error) {
    if (String(error.code || '').startsWith('SQLITE_CONSTRAINT')) return bad(res, 'That username is already taken.');
    console.error('[register]', error);
    bad(res, 'Could not create the account.', 500);
  }
});

app.post('/api/login', authRateLimit, (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  const password = String((req.body || {}).password || '');
  const user = db.prepare('SELECT id,pass,banned FROM users WHERE lower(name)=lower(?)').get(name);
  if (!user || !bcrypt.compareSync(password, user.pass)) return bad(res, 'Wrong username or password.', 401);
  if (user.banned) return bad(res, 'This account has been suspended.', 403);
  req.session.uid = user.id;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    ign: req.user.ign || '',
    admin: !!req.user.admin,
    createdAt: req.user.created_at,
  });
});

app.post('/api/profile', auth, (req, res) => {
  const ign = String((req.body || {}).ign || '').trim();
  if (ign && !/^[A-Za-z0-9_]{3,16}$/.test(ign)) {
    return bad(res, 'Minecraft username must be 3-16 letters, numbers or underscores.');
  }
  db.prepare('UPDATE users SET ign=? WHERE id=?').run(ign || null, req.user.id);
  res.json({ ok: true });
});

// Community chat
const chatLastSent = new Map();
app.get('/api/chat', auth, (req, res) => {
  const messages = db.prepare(`
    SELECT chat.id, users.name, chat.text, chat.at
    FROM chat JOIN users ON users.id=chat.user_id
    ORDER BY chat.id DESC LIMIT 60
  `).all().reverse();
  res.json({ messages });
});

app.post('/api/chat', auth, (req, res) => {
  const message = String((req.body || {}).text || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 300);
  if (!message) return bad(res, 'Message is empty.');
  const now = Date.now();
  const previous = chatLastSent.get(req.user.id) || 0;
  if (now - previous < 900) return bad(res, 'Wait a moment before sending another message.', 429);
  chatLastSent.set(req.user.id, now);
  db.prepare('INSERT INTO chat(user_id,text) VALUES(?,?)').run(req.user.id, message);
  const old = db.prepare('SELECT id FROM chat ORDER BY id DESC LIMIT 1 OFFSET 500').get();
  if (old) db.prepare('DELETE FROM chat WHERE id<=?').run(old.id);
  res.json({ ok: true });
});

// Server-backed free-play arcade: personal records and authoritative two-player rooms.
// Score direction is defined by the server; clients cannot manipulate leaderboard ordering.
const getUser = id => db.prepare('SELECT id,name FROM users WHERE id=?').get(id);
const getRoom = code => db.prepare('SELECT * FROM game_rooms WHERE code=?').get(String(code || '').toUpperCase());
const randomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i=0;i<6;i++) out += alphabet[Math.floor(Math.random()*alphabet.length)];
  return out;
};
const shuffled = input => {
  const a = [...input];
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
};
function newRoomState(game) {
  if (game === 'connect-four') return { grid:Array(42).fill(0), turn:0, moves:0, winner:null };
  if (game === 'mines-duel') {
    const mines = new Set(); while (mines.size < 6) mines.add(Math.floor(Math.random()*25));
    return { mines:[...mines], revealed:{}, scores:[0,0], turn:0, winner:null };
  }
  if (game === 'case-battles') {
    const deck = shuffled(['🔷','🔷','🟣','🟢','🟡','🔴','🟠','🟣','🟢','🟡']);
    return { deck, target:'🔷', revealed:{}, scores:[0,0], turn:0, winner:null };
  }
  if (game === 'uno') {
    const colors=['red','blue','green','yellow'];
    const cards=[]; let id=1;
    for (const color of colors) for (let copy=0;copy<2;copy++) for (let n=0;n<10;n++) cards.push({id:id++,color,value:String(n)});
    for (const color of colors) cards.push({id:id++,color,value:'skip'});
    const deck=shuffled(cards);
    return { hands:[deck.splice(0,7),deck.splice(0,7)], drawPile:deck, discard:[deck.pop()], turn:0, winner:null };
  }
  throw new Error('Unsupported multiplayer game.');
}
function roomView(room, userId) {
  const state=JSON.parse(room.state_json);
  const players=[getUser(room.host_id), room.guest_id ? getUser(room.guest_id) : null];
  const seat=room.host_id===userId?0:room.guest_id===userId?1:-1;
  if (seat<0) return null;
  const view={game:room.game, status:room.status, code:room.code, version:room.version,
    seat, turn:state.turn, winner:state.winner, players:players.map(p=>p?.name||null)};
  if (room.game==='connect-four') Object.assign(view,{grid:state.grid,moves:state.moves});
  if (room.game==='mines-duel') Object.assign(view,{revealed:state.revealed,scores:state.scores});
  if (room.game==='case-battles') Object.assign(view,{revealed:state.revealed,scores:state.scores,total:state.deck.length});
  if (room.game==='uno') Object.assign(view,{hand:state.hands[seat],otherCount:state.hands[1-seat].length,top:state.discard[state.discard.length-1],discardCount:state.discard.length});
  return view;
}
function sendRoom(res, room, userId) {
  const view=roomView(room,userId);
  if (!view) return bad(res,'You are not a member of this room.',403);
  res.json({room:view});
}
function checkConnectWin(grid,row,col,player) {
  for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    let count=1;
    for (const sign of [-1,1]) {
      let y=row+dr*sign,x=col+dc*sign;
      while(y>=0&&y<6&&x>=0&&x<7&&grid[y*7+x]===player){count++;y+=dr*sign;x+=dc*sign;}
    }
    if(count>=4)return true;
  }
  return false;
}
function finishRoom(room, state, winnerSeat) {
  state.winner=winnerSeat;
  room.status='finished';
  const ids=[room.host_id,room.guest_id];
  const update=db.prepare(`INSERT INTO game_records(user_id,game,best,plays,wins,updated_at)
    VALUES(?,?,?,1,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id,game) DO UPDATE SET plays=plays+1,wins=wins+excluded.wins,updated_at=CURRENT_TIMESTAMP`);
  ids.forEach((id,seat)=>{ if(id) update.run(id,room.game,winnerSeat===seat?1:0,winnerSeat===seat?1:0); });
}
app.get('/api/games/stats', auth, (req,res) => {
  const rows=db.prepare('SELECT game,best,plays,wins,lower_is_better AS lowerIsBetter,updated_at FROM game_records WHERE user_id=? ORDER BY game').all(req.user.id);
  res.json({records:rows});
});
app.post('/api/games/records', auth, (req,res) => {
  const body=req.body||{}; const game=String(body.game||''); const score=Number(body.score); const lower=LOWER_SCORE_GAMES.has(game);
  if(!RECORD_GAMES.has(game)||!Number.isFinite(score)||Math.abs(score)>1000000) return bad(res,'Invalid game record.');
  db.prepare(`INSERT INTO game_records(user_id,game,best,plays,lower_is_better,updated_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id,game) DO UPDATE SET
      best=CASE WHEN game_records.best IS NULL
        OR (excluded.lower_is_better=1 AND excluded.best<game_records.best)
        OR (excluded.lower_is_better=0 AND excluded.best>game_records.best)
        THEN excluded.best ELSE game_records.best END,
      lower_is_better=CASE WHEN game_records.best IS NULL
        OR (excluded.lower_is_better=1 AND excluded.best<game_records.best)
        OR (excluded.lower_is_better=0 AND excluded.best>game_records.best)
        THEN excluded.lower_is_better ELSE game_records.lower_is_better END,
      plays=game_records.plays+1,updated_at=CURRENT_TIMESTAMP`)
    .run(req.user.id,game,score,1,lower?1:0);
  res.json({ok:true});
});
app.get('/api/games/leaderboard', auth, (req,res) => {
  const game=String(req.query.game||'');
  if(!RECORD_GAMES.has(game)) return bad(res,'Unknown game.');
  const rows=db.prepare(`SELECT users.name,game_records.plays,game_records.wins,game_records.best
    FROM game_records JOIN users ON users.id=game_records.user_id
    WHERE game_records.game=? AND users.banned=0
    ORDER BY game_records.wins DESC,
      CASE WHEN game_records.lower_is_better=1 THEN game_records.best END ASC,
      CASE WHEN game_records.lower_is_better=0 THEN game_records.best END DESC,
      game_records.plays DESC LIMIT 10`).all(game);
  res.json({players:rows});
});
app.post('/api/games/rooms', auth, (req,res) => {
  const game=String((req.body||{}).game||'');
  if(!MULTIPLAYER_GAMES.has(game)) return bad(res,'This game does not support online rooms.');
  const activeRooms=db.prepare("SELECT COUNT(*) AS count FROM game_rooms WHERE host_id=? AND status IN ('waiting','playing') AND updated_at > datetime('now','-1 day')").get(req.user.id).count;
  if(activeRooms>=5) return bad(res,'You already have five active rooms. Finish or wait for one to expire first.',429);
  let code, tries=0;
  do { code=randomCode(); tries++; } while(getRoom(code)&&tries<20);
  if(getRoom(code)) return bad(res,'Could not create a room. Try again.',503);
  const state=newRoomState(game);
  db.prepare(`INSERT INTO game_rooms(code,game,host_id,status,state_json) VALUES(?,?,?,'waiting',?)`)
    .run(code,game,req.user.id,JSON.stringify(state));
  sendRoom(res,getRoom(code),req.user.id);
});
app.post('/api/games/rooms/:code/join', auth, (req,res) => {
  const room=getRoom(req.params.code);
  if(!room) return bad(res,'Room not found. Check the code.',404);
  if(room.host_id===req.user.id || room.guest_id===req.user.id) return sendRoom(res,room,req.user.id);
  if(room.status!=='waiting'||room.guest_id) return bad(res,'This room is already full or finished.',409);
  db.prepare(`UPDATE game_rooms SET guest_id=?,status='playing',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='waiting' AND guest_id IS NULL`)
    .run(req.user.id,room.id);
  const updated=db.prepare('SELECT * FROM game_rooms WHERE id=?').get(room.id);
  sendRoom(res,updated,req.user.id);
});
app.get('/api/games/rooms/:code', auth, (req,res) => {
  const room=getRoom(req.params.code);
  if(!room) return bad(res,'Room not found.',404);
  sendRoom(res,room,req.user.id);
});
app.post('/api/games/rooms/:code/move', auth, (req,res) => {
  const room=getRoom(req.params.code);
  if(!room) return bad(res,'Room not found.',404);
  if(room.status!=='playing') return bad(res,'This room is not in an active game.',409);
  const seat=room.host_id===req.user.id?0:room.guest_id===req.user.id?1:-1;
  if(seat<0) return bad(res,'You are not a member of this room.',403);
  const state=JSON.parse(room.state_json), body=req.body||{};
  if(state.winner!==null) return bad(res,'This game has already finished.',409);
  if(state.turn!==seat) return bad(res,'It is not your turn.',409);
  if(room.game==='connect-four') {
    const col=Number(body.column);
    if(!Number.isInteger(col)||col<0||col>6)return bad(res,'Choose a valid column.');
    let row=-1;for(let r=5;r>=0;r--){if(!state.grid[r*7+col]){row=r;break;}}
    if(row<0)return bad(res,'That column is full.');
    state.grid[row*7+col]=seat+1;state.moves++;
    if(checkConnectWin(state.grid,row,col,seat+1)) finishRoom(room,state,seat);
    else if(state.moves===42) finishRoom(room,state,-1);
    else state.turn=1-seat;
  } else if(room.game==='mines-duel') {
    const index=Number(body.index);
    if(!Number.isInteger(index)||index<0||index>24||Object.hasOwn(state.revealed,index))return bad(res,'Choose an unopened tile.');
    if(state.mines.includes(index)){state.revealed[index]='mine';state.turn=1-seat;}
    else {state.revealed[index]='safe';state.scores[seat]++;if(state.scores[seat]>=10)finishRoom(room,state,seat);else state.turn=1-seat;}
  } else if(room.game==='case-battles') {
    const index=Number(body.index);
    if(!Number.isInteger(index)||index<0||index>=state.deck.length||Object.hasOwn(state.revealed,index))return bad(res,'Choose an unopened case.');
    state.revealed[index]=state.deck[index];if(state.deck[index]===state.target)state.scores[seat]++;
    if(Object.keys(state.revealed).length>=state.deck.length){const winner=state.scores[0]===state.scores[1]?-1:state.scores[0]>state.scores[1]?0:1;finishRoom(room,state,winner);}
    else state.turn=1-seat;
  } else if(room.game==='uno') {
    const action=String(body.action||'');
    const top=state.discard[state.discard.length-1];
    if(action==='draw') {
      if(!state.drawPile.length){
        const topCard=state.discard.pop();state.drawPile=shuffled(state.discard);state.discard=[topCard];
      }
      if(!state.drawPile.length)return bad(res,'No cards remain to draw.');
      state.hands[seat].push(state.drawPile.pop());state.turn=1-seat;
    } else if(action==='play') {
      const cardId=Number(body.cardId), index=state.hands[seat].findIndex(c=>c.id===cardId);
      if(index<0)return bad(res,'That card is not in your hand.');
      const card=state.hands[seat][index];
      if(card.color!==top.color&&card.value!==top.value)return bad(res,'That card does not match the discard.');
      state.hands[seat].splice(index,1);state.discard.push(card);
      if(!state.hands[seat].length)finishRoom(room,state,seat);
      else state.turn=card.value==='skip'?seat:1-seat;
    } else return bad(res,'Unknown UNO move.');
  }
  db.prepare(`UPDATE game_rooms SET status=?,state_json=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(room.status,JSON.stringify(state),room.id);
  sendRoom(res,db.prepare('SELECT * FROM game_rooms WHERE id=?').get(room.id),req.user.id);
});
// Remove abandoned lobby records after a day; finished games remain available for a short rematch window.
setInterval(()=>{try{db.prepare("DELETE FROM game_rooms WHERE updated_at < datetime('now','-1 day')").run();}catch(error){console.error('[game room cleanup]',error);}},60*60*1000).unref();

// Administrator moderation. This panel cannot impersonate users or change balances.
app.get('/api/admin', auth, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT id,name,ign,admin,banned,created_at
    FROM users ORDER BY id DESC LIMIT 250
  `).all();
  const messages = db.prepare(`
    SELECT chat.id, users.name, chat.text, chat.at
    FROM chat JOIN users ON users.id=chat.user_id
    ORDER BY chat.id DESC LIMIT 100
  `).all();
  res.json({ users, messages });
});

app.post('/api/admin/users/:id/ban', auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const banned = !!((req.body || {}).banned);
  if (!Number.isSafeInteger(id) || id < 1) return bad(res, 'Invalid user id.');
  if (id === req.user.id) return bad(res, 'You cannot suspend your own admin account.');
  const changed = db.prepare('UPDATE users SET banned=? WHERE id=? AND admin=0').run(banned ? 1 : 0, id).changes;
  if (!changed) return bad(res, 'User not found or cannot be moderated.');
  res.json({ ok: true });
});

app.post('/api/admin/messages/:id/delete', auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return bad(res, 'Invalid message id.');
  const changed = db.prepare('DELETE FROM chat WHERE id=?').run(id).changes;
  if (!changed) return bad(res, 'Message not found.');
  res.json({ ok: true });
});

const server = app.listen(PORT, () => console.log(`[DonutTrix] community site listening on port ${PORT}`));
function shutdown() {
  console.log('[DonutTrix] shutting down...');
  server.close(() => {
    try { db.close(); } finally { process.exit(0); }
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
