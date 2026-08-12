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

  await step('backend settings no user key', async () => {
    await page.click('[data-action="open-settings"]');
    const s = await page.textContent('#modalRoot');
    ok('backend settings shows cloud gateway', s.includes('多人版 AI 服务') && s.includes('server/data/users.json'));
    ok('backend settings hides personal key', await page.locator('#setKey').count() === 0 && await page.locator('#setPreset').count() === 0);
    await page.click('[data-action="close-modal"]');
  });

  const username = 'ai_' + Date.now().toString(36);
  await step('register and run backend agent', async () => {
    await page.click('[data-action="open-account"]');
    await page.fill('#authUser', username);
    await page.fill('#authPass', 'test123456');
    await page.click('[data-action="auth-register"]');
    await page.waitForFunction(() => document.getElementById('modalRoot').hidden === true, null, { timeout: 15000 });
    const token = await page.evaluate(() => localStorage.getItem('offerflow:token'));
    const importRes = await page.evaluate(async (t) => {
      const items = [{ type: 'campus', company: '云端检索公司', batch: '秋招', date: '2026-08-11', roles: 'AI 产品经理', cities: '北京', link: '', note: 'agent retrieval test' }];
      return fetch('/api/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ items }),
        cache: 'no-store'
      }).then(r => r.json());
    }, token);
    ok('import job for agent retrieval', importRes.ok === true);
    await page.goto(BASE + '/#/agent', { waitUntil: 'load' });
    await page.waitForSelector('#agentDropZone');
    ok('agent onboarding shown', (await page.textContent('#view')).includes('先让我了解你'));
    const resumeText = 'Name: Zhang San\nSchool: Zhejiang Gongshang University\nMajor: Advertising\nDegree: Bachelor\nGraduation: 2027\nExperience: ByteDance intern, Product Assistant\nProject: AI fitness assistant with RAG and Prompt\nSkills: SQL, Python, RAG, Prompt Engineering';
    await page.setInputFiles('#agentResumeFile', { name: 'resume.txt', mimeType: 'text/plain', buffer: Buffer.from(resumeText, 'utf8') });
    await page.waitForFunction(() => document.body.innerText.includes('我从你的简历中识别出了这些信息'), null, { timeout: 90000 });
    await page.click('[data-action="agent-confirm-profile"]');
    await page.waitForFunction(() => document.body.innerText.includes('你现在想做什么'), null, { timeout: 15000 });
    await page.click('[data-action="agent-role"][data-value="AI 产品经理"]');
    await page.click('[data-action="agent-stage"][data-value="准备秋招"]');
    await page.click('[data-action="agent-goals-done"]');
    await page.waitForFunction(() => document.body.innerText.includes('求职画像'), null, { timeout: 15000 });
    const profileOk = await page.evaluate(() => {
      const up = JSON.parse(localStorage.getItem('offerflow:v1')).userProfile;
      return up && up.complete && up.goals.roles.includes('AI 产品经理') && up.goals.stage === '准备秋招';
    });
    ok('user profile created', profileOk === true);
    await page.click('[data-action="agent-onboard"]');
    await page.waitForFunction(() => document.body.innerText.includes('先让我了解你'), null, { timeout: 15000 });
    ok('agent onboard edit clickable', true);
    await page.click('[data-action="agent-skip"]');
    await page.waitForFunction(() => document.body.innerText.includes('求职画像'), null, { timeout: 15000 });
    await page.fill('#agentGoal', '帮我分析云端检索公司 AI 产品经理岗位适不适合');
    await page.click('[data-action="run-agent"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#agentResultWrap');
      return el && el.textContent.includes('AI 驱动') && el.textContent.includes('云端检索公司');
    }, null, { timeout: 240000 });
    const t = await page.textContent('#agentResultWrap');
    ok('backend agent retrieves imported job', t.includes('LLM 决策') && t.includes('云端检索公司'));
  });

  await step('resources cloud note', async () => {
    await page.goto(BASE + '/#/resources', { waitUntil: 'load' });
    await page.waitForSelector('#resSyncBadge');
    await page.waitForFunction(() => document.querySelector('#resSyncBadge').textContent.includes('云端数据'), null, { timeout: 10000 });
    const t = await page.textContent('#view');
    ok('resources note reflects cloud data', t.includes('云端聚合数据') && !t.includes('内置演示数据'));
    await page.click('[data-action="tab-res"][data-value="intern"]');
    await page.waitForFunction(() => document.querySelector('#resTable') && document.querySelector('#resTable').textContent.includes('信息来源'), null, { timeout: 10000 });
    ok('resources source field shown', (await page.textContent('#resTable')).includes('信息来源'));
    await page.click('[data-action="tab-res"][data-value="campus"]');
    await page.waitForSelector('[data-action="apply-resource"]');
    await page.click('[data-action="apply-resource"]');
    await page.waitForSelector('#fCompany');
    ok('resources tabs and apply clickable', true);
    await page.click('[data-action="close-modal"]');
  });

  await step('backend ai rewrite without user key', async () => {
    await page.goto(BASE + '/#/resume', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#resumeText', '张三\n求职意向：AI 产品经理\n技能：RAG、评测集\n项目：主导智能客服，人工介入率降 25%。');
    await page.fill('#jdText', 'AI 产品经理：熟悉大模型应用、RAG、数据分析。');
    await page.click('[data-action="ai-rewrite"]');
    await page.waitForSelector('#aiRewritten', { timeout: 90000 });
    ok('backend ai rewrite works without user key', (await page.inputValue('#aiRewritten')).length > 30);
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
