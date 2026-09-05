// Systemgenerierung.
//
// Grundsatz 1: Die Welt existiert, bevor der Spieler sie sieht. Erkundung
// würfelt nichts aus, sie deckt auf.
// Grundsatz 2: Entdecken und Verwerten sind getrennt. Manche Objekte sieht
// man, kommt aber ohne Schlüsseltechnologie nicht heran.
// Grundsatz 3: Systeme sind nicht gerastert -- Größe und Zusammensetzung
// werden aus Bereichen und Wahrscheinlichkeiten gezogen (SYSTEM_REGELN).
// Grundsatz 4: Welche Schlüssel ein System hergibt, entscheidet die Galaxie
// (js/galaxie.js), nicht das System selbst. Ketten laufen daher über
// Systemgrenzen hinweg.
//
// Kreisfreiheit kommt aus der Ordnung: eine Anomalie, die Technologie T
// vergibt, darf nur hinter einer Technologie STRENG niedrigerer Tiefenstufe
// liegen. Das gilt unabhängig davon, in welchem System welcher Teil liegt.

import {
  SYSTEM_REGELN,
  VORKOMMEN_TABELLE,
  ENTDECKBARE_FORSCHUNGEN,
  orbitZone,
  PLANETEN_KLASSEN,
  radiusAusMasse,
  ANTIMATERIE_ERNTE,
  schwerkraftAus,
  planetName,
  taugtAlsStartwelt,
  STARTWELT,
  STARTSCHWIERIGKEIT,
  STARTSCHWIERIGKEIT_VORGABE,
  techStufe,
  mengeSkaliert,
} from "./data.js?v=0.9.1";
import { stromFuer, waehle, zwischen, mischen, gewichtetWaehlen } from "./zufall.js?v=0.9.1";
import { sternFuer } from "./galaxie.js?v=0.9.1";

// Systeme können bis zu 50 Orbits haben -- römische Zahlen daher berechnen
// statt aus einer Tabelle nehmen.
const ROEMISCH_PAARE = [
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function roemisch(zahl) {
  let rest = zahl;
  let out = "";
  for (const [wert, zeichen] of ROEMISCH_PAARE) {
    while (rest >= wert) {
      out += zeichen;
      rest -= wert;
    }
  }
  return out;
}

// Zieht die drei Eigenschaften eines Planeten passend zum Sternabstand:
// Massenklasse, Zone und Wasservorrat. Der sichtbare Name wird daraus
// abgeleitet (planetName), nicht gewürfelt -- eine Wüstenwelt und eine
// Ozeanwelt sind dieselbe Klasse mit unterschiedlichem Wasserstand.
//
// Die Gewichte stehen als Tabelle in data.js (ORBIT_ZONEN); hier steht nur,
// wie gezogen wird, damit Inhalt und Mechanik getrennt bleiben.
function zieheGewichtet(rng, gewichte) {
  const tabelle = Object.entries(gewichte)
    .filter(([, gewicht]) => gewicht > 0)
    .map(([wert, gewicht]) => ({ wert, gewicht }));
  return gewichtetWaehlen(rng, tabelle).wert;
}

export function planetEigenschaften(rng, orbit, orbitAnzahl, leuchtkraft = 1) {
  const zone = orbitZone(orbit, orbitAnzahl, leuchtkraft);
  return {
    klasse: zieheGewichtet(rng, zone.klassen),
    zone: zone.name,
    wasser: zieheGewichtet(rng, zone.wasser),
  };
}

// Alle Namen, die planetName() erzeugen kann. Seit v0.24 ist das KEINE
// Auswahlliste mehr, sondern das Ergebnis der drei Achsen -- die Liste steht
// hier nur noch, damit der Übersetzungstest sie prüfen kann.
const PLANETEN_ARTEN = [
  // aus Klasse + Zone + Wasser abgeleitet (Welten mit Oberfläche)
  "Felsplanet", "Wüstenwelt", "Ozeanwelt", "Eiswelt", "Lavawelt", "Kleinwelt",
  // Klassen ohne Oberfläche tragen ihren Klassennamen
  "Mini-Neptun", "Eisriese", "Gasriese",
];
const WRACK_ARTEN = [
  "Havarierter Frachter", "Ausgebranntes Kolonieschiff",
  "Zerschossener Geleitkreuzer", "Treibende Bergungsplattform",
];
const ANOMALIE_ARTEN = [
  "Fremdartige Signalboje", "Verlassene Forschungsstation",
  "Kristalline Struktur unbekannten Ursprungs", "Stillgelegter Sondenschwarm",
];
const STRUKTUR_ARTEN = [
  "Versiegelter Monolith", "Fremdartiger Resonanzkörper", "Verschlossene Artefaktkammer",
];
const GEFAHR_ARTEN = [
  "Piratenaußenposten", "Dichtes Trümmerfeld",
  "Instabile Strahlungszone", "Automatisierte Abwehrdrohnen",
];
// Bezeichnungen, die nicht aus einer der Listen oben stammen.
const SONSTIGE_ARTEN = ["Heimatwelt", "Tiefliegendes Vorkommen", "Asteroidengürtel", "Leerer Orbit"];

// Alle Bezeichnungen, die die Weltgenerierung in einen Spielstand schreibt.
//
// Hier steht KEIN t(): wie in data.js ist der deutsche Text an dieser Stelle
// Daten, nicht Anzeigetext. Er landet als objekt.bezeichnung im Spielstand und
// wäre sonst für immer in der Sprache eingefroren, in der die Welt erzeugt
// wurde. Übersetzt wird an den anzeigenden Stellen.
//
// Diese Liste ist der Ersatz für den Quelltext-Scan: tests/sprache.test.js
// prüft über sie, dass jede Bezeichnung eine englische Fassung hat.
export const BEZEICHNUNGEN = [
  ...PLANETEN_ARTEN,
  ...WRACK_ARTEN,
  ...ANOMALIE_ARTEN,
  ...STRUKTUR_ARTEN,
  ...GEFAHR_ARTEN,
  ...SONSTIGE_ARTEN,
];

function ausBereich(rng, bereich) {
  const n = zwischen(rng, bereich.min, bereich.max);
  return bereich.hartesMax ? Math.min(n, bereich.hartesMax) : n;
}

function orbitName(systemId, orbit) {
  return `${systemId}-${roemisch(orbit)}`;
}

function neuesObjekt(systemId, orbit, felder) {
  return Object.assign(
    {
      orbit,
      name: orbitName(systemId, orbit),
      entdeckt: false,
      verwertet: false,
      gefahr: false,
      benoetigt: null,
      daten: {},
    },
    felder
  );
}

/**
 * Erzeugt ein System.
 * @param seed        Galaxie-Saat
 * @param systemId    Systemnummer
 * @param optionen    { schluessel: [techId...], istHeimat, heimatName,
 *                      schwierigkeit } -- `schwierigkeit` (A-190) wirkt nur,
 *                      wenn istHeimat gesetzt ist; siehe STARTSCHWIERIGKEIT.
 */
// Wo im System liegt die Heimatwelt? Bis v0.42 war das schlicht der mittlere
// Drittelbereich der Orbits -- eine Faustregel, die meistens in der
// bewohnbaren Zone landete und manchmal eben nicht.
//
// Seit A-190 zielt die Wahl auf EINE feste Zone -- die, die die gewählte
// Startschwierigkeit vorschreibt (STARTSCHWIERIGKEIT in data.js). Zone
// "äußer" ist NIE ein Ziel und kommt in dieser Tabelle deshalb gar nicht vor:
// rund 28 % der so erzeugten Startwelten waren nachweislich unspielbar
// (Energiedeckung 0 % zur Halbzeit, kein Schirm möglich -- gemessen über 18
// Welten mit tests/arena.mjs). Tobis Satz dazu ist wörtlich und ohne
// Ermessensspielraum: „Wenn es wirklich unmöglich gibt schließen wir diese
// komplett aus."
function heimatOrbitWaehlen(rng, orbitAnzahl, leuchtkraft, zielZone) {
  const passend = [];
  for (let orbit = 1; orbit <= orbitAnzahl; orbit++) {
    if (orbitZone(orbit, orbitAnzahl, leuchtkraft).name === zielZone) passend.push(orbit);
  }
  if (passend.length) return waehle(rng, passend);
  // Die Zielzone kommt in diesem System gar nicht vor (sehr leuchtschwacher
  // oder sehr heller Stern verschiebt die thermische Lage). Dieselbe
  // Faustregel wie vor A-190 -- aber NIE Zone äußer: ausgerechnet ein sehr
  // leuchtschwacher Stern schiebt dieselbe Orbit-Position genau dorthin.
  // `heimatEigenschaften` sichert die Bewohnbarkeit danach über ihre eigenen
  // Eigenschaften ab, notfalls mit ihrem eigenen Notnagel.
  for (let versuch = 0; versuch < 20; versuch++) {
    const orbit = zwischen(rng, Math.max(1, Math.floor(orbitAnzahl * 0.3)), Math.ceil(orbitAnzahl * 0.7));
    if (orbitZone(orbit, orbitAnzahl, leuchtkraft).name !== "äußer") return orbit;
  }
  return Math.max(1, Math.floor(orbitAnzahl * 0.3));
}

// Die Heimatwelt ist ein PLANET wie jeder andere -- mit Klasse, Zone und
// Wasser. Bis v0.42 wurde sie ohne diese Eigenschaften angelegt und war damit
// stiller Generalist: affinitaetFaktor liefert für einen fehlenden Eintrag 1,
// also konnte sie alles gleich gut. Fremde Imperien trugen dagegen die echte
// Klasse ihres Planeten samt echter Nullen und spielten dadurch ein anderes,
// härteres Spiel als der Spieler.
//
// Gezogen wird so lange, bis die Kombination als Startwelt taugt. Das ist
// bewusst eine BEDINGTE Ziehung und keine feste Vorgabe: Klasse und
// Wasserstand variieren weiterhin, nur eben innerhalb dessen, was bewohnbar
// ist. `node tests/welten.mjs` misst über diese Menge eine Ertragsspanne von
// 1,06× -- die Welten unterscheiden sich also darin, WAS sie gut können, nicht
// darin, wie schnell man vorankommt.
// Die Masse der Heimatwelt, eingegrenzt auf das Schwerkraftband aus
// STARTWELT. Das ist die Stellschraube, an der der Schwierigkeitsgrad
// tatsächlich hängt (Korrelation −0,88, siehe taugtAlsStartwelt) -- alles
// andere an einer Welt bestimmt ihren Charakter, nicht ihr Tempo.
//
// Gezogen wird aus dem Schnitt von Klassenbereich und Band, damit die Masse
// weiterhin variiert. Liegt die Klasse ganz außerhalb (eine Supererde ist
// nie leicht genug), wird der nächstgelegene Rand genommen -- die Klasse
// selbst hat heimatEigenschaften vorher schon als bewohnbar bestätigt.
function heimatMasse(rng, klasse) {
  // g = M^0.46 (Radius folgt der Masse) -- nach M aufgelöst gibt das die
  // Massengrenzen, die zum Schwerkraftband gehören.
  const masseFuer = (g) => Math.pow(g, 1 / 0.46);
  const unten = Math.max(klasse.masse[0], masseFuer(STARTWELT.schwerkraftMin));
  const oben = Math.min(klasse.masse[1], masseFuer(STARTWELT.schwerkraftMax));
  if (unten > oben) return Math.min(klasse.masse[1], Math.max(klasse.masse[0], masseFuer(1)));
  return unten + rng() * (oben - unten);
}

// Seit A-190 stehen Zone UND Wasser fest -- `zielWasser` kommt von der
// gewählten Startschwierigkeit, die Zone steckt schon im übergebenen Orbit
// (heimatOrbitWaehlen hat ihn danach ausgesucht). Nur die KLASSE variiert
// noch, gezogen aus der Gewichtstabelle der Zone, bis eine Kombination sowohl
// nahrungstauglich (taugtAlsStartwelt) als auch im Schwerkraftband liegt.
function heimatEigenschaften(rng, orbit, orbitAnzahl, leuchtkraft, zielWasser) {
  // Kann diese Klasse überhaupt eine Masse im Schwerkraftband haben? Eine
  // Supererde ist auch am unteren Rand ihres Bereichs noch zu schwer.
  const masseFuer = (g) => Math.pow(g, 1 / 0.46);
  const bandTauglich = (klasseId) => {
    const k = PLANETEN_KLASSEN[klasseId];
    return k.masse[0] <= masseFuer(STARTWELT.schwerkraftMax) && k.masse[1] >= masseFuer(STARTWELT.schwerkraftMin);
  };
  const zone = orbitZone(orbit, orbitAnzahl, leuchtkraft);

  for (let versuch = 0; versuch < 25; versuch++) {
    const klasse = zieheGewichtet(rng, zone.klassen);
    const eig = { klasse, zone: zone.name, wasser: zielWasser };
    if (taugtAlsStartwelt(eig) && bandTauglich(klasse)) return eig;
  }
  // Notnagel für den Fall, dass die Zone (oder, im seltenen Fall aus
  // heimatOrbitWaehlens eigenem Notnagel, eine ganz andere Zone) gar nichts
  // Bewohnbares zulässt. Lieber eine bescheidene Welt als eine, auf der man
  // verhungert -- zufällig dieselbe Kombination wie die Stufe "Normal".
  return { klasse: "felswelt", zone: "habitabel", wasser: "maessig" };
}

export function systemGenerieren(seed, systemId, optionen = {}) {
  const { schluessel = [], istHeimat = false, heimatName = "Heimatwelt", schwierigkeit = STARTSCHWIERIGKEIT_VORGABE } = optionen;
  const rng = stromFuer(seed, systemId);

  // Der Stern kommt aus einem eigenen Zufallsstrom (galaxie.js) und wird nicht
  // aus `rng` gezogen. Sonst hätte das Hinzufügen der Sterne jede bestehende
  // Welt neu gewürfelt -- eine Weltgenerierung darf sich nicht verschieben,
  // nur weil eine neue Eigenschaft dazukommt.
  const stern = sternFuer(seed, systemId, istHeimat);

  // A-190: eine unbekannte Stufe (z.B. aus einem älteren Aufruf) fällt auf
  // Normal zurück, statt mit `undefined.zone` zu werfen.
  const ziel = STARTSCHWIERIGKEIT[schwierigkeit] || STARTSCHWIERIGKEIT[STARTSCHWIERIGKEIT_VORGABE];

  const orbitAnzahl = ausBereich(rng, SYSTEM_REGELN.orbits);
  const heimatOrbit = istHeimat ? heimatOrbitWaehlen(rng, orbitAnzahl, stern.leuchtkraft, ziel.zone) : null;

  const freieOrbits = mischen(
    rng,
    Array.from({ length: orbitAnzahl }, (_, i) => i + 1).filter((o) => o !== heimatOrbit)
  );

  const objekte = [];
  if (istHeimat) {
    // Die Heimatwelt bekommt dieselben drei Eigenschaften wie jeder andere
    // Planet -- nur eingeschränkt auf das, was bewohnbar ist. Ohne diese Daten
    // war sie ein Generalist, der alles gleich gut konnte (siehe
    // heimatEigenschaften).
    const eig = heimatEigenschaften(rng, heimatOrbit, orbitAnzahl, stern.leuchtkraft, ziel.wasser);
    const klasse = PLANETEN_KLASSEN[eig.klasse];
    const masse = heimatMasse(rng, klasse);
    const radius = radiusAusMasse(masse);
    objekte.push(
      neuesObjekt(systemId, heimatOrbit, {
        typ: "heimat",
        bezeichnung: heimatName,
        entdeckt: true,
        daten: {
          ...eig,
          kolonisierbar: true,
          schwerkraft: Math.round(schwerkraftAus(masse, radius) * 100) / 100,
          masse: Math.round(masse * 100) / 100,
          groesse: Math.round(radius * 100),
        },
      })
    );
  }

  let budget = Math.min(SYSTEM_REGELN.maxObjekte, freieOrbits.length) - (istHeimat ? 1 : 0);
  const nimmOrbit = () => (budget-- > 0 ? freieOrbits.pop() : null);

  // --- Anomalien: vergeben die Schlüssel, die die Galaxie hier vorsieht ----
  // Ein Schloss davor darf nur eine Technologie STRENG niedrigerer Stufe
  // sein -- egal, in welchem System diese zu finden ist.
  const sortierteSchluessel = [...schluessel].sort((a, b) => techStufe(a) - techStufe(b));

  for (const techId of sortierteSchluessel) {
    const orbit = nimmOrbit();
    if (!orbit) break;

    const stufe = techStufe(techId);
    const moeglicheSchloesser = ENTDECKBARE_FORSCHUNGEN.filter((t) => techStufe(t) < stufe);
    const gesperrt = moeglicheSchloesser.length > 0 && rng() < 0.5;

    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "anomalie",
        bezeichnung: waehle(rng, ANOMALIE_ARTEN),
        benoetigt: gesperrt ? { forschung: waehle(rng, moeglicheSchloesser) } : null,
        daten: { forschung: techId },
      })
    );
  }

  // Zugabe: Anomalien ohne neue Technologie (geben Material).
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.anomalieExtra); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    objekte.push(
      neuesObjekt(systemId, orbit, { typ: "anomalie", bezeichnung: waehle(rng, ANOMALIE_ARTEN), daten: {} })
    );
  }

  // Schlösser vor reinen Beute-Objekten dürfen jede Technologie verlangen --
  // sie vergeben selbst keine Schlüssel, können also keinen Kreis bilden.
  const vielleichtGesperrt = () =>
    rng() < SYSTEM_REGELN.anteilGesperrt
      ? { forschung: waehle(rng, ENTDECKBARE_FORSCHUNGEN) }
      : null;

  // --- Planeten -----------------------------------------------------------
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.planet); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    // Drei Eigenschaften statt einer Art aus einer Liste. Der Name ist das
    // Ergebnis, nicht die Grundlage.
    const eig = planetEigenschaften(rng, orbit, orbitAnzahl, stern.leuchtkraft);
    const klasse = PLANETEN_KLASSEN[eig.klasse];
    // Masse aus dem Bereich der Klasse ziehen, Radius daraus ableiten,
    // Schwerkraft aus beidem rechnen. Dadurch hat jeder Planet seine eigene
    // Schwerkraft statt eines festen Klassenwerts -- und `groesse` ist keine
    // tote Zahl mehr, sondern der Radius in Hundertsteln Erdradien.
    // Welten ohne Boden behalten den Klassenwert: dort landet ohnehin niemand.
    const masse = klasse.masse[0] + rng() * (klasse.masse[1] - klasse.masse[0]);
    const radius = radiusAusMasse(masse);
    const schwerkraft = klasse.oberflaeche
      ? Math.round(schwerkraftAus(masse, radius) * 100) / 100
      : klasse.schwerkraft;
    const antimaterieVorrat = mengeSkaliert(ANTIMATERIE_ERNTE.vorrat[eig.klasse] || 0);
    // Besiedelbar heißt: es gibt festen Boden. Eine Kleinwelt ohne haltbare
    // Atmosphäre ist besiedelbar (Kuppeln), aber nie terraformbar -- das sind
    // zwei verschiedene Fragen.
    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "planet",
        bezeichnung: planetName(eig),
        // Riesenplaneten tragen einen Antimaterie-Gürtel. Er ist nicht
        // erschöpfbar, sondern wächst nach -- siehe ANTIMATERIE_ERNTE.
        benoetigt: antimaterieVorrat ? { forschung: ANTIMATERIE_ERNTE.benoetigt } : null,
        nachwachsend: antimaterieVorrat ? true : false,
        daten: {
          ...eig,
          ...(antimaterieVorrat ? { ertrag: { antimaterie: antimaterieVorrat } } : {}),
          kolonisierbar: klasse.oberflaeche && rng() < SYSTEM_REGELN.planetBesiedelbar,
          schwerkraft,
          masse: Math.round(masse * 100) / 100,
          // Radius in Hundertsteln Erdradien -- derselbe Zahlenbereich wie die
          // frühere bedeutungslose "groesse", jetzt mit physikalischem Inhalt.
          groesse: Math.round(radius * 100),
        },
      })
    );
  }

  // --- Vorkommen ----------------------------------------------------------
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.asteroiden); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    const eintrag = gewichtetWaehlen(rng, VORKOMMEN_TABELLE);
    const sperre = vielleichtGesperrt();
    const menge = zwischen(rng, eintrag.menge.min, eintrag.menge.max) * (sperre ? 2.5 : 1);
    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "asteroiden",
        bezeichnung: sperre ? "Tiefliegendes Vorkommen" : "Asteroidengürtel",
        benoetigt: sperre,
        daten: { ertrag: { [eintrag.ressource]: Math.round(menge) } },
      })
    );
  }

  // --- Wracks -------------------------------------------------------------
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.wrack); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "wrack",
        bezeichnung: waehle(rng, WRACK_ARTEN),
        daten: { ertrag: { metall: mengeSkaliert(zwischen(rng, 300, 1200)), silizium: mengeSkaliert(zwischen(rng, 150, 700)) } },
      })
    );
  }

  // --- Strukturen (immer verschlossen) ------------------------------------
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.struktur); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "struktur",
        bezeichnung: waehle(rng, STRUKTUR_ARTEN),
        benoetigt: { forschung: waehle(rng, ENTDECKBARE_FORSCHUNGEN) },
        daten: {
          ertrag: { metall: mengeSkaliert(zwischen(rng, 1500, 4000)), silizium: mengeSkaliert(zwischen(rng, 1200, 3000)) },
        },
      })
    );
  }

  // --- Gefahren -------------------------------------------------------------
  // Piraten kämpfen mit denselben Schiffen wie der Spieler -- keine eigene
  // "Monster"-Statuszeile, sondern eine echte kleine Flotte (siehe
  // simulation.js kampfRundeAusfuehren, das keinen Unterschied zwischen Spieler-
  // und Gefahren-Seite macht). Für den ersten Wurf bewusst bei der
  // Weltgenerierung fest verankert, nicht dynamisch -- "lebendig machen"
  // (nachbauen, verstärken) ist später ein neues Ereignis auf denselben
  // Daten, kein Umbau.
  for (let i = 0; i < ausBereich(rng, SYSTEM_REGELN.vorkommen.gefahr); i++) {
    const orbit = nimmOrbit();
    if (!orbit) break;
    objekte.push(
      neuesObjekt(systemId, orbit, {
        typ: "gefahr",
        bezeichnung: waehle(rng, GEFAHR_ARTEN),
        gefahr: true,
        daten: {
          flotte: { kriegsschiff: zwischen(rng, 2, 7) },
          ertrag: { metall: mengeSkaliert(zwischen(rng, 800, 3000)), silizium: mengeSkaliert(zwischen(rng, 400, 1800)) },
        },
      })
    );
  }

  for (const orbit of freieOrbits) {
    objekte.push(neuesObjekt(systemId, orbit, { typ: "leer", bezeichnung: "Leerer Orbit" }));
  }

  objekte.sort((a, b) => a.orbit - b.orbit);
  return { systemId, orbitAnzahl, heimatOrbit, stern, objekte };
}
