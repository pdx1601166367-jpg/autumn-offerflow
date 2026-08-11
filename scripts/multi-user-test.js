const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8125';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let failed = 0;
  const ok = (name, cond, extra) => {
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' [' + extra + ']' : ''));
    if (!cond) failed++;
  };
  const step = async (name, fn) => {
    try { await fn(); } catch (e) { ok(name, false, e.message.split('\n')[0]); }
  };
  const stamp = Date.now().toString(36);
  const alice = 'alice_' + stamp;
  const bob = 'bob_' + stamp;
  const pass = 'test123456';

  const register = async (username) => {
    await page.click('[data-action="open-account"]');
    await page.fill('#authUser', username);
    await page.fill('#authPass', pass);
    await page.click('[data-action="auth-register"]');
    await page.waitForFunction(() => document.getElementById('modalRoot').hidden === true, null, { timeout: 15000 });
  };
  const login = async (username) => {
    await page.click('[data-action="open-account"]');
    await page.fill('#authUser', username);
    await page.fill('#authPass', pass);
    await page.click('[data-action="auth-login"]');
    await page.waitForFunction(() => document.getElementById('modalRoot').hidden === true, null, { timeout: 15000 });
  };
  const logout = async () => {
    await page.click('[data-action="open-account"]');
    await page.click('[data-action="auth-logout"]');
    await page.waitForFunction(() => document.getElementById('modalRoot').hidden === true, null, { timeout: 15000 });
  };

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.hero-band h2');

  await step('register alice and sync item', async () => {
    await register(alice);
    ok('alice registered', (await page.textContent('#aiPillText')).includes('云同步'));
    await page.goto(BASE + '/#/tracker', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.click('[data-action="open-app-modal"]');
    await page.fill('#fCompany', '同步公司A');
    await page.fill('#fRole', 'AI 产品经理');
    await page.fill('#fCity', '北京');
    await page.click('[data-action="save-app"]');
    await page.waitForTimeout(1800);
    ok('alice item saved locally', (await page.textContent('#trackerBody')).includes('同步公司A'));
  });

  await step('bob sees isolated empty state', async () => {
    await logout();
    await register(bob);
    ok('bob registered', (await page.textContent('#aiPillText')).includes('云同步'));
    await page.goto(BASE + '/#/tracker', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    ok('bob state isolated', !(await page.textContent('#trackerBody')).includes('同步公司A'));
  });

  await step('alice data restored from cloud', async () => {
    await logout();
    await login(alice);
    await page.goto(BASE + '/#/tracker', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.innerText.includes('同步公司A'), null, { timeout: 15000 });
    ok('alice cloud data restored', (await page.textContent('#trackerBody')).includes('同步公司A'));
  });

  await step('resources feed refresh', async () => {
    const d = await page.evaluate(async (feedUrl) => {
      const r = await fetch('/api/resources/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl }),
        cache: 'no-store'
      });
      return r.json();
    }, BASE + '/server/feed.example.json');
    ok('resources refresh ok', d.ok === true, (d.error || ''));
    const list = await page.evaluate(() => fetch('/api/resources', { cache: 'no-store' }).then(r => r.json()));
    ok('resources item merged', (list.items || []).some(x => x.company === '云端测试公司'));
  });

  await step('resources cloud sync badge', async () => {
    await page.goto(BASE + '/#/resources', { waitUntil: 'load' });
    await page.waitForSelector('#resSyncBadge');
    await page.waitForFunction(() => document.querySelector('#resSyncBadge').textContent.includes('云端已同步'), null, { timeout: 10000 });
    ok('resources cloud sync badge', true);
  });

  await step('api auth check', async () => {
    const token = await page.evaluate(() => localStorage.getItem('offerflow:token'));
    const me = await page.evaluate((t) => fetch('/api/me', { headers: { Authorization: 'Bearer ' + t } }).then(r => r.json()), token);
    ok('api me works', me.user && me.user.username === alice);
  });

  ok('no console errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await context.close();
  await browser.close();
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILURES');
  process.exit(failed === 0 ? 0 : 1);
})();
