// Die Spiel-VARIANTE (A-272) -- entscheidet, ob eine neue Welt eine
// Supernova bekommt.
//
//   "demo"  Tester spielen gegen die Frist (siehe DEMO.md). Vorgabewert hier
//           im Repo -- Entwicklung UND Demo laufen damit.
//   "voll"  Tobis Vollversion: derselbe Code, dieselbe Engine, nur ohne den
//           sterbenden Stern.
//
// EIN Schalter an GENAU dieser einen Stelle (Prinzip 5 -- ein Code, kein
// zweites Spiel): `neuesSpiel()` liest ihn, sonst nichts. Alles Weitere
// folgt allein daraus, dass `state.supernova` in der Variante "voll" null
// bleibt -- derselbe Zustand, den tests/hilfen.js für die Testwelt seit je
// erzwingt (`if (!opts.supernova) state.supernova = null`). Keine zweite
// Verzweigung irgendwo sonst im Spiel.
//
// Die KOPIE bekommt ihren eigenen Wert -- `vollversion.mjs` schreibt ihn
// beim Kopieren auf "voll" um, exakt wie `STAND` in data.js. Die Quelle hier
// ändert sich dabei nie.
export const VARIANTE = "demo";
