const BASE = 'http://127.0.0.1:8125';

function ok(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' [' + extra + ']' : ''));
  if (!cond) process.exitCode = 1;
}

(async () => {
  const fixture = BASE + '/server/sources/fixture.html';
  const before = await fetch(BASE + '/api/resources', { cache: 'no-store' }).then(r => r.json());
  const beforeCount = (before.items || []).length;
  const res = await fetch(BASE + '/api/resources/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whitelistUrl: fixture }),
    cache: 'no-store'
  }).then(r => r.json());
  ok('whitelist scrape ok', res.ok === true, (res.error || ''));
  ok('whitelist scrape added', (res.added || 0) >= 1, 'added=' + res.added);
  const after = await fetch(BASE + '/api/resources', { cache: 'no-store' }).then(r => r.json());
  const items = after.items || [];
  ok('json-ld job merged', items.some(x => x.roles === '数据分析师（校招）'));
  ok('link job merged', items.some(x => x.roles.includes('AI 产品经理')) && items.some(x => x.roles.includes('产品实习生')));
  ok('resource count increased', items.length >= beforeCount + 1, beforeCount + ' -> ' + items.length);
  const status = await fetch(BASE + '/api/system/status', { cache: 'no-store' }).then(r => r.json());
  ok('job run recorded', (status.jobRuns || []).some(x => x.type === 'manual-scrape'));
  console.log(process.exitCode === 1 ? 'EVAL FAIL' : 'ALL PASS');
})();
