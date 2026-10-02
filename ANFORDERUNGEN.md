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

## Präzisierungen (abgestimmt vor der Umsetzung)

- **Pflicht- und Wahlmodule:** Jedes Modul ist als Pflicht oder Wahl markiert. Pflichtmodule sind in jeder Variante enthalten, Wahlmodule dürfen fehlen. Die ECTS-Summe kann sich deshalb je Variante unterscheiden. Das ECTS-Ziel wirkt
  - als Filter („nur Varianten, die das Ziel erreichen“, abschaltbar) und
  - als zusätzliches Sortierkriterium („ECTS nah am Ziel“).
- **Vorlesungsfreie Zeiten:** Feiertage und Pausen (z. B. Weihnachten) werden zentral eingetragen. Wiederkehrende Termine entfallen an diesen Tagen: bei der Überschneidungsprüfung, bei den Kennzahlen und im `.ics`-Export (als Ausnahmen). Ausdrücklich eingetragene Blocktermine bleiben bestehen.
- **Auswahlgruppe:** Eine Lehrveranstaltung hat eine oder mehrere *Optionen* (z. B. Gruppe A, B, C), von denen genau eine belegt wird. Eine Option kann aus mehreren Terminen bestehen (z. B. Di und Do).
- **Aktivieren/Deaktivieren** ist auf Ebene von Modul, Lehrveranstaltung und einzelner Option möglich.
- **Überschneidungen** werden kalendergenau geprüft. 14-tägige Termine in wechselnden Wochen und Termine mit getrennten Zeiträumen kollidieren nicht. Direkt aneinander anschließende Termine (z. B. 10–12 und 12–14 Uhr) gelten nicht als Überschneidung.
- **Kennzahlen** werden über alle Semesterwochen mit Terminen gemittelt (Ø Uni-Tage pro Woche, Ø Freistunden pro Woche, Ø Beginn pro Uni-Tag). Lücken bis 15 Minuten zählen nicht als Freistunde.
- **Beispieldaten** (fachneutral) lassen sich per Klick laden und zeigen alle Funktionen.

## Vorgehen

1. Diese Anforderungen als `ANFORDERUNGEN.md` ablegen.
2. Umsetzung in Etappen, nach jeder Etappe ein lauffähiger Commit:
   1. Datenmodell und Eingabe
   2. Varianten (Berechnung, Sortierung, Wochenansicht)
   3. Komfortfunktionen (Favoriten, ICS-Export, Backup)
3. README um eine kurze Anleitung ergänzen.
4. Beispieldaten zum Laden per Klick anlegen.
