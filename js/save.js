// Persistenz: Spielstand in localStorage speichern/laden.

import {
  neuesSpiel,
  SAVE_VERSION,
  meldungHinzufuegen,
  meldungenNummerieren,
  momenteNachziehen,
  pauseNachziehen,
  speicherbarerVersatz,
} from "./state.js";
import { piratenWeltStart, botWeltStart, piratenNamenNachziehen } from "./simulation.js";
import { notausgangLoeschen } from "./aufholen.js";
import { DEMO_SAAT } from "./data.js";
import { t } from "./sprache.js";

const STORAGE_KEY = "entropy-save";

// Ein nicht mehr passender Stand wird hierher gerettet, statt ihn wegzuwerfen:
// laden() verwirft ihn beim Versionssprung, und der erste speichern() danach
// überschreibt ihn endgültig -- ein Sprung in SAVE_VERSION war damit ein
// lautloser Totalverlust. Die Kennung im Namen sagt, woher der Stand stammt.
const SICHERUNG_PRAEFIX = "entropy-save-alt-";

// Eine neue Welt besteht aus mehr als dem Spieler: alle Piratengruppen der
// Galaxie werden mit angelegt, damit die Welt AUCH OHNE SPIELER läuft. Das
// ist Tobis Vorgabe ("mit null, einem oder hundert Spielern") und gleichzeitig
// die Voraussetzung dafür, eine Galaxie im Schnelldurchlauf beobachten zu
// können -- siehe tests/weltlauf.mjs.
//
// Steht hier und nicht in neuesSpiel(), weil state.js die Simulation nicht
// kennen darf (sie kennt umgekehrt den State).
function neueWelt() {
  // DEMO_SAAT statt Zufall: die Demo läuft auf einer festen, geprüften
  // Galaxie (Tobis Entscheidung, Begründung und Messwerte in data.js).
  // Steht `null` dort, wird wie früher gewürfelt.
  const state = neuesSpiel(DEMO_SAAT ?? undefined);
  // Reihenfolge: erst die Imperien, dann die Raeuber -- die Piraten setzen
  // sich in Systeme, in denen noch niemand sitzt.
  botWeltStart(state);
  piratenWeltStart(state);
  return state;
}

// Ein verlorener Spielstand darf nicht nur in der Konsole stehen: sonst sitzt
// der Spieler ohne Erklärung vor einem leeren Imperium und hält das Spiel für
// kaputt. Die Meldung sagt ihm auch, dass die Sicherung existiert.
function neustartNach(text) {
  const state = neueWelt();
  meldungHinzufuegen(state, text);
  return state;
}

// Es bleibt immer nur EINE Sicherung liegen: zwei alte Stände zu je rund 2 MB
// sprengen die etwa 5 MB von localStorage -- die Rettung würde dann genau das
// Speichern verhindern, für das sie da ist.
function altenStandSichern(raw, kennung) {
  sicherungenLoeschen();
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(SICHERUNG_PRAEFIX + kennung, raw);
  } catch {
    // Kein Platz für die Sicherung: der Neuanfang läuft trotzdem weiter.
  }
}

function sicherungenLoeschen() {
  try {
    if (typeof localStorage === "undefined") return;
    // Object.keys liefert eine Kopie -- Löschen währenddessen ist gefahrlos.
    for (const schluessel of Object.keys(localStorage)) {
      if (schluessel.startsWith(SICHERUNG_PRAEFIX)) localStorage.removeItem(schluessel);
    }
  } catch {
    // Auch das Aufräumen darf nie der Grund sein, warum nichts mehr läuft.
  }
}

export function laden() {
  let raw = null;
  try {
    raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    // Im privaten Modus wirft schon das LESEN. Ohne dieses catch endet der
    // Modulstart in dieser Zeile und der Spieler sieht eine weiße Seite. Ein
    // neues Spiel ohne Speicherung ist immer noch ein Spiel.
    raw = null;
  }
  if (!raw) return neueWelt();
  try {
    const state = JSON.parse(raw);
    if (state.version !== SAVE_VERSION) {
      altenStandSichern(raw, state.version ?? "unbekannt");
      console.warn(t("Speicherstand-Version passt nicht, starte neues Spiel."));
      return neustartNach(
        t("Der alte Spielstand stammt aus einer früheren Version – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.")
      );
    }
    // Nachtragen, was ein älterer Stand noch nicht hatte. Bewusst HIER und
    // nicht bei jedem Zugriff: eine Stelle, die einmal läuft, statt einer
    // Bedingung an fünfzig Stellen (A-040).
    meldungenNummerieren(state);
    // Piratengruppen aus der Zeit vor A-031 heissen nach ihrem Orbitobjekt --
    // im Log liest sich das wie ein Naturereignis, das Flotten angreift.
    piratenNamenNachziehen(state);
    // Eine Pause aus dem Testmodus ueberdauert das Neuladen (A-038).
    pauseNachziehen(state);
    // Wer einen Moment schon hinter sich hat, bekommt seine Erklärung nicht
    // nachträglich (A-060). Muss VOR dem ersten Takt laufen -- der würde sie
    // sonst sofort schreiben.
    momenteNachziehen(state);
    return state;
  } catch (e) {
    altenStandSichern(raw, "unlesbar");
    console.error(t("Speicherstand konnte nicht gelesen werden, starte neues Spiel."), e);
    return neustartNach(
      t("Der alte Spielstand war nicht lesbar – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.")
    );
  }
}

// Nach einem Zurücksetzen darf NICHTS mehr geschrieben werden. Ohne diese
// Sperre hat der Reset nie funktioniert: zuruecksetzen() löschte den Eintrag,
// das anschließende location.reload() löste beforeunload aus, und der dort
// hängende speichern()-Aufruf schrieb den alten Zustand sofort zurück.
// Dass Spielstände beim Entwickeln trotzdem neu anfingen, lag allein an den
// SAVE_VERSION-Sprüngen in laden(), nicht am Reset.
let gesperrt = false;

export function speichern(state) {
  if (gesperrt) return;
  try {
    // A-048: der Zeitversatz geht nur so weit hinaus, wie die Uhr ihn
    // eingeholt hat. Begründung und Formel stehen bei `speicherbarerVersatz`.
    //
    // Über eine flache Kopie, NICHT am laufenden Zustand: eine Aufholung, die
    // gerade rechnet, braucht ihren vollen Versatz weiter. Die Kopie legt nur
    // die oberste Ebene neu an, alles darunter bleibt dieselbe Referenz --
    // bei zwei Megabyte Spielstand ist das der Unterschied zwischen einer
    // Zuweisung und einer Verdopplung.
    const hinaus = { ...state, testZeitOffsetMs: speicherbarerVersatz(state) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hinaus));
  } catch (e) {
    // Anlass: dieser Aufruf stand beim Start VOR den setInterval-Zeilen in
    // main.js. Ein Wurf hier -- volles localStorage (rund 5 MB Quota, ein
    // Stand wiegt schon etwa 2 MB) oder gesperrter Speicher -- hat damit die
    // Tick-Schleife nie starten lassen: ein eingefrorenes Spiel, ohne dass
    // irgendwo etwas stand. Deshalb wird hier gemeldet statt geschluckt.
    sicherungenLoeschen(); // Beiwerk zuerst: der Versuch in 10 Sekunden hat wieder Platz
    const meldung = t("Spielstand konnte nicht gespeichert werden – der Browserspeicher ist voll oder gesperrt.");
    console.error(meldung, e);
    // Gruppiert: sonst schreibt jeder Autosave-Takt eine eigene Zeile.
    meldungHinzufuegen(state, meldung, "speicherfehler");
  }
}

export function zuruecksetzen() {
  gesperrt = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    // A-046, Falle 1: der Notausgang-Marker läuft am Spielstand vorbei und
    // muss deshalb hier ausdrücklich mit weg. Bliebe er stehen, zeigte ein
    // FRISCHES Spiel die Tafel für ein Problem, das mit dem alten Stand
    // verschwunden ist.
    notausgangLoeschen();
  } catch (e) {
    // Wirft das Löschen, bliebe das location.reload() im Aufrufer aus -- und
    // zurück bliebe ein laufendes Spiel mit gesetzter Sperre, das nie wieder
    // speichert, ohne dass jemand es merkt. Genau der stille Ausfall.
    // Bewusst ohne t(): diese Zeile sieht nur die Konsole, der Spieler ist
    // gleich in einem neu geladenen Spiel.
    console.error("zuruecksetzen: localStorage blockiert", e);
  }
}
