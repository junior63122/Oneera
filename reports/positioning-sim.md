# Banc de localisation — SIMULATION

> Résultats de simulation sur le « Club de test » synthétique (2 niveaux, 20 balises). Le modèle radio du monde simulé diffère volontairement de celui du moteur. **Ces chiffres ne remplacent pas une mesure terrain** (cf. docs/positioning/field-protocol.md).

Configuration : 6 soirées simulées par condition, 10 déplacements par soirée, 1500 particules. Durée du banc : 658 s.

## foule=0.2 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 8.3 | 10.2 | 100 % | 90 % | — | 981 | 335 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.0 | 6.8 | 8.4 | 100 % | 89 % | — | 1205 | 270 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 12.6 | 27.1 | 30.2 | 87 % | 25 % | 64 % | 1159 | 320 | 48 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.6 | 6.0 | 7.7 | 100 % | 88 % | 88 % | 0 | 0 | 0 % | 24.4 | 8.47 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 2.3 | 5.1 | 6.5 | 100 % | 92 % | 72 % | 0 | 0 | 0 % | 16.5 | 9.80 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.6 | 3.8 | 4.8 | 100 % | 98 % | 72 % | 0 | 0 | 0 % | 10.7 | 9.69 |
| V2 · calibré + classification marche/danse | 100 % | 1.7 | 3.5 | 4.5 | 100 % | 98 % | 67 % | 0 | 0 | 0 % | 10.7 | 9.62 |

## foule=0.2 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.1 | 8.5 | 10.5 | 100 % | 84 % | — | 726 | 282 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.3 | 6.9 | 8.2 | 100 % | 86 % | — | 971 | 230 | 4 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.5 | 24.8 | 27.9 | 89 % | 23 % | 69 % | 1169 | 355 | 40 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.9 | 6.9 | 8.5 | 100 % | 83 % | 75 % | 0 | 0 | 0 % | 20.0 | 8.14 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.0 | 6.6 | 8.2 | 100 % | 85 % | 54 % | 0 | 0 | 0 % | 20.8 | 9.22 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.8 | 4.3 | 5.3 | 100 % | 97 % | 62 % | 0 | 0 | 0 % | 12.0 | 9.33 |
| V2 · calibré + classification marche/danse | 100 % | 1.8 | 4.4 | 5.4 | 100 % | 97 % | 61 % | 0 | 0 | 0 % | 11.2 | 9.25 |

## foule=0.8 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.3 | 8.8 | 10.7 | 100 % | 89 % | — | 871 | 312 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.9 | 6.2 | 7.5 | 100 % | 91 % | — | 974 | 197 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.9 | 26.6 | 30.3 | 80 % | 20 % | 61 % | 1145 | 337 | 49 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.3 | 11.4 | 14.1 | 99 % | 75 % | 74 % | 0 | 0 | 0 % | 33.2 | 6.23 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 2.9 | 8.3 | 10.9 | 100 % | 84 % | 65 % | 0 | 0 | 0 % | 23.4 | 7.50 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.7 | 6.4 | 8.9 | 100 % | 92 % | 68 % | 0 | 0 | 0 % | 22.6 | 7.49 |
| V2 · calibré + classification marche/danse | 100 % | 1.8 | 6.2 | 8.3 | 100 % | 92 % | 65 % | 0 | 0 | 0 % | 23.4 | 7.43 |

## foule=0.8 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 7.7 | 8.5 | 100 % | 88 % | — | 683 | 279 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.7 | 5.3 | 6.3 | 100 % | 89 % | — | 635 | 158 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.9 | 27.3 | 31.8 | 90 % | 16 % | 65 % | 1151 | 309 | 52 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.2 | 10.2 | 11.8 | 100 % | 76 % | 77 % | 0 | 0 | 0 % | 23.0 | 6.72 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.0 | 8.0 | 10.7 | 100 % | 83 % | 61 % | 0 | 0 | 0 % | 14.5 | 7.94 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.8 | 5.0 | 6.9 | 100 % | 94 % | 63 % | 0 | 0 | 0 % | 8.4 | 7.95 |
| V2 · calibré + classification marche/danse | 100 % | 1.9 | 5.4 | 6.9 | 100 % | 94 % | 64 % | 0 | 0 | 0 % | 10.7 | 7.92 |

### Lecture
- **Vérité dans r68** : part du temps où la position réelle est dans le rayon de confiance affiché (cible ≈ 68 % ; plus bas = l'app ment sur sa précision).
- **Sauts >3 m** : déplacements de l'avatar affiché de plus de 3 m en 0,1 s (téléportations visibles). Les réacquisitions explicites du V2 (fondu signalé) sont comptées à part.
- **Traversées de mur** : segments d'animation de l'avatar qui coupent un mur.
