/* =====================================================================
   app.js – Start der App, Tab-Wechsel und zentrale Ereignisverarbeitung.
   Diese Datei wird als letzte geladen.
   ===================================================================== */

'use strict';

// Welche Funktion zeichnet welchen Tab?
const TABS = {
  module: () => zeigeModule(),
  zeiten: () => zeigeGeblockteZeiten(),
  varianten: () => zeigeVariantenTab(),
  favoriten: () => zeigeFavoritenTab(),
  einstellungen: () => zeigeEinstellungen(),
};

let aktiverTab = 'module';

// Wird nach JEDER Datenänderung aufgerufen: speichern und neu zeichnen.
// Mit neuZeichnen = false bleibt der aktuelle Tab unverändert
// (z. B. damit beim Tippen der Fokus nicht verloren geht).
function datenGeaendert(neuZeichnen = true) {
  datenSpeichern();
  variantenVeraltet = true; // Varianten beim nächsten Anzeigen neu berechnen
  if (neuZeichnen) zeigeTab(aktiverTab);
}

function zeigeTab(name) {
  if (!TABS[name]) name = 'module';
  aktiverTab = name;
  $$('.tab').forEach((knopf) => {
    const aktiv = knopf.dataset.tab === name;
    knopf.classList.toggle('aktiv', aktiv);
    knopf.setAttribute('aria-selected', aktiv ? 'true' : 'false');
  });
  $$('.tab-inhalt').forEach((bereich) => {
    bereich.hidden = bereich.id !== 'tab-' + name;
  });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  TABS[name]();
}

/* ---------- Zentrale Ereignisverarbeitung ----------
   Statt jedem Knopf einzeln eine Funktion zuzuweisen, hören wir an
   EINER Stelle auf alle Klicks. Hat das angeklickte Element (oder ein
   Elternelement) ein Attribut data-aktion="xyz", wird aktionen.xyz
   aufgerufen. Die übrigen data-…-Attribute werden mitgegeben.
   ------------------------------------------------------------------ */

document.addEventListener('click', (ereignis) => {
  const tabKnopf = ereignis.target.closest('.tab');
  if (tabKnopf) {
    zeigeTab(tabKnopf.dataset.tab);
    return;
  }
  const element = ereignis.target.closest('[data-aktion]');
  if (!element || element.matches('input, select, textarea')) return;
  const aktion = aktionen[element.dataset.aktion];
  if (aktion) {
    ereignis.preventDefault();
    aktion(element.dataset, element, ereignis);
  }
});

// Änderungen an Schaltern, Auswahlboxen und Feldern mit data-aktion
document.addEventListener('change', (ereignis) => {
  const element = ereignis.target;
  if (!element.matches('input[data-aktion], select[data-aktion], textarea[data-aktion]')) return;
  const aktion = aktionen[element.dataset.aktion];
  if (aktion) aktion(element.dataset, element, ereignis);
});

// Links wie <a href="#einstellungen"> wechseln den Tab
window.addEventListener('hashchange', () => zeigeTab(location.hash.slice(1)));

/* ---------- Start ---------- */

function start() {
  datenLaden();
  $('#hinweis-speicher').hidden = speicherVerfuegbar;
  zeigeTab(location.hash.slice(1) || 'module');
}

start();
