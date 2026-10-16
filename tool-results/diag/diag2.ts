import { PrismaClient } from '@prisma/client'
const db = new PrismaClient({ log: [] })
const out: any = {}

const receipts = await db.goodsReceipt.findMany({
  orderBy: { receivedAt: 'desc' },
  include: { poLine: { include: { po: { select: { ref: true } }, material: { select: { sku: true } } } }, shipment: { select: { ref: true } }, warehouse: { select: { code: true } }, material: { select: { sku: true } } },
})
out.receipts = receipts.map(g => ({
  ref: g.ref, grnNo: g.grnNo, po: g.poLine?.po?.ref, poLineId: g.poLineId?.slice(-6), material: g.material.sku,
  shipment: g.shipment?.ref, warehouse: g.warehouse.code, expectedQty: g.expectedQty, receivedQty: g.receivedQty, uom: g.uom,
  status: g.status, qcResult: g.qcResult, discrepancyType: g.discrepancyType, discrepancyQty: g.discrepancyQty,
  receivedBy: g.receivedBy, receivedAt: g.receivedAt, note: g.note, lotNo: g.lotNo,
}))

// exact duplicates by (material, expectedQty, receivedQty, receivedAt)
const seen = new Map<string, typeof receipts>()
for (const g of receipts) {
  const k = `${g.poLineId}|${g.materialId}|${g.expectedQty}|${g.receivedQty}|${g.uom}|${g.receivedAt}`
  if (!seen.has(k)) seen.set(k, [] as any)
  ;(seen.get(k) as any).push(g)
}
out.duplicateGroups = Array.from(seen.values()).filter(a => (a as any[]).length > 1).map(grp => (grp as any[]).map(g => ({ ref: g.ref, grnNo: g.grnNo, status: g.status, qcResult: g.qcResult, note: g.note })))

// GRN number reuse
const grnMap = new Map<string, string[]>()
for (const g of receipts) {
  if (!g.grnNo) continue
  if (!grnMap.has(g.grnNo)) grnMap.set(g.grnNo, [])
  grnMap.get(g.grnNo)!.push(g.ref)
}
out.grnReused = Array.from(grnMap.entries()).filter(([, refs]) => refs.length > 1)

const connectors = await db.connector.findMany({ orderBy: { name: 'asc' } })
out.connectors = connectors.map(c => ({
  name: c.name, category: c.category, mode: c.mode, status: c.status, freshnessClass: c.freshnessClass,
  lastSyncAt: c.lastSyncAt, latencyMs: c.latencyMs, failedRecords: c.failedRecords, retryQueue: c.retryQueue,
  deadLetter: c.deadLetter, apiQuotaPct: c.apiQuotaPct, coverageNote: c.coverageNote, evidenceLabel: c.evidenceLabel,
}))

// quotes / rfqs (item 9)
const quotes = await db.quote.findMany({ orderBy: { receivedAt: 'desc' }, include: { rfq: { select: { ref: true, status: true, dueDate: true, pr: { select: { ref: true } } } }, supplier: { select: { code: true, name: true } } } })
out.quotes = quotes.map(q => ({
  rfq: q.rfq.ref, rfqStatus: q.rfq.status, rfqDue: q.rfq.dueDate, pr: q.rfq.pr.ref, supplier: q.supplier.code,
  version: q.version, status: q.status, unitPrice: q.unitPrice, currency: q.currency, leadTimeDays: q.leadTimeDays,
  validity: q.validity, receivedAt: q.receivedAt, rank: q.rank, landedCost: q.landedCost,
}))
const rfqs = await db.rFQ.findMany({ include: { pr: { select: { ref: true } }, quotes: { select: { id: true } } } })
out.rfqs = rfqs.map(r => ({ ref: r.ref, pr: r.pr.ref, status: r.status, dueDate: r.dueDate, quotes: r.quotes.length }))

// server now for reference
out.dbNowSampleMaxReceivedAt = receipts[0]?.receivedAt

console.log(JSON.stringify(out, null, 1))
await db.$disconnect()
