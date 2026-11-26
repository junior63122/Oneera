// Clique chaque élément interactif de chaque écran, depuis un état réinitialisé, et signale : erreurs JS, boutons sans effet, images cassées, débordements.
const { chromium } = require('playwright');
const ENTRIES = [
  ['map', 'quickSetup();ST.role="visitor";V.map()'], ['friends', 'quickSetup();V.friendsTab()'], ['chatList', 'quickSetup();V.chatList()'], ['chat_lea', 'quickSetup();V.chat("lea")'],
  ['settings', 'quickSetup();V.settings()'], ['search', 'quickSetup();V.search()'], ['notifs', 'quickSetup();V.notifs()'], ['recap', 'quickSetup();V.recap()'], ['replay', 'quickSetup();V.replay()'],
  ['addFriends', 'quickSetup();V.addFriends(false)'], ['editor', 'quickSetup();V.avatarEditor(null)'], ['avatarQuick', 'quickSetup();V.avatarQuick()'], ['perms', 'resetDemo();V.perms()'],
  ['welcome', 'resetDemo();V.welcome()'], ['profile', 'resetDemo();V.profile()'], ['phone', 'resetDemo();V.phone()'],
  ...['scene', 'barO', 'barC', 'barS', 'partner', 'vip', 'secours', 'wc'].map(id => ['poi_' + id, `quickSetup();V.map();V.poiSheet("${id}")`]),
  ...['lea', 'sami'].map(id => ['friend_' + id, `quickSetup();V.map();V.friendSheet("${id}")`]),
  ['report', 'quickSetup();V.map();V.report()'], ['reportDetail', 'quickSetup();V.map();V.reportDetail("medical")'], ['share', 'quickSetup();V.map();V.shareSettings()'], ['layers', 'quickSetup();V.map();V.layers()'],
  ['event', 'quickSetup();V.map();V.eventSheet()'], ['rdv', 'quickSetup();V.map();V.rdvSheet(null)'], ['guestMap', 'resetDemo();ST.account="guest";V.map()'],
  ['staffMap', 'quickSetup();ST.role="staff";S.map()'], ['staffAlerts', 'quickSetup();ST.role="staff";S.alerts()'], ['staffTeam', 'ST.role="staff";S.team()'], ['staffMe', 'ST.role="staff";S.me()'], ['bar', 'ST.role="bar";S.bar()'], ['staffAlert', 'ST.role="staff";S.map();S.alert(9001)']
];
const DASH = ['global', 'alerts', 'replay', 'compare', 'prog', 'bars', 'comm', 'beacons', 'data'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  let errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
  const report = { dead: [], errors: [], broken: [], overflow: [], clicks: 0 };
  const sig = () => p.evaluate(() => { const s = document.querySelector('#screen'); const d = document.querySelector('#dash'); return (s ? s.innerHTML.length + '|' + s.querySelectorAll('*').length + '|' + s.innerText.slice(0, 4000) : '') + (d ? d.innerText.slice(0, 3000) + d.querySelectorAll('*').length : '') + location.hash; });
  const targets = (root) => p.evaluate((root) => { const R = document.querySelector(root); if (!R) return [];
    const els = [...R.querySelectorAll('button,[role=button],input[type=range],.tog')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && !e.disabled && e.offsetParent !== null; });
    return els.map((e, i) => { e.setAttribute('data-crawl', i); return (e.getAttribute('aria-label') || e.innerText || e.id || e.className).replace(/\s+/g, ' ').trim().slice(0, 40); }); }, root);
  const checks = async (name, root) => { const r = await p.evaluate((root) => { const R = document.querySelector(root); const out = { broken: [], overflow: [] }; if (!R) return out;
    R.querySelectorAll('img').forEach(i => { if (i.complete && i.naturalWidth === 0) out.broken.push(i.getAttribute('src')); });
    const rr = R.getBoundingClientRect(); R.querySelectorAll('.body *, .sbody *, #dc *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > rr.right + 2) && !e.closest('.chips,.tw,.map,.dmap,.items,.msgs')) out.overflow.push((e.className || e.tagName) + ':' + (e.innerText || '').slice(0, 30)); });
    return out; }, root); r.broken.forEach(x => report.broken.push(name + ' → ' + x)); r.overflow.slice(0, 3).forEach(x => report.overflow.push(name + ' → ' + x)); };
  const run = async (name, setup, root) => {
    errs = []; await p.evaluate(setup); await p.waitForTimeout(450); await checks(name, root);
    const labels = await targets(root);
    for (let i = 0; i < labels.length; i++) {
      errs = []; await p.evaluate(setup); await p.waitForTimeout(250); await targets(root);
      const before = await sig(); const el = p.locator(`${root} [data-crawl="${i}"]`);
      if (!(await el.count())) continue;
      try { if (labels[i] && (await el.evaluate(e => e.type === 'range'))) await el.fill('500'); else await el.click({ timeout: 1500, force: true }); } catch (e) { report.dead.push(`${name} › « ${labels[i]} » (non cliquable)`); continue; }
      report.clicks++; await p.waitForTimeout(380);
      // ferme une éventuelle fenêtre système pour ne pas bloquer la suite
      const sys = p.locator('.sys .sb.b'); if (await sys.count()) { await sys.first().click(); await p.waitForTimeout(150); }
      const after = await sig();
      if (after === before) report.dead.push(`${name} › « ${labels[i]} »`);
      errs.forEach(e => report.errors.push(`${name} › « ${labels[i]} » : ${e}`));
    }
    errs.forEach(e => report.errors.push(`${name} : ${e}`));
  };
  for (const [n, s] of ENTRIES) await run(n, `(()=>{document.querySelector('#dash')&&closeDash();${s}})()`, '#screen');
  for (const v of DASH) await run('dash_' + v, `openDash("${v}")`, '#dash');
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
