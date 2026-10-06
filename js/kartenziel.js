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
