/**
 * Automated Verification Suite for Sarvam Vision Document Extractor
 * Validates:
 * 1. Feature Flag Gating (SARVAM_VISION_EXTRACTION_ENABLED)
 * 2. Sliding Window Rate Limiting (10 req/min)
 * 3. File Size Enforcement (200 MB limit)
 * 4. Page Count Enforcement (10 pages per batch limit)
 * 5. Non-Vision Format Routing (.csv, .xlsx, .docx parsed locally without Vision)
 * 6. Vision Format Processing (PDF / image single-call extract)
 * 7. Anti-Fabrication Guarantee (missing fields return null / "field_not_found")
 * 8. Error Disambiguation (field_not_found vs connector_error vs model_error)
 */

import {
  extractDocument,
  checkRateLimit,
  resetRateLimiter,
  estimatePdfPageCount,
  parseCsvLocally,
  parseDocxLocally,
  parseXlsxLocally,
  DOCUMENT_JSON_SCHEMAS,
  MAX_FILE_SIZE_BYTES,
  MAX_PAGES_PER_BATCH,
} from "../src/lib/sarvam/vision-extractor";

async function runTests() {
  console.log("================================================================");
  console.log("SARVAM VISION DOCUMENT INTELLIGENCE: VERIFICATION TEST SUITE");
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

  // ─── Test 1: JSON Schemas defined for all document types ───
  const requiredSchemas = ["PURCHASE_ORDER", "BILL_OF_LADING", "COMMERCIAL_INVOICE", "MILL_TEST_CERT", "GENERIC"];
  const allSchemasPresent = requiredSchemas.every((s) => Boolean(DOCUMENT_JSON_SCHEMAS[s as keyof typeof DOCUMENT_JSON_SCHEMAS]));
  assert(allSchemasPresent, "Complete JSON Schemas exist for all trade document types");

  // ─── Test 2: Feature Flag Disabling ───
  process.env.SARVAM_VISION_EXTRACTION_ENABLED = "false";
  resetRateLimiter();
  const disabledRes = await extractDocument({
    buffer: Buffer.from("test content"),
    fileName: "po_sample.pdf",
    schemaType: "PURCHASE_ORDER",
  });
  assert(
    !disabledRes.success && disabledRes.error?.type === "FEATURE_DISABLED",
    "Feature flag gates execution when SARVAM_VISION_EXTRACTION_ENABLED=false"
  );
  process.env.SARVAM_VISION_EXTRACTION_ENABLED = "true"; // restore

  // ─── Test 3: Rate Limiting Enforcement (10 req/min) ───
  resetRateLimiter();
  let rateLimitExceeded = false;
  for (let i = 0; i < 11; i++) {
    const status = checkRateLimit();
    if (!status.allowed) {
      rateLimitExceeded = true;
      break;
    }
  }
  assert(rateLimitExceeded, "Sliding window rate limit halts the 11th request within 1 minute");
  resetRateLimiter();

  // ─── Test 4: File Size Limit (200 MB) ───
  const oversizedBuffer = { length: MAX_FILE_SIZE_BYTES + 1024 } as unknown as Buffer;
  const sizeRes = await extractDocument({
    buffer: oversizedBuffer,
    fileName: "massive_manifest.pdf",
    schemaType: "BILL_OF_LADING",
  });
  assert(!sizeRes.success && sizeRes.error?.type === "FILE_TOO_LARGE", "Enforces 200 MB maximum file size cap");

  // ─── Test 5: Page Count Limit (10 pages per batch) ───
  // Construct a dummy PDF buffer containing 12 page indicators
  const multiPagePdfStr = `%PDF-1.4\n` + Array.from({ length: 12 }, (_, i) => `/Type /Page\n/Parent 1 0 R`).join("\n");
  const multiPagePdfBuffer = Buffer.from(multiPagePdfStr, "latin1");
  const count = estimatePdfPageCount(multiPagePdfBuffer);
  assert(count === 12, "PDF page counter accurately detects multi-page catalogs (detected 12 pages)");

  const pageLimitRes = await extractDocument({
    buffer: multiPagePdfBuffer,
    fileName: "12_page_contract.pdf",
    schemaType: "PURCHASE_ORDER",
  });
  assert(!pageLimitRes.success && pageLimitRes.error?.type === "PAGE_LIMIT_EXCEEDED", "Rejects documents exceeding 10-page batch limit");

  // ─── Test 6: Non-Vision Format: .CSV Local Parsing ───
  const sampleCsv = `PO_NUMBER,SUPPLIER,TOTAL_USD,INCOTERMS\nPO-9001,Bahrain Steel Co,45000,CIF\nPO-9002,Emirates Rebar,32000,FOB`;
  const csvBuffer = Buffer.from(sampleCsv, "utf-8");
  const csvParsed = parseCsvLocally(csvBuffer);
  assert(
    csvParsed.headers.length === 4 && csvParsed.rows.length === 2 && csvParsed.rows[0].PO_NUMBER === "PO-9001",
    "Non-Vision .csv file parsed directly into structured records locally"
  );

  const csvExtractRes = await extractDocument({
    buffer: csvBuffer,
    fileName: "materials_manifest.csv",
    schemaType: "PURCHASE_ORDER",
  });
  assert(
    csvExtractRes.success && csvExtractRes.format === "LOCAL_TABULAR" && csvExtractRes.provenance.engine === "local_tabular_parser",
    "Document extractor routes .csv locally without transmitting to Sarvam Vision"
  );

  // ─── Test 7: Non-Vision Format: .DOCX Local Parsing ───
  const mockDocxStr = `PK\x03\x04word/document.xml<w:p><w:t>NASS GROUP PURCHASE ORDER PO-3001</w:t></w:p><w:p><w:t>Supplier: Emirates Steel</w:t></w:p>`;
  const docxBuffer = Buffer.from(mockDocxStr, "latin1");
  const docxParsed = parseDocxLocally(docxBuffer);
  assert(docxParsed.text.includes("PO-3001"), "Non-Vision .docx file parses paragraphs and text locally");

  const docxExtractRes = await extractDocument({
    buffer: docxBuffer,
    fileName: "contract_brief.docx",
    schemaType: "PURCHASE_ORDER",
  });
  assert(
    docxExtractRes.success && docxExtractRes.format === "LOCAL_DOCX" && docxExtractRes.provenance.engine === "local_docx_parser",
    "Document extractor routes .docx locally without transmitting to Sarvam Vision"
  );

  // ─── Test 8: Vision Format (PDF) Single-Call Extraction ───
  const samplePoPdf = `%PDF-1.4\n/Type /Page\nPO-4001\nSupplier: ALBA Aluminum Bahrain\nGrand Total: $125,000.00\nIncoterms: CIF KBSP`;
  const poPdfBuffer = Buffer.from(samplePoPdf, "latin1");
  const visionExtractRes = await extractDocument({
    buffer: poPdfBuffer,
    fileName: "alba_procurement.pdf",
    schemaType: "PURCHASE_ORDER",
  });

  assert(
    visionExtractRes.success &&
      visionExtractRes.format === "VISION_PDF" &&
      visionExtractRes.provenance.engine === "sarvam_vision_extract" &&
      visionExtractRes.provenance.singleCallCompliant === true &&
      visionExtractRes.provenance.toolChaining === false,
    "Vision PDF extracted via single sarvam_vision_extract call with zero tool chaining"
  );

  // ─── Test 9: Anti-Fabrication & Absent Field Tagging ───
  // Verify that po_number was extracted, while absent fields (like delivery_port or tax_amount) are strictly null with 'field_not_found'
  const poField = visionExtractRes.fields.po_number;
  const taxField = visionExtractRes.fields.tax_amount;
  assert(
    poField?.status === "extracted" && poField?.value === "PO-4001",
    "Extracted field matches document verbatim (PO-4001)"
  );

  assert(
    taxField?.status === "field_not_found" && taxField?.value === null,
    "Anti-fabrication guarantee: missing field returns value=null and status='field_not_found'"
  );

  // ─── Test 10: Disambiguation between field_not_found vs error ───
  assert(
    visionExtractRes.fields.buyer_name?.status === "field_not_found" &&
      visionExtractRes.error === undefined,
    "Distinguishes absent fields (field_not_found) from system or connector errors"
  );

  // ─── Test 11: SarvamMcpClient Integration ───
  const { SarvamMcpClient } = await import("../src/lib/sarvam/mcp-client");
  const mcpClient = new SarvamMcpClient("mock_test_key");
  const mcpVisionRes = await mcpClient.visionExtract({
    document_base64: Buffer.from("PO-8821\nSupplier: Gulf Steel").toString("base64"),
    fileName: "gulf_steel_po.pdf",
    schema_type: "PURCHASE_ORDER",
  });
  assert(
    mcpVisionRes.success &&
      mcpVisionRes.provenance.engine === "sarvam_vision_extract" &&
      mcpVisionRes.fields.po_number?.value === "PO-8821",
    "SarvamMcpClient.visionExtract() successfully executes single-call schema extraction"
  );

  // ─── Test 12: Bill of Lading Schema Extraction ───
  const sampleBol = `BOL-MED-9941\nCarrier: CMA CGM Group\nDischarge Port: KBSP Bahrain`;
  const bolRes = await mcpClient.visionExtract({
    document_base64: Buffer.from(sampleBol).toString("base64"),
    fileName: "ocean_bol.pdf",
    schema_type: "BILL_OF_LADING",
  });
  assert(
    bolRes.success &&
      bolRes.fields.bol_number?.value === "BOL-MED-9941" &&
      bolRes.fields.carrier_name?.value === "CMA CGM Group",
    "Bill of Lading schema extraction extracts typed manifest fields with no hallucination"
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
