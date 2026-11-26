const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  const t = s => p.evaluate(s);
  await t(`quickSetup();ST.introSeen={bdf:1};const r={id:777,cat:'medical',label:'Malaise',zone:'Fosse',at:[...ZONES[0].at],status:'En route',time:ST.clock,hist:[],mine:false};ST.reports.unshift(r);FX.dispatch(r);ST.role='staff';S.map()`);
  await p.waitForTimeout(500);
  console.log(await t(`JSON.stringify({n:FX.vehicles.length,v:FX.vehicles.map(v=>({k:v.kind,pts:v.pts.length,first:v.pts[0],last:v.pts[v.pts.length-1]})),mv:!!MV&&MV.alive,fx:!!(MV&&MV.fx), rep: ST.reports.find(r=>r.id===777)?.status, secours: POIS.find(o=>o.id==='secours')})`));
  console.log('errs', errs);
  await b.close();
})();
