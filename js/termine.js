/* =====================================================================
   termine.js – alles rund um einzelne Termine:
   wirksamer Zeitraum, erster Termin bei 14-tägigem Rhythmus,
   Umrechnung in konkrete Vorkommen (Datum + Uhrzeit) und
   lesbare Beschreibungen ("Mo 10:00–12:00 · wöchentlich · R 1.23").

   Ein "Vorkommen" ist ein einzelner, konkreter Termin im Kalender:
   { tag: Tagnummer, start: Minuten, ende: Minuten }
   Aus "jeden Montag 10–12 Uhr vom 12.10. bis 05.02." werden so rund
   16 Vorkommen. Damit lässt sich exakt prüfen, ob sich zwei Termine
   wirklich überschneiden – auch bei 14-tägigem Rhythmus oder Ferien.
   ===================================================================== */

'use strict';

const MINUTEN_PRO_TAG = 24 * 60;

// Alle vorlesungsfreien Tage als Menge (Set) von Tagnummern
function vorlesungsfreieTage() {
  const tage = new Set();
  for (const frei of daten.vorlesungsfrei) {
    const von = datumZuTagNr(frei.von);
    const bis = datumZuTagNr(frei.bis) ?? von;
    if (von === null) continue;
    for (let tag = von; tag <= bis; tag++) tage.add(tag);
  }
  return tage;
}

// Alle Vorkommen eines Termins, nach Datum sortiert.
// Wöchentliche und 14-tägige Termine entfallen an vorlesungsfreien Tagen;
// Blocktermine haben feste Daten und bleiben immer bestehen.
function vorkommenVonTermin(termin, freieTage) {
  const start = zeitZuMinuten(termin.von);
  const ende = zeitZuMinuten(termin.bis);
  if (start === null || ende === null || start >= ende) return [];

  const liste = [];
  if (termin.rhythmus === 'block') {
    for (const datum of termin.daten) {
      const tag = datumZuTagNr(datum);
      if (tag !== null) liste.push({ tag, start, ende });
    }
    return liste.sort((a, b) => a.tag - b.tag);
  }

  const erster = ersterTerminTag(termin);
  const letzter = zeitraumVon(termin).ende;
  if (erster === null || letzter === null) return [];
  const abstand = termin.rhythmus === 'zweiwoechentlich' ? 14 : 7;
  for (let tag = erster; tag <= letzter; tag += abstand) {
    if (!freieTage.has(tag)) liste.push({ tag, start, ende });
  }
  return liste;
}

// Zeitfenster einer geblockten Zeit an einem Tag (in Minuten):
// start/ende MIT Puffer, kernStart/kernEnde OHNE Puffer – oder null.
function zeitfensterVonGeblockterZeit(block) {
  if (block.ganztags) return { start: 0, ende: MINUTEN_PRO_TAG, kernStart: 0, kernEnde: MINUTEN_PRO_TAG, block };
  const kernStart = zeitZuMinuten(block.von);
  const kernEnde = zeitZuMinuten(block.bis);
  if (kernStart === null || kernEnde === null || kernStart >= kernEnde) return null;
  return {
    start: Math.max(0, kernStart - block.pufferVor),
    ende: Math.min(MINUTEN_PRO_TAG, kernEnde + block.pufferNach),
    kernStart,
    kernEnde,
    block,
  };
}

// Alle Vorkommen einer geblockten Zeit zwischen vonTag und bisTag
// (jeweils mit Tagnummer und dem Zeitfenster von oben)
function vorkommenVonGeblockterZeit(block, vonTag, bisTag) {
  const liste = [];
  const fenster = zeitfensterVonGeblockterZeit(block);
  if (!fenster) return liste;

  let erster = datumZuTagNr(block.datumVon);
  let letzter = datumZuTagNr(block.datumBis);
  if (block.art === 'zeitraum') {
    if (erster === null) return liste;
    if (letzter === null) letzter = erster;
  }
  erster = Math.max(erster ?? vonTag, vonTag);
  letzter = Math.min(letzter ?? bisTag, bisTag);

  for (let tag = erster; tag <= letzter; tag++) {
    if (block.art === 'woechentlich' && wochentagVon(tag) !== Number(block.wochentag)) continue;
    liste.push({ tag, ...fenster });
  }
  return liste;
}

// Wirksamer Zeitraum eines Termins. Leere Felder werden durch den
// Vorlesungszeitraum aus den Einstellungen ersetzt.
// Ergebnis: { start, ende } als Tagnummern (oder null, falls unbekannt)
function zeitraumVon(termin) {
  const e = daten.einstellungen;
  return {
    start: datumZuTagNr(termin.start || e.semesterStart),
    ende: datumZuTagNr(termin.ende || e.semesterEnde),
  };
}

// Tagnummer des ersten Termins bei wöchentlichem/14-tägigem Rhythmus:
// der erste passende Wochentag ab Beginn – bei Startwoche 2 eine Woche später.
function ersterTerminTag(termin) {
  const { start } = zeitraumVon(termin);
  if (start === null) return null;
  const abstand = (Number(termin.wochentag) - wochentagVon(start) + 7) % 7;
  let erster = start + abstand;
  if (termin.rhythmus === 'zweiwoechentlich' && Number(termin.startwoche) === 2) erster += 7;
  return erster;
}

// Kurzer Name einer Lehrveranstaltung, z. B. "Übung" oder "Seminar „Teil 1“"
function veranstaltungName(veranstaltung) {
  return veranstaltung.typ + (veranstaltung.titel ? ' „' + veranstaltung.titel + '“' : '');
}

// Lesbare Beschreibung eines Termins (reiner Text, noch nicht escaped)
function beschreibeTermin(termin) {
  const zeit = termin.von + '–' + termin.bis;
  const teile = [];

  if (termin.rhythmus === 'block') {
    const sortiert = [...termin.daten].sort();
    const liste = sortiert.map((datum) => formatDatum(datum, { mitWochentag: true, mitJahr: false })).join(', ');
    teile.push('Block ' + zeit + (liste ? ': ' + liste : ' (noch keine Daten)'));
  } else {
    teile.push(WOCHENTAGE_KURZ[termin.wochentag - 1] + ' ' + zeit);
    if (termin.rhythmus === 'zweiwoechentlich') {
      const erster = ersterTerminTag(termin);
      teile.push('14-tägig' + (erster !== null ? ' ab ' + formatDatum(erster, { mitJahr: false }) : ''));
    } else {
      teile.push('wöchentlich');
    }
    if (termin.start || termin.ende) {
      const { start, ende } = zeitraumVon(termin);
      teile.push((start !== null ? formatDatum(start, { mitJahr: false }) : '…') + '–' +
        (ende !== null ? formatDatum(ende, { mitJahr: false }) : '…'));
    }
  }
  if (termin.raum) teile.push(termin.raum);
  return teile.join(' · ');
}

// Lesbare Beschreibung einer geblockten Zeit (reiner Text)
function beschreibeGeblockteZeit(block) {
  const teile = [];
  if (block.art === 'woechentlich') {
    teile.push('jeden ' + WOCHENTAGE[block.wochentag - 1]);
    if (block.datumVon || block.datumBis) {
      teile.push((block.datumVon ? 'ab ' + formatDatum(block.datumVon) : '') +
        (block.datumVon && block.datumBis ? ' ' : '') +
        (block.datumBis ? 'bis ' + formatDatum(block.datumBis) : ''));
    }
  } else {
    const bis = block.datumBis && block.datumBis !== block.datumVon ? '–' + formatDatum(block.datumBis) : '';
    teile.push(formatDatum(block.datumVon, { mitWochentag: !bis }) + bis);
  }
  if (block.ganztags) {
    teile.push('ganztägig');
  } else {
    teile.push(block.von + '–' + block.bis);
    const puffer = [];
    if (block.pufferVor > 0) puffer.push(block.pufferVor + ' min davor');
    if (block.pufferNach > 0) puffer.push(block.pufferNach + ' min danach');
    if (puffer.length) teile.push('Puffer ' + puffer.join(', '));
  }
  return teile.join(' · ');
}
