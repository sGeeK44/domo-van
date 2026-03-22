# Politique de confidentialité — Domo Van

**Date d'entrée en vigueur : 22 mars 2026**

## 1. Présentation

Domo Van est une application mobile de contrôle domotique pour vans aménagés. Elle permet de piloter des modules embarqués (eau, chauffage, batterie) via Bluetooth Low Energy (BLE).

## 2. Données collectées

**Domo Van ne collecte aucune donnée personnelle.**

L'application ne demande pas et ne stocke pas :
- Nom, prénom, adresse e-mail ou tout autre identifiant personnel
- Localisation géographique
- Contacts ou données du téléphone
- Données de navigation ou d'utilisation transmises à des serveurs tiers

## 3. Données traitées localement

Les seules données manipulées par l'application sont les données techniques de vos modules embarqués, traitées **uniquement sur votre appareil** :

- Niveaux des réservoirs d'eau
- Températures, consignes de chauffage et paramètres PID
- Données de batterie (tension, courant, état de charge)
- Adresses BLE et noms des appareils appairés (stockés localement sur votre téléphone via le stockage sécurisé du système)

Ces données ne quittent jamais votre appareil et ne sont jamais transmises à des serveurs.

## 4. Permissions Android

L'application demande les permissions suivantes, nécessaires au fonctionnement du Bluetooth :

| Permission | Utilisation |
|---|---|
| `BLUETOOTH` | Connexion aux modules BLE |
| `BLUETOOTH_ADMIN` | Gestion des connexions BLE |
| `BLUETOOTH_SCAN` | Détection des modules à proximité |
| `BLUETOOTH_CONNECT` | Échange de données avec les modules |
| `ACCESS_FINE_LOCATION` | Requise par Android pour le scan BLE (Android < 12) |

La permission de localisation est uniquement requise par le système Android pour autoriser le scan Bluetooth. L'application ne détermine ni n'utilise votre position géographique.

## 5. Services tiers

Domo Van n'intègre aucun service tiers de publicité, d'analytique ou de suivi (pas de Google Analytics, Firebase, Facebook SDK, ou équivalent).

## 6. Sécurité

Les identifiants des appareils BLE appairés sont stockés dans le stockage sécurisé du système d'exploitation (`expo-secure-store`), chiffré par les mécanismes natifs Android.

## 7. Enfants

Cette application n'est pas destinée aux enfants de moins de 13 ans et ne collecte sciemment aucune donnée les concernant.

## 8. Modifications

En cas de modification de cette politique, la date d'entrée en vigueur sera mise à jour. Les changements significatifs seront mentionnés dans les notes de version de l'application.

## 9. Contact

Pour toute question relative à cette politique :

**GitHub** : [github.com/sgeek44-corp/domo-van](https://github.com/sgeek44-corp/domo-van)
