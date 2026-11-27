const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1200);
  await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForTimeout(900);
  for (const t of ['body','face','hair','top','bottom','shoes','acc','fun']) { await p.click(`#tb button[data-t="${t}"]`); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}_${t}.png` }); }
  console.log(errs); await b.close(); })();
