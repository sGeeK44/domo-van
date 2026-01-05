⚙️ Calibrage du Filtrage et Fréquence d'Échantillonnage
L'architecture de traitement du signal a été calibrée pour obtenir un compromis optimal entre stabilité acoustique (gestion des échos), inertie mécanique (mouvements de l'eau) et réactivité utilisateur (cible < 1s).

1. Fréquence d'acquisition (LOOP_DELAY_MS = 150ms)
Pourquoi ce choix : Définit une fréquence de rafraîchissement d'environ 6.6 Hz.

Justification physique : Le capteur JSN-SR04T nécessite un temps de repos pour dissiper l'énergie piézoélectrique. Une période de 150ms garantit l'extinction des "échos fantômes" (réverbérations secondaires dans la cuve close) qui provoqueraient des mesures erratiques avec un délai plus court (<60ms).

2. Rejet des aberrances (WINDOW_SIZE = 9)
Algo : Filtre Médian Glissant (Rolling Median).

Pourquoi ce choix : Une fenêtre de 9 échantillons couvre une plage temporelle de ~1.35 secondes.

Justification statistique :

Permet d'absorber le clapotis (sloshing) lié aux mouvements dans le van sans faire osciller la jauge.

Élimine mathématiquement les faux positifs (spikes > 4500mm ou dropouts à 0mm) tant qu'ils ne représentent pas la majorité de la fenêtre (>4 échantillons consécutifs).

3. Lissage final (EMA_ALPHA = 0.5)
Algo : Moyenne Mobile Exponentielle (Exponential Moving Average).

Pourquoi ce choix : Réglage dit "Mode Sport".

Justification UX : Le filtre médian (taille 9) apportant déjà une stabilité forte, l'EMA est configuré avec un coefficient élevé (0.5) pour ne pas ajouter de latence inutile. Il sert uniquement à "arrondir" les transitions de valeur sans créer de sensation de lourdeur ou de traîne à l'affichage.

📊 Bilan de latence système : Le temps de réponse total (Sampling + Médiane + EMA) est estimé à ~0.9 seconde, offrant une expérience utilisateur fluide tout en garantissant la fiabilité des mesures en environnement instable.