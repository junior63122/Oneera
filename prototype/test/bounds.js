// Cadrage « vue des Dieux » : on peut reculer jusqu'à voir tout le site suspendu dans les nuages, mais on ne le perd jamais de vue,
// et autour du plan il y a toujours le ciel et la mer de nuages (jamais un fond vide).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  // le centre de l'écran reste sur le plan (marge de 25 %) : on ne se perd jamais dans le ciel
  const onSite = `(()=>{const f=MV.s2flat(MV.vw/2,MV.vh/2);const q=MV.unproj(f[0],f[1]);return q[0]>=-25&&q[0]<=125&&q[1]>=-25&&q[1]<=125})()`;
  const wholeSite = `(()=>{const a=MV.proj([0,0]),c=MV.proj([100,100]);return a[0]>=-1&&a[1]>=-1&&c[0]<=MV.vw+1&&c[1]<=MV.vh+1})()`;
  const sky = `(()=>{const s=MV.host.querySelector('.seaL');return !!(s&&s.style.backgroundImage&&s.style.backgroundImage!=='none'&&getComputedStyle(MV.host).backgroundImage!=='none')})()`;
  for (const v of ['bdf', 'bisous', 'selva']) {
    await t(`quickSetup();setVenue('${v}');ST.introSeen={${v}:1};ST.map3d=false;V.map()`); await p.waitForTimeout(800);
    await t(`MV.zoomBy(.01);MV.center([50,50],MV.minS);MV.apply()`); await p.waitForTimeout(200);
    ok(await t(wholeSite), `${v} : en reculant au maximum, tout le site tient à l’écran (vue des Dieux)`);
    ok(await t(sky), `${v} : autour du site, le ciel et la mer de nuages (jamais un fond vide)`);
    await t(`MV.tx+=5000;MV.ty+=5000;MV.clamp();MV.apply()`); ok(await t(onSite), `${v} : glisser au bout → le site reste à l’écran`);
    await t(`MV.rotateBy(.8);MV.tx-=9000;MV.clamp();MV.apply()`); ok(await t(onSite), `${v} : carte tournée → le site reste à l’écran`);
    await t(`MV.set3d(true)`); await p.waitForTimeout(900); await t(`MV.ty+=9000;MV.clamp();MV.apply()`); ok(await t(onSite), `${v} : vue 3D → le site reste à l’écran`);
  }
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune')); console.log(`${n - f}/${n}`); await b.close();
})();
