// server.js
const express = require("express");
const path = require("path");
require("dotenv").config();

const { createClient } = require("@libsql/client");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// Rate-Limit (1 Claim / 10 Sekunden pro IP)
// --------------------
const rateMap = new Map();
function rateLimit(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() ||
    req.ip;

  const now = Date.now();
  const last = rateMap.get(ip) || 0;

  if (now - last < 10_000) {
    return res.status(429).json({ error: "Zu viele Versuche. Bitte kurz warten." });
  }

  rateMap.set(ip, now);
  next();
}

// --------------------
// Turso (libSQL) Client
// --------------------
if (!process.env.DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
  console.warn("⚠️ DATABASE_URL oder DATABASE_AUTH_TOKEN fehlt (Turso).");
}

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// --------------------
// DB Init
// --------------------
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      steamKey TEXT NOT NULL,
      claimed INTEGER NOT NULL DEFAULT 0,
      claimedAt TEXT
    )
  `);

  // Doppelte Steam-Keys blockieren
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_steamkey ON keys(steamKey)
  `);

  console.log("✅ DB bereit (Turso).");
}

// --------------------
// Admin Guard
// --------------------
function requireAdmin(req, res, next) {
  const token = req.header("x-admin-token");
  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: "ADMIN_TOKEN not set" });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// --------------------
// Public API: Liste (nur nicht geclaimt, OHNE steamKey)
// --------------------
app.get("/api/keys", async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT id, title, imageUrl FROM keys WHERE claimed = 0 ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------
// Public API: Claim (atomar) + Rate-Limit
// --------------------
app.post("/api/claim/:id", rateLimit, async (req, res) => {
  const id = Number(req.params.id);
  const now = new Date().toISOString();

  try {
    const upd = await db.execute({
      sql: "UPDATE keys SET claimed = 1, claimedAt = ? WHERE id = ? AND claimed = 0",
      args: [now, id],
    });

    if (upd.rowsAffected === 0) {
      return res.status(409).json({ error: "Already claimed" });
    }

    const row = await db.execute({
      sql: "SELECT steamKey FROM keys WHERE id = ?",
      args: [id],
    });

    if (!row.rows?.[0]) return res.status(500).json({ error: "DB error" });
    res.json({ steamKey: row.rows[0].steamKey });
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------
// Admin API: Key hinzufügen
// --------------------
app.post("/api/admin/add", requireAdmin, async (req, res) => {
  const { title, imageUrl, steamKey } = req.body;

  if (!title || !imageUrl || !steamKey) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const r = await db.execute({
      sql: "INSERT INTO keys (title, imageUrl, steamKey) VALUES (?, ?, ?)",
      args: [title.trim(), imageUrl.trim(), steamKey.trim()],
    });

    res.json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch (e) {
    // Unique constraint => doppelt
    if (String(e?.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "Steam-Key existiert bereits" });
    }
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------
// Admin API: Übersicht
// --------------------
app.get("/api/admin/keys", requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT id, title, imageUrl, steamKey, claimed, claimedAt
       FROM keys
       ORDER BY claimed ASC, id ASC`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------
// Admin API: Löschen
// --------------------
app.delete("/api/admin/keys/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const r = await db.execute({
      sql: "DELETE FROM keys WHERE id = ?",
      args: [id],
    });

    if (r.rowsAffected === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------
// Steam Cover: HTML-Suche -> AppID -> Bild-URLs
// --------------------
app.get("/api/steam/cover", async (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    if (!title) return res.status(400).json({ error: "Missing title" });

    const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}&l=german`;

    const r = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,*/*",
      },
    });

    if (!r.ok) {
      return res.status(502).json({ error: "Steam search failed", status: r.status });
    }

    const html = await r.text();
    const match = html.match(/\/app\/(\d+)\//);
    if (!match) return res.status(404).json({ error: "No match" });

    const appid = match[1];
    const header = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;

    res.json({ appid, matchedTitle: title, header });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server läuft: http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("DB Init Fehler:", e);
    process.exit(1);
  });
