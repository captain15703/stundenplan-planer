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
  schreibeBackupInfo({ letztesBackup: Date.now(), ungesichertSeit: null, spaeterBis: null });
  aktualisiereBackupErinnerung();
  zeigeMeldung('Backup gespeichert');
};

/* ---------- Erinnerung ans Backup ----------
   Getrennt von den eigentlichen Daten (eigener Speicher-Schlüssel), damit
   die Angaben nicht im Backup selbst landen:
   - letztesBackup:   Zeitpunkt des letzten Exports
   - ungesichertSeit: erste Änderung nach dem letzten Backup (null = alles gesichert)
   - spaeterBis:      "Später" gedrückt → bis dahin keine Erinnerung
   ------------------------------------------------------------------ */

const BACKUP_INFO_SCHLUESSEL = 'stundenplan-planer-backup-info';
const MS_SPAETER = 3 * MS_PRO_TAG;

function leseBackupInfo() {
  try {
    const info = JSON.parse(localStorage.getItem(BACKUP_INFO_SCHLUESSEL) || '{}');
    return info && typeof info === 'object' ? info : {};
  } catch (fehler) {
    return {};
  }
}

function schreibeBackupInfo(aenderung) {
  try {
    localStorage.setItem(BACKUP_INFO_SCHLUESSEL, JSON.stringify({ ...leseBackupInfo(), ...aenderung }));
  } catch (fehler) {
    // Speichern nicht möglich – dann gibt es eben keine Erinnerung
  }
}

// Wird bei jedem Speichern aufgerufen: merkt sich die erste ungesicherte Änderung
function merkeAenderung() {
  if (!leseBackupInfo().ungesichertSeit) schreibeBackupInfo({ ungesichertSeit: Date.now() });
  aktualisiereBackupErinnerung();
}

// Soll die Erinnerung erscheinen? (reine Funktion, damit sie testbar ist)
function backupErinnerungFaellig(info, tage, jetzt, mitDaten) {
  if (!mitDaten || !tage || !info.ungesichertSeit) return false;
  if (info.spaeterBis && jetzt < info.spaeterBis) return false;
  return jetzt - info.ungesichertSeit >= tage * MS_PRO_TAG;
}

function aktualisiereBackupErinnerung() {
  const banner = document.getElementById('hinweis-backup');
  if (!banner) return;
  const info = leseBackupInfo();
  const faellig = backupErinnerungFaellig(info, daten.einstellungen.backupErinnerungTage, Date.now(), hatDaten());
  banner.hidden = !faellig;
  if (!faellig) return;
  const text = info.letztesBackup
    ? 'Dein letztes Backup ist vom ' + formatZeitpunkt(new Date(info.letztesBackup).toISOString()) + '. Neuere Änderungen liegen nur in diesem Browser.'
    : 'Du hast noch kein Backup gespeichert – deine Daten liegen nur in diesem Browser.';
  banner.innerHTML = `
    <span>💾 ${text}</span>
    <span class="knopf-reihe">
      <button class="knopf klein" data-aktion="backup-export">Jetzt sichern</button>
      <button class="knopf-text klein" data-aktion="backup-spaeter">Später</button>
    </span>`;
}

aktionen['backup-spaeter'] = () => {
  schreibeBackupInfo({ spaeterBis: Date.now() + MS_SPAETER });
  aktualisiereBackupErinnerung();
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
      `Enthalten: ${neu.module.length} Module, ${neu.geblockteZeiten.length} geblockte Zeiten, ${neu.favoriten.length} Favoriten, ${neu.studienverlauf.module.length} Module im Studienverlauf.\n\n` +
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
