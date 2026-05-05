# D.T. Kern - System-Dokumentation

## Hermes-Verbindung konfigurieren

D.T. Kern nutzt den externen Hermes-Agenten für komplexe Backend-Operationen, Tool-Execution und Langzeitgedächtnis. Standardmäßig ist das System so konfiguriert, dass es einen VPS unter Hostinger kontaktiert.

### Umgebungsvariablen (.env)

Die folgenden Variablen können im AI Studio Settings-Menü oder in der `.env` Datei gesetzt werden:

| Variable | Beschreibung | Standardwert |
| :--- | :--- | :--- |
| `HERMES_API_BASE_URL` | Öffentliche API-URL des Hermes VPS | `http://76.13.151.81:8642/v1` |
| `HERMES_API_KEY` | Optionaler Bearer Token für den Zugriff | `(leer)` |
| `HERMES_MODEL` | Das zu verwendende Modell auf dem VPS | `hermes-default` |
| `HERMES_TIMEOUT_MS` | Timeout für API-Anfragen in ms | `30000` |
| `HERMES_SESSION_PREFIX` | Präfix für Session-IDs (z.B. für DT-Interaktionen) | `dt_` |

### Fehlerbehandlung & Fallback

- **Verbindungsfehler (5xx, ECONNREFUSED, Timeout):** Das System erkennt dies automatisch und schaltet nahtlos auf den internen **Gemini Fallback** um, damit die Basisfunktion erhalten bleibt.
- **Client-Fehler (4xx):** Diese werden nicht abgefangen, da sie meist auf falsche Konfiguration oder abgelaufene Sessions hindeuten.
- **System-Status:** In der `LiveMode` UI zeigt ein kleiner Indikator (oben links) den aktuellen Status der Hermes-Verbindung an (Grün = Online, Rot = Offline/Fallback).

### Sicherheitshinweis

Falls die App über HTTPS läuft und der Hermes-VPS nur über HTTP erreichbar ist, tritt eine "Mixed Content" Warnung auf. Es wird dringend empfohlen, den Hermes-Agenten hinter einem Reverse Proxy (z.B. Nginx) mit SSL-Zertifikat zu betreiben.
