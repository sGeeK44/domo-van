# 🔥 Heater Management Module

Ce module est le chef d'orchestre de la régulation thermique du camion. Il monitore la température de 4 zones indépendantes via des sondes numériques de précision et pilote la puissance des ventilateurs de chauffage (PWM 25kHz) via un algorithme PID, assurant une température stable et une consommation électrique optimisée.

Ce module gère l'asservissement du chauffage multizone (4 canaux) et le pilotage dynamique des ventilateurs via ESP32, le tout accessible via une API **Bluetooth Low Energy (BLE)** sécurisée.

## 📱 API Bluetooth (BLE)

**Service UUID :** `b1f8707e-2734-4e30-94b8-8d2725a5ce00`

Chaque **Channel** est une paire de caractéristiques :

- **TX (OUT)** : `READ_AUTHEN` + `NOTIFY` (notifications chiffrées/authentifiées)
- **RX (IN)** : `WRITE` + `WRITE_AUTHEN` (écriture authentifiée)

Toutes les payloads sont des **chaînes ASCII/UTF-8** (pas du binaire).

| Channel | Rôle | UUID TX (Notify/Read) | UUID RX (Write) |
| :-- | :-- | :-- | :-- |
| **Heater 0** (`heater_0`) | Régulation zone 0 | `b1f8707e-2734-4e30-94b8-8d2725a5ce00` | `b1f8707e-2734-4e30-94b8-8d2725a5ce01` |
| **Heater 1** (`heater_1`) | Régulation zone 1 | `b1f8707e-2734-4e30-94b8-8d2725a5ce02` | `b1f8707e-2734-4e30-94b8-8d2725a5ce03` |
| **Heater 2** (`heater_2`) | Régulation zone 2 | `b1f8707e-2734-4e30-94b8-8d2725a5ce04` | `b1f8707e-2734-4e30-94b8-8d2725a5ce05` |
| **Heater 3** (`heater_3`) | Régulation zone 3 | `b1f8707e-2734-4e30-94b8-8d2725a5ce06` | `b1f8707e-2734-4e30-94b8-8d2725a5ce07` |
| **Admin** (`Admin Channel`) | Nom / PIN (Passkey) | `b1f8707e-2734-4e30-94b8-8d2725a5cedb` | `b1f8707e-2734-4e30-94b8-8d2725a5cedc` |

> *Valeurs par défaut : Nom = `Heater`, PIN = `123456`.*

### Régulation thermique (RX/TX) — `HeaterCfgProtocol`

Sur les channels **Heater 0-3** :

#### Lecture de configuration PID

- **Commande (RX)**: `CFG?`
- **Réponse (TX)**: `CFG:KP=<kp>;KI=<ki>;KD=<kd>`

Les valeurs sont stockées en entier × 100 (ex: `KP=1000` → Kp réel = 10.0).

#### Écriture de configuration PID

- **Commande (RX)**: `CFG:KP=<kp>;KI=<ki>;KD=<kd>`
- **Réponse (TX)**: `OK`

Erreurs possibles :

- `ERR_CFG_FMT` : champs manquants
- `ERR_CFG_NUM` : valeur non numérique
- `ERR_CFG_RANGE` : bornes hors limites (1..10000 pour chaque gain)

Valeurs par défaut :

- **Kp** : 1000 (10.0)
- **Ki** : 10 (0.1)
- **Kd** : 50 (0.5)

#### Démarrage / Arrêt du régulateur

- **Commande (RX)**: `START` → **Réponse (TX)**: `OK`
- **Commande (RX)**: `STOP` → **Réponse (TX)**: `OK`

> **Note :** À l'arrêt, le ventilateur est forcé à 0% (vitesse nulle).

#### Lecture du setpoint (consigne)

- **Commande (RX)**: `SP?`
- **Réponse (TX)**: `SP:<celsius×10>`

La valeur est en dixièmes de degré (ex: `SP:225` → 22.5°C).

#### Écriture du setpoint (consigne)

- **Commande (RX)**: `SP:<celsius×10>`
- **Réponse (TX)**: `OK`

Erreurs possibles :

- `ERR_SP_NUM` : valeur non numérique
- `ERR_SP_RANGE` : hors limites (0..500, soit 0°C à 50°C)

#### Lecture du statut complet

- **Commande (RX)**: `STATUS?`
- **Réponse (TX)**: `STATUS:T=<temp×10>;SP=<setpoint×10>;RUN=<0|1>`

Exemple : `STATUS:T=215;SP=250;RUN=1` → Température actuelle 21.5°C, consigne 25°C, régulateur actif.

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

## 🎛️ Algorithme PID

Le régulateur implémente un contrôle **Proportionnel-Intégral-Dérivé** classique :

```code
output = Kp × error + Ki × ∫error + Kd × (d_error/dt)
```

- **Anti-windup** : L'intégrale est bornée à ±10000 pour éviter les dérives.
- **Clamping** : La sortie PWM est limitée à [0, 255].
- **Temps d'échantillonnage** : ~110ms par cycle.

## 🔋 Consommation Énergétique (Usage Van)

Optimisé pour une installation autonome sur batterie :

- **Deep Sleep :** Le module entre en sommeil profond après 5s d'inactivité (sans connexion).
- **Cycle de Réveil :** Réveil automatique toutes les 5s pour scruter les demandes de connexion (Advertising).
- **Sécurité :** Appairage sécurisé par code PIN (Passkey) pour éviter toute manipulation externe.

---

## 📦 Matériel (BOM) & Montage

Le système est conçu pour être robuste, autonome (12V) et réparable.

### Composants Clés

| Composant        | Modèle                              | Usage                                                           |
| :--------------- | :---------------------------------- | :-------------------------------------------------------------- |
| **MCU**          | ESP32-DevKitC V4 + Terminal Adapter | Cerveau du système (Wifi/BLE).                                  |
| **Alimentation** | MP1584EN (Buck Converter)           | Abaisseur de tension 12V → 5V (3A max).                         |
| **Capteurs**     | DS18B20 (x4)                        | Sondes de température numériques 1-Wire (±0.5°C).               |
| **Actionneurs**  | Ventilateurs PWM 25kHz (x4)         | Ventilateurs 4 fils avec contrôle PWM.                          |

### ⚡ Schéma de Câblage & Pinout

| Périphérique          | Pin ESP32            | Détails Câblage                                                                                 |
| :-------------------- | :------------------- | :---------------------------------------------------------------------------------------------- |
| **Sensor 0**          | `GPIO 4`             | Bus 1-Wire DS18B20 (résistance pull-up 4.7kΩ).                                                  |
| **Sensor 1**          | `GPIO 5`             | Bus 1-Wire DS18B20 (résistance pull-up 4.7kΩ).                                                  |
| **Sensor 2**          | `GPIO 6`             | Bus 1-Wire DS18B20 (résistance pull-up 4.7kΩ).                                                  |
| **Sensor 3**          | `GPIO 7`             | Bus 1-Wire DS18B20 (résistance pull-up 4.7kΩ).                                                  |
| **Fan 0 PWM**         | `GPIO 16`            | Signal PWM 25kHz (LEDC Channel 0).                                                              |
| **Fan 1 PWM**         | `GPIO 17`            | Signal PWM 25kHz (LEDC Channel 1).                                                              |
| **Fan 2 PWM**         | `GPIO 18`            | Signal PWM 25kHz (LEDC Channel 2).                                                              |
| **Fan 3 PWM**         | `GPIO 19`            | Signal PWM 25kHz (LEDC Channel 3).                                                              |
| **Alimentation**      | `VIN` / `GND`        | Sortie 5V régulée du module MP1584EN.                                                           |

---

## 📂 Architecture Logicielle

Le projet est structuré pour séparer strictement le code embarqué (`embedded`) du code de test local.

```bash
heater/
├── 📄 platformio.ini       # Config : Env, Baudrate, Deps
├── 📂 src/                 # Points d'entrée
│   ├── main_embedded.cpp   # 🚀 Main pour l'ESP32 (Production)
│   └── main_local.cpp      # 💻 Main pour simulation PC
├── 📂 lib/                 # Logique Métier (Isolée)
│   ├── 🔥 actuators/       # Pilotage ventilateurs (PwmFan)
│   ├── 🎮 program/         # Logique haut niveau (HeaterListner)
│   ├── 📡 protocol/        # Protocole BLE (HeaterCfgProtocol)
│   ├── 🎛️ regulator/       # Algorithme PID (TemperatureRegulator)
│   ├── 🌡️ sensors/         # Drivers (DS18B20TemperatureSensor)
│   └── 💾 settings/        # Persistance des préférences (HeaterSettings)
└── 📂 test/                # Tests Unitaires
    ├── test_program/       # Tests Programme
    ├── test_protocol/      # Tests Protocole BLE
    └── test_regulator/     # Tests Régulateur PID
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
cd heater-module

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
- **`esp32doit-devkit-v1`** : Compilation pour l'ESP32 réel avec les dépendances NimBLE et DallasTemperature.

### Lancer les tests

```bash
# Tous les tests
pio test -e local

# Un fichier de test spécifique
pio test -e local -f test_regulator

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
