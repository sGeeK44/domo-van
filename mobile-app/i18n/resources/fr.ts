/** The source of truth: the mockups are written in French. Keys read `<area>.<screen>.<element>`. */
export const fr = {
  common: {
    actions: {
      save: "Enregistrer",
      cancel: "Annuler",
    },
    state: {
      on: "ON",
      off: "OFF",
      yes: "Oui",
      no: "Non",
    },
    errors: {
      send: "Erreur lors de l'envoi.",
      read: "Erreur lors de la lecture.",
      notConnected: "Module non connecté.",
      disposed: "Module indisponible.",
    },
    feedback: {
      saved: "Configuration enregistrée",
      notAnswered: "Le module n'a pas confirmé",
      unreachable: "Module non joignable",
    },
  },

  link: {
    state: {
      online: "En ligne",
      offline: "Hors ligne",
      connecting: "Connexion…",
      neverConnected: "Jamais connecté",
      offlineAt: "Hors ligne · vu à {{time}}",
    },
    contact: {
      justNow: "Dernier contact à l'instant",
      minutes: "Dernier contact il y a {{value}} min",
      hours: "Dernier contact il y a {{value}} h",
      days: "Dernier contact il y a {{value}} j",
    },
    actions: {
      reconnect: "Reconnecter",
      reconnecting: "Reconnexion…",
    },
  },

  modules: {
    water: { name: "Module d'eau", tab: "Eau" },
    heater: { name: "Module de chauffage", tab: "Chauff" },
    battery: { name: "JK BMS", tab: "Batt" },
    list: {
      unpair: "Dissocier",
      unpairFailed: "La dissociation a échoué.",
    },
    add: {
      title: "Ajouter",
      scanning: "Recherche en cours…",
      scanned: "Recherche terminée",
      empty: "Aucun module trouvé.",
      rescan: "Relancer la recherche",
      pair: "Appairer",
      alreadyPaired: "Déjà appairé",
      slotTaken: "Emplacement occupé",
      scanFailed: "La recherche a échoué.",
      pairFailed: "L'appairage a échoué.",
    },
    unpair: {
      title: "Dissocier {{module}}",
      confirm: "Dissocier",
      warning:
        "L'emplacement redevient libre. Les réglages restent dans le module et reviennent s'il est appairé à nouveau.",
    },
    notice: {
      unpairedTitle: "Aucun module appairé",
      unpairedSubtitle: "Emplacement libre",
      unpairedBody: "Appairez ce module pour accéder à ses réglages.",
      offlineTitle: "Module hors ligne",
      offlineBody: "Les réglages s'affichent une fois le module reconnecté.",
    },
    admin: {
      restarted: "OK. Le module va redémarrer. Reconnecte-toi.",
      failed: "Erreur: {{message}}",
      nameLength: "Le nom doit faire entre 1 et 20 caractères.",
      nameCharset: "Caractères autorisés: A-Z, 0-9, espace, - et _.",
      pinDigits: "Le PIN doit contenir exactement 6 chiffres.",
    },
  },

  dashboard: {
    tab: "Bord",
    title: "Bord",
    addModule: "Ajouter un module",
    emptySlot: { hint: "Aucun module" },
    cards: {
      battery: "BATTERIE",
      cleanWater: "EAU PROPRE",
      greyWater: "EAU GRISE",
      heater: "CHAUFFAGE",
    },
    modules: {
      water: "EAU",
    },
    empty: {
      body: "Aucun module n'est associé. Ajoute un module pour voir ses niveaux ici.",
    },
    tiles: {
      interior: "INT",
      exterior: "EXT",
      humidity: "HUM",
      pressure: "hPa",
    },
    water: {
      cleanSubtitle: "{{liters}} L sur {{capacity}}",
      greySubtitle: "{{liters}} L avant plein",
    },
    heater: {
      zoneTarget: "{{zone}} · cible {{temperature}}",
      allStopped: "toutes zones à l'arrêt",
    },
    battery: {
      summary: "{{duration}} · {{voltage}} V · {{power}} W",
    },
  },

  water: {
    levels: {
      cleanTank: "PROPRE",
      greyTank: "GRISE",
      tankCaption: "cuve {{capacity}} L",
      cleanFooter: "{{percentage}} % de la cuve",
      greyFooter: "{{percentage}} % · {{remaining}} L avant plein",
      greyDrainingCaption: "se vide",
      greyDrainingFooter: "−{{liters}} L depuis {{time}}",
    },
    drain: {
      section: "VANNE DE VIDANGE",
      closed: "Fermée",
      slide: "GLISSER POUR OUVRIR",
      autoCloseHint: "Se referme seule après {{seconds}} s.",
      countdown: "FERMETURE AUTO DANS",
      remaining: "{{seconds}} s",
      closeNow: "FERMER MAINTENANT",
      toast: {
        opened: "Vanne ouverte",
        closedNow: "Vanne fermée",
        autoClosed: "Vanne refermée automatiquement",
      },
    },
    settings: {
      positiveInteger: "{{field}} doit être un nombre entier positif.",
      atMostFiveMinutes: "{{field}} doit être ≤ 300 secondes.",
    },
    feedback: {
      openFailed: "Erreur lors de l'ouverture de la vanne.",
      closeFailed: "Erreur lors de la fermeture de la vanne.",
    },
    identity: {
      crumb: "Eau",
      title: "Identité du module",
      intro:
        "Le nom sert à reconnaître le module dans la liste. Le PIN protège l'accès. Après enregistrement le module redémarre et se reconnecte seul.",
    },
    tanks: {
      crumb: "Eau",
      title: "Mesure des cuves",
      intro:
        "Le capteur mesure une distance ; il lui faut le volume et la hauteur intérieure de chaque cuve pour la convertir en litres.",
      note: "Volume et hauteur doivent être des entiers positifs. Durée de vanne ≤ 300 s.",
      cleanTank: "CUVE PROPRE",
      greyTank: "CUVE GRISE",
      volume: "VOLUME",
      emptyHeight: "HAUTEUR VIDE",
      valve: "VANNE DE VIDANGE",
      autoClose: "FERMETURE AUTO",
    },
  },

  heater: {
    zones: {
      title: "Chauffage",
      zone1: "Salon",
      zone2: "Chambre",
      zone3: "SdB",
      zone4: "Soute",
    },
    zone: {
      target: "cible {{temperature}}",
      stopped: "à l'arrêt",
    },
    presets: {
      nightMode: "Mode nuit",
      stopAll: "Tout arrêter",
    },
    toast: {
      nightOn: "Mode nuit — cibles abaissées",
      allStopped: "Toutes les zones arrêtées",
    },
    identity: {
      crumb: "Chauffage",
      title: "Identité du module",
      intro:
        "Le nom sert à reconnaître le module dans la liste. Le PIN protège l'accès. Après enregistrement le module redémarre et se reconnecte seul.",
    },
    pid: {
      crumb: "Chauffage",
      title: "Régulation PID",
      intro:
        "Chaque zone a ses propres coefficients. Kp corrige l'écart courant, Ki rattrape l'erreur accumulée, Kd amortit les à-coups.",
      card: "PID · {{zone}}",
      invalidGain: "Chaque coefficient doit être un nombre entre 0.01 et 100.",
    },
    feedback: {
      setpointFailed: "Erreur lors de la mise à jour de la consigne.",
      startFailed: "Erreur lors du démarrage du chauffage.",
      stopFailed: "Erreur lors de l'arrêt du chauffage.",
      pidFailed: "Erreur lors de la configuration PID.",
    },
  },

  battery: {
    overview: {
      title: "Batterie",
    },
    detail: {
      discharging: "DÉCHARGE · {{remaining}} / {{capacity}} Ah",
      charging: "CHARGE · {{remaining}} / {{capacity}} Ah",
      idle: "REPOS · {{remaining}} / {{capacity}} Ah",
      power: "à {{power}} W",
      voltage: "TENSION",
      current: "COURANT",
      cycles: "CYCLES",
      cells: "CELLULES · {{cells}}S",
      delta: "Δ {{millivolts}} mV",
      deltaBalancing: "Δ {{millivolts}} mV · équilibrage actif",
      cell: "C{{index}}",
      weakestCell: "C{{index}} min",
      mosfet: "MOSFET",
      probe1: "SONDE 1",
      probe2: "SONDE 2",
    },
    alarms: {
      none: "Aucune alarme. Tensions, températures et courants dans les seuils.",
      overvoltage: "Surtension",
      undervoltage: "Sous-tension",
      overcurrent_charge: "Surintensité en charge",
      overcurrent_discharge: "Surintensité en décharge",
      overtemp: "Température haute",
      undertemp: "Température basse",
      cell_imbalance: "Déséquilibre des cellules",
    },
    info: {
      crumb: "Batterie",
      title: "Informations batterie",
      intro:
        "Valeurs publiées par le BMS. L'application les lit, elle n'en modifie aucune.",
      note: "Lecture seule. Aucune de ces valeurs n'est modifiable depuis l'application.",
      charge: "CHARGE",
      state: "ÉTAT",
      voltage: "TENSION",
      current: "COURANT",
      capacity: "CAPACITÉ",
      remaining: "RESTANTE",
      nominal: "NOMINALE",
      cycles: "CYCLES",
      cells: "CELLULES",
      maxCell: "MAX",
      minCell: "MIN",
      delta: "ÉCART",
      temperatures: "TEMPÉRATURES",
      mosfet: "MOSFET",
      probe1: "SONDE 1",
      probe2: "SONDE 2",
    },
  },

  settings: {
    identity: {
      nameCard: "NOM DU MODULE",
      name: "NOM",
      pinCard: "CODE PIN",
      pin: "PIN À 6 CHIFFRES",
    },
    save: {
      blocked: "Corrige les champs en rouge avant d'enregistrer.",
      sent: "Configuration envoyée au module",
      refused: "{{field}} : valeur refusée par le module.",
      notConfirmed:
        "{{field}} : le module n'a pas confirmé. Configuration non appliquée.",
      unreachable: "{{field}} : module injoignable. Connecte-le et réessaie.",
      fields: {
        identity: "Identité du module",
        name: "Nom du module",
        pin: "Code PIN",
        cleanTank: "Cuve propre",
        greyTank: "Cuve grise",
        valve: "Vanne de vidange",
      },
    },
    title: "Réglages",
    groups: {
      modules: "MODULES",
      application: "APPLICATION",
    },
    rows: {
      editIdentity: "Modifier l'identité",
      water: "Eau",
      waterSubtitle: "volumes, hauteurs, vanne",
      heater: "Chauffage",
      heaterSubtitle: "coefficients PID par zone",
      battery: "Batterie",
      batterySubtitle: "informations, lecture seule",
    },
    language: {
      label: "Langue",
      fr: "FR",
      en: "EN",
    },
    theme: {
      label: "Thème",
      auto: "Auto",
      dark: "Sombre",
      light: "Clair",
    },
    version: "Domo-Van {{version}}",
  },
};
