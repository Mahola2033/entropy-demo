// Kachel-Wächter (A-158): drei rein geometrische Prüfungen gegen das echte,
// gerenderte DOM -- Übergriffe werden GEMESSEN, nicht gesehen.
//
// Braucht ECHTES Layout (`getBoundingClientRect`/`scrollWidth`/`clientWidth`)
// -- jsdom liefert dort GEMESSEN nur Nullen (kein Rendering-Engine, siehe
// Ergebnis-Abschnitt des Auftrags für die Messung). Läuft deshalb im
// Browser, ausgelöst über die Konsole (`window.__entropy.kachelWaechter`,
// js/main.js) -- Weg B aus dem Auftrag, dasselbe Muster wie die übrigen
// Debug-Werkzeuge dort (`profilStarten`, `stockungen`, ...).
//
// Absichtlich Positioniertes ist ausgenommen: Tooltips, Menüs und Overlays
// (`position: absolute/fixed`) sollen überlappen. Geprüft werden nur
// Elemente im normalen Fluss (`static`/`relative`).

// Welche Kachel-/Kartenfamilien geprüft werden. `.res-kachel` ist die
// Ressourcenleiste (A-157s Fall, in JEDEM Bereich sichtbar, A-076).
// `.gebaeude-item` ist die zweite große Kachelfamilie (Anlagen & Sektoren,
// A-146) mit derselben Grid-/Flex-Bauweise. Weitere Familien: hier ergänzen.
export const KACHEL_SELECTOR = ".res-kachel, .gebaeude-item";

// Ein Pixel Toleranz, nicht mehr (bekannte Falle im Auftrag): ein Element,
// das exakt an der Kachelkante endet (Grid-Kacheln mit `gap`), ist kein
// Übergriff.
export const TOLERANZ_PX = 1;

function istStatischPositioniert(el) {
  const pos = getComputedStyle(el).position;
  return pos === "static" || pos === "relative";
}

function hatFlaeche(rect) {
  return rect.width > 0 && rect.height > 0;
}

function beschreibung(el) {
  return {
    tag: el.tagName,
    klasse: typeof el.className === "string" ? el.className : "",
    text: (el.textContent || "").trim().slice(0, 40),
  };
}

// Alle Nachfahren einer Kachel, die im normalen Fluss stehen und selbst eine
// Fläche einnehmen -- die gemeinsame Kandidatenliste für alle drei Prüfungen.
function pruefKandidaten(kachel) {
  return [...kachel.querySelectorAll("*")].filter(
    (el) => istStatischPositioniert(el) && hatFlaeche(el.getBoundingClientRect())
  );
}

// Prüfung 1: Übergriff -- das Rechteck eines Elements schneidet das Rechteck
// einer FREMDEN Kachel (Ursache aus A-157, sichtbar, weil die Zeilen
// Hintergrund tragen).
function uebergriffe(kacheln, rechtecke) {
  const treffer = [];
  kacheln.forEach((kachel, i) => {
    for (const el of pruefKandidaten(kachel)) {
      const r = el.getBoundingClientRect();
      rechtecke.forEach((fremde, j) => {
        if (j === i) return;
        const schneidet = !(
          r.right <= fremde.left + TOLERANZ_PX ||
          r.left >= fremde.right - TOLERANZ_PX ||
          r.bottom <= fremde.top + TOLERANZ_PX ||
          r.top >= fremde.bottom - TOLERANZ_PX
        );
        if (schneidet) treffer.push({ kachel: i, fremdeKachel: j, element: beschreibung(el) });
      });
    }
  });
  return treffer;
}

// Prüfung 2: Kastenüberlauf -- ein Kind im normalen Fluss ragt über den Rand
// seines Elternteils, das nicht scrollt (die Ursache eine Ebene früher als
// der Übergriff -- ein Kind kann seinen Elternrahmen sprengen, ohne dabei
// schon eine fremde Kachel zu treffen).
function kastenueberlaeufe(kacheln) {
  const treffer = [];
  kacheln.forEach((kachel, i) => {
    for (const el of pruefKandidaten(kachel)) {
      const eltern = el.parentElement;
      if (!eltern) continue;
      // Scrollt der Elternteil selbst (overflow != visible), fängt er den
      // Überlauf ab -- das ist dann kein Kastenüberlauf im hier gemeinten
      // Sinn (die Regel gilt fürs FEHLEN eines solchen Auffangnetzes).
      if (getComputedStyle(eltern).overflow !== "visible") continue;
      const r = el.getBoundingClientRect();
      const er = eltern.getBoundingClientRect();
      const ueberstand = Math.max(
        r.right - er.right,
        er.left - r.left,
        r.bottom - er.bottom,
        er.top - r.top
      );
      if (ueberstand > TOLERANZ_PX) {
        treffer.push({ kachel: i, element: beschreibung(el), px: Math.round(ueberstand) });
      }
    }
  });
  return treffer;
}

// Prüfung 3: stille Kürzung -- `scrollWidth > clientWidth`, kein `ellipsis`,
// kein `title` in der Kette (vorhanden, aber bisher nur von Hand gefahren).
// Emoji/Symbolschriften verfälschen Textbreiten (bekannte Falle) -- die
// Prüfung stützt sich deshalb NUR auf gerechnete Breiten, nie auf
// Zeichenzahlen.
function stilleKuerzungen(kacheln) {
  const treffer = [];
  kacheln.forEach((kachel, i) => {
    for (const el of pruefKandidaten(kachel)) {
      if (el.scrollWidth <= el.clientWidth + TOLERANZ_PX) continue;
      if (getComputedStyle(el).textOverflow === "ellipsis") continue;
      let knoten = el;
      let hatTitel = false;
      while (knoten) {
        if (knoten.hasAttribute && knoten.hasAttribute("title") && knoten.getAttribute("title")) {
          hatTitel = true;
          break;
        }
        knoten = knoten.parentElement;
      }
      if (hatTitel) continue;
      treffer.push({ kachel: i, element: beschreibung(el) });
    }
  });
  return treffer;
}

// Der eigentliche Lauf: alle sichtbaren Kacheln des aktuellen DOM, alle drei
// Prüfungen. `root` ist standardmäßig `document` -- ein anderes Root ist nur
// für Tests/Ausschnitte gedacht.
export function kachelnPruefen(root = document) {
  const kacheln = [...root.querySelectorAll(KACHEL_SELECTOR)].filter((k) =>
    hatFlaeche(k.getBoundingClientRect())
  );
  const rechtecke = kacheln.map((k) => k.getBoundingClientRect());
  return {
    kachelAnzahl: kacheln.length,
    uebergriffe: uebergriffe(kacheln, rechtecke),
    kastenueberlaeufe: kastenueberlaeufe(kacheln),
    stilleKuerzungen: stilleKuerzungen(kacheln),
  };
}

// Kurzbilanz für die Konsole -- eine Zahl je Prüfung, kein Rohdatenberg.
export function kachelnBilanz(root = document) {
  const r = kachelnPruefen(root);
  const gesamt = r.uebergriffe.length + r.kastenueberlaeufe.length + r.stilleKuerzungen.length;
  return {
    kachelAnzahl: r.kachelAnzahl,
    uebergriffe: r.uebergriffe.length,
    kastenueberlaeufe: r.kastenueberlaeufe.length,
    stilleKuerzungen: r.stilleKuerzungen.length,
    gruen: gesamt === 0,
    einzelheiten: r,
  };
}
