# Format d'intégration d'un lieu (`VenueDef`)

Un nouvel établissement s'intègre en décrivant son plan dans un repère local métrique (mètres), puis en le géoréférençant. Le même fichier alimente le moteur de localisation, les itinéraires, la carte affichée et les zones du dashboard. Type de référence : `packages/positioning/src/venue.ts`.

## Couches (séparées, comme exigé par la recette V1)

| Couche | Rôle | Remarque |
|---|---|---|
| `walkable` | Surfaces praticables par le public | Union de polygones |
| `obstacles` | Bar, scène, piliers, mobilier fixe | Retirés du praticable |
| `walls` | Murs, cloisons, garde-corps | Segments ; **les portes sont des ouvertures** |
| `zones` | Zones fonctionnelles (bar, dancefloor, VIP…), capacité | Indépendantes du praticable ; `restricted: true` = jamais de position visiteur |
| `indoor` | Emprise couverte | Le GNSS y est fortement dégradé |
| `portals` | Escaliers / ascenseurs entre étages | Seuls passages entre étages |
| `beacons` | Balises (iBeacon UUID:Major:Minor), position, étage, puissance à 1 m | Puissance recalée par la calibration |
| `georef` | Origine WGS84 + rotation | Relie GNSS et plan |

## Procédure d'intégration

1. **Plan coté** : obtenir un plan à l'échelle (et l'autorisation de l'utiliser — certains plans appartiennent à des tiers).
2. **Saisie** des couches dans l'éditeur (dashboard, à venir) ou en JSON.
3. **Géoréférence** : relever 3 points identifiables au GNSS en extérieur (angles du bâtiment) ; en déduire origine et rotation.
4. **Pose des balises** : ~1 balise / 50–80 m², 2,5–4 m de hauteur, au moins une par salle fermée et par escalier, plus dense sur les zones de foule ; noter Minor ↔ position.
5. **Calibration radio** (~1 h, lieu vide) : `docs/positioning/field-protocol.md` §2.
6. **Validation** : sessions S1–S6 du protocole ; la carte n'est publiée qu'une fois les seuils atteints.
7. **Publication** d'une version de carte (immuable) ; toute modification crée une nouvelle version.
