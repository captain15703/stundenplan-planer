/* =====================================================================
   teilen.js – eine Variante als Link teilen.

   Ein Favorit speichert nur IDs – wer den Link bekommt, hat deine Module
   aber nicht. Deshalb steckt im Link alles, was man zum Anzeigen braucht:
   die belegten Module mit genau der gewählten Gruppe je Lehrveranstaltung,
   ihre Prüfungen, der Vorlesungszeitraum und die vorlesungsfreien Tage.
   NICHT enthalten sind Notizen, geblockte Zeiten und Favoriten.

   Ablauf: Paket (Objekt) → JSON → komprimiert (im Browser eingebaut) →
   Base64 → an die Adresse angehängt: index.html?teilen=…
   Öffnet jemand den Link, zeigt die App die Variante nur zum Ansehen an,
   mit Kalender-Export und „In meine Planung übernehmen“.
   ===================================================================== */

'use strict';

const TEILEN_KENNUNG = 'spp';
const TEILEN_PARAMETER = 'teilen';

/* ---------- Paket erstellen und lesen (ohne Oberfläche, testbar) ---------- */

// module: belegte Module, infos: gewählte Optionen (OptionInfos)
function teilPaketErstellen(name, module, infos) {
  const e = daten.einstellungen;
  const ohneLeeres = (objekt) => Object.fromEntries(Object.entries(objekt).filter(([, wert]) =>
    wert !== '' && wert !== null && wert !== undefined && !(Array.isArray(wert) && wert.length === 0)));

  return {
    a: TEILEN_KENNUNG,
    v: 1,
    n: name,
    s: ohneLeeres({ name: e.semesterName, start: e.semesterStart, ende: e.semesterEnde }),
    f: daten.vorlesungsfrei.map((frei) => ohneLeeres({ name: frei.name, von: frei.von, bis: frei.bis })),
    m: module.map((modul) => ohneLeeres({
      name: modul.name,
      nummer: modul.nummer,
      ects: modul.ects,
      dozent: modul.dozent,
      pruefungsform: modul.pruefungsform,
      link: modul.link,
      farbe: modul.farbe,
      pflicht: modul.pflicht,
      pruefungen: modul.pruefungen.map((p) => ohneLeeres({
        bezeichnung: p.bezeichnung, datum: p.datum, von: p.von, bis: p.bis, raum: p.raum, wiederholung: p.wiederholung || '',
      })),
      // Nur die gewählte Gruppe jeder Lehrveranstaltung
      veranstaltungen: infos.filter((info) => info.modul === modul).map((info) => ohneLeeres({
        typ: info.veranstaltung.typ,
        titel: info.veranstaltung.titel,
        anwesenheitOptional: info.veranstaltung.anwesenheitOptional || '',
        optionen: [ohneLeeres({
          name: info.option.name,
          termine: info.option.termine.map((t) => ohneLeeres({
            rhythmus: t.rhythmus, wochentag: t.wochentag, von: t.von, bis: t.bis, raum: t.raum,
            start: t.start, ende: t.ende, startwoche: t.rhythmus === 'zweiwoechentlich' ? t.startwoche : '',
            daten: t.rhythmus === 'block' ? t.daten : [],
          })),
        })],
      })),
    })),
  };
}

// Prüft ein Paket und macht daraus vollständige Daten (mit neuen IDs).
// Ergebnis: { name, daten, auswahl, modulIds } oder { fehler }
function teilPaketLesen(paket) {
  if (!paket || paket.a !== TEILEN_KENNUNG || !Array.isArray(paket.m)) {
    return { fehler: 'Der Link enthält keine gültige Stundenplan-Variante.' };
  }
  if (Number(paket.v) > 1) return { fehler: 'Der Link stammt aus einer neueren Version der App.' };
  const s = paket.s || {};
  const geteilt = normalisiereDaten({
    einstellungen: { semesterName: s.name || '', semesterStart: s.start || '', semesterEnde: s.ende || '', ectsZiel: 0 },
    module: paket.m.map((modul) => ({ ...modul, id: undefined, notizen: '' })),
    vorlesungsfrei: liste(paket.f),
  });
  // normalisiereDaten übernimmt fehlende IDs nicht automatisch → hier vergeben
  for (const modul of geteilt.module) {
    if (!modul.id) modul.id = neueId('modul');
    for (const pruefung of modul.pruefungen) if (!pruefung.id) pruefung.id = neueId('pruefung');
    for (const veranstaltung of modul.veranstaltungen) {
      if (!veranstaltung.id) veranstaltung.id = neueId('va');
      for (const option of veranstaltung.optionen) {
        if (!option.id) option.id = neueId('opt');
        for (const termin of option.termine) if (!termin.id) termin.id = neueId('termin');
      }
    }
  }
  for (const frei of geteilt.vorlesungsfrei) if (!frei.id) frei.id = neueId('frei');

  const auswahl = {};
  for (const modul of geteilt.module) {
    for (const veranstaltung of modul.veranstaltungen) {
      if (veranstaltung.optionen[0]) auswahl[veranstaltung.id] = veranstaltung.optionen[0].id;
    }
  }
  return {
    name: String(paket.n || 'Geteilte Variante'),
    daten: geteilt,
    auswahl,
    modulIds: geteilt.module.map((m) => m.id),
  };
}

/* ---------- Kodieren: Objekt ↔ Text für die Adresse ----------
   "z…" = komprimiert, "j…" = unkomprimiert (für Browser ohne CompressionStream)
   ------------------------------------------------------------------ */

function bytesZuBase64Url(bytes) {
  let binaer = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binaer += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binaer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlZuBytes(text) {
  const binaer = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binaer, (zeichen) => zeichen.charCodeAt(0));
}

async function durchStrom(bytes, strom) {
  const antwort = new Response(new Blob([bytes]).stream().pipeThrough(strom));
  return new Uint8Array(await antwort.arrayBuffer());
}

async function kodiereTeilPaket(paket) {
  const bytes = new TextEncoder().encode(JSON.stringify(paket));
  if (typeof CompressionStream === 'function') {
    return 'z' + bytesZuBase64Url(await durchStrom(bytes, new CompressionStream('deflate-raw')));
  }
  return 'j' + bytesZuBase64Url(bytes);
}

async function dekodiereTeilPaket(text) {
  try {
    let bytes = base64UrlZuBytes(text.slice(1));
    if (text[0] === 'z') bytes = await durchStrom(bytes, new DecompressionStream('deflate-raw'));
    else if (text[0] !== 'j') return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (fehler) {
    return null;
  }
}

// Vollständiger Link zur App mit dem Paket
async function teilLink(paket) {
  const basis = location.href.split('#')[0].split('?')[0];
  return basis + '?' + TEILEN_PARAMETER + '=' + await kodiereTeilPaket(paket);
}

/* ---------- Link erzeugen und weitergeben ---------- */

async function teileVariante(name, module, infos) {
  let link;
  try {
    link = await teilLink(teilPaketErstellen(name, module, infos));
  } catch (fehler) {
    alert('Der Link konnte nicht erstellt werden.');
    return;
  }
  // Am Handy: das Teilen-Menü des Systems (WhatsApp, Mail …)
  if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: name, text: 'Mein Stundenplan: ' + name, url: link });
      return;
    } catch (fehler) {
      if (fehler && fehler.name === 'AbortError') return; // abgebrochen
    }
  }
  zeigeDialog({
    titel: 'Variante teilen',
    speichernText: 'Link kopieren',
    inhalt: `
      <label class="feld">Link
        <input name="link" value="${escapeHtml(link)}" readonly>
      </label>
      <p class="hilfe">Wer den Link öffnet, sieht diese Variante mit Wochenraster und Prüfungsplan und kann sie als
        Kalender exportieren oder in die eigene Planung übernehmen. Enthalten sind die belegten Module mit den gewählten
        Gruppen, Prüfungen und der Vorlesungszeitraum – keine Notizen, geblockten Zeiten oder Favoriten.
        Der Link ist ${link.length.toLocaleString('de-DE')} Zeichen lang.</p>`,
    beimSpeichern(formular) {
      const feld = formular.querySelector('input[name="link"]');
      const fertig = () => zeigeMeldung('Link kopiert');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(fertig, () => { feld.select(); document.execCommand('copy'); fertig(); });
      } else {
        feld.select();
        document.execCommand('copy');
        fertig();
      }
      return [];
    },
  });
  const feld = $('#dialog input[name="link"]');
  if (feld) { feld.focus(); feld.select(); }
}

aktionen['variante-teilen'] = () => {
  const variante = aktuelleVariante();
  teileVariante('Variante ' + (gewaehlteVariante + 1), variante.module, optionInfosVon(variante));
};

aktionen['favorit-teilen'] = (werte) => {
  const favorit = findeFavorit(werte.id);
  const a = varianteAusAuswahl(favorit.modulIds, favorit.auswahl);
  teileVariante(favorit.name, a.module, a.infos);
};

/* ---------- Geteilte Variante ansehen ----------
   Die Anzeige-Funktionen lesen die globalen "daten". Für die geteilte
   Variante werden sie kurz gegen die geteilten Daten getauscht.
   ------------------------------------------------------------------ */

let geteilteVariante = null; // Ergebnis von teilPaketLesen()
let geteilteWoche = 'regel';

function mitGeteiltenDaten(funktion) {
  const eigene = daten;
  daten = geteilteVariante.daten;
  try {
    return funktion();
  } finally {
    daten = eigene;
  }
}

// Beim Start: Steht ein geteilter Link in der Adresse? Dann anzeigen.
async function pruefeGeteiltenLink() {
  const text = new URLSearchParams(location.search).get(TEILEN_PARAMETER);
  if (!text) return false;
  const paket = await dekodiereTeilPaket(text);
  const ergebnis = teilPaketLesen(paket);
  if (ergebnis.fehler) {
    zeigeMeldung(ergebnis.fehler);
    schliesseGeteilteAnsicht();
    return false;
  }
  geteilteVariante = ergebnis;
  zeigeGeteilteAnsicht();
  return true;
}

function zeigeGeteilteAnsicht() {
  document.body.classList.add('geteilt-modus');
  const bereich = $('#geteilt');
  bereich.hidden = false;
  bereich.innerHTML = mitGeteiltenDaten(() => {
    const a = varianteAusAuswahl(geteilteVariante.modulIds, geteilteVariante.auswahl);
    const e = daten.einstellungen;
    const wochen = wochenAuswahl(a.infos, a.module);
    if (!wochen.some(([wert]) => wert === String(geteilteWoche))) geteilteWoche = 'regel';
    const zeitraum = e.semesterStart && e.semesterEnde ? formatDatum(e.semesterStart) + ' – ' + formatDatum(e.semesterEnde) : '';
    return `
      <div class="bereich-kopf">
        <div>
          <p class="gedimmt klein">Geteilte Variante – nur zum Ansehen</p>
          <h2>${escapeHtml(geteilteVariante.name)}</h2>
          <p class="untertitel">${[e.semesterName, zeitraum].filter(Boolean).map(escapeHtml).join(' · ')}</p>
        </div>
      </div>
      <div class="karte">
        <div class="knopf-reihe">
          <button class="knopf primaer" data-aktion="geteilt-uebernehmen">In meine Planung übernehmen</button>
          <button class="knopf" data-aktion="geteilt-ics">📅 Kalender-Export (.ics)</button>
          <button class="knopf" data-aktion="geteilt-schliessen">Zu meiner Planung</button>
        </div>
        <p class="hilfe">„Übernehmen“ fügt die Module als neue Module hinzu und speichert die Variante als Favorit.
          Deine vorhandenen Daten bleiben unverändert.</p>
        ${kennzahlenHtml(a.ects, null, a.kennzahlen)}
        ${optionalHinweisHtml(a.infos)}
        <label class="feld wochen-wahl">Ansicht
          <select data-aktion="geteilt-woche">${optionenHtml(wochen, String(geteilteWoche))}</select>
        </label>
        ${wochenansichtHtml(a.infos, geteilteWoche, a.module)}
        <h4 class="unterueberschrift">Prüfungen</h4>
        ${pruefungsplanHtml(a.module)}
        ${belegungHtml(a.module, a.infos)}
      </div>`;
  });
}

function schliesseGeteilteAnsicht() {
  geteilteVariante = null;
  document.body.classList.remove('geteilt-modus');
  const bereich = $('#geteilt');
  if (bereich) { bereich.hidden = true; bereich.innerHTML = ''; }
  // Link aus der Adresse entfernen, damit ein Neuladen die eigene Planung zeigt
  history.replaceState(null, '', location.pathname + '#' + aktiverTab);
}

aktionen['geteilt-woche'] = (werte, element) => {
  geteilteWoche = element.value;
  zeigeGeteilteAnsicht();
};

aktionen['geteilt-ics'] = () => {
  mitGeteiltenDaten(() => {
    const a = varianteAusAuswahl(geteilteVariante.modulIds, geteilteVariante.auswahl);
    exportiereIcs(a.infos, geteilteVariante.name, a.module);
  });
  zeigeMeldung('Kalenderdatei erstellt');
};

aktionen['geteilt-schliessen'] = () => {
  schliesseGeteilteAnsicht();
  zeigeTab(aktiverTab);
};

// Übernimmt die geteilten Module in die eigenen Daten (mit neuen IDs) und
// legt die Variante als Favorit an. Liefert eine Beschreibung des Ergebnisses.
function uebernimmGeteilteVariante(geteilt) {
  const quelle = geteilt.daten;
  const e = daten.einstellungen;
  const meldungen = [];

  // Semester nur übernehmen, wenn noch keins eingetragen ist
  if (!e.semesterStart && !e.semesterEnde && quelle.einstellungen.semesterStart) {
    e.semesterStart = quelle.einstellungen.semesterStart;
    e.semesterEnde = quelle.einstellungen.semesterEnde;
    if (!e.semesterName) e.semesterName = quelle.einstellungen.semesterName;
    meldungen.push('Vorlesungszeitraum übernommen');
  }
  // Vorlesungsfreie Zeiten ergänzen, die es noch nicht gibt
  for (const frei of quelle.vorlesungsfrei) {
    if (!daten.vorlesungsfrei.some((f) => f.von === frei.von && f.bis === frei.bis)) {
      daten.vorlesungsfrei.push({ ...kopie(frei), id: neueId('frei') });
    }
  }

  const auswahl = {};
  const modulIds = [];
  for (const modul of quelle.module) {
    const neu = kopie(modul);
    neu.id = neueId('modul');
    neu.aktiv = true;
    neu.pruefungen.forEach((p) => { p.id = neueId('pruefung'); });
    for (const veranstaltung of neu.veranstaltungen) {
      veranstaltung.id = neueId('va');
      for (const option of veranstaltung.optionen) {
        option.id = neueId('opt');
        option.termine.forEach((t) => { t.id = neueId('termin'); });
      }
      if (veranstaltung.optionen[0]) auswahl[veranstaltung.id] = veranstaltung.optionen[0].id;
    }
    daten.module.push(neu);
    modulIds.push(neu.id);
  }
  daten.favoriten.push({
    id: neueId('fav'),
    name: geteilt.name + ' (geteilt)',
    gespeichertAm: new Date().toISOString(),
    modulIds,
    auswahl,
  });
  meldungen.unshift(quelle.module.length + (quelle.module.length === 1 ? ' Modul' : ' Module') + ' übernommen, Favorit angelegt');
  return meldungen;
}

aktionen['geteilt-uebernehmen'] = () => {
  const anzahl = geteilteVariante.daten.module.length;
  const doppelt = geteilteVariante.daten.module.filter((m) => daten.module.some((eigenes) => eigenes.name === m.name));
  const frage = `${anzahl} ${anzahl === 1 ? 'Modul' : 'Module'} in deine Planung übernehmen?` +
    (doppelt.length ? `\n\nAchtung: Du hast schon Module mit gleichem Namen (${doppelt.map((m) => m.name).join(', ')}). Sie werden zusätzlich angelegt.` : '');
  if (!confirm(frage)) return;
  const meldungen = uebernimmGeteilteVariante(geteilteVariante);
  schliesseGeteilteAnsicht();
  datenGeaendert(false);
  zeigeTab('favoriten');
  zeigeMeldung(meldungen.join('\n'));
};
