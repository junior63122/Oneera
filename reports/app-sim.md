# Banc « toute l'application » par solution — SIMULATION

> Club de test, 24 visiteurs équipés × 25 min (coupure de 8 min incluse), Android, coupure réseau de 8 min en cours de soirée. **Simulation : à confirmer sur site.** Durée : 1393 s.

Lecture : **carte de chaleur** = part de la densité affichée au mauvais endroit (0 % = parfait), par minute, après lissage 3 m. **Occupation** = erreur relative du nombre de personnes par zone et par minute. **Flux** = transitions entre zones retrouvées (précision : transitions affichées qui sont vraies ; rappel : vraies transitions retrouvées). **Temps passé** = erreur relative sur la durée d'un séjour. **Complétude** = part des minutes de la soirée présentes dans les données.

## Foule : club plein

| Solution | Position médiane / P95 | Bonne zone | Sauts > 3 m /h | Murs traversés /h | Hors carte | Carte de chaleur 2 m / 4 m (erreur) | Occupation zone (méd. / P90) | Flux précision / rappel | Temps passé (erreur méd.) | Complétude sans / avec tampon |
|---|---|---|---|---|---|---|---|---|---|---|
| BLE balises (actuel) | 2.0 / 5.8 m | 98 % | 1 | 1 | 0.00 % | 40 % / 44 % (2 m sans tampon : 60 %) | 0 % / 2 % | 96 % / 97 % | 0 % | 68 % / 100 % |
| BLE, 2× plus de balises | 1.6 / 4.6 m | 99 % | 1 | 1 | 0.00 % | 32 % / 35 % (2 m sans tampon : 55 %) | 0 % / 1 % | 100 % / 100 % | 0 % | 68 % / 100 % |
| BLE 2× + UWB ancres | 0.4 / 1.8 m | 99 % | 1 | 1 | 0.00 % | 10 % / 11 % (2 m sans tampon : 40 %) | 0 % / 1 % | 99 % / 99 % | 0 % | 68 % / 100 % |

## Foule : compact

| Solution | Position médiane / P95 | Bonne zone | Sauts > 3 m /h | Murs traversés /h | Hors carte | Carte de chaleur 2 m / 4 m (erreur) | Occupation zone (méd. / P90) | Flux précision / rappel | Temps passé (erreur méd.) | Complétude sans / avec tampon |
|---|---|---|---|---|---|---|---|---|---|---|
| BLE balises (actuel) | 3.6 / 12.6 m | 93 % | 19 | 13 | 0.00 % | 51 % / 59 % (2 m sans tampon : 68 %) | 3 % / 23 % | 73 % / 90 % | 1 % | 68 % / 100 % |
| BLE, 2× plus de balises | 2.7 / 10.9 m | 94 % | 15 | 8 | 0.00 % | 47 % / 51 % (2 m sans tampon : 66 %) | 4 % / 15 % | 82 % / 91 % | 1 % | 68 % / 100 % |
| BLE 2× + UWB ancres | 0.8 / 4.9 m | 98 % | 4 | 5 | 0.00 % | 19 % / 21 % (2 m sans tampon : 46 %) | 1 % / 8 % | 97 % / 95 % | 1 % | 68 % / 100 % |

