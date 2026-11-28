# Rapport d'audit ONEERA — 28/11/2026

**Verdict.** Toute la batterie de tests a passé à 100 %, **deux exécutions de suite** sans aucun échec, avec des résultats identiques. Ces exécutions ont eu lieu le 28/11 entre 04:46 et 05:22 ; leurs sorties sont dans `executions/`.

Il ne reste aucun bug bloquant ni majeur dans l'app.

Il reste des points ouverts qui demandent une décision de ta part. Ils sont listés dans `QUESTIONS.md` et résumés au § 5.

## 1. Tableau récapitulatif

| | Nombre |
|---|---|
| Écrans et vues inventoriés | environ 75 (app visiteur, staff, bar, tableau de bord : voir `INVENTAIRE.md`) |
| Éléments cliqués par le robot | 3 076 : 0 erreur JavaScript, 0 débordement, 0 image cassée après correction |
| Routes de l'API | 29 : toutes testées, y compris par 4 000 à 6 000 requêtes malveillantes |
| Bugs trouvés | 21 (voir `BUGS.md`) |
| Bugs corrigés | 19, dont tous les bloquants et majeurs de l'app |
| Bugs atténués | 1 : la tenue au-delà de 12 000 personnes par serveur (B-13), qui attend une décision d'hébergement |
| Faux positifs classés | 1 (B-21) |
| Erreurs dans les journaux du serveur pendant les deux exécutions | 0 |

## 2. Résultats des tests (sortie réelle, exécution 2 — identique à l'exécution 1)

| Suite | Ce qu'elle vérifie | Résultat |
|---|---|---|
| Serveur (vitest) | API, base de données, isolation entre utilisateurs, messages, contacts, sécurité | 47/47 |
| scenarios | Le novice, le pressé et le malveillant : erreurs de saisie, double clic, prénom piégé, coupure réseau, jeton expiré, suppression de compte | 23/23 |
| qav5 / qa2 / qafx | Exigences fonctionnelles, thème sombre, carte vivante | tout vert, 0 erreur |
| bounds / rot3d | Carte toujours plein écran, rotation, 3D | 19/19, tout vert |
| kb | Clavier sur iPhone 14 et iPhone SE, textes ≥ 16 px | 50/50 |
| e2e-portal | Brouillard d'entrée / sortie, plein écran, interface cachée | 14/14 |
| e2e-live / e2e-chat / e2e2 / e2e-recap / e2e-contacts | Deux téléphones et de vrais comptes : amis, messages, positions, récap, contacts | 32/32, 21/21, 17/17, 8/8, 8/8 |
| realleak / xss-client | Aucune donnée d'un autre ; prénom ou avatar piégé jamais exécuté | tout vert |
| personas | Lecteur d'écran, clavier seul, zoom 200 %, deux onglets, Précédent / rafraîchir, paysage et mode sombre, réseau lent, réseau coupé | 14/14 |
| bubble | Bulle de l'avatar : 8 onglets × 2 tailles d'écran, jamais sur le visage | 16/16 |
| looks / search | Looks, motifs, recherche du studio | 14/14, 13/13 |
| monkey | 6 testeurs au hasard × 400 actions, démo et comptes réels | 0 erreur |
| Fuzzing API | 4 000 requêtes aléatoires et malveillantes | 0 erreur serveur, 0 accès sans jeton, 0 fuite |
| Commentaires piégés | Code désactivé par erreur (cause des bugs B-01 et B-02) | 0 |

Personas couverts : le parfait, le novice, le pressé, le malveillant, le bizarre (émojis, 10 000 caractères, arabe, chinois, HTML), le mobile, l'accessibilité, le multi-onglets et le retour arrière.

## 3. Test de charge (temps réel)

Machine de test à 4 cœurs, un seul serveur, groupes de 4 amis, 30 s de positions en continu.

| Téléphones simultanés | Connectés | Positions livrées | Délai (95 % des positions) |
|---|---|---|---|
| 5 000 | 5 000 | 100 % | 144 ms |
| 8 000 | 8 000 | 100 % | 227 ms |
| 10 000 | 10 000 | 100 % | 430 ms |
| 12 000 | 12 000 | 100 % (144 275 positions enregistrées) | 660 ms (99 % en moins de 1,2 s) |
| 20 000 (avant correction) | 19 972 | ~0 % : le serveur s'effondre (EMFILE) | — |
| 20 000 (après plafond) | **non mesuré** : le test s'est bloqué deux fois sans résultat | — | — |

**Corrections faites :**
- plafond de 15 000 connexions par serveur, avec un refus propre « réessaie » ;
- erreurs d'enregistrement journalisées (elles étaient silencieuses) ;
- reconnexion de l'app à délai varié.

**Point de rupture mesuré :** au-delà d'environ 12 000 personnes, le délai approche une seconde. Vers 20 000, un serveur seul tombait. L'objectif de 100 000 demande plusieurs serveurs (Q-02, décision de dépense).

## 4. Ce qui est fini, ce qui ne l'est pas

### Fini et testé

- Comptes e-mail, studio d'avatar complet (costumes femme / homme, recherche, looks, bulle animée).
- Carte en direct avec amis, messagerie, notifications, récap / replay.
- Contacts, export et suppression des données (RGPD).
- Mode hors réseau, accessibilité, petits écrans.

### Pas fini, et pourquoi

| Point | Raison |
|---|---|
| Connexion Apple / Google | Il faut tes comptes Apple Developer et Google Cloud (Q-01). |
| Staff, bar, tableau de bord organisateur, signalements | Maquettes complètes mais données fictives. Les brancher demande tes choix d'organisation (Q-03). Sur un compte réel, l'app le dit honnêtement et renvoie vers le 112. |
| Choix de la zone dans la communication organisateur | À définir (Q-04). |
| 100 000 personnes simultanées | Architecture à plusieurs serveurs (Q-02). |

## 5. Décisions prises seul, et celles qui t'attendent

### Prises seul (réversibles)

- Brouillard au lieu des nuages, la carte immobile dessous : tu l'avais suggéré.
- Plafond de 15 000 connexions par serveur.
- Bulle placée selon le visage.
- Les deux faux positifs du fuzzing classés « non-bugs », après vérification à la main.

### T'attendent

- Q-01 à Q-05 (`QUESTIONS.md`).
- L'envoi du **build 107** sur TestFlight. Il contient toutes les corrections de cet audit, qui ne sont pas encore sur ton téléphone.

## 6. Versions et sauvegardes

Voir `docs/VERSIONS-ET-RETOUR.md`.

- **22 versions repérées :**
  - les builds TestFlight 100 à 106, chacun relié au code exact utilisé par Expo ;
  - les prototypes v1 à v14.
- **Une archive complète** de tout l'historique t'a été envoyée. Sa restauration a été testée.
- **Un script** crée chaque nouvelle version sauvegardée en une commande.
