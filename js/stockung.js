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

import { meldungHinzufuegen } from "./state.js?v=0.9.1";
import { t } from "./sprache.js?v=0.9.1";

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
// Der Spielstand, in dessen Meldungsliste geschrieben wird. Wird von
// `stockungenBeobachten` gesetzt -- die Phasen sollen ihn nicht durchreichen
// muessen, sonst haette jeder Aufrufer ihn im Gepaeck.
let spielstand = null;

// Eine Phase beginnt. Rückgabe ist die Funktion, die sie beendet -- damit
// kann kein Aufrufer das Beenden vergessen, ohne dass es auffällt.
export function phase(name) {
  const von = performance.now();
  laufend = { name, von, bis: Infinity, gemeldet: false };
  phasen.push(laufend);
  if (phasen.length > GEDAECHTNIS) phasen.shift();
  const eigene = laufend;
  return () => {
    eigene.bis = performance.now();
    if (laufend === eigene) laufend = null;
    // DIE PHASE MELDET SICH SELBST, und das ist der Weg, der in JEDEM Browser
    // trägt. `longtask` gibt es nur in Chrome-Abkömmlingen -- Firefox und
    // Safari kennen es nicht, und Tobis Umgebung IST Firefox (A-032). Ohne
    // diesen Weg hätte er als einziger keine Telemetrie, obwohl er der einzige
    // ist, der die Freezes gemeldet hat.
    //
    // Der Beobachter unten bleibt trotzdem: er faengt auch, was keine Phase
    // hat (Fremdcode, Speicherbereinigung, ein Klick-Handler).
    const dauer = eigene.bis - von;
    if (dauer >= SCHWELLE_MS) {
      eigene.gemeldet = true;
      melden(Math.round(dauer), name);
    } else {
      stilleBisher += 1;
    }
  };
}

// Eine Stockung nach draussen geben. Immer in die Konsole -- sie kostet nichts
// und traegt die volle Reihe fuer ein Profil. In die Meldungsliste nur, wenn
// ein Spielstand bekannt ist.
function melden(dauer, wer) {
  console.warn(`[Stockung] ${dauer} ms · ${wer}`);
  if (!spielstand) return;
  meldungHinzufuegen(
    spielstand,
    t("Anzeige hing {dauer} ms – Ursache: {wer}", { dauer, wer }),
    // Gruppiert: bei einer Kette von Haengern soll daraus eine Meldung mit
    // Zaehler werden und keine Lawine.
    "stockung"
  );
}

// Welche Phase lief zu diesem Zeitpunkt? Die jüngste, die ihn einschließt --
// jüngste, weil Phasen sich verschachteln können (ein Render innerhalb eines
// Aufholblocks) und die innere die genauere Antwort ist.
function phaseZu(zeitpunkt) {
  for (let i = phasen.length - 1; i >= 0; i--) {
    const p = phasen[i];
    if (zeitpunkt >= p.von && zeitpunkt <= p.bis) return p;
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
  // AB HIER GIBT ES TELEMETRIE, auch ohne `longtask`: die Phasen melden sich
  // selbst (siehe `phase`). Der Rueckgabewert sagt nur, ob ZUSAETZLICH der
  // Beobachter laeuft, der auch unbenannte Aufgaben faengt.
  spielstand = state;
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
      const treffer = phaseZu(eintrag.startTime);
      // Hat die Phase sich schon selbst gemeldet, ist hier Schluss --
      // sonst stuende jede Stockung zweimal in der Liste.
      if (treffer && treffer.gemeldet) continue;
      melden(dauer, treffer ? treffer.name : t("unbekannt"));
    }
  });
  beobachter.observe({ type: "longtask", buffered: true });
  return true;
}
