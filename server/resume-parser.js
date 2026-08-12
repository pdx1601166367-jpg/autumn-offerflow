const zlib = require('zlib');

function findLast(buf, needle) {
  for (let i = buf.length - needle.length; i >= 0; i--) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

function extractDocx(buf) {
  const eocdIdx = findLast(buf, Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdIdx < 0) throw new Error('不是有效的 DOCX 文件');
  const total = buf.readUInt16LE(eocdIdx + 10);
  const cdOffset = buf.readUInt32LE(eocdIdx + 16);
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    if (name === 'word/document.xml') {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const compSize = buf.readUInt32LE(p + 20);
      const comp = buf.slice(start, start + compSize);
      const xml = zlib.inflateRawSync(comp).toString('utf8');
      return xml
        .replace(/<w:tab[^>]*\/>/g, ' ')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<w:p[^>]*>/g, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('DOCX 中未找到正文');
}

function extractPdf(buf) {
  const s = buf.toString('latin1');
  const out = [];
  let foundFlate = false;
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let m;
  while ((m = streamRe.exec(s)) !== null) {
    const before = s.slice(Math.max(0, m.index - 40), m.index);
    if (!before.includes('FlateDecode')) continue;
    foundFlate = true;
    try {
      const raw = Buffer.from(m[1], 'latin1');
      const text = zlib.inflateSync(raw).toString('latin1');
      const tjRe = /\(((?:[^()\\]|\\.)*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g;
      let t;
      while ((t = tjRe.exec(text)) !== null) {
        const part = t[1] || t[2];
        out.push(part.replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'));
      }
    } catch (e) {}
  }
  const result = out.join('').replace(/\s+/g, ' ').trim();
  if (!result) {
    if (!foundFlate) throw new Error('PDF 暂不支持或为扫描件，请上传清晰的图片版本');
    return '';
  }
  return result;
}

function classify(filename, mime) {
  const name = String(filename || '').toLowerCase();
  if (mime && mime.startsWith('image/')) return 'image';
  if (/\.docx$/i.test(name) || (mime && mime.includes('wordprocessingml'))) return 'docx';
  if (/\.pdf$/i.test(name) || mime === 'application/pdf') return 'pdf';
  if (mime && mime.startsWith('text/')) return 'text';
  if (/\.txt$/i.test(name)) return 'text';
  return 'unsupported';
}

function extractResume(filename, mime, dataBase64) {
  const buf = Buffer.from(dataBase64 || '', 'base64');
  const kind = classify(filename, mime);
  if (kind === 'unsupported') return { error: '不支持的文件格式，请上传 PDF / DOCX / PNG / JPG' };
  if (kind === 'image') return { kind, image: buf };
  if (kind === 'text') return { kind, text: buf.toString('utf8') };
  if (kind === 'docx') return { kind, text: extractDocx(buf) };
  if (kind === 'pdf') return { kind, text: extractPdf(buf) };
  return { error: '未知错误' };
}

module.exports = { extractResume, extractDocx, extractPdf };
