/* =====================================================================
   studienverlauf.js – Studienverlaufsplan über alle Semester
   (Rechenlogik ohne Oberfläche, siehe ui-studienverlauf.js).

   Unabhängig vom Semester-Planer: Du legst selbst Modulbereiche mit
   Soll-ECTS an (z. B. "Pflichtbereich 30", "Wahlbereich 42",
   "Masterarbeit 30") und trägst Module mit Semester und Status ein.
   Daraus berechnet die App den Fortschritt je Bereich, die ECTS pro
   Semester und den nach ECTS gewichteten Notenschnitt.

   daten.studienverlauf
   ├─ gesamtEcts       Ziel des Studiengangs, z. B. 120
   ├─ semesterAnzahl   Regelstudienzeit, z. B. 4
   ├─ bereiche[]       { id, name, sollEcts }
   └─ module[]         { id, name, nummer, ects, bereichId, semester (0 = offen),
                         status: 'geplant' | 'belegt' | 'bestanden', note }
   ===================================================================== */

'use strict';

const VERLAUF_STATUS = {
  geplant: 'geplant',
  belegt: 'belegt',
  bestanden: 'bestanden',
};

function leererStudienverlauf() {
  return { gesamtEcts: 120, semesterAnzahl: 4, bereiche: [], module: [] };
}

function neuerBereich() {
  return { id: neueId('bereich'), name: '', sollEcts: 30 };
}

function neuesVerlaufsmodul() {
  return { id: neueId('vmodul'), name: '', nummer: '', ects: 5, bereichId: '', semester: 1, status: 'geplant', note: '' };
}

// Ergänzt fehlende Felder (für ältere Daten und Backups)
function normalisiereStudienverlauf(roh) {
  const basis = leererStudienverlauf();
  const quelle = roh && typeof roh === 'object' ? roh : {};
  const semesterAnzahl = Math.min(12, Math.max(1, Math.round(leseZahl(quelle.semesterAnzahl, basis.semesterAnzahl))));
  const bereiche = liste(quelle.bereiche).map((b) => ({ ...neuerBereich(), ...b, sollEcts: Math.max(0, leseZahl(b.sollEcts, 0)) }));
  return {
    gesamtEcts: Math.max(0, leseZahl(quelle.gesamtEcts, basis.gesamtEcts)),
    semesterAnzahl,
    bereiche,
    module: liste(quelle.module).map((m) => ({
      ...neuesVerlaufsmodul(),
      ...m,
      ects: Math.max(0, leseZahl(m.ects, 0)),
      semester: Math.max(0, Math.round(leseZahl(m.semester, 0))),
      status: VERLAUF_STATUS[m.status] ? m.status : 'geplant',
      bereichId: bereiche.some((b) => b.id === m.bereichId) ? m.bereichId : '',
      note: m.note === null || m.note === undefined ? '' : String(m.note),
    })),
  };
}

// Liest eine Note wie "1,7" oder "2.3". Ergebnis: Zahl zwischen 1 und 5 oder null
function leseNote(text) {
  const note = leseZahl(String(text || '').trim(), NaN);
  return Number.isFinite(note) && note >= 1 && note <= 5 ? note : null;
}

// Schneidet nach der ersten Nachkommastelle ab (2,37 → 2,3), wie es viele
// Prüfungsordnungen für die Gesamtnote vorsehen – ohne zu runden.
function noteAbgeschnitten(note) {
  return Math.floor(note * 10 + 1e-9) / 10;
}

// Alle Auswertungen für die Übersicht
function werteStudienverlaufAus(verlauf) {
  const summe = (module) => module.reduce((s, m) => s + m.ects, 0);
  const nachStatus = (module, status) => summe(module.filter((m) => m.status === status));

  const alle = verlauf.module;
  const ergebnis = {
    gesamt: {
      soll: verlauf.gesamtEcts,
      bestanden: nachStatus(alle, 'bestanden'),
      belegt: nachStatus(alle, 'belegt'),
      geplant: nachStatus(alle, 'geplant'),
    },
    bereiche: [],
    semester: [],
    schnitt: null, // { genau, abgeschnitten, ects }
    hinweise: [],
  };
  ergebnis.gesamt.summe = ergebnis.gesamt.bestanden + ergebnis.gesamt.belegt + ergebnis.gesamt.geplant;

  // Bereiche (plus "ohne Bereich", falls Module keinem zugeordnet sind)
  const gruppen = verlauf.bereiche.map((b) => ({ bereich: b, module: alle.filter((m) => m.bereichId === b.id) }));
  const ohne = alle.filter((m) => !m.bereichId);
  if (ohne.length && verlauf.bereiche.length) gruppen.push({ bereich: { id: '', name: 'Ohne Bereich', sollEcts: 0 }, module: ohne });
  for (const { bereich, module } of gruppen) {
    const eintrag = {
      bereich,
      soll: bereich.sollEcts,
      bestanden: nachStatus(module, 'bestanden'),
      belegt: nachStatus(module, 'belegt'),
      geplant: nachStatus(module, 'geplant'),
    };
    eintrag.summe = eintrag.bestanden + eintrag.belegt + eintrag.geplant;
    ergebnis.bereiche.push(eintrag);
    if (!bereich.id) continue;
    if (eintrag.summe < eintrag.soll) {
      ergebnis.hinweise.push(`„${bereich.name}“: Es fehlen noch ${formatZahl(eintrag.soll - eintrag.summe)} ECTS in der Planung.`);
    } else if (eintrag.summe > eintrag.soll) {
      ergebnis.hinweise.push(`„${bereich.name}“: ${formatZahl(eintrag.summe - eintrag.soll)} ECTS mehr geplant als nötig.`);
    }
  }

  // Semester 1 … n, danach "offen" (Semester 0) und Semester über der Regelstudienzeit
  const hoechstes = Math.max(verlauf.semesterAnzahl, ...alle.map((m) => m.semester));
  for (let nr = 1; nr <= hoechstes; nr++) {
    const module = alle.filter((m) => m.semester === nr);
    ergebnis.semester.push({ nr, module, ects: summe(module), ueberRegel: nr > verlauf.semesterAnzahl });
  }
  ergebnis.offen = alle.filter((m) => m.semester === 0);

  const sollBereiche = verlauf.bereiche.reduce((s, b) => s + b.sollEcts, 0);
  if (verlauf.bereiche.length && Math.abs(sollBereiche - verlauf.gesamtEcts) > 0.01) {
    ergebnis.hinweise.push(`Die Soll-ECTS der Bereiche ergeben ${formatZahl(sollBereiche)}, das Studienziel ist ${formatZahl(verlauf.gesamtEcts)} ECTS.`);
  }

  // Notenschnitt, gewichtet nach ECTS (nur bestandene Module mit Note)
  let gewichtet = 0;
  let ectsMitNote = 0;
  for (const m of alle) {
    const note = leseNote(m.note);
    if (m.status !== 'bestanden' || note === null || m.ects <= 0) continue;
    gewichtet += note * m.ects;
    ectsMitNote += m.ects;
  }
  if (ectsMitNote > 0) {
    const genau = gewichtet / ectsMitNote;
    ergebnis.schnitt = { genau, abgeschnitten: noteAbgeschnitten(genau), ects: ectsMitNote };
  }
  return ergebnis;
}

// Übernimmt die Module einer Variante in ein Semester.
// zuordnung: { modulId: bereichId }. Module, die (gleicher Name) schon im
// Studienverlauf stehen, werden übersprungen. Ergebnis: { neu, uebersprungen }
function uebernimmInStudienverlauf(module, semester, zuordnung = {}) {
  const verlauf = daten.studienverlauf;
  const ergebnis = { neu: [], uebersprungen: [] };
  for (const modul of module) {
    const vorhanden = verlauf.module.find((m) => m.name.trim().toLowerCase() === modul.name.trim().toLowerCase());
    if (vorhanden) {
      ergebnis.uebersprungen.push(modul.name);
      continue;
    }
    verlauf.module.push({
      ...neuesVerlaufsmodul(),
      name: modul.name,
      nummer: modul.nummer || '',
      ects: modul.ects,
      bereichId: zuordnung[modul.id] || '',
      semester,
      status: 'belegt',
    });
    ergebnis.neu.push(modul.name);
  }
  return ergebnis;
}
