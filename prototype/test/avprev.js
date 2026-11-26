const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const js = 'const esc=s=>String(s);' + fs.readFileSync('src/avatar.js', 'utf8');
  await p.setContent(`<body style="margin:0;background:linear-gradient(#BFD0F5,#F8DDEB)"><div id=g style="display:flex;flex-wrap:wrap;gap:6px;padding:8px"></div><script>${js}
  const g=document.getElementById('g'); AV_PRESETS.forEach(c=>{const d=document.createElement('div'); d.innerHTML=avatarSVG(c,{pedestal:true,style:'width:124px;height:256px'}); g.append(d)});
  [{pose:'wave'},{pose:'peace',hat:'cap',hatC:2},{hair:'bun',hat:'beanie',beard:'beard',mouth:'o'},{outfit:'longdress',topC:7,hair:'long',hairC:5},{outfit:'jumpsuit',topC:5,hat:'cowboy',hatC:13},{hat:'headphones',glasses:'star',glassesC:4,eyes:'wink'}].forEach(c=>{const d=document.createElement('div'); d.innerHTML=avatarSVG(c,{pedestal:true,style:'width:124px;height:256px'}); g.append(d)});
  AV_PRESETS.slice(0,8).forEach(c=>{const d=document.createElement('div'); d.innerHTML=avatarSVG(c,{view:'head',style:'width:90px;height:90px;background:#fff;border-radius:45px'}); g.append(d)});
  </script></body>`);
  await p.waitForTimeout(300); await p.screenshot({ path: 'test/avprev.png', fullPage: true }); await b.close(); })();
