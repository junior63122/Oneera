# Prototype cliquable ONEERA

Démonstration interactive de la V2 au Bal des Fous. Elle regroupe trois vues :

- l'app visiteur ;
- l'app staff (sécurité, barman) ;
- le tableau de bord organisateur (festival et club).

Les trois vues partagent le même état : un signalement visiteur arrive chez l'agent et l'organisateur, et une rupture déclarée au bar s'affiche dans la carte des boissons.

Ce n'est pas l'app de production. Les données sont fictives. L'installation, la connexion Apple/Google, les SMS et les fenêtres système sont simulés.

## Construire

```bash
python3 prototype/build.py   # produit prototype/dist/index.html (page publiée) et local.html (test local)
python3 -m http.server 8090 --bind 127.0.0.1 --directory prototype/dist
```

Les visuels sont lus dans `private/prototype-assets/` (non versionné) : plan, avatars, icônes 3D issus des fichiers ONEERA. Leurs droits doivent être vérifiés avant toute diffusion publique. Pour utiliser un autre dossier, définir la variable `ONEERA_ASSETS`.

## Tests (Playwright)

| Script | Ce qu'il vérifie |
|---|---|
| `test/flow2.js <dossier> ios\|android` | Parcours QR → carte, captures de chaque étape, chrono et nombre de touches |
| `test/scen.js` | 14 vérifications du scénario multi-rôles : alerte visiteur → agent → retour visiteur, rupture bar, diffusion orga, itinéraire hors VIP, remise à zéro, fuites, mobile plein écran, fenêtre réduite |
| `test/crawl2.js` | Clique chaque élément de chaque écran (≈ 1 700 clics) : erreurs JS, images cassées, débordements, boutons sans effet |
| `test/gallery2.js` | Captures de tous les écrans pour relecture visuelle |

## Structure

| Fichier | Contenu |
|---|---|
| `src/data.js` | Événement, lieux, menus, amis, staff, zones, graphe des allées |
| `src/core.js` | État partagé, chiffres communs, itinéraires A*, feuilles, fenêtres système |
| `src/map.js` | Moteur de carte : pan, pinch, inertie, clusters, itinéraire |
| `src/onboard.js` | Parcours d'arrivée et éditeur d'avatar |
| `src/visitor.js` | App visiteur |
| `src/staff.js` | App staff |
| `src/dash.js` | Tableau de bord |
| `src/app.js` | Coque du téléphone et panneau de démo |
