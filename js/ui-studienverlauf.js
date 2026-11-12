/* =====================================================================
   ui-studienverlauf.js – Tab "Studium": Fortschritt je Modulbereich,
   Module nach Semester, Notenschnitt, Modulkatalog (aus dem eingelesenen
   Modulhandbuch) sowie Bereiche und Studienziel bearbeiten.
   Rechenlogik in studienverlauf.js, PDF-Auswertung in modulhandbuch.js.
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
      <div class="knopf-reihe">
        <button class="knopf" data-aktion="mhb-einlesen">📄 Modulhandbuch einlesen</button>
        <button class="knopf primaer" data-aktion="vmodul-neu" data-semester="1">+ Modul</button>
      </div>
    </div>`;

  if (verlauf.bereiche.length === 0 && verlauf.module.length === 0) {
    html += `
      <div class="leer-zustand">
        <p><strong>Am schnellsten:</strong> Lies das Modulhandbuch (PDF) ein – dann sind alle Modulgruppen mit ihrer
          ECTS-Spanne angelegt und alle Module stehen im Katalog zur Auswahl.</p>
        <p><button class="knopf primaer" data-aktion="mhb-einlesen">📄 Modulhandbuch einlesen</button></p>
        <p>Oder lege die Bereiche selbst an (z. B. „Bereich A: 18–30 ECTS“, „Masterarbeit: 30 ECTS“) und dann die Module.</p>
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
    a.semester.map((s) => spalte(`${s.nr}. Semester <span class="semester-typ">${semesterInfo(s.nr, verlauf.studienbeginn).text}</span>`,
      s.module, s.nr, s.ueberRegel ? '<p class="klein gedimmt">über der Regelstudienzeit</p>' : '')).join('') +
    (a.offen.length ? spalte('Noch ohne Semester', a.offen, 0) : '') +
    '</div>';

  if (verlauf.katalog) html += katalogHtml(verlauf);
  html += verlaufEinstellungenHtml(verlauf);
  bereich.innerHTML = html;
  if (verlauf.katalog) zeichneKatalogListe();
}

// "A1" statt "A1 Fachstudium Wirtschaftinformatik", wo es eng ist
function bereichKurzname(bereich) {
  return bereich.kuerzel && /^[A-Z]\d+$/.test(bereich.kuerzel) ? bereich.kuerzel : bereich.name;
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
  const verlauf = daten.studienverlauf;
  const bereich = verlauf.bereiche.find((b) => b.id === modul.bereichId);
  const note = leseNote(modul.note);
  const eintrag = katalogModul(verlauf, modul.nummer);
  let turnus = '';
  if (eintrag) {
    const angebot = turnusAngebot(eintrag.turnus);
    const passt = angebot.ws === angebot.ss || modul.semester === 0 || modul.status === 'bestanden' ||
      angebot[semesterInfo(modul.semester, verlauf.studienbeginn).typ.toLowerCase()];
    turnus = passt ? ' · ' + escapeHtml(eintrag.turnus) : ` · <span class="turnus-warnung" title="Wird in diesem Semester nicht angeboten">⚠ ${escapeHtml(eintrag.turnus)}</span>`;
  }
  return `
    <li class="verlauf-modul status-${modul.status}">
      <button class="verlauf-modul-knopf" data-aktion="vmodul-bearbeiten" data-id="${modul.id}">
        <span class="verlauf-modul-name">${escapeHtml(modul.name)}</span>
        <span class="klein gedimmt">${formatZahl(modul.ects)} ECTS${bereich ? ' · ' + escapeHtml(bereichKurzname(bereich)) : ''}${turnus}</span>
        <span class="abzeichen status">${VERLAUF_STATUS[modul.status]}${note !== null && modul.status === 'bestanden' ? ' · ' + formatZahl(note) : ''}</span>
      </button>
    </li>`;
}

function verlaufEinstellungenHtml(verlauf) {
  const bereiche = verlauf.bereiche.length
    ? '<ul class="einfache-liste">' + verlauf.bereiche.map((b) => `
        <li>
          <span><strong>${escapeHtml(b.name)}</strong> · ${escapeHtml(spanneText(b))}${
            verlauf.katalog ? ` · <span class="gedimmt">${verlauf.katalog.module.filter((m) => m.bereichIds.includes(b.id)).length} Module im Katalog</span>` : ''}</span>
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
        <label class="feld schmal">Studienbeginn
          <select data-aktion="verlauf-beginn" data-feld="typ">${optionenHtml([['WS', 'Wintersemester'], ['SS', 'Sommersemester']], verlauf.studienbeginn.typ)}</select>
        </label>
        <label class="feld schmal">Jahr
          <input type="number" min="2000" max="2100" step="1" inputmode="numeric" data-aktion="verlauf-beginn" data-feld="jahr" value="${escapeHtml(verlauf.studienbeginn.jahr)}">
        </label>
      </div>
      <p class="hilfe">Der Studienbeginn bestimmt, ob ein Semester ein WS oder SS ist – damit prüft die App den Turnus der Module.</p>
      ${verlauf.katalog ? `
        <div class="karte-kopf abstand-oben">
          <h4 class="karte-titel">Modulkatalog</h4>
          <span class="knopf-reihe">
            <button class="knopf klein" data-aktion="mhb-einlesen">Neu einlesen</button>
            <button class="knopf klein gefahr" data-aktion="katalog-entfernen">Entfernen</button>
          </span>
        </div>
        <p class="hilfe">${escapeHtml(verlauf.katalog.quelle)}${verlauf.katalog.stand ? ', Stand ' + escapeHtml(verlauf.katalog.stand) : ''} ·
          ${verlauf.katalog.module.length} Module · eingelesen am ${escapeHtml(formatZeitpunkt(verlauf.katalog.importiertAm))}.
          Beim neuen Einlesen bleiben deine eingeplanten Module erhalten.</p>` : ''}
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

aktionen['verlauf-beginn'] = (werte, element) => {
  const beginn = daten.studienverlauf.studienbeginn;
  if (werte.feld === 'typ') beginn.typ = element.value === 'SS' ? 'SS' : 'WS';
  else beginn.jahr = Math.round(leseZahl(element.value, beginn.jahr));
  datenGeaendert();
};

/* ---------- Modulkatalog ----------
   Die Liste wird bei jeder Eingabe ins Suchfeld neu gezeichnet – nur die
   Liste, damit das Suchfeld den Fokus behält.
   ------------------------------------------------------------------ */

const katalogFilter = { suche: '', bereichId: '', angebot: '', nurOffen: false };

function katalogHtml(verlauf) {
  const bereiche = verlauf.bereiche.filter((b) => verlauf.katalog.module.some((m) => m.bereichIds.includes(b.id)));
  if (katalogFilter.bereichId && !bereiche.some((b) => b.id === katalogFilter.bereichId)) katalogFilter.bereichId = '';
  return `
    <section class="karte katalog">
      <div class="karte-kopf">
        <h3 class="karte-titel">Modulkatalog</h3>
        <span class="gedimmt klein">${escapeHtml(verlauf.katalog.quelle)}${verlauf.katalog.stand ? ' · Stand ' + escapeHtml(verlauf.katalog.stand) : ''}</span>
      </div>
      <div class="katalog-filter">
        <label class="feld katalog-suche">Suche
          <input type="search" data-eingabe="katalog-suche" value="${escapeHtml(katalogFilter.suche)}" placeholder="Name, Kürzel, Fach, Dozent …">
        </label>
        <label class="feld">Bereich
          <select data-aktion="katalog-filter" data-feld="bereichId">${optionenHtml([['', 'alle Bereiche'], ...bereiche.map((b) => [b.id, b.name])], katalogFilter.bereichId)}</select>
        </label>
        <label class="feld schmal">Angebot
          <select data-aktion="katalog-filter" data-feld="angebot">${optionenHtml([['', 'WS und SS'], ['ws', 'im WS'], ['ss', 'im SS']], katalogFilter.angebot)}</select>
        </label>
        <label class="auswahl"><input type="checkbox" data-aktion="katalog-filter" data-feld="nurOffen"${katalogFilter.nurOffen ? ' checked' : ''}> nur noch nicht eingeplante</label>
      </div>
      <p class="gedimmt klein" id="katalog-anzahl"></p>
      <ul class="katalog-liste" id="katalog-liste"></ul>
    </section>`;
}

function gefilterteKatalogModule() {
  const verlauf = daten.studienverlauf;
  const woerter = katalogFilter.suche.toLowerCase().split(/\s+/).filter(Boolean);
  return verlauf.katalog.module.filter((m) => {
    if (katalogFilter.bereichId && !m.bereichIds.includes(katalogFilter.bereichId)) return false;
    if (katalogFilter.angebot) {
      const angebot = turnusAngebot(m.turnus);
      // Unklarer Turnus ("alle 4 Semester") bleibt sichtbar
      if ((angebot.ws || angebot.ss) && !angebot[katalogFilter.angebot]) return false;
    }
    if (katalogFilter.nurOffen && verlauf.module.some((v) => v.nummer === m.kuerzel)) return false;
    const text = [m.kuerzel, m.name, m.fach, m.verantwortlich, m.pruefung, m.sprache].join(' ').toLowerCase();
    return woerter.every((w) => text.includes(w));
  });
}

function zeichneKatalogListe() {
  const liste = $('#katalog-liste');
  if (!liste) return;
  const verlauf = daten.studienverlauf;
  const module = gefilterteKatalogModule();
  $('#katalog-anzahl').textContent = `${module.length} von ${verlauf.katalog.module.length} Modulen`;
  liste.innerHTML = module.length ? module.map((m) => {
    const geplant = verlauf.module.find((v) => v.nummer === m.kuerzel);
    const bereichNamen = m.bereichIds.map((id) => verlauf.bereiche.find((b) => b.id === id)).filter(Boolean).map(bereichKurzname);
    const details = [m.fach, m.pruefung, m.verantwortlich, m.sprache, m.seite ? 'MHB S. ' + m.seite : ''].filter(Boolean);
    return `
      <li class="katalog-eintrag${geplant ? ' eingeplant' : ''}">
        <div class="katalog-text">
          <div><strong>${escapeHtml(m.name)}</strong> <span class="gedimmt klein">${escapeHtml(m.kuerzel)}</span></div>
          <div class="klein">${formatZahl(m.ects)} ECTS · ${escapeHtml(m.turnus || 'Turnus unbekannt')} · ${escapeHtml(bereichNamen.join(', '))}</div>
          <div class="klein gedimmt">${details.map(escapeHtml).join(' · ')}</div>
        </div>
        ${geplant
          ? `<span class="abzeichen status">${geplant.semester ? geplant.semester + '. Semester' : 'eingeplant'}</span>`
          : `<button class="knopf klein" data-aktion="katalog-einplanen" data-kuerzel="${escapeHtml(m.kuerzel)}">+ Einplanen</button>`}
      </li>`;
  }).join('') : '<li class="gedimmt">Keine Module gefunden.</li>';
}

aktionen['katalog-suche'] = (werte, element) => {
  katalogFilter.suche = element.value;
  zeichneKatalogListe();
};

aktionen['katalog-filter'] = (werte, element) => {
  katalogFilter[werte.feld] = element.type === 'checkbox' ? element.checked : element.value;
  zeichneKatalogListe();
};

aktionen['katalog-einplanen'] = (werte) => {
  const verlauf = daten.studienverlauf;
  const eintrag = katalogModul(verlauf, werte.kuerzel);
  if (!eintrag) return;
  const vorschlag = passendesSemester(eintrag, verlauf.studienbeginn, 1);
  const semester = Array.from({ length: verlauf.semesterAnzahl + 2 }, (_, i) => {
    const info = semesterInfo(i + 1, verlauf.studienbeginn);
    const angebot = turnusAngebot(eintrag.turnus);
    const hinweis = angebot.ws !== angebot.ss && !angebot[info.typ.toLowerCase()] ? ' – nicht angeboten' : '';
    return [i + 1, `${i + 1}. Semester (${info.text})${hinweis}`];
  });
  zeigeDialog({
    titel: 'Modul einplanen',
    speichernText: 'Einplanen',
    inhalt: `
      <p><strong>${escapeHtml(eintrag.name)}</strong><br>
        <span class="gedimmt klein">${escapeHtml(eintrag.kuerzel)} · ${formatZahl(eintrag.ects)} ECTS · ${escapeHtml(eintrag.turnus)}</span></p>
      <label class="feld">Semester
        <select name="semester">${optionenHtml([[0, 'noch offen'], ...semester], vorschlag)}</select>
      </label>
      ${eintrag.bereichIds.length > 1 ? `
        <label class="feld">Anrechnen in
          <select name="bereichId">${optionenHtml(eintrag.bereichIds.map((id) => [id, verlauf.bereiche.find((b) => b.id === id)?.name || id]), eintrag.bereichIds[0])}</select>
        </label>` : ''}`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      planeKatalogModul(eintrag.kuerzel, Number(w.semester), w.bereichId || eintrag.bereichIds[0]);
      datenGeaendert();
      zeigeMeldung(`„${eintrag.name}“ eingeplant`);
      return [];
    },
  });
};

aktionen['katalog-entfernen'] = () => {
  if (!confirm('Modulkatalog entfernen?\n\nBereiche und eingeplante Module bleiben erhalten.')) return;
  daten.studienverlauf.katalog = null;
  datenGeaendert();
};

/* ---------- Modulhandbuch einlesen ---------- */

aktionen['mhb-einlesen'] = () => {
  const auswahl = document.createElement('input');
  auswahl.type = 'file';
  auswahl.accept = '.pdf,application/pdf';
  auswahl.hidden = true;
  auswahl.addEventListener('change', () => {
    if (auswahl.files.length) leseModulhandbuchDatei(auswahl.files[0]);
    auswahl.remove();
  });
  document.body.appendChild(auswahl);
  auswahl.click();
};

async function leseModulhandbuchDatei(datei) {
  const dialog = zeigeDialog({
    titel: 'Modulhandbuch einlesen',
    speichernText: 'Bitte warten …',
    inhalt: `<p>Lese <strong>${escapeHtml(datei.name)}</strong> …</p>
      <progress class="mhb-fortschritt" max="1" value="0"></progress>
      <p class="gedimmt klein mhb-status">PDF wird geöffnet</p>
      <p class="hilfe">Die Datei bleibt auf deinem Gerät, sie wird nirgends hochgeladen.</p>`,
    beimSpeichern: () => ['Das Einlesen läuft noch.'],
  });
  const knopf = $('button[type="submit"]', dialog);
  knopf.disabled = true;
  let ergebnis;
  try {
    const seiten = await pdfZuZeilen(datei, (seite, gesamt) => {
      $('.mhb-fortschritt', dialog).value = seite / gesamt;
      $('.mhb-status', dialog).textContent = `Seite ${seite} von ${gesamt}`;
    });
    ergebnis = leseModulhandbuch(seiten);
  } catch (fehler) {
    if (!dialog.open) return;
    $('.dialog-inhalt', dialog).innerHTML = `<p>Die Datei konnte nicht gelesen werden.</p><p class="gedimmt klein">${escapeHtml(fehler.message || String(fehler))}</p>`;
    knopf.hidden = true;
    return;
  }
  if (!dialog.open) return; // abgebrochen
  zeigeModulhandbuchVorschau(ergebnis);
}

function zeigeModulhandbuchVorschau(ergebnis) {
  const verlauf = daten.studienverlauf;
  if (ergebnis.bereiche.length === 0 || ergebnis.module.length === 0) {
    zeigeDialog({
      titel: 'Modulhandbuch einlesen',
      speichernText: 'OK',
      inhalt: `<p>In der Datei wurden keine Modulgruppen und Module gefunden.</p>
        ${ergebnis.warnungen.length ? `<ul class="klein">${ergebnis.warnungen.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}
        <p class="hilfe">Das Einlesen ist auf das Modulhandbuch des Masterstudiengangs Wirtschaftsinformatik der Uni Bamberg zugeschnitten.</p>`,
      beimSpeichern: () => [],
    });
    return;
  }
  const vorhanden = (gruppe) => verlauf.bereiche.find((b) => (b.kuerzel && b.kuerzel === gruppe.kuerzel) ||
    b.name.toLowerCase() === gruppe.name.toLowerCase() || b.name.startsWith(gruppe.kuerzel + ' '));
  const zeilen = ergebnis.bereiche.map((g) => {
    const auflage = g.minEcts === null;
    const alt = vorhanden(g);
    const spanne = auflage ? 'zählt nicht zu den ECTS' : spanneText({ minEcts: g.minEcts, maxEcts: g.maxEcts });
    const aenderung = alt && !auflage && (alt.minEcts !== g.minEcts || alt.maxEcts !== g.maxEcts)
      ? ` <span class="klein">(bisher ${escapeHtml(spanneText(alt))})</span>` : alt ? ' <span class="klein gedimmt">(vorhanden)</span>' : '';
    return `
      <li>
        <label class="mhb-gruppe">
          <input type="checkbox" name="gruppe-${escapeHtml(g.kuerzel)}"${auflage ? '' : ' checked'}>
          <span>
            <strong>${escapeHtml(g.name)}</strong>
            <span class="klein">${escapeHtml(spanne)}${aenderung} · ${g.anzahlModule} ${g.anzahlModule === 1 ? 'Modul' : 'Module'}</span>
            ${g.hinweise.length ? `<span class="klein gedimmt">${g.hinweise.map(escapeHtml).join(' · ')}</span>` : ''}
            ${auflage ? '<span class="klein gedimmt">Nur nötig, wenn dir im Zugangsbescheid Auflagen gemacht wurden.</span>' : ''}
          </span>
        </label>
      </li>`;
  }).join('');
  const ohneDetails = ergebnis.module.filter((m) => !m.pruefung).length;
  zeigeDialog({
    titel: 'Modulhandbuch übernehmen',
    speichernText: 'Übernehmen',
    breit: true,
    inhalt: `
      <p><strong>${escapeHtml(ergebnis.titel || 'Modulhandbuch')}</strong>${ergebnis.stand ? ` · Stand ${escapeHtml(ergebnis.stand)}` : ''}<br>
        <span class="gedimmt klein">${ergebnis.module.length} Module · Studienziel ${formatZahl(ergebnis.gesamtEcts || verlauf.gesamtEcts)} ECTS</span></p>
      <p class="klein"><strong>Welche Modulgruppen übernehmen?</strong></p>
      <ul class="mhb-gruppen">${zeilen}</ul>
      ${ergebnis.warnungen.length ? `<details class="hinweis klein"><summary>${ergebnis.warnungen.length} Zeilen nicht erkannt</summary>
        <ul>${ergebnis.warnungen.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul></details>` : ''}
      ${ohneDetails ? `<p class="klein gedimmt">Bei ${ohneDetails} Modulen wurde keine Prüfungsform gefunden.</p>` : ''}
      <p class="hilfe">Die Modulgruppen werden als Bereiche angelegt (vorhandene mit gleichem Namen aktualisiert), die Module
        landen im <strong>Modulkatalog</strong>, aus dem du sie einplanst. ${verlauf.katalog ? 'Der bisherige Katalog wird ersetzt, ' : ''}
        Deine eingeplanten Module bleiben erhalten.</p>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const gruppen = ergebnis.bereiche.map((g) => g.kuerzel).filter((k) => w['gruppe-' + k]);
      if (gruppen.length === 0) return ['Bitte mindestens eine Modulgruppe auswählen.'];
      const z = uebernimmModulhandbuch(ergebnis, gruppen);
      katalogFilter.bereichId = '';
      datenGeaendert();
      zeigeMeldung([
        `${z.module} Module im Katalog`,
        z.neueBereiche ? `${z.neueBereiche} Bereiche angelegt` : '',
        z.geaenderteBereiche ? `${z.geaenderteBereiche} Bereiche aktualisiert` : '',
        z.zugeordnet ? `${z.zugeordnet} eingeplante Module einem Bereich zugeordnet` : '',
      ].filter(Boolean).join('\n'));
      return [];
    },
  });
}
