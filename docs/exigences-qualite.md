# ONEERA : exigences de qualité tirées des documents

Cette liste rassemble les exigences tirées de tous les documents relus le 24/11/2026, dédoublonnées et regroupées par thème. Chaque ligne indique où en est le prototype.

## Sources relues en entier

Le cahier des charges V1 :
- V1 MAP
- Map explication codeurs
- DATAS et techniques
- Tableau de bord
- ONEERA Dashboard Admin
- Bot + programmation
- Site web
- Stack map
- API
- SDK
- Pourquoi la map / Pourquoi cette map interactive / Fonctionnalités de la map BDF

Les autres textes :
- l'avenant contractuel ;
- la recette du 14/08 ;
- le document RGPD client ;
- la politique de confidentialité et les CGU ;
- les contrats et mails clients ;
- la présentation investisseurs ;
- les textes de marque ;
- toutes les discussions exportées : prestataire, client festival, agence vidéo, site, design ;
- les maquettes et docs du dépôt (`design/canvas`, `docs/`), dont la grille de validation.

Environ 1 500 exigences brutes en ressortent. Une fois les doublons regroupés, il en reste environ 260, listées ici.

**Légende :**
- ✅ : présent dans le prototype ;
- 🔧 : corrigé ou ajouté en v5 ;
- 🏗️ : relève de l'app réelle (serveur, balises, stores, mesures sur le terrain), donc hors du prototype cliquable ;
- ⚖️ : les documents se contredisent, une décision est nécessaire (voir la dernière section).

> Rappel du fondateur : « ce n'est pas un jeu vidéo mais une vraie app révolutionnaire : intuitive, pratique, ultra fluide et parfaite ». Les animations servent la lecture du lieu, jamais le gadget (cahier des charges : « micro-effets, pas du tout une logique jeu vidéo »).

---

## 1. Principes non négociables

| Exigence | Source | État |
|---|---|---|
| La carte est le produit ; on doit avoir l'impression de « voir l'événement en direct », pas de consulter un plan | V1 MAP §1.2 | ✅ |
| Évident, fluide, beau, et ça marche ; aucun apprentissage nécessaire ; utilisable même dans la foule ou sous stress | V1 MAP | ✅ (parcours QR → carte chronométré) |
| Qualité « Apple / Instagram », instantanée, zéro bug, détails « waouh » | Discussions | ✅ tests automatisés, voir § 14 |
| Toute fonction qui demande trop d'explications doit être améliorée | V1 MAP | ✅ |
| « Next gen », mais même les plus âgés ne se perdent pas | Discussions | ✅ |
| Aucune fonction instable, partielle ou non testée, même provisoirement | Avenant art. 12.1 | ✅ chaque fonction a ses tests |
| Le nom ONEERA partout, jamais « Teufy », « Minuit » ni « Mapping Festival » | Recette, CGU, discussions | ✅ 0 occurrence |
| Ton « féerique mais classe, pro et pratique », rien de vulgaire ; accroche « la vue des Dieux dans ta poche » | Agence vidéo | ✅ |
| Le rouge est réservé à l'urgence et aux actions destructrices (« le rouge c'est agressif ») ; déconnexion discrète | Discussions client | 🔧 |
| Français correct, sans mot anglais inutile ; tutoiement cohérent | Discussions client | 🔧 « Food » → « Restauration », tutoiement harmonisé |

## 2. Carte immersive

| Exigence | Source | État |
|---|---|---|
| Carte 2,5D illustrée (référence Dofus / League of Legends mobile), qualité supérieure au site de réservation du Finns Beach Club | Discussions, BDF | ✅ |
| Carte vivante, pas une image avec des icônes posées dessus : foule, lumières, eau, nuages, micro-animations | Discussions, CDC §8.1 | ✅ (v4) |
| Jour / nuit automatique, et pas un simple changement de couleur | V1 MAP, Map explication codeurs | ✅ (v4) |
| Nuages autour du site, jamais de fond uni ni de zones blanches ou noires ; au bord de la carte, l'écran reste bloqué sur les nuages, sans recentrage automatique | Discussions | ✅ |
| Animation d'entrée et de sortie de carte « façon Simpson » (descente depuis les nuages) | Discussions, BDF | ✅ (v4) |
| Zoom, **rotation comme Plans**, déplacement libre, inertie, double-tap | V1 MAP, stack | 🔧 rotation à deux doigts + boussole « retour au nord » |
| Vue **2D et 3D** | Discussions, BDF | 🔧 bouton 2D / 3D (plan incliné en perspective, avatars debout) ; vraie 3D 🏗️ sans le fichier .blend |
| Aucune latence perceptible, même en bord de carte ou dans les nuages | Avenant, discussions | ✅ 60 img/s en navigateur ; 🏗️ à confirmer sur vrais téléphones |
| Netteté vectorielle à tous les zooms | Discussions, recette | ⚖️ les plans illustrés fournis sont des images : le vectoriel suppose les sources SVG de l'illustrateur |
| Fidélité au plan réel (barrières, backstage, zones staff only, entrée selon le soir) | Discussions, plans clients | ✅ partiellement (club : entrée par le casino les soirs BDF) ; 🏗️ relevé des plans sources |
| POI cliquables avec mini-fiche : nom, description, horaires, **affluence estimée**, photo ou picto | V1 MAP | 🔧 affluence ajoutée sur toutes les fiches |
| Bar → carte des boissons ; stand de restauration → menu | Discussions | ✅ bars ; 🔧 menu restauration |
| **Pas de pastille chiffrée à la place des icônes** ; les POI rapetissent au dézoom ; au dézoom, seules restent scène, entrée, WC et secours | Discussions | 🔧 |
| Vues rapides festival / amis / infrastructures | BDF | ✅ filtres + calques |
| Mode écran « on ne voit que la carte et les nuages » | Discussions terrain | 🔧 Calques › Mode écran |
| Étages et continuité intérieur / extérieur | V1 MAP | ✅ club sur 2 niveaux |
| Barre de progression au chargement des cartes | Recette | ✅ App Clip ; 🏗️ téléchargement hors ligne réel |
| Recherche dans la carte (lieux, amis, artistes) | Code V1 | ✅ |

## 3. Position, avatars et amis

| Exigence | Source | État |
|---|---|---|
| Jamais de téléportation, ni de traversée de mur, ni d'avatar hors carte ou dans les nuages | Toutes sources | ✅ (déplacements le long des allées) ; 🏗️ moteur réel |
| Position stable, lissée ; un utilisateur immobile ne bouge pas | CDC, recette | 🏗️ moteur (simulation dans `docs/positioning`) |
| Indication permanente de la qualité de position (« ± 3 m · niveau ») ; position ancienne affichée avec son âge ; distances arrondies « ≈ » | Maquettes, grille | 🔧 niveau et « ≈ » ajoutés |
| Pseudo toujours au-dessus de l'avatar, bulle fixée à l'avatar ; jamais l'e-mail | Recette | ✅ |
| **Avatars superposés lisibles** | Terrain | 🔧 écartés en éventail |
| Avatars personnalisables, riches, avec barbe, moustache et bouc, et qui donnent envie (« wow ») | Discussions | ✅ créateur paramétrique |
| Écran « Crée ton propre avatar ! » / « Une prochaine fois » | Figma | ✅ étape avatar facultative |
| Partage de position : activé, désactivé ou **temporaire** ; « Personne / Mes amis » | V1 MAP, BDF | 🔧 15 min / 1 h / 3 h / jusqu'à la fin / désactiver |
| Cacher sa position à une seule personne ; « sauf… » / « seulement… » | Discussions, maquettes | 🔧 choix des amis |
| Mode fantôme, arrêt automatique à la sortie | Maquettes | ✅ 🔧 (réglable) |
| **@mention depuis la carte** avec notification et position | V1 MAP | 🔧 |
| Bouton « **Inviter un ami à me rejoindre ici** » | V1 MAP | 🔧 fiche « Moi » |
| **Bulles de messages sur la carte**, visibles des seuls amis, à masquer ou afficher | V1 MAP, discussions | 🔧 |
| Nombre d'amis présents ; « X personnes de ton réseau à proximité » | Discussions | 🔧 |
| Rejoindre un ami, point de RDV, boussole « je te cherche » | Maquettes | ✅ |
| Amis en commun, partager un profil, suggestions, ajouter tous ses contacts | Discussions, SDK | 🔧 |
| Ajout d'ami par QR (code 24 h) ; devenir amis ne partage pas la position | Maquettes | ✅ |

## 4. Signalements et sécurité du public

| Exigence | Source | État |
|---|---|---|
| Bouton « Signaler un problème » sur la carte avec **les 3 choix exacts** : « Quelqu'un a besoin d'aide ici », « Zone bondée / danger potentiel », « Objets perdus / retrouvés » | V1 MAP | 🔧 (les autres catégories restent sous « Autre situation ») |
| Rappel « Urgence vitale : appelle le 112 » ; ONEERA ne remplace pas les secours | Maquettes, CGU | ✅ |
| **Anti-spam** des signalements | V1 MAP | 🔧 pas de doublon en 3 min, 3 au plus en 10 min |
| Envoi différé sans réseau | Maquettes | ✅ |
| Suivi Reçue → En route → Sur place → Résolue ; secours animé sur la carte | Maquettes, agence vidéo | ✅ |
| Signaler un bug de l'app en secouant le téléphone | Discussions | 🔧 + entrée dans Réglages |

## 5. Notifications

| Exigence | Source | État |
|---|---|---|
| Textes exacts : « Activez le Bluetooth pour améliorer la précision de la carte », « Vos amis sont à proximité », « Un signalement a été émis dans votre zone » | V1 MAP | 🔧 |
| À l'approche du lieu ; « l'événement est actif » | Recette | 🔧 |
| Fin d'événement avec remerciement ; « Revivez l'événement » ; « Partagez l'application avec vos amis » | Recette, V1 MAP | 🔧 |
| Pastilles de compteur sur notifications et messages | Recette | ✅ |
| Préférences par type, jamais de doublon, alertes de sécurité prioritaires, silence après 6 h (sauf sécurité), offres partenaires désactivées par défaut | V1 MAP, maquettes | 🔧 |
| Rappel 15 min avant les artistes suivis | Maquettes | 🔧 (avant : 10 min) |
| Insister, avec pédagogie, sur la localisation « Toujours », sans bloquer l'app | Recette ⚖️ RGPD | ✅ |

## 6. Inscription, profil et réglages

| Exigence | Source | État |
|---|---|---|
| QR → carte sans formulaire ; compte en quelques étapes ; téléphone demandé une seule fois | Audit, recette, discussions | ✅ (défi < 2 min mesuré) |
| Âge : tranche facultative ; confirmation de l'âge minimum si l'événement l'exige | Maquettes ⚖️ discussions | ✅ ⚖️ |
| Rouvrir l'app ramène sur la carte | Discussions | 🔧 |
| Modifier le profil : photo, couverture, pseudo, avec un bouton « Confirmer » | Discussions client | 🔧 |
| Suppression de compte en tapant « SUPPRIMER », avec export proposé avant | Maquettes | 🔧 |
| Export des données, bloqués, thème, langue, CGU et confidentialité, numéro de version | CGU, discussions | ✅ |
| Fenêtres blanches légèrement translucides, cohérentes ; fermeture en glissant vers le bas | Discussions | 🔧 (glisser depuis tout le panneau) |

## 7. Programmation

| Exigence | Source | État |
|---|---|---|
| Programme par scène, statut **à venir / en cours / terminé** | Bot + programmation | 🔧 |
| Fiche artiste avec liens Instagram / Spotify / SoundCloud, « voir la scène sur la carte », favoris | Bot + programmation | 🔧 |
| Côté organisateur : recherche d'artiste, lien scène ↔ lieu sur la carte depuis la fiche, anti-chevauchement, compteur « live », export | Discussions terrain | 🔧 |

## 8. Staff et sécurité

| Exigence | Source | État |
|---|---|---|
| 4 rôles (Staff, Sécurité, Manager / superviseur, Administrateur festival), extensibles, droits modifiables en direct | V1 MAP | 🔧 matrice des droits |
| Invitations par lien ou code (rôle fixé, validité, nombre d'usages) ; pas d'auto-attribution ; révocation immédiate | V1 MAP | ✅ |
| Carte staff par rôle, messagerie individuelle, de groupe ou de zone, renfort, mode crise | V1 MAP | ✅ |
| Appeler la personne qui a signalé ; escalader | Agence vidéo, V1 MAP | 🔧 (numéro masqué) |
| Position du staff coupée en pause et hors service | Maquettes, RGPD | ✅ |
| Remplacer WhatsApp, talkies, radios et plans papier | V1 MAP | ✅ |

## 9. Tableau de bord organisateur

| Exigence | Source | État |
|---|---|---|
| Compréhensible sans tutoriel (V1 : 0 testeur sur 6 a compris) | Discussions | ✅ ; 🏗️ test utilisateurs ≥ 5/6 |
| **Création d'événement en autonomie** : infos, fin après minuit, récurrence, import du plan, géoréférencement en 3 points, seuils de précision, publication et QR | V1 MAP, maquettes | 🔧 assistant en 5 étapes |
| Ajouter des lieux et des zones pour de vrai (visibles côté visiteur) | V1 MAP | 🔧 |
| Balises : placement, **rôle, rayon, action** (entrée, sortie, alerte au passage), pile, **pas de doublon** | Discussions, CDC §7.3 | 🔧 |
| Couches sans rechargement, heatmap, flux le long des allées (pas d'arcs), replay à la minute avec chiffres qui évoluent | V1 MAP, recette | ✅ ; 🔧 étiquettes de flux corrigées (« La → La ») |
| Comparaison de 2 dates et de 2 heures | Recette | ✅ |
| **Alertes automatiques** : densité, flux anormal, immobilité prolongée | Tableau de bord | 🔧 |
| Clic sur une alerte → la carte se met à jour | Discussions site | ✅ |
| **Modération** : signalements entre utilisateurs, contenu masqué jusqu'à la décision, avertir / silence 24 h / bannir, actions en masse | Recette, discussions | 🔧 |
| **Relais d'alertes** : règles par type × zone × rôle, journal, statuts de livraison, anti-doublon | Bot + programmation | 🔧 (WhatsApp Business + SMS de secours) |
| **Admin plateforme** : partenaires, événements, supervision technique | Dashboard Admin | 🔧 |
| Export PDF / CSV / images ; **export mailing des seuls opt-in** | Recette, contrat client | ✅ ; 🔧 mailing |
| Journal d'audit ; double authentification ; rôles | Grille, maquettes | ✅ 🔧 |
| Chaque chiffre affiche sa couverture, son intervalle et sa fraîcheur ; k ≥ 5 ; aucune donnée individuelle | Grille, RGPD | ✅ |

## 10. RGPD et confiance (affichés dans l'app)

| Exigence | Source | État |
|---|---|---|
| Localisation facultative, consentement explicite, désactivation immédiate sans perdre l'app | V1 MAP, RGPD | ✅ |
| Position jamais publique : amis uniquement ; l'organisateur ne voit que de l'agrégé | RGPD, CGU | ✅ |
| Récap et replay personnels visibles du seul utilisateur | Politique de confidentialité | ✅ |
| Export, rectification, suppression (30 jours), contact | Politique de confidentialité | ✅ |
| Pas de revente, hébergement dans l'UE, chiffrement, sous-traitants listés, AIPD | RGPD, avenant | 🏗️ |

## 11. Performance et fiabilité

Tout ce bloc relève de l'app réelle (🏗️). Les mesures déjà faites sont dans `reports/`.
- 5 000 utilisateurs par carte et 25 000 sur 5 cartes, sans latence perceptible.
- Latence ami → ami ≤ 3 s (p95).
- 60 img/s sur un iPhone récent.
- Batterie ≤ 20 % sur 4 h.
- 99,5 % de sessions sans crash.
- Fonctionnement hors réseau.
- Tests de charge, de batterie et sur le terrain, avec comptes rendus.

## 12. Intégration et site (hors prototype)

Tout ce bloc relève de l'app réelle ou du site (🏗️) :
- SDK / API au design strictement identique ;
- compte unique ONEERA ;
- isolation des marques : pas de notification d'une marque dans l'autre ;
- site en FR / EN / ES avec une démo de tableau de bord réellement interactive.

## 13. Documents non disponibles ici

Ces documents ne sont pas dans le dépôt, je ne prétends donc pas les avoir analysés :
- le fichier 3D `.blend` du festival ;
- les sources vectorielles des plans illustrés (SVG, AI) ;
- les 13 images et 6 vidéos de la recette du 14/08 ;
- les messages vocaux des discussions ;
- le schéma d'architecture V1 ;
- la maquette multi-étages ;
- le devis 731 ;
- les annexes du contrat client.

## 14. Décisions à prendre (contradictions entre documents)

1. **Flux « dès 1 utilisateur »** (recette) ou **anonymat k ≥ 5** (RGPD, politique de confidentialité). Le prototype garde k ≥ 5 côté organisateur ; le trajet individuel n'est visible que dans le replay personnel. *Choix juridique : à valider.*
2. **Durée de conservation des positions** : 24 h, 7 jours, « tant que le compte est actif » ou 10 ans, selon les documents. Le prototype affiche 24 h pour les positions détaillées. *Choix juridique : à valider.*
3. **Date de naissance à l'inscription** (demandée dans les discussions) ou **tranche d'âge facultative** (maquettes, minimisation RGPD). Le prototype applique la tranche facultative et la confirmation de l'âge minimum.
4. **Localisation « Toujours » obligatoire** (recette) ou **consentement libre** (RGPD). Le prototype incite et explique, sans jamais bloquer.
5. **Carte vectorielle** : il faut les sources SVG de l'illustrateur (BB 4.svg et plans du festival sur le Drive).
6. **Barre du bas** : le Figma du fondateur prévoit Map / Amis / Chat. Une demande pour l'app du festival placerait les messages en haut. Le prototype suit le Figma.
7. **Droits sur les visuels** : les avatars, icônes et plans du prototype viennent du dossier Figma du Drive. La règle « salle blanche » de l'audit demande de vérifier qui les a produits et qui en détient les droits avant tout usage public.

## 15. Preuves

Toutes les vérifications sont des scripts Playwright, dans `prototype/test/`.

| Script | Ce qu'il couvre | Résultat |
|---|---|---|
| `qav5.js` | app visiteur v5 | 33 / 33 |
| `qav5d.js` | tableau de bord et staff v5 | 21 / 21 |
| `rot3d.js` | rotation et 3D | 10 / 10 |
| `qa2.js` | régressions v3 | 23 / 23 |
| `qafx.js` | carte vivante | 22 / 22 |
| `crawl4.js` | chaque bouton de chaque écran | 0 erreur JS visée |
