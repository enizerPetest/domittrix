const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function request(path, body) {
  const response = await fetch('/api/' + path, body === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

function showMessage(message, isError = false) {
  const node = $('#adminMsg');
  node.textContent = message;
  node.className = isError ? 'admin-message error' : 'admin-message';
}

async function load() {
  try {
    const data = await request('admin');
    $('#userCount').textContent = data.users.length;
    $('#users tbody').innerHTML = data.users.map(user => `
      <tr>
        <td><b>${esc(user.name)}</b>${user.admin ? ' <span class="admin-badge">ADMIN</span>' : ''}</td>
        <td>${esc(user.ign || '—')}</td>
        <td>${esc(user.created_at || '—')}</td>
        <td><span class="state ${user.banned ? 'suspended' : 'active'}">${user.banned ? 'Suspended' : 'Active'}</span></td>
        <td>${user.admin ? '—' : `<button class="small-button" data-user="${user.id}" data-banned="${user.banned ? '0' : '1'}">${user.banned ? 'Restore' : 'Suspend'}</button>`}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="mut">No members yet.</td></tr>';

    $('#messages').innerHTML = data.messages.map(message => `
      <div class="admin-message-row">
        <div><b>${esc(message.name)}</b><p>${esc(message.text)}</p><small>${esc(message.at)}</small></div>
        <button class="small-button danger" data-message="${message.id}">Delete</button>
      </div>`).join('') || '<p class="mut">No messages yet.</p>';

    document.querySelectorAll('[data-user]').forEach(button => {
      button.addEventListener('click', async () => {
        const banned = button.dataset.banned === '1';
        try {
          await request(`admin/users/${button.dataset.user}/ban`, { banned });
          showMessage(banned ? 'Account suspended.' : 'Account restored.');
          await load();
        } catch (error) { showMessage(error.message, true); }
      });
    });

    document.querySelectorAll('[data-message]').forEach(button => {
      button.addEventListener('click', async () => {
        try {
          await request(`admin/messages/${button.dataset.message}/delete`, {});
          showMessage('Message deleted.');
          await load();
        } catch (error) { showMessage(error.message, true); }
      });
    });
  } catch (error) {
    if (error.message === 'Admins only.' || error.message === 'Please log in first.') {
      document.body.innerHTML = '<main class="admin-main"><div class="card"><h1>Admin access required</h1><p class="mut">Sign in with an administrator account first.</p><a href="index.html">Go to DonutTrix</a></div></main>';
    } else showMessage(error.message, true);
  }
}

load();
setInterval(load, 15000);
