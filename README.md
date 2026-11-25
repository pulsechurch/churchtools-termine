# ChurchTools Termine

Zeigt die Termine aus deinen **ChurchTools-Kalendern** als schöne Terminseite auf deiner Website – mit Bildern, Detailseiten, Filtern und Kalender-Abo.
Gebaut für **Squarespace**, funktioniert aber auf jeder Website, auf der man HTML einfügen kann.

![Terminseite](docs/screenshot.png)

Live im Einsatz: [pulsechurch.de/termine](https://www.pulsechurch.de/termine)

## Was die Terminseite kann

- Liste aller kommenden Termine mit Bild, Datum, Uhrzeit und Kurzbeschreibung
- Detailseite pro Termin mit eigener Adresse zum Teilen (`?id=…&date=…`)
- Buttons zum Umschalten zwischen Kalendern, dazu Suche und eigene Filter
- „Kalender abonnieren“ für iPhone, Outlook, Google usw.
- Beschreibungen mit Formatierung aus ChurchTools (fett, Listen, Links, Tabellen …)
- E-Mail-Adressen sind vor Spam-Robotern geschützt
- Mehrtägige und ganztägige Termine, Bildausschnitt nach dem Fokuspunkt aus ChurchTools
- Alte Links funktionieren weiter, wenn ein Serientermin in ChurchTools einzeln geändert wurde

## Einrichten in 4 Schritten

### 1. Zugang in ChurchTools anlegen

Die Website braucht einen ChurchTools-Benutzer, der die Kalender lesen darf.

1. Lege in ChurchTools eine eigene Person an, z.B. „Website“.
2. Gib ihr nur das Recht, die gewünschten **öffentlichen Kalender zu sehen** – sonst nichts.
3. Öffne bei dieser Person den Reiter **Berechtigungen** und kopiere den **Login-Token**.

> **Wichtig:** Der Token steht später im Quelltext deiner Website und ist damit für jeden sichtbar.
> Gib dieser Person deshalb wirklich nur Leserechte auf Kalender, die ohnehin öffentlich sein sollen.

### 2. Kalender-IDs nachschauen

Jeder Kalender hat in ChurchTools eine Nummer. Du findest sie z.B. im Abo-Link des Kalenders (`…&id=2` → ID 2).

### 3. Website in ChurchTools freigeben (CORS)

Der Browser lädt die Termine direkt aus ChurchTools. Das erlaubt er nur, wenn ChurchTools deine Website als erlaubte Adresse kennt.

1. Öffne in ChurchTools die **Systemeinstellungen → Integrationen → Cross-Origin Resource Sharing** ([Anleitung in der ChurchTools Academy](https://churchtools.academy/en/help/system-settings/api-en/cors/)).
2. Trage die Adresse deiner Website ein, z.B. `https://www.meinegemeinde.de`. Gibt es sie mit und ohne `www.`, trage beide ein.
3. **Für die Vorschau im Squarespace-Editor** zusätzlich die interne Squarespace-Adresse eintragen, z.B. `https://name-1234.squarespace.com`. Du findest sie in Squarespace unter **Einstellungen → Domains**. Ohne diesen Eintrag bleiben die Termine in der Vorschau leer, auf der veröffentlichten Seite funktionieren sie trotzdem.

Fehlt die Freigabe, zeigt die Seite statt der Termine „Unsere Termine machen gerade eine kurze Pause“. In der Browser-Konsole steht dann ein CORS-Fehler.

### 4. Code in die Website einfügen

Füge in Squarespace auf der Terminseite einen Block **„Code“** ein und kopiere den Inhalt von [`examples/termine.html`](examples/termine.html) hinein.
Trage dann oben deine ChurchTools-Adresse, den Token und deine Kalender ein. Fertig.

```html
<div id="ct-termine"></div>
<script>
window.CT_CONFIG = {
    churchToolsUrl: 'https://meinegemeinde.church.tools',
    apiToken: 'HIER-DEN-LOGIN-TOKEN-EINFÜGEN',
    calendars: [
        { id: 2, label: 'Veranstaltungen', icon: '📅' }
    ]
};
</script>
<script src="https://cdn.jsdelivr.net/gh/pulsechurch/churchtools-termine@1/termine.js"
        onerror="var s=document.createElement('script');s.src='https://pulsechurch.github.io/churchtools-termine/v1/termine.js';document.body.appendChild(s);"></script>
```

Fehlt eine Pflicht-Einstellung, zeigt die Seite einen Hinweis, was noch fehlt.

## Alle Einstellungen

| Einstellung | Pflicht | Bedeutung |
|---|---|---|
| `churchToolsUrl` | ja | Adresse deines ChurchTools, z.B. `https://meinegemeinde.church.tools` |
| `apiToken` | ja | Login-Token aus Schritt 1 |
| `calendars` | ja | Kalender als Liste: `{ id, label, icon }`. Der Abo-Link wird automatisch erzeugt (oder selbst angeben mit `icalUrl`) |
| `headerTitle` | | Überschrift im Kopfbild (Standard: „Bevorstehende Events.“) |
| `headerImageUrl` | | Hintergrundbild für den Kopfbereich |
| `primaryColor` | | Farbe für aktive Buttons, z.B. `'#FCC927'` |
| `selectionMode` | | `'calendar'` (Standard): Buttons für die Kalender, Filter im Menü „Weitere Filter“.<br>`'filter'`: Buttons für die Filter |
| `selectionLabel` | | Text vor den Buttons, z.B. `'Zeige:'` |
| `filters` | | Eigene Filter: `{ label: 'Gottesdienste', filter: 'Gottesdienst' }` zeigt alle Termine mit „Gottesdienst“ im Titel.<br>`filter: '__other__'` zeigt alle Termine, die zu keinem anderen Filter passen |
| `linkButtons` | | Hat ein Termin einen Link mit dieser Adresse, erscheint ein Button: `{ address: 'forms.office.com', label: 'Zur Anmeldung' }`. Sonst wird der Link als Text gezeigt |
| `subscriptionSupportText` | | Hinweis unten im Abo-Dialog |

### Adressen für Links

- `?calendar=2` – öffnet die Seite mit Kalender 2
- `?filter=Gottesdienst` – öffnet die Seite gefiltert
- `?id=123&date=20270618` – öffnet direkt einen Termin

## Updates

Mit `@1` in der Skript-Adresse bekommst du Verbesserungen und Fehlerkorrekturen automatisch – ohne etwas an deiner Website zu ändern.

Müsstest du für eine Neuerung deine Einstellungen anpassen, erscheint sie als neue Hauptversion (`@2`). Deine Seite läuft mit `@1` unverändert weiter, bis du selbst umstellst.

Über neue Versionen informiert dich GitHub per E-Mail: oben rechts **Watch → Custom → Releases**.

**Ausfallsicherheit:** Das Skript kommt von [jsDelivr](https://www.jsdelivr.com). Ist jsDelivr nicht erreichbar, lädt die Seite es automatisch von GitHub Pages.

## Selbst anpassen

Du willst mehr ändern als die Einstellungen? Lade [`termine.js`](termine.js) herunter, passe sie an und lade sie auf deinen eigenen Server oder bei Squarespace als Datei hoch. Dann trägst du deren Adresse statt der jsDelivr-Adresse ein.
Automatische Updates gibt es dann nicht mehr.

---

## Nebenfeature: Newsletter-Hilfe

> Nur interessant, wenn du einen E-Mail-Newsletter (z.B. MailChimp) verschickst und dort die kommenden Termine auflisten willst.

Die Newsletter-Hilfe zeigt die Termine der nächsten Wochen. Jeder Termin lässt sich mit einem Klick kopieren und **mit Formatierung direkt in MailChimp einfügen**. Das HTML ist auf E-Mail-Programme abgestimmt, auch auf Outlook.

Einrichten: Lege auf deiner Website eine **nicht verlinkte** Seite an und füge den Inhalt von [`examples/newsletter.html`](examples/newsletter.html) als Code-Block ein. Zugang und CORS-Freigabe sind dieselben wie bei der Terminseite.

| Einstellung | Pflicht | Bedeutung |
|---|---|---|
| `churchToolsUrl` | ja | wie oben |
| `apiToken` | ja | wie oben |
| `calendarIds` | ja | Kalender-IDs, z.B. `[2]` |
| `terminePageUrl` | ja | Adresse deiner Terminseite, z.B. `https://www.meinegemeinde.de/termine` (für „Link kopieren“) |
| `daysAhead` | | Zeitraum in Tagen (Standard: 50) |

## Lizenz

[MIT](LICENSE) – frei nutzbar, auch zum Anpassen und Weitergeben.
