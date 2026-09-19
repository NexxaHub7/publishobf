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

app.post("/upload", (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Codigo vacio" });
  }

  let id = genId();
  let file = path.join(UPLOADS, id + ".lua");
  let intentos = 0;
  while (fs.existsSync(file) && intentos < 10) {
    id = genId();
    file = path.join(UPLOADS, id + ".lua");
    intentos++;
  }

  try {
    fs.writeFileSync(file, code, "utf-8");
    return res.json({ id, url: "https://" + req.get("host") + "/" + id + "/raw" });
  } catch (e) {
    return res.status(500).json({ error: "Error al guardar" });
  }
});

app.get("/:id/raw", (req, res) => {
  const id = req.params.id.replace(/[^a-f0-9]/gi, "");
  const file = path.join(UPLOADS, id + ".lua");
  if (!fs.existsSync(file)) return res.status(404).send("-- Not found");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(fs.readFileSync(file, "utf-8"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Nexxa backend en puerto " + PORT));
