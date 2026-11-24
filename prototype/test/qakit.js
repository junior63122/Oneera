// Studio d'avatar : genre, styles, couleurs, rendu sur la carte
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); const e = []; p.on('pageerror', x => e.push(x.message)); p.on('requestfailed', r => e.push('REQ ' + r.url()));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  await t(`quickSetup();V.avatarPick(null,true)`); await p.waitForTimeout(700);
  ok(await t(`document.querySelectorAll('.stStyles [data-c]').length===3`), 'Homme : 3 styles (silhouette + coupe)');
  await p.click('[data-g="f"]'); await p.waitForTimeout(200); ok(await t(`document.querySelectorAll('.stStyles [data-c]').length===4 && ['rousse','noir','c31','short'].every(k=>document.querySelector('.stStyles [data-c="'+k+'"]'))`), 'Femme : 4 styles distincts (pas de mélange)');
  ok(await t(`['Style','Peau','Cheveux','Haut','Bas','Chaussures'].every(x=>[...document.querySelectorAll('#tb button')].some(b=>b.textContent===x))`), 'onglets : style, peau, cheveux, haut, bas, chaussures');
  await p.click('[data-c="noir"]'); const src0 = await t(`document.querySelector('#big').src`);
  await p.click('[data-t="top"]'); await p.click('[data-v="#25314F"]'); await p.waitForTimeout(1200); const src1 = await t(`document.querySelector('#big').src`);
  ok(src1.startsWith('data:image') && src1 !== src0, 'couleur du haut appliquée sur le rendu HQ');
  ok(await t(`(async()=>{const cv=await AVK.render({char:'noir',top:'#25314F'},false);const b=await AVK.render({char:'noir'},false);const a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,c=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let d=0,same=0;for(let i=0;i<a.length;i+=4){if(a[i]!==c[i]||a[i+1]!==c[i+1]||a[i+2]!==c[i+2])d++;else if(a[i+3]>0)same++;}return d>5000&&same>d})()`), 'seule la zone du haut change, le reste du personnage est intact');
  await p.click('#un'); await p.waitForTimeout(200); ok(await t(`!document.querySelector('[data-v="#25314F"].on')`), 'annuler la dernière modification');
  await p.click('#rd'); await p.waitForTimeout(300); ok(await t(`!!document.querySelector('#big').src`), '« Surprends-moi »');
  await p.click('#pv'); ok(await t(`!document.querySelector('#mp').hidden`), 'aperçu « Voir sur la carte »');
  await p.click('#go'); await p.waitForTimeout(400); ok(await t(`!!ST.me.look && ST.me.look.g==='f'`), 'avatar enregistré');
  await t(`ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(1800); ok(await t(`(()=>{const m=MV.markers.get('p_me');const i=m&&m.querySelector('.bodyimg');return !!i&&(i.src.startsWith('data:image')||/a\\/c\\//.test(i.src))})()`), 'sur la carte : mon avatar personnalisé, en pied');
  ok(e.length === 0, 'erreurs JS : ' + (e.join(' | ') || 'aucune')); console.log(`${n - f}/${n}`); await b.close(); })();
