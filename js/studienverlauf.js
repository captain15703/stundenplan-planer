/* =====================================================================
   studienverlauf.js – Studienverlaufsplan über alle Semester
   (Rechenlogik ohne Oberfläche, siehe ui-studienverlauf.js).

   Unabhängig vom Semester-Planer: Du legst selbst Modulbereiche mit
   einer ECTS-Spanne an (z. B. "Bereich A: 18–30 ECTS", "Masterarbeit
   30–30") und trägst Module mit Semester und Status ein. Daraus
   berechnet die App den Fortschritt je Bereich, die ECTS pro Semester
   und den nach ECTS gewichteten Notenschnitt.

   Angerechnet aufs Studienziel wird je Bereich höchstens das Maximum –
   was darüber hinausgeht, zählt nicht (übliche Regel; bitte mit der
   eigenen Prüfungsordnung abgleichen).

   daten.studienverlauf
   ├─ gesamtEcts       Ziel des Studiengangs, z. B. 120
   ├─ semesterAnzahl   Regelstudienzeit, z. B. 4
   ├─ bereiche[]       { id, name, minEcts, maxEcts (null = ohne Obergrenze) }
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
  return { id: neueId('bereich'), name: '', minEcts: 0, maxEcts: 30 };
}

// Liest einen Bereich – auch das alte Format mit festem "sollEcts"
function normalisiereBereich(b) {
  const alt = b.sollEcts !== undefined && b.minEcts === undefined && b.maxEcts === undefined;
  const minEcts = Math.max(0, leseZahl(alt ? b.sollEcts : b.minEcts, 0));
  const maxRoh = alt ? b.sollEcts : b.maxEcts;
  let maxEcts = maxRoh === null || maxRoh === '' || maxRoh === undefined ? null : Math.max(0, leseZahl(maxRoh, 0));
  if (maxEcts !== null && maxEcts < minEcts) maxEcts = minEcts;
  const { sollEcts, ...rest } = b;
  return { ...neuerBereich(), ...rest, minEcts, maxEcts };
}

// "18–30 ECTS", "30 ECTS", "ab 12 ECTS", "bis 30 ECTS"
function spanneText(bereich) {
  const { minEcts: min, maxEcts: max } = bereich;
  if (max === null) return min ? `ab ${formatZahl(min)} ECTS` : 'ohne Vorgabe';
  if (min === max) return `${formatZahl(min)} ECTS`;
  if (!min) return `bis ${formatZahl(max)} ECTS`;
  return `${formatZahl(min)}–${formatZahl(max)} ECTS`;
}

function neuesVerlaufsmodul() {
  return { id: neueId('vmodul'), name: '', nummer: '', ects: 5, bereichId: '', semester: 1, status: 'geplant', note: '' };
}

// Ergänzt fehlende Felder (für ältere Daten und Backups)
function normalisiereStudienverlauf(roh) {
  const basis = leererStudienverlauf();
  const quelle = roh && typeof roh === 'object' ? roh : {};
  const semesterAnzahl = Math.min(12, Math.max(1, Math.round(leseZahl(quelle.semesterAnzahl, basis.semesterAnzahl))));
  const bereiche = liste(quelle.bereiche).map(normalisiereBereich);
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
  if (ohne.length && verlauf.bereiche.length) {
    gruppen.push({ bereich: { id: '', name: 'Ohne Bereich', minEcts: 0, maxEcts: null }, module: ohne });
  }
  let angerechnet = 0;
  let ueberzaehlig = 0;
  for (const { bereich, module } of gruppen) {
    const eintrag = {
      bereich,
      min: bereich.minEcts,
      max: bereich.maxEcts,
      bestanden: nachStatus(module, 'bestanden'),
      belegt: nachStatus(module, 'belegt'),
      geplant: nachStatus(module, 'geplant'),
    };
    eintrag.summe = eintrag.bestanden + eintrag.belegt + eintrag.geplant;
    eintrag.angerechnet = eintrag.max === null ? eintrag.summe : Math.min(eintrag.summe, eintrag.max);
    eintrag.zustand = eintrag.summe < eintrag.min ? 'zuwenig' : eintrag.angerechnet < eintrag.summe ? 'zuviel' : 'ok';
    angerechnet += eintrag.angerechnet;
    ueberzaehlig += eintrag.summe - eintrag.angerechnet;
    ergebnis.bereiche.push(eintrag);
    if (!bereich.id) continue;
    if (eintrag.zustand === 'zuwenig') {
      ergebnis.hinweise.push(`„${bereich.name}“: Bis zum Minimum fehlen noch ${formatZahl(eintrag.min - eintrag.summe)} ECTS.`);
    } else if (eintrag.zustand === 'zuviel') {
      ergebnis.hinweise.push(`„${bereich.name}“: ${formatZahl(eintrag.summe - eintrag.max)} ECTS über dem Maximum – sie zählen nicht zum Studienziel.`);
    }
  }
  // Ohne Bereiche zählt einfach alles
  ergebnis.gesamt.angerechnet = verlauf.bereiche.length ? angerechnet : ergebnis.gesamt.summe;
  ergebnis.gesamt.ueberzaehlig = ueberzaehlig;

  // Ist das Ziel mit den Spannen überhaupt erreichbar?
  if (verlauf.bereiche.length) {
    const summeMin = verlauf.bereiche.reduce((s, b) => s + b.minEcts, 0);
    const ohneObergrenze = verlauf.bereiche.some((b) => b.maxEcts === null);
    const summeMax = verlauf.bereiche.reduce((s, b) => s + (b.maxEcts || 0), 0);
    if (summeMin > verlauf.gesamtEcts + 0.01) {
      ergebnis.hinweise.push(`Die Minima der Bereiche ergeben ${formatZahl(summeMin)} ECTS – mehr als das Studienziel von ${formatZahl(verlauf.gesamtEcts)}.`);
    }
    if (!ohneObergrenze && summeMax < verlauf.gesamtEcts - 0.01) {
      ergebnis.hinweise.push(`Die Maxima der Bereiche ergeben nur ${formatZahl(summeMax)} ECTS – das Studienziel von ${formatZahl(verlauf.gesamtEcts)} ist so nicht erreichbar.`);
    }
    // Alle Minima erfüllt, aber insgesamt noch zu wenig: Hinweis, wo noch Platz ist
    const offenGesamt = verlauf.gesamtEcts - ergebnis.gesamt.angerechnet;
    if (offenGesamt > 0.01 && ergebnis.bereiche.every((b) => !b.bereich.id || b.zustand !== 'zuwenig')) {
      const platz = ergebnis.bereiche.filter((b) => b.bereich.id && (b.max === null || b.summe < b.max));
      if (platz.length) {
        ergebnis.hinweise.push(`Noch ${formatZahl(offenGesamt)} ECTS bis zum Studienziel – Platz ist noch in: ` +
          platz.map((b) => `„${b.bereich.name}“ (${b.max === null ? 'beliebig' : 'bis ' + formatZahl(b.max - b.summe)})`).join(', ') + '.');
      }
    }
  }

  // Semester 1 … n, danach "offen" (Semester 0) und Semester über der Regelstudienzeit
  const hoechstes = Math.max(verlauf.semesterAnzahl, ...alle.map((m) => m.semester));
  for (let nr = 1; nr <= hoechstes; nr++) {
    const module = alle.filter((m) => m.semester === nr);
    ergebnis.semester.push({ nr, module, ects: summe(module), ueberRegel: nr > verlauf.semesterAnzahl });
  }
  ergebnis.offen = alle.filter((m) => m.semester === 0);

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
