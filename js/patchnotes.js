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
