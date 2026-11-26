# Banc « retrouver ses amis en foule dense » — SIMULATION

> Club de test (20 balises ; 32 en version 2×), deux amis surtout sur le dancefloor, téléphones Android. Modèles calibrés sur des chiffres publiés (atténuation du corps 5–8 dB, foule jusqu'à 8,6 dB ; UWB σ ≈ 0,15 m en vue directe, excès de distance quand des corps bloquent). **Ce ne sont pas des mesures terrain.** Durée : 206 s.

Lecture : **« moi → ami »** = erreur de la position de l'ami telle qu'affichée par rapport à moi (ce qui sert à le retrouver). **Retrouvable** = cette erreur est sous 3 m (on se voit dans la foule) / sous 5 m. **Mode précision** = part du temps où la mesure directe entre téléphones est active (amis à ≤ 12 m, app ouverte).

## Foule dense (club plein)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| Économique : BLE 2× (stock existant) + 6 ancres UWB sur le dancefloor | téléphones UWB sur le dancefloor ; BLE ailleurs | 0.5 / 1.9 m | 0.7 / 1.9 m | 96 % | 99 % | — |

## Foule très dense (devant de scène)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| Économique : BLE 2× (stock existant) + 6 ancres UWB sur le dancefloor | téléphones UWB sur le dancefloor ; BLE ailleurs | 0.8 / 3.4 m | 1.2 / 3.3 m | 88 % | 97 % | — |

## Foule compact (4–6 pers./m²)

| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |
|---|---|---|---|---|---|---|
| Économique : BLE 2× (stock existant) + 6 ancres UWB sur le dancefloor | téléphones UWB sur le dancefloor ; BLE ailleurs | 1.1 / 3.8 m | 1.8 / 4.8 m | 76 % | 91 % | — |

