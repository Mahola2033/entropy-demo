// Die Ursprungs-Orte (A-334): Stellen der Saat, an denen eine frühere Zivilisation
// war. Strukturen und Wächter-Relikte (js/reiche-orte.js) liegen nur noch um sie.
//
// DIE RECHENART (Entscheidung 10, Zielgröße Zwerggalaxie ~100.000 Systeme: Natur-
// und Reiche-Code läuft NIE über alle Systeme). `systemPosition(seed, id)` ist je
// Nummer rein und hat keinen räumlichen Index -- "welche Systeme liegen nahe am
// Ort X" ließe sich nur mit einer Schleife über alle Systeme beantworten. Darum
// dreht die Funktion die Frage um: nicht der Ort sucht seine Systeme, sondern jedes
// System fragt, welche Orte in seiner Nähe sind.
//
//   * Ein Raster aus Zellen, Kantenlänge so, dass eine Zelle im Mittel
//     URSPRUNG_SYSTEME_JE_ORT Systeme trägt (die Sterndichte ist konstant, die Kante
//     hängt NICHT an der Größe der Galaxie: dieselbe Saat trägt dieselben Orte, ob
//     500 oder 100.000 Systeme).
//   * Je Zelle ein EIGENER Strom: wie viele Orte (Poisson, Mittel 1 -- im Mittel
//     ein Ort je 100 Systeme), wo sie in der Zelle liegen, wie alt sie sind.
//   * Ein System liest seine eigene Zelle und die acht Nachbarn: der Einflussradius
//     ist die halbe Zellkante (gerechnet: halber mittlerer Ortsabstand, damit sich
//     die Einflussgebiete im Mittel kaum überlappen), also reicht der Ring von neun
//     Zellen immer.
//
// Die Zahl der Relikte je Ort: im Mittel URSPRUNG_RELIKTE_JE_ORT. Jedes System im
// Einflussradius trägt ein Relikt dieses Ortes mit der Wahrscheinlichkeit
// `relikteJeOrt / (Zahl der Systeme im Einflusskreis)`, gerechnet aus der Dichte; die
// Zahl je Ort ist damit Poisson-artig (Mittel 4,5), nicht fest. Ein Ort am
// Galaxierand, dessen Kreis zum Teil außerhalb liegt, trägt entsprechend weniger
// (gemessen, nicht geglättet).
//
// Dieses Modul importiert nur data.js und zufall.js (kein welt.js, kein galaxie.js):
// die Position des Systems kommt als Parameter.
//
// STRÖME: die Saat wird maskiert (SAAT_MASKE), damit weder die Zellkennung noch
// irgendeine Kennung dieses Moduls mit einer anderen `stromFuer`-Kennung des
// Projekts zusammenfallen kann (Liste im Kopf von js/reiche-orte.js). Die Kennung
// des Ortsstroms ist der Zellenschlüssel (zwei 16-Bit-Hälften, die Zelle trägt
// keine Primzahl); die Primzahlen 4909 und 6469 gehören dem Strom je (System, Ort)
// in js/reiche-orte.js. Zweck, Name und Bauherr eines Ortes (A-335) ziehen aus einem
// dritten Strom je Ort (URSPRUNG_NAMEN_MASKE, Kennung = Ortsschlüssel).

import {
  GALAXIE_REGELN,
  STERNDICHTE,
  URSPRUNG_SYSTEME_JE_ORT,
  URSPRUNG_RELIKTE_JE_ORT,
  URSPRUNG_ALTER_MIN_JAHRE,
  URSPRUNG_ALTER_MAX_JAHRE,
  URSPRUNG_ZWECKE,
  URSPRUNG_ORTSNAMEN,
  URSPRUNG_BAUHERRENNAMEN,
} from "./data.js?v=0.9.95";
import { stromFuer, logGleichverteilt, poissonZug, gewichtetWaehlen, waehle } from "./zufall.js?v=0.9.95";

export const URSPRUNG_SAAT_MASKE = 0x5ca1ab1e;
// Name, Bauherr und Zweck eines Ortes (A-335) ziehen aus einem EIGENEN Strom je Ort:
// maskierte Saat (andere Maske als der Zellenstrom), Kennung = `ort.schluessel` (aus
// Zellkoordinaten und Platz in der Zelle, NICHT aus der Größe der Galaxie). Zöge der
// Zellenstrom diese Werte mit, verschöbe sich Lage und Alter jedes Ortes mit `k > 0`.
export const URSPRUNG_NAMEN_MASKE = 0x0a2c1e5d;
// Höchstens so viele Orte in einer Zelle (Poisson, Mittel 1: Wahrscheinlichkeit für
// mehr als sieben ~1e-5). Die Grenze bleibt: sie zu ändern verschöbe die Orte (A-334).
const ORTE_JE_ZELLE_MAX = 7;

// Zählt, wie viele Zellen die Funktion gelesen hat -- der Test für "keine Schleife
// über alle Systeme" (Definition von fertig 3): ein System liest höchstens neun.
export const ursprungZaehler = { zellen: 0 };

// Kantenlänge einer Zelle in Galaxie-Einheiten: Fläche = Systeme je Ort / Dichte.
export function zellenkante() {
  return Math.sqrt(URSPRUNG_SYSTEME_JE_ORT / STERNDICHTE);
}

// Einflussradius eines Ortes: der halbe mittlere Ortsabstand (die Zellkante ist der
// mittlere Abstand zweier Orte bei einem Ort je Zelle).
export function einflussRadius() {
  return zellenkante() / 2;
}

// Erwartete Zahl der Systeme im vollen Einflusskreis: Dichte der laufenden Galaxie
// (anzahlSysteme / Fläche; der Radius ist gerundet, die Dichte darum nicht ganz die
// des Bezugspunkts) mal Kreisfläche.
export function systemeImEinfluss() {
  const radius = GALAXIE_REGELN.radius;
  const dichte = GALAXIE_REGELN.anzahlSysteme / (Math.PI * radius * radius);
  const r = einflussRadius();
  return dichte * Math.PI * r * r;
}

// Wahrscheinlichkeit, dass ein System im Einflusskreis ein Relikt dieses Ortes trägt.
export function relikteWahrscheinlichkeit() {
  return Math.min(1, URSPRUNG_RELIKTE_JE_ORT / systemeImEinfluss());
}

function zellenSchluessel(ix, iy) {
  return ((ix + 32768) & 0xffff) * 65536 + ((iy + 32768) & 0xffff);
}

const zellenMerker = new Map();

function grossgeschrieben(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Ein Name aus der Silbentabelle: erste Silbe, `folgen` Folgesilben, eine Endung.
function silbenName(rng, tabelle, folgen) {
  let name = waehle(rng, tabelle.erste);
  for (let i = 0; i < folgen; i++) name += waehle(rng, tabelle.folge);
  return grossgeschrieben(name + waehle(rng, tabelle.ende));
}

// Zweck, Name und Bauherr eines Ortes: reiner Strom aus (Saat, Ortsschlüssel). Die Reihenfolge
// der Züge ist Teil des Namens -- nicht ändern, ohne die Namen zu ändern.
function ortInhalt(seed, schluessel) {
  const rng = stromFuer((seed ^ URSPRUNG_NAMEN_MASKE) >>> 0, schluessel);
  const zweck = gewichtetWaehlen(rng, URSPRUNG_ZWECKE).schluessel;
  const name = silbenName(rng, URSPRUNG_ORTSNAMEN, rng() < 0.5 ? 1 : 2);
  const wurf = rng();
  const bauherr = silbenName(rng, URSPRUNG_BAUHERRENNAMEN, wurf < 0.25 ? 0 : wurf < 0.75 ? 1 : 2);
  return { zweck, name, bauherr };
}

// Die Orte einer Zelle, in fester Reihenfolge. Rein aus (Saat, Zelle).
function zelleOrte(seed, ix, iy) {
  ursprungZaehler.zellen++;
  const schluessel = seed + ":" + ix + ":" + iy;
  const bekannt = zellenMerker.get(schluessel);
  if (bekannt) return bekannt;

  const rng = stromFuer((seed ^ URSPRUNG_SAAT_MASKE) >>> 0, zellenSchluessel(ix, iy));
  const kante = zellenkante();
  const orteJeZelle = (kante * kante * STERNDICHTE) / URSPRUNG_SYSTEME_JE_ORT; // = 1 (Abgleich der Einheiten)
  const anzahl = Math.min(poissonZug(rng, orteJeZelle), ORTE_JE_ZELLE_MAX);
  const orte = [];
  for (let k = 0; k < anzahl; k++) {
    const schluesselOrt = zellenSchluessel(ix, iy) ^ Math.imul(k + 1, 40503);
    orte.push({
      ix,
      iy,
      k,
      schluessel: schluesselOrt,
      x: (ix + rng()) * kante,
      y: (iy + rng()) * kante,
      alterJahre: Math.round(logGleichverteilt(rng, URSPRUNG_ALTER_MIN_JAHRE, URSPRUNG_ALTER_MAX_JAHRE)),
      ...ortInhalt(seed, schluesselOrt), // eigener Strom: Lage und Alter bleiben, wo sie waren
    });
  }
  if (zellenMerker.size >= 4096) zellenMerker.clear(); // Schutz gegen Schleifen über viele Saaten
  zellenMerker.set(schluessel, orte);
  return orte;
}

export function ursprungOrteVergessen() {
  zellenMerker.clear();
}

/**
 * Die Orte, in deren Einflusskreis die Position liegt: liest die eigene Zelle und
 * die acht Nachbarn, sonst nichts. Der Einflusskreis ist höchstens eine halbe
 * Zellkante breit, ein Ort in der Nachbarzelle reicht damit nie weiter als in die
 * Zelle der Position hinein -- neun Zellen genügen.
 * @returns [{ ix, iy, k, schluessel, x, y, alterJahre, abstand }]
 */
export function ursprungsOrteUm(seed, x, y) {
  const kante = zellenkante();
  const r = einflussRadius();
  const cx = Math.floor(x / kante);
  const cy = Math.floor(y / kante);
  const treffer = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const ort of zelleOrte(seed, cx + dx, cy + dy)) {
        const abstand = Math.hypot(ort.x - x, ort.y - y);
        if (abstand <= r) treffer.push({ ...ort, abstand });
      }
    }
  }
  return treffer;
}

// Alle Orte, die mit der Galaxie überhaupt einen Schnitt haben können: NUR für
// Messwerkzeuge und Tests (läuft über die Zellen der Galaxie, nicht über Systeme).
export function ursprungOrteDerGalaxie(seed) {
  const kante = zellenkante();
  const reichweite = GALAXIE_REGELN.radius + einflussRadius();
  const n = Math.ceil(reichweite / kante);
  const orte = [];
  for (let iy = -n; iy <= n; iy++) {
    for (let ix = -n; ix <= n; ix++) orte.push(...zelleOrte(seed, ix, iy));
  }
  return orte;
}
