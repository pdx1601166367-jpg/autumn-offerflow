const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { scrapeWhitelist } = require('./scraper');

function loadEnvFile() {
  const p = path.join(__dirname, '.env.local');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
loadEnvFile();

const PORT = Number(process.env.PORT || 8125);
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const RESOURCES_FILE = path.join(DATA_DIR, 'resources.json');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const WHITELIST_CONFIG_FILE = path.join(__dirname, 'sources', 'whitelist.json');
const MAX_BODY = 6 * 1024 * 1024;

const AI_API_KEY = process.env.AI_API_KEY || process.env.ARK_API_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');
const AI_MODEL = process.env.AI_MODEL || 'ep-m-20260607002345-lbn6s';
const AI_DAILY_LIMIT_PER_USER = Number(process.env.AI_DAILY_LIMIT_PER_USER || 60);
const AI_GUEST_DAILY = Number(process.env.AI_GUEST_DAILY || 10);
const WHITELIST_URLS = (process.env.WHITELIST_URLS || '').split(',').map(s => s.trim()).filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }));
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: {} }));
  if (!fs.existsSync(RESOURCES_FILE)) fs.writeFileSync(RESOURCES_FILE, JSON.stringify({ updatedAt: null, items: [] }));
  if (!fs.existsSync(USAGE_FILE)) fs.writeFileSync(USAGE_FILE, JSON.stringify({ date: todayKey(), users: {}, ips: {} }));
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const keys = ['profile', 'apps', 'reviews', 'favorites', 'mastered', 'resumes', 'selfTests', 'solved', 'practice', 'tasks'];
  const out = {};
  keys.forEach(k => {
    if (k === 'profile') out[k] = raw[k] && typeof raw[k] === 'object' ? raw[k] : {};
    else out[k] = Array.isArray(raw[k]) ? raw[k] : [];
  });
  return out;
}

ensureData();
let users = readJson(USERS_FILE, { users: [] });
let sessions = readJson(SESSIONS_FILE, { sessions: {} });
let resources = readJson(RESOURCES_FILE, { updatedAt: null, items: [] });
let jobRuns = [];
let usage = readJson(USAGE_FILE, { date: todayKey(), users: {}, ips: {} });

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function saveUsage() { writeJson(USAGE_FILE, usage); }

function consumeQuota(identity, limit) {
  if (usage.date !== todayKey()) usage = { date: todayKey(), users: {}, ips: {} };
  const map = identity.startsWith('u:') ? usage.users : usage.ips;
  const used = map[identity] || 0;
  if (used >= limit) return false;
  map[identity] = used + 1;
  saveUsage();
  return true;
}

function saveUsers() { writeJson(USERS_FILE, users); }
function saveSessions() { writeJson(SESSIONS_FILE, sessions); }
function saveResources() { writeJson(RESOURCES_FILE, resources); }

function recordJob(type, ok, added) {
  jobRuns.unshift({ type, at: new Date().toISOString(), ok, added });
  jobRuns = jobRuns.slice(0, 20);
}

function whitelistEntries() {
  try {
    const arr = JSON.parse(fs.readFileSync(WHITELIST_CONFIG_FILE, 'utf8'));
    if (Array.isArray(arr) && arr.length) return arr;
  } catch (e) {}
  return WHITELIST_URLS.map(url => ({ url, render: false }));
}

const refreshLimit = {};

function refreshRateLimited(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  refreshLimit[key] = (refreshLimit[key] || []).filter(t => now - t < 3600e3);
  if (refreshLimit[key].length >= 10) return true;
  refreshLimit[key].push(now);
  return false;
}

function sanitizeResourceItem(raw) {
  const type = ['campus', 'intern', 'state'].includes(raw.type) ? raw.type : 'campus';
  return {
    type,
    company: String(raw.company || '').trim(),
    batch: String(raw.batch || '').trim(),
    date: String(raw.date || '').trim(),
    roles: String(raw.roles || '').trim(),
    cities: String(raw.cities || '').trim(),
    link: String(raw.link || '').trim(),
    note: String(raw.note || '').trim()
  };
}

async function callAIProxy(messages, maxTokens) {
  if (!AI_API_KEY) return { error: '服务端未配置 AI Key（AI_API_KEY）' };
  const res = await fetch(AI_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_API_KEY },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.6, max_tokens: maxTokens || 900 }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error('upstream ' + res.status);
  const data = await res.json();
  return { content: data.choices && data.choices[0] ? data.choices[0].message.content : null };
}

async function refreshResources(feedUrl, entries) {
  let added = 0;
  const merge = raw => {
    const item = sanitizeResourceItem(raw);
    if (!item.company) return;
    const dup = resources.items.some(x => x.type === item.type && x.company === item.company && x.batch === item.batch);
    if (dup) return;
    resources.items.push(item);
    added++;
  };
  if (feedUrl) {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('feed fetch failed');
    const data = await res.json();
    const incoming = Array.isArray(data) ? data : (data.items || []);
    incoming.forEach(merge);
  }
  const list = Array.isArray(entries) ? entries : [];
  for (const e of list) {
    const scraped = await scrapeWhitelist(e.url, { company: e.company, render: !!e.render, timeoutMs: 30000 });
    scraped.forEach(merge);
  }
  if (feedUrl || list.length) resources.updatedAt = new Date().toISOString();
  saveResources();
  return { added, total: resources.items.length };
}

const FEED_URL = process.env.RESOURCES_FEED_URL || '';

function scheduleRefresh() {
  if (!FEED_URL && !WHITELIST_URLS.length) return;
  const check = () => {
    const now = new Date();
    const last = resources.updatedAt ? new Date(resources.updatedAt) : null;
    const stale = !last || (Date.now() - last.getTime() > 12 * 3600e3);
    const dailySlot = now.getHours() === 9;
    const ranToday = last && last.toDateString() === now.toDateString();
    if (stale && dailySlot && !ranToday) {
      if (FEED_URL) refreshResources(FEED_URL, '').then(r => recordJob('daily-feed', true, r.added)).catch(() => recordJob('daily-feed', false, 0));
      whitelistEntries().forEach(e => refreshResources('', [e]).then(r => recordJob('daily-scrape', true, r.added)).catch(() => recordJob('daily-scrape', false, 0)));
    } else if (stale) {
      if (FEED_URL) refreshResources(FEED_URL, '').then(r => recordJob('feed', true, r.added)).catch(() => recordJob('feed', false, 0));
      whitelistEntries().forEach(e => refreshResources('', [e]).then(r => recordJob('scrape', true, r.added)).catch(() => recordJob('scrape', false, 0)));
    }
  };
  check();
  setInterval(check, 3600e3);
}

function rateLimited(ip) {
  const key = ip || 'unknown';
  if (!rateLimit[key]) rateLimit[key] = [];
  const now = Date.now();
  rateLimit[key] = rateLimit[key].filter(t => now - t < 60000);
  if (rateLimit[key].length >= 20) return true;
  rateLimit[key].push(now);
  return false;
}
const rateLimit = {};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const userId = sessions.sessions[token];
  if (!userId) return null;
  return users.users.find(u => u.id === userId) || null;
}

function sendJson(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (pathname === '/' || !path.extname(pathname)) filePath = path.join(ROOT, 'index.html');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    if (filePath === path.join(ROOT, 'index.html')) {
      content = content.toString('utf8').replace('</head>', '<script>window.OFFERFLOW_BACKEND=true</script></head>');
    }
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/system/status' && req.method === 'GET') {
        const now = new Date();
        const next = new Date(now);
        next.setHours(9, 0, 0, 0);
        if (now >= next) next.setDate(next.getDate() + 1);
        return sendJson(res, 200, {
          version: '2.0',
          aiConfigured: !!AI_API_KEY,
          aiModel: AI_MODEL,
          feedConfigured: !!FEED_URL,
          resourcesUpdatedAt: resources.updatedAt,
          resourcesCount: resources.items.length,
          userCount: users.users.length,
          jobRuns: jobRuns.slice(0, 5),
          nextDailyRun: next.toISOString(),
          aiCallsToday: Object.values(usage.users || {}).reduce((a, b) => a + b, 0) + Object.values(usage.ips || {}).reduce((a, b) => a + b, 0),
          quotaPerUser: AI_DAILY_LIMIT_PER_USER,
          guestQuota: AI_GUEST_DAILY,
          usageDate: usage.date
        });
      }
      if (pathname === '/api/ai/chat' && req.method === 'POST') {
        if (rateLimited(req.socket.remoteAddress)) return sendJson(res, 429, { error: '请求过于频繁，请稍后再试' });
        const body = await readBody(req);
        const user = authUser(req);
        const identity = user ? 'u:' + user.id : 'ip:' + req.socket.remoteAddress;
        if (!consumeQuota(identity, user ? AI_DAILY_LIMIT_PER_USER : AI_GUEST_DAILY)) return sendJson(res, 429, { error: '今日 AI 调用次数已达上限' });
        if (!Array.isArray(body.messages) || !body.messages.length) return sendJson(res, 400, { error: 'messages 不能为空' });
        try {
          const r = await callAIProxy(body.messages, body.max_tokens);
          if (r.error) return sendJson(res, 503, { error: r.error });
          return sendJson(res, 200, { content: r.content });
        } catch (e) {
          return sendJson(res, 502, { error: 'AI 上游调用失败：' + e.message });
        }
      }
      if (pathname === '/api/ai/vision' && req.method === 'POST') {
        if (rateLimited(req.socket.remoteAddress)) return sendJson(res, 429, { error: '请求过于频繁，请稍后再试' });
        const body = await readBody(req);
        const user = authUser(req);
        const identity = user ? 'u:' + user.id : 'ip:' + req.socket.remoteAddress;
        if (!consumeQuota(identity, user ? AI_DAILY_LIMIT_PER_USER : AI_GUEST_DAILY)) return sendJson(res, 429, { error: '今日 AI 调用次数已达上限' });
        if (!body.image) return sendJson(res, 400, { error: '缺少图片' });
        try {
          const r = await callAIProxy([
            { role: 'system', content: '你是简历 OCR 助手。请把图片中的文字完整、按原结构提取出来，保留换行；不要翻译、不要总结、不要添加评论。' },
            { role: 'user', content: [{ type: 'text', text: '提取这张简历图片中的全部文字：' }, { type: 'image_url', image_url: { url: body.image } }] }
          ], 2000);
          if (r.error) return sendJson(res, 503, { error: r.error });
          return sendJson(res, 200, { content: r.content });
        } catch (e) {
          return sendJson(res, 502, { error: 'AI 上游调用失败：' + e.message });
        }
      }
      if (pathname === '/api/resources' && req.method === 'GET') {
        return sendJson(res, 200, { items: resources.items, updatedAt: resources.updatedAt });
      }
      if (pathname === '/api/resources/refresh' && req.method === 'POST') {
        if (refreshRateLimited(req.socket.remoteAddress)) return sendJson(res, 429, { error: '刷新过于频繁，请稍后再试' });
        const body = await readBody(req);
        const feedUrl = (body && body.feedUrl) || FEED_URL;
        const whitelistUrl = (body && body.whitelistUrl) || '';
        if (!feedUrl && !whitelistUrl && !WHITELIST_URLS.length) return sendJson(res, 400, { error: '未配置校招数据源（RESOURCES_FEED_URL / WHITELIST_URLS）' });
        try {
          let added = 0;
          let total = resources.items.length;
          if (feedUrl) {
            const r = await refreshResources(feedUrl, '');
            added += r.added;
            total = r.total;
            recordJob('manual-refresh', true, r.added);
          }
          const wl = whitelistUrl ? [{ url: whitelistUrl, render: false }] : whitelistEntries();
          for (const e of wl) {
            const r = await refreshResources('', [e]);
            added += r.added;
            total = r.total;
            recordJob('manual-scrape', true, r.added);
          }
          return sendJson(res, 200, { ok: true, added, total, updatedAt: resources.updatedAt });
        } catch (e) {
          recordJob('manual-sources', false, 0);
          return sendJson(res, 502, { error: '数据源抓取失败：' + e.message });
        }
      }
      if (pathname === '/api/resources/import' && req.method === 'POST') {
        const user = authUser(req);
        if (!user) return sendJson(res, 401, { error: '请先登录' });
        const body = await readBody(req);
        const incoming = Array.isArray(body.items) ? body.items : [];
        let added = 0;
        incoming.forEach(raw => {
          const item = sanitizeResourceItem(raw);
          if (!item.company) return;
          const dup = resources.items.some(x => x.type === item.type && x.company === item.company && x.batch === item.batch);
          if (dup) return;
          resources.items.push(item);
          added++;
        });
        if (incoming.length) resources.updatedAt = new Date().toISOString();
        saveResources();
        recordJob('import', true, added);
        return sendJson(res, 200, { ok: true, added, total: resources.items.length });
      }
      if (pathname === '/api/register' && req.method === 'POST') {
        if (rateLimited(req.socket.remoteAddress)) return sendJson(res, 429, { error: '请求过于频繁，请稍后再试' });
        const body = await readBody(req);
        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        if (!/^[\w\u4e00-\u9fa5-]{2,24}$/.test(username)) return sendJson(res, 400, { error: '用户名需为 2-24 位中英文、数字或下划线' });
        if (password.length < 6) return sendJson(res, 400, { error: '密码至少 6 位' });
        if (users.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return sendJson(res, 409, { error: '用户名已存在' });
        const salt = crypto.randomBytes(16).toString('hex');
        const user = { id: crypto.randomUUID(), username, salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString(), state: {} };
        users.users.push(user);
        saveUsers();
        const token = newToken();
        sessions.sessions[token] = user.id;
        saveSessions();
        return sendJson(res, 201, { token, user: { id: user.id, username: user.username } });
      }

      if (pathname === '/api/login' && req.method === 'POST') {
        if (rateLimited(req.socket.remoteAddress)) return sendJson(res, 429, { error: '请求过于频繁，请稍后再试' });
        const body = await readBody(req);
        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        const user = users.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user || user.passwordHash !== hashPassword(password, user.salt)) return sendJson(res, 401, { error: '用户名或密码错误' });
        const token = newToken();
        sessions.sessions[token] = user.id;
        saveSessions();
        return sendJson(res, 200, { token, user: { id: user.id, username: user.username } });
      }

      if (pathname === '/api/logout' && req.method === 'POST') {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : '';
        delete sessions.sessions[token];
        saveSessions();
        return sendJson(res, 200, { ok: true });
      }

      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: '请先登录' });

      if (pathname === '/api/me' && req.method === 'GET') {
        return sendJson(res, 200, { user: { id: user.id, username: user.username } });
      }
      if (pathname === '/api/state' && req.method === 'GET') {
        return sendJson(res, 200, { state: user.state || {} });
      }
      if (pathname === '/api/state' && req.method === 'PUT') {
        const body = await readBody(req);
        user.state = sanitizeState(body.state);
        saveUsers();
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { error: 'not found' });
    } catch (e) {
      return sendJson(res, 400, { error: e.message === 'too large' ? '数据过大' : '请求格式错误' });
    }
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('OfferFlow server listening on http://127.0.0.1:' + PORT);
  scheduleRefresh();
});
