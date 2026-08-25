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
  // --- Rückbau (A-095) ----------------------------------------------------
  "Hier steht nichts, was sich abreißen ließe.": "There is nothing here to tear down.",
  "Diese Anlage wird gerade gebaut – erst den Bau abbrechen.":
    "This facility is under construction – cancel the build first.",
  "Diese Anlage steht in der Warteschlange – erst den Auftrag herausnehmen.":
    "This facility is in the queue – take the order out first.",
  "Eine Stufe abreißen – keine Erstattung. Arbeitskraft und Strom werden frei.":
    "Tear down one level – no refund. Workforce and power are freed up.",
  "Noch einmal klicken: Stufe {stufe} wird abgerissen, ohne Erstattung.":
    "Click again: level {stufe} will be torn down, with no refund.",
  // R-3/A-100: warnt vorher, wenn der Rückbau Wohnraum unter die aktuelle
  // Bevölkerung drückt.
  "Wohnraum für {n} fällt weg – die Bevölkerung schrumpft. ":
    "Housing for {n} will be gone – the population will shrink. ",
  "Erst den laufenden Auftrag abbrechen oder aus der Warteschlange nehmen.":
    "Cancel the running order first, or take it out of the queue.",
  "Wirklich?": "Really?",

  // --- Zusammengefasste Meldungen (A-083) ---------------------------------
  "{text}  (+{anzahl} weitere, zuletzt Jahr {jahr}, Tag {tag})":
    "{text}  (+{anzahl} more, last on year {jahr}, day {tag})",

  // --- Planeten umbenennen (A-082) ----------------------------------------
  Name: "Name",
  "Name dieser Welt. Reine Beschriftung – ändert nichts an ihr.":
    "Name of this world. A label only – it changes nothing about it.",
  "Kein Planet gewählt.": "No planet selected.",
  "Fremde Welten lassen sich nicht umbenennen.": "Foreign worlds cannot be renamed.",

  // --- Warteschlange umsortieren (A-080) ----------------------------------
  "Einen Platz nach vorn.": "One place forward.",
  "Einen Platz nach hinten.": "One place back.",
  "Dort ist kein Platz mehr.": "There is no room there.",
  "Keine Warteschlange.": "No queue.",

  // --- Werft-Stückzahl (A-079) --------------------------------------------
  "Wie viele auf einmal gebaut werden sollen.": "How many are to be built at once.",
  "Trag eine Stückzahl ein – mindestens 1.": "Enter a quantity – at least 1.",

  // --- Warteschlangen-Summe (A-077, Beschriftung seit R-1/A-100) ----------
  "Wartend zusammen": "Waiting total",
  "Was hier noch WARTET, kostet zusammen {buendel} – der laufende Auftrag ist bereits bezahlt und zählt nicht mit. Abgebucht wird erst, wenn ein Eintrag vorn steht.":
    "What's still WAITING here costs {buendel} together – the running order is already paid for and isn't included. Nothing is charged until an entry reaches the front.",

  // --- Ressourcen ---------------------------------------------------------
  Metall: "Metal",
  Silizium: "Silicon",
  Deuterium: "Deuterium",
  Iridium: "Iridium",
  Elektronik: "Electronics",
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
  Fertigung: "Fabrication Plant",
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
  "Fusionsreaktor. Die Reaktion setzt schnelle Neutronen frei – ungeladen, also nur schwer abzuschirmen und nur als Wärme erntbar. Deshalb steckt in jedem Kraftwerk ein Dampfkreislauf, so altmodisch das klingt. Verbrennt Deuterium aus dem Lager – ohne Brennstoff zündet die Fusion nicht.":
    "Fusion reactor. The reaction releases fast neutrons – uncharged, therefore hard to shield and harvestable only as heat. That is why every power plant contains a steam cycle, however old-fashioned that sounds. Burns deuterium from storage – without fuel the fusion does not ignite.",
  Solarfeld: "Solar Field",
  Hydrokultur: "Hydroponics",
  "Baut Nahrung unter Kunstlicht in geschlossenen Regalen – unabhängig von Sonne und Ozonschicht. Teuer erkauft: Pflanzen verwerten nur rund ein Prozent des Lichts, und hier kommt jedes Photon aus der Steckdose. Die teure Antwort, wenn draußen nichts mehr wächst.":
    "Grows food under artificial light in sealed racks – independent of sun and ozone layer. Dearly bought: plants convert only about one percent of the light, and here every photon comes out of the socket. The expensive answer when nothing grows outside any more.",
  "Für Energie gibt es zwei Wege, und sie unterscheiden sich im Preis: Das Kraftwerk verbrennt Deuterium aus dem Lager – geht der Brennstoff aus, zündet die Fusion nicht mehr und der Reaktor steht, bis wieder Vorrat für den Anlauf da ist. Das Solarfeld braucht keinen Brennstoff und liefert sternnah am meisten – aber seine Halbleiter überstehen die Teilchenflut nicht: ungeschirmte Felder sind danach Schrott. Der bequeme Weg ist der verwundbare; ein Energiespeicher überbrückt Lücken in beiden.":
    "There are two paths to power, and they differ in their price: the power plant burns deuterium from storage – once the fuel runs out, the fusion no longer ignites and the reactor stands still until there is stock for a fresh start-up. The solar field needs no fuel and yields the most close to the star – but its semiconductors do not survive the particle flood: unshielded fields are scrap afterwards. The convenient path is the vulnerable one; an energy storage bridges gaps in both.",
  "Kein Brennstoff – der Reaktor ist aus. Er zündet wieder, sobald Deuterium für {dauer} im Lager liegt.":
    "No fuel – the reactor is out. It ignites again once there is deuterium for {dauer} in storage.",
  "Kein Brennstoff – Reaktor aus": "No fuel – reactor out",
  // A-142: der Slot bleibt reserviert, statt bei fehlendem Kraftwerk zu
  // verschwinden (G4/R-8).
  "Ohne Kraftwerk gibt es keinen Brennstoffverbrauch – erst danach zieht der Reaktor Deuterium aus dem Lager.":
    "Without a power plant there is no fuel draw – only once it is built does the reactor pull deuterium from storage.",
  "Kein Kraftwerk gebaut": "No power plant built",
  "Deuterium im Lager geteilt durch den Verbrauch des Kraftwerks – Zufluss nicht eingerechnet.":
    "Deuterium in storage divided by the power plant's consumption – inflow not included.",
  "Brennstoff für {dauer}": "Fuel for {dauer}",
  "Der Reaktor verbrennt bei jeder Last gleich viel: Stufe {stufe} zieht {rate}, ausgelastet wie im Leerlauf. Jede weitere Ausbaustufe zieht mehr – die Reichweite gilt für die jetzige Stufe.":
    "The reactor burns the same at any load: level {stufe} draws {rate}, fully loaded or idling. Every further level draws more – the range holds for the current level.",
  "Achtung: Ungeschirmte Solarfelder überstehen die Teilchenflut nicht.":
    "Warning: unshielded solar fields will not survive the particle flood.",
  "Photovoltaik in Feldern. Halbleiter ernten Licht direkt, ohne Brennstoff und ohne Dampfkreislauf – aber ihr Kristallgitter ist empfindlich: schnelle geladene Teilchen schlagen Atome von ihren Plätzen, und genau daraus besteht eine Teilchenflut. Sternnahe Orbits liefern mehr, weil die Bestrahlungsstärke mit dem Abstandsquadrat fällt.":
    "Photovoltaics in fields. Semiconductors harvest light directly, with no fuel and no steam cycle – but their crystal lattice is delicate: fast charged particles knock atoms off their sites, and that is exactly what a particle flood is made of. Orbits close to the star yield more, because irradiance falls with the square of distance.",
  "Erhöht die Lagerkapazität aller lagerbaren Ressourcen.": "Increases storage capacity for all stockpiled resources.",
  "Gewinnt Deuterium aus Wasser – der Treibstoff, ohne den keine Flotte fliegt. Schwerer Wasserstoff ist stabil und steckt überall dort, wo Wasser ist: in jedem sechstausendsten Wasserstoffkern, in Eis, in Ozeanen, in feuchtem Gestein.":
    "Extracts deuterium from water – the fuel without which no fleet flies. Heavy hydrogen is stable and sits wherever water does: in every six-thousandth hydrogen nucleus, in ice, in oceans, in damp rock.",
  "Ermöglicht den Schiffbau. Höhere Stufen bauen schneller.":
    "Enables shipbuilding. Higher levels build faster.",
  "Fördert Iridium. In der Kruste ist es fast nicht vorhanden: Iridium bindet an Eisen und ist bei der Entstehung des Planeten mit ihm in den Kern gesunken. In Asteroiden liegt es hundertfach dichter – die Iridiumschicht am Ende der Kreidezeit stammt von einem.":
    "Mines iridium. There is almost none in the crust: iridium binds to iron and sank into the core with it while the planet formed. Asteroids carry it a hundred times more densely – the iridium layer at the end of the Cretaceous came from one.",
  "Erzeugt Antimaterie aus Energie. Der Wirkungsgrad ist miserabel und bleibt es – Antimaterie ist kein Brennstoff, sondern der dichteste Speicher, den die Physik kennt: 9 × 10¹⁶ Joule je Kilogramm umgesetzter Masse, das Zehnmillionenfache von chemischem Sprengstoff.":
    "Manufactures antimatter from power. The efficiency is dismal and always will be – antimatter is not a fuel but the densest storage medium physics knows: 9 × 10¹⁶ joules per kilogram of converted mass, ten million times chemical explosive.",
  "Macht aus Silizium und viel Strom Elektronik. Ein Halbleiter ist nicht Rohmasse, sondern Reinheit: auf eine Milliarde Siliziumatome darf höchstens ein fremdes kommen. Der größte Teil des eingesetzten Materials wird dabei nicht zu Bauteilen, sondern zu Abfall – dieser Verlust ist der Preis der Veredelung.":
    "Turns silicon and a great deal of power into electronics. A semiconductor is not raw mass but purity: at most one atom in a billion may be foreign. Most of the material that goes in does not become components but waste – that loss is the price of refinement.",
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
  "Grundlage der selbständig handelnden Steuerungen. Routen fährst du auch ohne sie – hier beginnt, was ohne dich ENTSCHEIDET, statt nur zu wiederholen.":
    "The basis of the steering systems that act on their own. You can run routes without it – this is where things start DECIDING for you instead of only repeating.",
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
  "Gründet eine vollwertige Kolonie. Braucht eigene Kolonisten an Bord, die der Spieler selbst belädt, und wird beim Gründen verbraucht.":
    "Founds a full colony. Needs its own colonists on board, loaded by the player, and is consumed when founding.",
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
  // A-142: der Slot bleibt reserviert, statt bei fehlendem Speichergebäude
  // zu verschwinden (G4/R-8) -- {gebaeude} ist bereits übersetzt eingesetzt.
  "Noch kein {gebaeude} gebaut – die Zeile wartet auf den Bau.":
    "No {gebaeude} built yet – the row is waiting to be built.",
  "Kein {gebaeude} gebaut": "No {gebaeude} built",
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
  "Von den {gesamt} fremden Welten der Galaxie haben {ueberlebt} die Flut überstanden.":
    "Of the {gesamt} foreign worlds in the galaxy, {ueberlebt} came through the flux.",
  // Bandennamen (A-031). Eigennamen laufen als feste Tabelle je Sprache durch
  // t() -- nicht als freier Text, sonst steht im englischen Spiel Deutsch.
  Rostwölfe: "Rust Wolves",
  "Leere Hand": "Empty Hand",
  "Schwarze Bake": "Black Beacon",
  Aschefahrer: "Ashrunners",
  "Kalte Ernte": "Cold Harvest",
  Splitterflotte: "Splinter Fleet",
  Trockendock: "Drydock",
  "Letzte Bahn": "Last Orbit",
  Narbenzug: "Scar Convoy",
  Schlackebrüder: "Slag Brothers",
  "Stille Fracht": "Silent Cargo",
  Eisenmeute: "Iron Pack",
  Steuerung: "Controls",
  Tasten: "Keys",
  "Alles geht mit der Maus. Wer die Hand lieber auf der Tastatur lässt, kann die Ansicht auch so wechseln – Tasten ändern nie etwas an der Welt, sie zeigen nur anderes.":
    "Everything works with the mouse. If you would rather keep your hand on the keyboard, you can switch the view that way too – keys never change anything in the world, they only show something else.",
  "1 bis 9 – die Bereiche in der Reihenfolge der Leiste links": "1 to 9 – the sections in the order of the bar on the left",
  "Q und E – eine Welt zurück, eine Welt weiter": "Q and E – one world back, one world forward",
  "M – Galaxiekarte · H – Handbuch": "M – galaxy map · H – manual",
  "Esc – schließt ein offenes Fenster": "Esc – closes an open window",
  "{stand} / {ziel} {einheit}": "{stand} / {ziel} {einheit}",
  "kein Projekt": "no project",
  "FE = Forschungseinheiten. Deine Labore erzeugen sie laufend, und sie fließen in GENAU EIN Projekt – die Warteschlange darunter wird nacheinander abgearbeitet.":
    "FE stands for research points (Forschungseinheiten). Your labs produce them continuously, and they flow into EXACTLY ONE project – the queue below is worked off one after another.",
  "Braucht Werft Stufe {noetig} (aktuell {aktuell}).": "Needs shipyard level {noetig} (currently {aktuell}).",
  // A-138: dritter Teil im selben ·-Muster -- die Sonden kommen nicht zurück.
  "{anzahl} Sonden losschicken · {sprit} Deuterium · kehren nicht zurück":
    "Send {anzahl} probes · {sprit} deuterium · won't return",
  // A-070: Einzahl-Vorlagen statt Pluralsystem, wie in A-068.
  "1 Sonde losschicken · {sprit} Deuterium · kehrt nicht zurück": "Send 1 probe · {sprit} deuterium · won't return",
  "zurück": "return",
  "Fliegt nach der Mission zum Heimathafen zurück. Ohne Haken bleibt die Flotte am Ziel und kann von dort weiter.":
    "Flies back to the home port after the mission. Without the tick the fleet stays at the target and can continue from there.",
  "wirkt bereits zu {prozent} %": "already {prozent} % in effect",
  wartet: "waiting",
  "wartet auf {was} – keine Produktion": "waiting for {was} – no production",
  "wartet auf {was} – noch {dauer}": "waiting for {was} – {dauer} to go",
  "−{prozent} % im Jahr verdirbt": "−{prozent} % per year spoils",
  "Die Aufholung kam nicht voran: {bloecke} Blöcke ohne Fortschritt, hängengeblieben bei einem Ereignis der Art [{art}]. Der Rest der Zeit bleibt offen und wurde NICHT verrechnet.":
    "Catching up made no progress: {bloecke} blocks without advancing, stuck on an event of type [{art}]. The remaining time is left open and was NOT applied.",
  unbekannt: "unknown",
  "Nicht genug Ressourcen ({res}).": "Not enough resources ({res}).",
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
  "Das Neutrino-Observatorium liest die Brennstufe im Kern von {stern}, {lj} Lichtjahre entfernt. Wenn er kollabiert, zerlegt der Blitz die Ozonschicht – und mit ihr die Landwirtschaft jeder ungeschützten Welt. Diese erste Frist ist nicht die letzte: danach beginnt eine zweite, kürzere Frist bis zur Teilchenflut.":
    "The neutrino observatory reads the burning stage in the core of {stern}, {lj} light years away. When it collapses, the flash will destroy the ozone layer – and with it the agriculture of every unprotected world. This first deadline isn't the last one: it's followed by a second, shorter deadline until the particle flood.",
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
  // A-152: Sonden -- der Überschuss geht nicht mehr verloren, und man sieht,
  // was man braucht.
  "Zu wenig Deuterium für dieses Ziel: {noetig} nötig, {verfuegbar} verfügbar (Tank + Lager).":
    "Not enough deuterium for this target: {noetig} needed, {verfuegbar} available (tank + storage).",
  "{label} · {sprit} Deuterium": "{label} · {sprit} deuterium",

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
  "{objekt}: {fracht} geborgen – die Fundstelle selbst bleibt verschlossen.":
    "{objekt}: salvaged {fracht} – the site itself stays sealed.",
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
  // A-146: Tobis Entscheidung (24.08., SAMMEL-SPRUNG.md Nachtrag): "dann
  // würde ich sagen Anlagen & Sektoren statt Gebäude." Ersetzt den früheren
  // Schlüssel `Gebäude` -- der hatte genau einen Verwender (die Überschrift
  // im Planetenbereich, index.html), der jetzt hierher zeigt. EN ist ein
  // Vorschlag der Umsetzung (kein Reflex-"Buildings & Sectors" -- siehe
  // Ergebnis A-146), "facility" folgt der bestehenden Übersetzung von
  // "Anlage" (z.B. weiter unten in dieser Datei).
  "Anlagen & Sektoren": "Facilities & Sectors",
  Verarbeitung: "Processing",
  Systeme: "Systems",
  Logistiknetz: "Logistics Network",
  // A-144: "Status" wurde zur Überschrift der Warteschlange -- Tobis Befund
  // (KONZEPT-LAGER E10), die Statusspalte sei "schon die bessere
  // Warteschlange". "Queue" folgt der bestehenden Übersetzung des Wortes
  // (siehe "Warteschlange ({belegt}/{max})..." unten).
  Warteschlange: "Queue",
  Meldungen: "Log",
  // A-150: Klaus' Frage ("Das mit den Meldungen musst du mir nochmal
  // erzählen, was das ist.") -- der Bereich sagt jetzt selbst, was er ist.
  "Was hier steht, betrifft dich – neue Anlagen, Ankünfte, Warnungen. Nichts ist damit weg, nur nicht mehr aktuell.":
    "What's here concerns you – new facilities, arrivals, warnings. Nothing is gone because of it, just no longer current.",
  Testmodus: "Test mode",
  // Welcher der beiden Stände läuft gerade? Siehe STAND in data.js.
  Spielkopie: "Play copy",
  Entwicklung: "Development",
  Demo: "Demo",
  "+1 Tag": "+1 day",
  Pause: "Pause",
  // --- Der Development-Bereich (A-054) ---
  Development: "Development",
  Patchnotes: "Patch notes",
  Roadmap: "Roadmap",
  "Rückmeldung schreiben": "Write feedback",
  "Was neu ist und was kommt": "What is new and what is coming",
  "Was sich seit der ersten veröffentlichten Fassung geändert hat, neueste zuoberst. Was hier steht, ist da – wenn es bei dir anders aussieht, ist das eine Meldung wert.":
    "What has changed since the first published build, newest first. What is listed here is in the game – if it looks different for you, that is worth reporting.",
  "Was auf dem Plan steht. Grob und ohne Datum – eine Demo, die Termine verspricht, hat schon verloren. Steht dein Fund hier, ist er bekannt.":
    "What is on the plan. Rough and without dates – a demo that promises deadlines has already lost. If your finding is listed here, it is known.",
  "Was dir auffällt, gehört hierher – auch Kleinigkeiten, auch „das habe ich nicht verstanden“. Versionsnummer und Browser trägt das Formular selbst ein; bitte stehen lassen, ohne sie ist eine Meldung schwer einzuordnen.":
    "Whatever you notice belongs here – small things too, and “I did not understand this”. The form fills in version number and browser by itself; please leave them in, without them a report is hard to place.",
  "Diese Demo ist unterwegs, nicht fertig. Was zuletzt dazugekommen ist, was als Nächstes drankommt und wie du dich meldest, steht im Bereich Development – unterster Eintrag in der Leiste links.":
    "This demo is on its way, not finished. What was added last, what comes next and how to get in touch is in the Development area – bottom entry in the bar on the left.",
  "Version {version} ({stand}) · {browser} – automatisch eingetragen, bitte stehen lassen.":
    "Version {version} ({stand}) · {browser} – filled in automatically, please leave it in.",
  // Beschriftung der Kostenzeile auf jeder Kachel (A-044).
  Kosten: "Cost",
  // A-050: eine Rate, die im vollen Lager nirgends ankommt, darf nicht wie
  // ein Zugewinn aussehen.
  "Lager voll": "Storage full",
  // A-051: wie lange der Platz noch reicht.
  "voll in {dauer}": "full in {dauer}",
  // A-052: der Verderb steht jetzt im Tooltip statt in einer eigenen Zeile.
  " · verdirbt: −{prozent} % des Bestands im Jahr":
    " · spoils: −{prozent} % of the stock per year",
  "Eine Ausnahme unter den Vorräten: Nahrung verdirbt. Ein Teil des Lagerbestands geht laufend verloren, und zwar anteilig – ein volles Lager verliert absolut mehr als ein halbleeres. Deshalb kann dein Vorrat schrumpfen, obwohl die Bilanz positiv aussieht. Wie viel es ist, steht im Tooltip der Nahrungs-Kachel.":
    "One exception among the stockpiles: food spoils. A share of what is stored is lost continuously, in proportion – a full store loses more in absolute terms than a half-empty one. That is why your supply can shrink although the balance looks positive. How much it is stands in the tooltip of the food tile.",
  voll: "full",
  " · LAGER VOLL – was hier entsteht, verfällt sofort":
    " · STORAGE FULL – whatever is produced here is lost immediately",
  // Der Notausgang (A-046). Bewusst harmlos formuliert -- ein beforeunload
  // mitten in einer normalen langen Aufholung lässt den Marker zu Recht
  // stehen, und "Fehler!" schickte den Spieler auf eine falsche Suche.
  "Die letzte Zeitaufholung kam nicht durch": "The last time catch-up did not finish",
  "Beim letzten Mal hat das Nachrechnen der vergangenen Zeit nicht bis zum Ende gereicht. Dein Spielstand ist unversehrt – offen ist nur die Strecke, die noch zu rechnen wäre.":
    "Last time, catching up on elapsed time did not run to completion. Your save is intact – all that is open is the stretch still to be calculated.",
  "Das ist jetzt der {zahl}. Versuch in Folge. Verwerfen ist der Weg, der sicher hinausführt.":
    "That is attempt {zahl} in a row now. Discarding is the way that reliably gets you out.",
  "Verwerfen wirft nichts von deiner Welt weg – nur die noch nicht gerechnete Zeit.":
    "Discarding throws away nothing of your world – only the time not yet calculated.",
  "Erneut versuchen": "Try again",
  "Zeitsprung verwerfen und weiterspielen": "Discard the time jump and keep playing",
  "Der offene Zeitsprung wurde verworfen – dein Spielstand ist unverändert, nur die nicht gerechnete Zeit ist weg.":
    "The open time jump was discarded – your save is unchanged, only the uncalculated time is gone.",
  // Zoomknöpfe der Karten (A-039).
  "Näher heran": "Zoom in",
  "Weiter weg": "Zoom out",
  "Ganze Karte zeigen": "Show whole map",
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
  // A-068: eigene Einzahl-Vorlage statt eines Pluralsystems für zwei Stellen.
  "1 Stützpunkt · davon {wirtschaft} mit Wirtschaft":
    "1 base · {wirtschaft} with an economy",
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
  // A-144: P18-Antwort der drei neuen Warteschlangen-Abschnitte (Bau,
  // Forschung, Werft), wenn weder ein Kopf läuft noch etwas wartet.
  "Nichts in Arbeit.": "Nothing in progress.",
  "Meldungsliste ein-/ausklappen": "Show/hide the message list",
  "Meldungen wieder einblenden.": "Show the messages again.",
  "Meldungen wegklappen.": "Hide the messages.",
  "Warteschlange ({belegt}/{max}) · noch {dauer}": "Queue ({belegt}/{max}) · {dauer} left",
  "Diese Aufträge starten nacheinander, sobald der laufende fertig ist. Die Kosten sind bereits abgezogen – ein eingereihter Auftrag findet also garantiert statt. Zusammen noch {dauer} Bauzeit.":
    "These orders start one after another as soon as the running one is done. Their costs are already deducted – a queued order is therefore guaranteed to happen. {dauer} of build time left in total.",
  "Position {nr} · Bauzeit {dauer}": "Position {nr} · build time {dauer}",
  "Aus der Warteschlange nehmen.": "Remove from the queue.",
  "wartet als Nr. {nr}": "waiting as no. {nr}",
  "wartet als Nr. {nr} · startet in ~{dauer}": "waiting as no. {nr} · starts in ~{dauer}",
  "+{n} wartet": "+{n} waiting",
  "Diese Aufträge starten nacheinander, sobald der laufende fertig ist. Bezahlt wird erst, wenn einer vorn steht – bis dahin bindet er nichts. Zusammen noch {dauer} Bauzeit.":
    "These orders start one after another as soon as the running one finishes. Payment happens only once an order is at the front – until then it ties up nothing. {dauer} of build time left in total.",
  "Aus der Warteschlange nehmen. Die bereits abgezogenen Kosten werden erstattet.":
    "Take it out of the queue. The costs already deducted are refunded.",

  // --- Bau- und Forschungskacheln -----------------------------------------
  "Stufe {nr}": "Tier {nr}",
  "Energie {vorzeichenBetrag} MW": "Power {vorzeichenBetrag} MW",
  "Erforscht – schaltet gesperrte Objekte frei.": "Researched – unlocks sealed objects.",
  "Nächste Stufe: {kosten} · {dauer}": "Next level: {kosten} · {dauer}",
  "kein Labor – niemand forscht": "no lab – nobody is researching",
  // A-143: die Forschung rechnet ihre Rate seit dieser Runde in Spieljahren
  // (wie jede andere Rate) statt in der internen Echtzeitstunde -- die
  // Einheit steckt jetzt in {fluss} selbst (forschungsRateText), nicht mehr
  // fest im Schlüsseltext.
  "{labore} Labore · {fluss}": "{labore} labs · {fluss}",
  "1 Labor · {fluss}": "1 lab · {fluss}",
  "1 Labor, aber ohne Strom oder Menschen – es geht nichts voran":
    "1 lab, but no power or people – nothing is progressing",
  "{labore} Labore, aber ohne Strom oder Menschen – es geht nichts voran":
    "{labore} labs, but no power or people – nothing is progressing",
  "Aufwand: {aufwand} FE · bei {fluss} aus allen Laboren: {dauer}":
    "Effort: {aufwand} RU · at {fluss} from all labs: {dauer}",
  "{braucht} von {da} verbraucht · {frei} frei": "{braucht} of {da} consumed · {frei} free",
  // Forschungs-eigene Einheit-Kurzform (FE/Jahr), siehe forschungsRateText in
  // js/ui.js -- getrennt von mitEinheit()/einheit(), weil die die Einheit nie
  // übersetzen (FUND aus A-142: "FE" blieb in Englisch unübersetzt stehen).
  "FE/Jahr": "RU/Jahr",
  "Abbrechen – der bisherige Fortschritt ist verloren, gezahlt wurde mit Strom und Arbeitszeit":
    "Cancel – progress so far is lost; it was paid for with power and working hours",
  "Bringt zusätzlich: {mehr}": "Adds: {mehr}",
  "Verbraucht zusätzlich: {mehr} – fehlt der Nachschub, drosselt die Anlage anteilig":
    "Additionally consumes: {mehr} – if supply runs short, the facility throttles proportionally",
  "Brennt zusätzlich: {mehr}": "Additionally burns: {mehr}",
  "Schafft Platz für {menge} {res} mehr": "Creates room for {menge} more {res}",
  "Benötigt: {voraussetzungen}": "Requires: {voraussetzungen}",
  erforscht: "researched",
  "Abbrechen, Kosten erstattet": "Cancel, costs refunded",
  Ausbauen: "Upgrade",
  Erforschen: "Research",
  "{name} → Stufe {stufe}": "{name} → level {stufe}",

  // --- Werft --------------------------------------------------------------
  "Ohne Werft lassen sich keine Schiffe bauen.": "Without a shipyard no ships can be built.",
  "Werft Stufe {stufe} – baut {tempo}× so schnell wie eine Werft der Stufe 1. Jede weitere Stufe beschleunigt zusätzlich. Für Forschung gilt dasselbe Prinzip – aber am Forschungslabor, einer eigenen Anlage.":
    "Shipyard level {stufe} – builds {tempo}× as fast as a level 1 shipyard. Every further level speeds it up more. The same principle applies to research – but at the research lab, a separate facility.",
  // Seit v0.83 zwei getrennte Schlüssel: der Abbrechen-Knopf steht fest im
  // Gerüst, damit die mitlaufende Restzeit ihn nicht jede Sekunde mitreißt
  // (Prinzip 8a, A-004). Vorher steckte der ganze Knopf als Markup im Text.
  "Im Bau: {anzahl}× {schiff} ({dauer})": "Building: {anzahl}× {schiff} ({dauer})",
  Abbrechen: "Cancel",
  "Bricht den laufenden Schiffbau ab. Die Kosten werden vollständig erstattet.":
    "Cancels the shipbuilding in progress. The costs are refunded in full.",
  // A-151: Schiffe schon beim Bau einer Flotte zuweisen.
  "In den Hafen": "To the harbor",
  "Wohin die fertigen Schiffe nach dem Bau gehen. Voreinstellung: in den Hafen.":
    "Where the finished ships go. Default: the harbor.",
  "{anzahl}× {schiff} auf {planet} fertiggestellt und {flotte} zugewiesen.":
    "{anzahl}× {schiff} completed at {planet} and assigned to {flotte}.",
  "{anzahl}× {schiff} auf {planet} fertiggestellt – Zielflotte nicht mehr hier, im Hafen gelandet.":
    "{anzahl}× {schiff} completed at {planet} – target fleet no longer here, landed in the harbor.",
  "Werft Stufe {stufe} · {tempo}× Bautempo": "Shipyard level {stufe} · {tempo}× build speed",
  "Kosten: {kosten} · {dauer}": "Cost: {kosten} · {dauer}",
  "{menge} Deuterium pro Strecke": "{menge} deuterium per leg",
  "{menge} Deuterium pro Strecke · Frachtraum {frachtraum}": "{menge} deuterium per leg · cargo hold {frachtraum}",
  "{hp} HP · {angriff} Angriff": "{hp} HP · {angriff} attack",
  Bauen: "Build",
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
  "Auf diesem Planeten verarbeitet noch keine Anlage gelagerte Rohstoffe. Anlagen, die das tun, zeigen ihren Bedarf auf der Anlagenkachel.":
    "No facility on this planet processes stored raw materials yet. Those that do show their demand on the facility tile.",
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
  "Noch keine Flotte aufgestellt. Der Weg: Schiffe in der Werft bauen, hier eine Flotte gründen, im Hafen beladen, dann losschicken.":
    "No fleet formed yet. The path: build ships at the shipyard, form a fleet here, load it in port, then send it off.",
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
  "Abflug erst ab": "Depart only at",
  Beladung: "load",
  "wartet auf Beladung: {ist}/{soll} %": "waiting for cargo: {ist}/{soll}%",
  // R-7/A-100: EINE Meldung nach 24 h Spielzeit Wartelage, nicht mehr.
  "{flotte} wartet seit einem Tag auf Beladung: {anteil}/{schwelle} %.":
    "{flotte} has been waiting a day for cargo: {anteil}/{schwelle}%.",
  "Die Route wartet am Ladehalt, bis der Frachtraum so voll ist. 0 heißt: sofort weiter, wie bisher. An einem reinen Entladehalt gilt die Schwelle nicht – dort käme nie Fracht dazu.":
    "The route waits at a loading stop until the hold is this full. 0 means: carry on right away, as before. At a pure unloading stop the threshold does not apply – no cargo would ever arrive there.",
  "Deuterium an Bord: {menge} ({lager} im Lager)": "Deuterium on board: {menge} ({lager} in storage)",
  "Anteil dessen, was noch in den Tank passt und im Lager liegt – 100 % füllt ihn auf. Der Regler stellt nur ein, erst „Tanken“ führt es aus.":
    "Share of what still fits in the tank and is in storage – 100% tops it up. The slider only sets the amount, “Refuel” carries it out.",
  "Übernimmt die eingestellte Menge aus dem Hafenlager in den Tank.":
    "Moves the set amount from the port's storage into the tank.",
  Tanken: "Refuel",
  "Gesamten Treibstoff ans Lager zurückgeben": "Give all the fuel back to storage",
  "Alles abladen": "Unload all",
  "Frachtraum {menge}/{kapazitaet} · noch frei: {frei}":
    "Cargo hold {menge}/{kapazitaet} · still free: {frei}",
  "{res} ({lager} im Lager)": "{res} ({lager} in storage)",
  // A-118: Frachtraum- und Tankbalken (Segmenttitel + Tank-Zeile).
  "{res}: {menge} ({anteil}% des Frachtraums)": "{res}: {menge} ({anteil}% of the cargo hold)",
  "Tank {menge}/{kapazitaet}": "Tank {menge}/{kapazitaet}",
  "{res}: {menge} ({anteil}% des Tanks)": "{res}: {menge} ({anteil}% of the tank)",
  // A-101: Sperrgründe der Laden-/Tanken-Knöpfe im strukturellen Nullzustand.
  "Frachtraum voll.": "Cargo hold full.",
  "{res} im Lager leer.": "No {res} in storage.",
  "Tank voll.": "Tank full.",
  "Kein Deuterium im Lager.": "No deuterium in storage.",
  "Anteil dessen, was gerade wirklich ladbar ist: freier Frachtraum, begrenzt durch den Lagerbestand – 100 % nimmt alles davon. Der Regler stellt nur ein, „Laden“ führt aus.":
    "Share of what can actually be loaded right now: free cargo space, limited by what is in storage – 100% takes all of it. The slider only sets the amount, “Load” carries it out.",
  "Lädt die eingestellte Menge {res} aus dem Hafenlager in den Frachtraum.":
    "Loads the set amount of {res} from the port's storage into the cargo hold.",
  Laden: "Load",
  // A-132: Kolonisten-Regler -- eigener Raum, dasselbe Muster wie Tank/Fracht.
  "Braucht mindestens einen Kolonisten an Bord.": "Needs at least one colonist on board.",
  "Der Kolonistenraum ist voll.": "The colonist quarters are full.",
  "Keine Bevölkerung verfügbar.": "No population available.",
  "Keine Kolonisten an Bord.": "No colonists on board.",
  "Kolonisten an Bord: {menge}/{kapazitaet} ({lager} Bevölkerung im Lager)":
    "Colonists on board: {menge}/{kapazitaet} ({lager} population in storage)",
  "Anteil dessen, was noch in den Kolonistenraum passt und im Lager an Bevölkerung lebt – 100 % füllt ihn auf. Der Regler stellt nur ein, erst „Laden“ führt es aus. Zählt NICHT gegen den Frachtraum.":
    "Share of what still fits in the colonist quarters and lives in storage as population – 100% tops it up. The slider only sets the amount, “Load” carries it out. Does NOT count against the cargo hold.",
  "Nimmt die eingestellte Menge Bevölkerung aus dem Hafenlager als Kolonisten an Bord.":
    "Takes the set amount of population from the port's storage aboard as colonists.",
  "Alle Kolonisten an Bord ans Lager zurückgeben": "Give all colonists on board back to storage",
  "Alle absetzen": "Drop off all",
  "Kolonistenraum voll.": "Colonist quarters full.",
  "Keine Bevölkerung im Lager.": "No population in storage.",
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
  "Reichweite {reichweite} · 1 Stützpunkt · {systeme} Systeme":
    "Reach {reichweite} · 1 base · {systeme} systems",
  "{anzahl} in Reichweite · nach Entfernung sortiert": "{anzahl} within reach · sorted by distance",
  "{entfernung} von {planet} (nächster eigener Stützpunkt)": "{entfernung} from {planet} (your nearest base)",
  "Kein eigener Stützpunkt vorhanden": "You have no base yet",
  "Deine Reichweite: {reichweite}": "Your reach: {reichweite}",
  "Fehlen {fehlt} – Antriebstechnik erhöht die Reichweite, ein näherer Stützpunkt verkürzt die Strecke.":
    "{fehlt} short – Propulsion Tech increases your reach, a closer base shortens the distance.",
  "Eigene Stützpunkte hier: {liste}": "Your bases here: {liste}",
  "1 Orbit bereits untersucht": "1 orbit already surveyed",
  "{anzahl} Orbits bereits untersucht": "{anzahl} orbits already surveyed",
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
  "genau {menge}": "exactly {menge}",
  " · liegengeblieben: {rest} (bergbar)": " · left behind: {rest} (salvageable)",
  "Liegengeblieben: {rest}": "Left behind: {rest}",
  "Verschlossen – benötigt {tech}": "Sealed – requires {tech}",
  "verschlossen – benötigt {tech}": "sealed – requires {tech}",
  "Nächster Schritt: {mission}": "Next step: {mission}",
  "Nächster Schritt: {mission} (braucht {schiff})": "Next step: {mission} (needs a {schiff})",
  "Hier ist nichts mehr zu holen.": "There is nothing left to get here.",
  // Stockungs-Diagnose (A-030). Sieht der Spieler nur, wenn die Anzeige
  // wirklich gehangen hat -- dann ist es die wichtigste Meldung der Liste.
  "Anzeige hing {dauer} ms – Ursache: {wer}": "Display stalled for {dauer} ms – cause: {wer}",
  unbekannt: "unknown",
  "[Stockung] Dieser Browser meldet keine unbenannten langen Aufgaben. Die Phasen melden sich weiter selbst.":
    "[Stall] This browser does not report unnamed long tasks. The named phases still report themselves.",
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
  "Deshalb trägt jede Anlage eine Vorrangstufe: Vorrang, Normal oder Nachrang. Zugeteilt wird von oben nach unten – die höchste Stufe zuerst und vollständig, was übrig bleibt, fließt eine Stufe tiefer. Genau so wirft ein Stromnetz Lasten ab.":
    "That is why every facility carries a priority level: priority, normal or low. Allocation runs from the top down – the highest level first and in full, whatever remains flows down one level. This is exactly how a power grid sheds load.",
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
  "Die Schwerkraft ist der stärkste einzelne Faktor, und das aus einem einfachen Grund: jedes Bauwerk muss sein eigenes Gewicht tragen. Auf einer schweren Welt kostet dieselbe Anlage mehr Material.":
    "Gravity is the single strongest factor, for a simple reason: every structure has to carry its own weight. On a heavy world the same facility costs more material.",
  "Manches siehst du, ohne es nutzen zu können. Ein tiefliegendes Vorkommen bleibt sichtbar und verschlossen, bis du die passende Technologie hast. Entdecken und Verwerten sind zwei verschiedene Dinge. Verschlossen ist dabei nur die Quelle selbst – was schon vorher dort liegt oder zurückgelassen wurde, kannst du jederzeit bergen.":
    "Some things you can see without being able to use them. A deep deposit stays visible and locked until you have the matching technology. Discovering and exploiting are two different things. Only the source itself is locked – anything that was already lying there or left behind can be salvaged at any time.",

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

  // A-150: der sofortige Hinweis auf die Oberfläche, bevor überhaupt geklickt
  // wurde (im Gegensatz zum Handbuch-Hinweis oben, der eine Minute wartet).
  "Oben die Ressourcen, links die Bereiche, rechts die Statusspalte mit Meldungen – kurz erklärt im Handbuch.":
    "Resources up top, areas on the left, the status column with messages on the right – briefly explained in the manual.",

  // Das Erklärfenster beim allerersten Start (erststartTafel in
  // js/handbuch.js). Zwei seiner vier Absätze sind wörtlich aus dem Handbuch
  // geborgt und stehen deshalb weiter oben -- hier steht nur, was es NICHT
  // schon gibt.
  "Eine Welt, und eine Frist": "One world, and a deadline",
  "Du führst genau eine Welt: {planet}. Ein Wohnmodul, ein kleiner Vorrat – und ein Himmel voller Sterne, in denen noch nie jemand war.":
    "You run exactly one world: {planet}. One habitat, a small stock of supplies – and a sky full of stars where no one has ever been.",
  // A-045: der alte Satz empfahl das Forschen, das im Startzustand gar nicht
  // geht -- genau die Stelle, die Chris gemeldet hat.
  "Zum Anfangen genügt ein Handgriff: im Bereich Planet eine Anlage ausbauen – Kraftwerk und Wohnmodul tragen alles andere. Geforscht wird erst, wenn ein Forschungslabor steht; Forschung ist kein Kauf, sondern Arbeit, und ohne Labor arbeitet niemand daran.":
    "One move is enough to start: upgrade a facility under Planet – the power plant and the habitat carry everything else. Research only begins once a research lab stands; research is not a purchase but work, and without a lab nobody is doing it.",
  "Die Uhr oben im Kopf zeigt, wieviel Zeit bleibt. Alles Weitere steht im Handbuch – jederzeit, unterster Eintrag in der Leiste links.":
    "The clock in the header shows how much time is left. Everything else is in the manual – at any time, bottom entry in the bar on the left.",
  "Handbuch öffnen": "Open the manual",
  "Los geht's": "Let's go",

  // Der Feedback-Kanal (A-018). Der Körper des vorbefüllten GitHub-Formulars
  // steht in js/feedback.js -- er wird in der Sprache abgeschickt, in der der
  // Tester gespielt hat, und genau das wollen wir auch lesen.
  Feedback: "Feedback",
  "Was ist passiert?": "What happened?",
  "Was hast du erwartet?": "What did you expect?",
  "Version {version} ({stand}) – automatisch eingetragen, bitte stehen lassen.":
    "Version {version} ({stand}) – filled in automatically, please leave it in.",
  "Rückmeldung geben": "Send feedback",
  "Das hier ist ein Entwicklungsstand, kein fertiges Spiel. Was dir auffällt, ist deshalb ausdrücklich erwünscht: ein Fehler, eine Stelle, an der du nicht weiterwusstest, etwas, das sich falsch anfühlt.":
    "This is a work in progress, not a finished game. So whatever strikes you is explicitly welcome: a bug, a place where you got stuck, something that feels wrong.",
  "Der Link öffnet ein Formular in einem neuen Tab – dieses hier läuft weiter, du verlierst nichts. Welche Fassung du vor dir hast, trägt er selbst ein; das ist die Angabe, die uns sonst immer fehlt. Zum Abschicken braucht es ein GitHub-Konto.":
    "The link opens a form in a new tab – this one keeps running, you lose nothing. Which build you are looking at is filled in for you; that is the detail we otherwise always miss. Sending it requires a GitHub account.",

  // Neuigkeiten & Roadmap (A-019). Der deutsche Text kommt WÖRTLICH aus
  // AUFTRAEGE/ROADMAP.md -- wer ihn hier ändert, muss ihn dort ändern lassen
  // (die Datei gehört der Planung), sonst zeigen deutsche und englische
  // Fassung Verschiedenes.
  "Neuigkeiten & Roadmap": "What's new & roadmap",
  "Diese Demo ist unterwegs, nicht fertig. Hier steht, was zuletzt dazugekommen ist und was als Nächstes drankommt – damit du weißt, was du siehst, und nicht meldest, was schon auf dem Zettel steht.":
    "This demo is on its way, not finished. Here is what was added most recently and what comes next – so you know what you are looking at, and do not report what is already on the list.",
  Kürzlich: "Recently",
  Bald: "Soon",
  "In Arbeit": "In progress",
  Später: "Later",
  "Hänger bei Zeitsprüngen und Tab-Wechseln behoben — und wenn doch etwas stockt, meldet das Spiel es jetzt selbst":
    "Stalls on time jumps and tab switches fixed — and if something does hang, the game now says so itself",
  "Erklärung beim allerersten Start, Handbuch, Galaxie- und Systemkarte":
    "An explanation on the very first start, the manual, galaxy and system maps",
  "Meldungen zeigen nur noch, was dein Imperium betrifft":
    "Messages now only show what concerns your empire",
  "Ingame-Datum „Jahr N · Tag M“ — Fristen sind jetzt lesbar":
    "In-game date “Year N · Day M” — deadlines are readable now",
  "Gebäude nach Themen sortiert, Countdown mit Frist und Balken":
    "Buildings sorted by theme, countdown with deadline and bar",
  "Fremde Stützpunkte sind als fremd erkennbar; die Flut trifft alle Fraktionen nach denselben Regeln":
    "Foreign outposts are recognisable as foreign; the flux hits every faction by the same rules",
  "Der Treibstoff heißt jetzt physikalisch ehrlich Deuterium":
    "The fuel is now called deuterium, which is what it physically is",
  "Feedback-Link, Roadmap und „Was ist neu“ direkt im Spiel":
    "Feedback link, roadmap and “what's new” right inside the game",
  "Bauen ohne volle Ressourcen — die Warteschlange wartet und baut dann":
    "Queueing without full resources — the queue waits and then builds",
  "Flotten bleiben am Ziel; der Sonden-Schnellversand denkt mit":
    "Fleets stay at their destination; quick probe dispatch thinks along",
  "Hotkeys für die Bedienung": "Hotkeys for the controls",
  "Kacheln zeigen ihren Bau- und Forschungsfortschritt als Fläche":
    "Tiles show their build and research progress as an area",
  "Energie bekommt echte Entscheidungen: zwei Kraftwerkstypen mit Vor- und Nachteilen":
    "Power gets real decisions: two kinds of plant, each with upsides and downsides",
  "Eine zweite Verarbeitungskette": "A second processing chain",
  "Ressourcen-Namen werden physikalisch ehrlich": "Resource names become physically honest",
  "Die Versorgungskrise wird ernster — und bekommt einen Ausweg":
    "The supply crisis gets more serious — and gets a way out",
  "Endliche Vorkommen — ⚠ dieser Schritt setzt Spielstände einmalig zurück":
    "Finite deposits — ⚠ this step resets saved games once",
  "Lesbare Systemnamen statt Nummern": "Readable system names instead of numbers",
  "Oberfläche fürs Handy": "A layout for phones",
  "Was hier nicht steht und dir trotzdem auffällt, gehört in eine Rückmeldung – der Abschnitt darüber sagt, wie.":
    "Anything not listed here that strikes you anyway belongs in a piece of feedback – the section above says how.",

  // --- Fertigungstechnik (A-062) --------------------------------------------
  Fertigungstechnik: "Manufacturing technology",
  "Verbessert die Ausbeute deiner Fertigungen um 7% pro Stufe. Was in der Halbleiterfertigung zählt, ist nicht Menge, sondern Ausbeute: von einer Scheibe wird nur der Teil brauchbar, auf dem kein einziger Defekt sitzt. Jede Verbesserung an Reinheit und Prozessführung verschiebt genau diesen Anteil – dieselbe Anlage, dieselbe Menge Silizium, mehr fertige Bauteile.":
    "Improves the yield of your manufacturing plants by 7% per level. What counts in semiconductor manufacturing is not quantity but yield: of a wafer, only the part without a single defect becomes usable. Every improvement in purity and process control shifts exactly that share – same plant, same silicon, more finished components.",

  // --- Laborbedarf: Forschung kostet Material am Ort (A-061) ----------------
  " · gebremst: {res} fehlt den Laboren": " · slowed: the labs are short of {res}",
  "{labore} Labor/Labore stehen still – es fehlt {res}":
    "{labore} lab(s) are standing still – {res} is missing",

  // --- Die drei Momente, die sich selbst erklären (A-060) -------------------
  // Moment 3 (der Blitz) fehlt hier mit Absicht: er zitiert einen
  // Handbuch-Absatz, der schon übersetzt ist.
  "Deine Werft steht. Sonden sind Einwegschiffe – eine deckt genau ein Ziel auf und bleibt dort. Erkunder kommen zurück und arbeiten mehrere Orbits nacheinander ab. Frachter tragen, und ihr Frachtraum ist zugleich der einzige Platz für zusätzlichen Treibstoff. Welche Rümpfe überhaupt vom Band laufen, entscheidet die Stufe der Werft – sie baut nicht nur schneller, sie schaltet die größeren erst frei.":
    "Your shipyard is up. Probes are one-way ships – each uncovers exactly one target and stays there. Scouts come back and work through several orbits one after another. Freighters carry, and their hold is also the only place for extra fuel. Which hulls leave the line at all depends on the shipyard's level – it does not just build faster, it unlocks the larger ones in the first place.",
  "Piraten in deinem System. Sie sind kein Naturereignis: sie bauen, tanken und kämpfen nach denselben Regeln wie du. Sie greifen Fracht an und nie Planeten – deine Welten sind sicher, deine Transporte nicht. Und im All gibt es keine Tarnung: du siehst sie kommen, so wie sie dich. Ein Kriegsschiff im Verband ist die Antwort darauf.":
    "Pirates in your system. They are not a force of nature: they build, refuel and fight by the same rules you do. They attack cargo and never planets – your worlds are safe, your transports are not. And there is no stealth in space: you see them coming, just as they see you. A warship in the group is the answer to that.",

  // --- Der Hinweis auf ein zu kleines Fenster (A-111) ------------------------
  "Dein Fenster ist kleiner, als Entropy es erwartet – die Oberfläche ist für etwa 1900 × 950 Punkte gebaut, hier sind es {breite} × {hoehe}. Die Seite scrollt deshalb, statt etwas abzuschneiden. Mehr Platz bekommst du mit Vollbild (F11) oder einer niedrigeren Windows-Skalierung.":
    "Your window is smaller than Entropy expects – the interface is built for about 1900 × 950 points, here it is {breite} × {hoehe}. The page scrolls because of that, instead of cutting something off. You get more room with fullscreen (F11) or a lower Windows scaling setting.",

  // --- Ersteinstieg: was für ein Spiel das ist, und wo alles liegt (A-059) --
  "Entropy ist deshalb ein Spiel für nebenbei. Es läuft langsam, und das ist Absicht und nicht dein Fehler: Fortschritt braucht hier Geduld, in den ersten Minuten passiert wenig, und die Welt arbeitet auch dann weiter, wenn du nicht hinsiehst. Wegzugehen ist kein Aussetzen – nur die Frist wartet eben auch nicht.":
    "Entropy is therefore a game for the side of your day. It runs slowly, and that is on purpose and not your mistake: progress here takes patience, little happens in the first few minutes, and the world keeps working while you are not watching. Walking away is not pausing – it is only the deadline that does not wait either.",
  "Die Oberfläche": "The screen",
  "Der Bildschirm hat vier feste Zonen, und sie ändern ihre Plätze nie: der Kopf ganz oben, die beiden Ressourcenreihen darunter, links die Bereichsleiste – und rechts eine Spalte, die man auf- und zuklappen kann.":
    "The screen has four fixed zones, and they never swap places: the header at the very top, the two resource rows below it, the area bar on the left – and on the right a column you can fold in and out.",
  "Im Kopf stehen zwei Zeiten nebeneinander, und sie meinen Verschiedenes. Das Datum ist der Kalender deiner Welt und läuft immer. Die Uhr daneben ist die Frist: sie nennt das nächste Ereignis der Supernova und zeigt als Balken, wieviel davon schon vorbei ist. Gibt es gerade keine Frist, ist die Uhr weg – das Datum bleibt.":
    "The header carries two times side by side, and they mean different things. The date is your world's calendar and always runs. The clock next to it is the deadline: it names the supernova's next event and shows as a bar how much of it has already passed. When there is no deadline, the clock is gone – the date stays.",
  "Darunter liegen zwei Reihen, und der Unterschied zwischen ihnen ist der wichtigste in der ganzen Wirtschaft. Oben steht, was du HAST: Lagerbestände, die sich ansammeln. Unten steht, was du KANNST: Strom, Arbeitskraft und Lagerplatz – Größen, die pro Zeit anfallen oder als Platz begrenzt sind und nicht gespart werden können. Wer die untere Reihe für einen Vorrat hält, wundert sich früher oder später.":
    "Below it lie two rows, and the difference between them is the most important one in the whole economy. The top row is what you HAVE: stored goods, which pile up. The bottom row is what you CAN DO: power, workforce and storage space – quantities that arrive per unit of time or are limited as room, and cannot be saved up. Mistake the bottom row for a stockpile and you will be surprised sooner or later.",
  "Links wechselst du den Bereich; sichtbar ist immer genau einer. Ein Punkt an einem Eintrag heißt: dort läuft gerade etwas. Dieselben Bereiche erreichst du mit den Zifferntasten – der Abschnitt Steuerung listet sie.":
    "On the left you switch areas; exactly one is visible at a time. A dot on an entry means something is running there. The same areas are on the number keys – the Controls section lists them.",
  "Die Spalte rechts zeigt, was gerade läuft, egal welcher Bereich offen ist: Bauaufträge, Forschung, Werft, unterwegs befindliche Flotten – und die Meldungen. Sie ist der einzige Ort, an dem dein Spiel dich anspricht. Mit dem Griff an ihrem Rand klappt sie zu, wenn du den Platz brauchst; dann läuft alles weiter, du siehst es nur nicht mehr.":
    "The column on the right shows what is running, whichever area is open: construction, research, the shipyard, fleets under way – and the messages. It is the one place where your game speaks to you. The handle on its edge folds it away when you need the room; everything keeps running then, you just stop seeing it.",

  // --- Die Kommandoleiste an der Karte (A-057) ----------------------------
  Kommando: "Command",
  "1 · Flotte": "1 · Fleet",
  "2 · Ziel": "2 · Target",
  "3 · Auftrag": "3 · Order",
  Verschicken: "Send out",
  "Öffnet die Karte mit dieser Flotte in der Kommandoleiste – Ziel anklicken, Auftrag wählen, los.":
    "Opens the map with this fleet in the command column – click a target, pick an order, go.",
  "Wähle eine Flotte – als Chip oben oder mit einem Klick auf ihren Punkt in der Karte.":
    "Pick a fleet – as a chip above or by clicking its dot on the map.",
  "Wähle ein Ziel – klicke einen Orbit in der Systemkarte oder eine Zeile in der Systemliste an.":
    "Pick a target – click an orbit on the system map or a row in the system list.",
  "Dieser Orbit trägt nichts.": "There is nothing in this orbit.",
  "{schiffe} · {sprit} Deuterium · Reichweite {weite}":
    "{schiffe} · {sprit} deuterium · range {weite}",
  "Kein Ziel gewählt": "No target selected",
  "{system} · Orbit {orbit}{name}": "{system} · orbit {orbit}{name}",
  "Entfernung {distanz}": "Distance {distanz}",
  "Flug {dauer}": "Flight {dauer}",
  "Erstflug – keine vermessene Route": "First flight – no surveyed route",
  "zurück zum Heimathafen": "return to home port",
  Nachtanken: "Refuel",
  "{bedarf} nötig · {anBord} an Bord": "{bedarf} needed · {anBord} aboard",
  "Nachtanken geht nur im Hafen – diese Flotte liegt nirgends an.":
    "Refuelling only works in port – this fleet is not docked anywhere.",
  "Wird vor dem Start aus dem Hafenlager übernommen. Vorgeschlagen ist genau das, was für diese Fahrt fehlt.":
    "Taken from the port stores before departure. The suggested amount is exactly what this trip is short of.",
  Los: "Go",
  "Bereit: {auftrag}": "Ready: {auftrag}",
  "Flotte → Ziel → Auftrag": "Fleet → target → order",

  // Der Hinweis nach einem Versionswechsel (A-040).
  "Neu in v{version} – was sich geändert hat": "New in v{version} – what changed",
  "Öffnet das Handbuch": "Opens the manual",

  // --- „Diese Welt in Zahlen" (A-064) -------------------------------------
  "Diese Welt in Zahlen": "This World in Numbers",
  Standort: "Location",
  Welt: "World",
  Orbit: "Orbit",
  Schwerkraft: "Gravity",
  "{g} g · Bauen {bau} · Starten {start}": "{g} g · building {bau} · launching {start}",
  "Bauen ist ein Traglastproblem und wächst linear mit der Schwerkraft. Starten ist ein Raketenproblem und wächst quadratisch – eine schwere Welt ist eine gute Mine und ein schlechter Raumhafen.":
    "Building is a load-bearing problem and grows linearly with gravity. Launching is a rocket problem and grows quadratically – a heavy world is a good mine and a poor spaceport.",
  Vorkommen: "Deposits",
  "überall Durchschnitt": "average everywhere",
  "{res}: keins": "{res}: none",
  "Bestände & Kapazitäten": "Stocks & Capacities",
  Warenlager: "Warehouse",
  "{belegt} / {kapazitaet} m³": "{belegt} / {kapazitaet} m³",
  "noch nicht gebaut": "not built yet",
  "{bestand} / {kapazitaet}{einheit}": "{bestand} / {kapazitaet}{einheit}",
  "Flüsse netto": "Net Flows",
  "{erzeugt} erzeugt · {gebraucht} gebraucht · {netto}":
    "{erzeugt} generated · {gebraucht} drawn · {netto}",
  Brennstoff: "Fuel",
  "reicht {dauer}": "lasts {dauer}",
  "frei {frei} von {gesamt}": "{frei} free of {gesamt}",
  "gedrosselt auf {anteil}%": "throttled to {anteil}%",
  "Bevölkerung & Schwellen": "Population & Thresholds",
  "Wohnraum voll": "housing full",
  "wächst nicht": "not growing",
  "Wohnraum voll in": "Housing full in",
  Schwellen: "Thresholds",
  "alle erreicht": "all reached",
  "braucht {tech}": "needs {tech}",
  "{ist} / {soll}": "{ist} / {soll}",
  Laufendes: "In Progress",
  Bau: "Construction",

  // Orbitzonen und Wasservorrat stehen als Kennungen im Planeten und laufen
  // erst seit A-064 durch t() -- vorher zeigte sie niemand einzeln an.
  heiß: "hot",
  warm: "warm",
  habitabel: "habitable",
  kalt: "cold",
  äußer: "outer",
  trocken: "dry",
  "mäßig feucht": "moderately moist",
  wasserreich: "water-rich",

  // --- Beschaffungszeit auf der Ausbau-Kachel (A-065) ---------------------
  "{res}: {dauer}": "{res}: {dauer}",
  "{res}: keine Produktion": "{res}: no production",
  "{res}: es fehlen {menge}, und es kommt nichts nach.":
    "{res}: {menge} short, and nothing is coming in.",
  "{res}: es fehlen {menge} – bei deiner {anlage} noch {dauer}.":
    "{res}: {menge} short – at your {anlage} that is another {dauer}.",
  "{res}: es fehlen {menge} – bei deinem Zufluss noch {dauer}.":
    "{res}: {menge} short – at your current inflow that is another {dauer}.",

  // --- Anreicherung: der zweite Betriebsmodus des Extraktors (A-071) -------
  Anreicherung: "Enrichment",
  "an · −{strom} MW → {menge}": "on · −{strom} MW → {menge}",
  "aus · {kurs} MWh je t": "off · {kurs} MWh per t",
  Einschalten: "Switch on",
  Ausschalten: "Switch off",
  "Trennt Deuterium aus Wasser, statt es zu fördern – bezahlt mit Strom. {kurs} MWh je Tonne, das {faktor}-fache dessen, was ein Kraftwerk aus derselben Tonne holt. Reicht der Strom nicht, drosselt die ganze Anlage – auch die Förderung.":
    "Separates deuterium from water instead of extracting it – paid for in power. {kurs} MWh per tonne, {faktor} times what a power plant gets back out of that same tonne. If power runs short, the whole facility throttles – extraction included.",
  Anreicherungstechnik: "Enrichment Technology",
  "Schaltet am Deuterium-Extraktor einen zweiten Betriebsmodus frei: Anreicherung trennt schweren Wasserstoff aus Wasser, statt ihn zu fördern – bezahlt wird mit Strom. Deuterium steckt in jedem Wasser, aber nur in jedem sechstausendvierhundertsten Wasserstoffkern; die beiden Sorten unterscheiden sich chemisch fast nicht, und genau deshalb ist die Trennung Arbeit. Sie erzeugt nichts, sie sortiert – und wie jede Sortierung kostet sie mehr, als der Unterschied wert ist. Wieviel mehr, entscheidet in diesem Spiel die Spielbarkeit und nicht die Physik: wirklich liefert eine Tonne Deuterium in der Fusion um Größenordnungen mehr Energie, als ihre Abtrennung kostet.":
    "Unlocks a second operating mode on the deuterium extractor: enrichment separates heavy hydrogen from water instead of extracting it – paid for in power. Deuterium is in every drop of water, but only in one hydrogen nucleus out of every six thousand four hundred; the two kinds are chemically almost identical, and that is exactly why separating them is work. It creates nothing, it sorts – and like any sorting it costs more than the difference is worth. How much more is decided in this game by playability, not by physics: in reality a tonne of deuterium yields orders of magnitude more energy in fusion than its separation costs.",
  // --- Spielstand sichern und zurückholen (A-073) -------------------------
  Spielstand: "Save game",
  "Dein Spielstand liegt im Speicher deines Browsers – und der gehört dem Browser, nicht dir: „Chronik beim Schließen löschen“, Privatmodus oder knapper Speicherplatz können ihn jederzeit entfernen. Hier holst du ihn als Text heraus und legst ihn ab, wo er dir gehört.":
    "Your save game lives in your browser's storage – and that belongs to the browser, not to you: “clear history on close”, private mode or a shortage of space can remove it at any time. Here you can pull it out as text and keep it somewhere that is yours.",
  "Einspielen ersetzt die laufende Partie. Der bisherige Stand wandert dabei in die Rettungs-Sicherung des Browsers – aber verlass dich nicht darauf, hol ihn dir vorher heraus.":
    "Loading a save replaces the running game. The previous state is moved to the browser's rescue backup – but do not rely on that, pull it out first.",
  "Hier erscheint dein Spielstand – oder füge hier einen ein, den du zurückholen willst.":
    "Your save game appears here – or paste one here that you want to restore.",
  "Stand anzeigen": "Show save",
  "Der Stand steht im Feld und ist markiert – mit Strg+C kopieren und ablegen.":
    "The save is in the field and selected – press Ctrl+C to copy it and keep it somewhere.",
  "Als Datei speichern": "Save to file",
  "Gespeichert als {datei}.": "Saved as {datei}.",
  Einspielen: "Load save",
  "Diesen Stand einspielen? Die laufende Partie wird dabei ersetzt.":
    "Load this save? The running game will be replaced.",
  "Kein Text eingefügt.": "No text pasted.",
  "Das ist kein Spielstand – der Text ließ sich nicht lesen. Beim Kopieren nichts weglassen, auch nicht die Klammern am Anfang und Ende.":
    "That is not a save game – the text could not be read. When copying, leave nothing out, including the braces at the start and the end.",
  "Das ist kein Spielstand.": "That is not a save game.",
  "Das ist zwar lesbarer Text, aber kein Spielstand dieses Spiels.":
    "That is readable text, but not a save game from this game.",
  "Dieser Stand stammt aus einer älteren Fassung des Spiels (Format {alt}, gebraucht wird {neu}) und lässt sich nicht mehr laden.":
    "This save comes from an older version of the game (format {alt}, {neu} is required) and can no longer be loaded.",
  "Der Spielstand ist unvollständig – vermutlich wurde beim Kopieren ein Teil abgeschnitten.":
    "The save game is incomplete – a part of it was probably cut off while copying.",
  "Damit das Weggehen sicher ist, muss dein Stand die Pause überleben – und er liegt im Speicher deines Browsers. Der räumt ihn unter Umständen von selbst weg: beim Löschen der Chronik, im Privatmodus oder wenn ihm der Platz ausgeht.":
    "For walking away to be safe, your save has to survive the break – and it lives in your browser's storage. The browser may clear it on its own: when you delete your history, in private mode, or when it runs out of space.",
  "Vorsorge dagegen steht im Bereich Development unter „Spielstand“: dort holst du deinen Stand als Text heraus und legst ihn ab, wo er dir gehört – und spielst ihn von dort auch wieder ein.":
    "The precaution against that is in the Development area under “Save game”: pull your save out as text, keep it somewhere that is yours – and load it back from there.",

  // --- Einstellungsfenster (A-140) -----------------------------------------
  Einstellungen: "Settings",
  Sprache: "Language",
  "Größe der Oberfläche": "Interface size",
  "Verkleinert die ganze Oberfläche zwischen 70 % und 100 % -- wirkt sofort. Praktisch bei wenig Bildschirmplatz, geht auf Kosten der Lesbarkeit.":
    "Shrinks the whole interface between 70% and 100% -- takes effect immediately. Useful when screen space is tight, at the cost of readability.",
  Schließen: "Close",
};
