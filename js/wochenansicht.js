/* =====================================================================
   wochenansicht.js – zeichnet eine Variante als Wochenraster.

   Zwei Ansichten:
   - "Regelwoche": jeder wöchentliche bzw. 14-tägige Termin an seinem
     Wochentag (14-tägige schraffiert). Blocktermine stehen als Liste
     darunter.
   - eine konkrete Kalenderwoche: genau die Termine dieser Woche,
     inklusive Blöcken und vorlesungsfreien Tagen.
   Geblockte Zeiten erscheinen grau, ihr Puffer heller schraffiert.

   Eingabe ist immer eine Liste von "OptionInfos" (siehe varianten.js):
   { modul, veranstaltung, option, vorkommen[] }
   ===================================================================== */

'use strict';

const PIXEL_PRO_STUNDE = 46;

// Einträge für die Auswahlbox: Regelwoche + alle Wochen mit Terminen oder Prüfungen
function wochenAuswahl(optionInfos, module = []) {
  const eintraege = [['regel', 'Regelwoche']];
  const tage = optionInfos.flatMap((info) => info.vorkommen.map((v) => v.tag));
  for (const e of pruefungsplan(module).eintraege) tage.push(e.tag);
  if (tage.length === 0) return eintraege;
  const belegteWochen = new Set(tage.map(montagVon));
  const ersterMontag = montagVon(Math.min(...tage));
  const letzterMontag = montagVon(Math.max(...tage));
  for (let montag = ersterMontag; montag <= letzterMontag; montag += 7) {
    eintraege.push([String(montag),
      'KW ' + kalenderwoche(montag) + ' · ' + formatDatum(montag, { mitJahr: false }) + '–' +
      formatDatum(montag + 6, { mitJahr: false }) + (belegteWochen.has(montag) ? '' : ' (keine Termine)')]);
  }
  return eintraege;
}

// Hauptfunktion: liefert das HTML für Raster (+ Blockliste).
// module: die belegten Module – ihre Prüfungen erscheinen in der konkreten Woche.
// pixelProStunde: Höhe einer Stunde im Raster (kleiner z. B. für den Ausdruck)
function wochenansichtHtml(optionInfos, woche = 'regel', module = [], pixelProStunde = PIXEL_PRO_STUNDE) {
  return woche === 'regel'
    ? regelwocheHtml(optionInfos, pixelProStunde)
    : kalenderwocheHtml(optionInfos, Number(woche), module, pixelProStunde);
}

/* ---------- Regelwoche ---------- */

function regelwocheHtml(optionInfos, pixelProStunde) {
  const eintraege = [];
  const blocktermine = [];

  for (const info of optionInfos) {
    for (const termin of info.option.termine) {
      if (termin.rhythmus === 'block') {
        blocktermine.push({ info, termin });
        continue;
      }
      const hinweise = [];
      if (termin.rhythmus === 'zweiwoechentlich') {
        const erster = ersterTerminTag(termin);
        hinweise.push('14-tägig' + (erster !== null ? ' ab ' + formatDatum(erster, { mitJahr: false }) : ''));
      }
      if (termin.start) hinweise.push('ab ' + formatDatum(termin.start));
      if (termin.ende) hinweise.push('bis ' + formatDatum(termin.ende));
      eintraege.push(uniEintrag(info, termin, Number(termin.wochentag), {
        gestreift: termin.rhythmus === 'zweiwoechentlich',
        hinweis: hinweise.join(', '),
      }));
    }
  }

  // Wöchentliche geblockte Zeiten
  const geblockt = daten.geblockteZeiten
    .filter((block) => block.aktiv && block.art === 'woechentlich')
    .map((block) => ({ ...zeitfensterVonGeblockterZeit(block), wochentag: Number(block.wochentag) }))
    .filter((g) => g.block);

  const tage = sichtbareTage(eintraege);
  let html = rasterHtml(tage.map((wochentag) => ({ wochentag, titel: WOCHENTAGE_KURZ[wochentag - 1] })), eintraege, geblockt, [], pixelProStunde);

  if (blocktermine.length) {
    html += '<h4 class="unterueberschrift">Blocktermine</h4><ul class="blockliste">' +
      blocktermine.map(({ info, termin }) => `
        <li><span class="farbpunkt" style="background:${escapeHtml(info.modul.farbe)}"></span>
          <span><strong>${escapeHtml(info.modul.name)}</strong> – ${escapeHtml(veranstaltungName(info.veranstaltung))}:
          ${escapeHtml(beschreibeTermin(termin))}</span></li>`).join('') +
      '</ul>';
  }
  return html;
}

/* ---------- Konkrete Kalenderwoche ---------- */

function kalenderwocheHtml(optionInfos, montag, module, pixelProStunde) {
  const sonntag = montag + 6;
  const eintraege = [];
  for (const info of optionInfos) {
    for (const v of info.vorkommen) {
      if (v.tag < montag || v.tag > sonntag) continue;
      eintraege.push(uniEintrag(info, v.termin, wochentagVon(v.tag), {
        gestreift: false,
        hinweis: v.termin.rhythmus === 'block' ? 'Block' : '',
        start: v.start,
        ende: v.ende,
      }));
    }
  }

  const geblockt = [];
  for (const block of daten.geblockteZeiten) {
    if (!block.aktiv) continue;
    for (const v of vorkommenVonGeblockterZeit(block, montag, sonntag)) {
      geblockt.push({ ...v, wochentag: wochentagVon(v.tag) });
    }
  }

  // Vorlesungsfreie Tage dieser Woche mit Bezeichnung
  const freiNamen = {};
  for (const frei of daten.vorlesungsfrei) {
    const von = datumZuTagNr(frei.von);
    const bis = datumZuTagNr(frei.bis) ?? von;
    for (let tag = Math.max(von, montag); tag <= Math.min(bis, sonntag); tag++) freiNamen[wochentagVon(tag)] = frei.name;
  }

  // Prüfungen dieser Woche – sie liegen über allem anderen (Prüfung hat Vorrang)
  const pruefungen = pruefungsplan(module).eintraege
    .filter((e) => e.tag >= montag && e.tag <= sonntag)
    .map((e) => ({
      wochentag: wochentagVon(e.tag),
      start: e.start,
      ende: e.ende,
      ohneZeit: e.start === null || e.ende === null,
      farbe: e.modul.farbe,
      titel: '📝 ' + (e.pruefung.bezeichnung || 'Prüfung'),
      zeile2: e.modul.name,
      zeile3: (e.start !== null && e.ende !== null ? e.pruefung.von + '–' + e.pruefung.bis : 'ohne Uhrzeit') +
        (e.pruefung.raum ? ' · ' + e.pruefung.raum : '') + (e.pruefung.wiederholung ? ' · Wiederholung' : ''),
    }));

  const tage = sichtbareTage([...eintraege, ...pruefungen]).map((wochentag) => ({
    wochentag,
    titel: WOCHENTAGE_KURZ[wochentag - 1] + ' ' + formatDatum(montag + wochentag - 1, { mitJahr: false }),
    frei: freiNamen[wochentag] || '',
  }));
  return rasterHtml(tage, eintraege, geblockt, pruefungen, pixelProStunde);
}

// Antippen eines Termins zeigt alle Angaben (hilfreich auf dem Handy,
// wo die Kästchen schmal sind und es keinen Maus-Tooltip gibt)
aktionen['termin-info'] = (werte) => zeigeMeldung(werte.info);

/* ---------- Gemeinsame Bausteine ---------- */

// Ein farbiger Termin im Raster
function uniEintrag(info, termin, wochentag, { gestreift, hinweis, start, ende }) {
  return {
    wochentag,
    start: start ?? zeitZuMinuten(termin.von),
    ende: ende ?? zeitZuMinuten(termin.bis),
    farbe: info.modul.farbe,
    titel: info.modul.name,
    zeile2: veranstaltungName(info.veranstaltung) + (info.option.name ? ' · ' + info.option.name : ''),
    zeile3: termin.von + '–' + termin.bis + (termin.raum ? ' · ' + termin.raum : ''),
    hinweis,
    gestreift,
  };
}

// Montag bis Freitag immer, Samstag/Sonntag nur, wenn dort etwas liegt
function sichtbareTage(eintraege) {
  const tage = [1, 2, 3, 4, 5];
  if (eintraege.some((e) => e.wochentag === 6)) tage.push(6);
  if (eintraege.some((e) => e.wochentag === 7)) tage.push(7);
  return tage;
}

// Verteilt sich überlappende Einträge eines Tages auf Spalten nebeneinander
function verteileSpalten(eintraege) {
  eintraege.sort((a, b) => a.start - b.start || b.ende - a.ende);
  let gruppe = [];
  let gruppenEnde = -1;
  const gruppeAbschliessen = () => {
    const spalten = Math.max(...gruppe.map((e) => e.spalte)) + 1;
    gruppe.forEach((e) => { e.spalten = spalten; });
    gruppe = [];
  };
  for (const eintrag of eintraege) {
    if (gruppe.length && eintrag.start >= gruppenEnde) gruppeAbschliessen();
    const belegt = gruppe.filter((e) => e.ende > eintrag.start).map((e) => e.spalte);
    let spalte = 0;
    while (belegt.includes(spalte)) spalte++;
    eintrag.spalte = spalte;
    gruppe.push(eintrag);
    gruppenEnde = Math.max(gruppenEnde, eintrag.ende);
  }
  if (gruppe.length) gruppeAbschliessen();
}

// Baut das eigentliche Raster. tage = [{ wochentag, titel, frei }]
function rasterHtml(tage, eintraege, geblockt, pruefungen = [], pixelProStunde = PIXEL_PRO_STUNDE) {
  const mitZeit = pruefungen.filter((p) => !p.ohneZeit);
  // Sichtbarer Zeitbereich: mindestens 8–18 Uhr, sonst passend erweitert
  const zeiten = [...eintraege, ...mitZeit, ...geblockt.filter((g) => g.ende - g.start < MINUTEN_PRO_TAG)];
  const vonStunde = Math.min(8, ...zeiten.map((e) => Math.floor(e.start / 60)));
  const bisStunde = Math.max(18, ...zeiten.map((e) => Math.ceil(e.ende / 60)));
  const vonMinute = vonStunde * 60;
  const hoehe = (bisStunde - vonStunde) * pixelProStunde;
  const pixel = (minuten) => ((minuten - vonMinute) * pixelProStunde / 60).toFixed(1);
  const begrenze = (minuten) => Math.min(Math.max(minuten, vonMinute), bisStunde * 60);

  let html = `<div class="raster-scroll"><div class="raster" style="--tage:${tage.length};--stunde:${pixelProStunde}px">`;

  // Kopfzeile
  html += '<div class="raster-ecke"></div>';
  for (const tag of tage) {
    // Prüfungen ohne Uhrzeit (z. B. Abgabefristen) stehen im Tageskopf
    const ohneZeit = pruefungen.filter((p) => p.ohneZeit && p.wochentag === tag.wochentag);
    html += `<div class="raster-kopf${tag.frei ? ' frei' : ''}">${escapeHtml(tag.titel)}` +
      (tag.frei ? `<small>${escapeHtml(tag.frei)}</small>` : '') +
      ohneZeit.map((p) => `<small class="kopf-pruefung">${escapeHtml(p.titel + ' ' + p.zeile2)}</small>`).join('') + '</div>';
  }

  // Zeitachse
  html += `<div class="zeitachse" style="height:${hoehe}px">`;
  for (let stunde = vonStunde; stunde < bisStunde; stunde++) {
    html += `<span style="top:${pixel(stunde * 60)}px">${zweistellig(stunde)}:00</span>`;
  }
  html += '</div>';

  // Tagesspalten
  for (const tag of tage) {
    html += `<div class="tag-spalte${tag.frei ? ' frei' : ''}" style="height:${hoehe}px">`;
    // Stundenlinien als eigene Elemente (sehen auch im PDF sauber aus)
    for (let stunde = vonStunde + 1; stunde < bisStunde; stunde++) {
      html += `<div class="stundenlinie" style="top:${pixel(stunde * 60)}px"></div>`;
    }

    for (const g of geblockt.filter((g) => g.wochentag === tag.wochentag)) {
      const oben = pixel(begrenze(g.start));
      const hoeheBlock = pixel(begrenze(g.ende)) - oben;
      const kernOben = pixel(begrenze(g.kernStart)) - oben;
      const kernHoehe = pixel(begrenze(g.kernEnde)) - pixel(begrenze(g.kernStart));
      const titel = g.block.name + (g.block.ganztags ? ' (ganztägig)' : ' ' + g.block.von + '–' + g.block.bis);
      html += `<div class="geblockt" style="top:${oben}px;height:${hoeheBlock}px" title="${escapeHtml(titel)}">
          <div class="geblockt-kern" style="top:${kernOben}px;height:${kernHoehe}px"><span>${escapeHtml(g.block.name)}</span></div>
        </div>`;
    }

    const tagesEintraege = eintraege.filter((e) => e.wochentag === tag.wochentag);
    verteileSpalten(tagesEintraege);
    for (const e of tagesEintraege) {
      const breite = 100 / e.spalten;
      const titel = [e.titel, e.zeile2, e.zeile3, e.hinweis].filter(Boolean).join('\n');
      html += `<div class="termin-block${e.gestreift ? ' gestreift' : ''}" title="${escapeHtml(titel)}"
          data-aktion="termin-info" data-info="${escapeHtml(titel)}"
          style="top:${pixel(e.start)}px;height:${pixel(e.ende) - pixel(e.start)}px;left:${(e.spalte * breite).toFixed(2)}%;width:${breite.toFixed(2)}%;background-color:${escapeHtml(e.farbe)};color:${textfarbeFuer(e.farbe)}">
          <strong>${escapeHtml(e.titel)}</strong>
          <span>${escapeHtml(e.zeile2)}</span>
          <span>${escapeHtml(e.zeile3)}</span>
          ${e.hinweis ? `<em>${escapeHtml(e.hinweis)}</em>` : ''}
        </div>`;
    }

    // Prüfungen mit Uhrzeit: volle Breite, über Vorlesungen und geblockten Zeiten
    for (const p of mitZeit.filter((p) => p.wochentag === tag.wochentag)) {
      const titel = [p.titel, p.zeile2, p.zeile3].join('\n');
      html += `<div class="termin-block pruefung-block" title="${escapeHtml(titel)}"
          data-aktion="termin-info" data-info="${escapeHtml(titel)}"
          style="top:${pixel(p.start)}px;height:${pixel(p.ende) - pixel(p.start)}px;left:0;width:100%;--farbe:${escapeHtml(p.farbe)}">
          <strong>${escapeHtml(p.titel)}</strong>
          <span>${escapeHtml(p.zeile2)}</span>
          <span>${escapeHtml(p.zeile3)}</span>
        </div>`;
    }
    html += '</div>';
  }
  return html + '</div></div>';
}
