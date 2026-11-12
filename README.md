# Stundenplan-Planer

Web-App zum Planen des Stundenplans im Masterstudium. Du trägst deine Module und deren Termine ein. Die App berechnet daraus alle Stundenplan-Varianten ohne Überschneidungen, sortiert sie nach deinen Prioritäten und exportiert die gewählte Variante für Google Kalender.

- Reines HTML, CSS und JavaScript, ohne Framework, ohne Build-Schritt
- Funktioniert am Laptop und auf dem Handy
- Alle Daten bleiben in deinem Browser (`localStorage`), nichts wird hochgeladen

Die vollständigen Anforderungen stehen in [ANFORDERUNGEN.md](ANFORDERUNGEN.md).

## Starten

**Lokal:** `index.html` per Doppelklick im Browser öffnen. Ein Server ist nicht nötig.

**Über GitHub Pages:**
1. Den Entwicklungs-Branch in `main` mergen.
2. Im Repository auf GitHub **Settings → Pages** öffnen.
3. Unter *Build and deployment* die Quelle **Deploy from a branch** wählen, dann Branch **main** und Ordner **/ (root)**, anschließend **Save**.
4. Nach ein bis zwei Minuten ist die App unter `https://<benutzername>.github.io/stundenplan-planer/` erreichbar.

> Die Daten werden pro Browser und Gerät gespeichert. Um Daten zwischen Laptop und Handy zu übertragen, nutzt du das Backup (siehe unten).

## Schnellstart mit Beispieldaten

Unter **Einstellungen → Beispieldaten laden** (oder im leeren Tab *Module*) lädst du ein fachneutrales Beispielsemester. Es zeigt jede Funktion einmal: Pflicht- und Wahlmodule, Übungsgruppen als Alternativen, 14-tägige Termine, ein Blockseminar, eine Veranstaltung nur in der ersten Semesterhälfte, ein Tutorium ohne Anwesenheitspflicht, geblockte Zeiten mit Puffer, einen Wunsch („Freitag frei“), vorlesungsfreie Tage und einen angefangenen Studienverlaufsplan.

## Anleitung

### 1. Semester festlegen (Tab *Einstellungen*)
- Trage **Vorlesungsbeginn und -ende** ein. Termine ohne eigenes Datum gelten automatisch für diesen Zeitraum.
- Unter **Vorlesungsfreie Zeiten** trägst du Feiertage und Pausen ein (z. B. Weihnachten). Wöchentliche und 14-tägige Termine fallen an diesen Tagen aus. Blocktermine mit festem Datum bleiben bestehen.

### 2. Module anlegen (Tab *Module*)
- **+ Modul**: Name, Modulnummer, ECTS, Farbe, Dozent:in, Prüfungsform, Link und Notizen.
- **Pflicht** oder **Wahl**:
  - Pflichtmodule sind in jeder Variante enthalten.
  - Wahlmodule darf der Planer weglassen, z. B. um genau dein ECTS-Ziel zu treffen.
- **+ Lehrveranstaltung**: Art (Vorlesung, Übung, Seminar …) und Termine. Der **Rhythmus** ist einer von drei:
  - **wöchentlich**
  - **14-tägig**: Bei *Startwoche* wählst du, ob es in der ersten oder zweiten Woche losgeht. Angezeigt wird jeweils das Datum des ersten Termins.
  - **Block**: einzelne Daten mit gleicher Uhrzeit. Für andere Uhrzeiten (z. B. Fr nachmittags, Sa ganztags) einfach einen weiteren Termin hinzufügen.
- **Anwesenheit nicht nötig:** Gibt es z. B. eine Aufzeichnung, setze bei der Lehrveranstaltung dieses Häkchen. Sie darf sich dann mit anderen Terminen und geblockten Zeiten überschneiden; die Variante zeigt das nur als Hinweis („… überschneidet sich mit …, 12 Termine“). Im Raster erscheint sie blasser. In Uni-Tage, Freistunden usw. zählt sie standardmäßig nicht mit (umschaltbar im Tab *Varianten*).
- **Alternativtermine:** Gibt es mehrere Gruppen (Übung A/B/C), füge mit **+ Alternativtermin** weitere Gruppen hinzu. Der Planer belegt genau eine davon. Eine Gruppe kann auch aus mehreren Terminen bestehen (z. B. Di und Do).
- Mit den **Schaltern** deaktivierst du Module, einzelne Lehrveranstaltungen oder einzelne Gruppen, z. B. „Gruppe C passt mir nicht“. Die Varianten berechnen sich danach automatisch neu.
- **+ Prüfung**: Prüfungstermine des Moduls mit Datum, Uhrzeit (leer lassen bei Abgabefristen) und Raum. Ein Modul kann mehrere Termine haben, z. B. Klausur und Abgabe. Wiederholungstermine lassen sich markieren; sie werden angezeigt, aber nicht geprüft. Es gelten diese Regeln:
  - **Eine Prüfung hat immer Vorrang.** Überschneidungen mit Vorlesungen, Arbeit oder anderen geblockten Zeiten spielen keine Rolle.
  - **Echte Überschneidungen schließen aus.** Überschneiden sich die Prüfungen zweier Module wirklich, werden diese Module nie zusammen belegt.
  - **Enge Abstände ergeben nur Hinweise.** Liegen zwei Prüfungen am selben Tag oder an zwei Tagen hintereinander, zeigt die App das an.

### 3. Geblockte Zeiten und Wünsche (Tab *Zeiten & Wünsche*)
**Geblockte Zeiten** sind harte Grenzen: Dort darf keine Uni stattfinden, z. B. Arbeit oder Sport:
- jede Woche am selben Tag oder an bestimmten Tagen (einzelner Tag oder Zeitraum)
- ganztägig oder als Zeitfenster
- mit **Puffer davor/danach** in Minuten, z. B. für den Weg zur Arbeit

**Wünsche** sind weich: Sie schließen keine Variante aus, beeinflussen aber die Sortierung. Ein Wunsch hat Wochentage, „ganzer Tag frei“ oder ein Zeitfenster und ein Gewicht (*leicht* = 1, *mittel* = 2, *stark* = 4). Jede Stunde Uni im Wunsch-Zeitfenster zählt Gewicht × Stunden als Abzug, gemittelt pro normaler Vorlesungswoche. Vorlagen per Klick: *Freitag frei*, *Nicht vor 10 Uhr*, *Mittagspause 12–13 Uhr*, *Montag frei*.

### 4. Varianten (Tab *Varianten*)
- **ECTS-Ziel**: Mit dem Häkchen „nur Varianten, die das Ziel erreichen“ siehst du nur Varianten, die mindestens so viele ECTS haben.
- **Sortierung**: Ordne die Kriterien mit ↑/↓ nach Wichtigkeit und schalte nicht gewünschte Kriterien ab.
  - *ECTS nah am Ziel*: möglichst genau die Zielzahl, Varianten unter dem Ziel kommen immer nach hinten
  - *Wenigste Uni-Tage*: Ø Tage pro Woche mit mindestens einem Termin; bei Gleichstand gewinnt die Variante mit weniger Blocktagen
  - *Wenigste Freistunden*: Ø Stunden pro Woche in Lücken zwischen Terminen am selben Tag; Lücken bis 15 Minuten zählen nicht
  - *Spätester Beginn*: Ø Uhrzeit des ersten Termins pro Uni-Tag
  - *Wenigste Pendeltage*: Ø Tage pro Woche mit weniger Uni als eingestellt (Standard: unter 2 Stunden). Anfangs abgeschaltet. Solche Tage sind im Wochenraster mit 🚆 markiert.
  - *Wünsche am besten erfüllt*: kleinste Summe der Wunsch-Abzüge (siehe oben). Unter den Kennzahlen steht, welche Wünsche nicht erfüllt sind.

  Die Durchschnitte beziehen sich auf eine **normale Vorlesungswoche**: Gemittelt wird über alle Wochen ohne Feiertage oder Ferien. Angebrochene Wochen am Semesteranfang und -ende zählen ebenfalls nicht mit. Drei feste Uni-Tage ergeben so genau 3. 14-tägige Termine oder Kurse nur in einem Teil des Semesters ergeben einen ehrlichen Mittelwert (z. B. 2,5). **Blocktermine** zählen nicht in die Wochenwerte, sie stehen separat als „+ 6 Blocktage“ daneben.
- **Anzahl anzeigen**: begrenzt die Liste auf die besten 5 bis 100 Varianten.
- **Wochenansicht**: In der *Regelwoche* stehen alle wiederkehrenden Termine. 14-tägige Termine sind schraffiert, Blocktermine stehen als Liste darunter. Über die Auswahl kannst du auch jede **konkrete Kalenderwoche** ansehen. Geblockte Zeiten erscheinen grau, ihr Puffer heller schraffiert. Ein Klick (oder Antippen) auf einen Termin zeigt alle Details.
- **Prüfungen**: Unter dem Raster steht der Prüfungsplan der Variante, nach Datum sortiert, mit Hinweisen zu Prüfungen am selben oder am Folgetag. In der konkreten Kalenderwoche erscheinen Prüfungen als umrandete Kästchen über allem anderen.
- Findet der Planer keine Variante, nennt er den Grund, z. B. zwei feste Pflichttermine, die sich überschneiden. Unter „… Hinweise zu ausgeschlossenen Terminen und Kombinationen“ steht, welche Gruppen mit geblockten Zeiten kollidieren und welche Module wegen überschneidender Prüfungen nicht zusammen belegt werden.
- **🔗 Teilen**: erzeugt einen Link mit dieser Variante (am Handy über das Teilen-Menü). Wer ihn öffnet, sieht Wochenraster, Kennzahlen und Prüfungsplan, kann die Variante als `.ics` exportieren oder per **In meine Planung übernehmen** als neue Module plus Favorit speichern. Im Link stecken nur die belegten Module mit den gewählten Gruppen, ihre Prüfungen, der Vorlesungszeitraum und die vorlesungsfreien Tage – keine Notizen, geblockten Zeiten, Wünsche oder Favoriten. Die Daten werden komprimiert, ein Link ist meist 1–3 KB lang.
- **🎓 In Studienverlauf**: trägt die Module der Variante mit Status „belegt“ in ein Semester des Studienverlaufs ein (siehe 6.). Module mit gleichem Namen werden übersprungen.
- **🖨 Drucken / PDF**: öffnet die Druckansicht. Seite 1 zeigt das Wochenraster (A4 quer), danach folgen Prüfungsplan, Module und Termine. Im Druckdialog „Als PDF speichern“ wählen, um eine PDF-Datei zu erhalten (auch am Handy über *Teilen → Drucken*).

### 5. Favoriten (Tab *Favoriten*)
- Speichere gute Varianten mit **☆ Als Favorit speichern**.
- Im Tab *Favoriten* setzt du bei bis zu drei Favoriten ein Häkchen und vergleichst sie nebeneinander: Kennzahlen-Tabelle (bester Wert grün) und Wochenraster.
- Jeder Favorit lässt sich auch einzeln drucken oder als PDF speichern (**🖨 PDF**) und per Link teilen (**🔗 Teilen**).
- Ein Favorit merkt sich nur, welche Module und Gruppen gewählt sind. Änderst du später einen Raum oder eine Uhrzeit, ist das automatisch berücksichtigt. Wird dadurch etwas ungültig (gelöscht, neue Überschneidung), steht beim Favoriten „Veraltet“ mit dem Grund.

### 6. Studienverlauf (Tab *Studium*)
Der Überblick über das ganze Studium, unabhängig vom Semester-Planer.

**Modulhandbuch einlesen:** Mit **📄 Modulhandbuch einlesen** wählst du das PDF des Modulhandbuchs (M.Sc. Wirtschaftsinformatik, Uni Bamberg). Die App liest die *Übersicht nach Modulgruppen* (Modulgruppen mit ECTS-Spanne, alle Module mit Kürzel, ECTS und Turnus) und aus den Modulbeschreibungen Prüfungsform, Modulverantwortliche/n und Sprache. In einer Vorschau wählst du, welche Modulgruppen übernommen werden (Auflagenmodule sind abgewählt – sie zählen nicht zu den ECTS und betreffen nur, wem sie im Zugangsbescheid auferlegt wurden). Danach:
- sind die Modulgruppen als Bereiche angelegt bzw. vorhandene mit gleichem Namen aktualisiert,
- stehen die Module im **Modulkatalog**: Suche (Name, Kürzel, Fach, Dozent, Prüfungsform), Filter nach Bereich und Angebot (WS/SS) und „nur noch nicht eingeplante“. **+ Einplanen** schlägt das erste passende Semester vor (z. B. ein reines SS-Modul im 2. Semester); bei Modulen in mehreren Gruppen wählst du, wo sie angerechnet werden,
- bekommen schon eingetragene Module ohne Bereich ihre Modulgruppe (Zuordnung über Kürzel oder Namen).

Das PDF wird nur im Browser ausgewertet und nirgends hochgeladen. Das Einlesen ist auf den Aufbau des Bamberger Modulhandbuchs zugeschnitten und funktioniert auch mit späteren Fassungen, solange das Layout gleich bleibt. Neu einlesen ersetzt den Katalog, eingeplante Module bleiben erhalten.

**Studienbeginn und Turnus:** Unter *Studienziel und Bereiche* stellst du ein, ob du im WS oder SS angefangen hast und in welchem Jahr. Die Semester zeigen dann „WS 26/27“, „SS 27“ usw., und Module, die laut Modulhandbuch nur im anderen Semester angeboten werden, sind mit ⚠ markiert und erscheinen als Hinweis.

Außerdem:
- Unter **Studienziel und Bereiche** trägst du die Gesamt-ECTS (z. B. 120), die Regelstudienzeit und die **Modulbereiche** deiner Prüfungsordnung mit ihrer **ECTS-Spanne** ein (*mindestens* / *höchstens*, z. B. 18–30). Fester Wert wie bei der Masterarbeit: beide gleich. Keine Obergrenze: *höchstens* leer lassen. Alles ist frei konfigurierbar.
- **+ Modul**: Name, Nummer, ECTS, Bereich, Semester (oder „noch offen“) und Status *geplant*, *belegt* oder *bestanden* mit Note.
- Oben stehen ECTS bestanden / belegt / geplant / noch ohne Planung und der **Notenschnitt**: nach ECTS gewichtet, nur bestandene Module mit Note, nach der ersten Nachkommastelle abgeschnitten (genauer Wert in Klammern). Prüfe, ob deine Prüfungsordnung das genauso regelt.
- Je Bereich zeigt ein Balken den Fortschritt, hinterlegt mit der erlaubten Spanne (Striche = Minimum und Maximum). Hinweise erscheinen, wenn das Minimum eines Bereichs fehlt, ein Bereich über dem Maximum liegt oder die Spannen nicht zum Studienziel passen. Sind alle Minima erfüllt, aber das Ziel noch nicht erreicht, steht dort, in welchen Bereichen noch Platz ist.
- **Anrechnung:** ECTS über dem Maximum eines Bereichs zählen nicht zum Studienziel (übliche Regel – bitte mit deiner Prüfungsordnung abgleichen). Ältere Daten mit festen Soll-ECTS werden als Spanne „x–x“ übernommen.
- Ein Klick auf ein Modul öffnet es zum Bearbeiten (auch Semester oder Status ändern, löschen).

### 7. Export für Google Kalender
1. Bei einer Variante oder einem Favoriten auf **📅 Kalender-Export (.ics)** klicken. Die Datei wird heruntergeladen.
2. [Google Kalender](https://calendar.google.com) im Browser öffnen. Tipp: Lege vorher über *Weitere Kalender → +* einen **neuen Kalender** an, z. B. „Uni“. Dann kannst du ihn später mit einem Klick wieder entfernen.
3. **Zahnrad → Einstellungen → Importieren & Exportieren → Importieren**, die `.ics`-Datei auswählen, den Kalender wählen und **Importieren** klicken.

Die Datei nutzt die Zeitzone Europe/Berlin. Wiederkehrende Termine werden als Serien mit Enddatum exportiert, vorlesungsfreie Tage als Ausnahmen, Blocktermine als Einzeltermine. Prüfungstermine der belegten Module kommen als eigene Termine dazu (ohne Uhrzeit ganztägig). Der Import ist nur in der Browser-Version von Google Kalender möglich, nicht in der App.

### 8. Backup
Unter **Einstellungen → Daten & Backup**:
- **Backup exportieren** speichert alle Daten (Module, Zeiten, Wünsche, Favoriten, Studienverlauf, Einstellungen) als JSON-Datei.
- **Backup importieren** liest eine solche Datei wieder ein und ersetzt die aktuellen Daten (vorher kommt eine Rückfrage).

So überträgst du deine Planung z. B. vom Laptop aufs Handy. Das Backup ist auch eine gute Absicherung, falls die Browserdaten gelöscht werden.

**Erinnerung:** Ist deine erste ungesicherte Änderung älter als 14 Tage, erscheint oben ein Hinweis mit **Jetzt sichern** und **Später** (blendet ihn 3 Tage aus). Die Zahl der Tage stellst du unter *Daten & Backup* ein, 0 schaltet die Erinnerung aus.

## Für Entwickler:innen

### Projektstruktur
```
index.html            Grundgerüst mit Tabs; lädt die Skripte in fester Reihenfolge
css/style.css         Gestaltung (mobil zuerst, helles und dunkles Farbschema)
js/hilfen.js          kleine Hilfsfunktionen (HTML, Datum, Uhrzeit, Dialoge)
js/studienverlauf.js  Studienverlauf: Bereiche, Fortschritt, Notenschnitt, Katalog (vor speicher.js geladen)
js/modulhandbuch.js   Modulhandbuch (PDF) einlesen: Zeilen aus pdf.js, Modulgruppen und Module erkennen
js/speicher.js        Datenmodell, Laden/Speichern im localStorage
js/termine.js         Termine → konkrete Vorkommen (Datum + Uhrzeit)
js/pruefungen.js      Prüfungstermine: Überschneidungen, Hinweise, Prüfungsplan
js/varianten.js       Überschneidungsprüfung, Variantensuche, Kennzahlen, Sortierung
js/wochenansicht.js   Wochenraster
js/ics.js             Kalender-Export (iCalendar, Zeitzone Europe/Berlin)
js/druck.js           Druckansicht / PDF
js/backup.js          JSON-Backup und Backup-Erinnerung
js/teilen.js          Variante als Link teilen, geteilte Variante ansehen/übernehmen
vendor/pdfjs/         pdf.js 3.11.174 (Mozilla, Apache-2.0), nur fürs Einlesen des Modulhandbuchs
js/beispieldaten.js   Beispielsemester
js/ui-*.js            Oberfläche der einzelnen Tabs
js/app.js             Start, Tab-Wechsel, zentrale Klick-Verarbeitung
tests/                automatische Tests
```

Bewusst werden klassische `<script>`-Tags statt JavaScript-Modulen verwendet, damit die App auch per Doppelklick (`file://`) funktioniert.

### So rechnet der Planer
Jeder Termin wird in seine konkreten Vorkommen im Semester umgerechnet. Zwei Gruppen überschneiden sich nur, wenn sie wirklich am selben Tag zur selben Zeit liegen. 14-tägige Termine in wechselnden Wochen oder Termine in getrennten Zeiträumen kollidieren also nicht. Direkt aneinander anschließende Termine (10–12 und 12–14 Uhr) sind erlaubt.

Die Suche probiert die Kombinationen mit *Backtracking* durch und verwirft einen Zweig sofort, sobald etwas kollidiert. Zweige, in denen das ECTS-Ziel nicht mehr erreichbar ist (oder die schon zu weit darüber liegen), werden ebenfalls übersprungen. Nur die besten N Varianten werden behalten. Bei extrem vielen Kombinationen endet die Suche nach 2,5 Sekunden mit den besten bis dahin gefundenen Varianten, und die App weist darauf hin.

### Tests
`tests/index.html` im Browser öffnen (oder automatisiert, z. B. mit Playwright: die Seite setzt `window.testZusammenfassung`). Die Seite prüft ohne Zusatzbibliotheken die Rechenlogik:
- Datum, Rhythmen und Ferien
- Überschneidungen und Puffer
- Variantensuche, ECTS und Sortierung
- Leistung
- Zeitzone und ICS-Export
- Favoriten und Backup
- Pendeltage, Wünsche, Anwesenheit optional
- Teilen-Links und Studienverlauf
