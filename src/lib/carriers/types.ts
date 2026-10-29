/**
 * Carrier Adapter Layer - Common Interface & Types (Step 3 & Step 4)
 * Standardizes normalized tracking outputs across MAERSK, MSC, CMA CGM, ONE, and Hapag-Lloyd.
 */

export type CarrierCode = "MAERSK" | "MSC" | "CMA_CGM" | "ONE" | "HAPAG_LLOYD";

export type CarrierOutcome = "OK" | "FAILED" | "TIMEOUT" | "AUTH_ERROR" | "NOT_FOUND";

export type MovementState = "gate-in" | "loaded" | "in-transit" | "discharged" | "gate-out" | "delivered";

export interface CarrierTrackingResult {
  carrier: string;
  carrierCode: CarrierCode;
  container_number: string;
  status: string;
  last_location: string;
  last_event_time: string;
  eta: string;
  vessel: string;
  voyage: string;
  movement_state: MovementState;
  raw_source_url: string;
  fetched_at: string;
  isMock: boolean; // Explicitly marked mock indicator (Rule 6)
  isLiveConfigured: boolean;
}

export interface CarrierFetchReport {
  carrier: string;
  carrierCode: CarrierCode;
  status: CarrierOutcome;
  fetched_at: string;
  error?: string;
  result?: CarrierTrackingResult;
  isMock: boolean;
}

export interface CarrierAdapter {
  carrierCode: CarrierCode;
  carrierName: string;
  isLiveConfigured: boolean;
  track(containerNumber: string): Promise<CarrierFetchReport>;
}

