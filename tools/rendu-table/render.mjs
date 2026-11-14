import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const { chromium } = createRequire('/home/claude/x/code/package.json')('playwright');
const ROOT = process.argv[2];
const server = createServer((q, r) => { const p = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': extname(p) === '.js' ? 'text/javascript' : 'text/html' }); r.end(readFileSync(p)); });
await new Promise((r) => server.listen(5210, r));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage();
const logs = []; page.on('console', (m) => logs.push(m.text())); page.on('pageerror', (e) => logs.push('ERR ' + e.message));
for (const job of process.argv.slice(3)) {
  const [s, w, h, span] = job.split(':');
  await page.goto(`http://localhost:5210/scene.html?s=${s}&w=${w}&h=${h}&span=${span}`);
  await page.waitForFunction(() => window.__done, null, { timeout: 180000 });
  const data = await page.evaluate(() => window.__done);
  writeFileSync(join(ROOT, 'out', `${s}.png`), Buffer.from(data.split(',')[1], 'base64'));
  console.log('ok', s);
}
console.log(logs.filter((l) => /ERR|error/i.test(l)).slice(0, 5));
await b.close(); server.close();
