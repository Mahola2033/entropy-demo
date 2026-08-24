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
    version: "0.4.0",
    de: [
      "Dies ist der vierte veröffentlichte Demo-Stand — elf Runden seit dem letzten. Kein Spielstand geht dabei verloren.",
      "Für alle, die mit vergrößerter Anzeige spielen: Die Kopfleiste bricht jetzt um, statt aus dem Fenster zu laufen. Wer bisher an Reset-Knopf und Testmodus nicht herankam, kommt heran.",
      "Neu beim Kolonisieren: Das Kolonieschiff hat zwei getrennte Laderäume — einen für die Kolonisten, einen für alles andere. Beide belädst du selbst, und die neue Kolonie bekommt nichts mehr geschenkt: Sie hat genau das, was du mitgeschickt hast. Wer ohne Nahrung landet, sieht seine Leute hungern.",
      "Die Nachbarn sind eigenständiger geworden. Fremde Imperien forschen ab sofort selbst — und profitieren nicht mehr stillschweigend von deiner Forschung. Außerdem sparen sie auf große Schritte wie eine Werft oder ein Kolonieschiff, statt immer nur das Billigste zu bauen.",
      "Kleinigkeiten: Jede Zahl trägt ihr Vorzeichen jetzt in der Farbe — Zugewinn grün, Abgang rot, Kosten mit Minus. Der Sonden-Knopf sagt vor dem Klick, dass Sonden nicht zurückkehren. Und mehrere Stellen, an denen Tooltips beim Draufhalten wieder verschwanden, bleiben jetzt stehen.",
    ],
    en: [
      "This is the fourth published demo build — eleven rounds since the last one. No save games are lost in the process.",
      "For anyone playing with a magnified display: the header bar now wraps instead of running off the window. If you could not reach the reset button and the test mode before, you can now.",
      "New when colonising: the colony ship has two separate holds — one for the colonists, one for everything else. You load both yourself, and the new colony gets nothing for free: it has exactly what you sent along. Land without food and you will watch your people starve.",
      "The neighbours have become more independent. Foreign empires now research on their own — and no longer quietly benefit from yours. They also save up for big steps such as a shipyard or a colony ship, instead of only ever building the cheapest thing available.",
      "Small things: every number now carries its sign in its colour — gains green, outgoings red, costs with a minus. The probe button says before you click that probes do not return. And several places where tooltips vanished again on hover now stay put.",
    ],
  },
  {
    version: "0.3.11",
    de: [
      "Fremde Imperien sparen jetzt gezielt auf große Schritte wie ihre Werft oder ein Kolonieschiff, statt sich mit der billigsten Mine in Reichweite zu begnügen – sie legen dafür nur einen Teil ihres Bestands zurück und bauen mit dem Rest ganz normal weiter.",
    ],
    en: [
      "Foreign empires now save up on purpose for big steps like their shipyard or a colony ship, instead of settling for whatever mine is cheapest nearby – they set aside only part of their stock for it and keep building normally with the rest.",
    ],
  },
  {
    version: "0.3.10",
    de: [
      "Der Schnellversand-Knopf für Sonden sagt jetzt auch, dass die Sonden nicht zurückkommen – bisher nannte er nur Anzahl und Treibstoff.",
    ],
    en: [
      "The probe quick-dispatch button now also says the probes won't come back – until now it only named the count and the fuel.",
    ],
  },
  {
    version: "0.3.9",
    de: [
      "Fremde Imperien bauen jetzt eigene Forschungslabore und erforschen ihren eigenen Techbaum – bisher stand ihnen das offen, aber keines hat je ein Labor gebaut.",
    ],
    en: [
      "Foreign empires now build their own research labs and advance their own tech tree – until now the option was there, but none of them ever actually built a lab.",
    ],
  },
  {
    version: "0.3.8",
    de: [
      "Fremde Imperien forschen jetzt für sich selbst statt heimlich von deiner Forschung mitzuprofitieren – ihre Förderrate, ihr Mehrverbrauch und ihre Frachtkapazität hängen ab jetzt an ihrem eigenen Stand, nicht an deinem.",
    ],
    en: [
      "Foreign empires now research for themselves instead of secretly riding along on yours – their yield rate, their extra consumption, and their cargo capacity now depend on their own standing, not on yours.",
    ],
  },
  {
    version: "0.3.7",
    de: [
      "Das Kolonieschiff bekommt einen Frachtraum und einen eigenen Kolonistenraum – beides beladen, wer will. Kolonisten zählen nicht gegen die Fracht. Nichts davon füllt sich mehr von selbst: eine neue Kolonie startet nur mit dem, was tatsächlich mitgeschickt wurde.",
    ],
    en: [
      "The colony ship now has a cargo hold and its own colonist quarters – load either as you see fit. Colonists don't count against the cargo. Nothing fills itself anymore: a new colony starts only with what was actually sent along.",
    ],
  },
  {
    version: "0.3.6",
    de: [
      "Die Roadmap im Development-Bereich zeigt jetzt die tatsächlich anstehenden Vorhaben — sechs Punkte unter „Bald“, die längst eingebaut waren, sind heraus und durch drei neue ersetzt.",
    ],
    en: [
      "The roadmap in the Development area now shows what's actually coming next — six items under “Soon” that had already shipped are gone, replaced by three new ones.",
    ],
  },
  {
    version: "0.3.5",
    de: [
      "Bei stark verkleinertem oder herausgezoomtem Fenster bricht die Testmodus-Leiste im Kopf jetzt in eine zweite Zeile um, statt über den rechten Rand hinauszuragen. Die Zeitsprung-, Zeitraffer- und Reset-Knöpfe waren dort zuvor mit keiner Nutzergeste erreichbar.",
    ],
    en: [
      "In a strongly shrunk or zoomed-out window, the test-mode bar in the header now wraps onto a second line instead of running off the right edge. The time-jump, time-scale, and reset buttons there used to be unreachable by any user gesture.",
    ],
  },
  {
    version: "0.3.4",
    de: [
      "Nur intern: Mehrere Stellen der Oberfläche verglichen ihren Anzeigetext mit dem, was der Browser zurückliefert – eine Quelle für Knöpfe, die im falschen Moment neu erzeugt werden. Alle gemessenen Stellen waren unauffällig, die Vergleichsart wurde trotzdem gegen die Falle abgesichert. Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: several parts of the interface compared their display text against what the browser hands back – a source of buttons getting rebuilt at the wrong moment. Every spot measured was fine, but the comparison itself was hardened against the trap anyway. Nothing changes for players.",
    ],
  },
  {
    version: "0.3.3",
    de: [
      "Nur intern: Das Skript, das eine Veröffentlichung vorbereitet, zeigte zuletzt fälschlich „keine neuen Änderungen“ an, obwohl mehrere Runden fertig waren – ein Zähler verglich Versionsnummern falsch. Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: the script that prepares a release was wrongly reporting \"no new changes\" even though several rounds were done – a counter compared version numbers incorrectly. Nothing changes for players.",
    ],
  },
  {
    version: "0.3.2",
    de: [
      "Neue Richtlinie für Zahlen mit Vorzeichen: Ein Zugewinn ist grün, ein Abgang ist rot – und zwar nur die Zahl samt Vorzeichen, nie der Text daneben. Baukosten zeigen jetzt dazu passend ein Minus, und ein laufender Verbrauch (z. B. Arbeitskraft) ist jetzt rot statt neutralgrau.",
    ],
    en: [
      "New rule for signed numbers: a gain is green, a drain is red – and only the number with its sign, never the label next to it. Build costs now show a minus to match, and ongoing consumption (e.g. labor) is now red instead of neutral gray.",
    ],
  },
  {
    version: "0.3.1",
    de: [
      "Die Übersicht eines Planeten nennt jetzt auch dann den vollen Namen eines gesperrten Gebäudes, wenn er für die schmale Spalte zu lang ist – als Tooltip beim Draufhalten, statt mitten im Wort abzureißen.",
    ],
    en: [
      "A planet's overview now shows the full name of a locked building even when it is too long for the narrow column – as a tooltip on hover, instead of cutting off mid-word.",
    ],
  },
  {
    version: "0.3.0",
    de: [
      "Dies ist der dritte veröffentlichte Demo-Stand — zwölf Runden seit dem letzten. Kein Spielstand geht dabei verloren.",
      "Das Größte zuerst: Die Bevölkerung wächst jetzt proportional zu sich selbst und zum Nahrungsüberschuss statt in festen Schritten — der Anfang bleibt zäh, später zieht es an. Passend dazu kostet ein Forschungsbonus ab sofort auch: Wer mehr herausholt, verbraucht mehr Energie und Material dafür.",
      "Behoben: Ein Planet, der mitten in einem Zeitsprung entsteht, bleibt nicht mehr eingefroren. Missionsknöpfe in der Systemansicht (Bergung, Erkundung) behalten ihren Hover-Zustand, sodass Tooltips endlich ankommen. Die aktive Stromvorrang-Stufe verliert ihre Kennzeichnung nicht mehr, wenn die Maus darüberfährt.",
      "Kleinigkeiten, die den Alltag angenehmer machen: Die Baukachel des Kraftwerks nennt seinen Deuteriumverbrauch, Frachtraum und Tank zeigen ihren Füllstand als Balken statt als Satz, und der Sonden-Schnellversand fliegt zuerst zum nächstgelegenen Ziel statt stur nach Orbitnummer.",
    ],
    en: [
      "This is the third published demo build — twelve rounds since the last one. No save games are lost in the process.",
      "The big one first: population now grows in proportion to itself and to the food surplus instead of in fixed steps — the start stays slow, later it picks up. To match, a research bonus now has a price: getting more out also uses more energy and materials.",
      "Fixed: A planet created in the middle of a time skip no longer stays frozen. Mission buttons in the system view (salvage, exploration) keep their hover state, so tooltips finally have a chance to appear. The active power-priority level no longer loses its marking when the mouse passes over it.",
      "Small things that make daily play nicer: The power plant's build tile names its deuterium consumption, cargo hold and fuel tank show their fill level as a bar instead of a sentence, and the probe quick-dispatch flies to the nearest target first instead of strictly by orbit number.",
    ],
  },
  {
    version: "0.2.12",
    de: [
      "Kacheln in der Systemansicht (Bergung, Erkundung und die anderen Missionsknöpfe) behalten jetzt zuverlässig ihren Hover-Zustand – vorher wurde der Knopf unter dem Mauszeiger heimlich jede Sekunde ausgetauscht, sodass ein Tooltip kaum je ankam.",
    ],
    en: [
      "Tiles in the system view (salvage, exploration, and the other mission buttons) now reliably keep their hover state – the button under the cursor used to be silently swapped out every second, so a tooltip rarely had a chance to appear.",
    ],
  },
  {
    version: "0.2.11",
    de: [
      "Nur intern: Ein einzelner, absichtlich rotstehender Testfall wurde stillgelegt (mit Begründung im Quelltext, statt einfach gelöscht) — er hatte die komplette Prüfkette samt Veröffentlichung blockiert. Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: A single, deliberately failing test was put on hold (with its reasoning kept in the source, instead of just deleting it) — it had been blocking the whole check chain and publishing. Nothing changes for players.",
    ],
  },
  {
    version: "0.2.10",
    de: [
      "Nur intern: Unser Design-Regelwerk wurde an drei Stellen nachgezogen (eine Regel zur reinen Beobachtung abgestuft, zwei neue Abschnitte ergänzt). Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: Our design rulebook was updated in three places (one rule downgraded to a plain observation, two new sections added). Nothing changes for players.",
    ],
  },
  {
    version: "0.2.9",
    de: [
      "Ein Forschungsbonus, der die Ausbeute einer Anlage erhöht, kostet jetzt auch mehr: mehr Energie- und Rohstoffbedarf (halb so stark wie der Ausbeute-Zuwachs), dafür etwas weniger Arbeitskraft. Ausgenommen ist die Stromerzeugung selbst – ein besserer Reaktor holt mehr Strom aus demselben Brennstoff, statt mehr davon zu verbrauchen.",
    ],
    en: [
      "A research bonus that boosts a facility's output now costs more too: higher power and material demand (half as strong as the output gain), but somewhat less labor. Power generation itself is exempt – a better reactor gets more electricity out of the same fuel instead of burning more of it.",
    ],
  },
  {
    version: "0.2.8",
    de: [
      "Nur intern: Der Verdacht, dass unser Weltsimulations-Messwerkzeug wegen des neuen Bevölkerungswachstums hängenbleibt, war falsch – die eigentliche Ursache lag in einer teuren Berechnung, die schon länger da war.",
    ],
    en: [
      "Internal only: The suspicion that our world-simulation measurement tool was hanging because of the new population growth turned out to be wrong – the real cause was an expensive calculation that had been there for longer.",
    ],
  },
  {
    version: "0.2.7",
    de: [
      "Frachtraum und Treibstofftank einer Flotte zeigen ihren Füllstand jetzt als Balken – genau wie das Lager, mit einem farbigen Segment je geladener Ware, statt als reiner Textsatz, der leicht übersehen wurde.",
    ],
    en: [
      "A fleet's cargo hold and fuel tank now show their fill level as a bar, just like storage does – one colored segment per cargo type, instead of a plain sentence that was easy to miss.",
    ],
  },
  {
    version: "0.2.6",
    de: [
      "Der Sonden-Schnellversand schickt seine Sonden jetzt immer zuerst zum nächstgelegenen aufzudeckenden Ort, statt sie stur nach Orbitnummer sortiert loszuschicken.",
    ],
    en: [
      "Quick probe launch now always sends its probes to the nearest undiscovered spot first, instead of strictly by orbit number.",
    ],
  },
  {
    version: "0.2.5",
    de: [
      "Die Baukachel des Kraftwerks zeigt jetzt an, wie viel zusätzlichen Brennstoff die nächste Ausbaustufe verbraucht – vorher stand dort nur Arbeitskraft und Energie.",
    ],
    en: [
      "The power plant's build tile now shows how much additional fuel the next upgrade will burn – it used to list only labor and power.",
    ],
  },
  {
    version: "0.2.4",
    de: [
      "Ein Planet, der während einer langen Abwesenheit neu entsteht (etwa eine neue Piratenbande oder eine frisch gegründete Kolonie), setzt seine Bevölkerung jetzt von Anfang an fort, statt für den Rest der Aufholung eingefroren zu bleiben.",
    ],
    en: [
      "A planet that comes into being during a long absence (a new pirate band, or a freshly founded colony) now continues its population from the moment it appears, instead of staying frozen for the rest of the catch-up.",
    ],
  },
  {
    version: "0.2.3",
    de: [
      "Bevölkerungswachstum orientiert sich jetzt am tatsächlichen Bestand: Eine große Welt wächst absolut schneller als eine kleine, nicht mehr um dieselbe feste Menge. Ein praller Nahrungsvorrat (mindestens ein Tag Reichweite) beschleunigt das Wachstum zusätzlich, bis zu einer biologisch begründeten Obergrenze.",
    ],
    en: [
      "Population growth now scales with the actual population: a large world grows faster in absolute numbers than a small one, instead of by the same fixed amount every time. A well-stocked food reserve (at least a day's worth) speeds growth up further, up to a biologically grounded ceiling.",
    ],
  },
  {
    version: "0.2.2",
    de: [
      "Die ausgewählte Stromvorrang-Stufe einer Kachel gibt beim Hovern jetzt eine eigene Rückmeldung, statt entweder ihre Kennzeichnung zu verlieren oder gar nicht zu reagieren.",
    ],
    en: [
      "The selected power-priority level on a tile now gives its own feedback on hover, instead of either losing its highlight or not reacting at all.",
    ],
  },
  {
    version: "0.2.1",
    de: [
      "Nur intern: Das Stylesheet ist jetzt nach Grundlagen und Komponenten sortiert statt nach gewachsenen Bereichen. Für Spieler ändert sich dadurch nichts (geprüft: alle berechneten Werte über 880 Elemente sind vorher/nachher identisch).",
    ],
    en: [
      "Internal only: The stylesheet is now sorted by foundation-before-components instead of by grown regions. Nothing changes for players (checked: every computed value across 880 elements is identical before and after).",
    ],
  },
  {
    version: "0.2.0",
    de: [
      "Dies ist der zweite veröffentlichte Demo-Stand. Die mittlere Ziffer zählt ab jetzt genau das: wie oft die Demo veröffentlicht wurde. Die 1.0 bleibt für die echte Veröffentlichung reserviert.",
      "Seit dem letzten Demo-Stand: Warnungen sind endlich lesbar (das Rot war zu dunkel), kleine Fenster schneiden die Oberfläche nicht mehr ab, sondern lassen sich scrollen, die Nahrungsrate rechnet den Verderb ehrlich mit, und der Laden-Knopf sagt, wenn es nichts zu laden gibt.",
    ],
    en: [
      "This is the second published demo build. From now on the middle digit counts exactly that: how often the demo has been published. 1.0 stays reserved for the real release.",
      "Since the last demo build: warnings are finally legible (the red was too dark), small windows no longer cut the interface off but scroll instead, the food rate honestly accounts for spoilage, and the load button says so when there is nothing to load.",
    ],
  },
  {
    version: "0.1.12",
    de: [
      "Die Nahrungsrate auf der Ressourcenleiste und in „Diese Welt in Zahlen“ zieht jetzt den Verderb ab: bei großem Vorrat kann sie im Minus stehen, obwohl die Farm mehr erntet, als die Bevölkerung isst -- vorher zeigte sie in diesem Fall fälschlich ein Plus, während der Vorrat schrumpfte.",
    ],
    en: [
      "The food rate on the resource bar and in “This World in Numbers” now accounts for spoilage: with a large stockpile it can show a minus even though the farm harvests more than the population eats -- it used to show a false plus in that case while the stockpile kept shrinking.",
    ],
  },
  {
    version: "0.1.11",
    de: [
      "Ein zu kleines Browserfenster schneidet die Oberfläche nicht mehr ab -- die Seite scrollt jetzt stattdessen, mit einem einmaligen Hinweis, wenn das passiert.",
    ],
    en: [
      "A browser window that's too small no longer cuts off the interface -- the page now scrolls instead, with a one-time note when that happens.",
    ],
  },
  {
    version: "0.1.10",
    de: [
      "Die Versionsnummer zählt ab jetzt anders: Sie sagt, der wievielte veröffentlichte Stand das hier ist, statt wie oft insgesamt gearbeitet wurde. Die große Zahl 1.0 bleibt für die echte Veröffentlichung reserviert -- dahin ist noch ein Stück Weg.",
    ],
    en: [
      "The version number now counts differently: it shows which published build this is, instead of how much work went into it overall. The big number 1.0 stays reserved for the real release -- there's still some way to go.",
    ],
  },
  {
    version: "1.80",
    de: [
      "Das Warnrot für Mangel-Anzeigen (Ressourcen, Energie, besetzte Orbits) ist jetzt heller und leichter zu lesen -- der alte Ton war auf dunklem Grund zu dunkel.",
    ],
    en: [
      "The warning red for shortage indicators (resources, energy, occupied orbits) is now brighter and easier to read -- the old tone was too dark against the dark background.",
    ],
  },
  {
    version: "1.79",
    de: [
      "Nur intern: Schriftgrößen, Abstände, Eckenradien und ein Teil der Farbwerte im Stylesheet laufen jetzt über benannte, einheitliche Skalen statt über einzeln getippte Zahlen. Für Spieler ändert sich dadurch nichts (geprüft: alle Verschiebungen liegen im Rahmen von 1-3 Pixeln).",
    ],
    en: [
      "Internal only: font sizes, spacing, corner radii and part of the color values in the stylesheet now run through named, consistent scales instead of individually typed numbers. Nothing changes for players (checked: every shift stays within 1-3 pixels).",
    ],
  },
  {
    version: "1.78",
    de: [
      "Nur intern: ein neuer automatischer Wächter vergleicht jede Kachel der Oberfläche mit ihrer verbindlichen Schablone und meldet Abweichungen, bevor sie ein Spieler sieht. Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: a new automatic guard compares every interface tile against its official template and flags mismatches before a player ever sees them. Nothing changes for players.",
    ],
  },
  {
    version: "1.77",
    de: [
      "Nur intern: ein neues Prüfwerkzeug misst das Stylesheet gegen zwei Fehlerarten, die früher unbemerkt blieben (eine Farbvariable, die ins Leere zeigt; eine Farbe, die nicht aus der Spielpalette stammt). Für Spieler ändert sich dadurch nichts.",
    ],
    en: [
      "Internal only: a new check measures the stylesheet against two kinds of error that used to slip through unnoticed (a color variable pointing nowhere; a color that isn't part of the game's palette). Nothing changes for players.",
    ],
  },
  {
    version: "1.76",
    de: [
      "Wer mit der Tastatur navigiert, sieht jetzt einen deutlichen Rahmen um das gerade ausgewählte Element.",
      "Wer in den Systemeinstellungen reduzierte Bewegung eingestellt hat, bekommt jetzt auch in Entropy weniger Animation.",
      "Nur intern: das Ingame-Datum zeigt wieder die vorgesehene, dezente Farbe (eine CSS-Variable griff ins Leere), und die Fortschrittsanzeige beim Aufholen der Zeit spricht jetzt die Farben des Spiels statt einer fremden Palette.",
    ],
    en: [
      "Keyboard navigation now shows a clear outline around the currently selected element.",
      "Players who have reduced motion set in their system settings now get less animation in Entropy too.",
      "Internal only: the in-game date shows its intended, muted color again (a CSS variable was pointing nowhere), and the time-catch-up progress display now speaks the game's own colors instead of a borrowed palette.",
    ],
  },
  {
    version: "1.75",
    de: [
      "Die Knöpfe „Laden“ und „Tanken“ im Hafen sperren sich jetzt, wenn strukturell nichts geht (Frachtraum voll, Lager leer, Tank voll, kein Deuterium) – und sagen dabei, woran es liegt.",
    ],
    en: [
      "The “Load” and “Refuel” buttons in port now lock themselves when nothing can structurally happen (cargo hold full, storage empty, tank full, no deuterium) – and say why.",
    ],
  },
  {
    version: "1.74",
    de: [
      "Das Werft-Zahlenfeld klemmt sich jetzt selbst auf die höchste Stückzahl, die dein Lager gerade trägt – eine Eingabe wie 999.999 zeigt sofort das wirklich Machbare, gebaut wird weiterhin nur per Klick auf „Bauen“.",
      "Die Kostensumme der Warteschlange heißt jetzt „Wartend zusammen“ – sie zählte schon immer nur die wartenden Aufträge, das steht jetzt auch da.",
      "Ein Rückbau, der Wohnraum unter deine aktuelle Bevölkerung drückt, warnt das jetzt vorher im Bestätigungs-Tooltip.",
      "Eine Auto-Route, die länger als einen Tag auf ihre Mindestbeladung wartet, meldet das jetzt einmal – kein Dauer-Spam, kein automatischer Abflug.",
    ],
    en: [
      "The shipyard quantity field now clamps itself to the highest count your storage currently supports – typing 999,999 immediately shows what's actually buildable, and building still only happens via the “Build” click.",
      "The queue's cost total is now labelled “Waiting total” – it always only counted the waiting orders, that's now stated as well.",
      "A demolition that would push housing below your current population now warns about it upfront in the confirmation tooltip.",
      "An auto-route that has been waiting for its minimum load for more than a day now reports it once – no repeated spam, no automatic departure.",
    ],
  },
  {
    version: "1.73",
    de: ["Das Handbuch erklärt jetzt, dass liegengebliebenes Material vor einem verschlossenen Vorkommen jederzeit bergbar bleibt – verschlossen ist nur die Quelle selbst."],
    en: ["The manual now explains that material left lying in front of a locked deposit stays salvageable at any time – only the source itself is locked."],
  },
  {
    version: "1.72",
    de: ["Nur intern: Zwei neue Wächter-Tests laufen jetzt gegen ein echtes DOM (jsdom) mit und schlagen sofort an, wenn ein Tooltip beim Neuzeichnen verworfen wird oder ein Klick nach einem Planetenwechsel die falsche Welt trifft."],
    en: ["Internal only: two new guard tests now run against a real DOM (jsdom) and fire immediately if a tooltip gets discarded on redraw, or a click after switching planets hits the wrong world."],
  },
  {
    version: "1.71",
    de: ["Nur intern: Das Übersetzungswerkzeug verwechselt CSS-Klassennamen nicht mehr mit deutschem Text und findet jetzt zusätzlich Umlaute, die als ae/oe/ue/ss statt ä/ö/ü/ß geschrieben wurden."],
    en: ["Internal only: the translation tool no longer mistakes CSS class names for German text, and now also finds umlauts spelled out as ae/oe/ue/ss instead of ä/ö/ü/ß."],
  },
  {
    version: "1.70",
    de: ["Nur intern: ein Zeittest lief unter Last gelegentlich falsch, weil er die Uhr zweimal las statt einmal — jetzt liest er sie nur noch einmal."],
    en: ["Internal only: a timing test occasionally misfired under load because it read the clock twice instead of once — it now reads it only once."],
  },
  {
    version: "1.69",
    de: [
      "Neu: Auto-Routen haben ein Feld „Abflug erst ab X % Beladung“. Die Route wartet dann am Ladehalt, bis genug zusammengekommen ist, statt halb leer loszufliegen – der Treibstoff hängt an der Strecke, nicht an der Fracht.",
      "0 % ist die Vorgabe und bedeutet: alles wie bisher. Bestehende Routen ändern ihr Verhalten nicht.",
      "Die Routenzeile sagt, worauf sie wartet („wartet auf Beladung: 60/80 %“). Senkst du die Schwelle, fährt die Flotte im selben Moment los.",
      "An einem Halt, der nur entlädt, gilt die Schwelle nicht – dort käme nie Fracht dazu.",
    ],
    en: [
      "New: auto-routes have a field “Depart only at X% load”. The route then waits at its loading stop until enough has piled up instead of leaving half empty – fuel is paid for the distance, not for the cargo.",
      "0% is the default and means: everything as before. Existing routes do not change their behaviour.",
      "The route line says what it is waiting for (“waiting for cargo: 60/80%”). Lower the threshold and the fleet leaves that very moment.",
      "At a stop that only unloads, the threshold does not apply – no cargo would ever arrive there.",
    ],
  },
  {
    version: "1.68",
    de: [
      "Behoben: Der Regler beim Beladen misst jetzt den FREIEN Frachtraum statt der Gesamtkapazität – begrenzt durch das, was im Lager liegt. Bisher tat ein Klick über der halbvollen Marke oft schlicht nichts, ohne ein Wort dazu.",
      "Behoben: Die Zahl neben dem Regler folgt sofort deiner Eingabe und geht nach dem Laden zusammen mit dem Regler auf null zurück. Bisher blieb sie stehen, bis man den Regler wieder anfasste.",
      "Tippst du eine genaue Menge, steht sie sofort daneben („genau 5.000“) – und über dem Ladbaren gleich gedeckelt. Was dasteht, lässt sich auch laden.",
      "Auch der Tank-Regler misst jetzt, was noch in den Tank passt, statt den Lagerbestand des Planeten.",
    ],
    en: [
      "Fixed: the loading slider now measures the FREE cargo space instead of total capacity – limited by what is in storage. Until now a click past the half-full mark often did nothing at all, without a word.",
      "Fixed: the number next to the slider follows your input right away and returns to zero together with the slider after loading. Until now it stayed put until you touched the slider again.",
      "Type an exact amount and it shows next to it at once (“exactly 5,000”) – already capped at what can be loaded. What it says is what you can load.",
      "The refuelling slider now measures what still fits in the tank, instead of the planet's storage.",
    ],
  },
  {
    version: "1.67",
    de: [
      "Behoben: Was von dir an einem verschlossenen Orbit liegt, kannst du jetzt bergen. Eine verglühte Sonde legt ihren Resttank dort ab – der war bisher unerreichbar, obwohl er nie zum verschlossenen Fund gehörte.",
      "Die Regel dahinter: Ein Schloss betrifft fremde Quellen und neue Ziele, nie deinen eigenen Besitz. Das Vorkommen darunter bleibt zu, bis du die Technik hast.",
      "Die Zeile am Orbit nennt jetzt, was dort liegengeblieben ist – und der Bergungsknopf steht daneben, statt dass ein Schloss den ganzen Orbit sperrt.",
    ],
    en: [
      "Fixed: anything of yours lying at a sealed orbit can now be salvaged. A burnt-out probe drops its remaining fuel there – until now that was out of reach, even though it never belonged to the sealed find.",
      "The rule behind it: a seal covers foreign sources and new targets, never your own property. The deposit underneath stays sealed until you have the technology.",
      "The orbit's line now names what was left behind – and the salvage button sits next to it, instead of a lock sealing the whole orbit.",
    ],
  },
  {
    version: "1.66",
    de: [
      "Neu: Gebäude lassen sich zurückbauen. Der schmale Knopf neben „Ausbauen“ reißt eine Stufe ab – der erste Klick fragt nach, der zweite tut es.",
      "Es gibt KEINE Erstattung: Was verbaut ist, ist verbaut. Zurück kommen Arbeitskraft und Strom der Stufe – gut, wenn dir beides woanders fehlt.",
      "Solange dieselbe Anlage gebaut wird oder in der Warteschlange steht, ist der Rückbau gesperrt. Brich den Auftrag ab (das erstattet), dann geht es.",
    ],
    en: [
      "New: buildings can be torn down a level. The narrow button next to “Upgrade” removes one level – the first click asks, the second does it.",
      "There is NO refund: what is built is spent. What you get back is the level's workforce and power – useful when you need either elsewhere.",
      "While the same facility is under construction or waiting in the queue, tearing down is blocked. Cancel the order (that does refund), then it works.",
    ],
  },
  {
    version: "1.65",
    de: [
      "Behoben: Der Schalter für die Deuterium-Anreicherung stand außerhalb seiner Kachel und lag über der Nachbarkachel – zu sehen war nur noch das Ende des Wortes.",
      "Die Zeile passt jetzt in die Kachel, in jeder Schalterstellung und auch bei schmalem Fenster. Die Kacheln einer Reihe bleiben gleich hoch.",
    ],
    en: [
      "Fixed: the switch for deuterium enrichment sat outside its tile and overlapped the neighbouring one – only the end of the word was visible.",
      "The row now fits inside the tile, in either switch position and in a narrow window too. Tiles in the same row keep the same height.",
    ],
  },
  {
    version: "1.64",
    de: [
      "Behoben: Im Handbuch-Abschnitt „Steuerung“ standen Umlaute als Behelfsschreibweise – „laesst“, „aendern“, „zurueck“, „schliesst“. Jetzt steht dort, was dort stehen soll.",
    ],
    en: [
      "Fixed: the “Controls” section of the manual spelled German umlauts the makeshift way. The German text now reads properly; the English wording is unchanged.",
    ],
  },
  {
    version: "1.63",
    de: [
      "Behoben: Im Fenster beim allerersten Start ließ sich die Sprache nicht umstellen – es liegt über dem Kopf, und die DE/EN-Knöpfe dort waren nicht anklickbar. Wer Englisch wollte, musste den deutschen Text erst wegklicken.",
      "Die Sprachwahl steht jetzt oben rechts im Fenster selbst. Ein Klick, und Text und Knöpfe sind sofort in der anderen Sprache – das Fenster bleibt offen und an derselben Stelle.",
    ],
    en: [
      "Fixed: the window shown at the very first start offered no way to change the language – it sits on top of the header, and the DE/EN buttons there could not be clicked. Anyone wanting English had to dismiss the German text first.",
      "The language choice now sits in the top right of the window itself. One click and both text and buttons switch – the window stays open and in place.",
    ],
  },
  {
    version: "1.62",
    de: [
      "Behoben: Eine Dauerroute mit vollem Frachtraum hat das Logbuch geflutet – in einer gemessenen Partie 49.234 Mal derselbe Satz. Alles Wichtige war damit aus den dreißig sichtbaren Zeilen geschoben.",
      "Wiederholt sich eine Meldung, zählt sie jetzt hoch, statt sich anzuhängen: „… – Frachtraum voll. (+499 weitere, zuletzt Jahr 3, Tag 22)“. Die jüngsten Zahlen bleiben dabei sichtbar.",
      "Kommt zwischendurch etwas anderes, beginnt eine neue Zeile – das Logbuch bleibt die Reihenfolge der Ereignisse.",
    ],
    en: [
      "Fixed: a standing route with a full hold flooded the log – 49,234 times the same line in one measured game. Everything that mattered had been pushed out of the thirty visible rows.",
      "A repeating message now counts up instead of piling up: “… – hold full. (+499 more, last on year 3, day 22)”. The most recent figures stay visible.",
      "If something else happens in between, a new row begins – the log stays the order of events.",
    ],
  },
  {
    version: "1.61",
    de: [
      "Neu: Deine Welt hat einen Namen. Ein neues Spiel zieht ihn aus einer Liste von dreißig – „Du führst genau eine Welt: Ilmar“ statt „Heimatwelt“.",
      "Umbenennen kannst du jede Welt, die dir gehört: im Bereich Planet ganz oben in „Diese Welt in Zahlen“, Feld ausfüllen und auf Umbenennen (oder Enter). Der neue Name steht danach überall – Kopfzeile, Planetenwahl, Karte, Meldungen.",
      "Wer schon spielt, behält seine „Heimatwelt“ – und kann sie ab jetzt taufen.",
      "Fremde Welten bleiben, wie sie heißen: Ihre Namen kommen aus der Weltgenerierung.",
    ],
    en: [
      "New: your world has a name. A new game draws it from a list of thirty – “You run exactly one world: Ilmar” instead of “Homeworld”.",
      "You can rename any world you own: in the Planet area at the top of “This world in numbers”, fill in the field and press Rename (or Enter). The new name then appears everywhere – header, planet picker, map, messages.",
      "If you are already playing, you keep your “Homeworld” – and can name it from now on.",
      "Foreign worlds keep their names: those come from the world generator.",
    ],
  },
  {
    version: "1.60",
    de: [
      "Behoben: Mit reingezoomtem Browser rutschten Teile der Oberfläche aus dem Bild – die Zoom-Knöpfe der Karten, die Kommandozeile, ganze Bedienzeilen. Sie waren nicht nur unsichtbar, sondern gar nicht mehr erreichbar: Die Seite selbst scrollt nicht.",
      "Jetzt geben die schmalen Spalten links und rechts nach, bevor das Spielfeld schrumpft, und bei engen Fenstern stehen die Kartenspalten untereinander statt nebeneinander. Passt trotzdem etwas nicht, lässt sich das Spielfeld seitwärts schieben.",
      "Bei normaler Fenstergröße ändert sich nichts – dieselbe Aufteilung wie bisher. Und die Schrift bleibt, wie sie war: kleiner gemacht wurden nur Spaltenbreiten, nicht der Text.",
    ],
    en: [
      "Fixed: with the browser zoomed in, parts of the interface slid out of view – the maps' zoom buttons, the command row, whole control rows. They were not merely invisible but genuinely out of reach: the page itself does not scroll.",
      "The narrow columns on the left and right now give way before the play area shrinks, and in narrow windows the map columns stack instead of sitting side by side. If something still does not fit, the play area can be scrolled sideways.",
      "At a normal window size nothing changes – the same layout as before. And the text stays as it was: only column widths were reduced, never the type.",
    ],
  },
  {
    version: "1.59",
    de: [
      "Neu: Die Warteschlange lässt sich umsortieren. Jede wartende Zeile hat zwei kleine Pfeile ▲▼ für einen Platz nach vorn oder hinten – und du kannst eine Zeile auch mit der Maus an eine beliebige Stelle ziehen.",
      "Der laufende Auftrag bleibt, wo er ist: Er ist bezahlt und angefangen. Wenn du ihn loswerden willst, nimm das × auf seiner Kachel.",
      "Was du umsortierst, gilt sofort – der nächste Auftrag startet in deiner neuen Reihenfolge. Das funktioniert in allen drei Warteschlangen: Bau, Forschung und Werft.",
    ],
    en: [
      "New: the queue can be reordered. Every waiting row has two small arrows ▲▼ to move it one place forward or back – and you can also drag a row anywhere with the mouse.",
      "The running order stays where it is: it is paid for and under way. If you want rid of it, use the × on its tile.",
      "Whatever you reorder takes effect immediately – the next order starts in your new sequence. This works in all three queues: construction, research and shipyard.",
    ],
  },
  {
    version: "1.58",
    de: [
      "Geändert: In der Werft gibt es statt „Bauen“ und „5×“ jetzt ein Zahlenfeld und einen Knopf. Trag ein, wie viele du willst – auch 12 oder 40.",
      "Kosten und Bauzeit auf der Kachel rechnen sofort mit deiner Zahl mit, noch bevor du klickst. Enter im Feld baut ebenfalls.",
      "Steht dort nichts Sinnvolles (leer, 0, ein Minus), sperrt der Knopf und sagt es – gebaut wird nur, was du wirklich eingetragen hast.",
    ],
    en: [
      "Changed: the shipyard now offers a number field and a single button instead of “Build” and “5×”. Enter as many as you want – 12 or 40 as well.",
      "Cost and build time on the tile follow your number immediately, before you even click. Pressing Enter in the field builds too.",
      "If the field holds nothing sensible (empty, 0, a minus sign), the button locks and says so – only what you actually entered gets built.",
    ],
  },
  {
    version: "1.57",
    de: [
      "Geändert: In der Ressourcenleiste steht das Symbol jetzt direkt vor seiner Zahl, statt in einer eigenen Spalte links daneben zu schweben. Der Name rückt dafür an den linken Rand.",
      "Das gilt für alle Kacheln beider Reihen – Vorräte wie Arbeitskraft, Energie, Forschung und Lager. Kachelgrößen und Höhe der Leiste bleiben gleich, es verrutscht nichts.",
    ],
    en: [
      "Changed: in the resource bar the symbol now sits directly in front of its number instead of floating in a column of its own to the left. The name moves to the left edge in its place.",
      "This applies to every tile in both rows – stocks as well as workforce, energy, research and storage. Tile sizes and the height of the bar stay the same, nothing shifts.",
    ],
  },
  {
    version: "1.56",
    de: [
      "Neu: Über der Warteschlange steht jetzt, was die wartenden Aufträge zusammen kosten – in derselben Schreibweise wie die Kostenzeile einer Kachel, mit dem ausgeschriebenen Text im Hinweisfenster.",
      "Gezählt wird nur, was noch WARTET. Der laufende Auftrag ist bereits bezahlt – das war schon immer so, jetzt sieht man auch, was noch aussteht.",
      "Gilt für Bauten und für die Werft. Die Forschung bekommt keine Zeile: Sie kostet kein Material, sondern die Arbeit deiner Labore.",
    ],
    en: [
      "New: above the queue you now see what the waiting orders cost together – in the same notation as a tile's cost line, with the written-out text in the tooltip.",
      "Only what is still WAITING counts. The running order has already been paid for – that was always the case, now you can also see what is still outstanding.",
      "This applies to buildings and to the shipyard. Research gets no such line: it costs no material, only the work of your laboratories.",
    ],
  },
  {
    version: "1.55",
    de: [
      "Behoben: Auf einer Kolonie tat der Knopf „Ausbauen“ scheinbar nichts. Tatsächlich kam der Klick an – er baute nur auf der falschen Welt: auf der Heimatwelt, samt ihrer Ressourcen.",
      "Der Grund: Die Gebäudekacheln bleiben beim Planetenwechsel stehen (das ist gewollt und hält die Anzeige ruhig). Ihr Knopf merkte sich dabei die Welt, die beim ersten Zeichnen offen war – und das ist immer die Heimatwelt.",
      "Jetzt liest der Knopf beim Drücken, welche Welt du gerade ansiehst. Dasselbe gilt für das Abbrechen-Kreuz auf der Kachel: Es bricht den Auftrag der gewählten Welt ab.",
      "Prüf deine Heimatwelt: Möglicherweise stehen dort Gebäude oder Warteschlangeneinträge, die du eigentlich auf einer Kolonie wolltest.",
    ],
    en: [
      "Fixed: on a colony the “Upgrade” button appeared to do nothing. The click did arrive – it just built on the wrong world: the home world, spending its resources.",
      "The reason: building tiles stay in place when you switch planets (that is deliberate and keeps the display steady). Their button, however, remembered the world that was open when it was first drawn – and that is always the home world.",
      "The button now reads which world you are looking at when you press it. The same goes for the cancel cross on the tile: it cancels the order of the selected world.",
      "Check your home world: it may hold buildings or queue entries you actually meant to place on a colony.",
    ],
  },
  {
    version: "1.54",
    de: [
      "Behoben: Die Hinweisfenster an den Ressourcenkacheln brauchten oft mehrere Anläufe – man musste die Maus mehrfach drauflegen, bis der Text kam.",
      "Der Grund war die Ressourcenleiste selbst: Sie wurde jede Sekunde komplett neu aufgebaut. Der Browser lässt einen Hinweis erst nach etwa einer Sekunde ruhigen Zeigers erscheinen – und verwarf ihn jedes Mal, wenn die Kachel darunter in genau dieser Sekunde ausgetauscht wurde.",
      "Jetzt bleiben die Kacheln stehen und bekommen nur frische Zahlen. Der Hinweis kommt beim ersten ruhigen Draufliegen. Gemessen in Firefox: vorher überlebte keine einzige der 17 Stellen mit Hinweistext eine Sekunde, jetzt alle 17.",
      "Zu sehen ist sonst nichts Neues – die Leiste zeigt dieselben Zahlen an derselben Stelle. Nur der Lagerbalken gleitet jetzt weich, statt zu springen.",
    ],
    en: [
      "Fixed: the hints on the resource tiles often took several attempts – you had to put the mouse on them repeatedly before the text appeared.",
      "The cause was the resource bar itself: it was rebuilt from scratch every second. A browser only shows a hint after about a second of a resting pointer – and it discarded that hint every time the tile underneath was replaced during exactly that second.",
      "The tiles now stay put and merely receive fresh numbers. The hint appears the first time you rest on it. Measured in Firefox: before, not a single one of the 17 places carrying a hint survived one second, now all 17 do.",
      "Nothing else looks different – the bar shows the same numbers in the same place. Only the storage bar now glides instead of jumping.",
    ],
  },
  {
    version: "1.53",
    de: [
      "Behoben: Die Kachel des Handelspostens zeigte ein Minus vor den Credits, obwohl der Posten auf einer bevölkerten Welt welche einbringt. Sie kannte nur seine Betriebskosten – die Abgaben, die er abrechnet, hängen an deiner Bevölkerung und standen deshalb nicht in der Vorschau.",
      "Jetzt steht dort, was die nächste Stufe unterm Strich bringt: auf einer Welt mit 50.000 Einwohnern „+71 cr/Jahr“ statt „−183 cr/Jahr“.",
      "Ein Minus kann weiterhin dastehen, und das ist Absicht: Die Betriebskosten wachsen schneller als die Abgaben. Unter rund 36.000 Einwohnern trägt sich schon die erste Stufe nicht, und jede weitere bringt weniger als die vorige – zu jeder Weltgröße gibt es eine beste Stufe.",
    ],
    en: [
      "Fixed: the trading post tile showed a minus in front of the credits, even though the post earns them on a populated world. It only knew its operating costs – the levies it collects depend on your population and were therefore missing from the preview.",
      "It now shows what the next level brings on balance: on a world of 50,000 inhabitants “+71 cr/year” instead of “−183 cr/year”.",
      "A minus can still appear, and that is deliberate: operating costs grow faster than the levies. Below roughly 36,000 inhabitants even the first level does not pay for itself, and every further level brings less than the one before – for every world size there is a best level.",
    ],
  },
  {
    version: "1.52",
    de: [
      "Behoben: Der Umschalter über den Meldungen zeigte unter „nur meine“ weiterhin fast alles – Bergungen fremder Flotten, Piraten in fremden Systemen, Ereignisse ohne jeden Bezug zu dir. Gemessen in einer Testgalaxie: von 30 Zeilen standen 27 fremde unter „nur meine“, jetzt keine einzige.",
      "Neu geregelt ist, was „meine“ heißt: Meldungen über deine Planeten, deine Flotten, deine Bauten und deine Wirtschaft. Alles Fremde bleibt unter „alles“ – der Knopf sagt weiterhin, wie viele Zeilen das gerade sind.",
      "Eine Ausnahme gibt es, und die ist Absicht: Weltereignisse wie der Blitz, die Erholung der Ozonschicht und die Teilchenflut stehen in BEIDEN Ansichten. Ein Filter darf niemanden die Rettung verpassen lassen.",
    ],
    en: [
      "Fixed: the toggle above the log still showed almost everything under “mine only” – salvage runs by foreign fleets, pirates in foreign systems, events with no connection to you at all. Measured in a test galaxy: 27 of 30 lines were foreign ones showing under “mine only”, now not a single one.",
      "What “mine” means is now defined: messages about your planets, your fleets, your construction and your economy. Everything foreign stays under “all” – and the button still says how many lines that currently is.",
      "There is one exception, and it is deliberate: world events such as the flash, the recovery of the ozone layer and the particle flood appear in BOTH views. A filter must never let anyone miss their rescue.",
    ],
  },
  {
    version: "1.51",
    de: [
      "Neu im Bereich Development: „Spielstand“. Dort holst du deinen Stand als Text heraus – kopieren oder als Datei speichern – und spielst ihn von dort auch wieder ein.",
      "Warum das wichtig ist: Dein Spielstand liegt im Speicher deines Browsers, und der gehört dem Browser. „Chronik beim Schließen löschen“, Privatmodus oder knapper Speicherplatz können ihn jederzeit entfernen – einem Tester ist genau das nach einem Neustart passiert.",
      "Das Einspielen ersetzt die laufende Partie und fragt vorher nach. Passt ein Text nicht, sagt es das und lässt deinen Stand in Ruhe; der bisherige Stand wandert zusätzlich in die Rettungs-Sicherung des Browsers.",
    ],
    en: [
      "New in the Development area: “Save game”. Pull your save out as text – copy it or store it as a file – and load it back from there.",
      "Why this matters: your save game lives in your browser's storage, and that belongs to the browser. “Clear history on close”, private mode or a shortage of space can remove it at any time – which is exactly what happened to one tester after a restart.",
      "Loading a save replaces the running game and asks first. If a text does not fit, it says so and leaves your save alone; the previous state is additionally moved to the browser's rescue backup.",
    ],
  },
  {
    version: "1.50",
    de: [
      "Nachgemessen: Der Zeitraffer rechnet ehrlich. Bei ×1, ×2, ×3 und ×4 kommt genau das heraus, was die angezeigte Rate über die vergangene Zeit verspricht -- über 300 einzeln geprüfte Takte hinweg, in zwei verschiedenen Ständen. Der Raffer bucht nichts doppelt.",
      "Zur Einordnung großer Sprünge: Die Sprung-Knöpfe sind Echtzeit-Äquivalente. „+1h“ holt eine ganze Echtzeitstunde nach -- im Zeitmaßstab der Demo sind das rund 9,9 Spieljahre auf einen Schlag. Zwei Klicks bringen also fast 20 Jahresraten, während zwei Minuten bei ×3 nur ein Jahr sind.",
    ],
    en: [
      "Measured and confirmed: the time lapse counts honestly. At ×1, ×2, ×3 and ×4 you get exactly what the displayed rate promises over the time that passed -- across more than 300 individually checked ticks, in two different save states. The time lapse books nothing twice.",
      "For context on large jumps: the jump buttons are real-time equivalents. “+1h” catches up a full real-time hour -- on the demo's time scale that is about 9.9 game years at once. Two clicks therefore bring almost 20 annual rates, while two minutes at ×3 are just one year.",
    ],
  },
  {
    version: "1.49",
    de: [
      "Behoben: Solange eine Ausbaustufe im Bau war, versprach die Kachel für die nächste Stufe zu viel -- am Kraftwerk „+11.520 MW“ statt der richtigen „+6.720 MW“, bei genau denselben Kosten daneben. Sie rechnete vom heutigen Stand aus statt von der Stufe, die dann steht.",
      "Die Vorschau zeigt jetzt in jeder Lage dieselbe Zahl: vor dem Bau, während des Baus und danach. Das gilt für Leistung, Produktion, Arbeitskraft und Wohnraum.",
    ],
    en: [
      "Fixed: while a level was under construction, the tile promised too much for the next one -- “+11,520 MW” on the power plant instead of the correct “+6,720 MW”, with exactly the same costs listed next to it. It calculated from today's level instead of the level that will be standing by then.",
      "The preview now shows the same number in every situation: before the build, during it and afterwards. That applies to output, production, workforce and living space.",
    ],
  },
  {
    version: "1.48",
    de: [
      "Behoben: Wer während eines laufenden Baus etwas einreihte, sah auf dessen Kachel nichts -- der Auftrag war eingereiht, nur sagte es niemand. Jede Kachel zeigt ihren wartenden Auftrag jetzt selbst: „wartet als Nr. 1 · startet in ~42 Tage“.",
      "Behoben: Nach einer Fertigstellung blieb der alte Auftragstext mit eingefrorener Restzeit an der Kachel hängen.",
      "Die Restzeit eines wartenden Auftrags läuft jetzt sauber herunter, statt zu springen -- sie rechnet mit dem laufenden Bau und den Bauzeiten davor. Bei Pause steht sie still.",
      "Das ✕ auf einer Kachel nimmt einen wartenden Auftrag aus der Schlange; auf dem laufenden bricht es ihn wie bisher ab.",
    ],
    en: [
      "Fixed: queueing something while a build was running showed nothing on its tile -- the order was queued, but nobody said so. Every tile now shows its waiting order itself: “waiting as no. 1 · starts in ~42 days”.",
      "Fixed: after a build finished, the old order text with its frozen remaining time stayed on the tile.",
      "The remaining time of a waiting order now counts down cleanly instead of jumping -- it is calculated from the running build plus the build times ahead of it. While paused it stands still.",
      "The ✕ on a tile takes a waiting order out of the queue; on the running one it cancels it as before.",
    ],
  },
  {
    version: "1.47",
    de: [
      "Nachgemessen: Dein Kraftwerk verbrennt genau so viel Deuterium, wie es soll -- bei jeder Last dieselbe Menge. Ein Reaktor zündet oder er zündet nicht; im Leerlauf spart er nichts.",
      "Die Brennstoff-Zeile der Energie-Kachel sagt jetzt, woran ihre Reichweite hängt: an der Ausbaustufe deines Kraftwerks. Jede weitere Stufe verbrennt mehr, und die genannte Reichweite gilt immer für die jetzige.",
      "Die Übersicht „Diese Welt in Zahlen“ nennt den Verbrauch neben der Reichweite -- damit die Dauer nachrechenbar ist statt geglaubt.",
    ],
    en: [
      "Measured and confirmed: your power plant burns exactly as much deuterium as it should -- the same amount at any load. A reactor either ignites or it does not; idling saves nothing.",
      "The fuel line on the power tile now says what its range depends on: the level of your power plant. Every further level burns more, and the range shown always holds for the current one.",
      "The “This world in numbers” overview names the consumption next to the range -- so the duration can be checked instead of believed.",
    ],
  },
  {
    version: "1.46",
    de: [
      "Neue Forschung: die Anreicherungstechnik. Sie gibt deinem Deuterium-Extraktor einen zweiten Betriebsmodus -- er trennt Deuterium aus Wasser, statt es zu fördern, und bezahlt mit Strom.",
      "Gedacht ist sie als Treibstoffquelle für die Flotte: Strom lässt sich nicht verschiffen, Deuterium schon. Als Energiequelle taugt sie nicht, und der Tauschkurs auf der Kachel sagt dir vorher, warum.",
      "Achtung: Der Strom für die Anreicherung geht auf dasselbe Konto wie die Förderung. Reicht er nicht, drosselt die ganze Anlage -- dann hast du am Ende weniger Deuterium als vorher.",
    ],
    en: [
      "New research: enrichment technology. It gives your deuterium extractor a second operating mode -- it separates deuterium from water instead of extracting it, and pays for it in power.",
      "It is meant as a fuel source for your fleet: power cannot be shipped, deuterium can. As an energy source it is no good, and the exchange rate on the tile tells you why beforehand.",
      "Careful: the power for enrichment comes out of the same budget as extraction. If it runs short, the whole facility throttles -- and you end up with less deuterium than before.",
    ],
  },
  {
    version: "1.45",
    de: [
      "Behoben: Der Schnellversand schrieb bei genau einem Ziel „1 Sonden losschicken“, und die Systemliste zählte Orbits in der Klammerform „Orbit(s)“. Beides sagt jetzt sauber die Einzahl.",
    ],
    en: [
      "Fixed: with exactly one target the quick dispatch said “Send 1 probes”, and the system list counted orbits as “orbit(s)”. Both now use a proper singular.",
    ],
  },
  {
    version: "1.44",
    de: [
      "Dein Kraftwerk verbrennt jetzt so viel Deuterium, wie es immer verbrennen sollte -- bisher war die Menge um den Faktor 50 zu klein. Der Startvorrat trägt damit rund zwei Tage statt hundert, und der Deuterium-Extraktor wird zur echten Entscheidung.",
      "Die Kachel und die Energie-Übersicht zeigen die neue Reichweite; wer rechtzeitig fördert, merkt nichts davon.",
    ],
    en: [
      "Your power plant now burns as much deuterium as it always should have -- until now the amount was 50 times too small. The starting stock therefore lasts about two days instead of a hundred, and the deuterium extractor becomes a real decision.",
      "The tile and the power overview show the new range; anyone who starts extracting in time will not notice a thing.",
    ],
  },
  {
    version: "1.43",
    de: [
      "Behoben: Galaxie- und Imperium-Kopf schrieben bei genau einem Stützpunkt „1 Stützpunkte“. Jetzt steht dort die Einzahl.",
    ],
    en: [
      "Fixed: with exactly one base, the galaxy and empire headers said “1 bases”. They now use the singular.",
    ],
  },
  {
    version: "1.42",
    de: [
      "Nur intern: Das Werkzeug, das diese Roadmap gegen die Liste der Planung abgleicht, benennt wieder die Stelle, an der eine Abweichung nachzuziehen ist.",
    ],
    en: [
      "Internal only: the tool that checks this roadmap against the planning list again names the place where a mismatch has to be fixed.",
    ],
  },
  {
    version: "1.41",
    de: [
      "Behoben: In einem älteren Spielstand konnte der erste Klick auf den Reserve-Regler, eine Lagerregel oder einen Logistik-Mindestbestand die Oberfläche stehenlassen. Alte Stände vertragen diese Regler jetzt.",
    ],
    en: [
      "Fixed: in an older save, the first click on the reserve slider, a storage rule or a logistics minimum could freeze the interface. Old saves now handle these controls.",
    ],
  },
  {
    version: "1.40",
    de: [
      "Fehlt dir für einen Ausbau noch Material, sagt die Kachel jetzt, wie lange deine eigene Produktion dafür braucht -- und wenn nichts nachkommt, sagt sie das statt einer Zahl.",
      "Besonders am Magnetfeldgenerator lohnt der Blick: seine Elektronik dauert bei einer kleinen Fertigung länger, als das Fenster nach dem Blitz offen steht.",
    ],
    en: [
      "If an upgrade is short of material, its tile now tells you how long your own production needs for it -- and if nothing is coming in, it says so instead of showing a number.",
      "It is worth a look at the magnetic field generator in particular: with a small fabrication plant its electronics take longer than the window after the flash stays open.",
    ],
  },
  {
    version: "1.39",
    de: [
      "Neu im Planet-Bereich: „Diese Welt in Zahlen“ -- ein fester Block über den Gebäuden mit Standort, Lager und Kapazitäten, Netto-Flüssen, Bevölkerung und den laufenden Aufträgen.",
      "Darin stehen jetzt auch alle noch offenen Freischalt-Schwellen mit Fortschritt: dass die Werft 60.000 Bevölkerung braucht, muss man nicht mehr auf ihrer Kachel suchen.",
    ],
    en: [
      "New in the planet view: “This World in Numbers” -- a fixed block above the buildings showing location, storage and capacities, net flows, population and the orders currently running.",
      "It also lists every unlock threshold you have not reached yet, with progress: you no longer have to hunt across tiles to learn that the shipyard needs 60,000 people.",
    ],
  },
  {
    version: "1.38",
    de: [
      "Neue Forschung: die Fertigungstechnik. Sie hebt die Ausbeute deiner Fertigungen um 7 % je Stufe -- die letzte Anlagenart, die bisher keine eigene Forschung hatte.",
    ],
    en: [
      "New research: manufacturing technology. It raises the yield of your manufacturing plants by 7% per level -- the last kind of facility without a research of its own.",
    ],
  },
  {
    version: "1.37",
    de: [
      "Forschung kostet jetzt Material: deine Labore verbrauchen laufend Silizium, ab Stufe 3 zusätzlich Elektronik. Der Bedarf entsteht nur, solange wirklich ein Projekt läuft — ein leeres Labor kostet nichts.",
      "Geht das Material aus, forschen die Labore langsamer statt gar nicht, und die Zeile über der Forschungsliste sagt, woran es liegt.",
    ],
    en: [
      "Research now costs material: your labs consume silicon continuously, and electronics from level 3 up. The demand only exists while a project is actually running — an idle lab costs nothing.",
      "If the material runs out, the labs research more slowly instead of not at all, and the line above the research list says what is missing.",
    ],
  },
  {
    version: "1.36",
    de: [
      "Drei Augenblicke erklären sich jetzt selbst, wenn sie eintreten: die erste Werft, die ersten Piraten in deinem System und der Blitz. Ein Klick auf die Meldung führt ins Handbuch, wo es weitergeht.",
      "Jede kommt genau einmal — und wer den Augenblick in einem älteren Spielstand längst hinter sich hat, bekommt sie nicht nachgereicht.",
    ],
    en: [
      "Three moments now explain themselves when they arrive: your first shipyard, the first pirates in your system, and the flash. Clicking the message takes you to the manual, where it continues.",
      "Each comes exactly once — and anyone whose older save is long past the moment does not get it after the fact.",
    ],
  },
  {
    version: "1.35",
    de: [
      "Das Startfenster sagt jetzt, was für ein Spiel das hier ist: eins für nebenbei. Der langsame Anfang ist Absicht und nicht dein Fehler.",
      "Neuer Handbuch-Abschnitt „Die Oberfläche\": was im Kopf steht, was die beiden Ressourcenreihen unterscheidet, wozu die Leiste links dient und was die Spalte rechts zeigt.",
      "Die Spalte rechts startet offen — dort stehen laufende Aufträge und Meldungen, und zugeklappt hat sie niemanden erreicht.",
    ],
    en: [
      "The opening window now says what kind of game this is: one for the side of your day. The slow start is on purpose, not your mistake.",
      "New manual section \"The screen\": what the header shows, what separates the two resource rows, what the bar on the left is for and what the column on the right displays.",
      "The column on the right now starts open — it holds running orders and messages, and folded away it reached nobody.",
    ],
  },
  {
    version: "1.34",
    de: [
      "Der +1-Tag-Knopf im Testmodus entfällt — die Sprünge bis +1 Stunde, der Zeitraffer und die Pause bleiben.",
    ],
    en: [
      "The +1 day button in test mode is gone — the jumps up to +1 hour, the time lapse and pause stay.",
    ],
  },
  {
    version: "1.33",
    de: [
      "Die Karte hat eine Kommandospalte: Flotte wählen, Ziel anklicken, Auftrag starten — alles nebeneinander, ohne den Bereich zu wechseln.",
      "Sie sagt vorher, was die Fahrt kostet, und tankt beim Losschicken selbst nach. Eine Vorschaulinie zeigt den Weg samt Flugdauer.",
      "Im Hafen führt ein „Verschicken\"-Knopf direkt dorthin, mit der Flotte schon eingestellt.",
    ],
    en: [
      "The map has a command column: pick a fleet, click a target, start an order — side by side, without switching areas.",
      "It tells you what the trip costs beforehand and tops up the tank on departure. A preview line shows the route and the flight time.",
      "In port a \"Send out\" button takes you straight there with the fleet already selected.",
    ],
  },
  {
    version: "1.32",
    de: [
      "Flotten lassen sich jetzt direkt auf der Karte anklicken — die gewählte Flotte trägt eine Raute, ein zweiter Klick wählt sie wieder ab. Fremde Flotten bleiben Anzeige.",
      "Um die gewählte Flotte zeigt die Galaxiekarte einen Reichweitenring: so weit trägt der Treibstoff, der gerade an Bord ist. Er wandert mit und schrumpft, sobald du losfliegst.",
    ],
    en: [
      "Fleets can now be selected directly on the map — the chosen fleet carries a diamond, a second click deselects it. Foreign fleets stay display-only.",
      "Around the selected fleet the galaxy map draws a range ring: as far as the fuel currently on board will carry it. It travels along and shrinks the moment you set off.",
    ],
  },
  {
    version: "1.31",
    de: [
      "Neues Gebäude: die Hydrokultur — Nahrung aus Kunstlicht, unabhängig von Sonne und Ozonschicht. Teuer im Strom: nach dem Blitz konkurrieren Essen und Schirm um dieselbe Steckdose.",
    ],
    en: [
      "New building: hydroponics — food from artificial light, independent of sun and ozone layer. Power-hungry: after the flash, food and shield compete for the same socket.",
    ],
  },
  {
    version: "1.30",
    de: [
      "Die Energie-Wahl: Das Kraftwerk verbrennt jetzt Deuterium aus dem Lager — ohne Brennstoff zündet die Fusion nicht, und der Reaktor springt erst mit frischem Vorrat wieder an. Die Energie-Kachel zeigt, wie lange dein Brennstoff trägt.",
      "Neues Gebäude: das Solarfeld. Billig, braucht keinen Brennstoff und liefert sternnah am meisten — aber ungeschirmte Felder überstehen die Teilchenflut nicht.",
      "Der Energiespeicher überbrückt Brennstofflücken: solange er geladen ist, laufen deine Anlagen weiter.",
      "Fremde Imperien kümmern sich jetzt selbst um ihren Brennstoff-Nachschub.",
    ],
    en: [
      "The energy choice: the power plant now burns deuterium from storage — without fuel the fusion does not ignite, and the reactor only restarts with fresh stock. The energy tile shows how long your fuel will last.",
      "New building: the solar field. Cheap, needs no fuel and yields the most close to the star — but unshielded fields do not survive the particle flood.",
      "The energy storage bridges fuel gaps: as long as it holds a charge, your facilities keep running.",
      "Foreign empires now take care of their own fuel supply.",
    ],
  },
  {
    version: "1.29",
    de: ["Gibt es ungelesene Neuigkeiten, trägt der Development-Knopf jetzt einen Punkt — er verschwindet, sobald du hineinschaust."],
    en: ["When there is unread news, the Development button now carries a dot — it disappears once you take a look."],
  },
  {
    version: "1.28",
    de: ["Nur intern: die Simulation findet ihr nächstes Ereignis jetzt ohne Suche durch die ganze Galaxie."],
    en: ["Internal only: the simulation now finds its next event without searching the whole galaxy."],
  },
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
      { de: "Treibstoff zählt die Masse: Was du lädst, kostet Reichweite — und nicht jedes Ziel ist von überall erreichbar", en: "Fuel counts the mass: what you load costs range — and not every destination is reachable from anywhere" },
      { de: "Tankstellen unterwegs: Reichweite wird zu einem Netz, das man sich baut", en: "Fuel stations along the way: range becomes a network you build" },
      { de: "Fremde Imperien werden unterschiedlich: manche wachsen, manche scheitern", en: "Foreign empires become different: some grow, some fail" },
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
