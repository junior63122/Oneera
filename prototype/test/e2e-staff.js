// Espace staff réel de bout en bout : la directrice crée un code, un agent rejoint l'équipe depuis l'app,
// reçoit en direct l'alerte d'un visiteur et la traite ; programmation poussée en direct aux visiteurs.
const { chromium, devices } = require('playwright');
const { execSync } = require('child_process');
const API = process.argv[2] || 'http://127.0.0.1:8787';
const APP = process.env.APP || 'http://127.0.0.1:8090';
const DB = process.env.E2E_DB || 'postgres://oneera@127.0.0.1:55432/oneera_e2e';
const j = (m, path, body, tok) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, json: await r.json() }));
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const stamp = Date.now(), errs = [];
  const mk = async (nm) => (await j('POST', '/v1/auth/signup', { email: `${nm.toLowerCase()}${stamp}@staff.test`, password: 'Motdepasse-42', displayName: nm })).json;
  const boss = await mk('Directrice'), agent = await mk('Karim'), vis = await mk('Zoé');
  const ev = (await j('GET', '/v1/events/BDF-DEMO')).json.id;
  const org = execSync(`psql ${DB} -Atc "SELECT organization_id FROM events WHERE id = '${ev}'"`).toString().trim();
  execSync(`psql ${DB} -Atc "INSERT INTO staff_memberships (user_id, organization_id, role) VALUES ('${boss.user.id}', '${org}', 'owner') ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', revoked_at = NULL"`);
  const code = (await j('POST', `/v1/staff/orgs/${org}/invites`, { role: 'security', hours: 2, maxUses: 1 }, boss.token)).json.invite.code;
  const phone = async (acc) => { const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(APP + '/local.html?nouveau&api=' + API); await p.evaluate((x) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: x.token, user: x.user })), acc);
    await p.goto(APP + '/local.html?api=' + API); await p.waitForTimeout(1800); await p.evaluate(() => { ST.tourDone = true; ST.perms.loc = 'app'; V.map(); }); await p.waitForTimeout(500); return p; };
  const A = await phone(agent), V2 = await phone(vis);

  // L'agent rejoint l'équipe depuis Réglages → Espace staff.
  await A.evaluate(() => V.settings()); await A.waitForTimeout(300);
  ok(await A.$('#stsp') !== null, 'Réglages : entrée « Espace staff »');
  await A.click('#stsp'); await A.waitForTimeout(700);
  await A.fill('#sc', 'FAUXCODE0000'); await A.click('#sj'); await A.waitForTimeout(600);
  ok(/invalide/i.test(await A.textContent('#se')), 'mauvais code : message clair');
  await A.fill('#sc', code.toLowerCase()); await A.click('#sj'); await A.waitForTimeout(1500);
  ok(await A.evaluate(() => ST.role !== 'visitor' && REAL.staffOrg && REAL.staffOrg.role === 'security'), 'code accepté : mode staff, rôle Sécurité');
  ok(/Alertes/.test(await A.evaluate(() => document.querySelector('#screen').innerText)), 'écran Alertes ouvert');
  ok(await A.evaluate(() => !ST.reports.some(r => !r.staffReal)), 'aucune alerte de démonstration sur un compte réel');

  // Le visiteur signale : l'agent le reçoit en direct.
  await V2.evaluate(() => V.report()); await V2.waitForTimeout(300); await V2.click('[data-c="crowd"]'); await V2.waitForTimeout(200); await V2.click('#send');
  let got = null; for (let i = 0; i < 50 && !got; i++) { await A.waitForTimeout(100); got = await A.evaluate(() => (ST.reports.find(r => r.staffReal && r.label.startsWith('Zone bondée') && r.status === 'Reçue') || {}).id || null); }
  ok(!!got, 'alerte du visiteur reçue en direct par l’agent');
  ok(/Zone bondée/.test(await A.evaluate(() => document.querySelector('#screen').innerText)), 'visible dans la liste « À prendre »');
  for (const [label, vLabel] of [['Je prends en charge · en route', 'En route'], ['Je suis sur place', 'Sur place'], ['Clôturer l’alerte', 'Résolu']]) {
    await A.evaluate((id) => S.alert(id), got); await A.waitForTimeout(300);
    const t = await A.textContent('#nx'); ok(t.trim() === label, `bouton « ${label} »`);
    await A.click('#nx'); await A.waitForTimeout(900);
    let vs; for (let i = 0; i < 30 && (vs = await V2.evaluate(() => (ST.reports.find(r => r.real) || {}).status)) !== vLabel; i++) await V2.waitForTimeout(100);
    ok(vs === vLabel, `le visiteur voit « ${vLabel} » en direct`);
  }
  await A.evaluate((id) => S.alert(id), got); await A.waitForTimeout(300);
  ok(await A.$('#nx') === null, 'alerte résolue : plus de bouton d’action');
  await A.screenshot({ path: (process.env.SHOTS || '/tmp') + '/e2e-staff-alerte.png' });

  // Équipe : un agent sécurité ne voit pas la liste ; la directrice crée un code et suspend.
  await A.evaluate(() => { closeSheet(true); S.team(); }); await A.waitForTimeout(800);
  ok(/réservée aux managers/.test(await A.evaluate(() => document.querySelector('#screen').innerText)), 'Équipe : liste réservée aux managers');
  const D = await phone(boss); await D.evaluate(() => V.staffSpace()); await D.waitForTimeout(800); await D.click('[data-org]'); await D.waitForTimeout(800);
  await D.evaluate(() => S.team()); await D.waitForTimeout(900);
  ok(/Karim/.test(await D.evaluate(() => document.querySelector('#screen').innerText)), 'directrice : Karim dans l’équipe');
  await D.click('#mk'); await D.waitForTimeout(700);
  ok(/[0-9A-F]{12}/.test(await D.textContent('#cd')), 'directrice : code d’invitation créé');
  await D.click(`[data-sus="${agent.user.id}"]`); await D.waitForTimeout(900);
  ok((await j('GET', `/v1/staff/events/${ev}/incidents`, null, agent.token)).status === 403, 'Karim suspendu : accès coupé immédiatement');
  await D.screenshot({ path: (process.env.SHOTS || '/tmp') + '/e2e-staff-equipe.png' });

  // Programmation saisie par la directrice → poussée en direct au visiteur.
  const h = (k) => new Date(Date.now() + k * 3600e3).toISOString();
  await j('POST', `/v1/staff/events/${ev}/programme`, { title: 'DJ Test ' + stamp, kind: 'dj', stage: 'scene', startsAt: h(1), endsAt: h(2) }, boss.token);
  let lp = false; for (let i = 0; i < 30 && !lp; i++) { await V2.waitForTimeout(100); lp = await V2.evaluate((t) => LINEUP.some(l => l.a === t), 'DJ Test ' + stamp); }
  ok(lp, 'programmation de l’organisateur reçue en direct par le visiteur');
  await V2.evaluate(() => V.programme()); await V2.waitForTimeout(400);
  ok((await V2.evaluate(() => document.querySelector('.sheet').innerText)).includes('DJ Test ' + stamp), 'écran Programme : passage réel affiché');
  execSync(`psql ${DB} -Atc "DELETE FROM programme_items WHERE title = 'DJ Test ${stamp}'"`);

  // Tableau de bord réel : 6 personnes consentantes au même endroit → chiffrées ; 2 ailleurs → masquées.
  const zk = 'zt' + String(stamp).slice(-6), zk2 = 'zp' + String(stamp).slice(-6);
  execSync(`psql ${DB} -Atc "WITH t AS (SELECT id FROM tenants WHERE slug = 'oneera'), u AS (INSERT INTO users (tenant_id, display_name, is_guest) SELECT t.id, 'S' || g, true FROM t, generate_series(1, 8) g RETURNING id), c AS (INSERT INTO consents (user_id, purpose, policy_version) SELECT id, 'location_venue_stats', 't' FROM u RETURNING user_id) INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68, zone_key) SELECT user_id, '${ev}', '${org}', date_trunc('minute', now()) - interval '1 minute' + interval '5 seconds', 'L0', ST_SetSRID(ST_MakePoint(50, 50), 0), 3, CASE WHEN row_number() OVER () <= 6 THEN '${zk}' ELSE '${zk2}' END FROM c" && psql ${DB} -Atc "SELECT app.rollup_minutes('${ev}', now() - interval '10 minutes', now())"`);
  await D.evaluate(() => S.me()); await D.waitForTimeout(300); await D.click('#rdb'); await D.waitForTimeout(1500);
  const dash = await D.evaluate(() => document.querySelector('.sheet').innerText);
  ok(/Tableau de bord · en direct/.test(dash) && dash.includes(zk) && /Pic 6/.test(dash), 'tableau de bord : zone réelle chiffrée (6 personnes)');
  ok(dash.includes(zk2) && /Moins de 5 personnes/.test(dash) && !/Pic 2/.test(dash), 'tableau de bord : zone de 2 personnes jamais chiffrée');
  await D.screenshot({ path: (process.env.SHOTS || '/tmp') + '/e2e-staff-dashboard.png' });
  await D.evaluate(() => closeSheet(true));
  ok((await j('GET', `/v1/dashboard/events/${ev}/live`, null, vis.token)).status === 403, 'tableau de bord refusé à un visiteur');
  // Retour au mode visiteur.
  await D.evaluate(() => S.me()); await D.waitForTimeout(300); await D.click('#lv'); await D.waitForTimeout(600);
  ok(await D.evaluate(() => ST.role === 'visitor' && !REAL.staffOrg), 'retour au mode visiteur');
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close(); })();
