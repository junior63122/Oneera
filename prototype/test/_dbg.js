const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:8787'); await p.waitForTimeout(600);
 await p.click('#su'); await p.fill('#fn', '<img src=x onerror="window.__pwned=1">Léa'); await p.fill('#em', 'xx' + Date.now() + '@t.fr'); await p.fill('#pw', 'motdepasse-ok'); await p.click('#go'); await p.waitForTimeout(2500);
 console.log('err:', await p.evaluate(() => document.querySelector('#err')?.textContent), 'studio:', await p.evaluate(() => !!document.querySelector('.studio')), 'fn:', await p.evaluate(() => document.querySelector('#fn')?.value), 'pwned', await p.evaluate(() => window.__pwned));
 await b.close(); })();
