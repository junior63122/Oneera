// ===== Thème sombre et anglais =====
ST.theme = ST.theme || 'light'; ST.lang = ST.lang || 'fr'; // anglais au choix (bouton sur l'accueil) tant que la traduction n'est pas complète
const EN = {
  'Carte': 'Map', 'Amis': 'Friends', 'Réglages': 'Settings', 'Tout': 'All', 'Bars': 'Bars', 'Scènes': 'Stages', 'Manger': 'Food', 'Services': 'Services', 'Secours': 'First aid',
  'Y aller': 'Go there', 'Envoyer à un ami': 'Send to a friend', 'Attente estimée': 'Estimated wait', 'Paiement': 'Payment', 'La carte': 'Menu', 'Rejoindre': 'Join', 'Viens ici !': 'Come here!', '📍 Viens ici !': '📍 Come here!', 'Moi': 'Me', 'Modifier mon avatar': 'Edit my avatar', 'Ouvert · ': 'Open · ', 'Masquer ma position pour Léa, bloquer, signaler': 'Hide my location from Léa, block, report', 'Écrire': 'Message', 'Point de RDV': 'Meeting point',
  'Je te cherche (boussole)': 'Find them (compass)', 'Signaler un problème': 'Report a problem', 'Envoyer l’alerte': 'Send alert', 'Appeler le 112': 'Call 112', 'Retrouve ta bande': 'Find your crew', 'Crée ta bande': 'Create your crew',
  'Voir la carte': 'Open the map', 'Continuer': 'Continue', 'C’est moi !': 'That’s me!', 'Choisis ton avatar': 'Choose your avatar', 'Comment tes amis te verront': 'How your friends will see you', 'Place-toi sur la carte': 'Put yourself on the map',
  'Activer ma position': 'Turn on my location', 'Plus tard': 'Later', 'Continuer avec Apple': 'Continue with Apple', 'Téléphone': 'Phone', 'Voir la carte sans compte': 'View the map without an account',
  'Retrouve tes amis sur la carte du festival': 'Find your friends on the festival map', 'Mon avatar': 'My avatar', 'Discussions': 'Chats', 'Notifications': 'Notifications', 'Rechercher': 'Search',
  'Partage de ma position': 'Location sharing', 'Mon récap et replay': 'My recap and replay', 'Mes signalements': 'My reports', 'Billet et cashless': 'Ticket and cashless', 'Mon QR d’ami': 'My friend QR', 'Autorisations': 'Permissions',
  'Confidentialité et données': 'Privacy and data', 'Télécharger mes données': 'Download my data', 'Supprimer mon compte': 'Delete my account', 'Se déconnecter': 'Log out', 'Langue': 'Language', 'Thème': 'Theme', 'Aide et contact': 'Help and contact',
  'Ouvert': 'Open', 'À l’instant': 'Just now', 'Ici ce soir': 'Here tonight', 'Programmation': 'Line-up', 'Ce soir': 'Tonight', 'En direct': 'Live', 'Soirée': 'Tonight', 'Activé': 'On', 'Désactivé': 'Off',
  'Partager ma position': 'Share my location', 'Pendant l’événement': 'During the event', 'Mode fantôme': 'Ghost mode', 'Affichage de la carte': 'Map display', 'Affluence en direct': 'Live crowd levels', 'Mode nuit': 'Night mode',
  'Urgence médicale': 'Medical emergency', 'Danger / bagarre': 'Danger / fight', 'Trop de monde': 'Overcrowded', 'Objet perdu': 'Lost item', 'Harcèlement': 'Harassment', 'Autre': 'Other', 'Danger de mort ?': 'Life in danger?',
  'Le récap de ta soirée ✨': 'Your night recap ✨', 'Revoir ma soirée (replay)': 'Replay my night', 'Distance': 'Distance', 'Pas': 'Steps', 'Zones visitées': 'Zones visited', 'Posé·e': 'Resting',
  'Ajouter': 'Add', 'Ami ✓': 'Friend ✓', 'En attente': 'Pending', 'Inviter': 'Invite', 'Accepter': 'Accept', 'Demandes': 'Requests', 'Tous': 'All', 'Message': 'Message', 'Fermer': 'Close',
  'Prévenir aussi mes amis': 'Also alert my friends', 'Point de rendez-vous': 'Meeting point', 'Envoyer le point de RDV': 'Send meeting point', 'Maintenant': 'Now', 'Dans 15 min': 'In 15 min', 'Prévenir': 'Notify',
  'Mode famille': 'Family mode', 'Recharger': 'Top up', 'Bracelet cashless lié': 'Linked cashless wristband', 'Ma tente': 'My tent', 'Ta position, seulement pendant l’événement': 'Your location, only during the event',
  'Aider le lieu avec des stats anonymes': 'Help the venue with anonymous stats', 'Mes contacts présents ici': 'My contacts here', 'Face à face (QR)': 'Face to face (QR)', 'Par pseudo': 'By username', 'Position par lien (1 h)': 'Location link (1 h)',
  'Corps': 'Body', 'Visage': 'Face', 'Cheveux': 'Hair', 'Habits': 'Clothes', 'Accessoires': 'Accessories', 'Silhouette': 'Build', 'Peau': 'Skin', 'Pose': 'Pose', 'Yeux': 'Eyes', 'Sourcils': 'Brows', 'Bouche': 'Mouth', 'Pilosité': 'Facial hair', 'Détails': 'Details',
  'Coiffure': 'Hairstyle', 'Haut': 'Top', 'Bas': 'Bottom', 'Chaussures': 'Shoes', 'Tenue': 'Outfit', 'Lunettes': 'Glasses', 'Chapeau': 'Hat', 'Oreilles': 'Ears', 'Cou': 'Neck', 'Festival': 'Festival',
  'Personnaliser (coiffure, tenue, accessoires…)': 'Customise (hair, outfit, accessories…)', 'J’ai 18 ans ou plus': 'I am 18 or older', 'Pas de réseau': 'No network', 'Ton alerte : Reçue': 'Your alert: received',
  'Position précise · ± 3 m · balises + GPS': 'Accurate position · ± 3 m · beacons + GPS', 'Position précise · ± 2 m · balises (intérieur)': 'Accurate position · ± 2 m · beacons (indoor)'
};
const FR_OF = {}; Object.entries(EN).forEach(([f, e]) => FR_OF[e] = f);
function translateTree(root) {
  if (ST.lang !== 'en') return; const dict = EN; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t && dict[t]) n.nodeValue = n.nodeValue.replace(t, dict[t]); }
  root.querySelectorAll && root.querySelectorAll('[placeholder]').forEach(i => { const v = { 'Bar, toilettes, artiste, ami…': 'Bar, toilets, artist, friend…', 'Message': 'Message' }; if (ST.lang === 'en' && v[i.placeholder]) i.placeholder = v[i.placeholder]; });
}
let i18nObs = null;
function applyLang() {
  if (!SCREEN) return; if (!i18nObs) { i18nObs = new MutationObserver(ms => { if (ST.lang === 'fr' && !ST._wasEn) return; ms.forEach(m => m.addedNodes.forEach(x => { if (x.nodeType === 1) translateTree(x); })); }); i18nObs.observe(SCREEN, { childList: true, subtree: true }); }
  translateTree(SCREEN); ST._wasEn = ST.lang === 'en';
}
function applyTheme() { if (!SCREEN) return; const dark = ST.theme === 'dark' || (ST.theme === 'auto' && (ST.clock % 1440 >= 20 * 60 || ST.clock % 1440 < 6 * 60)); SCREEN.classList.toggle('night', dark); }
V.langSheet = () => { const sb = openSheet(`<h2 class="h2">Langue · Language</h2><div class="list">${[['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['it', 'Italiano'], ['de', 'Deutsch']].map(l => `<button class="row" data-l="${l[0]}"><div class="grow"><div class="t">${l[1]}</div></div>${ST.lang === l[0] ? '<span class="pill ok">✓</span>' : ''}</button>`).join('')}</div><div class="tiny">Prototype : français et anglais (écrans principaux). Espagnol, italien et allemand prévus.</div>`); sb.onclick = e => { const l = e.target.closest('[data-l]')?.dataset.l; if (!l) return; if (!['fr', 'en'].includes(l)) { toast('Bientôt disponible'); return; } ST.lang = l; closeSheet(); V.settings(); applyLang(); }; };
V.themeSheet = () => { const sb = openSheet(`<h2 class="h2">Thème</h2><div class="list">${[['light', 'Clair (pastel ONEERA)'], ['dark', 'Sombre'], ['auto', 'Automatique : sombre de 20 h à 6 h']].map(t => `<button class="row" data-t="${t[0]}"><div class="grow"><div class="t">${t[1]}</div></div>${ST.theme === t[0] ? '<span class="pill ok">✓</span>' : ''}</button>`).join('')}</div>`); sb.onclick = e => { const t = e.target.closest('[data-t]')?.dataset.t; if (!t) return; ST.theme = t; applyTheme(); closeSheet(); toast(t === 'dark' ? 'Thème sombre' : t === 'auto' ? 'Thème automatique' : 'Thème clair'); }; };
