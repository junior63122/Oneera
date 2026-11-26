const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('ERR', e.stack.split('\n').slice(0, 4).join(' / ')));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(1500);
  await p.locator('#panel [data-p="skip"]').click(); await p.waitForTimeout(1500); await b.close(); })();
