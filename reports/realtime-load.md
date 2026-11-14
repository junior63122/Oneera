# Test de charge — passerelle temps réel (machine unique)

> Mesuré le 14/11/2026 sur un conteneur 4 vCPU, PostgreSQL 16 + PostGIS local, **une seule instance** de passerelle, clients simulés dans le **même processus** (ils consomment une partie du CPU). Réseau = boucle locale : la latence radio/opérateur mobile (typiquement 50–300 ms, davantage en réseau saturé) **n'est pas incluse**. Commande : `tsx packages/backend/src/loadtest.ts <clients> <durée>`.

Scénario : visiteurs en groupes de 4 amis, tous en partage actif, une position toutes les ~1,5 s, chaque position diffusée aux 3 amis et écrite en base (dernière position + historique).

| Clients | Positions reçues /s | Livraisons /s | Taux de livraison | Latence p50 | p95 | p99 | max | Écritures perdues |
|---|---|---|---|---|---|---|---|---|
| 1 000 | 608 | 1 825 | 100 % | 0 ms | 1 ms | 3 ms | 17 ms | 0 |
| 5 000 | 3 078 | 9 235 | 100 % | 2 ms | 113 ms | 982 ms | 1 901 ms | 0 |

Lecture :
- La cible « 5 000 simultanés par carte, p95 ami→ami ≤ 3 s » est tenue côté serveur sur une seule machine, **hors réseau mobile**.
- La queue p99 (~1 s) à 5 000 clients vient probablement des écritures groupées qui bloquent la boucle d'événements (sérialisation de lots ~900 positions) : à déplacer dans un worker ou à fractionner avant le passage multi-instances.
- Non testé : plusieurs instances (bus Redis non implémenté), reconnexions massives, réseau dégradé, 25 000 clients sur 5 cartes.
