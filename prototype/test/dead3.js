const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
 const errs=[]; p.on('pageerror', e => errs.push(e.message));
 await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
 const t=s=>p.evaluate(s); const sig=()=>t(`document.querySelector('#dash').innerText.length+'|'+document.querySelector('#dash').innerHTML.length+'|'+(document.querySelector('.dmodal,.modal,.dsheet')?'modal':'')`);
 for (const [v,txt] of [['prep','Poser une balise'],['prep','Ajouter un lieu'],['alerts','Ouvrir'],['comm','Information'],['comm','Orientation des flux'],['replay','Vitesse']]) {
  await t(`D.ev="bdf";D.crisis=false;openDash("${v}")`); await p.waitForTimeout(500); const s0=await sig();
  const el=p.locator('#dash button',{hasText:txt}).first(); const info=await el.evaluate(e=>e.outerHTML.slice(0,140)).catch(()=>'none');
  await el.click({timeout:2000}).catch(e=>console.log('err',e.message.slice(0,60))); await p.waitForTimeout(800);
  console.log(v,txt,s0,'->',await sig(), info);
 }
 console.log('errs',errs); await b.close(); })();
