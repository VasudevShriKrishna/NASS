# MASTER IMPLEMENTATION PROMPT — NASS GROUP AI AGENT / COPILOT
## Complete Enterprise Architecture, Sarvam-105B Reasoning, Sarvam Vision 1.5, MCP, External Web Search, Live NASS Intelligence, Document Processing, Voice, CSV/XLSX/PDF Generation, and Permanent Error Resolution

# 1. Mission

Act as a multidisciplinary enterprise engineering team comprising:

- Principal Solution Architect
- Enterprise Software Architect
- AI/LLM and Agent Orchestration Engineer
- Sarvam API and MCP Integration Specialist
- Document Intelligence and OCR Engineer
- Data Engineering and Database Specialist
- Web Research and News Intelligence Engineer
- Maritime, Procurement and Supply-Chain Intelligence Engineer
- Full-Stack Engineer
- Voice AI and Audio Streaming Engineer
- Reporting and Export Automation Engineer
- Security and DevOps Engineer
- QA and Test Automation Lead

Upgrade the existing **NASS Group AI Agent/Copilot and Closed-Loop Control Tower** into a working, secure, evidence-based enterprise assistant.

Use the existing repository, UI, design system, backend, database, authentication, routes, business logic and operational modules. This is an enhancement of the existing system, not a request to build a separate application.

The finished system must support:

1. Sarvam-105B as the primary reasoning and tool-selection model.
2. Sarvam MCP tools and supported direct API integrations.
3. Public web research, Google/web search through an actual connected provider, and current news retrieval.
4. NASS public company, project and marine information.
5. Authorized NASS internal projects, shipments, procurement, material, PO, inventory, stock, supplier and quality records.
6. Live maritime information through an actual connected data provider.
7. Historical information with source dates and evidence.
8. PDF, scanned-PDF, image, Word, Excel, CSV, JSON and other appropriate document processing.
9. Sarvam Vision 1.5 for supported document digitisation and structured extraction.
10. Native DOCX, XLSX and structured-file parsers where they are the better technical solution.
11. Sarvam STT and TTS for voice interaction.
12. CSV, XLSX, PDF, DOCX and other supported file generation.
13. Secure report downloads and source-backed answers.
14. Hands-free navigation and contextual follow-up.
15. Automated data ingestion, history, deduplication, evidence tracking and freshness monitoring.
16. Permanent handling of API errors, invalid JSON, empty records and the previously reported BOQ/Stock issue.
17. Actual end-to-end testing with documented evidence.

**Do not claim that functionality exists merely because a prompt, tool definition, test file, button or interface has been created. Every important capability must be connected to its real backend service and tested.**

---

# PART A — AUDIT THE EXISTING REPOSITORY

## 2. Inspect before modifying

Inspect the actual repository and deployed configuration.

Find and map the current implementation of:

- Application entry points and routing.
- Frontend framework and shared components.
- Backend API routes and service functions.
- Database schema, Prisma models where applicable, and relationships.
- AI Agent/Copilot prompt and orchestration logic.
- Sarvam-105B and any existing Mistral integration.
- Sarvam MCP client and tool registry.
- Existing STT and TTS adapters.
- File-upload and document-processing modules.
- Current web-search and news integrations.
- Maritime/AIS and other live data connectors.
- Projects, work packages, BOQ, demands and stock.
- Shipments, purchase orders, materials, suppliers and inventory.
- Quality, inspection and goods-receipt modules.
- Existing report and file-generation services.
- CSV/XLSX/PDF/DOCX download mechanisms.
- Shared API client and HTTP response parser.
- Authentication, roles and record-level access checks.
- Background tasks, scheduled jobs, event processing and queues.
- Environment configuration and deployment settings.
- Logging, monitoring, tests, migrations and backup mechanisms.

For each component, identify its actual status:

- Working.
- Partially working.
- Missing.
- Failing.
- Blocked by credentials or access.
- Implemented but untested.

Do not assume that a file implements a function just because its filename suggests that capability.

### Current files to inspect where they exist

Include the previously identified files and their real equivalents, such as:

- `src/lib/app-state.ts`
- `src/lib/voice/copilot-types.ts`
- `src/lib/voice/sarvam.ts`
- `src/lib/voice/mistral.ts`
- `src/components/app/voice-copilot.tsx`
- `src/components/app/views/ceo-tower.tsx`
- `src/components/app/views/projects.tsx`
- `src/app/api/ceo-control-tower/route.ts`
- `src/app/api/voice/copilot/route.ts`
- `src/app/api/voice/stt/route.ts`
- `src/app/api/voice/tts/route.ts`
- `src/lib/operational-tools.ts`
- `src/lib/reports-engine.ts`
- `src/app/api/assistant/route.ts`
- `src/lib/sarvam/model-router.ts`
- `src/lib/sarvam/mcp-client.ts`
- `src/lib/sarvam/nass-tools.ts`
- `src/lib/sarvam/live-connectors.ts`
- `src/lib/sarvam/document-intelligence.ts`
- `src/lib/sarvam/orchestrator.ts`
- `src/app/api/sarvam/mcp/route.ts`
- `src/lib/client.ts`
- `src/app/api/projects/route.ts`

Also inspect `.env` and environment configuration securely. Never reveal actual secrets in logs or the final report.

Do not assume every listed file exists or that the same path conventions are still in use.

## 3. Preserve the existing application

Preserve the existing theme, layout, navigation, routes, operational modules, database and authentication.

Prefer extending existing components and services over creating duplicates.

Do not replace functioning application features with a mock interface or static sample data.

Do not create a second database, report engine, authentication system or set of business calculations unless an actual architectural requirement justifies it.

Use controlled migrations, backups, feature flags and rollback plans where necessary.

---

# PART B — TARGET ARCHITECTURE

## 4. Overall architecture

Adapt this target architecture to the real repository:

```text
EXISTING NASS CONTROL TOWER
        |
        v
AGENT / COPILOT UI
  |     |      |
  |     |      +-- File upload and document preview
  |     +--------- Text input and conversation(normal questions latest news of MENA region and Global Suppy and Demand)also mathematcial questios and all text natural Language Conversation and funny)
  +--------------- Microphone and voice output
        |
        v
REQUEST GATEWAY
  +-- Authentication
  +-- User permissions
  +-- Intent classification
  +-- Current page and conversation context
  +-- File/type validation
        |
        v
AGENT ORCHESTRATOR
  +-- Sarvam-105B reasoning core
  +-- Model router and fallback policy
  +-- Tool planner and controlled tool registry
  +-- Policy enforcement and execution state
        |
        +--------------------+
        |                    |
        v                    v
SPECIALIST AI           INFORMATION SOURCES
  |                    |
  +-- Saaras STT         +-- NASS internal services
  +-- Bulbul TTS         +-- Public NASS sources
  +-- Vision 1.5         +-- External web/news search
  +-- Translation        +-- AIS/maritime provider
  +-- Language ID        +-- Approved file imports
  +-- Other verified     +-- Document repository
      Sarvam tools       +-- Authorized databases
        |                    |
        +---------+----------+
                  |
                  v
         VALIDATION AND EVIDENCE
          +-- Record validation
          +-- Source verification
          +-- Relationship validation
          +-- Unit/currency validation
          +-- Deterministic calculations
          +-- Conflict and freshness checks
                  |
                  v
           STRUCTURED RESULT
          +-- Verified data
          +-- Evidence references
          +-- Limitations and warnings
          +-- Operation status
                  |
                  v
          SARVAM-105B SYNTHESIS
                  |
          +-------+--------+
          |       |        |
          v       v        v
        TEXT    SPEECH    FILE
       ANSWER    TTS     EXPORT
```

Background data ingestion and long-running document/report operations should follow a separate managed workflow:

```text
PUBLIC OR AUTHORIZED SOURCE
           |
           v
SOURCE-SPECIFIC CONNECTOR
           |
           v
FETCH / STREAM / WEBHOOK / FILE IMPORT
           |
           v
SOURCE REFERENCE AND INGESTION LOG
           |
           v
NORMALIZATION / VALIDATION / DEDUPLICATION
           |
           v
RECORD VERSIONING / EVIDENCE / FRESHNESS
           |
           v
EXISTING DATABASE / DOCUMENT INDEX
           |
           v
AGENT TOOLS / DASHBOARDS / REPORTS
```

Keep these as logical separations. Reuse working services wherever they already fulfil the requirement.

---

# PART C — SARVAM REASONING AND MODEL ROUTING

## 5. Sarvam-105B is the primary reasoning model

Use `sarvam-105b` as the primary model for reasoning, tool selection, research synthesis and complex business questions.

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/chat-completion/overview

Use it for:

- Understanding natural-language requests.
- Choosing between internal tools and external research.
- Planning multi-step operations.
- Selecting approved tools.
- Creating structured tool arguments.
- Resolving project, shipment, supplier, material and PO references.
- Comparing multiple records or documents.
- Identifying missing and conflicting evidence.
- Interpreting extracted document content.
- Preparing research and project summaries.
- Creating report specifications.
- Answering follow-up questions.
- Synthesizing final results grounded in retrieved evidence.

Use the supported model endpoint, arguments and structured-output features actually available to the configured account.

Sarvam-105B must not be treated as an independent database, live-news feed, OCR engine or file generator. It orchestrates and reasons over tool outputs.

## 6. Model routing hierarchy

Build a capability-aware configurable router.

### Primary: `sarvam-105b`

Use for complex reasoning, planning, tool selection, reconciliation, data analysis and final evidence-based answers.

### Conversational: `sarvam-105b-conversations`

Use for suitable conversational and voice-oriented tasks where the model's supported capabilities provide a meaningful benefit.

If a verified answer is passed to a conversational model for wording, preserve all amounts, dates, IDs, citations and factual limitations exactly.

### Optional alternative models

Discover the actual models enabled for the account and verify their capabilities. Use an alternate model only when its endpoint, permissions, output schema and tool-calling requirements are compatible.

Keep Mistral only as an explicitly configured, tested alternative or fallback if the current application already uses it.

Do not call every model for each user request.

Do not switch to another model to compensate for a missing news provider, unavailable business record or failed document-processing tool.

### Router requirements

Track:

- Configured model IDs.
- Provider and endpoint.
- Capability compatibility.
- Timeout and rate-limit state.
- Tool-calling and structured-output validity.
- Fallback decision and reason.
- Request latency and usage.
- Final result validation status.

Use bounded retries. Do not repeatedly call models after a tool contract failure without changing the failing configuration.

---

# PART D — SARVAM MCP AND API CAPABILITIES

## 7. Connect the official Sarvam API MCP

Official documentation:

https://docs.sarvam.ai/api/developer-tools/mcp

Inspect the actual connected MCP server and discover its available tools and input schemas.

The official API MCP documentation includes the following tool categories; verify exact runtime names and availability before using them.

### LLM

- `sarvam_llm_complete`

Use for supported chat and reasoning requests.

### Speech-to-text

- `sarvam_stt_transcribe`

Use supported audio transcription modes.

### Text-to-speech

- `sarvam_tts_speak`
- `sarvam_tts_stream`

Use file-based or streaming speech as appropriate.

### Translation and language processing

- `sarvam_translate`
- `sarvam_transliterate`
- `sarvam_identify_language`
- `sarvam_text_analytics`

Use them according to their actual documented input and output capabilities.

### Document Intelligence

- `sarvam_vision_digitise`
- `sarvam_vision_extract`

Use them for supported full-document OCR and schema-based extraction.

### Pronunciation tools

Inspect and use supported pronunciation dictionary operations when beneficial.

### Builder/documentation tools

Discover relevant `sarvam_code_*` tools, if available, for development documentation and implementation guidance.

Do not confuse builder tools with actual operational or external-data connectors.

## 8. MCP versus direct API

The actual MCP server may expose different parameters or defaults from the latest direct API.

For each required operation:

1. Inspect the connected MCP tool schema.
2. Verify the configured model and endpoint.
3. Determine whether the required capability is supported through MCP.
4. Use MCP where it provides the required functionality.
5. If necessary, build a server-side direct Sarvam API adapter using the official supported API.
6. Expose a unified application-level interface so business code does not depend on transport-specific details.
7. Test the actual tool call and response.

Never assume that an unsupported parameter will work when sent through MCP.

Never report a model or feature as active unless it was verified at runtime.

---

# PART E — DOCUMENT INTELLIGENCE: SARVAM VISION 1.5

## 9. Required document-processing architecture

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/overview

https://docs.sarvam.ai/api/getting-started/models/sarvam-vision

Use **Sarvam Vision 1.5 through the official Sarvam Document AI API** for supported document digitisation and structured extraction.

First inspect the actual MCP integration. If its Vision tools expose the required functionality and model controls, use them. Otherwise, implement a dedicated server-side adapter using the documented direct API.

Do not assume the MCP tool accepts the same model/version arguments as the direct API.

### Important principle

Different file formats require different processing paths. Do not route every file through the same OCR endpoint.

Build a file-type router that inspects file extensions, MIME type, file signature and supported parser capabilities.

## 10. File processing matrix

Implement the following processing strategy, adapting it to actual supported formats and existing application dependencies.

### A. PDF

**Primary:** Sarvam Vision 1.5 Document AI.

Choose between:

- `Digitise` for all text, reading order, layout and tables.
- `Extract` for a defined set of fields such as PO number, material, quantity, unit price and shipment reference.

Use the actual documented job lifecycle and inspect the returned result.

The documented Document AI endpoint supports PDFs up to 10 pages per request. Larger documents must be divided into ordered batches of no more than 10 pages, and results must be reassembled with page references preserved.

Do not silently omit pages.

### B. Scanned PDF

Use Sarvam Vision 1.5 for supported OCR and extraction.

Preserve page ordering, detected text, relevant tables, source coordinates or field references where exposed, and any processing warnings.

For uncertain critical values, flag them for review.

### C. PNG / JPG / JPEG

Use Sarvam Vision 1.5 Document AI for supported document-page images.

For photographs that are not document pages or for unsupported content, inspect the supported image-processing capabilities rather than assuming that every image type works identically.

### D. ZIP of scanned page images

Use the supported Document AI input only when its format restrictions are satisfied.

The documented ZIP input supports a flat archive of JPG/PNG page images with a maximum of 10 images. Preserve correct filename-based order and do not send nested folders or arbitrary ZIP archives to this endpoint.

### E. Word files: DOCX / DOC / ODT

**Primary extraction path:** native document parsing using a suitable, maintained library.

Extract:

- Paragraphs.
- Headings.
- Tables.
- Hyperlinks.
- Metadata.
- Text order.
- Relevant document structure.

Use supported conversion and Sarvam Vision processing where OCR or complex visual layout is genuinely required.

For document-level translation with layout preservation, use Sarvam's Document Translation API rather than misusing the text translation tool.

### F. Excel files: XLSX / XLS / ODS

**Primary extraction path:** native spreadsheet parsing with a suitable library such as ExcelJS, SheetJS or an existing project-compatible parser.

Process:

- All relevant worksheets.
- Sheet names.
- Rows and columns.
- Cell values.
- Formulas and cached values where available.
- Number formats.
- Currency and percentage formats.
- Date values.
- Merged cells.
- Tables.
- Hidden sheets and visibility metadata where relevant.
- Named ranges where needed.
- Formula errors.
- Missing or inconsistent values.

Do not convert every workbook to an image and send it to OCR.

Preserve the distinction between the displayed value, raw cell value, formula and cached formula result.

Do not assume a formula has a current recalculated value when the workbook lacks a trustworthy cached result.

Protect against macro-enabled or malicious workbook content. Never automatically execute spreadsheet macros or embedded code.

Sarvam Document AI extraction supports structured output in JSON, CSV and XLSX, but native spreadsheet parsing remains the preferred path for detailed workbook semantics and complete worksheet processing.

For translating an entire supported spreadsheet with formatting preserved, use the appropriate documented Document Translation workflow instead.

### G. CSV / TSV

Use a native delimited-text parser.

Detect or require the correct delimiter and encoding where possible.

Preserve field names, row values, quoted strings and data types without changing valid identifiers or dropping leading zeros.

Validate row counts and column counts.

### H. JSON / XML

Use native parsers and schema validation.

Reject malformed content with a clear error. Do not let the LLM repair the source data silently.

### I. TXT / Markdown / HTML

Use native text or HTML parsing appropriate to the content.

For untrusted HTML, remove active content and avoid executing embedded scripts.

### J. PowerPoint and other presentation files

Use a compatible native presentation parser or a validated conversion workflow.

Preserve slide order, text, tables and source references.

Do not assume the Vision endpoint accepts a PPTX file directly unless the current API documentation explicitly confirms it.

### K. Unsupported formats

Detect the format, explain the limitation and offer an approved conversion workflow.

Never pretend to process a format that the connected API or parser does not support.

## 11. Digitise versus Extract

Use `Digitise` when the application needs:

- Full-document searchable text.
- Page-level content.
- Tables.
- Reading-order preservation.
- Archival ingestion.
- Document search and retrieval.
- A complete document summary based on its extracted content.

Use `Extract` when the application needs specific fields with a schema.

For a NASS purchase order, a schema may include:

- PO number.
- Supplier.
- Project code.
- PO issue date.
- Currency.
- Material code.
- Material description.
- Ordered quantity.
- Unit of measure.
- Unit price.
- Line-item amount.
- Tax.
- Total value.
- Delivery terms.
- Delivery date.
- Source page or evidence reference.

For a bill of lading, shipment manifest or loading ticket, use a different schema appropriate to the document.

Potential fields include:

- Document reference.
- Shipment reference.
- Vessel name and verified identifiers, where explicitly present.
- Loading and discharge ports.
- Material and commodity descriptions.
- Declared cargo quantity.
- Reported gross, net and tare weight when stated.
- Weight unit.
- Relevant dates.
- Supplier and consignee.
- Related purchase order.
- Declared value and currency, if present.

Do not use a PO schema for all document types.

## 12. Document job lifecycle

For the documented Sarvam Document AI API, follow the actual current SDK/API contract.

Implement:

1. Secure file upload.
2. File validation and type detection.
3. Job creation.
4. Digitise or Extract selection.
5. Required schema validation for extraction.
6. Job status polling according to provider limits.
7. Handling of completed, partially completed, failed or rejected jobs.
8. Output retrieval using the supported download mechanism.
9. Validation of the downloaded output.
10. Data normalization.
11. Evidence registration.
12. Authorized storage and access.
13. Error recovery and audit logging.

Do not assume the result is immediately available after job creation.

The current documented job API uses `doc_ai.digitise()` and `doc_ai.extract()` in the SDK. Use the corresponding real interface available in the chosen programming environment.

Use the actual supported output format names. For the digitisation API, documented options include `html`, `md` and `json`. Do not substitute guessed parameter values.

## 13. Document extraction validation

After any AI extraction:

1. Validate the extracted schema.
2. Validate identifier formats.
3. Normalize units only with explicit transformation rules.
4. Preserve source units alongside normalized values.
5. Validate dates without changing their meaning.
6. Check arithmetic using deterministic code.
7. Reconcile repeated PO, invoice and shipment references.
8. Compare against authorized records where available.
9. Identify missing and conflicting fields.
10. Record extraction status and evidence.

Example: if a PO states 1,200 tonnes and a shipping document states 1,150 tonnes, report the discrepancy and its sources. Do not silently choose one figure.

Preserve the original document or authorized source reference and a hash when appropriate.

An extracted value is not automatically an authoritative financial or operational record.

---

# PART F — SARVAM SPEECH AND CONVERSATIONAL TOOLS

## 14. Speech-to-text

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/overview

Evaluate the currently recommended Saaras STT model, including `saaras:v4`, and the supported realtime streaming modes.

For hands-free interaction, evaluate the documented realtime streaming endpoint and its actual model/access requirements.

Support:

- English business terminology.
- Project IDs, PO IDs and shipment identifiers.
- Partial transcripts where supported.
- End-of-utterance detection.
- Silence and background-noise recovery.
- Transcript correction for ambiguous identifiers.
- Clear error handling when audio could not be transcribed.

Do not invent speech endpoint parameters or claim realtime support through an MCP tool unless that tool exposes it.

## 15. Text-to-speech

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/overview

Evaluate the current Bulbul TTS model and appropriate REST, HTTP streaming or WebSocket mode.

The official documentation currently describes Bulbul v4 Flash and Bulbul v3 capabilities. Choose according to the actual task, language, voice and deployment constraints.

Support:

- Concise spoken answers.
- Correct reading of weights, units, financial amounts and dates.
- Interruptions.
- Pausing and resuming.
- Error recovery.
- Prevention of duplicate audio.
- Appropriate pronunciation of technical terms.

Use deterministic speech normalization for identifiers and values without changing the on-screen source values.

## 16. Translation and document translation

Use Sarvam's supported translation, transliteration and language-identification tools for relevant text operations.

For whole-file translation, use the separate documented Document Translation API:

https://docs.sarvam.ai/api/api-guides-tutorials/doc-translation/overview

The documented workflow is asynchronous and includes job creation, file upload, execution, status checking and export.

Do not mistake `sarvam_translate` for an entire-file PDF, Word or Excel translation service.

Use document translation when layout-preserving translation is requested; use native parsers or Document AI for extraction.

---

# PART G — EXTERNAL WEB SEARCH AND GLOBAL NEWS

## 17. Connect a real external search provider

The agent must not be restricted to internal NASS systems when a user explicitly requests public research.

Inspect the existing integrations first. If no actual web search exists, implement a server-side search adapter using a currently supported provider.

Potential starting point:

https://help.tavily.com/articles/4840311948-what-is-the-tavily-search-api

If the user specifically requests Google search, verify the current availability and access rules of Google's search APIs before selecting one.

Register real backend functions equivalent to:

- `web_search`
- `fetch_webpage`
- `search_news`
- `search_official_sources`
- `retrieve_source_evidence`

Adapt function names to the current application.

Each result should contain a source title, publisher, original URL, publication date where available, retrieval timestamp, query and filters, content extract, and retrieval status.

Keep keys server-side.

If the provider is not configured, tell the user that the search connector is unavailable; do not pretend that search occurred.

## 18. News and external research scope

Support research about:

- NASS Group and subsidiaries.
- Publicly announced projects and awards.
- Government and regulatory announcements.
- Bahrain's Prime Minister and other requested public officials.
- Narendra Modi and other requested public figures, where relevant.
- Construction and infrastructure.
- Procurement and tenders.
- Suppliers and manufacturing.
- Materials and commodity markets.
- Logistics and supply chains.
- Maritime and port developments.
- Weather and environmental disruptions.
- Geopolitics, shipping routes and trade restrictions.
- Relevant energy and economic developments.
- Supplier, client and industry announcements.
- Relevant technology and industrial developments.

Support current and historical date filters.

For last-24-hour requests, use the actual current time and configured timezone, defaulting to `Asia/Bahrain` for Bahrain-focused reports.

Distinguish publication time from event time and retrieval time.

Do not claim comprehensive worldwide coverage if the actual sources and search limits do not provide it.

## 19. Evidence and research response

For significant claims:

- Retrieve the actual source.
- Check publication date and relevance.
- Prefer primary sources where appropriate.
- Seek independent corroboration for material claims.
- Preserve URLs and evidence excerpts when permitted.
- Identify contradictions and missing information.
- State what the source does and does not prove.

When the user requests research in text, provide readable text with sources and dates by default.

Do not force the user to upload a document for an ordinary publicly searchable question when the connected web tools can retrieve the information.

---

# PART H — NASS PROJECT, MARITIME, PROCUREMENT AND SUPPLY CHAIN

## 20. Public NASS sources

Start with the following sources, then discover additional credible official sources:

- https://www.nassgroup.com/
- https://www.nassgroup.com/marine/
- https://www.nasscorporation.com/current-projects/
- https://www.nasscorporation.com/completed-projects/
- https://www.nasscorporation.com/annual-reports/
- https://www.tenderboard.gov.bh/
- https://www.data.gov.bh/

Build an evidence-backed register of publicly identified projects, marine operations, official tenders and relevant disclosed facts.

Do not present a public list as NASS's complete internal project register.

Distinguish a tender or bid from an awarded contract, and an announcement from an executed transaction.

## 21. Authorized internal NASS data

Preserve and extend existing tools for:

- Project and work-package information.
- BOQ and material demands.
- Purchase requisitions and POs.
- Supplier quotations.
- Material stock and inventory movements.
- Goods receipt and quality inspection.
- Shipment records and history.
- Vessel and port relationships.
- Supplier and manufacturer information.
- Authorized costs and values.
- CEO decisions and bottlenecks.
- Report and connector status.

Inspect the real schema and existing services before adding new ones.

Do not fabricate private shipment weights, PO values, stock balances or project status.

## 22. Maritime intelligence

Evaluate appropriately licensed or authorized AIS providers, including:

- https://aisstream.io/
- https://api.vesselfinder.com/docs/
- https://www.aishub.net/api

Connect actual vessel-position information when available.

Do not assume AIS proves vessel ownership, cargo, shipment weight or commercial value.

Link a vessel to a NASS operation only with supporting evidence.

## 23. Supply-chain and procurement intelligence

Support the available data for:

- Tenders and deadlines.
- Suppliers and supplier quotes.
- Purchase orders.
- Material specifications and quantities.
- Order balances.
- Inventory availability.
- Shipment and delivery status.
- Freight and logistics.
- Quality and inspection.
- Supplier performance.
- Market prices and commodity benchmarks.
- Relevant global disruptions.

Distinguish actual internal commercial terms from published market prices or estimates.

## 24. Record provenance and data freshness

Every material claim or record should retain the appropriate equivalents of:

- Source type.
- Source URL or document reference.
- Source system and record ID.
- Publication/event timestamp.
- Retrieval timestamp.
- Last successful synchronization.
- Verification status.
- Record version.
- Evidence reference.
- Demo indicator.

Use classifications such as:

- `OFFICIAL_PUBLIC`
- `LIVE_EXTERNAL`
- `COMPANY_INTERNAL`
- `AUTHORIZED_IMPORT`
- `ESTIMATE`
- `SYNTHETIC_DEMO`

Maintain clear separation between public, internal, estimated and synthetic data.

---

# PART I — REPORTS AND FILE CREATION

## 25. Real output generation

Use existing file-generation services where possible.

Support requested outputs including:

- CSV.
- XLSX.
- PDF.
- DOCX.
- JSON.
- HTML preview.

Do not claim that files cannot be generated solely because the existing toolset lacks a prebuilt export function. Inspect available libraries and implement the required authorized backend service where appropriate.

### CSV and Excel capabilities

Support exports of:

- Project registers.
- BOQ and material demands.
- PO and procurement records.
- Supplier records.
- Maritime and shipment records.
- Inventory and stock movements.
- Quality and inspection.
- Source evidence.
- News and public intelligence.
- Data freshness and connector status.
- User-selected filtered records.

For XLSX, preserve useful sheet structure, column types and formats. Do not silently convert dates, currency or leading-zero identifiers into incorrect values.

Validate row counts and output readability.

Include evidence fields and timestamps where appropriate.

Never include unauthorized internal records. Keep demo data explicitly marked and excluded from real totals.

## 26. PDF and formal report generation

Use the existing report engine where possible.

Support approved reports such as:

- CEO brief.
- Shipment dossier.
- Project audit.
- Inventory risk.
- Procurement and supply-chain report.
- Maritime intelligence report.
- Global news briefing.
- Document-extraction summary.
- Source and connector health report.

For every report:

1. Resolve the request and filters.
2. Check authorization.
3. Retrieve actual source records.
4. Validate relationships and freshness.
5. Calculate values deterministically.
6. Include evidence and limitations.
7. Generate the file.
8. Validate the file.
9. Store it securely.
10. Return the actual report status.
11. Provide an authorized download link.

Do not say that a file has been generated until it exists and has passed validation.

---

# PART J — AGENT ORCHESTRATION AND TOOL EXECUTION

## 27. Full request execution loop

Implement a bounded, auditable orchestration loop:

1. Receive the user's request.
2. Authenticate the user.
3. Load the relevant authorized context.
4. Classify the intent.
5. Choose the required data sources and specialist capabilities.
6. Ask Sarvam-105B to plan or select approved tools.
7. Validate every proposed tool call.
8. Execute authorized tools.
9. Validate responses and evidence.
10. Perform required deterministic calculations.
11. Ask Sarvam-105B to synthesize the final grounded answer.
12. Deliver text, voice, navigation or file output.
13. Record the actual execution result and relevant audit event.

Use a defined maximum number of tool calls/iterations. Prevent infinite loops or repeated execution.

Do not let free-form model output trigger arbitrary backend functions.

Use stable tool contracts with JSON Schema, parameter validation, error codes, authorization rules, timeout policy, idempotency requirements and documented return types.

The agent must understand the difference between proposing an action and completing it.

---

# PART K — PERMANENT API AND BOQ/STOCK ERROR FIXES

## 28. Consistent response handling

Inspect the shared API client and all affected backend routes.

Correctly handle:

- Successful JSON responses.
- Empty collections.
- `204 No Content` where supported.
- Empty bodies.
- Invalid or truncated JSON.
- HTML error pages.
- HTTP 4xx and 5xx errors.
- Database exceptions.
- Authentication failures.
- Missing and invalid identifiers.
- Timeouts and network failures.

Implement or reuse a safe response parser that reads the response body only once, checks status and content type, handles valid empty responses and preserves structured errors.

Do not suppress backend errors by returning fake empty collections.

Backend endpoints that promise JSON must return valid JSON under their defined contract.

## 29. BOQ and Stock regression

Investigate the previously reported failure:

`SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input`

Affected example:

- Project: `PRJ-ALBA-06`
- Status: `HISTORICAL ARCHIVE`
- Displayed material demands: zero
- Action: View BOQ & Stock

The earlier investigation proposed a Prisma relation mismatch involving `legalEntity`, missing backend error handling and unsafe frontend `response.json()` parsing.

Treat this as a reported root cause, not as an independently verified fact until the actual code and runtime are inspected.

If confirmed, fix:

- Incorrect Prisma relation usage.
- Backend exception handling and response contracts.
- Frontend body parsing and error handling.
- Project/work-package relationships.
- Cross-view drill navigation.
- Empty-state behaviour.

A historical project with no BOQ, material demand or stock records must show a valid empty state—not crash.

Test the endpoint and actual browser click workflow end to end.

Do not invent material demands or stock to fill the page.

---

# PART L — VOICE AND HANDS-FREE OPERATION

## 30. Browser voice architecture

Use the supported Sarvam STT/TTS API or MCP capability appropriate to the actual use case.

Support:

- Microphone permission handling.
- Audio capture.
- Speech-to-text.
- Conversation context.
- Tool execution.
- Spoken answers.
- Interruptions.
- Pause/resume.
- Cancellations.
- Contextual follow-up.
- Recovery from audio or network failures.

Maintain explicit session states such as:

`IDLE`, `LISTENING`, `TRANSCRIBING`, `INTERPRETING`, `FETCHING_DATA`, `EXECUTING_TOOL`, `NAVIGATING`, `GENERATING_REPORT`, `SPEAKING`, `PAUSED`, `RECOVERING`, and `ERROR`.

The user must grant microphone access through supported browser controls. Do not claim that browser permission can be silently granted or that background listening continues when the browser suspends the application.

## 31. Context-aware navigation

Use the actual frontend router and an approved route registry.

Support commands such as:

- Open project.
- Open shipment.
- Show its linked PO.
- Open BOQ and stock.
- Read the source document.
- Search today's news.
- Generate CSV.
- Create an Excel file.
- Generate a PDF.
- Download the report.
- Stop speaking.
- Pause listening.
- Resume listening.
- Cancel the current request.

Maintain context for the current project, shipment, material, supplier, filters and report job.

Resolve follow-up references correctly. Ask a short clarification when multiple records match.

Never execute arbitrary model-generated URLs or JavaScript.

For sensitive actions, use the application's normal confirmation and authorization requirements.

---

# PART M — SECURITY AND DATA PROTECTION

## 32. Mandatory security controls

- Keep Sarvam, Mistral, web-search and other API keys on the server.
- Do not reveal keys or secrets in prompts, reports, browser bundles or logs.
- Enforce user and record-level permissions.
- Restrict MCP tools and backend operations to approved functions.
- Validate all inputs and outputs.
- Treat uploaded documents, transcripts and retrieved webpages as untrusted content.
- Prevent prompt injection from external content.
- Require appropriate approvals for consequential operations.
- Protect report downloads and document access.
- Respect provider data-retention and licensing rules.
- Avoid transmitting confidential NASS data to unapproved providers.
- Keep sensitive commercial information out of unnecessary logs.
- Keep synthetic data isolated from real records.

Public research must not become a way to bypass access to confidential NASS systems.

---

# PART N — TESTING, EVIDENCE AND ACCEPTANCE

## 33. Document-processing tests

Test:

1. A text-based PDF.
2. A scanned PDF.
3. A PNG/JPEG document image.
4. A PDF with tables.
5. A PDF with missing or inconsistent fields.
6. A PDF larger than the supported page limit, correctly split and reassembled.
7. A DOCX containing paragraphs and tables.
8. An XLSX containing multiple worksheets, formulas, dates and currencies.
9. A CSV containing leading-zero IDs and special characters.
10. A malformed document or unsupported format.
11. A schema-based PO extraction.
12. A shipment document extraction.
13. Arithmetic validation of extracted totals.
14. Source/page references for important extracted fields.
15. Correct handling of failed or partially completed extraction jobs.

Confirm that PDF/image files use the appropriate Vision path and that DOCX/XLSX use the appropriate native parser or explicitly supported conversion path.

## 34. Web-search tests

Verify that:

- An explicit search request executes the external search tool.
- Results contain actual source URLs and relevant dates.
- A current-news query uses live retrieval.
- An historical query uses the requested period.
- The agent returns a readable text answer by default.
- The agent does not refuse solely because the query is external.
- Missing credentials or failed providers produce an honest explanation.
- No citations or news headlines are fabricated.

## 35. Data and file tests

Verify that:

- Authorized internal records are retrieved correctly.
- Public information is not mistaken for internal data.
- Maritime positions do not become invented shipment records.
- Business calculations are deterministic.
- Source freshness is shown.
- CSV and XLSX files are real, readable and contain the correct rows.
- PDF files are created and validated.
- Authorized downloads work.
- Demo data is excluded from real totals.
- Evidence references are retained where required.

## 36. BOQ/Stock and API tests

Verify:

- The affected historical project.
- Empty BOQ and material-demand records.
- Empty stock records.
- Normal populated project records.
- Invalid project identifiers.
- 404, 403 and 500 responses.
- Empty body, malformed JSON and non-JSON error responses.
- Correct navigation and empty-state display.
- Correct authorization and error reporting.

Run the real project test commands and provide the actual output. A list of test scenarios is not evidence that the tests passed.

---

# PART O — IMPLEMENTATION PHASES

## 37. Required implementation sequence

### Phase 1: Architecture audit

Inspect the real repository, schema, routes, tool registry, prompts, source connectors and deployment configuration.

### Phase 2: Core Agent and model routing

Keep Sarvam-105B as the primary reasoning model. Implement source-aware routing, controlled tool execution, validation and structured errors.

### Phase 3: External web research

Connect and verify actual search and news tools. Remove conflicting internal-only routing restrictions without weakening security.

### Phase 4: Document Intelligence

Implement the real file-type router, Vision 1.5 digitisation/extraction adapter, native Office-file parsing, document validation and source provenance.

### Phase 5: NASS data intelligence

Connect official public NASS information, authorized operational data, public procurement records and available maritime feeds.

### Phase 6: Report and file services

Implement or reuse actual CSV/XLSX/PDF/DOCX generation, secure storage and downloads.

### Phase 7: Voice integration

Complete STT/TTS, hands-free session management, contextual follow-up and validated navigation.

### Phase 8: Error fixes and regression

Resolve the BOQ/Stock problem and any shared API-contract defects confirmed during inspection.

### Phase 9: Acceptance and production verification

Run integration, security, document-processing and end-to-end tests. Document actual results and outstanding blockers.

Do not claim a phase is complete just because code has been generated.

---

# PART P — FINAL IMPLEMENTATION REPORT

## 38. Required deliverable

After implementation, provide:

1. Actual architecture discovered.
2. Files and modules changed.
3. Components reused.
4. Components implemented.
5. Sarvam models and MCP tools configured.
6. Document processing methods for each supported file format.
7. Web-search and news connectors enabled.
8. Public and authorized internal data sources connected.
9. Evidence and freshness behaviour.
10. CSV/XLSX/PDF/DOCX generation status.
11. Voice and navigation behaviour.
12. BOQ/Stock and API response fixes verified.
13. Test commands and actual results.
14. Required environment variables without secret values.
15. Required credentials, access and subscriptions.
16. Known limitations.
17. Recovery and security status.
18. Production-readiness assessment.

For each feature, state one of:

- Implemented and tested.
- Implemented but not yet verified.
- Partially implemented.
- Blocked by external access or credentials.
- Not implemented.

Never report a feature as complete without real verification.

# FINAL DIRECTIVE

Build the existing NASS Group AI Agent/Copilot into a reliable enterprise assistant with Sarvam-105B as its primary reasoning engine, Sarvam Vision 1.5 for supported PDF/image document intelligence, native parsing for Office and structured files, real external search tools, authorized NASS operational tools, and validated document/file-generation services.

The assistant must choose the right component for each request, retrieve the actual information, validate evidence and calculations, and return a useful grounded answer or a real downloadable file.

**Do not confuse reasoning with retrieval, OCR with spreadsheet parsing, translation with extraction, a public announcement with a private transaction, or a generated file link with an actually completed export.**

Inspect, implement, execute and validate the complete workflow while preserving the existing architecture, theme, security and business rules.
Output alwasy tell in natural language