import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { nanoid } from "nanoid";
import { extractPlaceholdersFromDocx } from "../utils/extractPlaceholders.js";

const router = express.Router();


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 1) Upload & detect placeholders
router.post("/detect", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!req.file.originalname.endsWith(".docx"))
      return res.status(400).json({ error: "Only .docx files are supported" });

    const placeholders = extractPlaceholdersFromDocx(req.file.buffer);
   
    const id = nanoid(8);
    const tempPath = path.join("uploads", `${id}.docx`);
    fs.writeFileSync(tempPath, req.file.buffer);

    res.json({ fileId: id, filename: req.file.originalname, placeholders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to parse the document" });
  }
});


router.post("/generate", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const { fileId, data = {}, filename } = req.body || {};
    if (!fileId) return res.status(400).json({ error: "fileId is required" });

    const inputPath = path.join("uploads", `${fileId}.docx`);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: `Source file not found: ${inputPath}` });
    }

    const content = fs.readFileSync(inputPath);
    const zip = new PizZip(content);


    const partRegex = /^word\/(document|header\d*|footer\d*)\.xml$/;
    const files = zip.file(partRegex);
    const allLabels = new Set();
    for (const f of files) {
      const xml = zip.file(f.name).asText();
      for (const m of xml.matchAll(/\[([^\[\]\r\n]+?)\]/g)) {
        allLabels.add(m[1].trim());
      }
    }
  
    for (const label of allLabels) {
      if (!(label in data)) data[label] = "";
    }

    
    const parser = (tag) => ({
      get: (scope) => {
       
        if (Object.prototype.hasOwnProperty.call(scope, tag)) return scope[tag];
       
        const t = tag.trim();
        return Object.prototype.hasOwnProperty.call(scope, t) ? scope[t] : "";
      },
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    
      delimiters: { start: "[", end: "]" },
      parser,
      nullGetter: () => "", 
    });

    doc.setData(data);

    try {
      doc.render();
    } catch (e) {
      const details = e?.properties?.errors
        ? e.properties.errors.map((err) => err.properties?.explanation || err.message)
        : [e.message || String(e)];
      console.error("Docxtemplater render error:", details);
      return res.status(400).json({
        error: "Failed to generate the document",
        details: details.join(" | "),
      });
    }

    const buf = doc.getZip().generate({ type: "nodebuffer" });
    const outName = (filename?.replace(/\.docx$/i, "") || "filled") + "-completed.docx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
    return res.send(buf);
  } catch (e) {
    console.error("Generate error:", e);
    res
      .status(500)
      .json({ error: "Failed to generate the document", details: e.message || String(e) });
  }
});



export default router;

