// Persistenz: Spielstand in localStorage speichern/laden.

import {
  neuesSpiel,
  SAVE_VERSION,
  meldungHinzufuegen,
  meldungenNummerieren,
  momenteNachziehen,
  pauseNachziehen,
  speicherbarerVersatz,
  spielDatum,
  vollerFossilVorrat,
} from "./state.js";
import { piratenWeltStart, botWeltStart, piratenNamenNachziehen } from "./simulation.js";
import { notausgangLoeschen } from "./aufholen.js";
import { DEMO_SAAT, VERSION } from "./data.js";
import { t } from "./sprache.js";
import { startschwierigkeit } from "./schwierigkeit.js";

const STORAGE_KEY = "entropy-save";

// Ein nicht mehr passender Stand wird hierher gerettet, statt ihn wegzuwerfen:
// laden() verwirft ihn beim Versionssprung, und der erste speichern() danach
// überschreibt ihn endgültig -- ein Sprung in SAVE_VERSION war damit ein
// lautloser Totalverlust. Die Kennung im Namen sagt, woher der Stand stammt.
const SICHERUNG_PRAEFIX = "entropy-save-alt-";

// Eine neue Welt besteht aus mehr als dem Spieler: alle Piratengruppen der
// Galaxie werden mit angelegt, damit die Welt AUCH OHNE SPIELER läuft. Das
// ist Tobis Vorgabe ("mit null, einem oder hundert Spielern") und gleichzeitig
// die Voraussetzung dafür, eine Galaxie im Schnelldurchlauf beobachten zu
// können -- siehe tests/weltlauf.mjs.
//
// Steht hier und nicht in neuesSpiel(), weil state.js die Simulation nicht
// kennen darf (sie kennt umgekehrt den State).
function neueWelt() {
  // DEMO_SAAT statt Zufall: die Demo läuft auf einer festen, geprüften
  // Galaxie (Tobis Entscheidung, Begründung und Messwerte in data.js).
  // Steht `null` dort, wird wie früher gewürfelt.
  //
  // A-190: die Zone/Wasser-Kombination der Heimatwelt kommt zusätzlich aus
  // der gespeicherten Startschwierigkeit (js/schwierigkeit.js) -- derselbe
  // Seed erzeugt damit je nach Wahl eine andere Heimatwelt, der Rest der
  // Galaxie (Nachbarsysteme, sterbender Stern) bleibt unverändert.
  const state = neuesSpiel(DEMO_SAAT ?? undefined, startschwierigkeit());
  // Reihenfolge: erst die Imperien, dann die Raeuber -- die Piraten setzen
  // sich in Systeme, in denen noch niemand sitzt.
  botWeltStart(state);
  piratenWeltStart(state);
  return state;
}

// Ein verlorener Spielstand darf nicht nur in der Konsole stehen: sonst sitzt
// der Spieler ohne Erklärung vor einem leeren Imperium und hält das Spiel für
// kaputt. Die Meldung sagt ihm auch, dass die Sicherung existiert.
function neustartNach(text) {
  const state = neueWelt();
  meldungHinzufuegen(state, text);
  return state;
}

// Es bleibt immer nur EINE Sicherung liegen: zwei alte Stände zu je rund 2 MB
// sprengen die etwa 5 MB von localStorage -- die Rettung würde dann genau das
// Speichern verhindern, für das sie da ist.
function altenStandSichern(raw, kennung) {
  sicherungenLoeschen();
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(SICHERUNG_PRAEFIX + kennung, raw);
  } catch {
    // Kein Platz für die Sicherung: der Neuanfang läuft trotzdem weiter.
  }
}

function sicherungenLoeschen() {
  try {
    if (typeof localStorage === "undefined") return;
    // Object.keys liefert eine Kopie -- Löschen währenddessen ist gefahrlos.
    for (const schluessel of Object.keys(localStorage)) {
      if (schluessel.startsWith(SICHERUNG_PRAEFIX)) localStorage.removeItem(schluessel);
    }
  } catch {
    // Auch das Aufräumen darf nie der Grund sein, warum nichts mehr läuft.
  }
}

// A-184: der Lese-Gegenpart zu altenStandSichern. Es liegt laut Kommentar
// oben IMMER NUR EINE Sicherung -- die erste passende Kennung reicht also.
// `kennung` ist entweder eine Versionszahl als String (laden(), nach einer
// Migration), "unlesbar" (laden(), kaputter Stand) oder "ersetzt"
// (standUebernehmen()) -- dieselben drei Werte, mit denen altenStandSichern
// weiter oben aufgerufen wird.
//
// Bewusst KEIN Einspielweg: dieser Export legt den Rohtext nur offen, damit
// die Oberfläche ihn ins vorhandene Textfeld legen kann. Übernommen wird er
// weiterhin ausschließlich über den bestehenden "Einspielen"-Knopf und damit
// über denselben Filter wie jeder fremde Text (standPruefen, A-173) -- kein
// zweiter Schreibweg, keine zweite Sicherheitsstelle.
export function sicherungLesen() {
  try {
    if (typeof localStorage === "undefined") return { vorhanden: false };
    for (const schluessel of Object.keys(localStorage)) {
      if (!schluessel.startsWith(SICHERUNG_PRAEFIX)) continue;
      const text = localStorage.getItem(schluessel);
      if (text === null) continue;
      return { vorhanden: true, kennung: schluessel.slice(SICHERUNG_PRAEFIX.length), text };
    }
    return { vorhanden: false };
  } catch {
    return { vorhanden: false }; // z.B. blockierter Speicher -- dieselbe stumme Duldung wie sicherungenLoeschen
  }
}

// --- Migration (A-141) ------------------------------------------------------
//
// Bis hierher wies laden() JEDEN Stand mit abweichender SAVE_VERSION hart ab
// (Sicherung, neues Spiel) -- ein Sprung in SAVE_VERSION setzte damit JEDEN
// Testerstand zurück, egal wie klein die eigentliche Änderung war. Der
// Sammel-Sprung (AUFTRAEGE/SAMMEL-SPRUNG.md) steht seit dem 18.08. an und
// braucht genau das nicht mehr: einen Weg, auf dem ein alter Stand auf den
// neuesten Stand angehoben statt weggeworfen wird.
//
// Reine Daten plus Funktion, EIN Ort (siehe Auftrag): wer eine Version
// anhebt, trägt hier eine Zeile ein, sonst nirgends. Schlüssel ist die
// AUSGANGSversion, jeder Eintrag hebt einen Stand um GENAU EINE Version an
// und gibt ihn zurück -- nie mehr, nie weniger, sonst überspringt die Kette
// unten ein Glied, ohne dass es das Fehlermuster (Prüfung in migrationsKette)
// bemerken könnte.
//
// 31 -> 32 TUT NICHTS außer die Versionsnummer anzuheben. Das ist Absicht
// (siehe Auftrag): dieser Eintrag ist der Testfall für die Kette SELBST --
// eine Migration, die zusammen mit der ersten echten Datenänderung entstünde,
// ließe sich nicht sauber prüfen, man wüsste nie, ob der Weg oder die
// Umrechnung schuld ist. Er ist außerdem der Platzhalter, den der
// Sammel-Sprung später mit echtem Inhalt füllt (die vier Punkte aus
// SAMMEL-SPRUNG.md -- unangetastet, das ist eigene Arbeit).
// 32 -> 33 (A-164, die Maßstabsrunde): der Sammel-Sprung, den der 31->32-
// Platzhalter oben vorbereitet hat, bekommt jetzt echten Inhalt.
//
// Bestände und Kapazitäten aller Lagerressourcen tragen den MASSSTAB-Sprung
// nach -- dieselbe Rechnung, die MASSSTAB beim Laden für eine FRISCHE Welt
// macht (js/data.js). Bevölkerung ist zusätzlich kein Material, sondern ein
// MENSCH (siehe js/data.js, "Die drei Maßstäbe") und trägt deshalb obendrauf
// den Menschen-Faktor. Gebäudestufen bleiben unverändert -- ein alter Stand
// behält seine Stufen, die neuen Startstufen (START.startstufenHeimatwelt)
// gelten nur für neu erzeugte Welten. Herleitung und Zielwerte:
// AUFTRAEGE/A-164-massstabsrunde.md Abschnitt 4, AUFTRAEGE/ENTWURF-MASSSTAB.md.
//
// Die beiden Faktoren stehen hier bewusst als LITERALE Zahlen, nicht als
// Import von MASSSTAB/MENSCHEN_FAKTOR aus data.js: eine Migration ist ein
// historischer Schnappschuss des Sprungs, der damals stattfand. Zöge sie den
// LEBENDEN Wert, würde eine spätere Maßstabsrunde diesen Schritt rückwirkend
// umdeuten -- derselbe Grund, aus dem der 31->32-Eintrag oben "32" statt
// SAVE_VERSION schreibt.
// 33 -> 34 (A-196, 04.09.2026): FOSSIL_VORRAT_BASIS hing bis hierhin an
// Stufe 1, die Startstufe der Fossilanlage stand seit A-164 aber schon bei
// 17 (Faktor 159,08 mehr Verbrauch). Jeder gespeicherte fossilVorrat war
// damit gegen eine 159-fach zu kleine Basis verbucht -- praktisch jede
// laufende Partie stand bei 0, unabhängig von Spielzeit oder Stufe. Ein
// Anteil des Reststands trüge deshalb keine Information (ein Anteil von 0
// bleibt 0); jeder Planet bekommt seinen vollen, an der KORRIGIERTEN Basis
// hergeleiteten Vorrat -- dieselbe Rechnung wie `neuerPlanet` für eine
// frische Welt (`vollerFossilVorrat`, js/state.js), NICHT die literale
// A164-Sprung-Handschrift der Migration darüber: die Vorratsherleitung ist
// keine Konstante aus einem historischen Moment, sondern folgt bewusst der
// LEBENDEN FOSSIL_VORRAT_BASIS -- genau das war der Fehler, den A-196 behebt.
const MASSSTAB_SPRUNG_A164 = 2500; // 125.000 / 50
const MENSCHEN_FAKTOR_A164 = 24;
const MIGRATIONEN = {
  31: (stand) => ({ ...stand, version: 32 }),
  32: (stand) => ({
    ...stand,
    version: 33,
    planeten: (stand.planeten || []).map((planet) => {
      if (!planet.ressourcen) return planet;
      const ressourcen = {};
      for (const [resId, menge] of Object.entries(planet.ressourcen)) {
        const zusatz = resId === "bevoelkerung" ? MENSCHEN_FAKTOR_A164 : 1;
        ressourcen[resId] = Math.round(menge * MASSSTAB_SPRUNG_A164 * zusatz);
      }
      return { ...planet, ressourcen };
    }),
  }),
  33: (stand) => ({
    ...stand,
    version: 34,
    planeten: (stand.planeten || []).map((planet) => ({
      ...planet,
      fossilVorrat: vollerFossilVorrat(planet),
    })),
  }),
};

// Schickt einen Stand Schritt für Schritt durch eine Migrationstabelle, bis
// er auf `zielVersion` steht -- oder gibt `null` zurück, sobald ein Glied
// fehlt (derselbe Fall wie "gar keine Migration da", der Aufrufer weist dann
// wie bisher ab).
//
// BEWUSST GENERISCH (Tabelle und Ziel als Parameter, nicht MIGRATIONEN/
// SAVE_VERSION direkt gelesen) und OHNE Seiteneffekt: nur so kann
// tests/migration.test.js die Kette selbst über mehrere Glieder prüfen (Fertig-
// Kriterium 5), ohne die echte Tabelle um Testeinträge zu erweitern, die
// dann versehentlich mit ausgeliefert würden. `laden()` ruft sie unten mit
// der echten Tabelle auf.
//
// Ohne Seiteneffekt heißt auch: kein Schreiben, keine Sicherung hier drin --
// die besorgt der Aufrufer VOR diesem Aufruf (siehe laden()), damit ein
// Stand, an dem die Kette abbricht oder falsch rechnet, nicht verloren ist.
export function migrationsKette(stand, migrationen, zielVersion) {
  let aktuell = stand;
  let schritte = 0;
  while (aktuell.version < zielVersion) {
    const schritt = migrationen[aktuell.version];
    if (!schritt) return null; // fehlendes Glied -- der Aufrufer weist ab wie bisher
    const vorherigeVersion = aktuell.version;
    aktuell = schritt(aktuell);
    // Vertragsbruch einer einzelnen Migration (siehe MIGRATIONEN-Kommentar:
    // "GENAU EINE Version"). Lieber laut scheitern als eine Endlosschleife
    // oder -- schlimmer -- einen halb migrierten Stand durchreichen.
    //
    // Bewusst ohne t(): dieser Wurf bezeugt einen Programmierfehler in einer
    // MIGRATIONEN-Zeile, der nie in einer ausgelieferten Migration vorkommen
    // soll -- kein Text, den ein Spieler je sieht (derselbe Grund wie bei den
    // Konsolenzeilen in zuruecksetzen()/standUebernehmen() weiter oben). Der
    // Wortlaut ist zusätzlich bewusst so gewählt, dass tests/uebersetzung.mjs
    // ihn nicht als Anzeigetext meldet -- eine echte deutsche Fehlermeldung
    // bräuchte sonst einen Eintrag in texte.js, den keine Sprache je zeigt.
    if (!aktuell || aktuell.version !== vorherigeVersion + 1) {
      throw new Error(
        `Migrationsschritt ${vorherigeVersion} lieferte Version ${aktuell && aktuell.version}, erwartet war ${vorherigeVersion + 1}.`
      );
    }
    // Backstop gegen einen Zyklus in einer künftigen Migrationstabelle --
    // 1000 Versionssprünge sind auf absehbare Zeit unerreichbar (SAVE_VERSION
    // steht bei 32 und steigt vielleicht alle paar Wochen um eins). Ebenfalls
    // bewusst ohne t(), aus demselben Grund.
    if (++schritte > 1000) throw new Error("Migrationskette lief zu lange, vermutlich Zyklus.");
  }
  return aktuell;
}

export function laden() {
  let raw = null;
  try {
    raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    // Im privaten Modus wirft schon das LESEN. Ohne dieses catch endet der
    // Modulstart in dieser Zeile und der Spieler sieht eine weiße Seite. Ein
    // neues Spiel ohne Speicherung ist immer noch ein Spiel.
    raw = null;
  }
  if (!raw) return neueWelt();
  try {
    let state = JSON.parse(raw);
    if (state.version !== SAVE_VERSION) {
      // Die Sicherung läuft VOR der Migration, nicht statt ihr (A-141): wer
      // migriert, kann zurück -- das ist die Rettungsleine für den Fall, dass
      // eine Umrechnung falsch ist. Sie lief hier schon immer für JEDEN
      // Versions-Mismatch, das ändert sich nicht.
      altenStandSichern(raw, state.version ?? "unbekannt");
      // Rückwärts migriert niemand (ein Stand aus der ZUKUNFT, version >
      // SAVE_VERSION, hat in MIGRATIONEN nie ein passendes Glied und fällt
      // damit von selbst auf denselben Abweis-Weg wie bisher).
      const migriert = state.version < SAVE_VERSION ? migrationsKette(state, MIGRATIONEN, SAVE_VERSION) : null;
      if (!migriert) {
        console.warn(t("Speicherstand-Version passt nicht, starte neues Spiel."));
        return neustartNach(
          t("Der alte Spielstand stammt aus einer früheren Version – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.")
        );
      }
      state = migriert;
    }
    // Nachtragen, was ein älterer Stand noch nicht hatte. Bewusst HIER und
    // nicht bei jedem Zugriff: eine Stelle, die einmal läuft, statt einer
    // Bedingung an fünfzig Stellen (A-040).
    meldungenNummerieren(state);
    // Piratengruppen aus der Zeit vor A-031 heissen nach ihrem Orbitobjekt --
    // im Log liest sich das wie ein Naturereignis, das Flotten angreift.
    piratenNamenNachziehen(state);
    // Eine Pause aus dem Testmodus ueberdauert das Neuladen (A-038).
    pauseNachziehen(state);
    // Wer einen Moment schon hinter sich hat, bekommt seine Erklärung nicht
    // nachträglich (A-060). Muss VOR dem ersten Takt laufen -- der würde sie
    // sonst sofort schreiben.
    momenteNachziehen(state);
    return state;
  } catch (e) {
    altenStandSichern(raw, "unlesbar");
    console.error(t("Speicherstand konnte nicht gelesen werden, starte neues Spiel."), e);
    return neustartNach(
      t("Der alte Spielstand war nicht lesbar – er liegt als Sicherung im Browserspeicher, das Spiel beginnt neu.")
    );
  }
}

// Nach einem Zurücksetzen darf NICHTS mehr geschrieben werden. Ohne diese
// Sperre hat der Reset nie funktioniert: zuruecksetzen() löschte den Eintrag,
// das anschließende location.reload() löste beforeunload aus, und der dort
// hängende speichern()-Aufruf schrieb den alten Zustand sofort zurück.
// Dass Spielstände beim Entwickeln trotzdem neu anfingen, lag allein an den
// SAVE_VERSION-Sprüngen in laden(), nicht am Reset.
let gesperrt = false;

export function speichern(state) {
  if (gesperrt) return;
  try {
    // A-048: der Zeitversatz geht nur so weit hinaus, wie die Uhr ihn
    // eingeholt hat. Begründung und Formel stehen bei `speicherbarerVersatz`.
    //
    // Über eine flache Kopie, NICHT am laufenden Zustand: eine Aufholung, die
    // gerade rechnet, braucht ihren vollen Versatz weiter. Die Kopie legt nur
    // die oberste Ebene neu an, alles darunter bleibt dieselbe Referenz --
    // bei zwei Megabyte Spielstand ist das der Unterschied zwischen einer
    // Zuweisung und einer Verdopplung.
    //
    // Beides steckt seit A-073 in `hinausKopie` (weiter unten): der Export
    // schreibt denselben Stand, und diese Regel zweimal zu pflegen ginge
    // genau einmal gut.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hinausKopie(state)));
  } catch (e) {
    // Anlass: dieser Aufruf stand beim Start VOR den setInterval-Zeilen in
    // main.js. Ein Wurf hier -- volles localStorage (rund 5 MB Quota, ein
    // Stand wiegt schon etwa 2 MB) oder gesperrter Speicher -- hat damit die
    // Tick-Schleife nie starten lassen: ein eingefrorenes Spiel, ohne dass
    // irgendwo etwas stand. Deshalb wird hier gemeldet statt geschluckt.
    sicherungenLoeschen(); // Beiwerk zuerst: der Versuch in 10 Sekunden hat wieder Platz
    const meldung = t("Spielstand konnte nicht gespeichert werden – der Browserspeicher ist voll oder gesperrt.");
    console.error(meldung, e);
    // Gruppiert: sonst schreibt jeder Autosave-Takt eine eigene Zeile.
    meldungHinzufuegen(state, meldung, "speicherfehler");
  }
}

export function zuruecksetzen() {
  gesperrt = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    // A-046, Falle 1: der Notausgang-Marker läuft am Spielstand vorbei und
    // muss deshalb hier ausdrücklich mit weg. Bliebe er stehen, zeigte ein
    // FRISCHES Spiel die Tafel für ein Problem, das mit dem alten Stand
    // verschwunden ist.
    notausgangLoeschen();
    // A-184 (Tobis Weg 1): die Sicherung jetzt lesbar zu machen (s.o.) ist
    // nur die halbe Regel -- die Gegenleistung ist, dass ein Zurücksetzen sie
    // wirklich mit wegräumt. Nach dieser Zeile ist bewusst nichts mehr da.
    sicherungenLoeschen();
  } catch (e) {
    // Wirft das Löschen, bliebe das location.reload() im Aufrufer aus -- und
    // zurück bliebe ein laufendes Spiel mit gesetzter Sperre, das nie wieder
    // speichert, ohne dass jemand es merkt. Genau der stille Ausfall.
    // Bewusst ohne t(): diese Zeile sieht nur die Konsole, der Spieler ist
    // gleich in einem neu geladenen Spiel.
    console.error("zuruecksetzen: localStorage blockiert", e);
  }
}

// --- Spielstand aus dem Browser holen und zurückgeben (A-073) -------------
//
// WARUM ES DAS GIBT: localStorage gehört dem Browser, nicht dem Spieler. Er
// löscht ihn beim Aufräumen der Chronik, im Privatmodus ohnehin, und unter
// Speicherdruck auch ungefragt. Ein Tester hat auf diesem Weg real einen
// Stand verloren (18.08.). Dagegen hilft keine noch so sorgfältige
// Speicherroutine -- nur eine Kopie, die beim Spieler liegt.
//
// Der Export ist deshalb bewusst TEXT und keine Datei-API: ein Textfeld kann
// jeder kopieren, in eine Mail legen, in ein Dokument werfen. Der Download
// daneben ist Bequemlichkeit, nicht die Grundlösung.
//
// DER IMPORT IST DER GEFÄHRLICHE TEIL, und er hat genau einen Ladeweg: er
// prüft den Text, sichert den alten Stand, schreibt den neuen an dieselbe
// Stelle, an die `speichern` schreibt -- und überlässt das Laden danach
// `laden()`. Es gibt keinen zweiten Ladepfad mit eigener (also irgendwann
// abweichender) Validierung.
export const EXPORT_KENNUNG = "entropy-spielstand";

// Was gespeichert wird, ist an ZWEI Stellen dasselbe: hier und in
// `speichern`. Deshalb steht es in einer Funktion -- zwei Kopien derselben
// Regel driften auseinander, und die Regel selbst (A-048, gedeckelter
// Zeitversatz) ist keine, die man zweimal richtig hinschreiben will.
function hinausKopie(state) {
  return { ...state, testZeitOffsetMs: speicherbarerVersatz(state) };
}

// Der Kopf über dem Stand ist KEIN zweites Speicherformat: `stand` ist
// zeichengleich das, was in localStorage steht. Der Kopf sagt nur, woher der
// Text kommt -- das unterscheidet einen Spielstand von einer beliebigen
// eingefügten JSON-Datei und nennt die Spielversion, die ihn geschrieben hat.
export function standAlsText(state) {
  return JSON.stringify({
    kennung: EXPORT_KENNUNG,
    spiel: VERSION,
    version: SAVE_VERSION,
    stand: hinausKopie(state),
  });
}

// Ein Dateiname, an dem man später erkennt, welcher Stand das war.
// Das Ingame-Datum steht drin und nicht die Wanduhr: „Jahr 25" sagt einem
// Spieler etwas, „14:07 Uhr" sagt ihm nichts über seinen Stand.
export function standDateiname(state) {
  const jahr = spielDatum(state).jahr;
  return `entropy-v${VERSION}-jahr${jahr}.txt`;
}

// Prüft einen eingefügten Text, OHNE irgendetwas zu verändern. Gibt entweder
// `{ ok: true, stand, spiel }` zurück oder `{ ok: false, grund, text }` --
// `grund` ist die Kennung für Tests, `text` die Zeile für den Spieler.
//
// Die Prüfung ist bewusst kleinlich, denn sie ist die einzige Stelle, an der
// ein falscher Text noch folgenlos abprallen kann. Danach wird geschrieben.
export function standPruefen(text) {
  const roh = typeof text === "string" ? text.trim() : "";
  if (!roh) return { ok: false, grund: "leer", text: t("Kein Text eingefügt.") };

  let gelesen;
  try {
    gelesen = JSON.parse(roh);
  } catch {
    return {
      ok: false,
      grund: "unlesbar",
      text: t("Das ist kein Spielstand – der Text ließ sich nicht lesen. Beim Kopieren nichts weglassen, auch nicht die Klammern am Anfang und Ende."),
    };
  }
  if (!gelesen || typeof gelesen !== "object") {
    return { ok: false, grund: "unlesbar", text: t("Das ist kein Spielstand.") };
  }

  // Zwei zulässige Formen: der Export mit Kopf, und der nackte Inhalt des
  // Browserspeichers (wer sich seinen Stand aus der Entwicklerkonsole holt,
  // hat genau den in der Hand). Es bleibt EINE Prüfung -- nur das Auspacken
  // unterscheidet sich.
  const stand = gelesen.kennung === EXPORT_KENNUNG && gelesen.stand ? gelesen.stand : gelesen;
  const spiel = gelesen.kennung === EXPORT_KENNUNG ? gelesen.spiel : null;

  if (!stand || typeof stand !== "object" || stand.version === undefined) {
    return { ok: false, grund: "fremd", text: t("Das ist zwar lesbarer Text, aber kein Spielstand dieses Spiels.") };
  }
  // Ein Stand aus einer älteren Weltgenerierung wird hier ABGEWIESEN und nicht
  // durchgereicht: `laden()` würde ihn beiseitelegen und ein neues Spiel
  // beginnen -- ein Import, der die laufende Partie gegen eine leere Welt
  // tauscht, wäre die schlimmste denkbare Antwort auf „stell meinen Stand her".
  if (stand.version !== SAVE_VERSION) {
    return {
      ok: false,
      grund: "version",
      text: t("Dieser Stand stammt aus einer älteren Fassung des Spiels (Format {alt}, gebraucht wird {neu}) und lässt sich nicht mehr laden.", {
        alt: stand.version,
        neu: SAVE_VERSION,
      }),
    };
  }
  if (!Array.isArray(stand.planeten) || stand.planeten.length === 0 || !stand.galaxie || typeof stand.letzterTick !== "number") {
    return { ok: false, grund: "unvollstaendig", text: t("Der Spielstand ist unvollständig – vermutlich wurde beim Kopieren ein Teil abgeschnitten.") };
  }
  return { ok: true, stand, spiel };
}

// Übernimmt einen geprüften Stand. Reihenfolge ist hier alles:
//
//   1. prüfen -- schlägt das fehl, ist NICHTS passiert
//   2. den laufenden Stand in die Rettungs-Sicherung legen (dieselbe eine
//      Sicherung, die auch der Versionssprung benutzt -- zwei Stände zu je
//      rund 2 MB sprengen die 5 MB von localStorage)
//   3. erst jetzt überschreiben
//   4. das Speichern sperren
//
// Schritt 4 ist der, den man vergisst: `main.js` hängt ein `speichern` an
// `beforeunload`, und das Neuladen nach dem Import löst es aus. Ohne die
// Sperre schriebe der LAUFENDE Zustand den frisch eingespielten sofort wieder
// zu -- der Import sähe aus, als hätte er nichts getan. Genau dieser Fehler
// steckte schon einmal im Zurücksetzen (siehe `gesperrt`).
export function standUebernehmen(text) {
  const geprueft = standPruefen(text);
  if (!geprueft.ok) return geprueft;
  try {
    const alt = localStorage.getItem(STORAGE_KEY);
    if (alt) altenStandSichern(alt, "ersetzt");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geprueft.stand));
  } catch (e) {
    console.error("standUebernehmen: localStorage blockiert", e);
    return {
      ok: false,
      grund: "speicher",
      text: t("Spielstand konnte nicht gespeichert werden – der Browserspeicher ist voll oder gesperrt."),
    };
  }
  gesperrt = true;
  return { ok: true, spiel: geprueft.spiel };
}
