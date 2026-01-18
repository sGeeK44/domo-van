# 💧 Water Management Module

Ce module est le cerveau de la gestion des eaux du van. Il monitore les niveaux (Propre/Grise) via ultrasons et pilote la vanne de vidange, le tout accessible via une API **Bluetooth Low Energy (BLE)** sécurisée.

Ce module gère la mesure des niveaux de cuves (propre/grise) et le contrôle des vannes via Bluetooth.

## 📱 API Bluetooth (BLE)

### Format des UUIDs

Tous les UUIDs suivent le format commun domo-van :

    b1f8707e-SSSS-CCCC-0000-00000000000X
             ^    ^                   ^
             |    |                   +-- 0=TX, 1=RX
             |    +-- Channel ID
             +-- Service ID

### Water Module

**Service ID :** `0001`

| Channel | ID | Rôle |
| :------ | :- | :--- |
| Admin | `0001` | Nom / PIN (Passkey) |
| Eau Propre (`clean_tank`) | `0002` | Mesure + config cuve |
| Eau Grise (`grey_tank`) | `0003` | Mesure + config cuve |
| Vanne Grise (`grey_valve`) | `0004` | Contrôle relais |

Chaque **Channel** est une paire de caractéristiques :

- **TX (OUT)** : `READ_AUTHEN` + `NOTIFY` (notifications chiffrées/authentifiées)
- **RX (IN)** : `WRITE` + `WRITE_AUTHEN` (écriture authentifiée)

Toutes les payloads sont des **chaînes ASCII/UTF-8** (pas du binaire).

> *Valeurs par défaut : Nom = `Water Tank`, PIN = `123456`.*

### Mesures cuves (TX) + configuration cuves (RX) — `TankCfgProtocol`

Sur les channels **Eau Propre** et **Eau Grise** :

- **TX (Notify)** envoie périodiquement la **distance mesurée** en millimètres sous forme de chaîne, ex: `482`
- **RX (Write)** accepte des commandes de configuration, et **la réponse est renvoyée sur TX** (même caractéristique que les mesures)

Commandes (RX) :

- **Lecture config**: `CFG?`
  - **Réponse (TX)**: `CFG:V=<liters>;H=<mm>`
- **Écriture config**: `CFG:V=<liters>;H=<mm>`
  - **Réponse (TX)**: `OK`

Erreurs possibles (TX) :

- `ERR_CFG_FMT` : champs manquants (ex: `CFG:V=...` sans `H=...`)
- `ERR_CFG_NUM` : valeur non numérique
- `ERR_CFG_RANGE` : bornes hors limites (V: 1..5000, H: 1..10000)
- `ERR_UNKNOWN_CMD` : commande inconnue

Valeurs par défaut (par cuve) :

- **Volume** : 150 L
- **Hauteur** : 500 mm

> **Note parsing client** : le TX peut contenir soit une mesure (`<mm>`), soit une réponse de protocole (`CFG:...`, `OK`, `ERR_...`).

### Vanne grise (RX)

Commandes (RX) :

- `OPEN` : active le relais (HIGH)
- `CLOSE` : désactive le relais (LOW)

> Le TX de ce channel est actuellement non utilisé (réservé).

### Administration (RX) — `AdminProtocol`

Commandes (RX) :

- **Changer PIN**: `PIN:<6digits>`
  - Réponses (TX): `OK`, `ERR_PIN_LEN`, `ERR_PIN_NUM`
- **Changer nom BLE**: `NAME:<device_name>`
  - Contraintes : longueur 1..20, caractères autorisés = alphanum + espace + `-` + `_`
  - Réponses (TX): `OK`, `ERR_NAME_LEN`, `ERR_NAME_CHARS`

Comportement après `OK` :

- suppression des bonds BLE (`deleteAllBonds()`)
- reboot pour appliquer le nouveau nom/PIN

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

---

## 🛠️ Développement Local

### Prérequis

1. **VS Code** avec l'extension [PlatformIO IDE](https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide)
2. **Git** pour le versioning
3. (Optionnel) **Clang** pour le formatage/linting

### Installation

```bash
# Cloner le dépôt
git clone <repo_url>
cd water-module

# PlatformIO installe automatiquement les dépendances au premier build
```

### Commandes PlatformIO

| Action | Commande CLI | Raccourci VS Code |
| :----- | :----------- | :---------------- |
| **Build local** | `pio run -e local` | `Ctrl+Alt+B` |
| **Build ESP32** | `pio run -e esp32doit-devkit-v1` | — |
| **Tests unitaires** | `pio test -e local` | Icône 🧪 PlatformIO |
| **Upload ESP32** | `pio run -e esp32doit-devkit-v1 -t upload` | `Ctrl+Alt+U` |
| **Monitor série** | `pio device monitor` | Icône 🔌 PlatformIO |
| **Clean** | `pio run -t clean` | — |

### Environnements

Le projet dispose de deux environnements configurés dans `platformio.ini` :

- **`local`** (défaut) : Compilation native pour PC, utilisé pour les tests unitaires avec GoogleTest et ArduinoFake.
- **`esp32doit-devkit-v1`** : Compilation pour l'ESP32 réel avec les dépendances NimBLE.

### Lancer les tests

```bash
# Tous les tests
pio test -e local

# Un fichier de test spécifique
pio test -e local -f test_filters

# Avec verbose
pio test -e local -v
```

### Debug sur ESP32

1. Connecter un debugger JTAG (ex: ESP-Prog) ou utiliser le debug USB natif (ESP32-S3)

2. Lancer le debug : `F5` dans VS Code ou `pio debug`

### Tips

- **Hot Reload des tests** : Utiliser `pio test -e local` en watch mode avec un outil externe (ex: `nodemon`)
- **Logs série** : Le baudrate par défaut est `115200`
- **Shared libs** : Les bibliothèques partagées sont dans `../shared-libs` (configuré via `lib_extra_dirs`)
