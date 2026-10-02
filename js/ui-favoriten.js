/* =====================================================================
   ui-favoriten.js – Tab "Favoriten": gespeicherte Varianten verwalten
   und bis zu drei davon nebeneinander vergleichen.

   Ein Favorit speichert nur, WELCHE Module und Gruppen gewählt sind.
   Termine, Räume usw. kommen immer aus den aktuellen Daten – Änderungen
   an einem Modul sind also automatisch auch im Favoriten sichtbar.
   ===================================================================== */

'use strict';

const MAX_VERGLEICH = 3;
const vergleichAuswahl = new Set(); // IDs der Favoriten im Vergleich
let vergleichWoche = 'regel';
let vergleichVorbelegt = false;

function zeigeFavoritenTab() {
  const bereich = $('#tab-favoriten');
  const favoriten = daten.favoriten;

  // Beim ersten Öffnen die ersten Favoriten für den Vergleich vorauswählen;
  // gelöschte Favoriten aus der Auswahl entfernen
  if (!vergleichVorbelegt) {
    for (const f of favoriten.slice(0, 2)) {
      if (vergleichAuswahl.size < MAX_VERGLEICH) vergleichAuswahl.add(f.id);
    }
    vergleichVorbelegt = true;
  }
  for (const id of [...vergleichAuswahl]) {
    if (!favoriten.some((f) => f.id === id)) vergleichAuswahl.delete(id);
  }

  let html = `
    <div class="bereich-kopf">
      <div>
        <h2>Favoriten</h2>
        <p class="untertitel">Wähle bis zu ${MAX_VERGLEICH} Favoriten aus, um sie nebeneinander zu vergleichen.</p>
      </div>
    </div>`;

  if (favoriten.length === 0) {
    bereich.innerHTML = html + `<div class="leer-zustand">
        <p>Noch keine Favoriten.</p>
        <p>Speichere im Tab <a href="#varianten">Varianten</a> eine Variante mit „☆ Als Favorit speichern“.</p>
      </div>`;
    return;
  }

  // Jeden Favoriten mit den aktuellen Daten auswerten
  const auswertungen = new Map(favoriten.map((f) => [f.id, varianteAusAuswahl(f.modulIds, f.auswahl)]));

  html += '<div class="favoriten-liste">' + favoriten.map((favorit) => {
    const a = auswertungen.get(favorit.id);
    const imVergleich = vergleichAuswahl.has(favorit.id);
    return `
      <article class="karte favorit-karte${imVergleich ? ' gewaehlt' : ''}">
        <div class="karte-kopf">
          <label class="auswahl" title="Im Vergleich anzeigen">
            <input type="checkbox" data-aktion="favorit-vergleichen" data-id="${favorit.id}"${imVergleich ? ' checked' : ''}>
          </label>
          <h3 class="karte-titel">${escapeHtml(favorit.name)}</h3>
        </div>
        <p class="farbpunkte">${a.module.map((m) => `<span class="farbpunkt" style="background:${escapeHtml(m.farbe)}" title="${escapeHtml(m.name)}"></span>`).join('')}</p>
        <p class="klein gedimmt">${formatZahl(a.ects)} ECTS · Ø ${formatZahl(a.kennzahlen.tageProWoche)} Tage · Ø ${formatZahl(a.kennzahlen.freistundenProWoche)} h frei` +
          `${a.kennzahlen.beginn !== null ? ' · Ø ab ' + minutenZuZeit(Math.round(a.kennzahlen.beginn)) : ''}<br>
          gespeichert am ${formatZeitpunkt(favorit.gespeichertAm)}</p>
        ${a.probleme.length ? `<div class="hinweis klein"><strong>Veraltet:</strong><ul>${a.probleme.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}
        <div class="karte-aktionen">
          <button class="knopf klein" data-aktion="favorit-ics" data-id="${favorit.id}">📅 .ics</button>
          <button class="knopf klein" data-aktion="favorit-umbenennen" data-id="${favorit.id}">Umbenennen</button>
          <button class="knopf klein gefahr" data-aktion="favorit-loeschen" data-id="${favorit.id}">Löschen</button>
        </div>
      </article>`;
  }).join('') + '</div>';

  // Vergleich
  const gewaehlt = favoriten.filter((f) => vergleichAuswahl.has(f.id));
  if (gewaehlt.length) {
    html += vergleichHtml(gewaehlt.map((f) => ({ favorit: f, auswertung: auswertungen.get(f.id) })));
  }
  bereich.innerHTML = html;
}

/* ---------- Vergleich nebeneinander ---------- */

function vergleichHtml(eintraege) {
  const ziel = leseZahl(daten.einstellungen.ectsZiel, 0);

  // Bester Wert je Zeile wird hervorgehoben
  const zeilen = [
    { name: 'ECTS', wert: (a) => a.ects, text: (a) => formatZahl(a.ects), besser: (x, y) => ectsAbstand(x, ziel) - ectsAbstand(y, ziel) },
    { name: 'Ø Uni-Tage/Woche', wert: (a) => a.kennzahlen.tageProWoche, text: (a) => formatZahl(a.kennzahlen.tageProWoche), besser: (x, y) => x - y },
    { name: 'Ø Freistunden/Woche', wert: (a) => a.kennzahlen.freistundenProWoche, text: (a) => formatZahl(a.kennzahlen.freistundenProWoche) + ' h', besser: (x, y) => x - y },
    { name: 'Ø Beginn', wert: (a) => a.kennzahlen.beginn ?? MINUTEN_PRO_TAG, text: (a) => a.kennzahlen.beginn !== null ? minutenZuZeit(Math.round(a.kennzahlen.beginn)) : '–', besser: (x, y) => y - x },
    { name: 'Frühester Beginn', wert: (a) => a.kennzahlen.fruehesterBeginn ?? MINUTEN_PRO_TAG, text: (a) => a.kennzahlen.fruehesterBeginn !== null ? minutenZuZeit(a.kennzahlen.fruehesterBeginn) : '–', besser: (x, y) => y - x },
  ];

  const tabelle = `
    <div class="tabelle-scroll">
      <table class="vergleich-tabelle">
        <thead><tr><th></th>${eintraege.map((e) => `<th>${escapeHtml(e.favorit.name)}</th>`).join('')}</tr></thead>
        <tbody>
          ${zeilen.map((zeile) => {
            const werte = eintraege.map((e) => zeile.wert(e.auswertung));
            const bester = werte.reduce((b, w) => (zeile.besser(w, b) < 0 ? w : b), werte[0]);
            return `<tr><th>${zeile.name}</th>${eintraege.map((e, i) =>
              `<td class="${eintraege.length > 1 && Math.abs(zeile.besser(werte[i], bester)) < 0.01 ? 'bester' : ''}">${zeile.text(e.auswertung)}</td>`).join('')}</tr>`;
          }).join('')}
          <tr><th>Module</th>${eintraege.map((e) => `<td class="klein">${e.auswertung.module.map((m) => escapeHtml(m.name)).join(', ')}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>`;

  // Gemeinsame Wochenauswahl für alle Raster
  const alleInfos = eintraege.flatMap((e) => e.auswertung.infos);
  const wochen = wochenAuswahl(alleInfos);
  if (!wochen.some(([wert]) => wert === String(vergleichWoche))) vergleichWoche = 'regel';

  return `
    <section class="karte vergleich">
      <h3>Vergleich</h3>
      ${tabelle}
      <label class="feld wochen-wahl">Ansicht
        <select data-aktion="vergleich-woche">${optionenHtml(wochen, String(vergleichWoche))}</select>
      </label>
      <div class="vergleich-raster" style="--spalten:${eintraege.length}">
        ${eintraege.map((e) => `
          <div>
            <h4 class="unterueberschrift">${escapeHtml(e.favorit.name)}</h4>
            ${wochenansichtHtml(e.auswertung.infos, vergleichWoche)}
          </div>`).join('')}
      </div>
    </section>`;
}

/* ---------- Aktionen ---------- */

function findeFavorit(id) {
  return daten.favoriten.find((f) => f.id === id);
}

aktionen['favorit-vergleichen'] = (werte, element) => {
  if (element.checked) {
    if (vergleichAuswahl.size >= MAX_VERGLEICH) {
      element.checked = false;
      zeigeMeldung(`Höchstens ${MAX_VERGLEICH} Favoriten gleichzeitig vergleichen`);
      return;
    }
    vergleichAuswahl.add(werte.id);
  } else {
    vergleichAuswahl.delete(werte.id);
  }
  zeigeFavoritenTab();
};

aktionen['vergleich-woche'] = (werte, element) => {
  vergleichWoche = element.value;
  zeigeFavoritenTab();
};

aktionen['favorit-ics'] = (werte) => {
  const favorit = findeFavorit(werte.id);
  const auswertung = varianteAusAuswahl(favorit.modulIds, favorit.auswahl);
  exportiereIcs(auswertung.infos, favorit.name);
  zeigeMeldung('Kalenderdatei erstellt');
};

aktionen['favorit-umbenennen'] = (werte) => {
  const favorit = findeFavorit(werte.id);
  zeigeDialog({
    titel: 'Favorit umbenennen',
    inhalt: `<label class="feld">Name <input name="name" value="${escapeHtml(favorit.name)}" maxlength="80"></label>`,
    beimSpeichern(formular) {
      const name = formularWerte(formular).name.trim();
      if (!name) return ['Bitte einen Namen eingeben.'];
      favorit.name = name;
      datenGeaendert();
      return [];
    },
  });
};

aktionen['favorit-loeschen'] = (werte) => {
  const favorit = findeFavorit(werte.id);
  if (!confirm(`Favorit „${favorit.name}“ löschen?`)) return;
  daten.favoriten = daten.favoriten.filter((f) => f.id !== werte.id);
  vergleichAuswahl.delete(werte.id);
  datenGeaendert();
};
