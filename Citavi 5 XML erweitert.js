{
	"translatorID": "b7f1a3d2-90c4-4e17-8a6f-2c5d4e9b1077",
	"label": "Citavi 5 XML (erweitert)",
	"creator": "Philipp Zumstein, Tomasz Najdek; Erweiterung: verlustarme Migration",
	"target": "xml",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 50,
	"configOptions": {
		"dataMode": "xml/dom",
		"async": true
	},
	"inRepository": false,
	"translatorType": 1,
	"lastUpdated": "2025-01-04 01:03:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


/*
TEST DATA can be found here:
 - Single reference (162 KB) text: https://gist.github.com/zuphilip/02d6478ace4636e4e090e348443c551e
 - Larger project (1221 KB): https://gist.github.com/zuphilip/76ce89ebbdac0386507b36cff3fd499a
 - Other project (1,11 MB): https://gist.github.com/anonymous/10fc363b6d79dae897e296a4327aa707
 - Citavi 6 project (935 KB): https://gist.github.com/zuphilip/00a4ec6df58ac24b68366e32531bae4b
 - Nested categories: (34 KB): https://gist.github.com/tnajdek/b2375e52b48c7bf82f9f592b4f2122f5
*/

function detectImport() {
	var text = Zotero.read(1000);
	return text.includes("<CitaviExchangeData");
}

// This maps the Citavi types to the Zotero types.
// https://www.citavi.com/sub/manual5/en/referencetypeselectiondialog.html
var typeMapping = {
	ArchiveMaterial: "manuscript", // Archivgut
	AudioBook: "book", // Hörbuch
	AudioOrVideoDocument: "document", // Ton- oder Filmdokument
	Book: "book", // Buch (Monographie)
	BookEdited: "book", // Buch (Sammelwerk)
	Broadcast: "tvBroadcast", // Radio- oder Fernsehsendung
	CollectedWorks: "book", // Schriften eines Autors
	ComputerProgram: "computerProgram", // Software
	ConferenceProceedings: "book", // Tagungsband
	Contribution: "bookSection", // Beitrag in ...
	ContributionInLegalCommentary: "bookSection", // Beitrag in Gesetzeskommentar
	CourtDecision: "case", // Gerichtsentscheid
	File: "manuscript", // Akte
	InternetDocument: "webpage", // Internetdokument
	InterviewMaterial: "interview", // Interviewmaterial
	JournalArticle: "journalArticle", // Zeitschriftenaufsatz
	Lecture: "presentation", // Vortrag
	LegalCommentary: "book", // Gesetzeskommentar
	Manuscript: "manuscript", // Manuskript
	Map: "map", // Geographische Karte
	Movie: "videoRecording", // Spielfilm
	MusicTrack: "audioRecording", // Musiktitel in ...
	MusicAlbum: "audioRecording", // Musikwerk / Musikalbum
	NewsAgencyReport: "report", // Agenturmeldung
	NewspaperArticle: "newspaperArticle", // Zeitungsartikel
	Patent: "patent", // Patentschrift
	PersonalCommunication: "email", // Persönliche Mitteilung
	PressRelease: "report", // Pressemitteilung
	RadioPlay: "podcast", // Hörspiel
	SpecialIssue: "book", // Sonderheft, Beiheft
	Standard: "report", // Norm
	StatuteOrRegulation: "statute", // Gesetz / Verordnung
	Thesis: "thesis", // Hochschulschrift
	Unknown: "document", // Unklarer Dokumententyp
	UnpublishedWork: "report" // Graue Literatur / Bericht / Report
};

// ===========================================================================
// ERWEITERUNG - alles ab hier ist Zusatz gegenueber dem Originalfilter.
// Zweck: die Informationen mitnehmen, die der Standardimport fallen laesst.
// ===========================================================================

var CZ = {
	// Sicherheitskritisch: Art des Wissenselements als sichtbare Zeile in der
	// Notiz. Nicht abschalten, wenn wissenschaftlich weitergearbeitet wird.
	typeLineInNote: true,
	// zusaetzlich als Tag an der Notiz, damit man danach filtern kann
	typeAsTag: true,
	// Kategorien und Schlagwoerter der Wissenselemente als Tags an der Notiz
	kiCategoriesAsTags: true,
	kiKeywordsAsTags: true,
	// Position des Wissenselements innerhalb seiner Kategorie mitschreiben
	categoryPositionInNote: true,
	// Erstellungs- und Aenderungsdatum aus Citavi uebernehmen
	keepDates: true,
	// Citavi-Kennungen ins Feld "Extra" bzw. in die Notiz schreiben.
	// Macht jeden Eintrag dauerhaft auf sein Citavi-Original rueckfuehrbar
	// und erlaubt spaetere Korrekturlaeufe. Kann man spaeter entfernen.
	writeCitaviIds: true,
	// Verweise zwischen Titeln als Sammelnotiz am Titel
	referenceLinksAsNote: true,
	// Kommentar-an-Zitat-Beziehungen in beide Notizen schreiben
	commentLinksInNotes: true,
	// alle Bibliotheksstandorte als Sammelnotiz (Zotero hat nur ein Signaturfeld)
	allLocationsAsNote: true,
	// Dateien, die als Wissenselement haengen (Bildzitate, Exzerpt-PDFs)
	knowledgeItemFilesAsAttachments: true,
	// weitere Titelfelder, die der Originalfilter ignoriert
	extraTitleFields: true,
	// Praefix fuer die Tags
	tagPrefixType: "Zitat/",
	tagPrefixCategory: "Kat/",
	tagPrefixKeyword: "Schlagwort/"
};

// Reihenfolge entspricht der Aufzaehlung QuotationType im Citavi-Objektmodell.
var czQuotationTypes = [
	{ key: "None", label: "Datei / ohne Zitattyp", tag: "ohne-Typ" },
	{ key: "DirectQuotation", label: "Wörtliches Zitat", tag: "wörtlich" },
	{ key: "IndirectQuotation", label: "Indirektes Zitat", tag: "indirekt" },
	{ key: "Summary", label: "Zusammenfassung", tag: "Zusammenfassung" },
	{ key: "Comment", label: "Kommentar", tag: "Kommentar" },
	{ key: "Highlight", label: "Markierung", tag: "Markierung" },
	{ key: "QuickReference", label: "Kurzbeleg", tag: "Kurzbeleg" }
];

var czKiCategories = {}; // Wissenselement-Id -> [{ path, position }]
var czKiKeywords = {}; // Wissenselement-Id -> [Name]
var czCategoryPath = {}; // Kategorie-Id -> "3.2 Feldzugang"
var czRefLabel = {}; // Titel-Id -> Kurzbeleg
var czKiLabel = {}; // Wissenselement-Id -> Kernaussage
var czKiParent = {}; // Wissenselement-Id -> Titel-Id
var czLinksByRef = {}; // Titel-Id -> [Verweis]
var czLinksByKi = {}; // Wissenselement-Id -> [Verweis]
var czRefType = {}; // Titel-Id -> Citavi-Dokumententyp

// RelationType aus dem Citavi-Objektmodell
var czRelationTypes = ["neutral", "positiv", "eher positiv", "eher negativ", "negativ"];

function czText(s) {
	return s === null || s === undefined ? "" : String(s);
}

function czEscape(s) {
	return czText(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// Citavi schreibt 2017-04-25T13:51:32, Zotero erwartet 2017-04-25 13:51:32
function czDate(s) {
	if (!s) return null;
	var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(s);
	return m ? m[1] + " " + m[2] : null;
}

// Eine OnetoN-Zeile hat die Form "quelleId;zielId:position;zielId:position"
function czParseOneToN(text) {
	var parts = czText(text).split(";");
	var result = { source: parts[0], targets: [] };
	for (var i = 1; i < parts.length; i++) {
		var piece = parts[i];
		var colon = piece.lastIndexOf(":");
		if (colon > 0 && /^\d+$/.test(piece.substr(colon + 1))) {
			result.targets.push({ id: piece.substr(0, colon), position: parseInt(piece.substr(colon + 1), 10) });
		}
		else {
			result.targets.push({ id: piece, position: null });
		}
	}
	return result;
}

// Kategoriennummern so berechnen, wie der Originalfilter die Sammlungen
// benennt, damit Tag und Sammlungsname zusammenpassen.
function czBuildCategoryPaths(doc) {
	var categories = ZU.xpath(doc, '//Categories/Category');
	var names = {};
	var order = [];
	for (let i = 0; i < categories.length; i++) {
		var cid = ZU.xpathText(categories[i], './@id');
		names[cid] = czText(ZU.xpathText(categories[i], './Name'));
		order.push(cid);
	}

	// Achtung: Die Zeile mit der Quelle 00000000-0000-0000-0000-000000000000
	// listet die Wurzelkategorien auf. Wer sie wie eine normale Elternzeile
	// behandelt, markiert damit jede Wurzel als Kind, bekommt eine leere
	// Wurzelliste und am Ende gar keine Pfade.
	var CZ_ROOT = "00000000-0000-0000-0000-000000000000";
	var childrenOf = {};
	var isChild = {};
	var hierarchy = ZU.xpath(doc, '//CategoryCategories/OnetoN');
	for (let i = 0; i < hierarchy.length; i++) {
		var row = czParseOneToN(hierarchy[i].textContent);
		var kids = [];
		for (let j = 0; j < row.targets.length; j++) {
			var kid = row.targets[j].id;
			if (names[kid] === undefined) continue;
			kids.push(kid);
			if (row.source != CZ_ROOT) isChild[kid] = true;
		}
		childrenOf[row.source] = kids;
	}

	function walk(ids, prefix) {
		var index = 1;
		for (let i = 0; i < ids.length; i++) {
			var id = ids[i];
			var number = prefix === null ? String(index) : prefix + "." + index;
			index++;
			czCategoryPath[id] = number + " " + names[id];
			if (childrenOf[id]) walk(childrenOf[id], number);
		}
	}

	// Wurzeln in der Reihenfolge, die auch der Originalfilter fuer die
	// Nummerierung der Sammlungen benutzt: Dokumentreihenfolge der Kategorien.
	var roots = [];
	for (let i = 0; i < order.length; i++) {
		if (!isChild[order[i]]) roots.push(order[i]);
	}
	walk(roots, null);
}

function czBuildIndexes(doc) {
	czBuildCategoryPaths(doc);

	// Kurzbelege der Titel, fuer lesbare Verweisnotizen
	var references = ZU.xpath(doc, '//References/Reference');
	for (let i = 0; i < references.length; i++) {
		var rid = ZU.xpathText(references[i], './@id');
		czRefLabel[rid] = czText(ZU.xpathText(references[i], './ShortTitle'))
			|| czText(ZU.xpathText(references[i], './Title'));
	}

	// Kernaussagen und Elternbezug der Wissenselemente
	var kis = ZU.xpath(doc, '//KnowledgeItems/KnowledgeItem');
	for (let i = 0; i < kis.length; i++) {
		var kid = ZU.xpathText(kis[i], './@id');
		czKiLabel[kid] = czText(ZU.xpathText(kis[i], './CoreStatement'));
		czKiParent[kid] = czText(ZU.xpathText(kis[i], './ReferenceID'));
	}

	// Kategorien der Wissenselemente, mit Position innerhalb der Kategorie
	var kiCats = ZU.xpath(doc, '//KnowledgeItemCategories/OnetoN');
	for (let i = 0; i < kiCats.length; i++) {
		var rowC = czParseOneToN(kiCats[i].textContent);
		var listC = czKiCategories[rowC.source] || (czKiCategories[rowC.source] = []);
		for (let j = 0; j < rowC.targets.length; j++) {
			var pathC = czCategoryPath[rowC.targets[j].id];
			if (pathC) listC.push({ path: pathC, position: rowC.targets[j].position });
		}
	}

	// Schlagwoerter der Wissenselemente
	var keywordNames = {};
	var keywords = ZU.xpath(doc, '//Keywords/Keyword');
	for (let i = 0; i < keywords.length; i++) {
		keywordNames[ZU.xpathText(keywords[i], './@id')] = czText(ZU.xpathText(keywords[i], './Name'));
	}
	var kiKw = ZU.xpath(doc, '//KnowledgeItemKeywords/OnetoN');
	for (let i = 0; i < kiKw.length; i++) {
		var rowK = czParseOneToN(kiKw[i].textContent);
		var listK = czKiKeywords[rowK.source] || (czKiKeywords[rowK.source] = []);
		for (let j = 0; j < rowK.targets.length; j++) {
			var nameK = keywordNames[rowK.targets[j].id];
			if (nameK) listK.push(nameK);
		}
	}

	// Verweise
	var links = ZU.xpath(doc, '//EntityLinks/EntityLink');
	for (let i = 0; i < links.length; i++) {
		var link = {
			indication: czText(ZU.xpathText(links[i], './Indication')),
			sourceId: czText(ZU.xpathText(links[i], './SourceID')),
			targetId: czText(ZU.xpathText(links[i], './TargetID')),
			sourceType: czText(ZU.xpathText(links[i], './SourceType')),
			targetType: czText(ZU.xpathText(links[i], './TargetType')),
			relation: czRelationTypes[parseInt(ZU.xpathText(links[i], './RelationType'), 10)] || "",
			page: czText(ZU.xpathText(links[i], './SourceData')),
			notes: czText(ZU.xpathText(links[i], './Notes'))
		};
		if (link.sourceType == "Reference" && link.targetType == "Reference") {
			(czLinksByRef[link.sourceId] || (czLinksByRef[link.sourceId] = [])).push(link);
			(czLinksByRef[link.targetId] || (czLinksByRef[link.targetId] = [])).push(link);
		}
		else if (link.sourceType == "KnowledgeItem" || link.targetType == "KnowledgeItem") {
			(czLinksByKi[link.sourceId] || (czLinksByKi[link.sourceId] = [])).push(link);
			(czLinksByKi[link.targetId] || (czLinksByKi[link.targetId] = [])).push(link);
		}
	}
}

// Die Kopfzeile, die den Zitattyp in der Notiz sichtbar macht.
function czNoteHeadline(node, kiId) {
	var raw = parseInt(ZU.xpathText(node, 'QuotationType'), 10);
	var typeInfo = czQuotationTypes[isNaN(raw) ? 0 : raw] || czQuotationTypes[0];
	var bits = [typeInfo.label];

	var pages = extractPages(ZU.xpathText(node, 'PageRange'));
	if (pages) bits.push("S. " + pages);

	if (CZ.categoryPositionInNote && czKiCategories[kiId]) {
		var cats = czKiCategories[kiId];
		for (let i = 0; i < cats.length; i++) {
			bits.push("Kategorie " + cats[i].path
				+ (cats[i].position === null ? "" : ", Position " + cats[i].position));
		}
	}
	if (CZ.writeCitaviIds) bits.push("Citavi-ID " + kiId);

	return { typeInfo: typeInfo, line: "[" + czEscape(bits.join(" | ")) + "]" };
}

function czNoteTags(kiId, typeInfo) {
	var tags = [];
	if (CZ.typeAsTag) tags.push(CZ.tagPrefixType + typeInfo.tag);
	if (CZ.kiCategoriesAsTags && czKiCategories[kiId]) {
		for (let i = 0; i < czKiCategories[kiId].length; i++) {
			tags.push(CZ.tagPrefixCategory + czKiCategories[kiId][i].path);
		}
	}
	if (CZ.kiKeywordsAsTags && czKiKeywords[kiId]) {
		for (let i = 0; i < czKiKeywords[kiId].length; i++) {
			tags.push(CZ.tagPrefixKeyword + czKiKeywords[kiId][i]);
		}
	}
	return tags;
}

// Kommentar-an-Zitat-Beziehungen als lesbare Zeile
function czCommentLinkLines(kiId) {
	if (!CZ.commentLinksInNotes || !czLinksByKi[kiId]) return "";
	var out = "";
	var list = czLinksByKi[kiId];
	for (let i = 0; i < list.length; i++) {
		var link = list[i];
		if (link.indication != "CommentOnQuotation") continue;
		if (link.sourceId == kiId) {
			out += "<p><em>Kommentar zu: " + czEscape(czKiLabel[link.targetId] || link.targetId) + "</em></p>\n";
		}
		else {
			out += "<p><em>Kommentiert durch: " + czEscape(czKiLabel[link.sourceId] || link.sourceId) + "</em></p>\n";
		}
	}
	return out;
}

// Sammelnotiz mit allen Verweisen eines Titels
function czLinkNote(refId) {
	if (!CZ.referenceLinksAsNote || !czLinksByRef[refId]) return null;
	var list = czLinksByRef[refId];
	var body = "<h1>Verweise aus Citavi</h1>\n";
	var count = 0;
	for (let i = 0; i < list.length; i++) {
		var link = list[i];
		var outgoing = link.sourceId == refId;
		var otherId = outgoing ? link.targetId : link.sourceId;
		var bits = [];
		bits.push(outgoing ? "verweist auf" : "wird verwiesen von");
		bits.push(czEscape(czRefLabel[otherId] || otherId));
		if (link.relation) bits.push("Bewertung: " + link.relation);
		if (link.page) bits.push("S. " + czEscape(link.page));
		body += "<p>" + bits.join(" | ") + "</p>\n";
		if (link.notes) body += "<blockquote>" + czEscape(link.notes) + "</blockquote>\n";
		if (CZ.writeCitaviIds) body += "<p><em>Citavi-ID des Gegenstücks: " + otherId + "</em></p>\n";
		count++;
	}
	return count ? { note: body, tags: ["#Verweis"] } : null;
}

// Alle Standorte eines Titels, weil Zotero nur ein Signaturfeld hat
function czLocationNote(doc, refId) {
	if (!CZ.allLocationsAsNote) return null;
	var locations = ZU.xpath(doc, '//Locations/Location[ReferenceID="' + refId + '"]');
	var rows = [];
	for (let j = 0; j < locations.length; j++) {
		var callNumber = czText(ZU.xpathText(locations[j], 'CallNumber'));
		var libraryId = czText(ZU.xpathText(locations[j], 'LibraryID'));
		if (!callNumber && !libraryId) continue;
		var library = libraryId ? czText(ZU.xpathText(doc.getElementById(libraryId), "Name")) : "";
		var note = czText(ZU.xpathText(locations[j], 'Notes'));
		rows.push("<p>" + czEscape(library) + (callNumber ? " — " + czEscape(callNumber) : "")
			+ (note ? " (" + czEscape(note) + ")" : "") + "</p>");
	}
	if (rows.length < 2) return null; // einer steht ohnehin im Signaturfeld
	return { note: "<h1>Standorte aus Citavi (" + rows.length + ")</h1>\n" + rows.join("\n"), tags: ["#Standorte"] };
}

// ===========================================================================
// Ende des Erweiterungsblocks, ab hier wieder der Originalfilter mit Zusaetzen
// ===========================================================================

async function importItems({ references, doc, citaviVersion, rememberTags, itemIdList, unfinishedReferences, progress }) {
	for (var i = 0, n = references.length; i < n; i++) {
		var type = ZU.xpathText(references[i], 'ReferenceType');
		let item;
		if (type && typeMapping[type]) {
			item = new Zotero.Item(typeMapping[type]);
		}
		else {
			Z.debug("Not yet supported type: " + type);
			Z.debug("Therefore use default type 'journalArticle'");
			item = new Zotero.Item("journalArticle");
		}
		item.itemID = ZU.xpathText(references[i], './@id');
		czRefType[item.itemID] = type; // Erweiterung: Citavi-Typ getrennt merken
		// Z.debug(item.itemID);

		item.title = ZU.xpathText(references[i], './Title');
		var subtitle = ZU.xpathText(references[i], './Subtitle');
		if (subtitle) {
			item.title += ": " + subtitle;
		}
		item.abstractNote = ZU.xpathText(references[i], './Abstract');
		item.url = ZU.xpathText(references[i], './OnlineAddress');
		item.volume = ZU.xpathText(references[i], './Volume');
		item.issue = ZU.xpathText(references[i], './Number');
		item.DOI = ZU.xpathText(references[i], './DOI');
		item.ISBN = ZU.xpathText(references[i], './ISBN');
		item.edition = ZU.xpathText(references[i], './Edition');
		item.place = ZU.xpathText(references[i], './PlaceOfPublication');
		item.numberOfVolumes = ZU.xpathText(references[i], './NumberOfVolumes');

		addExtraLine(item, "PMID", ZU.xpathText(references[i], './PubMedID'));
		addExtraLine(item, "Citation Key", ZU.xpathText(references[i], './BibTeXKey'));

		item.pages = extractPages(ZU.xpathText(references[i], './PageRange'));
		item.numPages = extractPages(ZU.xpathText(references[i], './PageCount'));

		item.date = ZU.xpathText(references[i], './DateForSorting')
			|| ZU.xpathText(references[i], './Date')
			|| ZU.xpathText(references[i], './Year');
		item.accessDate = ZU.xpathText(references[i], './AccessDate');

		// --- Erweiterung: Arbeitsspuren und Rueckbezug erhalten ---
		if (CZ.keepDates) {
			var czCreated = czDate(ZU.xpathText(references[i], './CreatedOn'));
			var czModified = czDate(ZU.xpathText(references[i], './ModifiedOn'));
			// Zotero ignoriert dateAdded/dateModified aus Importfiltern.
			// Getestet am 18.09.2026, Zotero 10.0.3: die Felder werden
			// stillschweigend mit dem Importzeitpunkt ueberschrieben.
			// Deshalb wandern die Werte als Text nach "Extra", von wo aus
			// das Nachbearbeitungsskript sie in die echten Felder setzt.
			if (czCreated) {
				item.dateAdded = czCreated;
				addExtraLine(item, "Citavi-Erstellt", czCreated);
			}
			if (czModified) {
				item.dateModified = czModified;
				addExtraLine(item, "Citavi-Geaendert", czModified);
			}
		}
		if (CZ.writeCitaviIds) {
			addExtraLine(item, "Citavi-ID", item.itemID);
		}
		if (CZ.extraTitleFields) {
			// Felder, die der Originalfilter nicht liest
			addExtraLine(item, "Citation Key", ZU.xpathText(references[i], './CitationKey'));
			addExtraLine(item, "Titelzusatz", ZU.xpathText(references[i], './TitleSupplement'));
			addExtraLine(item, "Paralleltitel", ZU.xpathText(references[i], './ParallelTitle'));
			addExtraLine(item, "Medium", ZU.xpathText(references[i], './StorageMedium'));
			var czLang = ZU.xpathText(references[i], './Language');
			if (czLang && !item.language) item.language = czLang;
		}

		for (var field of ['Notes', 'TableOfContents', 'Evaluation']) {
			var note = ZU.xpathText(references[i], './' + field);
			if (note) {
				item.notes.push({ note: note, tags: ["#" + field] });
			}
		}

		var seriesID = ZU.xpathText(references[i], './SeriesTitleID');
		if (seriesID) {
			item.series = ZU.xpathText(doc.getElementById(seriesID), './Name');
		}

		var periodicalID = ZU.xpathText(references[i], './PeriodicalID');
		if (periodicalID) {
			var periodical = doc.getElementById(periodicalID);
			item.publicationTitle = ZU.xpathText(periodical, './Name');
			item.ISSN = ZU.xpathText(periodical, './ISSN');
			item.journalAbbreviation = ZU.xpathText(periodical, './StandardAbbreviation')
				|| ZU.xpathText(periodical, './UserAbbreviation1')
				|| ZU.xpathText(periodical, './UserAbbreviation2');
		}

		var authors = ZU.xpathText(doc, '//ReferenceAuthors/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		attachPersons(doc, item, authors, "author");
		var editors = ZU.xpathText(doc, '//ReferenceEditors/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		attachPersons(doc, item, editors, "editor");
		var collaborators = ZU.xpathText(doc, '//ReferenceCollaborators/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		attachPersons(doc, item, collaborators, "contributor");
		var organizations = ZU.xpathText(doc, '//ReferenceOrganizations/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		attachPersons(doc, item, organizations, "contributor");

		var publishers = ZU.xpathText(doc, '//ReferencePublishers/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		if (publishers && publishers.length > 0) {
			item.publisher = attachName(doc, publishers).join('; ');
		}

		var keywords = ZU.xpathText(doc, '//ReferenceKeywords/OnetoN[starts-with(text(), "' + item.itemID + '")]');
		if (keywords && keywords.length > 0) {
			item.tags = attachName(doc, keywords);
		}
		if (rememberTags[item.itemID]) {
			for (var j = 0; j < rememberTags[item.itemID].length; j++) {
				item.tags.push(rememberTags[item.itemID][j]);
			}
		}

		// For all corresponding knowledge items attach a note containing
		// the information of it.
		var citations = ZU.xpath(doc, '//KnowledgeItem[ReferenceID="' + item.itemID + '"]');
		for (let j = 0; j < citations.length; j++) {
			var noteObject = {};
			noteObject.id = ZU.xpathText(citations[j], '@id');
			var title = ZU.xpathText(citations[j], 'CoreStatement');
			var text = ZU.xpathText(citations[j], 'Text');
			var pages = extractPages(ZU.xpathText(citations[j], 'PageRange'));
			noteObject.note = '';
			if (title) {
				noteObject.note += '<h1>' + title + "</h1>\n";
			}

			// --- Erweiterung: Art des Wissenselements sichtbar machen ---
			// Steht bewusst VOR dem Zitattext, damit sie beim Kopieren in
			// ein Textdokument mitwandert. Nicht jedes woertliche Zitat
			// traegt Anfuehrungszeichen, deshalb ist diese Zeile der
			// eigentliche Schutz gegen unabsichtliche Plagiate.
			var czHead = czNoteHeadline(citations[j], noteObject.id);
			if (CZ.typeLineInNote) {
				noteObject.note += "<p><strong>" + czHead.line + "</strong></p>\n";
			}

			if (text) {
				noteObject.note += "<p>" + ZU.xpathText(citations[j], 'Text') + "</p>\n";
			}
			if (pages) {
				noteObject.note += "<i>" + pages + "</i>";
			}

			// --- Erweiterung: Kommentar-an-Zitat-Beziehung ---
			noteObject.note += czCommentLinkLines(noteObject.id);

			// --- Erweiterung: Tags fuer Typ, Kategorie und Schlagwort ---
			noteObject.tags = (rememberTags[noteObject.id] || []).concat(czNoteTags(noteObject.id, czHead.typeInfo));

			// --- Erweiterung: Arbeitsspuren der Notiz ---
			if (CZ.keepDates) {
				var czKiCreated = czDate(ZU.xpathText(citations[j], 'CreatedOn'));
				var czKiModified = czDate(ZU.xpathText(citations[j], 'ModifiedOn'));
				if (czKiCreated) noteObject.dateAdded = czKiCreated;
				if (czKiModified) noteObject.dateModified = czKiModified;
				// Notizen haben kein Feld "Extra". Damit die Arbeitsspuren
				// nicht verloren gehen, stehen sie als Fusszeile in der Notiz.
				// Das Nachbearbeitungsskript liest sie von dort und kann die
				// Zeile danach entfernen.
				if (czKiCreated || czKiModified) {
					noteObject.note += "<p><em>Citavi: erstellt " + (czKiCreated || "?")
						+ ", geändert " + (czKiModified || "?") + "</em></p>\n";
				}
			}

			// --- Erweiterung: Dateien, die als Wissenselement haengen ---
			// (Bildzitate, Exzerpt-PDFs). Der Originalfilter sieht nur
			// Locations an, nicht KnowledgeItem/Address.
			if (CZ.knowledgeItemFilesAsAttachments) {
				var czAddress = ZU.xpathText(citations[j], 'Address');
				if (czAddress) {
					var czUri = czAddress;
					try {
						var czJson = JSON.parse(czAddress);
						czUri = czJson.UriString || czJson.OriginalString;
					}
					catch (e) {
						// Citavi 5 speichert die Adresse im Klartext
					}
					if (czUri) {
						var czTitle = title || ZU.xpathText(citations[j], 'ImageDescription') || "Citavi-Anhang";
						item.attachments.push(
							(czUri.indexOf('http://') === 0 || czUri.indexOf('https://') === 0)
								? { url: czUri, title: czTitle }
								: { path: czUri, title: czTitle }
						);
						noteObject.note += "<p><em>Zugehörige Datei: " + czEscape(czUri) + "</em></p>\n";
					}
				}
			}

			if (noteObject.note != "") {
				item.notes.push(noteObject);
			}
		}

		// Locations will be saved as URIs in attachments, DOI, extra etc.
		var locations = ZU.xpath(doc, '//Locations/Location[ReferenceID="' + item.itemID + '"]');
		// If we only have partial information about the callnumber or
		// library location, then we save this info in these two arrays
		// which will then processed after the for loop if no other info
		// was found.
		var onlyLibraryInfo = [];
		var onlyCallNumber = [];
		for (let j = 0; j < locations.length; j++) {
			var address = ZU.xpathText(locations[j], 'Address');
			if (address && citaviVersion[0] !== "5") {
				var jsonAddress = JSON.parse(address);
				// Z.debug(jsonAddress);
				address = jsonAddress.UriString;
			}
			var addressType = ZU.xpathText(locations[j], 'MirrorsReferencePropertyId');
			if (address) {
				if (addressType == "Doi" && !item.DOI) {
					item.DOI = address;
				}
				else if (addressType == "PubMedId" && ((item.extra && !item.extra.includes("PMID")) || !item.extra)) {
					addExtraLine(item, "PMID", address);
				}
				else {
					// distinguish between local paths and internet addresses
					// (maybe also encoded in AddressInfo subfield?)
					item.attachments.push(
						(address.indexOf('http://') == 0 || address.indexOf('https://') == 0)
							? { url: address, title: "Online" }
							: { path: address, title: "Full Text" }
					);
				}
			}
			var callNumber = ZU.xpathText(locations[j], 'CallNumber');
			var libraryId = ZU.xpathText(locations[j], 'LibraryID');
			if (callNumber && libraryId) {
				item.callNumber = callNumber;
				item.libraryCatalog = ZU.xpathText(doc.getElementById(libraryId), "Name");
			}
			else if (callNumber) {
				onlyCallNumber.push(callNumber);
			}
			else if (libraryId) {
				onlyLibraryInfo.push(ZU.xpathText(doc.getElementById(libraryId), "Name"));
			}
		}
		if (!item.callNumber) {
			if (onlyCallNumber.length > 0) {
				item.callNumber = onlyCallNumber[0];
			}
			else if (onlyLibraryInfo.length > 0) {
				item.libraryCatalog = onlyLibraryInfo[0];
			}
		}

		// Only for journalArticle and conferencePaper the DOI field is
		// currently established and therefore we need to add the info for
		// all other itemTypes in the extra field.
		if (item.DOI && item.itemType != "journalArticle" && item.itemType != "conferencePaper") {
			addExtraLine(item, "DOI", item.DOI);
		}

		// --- Erweiterung: Verweise und vollstaendige Standortliste ---
		var czLinkNoteObj = czLinkNote(item.itemID);
		if (czLinkNoteObj) item.notes.push(czLinkNoteObj);
		var czLocNoteObj = czLocationNote(doc, item.itemID);
		if (czLocNoteObj) item.notes.push(czLocNoteObj);

		// Zotero kennt keine Eltern-Kind-Beziehung zwischen Eintraegen.
		// Die Citavi-Id des Verweisziels bleibt aber im Feld "Extra" stehen,
		// sodass sich die Beziehungen spaeter per Skript setzen lassen.
		if (CZ.writeCitaviIds && czLinksByRef[item.itemID]) {
			var czIds = [];
			for (let k = 0; k < czLinksByRef[item.itemID].length; k++) {
				var czL = czLinksByRef[item.itemID][k];
				czIds.push(czL.sourceId == item.itemID ? czL.targetId : czL.sourceId);
			}
			addExtraLine(item, "Citavi-Verweise", czIds.join(" "));
		}

		// The items of type contribution need more data from their container
		// element and are therefore not yet finished. The other items can
		// be completed here.
		itemIdList[item.itemID] = item;

		if (type == "Contribution") {
			unfinishedReferences.push(item);
		}
		else {
			await item.complete(); // eslint-disable-line no-await-in-loop
			Z.setProgress(++progress.current / progress.total * 100);
		}
	}
}

// For unfinished references we add additional data from the
// container item and save the relation between them as well.
async function importUnfinished({ doc, itemIdList, progress, unfinishedReferences }) {
	for (var i = 0; i < unfinishedReferences.length; i++) {
		var item = unfinishedReferences[i];
		var containerString = ZU.xpathText(doc, `//ReferenceReferences/OnetoN[contains(text(), "${item.itemID}")]`);
		if (containerString) {
			var containerId = containerString.split(';')[0];
			var containerItem = itemIdList[containerId];
			// Fehler im Originalfilter: geprueft wurde containerItem.type,
			// das es nicht gibt. Der Citavi-Typ wird jetzt mitgefuehrt.
			if (czRefType[containerId] == "ConferenceProceedings") {
				item.itemType = "conferencePaper";
			}
			// --- Erweiterung: Sammelwerksbezug nachvollziehbar halten ---
			if (CZ.writeCitaviIds) {
				addExtraLine(item, "Citavi-Sammelwerk", containerId);
			}
			item.publicationTitle = containerItem.title;
			item.place = containerItem.place;
			item.publisher = containerItem.publisher;
			item.ISBN = containerItem.ISBN;
			item.volume = containerItem.volume;
			item.edition = containerItem.edition;
			item.series = containerItem.series;

			for (var j = 0; j < containerItem.creators.length; j++) {
				var creatorObject = containerItem.creators[j];
				var role = creatorObject.creatorType;
				if (role == "author") {
					creatorObject.creatorType = "bookAuthor";
				}
				item.creators.push(creatorObject);
			}

			item.seeAlso.push(containerItem.itemID);
		}
		await item.complete(); // eslint-disable-line no-await-in-loop
		Z.setProgress(++progress.current / progress.total * 100);
	}
}

// Task items will be mapped to new standalone note
async function importTasks({ tasks, progress }) {
	for (var i = 0, n = tasks.length; i < n; i++) {
		let item = new Zotero.Item("note");
		var dueDate = ZU.xpathText(tasks[i], './DueDate');
		if (dueDate) {
			item.note = "<h1>" + ZU.xpathText(tasks[i], './Name') + " until " + dueDate + "</h1>";
		}
		else {
			item.note = "<h1>" + ZU.xpathText(tasks[i], './Name') + "</h1>";
		}
		var noteText = ZU.xpathText(tasks[i], './Notes');
		if (noteText) {
			item.note += "\n" + noteText;
		}

		// --- Erweiterung: Bezug zum Titel lesbar festhalten ---
		var czTaskRef = ZU.xpathText(tasks[i], './ReferenceID');
		if (czTaskRef) {
			item.note += "\n<p><em>Gehört zu: " + czEscape(czRefLabel[czTaskRef] || czTaskRef)
				+ (CZ.writeCitaviIds ? " (Citavi-ID " + czTaskRef + ")" : "") + "</em></p>";
			item.seeAlso.push(czTaskRef);
		}

		item.tags.push("#todo");
		await item.complete(); // eslint-disable-line no-await-in-loop
		Z.setProgress(++progress.current / progress.total * 100);
	}
}

function addHierarchyNumberRecursive(collections, level = null) {
	let index = 1;
	for (const collection of collections) {
		const hierarchyNumber = level === null ? `${index++}` : `${level}.${index++}`;
		collection.name = `${hierarchyNumber} ${collection.name}`;
		addHierarchyNumberRecursive(
			collection.children.filter(c => c instanceof Zotero.Collection), hierarchyNumber
		);
	}
}

function importCategories({ categories, doc, progress }) {
	// typo CategoryCatgories was fixed in Citavi 6
	var hierarchy = ZU.xpath(doc, '//CategoryCatgories/OnetoN|//CategoryCategories/OnetoN');

	const parentMap = new Map();
	for (let i = 0, n = hierarchy.length; i < n; i++) {
		var categoryLists = hierarchy[i].textContent.split(";");
		parentMap.set(categoryLists[0], categoryLists.slice(1));
	}

	// Create a Zotero collection for each Citavi category
	const collectionsMap = new Map();
	for (let i = 0, n = categories.length; i < n; i++) {
		var collection = new Zotero.Collection();
		collection.id = ZU.xpathText(categories[i], './@id');
		collection.name = ZU.xpathText(categories[i], './Name');
		collection.type = 'collection';
		collection.children = [];

		// Assign items to collections
		var referenceCategories = ZU.xpath(doc, '//ReferenceCategories/OnetoN[contains(text(), "' + collection.id + '")]');
		for (let j = 0; j < referenceCategories.length; j++) {
			var refid = referenceCategories[j].textContent.split(';')[0];
			collection.children.push({ type: 'item', id: refid });
		}
		collectionsMap.set(collection.id, collection);
	}

	const addedChildIDs = [];

	// Recreate collections hierarchy
	for (const [parentID, childIDs] of parentMap.entries()) {
		if (!collectionsMap.has(parentID)) {
			continue;
		}
		const parentCollection = collectionsMap.get(parentID);

		childIDs.forEach((childID) => {
			if (collectionsMap.has(childID)) {
				parentCollection.children.push(collectionsMap.get(childID));
				addedChildIDs.push(childID);
			}
		});
	}

	// skip collections that were successfuly assigned to a parent
	for (const childID of addedChildIDs) {
		collectionsMap.delete(childID);
	}

	// add hierarchy number to a collection name (e.g. 1 for first root
	// collection and 1.1, 1.2 etc. for subcollections)
	addHierarchyNumberRecursive(collectionsMap.values());

	for (const collection of collectionsMap.values()) {
		collection.complete();
		Z.setProgress(++progress.current / progress.total * 100);
	}
}

async function doImport() {
	var doc = Zotero.getXML();
	var citaviVersion = ZU.xpathText(doc, '//CitaviExchangeData/@Version');

	// Groups will also be mapped to tags which can be assigned to
	// items or notes.
	var groups = ZU.xpath(doc, '//Groups/Group');
	var rememberTags = {};
	for (var i = 0; i < groups.length; i++) {
		var id = ZU.xpathText(groups[i], './@id');
		var name = ZU.xpathText(groups[i], './Name');
		var referenceGroups = ZU.xpath(doc, `//ReferenceGroups/OnetoN[contains(text(), "${id}")]|//KnowledgeItemGroups/OnetoN[contains(text(), "${id}")]`);
		for (var j = 0; j < referenceGroups.length; j++) {
			var refid = referenceGroups[j].textContent.split(';')[0];
			if (rememberTags[refid]) {
				rememberTags[refid].push(name);
			}
			else {
				rememberTags[refid] = [name];
			}
		}
	}
	// --- Erweiterung: Nachschlagetabellen fuer alles aufbauen,
	// was der Originalfilter nicht liest ---
	czBuildIndexes(doc);

	var tasks = ZU.xpath(doc, '//TaskItems/TaskItem');
	var categories = ZU.xpath(doc, '//Categories/Category');

	// Main information for each reference.
	var references = ZU.xpath(doc, '//References/Reference');
	var unfinishedReferences = [];
	var itemIdList = {};

	// Because Zotero may also import annotations, we only move progress within 0-50% range, hence `totalProgress * 2`
	// https://github.com/zotero/zotero/blob/6ca854a018e8bfe4251fbf42610276c441b5d943/chrome/content/zotero/import/citavi.js#L28
	const totalProgress = references.length + tasks.length + categories.length;
	const progress = { total: totalProgress * 2, current: 0 };

	await importItems({ references, doc, citaviVersion, rememberTags, itemIdList, progress, unfinishedReferences });
	await importUnfinished({ doc, itemIdList, unfinishedReferences, progress });
	await importTasks({ tasks, progress });
	importCategories({ categories, doc, progress });
}

function attachName(doc, ids) {
	var valueList = [];

	if (!ids || !ids.length || ids.length <= 0) {
		return valueList;
	}

	var idList = ids.split(';');
	// skip the first element which is the id of reference
	for (var j = 1; j < idList.length; j++) {
		var author = doc.getElementById(idList[j]);
		valueList.push(ZU.xpathText(author, 'Name'));
	}
	return valueList;
}

// For each id in the list of ids, find the
// corresponding node in the document and
// attach the data to the creators array.
function attachPersons(doc, item, ids, type) {
	if (!ids || !ids.length || ids.length <= 0) {
		return;
	}
	var authorIds = ids.split(';');
	// skip the first element which is the id of reference
	for (var j = 1; j < authorIds.length; j++) {
		var author = doc.getElementById(authorIds[j]);
		var lastName = ZU.xpathText(author, 'LastName');
		var firstName = ZU.xpathText(author, 'FirstName');
		var middleName = ZU.xpathText(author, 'MiddleName');
		if (firstName && lastName) {
			if (middleName) {
				firstName += ' ' + middleName;
			}
			item.creators.push({ lastName, firstName, creatorType: type });
		}
		if (!firstName && lastName) {
			item.creators.push({ lastName, creatorType: type, fieldMode: true });
		}
	}
}

function addExtraLine(item, prefix, text) {
	if (text) {
		if (!item.extra) {
			item.extra = '';
		}
		item.extra += prefix + ': ' + text + "\n";
	}
}

function extractPages(multilineText) {
	if (multilineText) {
		var parts = multilineText.split("\n");
		return parts[parts.length - 1].replace(/[^0-9\-–]/g, '');
	}
	return '';
}
