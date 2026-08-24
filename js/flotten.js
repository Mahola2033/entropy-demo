// Flotten.
//
// Kern der Kursänderung: Eine Flotte hat eine POSITION und eine BEFEHLSLISTE.
// Sie ist kein Ereignis mit Deadline mehr, sondern ein Ding, das irgendwo ist.
// Erst dadurch gibt es überhaupt etwas umzuleiten.
//
// Wichtig für die Offline-Simulation: Es wird NICHT pro Sekunde bewegt.
// Jeder Streckenabschnitt hat weiterhin eine berechnete Ankunftszeit, die als
// Ereignis in vorspulenBisJetzt läuft. Die Position wird nur bei Bedarf
// interpoliert -- für die Anzeige und im Moment des Umleitens.

import { SCHIFFE, FLOTTE, RESEARCH, SONDE, unterlichtSekundenProEinheit } from "./data.js";
import { systemPosition, entfernung } from "./galaxie.js";
// Zugriff dieser Datei auf state.js: Zugehörigkeit (fraktionVon/planetenVon)
// und seit A-133 der Forschungsstand einer Fraktion (forschungVon). Beides
// hier nachzubauen wäre dieselbe Grenze an zwei Stellen -- genau das Muster,
// an dem das Produktionsmodell in v0.18 einmal auseinandergelaufen ist. Kein
// Kreis: state.js kennt flotten.js nicht.
import { planetenVon, fraktionVon, forschungVon } from "./state.js";
import { SPIELER_FRAKTION } from "./data.js";
import { t } from "./sprache.js";

// --- Position -------------------------------------------------------------
// Ein Ort ist immer { x, y, systemId|null, orbit|null }.
export function ortVonSystem(state, systemId, orbit) {
  const pos = systemPosition(state.galaxie.seed, systemId);
  return { x: pos.x, y: pos.y, systemId, orbit: orbit ?? null };
}

export function ortVonPlanet(state, planet) {
  return ortVonSystem(state, planet.systemId, planet.orbit);
}

// Wo ist die Flotte zum Zeitpunkt t? Unterwegs wird linear interpoliert.
export function flottePosition(state, flotte, zeitpunkt) {
  const ab = flotte.abschnitt;
  if (!ab) return flotte.ort;

  const gesamt = ab.ankunftZeit - ab.startZeit;
  const anteil = gesamt <= 0 ? 1 : Math.min(1, Math.max(0, (zeitpunkt - ab.startZeit) / gesamt));

  // Innerhalb eines Systems bleibt die Galaxie-Position gleich, nur der
  // Orbit wandert.
  if (ab.von.systemId !== null && ab.von.systemId === ab.nach.systemId) {
    return {
      x: ab.nach.x,
      y: ab.nach.y,
      systemId: ab.nach.systemId,
      orbit: Math.round(ab.von.orbit + (ab.nach.orbit - ab.von.orbit) * anteil),
    };
  }

  return {
    x: ab.von.x + (ab.nach.x - ab.von.x) * anteil,
    y: ab.von.y + (ab.nach.y - ab.von.y) * anteil,
    // Unterwegs zwischen Systemen gehört die Flotte zu keinem System.
    systemId: anteil >= 1 ? ab.nach.systemId : null,
    orbit: anteil >= 1 ? ab.nach.orbit : null,
  };
}

// Strecke zwischen zwei Orten in Galaxie-Einheiten.
export function strecke(vonOrt, nachOrt) {
  const raum = Math.hypot(nachOrt.x - vonOrt.x, nachOrt.y - vonOrt.y);
  const gleichesSystem =
    vonOrt.systemId !== null && vonOrt.systemId === nachOrt.systemId && raum < 0.01;
  const orbitTeil =
    gleichesSystem && vonOrt.orbit !== null && nachOrt.orbit !== null
      ? Math.abs(nachOrt.orbit - vonOrt.orbit) * FLOTTE.orbitAnteil
      : (nachOrt.orbit || 0) * FLOTTE.orbitAnteil;
  return raum + orbitTeil;
}

// --- Flottenwerte ---------------------------------------------------------
export function schiffeGesamt(flotte) {
  return Object.values(flotte.schiffe).reduce((a, b) => a + b, 0);
}

export function flotteLeer(flotte) {
  return schiffeGesamt(flotte) === 0;
}

// Langsamstes Schiff bestimmt das Tempo des Verbands.
export function flotteTempo(flotte) {
  let tempo = Infinity;
  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    if (anzahl > 0) tempo = Math.min(tempo, SCHIFFE[id].tempo);
  }
  return Number.isFinite(tempo) ? tempo : 1;
}

export function flotteKapazitaet(state, flotte) {
  // A-133: die Frachttechnik der FLOTTE, nicht die des Spielers -- eine
  // Bot-Flotte darf die Forschung des Spielers nicht mitbenutzen.
  // `forschungVon` ist die einzige Stelle, die weiß, wo ein Forschungsstand
  // wohnt; ein zweiter Zugriff auf `state.forschung` hier wäre der Rückfall.
  const forschung = forschungVon(state, fraktionVon(flotte));
  const bonus = 1 + (forschung.frachttechnik || 0) * RESEARCH.frachttechnik.kapazitaetProLevel;
  let kap = 0;
  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    kap += SCHIFFE[id].kapazitaet * anzahl;
  }
  return Math.round(kap * bonus);
}

export function ladungGesamt(flotte) {
  return Object.values(flotte.ladung || {}).reduce((a, b) => a + b, 0);
}

// --- Tank (v0.64) ---------------------------------------------------------
// Bis v0.63 war Treibstoff unbegrenzt: eine Flotte konnte tanken, so viel im
// Planetenlager lag. Reichweite hing damit allein an der Antriebstechnik und
// war keine Entscheidung, sondern eine Zahl.
//
// Tobis Vorgabe: **Tank je Schiffstyp, und über freien Frachtraum nach Bedarf
// erweiterbar.** Beides steckt hier drin, und aus der Kombination fällt
// etwas heraus, das vorher nicht da war:
//
//   Die Reichweite einer Flotte ist tank/verbrauch -- ein GEWICHTETER
//   Mittelwert über ihre Schiffe. Die Typen tragen absichtlich verschiedene
//   Reichweiten (Sonde 200 Einheiten, Kriegsschiff und Frachter 60), also
//   verkürzt jedes Kriegsschiff die Reichweite eines Erkunderverbands.
//   Wer weit will, nimmt wenig mit -- oder einen Frachter als Tanker.
//
// Der Frachter ist damit doppelt nützlich, ohne dass ihm jemand eine
// Sonderregel gegeben hätte: sein Frachtraum ist der einzige Ort, an dem
// zusätzlicher Treibstoff Platz findet.
export function flotteBasisTank(flotte) {
  let summe = 0;
  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    if (anzahl > 0) summe += (SCHIFFE[id].tank || 0) * anzahl;
  }
  return summe;
}

// --- Kolonistenraum (A-132) ------------------------------------------------
// Genau dasselbe Muster wie flotteBasisTank: ein eigener Raum je Schiffstyp
// (heute nur das Kolonieschiff, siedlerKapazitaet fehlt bei den anderen und
// liest sich über `|| 0` als null), summiert über die Flotte -- und wie der
// Tank NICHT Teil des Frachtraums. R-23, Tobis Entscheidung: „erstmal
// eigener Lagerraum für Kolonisten. Die Restlichen Ressourcen teilen sich
// ein Lager." flotteKapazitaet rechnet einen Forschungsbonus mit
// (Frachttechnik) -- für Kolonisten gibt es keinen, deshalb hier keine
// state-Abhängigkeit.
export function flotteSiedlerKapazitaet(flotte) {
  let summe = 0;
  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    if (anzahl > 0) summe += (SCHIFFE[id].siedlerKapazitaet || 0) * anzahl;
  }
  return summe;
}

// Treibstoff über dem Basistank liegt in Blasentanks im Frachtraum und
// belegt dort Platz -- er konkurriert also mit der Ladung.
export function treibstoffImFrachtraum(flotte) {
  return Math.max(0, (flotte.treibstoff || 0) - flotteBasisTank(flotte));
}

// Wie viel Fracht noch hineinpasst. Das ist die Zahl, gegen die jedes Beladen
// prüfen muss -- NICHT flotteKapazitaet, sonst würde der Zusatztreibstoff
// stillschweigend überschrieben.
export function frachtraumFrei(state, flotte) {
  return Math.max(0, flotteKapazitaet(state, flotte) - ladungGesamt(flotte) - treibstoffImFrachtraum(flotte));
}

// Wie viel Treibstoff insgesamt hineinpasst: die Schiffstanks plus der
// Frachtraum, der gerade nicht durch Ladung belegt ist.
export function flotteTankKapazitaet(state, flotte) {
  return flotteBasisTank(flotte) + Math.max(0, flotteKapazitaet(state, flotte) - ladungGesamt(flotte));
}

// --- Füllstands-Balken (A-118) ---------------------------------------------
// Der Frachtraum bekommt denselben gestapelten Balken wie das Lager (Tobis
// Vorgabe: "das Model vom Lager klauen"). Was hier steht, ist NUR die
// Rechnung -- Anteil je Ressource, sortiert nach Menge absteigend, genau wie
// die Lager-Segmente in ui.js. Farbe (RESSOURCEN[id].farbe) und Titeltext
// (t()) bleiben in ui.js, dieselbe Aufteilung wie bei A-114s ausbauVorschau:
// ui.js läuft in keinem Test, die Zahl gehört deshalb hierher.
export function flotteLadungAnteile(state, flotte) {
  const kap = flotteKapazitaet(state, flotte);
  return Object.entries(flotte.ladung || {})
    .filter(([, menge]) => menge > 0)
    .map(([resId, menge]) => ({ resId, menge, anteil: kap > 0 ? menge / kap : 0 }))
    .sort((a, b) => b.menge - a.menge);
}

// Tankfüllstand als Ein-Segment-Liste -- gleiche Rechnung (Menge über
// Kapazität), nur mit flotteTankKapazitaet statt flotteKapazitaet und immer
// höchstens einem Eintrag, es gibt nur eine Sorte Treibstoff. Leerer Tank
// liefert eine leere Liste (wie ein leeres Lager keine Segmente hat) -- der
// Rahmen bleibt trotzdem stehen, das zeichnet ui.js.
export function flotteTankAnteile(state, flotte) {
  const menge = flotte.treibstoff || 0;
  if (menge <= 0) return [];
  const kap = flotteTankKapazitaet(state, flotte);
  return [{ resId: "tritium", menge, anteil: kap > 0 ? menge / kap : 0 }];
}

// Was der Verband je Streckeneinheit verbrennt. Stand dreimal ausgeschrieben
// da (Reichweite bei vollem Tank, Reichweite mit dem Bestand, Verbrauch) --
// dieselbe Summe an drei Orten ist dieselbe Grenze an drei Orten (Prinzip 5).
function verbrauchProStrecke(flotte) {
  let proStrecke = 0;
  for (const [id, anzahl] of Object.entries(flotte.schiffe)) {
    proStrecke += (SCHIFFE[id].verbrauchProStrecke || 0) * anzahl;
  }
  return proStrecke;
}

// Reichweite in Galaxie-Einheiten bei vollem Tank, einfache Strecke.
// Entscheidungsrelevant und gehört deshalb sichtbar an die Flotte
// (Prinzip 10a).
export function flotteReichweite(state, flotte) {
  const proStrecke = verbrauchProStrecke(flotte);
  if (proStrecke <= 0) return 0;
  return flotteTankKapazitaet(state, flotte) / proStrecke;
}

// Wie weit die Flotte mit dem Treibstoff kommt, DER GERADE AN BORD IST --
// einfache Strecke, in Galaxie-Einheiten. Das ist die Zahl, die der
// Reichweitenring auf der Karte zeichnet (A-056), und sie ist bewusst die
// EXAKTE UMKEHRUNG von treibstoffFuer: eine Strecke d ist genau dann gedeckt,
// wenn d <= flotteRestreichweite(flotte). Deshalb steht hier ein `floor` und
// die Mindestverbrauchs-Schranke, nicht nur eine Division --
//   * treibstoffFuer rundet AUF (`Math.ceil`), die letzte bezahlbare Strecke
//     gehört also zum abgerundeten Tankinhalt, nicht zum echten;
//   * jeder Abflug kostet mindestens FLOTTE.mindestVerbrauch. Wer den nicht
//     hat, kommt keinen Millimeter weit -- ein Ring mit "fast null" Radius
//     würde etwas anderes behaupten.
// Ein Verband ohne Schiffe (oder ohne Verbrauch) bekommt 0 statt unendlich:
// er ist ohnehin nicht befehlbar, und ein Ring über die halbe Galaxie wäre
// die falsche Auskunft.
export function flotteRestreichweite(flotte) {
  const proStrecke = verbrauchProStrecke(flotte);
  if (proStrecke <= 0) return 0;
  const tank = Math.floor(flotte.treibstoff || 0);
  if (tank < FLOTTE.mindestVerbrauch) return 0;
  const weite = tank / proStrecke;
  // GLEITKOMMA, und zwar in 7 % aller Fälle (nachgemessen über 48.000
  // Kombinationen aus Verbrauch und Tankinhalt): `proStrecke * (tank /
  // proStrecke)` landet einen Hauch ÜBER tank -- 50.00000000000001 statt 50.
  // treibstoffFuer rundet auf, der Ringrand kostete damit eine Einheit mehr,
  // als der Ring verspricht, und die Zusage "gerade noch erreichbar" wäre
  // falsch. EIN Schritt nach unten räumt das ab (gemessen: nie mehr als
  // einer), und er ist auf der Karte um zwölf Nullen unsichtbar.
  return Math.ceil(proStrecke * weite) > tank ? weite - Math.abs(weite) * Number.EPSILON : weite;
}

// Treibstoffverbrauch für eine Strecke.
export function treibstoffFuer(flotte, distanz) {
  return Math.max(FLOTTE.mindestVerbrauch, Math.ceil(verbrauchProStrecke(flotte) * distanz));
}

// "3× Kriegsschiff, 1× Frachter" -- wie buendelText, nur für Schiffe statt
// Ressourcen (unterschiedliche Namenstabellen, deshalb keine gemeinsame Funktion).
export function schiffeText(schiffe) {
  return Object.entries(schiffe)
    .filter(([, anzahl]) => anzahl > 0)
    .map(([id, anzahl]) => `${anzahl}× ${SCHIFFE[id] ? t(SCHIFFE[id].name) : id}`)
    .join(", ") || t("keine Schiffe");
}

// --- Kampfwerte -------------------------------------------------------
// Arbeitet auf einer reinen { schiffId: anzahl }-Zuordnung, nicht auf einem
// echten Flotten-Objekt -- damit taugt dieselbe Funktion für Spieler UND
// Gefahren-Objekte (die ihre eigene kleine "Flotte" nur als daten.flotte
// mitbringen). Kein Sonderfall für welche Seite gerade dran ist.
export function schiffeStaerke(schiffe, schadenKarte = {}) {
  let hp = 0;
  let angriff = 0;
  for (const [id, anzahl] of Object.entries(schiffe)) {
    if (anzahl <= 0) continue;
    const def = SCHIFFE[id];
    const schaden = Math.min((schadenKarte[id] || 0), anzahl * def.hp);
    hp += anzahl * def.hp - schaden;
    angriff += anzahl * def.angriff;
  }
  return { hp: Math.max(0, hp), angriff };
}

// `unterlicht`: es gibt keine vermessene Route zum Ziel, also kein Sprung,
// sondern ein Erstflug mit Unterlichtgeschwindigkeit. Die Grundflugzeit
// (Sprungvorbereitung) entfällt dabei -- es wird ja nichts vorbereitet, es
// wird geflogen. Die Antriebstechnik hilft weiter, denn ein besserer Antrieb
// ist auch unterlichtschnell ein besserer Antrieb.
export function flugdauerMs(state, flotte, distanz, unterlicht = false) {
  const antriebBonus = (state.forschung.antriebstechnik || 0) * RESEARCH.antriebstechnik.reisezeitProLevel;
  const roh = unterlicht
    ? distanz * unterlichtSekundenProEinheit()
    : SONDE.grundflugzeitSek + distanz * SONDE.flugzeitProEntfernungSek;
  const faktor = Math.max(0.2, 1 - antriebBonus) / flotteTempo(flotte);
  return Math.max(5, Math.round(roh * faktor)) * 1000;
}

// Schnellstmögliches Schiff im Spiel als Referenztempo -- fürs Logistiknetz,
// das ohne echte Flotte auskommt, aber dieselbe Verzögerung simulieren soll,
// die die schnellste tatsächlich mögliche Fahrt bräuchte.
const SCHNELLSTES_TEMPO = Math.max(...Object.values(SCHIFFE).map((s) => s.tempo));

export function logistikVerzoegerungMs(state, vonPlanet, zuPlanet) {
  const distanz = entfernung(state.galaxie.seed, vonPlanet.systemId, zuPlanet.systemId);
  const antriebBonus = (state.forschung.antriebstechnik || 0) * RESEARCH.antriebstechnik.reisezeitProLevel;
  const roh = SONDE.grundflugzeitSek + distanz * SONDE.flugzeitProEntfernungSek;
  const faktor = Math.max(0.2, 1 - antriebBonus) / SCHNELLSTES_TEMPO;
  return Math.max(5, Math.round(roh * faktor)) * 1000;
}

// --- Anti-Strandung -------------------------------------------------------
// Ein Befehl wird nur angenommen, wenn der Treibstoff für den Weg HIN UND für
// die Rückkehr von dort zum nächstgelegenen eigenen Stützpunkt reicht.
// Verhindern statt bestrafen -- eine gestrandete Flotte wäre reiner Frust.
// FEHLER, gefunden am 16.08.2026 bei der Erweiterung auf 500 Systeme:
// `planetenVon(state)` ohne zweites Argument liefert die Planeten des
// SPIELERS. Eine Bot- oder Piratenflotte rechnete ihren Rückweg damit zur
// nächsten SPIELERWELT statt zu ihrer eigenen Heimat.
//
// Sichtbar wurde es erst jetzt, weil der Fehler mit der Entfernung wächst:
// bei Radius 120 lag die Spielerwelt im Mittel gut hundert Einheiten weg und
// der Bot schaffte seine Kolonie manchmal trotzdem (v0.5 maß "2 bis 4
// Planeten nach zehn Tagen"). Bei Radius 300 verlangte dieselbe Prüfung
// 479.547 Tritium für einen Flug von 3,4 Einheiten -- und kein Imperium
// kolonisierte je wieder. Der Fehler war die ganze Zeit da, die größere
// Galaxie hat ihn nur von "manchmal" auf "immer" gedreht.
//
// Dieselbe Falle wie bei naechsteBasis in state.js: ein Helfer, der "eigene"
// meint und den Spieler fest verdrahtet hat.
export function naechsterHafenOrt(state, ort, fraktionId = SPIELER_FRAKTION) {
  let bester = null;
  // Nur eigene Häfen: eine Flotte kann nicht beim Gegner andocken.
  for (const planet of planetenVon(state, fraktionId)) {
    const ziel = ortVonPlanet(state, planet);
    const d = strecke(ort, ziel);
    if (!bester || d < bester.distanz) bester = { planet, ort: ziel, distanz: d };
  }
  return bester;
}

export function reichtTreibstoff(state, flotte, vonOrt, nachOrt) {
  const hin = strecke(vonOrt, nachOrt);
  const heim = naechsterHafenOrt(state, nachOrt, fraktionVon(flotte));
  const gesamt = treibstoffFuer(flotte, hin) + treibstoffFuer(flotte, heim ? heim.distanz : 0);
  return {
    ok: flotte.treibstoff >= gesamt,
    benoetigt: gesamt,
    hinVerbrauch: treibstoffFuer(flotte, hin),
    distanz: hin,
  };
}
