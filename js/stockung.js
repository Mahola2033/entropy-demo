// Wer hat den Browser blockiert, und wie lange? (A-030)
//
// WARUM ES DIESES MODUL GIBT: v0.82 hat die Aufholung in Blöcke zerlegt, und
// das ist in Node NACHGEMESSEN wirksam (+1 Tag 63,4 s → 1,2 s, siehe
// `tests/sprungmessung.mjs`). Tobi sieht auf der Live-Demo trotzdem Freezes.
// Wenn Messung und Erfahrung auseinandergehen, ist eine Annahme falsch --
// und die teuerste Reaktion darauf wäre, den nächsten Fix zu raten.
//
// `tests/sprungmessung.mjs` misst NODE-Zeit. Der Freeze lebt aber im Browser,
// zwischen zwei Bildern, auf Tobis Gerät. Genau dort muss gemessen werden.
//
// Der Browser kann das selbst: `PerformanceObserver` mit `longtask` meldet
// jede Aufgabe, die den Hauptthread länger als 50 ms belegt -- also genau die
// Ereignisse, die sich als Hängen anfühlen. Was er NICHT weiß, ist, WER die
// Aufgabe war. Dafür führt dieses Modul ein kurzes Gedächtnis über die
// laufenden Phasen mit und ordnet jede lange Aufgabe der Phase zu, die zu
// ihrer Zeit lief.
//
// KOSTEN: der Beobachter ist passiv, er rechnet nur, wenn der Browser etwas
// meldet. Je Phase fallen zwei `performance.now()` und ein Schreibzugriff in
// einen Ringpuffer an -- bei einem Takt pro Sekunde ist das nicht messbar.
// Eine Meldung entsteht erst über der Schwelle, nie im Normalbetrieb
// (ausdrückliche Falle 2 im Auftrag).

import { meldungHinzufuegen } from "./state.js";
import { t } from "./sprache.js";

// Ab hier ist es keine Stockung mehr, sondern ein Hänger. 50 ms wären die
// Browser-Grenze für `longtask`, aber unter 200 ms merkt niemand etwas --
// und jede Meldung, die niemand braucht, verdrängt eine, die jemand braucht
// (die Meldungsliste hält dreißig Einträge).
const SCHWELLE_MS = 200;

// Wie viele Phasen zurück wir zuordnen können. Eine lange Aufgabe wird dem
// Beobachter erst NACH ihrem Ende zugestellt, in der Zwischenzeit können
// weitere Phasen begonnen haben. Zwanzig reichen weit: die Zustellung
// passiert im nächsten Rahmen, nicht Sekunden später.
const GEDAECHTNIS = 20;

const phasen = [];
let laufend = null;
let beobachter = null;
let stilleBisher = 0;

// Eine Phase beginnt. Rückgabe ist die Funktion, die sie beendet -- damit
// kann kein Aufrufer das Beenden vergessen, ohne dass es auffällt.
export function phase(name) {
  const von = performance.now();
  laufend = { name, von, bis: Infinity };
  phasen.push(laufend);
  if (phasen.length > GEDAECHTNIS) phasen.shift();
  const eigene = laufend;
  return () => {
    eigene.bis = performance.now();
    if (laufend === eigene) laufend = null;
  };
}

// Welche Phase lief zu diesem Zeitpunkt? Die jüngste, die ihn einschließt --
// jüngste, weil Phasen sich verschachteln können (ein Render innerhalb eines
// Aufholblocks) und die innere die genauere Antwort ist.
function phaseZu(zeitpunkt) {
  for (let i = phasen.length - 1; i >= 0; i--) {
    const p = phasen[i];
    if (zeitpunkt >= p.von && zeitpunkt <= p.bis) return p.name;
  }
  return null;
}

// Zählt, was unter der Schwelle blieb -- ohne es zu melden. Sonst weiß man
// hinterher nicht, ob es ruhig war oder ob der Beobachter gar nicht lief.
export function stockungsBericht() {
  return { unterDerSchwelle: stilleBisher, schwelleMs: SCHWELLE_MS, laeuft: !!beobachter };
}

// Startet die Beobachtung. Ohne `state` schreibt sie nur in die Konsole --
// das ist der Modus für eine Messung, die den Spielstand nicht anfassen soll.
export function stockungenBeobachten(state = null) {
  if (beobachter) return true;
  if (typeof PerformanceObserver !== "function") return false;
  // Nicht jeder Browser kennt `longtask` (Safari, Firefox). Dann bleibt es
  // bei der Node-Messung, und das muss man wissen statt es zu vermuten.
  const arten = PerformanceObserver.supportedEntryTypes || [];
  if (!arten.includes("longtask")) return false;

  beobachter = new PerformanceObserver((liste) => {
    for (const eintrag of liste.getEntries()) {
      const dauer = Math.round(eintrag.duration);
      if (dauer < SCHWELLE_MS) {
        stilleBisher += 1;
        continue;
      }
      const wer = phaseZu(eintrag.startTime) || t("unbekannt");
      // Immer in die Konsole: sie überlebt einen Reload nicht, kostet aber
      // nichts und trägt die volle Reihe für ein Profil.
      console.warn(`[Stockung] ${dauer} ms · ${wer}`);
      if (state) {
        meldungHinzufuegen(
          state,
          t("Anzeige hing {dauer} ms – Ursache: {wer}", { dauer, wer }),
          // Gruppiert: bei einer Kette von Hängern soll daraus eine Meldung
          // mit Zähler werden und keine Lawine (Falle 2 im Auftrag).
          "stockung"
        );
      }
    }
  });
  beobachter.observe({ type: "longtask", buffered: true });
  return true;
}
