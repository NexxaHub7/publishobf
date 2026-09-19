const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const UPLOADS = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

function genId() {
  return crypto.randomBytes(3).toString("hex");
}

function genKey() {
  return crypto.randomBytes(20).toString("hex");
}

app.post("/upload", (req, res) => {
  const { code, key: userKey, getKeyUrl, notifyOnEnter } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Codigo vacio" });
  }

  let id = genId();
  let folder = path.join(UPLOADS, id);
  let intentos = 0;
  while (fs.existsSync(folder) && intentos < 10) {
    id = genId();
    folder = path.join(UPLOADS, id);
    intentos++;
  }

  const key = (userKey && userKey.trim().length > 0) ? userKey.trim() : genKey();

  try {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "code.lua"), code, "utf-8");
    fs.writeFileSync(path.join(folder, "key.txt"), key, "utf-8");
    fs.writeFileSync(path.join(folder, "getkey.txt"), getKeyUrl || "", "utf-8");
    fs.writeFileSync(path.join(folder, "notify.txt"), notifyOnEnter ? "1" : "0", "utf-8");

    const host = req.get("host");
    return res.json({
      id,
      key,
      hasKeySystem: !!(userKey && userKey.trim().length > 0),
      notifyOnEnter: !!notifyOnEnter,
      url: "https://" + host + "/" + id + "/raw",
      viewUrl: "https://" + host + "/" + id
    });
  } catch (e) {
    return res.status(500).json({ error: "Error al guardar" });
  }
});

app.get("/:id/keydata", (req, res) => {
  const id = req.params.id.replace(/[^a-f0-9]/gi, "");
  const folder = path.join(UPLOADS, id);
  if (!fs.existsSync(folder)) {
    return res.status(404).json({ error: "Not found" });
  }
  const getkeyFile = path.join(folder, "getkey.txt");
  const notifyFile = path.join(folder, "notify.txt");
  const getKeyUrl = fs.existsSync(getkeyFile) ? fs.readFileSync(getkeyFile, "utf-8").trim() : "";
  const notifyOnEnter = fs.existsSync(notifyFile) ? fs.readFileSync(notifyFile, "utf-8").trim() === "1" : false;
  res.json({ getKeyUrl, notifyOnEnter });
});

app.get("/:id/raw", (req, res) => {
  const id = req.params.id.replace(/[^a-f0-9]/gi, "");
  const folder = path.join(UPLOADS, id);
  const keyFile = path.join(folder, "key.txt");
  const codeFile = path.join(folder, "code.lua");
  const getkeyFile = path.join(folder, "getkey.txt");

  if (!fs.existsSync(folder) || !fs.existsSync(keyFile)) {
    return res.status(404).send("-- Not found");
  }

  const realKey = fs.readFileSync(keyFile, "utf-8").trim();
  const getKeyUrl = fs.existsSync(getkeyFile) ? fs.readFileSync(getkeyFile, "utf-8").trim() : "";

  if (realKey.length !== 40 || getKeyUrl) {
    const providedKey = req.query.k || req.headers["x-key"] || "";
    if (providedKey !== realKey) {
      return res.status(403).send("Incorrect Password");
    }
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(fs.readFileSync(codeFile, "utf-8"));
});

app.get("/:id", (req, res) => {
  const id = req.params.id.replace(/[^a-f0-9]/gi, "");
  const folder = path.join(UPLOADS, id);
  const keyFile = path.join(folder, "key.txt");
  const getkeyFile = path.join(folder, "getkey.txt");

  if (!fs.existsSync(folder) || !fs.existsSync(keyFile)) {
    return res.status(404).send("-- Not found");
  }

  const realKey = fs.readFileSync(keyFile, "utf-8").trim();
  const getKeyUrl = fs.existsSync(getkeyFile) ? fs.readFileSync(getkeyFile, "utf-8").trim() : "";

  if (realKey.length === 40 && !getKeyUrl) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send(fs.readFileSync(path.join(folder, "code.lua"), "utf-8"));
  }

  res.sendFile(path.join(__dirname, "enterkey.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Nexxa backend en puerto " + PORT));
