// Vergleich von Versions-Strings nach dem Schema "0.MINOR.PATCH" (A-109).
//
// Bis A-109 reichte Number.parseFloat: alle Versionen waren "X.YY", rein
// numerisch sortierbar. Seit dem Schnitt auf drei Stellen stimmt das nicht
// mehr -- parseFloat("0.2.12") liest nur "0.2", genau wie parseFloat("0.2.0").
// Ein Vergleich, der sich auf parseFloat verlässt, hält jede dreiteilige
// Version für höchstens gleich groß wie ihre eigene Minor-Version.
//
// Eigenes Modul statt Kopie (Prinzip 5, wiederverwenden statt Parallelsystem):
// tests/sprache.test.js prüft damit die Patchnotes-Reihenfolge,
// veroeffentlichen.mjs damit, was seit dem letzten dist-Stand neu dazukam --
// Letzteres läuft als eigenständiges Skript ohne Testkontext, die Funktion
// muss also ein normales Modul sein, das beide importieren können.
//
// Ein dreiteiliger String (neues Schema) gilt per Definition immer als neuer
// als jeder zweiteilige (altes Schema) -- Schemawechsel schlägt Zahlenwert,
// sonst gälte "1.80" (altes Schema) als neuer als "0.2.12" (neues Schema).
function schluessel(version) {
  const teile = String(version).split(".").map(Number);
  return [teile.length === 3 ? 1 : 0, ...teile];
}

// Wie ein klassischer Vergleichs-Callback: negativ, wenn a älter als b ist,
// positiv, wenn a neuer ist, 0 bei Gleichheit.
export function vergleicheVersionen(a, b) {
  const [sa, sb] = [schluessel(a), schluessel(b)];
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const diff = (sa[i] ?? 0) - (sb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Bequemlichkeitsfunktion für den häufigsten Aufruf: "ist a neuer als b?"
export function versionIstNeuerAls(a, b) {
  return vergleicheVersionen(a, b) > 0;
}
