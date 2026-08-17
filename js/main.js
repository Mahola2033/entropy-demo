// Einstiegspunkt: Spielstand laden, Offline-Zeit nachrechnen, Render-/Tick-Loop starten.

import { laden, speichern } from "./save.js";
import { vorspulenBisJetzt } from "./simulation.js";
import { aufholen, aufholenLaeuft, grosseLuecke, deckelMelden } from "./aufholen.js";
import { render, renderProfilStarten, renderProfilLesen, renderProfilAnsichten, hotkeysEinrichten } from "./ui.js";
import { testmodusEinrichten } from "./testmodus.js";
import { spracheLaden, t } from "./sprache.js";
import { phase, stockungenBeobachten, stockungsBericht } from "./stockung.js";

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

// VOR allem anderen, damit auch die Startaufholung schon beobachtet wird.
//
// Liefert false, wenn der Browser `longtask` nicht kennt (Firefox, Safari).
// Telemetrie gibt es dann trotzdem: die benannten Phasen melden sich selbst
// (js/stockung.js). Was fehlt, sind nur die UNBENANNTEN Aufgaben -- Fremdcode,
// Speicherbereinigung, ein Klick-Handler. Das ist eine Einschraenkung, keine
// Blindheit, und sie gehoert in die Konsole statt in eine Annahme.
const stockungenSichtbar = stockungenBeobachten(state);

aufholen(state).then((diagnose) => {
  deckelMelden(state, diagnose);
  if (!stockungenSichtbar) {
    console.info(t("[Stockung] Dieser Browser meldet keine unbenannten langen Aufgaben. Die Phasen melden sich weiter selbst."));
  }
  render(state, root);
  testmodusEinrichten(state, root, render);
  // Hotkeys EINMAL beim Start verdrahten (A-029). Der Listener haengt an
  // document und ueberlebt jede Render-Runde -- ihn beim Zeichnen zu setzen,
  // waere der 8a-Lernpunkt in neuer Verkleidung.
  hotkeysEinrichten(state, root);

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
        const fertig = phase("render");
        render(state, root);
        fertig();
      });
      return;
    }
    const taktFertig = phase("Sekundentakt");
    deckelMelden(state, vorspulenBisJetzt(state));
    render(state, root);
    taktFertig();
  }, 1000);

  // Alle 10 Sekunden speichern, plus beim Verlassen der Seite.
  //
  // Als Phase benannt, weil das der zweite Verdächtige ist: ein Spielstand
  // wiegt rund 2 MB, und `JSON.stringify` samt `localStorage.setItem` läuft
  // synchron. Ob das 5 ms oder 500 ms kostet, war nie gemessen (A-030).
  setInterval(() => {
    const fertig = phase("speichern");
    speichern(state);
    fertig();
  }, 10000);
  window.addEventListener("beforeunload", () => speichern(state));

  // Erst JETZT der erste Schreibversuch, und bewusst als LETZTES. Vorher stand
  // er über den setInterval-Zeilen -- ein Wurf beim Speichern (voller oder
  // gesperrter Browserspeicher) brach die Auswertung des Moduls dann ab, bevor
  // überhaupt ein Zeitgeber lief: kein Tick, kein Autosave, kein beforeunload.
  // Was hier hinter den Zeitgebern steht, kann das Spiel nicht mehr anhalten.
  speichern(state);
});

// Für schnelles Debuggen in der Konsole erreichbar machen.
//
// `profilStarten`/`profilLesen` schlüsseln die Renderkosten je Bereich auf
// (A-030) -- der Weg, einen Freeze-Bericht in Zahlen zu verwandeln:
//   __entropy.profilStarten(); // ein paar Sekunden spielen
//   __entropy.profilLesen();
window.__entropy = {
  state,
  profilStarten: renderProfilStarten,
  profilLesen: renderProfilLesen,
  profilAnsichten: () => renderProfilAnsichten(state, root),
  stockungen: stockungsBericht,
};
