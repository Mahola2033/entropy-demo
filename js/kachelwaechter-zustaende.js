// Zustände für den Kachel-Wächter (A-158): drei benannte, reproduzierbare
// Welt-Zustände, aus der ECHTEN Engine erzeugt (`neuesSpiel()` plus gesetzte
// Gebäudestufen/Bestände) -- keine handgeschriebenen Fixtures, die veralten.
//
// Reine Zustandslogik, kein DOM: läuft unverändert in Node (`npm run
// kacheln`) und im Browser (`window.__entropy.kachelWaechter`, js/main.js).
//
// EIN Wächter, der nur ein frisches Spiel sieht, findet Spätspiel-Fehler nie
// (A-158-Auftrag) -- deshalb drei feste Stände statt "was zufällig im
// localStorage lag".

import { neuesSpiel } from "./state.js?v=0.9.16";
import { BUILDINGS, SCHIFFE } from "./data.js?v=0.9.16";

// früh -- frischer Start, nichts gebaut. Der unveränderte Weltstart selbst.
export function kwZustandFrueh(saat) {
  return neuesSpiel(saat);
}

// mitte -- Tobis Lage aus dem A-157-Bild: Kraftwerk und Lager gebaut, KEIN
// Energiespeicher. Die Nahrung steht dabei schon von selbst im Minus -- ein
// frischer Weltstart hat weder Farm noch Hydrokultur (Produktion 0), aber
// eine Startbevölkerung, die weiter Nahrung verbraucht (GEMESSEN:
// `produktionsAufloesung` liefert hier `nahrung: {produktion: 0, verbrauch:
// 2500}` ohne jede weitere Zutat). Genau der Zustand, den A-157 zeigt und
// die 0.5.0-Abnahme nicht sah.
export function kwZustandMitte(saat) {
  const state = neuesSpiel(saat);
  const heimat = state.planeten[0];
  heimat.gebaeude.kraftwerk = 14;
  heimat.gebaeude.lagerhalle = 11;
  heimat.gebaeude.energiespeicher = 0;
  return state;
}

// spät -- alles gebaut, Zahlen im Millionen-/Milliardenbereich, Forschung
// läuft, Warteschlangen (Bau, Werft, Forschung) gefüllt. GEMESSEN
// (`produktionsAufloesung`): Energie liegt hier bei rund 20-92 Mio MW,
// deutlich über dem, was A-142s feste Mindestbreiten (`.res-wert`/
// `.res-rate`) je gesehen haben -- genau die Größenordnung, die A-157s
// eigene Gegenprobe brauchte.
export function kwZustandSpaet(saat) {
  const state = neuesSpiel(saat);
  const heimat = state.planeten[0];

  for (const id of Object.keys(BUILDINGS)) heimat.gebaeude[id] = 25;
  for (const resId of Object.keys(heimat.ressourcen)) heimat.ressourcen[resId] = 5_000_000_000;

  heimat.bauQueue = {
    gebaeudeId: "metallmine",
    zielLevel: 26,
    startZeit: state.letzterTick,
    fertigZeit: state.letzterTick + 3_600_000,
  };
  heimat.bauWarteschlange = [
    { gebaeudeId: "siliziummine", zielLevel: 26, dauerSek: 600 },
    { gebaeudeId: "iridiummine", zielLevel: 26, dauerSek: 900 },
  ];
  heimat.werftQueue = {
    schiffId: Object.keys(SCHIFFE)[0],
    anzahl: 3,
    fertigZeit: state.letzterTick + 1_800_000,
  };
  heimat.werftWarteschlange = [{ schiffId: "kriegsschiff", anzahl: 5, dauerSek: 1200 }];

  // A-207: gebaute Abwehrstellung (A-204), damit die Kachel ihre lange
  // Bereitschaftszeile ("Bereitschaft: 4.500.000 MW · 2.500.000 AK") trägt --
  // genau die Zeile, die bei 1097×520 als Erste abgeschnitten würde.
  heimat.abwehr.abwehrstellung = 12;

  state.forschungsQueue = {
    forschungId: "energietechnik",
    zielLevel: 5,
    startZeit: state.letzterTick,
    aufwand: 5_000_000,
    fortschritt: 2_500_000,
  };
  state.forschungsWarteschlange = [{ forschungId: "antriebstechnik", zielLevel: 3, dauerSek: 1800 }];

  return state;
}

// abgeschlossen -- B-12 (BEOBACHTUNG.md, Auslöser 1 aus A-207): die drei
// Zustände oben zeigen Forschung immer nur LAUFEND (`forschungsQueue`), nie
// FERTIG (`state.forschung`) -- vier Kachelarten blieben deshalb über alle
// Zustände und Bereiche hinweg ungeprüft: `sondentechnik`, `bergungstechnik`,
// `tiefenbohrung`, `resonanzzerlegung`. Dieser Zustand setzt sie samt ihrer
// Voraussetzungen als GEBAUT (nicht eingereiht) -- die beiden `schluessel`-
// Techs (tiefenbohrung, resonanzzerlegung) prüfen die Häkchen-Darstellung
// (`fertig`, kein Kosten/Dauer mehr), die beiden gestuften eine mehrstellige
// Stufe. resonanzzerlegung trägt außerdem den längsten Namen im Katalog
// (A-212-Auftrag) -- genau die Kachel, die am ehesten überläuft.
export function kwZustandAbgeschlossen(saat) {
  const state = neuesSpiel(saat);
  state.forschung.energietechnik = 3;
  state.forschung.foerdertechnik = 3;
  state.forschung.sondentechnik = 4;
  state.forschung.bergungstechnik = 6;
  state.forschung.tiefenbohrung = 1;
  state.forschung.resonanzzerlegung = 1;
  // Alle vier sind nurDurchEntdeckung -- sichtbar (und damit überhaupt
  // renderbar) sind sie erst, wenn sie als freigeschaltet gelten
  // (forschungVerfuegbar prüft genau dieses Feld, nicht state.forschung).
  for (const id of ["sondentechnik", "bergungstechnik", "tiefenbohrung", "resonanzzerlegung"]) {
    state.forschungFreigeschaltet[id] = true;
  }
  return state;
}

export const KACHELWAECHTER_ZUSTAENDE = {
  frueh: kwZustandFrueh,
  mitte: kwZustandMitte,
  spaet: kwZustandSpaet,
  abgeschlossen: kwZustandAbgeschlossen,
};
