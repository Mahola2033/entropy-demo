// Einstiegspunkt: Spielstand laden, Offline-Zeit nachrechnen, Render-/Tick-Loop starten.

import { laden, speichern } from "./save.js";
import { zeitfaktorAnwenden } from "./state.js";
import { vorspulenBisJetzt } from "./simulation.js";
import {
  aufholen,
  aufholenLaeuft,
  grosseLuecke,
  deckelMelden,
  notausgangStand,
  notausgangZaehlen,
  zeitsprungVerwerfen,
  notausgangLoeschen,
  NOTAUSGANG_ESKALATION,
} from "./aufholen.js";
import {
  render,
  renderProfilStarten,
  renderProfilLesen,
  renderProfilAnsichten,
  hotkeysEinrichten,
  notausgangTafel,
  fensterHinweisPruefen,
} from "./ui.js";
import { testmodusEinrichten } from "./testmodus.js";
import { spracheLaden, t } from "./sprache.js";
import { phase, stockungenBeobachten, stockungsBericht } from "./stockung.js";
import { KACHELWAECHTER_ZUSTAENDE } from "./kachelwaechter-zustaende.js";
import { kachelnBilanz } from "./kachelwaechter.js";

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

// A-046: der Notausgang steht VOR der Aufholung. Ein Knopf im eingefrorenen
// Spiel kann nicht helfen -- ein blockierter Hauptthread zeichnet keine
// Knöpfe. Was hilft, ist die Frage, bevor dieselbe Rechnung ein zweites Mal
// startet.
//
// Zwei Tafeln übereinander darf es nie geben (Falle 3 des Auftrags): weil
// hier VOR dem ersten `render` gefragt wird und die Erstklärung erst darin
// entsteht, kann sich das gar nicht überschneiden.
async function startAufholen(state) {
  const stand = notausgangStand();
  if (!stand.haengt) return aufholen(state);

  const wahl = await notausgangTafel(root, stand.zaehler, NOTAUSGANG_ESKALATION);
  if (wahl === "verwerfen") {
    zeitsprungVerwerfen(state);
    render(state, root);
    speichern(state);
  } else {
    // Erneut versuchen: der Zähler steigt, damit beim dritten Mal der Weg
    // hinaus die Empfehlung ist.
    notausgangZaehlen();
  }

  // Die Zeit ist entweder verworfen oder wird jetzt neu gerechnet -- der
  // normale Rückstand seit dem Schließen kommt in beiden Fällen dazu, das ist
  // Alltag und nicht das Problem.
  const diagnose = await aufholen(state);

  // UND DANACH DEN MARKER WEG, in jedem Fall.
  //
  // Das ist kein Gürtel zum Hosenträger: `aufholen` räumt nur auf, wenn es die
  // BLOCKRECHNUNG betreten hat. Ist die Lücke diesmal kurz (unter zehn
  // Sekunden), passiert das nie -- der Marker überlebte, und die Tafel käme
  // bei jedem Start wieder, obwohl längst nichts mehr hängt. Beim Nachsehen
  // im Browser genau so aufgetreten.
  notausgangLoeschen();
  return diagnose;
}

startAufholen(state).then((diagnose) => {
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
    // A-038: ZUERST den Zeitraffer verrechnen, dann vorspulen -- sonst käme
    // der Zuwachs dieses Takts erst eine Sekunde später an. Bei Pause
    // schrumpft der Versatz hier genau um die verstrichene Echtzeit, die
    // Spielzeit steht also, und `vorspulenBisJetzt` findet nichts zu tun.
    zeitfaktorAnwenden(state);
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
    // A-111: NUR hier, im gewöhnlichen Sekundentakt -- bewusst nicht nach dem
    // render() im grosseLuecke-Zweig darüber (der hängt an aufholen(), also
    // demselben Umfeld wie der Start, siehe Begründung in ui.js).
    fensterHinweisPruefen(state, root);
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

// Kachel-Wächter (A-158): einen der drei benannten Zustände live einsetzen
// und danach prüfen -- vor jedem Release, von Hand, wie die übrigen
// Debug-Werkzeuge hier. `state` ist `const` (oben) und von mehreren
// Closures eingefangen (Render-/Speicher-Takt) -- ersetzt werden deshalb
// die EIGENSCHAFTEN des vorhandenen Objekts, nie die Referenz selbst.
//   __entropy.kachelWaechter.zustand("mitte");  // frueh | mitte | spaet
//   __entropy.kachelWaechter.pruefen();         // Bilanz der aktuellen Ansicht
function kachelWaechterZustandSetzen(name, saat) {
  const bauer = KACHELWAECHTER_ZUSTAENDE[name];
  if (!bauer) {
    throw new Error(t('kachelWaechter: unbekannter Zustand "{name}" -- frueh, mitte oder spaet.', { name }));
  }
  const frisch = bauer(saat);
  for (const schluessel of Object.keys(state)) delete state[schluessel];
  Object.assign(state, frisch);
  render(state, root);
  return t('Zustand "{name}" gesetzt und gerendert.', { name });
}

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
  kachelWaechter: {
    zustand: kachelWaechterZustandSetzen,
    pruefen: () => kachelnBilanz(root),
  },
};
