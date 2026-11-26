# Banc « retrouver ses amis en foule dense » — SIMULATION

> Club de test (20 balises ; 32 en version 2×), deux amis surtout sur le dancefloor, téléphones Android. Modèles calibrés sur des chiffres publiés (atténuation du corps 5–8 dB, foule jusqu'à 8,6 dB ; UWB σ ≈ 0,15 m en vue directe, excès de distance quand des corps bloquent). **Ce ne sont pas des mesures terrain.** Durée : 139 s.

Lecture : **« moi → ami »** = erreur de la position de l'ami telle qu'affichée par rapport à moi (ce qui sert à le retrouver). **Retrouvable** = cette erreur est sous 3 m (on se voit dans la foule) / sous 5 m. **Mode précision** = part du temps où la mesure directe entre téléphones est active (amis à ≤ 12 m, app ouverte).

## Foule dense (club plein)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 2.5 / 6.5 m | 4.0 / 7.2 m | 27 % | 72 % | — |
| BLE, 2× plus de balises | tous téléphones | 2.6 / 4.6 m | 3.5 / 5.6 m | 37 % | 84 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 0.4 / 1.4 m | 0.6 / 1.5 m | 98 % | 100 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 2.5 / 6.5 m | 2.6 / 5.8 m | 58 % | 82 % | 58 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 2.5 / 6.5 m | 3.8 / 6.7 m | 29 % | 72 % | 58 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.3 / 1.5 m | 0.5 / 1.5 m | 98 % | 100 % | 58 % |

## Foule très dense (devant de scène)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 2.0 / 13.3 m | 4.4 / 11.4 m | 33 % | 55 % | — |
| BLE, 2× plus de balises | tous téléphones | 1.6 / 3.5 m | 2.4 / 6.6 m | 61 % | 82 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 0.6 / 3.1 m | 1.0 / 3.0 m | 90 % | 97 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 2.0 / 13.3 m | 3.3 / 11.0 m | 44 % | 63 % | 55 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 2.0 / 13.3 m | 3.5 / 11.9 m | 40 % | 61 % | 51 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.5 / 3.6 m | 0.8 / 2.9 m | 91 % | 99 % | 55 % |

## Foule compact (4–6 pers./m²)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| BLE balises (actuel) | tous téléphones | 3.3 / 7.3 m | 6.5 / 10.1 m | 21 % | 39 % | — |
| BLE, 2× plus de balises | tous téléphones | 3.3 / 7.0 m | 3.4 / 7.1 m | 41 % | 73 % | — |
| BLE + UWB ancres (DL-TDoA) | téléphones haut de gamme récents | 1.0 / 4.1 m | 1.9 / 4.1 m | 80 % | 93 % | — |
| BLE + recherche de précision UWB entre amis | deux téléphones UWB, app ouverte | 3.3 / 7.3 m | 5.4 / 10.0 m | 29 % | 49 % | 32 % |
| BLE + Channel Sounding entre amis | deux téléphones BT 6, app ouverte | 3.3 / 7.3 m | 5.5 / 10.0 m | 25 % | 48 % | 29 % |
| BLE 2× + UWB ancres + UWB entre amis | cible « premium » | 0.9 / 5.1 m | 1.6 / 4.8 m | 74 % | 91 % | 32 % |

