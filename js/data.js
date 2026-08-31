// Statische Spieldaten.
//
// Alles hier ist bewusst datengetrieben: neue Ressourcen, Gebäude oder
// Forschungen sollen durch Einträge in diesen Tabellen entstehen, nicht
// durch neue Sonderfälle im Code. Das Spiel ist auf viele Ressourcen und
// Spezialisierung ausgelegt.

// Sichtbare Spielversion. Steht im Kopf der Oberfläche, damit auf einen Blick
// erkennbar ist, welcher Stand gerade läuft -- wichtig, seit es neben dem
// Entwicklungsordner eine eingefrorene Spielkopie gibt (siehe SPIELKOPIE.md).
//
// SEIT A-109 (21.08.2026) GILT 0.MINOR.PATCH, keine Gewichtsregel mehr:
//   PATCH  +1 je Umsetzungsrunde, sonst nichts -- keine Ermessensfrage.
//   MINOR  fasst die Umsetzung NIE an; zählt veröffentlichte Demo-Stände,
//          gesetzt von der Planung beim dist-Push.
//   MAJOR  bleibt 0, bis das Spiel wirklich erscheint; 1.0.0 ist reserviert.
// Immer hier UND in package.json hochzählen, und eine Zeile in CHANGELOG.md --
// beim Übernehmen sieht Tobi sonst nur eine Zahl und muss nachfragen.
//
// NICHT ZU VERWECHSELN mit SAVE_VERSION in state.js: die steigt nur, wenn eine
// laufende Partie dabei verloren geht, und folgt einer eigenen Regel.
export const VERSION = "0.7.0";

// Welcher der beiden Stände liefert diese Dateien aus? Der Wert steht hier auf
// "entwicklung" und wird von uebernehmen.mjs beim Kopieren auf "spielkopie"
// umgeschrieben -- die Markierung reist also MIT DEN DATEIEN und nicht mit dem
// Port. Genau daran hat es gefehlt: am 2026-08-16 stellte sich heraus, dass der
// Server auf Port 5184 seit dem 13.08. mit falschem Arbeitsverzeichnis lief und
// zwei Tage lang den Entwicklungsordner statt der Spielkopie auslieferte. Die
// launch.json war korrekt, der PROZESS war älter als die Trennung -- von außen
// war das nur an einer Versionsnummer zu erkennen, die man kennen musste.
//
// Die Vorgabe ist bewusst "entwicklung": schlägt das Umschreiben beim Kopieren
// fehl, behauptet die Spielkopie fälschlich, Entwicklungsstand zu sein. Das ist
// die harmlose Richtung. Der gefährliche Irrtum ist der umgekehrte -- sich auf
// einem eingefrorenen Stand zu wähnen, während in Wahrheit gebaut wird.
export const STAND = "demo";

// --- Die Saat der Demo ------------------------------------------------------
// DEMO.md hält als Tobis Entscheidung fest: die Demo läuft auf einer FESTEN
// Galaxie-Saat. Der Grund ist nicht Bequemlichkeit, sondern Ehrlichkeit --
// die Entfernung des sterbenden Sterns soll zur gerechneten Frist passen,
// statt dass eine Zahl gebogen wird, damit sie hinkommt.
//
// Zwei Dinge hängen zusätzlich daran:
//   - Jeder Demo-Spieler bekommt DIESELBE geprüfte Welt. Ohne feste Saat gilt
//     alles, was wir gemessen haben, nur für die eine Galaxie, in der wir
//     gemessen haben.
//   - Startwelten schwanken um Faktor 1,23 (tests/pacing.mjs). Das ist als
//     Streuung gewollt, für eine Demo aber ein Glücksspiel darüber, wie hart
//     der Einstieg wird.
//
// AUSGEWÄHLT, NICHT GERATEN: `node tests/saatwahl.mjs` bewertet Kandidaten
// nach dem, was ein Spieler in den ersten Stunden vorfindet. Diese hier ergab
// 14 Aktionen in zwei Stunden (Sollband 13-16, Mitte), größte Leerlauflücke
// 21 Minuten, 6 Nachbarsysteme in Startreichweite und einen sterbenden Stern
// in 28,9 Lichtjahren -- die gerechnete Annahme sind 29 (SUPERNOVA).
//
// null hier setzen heißt: wieder würfeln. Dann bekommt jede Partie ihre
// eigene Galaxie, und die Messwerte oben gelten nicht mehr.
export const DEMO_SAAT = 20269933;

// Die Namen und Beschreibungen in diesen Tabellen bleiben einsprachig: der
// deutsche Text IST der Übersetzungsschlüssel (siehe sprache.js). Übersetzt
// wird an den anzeigenden Stellen, nicht hier. Einzige Ausnahme ist
// voraussetzungenText() weiter unten -- die einzige Funktion in dieser Datei,
// die Anzeigetext zusammensetzt.
import { t } from "./sprache.js";

export const MASSSTAB = 50;

// --- Zeitmaßstab ----------------------------------------------------------
// Bis v0.5 hatte das Spiel überhaupt keinen Referenzpunkt für Zeit: eine
// Sekunde am Bildschirm war eine Sekunde in der Welt. Das war nicht bloß
// unscharf, es war nachweislich falsch -- eine Startbevölkerung von 50.000
// wuchs in zwei Stunden Testspiel auf 80.000. Kein menschliches Volk tut das.
//
// GEWÄHLTER ANKER: die Bevölkerung. Sie ist die einzige Größe im Spiel, deren
// echte Rate keine Technologie um Größenordnungen verschiebt -- Fördermengen
// und Reisegeschwindigkeit kann man beliebig setzen, Fortpflanzung nicht.
// Entropy wächst um 2,5 % je fünf Minuten Echtzeit. Setzt man diese fünf
// Minuten auf ein Jahr, ergibt sich ein Wachstum von 3,0 % im Jahr: die
// Obergrenze eines real schnell wachsenden Volkes (Weltmaximum 1968: 2,1 %;
// koloniale Siedlergesellschaften hielten rund 3 %).
//
//   ==> 1 Sekunde Echtzeit = 1 Spieltag
//
// Alles Weitere FOLGT daraus, statt gewählt zu werden:
//   1 Galaxie-Einheit ~ 0,4 Lj   (80 Systeme auf Radius 120, gemessen an der
//                                 echten Sternendichte: Sonne->Proxima 4,2 Lj)
//   12 s je Einheit              -> rund 12-fache Lichtgeschwindigkeit, also
//                                   ein Sprungantrieb, über den man reden kann
//                                   (siehe LORE-PHYSIK.md, Abschnitt 6)
//   30 s Grundflugzeit           -> 30 Tage Sprungvorbereitung
//   2 Stunden Spielsitzung       -> rund 20 Spieljahre
//
// WICHTIG -- das hier ist eine ACHSE, keine Rate. Das Spiel rechnet intern
// unverändert in Echtzeitsekunden weiter; diese Zahlen ändern ausschließlich,
// wie Zeiten und Raten ANGEZEIGT werden. Dreht man daran, verschiebt sich
// deshalb kein Pacing. Genau das ist auch die Probe: verschiebt sich nach
// einer Änderung hier das Pacing, rechnet irgendwo Spielmechanik mit der
// Anzeigeachse statt mit Sekunden.
//
// Eine bekannte Schwäche, bewusst nicht in dieser Runde behoben:
//   - Nahrungsbedarf und Fördermenge stehen im falschen VERHÄLTNIS zueinander
//     (eine Mine ernährt hier 150.000 Menschen, real entspräche eine große
//     Mine der Nahrung von rund 40 Millionen). Das ist keine Frage der
//     Einheit und keine des Zeitmaßstabs, sondern Balancing.
//   (Die zweite, das LINEARE Wachstum statt proportional, behob A-117: der
//   Anker gilt seither bei jeder Einwohnerzahl, nicht mehr nur am Spielanfang
//   -- siehe `bevoelkerungsSchrittFaktor` bei BEVOELKERUNG unten.)
export const ZEIT = {
  spieltageProSekunde: 1,
  tageProJahr: 365.25,
};

// Wie viele Lichtjahre eine Galaxie-Einheit misst.
//
// Stand bisher nur in Kommentaren und war damit eine Zahl, die jeder neu
// herleiten musste. Sie ist die BRÜCKE zwischen Spielstrecken und Physik:
// aus ihr folgen die Sprunggeschwindigkeit, die Reichweiten in Lichtjahren
// und die Dauer eines Unterlichtflugs. Hergeleitet aus der Sternendichte
// (80 Systeme auf Radius 120 -> Nachbarabstand ~12 Einheiten, real wenige
// Lichtjahre; Sonne->Proxima 4,2 Lj).
export const LJ_PRO_EINHEIT = 0.4;

// --- Sprungrouten ----------------------------------------------------------
// LORE-PHYSIK Abschnitt 6 begründet ausführlich, warum ein Sprung ein
// VERMESSENES Ziel braucht: die Krasnikov-Röhre wird auf dem langsamen Hinweg
// gebaut, ein Wurmloch braucht seinen zweiten Mund am Ziel, und eine
// Warp-Blase ist von ihrer eigenen Vorderkante kausal abgeschnitten -- die
// Bahn muss vorher eingerichtet sein. Ein Blindsprung in unvermessenen Raum
// ist tödlich, nicht bloß ungenau.
//
// Bis v0.67 stand das im Lore und nirgends im Spiel: JEDER Flug war ein Sprung
// auf eine Route, die niemand gebaut hat.
//
// Seit v0.68 gilt: **der erste Flug in ein System ist unterlichtschnell.**
// Wer ankommt, setzt den Anker -- danach ist es ein Sprung wie jeder andere.
// Der Preis dafür ist Zeit, und zwar viel: bei 5 % Lichtgeschwindigkeit
// braucht eine Galaxie-Einheit (0,4 Lj) acht Jahre, ein Nachbarstern also
// rund 95 Jahre. Im Zeitmaßstab sind das Stunden Echtzeit -- etwas, das man
// losschickt und am nächsten Abend vorfindet.
//
// Warum ausgerechnet 5 % c: schneller ginge, aber ein Schiff, das am Ziel
// ANHALTEN muss (der Anker bleibt dort), zahlt das Abbremsen genauso teuer
// wie das Beschleunigen, und die Raketengleichung lässt den Treibstoff
// exponentiell mit Δv wachsen. Vorbeiflug-Konzepte wie Daedalus (12 % c) oder
// Starshot (20 % c) halten deshalb nicht als Vergleich her.
export const SPRUNGROUTEN = {
  anteilLicht: 0.05,
};

// Echtzeitsekunden, die eine Galaxie-Einheit im Unterlichtflug kostet.
// Gerechnet statt gesetzt: ändert sich der Zeitmaßstab oder die Eichung,
// zieht diese Zahl mit.
export function unterlichtSekundenProEinheit() {
  const jahreProEinheit = LJ_PRO_EINHEIT / SPRUNGROUTEN.anteilLicht;
  return (jahreProEinheit * ZEIT.tageProJahr) / ZEIT.spieltageProSekunde;
}

// --- Supernova: die Bedrohung der Demo ------------------------------------
// Vollständige Herleitung in DEMO.md und LORE-PHYSIK.md Abschnitt 0a. Kurz:
//
// Ein massereicher Stern in der Nachbarschaft stirbt. Man SIEHT es kommen,
// weil die Brennstufen eines Sternkerns bekannte Dauern haben und ein
// hinreichend großes Neutrino-Observatorium sie ablesen kann -- das Ende des
// Kohlenstoffbrennens gibt ein Fenster von einigen hundert Jahren.
//
// Danach zwei Wirkungen mit sehr verschiedenen Zeitskalen:
//   DER BLITZ   trifft mit dem Licht. Er tötet nicht direkt (Wohnmodule sind
//               versiegelt), aber er zerlegt die Ozonschicht -- und damit die
//               Landwirtschaft, das Einzige auf der Oberfläche, das Licht
//               braucht.
//   DIE FLUT    ist die diffundierende kosmische Teilchenflut. Sie kommt
//               Jahrhunderte später, bleibt Jahrtausende, und sie ist der
//               eigentliche Weltenkiller. Weil sie GELADEN ist, lenkt ein
//               Magnetfeld sie ab -- daher der Schirm.
export const SUPERNOVA = {
  // Entfernung des Sterns. 29 Lj ist die Kante der Gefahrenzone (biologisch
  // kritisch ab etwa 25-30 Lj): nah genug, dass alle erreichbaren Systeme
  // betroffen sind, weit genug, dass der Blitz mild bleibt.
  entfernungLj: 29,
  // Vorwarnung aus der Neutrinomessung bis zum Kollaps.
  jahreBisKollaps: 240,
  // Diffusionskoeffizient für geladene Teilchen im interstellaren Medium,
  // cm²/s. Real zwischen 1e28 und 1e29 -- wir nehmen das obere Ende, und
  // GENAU DARAUS folgt die Ankunftszeit der Flut. Sie wird gerechnet, nicht
  // gesetzt: wer die Entfernung ändert, ändert die Frist automatisch mit.
  diffusion: 1e29,
  // Wie lange die Ozonschicht braucht, bis sie sich vom Blitz erholt hat.
  // Modellrechnungen für eine nahe Supernova geben rund fünf bis zehn Jahre
  // bis zur weitgehenden Erholung.
  //
  // WARUM EIN SCHALTER UND KEINE STETIGE ERHOLUNG: die Zeitsimulation setzt
  // voraus, dass zwischen zwei Ereignissen jede Rate KONSTANT ist -- nur
  // deshalb gilt "Rate × Zeitspanne". Eine langsam zurückkehrende Ernte wäre
  // genau die stetig wandernde Rate, die das Modell zerlegt. Also: aus, und
  // zum Erholungszeitpunkt wieder an. Ein Ereignis, zwei Abschnitte.
  ozonErholungJahre: 10,
};

const CM_PRO_LJ = 9.4607e17;
const SEKUNDEN_PRO_JAHR = 3.15576e7;

// Wie viele Jahre die Teilchenflut braucht: t ≈ L²/D.
export function supernovaFlutJahre() {
  const l = SUPERNOVA.entfernungLj * CM_PRO_LJ;
  return (l * l) / SUPERNOVA.diffusion / SEKUNDEN_PRO_JAHR;
}

// Spieljahre -> Millisekunden Echtzeit, über den Zeitmaßstab.
export function jahreInMs(jahre) {
  return (jahre * ZEIT.tageProJahr * 1000) / ZEIT.spieltageProSekunde;
}

// Echtzeitsekunden -> Spieltage.
export function spieltage(sekunden) {
  return sekunden * ZEIT.spieltageProSekunde;
}

// Echtzeitsekunden -> Spieljahre.
export function spieljahre(sekunden) {
  return spieltage(sekunden) / ZEIT.tageProJahr;
}

// Die Raten in diesen Tabellen stehen PRO ECHTZEITSTUNDE. Für die Anzeige
// werden sie auf Spieljahre umgerechnet -- eine Echtzeitstunde sind rund
// 9,9 Spieljahre, eine Rate von 7.500/h also 761 im Jahr.
export function rateProJahr(proStunde) {
  return proStunde / spieljahre(3600);
}

// --- Ressourcen -----------------------------------------------------------
// art "lager": wird angesammelt, teilt sich EINE gemeinsame Lagerkapazität
//              pro Planet (siehe state.js lagerBelegung/lagerFrei). Jede
//              Ressource "wiegt" beim Einlagern unterschiedlich viel --
//              lagerverbrauch = Volumen in KUBIKMETERN, das EINE Einheit
//              dieser Ressource im Lager belegt. Faktisch die Dichte bzw.
//              der Aufwand fürs Verstauen: Metall 1 m³/t, Iridium 4 m³/t
//              (dichter, aber aufwendiger zu sichern), Antimaterie 25 m³/kg
//              (das Containment braucht den Platz, nicht der Stoff).
//              0 heißt: braucht keinen Platz (z.B. Credits -- Geld liegt
//              nicht im Regal). Die Lagerkapazität wird ebenfalls in m³
//              gemessen.
// art "fluss": wird nicht gespeichert, nur Erzeugung gegen Verbrauch
//              (wie Strom). Reicht sie nicht, drosselt sie die Produktion.
// gebaeude: welche Anlage diese Ressource fördert. Nur für die Anzeige --
// die Ressourcenleiste zeigt neben Bestand und Rate auch die Stufe der
// zugehörigen Produktionsstätte. Ohne Eintrag (z.B. Credits) entfällt sie.
// einheit: physikalische Einheit für die Anzeige. Massengüter in Tonnen,
// Antimaterie in Kilogramm (die Mengen sind winzig und der Lagerverbrauch
// entsprechend hoch), Energie in Megawatt -- sie ist eine LEISTUNG, kein
// Vorrat, deshalb MW und nicht MWh. Credits sind keine physikalische Größe.
// farbe: Farbe dieser Ressource. Wird an ZWEI Stellen benutzt und muss
// deshalb dieselbe sein: als Markierung an der Ressourcenkachel und als
// Segment im Lagerbalken. Nur dadurch ist der Balken ohne eigene Legende
// lesbar -- die Kacheln SIND die Legende.
// symbol: Emoji für die Ressourcenleiste, reine Kosmetik, hier in einer
// Zeile austauschbar (gleiche Idee wie die Objektsymbole in ui.js).
export const RESSOURCEN = {
  metall: { id: "metall", name: "Metall", symbol: "🔩", farbe: "#8fa3bf", einheit: "t", art: "lager", start: 500, lagerverbrauch: 1, gebaeude: "metallmine" },
  silizium: { id: "silizium", name: "Silizium", symbol: "💠", farbe: "#7dd3fc", einheit: "t", art: "lager", start: 300, lagerverbrauch: 1, gebaeude: "siliziummine" },
  // Treibstoff. Name ist reine Kosmetik und hier in einer Zeile änderbar.
  // DIE ID HEISST WEITER `tritium`, DER NAME NICHT MEHR -- und das ist Absicht.
  //
  // Lore-Korrektur, beschlossen seit v0.30 (LORE-PHYSIK.md Abschnitt 1):
  // Tritium hat eine Halbwertszeit von 12,3 Jahren und kommt natürlich
  // praktisch nicht vor -- es ist nichts, was man fördert. Der förderbare
  // schwere Wasserstoff ist DEUTERIUM: stabil, und überall dort, wo Wasser
  // ist. Der Extraktor war deshalb das einzige Gebäude, dessen Lore-Text nie
  // geschrieben wurde; jetzt trägt er sie.
  //
  // Umbenannt wurde NUR, was der Spieler sieht. Die ID `tritium` steckt in
  // jedem Spielstand -- sie zu ändern bricht laufende Partien und ist damit
  // Save-Kategorie 3. Der Umzug kommt im Sammel-Sprung, nicht einzeln (A-007).
  tritium: { id: "tritium", name: "Deuterium", symbol: "⚛️", farbe: "#6ee7a8", einheit: "t", art: "lager", start: 600, lagerverbrauch: 1.5, gebaeude: "tritiumextraktor" },
  // Mittelseltenes Strategiematerial -- eigene Kategorie (siehe iridiummine),
  // damit Fördertechnik es NICHT automatisch mitboostet. Erzwingt echte
  // Spezialisierung statt "eine Forschung boostet alles". Dichtes Material,
  // braucht pro Einheit mehr Lagerplatz.
  iridium: { id: "iridium", name: "Iridium", symbol: "💎", farbe: "#b39ddb", einheit: "t", art: "lager", start: 0, lagerverbrauch: 4, gebaeude: "iridiummine" },
  // Brennstoff der Kernkraftanlage (A-148, zweiter Schritt der Energiekette).
  // Anders als Iridium (siderophil, ins Zentrum gesunken) ist Uran
  // lithophil -- es reichert sich MIT der Differenzierung der Kruste an
  // (Granite, Pegmatite), nicht dagegen. Deshalb steigt seine Affinität mit
  // derselben Reihenfolge wie Metall/Silizium (siehe PLANETEN_KLASSEN),
  // nicht umgekehrt wie bei Iridium. Symbol bewusst nicht ☢️ (das trägt
  // fusionstechnik) -- Yellowcake (U₃O₈, die geförderte Handelsform) ist
  // namensgebend gelb.
  uran: { id: "uran", name: "Uran", symbol: "🟡", farbe: "#f2c94c", einheit: "t", art: "lager", start: 0, lagerverbrauch: 3, gebaeude: "uranmine" },
  // Veredeltes Gut, zweite Verarbeitungskette (A-009). Entsteht aus Silizium
  // und viel Energie, und zwar MIT VERLUST -- das ist die These des Spiels
  // („jede Umwandlung verliert") zum ersten Mal an einer Kette, die im
  // Frühspiel wirklich jeder anfasst.
  //
  // PHYSIK: ein Halbleiter ist nicht Rohmasse, sondern Reinheit. Aus Rohsilizium
  // wird über den Umweg Trichlorsilan und Zonenschmelzen ein Kristall, in dem
  // auf eine Milliarde Siliziumatome höchstens eines fremd sein darf. Der
  // Aufwand steckt fast vollständig in Energie, und der größte Teil des
  // eingesetzten Materials wird dabei NICHT zu Chip -- er wird zu Abfall,
  // Schnittverlust und Ausschuss. Deshalb kostet die Fertigung viel Silizium
  // und liefert wenig Elektronik.
  //
  // `lagerverbrauch: 2` -- veredelte Ware ist kompakt, aber nicht frei:
  // Baugruppen sind empfindlich und brauchen Verpackung statt Schüttgutraum.
  elektronik: { id: "elektronik", name: "Elektronik", symbol: "🔌", farbe: "#e07a5f", einheit: "t", art: "lager", start: 0, lagerverbrauch: 2, gebaeude: "fertigung" },
  // Seltenes Endgame-Material. Braucht Iridium als Baukosten für die
  // Gewinnungsanlage -- die erste echte Ressourcenkette im Spiel. Extremer
  // Lagerverbrauch pro Einheit (Containment) -- das hält die Mengen klein,
  // ohne dass die Produktionsrate winzig sein muss.
  antimaterie: { id: "antimaterie", name: "Antimaterie", symbol: "🌀", farbe: "#f472b6", einheit: "kg", art: "lager", start: 0, lagerverbrauch: 25, gebaeude: "antimateriekollektor" },
  // Entstehen NUR durch Verkauf am Handelsposten (siehe MARKT_PREISE) --
  // bewusst kein zweiter Quellenweg, sonst wird Handel zum neuen Grind-Loop.
  // lagerverbrauch 0: Geld braucht kein physisches Lager.
  credits: { id: "credits", name: "Credits", symbol: "🪙", farbe: "#e0c069", einheit: "cr", art: "lager", start: 0, lagerverbrauch: 0 },
  // Versorgungsgut der Bevölkerung. Erste Ressource, die ausschließlich
  // verbraucht statt verbaut wird -- ihre Senke sind die Menschen, sie kann
  // also nicht zu totem Gewicht werden.
  // `verderb` (A-010): Anteil des Bestands, der JE STUNDE Spielzeit verdirbt.
  // Eine Stunde am Bildschirm sind rund zehn Spieljahre -- 0,2 heißt also
  // etwa zwei Prozent Verlust je Spieljahr, und über die zehn Jahre bleibt
  // gut vier Fünftel liegen.
  //
  // WARUM DAS EIN FELD IST UND KEIN SONDERFALL: Verderblichkeit ist eine
  // Eigenschaft von Ware, keine Eigenschaft von Nahrung. Heute trägt sie nur
  // die Nahrung; ein späteres verderbliches Gut braucht dann keine zweite
  // Mechanik, sondern eine Zahl (Prinzip 5).
  //
  // PHYSIK: nichts hält ewig, auch nicht versiegelt. Fett oxidiert, Stärke
  // kristallisiert, Vitamine zerfallen, und was ein Silo an Sporen enthält,
  // arbeitet weiter. Ein exponentieller Zerfall ist dafür die ehrliche Form:
  // es verdirbt ein ANTEIL des Vorrats, nicht eine feste Menge -- ein großes
  // Lager verliert absolut mehr als ein kleines und erreicht dabei nie null.
  nahrung: { id: "nahrung", name: "Nahrung", symbol: "🌾", farbe: "#9ccc65", einheit: "t", art: "lager", start: 2000, lagerverbrauch: 1, gebaeude: "farm", verderb: 0.2 },
  // Bevölkerung ist ein Bestand wie jede Lagerressource -- dadurch lässt sie
  // sich mit Flotten transportieren (Siedler), ohne dass es dafür einen
  // Sonderweg braucht. ZWEI Abweichungen, beide bewusst:
  //   lagerverbrauch 0 -- Menschen belegen keinen Warenlagerplatz,
  //   speicher        -- ihre Obergrenze kommt aus einem EIGENEN Gebäude.
  // Der speicher-Begriff ist absichtlich allgemein gehalten: die später
  // geplanten Energiebatterien sind derselbe Fall (eigenes Gebäude, eigene
  // Kapazität, kein Anteil am gemeinsamen Lagerpool).
  // Nicht handelbar, ganz ohne Sonderregel: der Markt kennt nur Ressourcen
  // mit einem Eintrag in MARKT_PREISE.
  bevoelkerung: {
    id: "bevoelkerung", name: "Bevölkerung", symbol: "👥", farbe: "#f0b429", einheit: "",
    art: "lager", start: 1000, lagerverbrauch: 0, gebaeude: "wohnmodul",
    speicher: { gebaeude: "wohnmodul", basis: 1000, faktor: 1.6 },
  },
  // Arbeitskraft ist ein Fluss wie Energie: nicht lagerbar, Mangel drosselt
  // anteilig. Sie entsteht NICHT aus einem Gebäude, sondern aus der
  // Bevölkerung -- die einzige Stelle, an der die Bilanz einen expliziten
  // Haken braucht (siehe bevoelkerungsAnteile in state.js).
  arbeitskraft: { id: "arbeitskraft", name: "Arbeitskraft", symbol: "🧑‍🏭", farbe: "#90a4ae", einheit: "AK", art: "fluss" },
  // Energie ist eine LEISTUNG (MW), kein Vorrat -- deshalb "fluss". Seit v0.28
  // kann sie trotzdem einen BESTAND haben: der Energiespeicher hält Arbeit
  // (MWh), die Erzeugung bleibt Leistung (MW). Genau deshalb trägt der
  // speicher-Eintrag eine EIGENE Einheit; ohne sie stünde am Speicherstand
  // "MW" und wäre physikalisch falsch.
  //
  // `abLevel: 1` heißt: ohne gebauten Speicher gibt es keine Kapazität. Beim
  // Wohnmodul ist das anders (Stufe 0 trägt die Startbevölkerung) -- deshalb
  // steht es hier ausdrücklich und ist nicht die Vorgabe.
  energie: {
    id: "energie", name: "Energie", symbol: "⚡", farbe: "#e0a94f", einheit: "MW",
    art: "fluss", gebaeude: "kraftwerk",
    speicher: { gebaeude: "energiespeicher", basis: 200, faktor: 1.6, abLevel: 1, einheit: "MWh" },
  },
  // Forschung ist ein Fluss wie Arbeitskraft -- mit einem Unterschied: sie ist
  // der einzige, der seinen Planeten VERLÄSST. Ein Labor erzeugt sie aus
  // Energie, Menschen und Laborbedarf, und sie fließt sofort in das laufende
  // Projekt des Imperiums. Kein Speicher: ein Labor ohne Auftrag forscht ins
  // Leere, und gehortete Erkenntnis ohne Fragestellung gibt es nicht.
  //
  // WARUM DAS PRINZIP 4 NICHT VERLETZT (nichts teleportiert): was hier
  // imperiumsweit ankommt, ist Wissen, und Wissen ist nichts Physisches --
  // es ist das einzige im Spiel, das sich verlustfrei kopieren lässt.
  // Teleportiert hat bis v0.5 die BEZAHLUNG: ein Planet legte 3.000 Metall
  // hin, und ein Labor zwölf Lichtjahre weiter wurde davon schneller. Genau
  // das ist weg -- jedes Labor verbraucht, was auf SEINEM Planeten liegt.
  //
  // ausAnlagen: dieser Fluss KOMMT aus Anlagen und wird deshalb gedrosselt
  // wie deren Lager-Produktion. Energie und Arbeitskraft sind das Gegenteil:
  // sie sind die Eingänge, aus denen der Drosselfaktor überhaupt erst
  // entsteht, und müssen roh bleiben -- sonst rechnet sich das im Kreis.
  forschung: {
    id: "forschung", name: "Forschung", symbol: "🔬", farbe: "#4dd0e1", einheit: "FE",
    art: "fluss", ausAnlagen: true, gebaeude: "forschungslabor",
  },
};

// Bevölkerung: Wachstum als EREIGNIS in festen Zeitabständen, aber
// PROPORTIONAL zum Bestand (A-117) -- keine feste Menge je Schritt mehr.
//
// Der Grund für die festen Abstände bleibt die Zeitsimulation: zwischen zwei
// Ereignissen MUSS jede Rate konstant sein. Eine stetig wachsende Bevölkerung
// würde ihren eigenen Nahrungsverbrauch laufend verändern -- der Bestand wäre
// nicht mehr linear und "Rate × Zeitspanne" wäre falsch. Als Ereignis in
// festen Abständen bleibt zwischen den Schritten alles konstant, und es nutzt
// dieselbe Ereignismaschinerie wie Bauschleifen und Kampfrunden.
//
// `basisRateJahr`/`vorratsBonusMaxJahr` sind JAHRESRATEN, keine Schrittraten
// -- `bevoelkerungsSchrittFaktor` unten rechnet daraus über den Zeitmaßstab
// (ZEIT, siehe oben) den realen Schrittfaktor. 3,0 % ist der bestehende
// Zeitmaßstab-Anker (siehe ZEIT-Kommentar, historisch belegt: koloniale
// Siedlergesellschaften wie Britisch-Nordamerika im 18. Jhd.). 4,1 % ist die
// höchste je dokumentierte natürliche Wachstumsrate einer menschlichen
// Population (Hutterer, Verdopplung in 17 Jahren) -- der volle Bonus (+1,0 %)
// bleibt knapp darunter: der Bonus ist von der Biologie gedeckelt, nicht von
// einer Designzahl.
//
// Symmetrisch nach Tobis Entscheidung (2026-08-14): zu wenig Nahrung lässt die
// Bevölkerung genauso schnell schrumpfen, wie sie wächst (mit `basisRateJahr`,
// ohne Vorratsbonus) -- das ist, wie der Kampf, eine bewusste Ausnahme von
// "verhindern statt bestrafen".
export const BEVOELKERUNG = {
  schrittMs: 5 * 60 * 1000,
  basisRateJahr: 0.03,
  vorratsBonusMaxJahr: 0.01,
  // Reichweite des Nahrungslagers in ECHTZEIT-Stunden (Bestand ÷ Verbrauch/h)
  // -- bewusst Echtzeit, nicht Spieljahre: in Spieljahren wäre jedes
  // halbwegs volle Lager eine Reserve von Jahrhunderten (A-117).
  vorratsReichweiteMinStunden: 4,
  vorratsReichweiteVollStunden: 24,
  nahrungProKopf: 0.05, // pro Stunde
  arbeitskraftProKopf: 1,
};

// Jahresrate -> realer Schrittfaktor, über den Zeitmaßstab gerechnet statt
// gesetzt (A-117): f = (1+r)^(schrittMs / jahrMs) - 1. So ergibt dieselbe
// Jahresrate bei jeder `schrittMs`-Länge und jedem Zeitmaßstab dasselbe reale
// Wachstum -- ändert sich einer von beiden, zieht f automatisch mit.
export function bevoelkerungsSchrittFaktor(rJahr) {
  return Math.pow(1 + rJahr, BEVOELKERUNG.schrittMs / jahreInMs(1)) - 1;
}

// --- Arbeitskraft-Leerlauf (A-155) ------------------------------------------
// Tobis Zeile vom 16.08.: "Nicht genutzte Arbeitskraft abstufend starten ab
// 80% Arbeitenden klaut Ressourcen und verstärkt Piraten in der nähe." Und
// seine Zahlen vom 25.08. auf die Nachfrage nach den Schwellen: "sagen wir
// erstmal unter 50% Arbeitenden wird schon sehr ungemütlich und ab 30%
// sollte es ein Problem sein das man angehen MUSS."
//
// Physikalisch: Menschen ohne Arbeit sind kein Nullposten -- sie essen
// weiter (die Nahrungsrechnung kennt sie schon über BEVOELKERUNG) und sie
// organisieren sich. Der Diebstahl ist die sichtbare Hälfte, die
// Piratenverstärkung die, die später zurückkommt -- und es ist DERSELBE
// Vorgang: was hier verschwindet, kommt (sofern eine Bande in der Nähe ist)
// dort an. Damit hat Bevölkerung zum ersten Mal einen PREIS, nicht nur einen
// Nutzen (das Regelwerk verlangt genau diese Entschärfung für "was nur
// positiv wäre").
//
// Beschäftigungsquote = gebundene / verfügbare Arbeitskraft (dieselben zwei
// Zahlen, die die Arbeitskraft-Kachel heute schon als "frei X von Y" zeigt --
// state.js, planetUebersicht). Der gestohlene Anteil verläuft STETIG
// zwischen den vier Marken (siehe arbeitskraftDiebstahlAnteil in state.js),
// nicht sprunghaft -- Tobis zwei Sätze nennen nur die Bänder, die Höhe der
// drei Zwischenwerte ist eine Umsetzungs-Entscheidung: spürbar bei
// "ungemütlich", deutlich schmerzhaft bei "muss angegangen werden", aber
// nie ein Totalausfall -- sonst wäre der vorgesehene Ausweg (P18: Anlagen
// ausbauen, mehr Arbeitskraft binden) witzlos, weil nichts mehr da wäre, das
// den Ausbau lohnt.
export const ARBEITSKRAFT_LEERLAUF = {
  // Ab hier (>=) nichts -- der Normalfall bleibt folgenlos.
  vollAb: 0.8,
  // 80% -> 50%: "sanft ansteigend, spürbar aber tragbar" (Tobi, sinngemäß).
  ungemuetlichAb: 0.5,
  // 50% -> 30%: "sehr ungemütlich" (Tobis Wortlaut, 25.08.).
  kritischAb: 0.3,
  // Anteil der laufenden Förderung, der bei den drei Marken gestohlen wird,
  // linear zwischen den Punkten (0 bei vollAb).
  diebstahlBeiUngemuetlich: 0.05,
  diebstahlBeiKritisch: 0.12,
  // unter 30%: "ein Problem, das man angehen MUSS" (Tobis Wortlaut, 25.08.) --
  // der Wert bei voller Untätigkeit (Beschäftigung 0).
  diebstahlBeiNull: 0.25,
};

// --- Drosselung auf Zielmenge (A-154) ---------------------------------------
// E1: Erreicht der Bestand einer Ressource die im Lager-Bereich gesetzte
// Zielmenge (Max, A-153), regelt sich die fördernde Anlage so weit herunter,
// dass die Nettorate exakt 0 wird -- sie produziert genau, was abfließt.
//
// Die Grundlast ist der physikalische Kern, nicht eine Bremse: Bewetterung,
// Wasserhaltung und Förderbänder laufen weiter, ob gefördert wird oder
// nicht -- real sind das 30-50 % des Verbrauchs (§0b, A-145: kein Wert ohne
// Begründung). Ein Drittel liegt in dieser Spanne und ist zugleich die
// einfachste Zahl darin.
//
// Gilt NUR für Energie/Arbeitskraft (die laufenden Betriebskosten) -- die
// PRODUKTION selbst darf bis auf 0 fallen (kein Abstrom, kein Grund zu
// fördern), sonst würde eine Anlage ohne jeden Abnehmer den Bestand ewig
// über die Zielmenge hinaustreiben und Kriterium 1 (Bestand pendelt sich
// EIN) wäre verletzt.
export const DROSSELUNG = {
  grundlastAnteil: 1 / 3,
};

// Verdeckte Platzhalter am Ende der Ressourcenleiste. Man soll sehen, dass
// das Spiel noch mehr zu bieten hat, ohne zu erfahren WAS -- deshalb eine
// feste kleine Zahl statt der echten Restmenge (die wäre selbst schon eine
// Information) und ein neutrales Symbol ohne Hinweis auf den Inhalt.
//
// AUF 0 seit v0.41 (Tobi, 2026-08-16): in der zweireihigen Leiste lasen sie
// sich als angeteaserte LAGER in der falschen Zeile statt als künftige
// Ressourcen -- der Hinweis auf Tiefe wurde zur Verwirrung über die Einteilung.
// Der Mechanismus bleibt stehen: eine Zahl über 0 bringt sie zurück, sobald
// es einen guten Platz für sie gibt.
export const UNBEKANNTE_RESSOURCEN = { slots: 0, symbol: "⬛" };

// Was von einem verbrauchten oder zerstörten Schiff übrigbleibt: Anteil der
// Baukosten, der am Ort liegenbleibt und geborgen werden kann.
//
// Dahinter steht Tobis Grundregel (2026-08-14): nichts verschwindet einfach
// so. Ein "vernichtet"-Zustand ist ausdrücklich erlaubt und soll es geben --
// aber er muss ursächlich erreicht werden, und Überreste werden modelliert,
// solange sie eine Verwendung haben. Gibt es keine Verwendung, dürfen sie
// aus der Welt verschwinden, statt ewig mitgeführt zu werden.
// Ab welcher Versorgung ein Magnetfeldgenerator die Teilchenflut wirklich
// abhaelt (A-025). Voll versorgt heisst voll versorgt: ein Feld mit 80 %
// Leistung lenkt nicht 80 % der Teilchen ab, es reisst an der falschen Stelle
// auf.
//
// Die Zahl steht HIER und nicht in der Abrechnung, seit ein Test sie braucht:
// eine Schwelle an zwei Orten ist eine Schwelle zu viel -- genau der Fehler,
// der bei der Piraten-Neugruendung (v0.42) Zeit gekostet hat.
export const SCHIRM_MINDESTVERSORGUNG = 0.999;

// Namen für Piratengruppen (A-031).
//
// ANLASS: die Gruppen hießen nach dem Orbitobjekt ihrer Entstehung. Im
// Meldungslog las sich ein Angriff dann als „Instabile Strahlungszone nimmt
// Kurs auf …" -- ein Naturereignis, das Flotten überfällt. Seit A-002 die
// fremden Basen sichtbar macht, stand das dauernd auf dem Bildschirm.
//
// Der Ton ist Absicht: rau, kurz, ohne Witzelei. Diese Gruppen sind die
// Gegenspieler, nicht die Comic-Einlage -- sie leben von dem, was sie anderen
// abnehmen, und ihr Name soll das tragen.
//
// Gezogen wird DETERMINISTISCH aus dem Weltseed (Regel seit v0.39: nie
// Math.random für Weltinhalt). Gleiche Saat, gleiche Namen.
export const PIRATEN_NAMEN = [
  "Rostwölfe",
  "Leere Hand",
  "Schwarze Bake",
  "Aschefahrer",
  "Kalte Ernte",
  "Splitterflotte",
  "Trockendock",
  "Letzte Bahn",
  "Narbenzug",
  "Schlackebrüder",
  "Stille Fracht",
  "Eisenmeute",
];

export const SCHROTT_ANTEIL = 0.3;

// Ab welcher Menge sich ein Ueberrest ueberhaupt lohnt (A-022).
//
// Die Fortsetzung derselben Regel eine Zeile hoeher: Ueberreste werden
// modelliert, SOLANGE SIE EINE VERWENDUNG HABEN. Drei Tonnen Deuterium an
// einem Orbit haben keine -- niemand schickt einen Frachter dafuer los. Was
// sie haetten, waere eine Nebenwirkung: jede verbrauchte Sonde liesse ein
// Haeufchen zurueck, und nach ein paar Stunden ist die Galaxie mit
// Kleinstmengen zugepflastert, durch die man sich beim Bergen wuehlen muss.
//
// Die Grenze ist eine MENGE und traegt deshalb den Massstab (unten in der
// Skalierungsschleife). Roh 10 heisst: unter 500 Einheiten faellt der Rest
// weg -- gemessen an einem Sondentank (400 roh = 20.000) ist das ein
// Vierzigstel und damit sicher unter allem, wofuer jemand fliegen wuerde.
export const REST_BAGATELLE = 10;

// Handelslos: wie viel ein Klick am Markt bewegt. Waechst mit dem Massstab
// mit -- ein fixes 100er-Los waere gegen Millionenbestaende bedeutungslos.
export const MARKT = { los: 100 };

// Startzustand. Bewusst OHNE Startschiffe: die erste Werft und das erste
// eigene Schiff sollen echte Meilensteine bleiben. Was hier steht, ist eine
// Zusicherung, keine Starthilfe -- der Spieler sieht von Anfang an ein
// erreichbares Ziel, muss aber selbst hinarbeiten.
export const START = {
  // Wie viele Planeten im Heimatsystem beim Start schon sichtbar sind.
  // Mindestens einer davon ist garantiert besiedelbar (siehe state.js
  // startsystemAufdecken) -- sonst hinge der Spielstart am Zufall.
  sichtbarePlaneten: 2,
};

// Symbole für Gebäude, Forschungen und Schiffe -- eine Tabelle statt eines
// Feldes je Eintrag, damit alle Symbole beieinanderstehen und sich in einer
// Zeile ändern lassen. Ressourcen tragen ihr Symbol dagegen direkt in
// RESSOURCEN, weil es dort Teil der Ressourcen-Identität ist und in
// Kostenangaben mitwandert.
// Wie teuer die Anreicherung gegen den Reaktor gerechnet wird (A-071).
//
// DAS IST DIE SCHRANKE GEGEN DAS PERPETUUM MOBILE, und sie ist eine Zahl mit
// Beweis dahinter -- hergeleitet im A-063-Ergebnis:
//
// Die Anreicherung spiegelt die BEIDEN Kurven des Kraftwerks. Ihre Ausbeute
// ist dessen Brennstoffkurve, ihr Strombedarf dessen Energiekurve mal
// VERLUST. Daraus folgt: Ein Extraktor der Stufe N liefert genau so viel
// Deuterium, wie ein Kraftwerk der Stufe N verbrennt -- und kostet dabei das
// VERLUST-fache dessen, was dieses Kraftwerk liefert.
//
// Der Kreis Strom -> Deuterium -> Strom kann sich nur schließen, wenn die
// Ausbeute den Reaktor trägt, also bei Extraktorstufe >= Kraftwerksstufe.
// Dort ist der Strombedarf mindestens VERLUST-fach. Der Kreis verliert also
// bei JEDER Stufenkombination, solange VERLUST größer ist als der
// Energie-Forschungsbonus (Energietechnik 8 %/Stufe plus Fusionstechnik
// 10 %/Stufe). 5 deckt einen Bonus bis Faktor 5,0 ab -- das wären etwa
// Energietechnik 25 oder Energietechnik 20 zusammen mit Fusionstechnik 20,
// beides weit jenseits dessen, was die Kostenkurve 1,8^Stufe hergibt.
// tests/anreicherung.test.js tastet den ganzen Bereich ab.
export const ANREICHERUNG_VERLUST = 5;

export const SYMBOLE = {
  // Gebäude
  metallmine: "🔩",
  siliziummine: "💠",
  fossilanlage: "🛢️",
  kraftwerk: "⚡",
  // Dasselbe Symbol wie fusionstechnik (Forschung) -- beide Nuklear-Themen,
  // keine Kollision: verschiedene Kategorien, dasselbe Muster wie
  // forschungslabor/forschungsschiff (beide 🔬).
  kernkraftanlage: "☢️",
  solarfeld: "☀️",
  energiespeicher: "🔋",
  lagerhalle: "📦",
  tritiumextraktor: "⚛️",
  werft: "🏗️",
  iridiummine: "💎",
  uranmine: "🟡",
  antimateriekollektor: "🌀",
  forschungslabor: "🔬",
  handelsposten: "🏪",
  farm: "🌾",
  hydrokultur: "🌱",
  wohnmodul: "🏘️",
  // Forschung
  foerdertechnik: "⛏️",
  energietechnik: "🔌",
  sondentechnik: "📡",
  bergungstechnik: "🪝",
  tiefenbohrung: "🕳️",
  resonanzzerlegung: "🔆",
  frachttechnik: "📦",
  antriebstechnik: "🚀",
  lagerlogistik: "🗄️",
  fusionstechnik: "☢️",
  iridiumverarbeitung: "💎",
  sondenKi: "🤖",
  erkunderKi: "🧠",
  automatisierungstechnik: "⚙️",
  logistiknetzwerk: "🕸️",
  antimaterietechnik: "🌀",
  anreicherungstechnik: "⚗️",
  // Schiffe
  sonde: "📡",
  erkunder: "🛰️",
  forschungsschiff: "🔬",
  frachter: "🚚",
  kolonieschiff: "🏠",
  kriegsschiff: "⚔️",
  // Oberfläche (A-102, Prinzip 9: alle Symbole liegen hier, nicht als
  // Literal im UI-Code) -- vorher sechsmal 🔒 und einmal 🔁 im Quelltext.
  gesperrt: "🔒",
  route: "🔁",
  // A-140: das Zahnrad im Kopf, das das Einstellungsfenster öffnet.
  einstellungen: "⚙️",
};

// Kartensymbole: Systemliste UND Galaxiekarte (js/karte.js) zeichnen
// denselben Typ mit demselben Zeichen -- eine zweite Tabelle wäre eine
// zweite Wahrheit darüber, wie ein Wrack aussieht (Prinzip 5). Bis A-102
// stand das als lokaler Export in js/ui.js; Prinzip 9 verlangt aber, dass
// ALLE Symbole hier liegen.
export const TYP_SYMBOL = {
  heimat: "🏠", planet: "🪐", asteroiden: "🪨", wrack: "🛰️",
  anomalie: "✦", struktur: "◈", gefahr: "☢", leer: "·",
};

export const LAGER_RESSOURCEN = Object.values(RESSOURCEN)
  .filter((r) => r.art === "lager")
  .map((r) => r.id);

export const FLUSS_RESSOURCEN = Object.values(RESSOURCEN)
  .filter((r) => r.art === "fluss")
  .map((r) => r.id);

// --- Gebäude --------------------------------------------------------------
// produktion/verbrauch: { ressourcenId: { basis, faktor } } -> pro Stunde.
// kategorie dient Forschungen als Angriffspunkt für Boni.
// Themengruppen der Gebäudeliste (A-006, Tobis Punkt: „Sortierung der
// Gebäude nach Thema. Abbau / Production / Bevölkerung sowas in der Art").
//
// Ein Neuling sieht sonst vierzehn Kacheln ohne Ordnung und keinen Hinweis,
// womit er anfangen soll -- das ist die halbe Antwort auf den Ersteinstieg.
//
// Die Zugehörigkeit steht als Feld `gruppe` am Gebäude, nicht als
// Verzweigung im Code: dieselbe Projektregel wie bei den Fraktionsarten.
// Die Reihenfolge hier IST die Reihenfolge in der Anzeige.
export const GEBAEUDE_GRUPPEN = [
  { id: "foerderung", name: "Förderung" },
  { id: "energie", name: "Energie" },
  { id: "versorgung", name: "Versorgung" },
  { id: "industrie", name: "Industrie & Wissenschaft" },
];

// --- Fossile Verbrennung (A-147, erster Schritt der Energiekette) ---------
// Umrechnung von erzeugter Energie auf verbrannten Vorrat -- über eine reale
// Referenzgröße statt eine gegriffene Zahl: 1 t SKE (Tonne Steinkohleeinheit,
// die genormte Energiewirtschafts-Einheit) = 29,3076 GJ = 8,141 MWh
// Primärenergie. Ein Dampfkraftwerk (Rankine-Prozess, Carnot-begrenzt wie am
// Kraftwerk-Kommentar erklärt) erreicht rund 35 % Wirkungsgrad. Macht
//   1 MWh_el kostet 1 / (8,141 MWh/t × 0,35) ≈ 0,351 t Kohle.
// Der Faktor bleibt über alle Stufen KONSTANT -- anders als beim Kraftwerk
// oder der Kernkraftanlage gibt es hier keinen Effizienzgewinn mit der
// Stufe: Verbrennung hängt an der Carnot-Grenze, nicht an der Baugröße. Der
// Verbrauch wächst deshalb exakt mit der Produktion (1,15^Stufe), nicht mit
// einer eigenen, flacheren Kurve.
export const FOSSIL = {
  tonnenProMWh: 0.351,
  // Wie viele Spieljahre der Vorrat bei Affinität 1 und Dauerbetrieb auf
  // Stufe 1 trägt -- Tobis Vorgabe (25.08.): "in lass es 100 Jahre sein
  // verbaucht ist".
  vorratJahre: 100,
};

// Vorrat bei Affinität 1 (Tonnen), hergeleitet statt gesetzt -- in der
// "kleinen" Notation der Tabellen oben (roh, VOR der MASSSTAB-Skalierung
// weiter unten in dieser Datei):
//   Verbrauch Stufe 1 = rate({basis:60,faktor:1.15}, 1) × FOSSIL.tonnenProMWh
//                      = 60 × 1 × 1,15¹ × 0,351 MW → 69 MW × 0,351 t/MWh
//                      = 24,219 t je ECHTZEITSTUNDE
//   100 Spieljahre = jahreInMs(100) = 36.525.000 ms ≈ 10,1458 Echtzeitstunden
//                      (1 Sek. Echtzeit = 1 Spieltag, ZEIT.tageProJahr=365,25)
//   Vorrat = 24,219 t/h × 10,1458 h ≈ 245,72 t
// × MASSSTAB, aus demselben Grund wie BASE_STORAGE_CAP weiter unten: die
// Produktion, gegen die hier gerechnet wird, trägt zur Laufzeit denselben
// Faktor (RATEN_FELDER-Skalierung unten), eine Menge muss ihn also auch
// tragen -- sonst verschiebt sich das Pacing bei einer künftigen
// MASSSTAB-Änderung, ohne dass irgendein Test das sehen könnte.
// GEGENPROBE der Planung: bei SUPERNOVA.jahreBisKollaps = 240 ist der Vorrat
// nach 100/240 ≈ 42 % der Partie leer -- Vorlauf genug, dass der
// Technologiewechsel in der ersten Hälfte kommen sieht, wer hinsieht.
export const FOSSIL_VORRAT_BASIS = 245.72 * MASSSTAB;

export const BUILDINGS = {
  metallmine: {
    id: "metallmine",
    gruppe: "foerderung",
    name: "Metallmine",
    beschreibung:
      "Fördert Metall aus der Kruste. Sternnahe Welten sind metallreicher, weil ihnen die leichten Stoffe früh weggekocht wurden – Merkur besteht zu einem auffällig großen Teil aus Eisen.",
    kategorie: "mine",
    baseCost: { metall: 60, silizium: 15 },
    costFactor: 1.4,
    buildTimeDivisor: 2.5,
    produktion: { metall: { basis: 150, faktor: 1.2 } },
    verbrauch: { energie: { basis: 10, faktor: 1.2 }, arbeitskraft: { basis: 15, faktor: 1.15 } },
  },
  siliziummine: {
    id: "siliziummine",
    gruppe: "foerderung",
    name: "Siliziummine",
    beschreibung:
      "Baut Silizium für Bauteile und Elektronik ab. Sauerstoff und Silizium sind die beiden häufigsten Elemente jeder Gesteinskruste – neun Zehntel davon sind Silikate.",
    kategorie: "mine",
    baseCost: { metall: 48, silizium: 24 },
    costFactor: 1.4,
    buildTimeDivisor: 2.5,
    produktion: { silizium: { basis: 100, faktor: 1.2 } },
    verbrauch: { energie: { basis: 12, faktor: 1.2 }, arbeitskraft: { basis: 15, faktor: 1.15 } },
  },
  // Erster Schritt der Energiekette (A-147, KONZEPT-TECHBAUM.md "Die
  // Energiekette": Fossil -> Wind/Solar -> Spaltung -> Fusion -> Zukunft).
  // Tobis Vorschlag zur Bauform, wörtlich (23.08.): "I guess wir können
  // einfach Fossil als Start nehmen die eine begrenzte Ressource verbraucht
  // die dann einfach in lass es 100 Jahre sein verbaucht ist?"
  //
  // `fossil: true` ist das zweite Brennstoff-Tor neben `brennstoff` (A-055):
  // KEINE Lager-Ressource, sondern ein einziges Feld am Planeten
  // (`planet.fossilVorrat`, siehe neuerPlanet in state.js) -- Tobi, 23.08.,
  // zur Frage nach Gas als Lager-Ressource: "Aber in dem Fall erstmal
  // nicht." Der Umrechnungsfaktor und die Vorratsherleitung stehen an
  // FOSSIL/FOSSIL_VORRAT_BASIS oben.
  fossilanlage: {
    id: "fossilanlage",
    gruppe: "energie",
    name: "Fossilanlage",
    beschreibung:
      "Verbrennt fossile Brennstoffe, die frühere Biomasse hinterlassen hat – billig und ab dem ersten Tag verfügbar, aber ein einmaliger Vorrat. Nur Welten, die einmal Leben trugen, haben ihn; eine frische Kolonie findet nichts.",
    kategorie: "energie",
    baseCost: { metall: 30, silizium: 10 },
    costFactor: 1.5,
    buildTimeDivisor: 3.0,
    produktion: { energie: { basis: 60, faktor: 1.15 } },
    verbrauch: { arbeitskraft: { basis: 8, faktor: 1.15 } },
    // Kein `brennstoff`-Eintrag: der Vorrat ist kein RESSOURCEN-Posten, das
    // Tor läuft über `fossil: true` (siehe brennstoffBereit/fossilBereit,
    // js/state.js) statt über def.brennstoff.
    fossil: true,
  },
  // Zweiter Schritt der Energiekette (A-148): die Grundlast. Überall baubar,
  // unabhängig von Sonne und Biomasse -- teuer, und mit einem Brennstoff,
  // den man erst fördern muss. Reale Kernspaltung von 1957 bis heute.
  kernkraftanlage: {
    id: "kernkraftanlage",
    gruppe: "energie",
    name: "Kernkraftanlage",
    beschreibung:
      "Kernspaltung im Druckwasserreaktor: schwere Kerne wie Uran-235 zerfallen unter Neutronenbeschuss und setzen dabei Bindungsenergie frei – ohne Fusions-Zündschwelle, aber mit demselben Dampfkreislauf. Läuft überall, unabhängig von Sonne und Biomasse. Verbrennt Uran aus dem Lager – ohne Brennstoff steht der Reaktor still.",
    kategorie: "energie",
    baseCost: { metall: 120, silizium: 90, iridium: 40 },
    costFactor: 1.5,
    buildTimeDivisor: 1.8,
    produktion: { energie: { basis: 70, faktor: 1.18 } },
    verbrauch: { arbeitskraft: { basis: 20, faktor: 1.15 } },
    // Brennstoff aus dem BESTAND (A-055, Weg B) -- exakt derselbe Weg wie
    // beim Kraftwerk, siehe dessen Kommentar für die Begründung (Kreis-
    // Schutz, Hysterese über planet.brennstoffAus/BRENNSTOFF_ANLAUF_MS --
    // seit dieser Anlage EIN Bit je Gebäude, nicht mehr eines je Planet,
    // siehe reaktorBitNachziehen in js/state.js).
    //
    // Brennstoff-Faktor 1,12 gegen Energie-Faktor 1,18 -- dieselbe Richtung
    // wie beim Kraftwerk (bessere Reaktoren je Stufe: höhere Anreicherung,
    // engere Neutronenökonomie), schwächer ausgeprägt als dort (1,1 gegen
    // 1,2). Kernspaltung hat mehr Stellschrauben für Effizienzgewinne als
    // ein reiner Dampfprozess (Fossilanlage, KONSTANTER Faktor), aber
    // weniger Spielraum als eine sich verbessernde Fusionsgeometrie.
    brennstoff: { uran: { basis: 1, faktor: 1.12 } },
  },
  kraftwerk: {
    id: "kraftwerk",
    gruppe: "energie",
    name: "Kraftwerk",
    beschreibung:
      "Fusionsreaktor. Die Reaktion setzt schnelle Neutronen frei – ungeladen, also nur schwer abzuschirmen und nur als Wärme erntbar. Deshalb steckt in jedem Kraftwerk ein Dampfkreislauf, so altmodisch das klingt. Verbrennt Deuterium aus dem Lager – ohne Brennstoff zündet die Fusion nicht.",
    kategorie: "energie",
    baseCost: { metall: 75, silizium: 30 },
    costFactor: 1.5,
    buildTimeDivisor: 2.5,
    // A-149: dritter und letzter Schritt der Energiekette. Das Tor gilt
    // fürs BAUEN, wie beim Schirm (magnetschild, grep "benoetigt forschung
    // magnetosphaerentechnik") -- kannBauen prüft es bei jedem neuen
    // Bauauftrag, ein bereits gebautes Kraftwerk verliert dadurch nichts
    // (produktionsAufloesung fragt `benoetigt` nie ab, nur der Ausbau-Weg).
    // fusionstechnik existiert bereits (voraussetzungen: energietechnik 3)
    // und gab bisher nur einen Boost -- jetzt zusätzlich das Schalt-Ereignis,
    // das Prinzip 12 verlangt ("Technologien sollen Regeln ändern, nicht nur
    // Zahlen").
    benoetigt: { forschung: "fusionstechnik" },
    produktion: { energie: { basis: 80, faktor: 1.2 } },
    verbrauch: { arbeitskraft: { basis: 10, faktor: 1.15 } },
    // Brennstoff aus dem BESTAND (A-055, Weg B): der Abzug läuft beim
    // Fortschreiben der Planetenuhr, NIE in der Ratenrechnung -- der Bestand
    // ist eine Zahl aus dem letzten Takt, deshalb entsteht kein Fluss-Kreis
    // (die dokumentierte Grenze über flussSpeicherDeckung bleibt unberührt).
    // Binär: Brennstoff da -> volle Leistung, leer -> aus. Kein Drosseln.
    //
    // Der Faktor ist BEWUSST kleiner als der der Energie (1,1 gegen 1,2):
    // höhere Stufen verbrennen je Megawatt weniger -- bessere Reaktoren.
    // GEMESSEN, nicht gewählt: mit 1,2 fraß ein Stufe-15-Kraftwerk 1.387 t je
    // Echtzeitstunde, mehr als jede realistische Förderung -- Bots sparten
    // die Betankung ihres Kolonieschiffs nie zusammen, die Expansion stand
    // galaxieweit.
    //
    // A-145/PRINZIPIEN.md § 0c: die zweite Hälfte dieser Begründung ("Bots
    // sparten... nie zusammen") traegt seit dieser Regel nicht mehr -- das
    // Zurechtkommen der Bots ist kein gueltiger Grund fuer einen Spielwert.
    // Die Messung (1.387 t/h bei Faktor 1,2) bleibt richtig, der Schluss
    // daraus nicht. Faktor 1,1 steht damit auf Wiedervorlage: BEFUND-ENDGAME-
    // PLAYTHROUGH.md 13b misst, dass der Reaktor bei Faktor 1,1 nur 1,9 % der
    // Deuteriumfoerderung frisst und der Bestand allein Stufe 15 rund 4.720
    // Jahre traegt (Demo-Laenge: 478 Jahre) -- das hebt die Grundlage von
    // A-008/A-055 auf ("ohne Brennstoffverbrauch hat Solar keine Nische").
    // Der neue Wert ist eine Design-Entscheidung mit Zahlen und wird nicht
    // hier gefaellt, siehe AUFTRAEGE/SOLL-IST.md.
    brennstoff: { tritium: { basis: 3, faktor: 1.1 } },
  },
  // Die zweite Energiewahl (A-055): billig, brennstofffrei -- und die
  // Teilchenflut zerstört ungeschirmte Felder. Der bequeme Pfad ist der,
  // den die Supernova tötet; das ist der Sinn dieser Wahl, keine Nebenwirkung.
  solarfeld: {
    id: "solarfeld",
    gruppe: "energie",
    name: "Solarfeld",
    beschreibung:
      "Photovoltaik in Feldern. Halbleiter ernten Licht direkt, ohne Brennstoff und ohne Dampfkreislauf – aber ihr Kristallgitter ist empfindlich: schnelle geladene Teilchen schlagen Atome von ihren Plätzen, und genau daraus besteht eine Teilchenflut. Sternnahe Orbits liefern mehr, weil die Bestrahlungsstärke mit dem Abstandsquadrat fällt.",
    kategorie: "energie",
    baseCost: { metall: 45, silizium: 55 },
    costFactor: 1.5,
    buildTimeDivisor: 2.5,
    produktion: { energie: { basis: 45, faktor: 1.2 } },
    verbrauch: { arbeitskraft: { basis: 4, faktor: 1.15 } },
    // Ertrag hängt an der Orbit-Zone des Planeten (SOLAR_ZONEN_FAKTOR).
    sonnenlage: true,
  },
  // Speichert Strom. Die physikalische Wahl dahinter ist ein SUPRALEITENDER
  // MAGNETSPEICHER (SMES): der Strom kreist verlustfrei in einer gekühlten
  // Spule, das Feld IST der Speicher. Real gebaut, im Netz zur Stabilisierung
  // eingesetzt, und für dieses Spiel aus zwei Gründen die richtige Wahl:
  //
  //  - Er verliert nichts von allein. Das passt genau zu Prinzip 13a: Dinge
  //    zerfallen nicht "aus Alter", sondern nur, wenn etwas auf sie einwirkt.
  //  - Er braucht dafür KÜHLUNG, und die kostet dauerhaft Energie. Damit ist
  //    der Unterhalt eine echte Entscheidung statt einer Nebenkosten-Zeile.
  //
  // Die Kapazität steht in MWh (Energie), die Erzeugung in MW (Leistung) --
  // das ist kein Schreibfehler, sondern der Unterschied zwischen Fluss und
  // Bestand. Siehe RESSOURCEN.energie.speicher.
  energiespeicher: {
    id: "energiespeicher",
    gruppe: "energie",
    name: "Energiespeicher",
    beschreibung:
      "Supraleitende Spule, in der Strom verlustfrei kreist. Überschuss wird eingelagert und deckt später Spitzen ab. Die Kühlung braucht selbst etwas Energie.",
    kategorie: "energie",
    baseCost: { metall: 140, silizium: 110 },
    costFactor: 1.5,
    buildTimeDivisor: 2.2,
    produktion: {},
    verbrauch: { energie: { basis: 4, faktor: 1.2 }, arbeitskraft: { basis: 6, faktor: 1.15 } },
  },
  lagerhalle: {
    id: "lagerhalle",
    gruppe: "versorgung",
    name: "Lagerhalle",
    beschreibung: "Erhöht die Lagerkapazität aller lagerbaren Ressourcen.",
    kategorie: "lager",
    baseCost: { metall: 100, silizium: 40 },
    costFactor: 1.55,
    buildTimeDivisor: 2.0,
    produktion: {},
    verbrauch: { arbeitskraft: { basis: 5, faktor: 1.1 } },
  },
  tritiumextraktor: {
    id: "tritiumextraktor",
    gruppe: "foerderung",
    name: "Deuterium-Extraktor",
    beschreibung:
      "Gewinnt Deuterium aus Wasser – der Treibstoff, ohne den keine Flotte fliegt. Schwerer Wasserstoff ist stabil und steckt überall dort, wo Wasser ist: in jedem sechstausendsten Wasserstoffkern, in Eis, in Ozeanen, in feuchtem Gestein.",
    kategorie: "mine",
    baseCost: { metall: 90, silizium: 60 },
    costFactor: 1.45,
    buildTimeDivisor: 2.5,
    produktion: { tritium: { basis: 75, faktor: 1.2 } },
    verbrauch: { energie: { basis: 14, faktor: 1.2 }, arbeitskraft: { basis: 18, faktor: 1.15 } },
    // ZWEITER BETRIEBSMODUS statt eines zweiten Gebäudes (A-071, Prinzip 5):
    // Anreicherung trennt Deuterium aus Wasser, statt es zu fördern -- sie
    // zahlt mit Strom, was die Förderung an Vorkommen zahlt. Vorgabe ist AUS,
    // freigeschaltet durch die Anreicherungstechnik.
    //
    // DIE ZAHLEN SIND KEINE WAHL, sondern eine Bindung: die Ausbeute ist die
    // Brennstoffkurve des Kraftwerks (basis 3, faktor 1,1 -- Wort für Wort
    // dieselbe wie dort), der Strombedarf dessen Energiekurve mal
    // ANREICHERUNG_VERLUST (80 x 5 = 400, faktor 1,2). Warum das die einzige
    // stufenunabhängig sichere Form ist, steht an ANREICHERUNG_VERLUST; ein
    // Test rechnet die Gleichheit beider Kurvenpaare nach, damit die Bindung
    // nicht bei der nächsten Balance-Runde still auseinanderläuft.
    //
    // KEINE Boni auf die Ausbeute -- weder `kategorieBonus` noch
    // `affinitaetFaktor`. Das ist nicht Geschmack: beide würden die Schranke
    // aufweichen, weil die Ausbeute dann schon bei NIEDRIGERER Extraktorstufe
    // einen größeren Reaktor trägt (Herleitung im A-063-Ergebnis). Und es
    // trägt fachlich: Anreicherung hängt an der Trenntechnik, nicht am
    // Reichtum des Bodens.
    anreicherung: {
      forschung: "anreicherungstechnik",
      produktion: { tritium: { basis: 3, faktor: 1.1 } },
      verbrauch: { energie: { basis: 80 * ANREICHERUNG_VERLUST, faktor: 1.2 } },
    },
  },
  werft: {
    id: "werft",
    gruppe: "industrie",
    name: "Werft",
    beschreibung: "Ermöglicht den Schiffbau. Höhere Stufen bauen schneller.",
    kategorie: "werft",
    // Erste Bevölkerungsschwelle: eine Werft braucht Belegschaft, nicht nur
    // Baumaterial. Macht das Wohnmodul sofort bedeutsam und hält den
    // Meilenstein "erstes eigenes Schiff" da, wo er hingehört.
    bevoelkerungAb: 1200,
    baseCost: { metall: 400, silizium: 200, elektronik: 60 },
    costFactor: 1.55,
    buildTimeDivisor: 2.0,
    produktion: {},
    verbrauch: { energie: { basis: 8, faktor: 1.2 }, arbeitskraft: { basis: 30, faktor: 1.15 } },
  },
  iridiummine: {
    id: "iridiummine",
    gruppe: "foerderung",
    name: "Iridiummine",
    beschreibung:
      "Fördert Iridium. In der Kruste ist es fast nicht vorhanden: Iridium bindet an Eisen und ist bei der Entstehung des Planeten mit ihm in den Kern gesunken. In Asteroiden liegt es hundertfach dichter – die Iridiumschicht am Ende der Kreidezeit stammt von einem.",
    kategorie: "iridium",
    baseCost: { metall: 180, silizium: 120 },
    costFactor: 1.5,
    buildTimeDivisor: 2.2,
    produktion: { iridium: { basis: 50, faktor: 1.2 } },
    verbrauch: { energie: { basis: 16, faktor: 1.2 }, arbeitskraft: { basis: 22, faktor: 1.15 } },
  },
  // Uranförderung (A-148, zweiter Schritt der Energiekette). Nach dem Muster
  // der Iridiummine -- eigene Fördermenge, eigene Affinität je Planet
  // (PLANETEN_KLASSEN.geologie.uran), sonst dieselbe Struktur.
  uranmine: {
    id: "uranmine",
    gruppe: "foerderung",
    name: "Uranmine",
    beschreibung:
      "Fördert Uranerz. Anders als Iridium ist Uran ein Kristallisationsprodukt der Kruste selbst – es reichert sich in Graniten und Pegmatiten an, je differenzierter das Gestein.",
    kategorie: "mine",
    baseCost: { metall: 180, silizium: 120 },
    costFactor: 1.5,
    buildTimeDivisor: 2.2,
    produktion: { uran: { basis: 50, faktor: 1.2 } },
    verbrauch: { energie: { basis: 16, faktor: 1.2 }, arbeitskraft: { basis: 22, faktor: 1.15 } },
  },
  antimateriekollektor: {
    id: "antimateriekollektor",
    gruppe: "industrie",
    name: "Antimateriefabrik",
    beschreibung: "Erzeugt Antimaterie aus Energie. Der Wirkungsgrad ist miserabel und bleibt es – Antimaterie ist kein Brennstoff, sondern der dichteste Speicher, den die Physik kennt: 9 × 10¹⁶ Joule je Kilogramm umgesetzter Masse, das Zehnmillionenfache von chemischem Sprengstoff.",
    kategorie: "antimaterie",
    baseCost: { metall: 500, silizium: 400, iridium: 200 },
    costFactor: 1.7,
    buildTimeDivisor: 1.3,
    // Physikalische Korrektur (v0.25): Antimaterie lässt sich NICHT "aus dem
    // Vakuum gewinnen". Vakuumfluktuationen sind virtuelle Teilchen, sie
    // verschwinden wieder. Und Antimaterie herzustellen kostet um viele
    // Größenordnungen MEHR Energie, als sie speichert -- CERN hat über
    // Jahrzehnte Nanogramm produziert.
    //
    // Deshalb ist sie hier ein Energiespeicher, keine Quelle: die Anlage
    // verbraucht gewaltige Leistung und erzeugt daraus wenig Antimaterie.
    // Dass sie mit 9 × 10^16 Joule pro Kilogramm der dichteste bekannte
    // Speicher ist, macht sie trotzdem zum Endgame-Material.
    produktion: { antimaterie: { basis: 15, faktor: 1.2 } },
    // Erste echte Verarbeitungskette im laufenden Betrieb (ab v0.18): Iridium
    // ist nicht mehr nur Baukosten, sondern wird dauerhaft mitverbraucht --
    // Iridiumindustrie ist damit Voraussetzung für Antimaterie, nicht nur
    // Eintrittskarte. Läuft nicht genug Iridium nach, drosselt der Kollektor
    // anteilig (bzw. zieht bis zur eingestellten Reserve aus dem Lager).
    verbrauch: { energie: { basis: 900, faktor: 1.15 }, iridium: { basis: 20, faktor: 1.15 }, arbeitskraft: { basis: 45, faktor: 1.15 } },
  },
  // Die zweite Verarbeitungskette (A-009). Sie steht bewusst FRÜHER als die
  // Werft (Bevölkerungsschwelle 800 gegen 1200): wer die Werft freischaltet,
  // muss die Elektronik für sie schon bauen können, sonst wäre die
  // Freischaltung ein leeres Versprechen.
  //
  // WARUM SIE SICH SELBST ERST AB STUFE 2 KOSTET: eine Fertigung, die
  // Elektronik zum Bauen braucht, wäre auf einer Welt ohne Elektronik nie zu
  // errichten -- eine Sackgasse, aus der kein Weg zurückführt (dieselbe
  // Falle, die bei den Bots schon einmal zugeschlagen hat: ohne Mine kein
  // Metall, ohne Metall keine Mine). Stufe 1 kostet deshalb nur Rohmaterial,
  // jede weitere Stufe zahlt in der eigenen Ware -- siehe `baseCostAbLevel`.
  fertigung: {
    id: "fertigung",
    gruppe: "industrie",
    name: "Fertigung",
    beschreibung:
      "Macht aus Silizium und viel Strom Elektronik. Ein Halbleiter ist nicht Rohmasse, sondern Reinheit: auf eine Milliarde Siliziumatome darf höchstens ein fremdes kommen. Der größte Teil des eingesetzten Materials wird dabei nicht zu Bauteilen, sondern zu Abfall – dieser Verlust ist der Preis der Veredelung.",
    kategorie: "fertigung",
    bevoelkerungAb: 800,
    baseCost: { metall: 180, silizium: 120, elektronik: 40 },
    // Stufe 1 zahlt nur Metall und Silizium. Ohne diese Zeile gäbe es keinen
    // Weg, die erste Fertigung überhaupt zu bauen.
    baseCostAbLevel: { elektronik: 2 },
    costFactor: 1.5,
    buildTimeDivisor: 2.0,
    produktion: { elektronik: { basis: 30, faktor: 1.2 } },
    // 90 t Silizium werden zu 30 t Elektronik: zwei Drittel gehen verloren.
    // Das ist die Zahl, an der „jede Umwandlung verliert" sichtbar wird --
    // und sie ist Balancing, also gemessen und nicht gewählt (siehe Ergebnis
    // zu A-009).
    verbrauch: {
      silizium: { basis: 90, faktor: 1.2 },
      energie: { basis: 40, faktor: 1.2 },
      arbeitskraft: { basis: 20, faktor: 1.15 },
    },
  },
  forschungslabor: {
    id: "forschungslabor",
    gruppe: "industrie",
    name: "Forschungslabor",
    beschreibung:
      "Erzeugt Forschung, solange es Strom, Menschen und Laborbedarf hat. Ohne Labor forscht niemand – Erkenntnis entsteht nicht aus Vorräten, sondern aus laufender Arbeit.",
    kategorie: "labor",
    baseCost: { metall: 150, silizium: 200, elektronik: 45 },
    costFactor: 1.5,
    buildTimeDivisor: 1.8,
    // Stufe 1 erzeugt eine Forschungseinheit je Sekunde (siehe FORSCHUNG).
    // Bewusst faktor 1.0, also linear in der Stufe: bis v0.5 war das
    // Forschungstempo 1 + 0,2 je Laborstufe und damit ebenfalls linear.
    // Ein überlinearer Faktor würde späte Labore explodieren lassen, und
    // seit die Labore mehrerer Welten sich ADDIEREN, gäbe es dafür keinen
    // Ausgleich mehr.
    produktion: { forschung: { basis: 3600, faktor: 1.0 } },
    // FORSCHUNG KOSTET MATERIAL -- AM ORT (A-061, Tobis Entscheidung 18.08.).
    //
    // Hier stand bis v1.36 das Gegenteil, und die Begründung von damals ist
    // der Grund, warum es jetzt geht: „Ein Laborbedarf aus Silizium war der
    // erste Entwurf und ist gescheitert: Verbrauch hängt am Gebäude, nicht am
    // Auftrag, also hätte ein Labor auch OHNE laufendes Projekt dauerhaft
    // Proben verbraucht. Ein leeres Labor, das Material frisst, ist kein
    // Fluss, sondern ein Leck (Prinzip 0)."
    //
    // Genau dieses Leck stopft `nurBeiForschung`: die dort genannten
    // Ressourcen fließen nur, solange wirklich ein Projekt läuft. Ein
    // bereitgehaltenes Labor bindet weiter Strom und Leute -- die sind an das
    // GEBÄUDE gebunden, nicht an den Auftrag, und stehen deshalb bewusst
    // NICHT in der Liste.
    //
    // Silizium ist der Laborbedarf: Proben, Substrate, Optik. Ab Stufe 3
    // kommt Elektronik dazu -- Präzisionsgeräte, und damit die zweite Senke
    // der Fertigungskette, die bisher nur Baukosten war. `verbrauchAbLevel`
    // ist dasselbe Muster wie `baseCostAbLevel` an der Fertigung (A-009) und
    // hat dieselbe Semantik: darunter fällt der Posten gar nicht an.
    //
    // Die A-008-Kreisfalle greift hier NICHT -- Forschung ist ein Fluss, der
    // drosseln darf, und drosselt nichts, wovon sie selbst abhängt.
    verbrauch: {
      energie: { basis: 6, faktor: 1.2 },
      arbeitskraft: { basis: 25, faktor: 1.15 },
      silizium: { basis: 40, faktor: 1.15 },
      elektronik: { basis: 6, faktor: 1.15 },
    },
    verbrauchAbLevel: { elektronik: 3 },
    nurBeiForschung: ["silizium", "elektronik"],
  },
  farm: {
    id: "farm",
    gruppe: "versorgung",
    name: "Agrarkuppel",
    beschreibung:
      "Erzeugt Nahrung. Ohne sie schrumpft die Bevölkerung, sobald der Vorrat aufgebraucht ist. Pflanzen setzen nur etwa ein Prozent des einfallenden Lichts in Biomasse um – Landwirtschaft braucht deshalb vor allem Fläche und Licht, nicht bessere Technik.",
    // Das Einzige auf der Oberfläche, das Licht braucht -- und damit das
    // Einzige, das eine zerstörte Ozonschicht wirklich trifft. Die Menschen
    // sitzen in versiegelten Wohnmodulen, die Ernte nicht.
    brauchtSonnenlicht: true,
    kategorie: "nahrung",
    baseCost: { metall: 80, silizium: 50 },
    costFactor: 1.4,
    buildTimeDivisor: 2.5,
    produktion: { nahrung: { basis: 120, faktor: 1.2 } },
    verbrauch: { energie: { basis: 12, faktor: 1.2 }, arbeitskraft: { basis: 20, faktor: 1.15 } },
  },
  // Der Ausweg mit Preis (A-011): Nahrung aus Strom statt Licht. Nach dem
  // Blitz konkurrieren Essen und Schirm damit um dieselbe Steckdose -- die
  // Stromprioritäten werden zur Krisenentscheidung. Bewusst KEIN
  // brauchtSonnenlicht-Flag: sie fragt den Ozon-Pfad schlicht nicht ab.
  // Gleiche Nahrungsleistung wie die Agrarkuppel (sonst rechnet niemand um),
  // aber gut das Achtfache an Energie -- Photosynthese nutzt ~1 % des
  // Lichts, und Kunstlicht muss die volle Beleuchtung aus der Steckdose
  // zahlen.
  hydrokultur: {
    id: "hydrokultur",
    gruppe: "versorgung",
    name: "Hydrokultur",
    beschreibung:
      "Baut Nahrung unter Kunstlicht in geschlossenen Regalen – unabhängig von Sonne und Ozonschicht. Teuer erkauft: Pflanzen verwerten nur rund ein Prozent des Lichts, und hier kommt jedes Photon aus der Steckdose. Die teure Antwort, wenn draußen nichts mehr wächst.",
    kategorie: "nahrung",
    baseCost: { metall: 120, silizium: 90 },
    costFactor: 1.4,
    buildTimeDivisor: 2.5,
    produktion: { nahrung: { basis: 120, faktor: 1.2 } },
    verbrauch: { energie: { basis: 100, faktor: 1.2 }, arbeitskraft: { basis: 14, faktor: 1.15 } },
  },
  wohnmodul: {
    id: "wohnmodul",
    gruppe: "versorgung",
    name: "Wohnmodul",
    beschreibung:
      "Schafft Platz für mehr Bevölkerung. Ohne freien Wohnraum wächst niemand nach. Ein Mensch atmet rund 0,8 Kilogramm Sauerstoff am Tag – ein geschlossener Kreislauf muss ihn zurückgewinnen, sonst wäre jede Kolonie eine Dauerlieferung.",
    kategorie: "wohnen",
    baseCost: { metall: 120, silizium: 80 },
    costFactor: 1.5,
    buildTimeDivisor: 2.2,
    produktion: {},
    verbrauch: { energie: { basis: 9, faktor: 1.2 } },
  },
  // --- Der Schirm ---------------------------------------------------------
  // JE PLANET, nicht imperiumsweit (Tobis Entscheidung). Damit kehrt sich der
  // Vorteil vieler Welten um: wer breit gesiedelt hat, hat mehr zu retten und
  // muss entscheiden, welche Welt er aufgibt.
  //
  // Der Energiebedarf ist HERGELEITET, nicht gewählt: Der Geodynamo der Erde
  // dissipiert rund 1 TW, um genau das Feld zu halten, das dieser Generator
  // ersetzen soll. Technisch zahlt man anders -- ein supraleitender Magnet
  // hält sein Feld verlustfrei, Strom kostet nur die Kühlung -- aber bei
  // planetarem Maßstab landet die in derselben Größenordnung.
  //
  // 1 TW sind hier 1.000.000 MW: rund ein Kraftwerk auf Stufe 15 und das
  // Zweihundertfache dessen, was eine junge Kolonie sonst zieht. Er dominiert
  // den Energiehaushalt einer Welt vollständig -- und genau deshalb ist die
  // Stromzuteilung aus v0.69 die Mechanik, an der der Schluss hängt.
  //
  // Er produziert NICHTS. Sein einziger Zweck ist, dass die Welt die Flut
  // überlebt (Prinzip 12: eine Technologie, die die Frage ändert, statt eine
  // Zahl zu erhöhen).
  magnetschild: {
    id: "magnetschild",
    gruppe: "energie",
    name: "Magnetfeldgenerator",
    beschreibung:
      "Hält ein künstliches Magnetfeld um diese Welt und lenkt geladene Teilchen ab. Braucht dauerhaft rund ein Terawatt – fällt der Strom, fällt der Schirm. Zum Vergleich: der Geodynamo der Erde setzt für dasselbe etwa dieselbe Leistung um.",
    kategorie: "schutz",
    baseCost: { metall: 8000, silizium: 6000, iridium: 2000, elektronik: 900 },
    costFactor: 1.6,
    buildTimeDivisor: 1.2,
    benoetigt: { forschung: "magnetosphaerentechnik" },
    produktion: {},
    // ACHTUNG, MASSSTAB: die Zahlen hier sind ROH und werden beim Laden mit
    // MASSSTAB (50) multipliziert. 20.000 werden also zu 1.000.000 MW = 1 TW.
    // Beim ersten Versuch stand hier direkt 1000000 -- daraus wurden 50 TW,
    // und kein Kraftwerk der Welt hätte den Schirm je versorgt. NEUNTER Fall
    // dieser Falle im Projekt.
    verbrauch: {
      energie: { basis: 20000, faktor: 1 },
      arbeitskraft: { basis: 40, faktor: 1.15 },
    },
  },

  handelsposten: {
    id: "handelsposten",
    gruppe: "industrie",
    name: "Handelsposten",
    beschreibung:
      "Handelt mit fremden Imperien in Reichweite und zieht Abgaben aus der eigenen Bevölkerung. Gekaufte Ware muss von einer Flotte abgeholt werden. Die Abgaben wachsen mit Bevölkerung und Stufe, die Betriebskosten überlinear mit der Stufe – zu jeder Weltgröße gibt es deshalb eine beste Stufe. Unter rund 36.000 Einwohnern trägt sich schon die erste nicht.",
    kategorie: "handel",
    baseCost: { metall: 250, silizium: 150 },
    costFactor: 1.5,
    buildTimeDivisor: 1.8,
    // Die EINNAHME steht nicht hier, sondern in rohRaten: sie hängt an der
    // Bevölkerung, nicht an der Stufe (siehe GELD). Hier steht nur, was der
    // Betrieb fest kostet -- die Senke des Geldkreislaufs.
    produktion: {},
    verbrauch: {
      energie: { basis: 5, faktor: 1.2 },
      arbeitskraft: { basis: 12, faktor: 1.15 },
      credits: { basis: 30, faktor: 1.2 },
    },
  },
};

// --- Fraktionen -------------------------------------------------------
// Tobis Strukturentscheidung (2026-08-15): **jede Partei, die eigenständig
// handelt, ist eine Fraktion und unterliegt denselben Regeln wie der Spieler,
// mit eigenen Modifikatoren.** Der Spieler ist also kein Sonderfall, sondern
// die Fraktion, bei der alles eingeschaltet ist.
//
// HARTE REGEL, sonst höhlt sich der Begriff sofort aus: **Modifikatoren sind
// DATEN, keine Code-Verzweigungen.** Sobald irgendwo `if (fraktion.art ===
// "pirat")` steht, ist das Parallelsystem durch die Hintertür zurück. Was eine
// Fraktion kann und was nicht, steht ausschließlich hier.
//
// Dass das billig ist, verdankt sich Prinzip 7 (Null-Zustand): ein Planet ohne
// Bevölkerung, ohne Kraftwerk und ohne Forschung rechnet seit v0.19 sauber
// durch. Eine Piratenfraktion ist genau das -- der Spieler mit ausgeschalteten
// Teilsystemen.
//
// `grundhaltung` ist die Meinung über eine Fraktion, mit der es noch keine
// Berührung gab. Damit ist "Piraten sind allen feindlich" ein Datensatz.
export const FRAKTIONS_ARTEN = {
  spieler: {
    id: "spieler",
    name: "Imperium",
    nutzt: { bevoelkerung: true, energie: true, forschung: true, kolonisieren: true, handel: true },
    grenzen: {},
    grundhaltung: 0,
    // Der Spieler klickt selbst -- kein Verhalten aus dem Register.
    verhalten: null,
  },
  pirat: {
    id: "pirat",
    name: "Piraten",
    // Keine Bevölkerung, keine Energiewirtschaft, keine Forschung: eine
    // Piratengruppe hält eine Basis und eine Flotte, mehr nicht.
    // handel: true seit v0.67 -- NICHT weil Piraten Kaufleute wären, sondern
    // weil sie sonst gar nicht an Treibstoff kommen: Tritium steht in keiner
    // Vorkommenstabelle und in keinem Wrack, es entsteht ausschliesslich im
    // Extraktor. Ohne Marktzugang leben sie von dem vollen Tank, den der
    // Weltstart ihnen schenkt -- gemessen: 68 Mio am Tag 0, 1 Mio am Tag 20,
    // monoton fallend. Sie haben Beute im Ueberfluss und keinen Sprit.
    // Der Handel wandelt das eine ins andere, und die Beziehungsschwelle
    // (HANDEL.bereitschaftAb) sorgt dafuer, dass Raeuberei ihn kostet.
    nutzt: { bevoelkerung: false, energie: false, forschung: false, kolonisieren: false, handel: true },
    // Tobis Beispiel für einen Modifikator: über einer Größe muss gesplittert
    // werden, und der Splitter wird eine EIGENE Fraktion. splitterAb greift
    // erst in Etappe 2 -- maxSchiffe deckelt schon jetzt das Wachstum.
    grenzen: { maxSchiffe: 12, splitterAb: 8 },
    grundhaltung: -40,
    verhalten: "raeuber",
  },
  // Eine Bot-Fraktion ist der SPIELER, nur von einer Routine gesteuert statt
  // von Klicks. Alle Teilsysteme an, dieselben Regeln, dieselben Kosten.
  //
  // Sie ist die Antwort auf zwei Dinge zugleich: die Galaxie lebt auch ohne
  // Spieler, und Piraten haben einen Ursprung. Tobis Regel dazu (2026-08-15):
  // **Piraten kommen nicht aus dem leeren Raum, sie müssen vorher einer
  // Fraktion angehört haben.** Ohne Zivilisation gibt es niemanden, von dem
  // Räuber leben könnten -- und niemanden, aus dem sie hervorgehen.
  bot: {
    id: "bot",
    name: "Fremdes Imperium",
    nutzt: { bevoelkerung: true, energie: true, forschung: true, kolonisieren: true, handel: true },
    grenzen: {},
    // Fremde Imperien sind zurückhaltend, nicht feindlich -- der Spieler soll
    // sich seine Feinde verdienen (oder eben nicht).
    grundhaltung: -5,
    verhalten: "aufbau",
  },
};

export const SPIELER_FRAKTION = "spieler";

// Piratengruppen (Etappe 1, v0.34).
//
// Eine Gruppe ist kein Gefahrenobjekt mehr, das zufällig wächst, sondern ein
// AKTEUR MIT BEDARF: sie will größer werden, holt sich dafür Material und
// baut daraus Schiffe. Bleibt der Nachschub aus, schrumpft sie -- bis auf
// null, und dann ist sie weg.
//
// Der Verschwinde-Fall kostet nichts extra: er ist der Null-Zustand (Prinzip
// 7), und weil er eine URSACHE hat (kein Nachschub), braucht er keinen Timer.
//
// Alles hier ist Inhalt, nicht Struktur -- Zahlen zum Drehen.
export const PIRAT = {
  // Wie oft eine Gruppe eine Entscheidung trifft. Bewusst grob: ein Ereignis
  // je Gruppe und Takt, und Piraten sollen nicht hektisch wirken.
  taktMs: 10 * 60 * 1000,
  // Was ein Schiff sie kostet. Absichtlich billiger als beim Spieler -- sie
  // bauen keine Werft, sie flicken zusammen, was sie finden.
  schiffKosten: { metall: 400, silizium: 150 },
  schiffTyp: "kriegsschiff",
  // Eine Gruppe braucht Frachtraum, sonst kann sie ihre Beute nicht mitnehmen.
  // Klingt selbstverständlich, war es beim ersten Wurf nicht: eine Flotte aus
  // reinen Kriegsschiffen flog los, konnte nichts aufnehmen und kam leer
  // zurück -- endlos. Gefunden hat das der Weltlauf (tests/weltlauf.mjs), kein
  // Test: in der Galaxie bewegte sich über dreißig Tage kein Gramm Material.
  frachtTyp: "frachter",
  frachtKosten: { metall: 300, silizium: 200 },
  // So viele Frachter hält eine Gruppe mindestens vor, bevor sie Kriegsschiffe
  // baut. Beute geht vor Bewaffnung -- ohne Nachschub nützt die Bewaffnung nichts.
  frachterMindestens: 2,
  // Vorlauf zwischen "sie nehmen Kurs" und der ersten Kampfrunde. Im All gibt
  // es keine Tarnung -- ein Schiff strahlt seine Abwaerme gegen einen
  // 3-Kelvin-Hintergrund ab. Der Ueberfall ist deshalb keine Falle, sondern
  // eine Entscheidung mit Vorlauf.
  vorwarnungMs: 90 * 1000,
  // Fracht, die eine Bergungsfahrt lohnt. Darunter bleibt die Flotte zu Hause.
  mindestBeute: 200,
  // Ab welchem Tankstand eine Gruppe als in SPRITNOT gilt. Darunter bewertet
  // sie Ziele nach Treibstoff statt nach Fracht (siehe piratenZiel). Anteil,
  // keine Menge -- traegt deshalb KEINEN Massstab.
  spritNotAnteil: 0.25,
  // Ohne Nachschub geht Substanz verloren: so viele Schiffe je Takt. Ursache
  // ist der fehlende Unterhalt, nicht das Alter (Prinzip 13a).
  verfallProTakt: 1,
  // Startausstattung einer frisch erweckten Gruppe: sie übernimmt die Flotte,
  // die im Gefahrenobjekt steht, und bekommt etwas Material dazu.
  startVorrat: { metall: 600, silizium: 200 },

  // Wie weit eine Bande als "in der Nähe" gilt, wenn Arbeitskraft-Leerlauf
  // (A-155) Ressourcen stiehlt: dieselbe Bande bekommt sie als Beute gutge-
  // schrieben, statt dass sie im Nichts verschwindet. Vorerst dieselbe
  // Distanz wie splitterReichweite -- beides beschreibt "wie weit trägt der
  // Einfluss einer Bande", eine eigene Zahl ohne eigenen Anlass wäre Zier.
  diebstahlReichweite: 40,

  // --- Teilung (Etappe 2) ---------------------------------------------
  // Tobis Vorgabe: über einer Größe muss gesplittert werden, **und der
  // Splitter wird eine EIGENE Fraktion.** Die Schwelle steht als Modifikator
  // der Art (`grenzen.splitterAb`), hier steht nur, was beim Teilen passiert.
  //
  // Der Splitter FLIEGT physisch zu seinem neuen Ort -- er erscheint nicht
  // dort (Prinzip 4). Unterwegs ist er eine ganz normale Flotte.
  splitterAnteil: 0.5, // wie viel der Mutterflotte mitgeht
  splitterMitgift: { metall: 2000, silizium: 800 }, // Material für den Anfang
  // Wie weit ein Splitter höchstens zieht. Nah bleiben ist realistisch (er
  // nimmt mit, was er tragen kann) und hält die Ausbreitung nachvollziehbar.
  splitterReichweite: 40,
  // Die Trennung ist NICHT einvernehmlich -- und sie ist EINSEITIG (Tobi,
  // 2026-08-15): "wenn die erst mal die Hälfte der Flotte klauen, findet die
  // andere Seite das nicht so gut."
  //
  // Der Splitter ist gegangen und hat damit kein Problem; die Mutter hat die
  // halbe Flotte verloren und sehr wohl eines. Genau dafür werden Beziehungen
  // GERICHTET gespeichert -- mit einem gemeinsamen Wert je Paar ließe sich das
  // gar nicht ausdrücken.
  splitterHaltungZurMutter: 0,
  mutterHaltungZumSplitter: -50,

  // --- Neugründung (Etappe 4) -----------------------------------------
  // Tobis Regel: **Schiffe können Piraten sich selbst bauen, erwerben oder
  // umbauen -- die BEVÖLKERUNG muss von einer Fraktion kommen.** Piraten sind
  // Menschen, und Menschen kommen von irgendwoher. Der Verlust ist für die
  // Herkunftsfraktion vergleichsweise klein, und die Regel gilt für den
  // Spieler und für Bots gleichermaßen -- deshalb ist sie fair, ohne dass man
  // sie für den Spieler entschärfen müsste.
  gruendung: {
    // Wie oft die Galaxie prüft, ob sich irgendwo eine Gruppe bildet.
    taktMs: 60 * 60 * 1000,
    // Wie viele Menschen sich absetzen. Klein gegen eine gewachsene Kolonie.
    bevoelkerung: 400,
    // Erst ab dieser Bevölkerung ist eine Welt groß genug, dass ein Abgang
    // nicht auffällt -- und dass es überhaupt genug Leute gibt.
    abBevoelkerung: 4000,
    // Sie nehmen mit, was sie tragen können. Kein Diebstahl der halben Flotte:
    // Schiffe bauen sie sich selbst, das hier ist die Starthilfe.
    mitgift: { metall: 1500, silizium: 600 },
    // Obergrenze, damit die Galaxie nicht zuwuchert.
    maxGruppen: 200,
    // Name der neuen Gruppe. Steht hier und nicht im Quelltext, weil er in den
    // Spielstand wandert -- gleiche Regel wie bei Planetennamen: Daten, nicht
    // Anzeigetext, uebersetzt wird an der anzeigenden Stelle.
    name: "Abtrünnige",
  },
};

// Fremde Imperien (Bot-Fraktionen).
//
// Sie tun genau das, was ein Spieler in den ersten Stunden tut: Engpässe
// beheben und ausbauen. Die Routine ist absichtlich schlicht -- sie benutzt
// dieselben Bau-Funktionen wie die Oberfläche, also gelten für sie alle
// Kosten, Voraussetzungen und Drosselungen unverändert.
export const BOT = {
  // Wie viele fremde Imperien eine Galaxie beim Start bevölkern.
  anzahl: 6,
  // Wie oft eine Fraktion eine Bauentscheidung trifft.
  taktMs: 5 * 60 * 1000,
  // Startausstattung der Heimatwelt -- dasselbe Recht wie der Spieler hat.
  startvorrat: true,
  // Reihenfolge, in der Engpässe behoben werden. Die Routine nimmt den ersten
  // Eintrag, dessen Bedingung zutrifft; sonst baut sie das Billigste aus der
  // Ausbauliste. Reine Daten -- wer die KI ändern will, ändert diese Liste.
  //
  // Dieser Satz stimmte lange nicht: die Reihenfolge stand ZUSÄTZLICH in
  // botEngpass einprogrammiert, und die Liste sagte nur noch, welches Gebäude
  // hilft. Zwei Orte für eine Entscheidung -- und der zweite gewann.
  //
  // DAS LAGER STEHT JETZT VORN, und das ist der Kern einer Messung vom
  // 2026-08-16: ein volles Lager wirft ALLES weg, was die Welt fördert. Es
  // stand ganz hinten und wurde deshalb nie gemeldet, solange eine der drei
  // Bedingungen davor zutraf -- und "Bevölkerung auf Anschlag" trifft auf
  // einer wachsenden Welt fast immer zu. Gemessen mit `ENTROPY_SAAT=7`: der
  // Bot stand nach zehn Tagen unverändert bei `metallmine1 siliziummine2
  // kraftwerk1 farm1 wohnmodul1`, mit 735 Metall, während seine Minen
  // ununterbrochen in ein volles Lager förderten. Kein Hunger, kein
  // Strommangel, keine fehlende Arbeitskraft -- nur eine volle Halle.
  //
  // Wohnraum steht bewusst ganz hinten: er ist der einzige Engpass, der
  // nichts vernichtet. Die Welt wächst nur nicht weiter.
  engpaesse: [
    { gebaeude: "lagerhalle", wenn: "lager" },
    // VOR dem Energie-Engpass (A-055): geht der Brennstoff zur Neige, ist
    // ein weiteres Kraftwerk genau die falsche Antwort -- es stünde genauso
    // dunkel da. Erst Nachschub sichern, dann Kapazität.
    { gebaeude: "tritiumextraktor", wenn: "brennstoff" },
    // A-149: kraftwerk -> solarfeld, NICHT fossilanlage. Das Kraftwerk hängt
    // jetzt an fusionstechnik -- ein Bot ohne diese Forschung (praktisch
    // jeder junge Bot) hätte sonst NIE eine Antwort auf einen Energie-
    // Engpass gefunden (kannBauen scheitert, botEngpass meldet denselben
    // Engpass jeden Takt neu, der Bot stünde ohne Strom da -- genau die
    // Frage, die dieser Auftrag selbst aufwirft: "steht dort auch eine
    // Alternative, oder stehen die Bots künftig ohne Strom da?").
    //
    // ERSTER VERSUCH war die Fossilanlage (A-147) -- billigste Energie,
    // sofort baubar. GEMESSEN in tests/bots.test.js hat genau das einen
    // Bot für immer ins Dunkle gesetzt: ihr Vorrat ist ENDLICH (das ist ihr
    // ganzer Sinn), und ein Bot kennt keine Reichweiten-Anzeige, die ihn
    // rechtzeitig umsteuern ließe -- er baut sie einfach weiter aus, bis der
    // Vorrat (bei Stufe 4 nach rund zwölf Spielstunden) auf null fällt, und
    // DANN NIE WIEDER. `engpaesse` feuert bei jedem neuen Engpass erneut auf
    // dasselbe tote Gebäude -- ein Dauerausfall, gemessen mit
    // ENTROPY_SAAT=8: "Energie dauerhaft unterdeckt: 0 % nach 12 h und 0 %
    // nach 24 h". Das Solarfeld hat dieses Problem strukturell nicht: kein
    // Brennstoff, kein Vorrat, der ausgehen könnte -- die einzige Grenze ist
    // die Teilchenflut, Jahrhunderte nach dem Zeithorizont, in dem ein
    // junger Bot überhaupt steht. Ein Bot braucht eine Quelle, die er nicht
    // beaufsichtigen muss; die Fossilanlage verlangt genau das, was seiner
    // Regelmenge fehlt (§ 0b: das Spiel richtet sich nicht nach den Bots,
    // aber ihre Regeln müssen zu dem passen, was sie NICHT können).
    // Engpaesse trägt nur EIN Gebäude je Bedingung (siehe Kommentar oben);
    // ein zweiter Eintrag für kernkraftanlage bleibt aus demselben Grund wie
    // vorher draußen -- eine echte Design-Entscheidung, nicht Teil dieser
    // Runde. kraftwerk selbst bleibt aus der Liste draußen, seine ehemalige
    // Rolle übernimmt das Solarfeld.
    { gebaeude: "solarfeld", wenn: "energie" },
    { gebaeude: "farm", wenn: "nahrung" },
    { gebaeude: "wohnmodul", wenn: "wohnraum" },
  ],

  // Ab wann ein Engpass gemeldet wird -- ANTEILE, keine Mengen, sie tragen
  // deshalb keinen Maßstab.
  //
  // Beide Schwellen greifen VOR dem Anschlag, und das ist der Punkt: ein Bau
  // dauert, und wer erst beim Anschlag anfängt, steht die ganze Bauzeit über
  // im Schaden. Bei `1` verhält sich der Bot exakt wie vorher -- die Zahlen
  // sind also der Regler, an dem man seine Vorausschau einstellt.
  engpassSchwellen: {
    // Unter 10 % freiem Lager wird die nächste Halle fällig.
    lagerFrei: 0.1,
    // Ab 90 % belegtem Wohnraum das nächste Modul.
    wohnraum: 0.9,
    // Unter 24 h Brennstoff-Reichweite wird der Extraktor fällig (A-055) --
    // eine MENGE an Stunden, kein Anteil: die Vorausschau muss die Bauzeit
    // plus den Anlauf der Förderung tragen.
    brennstoffStunden: 24,
  },
  // A-148: uranmine ans Ende gehängt, NICHT eingeschoben -- die Reihenfolge
  // vor ihr bleibt sonst exakt wie vorher (dieselbe Zusicherung wie bei
  // A-134 Punkt 1 fuer forschungslabor). Bots foerdern damit Uran als Teil
  // ihres normalen Ausbaus.
  //
  // A-149: "kraftwerk" an SEINER Stelle (nicht verschoben) durch "solarfeld"
  // ersetzt, NICHT durch "fossilanlage" -- siehe die ausführliche Messung am
  // Kommentar von `engpaesse` oben. Dieselbe Falle träfe hier sogar härter:
  // `ausbau` ist die DAUERHAFTE Rotation, ein Bot würde eine erschöpfte
  // Fossilanlage immer weiter ausbauen (jede Stufe kostet mehr, bringt aber
  // dauerhaft null), statt je zu erkennen, dass der Vorrat für IMMER leer
  // ist. Ein Bot, der "kraftwerk" hier stehen ließe, würde in jedem Takt
  // versuchen, es zu bauen, an der Forschungssperre scheitern (kannBauen)
  // und zum naechsten Listeneintrag weiterziehen -- funktional harmlos, aber
  // ein Bau-Versuch, der nie gelingt, ist trotzdem der falsche Ausbau-
  // Schritt fuer einen Bot ohne Fusionstechnik. kernkraftanlage bleibt aus
  // demselben Grund wie oben draußen: ihre Aufnahme wäre eine Design-
  // Entscheidung (wann lohnt sich die teurere Grundlast?), keine reine
  // Ersetzung.
  ausbau: ["metallmine", "siliziummine", "solarfeld", "farm", "wohnmodul", "handelsposten", "uranmine"],

  // A-137, zweiter Anlauf: steht ein Sparziel (siehe unten, `kolonie`), bleibt
  // dieser ANTEIL des AKTUELLEN Bestands je benötigter Ressource unangetastet
  // -- alles darüber baut der Bot normal aus `ausbau`/`knappste` heraus.
  // Wächst mit dem Bestand mit: erreicht ist das Ziel genau dann, wenn der
  // Bestand doppelt so hoch ist wie die Kosten. Der erste Anlauf (A-135)
  // sperrte statt zu reservieren und ließ den Bot sich selbst den Ast
  // absägen -- siehe A-137 im AUFTRAEGE-Ordner für die Messung dahinter.
  sparzielReserveAnteil: 0.5,

  // Womit eine fremde Heimatwelt in den Handel startet (v0.6). Der Posten
  // steht von Anfang an: ohne ihn gäbe es im ganzen Spiel keinen
  // Handelspartner, bis irgendein Bot von selbst einen baut. Die Kasse ist
  // eine MENGE und wird unten skaliert -- unskaliert könnte ein Imperium
  // gerade 200 Tonnen Metall ankaufen.
  startHandelsposten: 1,
  startKasse: 3000,

  // Handel (v0.61). Beides ANTEILE, keine Mengen -- sie tragen deshalb
  // keinen Maßstab.
  //
  // Ein Bot verkauft erst, wenn sein Lager zu mindestens 70 % voll ist: was
  // noch Platz hat, ist Baumaterial, und Bauen schlägt Geld. Verkauft wird
  // dann ein Viertel des Bestandes der wertvollsten Ware -- genug, damit sich
  // die Kasse bewegt, wenig genug, dass er sich nicht selbst ausräumt.
  verkaufAbFuellstand: 0.3,
  verkaufAnteil: 0.25,

  // Welche Ressourcen der Nachschub sind, und womit man sie fördert. Ohne sie
  // steht jeder Ausbau still, egal wie gut es sonst läuft -- deshalb haben sie
  // Vorrang VOR den Engpässen.
  //
  // Der Grund steht in einer Messung vom 2026-08-16: ein Imperium hatte nach
  // 24 h `kraftwerk1 farm1 wohnmodul1` und keine einzige Mine. Es hatte seinen
  // Startvorrat vollständig in Engpassbehebung gesteckt -- lauter für sich
  // richtige Entscheidungen -- und stand dann mit 2.752 Metall ohne Förderung
  // da. Aus dieser Lage führt kein Weg zurück: ohne Mine kein Metall, ohne
  // Metall keine Mine. Ein Spieler gerät da nie hinein, weil er weiß, dass
  // Einnahmen vor Komfort kommen. Genau das steht jetzt hier.
  nachschub: [
    { resId: "metall", gebaeude: "metallmine" },
    { resId: "silizium", gebaeude: "siliziummine" },
    // Der DEUTERIUM-EXTRAKTOR steht auch nach A-055 NICHT hier, obwohl das
    // Kraftwerk jetzt Brennstoff verbrennt: die Nachschubliste baut, was
    // FEHLT, noch vor der ersten Mine -- der Startvorrat trägt aber tagelang.
    // Brennstoff ist deshalb ein ENGPASS (siehe engpaesse: greift, wenn die
    // Reichweite unter die Schwelle fällt), keine Grundausstattung.
    // ELEKTRONIK STEHT HIER BEWUSST NICHT, obwohl seit A-009 alles
    // Industrielle sie kostet. Sie gehört zur selben Sorte wie das Deuterium:
    // kein Baustoff der Grundversorgung, sondern Voraussetzung fürs
    // Wegkommen -- und die Nachschubliste hat Vorrang VOR den Engpässen.
    //
    // GEMESSEN, weil es beim ersten Versuch genau schiefging: mit einem
    // Eintrag hier baute der Bot als drittes Gebäude eine Fertigung, steckte
    // seinen Startvorrat hinein und stand nach zwanzig Tagen bei
    // `metallmine1 siliziummine1 lagerhalle1 fertigung1 handelsposten1` --
    // ohne Kraftwerk, ohne Farm, ohne Wohnmodul, mit **null Einwohnern**.
    // Die Fertigung lief nie, weil sie Strom und Leute braucht, die es nicht
    // gab. Dieselbe Sackgassen-Falle wie 2026-08-16, nur mit anderem Gebäude.
    //
    // Die Fertigung entsteht deshalb dort, wo sie gebraucht wird: in
    // `botKolonisieren`, vor der Werft, über das `botHatOderBaut`-Muster.
  ],

  // Wann ein Imperium über seine Heimatwelt hinauswächst.
  //
  // Der Auslöser ist BEVÖLKERUNG und nicht "wenn gerade nichts anderes zu tun
  // ist". Der Unterschied ist wichtig: es gibt auf einer Welt immer noch etwas
  // auszubauen, also käme Kolonisieren als letzter Punkt einer Liste nie an die
  // Reihe. Die Bevölkerung ist außerdem der ehrlichste Anzeiger dafür, dass
  // eine Welt trägt -- sie wächst nur, wenn Nahrung, Energie und Wohnraum
  // zusammen stimmen.
  //
  // `abBevoelkerung` ist eine MENGE und wird unten mit MASSSTAB skaliert.
  kolonie: {
    abBevoelkerung: 3000,
    // Obergrenze je Imperium. Ohne sie wüchse ein gut laufender Bot unbegrenzt
    // weiter und würde die Galaxie zupflastern -- dieselbe Überlegung wie bei
    // PIRAT.gruendung.maxGruppen.
    maxPlaneten: 4,
    // Treibstoff, den die Flotte mindestens mitbekommt. Sie tankt aus dem
    // eigenen Lager -- Bots bekommen ausdrücklich KEINEN Freifahrtschein wie
    // die Piraten (deren MAX_SAFE_INTEGER-Tank ist ein Perpetuum mobile und
    // steht auf der Liste der offenen Widersprüche).
    //
    // Der Wert ist bewusst großzügig und trotzdem nur eine UNTERGRENZE: der
    // echte Bedarf hängt an der Strecke, und schon ein Orbitwechsel im eigenen
    // System kostete in der Messung 151.706 (der Sockelverbrauch einer Flotte
    // ist skaliert). Der erste Anlauf gab 20.000 mit, und die Mission wurde
    // schlicht abgelehnt. Deshalb tankt der Bot zusätzlich anteilig vom
    // Vorrat -- siehe botKolonisieren.
    tritium: 4000,
    // Anteil des Heimatvorrats, den eine Kolonisierungsmission höchstens
    // mitnimmt. Sie ist eine große Investition, soll die Welt aber nicht
    // trockenlegen.
    tritiumAnteil: 0.5,
    // A-132: Der Bot lädt sein Kolonieschiff jetzt selbst mit Material, so
    // wie der Spieler es manuell tut (KOLONIE.startvorrat ist entfallen) --
    // sonst gründet er Welten, die nie anlaufen. Menge: dieselbe, die der
    // Startvorrat bisher geschenkt hat, damit sich am Bot-Verhalten nichts
    // ändert außer dem Weg, auf dem das Material ankommt.
    startmaterial: { metall: 300, silizium: 150 },
  },
};

// Beziehungen zwischen Fraktionen (Tobis Modell, 2026-08-15).
//
// Ein Zahlenwert von -100 bis +100 je Paar, 0 ist neutral, GERICHTET: der Wert
// ist die Meinung EINER Fraktion über eine andere. Damit ist der interessante
// Fall möglich -- du überfällst jemand Schwachen, der hasst dich, dich lässt
// es kalt.
//
// Zwei getrennte Effekte, bewusst zwei Knöpfe statt einer Zahl:
//
//   SÄTTIGUNG -- eine Bewegung Richtung Anschlag skaliert mit dem
//   verbleibenden Spielraum: `delta × (1 − |wert|/100)`. Dadurch ist ±100 eine
//   Asymptote, und "der Wert steht nie am Anschlag" ist eine Eigenschaft der
//   Formel statt einer Zahl, die jemand richtig einstellen muss.
//
//   TRÄGHEIT -- eine GEGENLÄUFIGE Handlung wird zusätzlich gedämpft, je weiter
//   der Wert vom Neutralpunkt weg ist. Das ist Tobis "Feindlich Gesinnte nehmen
//   feindliche Handlungen ernster und ignorieren freundliche".
//
// **Die Dämpfung darf NIE null werden.** Wörtlich genommen hieße "ignorieren",
// dass nach einem Angriff der Wert für immer unten bleibt -- es gäbe keinen Weg
// zurück. Mit `traegheitMax: 0.75` bleiben bei -100 noch 25 % Wirkung: teuer,
// aber möglich.
//
// KEIN VERFALL ÜBER ZEIT. Folgt aus Prinzip 0: eine Beziehung ist Information,
// keine Struktur, die einen Fluss braucht. Soll später vergessen werden, ist
// der ehrliche Mechanismus der Generationenwechsel -- die Bevölkerung trägt
// dafür seit v0.19 den Haken.
//
// Gerechnetes Beispiel mit diesen Zahlen: fünf Überfälle bringen eine Fraktion
// auf rund -83, der Weg zurück braucht etwa fünfzig Handelsgeschäfte.
export const BEZIEHUNG = {
  min: -100,
  max: 100,
  traegheitMax: 0.75,
  // Was einzelne Handlungen wert sind. Reine Stellschraube.
  werte: {
    angriff: -30,
    beuteZug: -15,
    handel: 3,
    hilfslieferung: 8,
  },
};

// --- Sterne -----------------------------------------------------------
// Bis v0.27 hatte jedes System effektiv denselben Stern. Real ist das die
// unwahrscheinlichste aller Annahmen: **rote Zwerge stellen rund drei Viertel
// aller Sterne in der Sonnenumgebung**, sonnenähnliche keine acht Prozent.
//
// Was ein Stern im Spiel entscheidet, ist genau EINE Sache: wo im System die
// bewohnbare Zone liegt. Die Gleichgewichtstemperatur eines Planeten geht mit
// T ∝ (L/a²)^¼ -- daraus folgt, dass die habitable Zone mit der WURZEL der
// Leuchtkraft nach außen wandert (a ≈ √(L/L☉) AE). Für einen roten Zwerg mit
// 4 % Sonnenleuchtkraft liegt sie bei rund 0,2 AE, für einen F-Stern mit
// 3,5 Sonnenleuchtkräften bei rund 1,9 AE. TRAPPIST-1 ist der reale Extremfall:
// sieben Planeten innerhalb von 0,06 AE.
//
// Die heißen Klassen A/B/O fehlen bewusst. Sie sind zusammen unter einem
// Prozent, leben nur einige hundert Millionen Jahre und wären reine
// Vollständigkeit ohne Spielwirkung.
//
// `leuchtkraft` ist ein Bereich, kein fester Wert -- wie die Masse bei den
// Planetenklassen. Zwei rote Zwerge sind nicht derselbe Stern.
export const STERN_TYPEN = {
  m: {
    id: "m", name: "Roter Zwerg", spektral: "M", haeufigkeit: 76,
    // Der volle M-Bereich reicht bis hinunter zu 0,0001 L☉. Hier steht der
    // obere Teil davon: das sind die Zwerge, um die real Planeten gefunden
    // werden (M0-M5). Bewusst gewählte Prämisse, keine gemessene Grenze.
    leuchtkraft: [0.01, 0.08], farbe: "#ff8a5c",
  },
  k: {
    id: "k", name: "Oranger Zwerg", spektral: "K", haeufigkeit: 12,
    leuchtkraft: [0.12, 0.6], farbe: "#ffb877",
  },
  g: {
    id: "g", name: "Gelber Zwerg", spektral: "G", haeufigkeit: 8,
    leuchtkraft: [0.7, 1.5], farbe: "#ffe9a8",
  },
  f: {
    id: "f", name: "Weißgelber Stern", spektral: "F", haeufigkeit: 4,
    leuchtkraft: [1.6, 6], farbe: "#f2f4ff",
  },
};

// Das Heimatsystem bekommt immer einen gelben Zwerg. Gleiche Denkweise wie bei
// --- Namen für die eigene Heimatwelt (A-082) -------------------------------
//
// Tobis Vorgabe: „Heimatwelt bekommt einen zufälligen Namen am Anfang. Der
// muss vor allem im Intro stehen. ‚Dein Planet Heimatwelt' klingt nicht gut."
//
// DREI REGELN, nach denen diese Liste zusammengestellt ist:
//
//   1. SPRACHNEUTRAL. Jeder Name liest sich im Deutschen wie im Englischen
//      gleich und heißt in beiden Sprachen dasselbe -- er ist ein Eigenname
//      und geht deshalb NICHT durch t(). Ein Planet, der beim Sprachwechsel
//      seinen Namen wechselt, wäre ein anderer Planet.
//   2. ERDIG, nicht heroisch. Das hier ist die Welt, auf der jemand wohnt,
//      keine Schlachtflotte. Kurze, aussprechbare Wörter mit Klang, keine
//      Kennnummern -- "35-XII" haben schon alle anderen Planeten.
//   3. KEINE ANLEIHEN. Nichts aus bekannten SciFi-Werken, nichts aus echten
//      Sternkatalogen mit belegter Bedeutung. Erfundene Wörter und
//      lateinisch/griechisch klingende Bildungen, die niemandem gehören.
//
// Dreißig Stück: genug, dass zwei Partien nebeneinander selten denselben
// Namen tragen, wenig genug, dass jeder einzelne durchgesehen ist.
export const HEIMATWELT_NAMEN = [
  "Aurin", "Calder", "Doran", "Elaris", "Ferrun", "Galen",
  "Halcyon", "Ilmar", "Jorvik", "Kestra", "Lumen", "Marek",
  "Novis", "Orin", "Petra", "Quenna", "Rasmus", "Selene",
  "Tarim", "Umbra", "Valen", "Wendel", "Xanthe", "Ysolde",
  "Zephyr", "Alder", "Brenna", "Cygna", "Delphi", "Eryn",
];

// der Heimatwelt (Generalist, keine Affinität): der Start darf nicht am Würfel
// hängen. Ein roter Zwerg als Startsystem wäre eine andere Anfangspartie.
export const HEIMAT_STERN = "g";

// Wie stark ein Stern die Zonen im System verschiebt.
//
// Zwei Dinge ziehen hier gegeneinander, und beide sind real:
//  - Die habitable Zone wandert mit √L nach außen (siehe oben).
//  - Die protoplanetare Scheibe skaliert mit dem Stern, das SYSTEM selbst ist
//    um einen leuchtschwachen Stern also kompakter (TRAPPIST-1).
//
// Würde man nur das erste einsetzen, wäre um einen roten Zwerg alles Eis;
// würde man beides voll gegeneinander rechnen, hätte der Sterntyp überhaupt
// keine Wirkung. Deshalb: die RÄNDER des Systems folgen dem Stern (0 bleibt 0,
// 1 bleibt 1), das Temperaturgefälle INNEN wird gestaucht bzw. gedehnt.
//
// Technisch eine Potenz auf die relative Orbitlage, Exponent L^¼. Sie ist
// monoton und hält die Endpunkte fest -- jedes System behält damit eine heiße
// Innenzone und einen kalten Rand, nur die Anteile verschieben sich.
// ◆ Der Exponent ist eine gewählte Prämisse, keine gemessene Größe.
export const STERN_ZONEN_EXPONENT = 0.25;

export function sternWarp(leuchtkraft) {
  return Math.pow(leuchtkraft > 0 ? leuchtkraft : 1, STERN_ZONEN_EXPONENT);
}

// --- Orbitzonen -------------------------------------------------------
// Ein Orbit ist vor allem ABSTAND ZUM STERN, und der entscheidet über die
// Temperatur: innen heiß, außen kalt, dazwischen die habitable Zone, in der
// flüssiges Wasser möglich ist.
//
// Bis v0.22 war die Orbitnummer physikalisch bedeutungslos -- sie steuerte nur
// die Flugzeit innerhalb des Systems, und Planetenarten wurden gleichverteilt
// gewürfelt. Ein Eisplanet konnte direkt am Stern liegen.
//
// `bis` ist die relative Position im System (0 = innerster Orbit, 1 = äußerster).
// Die Zonen werden der Reihe nach geprüft, die erste passende gewinnt.
// `arten` ist eine Gewichtstabelle wie VORKOMMEN_TABELLE -- eine seltene Art
// ist schlicht eine niedrige Zahl.
//
// Gasriesen stehen bewusst nur außen. Es gibt reale "heiße Jupiter" dicht an
// ihrem Stern, aber die sind dorthin gewandert und in der Minderheit; für die
// Zwecke des Spiels ist die Vereinfachung ehrlicher als die Ausnahme.
// Je Zone: welche Massenklassen dort entstehen und wieviel Wasser sie tragen.
// Riesenplaneten stehen bewusst nur außen -- reale "heiße Jupiter" sind dorthin
// gewandert und in der Minderheit. Der Wasseranteil steigt nach außen, weil
// jenseits der Frostgrenze flüchtige Stoffe als Eis vorliegen.
export const ORBIT_ZONEN = [
  { bis: 0.20, name: "heiß",
    klassen: { kleinwelt: 3, felswelt: 5, supererde: 2 },
    wasser: { trocken: 8, maessig: 2, reich: 0 } },
  { bis: 0.45, name: "warm",
    klassen: { kleinwelt: 2, felswelt: 5, supererde: 3 },
    wasser: { trocken: 5, maessig: 4, reich: 1 } },
  { bis: 0.60, name: "habitabel",
    klassen: { kleinwelt: 2, felswelt: 6, supererde: 2 },
    wasser: { trocken: 2, maessig: 4, reich: 4 } },
  { bis: 0.80, name: "kalt",
    klassen: { kleinwelt: 3, felswelt: 3, supererde: 1, miniNeptun: 1, eisriese: 2 },
    wasser: { trocken: 1, maessig: 3, reich: 6 } },
  { bis: 1.01, name: "äußer",
    klassen: { kleinwelt: 3, felswelt: 1, miniNeptun: 2, eisriese: 3, gasriese: 4 },
    wasser: { trocken: 0, maessig: 2, reich: 8 } },
];

// Solarertrag je Orbit-Zone (A-055). Die Zone steht am Planeten und kommt
// aus derselben thermischen Lage wie Klasse und Wasser -- eine zweite
// Abstandsrechnung wäre ein zweiter Maßstab. Die Staffelung folgt der
// Physik grob (Bestrahlungsstärke ~ 1/r²), ohne sie nachzubauen: innen
// lohnt sich das Feld richtig, außen ist es ein Notnagel.
// Planeten ohne Zonen-Eintrag (Piratenbasen alter Stände) zählen als
// habitabel -- neutraler Faktor 1.
export const SOLAR_ZONEN_FAKTOR = {
  "heiß": 1.6,
  "warm": 1.25,
  "habitabel": 1.0,
  "kalt": 0.6,
  "äußer": 0.35,
};

export function solarLageFaktor(planet) {
  const faktor = planet && planet.zone ? SOLAR_ZONEN_FAKTOR[planet.zone] : undefined;
  return faktor === undefined ? 1 : faktor;
}

// Relative Lage eines Orbits im System, 0 (innen) bis 1 (außen).
export function orbitLage(orbit, orbitAnzahl) {
  if (!orbitAnzahl || orbitAnzahl <= 1) return 0.5;
  return Math.min(1, Math.max(0, (orbit - 1) / (orbitAnzahl - 1)));
}

// Die Lage, die für die Temperatur zählt: die geometrische Lage im System,
// verzerrt durch die Leuchtkraft des Sterns. Ohne Stern (oder mit einem
// sonnengleichen) ist sie identisch mit orbitLage -- deshalb ist der Parameter
// optional und alle älteren Aufrufer bleiben gültig.
export function orbitLageThermisch(orbit, orbitAnzahl, leuchtkraft = 1) {
  return Math.pow(orbitLage(orbit, orbitAnzahl), sternWarp(leuchtkraft));
}

export function orbitZone(orbit, orbitAnzahl, leuchtkraft = 1) {
  const lage = orbitLageThermisch(orbit, orbitAnzahl, leuchtkraft);
  return ORBIT_ZONEN.find((z) => lage < z.bis) || ORBIT_ZONEN[ORBIT_ZONEN.length - 1];
}

// --- Planetenmodell ---------------------------------------------------
// Ein Planet ist KEINE Art aus einer Liste, sondern eine Kombination aus drei
// Eigenschaften. Bis v0.23 gab es sechs feste Namen, und die vermischten zwei
// physikalisch getrennte Dinge: eine Wüstenwelt und eine Ozeanwelt sind
// dieselbe Sorte Planet mit unterschiedlichem Wasservorrat, ein Gasriese
// dagegen ist etwas grundsätzlich anderes -- er hat gar keine Oberfläche.
//
//   1. KLASSE   -- die Masse. Bestimmt Schwerkraft, ob es eine Oberfläche
//                  gibt und vor allem, ob eine Atmosphäre gehalten werden
//                  kann. Das ist die Achse, an der Terraforming hängt.
//   2. ZONE     -- der Abstand zum Stern (ORBIT_ZONEN, seit v0.23).
//   3. WASSER   -- der Vorrat an flüchtigen Stoffen.
//
// Der sichtbare Name wird daraus ABGELEITET (siehe planetName). Die vertrauten
// Bezeichnungen bleiben also erhalten -- sie sind nur nicht mehr die Grundlage,
// sondern das Ergebnis.

// Massenklassen. `atmosphaere: false` heißt: die Schwerkraft reicht nicht, um
// eine Lufthülle dauerhaft zu halten -- Mars ist genau dieser Fall (ein Zehntel
// Erdmasse, Fluchtgeschwindigkeit 5 km/s, Atmosphäre verloren). Solche Welten
// sind NIE terraformbar, und das ist die harte Wand, die aus der Physik kommt.
//
// `geologie` sind die Faktoren auf Kruste-Rohstoffe, `gas` die auf Stoffe aus
// der Atmosphäre. Welten ohne Oberfläche haben keine Kruste, die man abbauen
// könnte -- deshalb dort alle Geologiewerte 0.
export const PLANETEN_KLASSEN = {
  kleinwelt: {
    id: "kleinwelt", name: "Kleinwelt", masse: [0.01, 0.1], schwerkraft: 0.3,
    oberflaeche: true, atmosphaere: false,
    // Uran (A-148): lithophil, reichert sich MIT der Krustendifferenzierung
    // an (Granite, Pegmatite) -- eine kleine, kaum differenzierte Welt ohne
    // anhaltenden Vulkanismus hat davon am wenigsten, eine Supererde mit mehr
    // innerer Wärme am meisten. Gegenläufig zu Iridium (siderophil).
    geologie: { metall: 1.2, silizium: 0.9, iridium: 0.9, uran: 0.7 },
  },
  felswelt: {
    id: "felswelt", name: "Felswelt", masse: [0.1, 2], schwerkraft: 1.0,
    oberflaeche: true, atmosphaere: true,
    geologie: { metall: 1.0, silizium: 1.0, iridium: 0.6, uran: 1.0 },
  },
  supererde: {
    id: "supererde", name: "Supererde", masse: [2, 10], schwerkraft: 1.8,
    oberflaeche: true, atmosphaere: true,
    geologie: { metall: 1.6, silizium: 1.5, iridium: 1.4, uran: 1.5 },
  },
  // Ab hier: kein fester Boden. Nur Schwebeanlagen, kein Terraforming.
  miniNeptun: {
    id: "miniNeptun", name: "Mini-Neptun", masse: [2, 10], schwerkraft: 1.6,
    oberflaeche: false, atmosphaere: true,
    geologie: {}, gas: { tritium: 1.5 },
  },
  // Uranus und Neptun. Eigene Klasse, nicht "kleiner Gasriese": ihr Inneres
  // besteht überwiegend aus Wasser, Ammoniak und Methan statt aus Wasserstoff.
  // Ihre Fluchtgeschwindigkeit liegt bei 21-24 km/s statt 59,5 -- sie sind die
  // BESSEREN Brennstoffquellen, genau deshalb zielen reale Vorschläge auf sie.
  eisriese: {
    id: "eisriese", name: "Eisriese", masse: [10, 20], schwerkraft: 1.4,
    oberflaeche: false, atmosphaere: true,
    geologie: {}, gas: { tritium: 2.0 },
  },
  gasriese: {
    id: "gasriese", name: "Gasriese", masse: [50, 400], schwerkraft: 2.5,
    oberflaeche: false, atmosphaere: true,
    geologie: {}, gas: { tritium: 2.2 },
  },
};

// Was die Schwerkraft kostet. Zwei verschiedene Physiken, deshalb zwei Formeln:
//
// BAUEN ist ein Traglastproblem. Ein Bauwerk muss sein eigenes Gewicht tragen,
// der Materialbedarf steigt etwa linear mit der Schwerkraft.
//
// STARTEN ist ein Raketengleichungsproblem, und das ist eine völlig andere
// Kurve. Der nötige Treibstoff wächst EXPONENTIELL mit der Geschwindigkeit,
// die man erreichen muss -- die Fluchtgeschwindigkeit wiederum steigt mit der
// Schwerkraft. Deshalb steht hier ein quadratischer Term statt eines linearen:
// eine Supererde ist nicht "etwas teurer" als Startplatz, sondern deutlich
// schlechter.
//
// Angewandt wird das auf GEBÄUDEBAU und SCHIFFBAU. Bewusst NICHT auf
// Reparatur und Recycling: das Material ist dort schon oben, und ein
// mitskaliertes Recycling wäre eine Handelslücke -- billig auf einer
// Kleinwelt bauen, teuer auf einer Supererde verschrotten.
// Schwerkraft eines konkreten Planeten aus Masse und Radius, beides in
// Erdeinheiten: g = M / R². Das ersetzt den festen Wert je Klasse -- zwei
// Supererden haben jetzt unterschiedliche Schwerkraft, so wie es sein sollte.
//
// Der Radius folgt aus der Masse über die empirische Beziehung R ≈ M^0.27 für
// Gesteinsplaneten. Daraus ergibt sich g ≈ M^0.46: eine Welt mit fünf
// Erdmassen hat rund die doppelte Schwerkraft, nicht die fünffache -- sie ist
// eben auch größer.
export const MASSE_RADIUS_EXPONENT = 0.27;

export function radiusAusMasse(masse) {
  return Math.pow(masse, MASSE_RADIUS_EXPONENT);
}

export function schwerkraftAus(masse, radius) {
  if (!radius) return 1;
  return masse / (radius * radius);
}

// Antimaterie-Ernte an Riesenplaneten.
//
// Der zweite, völlig andere Weg zu Antimaterie -- und der einzige, der nichts
// kostet außer Hinkommen. Physikalisch: **Antiprotonen sammeln sich in den
// Strahlungsgürteln von Planeten mit starkem Magnetfeld.** Auf der Erde 2011
// nachgewiesen, bei einem Gasriesen mit seinem gewaltigen Feld ungleich
// stärker. Sie entstehen laufend neu, wenn kosmische Strahlung auf die
// Atmosphäre trifft.
//
// Daraus folgt die Spielregel von selbst: das Vorkommen ist NICHT erschöpfbar,
// sondern wächst nach -- langsam. Man kann es nicht leerbaggern, nur zu oft
// besuchen. Damit ist es das genaue Gegenstück zur Antimateriefabrik, die
// Energie im Übermaß braucht, aber überall stehen kann.
//
// Je stärker das Magnetfeld, desto mehr sammelt sich: Gasriese > Eisriese >
// Mini-Neptun.
export const ANTIMATERIE_ERNTE = {
  vorrat: { gasriese: 40, eisriese: 25, miniNeptun: 12 },
  // Anteil des vollen Vorrats, der pro Stunde nachwächst -- 0,02 heißt: nach
  // 50 Stunden ist ein leergeernteter Gürtel wieder voll.
  nachwachsenProStunde: 0.02,
  // Ohne die Technologie sieht man den Gürtel, kommt aber nicht heran --
  // dasselbe Schlüssel-Muster wie bei tiefliegenden Vorkommen.
  benoetigt: "antimaterietechnik",
};

export const SCHWERKRAFT = {
  bauAnteil: 0.6,      // Kosten × (1 + (g − 1) × bauAnteil)
  startBasis: 0.5,     // Kosten × (startBasis + startFaktor × g²)
  startFaktor: 0.5,
};

// Vorrat an flüchtigen Stoffen. Hängt real daran, ob der Körper jenseits der
// Frostgrenze entstanden ist -- deshalb steigt der Anteil nach außen.
export const WASSER_STUFEN = {
  trocken: { id: "trocken", name: "trocken", faktor: 0 },
  maessig: { id: "maessig", name: "mäßig feucht", faktor: 0.6 },
  reich: { id: "reich", name: "wasserreich", faktor: 1.2 },
};

// Wie gut wächst hier etwas, allein aus der Sternentfernung? Multipliziert
// sich mit dem Wasservorrat.
const ZONE_KLIMA = { heiß: 0, warm: 0.6, habitabel: 1.0, kalt: 0.4, äußer: 0.1 };
// Wie viel Eis liegt hier -- jenseits der Frostgrenze deutlich mehr.
const ZONE_EIS = { heiß: 0.3, warm: 0.6, habitabel: 0.8, kalt: 1.2, äußer: 1.3 };
// Sternnahe Welten verlieren leichte Stoffe und sind dadurch metallreicher.
// Merkur ist das Beispiel: auffällig hoher Eisenanteil.
const ZONE_GESTEIN = {
  heiß: { metall: 1.2, silizium: 0.9 },
  warm: {}, habitabel: {}, kalt: {}, äußer: {},
};

const KLIMA_SKALA = 1.6;

// Vollständige Affinität eines Planeten, abgeleitet statt nachgeschlagen.
// Terraforming verändert später Zone (Spiegel) und Wasser (Eisimport) -- die
// Affinität folgt dann automatisch, ohne dass hier etwas nachgezogen wird.
export function affinitaetVon({ klasse, zone, wasser }) {
  const def = PLANETEN_KLASSEN[klasse] || PLANETEN_KLASSEN.felswelt;
  const wasserFaktor = (WASSER_STUFEN[wasser] || WASSER_STUFEN.trocken).faktor;
  const out = {};

  for (const [resId, wert] of Object.entries(def.geologie || {})) {
    const zonenBonus = (ZONE_GESTEIN[zone] || {})[resId] || 1;
    out[resId] = Math.round(wert * zonenBonus * 100) / 100;
  }
  for (const [resId, wert] of Object.entries(def.gas || {})) {
    out[resId] = wert;
  }

  // Flüchtige Stoffe aus Eis -- nur auf Welten mit Oberfläche, bei Riesen
  // steht der Wert schon in `gas`.
  if (def.oberflaeche) {
    out.tritium = Math.round(wasserFaktor * (ZONE_EIS[zone] || 0.5) * 100) / 100;
  }

  // Nahrung braucht dreierlei: einen Boden, eine haltbare Atmosphäre und
  // Wasser. Fehlt eines davon, wächst nichts -- ganz ohne Sonderregel.
  out.nahrung = def.oberflaeche && def.atmosphaere
    ? Math.round((ZONE_KLIMA[zone] || 0) * wasserFaktor * KLIMA_SKALA * 100) / 100
    : 0;

  return out;
}

// Der sichtbare Name. Klasse und Wasserstand stehen im Tooltip -- angezeigt
// wird der Begriff, der die Entscheidung trägt (Tobis Wahl: intern drei
// Achsen, sichtbar eine).
export function planetName({ klasse, zone, wasser }) {
  const def = PLANETEN_KLASSEN[klasse] || PLANETEN_KLASSEN.felswelt;
  if (!def.oberflaeche) return def.name;
  if (!def.atmosphaere) return "Kleinwelt";
  if (zone === "heiß") return "Lavawelt";
  if (wasser === "reich") return zone === "kalt" || zone === "äußer" ? "Eiswelt" : "Ozeanwelt";
  if (wasser === "trocken") return "Wüstenwelt";
  return "Felsplanet";
}

// Ab diesem Faktor gilt ein Rohstoff als "kann diese Welt gut" -- gemeinsame
// Schwelle für die Zusicherungstests und die Anzeige.
export const AFFINITAET_GUT = 1.4;

// Taugt diese Welt als STARTWELT -- für den Spieler wie für ein fremdes
// Imperium? Zwei Bedingungen, beide gemessen statt gesetzt.
//
// ERSTENS NAHRUNG. Alles andere lässt sich ausgleichen: wenig Metall heißt
// langsamer bauen, kein Tritium heißt Treibstoff kaufen -- Umwege, die man
// spielen kann. Eine Nahrungs-Null ist kein Umweg: die Bevölkerung schrumpft,
// mit ihr die Arbeitskraft, und ohne Arbeitskraft steht die ganze Welt. Das
// ist kein schwieriger Start, sondern gar keiner. Gemessen können rund zwei
// Drittel aller bewohnbaren Kombinationen keine Nahrung erzeugen.
//
// ZWEITENS DIE SCHWERKRAFT, und das ist die wichtigere -- was erst eine
// Messung gezeigt hat, nicht die Überlegung. Korrelation der Weltmerkmale mit
// dem Fortschritt der ersten zwei Stunden (tests/pacing.mjs über zwölf Welten):
//
//     Schwerkraft  -0,88      Tritium  -0,24
//     Metall/Silizium -0,66   Nahrung  -0,01
//
// Die Schwerkraft treibt fast allein; Metall und Silizium korrelieren nur mit,
// weil schwere Welten zufällig auch rohstoffreich sind. Der Grund ist die
// Baukostenformel: jedes Bauwerk muss sein eigenes Gewicht tragen. Gemessene
// Startwelten lagen zwischen 0,54 g und 2,79 g -- über die Formel sind das
// Baukosten von 0,72x bis 2,07x. Entsprechend schaffte ein Spieler auf der
// leichtesten Welt 21 Aktionen in zwei Stunden und auf der schwersten 8.
// Genau der Easy/Hard-Umschwung, den es zu vermeiden gilt (Tobis Vorgabe:
// Variation ja, Schwierigkeitsgrad nein). Mit dem Band liegt die Spanne bei
// 1,23x.
//
// Die Streuung entsteht INNERHALB einer Klasse, weil die Schwerkraft der Masse
// des einzelnen Planeten folgt (g = M/R²) und nicht dem Klassenrichtwert.
//
// Das Band braucht keine Balancing-Begründung, es hat eine physische: eine
// Zivilisation entsteht auf einer Welt, deren Schwerkraft sie verträgt. Für
// KOLONIEN gilt es ausdrücklich nicht -- dort sind extreme Welten erwünscht,
// denn dort sind sie eine Spezialisierung und keine Schwierigkeitsstufe.
export const STARTWELT = {
  schwerkraftMin: 0.85,
  schwerkraftMax: 1.2,
};

// `schwerkraft` ist optional: die Zonen-/Klassenprüfung funktioniert auch ohne
// (etwa wenn nur gefragt wird, ob ein Orbit überhaupt bewohnbar wäre).
export function taugtAlsStartwelt({ klasse, zone, wasser, schwerkraft }) {
  if ((affinitaetVon({ klasse, zone, wasser }).nahrung || 0) <= 0) return false;
  if (typeof schwerkraft === "number") {
    if (schwerkraft < STARTWELT.schwerkraftMin) return false;
    if (schwerkraft > STARTWELT.schwerkraftMax) return false;
  }
  return true;
}

// --- Geldkreislauf ---------------------------------------------------------
// Bis v0.5 entstanden Credits AUS DEM NICHTS: verkaufen() schrieb sie gut, und
// niemand zahlte sie. In data.js stand dazu ehrlich, sie entstünden "NUR durch
// Verkauf" -- das beschreibt die Quelle, rechtfertigt sie aber nicht.
//
// Seit v0.6 hat Geld eine Quelle UND eine Senke, wie jeder andere Fluss im
// Spiel (Prinzip 0):
//
//   QUELLE: Abgaben. Ein Handelsposten rechnet die Wirtschaft seines Planeten
//           mit der Galaxie ab -- und die Wirtschaft sind die MENSCHEN, nicht
//           die Ausbaustufe. Er ist deshalb die einzige Anlage im Spiel, deren
//           Ertrag an der Bevölkerung hängt.
//   SENKE:  Betriebskosten desselben Postens, fest je Stufe. Daraus folgt eine
//           Aussage, die vorher keine war: EIN HANDELSPOSTEN MUSS SICH ERST
//           VERDIENEN. Unter rund 30.000 Einwohnern kostet er mehr, als er
//           einbringt.
//
// Beide Zahlen sind PRO KOPF und tragen deshalb KEINEN Maßstab -- die
// Bevölkerung selbst ist bereits skaliert, genau wie bei nahrungProKopf.
export const GELD = {
  abgabenProKopf: 0.05,
};

// --- Handelsbereitschaft (v0.67) -------------------------------------------
// Tobis Vorgabe: **der Wille zu kaufen und zu verkaufen hängt an der
// Beziehung.** Wer zu schlecht über dich denkt, verkauft dir nichts mehr --
// und kauft nur noch, was er wirklich braucht.
//
// Die Schwelle ist NICHT frei gewählt, sie fällt aus den vorhandenen Zahlen:
//   Grundhaltung eines Bot-Imperiums:  -5
//   ein Beutezug kostet:              -15
// Bei -30 verkauft dir eine Fraktion also nach rund ZWEI Überfällen nichts
// mehr. Piraterie bekommt damit einen wirtschaftlichen Preis, ohne dass
// irgendwo eine Strafe steht -- die Leute hören einfach auf, dir zu helfen.
//
// Warum Kaufen die schwächere Hemmung ist: Ware ist Ware. Wer dringend
// braucht, kauft auch beim Feind. Deshalb gibt es dort ein Bedarfsventil --
// und "Bedarf" ist gemessen, nicht geraten: der Bestand des Käufers schrumpft
// gerade (negative Nettorate).
export const HANDEL = {
  bereitschaftAb: -30,
};

// --- Markt ------------------------------------------------------------
// Verkaufspreis < Kaufpreis (Spanne), sonst wäre Handel eine Gelddruckmaschine.
// Credits selbst sind nicht handelbar. Reine Zahlen -- Balancing-Stellschraube.
export const MARKT_PREISE = {
  metall: { verkauf: 1.0, kauf: 1.6 },
  silizium: { verkauf: 1.4, kauf: 2.2 },
  tritium: { verkauf: 1.8, kauf: 2.8 },
  // Zwischen Deuterium und Iridium eingeordnet: real ist Uran in der
  // Erdkruste rund 500× häufiger als Iridium (eines der seltensten Elemente
  // überhaupt), aber seltener als die Grundstoffe -- eine eigene Mine
  // braucht es trotzdem.
  uran: { verkauf: 2.2, kauf: 3.4 },
  iridium: { verkauf: 6, kauf: 9 },
  antimaterie: { verkauf: 40, kauf: 60 },
};

export const BASE_STORAGE_CAP = 10000 * MASSSTAB;
export const STORAGE_LEVEL_FACTOR = 1.6;

export function lagerkapazitaet(level) {
  return Math.round(BASE_STORAGE_CAP * Math.pow(STORAGE_LEVEL_FACTOR, level));
}

// Rate eines Produktions-/Verbrauchseintrags bei gegebenem Gebäudelevel.
export function rate(spec, level) {
  if (!spec || level <= 0) return 0;
  return spec.basis * level * Math.pow(spec.faktor, level);
}

// Fällt dieser Verbrauchsposten bei dieser Stufe überhaupt an? (A-061)
//
// `verbrauchAbLevel` ist die laufende Entsprechung zu `baseCostAbLevel`
// (A-009) und trägt dieselbe Semantik: darunter gibt es den Posten nicht,
// ab der Stufe voll. Bewusst als Daten am Gebäude, nicht als Sonderfall im
// Code -- wie dort.
export function verbrauchAb(def, resId, level) {
  const ab = def.verbrauchAbLevel && def.verbrauchAbLevel[resId];
  return !ab || level >= ab;
}

// Fließt dieser Posten gerade? Ein Labor zieht sein Material nur, wenn
// wirklich geforscht wird -- sonst wäre es eine Strafsteuer statt eines
// Preises (A-061). Die Ressourcen, für die das gilt, stehen am Gebäude.
// FALLE FUER SPAETER: gefragt wird die Forschung des SPIELERS, weil es keine
// andere gibt -- `state.forschungsQueue` ist global. Heute stimmt das, weil
// Bots keine Labore bauen (im ganzen simulation.js kommt `forschungslabor`
// nicht vor, nachgesehen bei A-061). Sobald sie forschen, haengt ein
// Bot-Labor am Projekt des Spielers -- dann braucht diese Zeile die Fraktion
// des Planeten, nicht den globalen Zustand.
export function verbrauchLaeuft(state, def, resId) {
  if (!def.nurBeiForschung || !def.nurBeiForschung.includes(resId)) return true;
  return !!(state && state.forschungsQueue);
}

// --- Forschung ------------------------------------------------------------
// SEIT v0.6 KOSTET FORSCHUNG KEINE VORABZAHLUNG MEHR, sondern einen dauernden
// Fluss -- Prinzip 0 in Reinform. Vorher zog ein einzelner Planet die vollen
// Kosten aus seinem Lager, und die Wirkung trat imperiumsweit und sofort ein;
// das Wissen durfte das (es ist nichts Physisches), das Geld nicht.
//
// Die Rechnung dahinter, damit die Zahlen nachvollziehbar bleiben:
//   Ein Labor der Stufe 1 erzeugt EINE Forschungseinheit je Sekunde.
//   Der Aufwand eines Projekts ist seine bisherige Bauzeit in Sekunden,
//   gelesen in Forschungseinheiten (siehe forschungsAufwand).
// Damit braucht ein einzelnes Labor der Stufe 1 für eine Technologie genau
// so lange, wie sie bis v0.5 GANZ OHNE Labor gebraucht hätte -- und die
// Labore mehrerer Welten addieren sich, statt dass nur das eine zählt, das
// zufällig auf dem zahlenden Planeten stand.
//
// einheitenProSekunde ist eine MENGE und steht deshalb unten in der
// Skalierungsschleife. Ohne das wäre der Aufwand um Faktor 50 zu klein und
// jede Technologie in Sekundenbruchteilen fertig -- der sechste Fall dieser
// Falle in diesem Projekt.
export const FORSCHUNG = {
  einheitenProSekunde: 1,
};

// Die Forschung ist ein Baum: voraussetzungen = { techId: benoetigteStufe }.
// Sie muss NICHT als Baum dargestellt werden -- entscheidend ist, dass die
// Abhängigkeiten real sind. Daraus leitet sich auch die Tiefenstufe einer
// Technologie ab (siehe techStufe), die der Weltgenerator nutzt, um
// verkettete Schlösser ohne Deadlock zu bauen.
//
// boost:      wirkt auf alle Gebäude einer Kategorie.
// schluessel: reine Schlüsseltechnologie ohne Zahlenbonus -- sie schaltet
//             Objekte in der Welt frei. Genau das ist der Unterschied zu
//             "Techtree = Prozentboni".
export const RESEARCH = {
  foerdertechnik: {
    id: "foerdertechnik",
    name: "Fördertechnik",
    beschreibung: "Verbessert die Abbaueffizienz aller Minen um 5% pro Stufe.",
    baseCost: { metall: 200, silizium: 100 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    boost: { kategorie: "mine", proLevel: 0.05, graduell: true },
    voraussetzungen: {},
  },
  energietechnik: {
    id: "energietechnik",
    name: "Energietechnik",
    beschreibung:
      "Verbessert den Wirkungsgrad deiner Kraftwerke um 8% pro Stufe. Eine Wärmekraftmaschine kann prinzipiell nie alle Wärme in Strom wandeln: die Grenze ist 1 minus dem Verhältnis von kalter zu heißer Temperatur. Fortschritt heißt hier, heißer zu werden.",
    baseCost: { metall: 150, silizium: 150 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    boost: { kategorie: "energie", proLevel: 0.08, graduell: true },
    voraussetzungen: {},
  },
  sondentechnik: {
    id: "sondentechnik",
    name: "Sondentechnik",
    beschreibung: "Verkürzt die Flugzeit deiner Sonden um 10% pro Stufe.",
    baseCost: { metall: 250, silizium: 200 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    sondenProLevel: 0.1,
    nurDurchEntdeckung: true,
    voraussetzungen: { energietechnik: 2 },
  },
  bergungstechnik: {
    id: "bergungstechnik",
    name: "Bergungstechnik",
    beschreibung: "Erhöht die Ausbeute aus Wracks und Asteroiden um 15% pro Stufe.",
    baseCost: { metall: 300, silizium: 180 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    bergungProLevel: 0.15,
    nurDurchEntdeckung: true,
    voraussetzungen: { foerdertechnik: 2 },
  },
  tiefenbohrung: {
    id: "tiefenbohrung",
    name: "Tiefenbohrung",
    beschreibung: "Erschließt tief liegende Vorkommen, an die normale Ausrüstung nicht herankommt.",
    baseCost: { metall: 600, silizium: 350 },
    costFactor: 2.0,
    buildTimeDivisor: 1.2,
    schluessel: true,
    nurDurchEntdeckung: true,
    voraussetzungen: { foerdertechnik: 3, bergungstechnik: 1 },
  },
  resonanzzerlegung: {
    id: "resonanzzerlegung",
    name: "Resonanzzerlegung",
    beschreibung: "Zerlegt fremdartige Strukturen, die sich mechanisch nicht öffnen lassen.",
    baseCost: { metall: 800, silizium: 600 },
    costFactor: 2.0,
    buildTimeDivisor: 1.2,
    schluessel: true,
    nurDurchEntdeckung: true,
    voraussetzungen: { energietechnik: 3, tiefenbohrung: 1 },
  },
  // Nicht entdeckungsabhängig: Reichweite muss IMMER erweiterbar sein, sonst
  // könnte ein weit entfernter Schlüssel den Spieler dauerhaft aussperren.
  frachttechnik: {
    id: "frachttechnik",
    name: "Frachttechnik",
    beschreibung: "Erhöht die Ladekapazität deiner Frachter um 20% pro Stufe.",
    baseCost: { metall: 350, silizium: 300 },
    costFactor: 1.8,
    buildTimeDivisor: 1.4,
    voraussetzungen: { foerdertechnik: 1 },
    kapazitaetProLevel: 0.2,
  },
  antriebstechnik: {
    id: "antriebstechnik",
    name: "Antriebstechnik",
    beschreibung:
      "Erhöht die maximale Reichweite deiner Sonden und verkürzt Reisezeiten zwischen Systemen. Der Treibstoffbedarf wächst nicht mit der Geschwindigkeit, sondern exponentiell mit ihr – wer Treibstoff mitnimmt, muss auch den Treibstoff beschleunigen. Deshalb ist jede Verbesserung des Antriebs mehr wert als jeder größere Tank.",
    baseCost: { metall: 400, silizium: 250 },
    costFactor: 1.7,
    buildTimeDivisor: 1.3,
    voraussetzungen: { energietechnik: 1 },
    reisezeitProLevel: 0.06,
  },
  lagerlogistik: {
    id: "lagerlogistik",
    name: "Lagerlogistik",
    beschreibung: "Erhöht die Kapazität aller Lagerhallen um 6% pro Stufe.",
    baseCost: { metall: 200, silizium: 120 },
    costFactor: 1.5,
    buildTimeDivisor: 1.6,
    boost: { kategorie: "lager", proLevel: 0.06, graduell: true },
    voraussetzungen: {},
  },
  fusionstechnik: {
    id: "fusionstechnik",
    name: "Fusionstechnik",
    // A-149: seit dieser Runde schaltet die erste Stufe zusätzlich das
    // Kraftwerk frei (BUILDINGS.kraftwerk.benoetigt) -- vorher gab die
    // Forschung nur den Boost. Erst am Ende genannt, wie die
    // Erstklärungs-Konvention es für Feature-Text hält: die eigentliche
    // Wirkung (was erforschen ERMÖGLICHT) vor der Verbesserung (was es an
    // Bestehendem verstärkt).
    beschreibung:
      "Zweite Stufe der Energiegewinnung. Verbessert Kraftwerke um weitere 10% pro Stufe. Fusion gewinnt Energie nur, solange die Kerne leichter sind als Eisen – dort sind sie am festesten gebunden. Jenseits davon kostet Verschmelzen Energie, statt welche zu liefern. Schaltet das Kraftwerk frei.",
    baseCost: { metall: 500, silizium: 400 },
    costFactor: 1.7,
    buildTimeDivisor: 1.4,
    boost: { kategorie: "energie", proLevel: 0.1, graduell: true },
    voraussetzungen: { energietechnik: 3 },
  },
  iridiumverarbeitung: {
    id: "iridiumverarbeitung",
    name: "Iridiumverarbeitung",
    beschreibung: "Verbessert die Ausbeute deiner Iridiumminen um 7% pro Stufe.",
    baseCost: { metall: 300, silizium: 250 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    boost: { kategorie: "iridium", proLevel: 0.07, graduell: true },
    voraussetzungen: { foerdertechnik: 1 },
  },
  // Aufklärungs-Automatisierung. Gleiche Denkweise wie
  // Automatisierungstechnik: Bequemlichkeit muss erforscht werden, das frühe
  // Spiel bleibt dadurch von selbst manuell. Bewusst zwei getrennte
  // Forschungen, weil Sonden und Erkunder unterschiedliche Ziele aufdecken --
  // wer nur das eine hat, automatisiert auch nur das eine.
  sondenKi: {
    id: "sondenKi",
    name: "Sonden-KI",
    beschreibung: "Startet mit einem Klick so viele Sonden, wie es unerforschte einfache Ziele im System gibt -- statt jede einzeln loszuschicken.",
    baseCost: { metall: 900, silizium: 700 },
    costFactor: 1.4,
    buildTimeDivisor: 1.2,
    schluessel: true,
    voraussetzungen: { antriebstechnik: 1 },
  },
  erkunderKi: {
    id: "erkunderKi",
    name: "Erkunder-KI",
    beschreibung: "Dasselbe für Erkunder: ein Klick deckt alle komplexen Ziele im System auf -- Anomalien, Strukturen, Gefahren.",
    baseCost: { metall: 1600, silizium: 1300 },
    costFactor: 1.4,
    buildTimeDivisor: 1.2,
    schluessel: true,
    voraussetzungen: { sondenKi: 1 },
  },
  automatisierungstechnik: {
    id: "automatisierungstechnik",
    name: "Automatisierungstechnik",
    // A-034: Routen sind seit v1.11 frei -- diese Forschung schaltet sie
    // nicht mehr frei, sie ist die Grundlage der KI-Stufen darueber
    // (Sonden- und Erkunder-KI). Die Beschreibung sagt das jetzt auch.
    beschreibung: "Grundlage der selbständig handelnden Steuerungen. Routen fährst du auch ohne sie – hier beginnt, was ohne dich ENTSCHEIDET, statt nur zu wiederholen.",
    baseCost: { metall: 1200, silizium: 900 },
    costFactor: 1.4,
    buildTimeDivisor: 1.2,
    schluessel: true,
    voraussetzungen: { frachttechnik: 2, antriebstechnik: 1 },
  },
  logistiknetzwerk: {
    id: "logistiknetzwerk",
    name: "Logistiknetzwerk",
    beschreibung: "Planeten gleichen konfigurierte Mindestbestände automatisch untereinander aus -- mit derselben Verzögerung, die die schnellstmögliche Flotte bräuchte, aber ohne dass du Schiffe schicken musst.",
    baseCost: { metall: 2500, silizium: 2000 },
    costFactor: 1.5,
    buildTimeDivisor: 1.0,
    schluessel: true,
    voraussetzungen: { automatisierungstechnik: 1, frachttechnik: 3 },
  },
  antimaterietechnik: {
    id: "antimaterietechnik",
    name: "Antimaterietechnik",
    beschreibung: "Verbessert die Ausbeute deiner Antimateriekollektoren um 10% pro Stufe.",
    baseCost: { metall: 900, silizium: 900, iridium: 300 },
    costFactor: 2.0,
    buildTimeDivisor: 1.2,
    boost: { kategorie: "antimaterie", proLevel: 0.1, graduell: true },
    voraussetzungen: { iridiumverarbeitung: 3, fusionstechnik: 1 },
  },

  // --- Die Technologie, um die es in der Demo geht ------------------------
  // Sie hält die Supernova NICHT auf -- das kann nichts. Sie hält die Welten
  // durch das Jahrtausend danach: die kosmische Teilchenflut ist GELADEN und
  // lässt sich magnetisch ablenken, der Gammablitz nicht (der braucht Masse,
  // und dafür sind die Wohnmodule da).
  //
  // Reales Vorbild: die NASA hat einen Magnetschild am L1-Punkt durchgerechnet,
  // um dem Mars eine haltbare Atmosphäre zu geben.
  //
  // `schluessel: true` -- eine Stufe, fertig oder nicht. Es gibt kein
  // "halb geschützt".
  magnetosphaerentechnik: {
    id: "magnetosphaerentechnik",
    name: "Magnetosphärentechnik",
    beschreibung:
      "Erlaubt den Bau planetarer Magnetfeldgeneratoren. Sie halten keinen Gammablitz auf – der braucht Masse, dafür sind die Wohnmodule da. Sie lenken die geladene Teilchenflut ab, die einer Supernova jahrtausendelang folgt, und halten damit die Atmosphäre. Vorbild ist ein real durchgerechneter Magnetschild am L1-Punkt des Mars.",
    baseCost: { metall: 6000, silizium: 5000, iridium: 1200 },
    costFactor: 1,
    buildTimeDivisor: 0.35,
    schluessel: true,
    voraussetzungen: { energietechnik: 3, fusionstechnik: 1 },
  },
  // Die letzte Kategorie ohne Boost-Forschung (A-062, Fund aus A-009).
  //
  // WARUM ANS ENDE DER TABELLE: der Baum gruppiert nach Tiefenstufe, und
  // innerhalb einer Spalte folgt die Reihenfolge dieser Tabelle. Weiter oben
  // eingehängt schöbe sie bestehende Kacheln in ihrer Spalte nach hinten --
  // Prinzip 8 erlaubt Dazukommen, aber kein Umziehen.
  //
  // Voraussetzung `iridiumverarbeitung` wie beauftragt, und sie trägt
  // fachlich: beides ist VEREDELUNG, nicht Förderung. Wer gelernt hat, aus
  // Erz einen Werkstoff zu machen, kann den nächsten Schritt angehen. (Die
  // Alternative wäre eine Energie-Vorstufe gewesen -- die Fertigung ist
  // stromhungrig -- aber Strom hat jede Anlage, Veredelung nicht.)
  // Die Antwort auf „kein Wasser, aber Strom" (A-071). ANS ENDE der Tabelle
  // aus demselben Grund wie die Fertigungstechnik: der Baum ordnet innerhalb
  // einer Tiefenstufe nach Tabellenreihenfolge, und weiter oben eingehängt
  // schöbe sie bestehende Kacheln in ihrer Spalte nach hinten.
  //
  // `schluessel: true`, weil sie einen SCHALTER freigibt und keine Zahl hebt:
  // der Modus ist da oder nicht. Das ist auch die A-013-Antwort -- eine
  // Freischaltung wirkt bei Abschluss, nicht anteilig, und darf deshalb
  // keinen `boost` tragen.
  //
  // Voraussetzung Energietechnik 2: Anreicherung IST angewandte Energietechnik
  // (Trennkaskaden, Wärmeführung), und sie ergibt erst Sinn, wenn überhaupt
  // Strom im Überfluss da sein kann.
  anreicherungstechnik: {
    id: "anreicherungstechnik",
    name: "Anreicherungstechnik",
    beschreibung:
      "Schaltet am Deuterium-Extraktor einen zweiten Betriebsmodus frei: Anreicherung trennt schweren Wasserstoff aus Wasser, statt ihn zu fördern – bezahlt wird mit Strom. Deuterium steckt in jedem Wasser, aber nur in jedem sechstausendvierhundertsten Wasserstoffkern; die beiden Sorten unterscheiden sich chemisch fast nicht, und genau deshalb ist die Trennung Arbeit. Sie erzeugt nichts, sie sortiert – und wie jede Sortierung kostet sie mehr, als der Unterschied wert ist. Wieviel mehr, entscheidet in diesem Spiel die Spielbarkeit und nicht die Physik: wirklich liefert eine Tonne Deuterium in der Fusion um Größenordnungen mehr Energie, als ihre Abtrennung kostet.",
    baseCost: { metall: 550, silizium: 450 },
    costFactor: 1,
    buildTimeDivisor: 1.4,
    schluessel: true,
    voraussetzungen: { energietechnik: 2 },
  },
  fertigungstechnik: {
    id: "fertigungstechnik",
    name: "Fertigungstechnik",
    beschreibung:
      "Verbessert die Ausbeute deiner Fertigungen um 7% pro Stufe. Was in der Halbleiterfertigung zählt, ist nicht Menge, sondern Ausbeute: von einer Scheibe wird nur der Teil brauchbar, auf dem kein einziger Defekt sitzt. Jede Verbesserung an Reinheit und Prozessführung verschiebt genau diesen Anteil – dieselbe Anlage, dieselbe Menge Silizium, mehr fertige Bauteile.",
    baseCost: { metall: 450, silizium: 380 },
    costFactor: 1.8,
    buildTimeDivisor: 1.5,
    boost: { kategorie: "fertigung", proLevel: 0.07, graduell: true },
    voraussetzungen: { iridiumverarbeitung: 1 },
  },
};

export const ENTDECKBARE_FORSCHUNGEN = Object.values(RESEARCH)
  .filter((d) => d.nurDurchEntdeckung)
  .map((d) => d.id);

// Tiefenstufe im Forschungsbaum: 0 = ohne Voraussetzungen, sonst eins mehr
// als die tiefste Voraussetzung. Diese Ordnung macht Kreise unmöglich und
// liefert dem Weltgenerator die Staffelung für verkettete Schlösser.
const stufenCache = {};
export function techStufe(id) {
  if (stufenCache[id] !== undefined) return stufenCache[id];
  const def = RESEARCH[id];
  const vor = Object.keys(def.voraussetzungen || {});
  stufenCache[id] = vor.length === 0 ? 0 : 1 + Math.max(...vor.map(techStufe));
  return stufenCache[id];
}

// Alle nur-durch-Entdeckung erreichbaren Voraussetzungen einer Technologie,
// transitiv. Wer resonanzzerlegung ins System legt, braucht dort auch eine
// Quelle für tiefenbohrung und bergungstechnik.
export function entdeckbareVoraussetzungen(id, gesammelt = new Set()) {
  for (const vorId of Object.keys(RESEARCH[id].voraussetzungen || {})) {
    if (RESEARCH[vorId].nurDurchEntdeckung && !gesammelt.has(vorId)) {
      gesammelt.add(vorId);
      entdeckbareVoraussetzungen(vorId, gesammelt);
    } else {
      entdeckbareVoraussetzungen(vorId, gesammelt);
    }
  }
  return gesammelt;
}

export function voraussetzungenErfuellt(forschungsStand, id) {
  return Object.entries(RESEARCH[id].voraussetzungen || {}).every(
    ([vorId, stufe]) => (forschungsStand[vorId] || 0) >= stufe
  );
}

// Die einzige Stelle in dieser Datei, die Anzeigetext ZUSAMMENSETZT statt ihn
// nur abzulegen -- deshalb läuft der Name hier durch t(), während die Tabellen
// darüber einsprachig bleiben.
export function voraussetzungenText(id) {
  const vor = RESEARCH[id].voraussetzungen || {};
  return Object.entries(vor)
    .map(([vorId, stufe]) => `${t(RESEARCH[vorId].name)} ${stufe}`)
    .join(", ");
}

// --- Systemgenerierung ----------------------------------------------------
// Systeme sind nicht gerastert, sondern vom Zufall regiert: Anzahl und
// Zusammensetzung werden aus Bereichen und Wahrscheinlichkeiten gezogen.
// Alles hier ist Stellschraube -- Balancing gehört in diese Tabelle, nicht
// in den Generator.
export const SYSTEM_REGELN = {
  // Wie viele Orbitpositionen das System überhaupt hat.
  orbits: { min: 12, max: 50 },
  // Harte Obergrenze an belegten Positionen.
  maxObjekte: 50,
  // Wie viele Objekte je Art vorkommen. hartesMax gilt zusätzlich.
  vorkommen: {
    planet: { min: 3, max: 7, hartesMax: 12 },
    asteroiden: { min: 2, max: 8 },
    wrack: { min: 0, max: 5 },
    struktur: { min: 0, max: 3 },
    gefahr: { min: 0, max: 4 },
    // Anomalien ergeben sich aus den benötigten Technologien, plus Zugabe.
    anomalieExtra: { min: 0, max: 2 },
  },
  // Wahrscheinlichkeit, dass ein Planet besiedelbar ist.
  planetBesiedelbar: 0.7,
  // Anteil der Vorkommen, die hinter einer Schlüsseltechnologie liegen.
  anteilGesperrt: 0.35,
};

// Gewichtete Tabelle, welche Ressource ein Vorkommen enthält.
// Gewichte sind relativ -- eine seltene Ressource bekommt einfach ein
// kleines Gewicht (z.B. gold: 5 neben metall: 60). Neue Ressource ergänzen
// heisst: hier eine Zeile hinzufügen, sonst nichts.
export const VORKOMMEN_TABELLE = [
  { ressource: "metall", gewicht: 60, menge: { min: 600, max: 2000 } },
  { ressource: "silizium", gewicht: 40, menge: { min: 400, max: 1500 } },
  { ressource: "iridium", gewicht: 15, menge: { min: 150, max: 600 } },
  { ressource: "antimaterie", gewicht: 3, menge: { min: 20, max: 90 } },
];

// --- Galaxie --------------------------------------------------------------
// Systeme werden NICHT gespeichert, sondern deterministisch aus
// (Galaxie-Saat, Systemnummer) erzeugt. Gespeichert wird nur, was der
// Spieler verändert hat. Siehe js/galaxie.js und js/systeme.js.
// Bezugspunkt der Dichte: 80 Systeme auf Radius 120. Daraus folgt ein
// typischer Nachbarabstand von rund 12 Einheiten, und GENAU DARAN hängt die
// Eichung des Zeitmaßstabs (1 Einheit ~ 0,4 Lj, siehe ZEIT weiter oben).
const DICHTE_SYSTEME = 80;
const DICHTE_RADIUS = 120;

export const GALAXIE_REGELN = {
  anzahlSysteme: 500,

  // Der Streuradius wird GERECHNET, nicht gesetzt -- und das ist der
  // eigentliche Punkt: die Sternendichte muss konstant bleiben, egal wie groß
  // die Galaxie ist.
  //
  // Als die Systemzahl von 80 auf 500 stieg, stand hier zuerst eine von Hand
  // eingetragene 300. Richtig gerechnet, aber als Zahl konnte sie beim
  // nächsten Mal wieder vergessen werden -- und dann stünden die Sterne
  // dichter, der Nachbarabstand fiele, und aus 12-facher
  // Lichtgeschwindigkeit würde stillschweigend 30-fache. Als Ableitung kann
  // das nicht mehr passieren: wer `anzahlSysteme` ändert, ändert den Radius
  // automatisch mit.
  get radius() {
    return Math.round(DICHTE_RADIUS * Math.sqrt(this.anzahlSysteme / DICHTE_SYSTEME));
  },
  // Wie viele Systeme eine Schlüsseltechnologie hergeben -- gestaffelt nach
  // Tiefenstufe im Forschungsbaum. Flache Schlüssel liegen häufig herum,
  // tiefe sind selten. Reine Stellschraube.
  schluesselHaeufigkeit: { 1: 6, 2: 3, 3: 1 },
  standardHaeufigkeit: 2,
};

// Reichweite: gemessen ab der NÄCHSTGELEGENEN eigenen Basis. Außenposten
// verschieben damit den Messpunkt -- Nähe zu eigenem Besitz wird dadurch
// von selbst Teil des Spiels.
export const REICHWEITE = {
  basis: 30,
  proAntriebsstufe: 22,
};

// Zwei Wege, Fuß zu fassen -- bewusst als Entscheidung, nicht als Reihenfolge:
// der Außenposten ist billige Reichweite, die Kolonie teure Produktion.
export const AUSSENPOSTEN = {
  kosten: { metall: 1500, silizium: 900 },
  dauerProEntfernungSek: 20,
  grunddauerSek: 60,
};

export const KOLONIE = {
  kosten: { metall: 4000, silizium: 2500 },
  dauerProEntfernungSek: 40,
  grunddauerSek: 180,
  // KEIN Startvorrat mehr (A-132/R-23, Tobi wörtlich: „ja der Startvorrat
  // kommt raus"). Eine frisch gegründete Kolonie hat ausschließlich das, was
  // der Spieler mit dem Kolonieschiff mitgeschickt hat -- die Ladung wird
  // beim Gründen ins Lager der neuen Welt gebucht (siehe stuetzpunktGruenden).
};

// Ressourcentransport zwischen eigenen Planeten. Noch ohne Schiffe/Kapazität
// -- die kommen mit dem Flottensystem; die Laufzeit hängt schon an der Strecke.
export const TRANSPORT = {
  grunddauerSek: 30,
  dauerProEntfernungSek: 25,
};

// --- Schiffe --------------------------------------------------------------
// Gebaut wird in der Werft. Missionen binden Schiffe, statt nur Ressourcen zu
// kosten. "verbraucht" heißt: das Schiff kommt nicht zurück (Sonde verglüht,
// Kolonieschiff wird zur Kolonie). Alle anderen fliegen zurück und stehen
// solange nicht zur Verfügung -- eine Flotte unterwegs ist eine Festlegung.
// hp: wie viel ein einzelnes Schiff dieses Typs aushält, bevor es zerstört
// wird. angriff: Schaden pro Kampfrunde. 0 heißt unbewaffnet -- aber auch
// unbewaffnete Schiffe stehen im Verband mit im Feuer (siehe simulation.js
// gefechtAufloesen), Zivilschiffe im Kampf mitzunehmen ist ein echtes Risiko.
// : ab welcher Werftstufe dieser Typ gebaut werden kann (A-027).
//
// TOBIS ANSAGE (17.08.): "Werft level entscheidet was fuer Schiffe man bauen
// kann." Bis dahin brachte jede Stufe nur +25 % Tempo -- der Ausbau war keine
// Entscheidung, sondern eine Zahl. Jetzt aendert er, WORUEBER entschieden wird
// (Prinzip 12), und zwar an derselben Sorte Moment, die Tobi an der
// Werft-Freischaltung selbst gelobt hat, nur eine Ebene tiefer.
//
// Die Staffelung folgt dem Anspruch der Schiffe, nicht ihrem Preis: Sonde und
// Frachter sind Blech mit Tank (1), der Erkunder traegt Menschen (2),
// Forschungs- und Kriegsschiff brauchen Spezialausruestung (3), das
// Kolonieschiff ist eine fliegende Stadtgruendung (4).
export const SCHIFFE = {
  sonde: {
    id: "sonde",
    werftAb: 1,
    name: "Sonde",
    beschreibung:
      "Billige Einwegsonde. Deckt einfache Ziele auf. Sie kehrt nicht zurück, weil Abbremsen genauso viel Treibstoff kostet wie Beschleunigen – eine Sonde, die heimkommen soll, ist ein ganz anderes Schiff.",
    kosten: { metall: 40, silizium: 20, elektronik: 5 },
    bauzeitSek: 25,
    verbraucht: true,
    tempo: 1,
    kapazitaet: 0,
    verbrauchProStrecke: 2,
    tank: 400,
    hp: 5,
    angriff: 0,
  },
  erkunder: {
    id: "erkunder",
    werftAb: 2,
    name: "Erkunder",
    beschreibung: "Bemanntes Aufklärungsschiff. Nötig für komplexe Ziele – Anomalien, Strukturen, Gefahren.",
    kosten: { metall: 500, silizium: 350, elektronik: 70 },
    bauzeitSek: 200,
    verbraucht: false,
    tempo: 1.3,
    kapazitaet: 0,
    tank: 750,
    verbrauchProStrecke: 5,
    hp: 40,
    angriff: 0,
  },
  forschungsschiff: {
    id: "forschungsschiff",
    werftAb: 3,
    name: "Forschungsschiff",
    beschreibung: "Wertet Anomalien aus. Ohne Forschungsmission gibt eine Anomalie ihre Technologie nicht her.",
    kosten: { metall: 800, silizium: 800, elektronik: 180 },
    bauzeitSek: 320,
    verbraucht: false,
    tempo: 0.9,
    tank: 800,
    kapazitaet: 0,
    verbrauchProStrecke: 8,
    hp: 30,
    angriff: 0,
  },
  frachter: {
    id: "frachter",
    werftAb: 1,
    name: "Frachter",
    beschreibung: "Bringt Bergungsgut und Ressourcen nach Hause. Große Funde brauchen mehrere Fahrten.",
    kosten: { metall: 700, silizium: 300, elektronik: 90 },
    bauzeitSek: 240,
    verbraucht: false,
    tank: 720,
    tempo: 0.7,
    kapazitaet: 4000,
    verbrauchProStrecke: 12,
    hp: 60,
    angriff: 0,
  },
  kolonieschiff: {
    id: "kolonieschiff",
    werftAb: 4,
    name: "Kolonieschiff",
    beschreibung:
      "Gründet eine vollwertige Kolonie. Braucht eigene Kolonisten an Bord, die der Spieler selbst belädt, und wird beim Gründen verbraucht.",
    // WIE VIELE MENSCHEN HÖCHSTENS MITFLIEGEN (A-043, Tobis Entscheidung:
    // „Colony schiffe kosten keine Bevölkerung sollten sie aber" --
    // A-132/R-23: „erstmal eigener Lagerraum für Kolonisten … Nichts davon
    // wird Automatisch aufgefüllt, der User muss selbst entscheiden was gut
    // ist"). Bis A-132 war das ein FESTWERT, den jede Koloniemission
    // automatisch verbrauchte -- seither ist es die OBERGRENZE eines eigenen
    // Kolonistenraums (siedlerKapazitaet, siehe flotteSiedlerKapazitaet),
    // den der Spieler wie Fracht selbst befüllt. Die Herleitung der Zahl
    // bleibt dieselbe:
    //
    // Die Zahl steht zwischen zwei Grenzen, beide gemessen:
    //  - NACH OBEN durch den Wohnraum der neuen Welt. Ein Wohnmodul der Stufe
    //    0 fasst 50.000 Menschen (RESSOURCEN.bevoelkerung.speicher.basis) --
    //    mehr Siedler als das wären beim ersten Atemzug schon obdachlos.
    //  - NACH UNTEN durch die Heimatwelt. Beim Erreichen der nötigen Werft
    //    (Stufe 4, nach 24 bis 48 h) hat sie 350.000 bis 700.000 Menschen;
    //    unter etwa 5 % wäre der Abgang keine Entscheidung, sondern eine
    //    Formalität.
    //
    // 800 × MASSSTAB = 40.000: vier Fünftel des neuen Wohnraums (die Kolonie
    // braucht sofort ein zweites Wohnmodul) und rund ein Zehntel der
    // Heimatwelt. Zum Vergleich: eine abtrünnige Fraktion nimmt 400 mit
    // (PIRAT.gruendung.bevoelkerung) -- ein Kolonieschiff ist der doppelte
    // Aufbruch, und er kostet auch das Doppelte.
    siedlerKapazitaet: 800,
    kosten: { metall: 3500, silizium: 2200, elektronik: 400 },
    bauzeitSek: 420,
    tank: 2000,
    verbraucht: true,
    tempo: 0.6,
    // A-132: ein gemeinsamer Frachtraum wie bei jedem anderen Schiff, statt
    // 0 (bis dahin hatte das Kolonieschiff KEINEN Frachtraum -- R-23s
    // Auslöser: "Kolonieschiffe haben keinen frachtraum … können also keine
    // … Nahrung [mitnehmen]"). Herleitung: der halbe Frachter (4000) -- das
    // Schiff ist kein Transporter, sein Massebudget steckt in der
    // Kolonistensektion; was übrig bleibt, ist eine Starthilfe, kein
    // Versorgungszug. Zählt NICHT gegen siedlerKapazitaet (eigener Raum,
    // siehe oben) -- die bestehenden Regeln (flotteKapazitaet,
    // frachtraumFrei, treibstoffImFrachtraum, Frachttechnik) greifen ohne
    // Sonderbehandlung.
    kapazitaet: 2000,
    verbrauchProStrecke: 20,
    hp: 50,
    angriff: 0,
  },
  kriegsschiff: {
    id: "kriegsschiff",
    werftAb: 3,
    name: "Kriegsschiff",
    beschreibung:
      "Bewaffnetes Schiff. Einziger Schiffstyp, der Gefahren-Objekte angreifen kann. Verstecken kann es sich nicht: jedes Schiff strahlt seine Abwärme gegen einen drei Grad über dem absoluten Nullpunkt kalten Hintergrund ab. Wer im System ist, ist sichtbar.",
    kosten: { metall: 900, silizium: 500, elektronik: 140 },
    tank: 600,
    bauzeitSek: 280,
    verbraucht: false,
    tempo: 1.0,
    kapazitaet: 0,
    verbrauchProStrecke: 10,
    hp: 80,
    angriff: 25,
  },
};

// Flottenregeln. Eine Strecke wird in Galaxie-Einheiten gemessen; Bewegung
// innerhalb eines Systems zählt nur anteilig.
export const FLOTTE = {
  orbitAnteil: 0.1, // Orbitabstand -> Galaxie-Einheiten
  mindestVerbrauch: 1,
};

// Was braucht ein Objekttyp, um aufgedeckt bzw. aufgeschlossen zu werden?
// Rein datengetrieben: eine neue Objektart bekommt hier eine Zeile, keine
// Sonderlogik im Code.
export const OBJEKT_REGELN = {
  heimat: { aufdeckung: null, zugriff: null },
  leer: { aufdeckung: "sonde", zugriff: null },
  // Planeten sind normalerweise nicht bergbar. Riesenplaneten tragen aber
  // einen Antimaterie-Ertrag (siehe ANTIMATERIE_ERNTE) -- missionFuerObjekt
  // bietet die Bergung deshalb nur an, wenn tatsächlich ein Ertrag daliegt.
  planet: { aufdeckung: "sonde", zugriff: "bergung" },
  asteroiden: { aufdeckung: "sonde", zugriff: "bergung" },
  wrack: { aufdeckung: "sonde", zugriff: "bergung" },
  anomalie: { aufdeckung: "erkunder", zugriff: "forschung" },
  struktur: { aufdeckung: "erkunder", zugriff: "bergung" },
  gefahr: { aufdeckung: "erkunder", zugriff: "militaer" },
};

// Welches Schiff erfüllt welche Missionsart?
export const MISSIONS_SCHIFF = {
  sonde: "sonde",
  erkundung: "erkunder",
  forschung: "forschungsschiff",
  bergung: "frachter",
  transport: "frachter",
  kolonie: "kolonieschiff",
  militaer: "kriegsschiff",
};

// --- Kampf ------------------------------------------------------------
// Instant bei Ankunft aufgelöst (wie jede andere Mission), intern aber als
// kurze Rundenfolge gerechnet -- kein Zufall darüber, WER stirbt (immer die
// schwächsten Schiffe zuerst), aber eine leichte Schwankung im Schaden pro
// Runde für etwas Spannung.
//
// Einziger Ort im Spiel, an dem im laufenden Betrieb gewürfelt wird -- seit
// v0.39 aber aus dem Weltseed statt aus Math.random (siehe kampfSaatZiehen in
// simulation.js). Gebraucht wurde das, damit tests/weltlauf.mjs wiederholbar
// ist; nebenbei kann ein neu geladener Spielstand einen verlorenen Kampf nicht
// mehr anders ausgehen lassen.
export const KAMPF = {
  // Ab welcher Beziehung eine Fraktion die Flotte einer anderen ueberfaellt.
  // Damit ist "wen greife ich an" eine Frage der Beziehung statt einer
  // Verzweigung nach Fraktionsart.
  beutezugAb: -20,
  maxRunden: 5,
  schadensSchwankung: 0.1, // ±10% pro Runde
  // Rückzug: Standardschwelle, ab der eine Flotte ohne explizite Angabe
  // abbricht (eigene verbleibende Stärke in Prozent der Startstärke).
  standardRueckzugsSchwelle: 0.5,
  // Jede Runde läuft über echte Zeit statt in einem Tick durchgerechnet zu
  // werden -- dadurch kann während eines Gefechts etwas Drittes passieren
  // (Verstärkung eintreffen, Rückzugsregel ändern), was bei einem
  // Ein-Tick-Ergebnis strukturell unmöglich wäre.
  rundenDauerSek: 180,
};

// Reparatur/Recycling für beschädigte (aber nicht zerstörte) Schiffsgruppen.
// Beschädigt heißt hier: die Gruppe hat Schaden angesammelt, aber noch nicht
// genug, um ein ganzes Schiff zu verlieren (siehe simulation.js schiffSchaden).
export const REPARATUR = {
  // Anteil der ursprünglichen Baukosten je vollständig "verlorener" HP-Menge.
  kostenFaktor: 0.5,
  zeitFaktor: 0.5,
  // Recycling zahlt sofort aus, aber weniger als eine Reparatur kosten würde --
  // ein echter Kompromiss zwischen "sofort etwas zurück" und "voller Wert".
  recycleFaktor: 0.35,
};

// --- Bauwarteschlange ---------------------------------------------------
// Harte Obergrenze, damit die Liste übersichtlich bleibt -- reine
// Balancing-/UI-Stellschraube, kein strukturelles Limit.
export const BAUWARTESCHLANGE_MAX = 10;

// --- Logistiknetz -----------------------------------------------------
// Automatischer Ausgleich konfigurierter Mindestbestände zwischen eigenen
// Planeten. Bewusst NICHT instant und NICHT unbegrenzt -- sonst würde die
// Spezialisierung, die der ganze Ressourcen-/Handel-Aufbau tragen soll,
// witzlos. Verzögerung: siehe flotten.js logistikVerzoegerungMs.
export const LOGISTIKNETZ = {
  // "Hoher Durchsatz", aber gedeckelt -- reine Balancing-Stellschraube.
  maxDurchsatzProTransfer: 3000,
};

// --- Sonden ---------------------------------------------------------------
export const SONDE = {
  kosten: { metall: 40, silizium: 20 },
  grundflugzeitSek: 30,
  flugzeitProSlotSek: 20,
  // Zuschlag je Entfernungseinheit zwischen Systemen.
  flugzeitProEntfernungSek: 12,
  kostenProEntfernung: 0.05,
};

// Wie viele Systeme geben eine bestimmte Schlüsseltechnologie her?
export function schluesselHaeufigkeit(forschungId) {
  const stufe = techStufe(forschungId);
  return GALAXIE_REGELN.schluesselHaeufigkeit[stufe] ?? GALAXIE_REGELN.standardHaeufigkeit;
}

// --- Kosten & Zeiten ------------------------------------------------------
// Arbeiten generisch über alle Ressourcen in baseCost.
// `baseCostAbLevel` (A-009): einzelne Kostenposten dürfen erst ab einer Stufe
// anfallen. Gebraucht für Gebäude, die ihre EIGENE Ware kosten -- die erste
// Stufe muss ohne sie zu bauen sein, sonst ist die Kette nie zu starten.
// Bewusst als Daten am Gebäude und nicht als Sonderfall im Code (Prinzip 5).
export function kostenFuerLevel(def, level) {
  const faktor = Math.pow(def.costFactor, level - 1);
  const kosten = {};
  for (const [resId, betrag] of Object.entries(def.baseCost)) {
    const abLevel = def.baseCostAbLevel && def.baseCostAbLevel[resId];
    if (abLevel && level < abLevel) continue;
    kosten[resId] = Math.round(betrag * faktor);
  }
  return kosten;
}

export function bauzeitFuerLevel(def, level) {
  const kosten = kostenFuerLevel(def, level);
  const summe = Object.values(kosten).reduce((a, b) => a + b, 0);
  return Math.max(3, Math.round(summe / def.buildTimeDivisor));
}

// Wie viele Forschungseinheiten eine Technologiestufe verlangt.
//
// baseCost trägt in der RESEARCH-Tabelle seit v0.6 keine Zahlung mehr, sondern
// nur noch das GEWICHT einer Technologie -- die Zahlen sind absichtlich stehen
// geblieben, weil sie das über Jahre austarierte Verhältnis der Technologien
// zueinander enthalten. Der Umweg über bauzeitFuerLevel hält den Aufwand
// maßstabsfrei (Kosten und Divisor tragen beide MASSSTAB und kürzen sich);
// die Umrechnung in Forschungseinheiten holt ihn bewusst wieder hinein.
export function forschungsAufwand(def, level) {
  return Math.round(bauzeitFuerLevel(def, level) * FORSCHUNG.einheitenProSekunde);
}

// --- Maßstab --------------------------------------------------------------
// Alle Mengenangaben oben sind in "kleinen" Einheiten notiert, damit die
// Tabellen lesbar bleiben. MASSSTAB rechnet sie einmalig beim Laden auf
// planetare Größenordnungen hoch: Tonnen im Tausenderbereich zu Beginn,
// Millionen im späteren Verlauf (dorthin trägt die Kostenkurve von selbst).
//
// WICHTIG: Der Maßstab ist bewusst NEUTRAL fürs Spielgefühl. Er multipliziert
// ausschließlich Mengen -- niemals Faktoren, Zeiten, Preise pro Stück oder
// Lagergewichte. Skaliert man alles gleichmäßig, bleiben sämtliche
// Verhältnisse und damit das gesamte Pacing unverändert. Genau das ist auch
// die Probe, ob hier eine Tabelle vergessen wurde: verschiebt sich das
// Pacing nach einer Maßstabsänderung, fehlt irgendwo eine Multiplikation.

const skaliereBuendel = (b) => {
  if (!b) return;
  for (const k of Object.keys(b)) b[k] = Math.round(b[k] * MASSSTAB);
};
const skaliereRaten = (spezifikation) => {
  if (!spezifikation) return;
  for (const spec of Object.values(spezifikation)) spec.basis = Math.round(spec.basis * MASSSTAB);
};

// ALLE Ratenfelder einer Gebäudedefinition -- also jedes Feld, das `rate(spec,
// level)` liest und damit eine MENGE trägt. Sie stehen als LISTE und nicht als
// drei Aufrufe da, und das ist der eigentliche Inhalt von A-069:
//
// Diese Falle hat neunmal zugeschlagen (`tank`, `siedler`, Piratenmengen,
// Gründungsschwellen, Forschungsaufwand …), zuletzt an `brennstoff` aus
// A-055. Ein Kraftwerk der Stufe 15 verbrannte dadurch 188 statt 9.400 t je
// Echtzeitstunde, und eine Tonne Deuterium war im Reaktor bis zum
// Vierzigtausendfachen dessen wert, was ihre Förderung kostete -- gemessen im
// A-063-Ergebnis, an dem die Deuterium-Anreicherung deshalb gescheitert ist.
//
// Die Liste ist die EINE Wahrheit: die Skalierung unten läuft über sie, und
// `tests/massstab.test.js` sucht in den Gebäudedaten nach Feldern, die wie
// Raten aussehen, und schlägt an, wenn eines NICHT hier steht. Ein zehnter
// Fall ist damit nicht unwahrscheinlich, sondern rot.
//
// Pfade mit Punkt sind erlaubt (`anreicherung.produktion`), damit auch ein
// Ratenfeld in einem Unterobjekt erfasst wird.
export const RATEN_FELDER = [
  "produktion",
  "verbrauch",
  "brennstoff",
  // A-071: Der zweite Betriebsmodus trägt eigene Raten, und sie sind Mengen
  // wie alle anderen. Genau dafür kennt die Liste Punktpfade -- ohne diese
  // zwei Zeilen wäre die Anreicherung der zehnte Fall gewesen, und der
  // Wächter-Test hätte ihn gemeldet.
  "anreicherung.produktion",
  "anreicherung.verbrauch",
];

const feldAn = (objekt, pfad) =>
  pfad.split(".").reduce((o, schluessel) => (o ? o[schluessel] : undefined), objekt);

// Bauzeit leitet sich aus der KOSTENSUMME ab (bauzeitFuerLevel). Wachsen die
// Kosten mit dem Maßstab, muss der Divisor mitwachsen -- sonst dauert alles
// um den Maßstabsfaktor länger. Genau das ist bei der ersten Fassung
// passiert und hat das Pacing verschoben.
for (const def of Object.values(BUILDINGS)) {
  skaliereBuendel(def.baseCost);
  for (const feld of RATEN_FELDER) skaliereRaten(feldAn(def, feld));
  def.buildTimeDivisor *= MASSSTAB;
}
for (const def of Object.values(RESEARCH)) {
  skaliereBuendel(def.baseCost);
  def.buildTimeDivisor *= MASSSTAB;
}
for (const def of Object.values(SCHIFFE)) {
  skaliereBuendel(def.kosten);
  // `tank` ist eine MENGE wie der Verbrauch -- beide müssen denselben Maßstab
  // tragen, sonst wäre die Reichweite um Faktor 50 falsch. Siebter Fall
  // dieser Falle im Projekt.
  // `siedlerKapazitaet` ist eine PERSONENZAHL und damit eine Menge wie jede
  // andere (A-043, seit A-132 der Name des Felds) -- unskaliert fasste ein
  // Kolonieschiff 800 statt 40.000 Menschen und die neue Welt startete
  // praktisch leer. Achter Fall dieser Falle.
  for (const feld of ["kapazitaet", "verbrauchProStrecke", "tank", "hp", "angriff", "siedlerKapazitaet"]) {
    if (def[feld]) def[feld] = Math.round(def[feld] * MASSSTAB);
  }
}
for (const def of Object.values(RESSOURCEN)) {
  if (def.start) def.start = Math.round(def.start * MASSSTAB);
  // Eigene Speicherkapazität ist eine MENGE und muss denselben Maßstab
  // tragen wie der Startbestand -- sonst stünde die Bevölkerung sofort weit
  // über ihrem Wohnraum.
  if (def.speicher) def.speicher.basis = Math.round(def.speicher.basis * MASSSTAB);
}
// BevölkerungsMENGEN folgen demselben Maßstab (bevoelkerungAb unten). Die
// Wachstums-RATE dagegen ist ein Prozentsatz und maßstabsfrei -- 3 % von
// 50.000 sind 3 % von 2.500.000, MASSSTAB kürzt sich heraus. (Bis A-117 stand
// hier `BEVOELKERUNG.proSchritt = Math.round(BEVOELKERUNG.proSchritt *
// MASSSTAB)` -- eine skalierte FESTE Menge; die proportionale Rate braucht
// diese Zeile nicht mehr, siehe `bevoelkerungsSchrittFaktor` oben.)
for (const def of Object.values(BUILDINGS)) {
  if (def.bevoelkerungAb) def.bevoelkerungAb = Math.round(def.bevoelkerungAb * MASSSTAB);
}
for (const eintrag of VORKOMMEN_TABELLE) {
  eintrag.menge.min = Math.round(eintrag.menge.min * MASSSTAB);
  eintrag.menge.max = Math.round(eintrag.menge.max * MASSSTAB);
}
skaliereBuendel(AUSSENPOSTEN.kosten);
skaliereBuendel(KOLONIE.kosten);
skaliereBuendel(SONDE.kosten);
FLOTTE.mindestVerbrauch = Math.round(FLOTTE.mindestVerbrauch * MASSSTAB);
// Piratenmengen sind MENGEN und tragen denselben Massstab wie alles andere.
// Ohne das waeren ihre Schiffe rund fuenfzigmal zu billig -- ein einziges
// Wrack finanzierte eine ganze Flotte. Gefunden im Weltlauf.
for (const feld of ["schiffKosten", "frachtKosten", "startVorrat"]) {
  for (const k of Object.keys(PIRAT[feld])) PIRAT[feld][k] = Math.round(PIRAT[feld][k] * MASSSTAB);
}
PIRAT.mindestBeute = Math.round(PIRAT.mindestBeute * MASSSTAB);
// Bagatellgrenze fuer Ueberreste (A-022) -- eine MENGE, also mit Massstab.
export const REST_BAGATELLE_SKALIERT = Math.round(REST_BAGATELLE * MASSSTAB);
// Auch die Gruendungsschwellen sind MENGEN. Unskaliert qualifizierte sich
// sofort jede Startwelt -- vierter Fall dieser Falle im Projekt.
// Auch die Kolonieschwelle der Bots ist eine MENGE -- fünfter Fall dieser
// Falle im Projekt, deshalb steht sie direkt neben den anderen.
BOT.startKasse = Math.round(BOT.startKasse * MASSSTAB);
BOT.kolonie.abBevoelkerung = Math.round(BOT.kolonie.abBevoelkerung * MASSSTAB);
BOT.kolonie.tritium = Math.round(BOT.kolonie.tritium * MASSSTAB);
skaliereBuendel(BOT.kolonie.startmaterial);
PIRAT.gruendung.bevoelkerung = Math.round(PIRAT.gruendung.bevoelkerung * MASSSTAB);
PIRAT.gruendung.abBevoelkerung = Math.round(PIRAT.gruendung.abBevoelkerung * MASSSTAB);
for (const k of Object.keys(PIRAT.gruendung.mitgift)) {
  PIRAT.gruendung.mitgift[k] = Math.round(PIRAT.gruendung.mitgift[k] * MASSSTAB);
}
MARKT.los = Math.round(MARKT.los * MASSSTAB);
// Forschungseinheiten sind eine MENGE: die Laborproduktion oben trägt den
// Maßstab (skaliereRaten), also muss der Aufwand ihn ebenfalls tragen. Sonst
// wäre jede Technologie fünfzigmal zu billig.
FORSCHUNG.einheitenProSekunde *= MASSSTAB;
LOGISTIKNETZ.maxDurchsatzProTransfer = Math.round(LOGISTIKNETZ.maxDurchsatzProTransfer * MASSSTAB);

// Erträge der Weltobjekte liegen als Bereiche in welt.js. Sie werden über
// diesen Helfer skaliert, damit auch dort nur EINE Zahl regiert.
export function mengeSkaliert(n) {
  return Math.round(n * MASSSTAB);
}
