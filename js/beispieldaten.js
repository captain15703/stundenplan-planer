/* =====================================================================
   beispieldaten.js – fachneutrale Beispieldaten zum Ausprobieren.
   Sie zeigen alle Funktionen: Pflicht- und Wahlmodule, Übungsgruppen
   als Alternativen, 14-tägige Termine, Blockseminar, Termine nur in der
   ersten Semesterhälfte, geblockte Zeiten mit Puffer und Ferien.
   ===================================================================== */

'use strict';

function beispieldatenErzeugen() {
  // Kleine Helfer, damit die Liste unten kurz und lesbar bleibt
  let zaehler = 0;
  const id = (praefix) => 'bsp-' + praefix + '-' + (++zaehler);

  const termin = (wochentag, von, bis, raum, extra = {}) => ({
    id: id('termin'), rhythmus: 'woechentlich', wochentag, von, bis, raum,
    start: '', ende: '', startwoche: 1, daten: [], ...extra,
  });
  const option = (name, termine, aktiv = true) => ({ id: id('opt'), name, aktiv, termine });
  const veranstaltung = (typ, titel, optionen) => ({ id: id('va'), typ, titel, aktiv: true, optionen });
  const modul = (felder, veranstaltungen) => ({
    id: id('modul'), nummer: '', dozent: '', pruefungsform: '', link: '', notizen: '',
    aktiv: true, ...felder, veranstaltungen,
  });

  return {
    version: DATEN_VERSION,
    einstellungen: {
      ...standardEinstellungen(),
      semesterName: 'WiSe 2026/27 (Beispiel)',
      semesterStart: '2026-10-12',
      semesterEnde: '2027-02-05',
      ectsZiel: 30,
    },

    module: [
      modul({
        name: 'Forschungsmethoden', nummer: 'M-01', ects: 6, pflicht: true, farbe: '#4e79a7',
        dozent: 'Prof. Dr. Anna Beispiel', pruefungsform: 'Klausur (90 min)',
        link: 'https://example.org/modulhandbuch/m-01',
        notizen: 'Übungsgruppe bis 2. Vorlesungswoche wählen.',
      }, [
        veranstaltung('Vorlesung', '', [option('', [termin(1, '10:00', '12:00', 'Hörsaal A')])]),
        veranstaltung('Übung', '', [
          option('Gruppe A', [termin(2, '08:00', '10:00', 'R 2.01')]),
          option('Gruppe B', [termin(2, '14:00', '16:00', 'R 2.01')]),
          option('Gruppe C', [termin(4, '12:00', '14:00', 'R 2.03')]),
        ]),
      ]),

      modul({
        name: 'Wissenschaftliches Schreiben', nummer: 'M-02', ects: 4, pflicht: true, farbe: '#f28e2b',
        dozent: 'Dr. Ben Muster', pruefungsform: 'Hausarbeit',
        notizen: 'Findet nur in der ersten Semesterhälfte statt.',
      }, [
        veranstaltung('Seminar', '', [
          option('', [termin(3, '12:00', '14:00', 'Seminarraum 4', { ende: '2026-12-04' })]),
        ]),
      ]),

      modul({
        name: 'Datenanalyse', nummer: 'W-11', ects: 6, pflicht: false, farbe: '#59a14f',
        dozent: 'Prof. Dr. Clara Probe', pruefungsform: 'Projektarbeit',
      }, [
        veranstaltung('Vorlesung', '', [option('', [termin(4, '10:00', '12:00', 'Hörsaal B')])]),
        // Zwei Übungsgruppen im selben Raum, aber in wechselnden Wochen
        veranstaltung('Übung', '', [
          option('Gruppe A', [termin(5, '10:00', '12:00', 'PC-Pool', { rhythmus: 'zweiwoechentlich', startwoche: 1 })]),
          option('Gruppe B', [termin(5, '10:00', '12:00', 'PC-Pool', { rhythmus: 'zweiwoechentlich', startwoche: 2 })]),
        ]),
      ]),

      modul({
        name: 'Projektmanagement', nummer: 'W-12', ects: 5, pflicht: false, farbe: '#e15759',
        dozent: 'Dana Test', pruefungsform: 'Präsentation',
        notizen: 'Blockseminar: jeweils Freitagnachmittag und Samstag.',
      }, [
        veranstaltung('Seminar', 'Blockseminar', [
          option('', [
            termin(5, '14:00', '18:00', 'Raum 0.12', { rhythmus: 'block', daten: ['2026-11-13', '2026-11-27', '2026-12-11'] }),
            termin(6, '09:00', '16:00', 'Raum 0.12', { rhythmus: 'block', daten: ['2026-11-14', '2026-11-28', '2026-12-12'] }),
          ]),
        ]),
      ]),

      modul({
        name: 'Interkulturelle Kompetenz', nummer: 'W-13', ects: 5, pflicht: false, farbe: '#b07aa1',
        dozent: 'Elif Beispiel', pruefungsform: 'Referat',
        notizen: 'Gruppe Mo kollidiert mit dem Nebenjob (inkl. Puffer) und wird deshalb nie gewählt.',
      }, [
        veranstaltung('Seminar', '', [
          option('Gruppe Mo', [termin(1, '16:00', '18:00', 'R 3.10')]),
          option('Gruppe Mi', [termin(3, '16:00', '18:00', 'R 3.10')]),
          option('Gruppe Do', [termin(4, '14:00', '16:00', 'R 3.10')]),
        ]),
      ]),

      modul({
        name: 'Statistik II', nummer: 'W-14', ects: 6, pflicht: false, farbe: '#76b7b2',
        dozent: 'Prof. Dr. Felix Muster', pruefungsform: 'Klausur (120 min)',
      }, [
        // Eine Vorlesung mit zwei Terminen: dienstags wöchentlich, freitags 14-tägig
        veranstaltung('Vorlesung', '', [option('', [
          termin(2, '10:00', '12:00', 'Hörsaal C'),
          termin(5, '08:00', '10:00', 'Hörsaal C', { rhythmus: 'zweiwoechentlich', startwoche: 2 }),
        ])]),
        veranstaltung('Übung', '', [
          option('Gruppe 1', [termin(3, '08:00', '10:00', 'R 1.05')]),
          option('Gruppe 2', [termin(4, '10:00', '12:00', 'R 1.05')]), // kollidiert mit Datenanalyse
        ]),
      ]),

      modul({
        name: 'Ethik in der Praxis', nummer: 'W-15', ects: 4, pflicht: false, farbe: '#edc948',
        dozent: 'Dr. Greta Muster', pruefungsform: 'Portfolio',
      }, [
        veranstaltung('Seminar', '', [
          option('Gruppe 1', [termin(1, '08:00', '10:00', 'R 2.11')]),
          option('Gruppe 2', [termin(5, '12:00', '14:00', 'R 2.11')]),
        ]),
      ]),

      modul({
        name: 'Digitale Kommunikation', nummer: 'W-16', ects: 5, pflicht: false, farbe: '#9c755f',
        dozent: 'Hanna Probe', pruefungsform: 'Projektbericht',
        link: 'https://example.org/lernplattform/w-16',
      }, [
        veranstaltung('Seminar', '', [
          option('Gruppe Di', [termin(2, '16:00', '18:00', 'Medienlabor')]),
          option('Gruppe Do', [termin(4, '16:00', '18:00', 'Medienlabor')]),
        ]),
      ]),
    ],

    geblockteZeiten: [
      {
        id: id('block'), name: 'Nebenjob', aktiv: true, art: 'woechentlich', wochentag: 1,
        datumVon: '', datumBis: '', ganztags: false, von: '14:00', bis: '18:00', pufferVor: 30, pufferNach: 30,
      },
      {
        id: id('block'), name: 'Sport', aktiv: true, art: 'woechentlich', wochentag: 3,
        datumVon: '', datumBis: '', ganztags: false, von: '18:00', bis: '19:30', pufferVor: 0, pufferNach: 0,
      },
      {
        id: id('block'), name: 'Familienfeier', aktiv: true, art: 'zeitraum', wochentag: 6,
        datumVon: '2026-11-07', datumBis: '2026-11-07', ganztags: true, von: '', bis: '', pufferVor: 0, pufferNach: 0,
      },
    ],

    vorlesungsfrei: [
      { id: id('frei'), name: 'Dies academicus', von: '2026-11-18', bis: '2026-11-18' },
      { id: id('frei'), name: 'Weihnachtspause', von: '2026-12-21', bis: '2027-01-06' },
    ],

    favoriten: [],
  };
}
