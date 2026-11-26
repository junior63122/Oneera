// ===== Modération du texte affiché sur l'avatar (copie fidèle de packages/backend/src/moderation.ts ; le serveur reste la référence) =====
const MOD_WORDS = ['con', 'cons', 'conne', 'connes', 'pd', 'pds', 'ntm', 'fdp', 'tg', 'kys', 'bite', 'bites', 'zob', 'nazi', 'nazis', 'kkk', 'pute', 'putes',
  'nique', 'niquer', 'nik', 'pede', 'pedes', 'mongol', 'negro', 'negros', 'shit', 'sex', 'heil', 'ta gueule', 'sieg heil', 'nique ta mere', 'fils de pute'];
const MOD_STEMS = ['connard', 'connasse', 'putain', 'salope', 'salaud', 'encule', 'batard', 'tapette', 'gouine', 'negre', 'bougnoul', 'youpin', 'bicot',
  'chinetoque', 'merde', 'couille', 'chatte', 'branleur', 'abruti', 'debile', 'trisomique', 'fuck', 'fck', 'bitch', 'nigger', 'nigga', 'cunt', 'whore',
  'slut', 'faggot', 'hitler', 'porno', 'porn', 'cocaine'];
const MOD_LEET = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '+': 't' };
function isOffensiveText(raw) {
  const collapse = s => s.replace(/(.)\1+/g, '$1');
  const n = String(raw ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[0-9!@$+]/g, c => MOD_LEET[c] ?? c).replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return false;
  const glued = []; let run = '';
  for (const t of n.split(' ')) { if (t.length === 1) run += t; else { if (run) glued.push(run); run = ''; glued.push(t); } }
  if (run) glued.push(run);
  const phrase = ` ${glued.join(' ')} `, phraseC = ` ${glued.map(collapse).join(' ')} `;
  for (const w of MOD_WORDS) {
    if (w.includes(' ')) { if (phrase.includes(` ${w} `) || phraseC.includes(` ${collapse(w)} `)) return true; }
    else if (glued.some(t => t === w || collapse(t) === collapse(w) || t === w + 's')) return true;
  }
  return glued.some(t => MOD_STEMS.some(s => t.includes(s) || collapse(t).includes(collapse(s))));
}
