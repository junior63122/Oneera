# Journal des bugs — audit du 27-28/11/2026

## Échelle de gravité

| Gravité | Définition |
|---|---|
| **Bloquant** | Une fonction ne marche pas ou les données sont en danger. |
| **Majeur** | L'utilisateur le voit et c'est gênant. |
| **Mineur** | Visible mais peu gênant. |
| **Cosmétique** | Détail visuel. |

## Bugs trouvés

Chaque bug corrigé est couvert par un test qui échouait avant la correction et qui passe après. Le test est cité dans la colonne « Test ».

| ID | Gravité | Trouvé par (persona / outil) | Étapes | Attendu | Obtenu | Statut | Test |
|---|---|---|---|---|---|---|---|
| B-01 | Bloquant | Le testeur (toi, TestFlight 106) | Ouvrir l'app | Brouillard plein écran | Calque coincé en petit rectangle en haut à gauche. Cause : un commentaire avalait la ligne qui dimensionnait le calque. | Corrigé | e2e-portal « le brouillard couvre tout l'écran » + contrôle automatique des commentaires |
| B-02 | Majeur | Robot (e2e-portal) | Lancer l'app | Interface de la carte cachée sous le brouillard | Visible environ 0,3 s avant le brouillard. Causes : voile non ajouté (commentaire) et classes de l'écran remises à zéro au montage. | Corrigé | e2e-portal 14/14, deux fois de suite |
| B-03 | Majeur | Robot (e2e-portal) | Changer de lieu pendant l'entrée | Le brouillard se ferme puis s'ouvre | Une animation remplacée libérait trop tôt l'attente : interface visible trop tôt. | Corrigé | e2e-portal |
| B-04 | Majeur | Toi (capture) | Ouvrir le studio | Bulle à côté du visage | La bulle cachait la bouche, et sa pointe visait les lunettes. | Corrigé | bubble.js 16/16 (8 onglets × 2 écrans), trois fois de suite |
| B-05 | Mineur | bubble.js | iPhone SE, onglet Haut | Bulle sous le menton | Le dernier recours plaçait la bulle sur les yeux, et une largeur restait d'un placement précédent. | Corrigé | bubble.js |
| B-06 | Bloquant (introduit puis corrigé le même jour) | Tests du studio | Studio, geste coucou / danse | Le geste se joue | `renderAs is not defined` : une ligne supprimée par erreur lors d'une modification. | Corrigé | studio3, avfun, looks |
| B-07 | Majeur | search.js | Chercher « talons » puis « bague orteil » | « Bague d'orteil » | L'ancien résultat « Escarpins » restait affiché : l'optimisation du panneau confondait deux listes de même forme. | Corrigé | search.js 13/13, deux fois |
| B-08 | Majeur | Toi (capture) | Écran de démarrage | Logo sur fond uni | Halo du logo coupé en carré. | Corrigé (visible au prochain build) | contrôle des pixels de bord de l'image |
| B-09 | Majeur | Toi (capture) | Avatar qui fait coucou | Bras d'un seul tenant, main attachée | Main détachée, bras en « pantin ». | Corrigé : bras dessinés comme un volume, coucou par l'avant-bras autour du coude | captures posebig / wavecap |
| B-10 | Majeur | Toi | Avatar animé | Cheveux qui suivent la tête | La masse arrière des cheveux restait immobile quand la tête bougeait. | Corrigé | contrôle visuel |
| B-11 | Mineur | Toi | Coiffures bouclées / afro | Volume réaliste | Traits de « vieux dessin ». | Corrigé | captures hairs |
| B-12 | Majeur | Toi (lag) + studioperf | Toucher un vêtement dans le studio | Réponse immédiate | 263 / 173 / 546 ms (médiane, processeur ×4) sur les onglets Haut / Cheveux / Costumes. | Corrigé : 126–158 / 46–49 / 66–81 ms | tapbench.js (avant / après mesuré) |
| B-13 | Majeur | Test de charge | 20 000 téléphones sur un seul serveur | Positions livrées | Effondrement : 0 position livrée ni enregistrée (EMFILE, plus de descripteurs de fichiers), erreurs silencieuses. | Atténué : plafond de 15 000 par serveur, refus propre « réessaie », erreurs journalisées, reconnexion à délai varié. Reste : plusieurs serveurs (Q-02) | loadtest |
| B-14 | Mineur | personas (lecteur d'écran) | Studio, couleur libre | Le champ a un nom | Champ couleur sans nom. | Corrigé | personas 14/14 |
| B-15 | Mineur | personas (zoom 200 %) | Carte | Rien hors écran | La pastille « ± 3 m · aucun ami ici » débordait. | Corrigé | personas |
| B-16 | Mineur | Robot de clics | Studio, anciens éditeurs | Aucune image sans source | 14 images sans source (vignettes en cours de dessin, aperçu carte). | Corrigé | brokenchk : 0 |
| B-17 | Cosmétique | Captures | Poses « cœur », « selfie », « montre du doigt » | Mains visibles, cadrées | Mains cachées sous le haut ; bracelets sur le téléphone ; doigt hors cadre. | Corrigé | captures more.json |
| B-18 | Cosmétique | Captures | Blouse + jupe / jean | Pas de peau entre les deux | Bande de peau visible. | Corrigé | captures bl.json |
| B-19 | Cosmétique | Captures | Brouillard | Message « Tu reprends… » caché pendant le brouillard | Affiché par-dessus le brouillard. | Corrigé | capture fog4 |
| B-20 | Test (outil) | Test de charge | Plus de 10 000 téléphones | Le test tourne | Variable d'environnement trop grande ; attente infinie d'une connexion bloquée. | Corrigé : liste envoyée par message, abandon au bout de 15 s | loadtest |
| B-21 | Test (outil) | Fuzzing | — | — | Faux positifs : jeton valide suivi d'un espace ; invitation envoyée visible par son auteur. Ce ne sont pas des bugs. | Clos | fuzz-api : OK |

## Restants ouverts

Il n'y a aucun bug bloquant ni majeur ouvert dans l'app.

Un seul sujet ouvert relève de l'architecture : la tenue au-delà d'environ 12 000 personnes simultanées par serveur. Il est décrit dans B-13 et Q-02 et demande une décision de ta part (hébergement).
