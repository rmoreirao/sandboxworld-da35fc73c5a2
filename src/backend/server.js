import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535.');
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify({
      status: 'ok',
      revision: process.env.DEPLOYMENT_SHA || 'local',
    }));
    return;
  }

  // TODO: Add validated /api/tasks routes once you have agreed the requirements.
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(publicRoot, relativePath);
  if (!filePath.startsWith(`${resolve(publicRoot)}${sep}`) || pathname.includes('\0')) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) {
      response.writeHead(404).end('Not found. Run npm run build before npm start.');
      return;
    }
    console.error('Unable to serve file:', error.message);
    response.writeHead(500).end('Unable to serve this request');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Workshop starter listening on port ${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
