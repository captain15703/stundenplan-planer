/* =====================================================================
   modulhandbuch.js – liest das Modulhandbuch (PDF) des Masterstudiengangs
   Wirtschaftsinformatik der Uni Bamberg ein.

   Zugeschnitten auf dessen Aufbau (gilt auch für spätere Fassungen,
   solange das Layout gleich bleibt):

   1. "Übersicht nach Modulgruppen" (Inhaltsverzeichnis am Anfang):
        1) Masterstudium (Bereich) ECTS: 120
        a) A1 Fachstudium Wirtschaftinformatik (Modulgruppe) ECTS: 24 - 54
          aa) Wirtschaftsinformatik (Fächergruppe)
            i) Energieeffiziente Systeme (Fach)
            EESYS-ES-M: Energieeffiziente Systeme (6 ECTS, SS, jährlich)....167
      → Modulgruppen mit ECTS-Spanne und alle Module mit Kürzel, Name,
        ECTS, Turnus, Fach und Seitenzahl.
   2. Die Modulbeschreibungen (je Modul ab einer Zeile "Modul KÜRZEL …
      6 ECTS / 180 h"): daraus Modulverantwortliche/r, Prüfung, Sprache.

   Ablauf: pdf.js (liegt in vendor/pdfjs, wird erst hier nachgeladen)
   liefert Textstücke mit Position → daraus Zeilen pro Seite →
   leseModulhandbuch() wertet die Zeilen aus. Diese Funktion arbeitet
   nur mit Text und ist deshalb ohne PDF testbar.
   ===================================================================== */

'use strict';

/* ---------- PDF → Zeilen ---------- */

const PDFJS_PFAD = 'vendor/pdfjs/';
let pdfjsLaden = null;

function ladePdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsLaden) {
    pdfjsLaden = new Promise((fertig, fehler) => {
      const skript = document.createElement('script');
      skript.src = PDFJS_PFAD + 'pdf.min.js';
      skript.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_PFAD + 'pdf.worker.min.js';
        fertig(window.pdfjsLib);
      };
      skript.onerror = () => {
        pdfjsLaden = null;
        fehler(new Error('Das PDF-Modul (vendor/pdfjs) konnte nicht geladen werden.'));
      };
      document.head.appendChild(skript);
    });
  }
  return pdfjsLaden;
}

// Setzt aus den Textstücken einer Seite Zeilen zusammen (oben → unten, links → rechts)
function zeilenAusTextstuecken(stuecke) {
  const zeilen = [];
  const sortiert = stuecke
    .filter((s) => s.str !== undefined)
    .map((s) => ({ text: s.str, x: s.transform[4], y: s.transform[5], breite: s.width || 0, hoehe: Math.abs(s.transform[3]) || 10 }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  for (const stueck of sortiert) {
    const zeile = zeilen[zeilen.length - 1];
    if (zeile && Math.abs(zeile.y - stueck.y) <= Math.max(2, stueck.hoehe * 0.3)) zeile.stuecke.push(stueck);
    else zeilen.push({ y: stueck.y, stuecke: [stueck] });
  }
  return zeilen.map((zeile) => {
    const teile = zeile.stuecke.sort((a, b) => a.x - b.x);
    let text = '';
    let ende = null;
    for (const t of teile) {
      if (ende !== null && t.x - ende > t.hoehe * 0.15 && !text.endsWith(' ') && !t.text.startsWith(' ')) text += ' ';
      text += t.text;
      ende = t.x + t.breite;
    }
    return text.replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}

// Liest alle Seiten als Zeilen. fortschritt(seite, seitenGesamt) wird regelmäßig aufgerufen.
async function pdfZuZeilen(datei, fortschritt = () => {}) {
  const pdfjs = await ladePdfJs();
  const dokument = await pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) }).promise;
  const seiten = [];
  for (let nr = 1; nr <= dokument.numPages; nr++) {
    const seite = await dokument.getPage(nr);
    const inhalt = await seite.getTextContent();
    seiten.push(zeilenAusTextstuecken(inhalt.items));
    seite.cleanup();
    if (nr % 10 === 0 || nr === dokument.numPages) fortschritt(nr, dokument.numPages);
  }
  await dokument.destroy();
  return seiten;
}

/* ---------- Zeilen → Modulgruppen und Module ---------- */

const MHB_MUSTER = {
  gesamt: /^\d+\)\s+.+?\(Bereich\)\s*ECTS:\s*(\d+)/,
  modulgruppe: /^[a-z]\)\s+(.+?)\s*\(Modulgruppe\)\s*(?:ECTS:\s*(\d+)(?:\s*-\s*(\d+))?)?$/,
  nurEcts: /^ECTS:\s*(\d+)(?:\s*-\s*(\d+))?$/,
  unterbereich: /^[a-z]{2}\)\s+(.+?)\s*\((Fächergruppe|Wahlpflichtbereich)\)\s*(?:ECTS:\s*(\d+)(?:\s*-\s*(\d+))?)?$/,
  fach: /^[ivxl]+\)\s+(.+?)\s*\(Fach\)$/,
  // Kürzel: Buchstabe am Anfang, dann Buchstaben, Ziffern, Punkte, Bindestriche
  modulAnfang: /^([A-Za-z][A-Za-z0-9.]*(?:-[A-Za-z0-9.]+)*):\s/,
  modul: /^([A-Za-z][A-Za-z0-9.]*(?:-[A-Za-z0-9.]+)*):\s+(.+)\s+\((\d+(?:,\d+)?)\s*ECTS(?:,\s*([^)]*))?\)\s*\.*\s*(\d+)$/,
  endetMitSeite: /\.{3,}\s*\d+$/,
  seitenzahl: /^\d+$/,
  detailKopf: /^Modul\s+([A-Za-z][A-Za-z0-9.]*(?:-[A-Za-z0-9.]+)*)\s+(.*?)\s*(\d+(?:,\d+)?)\s*ECTS\s*\/\s*\d+\s*h\b/,
  laufenderKopf: /^Modul\s+\S+$/,
};

// "schriftliche Prüfung (Klausur) / Prüfungsdauer: 90 Minuten" → "schriftliche Prüfung (Klausur), 90 Minuten"
function kuerzePruefung(text) {
  return text.replace(/\s*\/\s*Prüfungsdauer:\s*/i, ', ').replace(/\s+/g, ' ').trim();
}

function kuerzelVonGruppe(name) {
  const treffer = name.match(/^([A-Z]\d+)\b/);
  return treffer ? treffer[1] : name;
}

// seiten: Array von Seiten, jede ein Array von Zeilen (Text)
function leseModulhandbuch(seiten) {
  const ergebnis = { titel: '', stand: '', gesamtEcts: null, bereiche: [], module: [], warnungen: [] };
  const alle = seiten.flat();

  // Kopfdaten von der Titelseite
  const titel = alle.slice(0, 15).find((z) => /studiengang/i.test(z));
  if (titel) ergebnis.titel = titel;
  const stand = alle.slice(0, 40).map((z) => z.match(/^Stand:\s*(.+)$/)).find(Boolean);
  if (stand) ergebnis.stand = stand[1];

  // --- 1. Übersicht nach Modulgruppen ---
  const start = alle.findIndex((z) => /^Übersicht nach Modulgruppen$/i.test(z));
  if (start < 0) {
    ergebnis.warnungen.push('Die „Übersicht nach Modulgruppen“ wurde nicht gefunden. Ist das ein Modulhandbuch der Uni Bamberg?');
    return ergebnis;
  }
  const module = new Map(); // Kürzel → Modul
  let gruppe = null;
  let unterbereich = '';
  let fach = '';
  let puffer = []; // Zeilen eines Moduleintrags, der über mehrere Zeilen geht
  let i = start + 1;

  const neueGruppe = (name, min, max) => {
    gruppe = {
      kuerzel: kuerzelVonGruppe(name),
      name,
      minEcts: min === undefined ? null : Number(min),
      maxEcts: max === undefined ? (min === undefined ? null : Number(min)) : Number(max),
      hinweise: [],
    };
    ergebnis.bereiche.push(gruppe);
    unterbereich = '';
    fach = '';
  };

  for (; i < alle.length; i++) {
    const zeile = alle[i];
    if (MHB_MUSTER.detailKopf.test(zeile)) break; // Beginn der Modulbeschreibungen
    if (zeile === 'Inhaltsverzeichnis' || MHB_MUSTER.seitenzahl.test(zeile)) continue;

    let treffer;
    if ((treffer = zeile.match(MHB_MUSTER.gesamt))) {
      ergebnis.gesamtEcts = Number(treffer[1]);
      puffer = [];
    } else if ((treffer = zeile.match(MHB_MUSTER.modulgruppe))) {
      neueGruppe(treffer[1], treffer[2], treffer[3]);
      puffer = [];
    } else if (gruppe && gruppe.minEcts === null && (treffer = zeile.match(MHB_MUSTER.nurEcts))) {
      // ECTS stehen in einer eigenen Zeile, weil der Gruppenname lang ist
      gruppe.minEcts = Number(treffer[1]);
      gruppe.maxEcts = treffer[2] === undefined ? Number(treffer[1]) : Number(treffer[2]);
    } else if ((treffer = zeile.match(MHB_MUSTER.unterbereich))) {
      unterbereich = treffer[1];
      fach = '';
      if (gruppe && treffer[3] !== undefined) {
        gruppe.hinweise.push(`${treffer[1]}: ${treffer[3]}${treffer[4] !== undefined ? '–' + treffer[4] : ''} ECTS`);
      }
      puffer = [];
    } else if ((treffer = zeile.match(MHB_MUSTER.fach))) {
      fach = treffer[1];
      puffer = [];
    } else if (MHB_MUSTER.modulAnfang.test(zeile) || puffer.length) {
      if (MHB_MUSTER.modulAnfang.test(zeile) && !MHB_MUSTER.endetMitSeite.test(puffer.join(' '))) puffer = [];
      puffer.push(zeile);
      if (!MHB_MUSTER.endetMitSeite.test(zeile)) {
        if (puffer.length > 4) puffer = []; // war wohl doch kein Moduleintrag
        continue;
      }
      // Zeilen verbinden; "Leadership-" + "Implikationen" ohne Leerzeichen
      const text = puffer.reduce((gesamt, teil) => (gesamt.endsWith('-') ? gesamt + teil : gesamt + ' ' + teil)).replace(/\s+/g, ' ');
      puffer = [];
      const m = text.match(MHB_MUSTER.modul);
      if (!m || !gruppe) {
        ergebnis.warnungen.push('Nicht erkannt: ' + text.slice(0, 120));
        continue;
      }
      const kuerzel = m[1];
      const vorhanden = module.get(kuerzel);
      if (vorhanden) {
        if (!vorhanden.bereiche.includes(gruppe.kuerzel)) vorhanden.bereiche.push(gruppe.kuerzel);
        continue;
      }
      module.set(kuerzel, {
        kuerzel,
        name: m[2].trim(),
        ects: Number(m[3].replace(',', '.')),
        turnus: (m[4] || '').trim(),
        bereiche: [gruppe.kuerzel],
        fach: fach || unterbereich,
        seite: Number(m[5]),
        verantwortlich: '',
        pruefung: '',
        sprache: '',
      });
    }
  }

  // --- 2. Modulbeschreibungen ---
  let aktuell = null;
  let pruefungFolgt = false;
  for (; i < alle.length; i++) {
    const zeile = alle[i];
    let treffer;
    if ((treffer = zeile.match(MHB_MUSTER.detailKopf))) {
      aktuell = module.get(treffer[1]) || null;
      pruefungFolgt = false;
      continue;
    }
    if (!aktuell || MHB_MUSTER.laufenderKopf.test(zeile) || MHB_MUSTER.seitenzahl.test(zeile)) continue;
    if (pruefungFolgt) {
      pruefungFolgt = false;
      const art = kuerzePruefung(zeile);
      if (art && !/^(Zulassungsvoraussetzung|Beschreibung)/.test(art)) {
        aktuell.pruefung = aktuell.pruefung ? aktuell.pruefung + ' + ' + art : art;
      }
    } else if (zeile === 'Prüfung') {
      pruefungFolgt = true;
    } else if (!aktuell.verantwortlich && (treffer = zeile.match(/^Modulverantwortliche\/r:\s*(.+)$/))) {
      aktuell.verantwortlich = treffer[1].trim();
    } else if (!aktuell.sprache && (treffer = zeile.match(/^Sprache:\s*(.+)$/))) {
      aktuell.sprache = treffer[1].trim();
    }
  }

  ergebnis.module = [...module.values()];
  for (const b of ergebnis.bereiche) {
    b.anzahlModule = ergebnis.module.filter((m) => m.bereiche.includes(b.kuerzel)).length;
  }
  if (ergebnis.module.length === 0) ergebnis.warnungen.push('Es wurden keine Module gefunden.');
  return ergebnis;
}
