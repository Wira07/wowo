// Server statis sederhana untuk pengembangan: node tools/serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const port = +process.argv[2] || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  const st = fs.statSync(f);
  const ct = types[path.extname(f)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    res.writeHead(206, {
      'Content-Type': ct,
      'Content-Range': `bytes ${start}-${end}/${st.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': ct, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
