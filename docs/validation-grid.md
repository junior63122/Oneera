# Grille de validation chiffrée — ONEERA V2

Chaque indicateur a une **cible** (ce que l'on vise) et un **seuil bloquant** (en dessous, pas de mise en production). Les seuils de localisation se valident **uniquement sur matériel réel**, dans le lieu, selon `docs/positioning/field-protocol.md`. Une valeur obtenue en simulation est marquée « SIM » et ne lève jamais un seuil bloquant.

## Géolocalisation (par lieu, après calibration, zones équipées)

| Indicateur | Définition | Cible | Bloquant | Justification |
|---|---|---|---|---|
| Erreur horizontale médiane | distance estimation ↔ point de contrôle | ≤ 3 m | > 5 m | Retrouver quelqu'un « à portée de vue » dans un club dense |
| Erreur P90 | 90ᵉ centile | ≤ 6 m | > 10 m | La littérature mesure 8,7–12,3 m en BLE pur avec foule ; la fusion doit faire mieux |
| Erreur P95 | 95ᵉ centile | ≤ 8 m | > 15 m | Limiter les « mauvaises salles » |
| Bonne zone | zone estimée = zone réelle | ≥ 93 % | < 85 % | Une erreur de salle est l'échec perçu n°1 en V1 |
| Bon étage | étage estimé = réel | ≥ 98 % | < 95 % | |
| Honnêteté de la confiance | part du temps où la vérité est dans r68 | 60–80 % | < 50 % ou > 90 % | En dessous l'app ment ; au-dessus elle est inutilement floue |
| Téléportations | sauts d'avatar > 3 m en 0,1 s (hors réacquisition signalée) | 0 /h | > 0 /h | Défaut majeur V1 |
| Traversées de murs | segments d'animation coupant un mur | 0 /h | > 0 /h | Défaut majeur V1 |
| Avatar hors zone praticable | % d'images | 0 % | > 0,5 % | |
| Réacquisitions (fondu signalé) | par heure d'usage | ≤ 10 /h | > 30 /h | Corrections assumées mais à limiter |
| Délai de première position | QR scanné → position | ≤ 5 s | > 15 s | |

## Temps réel

| Indicateur | Cible | Bloquant |
|---|---|---|
| Latence ami → ami (capteur → écran), p50 / p95 | ≤ 1,5 s / ≤ 3 s | p95 > 6 s |
| Fréquence de mise à jour d'un ami en mouvement | 1 / 1–2 s | < 1 / 5 s |
| Détection d'obsolescence affichée | dès 20 s sans donnée | absente |
| Charge par carte (simultanés) | 5 000 sans dégradation | p95 > 6 s à 5 000 |

## Inscription / accès

| Indicateur | Cible | Bloquant |
|---|---|---|
| QR → carte affichée (sans compte) | ≤ 10 s, 0 formulaire | formulaire obligatoire avant la carte |
| Création de compte (Apple/Google) | ≤ 2 écrans, médiane ≤ 20 s | > 4 écrans |
| Taux d'abandon onboarding | ≤ 15 % | > 35 % |
| Usage sans permission de localisation | carte, programme, POI, signalement utilisables | blocage |

## Retrouver ses amis

| Indicateur | Cible | Bloquant |
|---|---|---|
| Ami localisé (partage actif, dans le lieu) | ≥ 95 % du temps | < 85 % |
| Temps pour rejoindre un ami (test chronométré, club en activité) | médiane ≤ 2 min | > 5 min |
| Arrêt du partage effectif chez les autres | ≤ 2 s | > 5 s ou position encore visible |

## Flux et analytics organisateur

| Indicateur | Cible | Bloquant |
|---|---|---|
| Couverture affichée | toujours (localisés / référence d'entrée) | indicateur sans couverture |
| Erreur de comptage par zone (vs comptage manuel) | ≤ 15 % après redressement | > 30 % non signalé |
| Fraîcheur des agrégats | ≤ 10 s | > 60 s |
| k-anonymat des cellules affichées | k ≥ 5 | une cellule < 5 visible |
| Accès individuel par défaut | aucun | toute identité visible |

## Dashboard

| Indicateur | Cible | Bloquant |
|---|---|---|
| Chargement initial | ≤ 2 s | > 5 s |
| Rafraîchissement live | ≥ 30 FPS carte, données ≤ 2 s | < 15 FPS |
| Tests utilisateurs organisateurs (tâches clés réussies sans aide) | ≥ 5/6 | < 4/6 (cf. V1 : 0/6) |

## Performance mobile

| Indicateur | Cible | Bloquant |
|---|---|---|
| FPS carte (iPhone 12 / Android milieu de gamme 2022) | 60 / ≥ 50 | < 30 |
| Mémoire | ≤ 250 Mo | > 400 Mo |
| Batterie, 4 h de soirée, partage actif | ≤ 20 % | > 35 % |
| Moteur de localisation (CPU par mise à jour) | ≤ 10 ms | > 30 ms |
| Taux sans crash | ≥ 99,5 % | < 99 % |

## Résilience

| Scénario | Attendu | Bloquant |
|---|---|---|
| Réseau coupé 10 min | carte + position locale OK, amis « vus il y a X min », file d'envoi | crash, position d'ami présentée comme actuelle |
| Reconnexion | rattrapage ≤ 10 s, sans doublon | perte d'incidents |
| Panne d'un nœud gateway | reconnexion auto ≤ 5 s | interruption globale |

## Sécurité

| Indicateur | Cible | Bloquant |
|---|---|---|
| Isolement inter-établissements (tests automatisés RLS) | 100 % | 1 fuite |
| Contrôle d'accès positions (non-ami, partage arrêté, expiré) | 0 accès | 1 accès |
| Vulnérabilités critiques/hautes (SAST, dépendances, pentest) | 0 | ≥ 1 non corrigée |
| Journal d'audit des actions admin | 100 % | absent |

## RGPD

| Exigence | Bloquant si absent |
|---|---|
| Registre des traitements, finalités distinctes | oui |
| AIPD validée (localisation à grande échelle) | oui |
| Consentement localisation séparé, retirable en 1 geste | oui |
| Purge automatique des positions brutes (durée validée juridiquement) | oui |
| Export et suppression de compte en libre-service | oui |
| Âge minimum et gestion des mineurs | oui |
| Liste des sous-traitants, hébergement UE | oui |
