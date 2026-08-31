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
  TYP_SYMBOL,
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
  ANREICHERUNG_VERLUST,
  ARBEITSKRAFT_LEERLAUF,
} from "./data.js";
import {
  effektiveRaten,
  sichtbareRate,
  lagerKapazitaetGesamt,
  lagerBelegung,
  lagerVollInStunden,
  lagerverbrauchVon,
  naechstesGebaeudeLevel,
  naechstesForschungLevel,
  forschungsFluss,
  spielzeitJetzt,
  spielDatum,
  meldungHinzufuegen,
  meldungBetrifftSpieler,
  neuigkeitenHinweisPruefen,
  neuigkeitenPunktAn,
  neuigkeitenGesehen,
  MOMENTE,
  momentErreicht,
  momentGesehen,
  momentMerken,
  fensterHinweisGesehen,
  fensterHinweisMerken,
  forschungVerfuegbar,
  forschungVoraussetzungenErfuellt,
  laborbedarfKnapp,
  maxReichweite,
  naechsteBasis,
  systemBesucht,
  hatSprungroute,
  supernovaRestMs,
  stromPrioritaet,
  stromPrioritaetSetzen,
  rueckbauen,
  anreicherungAn,
  anreicherungSetzen,
  anreicherungLaeuft,
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
  logistiknetzFreigeschaltet,
  logistikMindestbestandSetzen,
  verarbeitungsReserveFuer,
  verarbeitungsReserveSetzen,
  maxBestandFuer,
  maxBestandSetzen,
  handelsMindestFuer,
  handelsMindestSetzen,
  gebaeudeKosten,
  schiffKosten,
  schiffMaxBezahlbar,
  warteschlangeKosten,
  stueckzahlAus,
  speicherKapazitaet,
  speicherKapazitaetFuerLevel,
  speicherRessourceVon,
  flussSpeicherDeckung,
  pufferReichweiteMs,
  ausbauVorschau,
  planetUebersicht,
  beschaffungsZeiten,
  brennstoffBereit,
  brennstoffReichweiteMs,
  brennstoffProStunde,
  BRENNSTOFF_ANLAUF_MS,
  fossilBereit,
  fossilReichweiteMs,
  fossilVerbrauchProStunde,
} from "./state.js";
import {
  bauStarten,
  forschungStarten,
  kannBauen,
  wartetAuf,
  warteStartSekunden,
  kopfRestSekunden,
  bauWarteschlangeEntfernen,
  warteschlangeVerschieben,
  warteschlangeUmordnen,
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
  planetUmbenennen,
  PLANETENNAME_MAX,
  flotteAufloesen,
  schiffeUmladen,
  tanken,
  siedlerUmladen,
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
  routeMindestbeladungSetzen,
  routeBeladungAnteil,
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
  reichtTreibstoff,
  flotteRestreichweite,
  flugdauerMs,
  schiffeStaerke,
  schiffeText,
  frachtraumFrei,
  flotteTankKapazitaet,
  flotteSiedlerKapazitaet,
  flotteLadungAnteile,
  flotteTankAnteile,
} from "./flotten.js";
import { t, sprache, spracheSetzen, SPRACHEN, gebietsschema } from "./sprache.js";
import { holeSystem, cacheLeeren, objektGesperrt, restLiegtAn } from "./systeme.js";
// Nur für den Neustart-Knopf im Abspann. Der Weg dorthin ist derselbe wie im
// Testmodus (js/testmodus.js) -- ein zweiter Reset wäre eine zweite Wahrheit
// darüber, was "neu anfangen" bedeutet.
import { zuruecksetzen, standAlsText, standDateiname, standPruefen, standUebernehmen } from "./save.js";
import { systemName, sternFuer } from "./galaxie.js";
// Die beiden Karten. Sie holen sich von hier `listeAbgleichen` zurück -- ein
// Ringtausch, der trägt, weil keine der beiden Dateien beim LADEN etwas aus
// der anderen benutzt, sondern erst beim Zeichnen. Die Alternative wäre ein
// zweiter Abgleich-Mechanismus in karte.js gewesen, und genau davor warnt
// Prinzip 5.
import { galaxieKarteZeichnen, systemKarteZeichnen } from "./karte.js";
import { handbuchAbschnitte, handbuchAbsatz, erststartTafel } from "./handbuch.js";
import { feedbackAdresse } from "./feedback.js";
import { PATCHNOTES, ROADMAP_PUNKTE } from "./patchnotes.js";
import { formatZahl as fmt, formatKurz, mitEinheit, einheit, buendelText, buendelSymbole } from "./ressourcen.js";

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

// A-143: dieselbe Umrechnung wie ratenText, aber NICHT ratenText selbst --
// mitEinheit()/einheit() (js/ressourcen.js) geben ihre Einheit unübersetzt
// zurück. Das fällt bei "t"/"MW"/"AK"/"cr" nie auf, weil die in beiden
// Sprachen gleich lauten -- bei Forschung schon: Deutsch "FE", Englisch "RU"
// (FUND aus A-142, live geprüft: die Fluss-Kachel zeigte "0 FE free" in
// Englisch). Deshalb hier die Einheit als eigener, übersetzter Textbaustein
// statt über mitEinheit.
function forschungsRateText(proStunde) {
  return `${formatKurz(rateProJahr(proStunde))} ${t("FE/Jahr")}`;
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

// Wie textSetzen, aber für vertrauenswürdiges MARKUP (z.B. aus vorzeichenSpan,
// A-126) -- nie mit Spielertext füttern, dieselbe Gefahr wie beim Flottennamen
// unten: innerHTML liest ihn als Auszeichnung, nicht als Text.
//
// A-130: geschrieben gegen zuletzt geschrieben (dataset.markupStand), nie
// gegen zurückgelesen -- derselbe Grund wie überall sonst in dieser Runde:
// der Browser serialisiert innerHTML beim Auslesen normalisiert, ein reiner
// Rückvergleich kann deshalb JEDEN Takt fehlschlagen, ohne dass sich am
// Inhalt etwas geändert hat. Eigener Dataset-Schlüssel (nicht `stand`, das
// tragen einzelne Aufrufstellen schon selbst für ihren eigenen Vergleich),
// weil diese Funktion an vielen verschiedenen Elementen aufgerufen wird.
export function markupSetzen(el, html) {
  if (!el || el.dataset.markupStand === html) return;
  el.dataset.markupStand = html;
  el.innerHTML = html;
}

// Freier Spielertext, der über innerHTML in die Seite kommt, wird vom Browser
// als AUSZEICHNUNG gelesen und nicht als Text. Bis A-173 stand hier, der
// Flottenname sei die einzige Stelle, an der der Spieler selbst schreibt --
// das stimmte seit A-082 nicht mehr (Planeten sind umbenennbar) und für einen
// eingespielten Spielstand nie: JEDER Name, der aus dem Spielstand kommt
// (Planet, Welt, Systemobjekt, Flotte), ist Spielertext. Schon ein harmloses
// Alpha & Omega oder <Vorhut> zerlegt damit die Zeile, in der er steht --
// eine Sicherheitsprüfung (A-173) hat es bis zur Codeausführung im Browser
// durchgespielt. KEIN Text aus dem Spielstand geht deshalb je durch
// innerHTML, ohne vorher durch diesen Filter (oder textSetzen/textContent)
// gelaufen zu sein.
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
//
// A-165: die Aufteilung selbst ist eine Aussage über die RESSOURCE (Rate
// gegen Dauerzustand), geteilt zwischen der Text- und der Markup-Fassung
// unten -- nur WIE am Ende geschrieben wird, unterscheidet sich.
function buendelAufteilen(buendel) {
  const proJahr = {};
  const dauerhaft = {};
  for (const [resId, wert] of Object.entries(buendel)) {
    if (RESSOURCEN[resId] && RESSOURCEN[resId].art === "fluss") dauerhaft[resId] = wert;
    else proJahr[resId] = Math.round(rateProJahr(wert));
  }
  return { proJahr, dauerhaft };
}

function ratenBuendelText(buendel, symbolisch = false) {
  const { proJahr, dauerhaft } = buendelAufteilen(buendel);
  const schreib = symbolisch ? buendelSymbole : buendelText;
  const teile = [];
  if (Object.keys(proJahr).length) teile.push(schreib(proJahr) + t("/Jahr"));
  if (Object.keys(dauerhaft).length) teile.push(schreib(dauerhaft));
  return teile.join(symbolisch ? "  " : ", ");
}

// A-165 (P19, Ausbau-Kachel -- Tobis Beispiele "AK"/"t/jahr"/"MW" stehen
// alle drei hier): Markup-Fassung von ratenBuendelText, NICHT deren Umbau --
// Tooltips (die Text-Fassung bedient) können kein Markup tragen, zwei
// Fassungen derselben DARSTELLUNG sind hier richtig (Auftrag, Punkt 4).
//
// Je Eintrag: Symbol ungefärbt, Vorzeichen+Zahl gefärbt (vorzeichenSpan),
// Einheit ungefärbt. `richtung` gilt fürs ganze Bündel (Produktion ist immer
// Zufluss, Verbrauch immer Abgang -- ausbauVorschau trennt schon danach),
// aber jeder EINTRAG bekommt trotzdem sein eigenes Vorzeichen: "Jeder
// Eintrag ist für sich Zufluss oder Abgang" (Auftrag, Punkt 4) -- anders als
// vorher, wo ein einzelnes +/− vor dem ganzen Bündel stand.
function ratenBuendelMarkup(buendel, richtung) {
  const { proJahr, dauerhaft } = buendelAufteilen(buendel);
  const vorzeichen = richtung === "abgang" ? -1 : 1;
  const eintrag = ([resId, betrag], suffix) => {
    const def = RESSOURCEN[resId];
    const symbol = def && def.symbol ? def.symbol : t(def ? def.name : resId);
    const e = einheit(resId);
    return `${symbol} ${vorzeichenSpan(vorzeichen * betrag, formatKurz)}${e ? " " + e : ""}${suffix}`;
  };
  const teile = [];
  if (Object.keys(proJahr).length) {
    teile.push(Object.entries(proJahr).map((e) => eintrag(e, t("/Jahr"))).join("  "));
  }
  if (Object.keys(dauerhaft).length) {
    teile.push(Object.entries(dauerhaft).map((e) => eintrag(e, "")).join("  "));
  }
  return teile.join("  ");
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

// --- Hotkeys (A-029) -------------------------------------------------------
//
// Tobis Wunsch: „können wir einfach hotkeys nehmen für bedienung und die mit in
// die Manual hauen?"
//
// Belegung: 1–9 die Bereiche in Navigationsreihenfolge · Q/E voriger/nächster
// eigener Planet · M Karte (Galaxie) · H Handbuch · Esc schließt eine offene
// Tafel.
//
// DREI REGELN, die diese Belegung erklären:
//
//   1. KEINE Modifier-Kombos. Strg+irgendwas gehört dem Browser, und ein Spiel,
//      das dem Browser Tasten wegnimmt, gewinnt diesen Streit nie.
//   2. KEINE Hotkeys mit Wirkung auf die Welt — nur Navigation und Ansicht. Ein
//      „Bauen"-Hotkey wäre ein verschluckter Klick in neuer Form: man drückt
//      ihn versehentlich, und etwas passiert, das man nicht wollte. Prinzip 8a
//      handelt davon, dass Klicks ankommen sollen; sein Gegenstück ist, dass
//      nichts ankommt, was man nicht gedrückt hat.
//   3. NICHTS, solange ein Eingabefeld den Fokus hat. Sonst kann niemand mehr
//      eine „3" in das Rückzugsschwellen-Feld tippen.
//
// Der Listener hängt EINMAL an document — er überlebt jede Render-Runde, und
// genau deshalb darf er nicht bei jedem Zeichnen neu gesetzt werden (Lernpunkt 1
// aus Prinzip 8a: nach einer Stunde wären es sonst dreitausend Listener und ein
// Tastendruck löste dreitausend Bereichswechsel aus).
let hotkeysVerdrahtet = false;

function tippendGerade() {
  const el = typeof document !== "undefined" ? document.activeElement : null;
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function hotkeysEinrichten(state, root) {
  if (hotkeysVerdrahtet || typeof document === "undefined") return;
  hotkeysVerdrahtet = true;

  document.addEventListener("keydown", (ereignis) => {
    if (ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey) return;
    if (tippendGerade()) return;

    const taste = ereignis.key;

    // Esc schließt, was offen ist. Das Einstellungsfenster ZUERST und mit
    // eigenem Zweig (A-140): es hat mit der Erstklärung nichts zu tun, und
    // hinge sein Schließen am selben Zweig, setzte ein Esc im Einstellungs-
    // fenster nebenbei state.erstklaerungGesehen -- die Falle, die der Auftrag
    // ausdrücklich benennt. Künftige Tafeln kommen hier dazu, jede mit ihrem
    // eigenen Zweig, statt sich einen gemeinsamen Weg zu teilen.
    if (taste === "Escape") {
      if (einstellungenOffen) {
        einstellungenOffen = false;
        render(state, root);
        ereignis.preventDefault();
        return;
      }
      if (!state.erstklaerungGesehen && !state.ende) {
        state.erstklaerungGesehen = true;
        render(state, root);
        ereignis.preventDefault();
      }
      return;
    }

    // 1–9: die Bereiche in der Reihenfolge, in der sie in der Leiste stehen.
    // Dieselbe Liste, kein zweites Register — wer unten einen Bereich ergänzt,
    // bekommt seine Taste automatisch.
    const nummer = Number(taste);
    if (Number.isInteger(nummer) && nummer >= 1 && nummer <= BEREICHE.length) {
      aktiverBereich = BEREICHE[nummer - 1].id;
      render(state, root);
      ereignis.preventDefault();
      return;
    }

    const klein = taste.toLowerCase();

    // M und H sind Abkürzungen auf zwei dieser Bereiche — sie haben ohnehin
    // eine Zahl, aber „Karte" und „Handbuch" merkt man sich als Buchstaben.
    if (klein === "m" || klein === "h") {
      aktiverBereich = klein === "m" ? "galaxie" : "handbuch";
      render(state, root);
      ereignis.preventDefault();
      return;
    }

    // Q/E: durch die eigenen Welten blättern. Über dasselbe Feld wie die
    // Planetenwahl im Kopf (state.aktiverPlanet), kein zweiter Mechanismus.
    if (klein === "q" || klein === "e") {
      const meine = planetenVon(state);
      if (meine.length < 2) return;
      const jetzt = meine.findIndex((p) => p.id === state.aktiverPlanet);
      const schritt = klein === "e" ? 1 : -1;
      // Modulo mit + meine.length: -1 % n ist in JavaScript negativ.
      const naechster = meine[(((jetzt < 0 ? 0 : jetzt) + schritt) % meine.length + meine.length) % meine.length];
      state.aktiverPlanet = naechster.id;
      render(state, root);
      ereignis.preventDefault();
    }
  });
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
  renderGrundskalierung(state, root);
  renderEinstellungen(state, root);
  renderSprachwahl(state, root);
  renderFeedbackLink(root);
  renderFesteTexte(root);
  root.querySelector("#planet-name").textContent = planet.name;
  root.querySelector("#planet-koordinaten").textContent = t("{system} · Orbit {orbit} · {art}", {
    system: systemName(state.galaxie.seed, planet.systemId),
    orbit: planet.orbit,
    art: planetArtText(planet),
  });

  teil("planetenwahl", () => renderPlanetenwahl(state, root));
  teil("ressourcen", () => renderRessourcen(state, root, planet));
  // VOR der Navigation: ist der Development-Bereich offen, gelten die
  // Neuigkeiten als gesehen -- der Punkt erlischt dann im selben Takt, in
  // dem der Bereich aufgeht. Hier und nicht in den Klick-Wegen: ob
  // Meldungsklick oder Navigationsklick, beide enden im sichtbaren Bereich,
  // und genau das bezeugt der Merker (A-047).
  if (aktiverBereich === "development") neuigkeitenGesehen(state, VERSION);
  teil("navigation", () => renderNavigation(state, root, planet));
  teil("status", () => renderStatus(state, root, planet, jetzt));
  // Ab hier nur noch, was zu sehen ist. Die Reihenfolge bleibt wie gehabt --
  // sie ist an mehreren Stellen begründet (Abspann vor Erstklärung, Handbuch
  // vor dem Hinweis).
  const sichtbar = (name) => bereichSichtbar(root, name);
  if (sichtbar("imperium")) teil("imperium", () => renderImperium(state, root));
  if (sichtbar("planet")) {
    teil("uebersicht", () => renderUebersicht(state, root, planet));
    teil("gebaeude", () => renderGebaeude(state, root, planet));
  }
  // A-153: der Lager-Bereich uebernimmt die Bestaende samt der Verarbeitungs-
  // Reserve -- ihr alter Platz im Planet-Bereich (renderVerarbeitung) ist
  // damit weg, nicht verdoppelt.
  if (sichtbar("lager")) teil("lager", () => renderLager(state, root, planet));
  if (sichtbar("forschung")) teil("forschung", () => renderForschung(state, root, planet));
  if (sichtbar("werft")) teil("werft", () => renderWerft(state, root, planet, jetzt));
  if (sichtbar("handel")) {
    teil("markt", () => renderMarkt(state, root, planet));
    teil("logistiknetz", () => renderLogistiknetz(state, root, planet, jetzt));
  }
  if (sichtbar("flotten")) teil("flotten", () => renderFlotten(state, root, planet, jetzt));
  if (sichtbar("galaxie")) {
    // Kommando ZUERST: es rechnet die Lage (Flotte, Ziel, Dauer) und legt die
    // Vorschaulinie ab, die renderGalaxie gleich darauf an die Karte gibt.
    teil("kommando", () => renderKommando(state, root, jetzt));
    teil("galaxie", () => renderGalaxie(state, root));
    teil("system", () => renderSystem(state, root, jetzt));
  }
  if (sichtbar("handbuch")) teil("handbuch", () => renderHandbuch(root));
  if (sichtbar("development")) teil("development", () => renderDevelopment(state, root));
  // Nach dem Handbuch, damit der Hinweis im selben Takt in der Liste landet.
  handbuchHinweisPruefen(state);
  oberflaecheHinweisPruefen(state);
  momenteHinweisPruefen(state);
  neuigkeitenHinweisPruefen(
    state,
    VERSION,
    t("Neu in v{version} – was sich geändert hat", { version: VERSION })
  );
  // fensterHinweisPruefen läuft NICHT hier, sondern aus main.js, aus dem
  // echten Sekundentakt -- Begründung an ihrer Definition weiter unten.
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
      // Sprungmarke: eine Meldung kann direkt hierher führen (A-040). Die
      // Kennung kommt aus dem Abschnitt selbst, damit es keine zweite Liste
      // von Ankern gibt, die man vergessen kann (Prinzip 5).
      h3.id = `handbuch-${abschnitt.id}`;
      const absaetze = abschnitt.absaetze.map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      });
      // Gegliederte Abschnitte (A-019): Zwischentitel plus Liste. Bisher gab
      // es nur Fließtext, und für eine Roadmap ist der falsch -- man liest sie
      // überfliegend ("ist mein Fund schon bekannt?"), nicht am Stück.
      for (const gruppe of abschnitt.gruppen || []) {
        const h4 = document.createElement("h4");
        h4.textContent = gruppe.titel;
        const ul = document.createElement("ul");
        for (const punkt of gruppe.punkte) {
          const li = document.createElement("li");
          li.textContent = punkt;
          ul.appendChild(li);
        }
        absaetze.push(h4, ul);
      }
      if (abschnitt.schluss) {
        const p = document.createElement("p");
        p.textContent = abschnitt.schluss;
        absaetze.push(p);
      }
      // Ein Abschnitt darf einen einzigen Verweis nach draußen tragen (A-018).
      // Er kommt ans Ende und ist ein echter Link, kein Knopf: der Browser
      // soll ihn als das behandeln, was er ist -- mit Mittelklick, Kontextmenü
      // und allem, was ein Nutzer von einem Link erwartet.
      if (abschnitt.link) {
        const p = document.createElement("p");
        p.appendChild(externerLink(abschnitt.link.adresse, abschnitt.link.text));
        absaetze.push(p);
      }
      return [h3, ...absaetze];
    })
  );
}

// Ein Link, der das Spiel nicht verlässt.
//
// `noopener` ist hier keine Formalie: ohne ihn bekommt die geöffnete Seite
// über window.opener einen Griff auf DIESEN Tab und könnte ihn wegnavigieren
// -- mitten in einer laufenden Partie. `noreferrer` steht dazu, weil ältere
// Browser den ersten Wert allein nicht kennen.
function externerLink(adresse, text) {
  const a = document.createElement("a");
  a.href = adresse;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;
  return a;
}

// Der Feedback-Verweis im Kopf (A-018).
//
// Er hängt an keinem Spielzustand, aber an der SPRACHE: der vorbefüllte
// Formulartext ist übersetzt. Deshalb dasselbe Muster wie beim Handbuch --
// einmal je Sprache setzen statt im Sekundentakt. Ein href, das jede Sekunde
// neu geschrieben wird, ist zwar harmlos, aber es ist auch jede Sekunde
// vergebliche Arbeit an einem Element, das sich nie ändert.
function renderFeedbackLink(root) {
  const a = root.querySelector("#feedback-link");
  if (!a || a.dataset.gezeichnet === sprache()) return;
  a.dataset.gezeichnet = sprache();
  a.href = feedbackAdresse();
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

// Sprachwahl im Einstellungsfenster (A-140 -- bis dahin stand sie im Kopf).
// Wird bei jedem Rendern neu aufgebaut wie alles andere; der aktive Knopf
// trägt dieselbe .aktiv-Markierung wie sonst im Spiel.
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

// Ein fehlendes Feld liest sich als 100 % (Kategorie 1, siehe Auftrag) -- ein
// Spielstand von vor dieser Runde kennt state.grundskalierung nicht und soll
// trotzdem unverändert aussehen.
function grundskalierungWert(state) {
  return state.grundskalierung || 100;
}

// Das Einstellungsfenster (A-140, R-24). Zahnrad im Kopf auf, Esc oder der
// eigene Schließen-Knopf zu -- siehe hotkeysEinrichten für die Esc-Falle
// (nicht mit der Erstklärung verwechseln). Der Inhalt ist STATISCHES Markup
// (index.html), diese Funktion verdrahtet nur einmal und zieht danach bei
// jedem Aufruf den aktuellen Stand nach -- dasselbe Muster wie die
// Statusspalte (renderStatus/griff.dataset.verdrahtet).
function renderEinstellungen(state, root) {
  const el = root.querySelector("#einstellungen");
  if (!el) return;

  const knopf = root.querySelector("#einstellungen-knopf");
  if (knopf) {
    textSetzen(knopf, SYMBOLE.einstellungen);
    if (!knopf.dataset.verdrahtet) {
      knopf.dataset.verdrahtet = "1";
      knopf.addEventListener("click", () => {
        einstellungenOffen = true;
        render(state, root);
      });
    }
  }

  // Nach dem Ende hat sich die Frage erledigt -- dieselbe Begründung wie bei
  // der Erstklärung. Ohne diesen Zweig läge das Fenster (gleicher z-index,
  // aber später im Markup als der Abspann) sichtbar ÜBER dem Ende des Spiels,
  // wäre es beim Eintreten von state.ende gerade offen gewesen.
  if (state.ende) {
    el.hidden = true;
    einstellungenOffen = false;
    return;
  }
  el.hidden = !einstellungenOffen;
  if (!einstellungenOffen) return;

  const schliessen = root.querySelector("#einstellungen-schliessen");
  if (schliessen && !schliessen.dataset.verdrahtet) {
    schliessen.dataset.verdrahtet = "1";
    schliessen.addEventListener("click", () => {
      einstellungenOffen = false;
      render(state, root);
    });
  }

  const regler = root.querySelector("#grundskalierung-regler");
  if (regler && !regler.dataset.verdrahtet) {
    regler.dataset.verdrahtet = "1";
    regler.addEventListener("input", () => {
      state.grundskalierung = Number(regler.value);
      render(state, root);
    });
  }
  const prozent = grundskalierungWert(state);
  if (regler && Number(regler.value) !== prozent) regler.value = String(prozent);
  textSetzen(root.querySelector("#grundskalierung-wert"), `${prozent}%`);
}

// Die Grundskalierung wirkt an der Wurzel (:root, font-size) -- die
// rem-Schriftskala (--schrift-*) und jeder Abstand in rem ziehen darüber
// automatisch mit, siehe css/style.css. Bei 100 % bleibt die Seite
// PIXELGLEICH zu vorher: kein font-size auf documentElement ist etwas anderes
// als font-size:100%, aber "unverändert lassen" ist die buchstäblichere
// Erfüllung von Fertig-Kriterium 1 als "auf den alten Wert setzen".
function renderGrundskalierung(state, root) {
  if (typeof document === "undefined") return;
  const wurzel = document.documentElement;
  const prozent = grundskalierungWert(state);
  if (prozent === 100) wurzel.style.removeProperty("font-size");
  else wurzel.style.fontSize = `${prozent}%`;
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

// Brennstoff-Zeile der Energie-Kachel (A-055, Prinzip 10a): WANN geht dem
// Reaktor das Deuterium aus -- bevor es passiert, nicht danach. Die Zahl ist
// bewusst konservativ (Bestand ÷ Verbrauch, ohne Zufluss): sie ist eine
// Warnung, keine Prognose. Dieselbe Bauform wie die Speicher-Zeile darunter.
//
// A-076: liefert WERTE, kein HTML. Die Zeile ist ein fester Knoten in der
// Kachel und bekommt bloß frische Werte -- siehe renderRessourcen.
function kraftwerkBrennstoffZeile(planet, stufe) {
  if (!brennstoffBereit(planet, BUILDINGS.kraftwerk, stufe)) {
    const text = t("Kein Brennstoff – der Reaktor ist aus. Er zündet wieder, sobald Deuterium für {dauer} im Lager liegt.", {
      dauer: fmtDauer(BRENNSTOFF_ANLAUF_MS / 1000),
    });
    return { titel: text, text: `⚛️ ${t("Kein Brennstoff – Reaktor aus")}`, warnung: true };
  }
  const reichweite = brennstoffReichweiteMs(planet);
  if (!Number.isFinite(reichweite)) return null;
  // DIE BEDINGUNG DIESER ZAHL (A-088, die A-050-Lehre: eine Zahl ohne ihre
  // Bedingung ist eine halbe Auskunft).
  //
  // Gemessen ist: der Reaktor verbrennt bei JEDER Last dieselbe Menge --
  // Stufe 1 zieht 165 t je Echtzeitstunde bei Last 0 wie bei Last 300 %. Was
  // die Reichweite bewegt, ist allein die Ausbaustufe (Stufe 3 verbrennt das
  // 3,6-fache).
  // Genau daran ist die Zahl missverstanden worden: „1.790 Jahre" neben
  // einer Last von 0 liest sich als „er verbrennt gerade fast nichts".
  //
  // Der Verbrauch steht deshalb NEBEN der Dauer -- aber im Tooltip und in
  // der Übersicht, nicht in der Kachelzeile: dort ist er GEMESSEN nicht
  // unterzubringen. „⚛️ Brennstoff für 1.791,8 Jahre" ist 186 px breit, die
  // Zeile 245 px; jeder Zusatz bricht um und zieht die ganze Reihe der
  // Fluss-Kacheln von 84 auf 98 px -- und zwar mal so, mal nicht, je nachdem
  // wie lang die Zahl gerade ist (bei Stufe 8 passt sie wieder). Ein Umbruch,
  // der beim Ausbauen des Kraftwerks kippt, ist ein Layout-Sprung.
  const verbrauchText = Object.entries(brennstoffProStunde(planet))
    .map(([resId, proStunde]) => ratenText(resId, proStunde))
    .join(" · ");
  const titel = [
    t("Deuterium im Lager geteilt durch den Verbrauch des Kraftwerks – Zufluss nicht eingerechnet."),
    t(
      "Der Reaktor verbrennt bei jeder Last gleich viel: Stufe {stufe} zieht {rate}, ausgelastet wie im Leerlauf. Jede weitere Ausbaustufe zieht mehr – die Reichweite gilt für die jetzige Stufe.",
      { stufe, rate: verbrauchText }
    ),
  ].join("\n");
  const knapp = reichweite < 24 * 3600 * 1000;
  return {
    titel,
    text: `⚛️ ${t("Brennstoff für {dauer}", { dauer: fmtDauer(reichweite / 1000) })}`,
    warnung: knapp,
  };
}

// A-148: dritte Anlage mit demselben Lager-Brennstoff-Mechanismus wie das
// Kraftwerk (nur Uran statt Deuterium) -- deshalb dieselben Bausteine
// (brennstoffBereit/brennstoffReichweiteMs/brennstoffProStunde), nur mit
// kernkraftanlage-eigenem Wortlaut. Absichtlich eine eigene Funktion statt
// einer geteilten Abstraktion über den Stoffnamen: dieselbe Kollegen-Wahl
// wie bei rohRaten/produktionsAufloesung (siehe deren Kommentare) -- zwei
// explizite Funktionen sind hier lesbarer als eine, die "Deuterium"/"Uran"
// und "Reaktor" als Parameter durchreicht.
function kernkraftBrennstoffZeile(planet, stufe) {
  if (!brennstoffBereit(planet, BUILDINGS.kernkraftanlage, stufe)) {
    const text = t("Kein Brennstoff – der Reaktor ist aus. Er zündet wieder, sobald Uran für {dauer} im Lager liegt.", {
      dauer: fmtDauer(BRENNSTOFF_ANLAUF_MS / 1000),
    });
    return { titel: text, text: `☢️ ${t("Kein Brennstoff – Reaktor aus")}`, warnung: true };
  }
  const reichweite = brennstoffReichweiteMs(planet);
  if (!Number.isFinite(reichweite)) return null;
  const verbrauchText = Object.entries(brennstoffProStunde(planet))
    .map(([resId, proStunde]) => ratenText(resId, proStunde))
    .join(" · ");
  const titel = [
    t("Uran im Lager geteilt durch den Verbrauch der Kernkraftanlage – Zufluss nicht eingerechnet."),
    t(
      "Der Reaktor verbrennt bei jeder Last gleich viel: Stufe {stufe} zieht {rate}, ausgelastet wie im Leerlauf. Jede weitere Ausbaustufe zieht mehr – die Reichweite gilt für die jetzige Stufe.",
      { stufe, rate: verbrauchText }
    ),
  ].join("\n");
  const knapp = reichweite < 24 * 3600 * 1000;
  return {
    titel,
    text: `☢️ ${t("Brennstoff für {dauer}", { dauer: fmtDauer(reichweite / 1000) })}`,
    warnung: knapp,
  };
}

// A-147: zweite Anlage mit demselben Zeilen-Slot. Kein zweites Format --
// dieselbe "Brennstoff für {dauer}"-Form wie beim Kraftwerk (grep
// "Brennstoff für"), nur ohne Lager-Ressource: der Verbrauch ist keine
// RESSOURCEN-Größe und läuft deshalb nicht über ratenText/mitEinheit,
// sondern über einen eigenen "t/Jahr"-Text (dasselbe Vorgehen wie
// forschungsRateText für Forschungseinheiten).
function fossilBrennstoffZeile(planet, stufe) {
  if (!fossilBereit(planet, BUILDINGS.fossilanlage, stufe)) {
    return {
      titel: t("Der fossile Vorrat dieses Planeten ist aufgebraucht – anders als Brennstoff aus dem Lager wächst er nicht nach."),
      text: `🛢️ ${t("Fossiler Vorrat aufgebraucht")}`,
      warnung: true,
    };
  }
  const reichweite = fossilReichweiteMs(planet);
  if (!Number.isFinite(reichweite)) return null;
  const proStunde = fossilVerbrauchProStunde(BUILDINGS.fossilanlage, stufe);
  const titel = [
    t("Fossiler Vorrat geteilt durch den Verbrauch der Fossilanlage – der Vorrat wächst nie nach."),
    t("Stufe {stufe} verbrennt {rate} t/Jahr. Jede weitere Ausbaustufe zieht mehr – die Reichweite gilt für die jetzige Stufe.", {
      stufe,
      rate: formatKurz(rateProJahr(proStunde)),
    }),
  ].join("\n");
  const knapp = reichweite < 24 * 3600 * 1000;
  return {
    titel,
    text: `🛢️ ${t("Brennstoff für {dauer}", { dauer: fmtDauer(reichweite / 1000) })}`,
    warnung: knapp,
  };
}

// Brennstoff-Zeile der Energie-Kachel (A-055, Prinzip 10a): WANN geht dem
// Reaktor das Deuterium aus -- bevor es passiert, nicht danach. Die Zahl ist
// bewusst konservativ (Bestand ÷ Verbrauch, ohne Zufluss): sie ist eine
// Warnung, keine Prognose. Dieselbe Bauform wie die Speicher-Zeile darunter.
//
// A-076: liefert WERTE, kein HTML. Die Zeile ist ein fester Knoten in der
// Kachel und bekommt bloß frische Werte -- siehe renderRessourcen.
//
// A-147/A-148: bis zu drei brennstoffgebundene Energiequellen. BIS A-168
// EIN Slot, Priorität Kraftwerk vor Kernkraftanlage vor Fossilanlage -- wer
// ein Kraftwerk hatte, sah nie den Zustand seiner anderen Anlagen (Tobis
// Fund 31.08.: "ich sehe nirgendwo etwas zu Fossilen Brennstoffen", während
// seine Fossilanlage längst stillstand). Seit A-168 bekommt JEDE gebaute
// Anlage ihre eigene Zeile -- Reihenfolge unverändert Kraftwerk,
// Kernkraftanlage, Fossilanlage.
//
// BEKANNTER RAND-FALL, NICHT TEIL DIESER RUNDE: brennstoffReichweiteMs/
// brennstoffProStunde sind planetweite Minima/Summen über ALLE
// Lager-Brennstoff-Gebäude (BRENNSTOFF_GEBAEUDE), nicht je Anlage getrennt.
// Stehen Kraftwerk UND Kernkraftanlage gleichzeitig (erst seit A-149 selten,
// aber möglich), zeigen beide Zeilen dieselbe Reichweite-Zahl, auch wenn sie
// unterschiedliche Ressourcen (Deuterium/Uran) verbrennen -- vor A-168 war
// das unsichtbar (nur eine der beiden stand je da), jetzt wird es sichtbar.
// Fossilanlage ist davon nicht betroffen: fossilReichweiteMs kennt nur sie.
function brennstoffZeilen(planet) {
  const kraftwerkStufe = (planet.gebaeude && planet.gebaeude.kraftwerk) || 0;
  const kernkraftStufe = (planet.gebaeude && planet.gebaeude.kernkraftanlage) || 0;
  const fossilStufe = (planet.gebaeude && planet.gebaeude.fossilanlage) || 0;

  // A-142 (= A-108 Punkt 3, R-8/G4): Keine Brennstoffanlage heißt keine
  // Buchung, nicht "nichts zu sagen" -- der Slot bleibt reserviert statt zu
  // verschwinden. Das war der A-104-Befund: eine frische Kolonie verlor
  // hier eine ganze Zeile, die Kopfreihe wurde flacher, und alles darunter
  // rutschte hoch (der ~20-px-Versatz aus Tobis Bericht). Unverändert seit
  // A-142, jetzt nur der einzige Eintrag einer Liste statt der einzige
  // Rückgabewert einer Funktion.
  if (kraftwerkStufe <= 0 && kernkraftStufe <= 0 && fossilStufe <= 0) {
    return [
      {
        schluessel: "leer",
        titel: t("Ohne Kraftwerk oder Fossilanlage gibt es keinen Brennstoffverbrauch zu zeigen."),
        text: `⚡ ${t("Keine brennstoffgebundene Anlage gebaut")}`,
        warnung: false,
      },
    ];
  }

  const zeilen = [];
  if (kraftwerkStufe > 0) {
    const z = kraftwerkBrennstoffZeile(planet, kraftwerkStufe);
    if (z) zeilen.push({ schluessel: "kraftwerk", ...z });
  }
  if (kernkraftStufe > 0) {
    const z = kernkraftBrennstoffZeile(planet, kernkraftStufe);
    if (z) zeilen.push({ schluessel: "kernkraft", ...z });
  }
  if (fossilStufe > 0) {
    const z = fossilBrennstoffZeile(planet, fossilStufe);
    if (z) zeilen.push({ schluessel: "fossil", ...z });
  }
  return zeilen;
}

function flussSpeicherZeile(planet, resId, netto) {
  const def = RESSOURCEN[resId];
  // Keine Speicherfähigkeit -- bleibt für immer kollabiert (G4: kollabieren
  // darf nur, was in KEINEM Kontext je gefüllt wird; Arbeitskraft/Forschung
  // treffen das strukturell, nicht nur gerade jetzt).
  if (!def.speicher) return null;
  const grenze = speicherKapazitaet(planet, resId);
  if (!grenze) {
    // A-142 (= A-108 Punkt 3, R-8/G4): noch kein Speicher gebaut, aber die
    // Zeile bleibt STEHEN statt zu verschwinden -- derselbe Befund wie bei
    // brennstoffZeile oben. Der leere Balken (anteil 0) ist die ehrlichste
    // Darstellung von "Kapazität null".
    const gebaeudeName = t(BUILDINGS[def.speicher.gebaeude].name);
    return {
      titel: t("Noch kein {gebaeude} gebaut – die Zeile wartet auf den Bau.", { gebaeude: gebaeudeName }),
      stand: `🔋 ${t("Kein {gebaeude} gebaut", { gebaeude: gebaeudeName })}`,
      zustand: "",
      warnung: false,
      anteil: 0,
    };
  }
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
    stand: `🔋 ${fmt(bestand)} / ${fmt(grenze)} ${einh}`,
    zustand,
    warnung: netto < 0,
    anteil,
  };
}

// --- Die Ressourcenleiste: Gerüst einmal, Werte im Takt (A-076) -------------
//
// DAS WAR DIE URSACHE VON „das Hovern braucht mehrere Anläufe" (Tobis Bericht,
// 18.08., Firefox). Hier stand `leiste.innerHTML = …` in JEDEM Sekundentakt --
// damit war jede Kachel dieser Leiste einmal je Sekunde ein ANDERES
// DOM-Element. Ein nativer `title`-Hinweis braucht rund eine Sekunde ruhigen
// Zeigers, bis der Browser ihn zeigt; wird der Knoten unterm Zeiger in dieser
// Sekunde ersetzt, verwirft der Browser den angelaufenen Hinweis und wartet
// auf die nächste Mausbewegung. Genau das fühlt sich wie „mehrfach drauflegen"
// an -- und es traf ausgerechnet die Leiste, die in JEDEM Bereich zu sehen ist.
//
// Gemessen im Browser (drei Renderdurchläufe, alle neun Bereiche): von 119
// Knoten mit `title` im ganzen Spiel überlebten 102 -- die 17 der
// Ressourcenleiste waren die einzigen, die es NICHT taten, und zwar 0 von 17
// in jedem einzelnen Bereich. Der Rest des Spiels folgt längst dem Muster aus
// Prinzip 8a; hier fehlte es als letzte Stelle.
//
// Deshalb dasselbe Muster wie überall sonst: Gerüst einmal bauen,
// `listeAbgleichen` hält die Kacheln, `textSetzen`/`attributSetzen` bringen die
// Werte. Die Hinweistexte selbst bleiben unverändert -- sie wandern nur ins
// Attribut eines Knotens, der stehen bleibt.
function resKachelGeruest() {
  const div = document.createElement("div");
  div.innerHTML = `
      <span class="res-oben">
        <span class="res-name"></span>
      </span>
      <span class="res-unten">
        <span class="res-zahl">
          <span class="res-symbol"></span>
          <span class="res-wert"></span>
        </span>
        <span class="res-rate"></span>
      </span>
      <span class="res-zusatz" hidden></span>`;
  return div;
}

function resKachelFuellen(
  div,
  { symbol, name, wert, rate, rateKlasse = "", klassen = "", titel = "", farbe = "", zusatz = "" }
) {
  div.className = `res-kachel ${klassen}`;
  attributSetzen(div, "title", titel);
  // Genau die Schreibweise von vorher: `.res-kachel[style*="--res-farbe"]`
  // (css/style.css) prüft das ATTRIBUT, nicht die berechnete Eigenschaft --
  // ohne Farbe darf deshalb gar kein style-Attribut dastehen.
  attributSetzen(div, "style", farbe ? `--res-farbe:${farbe}` : null);
  textSetzen(div.querySelector(".res-symbol"), symbol);
  textSetzen(div.querySelector(".res-name"), name);
  textSetzen(div.querySelector(".res-wert"), wert);
  const rateEl = div.querySelector(".res-rate");
  rateEl.className = `res-rate ${rateKlasse}`;
  // A-126 (P19): `rate` kann jetzt eine vorzeichenSpan-Markup-Stelle tragen
  // (nie Spielertext -- alle Aufrufer liefern hier nur Systemzahlen/-labels).
  markupSetzen(rateEl, rate);
  // `.res-zusatz` ist seit A-052 leer und bleibt es. Der Knoten steht im
  // Gerüst, damit er beim nächsten Gebrauch nicht neu erfunden wird -- als
  // `hidden` ist er kein Rasterkind und kostet keine Zeile (die Warnung in
  // css/style.css gilt weiter: wer ihn füllt, misst vorher die Reihenhöhe).
  const zusatzEl = div.querySelector(".res-zusatz");
  zusatzEl.hidden = !zusatz;
  textSetzen(zusatzEl, zusatz);
}

// Die Kachel einer Fluss-Ressource. Zwei Zeilen mehr als die Bestandskachel:
// Speicherstand und Brennstoff. Beide sind FESTE Knoten und werden versteckt,
// wenn es sie gerade nicht gibt -- `[hidden]` nimmt sie aus dem Fluss, die
// Kachelhöhe ist also dieselbe wie zuvor mit dem bedingten Einfügen.
function flussKachelGeruest() {
  const div = document.createElement("div");
  div.innerHTML = `
        <span class="res-oben">
          <span class="res-name"></span>
        </span>
        <span class="res-unten" style="flex-direction:column;align-items:stretch;gap:.2rem">
          <span style="display:flex;justify-content:space-between;gap:.5rem">
            <span class="res-zahl">
              <span class="res-symbol"></span>
              <span class="res-wert"></span>
            </span>
            <span class="res-rate"></span>
          </span>
          <span class="energie-balken-rahmen">
            <span class="energie-balken"></span>
          </span>
          <span class="speicher-zeile" style="display:flex;justify-content:space-between;gap:.5rem" hidden>
            <span class="dezent speicher-stand"></span>
            <span class="speicher-zustand"></span>
          </span>
          <span class="energie-balken-rahmen speicher-rahmen" hidden>
            <span class="energie-balken speicher"></span>
          </span>
          <span class="brennstoff-zeilen" style="display:flex;flex-direction:column;gap:.2rem" hidden></span>
        </span>`;
  return div;
}

function flussKachelFuellen(div, { symbol, name, wert, rate, knapp, auslastung, speicher, brennstoffZeilen, titel }) {
  div.className = "res-kachel energie";
  attributSetzen(div, "title", titel);
  textSetzen(div.querySelector(".res-symbol"), symbol);
  textSetzen(div.querySelector(".res-name"), name);

  const wertEl = div.querySelector(".res-wert");
  wertEl.className = `res-wert ${knapp ? "warnung" : ""}`;
  textSetzen(wertEl, wert);
  const rateEl = div.querySelector(".res-rate");
  rateEl.className = `res-rate ${knapp ? "warnung" : ""}`;
  textSetzen(rateEl, rate);

  const balken = div.querySelector(".energie-balken");
  balken.className = `energie-balken ${knapp ? "warnung" : ""}`;
  attributSetzen(balken, "style", `width:${Math.min(100, auslastung * 100).toFixed(1)}%`);

  const speicherZeile = div.querySelector(".speicher-zeile");
  speicherZeile.hidden = !speicher;
  div.querySelector(".speicher-rahmen").hidden = !speicher;
  if (speicher) {
    attributSetzen(speicherZeile, "title", speicher.titel);
    textSetzen(div.querySelector(".speicher-stand"), speicher.stand);
    const zustandEl = div.querySelector(".speicher-zustand");
    zustandEl.className = `dezent speicher-zustand ${speicher.warnung ? "warnung" : ""}`;
    textSetzen(zustandEl, speicher.zustand);
    attributSetzen(
      div.querySelector(".energie-balken.speicher"),
      "style",
      `width:${(speicher.anteil * 100).toFixed(1)}%`
    );
  }

  // A-168: JEDE gebaute brennstoffgebundene Anlage bekommt ihre eigene
  // Zeile -- `listeAbgleichen` wie bei den Lagerbalken-Segmenten, statt
  // eines einzelnen Knotens, den nur eine Anlage gewinnen konnte.
  const brennContainer = div.querySelector(".brennstoff-zeilen");
  const zeilenListe = brennstoffZeilen || [];
  brennContainer.hidden = zeilenListe.length === 0;
  listeAbgleichen(brennContainer, zeilenListe, {
    schluessel: (z) => z.schluessel,
    bauen: () => {
      const span = document.createElement("span");
      span.className = "dezent brennstoff-zeile";
      return span;
    },
    aktualisieren: (span, z) => {
      span.className = `dezent brennstoff-zeile ${z.warnung ? "warnung" : ""}`;
      attributSetzen(span, "title", z.titel);
      textSetzen(span, z.text);
    },
  });
}

function lagerKachelGeruest() {
  const div = document.createElement("div");
  div.className = "res-kachel lager";
  div.innerHTML = `
      <span class="res-oben">
        <span class="res-name"></span>
      </span>
      <span class="res-unten" style="flex-direction:column;align-items:stretch;gap:.2rem">
        <span class="res-zahl">
          <span class="res-symbol">📦</span>
          <span class="res-wert"></span>
        </span>
        <span class="lager-balken-rahmen"></span>
        <span class="lager-prognose"></span>
      </span>`;
  return div;
}

// Der gestapelte Balken selbst -- EIN Helfer für alle drei Stellen, die ihn
// benutzen (Lager, und seit A-118 Frachtraum und Tank im Flottendetail).
// Segmente tragen `transition: width` (css/style.css) -- ein Segment, das
// jede Sekunde neu entsteht, kann gar nicht überblenden, weil es keinen
// Vorzustand hat, deshalb `listeAbgleichen` statt `innerHTML`.
function balkenFuellen(rahmenEl, segmente) {
  listeAbgleichen(rahmenEl, segmente, {
    schluessel: (s) => s.resId,
    bauen: () => {
      const span = document.createElement("span");
      span.className = "lager-segment";
      return span;
    },
    aktualisieren: (span, s) => {
      attributSetzen(span, "title", s.titel);
      attributSetzen(span, "style", `width:${Math.min(100, s.anteil * 100).toFixed(2)}%;background:${s.farbe}`);
    },
  });
}

function lagerKachelFuellen(div, { titel, wert, segmente, prognose }) {
  attributSetzen(div, "title", titel);
  textSetzen(div.querySelector(".res-name"), t("Lager"));
  textSetzen(div.querySelector(".res-wert"), wert);
  textSetzen(div.querySelector(".lager-prognose"), prognose);
  balkenFuellen(div.querySelector(".lager-balken-rahmen"), segmente);
}

// A-162 Teil 3: dieselbe Bauform wie der Meldungsgriff (A-144,
// meldungenGriffEinrichten) -- ein modulweiter Wächter gegen doppelte
// Verdrahtung (Prinzip 8a, der Knopf steht nur einmal im Gerüst, aber
// renderRessourcen läuft jeden Takt), der Zustand im SPIELSTAND statt in der
// Sitzung (state.bestandsreiheZu, `|| false`-Muster wie state.meldungenZu --
// ein fehlendes Feld in einem alten Stand liest sich als "offen").
let ressourcenBestandGriffVerdrahtet = false;

function ressourcenBestandGriffEinrichten(state, root) {
  if (ressourcenBestandGriffVerdrahtet) return;
  const knopf = root.querySelector("#res-bestand-griff");
  if (!knopf) return;
  ressourcenBestandGriffVerdrahtet = true;
  knopf.addEventListener("click", () => {
    state.bestandsreiheZu = !(state.bestandsreiheZu || false);
    render(state, root);
  });
}

function renderRessourcen(state, root, planet) {
  const leiste = root.querySelector("#ressourcen-leiste");

  // Außenposten: eine Zeile statt der Leiste. Der Wechsel wird EINMAL
  // geschrieben, nicht in jedem Takt -- sonst wäre die Ausnahme genau der
  // Fehler, den der Rest dieser Funktion behebt.
  if (planet.typ === "aussenposten") {
    if (leiste.dataset.form !== "aussenposten") {
      leiste.dataset.form = "aussenposten";
      leiste.innerHTML = t('<div class="dezent">Außenposten haben kein Lager – sie verschieben nur deine Reichweite.</div>');
    }
    return;
  }
  if (leiste.dataset.form !== "leiste") {
    leiste.dataset.form = "leiste";
    // A-162 Teil 3/4: Der Griff sitzt ZWISCHEN den beiden Reihen -- am
    // unteren Rand der Bestandsreihe, die er bedient. Die Mangelzeile im
    // selben Knoten steht IMMER im Baum (Teil 4: "die Zeile ist immer da"),
    // sichtbar wird sie erst, wenn die Bestandsreihe zu ist -- s.u.
    leiste.innerHTML = `
      <div class="res-reihe"></div>
      <div class="res-bestand-leiste">
        <button class="res-bestand-griff" id="res-bestand-griff"></button>
        <span class="res-mangelzeile" id="res-mangelzeile" hidden></span>
      </div>
      <div class="res-reihe res-reihe-kapazitaet"></div>`;
  }
  const reiheVorraete = leiste.firstElementChild;
  const reiheKapazitaeten = leiste.lastElementChild;
  ressourcenBestandGriffEinrichten(state, root);

  const { lager, fluss, produktion, verbrauch, bedarf, drosselung, effizienz, verderb } = effektiveRaten(
    state,
    planet
  );
  // A-112: dieselbe angezeigte Rate auch für die Lagerprognose (`voll in X`)
  // -- sonst rechnet sie mit `lager` allein und verspricht ein Lager, das bei
  // schrumpfendem Nahrungsbestand später vollläuft als hier behauptet.
  const lagerAnzeige = {};
  for (const resId of LAGER_RESSOURCEN) lagerAnzeige[resId] = sichtbareRate(lager, verderb, resId);

  // Zwei getrennte Reihen statt einer umbrechenden Zeile (Tobis Vorgabe,
  // 2026-08-16): oben was man HAT, unten was man KANN.
  //
  // A-162 Teil 2: "was man KANN" trifft nur noch auf drei der sechs Kacheln
  // zu (Arbeitskraft, Energie, Forschung) -- Lager, Bevölkerung und Credits
  // stehen HIER, weil sie IMMER SICHTBAR sein sollen (ENTWURF-LAGER.md 4.1),
  // nicht weil sie eine Kapazität hätten. `kapazitaeten`/`reiheKapazitaeten`/
  // `.res-reihe-kapazitaet` heißen bewusst weiter so (Umbenennen wäre Lärm
  // ohne Gegenwert) -- ihre Rolle ist jetzt "die Dauerreihe", nicht mehr
  // "was man kann".
  const vorraete = [];
  const kapazitaeten = [];
  // A-162 Teil 4: Kandidaten für die Mangelzeile -- "negative Rate bei
  // knappem Bestand" (ENTWURF-LAGER.md 4.3, Zeile 175/176), nicht die
  // "voll"-Warnung derselben CSS-Klasse (die ist Überfluss, kein Mangel).
  // Gesammelt während des Baus von `vorraete`, gelesen erst am Ende, wenn
  // feststeht, ob die Bestandsreihe überhaupt zu ist.
  const mangelListe = [];

  // A-162 Teil 2: aus dem Schleifenkörper herausgezogen, damit dieselbe
  // Rechnung für Bevölkerung/Credits (jetzt Dauerreihe) UND die restlichen
  // Lagerressourcen (Bestandsreihe) gilt -- eine Ressource, ein Weg, ihre
  // Kachel zu bauen (Prinzip 5).
  const lagerEintrag = (resId) => {
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
    // A-112: die Rate zieht den momentanen Verderbverlust ab (Klaus' Fund --
    // vorher stand hier `lager[resId]` allein, und bei großem Vorrat
    // übersteigt der Verderb die Netto-Produktion: grünes Plus, schrumpfender
    // Bestand). `sichtbareRate` ist die eine Stelle für diese Rechnung.
    const rate = sichtbareRate(lager, verderb, resId);
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

    // A-050: DAS GEMEINSAME LAGER IST VOLL -- und was hier produziert wird,
    // kommt nie an.
    //
    // Tobis Meldung war „die Fertigung produziert bei mir nichts auf
    // Ausbaustufe 1". Nachgemessen ist der Zustand schlimmer, als er klingt:
    // die Anlage läuft mit Faktor 1, verbraucht ihr Silizium, und das Ergebnis
    // verfällt beim Einlagern (`insLager` wirft Überproduktion weg). Der
    // Spieler sieht eine laufende Anlage und einen Bestand, der bei null
    // steht -- und nirgends stand, warum.
    //
    // Die Warnung gab es bisher NUR in der Imperiumstabelle, als Tooltip an
    // einer Prozentzelle. Genau dort schaut niemand nach, der wissen will,
    // warum seine Fabrik nichts abwirft.
    //
    // Deshalb hier, an der Ressource selbst, und für JEDE Lagerressource
    // (Prinzip 5: ein Mechanismus, nicht einer für Elektronik).
    const lagerVoll = !hatSpeicher && lagerBelegung(planet) >= lagerKapazitaetGesamt(state, planet);
    if (lagerVoll && rate > 0) {
      kettenText += t(" · LAGER VOLL – was hier entsteht, verfällt sofort");
    }
    if (hatSpeicher) {
      kettenText += speicherVoll
        ? t(" · Platz für {platz} – belegt, es wächst niemand nach", { platz: fmt(eigenerSpeicher) })
        : t(" · Platz für {platz}", { platz: fmt(eigenerSpeicher) });
    }

    // A-162 Teil 4: "negative Rate bei knappem Bestand" -- exakt der Fall
    // `zieht` oben, nicht die "voll"-Warnung weiter unten (Überfluss ist kein
    // Mangel). `pufferReichweiteMs` ist dieselbe Funktion, die schon
    // `flussSpeicherZeile` für "reicht noch X" nutzt -- keine zweite Rechnung
    // für dieselbe Frage.
    if (zieht) {
      mangelListe.push({
        symbol: def.symbol || "•",
        name: t(def.name),
        reichweiteMs: pufferReichweiteMs(bestandJetzt, -rate),
      });
    }

    return {
      schluessel: resId,
      art: "bestand",
      symbol: def.symbol || "•",
      name: t(def.name),
      wert: hatSpeicher
        ? `${fmt(bestandJetzt)} / ${fmt(eigenerSpeicher)}`
        : mitEinheit(resId, bestandJetzt),
      rate: hatSpeicher
        ? speicherVoll
          ? t("voll")
          : ""
        : rate > 0
          ? // A-050: eine Rate, die nirgends ankommt, darf nicht wie ein
            // Zugewinn aussehen. Das Pluszeichen war hier die Lüge.
            lagerVoll
            ? t("Lager voll")
            : vorzeichenMitEinheit(resId, rateProJahr(rate)) + t("/Jahr")
          : zieht
            ? vorzeichenMitEinheit(resId, rateProJahr(rate)) + t("/Jahr")
            : "",
      rateKlasse: zieht || speicherVoll || (lagerVoll && rate > 0) ? "warnung" : "",
      // A-052: DER VERDERB STAND HIER ALS EIGENE ZEILE (aus A-010) und hat
      // damit genau das gebrochen, was die v0.40/41-Regeln absichern: die
      // Nahrungskachel war höher als ihre Nachbarn, die Reihe wirkte
      // uneinheitlich. Tobis Abnahme dazu: „Die −2 % im Jahr ist eine Info,
      // die man einmal braucht, nicht immer."
      //
      // Er ist jetzt im Tooltip, und Prinzip 13 bleibt trotzdem erfüllt.
      // A-052 BEGRÜNDETE DAS SO: die WIRKSAME Folge stehe ohnehin in der
      // t/Jahr-Zahl der Kachel, dort SEHE man den Verderb wirken -- FALSCH,
      // und zwar nachweisbar (A-112, Klaus' Fund): `rate` kam bis dahin aus
      // `lager` allein, kannte den Verderb also gar nicht. Bei großem Vorrat
      // übersteigt der Verderb (Anteil des BESTANDS) die Netto-Produktion --
      // die Kachel zeigte Grün mit Pluszeichen, während der Bestand
      // schrumpfte. Seit A-112 fließt der Verlust über `sichtbareRate`
      // tatsächlich in `rate` ein; jetzt stimmt die Begründung.
      zusatz: "",
      titel:
        `${t(def.name)} – ${gewichtText}` +
        (def.gebaeude ? t(" · gefördert von {gebaeude}", { gebaeude: t(BUILDINGS[def.gebaeude].name) }) : "") +
        (def.verderb
          ? t(" · verdirbt: −{prozent} % des Bestands im Jahr", {
              prozent: (rateProJahr(def.verderb) * 100).toFixed(1),
            })
          : "") +
        kettenText,
      // Dieselbe Farbe wie das Segment im Lagerbalken -- die Kachel ist die
      // Legende dazu.
      farbe: volumen > 0 ? def.farbe : "",
    };
  };

  // A-162 Teil 2: Bevölkerung und Credits laufen NICHT mehr durch diese
  // Schleife in die Bestandsreihe -- sie werden weiter unten explizit in die
  // Dauerreihe gehängt, an der Stelle, die 4.1 vorgibt (nach Lager).
  for (const resId of LAGER_RESSOURCEN) {
    if (resId === "credits" || resId === "bevoelkerung") continue;
    vorraete.push(lagerEintrag(resId));
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
    const speicherDaten = flussSpeicherZeile(planet, resId, fluss[resId] || 0);
    const brennstoffDaten = resId === "energie" ? brennstoffZeilen(planet) : null;
    // FORSCHUNG IST DER SONDERFALL DIESER KACHEL (A-028).
    //
    // Das Muster "verbraucht / erzeugt" passt fuer Strom und Arbeitskraft:
    // dort steht auf beiden Seiten etwas. Forschung hat KEINE Verbraucher --
    // sie fliesst in ein Projekt statt in Anlagen. Die Kachel las deshalb
    // immer "0 / 540.000 FE", und das war Tobis Bug-Report "forschung zeigt
    // immer 0/xxxx" (Chris unabhaengig: "I dont really understand why I have
    // 0 research when I'm actively researching something").
    //
    // Es war also nie eine kaputte Fortschrittsanzeige, sondern eine Zahl, die
    // hier nichts zu suchen hat. Was der Spieler an dieser Stelle wissen will,
    // ist der Stand des LAUFENDEN Projekts -- und dass es genau eines ist.
    const istForschungsFluss = resId === "forschung";
    const lauf = istForschungsFluss ? state.forschungsQueue : null;
    const laufAufwand = lauf ? lauf.aufwand ?? forschungsAufwand(RESEARCH[lauf.forschungId], lauf.zielLevel) : 0;
    const wertText = istForschungsFluss
      ? lauf
        ? t("{stand} / {ziel} {einheit}", {
            stand: fmt(Math.floor(lauf.fortschritt || 0)),
            ziel: fmt(laufAufwand),
            einheit: einheit(resId),
          })
        : t("kein Projekt")
      : `${fmt(braucht)} / ${fmt(prod)} ${einheit(resId)}`;
    kapazitaeten.push({
      schluessel: resId,
      art: "fluss",
      symbol: def.symbol || "•",
      name: t(def.name),
      wert: wertText,
      // A-143: Forschung rechnet ihre Rate wie jede andere -- in Spieljahren,
      // nicht in der internen Echtzeitstunde. MW/AK bleiben unangetastet:
      // Energie/Arbeitskraft sind Leistungen, keine Raten (siehe unten).
      rate: knapp
        ? `${Math.round(effizienz * 100)}%`
        : istForschungsFluss
          ? forschungsRateText(frei)
          : t("{frei} {einheit} frei", { frei: fmt(frei), einheit: einheit(resId) }),
      knapp,
      auslastung,
      speicher: speicherDaten,
      brennstoffZeilen: brennstoffDaten,
      titel:
        (knapp
          ? t("{res} fehlt: {braucht} {einheit} gebraucht, nur {da} verfügbar – alle Anlagen laufen mit {anteil}%", {
              res: t(def.name),
              braucht: fmt(braucht),
              einheit: einheit(resId),
              da: fmt(prod),
              anteil: Math.round(effizienz * 100),
            })
          : istForschungsFluss
            ? t("{braucht} von {da} verbraucht · {frei} frei", {
                braucht: forschungsRateText(braucht),
                da: forschungsRateText(prod),
                frei: forschungsRateText(frei),
              })
            : t("{braucht} {einheit} von {da} {einheit} verbraucht · {frei} {einheit} frei", {
                braucht: fmt(braucht),
                einheit: einheit(resId),
                da: fmt(prod),
                frei: fmt(frei),
              })) +
        (istForschungsFluss
          ? "\n" +
            t(
              "FE = Forschungseinheiten. Deine Labore erzeugen sie laufend, und sie fließen in GENAU EIN Projekt – die Warteschlange darunter wird nacheinander abgearbeitet."
            )
          : "") +
        (speicherDaten ? "\n" + speicherDaten.titel : "") +
        (brennstoffDaten && brennstoffDaten.length ? "\n" + brennstoffDaten.map((z) => z.titel).join("\n") : ""),
    });
  }

  // A-051: „voll in ~5 h 40". Die Antwort auf das A-023-Zurück -- die Messung
  // sagt, dass eine Lagerhalle eine Offline-Entscheidung ist, und das ist in
  // Ordnung; gefehlt hat nur, dass das Spiel es SAGT.
  //
  // Die Rechnung steht in `lagerVollInStunden` (state.js) und bekommt die
  // EFFEKTIVEN Raten -- gedrosselt, nicht Nennleistung. Eine Prognose aus
  // Rohraten verspräche bei Strommangel ein volles Lager, das nie kommt.
  //
  // Drei Zustände, drei Texte, und der dritte ist eine Leerzeile: bei
  // Nettozufluss ≤ 0 steht dort NICHTS. Kein „nie", keine Phantasiezahl --
  // was man nicht weiß, sagt man nicht.
  const lagerPrognoseText = (state, planet, lagerRaten) => {
    const stunden = lagerVollInStunden(state, planet, lagerRaten);
    if (stunden === null) return "";
    if (stunden <= 0) return t("voll");
    return t("voll in {dauer}", { dauer: fmtDauer(stunden * 3600) });
  };

  // Lagerauslastung als eigene Kachel in derselben Leiste.
  const gesamt = lagerKapazitaetGesamt(state, planet);
  const belegt = lagerBelegung(planet);

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

  kapazitaeten.push({
    schluessel: "lager",
    art: "lager",
    titel: t("{belegt} von {gesamt} m³ belegt", { belegt: fmt(belegt), gesamt: fmt(gesamt) }),
    wert: `${formatKurz(belegt)} / ${formatKurz(gesamt)} m³`,
    prognose: lagerPrognoseText(state, planet, lagerAnzeige),
    segmente: segmente.map((s) => ({
      resId: s.resId,
      farbe: s.def.farbe,
      anteil: s.anteil,
      titel: t("{res}: {volumen} m³ ({anteil}% des Lagers)", {
        res: t(s.def.name),
        volumen: fmt(s.volumen),
        anteil: Math.round(s.anteil * 100),
      }),
    })),
  });

  // A-162 Teil 2: Bevölkerung und Credits schließen die Dauerreihe ab, in
  // genau der Reihenfolge aus 4.1 (Arbeitskraft · Energie · Forschung ·
  // Lager · Bevölkerung · Credits). `lagerEintrag` liefert für beide dieselbe
  // Kachel wie früher in der Bestandsreihe -- Bevölkerung zeigt bereits
  // "x / y" (eigener Speicher = Wohnraum), Credits ist der Sonderfall ohne
  // Kapazität, Balken oder (seit Teil 1) Stufe.
  kapazitaeten.push(lagerEintrag("bevoelkerung"));
  kapazitaeten.push(lagerEintrag("credits"));

  // Verdeckte Platzhalter: zeigen Tiefe, ohne zu spoilern. Sie gehören zu den
  // VORRÄTEN -- es sind künftige Ressourcen, und dort ist der Platz für sie.
  for (let i = 0; i < UNBEKANNTE_RESSOURCEN.slots; i++) {
    vorraete.push({
      schluessel: `unbekannt-${i}`,
      symbol: UNBEKANNTE_RESSOURCEN.symbol,
      name: "???",
      wert: "???",
      rate: "",
      klassen: "unbekannt",
      titel: t("Noch nicht entdeckt"),
    });
  }

  listeAbgleichen(reiheVorraete, vorraete, {
    schluessel: (k) => k.schluessel,
    bauen: () => resKachelGeruest(),
    aktualisieren: (div, k) => resKachelFuellen(div, k),
  });
  // A-162 Teil 2: die Dauerreihe trägt jetzt DREI Kachelarten -- "lager"
  // (Auslastungsbalken), "fluss" (Arbeitskraft/Energie/Forschung, mit Balken
  // und Speicher-/Brennstoffzeile) und die einfache Bestandskachel (jetzt
  // "bestand": Bevölkerung, Credits) -- dieselbe Schablone wie in der
  // Bestandsreihe, kein neuer Kachel-Typ.
  listeAbgleichen(reiheKapazitaeten, kapazitaeten, {
    schluessel: (k) => k.schluessel,
    bauen: (k) => (k.art === "lager" ? lagerKachelGeruest() : k.art === "fluss" ? flussKachelGeruest() : resKachelGeruest()),
    aktualisieren: (div, k) =>
      k.art === "lager" ? lagerKachelFuellen(div, k) : k.art === "fluss" ? flussKachelFuellen(div, k) : resKachelFuellen(div, k),
  });

  // --- A-162 Teil 3/4: Griff-Zustand und Mangelzeile -----------------------
  //
  // Erst HIER gelesen, nicht am Funktionsanfang: `mangelListe` ist erst nach
  // dem Bau von `vorraete` vollständig (sie wird währenddessen befüllt).
  const bestandZu = state.bestandsreiheZu || false;
  reiheVorraete.classList.toggle("eingeklappt", bestandZu);
  const griff = leiste.querySelector("#res-bestand-griff");
  griff.textContent = bestandZu ? "▸" : "▾";
  attributSetzen(griff, "title", bestandZu ? t("Bestände wieder einblenden.") : t("Bestände wegklappen."));

  // Immer berechnet und gesetzt, auch wenn gerade unsichtbar (`hidden`) --
  // sonst zeigt ein frisches Aufklappen-Zuklappen für einen Frame den Stand
  // vom letzten Mal, als die Reihe zu war (G4-Sprung, nur unsichtbar).
  const dringendste = [...mangelListe].sort((a, b) => a.reichweiteMs - b.reichweiteMs).slice(0, 3);
  const rest = mangelListe.length - dringendste.length;
  const basisText = dringendste.map((m) => `${m.symbol} ${m.name}`).join(" · ");
  const mangelzeile = leiste.querySelector("#res-mangelzeile");
  mangelzeile.hidden = !bestandZu;
  textSetzen(
    mangelzeile,
    mangelListe.length === 0
      ? t("Alle Bestände stabil")
      : rest > 0
        ? t("{text}  (+{anzahl} weitere)", { text: basisText, anzahl: rest })
        : basisText
  );
}

// --- Navigation ---------------------------------------------------------
// Feste Reihenfolge, fester Platz -- ABER zwei verschiedene Regeln für zwei
// verschiedene Phasen (A-153, Tobi 23.08.: „In der Entwicklung kommen neue
// dinge dazu und Sortierung ist wichtiger als Muskelgedächnis."):
//
//   IN EINER LAUFENDEN PARTIE wandert nichts, und was es noch nicht gibt,
//   steht ausgegraut statt zu fehlen (E11) -- das ist die Zusicherung an den
//   Spieler, und sie gilt weiter uneingeschränkt.
//
//   FÜR DIE ENTWICKLUNG DIESES ARRAYS gilt das Gegenteil: eine neue Zeile
//   kommt an die Stelle, die die SORTIERUNG verlangt, nicht ans Ende. Genau
//   das hat A-153 hier getan (Lager an Position 2, direkt über Forschung,
//   Tobis Entscheidung 23.08.) -- ein Umsetzungs-Kürzel-Fehler in der ersten
//   Fassung dieses Kommentars sagte pauschal "kommt unten dazu" und hätte die
//   nächste Runde in dieselbe falsche Richtung geschickt.
//
// label ist eine Funktion, keine Zeichenkette: eine feste Zeichenkette würde
// beim Laden des Moduls einmal übersetzt und bliebe in der Startsprache
// stehen. Außerdem findet der Vollständigkeitstest die Beschriftungen nur so.
//
// Die Zifferntasten 1-9 folgen automatisch dieser Reihenfolge (siehe unten,
// "1-9: die Bereiche...") -- wer hier einfügt, muss an keiner zweiten Stelle
// etwas verschieben. Bei zehn Einträgen verliert der LETZTE sein Kürzel: eine
// zweistellige Zahl ist keine einzelne Taste (A-153, Development betroffen).
const BEREICHE = [
  { id: "planet", label: () => t("Planet") },
  // A-153: Lager an Position 2, direkt über Forschung (Tobis Entscheidung,
  // 23.08. -- siehe Kommentar oben).
  { id: "lager", label: () => t("Lager") },
  { id: "forschung", label: () => t("Forschung") },
  { id: "werft", label: () => t("Werft") },
  { id: "flotten", label: () => t("Flotten") },
  { id: "galaxie", label: () => t("Galaxie") },
  { id: "handel", label: () => t("Handel") },
  { id: "imperium", label: () => t("Imperium") },
  { id: "handbuch", label: () => t("Handbuch") },
  // A-054: der Tester-Dev-Kanal. Verliert mit dem zehnten Eintrag (A-153)
  // sein Zifferntasten-Kürzel -- über die Navigationsleiste bleibt er
  // erreichbar wie jeder andere Bereich.
  { id: "development", label: () => t("Development") },
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

// A-150, Punkt "Tour beim ersten Öffnen": Chris wünschte sich eine Tour über
// Ressourcenleiste, Bereiche und Statusspalte ("what does what", "erste
// Schritte"). KEIN Overlay, das nacheinander auf die drei zeigt -- genau das
// hat A-059 schon geprüft und verworfen (Kommentar an handbuch.js, Abschnitt
// "oberflaeche"): "Tobis stehende Linie ist 'Führung durch Erklärung, keine
// Schritt-für-Schritt-Anleitung'. Ein Overlay... wäre genau die Anleitung --
// und ein neues UI-Muster obendrein." Diese Runde erfindet deshalb KEIN
// zweites System, sondern nutzt dasselbe Muster wie der Handbuch-Hinweis
// direkt darüber: EINE Meldung, die zeigt, was gerade sichtbar ist, und ins
// Handbuch verweist, wo es ausführlicher steht (A-040-Muster: Meldung →
// Klick → Anker).
//
// Anders als der Handbuch-Hinweis (60 Sekunden Verzögerung, "erstmal
// umschauen") feuert dieser SOFORT: er beantwortet nicht "wo finde ich
// Hilfe", sondern "was sehe ich gerade vor mir" -- Chris' allererster Blick,
// bevor er irgendwo geklickt hat.
function oberflaecheHinweisPruefen(state) {
  if (state.oberflaecheHinweisGezeigt) return;
  meldungHinzufuegen(
    state,
    t("Oben die Ressourcen, links die Bereiche, rechts die Statusspalte mit Meldungen – kurz erklärt im Handbuch."),
    null, "eigen", { bereich: "handbuch", anker: "oberflaeche" }
  );
  state.oberflaecheHinweisGezeigt = true;
}

// Die drei Momente (A-060) -- die Texte und wohin sie führen.
//
// Die BEDINGUNGEN stehen in state.js (`momentErreicht`), weil sie zweimal
// gebraucht werden: hier und beim Nachziehen alter Stände. Hier steht nur,
// was gesagt wird und wo es weitergeht.
//
// MOMENT 3 HAT KEINEN EIGENEN TEXT. Der Blitz-Absatz steht seit jeher im
// Handbuch, und die Meldung ZITIERT ihn über `handbuchAbsatz` -- dasselbe
// Muster wie der `erststart`-Zeiger der Erstklärung, und aus demselben Grund:
// zwei Fassungen desselben Absatzes wären zwei Wahrheiten, gepflegt würde
// eine.
//
// Jede Meldung führt ins Handbuch an die Stelle, an der es weitergeht (das
// A-040-Muster: Meldung → Klick → Anker). Sie sind per Definition
// spielerrelevant und laufen deshalb als „eigen" durch den Meldungsfilter.
function momentMeldung(state, id) {
  switch (id) {
    case "werft":
      return {
        text: t(
          "Deine Werft steht. Sonden sind Einwegschiffe – eine deckt genau ein Ziel auf und bleibt dort. Erkunder kommen zurück und arbeiten mehrere Orbits nacheinander ab. Frachter tragen, und ihr Frachtraum ist zugleich der einzige Platz für zusätzlichen Treibstoff. Welche Rümpfe überhaupt vom Band laufen, entscheidet die Stufe der Werft – sie baut nicht nur schneller, sie schaltet die größeren erst frei."
        ),
        ziel: { bereich: "handbuch", anker: "flotten" },
      };
    case "piraten":
      return {
        text: t(
          "Piraten in deinem System. Sie sind kein Naturereignis: sie bauen, tanken und kämpfen nach denselben Regeln wie du. Sie greifen Fracht an und nie Planeten – deine Welten sind sicher, deine Transporte nicht. Und im All gibt es keine Tarnung: du siehst sie kommen, so wie sie dich. Ein Kriegsschiff im Verband ist die Antwort darauf."
        ),
        ziel: { bereich: "handbuch", anker: "flotten" },
      };
    case "blitz":
      return {
        text: handbuchAbsatz("ziel", 1),
        ziel: { bereich: "handbuch", anker: "ziel" },
      };
    default:
      return null;
  }
}

// Prüft alle drei je Takt. Billig: zwei der drei Bedingungen sind ein Blick
// auf ein Feld, die dritte läuft über die eigenen Planeten -- und sobald ein
// Moment gesehen ist, wird er gar nicht mehr gefragt.
function momenteHinweisPruefen(state) {
  for (const id of MOMENTE) {
    if (momentGesehen(state, id)) continue;
    if (!momentErreicht(state, id)) continue;
    const meldung = momentMeldung(state, id);
    if (!meldung || !meldung.text) continue;
    // ERST die Meldung, DANN der Merker -- dieselbe Reihenfolge und derselbe
    // Grund wie beim Handbuch-Hinweis darüber: ein Merker, der sagt „ist
    // erledigt", gehört hinter die Sache, die er bezeugt.
    meldungHinzufuegen(state, meldung.text, null, "eigen", meldung.ziel);
    momentMerken(state, id);
  }
}

// A-111: der einmalige Hinweis auf ein zu kleines Fenster.
//
// DIE BEDINGUNG IST DIE MESSUNG SELBST, kein Breakpoint: hat die Seite gerade
// senkrecht gescrollt (documentElement.scrollHeight > clientHeight), hat die
// Mindesthöhe aus .spielfeld (css/style.css, --spielfeld-mindesthoehe)
// tatsächlich gegriffen -- das ist genau der Moment, den der Hinweis
// erklären soll, und dieselbe Messung, mit der A-111 seine eigene Definition
// von fertig prüft.
//
// BEWUSST NICHT TEIL VON render(): eine Aufholung (aufholen.js) ruft render()
// mehrfach rasch hintereinander auf, einen Block nach dem anderen -- die
// Fenstergröße bei jedem einzelnen Block zu prüfen wäre unnötige Arbeit ohne
// eigenen Wert. Aufgerufen wird diese Funktion deshalb aus main.js, aus dem
// gewöhnlichen Sekundentakt (`setInterval`, läuft erst NACH der Aufholung
// an) -- einmal je echter Spielsekunde reicht. Export statt lokaler Funktion
// aus genau diesem Grund.
export function fensterHinweisPruefen(state, root) {
  if (fensterHinweisGesehen(state)) return;
  if (document.documentElement.scrollHeight <= document.documentElement.clientHeight) return;
  meldungHinzufuegen(
    state,
    t(
      "Dein Fenster ist kleiner, als Entropy es erwartet – die Oberfläche ist für etwa 1900 × 950 Punkte gebaut, hier sind es {breite} × {hoehe}. Die Seite scrollt deshalb, statt etwas abzuschneiden. Mehr Platz bekommst du mit Vollbild (F11) oder einer niedrigeren Windows-Skalierung.",
      { breite: window.innerWidth, hoehe: window.innerHeight }
    )
  );
  fensterHinweisMerken(state);
  // Läuft nach render() (siehe main.js), die Meldung stünde sonst erst einen
  // Takt später sichtbar in der Liste -- derselbe Grund wie bei den anderen
  // Hinweis-Prüfungen, die deshalb NOCH innerhalb von render() liegen.
  renderMeldungen(state, root);
}

// Welcher Bereich gerade sichtbar ist. Bewusst UI-Zustand, nicht Spielstand:
// gehört nicht in die Speicherdatei und nicht in die Simulation.
let aktiverBereich = "planet";

// Statusspalte startet OFFEN (A-059, Planungsentscheidung 18.08.).
//
// Sie startete bis dahin zu, mit zwei Gründen: der Platz gehört dem
// Spielfeld, und laufende Aufträge sieht man auch an den Punkten in der
// Navigation. Beide sind weggefallen. Seit v0.82 zeigt die Meldungsliste nur
// noch Eigenes statt der halben Galaxie, und sie ist inzwischen der Kanal für
// den Neuigkeiten-Hinweis und die Momente aus der Erstklärung -- zugeklappt
// erreicht sie niemanden (gemessener A-040-Fund).
//
// Wer sie zuklappt, dessen Wahl bleibt für die Sitzung erhalten wie bisher:
// das hier ist der STARTwert, kein Zwang.
let statusOffen = true;

// Das Einstellungsfenster (A-140). Bewusst UI-Zustand wie aktiverBereich und
// statusOffen, nicht Spielstand: OB das Fenster offen ist, gehört nicht in
// die Speicherdatei -- WAS darin eingestellt wird (Grundskalierung), schon.
let einstellungenOffen = false;

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

  // Die Solar-Vorwarnung (A-055): wer Felder stehen hat, erfährt VOR der
  // Flut, dass sie ungeschirmt verloren sind -- nicht im Abspann.
  const hatSolar = planetenVon(state).some((p) => (p.gebaeude && p.gebaeude.solarfeld) > 0);
  const solarWarnung = hatSolar
    ? "\n" + t("Achtung: Ungeschirmte Solarfelder überstehen die Teilchenflut nicht.")
    : "";
  if (sn.phase === "vorwarnung") {
    textSetzen(marke, t("FRIST"));
    textSetzen(was, t("bis {stern} kollabiert", { stern: name }));
    // A-150: Klaus' Frage ("Die erste Frist geht nur bis zum Flash ist
    // unklar") -- der Countdown sagt jetzt selbst, dass diese erste Frist
    // NICHT das ganze Spiel ist, sondern von einer zweiten, kürzeren Frist
    // gefolgt wird (Blitz -> Flut). Derselbe Tooltip, ein Satz mehr.
    el.title =
      t(
        "Das Neutrino-Observatorium liest die Brennstufe im Kern von {stern}, {lj} Lichtjahre entfernt. Wenn er kollabiert, zerlegt der Blitz die Ozonschicht – und mit ihr die Landwirtschaft jeder ungeschützten Welt. Diese erste Frist ist nicht die letzte: danach beginnt eine zweite, kürzere Frist bis zur Teilchenflut.",
        { stern: name, lj: (sn.entfernung * LJ_PRO_EINHEIT).toFixed(0) }
      ) + solarWarnung;
  } else if (sn.phase === "blitz") {
    textSetzen(marke, t("FLUT"));
    textSetzen(was, t("bis die Teilchenflut eintrifft"));
    el.title =
      t(
        "{stern} ist kollabiert. Was jetzt heranzieht, ist die kosmische Teilchenflut – geladen, jahrtausendelang, und nur durch ein Magnetfeld aufzuhalten. Danach ist keine Flottenbewegung mehr möglich.",
        { stern: name }
      ) + solarWarnung;
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

  // Was aus der ÜBRIGEN Galaxie wurde (A-033). EINE Zahl, keine Aufzählung:
  // bei bis zu 672 fremden Welten wäre alles andere eine Tabelle, und das hat
  // A-001 bereits entschieden.
  //
  // Bei null Überlebenden steht DIESELBE Zeile mit der Null — keine
  // Sonderformulierung. Die Null ist die Aussage.
  //
  // Stände, die VOR v0.83 zu Ende gingen, haben kein `fremd`-Feld. Sie zeigen
  // die Zeile gar nicht, statt „undefined von undefined" zu behaupten: eine
  // fehlende Angabe ist keine Angabe, und der Abspann ist der letzte Ort, an
  // dem man raten sollte.
  const fremd = state.ende.fremd;
  const fremdZeile = fremd
    ? `<p class="abspann-fremd dezent">${t(
        "Von den {gesamt} fremden Welten der Galaxie haben {ueberlebt} die Flut überstanden.",
        { gesamt: fmt(fremd.gesamt), ueberlebt: fmt(fremd.ueberlebt) }
      )}</p>`
    : "";

  const zeilen = state.ende.welten
    .map(
      (w) => `
      <li class="${w.ueberlebt ? "abspann-hielt" : "abspann-verloren"}">
        <span>${htmlText(w.name)}</span>
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
      ${fremdZeile}
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

  // A-084: DAS GERÜST STEHT EINMAL, DIE TEXTE WECHSELN.
  //
  // Bis v1.62 baute dieses Fenster sich bei jedem Sprachwechsel komplett neu.
  // Das ging, solange die Sprache nur draußen im Kopf umgestellt werden konnte
  // -- und genau das war das Problem: das Fenster liegt als Vollbild-Overlay
  // ÜBER dem Kopf (inset: 0, z-index: 100), die DE/EN-Knöpfe dort sind
  // unerreichbar, solange es offen ist. Ein englischsprachiger Tester musste
  // also die ganze deutsche Erstklärung wegklicken, bevor er umschalten
  // konnte -- beim wichtigsten Text des Spiels.
  //
  // Die Sprachknöpfe stehen deshalb jetzt IM Fenster. Und weil sie es sind,
  // die den Neuaufbau auslösen würden, darf es keinen Neuaufbau mehr geben:
  // sonst verschwände beim Klick der Knoten unter dem Zeiger (8a) und der
  // Scrollstand des Textes gleich mit. Gerüst einmal, Text im Wechsel.
  if (!el.dataset.gebaut) {
    el.dataset.gebaut = "1";
    el.innerHTML = `
      <div class="erstklaerung-tafel">
        <div class="erstklaerung-sprachen" data-erst-sprachen></div>
        <h2 data-erst-titel></h2>
        <div data-erst-absaetze></div>
        <p class="dezent" data-erst-hinweis></p>
        <div class="erstklaerung-knoepfe">
          <button data-erst-handbuch class="zweitrangig"></button>
          <button data-erst-los></button>
        </div>
      </div>`;

    // ERST die Tafel wegnehmen, DANN der Merker -- dieselbe Reihenfolge und
    // dieselbe Begründung wie beim Handbuch-Hinweis weiter unten: ein Merker,
    // der sagt "ist erledigt", gehört hinter die Sache, die er bezeugt.
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

    // Die Sprachknöpfe: dieselbe Beschriftung und dieselbe Optik wie im Kopf,
    // aber ein eigener Satz Knöpfe -- die im Kopf liegen unter dem Overlay und
    // sind nicht anklickbar. Verdrahtet wird EINMAL; welche Sprache aktiv ist,
    // steht beim Zeichnen unten.
    const sprachen = el.querySelector("[data-erst-sprachen]");
    for (const s of SPRACHEN) {
      const btn = document.createElement("button");
      btn.dataset.sprache = s.code;
      btn.textContent = s.code.toUpperCase();
      attributSetzen(btn, "title", s.name);
      btn.addEventListener("click", () => {
        spracheSetzen(s.code);
        // Die Leiste im Einstellungsfenster (A-140, bis dahin im Kopf) baut
        // sich an ihrem eigenen Merker neu auf.
        const kopf = root.querySelector("#sprach-leiste");
        if (kopf) kopf.dataset.gezeichnet = "";
        render(state, root);
      });
      sprachen.appendChild(btn);
    }
  }

  for (const btn of el.querySelectorAll("[data-erst-sprachen] button")) {
    btn.classList.toggle("aktiv", btn.dataset.sprache === sprache());
  }

  const tafel = erststartTafel(planet.name);
  textSetzen(el.querySelector("[data-erst-titel]"), tafel.titel);
  textSetzen(el.querySelector("[data-erst-hinweis]"), tafel.hinweis);
  textSetzen(el.querySelector("[data-erst-handbuch]"), t("Handbuch öffnen"));
  textSetzen(el.querySelector("[data-erst-los]"), t("Los geht's"));
  // Die Absätze werden abgeglichen statt neu gebaut: ihre Zahl ist in beiden
  // Sprachen dieselbe, es wechselt nur der Text.
  listeAbgleichen(
    el.querySelector("[data-erst-absaetze]"),
    tafel.absaetze.map((text, i) => ({ text, i })),
    {
      schluessel: (a) => a.i,
      bauen: () => document.createElement("p"),
      aktualisieren: (p, a) => textSetzen(p, a.text),
    }
  );

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
      // Development trägt den Punkt für ungesehene Neuigkeiten (A-047) --
      // GLEICHE Optik wie die "bei dir läuft etwas"-Punkte, aber bewusst
      // eine EIGENE Bedingung: zwei Bedeutungen in einem Zustand wäre die
      // v0.40-Falle „leuchtet dauernd" in neu.
      const punktAn =
        b.id === "development" ? neuigkeitenPunktAn(state, VERSION) : bereichAktiv(state, planet, b.id);
      btn.querySelector(".nav-punkt").hidden = !punktAn;
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

  // A-068: Bei genau einem Stützpunkt eine eigene Vorlage. Bewusst KEIN
  // allgemeines Pluralsystem -- zwei Zähler im Spiel tragen ein Wort vor sich
  // her, und ein Regelwerk für zwei Stellen wäre mehr Apparat als Nutzen.
  // Dass ausgerechnet die 1 falsch aussah, ist kein Zufall: sie steht im
  // ersten Eindruck jedes Testers.
  root.querySelector("#imperium-info").textContent =
    planeten.length === 1
      ? t("1 Stützpunkt · davon {wirtschaft} mit Wirtschaft", { wirtschaft: wirtschaft.length })
      : t("{anzahl} Stützpunkte · davon {wirtschaft} mit Wirtschaft", {
          anzahl: planeten.length,
          wirtschaft: wirtschaft.length,
        });

  // Summen über alle Planeten -- die eigentliche Frage ist meist "wie viel
  // habe ich INSGESAMT", nicht "wie viel liegt auf Planet 3".
  const summe = {};
  const summeRate = {};
  for (const p of wirtschaft) {
    const { lager, verderb } = effektiveRaten(state, p);
    for (const r of res) {
      summe[r] = (summe[r] || 0) + (p.ressourcen[r] || 0);
      // A-112: dieselbe angezeigte Rate wie auf der Ressourcenkachel --
      // sonst behauptet die Imperiumssumme ein Plus, das der Verderb längst
      // aufgezehrt hat.
      summeRate[r] = (summeRate[r] || 0) + sichtbareRate(lager, verderb, r);
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

    const { lager, verderb } = effektiveRaten(state, p);
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
      // A-112: dieselbe angezeigte Rate wie auf der Ressourcenkachel.
      const rate = sichtbareRate(lager, verderb, r);
      const mengeEl = td.querySelector("[data-menge]");
      mengeEl.classList.toggle("dezent", !(menge > 0));
      textSetzen(mengeEl, formatKurz(menge));
      // A-126 (P19): nur der Zugewinn wird gezeigt, wie bisher (A-050-Regel
      // von der Ressourcenkachel) -- vorzeichenSpan entscheidet nur noch das
      // Vorzeichen selbst, nicht OB überhaupt eines steht.
      markupSetzen(td.querySelector("[data-rate]"), rate > 0 ? vorzeichenSpan(rate, formatKurz) : "");
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
    markupSetzen(
      block.querySelector(`[data-summe-rate="${r}"]`),
      summeRate[r] > 0 ? vorzeichenSpan(summeRate[r], formatKurz) : ""
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
//
// A-144: Bis v0.4.4 hieß die Überschrift "Status" und zeigte je Kategorie nur
// den LAUFENDEN Auftrag -- eine Zeile, egal ob dahinter nichts oder zehn
// Aufträge warteten. Tobis Befund (KONZEPT-LAGER E10): "die Status Spalte ist
// schon die bessere Warteschlange... man muss es nur abtrennen und
// umbennen." Jetzt zeigt jeder der drei Abschnitte (Bau/Forschung/Werft) den
// laufenden Kopf UND die volle Warteschlange dahinter -- dieselbe
// renderWarteschlange wie im jeweiligen Tab, nur mit einem zweiten Ziel
// (Nicht anfassen: die Warteschlangen-LOGIK ändert sich dadurch nicht).
//
// DREI ABSCHNITTE SIND EIN VERSUCH (Tobis Wortlaut: "Wir probieren es mal mit
// drei."), keine Festlegung. Jeder Abschnitt ist per CSS (.ws-mini) fest drei
// Zeilen hoch und scrollt intern, damit die Spalte nie springt (Prinzip 10,
// Tobis Entscheidung 25.08.).
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

  const zeile = (text, zeit) =>
    `<div class="status-zeile"><span>${text}</span><span class="status-zeit">${zeit}</span></div>`;
  // P18: ein leerer Abschnitt bleibt nicht leer, er trägt seine Antwort.
  const leerZeile = () => `<div class="status-zeile ruhig"><span>${t("Nichts in Arbeit.")}</span><span></span></div>`;

  const bauKopf = root.querySelector("#status-bau-kopf");
  bauKopf.innerHTML = planet.bauQueue
    ? zeile(`${t(BUILDINGS[planet.bauQueue.gebaeudeId].name)} → ${planet.bauQueue.zielLevel}`, kopfZeitText(state, planet, planet.bauQueue, "bau", jetzt))
    : planet.bauWarteschlange.length ? "" : leerZeile();
  renderWarteschlange(
    state, root, "#status-bau-warteschlange", planet.bauWarteschlange,
    (e) => t("{name} → Stufe {stufe}", { name: t(BUILDINGS[e.gebaeudeId].name), stufe: e.zielLevel }),
    (i) => bauWarteschlangeEntfernen(state, planet, i),
    "status:" + String(planet.id),
    null,
    (w) => warteschlangeKosten(planet, w)
  );

  const forschungKopf = root.querySelector("#status-forschung-kopf");
  forschungKopf.innerHTML = state.forschungsQueue
    ? zeile(`${t(RESEARCH[state.forschungsQueue.forschungId].name)} → ${state.forschungsQueue.zielLevel}`, fmtDauer(forschungRestSekunden(state)))
    : state.forschungsWarteschlange.length ? "" : leerZeile();
  renderWarteschlange(
    state, root, "#status-forschung-warteschlange", state.forschungsWarteschlange,
    (e) => t("{name} → Stufe {stufe}", { name: t(RESEARCH[e.forschungId].name), stufe: e.zielLevel }),
    (i) => forschungWarteschlangeEntfernen(state, i),
    "status",
    // Aufwand geteilt durch den AKTUELLEN Fluss aller Labore -- dieselbe
    // Rechnung wie in renderForschung, nur an einem zweiten Ziel gerendert.
    (eintrag) => {
      const fluss = forschungsFluss(state);
      const aufwand = eintrag.aufwand ?? forschungsAufwand(RESEARCH[eintrag.forschungId], eintrag.zielLevel);
      return fluss > 0 ? (aufwand / fluss) * 3600 : Infinity;
    }
  );

  const werftKopf = root.querySelector("#status-werft-kopf");
  werftKopf.innerHTML = planet.werftQueue
    ? zeile(`${planet.werftQueue.anzahl}× ${t(SCHIFFE[planet.werftQueue.schiffId].name)}`, kopfZeitText(state, planet, planet.werftQueue, "werft", jetzt))
    : planet.werftWarteschlange.length ? "" : leerZeile();
  renderWarteschlange(
    state, root, "#status-werft-warteschlange", planet.werftWarteschlange,
    (e) => `${e.anzahl}× ${t(SCHIFFE[e.schiffId].name)}`, // reine Zahl plus Name, kein Satz
    (i) => werftWarteschlangeEntfernen(state, planet, i),
    "status:" + String(planet.id),
    null,
    (w) => warteschlangeKosten(planet, w)
  );

  // Rest-Statusblock: was übrig bleibt, wenn Bau/Forschung/Werft abgetrennt
  // sind -- Flottenbewegung und Logistiktransfers. Kein Bauauftrag, passt in
  // keinen der drei Deckel (Deutung der Planung, siehe A-144-Auftrag).
  //
  // Der Flottenname geht durch htmlText: die Zeilen landen unten per innerHTML
  // in der Spalte, und er ist der einzige Text hier, den der Spieler selbst
  // geschrieben hat.
  const block = root.querySelector("#status-block");
  const zeilen = [];
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
        `${buendelText({ [transfer.resId]: transfer.menge })} → ${ziel ? htmlText(ziel.name) : "?"}`,
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
// `dauerFn` (A-028): woher die Dauer eines Eintrags kommt. Bauten und Schiffe
// tragen sie als `dauerSek` mit sich; die FORSCHUNG nicht -- ihre Eintraege
// kennen nur den Aufwand, und wie lange der dauert, haengt am aktuellen Fluss
// aller Labore. Ohne diese Funktion las die Anzeige `dauerSek`, fand undefined
// und zeigte fuer JEDE Forschung "unter 1 Tag" -- die Summe der Warteschlange
// ebenso. Das war Tobis zweiter Befund in A-028.
// `kostenFn` (A-077): was die WARTENDEN Einträge zusammen kosten. Bauten und
// Schiffe reichen `warteschlangeKosten` durch, die Forschung gar nichts --
// sie kostet seit v0.6 kein Material, und eine leere Summe bekommt keine
// Zeile statt einer leeren.
// `verschiebbar` (A-080): darf diese Schlange umsortiert werden? Alle drei
// dürfen es -- der Schalter steht trotzdem hier, weil die Zeile sonst Knöpfe
// bekäme, die je nach Aufrufer ins Leere zeigen.
function renderWarteschlange(state, root, containerId, warteschlange, labelFn, entfernen, kontext = "", dauerFn = null, kostenFn = null, verschiebbar = true) {
  const dauerVon = dauerFn || ((eintrag) => eintrag.dauerSek || 0);
  // A-080: Die Schieber greifen auf die Liste zu, die BEIM KLICK gilt. Sie
  // liegt im Spielstand und wird von `renderWarteschlange` bei jedem
  // Bildaufbau frisch hereingereicht -- eingefangen wäre sie nach einem
  // Planetenwechsel die Liste der alten Welt (die Lehre aus A-091).
  const warteschlangeJetzt = () => warteschlange;
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
  const gesamtSek = warteschlange.reduce((summe, e) => summe + dauerVon(e), 0);

  // `kontext` trägt die Planeten-Kennung: der Entfernen-Handler unten fängt
  // die `entfernen`-Funktion des Aufrufers ein, und die hängt an EINEM
  // Planeten. Ohne den Kontext im Schlüssel bliebe die Liste über einen
  // Planetenwechsel stehen und nähme Aufträge auf der falschen Welt heraus.
  const geruest = `warteschlange:${sprache()}:${kontext}`;
  if (el.dataset.geruest !== geruest) {
    el.dataset.geruest = geruest;
    el.innerHTML =
      `<div class="dezent warteschlange-titel"></div>` +
      `<div class="dezent warteschlange-kosten" hidden><span class="zeilen-marke" data-summe-marke></span> <span data-summe-wert></span></div>` +
      `<ol class="warteschlange-liste"></ol>`;
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
      "Diese Aufträge starten nacheinander, sobald der laufende fertig ist. Bezahlt wird erst, wenn einer vorn steht – bis dahin bindet er nichts. Zusammen noch {dauer} Bauzeit.",
      { dauer: fmtDauer(gesamtSek) }
    )
  );

  // A-077: was hier noch zu zahlen ist, in einer Zeile. Dieselbe Schreibweise
  // wie die Kostenzeile einer Kachel (Symbol + Menge), damit die beiden Zahlen
  // vergleichbar bleiben; der ausgeschriebene Text steht im Tooltip, damit
  // niemand ein Symbol raten muss.
  //
  // R-1/A-100: die Summe zählt NUR die wartenden Einträge (`warteschlange`,
  // ohne den laufenden Kopf -- `warteschlangeKosten` bekommt genau diese
  // Liste und nichts sonst). Die Beschriftung sagt das jetzt selbst, statt
  // stillschweigend eine kleinere Zahl zu zeigen, als „Kosten zusammen"
  // vermuten lässt.
  const summe = kostenFn ? kostenFn(warteschlange) : {};
  const summenZeile = el.querySelector(".warteschlange-kosten");
  const hatSumme = Object.keys(summe).length > 0;
  summenZeile.hidden = !hatSumme;
  if (hatSumme) {
    textSetzen(summenZeile.querySelector("[data-summe-marke]"), t("Wartend zusammen"));
    textSetzen(summenZeile.querySelector("[data-summe-wert]"), buendelSymbole(summe));
    attributSetzen(
      summenZeile,
      "title",
      t(
        "Was hier noch WARTET, kostet zusammen {buendel} – der laufende Auftrag ist bereits bezahlt und zählt nicht mit. Abgebucht wird erst, wenn ein Eintrag vorn steht.",
        { buendel: buendelText(summe) }
      )
    );
  }

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
          t("Aus der Warteschlange nehmen.")
        );
        btn.addEventListener("click", () => {
          // NICHT der bei der Erzeugung eingefangene Index, sondern der
          // aktuelle -- siehe die Falle im Kopf dieser Funktion.
          entfernen(Number(li.dataset.position));
          render(state, root);
        });
        // A-080: einen Platz nach vorn / nach hinten. Beide Knöpfe lesen ihren
        // Index beim Klick aus dem Element -- dieselbe Falle wie beim ×, und
        // hier zusätzlich, weil ein Verschieben die Positionen der Nachbarn
        // sofort verändert.
        const hoch = document.createElement("button");
        hoch.className = "warte-schieber";
        hoch.textContent = "▲";
        attributSetzen(hoch, "title", t("Einen Platz nach vorn."));
        const runter = document.createElement("button");
        runter.className = "warte-schieber";
        runter.textContent = "▼";
        attributSetzen(runter, "title", t("Einen Platz nach hinten."));
        const schieben = (richtung) => {
          warteschlangeVerschieben(warteschlangeJetzt(), Number(li.dataset.position), richtung);
          render(state, root);
        };
        hoch.addEventListener("click", () => schieben(-1));
        runter.addEventListener("click", () => schieben(1));
        // A-017 (Tobis Punkt 38): das × steht VOR dem Namen. Die feste
        // Spalte dafuer kommt aus dem CSS, damit die Namen in allen drei
        // Warteschlangen buendig beginnen.
        li.append(btn, hoch, runter, document.createTextNode(" "), text);

        // A-080, Tobis eigentlicher Wunsch: mit der Maus ziehen. Mit
        // Bordmitteln, ohne Bibliothek -- HTML kann das selbst.
        //
        // DASS ES HIER ÜBERHAUPT GEHT, ist ein Ergebnis von A-076: Bis v1.53
        // wurden Listenzeilen im Takt ersetzt, und ein Zug über einen
        // ersetzten Knoten bricht ab. Seit die Zeilen stehen bleiben
        // (listeAbgleichen) überlebt ein Zug jeden Sekundentakt. Die Knöpfe
        // bleiben trotzdem: sie sind der tastaturtaugliche Weg, und sie sind
        // der Weg, der auf jedem Gerät funktioniert.
        li.draggable = true;
        li.addEventListener("dragstart", (ereignis) => {
          li.classList.add("zug-quelle");
          if (ereignis.dataTransfer) {
            ereignis.dataTransfer.effectAllowed = "move";
            // Nutzlast ist die POSITION, nicht der Eintrag: was verschoben
            // wird, steht im Spielstand, nicht im Zwischenspeicher der Maus.
            ereignis.dataTransfer.setData("text/plain", String(li.dataset.position));
          }
        });
        li.addEventListener("dragend", () => {
          li.classList.remove("zug-quelle");
          for (const zeile of li.parentElement ? li.parentElement.children : []) zeile.classList.remove("zug-ziel");
        });
        li.addEventListener("dragover", (ereignis) => {
          ereignis.preventDefault(); // ohne das nimmt der Browser den Abwurf nicht an
          if (ereignis.dataTransfer) ereignis.dataTransfer.dropEffect = "move";
          li.classList.add("zug-ziel");
        });
        li.addEventListener("dragleave", () => li.classList.remove("zug-ziel"));
        li.addEventListener("drop", (ereignis) => {
          ereignis.preventDefault();
          li.classList.remove("zug-ziel");
          const von = Number(ereignis.dataTransfer ? ereignis.dataTransfer.getData("text/plain") : NaN);
          const nach = Number(li.dataset.position);
          if (!Number.isInteger(von) || !Number.isInteger(nach)) return;
          warteschlangeUmordnen(warteschlangeJetzt(), von, nach);
          render(state, root);
        });
        return li;
      },
      aktualisieren: (li, { eintrag, i }) => {
        li.dataset.position = i;
        // A-080: Der erste kann nicht weiter nach vorn, der letzte nicht
        // weiter nach hinten. Gesperrt statt versteckt -- ein Knopf, der
        // verschwindet, lässt die Zeile springen (Prinzip 8).
        const [, hochKnopf, runterKnopf] = li.querySelectorAll("button");
        if (hochKnopf && runterKnopf) {
          hochKnopf.hidden = !verschiebbar;
          runterKnopf.hidden = !verschiebbar;
          hochKnopf.disabled = i === 0;
          runterKnopf.disabled = i === warteschlange.length - 1;
        }
        textSetzen(li.querySelector("[data-label]"), labelFn(eintrag));
        attributSetzen(
          li,
          "title",
          t("Position {nr} · Bauzeit {dauer}", { nr: i + 1, dauer: fmtDauer(dauerVon(eintrag)) })
        );
      },
    }
  );
}

function renderAusbauListe(state, root, opts) {
  const liste = root.querySelector(opts.listenId);
  // EINMAL je Liste, nicht je Kachel: die Beschaffungszeit (A-065) steht auf
  // JEDER Kachel, und die Produktionsaufloesung dafuer je Kachel zu holen
  // waere der A-030-Fehlertyp -- keine teure Rechnung, aber ein Dutzend Mal
  // je Bildaufbau.
  const ratenFuerBeschaffung = effektiveRaten(state, aktiverPlanet(state)).lager;
  const sichtbareIds = Object.keys(opts.defs).filter((id) => !opts.sichtbar || opts.sichtbar(id));

  // Kacheln werden abgeglichen statt neu gebaut -- siehe listeAbgleichen.
  // Vorher stand hier `liste.innerHTML = ""`, und damit war jeder Ausbau-Knopf
  // im Sekundentakt ein anderes DOM-Element.
  const kachelAbgleich = (container, ids, startNach = null) =>
    listeAbgleichen(container, ids, {
      startNach,
      schluessel: (id) => id,
      bauen: (id) => kachelGeruest(state, root, opts, id),
      aktualisieren: (li, id) => kachelFuellen(state, root, opts, id, li, ratenFuerBeschaffung),
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

// DER AUFTRAGSKONTEXT EINER KACHEL -- und warum er NEBEN dem Element liegt
// (A-091).
//
// Die Kacheln überleben seit Prinzip 8a jeden Takt, und das ist richtig. Sie
// überleben aber auch den PLANETENWECHSEL, und genau da lag der Fehler: die
// Klick-Handler in `kachelGeruest` fingen das `opts`-Bündel ein, das beim
// BAUEN galt -- und darin steckt `starten: (id) => bauStarten(state, planet, id)`
// mit dem Planeten von damals. Wer auf einer Kolonie „Ausbauen" drückte, baute
// auf der Heimatwelt; vor Ort sah das aus wie „der Klick macht gar nichts"
// (Tobis Meldung, 19.08.).
//
// Werft, Markt und Warteschlangen lösen dasselbe über die Planeten-Kennung im
// SCHLÜSSEL -- ihre Elemente werden beim Wechsel neu gebaut. Hier ist der
// andere Weg richtig, und er steht schon zweimal in `kachelGeruest` selbst
// (Stromvorrang, Betriebsmodus): nicht einfangen, sondern beim Klick lesen.
// Die Kachel bleibt damit stehen -- was A-076 gerade erst als Wert
// nachgewiesen hat -- und trifft trotzdem die Welt, die der Spieler ansieht.
//
// `kachelFuellen` läuft in JEDEM Bildaufbau mit dem frischen Bündel, auch für
// eine eben erst gebaute Kachel (`listeAbgleichen` ruft `bauen` und direkt
// danach `aktualisieren`). Was hier liegt, ist deshalb nie älter als der
// letzte Bildaufbau.
const kachelAuftraege = new WeakMap();

// A-095: Welche Kachel gerade nach der Bestätigung fragt. UI-lokal und
// bewusst NICHT im Spielstand -- eine halb gestellte Frage gehört nicht in
// eine Datei, die man morgen wieder lädt. Nur EINE Frage gleichzeitig: wer
// eine zweite Kachel anfasst, hat die erste offensichtlich nicht gemeint.
let rueckbauFrage = null;

// Füllt eine bestehende Kachel mit frischen Werten. Erzeugt NICHTS -- das
// Gerüst kommt aus kachelGeruest und bleibt über die ganze Lebensdauer der
// Liste dasselbe DOM-Element.
function kachelFuellen(state, root, opts, id, li, lagerRaten) {
  kachelAuftraege.set(li, opts);
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

    // Was die nächste Stufe zusätzlich bringt -- die eigentlich interessante
    // Zahl beim Ausbauen. EINE Rechnung für alle vier Zeilen (Energie,
    // Produktion, Verbrauch, Speicher), und sie steht in state.js: sie ist
    // eine Aussage über die Welt, kein Anzeigedetail, und nur dort prüfbar.
    //
    // A-087: Ihr Bezug ist die Stufe VOR dem Ziel, nicht die heutige. Solange
    // ein Bau läuft, weichen die beiden voneinander ab, und die Kachel zeigte
    // den falschen Sprung.
    const vorschau = ausbauVorschau(state, opts.defs === BUILDINGS ? planetFuerKachel : null, def, ziel);
    // Energie-Delta der nächsten Stufe -- Gebäude sind die einzigen Defs mit
    // produktion/verbrauch, Forschung hat dieses Feld schlicht nicht.
    const zeigeEnergie = def.verbrauch?.energie || def.produktion?.energie;
    const energieDelta = zeigeEnergie ? vorschau.energie : 0;

    // Was die nächste Stufe zusätzlich einbringt. Forschungsboni und die
    // planetare Affinität stecken schon in `ausbauVorschau` -- auf einer
    // Vulkanwelt bringt dieselbe Iridiummine fast das Doppelte, und stünde
    // hier der Rohwert, wäre die Zahl auf der Kachel schlicht falsch.
    const produktionsDelta = vorschau.produktion;
    const hatProduktion = Object.keys(produktionsDelta).length > 0;

    // Laufender Verbrauch GELAGERTER Ressourcen (Verarbeitungsketten, ab
    // v0.18). Ohne diese Zeile sähe man an der Kachel nur den Gewinn und
    // müsste den Preis raten -- genau die Lücke, die bei der Handelsspanne
    // schon einmal aufgefallen ist. Energie steht weiter separat als ⚡.
    const verbrauchsDelta = vorschau.verbrauch;
    const hatVerbrauch = Object.keys(verbrauchsDelta).length > 0;

    // A-114: der Brennstoff (Kraftwerk) steht bei `ausbauVorschau` in einem
    // EIGENEN Block, getrennt von `verbrauch` (siehe dort, A-055). Ohne diese
    // Zeile verschwieg die Kachel die teuerste laufende Position des
    // Gebäudes -- sie zeigte Arbeitskraft und Energie, aber keinen Brennstoff.
    const brennstoffDelta = vorschau.brennstoff;
    const hatBrennstoff = Object.keys(brennstoffDelta).length > 0;

    // Gebäude, die eine eigene Speicherkapazität stellen (Wohnmodul, später
    // Batteriehalle), produzieren nichts -- ohne diese Zeile sähe ihre Kachel
    // aus, als brächte ein Ausbau gar nichts.
    const speicherRes = vorschau.speicherRes;
    const speicherDelta = vorschau.speicher;

    // A-168 (Tobis Fall: Fossilanlage Stufe 3, Vorrat aufgebraucht): die
    // Zeilen oben (`energieText`, `hatProduktion`) sind eine Aussage über
    // die FORMEL -- was diese Stufe bei vollem Brennstoff bringt/brächte.
    // Das bleibt richtig. Was fehlte: dass eine bereits GEBAUTE, brennstoff-
    // gebundene Anlage diese Formel gerade gar nicht einlöst. Dieselbe
    // Prüfung wie an der Kopfleiste (brennstoffBereit deckt seit A-147 sowohl
    // `def.fossil` als auch `def.brennstoff` ab -- EIN Tor, nicht zwei), nur
    // zusätzlich an der eigenen Kachel, wie A-114 es für den laufenden
    // Verbrauch schon eingeführt hat: eine eigene Zeile, nicht ein
    // umgeschriebener Wert.
    const brauchtBrennstoff = opts.defs === BUILDINGS && (def.fossil || def.brennstoff);
    const brennstoffAus = brauchtBrennstoff && level >= 1 && !brennstoffBereit(planetFuerKachel, def, level);
    // Dieselben Symbole/Texte wie an der Kopfleiste (brennstoffZeilen unten)
    // -- eine Wahrheit, zwei Orte, kein zweiter Wortlaut. Die Kachel-Zeile
    // bleibt kurz (wie kachel-verbrauch/-gewinn daneben), der Tooltip trägt
    // denselben ausgeschriebenen Satz wie die jeweilige Kopfleisten-Zeile.
    const brennstoffAusText = !brennstoffAus
      ? ""
      : id === "fossilanlage"
        ? `🛢️ ${t("Fossiler Vorrat aufgebraucht")}`
        : id === "kernkraftanlage"
          ? `☢️ ${t("Kein Brennstoff – Reaktor aus")}`
          : `⚛️ ${t("Kein Brennstoff – Reaktor aus")}`;
    const brennstoffAusTitel = !brennstoffAus
      ? ""
      : id === "fossilanlage"
        ? t("Der fossile Vorrat dieses Planeten ist aufgebraucht – anders als Brennstoff aus dem Lager wächst er nicht nach.")
        : id === "kernkraftanlage"
          ? t("Kein Brennstoff – der Reaktor ist aus. Er zündet wieder, sobald Uran für {dauer} im Lager liegt.", {
              dauer: fmtDauer(BRENNSTOFF_ANLAUF_MS / 1000),
            })
          : t("Kein Brennstoff – der Reaktor ist aus. Er zündet wieder, sobald Deuterium für {dauer} im Lager liegt.", {
              dauer: fmtDauer(BRENNSTOFF_ANLAUF_MS / 1000),
            });

    const fertig = def.schluessel && level >= 1;
    const vorOffen = opts.voraussetzungen && !opts.voraussetzungen(id);

    // Sichtbar bleibt nur, was man beim Überfliegen braucht: Symbol, Name,
    // Stufe, Kosten (als Symbole), Dauer, Aktion. Beschreibung, ausgeschriebene
    // Kosten, Energiebilanz und Voraussetzungen wandern in den Tooltip --
    // dadurch passen alle Kacheln in ein einheitliches Format.
    // A-126 (P19): Tooltip-Text -- reines Vorzeichen+Betrag, keine Farbe (ein
    // `title`-Attribut kann kein Markup tragen).
    const energieText = zeigeEnergie
      ? t("Energie {vorzeichenBetrag} MW", {
          vorzeichenBetrag: vorzeichenText(Math.round(energieDelta), fmt),
        })
      : "";
    const tooltip = [
      t(def.beschreibung),
      fertig
        ? t("Erforscht – schaltet gesperrte Objekte frei.")
        : istForschung
          ? t("Aufwand: {aufwand} FE · bei {fluss} aus allen Laboren: {dauer}", {
              aufwand: fmt(aufwand),
              fluss: forschungsRateText(forschFluss),
              dauer: fmtDauer(dauer),
            })
          : t("Nächste Stufe: {kosten} · {dauer}", {
              kosten: buendelText(kosten, { abgang: true }),
              dauer: fmtDauer(dauer),
            }),
      hatProduktion ? t("Bringt zusätzlich: {mehr}", { mehr: ratenBuendelText(produktionsDelta) }) : "",
      hatVerbrauch
        ? t("Verbraucht zusätzlich: {mehr} – fehlt der Nachschub, drosselt die Anlage anteilig", {
            mehr: ratenBuendelText(verbrauchsDelta),
          })
        : "",
      // A-114: eigene Zeile statt "verbraucht", weil der Brennstoff anders
      // wirkt -- kein Drosseln bei Mangel, sondern der Reaktor geht aus
      // (siehe brennstoffZeile oben, A-055).
      hatBrennstoff
        ? t("Brennt zusätzlich: {mehr}", { mehr: ratenBuendelText(brennstoffDelta) })
        : "",
      brennstoffAusTitel,
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
    textSetzen(li.querySelector(".kachel-stufe"), def.schluessel ? (level >= 1 ? "✓" : SYMBOLE.gesperrt) : String(level));

    // Die Mitte trägt keine Knöpfe -- sie darf am Stück neu geschrieben
    // werden, und das hält die Zahlen einfach.
    const mitte = fertig
      ? `<span class="dezent">${t("erforscht")}</span>`
      : // A-126 (P19): Kosten sind ein Abgang und bekommen deshalb ein "−" --
        // { abgang: true } kommt von HIER, nicht aus buendelSymbole selbst
        // (Falle: dieselbe Funktion zeigt an anderer Stelle Erträge/Ladung,
        // die KEIN Minus bekommen dürfen).
        `<span class="kachel-kosten"><span class="zeilen-marke">${t("Kosten")}</span> ${istForschung ? `${RESSOURCEN.forschung.symbol} ${fmt(aufwand)} ${RESSOURCEN.forschung.einheit}` : buendelSymbole(kosten, { abgang: true })}</span>
         <span class="kachel-dauer">${fmtDauer(dauer)}${
           energieText ? ` · ${vorzeichenSpan(Math.round(energieDelta))} MW` : ""
         }</span>
         ${hatProduktion ? `<span class="kachel-gewinn">${ratenBuendelMarkup(produktionsDelta, "zufluss")}</span>` : ""}
         ${hatVerbrauch ? `<span class="kachel-verbrauch">${ratenBuendelMarkup(verbrauchsDelta, "abgang")}</span>` : ""}
         ${hatBrennstoff ? `<span class="kachel-verbrauch">${ratenBuendelMarkup(brennstoffDelta, "abgang")}</span>` : ""}
         ${brennstoffAusText ? `<span class="kachel-verbrauch warnung">${brennstoffAusText}</span>` : ""}
         ${speicherDelta > 0 ? `<span class="kachel-gewinn">${RESSOURCEN[speicherRes].symbol} ${vorzeichenSpan(speicherDelta, fmt)} ${speicherEinheit(speicherRes)}</span>` : ""}`;
    // A-130: geschrieben gegen zuletzt geschrieben, nie gegen zurückgelesen
    // (dasselbe Muster wie detail.dataset.stand in slotZeileFuellen) -- der
    // Browser serialisiert innerHTML beim Auslesen normalisiert, ein reiner
    // Rückvergleich kann deshalb JEDEN Takt fehlschlagen, ohne dass sich am
    // Inhalt etwas geändert hat.
    const mitteEl = li.querySelector(".kachel-mitte");
    if (mitteEl.dataset.stand !== mitte) {
      mitteEl.dataset.stand = mitte;
      mitteEl.innerHTML = mitte;
    }

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

    // BETRIEBSMODUS (A-071): der Extraktor kann statt fördern auch anreichern.
    //
    // Die Zeile zeigt den TAUSCHKURS, nicht bloß einen Schalter (Prinzip 10a):
    // Strom in Deuterium zu wandeln ist bewusst teuer, und wie teuer, muss vor
    // dem Klick dastehen. Die Zahl wandert mit der Ausbaustufe, deshalb ein
    // eigenes Feld und `textSetzen` (8a).
    // A-095: Der Rückbau-Knopf. Er zeigt sich nur, wo etwas steht (Stufe 0 hat
    // nichts abzureißen), und nur an Gebäuden -- eine Forschung lässt sich
    // nicht abreißen.
    const rueckbauKnopfF = li.querySelector("button[data-rueckbau]");
    if (rueckbauKnopfF) {
      const istGebaeude = opts.defs === BUILDINGS;
      const stufeJetzt = istGebaeude ? planetFuerKachel.gebaeude[id] || 0 : 0;
      const gesperrt =
        (planetFuerKachel.bauQueue && planetFuerKachel.bauQueue.gebaeudeId === id) ||
        (planetFuerKachel.bauWarteschlange || []).some((e) => e.gebaeudeId === id);
      rueckbauKnopfF.hidden = !istGebaeude || stufeJetzt <= 0;
      rueckbauKnopfF.disabled = !!gesperrt;
      const gefragt = rueckbauFrage && rueckbauFrage.li === li && rueckbauFrage.id === id;
      if (!gefragt) delete rueckbauKnopfF.dataset.gefragt;
      rueckbauKnopfF.classList.toggle("fragt", !!gefragt);
      textSetzen(rueckbauKnopfF, gefragt ? t("Wirklich?") : "⌫");
      // R-3/A-100: warnt VORHER, wenn dieser Rückbau die Wohnraum-Kapazität
      // unter die aktuelle Bevölkerung drückt (A-095 fängt das Ergebnis ab,
      // aber erst danach -- Prinzip 10a will die Ansage vorher). Über
      // `speicherRessourceVon` generisch gehalten, nicht auf "wohnmodul"
      // verdrahtet: dieselbe Frage stellt sich bei jedem Gebäude, das einer
      // Ressource ihre Kapazität gibt.
      let schrumpfWarnung = "";
      if (istGebaeude && stufeJetzt > 0) {
        const kapazitaetsRes = speicherRessourceVon(id);
        if (kapazitaetsRes === "bevoelkerung") {
          const kapazitaetVorher = speicherKapazitaetFuerLevel(kapazitaetsRes, stufeJetzt);
          const kapazitaetNachher = speicherKapazitaetFuerLevel(kapazitaetsRes, stufeJetzt - 1);
          const bevoelkerung = planetFuerKachel.ressourcen.bevoelkerung || 0;
          if (kapazitaetNachher < bevoelkerung) {
            schrumpfWarnung = t("Wohnraum für {n} fällt weg – die Bevölkerung schrumpft. ", {
              n: Math.round(kapazitaetVorher - kapazitaetNachher),
            });
          }
        }
      }
      attributSetzen(
        rueckbauKnopfF,
        "title",
        gesperrt
          ? t("Erst den laufenden Auftrag abbrechen oder aus der Warteschlange nehmen.")
          : gefragt
            ? schrumpfWarnung +
              t("Noch einmal klicken: Stufe {stufe} wird abgerissen, ohne Erstattung.", { stufe: stufeJetzt })
            : t("Eine Stufe abreißen – keine Erstattung. Arbeitskraft und Strom werden frei.")
      );
    }

    const modusZeile = li.querySelector(".kachel-modus");
    const modusDef = opts.defs === BUILDINGS ? def.anreicherung : null;
    const modusFrei =
      modusDef && level > 0 && (state.forschung[modusDef.forschung] || 0) >= 1;
    modusZeile.hidden = !modusFrei;
    if (modusFrei) {
      const laeuft = anreicherungLaeuft(state, planetFuerKachel, id, def);
      const ausbeute = rate(modusDef.produktion.tritium, level);
      const strom = rate(modusDef.verbrauch.energie, level);
      const kurs = ausbeute > 0 ? strom / ausbeute : 0;
      textSetzen(modusZeile.querySelector("[data-modus-name]"), t("Anreicherung"));
      textSetzen(
        modusZeile.querySelector("[data-modus-lage]"),
        laeuft
          ? t("an · −{strom} MW → {menge}", {
              strom: fmt(Math.round(strom)),
              menge: ratenText("tritium", ausbeute),
            })
          : t("aus · {kurs} MWh je t", { kurs: fmt(Math.round(kurs)) })
      );
      const knopf = modusZeile.querySelector("[data-modus-schalter]");
      textSetzen(knopf, laeuft ? t("Ausschalten") : t("Einschalten"));
      attributSetzen(
        knopf,
        "title",
        t(
          "Trennt Deuterium aus Wasser, statt es zu fördern – bezahlt mit Strom. {kurs} MWh je Tonne, das {faktor}-fache dessen, was ein Kraftwerk aus derselben Tonne holt. Reicht der Strom nicht, drosselt die ganze Anlage – auch die Förderung.",
          { kurs: fmt(Math.round(kurs)), faktor: ANREICHERUNG_VERLUST }
        )
      );
    }

    // A-044, Chris: „for the shipyard it was pretty unclear that I needed 60k
    // population … had to look pretty closely". Die Bedingung stand nur im
    // Tooltip -- also genau dort, wo man erst nachsieht, wenn man schon weiß,
    // dass es eine gibt.
    //
    // Sie steht jetzt auf der Kachel, in EIGENER Zeile. Was hier NICHT
    // hingehört, ist fehlendes Material: das ist keine Bedingung, sondern der
    // Normalzustand kurz vor dem Bauen, und es stünde auf jeder zweiten
    // Kachel. Die Unterscheidung gibt es bereits -- `nurGeld` (A-012) heißt
    // genau „es fehlt nur Material".
    //
    // Der Fortschritt („aktuell 41.500") kommt aus `check.grund` und wandert
    // sekündlich. Deshalb `textSetzen` in ein eigenes Feld statt Neubau der
    // Zeile (8a, Lernpunkt 2).
    const sperre = li.querySelector(".kachel-sperre");
    const bedingung = vorOffen
      ? `${SYMBOLE.gesperrt} ${voraussetzungenText(id)}`
      : !check.ok && !check.nurGeld && !fertig
        ? `${SYMBOLE.gesperrt} ${check.grund}`
        : "";
    sperre.hidden = !bedingung;
    if (bedingung) textSetzen(sperre, bedingung);

    // A-065: WAS FEHLT NOCH, UND WIE LANGE DAUERT ES.
    //
    // Der Anlass ist der Magnetschild: seine Elektronik braucht bei einer
    // Fertigung der Stufe 1 rund 25 Stunden, das Fenster nach dem Blitz ist
    // etwa 24 -- „exakt nicht genug", und bisher stand das nirgends. Aus
    // einer Falle wird damit eine sichtbare Entscheidung (ausbauen oder
    // verlieren), ohne dass eine Balance-Zahl angefasst wird.
    //
    // Die Zeile gilt für JEDE Kachel mit ungedecktem Posten, nicht nur für
    // den Schild -- der Mechanismus fällt dort gratis mit an (Prinzip 5).
    //
    // EIN Feld, ein `textSetzen`: die Stundenzahl wandert mit der Produktion,
    // und eine je Takt neu gebaute Zeile wäre der 8a-Fehler.
    const beschaffung = li.querySelector(".kachel-beschaffung");
    const fehlend = fertig ? [] : beschaffungsZeiten(planetFuerKachel, kosten, lagerRaten);
    beschaffung.hidden = fehlend.length === 0;
    if (fehlend.length > 0) {
      textSetzen(
        beschaffung,
        `⏳ ${fehlend
          .map((f) =>
            f.stunden === null
              ? t("{res}: keine Produktion", { res: t(RESSOURCEN[f.resId].name) })
              : t("{res}: {dauer}", { res: t(RESSOURCEN[f.resId].name), dauer: fmtDauer(f.stunden * 3600) })
          )
          .join(" · ")}`
      );
      // Die ausführliche Fassung samt Menge und Anlage steht im Tooltip --
      // auf der Kachel selbst wäre sie zu lang, und die Kachelhöhe gilt
      // wegen `grid-auto-rows: 1fr` für ALLE Kacheln gleichzeitig.
      attributSetzen(
        beschaffung,
        "title",
        fehlend
          .map((f) => {
            const anlage = RESSOURCEN[f.resId].gebaeude;
            const menge = `${fmt(Math.ceil(f.fehlt))}${einheit(f.resId) ? " " + einheit(f.resId) : ""}`;
            if (f.stunden === null) {
              return t("{res}: es fehlen {menge}, und es kommt nichts nach.", {
                res: t(RESSOURCEN[f.resId].name),
                menge,
              });
            }
            return anlage
              ? t("{res}: es fehlen {menge} – bei deiner {anlage} noch {dauer}.", {
                  res: t(RESSOURCEN[f.resId].name),
                  menge,
                  anlage: t(BUILDINGS[anlage].name),
                  dauer: fmtDauer(f.stunden * 3600),
                })
              : t("{res}: es fehlen {menge} – bei deinem Zufluss noch {dauer}.", {
                  res: t(RESSOURCEN[f.resId].name),
                  menge,
                  dauer: fmtDauer(f.stunden * 3600),
                });
          })
          .join("\n")
      );
    }

    // Abfrage über das Datenattribut, nicht über die Darstellungsklasse:
    // ein Selektor ".status.im-bau" sieht für die Übersetzungsprüfung wie
    // deutscher Text aus ("Bau" steht in ihrer Wortliste), und ein Fehlalarm,
    // der jeden Lauf rot macht, ist teurer als ein sauberer Selektor.
    const queueZeile = li.querySelector("[data-queue-zeile]");
    // A-086, erster Befund: EIN eingereihter Auftrag hat auch eine Kachel.
    //
    // Bis hierher fragte die Zeile nur nach `opts.queue` -- dem LAUFENDEN
    // Auftrag. Wer während eines Baus etwas einreihte, sah auf dessen Kachel
    // nichts: kein Eintrag, keine Zahl, „Ausbauen" weiter klickbar. Der Klick
    // war real (die Warteschlangen-Liste unter dem Panel führte ihn), nur die
    // Kachel schwieg -- und damit genau die Stelle, an der geklickt wurde.
    const wartePos =
      !inQueue && opts.warteschlange
        ? opts.warteschlange.findIndex((e) => e[opts.queueIdFeld] === id)
        : -1;
    queueZeile.hidden = !inQueue && wartePos < 0;
    li.classList.toggle("item-aktiv", !!inQueue);
    if (inQueue) {
      const rest = istForschung
        ? forschungRestSekunden(state)
        : (opts.queue.fertigZeit - spielzeitJetzt(state)) / 1000;
      // Läuft der Auftrag, ist es die Restdauer; wartet er auf Material, sagt
      // er das (A-012/10a) -- dieselbe Auskunft wie in der Statusspalte.
      const zeitText = istForschung
        ? fmtDauer(rest)
        : kopfZeitText(state, planetFuerKachel, opts.queue, "bau", spielzeitJetzt(state));
      // A-013: eine laufende ZAHLEN-Forschung wirkt schon anteilig -- also
      // muss sie das auch sagen (Prinzip 10a). Sonst sieht der Spieler eine
      // Rate steigen und findet keinen Grund dafuer. Freischaltungen zeigen
      // nichts an, weil bei ihnen auch nichts anteilig wirkt.
      const graduell =
        istForschung && RESEARCH[id].boost && RESEARCH[id].boost.graduell && opts.queue.aufwand > 0;
      const anteilText = graduell
        ? ` · ${t("wirkt bereits zu {prozent} %", {
            prozent: Math.floor(((opts.queue.fortschritt || 0) / opts.queue.aufwand) * 100),
          })}`
        : "";
      // Steht dasselbe Gebäude ZUSÄTZLICH in der Schlange (zweimal „Ausbauen"
      // hintereinander ist der häufigste Fall), sagt die Zeile auch das --
      // sonst schluckt die laufende Stufe die wartende.
      const weitere = opts.warteschlange
        ? opts.warteschlange.filter((e) => e[opts.queueIdFeld] === id).length
        : 0;
      const weiterText = weitere > 0 ? ` · ${t("+{n} wartet", { n: weitere })}` : "";
      textSetzen(
        queueZeile.querySelector("[data-queue-text]"),
        `→ ${opts.queue.zielLevel} · ${zeitText}${anteilText}${weiterText}`
      );
      delete li.dataset.wartePosition; // das ✕ bricht hier den LAUFENDEN ab
      fortschrittSetzen(
        li,
        istForschung
          ? anteilVon(opts.queue.fortschritt, opts.queue.aufwand)
          : opts.queue.fertigZeit === null
            ? 0 // A-012: wartet auf Material, es läuft noch nichts.
            : 1 - anteilVon(rest, opts.queue.dauerSek)
      );
      attributSetzen(
        queueZeile.querySelector("button[data-abbrechen]"),
        "title",
        istForschung
          ? t("Abbrechen – der bisherige Fortschritt ist verloren, gezahlt wurde mit Strom und Arbeitszeit")
          : t("Abbrechen, Kosten erstattet")
      );
    } else if (wartePos >= 0) {
      // Der wartende Eintrag. Seine Zeit kommt aus `warteStartSekunden` --
      // Restzeit des Laufenden plus die Dauern davor. Aus festen Zahlen, nicht
      // aus Raten: nur so fällt sie monoton und steht bei Pause still (A-086,
      // dritter Befund). Ist der Kopf selbst noch nicht datierbar (er wartet
      // auf Material), steht die Position da und KEINE Zahl.
      const eintrag = opts.warteschlange[wartePos];
      const start = warteStartSekunden(
        opts.kopfRest ? opts.kopfRest() : null,
        opts.warteschlange,
        wartePos,
        opts.dauerVon
      );
      textSetzen(
        queueZeile.querySelector("[data-queue-text]"),
        `→ ${eintrag.zielLevel} · ` +
          (start === null
            ? t("wartet als Nr. {nr}", { nr: wartePos + 1 })
            : t("wartet als Nr. {nr} · startet in ~{dauer}", { nr: wartePos + 1, dauer: fmtDauer(start) }))
      );
      // Die Position wandert mit der Schlange und wird beim KLICK gelesen,
      // nicht beim Verdrahten -- dieselbe Falle wie in renderWarteschlange:
      // ein eingefangener Index nimmt nach der ersten Löschung den falschen
      // Auftrag heraus.
      li.dataset.wartePosition = String(wartePos);
      fortschrittSetzen(li, 0); // es läuft noch nichts
      attributSetzen(
        queueZeile.querySelector("button[data-abbrechen]"),
        "title",
        t("Aus der Warteschlange nehmen.")
      );
    } else {
      // Zurück auf null, sobald nichts mehr läuft: sonst stünde beim nächsten
      // Auftrag für einen Bildaufbau lang der ALTE, fast volle Balken da.
      fortschrittSetzen(li, 0);
      // A-086, zweiter Befund: auch der TEXT muss weg. Er blieb bisher im
      // versteckten Element stehen ("→ 1 · 42 Tage" der fertigen Stufe) --
      // ein Geist, den jeder DOM-Blick findet und den jede künftige Änderung
      // an dieser Zeile wieder sichtbar machen kann.
      textSetzen(queueZeile.querySelector("[data-queue-text]"), "");
      delete li.dataset.wartePosition;
    }

    const aktion = li.querySelector("button.kachel-aktion");
    aktion.hidden = !!fertig;
    // A-012: fehlt NUR das Material, bleibt der Knopf benutzbar -- der Auftrag
    // reiht sich ein und wartet. Alles andere (Forschung fehlt, Bevoelkerung
    // zu klein, Rohstoff gibt es hier nicht) sperrt weiterhin, denn daran
    // aendert kein Zuwarten etwas.
    const einreihbar = check.ok || check.nurGeld === true;
    aktion.disabled = !einreihbar;
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
    <div class="kachel-modus bedienzeile" hidden>
      <span class="zeile-beschriftung" data-modus-name></span>
      <span class="zeile-zahl dezent" data-modus-lage></span>
      <button class="zeile-knopf-1" data-modus-schalter></button>
    </div>
    <div class="kachel-sperre" hidden></div>
    <div class="kachel-beschaffung dezent" hidden></div>
    <div class="status im-bau" data-queue-zeile hidden><span data-queue-text></span> <button data-abbrechen="1">✕</button></div>
    <div class="kachel-zeile-aktion">
      <button class="kachel-aktion" ${opts.attribut}="${id}"></button>
      <button class="kachel-rueckbau" data-rueckbau hidden>⌫</button>
    </div>`;

  // Das gerade gültige Auftragsbündel dieser Kachel -- siehe kachelAuftraege.
  // Der Rückfall auf `opts` greift nur vor dem allerersten Füllen, und dann
  // ist es dasselbe Bündel.
  const auftrag = () => kachelAuftraege.get(li) || opts;

  li.querySelector("button[data-abbrechen]").addEventListener("click", () => {
    // Zwei Bedeutungen, ein Knopf: auf der Kachel des LAUFENDEN Auftrags
    // bricht er ihn ab, auf der eines WARTENDEN nimmt er ihn aus der Schlange
    // (A-086). Welche gilt, steht am Element und wird beim Klick gelesen --
    // die Position rückt nach, ein eingefangener Index träfe den Falschen.
    const pos = li.dataset.wartePosition;
    const jetzt = auftrag();
    if (pos !== undefined && jetzt.warteschlangeEntfernen) jetzt.warteschlangeEntfernen(Number(pos));
    else jetzt.abbrechen();
    render(state, root);
  });
  li.querySelector("button.kachel-aktion").addEventListener("click", () => {
    auftrag().starten(id);
    render(state, root);
  });
  // A-095: Rückbau. Der Planet wird beim Klick gelesen (A-091), und der
  // Doppelklick-Schutz ist keine Zeitsperre, sondern die Bestätigung selbst:
  // der erste Klick fragt, der zweite reißt ab. Eine Zeitsperre würde einen
  // entschlossenen Doppelklick durchlassen -- genau das, wovor sie schützen
  // soll.
  const rueckbauKnopf = li.querySelector("button[data-rueckbau]");
  if (rueckbauKnopf) {
    rueckbauKnopf.addEventListener("click", () => {
      if (rueckbauKnopf.dataset.gefragt !== "1") {
        rueckbauKnopf.dataset.gefragt = "1";
        rueckbauFrage = { id, li };
        render(state, root);
        return;
      }
      delete rueckbauKnopf.dataset.gefragt;
      rueckbauFrage = null;
      rueckbauen(aktiverPlanet(state), id);
      render(state, root);
    });
  }
  // Stromvorrang. Ereignisse EINMAL beim Bauen -- wie alles andere hier auch,
  // sonst verschluckt genau dieser Knopf im Notfall den Klick (Prinzip 8a).
  for (const knopf of li.querySelectorAll("button[data-strom]")) {
    knopf.addEventListener("click", () => {
      stromPrioritaetSetzen(aktiverPlanet(state), id, Number(knopf.dataset.strom));
      render(state, root);
    });
  }
  // Betriebsmodus (A-071). Wie der Vorrang: EINMAL verdrahtet, der Planet wird
  // beim Klick gelesen und nicht eingefangen -- die Kachel überlebt einen
  // Planetenwechsel.
  const modusKnopf = li.querySelector("button[data-modus-schalter]");
  if (modusKnopf) {
    modusKnopf.addEventListener("click", () => {
      const ziel = aktiverPlanet(state);
      anreicherungSetzen(ziel, id, !anreicherungAn(ziel, id));
      render(state, root);
    });
  }
  return li;
}

// --- „Diese Welt in Zahlen" (A-064) ---------------------------------------
//
// Fünf Gruppen über den Gebäudegruppen, zwei bis drei Spalten breit. Das
// Gerüst entsteht EINMAL, danach wandern nur noch Werte durch `textSetzen`.
// Das ist hier nicht Kür, sondern der 8a-Lernpunkt 2 in Reinform: auf einem
// Fleck stehen dreißig Zahlen, die im Sekundentakt wandern. Würde der Block
// je Takt neu geschrieben, zerrisse er jede Textauswahl der Maus und jeden
// Tooltip, der gerade offen ist.
//
// Gerechnet wird NICHTS -- `planetUebersicht` (state.js) liefert alles fertig
// und ruft die Produktionsauflösung dabei genau einmal auf.
const UEBERSICHT_LEER = "—";

// A-082: Das Umbenennen-Feld gehört zum Gerüst und wird EINMAL verdrahtet --
// im Sekundentakt neu gebaut verlöre es beim Tippen den Fokus (8a). Welcher
// Planet gemeint ist, wird beim Klick gelesen und nicht eingefangen: die
// Übersicht überlebt den Planetenwechsel (die Lehre aus A-091).
function uebersichtGeruest(box, state, root) {
  const zeile = (schluessel) =>
    `<div class="uebersicht-zeile">
       <span class="uebersicht-marke" data-marke="${schluessel}"></span>
       <span class="uebersicht-wert" data-wert="${schluessel}"></span>
     </div>`;
  const gruppe = (id, schluessel) =>
    `<div class="uebersicht-gruppe" data-gruppe="${id}">
       <div class="uebersicht-titel" data-titel="${id}"></div>
       ${schluessel.map(zeile).join("")}
       <div data-liste="${id}"></div>
     </div>`;
  // A-169 (Tobis Meldung 31.08.: "da ist ein Riesen Feld mit nichts drin"):
  // Die Namenszeile stand bis dahin als ERSTES KIND im 3-Spalten-Kartenraster
  // -- ihre Rasterzelle wurde dadurch so hoch wie ihre Nachbarkarte (146 px),
  // ihr Inhalt aber blieb 30 px, macht 116 px sichtbar leere Fläche direkt
  // neben zwei gerahmten Karten. Weg B aus dem Auftrag: die Zeile wandert als
  // eigene Kopfzeile ÜBER das Raster, über die volle Breite -- damit teilt
  // sie keine Rasterzeile mehr mit einer Karte (das Leerflächen-Problem
  // verschwindet strukturell, nicht durch einen Rahmen darum, den der
  // Auftrag ausdrücklich als Risiko nennt) und ist sichtbar etwas ANDERES
  // als die Karten, keine schlechte davon. `.uebersicht-raster` trägt jetzt
  // das Grid, das vorher an `.uebersicht` selbst hing (css/style.css) --
  // Spaltenzahl/-breite (Nicht anfassen) unverändert, nur der Träger wechselt.
  box.innerHTML = `
    <div class="uebersicht-name bedienzeile">
      <span class="zeile-beschriftung" data-namen-marke></span>
      <input type="text" class="zeile-eingabe" maxlength="${PLANETENNAME_MAX}" data-planet-name />
      <button class="zeile-knopf-1" data-planet-umbenennen></button>
    </div>
    <div class="uebersicht-raster">
      <div class="uebersicht-hinweis dezent" data-hinweis hidden></div>
      ${gruppe("standort", ["welt", "orbit", "schwerkraft", "vorkommen"])}
      ${gruppe("bestaende", ["warenlager"])}
      ${gruppe("fluesse", ["energie", "brennstoff", "arbeitskraft"])}
      ${gruppe("bevoelkerung", ["menschen", "wohnraum"])}
      ${gruppe("laufendes", ["bau", "forschung", "werftauftrag"])}
    </div>`;

  const feld = box.querySelector("[data-planet-name]");
  const uebernehmen = () => {
    planetUmbenennen(state, aktiverPlanet(state), feld.value);
    render(state, root);
  };
  box.querySelector("[data-planet-umbenennen]").addEventListener("click", uebernehmen);
  // Enter ist bei einem Textfeld der erwartete Weg -- gleiche Überlegung wie
  // beim Flottennamen.
  feld.addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter") uebernehmen();
  });
}

// A-126 (P19 in AUFTRAEGE/KONZEPT-UI.md): "Das Vorzeichen färbt die Zahl,
// nicht den Text." Diese zwei Funktionen sind die einzige Stelle im Spiel,
// die künftig über das Vorzeichen einer gerichteten Zahl entscheidet -- kein
// `wert >= 0 ? "+" : "−"` mehr an einzelnen Fundstellen.
//
// `formatBetrag` bekommt den BETRAG (ohne Vorzeichen) und liefert ihn fertig
// formatiert. A-165 (Tobis Feedback 31.08., wörtlich: „Ich würde nur die
// Zahl selber Grün/Rot haben wollen sowohl wie das -/+ allerdingst nicht
// sowas wie AK oder t/jahr oder MW") korrigiert eine falsche Lesart von P19
// Regel 2, die bis dahin genau hier stand: „eng anliegende Einheiten sind
// Teil der Zahl". Das war NIE, was P19 sagt -- der Katalog nennt „−14 MW"
// nur als Beispiel für Zahl+Vorzeichen, nicht als Freibrief für die Einheit
// (KONZEPT-UI.md P19 Regel 2: „Zahl und Vorzeichen werden eingefärbt, der
// begleitende Text nicht"). `formatBetrag` liefert deshalb NUR die Zahl
// (Dezimaltrennzeichen/Kürzel wie „1,2 Mio" eingeschlossen), NIE eine
// Einheit -- die bleibt beim Aufrufer außerhalb, unbunt, egal ob „/Jahr",
// „MW", „%" oder „AK". Siehe `vorzeichenMitEinheit` unten für den häufigsten
// Fall (Ressourcen-Rate mit Einheit).
//
// Null hat keine Richtung: kein Vorzeichen, keine Farbe (Definition von
// fertig des Auftrags) -- wer eine Rate erst ab einer Sichtbarkeitsgrenze
// als "null" behandeln will (siehe nettoSichtbar unten), rundet VOR dem
// Aufruf auf 0.
export function vorzeichenText(wert, formatBetrag = fmt) {
  if (wert === 0) return formatBetrag(0);
  return (wert > 0 ? "+" : "−") + formatBetrag(Math.abs(wert));
}

// Dieselbe Entscheidung, als fertiges Markup mit der Rollenklasse
// (--zufluss/--abgang, css/style.css) für sichtbare Oberfläche --
// NUR per `markupSetzen`/innerHTML einsetzen, nie per `textSetzen`.
export function vorzeichenSpan(wert, formatBetrag = fmt) {
  if (wert === 0) return formatBetrag(0);
  return `<span class="${wert > 0 ? "zufluss" : "abgang"}">${vorzeichenText(wert, formatBetrag)}</span>`;
}

// A-165: der häufigste Fall -- eine Ressourcen-Rate mit ihrer Einheit
// (mitEinheit). Vorher stand `mitEinheit` selbst in `formatBetrag` und
// färbte die Einheit mit ("−1.875 t/Jahr" komplett rot statt nur "−1.875");
// dieser Baustein trennt beides an EINER Stelle statt an fünf Fundstellen
// einzeln (ANREICHERUNG_VERLUST-Klasse vermieden, siehe data.js).
function vorzeichenMitEinheit(resId, wert) {
  const e = einheit(resId);
  return vorzeichenSpan(wert, formatKurz) + (e ? " " + e : "");
}

// Eine Rate steht in den Tabellen pro ECHTZEITSTUNDE und wird -- wie überall
// sonst im Spiel -- pro SPIELJAHR angezeigt. Mit Vorzeichen, weil eine
// Nettorate ohne Vorzeichen die halbe Auskunft wäre. Liefert Markup
// (vorzeichenMitEinheit) -- Aufrufer setzen das Ergebnis über `markupSetzen`.
function nettoText(resId, proStunde) {
  const jahr = rateProJahr(proStunde);
  // KEIN Minus vor einer Null: `formatKurz` schneidet ab, aus −0,33 t/Jahr
  // würde sonst "−0 t/Jahr". Ein Vorzeichen an einer Null liest sich wie ein
  // Fehler und ist auch einer -- die Anzeige behauptete eine Richtung, die
  // sie gar nicht mehr auflöst.
  const sichtbar = nettoSichtbar(jahr) ? jahr : 0;
  return vorzeichenMitEinheit(resId, sichtbar) + t("/Jahr");
}

// Löst die Anzeige diese Jahresrate überhaupt noch auf? Dieselbe Abschneide-
// grenze wie `formatKurz` -- an zwei verschiedenen Grenzen liefe Vorzeichen
// und Warnfarbe gegen die gezeigte Zahl.
function nettoSichtbar(jahresRate) {
  return Math.floor(Math.abs(jahresRate)) > 0;
}

// Zahlen mit Nachkommastelle gehören ins Gebietsschema -- "1,09 g" im
// Deutschen, "1.09 g" im Englischen. toFixed() kennt das nicht und schrieb
// überall den Punkt (derselbe Fehler, den fmtDauer bei den Jahren vermeidet).
function dezimal(zahl, stellen = 2) {
  return zahl.toLocaleString(gebietsschema(), {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });
}

// Markup (vorzeichenSpan) -- Aufrufer setzen das Ergebnis über `markupSetzen`.
// A-165: „%" ist begleitender Text wie jede andere Einheit, bleibt also
// außerhalb des Spans (vorher in `formatBetrag`, färbte mit).
function prozentText(faktor) {
  const p = Math.round((faktor - 1) * 100);
  return vorzeichenSpan(p) + " %";
}

function renderUebersicht(state, root, planet) {
  const box = root.querySelector("#planet-uebersicht");
  if (!box.dataset.gebaut) {
    box.dataset.gebaut = "1";
    uebersichtGeruest(box, state, root);
  }
  const u = planetUebersicht(state, planet);
  const marke = (schluessel, text) => textSetzen(box.querySelector(`[data-marke="${schluessel}"]`), text);
  const wert = (schluessel, text) => textSetzen(box.querySelector(`[data-wert="${schluessel}"]`), text);
  // A-126: für Werte, die eine vorzeichenSpan-Markup-Stelle einbetten (P19) --
  // NIE mit Spielertext befüllen, siehe Warnung bei markupSetzen.
  const wertHtml = (schluessel, html) => markupSetzen(box.querySelector(`[data-wert="${schluessel}"]`), html);
  const titel = (id, text) => textSetzen(box.querySelector(`[data-titel="${id}"]`), text);

  // Ein Außenposten hat keine Wirtschaft -- also auch keine Bestände, Flüsse,
  // Schwellen und Aufträge. Die vier Gruppen werden VERSTECKT statt mit
  // Nullen gefüllt: eine Zeile „Energie 0 MW" behauptete, hier stünde ein
  // Kraftwerk auf null. Was es nicht gibt, wird nicht gezeigt.
  // A-082: Der Name der Welt, umbenennbar. Das Feld wird nur beschrieben,
  // solange niemand darin tippt -- sonst zöge der Sekundentakt die halb
  // getippte Eingabe auf den gespeicherten Namen zurück (dasselbe
  // `!== document.activeElement` wie bei den Zahlenfeldern).
  const namensFeld = box.querySelector("[data-planet-name]");
  textSetzen(box.querySelector("[data-namen-marke]"), t("Name"));
  textSetzen(box.querySelector("[data-planet-umbenennen]"), t("Umbenennen"));
  attributSetzen(box.querySelector("[data-planet-umbenennen]"), "title", t("Neuen Namen übernehmen"));
  attributSetzen(namensFeld, "title", t("Name dieser Welt. Reine Beschriftung – ändert nichts an ihr."));
  if (namensFeld !== document.activeElement && namensFeld.value !== planet.name) namensFeld.value = planet.name;

  const hinweis = box.querySelector("[data-hinweis]");
  hinweis.hidden = !u.aussenposten;
  if (u.aussenposten) textSetzen(hinweis, t("Außenposten haben keine Wirtschaft."));
  for (const id of ["bestaende", "fluesse", "bevoelkerung", "laufendes"]) {
    box.querySelector(`[data-gruppe="${id}"]`).hidden = u.aussenposten;
  }

  // --- 1. Standort --------------------------------------------------------
  titel("standort", t("Standort"));
  marke("welt", t("Welt"));
  const s = u.standort;
  wert(
    "welt",
    [s.klasseName ? t(s.klasseName) : null, s.zone ? t(s.zone) : null, s.wasserName ? t(s.wasserName) : null]
      .filter(Boolean)
      .join(" · ") || UEBERSICHT_LEER
  );
  marke("orbit", t("Orbit"));
  wert("orbit", s.orbit === null || s.orbit === undefined ? UEBERSICHT_LEER : String(s.orbit));
  marke("schwerkraft", t("Schwerkraft"));
  wertHtml(
    "schwerkraft",
    t("{g} g · Bauen {bau} · Starten {start}", {
      g: dezimal(s.schwerkraft),
      bau: prozentText(s.bauFaktor),
      start: prozentText(s.startFaktor),
    })
  );
  attributSetzen(
    box.querySelector('[data-wert="schwerkraft"]'),
    "title",
    t("Bauen ist ein Traglastproblem und wächst linear mit der Schwerkraft. Starten ist ein Raketenproblem und wächst quadratisch – eine schwere Welt ist eine gute Mine und ein schlechter Raumhafen.")
  );
  marke("vorkommen", t("Vorkommen"));
  wert(
    "vorkommen",
    s.affinitaeten.length === 0
      ? t("überall Durchschnitt")
      : s.affinitaeten
          .map((a) =>
            a.faktor === 0
              ? t("{res}: keins", { res: t(RESSOURCEN[a.resId].name) })
              : `${t(RESSOURCEN[a.resId].name)} ×${dezimal(a.faktor)}`
          )
          .join(" · ")
  );

  // --- 2. Bestände & Kapazitäten ------------------------------------------
  titel("bestaende", t("Bestände & Kapazitäten"));
  marke("warenlager", t("Warenlager"));
  const voll = u.lager.vollInStunden;
  wert(
    "warenlager",
    t("{belegt} / {kapazitaet} m³", {
      belegt: fmt(Math.round(u.lager.belegt)),
      kapazitaet: fmt(u.lager.kapazitaet),
    }) +
      (voll === 0
        ? ` · ${t("voll")}`
        : voll === null
          ? ""
          : ` · ${t("voll in {dauer}", { dauer: fmtDauer(voll * 3600) })}`)
  );
  // Die Einzelspeicher (Wohnraum, Energiespeicher). Als Liste, weil sie aus
  // den Ressourcendaten kommen -- eine neue Batterieart soll hier von selbst
  // auftauchen und nicht in einer zweiten Tabelle nachgetragen werden müssen.
  listeAbgleichen(box.querySelector('[data-liste="bestaende"]'), u.lager.speicher, {
    schluessel: (e) => e.resId,
    bauen: () => {
      const div = document.createElement("div");
      div.className = "uebersicht-zeile";
      div.innerHTML = `<span class="uebersicht-marke"></span><span class="uebersicht-wert"></span>`;
      return div;
    },
    aktualisieren: (div, e) => {
      const def = RESSOURCEN[e.resId];
      textSetzen(div.querySelector(".uebersicht-marke"), t(BUILDINGS[def.speicher.gebaeude].name));
      const einh = speicherEinheit(e.resId);
      // Kapazität 0 heißt: das Gebäude steht noch nicht. Das ist eine echte
      // Auskunft (und der Grund, warum der Bestand bei 0 klebt) -- kein
      // Grund, die Zeile verschwinden zu lassen.
      textSetzen(
        div.querySelector(".uebersicht-wert"),
        e.kapazitaet <= 0
          ? t("noch nicht gebaut")
          : t("{bestand} / {kapazitaet}{einheit}", {
              bestand: fmt(Math.round(e.bestand)),
              kapazitaet: fmt(Math.round(e.kapazitaet)),
              einheit: einh ? ` ${einh}` : "",
            }) +
              (e.vollInStunden === null
                ? ""
                : ` · ${t("voll in {dauer}", { dauer: fmtDauer(e.vollInStunden * 3600) })}`)
      );
    },
  });

  // --- 3. Flüsse netto ----------------------------------------------------
  titel("fluesse", t("Flüsse netto"));
  marke("energie", t("Energie"));
  const e = u.energie;
  wertHtml(
    "energie",
    t("{erzeugt} erzeugt · {gebraucht} gebraucht · {netto}", {
      erzeugt: fmt(Math.round(e.produktion)),
      gebraucht: fmt(Math.round(e.verbrauch)),
      // A-165: "MW" ist begleitender Text, keine Zahl -- das war hier bis
      // dahin falsch gelesen ("−14 MW" komplett gefärbt). Zahl in den Span,
      // Einheit fest im Satz (P19 Regel 2).
      netto: `${vorzeichenSpan(Math.round(e.netto))} MW`,
    })
  );
  box.querySelector('[data-wert="energie"]').classList.toggle("warnung", e.effizienz < 1);
  marke("brennstoff", t("Brennstoff"));
  wertHtml(
    "brennstoff",
    e.brennstoffStunden === null
      ? UEBERSICHT_LEER
      : // Die Marke der Zeile sagt schon "Brennstoff" -- der fertige Satz aus
        // A-055 stünde hier als "Brennstoff | Brennstoff für 3 Jahre".
        //
        // Der Verbrauch steht daneben (A-088): dieselbe Bedingung wie an der
        // Energie-Kachel, und die einzige Zahl, aus der man die Dauer selbst
        // nachrechnen kann. Vorzeichen fest -- Brennstoff wird hier immer
        // VERBRAUCHT, das ist keine wertabhängige Richtung (A-126).
        t("reicht {dauer}", { dauer: fmtDauer(e.brennstoffStunden * 3600) }) +
          Object.entries(e.brennstoffRaten)
            .map(
              ([resId, proStunde]) =>
                ` · ${vorzeichenMitEinheit(resId, -rateProJahr(proStunde))}${t("/Jahr")}`
            )
            .join("")
  );
  marke("arbeitskraft", t("Arbeitskraft"));
  // A-155: Prinzip 10a -- der Spieler sieht den Leerlauf, bevor er wehtut.
  // Unter vollAb (80 %) kommt die Beschäftigungsquote dazu, ab dort steht die
  // Kachel wie zuvor (Kategorie-1-Verhalten für gut beschäftigte Welten).
  const leerlaufHinweis =
    u.arbeitskraft.quote < ARBEITSKRAFT_LEERLAUF.vollAb
      ? " · " +
        t("{quote} % beschäftigt – Leerlauf kostet {anteil} % Förderung", {
          quote: Math.round(u.arbeitskraft.quote * 100),
          anteil: Math.round(u.arbeitskraft.diebstahlAnteil * 100),
        })
      : "";
  wert(
    "arbeitskraft",
    t("frei {frei} von {gesamt}", {
      frei: fmt(Math.round(u.arbeitskraft.frei)),
      gesamt: fmt(Math.round(u.arbeitskraft.produktion)),
    }) + leerlaufHinweis
  );
  // Warnfarbe wie bisher bei echtem Mangel (frei < 0), UND ab 50 %
  // Beschäftigung ("sehr ungemütlich", Tobi 25.08.) -- dieselbe Schwelle wie
  // ARBEITSKRAFT_LEERLAUF.ungemuetlichAb, keine zweite Zahl dafür.
  box
    .querySelector('[data-wert="arbeitskraft"]')
    .classList.toggle(
      "warnung",
      u.arbeitskraft.frei < 0 || u.arbeitskraft.quote < ARBEITSKRAFT_LEERLAUF.ungemuetlichAb
    );
  listeAbgleichen(box.querySelector('[data-liste="fluesse"]'), u.fluesse, {
    schluessel: (f) => f.resId,
    bauen: () => {
      const div = document.createElement("div");
      div.className = "uebersicht-zeile";
      div.innerHTML = `<span class="uebersicht-marke"></span><span class="uebersicht-wert"></span>`;
      return div;
    },
    aktualisieren: (div, f) => {
      textSetzen(
        div.querySelector(".uebersicht-marke"),
        `${RESSOURCEN[f.resId].symbol || ""} ${t(RESSOURCEN[f.resId].name)}`
      );
      const el = div.querySelector(".uebersicht-wert");
      // A-154: zwei Gründe teilen sich `drosselung`, aber sie sind keine
      // Warnung in gleichem Maß -- Regime B (Rohstoffmangel) bekommt den
      // Satz von vorher, Regime C (Zielmenge erreicht) sagt, WAS gerade
      // wirklich passiert (Anlage läuft auf Grundlast), statt "gedrosselt"
      // wie ein Fehler klingen zu lassen (A-050-Muster: ein gedrosselter
      // Fluss nennt seinen Grund).
      markupSetzen(
        el,
        nettoText(f.resId, f.netto) +
          (f.maxGedrosselt
            ? ` · ${t("Zielmenge erreicht – Anlage läuft auf Grundlast")}`
            : f.drosselung < 1
              ? ` · ${t("gedrosselt auf {anteil}%", { anteil: Math.round(f.drosselung * 100) })}`
              : "")
      );
      const jahr = rateProJahr(f.netto);
      el.classList.toggle(
        "warnung",
        (nettoSichtbar(jahr) && jahr < 0) || (f.drosselung < 1 && !f.maxGedrosselt)
      );
    },
  });

  // --- 4. Bevölkerung & Schwellen -----------------------------------------
  titel("bevoelkerung", t("Bevölkerung & Schwellen"));
  marke("menschen", t("Bevölkerung"));
  const b = u.bevoelkerung;
  wertHtml(
    "menschen",
    `${fmt(Math.round(b.menschen))} · ${
      b.proStunde === 0
        ? b.menschen > 0 && b.menschen >= b.platz
          ? t("Wohnraum voll")
          : t("wächst nicht")
        : nettoText("bevoelkerung", b.proStunde)
    }`
  );
  box.querySelector('[data-wert="menschen"]').classList.toggle("warnung", !b.versorgt);
  marke("wohnraum", t("Wohnraum voll in"));
  wert(
    "wohnraum",
    b.stundenBisDeckel === null ? UEBERSICHT_LEER : fmtDauer(b.stundenBisDeckel * 3600)
  );
  // Die Schwellen. Der Auftrag will sie „strukturell unmöglich zu übersehen" --
  // deshalb stehen sie als eigene Zeilen mit Fortschritt und nicht in einem
  // Tooltip. Ist keine mehr offen, sagt die Gruppe genau das, statt zu
  // schrumpfen (fester Platz, Prinzip 8).
  const schwellenListe = u.schwellen.length > 0 ? u.schwellen : [{ id: "__keine" }];
  listeAbgleichen(box.querySelector('[data-liste="bevoelkerung"]'), schwellenListe, {
    schluessel: (s2) => s2.id + (s2.art || ""),
    bauen: () => {
      const div = document.createElement("div");
      div.className = "uebersicht-zeile";
      div.innerHTML = `<span class="uebersicht-marke"></span><span class="uebersicht-wert"></span>`;
      return div;
    },
    aktualisieren: (div, s2) => {
      if (s2.id === "__keine") {
        textSetzen(div.querySelector(".uebersicht-marke"), t("Schwellen"));
        textSetzen(div.querySelector(".uebersicht-wert"), t("alle erreicht"));
        return;
      }
      {
        const markeText = `${SYMBOLE.gesperrt} ${t(BUILDINGS[s2.id].name)}`;
        const markeEl = div.querySelector(".uebersicht-marke");
        textSetzen(markeEl, markeText);
        // A-128: Diese Marke ist die einzige im Spiel, die ihren Inhalt still
        // kürzt (ellipsis/overflow-hidden bei 120px Rasterbreite, P15/P16 --
        // Tooltip ist Zugabe, nie Träger). Der title muss aus derselben
        // Quelle kommen wie der sichtbare Text, sonst weicht er beim
        // nächsten Gebäudewechsel ab.
        if (markeEl.title !== markeText) markeEl.title = markeText;
      }
      textSetzen(
        div.querySelector(".uebersicht-wert"),
        s2.art === "forschung"
          ? t("braucht {tech}", { tech: t(s2.techName) })
          : t("{ist} / {soll}", { ist: fmt(Math.round(s2.ist)), soll: fmt(Math.round(s2.soll)) })
      );
    },
  });

  // --- 5. Laufendes -------------------------------------------------------
  //
  // Kein neuer Rechenweg: Restzeiten kommen aus denselben Helfern wie die
  // Statusspalte (kopfZeitText, forschungRestSekunden). Zwei Stellen, die
  // dieselbe Dauer verschieden ausrechnen, waren in diesem Projekt schon
  // mehrfach der Anfang einer Abweichung.
  const jetzt = spielzeitJetzt(state);
  titel("laufendes", t("Laufendes"));
  marke("bau", t("Bau"));
  wert(
    "bau",
    planet.bauQueue
      ? `${t(BUILDINGS[planet.bauQueue.gebaeudeId].name)} → ${planet.bauQueue.zielLevel} · ${kopfZeitText(state, planet, planet.bauQueue, "bau", jetzt)}`
      : UEBERSICHT_LEER
  );
  marke("forschung", t("Forschung"));
  wert(
    "forschung",
    state.forschungsQueue
      ? `${t(RESEARCH[state.forschungsQueue.forschungId].name)} → ${state.forschungsQueue.zielLevel} · ${fmtDauer(forschungRestSekunden(state))}`
      : UEBERSICHT_LEER
  );
  marke("werftauftrag", t("Werft"));
  wert(
    "werftauftrag",
    planet.werftQueue
      ? `${planet.werftQueue.anzahl}× ${t(SCHIFFE[planet.werftQueue.schiffId].name)} · ${kopfZeitText(state, planet, planet.werftQueue, "werft", jetzt)}`
      : UEBERSICHT_LEER
  );
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
    // A-086: die Kachel kennt jetzt auch die Schlange HINTER dem laufenden
    // Auftrag -- Liste, Restzeit des Kopfes und die Dauer eines Eintrags.
    warteschlange: planet.bauWarteschlange,
    warteschlangeEntfernen: (i) => bauWarteschlangeEntfernen(state, planet, i),
    kopfRest: () => kopfRestSekunden(planet.bauQueue, spielzeitJetzt(state)),
    dauerVon: (e) => e.dauerSek || 0,
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
    String(planet.id),
    null,
    (w) => warteschlangeKosten(planet, w)
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
    // A-061, Prinzip 10a und das A-050-Muster: ein gedrosselter Fluss nennt
    // seinen Grund. Steht hier nur eine kleinere Zahl, sucht der Spieler den
    // Fehler bei sich -- und findet ihn nicht, weil das Labor NICHT kaputt
    // ist, sondern hungert. Angehängt statt in eigener Zeile: es ist der
    // Grund für genau diese Zahl.
    const knapp = laborbedarfKnapp(state);
    const grund = knapp.length
      ? t(" · gebremst: {res} fehlt den Laboren", {
          res: knapp.map((r) => t(RESSOURCEN[r].name)).join(", "),
        })
      : "";
    info.textContent = !labore
      ? t("kein Labor – niemand forscht")
      : fluss > 0
        ? (labore === 1
            ? t("1 Labor · {fluss}", { fluss: forschungsRateText(fluss) })
            : t("{labore} Labore · {fluss}", { labore, fluss: forschungsRateText(fluss) })) + grund
        : knapp.length
          ? t("{labore} Labor/Labore stehen still – es fehlt {res}", {
              labore,
              res: knapp.map((r) => t(RESSOURCEN[r].name)).join(", "),
            })
          : labore === 1
            ? t("1 Labor, aber ohne Strom oder Menschen – es geht nichts voran")
            : t("{labore} Labore, aber ohne Strom oder Menschen – es geht nichts voran", { labore });
  }

  renderAusbauListe(state, root, {
    listenId: "#forschung-liste", defs: RESEARCH,
    levelVon: (id) => state.forschung[id] || 0,
    naechstesLevel: (id) => naechstesForschungLevel(state, id),
    queue: state.forschungsQueue, queueIdFeld: "forschungId",
    // Wie bei den Gebäuden (A-086). Die Restzeit kommt hier NICHT aus
    // `fertigZeit` -- eine Forschung hat keine, sie hat einen Aufwand und
    // einen Fluss. Dieselbe Rechnung wie in der Warteschlangen-Liste unten.
    warteschlange: state.forschungsWarteschlange,
    warteschlangeEntfernen: (i) => forschungWarteschlangeEntfernen(state, i),
    kopfRest: () => (state.forschungsQueue ? forschungRestSekunden(state) : null),
    dauerVon: (e) => {
      const fluss = forschungsFluss(state);
      const aufwand = e.aufwand ?? forschungsAufwand(RESEARCH[e.forschungId], e.zielLevel);
      return fluss > 0 ? (aufwand / fluss) * 3600 : Infinity;
    },
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
  // A-144: Die Warteschlange stand hier bis v0.4.4 als #forschung-warteschlange
  // -- rund 1.500 px tief im Baum-Layout, bei Klaus' 520 px Fensterhöhe
  // praktisch unerreichbar. Sie zeigt jetzt in der Statusspalte
  // (renderStatus, #status-forschung-warteschlange), dieselbe Funktion,
  // zweites Ziel.
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
  //
  // A-150: der zweite Satz zieht die Parallele zum Forschungslabor ("der
  // Zusammenhang Werft/Forschungslabor wurde erst durch Nachfragen klar",
  // Chris' Feedback) -- an der Werft-Kachel, nicht in einer Tour (Prinzip
  // 10a). Beide Anlagen folgen demselben Muster (höhere Stufe = schneller),
  // aber es sind ZWEI getrennte Anlagen für zwei getrennte Dinge -- genau
  // das war ihm nicht klar.
  const tempo = werftTempo(planet);
  info.title = t(
    "Werft Stufe {stufe} – baut {tempo}× so schnell wie eine Werft der Stufe 1. Jede weitere Stufe beschleunigt zusätzlich. Für Forschung gilt dasselbe Prinzip – aber am Forschungslabor, einer eigenen Anlage.",
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
    info.innerHTML = `<span data-werft-text></span> <select data-werft-ziel></select> <button data-werft-abbrechen="1" hidden></button>`;
    const zielFeld = info.querySelector("select[data-werft-ziel]");
    attributSetzen(
      zielFeld,
      "title",
      t("Wohin die fertigen Schiffe nach dem Bau gehen. Voreinstellung: in den Hafen.")
    );
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

  // A-151: Ziel-Auswahl für NEUE Bauaufträge. Nur Flotten, die GENAU AN
  // DIESEM Planeten angedockt sind, kommen als Ziel infrage -- fliegt eine
  // weg oder wird sie aufgelöst, verschwindet sie hier aus der Liste, ohne
  // dass ein Auswahl-Handler das extra prüfen müsste. Das Feld selbst bleibt
  // über jeden Takt stehen (Gerüst oben), nur seine Optionen werden
  // nachgezogen -- Prinzip 8a, dieselbe Überlegung wie beim Zahlenfeld (A-079).
  const zielFeld = info.querySelector("select[data-werft-ziel]");
  const zielFlotten = flottenVon(state).filter((f) => f.dockPlanet === planet.id);
  listeAbgleichen(
    zielFeld,
    [{ id: "", name: t("In den Hafen") }, ...zielFlotten.map((f) => ({ id: String(f.id), name: f.name }))],
    {
      schluessel: (e) => e.id,
      bauen: (e) => {
        const opt = document.createElement("option");
        opt.value = e.id;
        return opt;
      },
      aktualisieren: (opt, e) => textSetzen(opt, e.name),
    }
  );

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
          <span class="kachel-kosten"><span class="zeilen-marke" data-kosten-marke></span> <span data-kosten-wert></span></span>
          <span class="kachel-dauer"></span>
        </div>
        <div class="kachel-sperre" hidden></div>
        <div class="schiff-knoepfe">
          <input type="number" class="menge-feld" min="1" step="1" value="1" data-schiff-menge="${id}" />
          <button class="kachel-aktion" data-schiff="${id}"></button>
        </div>`;
      // A-079: EIN Knopf und ein Zahlenfeld statt 1×/5×.
      //
      // Ereignisse EINMAL, hier beim Bauen (Lernpunkt 1 aus PRINZIPIEN.md 8a) --
      // und das Feld ebenso: würde es im Takt neu entstehen, verlöre es beim
      // Tippen den Fokus und die halb getippte Zahl. Es überlebt jeden Takt,
      // der Schlüssel dieser Liste trägt aber den Planeten, also beginnt jede
      // Welt mit ihrer eigenen 1.
      //
      // Der Wert bleibt im FELD und wandert nicht in den Zwischenspeicher
      // `feldEingabe` wie bei Reserve und Mindestbestand: dort gibt es einen
      // gespeicherten Stand, der zurückschriebe. Hier gibt es keinen -- die
      // Stückzahl gehört keinem Spielstand, sie ist die Frage „wie viele
      // jetzt".
      const feld = li.querySelector("input[data-schiff-menge]");
      const bauen = () => {
        const menge = stueckzahlAus(feld.value);
        if (menge === null) return; // leer, 0, negativ, kein Zahlwert: kein Auftrag
        // A-151: das Ziel-Feld sitzt im Kopf der Werft-Kachel-Liste (info,
        // eine Ebene höher), nicht auf dieser einzelnen Schiffskachel -- eine
        // Auswahl gilt für alle Typen, bis sie geändert wird.
        const zielWert = info.querySelector("select[data-werft-ziel]").value;
        schiffBauen(state, planet, id, menge, null, false, zielWert ? Number(zielWert) : null);
        render(state, root);
      };
      li.querySelector("button[data-schiff]").addEventListener("click", bauen);
      // Enter ist bei einem Zahlenfeld der erwartete Weg (gleiche Überlegung
      // wie bei Reserve, Mindestbestand und Flottenname).
      feld.addEventListener("keydown", (ereignis) => {
        if (ereignis.key === "Enter") bauen();
      });
      // Beim Tippen neu zeichnen, damit die Kostenzeile mitrechnet (10a: was
      // der Knopf kostet, steht am Knopf). Das Feld hat dabei den Fokus und
      // wird von `werftKachelFuellen` nicht angefasst.
      feld.addEventListener("input", () => render(state, root));
      return li;
    },
    aktualisieren: (li, id) => werftKachelFuellen(state, planet, li, id),
  });

  renderWarteschlange(
    state, root, "#werft-warteschlange", planet.werftWarteschlange,
    (e) => `${e.anzahl}× ${t(SCHIFFE[e.schiffId].name)}`, // reine Zahl plus Name, kein Satz
    (i) => werftWarteschlangeEntfernen(state, planet, i),
    String(planet.id),
    null,
    (w) => warteschlangeKosten(planet, w)
  );
}

// Was in einer Zeitangabe steht: eine Restdauer, wenn der Auftrag LÄUFT --
// und sonst, worauf er wartet (A-012, Prinzip 10a: Blockiertes erklärt sich
// selbst).
//
// Bei Rate 0 steht dort ausdrücklich „keine Produktion" statt einer
// gerechneten Phantasiezahl. Eine Restzeit, die aus einer Rate von null
// entsteht, wäre unendlich — und „∞" ist keine Auskunft, sondern eine Ausrede.
//
// Stand seit A-012 in der Statusspalte, seit A-037 auch auf der Kachel: dort
// zeigte der Wartezustand eine gerechnete Restzeit an (`null - jetzt` ergibt
// eine große negative Zahl, `fmtDauer` macht daraus „unter 1 Tag"), und wenn
// daneben ein Fortschrittsbalken auf null steht, widerspricht sich die Kachel
// selbst. EINE Funktion beantwortet die Frage „wie lange noch" (Prinzip 5) --
// deshalb hier auf Modulebene statt zweimal geschrieben.
function kopfZeitText(state, planet, kopf, art, jetzt) {
  if (kopf.fertigZeit !== null) return fmtDauer((kopf.fertigZeit - jetzt) / 1000);
  const wartet = wartetAuf(state, planet, kopf, art);
  if (!wartet) return t("wartet");
  return wartet.sekunden === null
    ? t("wartet auf {was} – keine Produktion", { was: wartet.text })
    : t("wartet auf {was} – noch {dauer}", { was: wartet.text, dauer: fmtDauer(wartet.sekunden) });
}

// A-037: die Kachel IST der Fortschrittsbalken. Beide Helfer arbeiten auf dem
// BESTEHENDEN Element -- nichts wird dafür neu gebaut (Prinzip 8a), und der
// Wert geht als CSS-Variable raus, damit die Darstellung im Stylesheet bleibt.
function anteilVon(teil, ganzes) {
  if (!(ganzes > 0)) return 0;
  const a = teil / ganzes;
  // Geklemmt, weil beides vorkommt: eine Restzeit, die um Sekundenbruchteile
  // negativ wird, und ein Fortschritt, der die Aufwandszahl minimal übertrifft
  // (dieselben Krümel, die in A-042 eine Forschung festhielten).
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

function fortschrittSetzen(li, anteil) {
  const wert = String(Math.round(anteil * 1000) / 1000);
  if (li.style.getPropertyValue("--fortschritt") !== wert) {
    li.style.setProperty("--fortschritt", wert);
  }
}

// Die veränderlichen Teile einer Schiffskachel. Getrennt von ihrem Gerüst,
// damit die beiden Knöpfe stehen bleiben (Prinzip 8a).
function werftKachelFuellen(state, planet, li, id) {
  {
    const def = SCHIFFE[id];
    // A-079: Alles auf dieser Kachel rechnet mit der eingetragenen Stückzahl.
    // Steht dort Unsinn (leer, 0, negativ), bleibt die Anzeige beim Einzelstück
    // und der Knopf sperrt mit Grund -- eine Zahl zu erfinden wäre die
    // schlechtere Auskunft.
    const feldEl = li.querySelector("input[data-schiff-menge]");
    let feldMenge = stueckzahlAus((feldEl || {}).value);
    // R-2/A-100: das Feld klemmt sich selbst auf das JETZT Bezahlbare --
    // eine 999.999 baut nie mehr, als der Bestand hergibt, und der Spieler
    // sieht die Korrektur sofort im Feld. Nur SENKEN, nie erhöhen (wer 3
    // eintippt, obwohl 20 gingen, will 3). Bleibt die Warteschlange voll,
    // wird nicht geklemmt -- jede Zahl scheiterte ohnehin, und das soll der
    // Sperrgrund sagen, nicht eine erzwungene 0 im Feld. Löst NIE selbst
    // einen Bau aus: nur der Feldwert ändert sich, gebaut wird ausschließlich
    // über den Knopf.
    const werftLaenge = (planet.werftQueue ? 1 : 0) + planet.werftWarteschlange.length;
    if (feldEl && feldMenge !== null && werftLaenge < BAUWARTESCHLANGE_MAX) {
      const machbar = schiffMaxBezahlbar(planet, id);
      if (machbar >= 1 && feldMenge > machbar) {
        feldMenge = machbar;
        feldEl.value = String(machbar);
      }
    }
    const menge = feldMenge === null ? 1 : feldMenge;
    const check = kannSchiffBauen(state, planet, id, menge);
    const laeuft = !!(planet.werftQueue && planet.werftQueue.schiffId === id);
    li.classList.toggle("item-aktiv", laeuft);
    fortschrittSetzen(
      li,
      laeuft && planet.werftQueue.fertigZeit !== null
        ? 1 -
            anteilVon(
              (planet.werftQueue.fertigZeit - spielzeitJetzt(state)) / 1000,
              planet.werftQueue.dauerSek
            )
        : 0
    );
    textSetzen(li.querySelector(".kachel-name"), t(def.name));
    textSetzen(li.querySelector(".kachel-stufe"), String(planet.schiffe[id] || 0));
    // A-044: dieselbe Form wie auf der Gebäudekachel -- Beschriftung und Wert
    // getrennt, damit die Beschriftung beim Sprachwechsel mitkommt und der
    // Wert im Takt geschrieben werden kann, ohne sie mitzunehmen.
    textSetzen(li.querySelector("[data-kosten-marke]"), t("Kosten"));
    // A-126 (P19): Schiffskosten bekommen dieselbe Behandlung wie die
    // Gebäudekachel -- Minus + Rollenklasse kommen vom Aufrufer (Falle in
    // buendelSymbole), deshalb innerHTML statt textSetzen.
    markupSetzen(li.querySelector("[data-kosten-wert]"), buendelSymbole(schiffKosten(planet, id, menge), { abgang: true }));
    // Werftstufe, Bevölkerung, fehlende Forschung -- alles außer „gerade zu
    // wenig Material" gehört sichtbar auf die Kachel (Chris' Punkt).
    const schiffSperre = li.querySelector(".kachel-sperre");
    const schiffBedingung = !check.ok && !check.nurGeld ? `${SYMBOLE.gesperrt} ${check.grund}` : "";
    schiffSperre.hidden = !schiffBedingung;
    if (schiffBedingung) textSetzen(schiffSperre, schiffBedingung);
    textSetzen(
      li.querySelector(".kachel-dauer"),
      `${fmtDauer(schiffsBauzeitSek(planet, id, menge))} · ${def.verbrauchProStrecke}⚛️${
        def.kapazitaet ? ` · ${fmt(def.kapazitaet)}📦` : ""
      }`
    );

    const knopf = li.querySelector("button[data-schiff]");
    const mengenFeld = li.querySelector("input[data-schiff-menge]");
    attributSetzen(mengenFeld, "title", t("Wie viele auf einmal gebaut werden sollen."));
    textSetzen(knopf, t("Bauen"));
    knopf.disabled = feldMenge === null || !(check.ok || check.nurGeld === true);
    attributSetzen(
      knopf,
      "title",
      feldMenge === null ? t("Trag eine Stückzahl ein – mindestens 1.") : check.ok ? "" : check.grund
    );

    attributSetzen(li, "title", [
      t(def.beschreibung),
      t("Kosten: {kosten} · {dauer}", {
        kosten: buendelText(schiffKosten(planet, id, menge), { abgang: true }),
        dauer: fmtDauer(schiffsBauzeitSek(planet, id, menge)),
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
        <div class="markt-zeile bedienzeile" data-res="${resId}">
          <span class="markt-name zeile-beschriftung"></span>
          <span class="dezent zeile-zahl" data-bestand></span>
          <span class="dezent zeile-eingabe" data-preise></span>
          <button class="zeile-knopf-1" data-verkaufen="${resId}" data-menge="${MARKT.los}"></button>
          <button class="zeile-knopf-2" data-kaufen="${resId}" data-menge="${MARKT.los}"></button>
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

// --- Lager, Block 1: Bestände (A-153) --------------------------------------
// Eine Zeile je Ressource -- ALLE Ressourcen, immer (E11), auch die ohne
// Bestand: eine Welt stellt hier ein, wie ihre Wirtschaft laufen soll, bevor
// es überhaupt etwas zu regeln gibt. Ersetzt renderVerarbeitung (der alte
// Bedienplatz der Verarbeitungs-Reserve): sie zieht mit ihren beiden
// Geschwistern (Handels-Mindest, Max) hierher, EIN Ort für drei
// Stellschrauben derselben Art statt drei Orte im Spiel.
//
// Nur die "echten" Lagerwaren -- Bevölkerung und Credits haben ihre eigene
// Wirtschaft (Wohnraum, Abgaben) und ziehen laut Entwurf (Abschnitt 4.1) in
// die Kopfzeile, nicht in diese Liste (eigene, spätere Runde, L4).
const LAGER_BEREICH_RESSOURCEN = LAGER_RESSOURCEN.filter((r) => r !== "credits" && r !== "bevoelkerung");

function renderLager(state, root, planet) {
  const box = root.querySelector("#lager-block");

  // Gerüst EINMAL, danach nur noch abgleichen (Prinzip 8a) -- dieselbe
  // Begründung wie am alten Ort: drei Zahlenfelder je Zeile, die jede
  // Sekunde neu entstünden, wären nach A-079 unbedienbar.
  if (!box.dataset.gebaut) {
    box.dataset.gebaut = "1";
    box.innerHTML = `<div class="dezent" data-hinweis></div><div data-zeilen></div>`;
  }
  const hinweis = box.querySelector("[data-hinweis]");
  const liste = box.querySelector("[data-zeilen]");

  const aussenposten = planet.typ === "aussenposten";
  textSetzen(
    hinweis,
    aussenposten
      ? t("Außenposten haben keine Wirtschaft, die sich einstellen ließe.")
      : t(
          "Hier stellst du ein, wie die Wirtschaft dieses Planeten laufen soll: 🏪 schützt einen Bestand gegen Handel und Verkauf, ⚗️ gegen die eigene Verarbeitung, Max regelt die fördernde Anlage auf eine Zielmenge herunter."
        )
  );
  liste.hidden = aussenposten;
  if (aussenposten) return;

  const raten = effektiveRaten(state, planet);

  listeAbgleichen(liste, LAGER_BEREICH_RESSOURCEN, {
    schluessel: (resId) => resId,
    bauen: (resId) => {
      const zeile = document.createElement("div");
      zeile.className = "lager-zeile bedienzeile";
      zeile.dataset.res = resId;
      zeile.innerHTML = `
        <span class="zeile-beschriftung"><span class="res-symbol"></span> <span data-name></span></span>
        <span class="zeile-regler lager-bestand-saeule">
          <span class="zeile-zahl" data-bestand></span>
          <span class="lager-balken-rahmen" data-balken></span>
        </span>
        <span class="zeile-zahl" data-rate></span>
        <span class="zeile-eingabe lager-feldgruppe" data-gruppe="handel">
          <span class="lager-feldgruppe-symbol"></span>
          <input type="number" min="0" step="100" data-feld="handel" />
          <button data-setzen="handel">✓</button>
        </span>
        <span class="zeile-knopf-1 lager-feldgruppe" data-gruppe="verarbeitung">
          <span class="lager-feldgruppe-symbol">⚗️</span>
          <input type="number" min="0" step="100" data-feld="verarbeitung" />
          <button data-setzen="verarbeitung">✓</button>
        </span>
        <span class="zeile-knopf-2 lager-feldgruppe" data-gruppe="max">
          <span class="lager-feldgruppe-symbol" data-max-symbol></span>
          <input type="number" min="0" step="100" data-feld="max" />
          <button data-setzen="max">✓</button>
        </span>`;

      // Ereignisse EINMAL beim Bauen (Prinzip 8a). Der Planet wird dabei
      // bewusst NICHT festgehalten -- die Zeile überlebt einen Planeten-
      // wechsel (ihr Schlüssel ist die Ressource), gemeint ist immer der
      // gerade aktive Planet (dasselbe Muster wie am alten Ort).
      const SETZER = {
        handel: handelsMindestSetzen,
        verarbeitung: verarbeitungsReserveSetzen,
        max: maxBestandSetzen,
      };
      for (const gruppe of ["handel", "verarbeitung", "max"]) {
        const feld = zeile.querySelector(`input[data-feld="${gruppe}"]`);
        const uebernehmen = () => {
          const ziel = aktiverPlanet(state);
          SETZER[gruppe](ziel, resId, Number(feld.value) || 0);
          delete feldEingabe[feldSchluessel(gruppe, ziel, resId)];
          render(state, root);
        };
        feld.addEventListener("input", () => {
          feldEingabe[feldSchluessel(gruppe, aktiverPlanet(state), resId)] = feld.value;
        });
        // Enter ist bei einem Zahlenfeld der erwartete Weg (A-079).
        feld.addEventListener("keydown", (ereignis) => {
          if (ereignis.key === "Enter") uebernehmen();
        });
        zeile.querySelector(`button[data-setzen="${gruppe}"]`).addEventListener("click", uebernehmen);
      }
      return zeile;
    },
    aktualisieren: (zeile, resId) => {
      const def = RESSOURCEN[resId];
      const bestand = Math.floor(planet.ressourcen[resId] || 0);
      const rate = sichtbareRate(raten.lager, raten.verderb, resId);
      const zieht = rate < 0;

      textSetzen(zeile.querySelector(".res-symbol"), def.symbol || "");
      textSetzen(zeile.querySelector("[data-name]"), t(def.name));
      textSetzen(zeile.querySelector("[data-bestand]"), mitEinheit(resId, bestand));

      // Derselbe Anteil-an-der-Lagerkapazität wie an der Lagerkachel oben --
      // EINE Formel für beide Leser (B3), sonst laufen sie irgendwann
      // auseinander.
      const gesamtKap = lagerKapazitaetGesamt(state, planet);
      const volumen = bestand * lagerverbrauchVon(resId);
      balkenFuellen(zeile.querySelector("[data-balken]"), [
        {
          resId,
          farbe: def.farbe,
          anteil: gesamtKap > 0 ? volumen / gesamtKap : 0,
          titel: t("{res}: {volumen} m³ ({anteil}% des Lagers)", {
            res: t(def.name),
            volumen: fmt(volumen),
            anteil: gesamtKap > 0 ? Math.round((volumen / gesamtKap) * 100) : 0,
          }),
        },
      ]);

      const rateEl = zeile.querySelector("[data-rate]");
      markupSetzen(rateEl, vorzeichenMitEinheit(resId, Math.round(rateProJahr(rate))) + t("/Jahr"));
      rateEl.classList.toggle("warnung", zieht);

      // 🏪 Handels-Mindest -- immer bedienbar, unabhängig von einer Anlage:
      // ein Bestand kann auch ohne laufende Förderung schützenswert sein.
      const handelSymbol = zeile.querySelector('[data-gruppe="handel"] .lager-feldgruppe-symbol');
      textSetzen(handelSymbol, SYMBOLE.handelsposten);
      const handelFeld = zeile.querySelector('input[data-feld="handel"]');
      attributSetzen(
        handelFeld,
        "title",
        t("Schützt diesen Bestand gegen Handel und Verkauf -- darunter wird nicht verkauft.")
      );
      feldWertSetzen(
        handelFeld,
        feldSchluessel("handel", planet, resId),
        String(handelsMindestFuer(planet, resId) || "")
      );

      // ⚗️ Verarbeitungs-Reserve -- unverändert zum alten Ort (A-066).
      const verarbFeld = zeile.querySelector('input[data-feld="verarbeitung"]');
      attributSetzen(
        verarbFeld,
        "title",
        t("Bis zu diesem Bestand darf die Verarbeitung aus dem Lager ziehen. Darunter läuft sie nur noch mit dem, was nachkommt.")
      );
      feldWertSetzen(
        verarbFeld,
        feldSchluessel("verarbeitung", planet, resId),
        String(verarbeitungsReserveFuer(planet, resId) || "")
      );

      // Max -- wirkt erst mit A-154. Ohne fördernde Anlage bleibt das Feld
      // (E11/G4: der Slot ist reserviert, nicht versteckt) aber gesperrt und
      // trägt seine P18-Antwort statt einer Eingabe.
      const maxGruppe = zeile.querySelector('[data-gruppe="max"]');
      textSetzen(zeile.querySelector("[data-max-symbol]"), t("Max"));
      const gebaeudeId = def.gebaeude;
      const hatAnlage = gebaeudeId && (planet.gebaeude[gebaeudeId] || 0) > 0;
      maxGruppe.classList.toggle("lager-ohne-anlage", !hatAnlage);
      const maxFeld = zeile.querySelector('input[data-feld="max"]');
      const maxKnopf = zeile.querySelector('button[data-setzen="max"]');
      maxFeld.disabled = !hatAnlage;
      maxKnopf.disabled = !hatAnlage;
      attributSetzen(
        maxFeld,
        "title",
        hatAnlage
          ? t("Zielmenge, auf die sich die fördernde Anlage herunterregelt (wirkt ab A-154).")
          : t("Keine Anlage, die gedrosselt werden könnte.")
      );
      attributSetzen(maxFeld, "placeholder", hatAnlage ? "" : t("keine Anlage"));
      feldWertSetzen(maxFeld, feldSchluessel("max", planet, resId), hatAnlage ? String(maxBestandFuer(planet, resId) || "") : "");
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
      zeile.className = "markt-zeile bedienzeile";
      zeile.innerHTML = `
        <span class="markt-name zeile-beschriftung"></span>
        <span class="dezent zeile-zahl" data-lage></span>
        <input class="zeile-eingabe" type="number" min="0" step="100" data-mindest="${resId}" />
        <button class="zeile-knopf-1" data-mindest-setzen></button>
        <button class="zeile-knopf-2" data-mindest-loeschen hidden></button>`;

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
  // A-130: geschrieben gegen zuletzt geschrieben, nie gegen zurückgelesen.
  if (transferBox.dataset.stand !== transferZeilen) {
    transferBox.dataset.stand = transferZeilen;
    transferBox.innerHTML = transferZeilen;
  }
  transferBox.hidden = transferZeilen === "";
}

// --- Flotten --------------------------------------------------------------

// Die Flottenwahl von der Karte aus (A-056). Sie schreibt in denselben
// `state.aktiveFlotte`, den die Flottenliste setzt -- EIN Auswahlzustand, wie
// beauftragt. Nur eigene Flotten -- deshalb die Suche über `flottenVon` und
// nicht über `flotteById`: die Karte setzt das Klickattribut zwar ohnehin nur
// an eigenen Marken, aber die Grenze gehört auch auf diese Seite des Rückrufs
// (dieselbe Falle wie seinerzeit bei `planetAn`, A-002).
//
// Zweiter Klick auf dieselbe Flotte hebt die Wahl auf -- ohne das gäbe es
// keinen Weg zurück in den Null-Zustand (Prinzip 7), und der Reichweitenring
// bliebe für den Rest der Partie stehen. Genau dasselbe tut `orbitWaehlen`.
function flotteVonKarteWaehlen(state, root, flottenId) {
  if (!flottenVon(state).some((flotte) => flotte.id === flottenId)) return;
  state.aktiveFlotte = state.aktiveFlotte === flottenId ? null : flottenId;
  render(state, root);
}

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
  // A-150: der Weg "Schiffe bauen -> Flotte gruenden -> beladen -> losschicken"
  // wird HIER erklaert, an der Stelle, an der er beginnt (Tobis Wunsch nach
  // einem Flotten-Tutorial) -- statt im Handbuch, das niemand aufschlaegt,
  // bevor er die Frage schon hat. P18: der leere Zustand traegt die Antwort,
  // nicht nichts.
  textSetzen(
    leerHinweis,
    t(
      "Noch keine Flotte aufgestellt. Der Weg: Schiffe in der Werft bauen, hier eine Flotte gründen, im Hafen beladen, dann losschicken."
    )
  );

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
  if (aktive) routenDetailZahlen(state, routenBox, aktive);
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
      flotte.route && flotte.route.aktiv && flotte.route.wartetAn != null
        ? t("wartet auf Beladung: {ist}/{soll} %", {
            ist: Math.floor(routeBeladungAnteil(state, flotte) * 100),
            soll: flotte.route.mindestBeladung || 0,
          })
        : "",
      flotte.gefecht ? t("Im Gefecht – nicht umleitbar") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const bezeichnung = li.querySelector(".slot-bezeichnung");
    // htmlText: neben dem Namen stehen echte Auszeichnungen (die Marken für
    // "aktiv" und "Route"), die Zeile geht also per innerHTML hinein.
    const bezeichnungHtml = `${htmlText(flotte.name)} ${aktiv ? `<span class="basis-tag">${t("aktiv")}</span>` : ""}${flotte.route && flotte.route.aktiv ? `<span class="basis-tag route-tag">${SYMBOLE.route} ${t("Route")}</span>` : ""}`;
    // A-130: geschrieben gegen zuletzt geschrieben, nie gegen zurückgelesen.
    if (bezeichnung.dataset.stand !== bezeichnungHtml) {
      bezeichnung.dataset.stand = bezeichnungHtml;
      bezeichnung.innerHTML = bezeichnungHtml;
    }

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
// WAS DIESER KNOPF GLEICH NEHMEN WIRD (A-093).
//
// Eine Rechnung, drei Leser: die Zahl neben dem Regler, der Zuhörer beim
// Ziehen/Tippen und der Knopf selbst. Vorher stand sie ZWEIMAL da, und zwar
// verschieden: die Anzeige kannte nur den Regler, der Knopf gab dem
// Eingabefeld den Vorrang. Genau dieser Unterschied war Tobis Befund --
// gemessen stand daneben "10% (20.000)", geladen wurden die 5.000 aus dem
// Feld. Zwei Stellen, die dieselbe Frage getrennt beantworten, laufen
// auseinander; hier taten sie es dort, wo es weh tut.
//
// `grundlage` und `vorrat` sind BEWUSST getrennt: der Regler rechnet Prozent
// der Flottenkapazität (Tanken: des Hafenvorrats), das Feld wird gegen den
// Hafenvorrat gedeckelt. Das ist bestehende Mechanik, keine neue Regel.
export function mengeEinstellung(regler, feld, grundlage, vorrat) {
  const genau = Number((feld && feld.value) || 0);
  if (genau > 0) return { menge: Math.min(genau, vorrat), genau: true, gedeckelt: genau > vorrat };
  const prozent = Number(regler.value) || 0;
  return { menge: Math.round((prozent / 100) * grundlage), genau: false, prozent };
}

// Der Text zur Einstellung. Prozentform bleibt, wie sie war -- die genaue
// Menge bekommt eine eigene, weil "5.000%" gelogen wäre.
export function mengeEinstellungText(einstellung) {
  return einstellung.genau
    ? t("genau {menge}", { menge: fmt(einstellung.menge) })
    : `${einstellung.prozent}% (${fmt(einstellung.menge)})`;
}

// WORAUF SICH DIE PROZENTE BEZIEHEN -- eine Antwort je Zeile, gelesen von der
// Anzeige und vom Knopf.
//
// A-093 (2), Tobis Wort: der Regler orientiert sich "immer noch nicht" am
// freien Laderaum. Er rechnete Prozent der GESAMTkapazität, während
// `ladungAufnehmen` alles über dem freien Rest RUNDWEG ABLEHNT -- und der
// Knopf las den Rückgabewert nicht. Ergebnis: Bei halb voller Flotte tat ein
// Klick über 50 % schlicht nichts, ohne ein Wort dazu. Prozent des freien
// Rests kann dagegen gar nichts anderes ergeben als eine ausführbare Menge,
// und der Bezug zieht nach jeder Ladung von selbst nach.
//
// Der Bezug ist deshalb, was HIER UND JETZT ladbar ist: der freie Rest,
// begrenzt durch den Lagerbestand. Der Auftrag nennt nur den freien Rest --
// im Normalfall ist er auch die Grenze. Der Lagerbestand steht daneben, weil
// `ladungAufnehmen` auch ihn rundweg ablehnt: bei 1.234 t im Lager und 200.000
// freiem Platz stünde sonst wieder eine Zahl da, die der Knopf wortlos
// verwirft -- derselbe Fehler, nur mit vertauschten Rollen. Ein Testfall hält
// genau das fest.
//
// Regler und Feld teilen sich diese Grenze: das Feld hat Vorrang, und eine
// Zahl, die die Anzeige verspricht, muss ladbar sein.
export function ladeEinstellung(state, flotte, hafen, resId, regler, feld) {
  const ladbar = Math.min(frachtraumFrei(state, flotte), Math.floor(hafen.ressourcen[resId] || 0));
  return mengeEinstellung(regler, feld, ladbar, ladbar);
}

// Dieselbe Frage für die Tankzeile.
//
// NICHT im Wortlaut von A-093 (der spricht von der Beladen-Zeile), aber
// dieselbe Lüge: `tanken` deckelt seit v0.64 auf den freien Tankplatz --
// der Kommentar dort nennt Tobis alte Meldung "Tritium-Regler orientiert
// sich an Max Lager des Planeten, nicht an Max Tank der Flotte" beim Namen.
// Die Oberfläche rechnete weiter nur mit dem Lagerbestand. Solange die
// Anzeige nur "50 %" sagte, fiel das nicht auf; seit sie einen BETRAG
// verspricht, wäre es eine Zusage, die `tanken` stillschweigend kürzt.
export function tankEinstellung(state, flotte, hafen, regler, feld) {
  const platz = Math.max(0, flotteTankKapazitaet(state, flotte) - (flotte.treibstoff || 0));
  const vorrat = Math.min(Math.floor(hafen.ressourcen.tritium || 0), platz);
  return mengeEinstellung(regler, feld, vorrat, vorrat);
}

// A-132: dieselbe Frage für die Kolonisten-Zeile -- eigener Raum wie der
// Tank, nicht Teil der Fracht. `flotteSiedlerKapazitaet` braucht anders als
// `flotteTankKapazitaet` kein `state` (kein Forschungsbonus auf Kolonisten).
export function siedlerEinstellung(state, flotte, hafen, regler, feld) {
  const platz = Math.max(0, flotteSiedlerKapazitaet(flotte) - (flotte.siedler || 0));
  const vorrat = Math.min(Math.floor(hafen.ressourcen.bevoelkerung || 0), platz);
  return mengeEinstellung(regler, feld, vorrat, vorrat);
}

// A-101: Warum kann hier gerade STRUKTURELL nichts geladen werden -- nicht
// zu verwechseln mit einem Regler, der bei 0 % steht (das ist eine Wahl,
// keine Sperre). Dieselbe Grenze, die `ladeEinstellung` schon rechnet
// (`frachtraumFrei`/Lagerbestand), nur als Text statt als Zahl -- bestehender
// Sperrgrund-Stil wie bei `kannSchiffBauen`. Frachtraum voll geht VOR Lager
// leer: wer beides hat, will zuerst wissen, dass am eigenen Schiff nichts
// mehr reinpasst, nicht dass der Planet nichts mehr hergibt.
export function ladeSperrGrund(state, flotte, hafen, resId) {
  if (frachtraumFrei(state, flotte) <= 0) return t("Frachtraum voll.");
  if (Math.floor(hafen.ressourcen[resId] || 0) <= 0) {
    return t("{res} im Lager leer.", { res: t(RESSOURCEN[resId].name) });
  }
  return null;
}

// Dieselbe Frage für die Tankzeile -- Tank voll geht VOR kein Deuterium,
// aus demselben Grund.
export function tankSperrGrund(state, flotte, hafen) {
  const platz = flotteTankKapazitaet(state, flotte) - (flotte.treibstoff || 0);
  if (platz <= 0) return t("Tank voll.");
  if (Math.floor(hafen.ressourcen.tritium || 0) <= 0) return t("Kein Deuterium im Lager.");
  return null;
}

// Dieselbe Frage für die Kolonisten-Zeile -- Kolonistenraum voll geht VOR
// keine Bevölkerung, aus demselben Grund wie bei Tank und Fracht.
export function siedlerSperrGrund(state, flotte, hafen) {
  const platz = flotteSiedlerKapazitaet(flotte) - (flotte.siedler || 0);
  if (platz <= 0) return t("Kolonistenraum voll.");
  if (Math.floor(hafen.ressourcen.bevoelkerung || 0) <= 0) return t("Keine Bevölkerung im Lager.");
  return null;
}

// Die BASIS-Tooltips der Bestätigen-Knöpfe -- eine Funktion, zwei Leser
// (das Gerüst beim Bauen, die Füllstelle bei jedem Takt), statt derselben
// Zeichenkette an zwei Stellen zu pflegen. A-101 braucht das: im entsperrten
// Zustand muss der ursprüngliche Tooltip stehen bleiben, nicht eine leere
// Zeichenkette.
function tankBestaetigenTitel() {
  return t("Übernimmt die eingestellte Menge aus dem Hafenlager in den Tank.");
}
function siedlerBestaetigenTitel() {
  return t("Nimmt die eingestellte Menge Bevölkerung aus dem Hafenlager als Kolonisten an Bord.");
}
function ladenBestaetigenTitel(resId) {
  return t("Lädt die eingestellte Menge {res} aus dem Hafenlager in den Frachtraum.", {
    res: t(RESSOURCEN[resId].name),
  });
}

// Füllt die Zahlen neben allen Reglern der Flottenübersicht.
//
// Steht HIER und nicht mehr allein in den Zuhörern aus `flottenDetail`: das
// dort gebaute Kästchen wird von `detailAustauschen` verworfen, sobald sich
// das Gerüst nicht geändert hat -- und dann schrieb an diesen Zahlen niemand
// mehr. Gemessen (A-093): nach einem Klick auf "Laden" sprang der Regler auf
// 0 zurück, während daneben unverändert "25% (50.000)" stehenblieb, Takt für
// Takt. Von hier aus läuft es über `flottenDetailZahlen` mit, also im
// Sekundentakt UND nach jeder Aktion.
function mengenAnzeigenFuellen(state, box, flotte, hafen) {
  const tankRegler = box.querySelector("input[data-tanken-schieber]");
  if (tankRegler) {
    textSetzen(
      box.querySelector('[data-tanken-anzeige="1"]'),
      mengeEinstellungText(
        tankEinstellung(state, flotte, hafen, tankRegler, box.querySelector("input[data-tanken-feld]"))
      )
    );
    // A-101: der Knopf sagt, wenn er strukturell nichts tun KANN -- Tank voll
    // oder kein Deuterium im Lager. Ein Regler auf 0 % sperrt nicht (siehe
    // ladeSperrGrund/tankSperrGrund); der Knopf bleibt dann wie bisher aktiv.
    // Entsperrt bleibt der URSPRÜNGLICHE Tooltip stehen, nicht leer.
    const grund = tankSperrGrund(state, flotte, hafen);
    const knopf = box.querySelector("button[data-tanken-bestaetigen]");
    if (knopf) {
      knopf.disabled = !!grund;
      attributSetzen(knopf, "title", grund || tankBestaetigenTitel());
    }
  }
  // A-132: derselbe Aufbau wie die Tankzeile -- eigener Regler, eigener Raum.
  const siedlerRegler = box.querySelector("input[data-siedler-schieber]");
  if (siedlerRegler) {
    textSetzen(
      box.querySelector('[data-siedler-anzeige="1"]'),
      mengeEinstellungText(
        siedlerEinstellung(state, flotte, hafen, siedlerRegler, box.querySelector("input[data-siedler-feld]"))
      )
    );
    const grund = siedlerSperrGrund(state, flotte, hafen);
    const knopf = box.querySelector("button[data-siedler-bestaetigen]");
    if (knopf) {
      knopf.disabled = !!grund;
      attributSetzen(knopf, "title", grund || siedlerBestaetigenTitel());
    }
  }
  for (const regler of box.querySelectorAll("input[data-laden-schieber]")) {
    const resId = regler.dataset.ladenSchieber;
    textSetzen(
      box.querySelector(`[data-laden-anzeige="${resId}"]`),
      mengeEinstellungText(
        ladeEinstellung(state, flotte, hafen, resId, regler, box.querySelector(`input[data-laden-feld="${resId}"]`))
      )
    );
    const grund = ladeSperrGrund(state, flotte, hafen, resId);
    const knopf = box.querySelector(`button[data-laden-bestaetigen="${resId}"]`);
    if (knopf) {
      knopf.disabled = !!grund;
      attributSetzen(knopf, "title", grund || ladenBestaetigenTitel(resId));
    }
  }
}

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
  for (const regler of box.querySelectorAll("input[type=range][data-tanken-schieber], input[type=range][data-laden-schieber], input[type=range][data-siedler-schieber]")) {
    if (regler === document.activeElement) continue;
    const schluessel = regler.dataset.ladenSchieber
      ? `laden:${flotte.id}:${regler.dataset.ladenSchieber}`
      : regler.dataset.siedlerSchieber
      ? `siedler:${flotte.id}`
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
    t("Frachtraum {menge}/{kapazitaet} · noch frei: {frei}", {
      menge: fmt(ladungGesamt(flotte)),
      kapazitaet: fmt(flotteKapazitaet(state, flotte)),
      frei: fmt(frachtraumFrei(state, flotte)),
    })
  );
  // A-118: derselbe Balken wie das Lager -- ein Segment je geladener
  // Ressource, in ihrer Ressourcenfarbe. `flotteLadungAnteile` liefert nur
  // die Zahlen (js/flotten.js, testbar ohne DOM), Farbe und Titeltext kommen
  // hier dazu, wie bei den Lager-Segmenten oben.
  balkenFuellen(
    box.querySelector("[data-frachtraum-balken]"),
    flotteLadungAnteile(state, flotte).map((s) => ({
      resId: s.resId,
      anteil: s.anteil,
      farbe: RESSOURCEN[s.resId].farbe,
      titel: t("{res}: {menge} ({anteil}% des Frachtraums)", {
        res: t(RESSOURCEN[s.resId].name),
        menge: fmt(s.menge),
        anteil: Math.round(s.anteil * 100),
      }),
    }))
  );
  // Der Tank bekommt denselben Balken (Deutung der Planung, A-118): ein
  // Segment, es gibt nur eine Sorte Treibstoff.
  textSetzen(
    box.querySelector("[data-tank-fuellstand]"),
    t("Tank {menge}/{kapazitaet}", {
      menge: fmt(flotte.treibstoff),
      kapazitaet: fmt(flotteTankKapazitaet(state, flotte)),
    })
  );
  balkenFuellen(
    box.querySelector("[data-tank-balken]"),
    flotteTankAnteile(state, flotte).map((s) => ({
      resId: s.resId,
      anteil: s.anteil,
      farbe: RESSOURCEN[s.resId].farbe,
      titel: t("{res}: {menge} ({anteil}% des Tanks)", {
        res: t(RESSOURCEN[s.resId].name),
        menge: fmt(s.menge),
        anteil: Math.round(s.anteil * 100),
      }),
    }))
  );
  // A-132: eigene Zeile für den Kolonistenraum -- kein Balken (nur eine
  // "Sorte", wie beim Tank), aber derselbe Live-Text-Mechanismus.
  const siedlerFeld = box.querySelector("[data-siedler-lage]");
  if (siedlerFeld) {
    textSetzen(
      siedlerFeld,
      t("Kolonisten an Bord: {menge}/{kapazitaet} ({lager} Bevölkerung im Lager)", {
        menge: fmt(flotte.siedler || 0),
        kapazitaet: fmt(flotteSiedlerKapazitaet(flotte)),
        lager: fmt(hafen.ressourcen.bevoelkerung || 0),
      })
    );
  }
  for (const r of LAGER_RESSOURCEN) {
    const feld = box.querySelector(`[data-lager-lage="${r}"]`);
    if (!feld) continue;
    textSetzen(feld, t("{res} ({lager} im Lager)", { res: t(RESSOURCEN[r].name), lager: fmt(hafen.ressourcen[r] || 0) }));
  }
  mengenAnzeigenFuellen(state, box, flotte, hafen);
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
      planet: htmlText(hafen.name),
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
      <span class="schieber-gruppe bedienzeile">
        <span class="dezent zeile-beschriftung" data-tritium-lage></span>
        <input class="zeile-regler" type="range" min="0" max="100" step="1" data-tanken-schieber="1" title="${t(
          "Anteil dessen, was noch in den Tank passt und im Lager liegt – 100 % füllt ihn auf. Der Regler stellt nur ein, erst „Tanken“ führt es aus."
        )}" />
        <span class="schieber-wert zeile-zahl" data-tanken-anzeige="1"></span>
        <input type="number" class="menge-feld zeile-eingabe" min="0" step="1" placeholder="${t("genaue Menge")}" data-tanken-feld="1" title="${t(
          "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler."
        )}" />
        <button class="zeile-knopf-1" data-tanken-bestaetigen="1" title="${tankBestaetigenTitel()}">${t("Tanken")}</button>
        <button class="zeile-knopf-2" data-tanken-alles-ab="1" ${flotte.treibstoff > 0 ? "" : "disabled"} title="${t(
          "Gesamten Treibstoff ans Lager zurückgeben"
        )}">${t("Alles abladen")}</button>
      </span>
    </div>
    <div class="flotte-reihe">
      <span class="flotte-fuellstand" style="display:flex;flex-direction:column;align-items:stretch;gap:.2rem;flex:1 1 12rem">
        <span class="dezent" data-tank-fuellstand></span>
        <span class="lager-balken-rahmen" data-tank-balken></span>
      </span>
    </div>
    ${flotteSiedlerKapazitaet(flotte) > 0 ? `
    <div class="flotte-reihe">
      <span class="schieber-gruppe bedienzeile">
        <span class="dezent zeile-beschriftung" data-siedler-lage></span>
        <input class="zeile-regler" type="range" min="0" max="100" step="1" data-siedler-schieber="1" title="${t(
          "Anteil dessen, was noch in den Kolonistenraum passt und im Lager an Bevölkerung lebt – 100 % füllt ihn auf. Der Regler stellt nur ein, erst „Laden“ führt es aus. Zählt NICHT gegen den Frachtraum."
        )}" />
        <span class="schieber-wert zeile-zahl" data-siedler-anzeige="1"></span>
        <input type="number" class="menge-feld zeile-eingabe" min="0" step="1" placeholder="${t("genaue Menge")}" data-siedler-feld="1" title="${t(
          "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler."
        )}" />
        <button class="zeile-knopf-1" data-siedler-bestaetigen="1" title="${siedlerBestaetigenTitel()}">${t("Laden")}</button>
        <button class="zeile-knopf-2" data-siedler-alle-ab="1" ${flotte.siedler > 0 ? "" : "disabled"} title="${t(
          "Alle Kolonisten an Bord ans Lager zurückgeben"
        )}">${t("Alle absetzen")}</button>
      </span>
    </div>` : ""}
    <div class="flotte-reihe">
      <span class="flotte-fuellstand" style="display:flex;flex-direction:column;align-items:stretch;gap:.2rem;flex:1 1 12rem">
        <span class="dezent" data-frachtraum-lage></span>
        <span class="lager-balken-rahmen" data-frachtraum-balken></span>
      </span>
    </div>
    <div class="flotte-reihe">
      ${LAGER_RESSOURCEN.filter((r) => r !== "credits").map((r) => `
        <span class="schieber-gruppe bedienzeile">
          <span class="dezent zeile-beschriftung" data-lager-lage="${r}"></span>
          <input class="zeile-regler" type="range" min="0" max="100" step="1" data-laden-schieber="${r}" title="${t(
            "Anteil dessen, was gerade wirklich ladbar ist: freier Frachtraum, begrenzt durch den Lagerbestand – 100 % nimmt alles davon. Der Regler stellt nur ein, „Laden“ führt aus."
          )}" />
          <span class="schieber-wert zeile-zahl" data-laden-anzeige="${r}"></span>
          <input type="number" class="menge-feld zeile-eingabe" min="0" step="1" placeholder="${t("genaue Menge")}" data-laden-feld="${r}" title="${t(
            "Genauer Betrag statt Prozent. Was hier steht, hat Vorrang vor dem Regler."
          )}" />
          <button class="zeile-knopf-1" data-laden-bestaetigen="${r}" title="${ladenBestaetigenTitel(r)}">${t("Laden")}</button>
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
          <button data-reparieren="${typ}" ${repCheck.ok ? "" : "disabled"} title="${repCheck.ok ? buendelText(repCheck.kosten, { abgang: true }) : repCheck.grund}">${t("Reparieren")}</button>
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
      <button data-verschicken="1" title="${t(
        "Öffnet die Karte mit dieser Flotte in der Kommandoleiste – Ziel anklicken, Auftrag wählen, los."
      )}">${t("Verschicken")}</button>
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
  // Beim Ziehen UND beim Tippen sofort -- der Sekundentakt wäre für eine
  // Rückmeldung auf die eigene Eingabe zu spät. Die Zahl selbst kommt aus
  // `mengenAnzeigenFuellen`, damit hier keine zweite Rechnung entsteht.
  box.querySelectorAll("input[data-tanken-schieber]").forEach((input) => {
    input.addEventListener("input", () => {
      reglerPosition[`tanken:${flotte.id}`] = Number(input.value);
      mengenAnzeigenFuellen(state, box, flotte, hafen);
    });
  });
  box.querySelectorAll("input[data-tanken-feld]").forEach((feld) => {
    feld.addEventListener("input", () => mengenAnzeigenFuellen(state, box, flotte, hafen));
  });
  box.querySelectorAll("button[data-tanken-bestaetigen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Das Eingabefeld hat Vorrang: wer eine genaue Zahl hinschreibt, meint
      // sie auch. Der Regler ist die grobe, das Feld die feine Einstellung
      // (Tobis Wunsch -- Prozent allein trifft keine krummen Beträge).
      // Seit A-093 rechnet das `mengeEinstellung` -- dieselbe Funktion, aus
      // der auch die Zahl daneben kommt.
      const { menge } = tankEinstellung(
        state,
        flotte,
        hafen,
        box.querySelector("input[data-tanken-schieber]"),
        box.querySelector("input[data-tanken-feld]")
      );
      if (menge > 0) tanken(state, flotte, menge);
      delete reglerPosition[`tanken:${flotte.id}`];
      render(state, root);
    });
  });
  // A-132: Kolonisten-Regler/-Knöpfe, exakt dasselbe Muster wie beim Tanken
  // -- eigener Raum, eigene Reglerposition, "Laden" bestätigt erst.
  box.querySelectorAll("button[data-siedler-alle-ab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siedlerUmladen(state, flotte, -(flotte.siedler || 0));
      render(state, root);
    });
  });
  box.querySelectorAll("input[data-siedler-schieber]").forEach((input) => {
    input.addEventListener("input", () => {
      reglerPosition[`siedler:${flotte.id}`] = Number(input.value);
      mengenAnzeigenFuellen(state, box, flotte, hafen);
    });
  });
  box.querySelectorAll("input[data-siedler-feld]").forEach((feld) => {
    feld.addEventListener("input", () => mengenAnzeigenFuellen(state, box, flotte, hafen));
  });
  box.querySelectorAll("button[data-siedler-bestaetigen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { menge } = siedlerEinstellung(
        state,
        flotte,
        hafen,
        box.querySelector("input[data-siedler-schieber]"),
        box.querySelector("input[data-siedler-feld]")
      );
      if (menge > 0) siedlerUmladen(state, flotte, menge);
      delete reglerPosition[`siedler:${flotte.id}`];
      render(state, root);
    });
  });
  // Laden-Regler, gleiches Prinzip: % der MAXIMALEN Flottenkapazität (nicht
  // des gerade freien Frachtraums), Regler setzt nur die Anzeige, "Laden"
  // bestätigt.
  box.querySelectorAll("input[data-laden-schieber]").forEach((input) => {
    const resId = input.dataset.ladenSchieber;
    input.addEventListener("input", () => {
      reglerPosition[`laden:${flotte.id}:${resId}`] = Number(input.value);
      mengenAnzeigenFuellen(state, box, flotte, hafen);
    });
  });
  box.querySelectorAll("input[data-laden-feld]").forEach((feld) => {
    feld.addEventListener("input", () => mengenAnzeigenFuellen(state, box, flotte, hafen));
  });
  box.querySelectorAll("button[data-laden-bestaetigen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const resId = btn.dataset.ladenBestaetigen;
      const { menge } = ladeEinstellung(
        state,
        flotte,
        hafen,
        resId,
        box.querySelector(`input[data-laden-schieber="${resId}"]`),
        box.querySelector(`input[data-laden-feld="${resId}"]`)
      );
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
  // Die erste der drei Türen in die Kommandoleiste (A-057): von hier aus mit
  // gesetzter Flotte. Über `aktiverBereich`, denselben Weg wie die Navigation
  // -- kein zweiter Mechanismus fürs Bereichswechseln.
  box.querySelector("button[data-verschicken]").addEventListener("click", () => {
    state.aktiveFlotte = flotte.id;
    aktiverBereich = "galaxie";
    render(state, root);
  });
  box.querySelector("button[data-aufloesen]").addEventListener("click", () => {
    flotteAufloesen(state, flotte);
    state.aktiveFlotte = null;
    render(state, root);
  });
  return box;
}

// Route: unabhängig davon, ob die Flotte gerade im Hafen liegt -- eine
// Route lässt sich jederzeit planen, auch während die Flotte unterwegs ist.
// Die Live-Zahl der Routenbox. Eine wartende Route sieht sonst aus wie eine
// hängende -- der Text nennt beide Zahlen: wo sie steht und wohin sie muss.
//
// Eigene Funktion aus demselben Grund wie `flottenDetailZahlen`: Der Bereich
// bleibt zwischen den Takten stehen, also muss jemand seine Zahlen nachziehen,
// der NICHT das verworfene Kästchen ist (A-093).
function routenDetailZahlen(state, box, flotte) {
  const feld = box.querySelector("[data-route-wartet]");
  if (!feld) return;
  const route = flotte.route;
  const wartet = !!(route && route.aktiv && route.wartetAn != null);
  feld.hidden = !wartet;
  if (!wartet) return;
  textSetzen(
    feld,
    t("wartet auf Beladung: {ist}/{soll} %", {
      ist: Math.floor(routeBeladungAnteil(state, flotte) * 100),
      soll: route.mindestBeladung || 0,
    })
  );
}

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
    <h3 class="unter-titel">${t("Route")} ${route.aktiv ? `<span class="basis-tag route-tag">${t("aktiv – Halt {nr}/{gesamt}", { nr: route.index + 1, gesamt: route.halte.length })}</span>` : ""}<span class="basis-tag warnung" data-route-wartet hidden></span></h3>
    <div class="flotte-reihe">
      <label class="dezent">${t("Abflug erst ab")}
        <input type="number" class="menge-feld" min="0" max="100" step="5" value="${route.mindestBeladung || 0}" data-route-schwelle title="${t("Die Route wartet am Ladehalt, bis der Frachtraum so voll ist. 0 heißt: sofort weiter, wie bisher. An einem reinen Entladehalt gilt die Schwelle nicht – dort käme nie Fracht dazu.")}" />
        % ${t("Beladung")}
      </label>
    </div>
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

  // Die Signatur VOR dem Füllen -- sonst stünde die wandernde Beladungszahl
  // mit drin, der Bereich würde bei jeder Ladung ausgetauscht, und wer gerade
  // die Schwelle eintippt, verlöre das Feld unter den Fingern. Genau die Falle,
  // vor der der Auftrag warnt (und dieselbe wie bei den Reglern nebenan).
  box.dataset.geruest = box.innerHTML;
  routenDetailZahlen(state, box, flotte);

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
  // "change" statt "input": Beim Tippen von "80" stünde zwischendurch "8" da,
  // und eine gesenkte Schwelle greift sofort -- die Route führe bei der ersten
  // Ziffer los. Übernommen wird, was am Ende dasteht (Verlassen oder Enter).
  box.querySelectorAll("input[data-route-schwelle]").forEach((feld) => {
    feld.addEventListener("change", () => {
      routeMindestbeladungSetzen(state, flotte, feld.value);
      render(state, root);
    });
    feld.addEventListener("keydown", (ereignis) => {
      if (ereignis.key === "Enter") feld.blur();
    });
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

// --- Die Kommandoleiste (A-057) -------------------------------------------
//
// TOBIS VORGABE (18.08., KONZEPT-FLOTTEN-UX): „Alles was man zum Bewegen der
// Flotte braucht muss auf einem Screen zu sehen sein." Vorher lief ein Versand
// über drei Orte und zwei Bereiche: Flotte im Planetenbereich wählen, dort
// tanken, in die Galaxie wechseln, System suchen, Orbit anklicken, Knopf in
// der Zeile drücken — und wenn der Treibstoff nicht reichte, von vorn.
//
// Drei Stationen, fest untereinander, nichts klappt (Prinzip 8):
//   1 Flotte   eigene Flotten als Chips, Muster Planetenwahl
//   2 Ziel     was auf den Karten gewählt ist — System und Orbit
//   3 Auftrag  was dort geht, Rückkehr-Schalter, Treibstoff, Los
//
// KEIN ZWEITER ZUSTAND, und daran löst sich die Falle (1) des Auftrags von
// selbst auf. Die Flotte ist `state.aktiveFlotte` — dieselbe, die die
// Flottenliste und die Kartenwahl aus A-056 setzen. Das Ziel ist
// `state.angezeigtesSystem` plus `orbitWahl`, also genau das, was auf den
// beiden Karten hervorgehoben ist. Der Kartenklick MUSS deshalb nicht zwischen
// „System ansehen" und „Ziel setzen" unterscheiden: es ist dasselbe. Ohne
// gewählte Flotte ist es eben nur eine Ansicht, mit einer ist es ein Ziel.
//
// Was die Leiste NICHT tut: eigene Missionsregeln. Jede angebotene Aktion und
// jeder gesperrte Knopf kommt aus `orbitAngebot` — derselben Funktion, aus der
// auch die Systemliste ihre Knöpfe zieht (der Auftrag: EIN Regelwerk).

// Was in der Leiste eingestellt ist. Reiner UI-Zustand wie `orbitWahl`, gehört
// nicht in den Spielstand.
//
// `schluessel` ist Flotte + Ziel: ändert sich einer der beiden, sind die
// Einstellungen von vorhin gegenstandslos und werden zurückgesetzt. Das ist
// zugleich Lernpunkt 4 aus 8a (Falle 3 des Auftrags) — hier allerdings doppelt
// abgesichert: die Handler lesen die Flotte beim KLICK aus `state`, ein
// stehengebliebener Knopf kann also gar keine alte Flotte mehr befehligen.
//
// `tankFeld: null` heißt „nimm den Vorschlag" — nicht „tanke nichts". Sonst
// müsste jede Änderung am Rückkehr-Schalter das Feld nachschreiben, auch
// während man darin tippt.
let kommandoStand = { schluessel: null, artIndex: 0, rueckkehr: false, tankFeld: null, rueckzug: null };

// Die Vorschaulinie für die Galaxiekarte. Wird von `renderKommando` gesetzt,
// von `renderGalaxie` gelesen — deshalb läuft das Kommando im Render VOR der
// Karte. Andersherum hinkte die Linie einen Takt hinterher.
let kommandoVorschau = null;

// Was diese Fahrt kostet und wieviel dafür FEHLT. Exportiert, obwohl sonst
// nichts außerhalb dieser Datei sie ruft: genau das ist die Zusage der
// Treibstoffzeile („nachgetankt reicht es"), und eine Zusage, die niemand
// nachrechnen kann, ist eine Behauptung.
//
// Der Bedarf kommt aus `reichtTreibstoff` — derselben Rechnung, die auch
// `kannBefehlen` anstellt (EIN Maßstab, so beauftragt). `fehlt` ist bewusst
// die LÜCKE und nicht der Fahrpreis: sonst tankte ein halbvoller Verband
// doppelt, und „Los" wäre kein Ein-Klick-Weg mehr.
export function tankVorschlag(state, flotte, vonOrt, zielOrt, rundflug) {
  const pruefung = reichtTreibstoff(state, flotte, vonOrt, zielOrt);
  const bedarf = Math.ceil(rundflug ? pruefung.benoetigt : pruefung.hinVerbrauch);
  return { bedarf, fehlt: Math.max(0, bedarf - Math.floor(flotte.treibstoff || 0)) };
}

// Die ganze Lage in einem Rutsch: Flotte, Ziel, Angebot, Treibstoff. EINE
// Funktion, weil jede Station der Leiste dieselben Zwischenwerte braucht und
// zwei Rechnungen zwei Antworten wären.
function kommandoLage(state, jetzt) {
  const flotte = flotteById(state, state.aktiveFlotte);
  const systemId = state.angezeigtesSystem;
  const orbit = orbitWahl.systemId === systemId ? orbitWahl.orbit : null;
  const lage = { flotte, systemId, orbit };

  if (!flotte) {
    lage.grund = t("Wähle eine Flotte – als Chip oben oder mit einem Klick auf ihren Punkt in der Karte.");
    return lage;
  }
  lage.vonOrt = flotte.abschnitt ? flottePosition(state, flotte, jetzt) : flotte.ort;

  if (orbit === null) {
    lage.grund = t("Wähle ein Ziel – klicke einen Orbit in der Systemkarte oder eine Zeile in der Systemliste an.");
    return lage;
  }
  const objekt = holeSystem(state, systemId).objekte.find((o) => o.orbit === orbit);
  if (!objekt) {
    lage.grund = t("Dieser Orbit trägt nichts.");
    return lage;
  }
  lage.objekt = objekt;
  lage.zielOrt = ortVonSystem(state, systemId, orbit);
  lage.distanz = strecke(lage.vonOrt, lage.zielOrt);
  // Erstflug: es führt keine vermessene Route dorthin. Dieselbe Frage, die
  // `abschnittStarten` stellt — die Dauer soll die Wahrheit sagen und nicht
  // die schönere Zahl.
  lage.unterlicht = lage.vonOrt.systemId !== systemId && !hatSprungroute(state, systemId);
  lage.dauerMs = flugdauerMs(state, flotte, lage.distanz, lage.unterlicht);

  // Erst fragen, WAS es hier gibt: das hängt am Objekt, nicht am Tank.
  const angebotRoh = orbitAngebot(state, systemId, objekt, flotte);
  if (angebotRoh.hinweis) {
    lage.grund = angebotRoh.hinweis;
    lage.gesperrt = angebotRoh.gesperrt;
    return lage;
  }

  const schluessel = `${flotte.id}:${systemId}:${orbit}`;
  if (kommandoStand.schluessel !== schluessel) {
    kommandoStand = {
      schluessel,
      artIndex: 0,
      rueckkehr: !!(angebotRoh.rueckkehr && angebotRoh.rueckkehr.vorbelegt),
      tankFeld: null,
      rueckzug: null,
    };
  }
  const index = Math.max(0, Math.min(kommandoStand.artIndex, angebotRoh.aktionen.length - 1));
  // BEWUSST OHNE `moeglich`-Prüfung: `angebotRoh` sieht die Flotte mit dem
  // Treibstoff, den sie JETZT hat -- an einer leeren Flotte im vollen Hafen
  // wäre der Rückweg damit nie gedeckt, der Haken spränge sofort zurück, und
  // der Vorschlag bliebe für immer der kleine. Ob der Rückweg bezahlbar ist,
  // entscheidet weiter unten die Prüfung MIT dem Nachtanken -- und wenn nicht,
  // sagt es der Los-Knopf im Klartext, statt die Wahl heimlich zurückzudrehen.
  const rueckkehr = !!(angebotRoh.rueckkehr && kommandoStand.rueckkehr);

  // --- Treibstoff ---------------------------------------------------------
  // Gründung und Anflug kehren von sich aus heim und rechnen deshalb immer mit
  // Rückweg; bei einer Mission entscheidet der Schalter.
  const rundflug = !angebotRoh.rueckkehr || rueckkehr;
  const { bedarf, fehlt } = tankVorschlag(state, flotte, lage.vonOrt, lage.zielOrt, rundflug);
  const anBord = Math.floor(flotte.treibstoff || 0);
  const hafen = flotte.dockPlanet ? planetById(state, flotte.dockPlanet) : null;
  const imLager = hafen ? Math.floor(hafen.ressourcen.tritium || 0) : 0;
  const vorschlag = Math.min(fehlt, imLager);
  const tankMenge =
    kommandoStand.tankFeld === null ? vorschlag : Math.max(0, Math.min(kommandoStand.tankFeld, imLager));

  // Der Knopf muss die Lage NACH dem Tanken beurteilen — sonst sperrte er sich
  // gegen den Treibstoff, den er im selben Klick lädt. Eine flache Kopie
  // genügt: sämtliche Prüfungen LESEN die Flotte nur, keine schreibt.
  const probe = tankMenge > 0 ? { ...flotte, treibstoff: flotte.treibstoff + tankMenge } : flotte;
  const angebot = orbitAngebot(state, systemId, objekt, probe, rueckkehr);
  if (angebot.hinweis) {
    lage.grund = angebot.hinweis;
    return lage;
  }

  // Der Rückkehr-Schalter braucht seine EIGENE Vorschau, und das ist kein
  // Feinschliff: gemessen im Browser stand er gesperrt an einer Flotte, die im
  // Hafen mit 200.000 Deuterium daneben lag. Grund war die Henne-Ei-Lage --
  // vorgeschlagen wird der Sprit für die Hinstrecke, mit DEM ist der Rückweg
  // nicht gedeckt, also war der Haken gesperrt, also blieb der Vorschlag klein.
  // Der Schalter wird deshalb gegen die Tankmenge geprüft, die SEIN Anhaken
  // vorschlagen würde. Von Hand eingetragen? Dann gilt die Handeingabe -- wer
  // die Menge selbst setzt, soll auch sehen, was sie noch trägt.
  const tankFuerRueck =
    kommandoStand.tankFeld === null
      ? Math.min(tankVorschlag(state, flotte, lage.vonOrt, lage.zielOrt, true).fehlt, imLager)
      : tankMenge;
  const angebotRueck =
    angebot.rueckkehr && tankFuerRueck !== tankMenge
      ? orbitAngebot(state, systemId, objekt, { ...flotte, treibstoff: flotte.treibstoff + tankFuerRueck }, true)
      : angebot;

  return Object.assign(lage, {
    angebot,
    aktion: angebot.aktionen[index],
    index,
    rueckkehr,
    rueckkehrMoeglich: !!(angebotRueck.rueckkehr && angebotRueck.rueckkehr.moeglich),
    rueckkehrTitel: angebotRueck.rueckkehr ? angebotRueck.rueckkehr.titel : "",
    hatRueckkehr: !!angebot.rueckkehr,
    rueckzug: !!angebot.rueckzug,
    bedarf,
    anBord,
    imLager,
    hafen,
    tankMenge,
    vorschlag,
  });
}

// Der Auftrag wird ausgeführt: erst tanken, dann befehlen. Die Reihenfolge ist
// der Sinn der Leiste — wer hier steht, soll nicht erst in den Hafenbereich
// wechseln, um den Tank zu füllen, den diese Fahrt braucht.
function kommandoAusfuehren(state, root, jetzt) {
  const lage = kommandoLage(state, jetzt);
  if (!lage.aktion || !lage.aktion.check.ok) return;
  if (lage.tankMenge > 0 && lage.hafen) tanken(state, lage.flotte, lage.tankMenge);

  const a = lage.aktion;
  if (a.typ === "anfliegen") {
    zumPlanetBefehlen(state, lage.flotte, a.planetId);
  } else if (a.typ === "gruenden") {
    gruendungBefehlen(state, lage.flotte, a.art, lage.systemId, lage.orbit);
  } else {
    const optionen = { rueckkehr: lage.rueckkehr };
    if (lage.rueckzug) {
      const prozent = kommandoStand.rueckzug === null ? KAMPF.standardRueckzugsSchwelle * 100 : kommandoStand.rueckzug;
      optionen.rueckzugsSchwelle = Math.max(0, Math.min(100, prozent)) / 100;
    }
    missionBefehlen(state, lage.flotte, a.art, lage.systemId, lage.orbit, optionen);
  }
  // Nach dem Start ist die Einstellung verbraucht: die Flotte steht woanders,
  // der Treibstoff ist ein anderer. Der nächste Takt rechnet frisch.
  kommandoStand = { schluessel: null, artIndex: 0, rueckkehr: false, tankFeld: null, rueckzug: null };
  render(state, root);
}

// Das Gerüst. EINMAL je Sprache — die festen Beschriftungen stehen darin, und
// ein Sprachwechsel ist der einzige Grund, sie neu zu schreiben (dasselbe
// Muster wie Kartenlegende und Handbuch). Alles, was sich im Sekundentakt
// ändert, hat ein eigenes Feld und wird unten gefüllt: ein Los-Knopf, der
// jede Sekunde neu entsteht, verschluckt Klicks (Prinzip 8a).
function kommandoGeruestBauen(state, root, leiste) {
  leiste.dataset.gebaut = sprache();
  leiste.innerHTML = `
    <div class="kommando-station">
      <div class="kommando-titel">${t("1 · Flotte")}</div>
      <div class="kommando-chips" data-kommando-flotten></div>
      <div class="dezent" data-kommando-flotte-lage></div>
    </div>
    <div class="kommando-station">
      <div class="kommando-titel">${t("2 · Ziel")}</div>
      <div data-kommando-ziel></div>
      <div class="dezent" data-kommando-ziel-lage></div>
    </div>
    <div class="kommando-station">
      <div class="kommando-titel">${t("3 · Auftrag")}</div>
      <div class="kommando-chips" data-kommando-arten hidden></div>
      <label class="dezent kommando-schalter" data-kommando-rueck-label hidden>
        <input type="checkbox" data-kommando-rueckkehr /> ${t("zurück zum Heimathafen")}
      </label>
      <label class="dezent kommando-schalter" data-kommando-rueckzug-label hidden>
        ${t("Rückzug unter")}
        <input type="number" class="menge-feld" min="0" max="100" step="5" data-kommando-rueckzug />%
      </label>
      <div class="bedienzeile kommando-sprit">
        <span class="dezent zeile-beschriftung">${t("Nachtanken")}</span>
        <span class="zeile-zahl" data-kommando-sprit></span>
        <input type="number" class="menge-feld zeile-eingabe" min="0" step="1" data-kommando-tankfeld />
      </div>
      <button class="kommando-los" data-kommando-los disabled></button>
      <div class="dezent" data-kommando-grund></div>
    </div>`;

  // Ereignisse EINMAL und delegiert — dieselbe Begründung wie bei der
  // Systemliste: die Felder bleiben stehen, ein Handler je Takt wäre nach
  // einer Minute sechzig Handler an einem Knopf.
  leiste.addEventListener("click", (ereignis) => {
    if (ereignis.target.closest("button[data-kommando-los]")) {
      kommandoAusfuehren(state, root, spielzeitJetzt(state));
      return;
    }
    const art = ereignis.target.closest("button[data-kommando-art]");
    if (art) {
      kommandoStand.artIndex = Number(art.dataset.kommandoArt);
      kommandoStand.tankFeld = null;
      render(state, root);
    }
  });
  leiste.addEventListener("change", (ereignis) => {
    if (ereignis.target.matches("input[data-kommando-rueckkehr]")) {
      kommandoStand.rueckkehr = ereignis.target.checked;
      // Der Rückweg ändert den Bedarf — ein von Hand gesetzter Betrag würde
      // sonst stehen bleiben und die Fahrt zu knapp betanken.
      kommandoStand.tankFeld = null;
      render(state, root);
      return;
    }
    if (ereignis.target.matches("input[data-kommando-rueckzug]")) {
      kommandoStand.rueckzug = Number(ereignis.target.value);
      return;
    }
    if (ereignis.target.matches("input[data-kommando-tankfeld]")) {
      const wert = Number(ereignis.target.value);
      kommandoStand.tankFeld = Number.isFinite(wert) ? Math.max(0, Math.round(wert)) : null;
      render(state, root);
    }
  });
}

function renderKommando(state, root, jetzt) {
  const leiste = root.querySelector("#kommando-leiste");
  if (!leiste) return;
  if (leiste.dataset.gebaut !== sprache()) kommandoGeruestBauen(state, root, leiste);

  const lage = kommandoLage(state, jetzt);
  kommandoVorschau = lage.zielOrt
    ? { von: lage.vonOrt, nach: lage.zielOrt, text: fmtDauer(lage.dauerMs / 1000) }
    : null;

  // --- Station 1: Flotte --------------------------------------------------
  listeAbgleichen(leiste.querySelector("[data-kommando-flotten]"), flottenVon(state), {
    schluessel: (flotte) => flotte.id,
    bauen: (flotte) => {
      const btn = document.createElement("button");
      btn.className = "planet-chip";
      btn.addEventListener("click", () => {
        state.aktiveFlotte = flotte.id;
        render(state, root);
      });
      return btn;
    },
    aktualisieren: (btn, flotte) => {
      btn.classList.toggle("chip-aktiv", flotte.id === state.aktiveFlotte);
      textSetzen(btn, flotte.name);
    },
  });
  textSetzen(
    leiste.querySelector("[data-kommando-flotte-lage]"),
    lage.flotte
      ? t("{schiffe} · {sprit} Deuterium · Reichweite {weite}", {
          schiffe: schiffeText(lage.flotte.schiffe),
          sprit: fmt(Math.floor(lage.flotte.treibstoff || 0)),
          weite: flotteRestreichweite(lage.flotte).toFixed(1),
        })
      : t("Keine Flotte gewählt.")
  );

  // --- Station 2: Ziel ----------------------------------------------------
  textSetzen(
    leiste.querySelector("[data-kommando-ziel]"),
    lage.orbit === null
      ? t("Kein Ziel gewählt")
      : t("{system} · Orbit {orbit}{name}", {
          system: systemName(state.galaxie.seed, lage.systemId),
          orbit: lage.orbit,
          name: lage.objekt ? ` · ${lage.objekt.name}` : "",
        })
  );
  textSetzen(
    leiste.querySelector("[data-kommando-ziel-lage]"),
    lage.zielOrt
      ? [
          t("Entfernung {distanz}", { distanz: lage.distanz.toFixed(1) }),
          t("Flug {dauer}", { dauer: fmtDauer(lage.dauerMs / 1000) }),
          lage.unterlicht ? t("Erstflug – keine vermessene Route") : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : ""
  );

  // --- Station 3: Auftrag -------------------------------------------------
  const arten = leiste.querySelector("[data-kommando-arten]");
  const aktionen = lage.angebot ? lage.angebot.aktionen : [];
  // Bei genau einer Möglichkeit trägt der Los-Knopf ihren Namen — eine
  // Auswahl mit einem Eintrag ist keine Auswahl, sondern eine Verdopplung.
  arten.hidden = aktionen.length < 2;
  listeAbgleichen(arten, aktionen.length < 2 ? [] : aktionen.map((a, i) => ({ a, i })), {
    schluessel: (e) => `${e.a.typ}:${e.a.art}`,
    bauen: (e) => {
      const btn = document.createElement("button");
      btn.className = "planet-chip";
      btn.dataset.kommandoArt = e.i;
      return btn;
    },
    aktualisieren: (btn, e) => {
      btn.dataset.kommandoArt = e.i;
      btn.classList.toggle("chip-aktiv", e.i === lage.index);
      btn.disabled = !e.a.check.ok;
      attributSetzen(btn, "title", e.a.titel || "");
      textSetzen(btn, e.a.label);
    },
  });

  const rueckLabel = leiste.querySelector("[data-kommando-rueck-label]");
  const rueckSchalter = leiste.querySelector("[data-kommando-rueckkehr]");
  rueckLabel.hidden = !lage.hatRueckkehr;
  attributSetzen(rueckLabel, "title", lage.rueckkehrTitel || "");
  // Gesperrt nur, solange er AUS ist: einen Haken, den man gesetzt hat, muss
  // man auch wieder wegnehmen können -- ein deaktiviertes, angehaktes Kästchen
  // wäre eine Falle ohne Ausgang (Prinzip 7).
  rueckSchalter.disabled = !lage.rueckkehrMoeglich && !lage.rueckkehr;
  if (rueckSchalter !== document.activeElement) rueckSchalter.checked = !!lage.rueckkehr;

  const rueckzugLabel = leiste.querySelector("[data-kommando-rueckzug-label]");
  rueckzugLabel.hidden = !lage.rueckzug;
  const rueckzugFeld = leiste.querySelector("[data-kommando-rueckzug]");
  if (lage.rueckzug && rueckzugFeld !== document.activeElement) {
    const soll = String(kommandoStand.rueckzug === null ? KAMPF.standardRueckzugsSchwelle * 100 : kommandoStand.rueckzug);
    if (rueckzugFeld.value !== soll) rueckzugFeld.value = soll;
  }

  // Die Treibstoffzeile. Der Betrag im Feld ist NACHTANKEN, nicht Fahrtkosten
  // — was die Fahrt kostet und was an Bord ist, steht daneben, damit die
  // Zahl im Feld nachvollziehbar bleibt (Prinzip 10a).
  const spritFeld = leiste.querySelector("[data-kommando-tankfeld]");
  textSetzen(
    leiste.querySelector("[data-kommando-sprit]"),
    lage.aktion
      ? t("{bedarf} nötig · {anBord} an Bord", { bedarf: fmt(lage.bedarf), anBord: fmt(lage.anBord) })
      : ""
  );
  spritFeld.disabled = !lage.aktion || !lage.hafen;
  attributSetzen(
    spritFeld,
    "title",
    lage.aktion && !lage.hafen
      ? t("Nachtanken geht nur im Hafen – diese Flotte liegt nirgends an.")
      : t("Wird vor dem Start aus dem Hafenlager übernommen. Vorgeschlagen ist genau das, was für diese Fahrt fehlt.")
  );
  if (spritFeld !== document.activeElement) {
    const soll = lage.aktion ? String(lage.tankMenge) : "";
    if (spritFeld.value !== soll) spritFeld.value = soll;
  }

  const los = leiste.querySelector("[data-kommando-los]");
  los.disabled = !lage.aktion || !lage.aktion.check.ok;
  textSetzen(los, lage.aktion ? lage.aktion.label : t("Los"));
  attributSetzen(los, "title", lage.aktion && !lage.aktion.check.ok ? lage.aktion.titel : "");

  // Warum es (noch) nicht geht — als Satz, nicht als graue Fläche.
  const grund = leiste.querySelector("[data-kommando-grund]");
  grund.classList.toggle("gesperrt-text", !!lage.gesperrt);
  textSetzen(grund, lage.grund || (lage.aktion && !lage.aktion.check.ok ? lage.aktion.titel : ""));

  textSetzen(
    root.querySelector("#kommando-hinweis"),
    lage.aktion && lage.aktion.check.ok
      ? t("Bereit: {auftrag}", { auftrag: lage.aktion.label })
      : t("Flotte → Ziel → Auftrag")
  );
}

function renderGalaxie(state, root) {
  const reichweite = maxReichweite(state);
  const stuetzpunkte = planetenVon(state).length;
  // A-068, zweite von zwei Stellen -- siehe renderImperium.
  root.querySelector("#galaxie-info").textContent =
    stuetzpunkte === 1
      ? t("Reichweite {reichweite} · 1 Stützpunkt · {systeme} Systeme", {
          reichweite: reichweite.toFixed(0),
          systeme: state.galaxie.anzahlSysteme,
        })
      : t("Reichweite {reichweite} · {stuetzpunkte} Stützpunkte · {systeme} Systeme", {
          reichweite: reichweite.toFixed(0),
          stuetzpunkte,
          systeme: state.galaxie.anzahlSysteme,
        });

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
    aufFlotte: (flottenId) => flotteVonKarteWaehlen(state, root, flottenId),
    // Wohin dieser Auftrag die Flotte schicken würde -- gesetzt von
    // renderKommando, das im Render bewusst VOR der Karte läuft.
    vorschau: kommandoVorschau,
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
    // A-070: EINMAL zählen statt zweimal -- die Zeile darunter rief dieselbe
    // Zählung vorher zweimal auf, und seit sie zwischen Einzahl und Mehrzahl
    // entscheidet, wären es drei Aufrufe geworden.
    const untersuchte = zustand ? untersuchteOrbits(state, eintrag.id) : 0;
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
      // A-070, vierte Stelle des Musters: die Klammerform „Orbit(s)" war die
      // Umgehung statt der Lösung -- daneben stehen mit „1 Tag", „1 Labor"
      // und „1 Stützpunkt" längst drei saubere Einzahl-Formen.
      untersuchte > 0
        ? untersuchte === 1
          ? t("1 Orbit bereits untersucht")
          : t("{anzahl} Orbits bereits untersucht", { anzahl: untersuchte })
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
    // A-130: geschrieben gegen zuletzt geschrieben, nie gegen zurückgelesen.
    if (bezeichnung.dataset.stand !== bezeichnungHtml) {
      bezeichnung.dataset.stand = bezeichnungHtml;
      bezeichnung.innerHTML = bezeichnungHtml;
    }

    const lage = li.querySelector("[data-system-lage]");
    const lageHtml = `${
      systemBesucht(state, eintrag.id)
        ? t("Entfernung {entfernung} · besucht", { entfernung: eintrag.entfernung.toFixed(1) })
        : t("Entfernung {entfernung}", { entfernung: eintrag.entfernung.toFixed(1) })
    } · <span class="stern-punkt" style="--stern-farbe:${stern.farbe}"></span>${stern.spektral}`;
    if (lage.dataset.stand !== lageHtml) {
      lage.dataset.stand = lageHtml;
      lage.innerHTML = lageHtml;
    }

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
  // Nur noch Sonden (A-021). Der Erkunder geht wieder über den
  // Missionsdialog — die Begründung steht an SCHNELLVERSAND in simulation.js.
  const arten = [{ art: "sonde", forschung: "sondenKi", label: () => t("Sonden losschicken") }];
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
    // Der Knopf sagt VOR dem Klick, was er tut: wieviele Sonden, wieviel
    // Treibstoff und dass sie nicht wiederkommen (Prinzip 10a, erweitert um
    // A-138 -- „kommen sie wieder?" ist die dritte und teuerste Frage, und
    // die Erklärung dazu stand schon dreimal woanders, ohne anzukommen).
    // „Losschicken (3)" ließ offen, ob die drei reichen und was sie kosten.
    // A-070, dritte Stelle desselben Musters (A-068): bei genau einem Ziel
    // stand hier „1 Sonden losschicken". Eigene Einzahl-Vorlage, kein
    // Pluralsystem -- das Hausmittel dieses Projekts, siehe „1 Tag" und
    // „1 Labor". Der Rückkehr-Hinweis übernimmt dieselbe Formulierung wie die
    // Schiffsbeschreibung („kehrt nicht zurück") statt des Fachworts „Einweg".
    const beschriftung = !check.ok
      ? label()
      : check.ziele.length === 1
        ? t("1 Sonde losschicken · {sprit} Deuterium · kehrt nicht zurück", {
            sprit: fmt(Math.ceil(check.treibstoff)),
          })
        : t("{anzahl} Sonden losschicken · {sprit} Deuterium · kehren nicht zurück", {
            anzahl: check.ziele.length,
            sprit: fmt(Math.ceil(check.treibstoff)),
          });
    html += ` <button data-schnellversand="${art}" ${check.ok ? "" : "disabled"} title="${titel}">${beschriftung}</button>`;
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
        const rueck = liste.querySelector(`input[data-rueckkehr="${mission.dataset.mission}"]`);
        optionen.rueckkehr = !!(rueck && rueck.checked);
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
    aufFlotte: (flottenId) => flotteVonKarteWaehlen(state, root, flottenId),
  });
}

function slotZeileFuellen(state, systemId, objekt, flotte, li) {
  li.className = "system-slot waehlbar";
  // Hervorgehoben, weil es auf der Karte angeklickt wurde (oder umgekehrt).
  // Die Zeile ist die Bedienfläche des Objekts -- die Karte zeigt hin, die
  // Liste handelt.
  if (orbitWahl.systemId === systemId && orbitWahl.orbit === objekt.orbit) li.classList.add("slot-gewaehlt");
  const gesperrt = objektGesperrt(state, objekt);
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
      : objekt.entdeckt && !eigen && !besetzer && !gesperrt
      ? // A-092: NICHT am verschlossenen Orbit -- dort ist sehr wohl etwas zu
        // holen, nur eben erst mit der Forschung. Die Zeile "Verschlossen --
        // benötigt X" steht eine Zeile darüber und sagt schon alles.
        t("Hier ist nichts mehr zu holen.")
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
  const detailHtml = `${htmlText(objekt.name)}${objekt.entdeckt ? " · " + slotDetail(state, objekt, gesperrt, eigen) : ""}`;
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
  // A-130: dieselbe Umstellung wie bei der Detailzeile oben (dataset.stand
  // statt Rücklesevergleich) -- A-125 hatte hier die geschriebene Zeichenkette
  // korrigiert, die Vergleichsform selbst blieb zerbrechlich.
  if (aktionen.dataset.stand !== aktionenHtml) {
    aktionen.dataset.stand = aktionenHtml;
    aktionen.innerHTML = aktionenHtml;
  }
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
    // A-092: Der Nachlass gehört sichtbar an die Zeile. Er ist das EINZIGE
    // hier, was ohne die Forschung mitgeht -- stünde er nur im Tooltip, wäre
    // die frisch freigegebene Bergung praktisch unauffindbar.
    const rest = restLiegtAn(objekt)
      ? t(" · liegengeblieben: {rest} (bergbar)", { rest: buendelText(objekt.restErtrag) })
      : "";
    return `<span class="gesperrt-text">${sperre}</span>${rest}${ertrag}`;
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

// WAS DARF DIESE FLOTTE AN DIESEM ORBIT? Eine Antwort, zwei Leser: die Zeile
// in der Systemliste (`slotAktion`) und die Kommandoleiste (`renderKommando`,
// A-057). Der Auftrag verlangt ausdrücklich EIN Regelwerk hinter beiden Wegen
// -- und es ist dieselbe Falle wie seinerzeit bei `planetAn`/`eigenerPlanetAn`:
// zwei Stellen, die dieselbe Frage getrennt beantworten, laufen auseinander,
// und zwar zuerst dort, wo es weh tut (ein Knopf bietet an, was der Befehl
// ablehnt).
//
// Geliefert werden DATEN, kein Markup -- die beiden Leser sehen verschieden
// aus, die Regel dahinter darf es nicht:
//   hinweis    es gibt hier nichts zu tun (mit Grund)
//   aktionen   was geht, jede mit der Prüfung, die auch der Befehl durchläuft
//   rueckkehr  der A-020-Schalter (nur bei Missionen; eine Gründung kehrt von
//              sich aus heim, ein Anflug IST das Ziel)
//   rueckzug   nur beim Militäreinsatz: die Rückzugsschwelle
//
// `rueckkehrGewaehlt` steuert die TREIBSTOFFPRÜFUNG der Missionsaktion. Die
// Systemliste fragt mit `false` -- ihr Knopf prüft seit je die Hinstrecke, der
// Schalter daneben trägt seinen eigenen Grund. Die Kommandoleiste fragt mit
// dem, was ihr Schalter gerade sagt.
// Exportiert seit A-092, obwohl nur diese Datei sie ruft -- gleicher Grund wie
// bei `tankVorschlag`: hier lag der Fehler, also gehört der Wächter an genau
// diese Funktion und nicht an eine Schicht darunter, die ohnehin richtig lag.
// ui.js lädt in Node ohne DOM, solange nichts `document` anfasst.
export function orbitAngebot(state, systemId, objekt, flotte, rueckkehrGewaehlt = false) {
  const gesperrt = objektGesperrt(state, objekt);
  const eigen = eigenerPlanetAn(state, systemId, objekt.orbit);

  if (eigen) {
    if (!flotte || flotte.dockPlanet === eigen.id) return { eigen, hinweis: t("Stützpunkt") };
    // PRINZIP 10a: Der Knopf war bis v0.61 immer aktiv und tat bei einer
    // leeren Flotte einfach nichts -- Tobis Meldung "bei Klick auf Anfliegen
    // passiert nichts". Es war kein verschluckter Klick, sondern ein Knopf,
    // der eine unmögliche Aktion anbot und den Grund verschwieg. Dieselbe
    // Prüfung, die der Befehl selbst durchläuft, entscheidet jetzt vorher.
    const check = kannBefehlen(state, flotte, ortVonPlanet(state, eigen));
    return {
      eigen,
      aktionen: [
        {
          typ: "anfliegen",
          art: "hafen",
          planetId: eigen.id,
          label: t("Anfliegen"),
          check,
          titel: check.ok ? t("Flotte hierher in den Hafen schicken") : check.grund,
        },
      ],
    };
  }
  if (!flotte) return { hinweis: "–" };
  // A-092 -- HIER hing Tobis Deuterium fest. Die Zeile sperrte den ganzen
  // Orbit, bevor irgendjemand fragte, WAS hier eigentlich liegt: seine Sonde
  // war an einem verschlossenen Vorkommen verglüht und hatte ihren Resttank
  // dort abgelegt. Verschlossen ist die QUELLE, nicht der eigene Nachlass --
  // liegt hier etwas, geht die Bergung, und `missionFuerObjekt` (dieselbe
  // Regel, eine Ebene tiefer) bietet dafür genau die Bergung an.
  if (gesperrt && !restLiegtAn(objekt)) return { gesperrt: true, hinweis: `${SYMBOLE.gesperrt} ${t("gesperrt")}` };

  // `!gesperrt` steht seitdem ausdrücklich da: bis A-092 kam dieser Zweig nur
  // an einem offenen Orbit vorbei, weil die Sperre eine Zeile höher abbrach.
  if (!gesperrt && objekt.entdeckt && objekt.typ === "planet" && objekt.daten.kolonisierbar) {
    const aussen = kannGruendungsmission(state, flotte, "aussenposten", systemId, objekt.orbit);
    const kolonie = kannGruendungsmission(state, flotte, "kolonie", systemId, objekt.orbit);
    return {
      aktionen: [
        {
          typ: "gruenden",
          art: "aussenposten",
          label: t("Außenposten"),
          check: aussen,
          titel: aussen.ok ? buendelText(AUSSENPOSTEN.kosten, { abgang: true }) : aussen.grund,
        },
        {
          typ: "gruenden",
          art: "kolonie",
          label: t("Kolonie"),
          check: kolonie,
          titel: kolonie.ok ? t("Verbraucht 1 Kolonieschiff") : kolonie.grund,
        },
      ],
    };
  }

  const art = missionFuerObjekt(state, objekt);
  if (!art) return { hinweis: objekt.verwertet ? t("erledigt") : "–" };

  const check = kannMission(state, flotte, art, systemId, objekt.orbit, rueckkehrGewaehlt);
  // A-020: Standard ist BLEIBEN. Der Rückflug ist eine Wahl beim Losschicken
  // — vorbelegt nur dort, wo der Rückweg der SINN der Mission ist (Bergung
  // bringt Beute heim). Alles andere kann genauso gut am Ziel stehen bleiben
  // und von dort weiterfliegen.
  //
  // Reicht der Treibstoff nur für den Hinflug, ist der Schalter gesperrt und
  // sagt im Titel, warum — der Knopf daneben bleibt trotzdem benutzbar
  // (Prinzip 10a: die teurere Wahl blockiert nicht die billigere).
  const rueckKlar = kannMission(state, flotte, art, systemId, objekt.orbit, true);
  // A-152: der Sonden-Knopf nennt die Zielkosten VOR dem Klick (Prinzip 10a) --
  // dieselbe Zahl, die missionBefehlen beim Start auch tankt (check.treibstoffZiel
  // kommt aus genau derselben Rechnung, s. kannMission, kein zweiter Rechenweg).
  const label =
    art === "sonde" && check.ok && check.treibstoffZiel !== undefined
      ? t("{label} · {sprit} Deuterium", { label: missionLabel(art), sprit: fmt(Math.ceil(check.treibstoffZiel)) })
      : missionLabel(art);
  return {
    aktionen: [{ typ: "mission", art, label, check, titel: check.ok ? "" : check.grund }],
    rueckkehr: {
      moeglich: rueckKlar.ok,
      vorbelegt: art === "bergung" && rueckKlar.ok,
      titel: rueckKlar.ok
        ? t("Fliegt nach der Mission zum Heimathafen zurück. Ohne Haken bleibt die Flotte am Ziel und kann von dort weiter.")
        : rueckKlar.grund,
    },
    rueckzug: art === "militaer",
  };
}

// Die Zeile in der Systemliste -- der erste Leser von `orbitAngebot`. HTML als
// Zeichenkette, weil der Aktionsbereich als Block verglichen und nur bei
// echter Änderung ausgetauscht wird (siehe slotZeileFuellen).
function slotAktion(state, systemId, objekt, gesperrt, eigen, flotte) {
  const angebot = orbitAngebot(state, systemId, objekt, flotte);
  if (angebot.hinweis) {
    const klasse = angebot.gesperrt ? "slot-hinweis gesperrt-text" : "slot-hinweis";
    return `<span class="${klasse}">${angebot.hinweis}</span>`;
  }

  // A-125 (Ursache, Vergleich seit A-130 auf dataset.stand umgestellt --
  // siehe slotZeileFuellen): der Vorgänger-Vergleich (`aktionen`-Element
  // gegen `aktionenHtml`) verglich diese Zeichenkette gegen das, was der
  // Browser beim AUSLESEN von innerHTML zurückgibt -- und der serialisiert
  // grundsätzlich anders, als hier
  // geschrieben wird. Drei Stellen, an denen die beiden Schreibweisen deshalb
  // NIE gleich werden konnten, der Vergleich also bei JEDEM Takt fehlschlug:
  //   1. Ein boolesches Attribut nur als nacktes Wort (`disabled`) statt mit
  //      `=""` -- der Browser serialisiert es immer mit `=""`.
  //   2. Ein leerer Platzhalter zwischen zwei feststehenden Leerzeichen
  //      (`${marke} ${… ? "" : "disabled"} title=…`) lässt bei "" ZWEI
  //      Leerzeichen stehen -- der Browser normalisiert auf eins.
  //   3. Der schließende Schrägstrich am `<input … />` (XHTML-Stil): ein
  //      Void-Element serialisiert ihn nicht zurück.
  // Der Wächter, der die Knöpfe eigentlich stehen lassen soll, ersetzte sie
  // dadurch JEDEN Sekundentakt neu -- ein frischer Knoten unterm Mauszeiger,
  // bevor der Tooltip ankommt (dieselbe Wirkung wie A-076, andere Ursache).
  // Betrifft jede Zeile mit einem Aktionsknopf ODER einem Rückkehr-Schalter --
  // praktisch jede Zeile mit Bergung oder Erkundung im Angebot.
  const knopf = (a) => {
    const marke =
      a.typ === "anfliegen"
        ? `data-anfliegen="${a.planetId}"`
        : a.typ === "gruenden"
        ? `data-gruenden="${objekt.orbit}" data-art="${a.art}"`
        : `data-mission="${objekt.orbit}" data-art="${a.art}"`;
    return `<button ${marke}${a.check.ok ? "" : ' disabled=""'} title="${a.titel}">${a.label}</button>`;
  };

  if (!angebot.rueckkehr) return angebot.aktionen.map(knopf).join("\n      ");

  const r = angebot.rueckkehr;
  const rueckSchalter =
    `<label class="dezent flotten-rueckkehr" title="${r.titel}">` +
    `<input type="checkbox" data-rueckkehr="${objekt.orbit}"${r.vorbelegt ? ' checked=""' : ""}` +
    `${r.moeglich ? "" : ' disabled=""'}> ${t("zurück")}</label>`;
  if (angebot.rueckzug) {
    return `
      <label class="dezent">${t("Rückzug unter")}
        <input type="number" min="0" max="100" step="5" value="${KAMPF.standardRueckzugsSchwelle * 100}" data-rueckzug="${objekt.orbit}" />%
      </label>
      ${rueckSchalter}
      ${angebot.aktionen.map(knopf).join("")}`;
  }
  return `${rueckSchalter}${angebot.aktionen.map(knopf).join("")}`;
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

// A-144: Die Notbremse für die Meldungen -- dieselbe Bauform wie der
// Statusspalten-Griff (griff.dataset.verdrahtet-Wächter, s.o.), weil die drei
// neuen Warteschlangen-Abschnitte darüber die Resthöhe der Meldungen drücken
// (KONZEPT-LAGER E10/E14). Anders als statusOffen liegt der Zustand im
// SPIELSTAND, nicht nur in der Sitzung -- state.meldungenZu, fehlt in alten
// Ständen und ist dann false (`|| false`-Muster wie state.logAlles), damit
// die Wahl einen Neustart überlebt.
let meldungenGriffVerdrahtet = false;

function meldungenGriffEinrichten(state, root) {
  if (meldungenGriffVerdrahtet) return;
  const knopf = root.querySelector("#meldungen-griff");
  if (!knopf) return;
  meldungenGriffVerdrahtet = true;
  knopf.addEventListener("click", () => {
    state.meldungenZu = !(state.meldungenZu || false);
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
  meldungenGriffEinrichten(state, root);
  const liste = root.querySelector("#meldungen-liste");
  const zu = state.meldungenZu || false;
  liste.classList.toggle("eingeklappt", zu);
  const griff = root.querySelector("#meldungen-griff");
  if (griff) {
    griff.textContent = zu ? "▸" : "▾";
    attributSetzen(
      griff,
      "title",
      zu ? t("Meldungen wieder einblenden.") : t("Meldungen wegklappen.")
    );
  }
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

  // PRINZIP 8a, seit A-040 auch hier: die Liste wurde bis v0.90 jede Sekunde
  // per innerHTML neu gebaut. Das war ausdrücklich in Ordnung, SOLANGE nichts
  // darin anklickbar war (so stand es in PRINZIPIEN.md). Mit dem
  // Neuigkeiten-Hinweis steckt jetzt ein Klickziel darin -- und ein Klick
  // entsteht nur, wenn mousedown und mouseup dasselbe Element treffen.
  //
  // Der stabile Schlüssel ist `nr` aus dem Spielstand (state.js). Die Position
  // taugt nicht: jede neue Meldung schiebt alle anderen nach unten, das
  // Element an Platz 3 meinte dann eine Sekunde später etwas anderes -- und
  // der Klick landete auf der falschen Meldung, was schlimmer ist als ein
  // verschluckter.
  //
  // Der leere Zustand läuft durch denselben Weg (ein Eintrag mit fester
  // Kennung) statt durch einen zweiten Zweig mit innerHTML: sonst wäre die
  // Liste bei jedem Wechsel zwischen leer und voll wieder ein Neubau.
  const leerText =
    state.meldungen.length === 0 ? t("Noch nichts entdeckt.") : t("Nichts, was dich betrifft.");
  const eintraege = sichtbar.length ? sichtbar : [{ nr: "leer", text: leerText, anzahl: 1, leer: true }];

  listeAbgleichen(liste, eintraege, {
    schluessel: (eintrag) => eintrag.nr,
    bauen: (eintrag) => {
      const li = document.createElement("li");
      if (eintrag.leer) li.className = "dezent";
      // Ereignis EINMAL beim Bauen, nie im Aktualisieren (Lernpunkt 1 zu 8a).
      // Das Ziel gehört der Meldung und ändert sich nie -- ein hier
      // eingefangener Bezug kann also nicht veralten (Lernpunkt 4).
      if (eintrag.ziel) {
        li.className = "meldung-klickbar";
        li.setAttribute("role", "button");
        li.tabIndex = 0;
        const hin = () => bereichOeffnen(state, root, eintrag.ziel);
        li.addEventListener("click", hin);
        li.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            hin();
          }
        });
      }
      return li;
    },
    aktualisieren: (li, eintrag) => {
      // Der Meldungstext selbst wurde bereits beim Entstehen übersetzt und
      // liegt so im Spielstand -- eine Meldung von gestern bleibt in ihrer
      // Sprache stehen, wie ein Logbucheintrag. Nur der Zähler drumherum ist
      // Anzeige.
      // A-083: Der Zusatz nennt die Zahl UND wann es zuletzt so war. Ohne die
      // Zeit ist "+49.233 weitere" eine Zahl ohne Bezug -- man weiß nicht, ob
      // das Ereignis noch läuft oder vor drei Spieljahren aufgehört hat.
      // Alte Stände haben kein `zeit` am Eintrag; dann bleibt es beim reinen
      // Zähler.
      const wann = eintrag.zeit ? spielDatum(state, eintrag.zeit) : null;
      textSetzen(
        li,
        eintrag.anzahl > 1
          ? wann
            ? t("{text}  (+{anzahl} weitere, zuletzt Jahr {jahr}, Tag {tag})", {
                text: eintrag.text,
                anzahl: eintrag.anzahl - 1,
                jahr: wann.jahr,
                tag: wann.tag,
              })
            : t("{text}  (+{anzahl} weitere)", { text: eintrag.text, anzahl: eintrag.anzahl - 1 })
          : eintrag.text
      );
      attributSetzen(
        li,
        "title",
        eintrag.anzahl > 1
          ? t("{anzahl} gleichartige Meldungen zusammengefasst", { anzahl: eintrag.anzahl })
          : eintrag.ziel
            ? t("Öffnet das Handbuch")
            : null
      );
    },
  });
}

// Einen Bereich öffnen und dort an eine bestimmte Stelle springen (A-040).
//
// Der Bereichswechsel läuft über denselben Schalter wie die Navigation
// (`aktiverBereich`) -- kein zweiter Mechanismus fürs Bereichswechseln
// (Prinzip 5), dieselbe Begründung wie beim Handbuch-Knopf im Erklärfenster.
//
// Das Scrollen kommt NACH dem Zeichnen: vorher ist der Abschnitt noch
// `hidden`, hat keine Maße, und scrollIntoView tut folgenlos nichts.
function bereichOeffnen(state, root, ziel) {
  aktiverBereich = ziel.bereich;
  render(state, root);
  if (!ziel.anker) return;
  // A-054: die Sprungmarke trägt den Bereichsnamen als Vorsilbe, nicht mehr
  // fest „handbuch-". Seit es zwei Bereiche mit Ankern gibt (Handbuch und
  // Development), wäre eine feste Vorsilbe der Grund, warum genau der neue
  // Sprung ins Leere geht.
  const marke = root.querySelector(`#${ziel.bereich}-${ziel.anker}`);
  if (marke && marke.scrollIntoView) marke.scrollIntoView({ block: "start" });
}

// --- Der Notausgang (A-046) ----------------------------------------------
//
// Erscheint VOR der Aufholung, wenn die letzte nie fertig wurde. Bewusst eine
// eigene, kleine Funktion statt eines Zweigs in `render`: sie läuft genau
// einmal, vor dem ersten Bild, und muss ihre Antwort ABWARTEN -- render()
// wartet auf nichts.
//
// Der Ton ist mit Absicht harmlos. Ein `beforeunload` mitten in einer ganz
// normalen langen Aufholung lässt den Marker völlig zu Recht stehen; wer dann
// „Fehler!" liest, sucht einen, den es nicht gibt (Falle 2 des Auftrags).
export function notausgangTafel(root, zaehler, eskalationAb) {
  return new Promise((fertig) => {
    const el = root.querySelector("#erstklaerung");
    if (!el) return fertig("erneut");
    // Wer mehrfach hintereinander hängt, will raus und nicht ein weiteres Mal
    // dasselbe versuchen. Die Empfehlung dreht sich, die Wahl bleibt.
    const raus = zaehler >= eskalationAb;
    el.hidden = false;
    el.innerHTML = `
      <div class="erstklaerung-tafel">
        <h2>${t("Die letzte Zeitaufholung kam nicht durch")}</h2>
        <p>${t("Beim letzten Mal hat das Nachrechnen der vergangenen Zeit nicht bis zum Ende gereicht. Dein Spielstand ist unversehrt – offen ist nur die Strecke, die noch zu rechnen wäre.")}</p>
        ${raus ? `<p>${t("Das ist jetzt der {zahl}. Versuch in Folge. Verwerfen ist der Weg, der sicher hinausführt.", { zahl: zaehler })}</p>` : ""}
        <p class="dezent">${t("Verwerfen wirft nichts von deiner Welt weg – nur die noch nicht gerechnete Zeit.")}</p>
        <div class="erstklaerung-knoepfe">
          <button data-not="erneut" class="${raus ? "zweitrangig" : ""}">${t("Erneut versuchen")}</button>
          <button data-not="verwerfen" class="${raus ? "" : "zweitrangig"}">${t("Zeitsprung verwerfen und weiterspielen")}</button>
        </div>
      </div>`;
    // Ereignisse EINMAL, und die Tafel verschwindet mit der Antwort -- sie ist
    // eine Frage, kein Zustand.
    el.querySelectorAll("button[data-not]").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.hidden = true;
        el.innerHTML = "";
        delete el.dataset.gezeichnet;
        fertig(btn.dataset.not);
      });
    });
  });
}


// --- Der Spielstand-Abschnitt im Development-Bereich (A-073) --------------
//
// Ein Tester hat seinen Stand nach einem PC-Neustart verloren (Firefox,
// 18.08.). localStorage gehört dem Browser: „Chronik beim Schließen löschen",
// Privatmodus und Speicherdruck räumen ihn ab, ohne zu fragen. Kein
// Speicherkode im Spiel kann das verhindern -- nur eine Kopie beim Spieler.
//
// DIE GRUNDLÖSUNG IST EIN TEXTFELD, nicht der Datei-Download. Text kann
// jeder kopieren, in eine Mail legen, in ein Dokument werfen -- auch dort,
// wo Downloads gesperrt oder umständlich sind. Der Download daneben ist
// Bequemlichkeit.
//
// GEBAUT WIRD EINMAL je Sprache, wie der ganze Bereich (Prinzip 8a): ein
// Feld, das im Sekundentakt neu entstünde, verlöre den eingefügten Text
// zwischen zwei Takten -- und zwar genau dann, wenn er am wichtigsten ist.
function spielstandAbschnitt(state, titel, absatz) {
  const knoten = [];
  knoten.push(titel(t("Spielstand"), "spielstand"));
  knoten.push(
    absatz(
      t(
        "Dein Spielstand liegt im Speicher deines Browsers – und der gehört dem Browser, nicht dir: „Chronik beim Schließen löschen“, Privatmodus oder knapper Speicherplatz können ihn jederzeit entfernen. Hier holst du ihn als Text heraus und legst ihn ab, wo er dir gehört."
      )
    )
  );
  knoten.push(
    absatz(
      t(
        "Einspielen ersetzt die laufende Partie. Der bisherige Stand wandert dabei in die Rettungs-Sicherung des Browsers – aber verlass dich nicht darauf, hol ihn dir vorher heraus."
      )
    )
  );

  const feld = document.createElement("textarea");
  feld.className = "spielstand-feld";
  feld.rows = 6;
  feld.spellcheck = false;
  feld.placeholder = t("Hier erscheint dein Spielstand – oder füge hier einen ein, den du zurückholen willst.");

  const meldung = document.createElement("p");
  meldung.className = "dezent spielstand-meldung";
  const sagen = (text, warnung = false) => {
    meldung.textContent = text;
    meldung.classList.toggle("warnung", warnung);
  };

  const knopf = (text, fn) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.addEventListener("click", fn);
    return b;
  };

  const reihe = document.createElement("div");
  reihe.className = "spielstand-knoepfe";

  reihe.appendChild(
    knopf(t("Stand anzeigen"), () => {
      feld.value = standAlsText(state);
      feld.focus();
      feld.select();
      sagen(t("Der Stand steht im Feld und ist markiert – mit Strg+C kopieren und ablegen."));
    })
  );

  reihe.appendChild(
    knopf(t("Als Datei speichern"), () => {
      const url = URL.createObjectURL(new Blob([standAlsText(state)], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = standDateiname(state);
      // IN DAS DOKUMENT HÄNGEN und wieder heraus: ein losgelöster Anker wird
      // nicht in jedem Browser geklickt, und Tobis Umgebung ist Firefox.
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Nicht sofort freigeben -- manche Browser brechen den laufenden
      // Download ab, wenn die Adresse noch im selben Takt verschwindet.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      sagen(t("Gespeichert als {datei}.", { datei: a.download }));
    })
  );

  reihe.appendChild(
    knopf(t("Einspielen"), () => {
      // ERST PRÜFEN, DANN FRAGEN. Andersherum bekäme jemand, der versehentlich
      // einen Einkaufszettel einfügt, zuerst die Warnung „deine Partie wird
      // ersetzt" -- für einen Text, der ohnehin abgewiesen wird. Die Prüfung
      // läuft dadurch zweimal (`standUebernehmen` prüft selbst, und das muss
      // es auch: es ist die Stelle, die schreibt).
      const geprueft = standPruefen(feld.value);
      if (!geprueft.ok) {
        sagen(geprueft.text, true);
        return;
      }
      if (!confirm(t("Diesen Stand einspielen? Die laufende Partie wird dabei ersetzt."))) return;
      const ergebnis = standUebernehmen(feld.value);
      if (!ergebnis.ok) {
        sagen(ergebnis.text, true);
        return;
      }
      // Neu laden statt den laufenden Zustand auszutauschen: dieselbe
      // Entscheidung wie beim Zurücksetzen. Ein Spiel, das seinen State
      // mitten im Betrieb gegen einen fremden tauscht, hat danach überall
      // alte Verweise -- Flottenauswahl, Kartenmarken, offene Panels.
      location.reload();
    })
  );

  knoten.push(reihe, feld, meldung);
  return knoten;
}

// --- Der Development-Bereich (A-054) --------------------------------------
//
// Tobis Ansage: die Tester-Dev-Interaktion bekommt einen eigenen Ort, „sonst
// kriegen wir altes Feedback oder Feedback, an dem wir schon arbeiten".
// Drei Abschnitte in fester Reihenfolge: was war, was kommt, wie man sich
// meldet.
//
// GEBAUT WIRD EINMAL, nicht im Sekundentakt. Der Vergleich mit `sprache()`
// ist derselbe Wächter wie im Handbuch: neu gezeichnet wird nur, wenn sich
// die Sprache ändert. 45 Versionen Text jede Sekunde neu zusammenzusetzen
// wäre die teuerste Art, nichts zu ändern.
export function renderDevelopment(state, root) {
  const block = root.querySelector("#development-block");
  if (!block || block.dataset.gezeichnet === sprache()) return;
  block.dataset.gezeichnet = sprache();

  // Welche Sprache gilt gerade? Die Daten tragen beide selbst, statt durch
  // t() zu laufen -- deshalb hier die einzige Stelle, die wählt.
  const de = sprache() === "de";
  const knoten = [];

  const titel = (text, id) => {
    const h3 = document.createElement("h3");
    h3.textContent = text;
    // Sprungmarke, damit eine Meldung direkt hierher führen kann (A-040).
    if (id) h3.id = `development-${id}`;
    return h3;
  };
  const absatz = (text) => {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  };

  // --- Sprungnavigation (A-160) --------------------------------------------
  // Tobis Regel: „nie irgendwas ganz am Ende von einem ewigen Text
  // platzieren, was irgendjemand finden soll" -- die Reihenfolge unten trägt
  // das einmal, die Navigation trägt es dauerhaft, auch wenn der Bereich
  // weiter wächst. Springt auf dieselben Marken, die A-040 bereits vergibt
  // (`development-<id>`) -- echte Anker, kein Klick-Handler nötig, dieselbe
  // Seite.
  const sprungnav = document.createElement("nav");
  sprungnav.className = "development-sprungnav";
  sprungnav.setAttribute("aria-label", t("Development"));
  const sprungziele = [
    ["feedback", t("Feedback")],
    ["roadmap", t("Roadmap")],
    ["patchnotes", t("Patchnotes")],
    ["spielstand", t("Spielstand")],
  ];
  sprungziele.forEach(([id, text], i) => {
    if (i > 0) sprungnav.appendChild(document.createTextNode(" · "));
    const a = document.createElement("a");
    a.href = `#development-${id}`;
    a.textContent = text;
    sprungnav.appendChild(a);
  });
  knoten.push(sprungnav);

  // --- Feedback -------------------------------------------------------------
  // Zuerst: der einzige Grund, warum ein Tester diesen Bereich überhaupt
  // aufsucht, soll ohne Scrollen sichtbar sein (A-160, Tobis Ansage).
  knoten.push(titel(t("Feedback"), "feedback"));
  knoten.push(
    absatz(
      t(
        "Was dir auffällt, gehört hierher – auch Kleinigkeiten, auch „das habe ich nicht verstanden“. Versionsnummer und Browser trägt das Formular selbst ein; bitte stehen lassen, ohne sie ist eine Meldung schwer einzuordnen."
      )
    )
  );
  const p = document.createElement("p");
  p.appendChild(externerLink(feedbackAdresse(), t("Rückmeldung schreiben")));
  knoten.push(p);

  // --- Roadmap --------------------------------------------------------------
  // Vor den Patchnotes: „steht dein Fund hier, ist er bekannt" beantwortet
  // genau die Frage, die vor dem Melden ansteht.
  knoten.push(titel(t("Roadmap"), "roadmap"));
  knoten.push(
    absatz(
      t(
        "Was auf dem Plan steht. Grob und ohne Datum – eine Demo, die Termine verspricht, hat schon verloren. Steht dein Fund hier, ist er bekannt."
      )
    )
  );
  for (const gruppe of ROADMAP_PUNKTE) {
    const h4 = document.createElement("h4");
    h4.textContent = de ? gruppe.de : gruppe.en;
    const ul = document.createElement("ul");
    for (const punkt of gruppe.punkte) {
      const li = document.createElement("li");
      li.textContent = de ? punkt.de : punkt.en;
      ul.appendChild(li);
    }
    knoten.push(h4, ul);
  }

  // --- Patchnotes -------------------------------------------------------------
  // Nachschlagewerk, kein Einstieg -- deshalb zuletzt vor dem Spielstand.
  knoten.push(titel(t("Patchnotes"), "patchnotes"));
  knoten.push(
    absatz(
      t(
        "Was sich seit der ersten veröffentlichten Fassung geändert hat, neueste zuoberst. Was hier steht, ist da – wenn es bei dir anders aussieht, ist das eine Meldung wert."
      )
    )
  );
  for (const eintrag of PATCHNOTES) {
    const h4 = document.createElement("h4");
    h4.textContent = `v${eintrag.version}`;
    const ul = document.createElement("ul");
    for (const punkt of de ? eintrag.de : eintrag.en) {
      const li = document.createElement("li");
      li.textContent = punkt;
      ul.appendChild(li);
    }
    knoten.push(h4, ul);
  }

  // --- Spielstand ---------------------------------------------------------
  knoten.push(...spielstandAbschnitt(state, titel, absatz));

  block.replaceChildren(...knoten);
}
