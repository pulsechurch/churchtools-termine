/*!
 * ChurchTools Termine – Newsletter-Hilfe: kommende Termine als E-Mail-taugliches HTML (z.B. für MailChimp) kopieren
 * https://github.com/pulsechurch/churchtools-termine
 * Lizenz: MIT
 */
(function() {
    'use strict';

    // Doppelt eingebunden (z.B. Ersatzquelle nach Ladefehler)? Nur einmal starten
    if (window.CT_NEWSLETTER_LOADED) return;
    window.CT_NEWSLETTER_LOADED = true;

    // =====================================================
    // EINSTELLUNGEN
    // Werden auf der Seite über window.CT_CONFIG gesetzt (siehe README).
    // Hier stehen nur die Standardwerte.
    // =====================================================
    const CT_CONFIG = Object.assign({
        churchToolsUrl: '',      // Pflicht, z.B. 'https://meinegemeinde.church.tools'
        apiToken: '',            // Pflicht, Login-Token eines Benutzers mit Leserecht auf die Kalender
        calendarIds: [],         // Pflicht, z.B. [2]
        terminePageUrl: '',      // Pflicht, Adresse der Terminseite, z.B. 'https://www.meinegemeinde.de/termine'
        daysAhead: 50            // Zeitraum in Tagen
    }, window.CT_CONFIG);

    CT_CONFIG.churchToolsUrl = String(CT_CONFIG.churchToolsUrl).replace(/\/+$/, '');

    // =====================================================
    // SOFORTIGER API-PREFETCH
    // =====================================================
    const configError = getConfigError();
    let prefetchPromise = configError ? null : (function() {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + CT_CONFIG.daysAhead);

        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];
        const calendarIdsParam = CT_CONFIG.calendarIds.map(id => `calendar_ids[]=${encodeURIComponent(id)}`).join('&');

        return fetch(`${CT_CONFIG.churchToolsUrl}/api/calendars/appointments?from=${fromDate}&to=${toDate}&${calendarIdsParam}`, {
            headers: { 'Authorization': `Login ${CT_CONFIG.apiToken}` }
        });
    })();

    function getConfigError() {
        const missing = ['churchToolsUrl', 'apiToken', 'terminePageUrl'].filter(key => !CT_CONFIG[key]);
        if (!CT_CONFIG.calendarIds.length) missing.push('calendarIds');
        return missing.length ? `Fehlende Einstellungen in CT_CONFIG: ${missing.join(', ')}` : '';
    }

    // =====================================================
    // CSS + HTML
    // =====================================================
    const CSS = `
    /* ChurchTools Termine – https://github.com/pulsechurch/churchtools-termine */
    .ct-termine-wrapper * {
        box-sizing: border-box;
    }

    .ct-termine-wrapper {
        width: 100%;
        max-width: 800px;
        padding: 0;
        margin: 0 auto;
        font-size: 17px;
    }

    .ct-loading,
    .ct-error {
        text-align: center;
        padding: 3rem 1rem;
        font-size: 1.1rem;
    }

    .ct-error {
        color: #d33;
        background: #ffebee;
        border-radius: 4px;
        margin: 2rem 0;
    }

    .ct-copy-btn {
        display: inline-block;
        padding: 0.4rem 0.8rem;
        border: 1px solid #999;
        background: #fff;
        color: #333;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 8px;
        /* Gleicher Abstand wie zwischen Trennlinie und Kopfzeile */
        margin-bottom: 20px;
    }

    .ct-copy-btn:hover {
        background: #000;
        color: #fff;
        border-color: #000;
    }

    .ct-copy-btn.copied {
        background: #4CAF50;
        border-color: #4CAF50;
        color: #fff;
    }
`;

    // In den Platzhalter <div id="ct-newsletter"></div> einsetzen (fehlt er: direkt vor dem Skript-Tag)
    function mount() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        let target = document.getElementById('ct-newsletter');
        if (!target) {
            target = document.createElement('div');
            const script = document.currentScript;
            if (script && script.parentNode && script.parentNode !== document.head) {
                script.parentNode.insertBefore(target, script);
            } else {
                document.body.appendChild(target);
            }
        }
        target.innerHTML = `
<!--
    ╔══════════════════════════════════════════════════════════════╗
    ║  ChurchTools Termine · Newsletter-Hilfe                      ║
    ║  Termine aus ChurchTools für E-Mails – frei nutzbar (MIT)    ║
    ║  https://github.com/pulsechurch/churchtools-termine          ║
    ╚══════════════════════════════════════════════════════════════╝
-->
<div class="ct-termine-wrapper"><div id="ctEventsContainer"></div></div>`;
    }

    mount();

    // =====================================================
    // LOGIK
    // =====================================================
    // Funktionen für die onclick-Attribute, gebündelt unter einem Namen (keine Konflikte mit anderen Skripten der Website)
    const ctNewsletter = window.ctNewsletter = {};

    let allEvents = [];

    // Datumsformate einmal anlegen (toLocale…String erzeugt sonst bei jedem Aufruf ein neues Format-Objekt)
    const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const TIME_FORMAT = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
    const WEEKDAY_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
    const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });

    // TT.MM.JJ
    function formatDateShort(dateString) {
        return DATE_FORMAT.format(new Date(dateString));
    }

    function formatTime(dateString) {
        return TIME_FORMAT.format(new Date(dateString));
    }

    function getWeekday(dateString) {
        return WEEKDAY_FORMAT.format(new Date(dateString));
    }

    function formatTimeRange(event) {
        return event.allDay ? 'Ganztägig' : `ab ${formatTime(event.startDate)} Uhr`;
    }

    function stripHtml(html) {
        if (!html) return '';
        // Nur echte HTML-Tags entfernen; Markdown-Autolinks wie <https://...> oder <name@domain.de> bleiben erhalten
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g, '');
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===== Markdown-Rendering (MailChimp-Variante) =====
    // Gleicher Parser wie in termine.html, aber E-Mail-tauglich:
    // - nur Inline-Styles (keine CSS-Klassen, kein <style> im Newsletter)
    // - Überschriften als gestylte <p> (sonst überschreibt das MailChimp-Template die Formatierung)
    // - E-Mail-Adressen als normale mailto-Links (ROT13/JavaScript funktioniert in E-Mails nicht)

    const MD_BLOCK = {
        fence: /^ {0,3}(`{3,}|~{3,})(.*)$/,
        heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
        hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
        quote: /^ {0,3}> ?(.*)$/,
        ul: /^( {0,3})([*+-])[ \t]+(.*)$/,
        ol: /^( {0,3})(\d{1,9})[.)][ \t]+(.*)$/,
        blank: /^[ \t]*$/
    };

    const MD_STYLE = {
        // Schrift an jedem Textelement selbst setzen, nicht nur am Wrapper: MailChimp verliert geerbte Werte
        // (z.B. fallen Absätze nach einer Überschrift mit eigener Größe auf die 16px des Textblocks zurück)
        text: 'font-size: 18px; line-height: 1.6;',
        color: 'color: #333333;',
        quoteColor: 'color: #666666;',
        // Alle Abstände in px (em wird von Outlook/MailChimp nicht überall gleich umgerechnet).
        // Außenabstände (margin) nur an Absätzen; Listen, Tabellen, Zitate und Codeblöcke erhalten ihren Abstand über withSpacing()
        p: 'margin: 0 0 18px 0;',
        listP: 'margin: 0 0 9px 0;',
        list: 'margin: 0; padding: 0 0 0 27px;',
        nestedList: 'margin: 4px 0 0 0; padding: 0 0 0 27px;',
        liGap: '4px', // Abstand zwischen Listeneinträgen (ignoriert Outlook ggf. – dann nur etwas enger)
        heading: 'line-height: 1.3; color: #000000;',
        headingMargin: 'margin: 24px 0 7px 0;',
        // Nach Listen/Tabellen/Zitaten/Codeblöcken: deren Abstands-Zelle (18px) verschmilzt nicht mit dem margin, daher 18px weniger
        headingMarginAfterSpacing: 'margin: 6px 0 7px 0;',
        // Der Termin selbst ist die Hauptüberschrift; Überschriften nie größer als der Text (18px).
        // Größen immer in px: MailChimp erkennt em-Angaben nicht als Schriftgröße
        h1: 'font-size: 18px; font-weight: bold;',
        h2: 'font-size: 17px; font-weight: bold;',
        h3: 'font-size: 16px; font-weight: bold; color: #777777;',
        quoteTable: 'border-collapse: collapse;',
        quote: 'border-left: 4px solid #dddddd; padding: 2px 0 2px 16px;',
        // Echter Schriftname zuerst: Outlook kennt "monospace" nicht und nimmt sonst eine Ersatzschrift
        code: "font-family: 'courier new', courier, 'lucida sans typewriter', 'lucida typewriter', monospace; font-size: 15px; background: #f0f0f0; padding: 1px 4px;",
        // Codeblock: Kasten (Hintergrund, Rahmen, Innenabstand) an der Tabellenzelle – Outlook ignoriert padding/border am <pre> in einer Zelle
        codeBox: 'padding: 12px 15px; background-color: #f6f6f6; border: 1px solid #e0e0e0;',
        pre: "margin: 0; padding: 0; font-family: 'courier new', courier, 'lucida sans typewriter', 'lucida typewriter', monospace; font-size: 15px; line-height: 1.5; white-space: pre-wrap;",
        dividerTable: 'border-collapse: collapse;',
        // Oben nur 2px: der vorherige Absatz bringt bereits 18px Abstand mit; unten kein Padding (Abstand kommt vom Platzhalter-<p>)
        dividerOuter: 'padding: 2px 0 0 0;',
        // Schriftgröße/Zeilenhöhe an td UND p: greift auch, wenn MailChimp die Styles vom <p> in ein <span> verschiebt oder entfernt
        dividerLine: 'border-top: 2px solid #000000; padding: 0; font-size: 20px; line-height: 20px;',
        dividerSpacer: 'margin: 0; padding: 0; font-size: 20px; line-height: 20px;',
        img: 'max-width: 100%; height: auto;',
        // Abstand unter Listen, Tabellen, Zitaten und Codeblöcken über eine umschließende Zelle:
        // Outlook ignoriert margin an table/ul/ol, padding an td dagegen nicht
        spacingTable: 'border-collapse: collapse;',
        spacing: 'padding: 0 0 18px 0;',
        table: 'width: 100%; border-collapse: collapse; border: 1px solid #dddddd;',
        th: 'padding: 6px 10px; border: 1px solid #dddddd; background: #f5f5f5; font-size: 17px; line-height: 1.5; font-weight: bold; vertical-align: top;',
        td: 'padding: 6px 10px; border: 1px solid #dddddd; font-size: 16px; line-height: 1.5; vertical-align: top;'
    };

    // Block in eine Layout-Zelle mit Abstand nach unten packen (siehe MD_STYLE.spacing)
    function withSpacing(html) {
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${MD_STYLE.spacingTable}">` +
            `<tr><td style="${MD_STYLE.spacing}">${html}</td></tr></table>`;
    }

    // Textfarbe je nach Umgebung (im Zitat grau)
    function textColor(opts) {
        return opts.quote ? MD_STYLE.quoteColor : MD_STYLE.color;
    }

    // Erlaubte Link-Ziele: http(s), mailto, tel, www., relative Links. Alles andere (javascript:, data: ...) wird verworfen.
    function sanitizeUrl(url) {
        url = (url || '').trim();
        if (/^www\./i.test(url)) return 'https://' + url;
        if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
        if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
        return url;
    }

    // ChurchTools-Erwähnungen (Person, Gruppe, Wiki ...) erkennt man am URL-Parameter ctmd_layout
    function isChurchToolsMention(url) {
        return /[?&#]ctmd_layout\b/i.test(url || '');
    }

    function buildLink(url, labelHtml) {
        // Erwähnungen nur als Text ausgeben (Inline-Formatierung im Linktext bleibt erhalten)
        if (isChurchToolsMention(url)) return labelHtml;
        const targetAttr = /^(mailto|tel):/i.test(url) ? '' : ' target="_blank"';
        return `<a href="${escapeHtml(url)}"${targetAttr}>${labelHtml}</a>`;
    }

    function emailLink(email) {
        return buildLink('mailto:' + email, escapeHtml(email));
    }

    // Inline-Markdown → HTML. Fertige HTML-Stücke werden als Platzhalter (\u0001n\u0002) geparkt,
    // damit spätere Schritte (Escaping, Autolinker, Hervorhebungen) sie nicht mehr verändern.
    function renderInline(text) {
        if (!text) return '';
        const tokens = [];
        const stash = (html) => '\u0001' + (tokens.push(html) - 1) + '\u0002';

        function inline(src, insideLink) {
            // 1. Inline-Code (hat Vorrang vor allem anderen)
            src = src.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, ticks, code) => stash(`<code style="${MD_STYLE.code}">${escapeHtml(code)}</code>`));

            // 2. Backslash-Escapes (\* \_ \# ...)
            src = src.replace(/\\([\\`*_{}\[\]()#+\-.!~>|])/g, (m, ch) => stash(escapeHtml(ch)));

            if (!insideLink) {
                // 3. Autolinks in spitzen Klammern: <https://...>, <name@domain.de>
                src = src.replace(/<((?:https?:\/\/|mailto:)[^\s<>]+|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/gi, (m, target) => {
                    if (target.includes('@') && !/^(https?|mailto):/i.test(target)) return stash(emailLink(target));
                    return stash(buildLink(target, escapeHtml(target.replace(/^mailto:/i, ''))));
                });

                // 4. Bilder ![Alt](URL)
                src = src.replace(/!\[([^\[\]]*)\]\(\s*<?([^\s<>()]+)>?(?:\s+"[^"]*")?\s*\)/g, (m, alt, url) => {
                    const safe = sanitizeUrl(url);
                    return safe ? stash(`<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" style="${MD_STYLE.img}">`) : escapeHtml(alt);
                });

                // 5. Markdown-Links [Text](URL) – vor dem URL-Autolinker
                src = src.replace(/\[([^\[\]]+)\]\(\s*<?([^\s<>()]+)>?(?:\s+"[^"]*")?\s*\)/g, (m, label, url) => {
                    const safe = sanitizeUrl(url);
                    const labelHtml = inline(label, true);
                    return safe ? stash(buildLink(safe, labelHtml)) : stash(labelHtml);
                });

                // 6. Nackte URLs (Satzzeichen am Ende gehören nicht zur URL)
                src = src.replace(/\b(?:https?:\/\/|www\.)[^\s<>\u0001\u0002]+/gi, (match) => {
                    let url = match;
                    let trailing = '';
                    while (/[.,;:!?'"*_~]$/.test(url) || (url.endsWith(')') && (url.split('(').length < url.split(')').length))) {
                        trailing = url.slice(-1) + trailing;
                        url = url.slice(0, -1);
                    }
                    return stash(buildLink(sanitizeUrl(url), escapeHtml(url))) + trailing;
                });
            }

            // 7. E-Mail-Adressen (innerhalb eines Link-Textes ohne eigenen Link)
            src = src.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, (email) =>
                stash(insideLink ? escapeHtml(email) : emailLink(email)));

            // 8. Restlichen Text escapen (Platzhalter bleiben unverändert)
            src = escapeHtml(src);

            // 9. Hervorhebungen
            src = src.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
            src = src.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>');
            src = src.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
            src = src.replace(/(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, '$1<strong>$2</strong>');
            src = src.replace(/(^|[^\p{L}\p{N}*])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?![\p{L}\p{N}*])/gu, '$1<em>$2</em>');
            src = src.replace(/(^|[^\p{L}\p{N}_])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>');
            return src;
        }

        let html = inline(String(text), false);
        // Platzhalter zurücksetzen (mehrfach, da Link-Texte selbst Platzhalter enthalten können)
        while (/\u0001\d+\u0002/.test(html)) {
            html = html.replace(/\u0001(\d+)\u0002/g, (m, i) => tokens[i]);
        }
        return html;
    }

    function isMarkdownBlockStart(line) {
        return MD_BLOCK.fence.test(line) || MD_BLOCK.heading.test(line) || MD_BLOCK.hr.test(line) ||
            MD_BLOCK.quote.test(line) || MD_BLOCK.ul.test(line) || MD_BLOCK.ol.test(line);
    }

    // Trennlinie als Tabelle im Stil des MailChimp-Teilers (hr verliert beim Einfügen seine Inline-Styles).
    // MailChimp fügt in jede Zelle ohne Absatz ein eigenes <p> ein (auch in leere). Deshalb enthält die Linienzelle
    // ein festgelegtes 20px-<p>, das gleichzeitig den Abstand unter der Linie bildet.
    function renderDivider() {
        const tableAttrs = `role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${MD_STYLE.dividerTable}"`;
        return `<table ${tableAttrs}><tr><td style="${MD_STYLE.dividerOuter}">` +
            `<table ${tableAttrs}><tr><td style="${MD_STYLE.dividerLine}"><p style="${MD_STYLE.dividerSpacer}">&nbsp;</p></td></tr></table>` +
            `</td></tr></table>`;
    }

    // Tabellenzeile in Zellen zerlegen (führende/abschließende Pipes optional, \| bleibt Zelleninhalt)
    function splitTableRow(line) {
        let s = line.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
        const cells = [];
        let cell = '';
        for (let k = 0; k < s.length; k++) {
            if (s[k] === '\\' && s[k + 1] === '|') {
                cell += '\\|';
                k++;
            } else if (s[k] === '|') {
                cells.push(cell.trim());
                cell = '';
            } else {
                cell += s[k];
            }
        }
        cells.push(cell.trim());
        return cells;
    }

    // GFM-Tabelle ab Zeile i (Kopfzeile + Trennzeile mit gleicher Spaltenzahl); liefert { header, aligns, rows, next } oder null
    function parseMarkdownTable(lines, i) {
        const headerLine = lines[i];
        const delimLine = lines[i + 1];
        if (delimLine === undefined || !headerLine.includes('|') || !delimLine.includes('|')) return null;
        const header = splitTableRow(headerLine);
        const delims = splitTableRow(delimLine);
        if (header.length !== delims.length || !delims.every(d => /^:?-+:?$/.test(d))) return null;

        const aligns = delims.map(d => d.endsWith(':') ? (d.startsWith(':') ? 'center' : 'right') : (d.startsWith(':') ? 'left' : ''));
        const rows = [];
        i += 2;
        // Tabelle endet an Leerzeile, Zeile ohne Pipe oder anderem Block
        while (i < lines.length && lines[i].includes('|') && !MD_BLOCK.blank.test(lines[i]) && !isMarkdownBlockStart(lines[i])) {
            const cells = splitTableRow(lines[i]);
            rows.push(header.map((h, k) => cells[k] || ''));
            i++;
        }
        return { header, aligns, rows, next: i };
    }

    // Kein Scroll-Wrapper: overflow wird von E-Mail-Programmen kaum unterstützt
    function renderMarkdownTable(table, opts) {
        const cell = (tag, text, k) => {
            const style = `${MD_STYLE[tag]} ${textColor(opts)} text-align: ${table.aligns[k] || 'left'};`;
            return `<${tag} style="${style}">${renderInline(text)}</${tag}>`;
        };
        const head = `<thead><tr>${table.header.map((text, k) => cell('th', text, k)).join('')}</tr></thead>`;
        const body = table.rows.length
            ? `<tbody>${table.rows.map(row => `<tr>${row.map((text, k) => cell('td', text, k)).join('')}</tr>`).join('')}</tbody>`
            : '';
        return withSpacing(`<table style="${MD_STYLE.table}" cellpadding="0" cellspacing="0">${head}${body}</table>`);
    }

    // Liste ab Zeile i einlesen; liefert { html, next }. opts.inList = true: Liste steht in einem Listeneintrag
    function renderMarkdownList(lines, i, type, opts) {
        const re = MD_BLOCK[type];
        const first = lines[i].match(re);
        const baseIndent = first[1].length;
        const start = type === 'ol' ? parseInt(first[2], 10) : 1;
        const items = [];
        let current = null;
        let contentIndent = 0;
        let sawBlank = false;
        let loose = false;

        while (i < lines.length) {
            const line = lines[i];
            const m = line.match(re);

            // Neuer Eintrag auf gleicher Ebene
            if (m && m[1].length < baseIndent + 2) {
                if (sawBlank && current) loose = true;
                current = [m[3]];
                contentIndent = line.length - m[3].length;
                items.push(current);
                sawBlank = false;
                i++;
                continue;
            }

            if (MD_BLOCK.blank.test(line)) {
                sawBlank = true;
                current.push('');
                i++;
                continue;
            }

            const indent = line.match(/^ */)[0].length;
            if (indent >= baseIndent + 2) {
                // Eingerückte Fortsetzung (z.B. verschachtelte Liste oder weiterer Absatz)
                current.push(line.slice(Math.min(indent, contentIndent)));
            } else if (!sawBlank && !isMarkdownBlockStart(line)) {
                // Fortsetzungszeile ohne Einrückung gehört zum aktuellen Eintrag
                current.push(line.trim());
            } else {
                break;
            }
            sawBlank = false;
            i++;
        }

        const textStyle = `${MD_STYLE.text} ${textColor(opts)}`;
        const itemsHtml = items.map((item, k) => {
            while (item.length && MD_BLOCK.blank.test(item[item.length - 1])) item.pop();
            const tight = !loose && !item.some(l => MD_BLOCK.blank.test(l));
            // Kein Außenabstand oben am ersten und unten am letzten Eintrag, da er in der
            // Abstands-Zelle (withSpacing) nicht mehr mit den Nachbarabständen verschmilzt
            const isLast = k === items.length - 1;
            const liMargin = `margin: ${k === 0 ? '0' : MD_STYLE.liGap} 0 ${isLast ? '0' : MD_STYLE.liGap} 0;`;
            const content = renderMarkdownBlocks(item, { tight, inList: true, quote: opts.quote, trimLastMargin: isLast && !opts.inList });
            return `<li style="${textStyle} ${liMargin}">${content}</li>`;
        }).join('');

        const listStyle = `${textStyle} ` + (opts.inList ? MD_STYLE.nestedList : MD_STYLE.list) + (type === 'ol' ? ' list-style: decimal;' : ' list-style: disc;');
        const startAttr = type === 'ol' && start !== 1 ? ` start="${start}"` : '';
        const html = `<${type}${startAttr} style="${listStyle}">${itemsHtml}</${type}>`;
        // Verschachtelte Listen ohne eigenen Abstand nach unten
        return { html: opts.inList ? html : withSpacing(html), next: i };
    }

    // Blockebene. Optionen: tight = Absätze ohne <p> (für kompakte Listeneinträge); inList = Inhalt eines Listeneintrags;
    // trimLastMargin = unteren Abstand des letzten Blocks auf 0 setzen (z.B. in der Zitat-Zelle); quote = innerhalb eines Zitats
    function renderMarkdownBlocks(lines, opts) {
        let html = '';
        let lastBlockStart = 0;
        let afterSpacing = false; // letzter Block endet mit Abstands-Zelle (withSpacing)
        let para = [];
        let i = 0;

        const add = (block, spaced) => {
            lastBlockStart = html.length;
            afterSpacing = Boolean(spaced);
            html += block;
        };

        const flushPara = () => {
            if (!para.length) return;
            // Einfache Zeilenumbrüche innerhalb eines Absatzes bleiben als <br> erhalten
            const content = renderInline(para.map(l => l.trim().replace(/\\$/, '')).join('\n')).replace(/\n/g, '<br>');
            add(opts.tight ? content : `<p style="${MD_STYLE.text} ${textColor(opts)} ${opts.inList ? MD_STYLE.listP : MD_STYLE.p}">${content}</p>`);
            para = [];
        };

        while (i < lines.length) {
            const line = lines[i];
            let m;

            if (MD_BLOCK.blank.test(line)) {
                flushPara();
                i++;
                continue;
            }

            // Codeblock ``` ... ``` (Zeilenumbrüche bleiben erhalten)
            m = line.match(MD_BLOCK.fence);
            if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
                flushPara();
                const closing = new RegExp('^ {0,3}' + (m[1][0] === '`' ? '`' : '~') + '{' + m[1].length + ',}[ \\t]*$');
                const code = [];
                i++;
                while (i < lines.length && !closing.test(lines[i])) {
                    code.push(lines[i]);
                    i++;
                }
                i++; // schließenden Zaun überspringen
                const pre = `<pre style="${MD_STYLE.pre} ${textColor(opts)}">${escapeHtml(code.join('\n'))}</pre>`;
                add(withSpacing(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${MD_STYLE.spacingTable}">` +
                    `<tr><td style="${MD_STYLE.codeBox}">${pre}</td></tr></table>`), true);
                continue;
            }

            // Überschriften als gestylter Absatz (eigene Stufen, siehe MD_STYLE.h1–h3)
            m = line.match(MD_BLOCK.heading);
            if (m) {
                flushPara();
                const level = Math.min(m[1].length, 3); // H4–H6 wie H3
                const margin = afterSpacing ? MD_STYLE.headingMarginAfterSpacing : MD_STYLE.headingMargin;
                add(`<p style="${margin} ${MD_STYLE.heading} ${MD_STYLE['h' + level]}">${renderInline(m[2] || '')}</p>`);
                i++;
                continue;
            }

            // Trennlinie (vor Listen prüfen, da "* * *" sonst als Liste gilt)
            if (MD_BLOCK.hr.test(line)) {
                flushPara();
                add(renderDivider());
                i++;
                continue;
            }

            // Zitat
            if (MD_BLOCK.quote.test(line)) {
                flushPara();
                const quoted = [];
                while (i < lines.length && (m = lines[i].match(MD_BLOCK.quote))) {
                    quoted.push(m[1]);
                    i++;
                }
                // Als einzellige Tabelle: MailChimp verwirft blockquote-Styles, Inline-Styles an td bleiben erhalten
                add(withSpacing(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${MD_STYLE.quoteTable}">` +
                    `<tr><td style="${MD_STYLE.quote} ${MD_STYLE.text} ${MD_STYLE.quoteColor}">${renderMarkdownBlocks(quoted, { trimLastMargin: true, quote: true })}</td></tr></table>`), true);
                continue;
            }

            // Listen (nummerierte Listen unterbrechen einen Absatz nur, wenn sie mit 1 beginnen –
            // damit z.B. "am\n3. Oktober" in altem Plaintext keine Liste wird)
            const olMatch = line.match(MD_BLOCK.ol);
            if (MD_BLOCK.ul.test(line) || (olMatch && (!para.length || olMatch[2] === '1'))) {
                flushPara();
                const list = renderMarkdownList(lines, i, olMatch ? 'ol' : 'ul', opts);
                add(list.html, !opts.inList);
                i = list.next;
                continue;
            }

            // Tabelle (GFM)
            const table = parseMarkdownTable(lines, i);
            if (table) {
                flushPara();
                add(renderMarkdownTable(table, opts), true);
                i = table.next;
                continue;
            }

            para.push(line);
            i++;
        }

        flushPara();
        if (opts.trimLastMargin) {
            // Nur den äußeren Abstand des letzten Blocks entfernen: margin am äußeren Tag bzw. padding der Abstands-Zelle (withSpacing)
            html = html.slice(0, lastBlockStart) + html.slice(lastBlockStart)
                .replace(/^(<[a-z]+\b[^>]*?style="[^"]*?)margin: 0 0 (?:18|9)px 0;/, '$1margin: 0;')
                .replace(/^(<table[^>]*><tr><td style=")padding: 0 0 18px 0;/, '$1padding: 0;');
        }
        return html;
    }

    // trimLastMargin = true: kein Abstand nach dem letzten Block (Termin-Ende)
    function renderMarkdown(text, trimLastMargin) {
        if (!text) return '';
        const lines = String(text)
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(l => l.replace(/^[ \t]+/, ws => ws.replace(/\t/g, '    ')));
        return renderMarkdownBlocks(lines, { trimLastMargin });
    }

    // Markdown entfernen für die Plaintext-Variante in der Zwischenablage (Zeilenstruktur bleibt erhalten)
    // Tabellen ohne Pipes: Zellen mit ", " verbinden, Zeilen mit rowSeparator
    function tablesToPlainText(text, rowSeparator) {
        const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
        const out = [];
        let inFence = false;
        for (let i = 0; i < lines.length; i++) {
            // Inhalt von Codeblöcken nicht als Tabelle behandeln
            if (MD_BLOCK.fence.test(lines[i])) inFence = !inFence;
            const table = inFence ? null : parseMarkdownTable(lines, i);
            if (!table) {
                out.push(lines[i]);
                continue;
            }
            out.push([table.header, ...table.rows]
                .map(row => row.filter(Boolean).join(', '))
                .filter(Boolean)
                .join(rowSeparator));
            i = table.next - 1;
        }
        return out.join('\n');
    }

    function markdownToPlainText(text) {
        if (!text) return '';
        return tablesToPlainText(text, '\n')
            .replace(/^ {0,3}(`{3,}|~{3,}).*$/gm, '')
            .replace(/^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/gm, '$1')
            .replace(/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
            .replace(/^[ \t]*(?:>[ \t]?)+/gm, '')
            .replace(/^([ \t]*)[*+-][ \t]+/gm, '$1• ')
            .replace(/!\[([^\[\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\[\]]+)\]\(\s*<?([^\s<>()]+)>?[^)]*\)/g, (m, label, url) => isChurchToolsMention(url) ? label : `${label} (${url})`)
            .replace(/<((?:https?:\/\/|mailto:)?[^\s<>]+)>/g, '$1')
            .replace(/`+/g, '')
            .replace(/(\*\*\*|\*\*|__|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
            .replace(/(^|[^\p{L}\p{N}*])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?![\p{L}\p{N}*])/gu, '$1$2')
            .replace(/(^|[^\p{L}\p{N}_])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}_])/gu, '$1$2')
            .replace(/\\([\\`*_{}\[\]()#+\-.!~>|])/g, '$1')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function getEventDetailUrl(event) {
        const eventDate = event.startDate.split('T')[0].replace(/-/g, '');
        return `${CT_CONFIG.terminePageUrl}?id=${event.id}&date=${eventDate}`;
    }

    // Ende liegt an einem anderen Kalendertag als der Beginn (bei Ganztägig ist endDate der letzte Tag, inklusive).
    // Über Nacht bis 08:00 am Folgetag zählt als eintägig (z.B. Sa 20:00 - So 01:00) – wie in termine.html
    function isMultiDay(event) {
        if (!event.endDate || formatDateShort(event.startDate) === formatDateShort(event.endDate)) return false;
        if (event.allDay) return true;
        const end = new Date(event.endDate);
        const nextDay = new Date(event.startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return formatDateShort(nextDay) !== formatDateShort(end) || end.getHours() * 60 + end.getMinutes() > 8 * 60;
    }

    // Mehrtägig: „Fr, 18.06. – So, 20.06.27 – Titel“ ohne Uhrzeit/„Ganztägig“, sonst „Fr, 18.06.27 – Titel – ab 08:00 Uhr“
    function getEventHeader(event) {
        if (isMultiDay(event)) {
            return `${getWeekday(event.startDate)}, ${DAY_MONTH_FORMAT.format(new Date(event.startDate))} – ` +
                `${getWeekday(event.endDate)}, ${formatDateShort(event.endDate)} – ${event.title}`;
        }
        return `${getWeekday(event.startDate)}, ${formatDateShort(event.startDate)} – ${event.title} – ${formatTimeRange(event)}`;
    }

    // Leerraum, geschützte Leerzeichen und harte Umbrüche (\) am Ende entfernen – sonst entsteht eine leere Zeile
    function trimDescriptionEnd(text) {
        return (text || '').replace(/[\s \\]+$/, '');
    }

    // Termin als inline-styled HTML (MailChimp-kompatibel) – identisch für Vorschau und Zwischenablage.
    // Beginnt direkt mit der Kopfzeile; am Ende kein Abstand, damit keine leere Zeile mitkopiert wird.
    function buildEventHtml(event) {
        const textStyle = `${MD_STYLE.text} ${MD_STYLE.color}`;
        const subtitle = event.subtitle ? `<p style="${textStyle} margin: 0;">${escapeHtml(event.subtitle)}</p>` : '';
        const description = renderMarkdown(trimDescriptionEnd(event.description), true);
        const headerMargin = subtitle || description ? '0 0 18px 0' : '0';
        return `<div style="font-size: 18px; line-height: 1.6; color: #333333;">` +
            `<p style="${textStyle} margin: ${headerMargin};"><strong>${escapeHtml(getEventHeader(event))}</strong></p>` +
            subtitle +
            description +
            `</div>`;
    }

    // Trennlinie zwischen den Terminen nur auf der Seite (wird nicht mitkopiert)
    function renderEvent(event, index) {
        return (index > 0 ? renderDivider() : '') +
            buildEventHtml(event) +
            `<button class="ct-copy-btn" onclick="ctNewsletter.copySingleEvent(${index}, this)">Kopieren</button> ` +
            `<button class="ct-copy-btn" onclick="ctNewsletter.copyEventLink(${index}, this)">Link kopieren</button>`;
    }

    async function fetchEvents() {
        const container = document.getElementById('ctEventsContainer');

        const loadingTimeout = setTimeout(() => {
            container.innerHTML = '<div class="ct-loading">Warte auf Daten vom Server...</div>';
        }, 5000);

        try {
            if (configError) throw new Error(configError);
            const response = await prefetchPromise;
            prefetchPromise = null; // Nur einmal verwenden

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            clearTimeout(loadingTimeout);

            allEvents = (data.data || []).map(item => {
                const base = item.appointment?.base || item.base || item;
                const calculated = item.appointment?.calculated || item.calculated || {};

                return {
                    id: base.id,
                    title: base.title || base.caption || 'Termin',
                    subtitle: base.subtitle || '',
                    description: stripHtml(base.description || base.information || ''),
                    startDate: calculated.startDate || base.startDate,
                    endDate: calculated.endDate || base.endDate,
                    allDay: base.allDay || false
                };
            }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            if (allEvents.length === 0) {
                container.innerHTML = '<p>Keine bevorstehenden Termine gefunden.</p>';
                return;
            }

            container.innerHTML = allEvents.map((ev, i) => renderEvent(ev, i)).join('');

        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error fetching events:', error);
            container.innerHTML = `<div class="ct-error"><h3>Fehler beim Laden der Termine</h3><p>${escapeHtml(error.message)}</p></div>`;
        }
    }

    // Kurzes "Kopiert!"-Feedback am geklickten Button
    function showCopied(button) {
        if (!button) return;
        const original = button.textContent;
        button.textContent = 'Kopiert!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = original;
            button.classList.remove('copied');
        }, 2000);
    }

    function handleCopyResult(copyPromise, button, errorMessage) {
        copyPromise.then(() => showCopied(button)).catch(err => {
            console.error('Fehler beim Kopieren:', err);
            alert(errorMessage);
        });
    }

    // Einzelnen Termin in die Zwischenablage kopieren (HTML für MailChimp + Plaintext)
    ctNewsletter.copySingleEvent = function(index, button) {
        const event = allEvents[index];
        if (!event) return;

        const description = markdownToPlainText(trimDescriptionEnd(event.description));
        const plainText = getEventHeader(event) +
            (event.subtitle ? '\n' + event.subtitle : '') +
            (description ? '\n\n' + description : '');

        handleCopyResult(navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([buildEventHtml(event)], { type: 'text/html' }),
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            })
        ]), button, 'Konnte nicht in die Zwischenablage kopieren.');
    };

    // Detail-URL in die Zwischenablage kopieren
    ctNewsletter.copyEventLink = function(index, button) {
        const event = allEvents[index];
        if (!event) return;

        const url = getEventDetailUrl(event);
        handleCopyResult(navigator.clipboard.writeText(url), button, 'Konnte nicht kopieren: ' + url);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchEvents);
    } else {
        fetchEvents();
    }
})();
