# Workaround für die verlustarme Migration von Citavi → Zotero

Ein Werkzeugsatz für den Umstieg von **Citavi auf Zotero unter Windows**, der Daten mitnimmt, die der Import bisher nicht überträgt.

Entstanden ist das Ganze durch Vibecoding mit Claude, in einer Reihe von Probeläufen an meinem eigenen Bestand. Die Hauptherausforderung war die Identifizierung der Citavi-Variablen und die Überlegung zum sinnvollen Einbinden in Zotero. Es ist nur ein **Workaround** für eigene Zwecke, den ich hier zur Verfügung stelle.

Getestet mit Citavi 7.4 und Zotero 10.0.3 an einem lokalen Projekt mit ca. 2000 Quellen und 2500 Wissenselementen.

---

## Was im Vergleich zum Standardimport damit zusätzlich migriert wird

|                                                                          | Standardimport | mit diesem Werkzeugsatz                                                        |
| ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| Art des Wissenselements (wörtlich, indirekt, Zusammenfassung, Kommentar) | fehlt          | als Zeile in der Notiz und als Tag                                             |
| Kategorienzuordnung der Wissenselemente                                  | fehlt          | als Tag mit Gliederungsnummer                                                  |
| Schlagwortzuordnung der Wissenselemente                                  | fehlt          | als Tag                                                                        |
| Position eines Zitats in seiner Kategorie                                | fehlt          | in der Notizzeile                                                              |
| Verweise zwischen Quellen                                                | fehlen         | als Notiz mit Richtung, Bewertung, Seite und Kommentar, beide Seiten verknüpft |
| Kommentar-zu-Zitat-Beziehungen                                           | fehlen         | als Zeile in beiden Notizen                                                    |
| Verknüpfung Sammelband ↔ Beitrag                                         | fehlt          | beidseitig als „Zugehörig"                                                     |
| Bezug der Aufgaben zum Titel                                             | fehlt          | in der Aufgabennotiz                                                           |
| Standorte über den ersten hinaus                                         | fehlen         | als Sammelnotiz mit Signaturen                                                 |
| Erstellungs- und Änderungsdatum                                          | Importdatum    | aus Citavi übernommen                                                          |
| Bildzitate und angehängte Dateien                                        | fehlen         | als Anhang am Titel                                                            |
| Rückbezug auf den Citavi-Datensatz                                       | fehlt          | Citavi-Kennung im Feld „Extra"                                                 |
| Titelzusatz, Paralleltitel, Medium, Zitierschlüssel                      | fehlen         | im Feld „Extra"                                                                |

Was durch die Standardmigration fehlt, ist in verschiedenen Dokumentationen festgehalten, z. B. bei der SUB Göttingen, der UB Greifswald und der ULB Münster. Allerdings können diese Elemente migriert werden, weil Citavi sie exportieren kann und es möglich ist, sie in Zotero einzubauen. Am wichtigsten ist dabei die Art des Wissenselements.

---

## Wie eine Notiz danach aussieht

```
Macht ist die Kontrolle von Ungewißheitszonen

[Wörtliches Zitat | S. 43 | Citavi-ID ee3f573f-0407-41d0-8386-8d1353024544]

„Die Macht eines Individuums oder einer Gruppe, kurz, 
eines sozialen Akteurs, ist so eine Funktion der Größe der 
Ungewißheitszone, die er durch sein Verhalten seinen Gegenspielern 
gegenüber kontrollieren kann. Aber nicht irgendeine Ungewißheitszone, 
wie wir bereits zu verstehen gegeben haben: diese muß auch relevant 
sein, sowohl in Bezug auf das zu behandelnde Problem, als auch 
hinsichtlich der Interessen der beteiligten Parteien.“

43

Citavi: erstellt 2019-04-12 16:21:30, geändert 2019-04-15 14:44:28
```

Die Notiz gehört zur Quelle: Crozier, Michel, und Erhard Friedberg (1979): *Macht und Organisation. Die Zwänge kollektiven Handelns.* Königstein im Taunus: Athenäum.

Nach der Migration steht die Angabe zum Zitattyp vor dem Zitattext. Sie wandert damit mit, wenn die Notiz in ein Textdokument kopiert wird.

Dazu bekommt die Notiz die Tags `Zitat/wörtlich` und `Schlagwort/CF1979`, also den Zitattyp und die Schlagwörter des Wissenselements.

War dem Wissenselement in Citavi eine Kategorie zugeordnet, kommen in der Typzeile die Kategorie und die Position innerhalb dieser Kategorie hinzu, dazu ein Tag der Form `Kat/5.4 Kapitel Theorie`. Im Beispiel oben fehlt beides, weil dieses Zitat keiner Kategorie zugeordnet war.

Die Art des Citavi-Wissenselements wird deshalb mit in den Text der Notiz übernommen, weil Anführungszeichen kein verlässliches Erkennungsmerkmal für wörtliche Zitate sind. Dies vermeidet den Fehler, dass eine Notiz sich nicht mehr einwandfrei als wörtliches Zitat erkennen lässt.

## Verknüpfungen von Beiträgen und Sammelbänden als verwandt

Ein zweites Problem bei der Migration war bisher, dass Beiträge und Sammelbände nicht mehr miteinander verknüpft waren. Dies ist insbesondere dann ein Problem, wenn das Projekt sehr viele Beiträge und Sammelbände enthält. Beiträge und Sammelbände werden in einem Schritt nach dem Import in Zotero wieder miteinander verknüpft.

Was nicht gemacht wurde: Quellen, die sich durch wechselseitige Verweise aufeinander beziehen, werden nicht als „verwandt" auf Werkebene gesetzt. Sonst wäre eine solche inhaltliche Bezugnahme von einer Sammelband-Beitrag-Beziehung nicht mehr zu unterscheiden. Dies wurde durch eine Notiz gelöst, die bei beiden Werken platziert ist und den wechselseitigen Verweis trägt. Diese Verweisnotizen sind miteinander verknüpft.

---

## Die Dateien für die Migration

| Datei                       | Was sie tut                                                                                         | Wo sie läuft                 |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| `citavi_export_gesamt.cs`   | exportiert das Projekt als XML, kopiert die Anhänge daneben, schreibt die Sollwerte für die Abnahme | Citavi, Makro-Editor         |
| `Citavi 5 XML erweitert.js` | erweiterter Importfilter                                                                            | Zotero, Ordner `translators` |
| `zotero-nachbearbeitung.js` | setzt die Verknüpfungen, räumt auf, zählt das Ergebnis nach                                         | Zotero, JavaScript-Konsole   |

Getestet wurde mit Citavi 7.4 für Windows und Zotero 10.0.3, an einem lokalen Projekt. Andere Versionen oder Cloud-Projekte können funktionieren, sind aber nicht geprüft. Weitere Software wird nicht gebraucht.

---

## Ablauf

### 0. Sichern

Sicherungskopie des Citavi-Projekts anlegen. Zusätzlich empfehlen die Bibliotheken vier Archivformen als spätere Korrekturgrundlage: Tabelle nach Excel über `Strg`+`Alt`+`T`, Literaturliste mit angehängten Wissenselementen, Skript aus dem Programmteil „Wissen", Aufgabenliste.

In Zotero: Synchronisation abschalten und das Datenverzeichnis sichern. Für den ersten Durchlauf ist ein eigenes Datenverzeichnis sinnvoll (*Bearbeiten → Einstellungen → Erweitert → Dateien und Ordner*) — dann kostet ein Fehlschlag nur Zeit.

Keines der Werkzeuge schreibt ins Citavi-Projekt. Die Makros lesen nur.

### 1. Aus Citavi exportieren

`citavi_export_gesamt.cs` im Makro-Editor öffnen (`Alt`+`F11`) und ausführen. Der Zielordner steht oben in der Datei, voreingestellt ist `C:\Temp\Citavi-Migration`.

Danach liegen dort:

- `projekt.xml` — der vollständige Export, bei 2.177 Titeln rund 23 MB
- die Anhangdateien, flach daneben kopiert
- `kennzahlen.txt` — die Sollwerte, an denen sich später ablesen lässt, ob alles angekommen ist

**Diesen Ordner nach dem Export nicht verändern.** Der Importfilter sucht Anhänge relativ zur XML-Datei, sie müssen unmittelbar daneben liegen, nicht in einem Unterordner.

### 2. Erweiterten Importfilter in Zotero einbauen

Zotero schließen. `Citavi 5 XML erweitert.js` nach `[Zotero-Datenverzeichnis]\translators\` kopieren. Zotero starten.

Wurde das Datenverzeichnis gerade erst gewechselt, muss Zotero einmal gestartet und wieder geschlossen werden, damit der Ordner `translators` überhaupt angelegt wird.

Der erweiterte Filter hat eine eigene Kennung und eine höhere Priorität als das Original, sollte also automatisch gewählt werden. Wählt Zotero trotzdem den alten, dann das Original `Citavi 5 XML.js` vorübergehend aus dem Ordner nehmen.

### 3. In Zotero importieren

*Datei → Importieren → Eine Datei* → `projekt.xml`, mit der Option „Importierte Sammlungen und Einträge in neue Sammlungen einstellen".

Der Import kann je nach Größe des Projektes eine ganze Weile dauern. Es gibt einen Statusbalken, der den Fortschritt anzeigt.

Nach dem Import empfiehlt es sich, Zotero einmal zu schließen und wieder zu öffnen, bevor es weitergeht. Andernfalls zeigt die Oberfläche mitunter Dubletten an, die in den Daten gar nicht vorhanden sind.

### 4. Zotero-Import nacharbeiten mit JavaScript

Einiges lässt sich beim Import selbst nicht setzen, etwa Verknüpfungen zwischen Einträgen. Das erledigt ein Skript im Anschluss.

*Werkzeuge → Entwickler → Run JavaScript* öffnen, Haken bei *Als async-Funktion ausführen* setzen, Inhalt von `zotero-nachbearbeitung.js` bei *Code:* einfügen, auf *Ausführen* klicken.

Das Skript setzt die Verknüpfungen, entfernt anschließend die technischen Hilfszeilen aus dem Feld „Extra" und zählt am Ende den gesamten Bestand durch. Diesen Bericht gegen `kennzahlen.txt` aus Schritt 1 halten — dort stehen die Sollwerte aus Citavi.

Danach sind alle Beiträge mit ihren Sammelbände verknüpft, und die zusammengehörenden Verweisnotizen zeigen aufeinander.

Danach die Synchronisation gegebenenfalls wieder einschalten und das Datenverzeichnis sichern.

---

## Bei der Fehlersuche

Zwei Schalter helfen, wenn etwas nicht aufgeht.

Im Nachbearbeitungs-Skript `dryRun` auf `true` setzen: Dann schreibt das Skript nichts, sondern meldet nur, was es tun würde, und zählt den Bestand durch. So lässt sich der Bericht gegen `kennzahlen.txt` halten, bevor irgendetwas verändert wird.

`cleanUp` auf `false` setzen: Dann bleiben die Zeilen `Citavi-ID`, `Citavi-Sammelwerk` und `Citavi-Verweise` im Feld „Extra" stehen. Solange sie dort stehen, bleibt jeder Zotero-Eintrag auf seinen Citavi-Datensatz rückführbar und das Skript lässt sich beliebig oft wiederholen. Erst ein Lauf mit `cleanUp: true` entfernt sie. `Citavi-Erstellt` und `Citavi-Geaendert` bleiben in jedem Fall stehen.

Es spricht auch nichts dagegen, `cleanUp` dauerhaft auf `false` zu lassen und die Kennungen zu behalten.

---

## Grenzen

**Mit dem Citavi-Word-Add-In gesetzte Nachweise** lassen sich nicht umwandeln. Entweder alle Quellenangaben in einer Kopie des Dokuments neu setzen, oder bei Autor-Jahr-Stil mit Zotero weiterzitieren und die Citavi-Titel nachträglich ins Verzeichnis aufnehmen. Bei numerischen Stilen geht nur der erste Weg.

**Selbst erstellte Zitationsstile** müssen in Zotero als CSL neu gebaut oder durch einen vorhandenen Stil ersetzt werden.

**Zotero kennt keine Tag-Hierarchie.** Die Kategorien landen als flache Tags mit Gliederungsnummer im Namen, nicht als Baum. Die Sammlungen dagegen sind verschachtelt.

**Die Wissensorganisation von Citavi hat kein Gegenstück.** Notizen sind in Zotero Kindobjekte und können nicht selbst in Sammlungen liegen. Was in Citavi der Kategorienbaum über die Wissenselemente war, wird hier zu Tag-Suchen. Die Position innerhalb der Kategorie steht in der Notizzeile, die Reihenfolge lässt sich damit rekonstruieren, aber nicht als Gliederung bedienen.

**Nur getestet mit einem lokalen Projekt.** Ob der Export bei Cloud-Projekten gleich arbeitet, ist offen.

**Von drei Kompatibilitätsstufen funktioniert nur eine.** `Citavi4` und `Citavi5` brechen in Zoteros Übersetzer mit einem JavaScript-Fehler ab. Das Makro benutzt deshalb fest `Citavi6`.

**Nicht getestet:** PDF-Anhänge als Standorte und PDF-Annotationen, weil das Testprojekt keine enthielt. Der Weg ist angelegt, aber ungeprüft. Rückmeldungen dazu sind willkommen.

---

## Haftungsausschluss

Diese Werkzeuge verändern Daten in Zotero und lesen ein Citavi-Projekt aus. Sie sind an einem einzigen Bestand erprobt worden und nicht systematisch getestet. Die Benutzung erfolgt auf eigene Gefahr, und zwar ausdrücklich ohne jede Gewährleistung für Richtigkeit, Vollständigkeit oder Eignung für einen bestimmten Zweck. Ich übernehme keine Verantwortung für Datenverlust oder Folgeschäden.

Vor der Anwendung deshalb: Sicherungskopie des Citavi-Projekts anlegen, das Zotero-Datenverzeichnis sichern, die Synchronisation abschalten. Schritt 0 im Ablauf beschreibt das genauer. Auch der Vergleich der Kennzahlen nach dem Import ersetzt keine eigene Prüfung des Ergebnisses.

Dieses Projekt steht in keiner Verbindung zu Lumivero beziehungsweise Swiss Academic Software, den Herausgebern von Citavi, und ebenso wenig zur Corporation for Digital Scholarship, die Zotero entwickelt. Es wird von keiner der beiden unterstützt oder geprüft. Citavi und Zotero werden hier nur zur Bezeichnung der Programme verwendet.

---

## Herkunft und Lizenz

`Citavi 5 XML erweitert.js` ist eine Bearbeitung des Importfilters `Citavi 5 XML.js` aus dem Projekt `zotero/translators` von Philipp Zumstein. Der ursprüngliche Lizenzblock steht unverändert in der Datei: **GNU Affero General Public License v3 oder später**. Die Erweiterung steht unter derselben Lizenz, und damit auch das gesamte Repository.

Das Citavi-Makro und das Nachbearbeitungsskript sind nach der Vorlage, die Citavis Makro-Editor beim Anlegen eines neuen Makros selbst einsetzt, entwickelt.

Hilfreich für das Verständnis des Citavi-Objektmodells war die Beispielsammlung [LUMIVERO/Macros](https://github.com/LUMIVERO/Macros), aus der allerdings kein Code übernommen wurde.
