// Rendering und Event-Wiring. Bewusst ohne Framework -- direktes DOM-Update
// bei jedem Tick. Alle Listen entstehen aus den Datentabellen.
//
// Die Oberfläche verwaltet immer genau EINEN Planeten (den aktiven) und
// EINE Flotte (die aktive), die Befehle bekommt.

import {
  BUILDINGS,
  RESEARCH,
  RESSOURCEN,
  LAGER_RESSOURCEN,
  FLUSS_RESSOURCEN,
  AUSSENPOSTEN,
  SCHIFFE,
  MISSIONS_SCHIFF,
  MARKT_PREISE,
  KAMPF,
  MARKT,
  REPARATUR,
  BAUWARTESCHLANGE_MAX,
  UNBEKANNTE_RESSOURCEN,
  VERSION,
  STAND,
  PLANETEN_KLASSEN,
  affinitaetVon,
  AFFINITAET_GUT,
  SYMBOLE,
  kostenFuerLevel,
  bauzeitFuerLevel,
  forschungsAufwand,
  voraussetzungenText,
  techStufe,
  rate,
  ZEIT,
  GEBAEUDE_GRUPPEN,
  spieltage,
  SUPERNOVA,
  jahreInMs,
  SONDE,
  unterlichtSekundenProEinheit,
  LJ_PRO_EINHEIT,
  rateProJahr,
} from "./data.js";
import {
  effektiveRaten,
  lagerKapazitaetGesamt,
  lagerBelegung,
  lagerverbrauchVon,
  naechstesGebaeudeLevel,
  naechstesForschungLevel,
  forschungsFluss,
  kategorieBonus,
  spielzeitJetzt,
  spielDatum,
  meldungHinzufuegen,
  meldungBetrifftSpieler,
  forschungVerfuegbar,
  forschungVoraussetzungenErfuellt,
  maxReichweite,
  naechsteBasis,
  systemBesucht,
  hatSprungroute,
  supernovaRestMs,
  stromPrioritaet,
  stromPrioritaetSetzen,
  STROM_STUFEN,
  untersuchteOrbits,
  systemErreichbar,
  aktiverPlanet,
  planetById,
  planetAn,
  eigenerPlanetAn,
  werftTempo,
  flotteById,
  handelVerfuegbar,
  fraktionById,
  fraktionVon,
  wirtschaftsPlaneten,
  planetenVon,
  flottenVon,
  automatisierungFreigeschaltet,
  logistiknetzFreigeschaltet,
  logistikMindestbestandSetzen,
  verarbeitungsReserveFuer,
  verarbeitungsReserveSetzen,
  affinitaetFaktor,
  gebaeudeKosten,
  schiffKosten,
  speicherKapazitaet,
  speicherKapazitaetFuerLevel,
  flussSpeicherDeckung,
  pufferReichweiteMs,
  speicherRessourceVon,
} from "./state.js";
import {
  bauStarten,
  forschungStarten,
  kannBauen,
  bauWarteschlangeEntfernen,
  bauAbbrechen,
  kannForschen,
  forschungWarteschlangeEntfernen,
  forschungAbbrechen,
  offenerErtrag,
  kannSchiffBauen,
  schiffBauen,
  werftWarteschlangeEntfernen,
  werftAbbrechen,
  schiffsBauzeitSek,
  flotteAufstellen,
  flotteUmbenennen,
  FLOTTENNAME_MAX,
  flotteAufloesen,
  schiffeUmladen,
  tanken,
  ladungAufnehmen,
  missionBefehlen,
  kannSchnellversand,
  schnellversandBefehlen,
  heimkehrBefehlen,
  kannBefehlen,
  zumPlanetBefehlen,
  gruendungBefehlen,
  kannMission,
  kannGruendungsmission,
  missionFuerObjekt,
  flotteStatusText,
  missionLabel,
  handelsPartner,
  kannVerkaufen,
  verkaufen,
  kannKaufen,
  kaufen,
  kannMarktwareLaden,
  marktwareLaden,
  kannLadungEntladen,
  ladungEntladen,
  kannReparieren,
  reparieren,
  kannRecyceln,
  recyceln,
  kannRouteBearbeiten,
  routeHaltHinzufuegen,
  routeHaltEntfernen,
  routeEntladenSetzen,
  routeLadenRegelSetzen,
  routeStarten,
  routeStoppen,
} from "./simulation.js";
import {
  flottePosition,
  flotteKapazitaet,
  ladungGesamt,
  schiffeGesamt,
  ortVonSystem,
  ortVonPlanet,
  strecke,
  treibstoffFuer,
  schiffeStaerke,
  schiffeText,
} from "./flotten.js";
import { t, sprache, spracheSetzen, SPRACHEN, gebietsschema } from "./sprache.js";
import { holeSystem, cacheLeeren } from "./systeme.js";
// Nur für den Neustart-Knopf im Abspann. Der Weg dorthin ist derselbe wie im
// Testmodus (js/testmodus.js) -- ein zweiter Reset wäre eine zweite Wahrheit
// darüber, was "neu anfangen" bedeutet.
import { zuruecksetzen } from "./save.js";
import { systemName, sternFuer } from "./galaxie.js";
// Die beiden Karten. Sie holen sich von hier `listeAbgleichen` zurück -- ein
// Ringtausch, der trägt, weil keine der beiden Dateien beim LADEN etwas aus
// der anderen benutzt, sondern erst beim Zeichnen. Die Alternative wäre ein
// zweiter Abgleich-Mechanismus in karte.js gewesen, und genau davor warnt
// Prinzip 5.
import { galaxieKarteZeichnen, systemKarteZeichnen } from "./karte.js";
import { handbuchAbschnitte, erststartTafel } from "./handbuch.js";
import { formatZahl as fmt, formatKurz, mitEinheit, einheit, buendelText, buendelSymbole } from "./ressourcen.js";

// Exportiert für js/karte.js: die Systemkarte zeichnet dieselben Symbole wie
// die Systemliste. Eine zweite Tabelle wäre eine zweite Wahrheit darüber, wie
// ein Wrack aussieht (Prinzip 5).
export const TYP_SYMBOL = {
  heimat: "🏠", planet: "🪐", asteroiden: "🪨", wrack: "🛰️",
  anomalie: "✦", struktur: "◈", gefahr: "☢", leer: "·",
};

// UI-lokaler Regler-Zustand für die Flotten-Beladung/Tanken-Schieber --
// bewusst NICHT Teil des Spielzustands. Nötig, weil render() auch von einem
// setInterval in main.js ausgelöst wird (nicht nur bei Klicks) und dabei die
// Flotten-Box komplett neu aufbaut. Ohne diesen Zwischenspeicher würde ein
// bewegter, aber noch nicht bestätigter Regler beim nächsten Tick unbemerkt
// auf 0 zurückspringen -- genau der gemeldete Bug, nur mit Verzögerung statt
// sofort.
const reglerPosition = {};
function reglerWert(schluessel) {
  return reglerPosition[schluessel] || 0;
}

// Dasselbe für die ZAHLENFELDER (Verarbeitungs-Reserve, Logistik-Mindest-
// bestand), und aus genau demselben Grund: was der Spieler eingetippt, aber
// noch nicht mit "Setzen" bestätigt hat, darf weder allein im Feld liegen (der
// nächste Takt zöge die Zahl auf den gespeicherten Wert zurück) noch schon im
// Spielstand stehen (dann wäre die halb getippte 5 aus 5000 sofort scharf).
// Also dazwischen -- hierher.
//
// Der Schlüssel trägt den Planeten mit: dieselbe Zeile bedient nach einem
// Planetenwechsel eine andere Welt, und ein dort begonnener Tippstand darf
// nicht mit hinüberwandern.
const feldEingabe = {};

function feldSchluessel(bereich, planet, resId) {
  return `${bereich}:${planet.id}:${resId}`;
}

// Feldinhalt nachziehen -- aber niemals dem Spieler in die Hand greifen: wer
// das Feld gerade beschriftet, bestimmt seinen Inhalt. Gleiche Überlegung wie
// beim `!== document.activeElement` der Regler.
function feldWertSetzen(feld, schluessel, gespeichert) {
  if (!feld || feld === document.activeElement) return;
  const soll = feldEingabe[schluessel] !== undefined ? feldEingabe[schluessel] : gespeichert;
  if (feld.value !== soll) feld.value = soll;
}

// Dauern erscheinen in Spieltagen und Spieljahren, nicht in Sekunden am
// Bildschirm -- siehe ZEIT in data.js für die Herleitung des Maßstabs. Das
// hier ist reine Anzeige: intern rechnet das Spiel unverändert in Sekunden,
// und genau deshalb verschiebt der Maßstab kein Pacing.
export function fmtDauer(sekunden) {
  // Unendlich heißt hier immer dasselbe: es arbeitet niemand daran. Bei der
  // Forschung ist das der Normalfall, solange kein Labor läuft -- "Infinity
  // Jahre" wäre die schlechteste denkbare Auskunft dafür.
  if (!Number.isFinite(sekunden)) return t("steht still");
  const tage = spieltage(Math.max(0, sekunden));
  if (tage < 1) return t("unter 1 Tag");
  if (tage < ZEIT.tageProJahr) {
    const n = Math.ceil(tage);
    return n === 1 ? t("1 Tag") : t("{n} Tage", { n: fmt(n) });
  }
  // Ab einem Jahr eine Nachkommastelle: "1,1 Jahre" trägt mehr Information
  // als "1 Jahr" und bleibt kürzer als "1 Jahr 37 Tage". Das Trennzeichen
  // kommt aus dem Gebietsschema -- "1.1 years" im Englischen.
  const jahre = tage / ZEIT.tageProJahr;
  return t("{n} Jahre", {
    n: jahre.toLocaleString(gebietsschema(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  });
}

// Eine Rate aus den Datentabellen steht pro ECHTZEITSTUNDE. Angezeigt wird
// sie pro Spieljahr -- mit Einheit, damit "761 t/Jahr" dasteht und nicht "761".
function ratenText(resId, proStunde) {
  return mitEinheit(resId, rateProJahr(proStunde)) + t("/Jahr");
}

// --- Listen, die Klicks nicht verschlucken --------------------------------
//
// PRINZIP 8a, und der Grund, warum es dieses Werkzeug gibt:
//
//   render() läuft jede Sekunde. Wer dabei einen Bereich per innerHTML neu
//   aufbaut, ERSETZT dessen DOM-Elemente. Ein `click` entsteht aber nur, wenn
//   mousedown und mouseup DASSELBE Element treffen. Der Austausch passiert im
//   selben Takt, in dem die Zahlen springen -- also genau so oft, wie man
//   klickt. Das Spiel verschluckt dadurch Klicks, und zwar unregelmäßig, was
//   die Fehlersuche nebenbei vergiftet: man kann nicht mehr unterscheiden, ob
//   die Mechanik hakt oder der Klick nie ankam.
//
// Die Lösung ist immer dieselbe: Elemente über einen STABILEN SCHLÜSSEL
// wiederverwenden. Neu gebaut wird nur, was neu ist; entfernt nur, was weg
// ist. Alles andere bekommt bloß frische Werte. Ereignis-Handler hängen am
// Element und überleben damit jeden Takt -- sie werden EINMAL beim Bauen
// gesetzt, nie im Aktualisieren.
//
// Verschieben ist erlaubt: insertBefore bewegt ein Element, es ersetzt es
// nicht. Ein bewegtes Element bleibt dasselbe Objekt, und der Klick kommt an.
//
// Bis v0.6 war dieses Muster genau EINMAL angewandt, und zwar nur auf dem
// Spielzweig (v0.41s2, Navigation) -- im Entwicklungszweig fehlte selbst das.
// `startNach`: festes Element, hinter dem die Liste beginnt (eine
// Spaltenüberschrift etwa). Alles davor bleibt unangetastet; alles dahinter
// gehört der Liste, und was dort ohne Schlüssel steht, ist ein Rest aus einer
// früheren Darstellung und fliegt raus.
// Exportiert, seit die Karten (js/karte.js) dasselbe brauchen: 500 Sterne, die
// jede Sekunde neu entstünden, wären genau der Fehler, gegen den dieses
// Werkzeug gebaut wurde -- nur eben 500-fach.
export function listeAbgleichen(container, eintraege, { schluessel, bauen, aktualisieren, startNach = null }) {
  const vorhanden = new Map();
  const fremde = [];
  let hinterStart = !startNach;
  for (const el of Array.from(container.children)) {
    if (el === startNach) {
      hinterStart = true;
      continue;
    }
    if (!hinterStart) continue;
    if (el.dataset.listenSchluessel !== undefined) vorhanden.set(el.dataset.listenSchluessel, el);
    else fremde.push(el);
  }
  for (const el of fremde) el.remove();

  let vorheriges = startNach;
  for (const eintrag of eintraege) {
    const k = String(schluessel(eintrag));
    let el = vorhanden.get(k);
    if (el) {
      vorhanden.delete(k);
    } else {
      el = bauen(eintrag);
      el.dataset.listenSchluessel = k;
    }
    // An die richtige Stelle bringen. Steht das Element schon dort, passiert
    // nichts -- der Vergleich verhindert unnötige DOM-Bewegung.
    const sollPlatz = vorheriges ? vorheriges.nextSibling : container.firstChild;
    if (el !== sollPlatz) container.insertBefore(el, sollPlatz);
    if (aktualisieren) aktualisieren(el, eintrag);
    vorheriges = el;
  }

  for (const el of vorhanden.values()) el.remove();
}

// Textinhalt nur schreiben, wenn er sich geändert hat. Ein unnötiges
// textContent würde den Textknoten ersetzen -- harmlos für Klicks, aber es
// bricht eine laufende Textauswahl des Spielers.
export function textSetzen(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

// Freier Spielertext, der über innerHTML in die Seite kommt, wird vom Browser
// als AUSZEICHNUNG gelesen und nicht als Text. Der Flottenname ist die einzige
// Stelle, an der der Spieler selbst schreibt -- und schon ein harmloses
// Alpha & Omega oder <Vorhut> zerlegt damit die Zeile, in der er steht. Jeder
// Name gehört deshalb vor dem innerHTML durch diesen Filter.
//
// Bewusst mit split/join statt mit einem regulären Ausdruck: tests/
// uebersetzung.mjs zerlegt den Quelltext selbst in Zeichenketten, und ein
// Regex-Literal, das ein Anführungszeichen enthält, bringt seinen Zerleger
// aus dem Tritt -- danach meldet er den halben Rest der Datei als
// unübersetzten deutschen Text. Ein Werkzeug, das bei korrektem Code Alarm
// schlägt, wird ignoriert; deshalb hier der Weg, der es nicht auslöst.
//
// Das kaufmännische Und muss ZUERST ersetzt werden, sonst überschreibt der
// nächste Schritt sein eigenes Ergebnis (aus &lt; würde &amp;lt;).
function htmlText(wert) {
  return String(wert).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
}

// Dasselbe eine Ebene enger: Text, der in ein HTML-ATTRIBUT geschrieben wird,
// muss zusätzlich seine Anführungszeichen loswerden -- sonst bricht ein
// Flottenname wie Ruhm" onclick=… die Zeichenkette auf.
function attributText(wert) {
  return htmlText(wert).split('"').join("&quot;");
}

export function attributSetzen(el, name, wert) {
  if (!el) return;
  if (wert === null || wert === false) el.removeAttribute(name);
  else if (el.getAttribute(name) !== String(wert)) el.setAttribute(name, wert);
}

// Restzeit des laufenden Forschungsprojekts, in Sekunden.
//
// Bau und Werft haben eine gespeicherte Fertigzeit, die Forschung seit v0.6
// nicht mehr: sie hinge an einem Fluss, der sich ändert, sobald irgendwo ein
// Labor dazukommt, der Strom knapp wird oder eine Kolonie hungert. Die Zahl
// wird deshalb bei jedem Rendern frisch gerechnet -- sie ist eine Prognose,
// keine Zusage, und verhält sich genau so.
function forschungRestSekunden(state) {
  const q = state.forschungsQueue;
  if (!q) return Infinity;
  const aufwand = q.aufwand ?? forschungsAufwand(RESEARCH[q.forschungId], q.zielLevel);
  const rest = aufwand - (q.fortschritt || 0);
  const fluss = forschungsFluss(state);
  if (fluss <= 0) return Infinity;
  return Math.max(0, (rest / fluss) * 3600);
}

// Ein Raten-Bündel für die Anzeige aufteilen. LAGER-Ressourcen sammeln sich
// an, ihre Rate gehört auf eine Zeitachse. FLUSS-Ressourcen (Arbeitskraft)
// sind dagegen ein DAUERZUSTAND: eine Mine braucht 15 Arbeitskräfte, nicht
// "15 pro Jahr". Bis v0.5 stand hinter beidem dasselbe "/h" -- bei der
// Arbeitskraft war das schon immer falsch, nur fiel es ohne Zeitmaßstab
// niemandem auf.
function ratenBuendelText(buendel, symbolisch = false) {
  const proJahr = {};
  const dauerhaft = {};
  for (const [resId, wert] of Object.entries(buendel)) {
    if (RESSOURCEN[resId] && RESSOURCEN[resId].art === "fluss") dauerhaft[resId] = wert;
    else proJahr[resId] = Math.round(rateProJahr(wert));
  }
  const schreib = symbolisch ? buendelSymbole : buendelText;
  const teile = [];
  if (Object.keys(proJahr).length) teile.push(schreib(proJahr) + t("/Jahr"));
  if (Object.keys(dauerhaft).length) teile.push(schreib(dauerhaft));
  return teile.join(symbolisch ? "  " : ", ");
}

// --- Aufschlüsselung der Renderkosten (A-030) -----------------------------
//
// `render()` läuft jede Sekunde und ruft JEDEN Bereich auf, auch die sieben,
// die gerade nicht zu sehen sind. Ob das 5 ms oder 50 ms kostet, war nie
// gemessen -- und ein Freeze-Bericht ohne Aufschlüsselung ist eine Vermutung.
//
// Aus, solange niemand sie einschaltet. Kosten im Normalbetrieb: eine
// Null-Prüfung je Bereich.
//
//   window.__entropy.profilStarten(); // ein paar Sekunden warten
//   window.__entropy.profilLesen();   // Millisekunden je Bereich, sortiert
let profil = null;

export function renderProfilStarten() {
  profil = new Map();
}

export function renderProfilLesen() {
  if (!profil) return null;
  const zeilen = [...profil.entries()].map(([name, { summe, aufrufe }]) => ({
    name,
    msJeAufruf: +(summe / aufrufe).toFixed(2),
    aufrufe,
  }));
  zeilen.sort((a, b) => b.msJeAufruf - a.msJeAufruf);
  return zeilen;
}

// Die Renderkosten JE ANSICHT, in einem Aufruf (A-032).
//
// Gebaut, damit die Messung in einem anderen Browser kein Bastelwerk ist:
// Tobis Umgebung ist Firefox, die A-030-Zahlen kommen aus Chrome, und Firefox
// hat andere DOM-Kosten. Ein Einzeiler in der Konsole liefert die
// Vergleichstabelle:
//
//   __entropy.profilAnsichten()
//
// Er schaltet die Ansichten durch, rendert jede mehrfach und stellt danach die
// ursprüngliche wieder her.
export function renderProfilAnsichten(state, root, durchlaeufe = 15) {
  const knoepfe = [...root.querySelectorAll("[data-bereich-knopf]")];
  const vorher = (root.querySelector("[data-bereich-knopf].aktiv") || knoepfe[0] || {}).dataset;
  const ergebnis = {};
  for (const knopf of knoepfe) {
    knopf.click();
    render(state, root); // Aufwärmlauf verwerfen -- der erste trägt die JIT-Zeit
    const t0 = performance.now();
    for (let i = 0; i < durchlaeufe; i++) render(state, root);
    ergebnis[knopf.dataset.bereichKnopf] = +((performance.now() - t0) / durchlaeufe).toFixed(1);
  }
  if (vorher && vorher.bereichKnopf) {
    const zurueck = root.querySelector(`[data-bereich-knopf="${vorher.bereichKnopf}"]`);
    if (zurueck) zurueck.click();
  }
  return ergebnis;
}

function teil(name, fn) {
  if (!profil) return fn();
  const t0 = performance.now();
  fn();
  const dauer = performance.now() - t0;
  const alt = profil.get(name) || { summe: 0, aufrufe: 0 };
  profil.set(name, { summe: alt.summe + dauer, aufrufe: alt.aufrufe + 1 });
}

// --- Nur zeichnen, was jemand sieht (A-030) --------------------------------
//
// DAS WAR DIE URSACHE DER FREEZES, und sie hat mit der Zeitaufholung nichts zu
// tun. `render()` läuft jede Sekunde und rief JEDEN Bereich auf -- auch die
// sieben, die gerade hinter `hidden` liegen.
//
// Gemessen im Browser auf der Demo-Saat (397 Planeten, 509 Flotten), Kosten je
// Aufruf: Markt 15,0 ms · Forschung 5,8 ms · Galaxie 4,4 ms · Gebäude 3,6 ms,
// ganzer Durchlauf rund 54 ms. Der teuerste Posten war ein Bereich, den
// niemand ansah. Auf einem vier- bis sechsmal langsameren Gerät sind das 220
// bis 330 ms -- JEDE SEKUNDE. Genau das ist Tobis „Freezes kommen wirklich
// sehr regelmäßig", und es erklärt, warum der v0.82-Umbau nichts geändert hat:
// er hat den falschen Verdächtigen behandelt.
//
// `renderNavigation` setzt die `hidden`-Marken, und es läuft VOR den
// Bereichen -- die Abfrage hier sieht also schon den neuen Stand. Beim
// Umschalten zeichnet der neue Bereich damit im selben Durchlauf.
function bereichSichtbar(root, name) {
  const abschnitt = root.querySelector(`.bereich[data-bereich="${name}"]`);
  // Kein Abschnitt gefunden heißt: zeichnen. Lieber zu viel Arbeit als eine
  // Anzeige, die stillschweigend einfriert.
  return !abschnitt || !abschnitt.hidden;
}

export function render(state, root) {
  const jetzt = spielzeitJetzt(state);
  const planet = aktiverPlanet(state);

  // Version UND Herkunft: welcher Ordner liefert das hier gerade aus? Siehe
  // STAND in data.js -- die Antwort steht in den Dateien, nicht im Port.
  // Drei Stände, nicht mehr zwei: seit es ein Veröffentlichungspaket gibt
  // (veroeffentlichen.mjs), soll ein Fehlerbericht von außen erkennen lassen,
  // welchen Stand der Absender vor sich hatte. "entwicklung" bleibt die
  // Vorgabe und damit die harmlose Richtung -- schlägt das Umschreiben beim
  // Bauen fehl, behauptet das Paket lieber zu viel als zu wenig.
  const standText =
    STAND === "spielkopie" ? t("Spielkopie") : STAND === "demo" ? t("Demo") : t("Entwicklung");
  root.querySelector("#version").textContent = `v${VERSION} · ${standText}`;
  renderDatum(state, root, jetzt);
  renderSupernova(state, root, jetzt);
  renderAbspann(state, root);
  // Nach dem Abspann: der prüft selbst, ob er zu sehen ist, und das
  // Erklärfenster tritt hinter ihm zurück (siehe dort).
  renderErstklaerung(state, root, planet);
  renderSprachwahl(state, root);
  renderFesteTexte(root);
  root.querySelector("#planet-name").textContent = planet.name;
  root.querySelector("#planet-koordinaten").textContent = t("{system} · Orbit {orbit} · {art}", {
    system: systemName(state.galaxie.seed, planet.systemId),
    orbit: planet.orbit,
    art: planetArtText(planet),
  });

  teil("planetenwahl", () => renderPlanetenwahl(state, root));
  teil("ressourcen", () => renderRessourcen(state, root, planet));
  teil("navigation", () => renderNavigation(state, root, planet));
  teil("status", () => renderStatus(state, root, planet, jetzt));
  // Ab hier nur noch, was zu sehen ist. Die Reihenfolge bleibt wie gehabt --
  // sie ist an mehreren Stellen begründet (Abspann vor Erstklärung, Handbuch
  // vor dem Hinweis).
  const sichtbar = (name) => bereichSichtbar(root, name);
  if (sichtbar("imperium")) teil("imperium", () => renderImperium(state, root));
  if (sichtbar("planet")) {
    teil("gebaeude", () => renderGebaeude(state, root, planet));
    teil("verarbeitung", () => renderVerarbeitung(state, root, planet));
  }
  if (sichtbar("forschung")) teil("forschung", () => renderForschung(state, root, planet));
  if (sichtbar("werft")) teil("werft", () => renderWerft(state, root, planet, jetzt));
  if (sichtbar("handel")) {
    teil("markt", () => renderMarkt(state, root, planet));
    teil("logistiknetz", () => renderLogistiknetz(state, root, planet, jetzt));
  }
  if (sichtbar("flotten")) teil("flotten", () => renderFlotten(state, root, planet, jetzt));
  if (sichtbar("galaxie")) {
    teil("galaxie", () => renderGalaxie(state, root));
    teil("system", () => renderSystem(state, root, jetzt));
  }
  if (sichtbar("handbuch")) teil("handbuch", () => renderHandbuch(root));
  // Nach dem Handbuch, damit der Hinweis im selben Takt in der Liste landet.
  handbuchHinweisPruefen(state);
  renderMeldungen(state, root);
}

// Das Handbuch. Es hängt an KEINEM Spielzustand -- es erklärt Regeln, nicht
// Zahlen -- und wird deshalb nur EINMAL je Sprache gebaut. Der Vermerk am
// Element ist dasselbe Muster wie beim Abspann und bei der Sprachleiste: im
// Sekundentakt neu aufgebauter Text wäre nicht nur verschwendete Arbeit,
// sondern würde beim Lesen die Markierung der Maus zerreißen.
function renderHandbuch(root) {
  const block = root.querySelector("#handbuch-block");
  if (!block || block.dataset.gezeichnet === sprache()) return;
  block.dataset.gezeichnet = sprache();

  block.replaceChildren(
    ...handbuchAbschnitte().flatMap((abschnitt) => {
      const h3 = document.createElement("h3");
      h3.textContent = abschnitt.titel;
      const absaetze = abschnitt.absaetze.map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      });
      return [h3, ...absaetze];
    })
  );
}

// Feste Beschriftungen aus index.html (Überschriften, Testmodus-Leiste).
// Der deutsche Text steht als data-text bzw. data-titel am Element und ist wie
// überall der Übersetzungsschlüssel -- im Deutschen kommt er unverändert
// zurück. So bleibt das Markup lesbar, statt in leeren Hüllen mit IDs zu
// bestehen, und tests/sprache.test.js prüft die Attribute auf Vollständigkeit.
function renderFesteTexte(root) {
  // lang gehört mit umgestellt: sonst trennt der Browser englischen Text nach
  // deutschen Regeln und Vorleseprogramme sprechen ihn mit deutschem Akzent.
  if (typeof document !== "undefined") document.documentElement.lang = sprache();
  for (const el of root.querySelectorAll("[data-text]")) el.textContent = t(el.dataset.text);
  for (const el of root.querySelectorAll("[data-titel]")) el.title = t(el.dataset.titel);
}

function planetArtText(planet) {
  if (planet.typ === "heimat") return t("Heimatwelt");
  if (planet.typ === "kolonie") return t("Kolonie");
  return t("Außenposten");
}

// PRINZIP 8a (A-004): Die Planetenwahl baute ihre Knöpfe bis v0.82 jede
// Sekunde neu -- und sie ist die meistbenutzte Bedienung des Spiels. Ein
// verschluckter Klick heißt hier: man landet nicht auf der Welt, die man
// anklickt, und merkt es erst zwei Handgriffe später.
//
// Die Knöpfe hängen jetzt am Planeten (stabiler Schlüssel), das Ereignis
// wird EINMAL beim Bauen gesetzt. Was sich ändert -- Name, Art, welcher
// aktiv ist -- wird nachgezogen, nicht neu erzeugt.
function renderPlanetenwahl(state, root) {
  const leiste = root.querySelector("#planeten-leiste");
  // Nur eigene Stützpunkte -- state.planeten hält seit v0.33 ALLE.
  listeAbgleichen(leiste, planetenVon(state), {
    schluessel: (planet) => planet.id,
    bauen: (planet) => {
      const btn = document.createElement("button");
      btn.className = "planet-chip";
      btn.dataset.planet = planet.id;
      btn.addEventListener("click", () => {
        state.aktiverPlanet = planet.id;
        render(state, root);
      });
      return btn;
    },
    aktualisieren: (btn, planet) => {
      btn.classList.toggle("chip-aktiv", planet.id === state.aktiverPlanet);
      btn.classList.toggle("chip-aussenposten", planet.typ === "aussenposten");
      textSetzen(btn, planet.typ === "heimat" ? planet.name : `${planet.name} · ${planetArtText(planet)}`);
    },
  });
}

// Waagerechte Ressourcenleiste im AOE2-Muster: Symbol, Name, Bestand,
// Stufe der Förderanlage, Rate. Alles Genaue steckt zusätzlich im title --
// die Kachel bleibt dadurch schmal, ohne Information zu verlieren.
// Sprachwahl im Kopf. Wird bei jedem Rendern neu aufgebaut wie alles andere;
// der aktive Knopf trägt dieselbe .aktiv-Markierung wie sonst im Spiel.
function renderSprachwahl(state, root) {
  const leiste = root.querySelector("#sprach-leiste");
  const aktiv = sprache();
  if (leiste.dataset.gezeichnet === aktiv) return; // nichts zu tun, spart Arbeit im Sekundentakt
  leiste.dataset.gezeichnet = aktiv;
  leiste.innerHTML = SPRACHEN.map(
    (s) =>
      `<button data-sprache="${s.code}" class="${s.code === aktiv ? "aktiv" : ""}" title="${s.name}">${s.code.toUpperCase()}</button>`
  ).join("");
  leiste.querySelectorAll("button[data-sprache]").forEach((btn) => {
    btn.addEventListener("click", () => {
      spracheSetzen(btn.dataset.sprache);
      leiste.dataset.gezeichnet = ""; // erzwingt den Neuaufbau der Leiste
      render(state, root);
    });
  });
}

// Die Einheit eines eigenen Speichers. Sie kann von der Einheit der Ressource
// ABWEICHEN, und beim ersten Fall tut sie das auch: Energie fließt als
// Leistung (MW) und wird als Arbeit gespeichert (MWh). Ohne diese Trennung
// stünde an der Batterie eine physikalisch falsche Einheit -- derselbe
// Fehlertyp wie das fest verdrahtete "MW" an der Arbeitskraft in v0.19.
function speicherEinheit(resId) {
  const def = RESSOURCEN[resId];
  if (!def || !def.speicher) return einheit(resId);
  return def.speicher.einheit || einheit(resId);
}

// Zusatzzeile an der Kachel einer Fluss-Ressource, sobald sie einen eigenen
// Speicher hat (Energie: die Batterie).
//
// Die Einheit kommt aus dem speicher-Eintrag und NICHT aus def.einheit: der
// Fluss ist eine Leistung (MW), der Bestand eine Arbeit (MWh). Das ist kein
// Detail -- stünde am Speicherstand "MW", wäre die Anzeige physikalisch falsch.
function flussSpeicherZeile(planet, resId, netto) {
  const def = RESSOURCEN[resId];
  if (!def.speicher) return null;
  const grenze = speicherKapazitaet(planet, resId);
  if (!grenze) return null; // noch kein Speicher gebaut: keine leere Zeile zeigen
  const bestand = planet.ressourcen[resId] || 0;
  const einh = speicherEinheit(resId);
  const anteil = grenze > 0 ? Math.min(1, bestand / grenze) : 0;

  let zustand = "";
  if (netto > 0) {
    zustand = bestand >= grenze
      ? t("Speicher voll")
      : t("lädt {rate} {einheit}", { rate: fmt(netto), einheit: einheit(resId) });
  } else if (netto < 0) {
    zustand = t("entlädt {rate} {einheit}", { rate: fmt(-netto), einheit: einheit(resId) });
  } else if (bestand <= 0) {
    zustand = t("Speicher leer");
  }

  const zeilen = [t("Speicher {menge} / {grenze} {einheit}", { menge: fmt(bestand), grenze: fmt(grenze), einheit: einh })];
  if (netto < 0) {
    zeilen.push(t("Der Speicher deckt das Defizit – die Anlagen laufen weiter."));
    zeilen.push(t("Reicht noch {dauer}.", { dauer: fmtDauer(pufferReichweiteMs(bestand, -netto) / 1000) }));
  }

  return {
    titel: zeilen.join("\n"),
    html: `
      <span style="display:flex;justify-content:space-between;gap:.5rem" title="${zeilen.join("\n")}">
        <span class="dezent">🔋 ${fmt(bestand)} / ${fmt(grenze)} ${einh}</span>
        <span class="dezent ${netto < 0 ? "warnung" : ""}">${zustand}</span>
      </span>
      <span class="energie-balken-rahmen">
        <span class="energie-balken speicher" style="width:${(anteil * 100).toFixed(1)}%"></span>
      </span>`,
  };
}

function resKachel({ symbol, name, wert, stufe, rate, rateKlasse = "", klassen = "", titel = "", farbe = "" }) {
  return `
    <div class="res-kachel ${klassen}" title="${titel}"${farbe ? ` style="--res-farbe:${farbe}"` : ""}>
      <span class="res-symbol">${symbol}</span>
      <span class="res-oben">
        <span class="res-name">${name}</span>
        <span class="res-stufe">${stufe}</span>
      </span>
      <span class="res-unten">
        <span class="res-wert">${wert}</span>
        <span class="res-rate ${rateKlasse}">${rate}</span>
      </span>
    </div>`;
}

function renderRessourcen(state, root, planet) {
  const leiste = root.querySelector("#ressourcen-leiste");
  leiste.innerHTML = "";

  if (planet.typ === "aussenposten") {
    leiste.innerHTML = t('<div class="dezent">Außenposten haben kein Lager – sie verschieben nur deine Reichweite.</div>');
    return;
  }

  const { lager, fluss, produktion, verbrauch, bedarf, drosselung, effizienz } = effektiveRaten(state, planet);
  // Nur die Stufe der Förderanlage -- welches Gebäude gemeint ist, steht im
  // title. Abgekürzte Namen ("Meta. 3") wären schmal, aber unleserlich.
  const stufeVon = (resId) => {
    const gebaeudeId = RESSOURCEN[resId].gebaeude;
    if (!gebaeudeId) return "";
    return `Lv ${planet.gebaeude[gebaeudeId] || 0}`;
  };

  // Zwei getrennte Reihen statt einer umbrechenden Zeile (Tobis Vorgabe,
  // 2026-08-16): oben was man HAT, unten was man KANN. Das trennt zwei
  // verschiedene Fragen und macht nebenbei den springenden Umbruch unmöglich
  // -- siehe .ressourcenleiste in style.css.
  let vorraete = "";
  let kapazitaeten = "";

  for (const resId of LAGER_RESSOURCEN) {
    const def = RESSOURCEN[resId];
    // lagerverbrauch ist ein Volumen: m³ pro Einheit dieser Ressource.
    const volumen = def.lagerverbrauch;
    const gewichtText =
      volumen === 0
        ? t("braucht keinen Lagerplatz")
        : t("{volumen} m³ pro {einheit} · {belegt} m³ belegt", {
            volumen,
            einheit: einheit(resId) || t("Einheit"),
            belegt: fmt((planet.ressourcen[resId] || 0) * volumen),
          });
    const rate = lager[resId] || 0;
    // Eine NEGATIVE Rate bedeutet: eine Verarbeitungskette zieht mehr ab, als
    // nachkommt, und lebt vom Bestand. Das muss man sehen -- ein leeres Feld
    // (die alte Anzeige für "nicht positiv") würde genau die Information
    // verschweigen, die zur Entscheidung nötig ist.
    const zieht = rate < 0;
    const braucht = bedarf[resId] || 0;
    const anteil = drosselung[resId] === undefined ? 1 : drosselung[resId];
    const reserve = verarbeitungsReserveFuer(planet, resId);
    let kettenText = "";
    if (braucht > 0) {
      kettenText = t(" · Verarbeitung braucht {menge} im Jahr", { menge: fmt(rateProJahr(braucht)) });
      if (zieht) {
        const stunden = (planet.ressourcen[resId] - reserve) / -rate;
        const dauer = fmtDauer(Math.max(0, stunden) * 3600);
        kettenText +=
          reserve > 0
            ? t(" – Bestand reicht noch {dauer} bis zur Reserve ({reserve})", { dauer, reserve: fmt(reserve) })
            : t(" – Bestand reicht noch {dauer}", { dauer });
      } else if (anteil < 1) {
        kettenText += t(" – Anlagen laufen mit {anteil}%, es kommen nur {menge} im Jahr nach", {
          anteil: Math.round(anteil * 100),
          menge: fmt(rateProJahr(verbrauch[resId] || 0)),
        });
      }
    }
    // Ressourcen mit eigener Speicherkapazität (Bevölkerung, später
    // Batterien) zeigen Bestand GEGEN ihre Grenze -- die Zahl allein wäre
    // wertlos, weil man die Obergrenze zur Entscheidung braucht.
    const eigenerSpeicher = speicherKapazitaet(planet, resId);
    const hatSpeicher = Number.isFinite(eigenerSpeicher);
    const bestandJetzt = planet.ressourcen[resId] || 0;
    const speicherVoll = hatSpeicher && bestandJetzt >= eigenerSpeicher;
    if (hatSpeicher) {
      kettenText += speicherVoll
        ? t(" · Platz für {platz} – belegt, es wächst niemand nach", { platz: fmt(eigenerSpeicher) })
        : t(" · Platz für {platz}", { platz: fmt(eigenerSpeicher) });
    }

    vorraete += resKachel({
      symbol: def.symbol || "•",
      name: t(def.name),
      wert: hatSpeicher
        ? `${fmt(bestandJetzt)} / ${fmt(eigenerSpeicher)}`
        : mitEinheit(resId, bestandJetzt),
      stufe: stufeVon(resId),
      rate: hatSpeicher
        ? speicherVoll
          ? t("voll")
          : ""
        : rate > 0
          ? `+${ratenText(resId, rate)}`
          : zieht
            ? `−${ratenText(resId, -rate)}`
            : "",
      rateKlasse: zieht || speicherVoll ? "warnung" : "",
      titel:
        `${t(def.name)} – ${gewichtText}` +
        (def.gebaeude ? t(" · gefördert von {gebaeude}", { gebaeude: t(BUILDINGS[def.gebaeude].name) }) : "") +
        kettenText,
      // Dieselbe Farbe wie das Segment im Lagerbalken -- die Kachel ist die
      // Legende dazu.
      farbe: volumen > 0 ? def.farbe : "",
    });
  }

  // Fluss-Ressourcen: kein Bestand, sondern Erzeugung gegen Verbrauch. Der
  // Balken zeigt die Auslastung -- also wie viel der Erzeugung schon verplant
  // ist. Über 100% drosselt sie ALLES, deshalb bekommt der Fall eine eigene
  // Farbe statt nur zweier Zahlen.
  //
  // Seit v0.19 gibt es ZWEI davon (Energie und Arbeitskraft). Bis dahin war
  // hier die Einheit "MW" fest eingetragen -- die Arbeitskraft meldete
  // prompt "0 MW von 50.000 MW". Alles hier muss über einheit()/def.name
  // laufen, nichts darf mehr auf Energie fest verdrahtet sein.
  for (const resId of FLUSS_RESSOURCEN) {
    const def = RESSOURCEN[resId];
    const prod = produktion[resId] || 0;
    const braucht = verbrauch[resId] || 0;
    // Ein Speicher, der das Defizit gerade deckt, darf hier NICHT als Mangel
    // erscheinen: die Anlagen laufen ja weiter. Stünde hier weiter der reine
    // Vergleich prod < braucht, meldete die Kachel einen Ausfall, den es nicht
    // gibt -- dieselbe Sorte Lüge wie das frühere "gedrosselt auf 100 %".
    const gedeckt = flussSpeicherDeckung(planet, resId, prod, braucht) > 0;
    const knapp = braucht > 0 && prod < braucht && !gedeckt;
    const auslastung = prod > 0 ? braucht / prod : braucht > 0 ? 1 : 0;
    const frei = Math.max(0, prod - braucht);
    const speicherText = flussSpeicherZeile(planet, resId, fluss[resId] || 0);
    kapazitaeten += `
      <div class="res-kachel energie" title="${
        knapp
          ? t("{res} fehlt: {braucht} {einheit} gebraucht, nur {da} verfügbar – alle Anlagen laufen mit {anteil}%", {
              res: t(def.name),
              braucht: fmt(braucht),
              einheit: einheit(resId),
              da: fmt(prod),
              anteil: Math.round(effizienz * 100),
            })
          : t("{braucht} {einheit} von {da} {einheit} verbraucht · {frei} {einheit} frei", {
              braucht: fmt(braucht),
              einheit: einheit(resId),
              da: fmt(prod),
              frei: fmt(frei),
            })
      }${speicherText ? "\n" + speicherText.titel : ""}">
        <span class="res-symbol">${def.symbol || "•"}</span>
        <span class="res-oben">
          <span class="res-name">${t(def.name)}</span>
          <span class="res-stufe">${stufeVon(resId)}</span>
        </span>
        <span class="res-unten" style="flex-direction:column;align-items:stretch;gap:.2rem">
          <span style="display:flex;justify-content:space-between;gap:.5rem">
            <span class="res-wert ${knapp ? "warnung" : ""}">${fmt(braucht)} / ${fmt(prod)} ${einheit(resId)}</span>
            <span class="res-rate ${knapp ? "warnung" : ""}">${
              knapp
                ? `${Math.round(effizienz * 100)}%`
                : t("{frei} {einheit} frei", { frei: fmt(frei), einheit: einheit(resId) })
            }</span>
          </span>
          <span class="energie-balken-rahmen">
            <span class="energie-balken ${knapp ? "warnung" : ""}" style="width:${Math.min(100, auslastung * 100).toFixed(1)}%"></span>
          </span>
          ${speicherText ? speicherText.html : ""}
        </span>
      </div>`;
  }

  // Lagerauslastung als eigene Kachel in derselben Leiste.
  const gesamt = lagerKapazitaetGesamt(state, planet);
  const belegt = lagerBelegung(planet);
  const anteil = gesamt > 0 ? Math.min(1, belegt / gesamt) : 0;

  // Der Balken ist gestapelt: jedes Segment zeigt, wie viel Volumen EINE
  // Ressource belegt, in ihrer eigenen Farbe. Ohne das sagt ein Lager von
  // "80% voll" nichts darüber, was man eigentlich loswerden müsste.
  // Die Ressourcenkacheln tragen dieselben Farben und dienen als Legende.
  const segmente = LAGER_RESSOURCEN.map((resId) => {
    const def = RESSOURCEN[resId];
    const volumen = (planet.ressourcen[resId] || 0) * lagerverbrauchVon(resId);
    return { resId, def, volumen, anteil: gesamt > 0 ? volumen / gesamt : 0 };
  })
    .filter((s) => s.volumen > 0)
    .sort((a, b) => b.volumen - a.volumen);

  const balkenHtml = segmente
    .map(
      (s) =>
        `<span class="lager-segment" style="width:${Math.min(100, s.anteil * 100).toFixed(2)}%;background:${
          s.def.farbe
        }" title="${t("{res}: {volumen} m³ ({anteil}% des Lagers)", {
          res: t(s.def.name),
          volumen: fmt(s.volumen),
          anteil: Math.round(s.anteil * 100),
        })}"></span>`
    )
    .join("");
  kapazitaeten += `
    <div class="res-kachel lager" title="${t("{belegt} von {gesamt} m³ belegt", {
      belegt: fmt(belegt),
      gesamt: fmt(gesamt),
    })}">
      <span class="res-symbol">📦</span>
      <span class="res-oben">
        <span class="res-name">${t("Lager")}</span>
        <span class="res-stufe">Lv ${planet.gebaeude.lagerhalle || 0}</span>
      </span>
      <span class="res-unten" style="flex-direction:column;align-items:stretch;gap:.2rem">
        <span class="res-wert">${formatKurz(belegt)} / ${formatKurz(gesamt)} m³</span>
        <span class="lager-balken-rahmen">${balkenHtml}</span>
      </span>
    </div>`;

  // Verdeckte Platzhalter: zeigen Tiefe, ohne zu spoilern. Sie gehören zu den
  // VORRÄTEN -- es sind künftige Ressourcen, und dort ist der Platz für sie.
  for (let i = 0; i < UNBEKANNTE_RESSOURCEN.slots; i++) {
    vorraete += resKachel({
      symbol: UNBEKANNTE_RESSOURCEN.symbol,
      name: "???",
      wert: "???",
      stufe: "",
      rate: "",
      klassen: "unbekannt",
      titel: t("Noch nicht entdeckt"),
    });
  }

  leiste.innerHTML =
    `<div class="res-reihe">${vorraete}</div>` +
    `<div class="res-reihe res-reihe-kapazitaet">${kapazitaeten}</div>`;
}

// --- Navigation ---------------------------------------------------------
// Feste Reihenfolge, fester Platz. Neue Bereiche kommen unten dazu, nichts
// zieht um -- das ist die Voraussetzung dafür, dass man sich die Positionen
// merken kann.
// label ist eine Funktion, keine Zeichenkette: eine feste Zeichenkette würde
// beim Laden des Moduls einmal übersetzt und bliebe in der Startsprache
// stehen. Außerdem findet der Vollständigkeitstest die Beschriftungen nur so.
const BEREICHE = [
  { id: "planet", label: () => t("Planet") },
  { id: "forschung", label: () => t("Forschung") },
  { id: "werft", label: () => t("Werft") },
  { id: "flotten", label: () => t("Flotten") },
  { id: "galaxie", label: () => t("Galaxie") },
  { id: "handel", label: () => t("Handel") },
  // Neue Bereiche kommen UNTEN dazu, nie dazwischen -- sonst wandern die
  // gewohnten Positionen und das Muskelgedächtnis ist hin.
  { id: "imperium", label: () => t("Imperium") },
  { id: "handbuch", label: () => t("Handbuch") },
];

// Wann diese Sitzung angefangen hat zu zeigen. UI-lokal und bewusst nicht im
// Spielstand: es geht um die Zeit VOR DEM BILDSCHIRM, nicht um Spielzeit.
let sitzungBeginn = null;

// Tobis Vorgabe zum Handbuch-Hinweis (16.08.2026): "Die Meldung kommt nach ca
// einer Minute Spielzeit. Der Spieler soll sich erstmal umschauen und
// verwirrt sein. Dann ist er empfänglicher für Hilfe."
//
// Deshalb weder beim Start (da liest niemand) noch gar nicht (dann findet der
// Neuling den Tab erst, wenn die Frist abgelaufen ist). Genau einmal je
// Spielstand -- der Merker wird mitgespeichert.
const HANDBUCH_HINWEIS_MS = 60_000;

function handbuchHinweisPruefen(state) {
  if (sitzungBeginn === null) sitzungBeginn = Date.now();
  if (state.handbuchAngeboten) return;
  if (Date.now() - sitzungBeginn < HANDBUCH_HINWEIS_MS) return;
  // ERST die Meldung, DANN der Merker. Beim Bauen war es andersherum, und
  // genau daran ist der erste Versuch gescheitert: der Aufruf warf (ein
  // fehlender Import), der Merker stand aber schon auf "gezeigt" und wurde
  // mitgespeichert -- der Hinweis wäre für diesen Spielstand für immer weg
  // gewesen, ohne dass ihn je jemand gesehen hätte.
  //
  // Verallgemeinert: ein Merker, der sagt "ist erledigt", gehört hinter die
  // Sache, die er bezeugt.
  meldungHinzufuegen(
    state,
    t("Verwirrt? Das Handbuch erklärt, wie diese Welt funktioniert – was sie von dir will, und warum die Uhr läuft.")
  );
  state.handbuchAngeboten = true;
}

// Welcher Bereich gerade sichtbar ist. Bewusst UI-Zustand, nicht Spielstand:
// gehört nicht in die Speicherdatei und nicht in die Simulation.
let aktiverBereich = "planet";

// Statusspalte startet eingeklappt -- der Platz gehört dem Spielfeld, und
// laufende Aufträge sind auch an den Punkten in der Navigation erkennbar.
let statusOffen = false;

// Läuft in diesem Bereich gerade etwas? Steuert den Punkt in der Navigation,
// damit ein Wechsel zu "ein Bereich sichtbar" keine Information verdeckt.
function bereichAktiv(state, planet, bereichId) {
  switch (bereichId) {
    case "planet":
      return Boolean(planet.bauQueue);
    case "forschung":
      return Boolean(state.forschungsQueue);
    case "werft":
      return Boolean(planet.werftQueue);
    case "flotten":
      // Auch hier nur die eigenen: der Punkt bedeutet "bei DIR läuft etwas".
      // Mit allen Flotten der Galaxie leuchtete er praktisch immer, weil
      // irgendeine Piratengruppe immer unterwegs ist -- ein Signal, das immer
      // an ist, ist kein Signal.
      return flottenVon(state).some((f) => f.abschnitt || f.gefecht || (f.route && f.route.aktiv));
    case "handel":
      return state.logistikTransfers.length > 0;
    default:
      return false;
  }
}

// WIE DRINGEND SIEHT DIE UHR AUS? Vier Stufen, nach dem ANTEIL der Frist, der
// noch übrig ist -- nicht nach absoluten Jahren. Der Anteil trägt beide Phasen
// ohne zweite Tabelle: die Vorwarnung dauert 240 Spieljahre, die Zeit zwischen
// Blitz und Flut 239, und ein Fünftel davon fühlt sich in beiden gleich an.
//
// Kein Blinken, in keiner Stufe. Eine Frist, die dauernd zuckt, wird
// weggeschaut -- sie soll auffallen, wenn man hinsieht, und nicht ununterbrochen
// um Aufmerksamkeit betteln (Prinzip 11: jede Hervorhebung muss sich verdienen,
// sonst höhlt sie sich selbst aus).
const UHR_STUFEN = [
  { ab: 0.5, klasse: "" }, // mehr als die Hälfte übrig: eine ruhige Angabe
  { ab: 0.2, klasse: "eng" },
  { ab: 0.05, klasse: "knapp" },
  { ab: 0, klasse: "kritisch" },
];

function uhrStufe(anteilUebrig) {
  for (const stufe of UHR_STUFEN) if (anteilUebrig >= stufe.ab) return stufe.klasse;
  return "kritisch";
}

// Die Uhr, unter der die ganze Partie steht.
//
// Sie sagt bewusst BEIDES: was in Spieljahren passiert und wieviel Echtzeit
// das ist. Ohne die zweite Zahl kann niemand planen, ob er heute Abend noch
// eine Kolonie schafft; ohne die erste ist es ein Countdown ohne Welt.
//
// TOBIS BEFUND (16.08.2026, erstes eigenes Spielen der Demo): "Der Countdown
// zur Supanova muss bisschen Auffälliger designed sein." Er sah aus wie eine
// Statuszeile, weil er eine war: ein Satz in Fließtext, in derselben Größe und
// Farbe wie alles andere im Kopf. Jetzt trägt er eine Marke ("FRIST"), die
// Restzeit als große Zahl, den Grund klein daneben und einen Balken, der
// zeigt, wieviel schon weg ist -- ein Balken beantwortet "wie spät ist es
// eigentlich" ohne eine einzige zusätzliche Zahl.
//
// Das GERÜST steht in index.html und wird hier nur gefüllt. Ohne das wäre die
// Uhr die nächste Stelle, an der Prinzip 8a bricht: sie läuft jede Sekunde
// weiter, ein per innerHTML neu gebauter Kopf hätte also jede Sekunde neue
// Elemente.
// Das Ingame-Datum (A-005). Beantwortet die Frage, ohne die die Frist der
// Demo nicht lesbar ist: was ist hier eigentlich ein Jahr?
//
// Der Hinweistext nennt den Maßstab ausdrücklich -- die Zahl allein sagt
// nicht, wie schnell sie läuft, und genau das war Tobis Punkt.
function renderDatum(state, root, jetzt) {
  const el = root.querySelector("#spiel-datum");
  if (!el) return;
  const { jahr, tag } = spielDatum(state, jetzt);
  textSetzen(el, t("Jahr {jahr} · Tag {tag}", { jahr, tag }));
  attributSetzen(
    el,
    "title",
    t("Seit der Gründung dieser Kolonie. Eine Echtzeitsekunde ist ein Spieltag, ein Jahr sind {tage} Tage – gut sechs Echtzeitminuten.", {
      tage: Math.round(ZEIT.tageProJahr),
    })
  );
}

function renderSupernova(state, root, jetzt) {
  const el = root.querySelector("#supernova-uhr");
  if (!el) return;
  const sn = state.supernova;
  if (!sn) {
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const restMs = supernovaRestMs(state, jetzt);
  const restSek = restMs === null ? 0 : Math.max(0, restMs / 1000);
  const name = systemName(state.galaxie.seed, sn.systemId);

  // Gesamtdauer der laufenden Phase, damit der Balken einen Bezug hat. Für die
  // Zeit zwischen Blitz und Flut steht sie im Spielstand; für die Vorwarnung
  // nicht -- dort ist der Startzeitpunkt nirgends festgehalten, wohl aber die
  // Regel, aus der er kommt (SUPERNOVA.jahreBisKollaps).
  const marke = el.querySelector("#uhr-marke");
  const zeit = el.querySelector("#uhr-zeit");
  const was = el.querySelector("#uhr-was");
  const fuellung = el.querySelector("#uhr-fuellung");

  if (sn.phase === "vorwarnung" || sn.phase === "blitz") {
    const gesamtMs =
      sn.phase === "vorwarnung" ? jahreInMs(SUPERNOVA.jahreBisKollaps) : sn.flutZeit - sn.kollapsZeit;
    const uebrig = gesamtMs > 0 ? Math.min(1, Math.max(0, (restMs || 0) / gesamtMs)) : 0;
    el.className = `supernova-uhr ${uhrStufe(uebrig)}`.trim();
    // Der Balken zeigt, was VERBRAUCHT ist -- er läuft voll, nicht leer. Eine
    // Frist, deren Anzeige wächst, liest sich als "es wird enger"; eine, die
    // schrumpft, als "es ist noch was da".
    fuellung.style.width = `${((1 - uebrig) * 100).toFixed(1)}%`;
    textSetzen(zeit, fmtDauer(restSek));
  }

  if (sn.phase === "vorwarnung") {
    textSetzen(marke, t("FRIST"));
    textSetzen(was, t("bis {stern} kollabiert", { stern: name }));
    el.title = t(
      "Das Neutrino-Observatorium liest die Brennstufe im Kern von {stern}, {lj} Lichtjahre entfernt. Wenn er kollabiert, zerlegt der Blitz die Ozonschicht – und mit ihr die Landwirtschaft jeder ungeschützten Welt.",
      { stern: name, lj: (sn.entfernung * LJ_PRO_EINHEIT).toFixed(0) }
    );
  } else if (sn.phase === "blitz") {
    textSetzen(marke, t("FLUT"));
    textSetzen(was, t("bis die Teilchenflut eintrifft"));
    el.title = t(
      "{stern} ist kollabiert. Was jetzt heranzieht, ist die kosmische Teilchenflut – geladen, jahrtausendelang, und nur durch ein Magnetfeld aufzuhalten. Danach ist keine Flottenbewegung mehr möglich.",
      { stern: name }
    );
  } else {
    el.className = "supernova-uhr kritisch";
    fuellung.style.width = "100%";
    textSetzen(marke, t("FLUT"));
    textSetzen(zeit, t("Die Flut ist da."));
    textSetzen(was, "");
    el.title = "";
  }
}

// Der Abspann. Rechnet nichts nach -- er zeigt, was zum Zeitpunkt der Flut
// wahr war, Welt für Welt. Die Zahl daneben ist die Versorgung des Schirms,
// und sie ist der eigentliche Befund: wer knapp geplant hat, sieht hier
// genau, an welcher Welt die Rechnung nicht aufging.
function renderAbspann(state, root) {
  const el = root.querySelector("#abspann");
  if (!el) return;
  if (!state.ende) {
    el.hidden = true;
    return;
  }
  el.hidden = false;

  // EINMAL bauen, nicht im Sekundentakt.
  //
  // Der Abspann zeigt einen Zeitpunkt, keine laufenden Zahlen -- er hat nichts
  // nachzuziehen. Bis hierher lief er trotzdem in jedem Takt durch innerHTML,
  // und genau das war der Grund, warum in ihm kein Knopf stehen KONNTE: nach
  // Prinzip 8a ersetzt der Takt das Element zwischen mousedown und mouseup,
  // der Klick käme also nie an. Der Sprachschlüssel steht im Vermerk mit,
  // damit ein Sprachwechsel ihn trotzdem neu setzt (gleiches Muster wie bei
  // der Sprachleiste).
  if (el.dataset.gezeichnet === sprache()) return;
  el.dataset.gezeichnet = sprache();

  const gerettet = state.ende.welten.filter((w) => w.ueberlebt);
  const menschen = gerettet.reduce((summe, w) => summe + w.bevoelkerung, 0);

  const zeilen = state.ende.welten
    .map(
      (w) => `
      <li class="${w.ueberlebt ? "abspann-hielt" : "abspann-verloren"}">
        <span>${w.name}</span>
        <span>${
          w.schild > 0
            ? t("Schirm auf {anteil}% Versorgung", { anteil: Math.round(w.versorgung * 100) })
            : t("kein Schirm")
        }</span>
        <span>${w.ueberlebt ? t("{menge} Menschen halten durch", { menge: fmt(w.bevoelkerung) }) : t("verloren")}</span>
      </li>`
    )
    .join("");

  el.innerHTML = `
    <div class="abspann-tafel">
      <h2>${state.ende.gewonnen ? t("Die Flut ist vorübergezogen.") : t("Es ist niemand geblieben.")}</h2>
      <p class="dezent">${
        state.ende.gewonnen
          ? t(
              "Jahrtausende geladener Teilchen. Wo ein Magnetfeld stand und Strom hatte, hielt die Atmosphäre – und mit ihr die Menschen darunter."
            )
          : t(
              "Jahrtausende geladener Teilchen. Keine Welt hatte ein Feld, das sie ablenken konnte. Die Atmosphären sind fort."
            )
      }</p>
      <ul class="abspann-liste">${zeilen}</ul>
      <p class="abspann-summe">${t("{welten} von {gesamt} Welten gehalten · {menschen} Menschen", {
        welten: gerettet.length,
        gesamt: state.ende.welten.length,
        menschen: fmt(menschen),
      })}</p>
      <div class="abspann-knoepfe">
        <button data-abspann-neustart title="${t(
          "Verwirft diesen Spielstand und beginnt eine frische Galaxie."
        )}">${t("Neue Welt beginnen")}</button>
      </div>
    </div>`;

  // Der einzige Weg aus dem Abspann heraus -- und deshalb nicht wegzulassen:
  // state.ende wird MITGESPEICHERT, der Abspann läge also nach jedem Neuladen
  // wieder über allem, und das Spiel wäre dauerhaft blockiert. DEMO.md sagt
  // "Game over, Neustart" zu, nicht "Game over".
  //
  // Zurückgesetzt wird auf demselben Weg wie im Testmodus (js/testmodus.js):
  // Spielstand verwerfen, den Systeme-Cache leeren -- er hält Systeme aus der
  // ALTEN Saat und würde sonst in die neue Galaxie hineinragen -- und neu
  // laden. Ohne Rückfrage, anders als dort: nach dem Ende ist nichts mehr zu
  // verlieren, und der Knopf sagt selbst, was er tut.
  el.querySelector("[data-abspann-neustart]").addEventListener("click", () => {
    zuruecksetzen();
    cacheLeeren();
    location.reload();
  });
}

// --- Erklärfenster beim ersten Start -------------------------------------
//
// Tobis Notiz vom ersten eigenen Spielen der veröffentlichten Demo
// (16.08.2026): "Es kommt kein Fenster das irgendwas erklärt."
//
// Das Handbuch war da, samt Hinweis nach einer Minute -- er hat es nicht
// wahrgenommen. Das ist der eigentliche Befund und er verallgemeinert sich:
// **eine Hilfe, die man finden muss, findet der nicht, der noch nicht weiß,
// dass er sie braucht.** Der Hinweis nach einer Minute bleibt trotzdem, er
// löst eine andere Aufgabe (Tobis Vorgabe: "Der Spieler soll sich erstmal
// umschauen und verwirrt sein"); dieses Fenster beantwortet dagegen die Frage,
// die man VOR dem Umschauen hat: wo bin ich hier eigentlich.
//
// GEBAUT WIE DER ABSPANN, und zwar bewusst: eine feste Ebene in index.html,
// EINMAL gefüllt, Ereignisse EINMAL beim Bauen. Der Abspann ist im Projekt der
// einzige Vorläufer für "Tafel über allem mit Knöpfen darin", und ein zweites,
// eigenes Overlay-Muster wäre genau die parallele Lösung, vor der Prinzip 5
// warnt. Der Vermerk `dataset.gezeichnet` trägt die Sprache mit -- gleiches
// Muster wie dort, damit ein Sprachwechsel die Tafel neu setzt.
function renderErstklaerung(state, root, planet) {
  const el = root.querySelector("#erstklaerung");
  if (!el) return;
  // Nach dem Ende hat sich die Frage erledigt -- und zwei Tafeln übereinander
  // wären ohnehin unbedienbar.
  if (state.erstklaerungGesehen || state.ende) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (el.dataset.gezeichnet === sprache()) return;
  el.dataset.gezeichnet = sprache();

  const tafel = erststartTafel(planet.name);
  el.innerHTML = `
    <div class="erstklaerung-tafel">
      <h2>${tafel.titel}</h2>
      ${tafel.absaetze.map((p) => `<p>${htmlText(p)}</p>`).join("")}
      <p class="dezent">${tafel.hinweis}</p>
      <div class="erstklaerung-knoepfe">
        <button data-erst-handbuch class="zweitrangig">${t("Handbuch öffnen")}</button>
        <button data-erst-los>${t("Los geht's")}</button>
      </div>
    </div>`;

  // ERST die Tafel wegnehmen, DANN der Merker -- dieselbe Reihenfolge und
  // dieselbe Begründung wie beim Handbuch-Hinweis weiter unten: ein Merker,
  // der sagt "ist erledigt", gehört hinter die Sache, die er bezeugt. Hier ist
  // das billig zu haben, weil beides in einer Funktion steht.
  const schliessen = () => {
    el.hidden = true;
    state.erstklaerungGesehen = true;
  };

  // Der Weg ins Handbuch führt über denselben Schalter wie die Navigation
  // (aktiverBereich) -- kein zweiter Mechanismus fürs Bereichswechseln.
  el.querySelector("[data-erst-handbuch]").addEventListener("click", () => {
    schliessen();
    aktiverBereich = "handbuch";
    render(state, root);
  });
  el.querySelector("[data-erst-los]").addEventListener("click", () => {
    schliessen();
    render(state, root);
  });
}

// Die Navigation ist der meistgeklickte Bereich des Spiels und war der erste,
// der auf stabile Elemente umgestellt wurde -- allerdings nur auf dem
// Spielzweig (v0.41s2). Hier lief sie bis v0.61 weiter jede Sekunde neu.
// (Diese drei Zeilen standen versehentlich über renderSupernova, bis dort die
// Uhr umgebaut wurde -- sie beschreiben diese Funktion hier.)
function renderNavigation(state, root, planet) {
  const nav = root.querySelector("#navigation");

  listeAbgleichen(nav, BEREICHE, {
    schluessel: (b) => b.id,
    bauen: (b) => {
      const btn = document.createElement("button");
      btn.className = "nav-knopf";
      btn.dataset.bereichKnopf = b.id;
      btn.innerHTML = `<span data-nav-text></span><span class="nav-punkt" hidden></span>`;
      // EINMAL beim Bauen. Genau das ist der Punkt der ganzen Umstellung.
      btn.addEventListener("click", () => {
        aktiverBereich = b.id;
        render(state, root);
      });
      return btn;
    },
    aktualisieren: (btn, b) => {
      // Die Beschriftung läuft über t() und muss beim Sprachwechsel mitkommen
      // -- deshalb hier und nicht einmalig beim Bauen.
      textSetzen(btn.querySelector("[data-nav-text]"), b.label());
      btn.classList.toggle("aktiv", b.id === aktiverBereich);
      btn.querySelector(".nav-punkt").hidden = !bereichAktiv(state, planet, b.id);
    },
  });

  for (const abschnitt of root.querySelectorAll(".bereich[data-bereich]")) {
    abschnitt.hidden = abschnitt.dataset.bereich !== aktiverBereich;
  }
}

// --- Imperiumsübersicht -------------------------------------------------
// Planeten × Ressourcen auf einen Blick. Wird nötig, sobald es mehr als
// zwei Planeten gibt: die Einzelansicht zeigt immer nur den aktiven, und
// "wo liegt eigentlich mein Iridium" ist damit nicht beantwortbar.
//
// Zeigt bewusst auch das Marktlager (gekauft, aber noch nicht abgeholt) --
// das wächst sonst unsichtbar an, weil es in keiner normalen Lagerzahl
// auftaucht.
function renderImperium(state, root) {
  const block = root.querySelector("#imperium-block");
  const planeten = planetenVon(state);
  const wirtschaft = wirtschaftsPlaneten(state);
  const res = LAGER_RESSOURCEN.filter((r) => r !== "credits");

  root.querySelector("#imperium-info").textContent = t("{anzahl} Stützpunkte · davon {wirtschaft} mit Wirtschaft", {
    anzahl: planeten.length,
    wirtschaft: wirtschaft.length,
  });

  // Summen über alle Planeten -- die eigentliche Frage ist meist "wie viel
  // habe ich INSGESAMT", nicht "wie viel liegt auf Planet 3".
  const summe = {};
  const summeRate = {};
  for (const p of wirtschaft) {
    const { lager } = effektiveRaten(state, p);
    for (const r of res) {
      summe[r] = (summe[r] || 0) + (p.ressourcen[r] || 0);
      summeRate[r] = (summeRate[r] || 0) + (lager[r] || 0);
    }
  }

  // PRINZIP 8a (A-004): Bis v0.82 entstand hier jede Sekunde eine komplette
  // <table> per innerHTML -- mitsamt den Planeten-Knöpfen darin. Wer einen
  // Planeten anklickte, traf mit mousedown und mouseup unterschiedliche
  // Elemente, sobald der Takt dazwischenfiel.
  //
  // Jetzt: Gerüst EINMAL, Zeilen über `listeAbgleichen`, Zahlen nachgezogen.
  // Das Gerüst hängt nur an Dingen, die sich fast nie ändern (Sprache,
  // Ressourcenliste) -- nicht an den Beständen.
  const geruest = `imperium:${sprache()}:${res.join(",")}`;
  if (block.dataset.geruest !== geruest) {
    block.dataset.geruest = geruest;
    block.innerHTML = `
      <table class="imperium-tabelle">
        <thead>
          <tr>
            <th>${t("Planet")}</th>
            <th>${t("Lager")}</th>
            ${res.map((r) => `<th title="${t(RESSOURCEN[r].name)}">${RESSOURCEN[r].symbol}</th>`).join("")}
            <th title="${t("Gekaufte Ware, die noch am Markt auf Abholung wartet")}">${t("Marktlager")}</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="zeile-summe">
            <td><strong>${t("Gesamt")}</strong></td>
            <td></td>
            ${res
              .map(
                (r) => `<td title="${t("{res} im ganzen Imperium", { res: t(RESSOURCEN[r].name) })}">
                  <strong data-summe="${r}"></strong>
                  <span class="imperium-rate" data-summe-rate="${r}"></span>
                </td>`
              )
              .join("")}
            <td></td>
          </tr>
        </tfoot>
      </table>
      <div class="dezent imperium-transfers" hidden></div>`;
  }

  const koerper = block.querySelector("tbody");

  // Eine Zeile bauen. Der Knopf bekommt sein Ereignis GENAU HIER, einmal --
  // Lernpunkt 1 aus PRINZIPIEN.md 8a: wer im Aktualisieren anhängt, hat nach
  // einer Minute sechzig Handler am selben Knopf.
  function zeileBauen(p) {
    const tr = document.createElement("tr");
    const nameZelle = document.createElement("td");
    const btn = document.createElement("button");
    btn.dataset.imperiumPlanet = p.id;
    btn.addEventListener("click", () => {
      state.aktiverPlanet = p.id;
      render(state, root);
    });
    const art = document.createElement("span");
    art.className = "dezent";
    art.dataset.zelle = "art";
    nameZelle.append(btn, document.createTextNode(" "), art);
    tr.appendChild(nameZelle);

    if (p.typ === "aussenposten") {
      const hinweis = document.createElement("td");
      hinweis.className = "dezent";
      hinweis.colSpan = res.length + 2;
      hinweis.textContent = t("Kein Lager, keine Produktion – zählt nur für die Reichweite.");
      tr.appendChild(hinweis);
      return tr;
    }

    const lagerZelle = document.createElement("td");
    lagerZelle.dataset.zelle = "lager";
    tr.appendChild(lagerZelle);
    for (const r of res) {
      const td = document.createElement("td");
      td.dataset.zelle = `res:${r}`;
      td.innerHTML = `<span data-menge></span><span class="imperium-rate" data-rate></span>`;
      tr.appendChild(td);
    }
    const marktZelle = document.createElement("td");
    marktZelle.dataset.zelle = "markt";
    tr.appendChild(marktZelle);
    return tr;
  }

  function zeileFuellen(tr, p) {
    tr.classList.toggle("zeile-aktiv", p.id === state.aktiverPlanet);
    textSetzen(tr.querySelector("button[data-imperium-planet]"), p.name);
    const art = tr.querySelector('[data-zelle="art"]');
    textSetzen(art, p.typ === "aussenposten" ? t("Außenposten") : planetArtText(p) === p.name ? "" : planetArtText(p));
    if (p.typ === "aussenposten") return;

    const { lager } = effektiveRaten(state, p);
    const belegt = lagerBelegung(p);
    const gesamt = lagerKapazitaetGesamt(state, p);
    const anteil = gesamt > 0 ? belegt / gesamt : 0;
    const voll = anteil >= 0.98;

    const lagerZelle = tr.querySelector('[data-zelle="lager"]');
    lagerZelle.classList.toggle("warnung", voll);
    textSetzen(lagerZelle, `${Math.round(anteil * 100)}%`);
    attributSetzen(
      lagerZelle,
      "title",
      voll
        ? t("{belegt} von {gesamt} m³ – VOLL, Produktion verfällt", { belegt: fmt(belegt), gesamt: fmt(gesamt) })
        : t("{belegt} von {gesamt} m³", { belegt: fmt(belegt), gesamt: fmt(gesamt) })
    );

    for (const r of res) {
      const td = tr.querySelector(`[data-zelle="res:${r}"]`);
      const menge = p.ressourcen[r] || 0;
      const rate = lager[r] || 0;
      const mengeEl = td.querySelector("[data-menge]");
      mengeEl.classList.toggle("dezent", !(menge > 0));
      textSetzen(mengeEl, formatKurz(menge));
      textSetzen(td.querySelector("[data-rate]"), rate > 0 ? `+${formatKurz(rate)}` : "");
      attributSetzen(
        td,
        "title",
        rate > 0
          ? t("{res}: {menge}, +{rate} im Jahr", {
              res: t(RESSOURCEN[r].name),
              menge: buendelText({ [r]: menge }),
              rate: fmt(rateProJahr(rate)),
            })
          : t("{res}: {menge}, keine Produktion", {
              res: t(RESSOURCEN[r].name),
              menge: buendelText({ [r]: menge }),
            })
      );
    }

    const marktware = Object.entries(p.marktlager || {}).filter(([, m]) => m > 0);
    const marktZelle = tr.querySelector('[data-zelle="markt"]');
    marktZelle.classList.toggle("warnung", marktware.length > 0);
    marktZelle.classList.toggle("dezent", marktware.length === 0);
    textSetzen(marktZelle, marktware.length ? buendelSymbole(Object.fromEntries(marktware)) : "–");
    attributSetzen(
      marktZelle,
      "title",
      marktware.length
        ? t("Wartet auf Abholung: {ware} – eine Flotte muss andocken und laden.", {
            ware: buendelText(Object.fromEntries(marktware)),
          })
        : t("Nichts wartet auf Abholung.")
    );
  }

  listeAbgleichen(koerper, planeten, {
    // Die Art steckt mit im Schlüssel: ein Außenposten hat eine ANDERE
    // Zellenstruktur (colspan statt Einzelspalten). Würde ein Planet je die
    // Art wechseln, muss seine Zeile neu gebaut werden statt nachgefüllt.
    schluessel: (p) => `${p.id}:${p.typ === "aussenposten" ? "a" : "p"}`,
    bauen: zeileBauen,
    aktualisieren: zeileFuellen,
  });

  for (const r of res) {
    textSetzen(block.querySelector(`[data-summe="${r}"]`), formatKurz(summe[r] || 0));
    textSetzen(
      block.querySelector(`[data-summe-rate="${r}"]`),
      summeRate[r] > 0 ? `+${formatKurz(summeRate[r])}` : ""
    );
  }

  const transferBox = block.querySelector(".imperium-transfers");
  transferBox.hidden = state.logistikTransfers.length === 0;
  if (state.logistikTransfers.length) {
    textSetzen(
      transferBox,
      t("Unterwegs: {liste}", {
        liste: state.logistikTransfers
          .map((transfer) => {
            const von = planetById(state, transfer.quellPlanet);
            const zu = planetById(state, transfer.zielPlanet);
            return `${buendelText({ [transfer.resId]: transfer.menge })} ${von ? von.name : "?"} → ${
              zu ? zu.name : "?"
            }`;
          })
          .join(" · "),
      })
    );
  }
}

// --- Statusspalte -------------------------------------------------------
// Zeigt laufende Vorgänge unabhängig davon, welcher Bereich gerade offen
// ist. Das ist der Ausgleich dafür, dass in der Mitte nur eines sichtbar ist.
function renderStatus(state, root, planet, jetzt) {
  const spalte = root.querySelector("#statusspalte");
  const rahmen = root.querySelector(".rahmen");
  const griff = root.querySelector("#statusspalte-griff");
  spalte.classList.toggle("eingeklappt", !statusOffen);
  rahmen.classList.toggle("status-zu", !statusOffen);
  griff.textContent = statusOffen ? "›" : "‹";
  if (!griff.dataset.verdrahtet) {
    griff.dataset.verdrahtet = "1";
    griff.addEventListener("click", () => {
      statusOffen = !statusOffen;
      render(state, root);
    });
  }
  if (!statusOffen) return; // eingeklappt: nichts zu zeichnen

  const block = root.querySelector("#status-block");
  const zeilen = [];
  const zeile = (text, zeit) =>
    `<div class="status-zeile"><span>${text}</span><span class="status-zeit">${zeit}</span></div>`;

  if (planet.bauQueue) {
    const q = planet.bauQueue;
    zeilen.push(zeile(`${t(BUILDINGS[q.gebaeudeId].name)} → ${q.zielLevel}`, fmtDauer((q.fertigZeit - jetzt) / 1000)));
  }
  if (state.forschungsQueue) {
    const q = state.forschungsQueue;
    zeilen.push(zeile(`${t(RESEARCH[q.forschungId].name)} → ${q.zielLevel}`, fmtDauer(forschungRestSekunden(state))));
  }
  if (planet.werftQueue) {
    const q = planet.werftQueue;
    zeilen.push(zeile(`${q.anzahl}× ${t(SCHIFFE[q.schiffId].name)}`, fmtDauer((q.fertigZeit - jetzt) / 1000)));
  }
  // Die Statusspalte listet, was gerade LÄUFT -- gemeint sind die eigenen
  // Aufträge, nicht die Bewegungen der halben Galaxie.
  //
  // Der Flottenname geht durch htmlText: die Zeilen landen unten per innerHTML
  // in der Spalte, und er ist der einzige Text hier, den der Spieler selbst
  // geschrieben hat.
  for (const flotte of flottenVon(state)) {
    if (flotte.gefecht) {
      zeilen.push(
        zeile(
          t("{flotte} im Gefecht", { flotte: htmlText(flotte.name) }),
          fmtDauer((flotte.gefecht.naechsteRundeZeit - jetzt) / 1000)
        )
      );
    } else if (flotte.abschnitt) {
      zeilen.push(
        zeile(
          t("{flotte} unterwegs", { flotte: htmlText(flotte.name) }),
          fmtDauer((flotte.abschnitt.ankunftZeit - jetzt) / 1000)
        )
      );
    }
  }
  for (const transfer of state.logistikTransfers) {
    const ziel = planetById(state, transfer.zielPlanet);
    zeilen.push(
      zeile(
        `${buendelText({ [transfer.resId]: transfer.menge })} → ${ziel ? ziel.name : "?"}`,
        fmtDauer((transfer.ankunftZeit - jetzt) / 1000)
      )
    );
  }

  block.innerHTML = zeilen.length
    ? zeilen.join("")
    : `<div class="status-zeile ruhig"><span>${t("Nichts läuft gerade.")}</span><span></span></div>`;
}

// Kompakte Liste wartender Aufträge unter dem eigentlichen Panel -- gleiche
// Darstellung für Gebäude, Forschung und Werft (identisches Datenmuster).
// PRINZIP 8a (A-004): Diese Liste entstand bis v0.82 jede Sekunde neu, samt
// ihrer ×-Knöpfe. Wer einen Auftrag aus der Schlange nehmen wollte, traf
// genau dann daneben, wenn zwischen mousedown und mouseup ein Takt lag.
//
// EINE FALLE STECKT HIER, DIE ES SONST NIRGENDS GIBT: die Einträge haben
// keine eigene Kennung, sie hängen am INDEX. Ein einmal angehängter Handler,
// der seinen Index bei der Erzeugung einfängt, entfernt nach der ersten
// Löschung den FALSCHEN Auftrag -- die Positionen rücken nach. Der Handler
// liest seinen Index deshalb erst beim Klick aus dem Element, und der Index
// wird beim Aktualisieren nachgezogen.
function renderWarteschlange(state, root, containerId, warteschlange, labelFn, entfernen, kontext = "") {
  const el = root.querySelector(containerId);
  if (!el) return;

  if (!warteschlange.length) {
    // Leerer Fall: Gerüst weg, damit die Überschrift nicht ohne Liste stehen
    // bleibt. Hier gibt es nichts anzuklicken, also ist das unkritisch.
    if (el.dataset.geruest) {
      el.innerHTML = "";
      delete el.dataset.geruest;
    }
    return;
  }

  const belegt = warteschlange.length + 1; // +1 für den laufenden Auftrag
  const gesamtSek = warteschlange.reduce((summe, e) => summe + (e.dauerSek || 0), 0);

  // `kontext` trägt die Planeten-Kennung: der Entfernen-Handler unten fängt
  // die `entfernen`-Funktion des Aufrufers ein, und die hängt an EINEM
  // Planeten. Ohne den Kontext im Schlüssel bliebe die Liste über einen
  // Planetenwechsel stehen und nähme Aufträge auf der falschen Welt heraus.
  const geruest = `warteschlange:${sprache()}:${kontext}`;
  if (el.dataset.geruest !== geruest) {
    el.dataset.geruest = geruest;
    el.innerHTML = `<div class="dezent warteschlange-titel"></div><ol class="warteschlange-liste"></ol>`;
  }

  const titel = el.querySelector(".warteschlange-titel");
  textSetzen(
    titel,
    t("Warteschlange ({belegt}/{max}) · noch {dauer}", {
      belegt,
      max: BAUWARTESCHLANGE_MAX,
      dauer: fmtDauer(gesamtSek),
    })
  );
  attributSetzen(
    titel,
    "title",
    t(
      "Diese Aufträge starten nacheinander, sobald der laufende fertig ist. Die Kosten sind bereits abgezogen – ein eingereihter Auftrag findet also garantiert statt. Zusammen noch {dauer} Bauzeit.",
      { dauer: fmtDauer(gesamtSek) }
    )
  );

  listeAbgleichen(
    el.querySelector(".warteschlange-liste"),
    warteschlange.map((eintrag, i) => ({ eintrag, i })),
    {
      schluessel: (x) => x.i,
      bauen: () => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.dataset.label = "";
        const btn = document.createElement("button");
        btn.textContent = "×";
        attributSetzen(
          btn,
          "title",
          t("Aus der Warteschlange nehmen. Die bereits abgezogenen Kosten werden erstattet.")
        );
        btn.addEventListener("click", () => {
          // NICHT der bei der Erzeugung eingefangene Index, sondern der
          // aktuelle -- siehe die Falle im Kopf dieser Funktion.
          entfernen(Number(li.dataset.position));
          render(state, root);
        });
        li.append(text, document.createTextNode(" "), btn);
        return li;
      },
      aktualisieren: (li, { eintrag, i }) => {
        li.dataset.position = i;
        textSetzen(li.querySelector("[data-label]"), labelFn(eintrag));
        attributSetzen(
          li,
          "title",
          t("Position {nr} · Bauzeit {dauer}", { nr: i + 1, dauer: fmtDauer(eintrag.dauerSek || 0) })
        );
      },
    }
  );
}

function renderAusbauListe(state, root, opts) {
  const liste = root.querySelector(opts.listenId);
  const sichtbareIds = Object.keys(opts.defs).filter((id) => !opts.sichtbar || opts.sichtbar(id));

  // Kacheln werden abgeglichen statt neu gebaut -- siehe listeAbgleichen.
  // Vorher stand hier `liste.innerHTML = ""`, und damit war jeder Ausbau-Knopf
  // im Sekundentakt ein anderes DOM-Element.
  const kachelAbgleich = (container, ids, startNach = null) =>
    listeAbgleichen(container, ids, {
      startNach,
      schluessel: (id) => id,
      bauen: (id) => kachelGeruest(state, root, opts, id),
      aktualisieren: (li, id) => kachelFuellen(state, root, opts, id, li),
    });

  // Baum-Darstellung: nach Tiefenstufe im Forschungsbaum in Spalten
  // gruppieren, danach die Verbindungslinien nachzeichnen. Die Kacheln
  // selbst sind exakt dieselben wie im Raster -- nur anders angeordnet.
  if (opts.baum) {
    const spalten = new Map();
    for (const id of sichtbareIds) {
      const stufe = techStufe(id);
      if (!spalten.has(stufe)) spalten.set(stufe, []);
      spalten.get(stufe).push(id);
    }
    const stufen = [...spalten.keys()].sort((a, b) => a - b);
    // Auch die Spalten werden abgeglichen: würden sie neu erzeugt, nähmen sie
    // die stabilen Kacheln mit ins Grab.
    listeAbgleichen(liste, stufen, {
      schluessel: (stufe) => `spalte-${stufe}`,
      bauen: (stufe) => {
        const spalte = document.createElement("div");
        spalte.className = "baum-spalte";
        spalte.innerHTML = `<div class="baum-stufe dezent"></div>`;
        return spalte;
      },
      aktualisieren: (spalte, stufe) => {
        const kopf = spalte.querySelector(".baum-stufe");
        textSetzen(kopf, t("Stufe {nr}", { nr: stufe }));
        kachelAbgleich(spalte, spalten.get(stufe), kopf);
      },
    });
    verbindungenZeichnen(liste, opts.defs);
    return;
  }

  // Gruppiert nach Thema (A-006). Dasselbe Muster wie die Baum-Spalten
  // darüber: die Gruppen werden abgeglichen, die Überschrift ist das
  // `startNach` ihrer Kacheln. Würden die Gruppen neu erzeugt, nähmen sie die
  // stabilen Kacheln mit ins Grab (Prinzip 8a).
  if (opts.gruppen) {
    const nachGruppe = new Map();
    for (const id of sichtbareIds) {
      const g = opts.defs[id].gruppe || "sonstige";
      if (!nachGruppe.has(g)) nachGruppe.set(g, []);
      nachGruppe.get(g).push(id);
    }
    // Nur Gruppen mit sichtbaren Kacheln -- eine leere Überschrift wäre ein
    // Versprechen ohne Inhalt.
    const sichtbareGruppen = opts.gruppen.filter((g) => nachGruppe.has(g.id));
    listeAbgleichen(liste, sichtbareGruppen, {
      schluessel: (g) => `gruppe-${g.id}`,
      bauen: () => {
        const kasten = document.createElement("div");
        kasten.className = "gebaeude-gruppe";
        const kopf = document.createElement("div");
        kopf.className = "gruppe-titel dezent";
        kasten.appendChild(kopf);
        return kasten;
      },
      aktualisieren: (kasten, g) => {
        const kopf = kasten.querySelector(".gruppe-titel");
        textSetzen(kopf, t(g.name));
        kachelAbgleich(kasten, nachGruppe.get(g.id), kopf);
      },
    });
    return;
  }

  kachelAbgleich(liste, sichtbareIds);
}

// Zeichnet die Voraussetzungs-Linien zwischen den Kacheln. Läuft NACH dem
// Einfügen ins DOM, weil erst dann Positionen bekannt sind. Die SVG-Ebene
// liegt hinter den Kacheln und nimmt keine Klicks an.
function verbindungenZeichnen(liste, defs) {
  const alt = liste.querySelector("svg.baum-linien");
  if (alt) alt.remove();

  const rahmen = liste.getBoundingClientRect();
  const punkte = new Map();
  for (const el of liste.querySelectorAll("[data-knoten]")) {
    const r = el.getBoundingClientRect();
    punkte.set(el.dataset.knoten, {
      links: { x: r.left - rahmen.left + liste.scrollLeft, y: r.top - rahmen.top + r.height / 2 },
      rechts: { x: r.right - rahmen.left + liste.scrollLeft, y: r.top - rahmen.top + r.height / 2 },
    });
  }

  const linien = [];
  for (const [id, def] of Object.entries(defs)) {
    const ziel = punkte.get(id);
    if (!ziel) continue;
    for (const vorId of Object.keys(def.voraussetzungen || {})) {
      const quelle = punkte.get(vorId);
      if (!quelle) continue;
      const mitte = (quelle.rechts.x + ziel.links.x) / 2;
      linien.push(
        `<path d="M ${quelle.rechts.x} ${quelle.rechts.y} C ${mitte} ${quelle.rechts.y}, ${mitte} ${ziel.links.y}, ${ziel.links.x} ${ziel.links.y}" />`
      );
    }
  }
  if (!linien.length) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "baum-linien");
  svg.setAttribute("width", liste.scrollWidth);
  svg.setAttribute("height", liste.scrollHeight);
  svg.innerHTML = linien.join("");
  liste.appendChild(svg);
}

// Füllt eine bestehende Kachel mit frischen Werten. Erzeugt NICHTS -- das
// Gerüst kommt aus kachelGeruest und bleibt über die ganze Lebensdauer der
// Liste dasselbe DOM-Element.
function kachelFuellen(state, root, opts, id, li) {
  {
    const def = opts.defs[id];
    // Gebäudekacheln beziehen sich immer auf den aktiven Planeten -- nur dort
    // gilt seine Affinität. Forschungskacheln kennen keinen Planeten.
    const planetFuerKachel = aktiverPlanet(state);
    const level = opts.levelVon(id);
    const ziel = opts.naechstesLevel(id);
    // Forschung hat seit v0.6 keine Kosten und keine feste Dauer mehr: sie
    // hat einen Aufwand, den die Labore des Imperiums abarbeiten. Wie lange
    // das dauert, hängt am aktuellen Fluss -- baut man ein Labor dazu, wird
    // die Zahl auf jeder Kachel kleiner. Genau das ist die Information, die
    // Prinzip 10a hier verlangt.
    const istForschung = opts.defs === RESEARCH;
    const kosten = istForschung
      ? {}
      : opts.defs === BUILDINGS
        ? gebaeudeKosten(planetFuerKachel, def, ziel)
        : kostenFuerLevel(def, ziel);
    const forschFluss = istForschung ? forschungsFluss(state) : 0;
    const aufwand = istForschung ? forschungsAufwand(def, ziel) : 0;
    const dauer = istForschung
      ? forschFluss > 0
        ? (aufwand / forschFluss) * 3600
        : Infinity
      : bauzeitFuerLevel(def, ziel);
    const check = opts.pruefen(id);
    const inQueue = opts.queue && opts.queue[opts.queueIdFeld] === id;

    // Energie-Delta der nächsten Stufe -- Gebäude sind die einzigen Defs mit
    // produktion/verbrauch, Forschung hat dieses Feld schlicht nicht.
    const zeigeEnergie = def.verbrauch?.energie || def.produktion?.energie;
    const energieDelta = zeigeEnergie
      ? (rate(def.produktion?.energie, ziel) - rate(def.produktion?.energie, level)) -
        (rate(def.verbrauch?.energie, ziel) - rate(def.verbrauch?.energie, level))
      : 0;

    // Was die nächste Stufe zusätzlich einbringt -- die eigentlich
    // interessante Zahl beim Ausbauen. Forschungsboni fließen mit ein, damit
    // die Anzeige der tatsächlichen Rate entspricht und nicht dem Rohwert.
    const bonus = def.kategorie ? kategorieBonus(state, def.kategorie) : 1;
    const produktionsDelta = {};
    for (const [resId, spec] of Object.entries(def.produktion || {})) {
      if (resId === "energie") continue; // wird separat als ⚡ gezeigt
      // Planetare Affinität gehört hier zwingend hinein: auf einer Vulkanwelt
      // bringt dieselbe Iridiummine fast das Doppelte. Stünde hier der
      // Rohwert, wäre die Zahl auf der Kachel schlicht falsch.
      const affin = opts.defs === BUILDINGS ? affinitaetFaktor(planetFuerKachel, resId) : 1;
      const mehr = (rate(spec, ziel) - rate(spec, level)) * bonus * affin;
      if (mehr > 0) produktionsDelta[resId] = Math.round(mehr);
    }
    const hatProduktion = Object.keys(produktionsDelta).length > 0;

    // Laufender Verbrauch GELAGERTER Ressourcen (Verarbeitungsketten, ab
    // v0.18). Ohne diese Zeile sähe man an der Kachel nur den Gewinn und
    // müsste den Preis raten -- genau die Lücke, die bei der Handelsspanne
    // schon einmal aufgefallen ist. Energie steht weiter separat als ⚡.
    const verbrauchsDelta = {};
    for (const [resId, spec] of Object.entries(def.verbrauch || {})) {
      if (resId === "energie") continue;
      const mehr = rate(spec, ziel) - rate(spec, level);
      if (mehr > 0) verbrauchsDelta[resId] = Math.round(mehr);
    }
    const hatVerbrauch = Object.keys(verbrauchsDelta).length > 0;

    // Gebäude, die eine eigene Speicherkapazität stellen (Wohnmodul, später
    // Batteriehalle), produzieren nichts -- ohne diese Zeile sähe ihre Kachel
    // aus, als brächte ein Ausbau gar nichts.
    const speicherRes = opts.defs === BUILDINGS ? speicherRessourceVon(id) : null;
    const speicherDelta = speicherRes
      ? speicherKapazitaetFuerLevel(speicherRes, ziel) - speicherKapazitaetFuerLevel(speicherRes, level)
      : 0;

    const fertig = def.schluessel && level >= 1;
    const vorOffen = opts.voraussetzungen && !opts.voraussetzungen(id);

    // Sichtbar bleibt nur, was man beim Überfliegen braucht: Symbol, Name,
    // Stufe, Kosten (als Symbole), Dauer, Aktion. Beschreibung, ausgeschriebene
    // Kosten, Energiebilanz und Voraussetzungen wandern in den Tooltip --
    // dadurch passen alle Kacheln in ein einheitliches Format.
    const energieText = zeigeEnergie
      ? t("Energie {vorzeichen}{menge} MW", {
          vorzeichen: energieDelta >= 0 ? "+" : "−",
          menge: fmt(Math.abs(Math.round(energieDelta))),
        })
      : "";
    const tooltip = [
      t(def.beschreibung),
      fertig
        ? t("Erforscht – schaltet gesperrte Objekte frei.")
        : istForschung
          ? t("Aufwand: {aufwand} FE · bei {fluss} FE/h aus allen Laboren: {dauer}", {
              aufwand: fmt(aufwand),
              fluss: fmt(forschFluss),
              dauer: fmtDauer(dauer),
            })
          : t("Nächste Stufe: {kosten} · {dauer}", { kosten: buendelText(kosten), dauer: fmtDauer(dauer) }),
      hatProduktion ? t("Bringt zusätzlich: {mehr}", { mehr: ratenBuendelText(produktionsDelta) }) : "",
      hatVerbrauch
        ? t("Verbraucht zusätzlich: {mehr} – fehlt der Nachschub, drosselt die Anlage anteilig", {
            mehr: ratenBuendelText(verbrauchsDelta),
          })
        : "",
      speicherDelta > 0
        ? t("Schafft Platz für {menge} {res} mehr", {
            // Einheit aus dem speicher-Eintrag, nicht aus def.einheit: beim
            // Energiespeicher sind das MWh (Arbeit) und nicht MW (Leistung).
            menge: `${fmt(speicherDelta)}${speicherEinheit(speicherRes) ? " " + speicherEinheit(speicherRes) : ""}`,
            res: t(RESSOURCEN[speicherRes].name),
          })
        : "",
      energieText,
      vorOffen ? t("Benötigt: {voraussetzungen}", { voraussetzungen: voraussetzungenText(id) }) : "",
      check.ok ? "" : check.grund,
    ]
      .filter(Boolean)
      .join("\n");

    // Ab hier wird die Kachel nur noch AKTUALISIERT. Das Gerüst samt beider
    // Knöpfe steht seit dem ersten Takt und wird nie ersetzt -- sonst
    // verschluckt genau diese Kachel Klicks (Prinzip 8a). Deshalb sind beide
    // Knöpfe immer da und werden versteckt, statt erzeugt und entfernt zu
    // werden.
    attributSetzen(li, "title", tooltip);
    textSetzen(li.querySelector(".kachel-symbol"), SYMBOLE[id] || "▪");
    textSetzen(li.querySelector(".kachel-name"), t(def.name));
    textSetzen(li.querySelector(".kachel-stufe"), def.schluessel ? (level >= 1 ? "✓" : "🔒") : String(level));

    // Die Mitte trägt keine Knöpfe -- sie darf am Stück neu geschrieben
    // werden, und das hält die Zahlen einfach.
    const mitte = fertig
      ? `<span class="dezent">${t("erforscht")}</span>`
      : `<span class="kachel-kosten">${istForschung ? `${RESSOURCEN.forschung.symbol} ${fmt(aufwand)} ${RESSOURCEN.forschung.einheit}` : buendelSymbole(kosten)}</span>
         <span class="kachel-dauer">${fmtDauer(dauer)}${energieText ? ` · ${energieDelta >= 0 ? "+" : "−"}${fmt(Math.abs(Math.round(energieDelta)))} MW` : ""}</span>
         ${hatProduktion ? `<span class="kachel-gewinn">+${ratenBuendelText(produktionsDelta, true)}</span>` : ""}
         ${hatVerbrauch ? `<span class="kachel-verbrauch">−${ratenBuendelText(verbrauchsDelta, true)}</span>` : ""}
         ${speicherDelta > 0 ? `<span class="kachel-gewinn">+${RESSOURCEN[speicherRes].symbol} ${fmt(speicherDelta)} ${speicherEinheit(speicherRes)}</span>` : ""}`;
    const mitteEl = li.querySelector(".kachel-mitte");
    if (mitteEl.innerHTML !== mitte) mitteEl.innerHTML = mitte;

    // Vorrang: nur an gebauten Gebäuden, die überhaupt etwas Knappes ziehen.
    // Eine Forschungskachel oder eine Mine auf Stufe 0 hat nichts zu regeln.
    //
    // Seit v0.8 regelt dieselbe Stufe Strom UND Arbeitskraft -- deshalb zählt
    // hier auch ein Gebäude, das nur Leute braucht, und die Beschriftung
    // nennt beides. Der Magnetfeldgenerator war der Anlass: er scheiterte an
    // fehlenden Leuten, während die Anzeige nur über Strom sprach.
    const stromZeile = li.querySelector(".kachel-strom");
    const ziehtEnergie = def.verbrauch?.energie;
    const ziehtLeute = def.verbrauch?.arbeitskraft;
    const regelbar = opts.defs === BUILDINGS && level > 0 && (ziehtEnergie || ziehtLeute);
    stromZeile.hidden = !regelbar;
    if (regelbar) {
      const stufe = stromPrioritaet(planetFuerKachel, id);
      const bedarfText = [
        ziehtEnergie ? t("{menge} MW", { menge: fmt(rate(def.verbrauch.energie, level)) }) : "",
        ziehtLeute ? t("{menge} AK", { menge: fmt(rate(def.verbrauch.arbeitskraft, level)) }) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      for (const knopf of stromZeile.querySelectorAll("button[data-strom]")) {
        const meine = Number(knopf.dataset.strom);
        knopf.classList.toggle("aktiv", meine === stufe);
        attributSetzen(
          knopf,
          "title",
          meine === STROM_STUFEN.vorrang
            ? t("Vorrang: bekommt Strom und Leute zuerst. Braucht {bedarf}.", { bedarf: bedarfText })
            : meine === STROM_STUFEN.nachrang
              ? t("Nachrang: bekommt nur, was übrig bleibt. Braucht {bedarf}.", { bedarf: bedarfText })
              : t("Normal: teilt sich Strom und Leute gleichmäßig. Braucht {bedarf}.", { bedarf: bedarfText })
        );
      }
    }

    const sperre = li.querySelector(".kachel-sperre");
    sperre.hidden = !vorOffen;
    if (vorOffen) textSetzen(sperre, `🔒 ${voraussetzungenText(id)}`);

    // Abfrage über das Datenattribut, nicht über die Darstellungsklasse:
    // ein Selektor ".status.im-bau" sieht für die Übersetzungsprüfung wie
    // deutscher Text aus ("Bau" steht in ihrer Wortliste), und ein Fehlalarm,
    // der jeden Lauf rot macht, ist teurer als ein sauberer Selektor.
    const queueZeile = li.querySelector("[data-queue-zeile]");
    queueZeile.hidden = !inQueue;
    li.classList.toggle("item-aktiv", !!inQueue);
    if (inQueue) {
      const rest = istForschung
        ? forschungRestSekunden(state)
        : (opts.queue.fertigZeit - spielzeitJetzt(state)) / 1000;
      textSetzen(queueZeile.querySelector("[data-queue-text]"), `→ ${opts.queue.zielLevel} · ${fmtDauer(rest)}`);
      attributSetzen(
        queueZeile.querySelector("button[data-abbrechen]"),
        "title",
        istForschung
          ? t("Abbrechen – der bisherige Fortschritt ist verloren, gezahlt wurde mit Strom und Arbeitszeit")
          : t("Abbrechen, Kosten erstattet")
      );
    }

    const aktion = li.querySelector("button.kachel-aktion");
    aktion.hidden = !!fertig;
    aktion.disabled = !check.ok;
    textSetzen(aktion, opts.aktionLabel());
    attributSetzen(aktion, "title", check.ok ? "" : check.grund);

    return li;
  }
}

// Das Gerüst einer Ausbau-Kachel. Wird EINMAL je Eintrag gebaut, danach nur
// noch gefüllt (siehe baueKachel). Beide Knöpfe sind von Anfang an da und
// werden versteckt statt erzeugt -- ein Knopf, der bei jedem Takt neu
// entsteht, verschluckt Klicks.
function kachelGeruest(state, root, opts, id) {
  const li = document.createElement("li");
  li.className = "gebaeude-item";
  if (opts.defs[id].schluessel) li.classList.add("item-schluessel");
  li.dataset.knoten = id; // Ankerpunkt für die Verbindungslinien im Baum.
  li.innerHTML = `
    <div class="kachel-kopf">
      <span class="kachel-symbol"></span>
      <span class="kachel-name"></span>
      <span class="kachel-stufe"></span>
    </div>
    <div class="kachel-mitte"></div>
    <div class="kachel-strom" hidden>
      <button data-strom="2" title="">▲</button>
      <button data-strom="1" title="">•</button>
      <button data-strom="0" title="">▼</button>
    </div>
    <div class="kachel-sperre" hidden></div>
    <div class="status im-bau" data-queue-zeile hidden><span data-queue-text></span> <button data-abbrechen="1">✕</button></div>
    <button class="kachel-aktion" ${opts.attribut}="${id}"></button>`;

  li.querySelector("button[data-abbrechen]").addEventListener("click", () => {
    opts.abbrechen();
    render(state, root);
  });
  li.querySelector("button.kachel-aktion").addEventListener("click", () => {
    opts.starten(id);
    render(state, root);
  });
  // Stromvorrang. Ereignisse EINMAL beim Bauen -- wie alles andere hier auch,
  // sonst verschluckt genau dieser Knopf im Notfall den Klick (Prinzip 8a).
  for (const knopf of li.querySelectorAll("button[data-strom]")) {
    knopf.addEventListener("click", () => {
      stromPrioritaetSetzen(aktiverPlanet(state), id, Number(knopf.dataset.strom));
      render(state, root);
    });
  }
  return li;
}

function renderGebaeude(state, root, planet) {
  if (planet.typ === "aussenposten") {
    root.querySelector("#gebaeude-liste").innerHTML = t(
      '<li class="dezent">Auf einem Außenposten lässt sich nicht bauen.</li>'
    );
    return;
  }
  renderAusbauListe(state, root, {
    listenId: "#gebaeude-liste", defs: BUILDINGS, gruppen: GEBAEUDE_GRUPPEN,
    levelVon: (id) => planet.gebaeude[id] || 0,
    naechstesLevel: (id) => naechstesGebaeudeLevel(planet, id),
    queue: planet.bauQueue, queueIdFeld: "gebaeudeId",
    pruefen: (id) => kannBauen(state, planet, id),
    starten: (id) => bauStarten(state, planet, id),
    abbrechen: () => bauAbbrechen(state, planet),
    // laufLabel gab es hier auch einmal -- es wurde nirgends gelesen und ist
    // beim Übersetzen aufgefallen, statt still weiter mitgeschleppt zu werden.
    attribut: "data-gebaeude", aktionLabel: () => t("Ausbauen"),
  });
  renderWarteschlange(
    state, root, "#gebaeude-warteschlange", planet.bauWarteschlange,
    (e) => t("{name} → Stufe {stufe}", { name: t(BUILDINGS[e.gebaeudeId].name), stufe: e.zielLevel }),
    (i) => bauWarteschlangeEntfernen(state, planet, i),
    String(planet.id)
  );
}

function renderForschung(state, root, planet) {
  // Der Forschungsfluss des Imperiums gehört in die Überschrift, nicht in
  // einen Tooltip: er ist die Zahl, an der ALLE Dauern auf dieser Seite
  // hängen, und die einzige, die der Spieler selbst beeinflussen kann.
  // Steht sie nirgends, sieht ein Imperium ohne Strom genauso aus wie eines
  // mit drei Laboren, nur mit größeren Zahlen (Prinzip 10a).
  const info = root.querySelector("#forschung-info");
  if (info) {
    const fluss = forschungsFluss(state);
    const labore = planetenVon(state).filter((p) => (p.gebaeude && p.gebaeude.forschungslabor) > 0).length;
    info.textContent = !labore
      ? t("kein Labor – niemand forscht")
      : fluss > 0
        ? labore === 1
          ? t("1 Labor · {fluss} FE/h", { fluss: fmt(fluss) })
          : t("{labore} Labore · {fluss} FE/h", { labore, fluss: fmt(fluss) })
        : labore === 1
          ? t("1 Labor, aber ohne Strom oder Menschen – es geht nichts voran")
          : t("{labore} Labore, aber ohne Strom oder Menschen – es geht nichts voran", { labore });
  }

  renderAusbauListe(state, root, {
    listenId: "#forschung-liste", defs: RESEARCH,
    levelVon: (id) => state.forschung[id] || 0,
    naechstesLevel: (id) => naechstesForschungLevel(state, id),
    queue: state.forschungsQueue, queueIdFeld: "forschungId",
    pruefen: (id) => kannForschen(state, planet, id),
    starten: (id) => forschungStarten(state, planet, id),
    abbrechen: () => forschungAbbrechen(state),
    attribut: "data-forschung", aktionLabel: () => t("Erforschen"),
    sichtbar: (id) => forschungVerfuegbar(state, id),
    voraussetzungen: (id) => forschungVoraussetzungenErfuellt(state, id),
    // Als Baum statt Flachliste: die Abhängigkeiten stecken schon in den
    // Daten (RESEARCH.voraussetzungen), hier werden sie nur sichtbar.
    baum: true,
  });
  renderWarteschlange(
    state, root, "#forschung-warteschlange", state.forschungsWarteschlange,
    (e) => t("{name} → Stufe {stufe}", { name: t(RESEARCH[e.forschungId].name), stufe: e.zielLevel }),
    (i) => forschungWarteschlangeEntfernen(state, i)
  );
}

// PRINZIP 8a (A-004): Die Werft war der dichteste Fall im Spiel -- ein
// "Abbrechen"-Knopf, der in derselben Zeile wie ein sekündlich laufender
// Countdown stand (Lernpunkt 2), und darunter je Schiffstyp zwei Knöpfe, die
// alle im Takt neu entstanden.
//
// Jetzt: der Abbrechen-Knopf steht fest und wird nur ein- und ausgeblendet,
// die Restzeit läuft in einem eigenen Feld daneben. Die Kacheln werden
// abgeglichen, ihre Knöpfe bekommen ihr Ereignis einmal beim Bauen.
function renderWerft(state, root, planet, jetzt) {
  const liste = root.querySelector("#werft-liste");
  const info = root.querySelector("#werft-info");

  // Die beiden Abbruchfälle leeren die Liste -- sonst blieben die Kacheln der
  // vorigen Welt stehen, wenn man auf einen Außenposten wechselt.
  const listeLeeren = () => {
    if (liste.firstChild) liste.innerHTML = "";
    delete info.dataset.geruest;
  };
  if (planet.typ === "aussenposten") { listeLeeren(); info.textContent = t("Außenposten haben keine Werft."); return; }
  if (werftTempo(planet) <= 0) { listeLeeren(); info.textContent = t("Ohne Werft lassen sich keine Schiffe bauen."); return; }

  // Werftstufe beschleunigt den Bau -- ohne Hinweis ist nicht erkennbar,
  // wofür ein Ausbau überhaupt gut wäre.
  const tempo = werftTempo(planet);
  info.title = t(
    "Werft Stufe {stufe} – baut {tempo}× so schnell wie eine Werft der Stufe 1. Jede weitere Stufe beschleunigt zusätzlich.",
    { stufe: planet.gebaeude.werft, tempo: tempo.toFixed(2) }
  );
  // Gerüst der Kopfzeile einmal: Text und Knopf sind getrennte Elemente,
  // damit die mitlaufende Restzeit den Knopf nicht jede Sekunde mitreißt.
  //
  // DIE PLANETEN-KENNUNG GEHÖRT IN DEN SCHLÜSSEL, und das ist kein Beiwerk:
  // der Handler unten fängt `planet` beim Bauen ein. Bliebe das Gerüst über
  // einen Planetenwechsel hinweg stehen, bräche der Knopf den Schiffbau auf
  // der zuvor gewählten Welt ab. Die neue Falle, die man sich beim Umstellen
  // auf 8a einhandelt: stehende Elemente halten auch alte Bezüge fest.
  const infoGeruest = `werft-info:${sprache()}:${planet.id}`;
  if (info.dataset.geruest !== infoGeruest) {
    info.dataset.geruest = infoGeruest;
    info.innerHTML = `<span data-werft-text></span> <button data-werft-abbrechen="1" hidden></button>`;
    const abbrechen = info.querySelector("button[data-werft-abbrechen]");
    abbrechen.textContent = t("Abbrechen");
    attributSetzen(
      abbrechen,
      "title",
      t("Bricht den laufenden Schiffbau ab. Die Kosten werden vollständig erstattet.")
    );
    abbrechen.addEventListener("click", () => {
      werftAbbrechen(state, planet);
      render(state, root);
    });
  }
  textSetzen(
    info.querySelector("[data-werft-text]"),
    planet.werftQueue
      ? t("Im Bau: {anzahl}× {schiff} ({dauer})", {
          anzahl: planet.werftQueue.anzahl,
          schiff: t(SCHIFFE[planet.werftQueue.schiffId].name),
          dauer: fmtDauer((planet.werftQueue.fertigZeit - jetzt) / 1000),
        })
      : t("Werft Stufe {stufe} · {tempo}× Bautempo", { stufe: planet.gebaeude.werft, tempo: tempo.toFixed(2) })
  );
  info.querySelector("button[data-werft-abbrechen]").hidden = !planet.werftQueue;

  listeAbgleichen(liste, Object.keys(SCHIFFE), {
    // Planeten-Kennung im Schlüssel, damit die Knopf-Handler beim Wechsel der
    // Welt neu entstehen -- sie fangen `planet` ein (siehe Kopfzeile oben).
    schluessel: (id) => `${planet.id}:${id}`,
    bauen: (id) => {
      const li = document.createElement("li");
      li.className = "gebaeude-item";
      li.innerHTML = `
        <div class="kachel-kopf">
          <span class="kachel-symbol">${SYMBOLE[id] || "▪"}</span>
          <span class="kachel-name"></span>
          <span class="kachel-stufe"></span>
        </div>
        <div class="kachel-mitte">
          <span class="kachel-kosten"></span>
          <span class="kachel-dauer"></span>
        </div>
        <div class="schiff-knoepfe">
          <button class="kachel-aktion" data-schiff="${id}" data-anzahl="1"></button>
          <button data-schiff="${id}" data-anzahl="5">5×</button>
        </div>`;
      // Ereignisse EINMAL, hier beim Bauen (Lernpunkt 1 aus PRINZIPIEN.md 8a).
      for (const btn of li.querySelectorAll("button[data-schiff]")) {
        btn.addEventListener("click", () => {
          schiffBauen(state, planet, btn.dataset.schiff, Number(btn.dataset.anzahl));
          render(state, root);
        });
      }
      return li;
    },
    aktualisieren: (li, id) => werftKachelFuellen(state, planet, li, id),
  });

  renderWarteschlange(
    state, root, "#werft-warteschlange", planet.werftWarteschlange,
    (e) => `${e.anzahl}× ${t(SCHIFFE[e.schiffId].name)}`, // reine Zahl plus Name, kein Satz
    (i) => werftWarteschlangeEntfernen(state, planet, i),
    String(planet.id)
  );
}

// Die veränderlichen Teile einer Schiffskachel. Getrennt von ihrem Gerüst,
// damit die beiden Knöpfe stehen bleiben (Prinzip 8a).
function werftKachelFuellen(state, planet, li, id) {
  {
    const def = SCHIFFE[id];
    const check = kannSchiffBauen(state, planet, id, 1);
    const fuenfCheck = kannSchiffBauen(state, planet, id, 5);
    li.classList.toggle("item-aktiv", !!(planet.werftQueue && planet.werftQueue.schiffId === id));
    textSetzen(li.querySelector(".kachel-name"), t(def.name));
    textSetzen(li.querySelector(".kachel-stufe"), String(planet.schiffe[id] || 0));
    textSetzen(li.querySelector(".kachel-kosten"), buendelSymbole(schiffKosten(planet, id)));
    textSetzen(
      li.querySelector(".kachel-dauer"),
      `${fmtDauer(schiffsBauzeitSek(planet, id, 1))} · ${def.verbrauchProStrecke}⚛️${
        def.kapazitaet ? ` · ${fmt(def.kapazitaet)}📦` : ""
      }`
    );

    const [einer, fuenfer] = li.querySelectorAll("button[data-schiff]");
    textSetzen(einer, t("Bauen"));
    einer.disabled = !check.ok;
    attributSetzen(einer, "title", check.ok ? "" : check.grund);
    fuenfer.disabled = !fuenfCheck.ok;
    attributSetzen(fuenfer, "title", fuenfCheck.ok ? t("5 Stück auf einmal") : fuenfCheck.grund);

    attributSetzen(li, "title", [
      t(def.beschreibung),
      t("Kosten: {kosten} · {dauer}", {
        kosten: buendelText(schiffKosten(planet, id)),
        dauer: fmtDauer(schiffsBauzeitSek(planet, id, 1)),
      }),
      def.kapazitaet
        ? t("{menge} Deuterium pro Strecke · Frachtraum {frachtraum}", {
            menge: def.verbrauchProStrecke,
            frachtraum: fmt(def.kapazitaet),
          })
        : t("{menge} Deuterium pro Strecke", { menge: def.verbrauchProStrecke }),
      def.hp ? t("{hp} HP · {angriff} Angriff", { hp: def.hp, angriff: def.angriff || 0 }) : "",
      check.ok ? "" : check.grund,
    ]
      .filter(Boolean)
      .join("\n"));
  }
}

// --- Markt ------------------------------------------------------------
// PRINZIP 8a (A-004): Der Markt baute je Ware zwei Knöpfe, und zwar jede
// Sekunde neu -- daneben stand der eigene Bestand, der sich laufend ändert
// (Lernpunkt 2). Wer verkaufen wollte, traf regelmäßig ins Leere.
//
// Jetzt: Gerüst einmal je Planet, Zeilen fest, Zahlen und Sperrgründe
// nachgezogen. Die Knöpfe bekommen ihr Ereignis einmal beim Bauen.
function renderMarkt(state, root, planet) {
  const box = root.querySelector("#markt-block");

  // Ein Hinweistext statt des Marktes. Räumt das Gerüst mit ab, sonst blieben
  // die Handelsknöpfe der vorigen Welt darunter stehen.
  const stattdessen = (text) => {
    if (box.dataset.hinweis !== text) {
      box.dataset.hinweis = text;
      delete box.dataset.geruest;
      box.innerHTML = `<div class="dezent"></div>`;
      box.firstChild.textContent = text;
    }
  };

  if (!handelVerfuegbar(planet)) {
    stattdessen(t("Kein Handelsposten auf {planet}.", { planet: planet.name }));
    return;
  }

  // MIT WEM gehandelt wird, ist seit v0.6 die wichtigste Angabe auf dieser
  // Seite: der Partner hat ein endliches Lager und eine endliche Kasse, und
  // beides begrenzt jeden Handel. Stünde es nicht da, wären die gesperrten
  // Knöpfe unerklärlich (Prinzip 10a).
  const partner = handelsPartner(state, planet);
  if (!partner) {
    stattdessen(
      t(
        "Kein Handelspartner in Reichweite. Der Markt braucht einen Gegenüber – ein fremdes Imperium mit eigenem Handelsposten, das eine Flotte von hier aus erreichen könnte."
      )
    );
    return;
  }
  const partnerFraktion = fraktionById(state, fraktionVon(partner.planet));
  const partnerZeile = t("Handel mit {partner} auf {planet} · Kasse dort {credits}", {
    partner: partnerFraktion ? partnerFraktion.name : t("Unbekannt"),
    planet: partner.planet.name,
    credits: mitEinheit("credits", partner.planet.ressourcen.credits || 0),
  });

  const marktware = Object.entries(planet.marktlager || {}).filter(([, m]) => m > 0);

  // Planeten-Kennung im Schlüssel: die Knopf-Handler unten fangen `planet`
  // ein, und ein stehengebliebenes Gerüst würde sonst nach einem Wechsel auf
  // der falschen Welt handeln.
  const geruest = `markt:${sprache()}:${planet.id}`;
  if (box.dataset.geruest !== geruest) {
    box.dataset.geruest = geruest;
    delete box.dataset.hinweis;
    box.innerHTML =
      `<div class="dezent" data-markt-credits></div><div class="dezent" data-markt-partner></div>` +
      Object.keys(MARKT_PREISE)
        .map(
          (resId) => `
        <div class="markt-zeile" data-res="${resId}">
          <span class="markt-name"></span>
          <span class="dezent" data-bestand></span>
          <span class="dezent" data-preise></span>
          <button data-verkaufen="${resId}" data-menge="${MARKT.los}"></button>
          <button data-kaufen="${resId}" data-menge="${MARKT.los}"></button>
        </div>`
        )
        .join("") +
      `<div class="voraussetzung-zeile" data-markt-abholung hidden></div>`;

    // Ereignisse EINMAL beim Bauen (Lernpunkt 1 aus PRINZIPIEN.md 8a).
    for (const btn of box.querySelectorAll("button[data-verkaufen]")) {
      btn.addEventListener("click", () => {
        verkaufen(state, planet, btn.dataset.verkaufen, Number(btn.dataset.menge));
        render(state, root);
      });
    }
    for (const btn of box.querySelectorAll("button[data-kaufen]")) {
      btn.addEventListener("click", () => {
        kaufen(state, planet, btn.dataset.kaufen, Number(btn.dataset.menge));
        render(state, root);
      });
    }
  }

  Object.keys(MARKT_PREISE)
    .forEach((resId) => {
      const preis = MARKT_PREISE[resId];
      const bestand = Math.floor(planet.ressourcen[resId] || 0);
      const los = MARKT.los;
      const verk = kannVerkaufen(state, planet, resId, los);
      const kau = kannKaufen(state, planet, resId, los);
      // Tooltip erklärt die Spanne -- warum Kauf teurer ist als Verkauf, ist
      // sonst nirgends sichtbar, und es ist der Grund, warum Handel kein
      // Gelddruck-Kreislauf ist.
      const spanne = Math.round(((preis.kauf - preis.verkauf) / preis.kauf) * 100);
      // Was der Klick tatsächlich kostet bzw. einbringt -- die Zahl, die man
      // für die Entscheidung braucht, gehört sichtbar an den Knopf und nicht
      // nur als Preis pro Stück daneben.
      const erloes = Math.floor(los * preis.verkauf);
      const preisFuer100 = Math.ceil(los * preis.kauf);
      const titel = [
        t("{res} – Bestand {menge} auf {planet}", {
          res: t(RESSOURCEN[resId].name),
          menge: fmt(bestand),
          planet: planet.name,
        }),
        t("Verkauf {verkauf} Credits/Stück · Kauf {kauf} Credits/Stück", {
          verkauf: preis.verkauf,
          kauf: preis.kauf,
        }),
        t("Handelsspanne {spanne}% – Kaufen und Verkaufen ergibt immer ein Minus", { spanne }),
        t("Gekaufte Ware wird nicht eingelagert: sie wartet am Markt, bis eine Flotte sie abholt."),
      ].join("\n");
      const zeile = box.querySelector(`.markt-zeile[data-res="${resId}"]`);
      attributSetzen(zeile, "title", titel);
      textSetzen(zeile.querySelector(".markt-name"), t(RESSOURCEN[resId].name));
      textSetzen(zeile.querySelector("[data-bestand]"), t("Bestand {menge}", { menge: mitEinheit(resId, bestand) }));
      textSetzen(
        zeile.querySelector("[data-preise]"),
        t("Verkauf {verkauf}/St. · Kauf {kauf}/St.", { verkauf: preis.verkauf, kauf: preis.kauf })
      );

      const verkKnopf = zeile.querySelector("button[data-verkaufen]");
      verkKnopf.disabled = !verk.ok;
      textSetzen(verkKnopf, t("Verkaufe {menge} → 🪙 {erloes}", { menge: formatKurz(los), erloes: fmt(erloes) }));
      attributSetzen(
        verkKnopf,
        "title",
        verk.ok
          ? t("{menge} {res} abgeben, {erloes} Credits erhalten", {
              menge: mitEinheit(resId, los),
              res: t(RESSOURCEN[resId].name),
              erloes: fmt(erloes),
            })
          : verk.grund
      );

      const kaufKnopf = zeile.querySelector("button[data-kaufen]");
      kaufKnopf.disabled = !kau.ok;
      textSetzen(kaufKnopf, t("Kaufe {menge} → 🪙 {preis}", { menge: formatKurz(los), preis: fmt(preisFuer100) }));
      attributSetzen(
        kaufKnopf,
        "title",
        kau.ok
          ? t("{preis} Credits zahlen, {menge} {res} warten dann am Markt auf Abholung", {
              preis: fmt(preisFuer100),
              menge: mitEinheit(resId, los),
              res: t(RESSOURCEN[resId].name),
            })
          : kau.grund
      );
    });

  textSetzen(
    box.querySelector("[data-markt-credits]"),
    t("Credits: {menge}", { menge: fmt(planet.ressourcen.credits || 0) })
  );
  textSetzen(box.querySelector("[data-markt-partner]"), partnerZeile);
  const abholung = box.querySelector("[data-markt-abholung]");
  abholung.hidden = marktware.length === 0;
  if (marktware.length) {
    textSetzen(
      abholung,
      t("Wartet auf Abholung: {ware} – eine Flotte muss andocken und laden.", {
        ware: buendelText(Object.fromEntries(marktware)),
      })
    );
  }
}

// --- Verarbeitung -----------------------------------------------------
// Zeigt je Eingangsstoff, was verbraucht wird, ob die Anlagen gerade drosseln,
// und lässt die Reserve einstellen (bis wohin eine Kette den Bestand abbauen
// darf). Dieselbe Rolle wie modus:'ueberschuss' bei den Routen.
function renderVerarbeitung(state, root, planet) {
  const box = root.querySelector("#verarbeitung-block");

  // Gerüst EINMAL, danach nur noch abgleichen (Prinzip 8a).
  //
  // Vorher stand hier `box.innerHTML = …` in jedem Takt -- damit war das
  // Reserve-Feld jede Sekunde ein NEUES Element, und der Wert stand obendrein
  // als value="…" im erzeugten Markup. Fokus und Tippstand waren nach
  // spätestens einer Sekunde weg; eine mehrstellige Zahl ließ sich hier gar
  // nicht eintragen. Derselbe Fehler wie damals beim "Regler springt auf 0",
  // nur an einem Zahlenfeld statt an einem Schieber.
  if (!box.dataset.gebaut) {
    box.dataset.gebaut = "1";
    box.innerHTML = `
      <div class="dezent" data-hinweis></div>
      <div data-reserve-liste></div>`;
  }
  const hinweis = box.querySelector("[data-hinweis]");
  const liste = box.querySelector("[data-reserve-liste]");

  const aussenposten = planet.typ === "aussenposten";
  // Welche Anlagen auf diesem Planeten verbrauchen überhaupt gelagerte Stoffe?
  // Nennbedarf, nicht der gedrosselte Wert -- sonst verschwände eine auf 0
  // gedrosselte Kette einfach aus der Liste.
  const raten = aussenposten ? null : effektiveRaten(state, planet);
  const eingaenge = raten ? LAGER_RESSOURCEN.filter((resId) => (raten.bedarf[resId] || 0) > 0) : [];

  textSetzen(
    hinweis,
    aussenposten
      ? t("Außenposten haben keine Produktion.")
      : eingaenge.length === 0
        ? t(
            "Auf diesem Planeten verarbeitet noch keine Anlage gelagerte Rohstoffe. Anlagen, die das tun, zeigen ihren Bedarf auf der Gebäudekachel."
          )
        : t(
            "Reicht der Zustrom nicht, nehmen Anlagen den Rest aus dem Lager – bis zur eingestellten Reserve. Danach drosseln sie anteilig, statt den Bestand aufzubrauchen."
          )
  );

  listeAbgleichen(liste, eingaenge, {
    schluessel: (resId) => resId,
    bauen: (resId) => {
      const zeile = document.createElement("div");
      zeile.className = "markt-zeile";
      zeile.innerHTML = `
        <span class="markt-name"></span>
        <span class="dezent" data-lage></span>
        <input type="number" min="0" step="100" data-reserve="${resId}" />
        <button data-reserve-setzen></button>
        <button data-reserve-loeschen hidden></button>`;

      const feld = zeile.querySelector("input[data-reserve]");
      // Ereignisse EINMAL beim Bauen. Der Planet wird dabei bewusst NICHT
      // festgehalten: die Zeile überlebt einen Planetenwechsel (ihr Schlüssel
      // ist die Ressource), und wer hier klickt, meint immer den gerade
      // gewählten Planeten -- nicht den, der beim Bauen offen war.
      const uebernehmen = () => {
        const ziel = aktiverPlanet(state);
        verarbeitungsReserveSetzen(ziel, resId, Number(feld.value) || 0);
        // Bestätigt ist bestätigt: ab jetzt folgt das Feld wieder dem
        // Spielstand, nicht dem Zwischenspeicher.
        delete feldEingabe[feldSchluessel("reserve", ziel, resId)];
        render(state, root);
      };
      feld.addEventListener("input", () => {
        feldEingabe[feldSchluessel("reserve", aktiverPlanet(state), resId)] = feld.value;
      });
      // Enter ist bei einem Zahlenfeld der erwartete Weg -- ohne ihn müsste man
      // für jede Eingabe zur Maus greifen (gleiche Überlegung wie beim
      // Flottennamen).
      feld.addEventListener("keydown", (ereignis) => {
        if (ereignis.key === "Enter") uebernehmen();
      });
      zeile.querySelector("[data-reserve-setzen]").addEventListener("click", uebernehmen);
      zeile.querySelector("[data-reserve-loeschen]").addEventListener("click", () => {
        const ziel = aktiverPlanet(state);
        verarbeitungsReserveSetzen(ziel, resId, null);
        delete feldEingabe[feldSchluessel("reserve", ziel, resId)];
        render(state, root);
      });
      return zeile;
    },
    aktualisieren: (zeile, resId) => {
      const braucht = raten.bedarf[resId] || 0;
      const zustrom = raten.produktion[resId] || 0;
      const netto = raten.lager[resId] || 0;
      const bestand = Math.floor(planet.ressourcen[resId] || 0);
      const reserve = verarbeitungsReserveFuer(planet, resId);
      const anteil = raten.drosselung[resId] === undefined ? 1 : raten.drosselung[resId];
      const gedrosselt = anteil < 1;
      const zieht = netto < 0;

      let lage = t("{braucht} Bedarf · {zustrom} Zustrom, je Jahr", {
        braucht: fmt(rateProJahr(braucht)),
        zustrom: fmt(rateProJahr(zustrom)),
      });
      if (gedrosselt) {
        lage += t(" – gedrosselt auf {anteil}%", { anteil: Math.round(anteil * 100) });
      } else if (zieht) {
        const stunden = (bestand - reserve) / -netto;
        lage += t(" – Bestand trägt noch {dauer}", { dauer: fmtDauer(Math.max(0, stunden) * 3600) });
      }

      textSetzen(
        zeile.querySelector(".markt-name"),
        `${RESSOURCEN[resId].symbol || ""} ${t(RESSOURCEN[resId].name)}`
      );
      const lageEl = zeile.querySelector("[data-lage]");
      textSetzen(lageEl, lage);
      lageEl.classList.toggle("warnung", gedrosselt);

      const feld = zeile.querySelector("input[data-reserve]");
      // Beschriftungen laufen durch t() und müssen beim Sprachwechsel
      // mitkommen -- deshalb hier und nicht einmalig beim Bauen.
      attributSetzen(feld, "placeholder", t("keine Reserve"));
      attributSetzen(
        feld,
        "title",
        t("Bis zu diesem Bestand darf die Verarbeitung aus dem Lager ziehen. Darunter läuft sie nur noch mit dem, was nachkommt.")
      );
      feldWertSetzen(feld, feldSchluessel("reserve", planet, resId), reserve ? String(reserve) : "");

      textSetzen(zeile.querySelector("[data-reserve-setzen]"), t("Setzen"));
      const loeschen = zeile.querySelector("[data-reserve-loeschen]");
      textSetzen(loeschen, t("Entfernen"));
      // Verstecken statt weglassen: ein Knopf, der je nach Zustand aus dem DOM
      // verschwindet und wiederkommt, ist wieder ein neues Element.
      loeschen.hidden = reserve <= 0;
    },
  });
}

// --- Logistiknetz -----------------------------------------------------
function renderLogistiknetz(state, root, planet, jetzt) {
  const box = root.querySelector("#logistiknetz-block");

  // Gerüst EINMAL -- gleiche Begründung wie bei der Verarbeitung: das
  // Mindestbestand-Feld wurde bis hierher jede Sekunde mitsamt seinem
  // value="…" neu erzeugt und war damit unbedienbar.
  if (!box.dataset.gebaut) {
    box.dataset.gebaut = "1";
    box.innerHTML = `
      <div class="dezent" data-hinweis></div>
      <div data-mindest-liste></div>
      <div class="voraussetzung-zeile" data-transfers hidden></div>`;
  }
  const hinweis = box.querySelector("[data-hinweis]");
  const liste = box.querySelector("[data-mindest-liste]");
  const transferBox = box.querySelector("[data-transfers]");

  const gesperrt = !logistiknetzFreigeschaltet(state);
  const aussenposten = planet.typ === "aussenposten";
  const ressourcen = gesperrt || aussenposten ? [] : LAGER_RESSOURCEN.filter((r) => r !== "credits");

  textSetzen(
    hinweis,
    gesperrt
      ? t("Logistiknetzwerk noch nicht erforscht.")
      : aussenposten
        ? t("Außenposten haben kein Lager, das sich beteiligen könnte.")
        : t(
            "Fällt ein Bestand unter den Mindestwert, füllt der nächstbeste eigene Planet automatisch auf – mit Verzögerung wie bei einer schnellen Flotte."
          )
  );

  listeAbgleichen(liste, ressourcen, {
    schluessel: (resId) => resId,
    bauen: (resId) => {
      const zeile = document.createElement("div");
      zeile.className = "markt-zeile";
      zeile.innerHTML = `
        <span class="markt-name"></span>
        <span class="dezent" data-lage></span>
        <input type="number" min="0" step="100" data-mindest="${resId}" />
        <button data-mindest-setzen></button>
        <button data-mindest-loeschen hidden></button>`;

      const feld = zeile.querySelector("input[data-mindest]");
      // Ereignisse EINMAL beim Bauen, und immer auf den GERADE gewählten
      // Planeten -- die Zeile überlebt den Planetenwechsel.
      const uebernehmen = () => {
        const ziel = aktiverPlanet(state);
        logistikMindestbestandSetzen(ziel, resId, Number(feld.value) || 0);
        delete feldEingabe[feldSchluessel("mindest", ziel, resId)];
        render(state, root);
      };
      feld.addEventListener("input", () => {
        feldEingabe[feldSchluessel("mindest", aktiverPlanet(state), resId)] = feld.value;
      });
      feld.addEventListener("keydown", (ereignis) => {
        if (ereignis.key === "Enter") uebernehmen();
      });
      zeile.querySelector("[data-mindest-setzen]").addEventListener("click", uebernehmen);
      zeile.querySelector("[data-mindest-loeschen]").addEventListener("click", () => {
        const ziel = aktiverPlanet(state);
        logistikMindestbestandSetzen(ziel, resId, null);
        delete feldEingabe[feldSchluessel("mindest", ziel, resId)];
        render(state, root);
      });
      return zeile;
    },
    aktualisieren: (zeile, resId) => {
      const wert = planet.logistikMindestbestand[resId];
      const bestand = Math.floor(planet.ressourcen[resId] || 0);
      const knapp = wert !== undefined && bestand < wert;

      textSetzen(zeile.querySelector(".markt-name"), t(RESSOURCEN[resId].name));
      const lageEl = zeile.querySelector("[data-lage]");
      textSetzen(lageEl, t("Bestand {menge}", { menge: fmt(bestand) }));
      lageEl.classList.toggle("warnung", knapp);

      const feld = zeile.querySelector("input[data-mindest]");
      attributSetzen(feld, "placeholder", t("kein Mindestbestand"));
      feldWertSetzen(feld, feldSchluessel("mindest", planet, resId), wert ? String(wert) : "");

      textSetzen(zeile.querySelector("[data-mindest-setzen]"), t("Setzen"));
      const loeschen = zeile.querySelector("[data-mindest-loeschen]");
      textSetzen(loeschen, t("Entfernen"));
      loeschen.hidden = wert === undefined;
    },
  });

  const transfersHier =
    gesperrt || aussenposten
      ? []
      : state.logistikTransfers.filter(
          (transfer) => transfer.zielPlanet === planet.id || transfer.quellPlanet === planet.id
        );
  const transferZeilen = transfersHier
    .map((transfer) => {
      const von = planetById(state, transfer.quellPlanet);
      const zu = planetById(state, transfer.zielPlanet);
      const zeile = t("{richtung}: {fracht} · {von} → {zu} · Ankunft: {dauer}", {
        richtung: transfer.zielPlanet === planet.id ? t("eingehend") : t("ausgehend"),
        fracht: buendelText({ [transfer.resId]: transfer.menge }),
        von: von ? von.name : "?",
        zu: zu ? zu.name : "?",
        dauer: fmtDauer((transfer.ankunftZeit - jetzt) / 1000),
      });
      return `<div class="dezent">${zeile}</div>`;
    })
    .join("");
  // Reiner Anzeigetext ohne Bedienelemente -- hier darf innerHTML bleiben.
  if (transferBox.innerHTML !== transferZeilen) transferBox.innerHTML = transferZeilen;
  transferBox.hidden = transferZeilen === "";
}

// --- Flotten --------------------------------------------------------------
function renderFlotten(state, root, planet, jetzt) {
  const block = root.querySelector("#flotten-block");

  // Gerüst einmal. Vorher stand hier `block.innerHTML = ""`, und damit war
  // AUCH der "Neue Flotte"-Knopf im Sekundentakt ein neues Element.
  if (!block.dataset.gebaut) {
    block.dataset.gebaut = "1";
    block.innerHTML = `
      <button data-neue-flotte></button>
      <div class="dezent" data-flotten-leer hidden></div>
      <ul class="system-liste" data-flotten-liste></ul>
      <div data-flotten-detail></div>
      <div data-routen-detail></div>`;
    block.querySelector("[data-neue-flotte]").addEventListener("click", () => {
      const flotte = flotteAufstellen(state, aktiverPlanet(state));
      state.aktiveFlotte = flotte.id;
      render(state, root);
    });
  }

  const neu = block.querySelector("[data-neue-flotte]");
  textSetzen(neu, t("Neue Flotte bei {planet}", { planet: planet.name }));
  neu.disabled = planet.typ === "aussenposten";
  attributSetzen(
    neu,
    "title",
    neu.disabled
      ? t("Außenposten haben keinen Hafen – wähle oben einen Planeten mit Wirtschaft.")
      : t("Stellt eine leere Flotte bei {planet} auf. Schiffe und Treibstoff lädst du danach im Hafen zu.", {
          planet: planet.name,
        })
  );

  // NUR DIE EIGENEN. `state.flotten` hält seit den Fraktionen ALLE Flotten der
  // Galaxie -- auch die von Piraten und fremden Imperien. Diese Liste ist die
  // Befehlsliste des Spielers, hier gehören nur seine eigenen hin.
  // (Bis v0.39 stand hier `state.flotten`, wodurch nach dem Weltstart über
  // hundert fremde Flotten in der eigenen Flottenübersicht auftauchten.)
  // Fremde Flotten SICHTBAR zu machen ist eine andere, eigene Aufgabe: im All
  // gibt es keine Tarnung, man sollte sehen, wer im eigenen System steht --
  // aber am Ort, nicht in der eigenen Befehlsliste.
  const eigene = flottenVon(state);
  const leerHinweis = block.querySelector("[data-flotten-leer]");
  const liste = block.querySelector("[data-flotten-liste]");
  const detailBox = block.querySelector("[data-flotten-detail]");
  const routenBox = block.querySelector("[data-routen-detail]");

  leerHinweis.hidden = eigene.length > 0;
  textSetzen(leerHinweis, t("Noch keine Flotte aufgestellt."));

  listeAbgleichen(liste, eigene, {
    schluessel: (flotte) => flotte.id,
    bauen: (flotte) => {
      const li = document.createElement("li");
      li.className = "flotte-zeile";
      li.innerHTML = `
        <span class="slot-name">
          <span class="slot-bezeichnung"></span>
          <span class="dezent" data-flotte-fracht></span>
          <span class="dezent" data-flotte-status></span>
        </span>
        <span class="slot-aktionen">
          <button data-flotte-heim="${flotte.id}"></button>
        </span>`;
      // Die ganze Kachel wählt die Flotte -- Tobis Ansage: "Flotten brauchen
      // keinen wählen Button. Man klickt einfach auf die Flotten Kachel."
      // Der Knopf ist damit weg statt versteckt; ein Bedienelement, das
      // dasselbe tut wie sein Container, ist einer zu viel.
      //
      // Der Klick auf "Umkehren" darf dabei NICHT durchschlagen: er hat seine
      // eigene Bedeutung. Deshalb steigt der Handler bei einem Knopf aus,
      // statt sich auf die Reihenfolge der Ereignisse zu verlassen.
      li.classList.add("waehlbar");
      li.addEventListener("click", (ereignis) => {
        if (ereignis.target.closest("button")) return;
        state.aktiveFlotte = flotte.id;
        render(state, root);
      });
      li.querySelector("button[data-flotte-heim]").addEventListener("click", () => {
        heimkehrBefehlen(state, flotteById(state, flotte.id));
        render(state, root);
      });
      return li;
    },
    aktualisieren: (li, flotte) => flottenZeileFuellen(state, li, flotte, jetzt),
  });

  const aktive = flotteById(state, state.aktiveFlotte);
  detailAustauschen(detailBox, aktive ? flottenDetail(state, root, aktive) : null);
  detailAustauschen(routenBox, aktive ? routenDetail(state, root, aktive) : null);
  // Bleibt der Bereich stehen (der Normalfall), muss trotzdem jemand die
  // Zahlen nachziehen -- sonst friert die Anzeige ein, während das Spiel
  // weiterläuft. Genau dieser Tausch ist der Sinn der Umstellung: Struktur
  // bleibt, Zahlen laufen.
  if (aktive && aktive.dockPlanet) {
    flottenDetailZahlen(state, detailBox, aktive, planetById(state, aktive.dockPlanet));
  }
}

// Tauscht den Inhalt eines Detailbereichs -- aber nur, wenn er sich WIRKLICH
// geändert hat.
//
// Die Detailpanels tragen Regler, und ein Regler, der beim Ziehen ersetzt
// wird, verliert den Griff des Betriebssystems (Tobis Meldung, dritte Stelle
// desselben Fehlers). Der Vergleich hilft genau dort: die Reglerstellung
// liegt in reglerPosition, also im erzeugten HTML -- solange niemand etwas
// ändert, ist die Zeichenkette identisch und das DOM bleibt stehen.
function detailAustauschen(container, neuerInhalt) {
  if (!neuerInhalt) {
    if (container.firstChild) container.innerHTML = "";
    container.dataset.stand = "";
    return;
  }
  // Verglichen wird das GERÜST, nicht der gefüllte Stand -- siehe die
  // Begründung in flottenDetail. Bereiche ohne Live-Zahlen haben kein
  // eigenes Gerüst und werden schlicht an ihrem Inhalt gemessen.
  const stand = neuerInhalt.dataset.geruest ?? neuerInhalt.innerHTML;
  if (container.dataset.stand === stand) return;
  container.dataset.stand = stand;
  container.innerHTML = "";
  container.appendChild(neuerInhalt);
}

function flottenZeileFuellen(state, li, flotte, jetzt) {
  {
    const aktiv = state.aktiveFlotte === flotte.id;
    const pos = flottePosition(state, flotte, jetzt);
    li.classList.toggle("system-aktiv", aktiv);

    const schiffsText =
      Object.entries(flotte.schiffe)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => `${n}× ${t(SCHIFFE[id].name)}`)
        .join(", ") || t("leer");
    const ankunft = flotte.abschnitt
      ? t(" · Ankunft: {dauer}", { dauer: fmtDauer((flotte.abschnitt.ankunftZeit - jetzt) / 1000) })
      : "";

    // Genaues im Tooltip: Kampfwerte, Frachtauslastung, Position, Route --
    // Zahlen, die man selten braucht, aber dann exakt. Gleiches Muster wie
    // bei den Bau-/Forschungskacheln.
    const staerke = schiffeStaerke(flotte.schiffe);
    const kapazitaet = flotteKapazitaet(state, flotte);
    const heimathafen = (planetById(state, flotte.heimatPlanet) || {}).name || "?";
    const titel = [
      flotte.heimatPlanet
        ? t("{flotte} · Heimathafen: {hafen}", { flotte: flotte.name, hafen: heimathafen })
        : flotte.name,
      schiffeGesamt(flotte) === 0 ? t("Keine Schiffe an Bord") : schiffsText,
      staerke.hp > 0
        ? t("{hp} HP · {angriff} Angriff", { hp: Math.round(staerke.hp), angriff: Math.round(staerke.angriff) })
        : "",
      ladungGesamt(flotte)
        ? t("Fracht {menge} / {kapazitaet} ({ladung})", {
            menge: fmt(ladungGesamt(flotte)),
            kapazitaet: fmt(kapazitaet),
            ladung: buendelText(flotte.ladung),
          })
        : t("Fracht {menge} / {kapazitaet}", { menge: fmt(ladungGesamt(flotte)), kapazitaet: fmt(kapazitaet) }),
      t("Deuterium {menge} an Bord", { menge: fmt(flotte.treibstoff) }),
      pos.systemId
        ? pos.orbit
          ? t("Position: {system} Orbit {orbit}", { system: systemName(state.galaxie.seed, pos.systemId), orbit: pos.orbit })
          : t("Position: {system}", { system: systemName(state.galaxie.seed, pos.systemId) })
        : t("Position: zwischen den Systemen ({x} / {y})", { x: pos.x.toFixed(1), y: pos.y.toFixed(1) }),
      flotte.route && flotte.route.aktiv
        ? t("Route aktiv: {halte} Halt(e), gerade Halt {nr}", {
            halte: flotte.route.halte.length,
            nr: flotte.route.index + 1,
          })
        : "",
      flotte.gefecht ? t("Im Gefecht – nicht umleitbar") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const bezeichnung = li.querySelector(".slot-bezeichnung");
    // htmlText: neben dem Namen stehen echte Auszeichnungen (die Marken für
    // "aktiv" und "Route"), die Zeile geht also per innerHTML hinein.
    const bezeichnungHtml = `${htmlText(flotte.name)} ${aktiv ? `<span class="basis-tag">${t("aktiv")}</span>` : ""}${flotte.route && flotte.route.aktiv ? `<span class="basis-tag route-tag">🔁 ${t("Route")}</span>` : ""}`;
    if (bezeichnung.innerHTML !== bezeichnungHtml) bezeichnung.innerHTML = bezeichnungHtml;

    textSetzen(
      li.querySelector("[data-flotte-fracht]"),
      `${schiffsText} · ${
        ladungGesamt(flotte)
          ? t("Deuterium {menge} · Ladung {ladung}", {
              menge: fmt(flotte.treibstoff),
              ladung: buendelText(flotte.ladung),
            })
          : t("Deuterium {menge}", { menge: fmt(flotte.treibstoff) })
      }`
    );
    textSetzen(
      li.querySelector("[data-flotte-status]"),
      `${flotteStatusText(state, flotte)}${ankunft}${pos.systemId ? "" : t(" · zwischen den Systemen")}`
    );

    attributSetzen(
      li,
      "title",
      titel +
        "\n" +
        (aktiv
          ? t("Diese Flotte bekommt gerade die Befehle.")
          : t("Anklicken wählt diese Flotte – Befehle gehen danach an sie."))
    );

    const heim = li.querySelector("button[data-flotte-heim]");
    heim.disabled = !!(flotte.dockPlanet || flotte.gefecht);
    textSetzen(heim, t("Umkehren"));
    attributSetzen(
      heim,
      "title",
      flotte.gefecht
        ? t("Während eines Gefechts nicht umleitbar – nur die Rückzugsschwelle greift.")
        : flotte.dockPlanet
          ? t("Die Flotte liegt bereits im Hafen.")
          : t("Bricht den Auftrag ab und fliegt zum Heimathafen zurück.")
    );
  }
}

function schadenAnteilAnzeige(flotte, typ) {
  const anzahl = flotte.schiffe[typ] || 0;
  const maxHp = anzahl * (SCHIFFE[typ] ? SCHIFFE[typ].hp : 0);
  if (maxHp <= 0) return 0;
  return Math.min(1, ((flotte.schiffSchaden || {})[typ] || 0) / maxHp);
}

// Füllt die Live-Zahlen des Flottendetails. Wird sowohl beim Aufbau als auch
// bei jedem Takt gerufen -- deshalb fasst sie ausschließlich Textknoten an
// und niemals Struktur.
function flottenDetailZahlen(state, box, flotte, hafen) {
  if (!hafen) return;

  // Reglerstellungen werden HIER gesetzt, nicht im Gerüst.
  //
  // Stünden sie als value="…" im erzeugten HTML, änderte sich das Gerüst bei
  // JEDER Zieh-Bewegung -- der Bereich würde mitten im Ziehen ausgetauscht,
  // und genau das ist Tobis Beobachtung ("die Regler werden automatisch
  // losgelassen"). Der Zustand liegt in reglerPosition, also außerhalb des
  // Spielstands, und wird von hier aus nachgeführt.
  //
  // Das `!== document.activeElement` ist der Schutz davor, dem Spieler
  // während des Ziehens in die Hand zu greifen: wer den Regler gerade
  // anfasst, bestimmt seinen Wert, nicht wir.
  for (const regler of box.querySelectorAll("input[type=range][data-tanken-schieber], input[type=range][data-laden-schieber]")) {
    if (regler === document.activeElement) continue;
    const schluessel = regler.dataset.ladenSchieber
      ? `laden:${flotte.id}:${regler.dataset.ladenSchieber}`
      : `tanken:${flotte.id}`;
    const soll = String(reglerWert(schluessel));
    if (regler.value !== soll) regler.value = soll;
  }

  for (const id of Object.keys(SCHIFFE)) {
    textSetzen(box.querySelector(`[data-schiff-anBord="${id}"]`), String(flotte.schiffe[id] || 0));
    textSetzen(
      box.querySelector(`[data-schiff-frei="${id}"]`),
      t("({anzahl} frei)", { anzahl: hafen.schiffe[id] || 0 })
    );
  }
  textSetzen(
    box.querySelector("[data-tritium-lage]"),
    t("Deuterium an Bord: {menge} ({lager} im Lager)", {
      menge: fmt(flotte.treibstoff),
      lager: fmt(hafen.ressourcen.tritium || 0),
    })
  );
  textSetzen(
    box.querySelector("[data-frachtraum-lage]"),
    t("Frachtraum {menge}/{kapazitaet} · Regler = % der max. Flottenkapazität", {
      menge: fmt(ladungGesamt(flotte)),
      kapazitaet: fmt(flotteKapazitaet(state, flotte)),
    })
  );
  for (const r of LAGER_RESSOURCEN) {
    const feld = box.querySelector(`[data-lager-lage="${r}"]`);
    if (!feld) continue;
    textSetzen(feld, t("{res} ({lager} im Lager)", { res: t(RESSOURCEN[r].name), lager: fmt(hafen.ressourcen[r] || 0) }));
  }
}

// Namenszeile der gewählten Flotte. Steht VOR allen Zustandsfällen, weil
// Umbenennen immer geht -- auch im Gefecht und unterwegs. Der Name hängt an
// keiner Mechanik, er ist Beschriftung.
//
// Das Feld trägt seinen Wert als Attribut aus flotte.name. Beim Tippen ändert
// sich nur der DOM-Wert, nicht das Attribut -- die Gerüst-Signatur bleibt
// also gleich, der Bereich wird nicht ausgetauscht, und der Cursor bleibt
// stehen. Genau dieselbe Überlegung wie bei den Reglern.
function namensZeile(state, root, box, flotte) {
  const zeile = document.createElement("div");
  zeile.className = "flotte-reihe";
  zeile.innerHTML = `
    <input type="text" class="name-feld" maxlength="${FLOTTENNAME_MAX}" value="${attributText(flotte.name)}" data-flotte-name title="${t(
      "Name dieser Flotte. Reine Beschriftung – ändert nichts an ihren Fähigkeiten."
    )}" />
    <button data-flotte-umbenennen title="${t("Neuen Namen übernehmen")}">${t("Umbenennen")}</button>`;
  box.insertAdjacentElement("afterbegin", zeile);

  const feld = zeile.querySelector("[data-flotte-name]");
  const uebernehmen = () => {
    flotteUmbenennen(state, flotte, feld.value);
    render(state, root);
  };
  zeile.querySelector("[data-flotte-umbenennen]").addEventListener("click", uebernehmen);
  // Enter ist der erwartete Weg bei einem Textfeld -- ohne ihn müsste man für
  // jede Umbenennung zur Maus greifen.
  feld.addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter") uebernehmen();
  });
}

function flottenDetail(state, root, flotte) {
  const box = document.createElement("div");
  box.className = "flotte-detail";
  const hafen = flotte.dockPlanet ? planetById(state, flotte.dockPlanet) : null;

  if (flotte.gefecht) {
    box.innerHTML = `<div class="dezent">${t(
      "{flotte} {status} – nicht umleitbar, bis die Rückzugsschwelle greift oder ein Sieger feststeht.",
      { flotte: htmlText(flotte.name), status: flotteStatusText(state, flotte) }
    )}</div>`;
    namensZeile(state, root, box, flotte);
    box.dataset.geruest = box.innerHTML;
    return box;
  }
  if (!hafen) {
    box.innerHTML = `<div class="dezent">${t(
      "{flotte} ist unterwegs – Umladen geht nur im Hafen. Kurs lässt sich jederzeit ändern (Ziel im System anklicken oder „Umkehren“).",
      { flotte: htmlText(flotte.name) }
    )}</div>`;
    namensZeile(state, root, box, flotte);
    box.dataset.geruest = box.innerHTML;
    return box;
  }

  const marktware = Object.entries(hafen.marktlager || {}).filter(([, m]) => m > 0);
  const entladenCheck = kannLadungEntladen(state, flotte);
  const beschaedigt = Object.entries(flotte.schiffSchaden || {}).filter(([typ, schaden]) => schaden > 0 && (flotte.schiffe[typ] || 0) > 0);

  box.innerHTML = `
    <h3 class="unter-titel">${t("{flotte} im Hafen bei {planet}", {
      flotte: htmlText(flotte.name),
      planet: hafen.name,
    })}</h3>
    <div class="flotte-reihe">
      ${Object.keys(SCHIFFE).map((id) => `
        <span class="umlade-gruppe">
          <span class="dezent">${t(SCHIFFE[id].name)}</span>
          <button data-umladen="${id}" data-menge="-1">−</button>
          <span class="umlade-wert" data-schiff-anBord="${id}"></span>
          <button data-umladen="${id}" data-menge="1">+</button>
          <span class="dezent" data-schiff-frei="${id}"></span>
        </span>`).join("")}
    </div>
    <div class="flotte-reihe">
      <span class="umlade-gruppe schieber-gruppe">
        <span class="dezent" data-tritium-lage></span>
        <input type="range" min="0" max="100" step="1" data-tanken-schieber="1" title="${t(
          "Anteil des hier gelagerten Deuteriums, das an Bord soll. Der Regler stellt nur ein -- erst „Tanken“ führt es aus."
        )}" />
        <span class="schieber-wert" data-tanken-anzeige="1"></span>
        <input type="number" class="menge-feld" min="0" step="1" placeholder="${t("genaue Menge")}" data-tanken-feld="1" title="${t(
          "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler."
        )}" />
        <button data-tanken-bestaetigen="1" title="${t(
          "Übernimmt die eingestellte Menge aus dem Hafenlager in den Tank."
        )}">${t("Tanken")}</button>
        <button data-tanken-alles-ab="1" ${flotte.treibstoff > 0 ? "" : "disabled"} title="${t(
          "Gesamten Treibstoff ans Lager zurückgeben"
        )}">${t("Alles abladen")}</button>
      </span>
    </div>
    <div class="flotte-reihe">
      <span class="dezent" data-frachtraum-lage></span>
    </div>
    <div class="flotte-reihe">
      ${LAGER_RESSOURCEN.filter((r) => r !== "credits").map((r) => `
        <span class="umlade-gruppe schieber-gruppe">
          <span class="dezent" data-lager-lage="${r}"></span>
          <input type="range" min="0" max="100" step="1" data-laden-schieber="${r}" title="${t(
            "Anteil der maximalen Frachtkapazität dieser Flotte -- nicht des gerade freien Platzes. Der Regler stellt nur ein, „Laden“ führt aus."
          )}" />
          <span class="schieber-wert" data-laden-anzeige="${r}"></span>
          <input type="number" class="menge-feld" min="0" step="1" placeholder="${t("genaue Menge")}" data-laden-feld="${r}" title="${t(
            "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler."
          )}" />
          <button data-laden-bestaetigen="${r}" title="${t(
            "Lädt die eingestellte Menge {res} aus dem Hafenlager in den Frachtraum.",
            { res: t(RESSOURCEN[r].name) }
          )}">${t("Laden")}</button>
        </span>`).join("")}
    </div>
    ${beschaedigt.length ? `
    <div class="flotte-reihe">
      ${beschaedigt.map(([typ]) => {
        const repCheck = kannReparieren(state, flotte, typ);
        const recCheck = kannRecyceln(state, flotte, typ);
        const anteil = Math.round(schadenAnteilAnzeige(flotte, typ) * 100);
        return `<span class="umlade-gruppe">
          <span class="dezent warnung">${t("{schiff} {anteil}% beschädigt", {
            schiff: t(SCHIFFE[typ].name),
            anteil,
          })}</span>
          <button data-reparieren="${typ}" ${repCheck.ok ? "" : "disabled"} title="${repCheck.ok ? buendelText(repCheck.kosten) : repCheck.grund}">${t("Reparieren")}</button>
          <button data-recyceln="${typ}" ${recCheck.ok ? "" : "disabled"} title="${recCheck.ok ? t("Verschrottet die beschädigte Gruppe gegen eine sofortige Teilerstattung") : recCheck.grund}">${t("Recyceln")}</button>
        </span>`;
      }).join("")}
    </div>` : ""}
    ${marktware.length ? `
    <div class="flotte-reihe">
      <span class="umlade-gruppe">
        <span class="dezent">${t("Marktware hier: {ware}", {
          ware: buendelText(Object.fromEntries(marktware)),
        })}</span>
        ${marktware
          .map(
            ([resId, menge]) =>
              `<button data-marktware="${resId}" data-menge="${menge}">${t("Alles laden ({res})", {
                res: t(RESSOURCEN[resId].name),
              })}</button>`
          )
          .join("")}
      </span>
    </div>` : ""}
    <div class="flotte-reihe">
      <button data-entladen="1" ${entladenCheck.ok ? "" : "disabled"} title="${entladenCheck.ok ? "" : entladenCheck.grund}">${t("Ladung hier ins Lager entladen")}</button>
      <button data-aufloesen="1" title="${t(
        "Löst den Verband auf. Schiffe, Fracht und Treibstoff bleiben im Hafen dieses Planeten."
      )}">${t("Flotte auflösen")}</button>
    </div>`;

  // Alle Zahlen, die sich im Sekundentakt ändern können, stehen in eigenen
  // Feldern und werden HIER gefüllt -- nicht oben im erzeugten HTML.
  //
  // Der Grund ist Tobis Reglerproblem: solange eine Lagerzahl mitten in der
  // Regler-Zeile steht, ändert sich die erzeugte Zeichenkette bei jedem Tick,
  // der Bereich wird ausgetauscht und der Regler verliert beim Ziehen den
  // Griff des Betriebssystems. Gemessen war es die Nahrungsmenge im Lager:
  // "98.167" wurde "98.157", und damit war der ganze Bereich neu.
  //
  // Die Signatur für den Vergleich in detailAustauschen wird GENAU HIER
  // genommen -- vor dem Einfüllen. Nimmt man sie danach, stehen die
  // wandernden Zahlen mit drin, die Zeichenkette ändert sich bei jedem Takt,
  // und der ganze Aufwand war umsonst. Genau dieser Fehler ist beim Bauen
  // passiert und hat den Regler weiter ersetzt, obwohl die Zahlen längst in
  // eigenen Feldern standen.
  namensZeile(state, root, box, flotte);
  box.dataset.geruest = box.innerHTML;
  flottenDetailZahlen(state, box, flotte, hafen);

  box.querySelectorAll("button[data-umladen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      schiffeUmladen(state, flotte, btn.dataset.umladen, Number(btn.dataset.menge));
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-tanken-alles-ab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tanken(state, flotte, -flotte.treibstoff);
      render(state, root);
    });
  });
  // Tanken-Regler: setzt NUR die Position/Anzeige, löst nichts aus -- erst
  // der "Tanken"-Button bestätigt. Vorher löste "change" (Loslassen) sofort
  // aus UND rendert komplett neu, wodurch der frisch erzeugte Regler bei 0
  // startete -- sah wie ein spontanes Zurückspringen aus. Bewusst getrennt:
  // Regler = Position wählen, Button = Aktion.
  // % vom lokal gelagerten Tritium (es gibt keinen Tank-Höchststand im
  // Datenmodell -- "100%" heißt hier "alles Verfügbare", nicht "voller Tank").
  box.querySelectorAll("input[data-tanken-schieber]").forEach((input) => {
    const schluessel = `tanken:${flotte.id}`;
    const anzeige = box.querySelector(`[data-tanken-anzeige="1"]`);
    const menge = () => Math.round((Number(input.value) / 100) * (hafen.ressourcen.tritium || 0));
    const aktualisieren = () => { anzeige.textContent = `${input.value}% (${fmt(menge())})`; };
    aktualisieren();
    input.addEventListener("input", () => {
      reglerPosition[schluessel] = Number(input.value);
      aktualisieren();
    });
  });
  box.querySelectorAll("button[data-tanken-bestaetigen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = box.querySelector("input[data-tanken-schieber]");
      // Das Eingabefeld hat Vorrang: wer eine genaue Zahl hinschreibt, meint
      // sie auch. Der Regler ist die grobe, das Feld die feine Einstellung
      // (Tobis Wunsch -- Prozent allein trifft keine krummen Beträge).
      const genau = Number(box.querySelector("input[data-tanken-feld]").value);
      const menge = genau > 0
        ? Math.min(genau, hafen.ressourcen.tritium || 0)
        : Math.round((Number(input.value) / 100) * (hafen.ressourcen.tritium || 0));
      if (menge > 0) tanken(state, flotte, menge);
      delete reglerPosition[`tanken:${flotte.id}`];
      render(state, root);
    });
  });
  // Laden-Regler, gleiches Prinzip: % der MAXIMALEN Flottenkapazität (nicht
  // des gerade freien Frachtraums), Regler setzt nur die Anzeige, "Laden"
  // bestätigt.
  box.querySelectorAll("input[data-laden-schieber]").forEach((input) => {
    const resId = input.dataset.ladenSchieber;
    const schluessel = `laden:${flotte.id}:${resId}`;
    const anzeige = box.querySelector(`[data-laden-anzeige="${resId}"]`);
    const menge = () => Math.round((Number(input.value) / 100) * flotteKapazitaet(state, flotte));
    const aktualisieren = () => { anzeige.textContent = `${input.value}% (${fmt(menge())})`; };
    aktualisieren();
    input.addEventListener("input", () => {
      reglerPosition[schluessel] = Number(input.value);
      aktualisieren();
    });
  });
  box.querySelectorAll("button[data-laden-bestaetigen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const resId = btn.dataset.ladenBestaetigen;
      const input = box.querySelector(`input[data-laden-schieber="${resId}"]`);
      const genau = Number(box.querySelector(`input[data-laden-feld="${resId}"]`).value);
      const menge = genau > 0
        ? Math.min(genau, hafen.ressourcen[resId] || 0)
        : Math.round((Number(input.value) / 100) * flotteKapazitaet(state, flotte));
      if (menge > 0) ladungAufnehmen(state, flotte, { [resId]: menge });
      delete reglerPosition[`laden:${flotte.id}:${resId}`];
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-marktware]").forEach((btn) => {
    btn.addEventListener("click", () => {
      marktwareLaden(state, flotte, { [btn.dataset.marktware]: Number(btn.dataset.menge) });
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-reparieren]").forEach((btn) => {
    btn.addEventListener("click", () => {
      reparieren(state, flotte, btn.dataset.reparieren);
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-recyceln]").forEach((btn) => {
    btn.addEventListener("click", () => {
      recyceln(state, flotte, btn.dataset.recyceln);
      render(state, root);
    });
  });
  const entladenBtn = box.querySelector("button[data-entladen]");
  if (entladenBtn) {
    entladenBtn.addEventListener("click", () => {
      ladungEntladen(state, flotte);
      render(state, root);
    });
  }
  box.querySelector("button[data-aufloesen]").addEventListener("click", () => {
    flotteAufloesen(state, flotte);
    state.aktiveFlotte = null;
    render(state, root);
  });
  return box;
}

// Route: unabhängig davon, ob die Flotte gerade im Hafen liegt -- eine
// Route lässt sich jederzeit planen, auch während die Flotte unterwegs ist.
function routenDetail(state, root, flotte) {
  const box = document.createElement("div");
  box.className = "flotte-detail route-box";

  const frei = kannRouteBearbeiten(state);
  if (!frei.ok) {
    box.innerHTML = `<h3 class="unter-titel">${t("Route")}</h3><div class="dezent">${frei.grund}</div>`;
    return box;
  }

  const route = flotte.route;
  const ziele = wirtschaftsPlaneten(state);
  const startCheck = { ok: route.halte.length > 0 && schiffeGesamt(flotte) > 0 };

  box.innerHTML = `
    <h3 class="unter-titel">${t("Route")} ${route.aktiv ? `<span class="basis-tag route-tag">${t("aktiv – Halt {nr}/{gesamt}", { nr: route.index + 1, gesamt: route.halte.length })}</span>` : ""}</h3>
    <div class="flotte-reihe">
      <select id="route-planet-wahl" title="${t(
        "Zielhafen für den nächsten Halt. Die Route fährt ihre Halte danach der Reihe nach ab und beginnt wieder von vorn."
      )}">
        ${ziele.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
      </select>
      <button id="route-halt-hinzufuegen" title="${t(
        "Hängt den gewählten Planeten als weiteren Halt an die Route an."
      )}">${t("Halt hinzufügen")}</button>
      <button id="route-start" ${startCheck.ok && !route.aktiv ? "" : "disabled"} title="${
        route.aktiv
          ? t("Die Route läuft bereits.")
          : startCheck.ok
          ? t("Startet den Kreislauf – die Flotte fährt die Halte der Reihe nach ab.")
          : startCheck.grund
      }">${t("Route starten")}</button>
      <button id="route-stop" ${route.aktiv ? "" : "disabled"} title="${
        route.aktiv
          ? t("Hält den Kreislauf an. Die aktuelle Fahrt wird noch zu Ende geflogen.")
          : t("Es läuft gerade keine Route.")
      }">${t("Route stoppen")}</button>
    </div>
    ${route.halte.map((halt, i) => routenHaltHtml(state, halt, i, route.aktiv)).join("") ||
      `<div class="dezent">${t("Noch keine Stationen. Halte hinzufügen, dann Route starten.")}</div>`}
  `;

  box.querySelector("#route-halt-hinzufuegen").addEventListener("click", () => {
    const planetId = Number(box.querySelector("#route-planet-wahl").value);
    routeHaltHinzufuegen(state, flotte, planetId);
    render(state, root);
  });
  box.querySelector("#route-start").addEventListener("click", () => {
    routeStarten(state, flotte);
    render(state, root);
  });
  box.querySelector("#route-stop").addEventListener("click", () => {
    routeStoppen(state, flotte);
    render(state, root);
  });
  box.querySelectorAll("input[data-entladen-index]").forEach((cb) => {
    cb.addEventListener("change", () => {
      routeEntladenSetzen(state, flotte, Number(cb.dataset.entladenIndex), cb.checked);
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-halt-entfernen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      routeHaltEntfernen(state, flotte, Number(btn.dataset.haltEntfernen));
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-regel-entfernen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      routeLadenRegelSetzen(state, flotte, Number(btn.dataset.regelEntfernen), btn.dataset.res, null, 0);
      render(state, root);
    });
  });
  box.querySelectorAll("button[data-regel-hinzufuegen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.regelHinzufuegen);
      const res = box.querySelector(`select[data-regel-res="${i}"]`).value;
      const modus = box.querySelector(`select[data-regel-modus="${i}"]`).value;
      const wert = Number(box.querySelector(`input[data-regel-wert="${i}"]`).value) || 0;
      routeLadenRegelSetzen(state, flotte, i, res, modus, wert);
      render(state, root);
    });
  });
  return box;
}

function routenHaltHtml(state, halt, index, routeLaeuft) {
  const planet = planetById(state, halt.planetId);
  const name = planet ? planet.name : "?";
  // Solange die Route fährt, ist der Halt gesperrt -- das muss dranstehen,
  // sonst wirken die Felder grundlos tot.
  const gesperrtGrund = routeLaeuft ? t("Route läuft – zum Bearbeiten erst „Route stoppen“.") : "";
  const regelZeilen = halt.laden
    .map(
      (r) => `
      <span class="regel-tag">${t(RESSOURCEN[r.resId].name)} ${
        r.modus === "ueberschuss" ? t("über {wert}", { wert: fmt(r.wert) }) : t("alles")
      }
        <button data-regel-entfernen="${index}" data-res="${r.resId}" ${routeLaeuft ? "disabled" : ""} title="${gesperrtGrund || t("Regel entfernen")}">×</button>
      </span>`
    )
    .join("");

  return `
    <div class="route-halt">
      <div class="flotte-reihe">
        <span class="dezent">${index + 1}. ${name}</span>
        <label class="dezent"><input type="checkbox" data-entladen-index="${index}" ${halt.entladen ? "checked" : ""} ${routeLaeuft ? "disabled" : ""} title="${gesperrtGrund || t("Fracht an diesem Halt ins Lager abgeben")}" /> ${t("hier entladen")}</label>
        <button data-halt-entfernen="${index}" ${routeLaeuft ? "disabled" : ""} title="${gesperrtGrund || t("Diesen Halt aus der Route nehmen")}">${t("Halt entfernen")}</button>
      </div>
      ${regelZeilen ? `<div class="flotte-reihe">${regelZeilen}</div>` : ""}
      <div class="flotte-reihe">
        <select data-regel-res="${index}" title="${gesperrtGrund || t("Welche Ressource an diesem Halt geladen wird")}">
          ${LAGER_RESSOURCEN.filter((r) => r !== "credits").map((r) => `<option value="${r}">${t(RESSOURCEN[r].name)}</option>`).join("")}
        </select>
        <select data-regel-modus="${index}" title="${gesperrtGrund || t("alles laden: nimmt den kompletten Bestand mit. nur Überschuss: lässt die daneben eingestellte Reserve am Planeten stehen -- so zieht die Route dem Planeten nicht sein Baumaterial weg.")}">
          <option value="voll">${t("alles laden")}</option>
          <option value="ueberschuss">${t("nur Überschuss über")}</option>
        </select>
        <input type="number" min="0" step="100" value="0" data-regel-wert="${index}" ${routeLaeuft ? "disabled" : ""} title="${gesperrtGrund || t("Reservemenge, die am Planeten bleibt")}" />
        <button data-regel-hinzufuegen="${index}" ${routeLaeuft ? "disabled" : ""} title="${gesperrtGrund || t("Legt fest, was an diesem Halt geladen wird")}">${t("Regel setzen")}</button>
      </div>
    </div>`;
}

// --- Galaxie & System -----------------------------------------------------
// --- Sterne -----------------------------------------------------------
// Der Stern entscheidet genau eine Sache, und die ist entscheidungsrelevant:
// wo im System die bewohnbare Zone liegt -- also wo überhaupt Nahrung wächst
// und wo nur noch Eis- und Gasriesen stehen. Nach Prinzip 10a steht das
// deshalb als Klartext im Tooltip und nicht nur als Zahl.
function sternCharakter(leuchtkraft) {
  if (leuchtkraft < 0.1) {
    return t("Bewohnbare Zone dicht am Stern – der größte Teil des Systems ist Eis.");
  }
  if (leuchtkraft < 0.7) return t("Bewohnbare Zone eher sternnah, weiter Außenbereich.");
  if (leuchtkraft < 1.6) return t("Sonnenähnlich – ausgewogene Zonen.");
  return t("Heller Stern – große heiße Innenzone, bewohnbare Zone weit außen.");
}

function sternKurz(stern) {
  return `<span class="stern-punkt" style="--stern-farbe:${stern.farbe}"></span>${t(stern.name)} (${stern.spektral})`;
}

function sternTitel(stern) {
  return [
    t("{name} ({klasse})", { name: t(stern.name), klasse: stern.spektral }),
    t("Leuchtkraft {wert} Sonnen", {
      wert: stern.leuchtkraft.toLocaleString(gebietsschema(), { maximumFractionDigits: 3 }),
    }),
    sternCharakter(stern.leuchtkraft),
  ].join("\n");
}

// --- Auswählen: EIN Weg, zwei Bedienflächen -------------------------------
//
// Liste und Karte bieten dieselben beiden Aktionen an, und das ist gewollt --
// aber sie müssen durch dieselbe Funktion gehen. Zwei Code-Pfade zur selben
// Wirkung sind zwei Orte, an denen sie auseinanderlaufen (Prinzip 5), und der
// Unterschied fällt erst auf, wenn einer der beiden falsch liegt.
//
// Die Reichweiten-Schranke steht deshalb HIER und nicht am Knopf: die Liste
// versteckt ihren "Ansehen"-Knopf für unerreichbare Systeme, und die Karte
// soll nicht anbieten, was die Liste verweigert.
function systemAnzeigen(state, root, systemId) {
  if (!systemErreichbar(state, systemId)) return;
  state.angezeigtesSystem = systemId;
  render(state, root);
}

// Welches Objekt im System gerade hervorgehoben ist. Wie aktiverBereich reiner
// UI-Zustand: es ändert nichts an der Welt, es zeigt nur hin.
//
// `scrollen` ist ein einmaliger Auftrag, kein Zustand -- die Zeile wird beim
// Auswählen in den Blick geholt und danach nie wieder, sonst risse die Karte
// dem Spieler jede Sekunde seine Bildlaufposition weg.
let orbitWahl = { systemId: null, orbit: null, scrollen: false };

function orbitWaehlen(state, root, systemId, orbit) {
  const gleiche = orbitWahl.systemId === systemId && orbitWahl.orbit === orbit;
  // Zweiter Klick hebt die Wahl wieder auf -- ohne das gäbe es keinen Weg
  // zurück in den Null-Zustand (Prinzip 7).
  orbitWahl = gleiche
    ? { systemId: null, orbit: null, scrollen: false }
    : { systemId, orbit, scrollen: true };
  render(state, root);
}

function renderGalaxie(state, root) {
  const reichweite = maxReichweite(state);
  root.querySelector("#galaxie-info").textContent = t(
    "Reichweite {reichweite} · {stuetzpunkte} Stützpunkte · {systeme} Systeme",
    {
      reichweite: reichweite.toFixed(0),
      stuetzpunkte: planetenVon(state).length,
      systeme: state.galaxie.anzahlSysteme,
    }
  );

  const systeme = [];
  for (let id = 1; id <= state.galaxie.anzahlSysteme; id++) {
    const naechste = naechsteBasis(state, id);
    systeme.push({ id, entfernung: naechste ? naechste.entfernung : Infinity });
  }
  systeme.sort((a, b) => a.entfernung - b.entfernung);

  const inReichweite = systeme.filter((s) => s.entfernung <= reichweite).length;
  root.querySelector("#galaxie-hinweis").textContent = t("{anzahl} in Reichweite · nach Entfernung sortiert", {
    anzahl: inReichweite,
  });

  const liste = root.querySelector("#galaxie-liste");
  // Abgeglichen statt neu gebaut: der "Ansehen"-Knopf ist einer der am
  // häufigsten geklickten im Spiel, und er stand hier bis v0.61 jede Sekunde
  // als neues Element da (Prinzip 8a).
  listeAbgleichen(liste, systeme.slice(0, 25), {
    schluessel: (eintrag) => eintrag.id,
    bauen: (eintrag) => {
      const li = document.createElement("li");
      li.className = "galaxie-system";
      li.innerHTML = `
        <span class="slot-name">
          <span class="slot-bezeichnung"></span>
          <span class="dezent" data-system-lage></span>
        </span>
        <button data-system="${eintrag.id}"></button>
        <span class="slot-hinweis gesperrt-text" hidden></span>`;
      li.querySelector("button[data-system]").addEventListener("click", () => {
        systemAnzeigen(state, root, eintrag.id);
      });
      return li;
    },
    aktualisieren: (li, eintrag) => galaxieZeileFuellen(state, li, eintrag, reichweite),
  });

  // Die Karte ZEIGT, was die Liste aufzählt -- und zwar alle 500 Systeme statt
  // der nächsten 25. Ein Sternenfeld mit hervorgehobener Nachbarschaft sagt
  // mehr über die eigene Lage als jede Sortierung (Prinzip 1: die Welt ist da,
  // bevor man hinsieht).
  //
  // `systeme` wird durchgereicht statt neu gerechnet: die Entfernung zum
  // nächsten Stützpunkt steht oben schon für jedes System da, und dieselbe
  // Schleife zweimal pro Sekunde zu fahren wäre der teuerste Teil der Karte.
  //
  // `sichtbar` ist die wichtigste Zeile hier: ist der Bereich zu, tut die
  // Karte nichts. Eine geschlossene Ansicht darf nichts kosten.
  galaxieKarteZeichnen(root.querySelector("#galaxie-karte"), root.querySelector("#galaxie-legende"), state, {
    sichtbar: aktiverBereich === "galaxie",
    jetzt: spielzeitJetzt(state),
    reichweite,
    systeme,
    aufSystem: (systemId) => systemAnzeigen(state, root, systemId),
  });
}

function galaxieZeileFuellen(state, li, eintrag, reichweite) {
  {
    const erreichbar = eintrag.entfernung <= reichweite;
    const eigene = planetenVon(state).filter((p) => p.systemId === eintrag.id);
    const aktiv = state.angezeigtesSystem === eintrag.id;
    li.classList.toggle("system-aktiv", aktiv);
    li.classList.toggle("system-fern", !erreichbar);

    // Tooltip erklärt vor allem das WARUM einer Sperre -- "außer Reichweite"
    // allein sagt nicht, wie weit man noch kommen muss.
    const basis = naechsteBasis(state, eintrag.id);
    const zustand = state.systemZustand[eintrag.id];
    const stern = sternFuer(state.galaxie.seed, eintrag.id, eintrag.id === state.galaxie.heimatSystem);
    const titel = [
      systemName(state.galaxie.seed, eintrag.id),
      sternTitel(stern),
      basis
        ? t("{entfernung} von {planet} (nächster eigener Stützpunkt)", {
            entfernung: eintrag.entfernung.toFixed(1),
            planet: basis.planet.name,
          })
        : t("Kein eigener Stützpunkt vorhanden"),
      t("Deine Reichweite: {reichweite}", { reichweite: reichweite.toFixed(0) }),
      erreichbar
        ? ""
        : t(
            "Fehlen {fehlt} – Antriebstechnik erhöht die Reichweite, ein näherer Stützpunkt verkürzt die Strecke.",
            { fehlt: (eintrag.entfernung - reichweite).toFixed(1) }
          ),
      eigene.length
        ? t("Eigene Stützpunkte hier: {liste}", { liste: eigene.map((p) => p.name).join(", ") })
        : "",
      zustand && untersuchteOrbits(state, eintrag.id) > 0
        ? t("{anzahl} Orbit(s) bereits untersucht", { anzahl: untersuchteOrbits(state, eintrag.id) })
        : t("Noch nicht besucht"),
      // Die teuerste Entscheidung auf dieser Seite gehört sichtbar an die
      // Zeile, nicht in eine Überraschung nach dem Klick (Prinzip 10a): ein
      // Erstflug dauert Größenordnungen länger als ein Sprung.
      hatSprungroute(state, eintrag.id)
        ? t("Sprungroute vermessen – ein Sprung dauert {dauer}.", {
            dauer: fmtDauer(SONDE.grundflugzeitSek + eintrag.entfernung * SONDE.flugzeitProEntfernungSek),
          })
        : t(
            "KEINE Sprungroute. Der erste Flug dorthin geht unterlichtschnell und dauert {dauer} – danach steht der Anker und es ist für immer ein Sprung.",
            { dauer: fmtDauer(eintrag.entfernung * unterlichtSekundenProEinheit()) }
          ),
    ]
      .filter(Boolean)
      .join("\n");
    attributSetzen(li, "title", titel);

    const bezeichnung = li.querySelector(".slot-bezeichnung");
    const bezeichnungHtml =
      `${systemName(state.galaxie.seed, eintrag.id)} ` +
      `${eigene.length ? `<span class="basis-tag">${t("{anzahl}× eigen", { anzahl: eigene.length })}</span>` : ""}` +
      // Ein Wort, das den Unterschied zwischen Minuten und Stunden trägt.
      `${hatSprungroute(state, eintrag.id) ? "" : `<span class="basis-tag warnung">${t("Erstflug")}</span>`}`;
    if (bezeichnung.innerHTML !== bezeichnungHtml) bezeichnung.innerHTML = bezeichnungHtml;

    const lage = li.querySelector("[data-system-lage]");
    const lageHtml = `${
      systemBesucht(state, eintrag.id)
        ? t("Entfernung {entfernung} · besucht", { entfernung: eintrag.entfernung.toFixed(1) })
        : t("Entfernung {entfernung}", { entfernung: eintrag.entfernung.toFixed(1) })
    } · <span class="stern-punkt" style="--stern-farbe:${stern.farbe}"></span>${stern.spektral}`;
    if (lage.innerHTML !== lageHtml) lage.innerHTML = lageHtml;

    // Knopf und Sperrhinweis sind beide dauerhaft da und werden versteckt --
    // erzeugte und entfernte Knöpfe wären genau der alte Fehler.
    const knopf = li.querySelector("button[data-system]");
    const hinweis = li.querySelector(".slot-hinweis");
    knopf.hidden = !erreichbar;
    hinweis.hidden = erreichbar;
    if (erreichbar) {
      knopf.disabled = aktiv;
      textSetzen(knopf, aktiv ? t("geöffnet") : t("Ansehen"));
      attributSetzen(
        knopf,
        "title",
        aktiv ? t("Dieses System wird gerade in der Karte rechts gezeigt.") : t("Systemkarte öffnen")
      );
    } else {
      textSetzen(hinweis, t("außer Reichweite"));
    }
  }
}

// Knöpfe für den Schnellversand. Nur sichtbar, wenn die jeweilige
// KI-Forschung vorhanden ist -- vorher gibt es den Knopf gar nicht, statt
// ihn ausgegraut anzubieten (er wäre sonst dauerhaft im Weg).
function schnellversandKnoepfe(state, flotte, systemId) {
  const arten = [
    { art: "sonde", forschung: "sondenKi", label: () => t("Sonden losschicken") },
    { art: "erkundung", forschung: "erkunderKi", label: () => t("Erkunder losschicken") },
  ];
  let html = "";
  for (const { art, forschung, label } of arten) {
    if ((state.forschung[forschung] || 0) < 1) continue;
    const check = kannSchnellversand(state, flotte, art, systemId);
    const titel = check.ok
      ? t("{ziele} von {gesamt} Ziel(en) mit {schiffe} Schiff(en)", {
          ziele: check.ziele.length,
          gesamt: check.gesamtZiele,
          schiffe: check.schiffe,
        })
      : check.grund;
    html += ` <button data-schnellversand="${art}" ${check.ok ? "" : "disabled"} title="${titel}">${label()}${
      check.ok ? ` (${check.ziele.length})` : ""
    }</button>`;
  }
  return html;
}

function renderSystem(state, root, jetzt) {
  const systemId = state.angezeigtesSystem;
  const system = holeSystem(state, systemId);
  const flotte = flotteById(state, state.aktiveFlotte);
  const naechste = naechsteBasis(state, systemId);

  root.querySelector("#system-titel").textContent = system.name;
  const sternEl = root.querySelector("#system-stern");
  sternEl.innerHTML = sternKurz(system.stern);
  sternEl.title = sternTitel(system.stern);
  const statusEl = root.querySelector("#sonden-status");

  if (!flotte) {
    statusEl.textContent = t("Keine Flotte gewählt – stelle eine auf und wähle sie aus, um Befehle zu geben.");
  } else {
    const ziel = ortVonSystem(state, systemId, 1);
    const von = flottePosition(state, flotte, jetzt);
    const d = strecke(von, ziel);
    statusEl.innerHTML =
      t("{flotte}: Entfernung {distanz} · rund {tritium} Deuterium hin · {anBord} an Bord", {
        // innerHTML, weil unten die Schnellversand-Knöpfe angehängt werden --
        // der Name muss also entschärft sein.
        flotte: htmlText(flotte.name),
        distanz: d.toFixed(1),
        tritium: fmt(treibstoffFuer(flotte, d)),
        anBord: fmt(flotte.treibstoff),
      }) + schnellversandKnoepfe(state, flotte, systemId);
    // Schnellversand: erscheint erst mit der jeweiligen KI-Forschung. Der
    // Knopf sagt selbst, wie viele Ziele er abarbeiten würde.
    statusEl.querySelectorAll("button[data-schnellversand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        schnellversandBefehlen(state, flotte, btn.dataset.schnellversand, systemId);
        render(state, root);
      });
    });
  }
  statusEl.classList.toggle("aktiv", !!flotte && !!flotte.abschnitt);

  // WER IST HIER, WER KOMMT? Tobis Meldung: "Indikator das flotte versendet
  // wurde ist fast gar nicht vorhanden in der Systemübersicht, außer in der
  // Flottenübersicht." Man schickt eine Flotte los und die Karte, auf die man
  // gerade schaut, verrät nichts davon.
  //
  // Gezeigt werden beide Seiten: was schon da steht, und was unterwegs ist --
  // mit Ankunftszeit, denn ohne sie ist "unterwegs" keine Information,
  // sondern nur eine Beruhigung.
  const flottenEl = root.querySelector("#system-flotten");
  const hier = [];
  const kommen = [];
  for (const f of flottenVon(state)) {
    if (f.abschnitt) {
      if (f.abschnitt.nach && f.abschnitt.nach.systemId === systemId) {
        kommen.push(t("{flotte}, noch {dauer}", {
          flotte: f.name,
          dauer: fmtDauer((f.abschnitt.ankunftZeit - jetzt) / 1000),
        }));
      }
      continue;
    }
    if (flottePosition(state, f, jetzt).systemId === systemId) hier.push(f.name);
  }
  const teile = [];
  if (hier.length) teile.push(t("Hier: {liste}", { liste: hier.join(", ") }));
  if (kommen.length) teile.push(t("Unterwegs hierher: {liste}", { liste: kommen.join(", ") }));
  flottenEl.textContent = teile.length ? teile.join(" · ") : t("Keine eigene Flotte in diesem System.");
  flottenEl.classList.toggle("aktiv", kommen.length > 0);

  const liste = root.querySelector("#system-liste");

  // Zeilen werden abgeglichen (Prinzip 8a), Schlüssel ist der Orbit -- er ist
  // die einzige Eigenschaft eines Objekts, die sich nie ändert.
  listeAbgleichen(liste, system.objekte, {
    schluessel: (objekt) => objekt.orbit,
    bauen: () => {
      const li = document.createElement("li");
      li.className = "system-slot";
      li.innerHTML = `
        <span class="slot-nummer"></span>
        <span class="slot-symbol"></span>
        <span class="slot-name">
          <span class="slot-bezeichnung"></span>
          <span class="dezent" data-slot-detail></span>
        </span>
        <span class="slot-aktionen"></span>`;
      return li;
    },
    aktualisieren: (li, objekt) => slotZeileFuellen(state, systemId, objekt, flotte, li),
  });

  // Ereignisse EINMAL und delegiert an die Liste.
  //
  // Der Unterschied ist wichtig: vorher hingen die Handler an den Knöpfen und
  // wurden nach jedem Neuaufbau frisch gesetzt -- das ging nur gut, WEIL die
  // Knöpfe jede Sekunde neu entstanden. Bleiben die Elemente jetzt stehen,
  // würde dieselbe Schleife bei jedem Takt einen weiteren Handler anhängen,
  // und ein einziger Klick löste nach einer Minute sechzig Missionen aus.
  if (!liste.dataset.verdrahtet) {
    liste.dataset.verdrahtet = "1";
    liste.addEventListener("click", (ereignis) => {
      const aktiveFlotte = flotteById(state, state.aktiveFlotte);
      const mission = ereignis.target.closest("button[data-mission]");
      if (mission) {
        const optionen = {};
        if (mission.dataset.art === "militaer") {
          const feld = liste.querySelector(`input[data-rueckzug="${mission.dataset.mission}"]`);
          const prozent = feld ? Number(feld.value) : KAMPF.standardRueckzugsSchwelle * 100;
          optionen.rueckzugsSchwelle = Math.max(0, Math.min(100, prozent)) / 100;
        }
        missionBefehlen(
          state,
          aktiveFlotte,
          mission.dataset.art,
          state.angezeigtesSystem,
          Number(mission.dataset.mission),
          optionen
        );
        render(state, root);
        return;
      }
      const gruenden = ereignis.target.closest("button[data-gruenden]");
      if (gruenden) {
        gruendungBefehlen(
          state,
          aktiveFlotte,
          gruenden.dataset.art,
          state.angezeigtesSystem,
          Number(gruenden.dataset.gruenden)
        );
        render(state, root);
        return;
      }
      const anfliegen = ereignis.target.closest("button[data-anfliegen]");
      if (anfliegen) {
        zumPlanetBefehlen(state, aktiveFlotte, Number(anfliegen.dataset.anfliegen));
        render(state, root);
        return;
      }
      // Klick auf die Zeile selbst (nicht auf einen Knopf) hebt das Objekt
      // hervor -- dasselbe, was ein Klick auf die Karte tut, und durch
      // dieselbe Funktion. Muster wie bei der Flottenliste: die Kachel ist
      // ihr eigener Wählen-Knopf.
      const zeile = ereignis.target.closest("li[data-listen-schluessel]");
      if (zeile) orbitWaehlen(state, root, state.angezeigtesSystem, Number(zeile.dataset.listenSchluessel));
    });
  }

  // Nach dem Abgleich, damit die Zeile schon steht: die frisch gewählte Zeile
  // einmal in den Blick holen. `scrollen` wird dabei verbraucht -- ohne das
  // spränge die Liste jede Sekunde zurück.
  if (orbitWahl.scrollen && orbitWahl.systemId === systemId) {
    orbitWahl.scrollen = false;
    const zeile = liste.querySelector(`li[data-listen-schluessel="${orbitWahl.orbit}"]`);
    if (zeile && zeile.scrollIntoView) zeile.scrollIntoView({ block: "nearest" });
  }

  // Das System von innen: Stern in der Mitte, Orbits als Ringe, und darauf,
  // wer gerade wo steht. Fremde Flotten sind hier mit dabei -- im All gibt es
  // keine Tarnung, wer im selben System steht, steht sichtbar (Prinzip 0b:
  // dieselbe Regel für alle).
  systemKarteZeichnen(root.querySelector("#system-karte"), state, {
    sichtbar: aktiverBereich === "galaxie",
    jetzt,
    systemId,
    gewaehlterOrbit: orbitWahl.systemId === systemId ? orbitWahl.orbit : null,
    aufOrbit: (orbit) => orbitWaehlen(state, root, systemId, orbit),
  });
}

function slotZeileFuellen(state, systemId, objekt, flotte, li) {
  li.className = "system-slot waehlbar";
  // Hervorgehoben, weil es auf der Karte angeklickt wurde (oder umgekehrt).
  // Die Zeile ist die Bedienfläche des Objekts -- die Karte zeigt hin, die
  // Liste handelt.
  if (orbitWahl.systemId === systemId && orbitWahl.orbit === objekt.orbit) li.classList.add("slot-gewaehlt");
  const gesperrt =
    objekt.entdeckt && objekt.benoetigt && (state.forschung[objekt.benoetigt.forschung] || 0) < 1;
  // `eigen` ist SPIELREGEL, nicht Anzeige: daran hängt, welche Missionen der
  // Orbit anbietet (slotAktion) und was in der Detailzeile steht. Deshalb
  // fragt es seit v0.83 nach der Fraktion -- vorher galt jeder Planet an
  // diesem Orbit als eigener, auch eine Piratenbasis (A-002).
  const eigen = eigenerPlanetAn(state, systemId, objekt.orbit);
  const besetzer = !eigen ? planetAn(state, systemId, objekt.orbit) : null;

  if (objekt.typ === "heimat" || eigen) li.classList.add("slot-heimat");
  else if (besetzer) li.classList.add("slot-besetzt");
  else if (!objekt.entdeckt) li.classList.add("slot-unerforscht");
  else if (objekt.gefahr && !objekt.verteidigerBesiegt) li.classList.add("slot-gefahr");
  else if (gesperrt) li.classList.add("slot-gesperrt");
  else if (objekt.verwertet || objekt.verteidigerBesiegt) li.classList.add("slot-verwertet");

  // Tooltip trägt das Genaue: Erträge in Zahlen, was das Objekt gerade
  // blockiert, welches Schiff die nächste Mission braucht. In der Zeile
  // selbst bleibt nur, was man beim Überfliegen braucht.
  const naechsteMission = objekt.entdeckt ? missionFuerObjekt(state, objekt) : null;
  const titel = [
    objekt.entdeckt
      ? t("{art} ({name}, Orbit {orbit})", {
          art: t(objekt.bezeichnung),
          name: objekt.name,
          orbit: objekt.orbit,
        })
      : t("{name} – noch unerforscht", { name: objekt.name }),
    !objekt.entdeckt ? t("Erst aufdecken, dann zeigt sich, was hier liegt.") : "",
    objekt.entdeckt && objekt.daten.ertrag
      ? t("Ertrag: {ertrag}", { ertrag: buendelText(offenerErtrag(state, objekt)) })
      : "",
    objekt.restErtrag && Object.values(objekt.restErtrag).some((m) => m > 0)
      ? t("Liegengeblieben: {rest}", { rest: buendelText(objekt.restErtrag) })
      : "",
    gesperrt ? t("Verschlossen – benötigt {tech}", { tech: t(RESEARCH[objekt.benoetigt.forschung].name) }) : "",
    naechsteMission
      ? MISSIONS_SCHIFF[naechsteMission]
        ? t("Nächster Schritt: {mission} (braucht {schiff})", {
            mission: missionLabel(naechsteMission) || naechsteMission,
            schiff: t(SCHIFFE[MISSIONS_SCHIFF[naechsteMission]].name),
          })
        : t("Nächster Schritt: {mission}", { mission: missionLabel(naechsteMission) || naechsteMission })
      : objekt.entdeckt && !eigen && !besetzer
      ? t("Hier ist nichts mehr zu holen.")
      : "",
    eigen ? t("Dein Stützpunkt: {name}", { name: eigen.name }) : "",
    besetzer
      ? t("Fremder Stützpunkt: {name} ({fraktion})", {
          name: besetzer.name,
          fraktion: (fraktionById(state, fraktionVon(besetzer)) || {}).name || t("Unbekannt"),
        })
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  attributSetzen(li, "title", titel);

  textSetzen(li.querySelector(".slot-nummer"), String(objekt.orbit));
  textSetzen(li.querySelector(".slot-symbol"), objekt.entdeckt ? TYP_SYMBOL[objekt.typ] : "?");
  textSetzen(
    li.querySelector(".slot-bezeichnung"),
    objekt.entdeckt ? t(objekt.bezeichnung) : t("Unerforscht")
  );
  // Die Detailzeile kann im Gesperrt-Fall Markup tragen (der amberfarbene
  // Sperrtext) und geht deshalb über innerHTML -- aber wie der Aktionsbereich
  // unten nur, wenn sich der Inhalt WIRKLICH geändert hat. Über textContent
  // stand das Markup wörtlich im Spiel ("<span class=…>", Tobis Screenshot).
  const detail = li.querySelector("[data-slot-detail]");
  const detailHtml = `${objekt.name}${objekt.entdeckt ? " · " + slotDetail(state, objekt, gesperrt, eigen) : ""}`;
  if (detail.dataset.stand !== detailHtml) {
    detail.dataset.stand = detailHtml;
    detail.innerHTML = detailHtml;
  }

  // Der Aktionsbereich trägt die Knöpfe und wird deshalb nur angefasst, wenn
  // sich sein Inhalt WIRKLICH geändert hat. Er hängt an diskreten Zuständen
  // (entdeckt, verwertet, gesperrt), nicht an der Uhr -- im Normalfall steht
  // er also über beliebig viele Takte still, und die Knöpfe bleiben dieselben
  // Elemente. Die Ereignisse hängen ohnehin delegiert an der Liste.
  const aktionen = li.querySelector(".slot-aktionen");
  const aktionenHtml = slotAktion(state, systemId, objekt, gesperrt, eigen, flotte);
  if (aktionen.innerHTML !== aktionenHtml) aktionen.innerHTML = aktionenHtml;
  return li;
}

// Kurzprofil einer Planetenart: was sie gut kann und was ihr ganz fehlt.
// Bewusst knapp -- nur die Enden der Skala, die Mitte trägt keine Entscheidung.
function affinitaetText(daten) {
  if (!daten || !daten.klasse) return "";
  const profil = affinitaetVon(daten);
  const klasse = PLANETEN_KLASSEN[daten.klasse];
  const gut = [];
  const fehlt = [];
  for (const [resId, faktor] of Object.entries(profil)) {
    const symbol = RESSOURCEN[resId] ? RESSOURCEN[resId].symbol : resId;
    if (faktor >= AFFINITAET_GUT) gut.push(`${symbol} ×${faktor}`);
    else if (faktor === 0) fehlt.push(symbol);
  }
  const teile = [];
  // Die Schwerkraft ist die einzige Zahl der Massenachse, die sichtbar bleibt:
  // sie entscheidet über Bau- und Startkosten und darüber, ob Terraforming
  // überhaupt möglich ist (Tobis Wahl: intern drei Achsen, sichtbar eine).
  //
  // Sie muss aus DEM PLANETEN kommen, nicht aus seiner Klasse: seit v0.25 wird
  // sie je Planet aus Masse und Radius gerechnet (g = M/R²), die Klasse trägt
  // nur noch einen Richtwert für Welten ohne Boden. Hier stand vorher der
  // Klassenwert -- eine Felswelt mit 1,35 g zeigte deshalb gar nichts an
  // (Klassenwert exakt 1), und bei einer Supererde stand eine Zahl, die von der
  // tatsächlich berechneten Kostenlage abwich.
  const g = daten.schwerkraft || (klasse ? klasse.schwerkraft : 1);
  if (Math.abs(g - 1) >= 0.05) {
    teile.push(t("{wert} g", {
      wert: g.toLocaleString(gebietsschema(), { maximumFractionDigits: 2 }),
    }));
  }
  if (gut.length) teile.push(t("ergiebig: {liste}", { liste: gut.join(" ") }));
  // Fehlende Nahrung ist der gefährlichste Fall und wird deshalb ausgeschrieben
  // statt nur als Symbol -- eine Kolonie dort muss dauerhaft versorgt werden,
  // sonst schrumpft ihre Bevölkerung bis auf null.
  if (profil.nahrung === 0) teile.push(t("keine Landwirtschaft – muss versorgt werden"));
  // Ohne haltbare Atmosphäre ist Terraforming physikalisch ausgeschlossen --
  // das gehört sichtbar an den Planeten, bevor jemand dorthin siedelt.
  if (klasse && klasse.oberflaeche && !klasse.atmosphaere) {
    teile.push(t("zu leicht für eine Atmosphäre – nicht terraformbar"));
  }
  const restFehlt = fehlt.filter((symbol) => symbol !== RESSOURCEN.nahrung.symbol);
  if (restFehlt.length) teile.push(t("fehlt: {liste}", { liste: restFehlt.join(" ") }));
  return teile.length ? ` · ${teile.join(" · ")}` : "";
}

function slotDetail(state, objekt, gesperrt, eigen) {
  if (eigen) {
    return eigen.typ === "kolonie"
      ? t("deine Kolonie")
      : eigen.typ === "heimat"
      ? t("Heimatplanet")
      : t("dein Außenposten");
  }
  if (gesperrt) {
    const ertrag = objekt.daten.ertrag
      ? t(" · Ertrag: {ertrag}", { ertrag: buendelText(offenerErtrag(state, objekt)) })
      : "";
    const sperre = t("verschlossen – benötigt {tech}", { tech: t(RESEARCH[objekt.benoetigt.forschung].name) });
    return `<span class="gesperrt-text">${sperre}</span>${ertrag}`;
  }
  switch (objekt.typ) {
    case "heimat": return t("Heimatplanet");
    case "planet": {
      if (!objekt.daten.kolonisierbar) return t("nicht besiedelbar");
      // Profil VOR der Koloniegründung zeigen. Seit die Planetenart hart
      // bestimmt, was es dort gibt (und ob überhaupt Nahrung wächst), wäre
      // eine Kolonie ohne diese Information ein Blindflug -- im schlimmsten
      // Fall verhungern die Siedler auf einer Welt ohne Landwirtschaft.
      return (
        t("besiedelbar · {radius} Erdradien", { radius: (objekt.daten.groesse / 100).toLocaleString(gebietsschema(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) + affinitaetText(objekt.daten)
      );
    }
    case "gefahr": {
      if (objekt.verteidigerBesiegt) {
        const restOffen = objekt.restErtrag && Object.values(objekt.restErtrag).some((m) => m > 0);
        return restOffen
          ? t("besiegt · Rest liegt noch: {rest}", { rest: buendelText(objekt.restErtrag) })
          : t("besiegt");
      }
      const schiffe = objekt.verteidigerSchiffe || objekt.daten.flotte || {};
      const staerke = schiffeStaerke(schiffe, objekt.verteidigerSchaden || {});
      const werte = { schiffe: schiffeText(schiffe), hp: Math.round(staerke.hp) };
      return objekt.verteidigerSchiffe
        ? t("gefährlich · Flotte: {schiffe} · {hp} HP (bereits geschwächt)", werte)
        : t("gefährlich · Flotte: {schiffe} · {hp} HP", werte);
    }
    case "leer": return t("leer");
    case "anomalie": return objekt.verwertet ? t("ausgewertet") : t("auswertbar");
    default:
      if (objekt.verwertet) return t("verwertet");
      if (!objekt.daten.ertrag) return t("erkundet");
      return objekt.restErtrag
        ? t("Rest: {rest} – Frachtraum reichte nicht", { rest: buendelText(objekt.restErtrag) })
        : t("Ertrag: {ertrag}", { ertrag: buendelText(offenerErtrag(state, objekt)) });
  }
}

function slotAktion(state, systemId, objekt, gesperrt, eigen, flotte) {
  if (eigen) {
    if (!flotte || flotte.dockPlanet === eigen.id) return `<span class="slot-hinweis">${t("Stützpunkt")}</span>`;
    // PRINZIP 10a: Der Knopf war bis v0.61 immer aktiv und tat bei einer
    // leeren Flotte einfach nichts -- Tobis Meldung "bei Klick auf Anfliegen
    // passiert nichts". Es war kein verschluckter Klick, sondern ein Knopf,
    // der eine unmögliche Aktion anbot und den Grund verschwieg. Dieselbe
    // Prüfung, die der Befehl selbst durchläuft, entscheidet jetzt vorher.
    const check = kannBefehlen(state, flotte, ortVonPlanet(state, eigen));
    return `<button data-anfliegen="${eigen.id}" ${check.ok ? "" : "disabled"} title="${
      check.ok ? t("Flotte hierher in den Hafen schicken") : check.grund
    }">${t("Anfliegen")}</button>`;
  }
  if (!flotte) return `<span class="slot-hinweis">–</span>`;
  if (gesperrt) return `<span class="slot-hinweis gesperrt-text">🔒 ${t("gesperrt")}</span>`;

  if (objekt.entdeckt && objekt.typ === "planet" && objekt.daten.kolonisierbar) {
    const aussen = kannGruendungsmission(state, flotte, "aussenposten", systemId, objekt.orbit);
    const kolonie = kannGruendungsmission(state, flotte, "kolonie", systemId, objekt.orbit);
    return `
      <button data-gruenden="${objekt.orbit}" data-art="aussenposten" ${aussen.ok ? "" : "disabled"} title="${aussen.ok ? buendelText(AUSSENPOSTEN.kosten) : aussen.grund}">${t("Außenposten")}</button>
      <button data-gruenden="${objekt.orbit}" data-art="kolonie" ${kolonie.ok ? "" : "disabled"} title="${kolonie.ok ? t("Verbraucht 1 Kolonieschiff") : kolonie.grund}">${t("Kolonie")}</button>`;
  }

  const art = missionFuerObjekt(state, objekt);
  if (!art) return `<span class="slot-hinweis">${objekt.verwertet ? t("erledigt") : "–"}</span>`;

  const check = kannMission(state, flotte, art, systemId, objekt.orbit);
  if (art === "militaer") {
    return `
      <label class="dezent">${t("Rückzug unter")}
        <input type="number" min="0" max="100" step="5" value="${KAMPF.standardRueckzugsSchwelle * 100}" data-rueckzug="${objekt.orbit}" />%
      </label>
      <button data-mission="${objekt.orbit}" data-art="${art}" ${check.ok ? "" : "disabled"} title="${check.ok ? "" : check.grund}">${missionLabel(art)}</button>`;
  }
  return `<button data-mission="${objekt.orbit}" data-art="${art}" ${check.ok ? "" : "disabled"} title="${check.ok ? "" : check.grund}">${missionLabel(art)}</button>`;
}

// Der Umschalter über der Meldungsliste. Er wird EINMAL verdrahtet -- der
// Knopf selbst steht fest in index.html, also außerhalb der Liste, die jede
// Sekunde neu befüllt wird (Prinzip 8a). `meldungenFilterVerdrahtet` verhindert
// den zweiten Handler: renderMeldungen läuft im Sekundentakt, und sechzig
// Handler an einem Knopf schalten den Filter sechzigmal um, also gar nicht.
let meldungenFilterVerdrahtet = false;

function meldungenFilterEinrichten(state, root) {
  if (meldungenFilterVerdrahtet) return;
  const knopf = root.querySelector("#meldungen-filter");
  if (!knopf) return;
  meldungenFilterVerdrahtet = true;
  knopf.addEventListener("click", () => {
    state.logAlles = !state.logAlles;
    render(state, root);
  });
}

// Die Meldungsliste.
//
// TOBIS BEFUND (16.08.2026, erstes eigenes Spielen der Demo): "log ist grade
// gut für debugging, grausam für spieler. Man sieht alles im ganzen Universum
// passieren."
//
// Deshalb zeigt die Liste in der Vorgabe nur, was den Spieler angeht. Der volle
// Strom bleibt einen Klick entfernt -- er ist beim Fehlersuchen genau das
// richtige Werkzeug, nur eben keins fürs Spielen. Die Wahl liegt im
// Spielstand (`state.logAlles`, fehlt in alten Ständen und ist dann `false`),
// damit sie einen Neustart überlebt.
//
// WAS AUSGEBLENDET WIRD, IST NICHT WEG: gefiltert wird ausschließlich die
// Anzeige, `state.meldungen` bleibt vollständig. Und die Zahl der
// ausgeblendeten Zeilen steht am Knopf -- ein Filter, der stillschweigend
// arbeitet, lässt einen an der Mechanik zweifeln statt am Filter.
function renderMeldungen(state, root) {
  meldungenFilterEinrichten(state, root);
  const liste = root.querySelector("#meldungen-liste");
  const alles = state.logAlles || false;
  const sichtbar = alles ? state.meldungen : state.meldungen.filter(meldungBetrifftSpieler);
  const versteckt = state.meldungen.length - sichtbar.length;

  const knopf = root.querySelector("#meldungen-filter");
  if (knopf) {
    textSetzen(knopf, alles ? t("nur meine") : versteckt > 0 ? t("alles ({n})", { n: versteckt }) : t("alles"));
    knopf.classList.toggle("aktiv", alles);
    attributSetzen(
      knopf,
      "title",
      alles
        ? t("Zeigt gerade jedes Ereignis der Galaxie – gut zum Fehlersuchen. Zurück zu den eigenen Meldungen.")
        : t("Zeigt gerade nur, was dich angeht. Umschalten auf jedes Ereignis der Galaxie.")
    );
  }

  liste.innerHTML = "";
  if (sichtbar.length === 0) {
    liste.innerHTML = `<li class="dezent">${
      state.meldungen.length === 0 ? t("Noch nichts entdeckt.") : t("Nichts, was dich betrifft.")
    }</li>`;
    return;
  }
  for (const eintrag of sichtbar) {
    const li = document.createElement("li");
    // Der Meldungstext selbst wurde bereits beim Entstehen übersetzt und liegt
    // so im Spielstand -- eine Meldung von gestern bleibt in ihrer Sprache
    // stehen, wie ein Logbucheintrag. Nur der Zähler drumherum ist Anzeige.
    li.textContent =
      eintrag.anzahl > 1
        ? t("{text}  (+{anzahl} weitere)", { text: eintrag.text, anzahl: eintrag.anzahl - 1 })
        : eintrag.text;
    if (eintrag.anzahl > 1) {
      li.title = t("{anzahl} gleichartige Meldungen zusammengefasst", { anzahl: eintrag.anzahl });
    }
    liste.appendChild(li);
  }
}
