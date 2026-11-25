/*!
 * ChurchTools Termine – Terminseite für Websites (z.B. Squarespace)
 * https://github.com/pulsechurch/churchtools-termine
 * Lizenz: MIT
 */
(function() {
    'use strict';

    // Doppelt eingebunden (z.B. Ersatzquelle nach Ladefehler)? Nur einmal starten
    if (window.CT_TERMINE_LOADED) return;
    window.CT_TERMINE_LOADED = true;

    // =====================================================
    // EINSTELLUNGEN
    // Werden auf der Website über window.CT_CONFIG gesetzt (siehe README).
    // Hier stehen nur die Standardwerte.
    // =====================================================
    const CT_CONFIG = Object.assign({
        churchToolsUrl: '',                    // Pflicht, z.B. 'https://meinegemeinde.church.tools'
        apiToken: '',                          // Pflicht, Login-Token eines Benutzers mit Leserecht auf die Kalender
        calendars: [],                         // Pflicht, z.B. [{ id: 2, label: 'Veranstaltungen', icon: '📅' }]
        headerTitle: 'Bevorstehende Events.',
        headerImageUrl: '',
        primaryColor: '#FCC927',
        selectionMode: 'calendar',             // 'calendar' oder 'filter'
        selectionLabel: '',
        filters: [],
        linkButtons: [],
        subscriptionSupportText: ''
    }, window.CT_CONFIG);

    CT_CONFIG.churchToolsUrl = String(CT_CONFIG.churchToolsUrl).replace(/\/+$/, '');
    CT_CONFIG.calendarIds = CT_CONFIG.calendars.map(cal => cal.id);

    // =====================================================
    // SOFORTIGER API-PREFETCH (Zeitraum: heute bis +2 Jahre)
    // =====================================================
    const configError = getConfigError();
    let prefetchPromise = configError ? null : (function() {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 2);

        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];
        const calendarIdsParam = CT_CONFIG.calendarIds.map(id => `calendar_ids[]=${encodeURIComponent(id)}`).join('&');

        return fetch(`${CT_CONFIG.churchToolsUrl}/api/calendars/appointments?from=${fromDate}&to=${toDate}&${calendarIdsParam}`, {
            headers: { 'Authorization': `Login ${CT_CONFIG.apiToken}` }
        });
    })();

    function getConfigError() {
        const missing = [];
        if (!CT_CONFIG.churchToolsUrl) missing.push('churchToolsUrl');
        if (!CT_CONFIG.apiToken) missing.push('apiToken');
        if (!CT_CONFIG.calendars.length) missing.push('calendars');
        return missing.length ? `Fehlende Einstellungen in CT_CONFIG: ${missing.join(', ')}` : '';
    }

    // =====================================================
    // CSS
    // =====================================================
    const CSS = `
    /* ChurchTools Termine – https://github.com/pulsechurch/churchtools-termine */
    /* Grundeinstellungen */
    .ct-termine-wrapper * {
        box-sizing: border-box;
    }

    .ct-termine-wrapper {
        width: 100%;
        max-width: 100%;
        padding: 0;
        margin: 0;
    }

    /* Header mit Hintergrundbild – bricht für volle Breite aus dem Container aus */
    .ct-termine-header {
        position: relative;
        text-align: center;
        padding: 6rem 2rem;
        overflow: hidden;
        /* Aus dem Container auf volle Fensterbreite ausbrechen */
        width: 100vw;
        margin-left: calc(-50vw + 50%);
        margin-bottom: 3rem;
        background: #fff; /* Weißer Hintergrund während Bild lädt */
    }

    .ct-termine-header.hidden,
    .ct-termine-header-subscribe.hidden {
        display: none;
    }

    .ct-termine-header-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-size: cover;
        background-position: 49% 24%;
        z-index: 0;
        /* background-image wird per JavaScript aus CT_CONFIG.headerImageUrl gesetzt */
    }

    .ct-termine-header-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        opacity: 0;
        z-index: 1;
        transition: opacity 0.3s ease;
    }

    /* Overlay wird sichtbar wenn Hintergrundbild geladen ist */
    .ct-termine-header-bg[style*="background-image"] ~ .ct-termine-header-overlay {
        opacity: 0.5;
    }

    .ct-termine-header h1 {
        position: relative;
        z-index: 2;
        font-size: 2.5rem;
        font-weight: 400;
        margin: 0;
        line-height: 1.2;
        color: #fff;
    }

    .ct-termine-header-content {
        position: relative;
        z-index: 2;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .ct-termine-header-subscribe {
        text-decoration: none;
        font-size: 1rem;
        font-weight: normal;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.75rem;
        cursor: pointer;
        padding: 0.75rem 1.5rem;
        background: transparent;
        color: var(--ct-primary-color, #FCC927);
        border: 2px solid var(--ct-primary-color, #FCC927);
        border-radius: 0;
    }

    .ct-termine-header-subscribe:hover {
        background: var(--ct-primary-color, #FCC927);
        color: #000;
    }

    .ct-termine-header-subscribe:hover svg {
        fill: #000;
    }

    .ct-termine-header-subscribe svg {
        width: 20px;
        height: 20px;
        fill: var(--ct-primary-color, #FCC927);
        transition: fill 0.2s;
    }

    /* Lade- und Fehleranzeige */
    .ct-loading,
    .ct-error {
        text-align: center;
        padding: 3rem 1rem;
        font-size: 1.1rem;
    }

    .ct-error {
        max-width: 600px;
        margin: 2rem auto;
        padding: 3rem 1.5rem;
        background: #f5f5f5;
        border-radius: 8px;
        border-top: 4px solid var(--ct-primary-color, #FCC927);
    }

    .ct-error-icon {
        font-size: 2.5rem;
        line-height: 1;
        margin-bottom: 1rem;
    }

    .ct-error h2 {
        font-size: 1.6rem;
        font-weight: 400;
        margin: 0 0 1rem 0;
    }

    .ct-error p {
        color: #666;
        margin: 0 auto 1.5rem auto;
        max-width: 460px;
    }

    .ct-error .ct-detail-button::after {
        content: ' ↻';
    }

    /* Terminliste: untereinander, Bild links, Infos rechts */
    .ct-events-list {
        display: flex;
        flex-direction: column;
        gap: 3rem;
        margin: 0;
    }

    /* Einzelner Termin */
    .ct-event-item {
        display: block;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .ct-event-content {
        display: grid;
        grid-template-columns: 400px 1fr;
        gap: 2rem;
        align-items: start;
    }

    @media (max-width: 799px) {
        .ct-event-content {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
    }

    /* Terminbild */
    .ct-event-image {
        width: 100%;
        height: auto;
        aspect-ratio: 3/2;
        object-fit: cover;
        display: block;
        background: #e8e8e8;
        border-radius: 20px;
    }

    .ct-event-image-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        text-align: center;
        border-radius: 20px;
    }

    .ct-event-image-placeholder span {
        font-size: 1.3rem;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
    }

    /* Termininfos */
    .ct-event-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .ct-event-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
        line-height: 1.3;
        color: #000;
    }

    .ct-event-subtitle {
        font-size: 1.1rem;
        font-weight: 400;
        margin: 0;
    }

    .ct-event-meta {
        color: #666;
        font-size: 0.95rem;
        margin-bottom: 0.7rem;
    }

    .ct-event-description {
        font-size: 1rem;
        line-height: 1.6;
        color: #555;
        margin: 0.5rem 0 0.7rem 0;
    }

    /* Keine Treffer */
    .ct-no-results {
        text-align: center;
        padding: 4rem 1rem;
    }

    .ct-no-results h2 {
        font-size: 1.8rem;
        font-weight: 400;
        margin: 0 0 1rem 0;
    }

    .ct-no-results p {
        font-size: 1.1rem;
        color: #666;
    }

    /* Listenansicht */
    .ct-list-view.hidden {
        display: none;
    }

    /* Detailansicht */
    .ct-detail-view {
        display: none;
        max-width: 100%;
        overflow-x: hidden;
    }

    .ct-detail-view.active {
        display: block;
    }

    .ct-back-link {
        display: inline-block;
        color: #000;
        text-decoration: none;
        margin-bottom: 2rem;
        font-size: 1rem;
    }

    .ct-back-link:hover {
        text-decoration: underline;
    }

    .ct-detail-banner-picture {
        display: contents;
    }

    .ct-detail-banner {
        width: 100%;
        height: auto;
        display: block;
        margin-bottom: 3rem;
        aspect-ratio: 3/1;
        object-fit: cover;
        border-radius: 20px;
    }

    @media (max-width: 799px) {
        .ct-detail-banner {
            aspect-ratio: 2/1;
            margin-bottom: 2rem;
        }
    }

    .ct-detail-layout {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 3rem;
        align-items: start;
    }

    @media (max-width: 799px) {
        .ct-detail-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
        }

        /* Sidebar unter den Text verschieben */
        .ct-detail-sidebar {
            order: 2;
        }

        .ct-detail-main {
            order: 1;
        }
    }

    /* Info-Spalte (links) */
    .ct-detail-sidebar {
        background: #f9f9f9;
        padding: 2rem;
        border-radius: 20px;
    }

    .ct-detail-meta-item {
        margin-bottom: 1.5rem;
    }

    .ct-detail-meta-item:last-child {
        margin-bottom: 0;
    }

    .ct-detail-meta-label {
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #666;
        margin-bottom: 0.5rem;
        display: block;
    }

    .ct-detail-meta-value {
        color: #000;
        font-size: 1rem;
        line-height: 1.6;
    }

    .ct-detail-meta-value a {
        color: #0066cc;
        text-decoration: none;
    }

    .ct-detail-meta-value a:hover {
        text-decoration: underline;
    }

    /* Hauptinhalt (rechts) */
    .ct-detail-title {
        font-size: 2rem;
        font-weight: 700;
        margin: 0;
        line-height: 1.2;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
    }

    .ct-detail-subtitle {
        font-size: 1.3rem;
        font-weight: 400;
        margin: 0.4rem 0 0 0;
    }

    .ct-detail-description {
        font-size: 1.1rem;
        line-height: 1.8;
        color: #333;
        word-wrap: break-word;
        overflow-wrap: break-word;
        margin: 2rem 0 0 0;
    }

    .ct-detail-description a {
        text-decoration: underline;
    }

    /* Markdown-Elemente in der Beschreibung (einheitlicher Blockabstand: 1em) */
    .ct-detail-description p,
    .ct-detail-description ul,
    .ct-detail-description ol,
    .ct-detail-description blockquote,
    .ct-detail-description pre,
    .ct-detail-description hr,
    .ct-detail-description .ct-md-table-wrap {
        margin: 0 0 1em 0;
    }

    .ct-detail-description h2,
    .ct-detail-description h3,
    .ct-detail-description h4,
    .ct-detail-description h5,
    .ct-detail-description h6 {
        font-family: inherit;
        letter-spacing: normal;
        text-transform: none;
        line-height: 1.3;
        color: #000;
        margin: 1.6em 0 0.5em 0;
        padding: 0;
    }

    /* Markdown-H1 → h2 (die H1 der Seite ist der Termintitel) */
    .ct-detail-description .ct-md-h1 { font-size: 1.5rem; font-weight: 700; }
    .ct-detail-description .ct-md-h2 { font-size: 1.25rem; font-weight: 700; }
    .ct-detail-description .ct-md-h3 { font-size: 1.1rem; font-weight: 400; color: #777; }
    .ct-detail-description .ct-md-h4,
    .ct-detail-description .ct-md-h5,
    .ct-detail-description .ct-md-h6 { font-size: 1.1rem; font-weight: 600; }

    .ct-detail-description > :first-child {
        margin-top: 0;
    }

    .ct-detail-description > :last-child {
        margin-bottom: 0;
    }

    .ct-detail-description ul,
    .ct-detail-description ol {
        padding: 0 0 0 1.5em;
    }

    .ct-detail-description ul { list-style: disc; }
    .ct-detail-description ol { list-style: decimal; }

    .ct-detail-description li {
        margin: 0.2em 0;
        padding: 0;
    }

    .ct-detail-description li > p { margin: 0 0 0.5em 0; }

    .ct-detail-description li > ul,
    .ct-detail-description li > ol {
        margin: 0.2em 0 0 0;
    }

    .ct-detail-description blockquote {
        border-left: 4px solid #ddd;
        padding: 0.1em 0 0.1em 1em;
        color: #666;
        font-style: normal;
        font-size: inherit;
        background: none;
    }

    .ct-detail-description blockquote > :last-child {
        margin-bottom: 0;
    }

    .ct-detail-description code {
        font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.875em;
        background: #f0f0f0;
        border-radius: 4px;
        padding: 0.1em 0.35em;
        white-space: pre-wrap;
    }

    .ct-detail-description pre {
        background: #f6f6f6;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 0.8em 1em;
        overflow-x: auto;
        line-height: 1.5;
    }

    .ct-detail-description pre code {
        display: block;
        background: none;
        border-radius: 0;
        padding: 0;
        font-size: 0.9rem;
        white-space: pre;
    }

    /* Wie der MailChimp-Teiler im Newsletter: 2px schwarz, 20px Abstand */
    .ct-detail-description hr {
        height: 0;
        border: 0;
        border-top: 2px solid #000;
        margin-top: 20px;
        margin-bottom: 20px;
    }

    .ct-detail-description img {
        max-width: 100%;
        height: auto;
    }

    /* ChurchTools-Erwähnungen (Personen, Gruppen, Wiki): nur Text, kein Link */
    .ct-detail-description .ct-mention {
        color: inherit;
        text-decoration: none;
        cursor: auto;
    }

    /* Tabellen (GFM): Wrapper scrollt auf schmalen Bildschirmen horizontal */
    .ct-detail-description .ct-md-table-wrap {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .ct-detail-description table {
        width: 100%;
        margin: 0;
        border-collapse: collapse;
        border-spacing: 0;
        border: 1px solid #ddd;
        background: none;
        font: inherit;
        line-height: 1.5;
        color: inherit;
    }

    .ct-detail-description th,
    .ct-detail-description td {
        padding: 0.5em 0.8em;
        border: 1px solid #ddd;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        vertical-align: top;
    }

    .ct-detail-description th {
        font-weight: 700;
        background: #f5f5f5;
    }

    .ct-detail-link {
        margin-top: 1.5rem;
        font-size: 1.1rem;
        line-height: 1.8;
        color: #333;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    /* Protected email links - sehen aus wie normale Links */
    .ct-protected-email {
        color: inherit;
        text-decoration: underline;
        cursor: pointer;
    }

    .ct-protected-email:hover {
        opacity: 0.8;
    }

    .ct-detail-link a {
        text-decoration: underline;
        word-break: break-all;
    }

    /* Button (verwendet auf Übersichts- und Detailseite) */
    .ct-detail-button {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        border: 2px solid #000;
        color: #000;
        text-decoration: none;
        font-size: 1rem;
        width: fit-content;
    }

    .ct-detail-button::after {
        content: ' →';
    }

    .ct-detail-button:hover {
        background-color: #000;
        color: #fff;
    }

    /* Margin-Anpassungen für verschiedene Kontexte */
    .ct-event-info .ct-detail-button {
        margin-top: 0.35rem;
    }

    .ct-detail-main .ct-detail-button {
        margin-top: 1.5rem;
    }

    /* Filter buttons - EINHEITLICH für Desktop + Mobile */
    .ct-filter-buttons {
        display: flex;
        gap: 1rem;
        margin-bottom: 3rem;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 0.5rem;
        position: relative;
        padding-right: 2rem;
        cursor: grab;
        user-select: none;
    }

    .ct-filter-buttons::-webkit-scrollbar {
        display: none;
    }

    .ct-filter-buttons.dragging {
        cursor: grabbing;
        scroll-behavior: auto;
    }

    /* Gradient - IMMER definiert, Sichtbarkeit per JS */
    .ct-scroll-gradient {
        position: absolute;
        right: 0;
        width: 6rem;
        background: linear-gradient(to left,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 255, 255, 0.95) 15%,
            rgba(255, 255, 255, 0.7) 40%,
            rgba(255, 255, 255, 0) 100%);
        pointer-events: none;
        z-index: 10;
        display: none;
    }

    .ct-scroll-gradient.visible {
        display: block;
    }

    .ct-filter-button {
        padding: 0.5rem 1rem;
        border: 2px solid #000;
        background: #fff;
        color: #000;
        text-decoration: none;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        height: 50px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        white-space: nowrap;
    }

    .ct-filter-button:focus {
        outline: none;
    }

    .ct-filter-button:hover {
        background: #000;
        color: #fff;
    }

    .ct-filter-button.active {
        background: var(--ct-primary-color, #FCC927);
        border-color: var(--ct-primary-color, #FCC927);
        color: #000;
    }

    .ct-filter-button.active:hover {
        background: #000;
        border-color: #000;
        color: #fff;
    }

    .ct-filter-button:last-child,
    .ct-filter-dropdown {
        margin-right: 1rem;
    }

    .ct-selection-label {
        font-weight: 600;
        align-self: center;
        margin-right: 0.5rem;
    }

    /* Touch-Geräte: Hover-Effekte deaktivieren */
    @media (hover: none) {
        .ct-filter-button:hover {
            background: #fff;
            color: #000;
        }

        .ct-filter-button.active:hover {
            background: var(--ct-primary-color, #FCC927);
            border-color: var(--ct-primary-color, #FCC927);
            color: #000;
        }
    }

    /* Kalender-Abonnement – Dialog */
    .ct-subscribe-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        align-items: center;
        justify-content: center;
    }

    .ct-subscribe-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
    }

    .ct-subscribe-dialog {
        position: relative;
        background: #fff;
        max-width: 500px;
        width: calc(100% - 2rem);
        margin: 1rem;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        z-index: 1;
    }

    .ct-subscribe-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 2rem;
        line-height: 1;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 2rem;
        height: 2rem;
        transition: color 0.2s;
    }

    .ct-subscribe-close:hover {
        color: #000;
    }

    .ct-subscribe-dialog h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .ct-subscribe-info {
        color: #666;
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }

    .ct-subscribe-links {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .ct-subscribe-calendar {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .ct-subscribe-icon {
        min-width: 2rem;
        font-size: 1.5rem;
    }

    .ct-subscribe-calendar-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .ct-subscribe-calendar-body strong {
        font-size: 0.95rem;
    }

    .ct-subscribe-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
    }

    .ct-subscribe-link {
        flex: 1;
        min-width: 120px;
        padding: 0.5rem 1rem;
        border: 2px solid #000;
        background: #fff;
        color: #000;
        text-decoration: none;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        height: 50px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .ct-subscribe-link:focus {
        outline: none;
    }

    .ct-subscribe-link:hover {
        background: #000;
        color: #fff;
    }

    .ct-subscribe-link.copied {
        background: #4CAF50;
        border-color: #4CAF50;
        color: #fff;
    }

    .ct-subscribe-hint {
        color: #666;
        font-size: 0.875rem;
        margin: 1rem 0 0 0;
        text-align: left;
    }

    @media (max-width: 799px) {
        .ct-subscribe-close {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 2.5rem;
        }
    }

    /* Filter Dropdown (nur im Kalender-Modus) */
    .ct-filter-dropdown {
        position: relative;
        display: inline-block;
    }

    .ct-filter-dropdown-button {
        padding: 0.5rem 2rem 0.5rem 1rem;
        border: 2px solid #000;
        background: #fff;
        color: #000;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        white-space: nowrap;
        height: 50px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .ct-filter-dropdown-button::after {
        content: '▼';
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.7rem;
        transition: transform 0.2s;
    }

    .ct-filter-dropdown-button.active::after {
        transform: translateY(-50%) rotate(180deg);
    }

    .ct-filter-dropdown-button:hover {
        background: #000;
        color: #fff;
    }

    .ct-filter-dropdown-button.has-filter {
        background: var(--ct-primary-color, #FCC927);
        border-color: var(--ct-primary-color, #FCC927);
    }

    .ct-filter-dropdown-button.has-filter:hover {
        background: #000;
        border-color: #000;
        color: #fff;
    }

    .ct-filter-dropdown-menu {
        display: none;
        position: absolute;
        background: #fff;
        border: 2px solid #000;
        width: 280px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .ct-filter-dropdown-menu.active {
        display: block;
    }

    .ct-filter-dropdown-search {
        padding: 0.5rem;
        border-bottom: 1px solid #ddd;
        position: relative;
    }

    .ct-filter-dropdown-search input {
        width: 100%;
        padding: 0.4rem 2rem 0.4rem 0.4rem;
        border: 1px solid #ccc;
        font-size: 16px;
        font-family: inherit;
        box-sizing: border-box;
    }

    .ct-filter-dropdown-search input:focus {
        outline: none;
        border-color: #000;
    }

    .ct-filter-dropdown-search-clear {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.25rem;
        color: #666;
        display: none;
    }

    .ct-filter-dropdown-search-clear.visible {
        display: block;
    }

    .ct-filter-dropdown-search-clear:hover {
        color: #000;
    }

    .ct-filter-dropdown-items {
        max-height: 300px;
        overflow-y: auto;
    }

    .ct-filter-dropdown-item {
        display: block;
        padding: 0.75rem 1rem;
        color: #000;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        font-size: 0.95rem;
        font-family: inherit;
    }

    .ct-filter-dropdown-item:hover {
        background: #f5f5f5;
    }

    .ct-filter-dropdown-item.active {
        background: var(--ct-primary-color, #FCC927);
        font-weight: 600;
    }

`;

    // =====================================================
    // HTML
    // =====================================================
    const HTML = `
<!--
    ╔══════════════════════════════════════════════════════════════╗
    ║  ChurchTools Termine                                         ║
    ║  Terminseite aus ChurchTools-Kalendern – frei nutzbar (MIT)  ║
    ║  https://github.com/pulsechurch/churchtools-termine          ║
    ╚══════════════════════════════════════════════════════════════╝
-->
<div class="ct-termine-wrapper" id="ctTermineWrapper">
    <!-- Header (nur auf Übersichtsseite sichtbar) -->
    <div class="ct-termine-header" id="ctTermineHeader">
        <div class="ct-termine-header-bg"></div>
        <div class="ct-termine-header-overlay"></div>
        <div class="ct-termine-header-content">
            <h1 id="ctTermineHeaderTitle"></h1>
            <a href="#" class="ct-termine-header-subscribe" onclick="ctTermine.openSubscribeModal(); return false;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                </svg>
                <span>Kalender abonnieren</span>
            </a>
        </div>
    </div>


    <!-- Listenansicht -->
    <div class="ct-list-view" id="ctListView">
        <div id="ctEventsContainer"></div>
    </div>

    <!-- Detailansicht -->
    <div class="ct-detail-view" id="ctDetailView"></div>

    <!-- Kalender-Abonnement-Dialog -->
    <div class="ct-subscribe-modal" id="ctSubscribeModal">
        <div class="ct-subscribe-overlay" onclick="ctTermine.closeSubscribeModal()"></div>
        <div class="ct-subscribe-dialog">
            <button class="ct-subscribe-close" onclick="ctTermine.closeSubscribeModal()">&times;</button>
            <h2>Kalender abonnieren</h2>
            <p class="ct-subscribe-info">Abonniere einen Kalender direkt (für iOS & Windows Apps) oder kopiere den Link und füge ihn deinem Kalender hinzu.</p>
            <div class="ct-subscribe-links" id="ctSubscribeLinks"></div>
        </div>
    </div>
</div>
`;

    // In den Platzhalter <div id="ct-termine"></div> einsetzen (fehlt er: direkt vor dem Skript-Tag)
    function mount() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        let target = document.getElementById('ct-termine');
        if (!target) {
            target = document.createElement('div');
            const script = document.currentScript;
            if (script && script.parentNode && script.parentNode !== document.head) {
                script.parentNode.insertBefore(target, script);
            } else {
                document.body.appendChild(target);
            }
        }
        target.innerHTML = HTML;

        // Header sofort ausblenden, wenn eine Detailseite geladen wird (verhindert Flackern)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id') && urlParams.get('date')) {
            document.getElementById('ctTermineHeader').classList.add('hidden');
        }
    }

    mount();

    // =====================================================
    // LOGIK
    // =====================================================
    // Funktionen für die onclick-Attribute, gebündelt unter einem Namen (keine Konflikte mit anderen Skripten der Website)
    const ctTermine = window.ctTermine = {};

    // Primärfarbe als CSS-Variable setzen
    document.documentElement.style.setProperty('--ct-primary-color', CT_CONFIG.primaryColor);

    let allEvents = [];
    const calendarFeedKeys = {}; // Kalender-ID → Sicherheitsschlüssel für den iCal-Link (aus den Termindaten)
    let savedScrollPosition = 0;
    let savedFilterTerm = ''; // Speichert den aktuellen Filter (nicht in URL)
    let savedCalendarId = ''; // Speichert die aktuelle Kalender-Auswahl (nicht in URL)
    let shouldScrollToFilter = false; // Flag für Auto-Scroll bei Filteränderungen

    // Datumsformate einmal anlegen (toLocale…String erzeugt sonst bei jedem Aufruf ein neues Format-Objekt)
    const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    const TIME_FORMAT = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
    const WEEKDAY_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long' });
    const WEEKDAY_SHORT_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
    // Mehrtägige Termine: formatRange fasst gleiche Teile zusammen („Freitag, 18. – Sonntag, 20. Juni 2027“)
    const DATE_RANGE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Hilfsfunktionen
    function getUrlParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function formatDate(dateString) {
        return DATE_FORMAT.format(new Date(dateString));
    }

    function formatTime(dateString) {
        return TIME_FORMAT.format(new Date(dateString));
    }

    function getWeekday(dateString) {
        return WEEKDAY_FORMAT.format(new Date(dateString));
    }

    // Ende liegt an einem anderen Kalendertag als der Beginn (bei Ganztägig ist endDate der letzte Tag, inklusive).
    // Über Nacht bis 08:00 am Folgetag zählt als eintägig (z.B. Sa 20:00 - So 01:00)
    function isMultiDay(event) {
        if (!event.endDate || formatDate(event.startDate) === formatDate(event.endDate)) return false;
        if (event.allDay) return true;
        const end = new Date(event.endDate);
        const nextDay = new Date(event.startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return formatDate(nextDay) !== formatDate(end) || end.getHours() * 60 + end.getMinutes() > 8 * 60;
    }

    // „Freitag, 18. Juni 2027“ bzw. mehrtägig „Freitag, 18. – Sonntag, 20. Juni 2027“
    function formatDateRange(event) {
        return isMultiDay(event) ?
            // formatRange setzt schmale Leerzeichen (U+2009) um den Strich – auf normale vereinheitlichen
            DATE_RANGE_FORMAT.formatRange(new Date(event.startDate), new Date(event.endDate)).replace(/\s–\s/, ' – ') :
            `${getWeekday(event.startDate)}, ${formatDate(event.startDate)}`;
    }

    function formatTimeRange(event) {
        if (event.allDay) return 'Ganztägig';
        if (isMultiDay(event)) {
            // „Fr 08:00 - So 16:00 Uhr“ – ohne Wochentag sähe es aus wie täglich 08:00 bis 16:00
            return `${WEEKDAY_SHORT_FORMAT.format(new Date(event.startDate))} ${formatTime(event.startDate)} - ` +
                `${WEEKDAY_SHORT_FORMAT.format(new Date(event.endDate))} ${formatTime(event.endDate)} Uhr`;
        }
        return `${formatTime(event.startDate)}${event.endDate ? ` - ${formatTime(event.endDate)}` : ''} Uhr`;
    }

    // Datum im URL-Format YYYYMMDD (für ?id=...&date=...)
    function getDateKey(dateString) {
        return dateString.split('T')[0].replace(/-/g, '');
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;

        // Schneide bei maxLength ab
        let truncated = text.slice(0, maxLength);

        // Finde das letzte Satzende (. ! ?)
        const lastSentenceEnd = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?')
        );

        // Wenn ein Satzende gefunden wurde, schneide dort ab (inklusive Satzzeichen)
        if (lastSentenceEnd > 0) {
            return truncated.slice(0, lastSentenceEnd + 1).trim();
        }

        // Kein Satzende gefunden: Am letzten Leerzeichen (Ende des letzten vollständigen Wortes) abschneiden
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 0) {
            truncated = truncated.slice(0, lastSpace);
        }
        return truncated.trim() + '…';
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

    // Wert als JavaScript-Argument für onclick-Attribute (sicher auch bei Anführungszeichen, z.B. aus ?filter=...)
    function jsArg(value) {
        return escapeHtml(JSON.stringify(value));
    }

    function rot13(str) {
        return str.replace(/[a-zA-Z]/g, c => {
            const base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
        });
    }

    function positionDropdownMenu(menu, button) {
        if (!menu || !button) return;
        const buttonRect = button.getBoundingClientRect();
        const absoluteRight = document.documentElement.scrollWidth - (buttonRect.right + window.scrollX);
        menu.style.position = 'absolute';
        menu.style.right = `${absoluteRight}px`;
        menu.style.top = `${buttonRect.bottom + window.scrollY + 8}px`;
        menu.style.left = 'auto';
    }

    function openFilterDropdown(menu, button) {
        // Portal-Pattern: Menü an body hängen, damit es nicht vom scrollenden Filter-Container abgeschnitten wird
        if (menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        }
        positionDropdownMenu(menu, button);
        menu.classList.add('active');
        button.classList.add('active');
    }

    function closeFilterDropdown() {
        const menu = document.getElementById('ctFilterDropdownMenu');
        const button = document.querySelector('.ct-filter-dropdown-button');
        if (menu) menu.classList.remove('active');
        if (button) button.classList.remove('active');
    }

    // Sichtbare E-Mail-Adresse mit versteckten Spans (Crawler-Schutz)
    function obfuscateEmailText(email) {
        const parts = email.split('@');
        return `${escapeHtml(parts[0])}<span style="display:none;">null</span>@<span style="display:none;">null</span>${escapeHtml(parts[1])}`;
    }

    // Link mit ROT13-verschlüsselter Adresse; labelHtml optional (Standard: verschleierte Adresse)
    function protectEmail(email, labelHtml) {
        if (!email) return '';
        return `<a href="#" class="ct-protected-email" data-email="${escapeHtml(rot13(email))}" onclick="return ctTermine.decryptEmail(this);">${labelHtml || obfuscateEmailText(email)}</a>`;
    }

    ctTermine.decryptEmail = function(element) {
        const encrypted = element.getAttribute('data-email');
        if (encrypted) {
            window.location.href = 'mailto:' + rot13(encrypted);
        }
        return false;
    };

    function getOptimizedImageUrl(image, width, height) {
        if (!image) return null;
        if (image.imageUrl) return `${image.imageUrl}?w=${width}&h=${height}`;
        return image.fileUrl || null;
    }

    // Anzeigetext für Links: nur der Domainname ohne "www."
    function formatLinkText(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch (e) {
            return url;
        }
    }

    // Erste konfigurierte Adresse, die im Link enthalten ist
    function getLinkButtonConfig(url) {
        return CT_CONFIG.linkButtons.find(config => url.includes(config.address)) || null;
    }

    // Link ist intern, wenn er zur gleichen Domain gehört (mit oder ohne www.)
    function isInternalLink(url) {
        if (!url) return false;
        const normalizeHostname = (host) => host.toLowerCase().replace(/^www\./, '');
        try {
            return normalizeHostname(new URL(url).hostname) === normalizeHostname(window.location.hostname);
        } catch (e) {
            // Bei relativem Link (kein vollständiger URL) als intern behandeln
            return !url.startsWith('http://') && !url.startsWith('https://');
        }
    }

    // Canonical URL dynamisch setzen (für iOS Chrome Teilen-Funktion)
    function updateCanonicalUrl(url) {
        // Canonical Tag finden oder erstellen
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;

        // og:url ebenfalls aktualisieren (falls vorhanden)
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            ogUrl.content = url;
        }
    }

    // ===== Markdown-Rendering =====
    // Eigener, abhängigkeitsfreier Parser für die Termin-Beschreibungen aus ChurchTools.
    // Ablauf: Blockebene (Codeblöcke, Überschriften, Listen, Zitate, Absätze) → Inline-Ebene
    // (Inline-Code, Links, Autolinks, E-Mails, Hervorhebungen). Roh-Text wird immer escaped.

    const MD_BLOCK = {
        fence: /^ {0,3}(`{3,}|~{3,})(.*)$/,
        heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
        hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
        quote: /^ {0,3}> ?(.*)$/,
        ul: /^( {0,3})([*+-])[ \t]+(.*)$/,
        ol: /^( {0,3})(\d{1,9})[.)][ \t]+(.*)$/,
        blank: /^[ \t]*$/
    };

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
        if (isChurchToolsMention(url)) return `<span class="ct-mention">${labelHtml}</span>`;
        if (/^mailto:/i.test(url)) return protectEmail(url.replace(/^mailto:/i, '').split('?')[0], labelHtml);
        const targetAttr = isInternalLink(url) ? '' : ' target="_blank" rel="noopener"';
        return `<a href="${escapeHtml(url)}"${targetAttr}>${labelHtml}</a>`;
    }

    // Inline-Markdown → HTML. Fertige HTML-Stücke werden als Platzhalter (\u0001n\u0002) geparkt,
    // damit spätere Schritte (Escaping, Autolinker, Hervorhebungen) sie nicht mehr verändern.
    function renderInline(text) {
        if (!text) return '';
        const tokens = [];
        const stash = (html) => '\u0001' + (tokens.push(html) - 1) + '\u0002';

        function inline(src, insideLink) {
            // 1. Inline-Code (hat Vorrang vor allem anderen)
            src = src.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, ticks, code) => stash(`<code>${escapeHtml(code)}</code>`));

            // 2. Backslash-Escapes (\* \_ \# ...)
            src = src.replace(/\\([\\`*_{}\[\]()#+\-.!~>|])/g, (m, ch) => stash(escapeHtml(ch)));

            if (!insideLink) {
                // 3. Autolinks in spitzen Klammern: <https://...>, <name@domain.de>
                src = src.replace(/<((?:https?:\/\/|mailto:)[^\s<>]+|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/gi, (m, target) => {
                    if (target.includes('@') && !/^(https?|mailto):/i.test(target)) return stash(protectEmail(target));
                    return stash(buildLink(target, escapeHtml(target.replace(/^mailto:/i, ''))));
                });

                // 4. Bilder ![Alt](URL)
                src = src.replace(/!\[([^\[\]]*)\]\(\s*<?([^\s<>()]+)>?(?:\s+"[^"]*")?\s*\)/g, (m, alt, url) => {
                    const safe = sanitizeUrl(url);
                    return safe ? stash(`<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" loading="lazy">`) : escapeHtml(alt);
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

            // 7. E-Mail-Adressen (geschützt; innerhalb eines Link-Textes nur verschleiert, ohne eigenen Link)
            src = src.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, (email) =>
                stash(insideLink ? obfuscateEmailText(email) : protectEmail(email)));

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

    function renderMarkdownTable(table) {
        const cell = (tag, text, k) => {
            const align = table.aligns[k] ? ` style="text-align: ${table.aligns[k]};"` : '';
            return `<${tag}${align}>${renderInline(text)}</${tag}>`;
        };
        const head = `<thead><tr>${table.header.map((text, k) => cell('th', text, k)).join('')}</tr></thead>`;
        const body = table.rows.length
            ? `<tbody>${table.rows.map(row => `<tr>${row.map((text, k) => cell('td', text, k)).join('')}</tr>`).join('')}</tbody>`
            : '';
        return `<div class="ct-md-table-wrap"><table>${head}${body}</table></div>`;
    }

    // Liste ab Zeile i einlesen; liefert { html, next }
    function renderMarkdownList(lines, i, type) {
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

        const itemsHtml = items.map(item => {
            while (item.length && MD_BLOCK.blank.test(item[item.length - 1])) item.pop();
            const tight = !loose && !item.some(l => MD_BLOCK.blank.test(l));
            return `<li>${renderMarkdownBlocks(item, tight)}</li>`;
        }).join('');

        const startAttr = type === 'ol' && start !== 1 ? ` start="${start}"` : '';
        return { html: `<${type}${startAttr}>${itemsHtml}</${type}>`, next: i };
    }

    // Blockebene. tight = true: Absätze ohne <p> (für kompakte Listeneinträge)
    function renderMarkdownBlocks(lines, tight) {
        let html = '';
        let para = [];
        let i = 0;

        const flushPara = () => {
            if (!para.length) return;
            // Einfache Zeilenumbrüche innerhalb eines Absatzes bleiben als <br> erhalten
            const content = renderInline(para.map(l => l.trim().replace(/\\$/, '')).join('\n')).replace(/\n/g, '<br>\n');
            html += tight ? content : `<p>${content}</p>`;
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
                html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;
                continue;
            }

            // Überschriften: Markdown-H1 → h2 usw.
            m = line.match(MD_BLOCK.heading);
            if (m) {
                flushPara();
                const level = m[1].length;
                const tag = 'h' + Math.min(level + 1, 6);
                html += `<${tag} class="ct-md-h${level}">${renderInline(m[2] || '')}</${tag}>`;
                i++;
                continue;
            }

            // Trennlinie (vor Listen prüfen, da "* * *" sonst als Liste gilt)
            if (MD_BLOCK.hr.test(line)) {
                flushPara();
                html += '<hr>';
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
                html += `<blockquote>${renderMarkdownBlocks(quoted, false)}</blockquote>`;
                continue;
            }

            // Listen (nummerierte Listen unterbrechen einen Absatz nur, wenn sie mit 1 beginnen –
            // damit z.B. "am\n3. Oktober" in altem Plaintext keine Liste wird)
            const olMatch = line.match(MD_BLOCK.ol);
            if (MD_BLOCK.ul.test(line) || (olMatch && (!para.length || olMatch[2] === '1'))) {
                flushPara();
                const list = renderMarkdownList(lines, i, olMatch ? 'ol' : 'ul');
                html += list.html;
                i = list.next;
                continue;
            }

            // Tabelle (GFM)
            const table = parseMarkdownTable(lines, i);
            if (table) {
                flushPara();
                html += renderMarkdownTable(table);
                i = table.next;
                continue;
            }

            para.push(line);
            i++;
        }

        flushPara();
        return html;
    }

    function renderMarkdown(text) {
        if (!text) return '';
        const lines = String(text)
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(l => l.replace(/^[ \t]+/, ws => ws.replace(/\t/g, '    ')));
        return renderMarkdownBlocks(lines, false);
    }

    // Markdown entfernen (für Teaser/Kurztexte), damit keine Markdown-Zeichen sichtbar werden
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
        return tablesToPlainText(text, '; ')
            .replace(/^ {0,3}(`{3,}|~{3,}).*$/gm, '')
            .replace(/^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/gm, '$1')
            .replace(/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
            .replace(/^[ \t]*(?:>[ \t]?)+/gm, '')
            .replace(/^[ \t]*[*+-][ \t]+/gm, '')
            .replace(/!\[([^\[\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\[\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<((?:https?:\/\/|mailto:)?[^\s<>]+)>/g, '$1')
            .replace(/`+/g, '')
            .replace(/(\*\*\*|\*\*|__|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
            .replace(/(^|[^\p{L}\p{N}*])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?![\p{L}\p{N}*])/gu, '$1$2')
            .replace(/(^|[^\p{L}\p{N}_])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}_])/gu, '$1$2')
            .replace(/\\([\\`*_{}\[\]()#+\-.!~>|])/g, '$1')
            .replace(/[ \t]*\n[\s]*/g, ' ')
            .trim();
    }

    // Alle Termine aus ChurchTools laden (nutzt den bereits gestarteten Prefetch)
    async function fetchEvents() {
        const container = document.getElementById('ctEventsContainer');

        // Ladehinweis erst nach 5 Sekunden zeigen, falls die Daten noch fehlen
        const loadingTimeout = setTimeout(() => {
            container.innerHTML = '<div class="ct-loading">Warte auf Daten vom Server...</div>';
        }, 5000);

        try {
            // Nutze die bereits gestartete Prefetch-Promise (lädt alle Termine für 2 Jahre)
            if (configError) throw new Error(configError);
            const response = await prefetchPromise;
            prefetchPromise = null; // Nur einmal verwenden

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            clearTimeout(loadingTimeout);

            // Termine aufbereiten
            allEvents = (data.data || []).map(item => {
                const base = item.appointment?.base || item.base || item;
                const calculated = item.appointment?.calculated || item.calculated || {};
                const startDate = calculated.startDate || base.startDate;
                // Roh-Beschreibung (Markdown oder alter Plaintext)
                const description = stripHtml(base.description || base.information || '');
                if (base.calendar?.randomUrl) calendarFeedKeys[base.calendar.id] = base.calendar.randomUrl;

                return {
                    id: base.id,
                    calendarId: base.calendar?.id || base.calendarId || null,
                    title: base.title || base.caption || 'Termin',
                    subtitle: base.subtitle || '',
                    description: description,
                    plainDescription: markdownToPlainText(description),
                    startDate: startDate,
                    endDate: calculated.endDate || base.endDate,
                    dateKey: getDateKey(startDate),
                    allDay: base.allDay || false,
                    image: base.image || null,
                    address: base.address || null,
                    link: base.link || null
                };
            }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            if (allEvents.length === 0) {
                container.innerHTML = '<div class="ct-no-results"><h2>Keine bevorstehenden Termine gefunden.</h2></div>';
                return;
            }

            const eventId = getUrlParam('id');
            if (eventId) {
                showDetailView(eventId);
            } else {
                // Kalender und Filter können gleichzeitig aktiv sein
                savedCalendarId = getUrlParam('calendar') || '';
                savedFilterTerm = getUrlParam('filter') || '';
                filterByCalendarAndText(savedCalendarId, savedFilterTerm);
            }

        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error('Error fetching events:', error);

            // Einrichtungsfehler sichtbar machen, damit man ihn beim Einbinden sofort bemerkt
            if (configError) {
                container.innerHTML = `<div class="ct-error"><h2>Terminseite nicht eingerichtet</h2><p>${escapeHtml(configError)}</p></div>`;
                return;
            }

            // Freundlicher Hinweis statt technischer Fehlermeldung (Details nur in der Konsole)
            container.innerHTML = `
                <div class="ct-error">
                    <div class="ct-error-icon">🗓️</div>
                    <h2>Unsere Termine machen gerade eine kurze Pause</h2>
                    <p>Der Terminkalender ist im Moment leider nicht erreichbar. Bitte schau einfach später noch einmal vorbei – dann findest du hier wieder alle Events.</p>
                    <a href="#" class="ct-detail-button" onclick="location.reload(); return false;">Erneut versuchen</a>
                </div>
            `;
        } finally {
            initializeSubscribeModal();
        }
    }

    // Termine als HTML
    function renderEvents(events) {
        return events.map(event => {
            // Optimierte Bildgröße für die Listenansicht
            const imageUrl = getOptimizedImageUrl(event.image, 600, 400);

            return `
                <a href="?id=${event.id}&date=${event.dateKey}" class="ct-event-item" onclick="return ctTermine.handleEventClick(event, ${jsArg(event.id)}, '${event.dateKey}')">
                    <div class="ct-event-content">
                        ${imageUrl ?
                            `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(event.title)}" class="ct-event-image">` :
                            `<div class="ct-event-image ct-event-image-placeholder"><span>${escapeHtml(event.title)}</span></div>`
                        }
                        <div class="ct-event-info">
                            <h3 class="ct-event-title">${escapeHtml(event.title)}</h3>
                            ${event.subtitle ? `<div class="ct-event-subtitle">${escapeHtml(event.subtitle)}</div>` : ''}
                            <div class="ct-event-meta">
                                <div><strong>${formatDateRange(event)}</strong></div>
                                <div>${formatTimeRange(event)}</div>
                            </div>
                            <p class="ct-event-description">${escapeHtml(truncateText(event.plainDescription, 190))}</p>
                            <span class="ct-detail-button">Veranstaltung ansehen</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    }

    // URL-Parameter setzen
    function updateUrl(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url);
    }

    // Konfigurierter Filter zum Suchbegriff (Groß-/Kleinschreibung egal)
    function findFilterConfig(filterTerm) {
        if (!filterTerm) return null;
        const filterLower = filterTerm.toLowerCase();
        return CT_CONFIG.filters.find(config => config.filter.toLowerCase() === filterLower) || null;
    }

    // Kalender-Modus: Kalender-Buttons + Dropdown mit weiteren Filtern
    function renderCalendarButtons(calendarId, filterTerm) {
        const activeFilter = findFilterConfig(filterTerm);

        // "Alle" ist nur aktiv wenn KEIN Kalender UND KEIN Filter ausgewählt ist
        const allActive = !calendarId && !filterTerm ? ' active' : '';
        let html = `<a href="${window.location.pathname}" class="ct-filter-button${allActive}" onclick="return ctTermine.handleCalendarClick(event, null)">Alle</a>`;

        html += CT_CONFIG.calendars.map(cal => {
            const activeClass = calendarId === String(cal.id) ? ' active' : '';
            const icon = cal.icon ? `${escapeHtml(cal.icon)} ` : '';
            return `<a href="?calendar=${encodeURIComponent(cal.id)}" class="ct-filter-button${activeClass}" onclick="return ctTermine.handleCalendarClick(event, ${jsArg(cal.id)})">${icon}${escapeHtml(cal.label)}</a>`;
        }).join('');

        // Filter-Dropdown nur anzeigen wenn Filter konfiguriert sind
        if (CT_CONFIG.filters.length > 0) {
            const filterItems = CT_CONFIG.filters.map(config => {
                const activeClass = config === activeFilter ? ' active' : '';
                return `<button class="ct-filter-dropdown-item${activeClass}" onclick="return ctTermine.handleFilterDropdownClick(event, ${jsArg(config.filter)})">${escapeHtml(config.label)}</button>`;
            }).join('');

            const filterButtonText = filterTerm ? `Filter: ${escapeHtml(activeFilter ? activeFilter.label : filterTerm)}` : 'Weitere Filter';
            const hasFilterClass = filterTerm ? ' has-filter' : '';

            html += `
                <div class="ct-filter-dropdown">
                    <button class="ct-filter-dropdown-button${hasFilterClass}" onclick="ctTermine.toggleFilterDropdown(event)">
                        ${filterButtonText}
                    </button>
                    <div class="ct-filter-dropdown-menu" id="ctFilterDropdownMenu" onclick="event.stopPropagation()">
                        <div class="ct-filter-dropdown-search">
                            <input type="text" placeholder="Suche nach Titel..." id="ctFilterDropdownSearch" onkeyup="ctTermine.handleFilterDropdownSearch(event)" onclick="event.stopPropagation()">
                            <span class="ct-filter-dropdown-search-clear" id="ctFilterDropdownSearchClear" onclick="ctTermine.clearFilterDropdownSearch(event)">×</span>
                        </div>
                        <div class="ct-filter-dropdown-items">
                            ${filterItems}
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    // Filter-Modus: Buttons für Text-Filter
    function renderFilterButtons(filterTerm) {
        const activeFilter = findFilterConfig(filterTerm);
        const filterButton = (filter, label, isActive) =>
            `<a href="?filter=${encodeURIComponent(filter)}" class="ct-filter-button${isActive ? ' active' : ''}" onclick="return ctTermine.handleFilterClick(event, ${jsArg(filter)})">${escapeHtml(label)}</a>`;

        let html = `<a href="${window.location.pathname}" class="ct-filter-button${filterTerm ? '' : ' active'}" onclick="return ctTermine.handleFilterClick(event, '')">Alle</a>`;
        html += CT_CONFIG.filters.map(config => filterButton(config.filter, config.label, config === activeFilter)).join('');

        // Aktiver Filter, der nicht in der Konfiguration steht (z.B. aus der URL)
        if (filterTerm && !activeFilter) {
            html += filterButton(filterTerm, filterTerm, true);
        }
        return html;
    }

    function renderSelectionButtons(calendarId, filterTerm) {
        let buttonsHtml;
        if (CT_CONFIG.selectionMode === 'calendar') {
            buttonsHtml = renderCalendarButtons(calendarId, filterTerm);
        } else if (CT_CONFIG.filters.length > 0) {
            buttonsHtml = renderFilterButtons(filterTerm);
        } else {
            return '';
        }

        const label = CT_CONFIG.selectionLabel ? `<span class="ct-selection-label">${escapeHtml(CT_CONFIG.selectionLabel)}</span>` : '';
        return `<div class="ct-filter-buttons">${label}${buttonsHtml}</div>`;
    }

    // Scrollposition der Filter-Buttons wiederherstellen
    function restoreFilterScroll(container, savedScroll) {
        const filterButtons = container.querySelector('.ct-filter-buttons');
        if (!filterButtons) return;

        requestAnimationFrame(() => {
            if (shouldScrollToFilter) {
                // Filter geändert: zum Dropdown scrollen (ganz rechts)
                filterButtons.scrollLeft = filterButtons.scrollWidth - filterButtons.clientWidth;
                shouldScrollToFilter = false;
            } else if (savedScroll > 0) {
                // Sonst: gespeicherte Scrollposition wiederherstellen
                filterButtons.scrollLeft = savedScroll;
            }

            updateScrollGradient(filterButtons);
        });
    }

    // Alle Termine auf einmal anzeigen
    function displayEvents(events) {
        const container = document.getElementById('ctEventsContainer');

        // Altes Dropdown-Menü vom body entfernen (wird beim Öffnen dorthin verschoben)
        const oldDropdownMenu = document.getElementById('ctFilterDropdownMenu');
        if (oldDropdownMenu && oldDropdownMenu.parentElement === document.body) {
            oldDropdownMenu.remove();
        }

        // Speichere horizontale Scroll-Position der Filter-Buttons (falls vorhanden)
        const existingFilterButtons = container.querySelector('.ct-filter-buttons');
        const savedFilterScroll = existingFilterButtons ? existingFilterButtons.scrollLeft : 0;

        const selectionButtonsHtml = renderSelectionButtons(getUrlParam('calendar'), getUrlParam('filter'));
        const eventsHtml = events.length > 0
            ? `<div class="ct-events-list">${renderEvents(events)}</div>`
            : '<div class="ct-no-results"><h2>Keine Termine gefunden</h2></div>';

        container.innerHTML = selectionButtonsHtml + eventsHtml;

        restoreFilterScroll(container, savedFilterScroll);
        initializeDragScroll();
    }

    // Gradient an Position und Höhe der Filterleiste ausrichten (absolute Koordinaten relativ zur Seite)
    function positionScrollGradient(gradient, filterButtons) {
        const rect = filterButtons.getBoundingClientRect();
        gradient.style.top = `${rect.top + window.scrollY}px`;
        gradient.style.height = `${rect.height}px`;
    }

    // Gradient einmalig erstellen; Position wird nur bei Resize aktualisiert, nicht bei jedem Scroll
    function updateScrollGradient(filterButtons) {
        if (!filterButtons || document.getElementById('ctScrollGradient')) return;

        const gradient = document.createElement('div');
        gradient.id = 'ctScrollGradient';
        gradient.className = 'ct-scroll-gradient visible';
        document.body.appendChild(gradient);
        positionScrollGradient(gradient, filterButtons);
    }

    window.addEventListener('resize', () => {
        const filterButtons = document.querySelector('.ct-filter-buttons');
        const gradient = document.getElementById('ctScrollGradient');
        if (filterButtons && gradient) {
            positionScrollGradient(gradient, filterButtons);
        }

        closeFilterDropdown();
    });

    // Drag-to-Scroll für Filterleiste
    function initializeDragScroll() {
        const filterButtons = document.querySelector('.ct-filter-buttons');
        if (!filterButtons) return;

        let isDown = false;
        let startX;
        let scrollLeft;
        let hasMoved = false;

        const stopDragging = () => {
            isDown = false;
            filterButtons.classList.remove('dragging');
        };

        filterButtons.addEventListener('mousedown', (e) => {
            // Dropdown-Menü ausschließen (ist sowieso außerhalb)
            if (e.target.closest('.ct-filter-dropdown-menu')) {
                return;
            }

            // ALLE anderen Elemente (inkl. Buttons) sind dragbar
            isDown = true;
            hasMoved = false;
            filterButtons.classList.add('dragging');
            startX = e.pageX - filterButtons.offsetLeft;
            scrollLeft = filterButtons.scrollLeft;
        });

        filterButtons.addEventListener('mouseleave', stopDragging);
        filterButtons.addEventListener('mouseup', stopDragging);

        filterButtons.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            hasMoved = true;
            const x = e.pageX - filterButtons.offsetLeft;
            filterButtons.scrollLeft = scrollLeft - (x - startX) * 1.5;
        });

        // Click-Prevention nur bei echtem Drag (mehr als 5px Bewegung, nicht nur Wackler)
        filterButtons.addEventListener('click', (e) => {
            if (hasMoved && Math.abs(filterButtons.scrollLeft - scrollLeft) > 5) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    // Detailbereich anzeigen (Header und Liste ausblenden)
    function showDetailContent(html) {
        document.getElementById('ctTermineHeader').classList.add('hidden');
        document.getElementById('ctListView').classList.add('hidden');

        const detailView = document.getElementById('ctDetailView');
        detailView.innerHTML = html;
        detailView.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Hinweis, wenn der Termin nicht gefunden wurde
    function showEventNotFound() {
        showDetailContent(`
            <div class="ct-no-results">
                <h2>Termin nicht gefunden</h2>
                <p>Der gewünschte Termin konnte nicht gefunden werden.</p>
                <a href="?" class="ct-detail-button" onclick="return ctTermine.handleBackClick(event)">Zurück zur Übersicht</a>
            </div>
        `);
    }

    function renderAddress(address) {
        if (!address) return '';
        const parts = [];
        if (address.name) parts.push(escapeHtml(address.name));
        if (address.street) parts.push(escapeHtml(address.street));
        if (address.zip && address.city) parts.push(escapeHtml(`${address.zip} ${address.city}`));
        return parts.join('<br>');
    }

    // Event-Link als Button (wenn konfiguriert) oder als Textlink mit Domainname
    function renderEventLink(link) {
        const url = sanitizeUrl(link);
        if (!url) return '';

        const targetAttr = isInternalLink(url) ? '' : ' target="_blank" rel="noopener"';
        const buttonConfig = getLinkButtonConfig(url);
        if (buttonConfig) {
            return `<a href="${escapeHtml(url)}"${targetAttr} class="ct-detail-button">${escapeHtml(buttonConfig.label)}</a>`;
        }
        return `<div class="ct-detail-link">Link: <a href="${escapeHtml(url)}"${targetAttr}>${escapeHtml(formatLinkText(url))}</a></div>`;
    }

    function renderMetaItem(label, valueHtml) {
        return `
            <div class="ct-detail-meta-item">
                <span class="ct-detail-meta-label">${label}</span>
                <div class="ct-detail-meta-value">${valueHtml}</div>
            </div>
        `;
    }

    // Titel eines Termins per ID: erst aus den geladenen Terminen, sonst direkt bei ChurchTools
    async function getEventTitleById(eventId) {
        const known = allEvents.find(e => String(e.id) === String(eventId));
        if (known) return known.title;

        for (const calendarId of CT_CONFIG.calendarIds) {
            try {
                const response = await fetch(`${CT_CONFIG.churchToolsUrl}/api/calendars/${calendarId}/appointments/${encodeURIComponent(eventId)}`, {
                    headers: { 'Authorization': `Login ${CT_CONFIG.apiToken}` }
                });
                if (!response.ok) continue;
                const data = await response.json();
                const title = data.data?.appointment?.title;
                if (title) return title;
            } catch (e) {
                // nächster Kalender
            }
        }
        return null;
    }

    // Fallback für alte Links: Wurde ein Serientermin in ChurchTools einzeln geändert,
    // bekommt er eine neue ID. Dann den Termin mit gleichem Titel am gleichen Tag zeigen.
    async function showMovedEventOrNotFound(eventId, dateParam) {
        const title = await getEventTitleById(eventId);
        const normalize = text => String(text || '').trim().toLowerCase();
        const event = title && allEvents.find(e => e.dateKey === dateParam && normalize(e.title) === normalize(title));

        // Inzwischen weiternavigiert? Dann nichts mehr anzeigen
        if (getUrlParam('id') !== String(eventId) || getUrlParam('date') !== dateParam) return;

        if (!event) {
            console.error('Event not found:', eventId, dateParam);
            showEventNotFound();
            return;
        }

        // URL auf die neue ID umstellen (Teilen/Lesezeichen nutzen dann die aktuelle Adresse)
        const url = new URL(window.location.href);
        url.searchParams.set('id', event.id);
        window.history.replaceState(window.history.state, '', url);
        showDetailView(event.id);
    }

    // Detailansicht anzeigen
    function showDetailView(eventId) {
        const dateParam = getUrlParam('date');

        // ID und Datum müssen passen (date im Format YYYYMMDD)
        const event = allEvents.find(e => String(e.id) === String(eventId) && e.dateKey === dateParam);

        if (!event) {
            showMovedEventOrNotFound(eventId, dateParam);
            return;
        }

        const addressHtml = renderAddress(event.address);
        // Banner-Bild in Detailgröße
        const bannerImageUrl = getOptimizedImageUrl(event.image, 1200, 400);
        const bannerMobileImageUrl = getOptimizedImageUrl(event.image, 1200, 600);

        showDetailContent(`
            <a href="?" class="ct-back-link" onclick="return ctTermine.handleBackClick(event)">← Zurück zu allen Events</a>

            ${bannerImageUrl ? `
                <picture class="ct-detail-banner-picture">
                    <source media="(max-width: 799px)" srcset="${escapeHtml(bannerMobileImageUrl)}">
                    <img src="${escapeHtml(bannerImageUrl)}" alt="${escapeHtml(event.title)}" class="ct-detail-banner">
                </picture>` : ''}

            <div class="ct-detail-layout">
                <!-- Info-Spalte links -->
                <div class="ct-detail-sidebar">
                    ${renderMetaItem('Datum', isMultiDay(event) ?
                        formatDateRange(event).replace(' – ', ' –<br>') :
                        `${getWeekday(event.startDate)}<br>${formatDate(event.startDate)}`)}
                    ${renderMetaItem('Uhrzeit', formatTimeRange(event))}
                    ${addressHtml ? renderMetaItem('Ort', addressHtml) : ''}
                </div>

                <!-- Hauptinhalt rechts -->
                <div class="ct-detail-main">
                    <h1 class="ct-detail-title">${escapeHtml(event.title)}</h1>
                    ${event.subtitle ? `<div class="ct-detail-subtitle">${escapeHtml(event.subtitle)}</div>` : ''}
                    <div class="ct-detail-description">${renderMarkdown(event.description)}</div>
                    ${event.link ? renderEventLink(event.link) : ''}
                </div>
            </div>
        `);

        // Canonical URL auf Detailseite setzen (für iOS Chrome Teilen-Funktion)
        updateCanonicalUrl(window.location.href);
    }

    // Listenansicht anzeigen
    function showListView() {
        // Header wieder einblenden auf Übersichtsseite
        document.getElementById('ctTermineHeader').classList.remove('hidden');
        document.getElementById('ctListView').classList.remove('hidden');
        document.getElementById('ctDetailView').classList.remove('active');

        // Scrollposition sofort wiederherstellen
        window.scrollTo(0, savedScrollPosition);

        // Canonical URL auf Basis-URL zurücksetzen
        updateCanonicalUrl(window.location.origin + window.location.pathname);
    }

    // Nach Kalender-ID und Text filtern
    function filterByCalendarAndText(calendarId, filterTerm) {
        let events = allEvents;

        // Erst nach Kalender filtern
        if (calendarId) {
            const id = parseInt(calendarId, 10);
            events = events.filter(event => event.calendarId === id);
        }

        // Dann nach Text filtern
        if (filterTerm) {
            const filterLower = filterTerm.toLowerCase().trim();

            if (filterLower === '__other__') {
                // Spezialfall: "Sonstige" - zeige alle Events, die nicht in anderen Filtern vorkommen
                const otherFilters = CT_CONFIG.filters
                    .filter(config => config.filter !== '__other__')
                    .map(config => config.filter.toLowerCase());

                events = events.filter(event => {
                    const title = event.title.toLowerCase();
                    return !otherFilters.some(filter => title.includes(filter));
                });
            } else {
                events = events.filter(event => event.title.toLowerCase().includes(filterLower));
            }
        }

        displayEvents(events);
    }

    // Event-Handler
    ctTermine.handleFilterClick = function(e, filterTerm) {
        e.preventDefault();
        e.target.blur();
        savedFilterTerm = filterTerm;
        updateUrl({ filter: filterTerm });
        filterByCalendarAndText(getUrlParam('calendar'), filterTerm);
        return false;
    };

    ctTermine.handleCalendarClick = function(e, calendarId) {
        e.preventDefault();

        // Fokus sofort entfernen (iOS Fix)
        e.target.blur();

        savedCalendarId = calendarId ? String(calendarId) : '';
        savedFilterTerm = ''; // Beim Kalender-Klick: Filter aufheben

        updateUrl({ calendar: calendarId, filter: null });
        filterByCalendarAndText(calendarId, null);
        return false;
    };

    ctTermine.handleEventClick = function(e, eventId, eventDate) {
        e.preventDefault();
        savedScrollPosition = window.scrollY;

        // Filter/Kalender merken, aber nicht in URL übernehmen
        savedFilterTerm = getUrlParam('filter') || savedFilterTerm;
        savedCalendarId = getUrlParam('calendar') || savedCalendarId;

        updateUrl({ filter: null, calendar: null, id: eventId, date: eventDate });
        showDetailView(eventId);
        return false;
    };

    ctTermine.handleBackClick = function(e) {
        e.preventDefault();
        updateUrl({ id: null, date: null, calendar: savedCalendarId, filter: savedFilterTerm });
        filterByCalendarAndText(savedCalendarId, savedFilterTerm);
        showListView();
        return false;
    };

    // Filter Dropdown Handlers (nur im Kalender-Modus)
    ctTermine.toggleFilterDropdown = function(e) {
        e.preventDefault();
        e.stopPropagation();

        const menu = document.getElementById('ctFilterDropdownMenu');
        const button = e.target.closest('.ct-filter-dropdown-button');
        if (!menu || !button) return false;

        if (menu.classList.contains('active')) {
            closeFilterDropdown();
            return false;
        }

        openFilterDropdown(menu, button);

        const searchInput = document.getElementById('ctFilterDropdownSearch');
        if (searchInput) {
            const currentFilter = getUrlParam('filter');
            if (currentFilter) {
                searchInput.value = currentFilter;
                document.getElementById('ctFilterDropdownSearchClear').classList.add('visible');
            }
            // Text komplett markieren: aktiver Filter bleibt sichtbar, neues Tippen ersetzt ihn
            setTimeout(() => {
                searchInput.focus();
                searchInput.select();
            }, 100);
        }

        return false;
    };

    // Filter anwenden (nur Filter, Kalender wird aufgehoben)
    function applyDropdownFilter(filterTerm) {
        savedFilterTerm = filterTerm;
        savedCalendarId = '';
        updateUrl({ filter: filterTerm, calendar: null });
        closeFilterDropdown();
        filterByCalendarAndText(null, filterTerm);
    }

    ctTermine.handleFilterDropdownClick = function(e, filterTerm) {
        e.preventDefault();
        e.stopPropagation();

        // Nach dem Neu-Rendern zum Filter-Dropdown scrollen (nur wenn Filter aktiv)
        if (filterTerm) {
            shouldScrollToFilter = true;
        }

        applyDropdownFilter(filterTerm);
        return false;
    };

    // Live-Filterung: bereits gerenderte Events im DOM ein-/ausblenden (OHNE neu zu rendern)
    function liveFilterEvents(searchTerm) {
        const filterLower = searchTerm.toLowerCase();
        document.querySelectorAll('.ct-events-list .ct-event-item').forEach(item => {
            const title = item.querySelector('.ct-event-title');
            const matches = !filterLower || (title && title.textContent.toLowerCase().includes(filterLower));
            item.style.display = matches ? 'block' : 'none';
        });
    }

    // Aktiven Filter aufheben und alle Termine neu rendern; ein offenes Dropdown bleibt offen,
    // das Suchfeld behält searchText und den Fokus (für × und für Tippen über einen aktiven Filter)
    function resetFilterKeepDropdown(searchText) {
        savedFilterTerm = '';
        savedCalendarId = '';
        updateUrl({ filter: null, calendar: null });

        const menu = document.getElementById('ctFilterDropdownMenu');
        const wasActive = menu && menu.classList.contains('active');

        // Termine filtern (rendert Liste und Dropdown neu)
        filterByCalendarAndText(null, null);

        const newMenu = document.getElementById('ctFilterDropdownMenu');
        const newButton = document.querySelector('.ct-filter-dropdown-button');
        const newSearchInput = document.getElementById('ctFilterDropdownSearch');
        if (!wasActive || !newMenu || !newButton || !newSearchInput) return;

        // Sofort wieder öffnen und fokussieren, damit beim Weitertippen keine Zeichen verloren gehen
        openFilterDropdown(newMenu, newButton);
        const searchTerm = searchText.trim();
        newSearchInput.value = searchText;
        document.getElementById('ctFilterDropdownSearchClear').classList.toggle('visible', searchTerm.length > 0);
        newSearchInput.focus();
        liveFilterEvents(searchTerm);

        // Position nach dem Wiederherstellen der Filterleisten-Scrollposition erneut setzen (doppeltes RAF für Zuverlässigkeit)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => positionDropdownMenu(newMenu, newButton));
        });
    }

    ctTermine.handleFilterDropdownSearch = function(e) {
        // Verhindere, dass Klick ins Suchfeld das Dropdown schließt
        e.stopPropagation();

        const searchTerm = e.target.value.trim();

        // × Button sichtbar machen/verstecken
        document.getElementById('ctFilterDropdownSearchClear').classList.toggle('visible', searchTerm.length > 0);

        // Bei Enter: Filter anwenden, URL aktualisieren und Dropdown schließen (rendert neu)
        if (e.key === 'Enter') {
            e.preventDefault();
            applyDropdownFilter(searchTerm);
            return;
        }

        // Tippen über einen aktiven Filter: Filter aufheben und in allen Terminen suchen (wie ×)
        const activeFilter = getUrlParam('filter');
        if (activeFilter && searchTerm !== activeFilter) {
            resetFilterKeepDropdown(e.target.value);
            return;
        }

        liveFilterEvents(searchTerm);
    };

    // × Button im Suchfeld: Filter aufheben, alle Termine anzeigen, Dropdown bleibt offen
    ctTermine.clearFilterDropdownSearch = function(e) {
        e.preventDefault();
        e.stopPropagation();
        resetFilterKeepDropdown('');
        return false;
    };

    // Dropdown schließen wenn außerhalb geklickt wird (eingegebener Suchbegriff wird dabei übernommen)
    document.addEventListener('click', function(e) {
        const dropdown = document.querySelector('.ct-filter-dropdown');
        if (!dropdown || dropdown.contains(e.target)) return;

        const menu = document.getElementById('ctFilterDropdownMenu');
        const searchInput = document.getElementById('ctFilterDropdownSearch');

        const searchTerm = menu && menu.classList.contains('active') && searchInput ? searchInput.value.trim() : '';
        if (searchTerm) {
            applyDropdownFilter(searchTerm);
        } else {
            closeFilterDropdown();
        }
    });

    // Browser Zurück/Vor
    window.addEventListener('popstate', function() {
        const eventId = getUrlParam('id');

        if (eventId) {
            showDetailView(eventId);
        } else {
            filterByCalendarAndText(getUrlParam('calendar'), getUrlParam('filter'));
            showListView();
        }
    });

    // Header: Titel und Hintergrundbild
    function initializeHeader() {
        document.getElementById('ctTermineHeaderTitle').textContent = CT_CONFIG.headerTitle;
        const headerBg = document.querySelector('.ct-termine-header-bg');
        if (headerBg && CT_CONFIG.headerImageUrl) {
            headerBg.style.backgroundImage = `url(${JSON.stringify(CT_CONFIG.headerImageUrl)})`;
        }
    }

    // iCal-Link eines Kalenders: aus der Einstellung oder aus dem Sicherheitsschlüssel in den Termindaten
    function getIcalUrl(cal) {
        if (cal.icalUrl) return cal.icalUrl;
        const key = calendarFeedKeys[cal.id];
        return key ? `${CT_CONFIG.churchToolsUrl}/?q=churchcal/ical&security=${encodeURIComponent(key)}&id=${encodeURIComponent(cal.id)}` : '';
    }

    // Kalender-Abonnement-Dialog (erst nach dem Laden, weil die iCal-Links aus den Termindaten kommen können)
    function initializeSubscribeModal() {
        const modal = document.getElementById('ctSubscribeModal');
        const linksContainer = document.getElementById('ctSubscribeLinks');
        if (!linksContainer) return;

        const feeds = CT_CONFIG.calendars
            .map(cal => ({ ...cal, icalUrl: getIcalUrl(cal) }))
            .filter(cal => cal.icalUrl);

        // Ohne abonnierbaren Kalender keinen Abo-Button zeigen
        document.querySelector('.ct-termine-header-subscribe').classList.toggle('hidden', feeds.length === 0);

        // Für jeden Kalender beide Optionen: direkt abonnieren (webcal://) oder Link kopieren
        let html = feeds.map(cal => {
            const webcalUrl = cal.icalUrl.replace(/^https?:\/\//, 'webcal://');
            return `
                <div class="ct-subscribe-calendar">
                    <span class="ct-subscribe-icon">${escapeHtml(cal.icon || '')}</span>
                    <div class="ct-subscribe-calendar-body">
                        <strong>${escapeHtml(cal.label)}</strong>
                        <div class="ct-subscribe-actions">
                            <button class="ct-subscribe-link" onclick="window.location.href = ${jsArg(webcalUrl)}; return false;">Abonnieren</button>
                            <button class="ct-subscribe-link" onclick="ctTermine.copyToClipboard(${jsArg(cal.icalUrl)}, this); return false;">Link kopieren</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Support-Hinweis hinzufügen (falls konfiguriert)
        if (CT_CONFIG.subscriptionSupportText) {
            html += `<p class="ct-subscribe-hint">${renderInline(CT_CONFIG.subscriptionSupportText)}</p>`;
        }

        linksContainer.innerHTML = html;

        // Portal-Pattern: Modal zu document.body verschieben
        // Dadurch bricht das Modal aus dem Squarespace Code-Block aus
        if (modal && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
    }

    // Kopiere Text in Zwischenablage (mit kurzem "Kopiert!"-Feedback am Button)
    ctTermine.copyToClipboard = function(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '✓ Kopiert!';
            button.classList.add('copied');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Fehler beim Kopieren:', err);
            alert('Link konnte nicht kopiert werden: ' + text);
        });
    };

    ctTermine.openSubscribeModal = function() {
        const modal = document.getElementById('ctSubscribeModal');
        if (modal) {
            modal.style.display = 'flex';
            // Seite hinter dem Dialog nicht scrollen
            document.body.style.overflow = 'hidden';
        }
    };

    ctTermine.closeSubscribeModal = function() {
        const modal = document.getElementById('ctSubscribeModal');
        if (modal) {
            modal.style.display = 'none';
            // Scrollen wieder erlauben
            document.body.style.overflow = '';
        }
    };

    // Start, sobald die Seite bereit ist (die API-Anfrage läuft schon seit dem Skriptbeginn)
    function initialize() {
        initializeHeader();
        fetchEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
