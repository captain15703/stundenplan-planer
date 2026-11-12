/* =====================================================================
   ui-studienverlauf.js – Tab "Studium": Fortschritt je Modulbereich,
   Module nach Semester, Notenschnitt sowie Bereiche und Studienziel
   bearbeiten. Rechenlogik in studienverlauf.js.
   ===================================================================== */

'use strict';

function zeigeStudienverlauf() {
  const bereich = $('#tab-studium');
  const verlauf = daten.studienverlauf;
  const a = werteStudienverlaufAus(verlauf);

  let html = `
    <div class="bereich-kopf">
      <div>
        <h2>Studienverlauf</h2>
        <p class="untertitel">Alle Semester im Überblick: Welche Module wann, wie viele ECTS je Bereich, Notenschnitt.</p>
      </div>
      <button class="knopf primaer" data-aktion="vmodul-neu" data-semester="1">+ Modul</button>
    </div>`;

  if (verlauf.bereiche.length === 0 && verlauf.module.length === 0) {
    html += `
      <div class="leer-zustand">
        <p>Lege zuerst die Modulbereiche deiner Prüfungsordnung mit ihrer ECTS-Spanne an (z. B. „Bereich A: 18–30 ECTS“,
          „Masterarbeit: 30 ECTS“), dann die Module mit Semester und Status.</p>
        <p><button class="knopf" data-aktion="bereich-neu">+ Bereich</button>
          <button class="knopf" data-aktion="vmodul-neu" data-semester="1">+ Modul</button></p>
        <p class="hilfe">Module aus dem Semester-Planer kannst du im Tab <a href="#varianten">Varianten</a> mit
          „🎓 In Studienverlauf“ übernehmen.</p>
      </div>`;
    html += verlaufEinstellungenHtml(verlauf);
    bereich.innerHTML = html;
    return;
  }

  // Gesamtfortschritt und Schnitt
  const g = a.gesamt;
  html += `
    <section class="karte">
      <div class="kennzahlen verlauf-kennzahlen">
        <div class="kachel ${g.bestanden >= g.soll && g.soll ? 'gut' : ''}"><span class="wert">${formatZahl(g.bestanden)} / ${formatZahl(g.soll)}</span><span class="name">ECTS bestanden</span></div>
        <div class="kachel"><span class="wert">${formatZahl(g.belegt)}</span><span class="name">ECTS belegt (laufend)</span></div>
        <div class="kachel"><span class="wert">${formatZahl(g.geplant)}</span><span class="name">ECTS geplant</span></div>
        <div class="kachel ${g.angerechnet < g.soll ? 'warnung' : ''}"><span class="wert">${formatZahl(Math.max(0, g.soll - g.angerechnet))}</span>
          <span class="name">ECTS noch ohne Planung${g.ueberzaehlig ? ` (${formatZahl(g.ueberzaehlig)} über Bereichs-Maximum zählen nicht)` : ''}</span></div>
        <div class="kachel"><span class="wert">${a.schnitt ? formatZahl(a.schnitt.abgeschnitten) : '–'}</span>
          <span class="name">Notenschnitt${a.schnitt ? ` (genau ${formatZahl(a.schnitt.genau, 2)}, aus ${formatZahl(a.schnitt.ects)} ECTS)` : ''}</span></div>
      </div>
      ${fortschrittHtml({ ...g, min: g.soll, max: g.soll })}
      <p class="hilfe">Schnitt: nach ECTS gewichtet, nur bestandene Module mit Note, nach der ersten Nachkommastelle
        abgeschnitten (nicht gerundet). Prüfe in deiner Prüfungsordnung, ob das bei dir genauso gilt.</p>
      ${a.hinweise.length ? `<div class="hinweis klein"><ul>${a.hinweise.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>` : ''}
    </section>`;

  // Bereiche
  if (a.bereiche.length) {
    html += `
      <section class="karte">
        <h3>Bereiche</h3>
        <ul class="bereich-liste">${a.bereiche.map((b) => `
          <li>
            <div class="bereich-zeile">
              <span><strong>${escapeHtml(b.bereich.name)}</strong>
                ${b.bereich.id ? `<span class="gedimmt klein"> · ${escapeHtml(spanneText(b.bereich))}</span>` : ''}</span>
              <span class="klein ${b.zustand === 'ok' ? 'gedimmt' : 'bereich-' + b.zustand}">${formatZahl(b.summe)} ECTS geplant · ${formatZahl(b.bestanden)} bestanden${
                b.bereich.id ? (b.zustand === 'zuwenig' ? ' · Minimum fehlt' : b.zustand === 'zuviel' ? ' · über Maximum' : ' · ✓ in der Spanne') : ''}</span>
            </div>
            ${fortschrittHtml(b)}
          </li>`).join('')}
        </ul>
        ${legendeHtml()}
      </section>`;
  }

  // Semester
  const spalte = (titel, module, semesterNr, extra = '') => `
    <section class="karte semester-karte">
      <div class="karte-kopf">
        <h3 class="karte-titel">${titel}</h3>
        <span class="gedimmt klein">${formatZahl(module.reduce((s, m) => s + m.ects, 0))} ECTS</span>
      </div>
      ${extra}
      ${module.length ? `<ul class="verlauf-module">${module.map(verlaufModulHtml).join('')}</ul>` : '<p class="gedimmt klein">Noch keine Module.</p>'}
      <button class="knopf klein" data-aktion="vmodul-neu" data-semester="${semesterNr}">+ Modul</button>
    </section>`;
  html += '<div class="semester-raster">' +
    a.semester.map((s) => spalte(`${s.nr}. Semester`, s.module, s.nr, s.ueberRegel ? '<p class="klein gedimmt">über der Regelstudienzeit</p>' : '')).join('') +
    (a.offen.length ? spalte('Noch ohne Semester', a.offen, 0) : '') +
    '</div>';

  html += verlaufEinstellungenHtml(verlauf);
  bereich.innerHTML = html;
}

// Gestapelter Balken: bestanden | belegt | geplant. Der hellere Bereich
// dahinter zeigt die erlaubte Spanne (Minimum bis Maximum).
function fortschrittHtml(werte) {
  const obergrenze = werte.max === null || werte.max === undefined ? werte.min : werte.max;
  const basis = Math.max(obergrenze || 0, werte.summe, 1);
  const anteil = (wert) => (wert / basis * 100).toFixed(2) + '%';
  const spanne = werte.max !== null && werte.max !== undefined && werte.max > werte.min
    ? `<span class="spanne" style="left:${anteil(werte.min)};width:${anteil(werte.max - werte.min)}" title="erlaubte Spanne"></span>` : '';
  const ziel = werte.max === null || werte.max === undefined ? `ab ${formatZahl(werte.min)}` : werte.min === werte.max ? formatZahl(werte.min) : `${formatZahl(werte.min)} bis ${formatZahl(werte.max)}`;
  return `
    <div class="fortschritt" role="img" aria-label="${formatZahl(werte.bestanden)} bestanden, ${formatZahl(werte.belegt)} belegt, ${formatZahl(werte.geplant)} geplant, Ziel ${ziel} ECTS">
      ${spanne}
      <span class="teil bestanden" style="width:${anteil(werte.bestanden)}"></span>
      <span class="teil belegt" style="width:${anteil(werte.belegt)}"></span>
      <span class="teil geplant" style="width:${anteil(werte.geplant)}"></span>
      ${werte.min ? `<span class="soll-marke" style="left:${anteil(werte.min)}" title="Minimum"></span>` : ''}
      ${spanne ? `<span class="soll-marke" style="left:${anteil(werte.max)}" title="Maximum"></span>` : ''}
    </div>`;
}

function legendeHtml() {
  return `<p class="legende klein gedimmt">
    <span><span class="punkt bestanden"></span>bestanden</span>
    <span><span class="punkt belegt"></span>belegt</span>
    <span><span class="punkt geplant"></span>geplant</span>
    <span><span class="punkt spanne"></span>erlaubte Spanne (Striche: Min / Max)</span></p>`;
}

function verlaufModulHtml(modul) {
  const bereich = daten.studienverlauf.bereiche.find((b) => b.id === modul.bereichId);
  const note = leseNote(modul.note);
  return `
    <li class="verlauf-modul status-${modul.status}">
      <button class="verlauf-modul-knopf" data-aktion="vmodul-bearbeiten" data-id="${modul.id}">
        <span class="verlauf-modul-name">${escapeHtml(modul.name)}</span>
        <span class="klein gedimmt">${formatZahl(modul.ects)} ECTS${bereich ? ' · ' + escapeHtml(bereich.name) : ''}</span>
        <span class="abzeichen status">${VERLAUF_STATUS[modul.status]}${note !== null && modul.status === 'bestanden' ? ' · ' + formatZahl(note) : ''}</span>
      </button>
    </li>`;
}

function verlaufEinstellungenHtml(verlauf) {
  const bereiche = verlauf.bereiche.length
    ? '<ul class="einfache-liste">' + verlauf.bereiche.map((b) => `
        <li>
          <span><strong>${escapeHtml(b.name)}</strong> · ${escapeHtml(spanneText(b))}</span>
          <span class="zeile-aktionen">
            <button class="knopf-text" data-aktion="bereich-bearbeiten" data-id="${b.id}">Bearbeiten</button>
            <button class="knopf-text gefahr" data-aktion="bereich-loeschen" data-id="${b.id}">Löschen</button>
          </span>
        </li>`).join('') + '</ul>'
    : '<p class="gedimmt">Noch keine Bereiche.</p>';
  return `
    <details class="karte verlauf-einstellungen"${verlauf.bereiche.length ? '' : ' open'}>
      <summary>Studienziel und Bereiche</summary>
      <div class="feldreihe">
        <label class="feld schmal">ECTS gesamt
          <input type="number" min="0" step="1" inputmode="numeric" data-aktion="verlauf-zahl" data-feld="gesamtEcts" value="${escapeHtml(verlauf.gesamtEcts)}">
        </label>
        <label class="feld schmal">Semester (Regelstudienzeit)
          <input type="number" min="1" max="12" step="1" inputmode="numeric" data-aktion="verlauf-zahl" data-feld="semesterAnzahl" value="${escapeHtml(verlauf.semesterAnzahl)}">
        </label>
      </div>
      <div class="karte-kopf abstand-oben">
        <h4 class="karte-titel">Modulbereiche</h4>
        <button class="knopf klein" data-aktion="bereich-neu">+ Bereich</button>
      </div>
      <p class="hilfe">Die Bereiche und ihre ECTS-Spannen stehen in deiner Prüfungsordnung bzw. im Modulhandbuch.
        Was in einem Bereich über das Maximum hinausgeht, wird nicht aufs Studienziel angerechnet.</p>
      ${bereiche}
    </details>`;
}

/* ---------- Aktionen: Studienziel und Bereiche ---------- */

aktionen['verlauf-zahl'] = (werte, element) => {
  daten.studienverlauf[werte.feld] = leseZahl(element.value, 0);
  daten.studienverlauf = normalisiereStudienverlauf(daten.studienverlauf);
  datenGeaendert();
};

aktionen['bereich-neu'] = () => oeffneBereichDialog(null);
aktionen['bereich-bearbeiten'] = (werte) => oeffneBereichDialog(werte.id);

aktionen['bereich-loeschen'] = (werte) => {
  const verlauf = daten.studienverlauf;
  const b = verlauf.bereiche.find((x) => x.id === werte.id);
  const betroffen = verlauf.module.filter((m) => m.bereichId === b.id).length;
  if (!confirm(`Bereich „${b.name}“ löschen?` + (betroffen ? `\n\n${betroffen} Module verlieren dadurch ihre Zuordnung (sie bleiben erhalten).` : ''))) return;
  verlauf.bereiche = verlauf.bereiche.filter((x) => x.id !== b.id);
  verlauf.module.forEach((m) => { if (m.bereichId === b.id) m.bereichId = ''; });
  datenGeaendert();
};

function oeffneBereichDialog(id) {
  const verlauf = daten.studienverlauf;
  const vorhanden = id ? verlauf.bereiche.find((b) => b.id === id) : null;
  const b = vorhanden || neuerBereich();
  zeigeDialog({
    titel: vorhanden ? 'Bereich bearbeiten' : 'Neuer Bereich',
    inhalt: `
      <label class="feld">Name *
        <input name="name" value="${escapeHtml(b.name)}" placeholder="z. B. Wahlpflichtbereich">
      </label>
      <div class="feldreihe">
        <label class="feld schmal">mindestens (ECTS)
          <input name="minEcts" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(b.minEcts)}">
        </label>
        <label class="feld schmal">höchstens (ECTS)
          <input name="maxEcts" type="number" min="0" step="1" inputmode="numeric" value="${b.maxEcts === null ? '' : escapeHtml(b.maxEcts)}" placeholder="ohne Grenze">
        </label>
      </div>
      <p class="hilfe">Fester Wert (z. B. Masterarbeit): beide Felder gleich. Keine Obergrenze: „höchstens“ leer lassen.</p>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const fehler = [];
      const min = leseZahl(w.minEcts, -1);
      const max = w.maxEcts.trim() === '' ? null : leseZahl(w.maxEcts, -1);
      if (!w.name.trim()) fehler.push('Bitte einen Namen eingeben.');
      if (min < 0) fehler.push('„mindestens“ muss eine Zahl ab 0 sein.');
      if (max !== null && max < 0) fehler.push('„höchstens“ muss eine Zahl ab 0 sein oder leer bleiben.');
      else if (max !== null && max < min) fehler.push('„höchstens“ darf nicht kleiner als „mindestens“ sein.');
      if (fehler.length) return fehler;
      Object.assign(b, { name: w.name.trim(), minEcts: min, maxEcts: max });
      if (!vorhanden) verlauf.bereiche.push(b);
      datenGeaendert();
      return [];
    },
  });
}

/* ---------- Aktionen: Module ---------- */

aktionen['vmodul-neu'] = (werte) => oeffneVerlaufsmodulDialog(null, Number(werte.semester) || 0);
aktionen['vmodul-bearbeiten'] = (werte) => oeffneVerlaufsmodulDialog(werte.id);

function semesterOptionen(verlauf, aktuell) {
  const anzahl = Math.max(verlauf.semesterAnzahl + 2, aktuell);
  return [[0, 'noch offen'], ...Array.from({ length: anzahl }, (_, i) => [i + 1, `${i + 1}. Semester`])];
}

function bereichOptionen(verlauf) {
  return [['', '– kein Bereich –'], ...verlauf.bereiche.map((b) => [b.id, b.name])];
}

function oeffneVerlaufsmodulDialog(id, semester = 1) {
  const verlauf = daten.studienverlauf;
  const vorhanden = id ? verlauf.module.find((m) => m.id === id) : null;
  const m = vorhanden || { ...neuesVerlaufsmodul(), semester };

  const dialog = zeigeDialog({
    titel: vorhanden ? 'Modul bearbeiten' : 'Modul zum Studienverlauf hinzufügen',
    inhalt: `
      <label class="feld">Name *
        <input name="name" value="${escapeHtml(m.name)}">
      </label>
      <div class="feldreihe">
        <label class="feld">Modulnummer
          <input name="nummer" value="${escapeHtml(m.nummer)}">
        </label>
        <label class="feld schmal">ECTS
          <input name="ects" type="number" min="0" step="0.5" inputmode="decimal" value="${escapeHtml(m.ects)}">
        </label>
      </div>
      <div class="feldreihe">
        <label class="feld">Bereich
          <select name="bereichId">${optionenHtml(bereichOptionen(verlauf), m.bereichId)}</select>
        </label>
        <label class="feld">Semester
          <select name="semester">${optionenHtml(semesterOptionen(verlauf, m.semester), m.semester)}</select>
        </label>
      </div>
      <div class="feldreihe">
        <label class="feld">Status
          <select name="status">${optionenHtml(Object.entries(VERLAUF_STATUS), m.status)}</select>
        </label>
        <label class="feld schmal" data-zeige-bei="bestanden">Note
          <input name="note" inputmode="decimal" value="${escapeHtml(m.note)}" placeholder="z. B. 1,7">
        </label>
      </div>
      <p class="hilfe" data-zeige-bei="bestanden">Ohne Note (z. B. „bestanden/nicht bestanden“) zählt das Modul nur bei den ECTS.</p>
      ${vorhanden ? '<button type="button" class="knopf klein gefahr" data-aktion="vmodul-loeschen" data-id="' + m.id + '">Modul löschen</button>' : ''}`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const fehler = [];
      if (!w.name.trim()) fehler.push('Bitte einen Namen eingeben.');
      if (leseZahl(w.ects, -1) < 0) fehler.push('ECTS müssen eine Zahl ab 0 sein.');
      if (w.status === 'bestanden' && w.note.trim() && leseNote(w.note) === null) fehler.push('Die Note muss zwischen 1,0 und 5,0 liegen.');
      if (fehler.length) return fehler;
      Object.assign(m, {
        name: w.name.trim(),
        nummer: w.nummer.trim(),
        ects: leseZahl(w.ects, 0),
        bereichId: w.bereichId,
        semester: Number(w.semester),
        status: w.status,
        note: w.status === 'bestanden' ? w.note.trim() : '',
      });
      if (!vorhanden) verlauf.module.push(m);
      datenGeaendert();
      return [];
    },
  });
  const aktualisiere = () => {
    const bestanden = formularWerte($('form', dialog)).status === 'bestanden';
    $$('[data-zeige-bei="bestanden"]', dialog).forEach((el) => { el.hidden = !bestanden; });
  };
  $('form', dialog).addEventListener('change', aktualisiere);
  aktualisiere();
}

aktionen['vmodul-loeschen'] = (werte) => {
  const verlauf = daten.studienverlauf;
  const m = verlauf.module.find((x) => x.id === werte.id);
  if (!confirm(`„${m.name}“ aus dem Studienverlauf löschen?`)) return;
  verlauf.module = verlauf.module.filter((x) => x.id !== m.id);
  $('#dialog').close();
  datenGeaendert();
};

/* ---------- Übernahme aus dem Semester-Planer ---------- */

aktionen['variante-studienverlauf'] = () => {
  const variante = aktuelleVariante();
  oeffneUebernahmeDialog(variante.module);
};

function oeffneUebernahmeDialog(module) {
  const verlauf = daten.studienverlauf;
  const schonDa = (modul) => verlauf.module.some((m) => m.name.trim().toLowerCase() === modul.name.trim().toLowerCase());
  const zeilen = module.map((modul) => `
    <tr>
      <td>${escapeHtml(modul.name)}<br><span class="klein gedimmt">${formatZahl(modul.ects)} ECTS${schonDa(modul) ? ' · schon im Studienverlauf, wird übersprungen' : ''}</span></td>
      <td>${verlauf.bereiche.length && !schonDa(modul)
        ? `<select name="bereich-${escapeHtml(modul.id)}" aria-label="Bereich für ${escapeHtml(modul.name)}">${optionenHtml(bereichOptionen(verlauf), '')}</select>`
        : ''}</td>
    </tr>`).join('');
  zeigeDialog({
    titel: 'In den Studienverlauf übernehmen',
    speichernText: 'Übernehmen',
    breit: true,
    inhalt: `
      <label class="feld schmal">In welches Semester?
        <select name="semester">${optionenHtml(semesterOptionen(verlauf, 1).slice(1), 1)}</select>
      </label>
      <div class="tabelle-scroll"><table class="uebernahme-tabelle"><tbody>${zeilen}</tbody></table></div>
      <p class="hilfe">Die Module werden mit Status „belegt“ eingetragen.${verlauf.bereiche.length ? '' : ' Bereiche kannst du im Tab „Studium“ anlegen und später zuordnen.'}</p>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const zuordnung = {};
      for (const modul of module) zuordnung[modul.id] = w['bereich-' + modul.id] || '';
      const ergebnis = uebernimmInStudienverlauf(module, Number(w.semester), zuordnung);
      datenGeaendert(false);
      zeigeMeldung([
        ergebnis.neu.length + ' ' + (ergebnis.neu.length === 1 ? 'Modul' : 'Module') + ' ins ' + w.semester + '. Semester übernommen',
        ergebnis.uebersprungen.length ? 'übersprungen (schon vorhanden): ' + ergebnis.uebersprungen.join(', ') : '',
      ].filter(Boolean).join('\n'));
      return [];
    },
  });
}
