# Constats techniques sur la V1 (version assainie)

Synthèse technique issue de l'analyse des spécifications, de la recette du 14/08/2026 et des échanges de développement. Les éléments contractuels, financiers et juridiques sont tenus hors du dépôt.

## Défauts observés et cause probable

| # | Défaut observé | Cause probable | Réponse V2 |
|---|---|---|---|
| 1 | Avatar figé à l'arrêt puis sauts > 10 m | Placement au plus proche (balise/case), aucun modèle de mouvement | Filtre particulaire + PDR, `DisplayTracker` à vitesse bornée |
| 2 | Avatar traversant les murs (live et replay) | Interpolation en ligne droite, pas de contrainte de carte | Particules éliminées à la traversée ; animation sur itinéraire A* |
| 3 | Position dehors alors qu'on est dedans | GNSS utilisé en intérieur sans gonflement d'incertitude | GNSS Student-t ×3 en intérieur, BLE prioritaire |
| 4 | Seules 4 balises sur 43 détectées | Hypothèse forte : balises Eddystone, non exposées par CoreLocation sur iOS | iBeacon (D-005), vérification nRF Connect |
| 5 | Avatars qui disparaissent | Permission « Toujours » non obtenue, pas de mode arrière-plan | Parcours de permission contextuel, état « vu il y a X min » |
| 6 | Chacun se voit à la bonne balise mais voit l'autre à une autre | Bug de diffusion/recalcul des positions d'amis | Position qualifiée diffusée telle quelle, horodatée, séquencée |
| 7 | Flux = arcs artificiels, diagonales impossibles | Visualisation synthétique, pas de trajectoires | Flux = transitions réelles sur le graphe de circulation |
| 8 | Replay saccadé, « temps sur place 0 min » | Pas de pipeline de trajectoires | Replay sur trajectoires lissées par le même moteur |
| 9 | Carte floue au zoom | Plan raster | Carte vectorielle |
| 10 | Notifications et interface d'une marque dans l'autre | Mono-tenant mal isolé | Multi-tenant natif |
| 11 | Mentions d'un autre produit dans les e-mails et la base | Base partagée avec un autre projet | Ressources dédiées ONEERA |
| 12 | Aucun test de charge, précision, batterie démontré | Pas de critères d'acceptation chiffrés | `docs/validation-grid.md` |

## Matériel

- Fiche « Balise Oneera » : assemblage de deux fiches OEM (nRF52832 74,5×32 mm IP67 / DA14531 Ø55,6 mm). **Modèle confirmé (dossier technique, relu le 26/11/2026)** : les visuels fabricant joints désignent la **DX-SMART CP28** (Renesas DA14531, 2 × CR2477). Les pages « spécifications électriques / environnementales » de la fiche « doc final » reprennent pourtant celles d'un autre produit (Nordic nRF52832, 1 × CR2477 1 000 mAh, +4 dBm, −20/+60 °C) alors que la page de présentation annonce DA14531, 2 × CR2477 880 mAh, −19,5/+2,5 dBm, −40/+85 °C. La fiche se contredit aussi sur l'usage extérieur (« indoor & outdoor » et IP67 d'un côté, « do not install outdoors » de l'autre).
- Cette fiche, au nom d'ONEERA, affiche les marquages CE / UKCA / FCC / IC / RoHS et une précision « 1 à 3 m ». **Décision juridique à prendre par ONEERA** avant toute diffusion : obtenir du fabricant les déclarations de conformité couvrant le produit rebrandé, corriger les caractéristiques, et ne pas annoncer de précision non mesurée.
- Le document « stack oneera (V1) » du dossier technique est intitulé « projet TEUFY » : erreur de l'ancien prestataire, TEUFY est un produit distinct. La pile qu'il décrit (Expo, Next.js, Firebase RTDB/Firestore/Functions) est la pile V1 ; ses exigences fonctionnelles sont reprises en V2 (carte custom avec limites, lissage anti-saut, cadence d'envoi selon mouvement, lecture par zone visible, présence, QR → carte, notifications ciblées, RBAC + journal d'audit, rétention courte des positions, analytics agrégés) ; le choix de Firebase ne l'est pas (D-008).
- Aucune des deux puces ne permet l'AoA/AoD dans cette configuration : localisation par RSSI mesuré par le téléphone.
- Les mentions AoA/UWB des documents légaux V1 sont à retirer tant qu'aucun matériel compatible n'est déployé.
