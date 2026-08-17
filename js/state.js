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
  SCHWERKRAFT,
  SCHIFFE,
  LAGER_RESSOURCEN,
  FLUSS_RESSOURCEN,
  REICHWEITE,
  START,
  FRAKTIONS_ARTEN,
  SPIELER_FRAKTION,
  BEZIEHUNG,
  SUPERNOVA,
  LJ_PRO_EINHEIT,
  ZEIT,
  spieltage,
  supernovaFlutJahre,
  jahreInMs,
  lagerkapazitaet,
  rate,
  kostenFuerLevel,
  bauzeitFuerLevel,
  voraussetzungenErfuellt,
} from "./data.js";
import { systemGenerieren } from "./welt.js";
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
export const SAVE_VERSION = 31;

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

function startGebaeude() {
  const g = {};
  for (const id of Object.keys(BUILDINGS)) g[id] = 0;
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
    gebaeude: typ === "aussenposten" ? {} : startGebaeude(),
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
function startsystemAufdecken(seed, galaxie) {
  const system = systemGenerieren(seed, galaxie.heimatSystem, {
    schluessel: schluesselImSystem(galaxie, galaxie.heimatSystem),
    istHeimat: true,
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
  if (auswahl.length && !auswahl.some((o) => o.daten.kolonisierbar)) {
    const ziel = auswahl[0];
    zustand[ziel.orbit] = { entdeckt: true, daten: { ...ziel.daten, kolonisierbar: true } };
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
export function neuesSpiel(saat) {
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
  const start = startsystemAufdecken(seed, galaxie);

  const heimatwelt = neuerPlanet({
    id: 1,
    systemId: galaxie.heimatSystem,
    orbit: start.heimatOrbit,
    // Der EINZIGE Planetenname, der ein Wort ist -- alle späteren heißen nach
    // ihrem Orbit ("35-XII") und sind damit sprachlos. Er wird hier einmal
    // festgelegt und danach wie ein Eigenname behandelt: ein Sprachwechsel
    // benennt einen bestehenden Planeten nicht um. main.js legt die Sprache
    // vor dem Laden fest, ein neues Spiel im englischen Browser beginnt also
    // auf "Homeworld". Gleiche Entscheidung wie beim Vorgabenamen einer Flotte
    // (siehe flotteAufstellen).
    name: t("Heimatwelt"),
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
    // Wann diese Kolonie gegründet wurde. Bezugspunkt für das Ingame-Datum
    // (A-005) -- gezählt wird ab hier, nicht ab einem Erdkalender.
    beginn: jetzt,
  };
}

export function spielzeitJetzt(state) {
  return Date.now() + (state.testZeitOffsetMs || 0);
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

// --- Produktion -----------------------------------------------------------
export function kategorieBonus(state, kategorie) {
  let faktor = 1;
  for (const def of Object.values(RESEARCH)) {
    if (def.boost && def.boost.kategorie === kategorie) {
      faktor += (state.forschung[def.id] || 0) * def.boost.proLevel;
    }
  }
  return faktor;
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
  if (menge === null || menge === undefined || !Number.isFinite(menge) || menge <= 0) {
    delete planet.verarbeitungsReserve[resId];
  } else {
    planet.verarbeitungsReserve[resId] = menge;
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

export function rohRaten(state, planet) {
  const produktion = {};
  const verbrauch = {};
  if (!planet || planet.typ === "aussenposten") return { produktion, verbrauch };

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
  const postenStufe = planet.gebaeude.handelsposten || 0;
  if (postenStufe > 0 && menschen.abgaben > 0) {
    produktion.credits = (produktion.credits || 0) + menschen.abgaben * postenStufe;
  }

  for (const [id, def] of Object.entries(BUILDINGS)) {
    const level = planet.gebaeude[id] || 0;
    if (level <= 0) continue;
    const bonus = kategorieBonus(state, def.kategorie);

    for (const [resId, spec] of Object.entries(def.produktion || {})) {
      produktion[resId] =
        (produktion[resId] || 0) + rate(spec, level) * bonus * affinitaetFaktor(planet, resId);
    }
    for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
      verbrauch[resId] = (verbrauch[resId] || 0) + rate(spec, level);
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
  };
  if (!planet || planet.typ === "aussenposten" || !planet.gebaeude) return leer;

  // Rohraten EINMAL rechnen und beides daraus speisen -- die Energieeffizienz
  // oben und die Fluss-Anzeige ganz unten.
  const roh = rohRaten(state, planet);
  const energieFaktor = effizienzAus(planet, roh);
  const menschen = bevoelkerungsAnteile(planet);
  const anlagen = [];
  for (const [id, def] of Object.entries(BUILDINGS)) {
    const level = planet.gebaeude[id] || 0;
    if (level <= 0) continue;
    const bonus = kategorieBonus(state, def.kategorie);
    const prod = {};
    const verb = {};
    // Anlagen, die Sonnenlicht brauchen, stehen still, solange die
    // Ozonschicht zerstört ist. Das ist die einzige Wirkung des Blitzes --
    // und sie reicht, denn ohne Ernte schrumpft die Bevölkerung über den
    // Hungerweg, den das Spiel ohnehin kennt.
    const lichtFaktor = def.brauchtSonnenlicht && !sonnenlichtNutzbar(state) ? 0 : 1;
    for (const [resId, spec] of Object.entries(def.produktion || {})) {
      if (!LAGER_RESSOURCEN.includes(resId)) continue;
      prod[resId] = rate(spec, level) * bonus * affinitaetFaktor(planet, resId) * lichtFaktor;
    }
    for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
      if (!LAGER_RESSOURCEN.includes(resId)) continue;
      verb[resId] = rate(spec, level);
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
    if (id === "handelsposten" && menschen.abgaben > 0) prod.credits = menschen.abgaben * level;
    // Fluss-Bedarf je Anlage wird MITGEFÜHRT, nicht nur in der Summe: er wird
    // nach Prioritaet zugeteilt, und dafuer muss bekannt sein, wer wieviel
    // davon will. Seit v0.8 gilt das fuer Strom UND Arbeitskraft (vorher
    // trug die Anlage nur `energie`).
    const fluss = {};
    for (const resId of FLUSS_RESSOURCEN) {
      const menge = rate(def.verbrauch && def.verbrauch[resId], level);
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
    }

    produktion[resId] = angebot;
    verbrauch[resId] = nachfrage;
    lager[resId] = angebot - nachfrage;
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
        summe += rate(spec, level) * kategorieBonus(state, def.kategorie) * (faktoren[id] || 0);
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
    const wirklichVerbraucht =
      resId === "energie"
        ? anlagen.reduce((summe, a) => summe + (a.energie || 0) * (faktoren[a.id] ?? 1), 0)
        : verbrauch[resId] * energieFaktor;
    fluss[resId] = produktion[resId] - wirklichVerbraucht;
  }

  return { lager, fluss, produktion, verbrauch, bedarf, drosselung, effizienz: energieFaktor, faktoren };
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
  return Math.round(basis * kategorieBonus(state, "lager"));
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

export function forschungVoraussetzungenErfuellt(state, forschungId) {
  return voraussetzungenErfuellt(state.forschung, forschungId);
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
export function meldungHinzufuegen(state, text, gruppe = null, herkunft = "eigen", ziel = null) {
  const oben = state.meldungen[0];
  if (gruppe && oben && oben.gruppe === gruppe) {
    oben.text = text; // jüngster Text bleibt sichtbar, der Zähler wächst
    oben.anzahl += 1;
    return;
  }
  // `nr` ist eine STABILE KENNUNG, kein Zähler zum Anzeigen. Seit A-040 kann
  // eine Meldung anklickbar sein, und damit gilt für die Liste Prinzip 8a:
  // ihre Elemente müssen abgeglichen statt neu gebaut werden, und dafür
  // braucht jeder Eintrag einen Schlüssel, der ihm gehört. Die Position taugt
  // dafür nicht -- jede neue Meldung schiebt alle anderen nach unten.
  state.meldungNr = (state.meldungNr || 0) + 1;
  const eintrag = { text, gruppe, anzahl: 1, herkunft, nr: state.meldungNr };
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
export function neuigkeitenHinweisPruefen(state, version, text) {
  const gesehen = state.gesehenVersion || null;
  if (gesehen === version) return false;

  const frischesSpiel = !gesehen && !state.erstklaerungGesehen;
  if (frischesSpiel) {
    state.gesehenVersion = version;
    return false;
  }

  // ERST die Meldung, DANN der Merker -- dieselbe Reihenfolge und derselbe
  // Grund wie beim Handbuch-Hinweis in ui.js: ein Merker, der sagt „ist
  // erledigt", gehört hinter die Sache, die er bezeugt.
  meldungHinzufuegen(state, text, "neuigkeiten", "eigen", {
    bereich: "handbuch",
    anker: "neuigkeiten",
  });
  state.gesehenVersion = version;
  return true;
}

// Soll diese Meldung dem Spieler standardmäßig angezeigt werden?
//
// Bewusst hier und nicht in ui.js: die Antwort gehört zur Meldung, nicht zu
// ihrer Darstellung -- und ein Testlauf ohne DOM kann sie so prüfen.
// Das `||`-Muster ist der Grund, warum alte Spielstände weiterlaufen: eine
// Meldung ohne Feld ist "eigen".
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
// Grund wie naechstesGebaeudeLevel.
export function naechstesForschungLevel(state, forschungId) {
  let level = state.forschung[forschungId] || 0;
  if (state.forschungsQueue && state.forschungsQueue.forschungId === forschungId) level++;
  for (const eintrag of state.forschungsWarteschlange) {
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

export { kostenFuerLevel, bauzeitFuerLevel };
