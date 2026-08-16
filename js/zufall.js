// Deterministischer Zufall. Gleiche Saat -> gleiche Welt, immer.
// Wird von Galaxie- und Systemgenerierung geteilt, damit beide reproduzierbar
// aus dem Spielstand-Seed ableitbar sind statt gespeichert werden zu müssen.

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eigener Zufallsstrom je (Saat, Kennung) -- so bekommt jedes System seine
// eigene, stabile Folge, ohne dass die Reihenfolge der Aufrufe eine Rolle spielt.
export function stromFuer(seed, kennung) {
  return mulberry32((seed ^ Math.imul(kennung + 1, 2654435761)) >>> 0);
}

export function waehle(rng, liste) {
  return liste[Math.floor(rng() * liste.length)];
}

export function zwischen(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

export function mischen(rng, liste) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function gewichtetWaehlen(rng, tabelle) {
  const gesamt = tabelle.reduce((s, e) => s + e.gewicht, 0);
  let wurf = rng() * gesamt;
  for (const eintrag of tabelle) {
    wurf -= eintrag.gewicht;
    if (wurf <= 0) return eintrag;
  }
  return tabelle[tabelle.length - 1];
}
