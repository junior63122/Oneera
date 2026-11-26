// Défense en profondeur : même si un prénom piégé arrivait du serveur, l'app ne l'exécute nulle part.
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:9'); await p.waitForTimeout(600);
  const X = '<img src=x onerror="window.__pwned=1">"\'><svg onload="window.__pwned=2">';
  await p.evaluate((X) => { REAL.token = 't'; REAL.user = { id: 'me', displayName: X, avatar: { g: 'f', hair: '"><img src=x onerror="window.__pwned=3">' } }; realApplyUser(); REAL.friends = [{ id: '11111111-1111-1111-1111-111111111111', displayName: X, avatar: { g: 'm', top: '<script>' }, status: 'accepted' }].map(f => ({ ...f, displayName: safeName(f.displayName), avatar: safeAvatar(f.avatar) })); realApplyFriends(); REAL.pos['11111111-1111-1111-1111-111111111111'] = { at: [50, 60], t: Date.now(), floor: VENUE.id }; realRefreshVisible(true); ST.account = 'email'; ST.perms.loc = 'app'; }, X);
  for (const v of ['V.map()', 'V.settings()', 'V.realSettings()', 'V.friendsTab && V.friendsTab()', "V.friendSheet && V.friendSheet('11111111-1111-1111-1111-111111111111')", 'V.meSheet && V.meSheet()', 'V.shareSettings()', 'V.addFriends(false)']) { await p.evaluate(v).catch(() => {}); await p.waitForTimeout(500); }
  const pw = await p.evaluate(() => window.__pwned); console.log((pw === undefined ? 'OK   ' : 'FAIL ') + 'prénom/avatar piégés reçus du serveur : rien exécuté sur 8 écrans (' + (pw ?? 'aucun') + ')');
  await b.close(); })();
