const { chromium, devices } = require('playwright');
const DIR = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], recordVideo: { dir: DIR, size: { width: 390, height: 664 } } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1000);
  await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForTimeout(500);
  await p.click('#tb button[data-t="face"]'); await p.waitForTimeout(9000);
  await p.click('#tb button[data-t="body"]'); await p.waitForTimeout(7000);
  console.log(errs); await c.close(); await b.close(); })();
