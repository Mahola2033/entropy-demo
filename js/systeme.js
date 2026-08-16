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

function cacheSchluessel(state, systemId) {
  return `${state.galaxie.seed}:${systemId}`;
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

  // Gespeicherten Fortschritt darüberlegen.
  const zustand = state.systemZustand[systemId];
  if (zustand) {
    for (const objekt of system.objekte) {
      const gespeichert = zustand[objekt.orbit];
      if (gespeichert) Object.assign(objekt, gespeichert);
    }
  }

  cache.set(key, system);
  return system;
}

// Ändert ein Objekt und schreibt die Änderung in den Spielstand durch.
export function setzeOrbitZustand(state, systemId, orbit, felder) {
  const system = holeSystem(state, systemId);
  const objekt = system.objekte.find((o) => o.orbit === orbit);
  if (objekt) Object.assign(objekt, felder);

  if (!state.systemZustand[systemId]) state.systemZustand[systemId] = {};
  const eintrag = state.systemZustand[systemId][orbit] || {};
  state.systemZustand[systemId][orbit] = Object.assign(eintrag, felder);
  return objekt;
}

export function findeObjekt(state, systemId, orbit) {
  return holeSystem(state, systemId).objekte.find((o) => o.orbit === orbit);
}

// Nach einem Spielstand-Reset muss der Zwischenspeicher weg.
export function cacheLeeren() {
  cache.clear();
}
