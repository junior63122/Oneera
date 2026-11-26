const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/r3_';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  const t = s => p.evaluate(s); const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
  await t(`quickSetup();ST.introSeen={bdf:1};ST.mapMode='day';V.map()`); await p.waitForTimeout(700);
  const clip = await t(`(()=>{const r=document.querySelector('#screen').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})()`);
  // proj / unproj inverse
  ok(await t(`(()=>{MV.set3d(true);MV.rotateBy(.7);const a=[37,61],q=MV.proj(a),u=MV.unproj(q[0],q[1]);return Math.abs(u[0]-a[0])+Math.abs(u[1]-a[1])<1e-6})()`), 'rotation : proj/unproj inverses');
  await p.waitForTimeout(100); ok(await t(`!document.querySelector('#cmp').hidden`), 'boussole visible quand la carte est tournée');
  await p.screenshot({ path: OUT + 'rot.png', clip });
  await p.click('#cmp'); await p.waitForTimeout(600); ok(await t(`Math.abs(MV.rot)<1e-3 && document.querySelector('#cmp').hidden`), 'boussole : retour au nord');
  await p.click('#d3'); await p.waitForTimeout(900); ok(await t(`MV.tilt===1 && ST.map3d`), 'vue 3D activée');
  ok(await t(`(()=>{const a=[44,48],q=MV.projS(a),f=MV.s2flat(q[0],q[1]),u=MV.unproj(f[0],f[1]);return Math.abs(u[0]-a[0])+Math.abs(u[1]-a[1])<1e-6})()`), '3D : projection inversible (taps exacts)');
  // le marqueur « moi » doit coïncider avec le point du plan réellement affiché (DOM transformé)
  ok(await t(`(()=>{const me=[...MV.markers.values()].find(e=>e.classList.contains('me'));const r=me.getBoundingClientRect(),h=MV.host.getBoundingClientRect(),k=h.width/MV.host.offsetWidth;const q=MV.projS(ST.me.pos);return Math.abs((r.left+r.width/2-h.left)/k-q[0])<30})()`), '3D : marqueur à sa place');
  await p.screenshot({ path: OUT + '3d.png', clip });
  await t(`MV.rotateBy(-.9)`); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '3drot.png', clip });
  await t(`ST.mapMode='night'`); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '3dnight.png', clip });
  // geste deux doigts simulé via pointer events
  await t(`MV.north(1);MV.set3d(false);ST.map3d=false`); await p.waitForTimeout(700);
  ok(await t(`MV.tilt===0`), 'retour à plat');
  await t(`V.friendsTab();V.map()`); await p.waitForTimeout(400); ok(await t(`MV.canRot && MV.tilt===0`), 'nouvelle carte : réglage conservé');
  await t(`ST.role='staff';S.map()`); await p.waitForTimeout(500); ok(await t(`!!document.querySelector('#d3') && MV.canRot`), 'staff : rotation et 3D');
  await t(`ST.role='visitor';D.ev='bdf';openDash('global')`); await p.waitForTimeout(800); ok(await t(`!DMV.canRot`), 'tableau de bord : carte fixe au nord');
  console.log('errs', errs);
  await b.close();
})();
