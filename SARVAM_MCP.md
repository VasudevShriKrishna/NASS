# MASTER ARCHITECTURE & IMPLEMENTATION PROMPT
## NASS GROUP INTELLIGENCE CONTROL TOWER — SARVAM-105B REASONING CORE, SARVAM MCP TOOL ECOSYSTEM, VOICE-FIRST AI, DOCUMENT INTELLIGENCE, LIVE GLOBAL DATA & REPORT AUTOMATION

## 1. Mission and implementation responsibility

Act as a senior enterprise engineering team comprising a Principal Software Architect, AI Systems Architect, Sarvam Integration Specialist, LLM and Agent Engineer, MCP Engineer, Voice AI Engineer, Data Engineer, Maritime Intelligence Engineer, Document AI Engineer, Backend Engineer, Frontend Engineer, Security Engineer, DevOps Engineer and QA Automation Lead.

Upgrade the existing NASS Group Control Tower into a secure, evidence-based, continuously updated, voice-first intelligence platform.

Use the existing repository, framework, database, APIs, authentication, UI components, route structure, business logic and design system.

Do not rebuild the application from scratch. Do not change the current website theme or replace functioning modules unnecessarily.

The primary AI reasoning model must be **Sarvam-105B**. Other Sarvam models, specialist APIs and eligible alternative models must be selected through an explicit capability-aware routing strategy.

The platform must integrate:

1. Sarvam's official API MCP tools.
2. Sarvam-105B reasoning, structured output and tool calling.
3. Sarvam's speech-to-text and text-to-speech capabilities.
4. Sarvam's translation, transliteration, language identification and text analytics capabilities.
5. Sarvam Vision Document Intelligence.
6. Sarvam document translation where needed.
7. A controlled application tool registry for existing NASS business functions.
8. Authorized NASS internal data and verified public NASS information.
9. Live maritime, vessel and port sources where connected.
10. A real external web-search or news service for current worldwide news.
11. Document ingestion, secure retrieval, report creation and downloadable files.
12. Automated data ingestion, evidence tracking, freshness monitoring and recovery.
13. Voice-based navigation and conversational follow-up.
14. Existing authorization, audit, backup and deployment mechanisms.

Do not claim that an API provides information or functionality that its documentation and actual implementation do not support.

---

# PART A — REQUIRED ARCHITECTURE

## 2. Architecture principles

Build the solution using the following architectural principles.

**Reasoning is centralized.** Sarvam-105B is the default model for complex questions, tool selection, multi-step reasoning, conflict analysis and final synthesis.

**Specialist models handle specialist work.** STT handles speech recognition, TTS handles speech synthesis, Vision handles document digitisation and extraction, and translation APIs handle translation.

**The application owns the truth.** The backend, authorized source systems and validated database records—not the language model—are authoritative for NASS operational facts and calculations.

**MCP tools are capabilities, not the whole application.** Use MCP to access supported Sarvam functions. Implement separate, authorized connectors for NASS systems, public datasets, AIS providers, news sources, the database and file generation.

**Every important answer must be traceable.** Preserve source references, timestamps, verification status and calculation provenance.

**Fallbacks must be deliberate.** Never call every model for the same request by default. Select the minimum suitable capability, retry safely, and use a fallback only when required.

**Keep the UI unchanged.** Integrate the assistant into the current application's existing shared layout, routes and components.

**Do not overengineer.** Reuse current infrastructure and add modules only when needed.

## 3. Target logical architecture

Implement the following end-to-end architecture, adapting module names to the actual repository.

```text
EXISTING NASS CONTROL TOWER
        |
        v
EXISTING AUTHENTICATION + SHARED UI
        |
        +---- Current page / selected record / active filters
        |
        v
VOICE AND CHAT INTERFACE
        |
        +---- Browser microphone and audio output
        +---- Text input / conversational context
        |
        v
VOICE SESSION MANAGER
        |
        +---- Sarvam STT adapter
        +---- Transcript validation
        +---- Session state and interruption
        |
        v
BACKEND AI ORCHESTRATION GATEWAY
        |
        +---- Sarvam MCP client / direct API adapter
        +---- Model router
        +---- Sarvam-105B reasoning core
        +---- Structured intent and tool plan
        +---- Authorization and policy checks
        |
        v
CONTROLLED TOOL REGISTRY
        |
        +---- Existing NASS business APIs
        +---- Projects / procurement / materials / POs
        +---- Shipments / vessel records / inventory
        +---- Document search / document extraction
        +---- Web search / current news
        +---- Live maritime connectors
        +---- Calculations / report creation / exports
        |
        v
DATA AND EVIDENCE LAYER
        |
        +---- Existing business database
        +---- External source ingestion
        +---- Authorized company imports
        +---- Document repository and search index
        +---- Normalized records and version history
        +---- Evidence, freshness and verification metadata
        |
        v
VALIDATION AND RESULT ASSEMBLER
        |
        +---- Deterministic calculations
        +---- Source reconciliation
        +---- Permission checks
        +---- Evidence-linked structured result
        |
        v
SARVAM-105B FINAL SYNTHESIS
        |
        +---- Answer grounded in returned evidence
        +---- Concise summary and caveats
        +---- Report status and navigation result
        |
        v
SARVAM TTS STREAMING ADAPTER
        |
        +---- Spoken response / interruption
        +---- Screen response / tables / source links
        +---- Secure file download
```

Use an appropriate event or job pipeline for scheduled ingestion and long-running document/report tasks:

```text
PUBLIC / AUTHORIZED DATA SOURCES
        |
        v
SOURCE-SPECIFIC CONNECTORS
        |
        v
FETCH / WEBHOOK / STREAM / FILE IMPORT
        |
        v
RAW SOURCE REFERENCES + INGESTION LOG
        |
        v
NORMALIZATION / VALIDATION / DEDUPLICATION
        |
        v
VERIFICATION / RECONCILIATION / VERSIONING
        |
        v
EXISTING DATABASE + DOCUMENT INDEX
        |
        v
CONTROL TOWER DASHBOARDS / AI TOOLS / REPORTS
```

Use queues and background jobs only where required by actual workload. Reuse the existing task scheduler, worker and storage services if suitable.

## 4. Inspect before implementing

Inspect the current repository and deployed architecture.

Establish the actual:

- Frontend framework and route system.
- Backend framework and API contracts.
- Database and entity relationships.
- Existing business logic and calculation services.
- Project, shipment, material, PO, supplier, inventory and quality modules.
- Existing document uploads, storage and report generation.
- Existing voice and AI integrations.
- Existing authentication, access control and audit functionality.
- Deployment environment and environment variables.
- Current MCP client and external integrations.
- Available tests and health-check mechanisms.

Produce an architecture inventory and gap assessment first.

Map all new capabilities onto the actual repository. Do not create duplicate tables, routes, APIs, models or authentication systems unless needed.

Use controlled migrations, feature flags and rollback procedures for changes to production data and configuration.

---

# PART B — SARVAM MODEL ROUTING

## 5. Required model priority

Implement a configurable model router, but retain the following default strategy.

### Priority 1 — `sarvam-105b`: primary reasoning core

Model ID:

` sarvam-105b `

Use Sarvam-105B by default for:

- Complex reasoning and planning.
- Multi-step business questions.
- Resolving project, shipment, material, supplier and PO references.
- Selecting authorized application tools.
- Determining which sources must be retrieved.
- Comparing information from several documents.
- Reconciling conflicting operational records.
- Understanding global news in the context of NASS.
- Building structured report specifications.
- Interpreting follow-up questions.
- Summarizing validated results and evidence.
- Producing final grounded answers.

Use the documented Sarvam Chat Completion V1 endpoint for Sarvam's flagship model unless the repository's verified integration or an approved V2 feature specifically requires otherwise.

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/chat-completion/overview

Use supported streaming, native tool calling and structured JSON output where they fit the actual task.

For complex reasoning and planning, configure an appropriate supported reasoning-effort value based on task complexity and measured latency. Keep ordinary short voice responses fast and concise.

Do not assume that Sarvam-105B automatically knows live NASS data. It must call approved retrieval or operational tools and reason over their results.

### Priority 2 — `sarvam-105b-conversations`: conversational voice specialist

Model ID:

` sarvam-105b-conversations `

Use this model for supported real-time conversational or voice-oriented workloads where its specialized conversational behaviour provides a measurable benefit.

Typical use cases include:

- Natural voice dialogue.
- Conversational phrasing.
- Short clarification questions.
- Follow-up conversation flow.
- Concise user-facing language.

Do not automatically replace Sarvam-105B with the conversational variant for complex reconciliation, detailed financial analysis or multi-source planning.

If Sarvam-105B has already produced a verified factual result, the conversational model may help phrase that result for the user only if required. It must not alter amounts, identifiers, dates or evidence.

The original validated result remains authoritative.

### Priority 3 — capability-qualified alternative models

Sarvam's current Chat Completion V2 documentation lists additional model IDs:

- `deepseekv4.1-flash`
- `glm5.3`
- `gemma4`

V2 access may be restricted by API-key allowlisting. Check the actual account and supported endpoint before using these models.

Use these models only after verifying their current tool-calling, structured-output, reasoning, context, latency and modality capabilities for the intended workflow.

Configure the alternative-model order as an explicit setting rather than permanently hard-coding assumptions about which model is best.

Recommended initial policy:

1. Keep `sarvam-105b` as the primary reasoning engine.
2. Use `sarvam-105b-conversations` for suitable conversational voice work.
3. Use `deepseekv4.1-flash` as an eligible alternative for supported general tasks when enabled and tested.
4. Use `glm5.3` as an eligible alternative for supported complex reasoning tasks when enabled and tested.
5. Use `gemma4` for supported text/image tasks when its actual available capabilities match the task.

Before enabling a fallback for a tool-planning workflow, prove that it can generate the required valid tool arguments and structured output for that workflow.

If the selected fallback cannot perform a required operation, return to an eligible model or stop safely.

This is a proposed initial configuration, not a claim that any alternative model universally outperforms another. Benchmark against the project's real queries before final production configuration.

### Deprecated models

Do not include retired versions in the normal live fallback chain.

In particular, Sarvam-M (24B) is documented as deprecated and unavailable through the Chat Completions API. Do not design a fallback that depends on it or another deprecated model.

If the user's account exposes an older model, verify its actual supported status before using it.

Older does not automatically mean available, compatible or suitable.

### Model-router rules

The model router must track:

- Configured model priority.
- Actual model availability.
- Endpoint compatibility.
- Tool-calling compatibility.
- Structured-output compatibility.
- Input modality.
- Context and output limits.
- Timeout and rate-limit state.
- Latency and usage.
- Fallback reason.
- Whether a model response passed validation.

Do not retry by cycling through all providers after a malformed result. Use bounded retries and select an eligible fallback based on the failure type.

Do not send confidential company documents to an alternative provider unless the organization's policies explicitly authorize it.

Do not send every query to multiple models. Do not expose internal model-routing details unnecessarily in the normal user interface.

---

# PART C — OFFICIAL SARVAM MCP ECOSYSTEM

## 6. Integrate the official API MCP

Documentation:

https://docs.sarvam.ai/api/developer-tools/mcp

Use the official Sarvam API MCP server when appropriate to the existing application and deployment.

The documented local configuration uses the `sarvam-mcp` package and a server-side `SARVAM_API_KEY`. Verify the current installation instructions, supported Python version and tool schemas when building the actual environment.

Discover the tools from the connected MCP server rather than relying only on prompt examples.

Use the actual tool names, descriptions, arguments and result formats returned by the server.

### 6.1 Runtime tool inventory

The official API MCP documentation lists these runtime tool categories and their corresponding tool names. Verify the current runtime before integration.

**LLM**

- `sarvam_llm_complete`

Purpose: Chat completion using Sarvam's supported model endpoint.

Use the primary reasoning model where supported by the tool schema. Confirm whether the exposed MCP tool supports the selected model, structured outputs, streaming, reasoning options and function/tool calling needed by the application.

If the MCP tool does not expose a required capability, create a server-side direct API adapter using the official supported API rather than attempting unsupported parameters through MCP.

Do not maintain two independent, conflicting implementations of the same model request.

**Speech-to-text**

- `sarvam_stt_transcribe`

Purpose: Transcribe supported audio input using the tool's actual supported modes.

Verify whether the tool supports the desired model, language, streaming behaviour, timestamps and options.

**Text-to-speech**

- `sarvam_tts_speak`
- `sarvam_tts_stream`

Purpose: Generate speech output using the supported TTS interfaces.

Choose file-based synthesis or streaming according to the task. Use the suitable documented Bulbul model and speaker configuration if accepted by the actual runtime schema.

**Translation and language processing**

- `sarvam_translate`
- `sarvam_transliterate`
- `sarvam_identify_language`
- `sarvam_text_analytics`

Use these tools for supported text translation, script conversion, language identification and text analytics.

Do not confuse translation with reasoning or generic text analytics with external web search.

**Document intelligence**

- `sarvam_vision_digitise`
- `sarvam_vision_extract`

Use digitisation for complete-document OCR and structured content conversion. Use extraction for defined schema-based fields.

**Pronunciation dictionaries**

- `sarvam_pronunciation_list`
- `sarvam_pronunciation_get`
- `sarvam_pronunciation_create`
- `sarvam_pronunciation_delete`

Use these tools to manage supported pronunciation dictionaries. Inspect, list and test existing dictionaries before creating or changing them.

Require suitable authorization before deleting or modifying shared pronunciation configurations.

### 6.2 Builder and documentation tools

Discover the available `sarvam_code_*` tools in the connected MCP server.

These are development aids for such purposes as:

- Retrieving API documentation.
- Understanding endpoint schemas.
- Discovering supported languages.
- Obtaining code examples.
- Producing starter code.

Use them during integration and troubleshooting when relevant.

Do not mistake builder tools for production business-data tools. Do not expose development credentials or allow end users to invoke arbitrary builder operations.

### 6.3 Model defaults must be explicit

The MCP tool catalogue's documented defaults include `saaras:v3` for STT and `bulbul:v3` for TTS. Current direct API documentation identifies newer recommended options.

Therefore:

1. Inspect the actual MCP schema.
2. Determine whether the preferred model can be explicitly selected through the tool.
3. Use the preferred supported model explicitly.
4. Verify the returned model and output format when possible.
5. If the needed streaming or model control is unavailable in MCP, use a dedicated server-side direct API adapter.
6. Keep one application-level interface to the capability so callers do not need to know which transport was selected.

Do not assume that changing a model name in a request guarantees that the server accepted that model.

---

# PART D — MODEL AND TOOL SELECTION BY TASK

## 7. Required model-routing matrix

Implement the following functional separation.

| Task | Primary component | Policy |
|---|---|---|
| Complex business reasoning | Sarvam-105B | Default reasoning core |
| Multi-step planning | Sarvam-105B | Use validated tool results |
| Tool selection and arguments | Sarvam-105B with supported tool calling | Validate every tool call |
| Live conversational phrasing | Sarvam-105B Conversations, where appropriate | Do not change verified facts |
| Audio transcription | Saaras STT | Use a supported current model and mode |
| Low-latency partial transcription | Saaras realtime/streaming API where available | Verify current endpoint and compatibility |
| Speech generation | Bulbul TTS | Select current suitable model and transport |
| Whole document OCR | Sarvam Vision Digitise | Preserve evidence and page context |
| Specific field extraction | Sarvam Vision Extract | Use a defined extraction schema |
| Text translation | Mayura or Sarvam Translate | Select according to target language and requirements |
| Script conversion | Sarvam Transliterate | Preserve names and identifiers |
| Text language identification | Sarvam Identify Language | Use when language is uncertain |
| Typed analytics over supplied text | Sarvam Text Analytics | Not a substitute for external search |
| Whole-file translation | Sarvam Document Translation API | Use the documented document workflow |
| Current web/news retrieval | External search/news connector | Sarvam alone is not the source of live news |
| Live vessel positions | AIS/maritime provider | Do not infer cargo weight or ownership |
| NASS private data | Authorized NASS system | Never infer missing internal values |
| Business calculations | Existing backend or deterministic calculation module | Never rely on model-generated arithmetic alone |
| PDF/DOCX/XLSX/CSV generation | Existing report/file service | Validate the created file |
| Route navigation | Application route registry | Use only validated routes |

Every task must use the components necessary for its modality. Never send raw audio to a text-only tool or assume a reasoning model is itself an OCR engine.

---

# PART E — SPEECH-TO-TEXT ARCHITECTURE

## 8. Choose the proper Saaras integration

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/overview

Evaluate the currently recommended Saaras v4 model, with v3 available only where needed and supported.

The current documentation also describes realtime streaming capabilities. Verify their present status, model compatibility and account access before implementation.

Use the following selection policy.

**Single audio file or batch transcription:** Use the appropriate supported REST or batch interface.

**Short near-real-time audio:** Use the suitable low-latency supported interface.

**Interactive, continuous browser voice:** Prefer a supported streaming/realtime interface that can deliver partial transcripts and end-of-utterance signals when available.

**Audio translation or code-mixed transcription:** Select the appropriate documented Saaras mode rather than attempting to emulate it with the reasoning model.

### Required speech functionality

- English speech recognition.
- Business terminology and technical vocabulary.
- Project names, supplier names and material descriptions.
- Shipping and maritime terms.
- Dates, weights, currencies and quantity expressions.
- PO, shipment and project identifiers.
- Partial transcripts where supported.
- End-of-utterance detection.
- Configurable silence handling.
- Noise and failure recovery.
- User correction for ambiguous identifiers.
- Multilingual support when the selected models allow it.

If the transcript could identify multiple records, ask a clarifying question rather than guessing.

### Speech-to-text fallback

Configure model, endpoint and request timeout through the STT adapter.

If realtime streaming fails, fall back to a supported non-streaming transcription path when possible. Clearly indicate that latency or interaction mode has changed.

Do not repeatedly submit the same completed audio to multiple STT providers without a defined need.

---

# PART F — TEXT-TO-SPEECH ARCHITECTURE

## 9. Choose the proper Bulbul integration

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/overview

https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/which-api-to-use

Evaluate the current Bulbul v4 Flash model for low-latency interactive speech, and Bulbul v3 where it remains appropriate or is necessary for compatibility.

Choose the transport based on the output requirement.

**REST:** Short responses or a complete audio file needed in one response.

**HTTP streaming:** Low-latency speech where audio should begin playing before the full response has been synthesized.

**WebSocket streaming:** Interactive voice sessions requiring a persistent connection and progressive audio delivery.

Verify the available model, voice roster, language codes, codecs and transport options directly from current documentation.

### Required spoken-answer behaviour

- Speak the main finding first.
- Read financial amounts, units and dates clearly.
- Avoid reading long tables aloud.
- Speak short clarifying questions.
- Allow interruption and cancellation.
- Stop the old playback before starting an unrelated new response.
- Prevent duplicate or overlapping audio.
- Use available pronunciation dictionaries for difficult names and identifiers.
- Announce success only after the underlying action is verified.

Use deterministic text normalization for amounts, weights, timestamps and identifiers before speech synthesis.

Do not let speech preprocessing alter the actual numeric result shown to the user.

---

# PART G — DOCUMENT INTELLIGENCE AND LANGUAGE TOOLS

## 10. Sarvam Vision Digitise and Extract

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/overview

Use Sarvam Vision Document Intelligence for supported document workflows.

### Digitise

Use document digitisation for:

- Full-document OCR.
- Reading-order reconstruction.
- Table extraction.
- Layout-preserving text capture.
- Searchable document content.
- Evidence and page indexing.
- Approved document-retrieval pipelines.

### Extract

Use schema-based extraction for specific fields such as:

- Purchase order number.
- Supplier and project identifiers.
- Invoice details.
- Shipment and cargo reference.
- Vessel and port information.
- Material code and description.
- Quantity, unit and weight.
- Unit price and currency.
- Document dates and expiry dates.
- Total value, when explicitly present.
- Inspection results and certificate details.

Define a distinct extraction schema for each document type.

### Document validation

For every extracted document:

1. Preserve the original file under the existing security policy.
2. Record file identity and hash where useful.
3. Record processing job status.
4. Retain page-level or field-level source references where available.
5. Validate schema and types.
6. Normalize units and currencies carefully.
7. Reconcile arithmetic using deterministic code.
8. Compare the result with linked authorized records.
9. Flag inconsistent or missing values.
10. Require human review when an error could materially affect a decision.

Never assume an extracted field is correct merely because an AI tool returned it.

Handle file size, page limits, supported formats, job lifecycle and retry behaviour according to current documentation.

## 11. Translation, transliteration, identification and analytics

Use the relevant Sarvam capability for each specific task.

**Language identification:** Determine the language and script when uncertain.

**Text translation:** Use the currently supported Mayura or Sarvam Translate model based on target-language coverage, style requirements and available capabilities.

**Transliteration:** Convert scripts while preserving pronunciation and identity.

**Text analytics:** Perform supported analysis over provided text, such as classification or typed analysis, as defined by the current API.

For business and legal documents, preserve source text and extracted business identifiers, and make translation limitations visible.

Do not rely on translated language alone to approve a transaction or resolve a disputed financial value.

## 12. Whole-document translation

Official documentation:

https://docs.sarvam.ai/api/api-guides-tutorials/doc-translation/overview

Use the supported Document Translation API for eligible full-file translation.

The API workflow may be asynchronous. Follow its documented job creation, file upload, execution, status and export steps.

Preserve the original file, translated file, source language, target languages and translation status.

The MCP `sarvam_translate` tool is for text translation; do not assume it translates an entire PDF or Office document with layout preservation.

---

# PART H — NASS CONTROL TOWER BUSINESS TOOLS

## 13. Application tool registry

Sarvam-105B must not execute arbitrary SQL or generate direct backend URLs.

Create a controlled registry of typed and documented application tools. Each tool must map to an existing authorized business service or a specifically implemented endpoint.

Required logical capabilities include:

- Search projects.
- Retrieve project details and status.
- Search suppliers and retrieve supplier details.
- Retrieve project materials and requirements.
- Search shipment records.
- Retrieve shipment details and status history.
- Retrieve vessel and port intelligence.
- Retrieve authorized purchase orders and line items.
- Retrieve authorized material costs and recorded shipment values.
- Retrieve inventory and stock movements.
- Retrieve quality and inspection records.
- Search and retrieve approved documents.
- Retrieve live news records and cited sources.
- Retrieve source connector health and freshness.
- Calculate validated totals.
- Generate an authorized report.
- Retrieve report-job status and provide a secure download.
- Navigate to a validated application route.
- Retrieve export history.

These are logical capabilities. Inspect the real repository before creating any new endpoints.

### Tool contracts

For every tool, define:

- Name and purpose.
- Input JSON Schema.
- Output JSON Schema.
- Allowed roles.
- Entity scope.
- Validation rules.
- Timeout and retry policy.
- Idempotency requirements.
- Audit behaviour.
- Error codes.
- Source provenance.
- Whether human confirmation is required.

Never accept arbitrary SQL, unsanitized URLs or model-generated executable code as a backend operation.

Validate the function arguments, record IDs, filters and permissions server-side before execution.

Use Sarvam-105B tool calling to request approved capabilities; use application code to execute and validate them. Return the tool output to the model before asking it to generate the final answer.

---

# PART I — GLOBAL NEWS AND LIVE EXTERNAL DATA

## 14. External news connector

Sarvam is not itself the complete source of current global news. Use a separate connected web-search, news, RSS or official-data provider.

Evaluate providers based on:

- API access.
- Publication timestamp availability.
- Search coverage.
- Geographic coverage.
- Language coverage.
- Update latency.
- Evidence URLs.
- Rate limits and cost.
- Licensing and permitted retention.

Support two views:

1. **Global Today Briefing**, with a clearly stated reporting period and timezone.
2. **NASS Intelligence Briefing**, focusing on news relevant to NASS, Bahrain, the GCC, infrastructure, construction, marine aggregates, ports, vessel disruption, shipping, materials, suppliers, tenders, energy and procurement risk.

Every item must preserve its source, publication time, retrieval time, geography, topic, evidence quality and verification status.

Distinguish the time of publication from the time the event occurred.

Do not present old articles republished today as new events. Do not claim that a search covered every news source worldwide.

Use Sarvam-105B to retrieve information through the approved tools, reconcile source evidence and explain operational relevance. It must not invent headlines or claim a live search occurred when the connector failed.

## 15. Live maritime connector

Evaluate and connect an appropriate licensed or authorized maritime data feed, such as AISstream, VesselFinder, AISHub or another suitable provider.

Potential starting points:

- https://aisstream.io/
- https://api.vesselfinder.com/docs/
- https://www.aishub.net/api

Verify the selected provider's coverage, API terms, update intervals and current features before implementation.

Where available, ingest vessel IDs, positions, vessel type, speed, course, reported destination, ETA, draught and port calls.

Never assume AIS proves NASS ownership, actual shipment cargo, precise weight or commercial value.

Link a vessel to a NASS operation only when credible evidence supports that association.

---

# PART J — EVIDENCE, DATA QUALITY AND LIVE UPDATES

## 16. Source classification and provenance

Every business record and external claim must be classified.

Use values equivalent to:

- `OFFICIAL_PUBLIC`
- `LIVE_EXTERNAL`
- `COMPANY_INTERNAL`
- `AUTHORIZED_IMPORT`
- `ESTIMATE`
- `SYNTHETIC_DEMO`

Retain suitable metadata, adapting to the current schema:

- Source system.
- Source URL or file reference.
- Source record ID.
- Event or publication timestamp.
- Retrieval timestamp.
- Last successful sync.
- Verification status.
- Record version.
- Evidence reference.
- Demo indicator.
- Relevant extraction or calculation metadata.

Keep public NASS information separate from private internal operational data.

Do not describe the public project list as NASS's complete project register unless the authorized source actually establishes completeness.

Do not convert a vessel capacity into an actual cargo load or a tender into proof of project completion.

## 17. Scheduled ingestion and reconciliation

Use a suitable connector and scheduler per source.

- Stream events where the provider supports streaming.
- Use webhooks where available.
- Poll according to documented limits.
- Refresh static public sources on a configurable schedule.
- Import internal operational records through authorized APIs, views or approved files.
- Track missed updates and provider failures.

For each connector, expose:

- Last successful sync.
- Last attempted sync.
- Next scheduled sync if configured.
- New, updated, duplicate and rejected record counts.
- Error status.
- Current data freshness.
- Coverage limitations.

Preserve source snapshots or references and record changes over time. Do not overwrite historical evidence in a way that prevents reconciliation.

Use stable IDs and defined deduplication rules. Handle out-of-order events, late updates, retries and provider corrections safely.

## 18. Demo data controls

Use explicitly synthetic records when real data is unavailable.

For example, a test cargo weight, unit price or shipment amount can be generated to test tables, calculations and report rendering.

Every dummy record must carry a clear demo marker. Keep demo records segregated or filtered so they cannot contaminate real dashboards, financial totals, executive reports or production exports.

Never attach fictional vessel identifiers to real vessel tracks or fabricate evidence links.

When real records become available, import and reconcile them through an authorized workflow.

---

# PART K — REPORTS, DOCUMENT CREATION AND PDF OUTPUT

## 19. Report-generation architecture

Use the existing application report service wherever possible.

Create a typed report job with:

- Report type.
- Selected entities.
- Filters.
- Date range.
- User identity and permission context.
- Data source references.
- Calculation results.
- Output format.
- Job status.
- File reference.
- Created and completed timestamps.
- Validation outcome.

Support reports for:

- Project intelligence.
- Vessel and port information.
- Shipment and material registers.
- Purchase orders.
- Supplier comparisons.
- Inventory and stock movement.
- Quality and inspection.
- Tender and procurement intelligence.
- Global news and NASS risk briefing.
- Connector freshness.
- CEO executive reporting.
- Selected documents and their extracted fields.

Use existing file-generation libraries or services to create PDF, DOCX, XLSX, CSV, HTML or JSON where supported and necessary.

Sarvam Document Intelligence extracts content; it is not a substitute for the report-generation engine.

### Report workflow

1. Interpret the request with Sarvam-105B.
2. Resolve entity IDs and filters.
3. Validate the requested report schema.
4. Check permissions.
5. Retrieve authoritative records.
6. Validate relationships and freshness.
7. Compute totals using backend business logic.
8. Compile source references and evidence.
9. Create the requested file.
10. Validate file existence and content.
11. Store the file under the appropriate retention policy.
12. Verify authorized download access.
13. Return the true job status.
14. Present a download control and concise spoken confirmation.

Never say the report is ready before the output has been created and validated.

---

# PART L — HANDS-FREE VOICE AND CONVERSATIONAL ORCHESTRATION

## 20. Voice interaction flow

Implement the following workflow:

1. The user speaks through the permitted browser microphone.
2. Sarvam STT converts the audio to text.
3. The voice session manager confirms the utterance is complete.
4. The application loads the authorized conversation context.
5. Sarvam-105B interprets the question and identifies required tools.
6. The application validates and executes authorized tools.
7. External source results and internal records are assembled.
8. Deterministic calculations and evidence checks run.
9. Sarvam-105B produces the final grounded answer.
10. Sarvam TTS generates spoken output using the configured low-latency transport.
11. The UI displays the result, evidence and any relevant actions or download links.

Do not execute state-changing operations directly from an unvalidated transcript or free-form model response.

## 21. Follow-up questions and navigation

Support natural commands such as:

- "Open the Control Tower."
- "Show the incoming shipments."
- "Open that shipment."
- "Which project is it linked to?"
- "Show its purchase order."
- "Read the weight from the source document."
- "Compare those two invoices."
- "What is today's latest shipping news?"
- "Show me the evidence."
- "Generate a PDF from these records."
- "Download the report."
- "Stop speaking."
- "Pause listening."
- "Resume listening."
- "Cancel that request."

Maintain application context for the selected project, shipment, PO, material, supplier, filters, date range, source references and pending report job.

Resolve follow-ups against the actual current context. Ask a concise clarification when several records could match.

Use a validated route registry integrated with the current application router.

The model must not produce arbitrary URLs or JavaScript to control the website.

Verify navigation before speaking the confirmation.

## 22. Browser permissions and interruption

The browser must obtain the required microphone permissions from the user. It cannot silently grant its own permission.

Use HTTPS, supported media APIs and appropriate user interaction for initial microphone and audio setup.

After the user enables hands-free mode, ordinary queries should not require repeated clicks while the browser remains active and permits listening.

Handle permission revocation, device loss, browser suspension, network failure and interrupted audio.

Do not claim uninterrupted background listening on a phone or browser that can suspend the application.

Implement explicit voice-session states, including:

- `IDLE`
- `REQUESTING_PERMISSION`
- `LISTENING`
- `TRANSCRIBING`
- `INTERPRETING`
- `FETCHING_DATA`
- `EXECUTING_TOOL`
- `NAVIGATING`
- `GENERATING_REPORT`
- `SPEAKING`
- `INTERRUPTED`
- `PAUSED`
- `RECOVERING`
- `ERROR`

Every state must have defined transitions, recovery rules and cancellation behaviour.

---

# PART M — SECURITY AND CONTROLLED EXECUTION

## 23. Security requirements

- Keep all provider keys server-side.
- Never expose credentials in browser bundles, source maps or logs.
- Enforce record-level and role-level authorization.
- Validate every backend function argument.
- Apply access checks during retrieval, calculation, document search, report generation and file download.
- Treat uploaded documents, transcripts, web pages and model outputs as untrusted.
- Prevent prompt injection in external source content from changing system instructions.
- Limit the MCP client to approved tools and operations.
- Keep an audit record of important tool executions.
- Use idempotency keys for operations that could create duplicate output or modify data.
- Require the established confirmation and approval process for sensitive or consequential actions.
- Follow appropriate data retention rules for audio, documents, transcripts and generated files.
- Do not expose private NASS financial data to a fallback provider without explicit approval.

Never use voice or tool calling as a way to bypass business approvals.

---

# PART N — EVALUATION AND FALLBACK DESIGN

## 24. Build a real model-evaluation suite

Before finalizing the fallback sequence, test models on a representative NASS Control Tower dataset and actual user queries.

Evaluate:

- Tool-selection accuracy.
- Validity of generated tool arguments.
- Ability to handle missing data.
- Correct record disambiguation.
- Multi-document reasoning.
- Evidence attribution.
- Numeric and unit reasoning.
- Structured output compliance.
- Response latency.
- Operational cost.
- Stability under timeout or overload.
- Behaviour under malicious or conflicting document instructions.

Use a fixed test corpus of authorized or synthetic cases.

For fallback models, verify the same business scenario against the primary model's validated expectations. Do not treat more fluent language as proof of greater factual accuracy.

### Fallback policy

A fallback can be triggered by:

- Model timeout.
- Model overload.
- Temporary service unavailability.
- Unsupported capability.
- Repeated malformed structured output.

Do not use model fallback to bypass authorization, correct missing company data, or make an unverified answer appear definitive.

For data retrieval failures, retry the connector or report the data limitation. Do not ask another reasoning model to invent the missing record.

For irreversible actions, require an idempotency key and normal authorization checks before any retry.

---

# PART O — IMPLEMENTATION PHASES

## 25. Required implementation order

### Phase 1: Current architecture and Sarvam capability audit

- Inspect the existing repository.
- Discover the actual Sarvam MCP tools and schemas.
- Confirm current API endpoints and model access.
- Identify existing functionality to reuse.
- List the current architecture gaps and integration requirements.

### Phase 2: Sarvam model routing and tool orchestration

- Implement Sarvam-105B as the primary reasoning core.
- Implement the capability-aware model router.
- Add the approved fallback configuration.
- Integrate tool calling and structured outputs.
- Connect the application tool registry to authorized backend services.
- Implement result validation and evidence assembly.

### Phase 3: Voice and language stack

- Integrate speech-to-text.
- Integrate streaming text-to-speech.
- Implement the voice state machine.
- Add hands-free mode and interruption.
- Connect navigation to actual frontend routes.
- Validate on supported desktop and mobile browsers.

### Phase 4: NASS data and document intelligence

- Connect current public NASS sources.
- Connect authorized internal sources where credentials and access exist.
- Build document digitisation and structured extraction.
- Add data provenance and reconciliation.
- Keep demo records segregated.

### Phase 5: Live news and maritime intelligence

- Integrate an actual external search/news provider.
- Integrate a selected maritime/AIS source.
- Build ingestion, freshness and evidence metadata.
- Add the NASS and global briefing views.
- Test source unavailability and update recovery.

### Phase 6: Report and export service

- Reuse or implement the appropriate generation service.
- Add report-job tracking and secure download.
- Validate PDF and spreadsheet content.
- Add source and timestamp information to relevant reports.

### Phase 7: Security, testing and production readiness

- Test permissions and provider boundaries.
- Test model fallbacks.
- Test tool calls and calculations.
- Test document parsing and reports.
- Test duplicate prevention and ingestion recovery.
- Run existing regression suites.
- Document actual test outcomes and remaining limitations.

Do not mark a phase complete until its relevant tests have run.

---

# PART P — REQUIRED ACCEPTANCE TESTS

## 26. Sarvam architecture tests

1. Confirm Sarvam-105B is the primary reasoning model in runtime configuration.
2. Confirm the correct supported endpoint is used.
3. Confirm that its tool arguments pass schema validation.
4. Confirm the conversational model is used only for an approved conversational workload.
5. Confirm the alternative model endpoint is accessible before enabling fallback.
6. Confirm a fallback cannot execute unapproved tools.
7. Confirm deprecated models are not selected accidentally.
8. Confirm routing and fallback decisions are logged appropriately.

## 27. Specialist tool tests

9. Transcribe supported test audio.
10. Verify the configured STT model and input format.
11. Generate spoken output with the configured TTS model.
12. Test interruption and audio recovery.
13. Identify the language of a supported text.
14. Translate a test phrase using the correct translation tool.
15. Transcribe a supported document with Document Intelligence.
16. Extract a PO schema and validate the output.
17. Test document translation through the proper document workflow.
18. Confirm unsupported file types and parameters return useful errors.

## 28. Control Tower tests

19. Retrieve an authorized project record.
20. Retrieve an authorized shipment and linked purchase order.
21. Resolve a multi-turn follow-up correctly.
22. Calculate totals from valid backend records.
23. Reject or flag inconsistent weights and financial totals.
24. Navigate to a real existing route.
25. Generate a report from authorized data.
26. Validate the created file and download permissions.

## 29. Live-source tests

27. Retrieve a record from an actual connected external source.
28. Display source and last-update timestamps.
29. Demonstrate that public project information is not mistaken for an internal shipment manifest.
30. Confirm vessel data does not automatically populate verified cargo weight.
31. Retrieve real external news and display source URLs and publication dates.
32. Test stale feeds, duplicate events and unavailable providers.

## 30. Security and resilience tests

33. Confirm API keys are never exposed to the browser.
34. Confirm unauthorized data retrieval is blocked.
35. Confirm that external documents cannot override system instructions.
36. Verify that network retries do not create duplicate state changes or report jobs.
37. Test microphone revocation and browser suspension.
38. Test failed report generation.
39. Test connector recovery and failed imports.
40. Verify the existing theme and main features remain intact.

---

# PART Q — DEFINITION OF DONE

## 31. Completion conditions

The implementation is complete only when testing proves that:

- Sarvam-105B is the configured primary reasoning engine.
- Model routing and eligible fallbacks operate through a defined policy.
- All relevant connected Sarvam MCP tools have been discovered, documented and tested.
- Specialist STT, TTS, translation and document tools are selected appropriately.
- The application uses authorized backend tools for NASS business data.
- Current news and maritime feeds have actual providers rather than model-generated placeholders.
- Documents and extracted values retain their source references.
- Calculations are verified by deterministic business logic.
- Generated PDF or spreadsheet files are validated and securely downloadable.
- Voice navigation and follow-up context work on supported browsers.
- API keys, access controls and audit requirements are enforced.
- Data freshness, errors and integration status are visible.
- Existing business workflows and website styling remain intact.
- Tests and limitations are documented.

Provide a final engineering report describing:

1. Actual architecture changes.
2. Files and modules implemented.
3. Sarvam MCP tools discovered and enabled.
4. Models enabled and their routing order.
5. Current model and API versions verified.
6. Connected NASS and external data sources.
7. Report and document functionality tested.
8. Test commands and results.
9. Permissions, subscriptions, licenses or credentials still required.
10. Known issues and production-readiness blockers.

## Final directive

**Sarvam-105B must be the primary reasoning engine, not simply another optional model.** Specialist Sarvam models and tools must support it through a controlled architecture: Saaras for speech recognition, Bulbul for speech synthesis, Vision for document digitisation and extraction, the appropriate translation and language tools for language tasks, and a tested model router for eligible alternatives.

The existing NASS backend remains authoritative for private operational data and business calculations. External connectors supply the live information that Sarvam itself does not provide. Reports must be generated by a validated document service, not improvised by the LLM.

Build the solution in a modular, secure, testable way. Verify every integration against the actual API contract. Do not invent unavailable models, undocumented parameters, live records, evidence, capabilities or completed actions.