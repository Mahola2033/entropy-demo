// Spielzustand.
//
// Wirtschaft ist PRO PLANET: jeder Planet hat eigenes Lager, eigene Gebäude
// und eine eigene Bauschleife. Forschung ist dagegen imperiumsweit.
// Das ist auf zweistellige Planetenzahlen ausgelegt -- nichts hier darf
// annehmen, dass es genau einen Planeten gibt.
//
// Planetenarten:
//   heimat        - Startplanet, volle Wirtschaft
//   kolonie       - vollwertig, eigene Wirtschaft
//   aussenposten  - reiner Brückenkopf: zählt für Reichweite, keine Wirtschaft

import {
  BUILDINGS,
  RESEARCH,
  RESSOURCEN,
  BEVOELKERUNG,
  GELD,
  affinitaetVon,
  PLANETEN_KLASSEN,
  WASSER_STUFEN,
  SCHWERKRAFT,
  SCHIFFE,
  LAGER_RESSOURCEN,
  FLUSS_RESSOURCEN,
  REICHWEITE,
  START,
  FRAKTIONS_ARTEN,
  SPIELER_FRAKTION,
  HEIMATWELT_NAMEN,
  BEZIEHUNG,
  SUPERNOVA,
  LJ_PRO_EINHEIT,
  ZEIT,
  spieltage,
  supernovaFlutJahre,
  jahreInMs,
  lagerkapazitaet,
  rate,
  verbrauchAb,
  verbrauchLaeuft,
  kostenFuerLevel,
  bauzeitFuerLevel,
  voraussetzungenErfuellt,
  solarLageFaktor,
  bevoelkerungsSchrittFaktor,
  FOSSIL,
  FOSSIL_VORRAT_BASIS,
  ARBEITSKRAFT_LEERLAUF,
  DROSSELUNG,
} from "./data.js";
import { stromFuer, waehle } from "./zufall.js";
import { systemGenerieren } from "./welt.js";
// A-082: eigener Zufallsstrom für den Heimatweltnamen. Die Kennung ist eine
// beliebige feste Zahl -- wichtig ist nur, dass sie keiner Systemkennung in
// die Quere kommt und sich nie wieder ändert (sonst hieße jede bestehende
// Partie beim nächsten Laden anders).
const HEIMATWELT_NAMEN_KENNUNG = 900001;
import { galaxiePlanen, entfernung, schluesselImSystem } from "./galaxie.js";
import { skalieren } from "./ressourcen.js";
import { t } from "./sprache.js";

// v0.28: Sterntypen verschieben die Orbitzonen -- dieselbe Saat erzeugt jetzt
// andere Planeten. Ein alter Spielstand trüge Fortschritt zu Orbits, in denen
// inzwischen etwas anderes steht. Gleiche Lage wie beim Orbit-Umbau in v0.23.
// v0.33: Fraktionen. Planeten und Flotten tragen ein `fraktion`-Feld, der
// Spielstand haelt die Fraktionsliste. Alte Staende haetten weder das eine
// noch das andere -- lesbar waeren sie zwar (die Zugriffe fallen auf den
// Spieler zurueck), aber ohne Fraktionsliste braeche jede Beziehungsabfrage.
// v0.42: Die Heimatwelt ist ein echter Planet mit Klasse, Zone, Wasser und
// eigener Schwerkraft statt eines eigenschaftslosen Generalisten. Damit ändert
// sich die Weltgenerierung -- ein alter Stand trüge Fortschritt zu einer Welt,
// die es so nicht mehr gibt.
// v0.4.1->0.4.2 (A-141): 31 -> 32 ist die erste Version, die NICHTS am
// Format ändert -- reiner Testfall für die neue Migrationskette
// (js/save.js, MIGRATIONEN). Ein Stand mit Version 31 wird seither
// ANGEHOBEN statt verworfen; erst ein Stand ohne passendes Kettenglied
// fällt weiter auf den alten Abweis-Weg zurück.
// 32 -> 33 (A-164, die Maßstabsrunde, 31.08.2026): der erste Sammel-Sprung
// mit echtem Inhalt -- Bestände und Kapazitäten aller Lagerressourcen
// tragen den neuen MASSSTAB nach (×2.500), Bevölkerung zusätzlich den
// MENSCHEN_FAKTOR (×24). Gebäudestufen bleiben unverändert. Siehe
// js/save.js MIGRATIONEN[32].
// 33 -> 34 (A-196, 04.09.2026): FOSSIL_VORRAT_BASIS folgt seit dieser Runde
// der Startstufe 17 statt Stufe 1 (Faktor 159,08) -- der gespeicherte Rest
// jeder laufenden Partie war gegen die alte, zu kleine Basis verbucht und
// praktisch überall bei 0. Jeder Planet bekommt seinen fossilVorrat deshalb
// VOLL aufgefüllt, nicht anteilig (ein Anteil von 0 wäre wieder 0). Siehe
// js/save.js MIGRATIONEN[33].
export const SAVE_VERSION = 34;

function startRessourcen(voll) {
  const res = {};
  for (const resId of LAGER_RESSOURCEN) {
    res[resId] = voll ? RESSOURCEN[resId].start || 0 : 0;
  }
  // Fluss-Ressourcen mit eigenem Speicher haben ebenfalls einen Bestand
  // (Energie: die Batterie). Sie gehören NICHT in LAGER_RESSOURCEN -- das
  // steuert Verarbeitungsketten, Fracht und Handel, und Strom ist keines
  // davon. Der Bestand beginnt immer bei null: eine geladene Batterie zum
  // Start wäre ein Geschenk, und die erste Werft soll ein Meilenstein bleiben.
  for (const resId of FLUSS_RESSOURCEN) {
    if (RESSOURCEN[resId].speicher) res[resId] = 0;
  }
  return res;
}

// A-164: die Heimatwelt (Spieler UND jeder Bot, siehe neuerPlanet unten --
// beide übergeben typ: "heimat") startet mit den Stufen aus
// START.startstufenHeimatwelt statt bei null, jede Kolonie bleibt leer.
function startGebaeude(typ) {
  const g = {};
  for (const id of Object.keys(BUILDINGS)) g[id] = 0;
  if (typ === "heimat") Object.assign(g, START.startstufenHeimatwelt);
  return g;
}

function startSchiffe() {
  const s = {};
  for (const id of Object.keys(SCHIFFE)) s[id] = 0;
  return s;
}

function startForschung() {
  const f = {};
  for (const id of Object.keys(RESEARCH)) f[id] = 0;
  return f;
}

export function neuerPlanet({ id, systemId, orbit, name, typ, groesse = 150, startvorrat = false, art = null, klasse = null, zone = null, wasser = null, schwerkraft = 1, fraktion = SPIELER_FRAKTION }) {
  return {
    id,
    systemId,
    orbit,
    name,
    typ,
    // Wem gehört dieser Stützpunkt? Vorgabe ist der Spieler -- er war bis
    // v0.32 der einzige Akteur mit Planeten.
    fraktion,
    // Planetenart aus der Weltgenerierung ("Vulkanwelt", ...). Bestimmt über
    // PLANETEN_AFFINITAET, was dieser Ort hergibt. null = Heimatwelt, die
    // bewusst Generalist ist (der Start darf nicht am Würfel hängen).
    art,
    // Die drei Achsen des Planetenmodells (v0.24). Aus ihnen leitet sich die
    // Affinität ab -- Terraforming verändert später Zone und Wasser.
    klasse,
    zone,
    wasser,
    schwerkraft,
    groesse,
    ressourcen: typ === "aussenposten" ? {} : startRessourcen(startvorrat),
    gebaeude: typ === "aussenposten" ? {} : startGebaeude(typ),
    // Fossiler Vorrat der Fossilanlage (A-147, Tonnen) -- KEINE
    // Lager-Ressource (Tobi, 23.08.: "Aber in dem Fall erstmal nicht"),
    // deshalb ein eigenes Feld statt eines RESSOURCEN-Eintrags. Ein
    // Außenposten hat keine Wirtschaft und keine Anlage, die ihn verbrennen
    // könnte -- 0 ist hier keine Sonderregel, nur konsequent.
    //
    // A-171: die Rechnung selbst steht jetzt einmal in `vollerFossilVorrat`
    // (weiter unten) -- geteilt mit `fossilVorratVon`, das dieselbe Zahl als
    // Vorgabe für Spielstände liefert, denen dieses Feld fehlt (vor A-147).
    // Zwei Fassungen derselben Rechnung wären die Fehlerklasse, die der
    // ANREICHERUNG_VERLUST-Kommentar in data.js schon namentlich führt.
    fossilVorrat: vollerFossilVorrat({ typ, klasse, zone, wasser }),
    // Schiffe stehen dort, wo sie gebaut wurden bzw. wohin sie zurückkehren.
    schiffe: typ === "aussenposten" ? {} : startSchiffe(),
    // Gekaufte Ware: gehört dem Spieler, liegt aber am Markt, bis eine Flotte
    // sie abholt. Bewusst getrennt vom normalen Lager (unbegrenzt -- ist
    // bereits bezahlt, keine Lagerobergrenze nötig).
    marktlager: {},
    // Optionale Annahmeregeln je Ressource: { resId: maxMenge }. Ohne
    // Eintrag gilt keine individuelle Grenze, nur die gemeinsame
    // Lagerkapazität. Wichtig für spätere Automatisierung (Routen sollen
    // wissen dürfen, was ein Zielplanet überhaupt annehmen soll).
    lagerRegeln: {},
    // Logistiknetz: { resId: mindestMenge }. Fällt der Bestand darunter,
    // wird automatisch von einem anderen eigenen Planeten aufgefüllt (mit
    // Verzögerung, siehe simulation.js logistiknetzPruefen). Ohne Eintrag
    // ist die Ressource vom Netz ausgenommen.
    logistikMindestbestand: {},
    // Verarbeitungsketten: { resId: mindestBestand }. So weit darf eine Kette
    // den Bestand höchstens abbauen -- darunter drosselt sie auf den Zustrom.
    // Gleiche Rolle wie modus:'ueberschuss' bei den Routen: schützt Material,
    // das man zum Bauen zurücklegen will. Ohne Eintrag: keine Reserve.
    verarbeitungsReserve: {},
    // Planetare Affinität: { resId: faktor } auf die Förderung. Haken für
    // spezielle Planetenarten/Terraforming -- ohne Eintrag ändert sich nichts.
    affinitaet: {},
    // Zeitpunkt des nächsten Bevölkerungsschritts. 0 heißt "noch nicht
    // eingeplant" und wird beim ersten Vorspulen gesetzt -- neuerPlanet kennt
    // die Spielzeit nicht und soll sie auch nicht kennen müssen.
    naechstesWachstum: 0,
    bauQueue: null, // { gebaeudeId, zielLevel, startZeit, fertigZeit } -- der aktuell laufende Bau
    // Wartende Bauaufträge dahinter: [{ gebaeudeId, zielLevel, dauerSek }].
    // Kosten sind beim Einreihen bereits abgezogen (wie überall im Spiel --
    // Fracht, Logistiknetz), damit ein eingereihter Bau garantiert
    // stattfindet statt später an fehlenden Ressourcen zu scheitern.
    // Obergrenze BAUWARTESCHLANGE_MAX zählt inklusive laufendem Bau.
    bauWarteschlange: [],
    werftQueue: null, // { schiffId, anzahl, fertigZeit } -- eigene Schleife neben dem Bau
    // Wartende Schiffsaufträge dahinter, gleiches Muster: [{ schiffId, anzahl, dauerSek }].
    werftWarteschlange: [],
  };
}

// Startzustand des Heimatsystems: deckt die ersten Planeten auf und stellt
// sicher, dass mindestens einer davon besiedelbar ist.
//
// Zweck ist eine ZUSICHERUNG, keine Bequemlichkeit: ohne sie hinge der
// Spielstart daran, ob die Weltgenerierung zufällig einen besiedelbaren
// Planeten in Sichtweite gelegt hat. Dieselbe Denkweise wie bei der
// galaxieweiten Deadlock-Freiheit -- durch Konstruktion garantieren statt
// auf Wahrscheinlichkeit hoffen.
function startsystemAufdecken(seed, galaxie, schwierigkeit) {
  const system = systemGenerieren(seed, galaxie.heimatSystem, {
    schluessel: schluesselImSystem(galaxie, galaxie.heimatSystem),
    istHeimat: true,
    schwierigkeit,
  });

  const planeten = system.objekte.filter((o) => o.typ === "planet");
  // Besiedelbare zuerst -- sie sind der Grund, warum überhaupt aufgedeckt wird.
  planeten.sort((a, b) => Number(b.daten.kolonisierbar) - Number(a.daten.kolonisierbar));
  const auswahl = planeten.slice(0, START.sichtbarePlaneten);

  const zustand = {};
  for (const objekt of auswahl) {
    zustand[objekt.orbit] = { entdeckt: true };
  }
  // Hat das Heimatsystem gar keinen besiedelbaren Planeten, wird einer dazu
  // gemacht. Der Override läuft über denselben Mechanismus wie entdeckt/
  // verwertet, ist also ganz normaler Spielstand-Inhalt.
  //
  // A-194: FLACH, nicht verschachtelt. `daten: {...}` wurde beim Lesen
  // verschluckt -- ORBIT_ZUSTAND_FELDER (js/systeme.js) lässt seit A-175 nur
  // flache Werte durch, "daten" stand nie darin. `kolonisierbarErzwungen`
  // ist die flache Zusicherung; holeSystem stellt sie auf
  // objekt.daten.kolonisierbar zu.
  if (auswahl.length && !auswahl.some((o) => o.daten.kolonisierbar)) {
    const ziel = auswahl[0];
    zustand[ziel.orbit] = { entdeckt: true, kolonisierbarErzwungen: true };
  }

  // Die Eigenschaften der Heimatwelt reisen mit: sie ist seit v0.42 ein echter
  // Planet mit Klasse, Zone und Wasser statt eines eigenschaftslosen
  // Generalisten (siehe heimatEigenschaften in welt.js).
  const heimat = system.objekte.find((o) => o.typ === "heimat");
  return {
    heimatOrbit: system.heimatOrbit,
    heimatDaten: (heimat && heimat.daten) || {},
    systemZustand: zustand,
  };
}

// `saat` ist optional und dient nur dem Wiederholen: wird sie angegeben,
// entsteht exakt dieselbe Galaxie wie beim letzten Mal. Das echte Spiel ruft
// ohne Argument auf und bekommt wie bisher eine frische Welt aus der Uhr.
// Gebraucht wird es von den Messwerkzeugen (tests/weltlauf.mjs): ein
// Balancing-Werkzeug, das bei jedem Aufruf eine andere Galaxie misst, kann
// eine Änderung nicht von der Streuung zwischen zwei Welten unterscheiden.
//
// `schwierigkeit` ist ebenfalls optional (A-190) -- ein Schlüssel aus
// STARTSCHWIERIGKEIT ("leicht"/"normal"/"schwer", js/data.js). Fehlt sie
// oder ist sie unbekannt, greift STARTSCHWIERIGKEIT_VORGABE ("normal") in
// welt.js. Wirkt NUR auf die Heimatwelt dieser neuen Partie, nirgends sonst.
export function neuesSpiel(saat, schwierigkeit) {
  const seed = (saat ?? Date.now()) >>> 0;
  // DIE UHR WIRD EINMAL GELESEN, und das ist keine Sparsamkeit.
  //
  // Vorher stand `Date.now()` an drei Stellen dieser Funktion: für
  // `letzterTick`, für den Supernova-Zeitplan und für `beginn`. Zwischen
  // ihnen vergeht Zeit -- meist null Millisekunden, manchmal eine. Genau die
  // eine hat den Datums-Test (A-005) sporadisch rot werden lassen: der Blitz
  // lag dann 239,999… statt 240 Jahre nach dem Beginn und landete im Jahr
  // 240 statt 241. Ein Fehler, der in zwei von drei Läufen unsichtbar ist.
  //
  // Dieselbe Regel wie bei den Ereigniszeiten: wer eine Zeitspanne aufspannt,
  // benutzt EINEN Zeitpunkt, nicht zwei Ablesungen derselben Uhr.
  const jetzt = Date.now();
  const galaxie = galaxiePlanen(seed);
  const start = startsystemAufdecken(seed, galaxie, schwierigkeit);

  const heimatwelt = neuerPlanet({
    id: 1,
    systemId: galaxie.heimatSystem,
    orbit: start.heimatOrbit,
    // Der EINZIGE Planetenname, der ein Wort ist -- alle späteren heißen nach
    // ihrem Orbit ("35-XII") und sind damit sprachlos.
    //
    // Bis v1.60 stand hier t("Heimatwelt"), und Tobis Befund dazu war kurz:
    // „Dein Planet Heimatwelt klingt nicht gut." Seit A-082 kommt der Name
    // aus HEIMATWELT_NAMEN und wird mit der SAAT gezogen -- dieselbe Saat,
    // dieselbe Welt, derselbe Name. Damit trägt auch die Demo-Partie
    // reproduzierbar ihren Namen, und ein Fehlerbericht
    // („auf Kestra stimmt X nicht") ist nachstellbar.
    //
    // Ein eigener Zufallsstrom mit fester Kennung, nicht der Weltstrom: sonst
    // hätte das Ziehen eines Namens jede Welt hinter ihm verschoben.
    //
    // Der Name geht NICHT durch t() -- er ist ein Eigenname. Ein
    // Sprachwechsel benennt einen bestehenden Planeten nicht um (dieselbe
    // Entscheidung wie beim Vorgabenamen einer Flotte).
    name: waehle(stromFuer(seed, HEIMATWELT_NAMEN_KENNUNG), HEIMATWELT_NAMEN),
    typ: "heimat",
    startvorrat: true,
    // Echte Welt statt Generalist: dieselben Felder, die auch eine Bot-Welt
    // bei botWeltStart bekommt. Beide gehen damit durch dieselbe Tür.
    klasse: start.heimatDaten.klasse || null,
    zone: start.heimatDaten.zone || null,
    wasser: start.heimatDaten.wasser || null,
    schwerkraft: start.heimatDaten.schwerkraft || 1,
    groesse: start.heimatDaten.groesse || 150,
  });

  return {
    version: SAVE_VERSION,
    letzterTick: jetzt,
    galaxie,
    naechstePlanetId: 2,
    // Alle Akteure, die eigenständig handeln -- der Spieler ist einer davon.
    // Was jede kann, steht in FRAKTIONS_ARTEN (data.js) und wird bewusst NICHT
    // je Fraktion gespeichert.
    fraktionen: { [SPIELER_FRAKTION]: neueFraktion({ id: SPIELER_FRAKTION, art: SPIELER_FRAKTION }) },
    naechsteFraktionId: 1,
    // `planeten` und `flotten` halten ALLE, nicht nur die eigenen. Wer die
    // eigenen meint, geht über planetenVon/flottenVon.
    planeten: [heimatwelt],
    aktiverPlanet: 1,
    // Forschung gilt imperiumsweit, nicht pro Planet.
    //
    // Sie gehört sachlich der Spielerfraktion und wandert dorthin, sobald eine
    // zweite Fraktion forschen soll. Piraten haben `nutzt.forschung: false`,
    // brauchen also keine -- deshalb wäre der Umzug jetzt reine Unruhe an
    // vielen Stellen ohne Gegenwert.
    forschung: startForschung(),
    forschungFreigeschaltet: {},
    forschungsQueue: null,
    // Wartende Forschungsaufträge dahinter, gleiches Muster wie
    // planet.bauWarteschlange: [{ forschungId, zielLevel, dauerSek }].
    forschungsWarteschlange: [],
    // Flotten sind dauerhafte, benennbare Verbände mit Position und
    // Befehlsliste (siehe js/flotten.js). Sie ersetzen die alte Auftragsliste.
    flotten: [],
    naechsteFlotteId: 1,
    aktiveFlotte: null, // welche Flotte Befehle bekommt
    // Laufende Logistiknetz-Transfers: { id, quellPlanet, zielPlanet, resId,
    // menge, ankunftZeit }. Quelle wird bei Auslösung sofort abgezogen (wie
    // Frachtladung), Ziel bekommt es erst bei Ankunft -- dieselbe Regel wie
    // bei jeder anderen physischen Lieferung im Spiel.
    logistikTransfers: [],
    naechsteTransferId: 1,
    // Zähler für die Zufallssaat eines Gefechts. Der Kampf ist die einzige
    // Stelle im Spiel, die im laufenden Betrieb würfelt (Schadensschwankung) --
    // er zieht seine Zahlen jetzt aus dem Weltseed statt aus Math.random, damit
    // ein Weltlauf wiederholbar ist. Nebeneffekt, der auch fürs Spiel zählt:
    // ein neu geladener Spielstand liefert denselben Kampfausgang, Neuladen
    // vor einer Schlacht bringt also nichts.
    naechsteKampfSaat: 1,
    systemZustand: { [galaxie.heimatSystem]: start.systemZustand },
    // Vermessene Sprungrouten. Die Heimat ist von Anfang an dabei -- dort
    // steht die Zivilisation, die den Antrieb gebaut hat. Jedes weitere
    // System kostet einen Erstflug mit Unterlichtgeschwindigkeit.
    routen: { [galaxie.heimatSystem]: true },
    // Der sterbende Stern. Steht von Anfang an fest und ist von Anfang an
    // sichtbar -- die Welt existiert, bevor jemand hinsieht (Prinzip 1), und
    // die Frist ist keine gesetzte Zahl, sondern Entfernung durch
    // Geschwindigkeit (Prinzip 13). Siehe SUPERNOVA in data.js.
    supernova: supernovaAnlegen(seed, galaxie, jetzt),
    angezeigtesSystem: galaxie.heimatSystem,
    meldungen: [],
    testZeitOffsetMs: 0,
    testZeitFaktor: 1,
    // Wann diese Kolonie gegründet wurde. Bezugspunkt für das Ingame-Datum
    // (A-005) -- gezählt wird ab hier, nicht ab einem Erdkalender.
    beginn: jetzt,
  };
}

export function spielzeitJetzt(state) {
  return Date.now() + (state.testZeitOffsetMs || 0);
}

// --- Was vom Zeitversatz in den Spielstand darf (A-048) -------------------
//
// DER FEHLER, DEN DAS ABSTELLT, und er ist der Grund, warum Tobis Reload nie
// half: der Sekundentakt speichert `testZeitOffsetMs` mit, `letzterTick`
// rückt aber nur vor, wenn die Aufholung durchläuft. Hängt sie, wächst der
// gespeicherte Versatz weiter -- beim nächsten Laden steht dieselbe oder eine
// GRÖSSERE Lücke da. Der kaputte Zustand ernährt sich selbst.
//
// Die Invariante dagegen ist eine Zeile: gespeichert wird höchstens der
// Versatz, den die Uhr tatsächlich erreicht hat. Der Versatz, bei dem
// `spielzeitJetzt` genau auf `letzterTick` stünde, ist `letzterTick - jetzt`
// -- alles darüber ist ungerechnete Strecke.
//
//     gespeichert = min(roher Versatz, letzterTick − jetzt)
//
// Im Normalbetrieb ändert das nichts: der Takt hält `letzterTick` aktuell,
// beide Werte sind gleich. Erst wenn die Uhr zurückfällt, greift die Grenze.
//
// WAS DAS KOSTET, offen gesagt: wer mitten in einer langen Aufholung den Tab
// schließt, verliert den noch nicht gerechneten Rest seines Sprungs. Das ist
// der Handel -- ein Sprung, der nie gerechnet wurde, hat auch nie
// stattgefunden, und er darf sich nicht über Neuladen hinweg aufsummieren.
//
// Der Spielstand selbst bleibt unangetastet: das hier ändert nur, WAS beim
// Speichern hinausgeht, nicht den laufenden Zustand. Eine Aufholung, die noch
// läuft, rechnet mit ihrem vollen Versatz weiter.
// WARUM DIE UNTERGRENZE BEI NULL LIEGT, und das war beim ersten Anlauf falsch:
// `letzterTick − jetzt` ist auch dann negativ, wenn der Spieler schlicht WEG
// war -- eine ganz normale Offline-Lücke, mit der der Versatz nichts zu tun
// hat. Ohne die Null hätte ein Speichern während dieser Lücke den Versatz
// negativ gemacht: die Spielzeit stünde dauerhaft hinter der Wanduhr, und die
// Abwesenheit, die die Frist ausdrücklich mitzählen soll, wäre still
// verschwunden. Aufgefallen beim Gegenprüfen mit A-046 („Verwerfen" setzt den
// Versatz auf 0, und genau dort greift der Fall).
//
// Gekappt wird deshalb nur, was der Versatz selbst an ungerechneter Strecke
// mitbringt. Ein NEGATIVER Versatz ist die Pause aus A-038 -- sie hat ihre
// eigene Verankerung beim Laden (`pauseNachziehen`) und wird hier nicht
// angefasst.
export function speicherbarerVersatz(state, jetzt = Date.now()) {
  const roh = state.testZeitOffsetMs || 0;
  if (roh <= 0) return roh;
  const erreicht = state.letzterTick - jetzt;
  return Math.max(0, Math.min(roh, erreicht));
}

// --- Zeitraffer und Pause im Testmodus (A-038) ----------------------------
//
// Es gibt keinen zweiten Zeitpfad. Die Spielzeit ist und bleibt
// `Date.now() + testZeitOffsetMs` -- der Faktor lässt nur den VERSATZ
// mitwachsen (Prinzip 5).
//
// Eine Formel deckt alles ab:      Versatz += Echtzeit × (Faktor − 1)
//
//   Faktor 0  →  Versatz schrumpft genau um die verstrichene Echtzeit:
//                die Wanduhr läuft, die Spielzeit steht. Das ist die Pause.
//   Faktor 1  →  nichts passiert, der Normalfall.
//   Faktor 3  →  je Echtzeitsekunde kommen zwei Sekunden dazu, macht drei.
//
// Der Faktor liegt im Spielstand, der Bezugspunkt bewusst NICHT: „wann habe
// ich zuletzt angepasst" ist eine Frage an diesen Lauf, nicht an die Welt.
// Nach einem Neuladen fängt die Messung neu an, statt eine Lücke aufzuholen,
// die niemand erlebt hat.
let zeitfaktorBezug = null;

export const ZEITFAKTOREN = [0, 1, 2, 3, 4];

export function zeitfaktorVon(state) {
  const f = state.testZeitFaktor;
  return ZEITFAKTOREN.includes(f) ? f : 1;
}

// `jetzt` ist auch hier durchgereicht, nicht abgefragt: sonst wäre der
// Faktorwechsel die eine Stelle, die man nicht deterministisch testen kann --
// und genau dort sitzt die Abrechnung des alten Faktors.
export function zeitfaktorSetzen(state, faktor, jetzt = Date.now()) {
  if (!ZEITFAKTOREN.includes(faktor)) return;
  // Erst abrechnen, was mit dem ALTEN Faktor noch offen ist -- sonst würde
  // die Zeit seit dem letzten Takt mit dem neuen Faktor verrechnet.
  zeitfaktorAnwenden(state, jetzt);
  state.testZeitFaktor = faktor;
}

export function zeitfaktorAnwenden(state, jetzt = Date.now()) {
  const faktor = zeitfaktorVon(state);
  if (zeitfaktorBezug === null) {
    zeitfaktorBezug = jetzt;
    return 0;
  }
  const echtVergangen = jetzt - zeitfaktorBezug;
  zeitfaktorBezug = jetzt;
  if (faktor === 1 || echtVergangen <= 0) return 0;
  const zuwachs = echtVergangen * (faktor - 1);
  state.testZeitOffsetMs = (state.testZeitOffsetMs || 0) + zuwachs;
  return zuwachs;
}

// Nur für Tests: den Bezugspunkt zurücksetzen, damit ein Lauf nicht die
// Wartezeit des vorherigen erbt.
export function zeitfaktorBezugSetzen(wert) {
  zeitfaktorBezug = wert;
}

// Beim Laden: eine Pause überdauert das Neuladen (die Falle aus dem Auftrag).
// Ohne das stünde der Versatz noch auf dem Wert von vorhin, `spielzeitJetzt`
// spränge um die ganze Abwesenheit nach vorn — und der pausierte Stand holte
// beim Öffnen genau das auf, wovor die Pause ihn bewahren sollte. Neu
// verankert steht die Spielzeit exakt dort, wo sie beim Schließen stand.
// `jetzt` ist optional (Rückfall `Date.now()`, Spielverhalten unverändert) --
// dasselbe Muster wie bei A-003/A-024: ein Aufrufer, der die Wanduhr schon in
// der Hand hat (Test, Messwerkzeug), reicht sie durch, statt dass diese
// Funktion sie ein zweites Mal selbst liest. Ohne das driftet ein
// Vergleich gegen `spielzeitJetzt()` danach um die Millisekunde, die
// zwischen den beiden `Date.now()`-Aufrufen vergeht (A-096, aus A-076
// gemessen: 2 von 7 Vollsuiten-Läufen fielen genau darüber um).
export function pauseNachziehen(state, jetzt = Date.now()) {
  if (zeitfaktorVon(state) !== 0) return;
  state.testZeitOffsetMs = state.letzterTick - jetzt;
  zeitfaktorBezug = null;
}

// --- Ingame-Datum (A-005) -------------------------------------------------
//
// Tobis Punkt: „Ingame muss ersichtlich sein wieviel ein Ingame Jahr ist."
// Das ist demo-tragend, und zwar mehr als es klingt: die Frist der Demo läuft
// in SPIELJAHREN (240 bis zum Blitz). Wer nicht weiß, was ein Jahr ist, kann
// die Frist nicht lesen -- und die Frist ist die ganze Geschichte.
//
// Gezählt wird ab Gründung der Kolonie, nicht nach einem Erdkalender. Ein
// Datum, das die Menschheit hinter sich gelassen hat, würde eine Herkunft
// behaupten, die das Spiel nicht erzählt.

// Wann fing diese Partie an?
//
// Der Merker `beginn` gibt es erst seit v0.83. Für ältere Spielstände wird er
// REKONSTRUIERT statt auf „jetzt" gesetzt: `supernovaAnlegen` legt den Kollaps
// exakt `jahreBisKollaps` nach dem Start, die Rechnung ist also umkehrbar.
// Ohne das würde bei jedem laufenden Tester das Datum auf Jahr 1 Tag 1
// zurückspringen -- und genau die Zahl, die Vertrauen schaffen soll, wäre die
// erste, die lügt.
export function spielBeginn(state) {
  if (state.beginn) return state.beginn;
  if (state.supernova && state.supernova.kollapsZeit) {
    return state.supernova.kollapsZeit - jahreInMs(SUPERNOVA.jahreBisKollaps);
  }
  return state.letzterTick;
}

// „Jahr N · Tag M", beide ab 1 gezählt -- der erste Tag der Kolonie ist
// Jahr 1, Tag 1, nicht Jahr 0, Tag 0.
//
// Reine Rechnung, absichtlich hier und nicht in ui.js: sie ist Logik, und
// damit prüfbar, ohne einen Browser zu starten.
export function spielDatum(state, jetzt = spielzeitJetzt(state)) {
  const tageGesamt = Math.max(0, spieltage((jetzt - spielBeginn(state)) / 1000));
  return {
    jahr: Math.floor(tageGesamt / ZEIT.tageProJahr) + 1,
    tag: Math.floor(tageGesamt % ZEIT.tageProJahr) + 1,
  };
}

// --- Fraktionen -----------------------------------------------------------
// Der Spieler ist eine Fraktion wie jede andere -- die, bei der alles
// eingeschaltet ist. Was eine Fraktion kann, steht in FRAKTIONS_ARTEN
// (data.js) und wird NICHT je Fraktion gespeichert: so wirkt eine
// Balancing-Änderung rückwirkend, und der Spielstand bleibt klein.
//
// `state.planeten` und `state.flotten` sind die Listen ALLER Akteure. Wer nur
// die eigenen meint, geht über planetenVon/flottenVon -- sonst würde eine
// Piratenbasis später in der Imperiumsübersicht auftauchen.
export function neueFraktion({ id, art = SPIELER_FRAKTION, name = null }) {
  return {
    id,
    art,
    name: name || FRAKTIONS_ARTEN[art].name,
    // Gerichtete Meinungen über andere Fraktionen. SPÄRLICH: ein fehlender
    // Eintrag bedeutet "noch keine Berührung" und wird als Grundhaltung der
    // eigenen Art gelesen. Damit ist der Null-Zustand gratis richtig.
    beziehungen: {},
    // A-133: eigener Forschungsstand je Fraktion, siehe forschungVon unten.
    // Additiv: ein alter Spielstand ohne diese Felder liest sich über das
    // Ausweichen in forschungVon/forschungsQueueVon als "nichts erforscht"
    // -- für Bots ist das exakt der heutige Wahrheitsgehalt.
    forschung: {},
    forschungsQueue: null,
    // A-134: dasselbe Regal, jetzt auch mit der Warteschlange dahinter --
    // ohne sie hätte forschungStarten für eine Fraktion mit laufendem
    // Projekt keinen Ort für den zweiten Auftrag. Additiv wie die Felder
    // oben; ein alter Spielstand ohne dieses Feld ist "nichts eingereiht",
    // und das stimmt für ihn.
    forschungsWarteschlange: [],
    // A-137: worauf ein Bot gerade spart, wenn ihm das Naheliegende (die
    // Kolonisationskette) am Kontostand scheitert. `null` heißt "spart
    // gerade nicht" -- additiv, ein alter Spielstand ohne das Feld liest
    // sich genauso. Siehe botKolonisieren/botSparzielPruefen in
    // simulation.js für Entstehung, Reserve-Wirkung und Verwerfen.
    sparziel: null,
  };
}

export function fraktionById(state, id) {
  return state.fraktionen ? state.fraktionen[id] : undefined;
}

export function fraktionArt(fraktion) {
  return FRAKTIONS_ARTEN[fraktion && fraktion.art ? fraktion.art : SPIELER_FRAKTION];
}

// Nutzt diese Fraktion ein bestimmtes Teilsystem? Die einzige erlaubte Art,
// nach Fraktionseigenschaften zu verzweigen -- niemals über fraktion.art.
export function fraktionNutzt(fraktion, teilsystem) {
  const art = fraktionArt(fraktion);
  return art.nutzt[teilsystem] !== false;
}

export function fraktionGrenze(fraktion, name) {
  return fraktionArt(fraktion).grenzen[name];
}

// Zugehörigkeit eines Planeten oder einer Flotte. Fehlt das Feld (alter
// Spielstand), gehört das Ding dem Spieler -- vor v0.33 gab es nichts anderes.
export function fraktionVon(objekt) {
  return objekt && objekt.fraktion ? objekt.fraktion : SPIELER_FRAKTION;
}

export function planetenVon(state, fraktionId = SPIELER_FRAKTION) {
  return state.planeten.filter((p) => fraktionVon(p) === fraktionId);
}

export function flottenVon(state, fraktionId = SPIELER_FRAKTION) {
  return state.flotten.filter((f) => fraktionVon(f) === fraktionId);
}

// --- Beziehungen ----------------------------------------------------------
// Siehe BEZIEHUNG in data.js für die Begründung der beiden Effekte.

// Was `von` über `zu` denkt. Ohne Eintrag gilt die Grundhaltung der eigenen
// Art -- Piraten starten also feindlich, ohne dass jemand etwas eintragen muss.
export function beziehungZu(state, vonId, zuId) {
  if (vonId === zuId) return BEZIEHUNG.max;
  const von = fraktionById(state, vonId);
  if (!von) return 0;
  const wert = von.beziehungen ? von.beziehungen[zuId] : undefined;
  return wert === undefined ? fraktionArt(von).grundhaltung : wert;
}

// Wie stark eine Handlung im aktuellen Zustand wirkt. Getrennt herausgezogen,
// damit die Oberfläche sie erklären kann ("dein Angriff wiegt hier schwerer")
// und ein Test sie direkt prüfen kann.
export function beziehungWirkung(aktuell, delta) {
  if (!delta) return 0;
  const anteilVomAnschlag = Math.abs(aktuell) / BEZIEHUNG.max;
  const gleicheRichtung = aktuell === 0 || Math.sign(delta) === Math.sign(aktuell);
  if (gleicheRichtung) {
    // Sättigung: je näher am Anschlag, desto weniger bewegt sich noch.
    return delta * (1 - anteilVomAnschlag);
  }
  // Trägheit: gegenläufige Handlungen zählen weniger, je verhärteter die
  // Beziehung ist -- aber nie gar nicht.
  return delta * (1 - BEZIEHUNG.traegheitMax * anteilVomAnschlag);
}

export function beziehungAendern(state, vonId, zuId, delta) {
  if (vonId === zuId) return BEZIEHUNG.max;
  const von = fraktionById(state, vonId);
  if (!von) return 0;
  if (!von.beziehungen) von.beziehungen = {};
  const aktuell = beziehungZu(state, vonId, zuId);
  const neu = Math.max(BEZIEHUNG.min, Math.min(BEZIEHUNG.max, aktuell + beziehungWirkung(aktuell, delta)));
  von.beziehungen[zuId] = Math.round(neu * 100) / 100;
  return von.beziehungen[zuId];
}

// Eine Handlung aus BEZIEHUNG.werte, beidseitig ausgewertet: der Empfänger
// bewertet sie, der Handelnde nicht. Genau das ist der Sinn der gerichteten
// Speicherung.
export function beziehungHandlung(state, taeterId, betroffenerId, handlung) {
  const delta = BEZIEHUNG.werte[handlung];
  if (delta === undefined) return null;
  return beziehungAendern(state, betroffenerId, taeterId, delta);
}

// --- Planeten -------------------------------------------------------------
export function planetById(state, id) {
  return state.planeten.find((p) => p.id === id);
}

export function aktiverPlanet(state) {
  const eigene = planetenVon(state);
  return planetById(state, state.aktiverPlanet) || eigene[0] || state.planeten[0];
}

// Planeten mit eigener Wirtschaft (Außenposten haben keine).
//
// Bewusst auf EINE Fraktion beschränkt: sie speist Imperiumsübersicht,
// Logistiknetz und Handel, und dort haben fremde Basen nichts zu suchen.
export function wirtschaftsPlaneten(state, fraktionId = SPIELER_FRAKTION) {
  return planetenVon(state, fraktionId).filter((p) => p.typ !== "aussenposten");
}

// Steht an diesem Orbit ein Planet -- EGAL WEM ER GEHÖRT?
//
// Diese Frage ist absichtlich fraktionsblind: fünf Stellen in simulation.js
// benutzen sie als Belegtprüfung ("kann hier noch etwas hin?"), und für die
// ist die Flagge des Besitzers gleichgültig. Wer "gehört das MIR" meint,
// nimmt `eigenerPlanetAn`.
export function planetAn(state, systemId, orbit) {
  return state.planeten.find((p) => p.systemId === systemId && p.orbit === orbit);
}

// Steht an diesem Orbit ein Planet, der dem SPIELER gehört?
//
// Anlass (A-002): die Systemliste las das Ergebnis von `planetAn` als "eigen".
// Im Heimatsystem der Demo-Saat standen dadurch drei Piratenbasen als "Dein
// Stützpunkt" da -- und das war nicht nur Anzeige: an `eigen` hängt auch,
// welche Missionen ein Orbit anbietet. Es ist der vierte Fall des Fehlertyps
// "Vorgabe aus der Zeit, als nur der Spieler Planeten hatte".
//
// Eigene Funktion statt eines Vergleichs an Ort und Stelle, weil die Karte
// (js/karte.js) denselben Vergleich schon einmal ausgeschrieben hatte: zwei
// Stellen, die dieselbe Grenze meinen und getrennt gepflegt werden, laufen in
// diesem Projekt erfahrungsgemäß auseinander.
export function eigenerPlanetAn(state, systemId, orbit) {
  const planet = planetAn(state, systemId, orbit);
  return planet && fraktionVon(planet) === SPIELER_FRAKTION ? planet : null;
}

// --- Forschung je Fraktion (A-133) -----------------------------------------
//
// R-26, Tobis Entscheidung: „Lol ich forsche einfach für die ganze Galaxy
// mit, auch geil. Ja das muss natürlich Fraktionsgebunden sein." Gemessener
// Stand: `state.forschung` ist global -- ein Objekt für den ganzen
// Spielstand, ohne Fraktionsbezug. `kategorieBonus` las es direkt und hob
// damit jede Bot-Welt mit dem Forschungsstand des Spielers.
//
// EINE Funktion je Frage, weil das die einzigen zwei Stellen sind, an denen
// je ein Forschungsstand wohnt -- alles andere (kategorieBonus,
// verbrauchsBonusFaktor, flotteKapazitaet) geht ab jetzt über diese beiden.
// Für den Spieler liefern sie `state.forschung`/`state.forschungsQueue`
// (unveränderter Ort -- siehe unten, warum kein Umzug), für jede andere
// Fraktion `fraktion.forschung`/`fraktion.forschungsQueue` (fehlt das Feld,
// leer/null -- ein alter Spielstand liest sich darüber als "nichts
// erforscht", für Bots vor A-134 der heutige Wahrheitsgehalt). Außenposten
// und Piraten (`nutzt.forschung: false`) bekommen dieselbe Leere, weil
// nichts je in ihr `fraktion.forschung` schreibt -- keine Sonderprüfung
// nötig, die Abwesenheit ist schon die Wahrheit.
//
// WARUM `state.forschung` NICHT UMZIEHT: der Umzug in die Spielerfraktion
// selbst wäre die schönere Lösung, ändert aber das Speicherformat. Seit
// A-141 kennt save.js zwar eine Migrationskette (MIGRATIONEN in js/save.js),
// aber die rechnet nur um, wofür jemand einen Eintrag TRÄGT -- der Umzug
// dieses Feldes bräuchte selbst eine neue Migration, die es noch nicht gibt.
// Er bleibt damit Kategorie 3 und gehört in den Sammel-Sprung -- diese
// Funktion ist genau die Naht, an der er später (mitsamt seiner eigenen
// Migration) ohne weitere Änderung an den Aufrufern stattfinden kann.
export function forschungVon(state, fraktionId) {
  if (fraktionId === SPIELER_FRAKTION) return state.forschung;
  const fraktion = fraktionById(state, fraktionId);
  return (fraktion && fraktion.forschung) || {};
}

// Gegenstück für die laufende Forschung (A-013s graduellen Bonus): derselbe
// Weg, dieselbe Ausnahme. Ohne dieses Gegenstück läse kategorieBonus für
// jede fremde Fraktion weiter `state.forschungsQueue` -- ein Leck, das kein
// Test findet, der nur fertige Stufen prüft (das laufende Projekt des
// Spielers würde fremden Welten weiter seinen Anteil schenken).
export function forschungsQueueVon(state, fraktionId) {
  if (fraktionId === SPIELER_FRAKTION) return state.forschungsQueue;
  const fraktion = fraktionById(state, fraktionId);
  return (fraktion && fraktion.forschungsQueue) || null;
}

// A-134: Gegenstück für die WARTENDEN Projekte -- dieselbe Ausnahme wie
// forschungsQueueVon. Gibt die LIVE-Liste zurück (nicht kopiert), damit
// naechstesForschungLevel eingereihte Stufen mitzählt, ohne eine zweite
// Fassung der Frage zu schreiben.
export function forschungsWarteschlangeVon(state, fraktionId) {
  if (fraktionId === SPIELER_FRAKTION) return state.forschungsWarteschlange;
  const fraktion = fraktionById(state, fraktionId);
  return (fraktion && fraktion.forschungsWarteschlange) || [];
}

// --- Produktion -----------------------------------------------------------
export function kategorieBonus(state, kategorie, fraktionId = SPIELER_FRAKTION) {
  let faktor = 1;
  const forschung = forschungVon(state, fraktionId);
  const laufend = forschungsQueueVon(state, fraktionId);
  for (const def of Object.values(RESEARCH)) {
    if (def.boost && def.boost.kategorie === kategorie) {
      faktor += (forschung[def.id] || 0) * def.boost.proLevel;
      // A-013 (PROBE): die laufende Stufe wirkt anteilig mit ihrem Fortschritt.
      if (laufend && laufend.forschungId === def.id && def.boost.graduell) {
        const anteil = laufend.aufwand > 0 ? (laufend.fortschritt || 0) / laufend.aufwand : 0;
        faktor += Math.min(1, Math.max(0, anteil)) * def.boost.proLevel;
      }
    }
  }
  return faktor;
}

// A-116: ein Forschungsbonus, der nur die Ausbeute erhöht, ist ein Perpetuum
// mobile in klein -- Tobis Grundsatz (22.08.): „was nur positiv wäre, gehört
// entschärft." Real ist Fördertechnik Mechanisierung: mehr Durchsatz heißt
// mehr Strom und mehr Einsatzstoff, der Ertrag pro eingesetzter Kilowattstunde
// bleibt bestenfalls gleich. Was Technik wirklich einspart, ist die
// menschliche Arbeit -- deshalb sinkt Arbeitskraft, statt zu steigen, halb so
// stark wie der Aufschlag (Deutung der Planung aus „von mir aus gehen sie
// auch ein bisschen runter").
//
// Mit `b = kategorieBonus(state, def.kategorie) - 1`:
//   Arbeitskraft         -> 1 - 0,25·b
//   alles andere Verbrauchte (Energie, Material) -> 1 + 0,5·b
//
// AUSGENOMMEN: die Kategorie `energie` selbst. Energietechnik verbessert den
// Wirkungsgrad des Reaktors -- mehr Strom aus DEMSELBEN Brennstoff, ein
// Mehrverbrauch wäre die Aussage auf den Kopf gestellt. Kraftwerk und
// Solarfeld behalten deshalb ALLE ihre Verbrauchsposten unverändert,
// Brennstoff eingeschlossen.
//
// EINE Stelle für alle Aufrufer (rohRaten, produktionsAufloesung samt seiner
// Fluss-Zuteilung, ausbauVorschau) -- eine zweite Fassung wäre die teuerste
// Fehlerklasse des Projekts (Kommentar an ANREICHERUNG_VERLUST).
//
// A-133: `fraktionId` wandert im Gleichschritt mit dem Bonus durch --
// derselbe Aufschlag, dieselbe Fraktion. Ein Bot, der den Preis zahlt, ohne
// den Nutzen zu haben, wäre schlimmer als der Zustand vor dieser Runde.
export function verbrauchsBonusFaktor(state, def, resId, fraktionId = SPIELER_FRAKTION) {
  if (!def || def.kategorie === "energie") return 1;
  const b = kategorieBonus(state, def.kategorie, fraktionId) - 1;
  return resId === "arbeitskraft" ? 1 - 0.25 * b : 1 + 0.5 * b;
}

// Planetare Affinität: Multiplikator je Ressource auf die Förderung dieses
// Planeten. Der HAKEN existiert ab v0.18, die Zahlen kommen später (spezielle
// Planetenarten, Terraforming) -- ohne Eintrag ändert sich nichts.
// Affinität eines Planeten, abgeleitet aus seinen drei Eigenschaften
// (Klasse, Zone, Wasser). Bis v0.23 war das eine gespeicherte Tabelle je
// Planetenart; seit dem Umbau folgt sie den Eigenschaften, damit Terraforming
// später nur noch Zone und Wasser verändern muss und die Werte automatisch
// nachziehen.
//
// `planet.affinitaet` bleibt als ÜBERSCHREIBUNG bestehen: Einzelfälle und
// Tests können damit gezielt einen Wert setzen, ohne das Modell zu umgehen.
export function planetAffinitaet(planet) {
  if (!planet) return {};
  const abgeleitet = planet.klasse ? affinitaetVon(planet) : {};
  return { ...abgeleitet, ...(planet.affinitaet || {}) };
}

export function affinitaetFaktor(planet, resId) {
  const tabelle = planetAffinitaet(planet);
  const wert = tabelle[resId];
  // NULL IST EIN GÜLTIGER WERT und bedeutet "gibt es hier nicht" -- nicht
  // "nicht gesetzt". In der ersten, weichen Fassung stand hier `wert > 0`,
  // womit jede gesperrte Ressource still auf voller Rate weitergefördert
  // hätte. Fehlt der Eintrag ganz, gilt 1 (Heimatwelt als Generalist).
  return typeof wert === "number" && wert >= 0 ? wert : 1;
}

// Ab welchem Bestand dürfen Verarbeitungsketten NICHT mehr aus dem Lager
// nachziehen. Gleiche Form wie lagerRegeln/logistikMindestbestand.
// Ohne Eintrag: 0 (die Kette darf den Bestand vollständig aufbrauchen).
export function verarbeitungsReserveFuer(planet, resId) {
  const wert = planet && planet.verarbeitungsReserve ? planet.verarbeitungsReserve[resId] : undefined;
  return typeof wert === "number" && wert > 0 ? wert : 0;
}

export function verarbeitungsReserveSetzen(planet, resId, menge) {
  // A-066: Auf einem Stand, der älter ist als dieses Feld, gab es das Objekt
  // nicht -- `delete undefined[resId]` warf beim ERSTEN Klick auf den Regler.
  // Die Leseseite (verarbeitungsReserveFuer) fing das Fehlen längst ab, die
  // Schreibseite nicht. Dasselbe Muster wie in stromPrioritaetSetzen, das es
  // von Anfang an hatte.
  if (!planet.verarbeitungsReserve) planet.verarbeitungsReserve = {};
  if (menge === null || menge === undefined || !Number.isFinite(menge) || menge <= 0) {
    delete planet.verarbeitungsReserve[resId];
  } else {
    planet.verarbeitungsReserve[resId] = menge;
  }
}

// --- Lager-Bereich, Block 1 (A-153) -----------------------------------------
// Zwei weitere Regler je Ressource, GENAU dasselbe Muster wie die
// Verarbeitungs-Reserve oben (B3: dieselbe Form für dieselbe Art Zahl).
// `|| 0`-sicher für Altstände (Kategorie 1): ein fehlendes Feld heißt "kein
// Wert gesetzt", nie ein Fehler.
//
// Max: die Zielmenge, auf die eine fördernde Anlage sich herunterregelt
// (E1). Wirkt seit A-154 (Regime C in produktionsAufloesung); der Wert
// selbst ist seit A-153 unverändert dasselbe Feld.
export function maxBestandFuer(planet, resId) {
  const wert = planet && planet.maxBestand ? planet.maxBestand[resId] : undefined;
  return typeof wert === "number" && wert > 0 ? wert : 0;
}

export function maxBestandSetzen(planet, resId, menge) {
  if (!planet.maxBestand) planet.maxBestand = {};
  if (menge === null || menge === undefined || !Number.isFinite(menge) || menge <= 0) {
    delete planet.maxBestand[resId];
  } else {
    planet.maxBestand[resId] = menge;
  }
}

// A-154: greift die Zielmenge gerade ein? Für Anzeige-Zwecke (die Kachel,
// Kriterium 4) -- EINE Funktion für jeden Leser (B3), statt an jeder
// Anzeigestelle dieselben Bedingungen neu abzuschreiben. `drosselung` ist
// das Feld aus effektiveRaten/produktionsAufloesung.
//
// Kein zusätzlicher Bestand-vs-Max-Vergleich nötig: Regime B (Rohstoffmangel,
// nachfrage > angebot) und Regime C (Zielmenge, angebot > nachfrage) sind
// EXKLUSIV -- pro Ressource und Auflösung greift höchstens eines. Ist ein
// Max gesetzt und die Ressource gedrosselt, kann das also nur Regime C
// sein; ein tatsächlicher Engpass schlösse "am oder über der Zielmenge"
// aus. Ein bestand>=max-Vergleich zusätzlich wäre B3-widrig (derselbe
// Entscheid, zweimal getroffen) und obendrein fragil: Regime C rastet
// knapp UNTER der exakten Zielmenge ein (dieselbe Mindestdauer-Krume wie
// bei Regime B), ein strikter Vergleich träfe ihn nie exakt.
export function maxDrosselAktiv(planet, resId, drosselung) {
  if (maxBestandFuer(planet, resId) <= 0) return false;
  const anteil = drosselung ? drosselung[resId] : undefined;
  return anteil !== undefined && anteil < 1 - 1e-9;
}

// Handels-Mindest (E2): schützt einen Bestand gegen Handel und Verkauf. Diese
// Runde speichert und zeigt den Wert (Definition von fertig, Punkt 2) --
// seine Wirkung auf `kannVerkaufen`/den Markt ist NICHT Teil von L2 (das
// Entwurfsdokument nennt nur das Feld als Voraussetzung für die separate
// Verkaufs-/Wegschmeiß-Mechanik, die es ausdrücklich noch nicht gibt).
export function handelsMindestFuer(planet, resId) {
  const wert = planet && planet.handelsMindest ? planet.handelsMindest[resId] : undefined;
  return typeof wert === "number" && wert > 0 ? wert : 0;
}

export function handelsMindestSetzen(planet, resId, menge) {
  if (!planet.handelsMindest) planet.handelsMindest = {};
  if (menge === null || menge === undefined || !Number.isFinite(menge) || menge <= 0) {
    delete planet.handelsMindest[resId];
  } else {
    planet.handelsMindest[resId] = menge;
  }
}

// Wie lange trägt ein Puffer noch? Gemeinsame Rechnung für die Regime-Wahl in
// produktionsAufloesung UND für das Puffer-Ereignis in simulation.js -- beide
// müssen dieselbe Grenze benutzen. Sonst hält die eine Seite den Puffer noch
// für tragfähig, während die andere schon kein Ereignis mehr einplant, und die
// Kette läuft unbemerkt über die Reserve hinaus weiter (genau dieser Fehler
// entstand beim ersten Bau: zwei Schwellen, die dasselbe meinten).
const MS_PRO_STUNDE_STATE = 1000 * 60 * 60;
export const PUFFER_MINDESTDAUER_MS = 1000;

// Kennung des Bevölkerungs-Verbrauchers in der Produktionsauflösung. Kein
// Gebäude, aber derselbe Rechenweg -- siehe produktionsAufloesung.
export const BEVOELKERUNG_ANLAGE = "__bevoelkerung";

export function pufferReichweiteMs(vorrat, defizitProStunde) {
  if (defizitProStunde <= 0) return Infinity;
  if (vorrat <= 0) return 0;
  return (vorrat / defizitProStunde) * MS_PRO_STUNDE_STATE;
}

// --- Brennstoff aus dem Bestand (A-055, Weg B) -----------------------------
//
// Ein Gebäude mit `brennstoff` in data.js (das Kraftwerk) verbrennt eine
// GELAGERTE Ressource -- aber ausdrücklich NICHT über die Ratenrechnung, die
// das Modell verbietet (Energie hinge an Deuterium, Deuterium über den
// Extraktor an Energie: der Kreis, an dem A-008 gescheitert ist). Stattdessen:
//
//   - Das TOR ist binär und liest nur den BESTAND -- eine Zahl aus dem
//     letzten Takt, kein Fluss. Brennstoff da -> volle Leistung, leer -> aus.
//     Physikalisch ehrlich: Fusion zündet oder zündet nicht.
//   - Der ABZUG läuft als negative Lagerrate über planetRatenAnwenden, wie
//     jede Verarbeitungskette (Reserve wird respektiert: wer Deuterium für
//     die Flotte zurücklegt, verheizt es nicht im Reaktor).
//   - Der ZÜNDSPEICHER (`planet.brennstoffAus[gebaeudeId]`, bis A-148 EIN
//     Bit `planet.reaktorAus` -- seit die Kernkraftanlage ein zweites
//     Brennstoff-Gebäude ist, braucht jede Anlage ihr EIGENES, siehe
//     reaktorBitNachziehen) ist eine Hysterese: eine erloschene Anlage
//     springt erst wieder an, wenn Brennstoff für den ANLAUF da ist. Ohne
//     sie würde eine Anlage an der Leergrenze im Sekundentakt zünden und
//     verlöschen -- jede Zündung ein Ereignis, und die Ereignisse kämen
//     schneller, als die Welt sie verdient.
//     Das Bit wandert NUR beim Fortschreiben der Planetenuhr
//     (reaktorBitNachziehen), und die Schwellen sind Ereignis-Zeitpunkte
//     (pufferGrenzeStunden) -- nur so rechnet ein großer Sprung dasselbe
//     wie viele kleine Schritte.
export const BRENNSTOFF_ANLAUF_MS = 10 * 60 * 1000;

// Einmal beim Laden eingesammelt: die Gebäude mit Brennstoff (Kraftwerk UND
// seit A-148 die Kernkraftanlage). Die Prüfung läuft je Planet und je
// Ereignis -- ein Object.entries über alle Gebäude wäre dort reine
// Allokationslast.
const BRENNSTOFF_GEBAEUDE = Object.entries(BUILDINGS)
  .filter(([, def]) => def.brennstoff)
  .map(([id, def]) => [id, def]);

// Zündet dieses Gebäude gerade? Liest ausschließlich Bestand, Reserve und
// das Hysterese-Bit -- keine Raten, keine Flüsse (der Kreis-Schutz).
//
// Seit A-147 zwei Brennstoff-Arten hinter einem Tor: `def.brennstoff`
// (Lager-Ressource, s.o.) UND `def.fossil` (planetgebundener Vorrat, siehe
// fossilBereit unten). Für jedes bestehende Gebäude ohne `def.fossil` ist
// dieser Zusatz ein No-Op -- das Kraftwerk bleibt unangetastet.
export function brennstoffBereit(planet, def, level) {
  if (level <= 0) return true;
  if (!fossilBereit(planet, def, level)) return false;
  if (!def.brennstoff) return true;
  for (const [resId, spec] of Object.entries(def.brennstoff)) {
    const proStunde = rate(spec, level);
    if (proStunde <= 0) continue;
    const vorrat =
      ((planet.ressourcen && planet.ressourcen[resId]) || 0) - verarbeitungsReserveFuer(planet, resId);
    const reichweite = pufferReichweiteMs(vorrat, proStunde);
    if (reichweite < PUFFER_MINDESTDAUER_MS) return false;
    if (planet.brennstoffAus && planet.brennstoffAus[def.id] && reichweite < BRENNSTOFF_ANLAUF_MS) return false;
  }
  return true;
}

// Wie lange trägt der Brennstoff-Vorrat noch, gemessen am ROHEN Verbrauch
// aller brennenden Gebäude (ohne Zufluss -- die konservative, lesbare Zahl
// für Anzeige und Bot-Vorausschau)? Infinity, wenn nichts brennt.
//
// PLANETWEITES MINIMUM -- bewusst so, für ihre beiden Aufrufer (A-188
// geprüft, keiner umgestellt): die Engpass-Schwelle des Bots
// (js/simulation.js) und ein weiterer Aufrufer hier in state.js wollen genau
// wissen, wann dem Planeten ALS GANZEM zuerst der Saft ausgeht -- ein
// planetweiter Engpass ist etwas anderes als die Reichweite einer einzelnen
// Anlage. Für die ANZEIGE je Anlage siehe brennstoffReichweiteAnlageMs.
export function brennstoffReichweiteMs(planet) {
  let knappste = Infinity;
  for (const [id, def] of BRENNSTOFF_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) continue;
    for (const [resId, spec] of Object.entries(def.brennstoff)) {
      const proStunde = rate(spec, level);
      if (proStunde <= 0) continue;
      const vorrat =
        ((planet.ressourcen && planet.ressourcen[resId]) || 0) - verarbeitungsReserveFuer(planet, resId);
      const reichweite = pufferReichweiteMs(vorrat, proStunde);
      if (reichweite < knappste) knappste = reichweite;
    }
  }
  return knappste;
}

// Schwester von brennstoffReichweiteMs (A-188, B-8/A-168): dieselbe Rechnung,
// aber für EINE Anlage statt das Minimum über alle. Seit A-168 bekommt jede
// gebaute Brennstoffanlage ihre eigene Zeile -- stehen Kraftwerk UND
// Kernkraftanlage zugleich, zeigten beide bis hierher dieselbe planetweite
// Zahl, obwohl sie verschiedene Ressourcen (Deuterium/Uran) verbrennen: die
// Anlage mit dem reichlicheren Brennstoff behauptete die Knappheit der
// anderen. Das Minimum INNERHALB einer Anlage bleibt (eine Anlage kann
// mehrere Brennstoffe zugleich verbrennen, def.brennstoff) -- es fällt nur
// zwischen den Anlagen weg.
export function brennstoffReichweiteAnlageMs(planet, gebaeudeId) {
  const def = BUILDINGS[gebaeudeId];
  const level = (planet.gebaeude && planet.gebaeude[gebaeudeId]) || 0;
  if (level <= 0 || !def || !def.brennstoff) return Infinity;
  let knappste = Infinity;
  for (const [resId, spec] of Object.entries(def.brennstoff)) {
    const proStunde = rate(spec, level);
    if (proStunde <= 0) continue;
    const vorrat =
      ((planet.ressourcen && planet.ressourcen[resId]) || 0) - verarbeitungsReserveFuer(planet, resId);
    const reichweite = pufferReichweiteMs(vorrat, proStunde);
    if (reichweite < knappste) knappste = reichweite;
  }
  return knappste;
}

// Was verbrennen die brennenden Gebäude dieses Planeten -- je Ressource die
// Rate pro Echtzeitstunde, aus derselben Schleife wie die Reichweite oben,
// nur ohne den Bestand.
//
// Die Anzeige braucht das, seit A-088 gemessen hat, WAS an dieser Reichweite
// eigentlich hängt: nicht die Last, sondern die Ausbaustufe. Der Reaktor
// verbrennt im Leerlauf exakt so viel wie unter Volllast (das Tor ist binär,
// siehe oben) -- eine Reichweite ohne diese Bedingung liest sich deshalb als
// Versprechen, das mit der nächsten Ausbaustufe zusammenfällt.
export function brennstoffProStunde(planet) {
  const raten = {};
  for (const [id, def] of BRENNSTOFF_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) continue;
    for (const [resId, spec] of Object.entries(def.brennstoff)) {
      const proStunde = rate(spec, level);
      if (proStunde > 0) raten[resId] = (raten[resId] || 0) + proStunde;
    }
  }
  return raten;
}

// Zieht das Hysterese-Bit nach -- aufgerufen beim Fortschreiben der
// Planetenuhr (simulation.js), NIE aus einer reinen Abfrage heraus: eine
// Abfrage, die den Zustand ändert, wäre für die Oberfläche und die
// Messwerkzeuge unsichtbarer Spielverlauf.
//
// A-148: Seit die Kernkraftanlage ein ZWEITES `def.brennstoff`-Gebäude ist
// (neben dem Kraftwerk), kann ein Planet zwei davon gleichzeitig tragen.
// `planet.reaktorAus` war EIN Bit für den ganzen Planeten -- bis hierhin
// unschädlich, weil es nie mehr als eine brennende Anlage gab. Mit zweien
// hätte das gemeinsame Bit die Anlaufzeit der einen Anlage von der
// Brennstofflage der ANDEREN abhängig gemacht (wer zuletzt in der Schleife
// dran ist, gewinnt) -- exakt das Flackern, das die Hysterese verhindern
// soll, nur zwischen zwei Anlagen statt am Leerstand einer einzigen. Das Bit
// ist deshalb jetzt JE GEBÄUDE (`planet.brennstoffAus[gebaeudeId]`), das
// Kraftwerk verhält sich dabei unverändert -- ein Planet mit nur einer
// brennenden Anlage sieht exakt dasselbe Bit wie vorher, nur eine Ebene
// tiefer verschachtelt.
export function reaktorBitNachziehen(planet) {
  for (const [id, def] of BRENNSTOFF_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) {
      // Abgerissen oder nie gebaut: kein Bit zu pflegen. Ohne diesen Zweig
      // bliebe ein einmal "aus" gesetztes Bit stehen, falls die Anlage
      // später neu gebaut wird -- ein unsichtbarer Alt-Zustand.
      if (planet.brennstoffAus) delete planet.brennstoffAus[id];
      continue;
    }
    let aus = !!(planet.brennstoffAus && planet.brennstoffAus[id]);
    for (const [resId, spec] of Object.entries(def.brennstoff)) {
      const proStunde = rate(spec, level);
      if (proStunde <= 0) continue;
      const vorrat =
        ((planet.ressourcen && planet.ressourcen[resId]) || 0) - verarbeitungsReserveFuer(planet, resId);
      const reichweite = pufferReichweiteMs(vorrat, proStunde);
      if (reichweite < PUFFER_MINDESTDAUER_MS) aus = true;
      else if (reichweite >= BRENNSTOFF_ANLAUF_MS) aus = false;
    }
    if (aus) {
      if (!planet.brennstoffAus) planet.brennstoffAus = {};
      planet.brennstoffAus[id] = true;
    } else if (planet.brennstoffAus) {
      delete planet.brennstoffAus[id];
    }
  }
  // Kein leeres Objekt liegen lassen -- ein Planet ohne brennende Anlage
  // soll wieder exakt so aussehen wie einer, der nie eine hatte.
  if (planet.brennstoffAus && Object.keys(planet.brennstoffAus).length === 0) delete planet.brennstoffAus;
}

// --- Fossiler Vorrat je Planet (A-147) --------------------------------------
//
// Zweite Brennstoff-Art neben der Lager-basierten oben: KEIN RESSOURCEN-
// Eintrag, kein Lager, kein Markt, keine Route -- ein einziges Feld am
// Planeten (`planet.fossilVorrat`, Tonnen), weil es ihn nur einmal gibt und
// er nicht handelbar sein soll (Tobi, 23.08., zu Gas als Lager-Ressource:
// "Aber in dem Fall erstmal nicht"). Dasselbe Grundprinzip wie beim
// Kraftwerk (A-055, Weg B): binäres Tor, Abzug beim Fortschreiben, NIE in
// der Ratenrechnung -- sonst derselbe Fluss-Kreis (Energie hinge an
// Fossilvorrat, der an nichts weiter hängt, also unkritisch, aber die
// Ratenrechnung darf trotzdem nicht von einem sich ändernden Bestand lesen).
//
// OHNE Hysterese, anders als beim Reaktor: der Vorrat wächst nie nach (nichts
// fördert ihn), ein einmal erloschenes Feld springt also nie wieder an --
// den Flacker-Fall, den der Zündspeicher beim Kraftwerk dämpft, gibt es hier
// strukturell nicht.
const FOSSIL_GEBAEUDE = Object.entries(BUILDINGS)
  .filter(([, def]) => def.fossil)
  .map(([id, def]) => [id, def]);

// Tonnen Vorrat je Echtzeitstunde. FESTER Umrechnungsfaktor auf die eigene
// Energieproduktion (FOSSIL.tonnenProMWh, siehe Herleitung in data.js) statt
// einer eigenen {basis,faktor}-Kurve: Verbrennung gewinnt mit der Stufe
// nichts an Wirkungsgrad, der Verbrauch MUSS also exakt mit der Produktion
// wachsen. Eine zweite, unabhängig gepflegte Kurve wäre die Fehlerklasse aus
// dem ANREICHERUNG_VERLUST-Kommentar: zwei Fassungen derselben Zahl.
export function fossilVerbrauchProStunde(def, level) {
  if (!def.fossil || level <= 0) return 0;
  const produktionEnergie = def.produktion && def.produktion.energie;
  return rate(produktionEnergie, level) * FOSSIL.tonnenProMWh;
}

// Der volle, ungeminderte Fossilvorrat einer Welt -- "nur auf Welten, die
// Leben hatten" (KONZEPT-TECHBAUM.md), derselbe Stellvertreter wie bei
// jeder anderen Nahrungs-Affinität: null bei Welten ohne Boden/Atmosphäre/
// Wasser, sonst linear mit ihr. `klasse` fehlt nur beim eigenschaftslosen
// Generalisten (Altfälle/Tests) -- dort gilt affinitaetFaktors eigene
// Vorgabe, 1 (siehe dort). GETEILT zwischen `neuerPlanet` (einmalig beim
// Anlegen), `fossilVorratVon` (A-171, bei jedem Lesen als Vorgabe für ein
// fehlendes Feld) UND der 33->34-Migration (A-196, js/save.js, füllt jeden
// Planeten voll auf) -- deshalb ein eigener Name, keine Kopie der Formel,
// und deshalb exportiert.
export function vollerFossilVorrat({ typ, klasse, zone, wasser }) {
  if (typ === "aussenposten") return 0;
  const nahrungAffinitaet = klasse ? (affinitaetVon({ klasse, zone, wasser }).nahrung ?? 1) : 1;
  return Math.round(FOSSIL_VORRAT_BASIS * nahrungAffinitaet * 100) / 100;
}

// A-171 (Tobis Meldung 31.08.: "ich bin jetzt softlocked"): ein Spielstand
// von vor A-147 hat `fossilVorrat` gar nicht -- jeder Leser, der bisher
// `planet.fossilVorrat || 0` schrieb, las das fehlende Feld als 0, und die
// Anlage brannte nie, unabhängig von Stufe oder Baujahr. Vorbild
// `affinitaetVon` (data.js, selbes Muster): die Vorgabe wirkt bei JEDEM
// Zugriff, nicht als Migration -- ein fehlendes Feld kann so nichts
// kaputtmachen, und die Runde bleibt Kategorie 1 (kein SAVE_VERSION-Sprung).
//
// `??`, NICHT `||`: eine echte 0 (Vorrat bereits verbrannt) ist ein
// gültiger, von der Vorgabe verschiedener Zustand und bleibt 0 -- nur ein
// FEHLENDES Feld bekommt die volle Vorgabe. `fossilVorratNachziehen` (s.u.)
// schreibt das Feld, sobald wirklich gefördert wird; die Vorgabe greift nur
// bis zum ersten Mal Verbrennen.
export function fossilVorratVon(planet) {
  return planet.fossilVorrat ?? vollerFossilVorrat(planet);
}

// Brennt dieses Gebäude gerade -- liest ausschließlich den Bestand. Wie
// brennstoffBereit oben, aber ohne Reserve (nichts sonst will fossilVorrat)
// und ohne Hysterese (s.o.).
export function fossilBereit(planet, def, level) {
  if (!def.fossil || level <= 0) return true;
  return fossilVorratVon(planet) > 0;
}

// Wie lange trägt der fossile Vorrat noch -- dieselbe konservative Zahl wie
// brennstoffReichweiteMs (ohne Zufluss), fürs "Restreichweite in
// Spieljahren" an der Kachel (A-147, Definition von fertig 3).
export function fossilReichweiteMs(planet) {
  let knappste = Infinity;
  for (const [id, def] of FOSSIL_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) continue;
    const proStunde = fossilVerbrauchProStunde(def, level);
    if (proStunde <= 0) continue;
    const reichweite = pufferReichweiteMs(fossilVorratVon(planet), proStunde);
    if (reichweite < knappste) knappste = reichweite;
  }
  return knappste;
}

// Zieht den Vorrat nach -- aufgerufen beim Fortschreiben der Planetenuhr
// (simulation.js, wie reaktorBitNachziehen), NIE aus einer reinen Abfrage
// heraus (derselbe Grund wie dort: unsichtbarer Spielverlauf). `stunden` ist
// die bereits auf die nächste Ereignisgrenze geschnittene Spanne
// (pufferGrenzeStunden unten) -- die Rate ist in ihr konstant, "Rate ×
// Zeitspanne" gilt also exakt, kein Krümel-Fehler wie A-119.
export function fossilVorratNachziehen(planet, stunden) {
  for (const [id, def] of FOSSIL_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    // A-171: dieselbe Vorgabe wie überall -- ein fehlendes Feld ist der
    // volle Vorrat, keine 0. Einmal gelesen, für Wächter UND Abzug.
    const vorrat = fossilVorratVon(planet);
    if (level <= 0 || vorrat <= 0) continue;
    const proStunde = fossilVerbrauchProStunde(def, level);
    if (proStunde <= 0) continue;
    const neu = vorrat - proStunde * stunden;
    // Auf null einrasten wie in planetRatenAnwenden -- kein negativer Krümel,
    // der eine weitere Mini-Reichweite vorgaukelt.
    planet.fossilVorrat = neu < 1e-6 ? 0 : neu;
  }
}

// Reihenfolge, in der Lager-Ressourcen aufgelöst werden müssen: ein Eingangs-
// stoff muss fertig gerechnet sein, bevor die Gebäude drankommen, die ihn
// verbrauchen. Kante Eingang -> Ausgang je Gebäude, danach topologisch sortiert.
//
// Kreise (A braucht B, B braucht A) sind nicht auflösbar. Statt zu werfen wird
// der Rest angehängt und in `kreis` gemeldet -- ein Test in ketten.test.js
// stellt sicher, dass die ausgelieferten Daten kreisfrei sind.
// Gemerktes Ergebnis für den Normalfall. Die Reihenfolge hängt AUSSCHLIESSLICH
// an der Gebäudetabelle, und die ist eine Modulkonstante -- sie kann sich zur
// Laufzeit nicht ändern. Ohne dieses Merken wurde der ganze topologische Sort
// bei JEDEM Aufruf von produktionsAufloesung neu gerechnet, also bei jedem
// Planeten und jedem Ereignis. Gemessen 2026-08-15: das war der größte
// Einzelposten der Simulationskosten.
//
// Tests rufen die Funktion weiterhin mit eigenen Tabellen auf -- dieser Weg
// wird nicht gemerkt, sonst würde ein Testfall den echten Wert überschreiben.
let kettenMerker = null;

export function kettenReihenfolge(buildings = BUILDINGS) {
  if (buildings === BUILDINGS && kettenMerker) return kettenMerker;
  const ergebnis = kettenReihenfolgeRechnen(buildings);
  if (buildings === BUILDINGS) kettenMerker = ergebnis;
  return ergebnis;
}

function kettenReihenfolgeRechnen(buildings) {
  const offen = new Map();
  for (const resId of LAGER_RESSOURCEN) offen.set(resId, new Set());
  for (const def of Object.values(buildings)) {
    const eingaenge = Object.keys(def.verbrauch || {}).filter((r) => offen.has(r));
    for (const ausgang of Object.keys(def.produktion || {})) {
      if (!offen.has(ausgang)) continue;
      for (const e of eingaenge) if (e !== ausgang) offen.get(ausgang).add(e);
    }
  }
  const reihenfolge = [];
  const erledigt = new Set();
  let fortschritt = true;
  while (fortschritt) {
    fortschritt = false;
    for (const [resId, eingaenge] of offen) {
      if (erledigt.has(resId)) continue;
      let bereit = true;
      for (const e of eingaenge) if (!erledigt.has(e)) bereit = false;
      if (!bereit) continue;
      erledigt.add(resId);
      reihenfolge.push(resId);
      fortschritt = true;
    }
  }
  const kreis = LAGER_RESSOURCEN.filter((r) => !erledigt.has(r));
  return { reihenfolge: [...reihenfolge, ...kreis], kreis };
}

// Was die Bevölkerung zur Bilanz beiträgt. Die EINZIGE Stelle, an der eine
// Rate nicht aus einem Gebäude kommt -- deshalb ein expliziter Haken statt
// eines Sonderfalls quer durch die Auflösung.
//
// Arbeitskraft hängt bewusst NICHT an der Nahrungsversorgung: hungernde
// Menschen arbeiten hier trotzdem, der Mangel wirkt über die schrumpfende
// Bevölkerung. Sonst entstünde eine zweite Kopplung (Nahrung -> Arbeitskraft
// -> Nahrungsproduktion), die sich selbst verstärkt.
export function bevoelkerungsAnteile(planet) {
  const menschen = (planet && planet.ressourcen && planet.ressourcen.bevoelkerung) || 0;
  return {
    arbeitskraft: menschen * BEVOELKERUNG.arbeitskraftProKopf,
    nahrung: menschen * BEVOELKERUNG.nahrungProKopf,
    abgaben: menschen * GELD.abgabenProKopf,
  };
}

// Wie voll das Nahrungslager im Verhältnis zum STÜNDLICHEN Verbrauch ist
// (A-117) -- die Reichweite in ECHTZEIT, nicht in Spieljahren (Begründung
// bei BEVOELKERUNG.vorratsReichweiteMinStunden in data.js). Unter der
// Mindestreichweite 0, ab der vollen 1, dazwischen linear. Gemessen wird der
// BESTAND gegen den Verbrauch, nicht gegen ein Defizit -- es geht um Vorrat,
// nicht um Mangel.
export function vorratsanteil(planet) {
  const menschen = (planet && planet.ressourcen && planet.ressourcen.bevoelkerung) || 0;
  if (menschen <= 0) return 0;
  const verbrauchProStunde = menschen * BEVOELKERUNG.nahrungProKopf;
  const bestand = (planet.ressourcen && planet.ressourcen.nahrung) || 0;
  const reichweiteStunden = bestand / verbrauchProStunde;
  const { vorratsReichweiteMinStunden: min, vorratsReichweiteVollStunden: voll } = BEVOELKERUNG;
  return Math.min(1, Math.max(0, (reichweiteStunden - min) / (voll - min)));
}

// Die Jahresrate fürs WACHSTUM (nicht fürs Schrumpfen -- das bleibt bei
// `basisRateJahr` ohne Bonus, siehe bevoelkerungSchritt in simulation.js).
// Dieselbe Funktion für Simulation UND Anzeige (planetUebersicht unten), sonst
// driftet eine von beiden lautlos auseinander (A-112-Fehlerklasse).
export function bevoelkerungsWachstumsrate(planet) {
  return BEVOELKERUNG.basisRateJahr + BEVOELKERUNG.vorratsBonusMaxJahr * vorratsanteil(planet);
}

// Arbeitskraft-Leerlauf (A-155): der Anteil der laufenden Förderung, der bei
// einer gegebenen Beschäftigungsquote (gebundene / verfügbare Arbeitskraft)
// gestohlen wird -- STETIG zwischen den vier Marken aus ARBEITSKRAFT_LEERLAUF
// (data.js), dort steht auch die Begründung der Werte.
//
// EINE Funktion für zwei Leser (B3): simulation.js zieht den Anteil bei der
// Ratenanwendung von der laufenden Produktion ab, ui.js zeigt ihn an der
// Arbeitskraft-Kachel, die die beiden Rohzahlen (frei/gesamt) ohnehin schon
// führt. `quote` ≥ 1 (kein Leerlauf, eher Mangel) und `NaN` (kein Nenner,
// z.B. eine Welt ohne Arbeitskraftbedarf) liefern beide 0.
export function arbeitskraftDiebstahlAnteil(quote) {
  const K = ARBEITSKRAFT_LEERLAUF;
  if (!(quote < K.vollAb)) return 0;
  if (quote >= K.ungemuetlichAb) {
    const anteil = (K.vollAb - quote) / (K.vollAb - K.ungemuetlichAb);
    return anteil * K.diebstahlBeiUngemuetlich;
  }
  if (quote >= K.kritischAb) {
    const anteil = (K.ungemuetlichAb - quote) / (K.ungemuetlichAb - K.kritischAb);
    return K.diebstahlBeiUngemuetlich + anteil * (K.diebstahlBeiKritisch - K.diebstahlBeiUngemuetlich);
  }
  const anteil = Math.max(0, Math.min(1, quote / K.kritischAb));
  return K.diebstahlBeiNull + anteil * (K.diebstahlBeiKritisch - K.diebstahlBeiNull);
}

// Was ein Handelsposten dieser Stufe auf diesem Planeten an Abgaben abrechnet.
//
// EINE Formel für drei Leser (A-075): die Rohraten, die Drosselungsrechnung
// und die Ausbau-Vorschau der Kachel. Bis dahin stand sie zweimal im Modell
// und GAR NICHT in der Vorschau -- deshalb zeigte die Kachel nur die
// Betriebskosten und damit ein Minus vor den Credits, obwohl der Posten
// welche einbringt.
//
// Warum die Stufe multipliziert: ein größerer Posten erfasst mehr von der
// Wirtschaft seines Planeten. Die Betriebskosten wachsen dagegen überlinear
// (1,2^Stufe) -- daraus folgt die beste Stufe je Weltgröße, und das ist die
// Entscheidung, die dieses Gebäude interessant macht.
export function handelsAbgaben(planet, stufe) {
  if (!planet || stufe <= 0) return 0;
  return bevoelkerungsAnteile(planet).abgaben * stufe;
}

export function rohRaten(state, planet) {
  const produktion = {};
  const verbrauch = {};
  if (!planet || planet.typ === "aussenposten") return { produktion, verbrauch };
  // A-133: EINE Fraktion für diesen ganzen Durchlauf -- rohRaten und die
  // Anlagen-Schleife (produktionsAufloesung) MÜSSEN denselben Faktor sehen,
  // sonst rechnen Zuteilung und Effizienz mit einer anderen Welt als die
  // Ketten (die teuerste Fehlerklasse dieses Projekts, A-112).
  const fraktion = fraktionVon(planet);

  const menschen = bevoelkerungsAnteile(planet);
  produktion.arbeitskraft = menschen.arbeitskraft;
  verbrauch.nahrung = menschen.nahrung;
  // Abgaben: die einzige Anlagen-Einnahme im Spiel, die an der BEVÖLKERUNG
  // hängt statt an der Ausbaustufe. Ein Handelsposten baut kein Geld ab, er
  // rechnet eine Wirtschaft ab -- und eine Wirtschaft sind Menschen. Steht
  // deshalb hier und nicht als produktion-Eintrag in data.js, wo rate() nur
  // die Stufe kennt. Die Gegenbuchung (Betriebskosten) steht dort.
  //
  // Das hier ist der ROHWERT. Gedrosselt wird er in produktionsAufloesung,
  // und zwar mit dem Faktor des POSTENS, nicht dem der Bevölkerung.
  const abgaben = handelsAbgaben(planet, planet.gebaeude.handelsposten || 0);
  if (abgaben > 0) produktion.credits = (produktion.credits || 0) + abgaben;

  for (const [id, def] of Object.entries(BUILDINGS)) {
    const level = planet.gebaeude[id] || 0;
    if (level <= 0) continue;
    const bonus = kategorieBonus(state, def.kategorie, fraktion);
    // Das Brennstoff-Tor (A-055): ein erloschener Reaktor liefert nichts und
    // zieht nichts -- auch keine Arbeitskraft, die Belegschaft steht nicht in
    // einer kalten Halle. Binär, damit kein Kreis entsteht (siehe
    // brennstoffBereit). Das Solarfeld skaliert mit seiner Orbit-Zone.
    const an = brennstoffBereit(planet, def, level) ? 1 : 0;
    const lage = def.sonnenlage ? solarLageFaktor(planet) : 1;

    for (const [resId, spec] of Object.entries(def.produktion || {})) {
      produktion[resId] =
        (produktion[resId] || 0) + rate(spec, level) * bonus * affinitaetFaktor(planet, resId) * an * lage;
    }
    // Der zweite Betriebsmodus (A-071). OHNE `bonus` und OHNE `affinitaet`:
    // beide würden die Perpetuum-mobile-Schranke aufweichen, weil die
    // Ausbeute dann schon bei niedrigerer Stufe einen größeren Reaktor trägt
    // (Herleitung an ANREICHERUNG_VERLUST in data.js). Auch hier gilt: was in
    // rohRaten steht, muss in produktionsAufloesung genauso stehen.
    if (anreicherungLaeuft(state, planet, id, def)) {
      for (const [resId, spec] of Object.entries(def.anreicherung.produktion || {})) {
        produktion[resId] = (produktion[resId] || 0) + rate(spec, level) * an;
      }
      for (const [resId, spec] of Object.entries(def.anreicherung.verbrauch || {})) {
        verbrauch[resId] = (verbrauch[resId] || 0) + rate(spec, level) * an;
      }
    }
    for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
      // Zwei Tore zusätzlich zum Brennstoff-Tor (A-061): einzelne Posten
      // beginnen erst ab einer Stufe (`verbrauchAbLevel`), und der
      // Laborbedarf fließt nur bei laufender Forschung. Beides steht als
      // Daten am Gebäude -- und beides muss auch in produktionsAufloesung
      // stehen, siehe dort.
      if (!verbrauchAb(def, resId, level)) continue;
      if (!verbrauchLaeuft(state, def, resId)) continue;
      // A-116: derselbe Bonusanteil, der oben die Ausbeute erhöht, verteuert
      // hier den Verbrauch (verbrauchsBonusFaktor).
      verbrauch[resId] =
        (verbrauch[resId] || 0) + rate(spec, level) * an * verbrauchsBonusFaktor(state, def, resId, fraktion);
    }
  }
  return { produktion, verbrauch };
}

// Fluss-Ressourcen (Energie) werden nicht gelagert -- Mangel drosselt anteilig.
// Das gilt je Planet: jede Kolonie braucht ihre eigene Energieversorgung.
//
// Energie wird BEWUSST zuerst und aus den ungedrosselten Rohwerten bestimmt.
// Bekannte Grenze: ein Kraftwerk, das eine Lager-Ressource als Brennstoff
// verbrauchte, wäre damit nicht korrekt abgebildet (Energie hinge an Metall,
// Metall über die Minen wieder an Energie -- ein echter Kreis). Solange kein
// Gebäude Energie aus gelagertem Material erzeugt, ist das folgenlos; siehe
// den Test "Energie wird vor den Ketten aufgelöst" in ketten.test.js.
// Was ein eigener Speicher an einem Defizit auffangen kann (Energie: die
// Batterie). Gibt die gedeckte Rate zurück, nicht den Bestand.
//
// Die Schwelle ist BEWUSST dieselbe Funktion wie bei den Verarbeitungsketten
// (pufferReichweiteMs/PUFFER_MINDESTDAUER_MS) und nicht dieselbe Idee mit
// eigener Zahl -- genau daran ist das Modell in v0.18 schon einmal
// auseinandergelaufen.
export function flussSpeicherDeckung(planet, resId, produktion, verbrauch) {
  const def = RESSOURCEN[resId];
  if (!def || !def.speicher) return 0;
  const defizit = verbrauch - produktion;
  if (defizit <= 0) return 0;
  const bestand = (planet && planet.ressourcen && planet.ressourcen[resId]) || 0;
  if (pufferReichweiteMs(bestand, defizit) < PUFFER_MINDESTDAUER_MS) return 0;
  return defizit;
}

export function effizienz(state, planet) {
  return effizienzAus(planet, rohRaten(state, planet));
}

// Dieselbe Rechnung mit bereits vorliegenden Rohwerten. Nötig, weil
// produktionsAufloesung die Rohraten ohnehin braucht -- vorher wurden sie dort
// ZWEIMAL gerechnet (einmal in effizienz, einmal direkt darunter). Bei jedem
// Planeten und jedem Ereignis.
// --- Stromprioritäten (v0.69) ---------------------------------------------
// Drei Stufen, bewusst nicht mehr: ein Schieberegler je Gebäude wäre eine
// Dauerrechenaufgabe, drei Knöpfe sind eine Entscheidung. `normal` ist die
// Vorgabe und braucht keinen Eintrag -- ein Planet ohne gesetzte Prioritäten
// verhält sich exakt wie vor v0.69.
export const STROM_STUFEN = { vorrang: 2, normal: 1, nachrang: 0 };

// --- Zweiter Betriebsmodus: Anreicherung (A-071) ---------------------------
//
// Ein Schalter je Gebäude, Vorgabe AUS -- ohne Eintrag verhält sich der
// Planet exakt wie vorher (Kategorie 1, dasselbe Muster wie
// `stromPrioritaet`). Als MAP und nicht als Bit am Planeten: die Regel steht
// als Daten am Gebäude (`def.anreicherung`), und ein zweites Gebäude mit
// einem Modus würde sich sonst denselben Schalter teilen.
export function anreicherungAn(planet, gebaeudeId) {
  return !!(planet && planet.anreicherung && planet.anreicherung[gebaeudeId]);
}

export function anreicherungSetzen(planet, gebaeudeId, an) {
  // Feld bei Bedarf anlegen -- die A-066-Lehre: die Leseseite fängt das
  // Fehlen ab, die Schreibseite muss es auch.
  if (!planet.anreicherung) planet.anreicherung = {};
  if (an) planet.anreicherung[gebaeudeId] = true;
  else delete planet.anreicherung[gebaeudeId];
}

// Läuft der Modus gerade wirklich? Schalter UND Forschung. Die Forschung ist
// ein SCHLÜSSEL (A-013): sie wirkt bei Abschluss, nicht anteilig -- deshalb
// steht hier ein Vergleich gegen 1 und kein Fortschrittsanteil.
export function anreicherungLaeuft(state, planet, gebaeudeId, def) {
  if (!def || !def.anreicherung) return false;
  const noetig = def.anreicherung.forschung;
  if (((state && state.forschung && state.forschung[noetig]) || 0) < 1) return false;
  return anreicherungAn(planet, gebaeudeId);
}

export function stromPrioritaet(planet, gebaeudeId) {
  const gesetzt = planet && planet.stromPrioritaet ? planet.stromPrioritaet[gebaeudeId] : undefined;
  return gesetzt === undefined ? STROM_STUFEN.normal : gesetzt;
}

export function stromPrioritaetSetzen(planet, gebaeudeId, stufe) {
  if (!planet.stromPrioritaet) planet.stromPrioritaet = {};
  if (stufe === STROM_STUFEN.normal) delete planet.stromPrioritaet[gebaeudeId];
  else planet.stromPrioritaet[gebaeudeId] = stufe;
}

// Teilt einen knappen Fluss von der höchsten Prioritätsstufe abwärts zu.
// Rückgabe: { anlagenId: anteil } mit anteil in [0,1].
//
// Bei gleicher Priorität für alle ist das Ergebnis identisch mit der alten
// gleichmäßigen Drosselung -- das ist die Zusicherung, auf der die
// bestehenden Tests stehen.
//
// SEIT v0.8 GILT DAS AUCH FÜR ARBEITSKRAFT, nicht mehr nur für Strom.
// Gemessen (tests/demolauf.mjs): der Magnetfeldgenerator scheiterte an
// fehlenden LEUTEN, nicht an fehlendem Strom -- bei 190 % Stromdeckung lief
// er auf 93 %, weil die Welt insgesamt 5 % zu wenig Arbeitskraft hatte und
// gleichmäßig gedrosselt wurde. Er braucht selbst nur rund 2.000 von
// 766.000 Einheiten; er wurde also für den Mangel der anderen mitbestraft.
//
// Die frühere Begründung ("Menschen verteilen sich von selbst") klingt
// richtig, ist aber genau falsch herum: eine Belegschaft lässt sich sehr
// wohl zuteilen -- man schickt sie in die eine Halle statt in die andere.
// Was sich NICHT zuteilen lässt, ist der Hunger der Bevölkerung, und die
// steht deshalb weiter außerhalb dieser Rechnung (BEVOELKERUNG_ANLAGE).
export function flussZuteilen(planet, anlagen, roh, resId) {
  const erzeugt = roh.produktion[resId] || 0;
  const gesamtBedarf = roh.verbrauch[resId] || 0;
  const ausSpeicher = flussSpeicherDeckung(planet, resId, erzeugt, gesamtBedarf);
  let rest = erzeugt + ausSpeicher;

  const anteile = {};
  const bedarfVon = (a) => (a.fluss ? a.fluss[resId] || 0 : 0);
  const verbraucher = anlagen.filter((a) => bedarfVon(a) > 0);
  for (const a of anlagen) anteile[a.id] = 1; // wer nichts braucht, ist nie gedrosselt

  const stufen = [...new Set(verbraucher.map((a) => stromPrioritaet(planet, a.id)))].sort(
    (a, b) => b - a
  );
  for (const stufe of stufen) {
    const gruppe = verbraucher.filter((a) => stromPrioritaet(planet, a.id) === stufe);
    const bedarf = gruppe.reduce((summe, a) => summe + bedarfVon(a), 0);
    if (bedarf <= 0) continue;
    const gedeckt = Math.max(0, Math.min(bedarf, rest));
    const anteil = gedeckt / bedarf;
    for (const a of gruppe) anteile[a.id] = anteil;
    rest -= gedeckt;
  }
  return anteile;
}

// Die Energie-Zuteilung ist seit v0.8 ein Sonderfall der allgemeinen.
export function energieZuteilen(planet, anlagen, roh) {
  return flussZuteilen(planet, anlagen, roh, "energie");
}

// ENTFERNT in v0.8: effizienzOhneEnergie.
//
// Sie war der Rest der Zeit, in der nur der Strom zugeteilt wurde und alles
// Übrige gleichmäßig drosselte. Seit jeder Fluss seine eigene Zuteilung hat,
// gäbe es nichts mehr, worüber sie laufen könnte -- sie stünde nur noch da
// und kodierte eine Annahme, die nicht mehr gilt. Genau der Fehlertyp, der
// in diesem Projekt schon mehrfach zugeschlagen hat (eine Vorgabe aus einer
// früheren Zeit, die niemand mehr hinterfragt).

export function effizienzAus(planet, roh) {
  const { produktion, verbrauch } = roh;
  let eff = 1;
  for (const resId of FLUSS_RESSOURCEN) {
    const braucht = verbrauch[resId] || 0;
    if (braucht <= 0) continue;
    const erzeugt = produktion[resId] || 0;
    // Ein gefüllter Speicher deckt die Lücke, die Anlagen laufen weiter --
    // dasselbe Regime A/B wie bei den Verarbeitungsketten, nur mit 0 als
    // Untergrenze statt einer eingestellten Reserve.
    const ausSpeicher = flussSpeicherDeckung(planet, resId, erzeugt, braucht);
    eff = Math.min(eff, (erzeugt + ausSpeicher) / braucht);
  }
  return Math.max(0, Math.min(1, eff));
}

// Vollständige Auflösung der Produktion eines Planeten, inklusive
// Verarbeitungsketten (Gebäude, die eine GELAGERTE Ressource als Eingang
// verbrauchen).
//
// Zwei Regime je Eingangsstoff, das ist der Kern des Modells:
//   A) Bestand über der Reserve -> die Kette läuft voll, die Lücke zwischen
//      Bedarf und Zustrom kommt aus dem Lager. Nettorate wird negativ.
//   B) Bestand auf der Reserve   -> die Verbraucher drosseln anteilig auf den
//      Zustrom (gleiche Regel wie bei Energie). Nettorate wird exakt 0, der
//      Bestand bleibt stehen. Kein Hin- und Herschalten.
//
// Der Wechsel von A nach B ist ein Zeitpunkt, der sich aus konstanten Raten
// exakt ausrechnen lässt -- siehe pufferGrenzeStunden(). Genau deshalb bleibt
// das Modell "Rate × Zeitspanne" der Zeitsimulation unangetastet.
//
// Bekannte Grenze (bewusst, ein Durchlauf statt Fixpunkt-Iteration): verbraucht
// EIN Gebäude zwei gelagerte Eingangsstoffe und sind beide gleichzeitig knapp,
// wird der zuerst aufgelöste Stoff etwas zu stark abgezogen -- die Drosselung
// durch den zweiten Stoff steht dann noch nicht fest. Der Fehler geht immer zu
// Lasten des Spielers (konservativ), kann mit den aktuellen Daten nicht
// auftreten (kein Gebäude hat zwei Lager-Eingänge) und ist in ketten.test.js
// als Ist-Zustand festgehalten.
export function produktionsAufloesung(state, planet) {
  // Die leere Auflösung muss JEDES Feld tragen, das die volle auch trägt --
  // sonst greift ein Aufrufer bei einem Außenposten ins Leere. Genau das wäre
  // beim neuen `fluss` passiert: die Ressourcenleiste liest es je Fluss-
  // Ressource und hätte auf einem Außenposten geworfen.
  const leer = {
    lager: {},
    fluss: {},
    produktion: {},
    verbrauch: {},
    bedarf: {},
    drosselung: {},
    effizienz: 1,
    faktoren: {},
    verderb: {},
  };
  if (!planet || planet.typ === "aussenposten" || !planet.gebaeude) return leer;
  // A-133: dieselbe Fraktion wie in rohRaten -- siehe die Begründung dort.
  const fraktion = fraktionVon(planet);

  // Rohraten EINMAL rechnen und beides daraus speisen -- die Energieeffizienz
  // oben und die Fluss-Anzeige ganz unten.
  const roh = rohRaten(state, planet);
  const energieFaktor = effizienzAus(planet, roh);
  const menschen = bevoelkerungsAnteile(planet);
  const anlagen = [];
  for (const [id, def] of Object.entries(BUILDINGS)) {
    const level = planet.gebaeude[id] || 0;
    if (level <= 0) continue;
    const bonus = kategorieBonus(state, def.kategorie, fraktion);
    const prod = {};
    const verb = {};
    // Anlagen, die Sonnenlicht brauchen, stehen still, solange die
    // Ozonschicht zerstört ist. Das ist die einzige Wirkung des Blitzes --
    // und sie reicht, denn ohne Ernte schrumpft die Bevölkerung über den
    // Hungerweg, den das Spiel ohnehin kennt.
    const lichtFaktor = def.brauchtSonnenlicht && !sonnenlichtNutzbar(state) ? 0 : 1;
    // Brennstoff-Tor und Orbit-Lage (A-055) -- ZWINGEND dieselben Faktoren
    // wie in rohRaten, sonst rechnen Zuteilung und Effizienz mit einer
    // anderen Welt als die Ketten.
    const an = brennstoffBereit(planet, def, level) ? 1 : 0;
    const lage = def.sonnenlage ? solarLageFaktor(planet) : 1;
    for (const [resId, spec] of Object.entries(def.produktion || {})) {
      if (!LAGER_RESSOURCEN.includes(resId)) continue;
      prod[resId] = rate(spec, level) * bonus * affinitaetFaktor(planet, resId) * lichtFaktor * an * lage;
    }
    for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
      if (!LAGER_RESSOURCEN.includes(resId)) continue;
      // DIESELBEN Tore wie in rohRaten (A-061). Der Kommentar oben in dieser
      // Schleife sagt, warum das keine Wahl ist: „sonst rechnen Zuteilung und
      // Effizienz mit einer anderen Welt als die Ketten." Ein Tor, das nur an
      // einer der beiden Stellen steht, ist der wahrscheinlichste Fehler
      // dieses Umbaus.
      if (!verbrauchAb(def, resId, level)) continue;
      if (!verbrauchLaeuft(state, def, resId)) continue;
      // A-116: derselbe Faktor wie in rohRaten -- sonst weicht die Abrechnung
      // von der Anzeige ab (die teuerste Fehlerklasse des Projekts).
      verb[resId] = rate(spec, level) * an * verbrauchsBonusFaktor(state, def, resId, fraktion);
    }
    // Der zweite Betriebsmodus (A-071), zweite von zwei Stellen -- siehe
    // rohRaten. Die Ausbeute geht in `prod` (sie ist eine Lager-Ressource
    // und wird damit wie jede andere Produktion gedrosselt), der Strombedarf
    // weiter unten in `fluss`: nur dort greift die Zuteilung nach Priorität,
    // und genau die soll greifen -- reicht der Strom nicht, drosselt sie den
    // GANZEN Extraktor, Förderung eingeschlossen.
    const modusAn = anreicherungLaeuft(state, planet, id, def);
    if (modusAn) {
      for (const [resId, spec] of Object.entries(def.anreicherung.produktion || {})) {
        if (!LAGER_RESSOURCEN.includes(resId)) continue;
        prod[resId] = (prod[resId] || 0) + rate(spec, level) * an;
      }
    }
    // Abgaben hängen an der BEVÖLKERUNG, gehören aber dem POSTEN -- er ist
    // die Stelle, die abrechnet, und teilt deshalb seinen Drosselfaktor.
    //
    // Der erste Entwurf hängte sie an die Bevölkerung, und das war ein Leck:
    // die Menschen laufen bewusst ungedrosselt (ein Blackout lässt niemanden
    // weniger essen), die Betriebskosten des Postens aber nicht. Auf einer
    // Welt mit 11 % Energieeffizienz kassierte er dadurch die vollen Abgaben
    // bei fast keinen Kosten -- aus einer armen Welt wurde eine
    // Gelddruckmaschine. Gefunden vom Test "ein kleiner Planet zahlt drauf".
    // Die Abgaben wachsen MIT DER STUFE des Postens: ein größerer Posten
    // erfasst mehr von der Wirtschaft seines Planeten. Ohne diesen Faktor
    // wäre jeder Ausbau ein reiner Verlust -- die Betriebskosten steigen mit
    // 1,2^Stufe, die Einnahme bliebe gleich. Gefunden beim Messen der Bots:
    // sie bauten den Posten pflichtschuldig auf Stufe 3 aus und verbrannten
    // damit 1.838 Credits pro Stunde, statt welche zu verdienen.
    //
    // Weil die Kosten überlinear und die Einnahmen linear wachsen, gibt es zu
    // jeder Bevölkerung eine beste Stufe -- und die verschiebt sich, wenn die
    // Welt wächst. Genau die Art Entscheidung, die Prinzip 12 verlangt.
    if (id === "handelsposten" && handelsAbgaben(planet, level) > 0) prod.credits = handelsAbgaben(planet, level);
    // Fluss-Bedarf je Anlage wird MITGEFÜHRT, nicht nur in der Summe: er wird
    // nach Prioritaet zugeteilt, und dafuer muss bekannt sein, wer wieviel
    // davon will. Seit v0.8 gilt das fuer Strom UND Arbeitskraft (vorher
    // trug die Anlage nur `energie`).
    const fluss = {};
    for (const resId of FLUSS_RESSOURCEN) {
      // A-116: derselbe Faktor wie oben bei `verb` -- sonst zeigt roh.verbrauch
      // (die Anzeige) einen anderen Bedarf, als die Prioritaets-Zuteilung
      // (flussZuteilen) tatsaechlich verrechnet.
      let menge =
        rate(def.verbrauch && def.verbrauch[resId], level) * an * verbrauchsBonusFaktor(state, def, resId, fraktion);
      // A-071: Der Strombedarf der Anreicherung gehört zum Bedarf DIESER
      // Anlage. Damit teilt er ihre Priorität und ihre Drosselung -- eine
      // Anreicherung, die bei Strommangel voll weiterliefe, während die
      // Förderung daneben einbricht, wäre zwei Anlagen in einer.
      if (modusAn) menge += rate(def.anreicherung.verbrauch && def.anreicherung.verbrauch[resId], level) * an;
      if (menge > 0) fluss[resId] = menge;
    }
    anlagen.push({ id, prod, verb, fluss, energie: fluss.energie || 0 });
  }

  // Die Bevölkerung ist ein Verbraucher wie eine Anlage, aber KEINE Anlage:
  // sie hängt nicht am Stromnetz. Ein Blackout lässt Menschen nicht weniger
  // essen, deshalb bekommt sie unten den Faktor 1 statt der Energieeffizienz.
  if (menschen.nahrung > 0) {
    anlagen.push({ id: BEVOELKERUNG_ANLAGE, prod: {}, verb: { nahrung: menschen.nahrung } });
  }

  // Energiemangel drosselt eine Anlage komplett -- also auch ihren Zugriff auf
  // Eingangsstoffe. Eine halb laufende Raffinerie frisst kein volles Metall.
  // --- Stromzuteilung nach Priorität (v0.69) ------------------------------
  //
  // Bis v0.68 drosselte Strommangel ALLE Anlagen gleich stark. Das war
  // gerecht und im Notfall genau falsch: wer zu wenig Strom hat, will nicht
  // überall 40 % laufen, sondern die Farm ganz und die Mine gar nicht.
  //
  // DIE VORGABE, DIE DAS HIER ERFÜLLT: bei GLEICHER Priorität kommt exakt das
  // alte Verhalten heraus -- jede Anlage bekommt denselben Anteil. Nur wer
  // Prioritäten setzt, ändert etwas. Deshalb bleiben über dreihundert Tests
  // gültig, die gegen die gleichmäßige Drosselung geschrieben sind.
  //
  // Zugeteilt wird von oben nach unten: die höchste Stufe zuerst und
  // vollständig, der Rest fließt eine Stufe tiefer. Innerhalb einer Stufe
  // anteilig. Das ist genau, wie ein Stromnetz Lasten abwirft.
  // Jeder knappe Fluss wird nach derselben Prioritaet zugeteilt (v0.8:
  // vorher nur Energie). Ein Gebaeude hat EINE Prioritaet, nicht eine je
  // Ressource -- drei Knoepfe sind eine Entscheidung, sechs waeren eine
  // Rechenaufgabe.
  const zuteilungen = FLUSS_RESSOURCEN.map((resId) => flussZuteilen(planet, anlagen, roh, resId));

  const faktoren = {};
  for (const a of anlagen) {
    if (a.id === BEVOELKERUNG_ANLAGE) {
      // Die Menschen haengen an keiner Leitung und stehen in keiner Schicht:
      // ein Blackout laesst niemanden weniger essen.
      faktoren[a.id] = 1;
      continue;
    }
    let f = 1;
    for (const anteile of zuteilungen) f = Math.min(f, anteile[a.id] ?? 1);
    faktoren[a.id] = f;
  }

  const lager = {};
  const produktion = {};
  const verbrauch = {};
  // Nennbedarf (vor der Drosselung) und der angewandte Anteil. Beides ist für
  // die Anzeige nötig: der gedrosselte Verbrauch allein sähe immer aus, als
  // ginge alles auf -- man könnte nicht erkennen, wie viel wirklich fehlt.
  const bedarf = {};
  const drosselung = {};
  const { reihenfolge } = kettenReihenfolge();

  for (const resId of reihenfolge) {
    let angebot = 0;
    let nachfrage = 0;
    for (const a of anlagen) {
      if (a.prod[resId]) angebot += a.prod[resId] * faktoren[a.id];
      if (a.verb[resId]) nachfrage += a.verb[resId] * faktoren[a.id];
    }
    bedarf[resId] = nachfrage;
    drosselung[resId] = 1;

    if (nachfrage > angebot + 1e-9) {
      const bestand = (planet.ressourcen && planet.ressourcen[resId]) || 0;
      const reserve = verarbeitungsReserveFuer(planet, resId);
      if (pufferReichweiteMs(bestand - reserve, nachfrage - angebot) < PUFFER_MINDESTDAUER_MS) {
        // Regime B: anteilig drosseln, Nettorate wird 0.
        const anteil = nachfrage > 0 ? angebot / nachfrage : 0;
        for (const a of anlagen) if (a.verb[resId]) faktoren[a.id] *= anteil;
        drosselung[resId] = anteil;
        nachfrage = angebot;
      }
      // Regime A (Bestand über Reserve): nichts tun, die Lücke kommt aus dem
      // Lager und wird unten als negative Nettorate sichtbar.
    } else if (angebot > nachfrage + 1e-9) {
      // Regime C (A-154, E1): das Spiegelbild von Regime B -- dort drosselt
      // der VERBRAUCH auf den Zustrom, wenn der Bestand unten anschlägt,
      // hier drosselt die PRODUKTION auf den Abstrom, wenn er oben anschlägt
      // (die Zielmenge aus A-153). Dieselbe Formel, umgedreht, dieselbe
      // Zusicherung: Nettorate wird exakt 0, kein Hin- und Herschalten.
      const max = maxBestandFuer(planet, resId);
      if (max > 0) {
        const bestand = (planet.ressourcen && planet.ressourcen[resId]) || 0;
        if (pufferReichweiteMs(max - bestand, angebot - nachfrage) < PUFFER_MINDESTDAUER_MS) {
          const anteil = angebot > 0 ? nachfrage / angebot : 0;
          // NICHT faktoren[a.id] -- die bliebe sonst auch für andere
          // Ressourcen derselben Anlage verändert (B3: eine Zahl, ein
          // Rechenweg -- die Grundlast unten ist die einzige zusätzliche
          // Untergrenze, keine zweite Drehung an dieser hier).
          // `produktionsDrosselFaktor` ist eine reine Lesehilfe für die
          // Energie-Fluss-Rechnung unten, kein zweiter persistenter Zustand.
          for (const a of anlagen) if (a.prod[resId]) a.produktionsDrosselFaktor = anteil;
          drosselung[resId] = anteil;
          angebot = nachfrage;
        }
      }
    }

    produktion[resId] = angebot;
    verbrauch[resId] = nachfrage;
    lager[resId] = angebot - nachfrage;
  }

  // Der Brennstoff-Abzug (A-055): NACH den Ketten, als schlichte negative
  // Lagerrate. Er nimmt an der Regime-Wahl oben ausdrücklich NICHT teil --
  // ein Reaktor drosselt nicht anteilig auf den Zustrom, er zündet oder
  // nicht (das Tor steckt schon in den Anlagen-Faktoren). Die Rate wandert
  // über planetRatenAnwenden ins Lager und über pufferGrenzeStunden in die
  // Ereignis-Zeitpunkte -- beide lesen dieses `lager`-Feld, es gibt nur die
  // eine Wahrheit.
  for (const [id, def] of BRENNSTOFF_GEBAEUDE) {
    const level = planet.gebaeude[id] || 0;
    if (level <= 0 || !brennstoffBereit(planet, def, level)) continue;
    for (const [resId, spec] of Object.entries(def.brennstoff)) {
      const menge = rate(spec, level);
      if (menge <= 0) continue;
      lager[resId] = (lager[resId] || 0) - menge;
      verbrauch[resId] = (verbrauch[resId] || 0) + menge;
      bedarf[resId] = (bedarf[resId] || 0) + menge;
    }
  }

  // Fluss-Ressourcen zur Anzeige mitführen (unverändert zur bisherigen Form).
  // Nettorate der Fluss-Speicher (Energie: die Batterie lädt oder entlädt).
  const fluss = {};
  for (const resId of FLUSS_RESSOURCEN) {
    const resDef = RESSOURCEN[resId];
    if (resDef && resDef.ausAnlagen) {
      // Ein Fluss, der AUS Anlagen kommt (Forschung), trägt deren endgültige
      // Drosselung. Und zwar die ENDGÜLTIGE: faktoren[] steht nach der
      // Kettenauflösung oben, enthält also nicht nur den Energiemangel,
      // sondern auch einen fehlenden Eingangsstoff. Ein Labor ohne Silizium
      // ist genauso lahmgelegt wie eines ohne Strom -- stünde hier der
      // Rohwert, forschte es unbeeindruckt weiter.
      //
      // Energie und Arbeitskraft dürfen das NICHT: sie sind die Eingänge,
      // aus denen der Faktor erst entsteht, und würden sich im Kreis rechnen.
      let summe = 0;
      for (const [id, def] of Object.entries(BUILDINGS)) {
        const spec = def.produktion && def.produktion[resId];
        if (!spec) continue;
        const level = planet.gebaeude[id] || 0;
        if (level <= 0) continue;
        summe += rate(spec, level) * kategorieBonus(state, def.kategorie, fraktion) * (faktoren[id] || 0);
      }
      produktion[resId] = summe;
    } else {
      produktion[resId] = roh.produktion[resId] || 0;
    }
    verbrauch[resId] = roh.verbrauch[resId] || 0;
    if (!resDef || !resDef.speicher) continue;
    // Ein Ausdruck deckt alle Fälle ab, weil er den ANGEWANDTEN Faktor nimmt:
    //   Überschuss           -> eff 1, netto > 0, der Speicher lädt.
    //   Defizit, Speicher da -> eff 1, netto < 0, der Speicher trägt es.
    //   Defizit, Speicher leer -> eff = P/V, netto exakt 0, nichts fließt.
    //   Anderer Engpass (Arbeitskraft) -> Anlagen laufen gedrosselt und
    //     verbrauchen entsprechend weniger Strom, der Rest lädt den Speicher.
    // Getrennte Sonderfälle wären genau die Sorte doppelt gepflegter Grenze,
    // die dieses Modell schon einmal zerlegt hat.
    // Bei ENERGIE zählt seit v0.69 nicht mehr ein gemeinsamer Drosselfaktor,
    // sondern was die Anlagen nach ihrer Zuteilung wirklich ziehen. Sonst
    // lüde die Batterie bei gesetzten Prioritäten falsch -- eine Anlage im
    // Nachrang verbraucht weniger, als der Mittelwert behauptet.
    // A-154: eine durch die Zielmenge gedrosselte Anlage zieht trotzdem ihre
    // Grundlast (`DROSSELUNG.grundlastAnteil`) -- die Untergrenze gilt NUR
    // für den tatsächlichen Verbrauch, nicht für `faktoren[a.id]` selbst
    // (die bliebe sonst für andere Ressourcen derselben Anlage mitverändert,
    // siehe Regime C oben). `Math.min` mit der Zuteilungsquote: die
    // Grundlast erhöht den Verbrauch nie über das, was der Anlage
    // tatsächlich zugeteilt wurde (ein echter Energiemangel sticht die
    // Grundlast-Untergrenze).
    const energieFaktorVon = (a) =>
      a.produktionsDrosselFaktor === undefined
        ? (faktoren[a.id] ?? 1)
        : Math.min(faktoren[a.id] ?? 1, Math.max(DROSSELUNG.grundlastAnteil, a.produktionsDrosselFaktor));
    const wirklichVerbraucht =
      resId === "energie"
        ? anlagen.reduce((summe, a) => summe + (a.energie || 0) * energieFaktorVon(a), 0)
        : verbrauch[resId] * energieFaktor;
    fluss[resId] = produktion[resId] - wirklichVerbraucht;
  }

  // A-112: der momentane Verderbverlust je Ressource, Bestand × λ im
  // Augenblick -- GETRENNT von `lager`, nicht eingerechnet. Die Simulation
  // zieht denselben λ bereits exponentiell über die Zeitspanne ab
  // (`verderbFaktor` in simulation.js, angewandt in planetRatenAnwenden).
  // Stünde dieser Verlust hier schon in `lager`, zöge planetRatenAnwenden ihn
  // ein zweites Mal ab -- der Doppelabzug aus den Bekannten Fallen von A-112.
  // Nur die Anzeige (`sichtbareRate` unten) verrechnet beide Felder; die
  // Simulation liest `lager` weiterhin unverändert.
  const verderb = {};
  for (const resId of LAGER_RESSOURCEN) {
    const def = RESSOURCEN[resId];
    if (!def || !def.verderb) continue;
    verderb[resId] = (planet.ressourcen[resId] || 0) * def.verderb;
  }

  return { lager, fluss, produktion, verbrauch, bedarf, drosselung, effizienz: energieFaktor, faktoren, verderb };
}

// A-112: die tatsächlich ANGEZEIGTE Nettorate einer Lagerressource --
// Produktion minus Verbrauch (`lager`) minus den momentanen Verderbverlust
// (`verderb`). Klaus' Fund war genau die Lücke zwischen beiden: die Kachel
// zeigte nur `lager` und nannte das "die Rate", während der Verderb (Anteil
// des BESTANDS) bei großem Vorrat die Netto-Produktion übersteigen kann --
// grünes Plus, schrumpfender Bestand.
//
// EINE Funktion für JEDEN Anzeige-Ort (Regelwerk B3): Ressourcenkachel,
// Imperiumsübersicht, „Diese Welt in Zahlen", Verarbeitungsreserve. Wer hier
// stattdessen `lager[resId]` direkt läse, baute den A-112-Fehler an einer
// neuen Stelle nach.
export function sichtbareRate(lager, verderb, resId) {
  return (lager[resId] || 0) - (verderb[resId] || 0);
}

export function effektiveRaten(state, planet) {
  return produktionsAufloesung(state, planet);
}

// Wann erreicht der erste angezapfte Bestand seine Reserve? Ergebnis in
// Stunden, oder null wenn gerade nichts abgebaut wird.
//
// BEWUSST nicht gespeichert, sondern bei jedem Aufruf neu aus dem aktuellen
// Zustand gerechnet: ein gespeicherter Zeitstempel könnte veralten, sobald
// sich irgendeine Rate ändert -- genau der Fehlertyp, der in diesem Projekt
// schon zweimal zugeschlagen hat.
export function pufferGrenzeStunden(state, planet) {
  const { lager, fluss } = produktionsAufloesung(state, planet);
  let frueheste = null;
  // Fluss-Speicher zählen mit: der Moment, in dem die Batterie leerläuft, ist
  // derselbe Fall -- davor laufen alle Anlagen voll, danach gedrosselt. Zwei
  // Abschnitte mit konstanter Rate, also ein Ereignis dazwischen. Ihre
  // Untergrenze ist 0 statt einer eingestellten Reserve.
  const alle = Object.entries({ ...lager, ...fluss });
  for (const [resId, nettoRate] of alle) {
    if (nettoRate >= 0) continue;
    const bestand = (planet.ressourcen && planet.ressourcen[resId]) || 0;
    const reserve = verarbeitungsReserveFuer(planet, resId);
    const dauerMs = pufferReichweiteMs(bestand - reserve, -nettoRate);
    // Unter der Mindestdauer gilt der Puffer bereits als leer (siehe oben) --
    // produktionsAufloesung drosselt dann schon, also gibt es nichts zu teilen.
    if (dauerMs < PUFFER_MINDESTDAUER_MS || !Number.isFinite(dauerMs)) continue;
    const stunden = dauerMs / MS_PRO_STUNDE_STATE;
    if (frueheste === null || stunden < frueheste) frueheste = stunden;
  }

  // A-154: das Spiegelbild der Schleife oben -- eine Ressource mit gesetzter
  // Zielmenge (Max, A-153), die gerade WÄCHST, erreicht sie irgendwann. Der
  // Moment trennt zwei Abschnitte mit konstanter Rate genauso wie eine
  // Puffergrenze (Regime A -> C statt A -> B) -- deshalb dieselbe Funktion,
  // nur mit der Zielmenge als Obergrenze und dem verbleibenden Spielraum
  // (`max - bestand`) statt eines Vorrats über der Reserve.
  for (const resId of LAGER_RESSOURCEN) {
    const max = maxBestandFuer(planet, resId);
    if (max <= 0) continue;
    const nettoRate = lager[resId] || 0;
    if (nettoRate <= 0) continue;
    const bestand = (planet.ressourcen && planet.ressourcen[resId]) || 0;
    const dauerMs = pufferReichweiteMs(max - bestand, nettoRate);
    // Unter der Mindestdauer regelt produktionsAufloesung (Regime C) bereits
    // herunter -- nichts mehr zu teilen, dieselbe Begründung wie oben.
    if (dauerMs < PUFFER_MINDESTDAUER_MS || !Number.isFinite(dauerMs)) continue;
    const stunden = dauerMs / MS_PRO_STUNDE_STATE;
    if (frueheste === null || stunden < frueheste) frueheste = stunden;
  }

  // Die Brennstoff-Schwellen (A-055) sind eigene Ereignis-Zeitpunkte: der
  // Moment, in dem das Tor kippt, trennt zwei Abschnitte mit konstanter
  // Rate -- exakt wie eine Puffergrenze, nur dass die Schwelle nicht die
  // Reserve ist, sondern die Zünd- bzw. Anlaufmenge. Sie laufen NICHT über
  // die Mindestdauer-Schwelle oben: auch ein winziger Abstand zur Schwelle
  // muss ein Ereignis geben, sonst rechnete ein großer Sprung über den
  // Kipp-Punkt hinweg. Der +1-ms-Krümel schiebt das Ereignis strikt HINTER
  // die Schwelle -- sonst landet es in Fließkomma genau darauf und plant
  // sich endlos neu ein (der A-012-Fehlertyp).
  for (const [id, def] of BRENNSTOFF_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) continue;
    const an = brennstoffBereit(planet, def, level);
    for (const [resId, spec] of Object.entries(def.brennstoff)) {
      const proStunde = rate(spec, level);
      if (proStunde <= 0) continue;
      const vorrat =
        ((planet.ressourcen && planet.ressourcen[resId]) || 0) - verarbeitungsReserveFuer(planet, resId);
      const netto = lager[resId] || 0;
      let stunden = null;
      if (an && netto < 0) {
        // Brennt und zehrt: Ereignis, wenn der Vorrat die Zündschwelle
        // erreicht (knapp ÜBER der Reserve -- dort kippt das Tor, nicht erst
        // am Reserve-Anschlag).
        const zuendMenge = (proStunde * PUFFER_MINDESTDAUER_MS) / MS_PRO_STUNDE_STATE;
        stunden = (vorrat - zuendMenge) / -netto;
      } else if (!an && netto > 0) {
        // Erloschen, aber es läuft nach: Ereignis, wenn der Anlauf-Vorrat
        // beisammen ist (mit Hysterese-Bit die Anlaufmenge, ohne die
        // Zündmenge). Das Bit ist seit A-148 je Gebäude (id aus der
        // äußeren Schleife) -- siehe reaktorBitNachziehen.
        const zielMs = planet.brennstoffAus && planet.brennstoffAus[id] ? BRENNSTOFF_ANLAUF_MS : PUFFER_MINDESTDAUER_MS;
        const zielMenge = (proStunde * zielMs) / MS_PRO_STUNDE_STATE;
        stunden = (zielMenge - vorrat) / netto;
      }
      if (stunden === null) continue;
      stunden = Math.max(0, stunden) + 1 / MS_PRO_STUNDE_STATE;
      if (frueheste === null || stunden < frueheste) frueheste = stunden;
    }
  }

  // Der fossile Vorrat (A-147) ist binär wie der Brennstoff oben, aber OHNE
  // Hysterese und ohne Reserve: nur EIN Ereignis pro brennendem Gebäude ist
  // überhaupt möglich, der Moment, in dem der Vorrat auf 0 fällt (ein
  // bereits erloschenes Feld braucht keins mehr -- es springt nie wieder
  // an). Derselbe +1-ms-Krümel wie oben, aus demselben Grund.
  for (const [id, def] of FOSSIL_GEBAEUDE) {
    const level = (planet.gebaeude && planet.gebaeude[id]) || 0;
    if (level <= 0) continue;
    const vorrat = fossilVorratVon(planet);
    if (vorrat <= 0) continue;
    const proStunde = fossilVerbrauchProStunde(def, level);
    if (proStunde <= 0) continue;
    const stunden = vorrat / proStunde + 1 / MS_PRO_STUNDE_STATE;
    if (frueheste === null || stunden < frueheste) frueheste = stunden;
  }
  return frueheste;
}

// --- Lager ------------------------------------------------------------
// EIN gemeinsamer Pool pro Planet, keine Obergrenze je Ressource. Jede
// Ressource "wiegt" beim Einlagern unterschiedlich viel (lagerverbrauch,
// siehe data.js) -- so kollidieren Massengüter nicht mit Spurenelementen,
// ohne dass es mehrere Lagergebäude braucht.
export function lagerverbrauchVon(resId) {
  const def = RESSOURCEN[resId];
  return def && def.lagerverbrauch !== undefined ? def.lagerverbrauch : 1;
}

export function lagerKapazitaetGesamt(state, planet) {
  const basis = lagerkapazitaet(planet && planet.gebaeude ? planet.gebaeude.lagerhalle || 0 : 0);
  return Math.round(basis * kategorieBonus(state, "lager", fraktionVon(planet)));
}

export function lagerBelegung(planet) {
  if (!planet || !planet.ressourcen) return 0;
  let summe = 0;
  for (const resId of LAGER_RESSOURCEN) {
    summe += (planet.ressourcen[resId] || 0) * lagerverbrauchVon(resId);
  }
  return summe;
}

export function lagerFrei(state, planet) {
  return Math.max(0, lagerKapazitaetGesamt(state, planet) - lagerBelegung(planet));
}

// Wie lange reicht der Platz noch? (A-051)
//
// Die Antwort auf das A-023-Zurück: die Belegung im Frühspiel plateaut, eine
// Lagerhalle ist eine OFFLINE-Entscheidung -- und das ist in Ordnung. Was
// fehlte, war nur, dass das Spiel es SAGT.
//
// Gerechnet wird in Lagervolumen je Stunde, nicht in Tonnen: eine Tonne
// Antimaterie belegt fünfundzwanzigmal so viel wie eine Tonne Metall. Wer
// Tonnen addierte, bekäme eine Zahl, die mit dem Regal nichts zu tun hat.
//
// DIE RATEN MÜSSEN DIE EFFEKTIVEN SEIN, nicht die Rohraten -- die Falle aus
// dem Auftrag. Bei Strommangel fördert eine gedrosselte Mine weniger, und
// eine Prognose aus Nennleistung verspräche ein volles Lager, das nie kommt.
// Deshalb nimmt diese Funktion die Raten ENTGEGEN, statt sie selbst zu
// holen: der Aufrufer hat sie ohnehin, und so kann kein zweiter Weg zu einer
// anderen Wahrheit entstehen.
//
// Rückgabe in Stunden, oder `null` -- und `null` heißt „keine Angabe", nicht
// „nie". Eine Zeile, die fehlt, ist ehrlicher als ein „∞", das wie eine
// Auskunft aussieht.
export function lagerVollInStunden(state, planet, lagerRaten) {
  const frei = lagerFrei(state, planet);
  if (frei <= 0) return 0; // schon voll -- das ist eine Angabe, keine Prognose
  let zuflussProStunde = 0;
  for (const resId of LAGER_RESSOURCEN) {
    zuflussProStunde += (lagerRaten[resId] || 0) * lagerverbrauchVon(resId);
  }
  if (zuflussProStunde <= 0) return null;
  return frei / zuflussProStunde;
}

// Eigene Speicherkapazität einer Ressource, gespeist aus EINEM bestimmten
// Gebäude statt aus dem gemeinsamen Warenlager (RESSOURCEN[x].speicher).
//
// Bewusst allgemein gehalten, nicht als "Wohnraum" fest verdrahtet: die
// geplanten Energiebatterien sind derselbe Fall (eigenes Gebäude, eigene
// Obergrenze, kein Anteil am Lagerpool). Einmal gebaut, zwei Nutzer.
// Ressourcen ohne speicher-Eintrag sind unbegrenzt -- für sie gilt weiterhin
// allein der gemeinsame Pool.
export function speicherKapazitaetFuerLevel(resId, level) {
  const def = RESSOURCEN[resId];
  if (!def || !def.speicher) return Infinity;
  // Ohne `abLevel` trägt schon Stufe 0 die Basiskapazität -- das ist beim
  // Wohnmodul gewollt (die Startbevölkerung muss irgendwo wohnen). Beim
  // Energiespeicher wäre es falsch: ohne gebauten Speicher gibt es keinen.
  if (def.speicher.abLevel && level < def.speicher.abLevel) return 0;
  return Math.round(def.speicher.basis * Math.pow(def.speicher.faktor, Math.max(0, level)));
}

export function speicherKapazitaet(planet, resId) {
  const def = RESSOURCEN[resId];
  if (!def || !def.speicher) return Infinity;
  const level = planet && planet.gebaeude ? planet.gebaeude[def.speicher.gebaeude] || 0 : 0;
  return speicherKapazitaetFuerLevel(resId, level);
}

// Welche Ressource bekommt ihre Kapazität aus diesem Gebäude? Für die Anzeige:
// ein Wohnmodul produziert nichts und sähe sonst nutzlos aus.
export function speicherRessourceVon(gebaeudeId) {
  for (const def of Object.values(RESSOURCEN)) {
    if (def.speicher && def.speicher.gebaeude === gebaeudeId) return def.id;
  }
  return null;
}

// --- Was die NÄCHSTE Ausbaustufe zusätzlich bringt (A-087) ----------------
//
// DER BEZUG IST `ziel - 1`, NICHT DIE HEUTIGE STUFE. Solange ein Bau läuft,
// sind das zwei verschiedene Zahlen: `naechstesGebaeudeLevel` zählt die
// Warteschlange mit (Ziel 2, während Stufe 1 gebaut wird), die heutige Stufe
// steht dabei noch auf 0. Kosten und Bauzeit rechneten immer mit `ziel`; die
// Zuwachs-Zeilen der Kachel nahmen die heutige Stufe als Basis -- und zeigten
// damit den Sprung von 0 auf 2 statt von 1 auf 2. Gemessen an einem
// Kraftwerk: „+11.520 MW · −1.322 AK" im Bau gegen „+6.720 MW · −747 AK"
// danach, bei identischen Kosten und identischer Dauer.
//
// Die Rechnung steht hier und nicht in der Oberfläche, weil sie eine Aussage
// über die WELT ist (was bringt diese Stufe) und weil sie sonst nicht prüfbar
// wäre: ui.js läuft in keinem Test.
export function ausbauVorschau(state, planet, def, ziel) {
  const basis = Math.max(0, ziel - 1);
  // A-133: dieselbe Fraktion wie in rohRaten/produktionsAufloesung. `planet`
  // ist hier eine UI-Vorschau und darf `null` sein (fraktionVon fällt dann
  // auf den Spieler zurück -- die Vorschau ist ohnehin nur seine Oberfläche).
  const fraktion = fraktionVon(planet);
  const bonus = def.kategorie ? kategorieBonus(state, def.kategorie, fraktion) : 1;
  const zuwachs = (spec) => rate(spec, ziel) - rate(spec, basis);

  const produktion = {};
  for (const [resId, spec] of Object.entries(def.produktion || {})) {
    if (resId === "energie") continue; // steht separat als ⚡
    // Planetare Affinität gehört zwingend hinein: auf einer Vulkanwelt bringt
    // dieselbe Iridiummine fast das Doppelte.
    const affin = planet ? affinitaetFaktor(planet, resId) : 1;
    const mehr = zuwachs(spec) * bonus * affin;
    if (mehr > 0) produktion[resId] = Math.round(mehr);
  }
  const verbrauch = {};
  for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
    if (resId === "energie") continue;
    // A-116: derselbe Faktor wie in rohRaten/produktionsAufloesung -- sonst
    // verspricht die Kachel einen Verbrauch, den die Anlage danach
    // überschreitet.
    const mehr = zuwachs(spec) * verbrauchsBonusFaktor(state, def, resId, fraktion);
    if (mehr > 0) verbrauch[resId] = Math.round(mehr);
  }
  // A-114: Der Brennstoff des Kraftwerks steht in `def.brennstoff`, einem
  // EIGENEN Block neben `verbrauch` (A-055, Weg B: der Abzug läuft beim
  // Fortschreiben der Planetenuhr, nicht in der Ratenrechnung -- sonst
  // entstünde ein Fluss-Kreis). Die Vorschau kannte diesen Block bisher nicht
  // und verschwieg damit die teuerste laufende Position des Gebäudes.
  // Gerechnet wie `verbrauch`: derselbe Zuwachs, OHNE `kategorieBonus` und
  // ohne Affinität -- dieselbe Begründung wie bei den übrigen
  // Verbrauchsposten.
  const brennstoff = {};
  for (const [resId, spec] of Object.entries(def.brennstoff || {})) {
    const mehr = zuwachs(spec);
    if (mehr > 0) brennstoff[resId] = Math.round(mehr);
  }
  // A-075: Der Handelsposten ist die einzige Anlage, deren EINNAHME nicht in
  // data.js steht -- sie hängt an der Bevölkerung und nicht an der Stufe. Die
  // Vorschau las deshalb nur `def.verbrauch.credits` ab, also die halbe
  // Wahrheit: ein Minus vor den Credits an einem Gebäude, das welche
  // einbringt (Tobis Meldung 18.08.).
  //
  // Das Vorzeichen kommt jetzt aus dem WERT und nicht aus der Zeile, in der er
  // zufällig steht: netto positiv -> Ertragszeile, netto negativ ->
  // Kostenzeile. Dass beides vorkommt, IST das Design -- unter rund 36.000
  // Einwohnern trägt sich schon die erste Stufe nicht.
  if (planet && def.id === "handelsposten") {
    const netto = Math.round(
      handelsAbgaben(planet, ziel) -
        handelsAbgaben(planet, basis) -
        zuwachs(def.verbrauch && def.verbrauch.credits) * verbrauchsBonusFaktor(state, def, "credits", fraktion)
    );
    delete verbrauch.credits;
    if (netto > 0) produktion.credits = netto;
    else if (netto < 0) verbrauch.credits = -netto;
  }

  const speicherRes = speicherRessourceVon(def.id);
  return {
    // Nettobilanz: was die Stufe erzeugt, minus was sie zieht. Der
    // Verbrauchsteil trägt seit A-116 denselben verbrauchsBonusFaktor wie die
    // übrigen Verbrauchsposten (bei Kraftwerk/Solarfeld ist er 1, siehe dort).
    energie:
      zuwachs(def.produktion && def.produktion.energie) -
      zuwachs(def.verbrauch && def.verbrauch.energie) * verbrauchsBonusFaktor(state, def, "energie", fraktion),
    produktion,
    verbrauch,
    brennstoff,
    speicherRes,
    speicher: speicherRes
      ? speicherKapazitaetFuerLevel(speicherRes, ziel) - speicherKapazitaetFuerLevel(speicherRes, basis)
      : 0,
  };
}

// Was ein Planet von einer Ressource höchstens halten darf: die strengere von
// eigener Speicherkapazität und selbstgesetzter Annahmeregel.
export function aufnahmeGrenzeFuer(planet, resId) {
  return Math.min(lagerLimitFuer(planet, resId), speicherKapazitaet(planet, resId));
}

// Optionale, pro Planet konfigurierte Annahmegrenze für eine Ressource.
// Ohne Eintrag: keine individuelle Grenze (nur die gemeinsame Kapazität zählt).
export function lagerLimitFuer(planet, resId) {
  const wert = planet && planet.lagerRegeln ? planet.lagerRegeln[resId] : undefined;
  return wert === undefined || wert === null ? Infinity : wert;
}

export function lagerRegelSetzen(planet, resId, maxMenge) {
  // Dieselbe Lücke wie bei der Verarbeitungsreserve (A-066), gefunden beim
  // Nachsehen bei den Geschwistern: derselbe Fehlertyp an drei Stellen ist
  // in diesem Projekt die Regel, nicht die Ausnahme.
  if (!planet.lagerRegeln) planet.lagerRegeln = {};
  if (maxMenge === null || maxMenge === undefined || !Number.isFinite(maxMenge)) {
    delete planet.lagerRegeln[resId];
  } else {
    planet.lagerRegeln[resId] = Math.max(0, maxMenge);
  }
}

// Nimmt dieser Planet gerade noch etwas von dieser Ressource an? Für Routen
// und Automatisierung gedacht, die vorher wissen wollen, ob sich ein Halt lohnt.
export function lagerNimmtAn(state, planet, resId, menge = 1) {
  if (lagerverbrauchVon(resId) <= 0) return lagerLimitFuer(planet, resId) > (planet.ressourcen[resId] || 0);
  const frei = lagerFrei(state, planet);
  const limit = lagerLimitFuer(planet, resId);
  const platzLimit = limit === Infinity ? Infinity : limit - (planet.ressourcen[resId] || 0);
  return Math.min(frei / lagerverbrauchVon(resId), platzLimit) >= Math.min(menge, 1);
}

// --- Wie lange, bis das fehlende Material da ist? (A-065) ------------------
//
// Herkunft: die Preisfrage aus A-050. Die Schirm-Elektronik braucht bei einer
// Fertigung der Stufe 1 rund 25 Stunden, das Fenster nach dem Blitz ist etwa
// 24 -- „exakt nicht genug", und nichts im Spiel sagte es. Diese Funktion
// sagt es (Prinzip 10a), ohne eine einzige Zahl der Balance anzufassen.
//
// DIE RATEN KOMMEN VON AUSSEN, wie bei `lagerVollInStunden` (A-051), und aus
// demselben Grund doppelt:
//   - Es müssen die EFFEKTIVEN sein. Eine Prognose aus Nennleistung
//     verspräche Material, das bei Strommangel nie ankommt.
//   - Der Aufrufer hat sie ohnehin. Diese Rechnung steht auf JEDER Kachel;
//     holte sie sich die Auflösung selbst, liefe sie je Bildaufbau ein
//     Dutzend Mal statt einmal (der A-030-Fehlertyp).
//
// Gerechnet wird mit der NETTORATE (`raten.lager`), nicht mit der Produktion:
// wenn eine Verarbeitungskette die Elektronik gleich wieder auffrisst, kommt
// beim Bauvorrat nichts an, und genau das soll dastehen.
//
// `stunden: null` heißt „es kommt nichts nach". Das ist bewusst kein
// Unendlich und kein „nie" -- dieselbe Regel wie bei der Lagerprognose: was
// man nicht weiß, sagt man nicht, und eine Zahl ohne Deckung sieht aus wie
// eine Auskunft.
export function beschaffungsZeiten(planet, kosten, lagerRaten) {
  const offen = [];
  for (const [resId, betrag] of Object.entries(kosten || {})) {
    const bestand = (planet && planet.ressourcen && planet.ressourcen[resId]) || 0;
    const fehlt = betrag - bestand;
    // Was auf Lager liegt, ist keine Frage mehr. Auch der Gleichstand nicht:
    // genau so viel wie nötig REICHT.
    if (fehlt <= 0) continue;
    const proStunde = (lagerRaten && lagerRaten[resId]) || 0;
    offen.push({ resId, fehlt, proStunde, stunden: proStunde > 0 ? fehlt / proStunde : null });
  }
  return offen;
}


// --- „Diese Welt in Zahlen" (A-064) ---------------------------------------
//
// EIN Aufruf, EIN Datenobjekt. Der Übersichtsblock zeigt fünf Gruppen
// nebeneinander, und jede einzelne davon bräuchte für sich genommen die
// Produktionsauflösung. Fünfmal je Takt wäre genau der Fehlertyp aus A-030:
// nicht eine teure Rechnung, sondern eine mittlere, die zu oft läuft.
// Deshalb rechnet DIESE Funktion `produktionsAufloesung` genau einmal und
// reicht alles Abgeleitete fertig heraus.
//
// Sie gibt REINE DATEN zurück, keinen Text: Sprache, Einheiten und
// Dauerformat gehören in die Oberfläche, die Rechnung gehört hierher, wo
// Tests sie erreichen (die Auftragsvorgabe „prüfbare Schicht").
//
// Was hier NICHT steht: die laufenden Aufträge (Bau/Forschung/Werft). Die
// sind keine Rechnung, sondern drei Felder am Zustand, und ihre Restzeit hat
// in `kopfZeitText` bereits genau eine Stelle -- eine zweite wäre der
// Doppelpflege-Fehler, an dem dieses Projekt mehrfach hing.
export function planetUebersicht(state, planet) {
  const aussenposten = !planet || planet.typ === "aussenposten";
  const raten = produktionsAufloesung(state, planet);
  const menschen = (planet && planet.ressourcen && planet.ressourcen.bevoelkerung) || 0;
  const platz = planet ? speicherKapazitaet(planet, "bevoelkerung") : 0;

  // --- 1. Standort --------------------------------------------------------
  const klasseDef = planet && planet.klasse ? PLANETEN_KLASSEN[planet.klasse] : null;
  const wasserDef = planet && planet.wasser ? WASSER_STUFEN[planet.wasser] : null;
  // Reihenfolge aus der Ressourcentabelle, nicht nach Größe sortiert: eine
  // Liste, die ihre Reihenfolge nach Werten wählt, springt beim ersten
  // Terraforming um. Fester Platz schlägt schöne Sortierung (Prinzip 8).
  const affinitaeten = [];
  const tabelle = planetAffinitaet(planet);
  for (const resId of LAGER_RESSOURCEN) {
    const wert = tabelle[resId];
    // 1 heißt „nichts Besonderes" und braucht keine Zeile. Die 0 dagegen ist
    // die wichtigste Zahl der Gruppe -- „gibt es hier nicht" (siehe
    // affinitaetFaktor), und sie MUSS sichtbar sein.
    if (typeof wert !== "number" || Math.abs(wert - 1) < 0.005) continue;
    affinitaeten.push({ resId, faktor: wert });
  }

  const standort = {
    klasse: klasseDef ? klasseDef.id : null,
    klasseName: klasseDef ? klasseDef.name : null,
    zone: (planet && planet.zone) || null,
    wasser: wasserDef ? wasserDef.id : null,
    wasserName: wasserDef ? wasserDef.name : null,
    orbit: planet ? planet.orbit : null,
    schwerkraft: schwerkraftVon(planet),
    bauFaktor: bauKostenFaktor(planet),
    startFaktor: startKostenFaktor(planet),
    affinitaeten,
  };

  // --- 4a. Bevölkerung (vor dem Lager: der Wohnraum braucht ihre Rate) -----
  //
  // Das Wachstum ist ein SCHRITT alle `schrittMs`, keine Rate -- hier wird es
  // in eine Stundenrate umgerechnet, damit es neben den anderen Zahlen steht.
  // Die drei Fälle sind dieselben wie in bevoelkerungSchritt (simulation.js),
  // und das ist Absicht: eine Anzeige, die anders rechnet als die Simulation,
  // ist eine Lüge mit Nachkommastellen.
  const versorgt = (raten.drosselung.nahrung === undefined ? 1 : raten.drosselung.nahrung) >= 1;
  // Stundenrate ist eine MOMENTAUFNAHME (Rate zum aktuellen Bestand), keine
  // exakte Vorhersage: proportionales Wachstum beschleunigt mit dem Bestand,
  // eine lineare Hochrechnung daraus ist deshalb bei `stundenBisDeckel` unten
  // leicht zu hoch gegriffen -- akzeptiert für eine Übersichtsschätzung.
  const proStundeFaktor = MS_PRO_STUNDE_STATE / BEVOELKERUNG.schrittMs;
  let wachstumProStunde = 0;
  if (!aussenposten && menschen > 0) {
    if (!versorgt) {
      wachstumProStunde = -menschen * bevoelkerungsSchrittFaktor(BEVOELKERUNG.basisRateJahr) * proStundeFaktor;
    } else if (menschen < platz) {
      wachstumProStunde = menschen * bevoelkerungsSchrittFaktor(bevoelkerungsWachstumsrate(planet)) * proStundeFaktor;
    }
  }
  const bevoelkerung = {
    menschen,
    platz,
    versorgt,
    proStunde: wachstumProStunde,
    // Nur wenn sie wirklich wächst und der Deckel endlich ist. Sonst null --
    // „nie" wäre eine Auskunft, die niemand geprüft hat (A-051-Regel).
    stundenBisDeckel:
      wachstumProStunde > 0 && Number.isFinite(platz) ? (platz - menschen) / wachstumProStunde : null,
  };

  // --- 2. Bestände & Kapazitäten ------------------------------------------
  //
  // „Lager" heißt hier: die SPEICHER dieser Welt, nicht die Bestandsliste
  // (die steht seit A-052 vollständig in der Ressourcenleiste, und sie ein
  // zweites Mal zu zeigen wäre Doppelpflege statt Übersicht). Das gemeinsame
  // Warenlager rechnet in Volumen, die beiden Einzelspeicher in ihrer
  // eigenen Einheit -- die A-051-Funktion bleibt die eine Prognose fürs
  // Warenlager.
  const kapazitaet = lagerKapazitaetGesamt(state, planet);
  const belegt = lagerBelegung(planet);
  // A-112: die ANGEZEIGTE Rate je Lagerressource, EINMAL für den ganzen Block
  // gerechnet -- `raten.lager` abzüglich des momentanen Verderbverlusts
  // (`sichtbareRate`). Speicherzeile, Lagerprognose und Flüsse-netto lesen
  // alle von hier, damit dieselbe Nettorate nicht drei zweite Rechenwege
  // bekommt (Regelwerk B3).
  const lagerAnzeige = {};
  for (const resId of LAGER_RESSOURCEN) lagerAnzeige[resId] = sichtbareRate(raten.lager, raten.verderb, resId);
  const speicher = [];
  for (const def of Object.values(RESSOURCEN)) {
    if (!def.speicher) continue;
    const eigen = speicherKapazitaet(planet, def.id);
    const bestand = (planet && planet.ressourcen && planet.ressourcen[def.id]) || 0;
    // Woher die Nettorate kommt, hängt an der Art: Fluss-Speicher (Energie)
    // laden aus `fluss`, die Bevölkerung wächst in Schritten und hat gar
    // keine Rate in der Auflösung.
    const netto =
      def.id === "bevoelkerung"
        ? wachstumProStunde
        : def.art === "fluss"
          ? raten.fluss[def.id] || 0
          : lagerAnzeige[def.id] || 0;
    speicher.push({
      resId: def.id,
      bestand,
      kapazitaet: eigen,
      netto,
      vollInStunden:
        netto > 0 && Number.isFinite(eigen) && eigen > bestand ? (eigen - bestand) / netto : null,
    });
  }
  const lager = {
    belegt,
    kapazitaet,
    frei: Math.max(0, kapazitaet - belegt),
    vollInStunden: aussenposten ? null : lagerVollInStunden(state, planet, lagerAnzeige),
    speicher,
  };

  // --- 3. Flüsse netto ----------------------------------------------------
  const fluesse = [];
  for (const resId of LAGER_RESSOURCEN) {
    const produktion = raten.produktion[resId] || 0;
    const verbrauch = raten.verbrauch[resId] || 0;
    // Wo weder produziert noch verbraucht wird, gibt es nichts zu berichten.
    // Eine Zeile „0" für jede Ressource wäre der Nullzustand als Phantasie.
    //
    // A-154: EIN Fall bricht das -- eine Anlage, die vollständig auf die
    // Zielmenge heruntergeregelt ist (Regime C, Nennbedarf 0), liest hier
    // GENAUSO wie "nichts los" und würde spurlos verschwinden. Das ist
    // genau der A-050/A-061-Fehlertyp ("ein gedrosselter Fluss nennt seinen
    // Grund"), nur unsichtbar statt falsch: eine Anlage, die still weniger
    // tut, ohne es zu sagen. `maxDrosselAktiv` hält die Zeile deshalb am
    // Leben, auch bei produktion=verbrauch=0.
    const maxGedrosselt = maxDrosselAktiv(planet, resId, raten.drosselung);
    if (produktion === 0 && verbrauch === 0 && !maxGedrosselt) continue;
    fluesse.push({
      resId,
      produktion,
      verbrauch,
      netto: lagerAnzeige[resId] || 0,
      drosselung: raten.drosselung[resId] === undefined ? 1 : raten.drosselung[resId],
      // A-154: unterscheidet den Grund fürs Anzeige-Wort -- Regime C ist
      // die ABSICHTLICHE Zielmenge (kein Mangel, keine Warnfarbe), Regime B
      // ein echter Engpass. Beide teilen sich `drosselung`, siehe
      // maxDrosselAktiv.
      maxGedrosselt,
    });
  }

  const brennstoffMs = planet ? brennstoffReichweiteMs(planet) : Infinity;
  const energie = {
    produktion: raten.produktion.energie || 0,
    verbrauch: raten.verbrauch.energie || 0,
    // Die BILANZ, nicht die Batterierate. `raten.fluss.energie` ist, was der
    // Speicher gerade lädt oder trägt -- bei leerem Speicher und Mangel ist
    // sie exakt 0, und genau dann stünde hier "0 erzeugt · 6.000 gebraucht ·
    // ±0 MW". Für eine Übersicht ist das die falsche Zahl: gefragt ist, wie
    // weit es reicht, nicht was die Batterie tut (die steht in der
    // Ressourcenleiste).
    netto: (raten.produktion.energie || 0) - (raten.verbrauch.energie || 0),
    effizienz: raten.effizienz,
    // Infinity heißt „nichts verbrennt hier" -- als null weitergereicht,
    // damit die Anzeige nicht „unendlich Stunden Brennstoff" behauptet.
    brennstoffStunden: Number.isFinite(brennstoffMs) ? brennstoffMs / MS_PRO_STUNDE_STATE : null,
    // Die BEDINGUNG dieser Reichweite (A-088): der Verbrauch, an dem sie
    // hängt. Ohne ihn steht in der Übersicht eine Dauer, die man weder
    // nachrechnen noch auf die nächste Ausbaustufe umrechnen kann.
    brennstoffRaten: planet ? brennstoffProStunde(planet) : {},
  };
  const arbeitskraft = {
    produktion: raten.produktion.arbeitskraft || 0,
    verbrauch: raten.verbrauch.arbeitskraft || 0,
  };
  arbeitskraft.frei = arbeitskraft.produktion - arbeitskraft.verbrauch;
  // A-155: Beschäftigungsquote aus denselben zwei Zahlen -- 1 (voll
  // beschäftigt) ohne Arbeitskraftbedarf, damit eine Welt ohne Anlagen nicht
  // als "leerlaufend" gilt.
  arbeitskraft.quote =
    arbeitskraft.produktion > 0 ? arbeitskraft.verbrauch / arbeitskraft.produktion : 1;
  arbeitskraft.diebstahlAnteil = arbeitskraftDiebstahlAnteil(arbeitskraft.quote);

  // --- 4b. Anstehende Freischalt-Schwellen --------------------------------
  //
  // ANSTEHEND heißt: noch nicht erfüllt. Eine erfüllte Schwelle ist keine
  // Auskunft mehr, sondern Grundrauschen -- und der Auftrag will genau die
  // Zahl sichtbar machen, an der man gerade hängt („Werft: 41.500 / 60.000").
  // Reihenfolge ist die der Gebäudetabelle und damit fest.
  const schwellen = [];
  if (!aussenposten) {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.bevoelkerungAb && menschen < def.bevoelkerungAb) {
        schwellen.push({
          id,
          name: def.name,
          art: "bevoelkerung",
          ist: menschen,
          soll: def.bevoelkerungAb,
        });
      }
      if (def.benoetigt && def.benoetigt.forschung) {
        const stufe = (state.forschung && state.forschung[def.benoetigt.forschung]) || 0;
        if (stufe < 1) {
          schwellen.push({
            id,
            name: def.name,
            art: "forschung",
            techId: def.benoetigt.forschung,
            techName: RESEARCH[def.benoetigt.forschung].name,
            ist: stufe,
            soll: 1,
          });
        }
      }
    }
  }

  return { aussenposten, standort, lager, fluesse, energie, arbeitskraft, bevoelkerung, schwellen };
}


// --- Schiffe --------------------------------------------------------------
// Ladekapazität eines Frachters, durch Frachttechnik steigerbar.
export function frachtKapazitaet(state) {
  const bonus = 1 + (state.forschung.frachttechnik || 0) * RESEARCH.frachttechnik.kapazitaetProLevel;
  return Math.round(SCHIFFE.frachter.kapazitaet * bonus);
}

// Höhere Werftstufen bauen schneller.
export function werftTempo(planet) {
  const stufe = (planet.gebaeude && planet.gebaeude.werft) || 0;
  return stufe <= 0 ? 0 : 1 + (stufe - 1) * 0.25;
}

// Forschungslabor beschleunigt, ist aber -- anders als die Werft -- kein
// Zwang: ohne Labor bleibt es bei 1x, damit alte Spielstände nicht brechen.
// Der Forschungsfluss EINES Planeten: was seine Labore gerade wirklich
// erzeugen, inklusive aller Drosselungen.
export function forschungsFlussPlanet(state, planet) {
  return produktionsAufloesung(state, planet).produktion.forschung || 0;
}

// Der Forschungsfluss des ganzen Imperiums. Bis v0.5 zählte nur das Labor auf
// dem einen Planeten, der die Forschung bezahlt hatte -- ein Labor auf einer
// Kolonie war schlicht wirkungslos, solange man von der Heimatwelt aus
// geklickt hat. Seit v0.6 addieren sie sich, und damit wird die Frage "wo
// baue ich Labore" zum ersten Mal eine echte.
export function forschungsFluss(state, fraktionId = SPIELER_FRAKTION) {
  let summe = 0;
  for (const planet of planetenVon(state, fraktionId)) {
    summe += forschungsFlussPlanet(state, planet);
  }
  return summe;
}

// WAS BREMST DIE FORSCHUNG GERADE? (A-061, Prinzip 10a)
//
// Der Laborbedarf drosselt wie jeder andere Eingangsstoff -- und eine
// Forschung, die plötzlich halb so schnell läuft, ohne dass irgendwo steht
// warum, ist genau der Fall aus A-050 („läuft nicht WEIL"). Geliefert werden
// die Ressourcen-IDs, nicht fertiger Text: die Übersetzung gehört der
// Oberfläche.
//
// Gefragt wird nur bei LAUFENDER Forschung. Ohne Projekt fließt nichts, also
// bremst auch nichts -- eine Warnung dort wäre die Strafsteuer-Anmutung, die
// der Auftrag ausdrücklich vermeiden will.
export function laborbedarfKnapp(state, fraktionId = SPIELER_FRAKTION) {
  if (!state.forschungsQueue) return [];
  const knapp = new Set();
  for (const planet of planetenVon(state, fraktionId)) {
    const def = BUILDINGS.forschungslabor;
    const level = (planet.gebaeude && planet.gebaeude.forschungslabor) || 0;
    if (level <= 0) continue;
    const aufloesung = produktionsAufloesung(state, planet);
    for (const resId of def.nurBeiForschung || []) {
      if (!verbrauchAb(def, resId, level)) continue;
      if ((aufloesung.drosselung[resId] ?? 1) < 0.999) knapp.add(resId);
    }
  }
  return [...knapp];
}

// Hat diese Fraktion überhaupt ein Labor? Für die Sperre am Forschungsknopf:
// ein leeres Imperium darf nicht ewig auf einen Fortschritt warten, der nie
// kommt (Prinzip 10a -- Blockiertes erklärt sich selbst).
export function hatLabor(state, fraktionId = SPIELER_FRAKTION) {
  return planetenVon(state, fraktionId).some((p) => (p.gebaeude && p.gebaeude.forschungslabor) > 0);
}

export function schiffeFrei(planet, schiffId) {
  return (planet.schiffe && planet.schiffe[schiffId]) || 0;
}

export function handelVerfuegbar(planet) {
  return !!planet && planet.typ !== "aussenposten" && (planet.gebaeude.handelsposten || 0) >= 1;
}

// Wiederkehrende Flottenrouten sind ein Fortschrittsziel, kein Standard --
// frühes Spiel bleibt dadurch zwangsläufig manuell.
export function automatisierungFreigeschaltet(state) {
  return (state.forschung.automatisierungstechnik || 0) >= 1;
}

export function logistiknetzFreigeschaltet(state) {
  return (state.forschung.logistiknetzwerk || 0) >= 1;
}

export function logistikMindestbestandSetzen(planet, resId, menge) {
  // Dritte Stelle desselben Musters (A-066).
  if (!planet.logistikMindestbestand) planet.logistikMindestbestand = {};
  if (menge === null || menge === undefined || !Number.isFinite(menge) || menge <= 0) {
    delete planet.logistikMindestbestand[resId];
  } else {
    planet.logistikMindestbestand[resId] = menge;
  }
}

export function flotteById(state, id) {
  return state.flotten.find((f) => f.id === id);
}

// Flotten, die gerade an diesem Planeten liegen.
export function flottenImHafen(state, planetId) {
  return state.flotten.filter((f) => f.dockPlanet === planetId);
}

// --- Reichweite -----------------------------------------------------------
// Antriebstechnik ist bewusst nicht entdeckungsabhängig: Reichweite muss
// immer erweiterbar bleiben, sonst könnte ein ferner Schlüssel aussperren.
export function maxReichweite(state) {
  return REICHWEITE.basis + (state.forschung.antriebstechnik || 0) * REICHWEITE.proAntriebsstufe;
}

// Nächstgelegener eigener Stützpunkt -- Außenposten zählen mit. Dadurch wird
// Nähe zu eigenem Besitz Teil des Spiels, ohne Sonderregel.
// FEHLER, gefunden am 16.08.2026 beim Bau des Marktes und behoben in v0.61:
// die Schleife lief über state.planeten statt über planetenVon(state). Darin
// stehen seit v0.42 auch die Welten der fremden Imperien -- in jedem System,
// in dem irgendwer sitzt, fand die Funktion deshalb DESSEN Planeten in
// Entfernung 0 und meldete "eigener Stützpunkt direkt daneben".
//
// Sichtbar war das in der Galaxieliste: fremde Systeme standen dort mit
// "Entfernung 0.0" ganz oben, die Sortierung nach Nähe war wertlos, und
// systemErreichbar meldete für ein System in 121,6 Einheiten "erreichbar",
// obwohl die Reichweite 30 betrug.
//
// Warum die Korrektur trotz ihrer Reichweite ungefährlich ist: Missionen
// hängen NICHT hieran, sondern am Treibstoff (kannBefehlen). Betroffen sind
// die Galaxieansicht und der Markt -- beide waren vorher schlicht falsch.
export function naechsteBasis(state, systemId, fraktionId = SPIELER_FRAKTION) {
  let beste = null;
  for (const planet of planetenVon(state, fraktionId)) {
    const d = entfernung(state.galaxie.seed, planet.systemId, systemId);
    if (!beste || d < beste.entfernung) beste = { planet, entfernung: d };
  }
  return beste;
}

// Hat der Spieler in diesem System schon etwas aufgedeckt?
//
// NICHT "gibt es einen systemZustand-Eintrag" -- das war die alte Prüfung und
// sie war falsch. In systemZustand landet JEDE Änderung an einem Orbit, auch
// die Niederlassung einer fremden Fraktion beim Weltstart (setzeOrbitZustand
// mit fraktionId). Die Galaxieliste meldete deshalb "besucht" an Systemen, in
// denen der Spieler nie war -- Tobis Meldung von v0.41, die auf dem
// Spielzweig behoben, im Entwicklungszweig aber nie angekommen ist.
//
// Was zählt, ist eine echte Aufdeckung: `entdeckt` setzt nur eine Erkundungs-
// oder Bergungsmission.
// --- Supernova (v0.70) -----------------------------------------------------
// Sucht den Stern, der in der vorgesehenen Entfernung steht, und legt die
// beiden Termine fest. Beide Zeiten sind GERECHNET:
//   Kollaps  aus der Vorwarnung, die die Neutrinomessung hergibt
//   Flut     aus t ≈ L²/D, also aus der Entfernung selbst
// Wer die Entfernung in data.js ändert, verschiebt damit automatisch die
// zweite Frist -- niemand muss zwei Zahlen von Hand im Gleichklang halten.
export function supernovaAnlegen(seed, galaxie, jetzt) {
  const zielEinheiten = SUPERNOVA.entfernungLj / LJ_PRO_EINHEIT;
  let bester = null;
  for (let id = 1; id <= galaxie.anzahlSysteme; id++) {
    if (id === galaxie.heimatSystem) continue;
    const d = entfernung(seed, galaxie.heimatSystem, id);
    const abweichung = Math.abs(d - zielEinheiten);
    if (!bester || abweichung < bester.abweichung) bester = { id, d, abweichung };
  }
  if (!bester) return null;

  const kollapsZeit = jetzt + jahreInMs(SUPERNOVA.jahreBisKollaps);
  return {
    systemId: bester.id,
    entfernung: bester.d,
    kollapsZeit,
    flutZeit: kollapsZeit + jahreInMs(supernovaFlutJahre()),
    // "vorwarnung" -> "blitz" -> "flut". Der Phasenwechsel passiert in der
    // Zeitsimulation, nicht hier.
    phase: "vorwarnung",
    // Ist die Ozonschicht gerade zerstört? Ein SCHALTER, kein Verlauf --
    // siehe SUPERNOVA.ozonErholungJahre in data.js. Solange er an ist, wächst
    // auf ungeschützten Welten nichts.
    ozonKaputt: false,
    // Zeitpunkt, zu dem sich das Ozon erholt hätte. Wird beim Blitz gesetzt.
    ozonZeit: null,
  };
}

// Wächst auf diesem Planeten gerade etwas? Alles, was Sonnenlicht braucht,
// steht still, solange das Ozon zerstört ist -- es sei denn, ein Schirm hält
// die Welt (kommt in einem späteren Schritt).
export function sonnenlichtNutzbar(state) {
  return !(state.supernova && state.supernova.ozonKaputt);
}

// Verbleibende Zeit bis zum nächsten Ereignis, in Millisekunden. Negativ
// heißt: schon vorbei.
export function supernovaRestMs(state, jetzt) {
  const sn = state.supernova;
  if (!sn) return null;
  if (sn.phase === "vorwarnung") return sn.kollapsZeit - jetzt;
  if (sn.phase === "blitz") return sn.flutZeit - jetzt;
  return null;
}

// --- Sprungrouten (v0.68) --------------------------------------------------
// Ein System, in dem ein Anker steht, ist per Sprung erreichbar. Eines ohne
// verlangt einen Erstflug mit Unterlichtgeschwindigkeit -- siehe SPRUNGROUTEN
// in data.js und LORE-PHYSIK Abschnitt 6.
//
// Das Heimatsystem hat seinen Anker von Anfang an: dort steht die
// Zivilisation, die den Antrieb überhaupt gebaut hat.
//
// `state.routen` kann in ALTEN Spielständen fehlen. Dann gilt nur die Heimat
// als vermessen -- das ist die konservative Annahme und kostet niemanden
// mehr als einen Erstflug, den er ohnehin machen müsste.
export function hatSprungroute(state, systemId) {
  if (systemId === state.galaxie.heimatSystem) return true;
  return !!(state.routen && state.routen[systemId]);
}

export function sprungrouteSetzen(state, systemId) {
  if (!state.routen) state.routen = {};
  state.routen[systemId] = true;
}

export function systemBesucht(state, systemId) {
  const zustand = state.systemZustand[systemId];
  if (!zustand) return false;
  return Object.values(zustand).some((o) => o && o.entdeckt);
}

export function untersuchteOrbits(state, systemId) {
  const zustand = state.systemZustand[systemId];
  if (!zustand) return 0;
  return Object.values(zustand).filter((o) => o && o.entdeckt).length;
}

export function systemErreichbar(state, systemId, fraktionId = SPIELER_FRAKTION) {
  const naechste = naechsteBasis(state, systemId, fraktionId);
  return !!naechste && naechste.entfernung <= maxReichweite(state);
}

// --- Forschung ------------------------------------------------------------
export function forschungVerfuegbar(state, forschungId) {
  const def = RESEARCH[forschungId];
  if (!def.nurDurchEntdeckung) return true;
  return !!state.forschungFreigeschaltet[forschungId];
}

// A-134: fraktionsgebunden wie hatLabor -- Vorgabe SPIELER_FRAKTION hält
// jeden bestehenden Zweiparameter-Aufruf unverändert.
export function forschungVoraussetzungenErfuellt(state, forschungId, fraktionId = SPIELER_FRAKTION) {
  return voraussetzungenErfuellt(forschungVon(state, fraktionId), forschungId);
}

// Meldungen sind Einträge { text, gruppe, anzahl, herkunft }, keine reinen
// Strings: gleichartige Ereignisse unmittelbar hintereinander werden zu EINEM
// Eintrag mit Zähler zusammengefasst. Ohne das flutet jede automatisierte Route
// und jeder Schnellversand die Liste (15 Sonden = 15 Zeilen).
//
// gruppe: nur Einträge derselben Gruppe werden zusammengefasst, und nur wenn
// sie direkt aufeinander folgen. OHNE gruppe wird nie zusammengefasst --
// einmalige, wichtige Meldungen dürfen nie hinter einem Zähler verschwinden.
// Deshalb ist "nicht gruppiert" auch der Standard: eine neue Meldung muss
// sich das Zusammenfassen aktiv verdienen.
//
// herkunft: WEN DIESE MELDUNG ANGEHT. Bis hierher führte eine Meldung darüber
// gar nichts mit sich, und das ist die Ursache von Tobis Befund beim ersten
// eigenen Spielen der Demo (16.08.2026): "log ist grade gut für debugging,
// grausam für spieler. Man sieht alles im ganzen Universum passieren."
//
// Gemessen an einer echten Demo-Galaxie (feste Saat, 500 Systeme, 30
// Echtzeitminuten) waren danach ALLE 30 Zeilen der gedeckelten Liste
// Piratenüberfälle fremder Gruppen aufeinander. Das ist nicht nur Rauschen:
// die Liste hält dreißig Einträge, das Rauschen DRÄNGT die eigenen Meldungen
// heraus.
//
// Zwei Werte, mehr braucht es nicht:
//   "eigen" -- betrifft den Spieler (eigene Planeten, Flotten, Forschung) ODER
//              die ganze Galaxie (Supernova, Blitz, Teilchenflut). Beides will
//              er sehen, also braucht es dafür keine zwei Werte.
//   "fremd" -- geschieht zwischen anderen Fraktionen und geht ihn nichts an.
//
// **"eigen" ist die Vorgabe, und das ist die tragende Entscheidung.** Eine
// Meldung ohne Angabe -- aus einem alten Spielstand oder von einer Aufrufstelle,
// die noch keine mitgibt -- gilt damit als "betrifft mich" und bleibt sichtbar.
// Der Filter kann also nie still etwas verschlucken; er kann höchstens zu wenig
// ausblenden. Genau diese Richtung ist die verzeihliche (Save-Kategorie 1).
// `herkunft` entscheidet über den Filter der Meldungsliste (A-074) und kennt
// drei Werte:
//   "eigen"  -- Subjekt ist ein eigenes Objekt. Vorgabe.
//   "fremd"  -- Subjekt gehört einer anderen Fraktion. Nur unter "alles".
//   "welt"   -- existenzielles Weltereignis (Blitz, Ozon, Flut). IMMER sichtbar.
// Wer eine Meldung schreibt, in deren Nähe ein Planet oder eine Flotte liegt,
// gibt `herkunftVon(objekt)` mit -- die Vorgabe "eigen" ist für die Fälle
// gedacht, in denen es gar kein fremdes Subjekt geben KANN (Speicherfehler,
// Zeitaufholung, Forschung, Logistiknetz).
// Die VORLAGE hinter einem Meldungstext (A-083): derselbe Satz, andere Zahlen.
//
// Aus „Ilmar: 4.200 t geladen – Frachtraum voll." wird „Ilmar: # t geladen –
// Frachtraum voll.". Zwei Meldungen mit derselben Vorlage sind für den Leser
// dieselbe Nachricht, auch wenn die Menge um drei Tonnen abweicht.
//
// Bewusst über die ZAHLEN und nicht über einen Vorlagen-Schlüssel an jeder
// Erzeugungsstelle: der Auftrag verbietet ausdrücklich, an der Erzeugung zu
// drehen, und es gibt über hundert Stellen, die Meldungen schreiben. Was hier
// zusammenfällt, fällt für das Auge ohnehin zusammen.
export function meldungsVorlage(text) {
  return String(text).replace(/[\d.,]*\d/g, "#");
}

export function meldungHinzufuegen(state, text, gruppe = null, herkunft = "eigen", ziel = null) {
  const oben = state.meldungen[0];
  if (gruppe && oben && oben.gruppe === gruppe) {
    oben.text = text; // jüngster Text bleibt sichtbar, der Zähler wächst
    oben.anzahl += 1;
    oben.zeit = spielzeitJetzt(state);
    return;
  }
  // A-083: DIESELBE NACHRICHT ZWEIMAL IST EINE NACHRICHT MIT ZÄHLER.
  //
  // Gemessen in der UI-Abnahme zu v1.46: eine Dauer-Frachtroute mit vollem
  // Frachtraum erzeugte in rund 185 Spieltagen 49.234 Meldungen desselben
  // Satzes. Die Liste hält nur dreißig -- alles andere war damit aus dem
  // Logbuch geschoben, und zwar das Wichtige zuerst.
  //
  // Zusammengefasst wird nur mit der OBERSTEN Meldung: eine Nachricht, die
  // zwischen anderen wieder auftaucht, ist eine neue Nachricht, und die
  // Reihenfolge des Logbuchs bleibt die Reihenfolge der Ereignisse. Damit
  // bleibt auch die Position stabil (die Falle des Auftrags): der Eintrag
  // behält seine `nr` und wandert nicht ans Listenende.
  //
  // Anklickbare Meldungen (mit `ziel`) sind ausgenommen -- sie sind Wege,
  // keine Protokollzeilen, und es gibt sie einmal je Anlass.
  if (
    oben &&
    !gruppe &&
    !oben.gruppe &&
    !ziel &&
    !oben.ziel &&
    oben.herkunft === herkunft &&
    meldungsVorlage(oben.text) === meldungsVorlage(text)
  ) {
    oben.text = text; // die jüngsten Zahlen bleiben sichtbar
    oben.anzahl += 1;
    oben.zeit = spielzeitJetzt(state);
    return;
  }
  // `nr` ist eine STABILE KENNUNG, kein Zähler zum Anzeigen. Seit A-040 kann
  // eine Meldung anklickbar sein, und damit gilt für die Liste Prinzip 8a:
  // ihre Elemente müssen abgeglichen statt neu gebaut werden, und dafür
  // braucht jeder Eintrag einen Schlüssel, der ihm gehört. Die Position taugt
  // dafür nicht -- jede neue Meldung schiebt alle anderen nach unten.
  state.meldungNr = (state.meldungNr || 0) + 1;
  // `zeit` (A-083): wann diese Meldung zuletzt zu hören war. Steht am Eintrag,
  // damit eine zusammengefasste Meldung sagen kann, wann sie zuletzt kam --
  // sonst hieße es "×49.234" ohne jeden Bezug. Alt-Stände haben das Feld
  // nicht; die Anzeige lässt den Zusatz dann weg (`||`-Muster).
  const eintrag = { text, gruppe, anzahl: 1, herkunft, nr: state.meldungNr, zeit: spielzeitJetzt(state) };
  // `ziel` = { bereich, anker }: wohin ein Klick auf die Meldung führt. Fehlt
  // es, ist die Meldung ein reiner Logbucheintrag -- also fast immer.
  if (ziel) eintrag.ziel = ziel;
  state.meldungen.unshift(eintrag);
  if (state.meldungen.length > 30) state.meldungen.length = 30;
}

// Meldungen aus Ständen VOR v0.90 haben keine `nr`. Sie hier einmalig
// nachzutragen ist billiger als überall mit ihrem Fehlen zu rechnen -- und es
// bleibt save-neutral: ein zusätzliches Feld bricht keinen Stand
// (`||`-Muster), es fehlt nur.
//
// Rückwärts durchlaufen, damit die ÄLTESTE Meldung die kleinste Nummer
// bekommt: die Liste steht neueste-zuerst, und eine Nummernfolge, die
// entgegen der Zeit läuft, würde beim nächsten Lesen jeden in die Irre führen.
export function meldungenNummerieren(state) {
  if (!Array.isArray(state.meldungen)) return;
  let hoechste = state.meldungNr || 0;
  for (const m of state.meldungen) if (typeof m.nr === "number" && m.nr > hoechste) hoechste = m.nr;
  for (let i = state.meldungen.length - 1; i >= 0; i--) {
    if (typeof state.meldungen[i].nr !== "number") state.meldungen[i].nr = ++hoechste;
  }
  state.meldungNr = hoechste;
}

// --- Die drei Momente (A-060) ---------------------------------------------
//
// Drei Stellen der ersten Spielstunden erklären sich, WENN sie passieren:
// die erste Werft, der erste Piratenkontakt im eigenen System, der Blitz.
// Führung durch Erklärung im Moment -- kein Tutorial, das vorher sagt, was man
// klicken soll, und kein Overlay: die Erstklärung bleibt das einzige Fenster.
//
// HIER STEHT NUR DIE FRAGE „IST ES SO WEIT?", nicht der Text. Die Texte
// gehören zur Oberfläche (ui.js), die Bedingungen zum Zustand -- und sie
// werden von ZWEI Seiten gebraucht: vom Takt, der die Meldung auslöst, und
// vom Nachziehen für alte Stände. Zwei Formulierungen derselben Bedingung
// wären zwei Antworten auf dieselbe Frage.
export const MOMENTE = ["werft", "piraten", "blitz"];

// Steht in einem meiner Systeme ein Pirat? Das ist der „erste Kontakt" im
// Sinne des Auftrags -- ausdrücklich NICHT das erste Piratenereignis der
// Galaxie. Gemessen an einer Demo-Galaxie waren über 30 Minuten alle 30
// Zeilen der Meldungsliste Überfälle fremder Piraten aufeinander (der Befund
// hinter der Herkunfts-Mechanik aus v0.82); ein Hinweis, der daran hinge,
// käme in Minute zwei und beträfe niemanden.
//
// Gezählt wird ANWESENHEIT, Basis wie Flotte: eine Bande, die im eigenen
// System steht, ist gesehen, egal ob sie schon geschossen hat. Eine Flotte
// zwischen zwei Sternen hat kein System (`ort.systemId === null`) und fällt
// damit von selbst heraus.
function piratenFraktionen(state) {
  const ids = new Set();
  for (const [id, f] of Object.entries(state.fraktionen || {})) {
    if (f && f.art === "pirat") ids.add(Number(id));
  }
  return ids;
}

export function piratKontaktImEigenenSystem(state) {
  const meine = new Set(planetenVon(state).map((p) => p.systemId));
  if (!meine.size) return false;
  const banden = piratenFraktionen(state);
  if (!banden.size) return false;
  for (const planet of state.planeten) {
    if (banden.has(fraktionVon(planet)) && meine.has(planet.systemId)) return true;
  }
  for (const flotte of state.flotten) {
    if (!flotte.ort || flotte.ort.systemId === null) continue;
    if (banden.has(fraktionVon(flotte)) && meine.has(flotte.ort.systemId)) return true;
  }
  return false;
}

export function momentErreicht(state, id) {
  switch (id) {
    // Die Werft ist ein GEBÄUDE, kein Bereich: ohne sie ist werftTempo 0 und
    // es läuft nichts vom Band. Irgendeine eigene Welt genügt.
    case "werft":
      return planetenVon(state).some((p) => ((p.gebaeude && p.gebaeude.werft) || 0) > 0);
    case "piraten":
      return piratKontaktImEigenenSystem(state);
    // „Blitz vorbei" schließt die Flut mit ein: wer erst danach lädt, hat den
    // Moment ebenfalls hinter sich.
    case "blitz":
      return !!state.supernova && (state.supernova.phase === "blitz" || state.supernova.phase === "flut");
    default:
      return false;
  }
}

export function momentGesehen(state, id) {
  return !!(state.momenteGesehen && state.momenteGesehen[id]);
}

export function momentMerken(state, id) {
  if (!state.momenteGesehen) state.momenteGesehen = {};
  state.momenteGesehen[id] = true;
}

// Alte Stände bekommen die Erklärung NICHT nachträglich. Wer seine Werft seit
// zehn Spieljahren stehen hat, braucht nicht zu lesen, was eine Sonde tut --
// und eine Meldung, die einen längst vergangenen Moment erklärt, sieht aus
// wie ein Fehler.
//
// Läuft EINMAL beim Laden (save.js), nicht bei jedem Zugriff -- dieselbe
// Stelle und dieselbe Begründung wie `meldungenNummerieren` (A-040). Das
// Vorhandensein des Feldes ist zugleich die Unterscheidung: ein Stand, der es
// schon führt, wurde bereits nachgezogen und wird nicht ein zweites Mal
// bewertet.
export function momenteNachziehen(state) {
  if (state.momenteGesehen) return;
  state.momenteGesehen = {};
  for (const id of MOMENTE) {
    if (momentErreicht(state, id)) state.momenteGesehen[id] = true;
  }
}

// --- Der Hinweis auf ein zu kleines Fenster (A-111) ------------------------
//
// EIN Merker, keine Liste wie bei MOMENTE: es gibt nur einen Anlass. Bewusst
// NICHT Teil der drei Momente oben -- deren Bedingung ist Spielzustand
// (Werft gebaut, Piraten gesichtet), hier ist die Bedingung eine gemessene
// Fenstergröße. Die Prüfung selbst steht deshalb auch nicht hier, sondern in
// ui.js (renderFensterHinweis) -- sie braucht das echte DOM, das dieses
// Modul nicht hat.
export function fensterHinweisGesehen(state) {
  return !!state.fensterHinweisGesehen;
}

export function fensterHinweisMerken(state) {
  state.fensterHinweisGesehen = true;
}

// Der „Was ist neu"-Hinweis nach einem Versionswechsel (A-040).
//
// ANLASS (Tobi, 17.08.2026): „Prio hoch für alle User-Interaction-Geschichten:
// Changelog, Feedback-Möglichkeit, Roadmap. Diese Punkte sollten auch leicht zu
// finden sein im Spiel." Der Handbuch-Abschnitt allein ist nicht auffindbar:
// niemand öffnet ein Handbuch, um nachzusehen, ob sich etwas geändert hat.
//
// WARUM HIER UND NICHT IN ui.js: die Entscheidung „zeigen oder nicht" ist
// Zustandslogik mit drei Fällen, und die will geprüft sein. In ui.js wäre sie
// untestbar (kein DOM in Node). Die Version kommt als Argument herein statt
// aus data.js -- dann kann ein Test einen Wechsel spielen, ohne die echte
// Versionsnummer zu kennen.
//
// DIE FALLE, die der Auftrag ausdrücklich benennt: ein FRISCHES Spiel darf den
// Hinweis nicht bekommen. Wer gerade anfängt, kennt nichts Altes; neben dem
// Erklärfenster wäre ein Changelog-Hinweis nur Lärm. Erkennbar ist der frische
// Start daran, dass beides fehlt: eine gesehene Version UND das Erklärfenster.
// Die Version wird trotzdem gemerkt -- sonst käme der Hinweis beim nächsten
// Laden doch noch.
//
// SEIT A-047 SIND ES ZWEI MERKER, weil „gemeldet" und „gesehen" zwei
// verschiedene Wahrheiten sind -- gemessen (A-040-Ergebnis): die Meldung
// allein erreicht den Spieler kaum, die Liste läuft in ~1,6 Minuten über und
// die Statusspalte startet eingeklappt.
//   - `gemeldeteVersion`: bis zu welcher Version wurde die Meldung GEPOSTET.
//     Sie schaltet die Einmaligkeit des Hinweises (dieser Funktion).
//   - `gesehenVersion`: bis zu welcher Version hat der Spieler die
//     Neuigkeiten GESEHEN. Sie wandert erst, wenn der Development-Bereich
//     wirklich offen war (neuigkeitenGesehen) -- und speist den
//     Aktivitätspunkt an der Navigation (neuigkeitenPunktAn).
// Alte Stände tragen nur `gesehenVersion` (bis v1.27 wanderte sie beim
// Posten): sie zählt deshalb als „gemeldet bis dort" mit -- so bekommt ein
// v1.27-Stand für v1.28 genau EINE neue Meldung und den Punkt, aber keine
// Meldungsflut für die Vergangenheit.
export function neuigkeitenHinweisPruefen(state, version, text) {
  const gemeldet = state.gemeldeteVersion || state.gesehenVersion || null;
  if (gemeldet === version) return false;

  const frischesSpiel = !state.gesehenVersion && !state.gemeldeteVersion && !state.erstklaerungGesehen;
  if (frischesSpiel) {
    state.gesehenVersion = version;
    state.gemeldeteVersion = version;
    return false;
  }

  // ERST die Meldung, DANN der Merker -- dieselbe Reihenfolge und derselbe
  // Grund wie beim Handbuch-Hinweis in ui.js: ein Merker, der sagt „ist
  // erledigt", gehört hinter die Sache, die er bezeugt.
  meldungHinzufuegen(state, text, "neuigkeiten", "eigen", {
    bereich: "development",
    anker: "patchnotes",
  });
  state.gemeldeteVersion = version;
  return true;
}

// Trägt der Development-Navigationspunkt den Aktivitätspunkt? (A-047)
//
// Ja, solange die gesehene Version hinter der laufenden liegt -- mit
// derselben Frische-Ausnahme wie beim Hinweis: ein Spielstand, der noch NIE
// einen der Merker oder das Erklärfenster gesehen hat, ist ein Neuling im
// allerersten Takt (neuigkeitenHinweisPruefen setzt seine Merker gleich
// mit); der kennt nichts Altes und bekommt keinen Punkt.
export function neuigkeitenPunktAn(state, version) {
  const neuling = !state.gesehenVersion && !state.gemeldeteVersion && !state.erstklaerungGesehen;
  if (neuling) return false;
  return (state.gesehenVersion || null) !== version;
}

// Der Spieler hat die Neuigkeiten gesehen: der Development-Bereich war
// offen. BEIDE Wege führen hierher -- der Klick auf die Meldung (sie springt
// dorthin) und der direkte Klick auf den Navigationspunkt --, weil die
// Oberfläche den Merker beim Anzeigen des Bereichs setzt, egal wie er
// aufging. Ein zweiter Weg wäre eine zweite Gelegenheit, ihn zu vergessen.
export function neuigkeitenGesehen(state, version) {
  state.gesehenVersion = version;
}

// Soll diese Meldung dem Spieler standardmäßig angezeigt werden?
//
// Bewusst hier und nicht in ui.js: die Antwort gehört zur Meldung, nicht zu
// ihrer Darstellung -- und ein Testlauf ohne DOM kann sie so prüfen.
// Das `||`-Muster ist der Grund, warum alte Spielstände weiterlaufen: eine
// Meldung ohne Feld ist "eigen".
//
// DIE REGEL (A-074, Entscheidung der Planung): Eine Meldung ist "meine", wenn
// ihr SUBJEKT ein eigenes Objekt ist -- eigener Planet, eigene Flotte, eigener
// Bau-/Forschungsabschluss, eigene Wirtschaft. Alles andere (fremde
// Fraktionen, Piraten in fremden Systemen, Weltgeschehen ohne eigenen Bezug)
// gehört nur in "alles".
//
// MIT EINER AUSNAHME, und die ist kein Detail: existenzielle Weltereignisse
// ("welt" -- Blitz, Ozon, Flut) stehen in BEIDEN Ansichten. Ein Filter, der
// jemanden die Rettung verpassen lässt, ist ein Fehler und keine
// Bequemlichkeit.
//
// WARUM DAS EINMAL NICHT FUNKTIONIERT HAT: Die Vorgabe von `herkunft` ist
// "eigen", und 43 der 55 Meldungsstellen im Projekt haben das Feld gar nicht
// gesetzt. Der Filter ließ damit alles durch, was niemand ausdrücklich als
// fremd markiert hatte -- also fast alles, inklusive jeder Piratenflotte, die
// irgendwo im Nichts Erz lädt. Das Prädikat war nie falsch; ihm fehlte die
// Angabe. Deshalb steht die Klassifizierung jetzt AN DER QUELLE
// (`herkunftVon(flotte)` / `herkunftVon(planet)` an der Meldungsstelle), und
// nicht als Textmustererkennung hier.
export function meldungBetrifftSpieler(meldung) {
  return (meldung.herkunft || "eigen") !== "fremd";
}

// Die Herkunft einer Meldung aus dem Ding ableiten, um das es geht -- Planet
// oder Flotte, beide tragen `fraktion` (siehe fraktionVon).
//
// Steht hier, weil die meisten Meldungen in js/simulation.js entstehen und dort
// FAST IMMER ein Planet oder eine Flotte in der Hand liegt. Eine Aufrufstelle
// schreibt damit `herkunftVon(planet)` statt einer eigenen Verzweigung, und die
// Regel "wem gehört das" steht weiterhin an genau einer Stelle im Projekt.
//
// Warum ein eigener Helfer und nicht der Vergleich an Ort und Stelle: 45 der 50
// Aufrufstellen liegen in simulation.js. Fünfundvierzig handgeschriebene
// Vergleiche wären fünfundvierzig Gelegenheiten, einmal die falsche Fraktion zu
// nehmen -- und eine falsch als "fremd" eingestufte Meldung verschwindet, ohne
// dass es jemand merkt.
export function herkunftVon(objekt) {
  return fraktionVon(objekt) === SPIELER_FRAKTION ? "eigen" : "fremd";
}

// Zählt schon eingereihte Stufen derselben Gebäudeart mit -- sonst würden
// zwei Warteschlangeneinträge auf dieselbe Zielstufe planen.
export function naechstesGebaeudeLevel(planet, gebaeudeId) {
  let level = planet.gebaeude[gebaeudeId] || 0;
  if (planet.bauQueue && planet.bauQueue.gebaeudeId === gebaeudeId) level++;
  for (const eintrag of planet.bauWarteschlange) {
    if (eintrag.gebaeudeId === gebaeudeId) level++;
  }
  return level + 1;
}

// Zählt schon eingereihte Stufen derselben Forschung mit, aus demselben
// Grund wie naechstesGebaeudeLevel. A-134: fraktionsgebunden über dieselben
// drei Zugriffsfunktionen wie kannForschen -- Vorgabe SPIELER_FRAKTION hält
// jeden bestehenden Zweiparameter-Aufruf unverändert.
export function naechstesForschungLevel(state, forschungId, fraktionId = SPIELER_FRAKTION) {
  const forschung = forschungVon(state, fraktionId);
  let level = forschung[forschungId] || 0;
  const laufend = forschungsQueueVon(state, fraktionId);
  if (laufend && laufend.forschungId === forschungId) level++;
  for (const eintrag of forschungsWarteschlangeVon(state, fraktionId)) {
    if (eintrag.forschungId === forschungId) level++;
  }
  return level + 1;
}

// --- Schwerkraft ------------------------------------------------------
// Die einzige Stelle, an der Kosten planetenabhängig werden. ALLE Berechnungen
// von Gebäude- und Schiffskosten laufen hierüber -- auch Erstattungen bei
// Storno, sonst würde ein Abbruch auf einer Supererde Geld drucken.
export function schwerkraftVon(planet) {
  return planet && planet.schwerkraft ? planet.schwerkraft : 1;
}

// Traglast: linear mit der Schwerkraft.
export function bauKostenFaktor(planet) {
  return 1 + (schwerkraftVon(planet) - 1) * SCHWERKRAFT.bauAnteil;
}

// Raketengleichung: quadratisch. Eine Supererde ist eine großartige
// Bergbauwelt und ein mieser Raumhafen.
export function startKostenFaktor(planet) {
  const g = schwerkraftVon(planet);
  return SCHWERKRAFT.startBasis + SCHWERKRAFT.startFaktor * g * g;
}

export function gebaeudeKosten(planet, def, level) {
  return skalieren(kostenFuerLevel(def, level), bauKostenFaktor(planet));
}

export function schiffKosten(planet, schiffId, anzahl = 1) {
  return skalieren(SCHIFFE[schiffId].kosten, anzahl * startKostenFaktor(planet));
}

// Höchste Stückzahl, die der BESTAND jetzt sofort trägt (R-2/A-100). Die
// Kosten wachsen linear mit der Stückzahl (`startKostenFaktor` hängt nur am
// Planeten, nicht an `anzahl`) -- deshalb reicht Teilen statt Suchen: je
// Ressource Bestand ÷ Stückkosten, davon die kleinste. Eine Ressource ohne
// Kostenanteil begrenzt nicht mit (0 ÷ irgendwas wäre immer 0 und würde
// jedes Schiff sperren).
//
// Bewusst NUR der Bestand -- kein Blick auf die Warteschlange (A-012, ein
// wartender Kopf DARF auf Nachschub warten). Das ist etwas anderes als „was
// das Zahlenfeld gerade vorschlägt": Wer weniger eintippt, als er hat, will
// sofort bauen, nicht anstellen.
export function schiffMaxBezahlbar(planet, schiffId) {
  const stueckkosten = schiffKosten(planet, schiffId, 1);
  let max = Infinity;
  for (const [resId, kosten] of Object.entries(stueckkosten)) {
    if (kosten <= 0) continue;
    const bestand = (planet.ressourcen && planet.ressourcen[resId]) || 0;
    max = Math.min(max, Math.floor(bestand / kosten));
  }
  return Number.isFinite(max) ? Math.max(0, max) : Infinity;
}

// Was EIN wartender Auftrag kostet (A-077).
//
// Die Falle steht im Auftrag und ist echt: die Kosten einer Stufe hängen an
// der ZIELSTUFE, und die steht im Eintrag -- `zielLevel` wurde beim Einreihen
// gebucht. Aus der heutigen Gebäudestufe zurückzurechnen wäre bei zwei
// Einträgen desselben Gebäudes schon falsch (der zweite zielt eine Stufe
// höher), und beim laufenden Kopf noch einmal.
//
// Ein Eintrag sagt selbst, was er ist: Bauten tragen `gebaeudeId`, Schiffe
// `schiffId`. Forschung trägt keins von beidem und kostet seit v0.6 kein
// Material mehr -- ihre Summe ist leer, und die Anzeige lässt die Zeile dann
// ganz weg (Null-Zustand).
export function auftragKosten(planet, eintrag) {
  if (!eintrag) return {};
  if (eintrag.gebaeudeId) return gebaeudeKosten(planet, BUILDINGS[eintrag.gebaeudeId], eintrag.zielLevel);
  if (eintrag.schiffId) return schiffKosten(planet, eintrag.schiffId, eintrag.anzahl || 1);
  return {};
}

// Was ALLE wartenden Aufträge zusammen kosten (A-077).
//
// Tobis Frage: „müsste irgendwo angezeigt werden, wie viel man an Kosten in
// der Warteschlange hat." Gemeint sind die WARTENDEN -- der laufende Kopf hat
// seit A-012 bereits bezahlt, seine Kosten sind kein offener Posten mehr.
//
// Beträge von null kommen nicht in die Summe: eine Zeile „0 Iridium" wäre
// Rauschen, und die Anzeige entscheidet an genau dieser Stelle, welche
// Ressourcen sie überhaupt nennt.
export function warteschlangeKosten(planet, warteschlange) {
  const summe = {};
  for (const eintrag of warteschlange || []) {
    for (const [resId, betrag] of Object.entries(auftragKosten(planet, eintrag))) {
      if (!betrag) continue;
      summe[resId] = (summe[resId] || 0) + betrag;
    }
  }
  return summe;
}

// Was in einem Stückzahl-Feld steht, als Stückzahl gelesen (A-079).
//
// Gibt NULL zurück, wenn daraus kein Auftrag werden kann -- leer, null,
// negativ, gar keine Zahl. Die Anzeige macht daraus einen gesperrten Knopf
// mit Grund; die Alternative (still auf 1 aufrunden) würde einen Auftrag
// auslösen, den niemand eingetippt hat.
//
// Hier und nicht in ui.js, weil die Definition von fertig einen Test auf
// dieser Funktion verlangt -- und `node --test` hat kein DOM.
//
// Das Komma wird zum Punkt: wer 2,5 tippt, meint zweieinhalb und bekommt 2
// statt einer Ablehnung. Abgeschnitten wird immer nach unten -- ein halbes
// Schiff gibt es nicht, und aufzurunden hieße mehr zu bauen als verlangt.
export function stueckzahlAus(text) {
  const zahl = Math.floor(Number(String(text ?? "").trim().replace(",", ".")));
  if (!Number.isFinite(zahl) || zahl < 1) return null;
  return zahl;
}

export { kostenFuerLevel, bauzeitFuerLevel };
