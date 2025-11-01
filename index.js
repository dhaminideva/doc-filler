// index.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// ESM dirname helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads dir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// App
const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static UI
app.use(express.static(path.join(__dirname, "public")));

// Routers (MAKE SURE each is imported exactly once)
import fillRouter from "./routes/fill.js";
import suggestRouter from "./routes/suggest.js";  // <= only once
import aiRouter from "./routes/ai.js";

app.use("/api/fill", fillRouter);
app.use("/api/suggest", suggestRouter);
app.use("/api/ai", aiRouter);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Port 3000


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));
