// Zielwahl der Galaxiekarte: welches System meint ein Klick? (A-324)
//
// Bis A-323 trug jedes System ein unsichtbares Klickziel vom Radius 3,2
// Karteneinheiten, und der Browser lieferte bei überlappenden Zielen das
// SPÄTER GEZEICHNETE. Bei 2.000 Systemen (mittlerer Nachbarabstand 2,0
// Einheiten) traf ein Klick auf die Mitte eines Systems nur noch in 35 % der
// Fälle dieses System (Prinzip 8a). Hier wird nach ABSTAND gewählt: das
// nächste System innerhalb des Radius, bei Gleichstand das mit der kleineren
// Nummer -- deterministisch, nie eine Frage der Zeichenreihenfolge.
//
// Reine Funktionen ohne DOM: eine Canvas-Karte (B-46) braucht genau diese
// Wahl unverändert, dort gibt es gar keine Elemente, nur Koordinaten.
//
// Die Positionen ändern sich nie (reine Funktion aus Saat und Größe,
// Prinzip 1): das Raster wird EINMAL gefüllt, ein Nachschlag je Zeigerbewegung
// kostet ein paar Zellen, keine Schleife über alle Systeme. Der Radius ist
// höchstens so groß wie eine Zelle, ein Nachschlag liest also höchstens 3 × 3
// Zellen.

// Kantenlänge einer Rasterzelle in Karteneinheiten. Mindestens der größte
// Suchradius (KLICK_RADIUS bei Zoom 1), damit 3 × 3 Zellen genügen.
const ZELLE = 4;

// Radius des Klickziels bei Zoom 1, in Karteneinheiten. Bei Zoom z gilt
// KLICK_RADIUS / z: das Ziel behält seine Größe AUF DEM SCHIRM (wie bisher
// vor A-324 das CSS beim Sternziel).
export const KLICK_RADIUS = 3.2;

function zellenSchluessel(zx, zy) {
  // Zellen liegen im Bereich um 0; Verschiebung um 1000, damit der Schlüssel
  // nie negativ wird (die Karte rechnet in -100..100, Zelle 4 -> -25..25).
  return (zx + 1000) * 4096 + (zy + 1000);
}

// punkte: [{ id, x, y }] in Karteneinheiten. Gibt ein Raster zurück, das nur
// `naechstesZiel` liest.
export function zielRasterBauen(punkte) {
  const zellen = new Map();
  for (const punkt of punkte) {
    const schluessel = zellenSchluessel(Math.floor(punkt.x / ZELLE), Math.floor(punkt.y / ZELLE));
    const liste = zellen.get(schluessel);
    if (liste) liste.push(punkt);
    else zellen.set(schluessel, [punkt]);
  }
  return { zellen };
}

// Das nächste System zum Punkt (x, y) innerhalb von `radius` Einheiten, als
// Systemnummer; `null`, wenn keins so nah liegt (ein Klick ins Leere wählt
// nichts). Gleicher Abstand: die kleinere Nummer.
export function naechstesZiel(raster, x, y, radius) {
  const reichweite = radius;
  const vonX = Math.floor((x - reichweite) / ZELLE);
  const bisX = Math.floor((x + reichweite) / ZELLE);
  const vonY = Math.floor((y - reichweite) / ZELLE);
  const bisY = Math.floor((y + reichweite) / ZELLE);
  const grenze = radius * radius;
  let besteId = null;
  let besterAbstand = Infinity;
  for (let zx = vonX; zx <= bisX; zx++) {
    for (let zy = vonY; zy <= bisY; zy++) {
      const liste = raster.zellen.get(zellenSchluessel(zx, zy));
      if (!liste) continue;
      for (const punkt of liste) {
        const dx = punkt.x - x;
        const dy = punkt.y - y;
        const abstand = dx * dx + dy * dy;
        if (abstand > grenze) continue;
        if (abstand < besterAbstand || (abstand === besterAbstand && punkt.id < besteId)) {
          besterAbstand = abstand;
          besteId = punkt.id;
        }
      }
    }
  }
  return besteId;
}

// --- Ein Klick im Gedränge (A-339) --------------------------------------------
//
// Die Zielwahl oben rechnet richtig, aber die Karte löst nicht beliebig fein auf: bei
// 5.000 Systemen im kleinen Fenster (1,22 Einheiten je Pixel, mittlerer Nachbarabstand
// 1,2 Einheiten) liegt dem angeklickten PIXEL oft ein Nachbar näher als die gemeinte
// Mitte. Das Pixel ist, was der Spieler sieht, also entscheidet das Pixel (A-336,
// Trefferquote Zoom 1: 88,7 %). Ein Klick, dessen Ziel auf dem Schirm nicht eindeutig
// ist, wählt deshalb keinen Stern, sondern zoomt auf die Stelle (js/karte.js, `zoomen`).
//
// DIE REGEL: ein Klick ist mehrdeutig, wenn der ZWEITNÄCHSTE Stern höchstens
// MEHRDEUTIG_PIXEL vom Klickpunkt entfernt ist (Bildschirmpixel, nicht Karteneinheiten).
// Herleitung: wer die Mitte eines Sterns S anklickt, trifft ein Pixel höchstens 0,71 px
// (halbe Pixeldiagonale) von S entfernt. Ist S nicht der nächste Stern, ist S mindestens
// der zweitnächste, und d_S ≤ 0,71 px. Liegt also der zweitnächste Stern weiter als
// 0,71 px weg, kann kein anderer als der nächste der gemeinte sein: der Klick ist
// eindeutig. Die Schwelle 0,75 px ist 0,71 mit Rand; sie ist die kleinste, die jeden
// Fehlgriff bei einem Klick auf die Mitte ausschließt (bei 0,5 px bleiben Fehlgriffe,
// gemessen in A-339). Die Garantie gilt für Klicks auf die MITTE; wer irgendwo auf den
// Sternpunkt klickt, bekommt den nächsten Stern wie vor A-339.
export const MEHRDEUTIG_PIXEL = 0.75;
// Nach dem Zoom soll der zweitnächste Stern mindestens so viele Pixel entfernt liegen
// (der Abstand wächst linear mit dem Zoom): weit über MEHRDEUTIG_PIXEL, damit auch ein
// Klick auf die Mitte, ein Pixel daneben, eindeutig ist.
export const EINDEUTIG_PIXEL = 3;

// Die beiden nächsten Systeme zum Punkt innerhalb von `radius` Einheiten, nach Abstand,
// bei Gleichstand nach Nummer (wie `naechstesZiel`: das erste ist immer dasselbe System).
// [] bei keinem, sonst ein oder zwei Einträge { id, abstand } (Abstand in Einheiten).
export function naechsteZiele(raster, x, y, radius) {
  const vonX = Math.floor((x - radius) / ZELLE);
  const bisX = Math.floor((x + radius) / ZELLE);
  const vonY = Math.floor((y - radius) / ZELLE);
  const bisY = Math.floor((y + radius) / ZELLE);
  const grenze = radius * radius;
  let eins = null;
  let zwei = null;
  const besser = (a, b) => b === null || a.q < b.q || (a.q === b.q && a.id < b.id);
  for (let zx = vonX; zx <= bisX; zx++) {
    for (let zy = vonY; zy <= bisY; zy++) {
      const liste = raster.zellen.get(zellenSchluessel(zx, zy));
      if (!liste) continue;
      for (const punkt of liste) {
        const dx = punkt.x - x;
        const dy = punkt.y - y;
        const kandidat = { id: punkt.id, q: dx * dx + dy * dy };
        if (kandidat.q > grenze) continue;
        if (besser(kandidat, eins)) {
          zwei = eins;
          eins = kandidat;
        } else if (besser(kandidat, zwei)) {
          zwei = kandidat;
        }
      }
    }
  }
  return [eins, zwei].filter(Boolean).map((k) => ({ id: k.id, abstand: Math.sqrt(k.q) }));
}

// Das Urteil über einen Klick: { system, mehrdeutig, faktor }.
//   system     das nächste System im Klickradius (wie `naechstesZiel`), sonst null
//   mehrdeutig der zweitnächste Stern liegt höchstens MEHRDEUTIG_PIXEL vom Klick entfernt
//   faktor     um wie viel gezoomt werden müsste, damit er EINDEUTIG_PIXEL entfernt liegt
//              (nur bei mehrdeutig; die Grenzen setzt der Aufrufer)
// `pixelProEinheit` kommt aus der Bildschirmmatrix der Karte (dieselbe Zoom-Mathematik
// wie `zeigerInKarte`); fehlt sie, gibt es keine Mehrdeutigkeit (Verhalten wie vor A-339).
export function klickUrteil(raster, x, y, radius, pixelProEinheit) {
  const ziele = naechsteZiele(raster, x, y, radius);
  if (ziele.length === 0) return { system: null, mehrdeutig: false, faktor: 1 };
  if (ziele.length === 1 || !(pixelProEinheit > 0)) return { system: ziele[0].id, mehrdeutig: false, faktor: 1 };
  const zweiter = ziele[1].abstand * pixelProEinheit;
  if (zweiter > MEHRDEUTIG_PIXEL) return { system: ziele[0].id, mehrdeutig: false, faktor: 1 };
  return { system: ziele[0].id, mehrdeutig: true, faktor: EINDEUTIG_PIXEL / Math.max(zweiter, 0.05) };
}

// --- Zwei Sterne unter einem Bildpunkt (A-340) ---------------------------------
//
// Bei ZOOM_MAX gibt es nichts mehr zu vergrößern. Liegen dort zwei Sterne näher als ein
// Bildpunkt beieinander (bei 5.000 Systemen 4 bis 10 Paare im großen, 25 bis 30 im kleinen
// Fenster, A-337), wählte ein Klick immer denselben, und der andere war nur über die
// Systemliste erreichbar (Prinzip 8a). Jetzt wechselt ein zweiter Klick auf dieselbe
// Stelle zum nächsten Kandidaten der Reihe nach, nach dem letzten wieder zum ersten
// (js/karte.js merkt sich den zuletzt gewählten). Die Welt bleibt, wie sie ist (R-74 (a)).

// Alle Systeme innerhalb von `radius` Einheiten um den Punkt, nach Abstand, bei Gleichstand
// nach Nummer (dieselbe Reihenfolge wie `naechstesZiel` und `naechsteZiele`).
// [{ id, abstand }], leer, wenn keins so nah liegt.
export function zieleImRadius(raster, x, y, radius) {
  const vonX = Math.floor((x - radius) / ZELLE);
  const bisX = Math.floor((x + radius) / ZELLE);
  const vonY = Math.floor((y - radius) / ZELLE);
  const bisY = Math.floor((y + radius) / ZELLE);
  const grenze = radius * radius;
  const treffer = [];
  for (let zx = vonX; zx <= bisX; zx++) {
    for (let zy = vonY; zy <= bisY; zy++) {
      const liste = raster.zellen.get(zellenSchluessel(zx, zy));
      if (!liste) continue;
      for (const punkt of liste) {
        const dx = punkt.x - x;
        const dy = punkt.y - y;
        const q = dx * dx + dy * dy;
        if (q <= grenze) treffer.push({ id: punkt.id, q });
      }
    }
  }
  treffer.sort((a, b) => a.q - b.q || a.id - b.id);
  return treffer.map((t) => ({ id: t.id, abstand: Math.sqrt(t.q) }));
}

// Der nächste Kandidat der Reihe: der auf `zuletzt` folgende, nach dem letzten wieder der
// erste; ist `zuletzt` kein Kandidat (oder null), der erste.
export function naechsterKandidat(kandidaten, zuletzt) {
  if (kandidaten.length === 0) return null;
  const i = zuletzt === null || zuletzt === undefined ? -1 : kandidaten.indexOf(zuletzt);
  return kandidaten[(i + 1) % kandidaten.length];
}
