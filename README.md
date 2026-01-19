# Domo-Van

Système domotique complet pour van aménagé : gestion des eaux, régulation thermique et application mobile de pilotage via Bluetooth Low Energy (BLE).

## Architecture

```
domo-van/
├── mobile-app/      # Application React Native (Expo) pour Android
├── water-module/    # Module ESP32 de gestion des eaux (cuves + vanne)
├── heater-module/   # Module ESP32 de régulation thermique (4 zones PID)
├── shared-libs/     # Bibliothèques C++ partagées entre modules ESP32
└── hardware/        # Fichiers 3D pour impression des boîtiers (STL/SCAD)
```

## Modules

### Mobile App

Application de contrôle développée avec **Expo** et **React Native**. Communique avec les modules ESP32 via BLE.

- **Technologies** : Expo SDK 54, React Native 0.81, TypeScript
- **Tests** : Vitest + Testing Library
- **Build** : EAS Build (production AAB pour Play Store)

[Documentation complète](mobile-app/README.md)

### Water Module

Module ESP32 pour la gestion des eaux du van :

- Mesure des niveaux de cuves (eau propre / eau grise) via capteurs ultrasoniques
- Contrôle de la vanne de vidange
- Communication BLE sécurisée (PIN)

- **Technologies** : ESP32 + PlatformIO + NimBLE
- **Tests** : GoogleTest (natif)

[Documentation complète](water-module/README.md)

### Heater Module

Module ESP32 pour la régulation thermique multizone :

- 4 zones de chauffage indépendantes
- Sondes de température DS18B20
- Régulation PID avec contrôle PWM des ventilateurs

- **Technologies** : ESP32 + PlatformIO + NimBLE + DallasTemperature
- **Tests** : GoogleTest (natif)

[Documentation complète](heater-module/README.md)

## Développement

### Prérequis

- **Node.js** 20+ (pour mobile-app)
- **Python** 3.11+ (pour PlatformIO)
- **VS Code** avec extensions :
  - [PlatformIO IDE](https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide)
  - [Expo Tools](https://marketplace.visualstudio.com/items?itemName=expo.vscode-expo-tools)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/<org>/domo-van.git
cd domo-van

# Mobile App
cd mobile-app
npm install

# ESP32 Modules (PlatformIO gère les dépendances automatiquement)
cd ../water-module
pio pkg install

cd ../heater-module
pio pkg install
```

### Lancer les tests

```bash
# Mobile App
cd mobile-app
npm test

# Water Module
cd water-module
pio test -e local

# Heater Module
cd heater-module
pio test -e local
```

---

## CI/CD - Release Workflow

Le projet utilise GitHub Actions pour automatiser les builds et releases.

### Déclenchement

Le workflow se déclenche automatiquement lors de la création d'un **tag** de version :

```bash
# Créer un tag et pousser
git tag v1.2.3
git push origin v1.2.3

# Ou créer une release directement depuis l'interface GitHub
```

Formats de tag supportés : `v1.2.3` ou `1.2.3`

### Pipeline

```docs
┌─────────────────────────────────────────────────────────────────┐
│                         Tag Push                                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  test-mobile  │     │  test-water   │     │  test-heater  │
│  ─────────────│     │  ─────────────│     │  ─────────────│
│  npm check    │     │  pio test     │     │  pio test     │
│  npm test     │     │  -e local     │     │  -e local     │
│  expo-doctor  │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ build-mobile  │     │  build-water  │     │ build-heater  │
│  ─────────────│     │  ─────────────│     │  ─────────────│
│  EAS Build    │     │  pio run      │     │  pio run      │
│  Android Prod │     │  ESP32 bin    │     │  ESP32 bin    │
└───────────────┘     └───────────────┘     └───────────────┘
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                              ┌───────────────────┐
                              │     release       │
                              │  ─────────────────│
                              │  Upload firmware  │
                              │  to GitHub Release│
                              └───────────────────┘
```

### Jobs

| Job | Description | Durée estimée |
|-----|-------------|---------------|
| `test-mobile` | Lint (Biome) + Tests (Vitest) + Expo Doctor | ~2 min |
| `test-water` | Tests unitaires PlatformIO (GoogleTest) | ~1 min |
| `test-heater` | Tests unitaires PlatformIO (GoogleTest) | ~1 min |
| `build-mobile` | Build EAS Android (production) | ~10-15 min (async sur serveurs Expo) |
| `build-water` | Compilation firmware ESP32 | ~2 min |
| `build-heater` | Compilation firmware ESP32 | ~2 min |
| `release` | Upload des firmwares sur la release GitHub | ~30 sec |

### Artifacts

À la fin du workflow, la release GitHub contient :

| Artifact | Description |
|----------|-------------|
| `water-module-v{version}.bin` | Firmware ESP32 pour le module eau |
| `heater-module-v{version}.bin` | Firmware ESP32 pour le module chauffage |

Le build mobile est géré par EAS et disponible sur [expo.dev](https://expo.dev).

### Configuration requise

#### Secrets GitHub

| Secret | Description | Obtention |
|--------|-------------|-----------|
| `EXPO_TOKEN` | Token d'authentification EAS | [expo.dev/settings/access-tokens](https://expo.dev/accounts/[account]/settings/access-tokens) |

#### Ajout du secret

1. Aller dans **Settings** > **Secrets and variables** > **Actions**
2. Cliquer sur **New repository secret**
3. Nom : `EXPO_TOKEN`
4. Valeur : votre token EAS

### Créer une release

```bash
# 1. S'assurer que tous les tests passent localement
cd mobile-app && npm test
cd ../water-module && pio test -e local
cd ../heater-module && pio test -e local

# 2. Mettre à jour la version dans app.json (mobile)
# 3. Créer et pousser le tag
git tag v1.2.3
git push origin v1.2.3

# 4. Créer la release sur GitHub (optionnel, le workflow peut la créer)
gh release create v1.2.3 --title "Release v1.2.3" --generate-notes
```

---

## Licence

[MIT](LICENSE)
