/* =====================================================================
   ui-zeiten.js – Tab "Geblockte Zeiten": feste Verpflichtungen wie
   Arbeit oder Sport, die in keiner Variante überschnitten werden dürfen
   (inklusive Pufferzeit davor und danach, z. B. für den Weg).
   ===================================================================== */

'use strict';

function zeigeGeblockteZeiten() {
  const bereich = $('#tab-zeiten');
  const liste = daten.geblockteZeiten;

  let html = `
    <div class="bereich-kopf">
      <div>
        <h2>Geblockte Zeiten</h2>
        <p class="untertitel">Zeiten, in denen keine Lehrveranstaltung liegen darf – z. B. Arbeit, Pendeln, Sport.</p>
      </div>
      <button class="knopf primaer" data-aktion="block-neu">+ Geblockte Zeit</button>
    </div>`;

  if (liste.length === 0) {
    html += '<div class="leer-zustand"><p>Noch keine geblockten Zeiten.</p></div>';
  } else {
    html += '<div class="karten-liste">' + liste.map((block) => `
      <article class="karte block-karte${block.aktiv ? '' : ' inaktiv'}">
        <div class="karte-kopf">
          ${schalterHtml('block-aktiv', block.id, block.aktiv, 'Geblockte Zeit aktiv')}
          <h3 class="karte-titel">${escapeHtml(block.name)}</h3>
        </div>
        <p class="termine-text">${escapeHtml(beschreibeGeblockteZeit(block))}</p>
        <div class="karte-aktionen">
          <button class="knopf klein" data-aktion="block-bearbeiten" data-id="${block.id}">Bearbeiten</button>
          <button class="knopf klein gefahr" data-aktion="block-loeschen" data-id="${block.id}">Löschen</button>
        </div>
      </article>`).join('') + '</div>';
  }
  bereich.innerHTML = html;
}

function findeGeblockteZeit(id) {
  return daten.geblockteZeiten.find((block) => block.id === id);
}

aktionen['block-aktiv'] = (werte, element) => {
  findeGeblockteZeit(werte.id).aktiv = element.checked;
  datenGeaendert();
};

aktionen['block-loeschen'] = (werte) => {
  const block = findeGeblockteZeit(werte.id);
  if (!confirm(`Geblockte Zeit „${block.name}“ löschen?`)) return;
  daten.geblockteZeiten = daten.geblockteZeiten.filter((b) => b.id !== werte.id);
  datenGeaendert();
};

aktionen['block-neu'] = () => oeffneBlockDialog(null);
aktionen['block-bearbeiten'] = (werte) => oeffneBlockDialog(werte.id);

function oeffneBlockDialog(id) {
  const vorhanden = id ? findeGeblockteZeit(id) : null;
  const b = vorhanden || neueGeblockteZeit();

  const dialog = zeigeDialog({
    titel: vorhanden ? 'Geblockte Zeit bearbeiten' : 'Neue geblockte Zeit',
    inhalt: `
      <label class="feld">Bezeichnung *
        <input name="name" value="${escapeHtml(b.name)}" placeholder="z. B. Nebenjob">
      </label>
      <fieldset class="feld">
        <legend>Wann?</legend>
        <label class="auswahl"><input type="radio" name="art" value="woechentlich"${b.art === 'woechentlich' ? ' checked' : ''}> Jede Woche am selben Tag</label>
        <label class="auswahl"><input type="radio" name="art" value="zeitraum"${b.art === 'zeitraum' ? ' checked' : ''}> An bestimmten Tagen (einzelner Tag oder Zeitraum)</label>
      </fieldset>

      <div data-zeige-bei="woechentlich">
        <label class="feld">Wochentag
          <select name="wochentag">${optionenHtml(WOCHENTAGE.map((tag, i) => [i + 1, tag]), b.wochentag)}</select>
        </label>
        <div class="feldreihe">
          <label class="feld">gilt ab <span class="gedimmt">(optional)</span>
            <input type="date" name="gueltigAb" value="${b.art === 'woechentlich' ? escapeHtml(b.datumVon) : ''}">
          </label>
          <label class="feld">gilt bis <span class="gedimmt">(optional)</span>
            <input type="date" name="gueltigBis" value="${b.art === 'woechentlich' ? escapeHtml(b.datumBis) : ''}">
          </label>
        </div>
      </div>

      <div data-zeige-bei="zeitraum" class="feldreihe">
        <label class="feld">von (Datum) *
          <input type="date" name="datumVon" value="${b.art === 'zeitraum' ? escapeHtml(b.datumVon) : ''}">
        </label>
        <label class="feld">bis (Datum) <span class="gedimmt">(leer = nur ein Tag)</span>
          <input type="date" name="datumBis" value="${b.art === 'zeitraum' ? escapeHtml(b.datumBis) : ''}">
        </label>
      </div>

      <label class="auswahl"><input type="checkbox" name="ganztags"${b.ganztags ? ' checked' : ''}> ganztägig</label>

      <div data-zeige-bei="zeitfenster">
        <div class="feldreihe">
          <label class="feld schmal">von
            <input type="time" name="von" value="${escapeHtml(b.von)}">
          </label>
          <label class="feld schmal">bis
            <input type="time" name="bis" value="${escapeHtml(b.bis)}">
          </label>
          <label class="feld schmal">Puffer davor (min)
            <input type="number" name="pufferVor" min="0" step="5" inputmode="numeric" value="${escapeHtml(b.pufferVor)}">
          </label>
          <label class="feld schmal">Puffer danach (min)
            <input type="number" name="pufferNach" min="0" step="5" inputmode="numeric" value="${escapeHtml(b.pufferNach)}">
          </label>
        </div>
        <p class="hilfe">Der Puffer hält zusätzlich Zeit frei, z. B. für den Weg zwischen Uni und Arbeit.</p>
      </div>`,
    beimSpeichern(formular) {
      const w = formularWerte(formular);
      const fehler = [];
      if (!w.name.trim()) fehler.push('Bitte eine Bezeichnung eingeben.');
      // Bis-Datum vor dem Von-Datum (vertipptes Jahr) → ins nächste Jahr legen
      const vonDatum = w.art === 'zeitraum' ? w.datumVon : w.gueltigAb;
      const bisEingabe = w.art === 'zeitraum' ? w.datumBis : w.gueltigBis;
      const bisDatum = korrigiereEnddatum(vonDatum, bisEingabe);
      if (w.art === 'zeitraum' && !w.datumVon) fehler.push('Bitte das Datum angeben.');
      if (vonDatum && bisDatum && bisDatum < vonDatum) {
        fehler.push(w.art === 'zeitraum' ? 'Das Bis-Datum liegt vor dem Von-Datum.' : '„gilt bis“ liegt vor „gilt ab“.');
      }
      if (!w.ganztags) {
        if (!w.von || !w.bis) fehler.push('Bitte Beginn- und Endzeit angeben.');
        else if (zeitZuMinuten(w.von) >= zeitZuMinuten(w.bis)) fehler.push('Die Endzeit muss nach der Anfangszeit liegen.');
        if (leseZahl(w.pufferVor, -1) < 0 || leseZahl(w.pufferNach, -1) < 0) fehler.push('Puffer müssen 0 oder mehr Minuten sein.');
      }
      if (fehler.length) return fehler;

      const ziel = vorhanden || b;
      Object.assign(ziel, {
        name: w.name.trim(),
        art: w.art,
        wochentag: Number(w.wochentag),
        datumVon: vonDatum,
        datumBis: w.art === 'zeitraum' ? (bisDatum || w.datumVon) : bisDatum,
        ganztags: w.ganztags,
        von: w.von,
        bis: w.bis,
        pufferVor: leseZahl(w.pufferVor, 0),
        pufferNach: leseZahl(w.pufferNach, 0),
      });
      if (!vorhanden) daten.geblockteZeiten.push(ziel);
      datenGeaendert();
      if (bisDatum !== bisEingabe) zeigeMeldung('Bis-Datum auf ' + formatDatum(bisDatum) + ' korrigiert (lag vor dem Von-Datum)');
      return [];
    },
  });

  // Je nach Auswahl nur die passenden Felder zeigen
  const aktualisiereSichtbarkeit = () => {
    const w = formularWerte($('form', dialog));
    $$('[data-zeige-bei]', dialog).forEach((bereich) => {
      const bedingung = bereich.dataset.zeigeBei;
      bereich.hidden = bedingung === 'zeitfenster' ? w.ganztags : bedingung !== w.art;
    });
  };
  $('form', dialog).addEventListener('change', aktualisiereSichtbarkeit);
  aktualisiereSichtbarkeit();
}
