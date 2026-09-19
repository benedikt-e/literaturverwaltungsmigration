using System;
using System.Linq;
using System.Text;
using System.Reflection;
using System.Threading;
using System.Collections;
using System.Collections.Generic;
using System.Windows.Forms;

using SwissAcademic.Citavi;
using SwissAcademic.Citavi.Metadata;
using SwissAcademic.Citavi.Shell;
using SwissAcademic.Collections;

// ===========================================================================
// PRODUKTIONSEXPORT Citavi -> Zotero
//
// Aendert NICHTS am Projekt. Schreibt drei Dinge in den Zielordner:
//   1. projekt.xml          - der vollstaendige Export in der Stufe Citavi6
//                             (die einzige, die Zoteros Uebersetzer annimmt)
//   2. die Anhangdateien    - flach daneben, weil der Zotero-Importfilter
//                             relative Dateinamen relativ zur XML-Datei sucht
//   3. kennzahlen.txt       - Sollwerte fuer die Abnahme nach dem Import
//
// Danach: den Zielordner unveraendert lassen und die XML-Datei von dort aus
// in Zotero importieren.
// ===========================================================================

public static class CitaviMacro
{
	// --------------------------------------------------------- Einstellungen
	// Zielordner. Wird angelegt, falls er fehlt.
	const string ZIEL = @"C:\Temp\Citavi-Migration";

	// Anhangdateien mitkopieren
	static bool ANHAENGE_KOPIEREN = true;
	// ------------------------------------------------------------------------

	public static void Main()
	{
		if (Program.ProjectShells.Count == 0) return;
		Project project = Program.ActiveProjectShell.Project;
		if (project == null) return;

		System.IO.Directory.CreateDirectory(ZIEL);

		StringBuilder sb = new StringBuilder();
		sb.AppendLine("PRODUKTIONSEXPORT  -  " + DateTime.Now.ToString("yyyy-MM-dd HH:mm"));
		sb.AppendLine("Projekt: " + Safe(Get(project, "Name")));
		sb.AppendLine("Zielordner: " + ZIEL);
		sb.AppendLine();

		string projektOrdner = null;
		Section(sb, "1) Projektablage", delegate { projektOrdner = Projektordner(sb, project); });

		Section(sb, "2) Kennzahlen fuer die Abnahme", delegate { Kennzahlen(sb, project); });

		Section(sb, "3) XML-Export", delegate { Export(sb, project); });

		if (ANHAENGE_KOPIEREN)
		{
			Section(sb, "4) Anhangdateien", delegate { Anhaenge(sb, projektOrdner); });
		}

		sb.AppendLine();
		sb.AppendLine("=== Weiter geht es so ===");
		sb.AppendLine("1. Zotero mit gesicherter Datenbank und abgeschalteter Synchronisation starten.");
		sb.AppendLine("2. Datei -> Importieren -> Eine Datei -> " + System.IO.Path.Combine(ZIEL, "projekt.xml"));
		sb.AppendLine("   Option \"Importierte Sammlungen und Eintraege in neue Sammlungen einstellen\" aktivieren.");
		sb.AppendLine("3. Danach das Nachbearbeitungsskript in der JavaScript-Konsole laufen lassen.");
		sb.AppendLine("4. Die Zahlen aus Abschnitt 2 gegen das Ergebnis halten.");

		string bericht = System.IO.Path.Combine(ZIEL, "kennzahlen.txt");
		System.IO.File.WriteAllText(bericht, sb.ToString(), Encoding.UTF8);
		MessageBox.Show("Fertig.\n\n" + ZIEL + "\n\nBericht: kennzahlen.txt", "Produktionsexport");
	}

	// ==================================================================
	static string Projektordner(StringBuilder sb, Project project)
	{
		object cfg = Get(project, "DesktopProjectConfiguration");
		string conn = Safe(Get(cfg, "ConnectionString"));
		sb.AppendLine("ConnectionString: " + Trunc(conn, 200));

		// Citavi 7 liefert hier je nach Projektart entweder einen blanken
		// Dateipfad oder eine Zeichenkette der Form
		// "Data Source=C:\...\Projekt.ctv6;Version=3;...". Beides behandeln.
		string pfad = null;
		if (conn.IndexOf('=') < 0)
		{
			pfad = conn.Trim();
		}
		else
		{
			foreach (string teil in conn.Split(';'))
			{
				int gleich = teil.IndexOf('=');
				if (gleich < 0) continue;
				string schluessel = teil.Substring(0, gleich).Trim().ToLowerInvariant();
				if (schluessel != "data source" && schluessel != "datasource") continue;
				pfad = teil.Substring(gleich + 1).Trim();
				break;
			}
		}
		pfad = (pfad ?? "").Trim('"');

		// Letzte Rueckfallebene: aus dem Projektnamen den Standardpfad bauen
		if (String.IsNullOrEmpty(pfad) || !System.IO.File.Exists(pfad))
		{
			string dok = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
			for (int v = 6; v <= 9 && (String.IsNullOrEmpty(pfad) || !System.IO.File.Exists(pfad)); v++)
			{
				string kandidat = System.IO.Path.Combine(dok,
					"Citavi " + v + @"\Projects\" + Safe(Get(project, "Name")),
					Safe(Get(project, "Name")) + ".ctv6");
				if (System.IO.File.Exists(kandidat)) pfad = kandidat;
			}
		}
		if (String.IsNullOrEmpty(pfad))
		{
			sb.AppendLine("Projektpfad nicht ermittelbar. Anhaenge bitte von Hand");
			sb.AppendLine("aus dem Ordner \"Citavi Attachments\" nach " + ZIEL + " kopieren.");
			return null;
		}
		string ordner = System.IO.Path.GetDirectoryName(pfad);
		sb.AppendLine("Projektdatei:  " + pfad);
		sb.AppendLine("Projektordner: " + ordner);

		object settings = Get(project, "ProjectSettings");
		string eigenerAnhangordner = Get(settings, "AttachmentsFolderPath") as string;
		sb.AppendLine("Anhangordner laut Einstellungen: "
			+ (String.IsNullOrEmpty(eigenerAnhangordner) ? "(Standard)" : eigenerAnhangordner));

		return String.IsNullOrEmpty(eigenerAnhangordner)
			? System.IO.Path.Combine(ordner, "Citavi Attachments")
			: eigenerAnhangordner;
	}

	// ==================================================================
	static void Kennzahlen(StringBuilder sb, Project project)
	{
		int titel = project.References.Count;
		int mitEltern = 0, mitKindern = 0, ohneUrheber = 0, ohneJahr = 0;
		Dictionary<string, int> nachTyp = new Dictionary<string, int>();

		foreach (Reference r in project.References)
		{
			Bump(nachTyp, Safe(Get(r, "DataContractReferenceType")));
			if (Get(r, "ParentReference") != null) mitEltern++;
			if (Count(Get(r, "ChildReferences")) > 0) mitKindern++;
			if (Count(Get(r, "Authors")) + Count(Get(r, "Editors")) + Count(Get(r, "Organizations")) == 0) ohneUrheber++;
			if (String.IsNullOrEmpty(Get(r, "YearResolved") as string)) ohneJahr++;
		}

		Dictionary<string, int> nachZitattyp = new Dictionary<string, int>();
		int wissen = 0, mitKategorie = 0, mitSchlagwort = 0, mitGruppe = 0, dateien = 0;
		int katZuweisungen = 0;
		foreach (object ki in Enum2(Get(project, "AllKnowledgeItems")))
		{
			wissen++;
			Bump(nachZitattyp, Safe(Get(ki, "QuotationType")));
			int kats = Count(Get(ki, "Categories"));
			if (kats > 0) { mitKategorie++; katZuweisungen += kats; }
			if (Count(Get(ki, "Keywords")) > 0) mitSchlagwort++;
			if (Count(Get(ki, "Groups")) > 0) mitGruppe++;
			object addr = Get(ki, "Address");
			if (addr != null && Safe(Get(addr, "LinkedResourceType")) != "Empty") dateien++;
		}

		int verweiseRef = 0, verweiseKi = 0, mitNotiz = 0;
		foreach (object l in Enum2(Get(project, "EntityLinks")))
		{
			string ind = Safe(Get(l, "Indication"));
			if (ind == "ReferenceLink") verweiseRef++;
			else verweiseKi++;
			if (!String.IsNullOrEmpty(Get(l, "Notes") as string)) mitNotiz++;
		}

		sb.AppendLine("SOLLWERTE - diese Zahlen muessen nach dem Import wieder herauskommen");
		sb.AppendLine();
		sb.AppendLine("  Titel gesamt:                  " + titel);
		sb.AppendLine("  davon Beitraege mit Sammelwerk:" + mitEltern + "   <- so viele Verknuepfungen erwartet");
		sb.AppendLine("  Sammelwerke mit Beitraegen:    " + mitKindern);
		sb.AppendLine("  Titel ohne Urheber:            " + ohneUrheber);
		sb.AppendLine("  Titel ohne Jahr:               " + ohneJahr);
		sb.AppendLine();
		sb.AppendLine("  Wissenselemente gesamt:        " + wissen + "   <- so viele Notizen erwartet");
		foreach (KeyValuePair<string, int> kv in nachZitattyp.OrderByDescending(x => x.Value))
			sb.AppendLine("     " + kv.Value + "\t" + Zitattyp(kv.Key));
		sb.AppendLine("  mit Kategorie:                 " + mitKategorie + " (" + katZuweisungen + " Zuweisungen)");
		sb.AppendLine("  mit Schlagwort:                " + mitSchlagwort);
		sb.AppendLine("  mit Gruppe:                    " + mitGruppe);
		sb.AppendLine("  mit Datei:                     " + dateien + "   <- so viele Anhaenge erwartet");
		sb.AppendLine();
		sb.AppendLine("  Verweise Titel zu Titel:       " + verweiseRef);
		sb.AppendLine("  Verweise Kommentar zu Zitat:   " + verweiseKi);
		sb.AppendLine("  Verweise mit Kommentartext:    " + mitNotiz);
		sb.AppendLine();
		sb.AppendLine("  Kategorien:                    " + Count(Get(project, "AllCategories")) + "   <- so viele Sammlungen erwartet");
		sb.AppendLine("  Schlagwoerter:                 " + Count(Get(project, "Keywords")));
		sb.AppendLine("  Gruppen:                       " + Count(Get(project, "Groups")));
		sb.AppendLine("  Standorte:                     " + Count(Get(project, "AllLocations")));
		sb.AppendLine("  Aufgaben:                      " + Count(Get(project, "AllTaskItems")));
		sb.AppendLine();
		sb.AppendLine("  Titel nach Dokumententyp:");
		foreach (KeyValuePair<string, int> kv in nachTyp.OrderByDescending(x => x.Value))
			sb.AppendLine("     " + kv.Value + "\t" + kv.Key);
	}

	static string Zitattyp(string roh)
	{
		switch (roh)
		{
			case "DirectQuotation": return "Woertliches Zitat";
			case "IndirectQuotation": return "Indirektes Zitat";
			case "Summary": return "Zusammenfassung";
			case "Comment": return "Kommentar";
			case "None": return "Datei / ohne Zitattyp";
			default: return roh;
		}
	}

	// ==================================================================
	static void Export(StringBuilder sb, Project project)
	{
		// Kompatibilitaetsstufe Citavi6 ist die einzige, die Zotero 10 annimmt.
		// Citavi4 und Citavi5 brechen im Uebersetzer mit einem Fehler ab.
		MethodInfo einfach = null;
		foreach (MethodInfo m in typeof(Project).GetMethods())
		{
			if (m.Name != "SaveAsXml") continue;
			ParameterInfo[] ps = m.GetParameters();
			if (ps.Length == 2 && ps[0].ParameterType == typeof(string)) einfach = m;
		}
		if (einfach == null) { sb.AppendLine("SaveAsXml nicht gefunden."); return; }

		Type compatType = einfach.GetParameters()[1].ParameterType;
		object citavi6 = null;
		foreach (object v in Enum.GetValues(compatType))
		{
			if (v.ToString() == "Citavi6") citavi6 = v;
		}
		if (citavi6 == null) { sb.AppendLine("Stufe Citavi6 nicht gefunden."); return; }

		string datei = System.IO.Path.Combine(ZIEL, "projekt.xml");
		DateTime t0 = DateTime.Now;
		einfach.Invoke(project, new object[] { datei, citavi6 });
		Melde(sb, datei, t0);
	}

	static void Melde(StringBuilder sb, string datei, DateTime t0)
	{
		long groesse = 0;
		try { groesse = new System.IO.FileInfo(datei).Length; }
		catch { }
		sb.AppendLine("  " + System.IO.Path.GetFileName(datei) + ": "
			+ (groesse / 1024 / 1024) + " MB, "
			+ ((int)(DateTime.Now - t0).TotalSeconds) + " s");
	}

	// ==================================================================
	static void Anhaenge(StringBuilder sb, string anhangordner)
	{
		if (String.IsNullOrEmpty(anhangordner))
		{
			sb.AppendLine("Kein Anhangordner ermittelt, nichts kopiert.");
			return;
		}
		if (!System.IO.Directory.Exists(anhangordner))
		{
			sb.AppendLine("Anhangordner existiert nicht: " + anhangordner);
			// Geschwisterordner desselben Projektordners durchsehen
			string eltern = null;
			try { eltern = System.IO.Path.GetDirectoryName(anhangordner); }
			catch { }
			if (eltern != null && System.IO.Directory.Exists(eltern))
			{
				sb.AppendLine("Vorhandene Ordner daneben:");
				foreach (string d in System.IO.Directory.GetDirectories(eltern))
					sb.AppendLine("   " + System.IO.Path.GetFileName(d)
						+ " (" + System.IO.Directory.GetFiles(d).Length + " Dateien)");
			}
			return;
		}

		sb.AppendLine("Quelle: " + anhangordner);
		string[] dateien = System.IO.Directory.GetFiles(anhangordner);
		int kopiert = 0, uebersprungen = 0;
		long bytes = 0;
		foreach (string quelle in dateien)
		{
			string name = System.IO.Path.GetFileName(quelle);
			string ziel = System.IO.Path.Combine(ZIEL, name);
			try
			{
				if (System.IO.File.Exists(ziel)) { uebersprungen++; continue; }
				System.IO.File.Copy(quelle, ziel);
				bytes += new System.IO.FileInfo(ziel).Length;
				kopiert++;
			}
			catch (Exception e)
			{
				sb.AppendLine("  nicht kopiert: " + name + " (" + e.GetType().Name + ")");
			}
		}
		sb.AppendLine("Dateien im Anhangordner: " + dateien.Length);
		sb.AppendLine("kopiert: " + kopiert + " (" + (bytes / 1024 / 1024) + " MB), schon vorhanden: " + uebersprungen);

		foreach (string unterordner in System.IO.Directory.GetDirectories(anhangordner))
		{
			sb.AppendLine("  Unterordner nicht kopiert: " + System.IO.Path.GetFileName(unterordner)
				+ " (" + System.IO.Directory.GetFiles(unterordner).Length + " Dateien)");
		}
		sb.AppendLine("Die Dateien liegen flach neben der XML-Datei. Genau so sucht der");
		sb.AppendLine("Zotero-Importfilter sie, naemlich relativ zur XML-Datei.");
	}

	// ==================================================================
	// Hilfsfunktionen
	// ==================================================================

	static void Section(StringBuilder sb, string titel, Action body)
	{
		sb.AppendLine();
		sb.AppendLine("##### " + titel + " #####");
		try { body(); }
		catch (Exception e)
		{
			Exception inner = e.InnerException == null ? e : e.InnerException;
			sb.AppendLine("!! Abschnitt abgebrochen: " + inner.GetType().Name + " - " + inner.Message);
		}
		sb.AppendLine();
	}

	static object Get(object o, string prop)
	{
		if (o == null) return null;
		PropertyInfo p = o.GetType().GetProperty(prop);
		if (p == null) return null;
		try { return p.GetValue(o, null); }
		catch { return null; }
	}

	static IEnumerable<object> Enum2(object o)
	{
		List<object> result = new List<object>();
		IEnumerable en = o as IEnumerable;
		if (en == null || o is string) return result;
		try { foreach (object x in en) result.Add(x); }
		catch { }
		return result;
	}

	static int Count(object o)
	{
		if (o == null) return 0;
		object c = Get(o, "Count");
		if (c != null) { try { return Convert.ToInt32(c); } catch { } }
		int n = 0;
		foreach (object x in Enum2(o)) n++;
		return n;
	}

	static void Bump(Dictionary<string, int> d, string key)
	{
		if (key == null) key = "(null)";
		if (d.ContainsKey(key)) d[key]++; else d[key] = 1;
	}

	static string Safe(object o)
	{
		try { return o == null ? "(null)" : o.ToString(); }
		catch { return "(Fehler)"; }
	}

	static string Trunc(string s, int max)
	{
		if (s == null) return "(leer)";
		s = s.Replace("\r", " ").Replace("\n", " ").Replace("\t", " ");
		if (s.Length <= max) return s;
		return s.Substring(0, max) + " …[" + s.Length + " Zeichen]";
	}
}
