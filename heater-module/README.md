# 💧 Heater Management Module

Ce module est le chef d'orchestre de la régulation thermique du camion. Il monitore la température de 4 zones indépendantes via des sondes numériques de précision et pilote la puissance des ventilateurs de chauffage (PWM 25kHz) via un algorithme PID, assurant une température stable et une consommation électrique optimisée.

Ce module gère l'asservissement du chauffage multizone (4 canaux) et le pilotage dynamique des ventilateurs via ESP32.
