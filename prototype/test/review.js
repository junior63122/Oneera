// Capture de chaque écran au format téléphone (revue UX)
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/rev/';
const S = [
  ['01_camera', 'resetDemo();V.camera()'], ['02_welcome', 'resetDemo();V.welcome()'], ['03_phone', 'resetDemo();V.phone()'], ['04_profile', 'resetDemo();V.profile()'], ['05_avatarQuick', 'resetDemo();V.avatarQuick()'],
  ['06_editor', 'quickSetup();V.avatarEditor(null)'], ['07_perms', 'resetDemo();V.perms()'], ['08_addFriends', 'resetDemo();ST.account="apple";V.addFriends(true)'],
  ['09_tour', 'resetDemo();quickSetup();ST.tourDone=false;ST.introSeen={bdf:1};V.map()', 1200], ['10_map', 'quickSetup();ST.tourDone=true;ST.introSeen={bdf:1};ST.mapMode="day";V.map()'], ['11_mapNight', 'ST.mapMode="night";V.map()', 900],
  ['12_map3d', 'ST.mapMode="day";ST.map3d=true;V.map()', 1200], ['13_layers', 'ST.map3d=false;V.map();V.layers()'], ['14_me', 'V.map();V.meSheet()'], ['15_mapMsg', 'V.mapMessage()'], ['16_event', 'V.map();V.eventSheet()'],
  ['17_prog', 'V.programme()'], ['18_artist', 'V.artist("Kalia b2b Remo")'], ['19_poiBar', 'closeSheet();V.poiSheet("barO")'], ['20_poiFood', 'V.poiSheet("food")'], ['21_poiScene', 'V.poiSheet("scene")'], ['22_friend', 'V.friendSheet("lea")'],
  ['23_rdv', 'V.rdvSheet(null)'], ['24_report', 'V.report()'], ['25_reportDetail', 'V.reportDetail("medical")'], ['26_share', 'V.shareSettings()'], ['27_search', 'closeSheet();V.search()'], ['28_notifs', 'V.notifs()'],
  ['29_friends', 'V.friendsTab()'], ['30_chatList', 'V.chatList()'], ['31_chat', 'V.chat("lea")'], ['32_settings', 'V.settings()'], ['33_editProfile', 'V.editProfile()'], ['34_notifPrefs', 'V.notifPrefs()'],
  ['35_recap', 'closeSheet();V.recap()'], ['36_replay', 'V.replay()', 900], ['37_find', 'V.findFriend("lea")', 700], ['38_discover', 'V.discover()'], ['39_wallet', 'V.map();V.wallet()'], ['40_guest', 'resetDemo();ST.account="guest";ST.introSeen={bdf:1};V.map()'],
  ['41_offline', 'quickSetup();ST.offline=true;ST.introSeen={bdf:1};V.map()'], ['42_club', 'ST.offline=false;setVenue("bisous");ST.introSeen={bisous:1};V.map()', 900], ['43_selva', 'setVenue("selva");ST.introSeen={selva:1};V.map()', 900],
  ['44_staffMap', 'setVenue("bdf");ST.role="staff";S.map()', 800], ['45_staffAlerts', 'S.alerts()'], ['46_staffAlert', 'S.alert(ST.reports[0].id)'], ['47_staffTeam', 'closeSheet();S.team()'], ['48_staffMe', 'S.me()'], ['49_bar', 'ST.role="bar";S.bar()'],
  ['50_lock', 'ST.role="visitor";V.map();V.lock()'],
];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(900);
  for (const [n, js, w] of S) { try { await p.evaluate(`(()=>{document.querySelector('.tour')&&!${n.includes('tour')}&&document.querySelector('.tour').remove();${js}})()`); } catch (e) { errs.push(n + ': ' + e.message); } await p.waitForTimeout(w || 550); await p.screenshot({ path: OUT + n + '.png' }); }
  console.log('errs', errs); await b.close();
})();
