/* =====================================================================
   pruefungen.js – Prüfungstermine der Module: Überschneidungen und
   enge Abstände erkennen, Prüfungsplan einer Variante anzeigen.

   Regeln:
   - Eine Prüfung hat Vorrang vor allem anderen: Überschneidungen mit
     Vorlesungen, Arbeit oder anderen geblockten Zeiten spielen keine Rolle.
   - Überschneiden sich die Prüfungen zweier Module WIRKLICH (gleicher Tag,
     beide mit Uhrzeit, Zeiten überlappen), können die Module nicht
     zusammen belegt werden (siehe varianten.js).
   - Zwei Prüfungen am selben Tag oder an aufeinanderfolgenden Tagen
     ergeben nur einen Hinweis.
   - Wiederholungstermine werden angezeigt, aber nicht geprüft.
   ===================================================================== */

'use strict';

const PRUEFUNGSARTEN = ['Klausur', 'Mündliche Prüfung', 'Abgabe Hausarbeit', 'Präsentation', 'Referat', 'Projektbericht'];

// Tag und Uhrzeit einer Prüfung (start/ende = null bei "ohne Uhrzeit")
function pruefungZeit(pruefung) {
  return {
    tag: datumZuTagNr(pruefung.datum),
    start: zeitZuMinuten(pruefung.von),
    ende: zeitZuMinuten(pruefung.bis),
  };
}

// Lesbare Beschreibung, z. B. "Klausur · Mi 10.02.2027 · 10:00–12:00 · HS 1"
function beschreibePruefung(pruefung) {
  const teile = [pruefung.bezeichnung || 'Prüfung', formatDatum(pruefung.datum, { mitWochentag: true })];
  teile.push(pruefung.von && pruefung.bis ? pruefung.von + '–' + pruefung.bis : 'ohne Uhrzeit');
  if (pruefung.raum) teile.push(pruefung.raum);
  if (pruefung.wiederholung) teile.push('Wiederholungstermin');
  return teile.join(' · ');
}

// Überschneiden sich zwei Prüfungen wirklich?
function pruefungenUeberschneidenSich(a, b) {
  if (a.wiederholung || b.wiederholung) return false;
  const za = pruefungZeit(a);
  const zb = pruefungZeit(b);
  if (za.tag === null || za.tag !== zb.tag) return false;
  if ([za.start, za.ende, zb.start, zb.ende].includes(null)) return false; // ohne Uhrzeit → nur Hinweis
  return za.start < zb.ende && zb.start < za.ende;
}

// Erste echte Überschneidung zwischen den Prüfungen zweier Module: { a, b } oder null
function pruefungsKollision(modulA, modulB) {
  for (const a of modulA.pruefungen || []) {
    for (const b of modulB.pruefungen || []) {
      if (pruefungenUeberschneidenSich(a, b)) return { a, b };
    }
  }
  return null;
}

// Kurzer Text zu einer Überschneidung, z. B. "Mi 10.02.2027 (Klausur 10:00–12:00 / Präsentation 11:00–13:00)"
function beschreibeKollision(kollision) {
  return formatDatum(kollision.a.datum, { mitWochentag: true }) + ' (' +
    (kollision.a.bezeichnung || 'Prüfung') + ' ' + kollision.a.von + '–' + kollision.a.bis + ' / ' +
    (kollision.b.bezeichnung || 'Prüfung') + ' ' + kollision.b.von + '–' + kollision.b.bis + ')';
}

// Prüfungsplan für eine Liste von Modulen:
// { eintraege: [{ modul, pruefung, tag, start, ende }] nach Datum sortiert,
//   hinweise: [{ art: 'kollision' | 'gleicherTag' | 'folgetag', text }] }
function pruefungsplan(module) {
  const eintraege = [];
  for (const modul of module) {
    for (const pruefung of modul.pruefungen || []) {
      const zeit = pruefungZeit(pruefung);
      if (zeit.tag !== null) eintraege.push({ modul, pruefung, ...zeit });
    }
  }
  eintraege.sort((a, b) => a.tag - b.tag || (a.start ?? -1) - (b.start ?? -1));

  const hinweise = [];
  const name = (e) => e.modul.name + ' (' + (e.pruefung.bezeichnung || 'Prüfung') + ')';
  const pruefbar = eintraege.filter((e) => !e.pruefung.wiederholung);
  for (let i = 0; i < pruefbar.length; i++) {
    for (let j = i + 1; j < pruefbar.length; j++) {
      const a = pruefbar[i];
      const b = pruefbar[j];
      if (a.modul === b.modul) continue;
      if (a.tag === b.tag) {
        const kollision = pruefungenUeberschneidenSich(a.pruefung, b.pruefung);
        hinweise.push({
          art: kollision ? 'kollision' : 'gleicherTag',
          text: (kollision ? 'Überschneidung: ' : 'Zwei Prüfungen am selben Tag: ') + name(a) + ' und ' + name(b) +
            ' am ' + formatDatum(a.tag, { mitWochentag: true }) + '.',
        });
      } else if (b.tag - a.tag === 1) {
        hinweise.push({
          art: 'folgetag',
          text: 'Prüfungen an zwei Tagen hintereinander: ' + name(a) + ' am ' + formatDatum(a.tag, { mitWochentag: true, mitJahr: false }) +
            ' und ' + name(b) + ' am ' + formatDatum(b.tag, { mitWochentag: true, mitJahr: false }),
        });
      }
    }
  }
  return { eintraege, hinweise };
}

// HTML: Hinweise und Liste aller Prüfungen der Module (nach Datum)
function pruefungsplanHtml(module) {
  const { eintraege, hinweise } = pruefungsplan(module);
  if (eintraege.length === 0) {
    return '<p class="klein gedimmt">Für die Module dieser Variante sind noch keine Prüfungstermine eingetragen ' +
      '(im Tab „Module“ bei einem Modul „+ Prüfung“).</p>';
  }
  let html = '';
  if (hinweise.length) {
    html += '<div class="hinweis klein"><ul>' + hinweise.map((h) =>
      `<li>${h.art === 'kollision' ? '⚠ ' : ''}${escapeHtml(h.text)}</li>`).join('') + '</ul></div>';
  }
  html += '<ul class="pruefungsliste">' + eintraege.map((e) => `
    <li class="${e.pruefung.wiederholung ? 'gedimmt' : ''}">
      <span class="farbpunkt" style="background:${escapeHtml(e.modul.farbe)}"></span>
      <span class="pruefung-datum">${escapeHtml(formatDatum(e.tag, { mitWochentag: true }))}<br>
        <small>${e.pruefung.von && e.pruefung.bis ? escapeHtml(e.pruefung.von + '–' + e.pruefung.bis) : 'ohne Uhrzeit'}</small></span>
      <span><strong>${escapeHtml(e.modul.name)}</strong> – ${escapeHtml(e.pruefung.bezeichnung || 'Prüfung')}` +
        `${e.pruefung.raum ? ' · ' + escapeHtml(e.pruefung.raum) : ''}${e.pruefung.wiederholung ? ' · Wiederholungstermin' : ''}</span>
    </li>`).join('') + '</ul>';
  return html;
}
