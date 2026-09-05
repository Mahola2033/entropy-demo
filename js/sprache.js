// Mehrsprachigkeit.
//
// Grundentscheidung: DER DEUTSCHE TEXT IST DER SCHLÜSSEL. Statt Kennungen wie
// "ui.knopf.bauen" zu erfinden, steht im Quelltext t("Nicht genug Ressourcen.")
// und texte.js bildet diesen Satz auf sein englisches Gegenstück ab.
//
// Warum so:
//   - data.js bleibt unangetastet. Namen und Beschreibungen stehen weiter dort,
//     nur die anzeigenden Stellen gehen durch t().
//   - Fehlt eine Übersetzung, erscheint Deutsch -- nie eine kaputte Kennung.
//     Ein Loch ist unschön, aber das Spiel bleibt bedienbar.
//   - Ein Test kann den Quelltext nach allen t("...") absuchen und prüfen, dass
//     jede Zeichenkette in der Tabelle steht (siehe tests/sprache.test.js).
//     Vollständigkeit ist damit zugesichert, nicht gehofft.
//
// Die Sprachwahl liegt BEWUSST NICHT im Spielstand, sondern in einem eigenen
// localStorage-Eintrag: sonst wäre sie bei jedem SAVE_VERSION-Sprung wieder
// weg -- genau das, was einem neuen Tester als Erstes passieren würde.

import { EN } from "./texte.js?v=0.9.1";

export const SPRACHEN = [
  { code: "de", name: "Deutsch" },
  { code: "en", name: "English" },
];

const SPEICHER_SCHLUESSEL = "entropy-sprache";
const TABELLEN = { en: EN };

let aktuell = "de";

// Browser-Vorgabe als Startwert: ein englischsprachiger Tester soll das Spiel
// sofort auf Englisch sehen, ohne erst eine Einstellung zu suchen.
function vorgabeAusUmgebung() {
  if (typeof navigator === "undefined" || !navigator.language) return "de";
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}

export function spracheLaden() {
  let gespeichert = null;
  try {
    gespeichert = typeof localStorage !== "undefined" ? localStorage.getItem(SPEICHER_SCHLUESSEL) : null;
  } catch {
    gespeichert = null; // z.B. blockierter Speicher -- kein Grund, das Spiel anzuhalten
  }
  aktuell = SPRACHEN.some((s) => s.code === gespeichert) ? gespeichert : vorgabeAusUmgebung();
  return aktuell;
}

export function sprache() {
  return aktuell;
}

export function spracheSetzen(code) {
  if (!SPRACHEN.some((s) => s.code === code)) return;
  aktuell = code;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(SPEICHER_SCHLUESSEL, code);
  } catch {
    // Nicht speicherbar: die Wahl gilt trotzdem für diese Sitzung.
  }
}

// Platzhalter in geschweiften Klammern: t("Kolonie auf {name}", { name: "..." }).
// Bewusst benannte Platzhalter statt Positionen -- eine Übersetzung darf die
// Reihenfolge ändern, und das tut sie im Englischen regelmäßig.
function einsetzen(text, werte) {
  if (!werte) return text;
  return text.replace(/\{(\w+)\}/g, (treffer, name) =>
    Object.prototype.hasOwnProperty.call(werte, name) ? String(werte[name]) : treffer
  );
}

export function t(text, werte) {
  if (aktuell === "de") return einsetzen(text, werte);
  const tabelle = TABELLEN[aktuell];
  const uebersetzt = tabelle && Object.prototype.hasOwnProperty.call(tabelle, text) ? tabelle[text] : text;
  return einsetzen(uebersetzt, werte);
}

// Zahlenformat folgt der Sprache: 1.234,5 im Deutschen, 1,234.5 im Englischen.
// Ohne das wirkt ein englisches Spiel sofort falsch, egal wie gut die Sätze
// übersetzt sind.
export function gebietsschema() {
  return aktuell === "de" ? "de-DE" : "en-US";
}
