# Anforderungen: Stundenplan-Planer

Web-App zur Planung des Stundenplans im Masterstudium.

## Technik

- Reines HTML, CSS und JavaScript, kein Framework, kein Build-Schritt. Die App läuft direkt über GitHub Pages (und lokal per Doppelklick auf `index.html`).
- Oberfläche auf Deutsch, funktioniert auf Laptop und Handy.
- Daten werden im Browser gespeichert (`localStorage`).
- Code übersichtlich halten und auf Deutsch kommentieren. Auch Variablen- und Funktionsnamen sind deutsch.

## Funktionen

1. **Module** anlegen mit Name, Modulnummer, ECTS, Dozent:in, Prüfungsform, Link und Notizen. Jedes Modul bekommt eine eigene Farbe.
2. **Lehrveranstaltungen** pro Modul (Vorlesung, Übung, Seminar) mit Wochentag, Uhrzeit, Raum und Zeitraum (Start- und Enddatum).
3. **Sonderrhythmen:** wöchentlich, 14-tägig (mit Startwoche) und Blockveranstaltungen an einzelnen Daten.
4. **Alternativtermine:** mehrere Termine einer Veranstaltung (z. B. Übungsgruppe A/B/C) als Auswahlgruppe, von der genau einer belegt wird.
5. **Geblockte Zeiten** (z. B. Arbeit): ganze Tage oder Zeitfenster, plus einstellbare Pufferzeit in Minuten vor und nach jedem Block.
6. **Varianten ohne Überschneidungen** erzeugen, auch nicht mit geblockten Zeiten inkl. Puffer. Bei vielen Alternativen effizient rechnen und die Anzahl angezeigter Varianten begrenzen.
7. **Wochenansicht** jeder Variante als Raster in den Modulfarben.
8. **Varianten sortieren** nach wählbaren Prioritäten: wenigste Uni-Tage, wenigste Freistunden, spätester Beginn.
9. **ECTS-Summe** pro Variante mit einstellbarer Zielzahl.
10. **Module und einzelne Lehrveranstaltungen aktivieren/deaktivieren.** Die Varianten aktualisieren sich danach.
11. **Favoriten:** Varianten speichern und nebeneinander vergleichen.
12. **Export** einer Variante als `.ics`-Datei für Google Kalender (Zeitzone Europe/Berlin, Wiederholungen und Zeiträume korrekt).
13. **Backup:** alle Daten als JSON exportieren und wieder importieren.

### Erweiterungen

14. **Prüfungstermine** pro Modul eintragen (mehrere möglich, z. B. Klausur und Abgabe; Uhrzeit optional; Wiederholungstermine markierbar):
    - Eine Prüfung hat Vorrang vor Vorlesungen, Arbeit und anderen geblockten Zeiten.
    - Überschneiden sich die Prüfungen zweier Module wirklich, werden diese Module nicht zusammen belegt.
    - Prüfungen am selben Tag oder an aufeinanderfolgenden Tagen ergeben einen Hinweis.
    - Wiederholungstermine werden nicht geprüft.
15. **Druckansicht / PDF** einer Variante: Wochenraster, Prüfungsplan sowie Module und Termine.
16. **Pendeltage:** Uni-Tage mit weniger als einer einstellbaren Stundenzahl (Standard 2 h) als Kennzahl, abschaltbares Sortierkriterium (anfangs aus) und Markierung im Wochenraster.
17. **Backup-Erinnerung:** Hinweis, wenn die erste ungesicherte Änderung älter als X Tage ist (Standard 14, 0 = aus); „Später“ blendet 3 Tage aus.
18. **Anwesenheit optional** pro Lehrveranstaltung: Überschneidungen mit Terminen und geblockten Zeiten sind erlaubt und erscheinen als Hinweis mit Anzahl; standardmäßig nicht in den Kennzahlen (umschaltbar); im Raster blasser.
19. **Variante per Link teilen:** komprimiert in der Adresse (`?teilen=`), nur belegte Module mit gewählter Gruppe, Prüfungen, Vorlesungszeitraum und vorlesungsfreie Tage (keine Notizen, geblockten Zeiten, Wünsche, Favoriten). Nur-Lese-Ansicht mit `.ics`-Export und „In meine Planung übernehmen“ (neue Module + Favorit).
20. **Weiche Wünsche** mit Wochentagen, ganztägig oder Zeitfenster und Gewicht (leicht/mittel/stark): kein Ausschluss, sondern Abzug (Stunden × Gewicht pro normaler Woche) als Sortierkriterium; nicht erfüllte Wünsche werden je Variante genannt.
21. **Studienverlaufsplan** (frei konfigurierbar): Bereiche mit ECTS-Spanne (Minimum/Maximum, Maximum optional; ECTS über dem Maximum werden nicht aufs Studienziel angerechnet), Module mit Semester, Status (geplant/belegt/bestanden) und Note; Fortschritt je Bereich, ECTS je Semester, nach ECTS gewichteter Notenschnitt (abgeschnitten); Übernahme der Module einer Variante.
22. **Modulhandbuch einlesen (PDF)**, zugeschnitten auf das Modulhandbuch M.Sc. Wirtschaftsinformatik der Uni Bamberg: Modulgruppen mit ECTS-Spanne als Bereiche, Module (Kürzel, Name, ECTS, Turnus, Fach, Seite, Prüfung, Verantwortliche/r, Sprache) in einen durchsuchbaren **Modulkatalog**; Vorschau mit Auswahl der Modulgruppen (Auflagenmodule standardmäßig ab); Auswertung nur im Browser (pdf.js im Repo, kein Upload). Studienbeginn (WS/SS + Jahr) für Semesterbezeichnungen und Warnung, wenn ein Modul im falschen Semestertyp eingeplant ist.
23. **Module für den Semester-Planer aus dem Modulhandbuch wählen:** Mehrfachauswahl mit Suche und Bereichsfilter; geplantes Semester (WS/SS) aus Vorlesungsbeginn oder Semestername, Filter auf dort angebotene Module; Vorauswahl der im Studienverlauf für dieses Fachsemester eingeplanten Module; alle werden als Wahlmodule angelegt (keine Pflichtmodule im Studiengang); bereits angelegte Module (gleiche Nummer) werden übersprungen; ⚠-Hinweis an Modulen, die im geplanten Semester laut Modulhandbuch nicht angeboten werden.

## Präzisierungen (abgestimmt vor der Umsetzung)

- **Pflicht- und Wahlmodule:** Jedes Modul ist als Pflicht oder Wahl markiert. Pflichtmodule sind in jeder Variante enthalten, Wahlmodule dürfen fehlen. Die ECTS-Summe kann sich deshalb je Variante unterscheiden. Das ECTS-Ziel wirkt
  - als Filter („nur Varianten, die das Ziel erreichen“, abschaltbar) und
  - als zusätzliches Sortierkriterium („ECTS nah am Ziel“).
- **Vorlesungsfreie Zeiten:** Feiertage und Pausen (z. B. Weihnachten) werden zentral eingetragen. Wiederkehrende Termine entfallen an diesen Tagen: bei der Überschneidungsprüfung, bei den Kennzahlen und im `.ics`-Export (als Ausnahmen). Ausdrücklich eingetragene Blocktermine bleiben bestehen.
- **Auswahlgruppe:** Eine Lehrveranstaltung hat eine oder mehrere *Optionen* (z. B. Gruppe A, B, C), von denen genau eine belegt wird. Eine Option kann aus mehreren Terminen bestehen (z. B. Di und Do).
- **Aktivieren/Deaktivieren** ist auf Ebene von Modul, Lehrveranstaltung und einzelner Option möglich.
- **Überschneidungen** werden kalendergenau geprüft. 14-tägige Termine in wechselnden Wochen und Termine mit getrennten Zeiträumen kollidieren nicht. Direkt aneinander anschließende Termine (z. B. 10–12 und 12–14 Uhr) gelten nicht als Überschneidung.
- **Kennzahlen** (Ø Uni-Tage pro Woche, Ø Freistunden pro Woche, Ø Beginn pro Uni-Tag) beziehen sich auf eine *normale Vorlesungswoche*: Gemittelt wird über alle Wochen ohne vorlesungsfreie Tage und ohne angebrochene Wochen am Semesteranfang und -ende. Lücken bis 15 Minuten zählen nicht als Freistunde. Blocktermine werden separat als Anzahl Blocktage ausgewiesen; bei gleich vielen Uni-Tagen gewinnt die Variante mit weniger Blocktagen.
- **Beispieldaten** (fachneutral) lassen sich per Klick laden und zeigen alle Funktionen.

## Vorgehen

1. Diese Anforderungen als `ANFORDERUNGEN.md` ablegen.
2. Umsetzung in Etappen, nach jeder Etappe ein lauffähiger Commit:
   1. Datenmodell und Eingabe
   2. Varianten (Berechnung, Sortierung, Wochenansicht)
   3. Komfortfunktionen (Favoriten, ICS-Export, Backup)
3. README um eine kurze Anleitung ergänzen.
4. Beispieldaten zum Laden per Klick anlegen.
