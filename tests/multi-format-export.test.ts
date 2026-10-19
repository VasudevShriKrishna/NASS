/**
 * Automated Verification Suite for Multi-Format Export Engine
 * Validates Part I (Section 25 & 26) of 3.md:
 * - CSV generation with UTF-8 BOM
 * - XLSX (SpreadsheetML) generation
 * - DOCX document generation
 * - JSON structured export
 * - PDF luxury executive report generation
 */

import { generateMultiFormatReport } from "../src/lib/export-engine";

async function runTests() {
  console.log("================================================================");
  console.log("MULTI-FORMAT EXPORT ENGINE: VERIFICATION TEST SUITE");
  console.log("================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${String(total).padStart(2, "0")}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${String(total).padStart(2, "0")}: ${testName} — ${detail || "Condition not met"}`);
    }
  }

  // 1. CSV Export for Project Dossier
  const csvRes = await generateMultiFormatReport({
    type: "project",
    targetRef: "PRJ-2201",
    format: "csv",
  });
  const csvText = csvRes.buffer.toString("utf-8");
  assert(
    csvRes.format === "csv" &&
      csvRes.filename.endsWith(".csv") &&
      csvRes.mimeType.includes("text/csv") &&
      csvText.startsWith("\uFEFF") &&
      csvText.includes("Project Code"),
    "CSV export generates valid UTF-8 BOM and headers for project register"
  );

  // 2. JSON Export for Shipment Intelligence
  const jsonRes = await generateMultiFormatReport({
    type: "shipment",
    targetRef: "SHP-8801",
    format: "json",
  });
  const parsedJson = JSON.parse(jsonRes.buffer.toString("utf-8"));
  assert(
    jsonRes.format === "json" &&
      parsedJson.reportType === "shipment" &&
      parsedJson.data.length > 0 &&
      parsedJson.data[0]["Shipment Ref"] === "SHP-8801",
    "JSON export returns structured, machine-readable shipment data with provenance"
  );

  // 3. XLSX (SpreadsheetML) Export for Inventory
  const xlsxRes = await generateMultiFormatReport({
    type: "inventory",
    targetRef: "MAT-REBAR-B500B",
    format: "xlsx",
  });
  const xlsxText = xlsxRes.buffer.toString("utf-8");
  assert(
    xlsxRes.format === "xlsx" &&
      xlsxRes.filename.endsWith(".xlsx") &&
      xlsxText.includes("urn:schemas-microsoft-com:office:spreadsheet") &&
      xlsxText.includes("MAT-REBAR-B500B"),
    "XLSX export generates Microsoft Excel compatible SpreadsheetML workbook"
  );

  // 4. DOCX Export for CEO Executive Decision Brief
  const docxRes = await generateMultiFormatReport({
    type: "ceo-summary",
    format: "docx",
  });
  const docxText = docxRes.buffer.toString("utf-8");
  assert(
    docxRes.format === "docx" &&
      docxRes.filename.endsWith(".docx") &&
      docxText.includes("urn:schemas-microsoft-com:office:word") &&
      docxText.includes("Executive Decision Briefing"),
    "DOCX export generates formatted Word document with executive briefing sections"
  );

  // 5. PDF Luxury Report Export
  const pdfRes = await generateMultiFormatReport({
    type: "ceo-summary",
    format: "pdf",
  });
  assert(
    pdfRes.format === "pdf" &&
      pdfRes.filename.endsWith(".pdf") &&
      pdfRes.buffer.length > 1000 &&
      pdfRes.buffer.slice(0, 4).toString() === "%PDF",
    "PDF export invokes PDFKit luxury black-gold generator producing valid PDF binary"
  );

  console.log("\n================================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
