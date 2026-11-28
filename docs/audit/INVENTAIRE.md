# Inventaire de l'application ONEERA

Audit du 28/11/2026, branche `claude/admiring-cerf-j7qtu8`.
L'inventaire a été établi à partir du code (prototype `prototype/src/*.js`, serveur `packages/backend/src/api.ts`) et vérifié par les tests réellement exécutés. Ces tests sont décrits dans `RAPPORT.md`.

Légende :
- ✅ fini et testé.
- 🟡 partiel. Cela couvre deux cas : une fonction qui marche mais à laquelle il manque un morceau, et un écran de démonstration avec des données fictives, non branché au serveur.
- ❌ cassé.
- ⚪ espace réservé.

Le robot de clics (`prototype/test/crawl4.js`) a parcouru environ 75 écrans et cliqué 3 076 éléments :
- 0 erreur JavaScript ;
- 0 débordement ;
- 0 image cassée après correction.

## 1. Écrans de l'app visiteur (téléphone)

| Écran | Fonction | Statut | Vérifié par |
|---|---|---|---|
| Accueil `V.welcome` | Connexion Apple / Google / e-mail, mode démo | 🟡 Apple et Google désactivés tant que les identifiants ne sont pas configurés (Q-01). E-mail ✅. | scenarios, kb, personas, robot |
| Inscription / connexion e-mail `V.signup` / `V.login` | Création de compte, erreurs claires, double tap | ✅ | scenarios (23/23) |
| Téléphone / code `V.phone` / `V.otp` | Numéro pour retrouver ses contacts | ✅ | robot, e2e-contacts |
| Studio d'avatar `V.avatarPick` | 11 onglets, recherche, looks, costumes, bulle animée | ✅ | looks 14/14, recherche 13/13, bulle 16/16, studio, robot |
| Anciens éditeurs `V.avatarEditor` / `V.avatarQuick` | Remplacés par le studio, gardés pour compatibilité | 🟡 encore accessibles par le code, plus depuis l'interface | robot |
| Autorisations `V.perms` | Position, notifications | ✅ | robot |
| Carte `V.map` | Carte plein écran, amis en direct, filtres, 3D, rotation, brouillard d'entrée | ✅ | bounds 19/19, rot3d, e2e-portal 14/14, e2e-live 32/32, perf |
| Fiches lieux `V.poiSheet` | Scène, bars, VIP, secours, WC | ✅ (contenu de démo pour les lieux) | robot, qav5 |
| Fiche ami `V.friendSheet` | Boussole, itinéraire, message, copier son look | ✅ | e2e-chat, e2e-live |
| Amis `V.friendsTab` / `V.addFriends` | Liste réelle, demandes, ajout par code / contacts | ✅ | e2e-chat, e2e2, e2e-contacts |
| Discussions `V.chatList` / `V.chat` | Messagerie réelle, stickers, position, « rejoins-moi » | ✅ | e2e-chat 21/21, personas (deux onglets) |
| Notifications `V.notifs` | Fil réel | ✅ | e2e-chat, robot |
| Réglages `V.settings` / `V.realSettings` | Partage, compte, langue, thème, données | ✅ | qav5, e2e2, robot |
| Export des données / suppression du compte | RGPD | ✅ | api.test, scenarios |
| Récap / replay `V.recap` / `V.replay` | À partir du trajet enregistré | ✅ | e2e-recap 8/8 |
| Signalement `V.report` / `V.reportDetail` | Alerte au staff | 🟡 envoyé au tableau de bord de démo, pas encore au serveur (Q-03) | robot, qav5 |
| Rendez-vous `V.rdvSheet` | Proposer un point de rencontre | ✅ | robot (réagit, vérifié à la main) |
| Recherche `V.search` | Lieux, amis | ✅ | robot |
| Découvrir `V.discover` | Autres événements | 🟡 liste de démo | robot |
| Portefeuille, billetterie, place, tente, famille `V.wallet` / `V.mySeat` / `V.tent` / `V.family` | Fonctions avancées | 🟡 maquettes (données de démo) | robot |
| Mode hors réseau | L'écran reste utilisable sans réseau | ✅ | personas (réseau coupé, réseau lent) |

## 2. Écrans staff et bar (`S.*`)

| Écran | Statut |
|---|---|
| Carte staff, alertes, équipe, fiche agent, espace bar (`S.map`, `S.alerts`, `S.team`, `S.member`, `S.bar`) | 🟡 maquettes cliquables (données de démo), aucune erreur au robot ; pas encore branchées au serveur (Q-03) |

## 3. Tableau de bord organisateur (19 vues)

Les 19 vues sont : `create`, `moder`, `relay`, `platform`, `report`, `ops`, `sponsor`, `templates`, `global`, `prep`, `team`, `alerts`, `replay`, `compare`, `prog`, `bars`, `comm`, `beacons`, `data`.

- **Statut :** 🟡 maquettes cliquables complètes (données de démo), aucune erreur au robot.
- **« Communication › Une zone » :** le bouton choisit bien la cible, mais on ne peut pas encore choisir *quelle* zone (Q-04).

## 4. API du serveur (29 routes)

Les routes signalées « jeton » refusent toute requête sans jeton valide : 401 vérifié par le fuzzing (6 000 requêtes). Les jetons falsifiés sont tous refusés, y compris signature modifiée, algorithme « none » et vide.

| Route | Jeton | Limite de débit | Statut |
|---|---|---|---|
| `GET /v1/health` | non | — | ✅ |
| `GET /v1/auth/providers` | non | — | ✅ |
| `POST /v1/auth/signup` / `POST /v1/auth/login` | non | 10 / min / adresse | ✅ |
| `POST /v1/auth/apple` / `POST /v1/auth/google` | non | 10 / min | 🟡 répond 503 « pas encore configuré » (Q-01) |
| `GET` / `PATCH` / `DELETE /v1/me` | oui | suppression : 6 | ✅ |
| `POST` / `DELETE /v1/me/phone` | oui | 6 | ✅ |
| `GET /v1/me/export` | oui | 3 | ✅ |
| `GET /v1/friends`, `POST /v1/friends/requests`, `POST /v1/friends/:id/accept`, `POST /v1/friends/:id/decline`, `DELETE /v1/friends/:id` | oui | — | ✅ |
| `POST /v1/invites`, `POST /v1/invites/accept` | oui | — | ✅ |
| `POST /v1/consents` | oui | — | ✅ |
| `POST /v1/contacts/match` | oui | 6 | ✅ |
| `GET /v1/conversations`, `GET /v1/messages/:id`, `POST /v1/messages`, `POST /v1/messages/:id/read` | oui | messages : 40 | ✅ |
| `POST /v1/realtime-token`, `POST` / `DELETE /v1/share` | oui | — | ✅ |
| `GET /v1/events/:code` | non | — | ✅ |
| WebSocket temps réel `/rt` | jeton d'événement | 3 positions / s | ✅ jusqu'à ~12 000 connexions par serveur ; plafond de protection à 15 000 (Q-02) |

## 5. Rôles

| Rôle | Ce qu'il voit / peut faire | Statut |
|---|---|---|
| Visiteur (compte réel) | Carte, amis, messages, partage, récap, export, suppression | ✅ |
| Invité / démo | Tout l'app avec des données fictives, rien n'est envoyé au serveur | ✅ |
| Staff | Carte staff, alertes, équipe | 🟡 démo |
| Bar | Stock, commandes | 🟡 démo |
| Organisateur | Tableau de bord | 🟡 démo |
| Isolation entre utilisateurs | Personne ne voit la position ni les messages d'un non-ami | ✅ (RLS en base, realleak, fuzzing) |

## 6. États testés

| État | Statut | Test |
|---|---|---|
| Vide (aucun ami, aucun message) | ✅ | e2e-chat |
| Chargement / réseau lent (2,5 s par requête) | ✅ | personas |
| Hors ligne / coupure / reconnexion | ✅ | scenarios, personas |
| Erreur (mauvais mot de passe, e-mail pris, code invalide, jeton expiré) | ✅ | scenarios |
| Liste longue / navigation frénétique (25 écrans en rafale) | ✅ | scenarios, monkey |
| Petits écrans (iPhone SE), zoom 200 %, paysage, mode sombre | ✅ | kb, personas, allshots |
| Clavier seul, lecteur d'écran (noms des boutons) | ✅ | personas |
| Deux onglets sur le même compte, Précédent, rafraîchir | ✅ | personas |
| Animations réduites (réglage du téléphone) | ✅ | e2e-portal, qafx |
