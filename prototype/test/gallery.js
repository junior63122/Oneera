const { chromium } = require('playwright');
const SHOTS = [
  ['map', 'quickSetup();ST.role="visitor";V.map()'], ['poi_barC', 'quickSetup();V.map();V.poiSheet("barC")'], ['poi_scene', 'quickSetup();V.map();V.poiSheet("scene")'], ['poi_partner', 'quickSetup();V.map();V.poiSheet("partner")'],
  ['friend_lea', 'quickSetup();V.map();V.friendSheet("lea")'], ['friend_sami', 'quickSetup();V.map();V.friendSheet("sami")'], ['route', 'quickSetup();V.map();V.goTo(POIS.find(p=>p.id==="barE").at,"Bar Est","Q")'],
  ['report', 'quickSetup();V.map();V.report()'], ['reportDetail', 'quickSetup();V.map();V.reportDetail("medical")'], ['rdv', 'quickSetup();V.map();V.rdvSheet(null)'], ['share', 'quickSetup();V.map();V.shareSettings()'],
  ['layers', 'quickSetup();V.map();V.layers()'], ['crowd', 'quickSetup();showCrowd=true;V.map()'], ['friends', 'quickSetup();V.friendsTab()'], ['chatList', 'quickSetup();V.chatList()'], ['chat', 'quickSetup();V.chat("lea")'],
  ['notifs', 'quickSetup();V.notifs()'], ['search', 'quickSetup();V.search()'], ['settings', 'quickSetup();V.settings()'], ['recap', 'quickSetup();V.recap()'], ['replay', 'quickSetup();V.replay()'],
  ['offline', 'quickSetup();ST.offline=true;V.map()'], ['guest', 'resetDemo();ST.account="guest";V.map()'],
  ['staffMap', 'ST.role="staff";S.map()'], ['staffAlerts', 'ST.role="staff";S.alerts()'], ['staffAlert', 'ST.role="staff";S.map();S.alert(9001)'], ['staffTeam', 'S.team()'], ['bar', 'ST.role="bar";S.bar()']
];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
  for (const [n, s] of SHOTS) { await p.evaluate(`(()=>{document.querySelector('#dash')&&closeDash();${s}})()`); await p.waitForTimeout(900); await p.locator('#screen').screenshot({ path: `gal/${n}.png` }); }
  for (const v of ['global', 'alerts', 'replay', 'compare', 'prog', 'bars', 'comm', 'beacons', 'data']) { await p.evaluate(`openDash("${v}")`); await p.waitForTimeout(1000); await p.screenshot({ path: `gal/dash_${v}.png`, fullPage: false }); }
  await b.close(); })();
