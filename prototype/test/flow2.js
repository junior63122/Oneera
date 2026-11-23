const { chromium } = require('playwright');
const OUT = process.argv[2], OS = process.argv[3] || 'ios';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(700); await p.evaluate(os => { ST.os = os; }, OS);
  let n = 0; const sc = p.locator('#screen'); const shot = async (name) => { await p.waitForTimeout(450); await sc.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}_${name}.png` }); };
  const click = async (sel) => { await sc.locator(sel).first().click(); };
  await shot('camera'); await click('#qrChip'); await shot('appclip'); await click('#open'); await p.waitForTimeout(1400); await shot('welcome');
  if (OS === 'ios') { await click('#apple'); await shot('apple'); await click('#cont'); await p.waitForTimeout(1200); } else { await click('#google'); await shot('google'); await click('#acc'); await p.waitForTimeout(500); }
  await shot('profile'); await click('#go'); await shot('profile_need18'); await click('#maj'); await click('#go'); await shot('avatarQuick');
  await click('#go'); await shot('perms'); await click('#all'); await p.waitForTimeout(300); await shot('sys_loc'); await sc.locator('.sys .sb.b').click(); await p.waitForTimeout(600); await shot('friends');
  await click('#band'); await shot('share'); await sc.locator('[data-app="WhatsApp"]').click(); await p.waitForTimeout(400); if (await sc.locator('.sys .sb.b').count()) { await shot('sys_notif'); await sc.locator('.sys .sb.b').click(); }
  await p.waitForTimeout(3200); await shot('band_joined'); await click('#go'); await p.waitForTimeout(3000); await shot('map');
  await p.screenshot({ path: `${OUT}/desk.png` });
  console.log(errs.join('\n') || 'no errors'); console.log((await p.locator('#panel .pcard').first().innerText()).replace(/\n/g, ' | '));
  await b.close();
})();
