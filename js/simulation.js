// Zeitsimulation und Spielaktionen.
//
// vorspulenBisJetzt rückt den Spielstand von state.letzterTick bis "jetzt" vor
// und wird sowohl beim Laden (Offline-Zeit) als auch im Sekundentakt aufgerufen.
//
// Flotten bewegen sich NICHT pro Tick: jeder Streckenabschnitt hat eine
// berechnete Ankunftszeit und läuft als Ereignis. Positionen werden nur bei
// Bedarf interpoliert (Anzeige, Kursänderung) -- siehe js/flotten.js.

import {
  BUILDINGS,
  RESEARCH,
  RESSOURCEN,
  SCHIFFE,
  OBJEKT_REGELN,
  MISSIONS_SCHIFF,
  AUSSENPOSTEN,
  KOLONIE,
  MARKT_PREISE,
  LOGISTIKNETZ,
  PIRAT,
  BOT,
  FRAKTIONS_ARTEN,
  KAMPF,
  REPARATUR,
  SPIELER_FRAKTION,
  BAUWARTESCHLANGE_MAX,
  HANDEL,
  SCHROTT_ANTEIL,
  ANTIMATERIE_ERNTE,
  BEVOELKERUNG,
  SUPERNOVA,
  jahreInMs,

  taugtAlsStartwelt,
  REICHWEITE,
  mengeSkaliert,
  kostenFuerLevel,
  bauzeitFuerLevel,
  forschungsAufwand,
  voraussetzungenText,
} from "./data.js";
import {
  effektiveRaten,
  pufferGrenzeStunden,
  verarbeitungsReserveFuer,
  affinitaetFaktor,
  gebaeudeKosten,
  schiffKosten,
  speicherKapazitaet,
  aufnahmeGrenzeFuer,
  lagerFrei,
  lagerKapazitaetGesamt,
  lagerverbrauchVon,
  lagerLimitFuer,
  spielzeitJetzt,
  meldungHinzufuegen,
  forschungVerfuegbar,
  forschungVoraussetzungenErfuellt,
  systemErreichbar,
  hatSprungroute,
  sprungrouteSetzen,
  planetById,
  planetAn,
  neuerPlanet,
  naechstesGebaeudeLevel,
  naechstesForschungLevel,
  werftTempo,
  forschungsFluss,
  hatLabor,
  handelVerfuegbar,
  automatisierungFreigeschaltet,
  logistiknetzFreigeschaltet,
  wirtschaftsPlaneten,
  planetenVon,
  flottenVon,
  fraktionVon,
  fraktionById,
  fraktionArt,
  flotteById,
  fraktionGrenze,
  neueFraktion,
  beziehungHandlung,
  beziehungAendern,
  beziehungZu,
} from "./state.js";
import {
  ortVonPlanet,
  ortVonSystem,
  flottePosition,
  strecke,
  treibstoffFuer,
  flugdauerMs,
  logistikVerzoegerungMs,
  reichtTreibstoff,
  flotteKapazitaet,
  frachtraumFrei,
  flotteTankKapazitaet,
  flotteBasisTank,
  ladungGesamt,
  flotteLeer,
  schiffeGesamt,
  schiffeStaerke,
  schiffeText,
} from "./flotten.js";
import { findeObjekt, setzeOrbitZustand, holeSystem } from "./systeme.js";
import { stromFuer } from "./zufall.js";
import {
  reichenAus,
  abziehen,
  hinzufuegen,
  lagerHinzufuegen,
  skalieren,
  buendelText,
  name as resName,
} from "./ressourcen.js";
import { t } from "./sprache.js";

// Kurzform: Ressourcen in ein Planetenlager einlagern, begrenzt durch den
// gemeinsamen Pool und etwaige Annahmeregeln. Gibt zurück, was nicht
// reinpasste (siehe lagerHinzufuegen).
// EINZIGER Trichter für "Material kommt auf einem Planeten an" -- Produktion,
// Fracht, Beute, Handel, Logistik laufen alle hier durch. Deshalb ist das auch
// die richtige Stelle, den gemerkten Puffergrenzen-Zeitpunkt zu verwerfen.
function insLager(state, planet, buendel) {
  planetGeaendert(planet);
  return lagerHinzufuegen(
    planet.ressourcen,
    buendel,
    lagerFrei(state, planet),
    lagerverbrauchVon,
    // Eigene Speicherkapazität (Wohnraum, später Batterien) zählt hier mit --
    // sonst könnte ein Frachter mehr Siedler abladen, als der Planet
    // unterbringen kann.
    (resId) => aufnahmeGrenzeFuer(planet, resId)
  );
}
import { systemName, entfernung } from "./galaxie.js";

const MS_PRO_STUNDE = 1000 * 60 * 60;

// --- Zeitablauf -----------------------------------------------------------
//
// JEDER PLANET HAT SEINE EIGENE UHR (seit v0.32). Vorher gab es nur
// state.letzterTick, und ressourcenVorruecken rückte bei JEDEM Ereignis ALLE
// Planeten vor -- ein fertiges Gebäude auf Planet 7 rechnete die Wirtschaft
// von Planet 200 komplett neu durch. Gemessen in tests/skalierung.mjs war das
// der dominante Term einer quadratischen Kurve: die Kosten je einzelnem
// Ereignis wuchsen linear mit der Zahl der Planeten.
//
// Jetzt wird ein Planet nur bewegt, wenn ihn etwas berührt. Dasselbe
// Faul-Prinzip wie bei der Flottenposition und der Antimaterie-Nachbildung:
// nicht vorsorglich rechnen, sondern auf Abruf.
//
// DIE REGEL, an der alles hängt: **bevor irgendwer planet.ressourcen liest
// oder schreibt, muss dieser Planet auf dem Stand sein.** Wird sie verletzt,
// hinkt ein Planet unbemerkt hinterher -- ein STILLER Fehler. Deswegen liegt
// tests/planetenuhr.test.js als Schutznetz daneben.
//
// Der Zeitstempel liegt am Planeten (`planet.letzterTick`). Fehlt er (alter
// Spielstand), gilt state.letzterTick -- die Umstellung braucht deshalb keine
// Spielstand-Wanderung.
export function planetLetzterTick(state, planet) {
  return planet.letzterTick === undefined ? state.letzterTick : planet.letzterTick;
}

// Gemerkter Zeitpunkt der nächsten Puffergrenze dieses Planeten.
//
// WARUM ES DAS GIBT: naechstesEreignis fragte jeden Planeten bei jedem
// Ereignis nach seiner Puffergrenze, und diese Frage kostet eine vollständige
// Produktionsauflösung. Gemessen 2026-08-15 waren das bei 40 Planeten 0,84 ms
// je Ereignis -- praktisch die gesamte Simulationszeit. Die Antwort ändert
// sich aber nur, wenn sich AN DIESEM PLANETEN etwas ändert.
//
// Die Invalidierung hängt an genau einer Regel und ist deshalb überschaubar:
// **wer einen Planeten verändert, ruft planetGeaendert.** Das passiert
// zentral in planetVorruecken (Bestände laufen weiter) und zusätzlich an den
// wenigen Stellen, die einen Planeten außerhalb davon anfassen.
//
// Der Wert wird als ABSOLUTER Zeitpunkt gemerkt, nicht als Restdauer -- sonst
// müsste man ihn bei jedem Blick gegen die Uhr des Planeten verrechnen.
function planetGeaendert(planet) {
  planet.pufferGrenzeMerker = undefined;
}

function pufferGrenzeZeitpunkt(state, planet) {
  if (planet.pufferGrenzeMerker !== undefined) return planet.pufferGrenzeMerker;
  const stunden = pufferGrenzeStunden(state, planet);
  planet.pufferGrenzeMerker =
    stunden === null ? null : planetLetzterTick(state, planet) + stunden * MS_PRO_STUNDE;
  return planet.pufferGrenzeMerker;
}

function planetVorruecken(state, planet, bisZeitpunkt) {
  const deltaMs = bisZeitpunkt - planetLetzterTick(state, planet);
  // Nie rückwärts, jetzt je Planet: vorspulenBisJetzt bricht am
  // Ereignisdeckel ab und lässt spätere Ereignisse mit einer Zeit in der
  // VERGANGENHEIT liegen. Würde die Uhr dabei zurückgesetzt, produzierte der
  // nächste Durchlauf dieselbe Spanne ein zweites Mal -- nach langer
  // Offline-Zeit mit laufenden Routen entstünde Material aus dem Nichts.
  // Siehe tests/zeit.test.js, "Ereignisdeckel".
  if (deltaMs <= 0) return;
  const stunden = deltaMs / MS_PRO_STUNDE;
  planet.letzterTick = bisZeitpunkt;
  // Bestände und damit die Puffergrenze ändern sich -- gemerkten Wert wegwerfen.
  planetGeaendert(planet);

  // Außenposten haben keine Wirtschaft -- die Uhr wird trotzdem gestellt,
  // damit sie nicht ewig in der Vergangenheit hängt.
  if (planet.typ !== "aussenposten") {
    planetRatenAnwenden(state, planet, stunden);
  }
}

function planetRatenAnwenden(state, planet, stunden) {
  {
    const { lager, fluss, produktion } = effektiveRaten(state, planet);

    // Forschung verlässt den Planeten, statt in ein Lager zu gehen -- sie
    // wird dem laufenden Projekt des Imperiums gutgeschrieben. Steht hier
    // und nicht in einer eigenen Schleife über alle Planeten, weil die
    // Planeten seit der Uhr-je-Planet-Umstellung unterschiedlich weit
    // stehen: nur hier ist bekannt, welche Zeitspanne für DIESEN Planeten
    // gilt.
    forschungGutschreiben(state, planet, stunden, produktion);

    // Fluss-Speicher (Energie: die Batterie). Getrennt von den Lagerwaren,
    // weil sie NICHT durch insLager laufen: sie belegen keinen Lagerplatz,
    // sondern haben ihre eigene Obergrenze aus ihrem eigenen Gebäude.
    // Überschuss über der Kapazität verfällt -- er wird gar nicht erst
    // erzeugt, ein Kraftwerk drosselt real genauso.
    for (const [resId, proStunde] of Object.entries(fluss || {})) {
      if (!proStunde) continue;
      const grenze = speicherKapazitaet(planet, resId);
      const bestand = planet.ressourcen[resId] || 0;
      const neu = Math.min(grenze, Math.max(0, bestand + proStunde * stunden));
      // Auf null einrasten, damit kein Krümel stehen bleibt, der zu klein ist,
      // um noch ein Ereignis zu rechtfertigen -- gleiche Begründung wie beim
      // Einrasten auf die Reserve weiter unten.
      planet.ressourcen[resId] = neu < 1e-6 ? 0 : neu;
    }

    const zuwachs = {};
    for (const [resId, proStunde] of Object.entries(lager)) {
      const menge = proStunde * stunden;
      if (menge >= 0) {
        zuwachs[resId] = menge;
        continue;
      }
      // Negative Nettorate: eine Verarbeitungskette zieht aus dem Bestand.
      // Die Untergrenze ist die eingestellte Reserve; dass sie innerhalb
      // dieser Zeitspanne nicht unterschritten wird, stellt das Puffer-
      // Ereignis in naechstesEreignis sicher -- die Klammer hier fängt nur
      // Rundungsreste ab.
      const reserve = verarbeitungsReserveFuer(planet, resId);
      const bestand = planet.ressourcen[resId] || 0;
      const neu = Math.max(reserve, Math.max(0, bestand + menge));
      // Auf die Reserve einrasten: ein Fließkomma-Rest von 3e-8 über der
      // Grenze wäre formal noch Puffer, würde aber kein Ereignis mehr
      // rechtfertigen -- die Kette liefe dann unbemerkt ungedrosselt weiter.
      planet.ressourcen[resId] = neu - reserve < 1e-6 ? reserve : neu;
    }
    // Überproduktion bei vollem Lager verfällt bewusst -- anders als bei
    // Fracht gibt es hier kein "Schiff", das den Überschuss festhält.
    insLager(state, planet, zuwachs);
  }
}

/**
 * Bringt eine Auswahl von Planeten auf den Stand. `nur` ist die Liste der
 * Planeten, die das anstehende Ereignis tatsächlich berührt -- ohne Angabe
 * werden alle bewegt (Ende der Aufholung, Spieleraktionen).
 *
 * `state.letzterTick` bleibt als GEMEINSAME Untergrenze erhalten: neue
 * Planeten erben ihn, und er ist der Bezugspunkt für alles, was nicht an
 * einem einzelnen Planeten hängt.
 */
function ressourcenVorruecken(state, bisZeitpunkt, nur = null) {
  for (const planet of nur || state.planeten) planetVorruecken(state, planet, bisZeitpunkt);
  if (!nur && bisZeitpunkt > state.letzterTick) state.letzterTick = bisZeitpunkt;
}

// Jedes Ereignis meldet mit, WELCHE PLANETEN es berührt (`planeten`). Nur die
// werden vor der Ausführung auf den Stand gebracht -- das ist der Kern der
// Uhr-je-Planet-Umstellung.
//
// `planeten: null` heißt "berührt möglicherweise alles" und rückt sicherheits-
// halber alle vor. Das ist die richtige Vorgabe für alles, was quer über das
// Imperium wirkt (Forschung, Flottenankünfte mit unklarem Ziel).
// WAS BEIM SUCHEN NICHT PASSIEREN DARF: irgendetwas anfassen, das nur der
// GEWINNER braucht. Die Suche läuft je Ereignis einmal über alle Planeten,
// Fraktionen und Flotten -- alles, was sie je Kandidat tut, wird also mit der
// Weltgröße multipliziert, obwohl höchstens einer davon drankommt.
//
// Zwei Dinge standen deshalb an der falschen Stelle (gemessen 2026-08-16,
// volle Galaxie: 1.739 µs je Ereignis, 72 % davon in dieser Funktion):
//
//   1. `planetById` ist eine LINEARE Suche. Sie lief je Fraktion und je
//      Flotte, also 729 × 729 Vergleiche je Ereignis -- und ihr Ergebnis
//      entscheidet nichts, es benennt nur die Planeten, die vorgerückt werden
//      müssen. Jetzt wird sie EINMAL für den Gewinner aufgelöst.
//   2. Für jeden Kandidaten entstand eine Abschlussfunktion und ein Objekt.
//      Bei 2.180 Kandidaten je Ereignis sind das 2.179 Wegwerf-Allokationen.
//
// Die Suche merkt sich deshalb nur noch Zeit, Art und Entität -- drei
// Zahlen/Zeiger -- und baut Handler und Planetenliste erst danach.
//
// DIE REIHENFOLGE BLEIBT UNANGETASTET: gleiche Durchlaufreihenfolge, gleicher
// STRIKTER Vergleich (der erste Kandidat einer Zeit gewinnt), gleiches
// Ergebnis. Das ist keine Absichtserklärung, sondern geprüft --
// tests/zeit.test.js vergleicht die Auswahl gegen die frühere Fassung.
function naechstesEreignis(state) {
  // `besteArt === null` steht für "noch nichts gefunden" und ersetzt das
  // frühere `!bestes` -- ausdrücklich nicht Infinity, damit sich auch ein
  // (theoretischer) unendlicher Zeitpunkt genauso verhält wie vorher.
  let besteZeit = 0;
  let besteArt = null;
  let besteEntitaet = null;
  const pruefe = (zeit, art, entitaet = null) => {
    if (besteArt === null || zeit < besteZeit) {
      besteZeit = zeit;
      besteArt = art;
      besteEntitaet = entitaet;
    }
  };

  // INDEXSCHLEIFEN statt for...of, und weiter unten for...in statt
  // Object.values: beides läuft je Ereignis über die ganze Welt, und der
  // Iterator bzw. das Zwischenarray sind dort keine Kleinigkeit mehr.
  // Die Reihenfolge ist dieselbe -- Arrays laufen aufsteigend, und für ein
  // Objekt ohne Zahlenschlüssel liefert for...in dieselbe Folge wie
  // Object.values (Einfügereihenfolge).
  const planeten = state.planeten;
  for (let i = 0; i < planeten.length; i++) {
    const planet = planeten[i];
    if (planet.bauQueue) {
      pruefe(planet.bauQueue.fertigZeit, "bau", planet);
    }
    if (planet.werftQueue) {
      pruefe(planet.werftQueue.fertigZeit, "werft", planet);
    }
    // Verarbeitungsketten, die gerade aus dem Lager nachziehen: der Moment, in
    // dem der Bestand die Reserve erreicht, trennt zwei Abschnitte mit jeweils
    // KONSTANTER Rate. Nur deshalb bleibt "Rate × Zeitspanne" gültig.
    // Der Handler selbst tut nichts -- das Aufteilen des Intervalls IST seine
    // Aufgabe, denn danach rechnet produktionsAufloesung mit dem gedrosselten
    // Regime weiter.
    // pufferGrenzeStunden liefert nur Zeitpunkte oberhalb der gemeinsamen
    // Mindestdauer -- ein Puffer darunter gilt beiden Seiten als leer und ist
    // in produktionsAufloesung bereits gedrosselt.
    //
    // Bezugspunkt ist die UHR DIESES PLANETEN, nicht state.letzterTick: seit
    // der Umstellung stehen die Planeten unterschiedlich weit, und die
    // Reichweite eines Puffers wird aus seinem eigenen Bestand gerechnet.
    // Der Wert ist gemerkt -- siehe pufferGrenzeZeitpunkt.
    // Gemerkten Wert direkt lesen und nur bei Bedarf rechnen -- der Aufruf
    // selbst war hier messbar, weil er je Planet und je Ereignis anfällt.
    const grenze =
      planet.pufferGrenzeMerker !== undefined
        ? planet.pufferGrenzeMerker
        : pufferGrenzeZeitpunkt(state, planet);
    if (grenze !== null) pruefe(grenze, "puffer", planet);
    if (planet.naechstesWachstum) {
      pruefe(planet.naechstesWachstum, "wachstum", planet);
    }
  }
  if (state.forschungsQueue) {
    // Forschung wirkt imperiumsweit (Kategorie-Boni ändern jede Rate), also
    // müssen alle Planeten bis dorthin gerechnet sein -- `planeten: null`.
    // Das ist seit v0.6 doppelt nötig: der Fortschritt entsteht erst dadurch,
    // dass die Planeten mit ihren Laboren vorgerückt werden.
    const fertig = forschungFertigProjektion(state);
    if (fertig !== null) pruefe(fertig, "forschung");
  }
  // Die Supernova. `planeten: null` -- sie wirkt auf alles gleichzeitig, also
  // müssen alle Welten bis dorthin gerechnet sein.
  const sn = state.supernova;
  if (sn) {
    if (sn.phase === "vorwarnung") pruefe(sn.kollapsZeit, "snBlitz");
    // Die Erholung der Ozonschicht ist ein eigenes Ereignis, kein Verlauf --
    // zwischen zwei Ereignissen muss jede Rate konstant bleiben.
    else if (sn.phase === "blitz" && sn.ozonKaputt && sn.ozonZeit)
      pruefe(sn.ozonZeit, "snOzon");
    if (sn.phase === "blitz") pruefe(sn.flutZeit, "snFlut");
  }

  // Formieren sich irgendwo neue Banden? Ein Takt für die ganze Galaxie --
  // nicht je Fraktion, sonst skalierte es mit der Zahl der Akteure.
  if (state.naechsteBandenPruefung) {
    pruefe(state.naechsteBandenPruefung, "banden");
  }
  // Entscheidungsschritt jeder handelnden Fraktion. Ein Ereignis je Fraktion
  // und Takt. Welche Routine läuft, steht als `verhalten` in der Art -- ein
  // Tabellennachschlag, KEINE Verzweigung nach fraktion.art.
  const fraktionen = state.fraktionen || {};
  for (const id in fraktionen) {
    const fraktion = fraktionen[id];
    if (!fraktion.naechsterSchritt) continue;
    // Die Prüfung auf eine Routine entscheidet MIT, ob es diesen Kandidaten
    // überhaupt gibt, und bleibt deshalb hier -- sie ist ein Tabellengriff.
    // Die Basis dagegen benennt nur die Planeten und wird unten aufgelöst.
    if (!VERHALTEN[fraktionArt(fraktion).verhalten]) continue;
    pruefe(fraktion.naechsterSchritt, "fraktion", fraktion);
  }
  const flotten = state.flotten;
  for (let i = 0; i < flotten.length; i++) {
    const flotte = flotten[i];
    if (flotte.abschnitt) {
      // Ereigniszeit mitgeben: Folgeabschnitte müssen ab der Ankunft rechnen,
      // nicht ab "jetzt" -- sonst wandern sie bei Zeitsprüngen mit.
      //
      // Eine Ankunft kann Fracht abladen, eine Kolonie gründen oder einen
      // Kampf auslösen. Bei einem HAFEN-Befehl -- also jedem Routenhalt und
      // jeder Heimkehr -- steht der betroffene Planet aber schon vorher fest,
      // und das ist der mit Abstand häufigste Fall: eine automatisierte Route
      // erzeugt nichts anderes. Missionen bleiben unbestimmt.
      pruefe(flotte.abschnitt.ankunftZeit, "ankunft", flotte);
    }
    if (flotte.gefecht) {
      pruefe(flotte.gefecht.naechsteRundeZeit, "gefecht", flotte);
    }
  }
  for (const transfer of state.logistikTransfers) {
    pruefe(transfer.ankunftZeit, "transfer", transfer);
  }
  if (besteArt === null) return null;
  return ereignisBauen(state, besteZeit, besteArt, besteEntitaet);
}

// Baut aus der Auswahl das fertige Ereignis -- EINMAL je Ereignis statt
// einmal je Kandidat. Hier stehen die Planetenlisten, die vorher in der Suche
// standen; ihre Begründungen sind unverändert:
//
//   `planeten: null` heißt "berührt möglicherweise alles". Das ist richtig für
//   Forschung (Kategorie-Boni ändern jede Rate), für die Supernova (sie wirkt
//   auf alles gleichzeitig), für die Bandenprüfung und für einen Kampf.
//
//   Eine Flottenankunft kann Fracht abladen, eine Kolonie gründen oder einen
//   Kampf auslösen -- ihr Ziel ist unbestimmt. NUR bei einem HAFEN-Befehl
//   steht der Planet vorher fest, und das ist der häufigste Fall: eine
//   automatisierte Route erzeugt nichts anderes.
//
// Die Ereigniszeit wird überall DURCHGEREICHT (`zeit`), nie die Wanduhr --
// derselbe Fehlertyp hat dieses Projekt schon mehrfach erwischt.
function ereignisBauen(state, zeit, art, entitaet) {
  switch (art) {
    case "bau":
      return { zeit, ausfuehren: (t) => bauAbschliessen(state, entitaet, t), planeten: [entitaet] };
    case "werft":
      return { zeit, ausfuehren: (t) => werftAbschliessen(state, entitaet, t), planeten: [entitaet] };
    // Der Puffer-Handler tut nichts -- das Aufteilen des Intervalls IST seine
    // Aufgabe, danach rechnet produktionsAufloesung im gedrosselten Regime.
    case "puffer":
      return { zeit, ausfuehren: () => {}, planeten: [entitaet] };
    case "wachstum":
      return { zeit, ausfuehren: (t) => bevoelkerungSchritt(state, entitaet, t), planeten: [entitaet] };
    case "forschung":
      return { zeit, ausfuehren: (t) => forschungAbschliessen(state, t), planeten: null };
    case "snBlitz":
      return { zeit, ausfuehren: (t) => supernovaBlitz(state, t), planeten: null };
    case "snOzon":
      return { zeit, ausfuehren: (t) => supernovaOzonErholt(state, t), planeten: null };
    case "snFlut":
      return { zeit, ausfuehren: (t) => supernovaFlut(state, t), planeten: null };
    case "banden":
      return {
        zeit,
        ausfuehren: (t) => {
          state.naechsteBandenPruefung = t + PIRAT.gruendung.taktMs;
          piratenNeugruendung(state, t);
        },
        planeten: null,
      };
    case "fraktion": {
      const routine = VERHALTEN[fraktionArt(entitaet).verhalten];
      const basis = planetById(state, entitaet.basisPlanet);
      return { zeit, ausfuehren: (t) => routine(state, entitaet, t), planeten: basis ? [basis] : null };
    }
    case "ankunft": {
      const naechster = entitaet.befehle && entitaet.befehle[0];
      const hafen =
        naechster && naechster.art === "hafen" ? planetById(state, naechster.planetId) : null;
      return {
        zeit,
        ausfuehren: (t) => flotteAngekommen(state, entitaet, t),
        planeten: hafen ? [hafen] : null,
      };
    }
    case "gefecht":
      return { zeit, ausfuehren: (t) => kampfRundeAusfuehren(state, entitaet, t), planeten: null };
    // Ein Transfer berührt nur sein Ziel -- die Quelle wurde beim Losschicken
    // schon abgebucht (siehe logistiknetzPruefen).
    case "transfer": {
      const ziel = planetById(state, entitaet.zielPlanet);
      return {
        zeit,
        ausfuehren: () => logistikTransferAnkommen(state, entitaet),
        planeten: ziel ? [ziel] : null,
      };
    }
    default:
      return null;
  }
}

// Bevölkerungsschritt: wächst bei gedeckter Versorgung und freiem Wohnraum,
// schrumpft bei Nahrungsmangel -- symmetrisch, Tobis ausdrückliche
// Entscheidung. Wie der Kampf eine bewusste Ausnahme von "verhindern statt
// bestrafen".
//
// Die Prüfung liest `drosselung.nahrung` aus der Produktionsauflösung: die ist
// genau dann < 1, wenn der Bedarf den Zustrom übersteigt UND der Vorrat
// aufgebraucht ist. Solange noch Nahrung im Lager liegt, wächst die
// Bevölkerung also weiter und zehrt den Vorrat auf -- man kann sich bewusst
// übernehmen, und merkt es erst, wenn das Lager leer ist.
function bevoelkerungSchritt(state, planet, zeit) {
  // Ereigniszeit weiterreichen, nie spielzeitJetzt -- sonst driftet der
  // Rhythmus bei Offline-Aufholung und Zeitsprüngen.
  planet.naechstesWachstum = zeit + BEVOELKERUNG.schrittMs;
  if (planet.typ === "aussenposten") return;

  const { drosselung } = effektiveRaten(state, planet);
  const versorgt = (drosselung.nahrung === undefined ? 1 : drosselung.nahrung) >= 1;
  const menschen = planet.ressourcen.bevoelkerung || 0;
  const platz = speicherKapazitaet(planet, "bevoelkerung");

  // Aus null Menschen wächst niemand nach. Ohne diese Prüfung würde sich ein
  // ausgestorbener Planet von selbst wiederbesiedeln -- der Null-Zustand wäre
  // dann keiner, sondern nur eine Delle. Der Weg zurück führt ausschließlich
  // über gelieferte Siedler, und das ist die ursächliche Variante.
  if (menschen <= 0) return;

  if (!versorgt) {
    const neu = Math.max(0, menschen - BEVOELKERUNG.proSchritt);
    planet.ressourcen.bevoelkerung = neu;
    meldungHinzufuegen(
      state,
      t("{planet}: Nahrung reicht nicht – die Bevölkerung schrumpft auf {menge}.", {
        planet: planet.name,
        menge: Math.round(neu),
      }),
      `hunger-${planet.id}`
    );
    return;
  }
  if (menschen >= platz) return; // kein Wohnraum frei: Wachstum ruht still
  planet.ressourcen.bevoelkerung = Math.min(platz, menschen + BEVOELKERUNG.proSchritt);
}

// Obergrenze der Ereignisse je Aufruf.
//
// Das ist eine ENDLOSSCHLEIFEN-SICHERUNG, kein Leistungsbudget: die Schleife
// füttert sich selbst, weil jedes Ereignis ein Folgeereignis einplanen darf.
// Ohne Grenze wäre ein Ereignis, das sich selbst in die Gegenwart einplant,
// ein eingefrorener Browser-Tab.
//
// Bewusst eine feste ZAHL und keine Zeitmessung: eine Wanduhr-Grenze machte
// die Simulation vom Rechner abhängig, und damit wären Tests und
// Offline-Aufholung nicht mehr reproduzierbar.
//
// Reißt sie, geht nichts verloren und nichts wird doppelt gebucht (dafür
// sorgt "letzterTick läuft nie rückwärts", siehe ressourcenVorruecken). Was
// leidet, ist die GENAUIGKEIT DER RATENWECHSEL: die Produktion der
// übersprungenen Spanne wird mit den Raten gebucht, die im Moment des
// Abbruchs galten -- eine Mine, die darin fertig geworden wäre, hat noch
// nicht mitproduziert.
//
// Gemessen 2026-08-15 (tests/skalierung.mjs): mit 500 riss der Deckel im
// NORMALBETRIEB -- schon eine einzige laufende Route über Nacht lag darüber
// (1.341 Ereignisse in 12 h). Der Wert war zu knapp für das, was er sein
// soll: eine Notbremse für den kaputten Fall, nicht für den gewöhnlichen.
//
// Seit v0.32 ist ein Ereignis rund fünfzigmal billiger (Uhr je Planet plus
// gemerkte Puffergrenze), und damit darf die Zahl großzügig sein: 100.000
// decken ein Endgame-Imperium mit 50 automatisierten Flotten über einen ganzen
// Tag Abwesenheit ab (8 h erzeugen dort rund 36.000 Ereignisse) und kosten
// dabei gut zwei Sekunden.
//
// Sie bleibt trotzdem, was sie ist: eine Notbremse gegen ein Ereignis, das
// sich selbst in die Gegenwart einplant. Sie ist KEIN Leistungsbudget -- eine
// Ereigniszahl kann keine Rechenzeit begrenzen, solange die Kosten je Ereignis
// noch mit der Weltgröße wachsen. Sie tun das seit v0.32 nur noch schwach.
// NEU GEMESSEN 2026-08-16, volle Galaxie (Saat 20260815, 729 Fraktionen):
// eine Aufholung über 48 h braucht **364.093 Ereignisse**. Mit 100.000 riss
// der Deckel schon bei 24 h -- und ein gerissener Deckel ist kein Leistungs-
// problem, sondern eine STILLE VERFÄLSCHUNG: die Restzeit wird pauschal
// gebucht, und in einer Messung fand die Supernova dadurch schlicht nicht
// statt, während die Farmen durch das Ozonloch hindurch weiterproduzierten.
//
// Die Demo dauert 48 h und ihre Frist läuft offline weiter -- eine
// Übernachtung ist damit der Normalfall. Der Wert muss den Normalfall mit
// Abstand tragen: 2.000.000 decken rund eine Woche Abwesenheit in einer
// vollen Galaxie ab.
//
// Er bleibt bewusst eine EREIGNISZAHL und wird keine Zeitschranke. Eine
// Zeitschranke hinge an der Geschwindigkeit des Rechners, und damit wäre die
// Simulation nicht mehr reproduzierbar -- zwei Spieler mit demselben
// Spielstand bekämen verschiedene Welten. Was die Zahl begrenzt, ist der
// kaputte Fall: ein Ereignis, das sich selbst in die Gegenwart einplant.
export const EREIGNIS_DECKEL = 2000000;

/**
 * Holt die Simulation bis `jetzt` nach.
 * @param deckel Obergrenze der Ereignisse. Nur Tests setzen sie abweichend --
 *   der Regressionstest zum gerissenen Deckel prüft den MECHANISMUS und darf
 *   deshalb nicht davon abhängen, wie groß EREIGNIS_DECKEL gerade ist.
 * @returns {{ereignisse: number, deckelGerissen: boolean}} Diagnose für
 *   tests/skalierung.mjs. Bewusst ein Rückgabewert und kein Feld am State:
 *   es ist eine Messung des letzten Aufrufs, kein Spielstand.
 */
export function vorspulenBisJetzt(state, jetzt = spielzeitJetzt(state), deckel = EREIGNIS_DECKEL) {
  // Erstmalige Einplanung des Wachstums. Bewusst hier und nicht in
  // naechstesEreignis: das ist eine reine Abfrage und soll nichts verändern.
  for (const planet of state.planeten) {
    if (!planet.naechstesWachstum) planet.naechstesWachstum = state.letzterTick + BEVOELKERUNG.schrittMs;
  }
  // Erste Einplanung der Banden-Pruefung, gleiche Stelle und gleiche
  // Begruendung wie beim Bevoelkerungswachstum.
  if (!state.naechsteBandenPruefung) state.naechsteBandenPruefung = state.letzterTick + PIRAT.gruendung.taktMs;
  let iterationen = 0;
  let deckelGerissen = true;
  while (iterationen++ < deckel) {
    const ereignis = naechstesEreignis(state);
    if (!ereignis || ereignis.zeit > jetzt) {
      deckelGerissen = false;
      break;
    }
    // NUR die betroffenen Planeten auf die Ereigniszeit bringen. Das ist die
    // eigentliche Ersparnis: ein Bauauftrag auf einem Planeten rechnet nicht
    // mehr die Wirtschaft aller anderen durch.
    ressourcenVorruecken(state, ereignis.zeit, ereignis.planeten);
    logistiknetzPruefen(state, ereignis.zeit);
    ereignis.ausfuehren(ereignis.zeit);
  }
  // Zum Schluss ALLE auf jetzt -- ab hier darf die Oberfläche lesen, und sie
  // liest ohne weitere Vorkehrung direkt aus planet.ressourcen.
  ressourcenVorruecken(state, jetzt);
  logistiknetzPruefen(state, jetzt, true);
  return { ereignisse: iterationen - 1, deckelGerissen };
}

// Nimmt "zeit" statt spielzeitJetzt entgegen (Ereigniszeit des Handlers) --
// sonst würde der nächste Warteschlangeneintrag bei Zeitsprüngen zu früh
// starten. Derselbe Fehlertyp trat schon zweimal in diesem Projekt auf
// (Flotten-Rückflug, Kampfrunden), siehe Projekt-Notizen.
function bauAbschliessen(state, planet, zeit) {
  planet.gebaeude[planet.bauQueue.gebaeudeId] = planet.bauQueue.zielLevel;
  const naechster = planet.bauWarteschlange.shift();
  planet.bauQueue = naechster
    ? {
        gebaeudeId: naechster.gebaeudeId,
        zielLevel: naechster.zielLevel,
        startZeit: zeit,
        fertigZeit: zeit + naechster.dauerSek * 1000,
      }
    : null;
}

// --- Piraten als Fraktion ---------------------------------------------
//
// Etappe 1: eine Gruppe hat einen BEDARF und deckt ihn selbst. Sie holt
// Material im eigenen System, baut daraus Schiffe, und schrumpft auf null,
// wenn nichts mehr nachkommt. Kein Spielerkontakt -- Beutezüge gegen Fracht
// kommen erst in Etappe 3.
//
// Alles daran benutzt vorhandene Maschinerie: die Basis ist ein ganz normaler
// Planet (nur einer anderen Fraktion), die Flotte ist eine normale Flotte, die
// Bergung läuft über dieselbe Missionsmechanik wie beim Spieler. Es kommt kein
// einziges Parallelsystem dazu -- das ist Prinzip 5 in Reinform.
//
// WANN eine Gruppe entsteht: BEIM WELTSTART, alle auf einmal, unabhängig vom
// Spieler.
//
// Eine frühere Fassung erweckte sie erst bei Entdeckung -- aus Sparsamkeit,
// und das war falsch. Es hätte Prinzip 1 auf den Kopf gestellt ("die Welt
// beginnt zu existieren, wenn du hinsiehst") und Tobis eigentliche Vorgabe
// verfehlt: **das Spiel soll ohne Spieler funktionieren, mit einem und mit
// hundert.** Eine Galaxie, die man im Schnelldurchlauf laufen lassen und beim
// Sich-Entwickeln zusehen kann, ist genau der Punkt -- und faul abgeleitete
// Gruppen kann man nicht beim Handeln beobachten.
//
// Bezahlbar ist das erst seit dem Skalierungsumbau in v0.32: gemessen tragen
// 551 Planeten und 450 Flotten den 414-fachen Echtzeitfaktor.
export function piratenWeltStart(state, zeit = state.letzterTick) {
  for (let systemId = 1; systemId <= state.galaxie.anzahlSysteme; systemId++) {
    const system = holeSystem(state, systemId);
    for (const objekt of system.objekte) {
      if (objekt.typ === "gefahr") piratenErwecken(state, systemId, objekt, zeit);
    }
  }
}

function piratenErwecken(state, systemId, objekt, zeit) {
  if (!objekt || objekt.typ !== "gefahr" || objekt.verteidigerBesiegt) return null;
  if (objekt.fraktionId && fraktionById(state, objekt.fraktionId)) return null;

  const id = `pirat-${state.naechsteFraktionId++}`;
  state.fraktionen[id] = neueFraktion({ id, art: "pirat", name: objekt.bezeichnung });

  // Die Basis ist ein Planet wie jeder andere -- ohne Bevölkerung, ohne
  // Gebäude. Dass das ohne Sonderbehandlung durchrechnet, ist genau die
  // Zusicherung aus Prinzip 7, die dafür seit v0.19 durchgesetzt wird.
  const basis = neuerPlanet({
    id: state.naechstePlanetId++,
    systemId,
    orbit: objekt.orbit,
    name: objekt.name,
    typ: "kolonie",
    fraktion: id,
  });
  basis.letzterTick = zeit;
  hinzufuegen(basis.ressourcen, skalieren(PIRAT.startVorrat, 1));
  state.planeten.push(basis);

  // Die Flotte, die bisher im Objekt stand, wird eine echte Flotte.
  const flotte = flotteAufstellen(state, basis, objekt.bezeichnung);
  const schiffe = objekt.verteidigerSchiffe || objekt.daten.flotte || {};
  for (const [schiffId, anzahl] of Object.entries(schiffe)) {
    basis.schiffe[schiffId] = (basis.schiffe[schiffId] || 0) + anzahl;
    schiffeUmladen(state, flotte, schiffId, anzahl);
  }
  // Frachtraum von Anfang an -- ohne ihn kann die Gruppe nichts heimbringen.
  basis.schiffe[PIRAT.frachtTyp] = (basis.schiffe[PIRAT.frachtTyp] || 0) + PIRAT.frachterMindestens;
  schiffeUmladen(state, flotte, PIRAT.frachtTyp, PIRAT.frachterMindestens);
  // ECHTER TANK seit v0.64. Vorher stand hier MAX_SAFE_INTEGER/4 mit der
  // Begruendung "Piraten tanken nicht bei uns" -- ein Perpetuum mobile
  // (Prinzip 0 und 13), das bis v0.63 nur nie sichtbar war. Sichtbar wurde
  // es, als umziehende Gruppen unterwegs starben: flotteLeerAufloesen kippt
  // den Resttreibstoff als Tritium in die Welt, und das waren je Flotte 2,25
  // Billiarden. Piraten tanken jetzt aus ihrer Beute wie alle anderen.
  flotte.treibstoff = flotteTankKapazitaet(state, flotte);

  const fraktion = state.fraktionen[id];
  // Ein Schmugglerdock. Ohne Handelsposten greift handelVerfuegbar nicht und
  // die Gruppe kaeme trotz handel:true nie an Treibstoff (v0.67).
  basis.gebaeude.handelsposten = 1;
  fraktion.basisPlanet = basis.id;
  fraktion.flotteId = flotte.id;
  fraktion.naechsterSchritt = zeit + PIRAT.taktMs;

  setzeOrbitZustand(state, systemId, objekt.orbit, { fraktionId: id });
  return fraktion;
}

// Was eine Gruppe im eigenen System noch holen kann.
//
// ANOMALIEN SIND AUSGENOMMEN, und das ist eine Zusicherung, keine Feinheit:
// sie vergeben die Schlüsseltechnologien, und die Deadlock-Freiheit aus v0.3
// hängt daran, dass sie erreichbar bleiben. Kausal passt es ohnehin -- Räuber
// sind keine Forscher. Material ja, Wissen nein.
//
// Verschlossene Objekte (`benoetigt`) bleiben ebenfalls liegen: Piraten
// forschen nicht, also haben sie den Schlüssel nicht.
// Das lohnendste bergbare Objekt in einem System -- oder null.
//
// Bewusst ohne Fraktion, damit die NEUGRÜNDUNG dieselbe Frage mit derselben
// Antwort stellen kann (Prinzip: wiederverwenden statt Parallelsystem). Bis
// v0.42 prüfte die Gründung nur, ob irgendein Objekt überhaupt etwas hergibt,
// während die Bergungsfahrt `mindestBeute` verlangte. Zwei Maßstäbe für
// dieselbe Frage -- und das Ergebnis war eine Bande, die sich an einem Ort
// niederließ, an dem sie nach ihrer eigenen Regel nichts zu holen hatte:
// gemessen entstanden in acht Tagen 91 neue Gruppen, von denen 91 wieder
// eingingen. Sie bauten vier Schiffe aus der Mitgift, fanden dann kein Ziel
// und verfielen binnen sechs Takten.
export function besteBeuteImSystem(state, systemId, zeit) {
  const system = holeSystem(state, systemId);
  let bestes = null;
  for (const objekt of system.objekte) {
    if (objekt.typ === "anomalie" || objekt.typ === "gefahr") continue;
    if (objekt.benoetigt || objekt.verwertet) continue;
    const offen = objekt.nachwachsend
      ? offenerErtrag(state, objekt, zeit)
      : objekt.restErtrag || ertragVon(state, objekt);
    if (!offen) continue;
    const summe = Object.values(offen).reduce((a, b) => a + b, 0);
    if (summe < PIRAT.mindestBeute) continue;
    if (!bestes || summe > bestes.summe) bestes = { objekt, summe };
  }
  return bestes;
}

function piratenBeute(state, fraktion, zeit) {
  const basis = planetById(state, fraktion.basisPlanet);
  if (!basis) return null;
  return besteBeuteImSystem(state, basis.systemId, zeit);
}

// Ein Entscheidungsschritt. Reihenfolge ist die Reihenfolge des Bedarfs:
// erst verbauen, was da ist, dann nachholen, und wenn beides nicht geht,
// schrumpfen.
function piratenSchritt(state, fraktion, zeit) {
  fraktion.naechsterSchritt = zeit + PIRAT.taktMs;
  const basis = planetById(state, fraktion.basisPlanet);
  const flotte = flotteById(state, fraktion.flotteId);
  if (!flotte) return piratenAufloesen(state, fraktion);

  // Ein Splitter ist unterwegs zu seinem neuen Ort und hat noch keine Basis.
  // Er ist nicht am Ende, er ist auf Reisen -- ohne diese Unterscheidung löste
  // er sich beim ersten Takt selbst auf, noch im Flug. Gefunden im Weltlauf:
  // mit Teilung überlebten plötzlich weniger Gruppen als ohne.
  if (!basis) {
    if (flotte.abschnitt || flotte.befehle.length > 0) return;
    return piratenAufloesen(state, fraktion);
  }

  // TANKEN, seit die Tanks endlich sind (v0.64). Eine Gruppe zu Hause füllt
  // auf, was ihre Beute hergibt -- dieselbe Buchung wie beim Spieler, nur
  // ohne Klick. Ohne diese Zeilen wären die Piraten nach ihrem ersten
  // Ausflug für immer gestrandet, und die Galaxie stünde noch stiller als
  // vorher.
  if (!flotte.abschnitt && flotte.befehle.length === 0) {
    const platz = Math.max(0, flotteTankKapazitaet(state, flotte) - (flotte.treibstoff || 0));
    const nimm = Math.min(platz, Math.floor(basis.ressourcen.tritium || 0));
    if (nimm > 0) {
      basis.ressourcen.tritium -= nimm;
      flotte.treibstoff += nimm;
      planetGeaendert(basis);
    }
  }

  // HANDELN, wenn der Sprit knapp wird (v0.67).
  //
  // Das ist die einzige Treibstoffquelle, die Piraten überhaupt haben können:
  // Tritium steht in keiner Vorkommenstabelle und in keinem Wrack, es
  // entsteht ausschließlich im Extraktor. Sie verkaufen also Beute und kaufen
  // Sprit -- über denselben Markt und dieselbe Beziehungsschwelle wie jeder
  // andere. Wer zu viel geraubt hat, bekommt nichts mehr und strandet. Das
  // ist der Preis der Räuberei, und niemand musste ihn als Strafe einbauen.
  if (!flotte.abschnitt && flotte.befehle.length === 0) {
    piratenHandeln(state, fraktion, basis, flotte);
  }

  // Angekommene Beute steht als Fracht in der Flotte, sobald sie zu Hause ist.
  const bestand = basis.ressourcen;
  const schiffeGesamt = Object.values(flotte.schiffe).reduce((a, b) => a + b, 0);
  const grenze = fraktionGrenze(fraktion, "maxSchiffe") || Infinity;

  // REIHENFOLGE IST BEDARF: eine beladene Flotte im eigenen System ist die
  // beste Beute, die es gibt -- besser als jedes Wrack und wichtiger als der
  // nächste Rumpf. Die erste Fassung baute zuerst und kam nie zum Überfall.
  if (!flotte.abschnitt && flotte.befehle.length === 0) {
    if (piratenBeutezug(state, fraktion, basis, flotte, zeit)) return;
  }

  // BEUTE GEHT VOR BEWAFFNUNG: fehlt Frachtraum, kann die Gruppe nichts
  // heimbringen, und dann nützt ihr auch kein weiteres Kriegsschiff. Genau
  // dieser Fall hat beim ersten Wurf die ganze Galaxie stillstehen lassen.
  const frachter = flotte.schiffe[PIRAT.frachtTyp] || 0;
  const bauen = frachter < PIRAT.frachterMindestens
    ? { typ: PIRAT.frachtTyp, kosten: skalieren(PIRAT.frachtKosten, 1) }
    : { typ: PIRAT.schiffTyp, kosten: skalieren(PIRAT.schiffKosten, 1) };

  if (schiffeGesamt < grenze && reichenAus(bestand, bauen.kosten)) {
    abziehen(bestand, bauen.kosten);
    planetGeaendert(basis);
    basis.schiffe[bauen.typ] = (basis.schiffe[bauen.typ] || 0) + 1;
    if (!flotte.abschnitt) schiffeUmladen(state, flotte, bauen.typ, 1);
    return;
  }

  // Unterwegs? Dann diesen Takt nichts tun.
  if (flotte.abschnitt || flotte.befehle.length > 0) return;

  // Zu groß geworden: teilen. Kommt VOR der Bergungsfahrt, damit eine satte
  // Gruppe nicht ewig zwischen Volllager und Volllager pendelt, statt sich
  // auszubreiten.
  if (piratenTeilen(state, fraktion, basis, flotte, zeit)) return;

  const ziel = piratenBeute(state, fraktion, zeit);
  if (ziel) {
    // Exakt der Weg, den auch der Spieler nimmt -- Mission plus Heimflug.
    missionBefehlen(state, flotte, "bergung", basis.systemId, ziel.objekt.orbit, {}, zeit);
    return;
  }

  // Eine Gruppe an ihrer Schiffsgrenze ist SATT, nicht am Verhungern -- sie
  // wartet einfach. Ohne diese Unterscheidung fiel eine Gruppe mit vollem
  // Lager in den Verfallszweig und starb im Überfluss. Gefunden im Weltlauf,
  // nachdem dort binnen eines Tages die halbe Galaxie ausstarb.
  //
  // HIER GEHÖRT KEIN UMZUG HIN, obwohl genau hier die 84 festsitzenden
  // Gruppen stehen. Der erste Versuch hat es trotzdem getan, und das Ergebnis
  // war eine Endlosschleife: eine satte Gruppe zieht um, ist am Ziel wieder
  // satt, zieht wieder um. Die Testsuite lief von 15 auf 146 Sekunden.
  //
  // Der Grund ist Tobis Bedingung, und sie ist schärfer als sie klingt:
  // **ein Umzug muss aus NOT entstehen.** Satt ist das Gegenteil von Not.
  // Wer noch bauen kann, hat kein Motiv, seine Heimat aufzugeben.
  if (reichenAus(bestand, bauen.kosten)) return;

  // Nichts zu bauen, nichts zu holen: erst weiterziehen versuchen, und nur
  // wenn auch das nicht geht, auszehren. Der Umzug steht damit GENAU vor dem
  // Verfall -- er ist die letzte Handlung, nicht eine von vielen.
  if (piratenUmzug(state, fraktion, basis, flotte, zeit)) return;

  // Nichts zu bauen, nichts zu holen: die Gruppe zehrt aus. Das ist der
  // Verfall MIT Ursache aus Prinzip 13a -- kein Zerfall aus Alter, sondern
  // fehlender Unterhalt.
  const vorhanden = Object.entries(flotte.schiffe).filter(([, n]) => n > 0);
  if (vorhanden.length === 0) return piratenAufloesen(state, fraktion);
  const [schiffId] = vorhanden[0];
  const weg = Math.min(PIRAT.verfallProTakt, flotte.schiffe[schiffId]);
  flotte.schiffe[schiffId] -= weg;
  if (Object.values(flotte.schiffe).every((n) => n <= 0)) piratenAufloesen(state, fraktion);
}

// --- Neugründung (Etappe 4) -------------------------------------------
//
// **Piraten kommen aus Fraktionen** (Tobis Regel, 2026-08-15). Nicht aus dem
// leeren Raum, und nicht durch gestohlene Flotten: Schiffe bauen oder erwerben
// sie selbst, aber die MENSCHEN müssen von irgendwoher kommen. Wer sich
// absetzt, hat vorher zu jemandem gehört.
//
// Der Verlust ist für die Herkunftsfraktion klein -- ein paar hundert Leute
// gegen eine gewachsene Kolonie. Genau deshalb kann die Regel für den Spieler
// und für Bot-Imperien DIESELBE sein, ohne unfair zu werden. Eine Meuterei,
// die einem die halbe Flotte nimmt, wäre etwas ganz anderes gewesen.
//
// Bedingungen, alle drei kausal:
//   - genug Leute da (eine Handvoll Siedler stellt keine Bande),
//   - etwas zu holen im System (ohne Beute keine Räuber),
//   - noch keine Gruppe dort (zwei Banden im selben System wären Konkurrenz,
//     nicht Ausbreitung -- das kommt mit dem Beutezug ohnehin von selbst).
export function piratenNeugruendung(state, zeit) {
  const regeln = PIRAT.gruendung;
  const gruppen = Object.values(state.fraktionen).filter((f) => f.art === "pirat");
  if (gruppen.length >= regeln.maxGruppen) return false;

  const belegteSysteme = new Set();
  for (const f of gruppen) {
    const basis = planetById(state, f.basisPlanet);
    if (basis) belegteSysteme.add(basis.systemId);
  }

  // Die volkreichste geeignete Welt gibt ab -- dort fällt der Abgang am
  // wenigsten auf, und dort gibt es am ehesten Leute, die gehen wollen.
  //
  // ALLE Kandidaten der Reihe nach, nicht nur der beste. Bis v0.42 wurde die
  // volkreichste Welt ausgewählt und danach geprüft, ob in ihrem System etwas
  // zu holen ist -- war dort nichts, brach die Gründung ab, statt bei der
  // nächsten Welt weiterzusuchen. Im Weltlauf hat genau das den ganzen
  // Kreislauf blockiert: sechs Imperien mit je über drei Millionen Menschen,
  // eines davon mit Beute im System, und trotzdem entstand über 60 Tage keine
  // einzige neue Bande. Die volkreichsten beiden hatten nichts zu holen, und
  // weiter kam die Prüfung nie.
  const kandidaten = state.planeten
    .filter((planet) => {
      const art = fraktionArt(fraktionById(state, fraktionVon(planet)) || {});
      if (!art.nutzt.bevoelkerung) return false; // Piraten gebären keine Piraten
      if ((planet.ressourcen.bevoelkerung || 0) < regeln.abBevoelkerung) return false;
      return !belegteSysteme.has(planet.systemId);
    })
    .sort((a, b) => (b.ressourcen.bevoelkerung || 0) - (a.ressourcen.bevoelkerung || 0));

  // Ohne etwas zu holen entsteht keine Bande. Das ist die Ursache, die aus
  // "Leute setzen sich ab" überhaupt erst Piraterie macht.
  let quelle = null;
  let platz = null;
  for (const planet of kandidaten) {
    const system = holeSystem(state, planet.systemId);
    const freierOrbit = system.objekte.find(
      (o) => o.typ === "leer" && !planetAn(state, planet.systemId, o.orbit)
    );
    // DIESELBE Prüfung, die auch die Bergungsfahrt anlegt -- siehe
    // besteBeuteImSystem. Eine Beute, die zu klein zum Anfliegen ist, ist auch
    // kein Grund, sich niederzulassen.
    const beute = besteBeuteImSystem(state, planet.systemId, zeit);
    if (freierOrbit && beute) {
      quelle = planet;
      platz = freierOrbit;
      break;
    }
  }
  if (!quelle) return false;

  const id = `pirat-${state.naechsteFraktionId++}`;
  const fraktion = neueFraktion({ id, art: "pirat", name: regeln.name });
  fraktion.herkunft = fraktionVon(quelle);
  state.fraktionen[id] = fraktion;

  // DIE BEVÖLKERUNG KOMMT VON DER FRAKTION -- sie wird dort wirklich abgezogen.
  quelle.ressourcen.bevoelkerung = Math.max(0, quelle.ressourcen.bevoelkerung - regeln.bevoelkerung);
  planetGeaendert(quelle);

  const basis = neuerPlanet({
    id: state.naechstePlanetId++,
    systemId: quelle.systemId,
    orbit: platz.orbit,
    name: platz.name,
    typ: "kolonie",
    fraktion: id,
  });
  basis.letzterTick = zeit;
  // Was sie tragen konnten. Schiffe bauen sie sich davon selbst.
  const mitgift = {};
  for (const [resId, menge] of Object.entries(skalieren(regeln.mitgift, 1))) {
    const nehmen = Math.min(menge, quelle.ressourcen[resId] || 0);
    if (nehmen > 0) mitgift[resId] = nehmen;
  }
  abziehen(quelle.ressourcen, mitgift);
  hinzufuegen(basis.ressourcen, mitgift);
  // DIE MENSCHEN KOMMEN AUCH AN. Bis v0.42 wurden sie der Herkunftswelt
  // abgezogen und tauchten nirgends wieder auf -- zwanzigtausend Leute lösten
  // sich beim Umzug in Luft auf. Das verletzt Prinzip 4 (nichts teleportiert,
  // alles kommt physisch an) und 7a (nichts verschwindet grundlos) zugleich.
  // Aufgefallen ist es erst, als eine neu gegründete Basis mit 0 Bevölkerung
  // dastand; der Test dazu prüfte nur den Abzug, nicht die Ankunft.
  basis.ressourcen.bevoelkerung = regeln.bevoelkerung;
  state.planeten.push(basis);

  const flotte = flotteAufstellen(state, basis, fraktion.name);
  flotte.fraktion = id;
  flotte.treibstoff = flotteTankKapazitaet(state, flotte);

  fraktion.basisPlanet = basis.id;
  fraktion.flotteId = flotte.id;
  fraktion.naechsterSchritt = zeit + PIRAT.taktMs;

  // Die Herkunftsfraktion nimmt es übel -- Leute und Material sind weg.
  // Die Abtrünnigen haben damit kein Problem, sie sind ja gegangen.
  beziehungAendern(state, fraktion.herkunft, id, PIRAT.mutterHaltungZumSplitter);

  meldungHinzufuegen(
    state,
    t("{planet}: {anzahl} Menschen haben sich abgesetzt – eine neue Bande formiert sich.", {
      planet: quelle.name,
      anzahl: regeln.bevoelkerung,
    })
  );
  return true;
}

// --- Beutezug (Etappe 3) ----------------------------------------------
//
// Tobis Entscheidung: **Piraten greifen Fracht an, NIE Planeten.** Das hält
// "verhindern statt bestrafen" für das, was man nicht beaufsichtigen kann,
// macht aber das, was man bewusst automatisiert hat, zu einem echten Risiko --
// und gibt dem Kriegsschiff eine Verteidigungsrolle, die es bisher nicht hat.
//
// **Man sieht sie kommen.** Im All gibt es keine Tarnung: ein Schiff strahlt
// seine Abwärme gegen einen 3-Kelvin-Hintergrund ab (steht schon als Lore am
// Kriegsschiff). Der Überfall ist deshalb keine Falle, sondern eine
// Entscheidung mit Vorlauf -- hinfliegen und verteidigen, oder die Route
// umlegen.
// Wen überfällt diese Gruppe?
//
// SPRITNOT ÄNDERT DAS ZIEL (v0.65, Tobis Vorgabe). Wer fast leer ist, greift
// nicht mehr nach der dicksten Fracht, sondern nach dem, was ihn wieder
// fliegen lässt: Tritium an Bord -- ob im Tank oder in der Ladung.
//
// Das ist keine Sonderregel, sondern eine andere Bewertung derselben Ziele.
// Und es ist der Grund, warum ein Tritiumfrachter im falschen System ein
// gefährlicherer Ort ist als ein Erzfrachter: Piraten in Not suchen genau ihn.
function piratenZiel(state, fraktion, basis, flotte = null) {
  // Unter diesem Anteil zählt eine Gruppe als in Spritnot.
  const knapp =
    flotte && flotteTankKapazitaet(state, flotte) > 0
      ? flotte.treibstoff / flotteTankKapazitaet(state, flotte) < PIRAT.spritNotAnteil
      : false;

  let bestes = null;
  for (const fremd of state.flotten) {
    const wem = fraktionVon(fremd);
    if (wem === fraktion.id) continue;
    if (fremd.gefecht) continue;
    // Nur im eigenen System -- eine Gruppe überfällt, was bei ihr vorbeikommt.
    if (!fremd.ort || fremd.ort.systemId !== basis.systemId) continue;
    // Nur wer feindlich genug gesehen wird. Damit ist "wen überfalle ich"
    // eine Frage der Beziehung und keine Verzweigung nach Fraktionsart.
    if (beziehungZu(state, fraktion.id, wem) > KAMPF.beutezugAb) continue;

    const fracht = ladungGesamt(fremd);
    const sprit = Math.floor(fremd.treibstoff || 0) + Math.floor(fremd.ladung?.tritium || 0);
    // In Not zählt der Sprit, sonst die Fracht. Ein Ziel muss aber immer
    // irgendetwas hergeben, sonst lohnt der Überfall nicht.
    const wert = knapp ? sprit : fracht;
    if (fracht < PIRAT.mindestBeute && sprit < PIRAT.mindestBeute) continue;
    if (wert <= 0) continue;
    if (!bestes || wert > bestes.wert) bestes = { flotte: fremd, fracht, wert };
  }
  return bestes;
}

function piratenBeutezug(state, fraktion, basis, flotte, zeit) {
  const kampfkraft = flotte.schiffe[PIRAT.schiffTyp] || 0;
  if (kampfkraft <= 0) return false;
  const ziel = piratenZiel(state, fraktion, basis, flotte);
  if (!ziel) return false;

  flotte.gefecht = {
    zielFlotte: ziel.flotte.id,
    rueckzugsSchwelle: KAMPF.standardRueckzugsSchwelle,
    startHpAngreifer: schiffeStaerke(flotte.schiffe, flotte.schiffSchaden).hp,
    runde: 0,
    saat: kampfSaatZiehen(state),
    naechsteRundeZeit: zeit + PIRAT.vorwarnungMs,
  };

  // Die Vorwarnung ist der Kern: der Überfallene erfährt es, BEVOR es losgeht.
  meldungHinzufuegen(
    state,
    t("{angreifer} nimmt Kurs auf {flotte} – Kontakt in {dauer} Sekunden.", {
      angreifer: fraktion.name,
      flotte: ziel.flotte.name,
      dauer: Math.round(PIRAT.vorwarnungMs / 1000),
    })
  );
  return true;
}

// --- Teilung (Etappe 2) -----------------------------------------------
//
// Tobis Regel: über einer Größe muss gesplittert werden, und **der Splitter
// wird eine eigene Fraktion.** Damit wächst eine Gruppe nicht ins Endlose,
// sondern die Piraterie breitet sich AUS -- und zwar entlang einer echten
// Topologie, weil der Splitter physisch hinfliegt.
//
// Ein Zielsystem ist geeignet, wenn es in Reichweite liegt, noch keine Gruppe
// hat und überhaupt etwas hergibt. Ohne die letzte Bedingung zöge ein Splitter
// in ein leeres System und verhungerte dort sofort -- das wäre Ausbreitung
// ohne Ursache.
function piratenZielsystem(state, vonSystemId) {
  const belegt = new Set();
  for (const f of Object.values(state.fraktionen)) {
    if (f.art !== "pirat") continue;
    const basis = planetById(state, f.basisPlanet);
    if (basis) belegt.add(basis.systemId);
  }

  let bestes = null;
  for (let id = 1; id <= state.galaxie.anzahlSysteme; id++) {
    if (id === vonSystemId || belegt.has(id)) continue;
    const d = entfernung(state.galaxie.seed, vonSystemId, id);
    if (d > PIRAT.splitterReichweite) continue;
    if (bestes && d >= bestes.entfernung) continue;
    // Lohnt sich das Ziel überhaupt? Ein leeres System wäre ein Todesurteil.
    const system = holeSystem(state, id);
    const frei = system.objekte.find(
      (o) => o.typ !== "anomalie" && o.typ !== "gefahr" && !o.verwertet && !o.benoetigt && ertragVon(state, o)
    );
    if (!frei) continue;
    bestes = { systemId: id, entfernung: d, orbit: frei.orbit };
  }
  return bestes;
}

function piratenTeilen(state, fraktion, basis, flotte, zeit) {
  const schwelle = fraktionGrenze(fraktion, "splitterAb");
  const gesamt = Object.values(flotte.schiffe).reduce((a, b) => a + b, 0);
  if (!schwelle || gesamt < schwelle) return false;

  const ziel = piratenZielsystem(state, basis.systemId);
  if (!ziel) return false;

  const id = `pirat-${state.naechsteFraktionId++}`;
  const splitter = neueFraktion({ id, art: "pirat", name: fraktion.name });
  state.fraktionen[id] = splitter;

  // Die Trennung ist einseitig: der Splitter geht und hat damit kein Problem,
  // die Mutter verliert die halbe Flotte und schon. Beide Richtungen
  // ausdrücklich gesetzt, statt sie auf die Grundhaltung der Art fallen zu
  // lassen -- und sie sind absichtlich VERSCHIEDEN.
  splitter.beziehungen[fraktion.id] = PIRAT.splitterHaltungZurMutter;
  fraktion.beziehungen[id] = PIRAT.mutterHaltungZumSplitter;

  // Die Reiseflotte wird an der Mutterbasis aufgestellt und bekommt ihren
  // Anteil der Schiffe. Sie gehört ab sofort dem Splitter.
  const reise = flotteAufstellen(state, basis, fraktion.name);
  reise.fraktion = id;
  for (const [schiffId, anzahl] of Object.entries(flotte.schiffe)) {
    const mit = Math.floor(anzahl * PIRAT.splitterAnteil);
    if (mit <= 0) continue;
    flotte.schiffe[schiffId] -= mit;
    reise.schiffe[schiffId] = (reise.schiffe[schiffId] || 0) + mit;
  }
  if (Object.values(reise.schiffe).every((n) => !n)) {
    // Nichts mitzunehmen -- Teilung findet nicht statt.
    state.flotten = state.flotten.filter((f) => f.id !== reise.id);
    delete state.fraktionen[id];
    state.naechsteFraktionId--;
    return false;
  }
  reise.treibstoff = flotteTankKapazitaet(state, reise);

  // Mitgift aus dem Lager der Mutter, soweit vorhanden -- der Splitter soll
  // nicht mit leeren Händen ankommen, aber auch nichts aus dem Nichts bekommen.
  const mitgift = {};
  for (const [resId, menge] of Object.entries(skalieren(PIRAT.splitterMitgift, 1))) {
    const nehmen = Math.min(menge, basis.ressourcen[resId] || 0);
    if (nehmen > 0) mitgift[resId] = nehmen;
  }
  abziehen(basis.ressourcen, mitgift);
  hinzufuegen(reise.ladung, mitgift);
  planetGeaendert(basis);

  splitter.flotteId = reise.id;
  splitter.basisPlanet = null; // entsteht erst bei Ankunft
  splitter.naechsterSchritt = zeit + PIRAT.taktMs;

  // Physisch hinfliegen, über dieselbe Missionsmechanik wie alles andere.
  // Die Ereigniszeit MUSS mit -- sonst startet der Abschnitt bei einem
  // Zeitsprung mit der Wanduhr.
  missionBefehlen(state, reise, "niederlassung", ziel.systemId, ziel.orbit, {}, zeit);
  return true;
}

// Ankunft eines Splitters: hier entsteht seine Basis. Bewusst derselbe Aufbau
// wie beim Weltstart -- eine Basis ist eine Basis, egal wie sie entstanden ist.
function piratenNiederlassung(state, flotte, befehl, zeit) {
  const fraktion = fraktionById(state, fraktionVon(flotte));
  if (!fraktion || fraktion.basisPlanet) return;
  if (planetAn(state, befehl.zielSystem, befehl.zielOrbit)) return; // Platz inzwischen belegt

  const basis = neuerPlanet({
    id: state.naechstePlanetId++,
    systemId: befehl.zielSystem,
    orbit: befehl.zielOrbit,
    name: `${fraktion.name}`,
    typ: "kolonie",
    fraktion: fraktion.id,
  });
  basis.letzterTick = zeit;
  state.planeten.push(basis);

  basis.gebaeude.handelsposten = 1;
  fraktion.basisPlanet = basis.id;
  flotte.heimatPlanet = basis.id;
  flotte.dockPlanet = basis.id;
  // Die Mitgift wird abgeladen -- ab jetzt ist es ein normaler Stützpunkt.
  insLager(state, basis, flotte.ladung);
  flotte.ladung = {};
}

// Der Null-Zustand einer Fraktion: sie hört auf zu existieren. Ursächlich
// erreicht (kein Nachschub), und was sie hatte, bleibt liegen statt zu
// verschwinden -- die Basis wird wieder ein gewöhnliches Objekt der Welt.
// Eine Piratenbasis hört auf, eine Basis zu sein, und wird wieder ein
// gewöhnliches Objekt der Welt. Was im Lager lag, bleibt am Ort bergbar,
// statt sich aufzulösen (Prinzip 7a).
//
// Zwei Wege führen hierher, und sie sind sich näher, als es aussieht: die
// Gruppe stirbt, oder sie zieht weiter. In beiden Fällen bleibt ein
// verlassener Ort mit dem zurück, was niemand mittragen konnte.
function piratenBasisAufgeben(state, basis) {
  if (!basis) return;
  const rest = {};
  for (const [resId, menge] of Object.entries(basis.ressourcen)) {
    if (menge > 0) rest[resId] = Math.round(menge);
  }
  setzeOrbitZustand(state, basis.systemId, basis.orbit, {
    verteidigerBesiegt: true,
    verteidigerSchiffe: {},
    fraktionId: null,
    ...(Object.keys(rest).length > 0 ? { restErtrag: rest } : {}),
  });
  state.planeten = state.planeten.filter((p) => p.id !== basis.id);
}

function piratenAufloesen(state, fraktion) {
  piratenBasisAufgeben(state, planetById(state, fraktion.basisPlanet));
  state.flotten = state.flotten.filter((f) => f.id !== fraktion.flotteId);
  delete state.fraktionen[fraktion.id];
}

// UMZUG AUS NOT (v0.63).
//
// Tobis Vorgabe dazu: **"Die Heimatbasis zurückzulassen darf keine spontane
// Entscheidung sein und muss aus Not entstehen."** Beides steckt in der
// Stelle, an der diese Funktion gerufen wird, und in dem, was sie kostet:
//
//   NOT      -- sie läuft NUR im letzten Zweig der Entscheidungskette, dort
//               wo sonst der Verfall stünde: nichts zu bauen, nichts zu
//               bergen, das eigene System leer. Ein Takt später zerfiele die
//               Gruppe. Es ist kein Zug, es ist der letzte Ausweg.
//   RÜCKSCHLAG-- mitgenommen wird nur, was in die Laderäume passt. Der Rest
//               bleibt am alten Ort liegen -- für den Nächsten, der
//               vorbeikommt. Unterwegs hat die Gruppe keine Basis und kann
//               deshalb nichts bauen. Und findet sie am Ziel nichts, löst sie
//               sich dort auf, statt zurückzukehren.
//
// Warum das die eigentliche Reparatur ist: gemessen sitzen 84 von 84
// überlebenden Gruppen auf leergeräumten Welten, während 32,6 Mio Einheiten
// hinter Technologien liegen, die sie NIE bekommen können, und anderswo in
// der Galaxie freies Gut herumliegt. Eine Gruppe suchte bis v0.62
// ausschließlich im eigenen System -- sie konnte gar nicht anders, als dort
// zu verhungern.
// Beute zu Geld, Geld zu Sprit. Läuft nur bei Spritnot -- eine volle Gruppe
// hat keinen Grund, ihre Beute unter Wert loszuschlagen.
function piratenHandeln(state, fraktion, basis, flotte) {
  const tankKap = flotteTankKapazitaet(state, flotte);
  if (tankKap <= 0) return;
  if (flotte.treibstoff / tankKap >= PIRAT.spritNotAnteil) return;

  // Verkaufen, was sich verkaufen lässt. Nahrung und Bevölkerung sind
  // bewusst nicht dabei -- eine Piratenbasis hat weder das eine noch das
  // andere. Schlägt ein Verkauf fehl (Beziehung, leere Kasse des Partners),
  // ist das der normale Ausgang und kein Fehler.
  for (const resId of ["metall", "silizium", "iridium", "antimaterie"]) {
    const menge = Math.floor(basis.ressourcen[resId] || 0);
    if (menge > 0) verkaufen(state, basis, resId, menge);
  }

  // Und tanken, so weit die Kasse reicht.
  const platz = Math.max(0, tankKap - (flotte.treibstoff || 0));
  if (platz <= 0) return;
  const preis = MARKT_PREISE.tritium ? MARKT_PREISE.tritium.kauf : 0;
  if (preis <= 0) return;
  const bezahlbar = Math.floor((basis.ressourcen.credits || 0) / preis);
  const menge = Math.min(platz, bezahlbar);
  if (menge <= 0) return;
  if (!kaufen(state, basis, "tritium", menge).ok) return;

  // Gekauftes liegt am Markt, bis eine Flotte es staut -- dieselbe Reibung
  // wie beim Spieler. Die Flotte liegt hier am eigenen Dock, also staut sie
  // sofort und pumpt es in die Tanks.
  const gekauft = Math.floor(basis.marktlager.tritium || 0);
  if (gekauft <= 0) return;
  basis.marktlager.tritium -= gekauft;
  flotte.treibstoff = Math.min(tankKap, (flotte.treibstoff || 0) + gekauft);
  planetGeaendert(basis);
}

function piratenUmzug(state, fraktion, basis, flotte, zeit) {
  const ziel = piratenZielsystem(state, basis.systemId);
  if (!ziel) return false;

  // Mitnehmen, was die Laderäume fassen. Das ist der Preis: eine Gruppe mit
  // wenig Frachtraum lässt fast alles zurück.
  const frei = frachtraumFrei(state, flotte);
  const mitnahme = {};
  let platz = frei;
  for (const [resId, menge] of Object.entries(basis.ressourcen)) {
    if (menge <= 0 || platz <= 0) continue;
    const nehmen = Math.min(Math.floor(menge), platz);
    if (nehmen <= 0) continue;
    mitnahme[resId] = nehmen;
    platz -= nehmen;
  }
  abziehen(basis.ressourcen, mitnahme);
  hinzufuegen(flotte.ladung, mitnahme);

  meldungHinzufuegen(
    state,
    t("{gruppe} gibt ihren Stützpunkt auf und zieht weiter – ihr System ist leergeräumt.", {
      gruppe: fraktion.name,
    })
  );

  // Ab hier ist die Gruppe heimatlos. piratenNiederlassung baut ihr am Ziel
  // eine neue Basis -- dieselbe Funktion, die auch einen Splitter ankommen
  // lässt, denn eine Basis ist eine Basis, egal wie sie entstanden ist.
  piratenBasisAufgeben(state, basis);
  fraktion.basisPlanet = null;
  flotte.heimatPlanet = null;
  flotte.dockPlanet = null;

  // KEIN missionBefehlen: das hängt immer einen Heimflug an
  // (`{ art: "hafen", planetId: flotte.heimatPlanet }`), und der Hafen ist
  // gerade aufgelöst worden -- die Flotte flöge zu einem Planeten, den es
  // nicht mehr gibt. Genau daran sind beim ersten Versuch zehn Testgruppen
  // gescheitert. Ein Umzug ist eine EINWEGFAHRT, und das ist keine
  // Sonderbehandlung, sondern die Wahrheit über den Vorgang.
  befehleSetzen(
    state,
    flotte,
    [{ art: "mission", missionsart: "niederlassung", zielSystem: ziel.systemId, zielOrbit: ziel.orbit }],
    { einweg: true },
    zeit
  );
  return true;
}

// Ein gewonnener Beutezug. Die Fracht wechselt den Besitzer, soweit sie in
// den Frachtraum passt -- der Rest bleibt am Ort liegen (Prinzip 7a: nichts
// verschwindet einfach). Überlebende des Verteidigers fliegen heim, statt
// vernichtet zu werden: es war ein Überfall, keine Vernichtungsschlacht.
function beuteVonFlotte(state, angreifer, opfer, zeit) {
  // TANKS ABZAPFEN (v0.65). Ein überfallenes Schiff hat volle Tanks, und die
  // sind für einen Räuber wertvoller als jede Fracht -- ohne Sprit ist die
  // beste Beute wertlos.
  //
  // Das war die fehlende Hälfte eines Kreislaufs, der schon zur anderen
  // Hälfte existierte: flotteLeerAufloesen legt den Resttreibstoff einer
  // vernichteten Flotte längst als Tritium an den Kampfort. Bisher blieb er
  // dort liegen, statt in den Tank zu wandern, der ihn braucht.
  //
  // Damit finanziert sich Piraterie aus genau dem, was sie tut (Prinzip 0:
  // welcher Fluss hält das aufrecht?) -- und nicht mehr aus einem
  // Unendlich-Tank.
  const platz = Math.max(0, flotteTankKapazitaet(state, angreifer) - (angreifer.treibstoff || 0));
  const abgezapft = Math.min(platz, Math.floor(opfer.treibstoff || 0));
  if (abgezapft > 0) {
    opfer.treibstoff -= abgezapft;
    angreifer.treibstoff += abgezapft;
    meldungHinzufuegen(
      state,
      t("{flotte}: {menge} aus den Tanks abgezapft.", {
        flotte: opfer.name,
        menge: buendelText({ tritium: abgezapft }),
      })
    );
  }

  const beute = { ...opfer.ladung };
  const summe = Object.values(beute).reduce((a, b) => a + b, 0);
  if (summe > 0) {
    const frei = Math.max(0, flotteKapazitaet(state, angreifer) - ladungGesamt(angreifer));
    const anteil = summe <= frei ? 1 : frei / summe;
    const genommen = skalieren(beute, anteil);
    hinzufuegen(angreifer.ladung, genommen);
    abziehen(opfer.ladung, genommen);
    if (anteil < 1) {
      // Was nicht mitgeht, treibt am Kampfort -- Futter für den nächsten.
      zurueckgelassen(state, opfer.ort, opfer.ladung, t("{flotte}: verlorene Fracht", { flotte: opfer.name }), false);
      opfer.ladung = {};
    }
    meldungHinzufuegen(
      state,
      t("{flotte} wurde überfallen: {fracht} verloren.", {
        flotte: opfer.name,
        fracht: buendelText(genommen),
      })
    );
  }

  // Der Überfallene nimmt es persönlich -- der Überfallende nicht. Genau der
  // Fall, für den Beziehungen gerichtet gespeichert werden.
  beziehungHandlung(state, fraktionVon(angreifer), fraktionVon(opfer), "beuteZug");

  if (flotteLeer(opfer)) {
    flotteLeerAufloesen(state, opfer);
    return;
  }
  if (opfer.heimatPlanet) heimkehrBefehlen(state, opfer, zeit);
}

// --- Fremde Imperien (Bot-Fraktionen) ---------------------------------
//
// Eine Bot-Fraktion ist der Spieler, gesteuert von einer Routine statt von
// Klicks. Sie baut über `bauStarten` -- also durch dieselbe Tür wie die
// Oberfläche, mit allen Kosten, Voraussetzungen und Sperren.
//
// Sie ist die Antwort auf Tobis Regel „Piraten kommen aus Fraktionen": ohne
// Zivilisation gibt es niemanden, von dem Räuber leben könnten, und keinen
// Ursprung, aus dem sie hervorgehen. Und sie ist der Grund, warum ein
// Weltlauf ohne Spieler überhaupt etwas zeigen kann.
export function botWeltStart(state, zeit = state.letzterTick) {
  const belegt = new Set(state.planeten.map((p) => `${p.systemId}:${p.orbit}`));
  const besetzteSysteme = new Set(state.planeten.map((p) => p.systemId));
  // Schon bevoelkert? Dann nicht noch einmal -- der Weltstart ist einmalig.
  if (Object.values(state.fraktionen).some((f) => f.art === "bot")) return 0;
  let gesetzt = 0;

  for (let systemId = 1; systemId <= state.galaxie.anzahlSysteme && gesetzt < BOT.anzahl; systemId++) {
    if (besetzteSysteme.has(systemId)) continue;
    const system = holeSystem(state, systemId);
    // DIESELBE Bedingung, die auch für die Heimatwelt des Spielers gilt: eine
    // Startwelt muss ihre Bevölkerung ernähren können (taugtAlsStartwelt).
    //
    // Vorher wurde die erste besiedelbare Welt genommen, egal ob dort etwas
    // wächst. Auf rund zwei Dritteln aller bewohnbaren Kombinationen wächst
    // nichts -- gemessen am 2026-08-16 stand deshalb die Mehrheit der Bots
    // nach 24 h mit leerem Nahrungslager und schrumpfender Bevölkerung da, und
    // ihre Farm meldete "Nahrung gibt es hier nicht". Das sah nach schwacher
    // KI aus, war aber eine unmögliche Ausgangslage.
    const heimat = system.objekte.find(
      (o) =>
        o.typ === "planet" &&
        o.daten.kolonisierbar &&
        taugtAlsStartwelt(o.daten) &&
        !belegt.has(`${systemId}:${o.orbit}`)
    );
    if (!heimat) continue;

    const id = `bot-${state.naechsteFraktionId++}`;
    const fraktion = neueFraktion({ id, art: "bot", name: `${FRAKTIONS_ARTEN.bot.name} ${gesetzt + 1}` });
    state.fraktionen[id] = fraktion;

    const welt = neuerPlanet({
      id: state.naechstePlanetId++,
      systemId,
      orbit: heimat.orbit,
      name: heimat.name,
      typ: "heimat",
      startvorrat: BOT.startvorrat,
      fraktion: id,
      klasse: heimat.daten.klasse || null,
      zone: heimat.daten.zone || null,
      wasser: heimat.daten.wasser || null,
      schwerkraft: heimat.daten.schwerkraft || 1,
      groesse: heimat.daten.groesse || 150,
    });
    // Jede fremde Heimatwelt startet MIT Handelsposten und einer Kasse.
    //
    // Das ist keine Bequemlichkeit, sondern Prinzip 1: die Welt existiert,
    // bevor jemand hinsieht. Seit der Markt einen echten Gegenüber braucht
    // (v0.6), hängt die Frage "kann der Spieler überhaupt handeln" daran, ob
    // irgendwo draußen jemand Handel treibt. Ohne diese Zeilen gäbe es
    // NIEMANDEN: die Ausbauliste der Bots kennt den Posten erst seit v0.6,
    // und bis ein Bot ihn baut, vergehen Spieljahre. Der Markt wäre nicht
    // repariert, sondern abgeschaltet gewesen.
    welt.gebaeude.handelsposten = BOT.startHandelsposten;
    welt.ressourcen.credits = BOT.startKasse;
    welt.letzterTick = zeit;
    state.planeten.push(welt);
    belegt.add(`${systemId}:${heimat.orbit}`);
    besetzteSysteme.add(systemId);

    fraktion.basisPlanet = welt.id;
    fraktion.naechsterSchritt = zeit + BOT.taktMs;
    gesetzt++;
  }
  return gesetzt;
}

// Wie eine einzelne Engpass-Bedingung geprüft wird. Die REIHENFOLGE steht
// nicht hier, sondern in BOT.engpaesse -- diese Tabelle beantwortet nur je
// Stichwort "trifft das gerade zu?".
//
// Vorher lagen beide Hälften in dieser Funktion, und die Dringlichkeit war
// damit Logik statt Daten. Der Kommentar in data.js versprach schon immer
// "wer die KI ändern will, ändert diese Liste" -- eingelöst wird er erst
// jetzt.
const ENGPASS_PRUEFUNGEN = {
  energie: (state, planet, lage) =>
    (lage.produktion.energie || 0) < (lage.verbrauch.energie || 0),

  nahrung: (state, planet, lage) =>
    (lage.lager.nahrung || 0) < 0 ||
    (lage.drosselung.nahrung !== undefined && lage.drosselung.nahrung < 1),

  // Wohnraum VOR dem Anschlag: ein Wohnmodul ist erst nach seiner Bauzeit da,
  // und bis dahin wächst niemand mehr nach.
  wohnraum: (state, planet) => {
    const kapazitaet = speicherKapazitaet(planet, "bevoelkerung");
    if (!Number.isFinite(kapazitaet) || kapazitaet <= 0) return false;
    return (planet.ressourcen.bevoelkerung || 0) >= kapazitaet * BOT.engpassSchwellen.wohnraum;
  },

  // Ein volles Lager ist der einzige Engpass, der die Förderung nicht
  // drosselt, sondern VERWIRFT -- deshalb wird hier schon der knappe Rest
  // gemeldet, nicht erst die Null.
  lager: (state, planet) => {
    const kapazitaet = lagerKapazitaetGesamt(state, planet);
    if (kapazitaet <= 0) return false;
    return lagerFrei(state, planet) <= kapazitaet * BOT.engpassSchwellen.lagerFrei;
  },
};

// Welcher Engpass drückt gerade? Liest dieselbe Produktionsauflösung, die auch
// die Oberfläche anzeigt -- die KI sieht also genau das, was ein Spieler sieht.
//
// Es wird weiterhin GENAU EINER gemeldet, und das ist Absicht: ein Bot baut je
// Takt eine Sache. Welcher es ist, entscheidet allein die Reihenfolge der
// Liste.
function botEngpass(state, planet) {
  const lage = effektiveRaten(state, planet);
  for (const eintrag of BOT.engpaesse) {
    const pruefen = ENGPASS_PRUEFUNGEN[eintrag.wenn];
    if (pruefen && pruefen(state, planet, lage)) return eintrag.wenn;
  }
  return null;
}

// Fehlt für eine Nachschub-Ressource die ANLAGE? Dann ist das die dringendste
// Baustelle überhaupt -- dringender als jeder Engpass. Siehe BOT.nachschub für
// den Fall, der diese Regel erzwungen hat.
//
// Geprüft wird, ob das Gebäude STEHT -- ausdrücklich nicht, ob es gerade
// fördert. Der erste Anlauf fragte nach der effektiven Produktionsrate, und
// die ist bei Energiemangel null, obwohl die Mine längst da ist. Der Bot las
// das als "kein Nachschub", baute eine weitere Mine statt des fehlenden
// Kraftwerks, und weil ohne Strom weiter nichts förderte, wiederholte er das:
// nach 24 h vier Metallminen, kein Kraftwerk, Produktion null. Aus einer
// Regel gegen die Sackgasse war die perfekte Sackgasse geworden.
//
// Auf Welten, die eine Ressource gar nicht hergeben (Affinität 0), gilt sie
// nicht als fehlend -- dort ist keine Anlage die richtige Antwort, sondern
// später Handel oder eine Kolonie.
function botOhneNachschub(state, planet) {
  for (const eintrag of BOT.nachschub) {
    if (affinitaetFaktor(planet, eintrag.resId) <= 0) continue;
    if ((planet.gebaeude[eintrag.gebaeude] || 0) <= 0) return eintrag.gebaeude;
  }
  return null;
}

// Welche Nachschub-Ressource ist am knappsten -- gemessen an dem, was sie
// kostet, nicht an ihrer nackten Menge? 450.000 Metall neben 921 Silizium sind
// kein Reichtum, sondern ein Flaschenhals: gebaut wird immer aus beidem.
//
// Vorher lief der Ausbau eine feste Liste ab, in der die Metallmine vorn stand.
// Die war fast immer baubar -- weil er ja dauernd Metall förderte -- und hat
// sich so selbst verstärkt, während das Silizium versiegte. Gemessen an sieben
// Welten traf das fünf.
function botKnappste(state, planet) {
  let schlechteste = null;
  for (const eintrag of BOT.nachschub) {
    const bestand = planet.ressourcen[eintrag.resId] || 0;
    const pruef = kannBauen(state, planet, eintrag.gebaeude);
    // Kosten der nächsten Stufe als Maßstab: sie sagen, wofür der Vorrat
    // reichen muss. Ist der Bau gesperrt (falsche Welt), zählt die Ressource
    // hier nicht mit.
    const noetig = pruef.kosten ? pruef.kosten[eintrag.resId] || 0 : 0;
    if (noetig <= 0) continue;
    const deckung = bestand / noetig;
    if (!schlechteste || deckung < schlechteste.deckung) {
      schlechteste = { deckung, gebaeude: eintrag.gebaeude };
    }
  }
  return schlechteste ? schlechteste.gebaeude : null;
}

// --- Kolonisieren (Bot) -----------------------------------------------
//
// Damit wächst ein Imperium über seine Heimatwelt hinaus. Das ist nicht nur
// Ausbau: erst dadurch entsteht Verkehr zwischen Welten, und erst der gibt
// Piraten dauerhaft etwas zu holen. Ohne diesen Schritt endet der Weltlauf
// in einem stillen Endzustand, in dem sechs satte Imperien nebeneinander
// stehen und sonst nichts passiert.
//
// JEDER Schritt geht durch dieselbe Tür wie die Oberfläche: schiffBauen,
// flotteAufstellen, schiffeUmladen, tanken, missionBefehlen. Kein
// Parallelsystem, keine geschenkten Schiffe, keine Sonderregel -- die Kolonie
// entsteht am Ende über stuetzpunktGruenden, genau wie beim Spieler.

// Ein freier, besiedelbarer Orbit -- erst im eigenen System, dann im nächsten
// erreichbaren. Das eigene System zuerst, weil es billiger und schneller ist;
// ein Spieler entscheidet genauso.
function botKolonieZiel(state, fraktion, welt) {
  const reichweite = REICHWEITE.basis;
  const kandidaten = [];
  for (let systemId = 1; systemId <= state.galaxie.anzahlSysteme; systemId++) {
    const d = systemId === welt.systemId ? 0 : entfernung(state.galaxie.seed, welt.systemId, systemId);
    if (d > reichweite) continue;
    for (const objekt of holeSystem(state, systemId).objekte) {
      if (objekt.typ !== "planet" || !objekt.daten.kolonisierbar) continue;
      if (planetAn(state, systemId, objekt.orbit)) continue;
      kandidaten.push({ systemId, orbit: objekt.orbit, entfernung: d });
    }
  }
  if (!kandidaten.length) return null;
  kandidaten.sort((a, b) => a.entfernung - b.entfernung);
  return kandidaten[0];
}

// Ein Schritt Richtung Kolonie. Gibt true zurück, wenn in diesem Takt etwas
// getan wurde -- der Aufrufer hört dann auf, wie bei jedem anderen Bauwunsch.
//
// Bewusst EIN Schritt pro Takt statt einer Kette: so gelten Kosten,
// Bauzeiten und Warteschlangen unverändert, und der Fortschritt ist im
// Weltlauf beobachtbar statt in einem Tick versteckt.
// Steht dieses Gebäude schon -- oder wird es gerade gebaut? Die zweite Hälfte
// ist der wichtige Teil: `bauStarten` REIHT EIN, wenn die Bauschleife belegt
// ist. Wer nur die fertige Stufe prüft, bestellt denselben Bau in jedem Takt
// erneut. Gemessen hat das den Bots eine Bauschleife voller Tritiumextraktoren
// und Werften beschert (Stufe 4 bzw. 3), während das Kolonieschiff, auf das
// alles wartete, nie an die Reihe kam.
function botHatOderBaut(planet, gebaeudeId) {
  if ((planet.gebaeude[gebaeudeId] || 0) > 0) return true;
  if (planet.bauQueue && planet.bauQueue.gebaeudeId === gebaeudeId) return true;
  return (planet.bauWarteschlange || []).some((e) => e.gebaeudeId === gebaeudeId);
}

export function botKolonisieren(state, fraktion, welt, zeit) {
  const regeln = BOT.kolonie;
  if ((welt.ressourcen.bevoelkerung || 0) < regeln.abBevoelkerung) return false;
  if (planetenVon(state, fraktion.id).length >= regeln.maxPlaneten) return false;

  const ziel = botKolonieZiel(state, fraktion, welt);
  if (!ziel) return false;

  // 1. TREIBSTOFF. Ohne Tritium fliegt nichts, und ein Imperium, das nur Minen
  // und Wohnmodule baut, hat nie welches. Gemessen: die Flotte stand fertig
  // beladen im Hafen und die Mission wurde abgelehnt -- 151.706 nötig, 30.000
  // da. Der Extraktor steht bewusst HIER und nicht in BOT.nachschub: Tritium
  // ist kein Baustoff, sondern die Voraussetzung fürs Wegkommen. In der
  // Nachschubliste würde er vor der ersten Mine gebaut.
  //
  // Auf Welten ohne Tritium-Affinität schlägt bauStarten fehl, und die
  // Expansion unterbleibt. Das ist die ehrliche Antwort, solange es keinen
  // Handel gibt -- nicht jede Welt ist ein Sprungbrett.
  if (!botHatOderBaut(welt, "tritiumextraktor")) {
    if (bauStarten(state, welt, "tritiumextraktor", zeit).ok) return true;
  }

  // 2. Werft -- ohne sie gibt es keine Schiffe.
  if (!botHatOderBaut(welt, "werft")) return bauStarten(state, welt, "werft", zeit).ok;

  // Beides bestellt, aber noch nicht fertig: warten, nicht nachbestellen.
  if ((welt.gebaeude.tritiumextraktor || 0) <= 0 || (welt.gebaeude.werft || 0) <= 0) return false;

  // 2. Kolonieschiff bauen, wenn keines dasteht und keines unterwegs ist.
  const flotten = flottenVon(state, fraktion.id);
  const unterwegs = flotten.some((f) => (f.schiffe.kolonieschiff || 0) > 0);
  if (!unterwegs && (welt.schiffe.kolonieschiff || 0) <= 0) {
    if (welt.werftQueue) return false; // die Werft ist schon dran
    return schiffBauen(state, welt, "kolonieschiff", 1, zeit).ok;
  }

  // 3. Flotte bereitstellen und beladen.
  let flotte = flotten.find((f) => !f.abschnitt && f.befehle.length === 0);
  if (!flotte) {
    if (flotten.length > 0) return false; // eine ist unterwegs, das genügt
    flotte = flotteAufstellen(state, welt, fraktion.name);
    flotte.fraktion = fraktion.id;
  }
  if ((flotte.schiffe.kolonieschiff || 0) <= 0) {
    if (!schiffeUmladen(state, flotte, "kolonieschiff", 1).ok) return false;
  }
  // Untergrenze plus Anteil vom Vorrat: der Bedarf wächst mit der Strecke, und
  // eine abgelehnte Mission kostet einen ganzen Takt. Lieber einmal ordentlich
  // betanken als dreimal zu knapp.
  const wunsch = Math.max(regeln.tritium, Math.floor((welt.ressourcen.tritium || 0) * regeln.tritiumAnteil));
  if (flotte.treibstoff < wunsch) {
    tanken(state, flotte, wunsch - flotte.treibstoff);
  }

  // 4. Losschicken -- die Zeit wird DURCHGEREICHT. Aus einem Ereignis heraus
  // mit der Wanduhr zu rechnen ist der Fehler, der dieses Projekt schon
  // fünfmal erwischt hat.
  return missionBefehlen(state, flotte, "kolonie", ziel.systemId, ziel.orbit, {}, zeit).ok;
}

function botSchritt(state, fraktion, zeit) {
  fraktion.naechsterSchritt = zeit + BOT.taktMs;
  const welt = planetById(state, fraktion.basisPlanet);
  if (!welt) return;

  // Reihenfolge ist hier die eigentliche Intelligenz, und sie steht bewusst in
  // dieser Folge:
  //   1. NACHSCHUB -- ohne Förderung endet alles andere in einer Sackgasse.
  //   2. ENGPASS   -- eine echte Blockade (Strom, Nahrung, Wohnraum, Lager).
  //   3. KNAPPSTE  -- sonst die Mine ausbauen, die gerade fehlt.
  // Erst danach die alte Liste als Auffanglinie, damit der Bot nie ganz
  // untätig dasteht, wenn oben nichts baubar ist.
  // Kolonisieren kommt NACH Nachschub und Engpass, aber VOR dem weiteren
  // Ausbau. Stünde es hinten, käme es nie dran -- auf einer Welt gibt es immer
  // noch etwas auszubauen. Der eigene Auslöser (genug Bevölkerung) sorgt
  // dafür, dass es trotzdem nicht zu früh passiert.
  const ohneNachschub = botOhneNachschub(state, welt);
  const engpass = botEngpass(state, welt);
  if (!ohneNachschub && !engpass && botKolonisieren(state, fraktion, welt, zeit)) return;
  const wunsch = engpass
    ? (BOT.engpaesse.find((e) => e.wenn === engpass) || {}).gebaeude
    : null;
  const knappste = botKnappste(state, welt);

  const kandidaten = [ohneNachschub, wunsch, knappste, ...BOT.ausbau].filter(Boolean);
  for (const gebaeudeId of kandidaten) {
    // Durch dieselbe Tür wie die Oberfläche: kannBauen prüft Kosten,
    // Voraussetzungen, Bevölkerungsschwellen und Affinitätssperren.
    if (bauStarten(state, welt, gebaeudeId, zeit).ok) return;
  }

  // Nichts zu bauen? Dann Überschuss verkaufen. Steht ganz hinten, weil
  // Bauen immer wertvoller ist als Geld: Ware, die noch verbaut werden kann,
  // wird nicht verkauft.
  botHandeln(state, welt);
}

// Ein Bot verkauft, was er im Überfluss hat.
//
// ER KAUFT BEWUSST NICHT. Gekaufte Ware landet im Marktlager und muss von
// einer Flotte geholt werden -- so ist die Regel für den Spieler, und
// FRAKTIONS_ARTEN sagt ausdrücklich, dass für eine Bot-Fraktion DIESELBEN
// Regeln gelten. Ein Bot, der direkt ins Lager kauft, wäre ein Sonderweg;
// ein Bot, der seine Marktware abholt, braucht Logistikflüge, und die sind
// eine eigene Runde. Bis dahin ist die halbe Teilnahme die ehrliche:
// verkaufen kann er unter denselben Regeln wie jeder andere.
//
// Für den Spieler ist das trotzdem der entscheidende Unterschied: die Kassen
// der Nachbarn füllen sich nicht mehr nur aus ihren Abgaben, sondern aus
// echtem Handel -- und wer Geld hat, kann dem Spieler auch etwas abkaufen.
function botHandeln(state, welt) {
  if (!handelVerfuegbar(welt)) return;
  const frei = lagerFrei(state, welt);
  const kapazitaet = lagerKapazitaetGesamt(state, welt);
  // Erst ab einem gut gefüllten Lager. Vorher ist jede Tonne Baumaterial.
  if (kapazitaet <= 0 || frei / kapazitaet > BOT.verkaufAbFuellstand) return;

  let bester = null;
  for (const resId of Object.keys(MARKT_PREISE)) {
    const menge = Math.floor((welt.ressourcen[resId] || 0) * BOT.verkaufAnteil);
    if (menge <= 0) continue;
    const wert = menge * MARKT_PREISE[resId].verkauf;
    if (!bester || wert > bester.wert) bester = { resId, menge, wert };
  }
  if (!bester) return;
  verkaufen(state, welt, bester.resId, bester.menge);
}

// Verhaltensregister. Die Art einer Fraktion nennt ihren Eintrag als Daten
// (`verhalten`), statt dass irgendwo nach ihr verzweigt wird -- sonst wäre das
// Parallelsystem durch die Hintertür zurück.
const VERHALTEN = {
  raeuber: piratenSchritt,
  aufbau: botSchritt,
};

// --- Logistiknetz -----------------------------------------------------
// Kein geteiltes Lager -- jeder Transfer ist eine echte, verzögerte
// Lieferung, nur ohne dass der Spieler eine Flotte losschicken muss. Quelle
// wird SOFORT abgezogen (wie beim Fracht-Beladen), damit dieselbe Menge
// nicht von zwei gleichzeitigen Defiziten doppelt verplant wird. Ziel
// bekommt sie erst bei Ankunft.
//
// PRÜFTAKT (seit v0.32): Diese Prüfung liest die Bestände ALLER Planeten und
// braucht sie deshalb auf demselben Stand -- das ist genau das, was die Uhr je
// Planet vermeiden will. Sie lief bisher bei JEDEM Ereignis, also tausendfach
// je Aufholung, obwohl sie eine Bequemlichkeitsautomatik ist.
//
// Deshalb läuft sie jetzt höchstens einmal je Taktschritt SPIELZEIT (plus
// immer am Ende der Aufholung). Ein Transfer kann dadurch bis zu einen Takt
// später starten -- gemessen an der Flugzeit, die er ohnehin braucht, ist das
// nicht wahrnehmbar. Der Takt hängt an der Spielzeit, nicht an der Wanduhr,
// bleibt also reproduzierbar.
export const LOGISTIK_PRUEFTAKT_MS = 60 * 1000;

function logistiknetzPruefen(state, jetzt, erzwingen = false) {
  if (!logistiknetzFreigeschaltet(state)) return;

  if (!erzwingen) {
    const letzte = state.letzteLogistikPruefung || 0;
    if (jetzt - letzte < LOGISTIK_PRUEFTAKT_MS) return;
  }
  state.letzteLogistikPruefung = jetzt;

  const planeten = wirtschaftsPlaneten(state);
  // Ohne eine einzige Regel gibt es nichts zu tun -- dann auch nicht die
  // Planeten vorrücken. Das ist der häufigste Fall und muss billig bleiben.
  if (!planeten.some((p) => Object.keys(p.logistikMindestbestand || {}).length > 0)) return;

  // Erst jetzt, wo wirklich verglichen wird: alle Beteiligten auf denselben
  // Stand bringen. Bestände zweier Planeten aus verschiedenen Zeitpunkten zu
  // vergleichen wäre genau der stille Fehler, gegen den die Uhr abgesichert
  // werden muss.
  ressourcenVorruecken(state, jetzt, planeten);

  for (const ziel of planeten) {
    for (const [resId, mindestMenge] of Object.entries(ziel.logistikMindestbestand)) {
      const bestand = ziel.ressourcen[resId] || 0;
      if (bestand >= mindestMenge) continue;

      // Läuft schon ein Transfer für dieses Ziel/diese Ressource? Nicht doppelt auslösen.
      const laeuftSchon = state.logistikTransfers.some((tr) => tr.zielPlanet === ziel.id && tr.resId === resId);
      if (laeuftSchon) continue;

      const defizit = mindestMenge - bestand;
      // Quelle: der andere eigene Planet mit dem größten Überschuss.
      let beste = null;
      for (const quelle of planeten) {
        if (quelle.id === ziel.id) continue;
        const verfuegbar = quelle.ressourcen[resId] || 0;
        if (verfuegbar <= 0) continue;
        if (!beste || verfuegbar > beste.verfuegbar) beste = { quelle, verfuegbar };
      }
      if (!beste) continue;

      const menge = Math.min(defizit, beste.verfuegbar, LOGISTIKNETZ.maxDurchsatzProTransfer);
      if (menge <= 0) continue;

      beste.quelle.ressourcen[resId] -= menge;
      // Direkter Eingriff in einen Bestand, außerhalb von planetVorruecken --
      // der gemerkte Puffergrenzen-Zeitpunkt der Quelle ist damit hinfällig.
      planetGeaendert(beste.quelle);
      state.logistikTransfers.push({
        id: state.naechsteTransferId++,
        quellPlanet: beste.quelle.id,
        zielPlanet: ziel.id,
        resId,
        menge,
        ankunftZeit: jetzt + logistikVerzoegerungMs(state, beste.quelle, ziel),
      });
      meldungHinzufuegen(
        state,
        t("Logistiknetz: {fracht} von {quelle} nach {ziel} unterwegs.", {
          fracht: buendelText({ [resId]: menge }),
          quelle: beste.quelle.name,
          ziel: ziel.name,
        }),
        "logistik"
      );
    }
  }
}

function logistikTransferAnkommen(state, transfer) {
  state.logistikTransfers = state.logistikTransfers.filter((tr) => tr.id !== transfer.id);
  const ziel = planetById(state, transfer.zielPlanet);
  if (!ziel) return;

  const { genommen, abgelehnt } = insLager(state, ziel, { [transfer.resId]: transfer.menge });
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(
      state,
      t("{planet}: Lager voll – Logistiknetz-Lieferung teilweise verloren.", { planet: ziel.name }),
      "logistik-voll"
    );
  }
}

// Aufwand eines Warteschlangen-Eintrags. Der Umweg über ?? hält ALTE
// Spielstände lauffähig: bis v0.5 trug ein Eintrag eine feste `dauerSek`
// statt eines Aufwands. Ohne diese Zeile müsste SAVE_VERSION steigen und
// jede laufende Partie neu anfangen -- für eine Zahl, die sich aus der
// Technologie ohnehin herleiten lässt.
function aufwandVon(eintrag) {
  return eintrag.aufwand ?? forschungsAufwand(RESEARCH[eintrag.forschungId], eintrag.zielLevel);
}

function neueForschungsQueue(eintrag, zeit) {
  if (!eintrag) return null;
  return {
    forschungId: eintrag.forschungId,
    zielLevel: eintrag.zielLevel,
    startZeit: zeit,
    aufwand: aufwandVon(eintrag),
    fortschritt: 0,
  };
}

// Schreibt den Forschungsfluss EINES Planeten dem laufenden Projekt gut.
// Wird aus planetVorruecken heraus gerufen, also genau dann, wenn dieser
// Planet seine eigene Uhr bewegt -- deshalb stimmt die Zeitspanne je Planet,
// obwohl die Planeten unterschiedlich weit stehen.
//
// Läuft kein Projekt, ist der Fluss schlicht weg. Das ist gewollt: ein Labor
// ohne Auftrag forscht ins Leere, und ein Vorrat an Forschung, den man später
// ausgibt, wäre genau der Lagerbestand, den es hier nicht geben soll.
function forschungGutschreiben(state, planet, stunden, produktion) {
  const queue = state.forschungsQueue;
  if (!queue || !stunden) return;
  if (fraktionVon(planet) !== SPIELER_FRAKTION) return;
  const proStunde = produktion.forschung || 0;
  if (proStunde <= 0) return;
  queue.fortschritt = (queue.fortschritt || 0) + proStunde * stunden;
}

// Zeitpunkt, zu dem das laufende Projekt VORAUSSICHTLICH fertig ist.
//
// Die Projektion ist bewusst zu FRÜH statt zu spät: Bezugspunkt ist die
// langsamste Planetenuhr, und der volle Fluss wird ab dort angesetzt. Weil
// die weiter stehenden Planeten bereits mehr beigetragen haben, als diese
// Rechnung annimmt, kann der Zeitpunkt nie hinter der Wirklichkeit liegen.
// Ist beim Eintreffen doch noch nicht genug zusammen, tut der Handler
// nichts und der nächste Durchlauf rechnet neu -- dasselbe Muster wie bei
// der Puffergrenze. Zu SPÄT projizieren wäre der teure Fehler: die Forschung
// stünde fertig da und niemand merkte es.
function forschungFertigProjektion(state) {
  const queue = state.forschungsQueue;
  if (!queue) return null;
  const rest = aufwandVon(queue) - (queue.fortschritt || 0);
  if (rest <= 0) return state.letzterTick;
  const fluss = forschungsFluss(state);
  if (fluss <= 0) return null; // Kein Labor, kein Strom, keine Leute: es passiert nichts.
  let frueheste = null;
  for (const planet of planetenVon(state)) {
    const uhr = planetLetzterTick(state, planet);
    if (frueheste === null || uhr < frueheste) frueheste = uhr;
  }
  if (frueheste === null) return null;
  return frueheste + (rest / fluss) * MS_PRO_STUNDE;
}

function forschungAbschliessen(state, zeit) {
  const queue = state.forschungsQueue;
  if (!queue) return;
  // Noch nicht so weit: die Projektion lag zu früh (was sie darf). Nichts
  // tun -- naechstesEreignis rechnet mit den nun weitergestellten Uhren neu.
  if ((queue.fortschritt || 0) < aufwandVon(queue)) return;

  state.forschung[queue.forschungId] = queue.zielLevel;
  meldungHinzufuegen(
    state,
    t("{tech} Stufe {stufe} abgeschlossen.", { tech: t(RESEARCH[queue.forschungId].name), stufe: queue.zielLevel })
  );
  state.forschungsQueue = neueForschungsQueue(state.forschungsWarteschlange.shift(), zeit);
}

// --- Supernova (v0.71) ----------------------------------------------------
// Der Blitz. Er tötet niemanden direkt: die Menschen sitzen in versiegelten
// Wohnmodulen mit geschlossenem Sauerstoffkreislauf, und ein Planet
// beschattet obendrein seine eigene Nachtseite. Was er zerlegt, ist die
// OZONSCHICHT -- und damit das Einzige auf der Oberfläche, das Licht braucht:
// die Landwirtschaft.
//
// Aus einem Ereignis heraus MUSS mit der übergebenen Zeit gerechnet werden,
// nicht mit der Uhr. Achter Fall dieses Fehlertyps im Projekt, deshalb steht
// es hier ausdrücklich.
function supernovaBlitz(state, zeit) {
  const sn = state.supernova;
  sn.phase = "blitz";
  sn.ozonKaputt = true;
  sn.ozonZeit = zeit + jahreInMs(SUPERNOVA.ozonErholungJahre);
  // Jeder Planet ändert seine Produktionslage -- gemerkte Puffergrenzen sind
  // damit ungültig.
  for (const planet of state.planeten) planetGeaendert(planet);
  meldungHinzufuegen(
    state,
    t(
      "{stern} ist kollabiert. Der Blitz hat die Ozonschicht zerrissen – auf allen Welten wächst nichts mehr, bis sie sich erholt.",
      { stern: systemName(state.galaxie.seed, sn.systemId) }
    )
  );
}

function supernovaOzonErholt(state, zeit) {
  const sn = state.supernova;
  sn.ozonKaputt = false;
  sn.ozonZeit = null;
  for (const planet of state.planeten) planetGeaendert(planet);
  meldungHinzufuegen(state, t("Die Ozonschicht hat sich erholt – die Ernte läuft wieder."));
}

// Die Teilchenflut. Sie ist der harte Schnitt: ab hier bewegt sich keine
// Flotte mehr (ein Schiffsrumpf ist dünn, die Flut tödlich), das Ozon bleibt
// zerstört, und es wird abgerechnet.
//
// Der Abspann rechnet NICHT Jahrtausende durch -- das wäre Simulation ohne
// Erkenntnis. Er wertet aus, was zum Zeitpunkt der Flut wahr ist: hält eine
// Welt ihren Schirm mit voller Leistung, übersteht sie es. Sonst nicht.
// Genau das ist der Grund, warum die Stromzuteilung aus v0.69 die Mechanik
// des Schlusses ist -- ein Schirm auf halber Leistung ist kein halber Schutz.
function supernovaFlut(state, zeit) {
  const sn = state.supernova;
  sn.phase = "flut";
  sn.ozonKaputt = true;
  sn.ozonZeit = null;

  const welten = [];
  for (const planet of planetenVon(state)) {
    const schildStufe = planet.gebaeude ? planet.gebaeude.magnetschild || 0 : 0;
    const anteil = schildStufe > 0 ? effektiveRaten(state, planet).faktoren.magnetschild ?? 0 : 0;
    // Voll versorgt heißt voll versorgt. Ein Feld mit 80 % Leistung lenkt
    // nicht 80 % der Teilchen ab, es reißt an der falschen Stelle auf.
    const ueberlebt = schildStufe > 0 && anteil >= 0.999;
    welten.push({
      planet: planet.id,
      name: planet.name,
      bevoelkerung: Math.round(planet.ressourcen.bevoelkerung || 0),
      schild: schildStufe,
      versorgung: anteil,
      ueberlebt,
    });
    if (!ueberlebt) {
      // Über die Jahrtausende der Flut stirbt, was nicht geschützt war.
      // Ursächlich erreicht, nicht per Uhr (Prinzip 13a).
      planet.ressourcen.bevoelkerung = 0;
      planetGeaendert(planet);
    }
  }

  state.ende = {
    zeit,
    welten,
    gewonnen: welten.some((w) => w.ueberlebt),
  };

  meldungHinzufuegen(
    state,
    state.ende.gewonnen
      ? t("Die Teilchenflut ist da. {anzahl} von {gesamt} Welten stehen im Schirm.", {
          anzahl: welten.filter((w) => w.ueberlebt).length,
          gesamt: welten.length,
        })
      : t("Die Teilchenflut ist da. Keine einzige Welt war geschützt.")
  );
}

function werftAbschliessen(state, planet, zeit) {
  const queue = planet.werftQueue;
  planet.schiffe[queue.schiffId] = (planet.schiffe[queue.schiffId] || 0) + queue.anzahl;
  meldungHinzufuegen(
    state,
    t("{anzahl}× {schiff} auf {planet} fertiggestellt.", {
      anzahl: queue.anzahl,
      schiff: t(SCHIFFE[queue.schiffId].name),
      planet: planet.name,
    })
  );
  const naechster = planet.werftWarteschlange.shift();
  planet.werftQueue = naechster
    ? { schiffId: naechster.schiffId, anzahl: naechster.anzahl, startZeit: zeit, fertigZeit: zeit + naechster.dauerSek * 1000 }
    : null;
}

// --- Flotten: Hafenbetrieb ------------------------------------------------
// Flottenname ändern. Der Name ist reine Beschriftung -- er hängt an nichts
// und darf deshalb alles sein, außer leer: eine namenlose Flotte wäre in
// jeder Liste ein Loch. Zu lange Namen werden gekappt statt abgelehnt; wer
// einen Roman hineinschreibt, hat sich vertippt und soll nicht bestraft
// werden (Prinzip 3, verhindern statt bestrafen).
export const FLOTTENNAME_MAX = 40;

export function flotteUmbenennen(state, flotte, name) {
  if (!flotte) return { ok: false, grund: t("Keine Flotte gewählt.") };
  const sauber = String(name || "").trim().slice(0, FLOTTENNAME_MAX);
  if (!sauber) return { ok: false, grund: t("Der Name darf nicht leer sein.") };
  flotte.name = sauber;
  return { ok: true };
}

export function flotteAufstellen(state, planet, name) {
  const flotte = {
    id: state.naechsteFlotteId++,
    // Der Vorgabename wird EINMAL bei der Aufstellung festgelegt und danach
    // wie ein Eigenname behandelt -- ein Sprachwechsel benennt bestehende
    // Flotten nicht um, genauso wenig wie er einen Planeten umbenennt.
    name: name || t("Flotte {nr}", { nr: state.naechsteFlotteId - 1 }),
    // Eine Flotte gehört der Fraktion, von deren Stützpunkt sie aufgestellt
    // wird. Damit stimmt die Zuordnung auch für Piratenflotten, ohne dass der
    // Aufrufer daran denken muss.
    fraktion: fraktionVon(planet),
    schiffe: {},
    ladung: {},
    treibstoff: 0,
    heimatPlanet: planet.id,
    dockPlanet: planet.id,
    ort: ortVonPlanet(state, planet),
    abschnitt: null,
    befehle: [],
    // Wiederkehrende Route -- separat von den einmaligen Befehlen. Erst
    // nutzbar mit Automatisierungstechnik, siehe routeStarten.
    route: { aktiv: false, halte: [], index: 0 },
    // Angesammelter Kampfschaden je Schiffstyp -- < Anzahl*hp, sonst wäre das
    // Schiff zerstört statt beschädigt. Reparierbar oder recycelbar.
    schiffSchaden: {},
    // Laufendes Gefecht (null = kein Kampf). Läuft über echte Zeit -- siehe
    // militaerStarten/kampfRundeAusfuehren -- statt in einem Tick durch.
    gefecht: null,
  };
  state.flotten.push(flotte);
  return flotte;
}

export function kannUmladen(state, flotte) {
  if (!flotte.dockPlanet) return { ok: false, grund: t("Flotte ist unterwegs.") };
  return { ok: true, planet: planetById(state, flotte.dockPlanet) };
}

// Schiffe zwischen Planetenbestand und Flotte verschieben (nur im Hafen).
export function schiffeUmladen(state, flotte, schiffId, anzahl) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;

  if (anzahl > 0) {
    const frei = planet.schiffe[schiffId] || 0;
    const menge = Math.min(anzahl, frei);
    if (menge <= 0) return { ok: false, grund: t("Keine Schiffe verfügbar.") };
    planet.schiffe[schiffId] -= menge;
    flotte.schiffe[schiffId] = (flotte.schiffe[schiffId] || 0) + menge;
  } else {
    const anBord = flotte.schiffe[schiffId] || 0;
    const menge = Math.min(-anzahl, anBord);
    if (menge <= 0) return { ok: false, grund: t("Keine Schiffe an Bord.") };
    flotte.schiffe[schiffId] -= menge;
    planet.schiffe[schiffId] = (planet.schiffe[schiffId] || 0) + menge;
  }
  return { ok: true };
}

export function tanken(state, flotte, menge) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;

  if (menge > 0) {
    const verfuegbar = Math.floor(planet.ressourcen.tritium || 0);
    // Der Tank ist seit v0.64 endlich. Vorher war die einzige Grenze das
    // PLANETENLAGER -- deshalb rechnete auch der Regler in der Oberfläche in
    // Prozent davon, was Tobis Meldung war: "Tritium-Regler orientiert sich
    // an Max Lager des Planeten, nicht an Max Tank der Flotte."
    const platz = Math.max(0, flotteTankKapazitaet(state, flotte) - (flotte.treibstoff || 0));
    if (platz <= 0) return { ok: false, grund: t("Der Tank ist voll.") };
    const nimm = Math.min(menge, verfuegbar, platz);
    if (nimm <= 0) return { ok: false, grund: t("Kein Tritium vorhanden.") };
    planet.ressourcen.tritium -= nimm;
    flotte.treibstoff += nimm;
  } else {
    const gib = Math.min(-menge, flotte.treibstoff);
    if (gib <= 0) return { ok: false, grund: t("Kein Tritium an Bord.") };
    flotte.treibstoff -= gib;
    const { genommen } = insLager(state, planet, { tritium: gib });
    // Was nicht ins Lager passte, bleibt an Bord statt zu verschwinden.
    flotte.treibstoff += gib - (genommen.tritium || 0);
  }
  return { ok: true };
}

// --- Reparatur & Recycling --------------------------------------------
// Beschädigte (aber nicht zerstörte) Schiffsgruppen -- siehe schadenVerteilen.
// Reparatur braucht eine Werft am Hafen und kostet anteilig zum Schaden.
// Bewusst instant (keine eigene Werftschleife) für den ersten Wurf; wenn
// sich das falsch anfühlt, ist eine Zeitkomponente eine reine Zahlen-Änderung.
function schadensAnteil(flotte, typ) {
  const anzahl = flotte.schiffe[typ] || 0;
  const maxHp = anzahl * (SCHIFFE[typ] ? SCHIFFE[typ].hp : 0);
  if (maxHp <= 0) return 0;
  return Math.min(1, (flotte.schiffSchaden[typ] || 0) / maxHp);
}

export function kannReparieren(state, flotte, typ) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  if (werftTempo(check.planet) <= 0) return { ok: false, grund: t("Hier steht keine Werft.") };
  const anteil = schadensAnteil(flotte, typ);
  if (anteil <= 0) return { ok: false, grund: t("Keine Beschädigung.") };

  const kosten = skalieren(SCHIFFE[typ].kosten, (flotte.schiffe[typ] || 0) * anteil * REPARATUR.kostenFaktor);
  if (!reichenAus(check.planet.ressourcen, kosten)) {
    return { ok: false, grund: t("Benötigt {kosten}.", { kosten: buendelText(kosten) }) };
  }
  return { ok: true, planet: check.planet, kosten };
}

export function reparieren(state, flotte, typ) {
  const check = kannReparieren(state, flotte, typ);
  if (!check.ok) return check;
  abziehen(check.planet.ressourcen, check.kosten);
  delete flotte.schiffSchaden[typ];
  meldungHinzufuegen(
    state,
    t("{flotte}: {schiff} bei {planet} repariert.", {
      flotte: flotte.name,
      schiff: t(SCHIFFE[typ].name),
      planet: check.planet.name,
    })
  );
  return { ok: true };
}

// Recycling zahlt sofort aus (weniger als eine Reparatur wert wäre) und
// entfernt die Schiffe -- eine echte Entscheidung statt eines Sonderfalls.
export function kannRecyceln(state, flotte, typ) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  if ((flotte.schiffe[typ] || 0) <= 0) return { ok: false, grund: t("Keine Schiffe dieses Typs.") };
  return { ok: true, planet: check.planet };
}

export function recyceln(state, flotte, typ) {
  const check = kannRecyceln(state, flotte, typ);
  if (!check.ok) return check;
  const anzahl = flotte.schiffe[typ];
  const gesundAnteil = 1 - schadensAnteil(flotte, typ);

  const rueckerstattung = skalieren(SCHIFFE[typ].kosten, anzahl * gesundAnteil * REPARATUR.recycleFaktor);
  insLager(state, check.planet, rueckerstattung);
  flotte.schiffe[typ] = 0;
  delete flotte.schiffSchaden[typ];
  meldungHinzufuegen(
    state,
    t("{flotte}: {anzahl}× {schiff} recycelt – {erstattung} zurückgewonnen.", {
      flotte: flotte.name,
      anzahl,
      schiff: t(SCHIFFE[typ].name),
      erstattung: buendelText(rueckerstattung),
    })
  );
  return { ok: true };
}

export function ladungAufnehmen(state, flotte, buendel) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;
  if (!reichenAus(planet.ressourcen, buendel)) return { ok: false, grund: t("Nicht genug Ressourcen.") };

  const menge = Object.values(buendel).reduce((a, b) => a + b, 0);
  if (menge > frachtraumFrei(state, flotte)) {
    return { ok: false, grund: t("Nicht genug Frachtraum.") };
  }
  abziehen(planet.ressourcen, buendel);
  planetGeaendert(planet);
  hinzufuegen(flotte.ladung, buendel);
  return { ok: true };
}

function ladungLoeschen(state, flotte, planet) {
  if (!ladungGesamt(flotte)) return;
  const { genommen, abgelehnt } = insLager(state, planet, flotte.ladung);
  if (Object.keys(genommen).some((r) => genommen[r] > 0)) {
    // Gruppiert: eine laufende Route liefert immer wieder dasselbe.
    meldungHinzufuegen(
      state,
      t("{fracht} auf {planet} gelöscht.", { fracht: buendelText(genommen), planet: planet.name }),
      "fracht"
    );
  }
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(
      state,
      t("{planet}: Lager voll – {fracht} bleiben an Bord.", {
        planet: planet.name,
        fracht: buendelText(abgelehnt),
      })
    );
  }
  // Was nicht reinpasste, bleibt geladen statt zu verschwinden.
  flotte.ladung = abgelehnt;
}

export function flotteAufloesen(state, flotte) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;

  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    if (anzahl > 0) planet.schiffe[id] = (planet.schiffe[id] || 0) + anzahl;
  }
  if (flotte.treibstoff > 0) {
    const { genommen } = insLager(state, planet, { tritium: flotte.treibstoff });
    const rest = flotte.treibstoff - (genommen.tritium || 0);
    if (rest > 0.5) {
      meldungHinzufuegen(
        state,
        t("{planet}: Lager voll – {menge} Tritium beim Auflösen verloren.", {
          planet: planet.name,
          menge: Math.floor(rest),
        })
      );
    }
  }
  ladungLoeschen(state, flotte, planet);
  state.flotten = state.flotten.filter((f) => f.id !== flotte.id);
  return { ok: true };
}

// Wie flotteAufloesen, aber OHNE Hafenpflicht -- für den Fall, dass eine
// Flotte mitten in der Simulation ihr letztes Schiff verliert (Kolonieschiff
// bei Gründung, letzte Sonde an einer Gefahr) und dadurch nirgendwo mehr
// andocken kann. Rettet Restfracht/-treibstoff zum Heimatplaneten, statt sie
// zusammen mit der Flotte verschwinden zu lassen.
// Eine Flotte ohne Schiffe hört auf zu existieren -- sie fliegt NICHT mehr
// nach Hause. Was sie noch an Bord hatte, bleibt liegen, wo sie endet, und
// wird zu Bergungsgut. Frühere Fassung schrieb Treibstoff und Fracht dem
// Heimatplaneten gut; das verstieß gegen die Grundregel, dass nichts
// teleportiert -- ohne Schiff trägt niemand etwas zurück.
//
// Ist die Flotte angedockt, geht alles ganz normal ins Planetenlager: dort
// liegt es ja bereits am selben Ort.
function flotteLeerAufloesen(state, flotte) {
  const reste = { ...flotte.ladung };
  if (flotte.treibstoff > 0) reste.tritium = (reste.tritium || 0) + Math.floor(flotte.treibstoff);

  const hafen = flotte.dockPlanet ? planetById(state, flotte.dockPlanet) : null;
  const etwasDa = Object.values(reste).some((m) => m > 0);

  if (etwasDa && hafen) {
    const { abgelehnt } = insLager(state, hafen, reste);
    if (Object.keys(abgelehnt).length) {
      meldungHinzufuegen(
        state,
        t("{planet}: Lager voll – Reste von {flotte} gingen verloren.", {
          planet: hafen.name,
          flotte: flotte.name,
        })
      );
    }
  } else if (etwasDa) {
    zurueckgelassen(state, flotte.ort, reste, flotte.name);
  }

  meldungHinzufuegen(state, t("{flotte} hat keine Schiffe mehr und wurde aufgelöst.", { flotte: flotte.name }));
  state.flotten = state.flotten.filter((f) => f.id !== flotte.id);
}

// Was von einem Schiff übrigbleibt: Anteil seiner Baukosten. Ein Wrack gibt
// nie den vollen Wert zurück -- sonst wäre Verlust folgenlos.
function schrottVon(schiffId, anzahl = 1) {
  const rest = {};
  for (const [resId, betrag] of Object.entries(SCHIFFE[schiffId].kosten)) {
    const menge = Math.floor(betrag * anzahl * SCHROTT_ANTEIL);
    if (menge > 0) rest[resId] = menge;
  }
  return rest;
}

// Legt Material an einem Ort ab, wo es später geborgen werden kann. Nutzt
// dasselbe restErtrag-Feld wie eine unvollständige Bergung -- kein neues
// Konzept, nur ein weiterer Weg, wie etwas dort hinkommt.
// leise: keine eigene Meldung (z.B. Sondenschrott, sonst flutet jede
// Aufklärung die Meldungsliste -- die Entdeckung wird ohnehin gemeldet).
function zurueckgelassen(state, ort, buendel, wer, leise = false, gruppe = null) {
  if (!Object.values(buendel).some((m) => m > 0)) return;

  // Zwischen den Systemen gibt es keinen Ort, an dem etwas liegen könnte --
  // hier verschwindet es tatsächlich, und das wird gesagt statt verschwiegen.
  if (!ort || ort.systemId == null || ort.orbit == null) {
    if (!leise) meldungHinzufuegen(state, t("{wer}: Reste gingen zwischen den Systemen verloren.", { wer }));
    return;
  }
  const objekt = findeObjekt(state, ort.systemId, ort.orbit);
  if (!objekt) {
    if (!leise) meldungHinzufuegen(state, t("{wer}: Reste gingen verloren.", { wer }));
    return;
  }
  const rest = { ...(objekt.restErtrag || {}) };
  for (const [resId, menge] of Object.entries(buendel)) {
    if (menge > 0) rest[resId] = (rest[resId] || 0) + Math.floor(menge);
  }
  setzeOrbitZustand(state, ort.systemId, ort.orbit, { restErtrag: rest, entdeckt: true });
  if (!leise) {
    meldungHinzufuegen(
      state,
      t("{wer}: {fracht} bleiben bei {objekt} zurück – bergbar.", {
        wer,
        fracht: buendelText(buendel),
        objekt: objekt.name,
      }),
      gruppe
    );
  }
}

// --- Flotten: Befehle -----------------------------------------------------
function abschnittStarten(state, flotte, zielOrt, jetzt) {
  const vonOrt = flotte.abschnitt ? flottePosition(state, flotte, jetzt) : flotte.ort;
  const distanz = strecke(vonOrt, zielOrt);

  // Führt eine vermessene Route dorthin? Wenn nicht, ist das ein ERSTFLUG und
  // dauert Größenordnungen länger (siehe SPRUNGROUTEN in data.js). Innerhalb
  // eines Systems gilt das nicht -- man springt nicht von Orbit zu Orbit.
  const gleichesSystem = vonOrt.systemId !== null && vonOrt.systemId === zielOrt.systemId;
  const unterlicht =
    !gleichesSystem && zielOrt.systemId !== null && !hatSprungroute(state, zielOrt.systemId);

  flotte.treibstoff -= treibstoffFuer(flotte, distanz);
  flotte.dockPlanet = null;
  flotte.ort = vonOrt;
  flotte.abschnitt = {
    von: vonOrt,
    nach: zielOrt,
    startZeit: jetzt,
    ankunftZeit: jetzt + flugdauerMs(state, flotte, distanz, unterlicht),
    // Für die Anzeige: eine Flotte, die 96 Jahre unterwegs ist, soll das auch
    // sagen dürfen.
    unterlicht,
  };
}

// Prüft einen Befehl, ohne ihn auszuführen.
// optionen.einweg: nur die Hinstrecke muss gedeckt sein. Gilt für Fahrten,
// bei denen die Schiffe unterwegs verbraucht werden (Sonden) -- dort schützt
// die Rückweg-Reserve niemanden mehr, es gibt ja nichts zu stranden.
export function kannBefehlen(state, flotte, ziel, optionen = {}) {
  // Während eines Gefechts nicht umleitbar -- die vorher eingestellte
  // Rückzugsschwelle ist der einzige Hebel, kein Freifahrtschein per Klick.
  if (flotte.gefecht) return { ok: false, grund: t("Flotte ist im Gefecht.") };
  if (flotteLeer(flotte)) return { ok: false, grund: t("Die Flotte hat keine Schiffe.") };
  // Nach der Flut fliegt niemand mehr: ein Schiffsrumpf ist dünn, und
  // draußen steht eine Teilchenflut, gegen die nur planetare Magnetfelder
  // helfen. Das ist der harte Schnitt, und er ist der Grund, warum eine
  // Evakuierung VORHER fertig sein muss.
  if (state.supernova && state.supernova.phase === "flut") {
    return { ok: false, grund: t("Die Teilchenflut macht jeden Flug tödlich.") };
  }
  const jetzt = spielzeitJetzt(state);
  const vonOrt = flotte.abschnitt ? flottePosition(state, flotte, jetzt) : flotte.ort;
  const pruefung = reichtTreibstoff(state, flotte, vonOrt, ziel);
  const reicht = optionen.einweg ? flotte.treibstoff >= pruefung.hinVerbrauch : pruefung.ok;
  if (!reicht) {
    const noetig = optionen.einweg ? pruefung.hinVerbrauch : pruefung.benoetigt;
    // Zwei ganze Sätze statt eines mit eingesetztem Teilstück: der Zusatz
    // "(inkl. Rückweg)" steht im Englischen an anderer Stelle im Satz.
    const werte = { noetig: Math.ceil(noetig), anBord: Math.floor(flotte.treibstoff) };
    return {
      ok: false,
      grund: optionen.einweg
        ? t("Zu wenig Tritium: {noetig} nötig, {anBord} an Bord.", werte)
        : t("Zu wenig Tritium: {noetig} nötig (inkl. Rückweg), {anBord} an Bord.", werte),
    };
  }
  // ok bewusst NACH dem Spread: pruefung trägt ein eigenes ok (Hin- UND
  // Rückweg gedeckt), das im Einweg-Fall false ist und den Befehl sonst
  // fälschlich ablehnen würde.
  return { ...pruefung, ok: true };
}

// Setzt die Befehlsliste neu -- das ist zugleich der Kurswechsel. Eine Flotte
// unterwegs bekommt ihre aktuelle Position als neuen Startpunkt.
/**
 * @param zeit Startzeitpunkt des ersten Abschnitts. Vorgabe ist die Spielzeit
 *   -- richtig für alles, was aus der Oberfläche kommt, denn dort IST gerade
 *   jetzt. Wer aus einem Ereignis heraus Befehle gibt (die Fraktions-KI muss
 *   das), MUSS die Ereigniszeit übergeben: sonst startet der Abschnitt bei
 *   einem Zeitsprung mit der Wanduhr statt mit der simulierten Zeit, und die
 *   Ankunft liegt in der Vergangenheit.
 *
 *   Das ist derselbe Fehlertyp, der dieses Projekt schon dreimal erwischt hat
 *   (Flotten-Rückflug v0.7, Kampfrunden v0.14, beinahe die Warteschlangen in
 *   v0.15). Er lag hier latent, weil bisher nur die Oberfläche Befehle gab.
 */
export function befehleSetzen(state, flotte, befehle, optionen = {}, zeit = null) {
  const erster = befehle[0];
  if (!erster) return { ok: false, grund: t("Kein Befehl.") };

  const zielOrt = befehlOrt(state, erster);
  const check = kannBefehlen(state, flotte, zielOrt, optionen);
  if (!check.ok) return check;

  flotte.befehle = befehle;
  abschnittStarten(state, flotte, zielOrt, zeit === null ? spielzeitJetzt(state) : zeit);
  return { ok: true };
}

// Ein Befehl kann auf einen Hafen zeigen, den es nicht mehr gibt: die Basis
// wurde erobert, aufgelöst oder verlassen, während die Flotte unterwegs war.
// Das ist ein GÜLTIGER Spielzustand (Prinzip 7 -- der Null-Zustand darf das
// Spiel nie brechen), und bis v0.63 warf er eine TypeError mitten in der
// Zeitsimulation. Aufgefallen beim Piraten-Umzug, aber der Fall trifft jeden:
// auch ein Spieler kann seinen letzten Planeten verlieren, während eine
// Flotte auf dem Heimweg ist.
function befehlOrt(state, befehl) {
  if (befehl.art === "hafen") {
    const planet = planetById(state, befehl.planetId);
    return planet ? ortVonPlanet(state, planet) : null;
  }
  return ortVonSystem(state, befehl.zielSystem, befehl.zielOrbit);
}

// Mission starten: hinfliegen, ausführen, heimkehren.
export function missionBefehlen(state, flotte, missionsart, systemId, orbit, optionen = {}, zeit = null) {
  return befehleSetzen(
    state,
    flotte,
    [
      { art: "mission", missionsart, zielSystem: systemId, zielOrbit: orbit, ...optionen },
      { art: "hafen", planetId: flotte.heimatPlanet },
    ],
    {},
    zeit
  );
}

// --- Schnellversand -------------------------------------------------------
// Ein Klick statt N Einzelbefehle: sucht alle unerforschten Ziele im System,
// die dieser Schiffstyp aufdecken kann, und schickt eine Flotte auf eine
// Kette von Aufklärungsmissionen mit anschließender Heimkehr.
//
// Bewusst KEIN neuer Mechanismus: es werden dieselben Missionsbefehle
// erzeugt, die man auch von Hand gäbe -- nur eben alle auf einmal. Dadurch
// gelten Treibstoffprüfung, Ankunftslogik und Verbrauch unverändert weiter.
const SCHNELLVERSAND = {
  sonde: { forschung: "sondenKi", missionsart: "sonde", schiff: "sonde" },
  erkundung: { forschung: "erkunderKi", missionsart: "erkundung", schiff: "erkunder" },
};

// Welche Orbits im System wartet dieser Schiffstyp noch auf?
function offeneAufklaerungsziele(state, systemId, missionsart) {
  const system = holeSystem(state, systemId);
  return system.objekte
    .filter((objekt) => !objekt.entdeckt && missionFuerObjekt(state, objekt) === missionsart)
    .map((objekt) => objekt.orbit);
}

export function kannSchnellversand(state, flotte, art, systemId) {
  const regel = SCHNELLVERSAND[art];
  if (!regel) return { ok: false, grund: t("Unbekannte Versandart.") };
  if ((state.forschung[regel.forschung] || 0) < 1) {
    return { ok: false, grund: t("{tech} noch nicht erforscht.", { tech: t(RESEARCH[regel.forschung].name) }) };
  }
  if (!flotte) return { ok: false, grund: t("Keine Flotte gewählt.") };

  const ziele = offeneAufklaerungsziele(state, systemId, regel.missionsart);
  if (!ziele.length) return { ok: false, grund: t("Hier gibt es nichts mehr aufzudecken.") };

  const anBord = flotte.schiffe[regel.schiff] || 0;
  if (anBord < 1) return { ok: false, grund: t("Flotte hat keine {schiff}.", { schiff: t(SCHIFFE[regel.schiff].name) }) };

  // Mehr Ziele als Schiffe ist kein Fehler -- dann wird eben nur ein Teil
  // abgearbeitet. Das ist ehrlicher als den Befehl ganz zu verweigern.
  return { ok: true, ziele: ziele.slice(0, anBord), gesamtZiele: ziele.length, schiffe: anBord };
}

export function schnellversandBefehlen(state, flotte, art, systemId) {
  const check = kannSchnellversand(state, flotte, art, systemId);
  if (!check.ok) return check;

  const regel = SCHNELLVERSAND[art];
  const befehle = check.ziele.map((orbit) => ({
    art: "mission",
    missionsart: regel.missionsart,
    zielSystem: systemId,
    zielOrbit: orbit,
  }));
  // KEINE Heimkehr: die Schiffe werden unterwegs verbraucht, es kommt nichts
  // zurück. Ein Rückflugbefehl wäre eine Lüge -- die Flotte löst sich beim
  // letzten Ziel auf.

  // Genau für die Hinstrecke tanken, nicht mehr. Überschüssiger Treibstoff
  // würde am Ziel als Bergungsgut liegenbleiben, also gar nicht erst
  // mitnehmen -- und Fehlmengen werden hier aus dem Hafenlager ergänzt,
  // solange die Flotte noch angedockt ist (kein Teleport).
  const hafen = flotte.dockPlanet ? planetById(state, flotte.dockPlanet) : null;
  if (hafen) {
    // Genau so viele Schiffe wie Ziele. Überzählige blieben sonst nach dem
    // letzten Ziel draußen stehen -- die Flotte fliegt ja nicht zurück.
    const ueberzaehlig = (flotte.schiffe[regel.schiff] || 0) - check.ziele.length;
    if (ueberzaehlig > 0) schiffeUmladen(state, flotte, regel.schiff, -ueberzaehlig);

    const bedarf = einwegBedarf(state, flotte, befehle);
    tanken(state, flotte, bedarf - flotte.treibstoff);
  }

  const res = befehleSetzen(state, flotte, befehle, { einweg: true });
  if (!res.ok) return res;

  const versandWerte = {
    flotte: flotte.name,
    anzahl: check.ziele.length,
    system: systemName(state.galaxie.seed, systemId),
    offen: check.gesamtZiele - check.ziele.length,
  };
  const versandMeldung =
    check.gesamtZiele > check.ziele.length
      ? t("{flotte}: Schnellversand – {anzahl} Ziel(e) in {system}, {offen} offen (zu wenige Schiffe).", versandWerte)
      : t("{flotte}: Schnellversand – {anzahl} Ziel(e) in {system}.", versandWerte);
  meldungHinzufuegen(state, versandMeldung);
  return { ok: true, gestartet: check.ziele.length };
}

// Treibstoff für eine Einwegkette: alle Teilstrecken addiert, ohne Rückweg.
// Der Verbrauch sinkt unterwegs mit jedem verbrauchten Schiff, deshalb wird
// hier mit der ANFANGSflotte gerechnet -- das ist die sichere Obergrenze.
function einwegBedarf(state, flotte, befehle) {
  let ort = flotte.ort;
  let summe = 0;
  for (const befehl of befehle) {
    const ziel = befehlOrt(state, befehl);
    summe += treibstoffFuer(flotte, strecke(ort, ziel));
    ort = ziel;
  }
  return summe;
}

export function heimkehrBefehlen(state, flotte, zeit = null) {
  return befehleSetzen(state, flotte, [{ art: "hafen", planetId: flotte.heimatPlanet }], {}, zeit);
}

export function zumPlanetBefehlen(state, flotte, planetId) {
  return befehleSetzen(state, flotte, [{ art: "hafen", planetId }]);
}

// --- Flotten: Ankunft -----------------------------------------------------
function flotteAngekommen(state, flotte, zeit) {
  const ziel = flotte.abschnitt.nach;
  const warUnterlicht = flotte.abschnitt.unterlicht;
  flotte.ort = ziel;
  flotte.abschnitt = null;

  // DER ANKER (v0.68). Wer als Erster unterlichtschnell ankommt, hat die
  // Strecke dabei vermessen -- Staubdichte, Massenverteilung, Marker. Ab
  // jetzt ist dieses System per Sprung erreichbar, für IMMER und für jede
  // Flotte. Das ist der Gegenwert für die Stunden, die der Erstflug gekostet
  // hat: nicht ein einmaliger Fund, sondern eine dauerhafte Verbindung.
  //
  // Bewusst an die ANKUNFT gebunden und nicht an eine Mission: es zählt, dass
  // jemand wirklich dort war (Prinzip 4). Und bewusst für jede Fraktion --
  // wer hinfliegt, vermisst, egal wer es ist (Prinzip 0b).
  if (warUnterlicht && ziel.systemId !== null && !hatSprungroute(state, ziel.systemId)) {
    sprungrouteSetzen(state, ziel.systemId);
    if (fraktionVon(flotte) === SPIELER_FRAKTION) {
      meldungHinzufuegen(
        state,
        t("{flotte} hat {system} erreicht – die Route ist vermessen, der Anker steht. Ab jetzt ein Sprung.", {
          flotte: flotte.name,
          system: systemName(state.galaxie.seed, ziel.systemId),
        })
      );
    }
  }

  const befehl = flotte.befehle.shift();
  let routenHaltIndex;

  if (befehl) {
    if (befehl.art === "mission") missionAusfuehren(state, flotte, befehl, zeit);
    if (befehl.art === "hafen") {
      const planet = planetById(state, befehl.planetId);
      if (planet) {
        flotte.dockPlanet = planet.id;
        routenHaltIndex = befehl.routenIndex;
        const halt =
          routenHaltIndex !== undefined && flotte.route ? flotte.route.halte[routenHaltIndex] : null;
        // Bei einer einmaligen Heimkehr wird immer entladen. Bei einem
        // Routenhalt entscheidet die konfigurierte Regel -- eine Route kann
        // Fracht bewusst durch einen Zwischenhalt hindurch mitführen.
        const sollEntladen = routenHaltIndex === undefined || (halt && halt.entladen);
        if (sollEntladen) ladungLoeschen(state, flotte, planet);
        if (halt) {
          routeTankenAusfuehren(state, flotte, planet);
          routeLadenAusfuehren(state, flotte, planet, halt);
        }
      }
    }
  }

  // Eine Flotte ohne Schiffe (letztes Kolonieschiff/letzte Sonde verbraucht)
  // kann nirgendwo mehr hinfliegen. Sofort auflösen statt für immer als
  // Karteileiche mit offenen Befehlen liegen zu bleiben -- sonst bliebe sie
  // dauerhaft unerreichbar (nicht angedockt, aber auch nicht unterwegs, und
  // kannBefehlen/kannUmladen verweigern beide jede Interaktion mit ihr).
  if (flotteLeer(flotte)) {
    flotteLeerAufloesen(state, flotte);
    return;
  }

  // Ein Gefecht wurde gerade erst angestoßen (militaerStarten) -- die
  // restliche Befehlsfolge (Rückflug) bleibt liegen, bis der Kampf über
  // mehrere Runden entschieden ist. Siehe kampfRundeAusfuehren.
  if (flotte.gefecht) return;

  if (naechstenBefehlFortsetzen(state, flotte, zeit)) return;

  // Route fortsetzen, wenn dieser Halt Teil einer laufenden Route war.
  if (routenHaltIndex !== undefined && flotte.route && flotte.route.aktiv) {
    flotte.route.index = (routenHaltIndex + 1) % flotte.route.halte.length;
    routeNaechstenHaltStarten(state, flotte, zeit);
  }
}

// Einmalige Befehlsliste (Missionen/Heimkehr) fortsetzen, falls noch etwas
// offen ist. Wird sowohl nach normaler Ankunft als auch nach Gefechtsende
// aufgerufen -- ein Gefecht unterbricht die Befehlsfolge nur vorübergehend.
function naechstenBefehlFortsetzen(state, flotte, zeit) {
  const naechster = flotte.befehle[0];
  if (!naechster || flotteLeer(flotte)) return false;
  const zielOrt = befehlOrt(state, naechster);
  // Der Hafen ist weg -- die Flotte bleibt, wo sie ist, statt ins Leere zu
  // fliegen. Sie ist damit heimatlos, nicht kaputt.
  if (!zielOrt) {
    flotte.befehle = [];
    return false;
  }
  const pruefung = reichtTreibstoff(state, flotte, flotte.ort, zielOrt);
  if (pruefung.ok || flotte.treibstoff >= pruefung.hinVerbrauch) {
    abschnittStarten(state, flotte, zielOrt, zeit);
  } else {
    meldungHinzufuegen(state, t("{flotte}: zu wenig Tritium für den Weiterflug – Flotte wartet.", { flotte: flotte.name }));
    flotte.befehle = [];
  }
  return true;
}

// Zapft am Halt Treibstoff nach, bis ein Puffer erreicht ist -- sonst würde
// jede Route irgendwann liegen bleiben, weil niemand manuell nachtankt.
// Fester Puffer als Stellschraube, kein Anspruch auf perfekte Streckenkenntnis.
const ROUTE_TANK_PUFFER = mengeSkaliert(400);
function routeTankenAusfuehren(state, flotte, planet) {
  const bedarf = Math.max(0, ROUTE_TANK_PUFFER - flotte.treibstoff);
  if (bedarf <= 0) return;
  const verfuegbar = Math.floor(planet.ressourcen.tritium || 0);
  const nimm = Math.min(bedarf, verfuegbar);
  if (nimm <= 0) return;
  planet.ressourcen.tritium -= nimm;
  flotte.treibstoff += nimm;
}

// Lädt gemäß der Regeln eines Routenhalts. "voll" nimmt alles Vorhandene,
// "ueberschuss" nur, was über einem Reservewert liegt (Reserve-Schwelle --
// verhindert, dass die Route dem Planeten seine Baumaterialien wegzieht).
// Reicht der Frachtraum nicht für alle Regeln zusammen, wird anteilig
// gekürzt statt eine Regel zu bevorzugen.
function routeLadenAusfuehren(state, flotte, planet, halt) {
  if (!halt.laden || !halt.laden.length) return;

  const wunsch = {};
  for (const regel of halt.laden) {
    const bestand = planet.ressourcen[regel.resId] || 0;
    const menge = regel.modus === "ueberschuss" ? Math.max(0, bestand - (regel.wert || 0)) : bestand;
    if (menge > 0) wunsch[regel.resId] = menge;
  }
  const gesamtWunsch = Object.values(wunsch).reduce((a, b) => a + b, 0);
  if (gesamtWunsch <= 0) return;

  const freiFracht = frachtraumFrei(state, flotte);
  const faktor = gesamtWunsch > freiFracht ? Math.max(0, freiFracht) / gesamtWunsch : 1;

  const geladen = {};
  for (const [resId, menge] of Object.entries(wunsch)) {
    const n = Math.floor(menge * faktor);
    if (n > 0) geladen[resId] = n;
  }
  if (!Object.keys(geladen).length) return;

  abziehen(planet.ressourcen, geladen);
  planetGeaendert(planet);
  hinzufuegen(flotte.ladung, geladen);
  meldungHinzufuegen(
    state,
    t("{flotte}: {fracht} bei {planet} geladen.", {
      flotte: flotte.name,
      fracht: buendelText(geladen),
      planet: planet.name,
    }),
    "fracht"
  );
}

// Schickt eine Flotte zum aktuellen Halt ihrer Route. Reicht der Treibstoff
// nicht, pausiert die Route mit Meldung statt die Flotte stranden zu lassen
// -- dieselbe "verhindern statt bestrafen"-Regel wie bei manuellen Befehlen.
function routeNaechstenHaltStarten(state, flotte, zeit) {
  const route = flotte.route;
  if (!route || !route.halte.length || flotteLeer(flotte)) return;

  const halt = route.halte[route.index];
  const planet = planetById(state, halt.planetId);
  if (!planet) return;

  const zielOrt = ortVonPlanet(state, planet);
  const pruefung = reichtTreibstoff(state, flotte, flotte.ort, zielOrt);
  if (!(pruefung.ok || flotte.treibstoff >= pruefung.hinVerbrauch)) {
    meldungHinzufuegen(state, t("{flotte}: zu wenig Tritium – Route pausiert.", { flotte: flotte.name }));
    route.aktiv = false;
    return;
  }

  flotte.befehle = [{ art: "hafen", planetId: halt.planetId, routenIndex: route.index }];
  abschnittStarten(state, flotte, zielOrt, zeit);
}

// --- Flotten: Routen (Automatisierung) -------------------------------------
export function kannRouteBearbeiten(state) {
  if (!automatisierungFreigeschaltet(state)) {
    return { ok: false, grund: t("Automatisierungstechnik noch nicht erforscht.") };
  }
  return { ok: true };
}

export function routeHaltHinzufuegen(state, flotte, planetId) {
  const check = kannRouteBearbeiten(state);
  if (!check.ok) return check;
  flotte.route.halte.push({ planetId, entladen: true, laden: [] });
  return { ok: true };
}

export function routeHaltEntfernen(state, flotte, index) {
  flotte.route.halte.splice(index, 1);
  if (flotte.route.index >= flotte.route.halte.length) flotte.route.index = 0;
  return { ok: true };
}

export function routeEntladenSetzen(state, flotte, index, entladen) {
  const halt = flotte.route.halte[index];
  if (!halt) return { ok: false, grund: t("Halt nicht gefunden.") };
  halt.entladen = entladen;
  return { ok: true };
}

export function routeLadenRegelSetzen(state, flotte, index, resId, modus, wert) {
  const halt = flotte.route.halte[index];
  if (!halt) return { ok: false, grund: t("Halt nicht gefunden.") };
  halt.laden = halt.laden.filter((r) => r.resId !== resId);
  if (modus) halt.laden.push({ resId, modus, wert: wert || 0 });
  return { ok: true };
}

export function routeStarten(state, flotte) {
  const check = kannRouteBearbeiten(state);
  if (!check.ok) return check;
  if (!flotte.route.halte.length) return { ok: false, grund: t("Route hat keine Stationen.") };
  if (flotteLeer(flotte)) return { ok: false, grund: t("Die Flotte hat keine Schiffe.") };

  flotte.route.aktiv = true;
  if (!flotte.abschnitt) routeNaechstenHaltStarten(state, flotte, spielzeitJetzt(state));
  return { ok: true };
}

export function routeStoppen(state, flotte) {
  flotte.route.aktiv = false;
  return { ok: true };
}

function missionAusfuehren(state, flotte, befehl, zeit) {
  switch (befehl.missionsart) {
    case "sonde":
    case "erkundung":
      aufdecken(state, flotte, befehl, zeit);
      break;
    case "forschung":
      forschungsmission(state, flotte, befehl);
      break;
    case "bergung":
      bergung(state, flotte, befehl, zeit);
      break;
    case "niederlassung":
      piratenNiederlassung(state, flotte, befehl, zeit);
      break;
    case "aussenposten":
      stuetzpunktGruenden(state, flotte, befehl, "aussenposten", zeit);
      break;
    case "kolonie":
      stuetzpunktGruenden(state, flotte, befehl, "kolonie", zeit);
      break;
    case "militaer":
      militaerStarten(state, flotte, befehl, zeit);
      break;
  }
}

function aufdecken(state, flotte, befehl, zeit) {
  const objekt = setzeOrbitZustand(state, befehl.zielSystem, befehl.zielOrbit, { entdeckt: true });
  if (!objekt) return;


  // Sonden sind Einweg -- aber sie lösen sich nicht in Luft auf. Was von der
  // ausgebrannten Sonde übrig ist, bleibt am Zielorbit als Schrott liegen und
  // kann geborgen werden. Grundregel: nichts verschwindet einfach so;
  // Zerstörung ist ein zulässiges Ende, aber sie hinterlässt etwas, solange
  // dieses Etwas eine Verwendung hat.
  if (befehl.missionsart === "sonde" && (flotte.schiffe.sonde || 0) > 0) {
    flotte.schiffe.sonde -= 1;
    zurueckgelassen(
      state,
      ortVonSystem(state, befehl.zielSystem, befehl.zielOrbit),
      schrottVon("sonde"),
      t("Ausgebrannte Sonde"),
      true // leise: die Entdeckungsmeldung reicht, sonst flutet es den Log
    );
  }

  // Aufdecken ist sicher, wie bei jedem anderen Objekt -- "der Gegner ist
  // vorher bekannt" gilt jetzt auch für Gefahren. Verluste entstehen erst,
  // wenn tatsächlich eine Militärmission fliegt (siehe militaerStarten).
  if (objekt.typ === "gefahr") {
    const staerke = schiffeStaerke(objekt.daten.flotte || {});
    meldungHinzufuegen(
      state,
      t("{objekt}: {art} entdeckt – Flotte gesichtet ({schiffe}, {hp} HP gesamt).", {
        objekt: objekt.name,
        art: t(objekt.bezeichnung),
        schiffe: schiffeText(objekt.daten.flotte || {}),
        hp: Math.round(staerke.hp),
      })
    );
    return;
  }
  if (objekt.benoetigt) {
    meldungHinzufuegen(
      state,
      t("{objekt}: {art} entdeckt – nicht zugänglich. Benötigt: {tech}.", {
        objekt: objekt.name,
        art: t(objekt.bezeichnung),
        tech: t(RESEARCH[objekt.benoetigt.forschung].name),
      })
    );
    return;
  }
  // Gruppiert: bei Schnellversand kommen 15 davon auf einmal.
  meldungHinzufuegen(
    state,
    t("{objekt}: {art} entdeckt.", { objekt: objekt.name, art: t(objekt.bezeichnung) }),
    "entdeckung"
  );
}

function forschungsmission(state, flotte, befehl) {
  const objekt = findeObjekt(state, befehl.zielSystem, befehl.zielOrbit);
  if (!objekt) return;

  const fId = objekt.daten.forschung;
  if (fId && !state.forschungFreigeschaltet[fId]) {
    state.forschungFreigeschaltet[fId] = true;
    meldungHinzufuegen(
      state,
      t("{objekt}: Forschungsmission abgeschlossen – {tech} freigeschaltet!", {
        objekt: objekt.name,
        tech: t(RESEARCH[fId].name),
      })
    );
  } else {
    hinzufuegen(flotte.ladung, { silizium: 200 });
    meldungHinzufuegen(
      state,
      t("{objekt}: Technologie bereits bekannt – nur Material geborgen.", { objekt: objekt.name })
    );
  }
  setzeOrbitZustand(state, befehl.zielSystem, befehl.zielOrbit, { verwertet: true });
}

// zeit ist die EREIGNISZEIT der Ankunft, nicht "jetzt" -- nachwachsende
// Vorkommen rechnen damit, und bei Offline-Aufholung liegen die beiden weit
// auseinander. Genau dieser Fehlertyp hat dieses Projekt schon dreimal
// erwischt, deshalb steht er hier ausdrücklich in der Signatur.
function bergung(state, flotte, befehl, zeit) {
  const objekt = findeObjekt(state, befehl.zielSystem, befehl.zielOrbit);
  if (!objekt) return;

  const offen = objekt.nachwachsend
    ? offenerErtrag(state, objekt, zeit)
    : objekt.restErtrag || ertragVon(state, objekt);
  if (!offen || Object.values(offen).every((m) => m <= 0)) return;
  const frei = frachtraumFrei(state, flotte);
  const gesamt = Object.values(offen).reduce((a, b) => a + b, 0);

  // Nachwachsende Vorkommen kennen kein "erschöpft" und keinen Restertrag:
  // ihr Füllstand steckt allein im Erntezeitpunkt. Wer die Hälfte mitnimmt,
  // stellt die Uhr auf halb voll zurück -- so bleibt Teilernte korrekt, ohne
  // einen zweiten Zustand danebenzuführen.
  const uhrZurueckstellen = (genommen) => {
    const voll = ertragVon(state, objekt);
    const summeVoll = Object.values(voll).reduce((a, b) => a + b, 0);
    const uebrig = Math.max(0, gesamt - genommen);
    const vollzeitMs = MS_PRO_STUNDE / ANTIMATERIE_ERNTE.nachwachsenProStunde;
    const anteilUebrig = summeVoll > 0 ? uebrig / summeVoll : 0;
    setzeOrbitZustand(state, befehl.zielSystem, befehl.zielOrbit, {
      geerntetZeit: zeit - anteilUebrig * vollzeitMs,
    });
  };

  if (gesamt <= frei) {
    hinzufuegen(flotte.ladung, offen);
    if (objekt.nachwachsend) {
      uhrZurueckstellen(gesamt);
      meldungHinzufuegen(
        state,
        t("{objekt}: {fracht} geerntet – der Gürtel füllt sich wieder.", {
          objekt: objekt.name,
          fracht: buendelText(offen),
        })
      );
      return;
    }
    setzeOrbitZustand(state, befehl.zielSystem, befehl.zielOrbit, { verwertet: true, restErtrag: null });
    meldungHinzufuegen(
      state,
      t("{objekt}: {fracht} geladen – Fundstelle erschöpft.", {
        objekt: objekt.name,
        fracht: buendelText(offen),
      })
    );
    return;
  }

  const anteil = frei <= 0 ? 0 : frei / gesamt;
  const geladen = {};
  const rest = {};
  for (const [resId, menge] of Object.entries(offen)) {
    geladen[resId] = Math.floor(menge * anteil);
    rest[resId] = menge - geladen[resId];
  }
  hinzufuegen(flotte.ladung, geladen);
  if (objekt.nachwachsend) {
    uhrZurueckstellen(Object.values(geladen).reduce((a, b) => a + b, 0));
  } else {
    setzeOrbitZustand(state, befehl.zielSystem, befehl.zielOrbit, { restErtrag: rest });
  }
  meldungHinzufuegen(
    state,
    t("{objekt}: {geladen} geladen – {rest} bleiben liegen, Frachtraum voll.", {
      objekt: objekt.name,
      geladen: buendelText(geladen),
      rest: buendelText(rest),
    })
  );
}

// --- Kampf ------------------------------------------------------------
// Verteilt Schaden auf eine Schiffsgruppe: trifft zuerst die HP-schwächsten
// Typen. Angesammelter Schaden (schadenKarte) wird zuerst "aufgebraucht",
// bevor tatsächlich ein Schiff zerstört wird -- deshalb kann eine Gruppe
// beschädigt überleben, statt immer nur ganze Schiffe zu verlieren.
function schadenVerteilen(schiffe, schadenKarte, eingehenderSchaden) {
  const typen = Object.keys(schiffe)
    .filter((typ) => schiffe[typ] > 0)
    .sort((a, b) => SCHIFFE[a].hp - SCHIFFE[b].hp);

  let rest = eingehenderSchaden;
  const verlorene = {};
  for (const typ of typen) {
    if (rest <= 0) break;
    const hp = SCHIFFE[typ].hp;
    const vorhandeneKapazitaet = schiffe[typ] * hp - (schadenKarte[typ] || 0);
    if (rest < vorhandeneKapazitaet) {
      schadenKarte[typ] = (schadenKarte[typ] || 0) + rest;
      rest = 0;
    } else {
      verlorene[typ] = schiffe[typ];
      rest -= vorhandeneKapazitaet;
      schiffe[typ] = 0;
      delete schadenKarte[typ];
    }
  }
  return verlorene;
}

// Jedes Gefecht bekommt beim Anlegen eine eigene Saat aus einem Zähler --
// dasselbe Muster wie naechsteFlotteId. Damit ist die Schadensschwankung nicht
// mehr an Math.random gebunden, sondern an den Weltseed: gleiche Welt, gleiche
// Reihenfolge, gleicher Kampfverlauf. Ohne das ist ein Weltlauf nicht
// wiederholbar, weil im Weltlauf dauernd gekämpft wird.
export function kampfSaatZiehen(state) {
  const saat = state.naechsteKampfSaat || 1;
  state.naechsteKampfSaat = saat + 1;
  return saat;
}

// Ein eigener Strom je (Gefecht, Runde): die Runde geht in die Kennung ein,
// nicht in den Zustand des Stroms. Dadurch muss zwischen zwei Runden nichts
// gespeichert werden, und die Reihenfolge der Aufrufe spielt keine Rolle --
// dieselbe Überlegung wie bei stromFuer für Systeme.
function kampfStrom(state, gefecht) {
  const saat = gefecht.saat || 0;
  return stromFuer((state.galaxie.seed ^ Math.imul(saat, 2654435761)) >>> 0, gefecht.runde);
}

// Eine einzelne Kampfrunde: wer wie viel Schaden austeilt und wo er landet.
// Reine Rechnung, kein Zeitbezug -- die zeitliche Verzögerung zwischen zwei
// Aufrufen übernimmt kampfRundeAusfuehren über das normale Ereignissystem.
function kampfRundeRechnen(angreiferSchiffe, angreiferSchaden, verteidigerSchiffe, verteidigerSchaden, rng) {
  const schwankung = () => 1 + (rng() * 2 - 1) * KAMPF.schadensSchwankung;
  const staerkeA = schiffeStaerke(angreiferSchiffe, angreiferSchaden);
  const staerkeV = schiffeStaerke(verteidigerSchiffe, verteidigerSchaden);
  const schadenAnV = Math.round(staerkeA.angriff * schwankung());
  const schadenAnA = Math.round(staerkeV.angriff * schwankung());
  const verlorenV = schadenVerteilen(verteidigerSchiffe, verteidigerSchaden, schadenAnV);
  const verlorenA = schadenVerteilen(angreiferSchiffe, angreiferSchaden, schadenAnA);
  return { schadenAnV, schadenAnA, verlorenV, verlorenA };
}

// Ist das Gefecht nach dieser Runde entschieden? null = geht weiter.
function kampfAuswerten(angreiferSchiffe, angreiferSchaden, startHpAngreifer, verteidigerSchiffe, verteidigerSchaden, rueckzugsSchwelle, runde) {
  const hpA = schiffeStaerke(angreiferSchiffe, angreiferSchaden).hp;
  const hpV = schiffeStaerke(verteidigerSchiffe, verteidigerSchaden).hp;
  if (hpV <= 0) return "sieg";
  if (hpA <= 0) return "niederlage";
  if (startHpAngreifer > 0 && hpA / startHpAngreifer < rueckzugsSchwelle) return "rueckzug";
  if (runde >= KAMPF.maxRunden) return "unentschieden";
  return null;
}

// Bewusst eine Funktion mit t()-Aufrufen statt einer Tabelle: eine Tabelle
// würde beim Laden des Moduls EINMAL übersetzt und bliebe danach in der
// Startsprache stehen. Nebenbei findet der Vollständigkeitstest die Texte nur
// so -- er durchsucht den Quelltext nach t-Aufrufen mit fester Zeichenkette.
function ergebnisText(ergebnis) {
  switch (ergebnis) {
    case "sieg":
      return t("Sieg");
    case "niederlage":
      return t("Niederlage – eigene Flotte vernichtet");
    case "rueckzug":
      return t("Rückzug – eigene Flotte zu geschwächt");
    default:
      return t("Kein Sieger nach maximaler Rundenzahl – Gegner noch zu stark");
  }
}

// Stößt ein Gefecht an. Löst NICHT sofort auf -- die erste Runde läuft beim
// nächsten Ereignis-Durchlauf, weitere folgen im Abstand von
// KAMPF.rundenDauerSek. Die restliche Befehlsfolge (Rückflug) bleibt bis
// dahin liegen (siehe flotteAngekommen).
function militaerStarten(state, flotte, befehl, zeit) {
  const objekt = findeObjekt(state, befehl.zielSystem, befehl.zielOrbit);
  if (!objekt || !objekt.daten.flotte) return;

  // Der Gegner behält Schaden aus früheren Gefechten -- "fest verankert"
  // heißt nur, dass er nicht von selbst nachwächst, nicht dass jeder Angriff
  // bei null anfängt. Persistiert über dieselbe systemZustand-Mechanik wie
  // restErtrag bei Bergungen.
  flotte.gefecht = {
    zielSystem: befehl.zielSystem,
    zielOrbit: befehl.zielOrbit,
    rueckzugsSchwelle: befehl.rueckzugsSchwelle ?? KAMPF.standardRueckzugsSchwelle,
    startHpAngreifer: schiffeStaerke(flotte.schiffe, flotte.schiffSchaden).hp,
    runde: 0,
    saat: kampfSaatZiehen(state),
    verteidigerSchiffe: { ...(objekt.verteidigerSchiffe || objekt.daten.flotte) },
    verteidigerSchaden: { ...(objekt.verteidigerSchaden || {}) },
    // Erste Runde läuft ab der SIMULIERTEN Ankunftszeit, nicht ab der
    // echten Systemzeit -- sonst driftet das bei Zeitsprüngen auseinander
    // (derselbe Fehler, der beim Flotten-Rückflug schon einmal auftrat).
    naechsteRundeZeit: zeit,
  };
  meldungHinzufuegen(state, t("{objekt}: Gefecht beginnt.", { objekt: objekt.name }));
}

// Führt genau eine Runde aus -- als eigenes Ereignis, nicht in einer
// Schleife. Dadurch kann zwischen zwei Runden etwas Drittes passieren
// (eine zweite Flotte eintreffen, eine neue Rückzugsschwelle greifen),
// was bei einem Ein-Tick-Ergebnis strukturell unmöglich wäre.
// Die Verteidigerseite eines Gefechts kann ZWEIERLEI sein: ein Orbit-Objekt
// (die klassische Gefahr) oder eine FLOTTE (Beutezug, später PvP). Die
// Kampfauflösung selbst war immer schon generisch -- sie nimmt zwei Seiten
// {schiffId: anzahl} entgegen. Objektgebunden war nur die Buchführung.
//
// Deshalb wird hier NICHT nach Fraktionsart verzweigt, sondern danach, WORAUF
// gezielt wird. Das ist eine Eigenschaft des Gefechts, keine des Angreifers.
function verteidigerSeite(state, g) {
  if (g.zielFlotte !== undefined && g.zielFlotte !== null) {
    const ziel = flotteById(state, g.zielFlotte);
    if (!ziel) return null;
    // Direkt auf den Beständen der Zielflotte rechnen -- sie führt ihren
    // Schaden ohnehin selbst mit, eine Kopie wäre eine zweite Wahrheit.
    return { art: "flotte", flotte: ziel, schiffe: ziel.schiffe, schaden: ziel.schiffSchaden };
  }
  return { art: "objekt", schiffe: g.verteidigerSchiffe, schaden: g.verteidigerSchaden };
}

function kampfRundeAusfuehren(state, flotte, zeit) {
  const g = flotte.gefecht;
  if (!g) return;
  const seite = verteidigerSeite(state, g);
  if (!seite) {
    // Das Ziel ist verschwunden (aufgelöst, angekommen) -- kein Gefecht mehr.
    flotte.gefecht = null;
    naechstenBefehlFortsetzen(state, flotte, zeit);
    return;
  }
  g.runde++;

  const runde = kampfRundeRechnen(flotte.schiffe, flotte.schiffSchaden, seite.schiffe, seite.schaden, kampfStrom(state, g));
  if (seite.art === "objekt") {
    setzeOrbitZustand(state, g.zielSystem, g.zielOrbit, {
      verteidigerSchiffe: g.verteidigerSchiffe,
      verteidigerSchaden: g.verteidigerSchaden,
    });
  }

  // Eigene Verluste hinterlassen ein Trümmerfeld am Kampfort. Bisher waren
  // zerstörte eigene Schiffe ersatzlos weg -- das widersprach der Grundregel,
  // dass nichts einfach verschwindet, und es ist genau das Material, von dem
  // Bergung (und später Scavenger) leben soll. Die Verluste liefert
  // kampfRundeRechnen ohnehin schon zurück, sie wurden nur verworfen.
  const truemmer = {};
  for (const [typ, anzahl] of Object.entries(runde.verlorenA)) {
    for (const [resId, menge] of Object.entries(schrottVon(typ, anzahl))) {
      truemmer[resId] = (truemmer[resId] || 0) + menge;
    }
  }
  if (Object.keys(truemmer).length) {
    zurueckgelassen(
      state,
      ortVonSystem(state, g.zielSystem, g.zielOrbit),
      truemmer,
      t("{flotte}: Verluste", { flotte: flotte.name }),
      false,
      "kampfverluste" // mehrere Runden hintereinander fassen sich zusammen
    );
  }

  const ergebnis = kampfAuswerten(
    flotte.schiffe,
    flotte.schiffSchaden,
    g.startHpAngreifer,
    seite.schiffe,
    seite.schaden,
    g.rueckzugsSchwelle,
    g.runde
  );

  if (!ergebnis) {
    g.naechsteRundeZeit = zeit + KAMPF.rundenDauerSek * 1000;
    return;
  }

  // Gefecht entschieden.
  const objekt = seite.art === "objekt" ? findeObjekt(state, g.zielSystem, g.zielOrbit) : null;
  const zielName = seite.art === "flotte" ? seite.flotte.name : objekt ? objekt.name : "?";
  flotte.gefecht = null;
  meldungHinzufuegen(
    state,
    t("{objekt}: {ergebnis} nach {runden} Runde(n).", {
      objekt: zielName,
      ergebnis: ergebnisText(ergebnis),
      runden: g.runde,
    })
  );

  if (ergebnis === "sieg" && objekt) {
    setzeOrbitZustand(state, g.zielSystem, g.zielOrbit, { verteidigerBesiegt: true });
    beuteVerladen(state, flotte, objekt, g.zielSystem, g.zielOrbit);
  }

  // Sieg über eine FLOTTE: es geht um die Fracht, nicht um Vernichtung
  // (Tobis Entscheidung -- Piraten greifen Fracht an, nie Planeten). Was der
  // Angreifer tragen kann, nimmt er mit; der Rest bleibt am Ort liegen, statt
  // sich aufzulösen. Überlebende Schiffe des Verteidigers fliegen heim.
  if (ergebnis === "sieg" && seite.art === "flotte") {
    beuteVonFlotte(state, flotte, seite.flotte, zeit);
  }

  if (flotteLeer(flotte)) {
    flotteLeerAufloesen(state, flotte);
    return;
  }
  naechstenBefehlFortsetzen(state, flotte, zeit);
}

// "Verteidiger besiegt" und "Beute abgeholt" sind getrennte Zustände --
// sonst würde Beute spurlos verschwinden, wenn die eigene Flotte im selben
// Gefecht so viel abbekommt, dass kein Frachtraum mehr übrig ist. Dasselbe
// Muster wie bei bergung() mit zu wenig Frachtraum: liegen bleiben statt
// verlieren, mit Frachter nachholbar.
function beuteVerladen(state, flotte, objekt, zielSystem, zielOrbit) {
  const offen = objekt.daten.ertrag;
  const gesamt = offen ? Object.values(offen).reduce((a, b) => a + b, 0) : 0;
  if (gesamt <= 0) {
    setzeOrbitZustand(state, zielSystem, zielOrbit, { verwertet: true });
    return;
  }

  const frei = frachtraumFrei(state, flotte);
  if (gesamt <= frei) {
    hinzufuegen(flotte.ladung, offen);
    setzeOrbitZustand(state, zielSystem, zielOrbit, { verwertet: true, restErtrag: null });
    meldungHinzufuegen(state, t("{objekt}: {beute} erbeutet.", { objekt: objekt.name, beute: buendelText(offen) }));
    return;
  }

  const anteil = frei <= 0 ? 0 : frei / gesamt;
  const geladen = {};
  const rest = {};
  for (const [resId, menge] of Object.entries(offen)) {
    geladen[resId] = Math.floor(menge * anteil);
    rest[resId] = menge - geladen[resId];
  }
  if (Object.values(geladen).some((m) => m > 0)) hinzufuegen(flotte.ladung, geladen);
  setzeOrbitZustand(state, zielSystem, zielOrbit, { restErtrag: rest });
  meldungHinzufuegen(
    state,
    frei > 0
      ? t("{objekt}: {beute} erbeutet – {rest} bleiben liegen, mit Frachter abholen.", {
          objekt: objekt.name,
          beute: buendelText(geladen),
          rest: buendelText(rest),
        })
      : t("{objekt}: kein Frachtraum übrig – {rest} liegen bereit, mit Frachter abholen.", {
          objekt: objekt.name,
          rest: buendelText(rest),
        })
  );
}

// `zeit` ist die EREIGNISZEIT der Ankunft, nicht die Wanduhr -- derselbe
// Fehlertyp wie bei Flotten-Rückflug und Kampfrunden. Hier wird sie gebraucht,
// um die Uhr der neuen Kolonie zu stellen.
function stuetzpunktGruenden(state, flotte, befehl, typ, zeit) {
  const objekt = findeObjekt(state, befehl.zielSystem, befehl.zielOrbit);
  if (!objekt || planetAn(state, befehl.zielSystem, befehl.zielOrbit)) return;

  if (typ === "kolonie") flotte.schiffe.kolonieschiff = Math.max(0, (flotte.schiffe.kolonieschiff || 0) - 1);

  const planet = neuerPlanet({
    id: state.naechstePlanetId++,
    systemId: befehl.zielSystem,
    orbit: befehl.zielOrbit,
    name: objekt.name,
    typ,
    art: objekt.bezeichnung || null,
    groesse: objekt.daten.groesse || 150,
    // WEM DIE FLOTTE GEHÖRT, DEM GEHÖRT DIE KOLONIE. Ohne diese Zeile griff
    // die Vorgabe von neuerPlanet, und die ist der Spieler -- er war bis zu
    // den Fraktionen der einzige, der je etwas gegründet hat. Die erste
    // Bot-Kolonie landete dadurch stillschweigend in seinem Imperium: das
    // Kolonieschiff verschwand, ein Planet entstand, und beim gründenden
    // Imperium war er nicht zu finden.
    fraktion: fraktionVon(flotte),
  });
  // Die drei Eigenschaften stehen seit der Weltgenerierung fest -- die Kolonie
  // übernimmt sie nur, sie werden hier nicht neu ausgewürfelt (die Welt
  // existiert schon, bevor man sie sieht). Die Affinität leitet sich daraus ab.
  planet.klasse = objekt.daten.klasse || null;
  planet.zone = objekt.daten.zone || null;
  planet.wasser = objekt.daten.wasser || null;
  planet.schwerkraft = objekt.daten.schwerkraft || 1;
  // Uhr auf den Gründungszeitpunkt stellen. Ohne das erbte eine Kolonie den
  // gemeinsamen state.letzterTick und würde beim nächsten Vorrücken für eine
  // Zeit mitproduzieren, in der es sie noch gar nicht gab.
  planet.letzterTick = zeit;
  if (typ === "kolonie") insLager(state, planet, KOLONIE.startvorrat);
  state.planeten.push(planet);

  meldungHinzufuegen(
    state,
    typ === "kolonie"
      ? t("Kolonie auf {ort} gegründet – eigene Produktion läuft an.", { ort: objekt.name })
      : t("Außenposten auf {ort} errichtet – deine Reichweite verschiebt sich.", { ort: objekt.name })
  );
}

// --- Objekte & Missionsarten ---------------------------------------------
export function bergungsFaktor(state) {
  return 1 + (state.forschung.bergungstechnik || 0) * RESEARCH.bergungstechnik.bergungProLevel;
}

export function ertragVon(state, objekt) {
  if (!objekt.daten.ertrag) return null;
  return skalieren(objekt.daten.ertrag, bergungsFaktor(state));
}

// Wieviel liegt gerade da? Bei nachwachsenden Vorkommen (Antimaterie-Gürtel
// an Riesenplaneten) hängt das an der Zeit seit der letzten Ernte.
//
// BEWUSST faul gerechnet statt als Ereignis: es gibt keinen Zeitpunkt, an dem
// etwas passieren müsste -- der Gürtel füllt sich einfach. Dasselbe Muster wie
// die Flottenposition, die auch nur bei Bedarf interpoliert wird. Ein
// Nachwachs-Ereignis je Riesenplanet würde den Ereignisdeckel auffressen,
// ohne dass irgendjemand etwas davon hätte.
export function offenerErtrag(state, objekt, jetzt = spielzeitJetzt(state)) {
  if (!objekt.nachwachsend) return objekt.restErtrag || ertragVon(state, objekt);

  const voll = ertragVon(state, objekt);
  if (!voll) return null;
  if (!objekt.geerntetZeit) return voll; // noch nie angerührt
  const vollzeitMs = MS_PRO_STUNDE / ANTIMATERIE_ERNTE.nachwachsenProStunde;
  const anteil = Math.min(1, Math.max(0, (jetzt - objekt.geerntetZeit) / vollzeitMs));
  return skalieren(voll, anteil);
}

export function missionFuerObjekt(state, objekt) {
  const regel = OBJEKT_REGELN[objekt.typ] || {};
  if (!objekt.entdeckt) {
    return regel.aufdeckung === "erkunder" ? "erkundung" : regel.aufdeckung ? "sonde" : null;
  }
  // Gefahr ist ein Sonderfall: "Verteidiger besiegt" und "Beute abgeholt"
  // sind getrennte Zustände (siehe beuteVerladen). Solange noch Beute
  // liegt, ist die Folgemission eine normale Bergung, kein erneuter Angriff.
  if (objekt.typ === "gefahr") {
    if (!objekt.verteidigerBesiegt) return "militaer";
    const restOffen = objekt.restErtrag && Object.values(objekt.restErtrag).some((m) => m > 0);
    return restOffen ? "bergung" : null;
  }
  // Liegengebliebenes Material ist IMMER bergbar, unabhängig davon, was das
  // Objekt ursprünglich war -- auch auf einem leeren Orbit. Sonst wäre der
  // Nachlass einer aufgelösten Flotte dort unerreichbar.
  const restLiegt = objekt.restErtrag && Object.values(objekt.restErtrag).some((m) => m > 0);
  if (restLiegt) return "bergung";
  if (objekt.verwertet) return null;
  if (regel.zugriff === "forschung") return "forschung";
  // Bergung nur, wenn tatsächlich ein Ertrag daliegt: Planeten tragen die
  // Regel "bergung", aber nur Riesenplaneten haben einen Antimaterie-Gürtel.
  if (regel.zugriff === "bergung") return objekt.daten.ertrag ? "bergung" : null;
  return null;
}

// Kann diese Flotte diese Mission überhaupt fliegen?
export function kannMission(state, flotte, missionsart, systemId, orbit) {
  const objekt = findeObjekt(state, systemId, orbit);
  if (!objekt) return { ok: false, grund: t("Unbekanntes Ziel.") };

  const schiffId = MISSIONS_SCHIFF[missionsart];
  if (schiffId && (flotte.schiffe[schiffId] || 0) < 1) {
    return { ok: false, grund: t("Flotte hat keine {schiff}.", { schiff: t(SCHIFFE[schiffId].name) }) };
  }
  const ziel = ortVonSystem(state, systemId, orbit);
  return kannBefehlen(state, flotte, ziel);
}

export function kannGruendungsmission(state, flotte, art, systemId, orbit) {
  const objekt = findeObjekt(state, systemId, orbit);
  if (!objekt) return { ok: false, grund: t("Unbekanntes Ziel.") };
  if (!objekt.entdeckt) return { ok: false, grund: t("Noch nicht erkundet.") };
  if (objekt.typ !== "planet" || !objekt.daten.kolonisierbar) {
    return { ok: false, grund: t("Hier lässt sich nichts errichten.") };
  }
  if (planetAn(state, systemId, orbit)) return { ok: false, grund: t("Hier steht bereits ein Stützpunkt.") };

  if (art === "kolonie" && (flotte.schiffe.kolonieschiff || 0) < 1) {
    return { ok: false, grund: t("Flotte hat kein Kolonieschiff.") };
  }
  if (art === "aussenposten" && schiffeGesamt(flotte) < 1) {
    return { ok: false, grund: t("Die Flotte hat keine Schiffe.") };
  }
  const ziel = ortVonSystem(state, systemId, orbit);
  return kannBefehlen(state, flotte, ziel);
}

export function gruendungBefehlen(state, flotte, art, systemId, orbit) {
  const check = kannGruendungsmission(state, flotte, art, systemId, orbit);
  if (!check.ok) return check;

  // Außenposten kostet Material vom Heimathafen, Kolonie ein Kolonieschiff.
  if (art === "aussenposten") {
    const heimat = planetById(state, flotte.heimatPlanet);
    if (!heimat || !reichenAus(heimat.ressourcen, AUSSENPOSTEN.kosten)) {
      return {
        ok: false,
        grund: t("Benötigt {kosten} auf {planet}.", {
          kosten: buendelText(AUSSENPOSTEN.kosten),
          planet: heimat ? heimat.name : "?",
        }),
      };
    }
    abziehen(heimat.ressourcen, AUSSENPOSTEN.kosten);
    planetGeaendert(heimat);
  }
  return missionBefehlen(state, flotte, art, systemId, orbit);
}

// --- Markt ------------------------------------------------------------
// SEIT v0.6 HAT DER MARKT EINEN GEGENÜBER.
//
// Vorher war er ein unendlicher Käufer und ein unendlicher Verkäufer
// zugleich: verkaufen() ließ die Ware verschwinden und Credits erscheinen,
// kaufen() umgekehrt. Auf Prinzip 0s Prüffrage -- welcher Fluss hält das
// aufrecht? -- gab es keine Antwort.
//
// Jetzt ist jeder Handel eine UMBUCHUNG zwischen zwei echten Planetenlagern:
// deine Ware liegt danach bei ihm, seine Credits bei dir. Damit ergeben sich
// zwei Grenzen von selbst, die vorher keine waren: er kann nur kaufen, wenn
// er Geld hat, und nur verkaufen, was er wirklich besitzt. Kein Deckel, den
// jemand gesetzt hätte -- ein Gegenüber mit Inventar.
//
// Verkaufen bleibt sofort, Kaufen legt die Ware weiter ins Marktlager: sie
// gehört dem Spieler, muss aber von einer Flotte geholt werden. Das ist die
// gewollte Reibung, kein Bug.
//
// BEKANNTE LÜCKE, bewusst offen: die Ware selbst reist nicht. Zwischen zwei
// Systemen wäre das ein Verstoß gegen Prinzip 4 -- derselbe Grund wie bei
// den fehlenden Sprungrouten, und mit denselben Mitteln zu beheben. Deshalb
// steht die Reichweitengrenze unten: gehandelt wird nur mit Nachbarn, die
// eine Flotte auch erreichen könnte.

// Mit wem handelt dieser Planet? Ein fremder Planet mit Handelsposten in
// Reichweite -- der nächstgelegene gewinnt. Fraktionen ohne `handel` (Piraten)
// scheiden über ihre Art aus, nicht über eine Sonderabfrage.
export function handelsPartner(state, planet) {
  if (!planet) return null;
  let bester = null;
  for (const fremd of state.planeten) {
    if (fraktionVon(fremd) === fraktionVon(planet)) continue;
    if (!handelVerfuegbar(fremd)) continue;
    const art = fraktionArt(fraktionById(state, fraktionVon(fremd)) || {});
    if (!art.nutzt || !art.nutzt.handel) continue;
    // Gemessen ab den EIGENEN Stützpunkten des Handelnden -- siehe den
    // Fehlerbericht bei naechsteBasis in state.js.
    if (!systemErreichbar(state, fremd.systemId, fraktionVon(planet))) continue;
    const d = strecke(ortVonPlanet(state, planet), ortVonPlanet(state, fremd));
    if (!bester || d < bester.entfernung) bester = { planet: fremd, entfernung: d };
  }
  return bester;
}

function partnerPruefen(state, planet) {
  if (!handelVerfuegbar(planet)) return { ok: false, grund: t("Kein Handelsposten auf diesem Planeten.") };
  const partner = handelsPartner(state, planet);
  if (!partner) return { ok: false, grund: t("Kein Handelspartner in Reichweite.") };
  return { ok: true, partner: partner.planet };
}

// Wie denkt der Partner über MICH? Die Richtung ist entscheidend: Beziehungen
// sind gerichtet gespeichert, und wer handelt, entscheidet nach seiner
// eigenen Meinung -- nicht nach meiner.
function haltungZuMir(state, partner, planet) {
  return beziehungZu(state, fraktionVon(partner), fraktionVon(planet));
}

// Braucht der Partner diese Ware WIRKLICH? Gemessen, nicht geraten: sein
// Bestand schrumpft gerade, er verbraucht also mehr, als er herstellt.
// Das ist das Ventil, durch das auch ein verfeindeter Nachbar noch kauft.
function dringenderBedarf(state, partner, resId) {
  const { lager } = effektiveRaten(state, partner);
  return (lager[resId] || 0) < 0;
}

export function kannVerkaufen(state, planet, resId, menge) {
  const partnerCheck = partnerPruefen(state, planet);
  if (!partnerCheck.ok) return partnerCheck;
  if (!MARKT_PREISE[resId]) return { ok: false, grund: t("Nicht handelbar.") };
  if (menge <= 0) return { ok: false, grund: t("Menge muss positiv sein.") };
  if ((planet.ressourcen[resId] || 0) < menge) return { ok: false, grund: t("Nicht genug vorhanden.") };
  // WILL er von mir kaufen? Bei schlechter Beziehung nur noch, wenn er die
  // Ware dringend braucht -- Not schlägt Groll, aber nur knapp.
  {
    const partner = partnerCheck.partner;
    if (
      haltungZuMir(state, partner, planet) < HANDEL.bereitschaftAb &&
      !dringenderBedarf(state, partner, resId)
    ) {
      return {
        ok: false,
        grund: t("{partner} kauft nichts mehr von dir – zu schlechte Beziehung, und gebraucht wird es dort auch nicht.", {
          partner: partner.name,
        }),
      };
    }
  }
  // Auf 2 Nachkommastellen runden, bevor gerundet wird -- sonst kippt
  // Gleitkomma-Unschärfe (z.B. 100*2.2 = 220.00000000000003) den Preis um.
  const erloes = Math.floor(Math.round(menge * MARKT_PREISE[resId].verkauf * 100) / 100);
  const partner = partnerCheck.partner;
  if ((partner.ressourcen.credits || 0) < erloes) {
    return {
      ok: false,
      grund: t("{partner} kann das nicht bezahlen – dort liegen nur {credits} cr.", {
        partner: partner.name,
        credits: Math.floor(partner.ressourcen.credits || 0),
      }),
    };
  }
  return { ok: true, erloes, partner };
}

export function verkaufen(state, planet, resId, menge) {
  const check = kannVerkaufen(state, planet, resId, menge);
  if (!check.ok) return check;
  const partner = check.partner;

  planet.ressourcen[resId] -= menge;
  planetGeaendert(planet);
  // Was beim Partner nicht mehr ins Lager passt, wird auch nicht bezahlt --
  // sonst entstünde beim Gegenüber genau das Loch, das wir hier zumachen.
  const { genommen } = insLager(state, partner, { [resId]: menge });
  const wirklich = genommen[resId] || 0;
  if (wirklich < menge) {
    planet.ressourcen[resId] += menge - wirklich;
    if (wirklich <= 0) return { ok: false, grund: t("Das Lager des Partners ist voll.") };
  }
  const erloes = Math.floor(Math.round(wirklich * MARKT_PREISE[resId].verkauf * 100) / 100);
  partner.ressourcen.credits = (partner.ressourcen.credits || 0) - erloes;
  planet.ressourcen.credits = (planet.ressourcen.credits || 0) + erloes;
  planetGeaendert(partner);
  return { ok: true, erloes, menge: wirklich };
}

export function kannKaufen(state, planet, resId, menge) {
  const partnerCheck = partnerPruefen(state, planet);
  if (!partnerCheck.ok) return partnerCheck;
  if (!MARKT_PREISE[resId]) return { ok: false, grund: t("Nicht handelbar.") };
  if (menge <= 0) return { ok: false, grund: t("Menge muss positiv sein.") };
  const partner = partnerCheck.partner;
  // WILL er an mich verkaufen? Hier gibt es kein Bedarfsventil: niemand ist
  // gezwungen, den zu beliefern, der ihn ausraubt.
  if (haltungZuMir(state, partner, planet) < HANDEL.bereitschaftAb) {
    return {
      ok: false,
      grund: t("{partner} verkauft dir nichts mehr.", { partner: partner.name }),
    };
  }
  if ((partner.ressourcen[resId] || 0) < menge) {
    return {
      ok: false,
      grund: t("{partner} hat nur {menge} {res} abzugeben.", {
        partner: partner.name,
        menge: Math.floor(partner.ressourcen[resId] || 0),
        res: resName(resId),
      }),
    };
  }
  const kosten = Math.ceil(Math.round(menge * MARKT_PREISE[resId].kauf * 100) / 100);
  if ((planet.ressourcen.credits || 0) < kosten) return { ok: false, grund: t("Nicht genug Credits.") };
  return { ok: true, kosten, partner };
}

export function kaufen(state, planet, resId, menge) {
  const check = kannKaufen(state, planet, resId, menge);
  if (!check.ok) return check;
  const partner = check.partner;

  planet.ressourcen.credits -= check.kosten;
  partner.ressourcen[resId] -= menge;
  partner.ressourcen.credits = (partner.ressourcen.credits || 0) + check.kosten;
  planet.marktlager[resId] = (planet.marktlager[resId] || 0) + menge;
  planetGeaendert(planet);
  planetGeaendert(partner);
  return { ok: true };
}

// Flotte holt Marktware ab -- wie ladungAufnehmen, nur aus dem Marktlager
// statt aus dem normalen Lager, und ohne erneute Bezahlung.
export function kannMarktwareLaden(state, flotte, buendel) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;
  for (const [resId, menge] of Object.entries(buendel)) {
    if ((planet.marktlager[resId] || 0) < menge) {
      return { ok: false, grund: t("Nicht genug {res} im Marktlager.", { res: resName(resId) }) };
    }
  }
  const gesamt = Object.values(buendel).reduce((a, b) => a + b, 0);
  if (gesamt > frachtraumFrei(state, flotte)) {
    return { ok: false, grund: t("Nicht genug Frachtraum.") };
  }
  return { ok: true, planet };
}

export function marktwareLaden(state, flotte, buendel) {
  const check = kannMarktwareLaden(state, flotte, buendel);
  if (!check.ok) return check;
  for (const [resId, menge] of Object.entries(buendel)) {
    check.planet.marktlager[resId] -= menge;
  }
  hinzufuegen(flotte.ladung, buendel);
  return { ok: true };
}

// Fracht direkt im Hafen ins Lager entladen -- ohne Abflug nötig. Damit
// landet gekaufte (oder unterwegs nicht abgesetzte) Ware auch dann im
// nutzbaren Lager, wenn Kauf- und Zielplanet identisch sind.
export function kannLadungEntladen(state, flotte) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  if (!ladungGesamt(flotte)) return { ok: false, grund: t("Keine Ladung an Bord.") };
  return { ok: true, planet: check.planet };
}

export function ladungEntladen(state, flotte) {
  const check = kannLadungEntladen(state, flotte);
  if (!check.ok) return check;
  ladungLoeschen(state, flotte, check.planet);
  return { ok: true };
}

// --- Bauen & Forschen -----------------------------------------------------
export function kannBauen(state, planet, gebaeudeId) {
  if (!planet || planet.typ === "aussenposten") {
    return { ok: false, grund: t("Außenposten haben keine Wirtschaft.") };
  }
  const laenge = (planet.bauQueue ? 1 : 0) + planet.bauWarteschlange.length;
  if (laenge >= BAUWARTESCHLANGE_MAX) {
    return { ok: false, grund: t("Warteschlange voll ({max}/{max}).", { max: BAUWARTESCHLANGE_MAX }) };
  }
  const def = BUILDINGS[gebaeudeId];
  // Manche Anlagen hängen an einer Technologie (v0.71: der Magnetfeld-
  // generator). Dieselbe Form wie bei den Weltobjekten -- `benoetigt` mit
  // einer Forschung -- statt eines zweiten Mechanismus.
  if (def.benoetigt && def.benoetigt.forschung) {
    if ((state.forschung[def.benoetigt.forschung] || 0) < 1) {
      return {
        ok: false,
        grund: t("{tech} noch nicht erforscht.", { tech: t(RESEARCH[def.benoetigt.forschung].name) }),
      };
    }
  }
  // Bevölkerungsschwelle: manche Anlagen brauchen eine Belegschaft, nicht nur
  // Baumaterial. Der Grund steht im Text, ein grauer Knopf ohne Erklärung
  // wäre ein Fehler.
  if (def.bevoelkerungAb) {
    const menschen = planet.ressourcen.bevoelkerung || 0;
    if (menschen < def.bevoelkerungAb) {
      return {
        ok: false,
        grund: t("Braucht {noetig} Bevölkerung (aktuell {aktuell}).", {
          noetig: Math.round(def.bevoelkerungAb),
          aktuell: Math.round(menschen),
        }),
      };
    }
  }
  // Anlagen für einen Rohstoff, den es hier nicht gibt, gar nicht erst
  // anbieten. Verhindern statt bestrafen: sonst baut man eine Mine, die
  // dauerhaft null fördert, und sucht den Fehler bei sich.
  for (const resId of Object.keys(def.produktion || {})) {
    if (affinitaetFaktor(planet, resId) === 0) {
      // Bewusst ohne Artikel formuliert: Ressourcennamen haben verschiedene
      // Geschlechter ("kein Nahrung" war der erste Versuch), und die
      // Planetenarten ebenfalls. So stimmt der Satz für jede künftige
      // Ressource, ohne dass jemand ein Genus-Feld pflegen muss.
      return {
        ok: false,
        grund: planet.art
          ? t("{res} gibt es hier nicht ({art}).", { res: t(RESSOURCEN[resId].name), art: t(planet.art) })
          : t("{res} gibt es hier nicht.", { res: t(RESSOURCEN[resId].name) }),
      };
    }
  }
  const level = naechstesGebaeudeLevel(planet, gebaeudeId);
  const kosten = gebaeudeKosten(planet, def, level);
  if (!reichenAus(planet.ressourcen, kosten)) return { ok: false, grund: t("Nicht genug Ressourcen.") };
  return { ok: true, kosten, level };
}

// Läuft schon ein Bau, wird der neue Auftrag eingereiht statt gestartet.
// Kosten werden immer sofort abgezogen (auch für Warteschlangeneinträge) --
// dieselbe "sofort committen" Regel wie bei Fracht/Logistiknetz, damit ein
// eingereihter Bau garantiert stattfindet.
/**
 * @param zeit Startzeitpunkt des Baus. Vorgabe ist die Spielzeit -- richtig
 *   für die Oberfläche, denn dort IST gerade jetzt. Wer aus einem Ereignis
 *   heraus baut (die Aufbau-Routine der Bot-Fraktionen), MUSS die
 *   Ereigniszeit übergeben.
 *
 *   Sonst landet die Fertigzeit bei einer Aufholung weit in der Zukunft, der
 *   Bau wird nie fertig, und weil er die Bauschleife belegt, kommt auch kein
 *   zweiter mehr durch. Genau so ist es beim ersten Weltlauf mit Bots
 *   passiert: sechs Stunden lang wurde nichts gebaut.
 *
 *   DRITTER Fall dieses Fehlertyps in diesem Projekt an einem Tag (nach
 *   befehleSetzen und der Puffergrenze) -- alle drei lagen latent, weil bis
 *   dahin nur die Oberfläche diese Funktionen aufrief.
 */
export function bauStarten(state, planet, gebaeudeId, zeit = null) {
  const check = kannBauen(state, planet, gebaeudeId);
  if (!check.ok) return check;

  abziehen(planet.ressourcen, check.kosten);
  planetGeaendert(planet);
  const dauerSek = bauzeitFuerLevel(BUILDINGS[gebaeudeId], check.level);

  if (!planet.bauQueue) {
    const jetzt = zeit === null ? spielzeitJetzt(state) : zeit;
    planet.bauQueue = { gebaeudeId, zielLevel: check.level, startZeit: jetzt, fertigZeit: jetzt + dauerSek * 1000 };
  } else {
    planet.bauWarteschlange.push({ gebaeudeId, zielLevel: check.level, dauerSek });
  }
  return { ok: true };
}

// Storniert einen noch nicht gestarteten Warteschlangeneintrag und erstattet
// die Kosten -- über insLager, damit eine zwischenzeitlich volle Lagerkapazität
// die Erstattung nicht verschluckt (wie überall sonst im Spiel).
export function bauWarteschlangeEntfernen(state, planet, index) {
  const eintrag = planet.bauWarteschlange[index];
  if (!eintrag) return { ok: false, grund: t("Eintrag nicht gefunden.") };
  const kosten = gebaeudeKosten(planet, BUILDINGS[eintrag.gebaeudeId], eintrag.zielLevel);
  const { abgelehnt } = insLager(state, planet, kosten);
  planet.bauWarteschlange.splice(index, 1);
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }));
  }
  return { ok: true };
}

// Bricht den GERADE LAUFENDEN Bau ab (nicht die Warteschlange dahinter) --
// volle Erstattung, kein Zeitanteil-Abzug, dieselbe einfache v1-Regel wie
// beim Entfernen aus der Warteschlange. Rückt danach den nächsten
// Warteschlangeneintrag nach (startet jetzt, nicht zur ursprünglich
// geplanten Zeit -- der Bau wurde ja gerade erst abgebrochen).
export function bauAbbrechen(state, planet) {
  if (!planet.bauQueue) return { ok: false, grund: t("Kein laufender Bauauftrag.") };
  const abgebrochen = planet.bauQueue;
  const kosten = gebaeudeKosten(planet, BUILDINGS[abgebrochen.gebaeudeId], abgebrochen.zielLevel);
  const { abgelehnt } = insLager(state, planet, kosten);
  const naechster = planet.bauWarteschlange.shift();
  const jetzt = spielzeitJetzt(state);
  planet.bauQueue = naechster
    ? { gebaeudeId: naechster.gebaeudeId, zielLevel: naechster.zielLevel, startZeit: jetzt, fertigZeit: jetzt + naechster.dauerSek * 1000 }
    : null;
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }));
  }
  return { ok: true };
}

export function kannForschen(state, planet, forschungId) {
  if (!forschungVerfuegbar(state, forschungId)) {
    return { ok: false, grund: t("Diese Technologie ist noch unbekannt.") };
  }
  if (!forschungVoraussetzungenErfuellt(state, forschungId)) {
    return { ok: false, grund: t("Benötigt {voraussetzungen}.", { voraussetzungen: voraussetzungenText(forschungId) }) };
  }
  const laenge = (state.forschungsQueue ? 1 : 0) + state.forschungsWarteschlange.length;
  if (laenge >= BAUWARTESCHLANGE_MAX) {
    return { ok: false, grund: t("Warteschlange voll ({max}/{max}).", { max: BAUWARTESCHLANGE_MAX }) };
  }

  const def = RESEARCH[forschungId];
  const level = naechstesForschungLevel(state, forschungId);
  if (def.schluessel && level > 1) return { ok: false, grund: t("Bereits erforscht.") };
  // Seit v0.6 wird nicht mehr vorab bezahlt, sondern laufend geforscht. Die
  // einzige Bedingung ist deshalb, dass es überhaupt jemanden gibt, der es
  // tut -- ein Auftrag ohne Labor bliebe für immer bei null Prozent stehen,
  // und ein Knopf, der das zulässt, verstößt gegen Prinzip 10a.
  if (!hatLabor(state)) {
    return { ok: false, grund: t("Kein Forschungslabor im Imperium – ohne Labor forscht niemand.") };
  }
  return { ok: true, level, aufwand: forschungsAufwand(def, level) };
}

// Läuft schon eine Forschung, wird der neue Auftrag eingereiht -- gleiches
// Muster wie bauStarten, nur ohne Zahlung: bezahlt wird durch den laufenden
// Betrieb der Labore, nicht beim Klick.
export function forschungStarten(state, planet, forschungId) {
  const check = kannForschen(state, planet, forschungId);
  if (!check.ok) return check;

  const eintrag = { forschungId, zielLevel: check.level, aufwand: check.aufwand };
  if (!state.forschungsQueue) {
    state.forschungsQueue = neueForschungsQueue(eintrag, spielzeitJetzt(state));
  } else {
    state.forschungsWarteschlange.push(eintrag);
  }
  return { ok: true };
}

// Nichts zu erstatten: ein wartender Eintrag hat noch nichts verbraucht.
export function forschungWarteschlangeEntfernen(state, index) {
  const eintrag = state.forschungsWarteschlange[index];
  if (!eintrag) return { ok: false, grund: t("Eintrag nicht gefunden.") };
  state.forschungsWarteschlange.splice(index, 1);
  return { ok: true };
}

// Bricht die GERADE LAUFENDE Forschung ab -- gleiche Regel wie bauAbbrechen
// (volle Erstattung, kein Zeitanteil). Erstattet an planetId der Queue, aus
// demselben Grund wie forschungWarteschlangeEntfernen.
export function forschungAbbrechen(state) {
  if (!state.forschungsQueue) return { ok: false, grund: t("Keine laufende Forschung.") };
  // Kein Ersatz mehr, und das ist keine Härte, sondern die Folge der neuen
  // Bezahlung: verbraucht wurden Strom, Menschen und Laborbedarf, und die
  // sind weg. Erstattet würde sonst etwas, das nie im Lager lag. Was
  // verlorengeht, ist der Fortschritt -- deshalb sagt der Knopf es vorher.
  state.forschungsQueue = neueForschungsQueue(state.forschungsWarteschlange.shift(), spielzeitJetzt(state));
  return { ok: true };
}

// --- Schiffbau ------------------------------------------------------------
export function schiffsBauzeitSek(planet, schiffId, anzahl) {
  const tempo = werftTempo(planet);
  if (tempo <= 0) return Infinity;
  return Math.max(3, Math.round((SCHIFFE[schiffId].bauzeitSek * anzahl) / tempo));
}

export function kannSchiffBauen(state, planet, schiffId, anzahl = 1) {
  if (!planet || planet.typ === "aussenposten") return { ok: false, grund: t("Außenposten haben keine Werft.") };
  if (werftTempo(planet) <= 0) return { ok: false, grund: t("Hier steht keine Werft.") };
  const laenge = (planet.werftQueue ? 1 : 0) + planet.werftWarteschlange.length;
  if (laenge >= BAUWARTESCHLANGE_MAX) {
    return { ok: false, grund: t("Warteschlange voll ({max}/{max}).", { max: BAUWARTESCHLANGE_MAX }) };
  }

  const kosten = schiffKosten(planet, schiffId, anzahl);
  if (!reichenAus(planet.ressourcen, kosten)) return { ok: false, grund: t("Nicht genug Ressourcen.") };
  return { ok: true, kosten };
}

// Läuft die Werft schon, wird der Auftrag eingereiht -- gleiches Muster.
//
// `zeit` ist optional und die Oberfläche lässt sie weg -- ein Klick passiert
// jetzt, da sind Wanduhr und Ereigniszeit dasselbe. Aus einem EREIGNIS heraus
// (Bot-Takt) sind sie es nicht, und dann muss die übergebene Zeit gelten.
//
// SECHSTER FALL desselben Fehlertyps in diesem Projekt, und er hat sich genau
// so gezeigt wie die fünf davor: die Bot-Imperien bauten am 2026-08-16 ein
// Kolonieschiff, dessen Fertigzeit nach der Wanduhr gerechnet wurde. In der
// simulierten Zeit lag sie damit weit in der Zukunft, der Auftrag wurde nie
// fertig -- und weil er die Werft belegte, kam auch kein zweiter durch. Nach
// hundert Tagen stand die Warteschlange unverändert, und keine einzige Kolonie
// war entstanden. Betroffen und behoben sind inzwischen: befehleSetzen,
// missionBefehlen, bauStarten, die Puffergrenze und jetzt schiffBauen.
export function schiffBauen(state, planet, schiffId, anzahl = 1, zeit = null) {
  const check = kannSchiffBauen(state, planet, schiffId, anzahl);
  if (!check.ok) return check;

  abziehen(planet.ressourcen, check.kosten);
  planetGeaendert(planet);
  const dauerSek = schiffsBauzeitSek(planet, schiffId, anzahl);

  if (!planet.werftQueue) {
    const jetzt = zeit ?? spielzeitJetzt(state);
    planet.werftQueue = { schiffId, anzahl, startZeit: jetzt, fertigZeit: jetzt + dauerSek * 1000 };
  } else {
    planet.werftWarteschlange.push({ schiffId, anzahl, dauerSek });
  }
  return { ok: true };
}

export function werftWarteschlangeEntfernen(state, planet, index) {
  const eintrag = planet.werftWarteschlange[index];
  if (!eintrag) return { ok: false, grund: t("Eintrag nicht gefunden.") };
  const kosten = schiffKosten(planet, eintrag.schiffId, eintrag.anzahl);
  const { abgelehnt } = insLager(state, planet, kosten);
  planet.werftWarteschlange.splice(index, 1);
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }));
  }
  return { ok: true };
}

// Bricht den GERADE LAUFENDEN Schiffbau ab -- gleiche Regel wie bauAbbrechen.
export function werftAbbrechen(state, planet) {
  if (!planet.werftQueue) return { ok: false, grund: t("Kein laufender Schiffbau.") };
  const abgebrochen = planet.werftQueue;
  const kosten = schiffKosten(planet, abgebrochen.schiffId, abgebrochen.anzahl);
  const { abgelehnt } = insLager(state, planet, kosten);
  const naechster = planet.werftWarteschlange.shift();
  const jetzt = spielzeitJetzt(state);
  planet.werftQueue = naechster
    ? { schiffId: naechster.schiffId, anzahl: naechster.anzahl, startZeit: jetzt, fertigZeit: jetzt + naechster.dauerSek * 1000 }
    : null;
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }));
  }
  return { ok: true };
}

// --- Anzeige --------------------------------------------------------------
// Funktion statt Tabelle, aus demselben Grund wie bei ergebnisText: eine
// Tabelle würde beim Laden des Moduls einmal übersetzt und bliebe danach in
// der Startsprache stehen. null für unbekannte Arten -- die Aufrufer setzen
// jeweils ihren eigenen Ersatztext ein.
export function missionLabel(art) {
  switch (art) {
    case "sonde":
      return t("Sonde");
    case "erkundung":
      return t("Erkundung");
    case "forschung":
      return t("Forschungsmission");
    case "bergung":
      return t("Bergung");
    case "aussenposten":
      return t("Außenposten");
    case "kolonie":
      return t("Koloniegründung");
    case "militaer":
      return t("Angriff");
    default:
      return null;
  }
}

export function flotteStatusText(state, flotte) {
  if (flotte.gefecht) {
    return flotte.gefecht.runde >= KAMPF.maxRunden
      ? t("im Gefecht (Runde {runde})", { runde: flotte.gefecht.runde })
      : t("im Gefecht (Runde {runde}/{max})", { runde: flotte.gefecht.runde, max: KAMPF.maxRunden });
  }
  if (flotte.dockPlanet) {
    const planet = planetById(state, flotte.dockPlanet);
    return t("im Hafen bei {planet}", { planet: planet ? planet.name : "?" });
  }
  const befehl = flotte.befehle[0];
  if (!befehl) return t("steht im Raum");
  if (befehl.art === "hafen") {
    const planet = planetById(state, befehl.planetId);
    return t("Rückflug nach {planet}", { planet: planet ? planet.name : "?" });
  }
  return t("{mission} → {system} Orbit {orbit}", {
    mission: missionLabel(befehl.missionsart) || t("Auftrag"),
    system: systemName(state.galaxie.seed, befehl.zielSystem),
    orbit: befehl.zielOrbit,
  });
}

export { systemErreichbar };
