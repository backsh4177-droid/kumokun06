import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 4173);
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function safePath(urlPath) {
  // URL.pathname은 항상 "/..."로 시작하므로 leading slash 제거 필수
  const cleaned = normalize(urlPath)
    .replace(/^[/\\]+/, '') // <-- 핵심: root 무시되는 거 방지
    .replace(/^([.]{2}[/\\])+/, ''); // 기본적인 ../ 방어
  return join(root, cleaned);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;

    if (pathname === '/') pathname = '/index.html';
    const ext = extname(pathname);
    const filePath = safePath(pathname);

    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
      return;
    } catch {
      // 파일 확장자가 있는 요청(css/js/png 등)은 진짜 404를 내주는 게 디버깅에 좋음
      if (ext) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      // SPA 라우팅용 fallback
      const index = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(index);
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Server error: ${error.message}`);
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${port}`);
});
