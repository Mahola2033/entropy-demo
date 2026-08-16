// Einstiegspunkt: Spielstand laden, Offline-Zeit nachrechnen, Render-/Tick-Loop starten.

import { laden, speichern } from "./save.js";
import { vorspulenBisJetzt } from "./simulation.js";
import { aufholen, aufholenLaeuft, grosseLuecke, deckelMelden } from "./aufholen.js";
import { render } from "./ui.js";
import { testmodusEinrichten } from "./testmodus.js";
import { spracheLaden } from "./sprache.js";

const root = document;
// Sprache VOR dem ersten Rendern festlegen -- sonst blitzt einmal die falsche
// Sprache auf. Kommt aus dem eigenen localStorage-Eintrag, sonst aus der
// Browsereinstellung.
spracheLaden();
const state = laden();

// --- Offline-Aufholung ------------------------------------------------
//
// WARUM DAS NICHT IN EINEM ZUG LÄUFT: die Frist der Demo läuft ausdrücklich
// weiter, während niemand hinsieht -- eine Übernachtung ist damit der
// Normalfall, kein Randfall. Gemessen an einer vollen Galaxie (729
// Fraktionen) braucht eine Aufholung über 48 h rund 364.000 Ereignisse und
// über zwei Minuten Rechenzeit.
//
// Synchron vor dem ersten Rendern hieß das: zwei Minuten weiße Seite. Kein
// Bild, kein Mauszeiger, nichts -- vom Absturz nicht zu unterscheiden.
//
// Die blockweise Aufholung steht seit v0.82 in `js/aufholen.js`, weil sie
// hier nur den SEITENSTART bediente. Der Sekundentakt unten und die
// Testmodus-Knöpfe rechneten dieselbe Arbeit weiter in einem Zug -- und
// genau daran hat sich die Demo aufgehängt. Dort steht auch die Messung.

aufholen(state).then((diagnose) => {
  deckelMelden(state, diagnose);
  render(state, root);
  testmodusEinrichten(state, root, render);

  // Jede Sekunde: Zeit vorrücken (Produktion + evtl. fertige Bauten) und neu
  // rendern.
  //
  // DREI FÄLLE, und der mittlere ist der, der gefehlt hat:
  //  - eine Aufholung läuft gerade (langer Sprung, Testmodus-Knopf): dieser
  //    Takt hält still. Zwei ineinander verschränkte Aufholungen würden
  //    denselben Zeitraum doppelt buchen.
  //  - die Lücke ist groß: der Tab war eingefroren oder der Rechner hat
  //    geschlafen. Gemessen sind zwei Stunden Schlaf 7,6 s Rechnung in EINEM
  //    Zug -- ohne Bild, ohne Mauszeiger. Das gehört in Blöcke.
  //  - der Normalfall: eine Sekunde, rund vier Millisekunden, sofort.
  setInterval(() => {
    if (aufholenLaeuft()) return;
    if (grosseLuecke(state)) {
      aufholen(state).then((d) => {
        deckelMelden(state, d);
        render(state, root);
      });
      return;
    }
    deckelMelden(state, vorspulenBisJetzt(state));
    render(state, root);
  }, 1000);

  // Alle 10 Sekunden speichern, plus beim Verlassen der Seite.
  setInterval(() => speichern(state), 10000);
  window.addEventListener("beforeunload", () => speichern(state));

  // Erst JETZT der erste Schreibversuch, und bewusst als LETZTES. Vorher stand
  // er über den setInterval-Zeilen -- ein Wurf beim Speichern (voller oder
  // gesperrter Browserspeicher) brach die Auswertung des Moduls dann ab, bevor
  // überhaupt ein Zeitgeber lief: kein Tick, kein Autosave, kein beforeunload.
  // Was hier hinter den Zeitgebern steht, kann das Spiel nicht mehr anhalten.
  speichern(state);
});

// Für schnelles Debuggen in der Konsole erreichbar machen.
window.__entropy = { state };
