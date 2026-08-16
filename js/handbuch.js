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
      // Absatz 2 ist der, der einem Neuling am ehesten fehlt, bevor er zum
      // ersten Mal den Rechner zuklappt -- deshalb geht er mit ins
      // Erklärfenster.
      erststart: 2,
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
        t(
          "Arbeitskraft kommt aus deiner Bevölkerung, und Bevölkerung wächst nur, wenn Wohnraum frei ist. Deshalb ist ein Wohnmodul selten das, was am dringendsten aussieht, und oft das, was am meisten bringt: es hebt nicht eine Zahl, sondern die Obergrenze aller anderen."
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
          "Deshalb trägt jedes Gebäude eine Vorrangstufe: Vorrang, Normal oder Nachrang. Zugeteilt wird von oben nach unten – die höchste Stufe zuerst und vollständig, was übrig bleibt, fließt eine Stufe tiefer. Genau so wirft ein Stromnetz Lasten ab."
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
          "Die Schwerkraft ist der stärkste einzelne Faktor, und das aus einem einfachen Grund: jedes Bauwerk muss sein eigenes Gewicht tragen. Auf einer schweren Welt kostet dasselbe Gebäude mehr Material."
        ),
        t(
          "Manches siehst du, ohne es nutzen zu können. Ein tiefliegendes Vorkommen bleibt sichtbar und verschlossen, bis du die passende Technologie hast. Entdecken und Verwerten sind zwei verschiedene Dinge."
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
  ];
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
  const geborgt = handbuchAbschnitte()
    .filter((a) => a.erststart !== undefined)
    .map((a) => a.absaetze[a.erststart])
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
      t(
        "Zum Anfangen genügen zwei Handgriffe: im Bereich Planet ein Gebäude ausbauen – Kraftwerk und Wohnmodul tragen alles andere –, und im Bereich Forschung einen Auftrag einreihen."
      ),
    ],
    // Steht getrennt, weil es kein Inhalt ist, sondern der Weg zum Rest.
    hinweis: t("Die Uhr oben im Kopf zeigt, wieviel Zeit bleibt. Alles Weitere steht im Handbuch – jederzeit, unterster Eintrag in der Leiste links."),
  };
}
