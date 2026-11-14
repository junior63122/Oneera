# ONEERA Mesure (app interne de métrologie terrain)

Enregistre, pendant une session du protocole (`docs/positioning/field-protocol.md`), les balises iBeacon, le GNSS, les pas, le cap, le baromètre et l'activité, ainsi que les **points de vérité** touchés par l'opérateur. Produit un fichier `.jsonl` (format `oneera-session`) que l'on rejoue dans le banc :

```bash
cd packages/simulator
npx tsx src/replay.ts session.jsonl ../../examples/test-club.venue.json [calibration.json]
```

## État de vérification

| Partie | Statut |
|---|---|
| Cœur (fenêtrage BLE, conversions, écriture de session, immobilité, pack) | ✅ 6 tests unitaires |
| Interface, branchement capteurs, wrapper du module natif (TypeScript) | ✅ typage OK, bundles JS iOS et Android construits par Metro |
| Module natif iBeacon — Swift (iOS) et Kotlin (Android) | ⚠️ **écrit mais jamais compilé** : pas de Xcode ni de SDK Android dans l'environnement de développement. À compiler et tester sur appareil. |
| Fonctionnement sur téléphone réel | ❌ non testé |

## Compiler sur un téléphone

Il faut l'une de ces options (décision et comptes à votre nom) :

- **EAS Build (Expo, cloud)** : compte Expo ; pour iOS, compte Apple Developer (99 $/an) pour installer via TestFlight ou en interne.
  ```bash
  cd apps/field-recorder
  npx expo prebuild        # génère ios/ et android/ en intégrant modules/oneera-beacons
  npx eas build --profile development --platform android   # puis ios
  ```
- **Local** : un Mac avec Xcode (iOS) et/ou Android Studio (Android), puis `npx expo run:ios --device` / `npx expo run:android --device`.

Android est le plus simple pour un premier essai : un APK de développement s'installe directement, sans compte payant.

## Utilisation

1. Préparer les balises (`docs/positioning/beacon-setup.md`) et marquer les points de contrôle au sol.
2. Charger le pack du lieu (URL fournie), choisir la session (S1…S6) et l'affluence.
3. « Démarrer la mesure » : les permissions sont demandées à ce moment-là.
4. Marcher ; toucher le bouton du point **quand on est dessus**. Surveiller « Balises vues » (orange si < 3).
5. « Terminer et enregistrer », puis « Partager le fichier ».

Le pack d'exemple (`assets/test-club.pack.json`) correspond au club synthétique : **remplacer l'UUID d'exemple** par l'UUID réellement configuré dans les balises.
