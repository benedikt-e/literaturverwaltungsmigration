/*
 * Nachbearbeitung nach dem Citavi-Import
 * ---------------------------------------
 * Einzufügen in Zotero unter: Werkzeuge -> Entwickler -> JavaScript ausführen
 * Haken bei "Async" setzen, dann "Run".
 *
 * Das Skript braucht KEINE Citavi-Datei. Es arbeitet nur mit dem, was der
 * erweiterte Importfilter in "Extra" und in die Notizen geschrieben hat.
 *
 * Es erledigt drei Dinge, die sich beim Import selbst nicht setzen lassen:
 *   1. Beiträge mit ihren Sammelwerken als "Zugehörig" verknüpfen
 *   2. die beiden Verweisnotizen verknüpfen, die zu derselben Bezugnahme
 *      gehören -- die Quellen selbst bleiben dabei unverknüpft
 *   3. die technischen Hilfszeilen aus dem Feld "Extra" entfernen
 *
 * Am Ende zählt es den Bestand durch. Diesen Bericht gegen kennzahlen.txt
 * aus dem Citavi-Export halten.
 *
 * VORHER: Zotero-Datenverzeichnis sichern und die Synchronisation abschalten.
 */

const CONFIG = {
	// Nur diese Sammlung bearbeiten. Leer lassen = ganze Bibliothek.
	collectionName: "",
	// Datum zurückschreiben. Im Regelfall nicht nötig: Der erweiterte
	// Importfilter setzt Erstellungs- und Änderungsdatum der Einträge schon
	// beim Import. Nur einschalten, wenn in der Bibliothek das Importdatum
	// steht statt des Citavi-Datums. Der Lauf geht dann über alle Notizen
	// und dauert entsprechend.
	restoreDates: false,
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

for (const item of withExtra) {
	const extra = item.getField("extra") || "";
	let changed = false;

	if (CONFIG.restoreDates) {
		const created = extraValue(extra, "Citavi-Erstellt");
		const modified = extraValue(extra, "Citavi-Geaendert");
		if (created && item.dateAdded !== created) {
			if (!CONFIG.dryRun) item.dateAdded = created;
			changed = true;
			dateCount++;
		}
		if (modified && !CONFIG.dryRun) {
			item.dateModified = modified;
		}
	}

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
	for (const item of withExtra) {
		for (const noteID of item.getNotes()) {
			const note = await Zotero.Items.getAsync(noteID);
			const html = note.getNote();
			const m = /Citavi: erstellt ([\d-]+ [\d:]+), geändert ([\d-]+ [\d:]+|\?)/.exec(html);
			if (!m) continue;
			noteDateCount++;
			if (CONFIG.dryRun) continue;

			// Die Fußzeile "Citavi: erstellt ..." bleibt stehen, auch bei
			// cleanUp: sie ist der einzige Ort, an dem diese Angabe an der
			// Notiz überlebt, und cleanUp räumt nur technische Hilfszeilen weg.
			note.dateAdded = m[1];
			if (m[2] !== "?") note.dateModified = m[2];
			await note.saveTx({ skipDateModifiedUpdate: true });
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
say("Datum gesetzt bei Einträgen: " + dateCount);
say("Datum gesetzt bei Notizen:   " + noteDateCount);
say("Werkverknüpfungen gesetzt:    " + relationCount + " (nur Sammelwerk/Beitrag)");
say("Notizverknüpfungen gesetzt:   " + noteRelationCount + " (Verweisnotiz zu Verweisnotiz)");
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

for (const item of items) {
	if (item.isAttachment()) {
		attachments++;
		continue;
	}
	if (!item.isNote()) continue;
	noteTotal++;
	const html = item.getNote();
	const m = /\[(Wörtliches Zitat|Indirektes Zitat|Zusammenfassung|Kommentar|Datei \/ ohne Zitattyp|Markierung|Kurzbeleg)/.exec(html);
	const key = m ? m[1] : "(ohne Typzeile)";
	typeCounter[key] = (typeCounter[key] || 0) + 1;

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

return log.join("\n");
