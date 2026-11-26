const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
  await p.evaluate('quickSetup();V.chat("lea")'); await p.waitForTimeout(300); const n0 = await p.locator('#screen .msgs > *').count();
  await p.locator('#screen [data-q="📍 Ma position"]').click(); await p.waitForTimeout(300); console.log('chat ma position:', n0, '->', await p.locator('#screen .msgs > *').count());
  await p.evaluate('V.search()'); await p.waitForTimeout(300); await p.locator('#screen [data-p="scene"]').click(); await p.waitForTimeout(600); console.log('search scenes -> sheet:', await p.locator('#screen .sheet h2').first().innerText().catch(() => 'none'));
  await b.close(); })();
