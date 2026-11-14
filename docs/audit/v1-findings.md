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

- Fiche « Balise Oneera » : assemblage de deux fiches OEM (nRF52832 74,5×32 mm IP67 / DA14531 Ø55,6 mm). Modèle exact à confirmer.
- Aucune des deux puces ne permet l'AoA/AoD dans cette configuration : localisation par RSSI mesuré par le téléphone.
- Les mentions AoA/UWB des documents légaux V1 sont à retirer tant qu'aucun matériel compatible n'est déployé.
