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
  PIRATEN_NAMEN,
  SCHIRM_MINDESTVERSORGUNG,
  REST_BAGATELLE_SKALIERT,
  ANTIMATERIE_ERNTE,
  BEVOELKERUNG,
  SUPERNOVA,
  jahreInMs,
  bevoelkerungsSchrittFaktor,
  ARBEITSKRAFT_LEERLAUF,

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
  bevoelkerungsWachstumsrate,
  pufferGrenzeStunden,
  verarbeitungsReserveFuer,
  reaktorBitNachziehen,
  fossilVorratNachziehen,
  brennstoffReichweiteMs,
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
  forschungsQueueVon,
  forschungsWarteschlangeVon,
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
  logistiknetzFreigeschaltet,
  wirtschaftsPlaneten,
  planetenVon,
  flottenVon,
  fraktionVon,
  herkunftVon,
  fraktionById,
  fraktionArt,
  flotteById,
  fraktionGrenze,
  neueFraktion,
  beziehungHandlung,
  beziehungAendern,
  beziehungZu,
  arbeitskraftDiebstahlAnteil,
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
  flotteSiedlerKapazitaet,
  ladungGesamt,
  flotteLeer,
  schiffeGesamt,
  schiffeStaerke,
  schiffeText,
} from "./flotten.js";
import { findeObjekt, setzeOrbitZustand, holeSystem, objektGesperrt, restLiegtAn } from "./systeme.js";
import { stromFuer, waehle } from "./zufall.js";
import {
  reichenAus,
  fehlende,
  abziehen,
  hinzufuegen,
  lagerHinzufuegen,
  skalieren,
  buendelText,
  formatZahl as fmt,
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
  // A-012: "bezahlbar ab" haengt am BESTAND und damit an genau denselben
  // Aenderungen wie die Puffergrenze. Beide Merker fallen zusammen -- ein
  // zweiter Invalidierungspfad waere eine zweite Gelegenheit, ihn zu
  // vergessen (der neunte Fehlertyp, ausdrueckliche Falle in diesem Auftrag).
  planet.bezahlbarMerker = undefined;
  // A-035: derselbe eine Weg meldet den Planeten auch dem Ereignisplan --
  // die ausdrueckliche Falle dieses Auftrags war, hier einen ZWEITEN
  // Invalidierungspfad zu erfinden. Der Plan liest beim naechsten Nachsehen
  // alle fuenf Quellen dieses Planeten neu, ueber dieselben Merker.
  const plan = planVonPlanet.get(planet);
  if (plan) plan.dirtyPlaneten.add(planet);
}

// Wann kann der wartende Kopf einer Warteschlange bezahlt werden? (A-012)
//
// Gerechnet aus den AKTUELLEN Nettoraten: je fehlender Ressource
// (Kosten − Bestand) / Rate, und davon die spaeteste. Faellt eine benoetigte
// Ressource nicht an (Rate ≤ 0), gibt es keinen Zeitpunkt -- , und der
// Auftrag wartet ohne Ereignis. Das ist die ehrliche Antwort und zugleich der
// Schutz vor einer Ereignis-Endlosschleife: kein Zeitpunkt, kein Ereignis.
//
// Der Wert ist gemerkt wie die Puffergrenze und wird mit ihr verworfen.
function bezahlbarZeitpunkt(state, planet) {
  if (planet.bezahlbarMerker !== undefined) return planet.bezahlbarMerker;
  let spaeteste = null;
  for (const art of ["bau", "werft"]) {
    const kopf = wartenderKopf(planet, art);
    if (!kopf) continue;
    const kosten = kopfKosten(planet, kopf, art);
    const { lager } = effektiveRaten(state, planet);
    let dieser = planetLetzterTick(state, planet);
    let moeglich = true;
    for (const [resId, betrag] of Object.entries(kosten)) {
      const fehlt = betrag - (planet.ressourcen[resId] || 0);
      if (fehlt <= 0) continue;
      const rate = lager[resId] || 0;
      if (rate <= 0) { moeglich = false; break; }
      // AUFRUNDEN UND EINE MILLISEKUNDE DRAUF. Der exakt gerechnete Zeitpunkt
      // ist der, an dem der Bestand die Kosten GERADE erreicht -- und in
      // Fliesskomma heisst das regelmaessig: eine Winzigkeit darunter. Das
      // Ereignis feuerte dann, konnte nicht zahlen, plante sich neu auf
      // denselben Moment und drehte im Kreis (gemessen: ein 12-h-Sprung kam
      // nie an, waehrend dieselbe Spanne in 400 Schritten sauber durchlief).
      // Das ist derselbe Kruemel-Fehlertyp wie in A-042, nur an anderer
      // Stelle -- und hier ist er billig zu vermeiden.
      dieser = Math.max(dieser, planetLetzterTick(state, planet) + Math.ceil((fehlt / rate) * MS_PRO_STUNDE) + 1);
    }
    if (!moeglich) continue;
    // Die FRUEHESTE der beiden Warteschlangen gewinnt -- sie ist das naechste
    // Ereignis. Die andere kommt beim naechsten Durchlauf dran.
    if (spaeteste === null || dieser < spaeteste) spaeteste = dieser;
  }
  planet.bezahlbarMerker = spaeteste;
  return planet.bezahlbarMerker;
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
    // Das Zünd-Bit des Reaktors (A-055) wandert NUR hier: nach dem
    // Fortschreiben, aus dem frischen Bestand. Die Schwellen sind
    // Ereignis-Zeitpunkte (pufferGrenzeStunden), deshalb kippt das Bit in
    // einem großen Sprung an denselben Stellen wie in vielen kleinen.
    reaktorBitNachziehen(planet);
    // Derselbe Platz, derselbe Grund, zweite Brennstoff-Art (A-147): der
    // fossile Vorrat zieht NUR hier nach, mit der bereits auf die nächste
    // Ereignisgrenze geschnittenen Spanne.
    fossilVorratNachziehen(planet, stunden);
  }
}

// Verderb (A-010): exponentieller Zerfall des BESTANDS, angewandt beim
// Fortschreiben -- nicht in der Ratenrechnung.
//
// WARUM NICHT IN rohRaten: eine Rate, die vom Bestand abhängt, macht den
// gemerkten Puffergrenzen-Zeitpunkt ab der ersten Sekunde falsch. Genau daran
// ist der erste Versuch gescheitert (`tests/planetenuhr.test.js` hat ihn
// gekippt), und es ist derselbe Fehlertyp wie der Zeit-Klassiker: ein Wert
// wird einmal gerechnet und gilt dann für eine Spanne, in der er sich ändert.
//
// DIE FORM IST DIE EXAKTE LÖSUNG, nicht eine Näherung. Für einen Bestand S
// mit konstantem Zufluss P und Zerfallsrate λ gilt
//
//     S(t) = S₀·e^(−λt) + P·(1 − e^(−λt))/λ
//
// Deshalb zerfällt hier NICHT nur der Altbestand, sondern der Zuwachs der
// Spanne wird mit demselben Faktor gewichtet: was in der Mitte der Spanne
// geerntet wurde, verdirbt nur die halbe Spanne lang. Nur so kommt ein
// 24-Stunden-Sprung auf denselben Wert wie 86.400 Einzelsekunden -- und genau
// das ist die Zusicherung, auf der die ganze Aufholung steht.
//
// Der Faktor erreicht nie null: e^(−λt) > 0 für jedes endliche t. Ein Vorrat
// wird also beliebig klein, aber nie leer. Das ist gewollt (Prinzip 7: der
// Zustand null darf entstehen, aber nicht aus Zauberei).
function verderbFaktor(resId, stunden) {
  const lambda = RESSOURCEN[resId] && RESSOURCEN[resId].verderb;
  if (!lambda || stunden <= 0) return null;
  const rest = Math.exp(-lambda * stunden);
  return {
    // Anteil des Altbestands, der die Spanne übersteht.
    bestand: rest,
    // Anteil des in der Spanne Erwirtschafteten, der sie übersteht.
    // Grenzwert 1 für t→0, also stetig -- ein Ereignis, das die Spanne
    // zerteilt, ändert das Ergebnis nicht.
    zuwachs: (1 - rest) / (lambda * stunden),
  };
}

// A-155: welche Bande bekommt gestohlene Fracht ab? Dieselbe Nähe-Messung
// wie piratenZielsystem (Systemdistanz über entfernung), aber die NÄCHSTE
// LEBENDE Bande statt der am besten geeigneten neuen -- die Beute geht an
// eine bestehende Gruppe, keine Gründung.
function piratenNaechsteBande(state, systemId) {
  let beste = null;
  let besteEntfernung = Infinity;
  for (const fraktion of Object.values(state.fraktionen)) {
    if (fraktion.art !== "pirat") continue;
    const basis = planetById(state, fraktion.basisPlanet);
    if (!basis) continue; // Splitter unterwegs -- noch keine Basis (piratenSchritt)
    const d = entfernung(state.galaxie.seed, systemId, basis.systemId);
    if (d < besteEntfernung) {
      besteEntfernung = d;
      beste = basis;
    }
  }
  return beste && besteEntfernung <= PIRAT.diebstahlReichweite ? beste : null;
}

function planetRatenAnwenden(state, planet, stunden) {
  {
    const { lager, fluss, produktion, verbrauch } = effektiveRaten(state, planet);

    // A-155 (Arbeitskraft-Leerlauf): dieselbe Beschäftigungsquote wie die
    // Kachel (state.js, planetUebersicht), aus denselben Rohwerten. Über die
    // GANZE Spanne `stunden` konstant -- zwischen zwei Ereignissen ändert
    // sich weder die Bevölkerung (eigenes "wachstum"-Ereignis) noch eine
    // Anlagenstufe (eigenes "bau"/"werft"-Ereignis), also auch nicht die
    // Quote. Genau darauf beruht schon jede andere Rate in dieser Funktion --
    // die Bekannte Falle "als Ereignis schneiden, nicht als stetige Größe"
    // ist damit erfüllt, ohne einen zweiten Ereignistyp zu brauchen.
    const verfuegbareArbeitskraft = produktion.arbeitskraft || 0;
    const gebundeneArbeitskraft = verbrauch.arbeitskraft || 0;
    const beschaeftigungsquote =
      verfuegbareArbeitskraft > 0 ? gebundeneArbeitskraft / verfuegbareArbeitskraft : 1;
    const diebstahlAnteil = arbeitskraftDiebstahlAnteil(beschaeftigungsquote);

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
    // A-155: was der Leerlauf stiehlt, je Ressource -- gesammelt statt sofort
    // verrechnet, weil die Nutznießerin (die nächste Bande) erst nach dieser
    // Schleife feststeht.
    const gestohlen = {};
    for (const [resId, proStunde] of Object.entries(lager)) {
      const verderb = verderbFaktor(resId, stunden);
      // Erst den Altbestand zerfallen lassen, dann die Rate anwenden -- die
      // Reihenfolge ist Teil der exakten Lösung oben, nicht Geschmack.
      if (verderb) {
        const alt = planet.ressourcen[resId] || 0;
        if (alt > 0) planet.ressourcen[resId] = alt * verderb.bestand;
      }
      const menge = proStunde * stunden * (verderb ? verderb.zuwachs : 1);
      if (menge >= 0) {
        // A-155: "Ein Anteil der laufenden Förderung verschwindet" (Tobi,
        // 16.08.) -- genau dieser eine Anteil an genau dieser einen Menge,
        // keine zweite Rechnung (B3). Nichts zu drosseln heißt nichts zu
        // stehlen: eine Welt ohne Produktion bleibt unberührt.
        const anteil = diebstahlAnteil * menge;
        zuwachs[resId] = menge - anteil;
        if (anteil > 0) gestohlen[resId] = anteil;
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

    // A-155: "Die Piraten in der Nähe werden stärker" ist keine zweite
    // Mechanik, sondern dieselbe Beute am anderen Ende -- was hier
    // verschwindet, kommt (sofern eine Bande in Reichweite lebt) dort an.
    // Gibt es keine, verschwindet es ersatzlos; das ist immer noch "gestohlen".
    if (Object.keys(gestohlen).length > 0) {
      const bande = piratenNaechsteBande(state, planet.systemId);
      if (bande) hinzufuegen(bande.ressourcen, gestohlen);
      // Ab 30 % Beschäftigung MUSS es der Spieler in den Meldungen sehen
      // (Tobis Wortlaut, 25.08.). Gruppiert über `gruppe` (A-083): dieselbe
      // Welt zählt hoch, statt das Logbuch zu fluten.
      if (beschaeftigungsquote < ARBEITSKRAFT_LEERLAUF.kritischAb) {
        meldungHinzufuegen(
          state,
          t("{planet}: nur {quote} % Beschäftigung – Arbeitskraft-Leerlauf stiehlt Ressourcen und stärkt Piraten in der Nähe.", {
            planet: planet.name,
            quote: Math.round(beschaeftigungsquote * 100),
          }),
          `leerlauf-${planet.id}`,
          herkunftVon(planet)
        );
      }
    }
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
//
// SEIT A-035 IST DIESE FUNKTION DIE REFERENZ, nicht mehr der Normalweg: die
// Auswahl läuft im Spiel über den Ereignisplan (Vorrangwarteschlange, siehe
// unten). Diese Linearsuche bleibt als unabhängige zweite Wahrheit erhalten --
// der Prüfmodus (ENTROPY_PRUEFMODUS=1) lässt beide parallel laufen und wirft
// bei der ersten Abweichung. Sie ist die Wahrheit, der Plan die
// Beschleunigung. Wer hier eine Ereignisquelle ändert oder ergänzt, muss sie
// im Ereignisplan mitziehen (Suchreihenfolge = Rangordnung des Plans).
function ereignisAuswahlLinear(state) {
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
    //  heisst: der Kopf wartet noch auf Material (A-012).
    // Ein Ereignis hat er dann nicht -- seines ist "bezahlbar" weiter unten.
    if (planet.bauQueue && planet.bauQueue.fertigZeit !== null) {
      pruefe(planet.bauQueue.fertigZeit, "bau", planet);
    }
    if (planet.werftQueue && planet.werftQueue.fertigZeit !== null) {
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
    // Wartet vorn ein Auftrag auf Material? Dann ist der Moment, in dem er
    // bezahlbar wird, ein Ereignis wie jedes andere (A-012).
    if (planet.bauQueue || planet.werftQueue) {
      const bezahlbar =
        planet.bezahlbarMerker !== undefined ? planet.bezahlbarMerker : bezahlbarZeitpunkt(state, planet);
      if (bezahlbar !== null) pruefe(bezahlbar, "bezahlbar", planet);
    }
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
    // A-094: Eine Route, die auf Beladung wartet, liegt still im Hafen -- sie
    // hat weder Abschnitt noch Gefecht und käme ohne diesen Zweig NIE wieder
    // an die Reihe. Der Takt ist grob (siehe ROUTE_WARTE_TAKT): gewartet wird
    // auf Produktion, und die braucht Stunden, keine Sekunden.
    if (flotte.route && flotte.route.aktiv && flotte.route.wartetAb != null) {
      pruefe(flotte.route.wartetAb, "routewartet", flotte);
    }
  }
  for (const transfer of state.logistikTransfers) {
    pruefe(transfer.ankunftZeit, "transfer", transfer);
  }
  if (besteArt === null) return null;
  return { zeit: besteZeit, art: besteArt, ent: besteEntitaet };
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
    case "bezahlbar":
      // Der wartende Kopf zahlt und startet -- mit der EREIGNISZEIT, nicht der
      // Wanduhr (der Zeit-Fehlertyp, ausdrueckliche Falle in A-012).
      return { zeit, ausfuehren: (t) => kopfPruefen(state, entitaet, t), planeten: [entitaet] };
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
    // Die wartende Route rührt genau ihren Ladehafen an -- sie versucht dort
    // nachzuladen und fährt ab, sobald es reicht.
    case "routewartet": {
      const hafen = entitaet.dockPlanet ? planetById(state, entitaet.dockPlanet) : null;
      return {
        zeit,
        ausfuehren: (t) => routeWartenPruefen(state, entitaet, t),
        planeten: hafen ? [hafen] : null,
      };
    }
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

// --- Ereignisplan (A-035): Vorrangwarteschlange statt Linearsuche ----------
//
// Die Linearsuche oben fragt bei JEDEM Ereignis jeden Planeten, jede Fraktion
// und jede Flotte nach ihrem nächsten Zeitpunkt -- gemessen (2026-08-18,
// volle Galaxie, 8 h Aufholung) sind das 29 % der gesamten Rechenzeit, nur
// für das Durchgehen der Kandidaten. Der Plan merkt sich stattdessen alle
// gemeldeten Zeitpunkte in einem Min-Heap; ein Ereignis kostet dann ein
// Nachsehen an der Spitze statt eines Laufs über die Welt.
//
// DIE REIHENFOLGE IST NICHT VERHANDELBAR: gleiche Saat, exakt gleiche
// Ereignis-Reihenfolge wie die Linearsuche. Dafür trägt jeder Eintrag neben
// der Zeit einen Rang, der die Suchreihenfolge der Referenz nachbildet:
// erst die Gruppe (Planeten vor Forschung vor Supernova vor Banden vor
// Fraktionen vor Flotten vor Transfers), darin die Entität in Erzeugungs-
// reihenfolge (= Array-Reihenfolge: es wird nur angehängt und gefiltert, nie
// sortiert), darin die Quelle in Prüfreihenfolge (bau vor werft vor puffer
// vor bezahlbar vor wachstum; ankunft vor gefecht). Bei Zeitgleichstand
// gewinnt so derselbe Kandidat wie beim strikten Vergleich der Referenz.
//
// INVALIDIERUNG, der schwere Teil -- drei Wege, alle faul:
//   1. Planeten melden sich über planetGeaendert (dieselbe eine Regel, an
//      der schon die gemerkte Puffergrenze hängt -- Prinzip 5: der Weg wird
//      verallgemeinert, nicht dupliziert). Der Plan rechnet ihre fünf
//      Quellen beim nächsten Nachsehen neu, über DIESELBEN Merker wie die
//      Referenz -- deshalb können beide gar nicht verschieden rechnen.
//   2. Quellen, die sich nur NACH VORNE bewegen (ein Schritt plant den
//      nächsten), heilen sich selbst: der veraltete Eintrag steigt an die
//      Spitze, passt nicht mehr zur Quelle und wird durch den aktuellen
//      Wert ersetzt. Dafür braucht es keinen einzigen Melde-Aufruf.
//   3. Neue Quellen (Flotte bricht auf, Gefecht beginnt, Fraktion oder
//      Planet entsteht, Transfer startet) und Entfernungen melden die
//      wenigen Erzeuger-/Entferner-Stellen ausdrücklich.
// Forschung, Supernova und Bandenprüfung bleiben AUSSERHALB des Heaps und
// werden je Abfrage frisch gelesen wie in der Referenz: es sind einzelne
// Feldzugriffe (die Forschungsprojektion rechnet über die Spielerplaneten,
// wie bisher auch) -- ein Cache dafür wäre eine zweite Wahrheit mit eigenen
// Invalidierungswegen, für Quellen, die zusammen O(1) je Abfrage kosten.
//
// Der Plan ist ABGELEITETER Zustand: er hängt in einer WeakMap am
// State-Objekt, wird nie gespeichert und beim ersten Nachsehen aus dem
// vollen Bestand aufgebaut (Laden/Testmodus/Klone bekommen so automatisch
// einen frischen). Testwelten, die Planeten oder Flotten von Hand in die
// Arrays schieben, fängt der Zahlenabgleich in planVon; von Hand angelegte
// FRAKTIONEN sieht nur der Neuaufbau -- wer nach dem ersten Vorspulen noch
// welche einsetzt, muss durch die Erzeuger-Funktionen gehen.

// Betriebsart: "plan" ist der Normalfall. "linear" erzwingt die Referenz
// (für Vorher/Nachher-Messungen), "beide" lässt beide laufen und wirft bei
// der ERSTEN Abweichung -- der Äquivalenz-Nachweis aus A-035:
// `ENTROPY_PRUEFMODUS=1 npm test` und ein Weltlauf im Prüfmodus.
// Der process-Wächter hält die Spiellogik browserrein (Prinzip: kein
// Browser-API, aber auch kein Node-Zwang).
let EREIGNISSUCHE = (() => {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  if (env.ENTROPY_PRUEFMODUS === "1") return "beide";
  if (env.ENTROPY_EREIGNISSUCHE === "linear" || env.ENTROPY_EREIGNISSUCHE === "beide") return env.ENTROPY_EREIGNISSUCHE;
  return "plan";
})();

// NUR für Tests und Messwerkzeuge -- das Spiel schaltet nie um.
export function ereignisSucheSetzen(modus) {
  EREIGNISSUCHE = modus;
}

// Rang-Gruppen = Suchreihenfolge der Referenz. Die Lücken gibt es nicht:
// jede Gruppe entspricht einem Block der Linearsuche.
const GR_PLANET = 0;
const GR_FORSCHUNG = 1;
const GR_SUPERNOVA = 2;
const GR_BANDEN = 3;
const GR_FRAKTION = 4;
const GR_FLOTTE = 5;
const GR_TRANSFER = 6;

// Ein Eintrag ist vor einem anderen dran, wenn sein Tupel (zeit, gruppe,
// entitaet, quelle) lexikographisch kleiner ist -- exakt das "erster
// Kandidat einer Zeit gewinnt" der Referenz.
function eintragVor(a, b) {
  if (a.zeit !== b.zeit) return a.zeit < b.zeit;
  if (a.g !== b.g) return a.g < b.g;
  if (a.s !== b.s) return a.s < b.s;
  return a.a < b.a;
}

// INDIZIERTER Heap: jeder Eintrag kennt seine Position (`idx`). Das erlaubt,
// einen ERSETZTEN Eintrag sofort zu entfernen, statt ihn als Leiche liegen zu
// lassen. Ohne das wüchse der Heap im Sekundentakt des Spiels unbegrenzt:
// das Vorspulen rückt am Ende jedes Aufrufs ALLE Planeten vor, die
// Puffergrenze verschiebt sich dabei rechnerisch nicht, in Fließkomma aber
// um Krümel -- je Planet und Sekunde ein neuer Eintrag, dessen Vorgänger
// erst Stunden später an der Spitze abstürbe.
function heapTausche(heap, i, j) {
  const merk = heap[i];
  heap[i] = heap[j];
  heap[j] = merk;
  heap[i].idx = i;
  heap[j].idx = j;
}

function heapAufsteigen(heap, i) {
  while (i > 0) {
    const eltern = (i - 1) >> 1;
    if (!eintragVor(heap[i], heap[eltern])) break;
    heapTausche(heap, i, eltern);
    i = eltern;
  }
}

function heapAbsinken(heap, i) {
  for (;;) {
    const links = 2 * i + 1;
    const rechts = links + 1;
    let kleinster = i;
    if (links < heap.length && eintragVor(heap[links], heap[kleinster])) kleinster = links;
    if (rechts < heap.length && eintragVor(heap[rechts], heap[kleinster])) kleinster = rechts;
    if (kleinster === i) return;
    heapTausche(heap, i, kleinster);
    i = kleinster;
  }
}

function heapEinfuegen(heap, e) {
  e.idx = heap.length;
  heap.push(e);
  heapAufsteigen(heap, e.idx);
}

function heapEntnehmen(heap) {
  const spitze = heap[0];
  const letzter = heap.pop();
  if (heap.length && letzter !== spitze) {
    heap[0] = letzter;
    letzter.idx = 0;
    heapAbsinken(heap, 0);
  }
  return spitze;
}

// Entfernt einen Eintrag an beliebiger Position. Der nachgerückte letzte
// Eintrag kann in BEIDE Richtungen falsch stehen -- erst sinken lassen, dann
// steigen (höchstens eine der beiden Schleifen bewegt ihn).
function heapEntfernen(heap, e) {
  const i = e.idx;
  if (heap[i] !== e) return;
  const letzter = heap.pop();
  if (letzter !== e) {
    heap[i] = letzter;
    letzter.idx = i;
    heapAbsinken(heap, i);
    heapAufsteigen(heap, letzter.idx);
  }
}

// Plan je Spielstand. WeakMap statt Feld am State: der Plan darf NIE in einen
// Spielstand serialisiert werden, und ein geladener/geklonter State soll
// automatisch frisch aufbauen.
const plaene = new WeakMap();
// planetGeaendert kennt den State nicht -- der Rückweg läuft über den
// Planeten selbst. Ein Planet gehört immer genau einem State.
const planVonPlanet = new WeakMap();

function neuerPlan() {
  return {
    heap: [],
    // Je Entität ein Merkzettel: der lebende Heap-Eintrag je Quelle (null =
    // keiner). Ein Eintrag ist nur gültig, wenn der Merkzettel noch auf IHN
    // zeigt UND die echte Quelle seine Zeit bestätigt -- alles andere wird
    // an der Spitze verworfen oder ersetzt.
    planeten: new WeakMap(),
    flotten: new WeakMap(),
    fraktionen: new WeakMap(),
    transfers: new WeakMap(),
    seqPlanet: 0,
    seqFlotte: 0,
    seqFraktion: 0,
    seqTransfer: 0,
    // Erwartete Array-Längen -- der billige Wächter gegen Testwelten, die an
    // den Erzeuger-Funktionen vorbei direkt in die Arrays schieben.
    planetenZahl: 0,
    flottenZahl: 0,
    transferZahl: 0,
    dirtyPlaneten: new Set(),
    dirtyFlotten: new Set(),
    dirtyFraktionen: new Set(),
    dirtyTransfers: new Set(),
    entfernt: new WeakSet(),
  };
}

function planPlanetRec(plan, planet) {
  let rec = plan.planeten.get(planet);
  if (!rec) {
    rec = { seq: plan.seqPlanet++, bau: null, werft: null, puffer: null, bezahlbar: null, wachstum: null };
    plan.planeten.set(planet, rec);
    planVonPlanet.set(planet, plan);
    plan.planetenZahl++;
  }
  return rec;
}

function planFlotteRec(plan, flotte) {
  let rec = plan.flotten.get(flotte);
  if (!rec) {
    rec = { seq: plan.seqFlotte++, ankunft: null, gefecht: null, routewartet: null };
    plan.flotten.set(flotte, rec);
    plan.flottenZahl++;
  }
  return rec;
}

function planFraktionRec(plan, fraktion) {
  let rec = plan.fraktionen.get(fraktion);
  if (!rec) {
    rec = { seq: plan.seqFraktion++, schritt: null };
    plan.fraktionen.set(fraktion, rec);
  }
  return rec;
}

function planTransferRec(plan, transfer) {
  let rec = plan.transfers.get(transfer);
  if (!rec) {
    rec = { seq: plan.seqTransfer++, ankunft: null };
    plan.transfers.set(transfer, rec);
    plan.transferZahl++;
  }
  return rec;
}

// Voller Aufbau aus dem Bestand -- einmal je State, in der Reihenfolge der
// Referenz-Suche, damit die Ränge die Array-Reihenfolge tragen.
function planAufbauen(state) {
  const plan = neuerPlan();
  for (const planet of state.planeten) {
    planPlanetRec(plan, planet);
    plan.dirtyPlaneten.add(planet);
  }
  const fraktionen = state.fraktionen || {};
  for (const id in fraktionen) {
    planFraktionRec(plan, fraktionen[id]);
    plan.dirtyFraktionen.add(fraktionen[id]);
  }
  for (const flotte of state.flotten) {
    planFlotteRec(plan, flotte);
    plan.dirtyFlotten.add(flotte);
  }
  for (const transfer of state.logistikTransfers) {
    planTransferRec(plan, transfer);
    plan.dirtyTransfers.add(transfer);
  }
  return plan;
}

function planVon(state) {
  let plan = plaene.get(state);
  if (!plan) {
    plan = planAufbauen(state);
    plaene.set(state, plan);
    return plan;
  }
  // Direkteingriffe abfangen: Testwelten schieben Planeten (und theoretisch
  // Flotten/Transfers) direkt in die Arrays. Stimmt die Länge nicht mehr,
  // werden Unbekannte nachregistriert -- sie hängen am Ende, ihre Ränge
  // stimmen damit weiter mit der Array-Reihenfolge überein.
  if (plan.planetenZahl !== state.planeten.length) {
    for (const planet of state.planeten) {
      if (!plan.planeten.has(planet)) {
        planPlanetRec(plan, planet);
        plan.dirtyPlaneten.add(planet);
      }
    }
    plan.planetenZahl = state.planeten.length;
  }
  if (plan.flottenZahl !== state.flotten.length) {
    for (const flotte of state.flotten) {
      if (!plan.flotten.has(flotte)) {
        planFlotteRec(plan, flotte);
        plan.dirtyFlotten.add(flotte);
      }
    }
    plan.flottenZahl = state.flotten.length;
  }
  if (plan.transferZahl !== state.logistikTransfers.length) {
    for (const transfer of state.logistikTransfers) {
      if (!plan.transfers.has(transfer)) {
        planTransferRec(plan, transfer);
        plan.dirtyTransfers.add(transfer);
      }
    }
    plan.transferZahl = state.logistikTransfers.length;
  }
  return plan;
}

// Aktueller Zeitpunkt einer Quelle -- null heißt "diese Quelle hat gerade
// kein Ereignis". Die Bedingungen sind ZEICHENGLEICH mit der Referenz-Suche,
// inklusive der faulen Merker: puffer und bezahlbar laufen über dieselben
// Funktionen und damit über dieselben gemerkten Werte wie dort.
function planQuellenZeit(state, art, ent) {
  switch (art) {
    case "bau":
      return ent.bauQueue && ent.bauQueue.fertigZeit !== null ? ent.bauQueue.fertigZeit : null;
    case "werft":
      return ent.werftQueue && ent.werftQueue.fertigZeit !== null ? ent.werftQueue.fertigZeit : null;
    case "puffer":
      return pufferGrenzeZeitpunkt(state, ent);
    case "bezahlbar":
      return ent.bauQueue || ent.werftQueue ? bezahlbarZeitpunkt(state, ent) : null;
    case "wachstum":
      return ent.naechstesWachstum || null;
    case "fraktion":
      return ent.naechsterSchritt && VERHALTEN[fraktionArt(ent).verhalten] ? ent.naechsterSchritt : null;
    case "ankunft":
      return ent.abschnitt ? ent.abschnitt.ankunftZeit : null;
    case "gefecht":
      return ent.gefecht ? ent.gefecht.naechsteRundeZeit : null;
    case "routewartet":
      return ent.route && ent.route.aktiv && ent.route.wartetAb != null ? ent.route.wartetAb : null;
    case "transfer":
      return ent.ankunftZeit;
    default:
      return null;
  }
}

function planRecUndFeld(plan, e) {
  switch (e.g) {
    case GR_PLANET:
      return [plan.planeten.get(e.ent), e.art];
    case GR_FRAKTION:
      return [plan.fraktionen.get(e.ent), "schritt"];
    case GR_FLOTTE:
      return [plan.flotten.get(e.ent), e.art];
    case GR_TRANSFER:
      return [plan.transfers.get(e.ent), "ankunft"];
    default:
      return [null, null];
  }
}

// Lebt die Entität noch? Fraktionen hängen in einem Objekt -- der Griff über
// die Id ist billig und erkennt auch wiederverwendete Ids (das Objekt muss
// DASSELBE sein). Der Rest läuft über die Entfernt-Markierung der wenigen
// Entferner-Stellen.
function planEntitaetLebt(state, plan, e) {
  if (e.g === GR_FRAKTION) return !!state.fraktionen && state.fraktionen[e.ent.id] === e.ent;
  return !plan.entfernt.has(e.ent);
}

// Ein Merkzettel-Feld hält den LEBENDEN Heap-Eintrag seiner Quelle (oder
// null). Ändert sich der Zeitpunkt, wird der alte Eintrag sofort aus dem
// Heap genommen -- deshalb gibt es zu jeder Quelle höchstens einen Eintrag,
// und der Heap ist nie größer als die Zahl der aktiven Quellen.
function planQuelleSetzen(plan, rec, feld, g, a, art, ent, zeit) {
  const alt = rec[feld];
  if (alt === null ? zeit === null : alt.zeit === zeit) return;
  if (alt !== null) heapEntfernen(plan.heap, alt);
  if (zeit === null) {
    rec[feld] = null;
    return;
  }
  const e = { zeit, g, s: rec.seq, a, art, ent, idx: 0 };
  heapEinfuegen(plan.heap, e);
  rec[feld] = e;
}

// Arbeitet die gemeldeten Änderungen ab: je schmutziger Entität die Quellen
// neu lesen und geänderte Zeitpunkte einreihen. Das ist das Gegenstück zum
// Merker-Verwerfen der Referenz -- gleiche Menge, gleiche Rechnungen, nur
// dass das Ergebnis im Heap landet statt bei jedem Ereignis neu gesucht zu
// werden.
function planDirtyAbarbeiten(state, plan) {
  if (plan.dirtyPlaneten.size) {
    for (const planet of plan.dirtyPlaneten) {
      if (plan.entfernt.has(planet)) continue;
      const rec = planPlanetRec(plan, planet);
      planQuelleSetzen(plan, rec, "bau", GR_PLANET, 0, "bau", planet, planQuellenZeit(state, "bau", planet));
      planQuelleSetzen(plan, rec, "werft", GR_PLANET, 1, "werft", planet, planQuellenZeit(state, "werft", planet));
      planQuelleSetzen(plan, rec, "puffer", GR_PLANET, 2, "puffer", planet, planQuellenZeit(state, "puffer", planet));
      planQuelleSetzen(plan, rec, "bezahlbar", GR_PLANET, 3, "bezahlbar", planet, planQuellenZeit(state, "bezahlbar", planet));
      planQuelleSetzen(plan, rec, "wachstum", GR_PLANET, 4, "wachstum", planet, planQuellenZeit(state, "wachstum", planet));
    }
    plan.dirtyPlaneten.clear();
  }
  if (plan.dirtyFraktionen.size) {
    for (const fraktion of plan.dirtyFraktionen) {
      if (!state.fraktionen || state.fraktionen[fraktion.id] !== fraktion) continue;
      const rec = planFraktionRec(plan, fraktion);
      planQuelleSetzen(plan, rec, "schritt", GR_FRAKTION, 0, "fraktion", fraktion, planQuellenZeit(state, "fraktion", fraktion));
    }
    plan.dirtyFraktionen.clear();
  }
  if (plan.dirtyFlotten.size) {
    for (const flotte of plan.dirtyFlotten) {
      if (plan.entfernt.has(flotte)) continue;
      const rec = planFlotteRec(plan, flotte);
      planQuelleSetzen(plan, rec, "ankunft", GR_FLOTTE, 0, "ankunft", flotte, planQuellenZeit(state, "ankunft", flotte));
      planQuelleSetzen(plan, rec, "gefecht", GR_FLOTTE, 1, "gefecht", flotte, planQuellenZeit(state, "gefecht", flotte));
      // A-094, dritte Quelle einer Flotte. Sie fehlte hier zuerst, und der
      // Fehler war unsichtbar: Der Ereignisplan (A-035) und die lineare Suche
      // darüber sind ZWEI Antworten auf "wann ist diese Flotte wieder dran",
      // und in Betrieb ist der Plan. Eine Route wartete damit für immer --
      // gefunden hat es der Test, der auf die ANKUNFT der Ladung misst.
      planQuelleSetzen(plan, rec, "routewartet", GR_FLOTTE, 2, "routewartet", flotte, planQuellenZeit(state, "routewartet", flotte));
    }
    plan.dirtyFlotten.clear();
  }
  if (plan.dirtyTransfers.size) {
    for (const transfer of plan.dirtyTransfers) {
      if (plan.entfernt.has(transfer)) continue;
      const rec = planTransferRec(plan, transfer);
      planQuelleSetzen(plan, rec, "ankunft", GR_TRANSFER, 0, "transfer", transfer, planQuellenZeit(state, "transfer", transfer));
    }
    plan.dirtyTransfers.clear();
  }
}

// Die gültige Spitze des Heaps -- NACHSEHEN, nicht entnehmen: die Vorspul-
// Schleifen fragen nach dem nächsten Ereignis und führen es erst aus, wenn
// es vor "jetzt" liegt. Veraltete Einträge werden hier entsorgt; bewegt sich
// eine Quelle ohne Meldung (die selbstheilenden Fälle: ein Schritt plant den
// nächsten), wird ihr aktueller Wert nachgereiht.
function planSpitze(state, plan) {
  for (;;) {
    const e = plan.heap[0];
    if (!e) return null;
    const [rec, feld] = planRecUndFeld(plan, e);
    if (rec && rec[feld] === e && planEntitaetLebt(state, plan, e)) {
      const zeit = planQuellenZeit(state, e.art, e.ent);
      if (zeit === e.zeit) return e;
      // Selbstheilung: die Quelle hat sich ohne Meldung bewegt (ein Schritt
      // plant den nächsten). Eintrag durch den aktuellen Wert ersetzen.
      heapEntnehmen(plan.heap);
      rec[feld] = null;
      if (zeit !== null) {
        const neu = { zeit, g: e.g, s: e.s, a: e.a, art: e.art, ent: e.ent, idx: 0 };
        heapEinfuegen(plan.heap, neu);
        rec[feld] = neu;
      }
      continue;
    }
    // Entität weg oder der Eintrag wurde längst ersetzt: Müll von gestern.
    heapEntnehmen(plan.heap);
    if (rec && rec[feld] === e) rec[feld] = null;
  }
}

// Die Plan-Auswahl: Heap-Spitze gegen die frisch gelesenen Einzelquellen
// (Forschung, Supernova, Banden) -- Bedingungen und Reihenfolge wie in der
// Referenz, der Tupel-Vergleich erledigt den Gleichstand.
function ereignisAuswahlPlan(state) {
  const plan = planVon(state);
  planDirtyAbarbeiten(state, plan);
  const spitze = planSpitze(state, plan);
  let zeit = 0;
  let g = 0;
  let s = 0;
  let a = 0;
  let art = null;
  let ent = null;
  const nimm = (nZeit, nG, nS, nA, nArt, nEnt) => {
    if (art !== null) {
      if (nZeit > zeit) return;
      if (nZeit === zeit) {
        if (nG > g) return;
        if (nG === g && nS > s) return;
        if (nG === g && nS === s && nA >= a) return;
      }
    }
    zeit = nZeit;
    g = nG;
    s = nS;
    a = nA;
    art = nArt;
    ent = nEnt;
  };
  if (spitze) nimm(spitze.zeit, spitze.g, spitze.s, spitze.a, spitze.art, spitze.ent);
  if (state.forschungsQueue) {
    const fertig = forschungFertigProjektion(state);
    if (fertig !== null) nimm(fertig, GR_FORSCHUNG, 0, 0, "forschung", null);
  }
  const sn = state.supernova;
  if (sn) {
    if (sn.phase === "vorwarnung") nimm(sn.kollapsZeit, GR_SUPERNOVA, 0, 0, "snBlitz", null);
    else if (sn.phase === "blitz" && sn.ozonKaputt && sn.ozonZeit) nimm(sn.ozonZeit, GR_SUPERNOVA, 0, 1, "snOzon", null);
    if (sn.phase === "blitz") nimm(sn.flutZeit, GR_SUPERNOVA, 0, 2, "snFlut", null);
  }
  if (state.naechsteBandenPruefung) nimm(state.naechsteBandenPruefung, GR_BANDEN, 0, 0, "banden", null);
  return art === null ? null : { zeit, art, ent };
}

// Die Melde-Stellen. Alle sind gefahrlos, wenn (noch) kein Plan existiert --
// dann baut der erste Zugriff ohnehin aus dem vollen Bestand auf.
function planPlanetNeu(state, planet) {
  const plan = plaene.get(state);
  if (!plan) return;
  planPlanetRec(plan, planet);
  plan.dirtyPlaneten.add(planet);
}

// Räumt alle Einträge eines Merkzettels aus dem Heap -- für entfernte
// Entitäten, damit keine Geister-Ereignisse liegen bleiben.
function planQuellenRaeumen(plan, rec) {
  if (!rec) return;
  for (const feld in rec) {
    if (feld === "seq" || rec[feld] === null || typeof rec[feld] !== "object") continue;
    heapEntfernen(plan.heap, rec[feld]);
    rec[feld] = null;
  }
}

function planPlanetEntfernt(state, planet) {
  const plan = plaene.get(state);
  if (!plan) return;
  if (plan.planeten.has(planet)) plan.planetenZahl--;
  planQuellenRaeumen(plan, plan.planeten.get(planet));
  plan.entfernt.add(planet);
}

function planFlotteNeu(state, flotte) {
  const plan = plaene.get(state);
  if (!plan) return;
  planFlotteRec(plan, flotte);
}

function planFlotteGeaendert(state, flotte) {
  const plan = plaene.get(state);
  if (!plan) return;
  planFlotteRec(plan, flotte);
  plan.dirtyFlotten.add(flotte);
}

function planFlotteEntfernt(state, flotte) {
  const plan = plaene.get(state);
  if (!plan || !flotte) return;
  if (plan.flotten.has(flotte)) plan.flottenZahl--;
  planQuellenRaeumen(plan, plan.flotten.get(flotte));
  plan.entfernt.add(flotte);
}

function planFraktionNeu(state, fraktion) {
  const plan = plaene.get(state);
  if (!plan) return;
  planFraktionRec(plan, fraktion);
  plan.dirtyFraktionen.add(fraktion);
}

function planTransferNeu(state, transfer) {
  const plan = plaene.get(state);
  if (!plan) return;
  planTransferRec(plan, transfer);
  plan.dirtyTransfers.add(transfer);
}

function planTransferEntfernt(state, transfer) {
  const plan = plaene.get(state);
  if (!plan) return;
  if (plan.transfers.has(transfer)) plan.transferZahl--;
  planQuellenRaeumen(plan, plan.transfers.get(transfer));
  plan.entfernt.add(transfer);
}

// NUR für Tests: Kennzahlen des Plans dieses States. Der Heap darf nicht mit
// der Laufzeit wachsen -- tests/ereignisplan.test.js rechnet das nach.
export function ereignisplanDiagnose(state) {
  const plan = plaene.get(state);
  return plan ? { heapGroesse: plan.heap.length } : null;
}

// Der eine Einstieg für beide Vorspul-Schleifen. Baut aus der Auswahl das
// fertige Ereignis -- die Art kommt mit ans Objekt (A-042, Diagnose einer
// hängenden Aufholung).
function naechstesEreignis(state) {
  let wahl;
  if (EREIGNISSUCHE === "linear") {
    wahl = ereignisAuswahlLinear(state);
  } else if (EREIGNISSUCHE === "beide") {
    // Erst der Plan, dann die Referenz: beide rechnen über dieselben Merker,
    // die Reihenfolge der beiden Aufrufe ändert am Ergebnis nichts.
    wahl = ereignisAuswahlPlan(state);
    const referenz = ereignisAuswahlLinear(state);
    const gleich =
      wahl === null
        ? referenz === null
        : referenz !== null && wahl.zeit === referenz.zeit && wahl.art === referenz.art && wahl.ent === referenz.ent;
    if (!gleich) {
      // Entwickler-Diagnostik, kein Anzeigetext -- bewusst ohne t() und so
      // formuliert, dass der Deutsch-Scanner (tests/sprache.test.js) sie
      // nicht als vergessene Übersetzung meldet.
      const zeig = (w) =>
        w === null ? "leer" : `${w.art} @ ${w.zeit}${w.ent && w.ent.id !== undefined ? ` [${w.ent.id}]` : ""}`;
      throw new Error(`Ereignisplan-Abweichung (A-035): Plan ${zeig(wahl)} / Referenz ${zeig(referenz)}`);
    }
  } else {
    wahl = ereignisAuswahlPlan(state);
  }
  if (wahl === null) return null;
  const gebaut = ereignisBauen(state, wahl.zeit, wahl.art, wahl.ent);
  if (gebaut) gebaut.art = wahl.art;
  return gebaut;
}

// Bevölkerungsschritt: wächst bei gedeckter Versorgung und freiem Wohnraum,
// schrumpft bei Nahrungsmangel -- symmetrisch, Tobis ausdrückliche
// Entscheidung. Wie der Kampf eine bewusste Ausnahme von "verhindern statt
// bestrafen".
//
// PROPORTIONAL zum Bestand (A-117): Zuwachs/Schwund ist `menschen × f`, mit
// `f` aus `bevoelkerungsSchrittFaktor` -- keine feste Menge mehr. `f` wird
// intern NICHT gerundet (bewusste Wahl gegen die "0,7 Menschen -> 0"-Falle
// bei kleinen Welten): der Bruchteil bleibt im Bestand stehen und wächst im
// nächsten Schritt weiter mit. Angezeigt wird ohnehin immer abgerundet
// (`formatZahl`/`formatKurz` in js/ressourcen.js) -- eine Welt mit 30
// Menschen wächst also spürbar langsamer als eine mit 500.000, verschwindet
// aber nie in der Rundung.
//
// Die Prüfung liest `drosselung.nahrung` aus der Produktionsauflösung: die ist
// genau dann < 1, wenn der Bedarf den Zustrom übersteigt UND der Vorrat
// aufgebraucht ist. Solange noch Nahrung im Lager liegt, wächst die
// Bevölkerung also weiter und zehrt den Vorrat auf -- man kann sich bewusst
// übernehmen, und merkt es erst, wenn das Lager leer ist.
function bevoelkerungSchritt(state, planet, zeit) {
  // Ereigniszeit weiterreichen, nie spielzeitJetzt -- sonst driftet der
  // Rhythmus bei Offline-Aufholung und Zeitsprüngen. Das gilt auch fürs
  // proportionale Wachstum: die Aufholung ruft diese Funktion Schritt für
  // Schritt auf (ein Ereignis je `schrittMs`), nie mit vielen Takten auf
  // einmal -- ein hochmultiplizierter Schritt wäre bei proportionalem
  // Wachstum Zinseszins und würde zu schnell wachsen.
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
    // Schrumpfen ist der SYMMETRISCHE Spiegel des Wachstums: `basisRateJahr`
    // ohne Vorratsbonus, nie `bevoelkerungsWachstumsrate` -- ein Vorrat gibt
    // es hier ohnehin nicht (siehe Kommentar oben, "Vorrat aufgebraucht").
    const f = bevoelkerungsSchrittFaktor(BEVOELKERUNG.basisRateJahr);
    const neu = Math.max(0, menschen - menschen * f);
    planet.ressourcen.bevoelkerung = neu;
    meldungHinzufuegen(
      state,
      t("{planet}: Nahrung reicht nicht – die Bevölkerung schrumpft auf {menge}.", {
        planet: planet.name,
        menge: Math.round(neu),
      }),
      `hunger-${planet.id}`,
      herkunftVon(planet)
    );
    return;
  }
  if (menschen >= platz) return; // kein Wohnraum frei: Wachstum ruht still
  const f = bevoelkerungsSchrittFaktor(bevoelkerungsWachstumsrate(planet));
  planet.ressourcen.bevoelkerung = Math.min(platz, menschen + menschen * f);
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
// Startet die wiederkehrenden Ereigniszeiten eines Planeten, der WÄHREND
// eines Sprungs entsteht -- analog zu `letzterTick`, der an derselben Stelle
// gesetzt wird. Jede planetenerzeugende Stelle INNERHALB der Ereignisschleife
// ruft ihn auf (Piraten-Neugründung, Bot-Kolonisation, Kolonieschiff-
// Ankunft); die einmaligen Welt-Start-Stellen (Heimatwelt, botWeltStart)
// brauchen ihn nicht -- für sie erledigt das noch die erste
// wiederkehrendeEinplanen() unten, VOR dem allerersten Ereignis.
//
// OHNE das bekäme der Planet sein erstes Wachstumsereignis erst beim
// nächsten EXTERNEN vorspulenBisJetzt-Aufruf: planPlanetNeu registriert ihn
// beim Ereignisplan (A-035) SOFORT danach, und der liest naechstesWachstum in
// genau diesem Moment -- 0 (der Rohzustand aus neuerPlanet) gilt dort als
// "keine Quelle" (A-119).
//
// `zeit` ist immer die ÜBERGEBENE Ereigniszeit, nie spielzeitJetzt, sonst
// driftet der Rhythmus bei der Aufholung, die diesen Fehler aufgedeckt hat.
function planetUhrStarten(planet, zeit) {
  planet.naechstesWachstum = zeit + BEVOELKERUNG.schrittMs;
}

// Erstmalige Einplanung wiederkehrender Ereignisse. Bewusst hier und nicht in
// naechstesEreignis: das ist eine reine Abfrage und soll nichts verändern.
// Eigene Funktion, damit beide Vorspul-Wege sie garantiert gleich machen.
function wiederkehrendeEinplanen(state) {
  // Der Plan (A-035) existiert hier schon, wenn vorher einmal vorgespult
  // wurde -- ein frisch gesetztes Wachstum ist eine NEUE Quelle und muss
  // gemeldet werden (die Selbstheilung greift nur bei Quellen, die schon
  // einmal im Heap standen).
  const plan = plaene.get(state);
  for (const planet of state.planeten) {
    if (!planet.naechstesWachstum) {
      planet.naechstesWachstum = state.letzterTick + BEVOELKERUNG.schrittMs;
      if (plan) {
        planPlanetRec(plan, planet);
        plan.dirtyPlaneten.add(planet);
      }
    }
  }
  if (!state.naechsteBandenPruefung) state.naechsteBandenPruefung = state.letzterTick + PIRAT.gruendung.taktMs;
}

// Rückt vor, HÄLT aber nach einem Budget und sagt, wie weit es kam (A-032).
//
// WARUM DAS BUDGET DIE WANDUHR IST und nicht die Ereigniszahl: gemessen an
// einer vollen Galaxie (701 Planeten) kostet ein Ereignis 0,15 ms — bis 200
// Ereignisse je Block. Bei 400 sind es plötzlich 0,54 ms, also das
// Dreieinhalbfache. Der Grund steht in `naechstesEreignis`: ein Ereignis mit
// `planeten: null` („berührt möglicherweise alles") rückt ALLE Planeten vor.
// Ein einziges davon kostet so viel wie hunderte lokale.
//
// Damit kann keine Zählung die Blockdauer begrenzen — so wenig wie eine
// Zeitspanne. Drei Anläufe (Spanne, Spanne mit Nachführung, Ereigniszahl)
// haben das der Reihe nach gezeigt. Was begrenzt, ist die Uhr selbst: nach
// jedem Ereignis wird gefragt, ob das Budget aufgebraucht ist. Die Blockdauer
// ist dann höchstens Budget plus EIN Ereignis.
//
// `maxEreignisse` bleibt als Fangnetz für den Fall, dass die Uhr nicht
// weiterläuft (Testumgebungen mit angehaltener Zeit).
//
// WARUM ES DAS BRAUCHT: `vorspulenBisJetzt` unten teilt seine Arbeit nach
// ZEITSPANNE ein. Das kann Dichtespitzen nicht abfangen — gemessen an einem
// Ein-Tages-Sprung lagen 187 von 1182 Blöcken über 100 ms, der teuerste bei
// 1238 ms, weil die Ereignisdichte auf Minutenebene stoßweise ist (13
// Ereignisse/s gegen 4,7 im Stundenmittel). Die Rechenzeit hängt an der
// EREIGNISZAHL, also muss man die begrenzen, nicht die Zeitspanne.
//
// DER UNTERSCHIED ZUM EREIGNISDECKEL, und er ist der ganze Punkt: reißt der
// Deckel in `vorspulenBisJetzt`, wird trotzdem bis `jetzt` gebucht — die
// restliche Zeit fließt pauschal ein, und der Spielstand ist STILL verfälscht
// (in einer Messung fand die Supernova dadurch einfach nicht statt). Diese
// Variante tut das nie: sie rückt nur bis zum Zeitpunkt des nächsten, noch
// NICHT ausgeführten Ereignisses vor. Alles davor ist echte, kontinuierliche
// Produktion und darf gebucht werden; das Ereignis selbst bleibt liegen und
// ist beim nächsten Aufruf das erste.
//
// Rückgabe: `{ ereignisse, erreicht, fertig }`. `fertig` heißt, dass bis
// `jetzt` kein Ereignis mehr aussteht -- erst dann ist die Uhr am Ziel.
export function vorspulenSchrittweise(state, jetzt, maxEreignisse, budgetMs = Infinity) {
  wiederkehrendeEinplanen(state);
  const begonnen = budgetMs === Infinity ? 0 : performance.now();
  let ereignisse = 0;
  let fertig = false;
  // Nie hinter den Stand zurück: dieselbe Zusicherung wie bei
  // "letzterTick läuft nie rückwärts".
  let erreicht = state.letzterTick;

  for (;;) {
    const ereignis = naechstesEreignis(state);
    if (!ereignis || ereignis.zeit > jetzt) {
      fertig = true;
      erreicht = Math.max(erreicht, jetzt);
      break;
    }
    // Budget aufgebraucht? Die Uhr wird erst NACH dem ersten Ereignis
    // befragt -- ein Aufruf muss immer mindestens einen Schritt schaffen,
    // sonst käme die Aufholung nie voran.
    const zeitAus = ereignisse > 0 && budgetMs !== Infinity && performance.now() - begonnen >= budgetMs;
    if (zeitAus || ereignisse >= maxEreignisse) {
      // HALT. Bis zum nächsten Ereignis darf gebucht werden, es selbst nicht.
      erreicht = Math.max(erreicht, Math.min(jetzt, ereignis.zeit));
      break;
    }
    ressourcenVorruecken(state, ereignis.zeit, ereignis.planeten);
    logistiknetzPruefen(state, ereignis.zeit);
    ereignis.ausfuehren(ereignis.zeit);
    ereignisse += 1;
    erreicht = Math.max(erreicht, ereignis.zeit);
  }

  // Genau bis `erreicht` -- NICHT bis `jetzt`.
  ressourcenVorruecken(state, erreicht);
  logistiknetzPruefen(state, erreicht, true);
  // Was als Nächstes ansteht, kommt MIT ZURÜCK (A-042). Es kostet eine
  // Abfrage und beantwortet die einzige Frage, die man bei einer hängenden
  // Aufholung wirklich stellt: WER hängt? Ohne diese Angabe meldet der
  // Wächter in aufholen.js nur eine Zahl, und die Fehlersuche fängt bei null
  // an -- genau der Zustand, aus dem A-030 herausgeführt hat.
  const naechstes = fertig ? null : naechstesEreignis(state);
  return {
    ereignisse,
    erreicht,
    fertig,
    naechsteArt: naechstes ? naechstes.art : null,
    naechsteZeit: naechstes ? naechstes.zeit : null,
  };
}

export function vorspulenBisJetzt(state, jetzt = spielzeitJetzt(state), deckel = EREIGNIS_DECKEL) {
  wiederkehrendeEinplanen(state);
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
  // Der Nachfolger ruecken WARTEND nach und zahlt erst, wenn er kann (A-012).
  planet.bauQueue = naechster
    ? { ...naechster, startZeit: null, fertigZeit: null }
    : null;
  kopfPruefen(state, planet, zeit);
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

// Einen Bandennamen ziehen -- deterministisch aus dem Weltseed (A-031).
//
// Die Kennung ist die laufende Fraktionsnummer: damit bekommt jede Gruppe
// ihren eigenen, stabilen Strom, und die Reihenfolge der Gründungen spielt
// keine Rolle (dasselbe Muster wie bei den Systemen).
//
// NAMEN WIEDERHOLEN SICH, und das ist so gemeint. Eine Galaxie trägt
// vierhundert Piratengruppen; vierhundert Eigennamen wären vierhundert
// Gelegenheiten für einen schlechten. Ab der zweiten Runde durch die Tabelle
// hängt eine Nummer dran („Rostwölfe 2"), damit nicht alles gleich heißt --
// eindeutig macht das die Namen NICHT, und das ist kein Versehen.
//
// Was der Name leisten muss, ist auch ohne Eindeutigkeit erfüllt: eine
// Angriffsmeldung soll sich nach einem ANGREIFER lesen und nicht nach einem
// Wetterbericht. Wo genau er zuschlägt, sagt die Meldung ohnehin dazu.
export function piratenName(state, nummer) {
  const rng = stromFuer(state.galaxie ? state.galaxie.seed : 0, nummer + 7919);
  const name = t(waehle(rng, PIRATEN_NAMEN));
  const runde = Math.floor(nummer / PIRATEN_NAMEN.length);
  return runde > 0 ? `${name} ${runde + 1}` : name;
}

// ALTE STAENDE NACHZIEHEN (A-031). Gruppen aus der Zeit davor tragen den
// Namen ihres Orbitobjekts -- erkennbar daran, dass er NICHT in der
// Namenstabelle steht. Sie bekommen beim Laden einen gezogen.
//
// Das ist das -Prinzip sinngemaess: ein fehlender (hier: falscher) Wert
// wird beim Laden ergaenzt, statt einen SAVE_VERSION-Sprung zu erzwingen und
// damit jedem Tester seinen Spielstand zu nehmen.
export function piratenNamenNachziehen(state) {
  if (!state.fraktionen) return;
  let nummer = 0;
  for (const fraktion of Object.values(state.fraktionen)) {
    if (fraktion.art !== "pirat") continue;
    const ohneZahl = String(fraktion.name || "").replace(/ \d+$/, "");
    if (PIRATEN_NAMEN.includes(ohneZahl)) continue;
    fraktion.name = piratenName(state, nummer++);
  }
}

function piratenErwecken(state, systemId, objekt, zeit) {
  if (!objekt || objekt.typ !== "gefahr" || objekt.verteidigerBesiegt) return null;
  if (objekt.fraktionId && fraktionById(state, objekt.fraktionId)) return null;

  const id = `pirat-${state.naechsteFraktionId++}`;
  // Der Name ist der der BANDE, nicht der des Felsens, auf dem sie sitzt.
  // Das Herkunftsobjekt steht weiterhin im Tooltip der Basis -- es ergänzt,
  // es ersetzt nicht (A-031).
  state.fraktionen[id] = neueFraktion({
    id,
    art: "pirat",
    name: piratenName(state, state.naechsteFraktionId),
  });
  planFraktionNeu(state, state.fraktionen[id]);

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
  planetUhrStarten(basis, zeit);
  hinzufuegen(basis.ressourcen, skalieren(PIRAT.startVorrat, 1));
  state.planeten.push(basis);
  planPlanetNeu(state, basis);

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
    missionBefehlen(state, flotte, "bergung", basis.systemId, ziel.objekt.orbit, { rueckkehr: true }, zeit);
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
  const fraktion = neueFraktion({ id, art: "pirat", name: piratenName(state, state.naechsteFraktionId) });
  fraktion.herkunft = fraktionVon(quelle);
  state.fraktionen[id] = fraktion;
  planFraktionNeu(state, fraktion);

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
  planetUhrStarten(basis, zeit);
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
  planPlanetNeu(state, basis);

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
    }),
    null,
    herkunftVon(quelle)
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
  planFlotteGeaendert(state, flotte);

  // Die Vorwarnung ist der Kern: der Überfallene erfährt es, BEVOR es losgeht.
  meldungHinzufuegen(
    state,
    t("{angreifer} nimmt Kurs auf {flotte} – Kontakt in {dauer} Sekunden.", {
      angreifer: fraktion.name,
      flotte: ziel.flotte.name,
      dauer: Math.round(PIRAT.vorwarnungMs / 1000),
    }),
    null,
    // DIE Stelle: gemessen an einer Demo-Galaxie über 30 Echtzeitminuten
    // waren ALLE 30 Zeilen der Meldungsliste Überfälle fremder Piraten
    // aufeinander, und zwar aus genau diesem Aufruf. Überfallen die Piraten
    // eine Flotte des Spielers, bleibt die Vorwarnung sichtbar -- sie ist
    // dann der Kern der Meldung.
    herkunftVon(ziel.flotte)
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
  // EINE REGEL FÜR ALLE DREI WEGE: auch ein Splitter zieht einen eigenen
  // Namen. Den Namen der Mutter zu erben wäre bequem und im Log unlesbar --
  // zwei Gruppen mit demselben Namen, die einander bekämpfen.
  const splitter = neueFraktion({ id, art: "pirat", name: piratenName(state, state.naechsteFraktionId) });
  state.fraktionen[id] = splitter;
  planFraktionNeu(state, splitter);

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
    planFlotteEntfernt(state, reise);
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
  planetUhrStarten(basis, zeit);
  state.planeten.push(basis);
  planPlanetNeu(state, basis);

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
  planPlanetEntfernt(state, basis);
  state.planeten = state.planeten.filter((p) => p.id !== basis.id);
}

function piratenAufloesen(state, fraktion) {
  piratenBasisAufgeben(state, planetById(state, fraktion.basisPlanet));
  planFlotteEntfernt(state, flotteById(state, fraktion.flotteId));
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
  //
  // A-148: uran steht hier wie iridium (Beute, kein eigener Bedarf) --
  // anders als tritium, das die Flotte selbst als Treibstoff braucht.
  for (const resId of ["metall", "silizium", "iridium", "uran", "antimaterie"]) {
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
    }),
    null,
    herkunftVon(basis)
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
      }),
      null,
      herkunftVon(opfer)
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
      zurueckgelassen(state, opfer.ort, opfer.ladung, t("{flotte}: verlorene Fracht", { flotte: opfer.name }), false, null, herkunftVon(opfer));
      opfer.ladung = {};
    }
    meldungHinzufuegen(
      state,
      t("{flotte} wurde überfallen: {fracht} verloren.", {
        flotte: opfer.name,
        fracht: buendelText(genommen),
      }),
      null,
      herkunftVon(opfer)
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
    planFraktionNeu(state, fraktion);

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
    planPlanetNeu(state, welt);
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

  // Brennstoff-Vorausschau (A-055): gemeldet wird, BEVOR der Reaktor
  // erlischt -- die Schwelle muss Bauzeit plus Förder-Anlauf tragen. Auf
  // Welten ohne Deuterium-Affinität ist ein Extraktor keine Antwort; dort
  // bleibt nur Handel oder der Speicher (dieselbe Regel wie beim Nachschub).
  brennstoff: (state, planet) => {
    if (affinitaetFaktor(planet, "tritium") <= 0) return false;
    return brennstoffReichweiteMs(planet) < BOT.engpassSchwellen.brennstoffStunden * 60 * 60 * 1000;
  },

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

// A-137: aus einem an Geld gescheiterten Versuch (nurGeld, siehe kannBauen/
// kannSchiffBauen) wird das Sparziel -- aber nur der ERSTE pro Takt, sonst
// gewaenne immer der zuletzt geprüfte der vier Kandidaten. `sparzielVersucht`
// traegt das ueber die Aufrufe innerhalb EINES botKolonisieren-Laufs weiter
// (per Rueckgabewert, da diese Funktion sonst keinen Zugriff auf lokale
// Variablen des Aufrufers hat). Ein ERFOLGREICHER Versuch raeumt ein
// stehendes Sparziel ab, wenn es genau diesem Ziel galt (Mechanismus 3,
// "erreicht ist erreicht") -- unabhaengig vom sparzielVersucht-Zaehler.
function botSparzielAusVersuch(fraktion, welt, gebaeudeId, versuch, sparzielVersucht) {
  if (versuch.ok) {
    if (fraktion.sparziel && fraktion.sparziel.planetId === welt.id && fraktion.sparziel.gebaeudeId === gebaeudeId) {
      fraktion.sparziel = null;
    }
    return sparzielVersucht;
  }
  if (versuch.nurGeld && !sparzielVersucht) {
    fraktion.sparziel = { planetId: welt.id, gebaeudeId, kosten: versuch.kosten };
    return true;
  }
  return sparzielVersucht;
}

export function botKolonisieren(state, fraktion, welt, zeit, sparzielGesperrt = false) {
  const regeln = BOT.kolonie;
  if ((welt.ressourcen.bevoelkerung || 0) < regeln.abBevoelkerung) return false;
  if (planetenVon(state, fraktion.id).length >= regeln.maxPlaneten) return false;

  const ziel = botKolonieZiel(state, fraktion, welt);
  if (!ziel) return false;

  // A-137: `sparzielGesperrt` (gesetzt vom Aufrufer, wenn dieser Takt gerade
  // ein unerreichbares Ziel verworfen hat) startet den Zaehler auf "schon
  // benutzt" -- so wird in diesem Takt kein Ersatzziel gesetzt (Mechanismus
  // 3, letzter Satz: "wird das Sparziel verworfen und in diesem Takt nicht
  // neu gesetzt").
  let sparzielVersucht = sparzielGesperrt;

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
    const versuch = bauStarten(state, welt, "tritiumextraktor", zeit, true);
    sparzielVersucht = botSparzielAusVersuch(fraktion, welt, "tritiumextraktor", versuch, sparzielVersucht);
    if (versuch.ok) return true;
  }

  // 2. FERTIGUNG -- seit A-009 kostet die Werft Elektronik, und Elektronik
  // gibt es nur hier. Sie steht aus demselben Grund an dieser Stelle wie der
  // Extraktor darüber und ausdrücklich NICHT in BOT.nachschub: dort hätte sie
  // Vorrang vor Kraftwerk, Farm und Wohnmodul, und der Bot baute sich eine
  // Fabrik ohne Strom und ohne Belegschaft (gemessen, siehe BOT.nachschub).
  if (!botHatOderBaut(welt, "fertigung")) {
    const versuch = bauStarten(state, welt, "fertigung", zeit, true);
    sparzielVersucht = botSparzielAusVersuch(fraktion, welt, "fertigung", versuch, sparzielVersucht);
    if (versuch.ok) return true;
  }

  // 3. WERFT AUF DIE NOETIGE STUFE (A-027). Seit die Werftstufe entscheidet,
  // welche Typen baubar sind, reicht "eine Werft steht" nicht mehr -- das
  // Kolonieschiff verlangt Stufe 4.
  //
  //  zaehlt eingereihte Auftraege MIT. Ohne das
  // bestellte der Bot in jedem Takt denselben Ausbau neu (der v0.5-Fehlertyp,
  // im Auftrag ausdruecklich als Falle benannt) und kaeme nie ueber Stufe 1
  // hinaus.
  const werftNoetig = SCHIFFE.kolonieschiff.werftAb || 1;
  if (naechstesGebaeudeLevel(welt, "werft") <= werftNoetig) {
    const versuch = bauStarten(state, welt, "werft", zeit, true);
    sparzielVersucht = botSparzielAusVersuch(fraktion, welt, "werft", versuch, sparzielVersucht);
    if (versuch.ok) return true;
  }

  // Alles bestellt, aber noch nicht fertig: warten, nicht nachbestellen.
  if (
    (welt.gebaeude.tritiumextraktor || 0) <= 0 ||
    (welt.gebaeude.fertigung || 0) <= 0 ||
    (welt.gebaeude.werft || 0) < werftNoetig
  ) {
    return false;
  }

  // 2. Kolonieschiff bauen, wenn keines dasteht und keines unterwegs ist.
  const flotten = flottenVon(state, fraktion.id);
  const unterwegs = flotten.some((f) => (f.schiffe.kolonieschiff || 0) > 0);
  if (!unterwegs && (welt.schiffe.kolonieschiff || 0) <= 0) {
    if (welt.werftQueue) return false; // die Werft ist schon dran
    const versuch = schiffBauen(state, welt, "kolonieschiff", 1, zeit, true);
    botSparzielAusVersuch(fraktion, welt, "kolonieschiff", versuch, sparzielVersucht);
    return versuch.ok;
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
  // A-132: Bis dahin schifften sich die Siedler automatisch ein
  // (`siedlerEinschiffen`, in `missionBefehlen`). Seit das Kolonieschiff ein
  // eigener Kolonistenraum ist, den der SPIELER manuell befüllt, muss der Bot
  // an derselben Stelle dasselbe tun -- direkt vor `missionBefehlen`, wie
  // beim Tanken unten. Delta-Beladung (nicht die volle Kapazität jeden Takt):
  // `siedlerUmladen` deckelt zwar selbst am freien Kolonistenraum, aber
  // `ladungAufnehmen` für Material NICHT -- ein ungeschützter Aufruf würde
  // bei mehreren Takten in Folge (z.B. weil noch Treibstoff fehlt) jedes Mal
  // erneut draufladen.
  //
  // REIHENFOLGE VOR DEM TANKEN, nicht danach: seit `kapazitaet > 0` (A-132)
  // darf ungenutzter Frachtraum als Blasentank dienen (`flotteTankKapazitaet`
  // in flotten.js) -- käme das Material NACH dem Tanken, hätte ein gieriger
  // Tankwunsch (bis zu `BOT.kolonie.tritium`) den Frachtraum längst mit
  // Treibstoff gefüllt, und für die 22.500 t Startmaterial wäre nichts mehr
  // frei. Das Material ist die feste, kleine Reservierung; der Tank nimmt
  // sich danach, was übrig bleibt -- wie bisher, nur mit etwas weniger davon.
  const siedlerPlatz = flotteSiedlerKapazitaet(flotte) - (flotte.siedler || 0);
  if (siedlerPlatz > 0) siedlerUmladen(state, flotte, siedlerPlatz);
  const materialFehlt = {};
  for (const [resId, menge] of Object.entries(regeln.startmaterial)) {
    const anBord = flotte.ladung[resId] || 0;
    if (anBord < menge) materialFehlt[resId] = menge - anBord;
  }
  if (Object.keys(materialFehlt).length) ladungAufnehmen(state, flotte, materialFehlt);

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

// --- Forschung (Bot) ---------------------------------------------------
//
// A-134, R-26: „Die bots sollen natürlich auch hier wieder genau das gleiche
// zur verfügung haben wie der Spieler." Dieselbe Kette wie beim Klicken:
// Labor bauen (unten in botSchritt) -> Projekt wählen -> forschungGutschreiben
// sammelt den Fluss -> botForschungSchritt schließt ab, sobald genug da ist.

// Welche Forschung wählt der Bot, wenn gerade keine läuft? Dieselbe Frage wie
// botKnappste, nur auf den Techbaum angewandt: bevorzugt die billigste
// Forschung, deren boost.kategorie zur Gebäudekategorie der knappsten
// Nachschub-Ressource passt (z. B. "mine" für Metall/Silizium). Gibt es dazu
// nichts -- kein Treffer, oder botKnappste selbst liefert nichts -- die
// billigste verfügbare überhaupt. "Billigste" heißt geringster
// Forschungsaufwand für die nächste Stufe: baseCost ist seit v0.6 nur noch
// Gewicht, keine Zahlung (siehe forschungsAufwand).
function botForschungWahl(state, welt) {
  const knappsteGebaeude = botKnappste(state, welt);
  const kategorie = knappsteGebaeude ? BUILDINGS[knappsteGebaeude].kategorie : null;

  let passend = null;
  let billigste = null;
  for (const forschungId of Object.keys(RESEARCH)) {
    const check = kannForschen(state, welt, forschungId);
    if (!check.ok) continue;
    if (!billigste || check.aufwand < billigste.aufwand) billigste = { forschungId, aufwand: check.aufwand };
    const boost = RESEARCH[forschungId].boost;
    if (kategorie && boost && boost.kategorie === kategorie) {
      if (!passend || check.aufwand < passend.aufwand) passend = { forschungId, aufwand: check.aufwand };
    }
  }
  return (passend || billigste || {}).forschungId || null;
}

// Abschluss und Projektwahl für EINE Fraktion. Getaktet wie der Rest des
// Bots (BOT.taktMs), nicht ereignisgetrieben wie beim Spieler
// (forschungFertigProjektion/forschungAbschliessen) -- ein Übervoll-Laufen
// des Fortschritts erlaubt forschungFertig ausdrücklich (derselbe
// Fließkomma-Krümel wie beim Spieler), der nächste Bot-Takt holt es also
// sauber nach. Kein zweiter Mechanismus, nur ein zweiter AUSLÖSER.
//
// while statt if: ein einzelner sehr großer Zeitsprung (Weltlauf-Werkzeuge)
// könnte sonst mehr als eine Stufe auf einmal fertigstellen und der Rest
// bliebe bis zum nächsten Takt unentdeckt liegen.
function botForschungSchritt(state, fraktion, welt, zeit) {
  let queue = fraktion.forschungsQueue;
  while (queue && forschungFertig(queue)) {
    // Additiv-Absicherung: ein Spielstand von vor A-133 kennt `forschung`
    // an der Fraktion noch nicht -- kann aber auch keine Queue haben, deren
    // Weg ausschließlich über forschungStarten (unten) neu entsteht. Diese
    // eine Zeile hält auch den theoretischen Fall harmlos.
    if (!fraktion.forschung) fraktion.forschung = {};
    fraktion.forschung[queue.forschungId] = queue.zielLevel;
    // Bot-Bauten melden sich auch nicht (bauAbschliessen) -- keine Meldung.
    const naechster = (fraktion.forschungsWarteschlange || []).shift();
    fraktion.forschungsQueue = naechster ? neueForschungsQueue(naechster, zeit) : null;
    queue = fraktion.forschungsQueue;
  }

  if (fraktion.forschungsQueue) return; // läuft schon etwas

  const forschungId = botForschungWahl(state, welt);
  if (forschungId) forschungStarten(state, welt, forschungId, zeit);
}

// A-137, Mechanismus 3: ist das stehende Sparziel noch erreichbar? Zwei
// Kriterien, jedes für sich ausreichend, je Ressource, die es kostet und
// die JETZT NOCH FEHLT (schon gedeckte Ressourcen zaehlen nicht -- ihre
// Nettorate ist fuer das Ziel gleichgueltig):
//   1. Nettorate <= 0 -- es wird nie mehr davon (A-135, Elektronik-Fall).
//   2. Kosten > Lagerkapazitaet dieses Planeten fuer die Ressource -- selbst
//      ein volles Lager reicht nie (A-135 Befund 3, Lagerhallen-Fall:
//      Silizium-Kosten ueber der Kapazitaet, Nettorate blieb aber positiv,
//      weil sie VOR der Lagerkappung gerechnet wird).
// Ressourcen mit eigenem Speicher (z.B. ueber ein Gebaeude) nehmen dessen
// Kapazitaet, alle anderen den gemeinsamen Lagerpool geteilt durch ihr
// Lagergewicht -- derselbe Bezug wie in ENGPASS_PRUEFUNGEN.lager.
function botSparzielUnerreichbar(state, welt, sparziel) {
  const lage = effektiveRaten(state, welt);
  for (const [resId, betrag] of Object.entries(sparziel.kosten)) {
    if (!(betrag > 0)) continue;
    const bestand = welt.ressourcen[resId] || 0;
    if (bestand >= betrag) continue; // diese Ressource ist schon gedeckt
    const nettorate = (lage.lager && lage.lager[resId]) || 0;
    if (nettorate <= 0) return true;
    const def = RESSOURCEN[resId];
    const kapazitaet = def && def.speicher
      ? speicherKapazitaet(welt, resId)
      : lagerKapazitaetGesamt(state, welt) / lagerverbrauchVon(resId);
    if (betrag > kapazitaet) return true;
  }
  return false;
}

// A-137, Mechanismus 2: "Ein Sparziel blockiert nichts. Es RESERVIERT."
// Reserviert wird BOT.sparzielReserveAnteil (die Haelfte) des AKTUELLEN
// Bestands je Ressource, die das Sparziel kostet -- alles darueber darf
// normal verbaut werden. Gilt nur auf dem Planeten, auf dem das Ziel steht
// (Bekannte Fallen des Auftrags: das Sparziel gehoert der Fraktion, die
// Reserve wirkt lokal). `kannBauen` bleibt unveraendert; diese Funktion
// filtert VOR dem Aufruf, sie greift nicht in ihn ein.
function botSparReserveErlaubt(state, fraktion, welt, gebaeudeId) {
  const sparziel = fraktion.sparziel;
  if (!sparziel || sparziel.planetId !== welt.id) return true;
  const check = kannBauen(state, welt, gebaeudeId);
  const kosten = check.kosten || {};
  for (const resId of Object.keys(sparziel.kosten)) {
    const gebraucht = kosten[resId] || 0;
    if (gebraucht <= 0) continue;
    const bestand = welt.ressourcen[resId] || 0;
    const reserve = bestand * BOT.sparzielReserveAnteil;
    if (bestand - gebraucht < reserve) return false;
  }
  return true;
}

function botSchritt(state, fraktion, zeit) {
  fraktion.naechsterSchritt = zeit + BOT.taktMs;
  const welt = planetById(state, fraktion.basisPlanet);
  if (!welt) return;

  // A-134: eigener Vorgang neben der Bauschleife -- Forschung belegt keinen
  // Platz in bauQueue/bauWarteschlange und blockiert deshalb nichts hier
  // unten, wird aber auch von nichts hier unten blockiert.
  botForschungSchritt(state, fraktion, welt, zeit);

  // A-137: ein unerreichbares Sparziel wird VOR allem anderen abgeraeumt --
  // sonst wuerde botKolonisieren weiter unten im selben Takt sofort wieder
  // denselben Kandidaten pruefen und, weil sich an der Lage nichts geaendert
  // hat, dasselbe Ziel erneut setzen. `sparzielVerworfen` unterdrueckt genau
  // das (Mechanismus 3, letzter Satz).
  let sparzielVerworfen = false;
  if (fraktion.sparziel && fraktion.sparziel.planetId === welt.id && botSparzielUnerreichbar(state, welt, fraktion.sparziel)) {
    fraktion.sparziel = null;
    sparzielVerworfen = true;
  }

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
  if (!ohneNachschub && !engpass) {
    if (botKolonisieren(state, fraktion, welt, zeit, sparzielVerworfen)) return;
    // A-134 Punkt 1: eigene Stufe, NICHT in BOT.ausbau eingetragen -- die
    // Auffangliste nimmt den ERSTEN baubaren Eintrag, und Minen sind
    // praktisch immer baubar; ein Labor am Listenende käme nie an die Reihe.
    if (!botHatOderBaut(welt, "forschungslabor")) {
      if (bauStarten(state, welt, "forschungslabor", zeit, true).ok) return;
    }
  }
  const wunsch = engpass
    ? (BOT.engpaesse.find((e) => e.wenn === engpass) || {}).gebaeude
    : null;
  const knappste = botKnappste(state, welt);

  // A-137: NACHSCHUB und ENGPASS laufen VOR der Sparziel-Reserve und
  // ignorieren sie vollstaendig -- "eine hungernde Welt spart nicht"
  // (Mechanismus 2). Nur der Rest (KNAPPSTE und die alte Auffangliste) wird
  // gegen die Reserve geprueft. Die GESAMTREIHENFOLGE bleibt exakt dieselbe
  // wie vorher (ohneNachschub, wunsch, knappste, ...BOT.ausbau) -- zwei
  // Schleifen statt einer aendern nichts daran, wer zuerst drankommt.
  for (const gebaeudeId of [ohneNachschub, wunsch].filter(Boolean)) {
    // Durch dieselbe Tür wie die Oberfläche: kannBauen prüft Kosten,
    // Voraussetzungen, Bevölkerungsschwellen und Affinitätssperren.
    // Bots bestehen auf Bezahlbarkeit (A-012): ein wartender Auftrag wuerde
    // ihre Bauschleife belegen, waehrend sie in Wahrheit etwas anderes
    // brauchen. Der Spieler darf warten, die KI soll entscheiden.
    if (bauStarten(state, welt, gebaeudeId, zeit, true).ok) return;
  }
  for (const gebaeudeId of [knappste, ...BOT.ausbau].filter(Boolean)) {
    if (!botSparReserveErlaubt(state, fraktion, welt, gebaeudeId)) continue;
    if (bauStarten(state, welt, gebaeudeId, zeit, true).ok) return;
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
      const transfer = {
        id: state.naechsteTransferId++,
        quellPlanet: beste.quelle.id,
        zielPlanet: ziel.id,
        resId,
        menge,
        ankunftZeit: jetzt + logistikVerzoegerungMs(state, beste.quelle, ziel),
      };
      state.logistikTransfers.push(transfer);
      planTransferNeu(state, transfer);
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
  planTransferEntfernt(state, transfer);
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

// IST DIESE FORSCHUNG FERTIG? Genau EINE Antwort für beide Seiten -- die
// Projektion (wann ist sie fertig) und den Abschluss (ist sie es jetzt).
//
// DER FEHLER, DER DAS ERZWUNGEN HAT (A-042, gefunden am 17.08.2026 in Tobis
// hängendem Spielstand): dort stand
//
//     aufwand:     775850
//     fortschritt: 775849.999987793
//
// Ein Fließkomma-Krümel von 0,0000122 fehlte. Damit galt die Forschung als
// NICHT fertig, `forschungFertigProjektion` rechnete die Restzeit auf
// praktisch null und plante das Ereignis auf den aktuellen Zeitpunkt --
// und `forschungAbschliessen` sah beim Ausführen dasselbe Krümelchen und tat
// nichts. Ereignis erzeugt, Ereignis ausgeführt, nichts verändert, Uhr steht.
// Die Aufholung drehte daraufhin mit voller CPU-Last im Kreis (von Chris auf
// v0.88 unabhängig reproduziert), die Anzeige blieb bei 0 %, und ein Neuladen
// half nicht, weil der Zeit-Offset im Spielstand liegt.
//
// WARUM DER KRÜMEL ÜBERHAUPT ENTSTEHT: der Fortschritt wird je Planet und je
// Zeitspanne aufaddiert (`forschungGutschreiben`). Viele kleine Sprünge --
// genau das, was mehrfaches +1m erzeugt -- summieren sich in Fließkomma
// nicht exakt auf denselben Wert wie ein großer. Er landet dann beliebig
// knapp unter dem Ziel statt darüber. Das ist keine Schlamperei, sondern die
// Natur von Fließkomma: kein Rechenweg der Welt trifft eine Summe exakt.
//
// DIE SCHRANKE IST RELATIV, nicht absolut. Der Aufwand wächst über die Stufen
// um Größenordnungen; eine feste Zahl wäre bei kleinen Forschungen zu grob und
// bei großen zu fein. `1e-9` liegt weit über dem, was sich an Rundungsfehler
// ansammeln kann (Doubles tragen rund 1e-16 relativ), und weit unter allem,
// was ein Spieler je als Fortschritt bemerken würde.
export function forschungFertig(eintrag) {
  if (!eintrag) return false;
  const aufwand = aufwandVon(eintrag);
  const rest = aufwand - (eintrag.fortschritt || 0);
  return rest <= Math.max(1e-6, aufwand * 1e-9);
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

// Schreibt den Forschungsfluss EINES Planeten dem laufenden Projekt SEINER
// Fraktion gut. Wird aus planetVorruecken heraus gerufen, also genau dann,
// wenn dieser Planet seine eigene Uhr bewegt -- deshalb stimmt die
// Zeitspanne je Planet, obwohl die Planeten unterschiedlich weit stehen.
//
// A-134: die vormalige Spieler-Abschirmung ("nur der Spieler forscht") wird
// zur Fraktionszuordnung -- der Fluss eines Planeten geht an die Fraktion,
// der der Planet GEHÖRT, nicht mehr an den Spieler unabhängig davon. Ein
// Bot-Planet ohne eigene laufende Forschung liest forschungsQueueVon als
// `null` und diese Funktion tut nichts -- exakt dieselbe "kein Projekt,
// Fluss ist weg"-Regel wie beim Spieler.
//
// Läuft kein Projekt, ist der Fluss schlicht weg. Das ist gewollt: ein Labor
// ohne Auftrag forscht ins Leere, und ein Vorrat an Forschung, den man später
// ausgibt, wäre genau der Lagerbestand, den es hier nicht geben soll.
function forschungGutschreiben(state, planet, stunden, produktion) {
  if (!stunden) return;
  const queue = forschungsQueueVon(state, fraktionVon(planet));
  if (!queue) return;
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
  // Fertig (auch bis auf einen Fliesskomma-Kruemel)? Dann steht das Ereignis
  // jetzt an -- und der Abschluss unten sieht dasselbe, weil beide durch
  // dieselbe Frage gehen. Genau das Auseinanderlaufen war der Fehler (A-042).
  if (forschungFertig(queue)) return state.letzterTick;
  const rest = aufwandVon(queue) - (queue.fortschritt || 0);
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
  if (!forschungFertig(queue)) return;

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
    ),
    null, "welt"
  );
}

function supernovaOzonErholt(state, zeit) {
  const sn = state.supernova;
  sn.ozonKaputt = false;
  sn.ozonZeit = null;
  for (const planet of state.planeten) planetGeaendert(planet);
  meldungHinzufuegen(state, t("Die Ozonschicht hat sich erholt – die Ernte läuft wieder."), null, "welt");
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

  // DIE FLUT FRAGT NICHT NACH DER FLAGGE (Prinzip 0b, A-001).
  //
  // Bis v0.82 lief diese Schleife über `planetenVon(state)` -- und dessen
  // Vorgabe ist die Spielerfraktion. Bot-Imperien und Piratenbasen überstanden
  // eine galaxieweite Teilchenflut damit folgenlos und ohne Schirm. Der
  // Blitz war schon immer symmetrisch, nur die Abrechnung nicht.
  //
  // Bots bauen in der Demo KEINE Schirme (sie forschen noch nicht -- bekannte,
  // bewusste Lücke). Ihre Welten sterben also mit, und das ist gewollt: der
  // Spieler überlebt in einer Galaxie, die es nicht geschafft hat.
  const welten = [];
  const fremd = { gesamt: 0, ueberlebt: 0 };
  for (const planet of state.planeten) {
    if (!((planet.ressourcen && planet.ressourcen.bevoelkerung) > 0)) continue;
    const schildStufe = planet.gebaeude ? planet.gebaeude.magnetschild || 0 : 0;
    // `effektiveRaten` nur, wenn überhaupt ein Schirm steht -- sonst kostete
    // die Abrechnung die volle Produktionsauflösung für jede der bis zu 672
    // Welten der Galaxie, für ein Ergebnis, das schon feststeht.
    const anteil = schildStufe > 0 ? effektiveRaten(state, planet).faktoren.magnetschild ?? 0 : 0;
    // Voll versorgt heißt voll versorgt. Ein Feld mit 80 % Leistung lenkt
    // nicht 80 % der Teilchen ab, es reißt an der falschen Stelle auf.
    const ueberlebt = schildStufe > 0 && anteil >= SCHIRM_MINDESTVERSORGUNG;

    if (fraktionVon(planet) === SPIELER_FRAKTION) {
      welten.push({
        planet: planet.id,
        name: planet.name,
        bevoelkerung: Math.round(planet.ressourcen.bevoelkerung || 0),
        schild: schildStufe,
        versorgung: anteil,
        ueberlebt,
      });
    } else {
      // Fremde Welten werden GEZÄHLT, nicht aufgezählt. Der Abspann geht
      // Welt für Welt durch; mit bis zu 672 Einträgen wäre er kein Abspann
      // mehr, sondern eine Tabelle. Der Auftrag erlaubt beides ausdrücklich
      // ("wenn das ohne neues Layout geht") -- es geht nicht, also die Zahl.
      // Sie steht trotzdem im Spielstand: nach der Abrechnung ist die
      // Bevölkerung überall null, danach ist sie nicht mehr ermittelbar.
      fremd.gesamt += 1;
      if (ueberlebt) fremd.ueberlebt += 1;
    }

    if (!ueberlebt) {
      // Über die Jahrtausende der Flut stirbt, was nicht geschützt war.
      // Ursächlich erreicht, nicht per Uhr (Prinzip 13a).
      planet.ressourcen.bevoelkerung = 0;
      planetGeaendert(planet);
    }
  }

  // SOLARFELDER STERBEN MIT DER FLUT (A-055): schnelle geladene Teilchen
  // schlagen Atome aus dem Halbleitergitter -- ein Feld ohne haltenden
  // Schirm ist danach Schrott. Unter einem haltenden Schirm überlebt es,
  // wie eine Magnetosphäre es real leisten würde; ob der Schirm hält, ist
  // oben bereits mit dem VOLLEN Strommix entschieden (auch dem solaren --
  // solange der Schirm steht, liefern die Felder ja noch).
  //
  // Eigener Durchlauf über ALLE Planeten, nicht nur die bewohnten: auch
  // eine leergezogene Kolonie kann Felder tragen. Sie verfallen nach
  // Prinzip 13a zu Bergungsgut am eigenen Orbit, nicht ins Nichts.
  for (const planet of state.planeten) {
    const stufe = planet.gebaeude ? planet.gebaeude.solarfeld || 0 : 0;
    if (stufe <= 0) continue;
    const schildStufe = planet.gebaeude.magnetschild || 0;
    const haelt =
      schildStufe > 0 && (effektiveRaten(state, planet).faktoren.magnetschild ?? 0) >= SCHIRM_MINDESTVERSORGUNG;
    if (haelt) continue;
    const schrott = {};
    for (let l = 1; l <= stufe; l++) {
      for (const [resId, betrag] of Object.entries(gebaeudeKosten(planet, BUILDINGS.solarfeld, l))) {
        schrott[resId] = (schrott[resId] || 0) + Math.floor(betrag * SCHROTT_ANTEIL);
      }
    }
    planet.gebaeude.solarfeld = 0;
    planetGeaendert(planet);
    if (Object.values(schrott).some((menge) => menge > 0)) {
      zurueckgelassen(
        state,
        ortVonPlanet(state, planet),
        schrott,
        planet.name,
        // Nur der Spieler bekommt die Meldung -- eine Zeile je Bot-Welt wäre
        // eine Flut in der Flut.
        fraktionVon(planet) !== SPIELER_FRAKTION,
        `solarflut-${planet.id}`,
        herkunftVon(planet)
      );
    }
  }

  state.ende = {
    zeit,
    welten,
    fremd,
    // AUSDRÜCKLICH NUR SPIELERWELTEN. Würde `gewonnen` aus allen Welten
    // abgeleitet, gewänne der Spieler, weil irgendeine Piratenbasis
    // durchgekommen ist -- während seine eigene Bevölkerung bei null steht.
    gewonnen: welten.some((w) => w.ueberlebt),
  };

  meldungHinzufuegen(
    state,
    state.ende.gewonnen
      ? t("Die Teilchenflut ist da. {anzahl} von {gesamt} Welten stehen im Schirm.", {
          anzahl: welten.filter((w) => w.ueberlebt).length,
          gesamt: welten.length,
        })
      : t("Die Teilchenflut ist da. Keine einzige Welt war geschützt."),
    null, "welt"
  );
}

// A-151: ein Werftauftrag kann ein ZIEL tragen (`queue.zielFlotte`, die
// Flotten-ID) -- fehlt es (alte Spielstände, `|| 0`-Muster über den
// truthy-Check unten), gilt "in den Hafen" wie bisher. Gültig ist das Ziel
// NUR, wenn die Flotte JETZT GENAU HIER angedockt ist: Prinzip 4 ("Nichts
// teleportiert") verbietet, fertige Schiffe zu einer Flotte zu schicken, die
// unterwegs, an einem anderen Planeten oder gar nicht mehr da ist (aufgelöst).
// Auf die ID zu zeigen statt auf den Namen hält die Zuweisung auch über ein
// Umbenennen (A-082) hinweg stabil.
function werftAbschliessen(state, planet, zeit) {
  const queue = planet.werftQueue;
  const ziel = queue.zielFlotte ? flotteById(state, queue.zielFlotte) : null;
  const zielGueltig = !!(ziel && ziel.dockPlanet === planet.id);
  if (zielGueltig) {
    ziel.schiffe[queue.schiffId] = (ziel.schiffe[queue.schiffId] || 0) + queue.anzahl;
  } else {
    planet.schiffe[queue.schiffId] = (planet.schiffe[queue.schiffId] || 0) + queue.anzahl;
  }
  meldungHinzufuegen(
    state,
    zielGueltig
      ? t("{anzahl}× {schiff} auf {planet} fertiggestellt und {flotte} zugewiesen.", {
          anzahl: queue.anzahl,
          schiff: t(SCHIFFE[queue.schiffId].name),
          planet: planet.name,
          flotte: ziel.name,
        })
      : queue.zielFlotte
      ? t("{anzahl}× {schiff} auf {planet} fertiggestellt – Zielflotte nicht mehr hier, im Hafen gelandet.", {
          anzahl: queue.anzahl,
          schiff: t(SCHIFFE[queue.schiffId].name),
          planet: planet.name,
        })
      : t("{anzahl}× {schiff} auf {planet} fertiggestellt.", {
          anzahl: queue.anzahl,
          schiff: t(SCHIFFE[queue.schiffId].name),
          planet: planet.name,
        }),
    null, herkunftVon(planet)
  );
  const naechster = planet.werftWarteschlange.shift();
  planet.werftQueue = naechster ? { ...naechster, startZeit: null, fertigZeit: null } : null;
  kopfPruefen(state, planet, zeit);
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

// Einen EIGENEN Planeten umbenennen (A-082).
//
// Dieselbe Regel wie beim Flottennamen, und aus denselben Gründen: leer wird
// abgelehnt (ein namenloser Planet reißt in jede Liste ein Loch), zu lang wird
// gekappt statt abgelehnt (Prinzip 3, verhindern statt bestrafen).
//
// FREMDE Welten sind ausgenommen, und das ist keine Willkür: ihre Namen
// stammen aus der Weltgenerierung und werden aus der Saat neu abgeleitet
// (systeme.js), ein Eintrag hier verschwände beim nächsten Aufbau der
// Systemansicht wieder. Wer die Galaxie beschriften will, braucht den
// Roadmap-Punkt „Lesbare Systemnamen", nicht dieses Feld.
export const PLANETENNAME_MAX = 24;

export function planetUmbenennen(state, planet, name) {
  if (!planet) return { ok: false, grund: t("Kein Planet gewählt.") };
  if (fraktionVon(planet) !== SPIELER_FRAKTION) {
    return { ok: false, grund: t("Fremde Welten lassen sich nicht umbenennen.") };
  }
  const sauber = String(name || "").trim().slice(0, PLANETENNAME_MAX);
  if (!sauber) return { ok: false, grund: t("Der Name darf nicht leer sein.") };
  planet.name = sauber;
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
    // `mindestBeladung` (A-094): Abflug erst ab X % Frachtauslastung, 0 = wie
    // bisher. Alte Spielstände haben das Feld nicht -- gelesen wird es überall
    // mit `|| 0`, damit bleibt es Kategorie 1.
    route: { aktiv: false, halte: [], index: 0, mindestBeladung: 0 },
    // Angesammelter Kampfschaden je Schiffstyp -- < Anzahl*hp, sonst wäre das
    // Schiff zerstört statt beschädigt. Reparierbar oder recycelbar.
    schiffSchaden: {},
    // Laufendes Gefecht (null = kein Kampf). Läuft über echte Zeit -- siehe
    // militaerStarten/kampfRundeAusfuehren -- statt in einem Tick durch.
    gefecht: null,
  };
  state.flotten.push(flotte);
  // Für den Ereignisplan (A-035): den Rang in Erzeugungsreihenfolge sichern.
  // Quellen hat eine frische Flotte noch keine -- die melden abschnittStarten
  // und die Gefechts-Eröffnungen.
  planFlotteNeu(state, flotte);
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
    if (nimm <= 0) return { ok: false, grund: t("Kein Deuterium vorhanden.") };
    planet.ressourcen.tritium -= nimm;
    flotte.treibstoff += nimm;
  } else {
    const gib = Math.min(-menge, flotte.treibstoff);
    if (gib <= 0) return { ok: false, grund: t("Kein Deuterium an Bord.") };
    flotte.treibstoff -= gib;
    const { genommen } = insLager(state, planet, { tritium: gib });
    // Was nicht ins Lager passte, bleibt an Bord statt zu verschwinden.
    flotte.treibstoff += gib - (genommen.tritium || 0);
  }
  return { ok: true };
}

// A-132: Kolonisten laden/zurückgeben -- exakt dasselbe Muster wie `tanken`
// (eigener Raum, nicht Teil der Fracht), nur mit `bevoelkerung` statt
// `tritium` und `flotteSiedlerKapazitaet` statt `flotteTankKapazitaet`.
// Positives `menge`: an Bord nehmen. Negatives: zurückgeben.
//
// BEWUSST KEINE Mindestbestand-Prüfung auf der Heimatwelt (anders als das
// alte, automatische `siedlerEinschiffen` bis A-132): Tobis Entscheidung ist
// "der User muss selbst entscheiden was gut ist" -- dieselbe Freiheit, die
// beim Beladen mit Fracht gilt. Wer die Heimat leerräumt, tut das wissentlich.
export function siedlerUmladen(state, flotte, menge) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;

  if (menge > 0) {
    const verfuegbar = Math.floor(planet.ressourcen.bevoelkerung || 0);
    const platz = Math.max(0, flotteSiedlerKapazitaet(flotte) - (flotte.siedler || 0));
    if (platz <= 0) return { ok: false, grund: t("Der Kolonistenraum ist voll.") };
    const nimm = Math.min(menge, verfuegbar, platz);
    if (nimm <= 0) return { ok: false, grund: t("Keine Bevölkerung verfügbar.") };
    planet.ressourcen.bevoelkerung -= nimm;
    planetGeaendert(planet);
    flotte.siedler = (flotte.siedler || 0) + nimm;
  } else {
    const gib = Math.min(-menge, flotte.siedler || 0);
    if (gib <= 0) return { ok: false, grund: t("Keine Kolonisten an Bord.") };
    flotte.siedler -= gib;
    const { genommen } = insLager(state, planet, { bevoelkerung: gib });
    // Was nicht ins Wohnmodul passte, bleibt an Bord statt zu verschwinden --
    // dieselbe Regel wie bei Treibstoff und Fracht.
    flotte.siedler += gib - (genommen.bevoelkerung || 0);
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
    }),
    null, herkunftVon(flotte)
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
    }),
    null, herkunftVon(flotte)
  );
  return { ok: true };
}

export function ladungAufnehmen(state, flotte, buendel) {
  const check = kannUmladen(state, flotte);
  if (!check.ok) return check;
  const planet = check.planet;
  if (!reichenAus(planet.ressourcen, buendel)) return nichtGenug(planet.ressourcen, buendel);

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
      "fracht",
      herkunftVon(flotte)
    );
  }
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(
      state,
      t("{planet}: Lager voll – {fracht} bleiben an Bord.", {
        planet: planet.name,
        fracht: buendelText(abgelehnt),
      }),
      null, herkunftVon(flotte)
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
        t("{planet}: Lager voll – {menge} Deuterium beim Auflösen verloren.", {
          planet: planet.name,
          menge: Math.floor(rest),
        }),
        null, herkunftVon(flotte)
      );
    }
  }
  ladungLoeschen(state, flotte, planet);
  planFlotteEntfernt(state, flotte);
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
        }),
        null, herkunftVon(flotte)
      );
    }
  } else if (etwasDa) {
    zurueckgelassen(state, flotte.ort, reste, flotte.name, false, null, herkunftVon(flotte));
  }

  meldungHinzufuegen(
    state,
    t("{flotte} hat keine Schiffe mehr und wurde aufgelöst.", { flotte: flotte.name }),
    null,
    herkunftVon(flotte)
  );
  planFlotteEntfernt(state, flotte);
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
// herkunft: WESSEN Reste das sind (A-074). Der Helfer bekommt nur den NAMEN
// des Verursachers als Text, nicht das Objekt -- ohne diese Angabe liefe eine
// Piratenflotte, die irgendwo Fracht verliert, als eigene Meldung durch den
// Filter. Genau solche Zeilen hat Tobi unter "nur meine" gesehen.
function zurueckgelassen(state, ort, buendel, wer, leise = false, gruppe = null, herkunft = "eigen") {
  // BAGATELLEN FALLEN WEG (A-022). Die Regel dahinter steht bei
  // REST_BAGATELLE in data.js: Überreste werden modelliert, solange sie eine
  // Verwendung haben. Drei Tonnen Deuterium an einem Orbit haben keine —
  // niemand schickt einen Frachter dafür los. Was sie hätten, wäre eine
  // Nebenwirkung: jede verbrauchte Sonde ließe ein Häufchen zurück.
  //
  // Gefiltert wird je Ressource, nicht über die Summe: sonst rettete ein
  // großer Metallposten drei Tonnen Deuterium mit hinüber.
  const lohnend = {};
  for (const [resId, menge] of Object.entries(buendel)) {
    if (menge >= REST_BAGATELLE_SKALIERT) lohnend[resId] = menge;
  }
  buendel = lohnend;
  if (!Object.values(buendel).some((m) => m > 0)) return;

  // Zwischen den Systemen gibt es keinen Ort, an dem etwas liegen könnte --
  // hier verschwindet es tatsächlich, und das wird gesagt statt verschwiegen.
  if (!ort || ort.systemId == null || ort.orbit == null) {
    if (!leise) meldungHinzufuegen(state, t("{wer}: Reste gingen zwischen den Systemen verloren.", { wer }), null, herkunft);
    return;
  }
  const objekt = findeObjekt(state, ort.systemId, ort.orbit);
  if (!objekt) {
    if (!leise) meldungHinzufuegen(state, t("{wer}: Reste gingen verloren.", { wer }), null, herkunft);
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
      gruppe,
      herkunft
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
  // Neue Quelle für den Ereignisplan (A-035): eine ruhende Flotte hatte
  // keinen Eintrag, die Selbstheilung greift deshalb hier nicht.
  planFlotteGeaendert(state, flotte);
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
        ? t("Zu wenig Deuterium: {noetig} nötig, {anBord} an Bord.", werte)
        : t("Zu wenig Deuterium: {noetig} nötig (inkl. Rückweg), {anBord} an Bord.", werte),
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

// Mission starten: hinfliegen, ausführen -- und NUR AUF WUNSCH heimkehren.
//
// TOBIS ENTSCHEIDUNG (16.08., KONZEPT-FLOTTEN-UX): „Flotten sollten auch stehen
// bleiben am zielort es sei denn man wählt vorher return aus." Standard ist
// damit BLEIBEN, der Rückflug ist eine Wahl beim Losschicken.
//
// Warum das mehr ist als Bequemlichkeit: eine Flotte, die von selbst heimkehrt,
// verbrennt den Treibstoff für die Rückstrecke IMMER -- auch wenn das nächste
// Ziel in derselben Ecke der Galaxie liegt. Wer weiterziehen will, zahlte
// bisher den Umweg über die Heimat. Reichweite ist in diesem Spiel die knappe
// Größe (Prinzip 4: nichts teleportiert), also gehört diese Entscheidung dem
// Spieler.
//
// TECHNISCH ist es dieselbe Befehlskette wie vorher, nur ohne den zweiten
// Eintrag -- kein neuer Zustand, kein neues Feld an der Flotte. Eine Flotte
// ohne weitere Befehle steht am Ziel; diesen Zustand gibt es seit v0.61
// (Prinzip 5).
//
// `optionen.rueckkehr === true` hängt den Hafen-Befehl an. Die
// Treibstoffprüfung folgt derselben Wahl: ohne Rückkehr muss nur die
// Hinstrecke gedeckt sein (`einweg`), sonst hin UND zurück (Prinzip 3:
// verhindern statt hinterher stranden lassen).
// --- Siedler an Bord (A-043, seit A-132 manuelles Beladen) ----------------
//
// Bis A-132 stieg die volle Siedlerzahl automatisch zu, sobald eine
// Koloniemission losging (`siedlerEinschiffen`, s.u., entfallen). Seit R-23
// (Tobi: „Nichts davon wird Automatisch aufgefüllt, der User muss selbst
// entscheiden was gut ist") ist das Kolonieschiff ein eigener Kolonistenraum
// wie Fracht -- beladen wird VORHER, im Hafen, über `siedlerUmladen`, genau
// wie Treibstoff über `tanken`. Was hier bleibt, ist die MISSIONSBEDINGUNG:
// darf diese Flotte überhaupt lostliegen? EINE Funktion beantwortet das,
// weil zwei Wege sie stellen: der Spieler über `kannGruendungsmission`, die
// Bots über `botKolonisieren`. Prinzip 0b -- dieselbe Tür.
//
// DAS WAR HIER EIN ECHTER FEHLER, gefunden im Weltlauf (A-043): die Prüfung
// stand zuerst nur in `gruendungBefehlen`, und `botKolonisieren` ruft
// `missionBefehlen` DIREKT auf. Die Bots kolonisierten also weiter zum
// Nulltarif -- der Weltlauf lieferte Zahl für Zahl das alte Ergebnis, und
// genau diese Unauffälligkeit war der Hinweis. Die Tür bleibt dieselbe,
// auch wenn die Prüfung jetzt einfacher ist.
function siedlerPruefen(flotte) {
  const anBord = Math.floor(flotte.siedler || 0);
  if (anBord <= 0) {
    return { ok: false, grund: t("Braucht mindestens einen Kolonisten an Bord.") };
  }
  return { ok: true };
}

export function missionBefehlen(state, flotte, missionsart, systemId, orbit, optionen = {}, zeit = null) {
  const { rueckkehr = false, ...missionsOptionen } = optionen;
  // A-043: DIE Tür, durch die Spieler und Bots gleichermaßen gehen.
  if (missionsart === "kolonie") {
    const siedlerCheck = siedlerPruefen(flotte);
    if (!siedlerCheck.ok) return siedlerCheck;
  }
  const befehle = [
    { art: "mission", missionsart, zielSystem: systemId, zielOrbit: orbit, ...missionsOptionen },
  ];
  if (rueckkehr) befehle.push({ art: "hafen", planetId: flotte.heimatPlanet });

  // A-152: Eine Sonde wird nicht mehr "nach Gefühl" beladen -- reicht der
  // schon geladene Treibstoff nicht für DIESE Strecke, tankt das Spiel vor
  // dem Start automatisch genau den Fehlbetrag nach (dieselbe Rechnung wie
  // kannMission oben, kein zweiter Rechenweg). Das ist die VOREINSTELLUNG,
  // keine Sperre: "Wer mehr mitgeben will, als nötig ist, darf das" (Auftrag,
  // wörtlich) -- liegt bereits genug oder mehr im Tank (bewusst im Hafen
  // vorgetankt), bleibt das unangetastet, nichts wird zurückgebucht. Nur im
  // Hafen möglich und nur ohne Rückkehr (die einzige Wahl, die eine Sonde
  // überhaupt anbietet); reicht der Hafenbestand am Ende nicht ganz, greift
  // die normale Treibstoffprüfung in befehleSetzen unten unverändert --
  // verhindern statt bestrafen (Prinzip 3).
  if (missionsart === "sonde" && flotte.dockPlanet && !rueckkehr) {
    const ziel = ortVonSystem(state, systemId, orbit);
    const bedarf = treibstoffFuer(flotte, strecke(flotte.ort, ziel));
    if (flotte.treibstoff < bedarf) tanken(state, flotte, bedarf - flotte.treibstoff);
  }

  return befehleSetzen(state, flotte, befehle, { einweg: !rueckkehr }, zeit);
}

// --- Schnellversand -------------------------------------------------------
// Ein Klick statt N Einzelbefehle: sucht alle unerforschten Ziele im System,
// die dieser Schiffstyp aufdecken kann, und schickt eine Flotte auf eine
// Kette von Aufklärungsmissionen mit anschließender Heimkehr.
//
// Bewusst KEIN neuer Mechanismus: es werden dieselben Missionsbefehle
// erzeugt, die man auch von Hand gäbe -- nur eben alle auf einmal. Dadurch
// gelten Treibstoffprüfung, Ankunftslogik und Verbrauch unverändert weiter.
// NUR NOCH SONDEN (A-021, Tobis Entscheidung 16.08.): "Die 1 Button Loesung
// darf nur noch fuer Sonden funktionieren."
//
// Der Grund steckt in den Schiffen selbst: eine Sonde ist ein EINWEGSCHIFF und
// deckt genau ein Ziel auf. Wieviele man braucht, ist damit eine Zahl, die man
// hinschreiben kann -- und genau das macht den Ein-Klick-Versand ehrlich.
//
// Ein Erkunder kommt zurueck, kann mehrere Ziele nacheinander bearbeiten und
// wird an einer Anomalie vielleicht gebraucht, waehrend er noch unterwegs ist.
// Fuer ihn ist "schick einfach alle los" keine Vereinfachung, sondern eine
// Entscheidung, die dem Spieler weggenommen wird. Er geht seit A-021 wieder
// ueber den normalen Missionsdialog -- ein Klick mehr, dafuer seiner.
const SCHNELLVERSAND = {
  sonde: { forschung: "sondenKi", missionsart: "sonde", schiff: "sonde" },
};

// Welche Orbits im System wartet dieser Schiffstyp noch auf? Reihenfolge:
// wie sie im System stehen (aufsteigend nach Orbitnummer) -- NICHT die
// Flugreihenfolge, die baut zielketteNaechsterNachbar daraus (A-115).
function offeneAufklaerungsziele(state, systemId, missionsart) {
  const system = holeSystem(state, systemId);
  return system.objekte
    .filter((objekt) => !objekt.entdeckt && missionFuerObjekt(state, objekt) === missionsart)
    .map((objekt) => objekt.orbit);
}

// Baut die Zielkette als NÄCHSTER-NACHBAR statt sortiert nach Orbitnummer
// (A-115): Ausgangspunkt ist `vonOrt`; gewählt wird jeweils das offene Ziel
// mit der kleinsten `strecke(ort, ziel)`, danach wandert `ort` auf dieses
// Ziel und die Wahl wiederholt sich, bis `limit` Ziele stehen oder keines
// mehr offen ist. Das ist DIESELBE Kette, die `einwegBedarf` anschließend
// bepreist -- der angekündigte Treibstoff sinkt damit automatisch mit.
//
// Kein Rundreise-Optimum, ausdrücklich nicht: bei einer Handvoll Orbits ist
// der Unterschied zum Optimum klein, und die Regel muss erklärbar bleiben
// ("sie fliegt immer zum nächsten").
//
// Determinismus bei Gleichstand: die kleinere Orbitnummer gewinnt, sonst
// wackeln die Ereignisplan-Tests aus A-035 (dieselbe Saat muss dieselbe
// Ereigniszeit ergeben).
function zielketteNaechsterNachbar(state, systemId, orbits, vonOrt, limit) {
  const offen = [...orbits];
  const kette = [];
  let ort = vonOrt;
  while (offen.length && kette.length < limit) {
    let besterIndex = 0;
    let besteStrecke = strecke(ort, ortVonSystem(state, systemId, offen[0]));
    for (let i = 1; i < offen.length; i++) {
      const d = strecke(ort, ortVonSystem(state, systemId, offen[i]));
      if (d < besteStrecke || (d === besteStrecke && offen[i] < offen[besterIndex])) {
        besteStrecke = d;
        besterIndex = i;
      }
    }
    const orbit = offen.splice(besterIndex, 1)[0];
    kette.push(orbit);
    ort = ortVonSystem(state, systemId, orbit);
  }
  return kette;
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
  // Was der Versand KOSTEN wird, kommt mit zurueck -- der Knopf soll VOR dem
  // Klick sagen, was er tut (A-021, Prinzip 10a). Gerechnet wird derselbe
  // Einwegbedarf, den der Versand danach tankt; zwei Rechnungen waeren zwei
  // Wahrheiten ueber denselben Flug.
  //
  // NÄCHSTER-NACHBAR statt Orbitnummer (A-115): sonst deckt eine Flotte mit
  // weniger Sonden als Zielen die INNERSTEN Orbits auf, egal wo sie steht --
  // und selbst bei genug Sonden für alle Ziele kann eine nach Orbitnummer
  // sortierte Kette quer durchs System springen und wieder zurück.
  const gewaehlt = zielketteNaechsterNachbar(state, systemId, ziele, flotte.ort, anBord);
  const befehle = gewaehlt.map((orbit) => ({
    art: "mission",
    missionsart: regel.missionsart,
    zielSystem: systemId,
    zielOrbit: orbit,
  }));
  const gedachteFlotte = { ...flotte, schiffe: { ...flotte.schiffe, [regel.schiff]: gewaehlt.length } };
  return {
    ok: true,
    ziele: gewaehlt,
    gesamtZiele: ziele.length,
    schiffe: anBord,
    // MIT DER FLOTTE RECHNEN, DIE WIRKLICH FLIEGT: der Versand laedt im Hafen
    // zuerst die ueberzaehligen Sonden aus (sie kaemen nach dem letzten Ziel
    // nicht heim), und weniger Schiffe brauchen weniger Sprit. Ohne diesen
    // Schritt kuendigte der Knopf 1650 an und tankte 300 -- gemessen beim
    // Schreiben des Tests.
    treibstoff: einwegBedarf(state, flotte.dockPlanet ? gedachteFlotte : flotte, befehle),
  };
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
  meldungHinzufuegen(state, versandMeldung, null, herkunftVon(flotte));
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
        }),
        null, herkunftVon(flotte)
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
  // Seit A-094 über routeAbfahrtVersuchen: der Index rückt erst vor, wenn
  // wirklich abgefahren wird -- eine wartende Flotte muss wissen, an welchem
  // Halt sie steht, um dort weiter nachladen zu können.
  if (routenHaltIndex !== undefined && flotte.route && flotte.route.aktiv) {
    routeAbfahrtVersuchen(state, flotte, routenHaltIndex, zeit);
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
    meldungHinzufuegen(state, t("{flotte}: zu wenig Deuterium für den Weiterflug – Flotte wartet.", { flotte: flotte.name }), null, herkunftVon(flotte));
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
    "fracht",
    herkunftVon(flotte)
  );
}

// --- A-094: Abflug erst ab X % Beladung -----------------------------------
//
// Tobis Wunsch (19.08.): "nicht losfliegen, bevor die Flotte nicht mindestens
// so-und-so voll ist." Eine Route, die jeden Halt sofort wieder verlässt,
// fährt bei magerer Produktion mit ein paar Tonnen im Bauch durch die halbe
// Galaxie -- der Treibstoff kostet dabei mehr als die Fracht wert ist.
//
// WIE OFT NACHGESEHEN WIRD: Gewartet wird auf Produktion, und die läuft in
// Stunden. Ein feiner Takt brächte nichts und kostete Ereignisse -- der
// Ereignisplan (A-035) ist eine gemeinsame Ressource, jeder überflüssige
// Eintrag geht allen anderen ab. Eine halbe Stunde Spielzeit ist grob genug,
// um billig zu sein, und fein genug, dass niemand zusieht.
const ROUTE_WARTE_TAKT = MS_PRO_STUNDE / 2;

// R-7/A-100: EINE Meldung, wenn eine Route wegen der Mindestbeladung länger
// als 24 h SPIELZEIT an einem Halt steht. Nicht die Wartelage selbst
// begrenzen (kein automatischer Abflug -- das ist Spielerentscheidung),
// nur die stille Dauerwartezeit hörbar machen (Prinzip 10a).
const ROUTE_WARTE_HINWEIS_MS = 24 * MS_PRO_STUNDE;

// Wie voll ist der Frachtraum? Anteil, nicht Prozent -- die Prozentzahl
// gehört der Oberfläche.
export function routeBeladungAnteil(state, flotte) {
  const kapazitaet = flotteKapazitaet(state, flotte);
  return kapazitaet > 0 ? ladungGesamt(flotte) / kapazitaet : 1;
}

// Darf hier abgefahren werden?
//
// Die Schwelle gilt NUR an einem Halt, der überhaupt lädt. An einem reinen
// Entladehalt wäre sie eine Falle mit Ansage: dort kommt nie Fracht dazu, die
// Route stünde für immer. Der Auftrag sagt es genauso -- "die Route wartet am
// LADEHALT".
export function routeAbfahrtFrei(state, flotte, halt) {
  const schwelle = (flotte.route && flotte.route.mindestBeladung) || 0;
  if (schwelle <= 0) return true;
  if (!halt || !halt.laden || !halt.laden.length) return true;
  return routeBeladungAnteil(state, flotte) * 100 >= schwelle;
}

// Fährt ab oder wartet. EIN Ort für beide Wege -- die Ankunft und der
// Wartetakt kommen hier zusammen heraus, sonst hätte "wann fährt sie los"
// zwei Antworten.
//
// ES WIRD NICHTS GEMELDET, wenn sie wartet: Das ist ein Dauerzustand, keine
// Nachricht. Eine Zeile je Takt wären bei einem Tagessprung 48 Meldungen für
// "es hat sich nichts geändert" (die Lehre aus A-083). Worauf sie wartet,
// steht in der Routenzeile -- dort, wo man ohnehin nachsieht.
function routeAbfahrtVersuchen(state, flotte, haltIndex, zeit) {
  const route = flotte.route;
  if (!routeAbfahrtFrei(state, flotte, route.halte[haltIndex])) {
    // R-7: eine NEUE Wartelage beginnt, wenn vorher an einem anderen Halt
    // (oder gar nicht) gewartet wurde -- `routeWartenBeenden` setzt
    // `wartetAn` bei jeder Abfahrt auf null, zwei Wartelagen am selben Halt
    // liegen also immer ein "null" dazwischen. Der Meldungsstand
    // (`wartetGemeldetSeit`) wird bewusst NICHT hier zurückgesetzt, sondern
    // erst mit dem neuen `wartetSeit` verglichen -- "neues Warten, neuer
    // Anspruch" ohne einen zweiten Merker zu brauchen. `wartetSeit == null`
    // fängt zusätzlich einen alten Spielstand ab, der schon MITTEN in einer
    // Wartelage steckt (das Feld gab es dort noch nicht) -- ohne die
    // Zusatzbedingung bekäme genau diese eine, laufende Wartelage nie einen
    // Startzeitpunkt und würde nie gemeldet.
    if (route.wartetAn !== haltIndex || route.wartetSeit == null) route.wartetSeit = zeit;
    route.wartetAn = haltIndex;
    route.wartetAb = zeit + ROUTE_WARTE_TAKT;
    routeWarteHinweisPruefen(state, flotte, zeit);
    planFlotteGeaendert(state, flotte);
    return;
  }
  routeWartenBeenden(route);
  route.index = (haltIndex + 1) % route.halte.length;
  routeNaechstenHaltStarten(state, flotte, zeit);
}

function routeWartenBeenden(route) {
  if (!route) return;
  route.wartetAn = null;
  route.wartetAb = null;
  route.wartetSeit = null;
}

// Die eine Meldung aus R-7 (A-100): 24 h Spielzeit an einem Halt gewartet,
// noch keine Meldung für DIESE Wartelage. `wartetGemeldetSeit` trägt den
// `wartetSeit`-Wert, für den schon gemeldet wurde -- ein Vergleich reicht,
// kein zweiter Merker zum Zurücksetzen nötig (siehe routeAbfahrtVersuchen).
// Kein automatischer Abflug: die Meldung informiert, sie greift nicht ein.
function routeWarteHinweisPruefen(state, flotte, zeit) {
  const route = flotte.route;
  if (route.wartetSeit == null || route.wartetGemeldetSeit === route.wartetSeit) return;
  if (zeit - route.wartetSeit < ROUTE_WARTE_HINWEIS_MS) return;
  route.wartetGemeldetSeit = route.wartetSeit;
  meldungHinzufuegen(
    state,
    t("{flotte} wartet seit einem Tag auf Beladung: {anteil}/{schwelle} %.", {
      flotte: flotte.name,
      anteil: Math.round(routeBeladungAnteil(state, flotte) * 100),
      schwelle: route.mindestBeladung || 0,
    }),
    `routewarte-${flotte.id}`,
    herkunftVon(flotte)
  );
}

// Der Wartetakt: nachladen, was inzwischen dazugekommen ist, dann erneut
// fragen. `routeLadenAusfuehren` meldet nur, wenn wirklich etwas geladen
// wurde -- ein Takt ohne Nachschub bleibt still.
function routeWartenPruefen(state, flotte, zeit) {
  const route = flotte.route;
  if (!route || !route.aktiv || route.wartetAn == null) {
    routeWartenBeenden(route);
    return;
  }
  const halt = route.halte[route.wartetAn];
  const planet = flotte.dockPlanet ? planetById(state, flotte.dockPlanet) : null;
  // Halt entfernt oder Flotte nicht mehr im Hafen: die Wartelage ist
  // gegenstandslos. Weiterfahren statt stehenbleiben -- ein Zustand, den
  // niemand mehr auflösen kann, ist schlimmer als ein Halt zu früh.
  if (!halt || !planet) {
    routeWartenBeenden(route);
    if (route.halte.length) {
      route.index = ((route.wartetAn || 0) + 1) % route.halte.length;
      routeNaechstenHaltStarten(state, flotte, zeit);
    }
    return;
  }
  routeTankenAusfuehren(state, flotte, planet);
  routeLadenAusfuehren(state, flotte, planet, halt);
  routeAbfahrtVersuchen(state, flotte, route.wartetAn, zeit);
}

export function routeMindestbeladungSetzen(state, flotte, prozent) {
  const wert = Number(prozent);
  flotte.route.mindestBeladung = Number.isFinite(wert) ? Math.max(0, Math.min(100, Math.floor(wert))) : 0;
  // Eine gesenkte Schwelle muss SOFORT greifen: Wer 80 auf 20 stellt, während
  // die Flotte bei 60 % wartet, erwartet, dass sie losfährt -- und nicht, dass
  // sie den Rest des Wartetakts absitzt.
  if (flotte.route.aktiv && flotte.route.wartetAn != null) {
    routeAbfahrtVersuchen(state, flotte, flotte.route.wartetAn, spielzeitJetzt(state));
  }
  return { ok: true };
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
    meldungHinzufuegen(state, t("{flotte}: zu wenig Deuterium – Route pausiert.", { flotte: flotte.name }), null, herkunftVon(flotte));
    route.aktiv = false;
    return;
  }

  flotte.befehle = [{ art: "hafen", planetId: halt.planetId, routenIndex: route.index }];
  abschnittStarten(state, flotte, zielOrt, zeit);
}

// --- Flotten: Routen -------------------------------------------------------
//
// SEIT A-034 IST DAS FREI (Tobis Entscheidung, 17.08.: "Automatisierung
// erstmal komplett frei"). Vorher hingen Routen an der
// Automatisierungstechnik -- rund 9.250 Laborsekunden ueber vier Vorstufen,
// und damit in einer Demo praktisch unsichtbar.
//
// Der Grund ist keiner der Balance, sondern der Einordnung: eine Route ist
// BEDIENKOMFORT. Sie tut nichts, was der Spieler nicht auch von Hand tun
// koennte -- sie erspart ihm, es zwanzigmal zu tun. Komfort hinter Forschung
// zu legen heisst, den Spieler fuer seine ersten Stunden zu bestrafen, und
// zwar genau dort, wo er das Spiel noch kennenlernt.
//
// Was Forschung BLEIBT, sind die KI-Stufen (sondenKi, erkunderKi): die treffen
// Entscheidungen selbst, und dafuer ist der Freischaltmoment aus Prinzip 12
// richtig.
//
// Die Funktion bleibt stehen, statt ihre Aufrufe zu entfernen: sie ist der
// eine Ort, an dem die Frage beantwortet wird, und ein spaeteres "doch wieder
// mit Bedingung" waere eine Zeile statt einer Suche.
export function kannRouteBearbeiten() {
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

/**
 * @param zeit Startzeitpunkt des ersten Abschnitts -- der ZEHNTE Fall des
 *   Zeit-Fehlertyps (A-003/A-024). Vorgabe wie ueberall die Spielzeit.
 */
export function routeStarten(state, flotte, zeit = null) {
  const check = kannRouteBearbeiten(state);
  if (!check.ok) return check;
  if (!flotte.route.halte.length) return { ok: false, grund: t("Route hat keine Stationen.") };
  if (flotteLeer(flotte)) return { ok: false, grund: t("Die Flotte hat keine Schiffe.") };

  flotte.route.aktiv = true;
  if (!flotte.abschnitt) routeNaechstenHaltStarten(state, flotte, zeit === null ? spielzeitJetzt(state) : zeit);
  return { ok: true };
}

export function routeStoppen(state, flotte) {
  flotte.route.aktiv = false;
  // Sonst bliebe ein Wartezeitpunkt im Spielstand stehen, den niemand mehr
  // abräumt -- und ein Neustart der Route liefe in eine Wartelage von gestern.
  routeWartenBeenden(flotte.route);
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
      }),
      null, herkunftVon(flotte)
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
      }),
      null, herkunftVon(flotte)
    );
    return;
  }
  // Gruppiert: bei Schnellversand kommen 15 davon auf einmal.
  meldungHinzufuegen(
    state,
    t("{objekt}: {art} entdeckt.", { objekt: objekt.name, art: t(objekt.bezeichnung) }),
    "entdeckung",
    herkunftVon(flotte)
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
      }),
      null, herkunftVon(flotte)
    );
  } else {
    hinzufuegen(flotte.ladung, { silizium: 200 });
    meldungHinzufuegen(
      state,
      t("{objekt}: Technologie bereits bekannt – nur Material geborgen.", { objekt: objekt.name }),
      null, herkunftVon(flotte)
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

  // A-092: An einem VERSCHLOSSENEN Objekt ist ausschließlich bergbar, was
  // hier liegt -- die Quelle darunter bleibt zu. Ohne diese Unterscheidung
  // erntete eine Bergung am Antimaterie-Gürtel (verschlossen UND nachwachsend)
  // den Gürtel, während die eigene Fracht daneben liegen bliebe: die Sperre
  // wäre umgangen und der Nachlass trotzdem verloren.
  const nurRest = objektGesperrt(state, objekt);
  const nachwachsend = objekt.nachwachsend && !nurRest;
  const offen = nurRest
    ? objekt.restErtrag
    : objekt.nachwachsend
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
    if (nachwachsend) {
      uhrZurueckstellen(gesamt);
      meldungHinzufuegen(
        state,
        t("{objekt}: {fracht} geerntet – der Gürtel füllt sich wieder.", {
          objekt: objekt.name,
          fracht: buendelText(offen),
        }),
        null, herkunftVon(flotte)
      );
      return;
    }
    // `verwertet` sagt "hier ist nichts mehr zu holen" und ist endgültig.
    // Am verschlossenen Objekt wäre das falsch: geräumt ist nur der Nachlass,
    // die Quelle war nie offen und muss es nach der Forschung noch werden.
    setzeOrbitZustand(
      state,
      befehl.zielSystem,
      befehl.zielOrbit,
      nurRest ? { restErtrag: null } : { verwertet: true, restErtrag: null }
    );
    meldungHinzufuegen(
      state,
      nurRest
        ? t("{objekt}: {fracht} geborgen – die Fundstelle selbst bleibt verschlossen.", {
            objekt: objekt.name,
            fracht: buendelText(offen),
          })
        : t("{objekt}: {fracht} geladen – Fundstelle erschöpft.", {
            objekt: objekt.name,
            fracht: buendelText(offen),
          }),
      null, herkunftVon(flotte)
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
  if (nachwachsend) {
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
    }),
    null, herkunftVon(flotte)
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
  planFlotteGeaendert(state, flotte);
  meldungHinzufuegen(state, t("{objekt}: Gefecht beginnt.", { objekt: objekt.name }), null, herkunftVon(flotte));
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
      "kampfverluste", // mehrere Runden hintereinander fassen sich zusammen
      herkunftVon(flotte)
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
    }),
    null,
    herkunftVon(flotte)
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
    meldungHinzufuegen(state, t("{objekt}: {beute} erbeutet.", { objekt: objekt.name, beute: buendelText(offen) }), null, herkunftVon(flotte));
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
        }),
    null, herkunftVon(flotte)
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
  planetUhrStarten(planet, zeit);
  if (typ === "kolonie") {
    // A-132: KEIN Startvorrat mehr -- die Kolonie bekommt ausschließlich das,
    // was der Spieler im Frachtraum mitgeschickt hat. Dieselbe Stelle, an der
    // bis A-132 der Startvorrat eingebucht wurde (`insLager`), bucht jetzt die
    // Ladung; was nicht ins frische (leere) Lager passt, bleibt an Bord statt
    // zu verschwinden -- dieselbe Regel wie beim Andocken sonst auch
    // (`ladungLoeschen`).
    const { abgelehnt } = insLager(state, planet, flotte.ladung);
    flotte.ladung = abgelehnt;
    // A-043: GENAU die Menschen, die mitgereist sind -- keine Konstante, kein
    // Aufrunden. Die Summe der Menschen bleibt über Start und Ankunft
    // erhalten; das ist die eine Zahl, die beide Seiten verbindet.
    //
    // `|| 0` ist nicht Kosmetik: ein Kolonieschiff aus einem Spielstand VOR
    // A-043 hat keine Siedler an Bord. Es gründet dann eine Welt ohne
    // Menschen -- ehrlich, weil es tatsächlich keine mitgenommen hat.
    //
    // ADDIERT statt gesetzt (seit A-132): `bevoelkerung` ist selbst eine
    // LAGER_RESSOURCEN-Ressource -- eine Flotte könnte theoretisch auch
    // welche als gewöhnliche Fracht geladen haben (die generische
    // Beladen-Zeile kennt keine Sonderregel für diese eine Ressource) und
    // die stünde dann schon über `insLager(..., flotte.ladung)` oben im
    // frischen Lager. Ein `=` würde sie stillschweigend überschreiben.
    planet.ressourcen.bevoelkerung = (planet.ressourcen.bevoelkerung || 0) + (flotte.siedler || 0);
    flotte.siedler = 0;
  }
  state.planeten.push(planet);
  planPlanetNeu(state, planet);

  meldungHinzufuegen(
    state,
    typ === "kolonie"
      ? t("Kolonie auf {ort} gegründet – eigene Produktion läuft an.", { ort: objekt.name })
      : t("Außenposten auf {ort} errichtet – deine Reichweite verschiebt sich.", { ort: objekt.name }),
    null, herkunftVon(flotte)
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
    return restLiegtAn(objekt) ? "bergung" : null;
  }
  // Liegengebliebenes Material ist IMMER bergbar, unabhängig davon, was das
  // Objekt ursprünglich war -- auch auf einem leeren Orbit. Sonst wäre der
  // Nachlass einer aufgelösten Flotte dort unerreichbar.
  if (restLiegtAn(objekt)) return "bergung";
  // A-092: Die Sperre gilt der QUELLE, nicht dem, was hier liegt -- deshalb
  // steht sie NACH der Rest-Prüfung. Sie stand bis hierher überhaupt nicht in
  // dieser Funktion, sondern allein in der Oberfläche, und die sperrte
  // daraufhin den ganzen Orbit: Tobis Sonde verglühte an einem verschlossenen
  // Vorkommen, und ihr Resttank lag danach unerreichbar daneben.
  if (objektGesperrt(state, objekt)) return null;
  if (objekt.verwertet) return null;
  if (regel.zugriff === "forschung") return "forschung";
  // Bergung nur, wenn tatsächlich ein Ertrag daliegt: Planeten tragen die
  // Regel "bergung", aber nur Riesenplaneten haben einen Antimaterie-Gürtel.
  if (regel.zugriff === "bergung") return objekt.daten.ertrag ? "bergung" : null;
  return null;
}

// Kann diese Flotte diese Mission überhaupt fliegen?
// `rueckkehr` steuert die Treibstoffprüfung (A-020): ohne Rückflug muss nur
// die Hinstrecke gedeckt sein. Die Oberfläche fragt beides ab — einmal für den
// Knopf, einmal für den Aufpreis, den der Rückkehr-Schalter kostet
// (Prinzip 10a: was eine Entscheidung kostet, steht dabei).
export function kannMission(state, flotte, missionsart, systemId, orbit, rueckkehr = false) {
  const objekt = findeObjekt(state, systemId, orbit);
  if (!objekt) return { ok: false, grund: t("Unbekanntes Ziel.") };

  const schiffId = MISSIONS_SCHIFF[missionsart];
  if (schiffId && (flotte.schiffe[schiffId] || 0) < 1) {
    return { ok: false, grund: t("Flotte hat keine {schiff}.", { schiff: t(SCHIFFE[schiffId].name) }) };
  }
  const ziel = ortVonSystem(state, systemId, orbit);

  // A-152: Eine Sonde wird beim Versand automatisch für GENAU DIESE Strecke
  // betankt (missionBefehlen tankt aus dem Hafenlager nach, exakt bis zum
  // Bedarf) -- die Prüfung rechnet deshalb nicht gegen das, was JETZT im Tank
  // ist, sondern gegen das, was bis zum Start noch aus dem Lager dazukäme,
  // gedeckelt durch die Tankkapazität (dieselbe Grenze, die tanken() selbst
  // zieht -- kein zweiter Rechenweg). Nur im Hafen möglich (unterwegs gibt es
  // kein Nachtanken) und nur ohne Rückkehr (die einzige Wahl, die eine
  // Einwegsonde überhaupt anbietet) -- sonst gilt unverändert die alte
  // Prüfung gegen den mitgeführten Bestand.
  if (missionsart === "sonde" && flotte.dockPlanet && !rueckkehr) {
    const bedarf = treibstoffFuer(flotte, strecke(flotte.ort, ziel));
    const hafen = planetById(state, flotte.dockPlanet);
    const verfuegbar = Math.min(
      (flotte.treibstoff || 0) + Math.floor((hafen && hafen.ressourcen.tritium) || 0),
      flotteTankKapazitaet(state, flotte)
    );
    if (verfuegbar < bedarf) {
      return {
        ok: false,
        grund: t("Zu wenig Deuterium für dieses Ziel: {noetig} nötig, {verfuegbar} verfügbar (Tank + Lager).", {
          noetig: Math.ceil(bedarf),
          verfuegbar: Math.floor(verfuegbar),
        }),
      };
    }
    return { ok: true, treibstoffZiel: bedarf };
  }

  return kannBefehlen(state, flotte, ziel, { einweg: !rueckkehr });
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
  // A-043/A-132: mindestens ein Kolonist muss schon an Bord sein (beladen
  // wird VORHER über `siedlerUmladen`, im Hafen). Geprüft wird schon hier,
  // damit der Knopf den Grund nennen kann statt stumm zu bleiben
  // (Prinzip 10a) -- ENTSCHIEDEN wird er in `siedlerPruefen`, derselben
  // Funktion, durch die auch die Bots gehen.
  if (art === "kolonie") {
    const siedlerCheck = siedlerPruefen(flotte);
    if (!siedlerCheck.ok) return siedlerCheck;
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
  // Schnellversand heisst ausdruecklich "und wieder heim" -- der Kopf dieser
  // Sektion sagt es so, und die Sonden sind Einwegschiffe: was zurueckkommt,
  // ist die Flotte, nicht die Sonde.
  // Kolonisten sind seit A-132 längst an Bord, wenn dieser Aufruf kommt --
  // beladen wird VORHER über `siedlerUmladen` (derselbe Weg wie Fracht und
  // Treibstoff). Hier steht bewusst nichts mehr darüber.
  return missionBefehlen(state, flotte, art, systemId, orbit, { rueckkehr: true });
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
// Merker für die Partnersuche -- KEINE Änderung am Ergebnis, nur daran, wie
// oft es gerechnet wird (A-030).
//
// Gemessen im Browser: `renderMarkt` kostete 15 bis 22 ms JE SEKUNDE, und der
// Grund war nicht die Suche selbst, sondern ihre Häufigkeit. `kannVerkaufen`
// und `kannKaufen` rufen beide `partnerPruefen` und damit `handelsPartner`
// auf; die Marktansicht fragt sie je Ware. Das sind bei sechs Waren
// **dreizehn vollständige Galaxie-Durchläufe pro Bild** -- jeder über 397
// Planeten, jeder mit Erreichbarkeitsprüfung und Streckenrechnung.
//
// Derselbe Fehlertyp, der in v0.31 schon einmal die Rechenzeit gekostet hat:
// eine teure Abfrage, die in einer Schleife steckt. Die Lehre von damals
// steht in PRINZIPIEN.md -- Aufrufkosten × Aufrufhäufigkeit, und die
// Häufigkeit ist hier der Faktor.
//
// Der Schlüssel ist die Planetenuhr: innerhalb EINES Takts kann sich die
// Antwort nicht ändern. Alles, was sie ändern würde (eine neue Kolonie, eine
// gekippte Beziehung, ein zerstörter Posten), passiert über ein Ereignis --
// und ein Ereignis rückt `letzterTick` vor. Schlimmster Fall ist also eine
// Antwort, die eine Sekunde alt ist; sichtbar ist das nicht.
let partnerMerker = { tick: -1, planetId: -1, wert: null };

export function handelsPartner(state, planet) {
  if (!planet) return null;
  if (partnerMerker.tick === state.letzterTick && partnerMerker.planetId === planet.id) {
    return partnerMerker.wert;
  }
  const gefunden = handelsPartnerSuchen(state, planet);
  partnerMerker = { tick: state.letzterTick, planetId: planet.id, wert: gefunden };
  return gefunden;
}

function handelsPartnerSuchen(state, planet) {
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
// Eine Absage, die sagt, WORAN es liegt (A-009, Prinzip 10a).
//
// Der Satz nennt die fehlenden Ressourcen in Klammern statt in einem eigenen
// Teilsatz -- so stimmt er für eine wie für drei, und niemand muss ein
// Genus- oder Numerusfeld pflegen. Dieselbe Überlegung wie bei „{res} gibt es
// hier nicht" weiter unten.
//
// `fehlt` kommt als Feld mit: die Oberfläche kann daran die betroffene
// Kostenzeile hervorheben, ohne den Satz zu zerlegen.
function nichtGenug(bestand, kosten) {
  const fehlt = fehlende(bestand, kosten);
  return {
    ok: false,
    fehlt,
    grund: t("Nicht genug Ressourcen ({res}).", {
      res: fehlt.map((resId) => t(RESSOURCEN[resId].name)).join(", "),
    }),
  };
}

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
        // Mit Tausenderpunkten (A-044): seit dieser Satz nicht mehr im
        // Tooltip steht, sondern auf der Kachel, wird er auf einen Blick
        // gelesen -- und "60000" liest sich nicht auf einen Blick.
        grund: t("Braucht {noetig} Bevölkerung (aktuell {aktuell}).", {
          noetig: fmt(Math.round(def.bevoelkerungAb)),
          aktuell: fmt(Math.round(menschen)),
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
  //  heisst: alles stimmt ausser dem Kontostand. Seit A-012 darf man
  // in dieser Lage trotzdem EINREIHEN -- der Auftrag wartet dann vorn in der
  // Schlange, bis das Material da ist. Die Absage bleibt trotzdem eine Absage,
  // damit die Oberflaeche weiter sagen kann, was fehlt (Prinzip 10a), und
  // damit die Bot-Routine unveraendert nach Bezahlbarkeit auswaehlt.
  if (!reichenAus(planet.ressourcen, kosten)) {
    return { ...nichtGenug(planet.ressourcen, kosten), kosten, level, nurGeld: true };
  }
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
// --- FIFO OHNE RESERVIERUNG (A-012, v0.96) --------------------------------
//
// Tobis Punkt 26 aus dem ersten Demo-Durchlauf: „Man sollte Dinge immer bauen
// können, auch wenn die Ressourcen nicht da sind. Gerade für die Demo wichtig,
// da Menschen nicht 24/7 durchspielen können."
//
// DIE ENTSCHEIDUNG (Tobi, 16.08.) und warum sie so und nicht anders lautet:
// der vorderste Auftrag WARTET, bis der volle Betrag da ist, zahlt DANN und
// startet. Keine eingefrorenen Ressourcen, keine Teilzahlung.
//
//   - Reservierung hätte bedeutet, dass ein eingereihter Bau Material bindet,
//     das man gerade dringender braucht -- und der Spieler sähe einen Vorrat,
//     über den er nicht verfügen kann. Ein Bestand, der lügt, ist schlimmer
//     als eine Warteschlange, die wartet.
//   - Teilzahlung hätte einen Zustand „halb bezahlt" erzeugt, den jeder
//     Abbruch, jede Erstattung und jede Anzeige einzeln kennen müsste.
//
// Ein Kopf hat damit ZWEI Zustände, und `fertigZeit` unterscheidet sie:
// `null` heißt wartend (nichts gezahlt), gesetzt heißt laufend (bezahlt).
// Das ist bewusst kein neues Feld -- ein zweiter Merker könnte von der
// Wahrheit abweichen, dieser kann es nicht.
export function bauStarten(state, planet, gebaeudeId, zeit = null, nurWennBezahlbar = false) {
  const check = kannBauen(state, planet, gebaeudeId);
  // Fehlt NUR das Material, wird trotzdem eingereiht -- ausser der Aufrufer
  // besteht auf Bezahlbarkeit. Genau das tun die Bots: ihre Auswahl haengt
  // daran, was sie sich JETZT leisten koennen, und ein wartender Auftrag
  // wuerde ihre Bauschleife blockieren (zweiter Bot-Fehlertyp).
  if (!check.ok && !(check.nurGeld && !nurWennBezahlbar)) return check;

  const dauerSek = bauzeitFuerLevel(BUILDINGS[gebaeudeId], check.level);
  if (!planet.bauQueue) {
    // Als WARTENDER Kopf einreihen und sofort versuchen zu starten. Ist das
    // Material da, ist der Unterschied zum alten Verhalten null -- genau das
    // sichern die bestehenden Tests ab.
    planet.bauQueue = { gebaeudeId, zielLevel: check.level, dauerSek, startZeit: null, fertigZeit: null };
    kopfPruefen(state, planet, zeit === null ? spielzeitJetzt(state) : zeit);
  } else {
    planet.bauWarteschlange.push({ gebaeudeId, zielLevel: check.level, dauerSek });
  }
  planetGeaendert(planet);
  return { ok: true };
}

// Was der wartende Kopf kostet. EINE Stelle für beide Warteschlangen, damit
// „was fehlt noch" und „was wird abgebucht" nie auseinanderlaufen können.
export function kopfKosten(planet, kopf, art) {
  if (!kopf) return null;
  return art === "bau"
    ? gebaeudeKosten(planet, BUILDINGS[kopf.gebaeudeId], kopf.zielLevel)
    : schiffKosten(planet, kopf.schiffId, kopf.anzahl);
}

// Worauf wartet der Kopf, und wie lange noch? Fuer die Anzeige (A-012).
//
// Gibt  zurueck, wenn nichts wartet.  heisst: es
// fehlt etwas, das gar nicht nachlaeuft -- dann gibt es keine ehrliche
// Restzeit, und die Oberflaeche sagt das auch so.
//
// Steht hier und nicht in ui.js, weil es dieselbe Rechnung ist wie in
// : was fehlt, geteilt durch die Rate. Zwei Kopien davon
// waeren zwei Wahrheiten darueber, wann ein Auftrag anlaeuft.
export function wartetAuf(state, planet, kopf, art) {
  if (!kopf || kopf.fertigZeit !== null) return null;
  const kosten = kopfKosten(planet, kopf, art);
  const { lager } = effektiveRaten(state, planet);
  const fehlend = [];
  let sekunden = 0;
  for (const [resId, betrag] of Object.entries(kosten)) {
    const fehlt = betrag - (planet.ressourcen[resId] || 0);
    if (fehlt <= 0) continue;
    fehlend.push({ resId, fehlt });
    const rate = lager[resId] || 0;
    if (rate <= 0) sekunden = null;
    else if (sekunden !== null) sekunden = Math.max(sekunden, (fehlt / rate) * 3600);
  }
  if (!fehlend.length) return null;
  return { fehlend, sekunden, text: buendelText(Object.fromEntries(fehlend.map((f) => [f.resId, Math.ceil(f.fehlt)]))) };
}

// Wann kommt der Eintrag an Position `index` einer Warteschlange dran? (A-086)
//
// Die Rechnung ist bewusst stumpf: Restzeit des laufenden Auftrags plus die
// Bauzeiten aller Einträge davor. Genau deshalb ist sie MONOTON FALLEND und
// steht bei Pause still -- beides Zusicherungen des Auftrags. Sie kommt aus
// `fertigZeit` und festen Dauern, nicht aus Raten; eine Schätzung aus Raten
// (wie `wartetAuf` sie für den wartenden KOPF braucht) springt, sobald die
// Wirtschaft sich ändert, und war als Anzeige für wartende Einträge der
// dritte Befund von A-086.
//
// `kopfRestSek === null` heißt: der laufende Auftrag hat selbst noch kein
// Ende (er wartet auf Material). Dann ist der Startzeitpunkt UNBEKANNT, und
// die Antwort ist null statt einer Phantasiezahl -- dieselbe Regel wie bei
// der Lagerprognose: was man nicht weiß, sagt man nicht.
export function warteStartSekunden(kopfRestSek, warteschlange, index, dauerVon = (e) => e.dauerSek || 0) {
  if (kopfRestSek === null || kopfRestSek === undefined || !Number.isFinite(kopfRestSek)) return null;
  let sekunden = Math.max(0, kopfRestSek);
  for (let i = 0; i < index; i++) sekunden += dauerVon(warteschlange[i]) || 0;
  // Unendlich kommt aus der FORSCHUNG: ohne Labor hat ein Eintrag keine Dauer.
  // Auch das ist ein Nichtwissen und wird als solches gemeldet -- „startet in
  // ~steht still" wäre der Satz, den diese Zeile gerade abstellt.
  return Number.isFinite(sekunden) ? sekunden : null;
}

// Restzeit eines laufenden Kopfes in Sekunden -- null, solange er auf Material
// wartet (`fertigZeit === null`, siehe die Zwei-Zustände-Regel bei bauStarten).
export function kopfRestSekunden(kopf, jetzt) {
  if (!kopf || kopf.fertigZeit === null || kopf.fertigZeit === undefined) return null;
  return (kopf.fertigZeit - jetzt) / 1000;
}

// Der Kopf einer Warteschlange, sofern er WARTET (noch nicht bezahlt).
export function wartenderKopf(planet, art) {
  const kopf = art === "bau" ? planet.bauQueue : planet.werftQueue;
  return kopf && kopf.fertigZeit === null ? kopf : null;
}

// Zahlt den wartenden Kopf, wenn das Material da ist, und startet ihn.
//
// WIRD AN GENAU DREI STELLEN GERUFEN: beim Einreihen, beim Abschluss des
// Vorgängers und aus dem Ereignis „bezahlbar". Mehr Stellen gibt es nicht,
// und das ist Absicht -- ein vierter Aufrufer wäre eine vierte Gelegenheit,
// die Zeit falsch durchzureichen.
export function kopfPruefen(state, planet, zeit) {
  for (const art of ["bau", "werft"]) {
    const kopf = wartenderKopf(planet, art);
    if (!kopf) continue;
    const kosten = kopfKosten(planet, kopf, art);
    if (!reichenAus(planet.ressourcen, kosten)) continue;
    abziehen(planet.ressourcen, kosten);
    kopf.startZeit = zeit;
    kopf.fertigZeit = zeit + kopf.dauerSek * 1000;
    planetGeaendert(planet);
  }
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
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }), null, herkunftVon(planet));
  }
  return { ok: true };
}

// Einen wartenden Auftrag um einen Platz verschieben (A-080).
//
// EINE Funktion für alle drei Schlangen: Bau, Forschung und Werft halten
// dieselbe Liste aus Einträgen, und Umsortieren fragt nach nichts darin --
// es tauscht zwei Nachbarn. Prinzip 5: ein Mechanismus, nicht drei.
//
// Was diese Funktion NICHT anfasst, ist der laufende Auftrag. Er steht nicht
// in dieser Liste (bauQueue/forschungsQueue/werftQueue sind eigene Felder),
// und er ist bezahlt und angefangen -- ihn zu verschieben hieße, ihn
// abzubrechen. Wer ihn loswerden will, nimmt das Abbrechen-Kreuz.
//
// `richtung` ist -1 (nach vorn) oder +1 (nach hinten). Am Rand passiert
// nichts, und das ist kein Fehler: der erste Eintrag kann nicht weiter nach
// vorn. Deshalb `ok: false` mit Grund statt eines Wurfs -- die Anzeige sperrt
// die Knöpfe ohnehin, aber ein Tastendruck darf nie etwas zerlegen.
export function warteschlangeUmordnen(warteschlange, von, nach) {
  if (!Array.isArray(warteschlange)) return { ok: false, grund: t("Keine Warteschlange.") };
  if (!warteschlange[von]) return { ok: false, grund: t("Eintrag nicht gefunden.") };
  if (!Number.isInteger(nach) || nach < 0 || nach >= warteschlange.length) {
    return { ok: false, grund: t("Dort ist kein Platz mehr.") };
  }
  if (von === nach) return { ok: true, index: nach };
  const [eintrag] = warteschlange.splice(von, 1);
  warteschlange.splice(nach, 0, eintrag);
  return { ok: true, index: nach };
}

// Der Sonderfall davon, den die beiden Knöpfe brauchen: einen Platz weiter.
// `richtung` ist -1 (nach vorn) oder +1 (nach hinten). Am Rand passiert
// nichts, und das ist kein Fehler -- der erste Eintrag kann nicht weiter nach
// vorn. Deshalb `ok: false` mit Grund statt eines Wurfs: die Anzeige sperrt
// die Knöpfe ohnehin, aber ein Tastendruck darf nie etwas zerlegen.
export function warteschlangeVerschieben(warteschlange, index, richtung) {
  if (!Array.isArray(warteschlange)) return { ok: false, grund: t("Keine Warteschlange.") };
  return warteschlangeUmordnen(warteschlange, index, index + richtung);
}

// Bricht den GERADE LAUFENDEN Bau ab (nicht die Warteschlange dahinter) --
// volle Erstattung, kein Zeitanteil-Abzug, dieselbe einfache v1-Regel wie
// beim Entfernen aus der Warteschlange. Rückt danach den nächsten
// Warteschlangeneintrag nach (startet jetzt, nicht zur ursprünglich
// geplanten Zeit -- der Bau wurde ja gerade erst abgebrochen).
export function bauAbbrechen(state, planet) {
  if (!planet.bauQueue) return { ok: false, grund: t("Kein laufender Bauauftrag.") };
  const abgebrochen = planet.bauQueue;
  // ERSTATTET WIRD NUR, WAS BEZAHLT WURDE (A-012). Ein wartender Auftrag hat
  // nie gezahlt -- ihn zu erstatten waere eine Gelddruckmaschine: einreihen,
  // abbrechen, kassieren. Der Erstattungspfad samt seiner Lager-voll-Meldung
  // bleibt fuer laufende Auftraege unveraendert.
  const laeuft = abgebrochen.fertigZeit !== null;
  const kosten = gebaeudeKosten(planet, BUILDINGS[abgebrochen.gebaeudeId], abgebrochen.zielLevel);
  const { abgelehnt } = laeuft ? insLager(state, planet, kosten) : { abgelehnt: {} };
  const naechster = planet.bauWarteschlange.shift();
  const jetzt = spielzeitJetzt(state);
  planet.bauQueue = naechster ? { ...naechster, startZeit: null, fertigZeit: null } : null;
  kopfPruefen(state, planet, jetzt);
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }), null, herkunftVon(planet));
  }
  return { ok: true };
}

// A-134: fraktionsgebunden über fraktionVon(planet) -- derselbe Weg wie bei
// kannBauen/bauStarten, die auch nur den Planeten kennen, nicht die
// Fraktion direkt. Ein Spieler-Aufruf ändert sich dadurch nicht: seine
// Planeten liefern SPIELER_FRAKTION wie bisher.
export function kannForschen(state, planet, forschungId) {
  const fraktionId = fraktionVon(planet);
  if (!forschungVerfuegbar(state, forschungId)) {
    return { ok: false, grund: t("Diese Technologie ist noch unbekannt.") };
  }
  if (!forschungVoraussetzungenErfuellt(state, forschungId, fraktionId)) {
    return { ok: false, grund: t("Benötigt {voraussetzungen}.", { voraussetzungen: voraussetzungenText(forschungId) }) };
  }
  const laenge = (forschungsQueueVon(state, fraktionId) ? 1 : 0) + forschungsWarteschlangeVon(state, fraktionId).length;
  if (laenge >= BAUWARTESCHLANGE_MAX) {
    return { ok: false, grund: t("Warteschlange voll ({max}/{max}).", { max: BAUWARTESCHLANGE_MAX }) };
  }

  const def = RESEARCH[forschungId];
  const level = naechstesForschungLevel(state, forschungId, fraktionId);
  if (def.schluessel && level > 1) return { ok: false, grund: t("Bereits erforscht.") };
  // Seit v0.6 wird nicht mehr vorab bezahlt, sondern laufend geforscht. Die
  // einzige Bedingung ist deshalb, dass es überhaupt jemanden gibt, der es
  // tut -- ein Auftrag ohne Labor bliebe für immer bei null Prozent stehen,
  // und ein Knopf, der das zulässt, verstößt gegen Prinzip 10a.
  if (!hatLabor(state, fraktionId)) {
    return { ok: false, grund: t("Kein Forschungslabor im Imperium – ohne Labor forscht niemand.") };
  }
  return { ok: true, level, aufwand: forschungsAufwand(def, level) };
}

// Läuft schon eine Forschung, wird der neue Auftrag eingereiht -- gleiches
// Muster wie bauStarten, nur ohne Zahlung: bezahlt wird durch den laufenden
// Betrieb der Labore, nicht beim Klick.
/**
 * @param zeit Startzeitpunkt der Forschung. Vorgabe ist die Spielzeit --
 *   richtig fuer die Oberflaeche, denn dort IST gerade jetzt. Werkzeuge und
 *   KI reichen ihre Schleifenzeit durch.
 *
 *   DAS WAR DER NEUNTE FALL des Zeit-Fehlertyps und der erste, der NICHT
 *   durch einen Fehler auffiel, sondern durch eine Messung, die nicht stimmen
 *   konnte (A-003): solange die Funktion die Wanduhr las, wurde eine aus einem
 *   Werkzeug-Takt gestartete Forschung sofort fertig, sobald die simulierte
 *   Uhr der echten vorausgelaufen war. Kein Werkzeug hat die Forschung
 *   deshalb je ehrlich gemessen.
 */
export function forschungStarten(state, planet, forschungId, zeit = null) {
  const check = kannForschen(state, planet, forschungId);
  if (!check.ok) return check;

  const eintrag = { forschungId, zielLevel: check.level, aufwand: check.aufwand };
  const fraktionId = fraktionVon(planet);
  // A-134: dieselbe Tür wie beim Spieler (Kosten/Voraussetzungen sind mit
  // kannForschen oben schon geprüft) -- nur das ZIEL des Eintrags wechselt
  // für eine fremde Fraktion vom globalen state auf ihr eigenes Regal.
  if (fraktionId === SPIELER_FRAKTION) {
    if (!state.forschungsQueue) {
      state.forschungsQueue = neueForschungsQueue(eintrag, zeit === null ? spielzeitJetzt(state) : zeit);
    } else {
      state.forschungsWarteschlange.push(eintrag);
    }
  } else {
    const fraktion = fraktionById(state, fraktionId);
    if (!fraktion.forschungsQueue) {
      fraktion.forschungsQueue = neueForschungsQueue(eintrag, zeit === null ? spielzeitJetzt(state) : zeit);
    } else {
      if (!fraktion.forschungsWarteschlange) fraktion.forschungsWarteschlange = [];
      fraktion.forschungsWarteschlange.push(eintrag);
    }
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

  // Werftstufe entscheidet, WELCHE Typen ueberhaupt gehen (A-027). Die
  // Pruefung steht VOR der Kostenpruefung: "dafuer ist deine Werft zu klein"
  // ist die naechstliegende Auskunft, und sie aendert sich nicht dadurch, dass
  // man spaeter mehr Geld hat.
  const noetigeStufe = SCHIFFE[schiffId].werftAb || 1;
  const stufe = planet.gebaeude.werft || 0;
  if (stufe < noetigeStufe) {
    return {
      ok: false,
      grund: t("Braucht Werft Stufe {noetig} (aktuell {aktuell}).", { noetig: noetigeStufe, aktuell: stufe }),
    };
  }

  const kosten = schiffKosten(planet, schiffId, anzahl);
  if (!reichenAus(planet.ressourcen, kosten)) {
    return { ...nichtGenug(planet.ressourcen, kosten), kosten, nurGeld: true };
  }
  return { ok: true, kosten };
}

// Läuft die Werft schon, wird der Auftrag eingereiht -- gleiches Muster.
//
// `zeit` ist optional und die Oberfläche lässt sie weg -- ein Klick passiert
// jetzt, da sind Wanduhr und Ereigniszeit dasselbe. Aus einem EREIGNIS heraus
// (Bot-Takt) sind sie es nicht, und dann muss die übergebene Zeit gelten.
//
// FEHLERTYP-ZAEHLER, EINE STELLE (A-024): dieser Kommentar ist der Stand.
// Zehn Faelle, der letzte am 17.08.2026 mit A-024 umgestellt --
//  (neunter) und  (zehnter). Damit nehmen
// ALLE bekannten zeitnehmenden Funktionen ihre Zeit entgegen. Andere
// Fundstellen (js/data.js zur MASSSTAB-Falle, tests/README.md,
// README.md) zaehlen ihre EIGENEN Fehlertypen und sind nicht dieselbe Reihe --
// wer hier hochzaehlt, zaehlt nur diese eine.
//
// Wer einen elften findet, traegt ihn HIER ein und flickt nicht still.
//
// SECHSTER FALL desselben Fehlertyps in diesem Projekt, und er hat sich genau
// so gezeigt wie die fünf davor: die Bot-Imperien bauten am 2026-08-16 ein
// Kolonieschiff, dessen Fertigzeit nach der Wanduhr gerechnet wurde. In der
// simulierten Zeit lag sie damit weit in der Zukunft, der Auftrag wurde nie
// fertig -- und weil er die Werft belegte, kam auch kein zweiter durch. Nach
// hundert Tagen stand die Warteschlange unverändert, und keine einzige Kolonie
// war entstanden. Betroffen und behoben sind inzwischen: befehleSetzen,
// missionBefehlen, bauStarten, die Puffergrenze und jetzt schiffBauen.
// `zielFlotte` (A-151, optional, letzter Parameter): die ID einer Flotte, in
// die die fertigen Schiffe direkt sollen, statt in den Hafen. Wird NICHT
// sofort geprüft (die Flotte kann bis zur Fertigstellung noch abgedockt
// werden) -- gültig ist sie erst bei werftAbschliessen, wo die Prüfung sitzt.
export function schiffBauen(state, planet, schiffId, anzahl = 1, zeit = null, nurWennBezahlbar = false, zielFlotte = null) {
  const check = kannSchiffBauen(state, planet, schiffId, anzahl);
  if (!check.ok && !(check.nurGeld && !nurWennBezahlbar)) return check;

  const dauerSek = schiffsBauzeitSek(planet, schiffId, anzahl);
  if (!planet.werftQueue) {
    planet.werftQueue = { schiffId, anzahl, dauerSek, startZeit: null, fertigZeit: null, zielFlotte };
    kopfPruefen(state, planet, zeit ?? spielzeitJetzt(state));
  } else {
    planet.werftWarteschlange.push({ schiffId, anzahl, dauerSek, zielFlotte });
  }
  planetGeaendert(planet);
  return { ok: true };
}

export function werftWarteschlangeEntfernen(state, planet, index) {
  const eintrag = planet.werftWarteschlange[index];
  if (!eintrag) return { ok: false, grund: t("Eintrag nicht gefunden.") };
  const kosten = schiffKosten(planet, eintrag.schiffId, eintrag.anzahl);
  const { abgelehnt } = insLager(state, planet, kosten);
  planet.werftWarteschlange.splice(index, 1);
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }), null, herkunftVon(planet));
  }
  return { ok: true };
}

// Bricht den GERADE LAUFENDEN Schiffbau ab -- gleiche Regel wie bauAbbrechen.
export function werftAbbrechen(state, planet) {
  if (!planet.werftQueue) return { ok: false, grund: t("Kein laufender Schiffbau.") };
  const abgebrochen = planet.werftQueue;
  const laeuft = abgebrochen.fertigZeit !== null;
  const kosten = schiffKosten(planet, abgebrochen.schiffId, abgebrochen.anzahl);
  const { abgelehnt } = laeuft ? insLager(state, planet, kosten) : { abgelehnt: {} };
  const naechster = planet.werftWarteschlange.shift();
  const jetzt = spielzeitJetzt(state);
  planet.werftQueue = naechster ? { ...naechster, startZeit: null, fertigZeit: null } : null;
  kopfPruefen(state, planet, jetzt);
  if (Object.keys(abgelehnt).length) {
    meldungHinzufuegen(state, t("{planet}: Lager voll – Erstattung teilweise verloren.", { planet: planet.name }), null, herkunftVon(planet));
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
