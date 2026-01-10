# 💧 Water Management Module

Ce module est le cerveau de la gestion des eaux du van. Il monitore les niveaux (Propre/Grise) via ultrasons et pilote la vanne de vidange, le tout accessible via une API **Bluetooth Low Energy (BLE)** sécurisée.

Ce module gère la mesure des niveaux de cuves (propre/grise) et le contrôle des vannes via Bluetooth.

## 📱 API Bluetooth (BLE)

**Service UUID :** `aaf8707e-2734-4e30-94b8-8d2725a5ceca`

| Fonction        | UUID Notify (OUT) | UUID Write (IN) | Format / Commandes              |
| :-------------- | :---------------- | :-------------- | :------------------------------ |
| **Eau Propre**  | `...ced0`         | `...ced1`       | `int` (mm)                      |
| **Eau Grise**   | `...ced2`         | `...ced3`       | `int` (mm)                      |
| **Vanne Grise** | `...ced4`         | `...ced5`       | `OPEN`, `CLOSE`                 |
| **Admin**       | `...cedb`         | `...cedc`       | `PIN:123456`, `NAME:Water Tank` |

> *Note : Les UUIDs sont abrégés, ils partagent le même préfixe que le service.*
> *Valeurs par défaut : Nom = `Water Tank`, PIN = `123456`.*

## 🔋 Consommation Énergétique (Usage Van)

Optimisé pour une installation autonome sur batterie :

- **Deep Sleep :** Le module entre en sommeil profond après 5s d'inactivité (sans connexion).
- **Cycle de Réveil :** Réveil automatique toutes les 5s pour scruter les demandes de connexion (Advertising).
- **Sécurité :** Appairage sécurisé par code PIN (Passkey) pour éviter toute manipulation externe de la vanne.

---

## ⚙️ Calibrage du Filtrage et Fréquence d'Échantillonnage

L'architecture de traitement du signal a été calibrée pour obtenir un compromis optimal entre stabilité acoustique (gestion des échos), inertie mécanique (mouvements de l'eau) et réactivité utilisateur (cible < 1s).

1. Fréquence d'acquisition (LOOP_DELAY_MS = 150ms)
Pourquoi ce choix : Définit une fréquence de rafraîchissement d'environ 6.6 Hz.

Justification physique : Le capteur JSN-SR04T nécessite un temps de repos pour dissiper l'énergie piézoélectrique. Une période de 150ms garantit l'extinction des "échos fantômes" (réverbérations secondaires dans la cuve close) qui provoqueraient des mesures erratiques avec un délai plus court (<60ms).

1. Rejet des aberrances (WINDOW_SIZE = 9)
Algo : Filtre Médian Glissant (Rolling Median).

Pourquoi ce choix : Une fenêtre de 9 échantillons couvre une plage temporelle de ~1.35 secondes.

Justification statistique :

Permet d'absorber le clapotis (sloshing) lié aux mouvements dans le van sans faire osciller la jauge.

Élimine mathématiquement les faux positifs (spikes > 4500mm ou dropouts à 0mm) tant qu'ils ne représentent pas la majorité de la fenêtre (>4 échantillons consécutifs).

1. Lissage final (EMA_ALPHA = 0.5)
Algo : Moyenne Mobile Exponentielle (Exponential Moving Average).

Pourquoi ce choix : Réglage dit "Mode Sport".

Justification UX : Le filtre médian (taille 9) apportant déjà une stabilité forte, l'EMA est configuré avec un coefficient élevé (0.5) pour ne pas ajouter de latence inutile. Il sert uniquement à "arrondir" les transitions de valeur sans créer de sensation de lourdeur ou de traîne à l'affichage.

📊 Bilan de latence système : Le temps de réponse total (Sampling + Médiane + EMA) est estimé à ~0.9 seconde, offrant une expérience utilisateur fluide tout en garantissant la fiabilité des mesures en environnement instable.

## 📦 Matériel (BOM) & Montage

Le système est conçu pour être robuste (IP67), autonome (12V) et réparable.

### Composants Clés

| Composant        | Modèle                              | Usage                                                           |
| :--------------- | :---------------------------------- | :-------------------------------------------------------------- |
| **MCU**          | ESP32-DevKitC V4 + Terminal Adapter | Cerveau du système (Wifi/BLE).                                  |
| **Alimentation** | MP1584EN (Buck Converter)           | Abaisseur de tension 12V → 5V (3A max).                         |
| **Capteurs**     | JSN-SR04T (x2)                      | Sondes ultrasons étanches (Eau Propre / Grise).                 |
| **Actionneur**   | Vanne Motorisée (NC) + Relais 30A   | Vanne "Normalement Fermée". Pilotée par relais avec optocoupleur. |
| **Connectique**  | Jack DC 5.5x2.1mm                   | Entrées/Sorties d'alimentation standardisées.                   |

### ⚡ Schéma de Câblage & Pinout

> **⚠️ Important (Protection 3.3V) :** La sortie `Echo` du JSN-SR04T est en 5V. Un **pont diviseur de tension** (R1=1kΩ, R2=2kΩ) est impératif pour protéger les entrées de l'ESP32 (3.3V).

| Périphérique          | Pin ESP32            | Détails Câblage                                                                                 |
| :-------------------- | :------------------- | :---------------------------------------------------------------------------------------------- |
| **Sensor 1 (Propre)** | `GPIO 4` / `GPIO 5`  | Utilisés comme Trig/Echo (Mapping Serial1).                                                     |
| **Sensor 2 (Grise)**  | `GPIO 16` / `GPIO 17`| Utilisés comme Trig/Echo (Mapping Serial2).                                                     |
| **Relais Vanne**      | `GPIO 23`            | Active l'ouverture (NC). **Note:** Résistance pull-down ajoutée pour éviter les glitchs au boot. |
| **Alimentation**      | `VIN` / `GND`        | Sortie 5V régulée du module MP1584EN.                                                           |

### 🖨️ Boîtiers 3D

Les fichiers STL et GCODE pour l'impression des boîtiers sont disponibles dans le dossier `/3d_parts` :

    * `case_main.stl` : Logement pour l'ESP32 et le MP1584EN (avec inserts M3).
    * `case_relay.stl` : Boîtier séparé pour le relais de puissance 30A.

---

## 📂 Architecture Logicielle

Le projet est structuré pour séparer strictement le code embarqué (`embedded`) du code de test local.

    ```bash
        water/
        ├── 📄 platformio.ini       # Config : Env, Baudrate, Deps
        ├── 📂 src/                 # Points d'entrée
        │   ├── main_embedded.cpp   # 🚀 Main pour l'ESP32 (Production)
        │   └── main_local.cpp      # 💻 Main pour simulation PC
        ├── 📂 lib/                 # Logique Métier (Isolée)
        │   ├── 📡 ble/             # Gestionnaire GATT, Sécurité, Events
        │   ├── 🧠 filters/         # Traitement du signal (Median + EMA)
        │   ├── 🎮 program/         # Logique haut niveau (ValveListener, TankNotifier)
        │   ├── 📏 sensors/         # Drivers (UltrasonicSensor avec gestion Echo)
        │   ├── 💾 settings/        # Persistance des préférences (NVS)
        │   └── 🛠️ utils/           # Helpers
        └── 📂 test/                # Tests Unitaires
            ├── test_embedded/      # Tests sur hardware réel
            └── test_local/         # Tests logiques sur PC (avec Mocks)
    ```
