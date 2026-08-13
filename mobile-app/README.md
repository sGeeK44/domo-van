# Welcome to domovan mobile app

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Start the app without a van, Bluetooth off

   ```bash
   EXPO_PUBLIC_FAKE_BLE=1 npm start
   ```

   Every screen but *Batt* renders real data served by the fakes in
   `infrastructure/fake/` — Bord included, which no longer holds a hardcoded
   constant; *Batt* still reads "Écran batterie à venir." The install boots
   already paired, so the tab bar shows
   *Bord / Batt / Eau / Chauff* straight away. See
   [docs/architecture.md](docs/architecture.md#running-without-hardware) for
   what each module serves and how to add a scenario.

   Pairing is central: the gear on *Bord* opens *Modules*, which is where a
   module is paired, unpaired and reconnected. Unpair one there to watch its
   tab disappear and its dashed slot come back on the dashboard.

## Déploiement

Le projet utilise [EAS Build](https://docs.expo.dev/build/introduction/) pour générer les builds Android/iOS.

### Prérequis

```bash
npm install -g eas-cli
eas login
```

### Profils de build

| Profil | Usage | Format |
|--------|-------|--------|
| `development` | Dev avec expo-dev-client | APK |
| `preview` | Tests internes / beta | APK |
| `production` | Publication Play Store | AAB |

### Commandes

**Build de test (APK pour installation directe) :**

```bash
eas build --platform android --profile preview
```

**Build de production (AAB pour Play Store) :**

```bash
eas build --platform android --profile production
```

**Soumettre sur le Play Store :**

```bash
eas submit --platform android --profile production
```

### Gestion des versions

- La version affichée (`version`) est dans `app.json`
- Le `versionCode` Android s'incrémente automatiquement avec le profil `production`
- Pour incrémenter manuellement : modifier `versionCode` dans `app.json`
