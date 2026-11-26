// Captures de la carte vivante
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/fx_';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  const t = s => p.evaluate(s); const shot = async (n, clip) => p.screenshot({ path: OUT + n + '.png', clip: clip || { x: 0, y: 0, width: 1360, height: 900 } });
  const ph = await t(`(()=>{const r=document.querySelector('#mv')?.getBoundingClientRect()||document.querySelector('#screen').getBoundingClientRect();return {x:Math.max(0,r.left-10),y:Math.max(0,r.top-10),width:r.width+20,height:r.height+20}})()`);
  await t(`quickSetup();ST.introSeen={bdf:1,bisous:1,selva:1};ST.mapMode='day';V.map()`); await p.waitForTimeout(900);
  const clip = await t(`(()=>{const r=document.querySelector('#screen').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})()`);
  await shot('day', clip);
  await t(`ST.mapMode='night';`); await p.waitForTimeout(900); await shot('night', clip);
  await t(`MV.zoomBy(.4)`); await p.waitForTimeout(700); await shot('night_out', clip);
  await t(`ST.mapMode='auto';ST.introSeen={};V.map()`); await p.waitForTimeout(450); await shot('intro1', clip); await p.waitForTimeout(700); await shot('intro2', clip); await p.waitForTimeout(1800); await shot('intro3', clip);
  await t(`ST.mapMode='night'`); await p.click('[data-p="fw"]'); await p.waitForTimeout(3300); await shot('fireworks', clip);
  await t(`setVenue('bisous');ST.introSeen={bisous:1};V.map()`); await p.waitForTimeout(900); await shot('club_night', clip);
  await t(`ST.mapMode='day'`); await p.waitForTimeout(600); await t(`MV.zoomBy(.3)`); await p.waitForTimeout(600); await shot('club_day', clip);
  await t(`setVenue('selva');ST.introSeen={selva:1};ST.mapMode='night';V.map()`); await p.waitForTimeout(900); await shot('selva_night', clip);
  await t(`setVenue('bdf');ST.mapMode='auto';V.map();const r={id:777,cat:'medical',label:'Malaise',zone:'Fosse',at:[...ZONES[0].at],status:'En route',time:ST.clock,hist:[],mine:false};ST.reports.unshift(r);FX.dispatch(r);ST.role='staff';S.map()`); await p.waitForTimeout(4500); await shot('ambulance', clip);
  await t(`ST.role='visitor';D.ev='bdf';D.layers.flow=true;D.layers.heat=false;openDash('global')`); await p.waitForTimeout(1500); await shot('dash_flows');
  await t(`D.layers.heat=true;openDash('replay')`); await p.waitForTimeout(1500); await shot('dash_replay');
  console.log('errors', errs.length ? errs : 'aucune');
  await b.close();
})();
