// Systemgenerierung.
//
// Grundsatz 1: Die Welt existiert, bevor der Spieler sie sieht. Erkundung
// würfelt nichts aus, sie deckt auf.
// Grundsatz 2: Entdecken und Verwerten sind getrennt. Manche Objekte sieht
// man, kommt aber ohne Schlüsseltechnologie nicht heran.
// Grundsatz 3 (A-305): Systeme sind nicht gerastert -- jeder Körper trägt
// einen echten Abstand in AE, aus realen Verteilungen gezogen (Sterntyp,
// Schneelinie, Kepler). Die Orbitnummer ist seither der RANG nach Abstand
// (1 = innerstes Objekt), keine gewürfelte Platzzahl mehr.
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
  zoneVonTemperatur,
  gleichgewichtstemperatur,
  keplerAchse,
  schneelinieAE,
  zoneAbstandBand,
  vorlaeuferMasseVon,
  holmanWiegertSTyp,
  holmanWiegertPTyp,
  SCHEIBE_AUSSENKANTE_AE_PRO_MASSE,
  INNENKANTE_PERIODE_TAGE_BEREICH,
  ABSTAND_VERHAELTNIS_BEREICH,
  INNERE_KETTE_LAMBDA,
  RIESEN_ANTEIL,
  HEISSER_JUPITER_ANTEIL,
  HEISSER_JUPITER_PERIODE_TAGE_BEREICH,
  KALTE_PLANETEN_LAMBDA,
  INNERER_GUERTEL_CHANCE,
  INNERER_GUERTEL_FAKTOR_BEREICH,
  AEUSSERER_GUERTEL_CHANCE,
  AEUSSERER_GUERTEL_FAKTOR_BEREICH,
  PLANETEN_KLASSEN,
  radiusAusMasse,
  schwerkraftAus,
  planetName,
  taugtAlsStartwelt,
  STARTWELT,
  STARTSCHWIERIGKEIT,
  STARTSCHWIERIGKEIT_VORGABE,
  START,
  GUERTEL_ZONEN_GEWICHTE,
  GUERTEL_WASSER_GEWICHTE,
  GUERTEL_MASSE_BEREICH,
  ERDMASSE_T,
  WASSER_ANTEIL_KOERPER,
  AE_KM,
  SONNENMASSE_ERDMASSEN,
  ERDRADIUS_KM,
  MOND_STABILITAET_HILL_FAKTOR,
  MOND_STABILITAET_RADIEN_FAKTOR,
  MOND_RIESE_RADIUS_R_ERD,
  MOND_SCHEIBE_Q_BEREICH,
  MOND_SCHEIBE_ANZAHL_LAMBDA,
  MOND_SCHEIBE_SIGMA,
  MOND_SCHEIBE_EISANTEIL_MAX,
  MOND_EIS_WARM_GRENZE_K,
  MOND_EINSCHLAG_WAHRSCHEINLICHKEIT,
  MOND_EINSCHLAG_VERHAELTNIS_BEREICH,
  MOND_MINDESTMASSE_T,
  ZWERGPLANET_F1_BEREICH,
  ZWERGPLANET_R_BEREICH,
  ZWERGPLANET_RUND_GRENZE_T,
  ZWERGPLANET_MAX_ANZAHL,
  ZWERGPLANET_SUMME_MAX_ANTEIL,
  KOMETENWOLKE_MASSE_BEREICH_ERDMASSEN,
  KOMETENWOLKE_OHNE_RIESEN_FAKTOR,
} from "./data.js?v=0.9.78";
import { stromFuer, waehle, zwischen, gewichtetWaehlen, logGleichverteilt, poissonZug } from "./zufall.js?v=0.9.78";
import {
  reicheOrteGenerieren,
  WRACK_ARTEN,
  ANOMALIE_ARTEN,
  STRUKTUR_ARTEN,
  GEFAHR_ARTEN,
  LEERER_ORBIT,
} from "./reiche-orte.js?v=0.9.78";
import { sternFuer, leuchtkraftAusMasse, bildungstypVon, rundSignifikant, normalverteilt } from "./galaxie.js?v=0.9.78";

// Systeme können deutlich mehr als 50 Objekte tragen (die alte harte
// Obergrenze ist mit A-305 gefallen) -- römische Zahlen daher berechnen
// statt aus einer Tabelle nehmen.
const ROEMISCH_PAARE = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
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

function zieheGewichtet(rng, gewichte) {
  const tabelle = Object.entries(gewichte)
    .filter(([, gewicht]) => gewicht > 0)
    .map(([wert, gewicht]) => ({ wert, gewicht }));
  return gewichtetWaehlen(rng, tabelle).wert;
}

// A-305: Klasse/Zone/Wasser eines Planeten folgen jetzt aus seiner echten
// Gleichgewichtstemperatur (zoneVonTemperatur), nicht mehr aus seinem Rang.
// `eisrieseErlaubt` ist die eine harte Regel aus dem Auftrag: ein Eisriese
// entsteht nur jenseits der Bildungs-Schneelinie -- ein Aufrufer diesseits
// davon (z.B. ein Planet der inneren Kette, der durch einen sehr
// leuchtschwachen Stern trotzdem "kalt" gemessen wird) bekommt die
// Gewichtstabelle ohne diesen Eintrag.
function planetEigenschaften(rng, temperaturK, eisrieseErlaubt) {
  const zone = zoneVonTemperatur(temperaturK);
  const klassen = eisrieseErlaubt ? zone.klassen : Object.fromEntries(
    Object.entries(zone.klassen).filter(([klasse]) => klasse !== "eisriese")
  );
  return {
    klasse: zieheGewichtet(rng, klassen),
    zone: zone.name,
    wasser: zieheGewichtet(rng, zone.wasser),
  };
}

// A-274: Ein eigener Strom je Gürtel-Objekt, NIE der Strom des Systems
// (`rng` in systemGenerieren) -- Prinzip 1, die Zusammensetzung liegt fest,
// bevor jemand hinsieht. A-305: es gibt jetzt höchstens zwei Gürtel je
// System (innerer/äußerer, siehe guertelPositionenBauen) -- die Kennung ist
// deshalb ein fester Index (0/1) statt der früheren Orbitnummer, mit einem
// eigenen Faktor (1601, eine Primzahl, in keiner anderen stromFuer-Kennung
// dieses Projekts verwendet), damit sie mit keinem anderen Strom kollidiert.
function guertelStrom(seed, systemId, index) {
  return stromFuer(seed, systemId * 1601 + index);
}

// A-312: Zwergplaneten sind Teil ihres Gürtels, nicht zusätzlich (Tobis
// Entscheidung 13, 30.09.). Reine Kernlogik, ohne eigenen Zufall -- `ziehung`
// liefert die (i+1)-te Ziehung: i=0 der Anteil f1 des größten Körpers an der
// Gürtelmasse, i>=1 das Verhältnis r zum Vorgänger. So bleiben die drei
// Abbruchregeln (Rundgrenze, Summe, Anzahl) an EINER Stelle, geprüft ohne
// echten Strom (Definition von fertig 1/2) UND von der echten Erzeugung
// unten verwendet -- kein zweiter Ort, an dem sie abweichen könnten.
export function zwergplanetenVon(guertelMasseT, art, ziehung) {
  const rundGrenze = ZWERGPLANET_RUND_GRENZE_T[art];
  const ergebnis = [];
  let summe = 0;
  let index = 0;
  let kandidat = guertelMasseT * ziehung(index++);
  while (ergebnis.length < ZWERGPLANET_MAX_ANZAHL) {
    if (kandidat < rundGrenze) break;
    if (summe + kandidat > guertelMasseT * ZWERGPLANET_SUMME_MAX_ANTEIL) break;
    ergebnis.push(kandidat);
    summe += kandidat;
    kandidat = ergebnis[ergebnis.length - 1] * ziehung(index++);
  }
  return ergebnis;
}

function zwergplanetenZiehung(rng) {
  return (i) =>
    i === 0
      ? logGleichverteilt(rng, ZWERGPLANET_F1_BEREICH[0], ZWERGPLANET_F1_BEREICH[1])
      : ZWERGPLANET_R_BEREICH[0] + rng() * (ZWERGPLANET_R_BEREICH[1] - ZWERGPLANET_R_BEREICH[0]);
}

// `art` ("innerer"/"aeusserer", A-308) entscheidet nur das Massenband -- der
// Zug selbst steht HINTER Klasse und Wasser im selben Strom, damit beide an
// ihrem alten Wert bleiben (Auftrag, Bekannte Fallen: neue Züge nach den
// bestehenden, sonst verschieben sie sich). A-312: die Zwergplaneten stehen
// HINTER `masseT`, aus demselben Grund (Bekannte Fallen).
function guertelEigenschaften(seed, systemId, index, temperaturK, art) {
  const guertelRng = guertelStrom(seed, systemId, index);
  const zone = zoneVonTemperatur(temperaturK);
  const klasse = zieheGewichtet(guertelRng, GUERTEL_ZONEN_GEWICHTE[zone.name]);
  const wasser = zieheGewichtet(guertelRng, GUERTEL_WASSER_GEWICHTE[klasse]);
  const [minT, maxT] = GUERTEL_MASSE_BEREICH[art];
  const masseT = logGleichverteilt(guertelRng, minT, maxT);
  const zwergplaneten = zwergplanetenVon(masseT, art, zwergplanetenZiehung(guertelRng));
  return {
    klasse,
    zone: zone.name,
    wasser,
    masseT,
    ...(zwergplaneten.length ? { zwergplaneten } : {}),
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
// WRACK_ARTEN, ANOMALIE_ARTEN, STRUKTUR_ARTEN, GEFAHR_ARTEN und LEERER_ORBIT
// (die Reiche-Schicht) wohnen seit A-319 in js/reiche-orte.js.
// Bezeichnungen, die nicht aus einer der Listen oben stammen.
const SONSTIGE_ARTEN = ["Heimatwelt", "Tiefliegendes Vorkommen", "Asteroidengürtel", LEERER_ORBIT];

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

function logR(rng) {
  return logGleichverteilt(rng, ABSTAND_VERHAELTNIS_BEREICH[0], ABSTAND_VERHAELTNIS_BEREICH[1]);
}

// --- Abschnitt 1: der Rahmen je Stern (A-305) ------------------------------
//
// Bildungsmasse M_b und Bildungsleuchtkraft L_b sind die Größen, aus denen
// das ganze System gebaut wird -- bei einem Hauptreihenstern oder Braunen
// Zwerg sind das seine eigene Masse/Leuchtkraft, bei einem Weißen Zwerg die
// seines Vorläufers (Abschnitt 6: "Das System wird mit M_b = M_i erzeugt").
// Sie unterscheiden sich bewusst von der AKTUELLEN Leuchtkraft (stern.leuchtkraft),
// die für die HEUTIGE Temperatur/Zone jedes Körpers gebraucht wird (Abschnitt 3).
function bildungsGroessenVon(sternObjekt) {
  if (sternObjekt.id === "d") {
    const mi = vorlaeuferMasseVon(sternObjekt.masse);
    return { masse: mi, leuchtkraft: leuchtkraftAusMasse(mi), typ: bildungstypVon(mi) };
  }
  return { masse: sternObjekt.masse, leuchtkraft: sternObjekt.leuchtkraft, typ: bildungstypVon(sternObjekt.masse) };
}

// Der komplette Rahmen eines Systems: Bildungsmasse/-leuchtkraft, Innen-/
// Außenkante, Schneelinie, Bildungstyp (für die Tabellen in data.js) -- und
// bei einem Doppelstern, ob die Planeten um den Primärstern (S-Typ) oder um
// beide (P-Typ) kreisen (Abschnitt 5, Holman & Wiegert 1999).
//
// EIGENE ENTSCHEIDUNG (nicht im Auftrag spezifiziert): für μ und die
// Bildungsgrößen der P-Typ-Summe wird durchgängig die BILDUNGSMASSE beider
// Sterne verwendet (bei einem Weißen Zwerg also M_i), nicht die heutige --
// die dynamische Struktur eines Systems (welche Planeten wo stabil sind)
// wurde in der Bildungszeit angelegt, in derselben Epoche wie die Planeten
// selbst. Das betrifft nur den seltenen Fall eines Weißen Zwergs mit
// Begleiter in einem S/P-Typ-Grenzfall.
function systemRahmen(sternObjekt, bahnRng) {
  const primaer = bildungsGroessenVon(sternObjekt);

  if (!sternObjekt.begleiter) {
    const periodeTage = logGleichverteilt(bahnRng, INNENKANTE_PERIODE_TAGE_BEREICH[0], INNENKANTE_PERIODE_TAGE_BEREICH[1]);
    return {
      doppelsternModus: "keine",
      masse: primaer.masse,
      leuchtkraft: primaer.leuchtkraft,
      typ: primaer.typ,
      innenkanteAE: keplerAchse(primaer.masse, periodeTage / 365.25),
      aussenkanteAE: SCHEIBE_AUSSENKANTE_AE_PRO_MASSE * primaer.masse,
      schneelinieAE: schneelinieAE(primaer.leuchtkraft),
    };
  }

  const begleiter = sternObjekt.begleiter;
  const begleiterMasseBildung = begleiter.id === "d" ? vorlaeuferMasseVon(begleiter.masse) : begleiter.masse;
  const begleiterLeuchtkraftBildung = begleiter.id === "d" ? leuchtkraftAusMasse(begleiterMasseBildung) : begleiter.leuchtkraft;
  const s = begleiter.abstandAE;
  const mu = begleiterMasseBildung / (primaer.masse + begleiterMasseBildung);
  const e = begleiter.e || 0;
  const aKrit = holmanWiegertSTyp(s, mu, e);
  const innenkante20Tage = keplerAchse(primaer.masse, 20 / 365.25);

  if (aKrit > innenkante20Tage) {
    // S-Typ: Planeten kreisen um den Primärstern allein, wie im Einzelstern-
    // Fall -- nur die Außenkante wird zusätzlich von der Stabilitätsgrenze
    // gedeckelt.
    const periodeTage = logGleichverteilt(bahnRng, INNENKANTE_PERIODE_TAGE_BEREICH[0], INNENKANTE_PERIODE_TAGE_BEREICH[1]);
    return {
      doppelsternModus: "s",
      masse: primaer.masse,
      leuchtkraft: primaer.leuchtkraft,
      typ: primaer.typ,
      innenkanteAE: keplerAchse(primaer.masse, periodeTage / 365.25),
      aussenkanteAE: Math.min(SCHEIBE_AUSSENKANTE_AE_PRO_MASSE * primaer.masse, aKrit),
      schneelinieAE: schneelinieAE(primaer.leuchtkraft),
    };
  }

  // P-Typ (zirkumbinär): die Innenkante ist die Stabilitätsgrenze selbst,
  // kein Zufallszug -- die Scheibe konnte innerhalb von a_cb gar nicht
  // existieren.
  const mBildung = primaer.masse + begleiterMasseBildung;
  const lBildung = primaer.leuchtkraft + begleiterLeuchtkraftBildung;
  const aCb = holmanWiegertPTyp(s, mu, e);
  return {
    doppelsternModus: "p",
    masse: mBildung,
    leuchtkraft: lBildung,
    typ: bildungstypVon(mBildung),
    innenkanteAE: aCb,
    aussenkanteAE: SCHEIBE_AUSSENKANTE_AE_PRO_MASSE * mBildung,
    schneelinieAE: schneelinieAE(lBildung),
  };
}

// Die HEUTIGE Gleichgewichtstemperatur eines Körpers an seinem Abstand --
// getrennt von der Bildungsleuchtkraft im Rahmen, weil sie bei einem Weißen
// Zwerg eine ganz andere (winzige) Zahl ist (Abschnitt 6). `zirkumbinaer`
// verwendet die Summe der AKTUELLEN Leuchtkräfte beider Sterne (Abschnitt 3:
// "L = L₁ + L₂"), sonst zählt der Primärstern plus, wenn vorhanden, der
// Begleiter-Term über dessen eigenen (aktuellen) Abstand.
function temperaturVon(abstandAE, sternObjekt, zirkumbinaer) {
  if (zirkumbinaer) {
    const lAktuell = sternObjekt.leuchtkraft + (sternObjekt.begleiter ? sternObjekt.begleiter.leuchtkraft : 0);
    return gleichgewichtstemperatur(abstandAE, lAktuell, null);
  }
  return gleichgewichtstemperatur(abstandAE, sternObjekt.leuchtkraft, sternObjekt.begleiter);
}

// --- Abschnitt 2: die innere Kette (vor der Schneelinie) -------------------
//
// Ohne Heimat: eine einfache Kette ab der Innenkante, jeder weitere Körper
// mit frischem Abstandsverhältnis r nach außen, bis Schneelinie oder
// Außenkante erreicht ist.
//
// Mit Heimat: EIGENE ENTSCHEIDUNG (nicht im Auftrag spezifiziert, wie die
// "λ-1 weiteren" Planeten sich auf innen/außen verteilen) -- abwechselnd
// zuerst nach innen, dann nach außen versucht, jede Richtung schließt sich
// permanent, sobald ihre Grenze (Innenkante bzw. Schneelinie) erreicht ist;
// die verbleibende Anzahl geht dann vollständig in die noch offene Richtung.
//
// ZWEITE EIGENE ENTSCHEIDUNG, aus einem gefundenen Konflikt (nicht im
// Auftrag angesprochen): `START.sichtbarePlaneten` (data.js) verlangt von
// JEDEM neuen Spiel zwei sichtbare Planeten im Heimatsystem -- eine
// Zusicherung aus der Zeit vor A-305, "sonst hinge der Spielstart am
// Zufall". Der reine Poisson-Zug (λ_g = 1,5) liefert das in gemessen rund
// 56 % der Fälle NICHT (P(X<=1) für λ=1,5). Da dieser Auftrag ausdrücklich
// NICHTS an der Mechanik ändern soll ("Mechaniken selbst werden nicht
// angefasst") und `neuesSpiel` diese Zusicherung voraussetzt, bekommt NUR
// die innere Kette der Heimat einen Mindestwert von
// `START.sichtbarePlaneten` zusätzlichen Planeten (statt `λ-1`) -- der
// Poisson-Zug bleibt die Obergrenze, wenn er höher ausfällt. Das ändert die
// Statistik nur am EINEN Heimatsystem je Galaxie, nicht an der Galaxie
// insgesamt.
function innereKetteBauen(bahnRng, rahmen, heimatAbstandAE) {
  const lambda = INNERE_KETTE_LAMBDA[rahmen.typ.id] ?? 1;
  const positionen = [];

  if (heimatAbstandAE == null) {
    let anzahl = poissonZug(bahnRng, lambda);
    let pos = null;
    for (let i = 0; i < anzahl; i++) {
      const kandidat = pos === null ? rahmen.innenkanteAE : pos * logR(bahnRng);
      if (kandidat >= rahmen.schneelinieAE || kandidat >= rahmen.aussenkanteAE) break;
      positionen.push(kandidat);
      pos = kandidat;
    }
    return positionen;
  }

  let rest = Math.max(START.sichtbarePlaneten, poissonZug(bahnRng, lambda) - 1);
  let innen = heimatAbstandAE;
  let aussen = heimatAbstandAE;
  let innenOffen = true;
  let aussenOffen = true;
  let versucheInnenZuerst = true;
  while (rest > 0 && (innenOffen || aussenOffen)) {
    let platziert = false;
    const richtungen = versucheInnenZuerst ? ["innen", "aussen"] : ["aussen", "innen"];
    for (const richtung of richtungen) {
      if (platziert) break;
      if (richtung === "innen" && innenOffen) {
        const kandidat = innen / logR(bahnRng);
        if (kandidat < rahmen.innenkanteAE) innenOffen = false;
        else {
          innen = kandidat;
          positionen.push(kandidat);
          platziert = true;
        }
      } else if (richtung === "aussen" && aussenOffen) {
        const kandidat = aussen * logR(bahnRng);
        if (kandidat >= rahmen.schneelinieAE) aussenOffen = false;
        else {
          aussen = kandidat;
          positionen.push(kandidat);
          platziert = true;
        }
      }
    }
    if (platziert) {
      rest--;
      versucheInnenZuerst = !versucheInnenZuerst;
    }
  }
  return positionen;
}

// --- Abschnitt 2: Riesen, heißer Jupiter, weitere kalte Planeten -----------
//
// GEFUNDENER FEHLER, hier behoben: Die äußeren Körper starteten immer an der
// Schneelinie, ohne zu prüfen, ob die Innenkante SELBST schon weiter außen
// liegt. Das trifft normalerweise nie zu (die Innenkante folgt aus einer
// kurzen Umlaufzeit, die Schneelinie liegt für jeden halbwegs leuchtkräftigen
// Stern viel weiter außen) -- außer bei einem sehr leuchtschwachen Stern
// (Brauner Zwerg: Schneelinie oft unter 0,03 AE) ODER einem P-Typ-
// Doppelstern, dessen Innenkante die Stabilitätsgrenze a_cb ist und mit der
// Leuchtkraft nichts zu tun hat. `aussenStart` ist deshalb das Maximum aus
// beidem -- kein Körper, egal welcher Kette, entsteht innerhalb der
// Innenkante.
function aeussereKoerperBauen(bahnRng, rahmen) {
  const aussenStart = Math.max(rahmen.schneelinieAE, rahmen.innenkanteAE);
  const riesenChance = RIESEN_ANTEIL[rahmen.typ.id] ?? 0;
  const hatRiese = bahnRng() < riesenChance;
  const riesenPositionen = [];
  let hatHeisserJupiter = false;
  let jenseitsDerRiesen = aussenStart;

  if (hatRiese) {
    const anzahlRiesen = bahnRng() < 0.5 ? 1 : 2;
    let pos = aussenStart;
    for (let i = 0; i < anzahlRiesen; i++) {
      pos = pos * logR(bahnRng);
      if (pos >= rahmen.aussenkanteAE) break;
      riesenPositionen.push(pos);
    }
    if (riesenPositionen.length) jenseitsDerRiesen = Math.max(...riesenPositionen);

    if (riesenPositionen.length && bahnRng() < HEISSER_JUPITER_ANTEIL) {
      const periodeTage = logGleichverteilt(bahnRng, HEISSER_JUPITER_PERIODE_TAGE_BEREICH[0], HEISSER_JUPITER_PERIODE_TAGE_BEREICH[1]);
      const migrierteAE = keplerAchse(rahmen.masse, periodeTage / 365.25);
      // GEFUNDENER FEHLER, hier behoben -- aber NUR für P-Typ relevant: Bei
      // einem zirkumbinären System ist die Innenkante die Stabilitätsgrenze
      // a_cb (Abschnitt 5), eine Umlaufbahn dort ist dynamisch unmöglich
      // (Holman & Wiegert 1999), kein bloß unwahrscheinlicher Fall -- ein
      // heißer Jupiter, der dort hin migrieren würde, hätte diese Zone nie
      // durchquert. Bei einem Einzelstern oder S-Typ hat die Innenkante
      // dagegen KEINE solche Bedeutung (sie markiert nur, wo die
      // ungestörte Scheibe begann) -- dort darf ein heißer Jupiter beliebig
      // nah an seinen Stern migrieren, wie die Definition von fertig es
      // vorsieht (Vergleichswert 1 % bei G).
      if (rahmen.doppelsternModus !== "p" || migrierteAE >= rahmen.innenkanteAE) {
        riesenPositionen[0] = migrierteAE;
        hatHeisserJupiter = true;
      }
    }
  }

  const kaltePlaneten = [];
  let rest = poissonZug(bahnRng, KALTE_PLANETEN_LAMBDA);
  let pos = jenseitsDerRiesen;
  for (let i = 0; i < rest; i++) {
    const kandidat = pos * logR(bahnRng);
    if (kandidat >= rahmen.aussenkanteAE) break;
    kaltePlaneten.push(kandidat);
    pos = kandidat;
  }

  return { riesenPositionen, kaltePlaneten, hatHeisserJupiter, jenseitsDerRiesen };
}

// --- Abschnitt 4: die Gürtel ------------------------------------------------
// Innerer Gürtel nur bei einem Riesen ohne heißen Jupiter, außerhalb des
// äußersten inneren Planeten. Äußerer Gürtel bei bzw. ohne Planeten (dann
// log-gleichverteilt zwischen Schneelinie und Außenkante). Beide entfallen,
// wenn ihre gewürfelte Position die Außenkante überschreitet.
// A-308: liefert seit hier {abstandAE, art}, nicht mehr die nackte Zahl --
// der Index in dieser Liste ist NICHT "innen/außen" (fehlt der innere
// Gürtel, trägt der äußere den Index 0), die Art muss also ausdrücklich
// mitreisen (Auftrag, Bekannte Fallen).
function guertelPositionenBauen(bahnRng, rahmen, innereKette, aussenKoerper) {
  const { riesenPositionen, hatHeisserJupiter, kaltePlaneten, jenseitsDerRiesen } = aussenKoerper;
  const positionen = [];

  if (riesenPositionen.length && !hatHeisserJupiter && bahnRng() < INNERER_GUERTEL_CHANCE) {
    const [fMin, fMax] = INNERER_GUERTEL_FAKTOR_BEREICH;
    const faktor = fMin + bahnRng() * (fMax - fMin);
    const kandidat = riesenPositionen[0] * faktor;
    const aeusserstesInneres = innereKette.length ? Math.max(...innereKette) : rahmen.innenkanteAE;
    if (kandidat > aeusserstesInneres && kandidat < rahmen.aussenkanteAE) positionen.push({ abstandAE: kandidat, art: "innerer" });
  }

  if (bahnRng() < AEUSSERER_GUERTEL_CHANCE) {
    const [fMin, fMax] = AEUSSERER_GUERTEL_FAKTOR_BEREICH;
    // Referenz ist die vor-Migration-Position (jenseitsDerRiesen), NIE die
    // eines heißen Jupiters: der ist nach innen gewandert, das äußere
    // Trümmerfeld hat davon nichts gemerkt (Abschnitt 8, aeussereKoerperBauen).
    const aeusserstePosition = kaltePlaneten.length ? kaltePlaneten[kaltePlaneten.length - 1] : jenseitsDerRiesen;
    const kandidat =
      riesenPositionen.length || kaltePlaneten.length
        ? aeusserstePosition * (fMin + bahnRng() * (fMax - fMin))
        : logGleichverteilt(bahnRng, Math.max(rahmen.schneelinieAE, rahmen.innenkanteAE), rahmen.aussenkanteAE);
    if (kandidat < rahmen.aussenkanteAE) positionen.push({ abstandAE: kandidat, art: "aeusserer" });
  }

  return positionen;
}

// --- Abschnitt 8: Heimat -----------------------------------------------
// Ihr Abstand wird ZUERST gewählt, log-gleichverteilt im AE-Band ihrer
// Zielzone (STARTSCHWIERIGKEIT) -- die innere Kette wird danach von ihr aus
// gebaut (innereKetteBauen mit heimatAbstandAE).
function heimatAbstandWaehlen(rng, rahmen, zielZone) {
  const [min, max] = zoneAbstandBand(zielZone, rahmen.leuchtkraft);
  const unten = Math.max(min, rahmen.innenkanteAE);
  const oben = Math.min(Number.isFinite(max) ? max : rahmen.schneelinieAE, rahmen.schneelinieAE);
  if (unten >= oben) {
    // Notnagel: der Heimatstern ist immer ein einzelner Gelber Zwerg in
    // einem engen, sonnenähnlichen Leuchtkraftband (HEIMAT_LEUCHTKRAFT_BEREICH)
    // -- dieser Fall ist gemessen (A-305-Ergebnis) nie eingetreten, bleibt
    // aber als Absicherung stehen, statt mit min>oben zu werfen.
    return Math.sqrt(Math.max(rahmen.innenkanteAE, 1e-6) * rahmen.schneelinieAE);
  }
  return logGleichverteilt(rng, unten, oben);
}

// Die Heimatwelt ist ein PLANET wie jeder andere -- mit Klasse, Zone und
// Wasser. Gezogen wird so lange, bis die Kombination als Startwelt taugt.
// Das ist bewusst eine BEDINGTE Ziehung und keine feste Vorgabe: Klasse und
// Wasserstand variieren weiterhin, nur eben innerhalb dessen, was bewohnbar
// ist.
function heimatEigenschaften(rng, temperaturK, zielWasser) {
  const masseFuer = (g) => Math.pow(g, 1 / 0.46);
  const bandTauglich = (klasseId) => {
    const k = PLANETEN_KLASSEN[klasseId];
    return k.masse[0] <= masseFuer(STARTWELT.schwerkraftMax) && k.masse[1] >= masseFuer(STARTWELT.schwerkraftMin);
  };
  const zone = zoneVonTemperatur(temperaturK);

  for (let versuch = 0; versuch < 25; versuch++) {
    const klasse = zieheGewichtet(rng, zone.klassen);
    const eig = { klasse, zone: zone.name, wasser: zielWasser };
    if (taugtAlsStartwelt(eig) && bandTauglich(klasse)) return eig;
  }
  // Notnagel für den Fall, dass die Zone gar nichts Bewohnbares zulässt.
  return { klasse: "felswelt", zone: "habitabel", wasser: "maessig" };
}

// Die Masse der Heimatwelt, eingegrenzt auf das Schwerkraftband aus
// STARTWELT (Korrelation −0,88 mit dem Spielfortschritt, siehe
// taugtAlsStartwelt).
function heimatMasse(rng, klasse) {
  const masseFuer = (g) => Math.pow(g, 1 / 0.46);
  const unten = Math.max(klasse.masse[0], masseFuer(STARTWELT.schwerkraftMin));
  const oben = Math.min(klasse.masse[1], masseFuer(STARTWELT.schwerkraftMax));
  if (unten > oben) return Math.min(klasse.masse[1], Math.max(klasse.masse[0], masseFuer(1)));
  return unten + rng() * (oben - unten);
}

/**
 * Erzeugt ein System.
 * @param seed        Galaxie-Saat
 * @param systemId    Systemnummer
 * @param optionen    { schluessel: [techId...], istHeimat, heimatName,
 *                      schwierigkeit } -- `schwierigkeit` (A-190) wirkt nur,
 *                      wenn istHeimat gesetzt ist; siehe STARTSCHWIERIGKEIT.
 */
export function systemGenerieren(seed, systemId, optionen = {}) {
  const { schluessel = [], istHeimat = false, heimatName = "Heimatwelt", schwierigkeit = STARTSCHWIERIGKEIT_VORGABE } = optionen;
  const rng = stromFuer(seed, systemId);
  // A-305: eigener Zufallsstrom für die Bahnen der Natur (Planeten, Gürtel).
  // 953 ist eine Primzahl, die in keiner anderen stromFuer-Kennung dieses
  // Projekts vorkommt (sternFuer: *104729, systemPosition: *7919,
  // guertelStrom: *1601+Index) -- derselbe Kollisionsschutz wie beim
  // bestehenden Muster. Die Reiche-Schicht hat seit A-319 ihre eigenen Ströme
  // (js/reiche-orte.js, *3571 + Art).
  const bahnRng = stromFuer(seed, systemId * 953);

  const stern = sternFuer(seed, systemId, istHeimat);
  const rahmen = systemRahmen(stern, bahnRng);
  const zirkumbinaer = rahmen.doppelsternModus === "p";

  // A-190: eine unbekannte Stufe (z.B. aus einem älteren Aufruf) fällt auf
  // Normal zurück, statt mit `undefined.zone` zu werfen.
  const ziel = STARTSCHWIERIGKEIT[schwierigkeit] || STARTSCHWIERIGKEIT[STARTSCHWIERIGKEIT_VORGABE];

  // --- Natur: Heimat, innere Kette, Riesen, kalte Planeten, Gürtel --------
  const natur = [];
  let heimatAbstandAE = null;

  if (istHeimat) {
    heimatAbstandAE = heimatAbstandWaehlen(bahnRng, rahmen, ziel.zone);
    const temperaturK = temperaturVon(heimatAbstandAE, stern, zirkumbinaer);
    const eig = heimatEigenschaften(rng, temperaturK, ziel.wasser);
    const klasse = PLANETEN_KLASSEN[eig.klasse];
    const masse = heimatMasse(rng, klasse);
    const radius = radiusAusMasse(masse);
    // Index 0: die Heimat wird vor der inneren Kette erzeugt.
    const heimatMonde = mondeErzeugen(seed, systemId, natur.length, {
      klasse: eig.klasse, masse, abstandAE: heimatAbstandAE, temperaturK, rahmenMasse: rahmen.masse,
    });
    natur.push({
      abstandAE: heimatAbstandAE,
      typ: "heimat",
      bezeichnung: heimatName,
      entdeckt: true,
      daten: {
        ...eig,
        abstandAE: rundSignifikant(heimatAbstandAE, 4),
        temperaturK: Math.round(temperaturK),
        kolonisierbar: true,
        schwerkraft: Math.round(schwerkraftAus(masse, radius) * 100) / 100,
        masse: Math.round(masse * 100) / 100,
        groesse: Math.round(radius * 100),
        ...(heimatMonde.length ? { monde: heimatMonde } : {}),
      },
    });
  }

  // EIGENE ENTSCHEIDUNG: das Heimatsystem baut seine innere Kette immer,
  // auch wenn derselbe Zug (unabhängig von der Heimatplatzierung) einen
  // heißen Jupiter ergäbe -- die Heimat braucht ihre Nachbarschaft in jedem
  // Fall. Für alle anderen Systeme gilt der Auftrag wörtlich: ein heißer
  // Jupiter hat keine innere Kette.
  const aussenKoerper = aeussereKoerperBauen(bahnRng, rahmen);
  const innereKette =
    !aussenKoerper.hatHeisserJupiter || istHeimat
      ? innereKetteBauen(bahnRng, rahmen, heimatAbstandAE)
      : [];

  for (const abstandAE of innereKette) {
    const temperaturK = temperaturVon(abstandAE, stern, zirkumbinaer);
    const eig = planetEigenschaften(rng, temperaturK, abstandAE >= rahmen.schneelinieAE);
    natur.push(planetObjektBauen(rng, abstandAE, temperaturK, eig, seed, systemId, natur.length, rahmen.masse));
  }

  for (const abstandAE of aussenKoerper.riesenPositionen) {
    const temperaturK = temperaturVon(abstandAE, stern, zirkumbinaer);
    // Riesen kommen nur noch über diesen Zug (RIESEN_ANTEIL), nicht mehr über
    // die zonengewichtete Klassenziehung -- die Klasse steht deshalb fest
    // ("gasriese"), aber der Wasserstand wird weiterhin aus der Zonentabelle
    // gezogen (wirkt auf affinitaetVon ohnehin nicht, siehe def.gas, ist aber
    // die Zahl, die die Anzeige zeigt).
    const zone = zoneVonTemperatur(temperaturK);
    const eig = { klasse: "gasriese", zone: zone.name, wasser: zieheGewichtet(rng, zone.wasser) };
    natur.push(planetObjektBauen(rng, abstandAE, temperaturK, eig, seed, systemId, natur.length, rahmen.masse));
  }

  for (const abstandAE of aussenKoerper.kaltePlaneten) {
    const temperaturK = temperaturVon(abstandAE, stern, zirkumbinaer);
    const eig = planetEigenschaften(rng, temperaturK, abstandAE >= rahmen.schneelinieAE);
    natur.push(planetObjektBauen(rng, abstandAE, temperaturK, eig, seed, systemId, natur.length, rahmen.masse));
  }

  // Schlösser vor reinen Beute-Objekten dürfen jede Technologie verlangen --
  // sie vergeben selbst keine Schlüssel, können also keinen Kreis bilden.
  const vielleichtGesperrt = () =>
    rng() < SYSTEM_REGELN.anteilGesperrt ? { forschung: waehle(rng, ENTDECKBARE_FORSCHUNGEN) } : null;

  const guertelPositionen = guertelPositionenBauen(bahnRng, rahmen, innereKette, aussenKoerper);
  // Zusammensetzung (guertelEigenschaften) und Vorkommen (VORKOMMEN_TABELLE)
  // wie vor A-305 -- das ändert erst N-3. Der Haufen-Anteil (Ressource,
  // Menge, Sperre) kommt weiter aus dem Systemstrom `rng`, in der Reihenfolge
  // der jetzt nach Abstand noch ungeordneten Gürtel-Liste.
  guertelPositionen.forEach(({ abstandAE, art }, index) => {
    const temperaturK = temperaturVon(abstandAE, stern, zirkumbinaer);
    const eig = guertelEigenschaften(seed, systemId, index, temperaturK, art);
    const eintrag = gewichtetWaehlen(rng, VORKOMMEN_TABELLE);
    const sperre = vielleichtGesperrt();
    const menge = zwischen(rng, eintrag.menge.min, eintrag.menge.max) * (sperre ? 2.5 : 1);
    natur.push({
      abstandAE,
      typ: "asteroiden",
      bezeichnung: sperre ? "Tiefliegendes Vorkommen" : "Asteroidengürtel",
      benoetigt: sperre,
      daten: {
        ertrag: { [eintrag.ressource]: Math.round(menge) },
        ...eig,
        abstandAE: rundSignifikant(abstandAE, 4),
        temperaturK: Math.round(temperaturK),
        schwerkraft: 0,
        kolonisierbar: true,
      },
    });
  });

  // --- A-312: Kometenwolke -- eigener Strom (2017, Primzahl, kollidiert mit
  // keiner anderen stromFuer-Kennung: sternFuer *104729, systemPosition
  // *7919, guertelStrom *1601+Index, mondeStrom *2003+Index). Ausgelöst durch
  // die NATUR vor dem Weiße-Zwerg-Filter (Bekannte Fallen: ein Riese, den ein
  // Weißer Zwerg verschluckt hat, hat seine Kometen vorher trotzdem
  // hinausgeschleudert -- `natur`, nicht `systemNatur`).
  const hatRiese = natur.some(
    (k) => k.typ === "planet" && (k.daten.klasse === "gasriese" || k.daten.klasse === "eisriese")
  );
  const kometenwolkeRng = stromFuer(seed, systemId * 2017);
  const kometenwolkeErdmassen =
    logGleichverteilt(kometenwolkeRng, KOMETENWOLKE_MASSE_BEREICH_ERDMASSEN[0], KOMETENWOLKE_MASSE_BEREICH_ERDMASSEN[1]) *
    (hatRiese ? 1 : KOMETENWOLKE_OHNE_RIESEN_FAKTOR);
  const kometenwolke = { masseT: kometenwolkeErdmassen * ERDMASSE_T };

  // --- Abschnitt 6: Weißer Zwerg -- Vorläufer-Planeten verschluckt/geweitet
  let systemNatur = natur;
  if (stern.id === "d") {
    const mi = vorlaeuferMasseVon(stern.masse);
    const weitung = mi / stern.masse;
    const SCHLUCK_GRENZE_AE = 3;
    systemNatur = natur
      .filter((k) => k.abstandAE >= SCHLUCK_GRENZE_AE || k.typ === "heimat")
      .map((k) => {
        if (k.typ === "heimat") return k; // die Heimat ist nie ein Weißer Zwerg (HEIMAT_STERN = "g")
        const abstandAE = k.abstandAE * weitung;
        const temperaturK = temperaturVon(abstandAE, stern, zirkumbinaer);
        return {
          ...k,
          abstandAE,
          daten: { ...k.daten, abstandAE: rundSignifikant(abstandAE, 4), temperaturK: Math.round(temperaturK) },
        };
      });
  }

  // --- Reiche-Schicht: Anomalien, Wracks, Strukturen, Gefahren, leere Plätze
  // A-319: eigenes Modul, je Art ein eigener Strom -- kein Zug der Natur
  // verschiebt sie mehr, und sie zieht nichts aus `rng`. Die Reiche entstehen
  // nach dem Weißen-Zwerg-Filter und werden nicht mitgeweitet; auch die eines
  // S-Typ-Doppelsterns bleiben innerhalb der Stabilitätsgrenze (a_krit steckt
  // schon in rahmen.aussenkanteAE, siehe systemRahmen).
  const reiche = reicheOrteGenerieren(seed, systemId, {
    innenkanteAE: rahmen.innenkanteAE,
    aussenkanteAE: rahmen.aussenkanteAE,
  }, schluessel);

  // --- Abschnitt 8: Rang nach Abstand -------------------------------------
  const alle = [...systemNatur, ...reiche].sort((a, b) => a.abstandAE - b.abstandAE);
  const orbitAnzahl = alle.length;
  const heimatEintrag = alle.find((o) => o.typ === "heimat");
  const heimatOrbit = heimatEintrag ? alle.indexOf(heimatEintrag) + 1 : null;

  const objekte = alle.map((roh, index) =>
    neuesObjekt(systemId, index + 1, {
      typ: roh.typ,
      bezeichnung: roh.bezeichnung,
      entdeckt: roh.entdeckt ?? false,
      gefahr: roh.gefahr ?? false,
      benoetigt: roh.benoetigt ?? null,
      daten: roh.daten,
    })
  );

  return { systemId, orbitAnzahl, heimatOrbit, stern, objekte, kometenwolke };
}

// A-311: Monde -- ein Planet oder die Heimat bekommt `daten.monde` (eine
// Liste, innen nach außen), gezogen aus einem EIGENEN Strom je Körper, NIE
// dem Systemstrom `rng` (Bekannte Fallen: ein neuer Zug darin verschöbe jede
// Klasse, Masse und Sperre danach). 2003 ist eine Primzahl, in keiner
// anderen stromFuer-Kennung dieses Projekts verwendet (sternFuer: *104729,
// systemPosition: *7919, guertelStrom: *1601+Index, bahnRng: *953,
// Reiche-Schicht: *3571+Art). `index` ist die Stelle des Körpers in `natur` (vor dem
// Sortieren) -- die Heimat hat Index 0.
//
// Die Stabilitätsprüfung selbst braucht keinen Zufall (reine Geometrie aus
// Abstand, Massen und Radius) und läuft deshalb VOR dem Strom-Aufruf -- ein
// instabiler Planet zieht gar nichts, spart also nichts an Reproduzierbarkeit
// ein, verbraucht aber auch nichts, was später fehlen könnte.
const MOND_RIESEN_KLASSEN = new Set(["gasriese", "eisriese"]);
const MOND_EINSCHLAG_KLASSEN = new Set(["felswelt", "supererde", "kleinwelt", "miniNeptun"]);

function mondeStabil(klasse, masse, abstandAE, rahmenMasse) {
  const radiusRErd = MOND_RIESE_RADIUS_R_ERD[klasse] ?? radiusAusMasse(masse);
  const aKm = abstandAE * AE_KM;
  const sternMasseErd = rahmenMasse * SONNENMASSE_ERDMASSEN;
  const hillRadiusKm = aKm * Math.cbrt(masse / (3 * sternMasseErd));
  return MOND_STABILITAET_HILL_FAKTOR * hillRadiusKm >= MOND_STABILITAET_RADIEN_FAKTOR * radiusRErd * ERDRADIUS_KM;
}

function mondeErzeugen(seed, systemId, index, { klasse, masse, abstandAE, temperaturK, rahmenMasse }) {
  if (!mondeStabil(klasse, masse, abstandAE, rahmenMasse)) return [];
  const rng = stromFuer(seed, systemId * 2003 + index);
  const masseT = masse * ERDMASSE_T;

  if (MOND_RIESEN_KLASSEN.has(klasse)) {
    const q = logGleichverteilt(rng, MOND_SCHEIBE_Q_BEREICH[0], MOND_SCHEIBE_Q_BEREICH[1]);
    const gesamtMasseT = masseT * q;
    const anzahl = 1 + poissonZug(rng, MOND_SCHEIBE_ANZAHL_LAMBDA);
    const warm = temperaturK > MOND_EIS_WARM_GRENZE_K;
    // Gewichte (log-normal) und Eisanteile werden VOR dem Filtern auf die
    // Mindestmasse gezogen, in fester Reihenfolge -- sonst hinge die Anzahl
    // der Züge (und damit jeder Zug danach) von der Mindestmasse ab.
    const gewichte = Array.from({ length: anzahl }, () => Math.exp(MOND_SCHEIBE_SIGMA * normalverteilt(rng)));
    const gewichtSumme = gewichte.reduce((a, b) => a + b, 0);
    const wWerte = Array.from({ length: anzahl }, () => (warm ? WASSER_ANTEIL_KOERPER.trocken : rng() * MOND_SCHEIBE_EISANTEIL_MAX))
      .sort((a, b) => a - b);
    const monde = [];
    for (let i = 0; i < anzahl; i++) {
      const mondMasseT = gesamtMasseT * (gewichte[i] / gewichtSumme);
      if (mondMasseT < MOND_MINDESTMASSE_T) continue;
      monde.push({ klasse: "mondEis", masseT: mondMasseT, wasserAnteil: wWerte[i] });
    }
    return monde;
  }

  if (MOND_EINSCHLAG_KLASSEN.has(klasse)) {
    if (rng() >= MOND_EINSCHLAG_WAHRSCHEINLICHKEIT) return [];
    const verhaeltnis = logGleichverteilt(rng, MOND_EINSCHLAG_VERHAELTNIS_BEREICH[0], MOND_EINSCHLAG_VERHAELTNIS_BEREICH[1]);
    const mondMasseT = masseT * verhaeltnis;
    if (mondMasseT < MOND_MINDESTMASSE_T) return [];
    return [{ klasse: "mondGestein", masseT: mondMasseT, wasserAnteil: WASSER_ANTEIL_KOERPER.trocken }];
  }

  return [];
}

// Ein Planet der inneren Kette oder der äußeren Körper -- Masse aus dem
// Bereich der Klasse, Radius/Schwerkraft daraus abgeleitet, wie vor A-305.
// A-317: kein Ertrag, keine Sperre, kein Nachwachsen mehr -- die
// Antimaterie-Ernte an Riesenplaneten ist raus (Tobi, Entscheidung 19).
function planetObjektBauen(rng, abstandAE, temperaturK, eig, seed, systemId, index, rahmenMasse) {
  const klasse = PLANETEN_KLASSEN[eig.klasse];
  const masse = klasse.masse[0] + rng() * (klasse.masse[1] - klasse.masse[0]);
  const radius = radiusAusMasse(masse);
  const schwerkraft = klasse.oberflaeche ? Math.round(schwerkraftAus(masse, radius) * 100) / 100 : klasse.schwerkraft;
  const monde = mondeErzeugen(seed, systemId, index, { klasse: eig.klasse, masse, abstandAE, temperaturK, rahmenMasse });
  return {
    abstandAE,
    typ: "planet",
    bezeichnung: planetName(eig),
    benoetigt: null,
    daten: {
      ...eig,
      abstandAE: rundSignifikant(abstandAE, 4),
      temperaturK: Math.round(temperaturK),
      kolonisierbar: klasse.oberflaeche && rng() < SYSTEM_REGELN.planetBesiedelbar,
      schwerkraft,
      masse: Math.round(masse * 100) / 100,
      groesse: Math.round(radius * 100),
      ...(monde.length ? { monde } : {}),
    },
  };
}
