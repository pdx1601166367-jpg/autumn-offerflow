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

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.hero-band h2');
  ok('backend ai pill', (await page.textContent('#aiPillText')).includes('云端 AI'));

  const username = 'ai_' + Date.now().toString(36);
  await step('register and run backend agent', async () => {
    await page.click('[data-action="open-account"]');
    await page.fill('#authUser', username);
    await page.fill('#authPass', 'test123456');
    await page.click('[data-action="auth-register"]');
    await page.waitForFunction(() => document.getElementById('modalRoot').hidden === true, null, { timeout: 15000 });
    await page.goto(BASE + '/#/agent', { waitUntil: 'load' });
    await page.fill('#agentGoal', '帮我准备腾讯 AI 产品经理面试，还有 7 天');
    await page.click('[data-action="run-agent"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#agentResultWrap');
      return el && el.textContent.includes('AI 驱动') && el.textContent.includes('analyze_jd');
    }, null, { timeout: 240000 });
    const t = await page.textContent('#agentResultWrap');
    ok('backend agent ai driven', t.includes('LLM 决策') && t.includes('analyze_jd'));
  });

  await step('backend solver ai', async () => {
    await page.goto(BASE + '/#/solver', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#solverInput', '设计一个 AI 客服产品，请给出完整方案。');
    await page.selectOption('#solverType', { index: 5 });
    await page.click('[data-action="solve"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#solverResult');
      return el && el.textContent.includes('AI 深度解析');
    }, null, { timeout: 120000 });
    ok('backend solver calls model', (await page.textContent('#solverResult')).length > 80);
  });

  ok('no console errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await context.close();
  await browser.close();
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILURES');
  process.exit(failed === 0 ? 0 : 1);
})();
