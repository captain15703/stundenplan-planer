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

Unter **Einstellungen → Beispieldaten laden** (oder im leeren Tab *Module*) lädst du ein fachneutrales Beispielsemester. Es zeigt jede Funktion einmal: Pflicht- und Wahlmodule, Übungsgruppen als Alternativen, 14-tägige Termine, ein Blockseminar, eine Veranstaltung nur in der ersten Semesterhälfte, geblockte Zeiten mit Puffer und vorlesungsfreie Tage.

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
- **Alternativtermine:** Gibt es mehrere Gruppen (Übung A/B/C), füge mit **+ Alternativtermin** weitere Gruppen hinzu. Der Planer belegt genau eine davon. Eine Gruppe kann auch aus mehreren Terminen bestehen (z. B. Di und Do).
- Mit den **Schaltern** deaktivierst du Module, einzelne Lehrveranstaltungen oder einzelne Gruppen, z. B. „Gruppe C passt mir nicht“. Die Varianten berechnen sich danach automatisch neu.

### 3. Geblockte Zeiten (Tab *Geblockte Zeiten*)
Hier trägst du Zeiten ein, in denen keine Uni stattfinden darf, z. B. Arbeit oder Sport:
- jede Woche am selben Tag oder an bestimmten Tagen (einzelner Tag oder Zeitraum)
- ganztägig oder als Zeitfenster
- mit **Puffer davor/danach** in Minuten, z. B. für den Weg zur Arbeit

### 4. Varianten (Tab *Varianten*)
- **ECTS-Ziel**: Mit dem Häkchen „nur Varianten, die das Ziel erreichen“ siehst du nur Varianten, die mindestens so viele ECTS haben.
- **Sortierung**: Ordne die Kriterien mit ↑/↓ nach Wichtigkeit und schalte nicht gewünschte Kriterien ab.
  - *ECTS nah am Ziel*: möglichst genau die Zielzahl, Varianten unter dem Ziel kommen immer nach hinten
  - *Wenigste Uni-Tage*: Ø Tage pro Woche mit mindestens einem Termin
  - *Wenigste Freistunden*: Ø Stunden pro Woche in Lücken zwischen Terminen am selben Tag; Lücken bis 15 Minuten zählen nicht
  - *Spätester Beginn*: Ø Uhrzeit des ersten Termins pro Uni-Tag

  Alle Kennzahlen werden kalendergenau über das ganze Semester gemittelt. 14-tägige Termine, Blocktermine und Ferien sind also korrekt berücksichtigt.
- **Anzahl anzeigen**: begrenzt die Liste auf die besten 5 bis 100 Varianten.
- **Wochenansicht**: In der *Regelwoche* stehen alle wiederkehrenden Termine. 14-tägige Termine sind schraffiert, Blocktermine stehen als Liste darunter. Über die Auswahl kannst du auch jede **konkrete Kalenderwoche** ansehen. Geblockte Zeiten erscheinen grau, ihr Puffer heller schraffiert. Ein Klick (oder Antippen) auf einen Termin zeigt alle Details.
- Findet der Planer keine Variante, nennt er den Grund, z. B. zwei feste Pflichttermine, die sich überschneiden. Unter „… Termine wurden ausgeschlossen“ steht, welche Gruppen mit geblockten Zeiten kollidieren.

### 5. Favoriten (Tab *Favoriten*)
- Speichere gute Varianten mit **☆ Als Favorit speichern**.
- Im Tab *Favoriten* setzt du bei bis zu drei Favoriten ein Häkchen und vergleichst sie nebeneinander: Kennzahlen-Tabelle (bester Wert grün) und Wochenraster.
- Ein Favorit merkt sich nur, welche Module und Gruppen gewählt sind. Änderst du später einen Raum oder eine Uhrzeit, ist das automatisch berücksichtigt. Wird dadurch etwas ungültig (gelöscht, neue Überschneidung), steht beim Favoriten „Veraltet“ mit dem Grund.

### 6. Export für Google Kalender
1. Bei einer Variante oder einem Favoriten auf **📅 Kalender-Export (.ics)** klicken. Die Datei wird heruntergeladen.
2. [Google Kalender](https://calendar.google.com) im Browser öffnen. Tipp: Lege vorher über *Weitere Kalender → +* einen **neuen Kalender** an, z. B. „Uni“. Dann kannst du ihn später mit einem Klick wieder entfernen.
3. **Zahnrad → Einstellungen → Importieren & Exportieren → Importieren**, die `.ics`-Datei auswählen, den Kalender wählen und **Importieren** klicken.

Die Datei nutzt die Zeitzone Europe/Berlin. Wiederkehrende Termine werden als Serien mit Enddatum exportiert, vorlesungsfreie Tage als Ausnahmen, Blocktermine als Einzeltermine. Der Import ist nur in der Browser-Version von Google Kalender möglich, nicht in der App.

### 7. Backup
Unter **Einstellungen → Daten & Backup**:
- **Backup exportieren** speichert alle Daten (Module, Zeiten, Favoriten, Einstellungen) als JSON-Datei.
- **Backup importieren** liest eine solche Datei wieder ein und ersetzt die aktuellen Daten (vorher kommt eine Rückfrage).

So überträgst du deine Planung z. B. vom Laptop aufs Handy. Das Backup ist auch eine gute Absicherung, falls die Browserdaten gelöscht werden.

## Für Entwickler:innen

### Projektstruktur
```
index.html            Grundgerüst mit Tabs; lädt die Skripte in fester Reihenfolge
css/style.css         Gestaltung (mobil zuerst, helles und dunkles Farbschema)
js/hilfen.js          kleine Hilfsfunktionen (HTML, Datum, Uhrzeit, Dialoge)
js/speicher.js        Datenmodell, Laden/Speichern im localStorage
js/termine.js         Termine → konkrete Vorkommen (Datum + Uhrzeit)
js/varianten.js       Überschneidungsprüfung, Variantensuche, Kennzahlen, Sortierung
js/wochenansicht.js   Wochenraster
js/ics.js             Kalender-Export (iCalendar, Zeitzone Europe/Berlin)
js/backup.js          JSON-Backup
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
`tests/index.html` im Browser öffnen. Die Seite prüft ohne Zusatzbibliotheken die Rechenlogik:
- Datum, Rhythmen und Ferien
- Überschneidungen und Puffer
- Variantensuche, ECTS und Sortierung
- Leistung
- Zeitzone und ICS-Export
- Favoriten und Backup
