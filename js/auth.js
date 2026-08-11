(function () {
  const LS_TOKEN = 'offerflow:token';
  const LS_USER = 'offerflow:user';
  const LS_API = 'offerflow:api';

  function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function apiBase() {
    return (localStorage.getItem(LS_API) || '').replace(/\/+$/, '');
  }
  function token() {
    return localStorage.getItem(LS_TOKEN) || '';
  }
  function user() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch (e) { return null; }
  }
  function setSession(t, u) {
    if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN);
    if (u) localStorage.setItem(LS_USER, JSON.stringify(u)); else localStorage.removeItem(LS_USER);
    if (window.__onAuthChange) window.__onAuthChange();
  }

  async function request(path, opts) {
    if (!window.OFFERFLOW_BACKEND && !apiBase()) throw new Error('当前为纯静态模式，请运行 node server/server.js');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    const res = await fetch(apiBase() + path, Object.assign({}, opts, { headers, cache: 'no-store' }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  async function register(username, password) {
    const d = await request('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    setSession(d.token, d.user);
    return d;
  }
  async function login(username, password) {
    const d = await request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setSession(d.token, d.user);
    return d;
  }
  async function logout() {
    try { await request('/api/logout', { method: 'POST' }); } catch (e) {}
    setSession(null, null);
  }
  async function getState() { return request('/api/state'); }
  async function putState(state) { return request('/api/state', { method: 'PUT', body: JSON.stringify({ state }) }); }
  async function check() {
    if (!token()) return null;
    try {
      const d = await request('/api/me');
      setSession(token(), d.user);
      return d.user;
    } catch (e) {
      setSession(null, null);
      return null;
    }
  }

  async function submit(mode) {
    const u = document.getElementById('authUser');
    const p = document.getElementById('authPass');
    const msg = document.getElementById('authMsg');
    if (!u || !p) return;
    try {
      if (mode === 'login') await login(u.value.trim(), p.value);
      else await register(u.value.trim(), p.value);
      const root = document.getElementById('modalRoot');
      root.hidden = true;
      root.innerHTML = '';
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }
  }

  function openAccountModal() {
    const root = document.getElementById('modalRoot');
    if (!root) return;
    const u = user();
    root.hidden = false;
    if (u) {
      root.innerHTML = '<div class="modal"><div class="modal-head"><h3>账号</h3><button class="icon-btn" data-action="close-modal">' + Icon('x') + '</button></div><div class="modal-body"><div class="answer-block"><h4>当前账号</h4><p>用户名：' + esc(u.username) + '</p><p>数据已开启云端同步。</p></div><div class="note" style="margin-top:12px">退出后本机保留离线缓存，重新登录可恢复云端数据。</div></div><div class="modal-foot"><button class="btn" data-action="close-modal">关闭</button><button class="btn btn-danger" data-action="auth-logout">退出登录</button></div></div>';
    } else {
      root.innerHTML = '<div class="modal"><div class="modal-head"><h3>登录 / 注册</h3><button class="icon-btn" data-action="close-modal">' + Icon('x') + '</button></div><div class="modal-body"><div class="form-grid"><div class="form-item full"><label>用户名</label><input id="authUser" autocomplete="username"></div><div class="form-item full"><label>密码</label><input id="authPass" type="password" autocomplete="current-password"></div></div><div id="authMsg" style="font-size:12.5px;color:var(--red);min-height:18px;margin-top:8px"></div><div class="note">注册后你的收藏、投递、复盘、练习记录都会同步到云端，换设备也能继续；访客模式数据只保存在本机，每日 AI 使用限 10 次。</div></div><div class="modal-foot"><button class="btn" data-action="close-modal">访客体验演示版</button><button class="btn" data-action="auth-register">注册</button><button class="btn btn-primary" data-action="auth-login">登录</button></div></div>';
    }
  }

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'auth-login') submit('login');
    if (el.dataset.action === 'auth-register') submit('register');
    if (el.dataset.action === 'auth-logout') {
      logout();
      const root = document.getElementById('modalRoot');
      root.hidden = true;
      root.innerHTML = '';
    }
  });

  window.Auth = { apiBase, token, user, register, login, logout, getState, putState, check, openAccountModal, submit };
})();
