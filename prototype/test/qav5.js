// Tests des exigences appliquées en v5 (app visiteur)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  const t = s => p.evaluate(s); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const sheet = () => t(`(document.querySelector('.sheet .sbody')||{}).innerText||''`);
  await t(`quickSetup();ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(600);
  // reprise de session
  await p.reload(); await p.waitForTimeout(1200); ok(await t(`!!document.querySelector('#mv') && ST.account==='apple'`), 'rouvrir l’app ramène sur la carte (session reprise)');
  await t(`resetDemo();V.camera()`); await p.reload(); await p.waitForTimeout(900); ok(await t(`!document.querySelector('#mv')`), '« Recommencer » efface la session'); await t(`quickSetup();ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(600);
  // compteur d'amis, bulles
  ok(/± 3 m · \d+ amis ici · tu es visible/.test(await t(`document.querySelector('#mepill').textContent`)), 'carte : une seule pastille légère « ± 3 m · N amis ici · tu es visible »');
  ok(await t(`!!document.querySelector('.mk .bub')`), 'bulles de messages des amis sur la carte');
  await t(`V.layers()`); await p.waitForTimeout(250); await p.click('#bubT'); await p.waitForTimeout(250); ok(await t(`!document.querySelector('.mk .bub')`), 'calques : masquer les messages de la carte'); await p.click('#bubT'); await t(`closeSheet()`);
  // éventail d'avatars superposés
  ok(await t(`(()=>{const o=MapView.fan([{id:'p_a',at:[50,50]},{id:'p_b',at:[50,50]},{id:'p_c',at:[50.1,50]}],MV).off;return o.p_a&&o.p_b&&o.p_c&&Math.abs(o.p_a[0]-o.p_b[0])>=28&&Math.abs(o.p_b[0]-o.p_c[0])>=28})()`), 'avatars au même endroit : écartés en éventail, pseudos lisibles');
  // fiche Moi : inviter à me rejoindre ici, message avec mention
  await t(`V.meSheet()`); await p.waitForTimeout(250); ok((await sheet()).includes('Inviter un ami à me rejoindre ici'), 'bouton « Inviter un ami à me rejoindre ici »');
  await p.click('#inv'); await p.waitForTimeout(250); await p.click('#pf [data-u="lea"]'); await p.click('#ok'); await p.waitForTimeout(300);
  ok(await t(`ST.convos.lea.some(m=>/Rejoins-moi ici/.test(m.t))`), 'invitation reçue par l’ami avec la position');
  await t(`V.mapMessage()`); await p.waitForTimeout(250); await p.fill('#mt', 'Au bar ouest @Inès'); await p.dispatchEvent('#mt', 'input'); await p.click('#ok'); await p.waitForTimeout(300);
  ok(await t(`ST.bubbles.me && ST.bubbles.me.t.startsWith('Au bar') && ST.convos.ines.some(m=>/@Inès/.test(m.t))`), 'message sur la carte + mention @ami avec position');
  ok(await t(`!!document.querySelector('.mk.me .bub')`), 'ma bulle s’affiche au-dessus de mon avatar');
  // partage de position
  await t(`V.shareSettings()`); await p.waitForTimeout(250); const st = await sheet(); ok(['Soirée', '15 min', '1 h', '3 h', 'Arrêter'].every(x => st.includes(x)), 'partage : soirée / 15 min / 1 h / 3 h / arrêter');
  await p.click('[data-w="except"]'); await p.waitForTimeout(250); await p.click('#pf [data-u="tom"]'); await p.click('#ok'); await p.waitForTimeout(300); ok(await t(`ST.sharing.who==='except' && ST.sharing.except.includes('tom')`), 'partage : « mes amis, sauf… » avec choix des amis'); await t(`ST.sharing.who='friends';closeSheet()`);
  // signalement
  await t(`V.report()`); await p.waitForTimeout(250); const rp = await sheet(); ok(['Quelqu’un a besoin d’aide ici', 'Zone bondée / danger potentiel', 'Objets perdus / retrouvés'].every(x => rp.includes(x)), 'SOS : les 3 choix exacts du cahier des charges'); ok(/Urgence vitale \? Appelle le 112/.test(rp), 'SOS : rappel 112');
  await p.click('[data-c="lost"]'); await p.waitForTimeout(250); await p.click('#send'); await p.waitForTimeout(300); await t(`closeSheet();V.report()`); await p.waitForTimeout(200); await p.click('[data-c="lost"]'); await p.waitForTimeout(300);
  ok(await t(`ST.reports.filter(r=>r.mine&&r.cat==='lost').length===1`), 'anti-spam : pas de doublon de signalement');
  // notifications exigées
  await t(`closeSheet();V.notifs()`); await p.waitForTimeout(300); const nt = await t(`document.querySelector('.scr').innerText`);
  ok(['Activez le Bluetooth pour améliorer la précision de la carte', 'Vos amis sont à proximité', 'Un signalement a été émis dans votre zone', 'L’événement est actif', 'Tu arrives :'].every(x => nt.includes(x)), 'notifications : textes exigés avant / pendant');
  await t(`V.map();V.endOfEvent()`); await p.waitForTimeout(6500); const nt2 = await t(`ST.notifs.map(x=>x.title).join('|')`);
  ok(/terminé · merci/.test(nt2) && /Revivez l’événement/.test(nt2) && /Partagez l’application avec vos amis/.test(nt2), 'fin d’événement : merci, « Revivez l’événement », « Partagez l’application avec vos amis »');
  // mode écran
  await t(`ST.ended=false;V.map();V.kiosk(true)`); await p.waitForTimeout(300); ok(await t(`getComputedStyle(document.querySelector('.mapTop')).display==='none' && getComputedStyle(document.querySelector('.nav')).display==='none'`), 'mode écran : seulement la carte et les nuages');
  await t(`V.kiosk(false)`);
  // fenêtre : glisser vers le bas depuis le panneau
  await t(`V.poiSheet('food')`); await p.waitForTimeout(400); const fs = await sheet(); ok(/Le menu/i.test(fs) && /Burger du Bal/.test(fs) && /€/.test(fs), 'restauration : menu et prix'); ok(/Affluence estimée/.test(fs), 'fiche lieu : affluence estimée');
  const bx = await p.locator('.sheet').boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + 140); await p.mouse.down(); await p.mouse.move(bx.x + bx.width / 2, bx.y + 200, { steps: 4 }); await p.mouse.move(bx.x + bx.width / 2, bx.y + 330, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
  ok(await t(`!document.querySelector('.sheet')`), 'fenêtre : se ferme en glissant vers le bas depuis le contenu');
  // programmation
  await t(`V.programme()`); await p.waitForTimeout(300); const pg = await sheet(); ok(/en cours/.test(pg) && /à venir/.test(pg) && /terminé/.test(pg), 'programme : à venir / en cours / terminé');
  await p.click('[data-art="Kalia b2b Remo"]'); await p.waitForTimeout(300); const ar = await sheet(); ok(/Instagram/.test(ar) && /Spotify/.test(ar) && /Voir la scène sur la carte/.test(ar) && /15 min/.test(ar), 'fiche artiste : liens, rappel 15 min, voir la scène');
  await p.click('#sc'); await p.waitForTimeout(1300); ok(await t(`/Scène|scène/.test((document.querySelector('.sheet .h2')||{}).textContent||'')`), '« Voir la scène sur la carte » ouvre la scène');
  // amis
  await t(`closeSheet();V.friendSheet('lea')`); await p.waitForTimeout(300); ok(/en commun/.test(await sheet()), 'fiche ami : amis en commun'); await p.click('#more'); await p.waitForTimeout(200); ok(/Partager son profil/.test(await sheet()), 'fiche ami : partager le profil (menu …)');
  await t(`closeSheet();V.friendsTab()`); await p.waitForTimeout(300); ok(/Tu connais peut-être/.test(await t(`document.querySelector('.scr').innerText`)), 'amis : « Tu connais peut-être »');
  // réglages
  await t(`V.settings()`); await p.waitForTimeout(300); await p.click('[data-g5="edit"]'); await p.waitForTimeout(250); ok(/Confirmer/.test(await sheet()), 'modifier le profil : photo, couverture, pseudo, Confirmer');
  await p.fill('#pp', 'alex.riviera'); await p.click('#ok'); await p.waitForTimeout(300); ok(await t(`ST.me.pseudo==='alex.riviera'`), 'pseudo modifié après Confirmer');
  await p.click('[data-g="delete"]'); await p.waitForTimeout(250); ok(await t(`document.querySelector('#del').disabled`), 'suppression : bloquée tant que « SUPPRIMER » n’est pas tapé'); await p.fill('#cf', 'SUPPRIMER'); await p.dispatchEvent('#cf', 'input'); ok(await t(`!document.querySelector('#del').disabled`), 'suppression : possible après « SUPPRIMER »'); await t(`closeSheet()`);
  await p.click('[data-g="notifs"]'); await p.waitForTimeout(250); ok(/Silence de 6 h à 12 h/.test(await sheet()) && /Offres des partenaires/.test(await sheet()), 'notifications : préférences par type + silence 6 h – 12 h'); await t(`closeSheet()`);
  await p.click('[data-g5="bug"]'); await p.waitForTimeout(250); ok(/Signaler un souci de l’app/.test(await sheet()), 'signaler un souci de l’app');
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close();
})();
