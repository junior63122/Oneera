# Banc de localisation — SIMULATION

> Résultats de simulation sur le « Club de test » synthétique (2 niveaux, 20 balises). Le modèle radio du monde simulé diffère volontairement de celui du moteur. **Ces chiffres ne remplacent pas une mesure terrain** (cf. docs/positioning/field-protocol.md).

Configuration : 6 soirées simulées par condition, 10 déplacements par soirée, 1500 particules. Durée du banc : 237 s.

## foule=0.2 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 8.2 | 10.2 | 100 % | 90 % | — | 987 | 330 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.0 | 6.8 | 8.6 | 100 % | 89 % | — | 1218 | 257 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 12.6 | 26.9 | 30.3 | 87 % | 25 % | 65 % | 1168 | 326 | 47 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.4 | 5.6 | 7.2 | 100 % | 88 % | 88 % | 0 | 0 | 0 % | 20.1 | 3.53 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 2.2 | 4.6 | 5.6 | 100 % | 91 % | 73 % | 0 | 0 | 0 % | 19.4 | 4.52 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.6 | 3.5 | 4.4 | 100 % | 97 % | 70 % | 0 | 0 | 0 % | 10.8 | 4.44 |

## foule=0.2 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.1 | 8.5 | 10.5 | 100 % | 84 % | — | 723 | 280 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 3.2 | 6.9 | 8.3 | 100 % | 86 % | — | 967 | 211 | 4 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 13.7 | 24.8 | 28.0 | 89 % | 23 % | 69 % | 1156 | 359 | 40 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 2.6 | 6.3 | 7.6 | 100 % | 85 % | 80 % | 0 | 0 | 0 % | 20.0 | 3.70 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 2.8 | 6.2 | 7.4 | 100 % | 87 % | 57 % | 0 | 0 | 0 % | 14.4 | 4.62 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.8 | 4.1 | 5.3 | 100 % | 97 % | 60 % | 0 | 0 | 0 % | 12.8 | 4.70 |

## foule=0.8 · android

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 4.2 | 8.6 | 10.2 | 100 % | 89 % | — | 884 | 316 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.9 | 6.2 | 7.4 | 100 % | 91 % | — | 989 | 200 | 3 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 14.0 | 26.4 | 30.0 | 80 % | 20 % | 61 % | 1145 | 344 | 49 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.5 | 11.5 | 13.8 | 99 % | 75 % | 75 % | 0 | 0 | 0 % | 41.5 | 2.70 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.2 | 9.9 | 11.4 | 100 % | 81 % | 68 % | 0 | 0 | 0 % | 26.4 | 3.67 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 1.9 | 6.8 | 9.4 | 100 % | 89 % | 65 % | 0 | 0 | 0 % | 30.2 | 3.68 |

## foule=0.8 · ios

| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V1-like : balise la plus forte | 100 % | 3.7 | 7.7 | 8.6 | 100 % | 87 % | — | 695 | 286 | 0 % | 0.0 | 0.00 |
| Barycentre pondéré (3 balises) | 100 % | 2.7 | 5.3 | 6.4 | 100 % | 89 % | — | 637 | 151 | 2 % | 0.0 | 0.01 |
| GNSS seul | 100 % | 14.1 | 27.4 | 31.8 | 90 % | 16 % | 64 % | 1152 | 306 | 51 % | 0.0 | 0.00 |
| V2 · BLE sans PDR, non calibré | 100 % | 3.3 | 9.9 | 11.7 | 100 % | 76 % | 75 % | 0 | 0 | 0 % | 26.8 | 2.94 |
| V2 · BLE+PDR+baro, non calibré | 100 % | 3.1 | 7.7 | 10.5 | 100 % | 83 % | 58 % | 0 | 0 | 0 % | 19.9 | 3.84 |
| V2 · BLE+PDR+baro, calibré sur site | 100 % | 2.1 | 6.3 | 9.1 | 100 % | 88 % | 57 % | 0 | 0 | 0 % | 8.4 | 3.91 |

### Lecture
- **Vérité dans r68** : part du temps où la position réelle est dans le rayon de confiance affiché (cible ≈ 68 % ; plus bas = l'app ment sur sa précision).
- **Sauts >3 m** : déplacements de l'avatar affiché de plus de 3 m en 0,1 s (téléportations visibles). Les réacquisitions explicites du V2 (fondu signalé) sont comptées à part.
- **Traversées de mur** : segments d'animation de l'avatar qui coupent un mur.
