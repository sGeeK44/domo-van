# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Domo-Van is a complete home automation system for a converted van, consisting of:
- **mobile-app**: React Native (Expo) Android app for control via Bluetooth Low Energy
- **water-module**: ESP32 firmware for water tank level monitoring and drain valve control
- **heater-module**: ESP32 firmware for 4-zone PID-controlled heating system
- **shared-libs**: C++ libraries shared between ESP32 modules (BLE, protocols, settings)

## Common Commands

### Mobile App (mobile-app/)
```bash
npm install          # Install dependencies
npm start            # Start Expo dev server
npm test             # Run Vitest tests
npm run test:watch   # Run tests in watch mode
npm run check        # Run Biome linter
npm run typecheck    # TypeScript type checking
npm run arch         # Enforce the layer dependency direction (dependency-cruiser)
```

### ESP32 Modules (water-module/ or heater-module/)
```bash
pio test -e local                           # Run all unit tests (GoogleTest)
pio test -e local -f test_filters           # Run specific test file
pio run -e local                            # Build for PC (native)
pio run -e esp32doit-devkit-v1              # Build for ESP32
pio run -e esp32doit-devkit-v1 -t upload    # Flash to ESP32
pio device monitor                          # Serial monitor (115200 baud)
```

## Architecture

### BLE Communication Protocol

All modules use a common UUID format: `b1f8707e-SSSS-CCCC-0000-00000000000X`
- `SSSS`: Service ID (0001=Water, 0002=Heater)
- `CCCC`: Channel ID (0001=Admin, 0002-XXXX=Module-specific)
- `X`: 0=TX (notify), 1=RX (write)

Payloads are ASCII strings, not binary. Commands end with `\n`.

### Mobile App Structure

The app is layered, one-way only: `core → domain → infrastructure → app`.
`npm run arch` enforces it and CI blocks the merge on a violation.
**Read `mobile-app/docs/architecture.md` before moving code between these
directories** — it holds the permission matrix and the rules of the road.

```
mobile-app/
├── app/              # Expo Router routes ONLY (a route re-exports a screen)
│   └── (tabs)/       # Tab navigator routes
├── screens/          # Page components
├── components/       # UI components organized by feature
├── design-system/    # Tokens, atoms, molecules, theme
├── composition/      # Composition root (createContainer, providers)
├── infrastructure/   # Port implementations (ble/, storage/)
├── domain/           # Business logic, ports/ and modules/ — zero framework import
└── core/             # Pure primitives (observable, core/react/)
```

Key patterns:
- `domain/*System.ts` classes compose channels into module APIs. They take a
  `ModuleTransport` (or a `BinaryTransport`) and never build one.
- `composition/createContainer.ts` is the only place that constructs an
  adapter; `composition/ModuleSystemsProvider.tsx` owns the systems' lifetime
  and exposes `useWaterSystem()` / `useHeaterSystem()` / `useBatterySystem()`.
- `infrastructure/ble/BlePlxChannel.ts` handles BLE read/write with base64
  encoding and newline-based message framing.
- `domain/modules/ModuleDescriptor.ts` is the module catalogue: keys, display
  names and the service UUID each module advertises.

### ESP32 Module Structure

```
{module}/
├── src/
│   ├── main_embedded.cpp  # ESP32 entry point
│   └── main_local.cpp     # PC simulation entry point
├── lib/                   # Business logic libraries
│   ├── program/           # High-level listeners (TankNotifier, HeaterListener)
│   ├── protocol/          # BLE protocol handlers
│   ├── sensors/           # Hardware drivers
│   └── settings/          # NVS persistence
└── test/                  # GoogleTest unit tests
```

Two PlatformIO environments:
- `local`: Native PC build with GoogleTest + ArduinoFake for testing
- `esp32doit-devkit-v1`: Real hardware build with NimBLE

### Shared Libraries (shared-libs/)

Contains common C++ code: BLE management, protocol parsing, ESP32 utilities, NVS settings, logging.

## Testing

- **Mobile**: Vitest + Testing Library (`npm test`). Four gates must stay
  green on every commit: `npm run check && npm run typecheck && npm test &&
  npm run arch`.
- **ESP32**: GoogleTest on native platform (`pio test -e local`)

## CI/CD

- Pull requests and pushes to `main` trigger CI: tests all modules, validates
  builds. `main` is protected and requires `test-mobile / Test Mobile App`.
- Tag push (`v1.2.3`) triggers release: builds firmware binaries, uploads to GitHub Release
- Mobile builds use EAS Build (Expo Application Services)

## Module-Specific Notes

### Admin channel (both ESP32 modules)
- `shared-libs/protocol/AdminProtocol.cpp` handles `PIN:<6 digits>`,
  `NAME:<name>` and `ID:NAME=<name>;PIN=<6 digits>`; anything else answers
  `ERR_UNKNOWN_CMD`.
- **`ID:` is the one to use for an identity change.** It persists both fields or
  neither and answers a single `OK` / `ERR_*`. `AdminListner.cpp` reboots the
  module on any `OK`, so sending `NAME:` then `PIN:` loses the second field.
- The channel answers no query, so a write here has **no readback** — a mobile
  timeout on it is final.

### Water Module
- Uses JSN-SR04T ultrasonic sensors with rolling median + EMA filtering
- Tank config via BLE: `CFG:V=<liters>;H=<mm>`, read back with `CFG?`
- Valve commands: `OPEN`, `CLOSE`

### Heater Module
- 4 independent PID-controlled zones with DS18B20 temperature sensors
- BME280 for indoor environment (temp/humidity/pressure)
- PID config via BLE: `CFG:KP=<kp>;KI=<ki>;KD=<kd>` (values x100), read back
  with `CFG?`
- Control: `START`, `STOP`, `SP:<celsius×10>`
