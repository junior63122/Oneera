/**
 * Modération des textes courts affichés à d'autres personnes (texte sur le t-shirt de l'avatar).
 * Normalisation : minuscules, accents retirés, « leet speak » ramené aux lettres, lettres répétées réduites.
 * - WORDS : refusés seulement comme mots entiers (« con » refusé, « bacon », « contact » acceptés ; « nique » refusé, « unique » accepté).
 * - STEMS : refusés s'ils apparaissent dans un mot (« connards », « putain »).
 * - Les lettres épelées une à une (« p u t a i n ») sont recollées puis vérifiées.
 * La même liste est utilisée dans l'app (retour immédiat) ; le serveur reste la référence.
 */
const WORDS = ['con', 'cons', 'conne', 'connes', 'pd', 'pds', 'ntm', 'fdp', 'tg', 'kys', 'bite', 'bites', 'zob', 'nazi', 'nazis', 'kkk', 'pute', 'putes',
  'nique', 'niquer', 'nik', 'pede', 'pedes', 'mongol', 'negro', 'negros', 'shit', 'sex', 'heil', 'ta gueule', 'sieg heil', 'nique ta mere', 'fils de pute'];
const STEMS = ['connard', 'connasse', 'putain', 'salope', 'salaud', 'encule', 'batard', 'tapette', 'gouine', 'negre', 'bougnoul', 'youpin', 'bicot',
  'chinetoque', 'merde', 'couille', 'chatte', 'branleur', 'abruti', 'debile', 'trisomique', 'fuck', 'fck', 'bitch', 'nigger', 'nigga', 'cunt', 'whore',
  'slut', 'faggot', 'hitler', 'porno', 'porn', 'cocaine'];
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '+': 't' };
const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');

export function normalizeForModeration(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[0-9!@$+]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** true si le texte contient une insulte, un propos haineux ou sexuel. */
export function isOffensive(raw: string): boolean {
  const n = normalizeForModeration(String(raw ?? ''));
  if (!n) return false;
  let tokens = n.split(' ');
  // lettres épelées (« p u t a i n ») : on recolle les suites de lettres isolées
  const glued: string[] = []; let run = '';
  for (const t of tokens) { if (t.length === 1) run += t; else { if (run) glued.push(run); run = ''; glued.push(t); } }
  if (run) glued.push(run);
  tokens = glued;
  const phrase = ` ${tokens.join(' ')} `, phraseC = ` ${tokens.map(collapse).join(' ')} `;
  for (const w of WORDS) {
    if (w.includes(' ')) { if (phrase.includes(` ${w} `) || phraseC.includes(` ${collapse(w)} `)) return true; }
    else if (tokens.some((t) => t === w || collapse(t) === collapse(w) || t === w + 's')) return true;
  }
  return tokens.some((t) => STEMS.some((s) => t.includes(s) || collapse(t).includes(collapse(s))));
}
