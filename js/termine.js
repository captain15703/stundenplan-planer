/* =====================================================================
   termine.js – alles rund um einzelne Termine:
   wirksamer Zeitraum, erster Termin bei 14-tägigem Rhythmus und
   lesbare Beschreibungen ("Mo 10:00–12:00 · wöchentlich · R 1.23").
   ===================================================================== */

'use strict';

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
