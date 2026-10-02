/* =====================================================================
   ui-module.js – Tab "Module": Liste der Module mit ihren
   Lehrveranstaltungen sowie die Dialoge zum Anlegen und Bearbeiten.
   ===================================================================== */

'use strict';

const PRUEFUNGSFORMEN = ['Klausur', 'Mündliche Prüfung', 'Hausarbeit', 'Projektarbeit', 'Referat', 'Präsentation', 'Portfolio'];

/* ---------- Tab zeichnen ---------- */

function zeigeModule() {
  const bereich = $('#tab-module');
  const module = daten.module;
  const e = daten.einstellungen;

  // Kopfzeile mit Zusammenfassung
  const aktive = module.filter((m) => m.aktiv);
  const ectsPflicht = aktive.filter((m) => m.pflicht).reduce((summe, m) => summe + m.ects, 0);
  const ectsWahl = aktive.filter((m) => !m.pflicht).reduce((summe, m) => summe + m.ects, 0);

  let html = `
    <div class="bereich-kopf">
      <div>
        <h2>Module</h2>
        <p class="untertitel">${module.length} Module · aktiv: ${formatZahl(ectsPflicht)} ECTS Pflicht + ${formatZahl(ectsWahl)} ECTS Wahl</p>
      </div>
      <button class="knopf primaer" data-aktion="modul-neu">+ Modul</button>
    </div>`;

  if (!e.semesterStart || !e.semesterEnde) {
    html += `<div class="hinweis">
        Tipp: Lege zuerst unter <a href="#einstellungen">Einstellungen</a> den Vorlesungszeitraum fest.
        Termine ohne eigenes Start-/Enddatum gelten dann automatisch für das ganze Semester.
      </div>`;
  }

  if (module.length === 0) {
    html += `<div class="leer-zustand">
        <p>Noch keine Module angelegt.</p>
        <p>
          <button class="knopf primaer" data-aktion="modul-neu">Erstes Modul anlegen</button>
          <button class="knopf" data-aktion="beispieldaten-laden">Beispieldaten laden</button>
        </p>
      </div>`;
  } else {
    html += '<div class="karten-liste">' + module.map(modulKarteHtml).join('') + '</div>';
  }
  bereich.innerHTML = html;
}

function modulKarteHtml(modul) {
  const meta = [];
  if (modul.nummer) meta.push(escapeHtml(modul.nummer));
  if (modul.dozent) meta.push(escapeHtml(modul.dozent));
  if (modul.pruefungsform) meta.push('Prüfung: ' + escapeHtml(modul.pruefungsform));
  const link = sichererLink(modul.link);
  if (link) meta.push(`<a href="${escapeHtml(link)}" target="_blank" rel="noopener">Link ↗</a>`);

  const veranstaltungen = modul.veranstaltungen.length
    ? modul.veranstaltungen.map((v) => veranstaltungHtml(modul, v)).join('')
    : '<li class="leer">Noch keine Lehrveranstaltung – ohne Termine zählt das Modul nur mit seinen ECTS.</li>';

  return `
    <article class="karte modul-karte${modul.aktiv ? '' : ' inaktiv'}" style="--farbe:${escapeHtml(modul.farbe)}">
      <div class="karte-kopf">
        ${schalterHtml('modul-aktiv', modul.id, modul.aktiv, 'Modul aktiv')}
        <h3 class="karte-titel">${escapeHtml(modul.name)}</h3>
        <span class="abzeichen ${modul.pflicht ? 'pflicht' : 'wahl'}">${modul.pflicht ? 'Pflicht' : 'Wahl'}</span>
        <span class="ects">${formatZahl(modul.ects)} ECTS</span>
      </div>
      ${meta.length ? `<p class="meta">${meta.join(' · ')}</p>` : ''}
      ${modul.notizen ? `<details class="notizen"><summary>Notizen</summary><p>${escapeHtml(modul.notizen)}</p></details>` : ''}
      <ul class="veranstaltungen">${veranstaltungen}</ul>
      <div class="karte-aktionen">
        <button class="knopf klein" data-aktion="veranstaltung-neu" data-modul="${modul.id}">+ Lehrveranstaltung</button>
        <button class="knopf klein" data-aktion="modul-bearbeiten" data-id="${modul.id}">Bearbeiten</button>
        <button class="knopf klein gefahr" data-aktion="modul-loeschen" data-id="${modul.id}">Löschen</button>
      </div>
    </article>`;
}

function veranstaltungHtml(modul, veranstaltung) {
  let termineHtml;
  if (veranstaltung.optionen.length > 1) {
    // Auswahlgruppe: jede Option mit eigenem Schalter
    termineHtml = `<p class="klein gedimmt">Alternativen – genau eine wird belegt:</p>
      <ul class="optionen">` +
      veranstaltung.optionen.map((option) => `
        <li class="${option.aktiv ? '' : 'inaktiv'}">
          ${schalterHtml('option-aktiv', option.id, option.aktiv, 'Diese Gruppe berücksichtigen')}
          <span><strong>${escapeHtml(option.name)}:</strong>
          ${option.termine.map((t) => escapeHtml(beschreibeTermin(t))).join('<br>')}</span>
        </li>`).join('') +
      '</ul>';
  } else {
    const termine = veranstaltung.optionen[0] ? veranstaltung.optionen[0].termine : [];
    termineHtml = `<p class="termine-text">${termine.map((t) => escapeHtml(beschreibeTermin(t))).join('<br>')}</p>`;
  }

  return `
    <li class="veranstaltung${veranstaltung.aktiv ? '' : ' inaktiv'}">
      <div class="zeile">
        ${schalterHtml('veranstaltung-aktiv', veranstaltung.id, veranstaltung.aktiv, 'Lehrveranstaltung aktiv')}
        <span class="va-titel">${escapeHtml(veranstaltungName(veranstaltung))}</span>
        <span class="zeile-aktionen">
          <button class="knopf-text" data-aktion="veranstaltung-bearbeiten" data-modul="${modul.id}" data-id="${veranstaltung.id}">Bearbeiten</button>
          <button class="knopf-text gefahr" data-aktion="veranstaltung-loeschen" data-modul="${modul.id}" data-id="${veranstaltung.id}">Löschen</button>
        </span>
      </div>
      ${termineHtml}
    </li>`;
}

/* ---------- Schalter und Löschen ---------- */

aktionen['modul-aktiv'] = (werte, element) => {
  findeModul(werte.id).aktiv = element.checked;
  datenGeaendert();
};

aktionen['veranstaltung-aktiv'] = (werte, element) => {
  findeVeranstaltung(werte.id).veranstaltung.aktiv = element.checked;
  datenGeaendert();
};

aktionen['option-aktiv'] = (werte, element) => {
  findeOption(werte.id).option.aktiv = element.checked;
  datenGeaendert();
};

aktionen['modul-loeschen'] = (werte) => {
  const modul = findeModul(werte.id);
  if (!confirm(`Modul „${modul.name}“ mit allen Lehrveranstaltungen löschen?`)) return;
  daten.module = daten.module.filter((m) => m.id !== modul.id);
  datenGeaendert();
};

aktionen['veranstaltung-loeschen'] = (werte) => {
  const modul = findeModul(werte.modul);
  const veranstaltung = modul.veranstaltungen.find((v) => v.id === werte.id);
  if (!confirm(`„${veranstaltungName(veranstaltung)}“ aus „${modul.name}“ löschen?`)) return;
  modul.veranstaltungen = modul.veranstaltungen.filter((v) => v.id !== werte.id);
  datenGeaendert();
};

/* ---------- Dialog: Modul anlegen/bearbeiten ---------- */

aktionen['modul-neu'] = () => oeffneModulDialog(null);
aktionen['modul-bearbeiten'] = (werte) => oeffneModulDialog(werte.id);

function oeffneModulDialog(modulId) {
  const vorhanden = modulId ? findeModul(modulId) : null;
  const m = vorhanden || neuesModul();

  zeigeDialog({
    titel: vorhanden ? 'Modul bearbeiten' : 'Neues Modul',
    inhalt: `
      <label class="feld">Name *
        <input name="name" value="${escapeHtml(m.name)}" required placeholder="z. B. Forschungsmethoden">
      </label>
      <div class="feldreihe">
        <label class="feld">Modulnummer
          <input name="nummer" value="${escapeHtml(m.nummer)}" placeholder="z. B. M-01">
        </label>
        <label class="feld schmal">ECTS
          <input name="ects" type="number" min="0" step="0.5" inputmode="decimal" value="${escapeHtml(m.ects)}">
        </label>
        <label class="feld schmal">Farbe
          <input name="farbe" type="color" value="${escapeHtml(m.farbe)}">
        </label>
      </div>
      <fieldset class="feld">
        <legend>Art</legend>
        <label class="auswahl"><input type="radio" name="art" value="pflicht"${m.pflicht ? ' checked' : ''}> Pflicht – in jeder Variante enthalten</label>
        <label class="auswahl"><input type="radio" name="art" value="wahl"${m.pflicht ? '' : ' checked'}> Wahl – darf in einer Variante fehlen</label>
      </fieldset>
      <div class="feldreihe">
        <label class="feld">Dozent:in
          <input name="dozent" value="${escapeHtml(m.dozent)}">
        </label>
        <label class="feld">Prüfungsform
          <input name="pruefungsform" value="${escapeHtml(m.pruefungsform)}" list="liste-pruefungsformen">
          <datalist id="liste-pruefungsformen">${PRUEFUNGSFORMEN.map((p) => `<option value="${p}">`).join('')}</datalist>
        </label>
      </div>
      <label class="feld">Link (z. B. Modulhandbuch, Lernplattform)
        <input name="link" type="url" value="${escapeHtml(m.link)}" placeholder="https://…">
      </label>
      <label class="feld">Notizen
        <textarea name="notizen" rows="3">${escapeHtml(m.notizen)}</textarea>
      </label>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const fehler = [];
      if (!w.name.trim()) fehler.push('Bitte einen Namen eingeben.');
      if (leseZahl(w.ects, -1) < 0) fehler.push('ECTS müssen eine Zahl ab 0 sein.');
      if (w.link.trim() && !sichererLink(w.link)) fehler.push('Der Link muss mit http:// oder https:// beginnen.');
      if (fehler.length) return fehler;

      const ziel = vorhanden || m;
      Object.assign(ziel, {
        name: w.name.trim(),
        nummer: w.nummer.trim(),
        ects: leseZahl(w.ects, 0),
        farbe: w.farbe,
        pflicht: w.art !== 'wahl',
        dozent: w.dozent.trim(),
        pruefungsform: w.pruefungsform.trim(),
        link: w.link.trim(),
        notizen: w.notizen.trim(),
      });
      if (!vorhanden) daten.module.push(ziel);
      datenGeaendert();
      zeigeMeldung(vorhanden ? 'Modul gespeichert' : 'Modul angelegt – jetzt Lehrveranstaltungen hinzufügen');
      return [];
    },
  });
}

/* ---------- Dialog: Lehrveranstaltung anlegen/bearbeiten ----------
   Hier wird an einer KOPIE ("Entwurf") gearbeitet. Jede Eingabe ändert
   sofort den Entwurf; beim Hinzufügen/Entfernen von Gruppen, Terminen
   oder Daten wird der Dialoginhalt neu gezeichnet. Erst "Speichern"
   übernimmt den Entwurf in die echten Daten.
   ------------------------------------------------------------------ */

let entwurf = null;

aktionen['veranstaltung-neu'] = (werte) => oeffneVeranstaltungDialog(werte.modul, null);
aktionen['veranstaltung-bearbeiten'] = (werte) => oeffneVeranstaltungDialog(werte.modul, werte.id);

function oeffneVeranstaltungDialog(modulId, veranstaltungId) {
  const modul = findeModul(modulId);
  const vorhanden = veranstaltungId ? modul.veranstaltungen.find((v) => v.id === veranstaltungId) : null;
  entwurf = vorhanden ? kopie(vorhanden) : neueVeranstaltung();

  const dialog = zeigeDialog({
    titel: (vorhanden ? 'Lehrveranstaltung bearbeiten' : 'Neue Lehrveranstaltung') + ' – ' + modul.name,
    breit: true,
    inhalt: '<div id="va-editor"></div>',
    beimSpeichern() {
      const fehler = pruefeEntwurf(entwurf);
      if (fehler.length) return fehler;
      if (vorhanden) {
        Object.assign(vorhanden, entwurf);
      } else {
        modul.veranstaltungen.push(entwurf);
      }
      datenGeaendert();
      zeigeMeldung('Lehrveranstaltung gespeichert');
      return [];
    },
  });

  const editor = $('#va-editor', dialog);
  zeichneEntwurf();

  // Eingaben direkt in den Entwurf übernehmen
  editor.addEventListener('input', (ereignis) => uebernehmeEingabe(ereignis.target, false));
  editor.addEventListener('change', (ereignis) => uebernehmeEingabe(ereignis.target, true));

  // Knöpfe im Editor (Gruppe/Termin/Datum hinzufügen oder entfernen)
  editor.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-va]');
    if (!knopf) return;
    ereignis.preventDefault();
    bearbeiteEntwurf(knopf.dataset.va, Number(knopf.dataset.o), Number(knopf.dataset.t), Number(knopf.dataset.d));
    zeichneEntwurf();
  });
}

// Übernimmt den Wert eines Eingabefelds in den Entwurf
function uebernehmeEingabe(feld, istAbgeschlossen) {
  const name = feld.dataset.feld;
  if (!name) return;
  const o = Number(feld.dataset.o);
  const t = Number(feld.dataset.t);

  if (name === 'typ' || name === 'titel') {
    entwurf[name] = feld.value;
  } else if (name === 'optionName') {
    entwurf.optionen[o].name = feld.value;
  } else if (name === 'datum') {
    entwurf.optionen[o].termine[t].daten[Number(feld.dataset.d)] = feld.value;
  } else {
    const termin = entwurf.optionen[o].termine[t];
    termin[name] = (name === 'wochentag' || name === 'startwoche') ? Number(feld.value) : feld.value;
    // Diese Felder ändern, was sonst noch angezeigt wird → neu zeichnen
    if (istAbgeschlossen && ['rhythmus', 'wochentag', 'start'].includes(name)) zeichneEntwurf();
  }
}

// Gruppen, Termine und Block-Daten hinzufügen/entfernen
function bearbeiteEntwurf(befehl, o, t, d) {
  const optionen = entwurf.optionen;
  switch (befehl) {
    case 'option-neu': {
      // Beim Umstieg von 1 auf 2 Gruppen bekommen beide automatisch Namen
      if (optionen.length === 1 && !optionen[0].name) optionen[0].name = 'Gruppe A';
      const neu = neueOption('Gruppe ' + String.fromCharCode(65 + optionen.length));
      // Termine der ersten Gruppe als Vorlage kopieren (spart Tipparbeit)
      neu.termine = optionen[0].termine.map((termin) => ({ ...kopie(termin), id: neueId('termin') }));
      optionen.push(neu);
      break;
    }
    case 'option-loeschen':
      optionen.splice(o, 1);
      if (optionen.length === 1) optionen[0].aktiv = true;
      break;
    case 'termin-neu': {
      const vorlage = optionen[o].termine[optionen[o].termine.length - 1];
      optionen[o].termine.push({ ...neuerTermin(), start: vorlage?.start || '', ende: vorlage?.ende || '' });
      break;
    }
    case 'termin-loeschen':
      optionen[o].termine.splice(t, 1);
      break;
    case 'datum-neu':
      optionen[o].termine[t].daten.push('');
      break;
    case 'datum-loeschen':
      optionen[o].termine[t].daten.splice(d, 1);
      break;
  }
}

// Zeichnet den kompletten Inhalt des Veranstaltungs-Editors neu
function zeichneEntwurf() {
  const editor = $('#va-editor');
  if (!editor) return;
  const mehrere = entwurf.optionen.length > 1;

  editor.innerHTML = `
    <div class="feldreihe">
      <label class="feld schmal">Art
        <select data-feld="typ">${optionenHtml(VERANSTALTUNGSTYPEN.map((typ) => [typ, typ]), entwurf.typ)}</select>
      </label>
      <label class="feld">Titel (optional)
        <input data-feld="titel" value="${escapeHtml(entwurf.titel)}" placeholder="z. B. Teil 1, Englisch …">
      </label>
    </div>

    <h3 class="editor-titel">${mehrere ? 'Alternativen – genau eine Gruppe wird belegt' : 'Termine'}</h3>
    ${entwurf.optionen.map((option, o) => optionEditorHtml(option, o, mehrere)).join('')}

    <button type="button" class="knopf" data-va="option-neu">+ Alternativtermin (weitere Gruppe)</button>
    <p class="hilfe">Gibt es mehrere Gruppen (z. B. Übung A/B/C), lege sie als Alternativen an.
      Der Planer wählt dann genau eine aus, die ohne Überschneidung passt.</p>`;
}

function optionEditorHtml(option, o, mehrere) {
  const kopf = mehrere ? `
    <div class="option-kopf">
      <label class="feld">Name der Gruppe
        <input data-feld="optionName" data-o="${o}" value="${escapeHtml(option.name)}">
      </label>
      <button type="button" class="knopf klein gefahr" data-va="option-loeschen" data-o="${o}">Gruppe entfernen</button>
    </div>` : '';

  return `
    <fieldset class="option-editor${mehrere ? ' mit-rahmen' : ''}">
      ${kopf}
      ${option.termine.map((termin, t) => terminEditorHtml(termin, o, t, option.termine.length > 1)).join('')}
      <button type="button" class="knopf klein" data-va="termin-neu" data-o="${o}">+ weiterer Termin${mehrere ? ' für diese Gruppe' : ''}</button>
    </fieldset>`;
}

function terminEditorHtml(termin, o, t, loeschbar) {
  const attr = `data-o="${o}" data-t="${t}"`;
  const e = daten.einstellungen;
  let html = `<div class="termin-editor">
    <div class="feldreihe">
      <label class="feld">Rhythmus
        <select data-feld="rhythmus" ${attr}>${optionenHtml(Object.entries(RHYTHMEN), termin.rhythmus)}</select>
      </label>`;

  if (termin.rhythmus !== 'block') {
    html += `
      <label class="feld">Wochentag
        <select data-feld="wochentag" ${attr}>${optionenHtml(WOCHENTAGE.map((tag, i) => [i + 1, tag]), termin.wochentag)}</select>
      </label>`;
  }

  html += `
      <label class="feld schmal">von
        <input type="time" data-feld="von" ${attr} value="${escapeHtml(termin.von)}">
      </label>
      <label class="feld schmal">bis
        <input type="time" data-feld="bis" ${attr} value="${escapeHtml(termin.bis)}">
      </label>
      <label class="feld">Raum
        <input data-feld="raum" ${attr} value="${escapeHtml(termin.raum)}" placeholder="z. B. HS 1">
      </label>
    </div>`;

  if (termin.rhythmus === 'block') {
    // Liste einzelner Daten
    html += `<div class="block-daten"><span class="feld-titel">Daten der Blocktermine</span>` +
      termin.daten.map((datum, d) => `
        <span class="datum-eintrag">
          <input type="date" data-feld="datum" ${attr} data-d="${d}" value="${escapeHtml(datum)}" aria-label="Datum ${d + 1}">
          <button type="button" class="knopf-icon" data-va="datum-loeschen" ${attr} data-d="${d}" aria-label="Datum entfernen">✕</button>
        </span>`).join('') +
      `<button type="button" class="knopf klein" data-va="datum-neu" ${attr}>+ Datum</button></div>`;
  } else {
    if (termin.rhythmus === 'zweiwoechentlich') {
      // Die zwei möglichen ersten Termine zur Auswahl anbieten
      const ersterW1 = ersterTerminTag({ ...termin, startwoche: 1 });
      const text = (versatz) => ersterW1 === null
        ? (versatz ? 'ab der 2. Woche' : 'ab der 1. Woche')
        : 'ab ' + formatDatum(ersterW1 + versatz, { mitWochentag: true });
      html += `
      <label class="feld">Startwoche (erster Termin)
        <select data-feld="startwoche" ${attr}>${optionenHtml([[1, text(0)], [2, text(7)]], termin.startwoche)}</select>
      </label>`;
    }
    html += `
    <div class="feldreihe">
      <label class="feld">Beginn <span class="gedimmt">(leer = ${e.semesterStart ? formatDatum(e.semesterStart) : 'Vorlesungsbeginn'})</span>
        <input type="date" data-feld="start" ${attr} value="${escapeHtml(termin.start)}">
      </label>
      <label class="feld">Ende <span class="gedimmt">(leer = ${e.semesterEnde ? formatDatum(e.semesterEnde) : 'Vorlesungsende'})</span>
        <input type="date" data-feld="ende" ${attr} value="${escapeHtml(termin.ende)}">
      </label>
    </div>`;
  }

  if (loeschbar) {
    html += `<button type="button" class="knopf-text gefahr" data-va="termin-loeschen" ${attr}>Termin entfernen</button>`;
  }
  return html + '</div>';
}

// Prüft den Entwurf und liefert eine Liste verständlicher Fehlermeldungen
function pruefeEntwurf(v) {
  const fehler = [];
  const e = daten.einstellungen;
  const mehrere = v.optionen.length > 1;
  v.titel = v.titel.trim();

  v.optionen.forEach((option, o) => {
    if (mehrere && !option.name.trim()) option.name = 'Gruppe ' + String.fromCharCode(65 + o);
    if (option.termine.length === 0) fehler.push((mehrere ? option.name + ': ' : '') + 'Bitte mindestens einen Termin angeben.');

    option.termine.forEach((termin, t) => {
      // Ort des Fehlers, z. B. "Gruppe B, Termin 2: "
      const ort = [];
      if (mehrere) ort.push(option.name);
      if (option.termine.length > 1) ort.push('Termin ' + (t + 1));
      const wo = ort.length ? ort.join(', ') + ': ' : '';
      termin.raum = termin.raum.trim();
      if (!termin.von || !termin.bis) {
        fehler.push(wo + 'Bitte Beginn- und Endzeit angeben.');
      } else if (zeitZuMinuten(termin.von) >= zeitZuMinuten(termin.bis)) {
        fehler.push(wo + 'Die Endzeit muss nach der Anfangszeit liegen.');
      }

      if (termin.rhythmus === 'block') {
        termin.daten = termin.daten.filter(Boolean).sort();
        termin.daten = termin.daten.filter((datum, i) => termin.daten.indexOf(datum) === i); // doppelte entfernen
        if (termin.daten.length === 0) fehler.push(wo + 'Bitte mindestens ein Datum für den Blocktermin eintragen.');
      } else {
        if (!termin.start && !e.semesterStart) fehler.push(wo + 'Kein Beginn: Datum eintragen oder Vorlesungszeitraum in den Einstellungen festlegen.');
        if (!termin.ende && !e.semesterEnde) fehler.push(wo + 'Kein Ende: Datum eintragen oder Vorlesungszeitraum in den Einstellungen festlegen.');
        const { start, ende } = zeitraumVon(termin);
        if (start !== null && ende !== null) {
          const erster = ersterTerminTag(termin);
          if (start > ende) fehler.push(wo + 'Das Enddatum liegt vor dem Beginn.');
          else if (ende - start > 366) fehler.push(wo + 'Der Zeitraum ist länger als ein Jahr – Tippfehler im Datum?');
          else if (erster > ende) fehler.push(wo + 'Im gewählten Zeitraum gibt es keinen einzigen Termin.');
        }
      }
    });
  });
  return fehler;
}
