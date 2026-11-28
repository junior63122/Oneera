// Signalement réel de bout en bout : un visiteur (navigateur, iPhone 14) signale, un agent de sécurité
// (vrai compte staff de l'organisation de l'événement) le prend en charge ; l'app du visiteur suit chaque étape.
const { chromium, devices } = require('playwright');
const { execSync } = require('child_process');
const API = process.argv[2] || 'http://127.0.0.1:8787';
const DB = process.env.E2E_DB || 'postgres://oneera@127.0.0.1:55432/oneera_e2e';
const j = (m, path, body, tok) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, json: await r.json() }));
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const stamp = Date.now();
  const vis = (await j('POST', '/v1/auth/signup', { email: `rep${stamp}@e2e.test`, password: 'Motdepasse-42', displayName: 'Maëlle' })).json;
  const agent = (await j('POST', '/v1/auth/signup', { email: `sec${stamp}@e2e.test`, password: 'Motdepasse-42', displayName: 'Agent Karim' })).json;
  const ev = (await j('GET', '/v1/events/BDF-DEMO')).json.id;
  const org = execSync(`psql ${DB} -Atc "SELECT organization_id FROM events WHERE id = '${ev}'"`).toString().trim();
  execSync(`psql ${DB} -Atc "INSERT INTO staff_memberships (user_id, organization_id, role) VALUES ('${agent.user.id}', '${org}', 'security') ON CONFLICT DO NOTHING"`);
  ok((await j('GET', `/v1/staff/events/${ev}/incidents`, null, vis.token)).status === 403, 'un visiteur ne voit pas la liste du staff');

  const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=' + API); await p.evaluate((x) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: x.token, user: x.user })), vis);
  await p.goto('http://127.0.0.1:8090/local.html?api=' + API); await p.waitForTimeout(1800); await p.evaluate(() => { ST.tourDone = true; ST.perms.loc = 'app'; V.map(); }); await p.waitForTimeout(600);
  await p.evaluate(() => V.report()); await p.waitForTimeout(400);
  const sheet = await p.evaluate(() => document.querySelector('.sheet').innerText);
  ok(/Quelqu’un a besoin d’aide ici/.test(sheet) && /Zone bondée \/ danger potentiel/.test(sheet) && /Objets perdus \/ retrouvés/.test(sheet), 'les 3 choix exacts du cahier');
  ok(/Transmis en direct à l’équipe du lieu/.test(sheet) && !/Version de test/.test(sheet) && /112/.test(sheet), 'plus d’avertissement « version de test » ; rappel 112 conservé');
  await p.click('[data-c="medical"]'); await p.waitForTimeout(300); await p.click('#nt .chip'); await p.click('#send'); await p.waitForTimeout(1500);
  const list = (await j('GET', `/v1/staff/events/${ev}/incidents?open=1`, null, agent.token)).json.incidents;
  const inc = list.find(i => i.description && i.description.includes('Malaise'));
  ok(inc && inc.category === 'help' && inc.priority === 'critical' && inc.status === 'open', 'reçu par le staff réel : aide, critique, avec le détail choisi');
  ok(inc && inc.x !== null && inc.y !== null, 'position jointe');
  const st = async () => p.evaluate(() => (ST.reports.find(r => r.real) || {}).status);
  ok(await st() === 'Reçue', 'app du visiteur : « Reçue »');
  for (const [s, label] of [['assigned', 'En route'], ['in_progress', 'Sur place'], ['resolved', 'Résolu']]) {
    await j('POST', `/v1/staff/incidents/${inc.id}/status`, { status: s }, agent.token);
    let got; for (let i = 0; i < 40 && (got = await st()) !== label; i++) await p.waitForTimeout(100);
    ok(got === label, `l’agent passe à « ${label} » → l’app l’affiche en direct`);
  }
  await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/e2e-report-resolu.png' });
  ok(/Alerte résolue/.test(await p.evaluate(() => document.querySelector('.sheet') ? document.querySelector('.sheet').innerText : '')), 'écran de suivi : « Alerte résolue »');
  // Doublon en moins de 3 min : pas de second envoi.
  await p.evaluate(() => { closeSheet(true); V.report(); }); await p.waitForTimeout(300); await p.click('[data-c="crowd"]'); await p.waitForTimeout(200); await p.click('#send'); await p.waitForTimeout(900);
  await p.evaluate(() => { closeSheet(true); V.report(); }); await p.waitForTimeout(300); await p.click('[data-c="crowd"]'); await p.waitForTimeout(500);
  const mine = (await j('GET', `/v1/events/${ev}/reports/mine`, null, vis.token)).json.reports;
  ok(mine.filter(r => r.category === 'crowd').length === 1, 'anti-doublon : un seul « zone bondée » envoyé');
  // Hors réseau : file d'attente puis envoi au retour.
  await p.evaluate(() => { closeSheet(true); ST.offline = true; V.report(); }); await p.waitForTimeout(300); await p.click('[data-c="lost"]'); await p.waitForTimeout(200); await p.click('#send'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => ST.reports.find(r => r.real && r.cat === 'lost').status) === 'En attente réseau', 'sans réseau : « En attente réseau »');
  await p.evaluate(() => { ST.offline = false; flushOffline(); emit(); }); await p.waitForTimeout(1500);
  const mine2 = (await j('GET', `/v1/events/${ev}/reports/mine`, null, vis.token)).json.reports;
  ok(mine2.some(r => r.category === 'lost_found') && await p.evaluate(() => ST.reports.find(r => r.real && r.cat === 'lost').status) === 'Reçue', 'réseau revenu : envoyé une seule fois, « Reçue »');
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close(); })();
