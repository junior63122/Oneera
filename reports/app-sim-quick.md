# Banc « toute l'application » par solution — SIMULATION

> Club de test, 12 visiteurs équipés × 15 min, Android, coupure réseau de 8 min en cours de soirée. **Simulation : à confirmer sur site.** Durée : 420 s.

Lecture : **carte de chaleur** = part de la densité affichée au mauvais endroit (0 % = parfait), par minute, après lissage 3 m. **Occupation** = erreur relative du nombre de personnes par zone et par minute. **Flux** = transitions entre zones retrouvées (précision : transitions affichées qui sont vraies ; rappel : vraies transitions retrouvées). **Temps passé** = erreur relative sur la durée d'un séjour. **Complétude** = part des minutes de la soirée présentes dans les données.

## Foule : club plein

| Solution | Position médiane / P95 | Bonne zone | Sauts > 3 m /h | Murs traversés /h | Hors carte | Carte de chaleur (erreur) | Occupation zone (méd. / P90) | Flux précision / rappel | Temps passé (erreur méd.) | Complétude sans / avec tampon |
|---|---|---|---|---|---|---|---|---|---|---|
| BLE balises (actuel) | 1.8 / 6.2 m | 98 % | 2 | 2 | 0.00 % | 39 % (69 % sans tampon) | 0 % / 1 % | 100 % / 100 % | 0 % | 47 % / 100 % |
| BLE, 2× plus de balises | 1.6 / 5.2 m | 99 % | 0 | 0 | 0.00 % | 35 % (68 % sans tampon) | 0 % / 1 % | 100 % / 100 % | 0 % | 47 % / 100 % |
| BLE 2× + UWB ancres | 0.4 / 1.9 m | 99 % | 1 | 1 | 0.00 % | 9 % (54 % sans tampon) | 0 % / 1 % | 100 % / 100 % | 0 % | 47 % / 100 % |

## Foule : compact

| Solution | Position médiane / P95 | Bonne zone | Sauts > 3 m /h | Murs traversés /h | Hors carte | Carte de chaleur (erreur) | Occupation zone (méd. / P90) | Flux précision / rappel | Temps passé (erreur méd.) | Complétude sans / avec tampon |
|---|---|---|---|---|---|---|---|---|---|---|
| BLE balises (actuel) | 3.6 / 13.9 m | 95 % | 18 | 14 | 0.00 % | 57 % (77 % sans tampon) | 3 % / 10 % | 84 % / 97 % | 1 % | 47 % / 100 % |
| BLE, 2× plus de balises | 2.8 / 10.8 m | 95 % | 11 | 8 | 0.00 % | 50 % (74 % sans tampon) | 1 % / 10 % | 88 % / 97 % | 1 % | 47 % / 100 % |
| BLE 2× + UWB ancres | 0.8 / 5.0 m | 98 % | 8 | 9 | 0.00 % | 21 % (60 % sans tampon) | 1 % / 2 % | 92 % / 92 % | 1 % | 47 % / 100 % |

