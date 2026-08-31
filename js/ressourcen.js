// Generische Helfer für Ressourcen-Bündel (Kosten, Erträge, Bestände).
// Ein "Bündel" ist schlicht { ressourcenId: betrag, ... }.
// Alles hier arbeitet über beliebige Ressourcen -- nichts ist fest verdrahtet.

import { RESSOURCEN } from "./data.js";
import { t, gebietsschema } from "./sprache.js";

export function reichenAus(bestand, kosten) {
  return Object.entries(kosten).every(([resId, betrag]) => (bestand[resId] || 0) >= betrag);
}

// WELCHE Ressourcen fehlen -- nicht nur DASS etwas fehlt (A-009).
//
// Prinzip 10a: Blockiertes erklärt sich selbst. „Nicht genug Ressourcen" war
// solange erträglich, wie Gebäude aus Metall und Silizium bestanden und beides
// direkt daneben in der Leiste stand. Seit Werft, Labor, Schirm und jedes
// Schiff auch Elektronik kosten, ist die Antwort auf „was fehlt mir denn?"
// nicht mehr auf einen Blick zu haben.
export function fehlende(bestand, kosten) {
  return Object.entries(kosten)
    .filter(([resId, betrag]) => (bestand[resId] || 0) < betrag)
    .map(([resId]) => resId);
}

export function abziehen(bestand, kosten) {
  for (const [resId, betrag] of Object.entries(kosten)) {
    bestand[resId] = (bestand[resId] || 0) - betrag;
  }
}

export function hinzufuegen(bestand, ertrag) {
  for (const [resId, betrag] of Object.entries(ertrag)) {
    bestand[resId] = (bestand[resId] || 0) + betrag;
  }
}

// Fügt Ressourcen zu einem Bestand hinzu, begrenzt durch eine GEMEINSAME
// Lagerkapazität (in Kapazitätseinheiten) und optional eine individuelle
// Obergrenze je Ressource. lagerverbrauchVon(resId) sagt, wie viele
// Kapazitätseinheiten eine Einheit dieser Ressource belegt -- 0 heißt
// physisch unbegrenzt (z.B. Credits). limitVon(resId) ist optional (z.B.
// eine pro-Planet konfigurierte Annahmeregel) und liefert Infinity, wenn
// keine Grenze gesetzt ist.
//
// Was nicht mehr reinpasst, geht NICHT verloren -- es bleibt im
// zurückgegebenen "abgelehnt"-Bündel, damit der Aufrufer entscheiden kann
// (z.B. Fracht bleibt an Bord, statt beim Andocken zu verschwinden).
export function lagerHinzufuegen(bestand, zuwachs, kapazitaetFrei, lagerverbrauchVon, limitVon) {
  let restFrei = kapazitaetFrei;
  const genommen = {};
  const abgelehnt = {};

  for (const [resId, menge] of Object.entries(zuwachs)) {
    if (!menge) continue;
    const verbrauch = lagerverbrauchVon(resId);
    const limit = limitVon ? limitVon(resId) : Infinity;
    const platzLimit = limit === Infinity ? Infinity : Math.max(0, limit - (bestand[resId] || 0));
    const platzLager = verbrauch > 0 ? restFrei / verbrauch : Infinity;

    const n = Math.max(0, Math.min(menge, platzLager, platzLimit));
    bestand[resId] = (bestand[resId] || 0) + n;
    if (verbrauch > 0) restFrei -= n * verbrauch;

    genommen[resId] = n;
    if (n < menge - 1e-9) abgelehnt[resId] = menge - n;
  }
  return { genommen, abgelehnt };
}

export function skalieren(buendel, faktor) {
  const out = {};
  for (const [resId, betrag] of Object.entries(buendel)) {
    out[resId] = Math.round(betrag * faktor);
  }
  return out;
}

// Der Ressourcenname geht durch t(): der deutsche Name aus data.js IST der
// Übersetzungsschlüssel. Dadurch bleibt data.js selbst einsprachig und alle
// Anzeigen -- Kosten, Tooltips, Meldungen -- werden hier auf einen Schlag
// mehrsprachig.
export function name(resId) {
  return RESSOURCEN[resId] ? t(RESSOURCEN[resId].name) : resId;
}

// Zahlenformat folgt der Sprache: 1.234 im Deutschen, 1,234 im Englischen.
// Ohne das wirkt ein englisches Spiel sofort falsch, egal wie gut die Sätze
// sind.
export function formatZahl(n) {
  return Math.floor(n).toLocaleString(gebietsschema());
}


// Physikalische Einheit einer Ressource ("t", "kg", "MW", "cr").
export function einheit(resId) {
  const def = RESSOURCEN[resId];
  return def && def.einheit ? def.einheit : "";
}

// Kompakte Schreibweise für große Mengen. Bis zu einer Million bleibt die
// Zahl vollständig -- in diesem Bereich will man den genauen Wert sehen.
// Darüber wird abgekürzt, weil "1.234.567.890" niemand mehr liest; der
// genaue Wert steht in solchen Fällen im Tooltip.
export function formatKurz(n) {
  const zahl = Math.floor(n);
  if (Math.abs(zahl) < 1000000) return zahl.toLocaleString(gebietsschema());
  const stufen = [[1000000000000, "Bio"], [1000000000, "Mrd"], [1000000, "Mio"]];
  for (const [teiler, kuerzel] of stufen) {
    if (Math.abs(zahl) >= teiler) {
      const wert = zahl / teiler;
      // Kleine Vielfache mit einer Nachkommastelle ("1,2 Mio" ist informativ),
      // größere gerundet ("123 Mio" statt "123,4 Mio" -- ruhiger zu lesen).
      // Das Dezimaltrennzeichen kommt aus dem Gebietsschema, nicht aus einem
      // festen Komma -- im Englischen wäre "1,2 Mio" schlicht falsch.
      const text =
        wert < 100
          ? wert.toLocaleString(gebietsschema(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : String(Math.round(wert));
      return text + " " + t(kuerzel);
    }
  }
  return zahl.toLocaleString(gebietsschema());
}

// Menge mit Einheit, kompakt: "1,2 Mio t".
export function mitEinheit(resId, menge, kurz = true) {
  const e = einheit(resId);
  const zahl = kurz ? formatKurz(menge) : formatZahl(menge);
  return e ? zahl + " " + e : zahl;
}

// "60 t Metall, 15 t Silizium" -- ausgeschrieben, für Tooltips und Meldungen.
export function buendelText(buendel, { abgang = false } = {}) {
  return Object.entries(buendel)
    .map(
      ([resId, betrag]) =>
        `${abgang ? "−" : ""}${formatZahl(betrag)}${einheit(resId) ? " " + einheit(resId) : ""} ${name(resId)}`
    )
    .join(", ");
}

// "🔩 60  💠 15" -- kompakte Variante für enge Kacheln. Der ausgeschriebene
// Text steht dort im Tooltip, damit die Symbole nicht geraten werden müssen.
export function buendelSymbole(buendel, { abgang = false } = {}) {
  return Object.entries(buendel)
    .map(([resId, betrag]) => {
      const def = RESSOURCEN[resId];
      // A-165 (P19, Tobis Feedback 31.08.): "−${menge}" faerbte bis dahin
      // die Einheit mit ("−60 t" komplett rot statt nur "−60"). Die Einheit
      // steht jetzt AUSSERHALB des Spans, in normaler Textfarbe.
      const e = einheit(resId);
      const stueck = abgang
        ? `<span class="abgang">−${formatKurz(betrag)}</span>${e ? " " + e : ""}`
        : mitEinheit(resId, betrag);
      return `${def && def.symbol ? def.symbol : name(resId)} ${stueck}`;
    })
    .join("  ");
}
