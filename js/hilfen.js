/* =====================================================================
   hilfen.js – kleine Hilfsfunktionen, die überall gebraucht werden:
   Zugriff auf HTML-Elemente, sichere Textausgabe, IDs, Datum & Uhrzeit,
   Dialoge und Kurzmeldungen.
   ===================================================================== */

'use strict';

// Sammlung aller Aktionen, die über data-aktion="…" im HTML ausgelöst
// werden. Jede ui-…js-Datei trägt hier ihre Funktionen ein, app.js ruft
// sie bei Klicks und Änderungen auf.
const aktionen = {};

/* ---------- HTML-Elemente finden ---------- */

// Kurzform für document.querySelector
function $(selektor, wurzel = document) {
  return wurzel.querySelector(selektor);
}

// Kurzform für document.querySelectorAll, liefert ein echtes Array
function $$(selektor, wurzel = document) {
  return Array.from(wurzel.querySelectorAll(selektor));
}

/* ---------- Texte sicher ausgeben ---------- */

// Ersetzt Sonderzeichen, damit Nutzereingaben nie als HTML ausgeführt werden.
// WICHTIG: Jeder Text, den jemand eingetippt hat, muss hier durch!
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Gibt die Adresse nur zurück, wenn sie mit http:// oder https:// beginnt.
// So kann kein "javascript:…"-Link untergeschoben werden.
function sichererLink(url) {
  if (!url) return '';
  try {
    const adresse = new URL(String(url).trim());
    return adresse.protocol === 'http:' || adresse.protocol === 'https:' ? adresse.href : '';
  } catch (fehler) {
    return '';
  }
}

// Zahl im deutschen Format (Komma statt Punkt)
function formatZahl(zahl, nachkommastellen = 1) {
  return Number(zahl || 0).toLocaleString('de-DE', { maximumFractionDigits: nachkommastellen });
}

// Liest eine Zahl aus einem Eingabefeld; erlaubt auch "2,5"
function leseZahl(text, ersatz = 0) {
  const zahl = parseFloat(String(text ?? '').replace(',', '.'));
  return Number.isFinite(zahl) ? zahl : ersatz;
}

/* ---------- IDs und Kopien ---------- */

// Erzeugt eine (praktisch) eindeutige ID, z. B. "modul-lq3k9x-a81f2"
function neueId(praefix) {
  return praefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// Tiefe Kopie eines einfachen Objekts (ohne Funktionen)
function kopie(objekt) {
  return JSON.parse(JSON.stringify(objekt));
}

/* ---------- Farben ---------- */

// Liefert Schwarz oder Weiß – je nachdem, was auf der Hintergrundfarbe
// besser lesbar ist (Faustformel für die wahrgenommene Helligkeit).
function textfarbeFuer(hexFarbe) {
  const hex = String(hexFarbe || '#888888').replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const helligkeit = (r * 299 + g * 587 + b * 114) / 1000;
  return helligkeit > 150 ? '#1a1a1a' : '#ffffff';
}

/* ---------- Datum ----------
   Daten werden als Text "JJJJ-MM-TT" gespeichert (so liefert sie auch
   <input type="date">). Zum Rechnen wandeln wir sie in eine "Tagnummer"
   um: die Anzahl Tage seit dem 01.01.1970. Damit sind "+7 Tage" oder
   "liegt zwischen" einfache Rechnungen mit ganzen Zahlen.
   ------------------------------------------------------------------ */

const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MS_PRO_TAG = 24 * 60 * 60 * 1000;

// Zweistellig mit führender Null: 7 → "07"
function zweistellig(zahl) {
  return String(zahl).padStart(2, '0');
}

// "2026-10-12" → Tagnummer (oder null, wenn leer)
function datumZuTagNr(datum) {
  if (!datum) return null;
  const [jahr, monat, tag] = String(datum).split('-').map(Number);
  if (!jahr || !monat || !tag) return null;
  return Math.round(Date.UTC(jahr, monat - 1, tag) / MS_PRO_TAG);
}

// Tagnummer → "2026-10-12"
function tagNrZuDatum(tagNr) {
  return new Date(tagNr * MS_PRO_TAG).toISOString().slice(0, 10);
}

// Wochentag einer Tagnummer: 1 = Montag … 7 = Sonntag
// (Der 01.01.1970 war ein Donnerstag, daher die +3.)
function wochentagVon(tagNr) {
  return ((tagNr + 3) % 7 + 7) % 7 + 1;
}

// Tagnummer des Montags derselben Woche
function montagVon(tagNr) {
  return tagNr - wochentagVon(tagNr) + 1;
}

// Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag = KW 1)
function kalenderwoche(tagNr) {
  const donnerstag = tagNr - wochentagVon(tagNr) + 4;
  const jahr = new Date(donnerstag * MS_PRO_TAG).getUTCFullYear();
  const ersterJanuar = datumZuTagNr(jahr + '-01-01');
  return Math.floor((donnerstag - ersterJanuar) / 7) + 1;
}

// Formatiert ein Datum (Text oder Tagnummer) als "14.10.2026",
// optional mit Wochentag ("Mi 14.10.2026") und ohne Jahr ("14.10.")
function formatDatum(datum, { mitWochentag = false, mitJahr = true } = {}) {
  const tagNr = typeof datum === 'number' ? datum : datumZuTagNr(datum);
  if (tagNr === null) return '';
  const d = new Date(tagNr * MS_PRO_TAG);
  let text = zweistellig(d.getUTCDate()) + '.' + zweistellig(d.getUTCMonth() + 1) + '.';
  if (mitJahr) text += d.getUTCFullYear();
  if (mitWochentag) text = WOCHENTAGE_KURZ[wochentagVon(tagNr) - 1] + ' ' + text;
  return text;
}

// Heutiges Datum als "JJJJ-MM-TT" (in der Ortszeit des Geräts)
function heuteAlsDatum() {
  const jetzt = new Date();
  return jetzt.getFullYear() + '-' + zweistellig(jetzt.getMonth() + 1) + '-' + zweistellig(jetzt.getDate());
}

/* ---------- Uhrzeit ----------
   Uhrzeiten werden als "HH:MM" gespeichert. Zum Rechnen nutzen wir
   "Minuten seit Mitternacht": 10:15 → 615.
   ------------------------------------------------------------------ */

function zeitZuMinuten(zeit) {
  if (!zeit) return null;
  const [stunden, minuten] = String(zeit).split(':').map(Number);
  return stunden * 60 + (minuten || 0);
}

function minutenZuZeit(minuten) {
  return zweistellig(Math.floor(minuten / 60)) + ':' + zweistellig(minuten % 60);
}

/* ---------- Kurzmeldung unten am Bildschirm ---------- */

let meldungZeitgeber = null;

function zeigeMeldung(text) {
  const feld = $('#meldung');
  feld.textContent = text;
  feld.classList.add('sichtbar');
  clearTimeout(meldungZeitgeber);
  meldungZeitgeber = setTimeout(() => feld.classList.remove('sichtbar'), 3000);
}

/* ---------- Dialoge (Eingabeformulare im Overlay) ----------
   zeigeDialog() baut ein Formular in das <dialog>-Element aus index.html.
   beimSpeichern(formular) wird beim Klick auf "Speichern" aufgerufen und
   gibt eine Liste mit Fehlermeldungen zurück. Ist die Liste leer, schließt
   sich der Dialog; sonst werden die Fehler oben im Dialog angezeigt.
   ------------------------------------------------------------------ */

function zeigeDialog({ titel, inhalt, beimSpeichern, speichernText = 'Speichern', breit = false }) {
  const dialog = $('#dialog');
  dialog.classList.toggle('breit', breit);
  dialog.innerHTML = `
    <form class="dialog-formular" novalidate>
      <header class="dialog-kopf">
        <h2>${escapeHtml(titel)}</h2>
        <button type="button" class="knopf-icon" data-dialog-schliessen aria-label="Schließen">✕</button>
      </header>
      <div class="dialog-fehler" role="alert" hidden></div>
      <div class="dialog-inhalt">${inhalt}</div>
      <footer class="dialog-fuss">
        <button type="button" class="knopf" data-dialog-schliessen>Abbrechen</button>
        <button type="submit" class="knopf primaer">${escapeHtml(speichernText)}</button>
      </footer>
    </form>`;

  const formular = $('form', dialog);
  formular.addEventListener('submit', (ereignis) => {
    ereignis.preventDefault();
    const fehler = beimSpeichern(formular) || [];
    if (fehler.length > 0) {
      zeigeDialogFehler(fehler);
    } else {
      dialog.close();
    }
  });
  $$('[data-dialog-schliessen]', dialog).forEach((knopf) => {
    knopf.addEventListener('click', () => dialog.close());
  });

  if (!dialog.open) dialog.showModal();
  // Erstes Eingabefeld fokussieren (auf dem Handy nicht, sonst springt die Tastatur auf)
  const erstesFeld = $('.dialog-inhalt input, .dialog-inhalt select', dialog);
  if (erstesFeld && window.matchMedia('(min-width: 700px)').matches) erstesFeld.focus();
  return dialog;
}

function zeigeDialogFehler(fehler) {
  const kasten = $('#dialog .dialog-fehler');
  kasten.innerHTML = '<strong>Bitte prüfen:</strong><ul>' +
    fehler.map((text) => '<li>' + escapeHtml(text) + '</li>').join('') + '</ul>';
  kasten.hidden = false;
  kasten.scrollIntoView({ block: 'nearest' });
}

// Liest alle Felder eines Formulars in ein Objekt { feldname: wert }.
// Checkboxen ergeben true/false.
function formularWerte(formular) {
  const werte = {};
  $$('input[name], select[name], textarea[name]', formular).forEach((feld) => {
    if (feld.type === 'checkbox') {
      werte[feld.name] = feld.checked;
    } else if (feld.type === 'radio') {
      if (feld.checked) werte[feld.name] = feld.value;
    } else {
      werte[feld.name] = feld.value;
    }
  });
  return werte;
}

// HTML für einen Ein/Aus-Schalter (eine gestaltete Checkbox)
function schalterHtml(aktion, id, istAn, beschriftung) {
  return `<label class="schalter" title="${escapeHtml(beschriftung)}">
      <input type="checkbox" data-aktion="${aktion}" data-id="${escapeHtml(id)}"${istAn ? ' checked' : ''}
             aria-label="${escapeHtml(beschriftung)}">
      <span class="schalter-bahn" aria-hidden="true"></span>
    </label>`;
}

// <option>-Liste für eine Auswahlbox; werte = [[wert, text], …]
function optionenHtml(werte, ausgewaehlt) {
  return werte.map(([wert, text]) =>
    `<option value="${escapeHtml(wert)}"${String(wert) === String(ausgewaehlt) ? ' selected' : ''}>${escapeHtml(text)}</option>`
  ).join('');
}
