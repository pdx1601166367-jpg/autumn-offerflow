async function fetchText(url, timeoutMs) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OfferFlowCampusBot/1.0 (+local whitelist scraper)' },
    signal: AbortSignal.timeout(timeoutMs || 20000)
  });
  if (!res.ok) throw new Error('fetch ' + res.status + ' ' + url);
  return res.text();
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
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
        out.push({
          type: 'campus',
          company: String(org).trim(),
          batch: node.title && /实习/.test(node.title) ? '实习' : '校招',
          date: (node.datePosted || '').slice(0, 10),
          roles: node.title || '',
          cities: String(loc),
          link: node.url || sourceUrl,
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
      note: '白名单链接抓取'
    });
  }
  return out;
}

async function scrapeWhitelist(url, opts) {
  opts = opts || {};
  const text = await fetchText(url, opts.timeoutMs);
  if (/\.json($|\?)/i.test(url)) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : (data.items || []);
  }
  const jsonLd = fromJsonLd(text, url);
  const links = fromLinks(text, url, opts.company);
  return jsonLd.concat(links);
}

module.exports = { scrapeWhitelist, fromLinks, fromJsonLd };
