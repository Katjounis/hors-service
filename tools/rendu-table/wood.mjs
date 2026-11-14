import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire('/home/claude/x/code/package.json')('playwright');
const b = await chromium.launch(); const page = await b.newPage();
await page.goto('file://' + process.argv[2] + '/wood.html');
await page.waitForFunction(() => window.__done, null, { timeout: 120000 });
const data = await page.evaluate(() => window.__done);
writeFileSync(process.argv[2] + '/out/bois.png', Buffer.from(data.split(',')[1], 'base64'));
await b.close();
