/* =====================================================================
   tests.js – kleine automatische Tests ohne zusätzliche Bibliotheken.
   test('Name', () => { … }) führt einen Test aus; gleich() und wahr()
   melden einen Fehler, wenn das Ergebnis nicht stimmt.
   ===================================================================== */

'use strict';

const testErgebnisse = [];

function test(name, funktion) {
  try {
    funktion();
    testErgebnisse.push({ name, ok: true });
  } catch (fehler) {
    testErgebnisse.push({ name, ok: false, meldung: fehler.message });
  }
}

function gleich(ist, soll, text = '') {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  if (a !== b) throw new Error(`${text} erwartet ${b}, erhalten ${a}`);
}

function wahr(bedingung, text = 'Bedingung nicht erfüllt') {
  if (!bedingung) throw new Error(text);
}

/* ---------- Testdaten-Bausteine ---------- */

let nr = 0;
const tId = (p) => 'test-' + p + '-' + (++nr);
const T = (wochentag, von, bis, extra = {}) => ({
  id: tId('t'), rhythmus: 'woechentlich', wochentag, von, bis, raum: '', start: '', ende: '', startwoche: 1, daten: [], ...extra,
});
const O = (name, termine) => ({ id: tId('o'), name, aktiv: true, termine });
const V = (typ, optionen) => ({ id: tId('v'), typ, titel: '', aktiv: true, optionen });
const M = (name, ects, pflicht, veranstaltungen) => ({ id: tId('m'), name, ects, pflicht, aktiv: true, farbe: '#4e79a7', veranstaltungen });

// Setzt den globalen Datenstand für einen Test
function setzeDaten({ module = [], geblockteZeiten = [], vorlesungsfrei = [], einstellungen = {} }) {
  daten = normalisiereDaten({
    module, geblockteZeiten, vorlesungsfrei,
    einstellungen: { semesterStart: '2026-10-12', semesterEnde: '2027-02-05', ...einstellungen },
  });
}

const tage = (liste) => liste.map((v) => tagNrZuDatum(v.tag));

/* ---------- Datum & Uhrzeit ---------- */

test('Datum ↔ Tagnummer', () => {
  gleich(tagNrZuDatum(datumZuTagNr('2026-10-12')), '2026-10-12');
  gleich(datumZuTagNr('2026-10-13') - datumZuTagNr('2026-10-12'), 1);
});

test('Wochentag und Kalenderwoche', () => {
  gleich(wochentagVon(datumZuTagNr('2026-10-12')), 1, 'Montag:');
  gleich(wochentagVon(datumZuTagNr('2026-10-18')), 7, 'Sonntag:');
  gleich(kalenderwoche(datumZuTagNr('2026-12-31')), 53, 'KW 31.12.2026:');
  gleich(kalenderwoche(datumZuTagNr('2027-01-04')), 1, 'KW 04.01.2027:');
  gleich(kalenderwoche(datumZuTagNr('2026-10-12')), 42, 'KW 12.10.2026:');
});

test('Uhrzeit ↔ Minuten', () => {
  gleich(zeitZuMinuten('10:15'), 615);
  gleich(minutenZuZeit(615), '10:15');
});

/* ---------- Termine → Vorkommen ---------- */

test('Wöchentlicher Termin im eigenen Zeitraum', () => {
  setzeDaten({});
  const v = vorkommenVonTermin(T(1, '10:00', '12:00', { start: '2026-10-12', ende: '2026-11-02' }), new Set());
  gleich(tage(v), ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
  gleich([v[0].start, v[0].ende], [600, 720]);
});

test('Ohne eigenes Datum gilt der Vorlesungszeitraum', () => {
  setzeDaten({});
  const v = vorkommenVonTermin(T(5, '08:00', '10:00'), new Set());
  gleich(tagNrZuDatum(v[0].tag), '2026-10-16', 'erster Freitag:');
  gleich(tagNrZuDatum(v[v.length - 1].tag), '2027-02-05', 'letzter Freitag:');
  gleich(v.length, 17);
});

test('14-tägig mit Startwoche 1 und 2', () => {
  setzeDaten({});
  const w1 = vorkommenVonTermin(T(5, '10:00', '12:00', { rhythmus: 'zweiwoechentlich', startwoche: 1, ende: '2026-11-30' }), new Set());
  const w2 = vorkommenVonTermin(T(5, '10:00', '12:00', { rhythmus: 'zweiwoechentlich', startwoche: 2, ende: '2026-11-30' }), new Set());
  gleich(tage(w1), ['2026-10-16', '2026-10-30', '2026-11-13', '2026-11-27']);
  gleich(tage(w2), ['2026-10-23', '2026-11-06', '2026-11-20']);
});

test('Vorlesungsfreie Tage entfallen, Rhythmus läuft weiter', () => {
  setzeDaten({ vorlesungsfrei: [{ name: 'Dies', von: '2026-11-18', bis: '2026-11-18' }, { name: 'Weihnachten', von: '2026-12-21', bis: '2027-01-06' }] });
  const v = tage(vorkommenVonTermin(T(3, '12:00', '14:00'), vorlesungsfreieTage()));
  wahr(!v.includes('2026-11-18'), 'Dies academicus sollte fehlen');
  wahr(!v.includes('2026-12-23') && !v.includes('2026-12-30') && !v.includes('2027-01-06'), 'Weihnachtspause sollte fehlen');
  wahr(v.includes('2026-11-25') && v.includes('2027-01-13'), 'Termine danach sollten bleiben');
});

test('Blocktermine bleiben auch an vorlesungsfreien Tagen', () => {
  setzeDaten({ vorlesungsfrei: [{ name: 'Frei', von: '2026-11-14', bis: '2026-11-14' }] });
  const v = vorkommenVonTermin(T(6, '09:00', '16:00', { rhythmus: 'block', daten: ['2026-11-28', '2026-11-14'] }), vorlesungsfreieTage());
  gleich(tage(v), ['2026-11-14', '2026-11-28']);
});

test('Geblockte Zeit mit Puffer und ganztägig', () => {
  setzeDaten({});
  const vonTag = datumZuTagNr('2026-10-12');
  const job = vorkommenVonGeblockterZeit({ ...neueGeblockteZeit(), art: 'woechentlich', wochentag: 1, von: '14:00', bis: '18:00', pufferVor: 30, pufferNach: 15 }, vonTag, vonTag + 13);
  gleich(tage(job), ['2026-10-12', '2026-10-19']);
  gleich([job[0].start, job[0].ende, job[0].kernStart, job[0].kernEnde], [810, 1095, 840, 1080]);
  const urlaub = vorkommenVonGeblockterZeit({ ...neueGeblockteZeit(), art: 'zeitraum', datumVon: '2026-10-14', datumBis: '2026-10-15', ganztags: true }, vonTag, vonTag + 30);
  gleich(tage(urlaub), ['2026-10-14', '2026-10-15']);
  gleich([urlaub[0].start, urlaub[0].ende], [0, 1440]);
});

/* ---------- Überschneidungen ---------- */

test('Aneinander anschließende Termine überschneiden sich nicht', () => {
  setzeDaten({});
  const a = vorkommenVonTermin(T(1, '10:00', '12:00'), new Set());
  const b = vorkommenVonTermin(T(1, '12:00', '14:00'), new Set());
  gleich(ersteUeberschneidung(a, b), null);
});

test('Echte Überschneidung wird erkannt', () => {
  setzeDaten({});
  const a = vorkommenVonTermin(T(1, '10:00', '12:00'), new Set());
  const b = vorkommenVonTermin(T(1, '11:30', '13:00', { start: '2026-11-01' }), new Set());
  const treffer = ersteUeberschneidung(a, b);
  wahr(treffer !== null, 'Überschneidung erwartet');
  gleich(tagNrZuDatum(treffer.a.tag), '2026-11-02', 'erster gemeinsamer Termin:');
});

test('14-tägig in wechselnden Wochen kollidiert nicht', () => {
  setzeDaten({});
  const a = vorkommenVonTermin(T(5, '10:00', '12:00', { rhythmus: 'zweiwoechentlich', startwoche: 1 }), new Set());
  const b = vorkommenVonTermin(T(5, '10:00', '12:00', { rhythmus: 'zweiwoechentlich', startwoche: 2 }), new Set());
  gleich(ersteUeberschneidung(a, b), null);
});

test('Getrennte Zeiträume kollidieren nicht', () => {
  setzeDaten({});
  const a = vorkommenVonTermin(T(3, '12:00', '14:00', { ende: '2026-12-04' }), new Set());
  const b = vorkommenVonTermin(T(3, '12:00', '14:00', { start: '2026-12-07' }), new Set());
  gleich(ersteUeberschneidung(a, b), null);
});

/* ---------- Variantensuche ---------- */

test('Auswahlgruppe: genau eine Gruppe je Variante', () => {
  setzeDaten({
    module: [M('A', 6, true, [
      V('Vorlesung', [O('', [T(1, '10:00', '12:00')])]),
      V('Übung', [O('A', [T(2, '08:00', '10:00')]), O('B', [T(2, '10:00', '12:00')]), O('C', [T(4, '10:00', '12:00')])]),
    ])],
    einstellungen: { ectsZiel: 0 },
  });
  const erg = berechneVarianten();
  gleich(erg.anzahl, 3);
  erg.varianten.forEach((v) => gleich(v.optionen.length, 2, 'Optionen je Variante:'));
});

test('Kollidierende Gruppe wird nicht kombiniert', () => {
  setzeDaten({
    module: [
      M('A', 6, true, [V('Übung', [O('A', [T(2, '08:00', '10:00')]), O('B', [T(2, '10:00', '12:00')])])]),
      M('B', 6, true, [V('Vorlesung', [O('', [T(2, '09:00', '11:00')])])]),
    ],
    einstellungen: { ectsZiel: 0 },
  });
  gleich(berechneVarianten().anzahl, 0, 'beide Gruppen kollidieren:');
  daten.module[1].veranstaltungen[0].optionen[0].termine[0].von = '10:00';
  daten.module[1].veranstaltungen[0].optionen[0].termine[0].bis = '12:00';
  const erg = berechneVarianten();
  gleich(erg.anzahl, 1);
  const namen = erg.varianten[0].optionen.map((n) => erg.optionen[n].option.name);
  wahr(namen.includes('A') && !namen.includes('B'), 'Gruppe A erwartet, erhalten: ' + namen);
});

test('Geblockte Zeit inkl. Puffer schließt Gruppe aus', () => {
  setzeDaten({
    module: [M('A', 6, true, [V('Übung', [O('früh', [T(1, '12:00', '13:30')]), O('spät', [T(1, '12:30', '14:00')])])])],
    geblockteZeiten: [{ name: 'Job', art: 'woechentlich', wochentag: 1, von: '14:00', bis: '18:00', pufferVor: 30, pufferNach: 0 }],
    einstellungen: { ectsZiel: 0 },
  });
  const erg = berechneVarianten();
  gleich(erg.anzahl, 1);
  gleich(erg.optionen[erg.varianten[0].optionen[0]].option.name, 'früh');
  wahr(erg.diagnose.some((d) => d.text.includes('Job')), 'Diagnose sollte den Job nennen');
});

test('Deaktivierte Module, Veranstaltungen und Gruppen zählen nicht', () => {
  setzeDaten({
    module: [
      M('A', 6, true, [V('Übung', [O('A', [T(2, '08:00', '10:00')]), O('B', [T(3, '08:00', '10:00')])])]),
      M('B', 6, true, [V('Vorlesung', [O('', [T(2, '08:00', '10:00')])])]),
    ],
    einstellungen: { ectsZiel: 0 },
  });
  gleich(berechneVarianten().anzahl, 1);
  daten.module[1].aktiv = false;
  gleich(berechneVarianten().anzahl, 2, 'Modul B aus:');
  daten.module[0].veranstaltungen[0].optionen[1].aktiv = false;
  gleich(berechneVarianten().anzahl, 1, 'Gruppe B aus:');
  daten.module[0].veranstaltungen[0].aktiv = false;
  const erg = berechneVarianten();
  gleich([erg.anzahl, erg.varianten[0].optionen.length], [1, 0], 'Übung aus:');
});

test('Wahlmodule und ECTS-Ziel', () => {
  setzeDaten({
    module: [
      M('Pflicht', 6, true, [V('Vorlesung', [O('', [T(1, '10:00', '12:00')])])]),
      M('Wahl 1', 5, false, [V('Seminar', [O('', [T(2, '10:00', '12:00')])])]),
      M('Wahl 2', 4, false, [V('Seminar', [O('', [T(2, '11:00', '13:00')])])]), // kollidiert mit Wahl 1
    ],
    einstellungen: { ectsZiel: 6, nurZielErreicht: true },
  });
  gleich(berechneVarianten().anzahl, 3, 'Ziel 6 (Pflicht, +W1, +W2):');
  daten.einstellungen.ectsZiel = 10;
  const erg = berechneVarianten();
  gleich([erg.anzahl, erg.varianten[0].ects], [2, 10], 'Ziel 10:');
  daten.einstellungen.ectsZiel = 12;
  const nichts = berechneVarianten();
  gleich(nichts.anzahl, 0, 'Ziel 12 (W1+W2 kollidieren):');
  wahr(nichts.diagnose.some((d) => d.art === 'fehler'), 'Fehler-Diagnose erwartet');
  daten.einstellungen.nurZielErreicht = false;
  const ohneFilter = berechneVarianten();
  gleich([ohneFilter.anzahl, ohneFilter.varianten[0].ects], [3, 11], 'ohne Filter, nächste am Ziel zuerst:');
});

test('Unerreichbares ECTS-Ziel wird erklärt', () => {
  setzeDaten({
    module: [M('A', 6, true, []), M('B', 5, false, [])],
    einstellungen: { ectsZiel: 30, nurZielErreicht: true },
  });
  const erg = berechneVarianten();
  gleich(erg.anzahl, 0);
  wahr(erg.diagnose.some((d) => d.text.includes('nicht erreichbar')), 'Hinweis „nicht erreichbar“ erwartet');
});

test('Unmögliches Pflichtmodul wird erklärt', () => {
  setzeDaten({
    module: [M('A', 6, true, [V('Übung', [O('A', [T(1, '15:00', '16:00')])])])],
    geblockteZeiten: [{ name: 'Job', art: 'woechentlich', wochentag: 1, von: '14:00', bis: '18:00' }],
    einstellungen: { ectsZiel: 0 },
  });
  const erg = berechneVarianten();
  gleich(erg.anzahl, 0);
  wahr(erg.diagnose.some((d) => d.art === 'fehler' && d.text.includes('Pflichtmodul')), 'Pflichtmodul-Hinweis erwartet');
});

/* ---------- Kennzahlen & Sortierung ---------- */

test('Kennzahlen: Uni-Tage, Freistunden, Beginn', () => {
  setzeDaten({});
  const info = {
    vorkommen: [
      ...vorkommenVonTermin(T(1, '08:00', '10:00', { ende: '2026-10-25' }), new Set()),
      ...vorkommenVonTermin(T(1, '12:00', '14:00', { ende: '2026-10-25' }), new Set()),
      ...vorkommenVonTermin(T(1, '14:10', '15:00', { ende: '2026-10-25' }), new Set()), // Lücke 10 min zählt nicht
      ...vorkommenVonTermin(T(3, '10:00', '12:00', { ende: '2026-10-18' }), new Set()), // nur in Woche 1
    ],
  };
  const k = berechneKennzahlen([info]);
  gleich(k.wochen, 2);
  gleich(k.tageProWoche, 1.5, 'Ø Tage (2 + 1) / 2:');
  gleich(k.freistundenProWoche, 2, 'Ø Freistunden:');
  gleich(Math.round(k.beginn), Math.round((480 + 480 + 600) / 3), 'Ø Beginn:');
  gleich(k.fruehesterBeginn, 480);
});

test('Sortierung nach Prioritäten', () => {
  setzeDaten({
    module: [M('A', 6, true, [V('Übung', [
      O('früh, ein Tag', [T(1, '08:00', '10:00'), T(1, '10:00', '12:00')]),
      O('spät, zwei Tage', [T(1, '12:00', '14:00'), T(2, '12:00', '14:00')]),
    ])])],
    einstellungen: { ectsZiel: 0 },
  });
  const name = (erg) => erg.optionen[erg.varianten[0].optionen[0]].option.name;
  gleich(name(berechneVarianten()), 'früh, ein Tag', 'Standard (wenigste Tage vor Beginn):');
  daten.einstellungen.prioritaeten = [{ schluessel: 'beginn', aktiv: true }, { schluessel: 'tage', aktiv: true }];
  daten = normalisiereDaten(daten);
  gleich(name(berechneVarianten()), 'spät, zwei Tage', 'Beginn zuerst:');
});

test('Anzahl angezeigter Varianten wird begrenzt', () => {
  const gruppen = (wt) => [8, 10, 12, 14, 16].map((h) => O('G' + h, [T(wt, minutenZuZeit(h * 60), minutenZuZeit(h * 60 + 90))]));
  setzeDaten({
    module: [M('A', 5, true, [V('Übung', gruppen(1))]), M('B', 5, true, [V('Übung', gruppen(2))]), M('C', 5, true, [V('Übung', gruppen(3))])],
    einstellungen: { ectsZiel: 0, maxVarianten: 10 },
  });
  const erg = berechneVarianten();
  gleich([erg.anzahl, erg.varianten.length], [125, 10]);
});

test('Abkürzung bei ECTS-Priorität ändert die besten Varianten nicht', () => {
  const schluessel = (erg) => erg.varianten.map((v) => v.optionen.map((n) => erg.optionen[n].option.id).sort().join() + '|' + v.module.map((m) => m.id).sort().join());
  for (const ziel of [10, 20, 28]) {
    daten = normalisiereDaten(beispieldatenErzeugen());
    daten.einstellungen.ectsZiel = ziel;
    daten.einstellungen.maxVarianten = 100;
    const voll = berechneVarianten();
    wahr(!voll.abgebrochen, 'vollständige Suche erwartet');
    daten.einstellungen.maxVarianten = 5;
    const kurz = berechneVarianten();
    gleich(schluessel(kurz), schluessel(voll).slice(0, 5), 'Ziel ' + ziel + ':');
    wahr(kurz.uebersprungen, 'Abkürzung sollte greifen (Ziel ' + ziel + ')');
  }
});

/* ---------- Beispieldaten & Leistung ---------- */

test('Beispieldaten: Varianten sind wirklich überschneidungsfrei', () => {
  daten = normalisiereDaten(beispieldatenErzeugen());
  daten.einstellungen.maxVarianten = 100;
  const erg = berechneVarianten();
  wahr(erg.anzahl > 0, 'Varianten erwartet');
  wahr(!erg.diagnose.some((d) => d.art === 'fehler'), 'keine Fehler erwartet');
  const { blockVorkommen } = bereiteVor();
  for (const variante of erg.varianten) {
    const infos = variante.optionen.map((n) => erg.optionen[n]);
    wahr(variante.ects >= 30, 'ECTS-Ziel erreicht');
    for (let i = 0; i < infos.length; i++) {
      wahr(ersteUeberschneidung(infos[i].vorkommen, blockVorkommen) === null, 'Kollision mit geblockter Zeit');
      for (let j = i + 1; j < infos.length; j++) {
        wahr(ersteUeberschneidung(infos[i].vorkommen, infos[j].vorkommen) === null, 'Überschneidung in Variante');
      }
    }
    // Jede Veranstaltung jedes belegten Moduls ist genau einmal vertreten
    for (const modul of variante.module) {
      for (const v of modul.veranstaltungen) gleich(infos.filter((info) => info.veranstaltung === v).length, 1, modul.name + ':');
    }
  }
  // Gruppe Mo von "Interkulturelle Kompetenz" kollidiert mit dem Nebenjob
  wahr(erg.diagnose.some((d) => d.text.includes('Gruppe Mo') && d.text.includes('Nebenjob')), 'Diagnose Gruppe Mo');
});

test('Leistung: realistisch viele Alternativen werden vollständig berechnet', () => {
  // 10 Module (4 Pflicht, 6 Wahl): Vorlesung fest + Übung mit 3–5 Gruppen
  const module = [];
  for (let m = 0; m < 10; m++) {
    const vlStunde = 8 + 2 * Math.floor(m / 5);
    const vorlesung = O('', [T((m % 5) + 1, minutenZuZeit(vlStunde * 60), minutenZuZeit((vlStunde + 2) * 60))]);
    const gruppen = [];
    for (let g = 0; g < 3 + (m % 3); g++) {
      const stunde = 12 + 2 * ((m + g) % 3);
      gruppen.push(O('G' + g, [T(((m + g * 2) % 5) + 1, minutenZuZeit(stunde * 60), minutenZuZeit(stunde * 60 + 90))]));
    }
    module.push(M('Modul ' + m, m % 2 ? 6 : 5, m < 4, [V('Vorlesung', [vorlesung]), V('Übung', gruppen)]));
  }
  setzeDaten({ module, einstellungen: { ectsZiel: 30 } });
  const start = performance.now();
  const erg = berechneVarianten();
  const dauer = performance.now() - start;
  console.log('Leistungstest realistisch:', erg.anzahl, 'Varianten bewertet,', Math.round(dauer), 'ms');
  wahr(!erg.abgebrochen, 'Suche sollte vollständig sein');
  wahr(dauer < 1000, 'zu langsam: ' + Math.round(dauer) + ' ms');
  wahr(erg.varianten.length === 20 && erg.varianten.every((v) => v.ects >= 30), '20 Varianten mit ≥ 30 ECTS erwartet');
});

test('Leistung: extrem viele Alternativen enden nach dem Zeitbudget', () => {
  // 12 Module mit je 2 Veranstaltungen und 4–5 Gruppen → viele Millionen Kombinationen
  const module = [];
  for (let m = 0; m < 12; m++) {
    const veranstaltungen = [0, 1].map((k) => V('Übung', [0, 1, 2, 3, 4].slice(0, 4 + (m % 2)).map((g) => {
      const wochentag = ((m + k * 3 + g) % 5) + 1;
      const stunde = 8 + ((m * 2 + g * 3 + k) % 10);
      return O('G' + g, [T(wochentag, minutenZuZeit(stunde * 60), minutenZuZeit(stunde * 60 + 90))]);
    })));
    module.push(M('Modul ' + m, 5, m < 4, veranstaltungen));
  }
  setzeDaten({ module, einstellungen: { ectsZiel: 30, prioritaeten: [{ schluessel: 'tage', aktiv: true }] } });
  const start = performance.now();
  const erg = berechneVarianten();
  const dauer = performance.now() - start;
  console.log('Leistungstest extrem:', erg.anzahl, 'Varianten bewertet,', Math.round(dauer), 'ms, abgebrochen:', erg.abgebrochen);
  wahr(erg.abgebrochen, 'Abbruch nach Zeitbudget erwartet');
  wahr(dauer < ZEITBUDGET_MS + 500, 'Zeitbudget überschritten: ' + Math.round(dauer) + ' ms');
  wahr(erg.varianten.length === 20, '20 Varianten erwartet');
});

/* ---------- Ergebnis anzeigen ---------- */

function zeigeTestergebnis() {
  const fehlgeschlagen = testErgebnisse.filter((t) => !t.ok);
  document.getElementById('zusammenfassung').innerHTML = fehlgeschlagen.length
    ? `<span class="fehler">${fehlgeschlagen.length} von ${testErgebnisse.length} Tests fehlgeschlagen</span>`
    : `<span class="ok">Alle ${testErgebnisse.length} Tests bestanden ✓</span>`;
  document.getElementById('ergebnisse').innerHTML = testErgebnisse.map((t) =>
    `<li class="${t.ok ? 'ok' : 'fehler'}">${t.ok ? '✓' : '✗'} ${escapeHtml(t.name)}${t.ok ? '' : '<pre>' + escapeHtml(t.meldung) + '</pre>'}</li>`
  ).join('');
  // Für automatische Prüfung (z. B. mit Playwright)
  window.testZusammenfassung = { gesamt: testErgebnisse.length, fehlgeschlagen: fehlgeschlagen.map((t) => t.name + ': ' + t.meldung) };
}

// Weitere Testdateien (z. B. für den Kalender-Export) können sich hier einreihen
window.addEventListener('load', zeigeTestergebnis);
