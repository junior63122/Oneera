const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1200);
  await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForTimeout(900);
  for (const t of ['cost', 'face', 'acc', 'shoes']) { await p.click(`#tb button[data-t="${t}"]`); await p.waitForTimeout(600);
    for (let k = 0; k < 3; k++) { await p.evaluate(k => { const b = document.querySelector('#bd'); b.scrollTop = k * 420; }, k); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}_${t}${k}.png` }); } }
  // choisir un costume, puis un haut → le costume s'enlève
  await p.click('#tb button[data-t="cost"]'); await p.waitForTimeout(400); await p.click('[data-k="costume"][data-v="pompier"]'); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('#bd').scrollTop = 0); await p.screenshot({ path: `${OUT}_cost_on.png` });
  console.log('costume posé', await p.evaluate(() => document.querySelector('#big svg').outerHTML.includes('POMPIER')));
  await p.click('#tb button[data-t="top"]'); await p.waitForTimeout(400); await p.click('[data-k="top"][data-v="hoodie"]'); await p.waitForTimeout(400);
  console.log('costume enlevé en touchant un haut', await p.evaluate(() => !document.querySelector('#big svg').outerHTML.includes('POMPIER')));
  console.log('erreurs', errs); await b.close(); })();
