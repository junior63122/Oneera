const { chromium } = require('playwright'); const O='/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/av3/';
(async()=>{const b=await chromium.launch();const er=[];for(const [w,h] of [[860,580],[360,640]]){const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>er.push(e.message));
await p.goto('http://127.0.0.1:8090/local.html?nouveau');await p.waitForTimeout(600);
await p.evaluate(`quickSetup();ST.me.av2={g:'f',hair:'bun',hairC:3,skin:2,top:'crop',topC:7,bottom:'flare',bottomC:10,shoes:'chunky'};V.avatarPick(null,false)`);await p.waitForTimeout(500);
await p.click('[data-t="body"]');await p.waitForTimeout(600);await p.screenshot({path:O+`s${w}_body.png`});
await p.click('[data-t="hair"]');await p.waitForTimeout(600);await p.screenshot({path:O+`s${w}_hair.png`});}
console.log(er.join('|')||'ok');await b.close()})();
