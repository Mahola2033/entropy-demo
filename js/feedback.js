// Der Feedback-Kanal der Demo (A-018).
//
// ENTSCHEIDUNG (Planung, 16.08.2026, verifiziert): GitHub Issues auf
// Mahola2033/entropy-demo. Der Grund ist nicht Bequemlichkeit, sondern
// Abholbarkeit -- der Issues-Endpunkt ist OHNE Anmeldung lesbar
// (api.github.com/repos/Mahola2033/entropy-demo/issues), die Planung kann
// Rückmeldungen also automatisiert durchgehen. Ein Mail-Link oder ein Formular
// bei einem Fremdanbieter könnte das nicht, ohne dass jemand Zugangsdaten
// verwaltet.
//
// WARUM DER KÖRPER HIER GEBAUT WIRD UND NICHT IM ISSUE-TEMPLATE: das Template
// im Demo-Repo kann keine Versionsnummer kennen -- es ist eine statische
// Datei. Genau die Angabe fehlt aber in fast jedem Fehlerbericht, und ohne sie
// ist er halb wertlos: die Demo wird laufend neu veröffentlicht, und "es
// hängt" heißt in v0.85 etwas anderes als in v0.88. Deshalb trägt der Link den
// Körper mit, und die Version steht schon drin, bevor der Tester das erste
// Wort tippt.
//
// FALLE (im Auftrag ausdrücklich benannt): der body-Parameter MUSS
// URL-kodiert sein. Umlaute, Zeilenumbrüche und das # der Überschriften würden
// die Adresse sonst zerlegen -- encodeURIComponent, nicht Handarbeit.

import { VERSION, STAND } from "./data.js";
import { t } from "./sprache.js";

export const FEEDBACK_REPO = "https://github.com/Mahola2033/entropy-demo";

// Der vorbefüllte Text des Formulars. Drei Felder, mehr nicht: wer viel
// abfragt, bekommt nichts. Die Versionszeile ist die einzige, die der Tester
// nicht selbst schreibt.
//
// Die Standmarke steht ROH da ("demo"/"entwicklung"/"spielkopie") und läuft
// bewusst nicht durch t(): ein Fehlerbericht wird von uns gelesen, nicht vom
// Tester -- eine übersetzte Marke müsste beim Lesen erst zurückübersetzt
// werden, und bei einer dritten Sprache stünde dort irgendwann ein Wort, das
// wir nicht zuordnen können.
export function feedbackKoerper() {
  return [
    `**${t("Was ist passiert?")}**`,
    "",
    "",
    `**${t("Was hast du erwartet?")}**`,
    "",
    "",
    "---",
    t("Version {version} ({stand}) – automatisch eingetragen, bitte stehen lassen.", {
      version: VERSION,
      stand: STAND,
    }),
    "",
  ].join("\n");
}

// Die vollständige Adresse des vorbefüllten Formulars.
//
// WARUM NUR `body` UND KEIN `template=`-Parameter: das Demo-Repo trägt eine
// EINZELNE Vorlage (.github/ISSUE_TEMPLATE.md, siehe demo-repo/). Bei genau
// einer Vorlage zeigt GitHub keine Auswahlseite, sondern öffnet das Formular
// direkt -- und der body-Parameter überschreibt den Vorlagentext. Eine
// Auswahlseite dazwischen wäre eine Klickhürde vor einer Rückmeldung, die
// ohnehin niemand gerne schreibt.
//
// Der Titel bleibt bewusst LEER: eine vorbefüllte Überschrift bleibt stehen,
// und dann heißen alle Meldungen gleich.
export function feedbackAdresse() {
  return `${FEEDBACK_REPO}/issues/new?body=${encodeURIComponent(feedbackKoerper())}`;
}
