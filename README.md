# Workaround für die verlustarme Migration von Citavi → Zotero (Version 2)

> **Version 2.** Neu gegenüber Version 1:
> - Import rund 70-mal schneller: rund 2.200 Einträge in etwa 50 Sekunden statt rund einer Stunde
> - Kategorien in der Reihenfolge des Citavi-Kategoriensystems, auch nach Umsortieren
> - freie Gedanken ohne Titelbezug werden übernommen
> - Sonderzeichen, Absätze, Formatierung und Aufzählungen in Zitaten bleiben erhalten
> - Erstellungs- und Änderungsdatum werden zuverlässig zurückgeschrieben, angezeigt in der Zeitzone des eigenen Rechners
> - Gliederungsnotizen je Kategorie, Bewertungen und Markierungen als Tags, Freitextfelder im Feld „Extra"
> - automatischer Soll-Ist-Vergleich nach dem Import

Ein Werkzeugsatz für den Umstieg von **Citavi auf Zotero unter Windows**, der Daten mitnimmt, die der Import bisher nicht überträgt.

Entstanden ist das Ganze durch Vibecoding mit Claude, in einer Reihe von Probeläufen an meinem eigenen Bestand. Die Hauptherausforderung war die Identifizierung der Citavi-Variablen und die Überlegung zum sinnvollen Einbinden in Zotero. Es ist nur ein **Workaround** für eigene Zwecke, den ich hier zur Verfügung stelle.

Getestet mit Citavi 7.4 und Zotero 10.0.3 an einem lokalen Projekt mit ca. 2000 Quellen und 2500 Wissenselementen sowie an einem kleinen Testprojekt mit gezielt gebauten Sonderfällen.

---

## Was im Vergleich zum Standardimport damit zusätzlich migriert wird

|                                                                          | Standardimport | mit diesem Werkzeugsatz                                                        |
| ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| Art des Wissenselements (wörtlich, indirekt, Zusammenfassung, Kommentar) | fehlt          | als Zeile in der Notiz und als Tag                                             |
| Reihenfolge der Kategorien                                               | nach Anlegedatum | wie im Citavi-Kategoriensystem                                               |
| Kategorienzuordnung der Wissenselemente                                  | fehlt          | als Tag mit Gliederungsnummer                                                  |
| Reihenfolge der Wissenselemente in einer Kategorie                        | fehlt          | in der Notizzeile und als Gliederungsnotiz in der Sammlung                     |
| Freie Gedanken ohne Titelbezug                                           | fehlen         | als Einzelnotiz, auch in den Sammlungen ihrer Kategorien                       |
| Schlagwortzuordnung der Wissenselemente                                  | fehlt          | als Tag                                                                        |
| Formatierung und Absätze in Zitaten                                      | gehen verloren | bleiben erhalten (Formatierung siehe Grenzen)                                  |
| Verweise zwischen Quellen                                                | fehlen         | als Notiz mit Richtung, Bewertung, Seite und Kommentar, beide Seiten verknüpft |
| Kommentar-zu-Zitat-Beziehungen                                           | fehlen         | als Zeile in beiden Notizen                                                    |
| Verknüpfung Sammelband ↔ Beitrag                                         | fehlt          | beidseitig als „Zugehörig"                                                     |
| Bezug der Aufgaben zum Titel                                             | fehlt          | in der Aufgabennotiz                                                           |
| Standorte über den ersten hinaus                                         | fehlen         | als Sammelnotiz mit Signaturen                                                 |
| Erstellungs- und Änderungsdatum                                          | Importdatum    | aus Citavi übernommen                                                          |
| Sternebewertung, Markierungen, Relevanz                                  | fehlen         | als Tags                                                                       |
| Freitextfelder                                                           | fehlen         | unter ihrer Bezeichnung im Feld „Extra"                                        |
| Bildzitate und angehängte Dateien                                        | fehlen         | als Anhang am Titel                                                            |
| Rückbezug auf den Citavi-Datensatz                                       | fehlt          | Citavi-Kennung im Feld „Extra"                                                 |
| Titelzusatz, Paralleltitel, Medium, Zitierschlüssel                      | fehlen         | im Feld „Extra"                                                                |

Was durch die Standardmigration fehlt, ist in verschiedenen Dokumentationen festgehalten, z. B. bei der SUB Göttingen, der UB Greifswald und der ULB Münster. Allerdings können diese Elemente migriert werden, weil Citavi sie exportieren kann und es möglich ist, sie in Zotero einzubauen. Am wichtigsten ist dabei die Art des Wissenselements.

---

## Wie eine Notiz danach aussieht

```
Macht ist die Kontrolle von Ungewißheitszonen

[Wörtliches Zitat | S. 43 | Kategorie 5.4 Kapitel Theorie, Position 2 | Citavi-ID ee3f573f-0407-41d0-8386-8d1353024544]

„Die Macht eines Individuums oder einer Gruppe, kurz, 
eines sozialen Akteurs, ist so eine Funktion der Größe der 
Ungewißheitszone, die er durch sein Verhalten seinen Gegenspielern 
gegenüber kontrollieren kann. […]“

43

Citavi: erstellt 12.04.2019 16:21:30, geändert 15.04.2019 14:44:28
```

Nach der Migration steht die Angabe zum Zitattyp vor dem Zitattext. Sie wandert damit mit, wenn die Notiz in ein Textdokument kopiert wird. Anführungszeichen sind kein verlässliches Erkennungsmerkmal für wörtliche Zitate, deshalb steht die Art des Wissenselements im Text der Notiz.

Dazu bekommt die Notiz Tags für den Zitattyp (`Zitat/wörtlich`), die Kategorie (`Kat/5.4 Kapitel Theorie`), die Schlagwörter und, falls gesetzt, die Relevanz. Die Zeiten in der Fußzeile und im Feld „Extra“ stehen in der Zeitzone des Rechners, auf dem importiert wird. Citavi speichert sie intern in UTC, der Filter rechnet sie beim Import um. Das Nachbearbeitungsskript rechnet sie für „Hinzugefügt“ und „Geändert“ zurück und sollte deshalb auf demselben Rechner laufen. In der Stunde der Umstellung auf Winterzeit kann das Datum um eine Stunde danebenliegen.

Ein **freier Gedanke**, also ein Wissenselement ohne Titel, kommt als Einzelnotiz mit der Typzeile `[Gedanke | ohne Titelbezug | …]` und dem Tag `#Gedanke`. Anders als Notizen an Titeln liegt er auch in den Sammlungen seiner Kategorien.

In jeder Kategoriensammlung liegt nach der Nachbearbeitung eine **Gliederungsnotiz** „Gliederung aus Citavi: 5.4 Kapitel Theorie“. Sie listet die Wissenselemente dieser Kategorie in der Reihenfolge des Citavi-Wissensorganisators, jeweils mit Link zur Notiz.

## Verknüpfungen von Beiträgen und Sammelbänden als verwandt

Beiträge und Sammelbände werden in einem Schritt nach dem Import in Zotero wieder miteinander verknüpft.

Was nicht gemacht wurde: Quellen, die sich durch wechselseitige Verweise aufeinander beziehen, werden nicht als „verwandt" auf Werkebene gesetzt. Sonst wäre eine solche inhaltliche Bezugnahme von einer Sammelband-Beitrag-Beziehung nicht mehr zu unterscheiden. Dies wurde durch eine Notiz gelöst, die bei beiden Werken platziert ist und den wechselseitigen Verweis trägt. Diese Verweisnotizen sind miteinander verknüpft.

## Warum es ein Nachbearbeitungsskript braucht

Ein Importfilter beschreibt in Zotero nur, was gespeichert werden soll. Das Speichern übernimmt Zotero selbst und entfernt dabei unter anderem Erstellungsdatum, Änderungsdatum und Verknüpfungen zwischen Einträgen. Diese Dinge setzt deshalb das Skript im Anschluss, über die Citavi-Kennungen, die der Filter ins Feld „Extra" schreibt.

---

## Die Dateien für die Migration

| Datei                          | Was sie tut                                                                                         | Wo sie läuft                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| `citavi_export_gesamt.cs`      | exportiert das Projekt als XML, kopiert die Anhänge daneben, schreibt die Sollwerte für die Abnahme | Citavi, Makro-Editor         |
| `Citavi 5 XML erweitert v2.js` | erweiterter Importfilter                                                                            | Zotero, Ordner `translators` |
| `zotero-nachbearbeitung.js`    | setzt Datum und Verknüpfungen, legt Gliederungsnotizen an, räumt auf, prüft das Ergebnis             | Zotero, JavaScript-Konsole   |

Weitere Software wird für die Migration nicht gebraucht.

---

## Ablauf

### 0. Sichern

Sicherungskopie des Citavi-Projekts anlegen. Zusätzlich empfehlen die Bibliotheken vier Archivformen als spätere Korrekturgrundlage: Tabelle nach Excel über `Strg`+`Alt`+`T`, Literaturliste mit angehängten Wissenselementen, Skript aus dem Programmteil „Wissen", Aufgabenliste.

In Zotero: Synchronisation abschalten und das Datenverzeichnis sichern. Für den ersten Durchlauf ist ein eigenes, leeres Datenverzeichnis sinnvoll (*Bearbeiten → Einstellungen → Erweitert → Dateien und Ordner*). Dann kostet ein Fehlschlag nur Zeit, und die automatische Abnahme zählt keine Einträge aus früheren Importen mit.

Keines der Werkzeuge schreibt ins Citavi-Projekt. Die Makros lesen nur.

### 1. Aus Citavi exportieren

`citavi_export_gesamt.cs` im Makro-Editor öffnen (`Alt`+`F11`) und ausführen. Der Zielordner steht oben in der Datei, voreingestellt ist `C:\Temp\Citavi-Migration`.

Danach liegen dort:

- `projekt.xml` — der vollständige Export, bei 2.177 Titeln rund 23 MB
- die Anhangdateien, flach daneben kopiert
- `kennzahlen.txt` — die Sollwerte zum Lesen
- `kennzahlen.json` — dieselben Sollwerte für den automatischen Vergleich

**Diesen Ordner nach dem Export nicht verändern.** Der Importfilter sucht Anhänge relativ zur XML-Datei, sie müssen unmittelbar daneben liegen, nicht in einem Unterordner.

### 2. Erweiterten Importfilter in Zotero einbauen

Zotero schließen. `Citavi 5 XML erweitert v2.js` nach `[Zotero-Datenverzeichnis]\translators\` kopieren. Zotero starten.

Wurde das Datenverzeichnis gerade erst gewechselt, muss Zotero einmal gestartet und wieder geschlossen werden, damit der Ordner `translators` überhaupt angelegt wird.

Der Filter hat dieselbe Kennung wie Version 1 und ein jüngeres Datum. Liegen beide Dateien im Ordner, verwendet Zotero Version 2. Wird sie entfernt, gilt wieder Version 1. Gegenüber dem Originalfilter von Zotero hat er die höhere Priorität und wird automatisch gewählt.

### 3. In Zotero importieren

*Datei → Importieren → Eine Datei* → `projekt.xml`, mit der Option „Importierte Sammlungen und Einträge in neue Sammlungen einstellen".

Der Import kann je nach Größe des Projektes eine Weile dauern. Es gibt einen Statusbalken, der den Fortschritt anzeigt.

Nach dem Import empfiehlt es sich, Zotero einmal zu schließen und wieder zu öffnen, bevor es weitergeht. Andernfalls zeigt die Oberfläche mitunter Dubletten an, die in den Daten gar nicht vorhanden sind.

### 4. Zotero-Import nacharbeiten mit JavaScript

*Werkzeuge → Entwickler → Run JavaScript* öffnen, Haken bei *Als async-Funktion ausführen* setzen, Inhalt von `zotero-nachbearbeitung.js` bei *Code:* einfügen, auf *Ausführen* klicken.

Das Skript schreibt das Citavi-Datum zurück, setzt die Verknüpfungen, legt die Gliederungsnotizen an und entfernt anschließend die technischen Hilfszeilen aus dem Feld „Extra". Am Ende zählt es den Bestand durch. Findet es `kennzahlen.json` (Pfad oben im Skript unter `sollwerteDatei`), vergleicht es Soll und Ist selbst und meldet je Kennzahl „stimmt" oder „WEICHT AB".

Danach die Synchronisation gegebenenfalls wieder einschalten und das Datenverzeichnis sichern.

---

## Schalter

**Im Importfilter** (Abschnitt `var CZ` oben in der Datei):

| Schalter | Standard | Wirkung |
|---|---|---|
| `keepFormatting` | an | Formatierung der Zitate übernehmen, soweit Citavi sie liefert |
| `ratingsAsTags` | an | Tags für Sternebewertung, Markierungen und Relevanz |
| `customFieldsToExtra` | an | Freitextfelder ins Feld „Extra" |
| `referencesIntoKnowledgeCategories` | aus | Titel zusätzlich in jede Sammlung, in der eines ihrer Wissenselemente steckt |

**Im Nachbearbeitungsskript** (Abschnitt `CONFIG`):

| Schalter | Standard | Wirkung |
|---|---|---|
| `restoreDates` | an | Citavi-Datum zurückschreiben |
| `outlineNotes` | an | Gliederungsnotizen je Kategoriensammlung |
| `sollwerteDatei` | `C:\Temp\Citavi-Migration\kennzahlen.json` | automatischer Soll-Ist-Vergleich, leer lassen zum Abschalten |
| `dryRun` | aus | nichts schreiben, nur berichten |
| `cleanUp` | an | technische Hilfszeilen am Ende entfernen |

## Bei der Fehlersuche

Im Nachbearbeitungsskript `dryRun` auf `true` setzen: Dann schreibt das Skript nichts, sondern meldet nur, was es tun würde, und zählt den Bestand durch.

`cleanUp` auf `false` setzen: Dann bleiben die Zeilen `Citavi-ID`, `Citavi-Sammelwerk` und `Citavi-Verweise` im Feld „Extra" stehen. Solange sie dort stehen, bleibt jeder Zotero-Eintrag auf seinen Citavi-Datensatz rückführbar und das Skript lässt sich beliebig oft wiederholen. `Citavi-Erstellt` und `Citavi-Geaendert` bleiben in jedem Fall stehen.

Wählt Zotero beim Import nicht die erwartete Filterfassung, hilft dieser Befehl in *Run JavaScript* (mit Haken bei „Als async-Funktion ausführen"):

```js
const t = await Zotero.Translators.get("b7f1a3d2-90c4-4e17-8a6f-2c5d4e9b1077");
return t.label + " | " + t.lastUpdated + " | " + t.path;
```

---

## Grenzen

**Mit dem Citavi-Word-Add-In gesetzte Nachweise** lassen sich nicht umwandeln. Entweder alle Quellenangaben in einer Kopie des Dokuments neu setzen, oder bei Autor-Jahr-Stil mit Zotero weiterzitieren und die Citavi-Titel nachträglich ins Verzeichnis aufnehmen. Bei numerischen Stilen geht nur der erste Weg.

**Selbst erstellte Zitationsstile** müssen in Zotero als CSL neu gebaut oder durch einen vorhandenen Stil ersetzt werden.

**Zotero kennt keine Tag-Hierarchie.** Die Kategorien landen als flache Tags mit Gliederungsnummer im Namen, nicht als Baum. Die Sammlungen dagegen sind verschachtelt.

**Die Sortierung der Sammlungen hängt an Zoteros „natürlicher Sortierung".** Sie ist standardmäßig an. Ohne sie stünde „3.2.10" vor „3.2.2".

**Die Wissensorganisation von Citavi hat kein volles Gegenstück.** Notizen an Titeln können in Zotero nicht selbst in Sammlungen liegen. Die Gliederungsnotizen machen die Reihenfolge wieder bedienbar, sind aber eine Liste, kein verschiebbarer Baum.

**Formatierung** wird übernommen, soweit Citavi sie im Export als HTML liefert: kursiv, fett, hoch- und tiefgestellt, Absätze, Zeilenumbrüche und Aufzählungen. Unterstreichungen fehlen in Citavis HTML und gehen verloren.

**Nur getestet mit lokalen Projekten.** Ob der Export bei Cloud-Projekten gleich arbeitet, ist offen.

**Von drei Kompatibilitätsstufen funktioniert nur eine.** `Citavi4` und `Citavi5` brechen in Zoteros Übersetzer mit einem JavaScript-Fehler ab. Das Makro benutzt deshalb fest `Citavi6`.

**Nicht getestet:** PDF-Anhänge als Standorte und PDF-Annotationen, weil das Testprojekt keine enthielt. Der Weg ist angelegt, aber ungeprüft. Rückmeldungen dazu sind willkommen.

---

## Haftungsausschluss

Diese Werkzeuge verändern Daten in Zotero und lesen ein Citavi-Projekt aus. Sie sind an einem einzigen Bestand und einem Testprojekt erprobt worden und nicht systematisch getestet. Die Benutzung erfolgt auf eigene Gefahr, und zwar ausdrücklich ohne jede Gewährleistung für Richtigkeit, Vollständigkeit oder Eignung für einen bestimmten Zweck. Ich übernehme keine Verantwortung für Datenverlust oder Folgeschäden.

Vor der Anwendung deshalb: Sicherungskopie des Citavi-Projekts anlegen, das Zotero-Datenverzeichnis sichern, die Synchronisation abschalten. Schritt 0 im Ablauf beschreibt das genauer. Auch der Vergleich der Kennzahlen nach dem Import ersetzt keine eigene Prüfung des Ergebnisses.

Dieses Projekt steht in keiner Verbindung zu Lumivero beziehungsweise Swiss Academic Software, den Herausgebern von Citavi, und ebenso wenig zur Corporation for Digital Scholarship, die Zotero entwickelt. Es wird von keiner der beiden unterstützt oder geprüft. Citavi und Zotero werden hier nur zur Bezeichnung der Programme verwendet.

---

## Herkunft und Lizenz

`Citavi 5 XML erweitert v2.js` ist eine Bearbeitung des Importfilters `Citavi 5 XML.js` aus dem Projekt `zotero/translators` von Philipp Zumstein. Der ursprüngliche Lizenzblock steht unverändert in der Datei: **GNU Affero General Public License v3 oder später**. Die Erweiterung steht unter derselben Lizenz, und damit auch das gesamte Repository.

Das Citavi-Makro und das Nachbearbeitungsskript sind nach der Vorlage, die Citavis Makro-Editor beim Anlegen eines neuen Makros selbst einsetzt, entwickelt.

Hilfreich für das Verständnis des Citavi-Objektmodells war die Beispielsammlung [LUMIVERO/Macros](https://github.com/LUMIVERO/Macros), aus der allerdings kein Code übernommen wurde.
