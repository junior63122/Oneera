# Préparer les balises existantes (DX-SMART CP28) pour ONEERA V2

Objectif : vérifier, **sans aucun achat**, si le stock existant (~43 balises DX-SMART CP28) peut servir au pilote. Durée : ~1 h pour 5 balises.

## Pourquoi reconfigurer

Les balises posées en V1 émettaient en **Eddystone**. Sur iPhone, le service de localisation d'Apple (CoreLocation) ne détecte que les trames **iBeacon** dont l'UUID est connu de l'app. C'est l'explication la plus probable de « 4 balises sur 43 détectées ». Le CP28 sait émettre en iBeacon d'après sa fiche (plusieurs « slots » de trames).

## Paramètres cibles

| Paramètre | Valeur |
|---|---|
| Trame | **iBeacon** dans un slot, **Eddystone-TLM** dans un autre (batterie, facultatif) ; désactiver les autres slots |
| UUID | UUID unique ONEERA, identique pour toutes les balises (à générer une fois, ex. `uuidgen`, et noter dans l'inventaire) |
| Major | identifiant du lieu (ex. 1 = lieu pilote) |
| Minor | numéro de la balise (1, 2, 3…) — écrit au marqueur sur le boîtier |
| Intervalle d'émission | 200 ms (compromis précision / autonomie) |
| Puissance d'émission | identique sur toutes les balises, ≈ 0 dBm |
| « Measured power » (RSSI à 1 m) | laisser la valeur par défaut : la calibration terrain la corrige |
| Mot de passe de configuration | **le changer** (sinon n'importe qui à proximité peut reconfigurer la balise) et le conserver dans un gestionnaire de mots de passe, pas dans le Drive |

## Étapes

1. **Lire l'état actuel** : installer *nRF Connect for Mobile* (Nordic, gratuit) sur un Android. Scanner : chaque balise apparaît avec son type de trame. Noter ce qui est émis (Eddystone-UID/URL/TLM, iBeacon ?).
2. **Reconfigurer** avec l'application de configuration du fabricant (DX-SMART fournit une app dédiée ; référence exacte à prendre sur la notice ou l'étiquette — elle n'est pas dans le Drive). Appliquer les paramètres ci-dessus sur 5 balises.
3. **Vérifier sur Android** (nRF Connect) : la trame iBeacon apparaît avec le bon UUID / Major / Minor.
4. **Vérifier sur iPhone** : avec une app de lecture iBeacon gratuite de l'App Store dans laquelle on saisit l'UUID, ou avec l'app de mesure ONEERA dès qu'elle sera installable. Les 5 balises doivent apparaître, avec un RSSI qui varie quand on s'éloigne.
5. **Noter** pour chaque balise : Minor, niveau de pile si affiché, état physique.

## Verdict

- **5/5 détectées sur iPhone et Android** → le stock est réutilisable pour le pilote ; reconfigurer les ~38 autres.
- **Non reconfigurables, ou instables** (RSSI incohérent, coupures) → achat d'un lot homogène (voir les fourchettes de prix dans l'échange du 14/11 : ~10–15 € l'unité en entrée de gamme configurable).

## Points d'attention

- La fiche PDF indique « Do not install outdoors » pour le CP28 : en festival plein air, prévoir un boîtier ou un autre modèle IP67.
- Pose : 2,5 à 4 m de hauteur, à l'écart des surfaces métalliques et des enceintes, au moins une balise par salle fermée et par escalier.
