/* =====================================================================
   ics.js – Export einer Variante als .ics-Datei (iCalendar, RFC 5545),
   z. B. zum Import in Google Kalender.

   - Alle Zeiten in der Zeitzone Europe/Berlin (mit Sommer-/Winterzeit).
   - Wöchentliche und 14-tägige Termine werden als EIN Serientermin mit
     Wiederholungsregel (RRULE) exportiert; vorlesungsfreie Tage werden
     als Ausnahmen (EXDATE) ausgelassen.
   - Jeder Blocktermin wird ein eigener Einzeltermin.
   ===================================================================== */

'use strict';

const ICS_ZEITZONE = 'Europe/Berlin';

/* ---------- Zeitzone Europe/Berlin ----------
   Sommerzeit (MESZ, UTC+2) gilt vom letzten Sonntag im März, 2:00 Uhr,
   bis zum letzten Sonntag im Oktober, 3:00 Uhr. Sonst Winterzeit
   (MEZ, UTC+1).
   ------------------------------------------------------------------ */

// Tagnummer des letzten Sonntags in einem Monat (monat: 1–12)
function letzterSonntag(jahr, monat) {
  const ersterNaechsterMonat = monat === 12 ? datumZuTagNr((jahr + 1) + '-01-01') : datumZuTagNr(jahr + '-' + zweistellig(monat + 1) + '-01');
  const letzterTag = ersterNaechsterMonat - 1;
  return letzterTag - (wochentagVon(letzterTag) % 7); // Sonntag = 7 → 0 Tage zurück
}

// Gilt an diesem Tag zu dieser Uhrzeit (Ortszeit Berlin) die Sommerzeit?
function istSommerzeit(tagNr, minuten) {
  const jahr = new Date(tagNr * MS_PRO_TAG).getUTCFullYear();
  const beginn = letzterSonntag(jahr, 3);
  const ende = letzterSonntag(jahr, 10);
  if (tagNr > beginn && tagNr < ende) return true;
  if (tagNr === beginn) return minuten >= 2 * 60;
  if (tagNr === ende) return minuten < 2 * 60; // 2:00–3:00 gibt es doppelt; wir nehmen die Winterzeit
  return false;
}

// Ortszeit Berlin → Zeitpunkt in UTC (Millisekunden seit 1970)
function berlinNachUtc(tagNr, minuten) {
  const versatzMinuten = istSommerzeit(tagNr, minuten) ? 120 : 60;
  return (tagNr * 24 * 60 + minuten - versatzMinuten) * 60 * 1000;
}

/* ---------- Formatierung ---------- */

// Ortszeit als "20261012T100000" (für DTSTART;TZID=…)
function icsOrtszeit(tagNr, minuten) {
  return tagNrZuDatum(tagNr).replace(/-/g, '') + 'T' + zweistellig(Math.floor(minuten / 60)) + zweistellig(minuten % 60) + '00';
}

// UTC-Zeitpunkt als "20261012T080000Z"
function icsUtc(millisekunden) {
  return new Date(millisekunden).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Text für iCalendar maskieren: \ ; , und Zeilenumbrüche
function icsText(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lange Zeilen nach 75 Bytes umbrechen; Folgezeilen beginnen mit einem
// Leerzeichen. Umlaute zählen in UTF-8 als 2 Bytes und werden nie zerteilt.
function icsFalten(zeile) {
  const teile = [];
  let aktuell = '';
  let bytes = 0;
  for (const zeichen of zeile) {
    const code = zeichen.codePointAt(0);
    const laenge = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    const grenze = teile.length === 0 ? 75 : 74; // Folgezeilen: 1 Byte für das Leerzeichen
    if (bytes + laenge > grenze) {
      teile.push(aktuell);
      aktuell = '';
      bytes = 0;
    }
    aktuell += zeichen;
    bytes += laenge;
  }
  teile.push(aktuell);
  return teile.join('\r\n ');
}

/* ---------- Kalender erzeugen ---------- */

// optionInfos: Liste wie in varianten.js ({ modul, veranstaltung, option, vorkommen })
function erzeugeIcs(optionInfos, kalenderName) {
  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stundenplan-Planer//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsText(kalenderName),
    'X-WR-TIMEZONE:' + ICS_ZEITZONE,
    // Beschreibung der Zeitzone, damit jedes Kalenderprogramm sie kennt
    'BEGIN:VTIMEZONE',
    'TZID:' + ICS_ZEITZONE,
    'X-LIC-LOCATION:' + ICS_ZEITZONE,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  const zeitstempel = icsUtc(Date.now());
  for (const info of optionInfos) {
    for (const termin of info.option.termine) {
      zeilen.push(...terminAlsIcs(info, termin, zeitstempel));
    }
  }
  zeilen.push('END:VCALENDAR');
  return zeilen.map(icsFalten).join('\r\n') + '\r\n';
}

// Alle VEVENT-Zeilen für einen Termin
function terminAlsIcs(info, termin, zeitstempel) {
  // tatsächliche Vorkommen (ohne vorlesungsfreie Tage)
  const vorkommen = info.vorkommen.filter((v) => v.termin === termin);
  if (vorkommen.length === 0) return [];

  const titel = info.modul.name + ' – ' + veranstaltungName(info.veranstaltung) +
    (info.option.name ? ' (' + info.option.name + ')' : '');
  const beschreibung = [
    info.modul.nummer ? 'Modulnummer: ' + info.modul.nummer : '',
    info.modul.ects ? 'ECTS: ' + formatZahl(info.modul.ects) : '',
    info.modul.dozent ? 'Dozent:in: ' + info.modul.dozent : '',
    info.modul.pruefungsform ? 'Prüfung: ' + info.modul.pruefungsform : '',
    sichererLink(info.modul.link) ? 'Link: ' + sichererLink(info.modul.link) : '',
  ].filter(Boolean).join('\n');

  // Gemeinsame Angaben jedes Termins
  const gemeinsam = (start, ende) => {
    const z = [
      'DTSTAMP:' + zeitstempel,
      'DTSTART;TZID=' + ICS_ZEITZONE + ':' + icsOrtszeit(start.tag, start.start),
      'DTEND;TZID=' + ICS_ZEITZONE + ':' + icsOrtszeit(start.tag, ende),
      'SUMMARY:' + icsText(titel),
    ];
    if (termin.raum) z.push('LOCATION:' + icsText(termin.raum));
    if (beschreibung) z.push('DESCRIPTION:' + icsText(beschreibung));
    if (sichererLink(info.modul.link)) z.push('URL:' + sichererLink(info.modul.link));
    return z;
  };

  // Blocktermine (oder Serien mit nur einem Termin): einzelne Ereignisse
  if (termin.rhythmus === 'block' || vorkommen.length === 1) {
    return vorkommen.flatMap((v) => [
      'BEGIN:VEVENT',
      'UID:' + termin.id + '-' + tagNrZuDatum(v.tag) + '@stundenplan-planer',
      ...gemeinsam(v, v.ende),
      'END:VEVENT',
    ]);
  }

  // Serie: vom ersten bis zum letzten tatsächlichen Termin
  const erster = vorkommen[0];
  const letzter = vorkommen[vorkommen.length - 1];
  const abstand = termin.rhythmus === 'zweiwoechentlich' ? 14 : 7;
  const regel = 'RRULE:FREQ=WEEKLY' + (abstand === 14 ? ';INTERVAL=2' : '') +
    ';UNTIL=' + icsUtc(berlinNachUtc(letzter.tag, letzter.start));

  // Ausnahmen: Termine im Rhythmus, die wegen vorlesungsfreier Tage entfallen
  const tatsaechlich = new Set(vorkommen.map((v) => v.tag));
  const ausnahmen = [];
  for (let tag = erster.tag; tag <= letzter.tag; tag += abstand) {
    if (!tatsaechlich.has(tag)) ausnahmen.push(icsOrtszeit(tag, erster.start));
  }

  const zeilen = ['BEGIN:VEVENT', 'UID:' + termin.id + '@stundenplan-planer', ...gemeinsam(erster, erster.ende), regel];
  if (ausnahmen.length) zeilen.push('EXDATE;TZID=' + ICS_ZEITZONE + ':' + ausnahmen.join(','));
  zeilen.push('END:VEVENT');
  return zeilen;
}

// Erzeugt die Datei und startet den Download
function exportiereIcs(optionInfos, name) {
  const inhalt = erzeugeIcs(optionInfos, name);
  const dateiname = (name || 'stundenplan').replace(/[^a-z0-9äöüß_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() + '.ics';
  ladeDateiHerunter(dateiname, inhalt, 'text/calendar;charset=utf-8');
}
