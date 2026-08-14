import type { fr } from "@/i18n/resources/fr";

/** A full translation, not a fallback: `typeof fr` makes a missing or stray key a type error. */
export const en: typeof fr = {
  common: {
    actions: {
      save: "Save",
      cancel: "Cancel",
    },
    state: {
      on: "ON",
      off: "OFF",
      yes: "Yes",
      no: "No",
    },
    errors: {
      send: "Sending failed.",
      read: "Reading failed.",
      notConnected: "Module not connected.",
      disposed: "Module unavailable.",
    },
    feedback: {
      saved: "Configuration saved",
    },
  },

  link: {
    state: {
      online: "Online",
      offline: "Offline",
      connecting: "Connecting…",
      neverConnected: "Never connected",
      offlineAt: "Offline · last seen at {{time}}",
    },
    contact: {
      justNow: "Last contact just now",
      minutes: "Last contact {{value}} min ago",
      hours: "Last contact {{value}} h ago",
      days: "Last contact {{value}} d ago",
    },
    actions: {
      reconnect: "Reconnect",
      reconnecting: "Reconnecting…",
    },
  },

  modules: {
    water: { name: "Water module", tab: "Water" },
    heater: { name: "Heater module", tab: "Heat" },
    battery: { name: "JK BMS", tab: "Batt" },
    list: {
      title: "Modules",
      unpair: "Unpair",
      freeSlot: "Free slot · pair one",
      unpairFailed: "Unpairing failed.",
    },
    add: {
      title: "Add",
      scanning: "Searching…",
      scanned: "Search complete",
      empty: "No module found.",
      rescan: "Search again",
      pair: "Pair",
      alreadyPaired: "Already paired",
      slotTaken: "Slot taken",
      scanFailed: "The search failed.",
      pairFailed: "Pairing failed.",
    },
    unpair: {
      title: "Unpair {{module}}",
      confirm: "Unpair",
      warning:
        "The slot becomes free again. The settings stay in the module and come back if it is paired again.",
    },
    notice: {
      unpairedTitle: "No module paired",
      unpairedSubtitle: "Free slot",
      unpairedBody:
        "Pair this module from the Modules screen to reach its settings.",
      offlineTitle: "Module offline",
      offlineBody: "The settings appear once the module is reconnected.",
    },
    admin: {
      section: "Administration",
      namePlaceholder: "Module name",
      saveName: "Save the name",
      pinLabel: "PIN (6 digits)",
      savePin: "Save the PIN",
      sendingName: "Sending the new name…",
      sendingPin: "Sending the new PIN…",
      restarted: "OK. The module is restarting. Reconnect to it.",
      failed: "Error: {{message}}",
      nameLength: "The name must be between 1 and 20 characters.",
      nameCharset: "Allowed characters: A-Z, 0-9, space, - and _.",
      pinDigits: "The PIN must be exactly 6 digits.",
    },
  },

  dashboard: {
    tab: "Home",
    title: "Home",
    addModule: "Add a module",
    emptySlot: { hint: "No module" },
    water: { label: "Clean water" },
    heater: {
      running: "Heating",
      stopped: "Off",
      setpoint: "> {{temperature}}°C",
    },
    battery: {
      consumption: "Draw:",
      remaining: "{{duration}} left",
      charging: "{{duration}} to charge",
    },
  },

  water: {
    levels: {
      title: "Water Levels",
      cleanTank: "CLEAN WATER",
      greyTank: "GREY WATER",
    },
    drain: {
      zone: "DRAIN ZONE",
      slide: "SLIDE TO DRAIN",
      autoClose: "Closing automatically in",
      closeNow: "CLOSE IMMEDIATELY",
      valveState: "Valve state:",
      open: "OPEN",
      closed: "CLOSED",
    },
    settings: {
      title: "Water",
      cleanTank: "Clean Water",
      greyTank: "Grey Water",
      tankSection: "Tank ({{tank}})",
      volume: "Volume",
      volumePlaceholder: "Volume (L)",
      height: "Height",
      heightPlaceholder: "Empty height (mm)",
      valveSection: "Drain Valve",
      duration: "Duration",
      durationPlaceholder: "Duration (seconds)",
      sending: "Sending configuration…",
      positiveInteger: "{{field}} must be a positive whole number.",
      greaterThanZero: "{{field}} must be > 0.",
      atMostFiveMinutes: "{{field}} must be ≤ 300 seconds.",
    },
    feedback: {
      autoCloseFailed: "Failed to update the auto-close delay.",
    },
  },

  heater: {
    zones: {
      title: "Heating",
      zone1: "Living",
      zone2: "Bedroom",
      zone3: "Bath",
      zone4: "Hold",
    },
    zone: {
      current: "current",
      setpoint: "target",
      target: "Target: {{temperature}}°C",
      running: "Running",
      stopped: "Stopped",
    },
    settings: {
      title: "Heating",
      zone1: "Cab",
      zone2: "Cabin",
      zone3: "Hold",
      zone4: "Garage",
      pidSection: "PID configuration - {{zone}}",
      savePid: "Save PID",
      sendingPid: "Sending PID configuration…",
      positiveNumber: "{{field}} must be a positive number.",
      range: "{{field}} must be between 0.01 and 100.",
    },
    feedback: {
      setpointFailed: "Failed to update the setpoint.",
      startFailed: "Failed to start heating.",
      stopFailed: "Failed to stop heating.",
      pidFailed: "Failed to save the PID configuration.",
    },
  },

  battery: {
    overview: {
      title: "Battery",
      placeholder: "Battery screen coming soon.",
    },
    settings: {
      title: "Battery",
      section: "Battery Information",
      charge: "State of charge",
      voltage: "Total voltage",
      current: "Current",
      power: "Power",
      mosTemperature: "MOS temperature",
      cell1Temperature: "Cell 1 temperature",
      cell2Temperature: "Cell 2 temperature",
      cellCount: "Cell count",
      minCellVoltage: "Min cell voltage",
      maxCellVoltage: "Max cell voltage",
      cellDelta: "Cell delta",
      cycles: "Cycles",
      capacity: "Capacity",
      charging: "Charging",
      discharging: "Discharging",
      balancing: "Balancing",
      balancingOn: "Active",
      balancingOff: "Inactive",
      alarms: "Alarms",
    },
  },
};
