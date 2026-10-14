/* =====================================================================
   druck.js – Druckansicht einer Variante (auch zum Speichern als PDF).

   Die Seite wird in den unsichtbaren Bereich #druckbereich geschrieben.
   Beim Drucken blendet style.css (@media print) alles andere aus.
   Seite 1: Wochenraster (A4 quer), Seite 2: Prüfungsplan, Module & Termine.
   Im Druckdialog des Browsers kann man „Als PDF speichern“ wählen.
   ===================================================================== */

'use strict';

function druckeVariante(titel, optionInfos, module) {
  const bereich = $('#druckbereich');
  const e = daten.einstellungen;
  const unterzeile = [e.semesterName, 'erstellt am ' + formatZeitpunkt(new Date().toISOString())].filter(Boolean).join(' · ');

  bereich.innerHTML = `
    <section class="druck-seite">
      <h1>${escapeHtml(titel)}</h1>
      <p class="druck-unterzeile">${escapeHtml(unterzeile)}</p>
      ${wochenansichtHtml(optionInfos, 'regel', module, 34)}
    </section>
    <section class="druck-seite">
      <h2>Prüfungsplan</h2>
      ${pruefungsplanHtml(module)}
      <h2>Module &amp; Termine</h2>
      ${belegungHtml(module, optionInfos)}
    </section>`;

  document.body.classList.add('drucken');
  window.print();
}

// Nach dem Drucken (oder Abbrechen) aufräumen, damit ein normales
// Drucken der Seite (Strg+P) wieder die ganze Seite zeigt
window.addEventListener('afterprint', () => {
  document.body.classList.remove('drucken');
  const bereich = $('#druckbereich');
  if (bereich) bereich.innerHTML = '';
});
