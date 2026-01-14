![Steam Key Sharing Tool](assets/github-header.png)


---

# 🇩🇪 TEXT FÜR `README_DE.md` (DEUTSCH)

👉 **Ebenfalls DIREKT unter das Header-Bild**

```md
> **Kurzfassung**  
> Kleines Web-Tool zur fairen Verteilung von Steam Keys.  
> Kein Login, kein Tracking, Bot-Schutz, versteckter Admin-Bereich.

---

## 🎮 Steam Key Sharing Tool

Eine schlanke Web-Anwendung, um **übrig gebliebene Steam Keys fair und transparent**
an eine Community zu verteilen.

Das Tool wurde entwickelt, um typische Giveaway-Probleme zu vermeiden
(z.B. Bots, sofortiges Abgreifen von Keys oder öffentlich gepostete Keys).

---

## ✨ Features

- 🔑 Steam Keys sind **standardmäßig verborgen**
- 🖱️ Key erscheint **erst nach Klick**
- 🚫 Jeder Key kann **nur einmal** geclaimt werden
- ⏳ Cooldown & einfacher Bot-Schutz
- 🧑‍💼 Versteckter **Admin-Bereich** (Token-geschützt)
- 🗂️ Admin-Übersicht aller Keys
- ⭐ **Anonymes Feedback mit 1–5 Sternen**
- 🧾 Feedback ist **nur für den Admin sichtbar**
- 🖼️ Automatisches Laden von Steam-Covern
- 🌐 Online deploybar (z.B. Render + Turso)

---

## 🧠 Motivation

Steam Keys direkt in Kommentaren zu posten ist oft unfair,
da Bots die Keys sofort einsammeln.

Dieses Projekt legt den Fokus auf:
- Fairness
- Transparenz
- Eine bessere Nutzererfahrung

---

## 🛠️ Technik

- **Node.js**
- **Express**
- **@libsql/client (Turso / SQLite)**
- **Vanilla HTML / CSS / JavaScript**
- Keine Accounts, kein Tracking, keine Werbung

---

## 🔐 Admin-Bereich

Der Admin-Bereich ist standardmäßig **versteckt**  
und wird erst nach Eingabe eines **gültigen Admin-Tokens** sichtbar.

Admin-Funktionen:
- Steam Keys hinzufügen & löschen
- Übersicht aller Keys (verfügbar / geclaimt)
- Anonymes Feedback ansehen & löschen

---

## ⚙️ Lokale Installation

```bash
npm install
node server.js

