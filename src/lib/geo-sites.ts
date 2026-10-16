/* Geocoded supplier sites + NASS warehouses for the operation map.
 * Coordinates are city-level (matches supplier.city / warehouse.site in
 * the live-trace API); keyed by Supplier.code / Warehouse.code.        */

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
  "SUP-004": { lng: 55.45, lat: 25.37, label: "Sharjah", country: "AE", city: "Sharjah" },
  "SUP-005": { lng: 11.86, lat: 57.79, label: "Gothenburg", country: "SE", city: "Gothenburg" },
  "SUP-006": { lng: 27.24, lat: 38.3, label: "Izmir", country: "TR", city: "Izmir" },
};

export const WAREHOUSE_SITES: Record<string, SiteInfo> = {
  "WH-DIP": { lng: 55.18, lat: 24.94, label: "Dubai Industrial Park", country: "AE", city: "Dubai" },
};
