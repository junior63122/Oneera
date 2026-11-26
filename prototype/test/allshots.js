// Capture de CHAQUE écran de l'app sur un compte réel (avec un ami, des messages, un trajet), en iPhone 14 et iPhone SE.
// Produit des planches contact (6 écrans par planche) à analyser, et signale erreurs JS, débordements et textes coupés.
const { chromium, devices } = require('playwright');
const { execFileSync } = require('child_process');
const API = process.argv[2] || 'http://127.0.0.1:8787', OUT = process.argv[3] || '/tmp/allshots';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const report = [];
  for (const devName of ['iPhone 14', 'iPhone SE']) {
    const tag = devName.replace(' ', '');
    const mk = async (name) => { const ctx = await b.newContext({ ...devices[devName], deviceScaleFactor: 1 }); const q = await ctx.newPage(); q.errs = []; q.on('pageerror', e => q.errs.push(e.message));
      const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${name.toLowerCase()}${Date.now()}@shots.test`, password: 'Motdepasse-42', displayName: name }) })).json();
      q.tok = r.token; q.uid = r.user.id; q.r = r; return q; };
    const p = await mk('Camille'), fr = await mk('Hugo');
    const call = (q, m, path, body) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + q.tok }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
    await call(fr, 'PATCH', '/v1/me', { avatar: { g: 'm', skin: 6, hair: 'twists', hairC: 0, top: 'hoodie', topC: '#FF4FD8', bottom: 'cargo', bottomC: 1, text: 'TEAM HUGO', paint: 'bolt', paintC: 1, jewel: ['glowstick'] } });
    await call(fr, 'POST', '/v1/friends/requests', { userIds: [p.uid] }); await call(p, 'POST', `/v1/friends/${fr.uid}/accept`, {});
    await call(fr, 'POST', '/v1/messages', { to: p.uid, body: 'Je suis devant la grande scène 🔥' });
    await call(fr, 'POST', '/v1/messages', { to: p.uid, kind: 'meet', body: '🙋 Rejoins-moi ici', loc: { x: 52, y: 48, floor: 'bdf', label: 'Grande scène' } });
    await call(fr, 'POST', '/v1/messages', { to: p.uid, kind: 'sticker', body: 'danse' });
    const U = 'http://127.0.0.1:8090/local.html?api=' + encodeURIComponent(API);
    // l'ami se connecte, partage et danse
    await fr.goto(U + '&nouveau'); await fr.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), fr.r); await fr.goto(U); await fr.waitForTimeout(1200);
    await fr.evaluate(async () => { ST.tourDone = true; ST.perms.loc = 'app'; await realGrantSharing(3); realConnect(); V.map(); ST.me.pos = [50, 47]; LIVE.sim = { act: 'dance' }; });
    let i = 0; const shots = [];
    const sh = async (name, setup, wait = 900) => { try { if (setup) await setup(); } catch (e) { report.push(`${tag} ${name} : ouverture impossible (${e.message.split('\n')[0]})`); return; } await p.waitForTimeout(wait);
      const f = `${OUT}/${tag}_${String(++i).padStart(2, '0')}_${name}.png`; await p.screenshot({ path: f }); shots.push([f, name]);
      const chk = await p.evaluate(() => { const W = innerWidth, out = []; const over = document.documentElement.scrollWidth > W + 1; if (over) out.push('débordement horizontal de la page');
        document.querySelectorAll('#screen button, #screen .t, #screen .h2, #screen h1, #screen b').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return; if (r.right > W + 2 || r.left < -2) out.push('hors écran : « ' + (e.textContent || '').trim().slice(0, 30) + ' »'); if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'visible' && getComputedStyle(e).whiteSpace === 'nowrap') out.push('texte coupé : « ' + (e.textContent || '').trim().slice(0, 30) + ' »'); });
        return [...new Set(out)].slice(0, 4); });
      chk.forEach(c => report.push(`${tag} ${name} : ${c}`)); };
    const ev = (js) => () => p.evaluate(js);
    await p.goto(U + '&nouveau'); await p.waitForTimeout(800);
    await sh('accueil', null);
    await sh('inscription', ev(() => V.signup()));
    await sh('connexion', ev(() => V.login()));
    await p.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), p.r); await p.goto(U); await p.waitForTimeout(1500);
    await p.evaluate(async () => { ST.tourDone = true; ST.perms.loc = 'app'; await realGrantSharing(3); realConnect(); });
    for (const t of ['Corps', 'Visage', 'Cheveux', 'Haut', 'Bas', 'Pieds', 'Style', 'Fête']) await sh('studio-' + t, async () => { if (!(await p.$('.studio'))) await p.evaluate(() => V.avatarPick(() => V.map(), true)); await p.click(`[aria-label="${t}"]`); }, 1000);
    await sh('place-toi', ev(() => V.perms()));
    await sh('ajout-amis', ev(() => V.addFriends(false)));
    await sh('carte', async () => { await p.evaluate(() => { V.map(); }); await p.waitForTimeout(800); await p.evaluate(() => { ST.me.pos = [52, 50]; }); }, 3500);
    await sh('fiche-moi', ev(() => V.meSheet()));
    await sh('avatar-vivant', ev(() => V.liveSettings()));
    await sh('fiche-ami', async () => { await p.evaluate(() => closeSheet(true)); await p.evaluate((id) => V.friendSheet(id), fr.uid); });
    await sh('boussole', ev(() => V.findFriend(Object.keys(REAL.pos)[0])));
    await sh('amis-ici', ev(() => V.friendsTab('here')));
    await sh('amis-tous', ev(() => V.friendsTab('all')));
    await sh('amis-demandes', ev(() => V.friendsTab('req')));
    await sh('discussions', ev(() => V.chatList()), 1500);
    await sh('discussion', () => p.evaluate((id) => V.chat(id), fr.uid), 1500);
    await sh('stickers', async () => { await p.evaluate((id) => V.chat(id), fr.uid); await p.waitForTimeout(800); await p.click('#stkb'); });
    await sh('notifications', ev(() => V.notifs()));
    await sh('reglages', ev(() => V.settings()));
    await sh('mon-compte', ev(() => V.realSettings()));
    await sh('modifier-profil', ev(() => V.editProfile()));
    await sh('partage', ev(() => { closeSheet(true); V.shareSettings(); }));
    await sh('recap-vide', ev(() => { closeSheet(true); V.recap(); }));
    await sh('recap', ev(() => { const T = realTrack(), now = Date.now(); [[30, 70], [38, 62], [45, 55], [52, 48], [52, 48], [60, 42], [62, 40]].forEach((q, k) => T.push({ t: now - (7 - k) * 300e3, x: q[0], y: q[1], v: VENUE.id })); V.recap(); }));
    await sh('replay', ev(() => V.replay()), 1500);
    await sh('signalement', ev(() => { V.map(); setTimeout(() => V.report(), 400); }), 1500);
    await sh('recherche', ev(() => V.search()));
    await sh('evenement', ev(() => { V.map(); setTimeout(() => V.eventSheet && V.eventSheet(), 400); }), 1500);
    await sh('suppression-compte', ev(() => { V.settings(); V.deleteAccount(); }));
    await sh('carte-nuit-neon', async () => { await p.evaluate(() => { closeSheet(true); LIVE.sim = { hour: 23 }; V.map(); }); }, 3000);
    report.push(...p.errs.map(e => `${tag} ERREUR JS : ${e}`), ...fr.errs.map(e => `${tag} (ami) ERREUR JS : ${e}`));
    // planches
    for (let k = 0; k < shots.length; k += 6) { const part = shots.slice(k, k + 6); execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB') for f in fs]; w,h=ims[0].size; s=300/w
ims=[im.resize((300,int(h*s))) for im in ims]; H=ims[0].height+22
W=Image.new('RGB',(306*len(ims),H),'white'); d=ImageDraw.Draw(W)
for i,(im,f) in enumerate(zip(ims,fs)): W.paste(im,(i*306,22)); d.text((i*306+4,4),f.split('/')[-1][:-4],fill=(0,0,0))
W.save(sys.argv[1],quality=82)`, `${OUT}/planche_${tag}_${k / 6 + 1}.jpg`, ...part.map(x => x[0])]); }
    await p.context().close(); await fr.context().close();
  }
  console.log(report.length ? report.join('\n') : 'aucune anomalie détectée automatiquement'); await b.close();
})();
