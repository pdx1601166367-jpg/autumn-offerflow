const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8123';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
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
  const goto = async (u) => { await page.goto(u, { waitUntil: 'load' }); await page.waitForTimeout(250); };

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.hero-band h2');
  await page.waitForTimeout(300);
  ok('dashboard hero', (await page.textContent('.hero-band h2')).includes('今天也准备充分一点'));
  ok('guest banner shown', (await page.textContent('#view')).includes('访客演示模式'));
  ok('dashboard no stat cards', await page.locator('.stat-card').count() === 0);
  ok('dashboard full-width cards', await page.locator('#view .card.panel').count() >= 4);
  ok('dashboard no split layout', await page.locator('#view .split').count() === 0);

  await step('task add edit delete', async () => {
    await page.click('[data-action="open-task-modal"]');
    await page.fill('#taskTitle', '测试任务');
    await page.fill('#taskNote', '这是备注');
    await page.click('[data-action="save-task"]');
    ok('task added', (await page.textContent('#view')).includes('测试任务'));
    await page.locator('.list-row', { hasText: '测试任务' }).locator('[data-action="edit-task"]').click();
    await page.fill('#taskTitle', '任务已改');
    await page.click('[data-action="save-task"]');
    ok('task edited', (await page.textContent('#view')).includes('任务已改'));
    await page.locator('.list-row', { hasText: '任务已改' }).locator('[data-action="delete-task"]').click();
    ok('task deleted', !(await page.textContent('#view')).includes('任务已改'));
  });

  await step('mock session', async () => {
    await page.click('.nav-item[data-id="mock"]');
    await page.waitForSelector('#mockTrack');
    ok('mock custom count', await page.locator('#mockCount[type=number]').count() === 1);
    await page.click('[data-action="start-mock"]');
    await page.waitForSelector('#mockTimer');
    ok('mock session started', await page.locator('#mockTimer').count() === 1);
    const hasSR = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const voiceCount = await page.locator('#voiceBtn').count();
    ok('mock voice button', hasSR ? voiceCount === 1 : voiceCount === 0);
    await page.fill('#mockAnswer', '闭包就是函数能访问外部变量，比如计数器。事件监听没解绑会导致内存泄漏，应该及时解绑并置空引用。');
    await page.click('[data-action="submit-answer"]');
    await page.waitForSelector('.ring');
    ok('mock feedback rendered', await page.locator('.ring b').count() > 0);
    ok('mock reference answer shown', (await page.textContent('#mockFeedback')).includes('参考答案'));
    ok('mock next button', await page.locator('[data-action="next-question"]').count() > 0);
    await page.click('[data-action="quit-mock"]');
  });

  await step('practice analytics', async () => {
    await goto(BASE + '/');
    const dailyCat = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.card.panel')).find(c => c.textContent.includes('每日一题'));
      const qText = card ? card.querySelector('p').textContent : '';
      const q = window.Data.questions.find(x => qText.includes(x.q));
      return q ? q.cat : '';
    });
    ok('daily question product related', dailyCat === 'AI 产品' || dailyCat === '产品', dailyCat);
    const t = await page.textContent('#view');
    ok('radar card shown', t.includes('能力雷达'));
    ok('practice streak shown', t.includes('连续练习'));
    const hasPractice = await page.evaluate(() => {
      const raw = localStorage.getItem('offerflow:v1');
      return raw ? JSON.parse(raw).practice.length > 0 : false;
    });
    ok('practice record saved', hasPractice);
    await goto(BASE + '/#/bank');
    ok('bank practice badge', await page.locator('.q-meta .badge', { hasText: '练过' }).count() > 0);
  });

  await step('weekly report', async () => {
    await goto(BASE + '/');
    ok('weekly report shown', (await page.textContent('#view')).includes('本周学习报告'));
    const dp = page.waitForEvent('download');
    await page.click('[data-action="export-week"]');
    const d = await dp;
    ok('weekly report exported', d.suggestedFilename().includes('offerflow-week'));
  });

  await step('agent workbench', async () => {
    await goto(BASE + '/#/agent');
    ok('agent nav present', await page.locator('.nav-item[data-id="agent"]').count() === 1);
    await page.waitForSelector('#agentDropZone');
    await page.click('[data-action="agent-skip"]');
    ok('agent onboarding skip to home', await page.locator('#agentGoal').count() === 1);
    await page.click('[data-action="agent-starter"]');
    await page.waitForTimeout(200);
    ok('task starter no auto run', (await page.textContent('#agentResultWrap')).includes('还没有执行任务'));
    await page.fill('#agentGoal', '帮我准备阿里 AI 产品经理面试，还有 10 天');
    await page.click('[data-action="run-agent"]');
    await page.waitForSelector('#agentResultWrap');
    await page.waitForFunction(() => document.body.innerText.includes('AI 助手执行轨迹'));
    const t = await page.textContent('#agentResultWrap');
    ok('agent trace shown', t.includes('analyze_jd') && t.includes('recommend_questions'));
    ok('agent mode badge', t.includes('本地降级') || t.includes('AI 驱动'));
    ok('agent plan shown', t.includes('Day 1'));
    ok('agent tasks shown', t.includes('建议行动任务'));
    ok('agent jd full text', t.includes('查看 JD 全文'));
    ok('agent missing jd help', t.includes('未检索到该岗位官方 JD'));
    ok('agent recommended questions', await page.locator('[data-action="agent-practice"]').count() > 0);
    ok('agent final conclusion points', t.includes('最终结论') && t.includes('1.') && t.includes('5.'));
    await page.click('[data-action="agent-confirm-tasks"]');
    await page.waitForTimeout(300);
    const taskCount = await page.evaluate(() => JSON.parse(localStorage.getItem('offerflow:v1')).tasks.length);
    ok('agent tasks created', taskCount > 0);
    await page.click('[data-action="agent-save-job"]');
    await page.waitForTimeout(300);
    ok('agent job saved', await page.evaluate(() => JSON.parse(localStorage.getItem('offerflow:v1')).apps.some(a => a.channel === 'AI 助手')));
  });

  await step('solver', async () => {
    await goto(BASE + '/#/solver');
    await page.fill('#solverInput', '给定整数数组 nums 和目标值 target，找出和为目标值的那两个整数并返回下标，这是经典的两数之和问题。');
    await page.selectOption('#solverType', { index: 0 });
    await page.click('[data-action="solve"]');
    await page.waitForSelector('#solverResult .answer-block');
    const t = await page.textContent('#solverResult');
    ok('solver matched', t.includes('两数之和') && t.includes('复杂度'));
    await page.waitForSelector('[data-action="toggle-solved"]');
    await page.click('[data-action="toggle-solved"]');
    ok('solved answer view', await page.locator('#solvedList .answer-block').first().isVisible());
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('#solverImage', { name: 'question.png', mimeType: 'image/png', buffer: png });
    await page.waitForSelector('.tag', { hasText: '已加载图片' });
    await page.click('[data-action="clear-solver-image"]');
    ok('solver image upload clear', await page.locator('.tag', { hasText: '已加载图片' }).count() === 0);
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'pasted.png', { type: 'image/png' }));
      const ta = document.querySelector('#solverInput');
      ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForSelector('.tag', { hasText: '已加载图片' });
    ok('solver image paste', true);
    await page.click('[data-action="clear-solver-image"]');
  });

  await step('resume', async () => {
    await goto(BASE + '/#/resume');
    ok('resume agent button', await page.locator('[data-action="resume-agent"]').count() === 1);
    await page.fill('#resumeText', '张三\n求职意向：前端开发工程师\n教育背景：某大学 计算机科学与技术 本科\n技能：React、Vue、TypeScript、Node.js\n项目经历：主导电商订单模块重构，性能提升40%，覆盖10万用户。\n实习经历：某公司前端实习生，完成日常迭代需求。');
    await page.click('[data-action="diagnose-resume"]');
    await page.waitForSelector('#resumeResult .ring');
    ok('resume diagnosis', (await page.textContent('#resumeResult')).includes('综合诊断'));
  });

  await step('resume image upload', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('#resumeImg', { name: 'resume.png', mimeType: 'image/png', buffer: png });
    await page.waitForSelector('#resumeImgPreview img');
    ok('resume image preview', true);
    await page.click('[data-action="clear-resume-image"]');
    ok('resume image cleared', await page.locator('#resumeImgPreview img').count() === 0);
  });

  await step('tracker add', async () => {
    await goto(BASE + '/#/tracker');
    await page.click('[data-action="open-app-modal"]');
    ok('tracker link field', await page.locator('#fLink').count() === 1);
    await page.fill('#fCompany', '测试科技');
    await page.fill('#fRole', '前端工程师');
    await page.fill('#fCity', '北京');
    await page.fill('#fLink', 'https://example.com/job');
    await page.fill('#fInterviewAt', '2026-08-20T10:00');
    await page.selectOption('#fRemind', '30');
    await page.click('[data-action="save-app"]');
    await page.waitForTimeout(300);
    ok('tracker add', (await page.textContent('#trackerBody')).includes('测试科技'));
    ok('tracker link saved', await page.locator('a[href="https://example.com/job"]').count() > 0);
    await goto(BASE + '/');
    const calendarCard = await page.locator('.card.panel', { hasText: '面试日历' }).textContent();
    ok('interview calendar new app', calendarCard.includes('测试科技'));
  });

  await step('kanban edit icon', async () => {
    await goto(BASE + '/#/tracker');
    await page.click('[data-action="tracker-view"][data-value="kanban"]');
    await page.waitForSelector('.kcard');
    ok('kanban edit icon svg', await page.locator('.kcard button[data-action="edit-app"] svg').count() > 0);
  });

  await step('interview calendar seed', async () => {
    await goto(BASE + '/');
    const card = await page.locator('.card.panel', { hasText: '面试日历' }).textContent();
    ok('interview calendar shown', card.includes('面试日历'));
    ok('calendar countdown shown', card.includes('天后') || card.includes('小时后'));
    ok('calendar upcoming entries', card.includes('测试科技'));
  });

  await step('bank toggle', async () => {
    await goto(BASE + '/#/bank');
    await page.locator('[data-action="toggle-q"]').first().click();
    ok('bank answer toggle', await page.locator('.q-answer').first().isVisible());
    const qaText = await page.locator('.q-answer').first().textContent();
    ok('bank answer structured', qaText.includes('标准答案') && qaText.includes('答题思路与要点'));
  });

  await step('solver product problems', async () => {
    await goto(BASE + '/#/solver');
    const n = await page.evaluate(() => window.Data.solverDb.filter(p => p.type === '产品').length);
    ok('solver product problems >= 8', n >= 8, String(n));
    const rendered = await page.locator('#view .q-card').count();
    ok('whiteboard only product', rendered === n, rendered + ' / ' + n);
  });

  await step('self-test', async () => {
    await goto(BASE + '/#/self-test');
    ok('salary calculator removed', !(await page.textContent('#view')).includes('薪资期望计算'));
    await page.click('[data-action="start-test"]');
    await page.waitForSelector('input[type=radio]');
    await page.evaluate(() => {
      document.querySelectorAll('input[type=radio]').forEach((r, i) => {
        if (i % 4 === 0) r.checked = true;
      });
    });
    await page.click('[data-action="submit-test"]');
    await page.waitForSelector('h2', { hasText: '行动清单' });
    ok('self-test result', true);
  });

  await step('reviews seed', async () => {
    await goto(BASE + '/#/reviews');
    ok('reviews seed list', (await page.textContent('#reviewList')).includes('前端'));
    await page.click('[data-action="agent-review-diagnosis"]');
    await page.waitForSelector('.modal-head h3', { hasText: '复盘诊断' });
    await page.click('[data-action="diag-create-tasks"]');
    await page.waitForTimeout(300);
    ok('review diagnosis tasks created', await page.evaluate(() => JSON.parse(localStorage.getItem('offerflow:v1')).tasks.some(t => t.note === '复盘诊断生成')));
    const dp = page.waitForEvent('download');
    await page.locator('[data-action="export-review"]').first().click();
    const d = await dp;
    ok('review exported', d.suggestedFilename().includes('offerflow-review'));
  });

  await step('resources link column', async () => {
    await goto(BASE + '/#/resources');
    ok('resources link header', (await page.textContent('#resTable')).includes('投递链接'));
    ok('resources link anchor', await page.locator('#resTable a[target="_blank"]').count() > 0);
    const hrefs = await page.$$eval('#resTable a[target="_blank"]', as => as.map(a => a.href));
    ok('resources no gank links', hrefs.every(h => !h.includes('gankinterview')));
    ok('resources official links exist', hrefs.some(h => h.includes('tencent.com') || h.includes('bytedance.com') || h.includes('huawei.com')));
    ok('resources refresh button', await page.locator('[data-action="refresh-resources"]').count() === 1);
  });

  await step('pwa assets', async () => {
    await goto(BASE + '/');
    ok('manifest reachable', await page.evaluate(() => fetch('manifest.webmanifest').then(r => r.ok)));
    ok('service worker reachable', await page.evaluate(() => fetch('sw.js').then(r => r.ok)));
    ok('manifest link present', await page.locator('link[rel="manifest"]').count() === 1);
  });

  await step('question bank AI PM ratio', async () => {
    await goto(BASE + '/#/bank');
    const info = await page.evaluate(() => {
      const qs = window.Data.questions;
      const count = c => qs.filter(q => q.cat === c).length;
      const ai = count('AI 产品');
      const product = count('产品');
      const behavior = count('行为');
      const detailed = qs.filter(q => q.ans.includes('答题思路') && q.ans.includes('举例')).length;
      return { total: qs.length, ai, product, behavior, detailed };
    });
    ok('question bank >= 299', info.total >= 299);
    ok('AI PM largest category', info.ai > info.product && info.ai > info.behavior, 'AI=' + info.ai + ' 产品=' + info.product + ' 行为=' + info.behavior);
    ok('product PM questions >= 80', info.product >= 80);
    ok('behavior questions >= 25', info.behavior >= 25);
    ok('detailed answers >= 100', info.detailed >= 100);
  });

  await step('ai advice and follow-up', async () => {
    await goto(BASE + '/');
    await page.evaluate(() => {
      localStorage.setItem('offerflow:v1', JSON.stringify({
        profile: { name: '林同学', role: '前端开发', aiEnabled: true, apiBase: 'http://127.0.0.1:8124/v1', apiKey: 'test', model: 'mock' },
        apps: [], reviews: [], favorites: [], mastered: [], resumes: [], selfTests: [], solved: [],
        tasks: [{ id: 't1', title: 'AI 测试任务', note: '', done: false }]
      }));
    });
    await page.reload({ waitUntil: 'load' });
    await page.click('.nav-item[data-id="mock"]');
    await page.waitForSelector('#mockTrack');
    await page.click('[data-action="start-mock"]');
    await page.waitForSelector('#mockTimer');
    await page.fill('#mockAnswer', '闭包是函数引用外部变量。事件监听没解绑会泄漏，应该及时解绑。');
    await page.click('[data-action="submit-answer"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('#aiAdvice');
      return el && el.textContent.includes('AI 增强建议');
    });
    ok('ai advice rendered', true);
    await page.click('#aiFollowBtn');
    await page.waitForFunction(() => !document.querySelector('#aiFollowBtn'));
    await page.click('[data-action="next-question"]');
    await page.waitForSelector('#mockTimer');
    ok('ai follow-up inserted', await page.locator('h2', { hasText: 'AI追问' }).count() > 0);
  });

  await step('ai auto multi-round follow-up', async () => {
    await goto(BASE + '/');
    await page.evaluate(() => {
      localStorage.setItem('offerflow:v1', JSON.stringify({
        profile: { name: '林同学', role: 'AI 产品经理', aiEnabled: true, apiBase: 'http://127.0.0.1:8124/v1', apiKey: 'test', model: 'mock' },
        apps: [], reviews: [], favorites: [], mastered: [], resumes: [], selfTests: [], solved: [], tasks: []
      }));
    });
    await page.reload({ waitUntil: 'load' });
    await page.click('.nav-item[data-id="mock"]');
    await page.waitForSelector('#mockTrack');
    await page.check('#mockAiFollow');
    await page.selectOption('#mockAiRounds', '2');
    await page.click('[data-action="start-mock"]');
    await page.waitForSelector('#mockTimer');
    await page.fill('#mockAnswer', 'AI 产品经理要负责场景判断、模型选型、评测和成本控制。');
    await page.click('[data-action="submit-answer"]');
    await page.waitForSelector('.toast', { hasText: '已插入一道 AI 追问' });
    await page.click('[data-action="next-question"]');
    await page.waitForSelector('#mockTimer');
    ok('auto follow-up round 1', await page.locator('h2', { hasText: 'AI追问' }).count() > 0);
    await page.fill('#mockAnswer', '我会先建立评测集，再迭代提示词和模型。');
    await page.click('[data-action="submit-answer"]');
    await page.waitForSelector('.toast', { hasText: '已插入一道 AI 追问' });
    await page.click('[data-action="next-question"]');
    await page.waitForSelector('#mockTimer');
    ok('auto follow-up round 2', await page.locator('h2', { hasText: 'AI追问' }).count() > 0);
    await page.click('[data-action="quit-mock"]');
  });

  await step('backup export and import', async () => {
    await goto(BASE + '/');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.click('[data-action="open-settings"]');
    ok('static settings single-mode note', (await page.textContent('#modalRoot')).includes('单机模式专用'));
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-action="export-backup"]');
    const download = await downloadPromise;
    ok('backup exported', download.suggestedFilename().includes('offerflow-backup'));
    const backup = {
      app: 'offerflow',
      version: 1,
      data: {
        profile: { name: '备份用户', role: '后端' },
        apps: [{ id: 'b1', company: '备份公司', role: '后端工程师', city: '上海', channel: '官网', link: 'https://example.com', status: '面试', applyDate: '2026-08-01', note: '导入' }],
        reviews: [], favorites: [], mastered: [], resumes: [], selfTests: [], solved: [],
        tasks: [{ id: 'bt1', title: '备份任务', note: '', done: false }]
      }
    };
    await page.setInputFiles('#importBackup', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForSelector('.modal-head h3', { hasText: '导入数据备份' });
    await page.click('[data-action="apply-backup-merge"]');
    await page.waitForTimeout(300);
    await goto(BASE + '/#/tracker');
    ok('backup imported', (await page.textContent('#trackerBody')).includes('备份公司'));
  });

  await step('csv import', async () => {
    await goto(BASE + '/#/tracker');
    const csv = '\uFEFF公司,岗位,城市,渠道,投递链接,状态,投递日期,面试时间,备注\n导入公司,测试岗,上海,内推,https://example.com/job,面试,2026-08-01,2026-08-10T09:00,CSV备注';
    await page.setInputFiles('#importCsv', { name: 'apps.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForTimeout(400);
    ok('csv imported', (await page.textContent('#trackerBody')).includes('导入公司'));
    const imported = await page.evaluate(() => {
      const raw = localStorage.getItem('offerflow:v1');
      const app = raw ? JSON.parse(raw).apps.find(x => x.company === '导入公司') : null;
      return app ? app.interviewAt : null;
    });
    ok('csv interview time imported', imported === '2026-08-10T09:00');
  });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok('desktop no page overflow', !overflow);
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(BASE + '/');
  const m1 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok('mobile dashboard no overflow', !m1);
  await goto(BASE + '/#/tracker');
  const m2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok('mobile tracker no overflow', !m2);

  ok('no console errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await context.close();
  await browser.close();
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILURES');
  process.exit(failed === 0 ? 0 : 1);
})();
