'use strict';

const MULTIPLAYER_GAMES = new Set(['connect-four', 'uno', 'mines-duel', 'case-battles']);
const RECORD_GAMES = new Set([
  'mines', 'cases', 'case-battles', 'flip', 'blackjack', 'dice', 'towers', 'mines-duel', 'coinflip',
  'crash', 'uno', 'connect-four', 'floor-is-lava', 'draw', 'rock-paper-scissors', 'stripmine',
  'upgrader', 'limbo', 'plinko', 'hilo', 'double', 'roulette', 'pig-race', 'stocks', 'slide',
  'chicken', 'keno', 'blitz', 'snakes', 'daily-race',
]);
// The server owns score direction so a client cannot reorder a leaderboard by changing request flags.
const LOWER_SCORE_GAMES = new Set(['flip', 'slide']);

module.exports = { MULTIPLAYER_GAMES, RECORD_GAMES, LOWER_SCORE_GAMES };
