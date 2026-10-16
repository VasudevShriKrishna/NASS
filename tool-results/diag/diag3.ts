import { PrismaClient } from '@prisma/client'
const db = new PrismaClient({ log: [] })
const out: any = {}

// ETA observations per shipment
const etaObs = await db.etaObservation.findMany({ orderBy: { calculatedAt: 'desc' }, include: { shipment: { select: { ref: true } } } })
out.etaObservations = etaObs.map(o => ({
  shipment: o.shipment.ref, estimateType: o.estimateType, sourceName: o.sourceName, etaValue: o.etaValue,
  etaRangeFrom: o.etaRangeFrom, etaRangeTo: o.etaRangeTo, calculatedAt: o.calculatedAt, inputAsOf: (o as any).inputAsOf ?? null,
  confidence: o.confidence, isActive: o.isActive, inputLineage: o.inputLineage, note: o.note,
}))

// shipments eta fields summary
const ships = await db.shipment.findMany({ select: { ref: true, displayEta: true, displayEtaSource: true, displayEtaType: true, etaPrecedencePolicy: true, supplierPromisedEta: true, carrierEta: true, carrierEtaAt: true, carrierEtaFreshness: true, portScheduleEta: true, modelPredictedEta: true, modelConfidence: true, modelInputAsOf: true, vesselPositionAt: true, vesselSource: true, freshness: true, lastEventAt: true } })
out.shipsEta = ships

// inventory lots for aging (item 7)
const lots = await db.inventoryLot.findMany({ include: { material: { select: { sku: true } }, warehouse: { select: { code: true } } }, orderBy: { createdAt: 'asc' } })
out.lots = lots.map(l => ({
  material: l.material.sku, warehouse: l.warehouse.code, status: l.status, qty: l.quantity, uom: l.uom,
  poId: l.poId, shipmentId: l.shipmentId, lastVerifiedAt: l.lastVerifiedAt, createdAt: l.createdAt, note: l.note,
}))
// distinct lastVerifiedAt null count
out.lotsVerifiedNull = lots.filter(l => !l.lastVerifiedAt).length
out.lotsVerified = lots.filter(l => l.lastVerifiedAt).map(l => ({ material: l.material.sku, lastVerifiedAt: l.lastVerifiedAt, createdAt: l.createdAt }))

console.log(JSON.stringify(out, null, 1))
await db.$disconnect()
