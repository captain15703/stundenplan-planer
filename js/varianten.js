/* =====================================================================
   varianten.js – berechnet alle Stundenplan-Varianten ohne
   Überschneidungen und sortiert sie nach den gewählten Prioritäten.

   So funktioniert es (vereinfacht):
   1. Jede aktive Option (z. B. "Übung Gruppe B") wird in ihre konkreten
      Vorkommen umgerechnet (siehe termine.js).
   2. Optionen, die mit einer geblockten Zeit (inkl. Puffer) kollidieren,
      werden aussortiert.
   3. Für jedes Paar von Optionen wird EINMAL geprüft, ob sie sich
      überschneiden ("Konfliktliste").
   4. Eine Suche mit Zurückgehen ("Backtracking") probiert die
      Kombinationen durch: Pflichtmodule zuerst, dann jedes Wahlmodul
      mit "nicht belegen" und "belegen". Sobald eine Wahl mit einer
      bereits gewählten Option kollidiert, wird dieser Zweig sofort
      verworfen – dadurch bleibt die Suche auch bei vielen Alternativen
      schnell. Zweige, in denen das ECTS-Ziel nicht mehr erreichbar ist
      (oder die schon zu weit darüber liegen), werden ebenfalls
      übersprungen.
   5. Nur die besten N Varianten werden behalten (N ist einstellbar).
      Gibt es extrem viele Kombinationen, endet die Suche nach einem
      Zeitbudget mit den besten bis dahin gefundenen Varianten.
   ===================================================================== */

'use strict';

const ZEITBUDGET_MS = 2500; // längste Rechenzeit, danach wird abgebrochen
const MIN_LUECKE = 15; // Lücken bis 15 Minuten zählen nicht als Freistunde
const MAX_VARIANTEN_GRENZE = 100;

/* ---------- Bausteine ---------- */

// Fasst eine Option mit allen konkreten Vorkommen zusammen
function erstelleOptionInfo(modul, veranstaltung, option, freieTage) {
  const vorkommen = [];
  for (const termin of option.termine) {
    for (const v of vorkommenVonTermin(termin, freieTage)) vorkommen.push({ ...v, termin });
  }
  vorkommen.sort((a, b) => a.tag - b.tag || a.start - b.start);
  return { modul, veranstaltung, option, vorkommen, zahlen: alsZahlen(vorkommen) };
}

/* Für die Kennzahlen müssen sehr oft alle Vorkommen einer Variante
   sortiert werden. Das geht am schnellsten, wenn jedes Vorkommen EINE
   Zahl ist: tag · 4194304 + start · 2048 + ende (2048 > 24·60 Minuten).
   Sortiert man diese Zahlen, sind die Vorkommen automatisch nach Tag
   und Uhrzeit geordnet. */
const FAKTOR_TAG = 4194304; // = 2048 · 2048
const FAKTOR_START = 2048;

function alsZahlen(vorkommen) {
  return Float64Array.from(vorkommen, (v) => v.tag * FAKTOR_TAG + v.start * FAKTOR_START + v.ende);
}

let zahlenPuffer = new Float64Array(1024); // wird wiederverwendet (spart Speicher)

// Sucht in zwei nach Datum sortierten Vorkommen-Listen die erste
// Überschneidung. Liefert { a, b } oder null.
// Direkt aneinander anschließende Termine (10–12 und 12–14) sind erlaubt.
function ersteUeberschneidung(listeA, listeB) {
  let i = 0;
  let j = 0;
  while (i < listeA.length && j < listeB.length) {
    const a = listeA[i];
    const b = listeB[j];
    if (a.tag < b.tag) { i++; continue; }
    if (b.tag < a.tag) { j++; continue; }
    if (a.start < b.ende && b.start < a.ende) return { a, b };
    // Am selben Tag: mit dem Termin weitermachen, der früher endet
    if (a.ende <= b.ende) i++; else j++;
  }
  return null;
}

// Name einer Option für Meldungen, z. B. "Forschungsmethoden – Übung (Gruppe B)"
function optionBezeichnung(info) {
  return info.modul.name + ' – ' + veranstaltungName(info.veranstaltung) +
    (info.option.name ? ' (' + info.option.name + ')' : '');
}

// Kennzahlen einer Variante, kalendergenau über das ganze Semester:
// Für jede Woche mit Terminen werden Uni-Tage und Freistunden gezählt
// und dann der Durchschnitt pro Woche gebildet.
function berechneKennzahlen(optionInfos) {
  // Alle Vorkommen (als Zahlen, siehe oben) in den Puffer kopieren und sortieren
  let anzahl = 0;
  for (const info of optionInfos) {
    const zahlen = info.zahlen || alsZahlen(info.vorkommen);
    if (anzahl + zahlen.length > zahlenPuffer.length) {
      const groesser = new Float64Array((anzahl + zahlen.length) * 2);
      groesser.set(zahlenPuffer.subarray(0, anzahl));
      zahlenPuffer = groesser;
    }
    zahlenPuffer.set(zahlen, anzahl);
    anzahl += zahlen.length;
  }
  const alle = zahlenPuffer.subarray(0, anzahl).sort();

  const wochen = new Set();
  let uniTage = 0;
  let lueckenMinuten = 0;
  let beginnSumme = 0;
  let fruehesterBeginn = null;
  let aktuellerTag = null;
  let spaetestesEnde = 0;

  for (const zahl of alle) {
    // Zahl wieder in Tag, Start und Ende zerlegen
    const tag = Math.floor(zahl / FAKTOR_TAG);
    const start = Math.floor(zahl / FAKTOR_START) % FAKTOR_START;
    const ende = zahl % FAKTOR_START;

    if (tag !== aktuellerTag) {
      // erster Termin an einem neuen Tag
      aktuellerTag = tag;
      uniTage++;
      wochen.add(montagVon(tag));
      beginnSumme += start;
      if (fruehesterBeginn === null || start < fruehesterBeginn) fruehesterBeginn = start;
      spaetestesEnde = ende;
    } else {
      // weiterer Termin am selben Tag: Lücke zum vorherigen messen
      const luecke = start - spaetestesEnde;
      if (luecke > MIN_LUECKE) lueckenMinuten += luecke;
      spaetestesEnde = Math.max(spaetestesEnde, ende);
    }
  }

  const anzahlWochen = wochen.size || 1;
  return {
    wochen: wochen.size,
    tageProWoche: uniTage / anzahlWochen,
    freistundenProWoche: lueckenMinuten / 60 / anzahlWochen,
    beginn: uniTage ? beginnSumme / uniTage : null, // Ø Beginn in Minuten
    fruehesterBeginn,
  };
}

/* ---------- Sortierung ---------- */

// Abstand zum ECTS-Ziel; wer das Ziel nicht erreicht, landet immer hinten
function ectsAbstand(ects, ziel) {
  return ects >= ziel ? ects - ziel : 1000 + (ziel - ects);
}

// Unterschiede kleiner als die Toleranz zählen als "gleich gut",
// damit das nächste Kriterium entscheiden kann.
function mitToleranz(differenz, toleranz) {
  return Math.abs(differenz) < toleranz ? 0 : Math.sign(differenz);
}

// Vergleicht zwei Varianten nach der Prioritätenliste.
// Ergebnis < 0: a ist besser, > 0: b ist besser, 0: gleich gut.
function vergleicheVarianten(a, b) {
  const e = daten.einstellungen;
  const ziel = leseZahl(e.ectsZiel, 0);
  const ka = a.kennzahlen;
  const kb = b.kennzahlen;

  for (const prioritaet of e.prioritaeten) {
    if (!prioritaet.aktiv) continue;
    let ergebnis = 0;
    switch (prioritaet.schluessel) {
      case 'ects':
        ergebnis = mitToleranz(ectsAbstand(a.ects, ziel) - ectsAbstand(b.ects, ziel), 0.01);
        break;
      case 'tage':
        ergebnis = mitToleranz(ka.tageProWoche - kb.tageProWoche, 0.05);
        break;
      case 'freistunden':
        ergebnis = mitToleranz(ka.freistundenProWoche - kb.freistundenProWoche, 0.05);
        break;
      case 'beginn': // später ist besser – deshalb b minus a
        ergebnis = mitToleranz((kb.beginn ?? MINUTEN_PRO_TAG) - (ka.beginn ?? MINUTEN_PRO_TAG), 5) ||
          mitToleranz((kb.fruehesterBeginn ?? MINUTEN_PRO_TAG) - (ka.fruehesterBeginn ?? MINUTEN_PRO_TAG), 1);
        break;
    }
    if (ergebnis !== 0) return ergebnis;
  }
  return 0;
}

/* ---------- Vorbereitung ---------- */

// Sammelt alle aktiven Module/Optionen und sortiert unmögliche aus.
function bereiteVor() {
  const freieTage = vorlesungsfreieTage();
  const diagnose = []; // { art: 'fehler' | 'info', text }

  // 1. Alle aktiven Optionen mit ihren Vorkommen
  const kandidaten = [];
  for (const modul of daten.module) {
    if (!modul.aktiv) continue;
    for (const veranstaltung of modul.veranstaltungen) {
      if (!veranstaltung.aktiv) continue;
      for (const option of veranstaltung.optionen) {
        if (!option.aktiv) continue;
        kandidaten.push(erstelleOptionInfo(modul, veranstaltung, option, freieTage));
      }
    }
  }

  // 2. Geblockte Zeiten für den gesamten Zeitraum aller Termine
  let vonTag = Infinity;
  let bisTag = -Infinity;
  for (const info of kandidaten) {
    if (info.vorkommen.length === 0) continue;
    vonTag = Math.min(vonTag, info.vorkommen[0].tag);
    bisTag = Math.max(bisTag, info.vorkommen[info.vorkommen.length - 1].tag);
  }
  let blockVorkommen = [];
  if (vonTag <= bisTag) {
    for (const block of daten.geblockteZeiten) {
      if (block.aktiv) blockVorkommen.push(...vorkommenVonGeblockterZeit(block, vonTag, bisTag));
    }
    blockVorkommen.sort((a, b) => a.tag - b.tag || a.start - b.start);
  }

  // 3. Optionen ohne Termine oder mit Kollision aussortieren
  const optionen = [];
  for (const info of kandidaten) {
    if (info.vorkommen.length === 0) {
      diagnose.push({ art: 'info', text: optionBezeichnung(info) + ': hat keine Termine im Zeitraum und wird ignoriert.' });
      continue;
    }
    const kollision = ersteUeberschneidung(info.vorkommen, blockVorkommen);
    if (kollision) {
      diagnose.push({
        art: 'info',
        text: optionBezeichnung(info) + ': kollidiert mit „' + kollision.b.block.name + '“' +
          (kollision.b.block.ganztags ? '' : ' (inkl. Puffer)') + ' am ' +
          formatDatum(kollision.a.tag, { mitWochentag: true }) + ' und ist deshalb ausgeschlossen.',
      });
      continue;
    }
    optionen.push(info);
  }

  // 4. Module mit ihren Veranstaltungen und den noch möglichen Optionen
  const module = [];
  for (const modul of daten.module) {
    if (!modul.aktiv) continue;
    const eintrag = { modul, veranstaltungen: [], moeglich: true };
    for (const veranstaltung of modul.veranstaltungen) {
      if (!veranstaltung.aktiv) continue;
      const nummern = [];
      optionen.forEach((info, nummer) => {
        if (info.veranstaltung === veranstaltung) nummern.push(nummer);
      });
      if (nummern.length === 0) {
        eintrag.moeglich = false;
        diagnose.push({
          art: modul.pflicht ? 'fehler' : 'info',
          text: (modul.pflicht ? 'Pflichtmodul' : 'Wahlmodul') + ' „' + modul.name + '“ kann nicht belegt werden: ' +
            'für „' + veranstaltungName(veranstaltung) + '“ bleibt kein passender Termin übrig.',
        });
      }
      eintrag.veranstaltungen.push(nummern);
    }
    module.push(eintrag);
  }

  return { optionen, module, diagnose, freieTage, blockVorkommen };
}

/* ---------- Hauptfunktion ---------- */

function berechneVarianten() {
  const startZeit = performance.now();
  const e = daten.einstellungen;
  const ziel = leseZahl(e.ectsZiel, 0);
  const nurZiel = Boolean(e.nurZielErreicht);
  const maxAnzahl = Math.min(MAX_VARIANTEN_GRENZE, Math.max(1, Math.round(leseZahl(e.maxVarianten, 20))));

  const { optionen, module, diagnose } = bereiteVor();
  const ergebnis = {
    varianten: [], // die besten Varianten, sortiert
    anzahl: 0, // Anzahl gefundener (bewerteter) Varianten
    uebersprungen: false, // true = Varianten mit zu vielen ECTS wurden gar nicht erst gezählt
    abgebrochen: false, // true = Zeitbudget überschritten
    dauerMs: 0,
    diagnose,
    optionen,
    ziel,
  };

  if (module.length === 0) {
    diagnose.push({ art: 'fehler', text: 'Es ist kein Modul aktiv.' });
    return ergebnis;
  }
  const pflicht = module.filter((m) => m.modul.pflicht);
  const wahl = module.filter((m) => !m.modul.pflicht && m.moeglich);
  if (pflicht.some((m) => !m.moeglich)) return ergebnis; // Grund steht schon in der Diagnose

  // Konfliktlisten: Für jede Option die Nummern der Optionen, mit denen sie kollidiert
  const konflikte = optionen.map(() => []);
  for (let i = 0; i < optionen.length; i++) {
    for (let j = i + 1; j < optionen.length; j++) {
      if (optionen[i].veranstaltung === optionen[j].veranstaltung) continue; // schließen sich ohnehin aus
      if (ersteUeberschneidung(optionen[i].vorkommen, optionen[j].vorkommen)) {
        konflikte[i].push(j);
        konflikte[j].push(i);
      }
    }
  }

  // Suchschritte festlegen. Veranstaltungen mit wenigen Optionen zuerst –
  // das schließt unpassende Kombinationen früher aus.
  const nachAnzahl = (a, b) => a.length - b.length;
  const schritte = [];
  pflicht.flatMap((m) => m.veranstaltungen).sort(nachAnzahl).forEach((nummern) => {
    schritte.push({ art: 'veranstaltung', optionen: nummern });
  });
  for (const m of wahl) {
    const entscheidung = { art: 'modul', modul: m.modul, weiterOhne: 0 };
    schritte.push(entscheidung);
    [...m.veranstaltungen].sort(nachAnzahl).forEach((nummern) => {
      schritte.push({ art: 'veranstaltung', optionen: nummern });
    });
    entscheidung.weiterOhne = schritte.length; // hier geht es weiter, wenn das Modul nicht belegt wird
  }

  // restWahlEcts[n] = ECTS aller Wahlmodule, über die ab Schritt n noch entschieden wird
  const restWahlEcts = new Array(schritte.length + 1).fill(0);
  for (let n = schritte.length - 1; n >= 0; n--) {
    restWahlEcts[n] = restWahlEcts[n + 1] + (schritte[n].art === 'modul' ? schritte[n].modul.ects : 0);
  }

  const ectsPflicht = pflicht.reduce((summe, m) => summe + m.modul.ects, 0);
  if (nurZiel && ectsPflicht + restWahlEcts[0] < ziel) {
    diagnose.push({
      art: 'fehler',
      text: 'Das ECTS-Ziel von ' + formatZahl(ziel) + ' ist nicht erreichbar: Alle aktiven, belegbaren Module zusammen ergeben nur ' +
        formatZahl(ectsPflicht + restWahlEcts[0]) + ' ECTS. Ziel senken oder Filter „nur Varianten, die das Ziel erreichen“ abschalten.',
    });
    return ergebnis;
  }

  // Zustand während der Suche
  const gewaehlt = []; // Nummern der gewählten Optionen
  const gewaehlteModule = pflicht.map((m) => m.modul);
  const blockiert = new Array(optionen.length).fill(0); // > 0 = kollidiert mit etwas Gewähltem
  let ects = ectsPflicht;
  let schrittZaehler = 0;
  const liste = ergebnis.varianten; // Bestenliste, beste Variante zuerst

  // Ist "ECTS nah am Ziel" das wichtigste Kriterium, können wir abkürzen (siehe zuWeitUeberZiel)
  const erstePrioritaet = e.prioritaeten.find((p) => p.aktiv);
  const ectsZuerst = Boolean(erstePrioritaet) && erstePrioritaet.schluessel === 'ects';

  // true, wenn Varianten mit diesen (oder noch mehr) ECTS sicher nicht mehr in die
  // volle Bestenliste kommen: Belegt man weitere Module, steigen die ECTS nur noch,
  // der Abstand zum Ziel wird also nicht mehr kleiner.
  function zuWeitUeberZiel(ectsWert) {
    if (!ectsZuerst || liste.length < maxAnzahl || ectsWert < ziel) return false;
    const zuWeit = ectsAbstand(ectsWert, ziel) > ectsAbstand(liste[liste.length - 1].ects, ziel) + 0.01;
    if (zuWeit) ergebnis.uebersprungen = true; // dann ist "anzahl" nicht mehr die Gesamtzahl
    return zuWeit;
  }

  function varianteGefunden() {
    if (nurZiel && ects < ziel) return;
    ergebnis.anzahl++;
    const kandidat = { ects, kennzahlen: berechneKennzahlen(gewaehlt.map((nummer) => optionen[nummer])) };
    // In die Bestenliste einsortieren und nur die besten maxAnzahl behalten
    if (liste.length === maxAnzahl && vergleicheVarianten(kandidat, liste[liste.length - 1]) >= 0) return;
    kandidat.optionen = [...gewaehlt];
    kandidat.module = [...gewaehlteModule];
    let position = liste.findIndex((andere) => vergleicheVarianten(kandidat, andere) < 0);
    if (position === -1) position = liste.length;
    liste.splice(position, 0, kandidat);
    if (liste.length > maxAnzahl) liste.pop();
  }

  function suche(nr) {
    if (ergebnis.abgebrochen) return;
    if (++schrittZaehler % 1000 === 0 && performance.now() - startZeit > ZEITBUDGET_MS) {
      ergebnis.abgebrochen = true;
      return;
    }
    if (nr === schritte.length) {
      varianteGefunden();
      return;
    }

    const schritt = schritte[nr];
    if (schritt.art === 'modul') {
      const belegen = () => {
        if (zuWeitUeberZiel(ects + schritt.modul.ects)) return;
        gewaehlteModule.push(schritt.modul);
        ects += schritt.modul.ects;
        suche(nr + 1);
        ects -= schritt.modul.ects;
        gewaehlteModule.pop();
      };
      const nichtBelegen = () => {
        // nur sinnvoll, wenn das ECTS-Ziel trotzdem noch erreichbar bleibt
        if (!nurZiel || ects + restWahlEcts[schritt.weiterOhne] >= ziel) suche(schritt.weiterOhne);
      };
      // Zuerst ohne das Modul probieren: Weniger Module bedeuten meist weniger
      // Uni-Tage, weniger Lücken und ECTS nah am Ziel. So füllt sich die
      // Bestenliste schnell mit guten Varianten – wichtig, falls die Suche
      // wegen des Zeitbudgets abbricht.
      nichtBelegen();
      belegen();
    } else {
      // Jede noch freie Option dieser Veranstaltung ausprobieren
      for (const nummer of schritt.optionen) {
        if (blockiert[nummer] > 0) continue;
        gewaehlt.push(nummer);
        for (const andere of konflikte[nummer]) blockiert[andere]++;
        suche(nr + 1);
        for (const andere of konflikte[nummer]) blockiert[andere]--;
        gewaehlt.pop();
      }
    }
  }

  suche(0);
  ergebnis.dauerMs = performance.now() - startZeit;

  if (ergebnis.anzahl === 0) erklaereKeineVariante(ergebnis, pflicht, konflikte, nurZiel, ziel);
  return ergebnis;
}

// Hilft bei der Fehlersuche, wenn gar keine Variante gefunden wurde
function erklaereKeineVariante(ergebnis, pflicht, konflikte, nurZiel, ziel) {
  const { optionen, diagnose } = ergebnis;
  // Pflichtveranstaltungen mit nur einer Option, die sich gegenseitig blockieren
  const fest = pflicht.flatMap((m) => m.veranstaltungen).filter((nummern) => nummern.length === 1).map((n) => n[0]);
  let gefunden = false;
  for (let i = 0; i < fest.length; i++) {
    for (let j = i + 1; j < fest.length; j++) {
      if (konflikte[fest[i]].includes(fest[j])) {
        const ueberschneidung = ersteUeberschneidung(optionen[fest[i]].vorkommen, optionen[fest[j]].vorkommen);
        diagnose.push({
          art: 'fehler',
          text: 'Feste Pflichttermine überschneiden sich: ' + optionBezeichnung(optionen[fest[i]]) + ' und ' +
            optionBezeichnung(optionen[fest[j]]) + ' (z. B. am ' + formatDatum(ueberschneidung.a.tag, { mitWochentag: true }) + ').',
        });
        gefunden = true;
      }
    }
  }
  if (gefunden) return;
  diagnose.push({
    art: 'fehler',
    text: nurZiel
      ? 'Keine Kombination erreicht ohne Überschneidung das ECTS-Ziel von ' + formatZahl(ziel) +
        '. Tipp: Ziel senken, den Filter abschalten oder weitere Gruppen/Module aktivieren.'
      : 'Die Pflichtveranstaltungen lassen sich mit keiner Kombination der Gruppen überschneidungsfrei legen.',
  });
}
