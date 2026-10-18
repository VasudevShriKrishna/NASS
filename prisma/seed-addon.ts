/**
 * NASS Group Live Project Intelligence, Imported Materials & CEO Decision Tower Seed Add-on.
 *
 * Implements Section 3–11:
 * - 18 NASS Group business units & corporate divisions
 * - 6 Projects (5 confirmed active + 1 historical completed) with contractual scopes & work packages
 * - Importers, manufacturers & partner brands (Master Builders Solutions, Hyundai Elevators, CASE, SCHWING, Sarens, Dona Marine)
 * - Material weights hierarchy (net, gross, tare, measured weighbridge, engineering calculated)
 * - Price intelligence & landed cost comparisons (PO price vs market benchmark)
 * - Equipment & heavy machinery register (500t/600t cranes, excavators, pumps, pavers, SPMTs)
 * - 10-point structured CEO decision recommendations
 */
import { PrismaClient } from "@prisma/client";

export async function seedAddon(db: PrismaClient) {
  console.log("Seeding NASS Live Project Intelligence & CEO Decision Control Layer…");

  const NOW = Date.now();
  const min = (n: number) => new Date(NOW - n * 60_000);
  const hr = (n: number) => new Date(NOW - n * 3_600_000);
  const inHours = (n: number) => new Date(NOW + n * 3_600_000);
  const day = (n: number) => new Date(NOW - n * 86_400_000);
  const inDays = (n: number) => new Date(NOW + n * 86_400_000);
  const J = (o: unknown) => JSON.stringify(o);

  // ── 1. Clear Add-on Tables ─────────────────────────────────────────────────
  await db.ceoDecisionRecommendation.deleteMany();
  await db.equipmentAsset.deleteMany();
  await db.priceBenchmark.deleteMany();
  await db.projectWorkPackage.deleteMany();

  // ── 2. Comprehensive NASS Corporate Footprint (18 Entities) ───────────────
  const nassUnits = [
    { code: "NASS-CORP", name: "Nass Corporation B.S.C. (Closed)", country: "BH", role: "Public listed industrial & construction holding", division: "Corporate / Holding", parentCompany: "NASS The Group", capabilities: J(["Corporate governance", "Capital allocation", "Subsidiary oversight", "Financial treasury"]) },
    { code: "NASS-CON", name: "Nass Contracting W.L.L.", country: "BH", role: "Main civil, infrastructure & marine contractor", division: "Civil & Infrastructure", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["EPC contracting", "Highway flyovers", "Marine civil works", "Hospital & commercial structures"]) },
    { code: "NASS-COM", name: "Nass Commercial / Commercial Services", country: "BH", role: "Heavy construction equipment & machinery distributor", division: "Commercial & Trading", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["CASE excavator distribution", "SCHWING concrete pumps", "Spare parts logistics", "Equipment workshop"]) },
    { code: "NASS-INT", name: "Nass International Trading", country: "BH", role: "Vertical transportation & material handling systems", division: "Commercial & Trading", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Hyundai Elevator distribution", "Escalator installation", "Automated parking systems", "Elevator maintenance"]) },
    { code: "NASS-BBC", name: "Bahrain Building Chemicals W.L.L.", country: "BH", role: "Construction chemicals, repair & waterproofing systems", division: "Industrial & Manufacturing", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Master Builders Solutions distributor", "BASF construction systems", "Elastomeric waterproofing", "Concrete admixtures"]) },
    { code: "NASS-DMC", name: "Delmon Ready-Mixed Concrete", country: "BH", role: "Commercial ready-mix concrete production & delivery", division: "Industrial & Manufacturing", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Computerized batching plants", "High-performance concrete C50/C60", "Transit mixer fleet", "Concrete quality testing"]) },
    { code: "NASS-DPC", name: "Delmon Precast", country: "BH", role: "Structural & architectural precast concrete manufacturer", division: "Industrial & Manufacturing", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Precast bridge box girders", "Box culverts", "Precast boundary walls", "Hollow-core slabs"]) },
    { code: "NASS-ASP", name: "Nass Asphalt", country: "BH", role: "Asphalt production, road surfacing & highway paving", division: "Civil & Infrastructure", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Asphalt batching plant", "Highway base & wearing course", "Falcon Interchange paving", "Road profiling"]) },
    { code: "NASS-IND", name: "Nass Industrial Services & Mechanical", country: "BH", role: "Heavy mechanical fabrication, piping spools & steelworks", division: "Industrial & Manufacturing", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Piping spool fabrication", "Pressure vessels", "Structural steel fabrication", "Plant turnaround maintenance"]) },
    { code: "NASS-ELE", name: "Nass Electrical", country: "BH", role: "Electrical contracting, substations & cabling", division: "Civil & Infrastructure", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["11kV/66kV Substation installation", "High-mast lighting", "Airside electrical cabling", "Switchgear commissioning"]) },
    { code: "NASS-SCF", name: "Nass Scafform", country: "BH", role: "Scaffolding, falsework & formwork systems", division: "Civil & Infrastructure", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Cuplock scaffolding", "Heavy-duty bridge falsework", "Climbing wall formwork", "Safety decking"]) },
    { code: "NASS-MAR", name: "Nass Marine Services", country: "BH", role: "Shipyard, marine vessel repair & slipway operations", division: "Marine & Bulk Materials", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Tug & barge dry-docking", "Slipway ship repair", "Marine steel hull welding", "Pontoon fabrication"]) },
    { code: "NASS-LND", name: "Nass Landscapes", country: "BH", role: "Landscape architecture, urban beautification & irrigation", division: "Civil & Infrastructure", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Hardscape paving", "Softscape planting", "Automated smart irrigation", "Boulevard landscaping"]) },
    { code: "NASS-BBT", name: "Bahrain Bulk Trade W.L.L.", country: "BH", role: "Aggregates, gabbro & bulk minerals importer", division: "Marine & Bulk Materials", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Gabbro aggregate import from UAE", "Limestone supply", "Hidd Jetty bulk discharge", "Bulk inventory stockpiling"]) },
    { code: "NASS-DON", name: "Dona Marine", country: "BH", role: "Marine bulk transport, tugs & aggregate flat-top barges", division: "Marine & Bulk Materials", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Fujairah-Hidd marine barge route", "Ocean tug operations", "Flat-top aggregate barges", "Marine cargo logistics"]) },
    { code: "NASS-SNI", name: "Nass Sand Processing Plant & Ice Plant", country: "BH", role: "Washed marine sand & concrete thermal cooling ice", division: "Industrial & Manufacturing", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Marine sand washing & screening", "Flake ice for hot-weather concrete", "Aggregate temperature control"]) },
    { code: "NASS-UCC", name: "United Cement Company (UCC)", country: "BH", role: "Bulk cement import, storage & distribution", division: "Marine & Bulk Materials", parentCompany: "Nass Corporation B.S.C.", capabilities: J(["Pneumatic bulk cement silos", "OPC / SRC cement import", "Bulk tanker distribution", "Bagged cement storage"]) },
    { code: "NASS-SNM", name: "Sarens Nass Middle East W.L.L.", country: "BH", role: "Joint venture for heavy lifting, cranes & SPMT transport", division: "Civil & Infrastructure", parentCompany: "Joint Venture (Nass + Sarens NV)", capabilities: J(["600t Demag CC 2800 crawler crane", "500t Liebherr LTM 1500 mobile crane", "Kamag 24-axle SPMT", "Engineered heavy lift plans"]) },
  ];

  for (const u of nassUnits) {
    await db.legalEntity.upsert({
      where: { code: u.code },
      update: {
        name: u.name,
        country: u.country,
        role: u.role,
        division: u.division,
        parentCompany: u.parentCompany,
        status: "ACTIVE",
        capabilities: u.capabilities,
      },
      create: {
        code: u.code,
        name: u.name,
        country: u.country,
        role: u.role,
        division: u.division,
        parentCompany: u.parentCompany,
        status: "ACTIVE",
        capabilities: u.capabilities,
      },
    });
  }

  // ── 3. Public Project Portfolio Register (5 Confirmed Active + 1 Historical) ─
  const leCon = await db.legalEntity.findUnique({ where: { code: "NASS-CON" } });
  const leInd = await db.legalEntity.findUnique({ where: { code: "NASS-IND" } });

  const projectsData = [
    {
      code: "PRJ-BIA-01",
      name: "Bahrain International Airport Access Improvement (Arad Highway Stage 3 / Falcon Flyover)",
      site: "Falcon Interchange & Arad Highway, Muharraq, Bahrain",
      legalEntityId: leCon!.id,
      client: "Ministry of Works, Kingdom of Bahrain",
      contractValue: 24850000,
      currency: "BHD",
      scopeDescription: "Stage 3, Phase 1 Arad Highway transformation through Falcon Interchange, including reclamation for a new 398m dual-carriageway flyover connecting Arad Highway and Khalifa Al Khabeer Highway, a bridge over Arab Bay, pedestrian access, noise barriers, intelligent transport systems (ITS), utility diversions, storm drainage and high-mast street lighting.",
      statusClassification: "CONFIRMED_ACTIVE",
      status: "ACTIVE",
      workPackage: "Civil, Bridge & Highways",
      costCode: "CC-BIA-398",
      startDate: day(180),
      completionDate: inDays(360),
      plannedProgressPct: 48.5,
      actualProgressPct: 46.2,
      phases: J([
        { phase: "Phase 1A", name: "Site Clearance & Utility Diversions", status: "COMPLETED" },
        { phase: "Phase 1B", name: "Arab Bay Bridge Piling & Substructure", status: "COMPLETED" },
        { phase: "Phase 2A", name: "398m Dual Flyover Superstructure & Steel Girders", status: "IN_PROGRESS" },
        { phase: "Phase 2B", name: "Arad Highway Roadbase & Asphalt Surfacing", status: "IN_PROGRESS" },
        { phase: "Phase 3", name: "ITS, High-Mast Lighting & Landscaping", status: "PLANNED" },
      ]),
    },
    {
      code: "PRJ-RAF-02",
      name: "Al Raffa Land Development (102 Hectares Phase 1 & 2 Boulevard Infrastructure)",
      site: "Between Sh. Khalifa Bin Salman Highway and Zallaq Highway, Southern Governorate, Bahrain",
      legalEntityId: leCon!.id,
      client: "Ministry of Housing and Urban Planning, Kingdom of Bahrain",
      contractValue: 18200000,
      currency: "BHD",
      scopeDescription: "Phase 1 bulk earthworks covering 102 hectares between Sh. Khalifa Bin Salman Hwy and Zallaq Hwy. Phase 2 Block 947 focuses on boulevard road infrastructure, primary stormwater detention basins, potable water distribution trunks, telecommunication duct banks and heavy roadbase pavement.",
      statusClassification: "CONFIRMED_ACTIVE",
      status: "ACTIVE",
      workPackage: "Earthworks & Boulevard Infrastructure",
      costCode: "CC-RAF-102",
      startDate: day(240),
      completionDate: inDays(280),
      plannedProgressPct: 62.0,
      actualProgressPct: 61.4,
      phases: J([
        { phase: "Phase 1", name: "102 Hectares Bulk Earthworks & Deep Compaction", status: "COMPLETED" },
        { phase: "Phase 2A", name: "Block 947 Boulevard Trunk Roadbase & Kerbs", status: "IN_PROGRESS" },
        { phase: "Phase 2B", name: "Stormwater Detention & Gravity Drainage", status: "IN_PROGRESS" },
        { phase: "Phase 2C", name: "Final Asphalt Wearing Course & Street Lighting", status: "PLANNED" },
      ]),
    },
    {
      code: "PRJ-KAMC-03",
      name: "King Abdullah bin Abdulaziz Medical City (KAMC Hospital & Academic Center)",
      site: "King Abdullah Medical City Campus, Southern Governorate, Bahrain",
      legalEntityId: leCon!.id,
      client: "Arabian Gulf University (AGU) / Saudi Fund for Development (SFD)",
      contractValue: 75000000,
      currency: "BHD",
      scopeDescription: "Major 288-bed tertiary hospital and academic medical center in Bahrain, financed by the Saudi Fund for Development under Arabian Gulf University leadership. Scope includes deep substructure waterproofing, post-tensioned structural slabs, central utility plant, medical gas piping, 11kV substation, and vertical transportation systems.",
      statusClassification: "CONFIRMED_ACTIVE",
      status: "ACTIVE",
      workPackage: "Hospital Main Structure & MEP",
      costCode: "CC-KAMC-75",
      startDate: day(300),
      completionDate: inDays(450),
      plannedProgressPct: 38.0,
      actualProgressPct: 35.8,
      phases: J([
        { phase: "Package 1", name: "Substructure, Foundation Raft & Groundwater Waterproofing", status: "COMPLETED" },
        { phase: "Package 2", name: "Multi-Storey Hospital Frame & Concrete Cores", status: "IN_PROGRESS" },
        { phase: "Package 3", name: "Central Utility Plant, Chillers & Electrical Substation", status: "IN_PROGRESS" },
        { phase: "Package 4", name: "Hyundai Hospital Bed Lifts & Vertical Transport", status: "PROCUREMENT" },
        { phase: "Package 5", name: "Interior Fit-out & Medical Systems", status: "PLANNED" },
      ]),
    },
    {
      code: "PRJ-2201",
      name: "Bahrain Marina Development (Phase 1 Main Works — Boardwalk, Marina Tower & Retail)",
      site: "Bahrain Marina Waterfront, Plot MW-4, Manama, Bahrain",
      legalEntityId: leCon!.id,
      client: "Bahrain Marina Development Company",
      contractValue: 48500000,
      currency: "BHD",
      scopeDescription: "Phase 1 Main Works comprising waterfront infrastructure and utility buildings, retail districts, family entertainment center, waterfront food-and-beverage boardwalk, multi-storey luxury apartment tower, private yacht club, floating berths and marine revetments.",
      statusClassification: "CONFIRMED_ACTIVE",
      status: "ACTIVE",
      workPackage: "Structural + Waterfront Civil + MEP",
      costCode: "CC-7781",
      startDate: day(320),
      completionDate: inDays(380),
      plannedProgressPct: 54.0,
      actualProgressPct: 52.8,
      phases: J([
        { phase: "Phase 1A", name: "Marine Edge Revetment, Quay Wall & Boardwalk", status: "COMPLETED" },
        { phase: "Phase 1B", name: "Marina Apartment Tower Superstructure & Fit-out", status: "IN_PROGRESS" },
        { phase: "Phase 1C", name: "Waterfront Retail & Entertainment Pavilion", status: "IN_PROGRESS" },
        { phase: "Phase 1D", name: "Yacht Club Building & Marine Utilities", status: "PROCUREMENT" },
      ]),
    },
    {
      code: "PRJ-RCSI-05",
      name: "RCSI Campus Building Expansion & Auditorium",
      site: "RCSI Bahrain Campus, Busaiteen, Muharraq, Bahrain",
      legalEntityId: leCon!.id,
      client: "Royal College of Surgeons in Ireland — Medical University of Bahrain",
      contractValue: 14300000,
      currency: "BHD",
      scopeDescription: "Demolition and modification of existing campus buildings, construction of a new academic campus block, state-of-the-art medical auditorium, architectural steel link bridges, specialized laboratories and exterior hard/soft landscaping.",
      statusClassification: "CONFIRMED_ACTIVE",
      status: "ACTIVE",
      workPackage: "Academic Block, Auditorium & Link Bridges",
      costCode: "CC-RCSI-14",
      startDate: day(150),
      completionDate: inDays(210),
      plannedProgressPct: 71.0,
      actualProgressPct: 69.5,
      phases: J([
        { phase: "Phase 1", name: "Enabling Works & Existing Campus Modification", status: "COMPLETED" },
        { phase: "Phase 2", name: "Auditorium & Academic Block Superstructure", status: "COMPLETED" },
        { phase: "Phase 3", name: "Structural Steel Link Bridges & Facade Glazing", status: "IN_PROGRESS" },
        { phase: "Phase 4", name: "Medical Laboratories & Interior Fit-out", status: "IN_PROGRESS" },
      ]),
    },
    {
      code: "PRJ-ALBA-06",
      name: "Aluminium Bahrain (Alba) Potline 6 Expansion & Smelter Civil Works",
      site: "Alba Smelter Complex, Askar, Bahrain",
      legalEntityId: leInd!.id,
      client: "Aluminium Bahrain B.S.C. (Alba)",
      contractValue: 52000000,
      currency: "BHD",
      scopeDescription: "Major industrial smelter expansion historically delivered by NASS Industrial and Nass Contracting. Included massive reinforced concrete foundations for reduction potlines, precast anode pits, heavy industrial structural steel fabrication, and refractory lining spools.",
      statusClassification: "HISTORICAL_COMPLETED",
      status: "COMPLETED",
      workPackage: "Industrial Foundations & Heavy Steelwork",
      costCode: "CC-ALBA-P6",
      startDate: day(1200),
      completionDate: day(400),
      plannedProgressPct: 100.0,
      actualProgressPct: 100.0,
      phases: J([
        { phase: "Phase 1", name: "Potline Civil Foundations & Precast Pits", status: "COMPLETED" },
        { phase: "Phase 2", name: "Heavy Steel Fabrication & Pipe Spools", status: "COMPLETED" },
        { phase: "Phase 3", name: "Smelter Commissioning & Handover", status: "COMPLETED" },
      ]),
    },
  ];

  for (const p of projectsData) {
    const proj = await db.project.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        site: p.site,
        legalEntityId: p.legalEntityId,
        client: p.client,
        contractValue: p.contractValue,
        currency: p.currency,
        scopeDescription: p.scopeDescription,
        statusClassification: p.statusClassification,
        status: p.status,
        workPackage: p.workPackage,
        costCode: p.costCode,
        startDate: p.startDate,
        completionDate: p.completionDate,
        plannedProgressPct: p.plannedProgressPct,
        actualProgressPct: p.actualProgressPct,
        phases: p.phases,
      },
      create: {
        code: p.code,
        name: p.name,
        site: p.site,
        legalEntityId: p.legalEntityId,
        client: p.client,
        contractValue: p.contractValue,
        currency: p.currency,
        scopeDescription: p.scopeDescription,
        statusClassification: p.statusClassification,
        status: p.status,
        workPackage: p.workPackage,
        costCode: p.costCode,
        startDate: p.startDate,
        completionDate: p.completionDate,
        plannedProgressPct: p.plannedProgressPct,
        actualProgressPct: p.actualProgressPct,
        phases: p.phases,
      },
    });

    // ── Seed Work Packages for each project ──────────────────────────────────
    const packagesByProject: Record<string, { code: string; name: string; scope: string; budget: number }[]> = {
      "PRJ-BIA-01": [
        { code: "WP-BIA-FLY", name: "398m Dual Flyover & Arab Bay Bridge", scope: "Bridge pot bearings, expansion joints, precast box girders, post-tensioning steel", budget: 11200000 },
        { code: "WP-BIA-RD", name: "Arad Highway & Falcon Interchange Roadworks", scope: "Gabbro aggregate roadbase, asphalt base course, PMB asphalt wearing course, concrete barriers", budget: 7400000 },
        { code: "WP-BIA-DRN", name: "Storm Drainage & Utility Relocation", scope: "Reinforced concrete drainage pipes Ø600-1200mm, manholes, culverts, utility conduits", budget: 3800000 },
        { code: "WP-BIA-ITS", name: "Intelligent Transport & High-Mast Lighting", scope: "LED high-mast luminaires, traffic surveillance cameras, dynamic message signage, power cabling", budget: 2450000 },
      ],
      "PRJ-RAF-02": [
        { code: "WP-RAF-EW", name: "102 Hectares Bulk Earthworks & Ground Engineering", scope: "Bulk cut-and-fill, subgrade stabilization, non-woven geotextile separation, vibratory compaction", budget: 7600000 },
        { code: "WP-RAF-BLV", name: "Block 947 Boulevard Infrastructure & Paving", scope: "Granular roadbase class A, precast concrete kerbs, heavy asphalt pavement, pedestrian walkways", budget: 6200000 },
        { code: "WP-RAF-UTL", name: "Primary Water & Stormwater Retention Trunk Lines", scope: "Ductile iron water pipes, stormwater attenuation ponds, electrical utility service corridors", budget: 4400000 },
      ],
      "PRJ-KAMC-03": [
        { code: "WP-KAMC-SUB", name: "Substructure & Groundwater Chloride Protection", scope: "MasterSeal 588 waterproofing membrane, high-sulfate resistant concrete C40/SRC, B500B rebar", budget: 14500000 },
        { code: "WP-KAMC-STR", name: "288-Bed Hospital Multi-Storey Superstructure", scope: "Cast-in-place concrete columns, post-tensioned floor slabs, shear cores, precast cladding panels", budget: 28500000 },
        { code: "WP-KAMC-MEP", name: "Central Utility Plant & Mechanical Infrastructure", scope: "Water-cooled screw chillers (Rheinwerk), 11kV gas-insulated switchgear, pumps, medical gas lines", budget: 21000000 },
        { code: "WP-KAMC-VT", name: "Vertical Transportation & Hospital Bed Lifts", scope: "Hyundai passenger & bed elevators, machine-room-less traction elevators, clean-room finishes", budget: 11000000 },
      ],
      "PRJ-2201": [
        { code: "WP-MAR-STR", name: "Marina Apartment Tower Superstructure", scope: "Structural steel S355JR columns, rebar B500B Ø16-32mm, concrete podium deck, basement retaining wall", budget: 24500000 },
        { code: "WP-MAR-FAC", name: "Waterfront Facade & Marine Weatherproofing", scope: "Marine-grade double glazed curtain walling, aluminum composite panels, elastomeric joint sealants", budget: 12800000 },
        { code: "WP-MAR-YCT", name: "Yacht Club, Boardwalk & Marine Pontoons", scope: "Timber composite boardwalk, aluminum floating docks, marine utility pedestals, revetment works", budget: 11200000 },
      ],
      "PRJ-RCSI-05": [
        { code: "WP-RCSI-AUD", name: "Medical Auditorium & Academic Block Structure", scope: "Acoustic auditorium walls, tiered seating raked slabs, precast architectural facades", budget: 8200000 },
        { code: "WP-RCSI-BRG", name: "Architectural Steel Link Bridges & Lab Infrastructure", scope: "Prefabricated steel truss bridges connecting existing campus, specialized laboratory fume hoods", budget: 6100000 },
      ],
      "PRJ-ALBA-06": [
        { code: "WP-ALBA-FS", name: "Potline Foundations & Anode Pits (Historical)", scope: "Heavy equipment concrete foundations, refractory linings, industrial drainage sumps", budget: 32000000 },
        { code: "WP-ALBA-STL", name: "Heavy Industrial Steel & Piping Spools (Historical)", scope: "Structural steel trusses, fume treatment ducting, high-pressure utility piping spools", budget: 20000000 },
      ],
    };

    const pkgs = packagesByProject[p.code] || [];
    for (const pkg of pkgs) {
      await db.projectWorkPackage.upsert({
        where: { projectId_code: { projectId: proj.id, code: pkg.code } },
        update: {
          name: pkg.name,
          scope: pkg.scope,
          budgetBhd: pkg.budget,
          status: p.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
        },
        create: {
          projectId: proj.id,
          code: pkg.code,
          name: pkg.name,
          scope: pkg.scope,
          budgetBhd: pkg.budget,
          status: p.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
          owner: "NASS Project Controls",
        },
      });
    }
  }

  // ── 4. Importers, Manufacturers & Partner Brands (Section 4) ───────────────
  const partners = [
    {
      code: "SUP-BBC-01",
      name: "Bahrain Building Chemicals W.L.L. (Master Builders Solutions / BASF)",
      aliases: J(["Master Builders Solutions Bahrain", "BBC BASF", "Master Builders"]),
      country: "BH",
      city: "Mina Salman / Sitra",
      status: "APPROVED",
      categories: J(["Construction chemicals", "Concrete admixtures", "Waterproofing", "Repair mortars"]),
      incoterms: "DAP Project Site",
      leadTimeDays: 5,
      paymentTerms: "Net 45",
      relationshipType: "BRAND_REPRESENTATION",
      brandRepresented: "Master Builders Solutions (formerly BASF Construction Chemicals)",
      tradeRoute: "Local Bahrain Formulation Plant & GCC Distribution (Dammam-King Fahd Causeway)",
      certifications: J([{ name: "ISO 9001:2015", expiresAt: inDays(340).toISOString() }, { name: "BBA Waterproofing Certification", expiresAt: inDays(400).toISOString() }]),
      contacts: J([{ name: "K. Al Saffar", role: "Technical Director", email: "tech@bbc-solutions.example" }]),
    },
    {
      code: "SUP-HYU-01",
      name: "Nass International Trading (Hyundai Elevators Co. Ltd.)",
      aliases: J(["Hyundai Elevator Bahrain", "Nass Hyundai Trading"]),
      country: "KR",
      city: "Seoul / Chungju (Bahrain Agency)",
      status: "APPROVED",
      categories: J(["Elevators", "Escalators", "Automated parking", "Vertical transportation"]),
      incoterms: "CIF KBSP",
      leadTimeDays: 70,
      paymentTerms: "LC 60 Days",
      relationshipType: "PREFERRED_SUPPLIER",
      brandRepresented: "Hyundai Elevators Co. Ltd. (South Korea)",
      tradeRoute: "Busan, KR to Khalifa Bin Salman Port (KBSP), Bahrain (Trans-Oceanic Container Route)",
      certifications: J([{ name: "EN 81-20/50 Safety Standard", expiresAt: inDays(500).toISOString() }, { name: "CE Lift Directive", expiresAt: inDays(450).toISOString() }]),
      contacts: J([{ name: "J. H. Park", role: "Middle East Export Director", email: "park.jh@hyundaielevator.example" }]),
    },
    {
      code: "SUP-CS-01",
      name: "Nass Commercial (CASE & SCHWING Construction Machinery)",
      aliases: J(["Nass Case Commercial", "Schwing Stetter Bahrain", "Nass Heavy Machinery"]),
      country: "DE",
      city: "Herne / Ulm (Bahrain Workshop)",
      status: "APPROVED",
      categories: J(["Heavy earthmoving", "Hydraulic excavators", "Truck concrete boom pumps", "Batching plants"]),
      incoterms: "CIF KBSP / Local Yard Delivery",
      leadTimeDays: 45,
      paymentTerms: "Net 60",
      relationshipType: "BRAND_REPRESENTATION",
      brandRepresented: "CASE Construction Equipment (CNH) & SCHWING-Stetter (Germany)",
      tradeRoute: "Bremerhaven/Hamburg to KBSP or Local Central Equipment Yard (Askar)",
      certifications: J([{ name: "CE Machinery Directive", expiresAt: inDays(600).toISOString() }, { name: "ISO 9001 Equipment QA", expiresAt: inDays(320).toISOString() }]),
      contacts: J([{ name: "M. Schneider", role: "Equipment Director", email: "schneider@nasscommercial.example" }]),
    },
    {
      code: "SUP-SNM-01",
      name: "Sarens Nass Middle East W.L.L. (Sarens NV Joint Venture)",
      aliases: J(["Sarens Nass", "Sarens Middle East", "Sarens Crane Services"]),
      country: "BH",
      city: "Hidd Industrial Area, Bahrain",
      status: "APPROVED",
      categories: J(["Heavy lifting", "Crawler cranes", "All-terrain mobile cranes", "Engineered transport (SPMT)"]),
      incoterms: "Mobilized to Site (Full Rigging & Engineered Lifting)",
      leadTimeDays: 7,
      paymentTerms: "Net 30",
      relationshipType: "JOINT_VENTURE",
      brandRepresented: "Sarens NV (Wolvertem, Belgium) / Nass Group JV",
      tradeRoute: "Local Bahrain Fleet & Saudi Causeway Heavy Mobilization Route",
      certifications: J([{ name: "LEEA Lifting Equipment Engineers Assoc.", expiresAt: inDays(280).toISOString() }, { name: "ISO 45001 Safety Management", expiresAt: inDays(360).toISOString() }]),
      contacts: J([{ name: "Philippe De Smet", role: "Chief Rigging Engineer", email: "desmet@sarensnass.example" }]),
    },
    {
      code: "SUP-BBT-01",
      name: "Bahrain Bulk Trade W.L.L. & Dona Marine (UAE Aggregate Marine Logistics)",
      aliases: J(["Dona Marine Aggregates", "Nass Bulk Aggregate Jetty", "BBT Stevin Rock"]),
      country: "AE",
      city: "Ras Al Khaimah / Fujairah (Jetty: Hidd, BH)",
      status: "APPROVED",
      categories: J(["Crushed gabbro aggregate", "Limestone 0-5mm, 10mm, 20mm", "Marine bulk transport", "Roadbase aggregates"]),
      incoterms: "FOB Mina Saqr / CIF Hidd Bulk Aggregate Jetty",
      leadTimeDays: 3,
      paymentTerms: "Net 30",
      relationshipType: "VERIFIED_COMMERCIAL",
      brandRepresented: "Stevin Rock LLC / RAK Rock (UAE Quarries) & Dona Marine Tugs",
      tradeRoute: "Mina Saqr / Fujairah, UAE via Arabian Gulf to NASS Aggregate Jetty, Hidd, Bahrain (Dedicated Flat-Top Barge Route)",
      certifications: J([{ name: "Ministry of Works Approved Aggregate Quarry", expiresAt: inDays(180).toISOString() }, { name: "ASTM C33 Petrographic Analysis", expiresAt: inDays(240).toISOString() }]),
      contacts: J([{ name: "Capt. A. Nair", role: "Marine Fleet & Quarry Operations Lead", email: "nair@donamarine.example" }]),
    },
  ];

  for (const s of partners) {
    await db.supplier.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        aliases: s.aliases,
        country: s.country,
        city: s.city,
        status: s.status,
        categories: s.categories,
        incoterms: s.incoterms,
        leadTimeDays: s.leadTimeDays,
        paymentTerms: s.paymentTerms,
        relationshipType: s.relationshipType,
        brandRepresented: s.brandRepresented,
        tradeRoute: s.tradeRoute,
        certifications: s.certifications,
        contacts: s.contacts,
      },
      create: {
        code: s.code,
        name: s.name,
        aliases: s.aliases,
        country: s.country,
        city: s.city,
        status: s.status,
        categories: s.categories,
        incoterms: s.incoterms,
        leadTimeDays: s.leadTimeDays,
        paymentTerms: s.paymentTerms,
        relationshipType: s.relationshipType,
        brandRepresented: s.brandRepresented,
        tradeRoute: s.tradeRoute,
        certifications: s.certifications,
        contacts: s.contacts,
      },
    });
  }

  // ── 5. Project Materials Catalogue with Weights, Standards & Benchmarks ───
  const materialsData = [
    {
      sku: "MAT-GAB-20",
      name: "Crushed Gabbro Aggregate 20mm (UAE Origin)",
      description: "High-density crushed gabbro coarse aggregate for high-strength C40/C50 concrete and bridge structures. Imported from Stevin Rock RAK via Dona Marine barges.",
      uom: "tonne",
      category: "Quarry & Aggregates",
      criticality: "HIGH",
      standard: "ASTM C33 / BS 882 / Ministry of Works Section 5",
      densityKgM3: 2650,
      unitWeightKg: 1000,
      originCountry: "AE",
      currentMarketBenchmark: 15.80,
      benchmarkCurrency: "USD",
      benchmarkSource: "GCC Regional Aggregate & Mineral Price Index (MEED / Stevin Rock FOB + Freight)",
      benchmarkDate: day(4),
      benchmarkFreshness: "fresh",
    },
    {
      sku: "MAT-STL-355",
      name: "Structural Steel Sections S355JR / S355J2",
      description: "Heavy structural steel universal beams (UB) and universal columns (UC) for Falcon Flyover (PRJ-BIA-01) and Bahrain Marina Tower (PRJ-2201).",
      uom: "tonne",
      category: "Steel & Metals",
      criticality: "CRITICAL",
      standard: "EN 10025-2 S355JR / BS 5950",
      densityKgM3: 7850,
      unitWeightKg: 1000,
      originCountry: "AE",
      currentMarketBenchmark: 890.00,
      benchmarkCurrency: "USD",
      benchmarkSource: "SteelOrbis Middle East Heavy Structural Steel Index (FOB Arabian Gulf)",
      benchmarkDate: day(7),
      benchmarkFreshness: "fresh",
    },
    {
      sku: "MAT-MB-588",
      name: "MasterSeal 588 Elastomeric Waterproofing Membrane",
      description: "Polymer-modified cementitious elastomeric coating for chloride barrier, foundation groundwater protection and water retaining structures (KAMC & Marina).",
      uom: "kg",
      category: "Construction Chemicals",
      criticality: "HIGH",
      standard: "EN 1504-2 / DIN 1048 Water Impermeability",
      densityKgM3: 1350,
      unitWeightKg: 1,
      originCountry: "BH",
      currentMarketBenchmark: 4.80,
      benchmarkCurrency: "USD",
      benchmarkSource: "Bahrain Building Chemicals Official Distributor Price Catalogue",
      benchmarkDate: day(10),
      benchmarkFreshness: "fresh",
    },
    {
      sku: "MAT-HYU-ELV",
      name: "Hyundai High-Speed Passenger & Bed Elevator Package",
      description: "Hyundai 2.5 m/s gearless traction passenger elevator with regenerative drive and hospital bed lift emergency override. Specification for KAMC and Marina.",
      uom: "unit",
      category: "Vertical Transportation",
      criticality: "CRITICAL",
      standard: "EN 81-20/50 / ISO 8100 Lifts Safety",
      densityKgM3: 1200,
      unitWeightKg: 4200,
      originCountry: "KR",
      currentMarketBenchmark: 72000.00,
      benchmarkCurrency: "USD",
      benchmarkSource: "Nass International Trading Hyundai Preferred Supplier Agreement 2026",
      benchmarkDate: day(14),
      benchmarkFreshness: "fresh",
    },
    {
      sku: "MAT-ASP-W10",
      name: "Polymer Modified Asphalt Wearing Course (PMB 10mm)",
      description: "Hot-mix asphalt with polymer-modified bitumen binder for high-load highway surface wearing course (Arad Highway Stage 3 Falcon Flyover).",
      uom: "tonne",
      category: "Asphalt & Road Materials",
      criticality: "HIGH",
      standard: "Ministry of Works Standard Specification Section 4 (Highways)",
      densityKgM3: 2350,
      unitWeightKg: 1000,
      originCountry: "BH",
      currentMarketBenchmark: 68.50,
      benchmarkCurrency: "USD",
      benchmarkSource: "Nass Asphalt / Bahrain Road Paving Commodity Reference",
      benchmarkDate: day(5),
      benchmarkFreshness: "fresh",
    },
  ];

  for (const m of materialsData) {
    await db.material.upsert({
      where: { sku: m.sku },
      update: {
        name: m.name,
        description: m.description,
        uom: m.uom,
        category: m.category,
        criticality: m.criticality,
        standard: m.standard,
        densityKgM3: m.densityKgM3,
        unitWeightKg: m.unitWeightKg,
        originCountry: m.originCountry,
        currentMarketBenchmark: m.currentMarketBenchmark,
        benchmarkCurrency: m.benchmarkCurrency,
        benchmarkSource: m.benchmarkSource,
        benchmarkDate: m.benchmarkDate,
        benchmarkFreshness: m.benchmarkFreshness,
      },
      create: {
        sku: m.sku,
        name: m.name,
        description: m.description,
        uom: m.uom,
        category: m.category,
        criticality: m.criticality,
        standard: m.standard,
        densityKgM3: m.densityKgM3,
        unitWeightKg: m.unitWeightKg,
        originCountry: m.originCountry,
        currentMarketBenchmark: m.currentMarketBenchmark,
        benchmarkCurrency: m.benchmarkCurrency,
        benchmarkSource: m.benchmarkSource,
        benchmarkDate: m.benchmarkDate,
        benchmarkFreshness: m.benchmarkFreshness,
      },
    });
  }

  // Update existing core materials with density & weight standards
  await db.material.updateMany({
    where: { sku: "MAT-REB-16" },
    data: {
      standard: "BS 4449:2005 Grade B500B (High Yield Deformed Rebar)",
      densityKgM3: 7850,
      unitWeightKg: 1000,
      originCountry: "AE",
      currentMarketBenchmark: 685.00,
      benchmarkCurrency: "USD",
      benchmarkSource: "London Metal Exchange (LME) Rebar Cash + MEED GCC Average",
      benchmarkDate: day(3),
      benchmarkFreshness: "fresh",
    },
  });

  await db.material.updateMany({
    where: { sku: "MAT-CHL-800" },
    data: {
      standard: "AHRI 550/590 Standard for Water-Cooled Chillers",
      densityKgM3: 1100,
      unitWeightKg: 13200,
      originCountry: "DE",
      currentMarketBenchmark: 155000.00,
      benchmarkCurrency: "USD",
      benchmarkSource: "European HVAC Equipment Benchmark / VDMA Germany",
      benchmarkDate: day(12),
      benchmarkFreshness: "fresh",
    },
  });

  // ── 6. Price Benchmark Intelligence Records (Section 8) ────────────────────
  const benchmarks = [
    {
      materialSku: "MAT-REB-16",
      materialName: "Rebar B500B Ø16mm",
      category: "Steel",
      marketRegion: "GCC Regional (UAE / Bahrain)",
      benchmarkPrice: 685.00,
      currency: "USD",
      uom: "tonne",
      priceBasis: "CIF Khalifa Bin Salman Port (KBSP)",
      effectiveDate: day(3),
      sourceName: "LME Steel Rebar + MEED GCC Construction Materials Index",
      sourceUrl: "https://www.lme.com/Metals/Ferrous/Steel-Rebar",
      freshnessDays: 3,
      isDemo: false,
      notes: "PO-3001 contracted price is $645/tonne (AED 2,367) — yielding a favorable variance of $40/tonne (+5.8% cost advantage).",
    },
    {
      materialSku: "MAT-GAB-20",
      materialName: "Crushed Gabbro Aggregate 20mm",
      category: "Quarry & Aggregates",
      marketRegion: "Bahrain Local Delivered",
      benchmarkPrice: 15.80,
      currency: "USD",
      uom: "tonne",
      priceBasis: "Delivered DAP NASS Hidd Bulk Jetty",
      effectiveDate: day(4),
      sourceName: "Bahrain Ministry of Works Approved Material Tariff & Stevin Rock Index",
      sourceUrl: "https://www.stevinrock.com/products/gabbro",
      freshnessDays: 4,
      isDemo: false,
      notes: "Dona Marine barge contract locked at $14.20/tonne — yielding $1.60/tonne saving on 18,500t shipment ($29,600 total saving).",
    },
    {
      materialSku: "MAT-STL-355",
      materialName: "Structural Steel S355JR Universal Beams",
      category: "Steel & Metals",
      marketRegion: "Arabian Gulf FOB",
      benchmarkPrice: 890.00,
      currency: "USD",
      uom: "tonne",
      priceBasis: "FOB Export Mill (Emirates Steel / SABIC)",
      effectiveDate: day(7),
      sourceName: "SteelOrbis Middle East Heavy Steel Weekly Monitor",
      sourceUrl: "https://www.steelorbis.com/steel-prices",
      freshnessDays: 7,
      isDemo: false,
      notes: "Approved framework rate is $820/tonne — saving $70/tonne against spot market benchmark.",
    },
    {
      materialSku: "MAT-CHL-800",
      materialName: "Water-Cooled Chiller 800 kW",
      category: "HVAC",
      marketRegion: "Europe to GCC CIF",
      benchmarkPrice: 155000.00,
      currency: "USD",
      uom: "unit",
      priceBasis: "CIF Khalifa Bin Salman Port",
      effectiveDate: day(12),
      sourceName: "Eurovent / VDMA German Industrial Cooling Benchmark",
      sourceUrl: "https://www.eurovent-certification.com",
      freshnessDays: 12,
      isDemo: false,
      notes: "PO-3002 unit price is €96,000 (~$104,600) for base equipment. Landed cost including sea freight & 5% duty is $118,400.",
    },
  ];

  for (const b of benchmarks) {
    await db.priceBenchmark.create({ data: b });
  }

  // ── 7. Shipment Weight Hierarchy & Landed Cost Enhancements (Section 7 & 8) ─
  // Update SHP-8801 with exact weight hierarchy & landed costs
  await db.shipment.updateMany({
    where: { ref: "SHP-8801" },
    data: {
      netWeightKg: 120000,
      grossWeightKg: 121400,
      tareWeightKg: 2200,
      measuredWeightKg: 121150,
      calcWeightKg: 120000,
      weightDiscrepancyPct: 0.21,
      weightToleranceStatus: "WITHIN_TOLERANCE",
      weightTolerancePolicy: "±2.5% max allowable variance",
      weightDataSource: "WEIGHBRIDGE",
      oceanFreightCost: 4200,
      marineInsuranceCost: 285,
      customsDutyCost: 3870,
      portHandlingCost: 1200,
      totalLandedCost: 86955,
      currency: "USD",
      tradeRouteName: "Shanghai to Khalifa Bin Salman Port (KBSP)",
    },
  });

  // Update SHP-8802 (Chiller) with weight & landed costs
  await db.shipment.updateMany({
    where: { ref: "SHP-8802" },
    data: {
      netWeightKg: 13200,
      grossWeightKg: 14800,
      tareWeightKg: 1600,
      measuredWeightKg: 14820,
      calcWeightKg: 13200,
      weightDiscrepancyPct: 0.14,
      weightToleranceStatus: "WITHIN_TOLERANCE",
      weightTolerancePolicy: "±2.5% max allowable variance",
      weightDataSource: "WEIGHBRIDGE",
      oceanFreightCost: 6800,
      marineInsuranceCost: 360,
      customsDutyCost: 4800,
      portHandlingCost: 950,
      totalLandedCost: 108910,
      currency: "USD",
      tradeRouteName: "Ningbo to Khalifa Bin Salman Port (KBSP)",
    },
  });

  // Update SHP-8804 (Hyundai Lift components) with WEIGHT DISCREPANCY > 2.5%!
  await db.shipment.updateMany({
    where: { ref: "SHP-8804" },
    data: {
      netWeightKg: 25600,
      grossWeightKg: 28400, // Declared in document
      tareWeightKg: 3800,
      measuredWeightKg: 29250, // Weighbridge measured (+850kg delta = +2.99%)
      calcWeightKg: 25600,
      weightDiscrepancyPct: 2.99,
      weightToleranceStatus: "DISCREPANCY_FLAGGED",
      weightTolerancePolicy: "±2.5% max allowable variance",
      weightDataSource: "WEIGHBRIDGE",
      oceanFreightCost: 5200,
      marineInsuranceCost: 310,
      customsDutyCost: 4350,
      portHandlingCost: 1100,
      totalLandedCost: 97960,
      currency: "USD",
      tradeRouteName: "Shanghai to Colombo Transshipment to KBSP",
    },
  });

  // Create dedicated aggregate shipment SHP-8809 (UAE Aggregate Marine Barge Route)
  const supBbt = await db.supplier.findUnique({ where: { code: "SUP-BBT-01" } });
  const prjBia = await db.project.findUnique({ where: { code: "PRJ-BIA-01" } });

  const existingShp9 = await db.shipment.findUnique({ where: { ref: "SHP-8809" } });
  if (!existingShp9) {
    const shp9 = await db.shipment.create({
      data: {
        ref: "SHP-8809",
        importFileRef: "IMP-7709-AGG",
        mode: "OCEAN",
        status: "IN_TRANSIT",
        carrier: "Dona Marine (Flat-Top Aggregate Barge Dona-04)",
        forwarder: "Bahrain Bulk Trade W.L.L.",
        originPort: "Mina Saqr, Ras Al Khaimah, UAE",
        destinationPort: "NASS Bulk Aggregate Jetty, Hidd, Bahrain",
        podCountry: "BH",
        supplierPromisedEta: inDays(2),
        carrierEta: inDays(2),
        carrierEtaAt: hr(6),
        carrierEtaFreshness: "fresh",
        portScheduleEta: inDays(2),
        etaPrecedencePolicy: "CARRIER > PORT > MODEL > MANUAL",
        displayEta: inDays(2),
        displayEtaSource: "Dona Marine AIS Telemetry & Jetty Master Dispatch",
        displayEtaType: "carrier",
        vesselName: "DONA-04 (Tug: AL FANAR)",
        vesselVoyage: "V-2026-44",
        vesselPositionLat: 26.25,
        vesselPositionLng: 51.55,
        vesselPositionAt: hr(3),
        vesselSource: "AIS feed (fresh) — flat-top barge with satellite AIS transponder",
        vesselLinkEvidence: "Stevin Rock Bill of Lading RAK-9921 + Customs Manifest AGG-4420",
        freshness: "fresh",
        lastEventAt: hr(3),
        lastEventSource: "ais",
        supplierId: supBbt ? supBbt.id : undefined,
        projectId: prjBia ? prjBia.id : undefined,
        created: day(1),
        netWeightKg: 18500000, // 18,500 tonnes gabbro aggregate
        grossWeightKg: 18500000,
        tareWeightKg: 0,
        measuredWeightKg: 18485000, // Hidd Jetty weighbridge record
        calcWeightKg: 18500000,
        weightDiscrepancyPct: 0.08,
        weightToleranceStatus: "WITHIN_TOLERANCE",
        weightTolerancePolicy: "±2.5% max allowable variance",
        weightDataSource: "WEIGHBRIDGE",
        oceanFreightCost: 64750, // Marine barge freight ($3.50/t)
        marineInsuranceCost: 1250,
        customsDutyCost: 9250, // 5% GCC tariff
        portHandlingCost: 12950, // Stevedoring & conveyer offloading ($0.70/t)
        totalLandedCost: 271950, // Total landed cost ($14.70/t)
        currency: "USD",
        tradeRouteName: "UAE-to-Bahrain Maritime Aggregate Barge Route (Mina Saqr to Hidd Jetty)",
      },
    });

    // Seed legs for SHP-8809
    await db.shipmentLeg.create({
      data: {
        shipmentId: shp9.id,
        seq: 1,
        mode: "OCEAN",
        fromPoint: "Mina Saqr Quarry Jetty, Ras Al Khaimah, UAE",
        toPoint: "NASS Bulk Aggregate Jetty, Hidd, Bahrain",
        status: "IN_TRANSIT",
        carrier: "Dona Marine (Tug Al Fanar)",
      },
    });
  }

  // ── 8. Heavy Equipment & Machinery Assets Register (Section 5.4) ───────────
  const equipment = [
    {
      tag: "EQP-CRN-01",
      name: "Liebherr LTM 1500-8.1 (500t All-Terrain Mobile Crane)",
      category: "CRANE",
      make: "Liebherr",
      model: "LTM 1500-8.1",
      capacity: 500,
      capacityUnit: "tonnes",
      ownershipStatus: "JOINT_VENTURE",
      operatingCondition: "OPERATIONAL",
      currentProjectCode: "PRJ-BIA-01",
      assignedOperator: "Sarens Nass Master Rigger Team A",
      hourlyRateBhd: 450.0,
      mobilizationRoute: "Hidd Sarens Depot to Falcon Flyover Site",
      notes: "Equipped with 84m telescopic boom + 91m luffing fly jib. Scheduled for 398m flyover box girder erection.",
    },
    {
      tag: "EQP-CRN-02",
      name: "Demag CC 2800-1 (600t Heavy Crawler Crane)",
      category: "CRANE",
      make: "Tadano Demag",
      model: "CC 2800-1",
      capacity: 600,
      capacityUnit: "tonnes",
      ownershipStatus: "JOINT_VENTURE",
      operatingCondition: "STANDBY",
      currentProjectCode: "PRJ-2201",
      assignedOperator: "Sarens Nass Crawler Crew #2",
      hourlyRateBhd: 650.0,
      mobilizationRoute: "Hidd Sarens Heavy Depot",
      notes: "Superlift configuration with 84m main boom. Allocated for Bahrain Marina Tower core structural lifts.",
    },
    {
      tag: "EQP-EXC-01",
      name: "Caterpillar 336D L (36t Hydraulic Heavy Excavator)",
      category: "EXCAVATOR",
      make: "Caterpillar / Nass Commercial",
      model: "336D L",
      capacity: 2.4,
      capacityUnit: "m3 bucket",
      ownershipStatus: "OWNED",
      operatingCondition: "OPERATIONAL",
      currentProjectCode: "PRJ-RAF-02",
      assignedOperator: "Nass Contracting Earthworks Div.",
      hourlyRateBhd: 45.0,
      mobilizationRoute: "Zallaq Highway Site Depot",
      notes: "Active on Al Raffa 102ha bulk excavation and retention pond cutting.",
    },
    {
      tag: "EQP-PMP-01",
      name: "SCHWING S36X (36m Truck-Mounted Concrete Boom Pump)",
      category: "PUMP",
      make: "SCHWING Stetter / Nass Commercial",
      model: "S36X Roll-Fold",
      capacity: 160,
      capacityUnit: "m3/hr",
      ownershipStatus: "OWNED",
      operatingCondition: "OPERATIONAL",
      currentProjectCode: "PRJ-KAMC-03",
      assignedOperator: "Delmon Ready-Mix Pumping Team #4",
      hourlyRateBhd: 85.0,
      mobilizationRoute: "Salmabad Batch Plant to KAMC Site",
      notes: "Pumping high-spec chloride-resistant foundation raft concrete with Master Builders admixtures.",
    },
    {
      tag: "EQP-PAV-01",
      name: "Vögele Super 1800-3i (High-Performance Asphalt Paver)",
      category: "PAVER",
      make: "Vögele (Wirtgen Group)",
      model: "Super 1800-3i",
      capacity: 700,
      capacityUnit: "tonnes/hr",
      ownershipStatus: "OWNED",
      operatingCondition: "OPERATIONAL",
      currentProjectCode: "PRJ-BIA-01",
      assignedOperator: "Nass Asphalt Highway Crew",
      hourlyRateBhd: 110.0,
      mobilizationRoute: "Askar Asphalt Plant to Falcon Interchange",
      notes: "Laying 10m wide continuous polymer-modified asphalt base course on Arad Highway expansion.",
    },
    {
      tag: "EQP-TRN-01",
      name: "Kamag 24-Axle Self-Propelled Modular Transporter (SPMT)",
      category: "TRANSPORTER",
      make: "Kamag / Sarens",
      model: "24-Axle Heavy SPMT PowerPack",
      capacity: 960,
      capacityUnit: "tonnes",
      ownershipStatus: "JOINT_VENTURE",
      operatingCondition: "STANDBY",
      currentProjectCode: "PRJ-BIA-01",
      assignedOperator: "Sarens Engineered Transport Unit",
      hourlyRateBhd: 520.0,
      mobilizationRoute: "Hidd Sarens Depot to Falcon Flyover Site",
      notes: "Used for off-site pre-assembly and nighttime roll-in of 398m flyover steel spans across Khalifa Al Khabeer Hwy.",
    },
  ];

  for (const eq of equipment) {
    await db.equipmentAsset.create({ data: eq });
  }

  // ── 9. Structured 10-Point CEO Decision Recommendations (Section 11.F) ─────
  const ceoDecisions = [
    {
      ref: "DEC-2026-001",
      category: "SPEC_CHANGE",
      title: "Arad Highway Falcon Flyover: Single 600t Crawler Lift vs Tandem Mobile Crane Erection",
      projectCode: "PRJ-BIA-01",
      entityRef: "WP-BIA-FLY",
      priority: "CRITICAL",
      currentSituation: "The 398m dual flyover over Arab Bay requires erecting 4 pre-assembled steel box spans weighing 180 tonnes each across live traffic corridors of Khalifa Al Khabeer Highway. Current baseline calls for two 300t tandem cranes with dual road closures of 6 nights.",
      financialImpact: "Single 600t Demag CC 2800-1 mobilization adds BHD 28,000 in equipment lease, but reduces traffic detour management costs by BHD 42,000, producing a net saving of BHD 14,000.",
      scheduleImpact: "Accelerates flyover erection milestone by 12 calendar days; eliminates 4 nights of full highway closure.",
      optionsEvaluated: J([
        { option: "Option A (Baseline)", desc: "Tandem lift using two Liebherr LTM 1300 mobile cranes (6 nights closure)", cost: "BHD 78,000", risk: "HIGH - dual synchronized crane drift risk over live traffic" },
        { option: "Option B (Recommended)", desc: "Single 600t Demag CC 2800 crawler crane from Sarens Nass Middle East JV with SPMT roll-in", cost: "BHD 64,000 net", risk: "LOW - single engineered lift with pre-rigged superlift counterweight" },
        { option: "Option C", desc: "Segmental incremental launching from Arab Bay abutment", cost: "BHD 140,000", risk: "HIGH - 45-day fabrication delay for launching nose" },
      ]),
      tradeoffsAndAssumptions: "Assumes Ministry of Works approves night traffic diversion for 2 nights instead of 6; relies on Sarens Nass CC 2800 crane availability in Hidd depot.",
      recommendedAction: "Approve Option B: Mobilize Sarens Nass 600t Demag CC 2800-1 crawler crane with Kamag SPMT roll-in.",
      rationale: "Reduces public disruption on BIA Airport access corridor, cuts overall cost by BHD 14k, and eliminates dangerous synchronized tandem lift risks.",
      accountableOwner: "Operations Director & Sarens Nass Technical Lead",
      nextOperationalStep: "Issue mobilization authorization to Sarens Nass Middle East; submit revised 2-night road diversion permit to General Directorate of Traffic.",
      reviewConditions: "Revisit if wind speed exceeds 9 m/s during scheduled lift window or if Traffic Directorate delays diversion approval past 7 calendar days.",
      status: "PENDING_CEO_REVIEW",
    },
    {
      ref: "DEC-2026-002",
      category: "PRICE_EXPOSURE",
      title: "UAE Gabbro Aggregate Quarterly Volume Contract Hedge (Bahrain Bulk Trade / Dona Marine)",
      projectCode: "PRJ-RAF-02",
      entityRef: "SUP-BBT-01",
      priority: "HIGH",
      currentSituation: "Stevin Rock RAK announced a $1.20/tonne price escalation effective next month on crushed gabbro aggregate due to regional fuel surcharges. NASS requires 140,000 tonnes across Al Raffa (PRJ-RAF-02) and Airport Access (PRJ-BIA-01) over the next 4 months.",
      financialImpact: "Pre-committing to a 120,000 tonne quarterly contract via Dona Marine locks in the current $14.20/t DAP rate, saving BHD 54,000 ($144,000) against the impending price increase.",
      scheduleImpact: "Guarantees dedicated weekly barge rotation (Dona-04), securing uninterrupted aggregate feed to Delmon Ready-Mix and Nass Asphalt batching plants.",
      optionsEvaluated: J([
        { option: "Option A (Spot Market)", desc: "Procure spot barge shipments at escalating rates ($15.80 - $16.50/t)", financialImpact: "BHD 68,000 extra cost", risk: "High supply volatility during peak UAE export season" },
        { option: "Option B (Volume Hedge)", desc: "Execute 120,000t 90-day volume commitment with Bahrain Bulk Trade & Stevin Rock at $14.20/t", financialImpact: "Locks in BHD 54,000 cost savings", risk: "Requires BHD 120,000 LC down payment from corporate treasury" },
      ]),
      tradeoffsAndAssumptions: "Requires tying up BHD 120,000 working capital in letter of credit; assumes NASS Hidd aggregate jetty has sufficient stockpile surge capacity (capacity: 220,000 tonnes; current stock: 78,000 tonnes).",
      recommendedAction: "Approve Option B: Authorize execution of 120,000t volume purchase commitment with Bahrain Bulk Trade.",
      rationale: "Protects gross margin on both Al Raffa and BIA fixed-price contracts against mineral inflation.",
      accountableOwner: "Chief Financial Officer & Procurement Director",
      nextOperationalStep: "Instruct Corporate Treasury to open revolving Letter of Credit with National Bank of Bahrain for Stevin Rock LLC.",
      reviewConditions: "Revisit if marine freight rates drop below $2.80/tonne or if project roadbase demand schedules slip by > 30 calendar days.",
      status: "PENDING_CEO_REVIEW",
    },
    {
      ref: "DEC-2026-003",
      category: "SUPPLIER_AWARD",
      title: "KAMC Substructure Waterproofing & Admixture Single-Source Specification Award",
      projectCode: "PRJ-KAMC-03",
      entityRef: "WP-KAMC-SUB",
      priority: "HIGH",
      currentSituation: "King Abdullah Medical City foundation raft requires high-performance chloride barrier waterproofing to withstand high groundwater salinity in Southern Governorate. Bahrain Building Chemicals proposed MasterSeal 588 with single-point manufacturer warranty.",
      financialImpact: "Total package value BHD 340,000. Price is 4% higher than generic bituminous sheet alternatives, but carries a 25-year structural warranty backed by BASF/Master Builders.",
      scheduleImpact: "Material is stocked locally at Mina Salman warehouse; eliminates 60-day European sea freight lead time.",
      optionsEvaluated: J([
        { option: "Option A", desc: "Single-source award to Bahrain Building Chemicals for MasterSeal 588 system with 25-year warranty", cost: "BHD 340,000", delivery: "Immediate local dispatch" },
        { option: "Option B", desc: "Re-tender with Turkish/Chinese bituminous membrane suppliers", cost: "BHD 325,000", delivery: "55 days lead time + risk of consultant rejection" },
      ]),
      tradeoffsAndAssumptions: "Requires consultant approval of single-source variance. Justified by AGU specification clause 07100 endorsing Master Builders Systems.",
      recommendedAction: "Approve single-source procurement through Bahrain Building Chemicals W.L.L.",
      rationale: "Keeps hospital foundation pour on critical path schedule while securing comprehensive manufacturer-backed warranty.",
      accountableOwner: "Project Director (KAMC) & Commercial Manager",
      nextOperationalStep: "Sign purchase order PO-3007 to Bahrain Building Chemicals for 72,000 kg MasterSeal 588.",
      reviewConditions: "Revisit if AGU supervising consultant raises technical non-compliance within 5 working days.",
      status: "PENDING_CEO_REVIEW",
    },
    {
      ref: "DEC-2026-004",
      category: "SHIPMENT_DELAY",
      title: "Hyundai Elevator Drive Control Modules: Authorize Air Freight Upgrade to Eliminate Critical Path Delay",
      projectCode: "PRJ-2201",
      entityRef: "SHP-8804",
      priority: "CRITICAL",
      currentSituation: "Shipment SHP-8804 carrying Hyundai elevator traction drive modules for Bahrain Marina Tower suffered transshipment delay at Colombo, LK, slipping ETA by 16 days. Marina Tower curtain-wall closure depends on hoistway completion.",
      financialImpact: "Splitting the consignment and air-freighting 2 critical drive controllers from Seoul to Bahrain via DHL Global Forwarding costs BHD 4,200 ($11,100). Delay liquidated damages are BHD 1,800/day after grace period.",
      scheduleImpact: "Recovers 14 calendar days on tower internal vertical transportation commissioning.",
      optionsEvaluated: J([
        { option: "Option A (Wait for Ocean Feeder)", desc: "Allow SHP-8804 to continue on ONE feeder vessel", delay: "16 days slip", liquidatedDamages: "BHD 28,800 potential delay penalty" },
        { option: "Option B (Air Freight Split)", desc: "Air-freight 2 critical controller modules (380 kg) immediately; balance follows via ocean", airCost: "BHD 4,200", netSavings: "BHD 24,600 net benefit" },
      ]),
      tradeoffsAndAssumptions: "Consignee must coordinate rapid customs pre-clearance at BIA Air Cargo terminal.",
      recommendedAction: "Authorize BHD 4,200 air-freight premium for Hyundai traction control modules.",
      rationale: "Prevents BHD 28,800 in delay penalties and protects developer handover milestone for Bahrain Marina.",
      accountableOwner: "Procurement Manager & Logistics Desk Lead",
      nextOperationalStep: "Issue dispatch release to Nass International Trading / Hyundai Seoul export desk for express air consignment.",
      reviewConditions: "Revisit if feeder vessel ONE COMMITMENT arrives at KBSP earlier than revised schedule.",
      status: "PENDING_CEO_REVIEW",
    },
  ];

  for (const d of ceoDecisions) {
    await db.ceoDecisionRecommendation.create({ data: d });
  }

  console.log("Add-on seed complete: 18 NASS units, 6 projects, 5 partner brands, 5 equipment assets, 4 benchmarks, and 4 CEO decisions populated! ✔");
}
