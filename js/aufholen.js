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

import { vorspulenBisJetzt, vorspulenSchrittweise } from "./simulation.js";
import { spielzeitJetzt, meldungHinzufuegen } from "./state.js";
import { phase } from "./stockung.js";
import { t } from "./sprache.js";

// WIE VIEL EIN BLOCK RECHNEN DARF -- gemessen, nicht geschaetzt.
//
// Drei Anlaeufe, und die Geschichte gehoert dazu, weil jeder den naechsten
// erklaert:
//
//   v0.81  Feste Zahl Bloecke, aufgeteilt nach ZEITSPANNE. Ein erster
//          Entwurf hatte die Groesse an einer Ziel-Rechenzeit nachgefuehrt
//          und war gemessen gescheitert: ohne Untergrenze stellte er sich
//          auf eine Groesse ein, bei der fast nur noch der FESTE SOCKEL je
//          Aufruf bezahlt wurde (am Ende jedes Aufrufs ruecken ALLE Planeten
//          vor, bei 672 allein Millisekunden). Balken 20 s auf 0 %.
//   v0.86  Zeitbudget mit Untergrenze, Breite aus der gemessenen Rate. Besser,
//          aber der erste Block jeder Spanne blieb blind (ueber Nacht 596 ms).
//   v0.87  Wachstumsbremse dazu. Immer noch 187 von 1182 Bloecken ueber
//          100 ms, Spitze 1238 ms.
//
//   v0.88  Budget als EREIGNISZAHL statt Zeitspanne (A-032, erster Anlauf).
//          Schlimmster Block 1238 -> 265 ms. Immer noch 26 Bloecke ueber
//          150 ms.
//
// WARUM ALLE VIER ZU KURZ GRIFFEN, und das ist die Lehre: JEDE Zaehlung im
// Voraus schaetzt, was ein Schritt kosten wird. Und diese Schaetzung ist
// strukturell unmoeglich:
//
//   - nach Zeitspanne, weil die Ereignisdichte auf Minutenebene stossweise
//     ist (gemessen 13 Ereignisse/s gegen 4,7 im Stundenmittel);
//   - nach Ereigniszahl, weil Ereignisse sich um Groessenordnungen
//     unterscheiden. Gemessen an 701 Planeten: 0,15 ms je Ereignis bis zu 200
//     Stueck, 0,54 ms bei 400. Der Grund steht in `naechstesEreignis` -- ein
//     Ereignis mit `planeten: null` ("beruehrt moeglicherweise alles") rueckt
//     ALLE Planeten vor und kostet allein so viel wie hunderte lokale.
//
// Was nicht schaetzt, ist die Uhr. `vorspulenSchrittweise` fragt sie nach
// JEDEM Ereignis und haelt, wenn das Budget aufgebraucht ist. Die Blockdauer
// ist damit hoechstens Budget plus ein Ereignis -- ohne Vorhersage, ohne
// Nachfuehrung, ohne Annahme ueber das Geraet. Die drei Regelwerke davor sind
// alle ersatzlos entfallen.
const ZIEL_BLOCK_RECHENZEIT_MS = 50;
// Fangnetz, falls die Uhr nicht weiterlaeuft (angehaltene Zeit in einer
// Testumgebung). Im Normalbetrieb greift immer das Zeitbudget zuerst.
const EREIGNIS_FANGNETZ = 100_000;

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
// Im Hintergrund-Tab gibt es kein Bild, auf das man warten koennte -- und
// `setTimeout` wird dort auf mindestens eine Sekunde geklemmt. Beides zusammen
// hiess: die Aufholung kriecht, sobald der Tab nicht vorn ist. Genau der Fall,
// den Tobi als "passiert wohl auch manchmal wenn man zum Tab wechselt" gemeldet
// hat, und er wurde durch das feinere Zeitbudget (A-030) noch spuerbarer --
// mehr Bloecke heisst oefter warten.
//
// Ein `MessageChannel`-Ping wird NICHT geklemmt. Er gibt dem Browser die
// Kontrolle zurueck (ein echter Makrotask, keine Microtask-Schleife, die den
// Thread gar nicht freigibt) und kommt sofort wieder. Im Hintergrund ist das
// die richtige Wahl: niemand sieht ein Bild, aber Klicks und Zeitgeber
// sollen weiter durchkommen.
function naechsterTakt() {
  return new Promise((fertig) => {
    const kanal = new MessageChannel();
    kanal.port1.onmessage = () => {
      kanal.port1.close();
      fertig();
    };
    kanal.port2.postMessage(0);
  });
}

function naechstesBild() {
  const unsichtbar =
    typeof document !== "undefined" && document.visibilityState === "hidden";
  if (unsichtbar && typeof MessageChannel === "function") return naechsterTakt();

  return new Promise((fertig) => {
    let erledigt = false;
    const einmal = () => {
      if (erledigt) return;
      erledigt = true;
      fertig();
    };
    // `requestAnimationFrame` ist das einzige, was einen gezeichneten Rahmen
    // wirklich zusichert -- setTimeout(0) wird geklemmt und garantiert nichts.
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(einmal);
    // Wettlauf als Sicherheitsnetz: rAF feuert nicht, wenn der Tab genau
    // zwischen den beiden Zeilen unsichtbar wird.
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
  // Der Wächter merkt sich, SEIT WANN die Uhr steht (Wanduhr) und wie viele
  // Blöcke das waren -- die Zahl geht nur in die Meldung. Beides steht
  // außerhalb beider Schleifen: ein Stillstand hört nicht auf, nur weil die
  // Außenschleife eine neue Runde beginnt.
  let steheStillSeit = null;
  let steheStillBloecke = 0;

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

      // KEINE Vorhersage mehr, wie viel in einen Block passt: das Budget ist
      // die Wanduhr, und `vorspulenSchrittweise` fragt sie nach jedem
      // Ereignis. Die Ereigniszahl ist nur noch ein Fangnetz fuer den Fall,
      // dass die Uhr stillsteht. Warum das so sein muss, steht oben bei den
      // Konstanten -- vier Anlaeufe, drei davon mit einer Schaetzung.
      let nummer = 0;

      for (;;) {
        nummer += 1;
        // Phase benennen, damit eine gemeldete Stockung sagen kann, WER sie
        // war -- ohne das liefert der Beobachter nur eine Zahl (A-030).
        const phaseFertig = phase(`Aufholung Block ${nummer}`);
        const vorher = state.letzterTick;
        const schritt = vorspulenSchrittweise(state, ziel, EREIGNIS_FANGNETZ, ZIEL_BLOCK_RECHENZEIT_MS);
        phaseFertig();
        ereignisse += schritt.ereignisse;

        // DER WÄCHTER (A-042). Jeder Block MUSS die Uhr strikt vorrücken.
        //
        // Tut er es nicht, dreht die Schleife auf der Stelle: der Balken
        // bleibt bei 0 %, die Seite sieht aus wie abgestürzt, und ein
        // Neuladen hilft nicht, weil `testZeitOffsetMs` im Spielstand liegt
        // und das Ziel wieder dorthin setzt. Genau das hat Tobi am 17.08. auf
        // der Live-Demo gemeldet.
        //
        // Die Invariante ist SCHÄRFER als „läuft nie rückwärts": sie verlangt
        // vorwärts. Ein Block, der nichts bewegt, ist kein langsamer Block,
        // sondern ein kaputter -- die Zeit rückt zwischen zwei Ereignissen
        // immer vor, und wenn nicht, steht ein Ereignis im Weg, das sich
        // nicht abräumt.
        //
        // DREI in Folge, nicht einer: ein einzelner Block darf legitim bei
        // null landen, wenn er sein Zeitbudget schon am ersten Ereignis
        // verbraucht und dieses Ereignis genau auf `letzterTick` liegt. Erst
        // die Wiederholung ist der Beweis, dass sich nichts mehr bewegt.
        if (state.letzterTick > vorher) {
          steheStillSeit = null;
          steheStillBloecke = 0;
        } else {
          steheStillBloecke += 1;
          if (steheStillSeit === null) steheStillSeit = performance.now();
        }
        if (steheStillSeit !== null && performance.now() - steheStillSeit >= STILLSTAND_MS) {
          stillstandMelden(state, {
            bloecke: steheStillBloecke,
            zeitpunkt: state.letzterTick,
            art: schritt.naechsteArt,
            ereignisZeit: schritt.naechsteZeit,
          });
          // ABBRECHEN, NICHT PAUSCHAL BUCHEN. Die Regel aus A-032 gilt hier
          // genauso: lieber eine offene Restzeit, die man sieht, als eine
          // stillschweigend verrechnete, die den Spielstand verfälscht.
          return { ereignisse, deckelGerissen, stillstand: true };
        }

        // Die Anzeige kommt erst, wenn es sich lohnt -- und wenn sie einmal
        // da ist, bleibt sie bis zum Ende.
        if (!anzeige && performance.now() - begonnen > ANZEIGE_AB_MS) {
          anzeige = fortschrittsanzeige();
        }
        if (anzeige) anzeige.setzen((schritt.erreicht - start) / spanne);

        if (schritt.fertig) break;
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

// Wie lange der Wächter Stillstand duldet, bevor er abbricht -- in WANDUHR-
// ZEIT und nicht in Blöcken.
//
// Die erste Fassung zählte Blöcke (drei in Folge ohne Fortschritt) und war
// GEMESSEN falsch: in Tobis Spielstand takten 376 Fraktionen auf denselben
// Zeitpunkt. Die Uhr steht dann über mehrere Blöcke völlig zu Recht still,
// während die Ereignisse dieses einen Zeitpunkts abgearbeitet werden -- der
// Wächter hätte eine gesunde Aufholung abgebrochen.
//
// Was einen echten Stillstand von einem dichten Zeitpunkt unterscheidet, ist
// nicht die Zahl der Blöcke, sondern die DAUER: gleichzeitige Ereignisse sind
// endlich viele und in Millisekunden weg, eine Schleife dreht für immer. Fünf
// Sekunden sind großzügig genug für jeden denkbaren Ereignisstau und kurz
// genug, dass niemand sie für ein hängendes Spiel hält.
export const STILLSTAND_MS = 5000;

// EINE HÄNGENDE AUFHOLUNG MUSS SICH SELBST MELDEN (A-042).
//
// Der Unterschied zu einer stummen Endlosschleife ist der ganze Punkt: eine
// Schleife, die sich meldet, ist ein Fehlerbericht -- eine stumme ist ein
// toter Spielstand, und der Spieler hat nichts in der Hand außer „hängt".
// Deshalb steht in der Meldung, was man zum Suchen braucht: wie viele Blöcke,
// welcher Zeitpunkt, und WELCHE Ereignisart nicht weichen wollte.
//
// Gruppe `stillstand`, damit mehrere Versuche eine Zeile mit Zähler ergeben
// und keine Lawine -- dieselbe Regel wie beim gerissenen Deckel darunter.
export function stillstandMelden(state, { bloecke, zeitpunkt, art, ereignisZeit }) {
  const rueckstandMin = Math.round(Math.max(0, (ereignisZeit ?? zeitpunkt) - zeitpunkt) / 60000);
  meldungHinzufuegen(
    state,
    t(
      "Die Aufholung kam nicht voran: {bloecke} Blöcke ohne Fortschritt, hängengeblieben bei einem Ereignis der Art [{art}]. Der Rest der Zeit bleibt offen und wurde NICHT verrechnet.",
      { bloecke, art: art || t("unbekannt"), minuten: rueckstandMin }
    ),
    "stillstand"
  );
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
