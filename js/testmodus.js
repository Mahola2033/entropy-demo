// Dev-Werkzeug fürs Testen: Zeit manuell vorspulen (nutzt dieselbe
// Offline-Zeitsimulation, die auch beim echten Laden läuft) und
// Spielstand zurücksetzen. Kein Teil des eigentlichen Spieldesigns.

import { aufholen, deckelMelden } from "./aufholen.js";
import { STAND } from "./data.js";
import { speichern, zuruecksetzen } from "./save.js";
import { cacheLeeren } from "./systeme.js";
import { zeitfaktorVon, zeitfaktorSetzen } from "./state.js";
import { t } from "./sprache.js";

// Welcher Faktor gerade gilt, steht an den Knöpfen selbst -- ein Zustand, den
// man nicht sieht, ist im Testmodus so wertlos wie im Spiel (Prinzip 10a).
export function zeitfaktorKnoepfeAbgleichen(state, root) {
  const jetzt = zeitfaktorVon(state);
  for (const btn of root.querySelectorAll("#testmodus-leiste button[data-zeitfaktor]")) {
    btn.classList.toggle("aktiv", Number(btn.dataset.zeitfaktor) === jetzt);
  }
}

// --- Der +1-Tag-Sprung (A-058) --------------------------------------------
//
// TOBIS ENTSCHEIDUNG (18.08.): Tester behalten Skips und Zeitraffer, „aber
// vielleicht nehmen wir den 1-Tag-Skip weg, der ist einfach zu viel des
// Guten." Er hängt deshalb am STAND-Marker aus data.js -- an der Markierung,
// die MIT DEN DATEIEN reist und nicht am Port hängt.
//
// Reine Frage an den Stand, kein Zustand und keine Verzweigung im
// Spielverhalten. Als eigene Funktion, weil ein Test sie sonst nur über ein
// DOM erreichte, das dieses Projekt nicht hat.
export function tagessprungSichtbar(stand = STAND) {
  return stand === "entwicklung";
}

// GEBAUT, nicht versteckt. `hidden` ist in diesem Projekt ein Vorgabestil
// (v0.40-Lehre) und wäre schon deshalb wacklig -- vor allem aber bleibt ein
// Knopf, der im DOM steht, über die Konsole klickbar. Was ein Demo-Stand
// nicht anbieten soll, darf dort gar nicht erst entstehen.
function tagessprungBauen(root) {
  if (!tagessprungSichtbar()) return;
  const leiste = root.querySelector("#testmodus-leiste");
  if (!leiste || leiste.querySelector('button[data-sprung-sek="86400"]')) return;
  const knopf = document.createElement("button");
  knopf.dataset.sprungSek = "86400";
  knopf.textContent = t("+1 Tag");
  // Hinter den letzten Sprungknopf: die Leiste liest sich von kurz nach lang,
  // und Pause/Zeitraffer sind eine andere Sorte Bedienung.
  const letzter = Array.from(leiste.querySelectorAll("button[data-sprung-sek]")).pop();
  leiste.insertBefore(knopf, letzter ? letzter.nextSibling : leiste.firstChild);
}

export function testmodusEinrichten(state, root, renderFn) {
  // VOR dem Verdrahten: der Knopf soll seinen Handler aus derselben Schleife
  // bekommen wie die vier festen -- ein zweiter Weg wäre ein zweiter Weg.
  tagessprungBauen(root);

  // Ereignisse EINMAL beim Einrichten (Prinzip 8a) -- die Leiste steht im
  // index.html und wird nie neu gebaut.
  root.querySelectorAll("#testmodus-leiste button[data-zeitfaktor]").forEach((btn) => {
    btn.addEventListener("click", () => {
      zeitfaktorSetzen(state, Number(btn.dataset.zeitfaktor));
      zeitfaktorKnoepfeAbgleichen(state, root);
      renderFn(state, root);
      speichern(state);
    });
  });
  zeitfaktorKnoepfeAbgleichen(state, root);

  root.querySelectorAll("#testmodus-leiste button[data-sprung-sek]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sekunden = Number(btn.dataset.sprungSek);
      // Offset erhöhen statt letzterTick direkt zu verschieben, damit
      // Countdown-Anzeige und Bauzeitpunkte (die über spielzeitJetzt laufen)
      // synchron bleiben.
      state.testZeitOffsetMs = (state.testZeitOffsetMs || 0) + sekunden * 1000;

      // ÜBER `aufholen`, nicht mehr direkt über `vorspulenBisJetzt`. Ein
      // Klick auf +1m kostete gemessen 246 ms am Stück, +1h 3,9 s, +1 Tag
      // 63 s -- in dieser Zeit zeichnet der Browser nichts. Wer mehrfach
      // schnell klickte, stapelte das auf: die Seite sah aus wie abgestürzt.
      //
      // `null` heißt "es läuft schon eine Aufholung". Der Offset oben steht
      // trotzdem, und deren Außenschleife holt ihn mit -- schnelle Klicks
      // summieren sich also weiterhin, statt verworfen zu werden. Hier ist
      // dann aber Schluss: rendern und speichern mitten in einer fremden,
      // noch laufenden Rechnung wäre genau der falsche Moment.
      const diagnose = await aufholen(state);
      if (!diagnose) return;
      deckelMelden(state, diagnose);
      renderFn(state, root);
      speichern(state);
    });
  });

  root.querySelector("#testmodus-reset").addEventListener("click", () => {
    if (confirm(t("Spielstand wirklich zurücksetzen?"))) {
      zuruecksetzen();
      cacheLeeren();
      location.reload();
    }
  });
}
