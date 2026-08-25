// Das Handbuch -- Tobis Vorgabe für den Ersteinstieg (16.08.2026):
//
//   "Führung anbieten. Führen aber durch Erklärung wie das Spiel funktioniert.
//    Keine Schritt für Schritt Anleitung. Die Infos jederzeit in einem eigenen
//    Tab abrufbar."
//
// Daraus folgt die Form: kein Tutorial, das dem Spieler sagt, was er als
// Nächstes klicken soll, sondern ein Nachschlagewerk, das erklärt, wie die
// Welt funktioniert. Wer es nicht liest, verliert nichts als Zeit; wer es
// liest, versteht warum -- und genau das ist der Wiederspielwert, den Tobi am
// Frühspiel gelobt hat ("solche Kniffe, die man lernen kann").
//
// WARUM EINE FUNKTION UND KEINE TABELLE AUF MODULEBENE: eine Tabelle mit
// fertigen Zeichenketten würde beim Laden EINMAL übersetzt und bliebe danach
// in der Startsprache stehen. Das ist eine bekannte Falle dieses Projekts
// (siehe sprache.js). Deshalb wird der Inhalt bei jedem Aufruf neu gebaut.
//
// WAS HIER NICHT HINEINGEHÖRT: Zahlen, die sich beim Balancing ändern. Der
// Text erklärt Zusammenhänge ("ein Schirm dominiert den Energiehaushalt"),
// nicht Werte ("er kostet 400.000 Metall) -- sonst lügt das Handbuch beim
// ersten Balancing-Durchgang, und niemand merkt es. Die einzigen Zahlen, die
// hier stehen dürfen, sind die, die aus der Physik folgen und deshalb fest
// sind: der Zeitmaßstab und die Frist.

import { t } from "./sprache.js";
import { feedbackAdresse } from "./feedback.js";

export function handbuchAbschnitte() {
  return [
    {
      id: "ziel",
      titel: t("Worum es geht"),
      // `erststart` benennt den Absatz, den das Erklärfenster beim allerersten
      // Start übernimmt (siehe erststartTafel unten). Der Zeiger steht HIER,
      // beim Text, und nicht dort: sonst gäbe es zwei Stellen, an denen
      // dasselbe steht, und die eine würde beim nächsten Umschreiben
      // vergessen. Das Fenster zitiert das Handbuch, es schreibt es nicht ab.
      erststart: 3,
      absaetze: [
        t(
          "Am Himmel steht ein Stern, der sterben wird. Das Neutrino-Observatorium liest die Brennstufe in seinem Kern und kann daraus ablesen, wann er kollabiert – das ist keine Prophezeiung, sondern gerechnete Astrophysik: die Brennstufen eines massereichen Sterns haben bekannte Dauern."
        ),
        t(
          "Wenn er kollabiert, geschieht zweierlei, und zwar zu sehr verschiedenen Zeiten. Zuerst kommt der Blitz, mit dem Licht. Er tötet niemanden – Wohnmodule sind versiegelt –, aber er zerlegt die Ozonschicht und damit das Einzige auf der Oberfläche, das Sonnenlicht braucht: die Landwirtschaft."
        ),
        t(
          "Jahrhunderte später trifft die Teilchenflut ein. Sie ist der eigentliche Weltenkiller, sie bleibt Jahrtausende, und sie ist der Grund, warum es in diesem Spiel überhaupt etwas zu gewinnen gibt."
        ),
        t(
          "Deine Aufgabe ist nicht, die Supernova aufzuhalten. Das kann nichts. Deine Aufgabe ist, dass deine Welten das Jahrhundert danach überleben."
        ),
      ],
    },
    {
      id: "zeit",
      titel: t("Wie Zeit hier funktioniert"),
      // ZWEI Absätze gehen von hier ins Erklärfenster (A-059). Absatz 2 ist
      // der, der einem Neuling am ehesten fehlt, bevor er zum ersten Mal den
      // Rechner zuklappt. Absatz 3 ist neu und sagt, WAS FÜR EIN SPIEL das
      // hier ist -- Chris hat mehrfach neu gestartet, weil er die Langsamkeit
      // für seinen Fehler hielt („wasn't sure how idle it was supposed to
      // be"). Das ist keine Balancing-Frage, sondern eine unbeantwortete.
      erststart: [2, 3],
      absaetze: [
        t(
          "Eine Sekunde am Bildschirm ist ein Tag in der Welt. Das ist kein gewählter Trick, sondern folgt aus der Bevölkerung: sie ist die einzige Größe, deren echte Rate keine Technologie verschiebt. Setzt man ihr Wachstum auf einen realistischen Wert, ergibt sich dieser Maßstab von selbst."
        ),
        t(
          "Alles Weitere folgt daraus. Eine Stunde vor dem Bildschirm sind rund zehn Spieljahre. Produktionsangaben pro Jahr meinen also Spieljahre, nicht deine Stunden."
        ),
        t(
          "Wichtig: die Frist läuft weiter, während du nicht da bist. Das ist hart und beabsichtigt – eine Frist, die auf dich wartet, ist keine. Wer abends aufhört und morgens zurückkommt, findet eine Welt vor, die inzwischen gelebt hat."
        ),
        t(
          "Entropy ist deshalb ein Spiel für nebenbei. Es läuft langsam, und das ist Absicht und nicht dein Fehler: Fortschritt braucht hier Geduld, in den ersten Minuten passiert wenig, und die Welt arbeitet auch dann weiter, wenn du nicht hinsiehst. Wegzugehen ist kein Aussetzen – nur die Frist wartet eben auch nicht."
        ),
        // A-073: die zwei Sätze zum Spielstand stehen HIER und nicht in einem
        // eigenen Abschnitt -- wer über das Weggehen liest, ist genau der,
        // dessen Stand zwischendurch verschwinden kann. Ein Tester hat ihn so
        // verloren (18.08., Firefox nach PC-Neustart).
        t(
          "Damit das Weggehen sicher ist, muss dein Stand die Pause überleben – und er liegt im Speicher deines Browsers. Der räumt ihn unter Umständen von selbst weg: beim Löschen der Chronik, im Privatmodus oder wenn ihm der Platz ausgeht."
        ),
        t(
          "Vorsorge dagegen steht im Bereich Development unter „Spielstand“: dort holst du deinen Stand als Text heraus und legst ihn ab, wo er dir gehört – und spielst ihn von dort auch wieder ein."
        ),
      ],
    },
    {
      id: "wirtschaft",
      titel: t("Vorräte, Strom und Menschen"),
      absaetze: [
        t(
          "Es gibt zwei sehr verschiedene Arten von Ressourcen, und der Unterschied entscheidet mehr als jede Zahl. Metall, Silizium und alles andere Gelagerte sammelt sich an: was du heute nicht brauchst, liegt morgen noch da."
        ),
        t(
          "Energie und Arbeitskraft sind keine Vorräte, sondern Flüsse. Sie werden in jedem Moment erzeugt und im selben Moment verbraucht. Reicht ein Fluss nicht, wird gedrosselt – und zwar alles, was daran hängt."
        ),
        // A-055: die Energie-Wahl samt ihrem Risiko -- Pflichttext, nicht
        // Beiwerk (die Kachel warnt zwar, aber sie erklärt nicht das WARUM).
        t(
          "Für Energie gibt es zwei Wege, und sie unterscheiden sich im Preis: Das Kraftwerk verbrennt Deuterium aus dem Lager – geht der Brennstoff aus, zündet die Fusion nicht mehr und der Reaktor steht, bis wieder Vorrat für den Anlauf da ist. Das Solarfeld braucht keinen Brennstoff und liefert sternnah am meisten – aber seine Halbleiter überstehen die Teilchenflut nicht: ungeschirmte Felder sind danach Schrott. Der bequeme Weg ist der verwundbare; ein Energiespeicher überbrückt Lücken in beiden."
        ),
        t(
          "Arbeitskraft kommt aus deiner Bevölkerung, und Bevölkerung wächst nur, wenn Wohnraum frei ist. Deshalb ist ein Wohnmodul selten das, was am dringendsten aussieht, und oft das, was am meisten bringt: es hebt nicht eine Zahl, sondern die Obergrenze aller anderen."
        ),
        // A-052: der Verderb steht seit v1.25 nur noch im Tooltip der Kachel,
        // und Tooltips gibt es auf einem Telefon nicht. Deshalb hier, im
        // Fließtext -- das ist Pflicht und nicht Beiwerk.
        t(
          "Eine Ausnahme unter den Vorräten: Nahrung verdirbt. Ein Teil des Lagerbestands geht laufend verloren, und zwar anteilig – ein volles Lager verliert absolut mehr als ein halbleeres. Deshalb kann dein Vorrat schrumpfen, obwohl die Bilanz positiv aussieht. Wie viel es ist, steht im Tooltip der Nahrungs-Kachel."
        ),
      ],
    },
    {
      id: "vorrang",
      titel: t("Vorrang – die Entscheidung, die zählt"),
      absaetze: [
        t(
          "Wenn Strom oder Leute knapp werden, teilt das Spiel sie von selbst gleichmäßig auf. Das ist im Normalfall vernünftig und im Notfall genau falsch: wer zu wenig hat, will nicht überall halb laufen, sondern das Wichtige ganz und den Rest gar nicht."
        ),
        t(
          "Deshalb trägt jede Anlage eine Vorrangstufe: Vorrang, Normal oder Nachrang. Zugeteilt wird von oben nach unten – die höchste Stufe zuerst und vollständig, was übrig bleibt, fließt eine Stufe tiefer. Genau so wirft ein Stromnetz Lasten ab."
        ),
        t(
          "Solange alles reicht, ändert die Einstellung gar nichts. Sie ist keine Dauerrechenaufgabe, sondern eine Notfallentscheidung. Aber im Notfall ist sie die wichtigste, die du hast."
        ),
      ],
    },
    {
      id: "schirm",
      titel: t("Der Schirm, und warum halb nicht reicht"),
      absaetze: [
        t(
          "Gegen die Teilchenflut hilft ein Magnetfeld. Der Grund ist Physik: die Flut besteht aus geladenen Teilchen, und die lassen sich magnetisch ablenken. Gegen den Gammablitz hilft es nicht – der braucht Masse, und dafür sind die Wohnmodule da."
        ),
        t(
          "Ein solcher Generator hält kein Schutzschild im Sinne eines Kraftfelds, sondern eine Lebenserhaltung für einen ganzen Planeten. Und weil er ein Feld dauerhaft aufrechterhalten muss, braucht er dauerhaft enorme Leistung – er dominiert den Energiehaushalt einer Welt vollständig."
        ),
        t(
          "Entscheidend ist: ein Schirm auf halber Leistung ist kein halber Schutz. Ein Feld mit Lücken lenkt nicht die Hälfte der Teilchen ab, es reißt an der falschen Stelle auf. Wenn die Flut eintrifft, zählt nur, ob er voll versorgt läuft – mit Strom und mit Leuten."
        ),
        t(
          "Er steht je Planet, nicht für das ganze Imperium. Wer breit gesiedelt hat, hat also mehr zu retten, nicht weniger zu tun."
        ),
      ],
    },
    {
      id: "welten",
      titel: t("Warum Welten sich unterscheiden"),
      absaetze: [
        t(
          "Kein Planet ist wie der andere, und die Unterschiede sind keine Zufallszahlen, sondern folgen aus dem, was er ist. Eine Wüstenwelt trägt Metall und Silizium reichlich und lässt nichts wachsen. Ein Gasriese hat überhaupt keine Oberfläche, auf die man bauen könnte."
        ),
        t(
          "Die Schwerkraft ist der stärkste einzelne Faktor, und das aus einem einfachen Grund: jedes Bauwerk muss sein eigenes Gewicht tragen. Auf einer schweren Welt kostet dieselbe Anlage mehr Material."
        ),
        t(
          "Manches siehst du, ohne es nutzen zu können. Ein tiefliegendes Vorkommen bleibt sichtbar und verschlossen, bis du die passende Technologie hast. Entdecken und Verwerten sind zwei verschiedene Dinge. Verschlossen ist dabei nur die Quelle selbst – was schon vorher dort liegt oder zurückgelassen wurde, kannst du jederzeit bergen."
        ),
      ],
    },
    {
      id: "flotten",
      titel: t("Flotten, Reichweite und Treibstoff"),
      absaetze: [
        t(
          "Jedes Schiff hat einen Tank, und die Reichweite einer Flotte ist der Tank geteilt durch den Verbrauch – also ein Mittelwert über alle Schiffe darin. Das hat eine Folge, die nirgends als Sonderregel steht: ein Kriegsschiff im Erkunderverband verkürzt dessen Reichweite."
        ),
        t(
          "Der Frachter wird dadurch von selbst zum Tanker, ohne dass ihm jemand diese Rolle gegeben hätte. Solche Zusammenhänge sind der Kern dieses Spiels: die Regeln sind wenige, die Folgen ergeben sich."
        ),
        t(
          "Ein System, in dem noch nie jemand war, kennt keine Sprungroute. Der erste Flug dorthin geht deshalb unterlichtschnell und dauert lange – danach steht der Anker und es ist für immer ein Sprung."
        ),
      ],
    },
    {
      id: "forschung",
      titel: t("Forschung ist ein Fluss, kein Kauf"),
      absaetze: [
        t(
          "Technologie wird nicht bezahlt und ist dann da. Sie wird laufend erarbeitet: Labore erzeugen Forschung, solange sie Strom und Leute haben, und ein Auftrag rückt vor, solange geforscht wird."
        ),
        t(
          "Deshalb ist Wissen auch die einzige Sache in diesem Spiel, die sofort überall gilt. Es ist nichts Physisches – es muss nicht reisen. Alles andere muss den Weg tatsächlich zurücklegen, und das gilt auch für die Rechnung."
        ),
      ],
    },
    // Der Feedback-Abschnitt (A-018). Er steht am Ende und nicht am Anfang:
    // wer hier ankommt, hat das Spiel erklärt bekommen und weiß, worüber er
    // redet. `link` ist das einzige Feld, das ein Abschnitt außer Text haben
    // darf -- gerendert wird es in js/ui.js als eigener Absatz.
    {
      id: "feedback",
      titel: t("Feedback"),
      absaetze: [
        t(
          "Das hier ist ein Entwicklungsstand, kein fertiges Spiel. Was dir auffällt, ist deshalb ausdrücklich erwünscht: ein Fehler, eine Stelle, an der du nicht weiterwusstest, etwas, das sich falsch anfühlt."
        ),
        t(
          "Der Link öffnet ein Formular in einem neuen Tab – dieses hier läuft weiter, du verlierst nichts. Welche Fassung du vor dir hast, trägt er selbst ein; das ist die Angabe, die uns sonst immer fehlt. Zum Abschicken braucht es ein GitHub-Konto."
        ),
      ],
      link: { text: t("Rückmeldung geben"), adresse: feedbackAdresse() },
    },
    // Die Oberfläche (A-059). Steht VOR der Steuerung: erst wo etwas liegt,
    // dann wie man hinkommt.
    //
    // WARUM ALS ABSCHNITT UND NICHT ALS FÜHRUNG DURCH DIE OBERFLÄCHE: Tobis
    // stehende Linie ist „Führung durch Erklärung, keine Schritt-für-Schritt-
    // Anleitung". Ein Overlay, das nacheinander auf Kopfzeile, Leiste und
    // Spalte zeigt, wäre genau die Anleitung -- und ein neues UI-Muster
    // obendrein. Nachschlagbar ist hier auch deshalb besser, weil die Frage
    // „wo war das nochmal" NICHT beim ersten Start kommt, sondern eine halbe
    // Stunde später.
    //
    // KEINE ZAHLEN, wie im Kopf dieser Datei verlangt -- der Abschnitt sagt,
    // was wo liegt und was es bedeutet, nicht wieviel es gerade ist.
    {
      id: "oberflaeche",
      titel: t("Die Oberfläche"),
      absaetze: [
        t(
          "Der Bildschirm hat vier feste Zonen, und sie ändern ihre Plätze nie: der Kopf ganz oben, die beiden Ressourcenreihen darunter, links die Bereichsleiste – und rechts eine Spalte, die man auf- und zuklappen kann."
        ),
        t(
          "Im Kopf stehen zwei Zeiten nebeneinander, und sie meinen Verschiedenes. Das Datum ist der Kalender deiner Welt und läuft immer. Die Uhr daneben ist die Frist: sie nennt das nächste Ereignis der Supernova und zeigt als Balken, wieviel davon schon vorbei ist. Gibt es gerade keine Frist, ist die Uhr weg – das Datum bleibt."
        ),
        t(
          "Darunter liegen zwei Reihen, und der Unterschied zwischen ihnen ist der wichtigste in der ganzen Wirtschaft. Oben steht, was du HAST: Lagerbestände, die sich ansammeln. Unten steht, was du KANNST: Strom, Arbeitskraft und Lagerplatz – Größen, die pro Zeit anfallen oder als Platz begrenzt sind und nicht gespart werden können. Wer die untere Reihe für einen Vorrat hält, wundert sich früher oder später."
        ),
        t(
          "Links wechselst du den Bereich; sichtbar ist immer genau einer. Ein Punkt an einem Eintrag heißt: dort läuft gerade etwas. Dieselben Bereiche erreichst du mit den Zifferntasten – der Abschnitt Steuerung listet sie."
        ),
        t(
          "Die Spalte rechts zeigt, was gerade läuft, egal welcher Bereich offen ist: Bauaufträge, Forschung, Werft, unterwegs befindliche Flotten – und die Meldungen. Sie ist der einzige Ort, an dem dein Spiel dich anspricht. Mit dem Griff an ihrem Rand klappt sie zu, wenn du den Platz brauchst; dann läuft alles weiter, du siehst es nur nicht mehr."
        ),
      ],
    },
    // Steuerung (A-029). Steht VOR den Neuigkeiten, weil es zum Spiel
    // gehoert und nicht zum Projekt -- und weil ein Nachschlagewerk seine
    // Bedienung nicht ganz hinten versteckt.
    {
      id: "steuerung",
      titel: t("Steuerung"),
      absaetze: [
        t(
          "Alles geht mit der Maus. Wer die Hand lieber auf der Tastatur lässt, kann die Ansicht auch so wechseln – Tasten ändern nie etwas an der Welt, sie zeigen nur anderes."
        ),
      ],
      gruppen: [
        {
          titel: t("Tasten"),
          punkte: [
            t("1 bis 9 – die Bereiche in der Reihenfolge der Leiste links"),
            t("Q und E – eine Welt zurück, eine Welt weiter"),
            t("M – Galaxiekarte · H – Handbuch"),
            t("Esc – schließt ein offenes Fenster"),
          ],
        },
      ],
    },
    // Neuigkeiten & Roadmap (A-019, Zuschnitt und Titel nach A-040).
    //
    // WOHER DER INHALT KOMMT: aus AUFTRAEGE/ROADMAP.md, wörtlich. Diese Datei
    // pflegt die Planung, sie ist die EINZIGE Quelle, und die Formulierungen
    // dort sind auf Spielertauglichkeit geprüft (keine Balancing-Zahlen, keine
    // Auflösung der Demo). Wer hier umformuliert, erzeugt eine zweite Wahrheit
    // -- gepflegt würde danach nur noch eine davon.
    //
    // WARUM VON HAND ÜBERTRAGEN UND NICHT EINGELESEN: der Text muss durch t()
    // laufen, sonst steht im englischen Spiel eine deutsche Liste. Ein
    // Einlesen zur Laufzeit könnte das nicht -- und die Prüfung auf
    // Vollständigkeit (tests/sprache.test.js) sähe die Texte nie. Der Abgleich
    // gehört deshalb zur Veröffentlichungsroutine, sie steht im LEITFADEN.
    //
    // DIE ⚠-ZEILE IST PFLICHT: sie ist die einzige Warnung, die ein Tester
    // bekommt, bevor ein Spielstand einmalig zurückgesetzt wird.
    // A-054: DER ABSCHNITT „Neuigkeiten & Roadmap" IST HIER RAUS.
    // Er hat drei Dinge in einem Kasten gehalten -- was war, was kommt, und
    // wie man sich meldet -- und der Kasten war das Handbuch, also der Ort
    // fuer „wie funktioniert das Spiel". Beides zusammen hat keinem der
    // beiden gutgetan.
    //
    // Alles davon steht jetzt im Development-Bereich, und zwar getrennt:
    // Patchnotes (js/patchnotes.js), Roadmap (ROADMAP_PUNKTE unten) und
    // Feedback. Hier bleibt nur der Weg dorthin.
    {
      id: "neuigkeiten",
      titel: t("Was neu ist und was kommt"),
      absaetze: [
        t(
          "Diese Demo ist unterwegs, nicht fertig. Was zuletzt dazugekommen ist, was als Nächstes drankommt und wie du dich meldest, steht im Bereich Development – unterster Eintrag in der Leiste links."
        ),
      ],
    },
  ];
}

// Einen einzelnen Handbuch-Absatz holen, zum Zitieren an anderer Stelle
// (A-060). Gleiches Muster wie der `erststart`-Zeiger darunter und aus
// demselben Grund: wer den Text abschreibt, führt ab dann zwei Fassungen, und
// gepflegt wird eine. Fehlt der Abschnitt oder der Absatz, kommt `null`
// zurück -- der Aufrufer lässt die Meldung dann lieber ganz weg, als eine
// leere zu schreiben.
export function handbuchAbsatz(abschnittId, index) {
  const abschnitt = handbuchAbschnitte().find((a) => a.id === abschnittId);
  return (abschnitt && abschnitt.absaetze[index]) || null;
}

// Das Erklärfenster beim allerersten Start.
//
// ANLASS: Tobi hat die veröffentlichte Demo am 16.08.2026 zum ersten Mal selbst
// gespielt und notiert: "Es kommt kein Fenster das irgendwas erklärt." Das
// Handbuch gab es zu dem Zeitpunkt bereits samt Hinweis nach einer Minute --
// er hat es nur nicht wahrgenommen. Genau das ist der Befund: eine Hilfe, die
// man finden muss, findet der nicht, der noch nicht weiß, dass er sie braucht.
//
// WARUM DER INHALT ÜBERWIEGEND GEBORGT IST: zwei der vier Absätze kommen
// wörtlich aus dem Handbuch oben, markiert dort durch `erststart`. Ein
// zweiter, eigener Erklärtext wäre eine zweite Wahrheit -- und zwar die
// schlechtere Sorte, weil beide plausibel klingen und nur eine gepflegt wird.
// Neu geschrieben ist nur, was das Handbuch bewusst NICHT hat: die Verortung
// ("wo bin ich") und die ersten Handgriffe. Tobis Vorgabe fürs Handbuch war
// ausdrücklich "keine Schritt für Schritt Anleitung"; ein Fenster, das sich
// beim ersten Start von selbst öffnet, darf und muss dagegen sagen, wo man
// anfängt -- sonst ist es nur eine weitere Wand aus Text.
export function erststartTafel(planetName) {
  // Der Zeiger darf seit A-059 auch MEHRERE Absätze benennen. Grund: der
  // Identitäts-Absatz („ein Spiel für nebenbei") gehört sachlich in denselben
  // Abschnitt wie der Hinweis auf die weiterlaufende Frist, und eine Sektion
  // konnte bis dahin nur einen einzigen Absatz beisteuern. Die Alternative
  // wäre gewesen, den Text ein zweites Mal ins Fenster zu schreiben -- genau
  // die zweite Wahrheit, die der Zeiger verhindern soll.
  const geborgt = handbuchAbschnitte()
    .filter((a) => a.erststart !== undefined)
    .flatMap((a) => (Array.isArray(a.erststart) ? a.erststart : [a.erststart]).map((i) => a.absaetze[i]))
    // Falls jemand oben Absätze umsortiert und den Zeiger vergisst: lieber
    // einen Absatz weniger als eine Lücke im Fenster.
    .filter(Boolean);

  return {
    titel: t("Eine Welt, und eine Frist"),
    absaetze: [
      t(
        "Du führst genau eine Welt: {planet}. Ein Wohnmodul, ein kleiner Vorrat – und ein Himmel voller Sterne, in denen noch nie jemand war.",
        { planet: planetName }
      ),
      ...geborgt,
      // A-045, Chris: „It says to upgrade a building and start research but
      // you actually cant research right away bc you dont have a lab."
      //
      // Hier stand „zwei Handgriffe … und im Bereich Forschung einen Auftrag
      // einreihen". Nachgemessen im frischen Spiel: 13 Forschungskacheln, 0
      // davon einreihbar -- ohne Labor forscht niemand. Ein Neuling sucht den
      // Fehler dann bei sich, und genau das hat Chris getan („not sure if im
      // missing something").
      //
      // Der Satz sagt jetzt EINEN Handgriff und macht die Reihenfolge
      // ehrlich. Bewusst FEST und nicht zustandsabhängig: das Handbuch baut
      // bei jedem Aufruf neu, und ein wahrer fester Satz ist billiger als
      // eine Zustandsprüfung, die dasselbe sagt.
      t(
        "Zum Anfangen genügt ein Handgriff: im Bereich Planet eine Anlage ausbauen – Kraftwerk und Wohnmodul tragen alles andere. Geforscht wird erst, wenn ein Forschungslabor steht; Forschung ist kein Kauf, sondern Arbeit, und ohne Labor arbeitet niemand daran."
      ),
    ],
    // Steht getrennt, weil es kein Inhalt ist, sondern der Weg zum Rest.
    hinweis: t("Die Uhr oben im Kopf zeigt, wieviel Zeit bleibt. Alles Weitere steht im Handbuch – jederzeit, unterster Eintrag in der Leiste links."),
  };
}
