const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  let n = 0; const shot = async (name) => { await p.waitForTimeout(450); await p.locator('#screen').screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}_${name}.png` }); };
  const sc = p.locator('#screen');
  const click = async (sel) => { await sc.locator(sel).first().click(); };
  await shot('camera'); await click('#qrChip'); await shot('store'); await click('#get');
  await p.waitForTimeout(300); await sc.locator('.sys .sb.b').click(); await p.waitForTimeout(3300); await click('#get'); await shot('welcome');
  await click('#apple'); await shot('apple'); await click('#cont'); await p.waitForTimeout(1200); await shot('profile');
  await sc.locator('[data-a="25-34"]').click(); await click('#go'); await shot('avatarQuick');
  await sc.locator('[data-b="rousse"]').click(); await click('#edit'); await shot('editor_body');
  await sc.locator('[data-c="clothes"]').click(); await shot('editor_clothes'); await sc.locator('[data-top="top4"]').click(); await sc.locator('[data-c="acc"]').click(); await shot('editor_acc');
  await click('#ok'); await p.waitForTimeout(500); await shot('perms');
  await click('#all'); for (let i = 0; i < 4; i++) { await p.waitForTimeout(300); if (i === 0) await shot('sys_loc'); await sc.locator('.sys .sb.b').click(); }
  await p.waitForTimeout(800); await shot('friends'); await click('#contacts'); await p.waitForTimeout(300); await shot('sys_contacts'); await sc.locator('.sys .sb.b').click(); await p.waitForTimeout(1200); await shot('matches');
  await click('#addAll'); await p.waitForTimeout(2500); await shot('added'); await click('#go'); await p.waitForTimeout(2500); await shot('map');
  await p.screenshot({ path: `${OUT}/desk.png` });
  console.log(errs.join('\n') || 'no errors');
  console.log(await p.locator('#panel').innerText());
  await b.close();
})();
