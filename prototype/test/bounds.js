const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const inside = `(()=>{const Q=[[0,0],[MV.vw,0],[0,MV.vh],[MV.vw,MV.vh]].map(([x,y])=>{const f=MV.s2flat(x,y);return MV.unproj(f[0],f[1]);});return Q.every(q=>q[0]>=-0.2&&q[0]<=100.2&&q[1]>=-0.2&&q[1]<=100.2)})()`;
  for (const v of ['bdf', 'bisous', 'selva']) {
    await t(`quickSetup();setVenue('${v}');ST.introSeen={${v}:1};ST.map3d=false;V.map()`); await p.waitForTimeout(500);
    await t(`MV.zoomBy(.01);MV.tx+=5000;MV.ty+=5000;MV.clamp();MV.apply()`); ok(await t(inside), `${v} : dézoom + glisser au bout → l’écran reste sur le plan`);
    await t(`MV.rotateBy(.8);MV.tx-=9000;MV.clamp();MV.apply()`); ok(await t(inside), `${v} : carte tournée → jamais de bord visible`);
    await t(`MV.set3d(true)`); await p.waitForTimeout(900); await t(`MV.ty+=9000;MV.clamp();MV.apply()`); ok(await t(inside), `${v} : vue 3D → jamais de bord visible`);
  }
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune')); console.log(`${n - f}/${n}`); await b.close();
})();
