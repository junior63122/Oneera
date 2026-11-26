const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
 await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
 const L=[['dark','quickSetup();ST.theme="dark";applyTheme();V.settings()'],['darkmap','quickSetup();ST.theme="dark";applyTheme();V.map();V.poiSheet("barO")'],['barclub','quickSetup();setVenue("bisous");ST.role="bar";S.bar()'],['friends','ST.theme="light";applyTheme();setVenue("bdf");quickSetup();V.friendsTab()'],['eventselva','quickSetup();setVenue("selva");V.map();V.eventSheet()']];
 for (const [n,s] of L){ await p.evaluate(s); await p.waitForTimeout(700); await p.screenshot({clip:{x:0,y:0,width:520,height:900},path:'/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/s_'+n+'.png'}); }
 await b.close(); })();
