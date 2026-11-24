// Per-profile app settings an admin may change remotely. The values match what the Android app and
// the web player write into `profileSettingsById`; devices pick a change up through the per-field
// timestamp (`fieldUpdatedAt`, "p:<profileId>:<field>"). Defaults are what the app uses while no
// value is stored for the profile.
const sizes = ["Small", "Normal", "Large", "Extra Large"];

const choice = (value, label) => ({ value, label });

// Offered in the app's audio language picker; "Auto (Original)" and "None" are special choices.
const audioLanguages = [
  "Auto (Original)", "None", "English", "Arabic", "Bengali", "Bulgarian", "Chinese", "Croatian", "Czech", "Danish",
  "Dutch", "Estonian", "Finnish", "French", "German", "Greek", "Gujarati", "Hebrew", "Hindi", "Hungarian",
  "Indonesian", "Italian", "Japanese", "Kannada", "Korean", "Lithuanian", "Malayalam", "Marathi", "Norwegian",
  "Persian", "Polish", "Portuguese", "Portuguese (Brazil)", "Punjabi", "Romanian", "Russian", "Serbian", "Slovak",
  "Slovenian", "Spanish", "Swedish", "Tamil", "Telugu", "Thai", "Turkish", "Ukrainian", "Vietnamese",
];
const audioLanguageLabels = { "Auto (Original)": "Automatisch (Original)", None: "Keine" };

// Regions of the app's streaming-region picker (ISO country codes).
const streamingRegions = [
  ["DE", "Deutschland"], ["AT", "Österreich"], ["CH", "Schweiz"], ["US", "USA"], ["GB", "Großbritannien"],
  ["FR", "Frankreich"], ["NL", "Niederlande"], ["BE", "Belgien"], ["ES", "Spanien"], ["IT", "Italien"],
  ["PT", "Portugal"], ["PL", "Polen"], ["SE", "Schweden"], ["NO", "Norwegen"], ["DK", "Dänemark"],
  ["FI", "Finnland"], ["IE", "Irland"], ["CA", "Kanada"], ["AU", "Australien"], ["BR", "Brasilien"],
  ["MX", "Mexiko"], ["TR", "Türkei"],
];

export const profileSettingGroups = [
  {
    id: "account",
    title: "Darstellung & Technik",
    scope: "account",
    settings: [
      { field: "skipProfileSelection", type: "boolean", default: false, label: "Profilauswahl überspringen", hint: "Startet direkt im zuletzt genutzten Profil." },
      { field: "dolbyVisionCompatEnabled", type: "boolean", default: true, label: "Dolby-Vision-Kompatibilität", hint: "Hilft bei Geräten, die Dolby Vision nicht sauber darstellen." },
      {
        field: "dnsProvider", type: "select", default: "system", label: "DNS-Anbieter",
        hint: "Hilft, wenn der Anbieter des Nutzers Adressen blockiert.",
        options: [choice("system", "System-DNS"), choice("cloudflare", "Cloudflare"), choice("google", "Google"), choice("adguard", "AdGuard")],
      },
    ],
  },
  {
    id: "playback",
    title: "Wiedergabe",
    settings: [
      { field: "autoPlayNext", type: "boolean", default: true, label: "Nächste Episode automatisch", hint: "Spielt nach einer Episode automatisch die nächste." },
      { field: "autoPlaySingleSource", type: "boolean", default: true, label: "Einzelne Quelle automatisch starten", hint: "Startet ohne Auswahl, wenn nur eine Quelle gefunden wird." },
      {
        field: "autoPlayMinQuality", type: "select", default: "Any", label: "Mindestqualität für Autoplay",
        options: [choice("Any", "Beliebig"), choice("720p", "720p"), choice("1080p", "1080p"), choice("4K", "4K")],
      },
      {
        field: "frameRateMatchingMode", type: "select", default: "Off", label: "Bildwiederholrate anpassen",
        hint: "Stellt den Fernseher auf die Bildrate des Videos ein.",
        options: [choice("Off", "Aus"), choice("Seamless only", "Nur nahtlos"), choice("Always", "Immer")],
      },
      {
        field: "volumeBoostDb", type: "select", valueType: "number", default: 0, label: "Lautstärke-Verstärkung",
        options: [0, 3, 6, 9, 12, 15].map((db) => choice(db, db === 0 ? "Aus" : `+${db} dB`)),
      },
      { field: "includeSpecials", type: "boolean", default: false, label: "Specials einbeziehen", hint: "Zeigt Staffel 0 (Extras) bei Serien." },
      { field: "spoilerBlurEnabled", type: "boolean", default: false, label: "Spoiler unscharf", hint: "Verbirgt Episodenbilder und -texte, die noch nicht gesehen wurden." },
    ],
  },
  {
    id: "subtitles",
    title: "Untertitel",
    settings: [
      {
        field: "subtitleSize", type: "select", default: "Medium", label: "Größe",
        options: [choice("Small", "Klein"), choice("Medium", "Mittel"), choice("Large", "Groß"), choice("Extra Large", "Sehr groß")],
      },
      {
        field: "subtitleColor", type: "select", default: "White", label: "Farbe",
        options: [choice("White", "Weiß"), choice("Yellow", "Gelb"), choice("Green", "Grün"), choice("Cyan", "Cyan")],
      },
      {
        field: "subtitleStyle", type: "select", default: "Bold", label: "Stil",
        options: [choice("Bold", "Fett"), choice("Normal", "Normal"), choice("Background", "Mit Hintergrund")],
      },
      {
        field: "subtitleOffset", type: "select", default: "Bottom", label: "Position",
        options: [choice("Bottom", "Ganz unten"), choice("Low", "Unten"), choice("Medium", "Mitte"), choice("High", "Oben")],
      },
      { field: "subtitleStylized", type: "boolean", default: true, label: "Gestaltete Untertitel", hint: "Übernimmt Stil-Angaben aus der Untertiteldatei." },
      { field: "filterSubtitlesByLanguage", type: "boolean", default: true, label: "Nach Sprache filtern" },
      { field: "subtitlePreloadEnabled", type: "boolean", default: true, label: "Untertitel vorladen" },
      { field: "subtitleRemoveHearingImpaired", type: "boolean", default: true, label: "Hinweise für Hörgeschädigte entfernen" },
    ],
  },
  {
    id: "ai-subtitles",
    title: "KI-Untertitel",
    settings: [
      { field: "subtitleAiEnabled", type: "boolean", default: false, label: "KI-Übersetzung aktiv", hint: "Der API-Schlüssel gehört zum Account und wird hier bewusst nicht angezeigt." },
      { field: "subtitleAiAutoSelect", type: "boolean", default: false, label: "Passenden Untertitel automatisch wählen" },
      { field: "subtitleAiFindBestMatch", type: "boolean", default: false, label: "Zuerst besten Treffer suchen" },
      {
        field: "subtitleAiModel", type: "select", default: "GROQ_LLAMA_70B", label: "Modell",
        options: [choice("GROQ_LLAMA_70B", "Groq (GPT-OSS 120B)"), choice("GEMINI_FLASH_25", "Gemini Flash")],
      },
    ],
  },
  {
    id: "home",
    title: "Home & Oberfläche",
    settings: [
      { field: "oledBlackBackground", type: "boolean", default: false, label: "Reines Schwarz (OLED)" },
      { field: "accentGradientBackground", type: "boolean", default: false, label: "Akzent-Verlauf im Hintergrund" },
      {
        field: "cardLayoutMode", type: "select", default: "Landscape", label: "Kartenformat",
        options: [choice("Landscape", "Quer"), choice("Poster", "Poster")],
      },
      {
        field: "accentColor", type: "select", default: "Orange", label: "Akzentfarbe",
        options: [["White", "Weiß"], ["Red", "Rot"], ["Orange", "Orange"], ["Yellow", "Gelb"], ["Green", "Grün"], ["Blue", "Blau"], ["Indigo", "Indigo"], ["Violet", "Violett"]]
          .map(([value, label]) => choice(value, label)),
      },
      { field: "clockFormat", type: "select", default: "24h", label: "Uhrzeit", options: [choice("24h", "24 Stunden"), choice("12h", "12 Stunden")] },
      { field: "smoothScrolling", type: "boolean", default: true, label: "Flüssigeres Scrollen", hint: "Weiche Übergänge beim Wechsel zwischen Reihen und Postern." },
      { field: "autoScrollHomeOverview", type: "boolean", default: false, label: "Beschreibung scrollt automatisch", hint: "Aus: Die Beschreibung wird mit … gekürzt." },
      { field: "showBudget", type: "boolean", default: true, label: "Budget anzeigen" },
      { field: "showCertification", type: "boolean", default: true, label: "Altersfreigabe anzeigen" },
      { field: "showEpisodeRatings", type: "boolean", default: true, label: "Episodenbewertungen anzeigen" },
      { field: "showLoadingStats", type: "boolean", default: true, label: "Ladestatistik anzeigen", hint: "Zeigt beim Start eines Streams technische Details." },
    ],
  },
  {
    id: "trailers",
    title: "Trailer",
    settings: [
      { field: "trailerAutoPlay", type: "boolean", default: false, label: "Trailer automatisch abspielen" },
      { field: "trailerSoundEnabled", type: "boolean", default: false, label: "Trailer mit Ton" },
      { field: "trailerInCards", type: "boolean", default: true, label: "Trailer in Karten" },
      {
        field: "trailerDelaySeconds", type: "select", valueType: "number", default: 2, label: "Verzögerung vor dem Start",
        options: [0, 1, 2, 3, 5].map((seconds) => choice(seconds, seconds === 0 ? "Sofort" : `${seconds} s`)),
      },
    ],
  },
  {
    id: "livetv",
    title: "Live TV",
    settings: [
      {
        field: "liveTvLayoutMode", type: "select", default: "streamnet", label: "Layout",
        options: [choice("streamnet", "StreamNet (Netflix-Stil)"), choice("classic", "Klassisch")],
      },
      ...[
        ["liveTvNetflixTitleSize", "Netflix-Layout: Titelgröße"],
        ["liveTvNetflixDescriptionSize", "Netflix-Layout: Beschreibungsgröße"],
        ["liveTvClassicTitleSize", "Klassisch: Titelgröße"],
        ["liveTvClassicDescriptionSize", "Klassisch: Beschreibungsgröße"],
      ].map(([field, label]) => ({
        field, type: "select", default: "Normal", label,
        options: sizes.map((size) => choice(size, { Small: "Klein", Normal: "Normal", Large: "Groß", "Extra Large": "Sehr groß" }[size])),
      })),
    ],
  },
  {
    id: "language",
    title: "Sprache & Region",
    settings: [
      {
        field: "contentLanguage", type: "select", default: "de-DE", label: "Inhalts- und App-Sprache",
        hint: "Sprache der Titel und Beschreibungen. Die App übernimmt sie auch für ihre Oberfläche.",
        options: [choice("de-DE", "Deutsch"), choice("en-US", "Englisch")],
      },
      {
        field: "streamingRegion", type: "select", default: "auto", label: "Streaming-Region",
        hint: "Land für die Streaming-Dienste. Automatisch folgt der Inhaltssprache.",
        options: [choice("auto", "Automatisch"), ...streamingRegions.map(([code, name]) => choice(code, name))],
      },
      {
        field: "defaultAudioLanguage", type: "select", default: "Auto (Original)", label: "Standard-Tonspur",
        options: audioLanguages.map((language) => choice(language, audioLanguageLabels[language] ?? language)),
      },
    ],
  },
];

const definitions = new Map(
  profileSettingGroups
    .flatMap((group) => group.settings.map((setting) => ({ ...setting, scope: group.scope ?? "profile" })))
    .map((setting) => [setting.field, setting]),
);

export function profileSettingDefinition(field) {
  return definitions.get(field) ?? null;
}

/** Account-wide settings live at the top of the snapshot and are stamped under "g:<field>". */
export function isAccountSetting(field) {
  return definitions.get(field)?.scope === "account";
}

/** The value as the app stores it. Known settings only accept their own choices; unknown fields pass through. */
export function validateProfileSettingValue(field, value) {
  const definition = definitions.get(field);
  if (!definition) return value;
  if (definition.type === "boolean") {
    if (typeof value !== "boolean") throw new Error(`Setting ${field} must be true or false`);
    return value;
  }
  const match = definition.options.find((option) => option.value === value);
  if (!match) throw new Error(`Setting ${field} has an unsupported value`);
  return match.value;
}
