// Systeme auf Abruf materialisieren.
//
// Ein System wird deterministisch aus (Galaxie-Saat, Systemnummer) erzeugt.
// Im Spielstand liegt nur, was der Spieler daran verändert hat -- also je
// Orbit die Flags entdeckt/verwertet. Dadurch bleibt der Spielstand klein,
// egal wie groß die Galaxie ist.

import { systemGenerieren } from "./welt.js";
import { schluesselImSystem, systemName } from "./galaxie.js";

// Laufzeit-Zwischenspeicher, wird nicht gespeichert.
const cache = new Map();

// Die einzige Wahrheit darueber, was ein Orbit-Zustand tragen darf --
// durchgesetzt beim Lesen (holeSystem) UND beim Schreiben (setzeOrbitZustand),
// nicht nur beschrieben. Gemessen an allen setzeOrbitZustand-Aufrufstellen
// ausserhalb dieser Datei (A-175). Ein neues Feld gehoert HIER eingetragen --
// sonst wird es nie gespeichert, und niemand findet heraus, warum.
const ORBIT_ZUSTAND_FELDER = [
  "entdeckt",
  "verwertet",
  "restErtrag",
  "fraktionId",
  "verteidigerBesiegt",
  "verteidigerSchiffe",
  "verteidigerSchaden",
  "geerntetZeit",
  // A-194: die Startsystem-Zusicherung aus state.js -- ein flaches Feld,
  // das holeSystem beim Zusammenbau auf das verschachtelte
  // objekt.daten.kolonisierbar überträgt (siehe unten). Bleibt selbst flach,
  // die Sicherheitsmaßnahme aus A-175 gilt unverändert.
  "kolonisierbarErzwungen",
];

function cacheSchluessel(state, systemId) {
  // A-082: Im HEIMATSYSTEM steht der Name der eigenen Welt mit im Schluessel.
  // Grund: das System traegt ihn als Beschriftung seines Heimat-Orbits, und
  // der Zwischenspeicher haelt ein einmal gebautes System fest. Ohne den Namen
  // im Schluessel zeigte die Systemkarte nach einer Umbenennung weiter den
  // alten -- bis zum naechsten cacheLeeren, also womoeglich nie.
  //
  // Nur im Heimatsystem gesucht: die Suche laeuft ueber alle Planeten (bei
  // voller Galaxie rund 700), und holeSystem ist ein heisser Pfad (A-030).
  // Fremde Systeme kosten damit weiterhin nichts.
  if (systemId !== state.galaxie.heimatSystem) return `${state.galaxie.seed}:${systemId}`;
  const heimat = state.planeten.find((p) => p.typ === "heimat");
  return `${state.galaxie.seed}:${systemId}:${heimat ? heimat.name : ""}`;
}

// Liefert das fertige System inkl. Spielerfortschritt.
export function holeSystem(state, systemId) {
  const key = cacheSchluessel(state, systemId);
  if (cache.has(key)) return cache.get(key);

  const istHeimat = systemId === state.galaxie.heimatSystem;
  const heimatPlanet = state.planeten.find((p) => p.typ === "heimat");
  const system = systemGenerieren(state.galaxie.seed, systemId, {
    schluessel: schluesselImSystem(state.galaxie, systemId),
    istHeimat,
    heimatName: istHeimat && heimatPlanet ? heimatPlanet.name : undefined,
  });
  system.name = systemName(state.galaxie.seed, systemId);

  // Gespeicherten Fortschritt darüberlegen -- NUR die erlaubten Felder
  // (ORBIT_ZUSTAND_FELDER, A-175). Ein Spielstand kann beliebige Fremdfelder
  // tragen (fremde Herkunft, manuell bearbeitet); sie duerfen das Orbitobjekt
  // nie erreichen. `feld in gespeichert` statt einer Wahrheitspruefung, weil
  // `restErtrag: null` und `verteidigerSchiffe: {}` gueltige Werte sind.
  const zustand = state.systemZustand[systemId];
  if (zustand) {
    for (const objekt of system.objekte) {
      const gespeichert = zustand[objekt.orbit];
      if (!gespeichert) continue;
      for (const feld of ORBIT_ZUSTAND_FELDER) {
        if (feld in gespeichert) objekt[feld] = gespeichert[feld];
      }
      // A-194: "kolonisierbarErzwungen" ist flach im Zustand, sein Ziel liegt
      // aber verschachtelt (objekt.daten.kolonisierbar) -- die generische
      // Schleife oben kennt nur flache Ziele, darum hier explizit zugestellt.
      if (objekt.kolonisierbarErzwungen) objekt.daten.kolonisierbar = true;
    }
  }

  cache.set(key, system);
  return system;
}

// Ändert ein Objekt und schreibt die Änderung in den Spielstand durch. Prueft
// gegen dieselbe Liste wie holeSystem (ORBIT_ZUSTAND_FELDER, A-175) -- ein
// unbekanntes Feld ist hier ein Programmierfehler, kein Angriff. Es wird nicht
// still verschluckt (Konsolenwarnung), aber auch nicht angewandt: sonst wirkt
// es in der laufenden Partie, verschwindet nach dem naechsten Laden spurlos,
// und niemand findet heraus, warum -- Lesen und Schreiben sollen dieselbe
// Wahrheit zeigen, nicht erst nach einem Reload auseinanderlaufen.
export function setzeOrbitZustand(state, systemId, orbit, felder) {
  const erlaubt = {};
  for (const feld of Object.keys(felder)) {
    if (ORBIT_ZUSTAND_FELDER.includes(feld)) {
      erlaubt[feld] = felder[feld];
    } else {
      // Terse, technisches Log statt Anzeigetext -- wie `save.js`s
      // internen Diagnosezeilen ("zuruecksetzen: localStorage blockiert"),
      // nicht wie dessen Spieler-Meldungen (die laufen durch t()). Adressat
      // ist, wer den Aufruf geschrieben hat, nie der Spieler.
      console.warn(`setzeOrbitZustand: unbekanntes Feld "${feld}" -- fehlt in ORBIT_ZUSTAND_FELDER (js/systeme.js).`);
    }
  }

  const system = holeSystem(state, systemId);
  const objekt = system.objekte.find((o) => o.orbit === orbit);
  if (objekt) Object.assign(objekt, erlaubt);

  if (!state.systemZustand[systemId]) state.systemZustand[systemId] = {};
  const eintrag = state.systemZustand[systemId][orbit] || {};
  state.systemZustand[systemId][orbit] = Object.assign(eintrag, erlaubt);
  return objekt;
}

export function findeObjekt(state, systemId, orbit) {
  return holeSystem(state, systemId).objekte.find((o) => o.orbit === orbit);
}

// Nach einem Spielstand-Reset muss der Zwischenspeicher weg.
export function cacheLeeren() {
  cache.clear();
}

// --- Verschlossen, und was das NICHT betrifft (A-092) ---------------------
//
// Ist die QUELLE dieses Objekts ohne die passende Forschung unnutzbar?
//
// Diese Frage stand vierfach ausgeschrieben im Code (Systemzeile, Kartenobjekt,
// Detailzeile, Orbit-Angebot) und wurde an einer fuenften Stelle gar nicht
// gestellt: `missionFuerObjekt` kannte die Sperre nie. Genau in dieser Luecke
// ist Tobis Deuterium haengengeblieben -- die Oberflaeche sperrte den ganzen
// Orbit, waehrend die Spielregel darunter die Bergung laengst erlaubte.
// Eine Frage, eine Antwort.
export function objektGesperrt(state, objekt) {
  if (!objekt || !objekt.entdeckt || !objekt.benoetigt) return false;
  return (((state.forschung || {})[objekt.benoetigt.forschung]) || 0) < 1;
}

// Liegt an diesem Orbit Material herum? `restErtrag` sammelt zweierlei:
// den Rest einer Bergung, die nicht in den Frachtraum passte, UND alles, was
// eine Flotte hier zurueckgelassen hat (Sondenschrott, verlorene Fracht,
// Resttank einer aufgeloesten Flotte -- siehe `zurueckgelassen`).
//
// Das Zweite ist EIGENER BESITZ und faellt deshalb nie unter eine Sperre:
// Sperren betreffen das Anfliegen neuer Ziele und das Nutzen fremder Quellen,
// nie den Besitz bereits geladener Fracht (Entscheidung der Planung, 19.08.).
export function restLiegtAn(objekt) {
  return !!(objekt && objekt.restErtrag && Object.values(objekt.restErtrag).some((m) => m > 0));
}
