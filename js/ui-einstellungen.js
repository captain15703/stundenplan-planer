/* =====================================================================
   ui-einstellungen.js – Tab "Einstellungen": Semester mit
   Vorlesungszeitraum, vorlesungsfreie Zeiten und Datenverwaltung.
   ===================================================================== */

'use strict';

function zeigeEinstellungen() {
  const bereich = $('#tab-einstellungen');
  const e = daten.einstellungen;

  const freieZeiten = [...daten.vorlesungsfrei].sort((a, b) => a.von.localeCompare(b.von));
  const freiListe = freieZeiten.length
    ? '<ul class="einfache-liste">' + freieZeiten.map((frei) => `
        <li>
          <span><strong>${escapeHtml(frei.name)}</strong> · ${escapeHtml(beschreibeVorlesungsfrei(frei))}</span>
          <span class="zeile-aktionen">
            <button class="knopf-text" data-aktion="frei-bearbeiten" data-id="${frei.id}">Bearbeiten</button>
            <button class="knopf-text gefahr" data-aktion="frei-loeschen" data-id="${frei.id}">Löschen</button>
          </span>
        </li>`).join('') + '</ul>'
    : '<p class="gedimmt">Keine vorlesungsfreien Zeiten eingetragen.</p>';

  bereich.innerHTML = `
    <div class="bereich-kopf"><h2>Einstellungen</h2></div>

    <section class="karte">
      <h3>Semester</h3>
      <div class="feldreihe">
        <label class="feld">Bezeichnung
          <input data-aktion="einstellung" data-feld="semesterName" value="${escapeHtml(e.semesterName)}" placeholder="z. B. WiSe 2026/27">
        </label>
        <label class="feld">Vorlesungsbeginn
          <input type="date" data-aktion="einstellung" data-feld="semesterStart" value="${escapeHtml(e.semesterStart)}">
        </label>
        <label class="feld">Vorlesungsende
          <input type="date" data-aktion="einstellung" data-feld="semesterEnde" value="${escapeHtml(e.semesterEnde)}">
        </label>
      </div>
      <p class="hilfe">Termine ohne eigenes Start- oder Enddatum gelten für diesen Zeitraum.</p>
    </section>

    <section class="karte">
      <div class="karte-kopf">
        <h3 class="karte-titel">Vorlesungsfreie Zeiten</h3>
        <button class="knopf klein" data-aktion="frei-neu">+ Hinzufügen</button>
      </div>
      <p class="hilfe">Feiertage und Pausen (z. B. Weihnachten): Wöchentliche und 14-tägige Termine fallen
        an diesen Tagen aus – bei der Überschneidungsprüfung und im Kalender-Export.
        Blocktermine mit festem Datum bleiben bestehen.</p>
      ${freiListe}
    </section>

    <section class="karte">
      <h3>Daten</h3>
      <p class="hilfe">Alle Daten liegen nur in diesem Browser auf diesem Gerät.</p>
      <div class="knopf-reihe">
        <button class="knopf" data-aktion="beispieldaten-laden">Beispieldaten laden</button>
        <button class="knopf gefahr" data-aktion="alles-loeschen">Alle Daten löschen</button>
      </div>
    </section>`;
}

function beschreibeVorlesungsfrei(frei) {
  if (!frei.bis || frei.bis === frei.von) return formatDatum(frei.von, { mitWochentag: true });
  return formatDatum(frei.von) + ' – ' + formatDatum(frei.bis);
}

// Einzelne Einstellung geändert (Felder im Semester-Bereich)
aktionen['einstellung'] = (werte, element) => {
  daten.einstellungen[werte.feld] = element.value;
  // Nicht neu zeichnen, damit der Fokus im nächsten Feld bleibt
  datenGeaendert(false);
};

/* ---------- Vorlesungsfreie Zeiten ---------- */

aktionen['frei-neu'] = () => oeffneFreiDialog(null);
aktionen['frei-bearbeiten'] = (werte) => oeffneFreiDialog(werte.id);

aktionen['frei-loeschen'] = (werte) => {
  const frei = daten.vorlesungsfrei.find((f) => f.id === werte.id);
  if (!confirm(`„${frei.name}“ löschen?`)) return;
  daten.vorlesungsfrei = daten.vorlesungsfrei.filter((f) => f.id !== werte.id);
  datenGeaendert();
};

function oeffneFreiDialog(id) {
  const vorhanden = id ? daten.vorlesungsfrei.find((f) => f.id === id) : null;
  const f = vorhanden || neueVorlesungsfreieZeit();

  zeigeDialog({
    titel: vorhanden ? 'Vorlesungsfreie Zeit bearbeiten' : 'Vorlesungsfreie Zeit hinzufügen',
    inhalt: `
      <label class="feld">Bezeichnung *
        <input name="name" value="${escapeHtml(f.name)}" placeholder="z. B. Weihnachtspause">
      </label>
      <div class="feldreihe">
        <label class="feld">von *
          <input type="date" name="von" value="${escapeHtml(f.von)}">
        </label>
        <label class="feld">bis <span class="gedimmt">(leer = nur ein Tag)</span>
          <input type="date" name="bis" value="${escapeHtml(f.bis)}">
        </label>
      </div>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const fehler = [];
      if (!w.name.trim()) fehler.push('Bitte eine Bezeichnung eingeben.');
      if (!w.von) fehler.push('Bitte das Anfangsdatum angeben.');
      if (w.von && w.bis && w.bis < w.von) fehler.push('Das Bis-Datum liegt vor dem Von-Datum.');
      if (fehler.length) return fehler;

      const ziel = vorhanden || f;
      Object.assign(ziel, { name: w.name.trim(), von: w.von, bis: w.bis || w.von });
      if (!vorhanden) daten.vorlesungsfrei.push(ziel);
      datenGeaendert();
      return [];
    },
  });
}

/* ---------- Datenverwaltung ---------- */

aktionen['beispieldaten-laden'] = () => {
  if (hatDaten() && !confirm('Beispieldaten laden? Deine aktuellen Daten werden dabei ersetzt.\n\nTipp: Vorher ein Backup exportieren.')) return;
  daten = normalisiereDaten(beispieldatenErzeugen());
  datenGeaendert(false);
  zeigeTab('module');
  zeigeMeldung('Beispieldaten geladen');
};

aktionen['alles-loeschen'] = () => {
  if (!confirm('Wirklich ALLE Daten (Module, Zeiten, Favoriten, Einstellungen) löschen?')) return;
  daten = leereDaten();
  datenGeaendert();
  zeigeMeldung('Alle Daten gelöscht');
};
