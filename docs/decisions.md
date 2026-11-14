# Journal des décisions (ADR courts)

| # | Date | Décision | Justification | Alternatives écartées | Statut |
|---|---|---|---|---|---|
| D-001 | 2026-11-14 | Reconstruction « salle blanche », aucune ressource V1 réutilisée | Litige en cours, cession des droits incertaine ; indépendance juridique et technique | Récupérer code/Figma V1 | Adopté (validation juridique demandée) |
| D-002 | 2026-11-14 | Moteur de localisation en TypeScript pur, partagé téléphone/serveur/simulateur | Ce qui est mesuré = ce qui est livré ; RN exécute du TS ; coût CPU mesuré ~3 ms/maj | Moteur natif Swift/Kotlin dupliqué ; calcul serveur (latence, hors ligne impossible) | Adopté |
| D-003 | 2026-11-14 | Filtre particulaire contraint par la carte (murs, praticable, escaliers) | Hypothèses multiples, élimine traversées de murs et téléportations ; défaut n°1 de la V1 | Plus proche balise (V1), trilatération, Kalman | Adopté, mesuré en simulation |
| D-004 | 2026-11-14 | Pas d'AoA/AoD avec le matériel actuel | nRF52832 / DA14531 sans Direction Finding exploitable ; l'AoA exige des ancres-antennes | AoA « Bluetooth 5.1 » | Adopté |
| D-005 | 2026-11-14 | Balises en iBeacon (UUID ONEERA / Major lieu / Minor balise) | iOS ne lit pas Eddystone via CoreLocation | Eddystone-UID (V1) | Recommandé, à appliquer au pilote |
| D-006 | 2026-11-14 | Calibration radio terrain obligatoire par lieu | Gain mesuré en simulation sur médiane et zone ; la littérature confirme | Modèle seul | Adopté |
| D-007 | 2026-11-14 | Position qualifiée calculée sur le téléphone, diffusée par le serveur | Hors ligne, latence, supprime les recalculs incohérents chez les amis | Calcul serveur | Adopté |
| D-008 | 2026-11-14 | Pile backend portable : Node/TS, PostgreSQL/PostGIS/Timescale, Redis | Pas de lock-in (exigence historique), requêtes géospatiales, RLS multi-établissements | Firebase (V1) | Proposé |
| D-009 | 2026-11-14 | Rayon de confiance recalibré (facteur 1,35) et vérité-dans-r68 suivie comme KPI | Le nuage de particules sous-estime l'incertitude ; ne jamais afficher une précision fictive | Rayon brut | Adopté, à recaler sur terrain |
| D-010 | 2026-11-14 | Preuve négative BLE désactivée par défaut | Instabilité observée au banc (dégrade la confiance) | Activée | Adopté, à re-tester sur données réelles |
| D-011 | 2026-11-14 | Données organisateur agrégées k ≥ 5, couverture affichée | Séparation partage entre amis / analytics ; vérité statistique | Trajets individuels visibles (demande recette V1) | Proposé, AIPD à faire |
