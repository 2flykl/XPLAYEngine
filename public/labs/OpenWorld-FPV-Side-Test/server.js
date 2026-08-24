const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8855;
const PUBLIC_DIR = path.join(__dirname, 'public');

const mime = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml'
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('Not found');
      return;
    }
    res.writeHead(200, {'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream'});
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const target = path.join(PUBLIC_DIR, reqPath);
  if (!target.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, {'Content-Type':'text/plain; charset=utf-8'});
    res.end('Forbidden');
    return;
  }
  fs.stat(target, (err, st) => {
    if (!err && st.isFile()) return sendFile(res, target);
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Not found');
  });
});

server.listen(PORT, () => {
  console.log('XPLAY Open World FPV Side Test');
  console.log('Open: http://localhost:' + PORT);
});
