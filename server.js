// ================================
// Steam Keys App – Server
// ================================

require("dotenv").config();

const express = require("express");
const path = require("path");

// --------------------
// App Setup
// --------------------
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// Admin Token
// --------------------
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.warn("⚠️ ADMIN_TOKEN fehlt in der .env Datei");
}

// --------------------
// Database (Turso / SQLite)
// --------------------
const { createClient } = require("@libsql/client");

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL fehlt");
  process.exit(1);
}

const db = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN
});

// --------------------
// Init DB Tables
// --------------------
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      steamKey TEXT NOT NULL UNIQUE,
      claimed INTEGER DEFAULT 0,
      claimedAt TEXT
    )
  `);
}
initDb();

// --------------------
// Helper: Admin Check
// --------------------
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// --------------------
// Helper: Client IP
// --------------------
function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  let ip = xf ? String(xf).split(",")[0].trim() : (req.ip || req.connection?.remoteAddress || "unknown");

  // IPv4-mapped IPv6 normalisieren (::ffff:127.0.0.1 -> 127.0.0.1)
  ip = ip.replace(/^::ffff:/, "");

  // localhost IPv6 vereinheitlichen
  if (ip === "::1") ip = "127.0.0.1";

  return ip;
}


// --------------------
// Claim Cooldown (pro IP)
// --------------------
const CLAIM_COOLDOWN_MS = 30 * 60 * 1000; // 30 Minuten
const lastClaimByIp = new Map();

// --------------------
// Public Routes
// --------------------

// Alle verfügbaren Keys
app.get("/api/keys", async (req, res) => {
  const result = await db.execute(`
    SELECT id, title, imageUrl
    FROM keys
    WHERE claimed = 0
    ORDER BY id ASC
  `);

  res.json(result.rows);
});

// Claim Key
app.post("/api/claim/:id", async (req, res) => {
  // --- Honeypot ---
  if (!req.body || typeof req.body.website === "undefined") {
    return res.status(400).json({ error: "bot_detected" });
  }
  if (String(req.body.website).trim() !== "") {
    return res.status(400).json({ error: "bot_detected" });
  }

  // --- Cooldown ---
  const ip = getClientIp(req);
  const now = Date.now();
  const last = lastClaimByIp.get(ip) || 0;
  const diff = now - last;

  if (diff < CLAIM_COOLDOWN_MS) {
    return res.status(429).json({
      error: "cooldown",
      retryAfterMs: CLAIM_COOLDOWN_MS - diff
    });
  }

  const id = req.params.id;

  // --- Key laden ---
  const result = await db.execute({
    sql: `SELECT * FROM keys WHERE id = ?`,
    args: [id]
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "not_found" });
  }

  const key = result.rows[0];

  if (key.claimed) {
    return res.status(409).json({ error: "already_claimed" });
  }

  // --- Claim durchführen ---
  await db.execute({
    sql: `
      UPDATE keys
      SET claimed = 1, claimedAt = ?
      WHERE id = ?
    `,
    args: [new Date().toISOString(), id]
  });

  // Cooldown starten (nur bei Erfolg!)
  lastClaimByIp.set(ip, Date.now());

  res.json({ steamKey: key.steamKey });
});

// --------------------
// Admin Routes
// --------------------

// Admin: alle Keys
app.get("/api/admin/keys", requireAdmin, async (req, res) => {
  const result = await db.execute(`
    SELECT *
    FROM keys
    ORDER BY id ASC
  `);
  res.json(result.rows);
});

// Admin: Key hinzufügen
app.post("/api/admin/add", requireAdmin, async (req, res) => {
  const { title, imageUrl, steamKey } = req.body;

  if (!title || !imageUrl || !steamKey) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    await db.execute({
      sql: `
        INSERT INTO keys (title, imageUrl, steamKey)
        VALUES (?, ?, ?)
      `,
      args: [title, imageUrl, steamKey]
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return res.status(409).json({ error: "duplicate_key" });
    }
    throw err;
  }

  res.json({ ok: true });
});

// Admin: Key löschen
app.delete("/api/admin/keys/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;

  await db.execute({
    sql: `DELETE FROM keys WHERE id = ?`,
    args: [id]
  });

  res.json({ ok: true });
});

// --------------------
// Steam Cover Proxy
// --------------------
app.get("/api/steam/cover", async (req, res) => {
  const title = req.query.title;
  if (!title) return res.status(400).end();

  try {
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`
    );
    const data = await searchRes.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).end();
    }

    const game = data.items[0];
    res.json({
      appid: game.id,
      matchedTitle: game.name,
      header: game.tiny_image.replace("capsule_sm_120", "header")
    });
  } catch {
    res.status(500).end();
  }
});

// --------------------
// Fallback
// --------------------
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
