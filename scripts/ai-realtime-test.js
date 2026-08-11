const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8123';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARK_KEY = process.env.ARK_KEY || '';
const ARK_MODEL = process.env.ARK_MODEL || 'ep-m-20260607002345-lbn6s';
const ARK_BASE = process.env.ARK_BASE || 'https://ark.cn-beijing.volces.com/api/v3';

(async () => {
  if (!ARK_KEY) {
    console.log('FAIL missing ARK_KEY');
    process.exit(1);
  }
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
  await page.evaluate(([k, m, b]) => {
    localStorage.setItem('offerflow:v1', JSON.stringify({
      profile: { name: '林同学', role: 'AI 产品经理', aiEnabled: true, apiKey: k, apiBase: b, model: m },
      apps: [], reviews: [], favorites: [], mastered: [], resumes: [], selfTests: [], solved: [], tasks: [], practice: []
    }));
  }, [ARK_KEY, ARK_MODEL, ARK_BASE]);
  await page.reload({ waitUntil: 'load' });

  await step('real ai mock advice', async () => {
    await page.click('.nav-item[data-id="mock"]');
    await page.waitForSelector('#mockTrack');
    await page.click('[data-action="start-mock"]');
    await page.waitForSelector('#mockTimer');
    await page.fill('#mockAnswer', 'AI 产品经理要负责场景判断、模型选型、评测集和成本控制，并推动算法与研发一起落地。');
    await page.click('[data-action="submit-answer"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#aiAdvice');
      return el && el.textContent.includes('AI 增强建议');
    }, null, { timeout: 90000 });
    const advice = await page.textContent('#aiAdvice');
    ok('real ai advice rendered', advice.length > 40, advice.slice(0, 60));
  });

  await step('real ai follow-up', async () => {
    await page.click('#aiFollowBtn');
    await page.waitForSelector('.toast', { hasText: '已插入一道 AI 追问' }, { timeout: 90000 });
    await page.click('[data-action="next-question"]');
    await page.waitForSelector('#mockTimer');
    const q = await page.locator('#view .card h2').first().textContent();
    ok('real ai follow-up question', q && q.trim().length > 4, q.trim().slice(0, 60));
    await page.click('[data-action="quit-mock"]');
  });

  await step('real ai resume rewrite', async () => {
    await page.goto(BASE + '/#/resume', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#resumeText', '张三\n求职意向：AI 产品经理\n技能：熟悉大模型应用、RAG、评测集\n项目：主导智能客服项目，人工介入率降低 25%。');
    await page.click('[data-action="ai-rewrite"]');
    await page.waitForSelector('#aiRewritten', { timeout: 90000 });
    const v = await page.inputValue('#aiRewritten');
    ok('real ai resume rewrite', v.trim().length > 30, v.trim().slice(0, 60));
  });

  await step('real ai solver analysis', async () => {
    await page.goto(BASE + '/#/solver', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#solverInput', '设计一个 AI 客服产品，请给出完整方案。');
    await page.selectOption('#solverType', { index: 5 });
    await page.click('[data-action="solve"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#solverResult');
      return el && el.textContent.includes('AI 深度解析');
    }, null, { timeout: 90000 });
    const t = await page.textContent('#solverResult');
    ok('real ai solver analysis', t.length > 100, t.slice(0, 60));
  });

  await step('real ai resume match', async () => {
    await page.goto(BASE + '/#/resume', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#resumeText', '张三\n求职意向：AI 产品经理\n技能：熟悉大模型应用、RAG、评测集\n项目：主导智能客服项目，人工介入率降低 25%。');
    await page.fill('#jdText', 'AI 产品经理：熟悉大模型应用、RAG、评测集、数据分析，有智能客服或知识库产品经验优先。');
    await page.click('[data-action="ai-match"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#resumeResult');
      return el && el.textContent.includes('AI 深度匹配结果');
    }, null, { timeout: 90000 });
    const t = await page.textContent('#resumeResult');
    ok('real ai resume match', t.includes('匹配分') || t.length > 120, t.slice(0, 60));
  });

  await step('real ai agent planning', async () => {
    await page.goto(BASE + '/#/agent', { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.fill('#agentGoal', '帮我准备阿里 AI 产品经理面试，还有 10 天');
    await page.click('[data-action="run-agent"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#agentResultWrap');
      return el && el.textContent.includes('AI 驱动');
    }, null, { timeout: 180000 });
    const t = await page.textContent('#agentResultWrap');
    ok('real ai agent llm planning', t.includes('LLM 决策') && t.includes('analyze_jd'));
  });

  ok('no console errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await context.close();
  await browser.close();
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILURES');
  process.exit(failed === 0 ? 0 : 1);
})();
