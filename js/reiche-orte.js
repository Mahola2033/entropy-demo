// Die Reiche-Schicht eines Systems: Anomalien, Wracks, Strukturen und Wächter-Relikte
// (an Ursprungs-Orten), Piratenposten und leere Plätze (A-319, Paket 2 / N-6).
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
// Richtung auf der Karte: *1013, Namensliste: 15485863, Riesenstrahlung
// (A-327): *2029+Index mit maskierter Saat, Imperiennamen (A-330): *4099 mit
// maskierter Saat, Relikte an Ursprungs-Orten (A-334): *4909 und *6469 je
// (System, Ort) mit maskierter Saat; der Ortsstrom je Zelle und der Strom für Name,
// Bauherr und Zweck je Ort (A-335) in js/ursprungs-orte.js tragen keine Primzahl und je
// eine eigene Maske der Saat). Weil artNummer
// kleiner als die Primzahl ist, teilen sich zwei Arten nie einen Strom.
//
// ANZAHL, ORT UND INHALT EINER ART kommen aus demselben Strom dieser Art:
// ändert sich die Anzahl der Wracks, bleiben Anomalien, Strukturen, bewachte
// Orte und leere Plätze, wo sie waren.
//
// EIN WRACK IST EIN SCHIFF (A-326): Bezeichnung, Schiffsart (WRACK_SCHIFF) und
// Ertrag (`schrottVon`, js/data.js) -- gerechnet, nicht gewürfelt.
//
// WRACKS LIEGEN NUR IN DEN ZONEN DER REICHE (A-332): rund um die Heimat eines
// Reiches, so weit es in `alterRaumfahrtJahre` unterlichtschnell gekommen ist
// (REICHWEITE.basis). Wohin kein Schiff kommen konnte, liegt keins. Welche Zone
// ein System hat, rechnet welt.js (`reicheHeimaten`) und gibt sie als Parameter
// `zone` herein: `{ reich }`, der Index des nächsten Reiches; `null` heißt
// außerhalb jeder Zone, und dort gibt es kein Wrack. Die Zahl je Zone-System ist
// eine Folge, kein Bereich: Erstflug-Versuche scheitern mit
// WRACK_VERLUST_JE_ERSTFLUG und werden wiederholt, bis einer gelingt -- die Zahl
// der Fehlschläge ist geometrisch verteilt, Mittel p / (1 − p). Jedes Wrack
// trägt Herkunft (den Reichindex) und Alter (gleichverteilt über das Alter der
// Raumfahrt: ein gleichbleibender Verlust je Jahr, kein Zerfallsgesetz).
//
// PIRATENPOSTEN LIEGEN NUR IN DEN ZONEN DER REICHE (A-333), wie die Wracks: Piraten
// kommen nicht aus dem leeren Raum (Tobi, 15.08.), ein Posten ist die Abspaltung
// eines Reiches. Dieselbe Zone, derselbe Parameter `zone`; der Posten trägt
// `daten.herkunft` (den Reichindex) und `daten.alterJahre` (gleichverteilt über das
// Alter der Raumfahrt, aus einem EIGENEN Strom: ein Zug mehr im Strom "bewacht"
// verschöbe die Orte und die Flotten der folgenden Einträge). Die Dichte in der
// Zone ist die alte (Mittel 0,5 je System); außerhalb entfällt der Eintrag, der
// Strom zieht trotzdem jeden Zug.
//
// STRUKTUREN UND WÄCHTER-RELIKTE LIEGEN NUR AN URSPRUNGS-ORTEN (A-334): Stellen der
// Saat, an denen eine frühere Zivilisation war (js/ursprungs-orte.js: ein Ort je 100
// Systeme, im Mittel 4,5 Relikte je Ort, ein Viertel davon Wächter). Der alte Strom
// "struktur" und die Wächter-Würfe im Strom "bewacht" liefern keine Objekte mehr; der
// Strom "bewacht" zieht trotzdem jeden Zug (Orte und Flotten der Piratenposten
// bleiben). Jedes Relikt trägt `daten.ursprung` (Name des Ortes), `daten.zweck` (Schlüssel,
// URSPRUNG_ZWECKE), `daten.bauherr` (Name des erloschenen Volkes) und `daten.alterJahre`
// (5.000 bis 5 Mio., die Relikte eines Ortes in einem Zeitalter, A-335). Die Strukturart
// folgt dem Zweck des Ortes (ein Zug, wie zuvor). Die Position des
// Systems kommt als Parameter herein (kein Import aus welt.js oder galaxie.js).
//
// DIE ANZAHL WIRD EINMAL GEZOGEN (A-320), vor dem ersten Eintrag der Art, und
// die Schleife läuft bis zu ihr (die anderen Arten ziehen sie aus einem Bereich
// 0..max, `SYSTEM_REGELN.vorkommen`).

import {
  SYSTEM_REGELN,
  ENTDECKBARE_FORSCHUNGEN,
  techStufe,
  mengeSkaliert,
  schrottVon,
  alterRaumfahrtJahre,
  WRACK_VERLUST_JE_ERSTFLUG,
  URSPRUNG_WAECHTER_ANTEIL,
  URSPRUNG_ALTER_MIN_JAHRE,
  URSPRUNG_ALTER_MAX_JAHRE,
  URSPRUNG_ALTER_STREUUNG,
  URSPRUNG_ZWECKE,
} from "./data.js?v=0.9.94";
import { stromFuer, waehle, zwischen, logGleichverteilt, gewichtetWaehlen } from "./zufall.js?v=0.9.94";
import { URSPRUNG_SAAT_MASKE, ursprungsOrteUm, relikteWahrscheinlichkeit } from "./ursprungs-orte.js?v=0.9.94";

export const WRACK_ARTEN = ["Havarierter Erkunder"];
// Ein Wrack IST ein Schiff (A-326, Prinzip 0c): welches, steht hier, EINE
// Tabelle. Sein Ertrag ist, was die Verschrottung dieses Schiffs im Spiel
// gäbe (`schrottVon`, js/data.js: Baukosten × SCHROTT_ANTEIL, je Posten, auch
// Elektronik) -- gerechnet, nicht gespeichert und nicht gewürfelt.
//
// Seit A-332 nur noch ein ERSTFLUG-SCHIFF: wer in ein unbekanntes System fliegt
// und dort einen Anker setzt, ist ein Erkunder (LORE-PHYSIK.md 6, "Bauen").
// Frachter, Kolonieschiff, Geleitkreuzer und Bergungsplattform sind es nicht:
// ein Kriegsschiff-Wrack gehört zu einem Gefecht (Banden, A-333), eine
// Bergungsplattform zu einer Förderkolonie, ein Frachter oder Kolonieschiff zu
// einem Ziel, das es vor dem Start nicht gab -- das Spiel kennt vor dem Start nur
// die Heimatwelt. Die Sonde ist es auch nicht: sie ist ein Einwegschiff, das an
// ihrem Ziel bleibt (SCHIFFE.sonde.verbraucht), ihr Verbleib dort ist kein
// Verlust, und den Anker setzt sie nicht.
export const WRACK_SCHIFF = {
  "Havarierter Erkunder": "erkunder",
};
export const ANOMALIE_ARTEN = [
  "Fremdartige Signalboje", "Verlassene Forschungsstation",
  "Kristalline Struktur unbekannten Ursprungs", "Stillgelegter Sondenschwarm",
];
export const STRUKTUR_ARTEN = [
  "Versiegelter Monolith", "Fremdartiger Resonanzkörper", "Verschlossene Artefaktkammer",
];
// Die Strukturart FOLGT dem Zweck des Ortes (A-335): je Zweck eine gewichtete Tabelle über
// STRUKTUR_ARTEN, gebaut aus URSPRUNG_ZWECKE (js/data.js, die eine Tabelle). Eine Art ohne
// Gewicht bekommt 0 und fällt im Test auf (tests/ursprungs-orte.test.js), nicht hier still.
const STRUKTUR_NACH_ZWECK = new Map(
  URSPRUNG_ZWECKE.map((z) => [z.schluessel, STRUKTUR_ARTEN.map((art) => ({ art, gewicht: z.strukturen[art] ?? 0 }))]),
);
// A-329: die Kategorie "Gefahr" gibt es nicht mehr. Zwei Arten bleiben, EINE
// Tabelle: ein Piratenposten (eigener Typ, aus ihm erwachen die Banden) und ein
// Wächter-Relikt (eine Struktur, die ihre Flotte noch trägt und sie nie
// weckt). Strahlungszone und Trümmerfeld sind Natur und leben als Eigenschaft
// der Riesen (A-327) und der Gürtel (A-328) weiter.
export const PIRATENPOSTEN_ART = "Piratenaußenposten";
export const WAECHTER_RELIKT_ART = "Abwehrdrohnen-Schwarm";
export const BEWACHTE_ARTEN = [PIRATENPOSTEN_ART, WAECHTER_RELIKT_ART];

// Der Strom "bewacht" (früher "gefahr") zieht WEITER jeden Zug der alten
// Kategorie, damit Zahl, Ort und Flotte der Piratenposten dort bleiben, wo sie
// waren (Muster der verworfenen Züge, A-326). Der Wurf wählt aus vier gleich
// gewichteten Stellen -- Reihenfolge der früheren Tabelle (Piratenaußenposten,
// Dichtes Trümmerfeld, Instabile Strahlungszone, Automatisierte Abwehrdrohnen):
// drei Stellen werden gezogen und verworfen, seit A-334 auch die Drohnen (die
// Wächter-Relikte liegen an Ursprungs-Orten).
const BEWACHT_WURF = ["piratenposten", "verworfen", "verworfen", "verworfen"];
export const LEERER_ORBIT = "Leerer Orbit";

const STROM_PRIMZAHL = 3571;
// Art 3 war der Strom "struktur" (bis A-333); er zieht nichts mehr, die Nummer
// bleibt frei (Strom-Kennungen werden nicht umverteilt).
const ART = { schluessel: 0, zusatz: 1, wrack: 2, bewacht: 4, leer: 5, postenAlter: 6 };
const RELIKT_PRIMZAHL_SYSTEM = 4909;
const RELIKT_PRIMZAHL_ORT = 6469;

function ausBereich(rng, bereich) {
  const n = zwischen(rng, bereich.min, bereich.max);
  return bereich.hartesMax ? Math.min(n, bereich.hartesMax) : n;
}

// Die Relikte, die ein System an den Ursprungs-Orten in seiner Nähe trägt (A-334).
// Je (System, Ort) EIN Strom mit maskierter Saat: erst der Wurf, ob das System ein
// Relikt dieses Ortes trägt (Wahrscheinlichkeit aus der Dichte, js/ursprungs-orte.js),
// dann Abstand, Art, Inhalt, Alter. Ein System trägt höchstens eines je Ort.
function reliktEintraege(seed, systemId, position, abstand) {
  const eintraege = [];
  const wahrscheinlichkeit = relikteWahrscheinlichkeit();
  const saat = (seed ^ URSPRUNG_SAAT_MASKE) >>> 0;
  for (const ort of ursprungsOrteUm(seed, position.x, position.y)) {
    const rng = stromFuer(saat, Math.imul(systemId, RELIKT_PRIMZAHL_SYSTEM) + Math.imul(ort.schluessel, RELIKT_PRIMZAHL_ORT));
    if (rng() >= wahrscheinlichkeit) continue;
    const abstandAE = abstand(rng);
    const waechter = rng() < URSPRUNG_WAECHTER_ANTEIL;
    // Ein Zeitalter je Ort: das Alter des Ortes, gestreut um ± URSPRUNG_ALTER_STREUUNG
    // (multiplikativ, wie ein Alter über Größenordnungen streut).
    const faktor = Math.exp((rng() * 2 - 1) * Math.log(1 + URSPRUNG_ALTER_STREUUNG));
    const alterJahre = Math.round(Math.min(URSPRUNG_ALTER_MAX_JAHRE, Math.max(URSPRUNG_ALTER_MIN_JAHRE, ort.alterJahre * faktor)));
    const herkunft = { ursprung: ort.name, zweck: ort.zweck, bauherr: ort.bauherr, alterJahre };
    if (waechter) {
      // Struktur mit Wächterflotte, ohne Schloss (`benoetigt` leer) -- die Flotte ist
      // die Sperre (A-329); Flotte und Ertrag wie die der früheren Drohnen.
      eintraege.push({
        abstandAE,
        typ: "struktur",
        bezeichnung: WAECHTER_RELIKT_ART,
        bewacht: true,
        daten: {
          flotte: { kriegsschiff: zwischen(rng, 2, 7) },
          ertrag: { metall: mengeSkaliert(zwischen(rng, 800, 3000)), silizium: mengeSkaliert(zwischen(rng, 400, 1800)) },
          ...herkunft,
        },
      });
    } else {
      eintraege.push({
        abstandAE,
        typ: "struktur",
        // EIN Zug, wie vor A-335 (waehle zog ebenfalls einen): Abstand, Forschung, Ertrag bleiben.
        bezeichnung: gewichtetWaehlen(rng, STRUKTUR_NACH_ZWECK.get(ort.zweck)).art,
        benoetigt: { forschung: waehle(rng, ENTDECKBARE_FORSCHUNGEN) },
        daten: {
          ertrag: { metall: mengeSkaliert(zwischen(rng, 1500, 4000)), silizium: mengeSkaliert(zwischen(rng, 1200, 3000)) },
          ...herkunft,
        },
      });
    }
  }
  return eintraege;
}

/**
 * Erzeugt die Roh-Einträge der Reiche-Schicht eines Systems, in der
 * Reihenfolge Schlüssel-Anomalien, Zusatz-Anomalien, Wracks, Strukturen,
 * bewachte Orte, leere Plätze (so ordnet systemGenerieren bei gleichem Abstand).
 * @param seed        Galaxie-Saat
 * @param systemId    Systemnummer
 * @param rahmen      { innenkanteAE, aussenkanteAE } -- was die Natur berechnet
 *                    hat; ein S-Typ-Doppelstern liegt damit innerhalb seiner
 *                    Stabilitätsgrenze
 * @param schluessel  [techId...], die das System laut Galaxieplan hergibt
 * @param zone        { reich } -- der Index des nächsten Reiches (0 = Spieler), wenn
 *                    das System in der Zone eines Reiches liegt, sonst null (A-332).
 *                    Als PARAMETER, nicht als Import: dieses Modul liest nichts aus
 *                    welt.js (A-331); welt.js rechnet die Zone aus `reicheHeimaten`.
 *                    Ohne Zone gibt es kein Wrack und keinen Piratenposten.
 * @param position    { x, y } -- die Lage des Systems in der Galaxie (A-334). Ohne sie
 *                    gibt es keine Relikte: sie liegen an Ursprungs-Orten.
 * @returns [{ abstandAE, typ, bezeichnung, benoetigt?, bewacht?, daten }]
 */
export function reicheOrteGenerieren(seed, systemId, rahmen, schluessel = [], zone = null, position = null) {
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
  const zusatzAnzahl = ausBereich(zusatzRng, SYSTEM_REGELN.vorkommen.anomalieExtra);
  for (let i = 0; i < zusatzAnzahl; i++) {
    reiche.push({
      abstandAE: abstand(zusatzRng),
      typ: "anomalie",
      bezeichnung: waehle(zusatzRng, ANOMALIE_ARTEN),
      daten: {},
    });
  }

  // Wracks (A-332): nur in einer Zone. Die Zahl ist die der gescheiterten
  // Erstflug-Versuche vor dem ersten gelungenen -- ein Zug je Versuch. Ort und
  // Alter ziehen danach aus demselben Strom; die verworfenen Züge der alten
  // Würfel (A-326) entfallen, die Orte der Wracks in einer Zone dürfen sich
  // ändern, jede andere Art bleibt, wo sie war (eigene Ströme).
  if (zone) {
    const wrackRng = strom("wrack");
    let wrackAnzahl = 0;
    // (die Grenze schützt nur gegen eine Verlustrate von 1 oder mehr)
    while (wrackAnzahl < 1000 && wrackRng() < WRACK_VERLUST_JE_ERSTFLUG) wrackAnzahl++;
    const alterMax = alterRaumfahrtJahre();
    for (let i = 0; i < wrackAnzahl; i++) {
      const abstandAE = abstand(wrackRng);
      const alterJahre = Math.floor(wrackRng() * (alterMax + 1));
      const bezeichnung = WRACK_ARTEN[0];
      const schiff = WRACK_SCHIFF[bezeichnung];
      reiche.push({
        abstandAE,
        typ: "wrack",
        bezeichnung,
        daten: { schiff, ertrag: schrottVon(schiff), herkunft: zone.reich, alterJahre },
      });
    }
  }

  // Relikte an Ursprungs-Orten (A-334): Strukturen und Wächter-Relikte.
  if (position) reiche.push(...reliktEintraege(seed, systemId, position, abstand));

  // Bewachte Orte: alle Züge in der Reihenfolge der alten Kategorie (Abstand,
  // Art, Flotte, zwei Ertragszüge), auch die der verworfenen Arten -- und (A-333)
  // die eines Piratenpostens außerhalb einer Zone, der dann nicht eingetragen wird,
  // und (A-334) die einer Drohne, die kein Eintrag mehr ist.
  const bewachtRng = strom("bewacht");
  const postenAlterRng = strom("postenAlter");
  const bewachtAnzahl = ausBereich(bewachtRng, SYSTEM_REGELN.vorkommen.bewacht);
  for (let i = 0; i < bewachtAnzahl; i++) {
    const abstandAE = abstand(bewachtRng);
    const wurf = waehle(bewachtRng, BEWACHT_WURF);
    const daten = {
      flotte: { kriegsschiff: zwischen(bewachtRng, 2, 7) },
      ertrag: { metall: mengeSkaliert(zwischen(bewachtRng, 800, 3000)), silizium: mengeSkaliert(zwischen(bewachtRng, 400, 1800)) },
    };
    if (wurf === "piratenposten") {
      // A-333: nur in einer Zone, mit Herkunft und Alter.
      if (zone) {
        const alterJahre = Math.floor(postenAlterRng() * (alterRaumfahrtJahre() + 1));
        reiche.push({
          abstandAE,
          typ: "piratenposten",
          bezeichnung: PIRATENPOSTEN_ART,
          bewacht: true,
          daten: { ...daten, herkunft: zone.reich, alterJahre },
        });
      }
    }
  }

  // Platzhalter der Reiche-Schicht (Tobi 29.09., Leere Orbits (b)): keine
  // Natur, aber der Bauplatz, auf dem Piraten gründen (simulation.js).
  const leerRng = strom("leer");
  const leerAnzahl = ausBereich(leerRng, SYSTEM_REGELN.vorkommen.leer);
  for (let i = 0; i < leerAnzahl; i++) {
    reiche.push({ abstandAE: abstand(leerRng), typ: "leer", bezeichnung: LEERER_ORBIT, daten: {} });
  }

  return reiche;
}
