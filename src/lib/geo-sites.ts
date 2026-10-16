/* Geocoded supplier sites + NASS warehouses for the operation map.
 * Coordinates are city/site-level (matches supplier.city / warehouse.site in
 * the live-trace API); keyed by Supplier.code / Warehouse.code.
 *
 * NASS scenario: destination country is BAHRAIN. Warehouses and the project
 * delivery site are Bahrain locations. UAE appears only as a supplier origin
 * or map context — never as the delivery destination.
 */

export interface SiteInfo {
  lng: number;
  lat: number;
  label: string;
  country: string;
  city: string | null;
}

export const SUPPLIER_SITES: Record<string, SiteInfo> = {
  "SUP-002": { lng: 10.0, lat: 53.54, label: "Hamburg", country: "DE", city: "Hamburg" },
  "SUP-003": { lng: 121.63, lat: 29.92, label: "Ningbo", country: "CN", city: "Ningbo" },
  "SUP-004": { lng: 50.54, lat: 26.1, label: "Askar", country: "BH", city: "Askar" },
  "SUP-005": { lng: 11.86, lat: 57.79, label: "Gothenburg", country: "SE", city: "Gothenburg" },
  "SUP-006": { lng: 27.24, lat: 38.3, label: "Izmir", country: "TR", city: "Izmir" },
};

export const WAREHOUSE_SITES: Record<string, SiteInfo> = {
  "WH-ASKAR": { lng: 50.575, lat: 26.075, label: "NASS Askar Yard", country: "BH", city: "Askar" },
  "WH-SITRA": { lng: 50.62, lat: 26.2, label: "Sitra Industrial Warehouse", country: "BH", city: "Sitra" },
  "WH-MARINA": { lng: 50.585, lat: 26.23, label: "Bahrain Marina Store", country: "BH", city: "Manama" },
};
