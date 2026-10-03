/* =====================================================================
   speicher.js – das Datenmodell und das Speichern im Browser
   (localStorage). Alle Daten der App liegen in EINEM Objekt "daten".

   Aufbau (vereinfacht):
   daten
   ├─ einstellungen        Semester, ECTS-Ziel, Sortier-Prioritäten …
   ├─ module[]             Module mit Stammdaten
   │   └─ veranstaltungen[]    Vorlesung, Übung, Seminar …
   │       └─ optionen[]           Auswahlgruppe: genau EINE wird belegt
   │           └─ termine[]            wöchentlich / 14-tägig / Block
   ├─ geblockteZeiten[]    z. B. Arbeit, Sport (mit Puffer)
   ├─ vorlesungsfrei[]     Feiertage, Weihnachtspause …
   └─ favoriten[]          gespeicherte Varianten
   ===================================================================== */

'use strict';

const SPEICHER_SCHLUESSEL = 'stundenplan-planer-v1';
const DATEN_VERSION = 1;

const VERANSTALTUNGSTYPEN = ['Vorlesung', 'Übung', 'Seminar', 'Tutorium', 'Praktikum'];

const RHYTHMEN = {
  woechentlich: 'wöchentlich',
  zweiwoechentlich: '14-tägig',
  block: 'Block (einzelne Daten)',
};

// Bezeichnungen der Sortierkriterien für Varianten
const PRIORITAETEN = {
  ects: 'ECTS nah am Ziel',
  tage: 'Wenigste Uni-Tage',
  freistunden: 'Wenigste Freistunden',
  beginn: 'Spätester Beginn',
};

// Farbpalette für neue Module (gut unterscheidbar)
const MODULFARBEN = [
  '#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2',
  '#edc948', '#ff9da7', '#9c755f', '#2b9e8f', '#d37295', '#8cd17d',
];

// Der aktuelle Datenstand – wird beim Start aus dem Speicher geladen
let daten = leereDaten();

// false, wenn der Browser das Speichern verweigert (z. B. privater Modus)
let speicherVerfuegbar = true;

/* ---------- Leere Grundstrukturen ("Vorlagen") ---------- */

function standardEinstellungen() {
  return {
    semesterName: '',
    semesterStart: '',
    semesterEnde: '',
    ectsZiel: 30,
    nurZielErreicht: true, // Varianten unter dem ECTS-Ziel ausblenden
    maxVarianten: 20, // so viele Varianten werden höchstens angezeigt
    prioritaeten: [
      { schluessel: 'ects', aktiv: true },
      { schluessel: 'tage', aktiv: true },
      { schluessel: 'freistunden', aktiv: true },
      { schluessel: 'beginn', aktiv: true },
    ],
  };
}

function leereDaten() {
  return {
    version: DATEN_VERSION,
    einstellungen: standardEinstellungen(),
    module: [],
    geblockteZeiten: [],
    vorlesungsfrei: [],
    favoriten: [],
  };
}

function neuesModul() {
  return {
    id: neueId('modul'),
    name: '',
    nummer: '',
    ects: 5,
    dozent: '',
    pruefungsform: '',
    link: '',
    notizen: '',
    farbe: naechsteFarbe(),
    pflicht: true,
    aktiv: true,
    veranstaltungen: [],
  };
}

function neueVeranstaltung() {
  return {
    id: neueId('va'),
    typ: 'Vorlesung',
    titel: '',
    aktiv: true,
    optionen: [neueOption('')],
  };
}

function neueOption(name) {
  return {
    id: neueId('opt'),
    name: name,
    aktiv: true,
    termine: [neuerTermin()],
  };
}

function neuerTermin() {
  return {
    id: neueId('termin'),
    rhythmus: 'woechentlich',
    wochentag: 1,
    von: '10:00',
    bis: '12:00',
    raum: '',
    start: '', // leer = Vorlesungsbeginn aus den Einstellungen
    ende: '', // leer = Vorlesungsende aus den Einstellungen
    startwoche: 1, // nur 14-tägig: 1 = ab erster, 2 = ab zweiter passender Woche
    daten: [], // nur Block: Liste einzelner Daten
  };
}

function neueGeblockteZeit() {
  return {
    id: neueId('block'),
    name: '',
    aktiv: true,
    art: 'woechentlich', // 'woechentlich' oder 'zeitraum' (bestimmte Tage)
    wochentag: 1,
    datumVon: '', // wöchentlich: optional "gilt ab"; zeitraum: erster Tag
    datumBis: '', // wöchentlich: optional "gilt bis"; zeitraum: letzter Tag
    ganztags: false,
    von: '09:00',
    bis: '17:00',
    pufferVor: 0, // Minuten
    pufferNach: 0, // Minuten
  };
}

function neueVorlesungsfreieZeit() {
  return { id: neueId('frei'), name: '', von: '', bis: '' };
}

// Erste Palettenfarbe, die noch kein Modul benutzt
function naechsteFarbe() {
  const benutzt = new Set((daten?.module || []).map((modul) => modul.farbe));
  const frei = MODULFARBEN.find((farbe) => !benutzt.has(farbe));
  return frei || MODULFARBEN[(daten?.module?.length || 0) % MODULFARBEN.length];
}

/* ---------- Laden und Speichern ---------- */

function datenLaden() {
  try {
    const text = localStorage.getItem(SPEICHER_SCHLUESSEL);
    daten = text ? normalisiereDaten(JSON.parse(text)) : leereDaten();
  } catch (fehler) {
    console.warn('Daten konnten nicht geladen werden:', fehler);
    speicherVerfuegbar = false;
    daten = leereDaten();
  }
}

function datenSpeichern() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(daten));
    speicherVerfuegbar = true;
  } catch (fehler) {
    console.warn('Daten konnten nicht gespeichert werden:', fehler);
    speicherVerfuegbar = false;
  }
  const banner = $('#hinweis-speicher');
  if (banner) banner.hidden = speicherVerfuegbar;
}

/* ---------- Daten "aufräumen" ----------
   Ergänzt fehlende Felder mit Standardwerten. Das macht die App robust,
   z. B. beim Import eines älteren Backups oder nach künftigen Updates.
   ------------------------------------------------------------------ */

function normalisiereDaten(roh) {
  const basis = leereDaten();
  const quelle = roh && typeof roh === 'object' ? roh : {};
  const einstellungen = { ...basis.einstellungen, ...(quelle.einstellungen || {}) };

  // Prioritäten: nur bekannte Schlüssel, jeden genau einmal
  const bekannt = Object.keys(PRIORITAETEN);
  const prioritaeten = (Array.isArray(einstellungen.prioritaeten) ? einstellungen.prioritaeten : [])
    .filter((p) => p && bekannt.includes(p.schluessel));
  bekannt.forEach((schluessel) => {
    if (!prioritaeten.some((p) => p.schluessel === schluessel)) prioritaeten.push({ schluessel, aktiv: true });
  });
  einstellungen.prioritaeten = prioritaeten.map((p) => ({ schluessel: p.schluessel, aktiv: p.aktiv !== false }));

  // Enddaten vor dem Beginn (vertipptes Jahr) werden überall automatisch korrigiert
  einstellungen.semesterEnde = korrigiereEnddatum(einstellungen.semesterStart, einstellungen.semesterEnde);

  return {
    version: DATEN_VERSION,
    einstellungen,
    module: liste(quelle.module).map((m) => ({
      ...neuesModul(),
      ...m,
      ects: leseZahl(m.ects, 0),
      veranstaltungen: liste(m.veranstaltungen).map((v) => ({
        ...neueVeranstaltung(),
        ...v,
        optionen: liste(v.optionen).map((o) => ({
          ...neueOption(''),
          ...o,
          termine: liste(o.termine).map((t) => {
            const termin = {
              ...neuerTermin(),
              ...t,
              wochentag: Number(t.wochentag) || 1,
              startwoche: Number(t.startwoche) === 2 ? 2 : 1,
              daten: Array.isArray(t.daten) ? t.daten.filter((datum) => typeof datum === 'string' && datum) : [],
            };
            termin.ende = korrigiereEnddatum(termin.start || einstellungen.semesterStart, termin.ende);
            return termin;
          }),
        })),
      })),
    })),
    geblockteZeiten: liste(quelle.geblockteZeiten).map((g) => ({
      ...neueGeblockteZeit(),
      ...g,
      wochentag: Number(g.wochentag) || 1,
      pufferVor: leseZahl(g.pufferVor, 0),
      pufferNach: leseZahl(g.pufferNach, 0),
      datumBis: korrigiereEnddatum(g.datumVon, g.datumBis ?? ''),
    })),
    vorlesungsfrei: liste(quelle.vorlesungsfrei).map((f) => ({
      ...neueVorlesungsfreieZeit(),
      ...f,
      bis: korrigiereEnddatum(f.von, f.bis ?? ''),
    })),
    favoriten: liste(quelle.favoriten)
      .filter((f) => f.auswahl && typeof f.auswahl === 'object')
      .map((f) => ({
        id: f.id || neueId('fav'),
        name: String(f.name || 'Favorit'),
        gespeichertAm: String(f.gespeichertAm || new Date().toISOString()),
        modulIds: Array.isArray(f.modulIds) ? f.modulIds.map(String) : [],
        auswahl: { ...f.auswahl },
      })),
  };
}

// Gibt ein Array mit Objekten zurück – auch wenn der Wert fehlt oder kaputt ist
function liste(wert) {
  return Array.isArray(wert) ? wert.filter((eintrag) => eintrag && typeof eintrag === 'object') : [];
}

/* ---------- Suchen ---------- */

function findeModul(modulId) {
  return daten.module.find((modul) => modul.id === modulId) || null;
}

// Liefert { modul, veranstaltung } oder null
function findeVeranstaltung(veranstaltungId) {
  for (const modul of daten.module) {
    const veranstaltung = modul.veranstaltungen.find((v) => v.id === veranstaltungId);
    if (veranstaltung) return { modul, veranstaltung };
  }
  return null;
}

// Liefert { modul, veranstaltung, option } oder null
function findeOption(optionId) {
  for (const modul of daten.module) {
    for (const veranstaltung of modul.veranstaltungen) {
      const option = veranstaltung.optionen.find((o) => o.id === optionId);
      if (option) return { modul, veranstaltung, option };
    }
  }
  return null;
}

// Gibt es überhaupt schon eingegebene Daten?
function hatDaten() {
  return daten.module.length > 0 || daten.geblockteZeiten.length > 0 ||
    daten.vorlesungsfrei.length > 0 || daten.favoriten.length > 0;
}
