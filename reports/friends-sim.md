# Banc « retrouver ses amis en foule dense » — SIMULATION

> Club de test (20 balises ; 32 en version 2×), deux amis surtout sur le dancefloor, téléphones Android. Modèles calibrés sur des chiffres publiés (atténuation du corps 5–8 dB, foule jusqu'à 8,6 dB ; UWB σ ≈ 0,15 m en vue directe, excès de distance quand des corps bloquent). **Ce ne sont pas des mesures terrain.** Durée : 948 s.

Lecture : **« moi → ami »** = erreur de la position de l'ami telle qu'affichée par rapport à moi (ce qui sert à le retrouver). **Retrouvable** = cette erreur est sous 3 m (on se voit dans la foule) / sous 5 m. **Mode précision** = part du temps où la mesure directe entre téléphones est active (amis à ≤ 12 m, app ouverte).

## Foule dense (club plein)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 1.8 / 5.2 m | 2.9 / 7.2 m | 53 % | 78 % | — |
| BLE, 2× plus de balises | tous téléphones | 1.6 / 4.8 m | 2.1 / 5.5 m | 69 % | 88 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 0.4 / 2.2 m | 0.6 / 1.9 m | 94 % | 99 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 1.8 / 5.2 m | 2.1 / 6.2 m | 68 % | 85 % | 42 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 1.8 / 5.2 m | 2.4 / 6.6 m | 60 % | 82 % | 40 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.4 / 1.6 m | 0.6 / 1.7 m | 97 % | 99 % | 42 % |

## Foule très dense (devant de scène)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 2.9 / 10.3 m | 4.0 / 10.4 m | 34 % | 61 % | — |
| BLE, 2× plus de balises | tous téléphones | 2.0 / 10.1 m | 3.1 / 7.8 m | 49 % | 74 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 0.6 / 3.0 m | 1.0 / 3.2 m | 89 % | 96 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 2.9 / 10.3 m | 3.3 / 9.4 m | 46 % | 69 % | 46 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 2.9 / 10.3 m | 3.7 / 9.8 m | 40 % | 65 % | 41 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.6 / 3.8 m | 0.9 / 3.4 m | 88 % | 96 % | 46 % |

## Foule compact (4–6 pers./m²)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 3.4 / 10.9 m | 6.9 / 13.6 m | 19 % | 35 % | — |
| BLE, 2× plus de balises | tous téléphones | 2.4 / 11.1 m | 5.4 / 10.7 m | 28 % | 47 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 0.9 / 5.2 m | 1.6 / 5.4 m | 75 % | 88 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 3.4 / 10.9 m | 5.4 / 12.1 m | 30 % | 47 % | 45 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 3.4 / 10.9 m | 5.9 / 12.2 m | 26 % | 44 % | 40 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.8 / 4.9 m | 1.5 / 4.9 m | 77 % | 90 % | 45 % |

