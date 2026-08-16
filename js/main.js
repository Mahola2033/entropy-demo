// Einstiegspunkt: Spielstand laden, Offline-Zeit nachrechnen, Render-/Tick-Loop starten.

import { laden, speichern } from "./save.js";
import { vorspulenBisJetzt } from "./simulation.js";
import { spielzeitJetzt, meldungHinzufuegen } from "./state.js";
import { render } from "./ui.js";
import { testmodusEinrichten } from "./testmodus.js";
import { spracheLaden, t } from "./sprache.js";

const root = document;
// Sprache VOR dem ersten Rendern festlegen -- sonst blitzt einmal die falsche
// Sprache auf. Kommt aus dem eigenen localStorage-Eintrag, sonst aus der
// Browsereinstellung.
spracheLaden();
const state = laden();

// --- Offline-Aufholung ------------------------------------------------
//
// WARUM DAS NICHT MEHR IN EINEM ZUG LÄUFT: die Frist der Demo läuft
// ausdrücklich weiter, während niemand hinsieht -- eine Übernachtung ist
// damit der Normalfall, kein Randfall. Gemessen an einer vollen Galaxie
// (729 Fraktionen) braucht eine Aufholung über 48 h rund 364.000 Ereignisse
// und über zwei Minuten Rechenzeit.
//
// Synchron vor dem ersten Rendern hieß das: zwei Minuten weiße Seite. Kein
// Bild, kein Mauszeiger, nichts -- vom Absturz nicht zu unterscheiden.
//
// Deshalb läuft die Aufholung jetzt in BLÖCKEN, und zwischen zwei Blöcken
// bekommt der Browser sein Bild. Das ist keine neue Zeitmechanik: das Spiel
// rückt im laufenden Betrieb ohnehin jede Sekunde ein Stück vor (siehe
// setInterval unten), und `vorspulenBisJetzt` in kleinen Schritten liefert
// dasselbe wie ein großer -- genau das sichert tests/zeit.test.js zu.

// IN WIE VIELE BLÖCKE die Aufholung zerfällt -- nicht, wie lange ein Block
// rechnen darf.
//
// Der erste Entwurf machte es andersherum: klein anfangen und die Blockgröße
// an einer Ziel-Rechenzeit nachführen. Im Browser gemessen blieb die Anzeige
// damit 20 Sekunden lang auf 0 % stehen. Der Grund ist ein FESTER Anteil je
// Aufruf: `vorspulenBisJetzt` rückt am Ende immer ALLE Planeten auf den
// Zielzeitpunkt vor, bei 672 Planeten ist das allein schon Millisekunden.
// Die Nachführung stellte sich deshalb auf eine Blockgröße ein, bei der fast
// nur noch dieser Sockel bezahlt wurde -- viele Aufrufe, kaum Fortschritt.
//
// Eine feste Zahl Blöcke dreht das um: der Sockel wird HUNDERTMAL bezahlt,
// egal wie lang die Abwesenheit war, und der Balken rückt je Block um rund
// ein Prozent vor.
const BLOECKE = 100;
// Notbremse nach unten: dauert ein Block spürbar zu lang, wird er geteilt.
// Die Grenze ist großzügig -- ein kurzes Stocken ist besser als tausend
// Aufrufe, die nur ihren Sockel bezahlen.
const BLOCK_ZU_LANG_MS = 250;
// Feiner als tausendstel Schritte wird nicht geteilt: darunter überwiegt der
// Sockel wieder, und ein Prozentbalken braucht es auch nicht genauer.
const BLOECKE_MAX = 1000;
// Unter dieser Abwesenheit lohnt der ganze Aufwand nicht -- das ist der Fall
// "kurz weggeklickt", und der soll ohne Zwischenbild durchlaufen.
const OHNE_ANZEIGE_BIS_MS = 5 * 60 * 1000;

// Ein Bild abwarten. `requestAnimationFrame` ist das einzige, was einen
// gezeichneten Rahmen wirklich zusichert -- setTimeout(0) wird geklemmt und
// garantiert gar nichts.
//
// Der Wettlauf mit dem Zeitgeber ist kein Schmuck: in einem HINTERGRUND-Tab
// feuert rAF überhaupt nicht mehr. Ohne ihn bliebe die Aufholung dort ewig
// stehen, und der Spielstand hinge auf halbem Weg fest.
function naechstesBild() {
  return new Promise((fertig) => {
    let erledigt = false;
    const einmal = () => {
      if (erledigt) return;
      erledigt = true;
      fertig();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(einmal);
    setTimeout(einmal, 100);
  });
}

// Schlichte Fortschrittsanzeige, in main.js erzeugt und wieder entfernt.
// Bewusst mit eigenen Stilangaben statt einer Klasse: sie steht, BEVOR die
// Oberfläche das erste Mal gerendert wurde, und soll von nichts abhängen,
// was dort später passiert.
function fortschrittsanzeige() {
  const kasten = document.createElement("div");
  kasten.id = "aufholen";
  kasten.setAttribute("role", "status");
  kasten.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
    "flex-direction:column;gap:1rem;background:#0b0e14;color:#c9d1d9;" +
    "font:1rem/1.5 system-ui,sans-serif;z-index:9999";
  const text = document.createElement("p");
  const balken = document.createElement("div");
  balken.style.cssText = "width:min(24rem,60vw);height:4px;background:#22272e;border-radius:2px";
  const fuellung = document.createElement("div");
  fuellung.style.cssText = "height:100%;width:0;background:#58a6ff;border-radius:2px";
  balken.appendChild(fuellung);
  kasten.append(text, balken);
  document.body.appendChild(kasten);
  return {
    setzen(anteil) {
      const prozent = Math.min(100, Math.round(anteil * 100));
      text.textContent = t("Die Welt holt auf … {prozent} %", { prozent });
      fuellung.style.width = `${prozent}%`;
    },
    entfernen() {
      kasten.remove();
    },
  };
}

// Holt die Zeit seit dem letzten Besuch nach und gibt die Diagnose zurück.
async function offlineAufholen() {
  // Ziel EINMAL festhalten. Läse man die Uhr in jeder Runde neu, liefe das
  // Ziel vor einer langen Aufholung davon -- die Schleife käme nie an. Was
  // während des Aufholens vergeht, holt der Sekundentakt unten nach.
  const ziel = spielzeitJetzt(state);
  const start = state.letzterTick;
  const spanne = ziel - start;
  if (spanne <= OHNE_ANZEIGE_BIS_MS) return vorspulenBisJetzt(state, ziel);

  const anzeige = fortschrittsanzeige();
  anzeige.setzen(0);
  let ereignisse = 0;
  let deckelGerissen = false;
  let block = Math.ceil(spanne / BLOECKE);
  const kleinsterBlock = Math.ceil(spanne / BLOECKE_MAX);
  let stand = start;
  try {
    // Erst ein Bild abwarten, sonst zeichnet der Browser die Anzeige nie --
    // er käme direkt aus dem Skript in den ersten Block.
    await naechstesBild();
    while (stand < ziel) {
      const bis = Math.min(ziel, stand + block);
      const t0 = performance.now();
      const diagnose = vorspulenBisJetzt(state, bis);
      const dauer = performance.now() - t0;
      ereignisse += diagnose.ereignisse;
      deckelGerissen = deckelGerissen || diagnose.deckelGerissen;
      stand = bis;
      anzeige.setzen((stand - start) / spanne);
      if (dauer > BLOCK_ZU_LANG_MS) block = Math.max(kleinsterBlock, Math.round(block / 2));
      await naechstesBild();
    }
  } finally {
    // Auch wenn unterwegs etwas wirft: die Anzeige darf nicht stehen bleiben,
    // sonst sieht ein spielbares Spiel aus wie ein hängendes.
    anzeige.entfernen();
  }
  return { ereignisse, deckelGerissen };
}

// EIN GERISSENER DECKEL MUSS DEN SPIELER ERREICHEN.
//
// `vorspulenBisJetzt` meldete das schon immer zurück, und niemand sah hin.
// Das ist der schlimmere Fehler von beiden: die Restzeit wird dann pauschal
// gebucht, und der Spielstand ist STILL verfälscht -- in einer Messung fand
// die Supernova dadurch einfach nicht statt, während die Farmen durch das
// Ozonloch hindurch weiterproduzierten. Eine sichtbare Fehlermeldung ist
// immer besser als eine unsichtbare Verfälschung.
//
// Die Gruppe fasst Wiederholungen zusammen: reißt der Deckel im Sekundentakt
// mehrfach, soll daraus eine Meldung mit Zähler werden und keine Lawine.
function deckelMelden(diagnose) {
  if (!diagnose || !diagnose.deckelGerissen) return;
  meldungHinzufuegen(
    state,
    t(
      "Zu viel Zeit auf einmal: die Aufholung brach nach {anzahl} Ereignissen ab. Ein Teil der vergangenen Zeit wurde nur pauschal verrechnet.",
      { anzahl: diagnose.ereignisse.toLocaleString("de-DE") }
    ),
    "deckel"
  );
}

offlineAufholen().then((diagnose) => {
  deckelMelden(diagnose);
  render(state, root);
  testmodusEinrichten(state, root, render);

  // Jede Sekunde: Zeit vorrücken (Produktion + evtl. fertige Bauten) und neu rendern.
  setInterval(() => {
    deckelMelden(vorspulenBisJetzt(state));
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
