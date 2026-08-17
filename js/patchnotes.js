// Patchnotes — was sich für den SPIELER geändert hat (A-054).
//
// WARUM DAS HIER EINE .js UND KEINE .md IST, obwohl der Auftrag
// `PATCHNOTES.md` nennt:
//
// Die Falle (1) desselben Auftrags verlangt „eigene Datenstruktur mit DE/EN
// je Eintrag, die durch die Übersetzungsprüfung als vollständig gilt“. Genau
// das kann eine Markdown-Datei nicht leisten:
//   - sie müsste zur Laufzeit geholt und geparst werden (ein Netzabruf mehr,
//     der scheitern kann -- für einen Textblock);
//   - `tests/sprache.test.js` prüft Tabellen und Quelltext, keine Fließtexte
//     aus einer Fremddatei. Eine fehlende englische Fassung fiele niemandem
//     auf, bis ein Tester sie vermisst.
// Als Datenmodul ist beides gelöst: die Struktur ERZWINGT ein `en` neben
// jedem `de`, und ein Test kann das nachrechnen.
//
// Diese Datei gehört zu den DATEN, nicht zum Anzeigetext -- wie data.js und
// welt.js. Sie läuft deshalb nicht durch `t()`: sie trägt beide Sprachen
// selbst. `tests/uebersetzung.mjs` nimmt sie aus demselben Grund aus.
//
// PFLEGE, ab jetzt Teil der Endroutine jedes Auftrags (siehe LEITFADEN):
// wer eine Version vergibt, schreibt hier eine Zeile dazu. Neueste zuoberst.
//
// SPRACHE: was hier steht, liest ein Tester -- kein Auftragskürzel, keine
// Funktionsnamen, keine Balancing-Interna. Die Spoiler-Linie ist die
// Erstklärung: was die sagt, darf hier stehen (Blitz, Schirm, Flut). Offene
// Design-Debatten und Zahlen aus der Balance gehören in den CHANGELOG.

export const PATCHNOTES = [
  {
    version: "1.27",
    de: [
      "Neu: der Bereich Development — Patchnotes, Roadmap und der Weg für Rückmeldungen an einem Ort.",
      "Das Feedback-Formular trägt jetzt auch deinen Browser ein, nicht nur die Versionsnummer.",
    ],
    en: [
      "New: the Development area — patch notes, roadmap and the way to send feedback, all in one place.",
      "The feedback form now fills in your browser as well, not just the version number.",
    ],
  },
  {
    version: "1.26",
    de: ["Die Gebäudegruppen sitzen wieder dicht unter ihrer Überschrift — der Leerraum dazwischen ist weg."],
    en: ["Building groups sit right below their heading again — the gap between them is gone."],
  },
  {
    version: "1.25",
    de: [
      "Die Ressourcenleiste ist wieder gleichmäßig: alle Kacheln einer Reihe sind gleich hoch.",
      "Wie schnell Nahrung verdirbt, steht jetzt im Tooltip der Kachel und im Handbuch statt dauerhaft in der Leiste.",
    ],
    en: [
      "The resource bar is even again: every tile in a row has the same height.",
      "How fast food spoils now sits in the tile's tooltip and in the manual instead of permanently in the bar.",
    ],
  },
  {
    version: "1.24",
    de: ["Die Lager-Kachel sagt, wie lange der Platz noch reicht — solange überhaupt etwas hineinfließt."],
    en: ["The storage tile tells you how long the space will last — as long as anything is flowing in."],
  },
  {
    version: "1.23",
    de: [
      "Ist das Lager voll, sagt die Ressourcenkachel es: was dann produziert wird, verfällt sofort.",
      "Vorher sah eine Fabrik aus, als liefe sie, und der Bestand blieb trotzdem bei null.",
    ],
    en: [
      "When storage is full, the resource tile says so: whatever is produced then is lost immediately.",
      "Before, a plant looked like it was running while the stock stayed at zero.",
    ],
  },
  {
    version: "1.22",
    de: ["Nur intern: das Veröffentlichen prüft sich jetzt selbst, bevor ein Paket entsteht."],
    en: ["Internal only: publishing now checks itself before a package is built."],
  },
  {
    version: "1.21",
    de: ["Ein Zeitsprung, der nicht durchlief, wächst nicht mehr über das Neuladen hinweg an."],
    en: ["A time jump that did not complete no longer keeps growing across reloads."],
  },
  {
    version: "1.20",
    de: [
      "Neu: kam die letzte Zeitaufholung nicht durch, fragt das Spiel beim Start, bevor es dieselbe Rechnung wiederholt.",
      "Der Ausweg verwirft nur die offene Zeit — dein Spielstand bleibt unangetastet.",
    ],
    en: [
      "New: if the last time catch-up did not finish, the game asks at startup before repeating the same computation.",
      "The way out discards only the open time — your save is untouched.",
    ],
  },
  {
    version: "1.19",
    de: ["Der Einstiegstext empfiehlt nichts mehr, was am Anfang gar nicht geht — geforscht wird erst mit einem Labor."],
    en: ["The intro text no longer suggests something impossible at the start — research needs a lab first."],
  },
  {
    version: "1.18",
    de: [
      "Die Zahlen auf einer Kachel sind jetzt ausdrücklich als Kosten beschriftet.",
      "Gesperrte Gebäude nennen ihre Bedingung auf der Kachel, mit Fortschritt – etwa „Braucht 60.000 Bevölkerung (aktuell 50.000)“.",
    ],
    en: [
      "The numbers on a tile are now explicitly labelled as cost.",
      "Locked buildings state their condition on the tile, with progress – e.g. “Needs 60,000 population (currently 50,000)”.",
    ],
  },
  {
    version: "1.17",
    de: [
      "Kolonieschiffe nehmen Siedler von der Heimatwelt mit — genau die kommen in der neuen Kolonie an.",
      "Geht das Schiff unterwegs verloren, sind die Menschen es auch.",
    ],
    en: [
      "Colony ships take settlers from the home world — exactly those arrive at the new colony.",
      "If the ship is lost on the way, so are the people.",
    ],
  },
  {
    version: "1.16",
    de: ["Nur intern: ein Messwerkzeug läuft statt in 25 Minuten in gut drei."],
    en: ["Internal only: one measurement tool now takes just over three minutes instead of 25."],
  },
  {
    version: "1.15",
    de: [
      "Galaxie- und Systemkarte lassen sich zoomen: Mausrad, Knöpfe, Ziehen, Doppelklick zurück zur Übersicht.",
      "Hineingezoomt trifft man endlich den Stern, den man anklicken will.",
    ],
    en: [
      "Galaxy and system map can be zoomed: mouse wheel, buttons, dragging, double-click back to the overview.",
      "Zoomed in, you finally hit the star you are aiming at.",
    ],
  },
  {
    version: "1.14",
    de: ["Testmodus: Zeitraffer ×2/×3/×4 und eine Pause, die auch ein Neuladen übersteht."],
    en: ["Test mode: time factor ×2/×3/×4 and a pause that survives a reload."],
  },
  {
    version: "1.13",
    de: ["Laufende Bauten, Forschungen und Werftaufträge füllen ihre Kachel als Fortschrittsfläche."],
    en: ["Running construction, research and shipyard orders fill their tile as a progress area."],
  },
  {
    version: "1.12",
    de: ["Bedienzeilen im ganzen Spiel stehen jetzt in denselben Spalten — Markt, Verarbeitung, Logistik, Tanken, Laden."],
    en: ["Control rows across the game now share the same columns — market, processing, logistics, refuelling, loading."],
  },
  {
    version: "1.11",
    de: ["Flottenrouten und Wiederholflüge sind von Anfang an frei; erforscht wird nur noch, was selbständig ENTSCHEIDET."],
    en: ["Fleet routes and repeat runs are available from the start; research is now only for what DECIDES on its own."],
  },
  {
    version: "1.10",
    de: ["Der Abspann erzählt, was aus der Galaxie geworden ist — nicht nur aus deinem Imperium."],
    en: ["The epilogue tells what became of the galaxy — not just of your empire."],
  },
  {
    version: "1.09",
    de: ["Piratengruppen haben Namen. Im Log liest sich ein Überfall nicht mehr wie eine Wetterlage."],
    en: ["Pirate groups have names. In the log a raid no longer reads like a weather report."],
  },
  {
    version: "1.08",
    de: ["Hotkeys für die Bereiche — und keiner davon kann etwas auslösen, was man nicht wollte."],
    en: ["Hotkeys for the areas — and none of them can trigger something you did not want."],
  },
  {
    version: "1.07",
    de: ["Die Forschungsanzeige zeigt den echten Fortschritt statt dauerhaft 0."],
    en: ["The research display shows real progress instead of a permanent 0."],
  },
  {
    version: "1.06",
    de: ["Die Werftstufe entscheidet, welche Schiffstypen du bauen kannst — der Ausbau ist eine Entscheidung geworden."],
    en: ["The shipyard level decides which ship types you can build — upgrading has become a decision."],
  },
  {
    version: "1.05",
    de: ["Kostenangaben zeigen das richtige Symbol je Ressource; „600 Metall / 300 Iridium“ war eine Verwechslung der Zeichen."],
    en: ["Cost displays show the correct symbol per resource; “600 metal / 300 iridium” was a mix-up of the icons."],
  },
  {
    version: "1.04",
    de: ["Nur intern: die Mechanik, an der die Demo hängt, hat wieder einen Wächter."],
    en: ["Internal only: the mechanic the demo depends on has a guard again."],
  },
  {
    version: "1.03",
    de: ["Nur intern: die Lagerfrage ist jetzt messbar."],
    en: ["Internal only: the storage question can now be measured."],
  },
  {
    version: "1.02",
    de: ["Reste einer Ladung bleiben liegen, statt zu verschwinden — außer sie sind so klein, dass sich das Holen nicht lohnt."],
    en: ["Leftovers of a cargo stay put instead of vanishing — unless they are too small to be worth collecting."],
  },
  {
    version: "1.01",
    de: ["Der Ein-Klick-Versand schickt Sonden, keine anderen Schiffe."],
    en: ["One-click dispatch sends probes, not other ships."],
  },
  {
    version: "1.0",
    de: ["Flotten bleiben, wo du sie hinschickst — sie fliegen nicht mehr von selbst zurück."],
    en: ["Fleets stay where you send them — they no longer fly home on their own."],
  },
  {
    version: "0.99",
    de: ["Das × zum Abbrechen steht vor dem Namen, und zwei Tooltips sagen wieder die Wahrheit."],
    en: ["The × to cancel sits before the name, and two tooltips tell the truth again."],
  },
  {
    version: "0.98",
    de: ["Eine laufende Forschung wirkt schon anteilig, statt erst am Ende — und die Kachel sagt es."],
    en: ["Research in progress already takes effect proportionally instead of only at the end — and the tile says so."],
  },
  {
    version: "0.97",
    de: ["Nur intern: zwei weitere Stellen rechnen jetzt mit der Ereigniszeit statt mit der Uhr."],
    en: ["Internal only: two more places now compute with the event time instead of the clock."],
  },
  {
    version: "0.96",
    de: ["Die Bauwarteschlange wartet auf fehlendes Material, statt den Auftrag abzulehnen."],
    en: ["The build queue waits for missing material instead of rejecting the order."],
  },
  {
    version: "0.95",
    de: ["Nahrung verdirbt. Ein Vorrat kann jetzt schrumpfen, obwohl die Bilanz positiv aussieht."],
    en: ["Food spoils. A stock can now shrink although the balance looks positive."],
  },
  {
    version: "0.94",
    de: ["Behoben: ein Spielstand konnte sich aufhängen und blieb es auch nach dem Neuladen."],
    en: ["Fixed: a save could hang and stayed that way even after reloading."],
  },
  {
    version: "0.93",
    de: ["Eine hängende Zeitaufholung meldet sich selbst, statt still zu bleiben."],
    en: ["A stuck time catch-up reports itself instead of staying silent."],
  },
  {
    version: "0.92",
    de: ["Elektronik: die zweite Verarbeitungskette. Silizium wird zu Bauteilen, und zwei Drittel gehen dabei verloren."],
    en: ["Electronics: the second processing chain. Silicon becomes components, and two thirds are lost in the process."],
  },
  {
    version: "0.91",
    de: ["Nach einem Versionswechsel führt ein Hinweis dorthin, wo steht, was neu ist."],
    en: ["After a version change, a note points to where the new things are listed."],
  },
  {
    version: "0.90",
    de: ["Handbuch: ein Abschnitt „Neuigkeiten & Roadmap“."],
    en: ["Manual: a “News & roadmap” section."],
  },
  {
    version: "0.89",
    de: ["Ein Rückkanal für Rückmeldungen, der die Versionsnummer selbst mitbringt."],
    en: ["A feedback channel that brings the version number along by itself."],
  },
  {
    version: "0.88",
    de: ["Lange Zeitsprünge frieren den Browser nicht mehr ein — gerechnet wird in Blöcken mit Bild dazwischen."],
    en: ["Long time jumps no longer freeze the browser — computation runs in blocks with a frame in between."],
  },
  {
    version: "0.87",
    de: ["Nur intern: eine Bremse gegen zu große Rechenblöcke."],
    en: ["Internal only: a brake against oversized computation blocks."],
  },
  {
    version: "0.86",
    de: ["Nur intern: die Ursache der Ruckler lag nicht dort, wo wir sie vermutet hatten."],
    en: ["Internal only: the cause of the stutters was not where we suspected it."],
  },
  {
    version: "0.85",
    de: ["Der Treibstoff heißt jetzt Deuterium — Tritium wäre physikalisch nicht förderbar."],
    en: ["The fuel is now called deuterium — tritium would not be minable in physical terms."],
  },
  {
    version: "0.84",
    de: [
      "Ein Ingame-Datum im Kopf: du siehst, wie viel Zeit vergangen ist.",
      "Gebäude sind nach Themen gruppiert.",
    ],
    en: ["An in-game date in the header: you can see how much time has passed.", "Buildings are grouped by theme."],
  },
  {
    version: "0.83",
    de: [
      "Die Flut trifft alle Fraktionen, nicht nur dich.",
      "Fremde Stützpunkte gehören ihren Erbauern.",
      "Kein Klick geht mehr in Listen verloren, die sich im Takt neu aufbauen.",
    ],
    en: [
      "The flood hits every faction, not only you.",
      "Foreign outposts belong to whoever built them.",
      "No more clicks are lost in lists that rebuild themselves every tick.",
    ],
  },
  {
    version: "0.82",
    de: ["Die erste Runde nach Tobis eigenem Demo-Test."],
    en: ["The first round after Tobi's own demo test."],
  },
];

// Die Roadmap (A-054). Quelle ist `AUFTRAEGE/ROADMAP.md`, gepflegt von der
// PLANUNG -- hier steht die Spiegelung, die der Browser lesen kann.
//
// Dass eine Spiegelung driften kann, ist bekannt und seit v0.90 gelöst:
// `npm run roadmapabgleich` vergleicht beide und gehört zur
// Veröffentlichungsroutine. Bewusst ein Werkzeug und kein Test -- die Quelle
// gehört der Planung, und ein Test würde in ihren Runden rot.
//
// „Kürzlich" gibt es hier nicht mehr: was war, steht in den Patchnotes
// darüber. Zwei Listen über dasselbe wären zwei Wahrheiten.
export const ROADMAP_PUNKTE = [
  {
    id: "bald",
    de: "Bald",
    en: "Soon",
    punkte: [
      { de: "Flotten direkt von der Karte kommandieren — alles auf einem Bildschirm", en: "Command fleets straight from the map — everything on one screen" },
      { de: "Energie bekommt eine echte Entscheidung: Brennstoff, Speicher als Puffer und eine zweite Kraftwerksart", en: "Energy gets a real decision: fuel, storage as a buffer, and a second type of power plant" },
      { de: "Die Versorgungskrise bekommt ihren Ausweg mit Preis", en: "The supply crisis gets its way out, at a price" },
      { de: "Forschung mit mehr Gewicht und mehr Auswahl", en: "Research with more weight and more choice" },
      { de: "Ein klarerer Ersteinstieg: wer man ist und was die Oberfläche zeigt", en: "A clearer first entry: who you are and what the interface shows" },
      { de: "Eine Planeten-Übersicht fürs Imperium", en: "A planet overview for the empire" },
    ],
  },
  {
    id: "spaeter",
    de: "Später",
    en: "Later",
    punkte: [
      { de: "Endliche Vorkommen — ⚠ dieser Schritt setzt Spielstände einmalig zurück", en: "Finite deposits — ⚠ this step resets saves once" },
      { de: "Lesbare Systemnamen statt Nummern", en: "Readable system names instead of numbers" },
      { de: "Verteidigung für Planeten", en: "Defences for planets" },
      { de: "Feineres Wirtschafts-Management (Produktions-Deckel, Prioritäten-Fenster)", en: "Finer economic management (production caps, priority panel)" },
      { de: "Oberfläche fürs Handy", en: "A phone-friendly interface" },
    ],
  },
];
