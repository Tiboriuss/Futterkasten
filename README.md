# 🍽️ Futterkasten

**Futterkasten** ist eine Essensplanungs-App mit KI-Assistent für Home Assistant. Plane deine Mahlzeiten für die Woche, verwalte Gerichte und Zutaten, und lass dir von der KI beim Planen helfen.

## ✨ Features

- **Wochenplaner** - Plane Frühstück, Mittagessen, Abendessen und Snacks für jeden Tag
- **Gerichte-Verwaltung** - Erstelle und verwalte deine Lieblingsgerichte mit Zutaten
- **Zutaten-Datenbank** - Halte alle deine Zutaten organisiert
- **KI-Assistent** - Lass dir von der KI beim Planen helfen ("Plane mir die Woche", "Was gibt es heute?")
- **Einkaufsliste** - Automatische Einkaufsliste basierend auf deinem Wochenplan
- **Mobile-optimiert** - Funktioniert perfekt auf Smartphone und Desktop
- **Home Assistant Integration** - Läuft als Addon direkt in deinem Smart Home

## 📋 Voraussetzungen

- **Home Assistant** (OS oder Supervised Installation)
- **PostgreSQL Datenbank** - Kann als separates Addon installiert werden
- **Azure OpenAI API Key** - Für den KI-Assistenten (optional, aber empfohlen)

## 🚀 Installation in Home Assistant

### Schritt 1: Repository hinzufügen

1. Öffne Home Assistant
2. Gehe zu **Einstellungen** → **Add-ons** → **Add-on Store**
3. Klicke auf die drei Punkte oben rechts → **Repositories**
4. Füge folgende URL hinzu:
   ```
   https://github.com/Tiboriuss/Futterkasten
   ```
5. Klicke auf **Hinzufügen**

### Schritt 2: PostgreSQL installieren (falls noch nicht vorhanden)

1. Im Add-on Store nach **PostgreSQL** suchen
2. Das offizielle PostgreSQL Addon installieren
3. In der Konfiguration eine Datenbank erstellen:
   ```yaml
   databases:
     - futterkasten
   logins:
     - username: futterkasten
       password: dein_sicheres_passwort
   rights:
     - username: futterkasten
       database: futterkasten
   ```
4. Addon starten

### Schritt 3: Futterkasten installieren

1. Im Add-on Store nach **Futterkasten** suchen (ggf. Seite neu laden)
2. Addon installieren
3. In der Konfiguration folgende Werte eintragen:

   | Option | Beschreibung |
   |--------|-------------|
   | `DATABASE_URL` | `postgresql://futterkasten:dein_passwort@core-postgres:5432/futterkasten` |
   | `AZURE_OPENAI_API_KEY` | Dein Azure OpenAI API Key |
   | `AZURE_OPENAI_ENDPOINT` | Dein Azure OpenAI Endpoint (z.B. `https://dein-name.openai.azure.com`) |
   | `AZURE_OPENAI_DEPLOYMENT` | Name deines Deployments (z.B. `gpt-4o`) |

4. Addon starten
5. **In der Seitenleiste anzeigen** aktivieren

### Schritt 4: Loslegen!

Klicke auf **Futterkasten** in der Seitenleiste und beginne mit der Planung deiner Mahlzeiten!

## 🤖 KI-Assistent

Der KI-Assistent kann dir bei folgenden Aufgaben helfen:

- "Was gibt es heute zu essen?"
- "Zeig mir den Wochenplan"
- "Plane mir Pasta für Montag Mittagessen"
- "Trage Müsli für die ganze Woche als Frühstück ein"
- "Verschiebe das Abendessen von Montag auf Dienstag"
- "Lösche das Mittagessen am Freitag"

Der Assistent nutzt nur Gerichte aus deiner eigenen Datenbank - er erfindet keine neuen Rezepte.

## 🛠️ Technologie

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Datenbank**: PostgreSQL
- **KI**: Azure OpenAI via Vercel AI SDK
- **API**: GET /api/meals?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

## 📝 Lizenz

MIT License
