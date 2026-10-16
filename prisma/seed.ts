/**
 * Seed: NASS Closed-Loop Supply Chain Intelligence
 * Seeds every scenario required by the skill spec (upload/K.md):
 *  - Workflow A: BOL missing/conflicting container number
 *  - Workflow B: import ETA slip threatening material availability
 *  - Workflow C: receiving mismatch / shortage
 *  - Workflow D: asset fault + spare-parts dependency
 *  - Workflow E: supplier commitment breach
 *  - All closed-loop case states, all freshness classes, vessel≠container rule,
 *    ETA provenance, BOL versioning, idempotency/dedupe, audit trail.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const NOW = Date.now();
const min = (n: number) => new Date(NOW - n * 60_000);
const hr = (n: number) => new Date(NOW - n * 3_600_000);
const day = (n: number) => new Date(NOW - n * 86_400_000);
const inDays = (n: number) => new Date(NOW + n * 86_400_000);
const inHours = (n: number) => new Date(NOW + n * 3_600_000);
const J = (o: unknown) => JSON.stringify(o);

async function main() {
  console.log("Seeding NASS Closed-Loop Supply Chain Intelligence…");
  await db.auditEvent.deleteMany();
  await db.notification.deleteMany();
  await db.approval.deleteMany();
  await db.actionCommand.deleteMany();
  await db.caseEvent.deleteMany();
  await db.exceptionCase.deleteMany();
  await db.riskSignal.deleteMany();
  await db.supplierScoreSnapshot.deleteMany();
  await db.sourceEvidence.deleteMany();
  await db.maintenanceWorkOrder.deleteMany();
  await db.inspection.deleteMany();
  await db.telemetryObservation.deleteMany();
  await db.asset.deleteMany();
  await db.goodsReceipt.deleteMany();
  await db.inventoryLot.deleteMany();
  await db.materialRequirement.deleteMany();
  await db.warehouse.deleteMany();
  await db.etaObservation.deleteMany();
  await db.milestone.deleteMany();
  await db.shippingDocument.deleteMany();
  await db.container.deleteMany();
  await db.bOLReconciliation.deleteMany();
  await db.bOLField.deleteMany();
  await db.billOfLading.deleteMany();
  await db.shipmentLeg.deleteMany();
  await db.shipment.deleteMany();
  await db.quote.deleteMany();
  await db.rFQ.deleteMany();
  await db.pRLine.deleteMany();
  await db.purchaseRequest.deleteMany();
  await db.pOLine.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.contract.deleteMany();
  await db.connector.deleteMany();
  await db.material.deleteMany();
  await db.project.deleteMany();
  await db.legalEntity.deleteMany();
  await db.supplier.deleteMany();

  // ── Legal entities (8.1 #1) ──────────────────────────────────────────────
  const le1 = await db.legalEntity.create({ data: { code: "NASS-CON", name: "NASS Contracting LLC", country: "AE", role: "Main contracting operating unit" } });
  const le2 = await db.legalEntity.create({ data: { code: "NASS-IND", name: "NASS Industrial Division", country: "AE", role: "Industrial services & maintenance unit" } });

  // ── Projects / Sites (8.1 #2) ────────────────────────────────────────────
  const prj1 = await db.project.create({ data: { code: "PRJ-2201", name: "Marina Tower — Structure & Fit-out", site: "Dubai Waterfront, Plot MW-4", legalEntityId: le1.id, workPackage: "Structural + MEP", costCode: "CC-7781", status: "ACTIVE" } });
  const prj2 = await db.project.create({ data: { code: "PRJ-2204", name: "Industrial Zone Phase 2 — Utilities", site: "Sharjah Industrial Area 12", legalEntityId: le2.id, workPackage: "Utilities & Power", costCode: "CC-8120", status: "ACTIVE" } });
  const prj3 = await db.project.create({ data: { code: "PRJ-2210", name: "Airport Expansion — Airside Substation", site: "Abu Dhabi Airside North", legalEntityId: le1.id, workPackage: "Electrical Infrastructure", costCode: "CC-9044", status: "ACTIVE" } });

  // ── Suppliers (8.1 #3) ───────────────────────────────────────────────────
  const supAtlas = await db.supplier.create({ data: { code: "SUP-001", name: "Atlas Steel Trading LLC", aliases: J(["Atlas Steel", "Atlas Steel FZE"]), country: "AE", city: "Dubai", status: "APPROVED", categories: J(["Rebar", "Structural steel"]), incoterms: "CIF Jebel Ali", leadTimeDays: 21, paymentTerms: "Net 45", certifications: J([{ name: "ISO 9001", expiresAt: inDays(320).toISOString() }, { name: "Bureau Veritas Mill Cert", expiresAt: inDays(150).toISOString() }]), contacts: J([{ name: "Omar Haddad", role: "Sales Manager", email: "omar@atlassteel.example" }]), evidenceLabel: "PROPOSED TARGET CAPABILITY" } });
  const supRhein = await db.supplier.create({ data: { code: "SUP-002", name: "Rheinwerk Kälte- und Klimatechnik GmbH", aliases: J(["Rheinwerk", "Rheinwerk GmbH"]), country: "DE", city: "Hamburg", status: "APPROVED", categories: J(["HVAC", "Chillers"]), incoterms: "CIF Jebel Ali", leadTimeDays: 75, paymentTerms: "LC 60 days", certifications: J([{ name: "ISO 9001", expiresAt: inDays(600).toISOString() }, { name: "CE / PED", expiresAt: inDays(410).toISOString() }]), contacts: J([{ name: "K. Brandt", role: "Export Desk", email: "export@rheinwerk.example" }]), evidenceLabel: "PROPOSED TARGET CAPABILITY" } });
  const supPac = await db.supplier.create({ data: { code: "SUP-003", name: "Pacific Marine Components Co. Ltd", aliases: J(["PMC Components", "Pacific Marine"]), country: "CN", city: "Ningbo", status: "APPROVED", categories: J(["Transformers", "Electrical"]), incoterms: "FOB Ningbo", leadTimeDays: 60, paymentTerms: "LC at sight", certifications: J([{ name: "KEMA Type Test", expiresAt: inDays(220).toISOString() }]), contacts: J([{ name: "L. Chen", role: "Export Sales", email: "lchen@pmc.example" }]), evidenceLabel: "PROPOSED TARGET CAPABILITY" } });
  const supGulf = await db.supplier.create({ data: { code: "SUP-004", name: "Gulf Cement & Buildmat Trading", aliases: J(["Gulf Buildmat"]), country: "AE", city: "Sharjah", status: "APPROVED", categories: J(["Cement", "Building materials"]), incoterms: "DAP Site", leadTimeDays: 7, paymentTerms: "Net 30", certifications: J([{ name: "ESMA Conformity", expiresAt: inDays(90).toISOString() }]), contacts: J([{ name: "R. Farouk", role: "Key Accounts", email: "rf@gulfbuildmat.example" }]), evidenceLabel: "PROPOSED TARGET CAPABILITY" } });
  const supNord = await db.supplier.create({ data: { code: "SUP-005", name: "NordPump Systems AB", aliases: J(["NordPump"]), country: "SE", city: "Gothenburg", status: "APPROVED", categories: J(["Pumps", "Spares"]), incoterms: "CIF Jebel Ali", leadTimeDays: 45, paymentTerms: "Net 60", certifications: J([{ name: "ISO 14001", expiresAt: inDays(500).toISOString() }]), contacts: J([{ name: "A. Lindqvist", role: "Service", email: "service@nordpump.example" }]), evidenceLabel: "PROPOSED TARGET CAPABILITY" } });
  const supMeridian = await db.supplier.create({ data: { code: "SUP-006", name: "Meridian Electrical Industries A.Ş.", aliases: J(["Meridian Electric"]), country: "TR", city: "Izmir", status: "PENDING", categories: J(["Switchgear"]), incoterms: "CIF Mersin", leadTimeDays: 55, paymentTerms: "Advance 30%", certifications: J([]), contacts: J([{ name: "E. Yilmaz", role: "Sales", email: "ey@meridian.example" }]), evidenceLabel: "REQUIRES CUSTOMER DATA/INTEGRATION" } });
  const supCoastal = await db.supplier.create({ data: { code: "SUP-007", name: "Coastal Logistics Freight Forwarders", aliases: J(["Coastal Logistics", "CLFF"]), country: "AE", city: "Jebel Ali", status: "APPROVED", categories: J(["Freight forwarding", "Customs brokerage"]), incoterms: null, leadTimeDays: null, paymentTerms: "Net 30", certifications: J([]), contacts: J([{ name: "D. Mwangi", role: "Ops Coordinator", email: "ops@clff.example" }]), evidenceLabel: "REQUIRES CUSTOMER DATA/INTEGRATION" } });

  // ── Materials (8.1 #4) ───────────────────────────────────────────────────
  const mRebar = await db.material.create({ data: { sku: "MAT-REB-16", name: "Rebar B500B Ø16 mm", description: "Deformed reinforcing steel bar, grade B500B, 12 m lengths", uom: "tonne", category: "Steel", criticality: "HIGH", mpn: "B500B-16", aliases: J(["rebar 16", "B500B-16mm"]) } });
  const mChiller = await db.material.create({ data: { sku: "MAT-CHL-800", name: "Water-cooled chiller 800 kW", description: "Screw chiller 800 kW cooling capacity, 415V/50Hz", uom: "unit", category: "HVAC", criticality: "CRITICAL", mpn: "RW-CH800-XL", storageConditions: "Covered, anti-vibration pads" } });
  const mSwg = await db.material.create({ data: { sku: "MAT-SWG-11", name: "Switchgear panel 11 kV", description: "MV switchgear panel, 11 kV, 1250 A, IEC 62271", uom: "unit", category: "Electrical", criticality: "CRITICAL", mpn: "SWG-11-1250" } });
  const mTrf = await db.material.create({ data: { sku: "MAT-TRF-2", name: "Transformer 2000 kVA", description: "Oil-immersed distribution transformer 11/0.4 kV 2000 kVA", uom: "unit", category: "Electrical", criticality: "CRITICAL", mpn: "TRF-2000-11/04" } });
  const mPump = await db.material.create({ data: { sku: "MAT-PMP-45", name: "Centrifugal pump 45 kW", description: "End-suction centrifugal pump 45 kW, cast iron", uom: "unit", category: "Rotating equipment", criticality: "HIGH", mpn: "NP-ES45-250" } });
  const mCement = await db.material.create({ data: { sku: "MAT-CEM-OPC", name: "OPC cement 50 kg bag", uom: "bag", category: "Building materials", criticality: "STANDARD", mpn: "OPC-50" } });
  const mCable = await db.material.create({ data: { sku: "MAT-CAB-LSF", name: "LSZH cable 4×25 mm²", description: "Low smoke zero halogen power cable", uom: "drum", category: "Electrical", criticality: "STANDARD", mpn: "LSZH-4x25" } });
  const mSealKit = await db.material.create({ data: { sku: "MAT-SEAL-K", name: "Pump mechanical seal kit", description: "Spare seal kit for NP-ES45 series pumps", uom: "kit", category: "Spares", criticality: "HIGH", mpn: "NP-SK-45" } });

  // ── Purchase requests — every PR state (13.1) ───────────────────────────
  const prData: Array<{ ref: string; requester: string; status: string; project: string; priority: string; channel: string; reqDays: number | null; just: string; note?: string; dup?: string }> = [
    { ref: "PR-1001", requester: "Sana Iqbal (Site Eng., Marina)", status: "DRAFT", project: prj1.code, priority: "NORMAL", channel: "FORM", reqDays: 40, just: "Additional landing mats for hoisting zone." },
    { ref: "PR-1002", requester: "Faisal Rahman (MEP Lead)", status: "SUBMITTED", project: prj1.code, priority: "HIGH", channel: "FORM", reqDays: 30, just: "Cable drums for core lighting circuit, level 22–28." },
    { ref: "PR-1003", requester: "Warehouse, WH-DIP", status: "NEEDS_INFO", project: prj2.code, priority: "NORMAL", channel: "EMAIL", reqDays: 21, just: "Bolts and anchors (spec unclear).", note: "Returned for missing UOM and specification. Incomplete request must not silently create a PO (M05)." },
    { ref: "PR-1004", requester: "Noura Salem (Project Controls)", status: "PENDING_APPROVAL", project: prj3.code, priority: "HIGH", channel: "ERP", reqDays: 35, just: "Earthing materials for airside substation." },
    { ref: "PR-1005", requester: "Faisal Rahman (MEP Lead)", status: "APPROVED", project: prj1.code, priority: "NORMAL", channel: "FORM", reqDays: 25, just: "Replacement filters and actuators AHU spares." },
    { ref: "PR-1006", requester: "Procurement (Central)", status: "SOURCING", project: prj2.code, priority: "CRITICAL", channel: "FORM", reqDays: 60, just: "Replacement pumps for utilities building (4 × 45 kW)." },
    { ref: "PR-1007", requester: "Yusuf Karim (Structure Lead)", status: "ORDERED", project: prj1.code, priority: "CRITICAL", channel: "FORM", reqDays: 12, just: "Rebar for podium slab pour #7." },
    { ref: "PR-1008", requester: "Yusuf Karim (Structure Lead)", status: "PARTIALLY_FULFILLED", project: prj1.code, priority: "HIGH", channel: "ERP", reqDays: 18, just: "Steel I-beams HEA300 — first delivery received, balance pending." },
    { ref: "PR-1009", requester: "Warehouse WH-SHJ", status: "FULFILLED", project: prj2.code, priority: "NORMAL", channel: "FORM", reqDays: -5, just: "Cement restock Q1." },
    { ref: "PR-1010", requester: "Sana Iqbal (Site Eng., Marina)", status: "CANCELLED", project: prj1.code, priority: "LOW", channel: "FORM", reqDays: 20, just: "Superseded by design change DC-118.", },
    { ref: "PR-1011", requester: "Email intake (mailbox rules)", status: "SUBMITTED", project: prj1.code, priority: "CRITICAL", channel: "EMAIL", reqDays: 12, just: "Rebar podium slab pour #7 (duplicate intake — linked to PR-1007).", dup: "PR-1007" },
  ];
  const prIds: Record<string, string> = {};
  const prMap: Record<string, { ref: string }> = {};
  for (const p of prData) {
    const proj = await db.project.findUnique({ where: { code: p.project } });
    const created = await db.purchaseRequest.create({ data: { ref: p.ref, requester: p.requester, projectId: proj!.id, channel: p.channel, status: p.status, priority: p.priority, requiredOnSite: p.reqDays === null ? null : inDays(p.reqDays), justification: p.just, duplicateOfId: p.dup ?? null, sourceRef: p.channel === "EMAIL" ? `mailbox://procurement@nass.example/${p.ref}` : null } });
    prIds[p.ref] = created.id;
    prMap[p.ref] = { ref: p.ref };
  }
  const prLine = async (ref: string, m: { id: string; uom: string }, qty: number, note?: string) => db.pRLine.create({ data: { prId: prIds[ref], materialId: m.id, quantity: qty, uom: m.uom, note } });
  await prLine("PR-1001", mRebar, 8);
  await prLine("PR-1002", mCable, 14);
  await prLine("PR-1004", mCable, 9);
  await prLine("PR-1005", mCable, 2, "Spec clarification pending from MEP.");
  await prLine("PR-1006", mPump, 4);
  await prLine("PR-1007", mRebar, 120, "Podium slab pour #7 — critical path.");
  await prLine("PR-1008", mRebar, 45);
  await prLine("PR-1009", mCement, 1200);
  await prLine("PR-1011", mRebar, 120, "Duplicate of PR-1007 — detected by duplicate-intake rule v1.1.");

  // ── RFQ + quotes (M06: explain every rank; no autonomous award) ──────────
  const rfq1 = await db.rFQ.create({ data: { ref: "RFQ-2001", prId: prIds["PR-1006"], status: "RESPONDED", dueDate: inDays(-2), criteria: J(["Authorized/approved supplier", "Lead time ≤ 60 days", "CIF Jebel Ali", "Warranty 24 months"]) } });
  const q1 = await db.quote.create({ data: { rfqId: rfq1.id, supplierId: supNord.id, currency: "USD", unitPrice: 8450, leadTimeDays: 45, incoterms: "CIF Jebel Ali", validity: inDays(18), deviations: J([]), landedCost: 35220, rank: 1, recommendation: "Rank 1: approved supplier, shortest compliant lead time (45 d), full warranty, no deviations. Landed cost second-best but within 4% of lowest. Extraction confidence 0.97 — linked to quoted PDF page 2.", extractionConfidence: 0.97, status: "SHORTLISTED" } });
  await db.quote.create({ data: { rfqId: rfq1.id, supplierId: supMeridian.id, currency: "USD", unitPrice: 7980, leadTimeDays: 55, incoterms: "CIF Mersin", validity: inDays(12), deviations: J(["Warranty 12 months instead of 24", "Supplier status PENDING — compliance approval required"]), landedCost: 33400, rank: 2, recommendation: "Rank 2: lowest price but warranty deviation and supplier approval not completed. Award requires compliance sign-off.", extractionConfidence: 0.94, status: "RECEIVED" } });
  await db.quote.create({ data: { rfqId: rfq1.id, supplierId: supPac.id, currency: "USD", unitPrice: 9100, leadTimeDays: 62, incoterms: "FOB Ningbo", validity: inDays(25), deviations: J(["Lead time 62 d exceeds 60 d criterion", "FOB requires NASS to arrange freight"]), landedCost: 37100, rank: 3, recommendation: "Rank 3: lead time exceeds criterion and excludes freight; no technical advantage over Rank 1.", extractionConfidence: 0.96, status: "RECEIVED" } });

  // ── Purchase orders + lines (8.1 #7) ─────────────────────────────────────
  const po1 = await db.purchaseOrder.create({ data: { ref: "PO-3001", supplierId: supAtlas.id, projectId: prj1.id, legalEntityId: le1.id, status: "PARTIALLY_RECEIVED", currency: "AED", totalAmount: 528000, deliveryTerms: "DAP Site", deliveryLocation: "Marina Tower site store", promisedDate: inDays(6), createdAt: day(30) } });
  const po1l1 = await db.pOLine.create({ data: { poId: po1.id, materialId: mRebar.id, quantity: 120, uom: "tonne", unitPrice: 4400, promisedDate: inDays(6), receivedQty: 72, lineStatus: "PARTIAL" } });
  const po2 = await db.purchaseOrder.create({ data: { ref: "PO-3002", supplierId: supRhein.id, projectId: prj1.id, legalEntityId: le1.id, status: "OPEN", currency: "EUR", totalAmount: 196000, deliveryTerms: "CIF Jebel Ali", deliveryLocation: "Jebel Ali → Marina Tower", promisedDate: inDays(21), createdAt: day(58) } });
  const po2l1 = await db.pOLine.create({ data: { poId: po2.id, materialId: mChiller.id, quantity: 1, uom: "unit", unitPrice: 96000, promisedDate: inDays(21), lineStatus: "OPEN" } });
  await db.pOLine.create({ data: { poId: po2.id, materialId: mSwg.id, quantity: 2, uom: "unit", unitPrice: 50000, promisedDate: inDays(21), lineStatus: "OPEN" } });
  const po3 = await db.purchaseOrder.create({ data: { ref: "PO-3003", supplierId: supPac.id, projectId: prj3.id, legalEntityId: le1.id, status: "OPEN", currency: "USD", totalAmount: 87000, deliveryTerms: "FOB Ningbo", deliveryLocation: "Ningbo → Khalifa Port → PRJ-2210", promisedDate: inDays(16), createdAt: day(41) } });
  const po3l1 = await db.pOLine.create({ data: { poId: po3.id, materialId: mTrf.id, quantity: 2, uom: "unit", unitPrice: 43500, promisedDate: inDays(16), lineStatus: "OPEN" } });
  const po4 = await db.purchaseOrder.create({ data: { ref: "PO-3004", supplierId: supNord.id, projectId: prj2.id, legalEntityId: le2.id, status: "OPEN", currency: "USD", totalAmount: 169000, deliveryTerms: "CIF Jebel Ali", deliveryLocation: "WH-SHJ", promisedDate: inDays(9), createdAt: day(52) } });
  const po4l1 = await db.pOLine.create({ data: { poId: po4.id, materialId: mPump.id, quantity: 20, uom: "unit", unitPrice: 8450, promisedDate: inDays(9), receivedQty: 18, lineStatus: "PARTIAL" } });
  const po5 = await db.purchaseOrder.create({ data: { ref: "PO-3005", supplierId: supGulf.id, projectId: prj2.id, legalEntityId: le2.id, status: "CLOSED", currency: "AED", totalAmount: 96000, deliveryTerms: "DAP Site", deliveryLocation: "WH-SHJ", promisedDate: day(20), createdAt: day(50) } });
  const po5l1 = await db.pOLine.create({ data: { poId: po5.id, materialId: mCement.id, quantity: 1200, uom: "bag", unitPrice: 80, promisedDate: day(20), receivedQty: 1200, lineStatus: "RECEIVED" } });
  await db.purchaseOrder.create({ data: { ref: "PO-3006", supplierId: supMeridian.id, projectId: prj2.id, legalEntityId: le2.id, status: "OPEN", currency: "USD", totalAmount: 78200, deliveryTerms: "CIF Mersin", deliveryLocation: "Sharjah Industrial Area 12", promisedDate: inDays(55), createdAt: day(3), baselineRef: "PO-3006-BASE-v1" } });

  // ── Contracts (8.1 #8) — summaries are navigational, not legal advice ────
  await db.contract.create({ data: { ref: "CTR-4001", supplierId: supAtlas.id, poId: po1.id, title: "Framework Agreement — Reinforcement Steel 2026", version: 2, status: "ACTIVE", validFrom: day(120), validTo: inDays(240), obligations: J([{ type: "delivery", text: "Delivery within 21 calendar days of release order, CIF/ DAP per order line." }, { type: "penalty", text: "0.5% of delayed line value per week, capped at 5%." }, { type: "insurance", text: "Marine cargo insurance 110% CIF value per shipment." }, { type: "certification", text: "Mill certificate + BS 4449 conformity per batch." }]), summary: "Navigational summary extracted from signed contract v2 — authoritative source is the signed document in the contract repository.", approvedBy: "H. Al Mansoori (Legal)" } });
  await db.contract.create({ data: { ref: "CTR-4002", supplierId: supRhein.id, title: "Chiller Supply & Commissioning Terms", version: 1, status: "EXPIRING", validFrom: day(400), validTo: inDays(45), obligations: J([{ type: "delivery", text: "Ex-works Hamburg within 70 days of down payment." }, { type: "penalty", text: "€1,500 per week of delay beyond promised delivery." }]), summary: "Contract expires in 45 days — renewal decision required before new chiller commitments.", approvedBy: "H. Al Mansoori (Legal)" } });

  // ── Warehouses (8.1 #15) ─────────────────────────────────────────────────
  const whDip = await db.warehouse.create({ data: { code: "WH-DIP", name: "Dubai Industrial Park Central Store", site: "DIP, Dubai", warehouseType: "MAIN", bins: J(["A-01", "A-02", "B-01", "B-02", "Q-QUAR", "D-DMG"]) } });
  const whShj = await db.warehouse.create({ data: { code: "WH-SHJ", name: "Sharjah Central Store", site: "Industrial Area 12, Sharjah", warehouseType: "MAIN", bins: J(["C-01", "C-02", "Q-QUAR"]) } });
  const whMarina = await db.warehouse.create({ data: { code: "SS-MARINA", name: "Marina Tower Site Store", site: "Dubai Waterfront, Plot MW-4", warehouseType: "SITE_STORE", bins: J(["S-01", "S-02"]) } });

  // ── Shipments (8.1 #9–#14, M11) ──────────────────────────────────────────
  const shp1 = await db.shipment.create({ data: { ref: "SHP-8801", importFileRef: "IMP-7701", mode: "OCEAN", status: "IN_TRANSIT", carrier: "MSC", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Shanghai, CN", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(9), carrierEta: inDays(10), carrierEtaAt: hr(3), carrierEtaFreshness: "fresh", portScheduleEta: inDays(11), actualArrival: null, etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: inDays(10), displayEtaSource: "MSC ocean tracking API", displayEtaType: "carrier", vesselName: "MSC AURORA", vesselVoyage: "018W", vesselPositionLat: 12.44, vesselPositionLng: 62.18, vesselPositionAt: hr(4), vesselSource: "AIS feed (fresh)", vesselLinkEvidence: "Carrier booking BK-778211 — container-to-vessel assignment from carrier event EV-99120", freshness: "fresh", lastEventAt: hr(4), lastEventSource: "AIS feed", poId: po3.id, supplierId: supPac.id, projectId: prj3.id, created: day(24) } });
  const shp2 = await db.shipment.create({ data: { ref: "SHP-8802", importFileRef: "IMP-7702", mode: "OCEAN", status: "IN_TRANSIT", carrier: "CMA CGM", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Ningbo, CN", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(4), carrierEta: inDays(13), carrierEtaAt: hr(26), carrierEtaFreshness: "aging", portScheduleEta: inDays(14), modelPredictedEta: inDays(12), modelConfidence: 0.72, modelInputAsOf: hr(8), etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: inDays(13), displayEtaSource: "CMA CGM tracking API", displayEtaType: "carrier", vesselName: "CMA CGM LHAYNE", vesselVoyage: "094E", vesselPositionLat: 6.2, vesselPositionLng: 59.4, vesselPositionAt: hr(26), vesselSource: "AIS feed (aging)", vesselLinkEvidence: "Forwarder booking CN-55612 + carrier milestone LOADED (provider event CMA-88213)", freshness: "aging", lastEventAt: hr(26), lastEventSource: "carrier_api", poId: po2.id, supplierId: supRhein.id, projectId: prj1.id, created: day(31) } });
  const shp3 = await db.shipment.create({ data: { ref: "SHP-8803", importFileRef: "IMP-7703", mode: "OCEAN", status: "IN_TRANSIT", carrier: "Hapag-Lloyd", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Genoa, IT", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(6), carrierEta: inDays(8), carrierEtaAt: day(6), carrierEtaFreshness: "stale", portScheduleEta: null, etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: inDays(8), displayEtaSource: "Hapag-Lloyd API (last successful sync 6 d ago)", displayEtaType: "carrier", vesselName: "HL BREMEN", vesselVoyage: "221E", vesselPositionLat: null, vesselPositionLng: null, vesselPositionAt: null, vesselSource: null, vesselLinkEvidence: "Carrier booking HL-33190 (manifest)", freshness: "stale", lastEventAt: day(6), lastEventSource: "carrier_api", poId: po2.id, supplierId: supRhein.id, projectId: prj1.id, created: day(38) } });
  const shp4 = await db.shipment.create({ data: { ref: "SHP-8804", importFileRef: "IMP-7704", mode: "OCEAN", status: "AT_TRANSIT_POINT", carrier: "ONE", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Shanghai, CN", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(14), carrierEta: inDays(16), carrierEtaAt: hr(30), carrierEtaFreshness: "fresh", etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: inDays(16), displayEtaSource: "ONE tracking API", displayEtaType: "carrier", vesselName: "ONE COMMITMENT", vesselVoyage: "071N", vesselPositionLat: 6.9, vesselPositionLng: 79.8, vesselPositionAt: hr(5), vesselSource: "AIS feed (fresh) — vessel position only", vesselLinkEvidence: null, freshness: "fresh", lastEventAt: hr(5), lastEventSource: "ais", poId: po3.id, supplierId: supPac.id, projectId: prj3.id, created: day(20) } });
  const shp5 = await db.shipment.create({ data: { ref: "SHP-8805", importFileRef: "IMP-7705", mode: "OCEAN", status: "CUSTOMS_HOLD", carrier: "Hapag-Lloyd", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Gothenburg, SE", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(2), carrierEta: inDays(2), carrierEtaAt: day(2), carrierEtaFreshness: "fresh", etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: inDays(2), displayEtaSource: "Hapag-Lloyd API", displayEtaType: "carrier", vesselName: "HL BREMEN", vesselVoyage: "221E", freshness: "fresh", lastEventAt: day(1), lastEventSource: "broker_portal", customsStatus: "held (manually reported by broker — customs platform not connected)", poId: po4.id, supplierId: supNord.id, projectId: prj2.id, created: day(44) } });
  const shp6 = await db.shipment.create({ data: { ref: "SHP-8806", importFileRef: "IMP-7706", mode: "OCEAN", status: "PARTIALLY_DELIVERED", carrier: "MSC", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Antwerp, BE", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: day(3), carrierEta: day(3), carrierEtaAt: day(4), carrierEtaFreshness: "fresh", actualArrival: day(3), etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: day(3), displayEtaSource: "actual arrival (gate-in scan)", displayEtaType: "actual", freshness: "fresh", lastEventAt: day(2), lastEventSource: "warehouse_scan", poId: po4.id, supplierId: supNord.id, projectId: prj2.id, created: day(60) } });
  const shp7 = await db.shipment.create({ data: { ref: "SHP-8807", importFileRef: "IMP-7707", mode: "ROAD", status: "DELIVERED", carrier: "Gulf Road Transport", forwarder: null, originPort: "Fujairah Quarry", destinationPort: "WH-DIP", podCountry: "AE", supplierPromisedEta: day(6), carrierEta: day(6), carrierEtaAt: day(7), carrierEtaFreshness: "fresh", actualArrival: day(6), etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: day(6), displayEtaType: "actual", displayEtaSource: "gate scan", freshness: "fresh", lastEventAt: day(6), lastEventSource: "warehouse_scan", poId: po5.id, supplierId: supGulf.id, projectId: prj2.id, created: day(15) } });
  const shp8 = await db.shipment.create({ data: { ref: "SHP-8808", importFileRef: "IMP-7708", mode: "OCEAN", status: "BOOKED", carrier: "MSC", forwarder: "Coastal Logistics Freight Forwarders", originPort: "Izmir, TR", destinationPort: "Jebel Ali, AE", podCountry: "AE", supplierPromisedEta: inDays(48), carrierEta: null, carrierEtaFreshness: "unavailable", etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL", displayEta: null, displayEtaType: null, displayEtaSource: null, freshness: "unavailable", lastEventAt: day(2), lastEventSource: "forwarder_portal", poId: po2.id, supplierId: supMeridian.id, projectId: prj2.id, created: day(2) } });

  // Legs (multi-leg / transshipment support — M11)
  await db.shipmentLeg.create({ data: { shipmentId: shp4.id, seq: 1, mode: "OCEAN", fromPoint: "Shanghai, CN", toPoint: "Colombo, LK (transshipment)", status: "COMPLETED", carrier: "ONE" } });
  await db.shipmentLeg.create({ data: { shipmentId: shp4.id, seq: 2, mode: "OCEAN", fromPoint: "Colombo, LK", toPoint: "Jebel Ali, AE", status: "IN_TRANSIT", carrier: "ONE" } });
  await db.shipmentLeg.create({ data: { shipmentId: shp1.id, seq: 1, mode: "OCEAN", fromPoint: "Shanghai, CN", toPoint: "Jebel Ali, AE", status: "IN_TRANSIT", carrier: "MSC" } });

  // ── BOLs (8.1 #11, M09) with field provenance + versions + reconciliation ─
  // BOL-A: missing container number → Workflow A, case AWAITING_APPROVAL
  const bolA = await db.billOfLading.create({ data: { bolNo: "MSC-4471", docType: "MASTER", issuer: "MSC", version: 1, isActive: true, status: "NEEDS_REVIEW", issueDate: day(12), shipper: "Rheinwerk GmbH, Hamburg DE", consignee: "NASS Contracting LLC, Dubai AE", notifyParty: "Coastal Logistics FZE", vesselName: "CMA CGM LHAYNE", voyage: "094E", portOfReceipt: "Ningbo, CN", portOfLoading: "Ningbo, CN", portOfDischarge: "Jebel Ali, AE", finalDelivery: "Dubai Waterfront, AE", packageCount: 12, packageType: "CRATES", grossWeightKg: 21400, goodsDescription: "CHILLER + SWITCHGEAR PANELS (PO-3002)", freightTerms: "PREPAID", contentHash: "sha256:aa11…bol4471", fileName: "BOL_MSC-4471.pdf", matchStatus: "PARTIAL", shipmentId: shp2.id, poRefs: J(["PO-3002"]), createdAt: day(12) } });
  // BOL-B: container conflict with packing list → Workflow A conflict case
  const bolB = await db.billOfLading.create({ data: { bolNo: "PMC-2210", docType: "HOUSE", issuer: "PMC / Coastal Logistics", version: 1, isActive: true, status: "RECONCILIATION_FAILED", issueDate: day(9), shipper: "Pacific Marine Components Co. Ltd", consignee: "NASS Contracting LLC", notifyParty: "NASS Project Controls", vesselName: "ONE COMMITMENT", voyage: "071N", portOfLoading: "Shanghai, CN", portOfDischarge: "Jebel Ali, AE", packageCount: 2, packageType: "CRATES", grossWeightKg: 34800, goodsDescription: "TRANSFORMER 2000 KVA (2 UNITS) (PO-3003)", freightTerms: "COLLECT", contentHash: "sha256:bb22…bol2210", fileName: "HBL_PMC-2210.pdf", matchStatus: "MATCHED", shipmentId: shp4.id, poRefs: J(["PO-3003"]), createdAt: day(9) } });
  // BOL-C: healthy, verified — container resolved
  const bolC = await db.billOfLading.create({ data: { bolNo: "MSC-4472", docType: "MASTER", issuer: "MSC", version: 2, isActive: true, status: "VERIFIED", issueDate: day(16), shipper: "Pacific Marine Components Co. Ltd", consignee: "NASS Contracting LLC", notifyParty: "Coastal Logistics FZE", vesselName: "MSC AURORA", voyage: "018W", portOfLoading: "Shanghai, CN", portOfDischarge: "Jebel Ali, AE", packageCount: 2, packageType: "CRATES", grossWeightKg: 35100, goodsDescription: "TRANSFORMERS 2000 KVA (PO-3003)", freightTerms: "PREPAID", contentHash: "sha256:cc33…bol4472v2", fileName: "BOL_MSC-4472_v2.pdf", matchStatus: "MATCHED", shipmentId: shp1.id, poRefs: J(["PO-3003"]), amendmentIndicator: true, createdAt: day(14) } });
  // BOL-C v1: superseded
  const bolCv1 = await db.billOfLading.create({ data: { bolNo: "MSC-4472", docType: "MASTER", issuer: "MSC", version: 1, isActive: false, status: "SUPERSEDED", issueDate: day(18), shipper: "Pacific Marine Components Co. Ltd", consignee: "NASS Contracting LLC", vesselName: "MSC AURORA", voyage: "018W", portOfLoading: "Shanghai, CN", portOfDischarge: "Jebel Ali, AE", packageCount: 2, packageType: "CRATES", grossWeightKg: 34750, goodsDescription: "TRANSFORMERS 2000 KVA (PO-3003)", freightTerms: "PREPAID", contentHash: "sha256:cc33…bol4472v1", fileName: "BOL_MSC-4472_v1.pdf", matchStatus: "MATCHED", shipmentId: shp1.id, poRefs: J(["PO-3003"]), createdAt: day(18) } });
  await db.billOfLading.update({ where: { id: bolC.id }, data: { supersedesId: bolCv1.id } });
  // BOL-D: unmatched — no force-link (M09 acceptance test)
  const bolD = await db.billOfLading.create({ data: { bolNo: "ONEY-4490", docType: "MASTER", issuer: "Ocean Network Express", version: 1, isActive: true, status: "NEEDS_REVIEW", issueDate: day(5), shipper: "Unknown Shipper Ltd", consignee: "NASS Industrial Division", vesselName: "ONE HARBOUR", voyage: "088N", portOfLoading: "Jebel Ali, AE", portOfDischarge: "Muscat, OM", packageCount: 6, packageType: "PALLETS", goodsDescription: "GENERAL CARGO", freightTerms: "COLLECT", contentHash: "sha256:dd44…bol4490", fileName: "BOL_ONEY-4490.pdf", matchStatus: "UNMATCHED", poRefs: J([]), createdAt: day(5) } });
  // BOL-E: parsed, reconciliation NOT_CHECKED due to carrier outage
  const bolE = await db.billOfLading.create({ data: { bolNo: "HLC-4475", docType: "MASTER", issuer: "Hapag-Lloyd", version: 1, isActive: true, status: "PARSED", issueDate: day(8), shipper: "Rheinwerk GmbH", consignee: "NASS Contracting LLC", vesselName: "HL BREMEN", voyage: "221E", portOfLoading: "Genoa, IT", portOfDischarge: "Jebel Ali, AE", packageCount: 3, packageType: "CRATES", grossWeightKg: 12400, goodsDescription: "CHILLER PARTS (PO-3002 PARTIAL)", freightTerms: "PREPAID", contentHash: "sha256:ee55…bol4475", fileName: "BOL_HLC-4475.pdf", matchStatus: "MATCHED", shipmentId: shp3.id, poRefs: J(["PO-3002"]), createdAt: day(8) } });
  void bolD; void bolE;

  // BOL field-level extraction with page provenance (M08/M09)
  const bolField = (bolId: string, fieldName: string, raw: string | null, conf: number | null, page: number, norm?: string | null, val: string = "PASS", note?: string) => db.bOLField.create({ data: { bolId, fieldName, rawValue: raw, normalizedValue: norm ?? raw, sourcePage: page, sourceCoords: `x:${40 + page * 3},y:${120 + fieldName.length * 2},w:220,h:14`, extractionEngine: "ocr-layout-v3.2 + field-extract-v1.8", confidence: conf, validationStatus: val, validationNote: note } });
  await bolField(bolA.id, "bol_number", "MSC-4471", 0.99, 1);
  await bolField(bolA.id, "container_number", null, null, 1, null, "FAIL", "REQUIRED_FIELD_MISSING — no container number present on any page. Must never be fabricated from packing list or vessel AIS (M09 decision boundary).");
  await bolField(bolA.id, "vessel_voyage", "CMA CGM LHAYNE / 094E", 0.97, 1, "CMA CGM LHAYNE|094E");
  await bolField(bolA.id, "package_count", "12", 0.98, 2, "12");
  await bolField(bolA.id, "gross_weight_kg", "21.400 KG", 0.95, 2, "21400");
  await bolField(bolA.id, "consignee", "NASS Contracting LLC, Dubai, AE", 0.93, 1);
  await bolField(bolA.id, "po_reference", "PO-3002", 0.96, 2);
  await bolField(bolB.id, "container_number", "TEMU 991199-1", 0.91, 1, "TEMU9911991", "FAIL", "CONFLICT — packing list PL-8842 states TEMU9911911. Field-level conflict case created with both document references (M09 acceptance).");
  await bolField(bolB.id, "seal_number", "SL-88213", 0.88, 1, null, "WARN", "Seal digit partially legible — reviewer confirmation requested.");
  await bolField(bolB.id, "package_count", "2", 0.98, 1, "2");
  await bolField(bolC.id, "container_number", "MSCU 447199-3", 0.99, 1, "MSCU4471993");
  await bolField(bolC.id, "gross_weight_kg", "35.100 KG", 0.98, 2, "35100", "PASS", "Amended v2 — weight corrected from 34,750 (v1). Change approved per policy; v1 retained.");
  await bolField(bolC.id, "package_count", "2", 0.99, 2, "2");

  // BOL reconciliations (PASS/WARN/FAIL/NOT_CHECKED + rule version)
  const bolRec = (bolId: string, ruleCode: string, result: string, compared: object, diff: object | null, next?: string, checkedDays?: number) => db.bOLReconciliation.create({ data: { bolId, ruleCode, ruleVersion: "v1.2", result, recordsCompared: J(compared), differences: diff ? J(diff) : null, nextAction: next ?? null, checkedAt: checkedDays === undefined ? null : day(checkedDays) } });
  await bolRec(bolA.id, "REQ_CONTAINER_NUMBER", "FAIL", { bol: "MSC-4471", rule: "container number required for ocean master BOL" }, { container_number: "MISSING" }, "Discrepancy case EX-9006 — request clarification from supplier/forwarder (human-approved).", 11);
  await bolRec(bolA.id, "BOL_PO_QUANTITY", "WARN", { bolPackages: 12, packingList: 12, poLines: 3 }, { note: "Package count matches packing list; unit-level quantities cannot reconcile until container ID known." }, "Proceed after container number resolved.", 11);
  await bolRec(bolA.id, "BOL_PKGLIST_CONTAINER", "NOT_CHECKED", { packingList: "PL-7741" }, null, "Cannot compare — packing list has no container number either.", 11);
  await bolRec(bolB.id, "BOL_PKGLIST_CONTAINER", "FAIL", { bolContainer: "TEMU9911991", packingListContainer: "TEMU9911911", packingList: "PL-8842" }, { container_number: "BOL ≠ packing list (digit 8 vs 1)" }, "Field-level conflict case EX-9001 — human review required.", 8);
  await bolRec(bolB.id, "BOL_PO_QUANTITY", "PASS", { bolPackages: 2, poLineQty: 2, po: "PO-3003" }, null, null, 8);
  await bolRec(bolC.id, "BOL_PKGLIST_CONTAINER", "PASS", { bolContainer: "MSCU4471993", packingListContainer: "MSCU4471993", packingList: "PL-8840" }, null, null, 13);
  await bolRec(bolC.id, "BOL_PO_QUANTITY", "PASS", { bolPackages: 2, poLineQty: 2, po: "PO-3003" }, null, null, 13);
  await bolRec(bolC.id, "REQ_CONTAINER_NUMBER", "PASS", { container_number: "MSCU4471993" }, null, null, 13);
  await bolRec(bolD.id, "MATCH_SUPPLIER_PO", "FAIL", { supplier: "Unknown Shipper Ltd", consignee: "NASS Industrial Division", poRefs: [] }, { po_reference: "ABSENT", supplier_match: "NO_MATCH" }, "Case EX-9002 — BOL remains UNMATCHED; not force-linked on supplier-name similarity.", 4);
  await bolRec(bolE.id, "BOL_PKGLIST_CONTAINER", "NOT_CHECKED", { packingList: "PL-7760" }, null, "Reconciliation queue paused — carrier API outage (SHP-8803). NOT_CHECKED is not PASS.", 6);

  // Containers (8.1 #10) — never fabricated; identity status explicit
  const c1 = await db.container.create({ data: { containerNo: "MSCU4471993", sizeType: "40HC", sealNo: "SL-77401", packageCount: 2, grossWeightKg: 35100, shipmentId: shp1.id, bolId: bolC.id, identityStatus: "RESOLVED", identitySource: "BOL + carrier booking BK-778211" } });
  const c2 = await db.container.create({ data: { containerNo: "TEMU9911991", sizeType: "40OT", sealNo: "SL-88213", packageCount: 2, grossWeightKg: 34800, shipmentId: shp4.id, bolId: bolB.id, identityStatus: "UNRESOLVED", identitySource: null, note: "Container number conflicts with packing list PL-8842 (TEMU9911911). Tracking identifier blocked until human confirms (M09)." } });
  const c3 = await db.container.create({ data: { containerNo: null, sizeType: "LCL", sealNo: null, packageCount: 12, grossWeightKg: 21400, shipmentId: shp2.id, bolId: bolA.id, identityStatus: "MISSING", identitySource: null, note: "BOL has no container number; LCL consignment possible. Identifier not fabricated — awaiting supplier/forwarder response." } });
  const c4 = await db.container.create({ data: { containerNo: "HLXU2201457", sizeType: "40HC", sealNo: "SL-44710", packageCount: 3, grossWeightKg: 12400, shipmentId: shp3.id, bolId: bolE.id, identityStatus: "RESOLVED", identitySource: "BOL" } });
  void c4;

  // ── Shipping documents (8.1 #12) ─────────────────────────────────────────
  await db.shippingDocument.create({ data: { docType: "packing_list", refNo: "PL-7741", fileName: "PL-7741.pdf", contentHash: "sha256:pl7741", shipmentId: shp2.id, bolId: bolA.id, issuer: "Rheinwerk GmbH", ocrStatus: "PARSED", note: "No container number on packing list either." } });
  await db.shippingDocument.create({ data: { docType: "packing_list", refNo: "PL-8842", fileName: "PL-8842.pdf", contentHash: "sha256:pl8842", shipmentId: shp4.id, bolId: bolB.id, issuer: "Pacific Marine Components", ocrStatus: "PARSED", note: "States container TEMU9911911 — conflicts with HBL." } });
  await db.shippingDocument.create({ data: { docType: "commercial_invoice", refNo: "INV-55120", fileName: "INV-55120.pdf", contentHash: "sha256:inv55120", shipmentId: shp1.id, issuer: "Pacific Marine Components", ocrStatus: "PARSED" } });
  await db.shippingDocument.create({ data: { docType: "certificate_of_origin", refNo: "COO-99112", fileName: "COO-99112.pdf", contentHash: "sha256:coo99112", shipmentId: shp1.id, issuer: "CCPIT Shanghai", ocrStatus: "PARSED" } });
  await db.shippingDocument.create({ data: { docType: "arrival_notice", refNo: "AN-4410", fileName: "AN-4410.eml", contentHash: "sha256:an4410", shipmentId: shp6.id, issuer: "Coastal Logistics", ocrStatus: "PARSED" } });
  await db.shippingDocument.create({ data: { docType: "customs_declaration", refNo: "CD-22071", fileName: "CD-22071.pdf", contentHash: "sha256:cd22071", shipmentId: shp5.id, issuer: "Broker portal (manual upload)", ocrStatus: "PARSED", note: "Status manually reported — customs platform not connected (M10 rule)." } });

  // ── Milestones (8.1 #13, M11) — event time vs received time ─────────────
  const ms = (shipmentId: string, code: string, label: string, eventH: number, recvMin: number, source: string, freshness: string, est = false, loc?: string, conf?: number, providerEventId?: string, containerId?: string, note?: string) => db.milestone.create({ data: { shipmentId, containerId: containerId ?? null, code, label, location: loc ?? null, eventTime: hr(eventH), receivedAt: min(recvMin), source, providerEventId: providerEventId ?? `PE-${shipmentId}-${code}-${eventH}`, isEstimated: est, freshness, confidence: conf ?? null, note: note ?? null } });
  // SHP-8801 fresh chain incl. corrected late-arriving event
  await ms(shp1.id, "booking_confirmed", "Booking confirmed", 24 * 22, 40, "carrier_api", "fresh", false, "Shanghai", 0.99, "EV-99120");
  await ms(shp1.id, "gate_in", "Gate-in at origin terminal", 24 * 19, 35, "carrier_api", "fresh", false, "Shanghai Yangshan T3", 0.99, "EV-99155", c1.id);
  await ms(shp1.id, "loaded", "Loaded on vessel", 24 * 18, 30, "carrier_api", "fresh", false, "Shanghai Yangshan", 0.99, "EV-99180", c1.id);
  await ms(shp1.id, "departed", "Vessel departed (ATD)", 24 * 17.5, 25, "carrier_api", "fresh", false, "Shanghai", 0.99, "EV-99192");
  await ms(shp1.id, "underway", "Vessel underway — position update", 4, 3, "ais", "fresh", false, "12.44N 62.18E (vessel position)", 0.9, "AIS-771203", undefined, "AIS reports VESSEL position; container position not claimed (Rule 4).");
  // corrected milestone: original 'departed' ETA estimated, carrier retracted & re-sent actual
  await db.milestone.create({ data: { shipmentId: shp1.id, code: "departed", label: "Vessel departed (ATD) — corrected by carrier", location: "Shanghai", eventTime: hr(24 * 17.8), receivedAt: hr(2), source: "carrier_api", providerEventId: "EV-99192-R1", isEstimated: false, freshness: "fresh", confidence: 0.99, correctedByEventId: "EV-99192", note: "Late-arriving correction ordered by event time; prior value preserved in history (M11 acceptance)." } });
  // SHP-8802 chain (aging)
  await ms(shp2.id, "booking_confirmed", "Booking confirmed", 24 * 28, 55, "forwarder_portal", "fresh", false, "Ningbo", 0.98, "CN-55612");
  await ms(shp2.id, "loaded", "Loaded on vessel", 24 * 24, 50, "carrier_api", "fresh", false, "Ningbo", 0.98, "CMA-88213");
  await ms(shp2.id, "departed", "Vessel departed (ATD)", 24 * 23, 48, "carrier_api", "fresh", false, "Ningbo", 0.98, "CMA-88240");
  await ms(shp2.id, "underway", "Position update", 26, 20, "ais", "aging", false, "6.20N 59.40E (vessel position)", 0.82, "AIS-772561", undefined, "Carrier ETA not updated in 26 h — freshness aging.");
  // SHP-8803 STALE — carrier API outage
  await ms(shp3.id, "gate_in", "Gate-in at origin terminal", 24 * 9, 15, "carrier_api", "stale", false, "Genoa", 0.98, "HL-77100");
  await ms(shp3.id, "loaded", "Loaded on vessel", 24 * 8.5, 10, "carrier_api", "stale", false, "Genoa", 0.98, "HL-77120");
  await ms(shp3.id, "departed", "Vessel departed (ATD)", 24 * 8, 8, "carrier_api", "stale", false, "Genoa", 0.97, "HL-77135", undefined, "Last event before provider outage — shown as last-known with STALE label + health warning (M11 acceptance).");
  // SHP-8804 transshipment
  await ms(shp4.id, "booking_confirmed", "Booking confirmed", 24 * 16, 30, "forwarder_portal", "fresh", false, "Shanghai", 0.98, "ONE-44012");
  await ms(shp4.id, "loaded", "Loaded — first leg", 24 * 14, 25, "carrier_api", "fresh", false, "Shanghai", 0.98, "ONE-44100");
  await ms(shp4.id, "discharged", "Discharged at transshipment port", 30, 18, "port_system", "fresh", false, "Colombo, LK", 0.97, "PRT-55120");
  await ms(shp4.id, "loaded", "Reloaded — second leg", 24, 12, "carrier_api", "fresh", false, "Colombo, LK", 0.97, "ONE-44190");
  await ms(shp4.id, "underway", "Vessel underway — position update", 5, 2, "ais", "fresh", false, "6.90N 79.80E (vessel position)", 0.9, "AIS-773901", undefined, "Container-to-vessel relationship UNRESOLVED — position shown for vessel only; container location unresolved.");
  // SHP-8805 customs hold (broker manual)
  await ms(shp5.id, "arrived", "Vessel arrived at destination port", 24 * 2, 30, "carrier_api", "fresh", false, "Jebel Ali T2", 0.98, "HL-88231");
  await db.milestone.create({ data: { shipmentId: shp5.id, code: "customs_hold", label: "Import customs hold — inspection flag", location: "Jebel Ali customs", eventTime: day(1), receivedAt: hr(20), source: "broker_portal", providerEventId: "BRK-99231", isEstimated: false, freshness: "fresh", note: "Manually reported by broker — customs platform not connected. Shown as manual source, never implied cleared." } });
  // SHP-8806 delivered chain
  await ms(shp6.id, "arrived", "Vessel arrived", 24 * 3.2, 30, "carrier_api", "fresh", false, "Jebel Ali", 0.98, "MSC-55610");
  await ms(shp6.id, "gate_out", "Container gate-out", 24 * 2.6, 28, "port_system", "fresh", false, "Jebel Ali T2", 0.98, "PRT-55700");
  await ms(shp6.id, "delivered", "Delivered to WH-SHJ — receipt pending", 24 * 2, 27, "warehouse_scan", "fresh", false, "WH-SHJ gate", 0.99, "GRN-SCAN-551");
  // SHP-8807 delivered
  await ms(shp7.id, "picked_up", "Picked up from supplier", 24 * 7, 20, "supplier_notice", "fresh", false, "Fujairah Quarry", 0.95, "SUP-77120");
  await ms(shp7.id, "delivered", "Delivered — GRN-5001 created", 24 * 6, 15, "warehouse_scan", "fresh", false, "WH-DIP gate", 0.99, "GRN-SCAN-540");
  // SHP-8808 early
  await ms(shp8.id, "booking_requested", "Booking requested", 24 * 3, 10, "forwarder_portal", "fresh", false, "Izmir", 0.9, "CLF-90011");
  await ms(shp8.id, "booking_confirmed", "Booking confirmed", 24 * 2, 5, "forwarder_portal", "fresh", false, "Izmir", 0.98, "CLF-90018");

  // ── ETA observations (8.1 #14, M11) — all sources retained ──────────────
  const eta = (shipmentId: string, t: string, src: string, v: Date | null, calc: Date, conf: number | null, lineage: string, active = true, rangeFrom?: Date, rangeTo?: number, note?: string) => db.etaObservation.create({ data: { shipmentId, estimateType: t, sourceName: src, etaValue: v, etaRangeFrom: rangeFrom ?? null, etaRangeTo: rangeTo === undefined ? null : inDays(rangeTo), calculatedAt: calc, confidence: conf, inputLineage: lineage, isActive: active, note: note ?? null } });
  await eta(shp1.id, "supplier", "Pacific Marine Components (dispatch notice)", inDays(9), day(10), 0.8, "Supplier dispatch email 10 d ago (evidence EV-SUP-8811)");
  await eta(shp1.id, "carrier", "MSC tracking API", inDays(10), hr(3), 0.95, "Carrier event stream incl. EV-99192-R1 (ATD correction)");
  await eta(shp1.id, "port", "Port community system schedule", inDays(11), day(1), 0.85, "Berth window published 1 d ago");
  await eta(shp2.id, "supplier", "Rheinwerk export desk", inDays(4), day(20), 0.75, "Supplier proforma email (evidence EV-SUP-8814)");
  await eta(shp2.id, "carrier", "CMA CGM tracking API", inDays(13), hr(26), 0.9, "Vessel schedule update after ATD", true);
  await eta(shp2.id, "model", "NASS ETA model (baseline v0.9, back-tested on 2025 ocean legs)", inDays(12), hr(8), 0.72, "Inputs: ATD (23 d ago), historical leg durations Ningbo→Jebel Ali (n=18), vessel speed profile. Input data as of 8 h ago.", true, inDays(10), 15, "Forecast with uncertainty — not a guaranteed arrival (Rule 15). Provider ETA retains precedence.");
  await eta(shp3.id, "carrier", "Hapag-Lloyd API", inDays(8), day(6), 0.7, "Last successful sync 6 d ago — STALE (provider outage)", true, undefined, undefined, "Carrier ETA is stale; freshness class drives UI label, not silent display.");
  await eta(shp5.id, "port", "Terminal operator availability list", inDays(2), day(2), 0.85, "Berth availability list");
  await eta(shp5.id, "manual", "Broker F. Al Ali (manual entry)", inDays(6), hr(20), null, "Broker estimate after customs hold — recorded as manual estimate with author and time", true, undefined, undefined, "Customs hold makes carrier ETA unreliable; manual estimate labeled as such.");

  // ── Material requirements (8.1 #14 demand, M14) ──────────────────────────
  const mr1 = await db.materialRequirement.create({ data: { projectId: prj1.id, materialId: mRebar.id, workPackage: "Podium slab pour #7", quantity: 120, uom: "tonne", requiredOnSite: inDays(12), leadTimeDays: 21, criticality: "CRITICAL", demandType: "APPROVED", status: "AT_RISK", note: "In-transit SHP-8802 is NOT on-site inventory; ETA slip vs required date (M12/M14)." } });
  await db.materialRequirement.create({ data: { projectId: prj1.id, materialId: mChiller.id, workPackage: "MEP level 22–28", quantity: 1, uom: "unit", requiredOnSite: inDays(25), leadTimeDays: 75, criticality: "CRITICAL", demandType: "APPROVED", status: "AT_RISK", note: "Same shipment SHP-8802 — delay threatens MEP program." } });
  await db.materialRequirement.create({ data: { projectId: prj2.id, materialId: mSwg.id, workPackage: "Utilities building power room", quantity: 2, uom: "unit", requiredOnSite: inDays(30), leadTimeDays: 60, criticality: "CRITICAL", demandType: "PLANNED", status: "OPEN" } });
  await db.materialRequirement.create({ data: { projectId: prj3.id, materialId: mTrf.id, workPackage: "Airside substation", quantity: 2, uom: "unit", requiredOnSite: inDays(16), leadTimeDays: 60, criticality: "CRITICAL", demandType: "APPROVED", status: "OPEN", note: "On SHP-8801 — carrier ETA within required date." } });
  await db.materialRequirement.create({ data: { projectId: prj2.id, materialId: mPump.id, workPackage: "Cooling water loop", quantity: 8, uom: "unit", requiredOnSite: inDays(9), leadTimeDays: 45, criticality: "HIGH", demandType: "APPROVED", status: "SHORT", note: "2 of 8 units quarantined after failed QC; balance on PO-3004." } });

  // ── Inventory lots (8.1 #16, M12) — in-transit NOT available ────────────
  await db.inventoryLot.create({ data: { materialId: mRebar.id, warehouseId: whMarina.id, projectId: prj1.id, status: "AVAILABLE", quantity: 18.5, uom: "tonne", lotNo: "LOT-RB-0221", lastVerifiedAt: hr(30), poId: po1.id } });
  await db.inventoryLot.create({ data: { materialId: mRebar.id, warehouseId: whMarina.id, projectId: prj1.id, status: "RESERVED", quantity: 18.5, uom: "tonne", lotNo: "LOT-RB-0221", lastVerifiedAt: hr(30), note: "Reserved for pour #6 closeout — not available for pour #7." } });
  await db.inventoryLot.create({ data: { materialId: mRebar.id, warehouseId: whDip.id, status: "IN_TRANSIT", quantity: 120, uom: "tonne", poId: po1.id, shipmentId: shp2.id, note: "In-transit against PO-3001/SHP-8802 — never counted as available (M12 rule)." } });
  await db.inventoryLot.create({ data: { materialId: mCement.id, warehouseId: whShj.id, status: "AVAILABLE", quantity: 830, uom: "bag", lotNo: "LOT-CEM-1180", lastVerifiedAt: hr(20), poId: po5.id } });
  await db.inventoryLot.create({ data: { materialId: mPump.id, warehouseId: whShj.id, projectId: prj2.id, status: "QUARANTINED", quantity: 2, uom: "unit", lotNo: "LOT-PMP-0450", lastVerifiedAt: day(2), poId: po4.id, note: "Failed QC — seal damage on arrival (GRN-5003)." } });
  await db.inventoryLot.create({ data: { materialId: mCable.id, warehouseId: whDip.id, status: "DAMAGED", quantity: 3, uom: "drum", lotNo: "LOT-CAB-0310", lastVerifiedAt: day(4), note: "Water damage in container CSNU-2211 — claim in progress." } });
  await db.inventoryLot.create({ data: { materialId: mTrf.id, warehouseId: whDip.id, status: "INSPECTION_PENDING", quantity: 1, uom: "unit", lotNo: "LOT-TRF-0002", poId: po3.id, note: "Arrived SHP-8806 consignment — awaiting KEMA witness inspection." } });
  await db.inventoryLot.create({ data: { materialId: mSwg.id, warehouseId: whDip.id, projectId: prj2.id, status: "AVAILABLE", quantity: 2, uom: "unit", lotNo: "LOT-SWG-0111", lastVerifiedAt: hr(40) } });
  await db.inventoryLot.create({ data: { materialId: mSealKit.id, warehouseId: whDip.id, status: "AVAILABLE", quantity: 1, uom: "kit", lotNo: "LOT-SEAL-004", lastVerifiedAt: day(1), note: "Only 1 kit on hand — WO-6002 requires 2 (Workflow D dependency)." } });

  // ── Goods receipts (8.1 #17, M13) ────────────────────────────────────────
  await db.goodsReceipt.create({ data: { ref: "GRN-5001", poLineId: po5l1.id, shipmentId: shp7.id, warehouseId: whDip.id, materialId: mCement.id, expectedQty: 1200, receivedQty: 1200, uom: "bag", status: "CLOSED", qcResult: "PASS", discrepancyType: "NONE", receivedBy: "M. Okafor (Storekeeper)", receivedAt: day(6), grnNo: "GRN-5001", note: "Full receipt; ledger reconciled." } });
  await db.goodsReceipt.create({ data: { ref: "GRN-5002", poLineId: po1l1.id, warehouseId: whMarina.id, materialId: mRebar.id, expectedQty: 120, receivedQty: 72, uom: "tonne", status: "PARTIALLY_RECEIVED", qcResult: "PASS", discrepancyType: "NONE", receivedBy: "A. Haddad (Storekeeper)", receivedAt: day(2), grnNo: "GRN-5002", note: "Partial 72/120 t — remaining 48 t stays open against PO-3001 (M12 acceptance)." } });
  const grn3 = await db.goodsReceipt.create({ data: { ref: "GRN-5003", poLineId: po4l1.id, shipmentId: shp6.id, warehouseId: whShj.id, materialId: mPump.id, expectedQty: 20, receivedQty: 18, uom: "unit", status: "QUARANTINED", qcResult: "FAIL", discrepancyType: "SHORT", discrepancyQty: 2, photos: J(["evidence://grn5003/photo-01.jpg", "evidence://grn5003/photo-02.jpg"]), receivedBy: "R. Bello (Storekeeper)", receivedAt: day(2), grnNo: "GRN-5003", note: "Short 2 units vs packing list; 2 of 18 with damaged seals — quarantined. Workflow C case EX-9007." } });
  await db.goodsReceipt.create({ data: { ref: "GRN-5004", poLineId: po5l1.id, warehouseId: whDip.id, materialId: mCement.id, expectedQty: 0, receivedQty: 0, uom: "bag", status: "CLOSED", qcResult: "PASS", discrepancyType: "NONE", receivedBy: "system (webhook)", receivedAt: day(6), grnNo: null, note: "Duplicate WMS webhook with same provider event id WMS-GR-9912 — deduplicated by idempotency key; no double stock (M12 acceptance)." } });
  void grn3;

  // ── Assets (8.1 #18, M15) — class exposed clearly ────────────────────────
  const aCrane = await db.asset.create({ data: { tag: "AST-TC-7030", name: "Tower crane TC-7030 (Marina)", assetClass: "TELEMETRY_CONNECTED", site: "Dubai Waterfront, Plot MW-4", location: "Tower core, east", owner: "NASS-CON Plant Dept", criticality: "CRITICAL", make: "Potain", model: "MD 2200", serialNo: "PT-118842", condition: "HEALTHY", meterReading: 12480, meterUnit: "motor hours", warrantyTo: inDays(400), certificates: J([{ name: "Lifting gear cert", expiresAt: inDays(120).toISOString() }]), lastTelemetryAt: min(12), sensors: J([{ type: "vibration", unit: "mm/s", threshold: 7.1 }, { type: "wind_speed", unit: "m/s", threshold: 18 }]), projectId: prj1.id } });
  const aChiller = await db.asset.create({ data: { tag: "AST-CH-02", name: "Chiller plant CH-02 (Sharjah)", assetClass: "TELEMETRY_CONNECTED", site: "Sharjah Industrial Area 12", owner: "NASS-IND FM", criticality: "HIGH", make: "Trane", model: "RTAF-155", serialNo: "TR-99121", condition: "UNKNOWN", meterReading: 22310, meterUnit: "run hours", lastTelemetryAt: day(5), telemetryStale: true, sensors: J([{ type: "supply_temp", unit: "°C", threshold: 8 }, { type: "pressure", unit: "bar", threshold: 6 }]), note: "Telemetry stale >48 h → data-health issue opened, NOT interpreted as healthy or faulty (M15 acceptance / Workflow D rule)." } });
  const aGen = await db.asset.create({ data: { tag: "AST-GEN-04", name: "Diesel generator GEN-04 (Airport)", assetClass: "INSPECTION_MONITORED", site: "Abu Dhabi Airside North", owner: "NASS-CON Plant Dept", criticality: "CRITICAL", make: "Cummins", model: "C1250 D5", serialNo: "CM-55231", condition: "MAINTENANCE_DUE", meterReading: 3120, meterUnit: "run hours", certificates: J([{ name: "Emissions cert", expiresAt: inDays(60).toISOString() }]), note: "Inspection-monitored only — not real-time monitored (M15 class rule)." } });
  const aPump = await db.asset.create({ data: { tag: "AST-P-112", name: "Submersible pump P-112 (DIP sump)", assetClass: "REGISTRY_ONLY", site: "DIP, Dubai", owner: "NASS-IND FM", criticality: "STANDARD", make: "Grundfos", model: "UNILIFT KP", serialNo: "GF-88121", condition: "UNKNOWN", note: "Registry-only asset — status updated manually; no live monitoring claimed." } });
  const aMcrane = await db.asset.create({ data: { tag: "AST-MC-09", name: "Mobile crane MC-09", assetClass: "LOCATION_TRACKED", site: "Fleet", owner: "NASS-CON Plant Dept", criticality: "HIGH", make: "Liebherr", model: "LTM 1050", serialNo: "LH-77231", condition: "HEALTHY", meterReading: 8810, meterUnit: "km", lastTelemetryAt: hr(2), note: "Position from GPS telematics — location tracking only, not condition telemetry." } });
  const aAhu = await db.asset.create({ data: { tag: "AST-AHU-05", name: "Air handling unit AHU-05 (Marina)", assetClass: "TELEMETRY_CONNECTED", site: "Dubai Waterfront, Plot MW-4", owner: "NASS-IND FM", criticality: "HIGH", make: "Carrier", model: "39C series", serialNo: "CR-33018", condition: "FAULT", lastTelemetryAt: min(45), sensors: J([{ type: "bearing_temp", unit: "°C", threshold: 85 }, { type: "vibration", unit: "mm/s", threshold: 7.1 }]), spareParts: J([{ materialId: mSealKit.sku, qty: 2 }]), projectId: prj1.id } });
  void aPump;

  // Telemetry — AST-TC-7030 fresh; AST-CH-02 stale; AST-AHU-05 rising bearing temp
  const tel = (assetId: string, metric: string, value: number, unit: string, eventMin: number, quality = "GOOD") => db.telemetryObservation.create({ data: { assetId, metric, value, unit, eventTime: min(eventMin), receivedAt: min(Math.max(0, eventMin - 2)), quality } });
  await tel(aCrane.id, "vibration", 4.2, "mm/s", 12);
  await tel(aCrane.id, "wind_speed", 9.1, "m/s", 12);
  await tel(aCrane.id, "vibration", 3.9, "mm/s", 72);
  await tel(aCrane.id, "wind_speed", 11.4, "m/s", 72);
  await tel(aChiller.id, "supply_temp", 7.4, "°C", 24 * 60 * 5);
  await tel(aChiller.id, "pressure", 5.2, "bar", 24 * 60 * 5, "SUSPECT");
  await tel(aAhu.id, "bearing_temp", 71.2, "°C", 24 * 60 * 3);
  await tel(aAhu.id, "bearing_temp", 78.6, "°C", 24 * 60 * 2);
  await tel(aAhu.id, "bearing_temp", 91.4, "°C", 45, "GOOD");

  // Inspections — incl. rejected completion without evidence (M15 acceptance)
  await db.inspection.create({ data: { assetId: aCrane.id, type: "SCHEDULED", dueDate: inDays(50), status: "PENDING", checklist: J(["wire ropes", "limit switches", "slewing ring"]) } });
  await db.inspection.create({ data: { assetId: aGen.id, type: "SCHEDULED", dueDate: inDays(-3), status: "AWAITING_EVIDENCE", checklist: J(["coolant", "fuel system", "battery bank"]), findings: "Inspector marked complete in field app without attaching load-test report. Completion without required evidence remains pending/rejected per policy (M15)." } });
  await db.inspection.create({ data: { assetId: aGen.id, type: "SCHEDULED", dueDate: day(30), status: "COMPLETED", evidence: J(["evidence://insp/gen04/load-test.pdf", "evidence://insp/gen04/photos.zip"]), completedAt: day(30), completedBy: "K. Nasser (Technician)" } });
  await db.inspection.create({ data: { assetId: aAhu.id, type: "CORRECTIVE", dueDate: inDays(2), status: "IN_PROGRESS", findings: "Bearing temp exceeds threshold 85 °C — defect WO-6002 raised." } });

  // Work orders — Workflow D: fault → WO → spare-parts dependency
  await db.maintenanceWorkOrder.create({ data: { ref: "WO-6001", assetId: aCrane.id, type: "PREVENTIVE", status: "CLOSED", priority: "NORMAL", dueDate: day(10), findings: "Routine 500 h service completed.", owner: "K. Nasser (Technician)", closeoutEvidence: J(["evidence://wo6001/service-report.pdf", "evidence://wo6001/oil-sample.pdf"]), rootCause: null, createdAt: day(16), closedAt: day(9), approvals: J(["approved by Plant Manager"]) } });
  await db.maintenanceWorkOrder.create({ data: { ref: "WO-6002", assetId: aAhu.id, type: "CORRECTIVE", status: "PARTS_PENDING", priority: "CRITICAL", dueDate: inDays(4), findings: "Supply fan drive-end bearing temperature 91.4 °C (>85 threshold). Vibration nominal. Defect classified per checklist D-3.", partsRequired: J([{ materialId: "MAT-SEAL-K", description: "Pump mechanical seal kit (AHU pump loop)", qty: 2, stockAvailable: 1 }]), owner: "Maintenance Planning", createdAt: hr(20), approvals: J(["WO creation approved per maintenance policy v2.1"]) } });

  // ── Suppliers scorecards (M04: publish formulas, sample size, exclusions) ─
  const score = (supplierId: string, metric: string, value: number, n: number, period: string, def: string, excl?: string) => db.supplierScoreSnapshot.create({ data: { supplierId, metric, definition: def, version: "v1.0", period, value, unit: "%", sampleSize: n, exclusions: excl ?? "Force-majeure port closures excluded per attribution rule v1.0", sourceLineage: "Computed from verified GRN + PO promised dates in ODS", calculatedAt: hr(12) } });
  await score(supAtlas.id, "on_time_delivery", 92.5, 40, "2026-Q1", "Lines delivered ≤ promised date ÷ lines due, based on GRN received_at vs PO promised_date.");
  await score(supAtlas.id, "quantity_accuracy", 99.1, 40, "2026-Q1", "Lines with received qty == ordered qty (tolerance 0%) ÷ lines received.");
  await score(supAtlas.id, "documentation", 97.0, 40, "2026-Q1", "Deliveries with complete, reconciled docs at first submission ÷ deliveries.");
  await score(supRhein.id, "on_time_delivery", 78.0, 18, "2026-Q1", "Lines delivered ≤ promised date ÷ lines due, based on GRN received_at vs PO promised_date.", "SHP-8803 excluded — carrier outage, attribution inconclusive.");
  await score(supRhein.id, "responsiveness", 64.0, 22, "2026-Q1", "Supplier responses within 2 business days ÷ requests sent.");
  await score(supNord.id, "on_time_delivery", 85.7, 14, "2026-Q1", "Lines delivered ≤ promised date ÷ lines due, based on GRN received_at vs PO promised_date.");
  await score(supNord.id, "quality", 91.7, 12, "2026-Q1", "Receipts passing QC at first inspection ÷ receipts inspected.");

  // Risk signals (M16) — fact separated from interpretation
  const risk = (code: string, entityType: string, entityRef: string, fact: string, interp: string, sev: string, supplierId?: string) => db.riskSignal.create({ data: { signalCode: code, entityType, entityRef, fact, interpretation: interp, severity: sev, definition: `${code} rule ${"v1.0"}`, version: "v1.0", threshold: "see rule", sourceFields: J(["carrierEta", "supplierPromisedEta", "materialRequirement.requiredOnSite"]), supplierId: supplierId ?? null, calculatedAt: hr(1) } });
  await risk("ETA_SLIP", "shipment", "SHP-8802", "Carrier ETA moved from +4 d (supplier promise) to +13 d (carrier, 26 h old).", "Podium pour #7 rebar and chiller program at risk — work package exposure HIGH.", "HIGH", supRhein.id);
  await risk("STOCKOUT_RISK", "material_requirement", "PRJ-2201/MAT-REB-16", "On-site available 0 t; reserved 18.5 t; in-transit 120 t; required-on-site in 12 d; ETA +13 d.", "Projected shortfall of ~37 t at required-on-site date under current ETA.", "CRITICAL");
  await risk("CUSTOMS_HOLD", "shipment", "SHP-8805", "Customs status manually reported as held by broker (customs platform not connected).", "Delivery at risk; demurrage exposure requires confirmation of clock dates.", "HIGH");
  await risk("DOC_MISSING", "bol", "MSC-4471", "BOL container number missing; packing list also lacks container reference.", "Shipment-to-container tracking cannot start; identity unresolved.", "HIGH");
  await risk("PO_LATE", "po", "PO-3002", "PO promised date +21 d vs supplier lead-time commitment 75 d from order — line milestones unconfirmed by supplier.", "Supplier promise drift requires follow-up.", "MEDIUM", supRhein.id);
  await risk("ASSET_CRITICAL", "asset", "AST-AHU-05", "Bearing temperature 91.4 °C exceeds threshold 85 °C; spare seal kit stock 1 of 2 required.", "Fault with missing spare part — replenishment via procurement required.", "CRITICAL");
  await risk("REPEAT_DISCREPANCY", "supplier", "SUP-005", "2 receiving discrepancies in 30 d (GRN-5003 short/damaged; LOT-CAB-0310 damaged cartons).", "Packaging quality review suggested — evidence pack attached.", "MEDIUM", supNord.id);
  await risk("DEADLINE_EXPOSURE", "project", "PRJ-2201", "2 approved material requirements reference shipment SHP-8802 with ETA beyond required dates.", "Program-level exposure: structural pour + MEP commissioning.", "HIGH");

  // ── Exception cases — every closed-loop state (M17) ─────────────────────
  const ex9001 = await db.exceptionCase.create({ data: { ref: "EX-9001", title: "BOL container number conflicts with packing list (PMC-2210)", category: "BOL_IDENTITY", severity: "HIGH", state: "DETECTED", trigger: "Reconciliation rule BOL_PKGLIST_CONTAINER v1.2", ruleVersion: "v1.2", entityType: "bol", entityId: bolB.id, entityRef: "PMC-2210", ownerTeam: "Import Desk", dueDate: inDays(2), evidenceRefs: J(["evidence://bol/PMC-2210.pdf", "evidence://pl/PL-8842.pdf"]), recommendedAction: "Request corrected house BOL or packing list from supplier/forwarder — human confirmation required before re-matching.", supplierId: supPac.id, shipmentId: shp4.id, bolId: bolB.id, createdAt: hr(19) } });
  const ex9002 = await db.exceptionCase.create({ data: { ref: "EX-9002", title: "BOL ONEY-4490 unmatched — no PO/supplier linkage", category: "BOL_IDENTITY", severity: "MEDIUM", state: "TRIAGED", trigger: "Match rule MATCH_SUPPLIER_PO v1.2", ruleVersion: "v1.2", entityType: "bol", entityId: bolD.id, entityRef: "ONEY-4490", ownerTeam: "Import Desk", dueDate: inDays(3), evidenceRefs: J(["evidence://bol/ONEY-4490.pdf"]), recommendedAction: "Query issuer and consignee records; do not force-link on name similarity.", bolId: bolD.id, createdAt: day(4) } });
  const ex9003 = await db.exceptionCase.create({ data: { ref: "EX-9003", title: "Carrier feed stale for SHP-8803 (provider outage)", category: "INTEGRATION", severity: "MEDIUM", state: "ASSIGNED", trigger: "Freshness monitor: no provider update beyond 96 h threshold", ruleVersion: "v1.1", entityType: "shipment", entityId: shp3.id, entityRef: "SHP-8803", ownerTeam: "Integration Ops", ownerUser: "Integration on-call", slaHours: 24, dueDate: inHours(18), evidenceRefs: J(["evidence://connector/carrier-ocean-health"]), recommendedAction: "Manual fallback: request status from forwarder; retry budget in progress.", shipmentId: shp3.id, createdAt: day(5) } });
  const ex9004 = await db.exceptionCase.create({ data: { ref: "EX-9004", title: "Container identity unresolved for SHP-8804 (vessel position ≠ container)", category: "BOL_IDENTITY", severity: "HIGH", state: "INVESTIGATING", trigger: "Identity rule: AIS position without evidenced container-to-vessel link", ruleVersion: "v1.0", entityType: "shipment", entityId: shp4.id, entityRef: "SHP-8804", ownerTeam: "Import Desk", ownerUser: "L. Fonseca (Logistics)", slaHours: 48, dueDate: inHours(40), evidenceRefs: J(["evidence://bol/PMC-2210.pdf", "evidence://pl/PL-8842.pdf", "evidence://ais/ONE-COMMITMENT"]), recommendedAction: "Resolve container number conflict (EX-9001) first; then establish container-to-vessel relationship from booking/manifest before claiming container position.", shipmentId: shp4.id, bolId: bolB.id, createdAt: day(3) } });
  const ex9005 = await db.exceptionCase.create({ data: { ref: "EX-9005", title: "ETA slip on SHP-8802 threatens pour #7 rebar + chiller program", category: "ETA_SLIP", severity: "CRITICAL", state: "ACTION_PROPOSED", trigger: "Risk rule ETA_SLIP v1.0 (carrier ETA vs supplier promise vs required-on-site)", ruleVersion: "v1.0", entityType: "shipment", entityId: shp2.id, entityRef: "SHP-8802", ownerTeam: "Project Materials", ownerUser: "N. Salem (Project Controls)", slaHours: 12, dueDate: inHours(8), evidenceRefs: J(["evidence://eta/cma-cgm-88213", "evidence://bol/MSC-4471", "evidence://supplier/rheinwerk-proforma"]), recommendedAction: "Ranked alternatives: 1) Expedite partial air freight of 40 t rebar (cost est. — requires approval); 2) Split delivery: release chiller later, rebar first; 3) Resequence pour #7 by 6 days (requires project approval); 4) Transfer 18.5 t reserved stock after pour #6 confirmation. Commercial/contract constraints surfaced.", supplierId: supRhein.id, shipmentId: shp2.id, bolId: bolA.id, createdAt: day(1) } });
  const ex9006 = await db.exceptionCase.create({ data: { ref: "EX-9006", title: "BOL MSC-4471 missing container number (Workflow A)", category: "BOL_IDENTITY", severity: "HIGH", state: "AWAITING_APPROVAL", trigger: "Required-field rule REQ_CONTAINER_NUMBER v1.2", ruleVersion: "v1.2", entityType: "bol", entityId: bolA.id, entityRef: "MSC-4471", ownerTeam: "Import Desk", ownerUser: "L. Fonseca (Logistics)", slaHours: 24, dueDate: inHours(14), evidenceRefs: J(["evidence://bol/MSC-4471.pdf", "evidence://pl/PL-7741.pdf"]), recommendedAction: "Send prepared clarification request to Rheinwerk export desk + Coastal Logistics quoting verified references only.", supplierId: supRhein.id, shipmentId: shp2.id, bolId: bolA.id, createdAt: day(3) } });
  const ex9007 = await db.exceptionCase.create({ data: { ref: "EX-9007", title: "Receiving shortage + damaged pumps (GRN-5003, PO-3004)", category: "RECEIVING_MISMATCH", severity: "HIGH", state: "ACTION_SUBMITTED", trigger: "Three-way mismatch rule RECEIPT_VS_PL_VS_PO v1.3", ruleVersion: "v1.3", entityType: "receipt", entityId: "GRN-5003", entityRef: "GRN-5003", ownerTeam: "Warehouse Ops", ownerUser: "R. Bello (Storekeeper)", slaHours: 72, dueDate: inDays(1), evidenceRefs: J(["evidence://grn5003/photo-01.jpg", "evidence://grn5003/photo-02.jpg", "evidence://pl/PL-9920"]), recommendedAction: "Supplier claim for 2 short + 2 damaged pumps; approved ERP adjustment; quarantine release decision for repaired units.", supplierId: supNord.id, shipmentId: shp6.id, createdAt: day(2) } });
  const ex9008 = await db.exceptionCase.create({ data: { ref: "EX-9008", title: "BOL MSC-4472 v2 weight correction pending source confirmation", category: "DATA_QUALITY", severity: "LOW", state: "OUTCOME_PENDING_VERIFICATION", trigger: "Amendment validation rule BOL_AMENDMENT v1.1", ruleVersion: "v1.1", entityType: "bol", entityId: bolC.id, entityRef: "MSC-4472", ownerTeam: "Import Desk", ownerUser: "L. Fonseca (Logistics)", slaHours: 48, dueDate: inHours(30), evidenceRefs: J(["evidence://bol/MSC-4472-v1.pdf", "evidence://bol/MSC-4472-v2.pdf"]), recommendedAction: "Await carrier/forwarder confirmation of amended gross weight; recompute reconciliations idempotently on confirmation.", shipmentId: shp1.id, bolId: bolC.id, createdAt: day(4) } });
  const ex9009 = await db.exceptionCase.create({ data: { ref: "EX-9009", title: "Cable drums water-damaged in transit (PO/shipment CSNU-2211)", category: "RECEIVING_MISMATCH", severity: "MEDIUM", state: "RESOLVED", trigger: "QC inspection FAIL at GRN", ruleVersion: "v1.3", entityType: "receipt", entityId: "GRN-5002", entityRef: "GRN-5002", ownerTeam: "Warehouse Ops", ownerUser: "A. Haddad (Storekeeper)", evidenceRefs: J(["evidence://grn5002/photos.zip", "evidence://claim/CLM-2210.pdf", "evidence://erp/adj-88120"]), recommendedAction: null, resolutionCode: "RESOLVED_CLAIM_SETTLED", closureProof: "Supplier credit note CN-8812 verified against ERP adjustment ADJ-88120 by Finance (read-back). Ledger corrected and re-verified; 3 damaged drums re-valued.", createdAt: day(20), closedAt: day(9) } });
  const ex9010 = await db.exceptionCase.create({ data: { ref: "EX-9010", title: "Duplicate intake PR-1011 for existing PR-1007", category: "DATA_QUALITY", severity: "LOW", state: "CANCELLED", trigger: "Duplicate-intake rule v1.1 (ref+line hash)", ruleVersion: "v1.1", entityType: "purchase_request", entityRef: "PR-1011", ownerTeam: "Procurement Ops", evidenceRefs: J(["evidence://email/pr1011.eml"]), recommendedAction: null, resolutionCode: "CANCELLED_DUPLICATE", closureProof: "Duplicate linked to PR-1007 by rule; requester notified; no second PO created (M05 acceptance).", createdAt: day(1), closedAt: hr(20) } });
  const ex9011 = await db.exceptionCase.create({ data: { ref: "EX-9011", title: "AHU-05 supply fan bearing fault — spare part dependency (Workflow D)", category: "ASSET_FAULT", severity: "CRITICAL", state: "ASSIGNED", trigger: "Telemetry threshold rule BEARING_TEMP > 85 °C v2.0; signal freshness validated before alerting", ruleVersion: "v2.0", entityType: "asset", entityRef: "AST-AHU-05", ownerTeam: "Maintenance Planning", ownerUser: "Maintenance Planner", slaHours: 8, dueDate: inHours(6), evidenceRefs: J(["evidence://telemetry/ahu05-bearing-temp", "evidence://wo/WO-6002"]), recommendedAction: "WO-6002 raised (approved). Spare seal kit: 1 on hand, 2 required — replenishment decision routed through procurement approvals (no autonomous PO).", createdAt: hr(18) } });
  const ex9012 = await db.exceptionCase.create({ data: { ref: "EX-9012", title: "Supplier commitment breach — PO-3002 lead-time drift", category: "SUPPLIER_BREACH", severity: "MEDIUM", state: "INVESTIGATING", trigger: "Risk rule PROMISE_DRIFT v1.0", ruleVersion: "v1.0", entityType: "supplier", entityRef: "SUP-002", ownerTeam: "Procurement", ownerUser: "Procurement Lead", slaHours: 96, dueDate: inDays(3), evidenceRefs: J(["evidence://supplier/rheinwerk-proforma", "evidence://po/PO-3002", "evidence://contract/CTR-4002"]), recommendedAction: "Record revised promise with source/time; evaluate penalty clause CTR-4002 (0.5%/week cap 5%); prepare contractual follow-up for approval.", supplierId: supRhein.id, shipmentId: shp2.id, createdAt: hr(30) } });
  void ex9012;

  // Case events — full transition histories (M17: every transition logged)
  const ev = (caseId: string, type: string, from: string | null, to: string | null, actor: string, actorType: string, note: string | null, at: Date) => db.caseEvent.create({ data: { caseId, type, fromState: from, toState: to, actor, actorType, note, at } });
  // EX-9006 full Workflow A history → AWAITING_APPROVAL
  await ev(ex9006.id, "STATE_TRANSITION", null, "DETECTED", "REQ_CONTAINER_NUMBER v1.2", "RULE", "BOL MSC-4471: container number absent on all pages.", day(3));
  await ev(ex9006.id, "EVIDENCE", null, null, "doc-intake", "SERVICE", "Original BOL stored immutable: sha256:aa11…bol4471 (12 pages).", day(3));
  await ev(ex9006.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Intake Triage", "SERVICE", "Category BOL_IDENTITY, severity HIGH by severity matrix v1.0.", day(3));
  await ev(ex9006.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Assigned to Import Desk (legal entity NASS-CON, shipment SHP-8802 responsibility rules).", day(3));
  await ev(ex9006.id, "ASSIGNMENT", null, null, "L. Fonseca (Logistics)", "USER", "Owner accepted assignment.", hr(50));
  await ev(ex9006.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "L. Fonseca (Logistics)", "USER", "Checked BOL + packing list: neither carries container number.", hr(46));
  await ev(ex9006.id, "COMMUNICATION", null, null, "Assistant (draft)", "SERVICE", "Drafted supplier/forwarder clarification quoting only verified refs (BOL MSC-4471, PO-3002, booking CN-55612).", hr(30));
  await ev(ex9006.id, "STATE_TRANSITION", "INVESTIGATING", "ACTION_PROPOSED", "Assistant draft v1", "SERVICE", "Action ACT-0001 drafted: request BOL data from supplier/forwarder.", hr(28));
  await ev(ex9006.id, "STATE_TRANSITION", "ACTION_PROPOSED", "AWAITING_APPROVAL", "Policy engine v1.0", "SERVICE", "External communication requires authorized-user approval (M18).", hr(28));
  // EX-9005 Workflow B history → ACTION_PROPOSED
  await ev(ex9005.id, "STATE_TRANSITION", null, "DETECTED", "ETA_SLIP v1.0", "RULE", "Carrier ETA +13 d vs supplier promise +4 d; required-on-site +12 d.", day(1));
  await ev(ex9005.id, "EVIDENCE", null, null, "eta-ingest", "SERVICE", "Raw carrier observation stored: ETA 2026-…Z, source CMA CGM API, calculated_at 26 h ago.", day(1));
  await ev(ex9005.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Identity linkage passed: shipment→PO-3002→PR-1007 lines→PRJ-2201 requirement.", day(1));
  await ev(ex9005.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Owner: Project Materials (project-required-date exposure).", day(1));
  await ev(ex9005.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "N. Salem (Project Controls)", "USER", "Reviewed stock: 0 available on site; 18.5 t reserved (pour #6); 120 t in transit.", hr(16));
  await ev(ex9005.id, "STATE_TRANSITION", "INVESTIGATING", "ACTION_PROPOSED", "Assistant + owner", "USER", "4 ranked alternatives prepared with explicit criteria; approval gateway to check spend/authority next.", hr(10));
  // EX-9009 fully closed loop
  await ev(ex9009.id, "STATE_TRANSITION", null, "DETECTED", "QC FAIL at GRN", "RULE", "3 drums water-damaged on arrival (CSNU-2211).", day(20));
  await ev(ex9009.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Category RECEIVING_MISMATCH.", day(20));
  await ev(ex9009.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Warehouse Ops.", day(20));
  await ev(ex9009.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "A. Haddad (Storekeeper)", "USER", "Photos + packing list captured.", day(19));
  await ev(ex9009.id, "STATE_TRANSITION", "INVESTIGATING", "ACTION_PROPOSED", "A. Haddad (Storekeeper)", "USER", "Claim + ERP stock adjustment proposed.", day(19));
  await ev(ex9009.id, "STATE_TRANSITION", "ACTION_PROPOSED", "AWAITING_APPROVAL", "Policy engine v1.0", "SERVICE", "Stock adjustment = high-risk action (M18).", day(19));
  await ev(ex9009.id, "STATE_TRANSITION", "AWAITING_APPROVAL", "AUTHORIZED", "S. Whitfield (Finance)", "USER", "Approved: claim + adjustment ADJ-88120.", day(18));
  await ev(ex9009.id, "STATE_TRANSITION", "AUTHORIZED", "ACTION_SUBMITTED", "Action gateway", "SERVICE", "Claim CLM-2210 emailed to supplier; ERP adjustment submitted with idempotency key adj-88120.", day(18));
  await ev(ex9009.id, "STATE_TRANSITION", "ACTION_SUBMITTED", "OUTCOME_PENDING_VERIFICATION", "Action gateway", "SERVICE", "HTTP 200 ≠ completion — read-back scheduled (Rule: postcondition verification).", day(18));
  await ev(ex9009.id, "STATE_TRANSITION", "OUTCOME_PENDING_VERIFICATION", "RESOLVED", "Finance read-back + WMS ledger", "SERVICE", "Credit note CN-8812 verified; ledger re-verified. Closure proof recorded.", day(9));
  // EX-9007 → ACTION_SUBMITTED
  await ev(ex9007.id, "STATE_TRANSITION", null, "DETECTED", "RECEIPT_VS_PL_VS_PO v1.3", "RULE", "Received 18 vs packing list 20; 2 damaged.", day(2));
  await ev(ex9007.id, "STATE_TRANSITION", "DETECTED", "ASSIGNED", "Triage + routing", "SERVICE", "Warehouse Ops / R. Bello.", day(2));
  await ev(ex9007.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "R. Bello (Storekeeper)", "USER", "Photos captured; quarantine bins assigned.", day(2));
  await ev(ex9007.id, "STATE_TRANSITION", "INVESTIGATING", "ACTION_PROPOSED", "Assistant draft v1", "SERVICE", "Claim drafted quoting GRN-5003, PL-9920, PO-3004.", hr(40));
  await ev(ex9007.id, "STATE_TRANSITION", "ACTION_PROPOSED", "AWAITING_APPROVAL", "Policy engine v1.0", "SERVICE", "Supplier claim requires procurement approval.", hr(38));
  await ev(ex9007.id, "STATE_TRANSITION", "AWAITING_APPROVAL", "AUTHORIZED", "Procurement Lead", "USER", "Approved supplier claim.", hr(36));
  await ev(ex9007.id, "STATE_TRANSITION", "AUTHORIZED", "ACTION_SUBMITTED", "Action gateway", "SERVICE", "Claim sent via supplier portal; delivery receipt captured (M19: delivery evidence before 'supplier contacted').", hr(34));
  // EX-9010 cancelled duplicate
  await ev(ex9010.id, "STATE_TRANSITION", null, "DETECTED", "Duplicate-intake rule v1.1", "RULE", "Email PR-1011 matches PR-1007 (ref + line hash).", day(1));
  await ev(ex9010.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Linked to existing PR-1007.", day(1));
  await ev(ex9010.id, "STATE_TRANSITION", "TRIAGED", "CANCELLED", "Procurement Ops", "USER", "Confirmed duplicate; requester notified; no second PO.", hr(20));
  // EX-9004 investigating
  await ev(ex9004.id, "STATE_TRANSITION", null, "DETECTED", "Identity rule v1.0", "RULE", "AIS position for ONE COMMITMENT; no evidenced container-to-vessel link (conflict EX-9001 unresolved).", day(3));
  await ev(ex9004.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Vessel position displayed separately; container location UNRESOLVED.", day(3));
  await ev(ex9004.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Import Desk / L. Fonseca.", day(3));
  await ev(ex9004.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "L. Fonseca (Logistics)", "USER", "Requested booking copy from forwarder; awaiting manifest.", hr(24));
  // EX-9011 asset fault
  await ev(ex9011.id, "STATE_TRANSITION", null, "DETECTED", "BEARING_TEMP v2.0", "RULE", "Signal freshness + sensor health validated before fault assertion.", hr(18));
  await ev(ex9011.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Category ASSET_FAULT, severity CRITICAL.", hr(17));
  await ev(ex9011.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Maintenance Planning. WO-6002 auto-raised per approved policy.", hr(17));
  // EX-9003, EX-9001, EX-9002, EX-9008 minimal transitions
  await ev(ex9003.id, "STATE_TRANSITION", null, "DETECTED", "Freshness monitor v1.1", "RULE", "No carrier update > 96 h.", day(5));
  await ev(ex9003.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Category INTEGRATION.", day(5));
  await ev(ex9003.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Integration Ops on-call.", day(5));
  await ev(ex9001.id, "STATE_TRANSITION", null, "DETECTED", "BOL_PKGLIST_CONTAINER v1.2", "RULE", "HBL TEMU9911991 vs PL-8842 TEMU9911911.", hr(19));
  await ev(ex9002.id, "STATE_TRANSITION", null, "DETECTED", "MATCH_SUPPLIER_PO v1.2", "RULE", "No PO reference; supplier unknown.", day(4));
  await ev(ex9002.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Kept UNMATCHED — no force-link.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", null, "DETECTED", "BOL_AMENDMENT v1.1", "RULE", "v2 gross weight differs from v1 by 350 kg.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", "DETECTED", "TRIAGED", "Triage service", "SERVICE", "Amendment valid; awaiting source confirmation for closure.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", "TRIAGED", "ASSIGNED", "Routing rule v1.0", "RULE", "Import Desk.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", "ASSIGNED", "INVESTIGATING", "L. Fonseca (Logistics)", "USER", "Compared v1/v2 line by line; only weight changed.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", "INVESTIGATING", "ACTION_PROPOSED", "L. Fonseca (Logistics)", "USER", "Request confirmation from issuer.", day(4));
  await ev(ex9008.id, "STATE_TRANSITION", "ACTION_PROPOSED", "ACTION_SUBMITTED", "Action gateway", "SERVICE", "Confirmation request sent to forwarder (ACT-0002).", hr(50));
  await ev(ex9008.id, "STATE_TRANSITION", "ACTION_SUBMITTED", "OUTCOME_PENDING_VERIFICATION", "Action gateway", "SERVICE", "Awaiting issuer response; recompute scheduled on receipt.", hr(50));

  // ── Action commands + approvals (8.1 #22, M18) ──────────────────────────
  const act1 = await db.actionCommand.create({ data: { ref: "ACT-0001", caseId: ex9006.id, commandType: "request_bol_data", riskLevel: "SAFE", targetType: "supplier_and_forwarder", targetRef: "SUP-002 / SUP-007", payload: J({ to: ["export@rheinwerk.example", "ops@clff.example"], subject: "BOL MSC-4471 — container number required (PO-3002)", body: "Dear team, BOL MSC-4471 (12 crates, gross 21,400 kg, CMA CGM LHAYNE 094E) does not state a container number and packing list PL-7741 does not either. Please provide the correct container/seal details quoting BOL MSC-4471 and booking CN-55612. This is required to start container tracking. — NASS Import Desk" }), state: "AWAITING_APPROVAL", policyDecision: "ALLOW", policyRule: "EXT_COMMS v1.0 — external communication requires authorized-user approval", idempotencyKey: "act-0001-bol4471-followup", requestedBy: "L. Fonseca (Logistics)", createdAt: hr(28) } });
  const act2 = await db.actionCommand.create({ data: { ref: "ACT-0002", caseId: ex9008.id, commandType: "request_bol_data", riskLevel: "SAFE", targetType: "forwarder", targetRef: "SUP-007", payload: J({ to: ["ops@clff.example"], subject: "MSC-4472 v2 — confirm amended gross weight", body: "Please confirm amended gross weight 35,100 kg on BOL MSC-4472 v2." }), state: "PENDING_VERIFICATION", policyDecision: "ALLOW", policyRule: "EXT_COMMS v1.0", idempotencyKey: "act-0002-bol4472-confirm", requestedBy: "L. Fonseca (Logistics)", submittedAt: hr(50), ackAt: hr(49), postcondition: "Issuer confirms amended weight in writing — then recompute reconciliations idempotently.", createdAt: day(4) } });
  const act3 = await db.actionCommand.create({ data: { ref: "ACT-0003", caseId: ex9007.id, commandType: "claim", riskLevel: "SAFE", targetType: "supplier_portal", targetRef: "SUP-005", payload: J({ claimRef: "CLM-3320", lines: [{ sku: "MAT-PMP-45", short: 2, damaged: 2 }], evidence: ["grn5003/photo-01.jpg", "grn5003/photo-02.jpg"] }), state: "SUBMITTED", policyDecision: "ALLOW", policyRule: "SUPPLIER_CLAIM v1.2 — claim ≤ AED 25k auto-allowed with procurement approval", idempotencyKey: "act-0003-grn5003-claim", requestedBy: "R. Bello (Storekeeper)", approvalId: "approved", submittedAt: hr(34), ackAt: hr(33), postcondition: "Supplier acknowledges claim + disposition of 4 units confirmed.", createdAt: hr(40) } });
  await db.approval.create({ data: { actionId: act3.id, approver: "Procurement Lead", role: "Procurement", decision: "APPROVED", comment: "Claim amounts verified vs PO-3004.", at: hr(36) } });
  const act4 = await db.actionCommand.create({ data: { ref: "ACT-0004", caseId: ex9005.id, commandType: "po_amendment_proposal", riskLevel: "HIGH_RISK", targetType: "purchase_order", targetRef: "PO-3002", payload: J({ proposal: "Split delivery: release 40 t rebar partial with air-freight upgrade; reschedule balance by 8 days; chiller remains ocean.", impact: "Est. freight premium AED 96k — exceeds coordinator authority (limit AED 50k)" }), state: "CANCELLED", policyDecision: "REVIEW", policyRule: "PO_AMEND v1.0 — spend > AED 50k requires Director approval", idempotencyKey: "act-0004-po3002-amend", requestedBy: "N. Salem (Project Controls)", createdAt: hr(10) } });
  await db.approval.create({ data: { actionId: act4.id, approver: "Programme Director", role: "Director", decision: "REJECTED", comment: "Freight premium not authorized; hold for steel alternative from local market first.", at: hr(6) } });
  const act5 = await db.actionCommand.create({ data: { ref: "ACT-0005", caseId: ex9009.id, commandType: "open_count_task", riskLevel: "SAFE", targetType: "warehouse_task", targetRef: "WH-DIP", payload: J({ task: "Cycle count — cable drums LSZH bin B-02" }), state: "VERIFIED", policyDecision: "ALLOW", policyRule: "WAREHOUSE_TASK v1.0", idempotencyKey: "act-0005-count-cable", requestedBy: "A. Haddad (Storekeeper)", submittedAt: day(17), ackAt: day(17), postcondition: "WMS count task #CT-1142 verified closed with recount result = ledger.", verifiedAt: day(16), result: J({ wmsTaskId: "CT-1142", readBack: "CLOSED", countResult: "3 damaged drums confirmed" }), createdAt: day(18) } });
  await db.approval.create({ data: { actionId: act5.id, approver: "Warehouse Supervisor", role: "Warehouse", decision: "APPROVED", at: day(17) } });
  const act6 = await db.actionCommand.create({ data: { ref: "ACT-0006", caseId: ex9011.id, commandType: "replenish_part", riskLevel: "HIGH_RISK", targetType: "procurement_requisition", targetRef: "MAT-SEAL-K", payload: J({ sku: "MAT-SEAL-K", qty: 1, justification: "WO-6002 requires 2 kits; 1 on hand." }), state: "FAILED", policyDecision: "ALLOW", policyRule: "REQUISITION v1.1 — approved WO dependency", idempotencyKey: "act-0006-sealk-replenish", requestedBy: "Maintenance Planner", submittedAt: hr(12), failureReason: "ERP requisition API timeout after 3 retries (bounded retry budget). Result UNKNOWN/PENDING_RECONCILIATION — no blind retry of non-idempotent create; manual operator queue notified.", compensation: "Reconciliation query scheduled using idempotency key before any re-submit.", createdAt: hr(14) } });
  const act7 = await db.actionCommand.create({ data: { ref: "ACT-0007", caseId: ex9005.id, commandType: "draft_supplier_followup", riskLevel: "SAFE", targetType: "supplier", targetRef: "SUP-002", payload: J({ draft: "Query supplier promise drift on PO-3002 (evidence: proforma + carrier ETA observations)." }), state: "DRAFT", policyDecision: null, idempotencyKey: "act-0007-po3002-followup", requestedBy: "Procurement Lead", createdAt: hr(9) } });
  void act1; void act7;

  // ── Connectors (M23) ─────────────────────────────────────────────────────
  const conn = (name: string, category: string, mode: string, status: string, freshness: string, lastSync: Date | null, latency: number, failed: number, retry: number, dlq: number, quota: number | null, coverage: string, label: string) => db.connector.create({ data: { name, category, mode, status, freshnessClass: freshness, lastSyncAt: lastSync, latencyMs: latency, failedRecords: failed, retryQueue: retry, deadLetter: dlq, apiQuotaPct: quota, coverageNote: coverage, evidenceLabel: label } });
  await conn("NASS ERP adapter (PR/PO/GRN)", "ERP", "POLL", "HEALTHY", "fresh", min(12), 420, 0, 0, 0, 62, "Incremental poll every 15 min; cursor checkpointed after durable persistence.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("Ocean carrier tracking API", "CARRIER", "WEBHOOK", "OUTAGE", "stale", day(6), null, 3, 3, 1, null, "MSC + CMA CGM covered; Hapag-Lloyd outage since 6 d ago — bounded retries, DLQ holding 1.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("Forwarder portal (Coastal Logistics)", "FORWARDER", "POLL", "HEALTHY", "fresh", min(47), 890, 0, 0, 0, 41, "Booking + milestone feed, 30 min poll.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("AIS vessel position feed", "AIS", "POLL", "DEGRADED", "aging", hr(5), 1400, 1, 1, 0, 88, "Vessel positions only — never container positions (Rule 4).", "PUBLICLY EVIDENCED");
  await conn("Port community system (Jebel Ali)", "PORT", "BATCH", "HEALTHY", "fresh", hr(7), 2100, 0, 0, 0, null, "Berth windows + discharge events, hourly batch.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("Procurement mailbox intake", "EMAIL", "WEBHOOK", "HEALTHY", "fresh", min(4), 120, 0, 0, 0, null, "Controlled mailbox with rules; inbound treated as untrusted data (prompt-injection defense).", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("WMS stock ledger", "WMS", "POLL", "HEALTHY", "fresh", min(9), 210, 0, 0, 0, 55, "On-hand + reservations, 15 min poll.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("IoT/SCADA gateway", "IOT", "POLL", "DEGRADED", "stale", day(5), null, 14, 4, 2, null, "AST-CH-02 telemetry stale — data-health issue opened.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("Customs broker portal", "CUSTOMS", "MANUAL", "HEALTHY", "unavailable", null, null, 0, 0, 0, null, "Manual broker updates only — status labeled manually_reported; never implied clearance.", "REQUIRES CUSTOMER DATA/INTEGRATION");
  await conn("CMMS / maintenance system", "CMMS", "BATCH", "HEALTHY", "fresh", hr(3), 640, 0, 0, 0, null, "Work orders + inspections, 4 h batch.", "REQUIRES CUSTOMER DATA/INTEGRATION");

  // ── Notifications (M19) ──────────────────────────────────────────────────
  const notif = (caseId: string | null, channel: string, template: string, recipient: string, audience: string, state: string, at: Date, note?: string) => db.notification.create({ data: { caseId, channel, template, templateVersion: "v1.2", recipient, audienceType: audience, state, idempotencyKey: `ntf-${template}-${recipient}-${at.getTime()}`, urgency: "HIGH", at, note: note ?? null } });
  await notif(ex9006.id, "IN_APP", "case_assigned", "L. Fonseca (Logistics)", "INTERNAL", "DELIVERED", hr(50));
  await notif(ex9006.id, "EMAIL", "case_sla_warning", "import-desk@nass.example", "INTERNAL", "DELIVERED", hr(20), "SLA breach in 14 h.");
  await notif(ex9005.id, "EMAIL", "eta_slip_digest", "project-controls@nass.example", "INTERNAL", "DELIVERED", hr(9), "Digest — grouped with EX-9012 (no duplicate notifications during retries, M19).");
  await notif(ex9007.id, "SUPPLIER_PORTAL", "claim_submitted", "SUP-005 service desk", "EXTERNAL", "DELIVERED", hr(34), "Delivery receipt captured before 'supplier contacted' state (M19).");
  await notif(ex9003.id, "EMAIL", "connector_outage", "integration-oncall@nass.example", "INTERNAL", "FAILED", day(5), "SMTP 451 temporary failure — retried idempotently; fallback SMS routed.", );
  await notif(ex9003.id, "SMS_WHATSAPP", "connector_outage_fallback", "+971-5x-xxx-oncall", "INTERNAL", "SENT", hr(40), "Fallback route per escalation policy v1.0 (consent-allowed channel).");
  await notif(ex9011.id, "IN_APP", "wo_parts_pending", "Maintenance Planner", "INTERNAL", "DELIVERED", hr(16));
  await notif(ex9002.id, "IN_APP", "bol_unmatched", "Import Desk queue", "INTERNAL", "DELIVERED", day(4));
  await notif(ex9005.id, "EMAIL", "action_rejected", "n.salem@nass.example", "INTERNAL", "BOUNCED", hr(5), "Mailbox full — recipient validation flagged for review.");

  // ── Source evidence (8.1 #21) ────────────────────────────────────────────
  const evd = (entityType: string, entityId: string, entityRef: string, sourceSystem: string, sourceRef: string | null, hash: string | null, issuer: string, received: Date, label: string, retention = "STANDARD", note?: string) => db.sourceEvidence.create({ data: { entityType, entityId, entityRef, sourceSystem, sourceRef, contentHash: hash, issuer, receivedAt: received, label, retentionClass: retention, note } });
  await evd("bol", bolA.id, "MSC-4471", "email_intake", "mailbox://docs/bol4471.eml", "sha256:aa11…bol4471", "MSC via forwarder", day(12), "ORIGINAL", "LEGAL_HOLD", "Immutable original — 12 pages, OCR layer separate artifact.");
  await evd("bol", bolB.id, "PMC-2210", "portal_upload", "portal://coastal/2210", "sha256:bb22…bol2210", "Coastal Logistics portal", day(9), "ORIGINAL");
  await evd("packing_list", "PL-8842", "PL-8842", "email_intake", "mailbox://docs/pl8842.eml", "sha256:pl8842", "Pacific Marine Components", day(10), "ORIGINAL");
  await evd("eta", "SHP-8802", "SHP-8802 carrier ETA", "carrier_api", "CMA-88240", null, "CMA CGM tracking API", hr(26), "DERIVED", "STANDARD", "ETA observation with source + calculation time (Rule 9).");
  await evd("telemetry", "AST-AHU-05", "bearing_temp series", "iot_gateway", "device://ahu05/bearing", null, "IoT gateway", min(45), "DERIVED", "STANDARD", "Raw payload hash retained at ingestion.");
  await evd("supplier_commitment", "SUP-002", "Rheinwerk proforma ETA +4 d", "email_intake", "mailbox://docs/proforma7741.eml", "sha256:prof7741", "Rheinwerk export desk", day(20), "ORIGINAL", "LEGAL_HOLD");
  await evd("customs", "SHP-8805", "Customs hold (manual)", "broker_portal", null, null, "Broker F. Al Ali", hr(20), "ORIGINAL", "STANDARD", "Manual source — customs platform not connected.");
  await evd("grn", "GRN-5003", "GRN-5003 damage photos", "mobile_app", null, "sha256:grn5003set", "R. Bello (Storekeeper)", day(2), "ORIGINAL");

  // ── Audit events (8.1 #24, M22) — append-only ────────────────────────────
  const aud = (actor: string, actorType: string, action: string, entityType: string, entityId: string, entityRef: string, prev: string | null, next: string | null, reason: string | null, corr: string | null, rule: string | null, at: Date) => db.auditEvent.create({ data: { actor, actorType, action, entityType, entityId, entityRef, previousState: prev, newState: next, diff: prev && next ? J({ from: prev, to: next }) : null, reason, correlationId: corr, ruleVersion: rule, at } });
  await aud("doc-intake", "SERVICE", "DOCUMENT_RECEIVED", "bol", bolA.id, "MSC-4471", null, "RECEIVED", "Email intake with content hash", "corr-4471", "intake v2.0", day(12));
  await aud("ocr-layout-v3.2", "SERVICE", "FIELDS_EXTRACTED", "bol", bolA.id, "MSC-4471", null, "PARSED", "7 fields extracted with page provenance; container_number FAIL", "corr-4471", "extract v1.8", day(12));
  await aud("REQ_CONTAINER_NUMBER v1.2", "RULE", "CASE_CREATED", "exception_case", ex9006.id, "EX-9006", null, "DETECTED", "Required field missing", "corr-4471", "v1.2", day(3));
  await aud("L. Fonseca (Logistics)", "USER", "BOL_FIELD_CORRECTION", "bol_field", `${bolC.id}:gross_weight_kg`, "MSC-4472 v2", "34750", "35100", "Carrier amendment v2 received; correction stored separately, extracted value retained", "corr-4472", "BOL_AMENDMENT v1.1", day(4));
  await aud("Procurement Lead", "USER", "APPROVAL_GRANTED", "action", act3.id, "ACT-0003", "AWAITING_APPROVAL", "AUTHORIZED", "Claim ≤ threshold", "corr-9007", "SUPPLIER_CLAIM v1.2", hr(36));
  await aud("Programme Director", "USER", "APPROVAL_REJECTED", "action", act4.id, "ACT-0004", "AWAITING_APPROVAL", "CANCELLED", "Freight premium exceeds authority", "corr-9005", "PO_AMEND v1.0", hr(6));
  await aud("Finance read-back", "SERVICE", "ACTION_VERIFIED", "action", act5.id, "ACT-0005", "PENDING_VERIFICATION", "VERIFIED", "WMS task CT-1142 read back CLOSED", "corr-9009", null, day(16));
  await aud("system", "SYSTEM", "DEDUPE_REJECTED", "grn", "GRN-5004", "WMS-GR-9912", null, null, "Duplicate webhook ignored via idempotency key", "corr-5004", "intake v2.0", day(6));
  await aud("webhook-wms", "SERVICE", "STOCK_DELTA_APPLIED", "inventory_lot", "LOT-CEM-1180", "WH-SHJ", "1200", "830", "1200 bags received less 370 issued (valid movement doc)", "corr-5001", "ledger v1.4", hr(20));
  await aud("Policy engine v1.0", "SERVICE", "POLICY_DECISION", "action", act1.id, "ACT-0001", null, "ALLOW", "External comms need approval — routed to approval", "corr-4471", "EXT_COMMS v1.0", hr(28));

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
