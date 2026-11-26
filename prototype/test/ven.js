const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0,3).join(' / ')));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(500); const sc = p.locator('#screen');
  for (const v of ['bisous', 'selva']) { await p.locator(`#panel [data-p="venue:${v}"]`).click(); await p.waitForTimeout(1200); await sc.screenshot({ path: `ven_${v}_map.png` });
    await p.evaluate(() => V.poiSheet(POIS.find(o => o.bar).id)); await p.waitForTimeout(600); await sc.screenshot({ path: `ven_${v}_bar.png` });
    await p.evaluate(() => { closeSheet(true); V.friendSheet('lea'); }); await p.waitForTimeout(600); await sc.screenshot({ path: `ven_${v}_friend.png` });
    await p.evaluate(() => V.goTo(POIS.find(o => o.id === 'wc').at, 'Toilettes', POIS.find(o => o.id === 'wc').node)); await p.waitForTimeout(900); await sc.screenshot({ path: `ven_${v}_route.png` });
    await p.locator('#panel [data-p="role:dash"]').click(); await p.waitForTimeout(1200); await p.screenshot({ path: `ven_${v}_dash.png` }); await p.evaluate('closeDash()'); }
  console.log(errs.join(' | ') || 'no errors'); await b.close(); })();
