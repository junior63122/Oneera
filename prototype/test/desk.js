const { chromium } = require('playwright'); const O='/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/av3/';
(async()=>{const b=await chromium.launch();for(const [w,h] of [[860,580],[1280,720],[390,844]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();
await p.goto('http://127.0.0.1:8090/local.html?nouveau');await p.waitForTimeout(700);
await p.evaluate(`quickSetup();ST.tourDone=0;ST.introSeen={bdf:1};V.map()`);await p.waitForTimeout(1800);await p.screenshot({path:O+`d${w}_map.png`});
await p.evaluate(`V.avatarPick(null,false)`);await p.waitForTimeout(500);await p.screenshot({path:O+`d${w}_st.png`});
await p.click('[data-t="shoes"]');await p.waitForTimeout(300);await p.screenshot({path:O+`d${w}_shoes.png`});}
await b.close()})();
