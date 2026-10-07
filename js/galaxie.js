// Galaxie-Ebene.
//
// Systempositionen werden deterministisch aus (Saat, Systemnummer) berechnet
// und NIE gespeichert. Gespeichert wird nur der kleine Galaxieplan: welche
// Systeme welche Schlüsseltechnologie hergeben.
//
// Deadlock-Freiheit gilt jetzt galaxieweit, nicht mehr pro System:
//  - jede entdeckbare Technologie hat mindestens eine Quelle irgendwo,
//  - ein Schloss vor einer Anomalie verweist immer auf eine Technologie
//    STRENG niedrigerer Tiefenstufe (siehe welt.js),
//  - Reichweite ist über Antriebstechnik immer erweiterbar.
// Zusammen kann der Spieler dadurch nie dauerhaft feststecken.

import {
  GALAXIE_REGELN,
  SUPERNOVA,
  LJ_PRO_EINHEIT,
  ENTDECKBARE_FORSCHUNGEN,
  techStufe,
  schluesselHaeufigkeit,
  STERN_TYPEN,
  HEIMAT_STERN,
  HEIMAT_LEUCHTKRAFT_BEREICH,
  DOPPELSTERN_ANTEIL,
  DOPPELSTERN_Q_BEREICH,
  DOPPELSTERN_BRAUNER_ZWERG_GRENZE,
  DOPPELSTERN_ABSTAND_MEDIAN_AE,
  DOPPELSTERN_ABSTAND_SIGMA,
  DOPPELSTERN_WEISSER_ZWERG_ANTEIL,
  WEISSER_ZWERG_IFMR,
} from "./data.js?v=0.9.95";
import { stromFuer, mischen, gewichtetWaehlen } from "./zufall.js?v=0.9.95";
import { t } from "./sprache.js?v=0.9.95";

// Position eines Systems in der Galaxie-Ebene. Rein aus der Saat abgeleitet.
export function systemPosition(seed, systemId) {
  const rng = stromFuer(seed, systemId * 7919);
  const winkel = rng() * Math.PI * 2;
  // Wurzel sorgt für gleichmäßige Verteilung über die Fläche statt Ballung in der Mitte.
  const abstand = Math.sqrt(rng()) * GALAXIE_REGELN.radius;
  return {
    x: Math.round(Math.cos(winkel) * abstand * 10) / 10,
    y: Math.round(Math.sin(winkel) * abstand * 10) / 10,
  };
}

// --- Systemnamen ----------------------------------------------------------
// Tobis Vorgabe (2026-08-16): "Gerne an echten Systemen orientieren, aber
// leserliche. Nicht sowas wie IF-205BD22."
//
// Deshalb echte, seit Jahrhunderten gebräuchliche Sternennamen statt einer
// Katalognummer. Die meisten stammen aus arabischen Sternkatalogen des
// Mittelalters und sind Beschreibungen: Aldebaran ist "der Folgende" (er
// folgt den Plejaden über den Himmel), Altair "der fliegende Adler", Deneb
// schlicht "Schwanz", Rigel "Fuß", Betelgeuse eine Verballhornung von
// "Hand des Riesen". Dazwischen stehen griechische (Sirius, "der Sengende")
// und lateinische (Polaris, Spica, Regulus). Genau diese Mischung ist der
// Grund, warum sie zusammen stimmig klingen, obwohl sie aus drei Sprachen
// kommen -- man hört ihnen an, dass sie gewachsen sind statt vergeben.
//
// NICHT übersetzt: Eigennamen sind in jeder Sprache dieselben.
const STERNENNAMEN = [
  "Sirius", "Canopus", "Arcturus", "Vega", "Capella", "Rigel", "Procyon", "Achernar",
  "Betelgeuse", "Hadar", "Altair", "Acrux", "Aldebaran", "Antares", "Spica", "Pollux",
  "Fomalhaut", "Deneb", "Mimosa", "Regulus", "Adhara", "Castor", "Gacrux", "Shaula",
  "Bellatrix", "Alnath", "Miaplacidus", "Alnilam", "Alnair", "Alnitak", "Dubhe", "Mirfak",
  "Wezen", "Sargas", "Kaus", "Avior", "Alkaid", "Menkalinan", "Atria", "Alhena",
  "Peacock", "Alsephina", "Mirzam", "Alphard", "Polaris", "Hamal", "Algieba", "Diphda",
  "Mizar", "Nunki", "Menkent", "Mirach", "Alpheratz", "Rasalhague", "Kochab", "Saiph",
  "Denebola", "Algol", "Tiaki", "Muhlifain", "Aspidiske", "Suhail", "Alphecca", "Mintaka",
  "Sadr", "Eltanin", "Schedar", "Naos", "Almach", "Caph", "Izar", "Dschubba",
  "Larawag", "Merak", "Ankaa", "Girtab", "Enif", "Scheat", "Sabik", "Phecda",
  "Aludra", "Markeb", "Navi", "Markab", "Aljanah", "Acrab", "Zosma", "Arneb",
  "Alcor", "Thuban", "Unukalhai", "Porrima", "Vindemiatrix", "Talitha", "Cursa", "Keid",
  "Zaurak", "Meissa", "Nihal", "Gomeisa", "Alula", "Chara", "Segin", "Ruchbah",
];

// Der Name eines Systems. Wie Position und Stern: rein aus der Saat
// abgeleitet und NIE gespeichert. Zwei Galaxien tragen deshalb dieselben
// Namen an anderen Orten -- die Liste ist der Sternenhimmel, die Saat die
// Blickrichtung.
let namensMerker = { seed: null, namen: null };

export function systemName(seed, systemId) {
  if (namensMerker.seed !== seed) {
    namensMerker = { seed, namen: mischen(stromFuer(seed, 15485863), STERNENNAMEN) };
  }
  const namen = namensMerker.namen;
  const index = (systemId - 1) % namen.length;
  const runde = Math.floor((systemId - 1) / namen.length);
  // Reicht die Liste nicht (mehr Systeme als Namen), zählt eine römische
  // Ziffer weiter -- so wie reale Kataloge mehrere Sterne eines Namens
  // durchnummerieren. Bei den heutigen 80 Systemen tritt das nie ein.
  return runde === 0 ? namen[index] : `${namen[index]} ${roemisch(runde + 1)}`;
}

function roemisch(n) {
  const tabelle = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = n;
  let text = "";
  for (const [wert, zeichen] of tabelle) {
    while (rest >= wert) {
      text += zeichen;
      rest -= wert;
    }
  }
  return text;
}

// A-304: Masse-Leuchtkraft-Beziehung der Hauptreihe (M bis B) -- Quelle,
// Herleitung und Prüfung gegen die Originalliteratur stehen an STERN_TYPEN
// (js/data.js). Weiße und Braune Zwerge liegen nicht auf dieser Kurve und
// gehen nie durch diese Funktion (siehe sternAusTyp).
export function leuchtkraftAusMasse(masse) {
  if (masse < 0.43) return 0.23 * Math.pow(masse, 2.3);
  if (masse <= 2) return Math.pow(masse, 4);
  return 1.4 * Math.pow(masse, 3.5);
}

function rund3(x) {
  return Math.round(x * 1000) / 1000;
}

// Drei GÜLTIGE Stellen statt drei Nachkommastellen -- die Leuchtkraft
// überspannt nach A-304 rund zehn Größenordnungen (Brauner Zwerg ~0,000001,
// heller B-Stern >10.000 L☉). rund3() rundete jeden Wert unter 0,0005 auf
// exakt 0 -- für Weiße und vor allem Braune Zwerge lag das IMMER im
// Nullbereich, ihre Leuchtkraft wäre nie von 0 zu unterscheiden gewesen.
export function rundSignifikant(x, stellen = 3) {
  if (x === 0) return 0;
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  const faktor = Math.pow(10, stellen - 1 - exponent);
  return Math.round(x * faktor) / faktor;
}

// Die sechs Hauptreihentypen, aufsteigend und lückenlos nach Masse --
// Grundlage für hauptreihentypAusMasse (Begleiter-Klassifikation).
const HAUPTREIHE_AUFSTEIGEND = ["m", "k", "g", "f", "a", "b"].map((id) => STERN_TYPEN[id]);

// Welcher Hauptreihentyp passt zu dieser Masse? Nur für Begleiter gebraucht
// (ein Primärstern hat schon seinen Typ, bevor die Masse gezogen wird) --
// Weißer/Brauner Zwerg kommen hier nie heraus, dafür sorgt die eigene
// Prüfung gegen DOPPELSTERN_BRAUNER_ZWERG_GRENZE vor dem Aufruf.
function hauptreihentypAusMasse(masse) {
  for (const typ of HAUPTREIHE_AUFSTEIGEND) {
    if (masse <= typ.masse[1]) return typ;
  }
  return HAUPTREIHE_AUFSTEIGEND[HAUPTREIHE_AUFSTEIGEND.length - 1];
}

// A-305: Welcher Hauptreihentyp GÄBE einem Stern dieser Masse seine
// Planetenstatistik (innere Kette, Riesenanteil -- siehe INNERE_KETTE_LAMBDA/
// RIESEN_ANTEIL in data.js)? Dieselbe Massen-zu-Typ-Zuordnung wie bei einem
// Doppelstern-Begleiter (hauptreihentypAusMasse), nur unter einem eigenen
// Namen exportiert: hier geht es nicht um den Sterntyp selbst, sondern um die
// "Bildungsmasse" M_b eines Systems -- bei einem Weißen Zwerg ist das die
// Masse seines Vorläufers (siehe sternFuer/WEISSER_ZWERG_IFMR), bei einem
// zirkumbinären Planetensystem die Summe M1+M2 (siehe welt.js). Unter der
// Braunzwerg-Grenze exakt dieselbe Ausnahme wie beim Begleiter -- ein System,
// das nie eine Hauptreihenmasse hatte, bekommt nie einen Hauptreihentyp.
export function bildungstypVon(masse) {
  return masse < DOPPELSTERN_BRAUNER_ZWERG_GRENZE ? STERN_TYPEN.lt : hauptreihentypAusMasse(masse);
}

// Einen Stern EINES bestimmten Typs erzeugen. `vorgegebeneMasse`: für einen
// Begleiter ist die Masse schon aus q · Primärmasse bekannt (siehe
// begleiterFuer) -- nur dann entfällt der Massen-Zug. Auf der Hauptreihe
// folgt die Leuchtkraft aus der Masse (kein weiterer Zufallszug); Weißer/
// Brauner Zwerg ziehen sie aus ihrem eigenen, unabhängigen Bereich (A-304,
// Auftrag: "Masse und Leuchtkraft werden dort je aus einem eigenen Bereich
// gezogen").
function sternAusTyp(typ, rng, vorgegebeneMasse = null) {
  const masse = vorgegebeneMasse ?? rund3(typ.masse[0] + rng() * (typ.masse[1] - typ.masse[0]));
  const leuchtkraft = typ.hauptreihe
    ? rundSignifikant(leuchtkraftAusMasse(masse))
    : rundSignifikant(typ.leuchtkraft[0] + rng() * (typ.leuchtkraft[1] - typ.leuchtkraft[0]));
  return { ...typ, masse, leuchtkraft };
}

// Standardnormalverteilter Wert aus zwei gleichverteilten rng()-Werten
// (Box-Muller) -- ursprünglich für den Doppelstern-Abstand (log-normal)
// gebraucht, seit A-311 auch für die Massenaufteilung der Scheibenmonde
// (Prinzip 5: wiederverwenden statt ein zweites Box-Muller bauen).
export function normalverteilt(rng) {
  const u1 = Math.max(rng(), 1e-12); // 0 wäre log(0) -- Math.log(0) = -Infinity
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Der Begleiter eines Doppelsterns, oder null (kein Begleiter). Drei
// unabhängige Züge in fester Reihenfolge, wie überall in diesem Modul: (1)
// hat er einen, nach dem typeigenen Anteil (DOPPELSTERN_ANTEIL) · (2)
// Massenverhältnis q, daraus Masse und -- außer bei der Braunzwerg-Grenze --
// Typ · (3) Abstand, log-normal um DOPPELSTERN_ABSTAND_MEDIAN_AE. A-304,
// Auftrag: "Der Begleiter wirkt in diesem Auftrag auf nichts" -- Zonen und
// Temperatur rechnen weiter nur mit dem Primärstern; die Bahnen mit echtem
// Abstand sind N-2.
// A-305, Nachtrag aus A-304: mit DOPPELSTERN_WEISSER_ZWERG_ANTEIL ist der
// Begleiter ein bereits entwickelter Weißer Zwerg statt eines Hauptreihen-
// oder Braunzwerg-Partners (real: Sirius B, Procyon B) -- ein Fall, den die
// reine Massenzuordnung unten nie treffen konnte, weil sie jede Masse einem
// Hauptreihentyp zuschlägt. Physik-Bedingung: sein Vorläufer war schwerer als
// der Primärstern (sonst wäre der Primärstern zuerst gestorben) -- deshalb
// M_WD gleichverteilt im Schnitt aus dem Weißer-Zwerg-Massebereich und dem,
// was ein Vorläufer schwerer als `primaerMasse` per IFMR ergäbe. Ist dieser
// Schnitt leer (primaerMasse liegt schon über der Grenze, ab der überhaupt
// ein Weißer Zwerg im zulässigen Massebereich herauskäme), gibt es hier
// keinen -- der Aufrufer fällt auf die normale Massenzuordnung zurück.
function weisserZwergBegleiter(primaerMasse, rng) {
  const [minWD, maxWD] = STERN_TYPEN.d.masse;
  const untergrenze = Math.max(minWD, WEISSER_ZWERG_IFMR.steigung * primaerMasse + WEISSER_ZWERG_IFMR.achsenabschnitt);
  if (untergrenze > maxWD) return null;
  const masse = rund3(untergrenze + rng() * (maxWD - untergrenze));
  return sternAusTyp(STERN_TYPEN.d, rng, masse);
}

function begleiterFuer(primaerTyp, primaerMasse, rng) {
  const anteil = DOPPELSTERN_ANTEIL[primaerTyp.id] ?? 0;
  if (rng() >= anteil) return null;

  const istWD = rng() < DOPPELSTERN_WEISSER_ZWERG_ANTEIL;
  const stern =
    (istWD && weisserZwergBegleiter(primaerMasse, rng)) ||
    (() => {
      const [qMin, qMax] = DOPPELSTERN_Q_BEREICH;
      const q = qMin + rng() * (qMax - qMin);
      const begleiterMasse = rund3(q * primaerMasse);
      const begleiterTyp =
        begleiterMasse < DOPPELSTERN_BRAUNER_ZWERG_GRENZE ? STERN_TYPEN.lt : hauptreihentypAusMasse(begleiterMasse);
      return sternAusTyp(begleiterTyp, rng, begleiterMasse);
    })();

  // A-305, GEFUNDENER FEHLER: `Math.round(x*10)/10` (eine Nachkommastelle)
  // rundete jeden Abstand unter 0,05 AE auf exakt 0 -- seit die Streuung mit
  // A-304s Nachtrag von σ=1 auf σ≈3,45 gewachsen ist (siehe
  // DOPPELSTERN_ABSTAND_SIGMA), kommen solche Abstände real vor (rund 13 %
  // aller Paare liegen unter 1 AE). Ein Begleiterabstand von exakt 0 macht
  // in A-305 die komplette Stabilitätsrechnung (holmanWiegertSTyp/PTyp, s=0)
  // kollabieren -- dieselbe Falle wie bei der Leuchtkraft in A-304, behoben
  // mit demselben Werkzeug: `rundSignifikant` (drei GÜLTIGE Stellen statt
  // drei Nachkommastellen).
  const abstandAE = rundSignifikant(
    Math.exp(Math.log(DOPPELSTERN_ABSTAND_MEDIAN_AE) + normalverteilt(rng) * DOPPELSTERN_ABSTAND_SIGMA)
  );

  // A-305, Nachtrag aus A-304: Exzentrizität des Begleiters, gleichverteilt
  // 0-0,8 -- enge Paare sind über die Zeit gezeitenbedingt zirkularisiert
  // (Raghavan 2010, Moe & Di Stefano 2017), deshalb e=0 unter 0,1 AE.
  const e = abstandAE < 0.1 ? 0 : rund3(rng() * 0.8);

  return { ...stern, abstandAE, e };
}

// Der Stern eines Systems. Wie die Position: rein aus der Saat abgeleitet und
// NIE gespeichert -- der Stern ist da, bevor jemand hinsieht.
//
// Eigener Zufallsstrom (anderer Faktor als bei systemPosition), damit Stern und
// Position unabhängig voneinander sind und das Hinzufügen des einen die
// bestehende Verteilung des anderen nicht verschiebt.
//
// SKALIERUNGSAUFLAGE (A-304, Tobi 23.09.): nichts hier läuft über alle
// Systeme -- jeder Aufruf zieht genau EIN System aus seinem eigenen,
// unabhängigen Zufallsstrom, wie schon vor diesem Auftrag. Kostenmessung
// (systemGenerieren, das sternFuer aufruft) steht im Ergebnis von A-304.
export function sternFuer(seed, systemId, istHeimat = false) {
  const rng = stromFuer(seed, systemId * 104729);
  const tabelle = Object.values(STERN_TYPEN).map((s) => ({ id: s.id, gewicht: s.haeufigkeit }));
  // A-325: das Zielsystem der Supernova trägt einen Vorläufer. Der Typ-Zug
  // geschieht trotzdem (und wird verworfen), damit der Strom dieses Systems
  // bis zum Massezug dieselbe Reihenfolge hat wie bei jedem anderen. Das
  // Heimatsystem ist nie das Zielsystem; sein Zweig bleibt unberührt.
  const istZiel = !istHeimat && systemId === supernovaSystemFuer(seed);
  const gezogen = istHeimat ? null : STERN_TYPEN[gewichtetWaehlen(rng, tabelle).id];
  const gewaehlt = istHeimat ? STERN_TYPEN[HEIMAT_STERN] : istZiel ? STERN_TYPEN.b : gezogen;

  let masse, leuchtkraft;
  if (istHeimat) {
    // A-304: Die Leuchtkraft wird GEZOGEN wie vor diesem Auftrag (gleicher
    // Strom, gleiche Reihenfolge, derselbe Bereich HEIMAT_LEUCHTKRAFT_
    // BEREICH) -- die Startwelt darf sich nicht verschieben. Die Masse folgt
    // danach RÜCKWÄRTS aus der Leuchtkraft (Umkehrung von L = M^4).
    const [min, max] = HEIMAT_LEUCHTKRAFT_BEREICH;
    leuchtkraft = rund3(min + rng() * (max - min));
    masse = rund3(Math.pow(leuchtkraft, 0.25));
  } else {
    // Vorläufer: Masse aus dem Bereich, in dem ein Kernkollaps möglich ist
    // (SUPERNOVA.vorlaeuferMasseMin bis zur oberen Grenze des B-Bereichs).
    const stern = istZiel
      ? sternAusTyp(gewaehlt, rng, rund3(SUPERNOVA.vorlaeuferMasseMin + rng() * (gewaehlt.masse[1] - SUPERNOVA.vorlaeuferMasseMin)))
      : sternAusTyp(gewaehlt, rng);
    masse = stern.masse;
    leuchtkraft = stern.leuchtkraft;
  }

  // Der Heimatstern bleibt einzeln (Auftrag, wörtlich) -- kein Begleiter-Zug,
  // damit sich an seinem Zufallsstrom sonst nichts ändert.
  const begleiter = istHeimat ? null : begleiterFuer(gewaehlt, masse, rng);
  return { ...gewaehlt, masse, leuchtkraft, begleiter };
}

// Der Abstand zweier Positionen, auf 0,1 gerundet -- die EINE Formel hinter
// entfernung() und hinter der Wecksuche der Piratenbanden (A-321), die
// Positionen vorab holt, statt sie je Paar neu zu ziehen.
export function positionsAbstand(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10;
}

export function entfernung(seed, systemA, systemB) {
  if (systemA === systemB) return 0;
  return positionsAbstand(systemPosition(seed, systemA), systemPosition(seed, systemB));
}

// Das Heimatsystem aus dem ersten Zug des Stroms 1 -- die EINE Formel, die
// `galaxiePlanen` und `supernovaSystemFuer` teilen (A-325, Prinzip 5a).
function heimatAusZug(zug, anzahl) {
  return Math.floor(zug * anzahl) + 1;
}

// Das Heimatsystem des Spielers, rein aus der Saat und der Größe -- ohne den
// ganzen Galaxieplan zu bauen (A-331: die Heimatsuche der Reiche braucht nur
// diese eine Nummer). `galaxiePlanen` zieht denselben ersten Zug.
export function heimatSystemVon(seed) {
  return heimatAusZug(stromFuer(seed, 1)(), GALAXIE_REGELN.anzahlSysteme);
}

// Das System, in dem die Supernova steht: das dem Zielabstand
// (SUPERNOVA.entfernungLj) am nächsten zum Heimatsystem, das Heimatsystem
// selbst ausgenommen, bei Gleichstand das mit der kleineren Nummer (A-325).
// Das Szenario wählt den Ort -- und der Stern dort ist ein Vorläufer
// (`sternFuer`); die Entfernung, die Anzeige und die Fristen sagen damit immer
// dasselbe. Eine Schleife über Positionen, keine über Sterne.
//
// Pro (Saat, Größe, Zielabstand) einmal gerechnet und gemerkt: `sternFuer` fragt bei jedem
// Aufruf danach. Größe und Zielabstand stehen im Schlüssel, denn Messskripte und Tests
// ändern `GALAXIE_REGELN.anzahlSysteme` (oder der Zielabstand) im Prozess -- die Positionen (und mit
// ihnen das Ziel) hängen über den Radius an ihr. Gibt `null` zurück, wenn es
// außer dem Heimatsystem kein System gibt.
const zielSysteme = new Map();
export function supernovaSystemFuer(seed) {
  const anzahl = GALAXIE_REGELN.anzahlSysteme;
  const schluessel = seed + ":" + anzahl + ":" + SUPERNOVA.entfernungLj;
  let ziel = zielSysteme.get(schluessel);
  if (ziel !== undefined) return ziel;
  const heimat = heimatSystemVon(seed);
  const zielEinheiten = SUPERNOVA.entfernungLj / LJ_PRO_EINHEIT;
  const heimatPosition = systemPosition(seed, heimat);
  let besterAbstand = Infinity;
  ziel = null;
  for (let id = 1; id <= anzahl; id++) {
    if (id === heimat) continue;
    const abweichung = Math.abs(positionsAbstand(heimatPosition, systemPosition(seed, id)) - zielEinheiten);
    if (abweichung < besterAbstand) {
      besterAbstand = abweichung;
      ziel = id;
    }
  }
  if (zielSysteme.size >= 256) zielSysteme.clear(); // Schutz gegen Schleifen über viele Saaten
  zielSysteme.set(schluessel, ziel);
  return ziel;
}

// Erzeugt den Galaxieplan: Heimatsystem und Verteilung der Schlüssel.
export function galaxiePlanen(seed) {
  const rng = stromFuer(seed, 1);
  const alle = Array.from({ length: GALAXIE_REGELN.anzahlSysteme }, (_, i) => i + 1);
  const heimatSystem = alle[heimatAusZug(rng(), alle.length) - 1];

  // Technologien von flach nach tief verteilen.
  const techs = [...ENTDECKBARE_FORSCHUNGEN].sort((a, b) => techStufe(a) - techStufe(b));
  const schluesselOrte = {};

  for (const techId of techs) {
    const anzahl = schluesselHaeufigkeit(techId);
    const kandidaten = mischen(rng, alle);
    schluesselOrte[techId] = kandidaten.slice(0, Math.max(1, anzahl));
  }

  // Startbedingung: im Heimatsystem soll mindestens eine flache Technologie
  // zu holen sein, sonst beginnt das Spiel mit einer Reise ins Nichts.
  // Nicht "t" als Schleifenname: das verdeckt die Übersetzungsfunktion t().
  const flach = techs.filter((techId) => techStufe(techId) === 1);
  if (flach.length && !flach.some((techId) => schluesselOrte[techId].includes(heimatSystem))) {
    const ziel = flach[Math.floor(rng() * flach.length)];
    schluesselOrte[ziel][0] = heimatSystem;
  }

  return { seed, anzahlSysteme: GALAXIE_REGELN.anzahlSysteme, heimatSystem, schluesselOrte };
}

// Welche Schlüssel gibt dieses System her?
export function schluesselImSystem(plan, systemId) {
  return Object.entries(plan.schluesselOrte)
    .filter(([, systeme]) => systeme.includes(systemId))
    .map(([techId]) => techId);
}
