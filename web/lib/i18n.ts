export type UiLanguage = "de" | "en";

const translations = {
  de: {
    home: "Startseite",
    search: "Suche",
    library: "Mediathek",
    liveTv: "Live-TV",
    settings: "Einstellungen",
    profileManagement: "Profile verwalten",
    addProfile: "Profil hinzufügen",
    cloudConnect: "Mit Cloud verbinden",
    manageProfiles: "Profile verwalten",
    done: "Fertig",
    play: "Wiedergabe",
    moreInfo: "Mehr Informationen",
    trailer: "Trailer",
    watched: "Gesehen",
    markWatched: "Als gesehen markieren",
    sources: "Quellen",
    findingSources: "Quellen werden gesucht ...",
    settingsLanguage: "Sprache & Audio",
    interfaceLanguage: "Oberflächensprache",
    accentColor: "Akzentfarbe",
    german: "Deutsch",
    english: "Englisch",
    loading: "Wird geladen ...",
    noResults: "Keine Ergebnisse",
  },
  en: {
    home: "Home",
    search: "Search",
    library: "Library",
    liveTv: "Live TV",
    settings: "Settings",
    profileManagement: "Manage profiles",
    addProfile: "Add profile",
    cloudConnect: "Connect to Cloud",
    manageProfiles: "Manage profiles",
    done: "Done",
    play: "Play",
    moreInfo: "More info",
    trailer: "Trailer",
    watched: "Watched",
    markWatched: "Mark as watched",
    sources: "Sources",
    findingSources: "Finding sources ...",
    settingsLanguage: "Language & Audio",
    interfaceLanguage: "Interface language",
    accentColor: "Accent color",
    german: "German",
    english: "English",
    loading: "Loading ...",
    noResults: "No results",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(language: UiLanguage, key: TranslationKey): string {
  return translations[language][key];
}
