/* =====================================================================
   backup.js – alle Daten als JSON-Datei sichern und wieder einlesen.
   So lassen sich die Daten auch auf ein anderes Gerät oder in einen
   anderen Browser übertragen.
   ===================================================================== */

'use strict';

const BACKUP_KENNUNG = 'stundenplan-planer';

aktionen['backup-export'] = () => {
  const backup = {
    app: BACKUP_KENNUNG,
    version: DATEN_VERSION,
    exportiertAm: new Date().toISOString(),
    daten,
  };
  ladeDateiHerunter('stundenplan-backup-' + heuteAlsDatum() + '.json', JSON.stringify(backup, null, 2), 'application/json');
  zeigeMeldung('Backup gespeichert');
};

// Der Knopf öffnet die (unsichtbare) Dateiauswahl
aktionen['backup-import'] = () => {
  const auswahl = document.createElement('input');
  auswahl.type = 'file';
  auswahl.accept = '.json,application/json';
  auswahl.hidden = true;
  auswahl.addEventListener('change', () => {
    if (auswahl.files.length) leseBackupDatei(auswahl.files[0]);
    auswahl.remove();
  });
  document.body.appendChild(auswahl); // manche Browser verlangen, dass das Feld im Dokument steckt
  auswahl.click();
};

function leseBackupDatei(datei) {
  const leser = new FileReader();
  leser.onload = () => {
    const ergebnis = pruefeBackup(String(leser.result));
    if (ergebnis.fehler) {
      alert('Import nicht möglich: ' + ergebnis.fehler);
      return;
    }
    const neu = ergebnis.daten;
    const frage = `Backup vom ${ergebnis.datum || 'unbekannten Datum'} einlesen?\n\n` +
      `Enthalten: ${neu.module.length} Module, ${neu.geblockteZeiten.length} geblockte Zeiten, ${neu.favoriten.length} Favoriten.\n\n` +
      'Deine aktuellen Daten werden dabei ersetzt.';
    if (!confirm(frage)) return;
    daten = neu;
    datenGeaendert();
    zeigeMeldung('Backup eingelesen');
  };
  leser.onerror = () => alert('Die Datei konnte nicht gelesen werden.');
  leser.readAsText(datei);
}

// Prüft den Dateiinhalt. Ergebnis: { daten, datum } oder { fehler }
function pruefeBackup(text) {
  let inhalt;
  try {
    inhalt = JSON.parse(text);
  } catch (fehler) {
    return { fehler: 'Die Datei ist keine gültige JSON-Datei.' };
  }
  if (!inhalt || inhalt.app !== BACKUP_KENNUNG || !inhalt.daten) {
    return { fehler: 'Die Datei ist kein Backup des Stundenplan-Planers.' };
  }
  if (Number(inhalt.version) > DATEN_VERSION) {
    return { fehler: 'Das Backup stammt aus einer neueren Version der App. Bitte die App aktualisieren.' };
  }
  const datum = inhalt.exportiertAm ? formatZeitpunkt(inhalt.exportiertAm) : '';
  return { daten: normalisiereDaten(inhalt.daten), datum };
}
