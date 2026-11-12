# Anforderungen: Stundenplan-Planer

Web-App zum Planen des Studiums: pro Semester einen Stundenplan ohne Überschneidungen finden und über alle Semester den Studienverlauf im Blick behalten. Zugeschnitten auf den M.Sc. Wirtschaftsinformatik an der Uni Bamberg (Modulhandbuch-Import), sonst aber für jeden Studiengang nutzbar.

## Rahmenbedingungen

- Reines HTML, CSS und JavaScript, ohne Framework und ohne Build-Schritt. Die App läuft über GitHub Pages und lokal per Doppelklick auf `index.html` (`file://`).
- Oberfläche auf Deutsch, bedienbar am Laptop und am Handy (ohne waagerechtes Scrollen), helles und dunkles Farbschema.
- Alle Daten bleiben im Browser (`localStorage`). Nichts wird an einen Server geschickt – auch nicht das Modulhandbuch.
- Externe Bibliotheken nur, wenn unvermeidbar, und dann im Repository statt von einem CDN (derzeit nur pdf.js für den PDF-Import).
- Code übersichtlich und auf Deutsch kommentiert; auch Variablen- und Funktionsnamen sind deutsch.
- Ältere Daten und Backups werden beim Laden automatisch auf den aktuellen Stand gebracht; dabei geht nichts verloren.

## 1. Semester

- Name, Vorlesungsbeginn und -ende. Termine ohne eigenes Datum gelten für diesen Zeitraum.
- **Vorlesungsfreie Zeiten** (Feiertage, Pausen) zentral eintragen. Wöchentliche und 14-tägige Termine entfallen dort – bei der Überschneidungsprüfung, den Kennzahlen und im Kalender-Export (als Ausnahmen). Blocktermine mit festem Datum bleiben bestehen.

## 2. Module und Termine

- **Modul:** Name, Modulnummer, ECTS, Dozent:in, Prüfungsform, Link, Notizen und eine eigene Farbe.
- **Pflicht oder Wahl:** Pflichtmodule sind in jeder Variante enthalten, Wahlmodule darf der Planer weglassen (z. B. um das ECTS-Ziel zu treffen).
- **Lehrveranstaltungen** pro Modul (Vorlesung, Übung, Seminar …) mit Wochentag, Uhrzeit, Raum und optionalem Zeitraum.
- **Rhythmus:** wöchentlich, 14-tägig (mit Startwoche) oder Block (einzelne Daten).
- **Alternativen:** Eine Lehrveranstaltung hat eine oder mehrere Optionen (z. B. Übungsgruppe A/B/C), von denen genau eine belegt wird. Eine Option kann aus mehreren Terminen bestehen (z. B. Di und Do).
- **Anwesenheit optional** (z. B. bei Aufzeichnung): Solche Lehrveranstaltungen dürfen sich mit anderen Terminen und geblockten Zeiten überschneiden. Das erscheint nur als Hinweis mit Anzahl der betroffenen Termine; im Raster sind sie blasser. In den Kennzahlen zählen sie standardmäßig nicht mit (umschaltbar).
- **Aktivieren/Deaktivieren** auf Ebene von Modul, Lehrveranstaltung und einzelner Option; die Varianten rechnen sich danach neu.
- **Aus dem Modulhandbuch wählen** (siehe 8): Mehrfachauswahl mit Suche und Bereichsfilter. Die App erkennt am Vorlesungsbeginn oder Semesternamen, ob ein WS oder SS geplant wird, und zeigt standardmäßig nur dort angebotene Module. Die im Studienverlauf für dieses Fachsemester eingeplanten Module sind vorausgewählt. Alle werden als Wahlmodule angelegt (mit Name, Nummer, ECTS, Prüfungsform, Modulverantwortlicher/m; Turnus und Seite in den Notizen); vorhandene Module (gleiche Nummer, ohne Nummer gleicher Name) werden übersprungen. Module, die laut Modulhandbuch im geplanten Semester nicht angeboten werden, sind markiert.

## 3. Prüfungen

- Mehrere Prüfungstermine pro Modul (z. B. Klausur und Abgabe), Uhrzeit optional, Wiederholungstermine markierbar.
- Eine Prüfung hat Vorrang vor Vorlesungen, Arbeit und anderen geblockten Zeiten.
- Überschneiden sich die Prüfungen zweier Module wirklich, werden diese Module nie zusammen belegt.
- Prüfungen am selben Tag oder an aufeinanderfolgenden Tagen ergeben einen Hinweis.
- Wiederholungstermine werden angezeigt, aber nicht geprüft.

## 4. Geblockte Zeiten und Wünsche

- **Geblockte Zeiten** (harte Grenze, z. B. Arbeit): wöchentlich oder an bestimmten Tagen bzw. in einem Zeitraum, ganztägig oder als Zeitfenster, mit einstellbarem Puffer davor und danach.
- **Wünsche** (weiche Vorgabe, z. B. „Freitag frei“, „nicht vor 10 Uhr“): Wochentage, ganzer Tag oder Zeitfenster, Gewicht leicht/mittel/stark (1/2/4). Kein Ausschluss, sondern ein Abzug von Stunden × Gewicht pro normaler Vorlesungswoche, der in die Sortierung eingeht. Pro Variante wird angezeigt, welche Wünsche nicht erfüllt sind. Vorlagen für häufige Wünsche per Klick.

## 5. Varianten

- **Berechnung:** alle Kombinationen ohne Überschneidung – auch nicht mit geblockten Zeiten inklusive Puffer. Geprüft wird kalendergenau: 14-tägige Termine in wechselnden Wochen und Termine in getrennten Zeiträumen kollidieren nicht; direkt aneinander anschließende Termine (10–12 und 12–14 Uhr) sind erlaubt.
- Effizient auch bei vielen Alternativen (Backtracking mit frühem Abbruch); die Rechenzeit ist begrenzt, die Anzahl angezeigter Varianten einstellbar (5 bis 100).
- **ECTS-Ziel:** wirkt als Filter („nur Varianten, die das Ziel erreichen“, abschaltbar) und als Sortierkriterium („ECTS nah am Ziel“).
- **Kennzahlen** pro Variante, bezogen auf eine *normale Vorlesungswoche* (Mittel über alle Wochen ohne vorlesungsfreie Tage und ohne angebrochene Wochen am Semesterrand):
  - Ø Uni-Tage pro Woche; Blocktermine zählen nicht mit, sondern werden als Anzahl Blocktage ausgewiesen
  - Ø Freistunden pro Woche (Lücken bis 15 Minuten zählen nicht)
  - Ø Beginn pro Uni-Tag
  - Ø Pendeltage pro Woche: Uni-Tage mit weniger Unizeit als eine einstellbare Schwelle (Standard 2 h), im Raster markiert
  - Wunsch-Abzüge (siehe 4)
- **Sortierung** nach frei geordneten, einzeln abschaltbaren Kriterien: ECTS nah am Ziel, wenigste Uni-Tage (bei Gleichstand weniger Blocktage), wenigste Freistunden, spätester Beginn, wenigste Pendeltage (anfangs aus), Wünsche am besten erfüllt.
- **Wochenansicht** als Raster in den Modulfarben: Regelwoche (14-tägige Termine schraffiert, Blocktermine als Liste) oder jede konkrete Kalenderwoche; geblockte Zeiten und Puffer sichtbar; Details per Klick.
- **Prüfungsplan** je Variante, nach Datum sortiert, mit Hinweisen.
- Wird keine Variante gefunden, nennt die App den Grund (z. B. zwei feste Pflichttermine, die sich überschneiden) und welche Gruppen und Kombinationen ausgeschlossen wurden.

## 6. Favoriten, Export, Teilen, Druck

- **Favoriten:** Varianten speichern und bis zu drei nebeneinander vergleichen (Kennzahlen-Tabelle mit bestem Wert, Wochenraster). Ein Favorit speichert nur die Auswahl; spätere Änderungen an Räumen oder Zeiten werden übernommen, ungültig gewordene Favoriten als „veraltet“ mit Grund markiert.
- **Kalender-Export** (`.ics`) für Google Kalender: Zeitzone Europe/Berlin, Serien mit Enddatum, vorlesungsfreie Tage als Ausnahmen, Blocktermine als Einzeltermine, Prüfungen als eigene Termine (ohne Uhrzeit ganztägig).
- **Teilen per Link:** Die Variante steckt komprimiert in der Adresse (`?teilen=…`) – nur belegte Module mit gewählter Gruppe, ihre Prüfungen, Vorlesungszeitraum und vorlesungsfreie Tage; keine Notizen, geblockten Zeiten, Wünsche oder Favoriten. Der Empfänger sieht eine Nur-Lese-Ansicht mit Kalender-Export und kann die Variante als neue Module plus Favorit übernehmen.
- **Druckansicht / PDF:** Wochenraster (A4 quer), danach Prüfungsplan sowie Module und Termine.
- **In den Studienverlauf übernehmen:** die Module einer Variante als „belegt“ in ein Semester eintragen. Schon vorhandene Module werden auf „belegt“ und dieses Semester gesetzt, bestandene bleiben unverändert. Der Bereich ist aus dem Modulkatalog vorbelegt.

## 7. Studienverlauf

- **Studienziel** (Gesamt-ECTS), Regelstudienzeit und **Studienbeginn** (WS/SS und Jahr). Daraus ergeben sich die Semesterbezeichnungen (z. B. „WS 26/27“, „SS 27“).
- **Bereiche** (Modulgruppen) mit ECTS-Spanne: Minimum und Maximum, das Maximum ist optional; fester Wert = beide gleich.
- **Module** mit Nummer, ECTS, Bereich, Semester (oder „offen“), Status *geplant / belegt / bestanden* und Note.
- **Übersicht:** ECTS bestanden, belegt, geplant und noch ohne Planung; Fortschrittsbalken je Bereich mit hinterlegter Spanne; ECTS je Semester.
- **Anrechnung:** Pro Bereich zählt höchstens das Maximum zum Studienziel; was darüber liegt, wird ausgewiesen.
- **Gleiche Module erkennen:** Studienverlauf, Modulkatalog und Semester-Planer erkennen dasselbe Modul an der Modulnummer, nur ohne Nummer am Namen.
- **Bereich löschen:** Module und Katalog verlieren die Zuordnung; ihre ECTS zählen dann unter „Ohne Bereich“.
- **Hinweise:** Minimum eines Bereichs fehlt, Bereich über dem Maximum, Spannen passen nicht zum Studienziel, wo bei erfüllten Minima noch Platz ist, und wenn ein Modul in einem Semester liegt, in dem es laut Modulhandbuch nicht angeboten wird.
- **Notenschnitt:** nach ECTS gewichtet, nur bestandene Module mit Note, nach der ersten Nachkommastelle abgeschnitten (nicht gerundet).

## 8. Modulhandbuch und Modulkatalog

- **PDF-Import** des Modulhandbuchs M.Sc. Wirtschaftsinformatik der Uni Bamberg, ausgewertet nur im Browser. Zugeschnitten auf dessen Aufbau; spätere Fassungen mit gleichem Layout funktionieren ebenso.
- Gelesen werden aus der *Übersicht nach Modulgruppen* das Studienziel, die Modulgruppen mit ECTS-Spanne und alle Module (Kürzel, Name, ECTS, Turnus, Fach, Seite) und aus den Modulbeschreibungen Prüfungsform, Modulverantwortliche/r und Sprache.
- **Vorschau** vor der Übernahme mit Auswahl der Modulgruppen; Auflagenmodule sind standardmäßig abgewählt (sie zählen nicht zu den ECTS).
- Übernahme: Modulgruppen werden zu Bereichen (vorhandene mit gleichem Kürzel oder Namen werden aktualisiert), die Module bilden den **Modulkatalog**, bereits eingetragene Module ohne Bereich werden zugeordnet. Erneutes Einlesen ersetzt den Katalog; eingeplante Module bleiben.
- **Modulkatalog:** Live-Suche (Name, Kürzel, Fach, Dozent:in, Prüfungsform), Filter nach Bereich, Angebot (WS/SS) und „noch nicht eingeplant“. Beim Einplanen schlägt die App das erste passende Semester vor; bei Modulen in mehreren Gruppen wird gewählt, wo sie angerechnet werden.

## 9. Daten

- **Backup:** alle Daten als JSON exportieren und wieder importieren (mit Rückfrage, ersetzt die vorhandenen Daten; danach gilt alles als gesichert).
- **Backup-Erinnerung:** Hinweis, wenn die erste ungesicherte Änderung älter als eine einstellbare Zahl von Tagen ist (Standard 14, 0 = aus); „Später“ blendet ihn drei Tage aus.
- **Beispieldaten** (fachneutral) per Klick, die jede Funktion einmal zeigen.
