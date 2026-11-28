// La bulle de l'avatar ne doit jamais recouvrir le visage, sur chaque onglet (caméra différente) et sur deux tailles d'écran.
const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  for (const dev of ['iPhone 14', 'iPhone SE']) { const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage();
    await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(900);
    await p.evaluate(() => { ST.me.av2 = { ...AV2_DEFAULT, g: 'm', hair: 'afro', glasses: 'round', beard: 'goatee', outfit: 'suit', outfitC: 5 }; V.avatarPick(() => {}, false); }); await p.waitForTimeout(700);
    for (const t of ['body', 'face', 'hair', 'top', 'bottom', 'shoes', 'acc', 'cost']) { await p.click(`#tb button[data-t="${t}"]`); await p.waitForTimeout(500);
      await p.evaluate(() => window.__studioSay('Psst… essaie les déguisements, je rêve d’être pompier 🚒', 9000));
      await p.evaluate(() => new Promise(r => setTimeout(r, 450)));
      const r = await p.evaluate(() => { const B = document.querySelector('.stSay').getBoundingClientRect(), F = document.querySelector('#big .avFace').getBoundingClientRect(), S = document.querySelector('.stStage').getBoundingClientRect();
        const ix = Math.max(0, Math.min(B.right, F.right) - Math.max(B.left, F.left)), iy = Math.max(0, Math.min(B.bottom, F.bottom) - Math.max(B.top, F.top)); const visF = Math.max(0, Math.min(F.bottom, S.bottom) - Math.max(F.top, S.top)) * Math.max(0, Math.min(F.right, S.right) - Math.max(F.left, S.left));
        const eyesY = F.top + F.height * .42; const coversEyes = B.bottom > eyesY - 4 && B.top < F.top + F.height * .85 && ix > 0; return { cover: coversEyes ? 1 : visF ? (ix * iy) / visF : 0, inside: B.left >= S.left - 1 && B.right <= S.right + 1 && B.top >= S.top - 1 && B.bottom <= S.bottom + 1, side: document.querySelector('.stSay').dataset.side }; });
      ok(r.cover < .2 && r.inside, `${dev} · onglet ${t} : la bulle ne cache pas le visage (${Math.round(r.cover * 100)} % · ${r.side}) et reste dans l’écran`);
      if (OUT) await p.screenshot({ path: `${OUT}_${dev.replace(' ', '')}_${t}.png` }); }
    await c.close(); }
  console.log(`${n - f}/${n}`); await b.close(); })();
