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
| v4 | 23/11/2026 | (ce commit) | artefact 6iHN9LopoY9aSvGAekYj9V, version 4 | Carte vivante : ciel et nuages autour du plan, jour/nuit automatique avec éclairages (scènes au tempo, lasers en club, bars, allées), foule animée selon l'affluence, passants, reflets sur l'eau, descente « vue des Dieux » à l'arrivée et transition entre lieux, ambulance animée vers l'alerte, feu d'artifice, flux animés au tableau de bord ; plans du club et de la Selva détourés ; 2 266 clics testés, 0 erreur JS |
| v5 | 24/11/2026 | (ce commit) | artefact 6iHN9LopoY9aSvGAekYj9V, version 5 | Exigences des documents appliquées (liste : `docs/exigences-qualite.md`) : rotation de la carte + boussole, vue 2D/3D inclinée, POI à l'échelle du zoom sans pastille chiffrée, reprise sur la carte à la réouverture, avatars superposés en éventail, bulles de messages et @mentions sur la carte, « Inviter un ami à me rejoindre ici », partage 15 min / 1 h / 3 h / fin avec « sauf… / seulement… », 3 choix SOS exacts + anti-spam, notifications exigées (Bluetooth, amis à proximité, signalement dans la zone, fin d'événement, « Revivez l'événement »), mode écran, profil éditable, suppression « SUPPRIMER », signaler un souci de l'app ; tableau de bord : création d'événement guidée, ajout réel de lieux et zones, balises rôle/rayon/action sans doublon, modération, relais d'alertes, admin plateforme, alertes automatiques, droits par rôle, export mailing opt-in ; staff : appel masqué et escalade |
| v5.1 | 24/11/2026 | (ce commit) | artefact 6iHN9LopoY9aSvGAekYj9V, version 6 | Revue des 50 écrans : caméra bornée au plan (plus de bordure de ciel), plans détourés sur une mer de nuages, carte allégée (une pastille, sans +/−/œil), repères de premier lancement, fiche ami simplifiée, libellés courts, bouton de démo discret |
