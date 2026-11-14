# Protocole de mesure terrain (métrologie de la localisation)

But : obtenir des chiffres **mesurés** (et non promis) d'erreur, de stabilité et d'honnêteté de la confiance, dans un lieu réel. Aucun seuil de `docs/validation-grid.md` n'est levé sans ce protocole.

## 0. Test préalable de l'app V1 actuelle (30 min, optionnel mais utile)

Sur 1 iPhone et 1 Android, dans un lieu équipé :
1. Noter la version installée depuis l'App Store / Google Play.
2. Avec l'app nRF Connect (Android) : relever pour 5 balises le format émis (**iBeacon ou Eddystone**), l'UUID/namespace, l'intervalle et la puissance. Hypothèse à confirmer : les balises sont en Eddystone, donc invisibles pour CoreLocation sur iOS.
3. Marcher le parcours de contrôle (§3) avec l'app V1 ouverte et filmer l'écran : compter les sauts et traversées de murs.

## 1. Matériel

- Balises d'un modèle unique, configurées en **iBeacon** (UUID ONEERA, Major = lieu, Minor = balise), intervalle 200 ms, puissance réglée identique ; inventaire (Minor ↔ position mesurée au mètre ruban ou sur plan coté).
- 3 téléphones minimum : iPhone récent, Android milieu de gamme, Android ancien.
- App ONEERA « Mesure » (build interne) : enregistre BLE brut, GNSS, accéléromètre, gyroscope, magnétomètre, baromètre, et les **marqueurs de vérité** (tap « je suis au point Pn »).
- 20 à 40 **points de contrôle** marqués au sol (ruban adhésif numéroté), coordonnées relevées sur le plan coté.

## 2. Calibration radio (lieu vide, ~1 h)

Parcourir une grille de 2–3 m, pause de 10 s par point en tournant sur soi (4 orientations). L'outil produit `calibration.json` (échantillons `CalibrationSample`), ingéré par `RadioMap.calibrate`.

## 3. Sessions de mesure

| Session | Conditions | Durée |
|---|---|---|
| S1 | lieu vide, marche continue entre points | 20 min |
| S2 | lieu vide, arrêts de 30 s aux points | 20 min |
| S3 | soirée, affluence moyenne | 30 min |
| S4 | soirée, affluence forte (dancefloor plein) | 30 min |
| S5 | téléphone en poche / en main / écran éteint | 3 × 10 min |
| S6 | transitions intérieur ↔ extérieur et changements d'étage | 15 min |

À chaque point : tap de vérité. Les sessions sont **rejouées hors ligne** dans le banc (`packages/simulator`) avec exactement le moteur embarqué.

## 4. Indicateurs calculés

Erreur médiane / P90 / P95 aux points de contrôle, bonne zone, bon étage, part de vérité dans r68, sauts et traversées de mur de l'avatar affiché, réacquisitions, délai de première position, CPU et batterie. Résultats par téléphone, par session, par niveau de foule.

## 5. Règles

- Ne jamais ajuster les paramètres sur les mêmes données que celles qui servent à valider : une session d'apprentissage, des sessions de validation distinctes.
- Publier les résultats bruts (anonymisés) avec la version exacte du moteur.
- Si un seuil n'est pas tenu : en donner la cause mesurée (densité de balises, zone non couverte, téléphone) et la correction proposée (balises supplémentaires, repositionnement, recalibration).
