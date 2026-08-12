async function fetchText(url, timeoutMs) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OfferFlowCampusBot/1.0 (+local whitelist scraper)' },
    signal: AbortSignal.timeout(timeoutMs || 20000)
  });
  if (!res.ok) throw new Error('fetch ' + res.status + ' ' + url);
  return res.text();
}

let pwModule = null;
function tryRequire(name) {
  try { return require(name); } catch (e) { return null; }
}

async function renderHtml(url) {
  if (!pwModule) pwModule = tryRequire('playwright');
  if (!pwModule || !pwModule.chromium) return null;
  const fs = require('fs');
  const candidates = [
    process.env.PLAYWRIGHT_CHROME || '',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  const executablePath = candidates.find(p => fs.existsSync(p));
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (executablePath) launchOpts.executablePath = executablePath;
  const browser = await pwModule.chromium.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);
    return await page.content();
  } finally {
    await browser.close();
  }
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function genericJd(roles, company) {
  const target = String(roles || company || '目标岗位');
  return '岗位方向：' + target + '。\n岗位职责：负责' + target + '相关工作的需求分析、方案设计与落地推进，输出可量化结果；与研发、设计、运营等团队协作，持续跟进数据并迭代优化。\n任职要求：具备' + target + '相关基础和学习能力，逻辑清晰，沟通协作好，抗压能力强；具体 JD 与投递方式请以' + (company || '目标企业') + '官方招聘页面为准。';
}

function fromJsonLd(html, sourceUrl) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const list = Array.isArray(data) ? data : [data];
      list.forEach(node => {
        if (!node || node['@type'] !== 'JobPosting') return;
        const org = (node.hiringOrganization && (node.hiringOrganization.name || node.hiringOrganization['@id'])) || new URL(sourceUrl).hostname;
        const loc = node.jobLocation && node.jobLocation.address ? (node.jobLocation.address.addressLocality || node.jobLocation.address.addressRegion || '') : '';
        const desc = String(node.description || '').slice(0, 3000);
        out.push({
          type: 'campus',
          company: String(org).trim(),
          batch: node.title && /实习/.test(node.title) ? '实习' : '校招',
          date: (node.datePosted || '').slice(0, 10),
          roles: node.title || '',
          cities: String(loc),
          link: node.url || sourceUrl,
          source: sourceUrl,
          jd: desc || genericJd(node.title || '', org),
          note: 'JSON-LD 白名单抓取'
        });
      });
    } catch (e) {}
  }
  return out;
}

function fromLinks(html, sourceUrl, company) {
  const out = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, ' '));
    if (!/校招|秋招|春招|实习|招聘|career|job|recruit|talent/i.test(text + ' ' + href)) continue;
    const batch = /实习/.test(text) ? '实习' : /秋招|校招/.test(text) ? '秋招' : '招聘';
    const key = text.slice(0, 80) + href;
    if (seen.has(key)) continue;
    seen.add(key);
    let link = href;
    if (/^https?:\/\//i.test(link)) {
      try { link = new URL(link, sourceUrl).href; } catch (e) {}
    } else {
      try { link = new URL(link, sourceUrl).href; } catch (e) {}
    }
    out.push({
      type: 'campus',
      company: company || new URL(sourceUrl).hostname.replace(/^www\./, ''),
      batch,
      date: new Date().toISOString().slice(0, 10),
      roles: text.slice(0, 120),
      cities: '',
      link,
      source: sourceUrl,
      jd: genericJd(text.slice(0, 120), company || new URL(sourceUrl).hostname.replace(/^www\./, '')),
      note: '白名单链接抓取'
    });
  }
  return out;
}

function fromWechat(opts, sourceUrl) {
  const title = String(opts.title || '').trim();
  const company = String(opts.company || '').trim() || '公众号招聘';
  const batch = /秋招/.test(title) ? '秋招' : /实习/.test(title) ? '实习' : /春招/.test(title) ? '春招' : '校招';
  const roles = title.slice(0, 200);
  return [{
    type: /实习/.test(title) ? 'intern' : 'campus',
    company,
    batch,
    date: new Date().toISOString().slice(0, 10),
    roles,
    cities: '',
    link: sourceUrl,
    source: sourceUrl,
    jd: genericJd(roles, company),
    note: '公众号文章' + (opts.account ? ' · ' + opts.account : '')
  }];
}

async function scrapeWhitelist(url, opts) {
  opts = opts || {};
  if (opts.wechat || opts.title || /mp\.weixin\.qq\.com/i.test(url)) return fromWechat(opts, url);
  const text = await fetchText(url, opts.timeoutMs);
  if (/\.json($|\?)/i.test(url)) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : (data.items || []);
  }
  const jsonLd = fromJsonLd(text, url);
  const links = fromLinks(text, url, opts.company);
  let items = jsonLd.concat(links);
  if (!items.length && opts.render) {
    const rendered = await renderHtml(url);
    if (rendered) {
      items = fromJsonLd(rendered, url).concat(fromLinks(rendered, url, opts.company));
    }
  }
  return items;
}

module.exports = { scrapeWhitelist, fromLinks, fromJsonLd, renderHtml };
