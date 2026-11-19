// Bundled title lists behind the Marvel, DC and Star Wars collections (what a fresh load shows and what
// stays when the backend is unreachable). The backend serves an admin-editable copy, see catalogConfig.ts.
// Generated from catalog-contract/franchise-lists.json, which a test keeps identical: change the JSON and
// regenerate instead of editing this file by hand. Entries are "ref" or "ref|title"; only timeline entries
// carry a title, because only the timeline keeps repeated titles (one entry per season of a series).
export type FranchiseEntry = { ref: string; title?: string };
export type FranchiseListTabs = {
  movie: FranchiseEntry[];
  series: FranchiseEntry[];
  timeline: FranchiseEntry[];
};

function parseEntries(raw: string[]): FranchiseEntry[] {
  return raw.map((entry) => {
    const [ref, ...title] = entry.split("|");
    return title.length ? { ref, title: title.join("|") } : { ref };
  });
}

export const bundledFranchiseLists: Record<string, FranchiseListTabs> = {
  "collection_franchise_marvel": {
    movie: parseEntries([
      "movie:106355", "movie:65294", "movie:50468", "movie:197467", "movie:197481", "movie:9626",
      "movie:10658", "movie:26881", "movie:26883", "movie:8867", "movie:13995", "movie:517485",
      "movie:26623", "movie:607", "movie:27460", "movie:36647", "movie:36657", "movie:36586",
      "movie:557", "movie:608", "movie:9480", "movie:36658", "movie:1927", "movie:7220", "movie:558",
      "movie:36648", "movie:9947", "movie:18882", "movie:9738", "movie:36668", "movie:1250",
      "movie:559", "movie:1979", "movie:1726", "movie:1724", "movie:13056", "movie:2080",
      "movie:23483", "movie:10138", "movie:10195", "movie:49538", "movie:1771", "movie:71676",
      "movie:76122", "movie:76535", "movie:24428", "movie:41154", "movie:1930", "movie:119569",
      "movie:68721", "movie:59859", "movie:76170", "movie:211387", "movie:76338", "movie:253980",
      "movie:259910", "movie:100402", "movie:102382", "movie:127585", "movie:118340", "movie:299969",
      "movie:207703", "movie:99861", "movie:102899", "movie:166424", "movie:379040", "movie:293660",
      "movie:271110", "movie:413279", "movie:246655", "movie:284052", "movie:441829", "movie:263115",
      "movie:283995", "movie:315635", "movie:343668", "movie:284053", "movie:505945", "movie:284054",
      "movie:299536", "movie:383498", "movie:363088", "movie:335983", "movie:299537", "movie:299534",
      "movie:320288", "movie:479455", "movie:429617", "movie:758025", "movie:647375", "movie:340102",
      "movie:497698", "movie:566525", "movie:580489", "movie:524434", "movie:634649", "movie:476669",
      "movie:526896", "movie:453395", "movie:616037", "movie:894205", "movie:505642", "movie:774752",
      "movie:640146", "movie:447365", "movie:609681", "movie:848538", "movie:634492", "movie:533535",
      "movie:912649", "movie:539972", "movie:822119", "movie:986056", "movie:617126", "movie:969681",
      "movie:1003596", "movie:911916", "movie:1003598", "movie:1386618", "movie:1827939",
    ]),
    series: parseEntries([
      "tv:15178", "tv:4552", "tv:648", "tv:13084", "tv:1449", "tv:4619", "tv:1403", "tv:69069",
      "tv:61550", "tv:42531", "tv:61889", "tv:38472", "tv:62126", "tv:69088", "tv:67195", "tv:62127",
      "tv:62285", "tv:68716", "tv:69629", "tv:67178", "tv:67466", "tv:66190", "tv:88987", "tv:114695",
      "tv:85271", "tv:88396", "tv:118924", "tv:84958", "tv:88329", "tv:212423", "tv:92749", "tv:92782",
      "tv:92783", "tv:114472", "tv:122226", "tv:138501", "tv:202555", "tv:114471", "tv:198178",
      "tv:213375",
    ]),
    timeline: parseEntries([
      "tv:241388|Eyes of Wakanda", "movie:1771|Captain America: The First Avenger",
      "movie:211387|Marvel One-Shot: Agent Carter", "tv:61550|Marvel's Agent Carter",
      "movie:299537|Captain Marvel", "movie:1726|Iron Man", "movie:10138|Iron Man 2",
      "movie:1724|Der unglaubliche Hulk",
      "movie:76535|Marvel One-Shot: A Funny Thing Happened on the Way to Thor's Hammer",
      "movie:10195|Thor", "movie:76122|Marvel One-Shot: The Consultant",
      "movie:24428|Marvel’s The Avengers", "movie:119569|Marvel One-Shot: Item 47",
      "movie:76338|Thor: The Dark Kingdom", "movie:68721|Iron Man 3",
      "movie:253980|Marvel One-Shot: All Hail the King",
      "movie:100402|The Return of the First Avenger", "movie:118340|Guardians of the Galaxy",
      "movie:283995|Guardians of the Galaxy Vol. 2", "tv:226976|I Am Groot – Staffel 1",
      "tv:226976|I Am Groot – Staffel 2", "tv:61889|Daredevil – Staffel 1",
      "tv:38472|Jessica Jones – Staffel 1", "movie:99861|Avengers: Age of Ultron",
      "movie:102899|Ant-Man", "tv:61889|Daredevil – Staffel 2", "tv:62126|Luke Cage – Staffel 1",
      "tv:62127|Iron Fist – Staffel 1", "tv:62285|The Defenders",
      "movie:271110|The First Avenger: Civil War", "movie:497698|Black Widow",
      "movie:413279|Marvel One-Shot: Team Thor", "movie:441829|Marvel One-Shot: Team Thor: Part 2",
      "movie:284054|Black Panther", "movie:315635|Spider-Man: Homecoming",
      "tv:67178|The Punisher – Staffel 1", "movie:284052|Doctor Strange",
      "tv:38472|Jessica Jones – Staffel 2", "tv:62126|Luke Cage – Staffel 2",
      "tv:62127|Iron Fist – Staffel 2", "tv:61889|Daredevil – Staffel 3",
      "movie:284053|Thor: Tag der Entscheidung", "movie:505945|Marvel One-Shot: Team Darryl",
      "tv:67178|The Punisher – Staffel 2", "tv:38472|Jessica Jones – Staffel 3",
      "movie:363088|Ant-Man and the Wasp", "movie:299536|Avengers: Infinity War",
      "movie:299534|Avengers: Endgame", "tv:84958|Loki – Staffel 1", "tv:91363|What If…? – Staffel 1",
      "tv:138505|Marvel Zombies", "tv:85271|WandaVision",
      "movie:566525|Shang-Chi and the Legend of the Ten Rings",
      "tv:88396|The Falcon and the Winter Soldier", "movie:429617|Spider-Man: Far From Home",
      "movie:524434|Eternals", "movie:634649|Spider-Man: No Way Home",
      "movie:453395|Doctor Strange in the Multiverse of Madness", "tv:88329|Hawkeye",
      "tv:92749|Moon Knight", "movie:505642|Black Panther: Wakanda Forever", "tv:122226|Echo",
      "tv:92783|She-Hulk: Die Anwältin", "tv:92782|Ms. Marvel", "movie:616037|Thor: Love and Thunder",
      "tv:114471|Ironheart", "movie:894205|Werewolf by Night",
      "movie:774752|The Guardians of the Galaxy Holiday Special",
      "movie:640146|Ant-Man and the Wasp: Quantumania", "movie:447365|Guardians of the Galaxy Vol. 3",
      "tv:114472|Secret Invasion", "movie:609681|The Marvels", "tv:84958|Loki – Staffel 2",
      "tv:91363|What If…? – Staffel 2", "movie:533535|Deadpool & Wolverine",
      "tv:138501|Agatha All Along", "tv:91363|What If…? – Staffel 3",
      "tv:202555|Daredevil: Born Again – Staffel 1", "movie:822119|Captain America: Brave New World",
      "movie:986056|Thunderbolts*", "movie:617126|The Fantastic Four: First Steps",
      "tv:198178|Wonder Man", "tv:202555|Daredevil: Born Again – Staffel 2",
      "movie:969681|Spider-Man: Brand New Day", "tv:213375|VisionQuest",
      "movie:1003596|Avengers: Doomsday",
    ]),
  },
  "collection_franchise_dc_universe": {
    movie: parseEntries([
      "movie:1924", "movie:8536", "movie:9531", "movie:11411", "movie:268", "movie:364", "movie:414",
      "movie:415", "movie:8854", "movie:314", "movie:272", "movie:561", "movie:1452", "movie:155",
      "movie:13183", "movie:20533", "movie:44912", "movie:49026", "movie:49521", "movie:209112",
      "movie:297761", "movie:297762", "movie:141052", "movie:297802", "movie:287947", "movie:475557",
      "movie:495764", "movie:464052", "movie:791373", "movie:436969", "movie:436270", "movie:414906",
      "movie:594767", "movie:298618", "movie:565770", "movie:572802", "movie:889737", "movie:800788",
    ]),
    series: parseEntries([
      "tv:12662", "tv:2287", "tv:10444", "tv:12072", "tv:4331", "tv:4532", "tv:236", "tv:31919",
      "tv:4515", "tv:4604", "tv:1469", "tv:18653", "tv:1412", "tv:60708", "tv:60735", "tv:60743",
      "tv:62688", "tv:62643", "tv:63174", "tv:68001", "tv:71663", "tv:71340", "tv:75450", "tv:79501",
      "tv:79240", "tv:80986", "tv:96195", "tv:95057", "tv:125474", "tv:110492", "tv:90802",
      "tv:195868", "tv:132750", "tv:194764",
    ]),
    timeline: parseEntries([
      "movie:297762|Wonder Woman", "movie:464052|Wonder Woman 1984", "movie:49521|Man of Steel",
      "movie:209112|Batman v Superman: Dawn of Justice", "movie:297761|Suicide Squad",
      "movie:141052|Justice League", "movie:791373|Zack Snyder's Justice League",
      "movie:297802|Aquaman", "movie:287947|Shazam!",
      "movie:495764|Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn)",
      "movie:436969|The Suicide Squad", "tv:110492|Peacemaker", "movie:436270|Black Adam",
      "movie:594767|Shazam! Fury of the Gods", "movie:298618|The Flash",
      "movie:572802|Aquaman and the Lost Kingdom",
    ]),
  },
  "collection_franchise_star_wars": {
    movie: parseEntries([
      "movie:1893", "movie:1894", "movie:12180", "movie:1895", "movie:348350", "movie:330459",
      "movie:11", "movie:1891", "movie:1892", "movie:140607", "movie:181808", "movie:181812",
    ]),
    series: parseEntries([
      "tv:114479", "tv:4194", "tv:203085", "tv:251091", "tv:105971", "tv:92830", "tv:60554",
      "tv:83867", "tv:82856", "tv:115036", "tv:114461", "tv:202879", "tv:79093", "tv:25", "tv:3478",
      "tv:63722", "tv:66837", "tv:66487", "tv:114478", "tv:202998", "tv:114969", "tv:288055",
      "tv:289411", "tv:72244", "tv:105106", "tv:71412", "tv:85536", "tv:124868", "tv:136429",
      "tv:197443", "tv:256901", "tv:289219",
    ]),
    timeline: parseEntries([
      "tv:114479|The Acolyte", "movie:1893|Star Wars: Episode I - The Phantom Menace",
      "movie:1894|Star Wars: Episode II - Attack of the Clones",
      "movie:12180|Star Wars: The Clone Wars", "tv:4194|Star Wars: The Clone Wars",
      "tv:203085|Star Wars: Tales of the Jedi",
      "movie:1895|Star Wars: Episode III - Revenge of the Sith",
      "tv:251091|Star Wars: Tales of the Empire", "tv:105971|Star Wars: The Bad Batch",
      "movie:348350|Solo: A Star Wars Story", "tv:92830|Obi-Wan Kenobi", "tv:60554|Star Wars Rebels",
      "tv:83867|Andor", "movie:330459|Rogue One: A Star Wars Story", "movie:11|Star Wars",
      "movie:1891|The Empire Strikes Back", "movie:1892|Return of the Jedi",
      "tv:82856|The Mandalorian", "tv:115036|The Book of Boba Fett", "tv:114461|Ahsoka",
      "tv:202879|Star Wars: Skeleton Crew", "tv:79093|Star Wars Resistance",
      "movie:140607|Star Wars: The Force Awakens", "movie:181808|Star Wars: The Last Jedi",
      "movie:181812|Star Wars: The Rise of Skywalker",
    ]),
  },
};
