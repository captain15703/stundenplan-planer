# Stundenplan-Planer

Web-App zum Planen des Studiums. Pro Semester findet sie alle Stundenpläne ohne Überschneidungen und sortiert sie nach deinen Prioritäten. Über alle Semester behält sie den Studienverlauf mit ECTS je Modulgruppe und Notenschnitt im Blick. Das Modulhandbuch des M.Sc. Wirtschaftsinformatik (Uni Bamberg) lässt sich als PDF einlesen.

- Läuft im Browser am Laptop und am Handy, ohne Installation
- Alle Daten bleiben in deinem Browser, nichts wird hochgeladen
- Die genauen Anforderungen stehen in [ANFORDERUNGEN.md](ANFORDERUNGEN.md)

## Starten

**Online:** über GitHub Pages unter `https://captain15703.github.io/stundenplan-planer/`. Einmalig einrichten: im Repository **Settings → Pages**, Quelle **Deploy from a branch**, Branch **main**, Ordner **/ (root)**, **Save**. Jeder Merge in `main` ist nach ein bis zwei Minuten online.

**Lokal:** `index.html` per Doppelklick öffnen, ein Server ist nicht nötig.

Die Daten werden pro Browser und Gerät gespeichert. Zum Übertragen zwischen Laptop und Handy dient das [Backup](#daten-und-backup).

**Ausprobieren:** Unter *Einstellungen → Beispieldaten laden* gibt es ein fachneutrales Beispielsemester, das jede Funktion einmal zeigt.

## So gehst du vor

1. **Studium:** Modulhandbuch einlesen. Danach sind die Modulgruppen mit ihren ECTS-Spannen angelegt und alle Module stehen im Katalog. Studienbeginn prüfen und grob planen, welche Module in welches Semester sollen.
2. **Einstellungen:** Vorlesungszeitraum und vorlesungsfreie Tage des Semesters eintragen.
3. **Module:** Mit *📚 Aus Modulhandbuch* die Kandidaten fürs Semester übernehmen. Die im Studienverlauf eingeplanten sind schon angekreuzt. Danach bei jedem Modul die Termine aus dem Vorlesungsverzeichnis eintragen.
4. **Zeiten & Wünsche:** Arbeitszeiten blocken, Wünsche wie „Freitag frei“ ergänzen.
5. **Varianten:** ECTS-Ziel setzen, Sortierung festlegen, die besten Varianten ansehen und gute als Favorit speichern.
6. **Favoriten:** Vergleichen, die beste in den Kalender exportieren und mit *🎓 In Studienverlauf* als „belegt“ eintragen.

## Die Tabs im Einzelnen

### Studium

**Modulhandbuch einlesen** (*📄 Modulhandbuch einlesen*, PDF):
- Die App liest die *Übersicht nach Modulgruppen* (Studienziel, Modulgruppen mit ECTS-Spanne, alle Module mit Kürzel, ECTS und Turnus) und aus den Modulbeschreibungen Prüfungsform, Modulverantwortliche/n und Sprache.
- In der Vorschau wählst du die Modulgruppen. Auflagenmodule sind abgewählt; sie zählen nicht zu den ECTS und betreffen nur, wem sie im Zugangsbescheid auferlegt wurden.
- Vorhandene Bereiche mit gleichem Namen werden aktualisiert, eingeplante Module bleiben erhalten. Neu einlesen (z. B. bei einer neuen Fassung) ersetzt nur den Katalog.
- Das Einlesen ist auf das Bamberger Modulhandbuch zugeschnitten. Es funktioniert auch mit späteren Fassungen, solange das Layout gleich bleibt.

**Modulkatalog:**
- Suche nach Name, Kürzel, Fach, Dozent:in oder Prüfungsform, Filter nach Bereich, Angebot (WS/SS) und „nur noch nicht eingeplante“.
- **+ Einplanen** schlägt das erste passende Semester vor, z. B. für ein reines SS-Modul das nächste SS. Steht ein Modul in mehreren Gruppen, wählst du, wo es angerechnet wird.

**Studienverlauf:**
- Module je Semester mit Status *geplant*, *belegt* oder *bestanden* (mit Note). Ein Klick öffnet ein Modul zum Bearbeiten. *+ Modul* legt auch Module an, die nicht im Katalog stehen, z. B. aus dem Auslandsstudium.
- Oben stehen ECTS bestanden, belegt, geplant und noch ohne Planung sowie der **Notenschnitt**. Er ist nach ECTS gewichtet, zählt nur bestandene Module mit Note und wird nach der ersten Nachkommastelle abgeschnitten; der genaue Wert steht in Klammern.
- Je Bereich zeigt ein Balken den Fortschritt vor der erlaubten Spanne, Striche markieren Minimum und Maximum. ECTS über dem Maximum zählen nicht zum Studienziel.
- **Hinweise** erscheinen, wenn einem Bereich das Minimum fehlt, ein Bereich über dem Maximum liegt, die Spannen nicht zum Studienziel passen oder ein Modul in einem Semester liegt, in dem es laut Modulhandbuch nicht angeboten wird (⚠). Sind alle Minima erfüllt, steht dort, wo noch Platz ist.
- Unter **Studienziel und Bereiche**: Gesamt-ECTS, Regelstudienzeit, **Studienbeginn** (WS/SS und Jahr, ergibt „WS 26/27“, „SS 27“ …) und die Bereiche. Fester Wert wie bei der Masterarbeit: *mindestens* und *höchstens* gleich. Keine Obergrenze: *höchstens* leer lassen.

> Anrechnung und Notenberechnung folgen den üblichen Regeln. Bitte mit deiner Prüfungsordnung abgleichen.

### Einstellungen

- **Vorlesungsbeginn und -ende:** Termine ohne eigenes Datum gelten für diesen Zeitraum. Daran erkennt die App auch, ob du ein WS oder SS planst.
- **Vorlesungsfreie Zeiten** (Feiertage, Weihnachtspause): Wöchentliche und 14-tägige Termine fallen dort aus, Blocktermine mit festem Datum bleiben.
- **Daten & Backup**, Backup-Erinnerung und Beispieldaten, siehe [Daten und Backup](#daten-und-backup).

### Module

- **📚 Aus Modulhandbuch:** Module per Suche ankreuzen und übernehmen.
  - Die Auswahl zeigt standardmäßig nur Module, die im geplanten Semester angeboten werden.
  - Die im Studienverlauf für dieses Semester eingeplanten Module sind vorausgewählt.
  - Alle werden als Wahlmodule angelegt, mit Name, Kürzel, ECTS, Prüfungsform und Modulverantwortlicher/m; Turnus und Seite im Modulhandbuch stehen in den Notizen.
- **+ Modul:** Name, Modulnummer, ECTS, Farbe, Dozent:in, Prüfungsform, Link und Notizen.
- **Pflicht oder Wahl:** Pflichtmodule sind in jeder Variante enthalten, Wahlmodule darf der Planer weglassen, z. B. um dein ECTS-Ziel zu treffen.
- **+ Lehrveranstaltung:** Art (Vorlesung, Übung, Seminar …) und Termine mit Rhythmus:
  - **wöchentlich**
  - **14-tägig:** Die *Startwoche* legt fest, ob es in der ersten oder zweiten Woche losgeht.
  - **Block:** einzelne Daten mit gleicher Uhrzeit. Für andere Uhrzeiten einen weiteren Termin anlegen.
- **+ Alternativtermin:** weitere Gruppen (Übung A/B/C), von denen der Planer genau eine belegt. Eine Gruppe kann mehrere Termine haben (z. B. Di und Do).
- **Anwesenheit nicht nötig** (z. B. bei Aufzeichnung): Die Lehrveranstaltung darf sich überschneiden. Das erscheint nur als Hinweis, im Raster ist sie blasser, und in den Kennzahlen zählt sie standardmäßig nicht mit.
- **Schalter** deaktivieren Module, Lehrveranstaltungen oder einzelne Gruppen („Gruppe C passt mir nicht“).
- **+ Prüfung:** Datum, Uhrzeit (leer bei Abgabefristen), Raum; Wiederholungstermine markierbar. Eine Prüfung hat immer Vorrang vor Vorlesungen und geblockten Zeiten. Überschneiden sich die Prüfungen zweier Module wirklich, werden sie nie zusammen belegt. Prüfungen am selben Tag oder an zwei Tagen hintereinander ergeben einen Hinweis.

### Zeiten & Wünsche

- **Geblockte Zeiten** sind harte Grenzen, z. B. Arbeit oder Sport: wöchentlich oder an bestimmten Tagen, ganztägig oder als Zeitfenster, mit **Puffer** davor und danach (z. B. für den Weg).
- **Wünsche** sind weich: Sie schließen nichts aus, beeinflussen aber die Sortierung. Ein Wunsch hat Wochentage, „ganzer Tag frei“ oder ein Zeitfenster und ein Gewicht (*leicht* 1, *mittel* 2, *stark* 4). Jede Stunde Uni im Wunschfenster zählt Stunden × Gewicht als Abzug pro Woche. Vorlagen per Klick: *Freitag frei*, *Nicht vor 10 Uhr*, *Mittagspause 12–13 Uhr*, *Montag frei*.

### Varianten

- **ECTS-Ziel:** Mit „nur Varianten, die das Ziel erreichen“ fallen Varianten darunter weg.
- **Sortierung:** Kriterien mit ↑/↓ ordnen und einzeln abschalten.
  - *ECTS nah am Ziel*: Varianten unter dem Ziel kommen immer nach hinten
  - *Wenigste Uni-Tage*: bei Gleichstand gewinnt die mit weniger Blocktagen
  - *Wenigste Freistunden*: Lücken bis 15 Minuten zählen nicht
  - *Spätester Beginn*
  - *Wenigste Pendeltage*: Tage mit weniger Uni als eingestellt (Standard unter 2 h), im Raster mit 🚆 markiert; anfangs aus
  - *Wünsche am besten erfüllt*: Unter den Kennzahlen steht, welche Wünsche verletzt sind
- **Kennzahlen** gelten für eine *normale Vorlesungswoche*. Das ist der Mittelwert über alle Wochen ohne Feiertage und ohne angebrochene Wochen am Semesterrand. Drei feste Uni-Tage ergeben so genau 3, 14-tägige Termine einen ehrlichen Wert wie 2,5. Blocktermine stehen separat als „+ 6 Blocktage“.
- **Anzahl anzeigen:** die besten 5 bis 100 Varianten.
- **Wochenansicht:** *Regelwoche* (14-tägige Termine schraffiert, Blocktermine als Liste darunter) oder jede konkrete Kalenderwoche. Geblockte Zeiten sind grau, ihr Puffer heller. Ein Klick auf einen Termin zeigt Details.
- **Prüfungsplan** unter dem Raster, nach Datum sortiert.
- Ohne Ergebnis nennt die App den Grund und unter „Hinweise zu ausgeschlossenen Terminen“ die Gruppen und Kombinationen, die herausgefallen sind.
- Aktionen je Variante:
  - **☆ Als Favorit speichern**
  - **📅 Kalender-Export (.ics)**, siehe [unten](#export-für-google-kalender)
  - **🔗 Teilen:** Link mit der Variante, am Handy über das Teilen-Menü. Der Empfänger sieht Raster, Kennzahlen und Prüfungen, kann exportieren oder die Variante übernehmen. Im Link stecken nur die belegten Module mit gewählten Gruppen, ihre Prüfungen und der Vorlesungszeitraum, keine Notizen, geblockten Zeiten oder Wünsche.
  - **🎓 In Studienverlauf:** trägt die Module als „belegt“ in ein Semester ein
  - **🖨 Drucken / PDF:** Wochenraster auf A4 quer, danach Prüfungsplan, Module und Termine. Im Druckdialog „Als PDF speichern“ wählen.

### Favoriten

- Bis zu drei Favoriten ankreuzen und nebeneinander vergleichen: Kennzahlen-Tabelle (bester Wert grün) und Wochenraster.
- Jeder Favorit lässt sich exportieren, drucken und teilen.
- Ein Favorit merkt sich nur die Auswahl. Spätere Änderungen an Räumen oder Uhrzeiten sind automatisch berücksichtigt. Wird dadurch etwas ungültig, steht „Veraltet“ mit dem Grund dabei.

## Export für Google Kalender

1. Bei einer Variante oder einem Favoriten **📅 Kalender-Export (.ics)** klicken.
2. [Google Kalender](https://calendar.google.com) im Browser öffnen. Tipp: Vorher über *Weitere Kalender → +* einen eigenen Kalender (z. B. „Uni“) anlegen; der lässt sich später mit einem Klick wieder entfernen.
3. **Zahnrad → Einstellungen → Importieren & Exportieren → Importieren**, Datei und Kalender wählen, **Importieren**.

Die Datei nutzt die Zeitzone Europe/Berlin. Wiederkehrende Termine kommen als Serien mit Enddatum, vorlesungsfreie Tage als Ausnahmen, Blocktermine als Einzeltermine. Prüfungen sind eigene Termine, ohne Uhrzeit ganztägig. Der Import geht nur in der Browser-Version von Google Kalender, nicht in der App.

## Daten und Backup

- Alles wird im `localStorage` des Browsers gespeichert. Das Modulhandbuch wird nur im Browser ausgewertet und nirgends hochgeladen.
- **Backup exportieren** (*Einstellungen → Daten & Backup*) speichert alle Daten als JSON-Datei. **Backup importieren** ersetzt die aktuellen Daten nach Rückfrage. So kommen deine Daten aufs Handy, und du bist abgesichert, falls der Browser seine Daten löscht.
- **Erinnerung:** Ist deine erste ungesicherte Änderung älter als 14 Tage, erscheint oben ein Hinweis mit *Jetzt sichern* und *Später* (drei Tage Ruhe). Die Tage sind einstellbar, 0 schaltet die Erinnerung aus.
- Ältere Daten und Backups werden beim Laden automatisch auf den aktuellen Stand gebracht.

## Für Entwickler:innen

### Technik und Konventionen

- Reines HTML, CSS und JavaScript ohne Framework und ohne Build-Schritt.
- Klassische `<script>`-Tags statt JavaScript-Modulen, damit die App auch per Doppelklick (`file://`) läuft. Die Reihenfolge in `index.html` ist deshalb wichtig.
- Code, Kommentare, Variablen- und Funktionsnamen auf Deutsch.
- Externe Bibliotheken liegen im Repository (`vendor/`), nicht auf einem CDN.

### Projektstruktur

In Ladereihenfolge:

```
index.html              Grundgerüst mit Tabs, lädt die Skripte
css/style.css           Gestaltung (mobil zuerst, helles und dunkles Farbschema)
js/hilfen.js            Hilfsfunktionen: HTML, Datum, Uhrzeit, Zahlen, Dialoge
js/studienverlauf.js    Studienverlauf: Bereiche, Anrechnung, Notenschnitt, Semester (WS/SS), Katalog
js/speicher.js          Datenmodell, Laden/Speichern, Aufwerten älterer Daten
js/termine.js           Termine → konkrete Vorkommen (Datum + Uhrzeit)
js/pruefungen.js        Prüfungstermine: Überschneidungen, Hinweise, Prüfungsplan
js/varianten.js         Überschneidungsprüfung, Variantensuche, Kennzahlen, Wünsche, Sortierung
js/wochenansicht.js     Wochenraster
js/ics.js               Kalender-Export (iCalendar)
js/druck.js             Druckansicht / PDF
js/backup.js            JSON-Backup und Backup-Erinnerung
js/teilen.js            Variante als Link teilen, geteilte Variante ansehen und übernehmen
js/beispieldaten.js     Beispielsemester
js/ui-module.js         Tab Module (inkl. Auswahl aus dem Modulhandbuch)
js/ui-zeiten.js         Tab Zeiten & Wünsche
js/ui-varianten.js      Tab Varianten
js/ui-favoriten.js      Tab Favoriten
js/modulhandbuch.js     Modulhandbuch-PDF → Modulgruppen und Module (lädt pdf.js bei Bedarf)
js/ui-studienverlauf.js Tab Studium (Studienverlauf, Katalog, PDF-Import)
js/ui-einstellungen.js  Tab Einstellungen
js/app.js               Start, Tab-Wechsel, zentrale Ereignisverarbeitung
vendor/pdfjs/           pdf.js 3.11.174 (Mozilla, Apache-2.0), nur für den PDF-Import
tests/                  automatische Tests
```

Aktionen laufen über `data-aktion="…"` (Klick und Änderung) bzw. `data-eingabe="…"` (Live-Eingabe) und die Tabelle `aktionen` in `app.js`.

### So rechnet der Planer

Jeder Termin wird in seine konkreten Vorkommen im Semester umgerechnet. Zwei Gruppen überschneiden sich nur, wenn sie wirklich am selben Tag zur selben Zeit liegen; direkt anschließende Termine sind erlaubt.

Die Suche probiert die Kombinationen per *Backtracking* und verwirft einen Zweig, sobald etwas kollidiert oder das ECTS-Ziel nicht mehr passt. Nur die besten N Varianten werden behalten. Bei extrem vielen Kombinationen endet die Suche nach 2,5 Sekunden mit den bis dahin besten Varianten, und die App weist darauf hin.

### Modulhandbuch-Import

`modulhandbuch.js` setzt aus den Textstücken, die pdf.js liefert, Zeilen pro Seite zusammen. `leseModulhandbuch(seiten)` erkennt darin per regulären Ausdrücken die Modulgruppen, Fächer und Moduleinträge der Übersicht sowie die Detailseiten (`Modul KÜRZEL … ECTS / … h`). Die Funktion arbeitet nur mit Text und ist ohne PDF testbar. Ändert die Uni das Layout, sind die Muster in `MHB_MUSTER` die Stelle zum Anpassen.

### Tests

`tests/index.html` im Browser öffnen. Die Seite prüft ohne Zusatzbibliotheken die Rechenlogik (derzeit 76 Tests) und setzt für automatische Läufe, z. B. mit Playwright, `window.testZusammenfassung`. Abgedeckt sind:
- Datum, Rhythmen, vorlesungsfreie Zeiten und Zeitzone
- Überschneidungen, Puffer, Variantensuche, ECTS, Kennzahlen und Sortierung inklusive Leistung
- Prüfungen, Pendeltage, Wünsche, Anwesenheit optional
- ICS-Export, Favoriten, Backup und Teilen-Links
- Studienverlauf (Spannen, Anrechnung, Notenschnitt, Semesterzählung)
- Modulhandbuch-Parser (mit nachgebauten Zeilen), Übernahme in Bereiche, Katalog und Semester-Planer
