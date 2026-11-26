# Banc de localisation — SIMULATION

> Résultats de simulation sur le « Club de test » synthétique (2 niveaux, 20 balises). Le modèle radio du monde simulé diffère volontairement de celui du moteur. **Ces chiffres ne remplacent pas une mesure terrain** (cf. docs/positioning/field-protocol.md).

Configuration : 6 soirées simulées par condition, 10 déplacements par soirée, 1500 particules. Durée du banc : 681 s.

## foule=0.2 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 8.3 | 10.3 | 100 % | 90 % | — | 996 | 327 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.0 | 7.1 | 8.6 | 100 % | 89 % | — | 1273 | 294 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 11.7 | 24.3 | 28.0 | 87 % | 25 % | 68 % | 1130 | 372 | 45 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.6 | 5.8 | 8.1 | 100 % | 86 % | 87 % | 0 | 0 | 0 % | 18.6 | 8.51 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 2.3 | 5.4 | 6.8 | 100 % | 91 % | 73 % | 0 | 0 | 0 % | 22.2 | 9.84 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.6 | 3.8 | 5.0 | 100 % | 98 % | 71 % | 0 | 0 | 0 % | 10.7 | 9.75 |
| V2 · calibré + classification marche/danse | 100 % | 1.6 | 3.6 | 4.8 | 100 % | 98 % | 69 % | 0 | 0 | 0 % | 10.0 | 9.67 |

## foule=0.2 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.1 | 8.5 | 10.5 | 100 % | 85 % | — | 719 | 251 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.3 | 7.0 | 8.4 | 100 % | 86 % | — | 987 | 220 | 4 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.1 | 24.9 | 27.9 | 89 % | 23 % | 69 % | 1169 | 398 | 43 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.8 | 6.9 | 8.3 | 100 % | 84 % | 77 % | 0 | 0 | 0 % | 15.2 | 8.72 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.0 | 6.7 | 7.4 | 100 % | 87 % | 58 % | 0 | 0 | 0 % | 17.6 | 9.89 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.8 | 4.4 | 5.3 | 100 % | 97 % | 65 % | 0 | 0 | 0 % | 12.0 | 10.04 |
| V2 · calibré + classification marche/danse | 100 % | 1.8 | 4.5 | 5.4 | 100 % | 97 % | 61 % | 0 | 0 | 0 % | 11.2 | 9.95 |

## foule=0.8 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.3 | 8.8 | 10.7 | 100 % | 88 % | — | 948 | 355 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.9 | 6.7 | 8.0 | 100 % | 90 % | — | 1080 | 239 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.7 | 27.6 | 31.3 | 80 % | 17 % | 59 % | 1127 | 331 | 49 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.7 | 12.0 | 14.4 | 100 % | 75 % | 71 % | 0 | 0 | 0 % | 34.0 | 6.53 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.1 | 10.5 | 12.5 | 100 % | 82 % | 63 % | 0 | 0 | 0 % | 26.4 | 7.76 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 2.0 | 6.7 | 9.2 | 100 % | 91 % | 66 % | 0 | 0 | 0 % | 19.6 | 7.81 |
| V2 · calibré + classification marche/danse | 100 % | 2.0 | 6.4 | 9.6 | 100 % | 92 % | 62 % | 0 | 0 | 0 % | 16.6 | 7.77 |

## foule=0.8 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 7.8 | 9.0 | 100 % | 87 % | — | 705 | 311 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.7 | 5.6 | 6.6 | 100 % | 88 % | — | 712 | 194 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.7 | 28.6 | 32.5 | 90 % | 16 % | 65 % | 1149 | 360 | 48 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.4 | 10.1 | 12.2 | 100 % | 75 % | 74 % | 0 | 0 | 0 % | 22.2 | 6.91 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.1 | 8.0 | 10.0 | 100 % | 84 % | 59 % | 0 | 0 | 0 % | 23.7 | 8.03 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 2.0 | 5.5 | 7.8 | 100 % | 93 % | 60 % | 0 | 0 | 0 % | 9.9 | 8.10 |
| V2 · calibré + classification marche/danse | 100 % | 2.0 | 5.2 | 7.6 | 100 % | 92 % | 59 % | 0 | 0 | 0 % | 9.2 | 8.05 |

### Lecture
- **Vérité dans r68** : part du temps où la position réelle est dans le rayon de confiance affiché (cible ≈ 68 % ; plus bas = l'app ment sur sa précision).
- **Sauts >3 m** : déplacements de l'avatar affiché de plus de 3 m en 0,1 s (téléportations visibles). Les réacquisitions explicites du V2 (fondu signalé) sont comptées à part.
- **Traversées de mur** : segments d'animation de l'avatar qui coupent un mur.
