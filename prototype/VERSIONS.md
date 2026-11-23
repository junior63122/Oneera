# Versions du prototype

Chaque version publiée est conservée de trois façons :
1. le commit Git qui contient le code source (`prototype/src`) ;
2. la page construite, dans `prototype/versions/vN.html` (sans les visuels, qui restent dans `private/prototype-assets`) ;
3. l'historique de versions de la page publiée sur claude.ai.

## Revenir à une version

```bash
git checkout <commit> -- prototype/src   # restaure le code de cette version
python3 prototype/build.py               # reconstruit la page
```

| Version | Date | Commit | Page publiée | Contenu |
|---|---|---|---|---|
| v1 | 23/11/2026 | 5e6ebb2 | artefact 6iHN9LopoY9aSvGAekYj9V, version 1 | App visiteur (parcours QR → carte), staff, tableau de bord, 1 681 clics testés |
| v2 | 23/11/2026 | e840808 | artefact 6iHN9LopoY9aSvGAekYj9V, version 2 | Créateur d'avatar paramétrique, multi-lieux (Bisous Bisous 2 niveaux, Selva), 7 modèles d'événement (place, famille, relais hors réseau, tente, billet + cashless), rapport de soirée, thème sombre, anglais partiel |
| v3 | 23/11/2026 | (ce commit) | artefact 6iHN9LopoY9aSvGAekYj9V, version 3 | 25 correctifs de revue QA : staff et bars génériques par lieu, horaires d'ouverture dans les chiffres, notifications périmées retirées, brouillon d'avatar annulé, contrastes du thème sombre, français par défaut, tente par lieu ; 2 346 clics testés, 0 erreur JS |
