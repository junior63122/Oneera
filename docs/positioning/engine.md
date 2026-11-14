# Moteur de localisation `@oneera/positioning`

## Pourquoi un filtre particulaire contraint par la carte

La V1 plaçait l'utilisateur sur la balise ou la case la plus proche. Avec un RSSI BLE bruité (±6–10 dB en foule), cela produit des sauts de plusieurs mètres à chaque scan, des passages à travers les murs et des confusions de salle. Un filtre de Kalman suppose une erreur gaussienne unimodale : il ne sait pas représenter « soit dans le bar, soit derrière le mur dans les toilettes ». Le filtre particulaire maintient plusieurs hypothèses, et la carte élimine celles qui sont physiquement impossibles.

## Pipeline

1. **Prédiction**
   - Pas détecté (PDR) : déplacement = longueur × facteur propre à la particule, cap + biais propre à la particule (apprend la dérive magnétique et l'erreur de longueur de pas).
   - Sinon : marche aléatoire, plus faible si le téléphone est immobile.
   - Collision avec un mur ou sortie de la zone praticable → particule pénalisée puis éliminée.
   - Étage : changement possible uniquement dans l'emprise d'un escalier/ascenseur.
2. **Correction**
   - BLE : vraisemblance robuste (gaussienne + plancher d'aberrations) sur la carte radio, tempérée car les erreurs sont corrélées.
   - GNSS : Student-t, incertitude ×3 en intérieur, rejet au-delà de 60 m.
   - Baromètre : altitude relative ↔ hauteur d'étage, référence recalée lentement.
3. **Rééchantillonnage** systématique quand ESS < N/2, rajeunissement praticable.
4. **Récupération** : réinjection continue de 8 % de particules tirées des mesures BLE (MCL augmenté), 25 % si les mesures restent mal expliquées.
5. **Estimation** : étage dominant → mode d'un histogramme 1 m lissé → moyenne locale visible depuis le mode → projection praticable. Rayons 68/95 % = quantiles pondérés × facteur de calibration ; vieillissement +1 m/s sans mesure ; qualité `precise | zone | coarse | unknown`.
6. **Affichage** (`DisplayTracker`) : l'avatar marche le long de l'itinéraire A* vers l'estimation, ≤ 2,2 m/s ; au-delà de 20 m ou en changement d'étage, transition explicite (fondu) comptée comme « réacquisition ».

## Carte radio

- A priori : log-distance (n = 2,2), 5 dB par mur traversé (max 3), 18 dB par étage, 0,25 dB/m d'absorption par la foule, σ = 7 dB.
- Calibration terrain : recalage de la puissance de chaque balise et correction locale des résidus (IDW, rayon 6 m) ; réestimation de σ.

## Paramètres par défaut (réglés en simulation — à revalider sur site)

| Paramètre | Valeur |
|---|---|
| particules | 1 500 (1 000 suffisent en mobile si nécessaire) |
| tempérage BLE | 0,3 |
| taux de réinjection | 0,08 |
| facteur de rayon | 1,35 |
| preuve négative (balise attendue non vue) | désactivée (instable sur les tests) |

## Limites connues

- Les murs doivent être modélisés (format `docs/venue-format.md`) ; un plan faux produit des erreurs « contraintes » fausses.
- Sans calibration, la précision dépend fortement de la justesse du modèle radio.
- La détection de pas pendant la danse produit de faux déplacements (simulés) : un classifieur d'activité est prévu.
- Le facteur de rayon est empirique : il doit être recalé sur mesures réelles.
