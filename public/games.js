/* DonutTrix Arcade — 30 free-play mini-games. No wagers, redeemable currency or payouts. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const rand = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
  const games = [
    ['mines','💣','Mines','Puzzle','Reveal every safe tile without uncovering a mine.','Choose tiles on a 5×5 board. Reset at any time.','puzzle'],
    ['cases','📦','Cases','Puzzle','Open themed display cases and solve the symbol pattern.','Reveal the icons and spot matching pairs; no items are granted or traded.','puzzle'],
    ['case-battles','⚔️','Case Battles','Party','Compete with a friend to reveal matching symbols in a shared case board.','Create an online room, invite a friend and take alternating turns. A local mode is also available.','party'],
    ['flip','🪙','Flip','Chance','Call heads or tails and see the coin land.','A quick coin-call challenge. Track your correct calls only.','chance'],
    ['blackjack','🂡','Blackjack','Cards','Practice classic Blackjack against the dealer.','Try to get closer to 21 than the dealer without going over. No chips or stakes.','cards'],
    ['dice','🎲','Dice','Chance','Roll against the computer in a race to the target score.','First to 30 round-points wins. The score is only a game result.','chance'],
    ['towers','🗼','Towers','Puzzle','Climb the tower by finding the safe step on every floor.','Pick one of three tiles on each row. One path is safe per floor.','puzzle'],
    ['mines-duel','💥','Mines Duel','Party','Challenge a friend to a server-hosted shared-grid puzzle.','Create a room and alternate reveals. Safe tiles score points; mines pass the turn. First to 10 wins.','party'],
    ['coinflip','✨','Coinflip','Chance','A clean coin toss with a heads-or-tails call.','Choose a side before each toss and build a correct-call streak.','chance'],
    ['crash','🚀','Crash','Arcade','Watch the flight climb and stop your run before it ends.','Press Stop Run before the flight ends. Your result is a multiplier-style score only.','arcade'],
    ['uno','🃏','UNO','Cards','Play an online UNO-style match with a friend, or choose local bot mode.','Match the color or number. Create a room to invite a friend; draw a card when you cannot play.','cards'],
    ['connect-four','🔴','Connect Four','Party','Connect four discs before your friend does in online mode.','Create a room, share the code and take turns dropping discs into columns. Local play is also available.','party'],
    ['floor-is-lava','🌋','Floor is Lava','Arcade','Jump between safe platforms and avoid the lava.','Pick a safe platform on every row. Reach the finish line.','arcade'],
    ['draw','🎨','Draw','Party','Make pixel art or sketch something in the canvas.','Choose a color, draw with your pointer and clear the canvas whenever you like.','party'],
    ['rock-paper-scissors','✂️','Rock Paper Scissors','Party','Play a best-of-five match against the computer.','Choose rock, paper or scissors. First to three round wins takes the match.','party'],
    ['stripmine','⛏️','Stripmine','Puzzle','Explore a small mine and discover hidden ore tiles.','Reveal cells and collect a high score before you run out of picks.','puzzle'],
    ['upgrader','⬆️','Upgrader','Puzzle','Merge matching tiles to build higher levels.','Use the arrow keys or swipe to slide the board. Reach the highest tile you can.','puzzle'],
    ['limbo','🎯','Limbo','Chance','Find the hidden number with a few clues.','Guess a number from 1 to 10. Use higher/lower hints to solve the round.','chance'],
    ['plinko','🔺','Plinko','Arcade','Drop a ball through a field of pegs.','Choose a lane and watch the ball bounce to a final slot. Your slot is just a score.','arcade'],
    ['hilo','🂠','Hilo','Cards','Predict whether the next card is higher or lower.','Aces are high. Continue to build a streak or end your run.','cards'],
    ['double','🔁','Double','Chance','Predict whether the next roll is odd or even.','Call odd or even before the die is rolled. Keep a personal streak.','chance'],
    ['roulette','🎡','Roulette','Chance','Spin a colorful wheel and see where it stops.','Choose a color for a prediction challenge. No chips, tables or betting.','chance'],
    ['pig-race','🐷','Pig Race','Arcade','Pick a pig and watch a silly sprint to the finish.','Choose a lane, start the race and see which pig gets there first.','arcade'],
    ['stocks','📈','Stocks','Puzzle','Practice reading a fictional rising and falling chart.','Predict the next candle in a made-up market. This is not connected to real assets.','puzzle'],
    ['slide','🧩','Slide','Puzzle','Put the numbered tiles back in order.','Tap a tile next to the empty space. Arrange 1–15 from left to right, top to bottom.','puzzle'],
    ['chicken','🐔','Chicken','Arcade','Guide the chicken across a busy path.','Move forward one lane at a time. Avoid obstacles and reach the other side.','arcade'],
    ['keno','🔢','Keno','Puzzle','Solve a number-match puzzle against a daily pattern.','Choose five numbers. The target is fixed for the day; matches are only a score.','puzzle'],
    ['blitz','⚡','Blitz','Arcade','Tap as many targets as you can before time runs out.','Hit the glowing target and avoid tapping empty cells. You have 15 seconds.','arcade'],
    ['snakes','🐍','Snakes','Arcade','Guide the snake, collect dots and avoid collisions.','Use arrow keys or WASD. On phones, use the directional buttons.','arcade'],
    ['daily-race','🏁','Daily Race','Arcade','A daily obstacle course with the same layout for everyone today.','Change lanes to avoid barriers and reach the finish. Your result is your time and distance.','arcade'],
  ].map(([id,icon,name,category,description,instructions,group])=>({id,icon,name,category,description,instructions,group}));

  let active = null, state = {}, timer = null, tick = null, gameFilter = 'all';
  const board = () => $('#gameBoard');
  const say = text => { const el=$('#gameFeedback'); if(el) el.textContent=text; };
  const clearTimers = () => { clearTimeout(timer); clearInterval(tick); timer=tick=null; };
  const statsKey = id => `donuttrix_game_${id}`;
  function stats(id=active){ try{return JSON.parse(localStorage.getItem(statsKey(id))||'{"best":null,"plays":0}');}catch{return {best:null,plays:0};} }
  async function gameApi(path, body) {
    const response=await fetch('/api/'+path, body===undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Game server request failed.');
    return data;
  }
  function record(score, lowerIsBetter=false) {
    const s=stats(); s.plays=(s.plays||0)+1;
    if(s.best===null || s.best===undefined || (lowerIsBetter ? score<s.best : score>s.best)) s.best=score;
    localStorage.setItem(statsKey(active),JSON.stringify(s)); updateStats();
    gameApi('games/records',{game:active,score,lowerIsBetter}).then(updateStats).catch(error=>say(`Saved on this device. Server sync unavailable: ${error.message}`));
  }
  async function updateStats(){
    const local=stats(); let best=local.best, plays=local.plays||0;
    try {
      const data=await gameApi('games/stats');
      const remote=data.records.find(row=>row.game===active);
      if(remote){best=remote.best;plays=remote.plays||plays;}
    } catch {}
    if(active===null)return;
    $('#gameBest').textContent=best===null||best===undefined?'—':String(best);
    $('#gamePlays').textContent=plays;
    loadLeaderboard(active);
  }
  async function loadLeaderboard(game){
    const el=$('#gameLeaderboard'); if(!el)return;
    try {
      const data=await gameApi('games/leaderboard?game='+encodeURIComponent(game));
      const multiplayer=['connect-four','uno','mines-duel','case-battles'].includes(game);
      el.innerHTML=data.players.length?data.players.map((p,i)=>`<div class="leader-row"><span>${i+1}. ${esc(p.name)}</span><b>${multiplayer?`${p.wins} wins`:`Best ${p.best ?? '—'}`}</b></div>`).join(''):'<p class="mut small">No records yet. Be the first!</p>';
    } catch { el.textContent='Leaderboard unavailable while offline.'; }
  }
  function btn(label, action, extra=''){return `<button class="game-action ${extra}" data-action="${action}">${label}</button>`;}
  function showBoard(html){board().innerHTML=html;}
  function gameHeader(title, hint=''){return `<div class="game-mini-head"><b>${title}</b><span>${hint}</span></div>`;}
  function showGame(id){
    const item=games.find(g=>g.id===id); if(!item)return;
    clearTimers(); active=id; state={}; $('#gamesCatalog').hidden=true; $('#gameWorkspace').hidden=false;
    $('#activeGameTitle').textContent=item.name; $('#activeGameCategory').textContent=item.category.toUpperCase(); $('#activeGameDescription').textContent=item.description; $('#gameInstructions').textContent=item.instructions;
    updateStats(); mount(id); window.scrollTo({top:0,behavior:'smooth'});
  }
  function back(){clearTimers();active=null;$('#gameWorkspace').hidden=true;$('#gamesCatalog').hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
  function renderCatalog(){
    const query=($('#gameSearch')?.value||'').trim().toLowerCase();
    const list=games.filter(g=>(gameFilter==='all'||g.group===gameFilter)&&(`${g.name} ${g.description} ${g.category}`).toLowerCase().includes(query));
    $('#gamesGrid').innerHTML=list.map(g=>`<button class="game-tile" data-open-game="${g.id}"><span class="game-tile-art art-${g.group}"><span>${g.icon}</span><i>✦</i></span><span class="game-tile-copy"><b>${esc(g.name)}</b><small>${esc(g.category)} · Free play</small></span><span class="game-tile-arrow">↗</span></button>`).join('') || '<div class="card games-empty">No games match that search. Try another name.</div>';
  }
  function mount(id){
    const b=board();
    switch(id){
      case 'mines': return initMines(id);
      case 'mines-duel': case 'case-battles': case 'uno': case 'connect-four': return initOnlineLobby(id);
      case 'cases': return initCases(id);
      case 'flip': return initFlip();
      case 'coinflip': return initCoinflip();
      case 'blackjack': return initBlackjack();
      case 'dice': return initDice();
      case 'towers': case 'floor-is-lava': return initPath(id);
      case 'crash': return initCrash();
      case 'draw': return initDraw();
      case 'rock-paper-scissors': return initRps();
      case 'stripmine': return initStripmine();
      case 'upgrader': return initUpgrader();
      case 'limbo': return initLimbo();
      case 'plinko': return initPlinko();
      case 'hilo': return initHilo();
      case 'double': return initDouble();
      case 'roulette': return initRoulette();
      case 'pig-race': return initPigRace();
      case 'stocks': return initStocks();
      case 'slide': return initSlide();
      case 'chicken': return initChicken();
      case 'keno': return initKeno();
      case 'blitz': return initBlitz();
      case 'snakes': return initSnake();
      case 'daily-race': return initDailyRace();
      default: showBoard('<p>Game unavailable.</p>');
    }
  }
  function clickBoard(event){
    const target=event.target.closest('[data-action]'); if(!target||target.disabled)return;
    const a=target.dataset.action, n=Number(target.dataset.index), val=target.dataset.value;
    if(target.dataset.onlineAction) return handleOnlineAction(target.dataset.onlineAction,target);
    if(['online-create','online-join','online-local','online-copy','online-new-room'].includes(a)) return handleOnlineAction(a.replace('online-',''),target);
    if(a==='online-back'){clearTimers();state.onlineRoom=null;back();return;}
    if(state.onlineRoom) return handleOnlineMove(target);
    if(a==='restart'){showGame(active);return;}
    switch(active){
      case 'mines': return actMines(n);
      case 'mines-duel': return actMinesDuel(n);
      case 'cases': return actCases(n);
      case 'case-battles': return actCaseBattle(n);
      case 'flip': return actFlip(n);
      case 'coinflip': return actCoinflip(val);
      case 'blackjack': return actBlackjack(a);
      case 'dice': return actDice();
      case 'towers': case 'floor-is-lava': return actPath(n);
      case 'crash': return actCrash(a);
      case 'uno': return actUno(a,n);
      case 'connect-four': return actConnect(n);
      case 'rock-paper-scissors': return actRps(val);
      case 'stripmine': return actStripmine(n);
      case 'upgrader': return actUpgrader(a,val);
      case 'limbo': return actLimbo(a,n);
      case 'plinko': return actPlinko(val);
      case 'hilo': return actHilo(val);
      case 'double': return actDouble(val);
      case 'roulette': return actRoulette(val);
      case 'pig-race': return actPigRace(a,val);
      case 'stocks': return actStocks(val);
      case 'slide': return a==='move'?moveSlideBlank(Number(val)):actSlide(n);
      case 'chicken': return actChicken(a,val);
      case 'keno': return actKeno(n,a);
      case 'blitz': return actBlitz(a,n);
      case 'snakes': return actSnake(a,val);
      case 'daily-race': return actDailyRace(a,val);
    }
  }
  function mountEvents(){
    $('#gamesGrid').addEventListener('click',e=>{const t=e.target.closest('[data-open-game]');if(t)showGame(t.dataset.openGame);});
    $('#gameFilters').addEventListener('click',e=>{const t=e.target.closest('[data-filter]');if(!t)return;gameFilter=t.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===t));renderCatalog();});
    $('#gameSearch').addEventListener('input',renderCatalog);
    $('#backToGames').addEventListener('click',back);
    $('#restartGame').addEventListener('click',()=>{if(active)showGame(active);});
    board().addEventListener('click',clickBoard);
    document.addEventListener('keydown',onKey);
  }
  function onKey(e){if(!active)return;if(active==='upgrader'){const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};const m=map[e.key];if(m){e.preventDefault();move2048(m);}}if(active==='slide'){const map={ArrowUp: -4,ArrowDown:4,ArrowLeft:-1,ArrowRight:1};if(map[e.key]!==undefined){e.preventDefault();moveSlideBlank(map[e.key]);}}if(active==='snakes'){const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};if(map[e.key]){e.preventDefault();snakeDirection(map[e.key]);}}}

  // Online multiplayer rooms: server-authoritative moves, private UNO hands, room-code invites.
  let onlineBusy=false;
  function initOnlineLobby(id){
    state={onlineGame:id,onlineRoom:null};
    const names={'connect-four':'Connect Four','uno':'UNO','mines-duel':'Mines Duel','case-battles':'Case Battles'};
    showBoard(`${gameHeader(names[id]+' · Online','Play with another signed-in player')}
      <div class="online-lobby"><div class="online-lobby-card"><span class="online-lobby-icon">⌁</span><h3>Create a room</h3><p>Generate a private 6-character room code and share it with a friend.</p>${btn('Create online room','online-create')}</div>
      <div class="online-lobby-card"><span class="online-lobby-icon">↗</span><h3>Join a room</h3><p>Enter the code shared by the room host.</p><input id="onlineRoomCode" class="online-code-input" maxlength="6" placeholder="ROOM CODE" autocomplete="off">${btn('Join room','online-join')}</div></div>
      <div class="online-footnote">Moves are checked by the server. Both players need a DonutTrix account and must be signed in. No wagers, stakes or payouts.</div>
      ${btn('Play locally on this device','online-local','secondary-action')}`);
  }
  async function handleOnlineAction(action,button){
    if(action==='create'){
      try{const data=await gameApi('games/rooms',{game:active});state.onlineRoom=data.room;renderOnlineRoom();startOnlinePolling();}
      catch(error){say(error.message);}
    } else if(action==='join'){
      const code=($('#onlineRoomCode')?.value||'').trim().toUpperCase();
      if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){say('Enter a valid six-character room code.');return;}
      try{const data=await gameApi('games/rooms/'+encodeURIComponent(code)+'/join',{});state.onlineRoom=data.room;renderOnlineRoom();startOnlinePolling();}
      catch(error){say(error.message);}
    } else if(action==='local'){
      state.onlineRoom=null;clearTimers();
      if(active==='connect-four')initConnect();
      else if(active==='uno')initUno();
      else if(active==='mines-duel')initMines('mines-duel');
      else if(active==='case-battles')initCases('case-battles');
    } else if(action==='new-room'){
      state.onlineRoom=null;clearTimers();initOnlineLobby(active);
    } else if(action==='copy'){
      try{await navigator.clipboard.writeText(state.onlineRoom.code);say('Room code copied.');}
      catch{say('Room code: '+state.onlineRoom.code);}
    }
  }
  function startOnlinePolling(){clearInterval(tick);let busy=false;tick=setInterval(async()=>{
    if(active===null||!state.onlineRoom||busy)return;busy=true;
    try{const data=await gameApi('games/rooms/'+encodeURIComponent(state.onlineRoom.code));
      if(!state.onlineRoom||data.room.version!==state.onlineRoom.version||data.room.status!==state.onlineRoom.status){state.onlineRoom=data.room;renderOnlineRoom();}
    }catch(error){say(error.message);clearInterval(tick);tick=null;}
    finally{busy=false;}
  },1000);}
  async function handleOnlineMove(target){
    if(!state.onlineRoom||onlineBusy)return;
    const v=state.onlineRoom, action=target.dataset.action;
    let body=null;
    if(action==='online-drop')body={column:Number(target.dataset.index)};
    else if(action==='online-reveal')body={index:Number(target.dataset.index)};
    else if(action==='online-case')body={index:Number(target.dataset.index)};
    else if(action==='online-play')body={action:'play',cardId:Number(target.dataset.cardId)};
    else if(action==='online-draw')body={action:'draw'};
    else return;
    onlineBusy=true;
    try{const data=await gameApi('games/rooms/'+encodeURIComponent(v.code)+'/move',body);state.onlineRoom=data.room;renderOnlineRoom();}
    catch(error){say(error.message);}
    finally{onlineBusy=false;}
  }
  function renderOnlineRoom(){
    const v=state.onlineRoom;if(!v)return;
    const player=v.players[v.seat]||`Player ${v.seat+1}`, opponent=v.players[1-v.seat]||'Waiting for friend';
    const title={'connect-four':'Connect Four','uno':'UNO','mines-duel':'Mines Duel','case-battles':'Case Battles'}[v.game];
    const roomLine=`Room ${esc(v.code)} · You: ${esc(player)} · Opponent: ${esc(opponent)}`;
    let html=gameHeader(title,roomLine);
    if(v.status==='waiting'){
      html+=`<div class="online-wait"><div class="online-spinner">✧</div><h3>Waiting for a player</h3><p>Send this room code to your friend:</p><div class="online-share-code">${esc(v.code)}</div>${btn('Copy room code','online-copy')}<p class="mut small">This screen updates automatically when someone joins.</p></div>`;
      showBoard(html);return;
    }
    if(v.status==='finished'){
      const result=v.winner===-1?'Draw game':v.winner===v.seat?'You won!':`${esc(opponent)} won this game.`;
      html+=`<div class="online-result"><div class="online-result-icon">${v.winner===v.seat?'🏆':v.winner===-1?'🤝':'✦'}</div><h2>${result}</h2><p>Room ${esc(v.code)} · Match complete</p>${btn('Create another room','online-new-room')}<button class="game-action secondary-action" data-action="online-back">Back to arcade</button></div>`;
      showBoard(html);return;
    }
    const yourTurn=v.turn===v.seat;
    html+=`<div class="online-status"><span class="online-status-dot"></span>${yourTurn?'Your turn':`${esc(opponent)} is playing`}</div>`;
    if(v.game==='connect-four'){
      html+=`<div class="online-score">🔴 ${esc(v.players[0]||'Player 1')} <b>vs</b> 🟡 ${esc(v.players[1]||'Player 2')}</div>
        <div class="connect-grid online-connect-grid">${v.grid.map(x=>`<span class="connect-cell ${x===1?'red':x===2?'yellow':''}"></span>`).join('')}</div>
        <div class="online-columns">${Array.from({length:7},(_,i)=>btn(`↓ ${i+1}`,'online-drop', 'choice') .replace('data-action="online-drop"',`data-action="online-drop" data-index="${i}"`)).join('')}</div>`;
    } else if(v.game==='mines-duel'){
      html+=`<div class="online-score">${esc(v.players[0]||'P1')}: <b>${v.scores[0]}</b> · ${esc(v.players[1]||'P2')}: <b>${v.scores[1]}</b></div>
        <div class="mine-grid">${Array.from({length:25},(_,i)=>{const opened=v.revealed[i],symbol=opened==='mine'?'✹':opened==='safe'?'✦':'?';return `<button class="mine-cell ${opened==='mine'?'mine-hit':opened==='safe'?'safe-hit':''}" data-action="online-reveal" data-index="${i}" ${opened||!yourTurn?'disabled':''}>${symbol}</button>`;}).join('')}</div>`;
    } else if(v.game==='case-battles'){
      html+=`<div class="online-score">${esc(v.players[0]||'P1')}: <b>${v.scores[0]}</b> · ${esc(v.players[1]||'P2')}: <b>${v.scores[1]}</b> <small>matching symbols</small></div>
        <div class="case-grid">${Array.from({length:v.total},(_,i)=>{const opened=v.revealed[i];return `<button class="case-cell ${opened?'revealed':''}" data-action="online-case" data-index="${i}" ${opened||!yourTurn?'disabled':''}>${opened?esc(opened):'▣'}</button>`;}).join('')}</div>`;
    } else if(v.game==='uno'){
      const top=v.top;
      html+=`<div class="uno-top"><span>${esc(opponent)} · ${v.otherCount} cards</span><span class="uno-card ${esc(top.color)}">${esc(top.value.toUpperCase())}</span><span>You · ${v.hand.length} cards</span></div>
        <div class="uno-hand">${v.hand.map(c=>`<button class="uno-card ${esc(c.color)}" data-action="online-play" data-card-id="${c.id}" ${!yourTurn||!canOnlineUno(c,top)?'disabled':''}>${esc(c.value)}</button>`).join('')}</div>
        <div class="game-inline-actions">${btn('Draw card','online-draw',yourTurn?'':'secondary-action').replace('<button ','<button '+(yourTurn?'':'disabled '))}</div>`;
    }
    html+=`<p class="online-room-hint">Room code: <b>${esc(v.code)}</b> · Free play only</p>`;
    showBoard(html);
  }
  function canOnlineUno(card,top){return card.color===top.color||card.value===top.value;}

  // Mines and Mines Duel
  function initMines(id){const duel=id==='mines-duel';state={duel, mines:new Set(),revealed:new Set(),turn:0,scores:[0,0],ended:false};while(state.mines.size<6)state.mines.add(rand(0,24));renderMines();}
  function renderMines(){const duel=state.duel;showBoard(`${gameHeader(duel?'Two-player minefield':'Safe-tile challenge',duel?`Player ${state.turn+1} turn · ${state.scores[0]} : ${state.scores[1]}`:`${state.revealed.size} / 19 safe tiles`)}<div class="mine-grid">${Array.from({length:25},(_,i)=>{const open=state.revealed.has(i),mine=state.mines.has(i);return `<button class="mine-cell ${open?(mine?'mine-hit':'safe-hit'):''}" data-action="reveal" data-index="${i}" ${open||state.ended?'disabled':''}>${open?(mine?'✹':'✦'):'?'}</button>`;}).join('')}</div>${btn('New board','restart')}</div>`);}
  function actMines(i){if(state.ended||state.revealed.has(i))return;state.revealed.add(i);if(state.mines.has(i)){state.ended=true;say('Mine found. Start a fresh board and try again.');record(state.revealed.size-1);}else if(state.revealed.size===19){state.ended=true;say('Perfect clear! You found every safe tile.');record(19);}else say('Safe tile! Keep going.');renderMines();}
  function actMinesDuel(i){if(state.ended||state.revealed.has(i))return;state.revealed.add(i);if(state.mines.has(i)){say(`Player ${state.turn+1} uncovered a mine. Turn passes.`);state.turn=1-state.turn;}else{state.scores[state.turn]++;say(`Player ${state.turn+1} found a safe tile!`);if(state.scores[state.turn]>=10){state.ended=true;say(`Player ${state.turn+1} wins the duel!`);record(10);}}renderMines();}

  // Fixed case puzzle and local case battle
  function initCases(id){state={battle:id==='case-battles',deck:shuffle(id==='case-battles'?['🔷','🔷','🟣','🟢','🟡','🔴','🟠','🟣','🟢','🟡']:['🔷','🟣','🟢','🟡','🔴','🟠','🔷','🟣','🟢','🟡']),target:'🔷',opened:new Set(),moves:0,turn:0,results:[0,0],locked:false};renderCases();}
  function renderCases(){showBoard(`${gameHeader(state.battle?'Case puzzle duel':'Display case puzzle',state.battle?`Player ${state.turn+1} · Score ${state.results[0]}–${state.results[1]}`:`${state.opened.size}/9 cases explored`)}<div class="case-grid">${state.deck.map((v,i)=>`<button class="case-cell ${state.opened.has(i)?'revealed':''}" data-action="open" data-index="${i}" ${state.opened.has(i)||state.locked?'disabled':''}>${state.opened.has(i)?v:'▣'}</button>`).join('')}</div><div class="game-inline-actions">${btn('Reset puzzle','restart')}</div>`);}
  function actCases(i){if(state.opened.has(i))return;state.opened.add(i);state.moves++;if(state.opened.size===9){const pairs=Object.values(state.deck.reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{})).filter(n=>n>1).length;say(`Display explored in ${state.moves} moves. ${pairs} symbol pairs found.`);record(pairs);}renderCases();}
  function actCaseBattle(i){if(state.locked||state.opened.has(i))return;state.opened.add(i);if(state.deck[i]===state.target)state.results[state.turn]++;state.turn=1-state.turn;if(state.opened.size===10){state.locked=true;const win=state.results[0]===state.results[1]?'Tie game':state.results[0]>state.results[1]?'Player 1 wins':'Player 2 wins';say(`${win}. Matching crystals: ${state.results[0]}–${state.results[1]}.`);record(Math.max(...state.results));}renderCases();}

  // Flip: 5x5 memory board inspired by the reference grid.
  function initFlip(){const faces=['🪙','💎','🍀','⭐','🌙','🔷','🟣','🔥','⚡','🌸','🧊','🎈'];state={deck:shuffle([...faces,...faces,'🎁']),open:[],matched:new Set(),moves:0,busy:false,done:false};state.matched.add(state.deck.indexOf('🎁'));renderFlip();}
  function renderFlip(){showBoard(`${gameHeader('Flip tile board',`${state.matched.size}/25 tiles matched · ${state.moves} moves`)}<div class="flip-grid">${state.deck.map((v,i)=>{const show=state.open.includes(i)||state.matched.has(i);return `<button class="flip-cell ${show?'revealed':''} ${state.matched.has(i)?'matched':''}" data-action="tile" data-index="${i}" ${state.matched.has(i)||state.busy||state.done?'disabled':''}>${show?v:'?'}</button>`;}).join('')}</div>`);}
  function actFlip(i){if(state.done||state.busy||state.open.includes(i)||state.matched.has(i))return;state.open.push(i);renderFlip();if(state.open.length===2){state.moves++;const [a,b]=state.open;if(state.deck[a]===state.deck[b]){state.matched.add(a);state.matched.add(b);state.open=[];if(state.matched.size===state.deck.length){state.done=true;say(`Board cleared in ${state.moves} moves!`);record(state.moves,true);}else say('Pair found! Keep flipping.');renderFlip();}else{state.busy=true;say('Not a pair — remember their positions.');timer=setTimeout(()=>{state.open=[];state.busy=false;renderFlip();},700);}}}

  // Coinflip: independent heads/tails prediction game.
  function initCoinflip(){state={streak:0,correct:0,round:0};renderCoinflip();}
  function renderCoinflip(){showBoard(`${gameHeader('Call the coin','Choose before the toss')}<div class="coin-stage"><div class="coin-disc">${state.last||'✦'}</div><b>${state.result||'Ready for the toss?'}</b></div><div class="choice-row">${btn('☀ Heads','call','choice')}${btn('☾ Tails','call','choice')}</div>`);const buttons=board().querySelectorAll('[data-action="call"]');buttons[0].dataset.value='heads';buttons[1].dataset.value='tails';}
  function actCoinflip(v){const result=pick(['heads','tails']);const good=v===result;state.round++;state.streak=good?state.streak+1:0;state.correct+=good?1:0;state.last=result==='heads'?'☀':'☾';state.result=`${result.toUpperCase()} · ${good?'Correct call!':'Not this time.'} Streak: ${state.streak}`;say(`${state.correct} correct out of ${state.round} calls.`);record(state.streak);renderCoinflip();}

  // Blackjack, no chips or bets
  const cardVal=c=>c.rank==='A'?11:['J','Q','K'].includes(c.rank)?10:Number(c.rank);
  const makeCard=()=>({rank:pick(['A','2','3','4','5','6','7','8','9','10','J','Q','K']),suit:pick(['♠','♥','♦','♣'])});
  function total(hand){let t=hand.reduce((s,c)=>s+cardVal(c),0),aces=hand.filter(c=>c.rank==='A').length;while(t>21&&aces){t-=10;aces--;}return t;}
  function initBlackjack(){state={deck:shuffle(Array.from({length:4},()=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].flatMap(rank=>['♠','♥','♦','♣'].map(suit=>({rank,suit})))).flat()),player:[],dealer:[],done:false};state.player=[state.deck.pop(),state.deck.pop()];state.dealer=[state.deck.pop(),state.deck.pop()];renderBlackjack();}
  function cardsHTML(hand,hide=false){return hand.map((c,i)=>`<span class="playing-card ${['♥','♦'].includes(c.suit)?'red':''}">${hide&&i===1?'?':c.rank+c.suit}</span>`).join('');}
  function renderBlackjack(){showBoard(`${gameHeader('Blackjack','Aim for 21')}<div class="card-hand"><label>DEALER ${state.done?`· ${total(state.dealer)}`:''}</label><div>${cardsHTML(state.dealer,!state.done)}</div></div><div class="card-hand"><label>YOU · ${total(state.player)}</label><div>${cardsHTML(state.player)}</div></div><div class="game-inline-actions">${btn('Hit','hit')}${btn('Stand','stand')}${btn('New hand','restart')}</div>`);if(state.done){const p=total(state.player),d=total(state.dealer);say(p>21?'Bust — dealer wins this hand.':d>21||p>d?'You win this hand!':p===d?'Push — tie hand.':'Dealer wins this hand.');record(p>21?0:(d>21||p>d?1:0));}else if(total(state.player)===21)actBlackjack('stand');}
  function actBlackjack(a){if(state.done)return;if(a==='hit'){state.player.push(state.deck.pop());if(total(state.player)>21){state.done=true;renderBlackjack();}else renderBlackjack();}else if(a==='stand'){while(total(state.dealer)<17)state.dealer.push(state.deck.pop());state.done=true;renderBlackjack();}}

  // Dice race
  function initDice(){state={scores:[0,0],turn:0,done:false,last:[null,null]};renderDice();}
  function renderDice(){showBoard(`${gameHeader('Dice race',`Player ${state.turn+1} rolls · First to 30`)}<div class="dice-scores"><div><small>YOU</small><b>${state.scores[0]}</b></div><div><small>CPU</small><b>${state.scores[1]}</b></div></div><div class="dice-cube">${state.last[state.turn]||'⚄'}</div>${btn('Roll dice','roll')}`);}
  function actDice(){if(state.done)return;const n=rand(1,6);state.last[state.turn]=['⚀','⚁','⚂','⚃','⚄','⚅'][n-1];state.scores[state.turn]+=n;if(state.scores[state.turn]>=30){state.done=true;say(state.turn===0?'You win the dice race!':'CPU wins the dice race.');record(state.turn===0?1:0);}else{state.turn=1-state.turn;if(state.turn===1){const bot=rand(1,6);state.last[1]=['⚀','⚁','⚂','⚃','⚄','⚅'][bot-1];state.scores[1]+=bot;if(state.scores[1]>=30){state.done=true;say('CPU wins the dice race.');record(0);}state.turn=0;}}renderDice();}

  // Towers and Floor is Lava path puzzles
  function initPath(id){state={floor:0,steps: id==='towers'?8:10,route:[],safe:rand(0,2),ended:false,mode:id};renderPath();}
  function renderPath(){const n=state.mode==='towers'?'Tower climb':'Lava crossing';showBoard(`${gameHeader(n,`Step ${state.floor}/${state.steps}`)}<div class="path-progress">${Array.from({length:state.steps},(_,i)=>`<i class="${i<state.floor?'done':''}"></i>`).join('')}</div><div class="path-tiles">${[0,1,2].map(i=>`<button data-action="step" data-index="${i}" class="path-tile">${['◈','◇','✧'][i]}</button>`).join('')}</div>${btn('Restart climb','restart')}`);}
  function actPath(i){if(state.ended)return;if(i!==state.safe){state.ended=true;say('That platform was unstable. Try a new route!');record(state.floor);}else{state.floor++;if(state.floor>=state.steps){state.ended=true;say('You made it to the top! Perfect run.');record(state.steps);}else{state.safe=rand(0,2);say('Safe step. Keep climbing!');}}renderPath();}

  // Crash-style free flight timing challenge
  function initCrash(){state={running:false,mult:1,crashAt:1.5+Math.random()*5,started:0,stopped:false};showBoard(`${gameHeader('Flight challenge','Stop before the flight ends')}<div class="flight-stage"><div class="flight-mult" id="flightMult">1.00×</div><div class="flight-rocket">🚀</div><div class="flight-track"><i id="flightLine"></i></div></div>${btn('Start flight','start')}`);}
  function actCrash(a){if(a==='start'&&!state.running&&!state.stopped){state.running=true;state.started=performance.now();say('Flight started — stop the run before it ends.');$('#gameBoard').querySelector('[data-action="start"]').dataset.action='stop';$('#gameBoard').querySelector('[data-action="stop"]').textContent='Stop run';tick=setInterval(()=>{state.mult=1+Math.pow((performance.now()-state.started)/4500,1.45);$('#flightMult').textContent=state.mult.toFixed(2)+'×';$('#flightLine').style.width=Math.min(100,state.mult/state.crashAt*100)+'%';if(state.mult>=state.crashAt){clearInterval(tick);tick=null;state.running=false;state.stopped=true;say('Flight ended before you stopped. Start a fresh run.');record(0);$('#gameBoard').querySelector('[data-action]')?.setAttribute('disabled','');}},70);}else if(a==='stop'&&state.running){clearInterval(tick);tick=null;state.running=false;state.stopped=true;say(`Safe landing at ${state.mult.toFixed(2)}×. New personal run score!`);record(Math.round(state.mult*100)/100);$('#gameBoard').querySelector('[data-action="stop"]').disabled=true;}}

  // UNO-style two player game (you vs simple bot)
  const unoColors=['red','blue','green','yellow'];
  const makeUnoDeck=()=>shuffle(unoColors.flatMap(color=>Array.from({length:2},(_,i)=>Array.from({length:10},(_,n)=>({color,value:String(n)}))).flat()).concat(unoColors.map(color=>({color,value:'skip'}))));
  function initUno(){const d=makeUnoDeck();state={deck:d,hand:d.splice(0,7),bot:d.splice(0,7),discard:[d.pop()],turn:'you',done:false};renderUno();}
  const topUno=()=>state.discard[state.discard.length-1];
  function canUno(c){return c.color===topUno().color||c.value===topUno().value;}
  function drawUno(who){if(!state.deck.length)state.deck=shuffle(unoColors.flatMap(color=>Array.from({length:10},(_,n)=>({color,value:String(n)}))));(who==='you'?state.hand:state.bot).push(state.deck.pop());}
  function renderUno(){const top=topUno();showBoard(`${gameHeader('UNO table',state.turn==='you'?'Your turn':'Bot is thinking…')}<div class="uno-top"><span>BOT · ${state.bot.length} cards</span><span class="uno-card ${top.color}">${esc(top.value.toUpperCase())}</span><span>YOU · ${state.hand.length} cards</span></div><div class="uno-hand">${state.hand.map((c,i)=>`<button class="uno-card ${c.color}" data-action="play" data-index="${i}" ${state.done||state.turn!=='you'||!canUno(c)?'disabled':''}>${esc(c.value)}</button>`).join('')}</div><div class="game-inline-actions">${btn('Draw card','draw')}${btn('New match','restart')}</div>`);}
  function botUno(){if(state.done)return;const i=state.bot.findIndex(canUno);if(i>=0){const c=state.bot.splice(i,1)[0];state.discard.push(c);if(!state.bot.length){state.done=true;say('Bot played its last card. New match?');record(0);return;}}else drawUno('bot');state.turn='you';renderUno();}
  function actUno(a,i){if(state.done||state.turn!=='you')return;if(a==='draw'){drawUno('you');state.turn='bot';renderUno();timer=setTimeout(botUno,650);return;}if(a==='play'&&state.hand[i]&&canUno(state.hand[i])){state.discard.push(state.hand.splice(i,1)[0]);if(!state.hand.length){state.done=true;say('UNO! You emptied your hand and won.');record(1);renderUno();return;}state.turn='bot';renderUno();timer=setTimeout(botUno,650);}}

  // Connect Four local hot-seat
  function initConnect(){state={grid:Array(42).fill(0),turn:1,done:false,moves:0};renderConnect();}
  function renderConnect(){showBoard(`${gameHeader('Connect Four',`Player ${state.turn||1} turn`)}<div class="connect-grid">${state.grid.map((v,i)=>`<button class="connect-cell ${v===1?'red':v===2?'yellow':''}" data-action="drop" data-index="${i%7}" aria-label="Column ${i%7+1}" ${v||state.done?'disabled':''}></button>`).join('')}</div><div class="game-inline-actions">${btn('New match','restart')}</div>`);}
  function actConnect(col){if(state.done)return;let row=-1;for(let r=5;r>=0;r--){const idx=r*7+col;if(!state.grid[idx]){row=r;break;}}if(row<0)return;state.grid[row*7+col]=state.turn;state.moves++;if(checkFour(state.grid,row,col,state.turn)){state.done=true;say(`Player ${state.turn} connects four and wins!`);record(state.turn===1?1:0);}else if(state.moves===42){state.done=true;say('Board full — draw game.');record(0);}else state.turn=state.turn===1?2:1;renderConnect();}
  function checkFour(g,r,c,p){for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){let count=1;for(const sign of [-1,1]){let y=r+dr*sign,x=c+dc*sign;while(y>=0&&y<6&&x>=0&&x<7&&g[y*7+x]===p){count++;y+=dr*sign;x+=dc*sign;}}if(count>=4)return true;}return false;}

  // Drawing canvas
  function initDraw(){showBoard(`${gameHeader('Sketch pad','Draw with mouse, touch or stylus')}<div class="draw-tools"><label>Brush <input id="drawColor" type="color" value="#8b6cff"></label><label>Size <input id="drawSize" type="range" min="2" max="28" value="7"></label>${btn('Clear canvas','clear')}</div><canvas id="drawCanvas" width="720" height="420" class="draw-canvas"></canvas>`);const c=$('#drawCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#101725';ctx.fillRect(0,0,c.width,c.height);ctx.lineCap='round';ctx.lineJoin='round';let down=false;const pos=e=>{const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};};c.addEventListener('pointerdown',e=>{down=true;c.setPointerCapture(e.pointerId);const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});c.addEventListener('pointermove',e=>{if(!down)return;const p=pos(e);ctx.strokeStyle=$('#drawColor').value;ctx.lineWidth=Number($('#drawSize').value);ctx.lineTo(p.x,p.y);ctx.stroke();});['pointerup','pointercancel'].forEach(x=>c.addEventListener(x,()=>down=false));}

  // Rock Paper Scissors
  function initRps(){state={wins:0,loss:0,round:0,done:false};renderRps();}
  function renderRps(){showBoard(`${gameHeader('Best of five',`${state.wins} wins · ${state.loss} losses`)}<div class="rps-choices">${[['rock','✊'],['paper','✋'],['scissors','✌️']].map(([v,i])=>`<button class="rps-choice" data-action="choose" data-value="${v}">${i}</button>`).join('')}</div><div class="rps-result">${state.last||'Make your move'}</div>${btn('New match','restart')}`);}
  function actRps(v){if(state.done)return;const bot=pick(['rock','paper','scissors']);const win={rock:'scissors',paper:'rock',scissors:'paper'};state.round++;if(v!==bot){if(win[v]===bot)state.wins++;else state.loss++;}state.last=`You: ${v} · CPU: ${bot} · ${v===bot?'Draw':win[v]===bot?'You win the round':'CPU wins the round'}`;if(state.wins===3||state.loss===3){state.done=true;say(state.wins===3?'Match won!':'CPU won the match.');record(state.wins);}renderRps();}

  // Stripmine grid
  function initStripmine(){state={ore:new Set(),revealed:new Set(),picks:12,score:0};while(state.ore.size<10)state.ore.add(rand(0,35));renderStripmine();}
  function renderStripmine(){showBoard(`${gameHeader('Underground layer',`${state.picks} picks left · ${state.score} finds`)}<div class="strip-grid">${Array.from({length:36},(_,i)=>`<button class="strip-cell ${state.revealed.has(i)?'dug':''}" data-action="dig" data-index="${i}" ${state.revealed.has(i)||state.picks===0?'disabled':''}>${state.revealed.has(i)?(state.ore.has(i)?'💎':'·'):'⛏'}</button>`).join('')}</div>${btn('New layer','restart')}`);}
  function actStripmine(i){if(state.revealed.has(i)||!state.picks)return;state.revealed.add(i);state.picks--;if(state.ore.has(i)){state.score+=1;say('Ore found!');}else say('Empty stone. Keep exploring.');if(state.picks===0){say(`Layer complete: ${state.score} ore finds.`);record(state.score);}renderStripmine();}

  // 2048-style Upgrader
  function initUpgrader(){state={grid:Array(16).fill(0),score:0,done:false};add2048();add2048();renderUpgrader();}
  function add2048(){const empty=state.grid.map((v,i)=>v?null:i).filter(v=>v!==null);if(empty.length)state.grid[pick(empty)]=Math.random()<.9?2:4;}
  function renderUpgrader(){showBoard(`${gameHeader('Tile upgrader',`Best tile ${Math.max(...state.grid)}`)}<div class="upgrade-grid">${state.grid.map(v=>`<div class="upgrade-cell v${Math.min(v,2048)}">${v||''}</div>`).join('')}</div><div class="touch-pad"><button data-action="move" data-value="up">↑</button><div><button data-action="move" data-value="left">←</button><button data-action="move" data-value="down">↓</button><button data-action="move" data-value="right">→</button></div></div><p class="game-subhint">Use arrow keys, WASD or the controls.</p>${btn('New board','restart')}`);}
  function move2048(dir){if(active!=='upgrader'||state.done)return;const g=state.grid,rows=[];for(let r=0;r<4;r++){const row=Array.from({length:4},(_,c)=>g[dir==='left'||dir==='right'?r*4+c:(dir==='up'||dir==='down'?c*4+r:0)]);rows.push(row);}let changed=false;for(let ri=0;ri<4;ri++){let line=rows[ri];if(dir==='right'||dir==='down')line.reverse();const compact=line.filter(Boolean),out=[];for(let i=0;i<compact.length;i++){if(compact[i]===compact[i+1]){out.push(compact[i]*2);i++;}else out.push(compact[i]);}while(out.length<4)out.push(0);if(dir==='right'||dir==='down')out.reverse();rows[ri]=out;}const ng=Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++){const val=rows[r][c];const idx=dir==='left'||dir==='right'?r*4+c:c*4+r;ng[idx]=val;}changed=ng.some((v,i)=>v!==g[i]);if(changed){state.grid=ng;add2048();}renderUpgrader();const max=Math.max(...state.grid);if(max>=2048){say('Amazing! You reached 2048.');record(max);}else if(!canMove2048()){say('No moves left. Start a new board.');record(max);}}
  function canMove2048(){for(let r=0;r<4;r++)for(let c=0;c<4;c++){const i=r*4+c;if(!state.grid[i]||c<3&&state.grid[i]===state.grid[i+1]||r<3&&state.grid[i]===state.grid[i+4])return true;}return false;}
  function actUpgrader(a,v){if(a==='move')move2048(v);}

  // Limbo number guess
  function initLimbo(){state={target:rand(1,10),tries:3,done:false};renderLimbo();}
  function renderLimbo(){showBoard(`${gameHeader('Find the hidden number',`${state.tries} guesses remaining`)}<div class="limbo-number">?</div><div class="number-pad">${Array.from({length:10},(_,i)=>`<button data-action="guess" data-index="${i+1}">${i+1}</button>`).join('')}</div>${btn('New number','restart')}`);}
  function actLimbo(a,n){if(state.done)return;if(a==='guess'){state.tries--;if(n===state.target){state.done=true;say('Correct! You found the hidden number.');record(3-state.tries);}else if(!state.tries){state.done=true;say(`Out of guesses. The number was ${state.target}.`);record(0);}else say(n<state.target?'Higher! Try again.':'Lower! Try again.');renderLimbo();}}

  // Plinko
  function initPlinko(){state={score:0,last:null};renderPlinko();}
  function renderPlinko(){const rows=7;showBoard(`${gameHeader('Plinko drop','Choose a starting lane')}<div class="plinko-board">${Array.from({length:rows},(_,r)=>`<div class="plinko-row">${Array.from({length:r+3},()=>'<i></i>').join('')}</div>`).join('')}<div class="plinko-slots">${Array.from({length:9},(_,i)=>`<span class="${state.last===i?'landed':''}">${i+1}</span>`).join('')}</div></div><div class="game-inline-actions">${[1,2,3,4,5,6,7].map(n=>btn(`Lane ${n}`,'drop', 'lane-button')).join('')}</div><p class="game-subhint">Last slot: ${state.last===null?'—':state.last+1}</p>`);board().querySelectorAll('[data-action="drop"]').forEach((el,i)=>el.dataset.value=String(i));}
  function actPlinko(v){const lane=Number(v);const slot=Math.max(0,Math.min(8,Math.round(lane+rand(-2,2))));state.last=slot;state.score+=Math.max(0,4-Math.abs(4-slot));say(`The ball landed in slot ${slot+1}. Personal score: ${state.score}.`);record(state.score);renderPlinko();}

  // Hilo
  function initHilo(){state={current:rand(2,14),streak:0,done:false};renderHilo();}
  function renderHilo(){showBoard(`${gameHeader('Higher or lower',`Current card ${state.current} · Streak ${state.streak}`)}<div class="hilo-card">${state.current===14?'A':state.current===11?'J':state.current===12?'Q':state.current===13?'K':state.current} <span>♠</span></div><div class="choice-row">${btn('⬆ Higher','guess','choice')}${btn('⬇ Lower','guess','choice')}</div>${btn('Start over','restart')}`);const b=board().querySelectorAll('[data-action="guess"]');b[0].dataset.value='higher';b[1].dataset.value='lower';}
  function actHilo(v){if(state.done)return;const next=rand(2,14),correct=v==='higher'?next>state.current:next<state.current;if(next===state.current){say('Same rank — streak stays safe.');}else if(correct){state.streak++;say(`Correct! Next card: ${next}.`);}else{state.done=true;say(`The next card was ${next}. Run ended at ${state.streak}.`);record(state.streak);}state.current=next;renderHilo();}

  // Odd/even
  function initDouble(){state={streak:0,rounds:0,last:null};renderDouble();}
  function renderDouble(){showBoard(`${gameHeader('Odd or even',`Correct streak: ${state.streak}`)}<div class="dice-cube">${state.last??'⚄'}</div><div class="choice-row">${btn('ODD','pick','choice')}${btn('EVEN','pick','choice')}</div>`);const b=board().querySelectorAll('[data-action="pick"]');b[0].dataset.value='odd';b[1].dataset.value='even';}
  function actDouble(v){const n=rand(1,6),good=(n%2?'odd':'even')===v;state.rounds++;state.streak=good?state.streak+1:0;state.last=['⚀','⚁','⚂','⚃','⚄','⚅'][n-1];say(`Rolled ${n} — ${good?'correct':'streak reset'}.`);record(state.streak);renderDouble();}

  // Roulette - color call only, no betting UI
  function initRoulette(){state={spins:0,correct:0};renderRoulette();}
  function renderRoulette(){showBoard(`${gameHeader('Color wheel','Predict the landing color')}<div class="roulette-wheel"><span>0</span></div><div class="choice-row">${['red','black','green'].map(c=>btn(c.toUpperCase(),'color','choice')).join('')}</div>`);['red','black','green'].forEach((c,i)=>{board().querySelectorAll('[data-action="color"]')[i].dataset.value=c;});}
  function actRoulette(v){const r=pick(['red','black','black','red','green']);state.spins++;if(v===r)state.correct++;say(`The wheel stopped on ${r}. ${v===r?'Good prediction!':'Try another prediction.'} ${state.correct}/${state.spins} correct.`);record(state.correct);renderRoulette();}

  // Pig race
  function initPigRace(){state={running:false,pos:[0,0,0],winner:null,chosen:0};showBoard(`${gameHeader('Pig race','Pick a lane before the start')}<div class="pig-race">${['🐷','🐽','🐖'].map((p,i)=>`<div class="pig-lane"><span>${p}</span><i></i><b>FINISH</b></div>`).join('')}</div><div class="choice-row">${[0,1,2].map(i=>btn(`Choose pig ${i+1}`,'choose', 'choice')).join('')}</div>${btn('Start race','start')}`);}
  function actPigRace(a,v){if(a==='choose'&&!state.running){state.chosen=Number(v);say(`Pig ${state.chosen+1} selected.`);}if(a==='start'&&!state.running){state.running=true;tick=setInterval(()=>{state.pos=state.pos.map(p=>Math.min(100,p+rand(1,7)));state.pos.forEach((p,i)=>{const lane=$('#gameBoard').querySelectorAll('.pig-lane i')[i];lane.style.width=p+'%';});const winner=state.pos.findIndex(p=>p>=100);if(winner>=0){clearInterval(tick);tick=null;state.running=false;state.winner=winner;say(`Pig ${winner+1} wins the race! ${state.chosen===winner?'Your pick was first!':'Nice race — try again.'}`);record(state.chosen===winner?1:0);}} ,180);}}

  // Fictional chart prediction
  function initStocks(){state={price:50,history:[50],correct:0,round:0};renderStocks();}
  function renderStocks(){const max=Math.max(...state.history)+5,min=Math.min(...state.history)-5;const points=state.history.map((v,i)=>`${i*100/(state.history.length-1||1)},${90-(v-min)/(max-min||1)*80}`).join(' ');showBoard(`${gameHeader('Fictional trend lab',`Practice predictions · ${state.round} candles`)}<div class="stock-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${points}"/></svg></div><div class="stock-value">${state.price.toFixed(2)} <small>SIMULATED INDEX</small></div><div class="choice-row">${btn('↗ Predict up','predict','choice')}${btn('↘ Predict down','predict','choice')}</div>`);const b=board().querySelectorAll('[data-action="predict"]');b[0].dataset.value='up';b[1].dataset.value='down';}
  function actStocks(v){const next=state.price*(1+(rand(-35,35)/1000));const actual=next>=state.price?'up':'down';state.correct+=v===actual?1:0;state.price=next;state.history.push(next);state.round++;say(`Next candle moved ${actual}. ${state.correct}/${state.round} correct predictions.`);record(state.correct);renderStocks();}

  // Sliding puzzle
  function initSlide(){state={tiles:[...Array.from({length:15},(_,i)=>i+1),0],moves:0,done:false};let previous=-1;for(let k=0;k<120;k++){const z=state.tiles.indexOf(0),candidates=[z-4,z+4,...(z%4?[z-1]:[]),...(z%4<3?[z+1]:[])].filter(i=>i>=0&&i<16&&Math.abs(Math.floor(i/4)-Math.floor(z/4))+Math.abs(i%4-z%4)===1&&i!==previous);const next=pick(candidates);previous=z;[state.tiles[z],state.tiles[next]]=[state.tiles[next],state.tiles[z]];}state.moves=0;renderSlide();}
  function renderSlide(){showBoard(`${gameHeader('Number slide',`${state.moves} moves`)}<div class="slide-grid">${state.tiles.map((v,i)=>`<button class="slide-tile ${!v?'empty':''}" data-action="tile" data-index="${i}" ${!v||state.done?'disabled':''}>${v||''}</button>`).join('')}</div><div class="touch-pad"><button data-action="move" data-value="-4">↑</button><div><button data-action="move" data-value="-1">←</button><button data-action="move" data-value="4">↓</button><button data-action="move" data-value="1">→</button></div></div>${btn('New shuffle','restart')}`);}
  function actSlide(i){const z=state.tiles.indexOf(0),r=Math.floor(i/4),c=i%4,zr=Math.floor(z/4),zc=z%4;if(Math.abs(r-zr)+Math.abs(c-zc)!==1)return;[state.tiles[z],state.tiles[i]]=[state.tiles[i],state.tiles[z]];state.moves++;if(state.tiles.every((v,k)=>v===(k+1)%16)){state.done=true;say(`Solved in ${state.moves} moves!`);record(state.moves,true);}renderSlide();}
  function moveSlideBlank(delta){const z=state.tiles.indexOf(0),i=z-delta;if(i<0||i>=16||Math.abs(Math.floor(i/4)-Math.floor(z/4))+Math.abs(i%4-z%4)!==1)return;actSlide(i);}

  // Chicken crossing
  function initChicken(){state={step:0,obstacles:Array.from({length:9},()=>rand(0,2)),done:false,score:0};renderChicken();}
  function renderChicken(){showBoard(`${gameHeader('Cross the road',`Crossing ${state.step}/9`)}<div class="chicken-road">${Array.from({length:9},(_,i)=>`<div class="road-lane ${i<state.step?'current':''}"><small>${i+1}</small> ${i<state.step?'✓':'🚧  ·  🚗  ·  🚧'}</div>`).join('')}</div><div class="lane-choices">${[0,1,2].map(l=>btn(`Lane ${l+1}`,'lane','choice')).join('')}</div>${btn('New crossing','restart')}`);board().querySelectorAll('[data-action="lane"]').forEach((el,i)=>el.dataset.value=String(i));}
  function actChicken(a,v){if(state.done||a!=='lane')return;const lane=Number(v),hazard=state.obstacles[state.step];state.step++;if(lane===hazard){state.done=true;say(`A car blocked lane ${lane+1}. You crossed ${state.step-1} sections.`);record(state.step-1);}else if(state.step>=9){state.done=true;say('You crossed safely!');record(9);}else say('Clear lane — keep moving.');renderChicken();}

  // Keno as fixed daily-pattern puzzle
  function daySeed(){return new Date().toISOString().slice(0,10);}
  function seededNumbers(){let seed=daySeed().split('').reduce((a,c)=>a+c.charCodeAt(0),17);const next=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};const arr=[];while(arr.length<5){const n=Math.floor(next()*20)+1;if(!arr.includes(n))arr.push(n);}return arr;}
  function initKeno(){state={chosen:new Set(),target:new Set(seededNumbers()),done:false};renderKeno();}
  function renderKeno(){showBoard(`${gameHeader('Daily number pattern',`${state.chosen.size}/5 selected`)}<div class="keno-grid">${Array.from({length:20},(_,i)=>i+1).map(n=>`<button data-action="select" data-index="${n}" class="${state.chosen.has(n)?'selected':''}" ${state.done?'disabled':''}>${n}</button>`).join('')}</div>${btn('Check pattern','check')}${btn('Reset picks','restart')}`);}
  function actKeno(n,a){if(a==='select'&&!state.done){if(state.chosen.has(n))state.chosen.delete(n);else if(state.chosen.size<5)state.chosen.add(n);renderKeno();}else if(a==='check'&&state.chosen.size===5){state.done=true;const match=[...state.chosen].filter(x=>state.target.has(x)).length;say(`${match} of 5 matched today's pattern. Come back tomorrow for a new layout.`);record(match);renderKeno();}}

  // Blitz reaction grid
  function initBlitz(){state={time:15,hits:0,target:rand(0,24),running:false};renderBlitz();}
  function renderBlitz(){showBoard(`${gameHeader('Blitz reflex','15-second target challenge')}<div class="blitz-timer">${state.time}s</div><div class="blitz-grid">${Array.from({length:25},(_,i)=>`<button data-action="hit" data-index="${i}" class="${i===state.target?'target':''}" ${!state.running?'disabled':''}>${i===state.target?'✦':''}</button>`).join('')}</div>${btn(state.running?'Round running':'Start 15 seconds','start',state.running?'disabled':'')}`);}
  function actBlitz(a,i){if(a==='start'&&!state.running){state.time=15;state.hits=0;state.target=rand(0,24);state.running=true;renderBlitz();tick=setInterval(tickBlitz,1000);return;}if(!state.running||a!=='hit')return;if(i===state.target){state.hits++;state.target=rand(0,24);renderBlitz();}}
  function tickBlitz(){state.time--;const t=$('.blitz-timer');if(t)t.textContent=state.time+'s';if(state.time<=0){clearInterval(tick);tick=null;state.running=false;say(`Time! You hit ${state.hits} targets.`);record(state.hits);renderBlitz();}}

  // Snake
  function initSnake(){state={snake:[{x:5,y:5},{x:4,y:5},{x:3,y:5}],dir:'right',food:{x:rand(0,11),y:rand(0,11)},score:0,running:true,over:false};renderSnake();tick=setInterval(stepSnake,180);}
  function renderSnake(){showBoard(`${gameHeader('Snake',`Dots collected: ${state.score}`)}<div class="snake-grid">${Array.from({length:144},(_,i)=>{const x=i%12,y=Math.floor(i/12);return `<i class="${state.snake.some(p=>p.x===x&&p.y===y)?'snake-part':state.food.x===x&&state.food.y===y?'snake-food':''}"></i>`;}).join('')}</div><div class="snake-controls"><button data-action="dir" data-value="up">↑</button><div><button data-action="dir" data-value="left">←</button><button data-action="dir" data-value="down">↓</button><button data-action="dir" data-value="right">→</button></div></div>${btn('Restart snake','restart')}`);}
  function snakeDirection(d){const opposite={up:'down',down:'up',left:'right',right:'left'};if(d!==opposite[state.dir])state.dir=d;}
  function stepSnake(){if(active!=='snakes'||state.over)return;const delta={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[state.dir];const head={x:state.snake[0].x+delta[0],y:state.snake[0].y+delta[1]};if(head.x<0||head.x>=12||head.y<0||head.y>=12||state.snake.some((p,i)=>i>0&&p.x===head.x&&p.y===head.y)){state.over=true;clearInterval(tick);tick=null;say(`Game over. You collected ${state.score} dots.`);record(state.score);return;}state.snake.unshift(head);if(head.x===state.food.x&&head.y===state.food.y){state.score++;do{state.food={x:rand(0,11),y:rand(0,11)};}while(state.snake.some(p=>p.x===state.food.x&&p.y===state.food.y));}else state.snake.pop();renderSnake();}
  function actSnake(a,v){if(a==='dir')snakeDirection(v);}

  // Daily race, date-seeded obstacle layout
  function initDailyRace(){const seed=daySeed().split('').reduce((a,c)=>a+c.charCodeAt(0),0);state={lane:1,turn:0,score:0,done:false,obstacles:Array.from({length:12},(_,i)=>((seed*(i+3)+i*7)%5===0?(seed*(i+11)+i*13)%3:-1))};renderDailyRace();}
  function renderDailyRace(){showBoard(`${gameHeader('Daily track',`Distance ${state.turn}/12`)}<div class="daily-track">${state.obstacles.map((o,i)=>`<div class="daily-row ${i===state.turn?'active':''}"><small>${i+1}</small>${[0,1,2].map(l=>`<span class="${state.turn>i&&state.lane===l&&i===state.turn-1?'runner':''} ${state.turn>i&&o===l?'blocked':''}">${state.turn>i&&o===l?'✕':state.turn>i&&state.lane===l&&i===state.turn-1?'🏃':'·'}</span>`).join('')}</div>`).join('')}</div><div class="lane-choices">${[0,1,2].map(l=>btn(`Lane ${l+1}`,'lane','choice')).join('')}</div>`);board().querySelectorAll('[data-action="lane"]').forEach((el,i)=>el.dataset.value=String(i));}
  function actDailyRace(a,v){if(state.done)return;const lane=Number(v),hazard=state.obstacles[state.turn];state.turn++;if(hazard===lane){state.done=true;say(`Obstacle hit at distance ${state.turn}. Try tomorrow's daily track or restart for practice.`);record(state.turn-1);}else{state.score++;state.lane=lane;if(state.turn===12){state.done=true;say('Daily course complete! Great run.');record(state.score);}else say('Clear! Pick your next lane.');}renderDailyRace();}

  function actSlideOrPath(){}
  function actionFromButton(e){const b=e.target.closest('[data-action="clear"]');if(b){const c=$('#drawCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#101725';ctx.fillRect(0,0,c.width,c.height);}}
  function init(){renderCatalog();mountEvents();$('#gameBoard').addEventListener('click',actionFromButton);}
  window.DonutGames={init,showGame,back,games};
})();
