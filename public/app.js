const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function api(path, body) {
  const response = await fetch('/api/' + path, body === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'Something went wrong.'), { status: response.status });
  return result;
}

function message(selector, text, isError = false) {
  const node = $(selector);
  node.textContent = text;
  node.className = isError ? 'msg err' : 'msg';
}

let me = null;
let currentTab = 'home';

async function loadMe() {
  try {
    me = await api('me');
    renderProfile();
    $('#auth').hidden = true;
    $('#app').hidden = false;
    showTab(currentTab);
    await loadChat();
  } catch {
    me = null;
    $('#auth').hidden = false;
    $('#app').hidden = true;
  }
}

function renderProfile() {
  const first = (me.name || 'D').charAt(0).toUpperCase();
  $('#who').textContent = me.name;
  $('#homeName').textContent = me.name;
  $('#homeIgn').textContent = me.ign ? `Minecraft: ${me.ign}` : 'Minecraft IGN not set';
  $('#avatar').textContent = first;
  $('#homeAvatar').textContent = first;
  $('#profileAvatar').textContent = first;
  $('#ign').value = me.ign || '';
  $('#adm').hidden = !me.admin;
  $('#memberSince').textContent = `Member since ${me.createdAt || 'today'}`;
}

function showTab(tab) {
  const allowed = ['home', 'games', 'wallet', 'chat', 'profile'];
  currentTab = allowed.includes(tab) ? tab : 'home';
  if (currentTab !== 'games') window.DonutGames?.back();
  document.querySelectorAll('.tab-section').forEach(section => {
    section.hidden = section.id !== `tab-${currentTab}`;
  });
  document.querySelectorAll('.nav [data-tab]').forEach(button => {
    button.classList.toggle('on', button.dataset.tab === currentTab);
  });
  if (currentTab === 'chat') loadChat();
}

document.querySelectorAll('.nav [data-tab]').forEach(button => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
});
document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => showTab(button.dataset.go));
});

async function authenticate(kind) {
  try {
    await api(kind, { name: $('#u').value.trim(), password: $('#pw').value });
    $('#pw').value = '';
    await loadMe();
  } catch (error) { message('#authMsg', error.message, true); }
}
$('#login').addEventListener('click', () => authenticate('login'));
$('#register').addEventListener('click', () => authenticate('register'));
$('#pw').addEventListener('keydown', event => {
  if (event.key === 'Enter') authenticate('login');
});
$('#logout').addEventListener('click', async () => {
  await api('logout', {});
  location.reload();
});

$('#saveIgn').addEventListener('click', async () => {
  try {
    await api('profile', { ign: $('#ign').value.trim() });
    message('#ignMsg', 'Profile saved.');
    await loadMe();
  } catch (error) { message('#ignMsg', error.message, true); }
});

// Chat
function chatRow(item) {
  const own = item.name === me.name;
  const initial = esc((item.name || '?').charAt(0).toUpperCase());
  return `<article class="chat-message ${own ? 'own' : ''}">
    <span class="chat-avatar">${initial}</span>
    <div class="chat-bubble"><div class="chat-meta"><b>${esc(item.name)}</b><time>${esc(item.at)}</time></div><p>${esc(item.text)}</p></div>
  </article>`;
}

async function loadChat() {
  if (!me) return;
  try {
    const result = await api('chat');
    const box = $('#chatBox');
    const wasNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    box.innerHTML = result.messages.length
      ? result.messages.map(chatRow).join('')
      : '<div class="chat-empty"><span>✧</span><b>It is quiet here</b><p>Send the first message and say hello.</p></div>';
    if (wasNearBottom) box.scrollTop = box.scrollHeight;
  } catch (error) {
    if (error.status === 401) loadMe();
  }
}

async function sendChat() {
  const text = $('#chatMsg').value.trim();
  if (!text) return;
  $('#chatSend').disabled = true;
  try {
    await api('chat', { text });
    $('#chatMsg').value = '';
    await loadChat();
  } catch (error) {
    // Display the rate-limit message in the chat hint instead of silently failing.
    $('.chat-foot').textContent = error.message;
  } finally {
    $('#chatSend').disabled = false;
  }
}
$('#chatSend').addEventListener('click', sendChat);
$('#chatMsg').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChat();
  }
});

// The complete 30-game arcade is mounted independently from the community shell.
window.DonutGames?.init();
loadMe();
setInterval(() => { if (me && currentTab === 'chat') loadChat(); }, 5000);

// Wallet presentation controls: intentionally visual-only until an owner-supplied backend is connected.
document.querySelectorAll('[data-wallet-action]').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.walletAction === 'deposit' ? 'Deposit' : 'Withdraw';
    const note = document.getElementById('walletNotice');
    if (note) note.textContent = `${action} is not connected yet. Add your verified wallet service to enable this action.`;
  });
});
