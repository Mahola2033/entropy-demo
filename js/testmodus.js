// Dev-Werkzeug fürs Testen: Zeit manuell vorspulen (nutzt dieselbe
// Offline-Zeitsimulation, die auch beim echten Laden läuft) und
// Spielstand zurücksetzen. Kein Teil des eigentlichen Spieldesigns.

import { vorspulenBisJetzt } from "./simulation.js";
import { speichern, zuruecksetzen } from "./save.js";
import { cacheLeeren } from "./systeme.js";
import { t } from "./sprache.js";

export function testmodusEinrichten(state, root, renderFn) {
  root.querySelectorAll("#testmodus-leiste button[data-sprung-sek]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sekunden = Number(btn.dataset.sprungSek);
      // Offset erhöhen statt letzterTick direkt zu verschieben, damit
      // Countdown-Anzeige und Bauzeitpunkte (die über spielzeitJetzt laufen)
      // synchron bleiben.
      state.testZeitOffsetMs = (state.testZeitOffsetMs || 0) + sekunden * 1000;
      vorspulenBisJetzt(state);
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
