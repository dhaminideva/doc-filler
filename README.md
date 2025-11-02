# Doc Filler

Upload a SAFE (`.docx`), detect placeholders, optionally get AI suggestions/autofill, and export a completed document.
https://doc-filler.onrender.com/

---<img width="1919" height="1075" alt="Screenshot 2025-10-31 225924" src="https://github.com/user-attachments/assets/2deb4a5e-d658-4816-9002-ce2de1b58568" />


##  Features

- **Upload** a `.docx` template (sample SAFE included in the assignment)
- **Detect placeholders** (labels are surfaced as chips + dynamic form fields)
- **AI assist (optional)**  
  - _Suggest Questions_ for missing/ambiguous fields  
  - _Autofill with AI_ from a short note/context  
  - Provider is swappable (local **Ollama** in dev, or hosted providers)
- **Generate & Download** a clean, filled `.docx`
- **Modern UI** with dark/light toggle, progress, and live summary

---

##  Tech Stack

- **Backend:** Node 22 + Express
- **Templating:** Docxtemplater + PizZip
- **AI (optional):** Local **Ollama** (e.g., `llama3.2:3b`) via simple HTTP API  
  > The server is provider-agnostic—can be switched to OpenAI or others by changing one module and env vars.
- **Frontend:** Vanilla HTML/CSS/JS (no build step)

---

##  Quick Start (Local)

```bash
git clone https://github.com/dhaminideva/doc-filler.git
cd doc-filler
npm install

# copy example env and adjust if needed
cp .env.example .env

# run the server
npm run dev
# open http://localhost:3000
