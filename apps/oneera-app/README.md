# ONEERA — app de démonstration (iOS / Android)

Version installable du prototype ONEERA (carte, amis, avatars, SOS, programme…), **embarquée hors ligne** dans une app native.
Les positions et les amis sont **simulés** : cette version sert à montrer et tester l'expérience sur un vrai téléphone, sans balises.
La vraie localisation (balises, capteurs) viendra avec l'app de production (`packages/positioning`).

## Mettre à jour le contenu

```bash
python3 ../../prototype/build.py   # si le prototype a changé (sources dans prototype/src)
node scripts/sync-web.mjs          # copie prototype/dist dans web/ et régénère webManifest.ts
```

## Publier sur TestFlight (iPhone)

Prérequis (décisions et comptes du propriétaire d'ONEERA) :
1. **Apple Developer Program** (99 €/an), idéalement au nom d'ONEERA SAS.
2. **Compte Expo** gratuit (https://expo.dev), pour la compilation dans le cloud (pas besoin de Mac).

Sur n'importe quel ordinateur avec Node 20+ :

```bash
git clone <dépôt> && cd Oneera && pnpm install          # ou npm install dans apps/oneera-app
cd apps/oneera-app
npx eas-cli login                                       # compte Expo
npx eas-cli build --platform ios --profile production   # se connecte à Apple, crée les certificats, compile (~15–25 min)
npx eas-cli submit --platform ios --latest              # envoie la compilation vers App Store Connect / TestFlight
```

Puis dans App Store Connect → l'app « ONEERA » → **TestFlight** → ajouter ses adresses comme **testeurs internes**
(jusqu'à 100, sans revue Apple). Sur l'iPhone : installer l'app **TestFlight**, accepter l'invitation, installer ONEERA.

Pour des testeurs externes (clients, partenaires), Apple fait une courte revue « bêta » de la compilation.

## Android

`npx eas-cli build --platform android --profile preview` produit un fichier APK installable directement.
