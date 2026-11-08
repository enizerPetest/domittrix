'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MULTIPLAYER_GAMES, RECORD_GAMES, LOWER_SCORE_GAMES } = require('../lib/arcade-rules');

test('arcade registry contains exactly the 30 supported record games', () => {
  assert.equal(RECORD_GAMES.size, 30);
  for (const game of ['mines', 'uno', 'connect-four', 'daily-race']) assert.ok(RECORD_GAMES.has(game));
});

test('multiplayer games are registered record games', () => {
  assert.deepEqual([...MULTIPLAYER_GAMES].sort(), ['case-battles', 'connect-four', 'mines-duel', 'uno']);
  for (const game of MULTIPLAYER_GAMES) assert.ok(RECORD_GAMES.has(game));
});

test('only move-count puzzle games use lower-is-better ordering', () => {
  assert.deepEqual([...LOWER_SCORE_GAMES].sort(), ['flip', 'slide']);
  for (const game of LOWER_SCORE_GAMES) assert.ok(RECORD_GAMES.has(game));
});

test('the browser catalog and server registry stay in sync', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/games.js'), 'utf8');
  const catalog = [...source.matchAll(/^\s*\['([a-z0-9-]+)'/gm)].map(match => match[1]);
  assert.equal(catalog.length, 30);
  assert.deepEqual([...new Set(catalog)].sort(), [...RECORD_GAMES].sort());
});
