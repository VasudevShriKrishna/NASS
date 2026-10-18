import { generatePdfReport } from "../src/lib/reports-engine";

async function main() {
  console.log("Testing PDF generation for all 7 report types...");
  const types = ["shipment", "project", "procurement", "inventory", "supplier", "quality", "ceo_executive"] as const;
  for (const t of types) {
    const res = await generatePdfReport({ type: t, ref: t === "shipment" ? "SHP-8802" : t === "project" ? "PRJ-2201" : undefined });
    console.log(`✓ Report [${t}]: filename=${res.filename}, bufferSize=${res.buffer.length} bytes, title="${res.title}"`);
  }
  console.log("All 7 PDF report types generated successfully!");
}

main().catch(err => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
