# ONEERA V2

Géolocalisation événementielle et intelligence opérationnelle des lieux recevant du public : se repérer, **retrouver ses amis**, comprendre l'occupation et les flux, gérer les équipes et les incidents.

> État : **alpha technique**. Le moteur de localisation et son banc de mesure sont exécutables et testés **en simulation**. Aucune précision n'est revendiquée tant qu'elle n'a pas été mesurée sur site (`docs/positioning/field-protocol.md`).

## Contenu

| Chemin | Rôle |
|---|---|
| `packages/positioning` | Moteur de localisation (filtre particulaire contraint par la carte : BLE, GNSS, podomètre/cap, baromètre ; itinéraires multi-étages ; affichage sans téléportation ; proximité amis) |
| `packages/backend` | Schéma PostgreSQL/PostGIS multi-établissements avec Row-Level Security, passerelle WebSocket temps réel, test de charge (`reports/realtime-load.md`) |
| `packages/simulator` | Club synthétique, monde radio volontairement différent du moteur, banc comparatif (`reports/positioning-sim.md`) |
| `apps/field-recorder` | App de mesure terrain (Expo) : enregistre capteurs + points de vérité, export rejouable (`packages/simulator/src/replay.ts`) |
| `examples/` | Plan du club de test (format `VenueDef`) |
| `docs/architecture.md` | Architecture cible V2 |
| `docs/positioning/` | Fonctionnement du moteur, protocole de mesure terrain, préparation des balises |
| `docs/validation-grid.md` | Critères chiffrés et seuils bloquants de mise en production |
| `docs/decisions.md` | Journal des décisions |
| `docs/audit/v1-findings.md` | Défauts techniques de la V1 et réponses V2 |

## Démarrer

```bash
pnpm install
scripts/dev-db.sh         # PostgreSQL + PostGIS local jetable (affiche TEST_DATABASE_URL)
pnpm test                 # tests unitaires, sécurité/RGPD (base réelle), passerelle
pnpm bench:positioning    # banc de simulation complet (~4 min) → reports/
pnpm --filter @oneera/simulator bench -- --quick
```

## Résultats actuels (SIMULATION — club synthétique, 20 balises)

Moteur V2 complet, calibré sur site, comparé à l'approche « balise la plus proche » de la V1 :

| Condition | Méthode | Médiane | P95 | Bonne zone | Sauts > 3 m /h | Traversées de mur /h |
|---|---|---|---|---|---|---|
| Foule légère, Android | V1-like | 3,7 m | 10,2 m | 90 % | 987 | 330 |
| Foule légère, Android | **V2** | **1,6 m** | **4,8 m** | **98 %** | **0** | **0** |
| Foule dense, iOS | V1-like | 3,7 m | 8,6 m | 87 % | 695 | 286 |
| Foule dense, iOS | **V2** | **1,8 m** | **6,9 m** | **94 %** | **0** | **0** |
| Foule dense, Android | **V2** | **1,7 m** | 8,9 m | 92 % | **0** | **0** |

Depuis le 26/11/2026, le banc compare aussi une variante **sans aucune donnée vérité** : l'état « immobile / marche / danse » est déduit du seul flux de pas (D-019). Avec le modèle de foule plus réaliste (atténuation aléatoire et variable, relancé le 26/11), elle est équivalente à la variante « vérité » (Android foule dense : P90 6,4 m, P95 9,6 m, zone 92 %) ; la cible Android foule dense (zone ≥ 93 %, P95 ≤ 8 m) n'est **pas** atteinte avec des balises BLE seules. Les bancs `friends`, `mesh` et `crowdflow` (`reports/friends-sim.md`, `mesh-sim.md`, `app-sim.md`) comparent les technologies candidates en foule très dense et sans réseau.

L'apprentissage en ligne de l'atténuation due à la foule a fait passer la bonne zone en foule dense de 88–89 % à 92–94 %. Android en foule dense (92 %, P95 8,9 m) reste sous les cibles (93 %, 8 m) : prochains leviers = densité de balises, classification danse/marche. Chiffres complets et limites dans `reports/positioning-sim.md`.
