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
  ENTDECKBARE_FORSCHUNGEN,
  techStufe,
  schluesselHaeufigkeit,
  STERN_TYPEN,
  HEIMAT_STERN,
} from "./data.js?v=0.9.1";
import { stromFuer, mischen, gewichtetWaehlen } from "./zufall.js?v=0.9.1";
import { t } from "./sprache.js?v=0.9.1";

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

// Der Stern eines Systems. Wie die Position: rein aus der Saat abgeleitet und
// NIE gespeichert -- der Stern ist da, bevor jemand hinsieht.
//
// Eigener Zufallsstrom (anderer Faktor als bei systemPosition), damit Stern und
// Position unabhängig voneinander sind und das Hinzufügen des einen die
// bestehende Verteilung des anderen nicht verschiebt.
export function sternFuer(seed, systemId, istHeimat = false) {
  const rng = stromFuer(seed, systemId * 104729);
  const tabelle = Object.values(STERN_TYPEN).map((s) => ({ id: s.id, gewicht: s.haeufigkeit }));
  const gewaehlt = istHeimat
    ? STERN_TYPEN[HEIMAT_STERN]
    : STERN_TYPEN[gewichtetWaehlen(rng, tabelle).id];
  // Auch das Heimatsystem zieht seine Leuchtkraft aus dem Bereich -- nur der
  // Typ ist festgelegt, nicht der konkrete Stern.
  const [min, max] = gewaehlt.leuchtkraft;
  const leuchtkraft = Math.round((min + rng() * (max - min)) * 1000) / 1000;
  return { ...gewaehlt, leuchtkraft };
}

export function entfernung(seed, systemA, systemB) {
  if (systemA === systemB) return 0;
  const a = systemPosition(seed, systemA);
  const b = systemPosition(seed, systemB);
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10;
}

// Erzeugt den Galaxieplan: Heimatsystem und Verteilung der Schlüssel.
export function galaxiePlanen(seed) {
  const rng = stromFuer(seed, 1);
  const alle = Array.from({ length: GALAXIE_REGELN.anzahlSysteme }, (_, i) => i + 1);
  const heimatSystem = alle[Math.floor(rng() * alle.length)];

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
