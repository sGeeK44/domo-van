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
