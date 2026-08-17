// Dev-Werkzeug fürs Testen: Zeit manuell vorspulen (nutzt dieselbe
// Offline-Zeitsimulation, die auch beim echten Laden läuft) und
// Spielstand zurücksetzen. Kein Teil des eigentlichen Spieldesigns.

import { aufholen, deckelMelden } from "./aufholen.js";
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

export function testmodusEinrichten(state, root, renderFn) {
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
