/*
 * Nachbearbeitung nach dem Citavi-Import
 * ---------------------------------------
 * Einzufügen in Zotero unter: Werkzeuge -> Entwickler -> JavaScript ausführen
 * Haken bei "Async" setzen, dann "Run".
 *
 * Das Skript braucht KEINE Citavi-Datei. Es arbeitet nur mit dem, was der
 * erweiterte Importfilter in "Extra" und in die Notizen geschrieben hat.
 *
 * Version 2. Es erledigt, was sich beim Import selbst nicht setzen lässt:
 *   1. Beiträge mit ihren Sammelwerken als "Zugehörig" verknüpfen
 *   2. die beiden Verweisnotizen verknüpfen, die zu derselben Bezugnahme
 *      gehören -- die Quellen selbst bleiben dabei unverknüpft
 *   3. Erstellungs- und Änderungsdatum aus Citavi zurückschreiben
 *   4. je Kategoriensammlung eine Gliederungsnotiz in Citavi-Reihenfolge
 *   5. die technischen Hilfszeilen aus dem Feld "Extra" entfernen
 *
 * Am Ende zählt es den Bestand durch. Liegt kennzahlen.json aus dem
 * Exportmakro vor, vergleicht es Soll und Ist selbst.
 *
 * VORHER: Zotero-Datenverzeichnis sichern und die Synchronisation abschalten.
 */

const CONFIG = {
	// Nur diese Sammlung bearbeiten. Leer lassen = ganze Bibliothek.
	collectionName: "",
	// Erstellungs- und Änderungsdatum aus Citavi zurückschreiben.
	// Notwendig: Zotero entfernt dateAdded und dateModified beim Import
	// absichtlich aus allem, was ein Importfilter liefert (ItemSaver,
	// _copyJSONItemForImport). In der Bibliothek steht nach dem Import
	// deshalb der Importzeitpunkt. Bestätigt am 01.10.2026 mit Zotero 10.0.3.
	// Das Skript holt die Werte aus "Citavi-Erstellt"/"Citavi-Geaendert" im
	// Feld "Extra" und aus der Fußzeile "Citavi: erstellt …" der Notizen.
	// Der Lauf geht über alle Notizen und dauert entsprechend.
	restoreDates: true,
	// "Zugehörig" für die Beziehung Sammelwerk <-> Beitrag setzen.
	// Das ist eine echte Werkbeziehung und gehört in dieses Feld.
	relateParentWorks: true,
	// Inhaltliche Verweise zwischen Titeln NICHT als "Zugehörig" setzen.
	// Sie stehen vollständig in der Notiz "Verweise aus Citavi", mit
	// Richtung, Bewertung, Seitenzahl und Kommentar. Als "Zugehörig"
	// wären sie von einer Sammelwerksbeziehung nicht zu unterscheiden
	// und würden das Feld unbrauchbar machen.
	relateReferenceLinks: false,
	// Stattdessen: die beiden Verweisnotizen miteinander verknüpfen, die zu
	// derselben Bezugnahme gehören. Das bildet die Citavi-Beziehung ab, ohne
	// auf Werkebene eine Nähe zu behaupten, die es nicht gibt.
	// Die Zuordnung läuft über die Zeile "Citavi-Verweise" im Feld "Extra".
	// Innerhalb eines Laufs ist das unkritisch, weil cleanUp erst danach
	// kommt. Nach einem früheren Lauf mit cleanUp: true ist die Zeile weg
	// und es lässt sich nichts mehr verknüpfen.
	relateReferenceNotes: true,
	// Die technischen Hilfszeilen nach getaner Arbeit aus "Extra" entfernen.
	// Läuft erst ganz am Ende, nachdem alle Verknüpfungen gesetzt sind.
	// "Citavi-Erstellt" und "Citavi-Geaendert" bleiben dabei stehen.
	// Bei der Fehlersuche auf false setzen, dann bleiben auch die
	// Citavi-Kennungen erhalten und der Lauf lässt sich wiederholen.
	cleanUp: true,
	// Je Kategoriensammlung eine Einzelnotiz "Gliederung aus Citavi: …" mit
	// den Wissenselementen in der Reihenfolge des Citavi-Wissensorganisators,
	// jeweils mit Link zur Notiz. Ein erneuter Lauf ersetzt vorhandene
	// Gliederungsnotizen (Tag #Gliederung), statt neue anzulegen.
	outlineNotes: true,
	// Sollwerte aus dem Exportmakro für den automatischen Vergleich.
	// Leer lassen, wenn kein Vergleich gewünscht ist.
	sollwerteDatei: "C:\\Temp\\Citavi-Migration\\kennzahlen.json",
	// Nichts schreiben, nur berichten. Für die Fehlersuche auf true setzen:
	// dann meldet das Skript, was es tun würde, ohne etwas zu verändern.
	dryRun: false
};

const log = [];
function say(s) {
	log.push(s);
}

// ---------------------------------------------------------------- einsammeln
const libraryID = Zotero.Libraries.userLibraryID;

let items;
if (CONFIG.collectionName) {
	const collections = Zotero.Collections.getByLibrary(libraryID, true)
		.filter(c => c.name === CONFIG.collectionName);
	if (!collections.length) {
		return "Sammlung nicht gefunden: " + CONFIG.collectionName;
	}
	// Achtung: liefert nur die Einträge der Sammlung, nicht deren Notizen.
	// Die Verknüpfungen werden korrekt gesetzt, der Abnahmebericht am Ende
	// zählt dann aber keine Notizen mit. Für die Abnahme leer lassen.
	items = collections[0].getChildItems();
	say("Sammlung: " + CONFIG.collectionName + " mit " + items.length + " Einträgen");
}
else {
	const ids = await Zotero.Items.getAll(libraryID);
	items = ids;
	say("Ganze Bibliothek: " + items.length + " Objekte");
}

// Citavi-Id -> Zotero-Item
const byCitaviId = new Map();
const withExtra = [];

for (const item of items) {
	if (item.isNote() || item.isAttachment()) continue;
	const extra = item.getField("extra") || "";
	const m = /^Citavi-ID:\s*(\S+)/m.exec(extra);
	if (!m) continue;
	byCitaviId.set(m[1], item);
	withExtra.push(item);
}
say("Einträge mit Citavi-ID: " + byCitaviId.size);

// ------------------------------------------------------------------- Datum
let dateCount = 0;
let relationCount = 0;
let noteDateCount = 0;

function extraValue(extra, key) {
	const m = new RegExp("^" + key + ":\\s*(.+)$", "m").exec(extra);
	return m ? m[1].trim() : null;
}

// Citavi-Zeitstempel in Zoteros Format (UTC) bringen.
// "01.10.2026 21:30:41" (Filter v2): Ortszeit des Rechners, wird umgerechnet.
// "2026-10-01 19:30:41" (Filter v1): UTC, wie Citavi 6 und 7 speichern.
// Das Skript muss deshalb auf demselben Rechner bzw. in derselben Zeitzone
// laufen wie der Import. In der Stunde der Umstellung auf Winterzeit kann
// die Umrechnung um eine Stunde danebenliegen.
function toUtcSql(value) {
	if (!value) return null;
	const v = value.trim();
	const de = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(v);
	if (de) {
		const local = new Date(+de[3], de[2] - 1, +de[1], +de[4], +de[5], +de[6]);
		return local.toISOString().replace("T", " ").slice(0, 19);
	}
	const iso = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?: (UTC|Ortszeit))?$/.exec(v);
	if (!iso) return null;
	if (iso[2] !== "Ortszeit") return iso[1];
	const local = new Date(iso[1].replace(" ", "T"));
	return local.toISOString().replace("T", " ").slice(0, 19);
}

// Für den Soll-Ist-Vergleich: Citavi-Titel zählen. "Citavi-ID" fehlt nach
// einem früheren Lauf mit cleanUp, "Citavi-Erstellt" bleibt immer stehen.
const citaviTitel = items.filter(i => !i.isNote() && !i.isAttachment()
	&& /^Citavi-(ID|Erstellt):/m.test(i.getField("extra") || "")).length;
// Sammelwerksbezüge zählen, bevor cleanUp die Zeile entfernt. Nach einem
// früheren Aufräumlauf sind sie nicht mehr zählbar (null).
const sammelwerkAnker = withExtra.length
	? withExtra.filter(i => extraValue(i.getField("extra") || "", "Citavi-Sammelwerk")).length
	: null;

// Datum der Einträge. Läuft über alle Einträge mit "Citavi-Erstellt" bzw.
// "Citavi-Geaendert". Diese Zeilen bleiben auch nach cleanUp stehen, ein
// erneuter Lauf findet die Einträge also wieder. Gezählt wird nur, was sich
// tatsächlich ändert.
if (CONFIG.restoreDates) {
	for (const item of items) {
		if (item.isNote() || item.isAttachment()) continue;
		const extra = item.getField("extra") || "";
		const created = toUtcSql(extraValue(extra, "Citavi-Erstellt"));
		const modified = toUtcSql(extraValue(extra, "Citavi-Geaendert"));
		if (!created && !modified) continue;
		if ((!created || item.dateAdded === created) && (!modified || item.dateModified === modified)) continue;
		dateCount++;
		if (CONFIG.dryRun) continue;
		if (created) item.dateAdded = created;
		if (modified) item.dateModified = modified;
		await item.saveTx({ skipDateModifiedUpdate: true });
	}
}

for (const item of withExtra) {
	const extra = item.getField("extra") || "";
	let changed = false;

	const targets = [];
	if (CONFIG.relateParentWorks) {
		const parent = extraValue(extra, "Citavi-Sammelwerk");
		if (parent) targets.push(parent);
	}
	if (CONFIG.relateReferenceLinks) {
		const links = extraValue(extra, "Citavi-Verweise");
		if (links) targets.push(...links.split(/\s+/));
	}

	{
		for (const targetId of targets) {
			const other = byCitaviId.get(targetId);
			if (!other) {
				say("  kein Gegenstück für " + targetId + " (bei: " + item.getField("title") + ")");
				continue;
			}
			if (item.relatedItems.includes(other.key)) continue;
			if (!CONFIG.dryRun) {
				item.addRelatedItem(other);
				other.addRelatedItem(item);
			}
			relationCount++;
			changed = true;
		}
	}

	if (changed && !CONFIG.dryRun) {
		await item.saveTx({ skipDateModifiedUpdate: true });
	}
}

// --------------------------------------------- Verweisnotizen verknüpfen
let noteRelationCount = 0;
let notesWithoutCounterpart = 0;

if (CONFIG.relateReferenceNotes) {
	// Je Eintrag die Notiz mit dem Tag #Verweis einsammeln
	const verweisNote = new Map();
	for (const [cid, item] of byCitaviId) {
		for (const noteID of item.getNotes()) {
			const note = await Zotero.Items.getAsync(noteID);
			if (note.getTags().some(t => t.tag === "#Verweis")) {
				verweisNote.set(cid, note);
				break;
			}
		}
	}
	say("Verweisnotizen gefunden: " + verweisNote.size);

	const touched = new Set();
	// Jede Bezugnahme kommt von beiden Seiten vorbei. Im Probelauf wird nichts
	// geschrieben, also greift die Dublettenprüfung über relatedItems nicht --
	// deshalb hier ein eigenes Gedächtnis, sonst zählt der Bericht doppelt.
	const gesehen = new Set();
	for (const [cid, item] of byCitaviId) {
		const links = extraValue(item.getField("extra") || "", "Citavi-Verweise");
		if (!links) continue;
		const a = verweisNote.get(cid);
		if (!a) continue;

		for (const targetId of links.split(/\s+/)) {
			const b = verweisNote.get(targetId);
			if (!b) {
				notesWithoutCounterpart++;
				continue;
			}
			if (a.key === b.key) continue;
			const paar = [a.key, b.key].sort().join("|");
			if (gesehen.has(paar)) continue;
			gesehen.add(paar);
			if (a.relatedItems.includes(b.key)) continue;
			if (!CONFIG.dryRun) {
				a.addRelatedItem(b);
				b.addRelatedItem(a);
				touched.add(a);
				touched.add(b);
			}
			noteRelationCount++;
		}
	}
	if (!CONFIG.dryRun) {
		for (const note of touched) {
			await note.saveTx({ skipDateModifiedUpdate: true });
		}
	}
}

// ------------------------------------------------------- Datum der Notizen
if (CONFIG.restoreDates) {
	// Alle Notizen mit der Fußzeile "Citavi: erstellt …", an Titeln und als
	// Einzelnotiz. Unabhängig von der Citavi-ID, die cleanUp entfernt.
	for (const note of items) {
		if (!note.isNote()) continue;
		{
			const html = note.getNote();
			const zeit = "\\d{2}\\.\\d{2}\\.\\d{4} [\\d:]+|[\\d-]+ [\\d:]+(?: UTC| Ortszeit)?";
			const m = new RegExp("Citavi: erstellt (" + zeit + "), geändert (" + zeit + "|\\?)").exec(html);
			if (!m) continue;
			const created = toUtcSql(m[1]);
			const modified = m[2] === "?" ? null : toUtcSql(m[2]);
			if (!created) continue;
			if (note.dateAdded === created && (!modified || note.dateModified === modified)) continue;
			noteDateCount++;
			if (CONFIG.dryRun) continue;

			// Die Fußzeile "Citavi: erstellt ..." bleibt stehen, auch bei
			// cleanUp: sie ist der einzige Ort, an dem diese Angabe an der
			// Notiz überlebt, und cleanUp räumt nur technische Hilfszeilen weg.
			note.dateAdded = created;
			if (modified) note.dateModified = modified;
			await note.saveTx({ skipDateModifiedUpdate: true });
		}
	}
}

// -------------------------------------------------------- Gliederungsnotizen
let outlineNew = 0;
let outlineReplaced = 0;

function escapeHtml(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function unescapeHtml(s) {
	return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

if (CONFIG.outlineNotes) {
	// Wissenselemente je Kategorie aus der Typzeile einsammeln:
	// [Typ | … | Kategorie 2.1 Begriffe [2.1], Position 1 | … | Citavi-ID …]
	const byCategory = new Map();
	for (const item of items) {
		if (!item.isNote()) continue;
		const html = item.getNote();
		const line = /<strong>\[(.*)\]<\/strong>/.exec(html);
		if (!line) continue;
		const bits = line[1].split(" | ");
		const kern = (/<h1>([\s\S]*?)<\/h1>/.exec(html) || [null, "(ohne Kernaussage)"])[1];
		let beleg = "ohne Titelbezug";
		if (item.parentItemID) {
			const parent = await Zotero.Items.getAsync(item.parentItemID);
			const jahr = (parent.getField("date") || "").slice(0, 4);
			beleg = escapeHtml([parent.getField("firstCreator"), jahr].filter(Boolean).join(" ")
				|| parent.getField("title"));
		}
		for (const bit of bits) {
			const m = /^Kategorie (.*?)(?:, Position (\d+))?$/.exec(bit);
			if (!m) continue;
			const pfad = unescapeHtml(m[1]);
			if (!byCategory.has(pfad)) byCategory.set(pfad, []);
			byCategory.get(pfad).push({
				pos: m[2] === undefined ? Infinity : parseInt(m[2], 10),
				key: item.key, kern, typ: bits[0], beleg
			});
		}
	}

	const allCollections = Zotero.Collections.getByLibrary(libraryID, true);
	for (const [pfad, liste] of byCategory) {
		const targets = allCollections.filter(c => c.name === pfad);
		if (!targets.length) {
			say("  keine Sammlung für Kategorie " + pfad);
			continue;
		}
		if (targets.length > 1) {
			say("  Achtung: " + targets.length + " Sammlungen heißen „" + pfad + "“, die Gliederung kommt in jede");
		}
		liste.sort((a, b) => a.pos - b.pos);
		const html = "<h1>Gliederung aus Citavi: " + escapeHtml(pfad) + "</h1>\n<ol>\n"
			+ liste.map(e => '<li><a href="zotero://select/library/items/' + e.key + '">' + e.kern + "</a>"
				+ " – " + e.typ + " – " + e.beleg + "</li>").join("\n")
			+ "\n</ol>";
		for (const collection of targets) {
			let existing = null;
			for (const child of collection.getChildItems(false)) {
				if (child.isNote() && child.getTags().some(t => t.tag === "#Gliederung")) existing = child;
			}
			if (CONFIG.dryRun) {
				if (existing) outlineReplaced++; else outlineNew++;
				continue;
			}
			if (existing) {
				existing.setNote(html);
				await existing.saveTx();
				outlineReplaced++;
			}
			else {
				const note = new Zotero.Item("note");
				note.libraryID = libraryID;
				note.setNote(html);
				note.addTag("#Gliederung");
				note.setCollections([collection.id]);
				await note.saveTx();
				outlineNew++;
			}
		}
	}
}

// --------------------------------------------------------------- Aufräumen
// Bewusst als letzter Schritt: die Zeilen "Citavi-ID", "Citavi-Sammelwerk"
// und "Citavi-Verweise" werden von den Schritten davor noch gebraucht.
let cleaned = 0;
if (CONFIG.cleanUp && !CONFIG.dryRun) {
	for (const item of withExtra) {
		const extra = item.getField("extra") || "";
		const neu = extra
			.split("\n")
			.filter(line => !/^Citavi-(ID|Sammelwerk|Verweise):/.test(line))
			.join("\n");
		if (neu === extra) continue;
		item.setField("extra", neu);
		await item.saveTx({ skipDateModifiedUpdate: true });
		cleaned++;
	}
}

// ------------------------------------------------------------------ Bericht
say("");
say("Datum gesetzt bei Einträgen: " + dateCount + " (nur geänderte, bei erneutem Lauf 0)");
say("Datum gesetzt bei Notizen:   " + noteDateCount + " (nur geänderte, bei erneutem Lauf 0)");
say("Werkverknüpfungen gesetzt:    " + relationCount + " (nur Sammelwerk/Beitrag)");
say("Notizverknüpfungen gesetzt:   " + noteRelationCount + " (Verweisnotiz zu Verweisnotiz)");
say("Gliederungsnotizen:           " + outlineNew + " neu, " + outlineReplaced + " ersetzt");
say("Aufgeräumte Einträge:         " + cleaned);
if (notesWithoutCounterpart) {
	say("   ohne Gegenstück geblieben:  " + notesWithoutCounterpart
		+ " — das Gegenstück hat keine Verweisnotiz, meist weil es eine"
		+ " Kommentar-zu-Zitat-Beziehung ist statt einer zwischen Titeln.");
}
say(CONFIG.dryRun
	? "PROBELAUF - es wurde nichts geschrieben. Für den echten Lauf dryRun auf false setzen."
	: "Geschrieben.");

// ------------------------------------------------------------- Abnahme
// Zählt nach, was tatsächlich in der Bibliothek liegt. Diese Zahlen gegen
// kennzahlen.txt aus dem Citavi-Export halten.
say("");
say("=== Abnahme ===");

const typeCounter = {};
let noteTotal = 0;
let katTags = new Set();
const untyped = {};
const untypedSamples = [];
let katAssignments = 0;
let attachments = 0;
// Freie Gedanken: Wissenselemente ohne Titelbezug, als Einzelnotizen
// importiert und am Tag #Gedanke erkennbar
let gedanken = 0;
let gliederungen = 0;
let aufgaben = 0;

for (const item of items) {
	if (item.isAttachment()) {
		attachments++;
		continue;
	}
	if (!item.isNote()) continue;
	noteTotal++;
	const html = item.getNote();
	const m = /\[(Wörtliches Zitat|Indirektes Zitat|Zusammenfassung|Kommentar|Datei \/ ohne Zitattyp|Markierung|Kurzbeleg|Gedanke)/.exec(html);
	const key = m ? m[1] : "(ohne Typzeile)";
	typeCounter[key] = (typeCounter[key] || 0) + 1;
	if (!item.parentItemID && item.getTags().some(t => t.tag === "#Gedanke")) gedanken++;
	if (item.getTags().some(t => t.tag === "#todo")) aufgaben++;

	// Notizen ohne Typzeile aufschlüsseln: es müssen genau die sein, die
	// gar kein Wissenselement sind. Bleibt etwas unter "sonstige", fehlt
	// irgendwo eine Typzeile und das gehört angesehen.
	if (!m) {
		const tags = item.getTags().map(t => t.tag);
		let art = "sonstige";
		if (tags.includes("#Notes")) art = "Titelnotiz aus Citavi";
		else if (tags.includes("#TableOfContents")) art = "Inhaltsverzeichnis";
		else if (tags.includes("#Evaluation")) art = "Bewertung";
		else if (tags.includes("#todo")) art = "Aufgabe";
		else if (tags.includes("#Verweis")) art = "Verweisnotiz";
		else if (tags.includes("#Standorte")) art = "Standortnotiz";
		else if (tags.includes("#Gliederung")) { art = "Gliederungsnotiz"; gliederungen++; }
		untyped[art] = (untyped[art] || 0) + 1;
		if (art === "sonstige" && untypedSamples.length < 10) {
			untypedSamples.push(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90));
		}
	}
	for (const tag of item.getTags()) {
		if (tag.tag.startsWith("Kat/")) {
			katTags.add(tag.tag);
			katAssignments++;
		}
	}
}

say("Einträge mit Citavi-ID: " + byCitaviId.size);
say("Notizen gesamt:         " + noteTotal);
for (const k of Object.keys(typeCounter).sort()) {
	say("   " + String(typeCounter[k]).padStart(6) + "  " + k);
}
say("davon ohne Titelbezug:  " + gedanken + " (freie Gedanken als Einzelnotizen)");
say("Kategorien-Tags:        " + katAssignments + " Zuweisungen auf " + katTags.size + " Tags");
say("Anhänge:                " + attachments);
say("Sammlungen:             " + Zotero.Collections.getByLibrary(libraryID, true).length);

const ohneTyp = typeCounter["(ohne Typzeile)"] || 0;
say("");
say("Notizen ohne Typzeile, aufgeschlüsselt (" + ohneTyp + "):");
for (const k of Object.keys(untyped).sort()) {
	say("   " + String(untyped[k]).padStart(6) + "  " + k);
}
if (untypedSamples.length) {
	say("");
	say("Die nicht zuordenbaren, als Textanfang:");
	for (const x of untypedSamples) say("   " + x);
}
say("");
say((untyped.sonstige || 0) === 0
	? "OK: jede Notiz ist entweder ein Wissenselement mit Typzeile oder eine "
		+ "der erwarteten Zusatznotizen."
	: "PRÜFEN: " + untyped.sonstige + " Notizen lassen sich nicht zuordnen.");

// ------------------------------------------------------ Soll-Ist-Vergleich
if (CONFIG.sollwerteDatei) {
	let soll = null;
	try {
		const text = await Zotero.File.getContentsAsync(CONFIG.sollwerteDatei);
		soll = JSON.parse(String(text).replace(/^\uFEFF/, ""));
	}
	catch (e) {
		say("");
		say("Sollwerte nicht gelesen (" + CONFIG.sollwerteDatei + "): " + e.message);
	}
	if (soll) {
		const typSchluessel = {
			"Wörtliches Zitat": "DirectQuotation", "Indirektes Zitat": "IndirectQuotation",
			"Zusammenfassung": "Summary", "Kommentar": "Comment",
			"Datei / ohne Zitattyp": "None", "Markierung": "Highlight",
			"Kurzbeleg": "QuickReference", "Gedanke": "Gedanke"
		};
		const istTypen = {};
		for (const [label, n] of Object.entries(typeCounter)) {
			if (typSchluessel[label]) istTypen[typSchluessel[label]] = n;
		}
		const wissenIst = Object.values(istTypen).reduce((a, b) => a + b, 0);
		const sammlungenIst = Zotero.Collections.getByLibrary(libraryID, true)
			.filter(c => /^\d+(\.\d+)* /.test(c.name)).length;
		const zeilen = [
			["Titel", soll.titel, citaviTitel],
			["Beiträge mit Sammelwerk", soll.beitraegeMitSammelwerk, sammelwerkAnker],
			["Wissenselemente", soll.wissenselemente, wissenIst],
			["davon ohne Titelbezug", soll.ohneTitelbezug, gedanken],
			["Kategorienzuweisungen", soll.kategorienZuweisungen, katAssignments],
			["Kategorien / Sammlungen", soll.kategorien, sammlungenIst],
			["Aufgaben", soll.aufgaben, aufgaben]
		];
		for (const [key, n] of Object.entries(soll.zitattypen || {})) {
			zeilen.push(["   Zitattyp " + key, n, istTypen[key] || 0]);
		}
		let abweichungen = 0;
		say("");
		say("=== Soll-Ist-Vergleich mit " + CONFIG.sollwerteDatei + " ===");
		for (const [name, s, i] of zeilen) {
			if (s === undefined) continue;
			if (i === null) {
				say("   " + name.padEnd(28) + String(s).padStart(7) + "      –   nicht mehr prüfbar (Citavi-Kennungen schon aufgeräumt)");
				continue;
			}
			const ok = s === i;
			if (!ok) abweichungen++;
			say("   " + name.padEnd(28) + String(s).padStart(7) + String(i).padStart(7) + "   " + (ok ? "stimmt" : "WEICHT AB"));
		}
		if (CONFIG.collectionName) say("   Hinweis: Nur eine Sammlung bearbeitet, die Ist-Werte sind unvollständig.");
		say(abweichungen
			? "PRÜFEN: " + abweichungen + " Kennzahl(en) weichen ab. Liegt ein früherer Import in derselben Bibliothek?"
			: "OK: Alle Kennzahlen stimmen.");
	}
}

return log.join("\n");
