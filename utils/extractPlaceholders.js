import PizZip from "pizzip";

// Returns an ordered array of unique placeholder labels (e.g., "Company Name")
export function extractPlaceholdersFromDocx(buffer) {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() || "";
  // Merge runs: Word often splits text; join w:t nodes content
  const text = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:t><w:t[^>]*>/g, "") // collapse adjacent text runs
    .replace(/<[^>]+>/g, ""); // strip tags
  const matches = [...text.matchAll(/\[([^\[\]\n\r]+?)\]/g)].map((m) => m[1].trim());
  // de-dup preserving order
  const seen = new Set();
  return matches.filter((m) => (seen.has(m) ? false : (seen.add(m), true)));
}
