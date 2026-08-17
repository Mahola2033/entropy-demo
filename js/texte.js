// Übersetzungstabelle Deutsch -> Englisch.
//
// Der deutsche Text IST der Schlüssel (siehe sprache.js). Ein Eintrag hier
// bedeutet: "wo im Quelltext t('<links>') steht, erscheint im Englischen
// <rechts>". Fehlt ein Eintrag, bleibt der deutsche Text stehen -- unschön,
// aber nie kaputt.
//
// tests/sprache.test.js durchsucht den Quelltext nach allen t("...")-Aufrufen
// und nach den Namen/Beschreibungen in data.js und stellt sicher, dass jede
// davon hier steht. Eine vergessene Übersetzung ist damit ein roter Test und
// kein deutscher Satz im englischen Spiel.
//
// Platzhalter in geschweiften Klammern müssen in beiden Sprachen dieselben
// Namen tragen, dürfen aber die Reihenfolge wechseln -- im Englischen
// passiert das regelmäßig.

export const EN = {
  // --- Ressourcen ---------------------------------------------------------
  Metall: "Metal",
  Silizium: "Silicon",
  Deuterium: "Deuterium",
  Iridium: "Iridium",
  Antimaterie: "Antimatter",
  Credits: "Credits",
  Nahrung: "Food",
  Bevölkerung: "Population",
  Arbeitskraft: "Workforce",
  Energie: "Power",

  // Einheiten und Größenkürzel
  Mio: "M",
  Mrd: "B",
  Bio: "T",

  // Zeit. Angezeigt wird in Spieltagen und Spieljahren -- eine Sekunde am
  // Bildschirm ist ein Tag in der Welt (ZEIT in data.js).
  "unter 1 Tag": "under 1 day",
  "1 Tag": "1 day",
  "{n} Tage": "{n} days",
  "{n} Jahre": "{n} years",
  "/Jahr": "/yr",
  "steht still": "at a standstill",
  "genaue Menge": "exact amount",
  "Flotte hierher in den Hafen schicken": "Send the fleet here into port",
  Umbenennen: "Rename",
  "Neuen Namen übernehmen": "Apply the new name",
  "Name dieser Flotte. Reine Beschriftung – ändert nichts an ihren Fähigkeiten.":
    "Name of this fleet. Pure labelling – it changes nothing about its capabilities.",
  "Der Name darf nicht leer sein.": "The name must not be empty.",
  "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler.":
    "Exact amount instead of a percentage. Whatever stands here overrides the slider.",

  // --- Gebäude ------------------------------------------------------------
  Metallmine: "Metal Mine",
  Siliziummine: "Silicon Mine",
  Kraftwerk: "Power Plant",
  Lagerhalle: "Warehouse",
  "Deuterium-Extraktor": "Deuterium Extractor",
  Werft: "Shipyard",
  Iridiummine: "Iridium Mine",
  Antimateriefabrik: "Antimatter Plant",
  Forschungslabor: "Research Lab",
  Handelsposten: "Trading Post",
  Magnetfeldgenerator: "Magnetic Field Generator",
  "Hält ein künstliches Magnetfeld um diese Welt und lenkt geladene Teilchen ab. Braucht dauerhaft rund ein Terawatt – fällt der Strom, fällt der Schirm. Zum Vergleich: der Geodynamo der Erde setzt für dasselbe etwa dieselbe Leistung um.":
    "Holds an artificial magnetic field around this world and deflects charged particles. Needs about a terawatt continuously – if the power fails, the shield fails. For comparison: Earth’s geodynamo turns over roughly the same for the same job.",
  Agrarkuppel: "Agri-Dome",
  Wohnmodul: "Habitat Module",

  "Fördert Metall aus der Kruste. Sternnahe Welten sind metallreicher, weil ihnen die leichten Stoffe früh weggekocht wurden – Merkur besteht zu einem auffällig großen Teil aus Eisen.":
    "Extracts metal from the crust. Worlds close to their star are richer in metal because the light material was boiled away early on – Mercury is made up of a strikingly large share of iron.",
  "Baut Silizium für Bauteile und Elektronik ab. Sauerstoff und Silizium sind die beiden häufigsten Elemente jeder Gesteinskruste – neun Zehntel davon sind Silikate.":
    "Mines silicon for components and electronics. Oxygen and silicon are the two most common elements in any rocky crust – nine tenths of it is silicates.",
  "Fusionsreaktor. Die Reaktion setzt schnelle Neutronen frei – ungeladen, also nur schwer abzuschirmen und nur als Wärme erntbar. Deshalb steckt in jedem Kraftwerk ein Dampfkreislauf, so altmodisch das klingt.":
    "Fusion reactor. The reaction releases fast neutrons – uncharged, therefore hard to shield and harvestable only as heat. That is why every power plant contains a steam cycle, however old-fashioned that sounds.",
  "Erhöht die Lagerkapazität aller lagerbaren Ressourcen.": "Increases storage capacity for all stockpiled resources.",
  "Gewinnt Deuterium aus Wasser – der Treibstoff, ohne den keine Flotte fliegt. Schwerer Wasserstoff ist stabil und steckt überall dort, wo Wasser ist: in jedem sechstausendsten Wasserstoffkern, in Eis, in Ozeanen, in feuchtem Gestein.":
    "Extracts deuterium from water – the fuel without which no fleet flies. Heavy hydrogen is stable and sits wherever water does: in every six-thousandth hydrogen nucleus, in ice, in oceans, in damp rock.",
  "Ermöglicht den Schiffbau. Höhere Stufen bauen schneller.":
    "Enables shipbuilding. Higher levels build faster.",
  "Fördert Iridium. In der Kruste ist es fast nicht vorhanden: Iridium bindet an Eisen und ist bei der Entstehung des Planeten mit ihm in den Kern gesunken. In Asteroiden liegt es hundertfach dichter – die Iridiumschicht am Ende der Kreidezeit stammt von einem.":
    "Mines iridium. There is almost none in the crust: iridium binds to iron and sank into the core with it while the planet formed. Asteroids carry it a hundred times more densely – the iridium layer at the end of the Cretaceous came from one.",
  "Erzeugt Antimaterie aus Energie. Der Wirkungsgrad ist miserabel und bleibt es – Antimaterie ist kein Brennstoff, sondern der dichteste Speicher, den die Physik kennt: 9 × 10¹⁶ Joule je Kilogramm umgesetzter Masse, das Zehnmillionenfache von chemischem Sprengstoff.":
    "Manufactures antimatter from power. The efficiency is dismal and always will be – antimatter is not a fuel but the densest storage medium physics knows: 9 × 10¹⁶ joules per kilogram of converted mass, ten million times chemical explosive.",
  "Erzeugt Forschung, solange es Strom, Menschen und Laborbedarf hat. Ohne Labor forscht niemand – Erkenntnis entsteht nicht aus Vorräten, sondern aus laufender Arbeit.":
    "Produces research as long as it has power, people and lab supplies. Without a lab nobody researches – knowledge does not come from stockpiles but from work being done.",
  "Handelt mit fremden Imperien in Reichweite und zieht Abgaben aus der eigenen Bevölkerung. Gekaufte Ware muss von einer Flotte abgeholt werden. Die Abgaben wachsen mit Bevölkerung und Stufe, die Betriebskosten überlinear mit der Stufe – zu jeder Weltgröße gibt es deshalb eine beste Stufe. Unter rund 36.000 Einwohnern trägt sich schon die erste nicht.":
    "Trades with foreign empires in range and levies dues from its own population. Purchased goods must be collected by a fleet. Dues grow with population and level, running costs grow faster than linearly with level – so every world size has a best level. Below roughly 36,000 inhabitants even the first one does not pay for itself.",
  "Erzeugt Nahrung. Ohne sie schrumpft die Bevölkerung, sobald der Vorrat aufgebraucht ist. Pflanzen setzen nur etwa ein Prozent des einfallenden Lichts in Biomasse um – Landwirtschaft braucht deshalb vor allem Fläche und Licht, nicht bessere Technik.":
    "Produces food. Without it the population shrinks once the stockpile runs out. Plants turn only about one percent of incoming light into biomass – so farming needs area and light above all, not better technology.",
  "Schafft Platz für mehr Bevölkerung. Ohne freien Wohnraum wächst niemand nach. Ein Mensch atmet rund 0,8 Kilogramm Sauerstoff am Tag – ein geschlossener Kreislauf muss ihn zurückgewinnen, sonst wäre jede Kolonie eine Dauerlieferung.":
    "Creates room for more population. With no free housing, nobody is added. A person breathes around 0.8 kilograms of oxygen a day – a closed loop has to recover it, or every colony would be a permanent delivery run.",

  // --- Forschung ----------------------------------------------------------
  Fördertechnik: "Extraction Tech",
  Energietechnik: "Power Tech",
  Sondentechnik: "Probe Tech",
  Bergungstechnik: "Salvage Tech",
  Tiefenbohrung: "Deep Drilling",
  Resonanzzerlegung: "Resonance Disassembly",
  Frachttechnik: "Cargo Tech",
  Antriebstechnik: "Propulsion Tech",
  Lagerlogistik: "Storage Logistics",
  Fusionstechnik: "Fusion Tech",
  Iridiumverarbeitung: "Iridium Processing",
  "Sonden-KI": "Probe AI",
  "Erkunder-KI": "Explorer AI",
  Automatisierungstechnik: "Automation Tech",
  Logistiknetzwerk: "Logistics Network",
  Antimaterietechnik: "Antimatter Tech",
  Magnetosphärentechnik: "Magnetosphere Tech",
  "Erlaubt den Bau planetarer Magnetfeldgeneratoren. Sie halten keinen Gammablitz auf – der braucht Masse, dafür sind die Wohnmodule da. Sie lenken die geladene Teilchenflut ab, die einer Supernova jahrtausendelang folgt, und halten damit die Atmosphäre. Vorbild ist ein real durchgerechneter Magnetschild am L1-Punkt des Mars.":
    "Enables planetary magnetic field generators. They stop no gamma flash – that needs mass, which is what habitat modules are for. They deflect the charged particle flood that follows a supernova for millennia, and thereby hold the atmosphere. The model is a real magnetic shield concept for the L1 point of Mars.",

  "Verbessert die Abbaueffizienz aller Minen um 5% pro Stufe.":
    "Improves extraction efficiency of all mines by 5% per level.",
  "Verbessert den Wirkungsgrad deiner Kraftwerke um 8% pro Stufe. Eine Wärmekraftmaschine kann prinzipiell nie alle Wärme in Strom wandeln: die Grenze ist 1 minus dem Verhältnis von kalter zu heißer Temperatur. Fortschritt heißt hier, heißer zu werden.":
    "Improves the efficiency of your power plants by 8% per level. A heat engine can never convert all of its heat into electricity: the ceiling is 1 minus the ratio of cold to hot temperature. Progress here means running hotter.",
  "Verkürzt die Flugzeit deiner Sonden um 10% pro Stufe.":
    "Shortens probe travel time by 10% per level.",
  "Erhöht die Ausbeute aus Wracks und Asteroiden um 15% pro Stufe.":
    "Increases yield from wrecks and asteroids by 15% per level.",
  "Erschließt tief liegende Vorkommen, an die normale Ausrüstung nicht herankommt.":
    "Opens up deep deposits that standard equipment cannot reach.",
  "Zerlegt fremdartige Strukturen, die sich mechanisch nicht öffnen lassen.":
    "Breaks down alien structures that cannot be opened mechanically.",
  "Erhöht die Ladekapazität deiner Frachter um 20% pro Stufe.":
    "Increases freighter cargo capacity by 20% per level.",
  "Erhöht die maximale Reichweite deiner Sonden und verkürzt Reisezeiten zwischen Systemen. Der Treibstoffbedarf wächst nicht mit der Geschwindigkeit, sondern exponentiell mit ihr – wer Treibstoff mitnimmt, muss auch den Treibstoff beschleunigen. Deshalb ist jede Verbesserung des Antriebs mehr wert als jeder größere Tank.":
    "Increases the maximum range of your probes and shortens travel times between systems. Fuel demand does not grow with speed but exponentially in it – whoever carries fuel must accelerate that fuel too. This is why any improvement to the drive is worth more than any bigger tank.",
  "Erhöht die Kapazität aller Lagerhallen um 6% pro Stufe.":
    "Increases the capacity of all warehouses by 6% per level.",
  "Zweite Stufe der Energiegewinnung. Verbessert Kraftwerke um weitere 10% pro Stufe. Fusion gewinnt Energie nur, solange die Kerne leichter sind als Eisen – dort sind sie am festesten gebunden. Jenseits davon kostet Verschmelzen Energie, statt welche zu liefern.":
    "Second tier of power generation. Improves power plants by a further 10% per level. Fusion only yields energy while the nuclei are lighter than iron – that is where binding is tightest. Beyond it, fusing costs energy instead of releasing it.",
  "Verbessert die Ausbeute deiner Iridiumminen um 7% pro Stufe.":
    "Improves the yield of your iridium mines by 7% per level.",
  "Startet mit einem Klick so viele Sonden, wie es unerforschte einfache Ziele im System gibt -- statt jede einzeln loszuschicken.":
    "Launches as many probes as there are unexplored simple targets in the system, in one click – instead of sending each one separately.",
  "Dasselbe für Erkunder: ein Klick deckt alle komplexen Ziele im System auf -- Anomalien, Strukturen, Gefahren.":
    "The same for explorers: one click reveals every complex target in the system – anomalies, structures, hazards.",
  "Schaltet wiederkehrende Flottenrouten frei -- Schiffe fahren feste Strecken mit Lade-/Entladeregeln, ohne dass du jede Fahrt einzeln anstoßen musst.":
    "Unlocks repeating fleet routes – ships run fixed circuits with load/unload rules, without you triggering each run.",
  "Planeten gleichen konfigurierte Mindestbestände automatisch untereinander aus -- mit derselben Verzögerung, die die schnellstmögliche Flotte bräuchte, aber ohne dass du Schiffe schicken musst.":
    "Planets balance configured minimum stock levels among themselves automatically – with the same delay the fastest possible fleet would need, but without you sending ships.",
  "Verbessert die Ausbeute deiner Antimateriekollektoren um 10% pro Stufe.":
    "Improves the yield of your antimatter collectors by 10% per level.",

  // --- Schiffe ------------------------------------------------------------
  Sonde: "Probe",
  Erkunder: "Explorer",
  Forschungsschiff: "Science Vessel",
  Frachter: "Freighter",
  Kolonieschiff: "Colony Ship",
  Kriegsschiff: "Warship",

  "Billige Einwegsonde. Deckt einfache Ziele auf. Sie kehrt nicht zurück, weil Abbremsen genauso viel Treibstoff kostet wie Beschleunigen – eine Sonde, die heimkommen soll, ist ein ganz anderes Schiff.":
    "Cheap single-use probe. Reveals simple targets. It does not come back, because slowing down costs as much fuel as speeding up – a probe meant to return is an entirely different ship.",
  "Bemanntes Aufklärungsschiff. Nötig für komplexe Ziele – Anomalien, Strukturen, Gefahren.":
    "Crewed reconnaissance ship. Required for complex targets – anomalies, structures, hazards.",
  "Wertet Anomalien aus. Ohne Forschungsmission gibt eine Anomalie ihre Technologie nicht her.":
    "Studies anomalies. Without a science mission an anomaly will not yield its technology.",
  "Bringt Bergungsgut und Ressourcen nach Hause. Große Funde brauchen mehrere Fahrten.":
    "Brings salvage and resources home. Large finds take several runs.",
  "Gründet eine vollwertige Kolonie. Wird dabei verbraucht.":
    "Founds a full colony. Consumed in the process.",
  "Bewaffnetes Schiff. Einziger Schiffstyp, der Gefahren-Objekte angreifen kann. Verstecken kann es sich nicht: jedes Schiff strahlt seine Abwärme gegen einen drei Grad über dem absoluten Nullpunkt kalten Hintergrund ab. Wer im System ist, ist sichtbar.":
    "Armed vessel. The only ship type that can attack hazard objects. It cannot hide: every ship radiates its waste heat against a background three degrees above absolute zero. Whoever is in the system is visible.",

  // --- Planetenmodell (v0.24) ---------------------------------------------
  // Namen aus planetName(): abgeleitet aus Klasse, Zone und Wasservorrat.
  "{objekt}: {fracht} geerntet – der Gürtel füllt sich wieder.":
    "{objekt}: harvested {fracht} – the belt is refilling.",
  Lavawelt: "Lava World",
  Kleinwelt: "Dwarf World",
  "Mini-Neptun": "Mini-Neptune",
  Eisriese: "Ice Giant",
  Felswelt: "Rocky Class",
  Supererde: "Super-Earth",
  "{wert} g": "{wert} g",
  "zu leicht für eine Atmosphäre – nicht terraformbar":
    "too light to hold an atmosphere – cannot be terraformed",

  "{planet}: {anzahl} Menschen haben sich abgesetzt – eine neue Bande formiert sich.":
    "{planet}: {anzahl} people have broken away – a new band is forming.",
  Abtrünnige: "Renegades",

  // --- Piraten (v0.34-v0.37) ----------------------------------------------
  "{angreifer} nimmt Kurs auf {flotte} – Kontakt in {dauer} Sekunden.":
    "{angreifer} is closing on {flotte} – contact in {dauer} seconds.",
  "{flotte} wurde überfallen: {fracht} verloren.":
    "{flotte} was raided: lost {fracht}.",
  "{flotte}: verlorene Fracht": "{flotte}: lost cargo",

  // --- Energiespeicher (v0.29) --------------------------------------------
  Energiespeicher: "Energy Store",
  "Supraleitende Spule, in der Strom verlustfrei kreist. Überschuss wird eingelagert und deckt später Spitzen ab. Die Kühlung braucht selbst etwas Energie.":
    "Superconducting coil in which current circulates without loss. Surplus is stored and covers later peaks. Cooling it draws some power itself.",
  "Speicher {menge} / {grenze} {einheit}": "Storage {menge} / {grenze} {einheit}",
  "lädt {rate} {einheit}": "charging {rate} {einheit}",
  "entlädt {rate} {einheit}": "discharging {rate} {einheit}",
  "Speicher voll": "Store full",
  "Speicher leer": "Store empty",
  "Der Speicher deckt das Defizit – die Anlagen laufen weiter.":
    "The store is covering the deficit – production continues.",
  "Reicht noch {dauer}.": "Lasts another {dauer}.",

  // --- Sterne (v0.28) -----------------------------------------------------
  // Die Spektralklasse (M/K/G/F) bleibt unübersetzt: sie ist international.
  "Roter Zwerg": "Red Dwarf",
  "Oranger Zwerg": "Orange Dwarf",
  "Gelber Zwerg": "Yellow Dwarf",
  "Weißgelber Stern": "Yellow-White Star",
  "{name} ({klasse})": "{name} ({klasse})",
  "Leuchtkraft {wert} Sonnen": "Luminosity {wert} suns",
  "Bewohnbare Zone dicht am Stern – der größte Teil des Systems ist Eis.":
    "Habitable zone hugs the star – most of the system is ice.",
  "Bewohnbare Zone eher sternnah, weiter Außenbereich.":
    "Habitable zone fairly close in, wide outer region.",
  "Sonnenähnlich – ausgewogene Zonen.": "Sun-like – balanced zones.",
  "Heller Stern – große heiße Innenzone, bewohnbare Zone weit außen.":
    "Bright star – large hot inner zone, habitable zone far out.",

  // --- Planetenarten ------------------------------------------------------
  Felsplanet: "Rocky World",
  Wüstenwelt: "Desert World",
  Ozeanwelt: "Ocean World",
  Eiswelt: "Ice World",
  Vulkanwelt: "Volcanic World",
  Gasriese: "Gas Giant",
  Heimatwelt: "Homeworld",

  // --- Objektbezeichnungen der Weltgenerierung ----------------------------
  "Havarierter Frachter": "Crippled Freighter",
  "Ausgebranntes Kolonieschiff": "Burnt-out Colony Ship",
  "Zerschossener Geleitkreuzer": "Shot-up Escort Cruiser",
  "Treibende Bergungsplattform": "Drifting Salvage Platform",
  "Fremdartige Signalboje": "Alien Signal Buoy",
  "Verlassene Forschungsstation": "Abandoned Research Station",
  "Kristalline Struktur unbekannten Ursprungs": "Crystalline Structure of Unknown Origin",
  "Stillgelegter Sondenschwarm": "Dormant Probe Swarm",
  "Versiegelter Monolith": "Sealed Monolith",
  "Fremdartiger Resonanzkörper": "Alien Resonance Body",
  "Verschlossene Artefaktkammer": "Locked Artifact Chamber",
  Piratenaußenposten: "Pirate Outpost",
  "Dichtes Trümmerfeld": "Dense Debris Field",
  "Instabile Strahlungszone": "Unstable Radiation Zone",
  "Automatisierte Abwehrdrohnen": "Automated Defense Drones",
  "Tiefliegendes Vorkommen": "Deep-lying Deposit",
  Asteroidengürtel: "Asteroid Belt",
  "Leerer Orbit": "Empty Orbit",

  // --- Kleinteile aus flotten.js, galaxie.js, save.js, testmodus.js -------
  "keine Schiffe": "no ships",
  "Spielstand wirklich zurücksetzen?": "Really reset the save?",
  "Speicherstand-Version passt nicht, starte neues Spiel.":
    "Save version does not match, starting a new game.",
  "Speicherstand konnte nicht gelesen werden, starte neues Spiel.":
    "Save could not be read, starting a new game.",
  "Der alte Spielstand stammt aus einer früheren Version – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.":
    "The old save is from an earlier version – it is kept as a backup in browser storage, the game starts over.",
  "Der alte Spielstand war nicht lesbar – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.":
    "The old save could not be read – it is kept as a backup in browser storage, the game starts over.",
  "Spielstand konnte nicht gespeichert werden – der Browserspeicher ist voll oder gesperrt.":
    "Could not save the game – browser storage is full or blocked.",

  // --- Ablehnungsgründe (simulation.js) -----------------------------------
  // Kurze Sätze, die im Spiel als Tooltip an einem gesperrten Knopf hängen.
  // Sie sagen, WAS fehlt, nicht was der Spieler falsch gemacht hat.
  "Nicht genug Ressourcen.": "Not enough resources.",
  "Kein Forschungslabor im Imperium – ohne Labor forscht niemand.":
    "No research lab in the empire – without a lab nobody researches.",
  "Nicht genug Frachtraum.": "Not enough cargo space.",
  "Nicht genug vorhanden.": "Not enough in stock.",
  "Nicht genug Credits.": "Not enough credits.",
  "{flotte} hat {system} erreicht – die Route ist vermessen, der Anker steht. Ab jetzt ein Sprung.":
    "{flotte} has reached {system} – the route is surveyed and the anchor is set. A jump from now on.",
  Erstflug: "First flight",
  "Sprungroute vermessen – ein Sprung dauert {dauer}.":
    "Jump route surveyed – a jump takes {dauer}.",
  "KEINE Sprungroute. Der erste Flug dorthin geht unterlichtschnell und dauert {dauer} – danach steht der Anker und es ist für immer ein Sprung.":
    "NO jump route. The first flight there is sub-light and takes {dauer} – after that the anchor stands and it is a jump forever.",
  "Vorrang: bekommt Strom und Leute zuerst. Braucht {bedarf}.":
    "Priority: gets power and workers first. Needs {bedarf}.",
  "Nachrang: bekommt nur, was übrig bleibt. Braucht {bedarf}.":
    "Low priority: gets only what is left over. Needs {bedarf}.",
  "Normal: teilt sich Strom und Leute gleichmäßig. Braucht {bedarf}.":
    "Normal: shares power and workers evenly. Needs {bedarf}.",
  "{menge} MW": "{menge} MW",
  "{menge} AK": "{menge} WF",
  // Die Uhr im Kopf. Marke, Restzeit und Grund stehen seit dem Umbau des
  // Countdowns getrennt -- vorher war es EIN Satz ("{stern} kollabiert in
  // {dauer}"), und der las sich wie eine Statuszeile statt wie eine Frist.
  FRIST: "DEADLINE",
  FLUT: "FLOOD",
  "bis {stern} kollabiert": "until {stern} collapses",
  "bis die Teilchenflut eintrifft": "until the particle flood arrives",
  "Die Flut ist da.": "The flood is here.",
  "Das Neutrino-Observatorium liest die Brennstufe im Kern von {stern}, {lj} Lichtjahre entfernt. Wenn er kollabiert, zerlegt der Blitz die Ozonschicht – und mit ihr die Landwirtschaft jeder ungeschützten Welt.":
    "The neutrino observatory reads the burning stage in the core of {stern}, {lj} light years away. When it collapses, the flash will destroy the ozone layer – and with it the agriculture of every unprotected world.",
  "{stern} ist kollabiert. Was jetzt heranzieht, ist die kosmische Teilchenflut – geladen, jahrtausendelang, und nur durch ein Magnetfeld aufzuhalten. Danach ist keine Flottenbewegung mehr möglich.":
    "{stern} has collapsed. What is coming now is the cosmic particle flood – charged, lasting millennia, and stoppable only by a magnetic field. After it, no fleet movement is possible.",
  "{stern} ist kollabiert. Der Blitz hat die Ozonschicht zerrissen – auf allen Welten wächst nichts mehr, bis sie sich erholt.":
    "{stern} has collapsed. The flash tore the ozone layer apart – nothing grows on any world until it recovers.",
  "Die Ozonschicht hat sich erholt – die Ernte läuft wieder.":
    "The ozone layer has recovered – harvests are running again.",
  "Die Teilchenflut macht jeden Flug tödlich.": "The particle flood makes every flight lethal.",
  "Die Teilchenflut ist da. {anzahl} von {gesamt} Welten stehen im Schirm.":
    "The particle flood is here. {anzahl} of {gesamt} worlds stand within the shield.",
  "Die Teilchenflut ist da. Keine einzige Welt war geschützt.":
    "The particle flood is here. Not a single world was protected.",
  "Die Flut ist vorübergezogen.": "The flood has passed.",
  "Es ist niemand geblieben.": "No one remained.",
  "Jahrtausende geladener Teilchen. Wo ein Magnetfeld stand und Strom hatte, hielt die Atmosphäre – und mit ihr die Menschen darunter.":
    "Millennia of charged particles. Where a magnetic field stood and had power, the atmosphere held – and with it the people beneath.",
  "Jahrtausende geladener Teilchen. Keine Welt hatte ein Feld, das sie ablenken konnte. Die Atmosphären sind fort.":
    "Millennia of charged particles. No world had a field to deflect them. The atmospheres are gone.",
  "Schirm auf {anteil}% Versorgung": "Shield at {anteil}% supply",
  "kein Schirm": "no shield",
  "{menge} Menschen halten durch": "{menge} people hold on",
  verloren: "lost",
  "{welten} von {gesamt} Welten gehalten · {menschen} Menschen":
    "{welten} of {gesamt} worlds held · {menschen} people",
  "Neue Welt beginnen": "Begin a new world",
  "Verwirft diesen Spielstand und beginnt eine frische Galaxie.":
    "Discards this save and begins a fresh galaxy.",
  "Kein Handelspartner in Reichweite.": "No trading partner in range.",
  "{partner} verkauft dir nichts mehr.": "{partner} will no longer sell to you.",
  "{partner} kauft nichts mehr von dir – zu schlechte Beziehung, und gebraucht wird es dort auch nicht.":
    "{partner} no longer buys from you – relations are too poor, and they do not need it either.",
  "{gruppe} gibt ihren Stützpunkt auf und zieht weiter – ihr System ist leergeräumt.":
    "{gruppe} abandons its base and moves on – their system has been picked clean.",
  "Kein Handelspartner in Reichweite. Der Markt braucht einen Gegenüber – ein fremdes Imperium mit eigenem Handelsposten, das eine Flotte von hier aus erreichen könnte.":
    "No trading partner in range. The market needs a counterparty – a foreign empire with its own trading post that a fleet could reach from here.",
  "Handel mit {partner} auf {planet} · Kasse dort {credits}":
    "Trading with {partner} on {planet} · their funds: {credits}",
  Unbekannt: "Unknown",
  "{partner} kann das nicht bezahlen – dort liegen nur {credits} cr.":
    "{partner} cannot pay for that – only {credits} cr are held there.",
  "Das Lager des Partners ist voll.": "The partner's storage is full.",
  "{partner} hat nur {menge} {res} abzugeben.": "{partner} has only {menge} {res} to spare.",
  "Nicht genug {res} im Marktlager.": "Not enough {res} in the market depot.",
  "Nicht handelbar.": "Not tradable.",
  "Menge muss positiv sein.": "Amount must be positive.",
  "Kein Handelsposten auf diesem Planeten.": "No trading post on this planet.",
  "Keine Ladung an Bord.": "No cargo on board.",
  "Keine Schiffe verfügbar.": "No ships available.",
  "Keine Schiffe an Bord.": "No ships on board.",
  "Keine Schiffe dieses Typs.": "No ships of this type.",
  "Der Tank ist voll.": "The tank is full.",
  "{flotte}: {menge} aus den Tanks abgezapft.": "{flotte}: {menge} siphoned from the tanks.",
  "Kein Deuterium vorhanden.": "No deuterium available.",
  "Kein Deuterium an Bord.": "No deuterium on board.",
  "Keine Beschädigung.": "No damage.",
  "Hier steht keine Werft.": "There is no shipyard here.",
  "Außenposten haben keine Werft.": "Outposts have no shipyard.",
  "Außenposten haben keine Wirtschaft.": "Outposts have no economy.",
  "Flotte ist unterwegs.": "Fleet is under way.",
  "Flotte ist im Gefecht.": "Fleet is in combat.",
  "Die Flotte hat keine Schiffe.": "The fleet has no ships.",
  "Flotte hat keine {schiff}.": "Fleet has no {schiff}.",
  "Flotte hat kein Kolonieschiff.": "Fleet has no colony ship.",
  "Keine Flotte gewählt.": "No fleet selected.",
  "Kein Befehl.": "No order.",
  "Unbekanntes Ziel.": "Unknown target.",
  "Unbekannte Versandart.": "Unknown dispatch type.",
  "Noch nicht erkundet.": "Not explored yet.",
  "Hier lässt sich nichts errichten.": "Nothing can be built here.",
  "Hier steht bereits ein Stützpunkt.": "There is already a base here.",
  "Hier gibt es nichts mehr aufzudecken.": "There is nothing left to reveal here.",
  "Halt nicht gefunden.": "Stop not found.",
  "Route hat keine Stationen.": "Route has no stops.",
  "Eintrag nicht gefunden.": "Entry not found.",
  "Kein laufender Bauauftrag.": "No construction in progress.",
  "Keine laufende Forschung.": "No research in progress.",
  "Kein laufender Schiffbau.": "No shipbuilding in progress.",
  "Bereits erforscht.": "Already researched.",
  "Diese Technologie ist noch unbekannt.": "This technology is still unknown.",
  "Automatisierungstechnik noch nicht erforscht.": "Automation Tech not researched yet.",
  "{tech} noch nicht erforscht.": "{tech} not researched yet.",
  "Benötigt {kosten}.": "Requires {kosten}.",
  "Benötigt {kosten} auf {planet}.": "Requires {kosten} on {planet}.",
  "Benötigt {voraussetzungen}.": "Requires {voraussetzungen}.",
  "Warteschlange voll ({max}/{max}).": "Queue full ({max}/{max}).",
  "Braucht {noetig} Bevölkerung (aktuell {aktuell}).": "Requires {noetig} population (currently {aktuell}).",
  "{res} gibt es hier nicht.": "There is no {res} here.",
  "{res} gibt es hier nicht ({art}).": "There is no {res} here ({art}).",
  "Zu wenig Deuterium: {noetig} nötig, {anBord} an Bord.": "Not enough deuterium: {noetig} needed, {anBord} on board.",
  "Zu wenig Deuterium: {noetig} nötig (inkl. Rückweg), {anBord} an Bord.":
    "Not enough deuterium: {noetig} needed (incl. return trip), {anBord} on board.",

  // --- Meldungen (simulation.js) ------------------------------------------
  "Flotte {nr}": "Fleet {nr}",
  "Ausgebrannte Sonde": "Burnt-out probe",
  "{planet}: Nahrung reicht nicht – die Bevölkerung schrumpft auf {menge}.":
    "{planet}: not enough food – the population shrinks to {menge}.",
  "Logistiknetz: {fracht} von {quelle} nach {ziel} unterwegs.":
    "Logistics network: {fracht} en route from {quelle} to {ziel}.",
  "{planet}: Lager voll – Logistiknetz-Lieferung teilweise verloren.":
    "{planet}: storage full – logistics delivery partly lost.",
  "{planet}: Lager voll – {fracht} bleiben an Bord.": "{planet}: storage full – {fracht} stay on board.",
  "{planet}: Lager voll – {menge} Deuterium beim Auflösen verloren.":
    "{planet}: storage full – {menge} deuterium lost while disbanding.",
  "{planet}: Lager voll – Reste von {flotte} gingen verloren.":
    "{planet}: storage full – the remains of {flotte} were lost.",
  "{planet}: Lager voll – Erstattung teilweise verloren.": "{planet}: storage full – refund partly lost.",
  "{tech} Stufe {stufe} abgeschlossen.": "{tech} level {stufe} completed.",
  "{anzahl}× {schiff} auf {planet} fertiggestellt.": "{anzahl}× {schiff} completed at {planet}.",
  "{flotte}: {schiff} bei {planet} repariert.": "{flotte}: {schiff} repaired at {planet}.",
  "{flotte}: {anzahl}× {schiff} recycelt – {erstattung} zurückgewonnen.":
    "{flotte}: {anzahl}× {schiff} recycled – {erstattung} recovered.",
  "{fracht} auf {planet} gelöscht.": "{fracht} unloaded at {planet}.",
  "{flotte} hat keine Schiffe mehr und wurde aufgelöst.": "{flotte} has no ships left and was disbanded.",
  "{wer}: Reste gingen zwischen den Systemen verloren.": "{wer}: the remains were lost between systems.",
  "{wer}: Reste gingen verloren.": "{wer}: the remains were lost.",
  "{wer}: {fracht} bleiben bei {objekt} zurück – bergbar.":
    "{wer}: {fracht} left behind at {objekt} – salvageable.",
  "{flotte}: Schnellversand – {anzahl} Ziel(e) in {system}.":
    "{flotte}: quick dispatch – {anzahl} target(s) in {system}.",
  "{flotte}: Schnellversand – {anzahl} Ziel(e) in {system}, {offen} offen (zu wenige Schiffe).":
    "{flotte}: quick dispatch – {anzahl} target(s) in {system}, {offen} left open (too few ships).",
  "{flotte}: zu wenig Deuterium für den Weiterflug – Flotte wartet.":
    "{flotte}: not enough deuterium to fly on – the fleet is waiting.",
  "{flotte}: {fracht} bei {planet} geladen.": "{flotte}: loaded {fracht} at {planet}.",
  "{flotte}: zu wenig Deuterium – Route pausiert.": "{flotte}: not enough deuterium – route paused.",
  "{objekt}: {art} entdeckt.": "{objekt}: {art} discovered.",
  "{objekt}: {art} entdeckt – Flotte gesichtet ({schiffe}, {hp} HP gesamt).":
    "{objekt}: {art} discovered – fleet sighted ({schiffe}, {hp} HP total).",
  "{objekt}: {art} entdeckt – nicht zugänglich. Benötigt: {tech}.":
    "{objekt}: {art} discovered – not accessible. Requires: {tech}.",
  "{objekt}: Forschungsmission abgeschlossen – {tech} freigeschaltet!":
    "{objekt}: science mission complete – {tech} unlocked!",
  "{objekt}: Technologie bereits bekannt – nur Material geborgen.":
    "{objekt}: technology already known – only material salvaged.",
  "{objekt}: {fracht} geladen – Fundstelle erschöpft.": "{objekt}: loaded {fracht} – the site is exhausted.",
  "{objekt}: {geladen} geladen – {rest} bleiben liegen, Frachtraum voll.":
    "{objekt}: loaded {geladen} – {rest} left behind, cargo hold full.",
  "Kolonie auf {ort} gegründet – eigene Produktion läuft an.":
    "Colony founded on {ort} – its own production is starting up.",
  "Außenposten auf {ort} errichtet – deine Reichweite verschiebt sich.":
    "Outpost established on {ort} – your reach shifts.",

  // --- Kampf --------------------------------------------------------------
  Sieg: "Victory",
  "Niederlage – eigene Flotte vernichtet": "Defeat – own fleet destroyed",
  "Rückzug – eigene Flotte zu geschwächt": "Retreat – own fleet too weakened",
  "Kein Sieger nach maximaler Rundenzahl – Gegner noch zu stark":
    "No winner after the maximum number of rounds – the enemy is still too strong",
  "{objekt}: Gefecht beginnt.": "{objekt}: combat begins.",
  "{flotte}: Verluste": "{flotte}: losses",
  "{objekt}: {ergebnis} nach {runden} Runde(n).": "{objekt}: {ergebnis} after {runden} round(s).",
  "{objekt}: {beute} erbeutet.": "{objekt}: captured {beute}.",
  "{objekt}: {beute} erbeutet – {rest} bleiben liegen, mit Frachter abholen.":
    "{objekt}: captured {beute} – {rest} left behind, collect with a freighter.",
  "{objekt}: kein Frachtraum übrig – {rest} liegen bereit, mit Frachter abholen.":
    "{objekt}: no cargo space left – {rest} lie ready, collect with a freighter.",

  // --- Missionsarten und Flottenstatus ------------------------------------
  Erkundung: "Exploration",
  Forschungsmission: "Science Mission",
  Bergung: "Salvage",
  Außenposten: "Outpost",
  Koloniegründung: "Colonize",
  Angriff: "Attack",
  Auftrag: "Order",
  "im Gefecht (Runde {runde})": "in combat (round {runde})",
  "im Gefecht (Runde {runde}/{max})": "in combat (round {runde}/{max})",
  "im Hafen bei {planet}": "docked at {planet}",
  "steht im Raum": "holding in space",
  "Rückflug nach {planet}": "returning to {planet}",
  "{mission} → {system} Orbit {orbit}": "{mission} → {system} orbit {orbit}",

  // --- Feste Beschriftungen: Kopf, Navigation, index.html -----------------
  Planet: "Planet",
  Forschung: "Research",
  Flotten: "Fleets",
  Galaxie: "Galaxy",
  Handel: "Trade",
  Imperium: "Empire",
  Gebäude: "Buildings",
  Verarbeitung: "Processing",
  Systeme: "Systems",
  Logistiknetz: "Logistics Network",
  Status: "Status",
  Meldungen: "Log",
  Testmodus: "Test mode",
  // Welcher der beiden Stände läuft gerade? Siehe STAND in data.js.
  Spielkopie: "Play copy",
  Entwicklung: "Development",
  Demo: "Demo",
  "+1 Tag": "+1 day",
  "– Systemkarte": "– system map",
  "Statusspalte ein-/ausklappen": "Show/hide the status column",
  Kolonie: "Colony",
  Heimatplanet: "Home planet",
  Lager: "Storage",
  Marktlager: "Market depot",
  Gesamt: "Total",
  Route: "Route",
  "{system} · Orbit {orbit} · {art}": "{system} · orbit {orbit} · {art}",

  // --- Ressourcenleiste ---------------------------------------------------
  "braucht keinen Lagerplatz": "takes up no storage space",
  "{volumen} m³ pro {einheit} · {belegt} m³ belegt": "{volumen} m³ per {einheit} · {belegt} m³ used",
  Einheit: "unit",
  " · Verarbeitung braucht {menge} im Jahr": " · processing needs {menge} per year",
  " – Bestand reicht noch {dauer}": " – stock lasts another {dauer}",
  " – Bestand reicht noch {dauer} bis zur Reserve ({reserve})":
    " – stock lasts another {dauer} down to the reserve ({reserve})",
  " – Anlagen laufen mit {anteil}%, es kommen nur {menge} im Jahr nach":
    " – facilities run at {anteil}%, only {menge} per year is coming in",
  " · Platz für {platz}": " · room for {platz}",
  " · Platz für {platz} – belegt, es wächst niemand nach": " · room for {platz} – full, nobody is added",
  voll: "full",
  " · gefördert von {gebaeude}": " · produced by {gebaeude}",
  "{res} fehlt: {braucht} {einheit} gebraucht, nur {da} verfügbar – alle Anlagen laufen mit {anteil}%":
    "{res} is short: {braucht} {einheit} needed, only {da} available – all facilities run at {anteil}%",
  "{braucht} {einheit} von {da} {einheit} verbraucht · {frei} {einheit} frei":
    "{braucht} {einheit} of {da} {einheit} used · {frei} {einheit} free",
  "{frei} {einheit} frei": "{frei} {einheit} free",
  "{res}: {volumen} m³ ({anteil}% des Lagers)": "{res}: {volumen} m³ ({anteil}% of storage)",
  "{belegt} von {gesamt} m³ belegt": "{belegt} of {gesamt} m³ used",
  "Noch nicht entdeckt": "Not discovered yet",

  // --- Imperiumsübersicht -------------------------------------------------
  "{anzahl} Stützpunkte · davon {wirtschaft} mit Wirtschaft":
    "{anzahl} bases · {wirtschaft} of them with an economy",
  "Gekaufte Ware, die noch am Markt auf Abholung wartet":
    "Purchased goods still waiting at the market to be collected",
  "Kein Lager, keine Produktion – zählt nur für die Reichweite.":
    "No storage, no production – it only counts towards your reach.",
  "{belegt} von {gesamt} m³": "{belegt} of {gesamt} m³",
  "{belegt} von {gesamt} m³ – VOLL, Produktion verfällt": "{belegt} of {gesamt} m³ – FULL, production is lost",
  "{res}: {menge}, +{rate} im Jahr": "{res}: {menge}, +{rate} per year",
  "{res}: {menge}, keine Produktion": "{res}: {menge}, no production",
  "Wartet auf Abholung: {ware} – eine Flotte muss andocken und laden.":
    "Waiting to be collected: {ware} – a fleet has to dock and load.",
  "Nichts wartet auf Abholung.": "Nothing is waiting to be collected.",
  "{res} im ganzen Imperium": "{res} across the whole empire",
  "Unterwegs: {liste}": "En route: {liste}",

  // --- Statusspalte und Warteschlangen ------------------------------------
  "{flotte} im Gefecht": "{flotte} in combat",
  "{flotte} unterwegs": "{flotte} under way",
  "Nichts läuft gerade.": "Nothing is running.",
  "Warteschlange ({belegt}/{max}) · noch {dauer}": "Queue ({belegt}/{max}) · {dauer} left",
  "Diese Aufträge starten nacheinander, sobald der laufende fertig ist. Die Kosten sind bereits abgezogen – ein eingereihter Auftrag findet also garantiert statt. Zusammen noch {dauer} Bauzeit.":
    "These orders start one after another as soon as the running one is done. Their costs are already deducted – a queued order is therefore guaranteed to happen. {dauer} of build time left in total.",
  "Position {nr} · Bauzeit {dauer}": "Position {nr} · build time {dauer}",
  "Aus der Warteschlange nehmen. Die bereits abgezogenen Kosten werden erstattet.":
    "Take it out of the queue. The costs already deducted are refunded.",

  // --- Bau- und Forschungskacheln -----------------------------------------
  "Stufe {nr}": "Tier {nr}",
  "Energie {vorzeichen}{menge} MW": "Power {vorzeichen}{menge} MW",
  "Erforscht – schaltet gesperrte Objekte frei.": "Researched – unlocks sealed objects.",
  "Nächste Stufe: {kosten} · {dauer}": "Next level: {kosten} · {dauer}",
  "kein Labor – niemand forscht": "no lab – nobody is researching",
  "{labore} Labore · {fluss} FE/h": "{labore} labs · {fluss} RU/h",
  "1 Labor · {fluss} FE/h": "1 lab · {fluss} RU/h",
  "1 Labor, aber ohne Strom oder Menschen – es geht nichts voran":
    "1 lab, but no power or people – nothing is progressing",
  "{labore} Labore, aber ohne Strom oder Menschen – es geht nichts voran":
    "{labore} labs, but no power or people – nothing is progressing",
  "Aufwand: {aufwand} FE · bei {fluss} FE/h aus allen Laboren: {dauer}":
    "Effort: {aufwand} RU · at {fluss} RU/h from all labs: {dauer}",
  "Abbrechen – der bisherige Fortschritt ist verloren, gezahlt wurde mit Strom und Arbeitszeit":
    "Cancel – progress so far is lost; it was paid for with power and working hours",
  "Bringt zusätzlich: {mehr}": "Adds: {mehr}",
  "Verbraucht zusätzlich: {mehr} – fehlt der Nachschub, drosselt die Anlage anteilig":
    "Additionally consumes: {mehr} – if supply runs short, the facility throttles proportionally",
  "Schafft Platz für {menge} {res} mehr": "Creates room for {menge} more {res}",
  "Benötigt: {voraussetzungen}": "Requires: {voraussetzungen}",
  erforscht: "researched",
  "Abbrechen, Kosten erstattet": "Cancel, costs refunded",
  Ausbauen: "Upgrade",
  Erforschen: "Research",
  "{name} → Stufe {stufe}": "{name} → level {stufe}",

  // --- Werft --------------------------------------------------------------
  "Ohne Werft lassen sich keine Schiffe bauen.": "Without a shipyard no ships can be built.",
  "Werft Stufe {stufe} – baut {tempo}× so schnell wie eine Werft der Stufe 1. Jede weitere Stufe beschleunigt zusätzlich.":
    "Shipyard level {stufe} – builds {tempo}× as fast as a level 1 shipyard. Every further level speeds it up more.",
  // Seit v0.83 zwei getrennte Schlüssel: der Abbrechen-Knopf steht fest im
  // Gerüst, damit die mitlaufende Restzeit ihn nicht jede Sekunde mitreißt
  // (Prinzip 8a, A-004). Vorher steckte der ganze Knopf als Markup im Text.
  "Im Bau: {anzahl}× {schiff} ({dauer})": "Building: {anzahl}× {schiff} ({dauer})",
  Abbrechen: "Cancel",
  "Bricht den laufenden Schiffbau ab. Die Kosten werden vollständig erstattet.":
    "Cancels the shipbuilding in progress. The costs are refunded in full.",
  "Werft Stufe {stufe} · {tempo}× Bautempo": "Shipyard level {stufe} · {tempo}× build speed",
  "Kosten: {kosten} · {dauer}": "Cost: {kosten} · {dauer}",
  "{menge} Deuterium pro Strecke": "{menge} deuterium per leg",
  "{menge} Deuterium pro Strecke · Frachtraum {frachtraum}": "{menge} deuterium per leg · cargo hold {frachtraum}",
  "{hp} HP · {angriff} Angriff": "{hp} HP · {angriff} attack",
  Bauen: "Build",
  "5 Stück auf einmal": "5 at once",
  '<li class="dezent">Auf einem Außenposten lässt sich nicht bauen.</li>':
    '<li class="dezent">You cannot build on an outpost.</li>',

  // --- Markt --------------------------------------------------------------
  "Kein Handelsposten auf {planet}.": "No trading post on {planet}.",
  "{res} – Bestand {menge} auf {planet}": "{res} – stock {menge} on {planet}",
  "Verkauf {verkauf} Credits/Stück · Kauf {kauf} Credits/Stück":
    "Sell {verkauf} credits/unit · buy {kauf} credits/unit",
  "Handelsspanne {spanne}% – Kaufen und Verkaufen ergibt immer ein Minus":
    "Trade spread {spanne}% – buying and selling always leaves you down",
  "Gekaufte Ware wird nicht eingelagert: sie wartet am Markt, bis eine Flotte sie abholt.":
    "Purchased goods are not put into storage: they wait at the market until a fleet collects them.",
  "Bestand {menge}": "Stock {menge}",
  "Verkauf {verkauf}/St. · Kauf {kauf}/St.": "Sell {verkauf}/ea. · buy {kauf}/ea.",
  "{menge} {res} abgeben, {erloes} Credits erhalten": "Give up {menge} {res}, receive {erloes} credits",
  "Verkaufe {menge} → 🪙 {erloes}": "Sell {menge} → 🪙 {erloes}",
  "{preis} Credits zahlen, {menge} {res} warten dann am Markt auf Abholung":
    "Pay {preis} credits, {menge} {res} then wait at the market to be collected",
  "Kaufe {menge} → 🪙 {preis}": "Buy {menge} → 🪙 {preis}",
  "Credits: {menge}": "Credits: {menge}",

  // --- Verarbeitung -------------------------------------------------------
  "Außenposten haben keine Produktion.": "Outposts have no production.",
  '<div class="dezent">Außenposten haben kein Lager – sie verschieben nur deine Reichweite.</div>':
    '<div class="dezent">Outposts have no storage – they only extend your reach.</div>',
  "Auf diesem Planeten verarbeitet noch keine Anlage gelagerte Rohstoffe. Anlagen, die das tun, zeigen ihren Bedarf auf der Gebäudekachel.":
    "No facility on this planet processes stored raw materials yet. Those that do show their demand on the building tile.",
  "{braucht} Bedarf · {zustrom} Zustrom, je Jahr": "{braucht} demand · {zustrom} inflow, per year",
  " – gedrosselt auf {anteil}%": " – throttled to {anteil}%",
  " – Bestand trägt noch {dauer}": " – stock carries it another {dauer}",
  "keine Reserve": "no reserve",
  "Bis zu diesem Bestand darf die Verarbeitung aus dem Lager ziehen. Darunter läuft sie nur noch mit dem, was nachkommt.":
    "Processing may draw from storage down to this level. Below it, it runs only on what comes in.",
  Setzen: "Set",
  Entfernen: "Remove",
  "Reicht der Zustrom nicht, nehmen Anlagen den Rest aus dem Lager – bis zur eingestellten Reserve. Danach drosseln sie anteilig, statt den Bestand aufzubrauchen.":
    "If the inflow is not enough, facilities take the rest from storage – down to the reserve you set. After that they throttle proportionally instead of using up the stock.",

  // --- Logistiknetz -------------------------------------------------------
  "Logistiknetzwerk noch nicht erforscht.": "Logistics Network not researched yet.",
  "Außenposten haben kein Lager, das sich beteiligen könnte.": "Outposts have no storage that could take part.",
  "kein Mindestbestand": "no minimum stock",
  "{richtung}: {fracht} · {von} → {zu} · Ankunft: {dauer}": "{richtung}: {fracht} · {von} → {zu} · arrival: {dauer}",
  eingehend: "incoming",
  ausgehend: "outgoing",
  "Fällt ein Bestand unter den Mindestwert, füllt der nächstbeste eigene Planet automatisch auf – mit Verzögerung wie bei einer schnellen Flotte.":
    "If a stock falls below its minimum, the best-placed planet of yours tops it up automatically – with the delay a fast fleet would need.",

  // --- Flottenliste -------------------------------------------------------
  "Neue Flotte bei {planet}": "New fleet at {planet}",
  "Außenposten haben keinen Hafen – wähle oben einen Planeten mit Wirtschaft.":
    "Outposts have no port – pick a planet with an economy above.",
  "Stellt eine leere Flotte bei {planet} auf. Schiffe und Treibstoff lädst du danach im Hafen zu.":
    "Forms an empty fleet at {planet}. You load ships and fuel afterwards, in port.",
  "Noch keine Flotte aufgestellt.": "No fleet formed yet.",
  leer: "empty",
  " · Ankunft: {dauer}": " · arrival: {dauer}",
  "{flotte} · Heimathafen: {hafen}": "{flotte} · home port: {hafen}",
  "Keine Schiffe an Bord": "No ships on board",
  "Fracht {menge} / {kapazitaet}": "Cargo {menge} / {kapazitaet}",
  "Fracht {menge} / {kapazitaet} ({ladung})": "Cargo {menge} / {kapazitaet} ({ladung})",
  "Deuterium {menge} an Bord": "Deuterium {menge} on board",
  "Position: {system}": "Position: {system}",
  "Position: {system} Orbit {orbit}": "Position: {system} orbit {orbit}",
  "Position: zwischen den Systemen ({x} / {y})": "Position: between systems ({x} / {y})",
  "Route aktiv: {halte} Halt(e), gerade Halt {nr}": "Route active: {halte} stop(s), currently stop {nr}",
  "Im Gefecht – nicht umleitbar": "In combat – cannot be redirected",
  aktiv: "active",
  "Deuterium {menge}": "Deuterium {menge}",
  "Deuterium {menge} · Ladung {ladung}": "Deuterium {menge} · cargo {ladung}",
  " · zwischen den Systemen": " · between systems",
  "Diese Flotte bekommt gerade die Befehle.": "This is the fleet that receives orders.",
  "Anklicken wählt diese Flotte – Befehle gehen danach an sie.":
    "Clicking selects this fleet – orders go to it from then on.",
  "Hier: {liste}": "Present: {liste}",
  "Unterwegs hierher: {liste}": "On the way here: {liste}",
  "{flotte}, noch {dauer}": "{flotte}, {dauer} to go",
  "Keine eigene Flotte in diesem System.": "No fleet of yours in this system.",
  gewählt: "selected",
  wählen: "select",
  "Während eines Gefechts nicht umleitbar – nur die Rückzugsschwelle greift.":
    "Cannot be redirected during combat – only the retreat threshold applies.",
  "Die Flotte liegt bereits im Hafen.": "The fleet is already in port.",
  "Bricht den Auftrag ab und fliegt zum Heimathafen zurück.": "Aborts the order and flies back to the home port.",
  Umkehren: "Turn back",

  // --- Flottendetail ------------------------------------------------------
  "{flotte} {status} – nicht umleitbar, bis die Rückzugsschwelle greift oder ein Sieger feststeht.":
    "{flotte} {status} – cannot be redirected until the retreat threshold applies or a winner is decided.",
  "{flotte} ist unterwegs – Umladen geht nur im Hafen. Kurs lässt sich jederzeit ändern (Ziel im System anklicken oder „Umkehren“).":
    "{flotte} is under way – transfers only work in port. The course can be changed at any time (click a target in the system, or “Turn back”).",
  "{flotte} im Hafen bei {planet}": "{flotte} in port at {planet}",
  "({anzahl} frei)": "({anzahl} free)",
  "Deuterium an Bord: {menge} ({lager} im Lager)": "Deuterium on board: {menge} ({lager} in storage)",
  "Anteil des hier gelagerten Deuteriums, das an Bord soll. Der Regler stellt nur ein -- erst „Tanken“ führt es aus.":
    "Share of the deuterium stored here that should go on board. The slider only sets the amount – “Refuel” carries it out.",
  "Übernimmt die eingestellte Menge aus dem Hafenlager in den Tank.":
    "Moves the set amount from the port's storage into the tank.",
  Tanken: "Refuel",
  "Gesamten Treibstoff ans Lager zurückgeben": "Give all the fuel back to storage",
  "Alles abladen": "Unload all",
  "Frachtraum {menge}/{kapazitaet} · Regler = % der max. Flottenkapazität":
    "Cargo hold {menge}/{kapazitaet} · slider = % of the fleet's maximum capacity",
  "{res} ({lager} im Lager)": "{res} ({lager} in storage)",
  "Anteil der maximalen Frachtkapazität dieser Flotte -- nicht des gerade freien Platzes. Der Regler stellt nur ein, „Laden“ führt aus.":
    "Share of this fleet's maximum cargo capacity – not of the space currently free. The slider only sets the amount, “Load” carries it out.",
  "Lädt die eingestellte Menge {res} aus dem Hafenlager in den Frachtraum.":
    "Loads the set amount of {res} from the port's storage into the cargo hold.",
  Laden: "Load",
  "{schiff} {anteil}% beschädigt": "{schiff} {anteil}% damaged",
  Reparieren: "Repair",
  "Verschrottet die beschädigte Gruppe gegen eine sofortige Teilerstattung":
    "Scraps the damaged group for an immediate partial refund",
  Recyceln: "Recycle",
  "Marktware hier: {ware}": "Market goods here: {ware}",
  "Alles laden ({res})": "Load all ({res})",
  "Ladung hier ins Lager entladen": "Unload the cargo into storage here",
  "Löst den Verband auf. Schiffe, Fracht und Treibstoff bleiben im Hafen dieses Planeten.":
    "Disbands the fleet. Ships, cargo and fuel stay in this planet's port.",
  "Flotte auflösen": "Disband fleet",

  // --- Routen -------------------------------------------------------------
  "aktiv – Halt {nr}/{gesamt}": "active – stop {nr}/{gesamt}",
  "Zielhafen für den nächsten Halt. Die Route fährt ihre Halte danach der Reihe nach ab und beginnt wieder von vorn.":
    "Destination port for the next stop. The route then runs its stops in order and starts over.",
  "Hängt den gewählten Planeten als weiteren Halt an die Route an.":
    "Appends the selected planet to the route as another stop.",
  "Halt hinzufügen": "Add stop",
  "Die Route läuft bereits.": "The route is already running.",
  "Startet den Kreislauf – die Flotte fährt die Halte der Reihe nach ab.":
    "Starts the circuit – the fleet runs the stops in order.",
  "Route starten": "Start route",
  "Hält den Kreislauf an. Die aktuelle Fahrt wird noch zu Ende geflogen.":
    "Halts the circuit. The current leg is still flown to the end.",
  "Es läuft gerade keine Route.": "No route is running.",
  "Route stoppen": "Stop route",
  "Noch keine Stationen. Halte hinzufügen, dann Route starten.": "No stops yet. Add stops, then start the route.",
  "Route läuft – zum Bearbeiten erst „Route stoppen“.": "The route is running – press “Stop route” to edit it.",
  "über {wert}": "above {wert}",
  alles: "everything",
  "Regel entfernen": "Remove rule",
  "Fracht an diesem Halt ins Lager abgeben": "Hand the cargo over to storage at this stop",
  "hier entladen": "unload here",
  "Diesen Halt aus der Route nehmen": "Take this stop out of the route",
  "Halt entfernen": "Remove stop",
  "Welche Ressource an diesem Halt geladen wird": "Which resource is loaded at this stop",
  "alles laden: nimmt den kompletten Bestand mit. nur Überschuss: lässt die daneben eingestellte Reserve am Planeten stehen -- so zieht die Route dem Planeten nicht sein Baumaterial weg.":
    "load everything: takes the entire stock. surplus only: leaves the reserve set next to it on the planet – that way the route does not pull away the planet's building material.",
  "alles laden": "load everything",
  "nur Überschuss über": "surplus only above",
  "Reservemenge, die am Planeten bleibt": "Reserve amount that stays on the planet",
  "Legt fest, was an diesem Halt geladen wird": "Defines what is loaded at this stop",
  "Regel setzen": "Set rule",

  // --- Galaxie und Systemkarte --------------------------------------------
  "Reichweite {reichweite} · {stuetzpunkte} Stützpunkte · {systeme} Systeme":
    "Reach {reichweite} · {stuetzpunkte} bases · {systeme} systems",
  "{anzahl} in Reichweite · nach Entfernung sortiert": "{anzahl} within reach · sorted by distance",
  "{entfernung} von {planet} (nächster eigener Stützpunkt)": "{entfernung} from {planet} (your nearest base)",
  "Kein eigener Stützpunkt vorhanden": "You have no base yet",
  "Deine Reichweite: {reichweite}": "Your reach: {reichweite}",
  "Fehlen {fehlt} – Antriebstechnik erhöht die Reichweite, ein näherer Stützpunkt verkürzt die Strecke.":
    "{fehlt} short – Propulsion Tech increases your reach, a closer base shortens the distance.",
  "Eigene Stützpunkte hier: {liste}": "Your bases here: {liste}",
  "{anzahl} Orbit(s) bereits untersucht": "{anzahl} orbit(s) already surveyed",
  "Noch nicht besucht": "Not visited yet",
  "{anzahl}× eigen": "{anzahl}× yours",
  "Entfernung {entfernung}": "Distance {entfernung}",
  "Entfernung {entfernung} · besucht": "Distance {entfernung} · visited",
  "Dieses System wird gerade in der Karte rechts gezeigt.": "This system is the one shown in the map on the right.",
  "Systemkarte öffnen": "Open the system map",
  geöffnet: "open",
  Ansehen: "View",
  "außer Reichweite": "out of reach",
  "Sonden losschicken": "Send probes",
  "Erkunder losschicken": "Send explorers",
  "{ziele} von {gesamt} Ziel(en) mit {schiffe} Schiff(en)": "{ziele} of {gesamt} target(s) with {schiffe} ship(s)",
  "Keine Flotte gewählt – stelle eine auf und wähle sie aus, um Befehle zu geben.":
    "No fleet selected – form one and select it to give orders.",
  "{flotte}: Entfernung {distanz} · rund {tritium} Deuterium hin · {anBord} an Bord":
    "{flotte}: distance {distanz} · about {tritium} deuterium one way · {anBord} on board",

  // --- Karten (js/karte.js) -----------------------------------------------
  "Galaxiekarte mit {systeme} Systemen": "Galaxy map with {systeme} systems",
  "Systemkarte von {system}": "System map of {system}",
  "Ziel {system} · noch {dauer}": "Destination {system} · {dauer} to go",
  "Fremder Stützpunkt: {fraktion}": "Foreign base: {fraktion}",
  // Legende unter der Galaxiekarte.
  "eigene Welt": "your world",
  besucht: "visited",
  "in Reichweite": "within reach",
  "deine Flotte": "your fleet",

  // --- Objekte im System --------------------------------------------------
  "{art} ({name}, Orbit {orbit})": "{art} ({name}, orbit {orbit})",
  "{name} – noch unerforscht": "{name} – not explored yet",
  "Erst aufdecken, dann zeigt sich, was hier liegt.": "Reveal it first, then you will see what lies here.",
  "Ertrag: {ertrag}": "Yield: {ertrag}",
  " · Ertrag: {ertrag}": " · yield: {ertrag}",
  "Liegengeblieben: {rest}": "Left behind: {rest}",
  "Verschlossen – benötigt {tech}": "Sealed – requires {tech}",
  "verschlossen – benötigt {tech}": "sealed – requires {tech}",
  "Nächster Schritt: {mission}": "Next step: {mission}",
  "Nächster Schritt: {mission} (braucht {schiff})": "Next step: {mission} (needs a {schiff})",
  "Hier ist nichts mehr zu holen.": "There is nothing left to get here.",
  "Jahr {jahr} · Tag {tag}": "Year {jahr} · Day {tag}",
  Förderung: "Extraction",
  Energie: "Power",
  Versorgung: "Life support",
  "Industrie & Wissenschaft": "Industry & science",
  "Seit der Gründung dieser Kolonie. Eine Echtzeitsekunde ist ein Spieltag, ein Jahr sind {tage} Tage – gut sechs Echtzeitminuten.":
    "Since this colony was founded. One real-time second is one game day; a year is {tage} days – a good six real-time minutes.",
  "Dein Stützpunkt: {name}": "Your base: {name}",
  "Fremder Stützpunkt: {name} ({fraktion})": "Foreign base: {name} ({fraktion})",
  Unerforscht: "Unexplored",
  "ergiebig: {liste}": "rich in: {liste}",
  "keine Landwirtschaft – muss versorgt werden": "no agriculture – has to be supplied",
  "fehlt: {liste}": "missing: {liste}",
  "deine Kolonie": "your colony",
  "dein Außenposten": "your outpost",
  "nicht besiedelbar": "not colonizable",
  "besiedelbar · {radius} Erdradien": "colonizable · {radius} Earth radii",
  besiegt: "defeated",
  "besiegt · Rest liegt noch: {rest}": "defeated · still lying here: {rest}",
  "gefährlich · Flotte: {schiffe} · {hp} HP": "dangerous · fleet: {schiffe} · {hp} HP",
  "gefährlich · Flotte: {schiffe} · {hp} HP (bereits geschwächt)":
    "dangerous · fleet: {schiffe} · {hp} HP (already weakened)",
  ausgewertet: "studied",
  auswertbar: "can be studied",
  verwertet: "used up",
  erkundet: "explored",
  "Rest: {rest} – Frachtraum reichte nicht": "Left: {rest} – the cargo hold was too small",
  Stützpunkt: "Base",
  Anfliegen: "Fly there",
  gesperrt: "locked",
  "Verbraucht 1 Kolonieschiff": "Consumes 1 colony ship",
  erledigt: "done",
  "Rückzug unter": "Retreat below",

  // --- Meldungsliste ------------------------------------------------------
  "Noch nichts entdeckt.": "Nothing discovered yet.",
  "{text}  (+{anzahl} weitere)": "{text}  (+{anzahl} more)",
  "{anzahl} gleichartige Meldungen zusammengefasst": "{anzahl} similar messages combined",
  // Der Umschalter über der Liste. Kurze Beschriftungen, weil sie neben einer
  // Überschrift in einer 380 px schmalen Spalte stehen.
  "Nichts, was dich betrifft.": "Nothing that concerns you.",
  "nur meine": "mine only",
  alles: "everything",
  "alles ({n})": "everything ({n})",
  "Zeigt gerade nur, was dich angeht. Umschalten auf jedes Ereignis der Galaxie.":
    "Currently showing only what concerns you. Switch to every event in the galaxy.",
  "Zeigt gerade jedes Ereignis der Galaxie – gut zum Fehlersuchen. Zurück zu den eigenen Meldungen.":
    "Currently showing every event in the galaxy – useful for debugging. Back to your own messages.",

  // --- Offline-Aufholung (js/main.js) -------------------------------------
  // Die Aufholung läuft seit v0.81 in Blöcken statt am Stück, damit der
  // Bildschirm nicht minutenlang steht. Beide Texte gehören zum selben
  // Vorgang: der erste sagt, dass gerechnet wird, der zweite, dass es zu viel
  // war -- und Letzteres muss der Spieler erfahren, weil dabei ein Teil der
  // Zeit nur pauschal verrechnet wurde.
  "Die Welt holt auf … {prozent} %": "The world is catching up … {prozent} %",
  "Zu viel Zeit auf einmal: die Aufholung brach nach {anzahl} Ereignissen ab. Ein Teil der vergangenen Zeit wurde nur pauschal verrechnet.":
    "Too much time at once: the catch-up stopped after {anzahl} events. Part of the elapsed time was only accounted for in bulk.",

  // --- Handbuch (js/handbuch.js) ------------------------------------------
  // Längere Fließtexte als sonst. Sie erklären Zusammenhänge, keine Zahlen --
  // deshalb müssen sie beim Balancing nicht nachgezogen werden.
  Handbuch: "Manual",
  "Worum es geht": "What this is about",
  "Am Himmel steht ein Stern, der sterben wird. Das Neutrino-Observatorium liest die Brennstufe in seinem Kern und kann daraus ablesen, wann er kollabiert – das ist keine Prophezeiung, sondern gerechnete Astrophysik: die Brennstufen eines massereichen Sterns haben bekannte Dauern.":
    "There is a star in the sky that is going to die. The neutrino observatory reads the burning stage in its core and can tell from it when the star will collapse – that is not prophecy but calculated astrophysics: the burning stages of a massive star have known durations.",
  "Wenn er kollabiert, geschieht zweierlei, und zwar zu sehr verschiedenen Zeiten. Zuerst kommt der Blitz, mit dem Licht. Er tötet niemanden – Wohnmodule sind versiegelt –, aber er zerlegt die Ozonschicht und damit das Einzige auf der Oberfläche, das Sonnenlicht braucht: die Landwirtschaft.":
    "When it collapses, two things happen at very different times. First comes the flash, travelling with the light. It kills no one – habitats are sealed – but it destroys the ozone layer, and with it the only thing on the surface that needs sunlight: agriculture.",
  "Jahrhunderte später trifft die Teilchenflut ein. Sie ist der eigentliche Weltenkiller, sie bleibt Jahrtausende, und sie ist der Grund, warum es in diesem Spiel überhaupt etwas zu gewinnen gibt.":
    "Centuries later the particle flood arrives. It is the real world killer, it stays for millennia, and it is the reason this game has anything to win at all.",
  "Deine Aufgabe ist nicht, die Supernova aufzuhalten. Das kann nichts. Deine Aufgabe ist, dass deine Welten das Jahrhundert danach überleben.":
    "Your task is not to stop the supernova. Nothing can. Your task is to make your worlds survive the century that follows.",

  "Wie Zeit hier funktioniert": "How time works here",
  "Eine Sekunde am Bildschirm ist ein Tag in der Welt. Das ist kein gewählter Trick, sondern folgt aus der Bevölkerung: sie ist die einzige Größe, deren echte Rate keine Technologie verschiebt. Setzt man ihr Wachstum auf einen realistischen Wert, ergibt sich dieser Maßstab von selbst.":
    "One second on screen is one day in the world. That is not a chosen trick but follows from population: it is the only quantity whose real rate no technology shifts. Set its growth to a realistic value and this scale falls out by itself.",
  "Alles Weitere folgt daraus. Eine Stunde vor dem Bildschirm sind rund zehn Spieljahre. Produktionsangaben pro Jahr meinen also Spieljahre, nicht deine Stunden.":
    "Everything else follows from that. One hour at the screen is roughly ten game years. Production figures per year therefore mean game years, not your hours.",
  "Wichtig: die Frist läuft weiter, während du nicht da bist. Das ist hart und beabsichtigt – eine Frist, die auf dich wartet, ist keine. Wer abends aufhört und morgens zurückkommt, findet eine Welt vor, die inzwischen gelebt hat.":
    "Important: the deadline keeps running while you are away. That is harsh and deliberate – a deadline that waits for you is not one. Stop in the evening and return in the morning, and you will find a world that has lived on without you.",

  "Vorräte, Strom und Menschen": "Stores, power and people",
  "Es gibt zwei sehr verschiedene Arten von Ressourcen, und der Unterschied entscheidet mehr als jede Zahl. Metall, Silizium und alles andere Gelagerte sammelt sich an: was du heute nicht brauchst, liegt morgen noch da.":
    "There are two very different kinds of resources, and the difference decides more than any number. Metal, silicon and everything else that is stored accumulates: what you do not need today is still there tomorrow.",
  "Energie und Arbeitskraft sind keine Vorräte, sondern Flüsse. Sie werden in jedem Moment erzeugt und im selben Moment verbraucht. Reicht ein Fluss nicht, wird gedrosselt – und zwar alles, was daran hängt.":
    "Power and workforce are not stores but flows. They are produced in every moment and consumed in the same moment. If a flow falls short, everything that draws on it is throttled.",
  "Arbeitskraft kommt aus deiner Bevölkerung, und Bevölkerung wächst nur, wenn Wohnraum frei ist. Deshalb ist ein Wohnmodul selten das, was am dringendsten aussieht, und oft das, was am meisten bringt: es hebt nicht eine Zahl, sondern die Obergrenze aller anderen.":
    "Workforce comes from your population, and population only grows while there is free living space. That is why a habitat rarely looks like the most urgent thing to build and often is the most valuable: it does not raise one number, it raises the ceiling of all the others.",

  "Vorrang – die Entscheidung, die zählt": "Priority – the decision that counts",
  "Wenn Strom oder Leute knapp werden, teilt das Spiel sie von selbst gleichmäßig auf. Das ist im Normalfall vernünftig und im Notfall genau falsch: wer zu wenig hat, will nicht überall halb laufen, sondern das Wichtige ganz und den Rest gar nicht.":
    "When power or people run short, the game shares them out evenly by itself. That is sensible in normal times and exactly wrong in an emergency: when you have too little, you do not want everything running at half strength, you want the important thing running fully and the rest not at all.",
  "Deshalb trägt jedes Gebäude eine Vorrangstufe: Vorrang, Normal oder Nachrang. Zugeteilt wird von oben nach unten – die höchste Stufe zuerst und vollständig, was übrig bleibt, fließt eine Stufe tiefer. Genau so wirft ein Stromnetz Lasten ab.":
    "That is why every building carries a priority level: priority, normal or low. Allocation runs from the top down – the highest level first and in full, whatever remains flows down one level. This is exactly how a power grid sheds load.",
  "Solange alles reicht, ändert die Einstellung gar nichts. Sie ist keine Dauerrechenaufgabe, sondern eine Notfallentscheidung. Aber im Notfall ist sie die wichtigste, die du hast.":
    "As long as there is enough, the setting changes nothing at all. It is not a permanent arithmetic chore but an emergency decision. In an emergency, though, it is the most important one you have.",

  "Der Schirm, und warum halb nicht reicht": "The shield, and why half is not enough",
  "Gegen die Teilchenflut hilft ein Magnetfeld. Der Grund ist Physik: die Flut besteht aus geladenen Teilchen, und die lassen sich magnetisch ablenken. Gegen den Gammablitz hilft es nicht – der braucht Masse, und dafür sind die Wohnmodule da.":
    "A magnetic field works against the particle flood. The reason is physics: the flood consists of charged particles, and those can be deflected magnetically. It does not help against the gamma flash – that one needs mass, and that is what the habitats are for.",
  "Ein solcher Generator hält kein Schutzschild im Sinne eines Kraftfelds, sondern eine Lebenserhaltung für einen ganzen Planeten. Und weil er ein Feld dauerhaft aufrechterhalten muss, braucht er dauerhaft enorme Leistung – er dominiert den Energiehaushalt einer Welt vollständig.":
    "Such a generator does not hold a shield in the sense of a force field; it runs life support for an entire planet. And because it must sustain a field permanently, it needs enormous power permanently – it dominates a world's energy budget completely.",
  "Entscheidend ist: ein Schirm auf halber Leistung ist kein halber Schutz. Ein Feld mit Lücken lenkt nicht die Hälfte der Teilchen ab, es reißt an der falschen Stelle auf. Wenn die Flut eintrifft, zählt nur, ob er voll versorgt läuft – mit Strom und mit Leuten.":
    "The crucial part: a shield at half power is not half protection. A field with gaps does not deflect half the particles, it tears open in the wrong place. When the flood arrives, all that counts is whether it runs fully supplied – with power and with people.",
  "Er steht je Planet, nicht für das ganze Imperium. Wer breit gesiedelt hat, hat also mehr zu retten, nicht weniger zu tun.":
    "It stands per planet, not for the whole empire. So whoever settled widely has more to save, not less to do.",

  "Warum Welten sich unterscheiden": "Why worlds differ",
  "Kein Planet ist wie der andere, und die Unterschiede sind keine Zufallszahlen, sondern folgen aus dem, was er ist. Eine Wüstenwelt trägt Metall und Silizium reichlich und lässt nichts wachsen. Ein Gasriese hat überhaupt keine Oberfläche, auf die man bauen könnte.":
    "No planet is like another, and the differences are not random numbers but follow from what the planet is. A desert world carries metal and silicon in abundance and grows nothing. A gas giant has no surface to build on at all.",
  "Die Schwerkraft ist der stärkste einzelne Faktor, und das aus einem einfachen Grund: jedes Bauwerk muss sein eigenes Gewicht tragen. Auf einer schweren Welt kostet dasselbe Gebäude mehr Material.":
    "Gravity is the single strongest factor, for a simple reason: every structure has to carry its own weight. On a heavy world the same building costs more material.",
  "Manches siehst du, ohne es nutzen zu können. Ein tiefliegendes Vorkommen bleibt sichtbar und verschlossen, bis du die passende Technologie hast. Entdecken und Verwerten sind zwei verschiedene Dinge.":
    "Some things you can see without being able to use them. A deep deposit stays visible and locked until you have the matching technology. Discovering and exploiting are two different things.",

  "Flotten, Reichweite und Treibstoff": "Fleets, range and fuel",
  "Jedes Schiff hat einen Tank, und die Reichweite einer Flotte ist der Tank geteilt durch den Verbrauch – also ein Mittelwert über alle Schiffe darin. Das hat eine Folge, die nirgends als Sonderregel steht: ein Kriegsschiff im Erkunderverband verkürzt dessen Reichweite.":
    "Every ship has a tank, and a fleet's range is tank divided by consumption – an average across all ships in it. This has a consequence that is written down nowhere as a special rule: a warship in a scouting group shortens that group's range.",
  "Der Frachter wird dadurch von selbst zum Tanker, ohne dass ihm jemand diese Rolle gegeben hätte. Solche Zusammenhänge sind der Kern dieses Spiels: die Regeln sind wenige, die Folgen ergeben sich.":
    "This turns the freighter into a tanker all by itself, without anyone assigning it that role. Connections like this are the heart of this game: the rules are few, the consequences follow.",
  "Ein System, in dem noch nie jemand war, kennt keine Sprungroute. Der erste Flug dorthin geht deshalb unterlichtschnell und dauert lange – danach steht der Anker und es ist für immer ein Sprung.":
    "A system nobody has ever visited has no jump route. The first flight there is therefore sub-light and takes a long time – after that the anchor stands and it is a jump forever.",

  "Forschung ist ein Fluss, kein Kauf": "Research is a flow, not a purchase",
  "Technologie wird nicht bezahlt und ist dann da. Sie wird laufend erarbeitet: Labore erzeugen Forschung, solange sie Strom und Leute haben, und ein Auftrag rückt vor, solange geforscht wird.":
    "Technology is not paid for and then simply present. It is worked out continuously: laboratories produce research as long as they have power and people, and a project advances as long as research is being done.",
  "Deshalb ist Wissen auch die einzige Sache in diesem Spiel, die sofort überall gilt. Es ist nichts Physisches – es muss nicht reisen. Alles andere muss den Weg tatsächlich zurücklegen, und das gilt auch für die Rechnung.":
    "That is also why knowledge is the only thing in this game that applies everywhere at once. It is nothing physical – it does not have to travel. Everything else has to cover the distance for real, and that includes the bill.",

  // Hinweis, der nach einer Minute Spielzeit auftaucht (Tobis Vorgabe: der
  // Spieler soll sich erst umsehen und ruhig verwirrt sein).
  "Verwirrt? Das Handbuch erklärt, wie diese Welt funktioniert – was sie von dir will, und warum die Uhr läuft.":
    "Confused? The manual explains how this world works – what it wants from you, and why the clock is running.",

  // Das Erklärfenster beim allerersten Start (erststartTafel in
  // js/handbuch.js). Zwei seiner vier Absätze sind wörtlich aus dem Handbuch
  // geborgt und stehen deshalb weiter oben -- hier steht nur, was es NICHT
  // schon gibt.
  "Eine Welt, und eine Frist": "One world, and a deadline",
  "Du führst genau eine Welt: {planet}. Ein Wohnmodul, ein kleiner Vorrat – und ein Himmel voller Sterne, in denen noch nie jemand war.":
    "You run exactly one world: {planet}. One habitat, a small stock of supplies – and a sky full of stars where no one has ever been.",
  "Zum Anfangen genügen zwei Handgriffe: im Bereich Planet ein Gebäude ausbauen – Kraftwerk und Wohnmodul tragen alles andere –, und im Bereich Forschung einen Auftrag einreihen.":
    "Two moves are enough to start: upgrade a building under Planet – the power plant and the habitat carry everything else – and queue a project under Research.",
  "Die Uhr oben im Kopf zeigt, wieviel Zeit bleibt. Alles Weitere steht im Handbuch – jederzeit, unterster Eintrag in der Leiste links.":
    "The clock in the header shows how much time is left. Everything else is in the manual – at any time, bottom entry in the bar on the left.",
  "Handbuch öffnen": "Open the manual",
  "Los geht's": "Let's go",
};
