# Questions ouvertes : décisions qui t'attendent

Je n'ai rien inventé pour ces points : soit ils engagent une dépense ou un compte, soit la spécification ne dit pas ce qu'ils doivent faire.

## Q-01 — Connexion Apple et Google

Le code est prêt. Les routes répondent « pas encore configurée » (503).

Il te faut deux actions :
1. Activer la capacité **Sign in with Apple** sur l'identifiant `com.mapping.festival` dans ton compte Apple Developer.
2. Créer un **identifiant client OAuth iOS** dans Google Cloud et me le donner.

Ce sont des comptes à ton nom : je ne peux pas le faire à ta place.

## Q-02 — Plus de 12 000 personnes en même temps

Mesures sur une machine de test à 4 cœurs, avec un seul serveur :

| Personnes | Positions livrées | Délai (95 %) |
|---|---|---|
| 10 000 | 100 % | 430 ms |
| 12 000 | 100 % | 660 ms |
| 20 000 | Effondrement (avant le plafond) | — |

Un plafond de 15 000 personnes par serveur protège désormais ceux qui sont déjà connectés.

Pour 100 000 personnes, il faut **plusieurs serveurs** et un relais entre eux, pour que deux amis sur deux serveurs différents se voient. Cela implique :
- un changement d'architecture, environ 1 à 2 jours de travail ;
- **un coût d'hébergement** : plusieurs instances Render, plus un service de messagerie de type Redis.

C'est une dépense : à toi de décider quand la lancer.

## Q-03 — Staff, bar, signalements et tableau de bord

Ces écrans sont des maquettes complètes et cliquables, mais leurs données sont fictives.

Sur un compte réel, l'app prévient honnêtement : « l'alerte n'est pas encore transmise à une équipe… appelle le 112 ».

Pour les brancher au serveur, il faut que tu décides :
- qui reçoit les alertes ;
- avec quels rôles et quelles personnes ;
- avec quel engagement de réponse.

Ces choix ont une portée légale et de sécurité pour les organisateurs.

## Q-04 — Communication organisateur : « Une zone »

Le bouton sélectionne bien la cible, mais on ne peut pas encore choisir *quelle* zone. Il faut décider :
- par une liste des zones du lieu ;
- ou en dessinant sur la carte.

## Q-05 — Cible du test de charge

Ton prompt demande 100 000 utilisateurs. Cette machine de test ne peut pas ouvrir plus de 20 000 connexions par processus, et la limite ne peut pas être relevée ici.

La mesure à 100 000 se fera sur l'infrastructure réelle à plusieurs serveurs (Q-02).
