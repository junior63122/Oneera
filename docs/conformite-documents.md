# Conformité aux documents fournis — 28/11/2026

Ce tableau reprend **toutes** les exigences extraites de tes documents et dit, pour chacune, où en est l'app réelle. Un statut ✅ n'est donné que s'il est prouvé par un test qui passe.

**Documents lus**
- `DB_dashboard_datas_bot.md` : 266 exigences, DB-001 à DB-266.
- `docs_product_tech.md`, `pourquoi-la-map.txt`, `pourquoi-map-interactive.txt` : 173 exigences, PT-001 à PT-173.
- Les détails d'écran (textes exacts, tailles, couleurs) sont suivis ligne par ligne dans `docs/exigences-qualite.md` : environ 260 lignes, déjà vérifiées par les suites `qav5`, `kb` et `personas`.

**Légende**

| Signe | Sens |
|---|---|
| ✅ | Réel et testé : serveur et app, avec données réelles |
| 🟢 | Réel côté serveur et testé ; l'écran existe mais affiche encore la démo |
| 🟡 | Écran de démonstration seulement (données fictives) |
| ⏳ | Pas encore construit, aucune décision requise |
| ✋ | Bloqué par **ta** décision : dépense, juridique ou contradiction entre documents |
| 🔧 | Demande le terrain ou du matériel (balises, site) |

## 1. Ce qui a été fait aujourd'hui

Une nouvelle migration (`008_operations.sql`), de nouvelles routes et de nouveaux tests. Résultat : serveur **54/54**, nouvelle suite navigateur **e2e-reports 14/14**.

| Exigence | Avant | Maintenant | Preuve |
|---|---|---|---|
| Bouton « Signaler un problème » avec les 3 choix exacts (PT-015, DB-209) | Démo : « version de test, appelle le 112 » | **✅ Réel** : l'alerte part au serveur avec la position, en catégorie aide / zone bondée / objets perdus | `e2e-reports` : « reçu par le staff réel » |
| Anti-spam : pas de doublon en 3 min, 3 au plus en 10 min | Contrôle local seulement | **✅ Imposé par le serveur** ; envoi différé hors réseau, compté une seule fois | `operations.test` : « anti-spam » ; `e2e-reports` : « anti-doublon », « réseau revenu » |
| Suivi Reçue → En route → Sur place → Résolue (DB-211) | Simulé | **✅ En direct** : chaque étape validée par l'agent s'affiche sur le téléphone du visiteur, avec notification | `e2e-reports`, 4 étapes ; capture `e2e-report-resolu.png` |
| Staff prévenu en direct d'un nouveau signalement (PT-064) | — | **🟢** Message temps réel à tout le staff actif de l'organisation | `operations.test` : « staff prévenu en direct » |
| Historique de chaque signalement, délai de 1ʳᵉ réponse, délai de résolution (DB-062, DB-113, PT-067) | — | **🟢** Table `incident_updates` + horodatages | `operations.test` |
| Invitation du staff par code sécurisé : rôle imposé, durée, nombre d'utilisations, sans auto-attribution de droits (PT-058) | — | **🟢** Un manager ne peut pas nommer un manager ; seul le propriétaire le peut | `operations.test` : « invitations staff » |
| 4 rôles du cahier : staff, sécurité, manager, administrateur festival ; plus analyste et lecture seule (PT-059, DB-133) | Schéma seul | **🟢** Droits différents testés (un analyste lit mais ne modifie rien) | `operations.test` : « cloisonnement » |
| Suspension ou révocation instantanée (PT-068) | — | **🟢** Effet à la requête suivante | `operations.test` : « effet immédiat » |
| Journal d'audit des actions (PT-143, DB-134) | Partiel | **🟢** Invitations, arrivées, révocations, changements d'état, programmation | `operations.test` |
| Occupation reconstituable **minute par minute** ; carte rejouable des années après (DB-019, DB-045, DB-048, DB-050, DB-073) | — | **🟢** Comptage par zone et par minute, calculé chaque minute, conservé **sans limite**. Les positions brutes sont purgées ; le replay reste possible. | `operations.test` : « purge des positions brutes : les agrégats restent » |
| Données organisateur strictement agrégées, jamais une personne identifiable (DB-001, DB-003, DB-016, PT-136) | Fonction existante | **🟢** Toute case de moins de **5 personnes** est masquée côté serveur | `operations.test` : « masque sous 5 personnes » |
| Flux zone → zone (DB-061, DB-078, DB-191) | — | **🟢** Passages agrégés entre zones par minute, cumulables sur toute période | `operations.test` : « flux zone → zone » |
| Comparer deux dates, deux heures ou deux éditions (PT-093, PT-094, PT-102, DB-051, DB-129) | Démo | **🟢** Route `compare` : deux périodes, même événement ou un autre | `operations.test` : « comparaison » |
| Par zone : capacité, pic, heure du pic, moyenne, taux de remplissage (PT-084, DB-089 à DB-093) | Démo | **🟢** | `operations.test` |
| Alertes automatiques de densité (≥ 90 %, critique ≥ 100 %) et de flux anormal (PT-100, DB-111) | Démo | **🟢** L'immobilité prolongée, donnée individuelle, attend ta décision : voir § 4 | `operations.test` : « alerte de densité », « flux anormal » |
| Programmation : création, modification, annulation, statut à venir / en cours / terminé, synchronisation en direct, conflits d'horaires (PT-017 à PT-020, DB-234 à DB-246) | Démo | **🟢** Réservé aux managers ; lecture par tous ; mise à jour poussée aux téléphones | `operations.test` : « programmation » |
| Purge automatique des positions brutes (PT-135, PT-138) | Fonction jamais appelée | **🟢** Purge chaque heure ; 7 jours par défaut, réglable (`POSITIONS_RETENTION_HOURS`) | `maintenance.ts` ; `security.test` |
| Trois couches de données séparées : temps réel, persistantes, analytiques (PT-156, DB-002) | 2 couches | **🟢** `live_positions`, tables métier, agrégats minute | — |

## 2. Tableau complet par domaine

### Visiteur (PT-001 à PT-023)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-001 | Une seule app iOS / Android | ✅ iOS (TestFlight 107) · ✋ Android | Android : compte Google Play à ouvrir (dépense de 25 $) |
| PT-002, PT-012 | Photo de profil, photo de couverture, publication de photos | ⏳ | Prénom et avatar sont réels. Les photos demandent un stockage de fichiers à brancher sur l'hébergement (Q-02). |
| PT-003, PT-013 | Pseudo partout, jamais le nom réel ; clic sur une photo → profil | ✅ | — |
| PT-004 | Un compte pour l'app, le SDK et l'API | ✅ app · ⏳ SDK / API partenaires | — |
| PT-005 | Amis : demander, accepter, refuser, lister, supprimer | ✅ | `e2e-contacts`, `e2e-live` |
| PT-005 | Bloquer | ⏳ | — |
| PT-006 | Recherche, import des contacts | ✅ | Suggestions : 🟡 |
| PT-007 | Partage activé / désactivé / temporaire | ✅ | — |
| PT-008, PT-009 | Mention depuis la carte ; « Inviter un ami à me rejoindre ici » | ✅ invitation réelle (message avec position) · 🟡 mention « @ » | — |
| PT-010 | Se taguer sur des zones | 🟡 | — |
| PT-011 | Messagerie avec historique | ✅ | `e2e-chat` 21/21 |
| PT-014, PT-104 | Signaler un autre utilisateur → modération | ⏳ | — |
| PT-015, PT-016 | Signaler un problème, avec anti-spam | ✅ | **Nouveau.** Voir § 1. |
| PT-017 à PT-020 | Programmation | 🟢 | Serveur prêt et testé. L'écran Programme de l'app affiche encore la démo. |
| PT-019 | Favoris et rappel 15 min avant | 🟡 local | La notification push attend Q-01 / APNs. |
| PT-021 | Récap personnel | ✅ | `e2e-recap` |
| PT-022, PT-023 | Mini-jeux, replay communautaire | 🟡 | Évolution future dans les documents |

### Onboarding (PT-024 à PT-028)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-024 | QR → carte directe | ✅ | Code d'accès d'événement |
| PT-025 | Compte par e-mail | ✅ | — |
| PT-025 | Compte par SMS | ✋ | Fournisseur de SMS payant |
| PT-025 | Connexion Apple / Google | ✋ Q-01 | Le code est prêt ; il faut tes comptes. |
| PT-026 | Aucune étape qui oblige à faire défiler | ✅ | `kb`, iPhone SE |
| PT-027, PT-124 | Forte incitation à la localisation « Toujours » | ✅ | Le suivi en arrière-plan sur l'iPhone reste à vérifier sur un vrai appareil (🔧). |
| PT-028 | Icône « œil » dans « changer mon mot de passe » | ⏳ | L'écran « changer mon mot de passe » n'existe pas encore. |

### Carte (PT-029 à PT-057)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-029 à PT-033 | Plan sur mesure, carte fluide, 3D, jour / nuit, position lissée | ✅ | `bounds`, `rot3d`, `qafx` ; 59 i/s mesurées |
| PT-034 à PT-041 | Points d'intérêt, couches, amis animés, bulles | ✅ | Les points d'intérêt viennent de la configuration du lieu. |
| PT-038 | Étages | 🟡 | — |
| PT-043 | Pourcentage de téléchargement des cartes | 🟡 | — |
| PT-044 à PT-048 | Cartes versionnées, activation selon les dates, plusieurs occurrences, logique « boîte de nuit » | 🟢 schéma (`venue_maps.version`, `events.during`) · ⏳ éditeur | — |
| PT-042, PT-049 à PT-057 | Localisation hybride GPS + capteurs + balises, précision, recalage | ✅ en simulation (moteur `positioning`) · 🔧 terrain | La précision réelle ne se mesure que sur site, avec les balises. |

### Staff (PT-058 à PT-074)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-058, PT-059, PT-068 | Invitations, rôles, révocation | 🟢 | **Nouveau.** |
| PT-060 | 200 à 300 membres du staff | ⏳ non mesuré | Le test de charge a validé 12 000 téléphones, mais pas un scénario staff spécifique. |
| PT-061 | Interface staff selon le rôle | 🟡 écrans · 🟢 serveur | Prochaine étape : brancher les écrans staff sur les routes `/v1/staff`. |
| PT-062 | Carte des positions du staff par rôle | ⏳ | Demande aussi le consentement du staff pour sa localisation. |
| PT-063 | Messagerie interne du staff, par rôle ou par zone | ⏳ | — |
| PT-064 | Incidents : assignation, suivi, priorité | 🟢 | L'escalade automatique (non pris en charge en 2 min → superviseur) reste à faire (⏳). |
| PT-065 | Densité et flux pour la sécurité | 🟢 | Alertes |
| PT-066, PT-069 | Mode crise, SOS | 🟡 | — |
| PT-067 | Bilan du staff | 🟢 données · ⏳ écran | — |
| PT-070 à PT-074, DB-218 à DB-233 | **Bot WhatsApp** | ✋ | WhatsApp Business est un service payant de Meta, avec un compte vérifié. Rien n'est branché : les identifiants du document « connexion » ne sont ni utilisés ni affichés. |

### Organisateur, admin, données (PT-075 à PT-119 ; DB-001 à DB-217)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-075, DB-006 | Panneau isolé par festival, accès par rôle | ✅ | Cloisonnement testé : `security.test`, `operations.test` |
| PT-076, PT-077, PT-078 | Éditeur de zones, de points d'intérêt et de balises | 🟢 schéma · ⏳ éditeur | — |
| PT-079 | QR codes et activation | ✅ | — |
| PT-080, DB-140, PT-111 | Messages ciblés par rôle ou zone, campagnes | 🟡 · ✋ Q-04 | — |
| PT-081 à PT-084, DB-074 à DB-095 | Vue globale, par zone, remplissage, pics | 🟢 | Routes `/v1/dashboard/…/live` et `compare`. Le tableau de bord web affiche encore la démo. |
| DB-092, PT-084 | Durées moyenne et médiane de présence | ⏳ | Dérivées de parcours individuels : voir ✋ X-04 |
| PT-085, DB-096 à DB-101 | Vitesses, pas, distances, friction | ⏳ · ✋ | Mêmes réserves (données individuelles) |
| PT-086 à PT-088 | Un flux = trajet réel case par case, visible même pour une seule personne | ✋ **contradiction X-04** | Montrer le trajet d'une personne seule contredit « strictement agrégé, k ≥ 5 » (DB-001, DB-003, PT-136). Le serveur applique aujourd'hui k ≥ 5. |
| PT-089 à PT-092, DB-155 à DB-167 | Heatmap, timeline à la minute, replay | 🟢 données à la minute · 🟡 écran | — |
| PT-093, PT-094, PT-102, DB-168 à DB-177 | Comparaisons | 🟢 | — |
| PT-095 à PT-097, DB-102 à DB-105, DB-192 à DB-198 | Corrélations avec la programmation | 🟢 données (programmation + minutes) · ⏳ calcul et écran | — |
| PT-098, DB-106 à DB-110 | Bars : fréquentation, attente | 🟡 | Il faut des zones « file d'attente » sur la carte du lieu. |
| PT-099, DB-115, DB-136 | Analyse par tranche d'âge | ✋ **X-13** | L'âge n'est pas collecté (tranche facultative) ; décision RGPD. |
| PT-100, DB-111 | Alertes automatiques | 🟢 densité, flux · ✋ immobilité | — |
| PT-101, DB-212, DB-213 | Export PDF / image / données | 🟡 | — |
| PT-103, DB-116 à DB-120 | Bilan et mode « après l'événement » | 🟢 données conservées · 🟡 écran | — |
| PT-105 à PT-113, DB-122 à DB-154 | **Admin ONEERA** : partenaires, tous les événements, utilisateurs, supervision | ⏳ · ✋ | DB-123 « aucune donnée masquée à l'admin » contredit la minimisation RGPD (DB-001, DB-014). Choix juridique à faire avant de construire. |
| PT-114 à PT-118, DB-063 à DB-070 | SDK et API partenaires, mêmes données quel que soit le canal | ⏳ | L'API existe pour l'app. La documentation publique et le SDK restent à faire. |
| PT-119, DB-053 à DB-056 | Champs minimaux de chaque donnée | 🟢 partiel | Événement, horodatage UTC, position, zone, étage sont présents. L'identifiant analytique distinct (DB-008) attend X-03. |
| DB-044, DB-071, DB-072 | Agrégats conservés sans limite | 🟢 | — |

### Notifications (PT-120 à PT-131)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-127, PT-128 | Pastilles de compteur | ✅ | — |
| PT-129 | Aucune notification d'une autre app | ✅ | — |
| PT-120 à PT-126 | Textes exacts avant / pendant / après, préférences | ✅ dans l'app | Sur l'écran verrouillé : ✋ notifications push Apple, à activer sur ton compte Apple Developer (Q-01). |
| PT-130 | E-mails aux couleurs de la marque | ✋ | Service d'e-mail payant |
| PT-131 | Notifications par équipe, rôle ou zone | 🟢 temps réel staff · ✋ push | — |

### Hors réseau (PT-132 à PT-134)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-132, PT-134 | Plan en cache, réseau coupé ou lent | ✅ | `personas` (réseau lent, coupé) ; signalement mis en file puis envoyé |
| PT-133 | Programmation hors réseau | 🟡 | — |

### Sécurité et RGPD (PT-135 à PT-146)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-136, PT-137, DB-001 à DB-005 | Données individuelles ni conservées ni exploitées ; agrégats seulement | 🟢 | Purge plus seuil k ≥ 5 |
| PT-138 | Positions supprimées **24 h** après la fin | ✋ **X-03** | Réglage actuel : 7 jours, modifiable en une variable. Les documents se contredisent : 24 h d'un côté, conservation sans limite et replay sur 10 ans de l'autre. Les agrégats règlent le replay ; reste à choisir la durée pour les positions brutes. |
| PT-139 | Position visible par les amis seulement | ✅ | `realleak`, `security.test` |
| PT-140 | Chiffrement AES-256 | ✋ | Dépend de l'hébergeur de la base, chiffrement au repos (Q-02) |
| PT-142, PT-159, PT-160 | Firebase imposé par un document | ✋ **X-07 / X-08** | Le serveur actuel tourne sur PostgreSQL. Un autre document interdit le verrouillage par un fournisseur. Je n'ai rien changé sans ta décision. |
| PT-143 | Journal des actions | 🟢 | — |
| PT-146 | Aucune trace de « Teufy » dans le produit | ✅ | Recherche dans tout le code : le nom n'apparaît que dans les rapports d'audit, qui décrivent les erreurs de l'ancien prestataire. |

### Performance (PT-147 à PT-160)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-147 | 5 000 utilisateurs par carte | ✅ mesuré | 100 % livré ; 95 % des positions en 144 ms (`RAPPORT.md`) |
| PT-148 | 25 000 sur 5 cartes | ✋ Q-02 | Un serveur tient 12 000 (mesuré). Au-delà, il faut plusieurs serveurs. |
| PT-149 | Fréquence d'envoi de la position | ✋ **X-02** | Les documents se contredisent : 1–2 s ou 3–5 s. |
| PT-150, PT-151 | Mise à jour sans relancer, images instantanées | ✅ | — |
| PT-152 | Tests complets | ✅ | `run-all.sh` |
| PT-153 | Rapports de crash | ⏳ | Service tiers à choisir (données envoyées à un tiers) |
| PT-154 | Test terrain avant généralisation | 🔧 | — |
| PT-155 à PT-158 | Plusieurs événements en parallèle, Expo / React Native, mises à jour à distance | ✅ | — |

### Design et site web (PT-161 à PT-173)

| ID | Exigence | Statut | Note |
|---|---|---|---|
| PT-161 à PT-165 | Design de l'app et du tableau de bord | Voir `exigences-qualite.md` | — |
| PT-166 à PT-173 | Site web vitrine (FR / EN / ES, carte démo, formulaires) | ⏳ | Produit séparé, pas encore commencé |

### Commercial et calendrier (PT-174 à PT-187, DB-247, DB-266)

Hors app : licences, tarifs, délais, équipe. Rien à coder.

## 3. Prochaines étapes, sans décision de ta part

1. Brancher les **écrans staff** de l'app sur les routes réelles : liste des alertes en direct, boutons En route / Sur place / Résolue, invitation par code.
2. Brancher le **tableau de bord web** sur les routes `/v1/dashboard` : vue en direct, timeline à la minute, flux, comparaison.
3. Brancher l'écran **Programme** de l'app sur `/v1/events/…/programme`, avec cache hors réseau.
4. Écrire l'**éditeur** de zones, points d'intérêt et balises pour l'organisateur.
5. Ajouter le blocage d'un utilisateur, le signalement d'un utilisateur et l'écran « changer mon mot de passe ».

## 4. Décisions qui t'attendent

| # | Question | Pourquoi c'est à toi |
|---|---|---|
| X-03 / PT-138 | Durée de conservation des positions brutes : 24 h, 7 jours, autre ? | Choix juridique (RGPD) |
| X-04 | Montrer le trajet d'une personne seule à l'organisateur, ou garder « jamais moins de 5 » ? | Choix juridique |
| DB-123 | L'admin ONEERA voit-il tout, y compris les données individuelles ? | Choix juridique ; contredit la minimisation |
| X-13 | Collecter une tranche d'âge pour les statistiques ? | Choix juridique |
| — | Immobilité prolongée d'une personne (alerte individuelle) | Choix juridique |
| X-07 / X-08 | Firebase, imposé par un document, ou PostgreSQL actuel (sans verrouillage par un fournisseur) | Choix technique contractuel |
| X-02 | Fréquence d'envoi de la position | Contradiction entre documents (batterie ou précision) |
| — | Bot WhatsApp Business | Dépense, compte Meta |
| Q-01 | Notifications push, connexion Apple / Google | Tes comptes |
| Q-02 | Plusieurs serveurs (25 000 à 100 000 personnes), stockage des photos, chiffrement | Dépense d'hébergement |
| — | SMS, e-mails à la marque, rapports de crash, Android | Dépense ; transmission de données à un tiers |
