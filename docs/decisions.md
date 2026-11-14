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
| D-012 | 2026-11-14 | Autorisations appliquées par la base (RLS, rôle `oneera_app` non propriétaire) et testées (21 tests, dont un test de mutation) | Une erreur de code applicatif ne doit pas suffire à exposer une position ou un autre établissement | Contrôles uniquement dans l'API | Adopté |
| D-013 | 2026-11-14 | Établissement d'une donnée et consentement statistique déterminés par des déclencheurs, jamais par le client | Faille identifiée en conception (auto-acceptation d'amitié, organisation forgée) | Confiance dans le client | Adopté |
| D-014 | 2026-11-14 | Passerelle WebSocket : audience calculée par la base, invalidée par NOTIFY, écriture par lots | Révocation < 2 s mesurée (≈ 0,4 s), 5 000 clients tenus sur une machine | Firebase RTDB (V1) | Adopté ; bus Redis multi-instances à faire |
| D-015 | 2026-11-14 | Atténuation due à la foule apprise en ligne par particule | Carte radio calibrée à vide ≠ soirée pleine. Banc (après correctif ligne de vue) : foule dense P95 9,1–9,4 → 6,9–8,9 m, zone 88–89 → 92–94 % ; foule légère P90 +0,1–0,3 m | Paramètre fixe | Adopté |
| D-016 | 2026-11-14 | Ligne de vue exacte (parcours de toutes les cellules) au lieu d'un échantillonnage | Avatar affiché hors zone praticable sur 0,03 % des images près des montants de porte (détecté par le test de non-régression) | Échantillonnage tous les 25 cm | Adopté |
| D-017 | 2026-11-14 | Sessions terrain au format brut JSON Lines (`oneera-session`), rejouables par n'importe quelle version du moteur | Comparer les versions du moteur sur les mêmes mesures réelles ; traçabilité | Enregistrer seulement les positions calculées | Adopté |
| D-018 | 2026-11-14 | Réutiliser d'abord le stock de ~43 DX-SMART CP28 reconfigurées en iBeacon | Coût nul ; à valider par le test 5 balises / iPhone | Achat immédiat | Proposé |
