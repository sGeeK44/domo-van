# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Global Rules

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 6 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 7 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 8 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Sub-Agent Strategy (Context Firewall)

The main agent **must not** perform direct codebase exploration, file searches, test runs, web lookups or code editing. All heavy-context work is delegated to sub-agents to keep the main context clean and focused on decision-making and user interaction.

### What to delegate

| Need                                                      | Delegate to                               | Output expected                                               |
| --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Codebase exploration (layers, patterns, similar features) | **Explore agent**                         | Short summary of findings — max 20 lines                      |
| Detailed code structure (classes, interfaces, signatures) | **Explore agent**                         | Relevant files, interfaces, key signatures                    |
| Finding test patterns / existing test files               | **Explore agent**                         | Test file paths + brief description of patterns               |
| Library/API documentation lookup                          | **Explore agent** with web search         | Relevant API surface, constraints, integration notes          |
| Web research (best practices, comparisons)                | **General-purpose agent** with web search | Concise findings with source links                            |
| Running linter, typechecker, or tests                     | **General-purpose agent**                 | Pass/fail + list of errors to fix (no raw logs)               |
| Iterative fix-and-test loops                              | **General-purpose agent**                 | Final status: all passing, or remaining errors with file:line |

### Sub-agent protocol

1. **Strict scope:** A single, well-defined objective (e.g., "Identify all deprecated API calls in /src").
2. **Output format:** Request a specific structure (e.g., "Return a bullet list of findings, max 15 lines").
3. **No file modification:** Instruct sub-agents NOT to modify files unless explicitly requested.
4. **Context firewall:** Do not import raw logs, intermediate thought process, or verbose tool outputs. Only integrate the **final validated result**.
5. **Summarize:** Once the sub-agent completes, summarize the outcome in one sentence and resume the primary goal.
6. **Parallelism:** Launch independent sub-agents in parallel when possible (e.g., codebase exploration + web research).

## Memory

Use memory only to store current user preference. Else find another way to memorise need that will be shared by all teamate of thaat repository.


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

### Water Module
- Uses JSN-SR04T ultrasonic sensors with rolling median + EMA filtering
- Tank config via BLE: `CFG:V=<liters>;H=<mm>`
- Valve commands: `OPEN`, `CLOSE`

### Heater Module
- 4 independent PID-controlled zones with DS18B20 temperature sensors
- BME280 for indoor environment (temp/humidity/pressure)
- PID config via BLE: `CFG:KP=<kp>;KI=<ki>;KD=<kd>` (values x100)
- Control: `START`, `STOP`, `SP:<celsius×10>`
