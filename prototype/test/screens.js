// Capture d'écrans de référence (régression visuelle) : node screens.js <url local.html> <dossier> [liste d'écrans] [appareils]
// Chaque écran est ouvert par sa fonction, en compte de démonstration, puis capturé à l'échelle 2.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL0 = process.argv[2], OUT = process.argv[3];
const ALL = {
  carte: 'V.map()', signalement: 'V.map(); V.report()', reglages: 'V.settings()', amis: 'V.friendsTab()', messages: 'V.chatList()', studio: 'V.avatarEditor()',
  programme: 'V.map(); V.programme()', notifications: 'V.notifs()', profil: 'V.profile()', bienvenue: 'V.welcome()', recap: 'V.recap()', lieu: "V.map(); V.poiSheet(POIS[0].id)",
  ami: "V.map(); V.friendSheet(FRIENDS[0].id)", suivi: "V.map(); V.reportDetail('medical')", partage: 'V.map(); V.shareSettings()', calques: 'V.map(); V.layers()',
  recherche: 'V.map(); V.search()', moi: 'V.map(); V.meSheet()', ajoutAmis: 'V.addFriends(false)', staff: "ST.role='security'; S.map()", alertes: "ST.role='security'; S.alerts()", equipe: "ST.role='security'; S.team()",
};
const pick = (process.argv[4] || Object.keys(ALL).join(',')).split(',');
const devs = (process.argv[5] || 'iPhone 14,iPhone SE').split(',');
(async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch(); const errs = [];
  for (const d of devs) { const ctx = await b.newContext({ ...devices[d] }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(d + ' ' + e.message));
    await p.goto(URL0 + '?nouveau'); await p.waitForTimeout(900);
    await p.evaluate(() => { if (!ST.account) quickSetup(); ST.tourDone = true; ST.perms.loc = 'app'; document.querySelectorAll('.tour,.tourOv,.coach').forEach(e => e.remove()); });
    for (const k of pick) { try { await p.evaluate(() => { closeSheet && closeSheet(true); ST.role = 'visitor'; }); await p.evaluate(ALL[k]); } catch (e) { errs.push(d + ' ' + k + ' : ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(900); await p.evaluate(() => document.querySelectorAll('.push,.toast').forEach(e => e.remove()));
      const el = await p.$('#screen'); await el.screenshot({ path: `${OUT}/${k}-${d.replace(/ /g, '')}.png` }); }
    await ctx.close(); }
  console.log('erreurs :', errs.length ? errs.join(' | ') : 'aucune'); await b.close(); })();
