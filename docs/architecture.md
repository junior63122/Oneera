# Architecture cible ONEERA V2

## Principes

1. **La localisation d'abord, mesurée.** Rien n'est construit sur une position non qualifiée : toute position porte un rayon de confiance, un étage, une probabilité de zone et un âge.
2. **Un seul moteur partout.** `@oneera/positioning` (TypeScript, sans dépendance native) tourne sur le téléphone, dans le simulateur, dans les tests et dans le replay serveur. Ce qui est mesuré est ce qui est livré.
3. **Souveraineté et portabilité.** Briques open source (PostgreSQL/PostGIS, Redis, Node), conteneurs, hébergement UE ; tous les comptes au nom d'ONEERA SAS. Aucun BaaS propriétaire au cœur.
4. **Confidentialité par conception.** Le partage entre amis (individuel, volontaire, révocable) et les indicateurs organisateur (agrégés, k-anonymes) sont deux traitements séparés, stockés séparément.
5. **Dégradé intelligent.** Sans réseau : carte, position locale, programme et signalements en file restent disponibles ; ce qui est ancien est affiché comme ancien.
6. **Indépendance de la V1.** Reconstruction « salle blanche » : aucun code, design, texte ou asset du prestataire V1.

## Vue d'ensemble

```
┌──────────────────────── Téléphone (iOS / Android) ────────────────────────┐
│ App React Native (TypeScript)                                             │
│  ├─ Modules natifs : CoreLocation (iBeacon ranging, GNSS), CoreMotion,    │
│  │   Android BLE scanner (service de premier plan), capteurs, baromètre   │
│  ├─ @oneera/positioning : filtre particulaire contraint par la carte      │
│  ├─ Rendu carte : vectoriel GPU (MapLibre RN + couches custom / Skia)     │
│  └─ Stockage local chiffré : lieu, carte radio, file d'envoi              │
└───────────────┬───────────────────────────────────────────────────────────┘
                │ WSS (positions qualifiées, 1/1–2 s en mouvement, 1/10 s immobile)
┌───────────────▼──────────────┐     ┌──────────────────────────────────────┐
│ Gateway temps réel (Node/TS) │◄───►│ Redis : pub/sub par lieu, présence   │
│ authN (JWT court), autorisa- │     └──────────────────────────────────────┘
│ tion par relation d'amitié,  │
│ fan-out amis / staff         │     ┌──────────────────────────────────────┐
└───────────────┬──────────────┘     │ Workers                              │
                │                    │  agrégats densité/flux (k ≥ 5),      │
┌───────────────▼──────────────┐     │  alertes, purge RGPD, notifications, │
│ API (Node/TS, OpenAPI)       │◄───►│  relais WhatsApp, calibration        │
│ lieux, cartes versionnées,   │     └──────────────────────────────────────┘
│ comptes, amis, incidents,    │
│ rôles, exports               │     ┌──────────────────────────────────────┐
└───────────────┬──────────────┘     │ PostgreSQL 16 + PostGIS + Timescale  │
                └───────────────────►│  RLS par établissement (tenant)      │
                                     │  positions brutes : rétention courte │
                                     │  agrégats : rétention longue         │
                                     └──────────────────────────────────────┘
   Dashboard organisateur (React + MapLibre GL + deck.gl) · Console admin · Outil de calibration
```

## Domaine (modèle de données, extrait)

- `tenant` (ONEERA ou marque blanche : branding, domaines d'envoi, clés push) → `organization` (exploitant) → `venue` (lieu permanent ou site de festival) → `venue_map` (version : étages, praticable, murs, zones, POI, balises, géoréférence) → `event` → `occurrence` (plage horaire, peut chevaucher minuit).
- `beacon` (UUID/Major/Minor, position, étage, puissance calibrée, dernière vue, batterie TLM).
- `user` (optionnel : session invité possible), `friendship`, `location_share` (portée, expiration, révocation), `position_fix` (téléphone → serveur, rétention courte), `zone_occupancy` / `flow_od` (agrégats par pas de temps, k-anonymes, avec couverture).
- `incident` (catégorie, priorité, position, assignations, statuts horodatés), `staff_role`, `audit_log`.

L'isolement multi-établissements est appliqué **dans la base** (Row-Level Security sur `organization_id`), pas seulement dans le code.

## Localisation

Voir `docs/positioning/engine.md`. Résumé : particules sur la grille praticable de chaque étage ; prédiction par podomètre + cap (biais appris) ou marche aléatoire bornée ; élimination à la traversée d'un mur ; changement d'étage seulement par un escalier/ascenseur ; pondération BLE (carte radio a priori + calibration terrain), GNSS (Student-t, gonflé en intérieur), baromètre ; réinjection continue depuis les mesures ; estimation = mode (jamais une moyenne qui tomberait dans un mur) ; rayons 68/95 % recalibrés ; l'avatar affiché marche le long d'un itinéraire A*.

## Temps réel et montée en charge

- Le téléphone publie une position **déjà qualifiée** (pas de recalcul serveur ni chez les amis → supprime la classe de bugs « chacun voit l'autre à la mauvaise balise »).
- Un abonné public ne reçoit que : ses amis + des tuiles de densité agrégées. 5 000 visiteurs × 1 msg/1,5 s ≈ 3 300 msg/s entrants par carte, fan-out moyen faible (taille des groupes d'amis) : tenable par 2–3 instances gateway + Redis ; à démontrer par test de charge (outil k6/Artillery, scénario 5 000 et 25 000 clients).
- Positions brutes écrites par lots dans TimescaleDB ; agrégats calculés en continu (fenêtres 10 s / 1 min).

## Analytics honnêtes

Chaque indicateur porte : nombre d'appareils localisés, référence de fréquentation (comptage d'entrée/billetterie si fournie), **taux de couverture**, intervalle d'estimation et fraîcheur. Les estimations de fréquentation totale sont étiquetées « estimation » et ne sont jamais présentées comme des comptages. Flux = transitions réelles entre zones / arêtes du graphe de circulation à partir des trajectoires lissées, jamais des arcs synthétiques.

## Sécurité

JWT courts + refresh rotatif, Sign in with Apple / Google / lien magique ; secrets dans un coffre ; chiffrement en transit (TLS 1.3) et au repos ; journal d'audit ; limitation de débit ; dépendances scannées en CI ; tests automatisés d'isolement et d'autorisation des positions.

## Ce qui reste à décider (avec justification à produire)

- MapLibre RN vs rendu Skia pur pour la carte intérieure (prototype comparatif FPS/mémoire sur appareils).
- Hébergeur UE (Scaleway / OVHcloud / AWS eu-west-3) — décision de dépense.
- SDK partenaire : module RN + façades natives iOS/Android, ou API + composants web.
