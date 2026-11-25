# ChurchTools Termine – Entwickler-Doku

Zwei einbindbare Skripte, die Termine aus ChurchTools-Kalendern laden und auf einer Website anzeigen (gebaut für Squarespace-Code-Blöcke, funktioniert auf jeder Website):

- **`termine.js`** – Terminseite (Hauptfeature)
- **`newsletter.js`** – Newsletter-Hilfe: Termine als E-Mail-taugliches HTML für MailChimp kopieren (Nebenfeature)

Die README richtet sich an Gemeinden, die die Skripte einbinden. Diese Datei beschreibt Aufbau und Regeln für die Weiterentwicklung.

## Regeln

- **Keine Zugangsdaten ins Repo** (Login-Token, iCal-Sicherheitsschlüssel). Echte Konfigurationen nur in lokalen `*.local.html`-Dateien (per `.gitignore` ausgeschlossen) oder in Umgebungsvariablen.
- **Rückwärtskompatibel bleiben**: Alle Gemeinden mit `@1` bekommen jede `v1.*`-Version automatisch. Einstellungen nie umbenennen oder in ihrer Bedeutung ändern; neue Einstellungen brauchen einen Standardwert. Bricht eine Änderung bestehende Einbindungen, wird sie Version `v2.0.0`.
- **Erst testen, dann Version setzen**: Änderungen gehen auf `main` und werden auf der Testseite (`@main`) live auf der Website bzw. in MailChimp geprüft. Lokale Tests allein reichen nicht. Erst nach bestätigtem Live-Test wird ein Versions-Tag gesetzt.
- **Parser in beiden Dateien pflegen**: Der Markdown-Parser existiert in `termine.js` (Website) und `newsletter.js` (E-Mail-Variante). Änderungen an Regeln in beiden Dateien umsetzen.
- **Sprache**: Oberfläche, Kommentare, README und Commit-Nachrichten auf Deutsch.

## Versionen und Auslieferung

- Einbindung: `<div id="ct-termine">`, dann `window.CT_CONFIG = {…}`, dann `<script src="https://cdn.jsdelivr.net/gh/pulsechurch/churchtools-termine@1/termine.js" onerror="…">`. Das `onerror` lädt als Ersatzquelle `https://pulsechurch.github.io/churchtools-termine/v1/termine.js`. Vorlagen: `examples/termine.html`, `examples/newsletter.html`.
- Semantische Versionen als Git-Tags: Fehlerkorrektur `v1.0.1`, neue Funktion `v1.1.0`, inkompatible Änderung `v2.0.0`. `@1` bei jsDelivr zeigt auf den neuesten Tag `v1.*`. Zu jedem Tag ein GitHub-Release mit kurzer Beschreibung der Änderungen.
- **Stand: noch keine Version veröffentlicht.** Bis zum Tag `v1.0.0` existieren `@1` und die Ersatzquelle `/v1/` nicht. Zum Einbinden und Testen bis dahin `https://cdn.jsdelivr.net/gh/pulsechurch/churchtools-termine@main/termine.js` (ohne `onerror`) verwenden; diesen Absatz beim ersten Tag entfernen.
- Voraussetzung für Tags: In GitHub muss die Umgebung `github-pages` Deployments von Tags `v*` erlauben (Settings → Environments → github-pages).
- `.github/workflows/pages.yml`:
  - Tag `v*` → GitHub Pages neu bauen (pro Hauptversion der neueste Stand unter `/vN/`) und den jsDelivr-Cache für `@N` leeren
  - Push auf `main` → jsDelivr-Cache für `@main` leeren (Testseite)

## Testen

- Lokal: HTML-Datei mit `window.CT_CONFIG` und `<script src="termine.js">` anlegen (Name `*.local.html`). Aufruf über `file://` braucht im Browser abgeschaltete Web-Security, sonst blockiert CORS die ChurchTools-API, z.B. Edge headless: `msedge --headless=new --disable-web-security --user-data-dir=<tmp> --virtual-time-budget=15000 --dump-dom|--screenshot <datei>`.
- **CORS**: Die Skripte rufen die ChurchTools-API direkt aus dem Browser auf. In ChurchTools muss jede Website-Adresse freigegeben sein (Systemeinstellungen → Integrationen → Cross-Origin Resource Sharing), für die Squarespace-Vorschau zusätzlich die interne Adresse `https://….squarespace.com`. Schreibweise exakt mit `https://` und ohne `/` am Ende, sonst greift die Freigabe nicht. Fehlt die Freigabe, erscheint die Fehlermeldung `.ct-error`; die Ursache steht nur in der Konsole.
- Optische Änderungen per Screenshot-Vergleich alt/neu prüfen (Pixel-Diff).
- Referenz-Installation: pulsechurch.de/termine (ChurchTools `https://pulsechurch.church.tools`, Kalender 2, 44, 38).

## Konfiguration

`termine.js` mischt `window.CT_CONFIG` mit Standardwerten (`Object.assign` am Dateianfang) und leitet `calendarIds` aus `calendars` ab. Fehlt eine Pflicht-Einstellung, zeigt die Seite „Terminseite nicht eingerichtet“ mit den fehlenden Namen (`getConfigError()`).

| Einstellung | Pflicht | Bedeutung |
|---|---|---|
| `churchToolsUrl` | ja | ChurchTools-Adresse (abschließender `/` wird entfernt) |
| `apiToken` | ja | Login-Token eines Benutzers mit Leserecht auf die Kalender (im Quelltext der Website sichtbar) |
| `calendars` | ja | `{ id, label, icon, icalUrl? }` – ohne `icalUrl` baut `getIcalUrl()` den Abo-Link aus `calendar.randomUrl` der geladenen Termine; ohne abonnierbaren Kalender wird der Abo-Button versteckt |
| `headerTitle` | | Überschrift im Kopfbild |
| `headerImageUrl` | | Hintergrundbild des Kopfbereichs |
| `primaryColor` | | Farbe aktiver Buttons (CSS-Variable `--ct-primary-color`) |
| `selectionMode` | | `'calendar'` (Kalender-Buttons + Dropdown „Weitere Filter“) oder `'filter'` (Filter-Buttons) |
| `selectionLabel` | | Text vor den Buttons |
| `filters` | | `{ label, filter }` – Textsuche im Titel; `filter: '__other__'` = alle Termine, die zu keinem anderen Filter passen |
| `linkButtons` | | `{ address, label }` – enthält `event.link` die Adresse, erscheint ein Button, sonst ein Textlink mit Domainname |
| `subscriptionSupportText` | | Hinweis im Abo-Dialog (wird mit `renderInline()` gerendert) |

## Code-Struktur (termine.js)

Alles in einer IIFE mit Schutz gegen doppeltes Laden (`window.CT_TERMINE_LOADED`, z.B. wenn nach einem Ladefehler die Ersatzquelle nachlädt).

1. **Einstellungen**: Standardwerte + `window.CT_CONFIG`
2. **Prefetch**: API-Anfrage startet sofort (`prefetchPromise`, Zeitraum heute bis +2 Jahre), noch bevor CSS und HTML eingesetzt sind
3. **CSS** (Template-String → `<style>` im `<head>`) und **HTML** (in `#ct-termine`, fehlt der Platzhalter: vor dem Skript-Tag; `mount()`). Beide beginnen mit einem Herkunftshinweis als Kommentar, der nur im Quelltext sichtbar ist
4. **Logik**: Laden, Rendering, Event-Handler, E-Mail-Schutz

Konventionen:
- Funktionen für `onclick`-Attribute hängen an `window.ctTermine` (Newsletter: `window.ctNewsletter`); sonst keine Globals
- Werte in `onclick`-Attributen immer über `jsArg()` einsetzen (JSON + HTML-Escaping)
- Datumsformate als einmalig angelegte `Intl.DateTimeFormat`-Objekte (`DATE_FORMAT`, `TIME_FORMAT`, `WEEKDAY_FORMAT` …), auch in `newsletter.js`
- `event.dateKey` (YYYYMMDD) wird beim Laden berechnet und für URL und Detail-Suche verwendet
- `event.link` läuft durch `sanitizeUrl()` (kein `javascript:`, `www.` → `https://`)

## Funktionen der Terminseite

- **Ansichten**: Liste und Detailansicht im selben Code-Block. URL-Parameter: `?id=ID&date=YYYYMMDD` (Detail), `?filter=TEXT`, `?calendar=ID`. Browser Zurück/Vor über `popstate`. Filter- und Kalender-Auswahl bleiben beim Wechsel zur Detailansicht erhalten (ohne URL-Parameter).
- **„Weitere Filter“-Dropdown**: Beim Öffnen steht der aktive Filter markiert im Suchfeld (`focus()` + `select()`), neues Tippen ersetzt ihn. Tippen über einen aktiven Filter hebt ihn auf wie × (`resetFilterKeepDropdown()`: alles neu rendern, Dropdown sofort wieder offen mit Text und Fokus, dann Live-Suche). Klick außerhalb übernimmt den eingegebenen Suchbegriff als Filter. Das Menü hängt beim Öffnen an `body` (Portal), damit die scrollende Filterleiste es nicht abschneidet.
- **Alte Links** (`showMovedEventOrNotFound()`): Wird `?id=…&date=…` nicht gefunden (z.B. Serientermin in ChurchTools einzeln geändert → neue ID), wird der Titel der alten ID geholt (aus den geladenen Terminen, sonst per `/api/calendars/{calendarId}/appointments/{id}`) und der Termin mit gleichem Titel am gleichen Tag gezeigt. Die URL wird per `replaceState` auf die neue ID umgestellt.
- **Mehrtägige Termine** (`isMultiDay()`, in beiden Dateien): Ende an einem anderen Kalendertag. Bei Ganztägig liefert ChurchTools `endDate` als letzten Tag inklusive. Ausnahme: Termine mit Uhrzeit, die am Folgetag bis einschließlich 08:00 enden, gelten als eintägig (z.B. Sa 20:00 – So 01:00). Datum als Spanne über `Intl.DateTimeFormat.formatRange` („Freitag, 18. – Sonntag, 20. Juni 2027“, Detailansicht mit Umbruch nach dem Strich), Uhrzeit mit Wochentag („Fr 08:00 - So 16:00 Uhr“). Die Detailansicht zeigt „Uhrzeit“ immer, auch „Ganztägig“.
- **Fehlermeldung** (`.ct-error`): Ist ChurchTools nicht erreichbar, erscheint ein freundlicher Hinweis („Unsere Termine machen gerade eine kurze Pause“) mit Button „Erneut versuchen“. Die technische Meldung steht nur in der Konsole.
- **Header**: Volle Breite per CSS-Breakout (`width: 100vw; margin-left: calc(-50vw + 50%)`), Bild per JS aus `headerImageUrl`. Wird bei direktem Aufruf einer Detailseite sofort ausgeblendet (kein Flackern).
- **Canonical-URL**: Auf der Detailseite wird `<link rel="canonical">` (und `og:url`, falls vorhanden) auf die volle URL gesetzt, auf der Liste zurück auf die Basis-URL – nötig für die Teilen-Funktion in iOS Chrome.
- **Abo-Dialog**: Pro Kalender „Abonnieren“ (`webcal://`) und „Link kopieren“. Der Dialog hängt an `body`, damit er aus dem Code-Block ausbricht.
- **Responsive**: ein Breakpoint `max-width: 799px` (entspricht dem Wechsel der Squarespace-Navigation in die mobile Variante).

### Bilder und Fokuspunkt

`getOptimizedImageUrl(image, w, h)` hängt `?w=…&h=…` an `image.imageUrl`. Der ChurchTools-Bildserver schneidet exakt auf w×h zu und berücksichtigt den in ChurchTools gesetzten Fokuspunkt (`image.imageOption.focus`) und Ausschnitt (`image.imageOption.crop`) – im Code ist dafür nichts nötig. Das angeforderte Format muss zum CSS-Seitenverhältnis passen, sonst schneidet `object-fit: cover` mittig nach.
- Liste: 600×400 (3:2)
- Detail: `<picture>` mit 1200×400 (3:1) ab 800px und 1200×600 (2:1) bis 799px

### Markdown in Beschreibungen

ChurchTools liefert Beschreibungen als Markdown. Eigener, abhängigkeitsfreier Parser:
- `renderMarkdown()` → Detailansicht: Überschriften (Markdown-H1 → `<h2 class="ct-md-h1">` usw.), Listen (`*`/`-`/`+`, `1.`/`1)`), Zitate, Codeblöcke, Trennlinien, Absätze (einfacher Zeilenumbruch → `<br>`)
- `renderInline()` → Inline-Code, `[Text](URL)`, `<URL>`, nackte URLs, E-Mails (geschützt), fett, kursiv, durchgestrichen, `\`-Escapes. Roh-Text wird immer escaped; nur http(s)/mailto/tel/relative Links erlaubt
- **Tabellen (GFM)**: `parseMarkdownTable()` → `renderMarkdownTable()` → `<div class="ct-md-table-wrap"><table>`; Wrapper scrollt mobil horizontal
- **ChurchTools-Erwähnungen**: Links mit URL-Parameter `ctmd_layout` werden in `buildLink()` zu `<span class="ct-mention">` (wie Fließtext). Gilt nicht für Link-Buttons aus `event.link`
- `markdownToPlainText()` → Teaser in der Liste (`event.plainDescription`, gekürzt auf 190 Zeichen am Satz- oder Wortende); Tabellen via `tablesToPlainText()` → „Zelle, Zelle; Zelle, Zelle“
- Rückwärtskompatibel: reiner Text ergibt Absätze + `<br>`; nummerierte Listen unterbrechen einen Absatz nur bei `1.` (z.B. „am\n3. Oktober“ bleibt Text)

### E-Mail-Schutz

`protectEmail(email, labelHtml?)` erzeugt einen Link mit ROT13-verschlüsselter Adresse in `data-email`; der sichtbare Text ist durch versteckte `<span>` unterbrochen (`obfuscateEmailText()`). Beim Klick entschlüsselt `ctTermine.decryptEmail()` und öffnet `mailto:`. Wird in `renderInline()` automatisch auf alle erkannten Adressen angewendet.

## Newsletter-Hilfe (newsletter.js)

Interne, nicht verlinkte Seite. Listet die kommenden Termine als **inline-gestyltes, MailChimp-kompatibles HTML** zum Kopieren.

- Einstellungen: Pflicht `churchToolsUrl`, `apiToken`, `calendarIds`, `terminePageUrl` (Basis für Detail-Links); optional `daysAhead` (Standard 50). Platzhalter `#ct-newsletter`.
- Pro Termin: Kopfzeile `Wochentag, TT.MM.JJ – Titel – ab HH:MM Uhr` (bzw. „Ganztägig“; mehrtägig „Fr, 18.06. – So, 20.06.27 – Titel“), Untertitel, Beschreibung.
- `buildEventHtml()` erzeugt das HTML für Vorschau **und** Zwischenablage (identisch). Das kopierte HTML beginnt direkt mit der Kopfzeile, ohne Trennlinie; auf der Seite trennt `renderDivider()` die Termine (nur Anzeige). Am Termin-Ende kein Abstand und keine Leerzeile: `trimDescriptionEnd()` entfernt Leerraum, NBSP und harte Umbrüche (`\`) am Ende.
- **„Kopieren“**: HTML + Plaintext (`markdownToPlainText()`: Zeilenstruktur bleibt, Listen mit `•`, Links als `Text (URL)`) per `ClipboardItem`.
- **„Link kopieren“**: `terminePageUrl?id=ID&date=YYYYMMDD` (gleiches Schema wie die Terminseite).

### E-Mail-Variante des Markdown-Parsers

Gleiche Regeln wie in `termine.js`, aber angepasst an E-Mail-Programme (Erkenntnisse aus Testmails in MailChimp, Outlook und iPhone Mail):
- **Nur Inline-Styles** aus `MD_STYLE` – MailChimp übernimmt kein `<style>` aus der Zwischenablage.
- **Überschriften als gestylte `<p>`**, nichts größer als der Text (18px): H1 18px fett, H2 17px fett schwarz, H3–H6 16px fett grau. Echte `<h*>` würden vom MailChimp-Template umgestylt.
- **Schrift an jedem Textelement** (`MD_STYLE.text` + `textColor(opts)`): `p`, `ul/ol`, `li`, `th/td`, Zitat-Zelle, `pre`, Kopfzeile und Untertitel tragen Größe, Zeilenhöhe und Farbe selbst (#333333, im Zitat #666666). MailChimp verliert geerbte Werte nach einer Überschrift. `renderMarkdownBlocks(lines, opts)` nimmt deshalb ein Options-Objekt `{ tight, inList, trimLastMargin, quote }` (weicht von `termine.js` ab).
- **Abstände für Outlook**: Outlook (Windows) ignoriert `margin` an `ul/ol` und `table`. Listen der obersten Ebene, Tabellen, Zitate und Codeblöcke stecken in einer Layout-Zelle `withSpacing()` mit `padding: 0 0 18px 0`. Weil padding nicht mit margins verschmilzt: erster/letzter Listeneintrag ohne Außenabstand (`MD_STYLE.liGap` nur dazwischen), Überschriften direkt danach mit weniger Abstand oben (`headingMarginAfterSpacing`). `trimLastMargin` entfernt auch das padding der Abstands-Zelle. Listen bleiben bewusst echte Listen (im MailChimp-Editor bearbeitbar).
- **Alle Größen in px** (MailChimp erkennt em nicht): Text 18px, Absatz 18px Abstand (im Listeneintrag 9px), Überschrift 24px oben / 7px unten, Listeneinzug 27px, Tabellen: Kopf 17px, Zellen 16px, Code 15px.
- **Code-Schrift**: `'courier new', courier, 'lucida sans typewriter', 'lucida typewriter', monospace` – reines `monospace` kennt Outlook nicht. Der Codeblock-Kasten sitzt an einer Tabellenzelle (`MD_STYLE.codeBox`), weil Outlook padding/border am `<pre>` ignoriert.
- **Trennlinien** als Tabelle im Stil des MailChimp-Teilers statt `<hr>` (`renderDivider()`; `<hr>` verliert beim Einfügen seine Styles). Unter der Linie ein `<p>` mit fester Größe 20px als Abstand, weil MailChimp leere Zellen und bloßes `&nbsp;` mit eigenen 16px-Absätzen füllt. Die Website zeigt die Linie optisch gleich, bleibt aber `<hr>`.
- **Zitate** als einzellige Tabelle mit `border-left` statt `<blockquote>` (MailChimp verwirft blockquote-Styles). Die Website behält `<blockquote>`.
- E-Mail-Adressen als normale `mailto:`-Links (JavaScript läuft in E-Mails nicht); Erwähnungen nur als Linktext; Tabellen ohne Scroll-Wrapper.
