# Versions et retour en arrière

Chaque version d'ONEERA est sauvegardée à **trois endroits indépendants**. En cas de souci, on peut revenir à n'importe laquelle.

## 1. Où sont les versions

| Endroit | Ce qu'il contient | Comment le voir |
|---|---|---|
| **Étiquettes GitHub** (`prototype-v…`, `app-build-…`) | Le code complet de chaque version, figé | GitHub › dépôt `oneera` › **Tags**. Chaque étiquette se télécharge en `.zip`. |
| **`prototype/versions/vN.html`** | La page complète de l'app à chaque version, utilisable telle quelle | Ouvrir le fichier dans un navigateur |
| **Archive complète** (`.bundle`) | Tout l'historique du code, toutes versions comprises | Fichier envoyé par Claude, à garder sur ton ordinateur ou ton Drive |

Les builds TestFlight correspondent exactement à une étiquette `app-build-N`. C'est Expo qui a enregistré le code utilisé pour chaque compilation.

| Build iOS | Étiquette | Date | Contenu principal |
|---|---|---|---|
| 100 | `app-build-100` | 26/11 | Première compilation rattachée à l'app ONEERA |
| 101 | `app-build-101` | 26/11 | Passage à Expo 58 |
| 102 | `app-build-102` | 26/11 | Version réelle : comptes, amis, positions |
| 103 | `app-build-103` | 26/11 | Messagerie, notifications, récap |
| 104 | `app-build-104` | 26/11 | Avatar vivant, export des données |
| 105 | `app-build-105` | 27/11 | Portail d'entrée, carte « vue des Dieux » |
| 106 | `app-build-106` | 27/11 | Costumes femme / homme, recherche, nuages |

Les versions du prototype (`prototype-v1` à `prototype-v14`) sont décrites ligne par ligne dans `prototype/VERSIONS.md`.

## 2. Revenir en arrière

### Sur ton iPhone (le plus simple)

TestFlight garde les anciens builds pendant 90 jours :
1. Ouvre TestFlight.
2. Va dans ONEERA, puis **Versions et builds précédents**.
3. Installe le build voulu.

Rien à recompiler.

### Republier une ancienne version pour tous les testeurs

Il suffit de me le demander, par exemple : « reviens au build 105 ». Je recompile alors le code de l'étiquette `app-build-105` avec un nouveau numéro de build, puis je l'envoie à TestFlight.

Pour un développeur :

```bash
git checkout -b retour-105 app-build-105
```

Ensuite, monter `buildNumber` dans `apps/oneera-app/app.json`, puis lancer la compilation EAS habituelle.

### Le serveur (Render)

Dans Render, ouvre le service ONEERA, puis **Deploys**, puis **Rollback** sur un déploiement précédent.

La base de données ne recule pas : les migrations ne font qu'ajouter des tables et des colonnes. Un ancien serveur fonctionne donc avec la base actuelle.

### Voir une ancienne version sans rien installer

Ouvre `prototype/versions/vN.html` dans un navigateur.

## 3. Créer une nouvelle version

Après que **tous les tests passent** :

```bash
prototype/test/run-all.sh /tmp/essai   # toute la batterie de tests
scripts/nouvelle-version.sh v15 "Résumé de la version" 107
```

Le script fait quatre choses :
1. Il copie la page dans `prototype/versions/`.
2. Il pose les étiquettes.
3. Il les envoie sur GitHub.
4. Il fabrique une archive complète dans `../oneera-backups/`.

Il refuse de travailler s'il reste des changements non enregistrés, ou si la version existe déjà.

## 4. Règles

- On ne supprime **jamais** une étiquette ni une ancienne version.
- Une version n'est créée que si la batterie de tests est verte.
- L'archive `.bundle` se restaure avec :

  ```bash
  git clone oneera-vXX.bundle oneera
  ```

  On obtient tout l'historique, même sans GitHub.
