/* =====================================================================
   ui-varianten.js – Tab "Varianten": Einstellungen für die Suche,
   Liste der besten Varianten und Detailansicht mit Wochenraster.
   ===================================================================== */

'use strict';

let variantenErgebnis = null; // letztes Ergebnis von berechneVarianten()
let variantenVeraltet = true; // true = Daten haben sich geändert → neu rechnen
let gewaehlteVariante = 0; // Nummer in der Liste
let gewaehlteWoche = 'regel'; // 'regel' oder Tagnummer eines Montags
let steuerungOffen = window.matchMedia('(min-width: 700px)').matches;
let rechenZeitgeber = null;

// Zeigt den Tab. Haben sich die Daten geändert, wird zuerst neu gerechnet.
// Die Rechnung startet minimal verzögert, damit der Browser vorher noch
// den Hinweis "Berechne …" anzeigen kann (bei vielen Kombinationen kann
// sie bis zu ZEITBUDGET_MS dauern).
function zeigeVariantenTab() {
  const bereich = $('#tab-varianten');
  if (!variantenVeraltet && variantenErgebnis) {
    zeichneVariantenTab();
    return;
  }
  variantenVeraltet = false;
  bereich.classList.add('rechnet');
  if (!bereich.innerHTML.trim()) bereich.innerHTML = '<div class="leer-zustand"><p>Berechne Varianten …</p></div>';
  clearTimeout(rechenZeitgeber);
  rechenZeitgeber = setTimeout(() => {
    const vorherSchluessel = aktuelleVariante() ? variantenSchluessel(aktuelleVariante()) : null;
    variantenErgebnis = berechneVarianten();
    // Möglichst dieselbe Variante wie vorher ausgewählt lassen
    const neu = variantenErgebnis.varianten.findIndex((v) => variantenSchluessel(v) === vorherSchluessel);
    gewaehlteVariante = neu >= 0 ? neu : 0;
    bereich.classList.remove('rechnet');
    zeichneVariantenTab();
  }, 20);
}

function zeichneVariantenTab() {
  const bereich = $('#tab-varianten');
  const erg = variantenErgebnis;
  const e = daten.einstellungen;

  let untertitel;
  if (daten.module.length === 0) {
    untertitel = 'Noch keine Module angelegt.';
  } else if (erg.anzahl === 0) {
    untertitel = 'Keine passende Variante gefunden.';
  } else {
    // Wurden Kombinationen mit zu vielen ECTS übersprungen, gibt es "mindestens" so viele
    untertitel = (erg.uebersprungen || erg.abgebrochen ? 'Mindestens ' : '') +
      `${erg.anzahl.toLocaleString('de-DE')} ${erg.anzahl === 1 ? 'Variante' : 'Varianten'} ohne Überschneidung` +
      (e.nurZielErreicht ? ` mit mind. ${formatZahl(erg.ziel)} ECTS` : '') +
      (erg.anzahl > erg.varianten.length ? ` – die besten ${erg.varianten.length} werden angezeigt` : '') + '.';
  }

  let html = `
    <div class="bereich-kopf">
      <div>
        <h2>Varianten</h2>
        <p class="untertitel">${untertitel}</p>
      </div>
    </div>
    ${steuerungHtml()}
    ${daten.module.length ? diagnoseHtml(erg) : ''}`;

  if (erg.abgebrochen) {
    html += `<div class="hinweis">Die Suche wurde nach ${formatZahl(ZEITBUDGET_MS / 1000)} Sekunden abgebrochen,
      weil es sehr viele Kombinationen gibt. Die angezeigten Varianten sind gut, aber evtl. nicht die allerbesten.
      Tipp: Nicht gewünschte Gruppen oder Module deaktivieren.</div>`;
  }

  if (erg.varianten.length === 0) {
    html += `<div class="leer-zustand"><p>${daten.module.length === 0
      ? 'Lege zuerst unter <a href="#module">Module</a> deine Module an – oder lade unter Einstellungen die Beispieldaten.'
      : 'Mit den aktuellen Einstellungen gibt es keine Variante. Die Hinweise oben nennen den Grund.'}</p></div>`;
  } else {
    html += `
      <div class="varianten-layout">
        <div class="varianten-liste" role="list">${erg.varianten.map(variantenEintragHtml).join('')}</div>
        <div class="varianten-detail">${variantenDetailHtml()}</div>
      </div>`;
  }

  bereich.innerHTML = html;
  const steuerung = $('.steuerung', bereich);
  steuerung.addEventListener('toggle', () => { steuerungOffen = steuerung.open; });
}

function aktuelleVariante() {
  return variantenErgebnis ? variantenErgebnis.varianten[gewaehlteVariante] || null : null;
}

// Eindeutiger Schlüssel einer Variante (gewählte Optionen + Module)
function variantenSchluessel(variante) {
  return variantenSchluesselAus(
    variante.module.map((m) => m.id),
    variante.optionen.map((nr) => variantenErgebnis.optionen[nr].option.id),
  );
}

// Gibt es diese Variante schon als Favorit?
function findeFavoritZu(variante) {
  const schluessel = variantenSchluessel(variante);
  return daten.favoriten.find((f) => variantenSchluesselAus(f.modulIds, Object.values(f.auswahl)) === schluessel) || null;
}

// Die OptionInfos einer Variante (für Raster und Liste)
function optionInfosVon(variante) {
  return variante.optionen.map((nr) => variantenErgebnis.optionen[nr]);
}

/* ---------- Steuerung: Ziel, Anzahl, Prioritäten, Schalter ---------- */

function steuerungHtml() {
  const e = daten.einstellungen;
  const prioritaeten = e.prioritaeten.map((p, i) => `
    <li class="${p.aktiv ? '' : 'inaktiv'}">
      <label class="auswahl">
        <input type="checkbox" data-aktion="prio-aktiv" data-index="${i}"${p.aktiv ? ' checked' : ''}>
        <span>${i + 1}. ${escapeHtml(PRIORITAETEN[p.schluessel])}</span>
      </label>
      <span class="prio-knoepfe">
        <button class="knopf-icon" data-aktion="prio-hoch" data-index="${i}" aria-label="nach oben"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="knopf-icon" data-aktion="prio-runter" data-index="${i}" aria-label="nach unten"${i === e.prioritaeten.length - 1 ? ' disabled' : ''}>↓</button>
      </span>
    </li>`).join('');

  const schalter = daten.module.map((modul) => `
    <li class="${modul.aktiv ? '' : 'inaktiv'}">
      <div class="zeile">
        ${schalterHtml('modul-aktiv', modul.id, modul.aktiv, 'Modul aktiv')}
        <span class="farbpunkt" style="background:${escapeHtml(modul.farbe)}"></span>
        <strong>${escapeHtml(modul.name)}</strong>
        <span class="gedimmt klein">${modul.pflicht ? 'Pflicht' : 'Wahl'} · ${formatZahl(modul.ects)} ECTS</span>
      </div>
      ${modul.veranstaltungen.length ? `<div class="va-schalter">${modul.veranstaltungen.map((v) => `
        <span class="${v.aktiv ? '' : 'inaktiv'}">${schalterHtml('veranstaltung-aktiv', v.id, v.aktiv, veranstaltungName(v) + ' aktiv')}
        ${escapeHtml(veranstaltungName(v))}</span>`).join('')}</div>` : ''}
    </li>`).join('');

  return `
    <details class="karte steuerung"${steuerungOffen ? ' open' : ''}>
      <summary>Ziel, Sortierung und Auswahl</summary>
      <div class="steuerung-inhalt">
        <div>
          <h4>ECTS</h4>
          <div class="feldreihe">
            <label class="feld schmal">Zielzahl
              <input type="number" min="0" step="1" inputmode="numeric" data-aktion="varianten-zahl" data-feld="ectsZiel" value="${escapeHtml(e.ectsZiel)}">
            </label>
            <label class="feld schmal">Anzahl anzeigen
              <select data-aktion="varianten-zahl" data-feld="maxVarianten">${optionenHtml([5, 10, 20, 50, 100].map((n) => [n, n]), e.maxVarianten)}</select>
            </label>
          </div>
          <label class="auswahl"><input type="checkbox" data-aktion="varianten-schalter" data-feld="nurZielErreicht"${e.nurZielErreicht ? ' checked' : ''}>
            nur Varianten, die das Ziel erreichen</label>
        </div>
        <div>
          <h4>Sortierung (wichtigstes zuerst)</h4>
          <ol class="prio-liste">${prioritaeten}</ol>
        </div>
        <div class="steuerung-breit">
          <details>
            <summary>Module &amp; Lehrveranstaltungen an/aus</summary>
            <ul class="schalter-liste">${schalter || '<li class="gedimmt">Keine Module.</li>'}</ul>
          </details>
        </div>
      </div>
    </details>`;
}

aktionen['varianten-zahl'] = (werte, element) => {
  daten.einstellungen[werte.feld] = Math.max(0, leseZahl(element.value, 0));
  datenGeaendert();
};

aktionen['varianten-schalter'] = (werte, element) => {
  daten.einstellungen[werte.feld] = element.checked;
  datenGeaendert();
};

aktionen['prio-aktiv'] = (werte, element) => {
  daten.einstellungen.prioritaeten[Number(werte.index)].aktiv = element.checked;
  datenGeaendert();
};

aktionen['prio-hoch'] = (werte) => verschiebePrioritaet(Number(werte.index), -1);
aktionen['prio-runter'] = (werte) => verschiebePrioritaet(Number(werte.index), +1);

function verschiebePrioritaet(index, richtung) {
  const liste = daten.einstellungen.prioritaeten;
  const ziel = index + richtung;
  if (ziel < 0 || ziel >= liste.length) return;
  [liste[index], liste[ziel]] = [liste[ziel], liste[index]];
  datenGeaendert();
}

/* ---------- Hinweise ("Warum fehlt etwas?") ---------- */

function diagnoseHtml(erg) {
  const fehler = erg.diagnose.filter((d) => d.art === 'fehler');
  const infos = erg.diagnose.filter((d) => d.art === 'info');
  let html = '';
  if (fehler.length) {
    html += '<div class="hinweis"><strong>Warum keine Variante?</strong><ul>' +
      fehler.map((d) => `<li>${escapeHtml(d.text)}</li>`).join('') + '</ul></div>';
  }
  if (infos.length) {
    html += `<details class="hinweis info"><summary>${infos.length} ${infos.length === 1 ? 'Termin wurde' : 'Termine wurden'} ausgeschlossen</summary><ul>` +
      infos.map((d) => `<li>${escapeHtml(d.text)}</li>`).join('') + '</ul></details>';
  }
  return html;
}

/* ---------- Liste und Detailansicht ---------- */

function kennzahlenKurz(variante) {
  const k = variante.kennzahlen;
  return `${formatZahl(variante.ects)} ECTS · Ø ${formatZahl(k.tageProWoche)} Tage · ` +
    `Ø ${formatZahl(k.freistundenProWoche)} h frei` + (k.beginn !== null ? ` · Ø ab ${minutenZuZeit(Math.round(k.beginn))}` : '');
}

function variantenEintragHtml(variante, index) {
  return `
    <button class="varianten-eintrag${index === gewaehlteVariante ? ' aktiv' : ''}" role="listitem"
            data-aktion="variante-waehlen" data-index="${index}">
      <span class="varianten-nr">Variante ${index + 1}${findeFavoritZu(variante) ? ' <span class="stern" title="Favorit">★</span>' : ''}</span>
      <span class="farbpunkte">${variante.module.map((m) => `<span class="farbpunkt" style="background:${escapeHtml(m.farbe)}" title="${escapeHtml(m.name)}"></span>`).join('')}</span>
      <span class="klein gedimmt">${kennzahlenKurz(variante)}</span>
    </button>`;
}

function variantenDetailHtml() {
  const variante = aktuelleVariante();
  const erg = variantenErgebnis;
  const infos = optionInfosVon(variante);
  const k = variante.kennzahlen;
  const ziel = erg.ziel;

  // Auswahl auf dem Handy: Vor/Zurück + Auswahlbox statt langer Liste
  const mobilAuswahl = `
    <div class="mobil-auswahl">
      <button class="knopf" data-aktion="variante-blaettern" data-richtung="-1" aria-label="vorherige Variante"${gewaehlteVariante === 0 ? ' disabled' : ''}>‹</button>
      <select data-aktion="variante-auswahlbox" aria-label="Variante wählen">
        ${optionenHtml(erg.varianten.map((v, i) => [i, `Variante ${i + 1} – ${kennzahlenKurz(v)}`]), gewaehlteVariante)}
      </select>
      <button class="knopf" data-aktion="variante-blaettern" data-richtung="1" aria-label="nächste Variante"${gewaehlteVariante === erg.varianten.length - 1 ? ' disabled' : ''}>›</button>
    </div>`;

  // Wochen-Auswahl; falls die gemerkte Woche nicht mehr existiert → Regelwoche
  const wochen = wochenAuswahl(infos);
  if (!wochen.some(([wert]) => wert === String(gewaehlteWoche))) gewaehlteWoche = 'regel';

  const favorit = findeFavoritZu(variante);
  return `
    ${mobilAuswahl}
    <div class="karte">
      <div class="detail-kopf">
        <h3>Variante ${gewaehlteVariante + 1}${favorit ? ' <span class="stern" title="Favorit">★</span>' : ''}</h3>
        <div class="knopf-reihe">
          ${favorit
            ? `<button class="knopf" data-aktion="tab-favoriten">★ Favorit „${escapeHtml(favorit.name)}“</button>`
            : '<button class="knopf" data-aktion="favorit-speichern">☆ Als Favorit speichern</button>'}
          <button class="knopf" data-aktion="variante-ics">📅 Kalender-Export (.ics)</button>
        </div>
      </div>
      ${kennzahlenHtml(variante.ects, ziel, k)}
      <label class="feld wochen-wahl">Ansicht
        <select data-aktion="woche-waehlen">${optionenHtml(wochen, String(gewaehlteWoche))}</select>
      </label>
      ${wochenansichtHtml(infos, gewaehlteWoche)}
      ${belegungHtml(variante.module, infos)}
    </div>`;
}

// Kacheln mit den wichtigsten Kennzahlen
function kennzahlenHtml(ects, ziel, k) {
  const zielErreicht = ects >= ziel;
  return `
    <div class="kennzahlen">
      <div class="kachel ${zielErreicht ? 'gut' : 'schlecht'}"><span class="wert">${formatZahl(ects)}</span><span class="name">ECTS (Ziel ${formatZahl(ziel)})</span></div>
      <div class="kachel"><span class="wert">${formatZahl(k.tageProWoche)}</span><span class="name">Ø Uni-Tage/Woche</span></div>
      <div class="kachel"><span class="wert">${formatZahl(k.freistundenProWoche)} h</span><span class="name">Ø Freistunden/Woche</span></div>
      <div class="kachel"><span class="wert">${k.beginn !== null ? minutenZuZeit(Math.round(k.beginn)) : '–'}</span>
        <span class="name">Ø Beginn${k.fruehesterBeginn !== null ? ' (frühester ' + minutenZuZeit(k.fruehesterBeginn) + ')' : ''}</span></div>
    </div>`;
}

// Liste der belegten Module/Veranstaltungen und der nicht belegten Wahlmodule
function belegungHtml(module, infos) {
  const belegt = module.map((modul) => {
    const zeilen = infos.filter((info) => info.modul === modul).map((info) => `
      <li>${escapeHtml(veranstaltungName(info.veranstaltung))}${info.option.name ? ' <strong>' + escapeHtml(info.option.name) + '</strong>' : ''}:
        ${info.option.termine.map((t) => escapeHtml(beschreibeTermin(t))).join('; ')}</li>`).join('');
    return `
      <li class="belegung-modul">
        <span class="farbpunkt" style="background:${escapeHtml(modul.farbe)}"></span>
        <div><strong>${escapeHtml(modul.name)}</strong> <span class="gedimmt klein">${formatZahl(modul.ects)} ECTS${modul.pflicht ? ' · Pflicht' : ''}</span>
          ${zeilen ? `<ul>${zeilen}</ul>` : '<p class="klein gedimmt">ohne feste Termine</p>'}</div>
      </li>`;
  }).join('');

  const nichtBelegt = daten.module.filter((m) => m.aktiv && !m.pflicht && !module.includes(m));
  return `
    <h4 class="unterueberschrift">Belegt</h4>
    <ul class="belegung">${belegt}</ul>
    ${nichtBelegt.length ? `<p class="klein gedimmt">Nicht belegt: ${nichtBelegt.map((m) => escapeHtml(m.name)).join(', ')}</p>` : ''}`;
}

aktionen['variante-waehlen'] = (werte) => {
  gewaehlteVariante = Number(werte.index);
  zeichneVariantenTab();
  // Auf schmalen Bildschirmen zur Detailansicht scrollen
  if (!window.matchMedia('(min-width: 900px)').matches) $('.varianten-detail').scrollIntoView({ behavior: 'smooth' });
};

aktionen['variante-auswahlbox'] = (werte, element) => {
  gewaehlteVariante = Number(element.value);
  zeichneVariantenTab();
};

aktionen['variante-blaettern'] = (werte) => {
  const anzahl = variantenErgebnis.varianten.length;
  gewaehlteVariante = Math.min(anzahl - 1, Math.max(0, gewaehlteVariante + Number(werte.richtung)));
  zeichneVariantenTab();
};

aktionen['woche-waehlen'] = (werte, element) => {
  gewaehlteWoche = element.value;
  zeichneVariantenTab();
};

/* ---------- Favorit speichern & Kalender-Export ---------- */

aktionen['favorit-speichern'] = () => {
  const variante = aktuelleVariante();
  const vorschlag = `Variante ${gewaehlteVariante + 1} (${formatZahl(variante.ects)} ECTS, Ø ${formatZahl(variante.kennzahlen.tageProWoche)} Tage)`;
  zeigeDialog({
    titel: 'Als Favorit speichern',
    speichernText: 'Speichern',
    inhalt: `
      <label class="feld">Name
        <input name="name" value="${escapeHtml(vorschlag)}" maxlength="80">
      </label>
      <p class="hilfe">Favoriten findest du im Tab „Favoriten“ – dort kannst du sie nebeneinander vergleichen.</p>`,
    beimSpeichern(formular) {
      const name = formularWerte(formular).name.trim() || vorschlag;
      const auswahl = {};
      for (const info of optionInfosVon(variante)) auswahl[info.veranstaltung.id] = info.option.id;
      daten.favoriten.push({
        id: neueId('fav'),
        name,
        gespeichertAm: new Date().toISOString(),
        modulIds: variante.module.map((m) => m.id),
        auswahl,
      });
      // Neu gespeicherter Favorit ist im Vergleich gleich ausgewählt (wenn noch Platz ist)
      if (vergleichAuswahl.size < MAX_VERGLEICH) vergleichAuswahl.add(daten.favoriten[daten.favoriten.length - 1].id);
      datenSpeichern(); // Varianten bleiben gleich → nicht neu berechnen
      zeichneVariantenTab();
      zeigeMeldung('Als Favorit gespeichert');
      return [];
    },
  });
};

aktionen['tab-favoriten'] = () => zeigeTab('favoriten');

aktionen['variante-ics'] = () => {
  const variante = aktuelleVariante();
  const name = (daten.einstellungen.semesterName || 'Stundenplan') + ' – Variante ' + (gewaehlteVariante + 1);
  exportiereIcs(optionInfosVon(variante), name);
  zeigeMeldung('Kalenderdatei erstellt');
};
