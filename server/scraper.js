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

const ROLE_KEYS = ['研发', '算法', '产品', '运营', '设计', '市场', '销售', '职能支持', '职能', '数据', '测试', '前端', '后端', '客户端', '安全', '供应链', '项目管理', '人力资源', '财务', '法务', '品牌', '内容', '游戏', 'AI', '大模型', '芯片', '硬件', '软件', '机械', '电气', '汽车', '智能制造', '金融科技', '数据分析', '产品经理', '解决方案', '交付', '实施', '咨询', '商务', '客服', '采购', '物流'];
const CITY_KEYS = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '南京', '西安', '苏州', '重庆', '长沙', '合肥', '天津', '郑州', '青岛', '厦门', '福州', '宁波', '无锡', '东莞', '佛山', '珠海', '香港', '澳门', '台北', '沈阳', '大连', '济南', '哈尔滨', '长春', '石家庄', '南昌', '昆明', '贵阳', '南宁', '兰州', '乌鲁木齐', '海口', '三亚', '常州', '嘉兴', '绍兴', '温州', '泉州', '烟台', '潍坊', '洛阳', '太原', '呼和浩特', '银川', '西宁', '拉萨'];

function extractRoles(text) {
  return [...new Set(ROLE_KEYS.filter(k => String(text || '').includes(k)))].slice(0, 8);
}

function extractCities(text) {
  return [...new Set(CITY_KEYS.filter(k => String(text || '').includes(k)))].slice(0, 8);
}

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function extractWechatText(html) {
  const start = String(html || '').indexOf('id="js_content"');
  if (start < 0) return stripTags(html);
  const cut = String(html).slice(start);
  const end = cut.search(/<\/div>\s*<script/i);
  const end2 = cut.indexOf('js_content_container');
  const endIdx = end > 0 ? end : (end2 > 0 ? end2 : 200000);
  return stripTags(cut.slice(0, endIdx));
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

async function fromWechat(opts, sourceUrl) {
  const title = String(opts.title || '').trim();
  if (/2026|春招/.test(title)) return [];
  let account = String(opts.account || '');
  if (/春招|2026/.test(account)) account = '招聘资讯号';
  const company = String(opts.company || '').trim() || '公众号招聘';
  const isIntern = /实习/.test(title) && !/秋招|校招|校园招聘/.test(title);
  const batch = /秋招/.test(title) ? '秋招' : isIntern ? '实习' : '校招';
  let content = String(opts.content || '');
  const hasMeta = !!(opts.roles && opts.cities);
  if (!hasMeta && !content) {
    try {
      const html = await fetchText(sourceUrl, 20000);
      content = extractWechatText(html);
    } catch (e) {}
    if (!content || content.length < 200) {
      try {
        const rendered = await renderHtml(sourceUrl);
        if (rendered) content = extractWechatText(rendered);
      } catch (e) {}
    }
  }
  const allText = title + '\n' + content;
  const roleList = opts.roles ? String(opts.roles).split(/[、,，]/).map(s => s.trim()).filter(Boolean) : extractRoles(allText);
  const cityList = opts.cities ? String(opts.cities).split(/[\s,，、\/]+/).map(s => s.trim()).filter(Boolean) : extractCities(allText);
  const roles = roleList.length ? roleList.join('、') : '校园招聘';
  const cities = cityList.length ? cityList.join(' ') : '全国';
  return [{
    type: isIntern ? 'intern' : 'campus',
    company,
    title,
    batch,
    date: new Date().toISOString().slice(0, 10),
    roles,
    cities,
    link: opts.applyLink || sourceUrl,
    source: sourceUrl,
    jd: genericJd(roles, company),
    note: '公众号文章' + (account ? ' · ' + account : '')
  }];
}

async function scrapeWhitelist(url, opts) {
  opts = opts || {};
  if (opts.wechat || /mp\.weixin\.qq\.com/i.test(url)) return fromWechat(opts, url);
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
