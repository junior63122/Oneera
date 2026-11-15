# App ONEERA V1 — inventaire fonctionnel d'après les captures (15/11/2026)

Source : 51 captures d'écran de l'app iOS publiée et exports du Figma (app + web). Aucun code V1 consulté. Les noms, photos et coordonnées personnelles visibles sur les captures ne sont pas reproduits ici.

## Identité visuelle (à conserver en V2)

- Thème clair pastel : ciel rose → lavande → bleu avec nuages ; cartes blanches arrondies ; bouton principal bleu pervenche.
- Plans de lieux illustrés en **2,5D isométrique** (festival, club), avatars posés sur le plan.
- **Avatars 3D personnalisables** sur socle rose.
- **Icônes 3D** pour les POI (~49 : bar, DJ, toilettes, secours, défibrillateur, consigne, cashless, entrée/sortie, staff, sécurité, etc.).
- Barre de navigation flottante : Recherche · [Map · Amis · Chat · Config] · avatar. Variantes staff : Map · Alertes · Équipe · Staff (rôles Admin / Manager / Staff).
- Dashboard « Centre de contrôle » : menu latéral (Vue globale, Scènes, Programmation, Map, Utilisateurs, Organisateurs, Artistes/Activités, Partenaires, Équipe, Incidents, Communication, Replay) et panneaux flottants sur le plan (Alertes, Distribution staff, Programmation, Répartition par âge, Affluence, Répartition par zone, Paramètres de lecture). Variante sombre (club).

## Fonctionnalités visiteur observées

| Domaine | Fonction observée | Note V2 |
|---|---|---|
| Découverte | Carte régionale des événements (pins), bascule Carte/Liste, cartes « Événements à venir », favoris | Conserver |
| Notifications | Demandes d'ami, ami accepté, récap disponible, localisation désactivée (avec lien Réglages), position partagée, filtres (Tout, Live, Autour de moi, Amis, Événement) | Conserver, dédoublonner |
| Amis | Liste, recherche, suggestions (« amis en commun »), profil (Inviter ici, Écrire, Partager), Bloquer, Signaler, Supprimer | Conserver ; ajout par QR |
| Chat | Discussions, accès aux contacts (opt-in) | Conserver |
| Profil / réglages | Modifier profil, avatar, historique d'événements, mes signalements, notifications, ma localisation, autorisations détaillées, bloqués, CGU / confidentialité | Conserver |
| Autorisations | Localisation, Bluetooth, Activité/pas, Appareil photo, Micro, Notifications, Presse-papiers, Contacts, Photos — chacune expliquée | Conserver, demander au moment utile |
| Partage de position | Toujours / Temporairement (1 h, 3 h, jusqu'à la fin) / Désactiver ; Mes amis / Mes amis sauf… / Seulement ces amis ; « Afficher lorsque je suis en ligne » | Conserver ; ajouter arrêt immédiat visible et état actif |
| Carte d'événement | Plan isométrique, avatars, Zones / Récap / Replay | Ajouter rayon de précision, ancienneté, étages |
| Zones fréquentées | Horaires, % mobile/statique, arrêt moyen, temps et visites par zone, « Localiser » | Recalculer à partir des trajectoires lissées |
| Récap | Temps sur place, zones visitées, distance, zone la plus visitée, pas, arrêts fréquents, entrée/sortie, temps immobile, répartition d'activité, partage | Corriger les incohérences (ci-dessous) |
| Replay personnel | Timeline, lecture, vitesse, panneau de stats | Rejouer les trajectoires lissées (pas de traversée de mur) |
| Avatar | Tenue (haut, bas, chaussures, ensembles), couleurs, accessoires (lunettes, chapeaux, bijoux), peau, coiffure, expressions, barbe ; écran d'incitation | Conserver (droits des assets à vérifier) |
| Compte | E-mail, téléphone, mot de passe, formulaire d'aide, télécharger les données, suppression de compte, déconnexion | Conserver |
| Signalement | Danger, Médical, Affluence, Technique, Objet perdu/trouvé, Autre → « Alerte envoyée à l'équipe sécurité » | Ajouter rappel 112, envoi différé hors réseau |

## Défauts visibles sur les captures

1. **Récap incohérent** : « Nombre de pas 0 » avec une distance de 865 m ; heure de sortie (15 h 02) antérieure à l'heure d'entrée (18 h 03) ; « 14 % mobile » avec 1 h 08 immobile sur 1 h 19.
2. **Écran technique exposé** : « Balises BLE (47) — 5/47 détectées » visible en arrière-plan des réglages (outil de debug en production) ; distances par balise affichées au dixième de mètre.
3. **Libellés erronés** : le mot « Teufy » apparaît à certains endroits (nom affiché d'un compte dans les amis, suggestions et discussions). Il s'agit d'erreurs de nommage des développeurs : tout relève d'ONEERA. À renommer en V2.
4. Le profil réclame une **date de naissance complète et un numéro de téléphone** (minimisation RGPD à revoir : une tranche d'âge suffit pour les statistiques).
5. Texte placeholder « ???? » sur les événements à venir.

## Droits sur les visuels

Les avatars, icônes 3D, plans isométriques et maquettes Figma ont pu être produits par l'ancien prestataire ou des tiers : **vérifier la cession des droits avant toute réutilisation** dans la V2 (voir le point juridique du rapport n°1).
