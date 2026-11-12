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
   ├─ studienbeginn    { typ: 'WS' | 'SS', jahr } – für "1. Semester = WS 26/27"
   ├─ bereiche[]       { id, name, kuerzel, minEcts, maxEcts (null = ohne Obergrenze) }
   ├─ module[]         { id, name, nummer, ects, bereichId, semester (0 = offen),
   │                     status: 'geplant' | 'belegt' | 'bestanden', note }
   └─ katalog          eingelesenes Modulhandbuch (siehe modulhandbuch.js):
                       { quelle, stand, importiertAm, module[]: { kuerzel, name, ects,
                         turnus, bereichIds[], fach, seite, verantwortlich, pruefung, sprache } }
   ===================================================================== */

'use strict';

const VERLAUF_STATUS = {
  geplant: 'geplant',
  belegt: 'belegt',
  bestanden: 'bestanden',
};

function leererStudienverlauf() {
  return { gesamtEcts: 120, semesterAnzahl: 4, studienbeginn: standardStudienbeginn(), bereiche: [], module: [], katalog: null };
}

// Das laufende bzw. nächste Wintersemester (ab März: das kommende)
function standardStudienbeginn(heute = new Date()) {
  return { typ: 'WS', jahr: heute.getMonth() < 2 ? heute.getFullYear() - 1 : heute.getFullYear() };
}

// Semestertyp und Bezeichnung von Fachsemester nr (1, 2, …): { typ: 'WS'|'SS', text: 'WS 26/27' }
function semesterInfo(nr, studienbeginn) {
  const start = studienbeginn || standardStudienbeginn();
  // Zählung ab einem Wintersemester: k = 0 → WS jahr, 1 → SS jahr+1, 2 → WS jahr+1, …
  const basisJahr = start.typ === 'WS' ? start.jahr : start.jahr - 1;
  const k = (start.typ === 'WS' ? 0 : 1) + nr - 1;
  const zweistellig = (jahr) => String(jahr % 100).padStart(2, '0');
  if (k % 2 === 0) {
    const jahr = basisJahr + k / 2;
    return { typ: 'WS', text: `WS ${zweistellig(jahr)}/${zweistellig(jahr + 1)}` };
  }
  return { typ: 'SS', text: `SS ${zweistellig(basisJahr + (k + 1) / 2)}` };
}

function normalisiereKatalog(roh) {
  if (!roh || typeof roh !== 'object' || !Array.isArray(roh.module)) return null;
  return {
    quelle: String(roh.quelle || ''),
    stand: String(roh.stand || ''),
    importiertAm: String(roh.importiertAm || ''),
    module: roh.module.map((m) => ({
      kuerzel: String(m.kuerzel || ''),
      name: String(m.name || ''),
      ects: Math.max(0, leseZahl(m.ects, 0)),
      turnus: String(m.turnus || ''),
      bereichIds: Array.isArray(m.bereichIds) ? m.bereichIds.map(String) : [],
      fach: String(m.fach || ''),
      seite: Number(m.seite) || null,
      verantwortlich: String(m.verantwortlich || ''),
      pruefung: String(m.pruefung || ''),
      sprache: String(m.sprache || ''),
    })).filter((m) => m.kuerzel && m.name),
  };
}

// "WS, jährlich" → { ws, ss }. Unklare Angaben ("alle 4 Semester") → beide false.
function turnusAngebot(turnus) {
  const text = String(turnus || '');
  return { ws: /\bWS\b/.test(text), ss: /\bSS\b/.test(text) };
}

// Katalogeintrag zu einem Modul des Studienverlaufs (über die Modulnummer)
function katalogModul(verlauf, nummer) {
  if (!verlauf.katalog || !nummer) return null;
  return verlauf.katalog.module.find((m) => m.kuerzel === nummer) || null;
}

function neuerBereich() {
  return { id: neueId('bereich'), name: '', kuerzel: '', minEcts: 0, maxEcts: 30 };
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
  const beginn = quelle.studienbeginn || {};
  const katalog = normalisiereKatalog(quelle.katalog);
  if (katalog) katalog.module.forEach((m) => { m.bereichIds = m.bereichIds.filter((id) => bereiche.some((b) => b.id === id)); });
  return {
    gesamtEcts: Math.max(0, leseZahl(quelle.gesamtEcts, basis.gesamtEcts)),
    semesterAnzahl,
    studienbeginn: {
      typ: beginn.typ === 'SS' ? 'SS' : 'WS',
      jahr: Math.round(leseZahl(beginn.jahr, basis.studienbeginn.jahr)),
    },
    katalog,
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

  // Passt das Semester zum Turnus laut Modulhandbuch? (nur bei eindeutigem WS oder SS)
  for (const m of alle) {
    const eintrag = katalogModul(verlauf, m.nummer);
    if (!eintrag || m.semester === 0 || m.status === 'bestanden') continue;
    const angebot = turnusAngebot(eintrag.turnus);
    const info = semesterInfo(m.semester, verlauf.studienbeginn);
    if (angebot.ws !== angebot.ss && !angebot[info.typ.toLowerCase()]) {
      ergebnis.hinweise.push(`„${m.name}“ wird laut Modulhandbuch nur im ${angebot.ws ? 'WS' : 'SS'} angeboten, ` +
        `ist aber im ${m.semester}. Semester (${info.text}) eingeplant.`);
    }
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

/* ---------- Modulhandbuch übernehmen ----------
   ergebnis: Rückgabe von leseModulhandbuch(); gruppen: gewählte Kürzel
   der Modulgruppen (z. B. ['A1', 'A2', …]). Vorhandene Bereiche werden
   über Kürzel oder Namen wiedererkannt und aktualisiert, neue angelegt.
   Der Katalog wird ersetzt. Module im Studienverlauf ohne Bereich
   bekommen ihn aus dem Katalog (Zuordnung über Modulnummer oder Namen).
   Liefert eine Zusammenfassung für die Meldung.
   ------------------------------------------------------------------ */
function uebernimmModulhandbuch(ergebnis, gruppen) {
  const verlauf = daten.studienverlauf;
  const zusammenfassung = { neueBereiche: 0, geaenderteBereiche: 0, module: 0, zugeordnet: 0 };
  if (ergebnis.gesamtEcts) verlauf.gesamtEcts = ergebnis.gesamtEcts;

  const idVon = {}; // Kürzel der Modulgruppe → Bereich-ID
  for (const gruppe of ergebnis.bereiche.filter((g) => gruppen.includes(g.kuerzel))) {
    const name = gruppe.name.toLowerCase();
    let bereich = verlauf.bereiche.find((b) => (b.kuerzel && b.kuerzel === gruppe.kuerzel) || b.name.toLowerCase() === name ||
      (/^[A-Z]\d+$/.test(gruppe.kuerzel) && b.name.startsWith(gruppe.kuerzel + ' ')));
    // Ohne ECTS-Angabe (Auflagenmodule): zählen nicht zum Studienziel → 0–0
    const minEcts = gruppe.minEcts === null ? 0 : gruppe.minEcts;
    const maxEcts = gruppe.minEcts === null ? 0 : gruppe.maxEcts;
    if (bereich) {
      if (bereich.minEcts !== minEcts || bereich.maxEcts !== maxEcts || bereich.name !== gruppe.name) zusammenfassung.geaenderteBereiche++;
      Object.assign(bereich, { name: gruppe.name, kuerzel: gruppe.kuerzel, minEcts, maxEcts });
    } else {
      bereich = { ...neuerBereich(), name: gruppe.name, kuerzel: gruppe.kuerzel, minEcts, maxEcts };
      verlauf.bereiche.push(bereich);
      zusammenfassung.neueBereiche++;
    }
    idVon[gruppe.kuerzel] = bereich.id;
  }

  verlauf.katalog = {
    quelle: ergebnis.titel ? 'Modulhandbuch ' + ergebnis.titel : 'Modulhandbuch',
    stand: ergebnis.stand || '',
    importiertAm: new Date().toISOString(),
    module: ergebnis.module
      .map((m) => ({ ...m, bereichIds: m.bereiche.filter((k) => idVon[k]).map((k) => idVon[k]) }))
      .filter((m) => m.bereichIds.length)
      .map(({ bereiche, ...rest }) => rest),
  };
  zusammenfassung.module = verlauf.katalog.module.length;

  for (const m of verlauf.module) {
    const eintrag = katalogModul(verlauf, m.nummer) ||
      verlauf.katalog.module.find((k) => k.name.toLowerCase() === m.name.trim().toLowerCase());
    if (!eintrag) continue;
    if (!m.nummer) m.nummer = eintrag.kuerzel;
    if (!m.bereichId) {
      m.bereichId = eintrag.bereichIds[0];
      zusammenfassung.zugeordnet++;
    }
  }
  return zusammenfassung;
}

// Holt ein Katalogmodul in den Studienverlauf
function planeKatalogModul(kuerzel, semester, bereichId) {
  const verlauf = daten.studienverlauf;
  const eintrag = katalogModul(verlauf, kuerzel);
  if (!eintrag) return null;
  const modul = {
    ...neuesVerlaufsmodul(),
    name: eintrag.name,
    nummer: eintrag.kuerzel,
    ects: eintrag.ects,
    bereichId: eintrag.bereichIds.includes(bereichId) ? bereichId : eintrag.bereichIds[0] || '',
    semester,
  };
  verlauf.module.push(modul);
  return modul;
}

// Erstes Fachsemester ab "abSemester", in dem das Modul laut Turnus angeboten wird
function passendesSemester(eintrag, studienbeginn, abSemester = 1) {
  const angebot = turnusAngebot(eintrag.turnus);
  if (angebot.ws === angebot.ss) return abSemester;
  for (let nr = abSemester; nr < abSemester + 2; nr++) {
    if (angebot[semesterInfo(nr, studienbeginn).typ.toLowerCase()]) return nr;
  }
  return abSemester;
}

/* ---------- Verbindung zum Semester-Planer ---------- */

// Semester zu einem Datum (z. B. Vorlesungsbeginn): Okt–März → WS, Apr–Sep → SS.
// "2026-10-12" → { typ: 'WS', jahr: 2026 }, "2027-04-19" → { typ: 'SS', jahr: 2027 }
function semesterVonDatum(datum) {
  const treffer = /^(\d{4})-(\d{2})/.exec(datum || '');
  if (!treffer) return null;
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  if (monat >= 10) return { typ: 'WS', jahr };
  if (monat <= 3) return { typ: 'WS', jahr: jahr - 1 };
  return { typ: 'SS', jahr };
}

// Welches Semester plant der Semester-Planer gerade? Aus dem Vorlesungsbeginn,
// ersatzweise aus dem Semesternamen ("WS 2026/27", "SoSe 2027"). Ergebnis
// { typ, jahr, text, fachsemester } oder null. fachsemester = Nummer im
// Studienverlauf (null, wenn außerhalb).
function geplantesSemester() {
  const e = daten.einstellungen;
  let s = semesterVonDatum(e.semesterStart);
  if (!s) {
    const name = String(e.semesterName || '');
    const ws = /\b(WS|WiSe|Winter)\w*\s*(\d{2,4})/i.exec(name);
    const ss = /\b(SS|SoSe|Sommer)\w*\s*(\d{2,4})/i.exec(name);
    const jahr = (text) => (text.length === 2 ? 2000 + Number(text) : Number(text));
    if (ws) s = { typ: 'WS', jahr: jahr(ws[2]) };
    else if (ss) s = { typ: 'SS', jahr: jahr(ss[2]) };
  }
  if (!s) return null;
  const verlauf = daten.studienverlauf;
  const text = semesterInfo(1, s).text;
  let fachsemester = null;
  for (let nr = 1; nr <= Math.max(verlauf.semesterAnzahl + 2, 12); nr++) {
    if (semesterInfo(nr, verlauf.studienbeginn).text === text) { fachsemester = nr; break; }
  }
  return { ...s, text, fachsemester };
}

// Wird das Katalogmodul im Semestertyp angeboten? true/false, null = unklar
function imSemesterAngeboten(eintrag, typ) {
  const angebot = turnusAngebot(eintrag.turnus);
  if (!typ || angebot.ws === angebot.ss) return angebot.ws || null;
  return angebot[typ.toLowerCase()];
}

// Legt aus Katalogmodulen Module im Semester-Planer an. pflichtKuerzel:
// Kürzel, die als Pflicht angelegt werden (alle anderen als Wahlmodule).
// Module, deren Nummer schon existiert, werden übersprungen.
function katalogModuleInPlaner(kuerzelListe, pflichtKuerzel = []) {
  const ergebnis = { neu: [], uebersprungen: [] };
  for (const kuerzel of kuerzelListe) {
    const eintrag = katalogModul(daten.studienverlauf, kuerzel);
    if (!eintrag) continue;
    if (daten.module.some((m) => m.nummer === kuerzel)) {
      ergebnis.uebersprungen.push(eintrag.name);
      continue;
    }
    daten.module.push({
      ...neuesModul(),
      name: eintrag.name,
      nummer: eintrag.kuerzel,
      ects: eintrag.ects,
      dozent: eintrag.verantwortlich,
      pruefungsform: eintrag.pruefung,
      pflicht: pflichtKuerzel.includes(kuerzel),
      notizen: ['Turnus: ' + eintrag.turnus, eintrag.sprache ? 'Sprache: ' + eintrag.sprache : '',
        eintrag.seite ? 'Modulhandbuch S. ' + eintrag.seite : ''].filter(Boolean).join(' · '),
    });
    ergebnis.neu.push(eintrag.name);
  }
  return ergebnis;
}
