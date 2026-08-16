// Zeit nachrechnen, ohne den Browser einzufrieren.
//
// WARUM ES DIESES MODUL GIBT: die blockweise Aufholung stand bis v0.81 in
// main.js und lief deshalb NUR beim Seitenstart. Alle anderen Wege, auf denen
// eine grosse Zeitluecke entstehen kann, riefen `vorspulenBisJetzt` in einem
// Zug auf -- der Sekundentakt und die Testmodus-Knoepfe. Gemessen am
// 16.08.2026 (tests/sprungmessung.mjs, Demo-Saat, 6 h Aufbau):
//
//   +1m  (Testmodus)      344 Ereignisse ·  246 ms
//   +1h  (Testmodus)   13.121 Ereignisse ·  3,9 s
//   +1 Tag (Testmodus)  213.667 Ereignisse ·  63 s
//   Tab 30 min weg      6.620 Ereignisse ·  2,0 s
//   Laptop 2 h zu      25.641 Ereignisse ·  7,6 s
//   ueber Nacht 8 h    90.352 Ereignisse · 25,5 s
//
// Waehrend dieser Zeit zeichnet der Browser nichts: kein Bild, kein
// Mauszeiger. Tobis Befund aus dem ersten eigenen Demo-Test war genau das --
// "mehrfach schnell auf den +1m Button gedrueckt, danach hat sich die Seite
// aufgehangen", und "passiert wohl auch manchmal wenn man zum Tab wechselt".
// Zwei Symptome, eine Ursache.
//
// Es gibt deshalb ab jetzt GENAU EINEN Weg, die Uhr um mehr als einen
// Wimpernschlag vorzuruecken, und der gibt dem Browser zwischendurch sein
// Bild zurueck.

import { vorspulenBisJetzt } from "./simulation.js";
import { spielzeitJetzt, meldungHinzufuegen } from "./state.js";
import { t } from "./sprache.js";

// IN WIE VIELE BLOECKE die Aufholung zerfaellt -- nicht, wie lange ein Block
// rechnen darf.
//
// Der erste Entwurf machte es andersherum: klein anfangen und die Blockgroesse
// an einer Ziel-Rechenzeit nachfuehren. Im Browser gemessen blieb die Anzeige
// damit 20 Sekunden lang auf 0 % stehen. Der Grund ist ein FESTER Anteil je
// Aufruf: `vorspulenBisJetzt` rueckt am Ende immer ALLE Planeten auf den
// Zielzeitpunkt vor, bei 672 Planeten ist das allein schon Millisekunden.
// Die Nachfuehrung stellte sich deshalb auf eine Blockgroesse ein, bei der
// fast nur noch dieser Sockel bezahlt wurde -- viele Aufrufe, kaum Fortschritt.
//
// Eine feste Zahl Bloecke dreht das um: der Sockel wird HUNDERTMAL bezahlt,
// egal wie lang die Abwesenheit war, und der Balken rueckt je Block um rund
// ein Prozent vor.
const BLOECKE = 100;
// ... aber nur, wenn es auch etwas zu verteilen gibt. Hundert Bloecke kosten
// hundert abgewartete Bilder, und ein Bild sind rund 16 ms -- fuer einen
// +1m-Sprung (246 ms Arbeit) waeren das 1,6 s Wanduhr statt 246 ms. Die
// Aufteilung darf die kurze Rechnung nicht teurer machen als das Problem.
//
// Deshalb bekommt ein Block eine ANGEPEILTE Groesse in Spielzeit, und die
// Blockzahl faellt daraus (nach oben gedeckelt durch BLOECKE). Fuenf
// Sekunden Spielzeit kosten gemessen rund 20 ms -- ungefaehr ein Bild.
const ZIEL_BLOCK_SPIELZEIT_MS = 5 * 1000;
// Notbremse nach unten: dauert ein Block spuerbar zu lang, wird er geteilt.
// Die Grenze ist grosszuegig -- ein kurzes Stocken ist besser als tausend
// Aufrufe, die nur ihren Sockel bezahlen.
const BLOCK_ZU_LANG_MS = 250;
// Feiner als tausendstel Schritte wird nicht geteilt: darunter ueberwiegt der
// Sockel wieder, und ein Prozentbalken braucht es auch nicht genauer.
const BLOECKE_MAX = 1000;

// Bis hierhin darf der Sekundentakt in einem Zug rechnen. Der Normalfall ist
// eine Sekunde (rund 4 ms). Zehn Sekunden sind rund 40 ms und damit noch
// unsichtbar; alles darueber gehoert in Bloecke.
export const SYNC_BIS_MS = 10 * 1000;

// Die Fortschrittsanzeige kommt ERST, wenn die Rechnung schon so lange
// laeuft. Sonst blitzt sie bei jedem Testmodus-Klick kurz auf und macht
// einen 250-ms-Sprung haesslicher, als er ist.
const ANZEIGE_AB_MS = 400;

// Nach dem Erreichen des Ziels wird die Uhr EINMAL neu gelesen. Ist die
// Restluecke groesser als das hier, geht es weiter. Damit holt ein Lauf auch
// das nach, was waehrend seiner eigenen Rechenzeit vergangen ist -- und vor
// allem das, was ein zweiter Klick auf +1m inzwischen draufgelegt hat.
// Kleiner darf die Grenze nicht werden: sonst jagt die Schleife die Wanduhr,
// die immer ein Stueck weiter ist, und kaeme nie an.
const NACHLAUF_AB_MS = 5 * 1000;

// Genau ein Lauf zur Zeit. Das ist keine Vorsicht, sondern Pflicht: zwei
// ineinander verschraenkte Aufholungen wuerden denselben Zeitraum doppelt
// buchen. Der Sekundentakt feuert waehrend eines langen Laufs weiter, und
// schnelle Klicks auf die Testmodus-Knoepfe kommen ohnehin in Serie.
let laeuft = false;

export function aufholenLaeuft() {
  return laeuft;
}

// Ein Bild abwarten. `requestAnimationFrame` ist das einzige, was einen
// gezeichneten Rahmen wirklich zusichert -- setTimeout(0) wird geklemmt und
// garantiert gar nichts.
//
// Der Wettlauf mit dem Zeitgeber ist kein Schmuck: in einem HINTERGRUND-Tab
// feuert rAF ueberhaupt nicht mehr. Ohne ihn bliebe die Aufholung dort ewig
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

// Schlichte Fortschrittsanzeige, hier erzeugt und wieder entfernt. Bewusst
// mit eigenen Stilangaben statt einer Klasse: sie kann stehen, BEVOR die
// Oberflaeche das erste Mal gerendert wurde, und soll von nichts abhaengen,
// was dort spaeter passiert.
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

// Rueckt die Uhr bis JETZT vor, in Bloecken, mit einem Bild dazwischen.
//
// Gibt die Diagnose zurueck -- oder `null`, wenn schon ein Lauf unterwegs
// war. `null` heisst ausdruecklich "nicht abgelehnt, sondern uebernommen":
// die Zeit wird trotzdem geholt, nur eben vom laufenden Aufruf. Wer `null`
// bekommt, soll nichts nachtraeglich rendern oder speichern, sonst tut er es
// mitten in einer fremden Rechnung.
export async function aufholen(state) {
  if (laeuft) return null;
  laeuft = true;

  const begonnen = performance.now();
  let anzeige = null;
  let ereignisse = 0;
  let deckelGerissen = false;

  try {
    // Aussenschleife: sie laeuft ein zweites Mal, wenn waehrend der Rechnung
    // genug Zeit dazugekommen ist -- durch die Rechenzeit selbst oder durch
    // weitere Klicks auf einen Sprung-Knopf.
    for (;;) {
      // Ziel je Runde EINMAL festhalten. Laese man die Uhr in jeder Runde
      // neu, liefe das Ziel vor einer langen Aufholung davon -- die Schleife
      // kaeme nie an.
      const ziel = spielzeitJetzt(state);
      const start = state.letzterTick;
      const spanne = ziel - start;
      if (spanne <= 0) break;

      // Kurze Luecke: in einem Zug, ohne ein einziges abgewartetes Bild.
      // Das ist der Sekundentakt im Normalbetrieb und der +10s-Knopf.
      if (spanne <= SYNC_BIS_MS) {
        const diagnose = vorspulenBisJetzt(state, ziel);
        ereignisse += diagnose.ereignisse;
        deckelGerissen = deckelGerissen || diagnose.deckelGerissen;
        break;
      }

      let block = blockGroesse(spanne);
      const kleinsterBlock = Math.ceil(spanne / BLOECKE_MAX);
      let stand = start;

      while (stand < ziel) {
        const bis = Math.min(ziel, stand + block);
        const t0 = performance.now();
        const diagnose = vorspulenBisJetzt(state, bis);
        const dauer = performance.now() - t0;
        ereignisse += diagnose.ereignisse;
        deckelGerissen = deckelGerissen || diagnose.deckelGerissen;
        stand = bis;

        // Die Anzeige kommt erst, wenn es sich lohnt -- und wenn sie einmal
        // da ist, bleibt sie bis zum Ende.
        if (!anzeige && performance.now() - begonnen > ANZEIGE_AB_MS) {
          anzeige = fortschrittsanzeige();
        }
        if (anzeige) anzeige.setzen((stand - start) / spanne);

        if (dauer > BLOCK_ZU_LANG_MS) block = Math.max(kleinsterBlock, Math.round(block / 2));
        await naechstesBild();
      }

      if (spielzeitJetzt(state) - state.letzterTick <= NACHLAUF_AB_MS) break;
    }
  } finally {
    // Auch wenn unterwegs etwas wirft: die Anzeige darf nicht stehen bleiben,
    // sonst sieht ein spielbares Spiel aus wie ein haengendes. Und die Sperre
    // muss fallen, sonst rueckt die Uhr nie wieder vor.
    if (anzeige) anzeige.entfernen();
    laeuft = false;
  }

  return { ereignisse, deckelGerissen };
}

// Wie gross ist ein Block bei dieser Spanne? Eigene Funktion, damit
// `tests/sprungmessung.mjs` dieselbe Rechnung benutzt und nicht dieselbe
// IDEE ein zweites Mal umsetzt -- zwei Stellen, die dieselbe Grenze meinen
// und getrennt gepflegt werden, sind in diesem Projekt schon einmal
// auseinandergelaufen (siehe PRINZIPIEN.md zur Puffergrenze).
export function blockGroesse(spanne) {
  const bloecke = Math.min(BLOECKE, Math.max(1, Math.round(spanne / ZIEL_BLOCK_SPIELZEIT_MS)));
  return Math.ceil(spanne / bloecke);
}

// EIN GERISSENER DECKEL MUSS DEN SPIELER ERREICHEN.
//
// `vorspulenBisJetzt` meldete das schon immer zurueck, und niemand sah hin.
// Das ist der schlimmere Fehler von beiden: die Restzeit wird dann pauschal
// gebucht, und der Spielstand ist STILL verfaelscht -- in einer Messung fand
// die Supernova dadurch einfach nicht statt, waehrend die Farmen durch das
// Ozonloch hindurch weiterproduzierten. Eine sichtbare Fehlermeldung ist
// immer besser als eine unsichtbare Verfaelschung.
//
// Die Gruppe fasst Wiederholungen zusammen: reisst der Deckel im
// Sekundentakt mehrfach, soll daraus eine Meldung mit Zaehler werden und
// keine Lawine.
//
// Steht hier und nicht mehr in main.js, weil es drei Aufrufer gibt: Start,
// Sekundentakt und Testmodus. Bei zwei Kopien haette der dritte sie
// irgendwann nicht mehr -- und ein stilles Verfaelschen faellt niemandem auf.
export function deckelMelden(state, diagnose) {
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

// Ist die offene Luecke zu gross, um sie in einem Zug zu rechnen? Der
// Sekundentakt fragt das jede Sekunde: im Normalfall ist die Luecke eine
// Sekunde und die Antwort nein. Ja heisst, der Tab war eingefroren oder der
// Rechner hat geschlafen -- dann gehoert die Rechnung in Bloecke.
//
// Die Entscheidung steht hier und nicht beim Aufrufer, weil die Grenze zum
// Wissen dieses Moduls gehoert. WAS bei "ja" passiert, entscheidet main.js.
export function grosseLuecke(state) {
  return spielzeitJetzt(state) - state.letzterTick > SYNC_BIS_MS;
}
