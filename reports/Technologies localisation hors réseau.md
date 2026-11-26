# Ajouter l'UWB aux balises, garder un réseau de secours

**Réponse courte.** En 2026, aucune technologie ne localise seule et de façon « irréprochable » tous les téléphones d'une foule très dense. L'architecture la plus crédible pour ONEERA a trois étages. Le socle reste BLE (balises iBeacon deux fois plus denses) avec PDR, baromètre et GNSS : il marche sur tous les téléphones. Au-dessus, des **ancres UWB en mode DL-TDoA** (le téléphone écoute, n'émet rien, donc pas de limite au nombre d'utilisateurs) donnent la précision sur les téléphones compatibles. Le tout tourne sur un **réseau de site** : serveur local, Wi-Fi de l'organisateur avec sa propre sortie internet, mémoire tampon sur chaque téléphone. En dernier recours, les téléphones ONEERA se relaient les positions par Bluetooth.

Nos simulations vont dans ce sens. Ce sont **des simulations, pas des mesures** :

| Situation simulée | BLE actuel | BLE + ancres UWB |
|---|---|---|
| Ami retrouvable à moins de 3 m, club plein | 53 % du temps | 94 % |
| Idem, foule compacte (4–6 pers./m²) | 19 % | 75 % |
| Erreur de la carte de chaleur, club plein | 40 % | 10 % |

Sans réseau mobile, le relais Bluetooth montre la position d'un ami vieille de **1,5 à 2 minutes en médiane**, contre 9 à 11 minutes sans relais. C'est un mode dégradé, pas du temps réel. Il y a quatre limites à dire clairement aux clients :

- La précision UWB ne concerne que les téléphones récents qui ouvrent cette fonction aux apps. Sur iPhone, cela reste à confirmer.
- iOS bride fortement le Bluetooth en arrière-plan.
- Les données organisateur ne couvrent que les visiteurs qui ont l'app et ont consenti. Pour extrapoler au public total, il faut un comptage de référence.
- Aucune ancre UWB n'a encore été mesurée en foule réelle, ni par nous ni dans les sources indépendantes trouvées.

Une offre premium (~50 k€) ne peut donc se vendre qu'après un pilote mesuré sur site, avec des seuils publiés.

## Seule l'UWB en mode DL-TDoA passe à l'échelle d'une foule avec une précision sub-métrique

### Ce que chaque technologie apporte vraiment

**Les balises BLE (mesure de la force du signal)** sont la seule technologie lisible par 100 % des téléphones. En foule, la littérature mesurée est sévère :

- La présence d'une foule fait varier le signal reçu jusqu'à **8,6 dB** et dégrade l'estimation de distance jusqu'à **41 %** ([Sensors](https://sindex.sdl.edu.sa/esploro/outputs/journalArticle/Using-Bluetooth-Low-Energy-for-positioning/9931310508331)).
- Un corps devant le téléphone retire 5 à 8 dB ([PMC5421664](https://pmc.ncbi.nlm.nih.gov/articles/PMC5421664)).
- Sur un salon réel, la méthode par empreintes radio passe à **~11 m (95ᵉ centile)** quand la foule arrive. Au-delà d'**une balise pour 40 m²**, ajouter des balises n'aide presque plus ([TU Dresden](https://fis.tu-dresden.de/portal/en/publications/trilateration-fingerprinting-and-centroid-taking-indoor-positioning-with-bluetooth-le-to-the-wild(3ec3129d-7353-49eb-b0e2-1d26884e1b54).html)).
- Les meilleures méthodes qui compensent l'effet des corps restent à **3,7–6,7 m à 90 %** ([U Calgary](https://ucalgary.scholaris.ca/server/api/core/bitstreams/9aa171df-28fd-4b19-92cb-9f905d44c1fb/content)).

Le moteur ONEERA actuel (filtre particulaire contraint par la carte) a été relancé avec une atténuation de foule aléatoire et variable dans le temps. **En simulation**, en club plein sur Android, il donne :

- médiane 2,0 m, P90 6,4 m, P95 9,6 m ;
- bonne zone 92 % du temps.

La cible interne est une bonne zone ≥ 93 % et un P95 ≤ 8 m. **Elle n'est pas atteinte avec le BLE seul** (`reports/positioning-sim.md`). Le cercle de confiance contient la vraie position 59–62 % du temps au lieu de 68 % : en foule, le moteur se croit un peu plus précis qu'il ne l'est.

**L'UWB en mode DL-TDoA** est la vraie nouveauté de 2026. Des ancres fixes émettent ; chaque téléphone se contente d'écouter et calcule lui-même sa position.

- **Android 17** l'expose publiquement dans son module de mesure de distance. Le mode est autorisé en arrière-plan avec la permission de localisation en arrière-plan, et c'est le seul mode de mesure de distance permis en arrière-plan aux apps tierces ([Android Developers](https://developer.android.com/develop/connectivity/ranging)).
- Le consortium FiRa affirme que ce mode supporte « un nombre illimité » de téléphones. C'est une affirmation du consortium, sans test indépendant trouvé ([FiRa](https://www.firaconsortium.org/resource-hub/blog/untracked-indoor-navigation)).
- **Côté Apple**, l'état est incertain. Un fournisseur d'ancres et un média spécialisé annoncent le DL-TDoA sur iPhone avec iOS 27 ([Estimote](https://estimote.com/dl-tdoa/), [MobileKnowledge](https://www.themobileknowledge.com/news/ios-27-brings-uwb-indoor-navigation-closer-to-commercial-reality/)). Mais un développeur décrit des échecs sur iPhone 16 Pro ([forum Qorvo](https://forum.qorvo.com/t/getting-dl-tdoa-working-with-ios-devices/26245)), et aucune documentation Apple n'a pu être lue.
- **Côté Android**, l'UWB n'est présent que sur le haut de gamme (Galaxy S26+ et Ultra, pas le S26 de base) ([liste Wikipedia](https://en.wikipedia.org/wiki/List_of_UWB-enabled_mobile_devices)). Aucun modèle n'est confirmé comme compatible DL-TDoA.
- **Sur la précision**, il n'existe que des annonces commerciales (« centimétrique » chez Eforthink, sans client nommé : [PR Newswire](https://www.prnewswire.com/news-releases/eforthink-launches-indoor-navigation-and-spatial-services-for-uwb-enabled-smartphones-302803804.html)). Le déploiement exige **au moins 4 ancres bien reçues en tout point** ([Cisco Spaces](https://spaces.cisco.com/beyond-connectivity-deploying-for-location-success/)). Les acteurs réunis au premier sommet européen de l'UWB jugent que les applications complètes arriveront « dans quelques années » ([Wi-Fi NOW](https://wifinowglobal.com/resources/uwb-in-action-october-29-the-year-of-indoor-navigation-inside-europes-first-uwb-summit/)).

**Les autres options ne conviennent pas à une foule de visiteurs :**

- **Bluetooth Channel Sounding.** Il mesure une distance d'un téléphone à un appareil connecté et appairé. Sur iOS 27, il ne marche qu'au premier plan, avec l'iPhone toujours à l'initiative ([Apple WWDC26](https://developer.apple.com/videos/play/wwdc2026/369/)). Sur Android, il ne marche aussi qu'au premier plan. Utile pour une flèche entre deux amis, pas pour une grille d'ancres.
- **Wi-Fi RTT.** Réservé à Android, environ 1,2 m en bureau ([IEEE/UCL](https://ieeexplore.ieee.org/abstract/document/9151400/)).
- **Bluetooth AoA/AoD.** Les téléphones ne savent pas en faire ([Nordic](https://www.nordicsemi.com/Products/Low-power-short-range-wireless/Direction-finding)).
- **Positionnement par le réseau 5G.** Aucune API n'est ouverte aux apps, et il dépend du réseau même qui sature ([3GPP](https://3gpp.org/technologies/nr-positioning-2)).
- **Positionnement visuel par la caméra (VPS).** Il faut la caméra levée et une connexion internet : inutilisable dans une foule ([ARCore](https://developers.google.com/ar/develop/java/geospatial/enable)).

**Le GNSS** reste un appoint en extérieur. Attendre **5–15 m** dans un canyon urbain comme Monaco : environ 10 m mesurés à Hong Kong même en bi-fréquence ([NAVI/ION](https://navi.ion.org/content/68/4/727)).

### Synthèse

| Technologie | Téléphones concernés | Arrière-plan | Précision : source et niveau | Passe à l'échelle d'une foule | Verdict ONEERA |
|---|---|---|---|---|---|
| BLE (force du signal) + PDR + baromètre | 100 % | Oui (avec limites iOS) | Mesuré : 3,7–11 m en foule. SIM : P95 9,6 m (dense) | Oui (téléphone passif) | **Socle conservé** |
| UWB DL-TDoA (ancres) | iPhone récents (API à confirmer), Android haut de gamme | Android : oui. iOS : inconnu | Fournisseurs : « cm ». SIM : 0,4–0,9 m médiane | Oui (téléphone passif) | **Couche précision / premium** |
| UWB téléphone à téléphone | Deux téléphones UWB | iOS : limité | SIM : gain faible (voir section suivante) | 1 session par paire | Option « flèche » |
| Channel Sounding | Pixel 9/10, iPhone 17 (puce N1), S26+ | Non (premier plan) | Labo : < 0,5–0,56 m | Non | Option « flèche » |
| Wi-Fi RTT | Android seulement | Non | Mesuré : ~1,2 m | Limité par le temps d'antenne | Écarté |
| GNSS bi-fréquence | ~100 % | Oui | Mesuré : ~5–15 m en ville | Oui | Appoint en extérieur |
| VPS, 5G, AoA/AoD | — | — | — | — | Écartés |

## La simulation « retrouver ses amis » : seules les ancres UWB atteignent ~90 % sous 3 m

Le banc `reports/friends-sim.md` mesure l'erreur du **vecteur « moi → ami »** affiché. C'est ce qui compte pour rejoindre quelqu'un. L'ami est dit « retrouvable » quand cette erreur est sous 3 m, distance à laquelle on se voit dans la foule.

Hypothèses du banc :

- un club de test synthétique, 20 balises (32 en version doublée), deux amis surtout sur le dancefloor, téléphones Android ;
- UWB modélisé avec un bruit d'environ 0,15 m en vue directe, plus un bruit gaussien de 0,2 m ;
- des corps qui bloquent le signal, d'autant plus souvent que la foule est dense et l'ancre loin ; un blocage allonge la distance mesurée (excès exponentiel) ou fait perdre la mesure ;
- l'ancre de référence du DL-TDoA est parfois masquée, ce qui fausse toutes les distances du même tour ;
- certains tours de mesure sont perdus ;
- **les ancres UWB sont placées au même endroit que les balises, à ~3,5 m de haut**, avec une portée utile de 25 m qui baisse en foule (`packages/simulator/src/world.ts`).

| Part du temps où l'ami est retrouvable à moins de 3 m (SIM) | Club plein | Devant de scène | Compact 4–6 pers./m² |
|---|---|---|---|
| BLE actuel | 53 % | 34 % | 19 % |
| BLE, 2× plus de balises | 69 % | 49 % | 28 % |
| BLE + recherche de précision UWB entre amis | 68 % | 46 % | 30 % |
| BLE + Channel Sounding entre amis | 60 % | 40 % | 26 % |
| **BLE + ancres UWB (DL-TDoA)** | **94 %** | **89 %** | **75 %** |
| BLE 2× + ancres UWB + UWB entre amis (premium) | 97 % | 88 % | 77 % |

Trois leçons en sortent.

**Le BLE seul s'effondre avec la densité.** En foule compacte, l'erreur moi → ami a une médiane de 6,9 m et un P90 de 13,6 m. Doubler les balises aide, mais ne change pas d'ordre de grandeur (5,4 m médiane). Cela rejoint la limite d'une balise pour 40 m² observée sur le terrain.

**La recherche de précision entre amis (UWB ou Channel Sounding) apporte peu.** Le banc ne l'active que si les deux amis sont à moins de 12 m avec l'app ouverte, soit **40–46 % du temps**. Elle n'améliore pas la position de base sur la carte. Elle sert l'expérience « flèche + distance » sur les derniers mètres. Elle n'est pas la solution du problème.

**Les ancres UWB sont le seul levier qui change d'échelle.** Médiane moi → ami 0,6 m en club plein, 1,6 m en foule compacte. Mais même la combinaison premium **n'atteint que 75–77 % sous 3 m** en foule compacte, avec un P90 d'environ 5 m.

Il ne faut donc pas promettre de façon générale de « retrouver son ami au mètre près devant la scène ». Ce chiffre reste aussi conditionné par trois inconnues terrain :

- la hauteur et le nombre d'ancres réellement visibles au-dessus d'une foule ;
- la part de téléphones capables de DL-TDoA ;
- le comportement iOS en arrière-plan.

## Sans réseau, le relais Bluetooth donne des positions vieilles de quelques minutes, pas du temps réel

### Pourquoi le réseau tombe

Les réseaux saturent d'abord **dans le sens montant (téléphone → antenne)**, même avec toutes les barres affichées. Une étude d'avril 2026 dans un stade mesure un écart sévère entre sens montant et descendant, avec des téléphones qui émettent près de leur puissance maximale ([arXiv 2604.04371](https://arxiv.org/pdf/2604.04371)). La demande grossit : +25 % de données à Glastonbury entre 2024 et 2025 malgré 11 antennes temporaires ([Vodafone](https://www.vodafone.co.uk/newscentre/press-release/mobile-data-usage-up-25percent-from-glastonbury-festival-2024/)). Monaco Telecom décrit le Grand Prix comme « parfois l'endroit le plus chargé du monde » en usage mobile (interview ancienne, [Digital Trends](https://www.digitaltrends.com/mobile/5g-in-monaco-with-huawei-interview/)). ONEERA ne peut ni acheter ni contractualiser la capacité des opérateurs.

### Ce qui ne marche pas entre téléphones

- **Bluetooth iOS en arrière-plan.** L'annonce Bluetooth d'une app iOS en arrière-plan est rangée dans une zone de débordement lisible uniquement par d'autres iPhone. Le balayage ralentit, et chaque réveil dispose d'environ 10 s ([Apple Core Bluetooth](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)). En 2020, les apps de traçage COVID ne fonctionnaient pas avec l'iPhone verrouillé ([BBB](https://bbbprograms.org/media-center/bd/insights/2020/07/09/caution-and-criticism-contact-tracing-through-mobile-apps)).
- **Wi-Fi Aware.** Il existe sur iOS 26, mais l'interopérabilité iPhone ↔ Android échoue dans les retours de développeurs, et il exige un appairage par code PIN ([forum Apple 790195](https://developer.apple.com/forums/thread/790195?page=2)).
- **Réseaux Localiser d'Apple et Find Hub de Google.** Ils sont fermés aux apps ([Apple](https://www.apple.com/newsroom/2021/04/apples-find-my-network-now-offers-new-third-party-finding-experiences/)).
- **Satellite.** Réservé à des apps autorisées, aux États-Unis ([GSMArena](https://www.gsmarena.com/tmobile_expands_tsatellite_support_to_thirdparty_apps-news-69782.php)).
- **LoRa (Meshtastic).** Il a fait ses preuves à Burning Man (~1 200 boîtiers, 28 000 messages par jour) ([Burning Man Innovate](https://innovate.burningman.org/showcase/mesh-messaging-without-wifi-internet-with-burningmesh/)), mais chaque personne doit porter un boîtier. Réservé au staff.
- **SDK commerciaux.** Ditto ne promet qu'une synchronisation en arrière-plan iOS « au mieux » ([Ditto FAQ](https://docs.ditto.live/home/faq)). Bridgefy a eu des failles graves en 2020–2021 ([Royal Holloway](https://royalholloway.ac.uk/about-us/news/royal-holloway-cryptographers-urge-caution-over-use-of-secure-messaging-app)).

### Ce que donne la simulation du relais

Le banc `reports/mesh-sim.md` (**simulation**) modélise :

- un festival de 200 × 120 m, 10 000 personnes, 4 pers./m² devant la scène ;
- 40 % d'iPhone, des groupes de 4 amis, 40 minutes sans aucun réseau ;
- une portée téléphone ↔ téléphone de 5,8 à 11,3 m selon la densité ;
- une connexion à un voisin toutes les ~10 s ;
- les restrictions iOS : un iPhone en arrière-plan est invisible pour un Android, et balaie lentement.

| Part du public avec l'app (SIM) | Mode | Âge médian / P90 de la position de l'ami | Vue il y a ≤ 5 min | Jamais reçue |
|---|---|---|---|---|
| 5 % | sans relais | 9,0 / 26,5 min | 31 % | 17 % |
| 5 % | **relais** | **2,0 / 4,5 min** | **93 %** | 0 % |
| 15 % | **relais** | **1,5 / 3,0 min** | **99 %** | 0 % |
| 30 % | **relais** | **1,5 / 3,0 min** | **100 %** | 0 % |

Le relais transforme une absence d'information en position vieille de 1,5 à 3 minutes, dès 5 % de pénétration. Mais c'est un **mode dégradé** : l'interface doit afficher « vu il y a 2 min près de la scène B (relayé) », jamais un point présenté comme actuel.

Le modèle reste optimiste sur trois points :

- iOS : en 2026, un fil de forum signale encore une communication Bluetooth cassée sur iPhone 17 ([forum Apple 815922](https://developer.apple.com/forums/thread/815922)) ;
- la portée réelle en foule n'a jamais été mesurée ;
- la batterie n'est pas modélisée.

### La vraie parade : un réseau de site

Le **réseau de site** est la seule solution qui rend le temps réel quand la 4G tombe : un serveur local, sur le Wi-Fi ou le réseau de production et de paiement sans contact de l'organisateur, avec sa propre sortie internet. Le schéma est éprouvé :

- Starlink avec routeurs de bonding Peplink à l'EDC Las Vegas ([Peplink](https://www.peplink.com/case-studies/edc-las-vegas-festivalgoers-feast-on-peplink-and-starlink-connectivity/)) ;
- agrégation de cartes SIM de plusieurs opérateurs : 24 SIM dans un cas documenté ([Speedify](https://speedify.com/blog/better-internet-anywhere/provide-guest-wi-fi-at-an-event-without-dropouts/)).

Le test de charge interne montre qu'**une seule machine** tient 5 000 clients avec une latence p95 de 113 ms. Le p99 atteint 982 ms, et la mesure exclut le réseau radio (`reports/realtime-load.md`). La passerelle existante peut donc tourner telle quelle sur un serveur local.

## Les données organisateur sont bonnes par zone dès le BLE ; la carte de chaleur fine exige l'UWB et une mémoire tampon

Le banc `reports/app-sim.md` (**simulation** : 24 visiteurs équipés pendant 25 minutes, Android, coupure réseau de 8 minutes) mesure ce que l'organisateur achète.

| Indicateur (SIM) | BLE actuel, club plein | BLE + UWB, club plein | BLE actuel, compact | BLE 2× + UWB, compact |
|---|---|---|---|---|
| Position médiane / P95 | 2,0 / 5,8 m | 0,4 / 1,8 m | 3,6 / 12,6 m | 0,8 / 4,9 m |
| Bonne zone | 98 % | 99 % | 93 % | 98 % |
| Sauts > 3 m / murs traversés par heure | 1 / 1 | 1 / 1 | **19 / 13** | 4 / 5 |
| Carte de chaleur : erreur à 2 m (lissée) / à 4 m (brute) | 40 % / 44 % | **10 % / 11 %** | 51 % / 59 % | 19 % / 21 % |
| Occupation par zone, erreur médiane / P90 | 0 % / 2 % | 0 % / 1 % | 3 % / **23 %** | 1 % / 8 % |
| Flux entre zones : précision / rappel | 96 % / 97 % | 99 % / 99 % | 73 % / 90 % | 97 % / 95 % |
| Temps passé (erreur médiane) | 0 % | 0 % | 1 % | 1 % |
| Complétude sans / avec mémoire tampon | 68 % / 100 % | 68 % / 100 % | 68 % / 100 % | 68 % / 100 % |

(La colonne « BLE + UWB, club plein » correspond à la solution BLE 2× + ancres UWB du banc.)

**Attention aux deux colonnes de carte de chaleur.** La valeur « 2 m » utilise des cellules de 2 m lissées sur 3 × 3 cellules. La valeur « 4 m » utilise des cellules de 4 m sans lissage. **Les deux ne se comparent pas directement.** Le texte du rapport de banc parle d'un « lissage 3 m », ce qui décrit mal le calcul (`packages/simulator/src/crowdflow.ts`).

Ce qu'on en tire :

- **Occupation par zone, temps passé et flux** sont déjà justes en club plein avec le BLE actuel. C'est cohérent avec 98 % de bonne zone.
- **En foule compacte**, le BLE seul dégrade l'occupation (P90 23 %) et la précision des flux (73 %).
- **La carte de chaleur fine** est l'indicateur le plus exigeant. Seule l'UWB la ramène à ~10 % d'erreur.
- **La mémoire tampon est indispensable.** Sans elle, une coupure de 8 minutes ampute un tiers des minutes de la soirée. Avec elle, les données sont complètes.
- **Un point à corriger dans le code.** Le banc de précision compte 0 traversée de mur, mais le banc complet en compte 13 par heure en foule compacte (BLE). Ce n'est probablement pas la même métrique d'affichage, mais l'écart doit être expliqué avant toute revendication de fluidité.

Toutes ces mesures portent **sur les seuls visiteurs équipés**. Une offre « précise et complète » ne peut pas promettre de compter le public total sans **comptage de référence** (entrées, billetterie) et sans afficher le taux de couverture. Les retours d'expérience sont anciens et viennent des fournisseurs : 60 % de téléchargement de l'app en festival, consentement aux balises « jusqu'à 80 % » quand on le demande à l'inscription ([Eventbrite/Aloompa](https://www.eventbrite.com/blog/?p=15961)) ; 86 % de téléchargement à Bonnaroo mais 20 % d'engagement ([MediaPost](https://www.mediapost.com/publications/article/243639/beaconing-at-bonnaroo-the-lessons-learned.html)). Ce sont des signaux, pas des garanties.

## Architecture recommandée, coûts et règles à respecter

### Les couches

| Couche | Contenu | Ce qu'on garde du code actuel | Ce qu'il faut ajouter |
|---|---|---|---|
| 1. Téléphone, pour tous | Carte du lieu embarquée, moteur BLE + PDR + baromètre + GNSS, cadence 1–2 s en mouvement / 10 s à l'arrêt, file d'envoi chiffrée | Filtre particulaire, affichage sans téléportation, classificateur marche/danse, politique d'envoi (D-021), rayon de confiance recalibré | Mémoire tampon horodatée avec envoi différé ; correction du compteur de murs |
| 2. Précision (premium) | Ancres UWB DL-TDoA en hauteur (structures, éclairage), ≥ 4 visibles partout ; module natif Android 17 (Ranging, rôle `DT_TAG`) et iOS 27 (Nearby Interaction, à valider) | `updateRanges` du moteur déjà branché en simulation | Modules natifs, détection de compatibilité par téléphone, outil de pose et de relevé des ancres |
| 3. Infrastructure BLE | Balises iBeacon densifiées, au plus ~1 pour 40 m² | Stock de ~43 DX-SMART CP28 (après le test 5/5), calibration terrain obligatoire (D-006) | Boîtiers IP67 en extérieur : le CP28 n'est pas prévu pour l'extérieur |
| 4. Réseau de site | Serveur local (passerelle + PostgreSQL) sur le réseau de l'organisateur, sortie Starlink + SIM agrégées, adresse IP ou DNS local fixe, « mode local » dans l'app, resynchronisation vers le cloud | Passerelle WebSocket, RLS, présence et battement de cœur | Bus Redis multi-instances, déploiement sur serveur local, réconciliation « dernière écriture gagne » |
| 5. Relais entre téléphones | Gossip Bluetooth de positions chiffrées de bout en bout et signées, identifiants tournants, durée de vie limitée ; affichage de l'âge | — | Couche native iOS/Android (développer en interne ou utiliser Ditto) ; clés de groupe échangées tant que le réseau marche |
| 6. Données organisateur | Agrégats k ≥ 5, couverture et comptage de référence, calcul possible sur le serveur local | Schéma `zone_occupancy` / `flow_od`, D-011 | Ingestion du comptage d'entrées, redressement statistique |
| Option | Flèche UWB ou Channel Sounding entre amis au premier plan ; LoRa pour le staff | — | Après le pilote |

Les couches 1 et 3 fondent l'offre de base. Les couches 2 et 4 font l'offre premium. La couche 5 est le filet de sécurité.

### Coûts

Le coût **ne peut pas encore être chiffré** sans devis. Seuls les composants ont un prix public :

- **Module UWB Qorvo DWM3001C** : 43–59 $ l'unité selon la quantité ([Qorvo](https://store.qorvo.com/ProductDetail/DWM3001C-Qorvo/692453/)). Aucun prix public n'existe pour une ancre finie (Estimote, Eforthink, Cisco).
- **Location de Wi-Fi événementiel aux États-Unis** : 995 à 2 795 $ par jour pour 50 à 150 utilisateurs ([Verizon/CES](https://www.verizon.com/business/answers/how-much-is-business-internet/)).
- **Agrégation de liens** : logiciel Speedify à 89,99 $ par an ; boîtiers matériels de ~1 k$ à 5–10 k$ ([Speedify](https://speedify.com/blog/enterprise-internet-bonding-software/can-i-use-starlink-internet-at-events-yes-with-speedify/amp/)).
- **Balises d'entrée de gamme** : ~10–15 € l'unité (échange interne du 14/11, non sourcé publiquement).

**Estimation non sourcée, à confirmer par devis.** Une ancre finie (boîtier, alimentation, synchronisation) coûterait probablement quelques centaines d'euros. Un club de 1 000–2 000 m² avec 20–40 ancres représenterait alors de l'ordre de **4–15 k€ de matériel réutilisable**. Il faut ajouter la pose, la calibration et un kit de site à « quelques milliers d'euros par événement ». C'est compatible avec une offre à ~50 k€, mais **la main-d'œuvre et la durée d'installation restent inconnues**.

Au Grand Prix de Monaco, couvrir tout le circuit en UWB n'est pas réaliste. Il faut cibler les tribunes, les espaces d'hospitalité et la fan zone, et accepter ailleurs le BLE + GNSS (5–15 m).

### Réglementation

**UWB fixe en extérieur.** La décision d'exécution **(UE) 2024/1467** crée une catégorie spécifique pour les infrastructures fixes de localisation en extérieur dans la bande 6–8,5 GHz, à −41,3 dBm/MHz ([EUR-Lex](https://eur-lex.europa.eu/eli/dec_impl/2024/1467/oj)). Le projet CEPT prévoyait aussi une hauteur ≤ 10 m, un contrôle en réseau et des limites de temps d'émission : à vérifier dans le texte final ([CEPT](https://docdb.cept.org/download/4503)). L'ARCEP a consulté sur la transposition en France ([ARCEP](https://arcep.fr/uploads/tx_gspublication/consultation-projdec-frequences-UWB_dec2024.pdf)).

**Fréquences à Monaco.** Monaco n'est pas dans l'UE. Toute radio installée doit être coordonnée avec la **DPRN**, qui a géré ~750 fréquences avec l'ANFR pour le Grand Prix 2026 ([Hello Monaco](https://www.hellomonaco.com/news/latest-news/750-frequencies-zero-margin-for-error-how-monaco-protects-grand-prix-communications/)).

**Données personnelles en France.** S'appliquent :

- la recommandation CNIL 2026 sur les données de localisation ([CNIL](https://cnil.fr/sites/default/files/2026-06/recommandation_utilisation_de_donnees_de_localisation.pdf)) ;
- la doctrine CNIL sur la mesure d'audience, si des personnes sans l'app sont un jour détectées passivement : information aux entrées, possibilité de refus, anonymisation ([CNIL](https://cnil.fr/fr/dispositifs-de-mesure-daudience-et-de-frequentation-dans-des-espaces-accessibles-au-public-la-cnil)).

**Données personnelles à Monaco.** La **Loi n° 1.565 du 3 décembre 2024** remplace la loi 1.165 que citent encore les documents. Elle crée l'APDP, s'applique aux responsables étrangers qui traitent des données de personnes présentes à Monaco et impose de notifier une violation sous 72 h. Les amendes vont jusqu'à 10 M€ (le plafond de 4 % du chiffre d'affaires n'est pas confirmé). Son texte d'application est l'Ordonnance Souveraine n° 11.327 du 10 juillet 2025 ([CMS](https://cms.law/fr/mco/publication/nouvelle-loi-monegasque-sur-la-protection-des-donnees-personnelles)).

Un serveur local qui stocke des positions entre dans ce périmètre : purge après l'événement et sécurisation obligatoires.

### Erreur à corriger dans les documents

Le produit s'appelle **ONEERA, jamais « Teufy »**. Une version du document de stack V1 porte le titre « projet TEUFY », et le projet est enregistré chez l'ancien prestataire sous le nom « teufymapping » : ce sont des erreurs de l'ancien prestataire, Teufy est un produit distinct.

## Option économique testée : balises doublées avec le stock existant + 6 ancres UWB sur le dancefloor seulement

Ajout du 26/11/2026, après la question du coût. Mêmes bancs, même simulation (pas une mesure terrain).

| Retrouvable < 3 m | Club plein | Devant de scène | Compact |
|---|---|---|---|
| BLE actuel | 53 % | 34 % | 19 % |
| UWB dans tout le lieu | 94 % | 89 % | 75 % |
| **Économique (6 ancres sur le dancefloor)** | **96 %** | **88 %** | **76 %** |

Pour retrouver ses amis, là où on les perd (le dancefloor), l'option économique fait **aussi bien** que l'UWB partout.

Pour les données organisateur, en foule compacte, elle se place entre les deux : carte de chaleur 30 % d'erreur (BLE 51 %, UWB partout 19 %), flux 83 % / 83 %. Mais elle montre un **défaut à corriger** : 27 sauts et 25 traversées de mur par heure, plus que le BLE seul. Ils viennent de la bascule brutale quand un visiteur sort de la couverture UWB. Le moteur devra adoucir cette transition (incertitude élargie progressivement) avant toute démonstration.

Coût matériel indicatif (estimations, aucun devis) :
- Balises : 0 €, le stock de ~43 CP28 suffit.
- Ancres UWB fabriquées sur module Qorvo (31–59 $ prix public) : ~60–100 € pièce, soit ~400–600 € pour 6.
- Mini-serveur sur place : ~100 €.
- Total : **moins de 1 000 € de matériel neuf par club**, réutilisable d'un événement à l'autre.

## Feuille de route et protocole de mesure : prouver avant de vendre

### Feuille de route proposée

| Phase | Durée indicative | Contenu | Critère pour passer à la suite |
|---|---|---|---|
| 0. BLE réel | 2–4 semaines | Test des 5 CP28 sur iPhone et Android ; sessions S1–S6 du protocole terrain dans un club ; rejeu dans le banc | Bonne zone et P95 mesurés et publiés ; décision sur le stock de balises |
| 1. Kit UWB | 4–8 semaines | Devis et kit DL-TDoA (Estimote, Qorvo, Eforthink) ; inventaire des téléphones réellement compatibles (Pixel, S26+/Ultra, iPhone sous iOS 27) ; test club vide puis plein, ancres en hauteur ; batterie | Taux de positions UWB obtenues et précision en foule mesurés |
| 2. Mode sans réseau | En parallèle | Serveur local + mode local dans l'app ; mémoire tampon ; prototype de relais Bluetooth testé iPhone verrouillé ↔ Android | 10 min de coupure sans perte de données ; âge des positions relayées mesuré |
| 3. Pilote complet | 1 événement | Pile complète, comptage de référence, tableau de bord avec couverture | Seuils ci-dessous tenus → offre premium commercialisable |
| 4. Monaco | Avant le GP | Coordination DPRN, conditions UWB extérieur, balises IP67, GNSS en canyon, sélection des zones premium | Autorisations obtenues, test sur place |

### À mesurer sur site

Les seuils existants de `docs/validation-grid.md` s'appliquent :

| Indicateur | Cible | Bloquant |
|---|---|---|
| Erreur P90 | ≤ 6 m | > 10 m |
| Erreur P95 | ≤ 8 m | > 15 m |
| Bonne zone | ≥ 93 % | < 85 % |
| Avatar hors zone praticable | 0 % | — |
| Latence ami → ami, p50 / p95 | ≤ 1,5 s / ≤ 3 s | — |
| Ami localisé | ≥ 95 % du temps | — |
| Temps pour rejoindre un ami | médiane ≤ 2 min | > 5 min |
| Erreur de comptage par zone | ≤ 15 % après redressement | > 30 % non signalé |
| Fraîcheur des agrégats | ≤ 10 s | — |
| Anonymat des cellules | k ≥ 5 | — |
| Réseau coupé 10 min | aucune position d'ami présentée comme actuelle | — |

**Nouveaux indicateurs proposés** pour l'offre premium (cibles provisoires, à fixer après le pilote) :

- part du temps où l'ami est retrouvable à moins de 3 m : ≥ 90 % en club plein ;
- part des téléphones du public réellement compatibles DL-TDoA ;
- taux de positions UWB obtenues ;
- âge médian d'une position relayée : ≤ 2 min ;
- consommation de batterie en % par heure ;
- taux de consentement à la localisation ;
- comportement iOS en arrière-plan, écran verrouillé.

Chaque chiffre doit être mesuré par téléphone et par niveau de foule. Les sessions d'apprentissage et de validation doivent rester distinctes.

## Conclusion

Le problème d'ONEERA n'est pas de choisir *la* bonne radio. C'est d'empiler des couches dont chacune couvre l'échec de la précédente :

- le BLE pour tout le monde ;
- l'UWB là où la foule rend le BLE aveugle ;
- un réseau de site là où la 4G sature ;
- le relais entre téléphones quand tout le reste tombe.

Les simulations déplacent aussi la valeur commerciale. Le comptage par zone, les flux et le temps passé tiennent déjà avec le BLE en club plein. Ce que l'UWB achète vraiment, c'est le « je vois mon ami à 1 m devant la scène » et une carte de chaleur fine. La mémoire tampon, presque gratuite, compte davantage pour l'exhaustivité des données que n'importe quelle radio.

Le risque principal n'est plus technique mais de calendrier et de preuve. Le DL-TDoA sur téléphone vient d'arriver, la compatibilité iPhone n'est pas documentée et aucune mesure indépendante en foule n'existe. Le premier à publier des chiffres mesurés en foule réelle aura un argument que les annonces « centimétriques » des fournisseurs n'apportent pas. Un pilote UWB instrumenté vaut donc plus, aujourd'hui, que toute optimisation supplémentaire du moteur BLE.
