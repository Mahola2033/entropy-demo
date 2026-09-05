// Startschwierigkeit (A-190) -- welche Zone+Wasser-Kombination die nächste
// NEUE Heimatwelt bekommt (siehe STARTSCHWIERIGKEIT in data.js).
//
// Liegt wie die Sprachwahl (js/sprache.js, dasselbe Muster) BEWUSST NICHT im
// Spielstand, sondern in einem eigenen localStorage-Eintrag -- aber aus einem
// ANDEREN Grund: eine Startwahl ist keine laufende Einstellung, sie gilt nur
// beim Anlegen einer Partie (A-190-Auftrag, "Bekannte Fallen"). Sie wirkt
// deshalb NICHT auf die laufende Partie, sondern erst beim nächsten
// Neustart (js/save.js, neueWelt()) -- und überlebt genau deshalb auch
// unverändert einen SAVE_VERSION-Sprung, der die laufende Partie sonst
// nirgends berührt.

import { STARTSCHWIERIGKEIT, STARTSCHWIERIGKEIT_VORGABE } from "./data.js?v=0.9.1";

const SPEICHER_SCHLUESSEL = "entropy-startschwierigkeit";

export function startschwierigkeit() {
  try {
    if (typeof localStorage === "undefined") return STARTSCHWIERIGKEIT_VORGABE;
    const gespeichert = localStorage.getItem(SPEICHER_SCHLUESSEL);
    return gespeichert && STARTSCHWIERIGKEIT[gespeichert] ? gespeichert : STARTSCHWIERIGKEIT_VORGABE;
  } catch {
    return STARTSCHWIERIGKEIT_VORGABE; // z.B. blockierter Speicher -- kein Grund, das Spiel anzuhalten
  }
}

export function startschwierigkeitSetzen(stufe) {
  if (!STARTSCHWIERIGKEIT[stufe]) return;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(SPEICHER_SCHLUESSEL, stufe);
  } catch {
    // Nicht speicherbar: die Wahl gilt trotzdem fuer den naechsten Neustart
    // dieser Sitzung, nur nicht ueber einen Seitenneuaufbau hinaus.
  }
}
