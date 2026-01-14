![Steam Key Sharing Tool](assets/github-header.png)

> **TL;DR**  
> A small web tool to share leftover Steam keys fairly.  
> No login, no tracking, bot protection, hidden admin panel.

---

## 🎮 Steam Key Sharing Tool

A lightweight web application to **share leftover Steam keys in a fair and transparent way**.

The tool was created to avoid common giveaway issues like bots instantly grabbing keys
or posting keys publicly where they get abused.

---

## ✨ Features

- 🔑 Steam keys are **hidden by default**
- 🖱️ Keys are revealed **only after clicking**
- 🚫 Each key can be claimed **only once**
- ⏳ Cooldown & basic bot protection
- 🧑‍💼 Hidden **admin panel** (token protected)
- 🗂️ Admin overview of all keys
- ⭐ **Anonymous feedback with 1–5 star rating**
- 🧾 Feedback visible **only to the admin**
- 🖼️ Automatic Steam cover fetching
- 🌐 Ready for online deployment (e.g. Render + Turso)

---

## 🧠 Motivation

Posting Steam keys directly in comments is often unfair,
as bots usually collect them instantly.

This project focuses on:
- Fairness
- Transparency
- A better user experience

---

## 🛠️ Tech Stack

- **Node.js**
- **Express**
- **@libsql/client (Turso / SQLite)**
- **Vanilla HTML / CSS / JavaScript**
- No accounts, no tracking, no ads

---

## 🔐 Admin Panel

The admin area is **hidden by default**  
and becomes visible only after entering a **valid admin token**.

Admin features:
- Add and delete Steam keys
- View all keys (claimed / available)
- View and delete anonymous feedback

---

## ⚙️ Local Setup

```bash

npm install
node server.js

Create a .env file with the following variables:

ADMIN_TOKEN=yourSecretAdminToken
DATABASE_URL=yourTursoDatabaseUrl
DATABASE_AUTH_TOKEN=yourTursoAuthToken
```

🚀 Deployment

The project can easily be deployed on platforms like Render.
The database runs on Turso.

📌 Disclaimer

This is a hobby project.
It is free to use and provided without warranty.
