// Galaxie- und Systemkarte.
//
// ANLASS (Tobi, 16.08.2026): "Flottennutzung und Sichtbarkeit, was sie
// tatsächlich machen, erhöhen." Eine Flotte war bis hierher eine Zeile mit
// einer Restzeit. Wo sie steckt, welchen Weg sie nimmt und wie weit sie schon
// ist, stand nirgends -- man musste es sich denken. Ein Punkt, der sich
// zwischen zwei Sternen bewegt, sagt das ohne einen einzigen Satz.
//
// Die Karten ERFINDEN DABEI NICHTS. Jede Zahl, die sie zeichnen, rechnet das
// Spiel ohnehin:
//   systemPosition(seed, id)         Ort eines Sterns, rein aus der Saat
//   flottePosition(state, f, zeit)   wo eine Flotte in diesem Moment ist
//   holeSystem(state, id).objekte    was in einem System steht
// Sie sind eine ANSICHT auf vorhandene Wahrheit, kein zweites Modell. Deshalb
// können sie auch nicht von der Liste abweichen: beide lesen dieselbe Quelle.
//
// --- Die entscheidende Bauregel ------------------------------------------
//
// render() läuft JEDE SEKUNDE. Sternpositionen sind reine Funktionen von
// (Saat, Systemnummer) und ändern sich NIE -- sie werden EINMAL gezeichnet und
// danach nur noch in ihren Attributen abgeglichen. Bewegt wird ausschließlich,
// was tatsächlich fliegt.
//
// Abgeglichen wird mit `listeAbgleichen` aus ui.js, demselben Werkzeug wie bei
// jeder anderen Liste im Spiel (Prinzip 5: kein zweiter Mechanismus, und
// Prinzip 8a: ein Element, das stehen bleibt, verschluckt keinen Klick).
// Der Ringtausch der Importe -- ui.js holt die Karten, karte.js holt das
// Abgleich-Werkzeug -- ist zulässig, weil hier NICHTS davon beim Laden des
// Moduls benutzt wird, sondern erst beim ersten Zeichnen.
//
// Und: ist der Galaxiebereich nicht sichtbar, tut diese Datei GAR NICHTS.
// Eine geschlossene Ansicht darf keine Rechenzeit kosten -- eine Messung hat
// der alten Galaxieansicht 4,5 ms pro Sekunde nachgewiesen, auch geschlossen.

import { GALAXIE_REGELN, SPIELER_FRAKTION, TYP_SYMBOL } from "./data.js?v=0.9.1";
import { systemPosition, systemName, sternFuer } from "./galaxie.js?v=0.9.1";
import { flottePosition, schiffeText, flotteRestreichweite } from "./flotten.js?v=0.9.1";
import { holeSystem, objektGesperrt } from "./systeme.js?v=0.9.1";
import {
  planetenVon,
  planetAn,
  eigenerPlanetAn,
  flottenVon,
  systemBesucht,
  untersuchteOrbits,
  fraktionVon,
  fraktionById,
} from "./state.js?v=0.9.1";
import { stromFuer } from "./zufall.js?v=0.9.1";
import { t, sprache } from "./sprache.js?v=0.9.1";
import { listeAbgleichen, attributSetzen, textSetzen, fmtDauer } from "./ui.js?v=0.9.1";

const SVG_NS = "http://www.w3.org/2000/svg";

// Beide Karten rechnen in einem festen Koordinatenraum von -100..100 statt in
// Galaxie-Einheiten. Damit bleiben alle Größen (Punktradius, Strichstärke,
// Schriftgröße) unabhängig davon, wie groß die Galaxie gerade ist -- wer
// GALAXIE_REGELN.anzahlSysteme hochdreht, bekommt eine dichtere Karte und
// keine anders aussehende.
const KARTE_RADIUS = 100;

// Das System von innen: der Stern sitzt in der Mitte, der äußerste Orbit auf
// SYS_AUSSEN. SYS_RAND ist der Kartenrand, an dem anfliegende Flotten
// auftauchen.
const SYS_INNEN = 26;
const SYS_AUSSEN = 90;
const SYS_RAND = 99;

// Eine Flotte im Orbit steht genau dort, wo auch das Objekt steht -- und
// verdeckte es dadurch vollständig. Ausgerechnet die verteidigten Objekte
// waren so nicht mehr zu sehen, also genau die, um die es geht. Die Marke
// rückt deshalb ein Stück nach außen: derselbe Winkel, dieselbe Aussage,
// aber beides bleibt lesbar.
const FLOTTEN_VERSATZ = 11;

function svgEl(tag, attribute = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, wert] of Object.entries(attribute)) el.setAttribute(name, String(wert));
  return el;
}

function verschieben(el, x, y) {
  attributSetzen(el, "transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
}

// --- Flottenmarke (A-056) -------------------------------------------------
//
// Drei Teile statt einem, aus demselben Grund wie beim Stern:
//   treffer  unsichtbare, GRÖSSERE Klickfläche. Die Raute ist 2,8 Einheiten
//            hoch -- darauf zu zielen wäre keine Bedienung, sondern Glück.
//   wahl     die zweite, größere Raute um den Punkt: die Markierung der
//            gewählten Flotte. Sie liegt UNTER der eigentlichen Marke, damit
//            sie sie umrahmt statt verdeckt.
//   marke    der Punkt selbst, unverändert.
// Ob die Auswahl-Raute zu sehen ist, entscheidet allein die Klasse der
// Gruppe (`karte-flotte-gewaehlt`) -- kein zweiter Zustand im DOM.
function flottenMarkeBauen(marke, wahl) {
  const gruppe = svgEl("g", { class: "karte-flotte" });
  gruppe.appendChild(svgEl("circle", { class: "karte-flotte-treffer" }));
  gruppe.appendChild(svgEl("path", { class: "karte-flotte-wahl", d: wahl }));
  gruppe.appendChild(svgEl("path", { class: "karte-flotte-marke", d: marke }));
  gruppe.appendChild(svgEl("title"));
  return gruppe;
}

// Eigene Flotten sind wählbar, fremde nicht (so beauftragt). Das Attribut ist
// zugleich die Klickmarke -- der Handler sucht nichts anderes, eine fremde
// Flotte kann deshalb gar nicht erst getroffen werden.
function flottenMarkeWaehlbar(gruppe, flotte, klassen, aktiveFlotte) {
  const eigen = fraktionVon(flotte) === SPIELER_FRAKTION;
  attributSetzen(gruppe, "data-flotte", eigen ? flotte.id : null);
  if (eigen && flotte.id === aktiveFlotte) klassen.push("karte-flotte-gewaehlt");
}

// Rückrufe liegen im Modul und nicht in der Ereignis-Funktion: der Handler
// wird EINMAL angehängt (Prinzip 8a) und würde sonst für immer die Fassung aus
// dem allerersten Takt festhalten.
const rueckrufe = { system: null, orbit: null, flotte: null };

// Was der Mauszeiger für einen Tooltip braucht. Wird beim Zeichnen
// nachgeführt, damit der Text erst beim Überfahren entsteht -- 500 Tooltips
// pro Sekunde zusammenzusetzen wäre die teuerste Arbeit der ganzen Karte, und
// gelesen wird immer nur einer.
let galaxieStand = { state: null, abstand: [], reichweite: 0 };

// Der zuletzt gesetzte Klassenname je System, damit die Schleife über 500
// Sterne das DOM gar nicht erst befragen muss. attributSetzen liest sonst je
// Stern zweimal zurück -- richtig, aber tausend Rückfragen pro Sekunde für
// eine Antwort, die wir selbst geschrieben haben. Wird beim Neuaufbau des
// Gerüsts geleert, sonst hielte er nach einem Reset die Zustände der alten
// Galaxie fest.
let sternKlassen = [];

// --- Galaxiekarte ---------------------------------------------------------

function galaxieSkala() {
  return KARTE_RADIUS / GALAXIE_REGELN.radius;
}

function sternTitelText(state, systemId) {
  const entfernung = galaxieStand.abstand[systemId];
  const eigene = planetenVon(state).filter((p) => p.systemId === systemId);
  const untersuchte = systemBesucht(state, systemId) ? untersuchteOrbits(state, systemId) : 0;
  return [
    systemName(state.galaxie.seed, systemId),
    Number.isFinite(entfernung) ? t("Entfernung {entfernung}", { entfernung: entfernung.toFixed(1) }) : "",
    eigene.length ? t("Eigene Stützpunkte hier: {liste}", { liste: eigene.map((p) => p.name).join(", ") }) : "",
    // A-070: dieselbe Zeile wie in der Galaxie-Liste, deshalb dieselbe
    // Einzahl-Form. Waere sie hier bei „Orbit(s)" geblieben, stuende auf der
    // Karte eine andere Sprache als eine Handbreit daneben in der Liste.
    untersuchte > 0
      ? untersuchte === 1
        ? t("1 Orbit bereits untersucht")
        : t("{anzahl} Orbits bereits untersucht", { anzahl: untersuchte })
      : t("Noch nicht besucht"),
    entfernung <= galaxieStand.reichweite ? t("Systemkarte öffnen") : t("außer Reichweite"),
  ]
    .filter(Boolean)
    .join("\n");
}

function flottenTitelText(state, flotte, jetzt) {
  const eigen = fraktionVon(flotte) === SPIELER_FRAKTION;
  const fraktion = fraktionById(state, fraktionVon(flotte));
  const ab = flotte.abschnitt;
  return [
    // Eigennamen laufen wie überall im Spiel roh durch -- ein Sprachwechsel
    // benennt weder Flotten noch Fraktionen um.
    flotte.name,
    eigen || !fraktion ? "" : fraktion.name,
    schiffeText(flotte.schiffe),
    ab && ab.nach.systemId !== null
      ? t("Ziel {system} · noch {dauer}", {
          system: systemName(state.galaxie.seed, ab.nach.systemId),
          dauer: fmtDauer((ab.ankunftZeit - jetzt) / 1000),
        })
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Das Gerüst der Galaxiekarte: alle Sterne EINMAL, danach nie wieder.
//
// Zwei Ebenen je Stern statt einer: der sichtbare Punkt darf klein sein (bei
// 500 Systemen muss er das sogar), die Klickfläche darf es nicht. Getrennt
// gehalten kann der Punkt seine Größe nach Lage ändern, ohne dass das Ziel
// unter dem Zeiger mitwandert -- Prinzip 8a gilt auch für "getroffen, aber
// danebengeklickt".
function galaxieGeruestBauen(svg, state) {
  const skala = galaxieSkala();
  sternKlassen = [];
  svg.replaceChildren(
    svgEl("g", { "data-reichweite": "" }),
    svgEl("g", { "data-flottenring": "" }),
    svgEl("g", { "data-sterne": "" }),
    svgEl("g", { "data-wahl": "" }),
    svgEl("g", { "data-treffer": "" }),
    svgEl("g", { "data-routen": "" }),
    svgEl("g", { "data-vorschau": "" }),
    svgEl("g", { "data-flotten": "" })
  );

  const sterne = svg.querySelector("[data-sterne]");
  const treffer = svg.querySelector("[data-treffer]");
  for (let id = 1; id <= state.galaxie.anzahlSysteme; id++) {
    const pos = systemPosition(state.galaxie.seed, id);
    const stern = sternFuer(state.galaxie.seed, id, id === state.galaxie.heimatSystem);
    const x = (pos.x * skala).toFixed(2);
    const y = (pos.y * skala).toFixed(2);
    sterne.appendChild(
      svgEl("circle", { class: "karte-stern", cx: x, cy: y, r: 1.15, fill: stern.farbe, "data-punkt": id })
    );
    const ziel = svgEl("circle", { class: "karte-treffer", cx: x, cy: y, r: 3.2, "data-system": id });
    ziel.appendChild(svgEl("title"));
    treffer.appendChild(ziel);
  }

  svg.querySelector("[data-wahl]").appendChild(svgEl("circle", { class: "karte-wahl", r: 4.6, hidden: "" }));
  svg
    .querySelector("[data-flottenring]")
    .appendChild(svgEl("circle", { class: "karte-flottenring", cx: 0, cy: 0, r: 0, hidden: "" }));

  // Die Vorschaulinie der Kommandoleiste (A-057): wohin dieser Auftrag die
  // Flotte schicken WÜRDE, und wie lange sie unterwegs wäre. Zwei feste
  // Elemente, kein Abgleich -- es gibt immer genau eine Vorschau.
  const vorschau = svg.querySelector("[data-vorschau]");
  vorschau.appendChild(svgEl("line", { class: "karte-vorschau", hidden: "" }));
  vorschau.appendChild(svgEl("text", { class: "karte-vorschau-text", hidden: "" }));
}

// ===== Zoom und Verschieben (A-039) =======================================
//
// Der ganze Zoom ist EINE Zeile Wirkung: das `viewBox`-Attribut der bereits
// vorhandenen SVG. Nichts am Zeichenpfad ändert sich -- keine zweite
// Zeichenroutine, keine Transformationsmatrix, die irgendwo mitgeführt werden
// müsste (Prinzip 5, und die Falle aus dem Auftrag).
//
// DIE TREFFERERKENNUNG BRAUCHT DEHALB GAR NICHTS. Der Auftrag nennt sie „die
// eigentliche Arbeit" -- das gilt für eine Karte, die selbst transformiert
// (Canvas, oder ein `transform` auf einer Gruppe). Bei einer viewBox rechnet
// der Browser die Zeigerposition selbst zurück: `ereignis.target` ist bei
// jedem Maßstab dasselbe Element wie in der Übersicht. Nachgemessen, nicht
// angenommen (siehe Ergebnis von A-039).
//
// Der Zustand liegt bewusst NICHT im Spielstand: eine Ansicht ist keine Welt.
// Er hängt an der SVG selbst und ist mit dem Neuladen weg -- so beauftragt.
const GRUND_HALB = 104; // die halbe Kantenlänge aus dem index.html-viewBox
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_SCHRITT = 1.3;

const ansichten = new WeakMap();

function ansichtVon(svg) {
  let a = ansichten.get(svg);
  if (!a) {
    a = { zoom: 1, mx: 0, my: 0 };
    ansichten.set(svg, a);
  }
  return a;
}

// Die Mitte darf nur so weit wandern, dass der Rand der Karte nicht ins Bild
// gerät. Bei Zoom 1 ist der Spielraum null -- ganz herausgezoomt sieht man
// immer die volle Karte, und zwar mittig (Fertig-Kriterium des Auftrags).
function ansichtAnwenden(svg, a) {
  const halb = GRUND_HALB / a.zoom;
  const spiel = GRUND_HALB - halb;
  a.mx = Math.max(-spiel, Math.min(spiel, a.mx));
  a.my = Math.max(-spiel, Math.min(spiel, a.my));
  attributSetzen(
    svg,
    "viewBox",
    `${(a.mx - halb).toFixed(3)} ${(a.my - halb).toFixed(3)} ${(halb * 2).toFixed(3)} ${(halb * 2).toFixed(3)}`
  );
  svg.classList.toggle("karte-gezoomt", a.zoom > 1);
  // Die Klickziele sollen ihre Größe AUF DEM SCHIRM behalten, statt mit der
  // Karte zu wachsen -- sonst überlappen sie bei 500 Systemen in jedem Maßstab
  // gleich stark und der Zoom hilft beim Zielen nicht. Siehe .karte-treffer.
  svg.style.setProperty("--karte-zoom", String(a.zoom));
}

// Zeigerposition in Kartenkoordinaten. Über die Bildschirmmatrix der SVG --
// die kennt Skalierung, `preserveAspectRatio` und die Randstreifen, die dabei
// entstehen. Selbst gerechnet wäre das genau der Fehler, den man erst bei
// nicht-quadratischen Fenstern sieht.
function zeigerInKarte(svg, ereignis) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = svg.createSVGPoint();
  p.x = ereignis.clientX;
  p.y = ereignis.clientY;
  const k = p.matrixTransform(ctm.inverse());
  return { x: k.x, y: k.y };
}

// Zoomen auf einen Punkt: der Punkt unter dem Zeiger bleibt stehen. Dafür
// wird sein ANTEIL am sichtbaren Ausschnitt vor dem Zoom gemerkt und danach
// wiederhergestellt -- ohne Anker (Knöpfe) ist der Anker die Mitte.
function zoomen(svg, faktor, anker) {
  const a = ansichtVon(svg);
  const alt = a.zoom;
  const neu = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, alt * faktor));
  if (neu === alt) return;
  if (anker) {
    const halbAlt = GRUND_HALB / alt;
    const halbNeu = GRUND_HALB / neu;
    // anteil ∈ [-1, 1]: wo im Ausschnitt der Punkt sitzt, unabhängig vom Maßstab.
    const anteilX = (anker.x - a.mx) / halbAlt;
    const anteilY = (anker.y - a.my) / halbAlt;
    a.mx = anker.x - anteilX * halbNeu;
    a.my = anker.y - anteilY * halbNeu;
  }
  a.zoom = neu;
  ansichtAnwenden(svg, a);
}

function zoomZuruecksetzen(svg) {
  const a = ansichtVon(svg);
  a.zoom = 1;
  a.mx = 0;
  a.my = 0;
  ansichtAnwenden(svg, a);
}

// Die Knöpfe EINMAL, in die Hülle neben die Karte (Prinzip 8a). Sie liegen
// außerhalb der SVG, damit sie nicht mitzoomen -- ein Bedienelement, das beim
// Zoomen die Größe wechselt, ist kein Bedienelement mehr.
function zoomKnoepfeBauen(svg) {
  const huelle = svg.parentElement;
  if (!huelle || !huelle.classList.contains("karte-huelle")) return;
  if (huelle.querySelector(".karte-zoom")) return;
  const leiste = document.createElement("div");
  leiste.className = "karte-zoom";
  leiste.innerHTML =
    `<button data-zoom="naeher" title="${t("Näher heran")}">+</button>` +
    `<button data-zoom="weiter" title="${t("Weiter weg")}">−</button>` +
    `<button data-zoom="ganz" title="${t("Ganze Karte zeigen")}">⤢</button>`;
  leiste.addEventListener("click", (ereignis) => {
    const knopf = ereignis.target.closest("button[data-zoom]");
    if (!knopf) return;
    if (knopf.dataset.zoom === "ganz") zoomZuruecksetzen(svg);
    else zoomen(svg, knopf.dataset.zoom === "naeher" ? ZOOM_SCHRITT : 1 / ZOOM_SCHRITT, null);
  });
  huelle.appendChild(leiste);
}

function zoomVerdrahten(svg) {
  zoomKnoepfeBauen(svg);

  svg.addEventListener(
    "wheel",
    (ereignis) => {
      ereignis.preventDefault();
      zoomen(svg, ereignis.deltaY < 0 ? ZOOM_SCHRITT : 1 / ZOOM_SCHRITT, zeigerInKarte(svg, ereignis));
    },
    { passive: false }
  );

  svg.addEventListener("dblclick", () => zoomZuruecksetzen(svg));

  // Ziehen zum Verschieben. Der Weg wird in KARTENkoordinaten gemessen, nicht
  // in Bildpunkten -- sonst zöge man im Zoom weiter als der Zeiger läuft.
  let zug = null;
  svg.addEventListener("pointerdown", (ereignis) => {
    if (ereignis.button !== 0) return;
    const a = ansichtVon(svg);
    if (a.zoom <= ZOOM_MIN) return; // in der Übersicht gibt es nichts zu schieben
    const start = zeigerInKarte(svg, ereignis);
    if (!start) return;
    zug = { start, mx: a.mx, my: a.my, gezogen: false };
    svg.setPointerCapture(ereignis.pointerId);
  });
  svg.addEventListener("pointermove", (ereignis) => {
    if (!zug) return;
    const jetzt = zeigerInKarte(svg, ereignis);
    if (!jetzt) return;
    const a = ansichtVon(svg);
    // Zwischenschritt: der Griffpunkt soll unter dem Zeiger bleiben. Deshalb
    // wird von der GEMERKTEN Mitte aus gerechnet, nicht Schritt für Schritt --
    // sonst summieren sich Rundungsfehler zu einem Driften.
    a.mx = zug.mx - (jetzt.x - zug.start.x);
    a.my = zug.my - (jetzt.y - zug.start.y);
    if (Math.abs(jetzt.x - zug.start.x) > 1 || Math.abs(jetzt.y - zug.start.y) > 1) zug.gezogen = true;
    ansichtAnwenden(svg, a);
  });
  const beenden = (ereignis) => {
    if (!zug) return;
    // Ein Zug ist kein Klick. Ohne das würde jedes Verschieben nebenbei das
    // System unter dem Griffpunkt auswählen (Prinzip 8a, andere Richtung:
    // hier darf ein Klick gerade NICHT ankommen).
    if (zug.gezogen) svg.dataset.zugGerade = "1";
    zug = null;
    if (svg.hasPointerCapture(ereignis.pointerId)) svg.releasePointerCapture(ereignis.pointerId);
  };
  svg.addEventListener("pointerup", beenden);
  svg.addEventListener("pointercancel", beenden);

  // Vor den Auswahl-Handlern: der Klick nach einem Zug wird hier geschluckt.
  svg.addEventListener(
    "click",
    (ereignis) => {
      if (!svg.dataset.zugGerade) return;
      delete svg.dataset.zugGerade;
      ereignis.stopPropagation();
    },
    true
  );
}

function galaxieVerdrahten(svg) {
  if (svg.dataset.verdrahtet) return;
  svg.dataset.verdrahtet = "1";
  zoomVerdrahten(svg);

  // EINMAL, und nur hier. Die Karte hat keinen eigenen Weg ins Spiel: sie ruft
  // dieselbe Funktion auf wie der "Ansehen"-Knopf der Liste, samt dessen
  // Reichweiten-Schranke. Zwei Wege zur selben Wirkung wären zwei Orte, an
  // denen sie auseinanderlaufen können (Prinzip 5).
  svg.addEventListener("click", (ereignis) => {
    // Flotte VOR System: die Flottenmarken liegen über den Sternzielen, und
    // wer auf einen Flottenpunkt klickt, meint die Flotte -- auch wenn sie
    // gerade über ihrem Heimatstern steht.
    const flotte = ereignis.target.closest("[data-flotte]");
    if (flotte) {
      if (rueckrufe.flotte) rueckrufe.flotte(Number(flotte.dataset.flotte));
      return;
    }
    const ziel = ereignis.target.closest("[data-system]");
    if (ziel && rueckrufe.system) rueckrufe.system(Number(ziel.dataset.system));
  });

  // Der Tooltip entsteht erst beim Überfahren. Gelesen wird immer nur einer --
  // ihn im Sekundentakt für 500 Sterne zu bauen wäre die mit Abstand teuerste
  // Arbeit dieser Datei, und zwar für nichts.
  svg.addEventListener("mouseover", (ereignis) => {
    const ziel = ereignis.target.closest("[data-system]");
    if (!ziel || !galaxieStand.state) return;
    textSetzen(ziel.querySelector("title"), sternTitelText(galaxieStand.state, Number(ziel.dataset.system)));
  });
}

// `systeme` kommt fertig aus renderGalaxie: dort wird die Entfernung zum
// nächsten eigenen Stützpunkt ohnehin für alle 500 Systeme gerechnet. Sie hier
// ein zweites Mal zu rechnen wäre dieselbe Schleife zweimal pro Sekunde.
export function galaxieKarteZeichnen(svg, legende, state, opts) {
  if (!svg || !opts.sichtbar) return;
  const { jetzt, reichweite, systeme, aufSystem, aufFlotte, vorschau } = opts;
  const skala = galaxieSkala();

  const stand = `${state.galaxie.seed}:${state.galaxie.anzahlSysteme}`;
  if (svg.dataset.stand !== stand) {
    svg.dataset.stand = stand;
    galaxieGeruestBauen(svg, state);
  }
  rueckrufe.system = aufSystem;
  rueckrufe.flotte = aufFlotte;
  galaxieVerdrahten(svg);
  legendeFuellen(legende);

  // Nachschlagen über die Systemnummer als Feldindex, nicht über eine Map:
  // `systeme` ist nach Entfernung sortiert, die Reihenfolge taugt also nicht
  // als Zugriff -- und ein Feld ist der billigste Index, den es gibt.
  const abstand = [];
  for (const eintrag of systeme) abstand[eintrag.id] = eintrag.entfernung;
  galaxieStand = { state, abstand, reichweite };
  attributSetzen(
    svg,
    "aria-label",
    t("Galaxiekarte mit {systeme} Systemen", { systeme: state.galaxie.anzahlSysteme })
  );

  // Vier Zustände, wie sie die Liste auch unterscheidet -- aber in zwei
  // unabhängigen Achsen: WAS ein System für dich ist (eigen/besucht/fremd)
  // steckt in Farbe und Größe, ob du HINKOMMST in der Helligkeit. Ein
  // besuchtes System, das durch einen aufgegebenen Stützpunkt aus der
  // Reichweite gefallen ist, sähe sonst aus wie ein unbekanntes.
  const eigeneSysteme = new Set(planetenVon(state).map((p) => p.systemId));
  // Die Sterne stehen in der Reihenfolge ihrer Systemnummer in der Gruppe --
  // so hat galaxieGeruestBauen sie angelegt, und nichts sortiert sie je um.
  // Der Index IST damit die Systemnummer, und die Schleife braucht keine
  // einzige Rückfrage ans DOM.
  const sterne = svg.querySelector("[data-sterne]").children;
  for (let i = 0; i < sterne.length; i++) {
    const id = i + 1;
    const eigen = eigeneSysteme.has(id);
    let klasse = "karte-stern";
    if (eigen) klasse += " karte-eigen";
    else if (systemBesucht(state, id)) klasse += " karte-besucht";
    if (!(abstand[id] <= reichweite)) klasse += " karte-fern";
    // Im Normalfall ändert sich hier über Minuten nichts -- dann wird auch
    // nichts angefasst. Der Radius hängt allein an "eigen" und damit an der
    // Klasse, er gehört deshalb in denselben Zweig.
    if (sternKlassen[id] === klasse) continue;
    sternKlassen[id] = klasse;
    sterne[i].setAttribute("class", klasse);
    sterne[i].setAttribute("r", eigen ? "2.2" : "1.15");
  }

  // Wie weit du kommst, als Kreis um jeden Stützpunkt. Das ist die Erklärung
  // für die dunklen Sterne und steht damit auf der Karte statt nur im Tooltip
  // (Prinzip 10a).
  listeAbgleichen(svg.querySelector("[data-reichweite]"), [...eigeneSysteme], {
    schluessel: (id) => id,
    bauen: () => svgEl("circle", { class: "karte-reichweite" }),
    aktualisieren: (kreis, id) => {
      const pos = systemPosition(state.galaxie.seed, id);
      attributSetzen(kreis, "cx", (pos.x * skala).toFixed(2));
      attributSetzen(kreis, "cy", (pos.y * skala).toFixed(2));
      attributSetzen(kreis, "r", (reichweite * skala).toFixed(2));
    },
  });

  const wahl = svg.querySelector(".karte-wahl");
  const gewaehlt = systemPosition(state.galaxie.seed, state.angezeigtesSystem);
  attributSetzen(wahl, "cx", (gewaehlt.x * skala).toFixed(2));
  attributSetzen(wahl, "cy", (gewaehlt.y * skala).toFixed(2));
  attributSetzen(wahl, "hidden", null);

  // --- Was sich wirklich bewegt ------------------------------------------
  const eigene = flottenVon(state);

  // Die Linie zum Ziel gehört dazu: ein Punkt zwischen zwei Sternen sagt
  // "unterwegs", aber nicht wohin. Erst die Strecke macht aus der Bewegung
  // eine Absicht.
  listeAbgleichen(
    svg.querySelector("[data-routen]"),
    eigene.filter((flotte) => flotte.abschnitt),
    {
      schluessel: (flotte) => flotte.id,
      bauen: () => svgEl("line", { class: "karte-route" }),
      aktualisieren: (linie, flotte) => {
        const pos = flottePosition(state, flotte, jetzt);
        attributSetzen(linie, "x1", (pos.x * skala).toFixed(2));
        attributSetzen(linie, "y1", (pos.y * skala).toFixed(2));
        attributSetzen(linie, "x2", (flotte.abschnitt.nach.x * skala).toFixed(2));
        attributSetzen(linie, "y2", (flotte.abschnitt.nach.y * skala).toFixed(2));
      },
    }
  );

  listeAbgleichen(svg.querySelector("[data-flotten]"), eigene, {
    schluessel: (flotte) => flotte.id,
    bauen: () => flottenMarkeBauen("M0,-2.8 L2.1,0 L0,2.8 L-2.1,0 Z", "M0,-5.6 L4.2,0 L0,5.6 L-4.2,0 Z"),
    aktualisieren: (gruppe, flotte) => {
      const pos = flottePosition(state, flotte, jetzt);
      verschieben(gruppe, pos.x * skala, pos.y * skala);
      const klassen = ["karte-flotte"];
      if (flotte.abschnitt) klassen.push("karte-unterwegs");
      flottenMarkeWaehlbar(gruppe, flotte, klassen, state.aktiveFlotte);
      attributSetzen(gruppe, "class", klassen.join(" "));
      textSetzen(gruppe.querySelector("title"), flottenTitelText(state, flotte, jetzt));
    },
  });

  // --- Der Reichweitenring der gewählten Flotte (A-056) -------------------
  //
  // Radius ist `flotteRestreichweite`: der Treibstoff AN BORD, nicht die
  // Tankkapazität. Der Ring soll sagen "so weit kommst du JETZT" -- eine
  // Anzeige, die den vollen Tank zeigt, während der halb leer ist, wäre
  // genau die Sorte Auskunft, die man einmal glaubt.
  //
  // Umgerechnet wird mit `skala`, demselben Maßstab wie jede Position auf
  // dieser Karte. Eine zweite Umrechnung gäbe es nur dafür, irgendwann von
  // der ersten abzuweichen (die Falle aus dem Auftrag).
  //
  // Die Mitte ist die GERECHNETE Position, nicht der Ruheort: eine fliegende
  // Flotte nimmt ihren Ring mit. Und weil der Treibstoff schon beim Abflug
  // abgeht, schrumpft der Ring im Moment des Startens -- so muss es sein.
  //
  // EIN Element, nicht 376: der Ring gehört zur GEWÄHLTEN Flotte. Ohne
  // Auswahl -- oder ohne Treibstoff für auch nur einen Abflug -- ist er weg.
  const ring = svg.querySelector(".karte-flottenring");
  const gewaehlteFlotte = eigene.find((flotte) => flotte.id === state.aktiveFlotte);
  const ringWeite = gewaehlteFlotte ? flotteRestreichweite(gewaehlteFlotte) : 0;
  if (ringWeite > 0) {
    const pos = flottePosition(state, gewaehlteFlotte, jetzt);
    attributSetzen(ring, "cx", (pos.x * skala).toFixed(2));
    attributSetzen(ring, "cy", (pos.y * skala).toFixed(2));
    attributSetzen(ring, "r", (ringWeite * skala).toFixed(2));
    attributSetzen(ring, "hidden", null);
  } else {
    attributSetzen(ring, "hidden", "");
  }

  vorschauZeichnen(svg, skala, vorschau);
}

// Die Vorschaulinie der Kommandoleiste (A-057).
//
// Sie kommt FERTIG aus ui.js -- Anfang, Ende und Beschriftung. Die Karte
// rechnet hier nichts über Missionen oder Flugzeiten nach: täte sie es, gäbe
// es zwei Stellen, die dieselbe Dauer ausrechnen, und irgendwann zwei
// verschiedene Antworten (Prinzip 5). Sie kann nur eins, was ui.js nicht
// kann: Galaxie-Einheiten in Kartenkoordinaten bringen.
//
// Die Beschriftung sitzt in der Mitte der Strecke, leicht versetzt -- auf der
// Linie wäre sie von ihr durchgestrichen.
function vorschauZeichnen(svg, skala, vorschau) {
  const linie = svg.querySelector(".karte-vorschau");
  const text = svg.querySelector(".karte-vorschau-text");
  if (!vorschau) {
    attributSetzen(linie, "hidden", "");
    attributSetzen(text, "hidden", "");
    return;
  }
  const x1 = vorschau.von.x * skala;
  const y1 = vorschau.von.y * skala;
  const x2 = vorschau.nach.x * skala;
  const y2 = vorschau.nach.y * skala;
  attributSetzen(linie, "x1", x1.toFixed(2));
  attributSetzen(linie, "y1", y1.toFixed(2));
  attributSetzen(linie, "x2", x2.toFixed(2));
  attributSetzen(linie, "y2", y2.toFixed(2));
  attributSetzen(linie, "hidden", null);
  attributSetzen(text, "x", ((x1 + x2) / 2).toFixed(2));
  attributSetzen(text, "y", ((y1 + y2) / 2 - 2).toFixed(2));
  textSetzen(text, vorschau.text || "");
  attributSetzen(text, "hidden", vorschau.text ? null : "");
}

// Die Legende hängt an keinem Spielzustand, nur an der Sprache -- also wird
// sie je Sprache genau einmal gebaut, wie das Handbuch.
function legendeFuellen(el) {
  if (!el || el.dataset.gezeichnet === sprache()) return;
  el.dataset.gezeichnet = sprache();
  el.innerHTML =
    `<span class="karte-marke karte-eigen"></span>${t("eigene Welt")}` +
    `<span class="karte-marke karte-besucht"></span>${t("besucht")}` +
    `<span class="karte-marke"></span>${t("in Reichweite")}` +
    `<span class="karte-marke karte-fern"></span>${t("außer Reichweite")}` +
    `<span class="karte-marke karte-marke-flotte"></span>${t("deine Flotte")}`;
}

// --- Systemkarte ----------------------------------------------------------

// WO STEHT WELCHER ORBIT?
//
// Erster Versuch war ein Zufallswinkel je Orbit. Er ist an der Wirklichkeit
// gescheitert: ein System hat hier 12 bis 49 Orbits (gemessen), und auf eng
// benachbarten Ringen liegen zufällige Winkel regelmäßig übereinander -- die
// Karte wurde zum Klumpen, ausgerechnet in den dichtesten Systemen.
//
// Stattdessen der GOLDENE WINKEL, 137,5°: derselbe Trick, mit dem eine
// Sonnenblume ihre Kerne setzt. Jeder weitere Orbit dreht um diesen Winkel
// weiter, und weil das Verhältnis irrational ist, kommt keine Drehung je
// wieder auf einer früheren zu liegen. Die dichtesten Nachbarn sind dadurch
// selbst bei 49 Orbits noch rund 20 Einheiten auseinander -- mehr als zwei
// Scheibendurchmesser. Das ist keine Gestaltungsidee, sondern die dichteste
// gleichmäßige Packung, die es gibt.
//
// Der Radius wächst mit der WURZEL des Orbitanteils, aus demselben Grund wie
// in systemPosition: linear wachsende Radien ballen die äußeren Orbits
// zusammen, die Wurzel verteilt sie über die Fläche.
//
// Beides ist stetig in `orbit`, also auch für Bruchteile definiert -- genau
// das braucht eine Flotte, die gerade den Orbit wechselt: sie wandert dann
// auf einer Spirale nach außen statt von Ring zu Ring zu springen.
const GOLDENER_WINKEL = Math.PI * (3 - Math.sqrt(5));

// Jedes System bekommt eine eigene Grunddrehung aus der Saat. Ohne sie sähen
// alle Systeme gleich aus -- mit ihr ist die Anordnung trotzdem für immer
// dieselbe, weil sie aus der Saat kommt und nicht aus der Zeichnung.
function systemPhase(seed, systemId) {
  return stromFuer(seed, systemId * 1013)() * Math.PI * 2;
}

function ringRadius(orbit, orbitAnzahl) {
  if (orbitAnzahl <= 1) return (SYS_INNEN + SYS_AUSSEN) / 2;
  const anteil = Math.max(0, Math.min(1, (orbit - 1) / (orbitAnzahl - 1)));
  return SYS_INNEN + (SYS_AUSSEN - SYS_INNEN) * Math.sqrt(anteil);
}

function orbitPunkt(seed, systemId, orbit, orbitAnzahl, versatz = 0) {
  const winkel = systemPhase(seed, systemId) + (orbit - 1) * GOLDENER_WINKEL;
  const radius = Math.min(SYS_RAND, ringRadius(orbit, orbitAnzahl) + versatz);
  return { x: Math.cos(winkel) * radius, y: Math.sin(winkel) * radius };
}

// Wer ist in diesem System, und wo genau?
//
// Läuft über ALLE Flotten, nicht nur die eigenen: im All gibt es keine
// Tarnung, und wer im selben System steht, steht dort sichtbar. Der Unterschied
// liegt in der Farbe, nicht in der Auslassung.
//
// Drei Fälle, und alle drei bewegen sich:
//   im System      echte Position aus flottePosition (auch beim Orbitwechsel)
//   im Anflug      vom Kartenrand aus der Richtung des Startsystems nach innen
//   im Abflug      vom Orbit nach außen in Richtung des Zielsystems
// Anflug und Abflug sind eine Darstellung, keine Behauptung über den Ort: die
// Flotte ist in Wahrheit zwischen den Sternen -- deshalb sind ihre Marken
// hohl, und die Galaxiekarte zeigt daneben, wo sie wirklich steckt.
function systemFlotten(state, systemId, jetzt) {
  const hier = systemPosition(state.galaxie.seed, systemId);
  const system = holeSystem(state, systemId);
  const gefunden = [];

  for (const flotte of state.flotten) {
    const ab = flotte.abschnitt;
    if (!ab) {
      if (!flotte.ort || flotte.ort.systemId !== systemId) continue;
      const pos = flottePosition(state, flotte, jetzt);
      gefunden.push({
        flotte,
        punkt: orbitPunkt(state.galaxie.seed, systemId, pos.orbit || 1, system.orbitAnzahl, FLOTTEN_VERSATZ),
      });
      continue;
    }

    const rein = ab.nach.systemId === systemId;
    const raus = ab.von.systemId === systemId;
    if (!rein && !raus) continue;

    const gesamt = ab.ankunftZeit - ab.startZeit;
    const anteil = gesamt <= 0 ? 1 : Math.min(1, Math.max(0, (jetzt - ab.startZeit) / gesamt));

    // Orbitwechsel innerhalb des Systems.
    //
    // Hier wird der Orbit ausnahmsweise selbst interpoliert statt aus
    // flottePosition genommen: die rundet ihn auf ganze Zahlen (für Anzeige
    // und Befehle völlig richtig), und auf einer Karte mit Winkeln SPRÄNGE
    // die Flotte damit von Ring zu Ring, statt zu wandern. Gerechnet wird mit
    // demselben `anteil`, den flottePosition auch benutzt -- es ist dieselbe
    // Bewegung, nur ohne die Rundung fürs Auge.
    if (rein && raus) {
      const vonOrbit = ab.von.orbit || 1;
      const nachOrbit = ab.nach.orbit || 1;
      gefunden.push({
        flotte,
        punkt: orbitPunkt(
          state.galaxie.seed,
          systemId,
          vonOrbit + (nachOrbit - vonOrbit) * anteil,
          system.orbitAnzahl,
          FLOTTEN_VERSATZ
        ),
        ziel: orbitPunkt(state.galaxie.seed, systemId, nachOrbit, system.orbitAnzahl, FLOTTEN_VERSATZ),
      });
      continue;
    }

    const anderes = rein ? ab.von : ab.nach;
    const winkel = Math.atan2(anderes.y - hier.y, anderes.x - hier.x);
    const innen = ringRadius((rein ? ab.nach.orbit : ab.von.orbit) || 1, system.orbitAnzahl);
    const radius = rein ? SYS_RAND - (SYS_RAND - innen) * anteil : innen + (SYS_RAND - innen) * anteil;
    gefunden.push({
      flotte,
      unterwegs: true,
      punkt: { x: Math.cos(winkel) * radius, y: Math.sin(winkel) * radius },
      ziel: rein
        ? orbitPunkt(state.galaxie.seed, systemId, ab.nach.orbit || 1, system.orbitAnzahl, FLOTTEN_VERSATZ)
        : { x: Math.cos(winkel) * SYS_RAND, y: Math.sin(winkel) * SYS_RAND },
    });
  }
  return gefunden;
}

function systemGeruestBauen(svg) {
  svg.replaceChildren(
    svgEl("g", { "data-ringe": "" }),
    svgEl("g", { "data-sonne": "" }),
    svgEl("g", { "data-objekte": "" }),
    svgEl("g", { "data-sys-routen": "" }),
    svgEl("g", { "data-sys-flotten": "" })
  );
  const sonne = svg.querySelector("[data-sonne]");
  sonne.appendChild(svgEl("circle", { class: "karte-sonne-hof", r: 16 }));
  sonne.appendChild(svgEl("circle", { class: "karte-sonne", r: 7 }));
  sonne.appendChild(svgEl("title"));
}

function systemVerdrahten(svg) {
  if (svg.dataset.verdrahtet) return;
  svg.dataset.verdrahtet = "1";
  zoomVerdrahten(svg);
  svg.addEventListener("click", (ereignis) => {
    // Wie auf der Galaxiekarte: die Flotte hat Vorrang vor dem Orbit, über
    // dem ihre Marke gerade steht.
    const flotte = ereignis.target.closest("[data-flotte]");
    if (flotte) {
      if (rueckrufe.flotte) rueckrufe.flotte(Number(flotte.dataset.flotte));
      return;
    }
    const ziel = ereignis.target.closest("[data-orbit]");
    if (ziel && rueckrufe.orbit) rueckrufe.orbit(Number(ziel.dataset.orbit));
  });
}

export function systemKarteZeichnen(svg, state, opts) {
  if (!svg || !opts.sichtbar) return;
  const { jetzt, systemId, gewaehlterOrbit, aufOrbit, aufFlotte } = opts;
  const system = holeSystem(state, systemId);
  const seed = state.galaxie.seed;

  if (!svg.dataset.gebaut) {
    svg.dataset.gebaut = "1";
    systemGeruestBauen(svg);
  }
  rueckrufe.orbit = aufOrbit;
  rueckrufe.flotte = aufFlotte;
  systemVerdrahten(svg);
  attributSetzen(svg, "aria-label", t("Systemkarte von {system}", { system: system.name }));

  attributSetzen(svg.querySelector(".karte-sonne"), "fill", system.stern.farbe);
  attributSetzen(svg.querySelector(".karte-sonne-hof"), "fill", system.stern.farbe);
  textSetzen(
    svg.querySelector("[data-sonne] title"),
    t("{name} ({klasse})", { name: t(system.stern.name), klasse: system.stern.spektral })
  );

  // Schlüssel mit Systemnummer davor: beim Systemwechsel passt kein einziger
  // Schlüssel mehr, listeAbgleichen räumt alles ab und baut neu -- genau das,
  // was ein Systemwechsel bedeutet. Innerhalb eines Systems bleibt dagegen
  // jedes Element über beliebig viele Takte dasselbe.
  const ringSchluessel = (objekt) => `${systemId}:${objekt.orbit}`;

  listeAbgleichen(svg.querySelector("[data-ringe]"), system.objekte, {
    schluessel: ringSchluessel,
    bauen: (objekt) =>
      svgEl("circle", {
        class: "karte-ring",
        cx: 0,
        cy: 0,
        r: ringRadius(objekt.orbit, system.orbitAnzahl).toFixed(2),
      }),
  });

  listeAbgleichen(svg.querySelector("[data-objekte]"), system.objekte, {
    schluessel: ringSchluessel,
    bauen: (objekt) => {
      const gruppe = svgEl("g", { class: "karte-objekt", "data-orbit": objekt.orbit });
      const punkt = orbitPunkt(seed, systemId, objekt.orbit, system.orbitAnzahl);
      gruppe.setAttribute("transform", `translate(${punkt.x.toFixed(2)} ${punkt.y.toFixed(2)})`);
      gruppe.appendChild(svgEl("circle", { class: "karte-objekt-scheibe", r: 7.5 }));
      gruppe.appendChild(svgEl("text", { class: "karte-objekt-symbol", y: 2.9 }));
      gruppe.appendChild(svgEl("title"));
      return gruppe;
    },
    aktualisieren: (gruppe, objekt) => systemObjektFuellen(state, systemId, objekt, gruppe, gewaehlterOrbit),
  });

  const flotten = systemFlotten(state, systemId, jetzt);

  listeAbgleichen(
    svg.querySelector("[data-sys-routen]"),
    flotten.filter((eintrag) => eintrag.ziel),
    {
      schluessel: (eintrag) => eintrag.flotte.id,
      bauen: () => svgEl("line", { class: "karte-route" }),
      aktualisieren: (linie, eintrag) => {
        attributSetzen(linie, "x1", eintrag.punkt.x.toFixed(2));
        attributSetzen(linie, "y1", eintrag.punkt.y.toFixed(2));
        attributSetzen(linie, "x2", eintrag.ziel.x.toFixed(2));
        attributSetzen(linie, "y2", eintrag.ziel.y.toFixed(2));
      },
    }
  );

  listeAbgleichen(svg.querySelector("[data-sys-flotten]"), flotten, {
    schluessel: (eintrag) => eintrag.flotte.id,
    bauen: () => flottenMarkeBauen("M0,-3.4 L2.6,0 L0,3.4 L-2.6,0 Z", "M0,-6.6 L5.0,0 L0,6.6 L-5.0,0 Z"),
    aktualisieren: (gruppe, eintrag) => {
      verschieben(gruppe, eintrag.punkt.x, eintrag.punkt.y);
      const klassen = ["karte-flotte"];
      if (fraktionVon(eintrag.flotte) !== SPIELER_FRAKTION) klassen.push("karte-fremd");
      if (eintrag.unterwegs) klassen.push("karte-unterwegs");
      flottenMarkeWaehlbar(gruppe, eintrag.flotte, klassen, state.aktiveFlotte);
      attributSetzen(gruppe, "class", klassen.join(" "));
      textSetzen(gruppe.querySelector("title"), flottenTitelText(state, eintrag.flotte, jetzt));
    },
  });
}

// Dieselben Zustände, die auch die Zeile in der Systemliste einfärbt, in
// derselben Reihenfolge der Prüfungen -- mit EINER bewussten Abweichung.
//
// GEFUNDEN BEIM BAU DER KARTE (16.08.2026): `planetAn` liefert den Planeten
// an einem Orbit, EGAL WEM ER GEHÖRT. Die Systemliste behandelt jeden davon
// als eigenen Stützpunkt -- im Heimatsystem des Spielers standen dadurch drei
// Piratenbasen in der Akzentfarbe und mit "Dein Stützpunkt" im Tooltip. Das
// ist dieselbe Falle wie seinerzeit bei `naechsteBasis` und
// `naechsterHafenOrt`: ein Helfer, der "eigen" meint und die Fraktion nicht
// fragt.
//
// Die Karte macht das hier NICHT mit. Eine Karte, die eine Feindbasis als
// eigene Welt einfärbt, ist schlimmer als gar keine Karte -- und sie hat
// nebenbei die Antwort schon da: dieselbe Warnfarbe, in der auch fremde
// Flotten stehen. Rot heißt auf beiden Karten dasselbe: gehört dir nicht.
//
// NACHTRAG v0.83 (A-002): die Liste ist nachgezogen. Der Satz hier lautete
// vorher "Die Liste bleibt vorerst, wie sie ist" -- mit der Begründung, an
// `eigen` hänge dort auch, WELCHE Missionen angeboten werden. Genau das war
// der Grund, es NICHT liegenzulassen: eine Piratenbasis bot dem Spieler
// Eigentümer-Aktionen an. Beide Ansichten fragen jetzt über
// `eigenerPlanetAn` dieselbe Frage.
function systemObjektFuellen(state, systemId, objekt, gruppe, gewaehlterOrbit) {
  const gesperrt = objektGesperrt(state, objekt);
  const planet = planetAn(state, systemId, objekt.orbit);
  // Seit A-002 über den gemeinsamen Helfer statt über einen hier
  // ausgeschriebenen Vergleich -- die Liste stellt jetzt dieselbe Frage, und
  // zwei Stellen, die dieselbe Grenze getrennt umsetzen, laufen auseinander.
  const eigen = !!eigenerPlanetAn(state, systemId, objekt.orbit);
  const fremdBesetzt = !!planet && !eigen;

  const klassen = ["karte-objekt"];
  if (objekt.typ === "heimat" || eigen) klassen.push("karte-eigen");
  else if (fremdBesetzt) klassen.push("karte-besetzt");
  else if (!objekt.entdeckt) klassen.push("karte-unerforscht");
  else if (objekt.gefahr && !objekt.verteidigerBesiegt) klassen.push("karte-gefahr");
  else if (gesperrt) klassen.push("karte-gesperrt");
  else if (objekt.verwertet || objekt.verteidigerBesiegt) klassen.push("karte-verwertet");
  if (objekt.orbit === gewaehlterOrbit) klassen.push("karte-gewaehlt");
  attributSetzen(gruppe, "class", klassen.join(" "));

  textSetzen(gruppe.querySelector("text"), objekt.entdeckt ? TYP_SYMBOL[objekt.typ] : "?");
  const halter = fremdBesetzt ? fraktionById(state, fraktionVon(planet)) : null;
  textSetzen(
    gruppe.querySelector("title"),
    [
      objekt.entdeckt
        ? t("{art} ({name}, Orbit {orbit})", {
            art: t(objekt.bezeichnung),
            name: objekt.name,
            orbit: objekt.orbit,
          })
        : t("{name} – noch unerforscht", { name: objekt.name }),
      eigen ? t("Dein Stützpunkt: {name}", { name: planet.name }) : "",
      // Eigenname der Fraktion, roh wie überall -- er wird nicht übersetzt.
      halter ? t("Fremder Stützpunkt: {fraktion}", { fraktion: halter.name }) : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}
