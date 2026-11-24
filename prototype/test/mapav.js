const { chromium } = require('playwright'); const O='/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/av3/';
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();const er=[];p.on('pageerror',e=>er.push(e.message));
await p.goto('http://127.0.0.1:8090/local.html?nouveau');await p.waitForTimeout(600);
await p.evaluate(`quickSetup();ST.introSeen={bdf:1};V.map()`);await p.waitForTimeout(1500);
await p.evaluate(`MV.flyTo(ST.me.pos,MV.s*1.6,10)`);await p.waitForTimeout(1200);
await p.screenshot({path:O+'map390.png'});console.log(er.join('|')||'ok');await b.close()})();
