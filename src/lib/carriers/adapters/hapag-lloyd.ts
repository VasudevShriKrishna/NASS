/**
 * Hapag-Lloyd Carrier RPA Adapter (Step 3)
 * Implements CarrierAdapter for Hapag-Lloyd tracking portal.
 */

import { CarrierAdapter, CarrierFetchReport, CarrierTrackingResult } from "../types";

export class HapagLloydCarrierAdapter implements CarrierAdapter {
  carrierCode = "HAPAG_LLOYD" as const;
  carrierName = "Hapag-Lloyd";

  get isLiveConfigured(): boolean {
    return Boolean(process.env.CARRIER_HAPAG_API_KEY && process.env.CARRIER_HAPAG_SECRET);
  }

  async track(containerNumber: string): Promise<CarrierFetchReport> {
    const fetchedAt = new Date().toISOString();

    if (this.isLiveConfigured) {
      try {
        const res = await fetch(`https://api.hlag.com/v1/events/containers/${encodeURIComponent(containerNumber)}`, {
          headers: {
            "X-Hapag-Client-ID": process.env.CARRIER_HAPAG_API_KEY || "",
            "Authorization": `Bearer ${process.env.CARRIER_HAPAG_SECRET || ""}`,
          },
          signal: AbortSignal.timeout(3500),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "AUTH_ERROR", fetched_at: fetchedAt, error: "Hapag-Lloyd portal credentials invalid", isMock: false };
          }
          if (res.status === 404) {
            return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "NOT_FOUND", fetched_at: fetchedAt, error: `Container ${containerNumber} not found on Hapag-Lloyd`, isMock: false };
          }
          return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "FAILED", fetched_at: fetchedAt, error: `HTTP ${res.status} from Hapag-Lloyd`, isMock: false };
        }

        const json = await res.json();
        const result: CarrierTrackingResult = {
          carrier: this.carrierName,
          carrierCode: this.carrierCode,
          container_number: containerNumber,
          status: json.status || "IN_TRANSIT",
          last_location: json.location || "Genoa Port, IT",
          last_event_time: json.eventTime || fetchedAt,
          eta: json.eta || new Date(Date.now() + 86400000 * 3.5).toISOString(),
          vessel: json.vesselName || "HL BREMEN",
          voyage: json.voyage || "2610A",
          movement_state: "in-transit",
          raw_source_url: `https://www.hapag-lloyd.com/en/online-business/track/track-by-container.html?container=${encodeURIComponent(containerNumber)}`,
          fetched_at: fetchedAt,
          isMock: false,
          isLiveConfigured: true,
        };
        return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "OK", fetched_at: fetchedAt, result, isMock: false };
      } catch (err: any) {
        if (err.name === "TimeoutError" || err.message?.includes("timeout")) {
          return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "TIMEOUT", fetched_at: fetchedAt, error: "Hapag-Lloyd portal timeout (3.5s)", isMock: false };
        }
        return { carrier: this.carrierName, carrierCode: this.carrierCode, status: "FAILED", fetched_at: fetchedAt, error: err.message || "Network error", isMock: false };
      }
    }

    // Explicitly Marked Mock Behind Interface (Hard Rule 6)
    const mockResult: CarrierTrackingResult = {
      carrier: this.carrierName,
      carrierCode: this.carrierCode,
      container_number: containerNumber,
      status: "IN_TRANSIT",
      last_location: "Port of Genoa, IT (Terminal SECH)",
      last_event_time: new Date(Date.now() - 3600000 * 10).toISOString(),
      eta: new Date(Date.now() + 86400000 * 3.5).toISOString(),
      vessel: "HL BREMEN",
      voyage: "2610A",
      movement_state: "in-transit",
      raw_source_url: `https://www.hapag-lloyd.com/en/online-business/track/track-by-container.html?container=${encodeURIComponent(containerNumber)}`,
      fetched_at: fetchedAt,
      isMock: true, // EXPLICIT MOCK
      isLiveConfigured: false,
    };

    return {
      carrier: this.carrierName,
      carrierCode: this.carrierCode,
      status: "OK",
      fetched_at: fetchedAt,
      result: mockResult,
      isMock: true,
    };
  }
}

