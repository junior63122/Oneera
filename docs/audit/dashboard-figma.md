# Dashboard ONEERA — inventaire du Figma « Dashboard Oneera » et ajustements V2

Source : fichier Figma « Dashboard Oneera » (dernière modification 13/08/2026), lu via l'API Figma en lecture seule. 18 écrans exportés (page « Oneera »), plus les composants : barre latérale, barre supérieure, bascules, icônes, boutons de rôle Admin / Manager / Staff.

Le Figma est la **référence visuelle** du dashboard V2 : mise en page, navigation, composants et identité sont conservés. Les ajustements ci-dessous portent sur la vérité des chiffres, le RGPD et la cohérence avec le moteur de localisation.

## Structure

**Section « Dashboard Admin » (un événement en cours)** — barre latérale : Vue globale, Programmation, Balises, Utilisateurs, Artistes, Organisateurs, Partenaires, Équipe, Système social, Incidents, Communication, Replay, Paramètres. Barre supérieure : recherche, « En direct », utilisateurs connectés, occupation, incidents, notifications, thème, aide.

| Écran | Contenu |
|---|---|
| Vue globale | Pic du jour, temps moyen sur zone, présence actuelle ; plan isométrique avec zone sélectionnée (densité pers/m², agents actifs, utilisateurs, alertes) et filtres Tout / Équipe / Incidents / Heatmap / Flux ; répartition par zone ; alertes en cours (priorité, zone, catégorie, assignation, actions) ; staff assigné ; affluence temps réel ; programmation de la zone |
| Replay | Plan plein écran, panneaux Alertes, Distribution staff, Communication, Programmation, Répartition par âge, Affluence, Répartition par zone, Paramètres de lecture (staff, flux, heatmap, alertes, icônes, balises, zones repos/stagnation…), timeline avec vitesse et marqueurs d'incidents |
| Incidents (Centre d'alertes) | Compteurs (alertes, critiques, signalements, automatiques, résolus), liste filtrable, carte, fiche détaillée, **mode crise**, assignation et réassignation de staff |
| Programmation | Timeline de la soirée par scène, statut et occupation par créneau, ajout / modification de sessions |
| Équipes (Gestion du staff) | Compteurs par rôle, tableau des membres, invitations et demandes sécurisées, définition des rôles, historique d'activité, carte du staff filtrée par rôle |
| Utilisateurs | Tableau, fiche détaillée (historique des mouvements, des signalements, des alertes), export |
| Communication temps réel | Message, ciblage par audience / nature / priorité / zone, modèles, diffusions actives, **groupes WhatsApp**, historique avec taux d'ouverture |
| Partenaires | Tableau, fiche (description, réseaux sociaux, menu, emplacement sur le plan) |
| Paramètres du système | 2FA, sessions actives, « Balance de position » GPS / balise, audit système |

**Section « Dashboard global inter-événements »** : Événements (catalogue, événement actif, création avec import du plan .dwg / .pdf / .json et capacité), Comparaison de deux événements (affluence, incidents, communications, staff, cartes et replays côte à côte), Organisateurs (niveaux d'accès, invitations), Partenaires, Utilisateurs, Staff, Incidents / modération des signalements (avertissement, mise en silence, bannissement).

## Ajustements V2

1. **Chaque chiffre dit d'où il vient.** Distinguer *mesure* (comptage d'entrée, billetterie, signalements), *échantillon* (visiteurs localisés par l'app) et *estimation* (redressement de l'échantillon). Afficher la couverture (« 312 localisés / 1 240 présents = 25 % ») et un intervalle. « Présence actuelle » n'est une mesure que si une source de comptage est branchée.
2. **Anonymat des visiteurs côté organisateur.** Zones et flux agrégés seulement, masqués sous 5 personnes ; aucune fiche individuelle de déplacement d'un visiteur par défaut. L'écran Utilisateurs se limite à la gestion de compte et à la modération (signalements) ; l'« historique des mouvements » individuel est réservé au **staff**, dans un cadre défini (information, finalité, durée), à valider juridiquement.
3. **« Balance de position » remplacée** par un panneau de qualité de localisation : balises actives et batterie, précision mesurée lors de la dernière calibration, part des positions de qualité « précise / zone / approximative ». Le moteur pondère automatiquement GNSS et balises ; un curseur manuel ne peut pas produire une position fiable.
4. **Répartition par âge** : seulement si l'utilisateur a donné une tranche d'âge (facultative) ; afficher la part de réponses.
5. **Flux** : transitions réelles entre zones issues des trajectoires lissées (pas d'arcs artificiels) ; seuil d'anonymat appliqué.
6. **Replay** : rejoue des agrégats (densité, flux) et les incidents ; jamais de traversée de mur (même moteur que l'app).
7. **Mode crise et communication** : prévoir le fonctionnement dégradé (réseau saturé) et ne pas présenter ONEERA comme substitut aux moyens d'urgence.
8. **Groupes WhatsApp** : l'API WhatsApp Business ne permet pas d'écrire dans des groupes ordinaires ; à concevoir avec une solution conforme (canaux, listes de diffusion, ou SMS/push) — à valider.
