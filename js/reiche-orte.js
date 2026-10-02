// Die Reiche-Schicht eines Systems: Anomalien, Wracks, Strukturen, Gefahren und
// leere Plätze (A-319, Paket 2 / N-6).
//
// Grundsatz 1 (die Welt existiert, bevor jemand hinsieht): reine Funktion aus
// Saat und Systemnummer -- sie zieht aus eigenen Strömen und braucht dafür
// keinen Systemstrom der Natur, den vorher jemand gezogen haben müsste.
//
// WARUM ein eigenes Modul: bis A-318 zog diese Schicht aus demselben Strom
// `rng` wie die Natur, nach ihr. Jede Änderung an der Natur verschob damit
// jede Ziehung der Reiche, und umgekehrt. Jetzt hat jede Art ihren EIGENEN
// Strom, und die Richtung der Abhängigkeit ist eine Richtung: die Reiche lesen
// den Rahmen, den die Natur berechnet hat (Innen- und Außenkante in AE), die
// Natur liest die Reiche nicht. Das Modul importiert deshalb nichts aus
// js/welt.js (kein Zyklus).
//
// Die Kennung eines Stroms ist `systemId * STROM_PRIMZAHL + artNummer`. 3571
// ist eine Primzahl, die in keiner anderen stromFuer-Kennung dieses Projekts
// vorkommt (sternFuer: *104729, systemPosition: *7919, guertelStrom:
// *1601+Index, bahnRng: *953, kometenwolke: *2017, mondeStrom: *2003+Index,
// Richtung auf der Karte: *1013, Namensliste: 15485863). Weil artNummer
// kleiner als die Primzahl ist, teilen sich zwei Arten nie einen Strom.
//
// ANZAHL, ORT UND INHALT EINER ART kommen aus demselben Strom dieser Art:
// ändert sich die Anzahl der Wracks, bleiben Anomalien, Strukturen, Gefahren
// und leere Plätze, wo sie waren.

import { SYSTEM_REGELN, ENTDECKBARE_FORSCHUNGEN, techStufe, mengeSkaliert } from "./data.js?v=0.9.78";
import { stromFuer, waehle, zwischen, logGleichverteilt } from "./zufall.js?v=0.9.78";

export const WRACK_ARTEN = [
  "Havarierter Frachter", "Ausgebranntes Kolonieschiff",
  "Zerschossener Geleitkreuzer", "Treibende Bergungsplattform",
];
export const ANOMALIE_ARTEN = [
  "Fremdartige Signalboje", "Verlassene Forschungsstation",
  "Kristalline Struktur unbekannten Ursprungs", "Stillgelegter Sondenschwarm",
];
export const STRUKTUR_ARTEN = [
  "Versiegelter Monolith", "Fremdartiger Resonanzkörper", "Verschlossene Artefaktkammer",
];
export const GEFAHR_ARTEN = [
  "Piratenaußenposten", "Dichtes Trümmerfeld",
  "Instabile Strahlungszone", "Automatisierte Abwehrdrohnen",
];
export const LEERER_ORBIT = "Leerer Orbit";

const STROM_PRIMZAHL = 3571;
const ART = { schluessel: 0, zusatz: 1, wrack: 2, struktur: 3, gefahr: 4, leer: 5 };

function ausBereich(rng, bereich) {
  const n = zwischen(rng, bereich.min, bereich.max);
  return bereich.hartesMax ? Math.min(n, bereich.hartesMax) : n;
}

/**
 * Erzeugt die Roh-Einträge der Reiche-Schicht eines Systems, in der
 * Reihenfolge Schlüssel-Anomalien, Zusatz-Anomalien, Wracks, Strukturen,
 * Gefahren, leere Plätze (so ordnet systemGenerieren bei gleichem Abstand).
 * @param seed        Galaxie-Saat
 * @param systemId    Systemnummer
 * @param rahmen      { innenkanteAE, aussenkanteAE } -- was die Natur berechnet
 *                    hat; ein S-Typ-Doppelstern liegt damit innerhalb seiner
 *                    Stabilitätsgrenze
 * @param schluessel  [techId...], die das System laut Galaxieplan hergibt
 * @returns [{ abstandAE, typ, bezeichnung, benoetigt?, gefahr?, daten }]
 */
export function reicheOrteGenerieren(seed, systemId, rahmen, schluessel = []) {
  const strom = (art) => stromFuer(seed, systemId * STROM_PRIMZAHL + ART[art]);
  const abstand = (rng) => logGleichverteilt(rng, rahmen.innenkanteAE, rahmen.aussenkanteAE);
  const reiche = [];

  // Schlüssel-Anomalien: ein Schloss nur hinter STRENG flacherer Technologie
  // (Kreisfreiheit aus der Ordnung, siehe Kopf von welt.js).
  const schluesselRng = strom("schluessel");
  const sortierteSchluessel = [...schluessel].sort((a, b) => techStufe(a) - techStufe(b));
  for (const techId of sortierteSchluessel) {
    const stufe = techStufe(techId);
    const moeglicheSchloesser = ENTDECKBARE_FORSCHUNGEN.filter((t) => techStufe(t) < stufe);
    const gesperrt = moeglicheSchloesser.length > 0 && schluesselRng() < 0.5;
    reiche.push({
      abstandAE: abstand(schluesselRng),
      typ: "anomalie",
      bezeichnung: waehle(schluesselRng, ANOMALIE_ARTEN),
      benoetigt: gesperrt ? { forschung: waehle(schluesselRng, moeglicheSchloesser) } : null,
      daten: { forschung: techId },
    });
  }

  const zusatzRng = strom("zusatz");
  for (let i = 0; i < ausBereich(zusatzRng, SYSTEM_REGELN.vorkommen.anomalieExtra); i++) {
    reiche.push({
      abstandAE: abstand(zusatzRng),
      typ: "anomalie",
      bezeichnung: waehle(zusatzRng, ANOMALIE_ARTEN),
      daten: {},
    });
  }

  const wrackRng = strom("wrack");
  for (let i = 0; i < ausBereich(wrackRng, SYSTEM_REGELN.vorkommen.wrack); i++) {
    reiche.push({
      abstandAE: abstand(wrackRng),
      typ: "wrack",
      bezeichnung: waehle(wrackRng, WRACK_ARTEN),
      daten: { ertrag: { metall: mengeSkaliert(zwischen(wrackRng, 300, 1200)), silizium: mengeSkaliert(zwischen(wrackRng, 150, 700)) } },
    });
  }

  const strukturRng = strom("struktur");
  for (let i = 0; i < ausBereich(strukturRng, SYSTEM_REGELN.vorkommen.struktur); i++) {
    reiche.push({
      abstandAE: abstand(strukturRng),
      typ: "struktur",
      bezeichnung: waehle(strukturRng, STRUKTUR_ARTEN),
      benoetigt: { forschung: waehle(strukturRng, ENTDECKBARE_FORSCHUNGEN) },
      daten: { ertrag: { metall: mengeSkaliert(zwischen(strukturRng, 1500, 4000)), silizium: mengeSkaliert(zwischen(strukturRng, 1200, 3000)) } },
    });
  }

  const gefahrRng = strom("gefahr");
  for (let i = 0; i < ausBereich(gefahrRng, SYSTEM_REGELN.vorkommen.gefahr); i++) {
    reiche.push({
      abstandAE: abstand(gefahrRng),
      typ: "gefahr",
      bezeichnung: waehle(gefahrRng, GEFAHR_ARTEN),
      gefahr: true,
      daten: {
        flotte: { kriegsschiff: zwischen(gefahrRng, 2, 7) },
        ertrag: { metall: mengeSkaliert(zwischen(gefahrRng, 800, 3000)), silizium: mengeSkaliert(zwischen(gefahrRng, 400, 1800)) },
      },
    });
  }

  // Platzhalter der Reiche-Schicht (Tobi 29.09., Leere Orbits (b)): keine
  // Natur, aber der Bauplatz, auf dem Piraten gründen (simulation.js).
  const leerRng = strom("leer");
  for (let i = 0; i < ausBereich(leerRng, SYSTEM_REGELN.vorkommen.leer); i++) {
    reiche.push({ abstandAE: abstand(leerRng), typ: "leer", bezeichnung: LEERER_ORBIT, daten: {} });
  }

  return reiche;
}
