/* ═══════════════════════════════════════════════════════════════════════
 * GEO INTELLIGENCE & VERIFIED PORT REGISTRY
 * Verified port specifications, geographical divisions (country, state,
 * province, governorate, region), and multi-entity search index.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { TraceShip } from "@/lib/trace-types";

export interface PortIntelligence {
  code: string;
  name: string;
  unlocode: string;
  country: string;
  countryCode: string;
  stateOrRegion: string;
  city: string;
  lat: number;
  lng: number;
  portType: string;
  operator: string;
  maxDraftM: number;
  quayLengthM: number;
  annualCapacity: string;
  facilities: string[];
  operationalStatus: "NORMAL_OPERATIONS" | "CONGESTION_WATCH" | "CUSTOMS_SCRUTINY" | "OPTIMAL_FLOW";
  statusReason?: string;
  operatingHours: string;
  securityLevel: string;
  keyCommodities: string[];
  notes: string;
  coordinates?: [number, number];
}

export interface RegionDivision {
  name: string;
  type: "Governorate" | "Province" | "Region" | "State" | "Emirate" | "Municipality";
  commercialHub?: string;
}

export interface CountryIntelligence {
  name: string;
  code: string; // ISO 2
  capital: string;
  flag: string;
  regions: RegionDivision[];
  majorPorts: string[];
  economicRole: string;
  customsAuthority: string;
  logisticsCorridors: string[];
  coordinates?: [number, number];
}

export const VERIFIED_PORTS: Record<string, PortIntelligence> = {
  KBSP: {
    code: "KBSP",
    name: "Khalifa Bin Salman Port (KBSP)",
    unlocode: "BH KBS",
    country: "Bahrain",
    countryCode: "BH",
    stateOrRegion: "Muharraq Governorate",
    city: "Al Hidd",
    lat: 26.177,
    lng: 50.535,
    portType: "Deepwater Container & General Cargo Gateway",
    operator: "APM Terminals Bahrain",
    maxDraftM: 15.0,
    quayLengthM: 1800,
    annualCapacity: "1,100,000 TEU",
    facilities: [
      "Customs Bonded Terminal & Free Zone",
      "Reefer Plugs (600+ active stations)",
      "Post-Panamax STS Cranes (4 active)",
      "Container Freight Station (CFS)",
      "Direct Highway Link to King Fahd Causeway",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7/365 Continuous Marine & Gate Operations",
    securityLevel: "ISPS Code Level 1 (Strict Maritime Security)",
    keyCommodities: ["Structural Steel", "Industrial Equipment", "HVAC Units", "Aggregate", "Manufactured Goods"],
    notes: "Primary Kingdom of Bahrain maritime gateway. Direct feeder to NASS warehouses and GCC cross-border road network.",
  },
  ASKAR: {
    code: "ASKAR",
    name: "Askar Jetty & Marine Aggregate Facility",
    unlocode: "BH ASK",
    country: "Bahrain",
    countryCode: "BH",
    stateOrRegion: "Southern Governorate",
    city: "Askar Industrial Zone",
    lat: 26.085,
    lng: 50.56,
    portType: "Industrial Bulk & Aggregate Marine Jetty",
    operator: "NASS Marine Services / Stevin Logistics",
    maxDraftM: 8.5,
    quayLengthM: 320,
    annualCapacity: "4,500,000 Tonnes Dry Bulk",
    facilities: [
      "Heavy Aggregate Unloading Conveyors",
      "Barge Mooring Dolphins",
      "Automated Truck Weighbridges",
      "Material Quality Assay Staging Yard",
    ],
    operationalStatus: "OPTIMAL_FLOW",
    operatingHours: "06:00 - 22:00 Daily Operations",
    securityLevel: "Industrial Controlled Zone",
    keyCommodities: ["Gabbro Aggregate", "Limestone", "Sand", "Armor Rock"],
    notes: "Dedicated staging terminal for NASS Concrete and Asphalt production batching plants.",
  },
  HIDD: {
    code: "HIDD",
    name: "NASS Hidd Aggregate & Marine Jetty",
    unlocode: "BH HID",
    country: "Bahrain",
    countryCode: "BH",
    stateOrRegion: "Muharraq Governorate",
    city: "Hidd Industrial Zone",
    lat: 26.22,
    lng: 50.68,
    portType: "Specialized Marine Bulk & Project Cargo Terminal",
    operator: "NASS Industrial & Marine Services",
    maxDraftM: 9.2,
    quayLengthM: 450,
    annualCapacity: "2,800,000 Tonnes",
    facilities: [
      "Heavy Lift Crane Cranage (up to 250t)",
      "Bulk Material Stockpile Pads",
      "Direct Coastal Feeder Connection",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Marine Receiving",
    securityLevel: "Port Facility Security Level 1",
    keyCommodities: ["Crushed Gabbro", "Precast Structural Elements", "Reinforced Steel"],
    notes: "Direct gateway for marine aggregate shipments from Ras Al Khaimah (UAE) to Bahrain.",
  },
  SHANGHAI: {
    code: "SHANGHAI",
    name: "Port of Shanghai (Yangshan Deepwater Terminal)",
    unlocode: "CN SHA",
    country: "China",
    countryCode: "CN",
    stateOrRegion: "Shanghai Municipality",
    city: "Shanghai",
    lat: 31.23,
    lng: 121.49,
    portType: "World's Largest Automated Container Port",
    operator: "Shanghai International Port Group (SIPG)",
    maxDraftM: 17.5,
    quayLengthM: 5600,
    annualCapacity: "47,300,000 TEU",
    facilities: [
      "Fully Automated Phase IV Terminal (AGVs)",
      "Deepwater berths handling 24,000 TEU ultra-large vessels",
      "Direct Yangtze River Barge Feeder Network",
      "High-speed intermodal rail transfer",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Prestressed Rebar", "Fabricated Steel", "Solar Panels", "Electronics", "Machinery"],
    notes: "Key origin port for Baosteel and international industrial supplies shipped to GCC mega-projects.",
  },
  NINGBO: {
    code: "NINGBO",
    name: "Ningbo-Zhoushan Port (Beilun Terminal)",
    unlocode: "CN NGB",
    country: "China",
    countryCode: "CN",
    stateOrRegion: "Zhejiang Province",
    city: "Ningbo",
    lat: 29.87,
    lng: 121.85,
    portType: "Mega Deepwater Multipurpose Hub",
    operator: "Ningbo Zhoushan Port Co., Ltd.",
    maxDraftM: 18.2,
    quayLengthM: 4800,
    annualCapacity: "35,000,000 TEU / 1.25B Tonnes",
    facilities: [
      "Deepwater ore and container terminals",
      "High-capacity gantry cranes",
      "Extensive bonded logistics parks",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Structural Steel Beams", "Hardware Fittings", "Refractory Materials"],
    notes: "Major manufacturing export gateway for Zhejiang and East China industrial supply chains.",
  },
  BUSAN: {
    code: "BUSAN",
    name: "Port of Busan (Busan New Port)",
    unlocode: "KR PUS",
    country: "South Korea",
    countryCode: "KR",
    stateOrRegion: "Busan Metropolitan City",
    city: "Busan",
    lat: 35.1,
    lng: 129.04,
    portType: "Premier Northeast Asian Transshipment Hub",
    operator: "Busan Port Authority (BPA)",
    maxDraftM: 17.0,
    quayLengthM: 4200,
    annualCapacity: "22,700,000 TEU",
    facilities: [
      "Deepwater automated container terminals",
      "Distripark logistics center",
      "Direct connections to Trans-Siberian rail links",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Heavy Construction Equipment", "Piping Systems", "High-spec Electrical Components"],
    notes: "Strategic transshipment and export hub linking South Korean manufacturing to the Arabian Gulf.",
  },
  GENOA: {
    code: "GENOA",
    name: "Port of Genoa (PSA Genova Pra' / Sampierdarena)",
    unlocode: "IT GOA",
    country: "Italy",
    countryCode: "IT",
    stateOrRegion: "Liguria Region",
    city: "Genoa",
    lat: 44.4,
    lng: 8.92,
    portType: "Premier Northern Mediterranean Gateway",
    operator: "Western Ligurian Sea Port Authority / PSA",
    maxDraftM: 15.0,
    quayLengthM: 2200,
    annualCapacity: "2,800,000 TEU",
    facilities: [
      "Direct rail corridors through Alpine tunnels to Northern Europe",
      "Dedicated heavy machinery handling berths",
      "Customs fast-corridor digital scanning",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Precision CNC Machinery", "Architectural Stone", "Specialty Valves & Pumps"],
    notes: "Main Mediterranean export port for Italian mechanical engineering and industrial suppliers.",
  },
  ANTWERP: {
    code: "ANTWERP",
    name: "Port of Antwerp-Bruges (Deurganckdock)",
    unlocode: "BE ANR",
    country: "Belgium",
    countryCode: "BE",
    stateOrRegion: "Flemish Region (Flanders)",
    city: "Antwerp",
    lat: 51.28,
    lng: 4.37,
    portType: "European Integrated Mega Container & Petrochemical Hub",
    operator: "Port of Antwerp-Bruges Authority",
    maxDraftM: 16.0,
    quayLengthM: 3500,
    annualCapacity: "14,500,000 TEU / 290M Tonnes",
    facilities: [
      "Tidal container dock with direct sea access",
      "Largest integrated chemical cluster in Europe",
      "Multimodal barge and rail connections into Germany and France",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Specialty Polymers", "Structural Fasteners", "Hydraulic Assemblies"],
    notes: "Origin of specialized engineering materials and high-value architectural hardware.",
  },
  GOTHENBURG: {
    code: "GOTHENBURG",
    name: "Port of Gothenburg (Skandiahamnen)",
    unlocode: "SE GOT",
    country: "Sweden",
    countryCode: "SE",
    stateOrRegion: "Västra Götaland County",
    city: "Gothenburg",
    lat: 57.71,
    lng: 11.97,
    portType: "Largest Port in the Nordic Region",
    operator: "APM Terminals Gothenburg",
    maxDraftM: 14.5,
    quayLengthM: 1500,
    annualCapacity: "900,000 TEU",
    facilities: [
      "Railport Scandinavia direct rail link network",
      "Ro-Ro and container specialized terminals",
      "Cold-ironing green shore power infrastructure",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Operations",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["High-Tensile Nordic Steel", "Forest Products", "Industrial Automation Gear"],
    notes: "Key Scandinavian supplier base for NASS maritime and structural engineering contracts.",
  },
  IZMIR: {
    code: "IZMIR",
    name: "Port of Izmir (Alsancak Terminal)",
    unlocode: "TR IZM",
    country: "Türkiye",
    countryCode: "TR",
    stateOrRegion: "Izmir Province (Aegean Region)",
    city: "Izmir",
    lat: 38.42,
    lng: 27.14,
    portType: "Aegean Export Container & Ro-Ro Terminal",
    operator: "TCDD Ports Division",
    maxDraftM: 12.0,
    quayLengthM: 1200,
    annualCapacity: "1,200,000 TEU",
    facilities: [
      "Container handling berths with rail sidings",
      "Ro-Ro trailer parking facilities",
      "Regional customs clearance depot",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Ceramic Tiles", "Construction Marble", "Structural Hollow Sections"],
    notes: "Vital Mediterranean-Red Sea export origin connecting Aegean industrial hubs to Bahrain.",
  },
  COLOMBO: {
    code: "COLOMBO",
    name: "Port of Colombo (CICT / JCT / SAGT Terminals)",
    unlocode: "LK CMB",
    country: "Sri Lanka",
    countryCode: "LK",
    stateOrRegion: "Western Province",
    city: "Colombo",
    lat: 6.95,
    lng: 79.85,
    portType: "Strategic Indian Ocean Transshipment Gateway",
    operator: "Sri Lanka Ports Authority (SLPA) / CICT",
    maxDraftM: 18.0,
    quayLengthM: 3200,
    annualCapacity: "7,500,000 TEU",
    facilities: [
      "Deepwater berths accommodating 22,000+ TEU mega-ships",
      "Strategically situated adjacent to the main East-West sea lane",
      "High-efficiency feeder transshipment system",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Transshipped Containerized Freight", "Rubber Components", "Apparel"],
    notes: "Primary transshipment pivot point for Far East consignments routed into the Persian Gulf.",
  },
  JEBEL_ALI: {
    code: "JEBEL_ALI",
    name: "Port of Jebel Ali (Terminal 1 - 4)",
    unlocode: "AE JEA",
    country: "United Arab Emirates",
    countryCode: "AE",
    stateOrRegion: "Emirate of Dubai",
    city: "Dubai",
    lat: 25.01,
    lng: 55.06,
    portType: "Largest Man-made Harbor in the World & Middle East Mega Hub",
    operator: "DP World",
    maxDraftM: 17.0,
    quayLengthM: 8500,
    annualCapacity: "19,300,000 TEU",
    facilities: [
      "Semi-automated high-bay storage (BOXBAY)",
      "Integrated Jebel Ali Free Zone (JAFZA)",
      "Heavy lift, general cargo, and roll-on/roll-off terminals",
      "Comprehensive regional feeder service to Bahrain and Kuwait",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Regional Transshipment Cargo", "Consumer Goods", "Industrial Machinery"],
    notes: "Primary transshipment call for Gulf-bound container ships before final delivery at KBSP.",
  },
  FUJAIRAH: {
    code: "FUJAIRAH",
    name: "Port of Fujairah",
    unlocode: "AE FJR",
    country: "United Arab Emirates",
    countryCode: "AE",
    stateOrRegion: "Emirate of Fujairah",
    city: "Fujairah",
    lat: 25.12,
    lng: 56.34,
    portType: "Global Bunkering Hub & Deepwater Marine Energy Terminal",
    operator: "Port of Fujairah Authority",
    maxDraftM: 16.5,
    quayLengthM: 1800,
    annualCapacity: "Bunkering 12M Tonnes / 500k TEU",
    facilities: [
      "Second largest marine bunkering hub globally (outside Hormuz)",
      "Offshore anchorage and supply boat services",
      "Bulk aggregate loading berths",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Marine Bunker Fuel", "Gabbro Rock", "Lubricants"],
    notes: "Key strategic offshore staging anchorage outside the Strait of Hormuz.",
  },
  RAK: {
    code: "RAK",
    name: "Saqr Port / Stevin Rock Terminal",
    unlocode: "AE PVR",
    country: "United Arab Emirates",
    countryCode: "AE",
    stateOrRegion: "Emirate of Ras Al Khaimah",
    city: "Ras Al Khaimah",
    lat: 25.86,
    lng: 56.03,
    portType: "Largest Bulk Handling Port in the Middle East",
    operator: "RAK Ports / Stevin Rock",
    maxDraftM: 18.0,
    quayLengthM: 3000,
    annualCapacity: "70,000,000 Tonnes Dry Bulk",
    facilities: [
      "High-speed automated bulk ship loaders",
      "Dedicated deepwater berths for Capesize bulk carriers",
      "Direct conveyor connection from quarry faces to ship side",
    ],
    operationalStatus: "NORMAL_OPERATIONS",
    operatingHours: "24/7 Continuous",
    securityLevel: "ISPS Code Level 1",
    keyCommodities: ["Limestone", "Gabbro Aggregates", "Cement Clinker", "Industrial Minerals"],
    notes: "Chief origin for marine aggregate barges destined for NASS Hidd Aggregate Jetty in Bahrain.",
  },
};

export const VERIFIED_COUNTRIES: Record<string, CountryIntelligence> = {
  BH: {
    name: "Bahrain",
    code: "BH",
    capital: "Manama",
    flag: "🇧🇭",
    regions: [
      { name: "Muharraq Governorate", type: "Governorate", commercialHub: "Al Hidd (KBSP & Industrial Area)" },
      { name: "Capital Governorate", type: "Governorate", commercialHub: "Manama (Financial Harbor & Central Business District)" },
      { name: "Southern Governorate", type: "Governorate", commercialHub: "Askar (Heavy Industry & Quarry Operations)" },
      { name: "Northern Governorate", type: "Governorate", commercialHub: "Budaiya & Saar Intermodal Corridors" },
    ],
    majorPorts: ["KBSP", "ASKAR", "HIDD"],
    economicRole: "Destination Hub & GCC Logistics Gateway",
    customsAuthority: "Bahrain Customs Affairs (Ministry of Interior / OFOQ System)",
    logisticsCorridors: [
      "King Fahd Causeway (Direct highway freight link to Eastern Province, Saudi Arabia)",
      "Khalifa Bin Salman Port approach channel (Navigable Gulf fairway)",
      "Sitrah - Hidd industrial freight arterial",
    ],
  },
  CN: {
    name: "China",
    code: "CN",
    capital: "Beijing",
    flag: "🇨🇳",
    regions: [
      { name: "Shanghai Municipality", type: "Municipality", commercialHub: "Pudong & Yangshan Free Trade Zone" },
      { name: "Zhejiang Province", type: "Province", commercialHub: "Ningbo-Zhoushan & Hangzhou" },
      { name: "Jiangsu Province", type: "Province", commercialHub: "Suzhou & Nanjing" },
      { name: "Guangdong Province", type: "Province", commercialHub: "Shenzhen & Guangzhou" },
      { name: "Shandong Province", type: "Province", commercialHub: "Qingdao Heavy Steel Base" },
    ],
    majorPorts: ["SHANGHAI", "NINGBO"],
    economicRole: "Primary Heavy Manufacturing & Industrial Steel Export Origin",
    customsAuthority: "General Administration of Customs China (GACC)",
    logisticsCorridors: [
      "Maritime Silk Road (Yangtze delta → South China Sea → Malacca Strait → Arabian Sea)",
      "East China coastal intermodal feeder grid",
    ],
  },
  KR: {
    name: "South Korea",
    code: "KR",
    capital: "Seoul",
    flag: "🇰🇷",
    regions: [
      { name: "Busan Metropolitan City", type: "Region", commercialHub: "Busan New Port Intermodal Hub" },
      { name: "Gyeonggi Province", type: "Province", commercialHub: "Suwon & Hwaseong Industrial Complex" },
      { name: "South Gyeongsang Province", type: "Province", commercialHub: "Changwon Precision Machinery Center" },
      { name: "Incheon Metropolitan City", type: "Region", commercialHub: "Incheon Port & Airport Gateway" },
    ],
    majorPorts: ["BUSAN"],
    economicRole: "High-Precision Engineering, Heavy Machinery & Industrial Steel Supplier",
    customsAuthority: "Korea Customs Service (UNI-PASS)",
    logisticsCorridors: [
      "Korea Strait → East China Sea → Taiwan Strait → Singapore fairway",
    ],
  },
  IT: {
    name: "Italy",
    code: "IT",
    capital: "Rome",
    flag: "🇮🇹",
    regions: [
      { name: "Liguria", type: "Region", commercialHub: "Genoa (PSA Pra' Marine Gateway)" },
      { name: "Lombardy", type: "Region", commercialHub: "Milan Industrial & Automation District" },
      { name: "Piedmont", type: "Region", commercialHub: "Turin Heavy Mechanical Base" },
      { name: "Veneto", type: "Region", commercialHub: "Verona Intermodal Logistics Platform" },
      { name: "Emilia-Romagna", type: "Region", commercialHub: "Bologna Mechanical & Ceramic Belt" },
    ],
    majorPorts: ["GENOA"],
    economicRole: "Precision Machinery, Specialized Valves & Architectural Stonework",
    customsAuthority: "Agenzia delle Dogane e dei Monopoli (ADM Italy)",
    logisticsCorridors: [
      "Ligurian Sea → Strait of Sicily → Eastern Mediterranean → Suez Canal",
    ],
  },
  BE: {
    name: "Belgium",
    code: "BE",
    capital: "Brussels",
    flag: "🇧🇪",
    regions: [
      { name: "Flemish Region (Flanders)", type: "Region", commercialHub: "Antwerp Port & Logistics Cluster" },
      { name: "Walloon Region (Wallonia)", type: "Region", commercialHub: "Liege Multimodal Logistics Hub" },
      { name: "Brussels-Capital Region", type: "Region", commercialHub: "Brussels International Trade Center" },
    ],
    majorPorts: ["ANTWERP"],
    economicRole: "European Integrated Chemical, Heavy Metal & Hardware Logistics Gateway",
    customsAuthority: "General Administration of Customs and Excises (FPS Finance Belgium)",
    logisticsCorridors: [
      "River Scheldt → North Sea → English Channel → Gibraltar → Suez Canal",
    ],
  },
  SE: {
    name: "Sweden",
    code: "SE",
    capital: "Stockholm",
    flag: "🇸🇪",
    regions: [
      { name: "Västra Götaland County", type: "Province", commercialHub: "Gothenburg (Skandiahamnen)" },
      { name: "Stockholm County", type: "Province", commercialHub: "Greater Stockholm Industrial Zone" },
      { name: "Skåne County", type: "Province", commercialHub: "Malmö Öresund Logistics Link" },
    ],
    majorPorts: ["GOTHENBURG"],
    economicRole: "High-Tensile Specialty Steels, Hydraulic Systems & Clean Tech",
    customsAuthority: "Swedish Customs (Tullverket)",
    logisticsCorridors: [
      "Kattegat → Skagerrak → North Sea → English Channel → Atlantic/Med",
    ],
  },
  TR: {
    name: "Türkiye",
    code: "TR",
    capital: "Ankara",
    flag: "🇹🇷",
    regions: [
      { name: "Izmir Province", type: "Province", commercialHub: "Alsancak & Aliaga Industrial Corridor" },
      { name: "Istanbul Province", type: "Province", commercialHub: "Ambarli & Marmara Gateway" },
      { name: "Kocaeli Province", type: "Province", commercialHub: "Izmit Bay Automotive & Steel Strip" },
      { name: "Bursa Province", type: "Province", commercialHub: "Gemlik Manufacturing Center" },
    ],
    majorPorts: ["IZMIR"],
    economicRole: "Structural Rebar, Marble, Industrial Ceramics & Mechanical Hardware",
    customsAuthority: "Ministry of Trade - Directorate General of Customs (BİLGE System)",
    logisticsCorridors: [
      "Aegean Sea → Kasos Strait → Eastern Mediterranean → Suez Canal",
    ],
  },
  LK: {
    name: "Sri Lanka",
    code: "LK",
    capital: "Colombo",
    flag: "🇱🇰",
    regions: [
      { name: "Western Province", type: "Province", commercialHub: "Colombo Port & Logistics Hub" },
      { name: "Southern Province", type: "Province", commercialHub: "Galle Marine Corridor" },
      { name: "Central Province", type: "Province", commercialHub: "Kandy Trade Zone" },
    ],
    majorPorts: ["COLOMBO"],
    economicRole: "Transshipment Node for Far East to Middle East Containerized Freight",
    customsAuthority: "Sri Lanka Customs",
    logisticsCorridors: [
      "Bay of Bengal / Indian Ocean East-West shipping super-highway",
    ],
  },
  AE: {
    name: "United Arab Emirates",
    code: "AE",
    capital: "Abu Dhabi",
    flag: "🇦🇪",
    regions: [
      { name: "Emirate of Dubai", type: "Emirate", commercialHub: "Jebel Ali Port & Free Zone (JAFZA)" },
      { name: "Emirate of Ras Al Khaimah", type: "Emirate", commercialHub: "Saqr Port & Stevin Rock Quarries" },
      { name: "Emirate of Fujairah", type: "Emirate", commercialHub: "Fujairah Offshore Anchorage & Bunkering" },
      { name: "Emirate of Abu Dhabi", type: "Emirate", commercialHub: "Khalifa Port & KIZAD Industrial Zone" },
    ],
    majorPorts: ["JEBEL_ALI", "RAK", "FUJAIRAH"],
    economicRole: "Regional Hub, Bunkering, Transshipment & Bulk Marine Aggregates",
    customsAuthority: "Federal Authority for Identity, Citizenship, Customs and Port Security (ICP)",
    logisticsCorridors: [
      "Strait of Hormuz maritime corridor into Persian Gulf",
      "Offshore Gulf of Oman fairway",
    ],
  },
};

export interface SearchMatch {
  id: string;
  kind: "shipment" | "port" | "country" | "region";
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  refData?: unknown;
}

/** Unified multi-entity search across shipments, ports, countries and regions */
export function searchGeoAndFleet(query: string, ships: TraceShip[]): SearchMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchMatch[] = [];

  // 1. Search Shipments
  for (const s of ships) {
    const hits = [
      s.ref,
      s.vesselName,
      s.carrier,
      s.originPort,
      s.destPort,
      s.supplier?.name,
      s.supplier?.country,
      s.supplier?.city,
    ].some((v) => v && v.toLowerCase().includes(q));

    if (hits) {
      results.push({
        id: `ship:${s.ref}`,
        kind: "shipment",
        title: s.ref,
        subtitle: `${s.vesselName ?? s.carrier ?? "Vessel"} · ${s.originPort} → ${s.destPort}`,
        badge: s.liveStatus,
        refData: s,
      });
    }
  }

  // 2. Search Ports
  for (const [code, p] of Object.entries(VERIFIED_PORTS)) {
    const hits = [
      p.code,
      p.name,
      p.unlocode,
      p.country,
      p.stateOrRegion,
      p.city,
      p.portType,
    ].some((v) => v && v.toLowerCase().includes(q));

    if (hits) {
      results.push({
        id: `port:${code}`,
        kind: "port",
        title: p.name,
        subtitle: `${p.unlocode} · ${p.city}, ${p.country} (${p.portType})`,
        badge: p.operationalStatus.replace(/_/g, " "),
        refData: p,
      });
    }
  }

  // 3. Search Countries
  for (const [code, c] of Object.entries(VERIFIED_COUNTRIES)) {
    const hits = [c.name, c.code, c.capital, c.economicRole].some((v) => v && v.toLowerCase().includes(q));
    if (hits) {
      results.push({
        id: `country:${code}`,
        kind: "country",
        title: `${c.flag} ${c.name} (${c.code})`,
        subtitle: `Capital: ${c.capital} · ${c.regions.length} Commercial Regions · Ports: ${c.majorPorts.join(", ")}`,
        badge: "COUNTRY",
        refData: c,
      });
    }
  }

  // 4. Search Regions / States
  for (const [cCode, c] of Object.entries(VERIFIED_COUNTRIES)) {
    for (const r of c.regions) {
      if (r.name.toLowerCase().includes(q) || (r.commercialHub && r.commercialHub.toLowerCase().includes(q))) {
        results.push({
          id: `region:${cCode}:${r.name}`,
          kind: "region",
          title: `${r.name} (${c.name})`,
          subtitle: `${r.type} · Hub: ${r.commercialHub ?? "Commercial Zone"}`,
          badge: r.type.toUpperCase(),
          refData: { country: c, region: r },
        });
      }
    }
  }

  return results.slice(0, 16);
}
