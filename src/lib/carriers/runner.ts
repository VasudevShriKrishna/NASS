/**
 * Carrier Adapter Runner (Step 3 & Step 4)
 * Coordinates parallel execution of MAERSK, MSC, CMA CGM, ONE, and Hapag-Lloyd adapters.
 * Manages retries, timeouts, database audit logging, and location conflict detection.
 */

import { CarrierAdapter, CarrierFetchReport, CarrierOutcome, CarrierTrackingResult } from "./types";
import { MaerskCarrierAdapter } from "./adapters/maersk";
import { MscCarrierAdapter } from "./adapters/msc";
import { CmaCgmCarrierAdapter } from "./adapters/cma-cgm";
import { OneCarrierAdapter } from "./adapters/one";
import { HapagLloydCarrierAdapter } from "./adapters/hapag-lloyd";
import { db } from "../db";

export interface ParallelCarrierRunResult {
  containerNumber: string;
  reports: CarrierFetchReport[];
  primaryTracking?: CarrierTrackingResult;
  hasConflict: boolean;
  conflictingReports: Array<{ carrier: string; location: string; timestamp: string }>;
  allFailed: boolean;
  lastKnownPosition?: { location: string; timestamp: string; source: string };
}

const adapters: CarrierAdapter[] = [
  new MaerskCarrierAdapter(),
  new MscCarrierAdapter(),
  new CmaCgmCarrierAdapter(),
  new OneCarrierAdapter(),
  new HapagLloydCarrierAdapter(),
];

/**
 * Execute tracking with 1 retry on transient failure
 */
async function trackWithRetry(adapter: CarrierAdapter, containerNumber: string): Promise<CarrierFetchReport> {
  let report = await adapter.track(containerNumber);
  if (report.status === "TIMEOUT" || report.status === "FAILED") {
    // Retry once as mandated by Step 3
    try {
      report = await adapter.track(containerNumber);
    } catch {
      // Keep previous failure report
    }
  }
  return report;
}

export async function fetchContainerFromCarriers(containerNumber: string): Promise<ParallelCarrierRunResult> {
  const container = containerNumber.trim().toUpperCase();

  // Execute all 5 adapters in parallel
  const settled = await Promise.allSettled(
    adapters.map((adapter) => trackWithRetry(adapter, container))
  );

  const reports: CarrierFetchReport[] = settled.map((s, idx) => {
    if (s.status === "fulfilled") {
      return s.value;
    }
    return {
      carrier: adapters[idx].carrierName,
      carrierCode: adapters[idx].carrierCode,
      status: "FAILED" as CarrierOutcome,
      fetched_at: new Date().toISOString(),
      error: s.reason?.message || "Execution error",
      isMock: false,
    };
  });

  // Persist outcomes into CarrierFetchLog (Step 3)
  for (const rep of reports) {
    try {
      await db.carrierFetchLog.create({
        data: {
          containerNumber: container,
          carrier: rep.carrierCode,
          status: rep.status,
          fetchedAt: new Date(rep.fetched_at),
          error: rep.error || null,
        },
      });
    } catch {
      // Audit log error shouldn't crash carrier tracking
    }
  }

  // Location Conflict Check (Step 4)
  const successfulReports = reports.filter((r) => r.status === "OK" && r.result);
  const locationMap = new Map<string, { carrier: string; timestamp: string }>();
  const distinctLocations = new Set<string>();

  for (const r of successfulReports) {
    if (r.result?.last_location) {
      const locNorm = r.result.last_location.trim().toLowerCase();
      distinctLocations.add(locNorm);
      locationMap.set(r.result.last_location, {
        carrier: r.carrier,
        timestamp: r.result.last_event_time,
      });
    }
  }

  const hasConflict = distinctLocations.size > 1;
  const conflictingReports: Array<{ carrier: string; location: string; timestamp: string }> = [];

  if (hasConflict) {
    for (const [loc, meta] of locationMap.entries()) {
      conflictingReports.push({
        carrier: meta.carrier,
        location: loc,
        timestamp: meta.timestamp,
      });
    }

    // Flag alert in ShipmentAlert table: "location conflict between carriers" (Step 6)
    try {
      await db.shipmentAlert.create({
        data: {
          containerNumber: container,
          type: "location conflict between carriers",
          severity: "HIGH",
          message: `Location discrepancy detected for container ${container}: reported at different locations across carriers.`,
          state: "DETECTED",
        },
      });
    } catch {}
  }

  // Primary tracking result
  const primaryTracking = successfulReports[0]?.result;

  // Persist container position if confirmed (Step 4)
  if (primaryTracking?.last_location) {
    try {
      await db.containerPosition.create({
        data: {
          containerNumber: container,
          location: primaryTracking.last_location,
          source: primaryTracking.carrier,
          timestamp: new Date(primaryTracking.last_event_time),
          state: primaryTracking.movement_state || "in-transit",
        },
      });
    } catch {}
  }

  const allFailed = successfulReports.length === 0;
  let lastKnownPosition: { location: string; timestamp: string; source: string } | undefined;

  if (allFailed) {
    // If every carrier fails, retrieve last known position from DB (Step 3)
    try {
      const lastPos = await db.containerPosition.findFirst({
        where: { containerNumber: container },
        orderBy: { timestamp: "desc" },
      });
      if (lastPos) {
        lastKnownPosition = {
          location: lastPos.location,
          timestamp: lastPos.timestamp.toISOString(),
          source: lastPos.source,
        };
      }
    } catch {}
  }

  return {
    containerNumber: container,
    reports,
    primaryTracking,
    hasConflict,
    conflictingReports,
    allFailed,
    lastKnownPosition,
  };
}
