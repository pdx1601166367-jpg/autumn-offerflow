const http = require('http');

const PORT = Number(process.env.PORT || 8124);

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }
  if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let text = '回答思路清晰，建议补充具体数据与落地细节。';
    try {
      const json = JSON.parse(body);
      const sys = (json.messages || []).find(m => m.role === 'system');
      if (sys && sys.content.includes('资深面试官')) {
        text = 'AI追问：请具体说说你的方案是怎么落地的？';
      }
    } catch (e) {}
    const out = {
      id: 'mock-chat',
      object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }]
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(out));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('mock-ai-server listening on http://127.0.0.1:' + PORT);
});
