# ONEERA V2

Géolocalisation événementielle et intelligence opérationnelle des lieux recevant du public : se repérer, **retrouver ses amis**, comprendre l'occupation et les flux, gérer les équipes et les incidents.

> État : **alpha technique**. Le moteur de localisation et son banc de mesure sont exécutables et testés **en simulation**. Aucune précision n'est revendiquée tant qu'elle n'a pas été mesurée sur site (`docs/positioning/field-protocol.md`).

## Contenu

| Chemin | Rôle |
|---|---|
| `packages/positioning` | Moteur de localisation (filtre particulaire contraint par la carte : BLE, GNSS, podomètre/cap, baromètre ; itinéraires multi-étages ; affichage sans téléportation ; proximité amis) |
| `packages/simulator` | Club synthétique, monde radio volontairement différent du moteur, banc comparatif (`reports/positioning-sim.md`) |
| `docs/architecture.md` | Architecture cible V2 |
| `docs/positioning/` | Fonctionnement du moteur, protocole de mesure terrain |
| `docs/validation-grid.md` | Critères chiffrés et seuils bloquants de mise en production |
| `docs/decisions.md` | Journal des décisions |
| `docs/audit/v1-findings.md` | Défauts techniques de la V1 et réponses V2 |

## Démarrer

```bash
pnpm install
pnpm test                 # tests unitaires
pnpm bench:positioning    # banc de simulation complet (~4 min) → reports/
pnpm --filter @oneera/simulator bench -- --quick
```

## Résultats actuels (SIMULATION — club synthétique, 20 balises)

Moteur V2 complet, calibré sur site, comparé à l'approche « balise la plus proche » de la V1 :

| Condition | Méthode | Médiane | P95 | Bonne zone | Sauts > 3 m /h | Traversées de mur /h |
|---|---|---|---|---|---|---|
| Foule légère, Android | V1-like | 3,7 m | 10,2 m | 90 % | 987 | 330 |
| Foule légère, Android | **V2** | **1,6 m** | **4,4 m** | **97 %** | **0** | **0** |
| Foule dense, iOS | V1-like | 3,7 m | 8,6 m | 87 % | 695 | 286 |
| Foule dense, iOS | **V2** | **2,1 m** | 9,1 m | 88 % | **0** | **0** |

En foule dense, la bonne zone (88 %) reste sous la cible de 93 % : c'est le chantier prioritaire (densité de balises, modèle adaptatif à la foule, classification d'activité). Chiffres complets et limites dans `reports/positioning-sim.md`.
