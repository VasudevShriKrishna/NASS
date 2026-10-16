import { PrismaClient } from '@prisma/client'
const db = new PrismaClient({ log: [] })

const out: any = {}
const section = (name: string, data: any) => { out[name] = data }

const po3001 = await db.purchaseOrder.findFirst({
  where: { ref: 'PO-3001' },
  include: { lines: { include: { shipment: { select: { ref: true, status: true, mode: true } }, material: { select: { sku: true } } } } }
})
section('po3001', po3001 ? {
  id: po3001.id, ref: po3001.ref, status: po3001.status, supplierId: po3001.supplierId, projectId: po3001.projectId,
  totalAmount: po3001.totalAmount, currency: po3001.currency, promisedDate: po3001.promisedDate,
  lines: po3001.lines.map(l => ({ id: l.id, material: l.material?.sku, qty: l.quantity, uom: l.uom, receivedQty: l.receivedQty, lineStatus: l.lineStatus, shipmentId: l.shipmentId, shipment: l.shipment?.ref, shipmentStatus: l.shipment?.status }))
} : null)

const shipmentsForPo = await db.shipment.findMany({ where: { po: { ref: 'PO-3001' } }, select: { id: true, ref: true, status: true, mode: true, originPort: true, destinationPort: true, poId: true, projectId: true, supplierId: true } })
section('shipments_poId_po3001', shipmentsForPo)

const poLineShipmentIds = po3001 ? po3001.lines.map(l => l.shipmentId).filter(Boolean) : []
const shipmentsViaLines = poLineShipmentIds.length ? await db.shipment.findMany({ where: { id: { in: poLineShipmentIds as string[] } }, select: { id: true, ref: true, status: true, mode: true, poId: true } }) : []
section('shipments_via_poLine_shipmentId', shipmentsViaLines)

const relShipIds = Array.from(new Set([...shipmentsForPo.map(s => s.id), ...shipmentsViaLines.map(s => s.id)]))
const allLots = await db.inventoryLot.findMany({ include: { material: { select: { sku: true, name: true } } } })
const shipById = new Map<string, { ref: string; status: string; poId: string | null }>()
const shipsAll = await db.shipment.findMany({ select: { id: true, ref: true, status: true, poId: true } })
for (const s of shipsAll) shipById.set(s.id, { ref: s.ref, status: s.status, poId: s.poId })
const poIdToRef = new Map((await db.purchaseOrder.findMany({ select: { id: true, ref: true } })).map(p => [p.id, p.ref]))

const lotsForRelShips = allLots.filter(l => l.shipmentId && relShipIds.includes(l.shipmentId))
section('inventoryLots_by_shipmentId', lotsForRelShips.map(l => ({ id: l.id, material: l.material.sku, status: l.status, qty: l.quantity, uom: l.uom, shipmentId: l.shipmentId, shipment: shipById.get(l.shipmentId!)?.ref, shipmentStatus: shipById.get(l.shipmentId!)?.status, poId: l.poId, poRef: l.poId ? poIdToRef.get(l.poId) : null })))

const lotsByStatus = await db.inventoryLot.groupBy({ by: ['status'], _count: true, _sum: { quantity: true } })
section('inventoryLots_groupBy_status', lotsByStatus)

const allTransitLots = allLots.filter(l => l.status === 'IN_TRANSIT')
section('all_IN_TRANSIT_lots', allTransitLots.map(l => ({ material: l.material.sku, qty: l.quantity, uom: l.uom, shipmentId: l.shipmentId, shipmentRef: l.shipmentId ? shipById.get(l.shipmentId)?.ref : null, shipmentStatus: l.shipmentId ? shipById.get(l.shipmentId)?.status : null, shipmentPoRef: l.shipmentId ? (shipById.get(l.shipmentId)?.poId ? poIdToRef.get(shipById.get(l.shipmentId)!.poId!) : null) : null, poRef: l.poId ? poIdToRef.get(l.poId) : null, warehouseId: l.warehouseId, projectId: l.projectId })))

const allShipments = await db.shipment.findMany({ select: { ref: true, status: true, poId: true }, orderBy: { ref: 'asc' } })
section('all_shipments', allShipments.map(s => ({ ref: s.ref, status: s.status, poRef: s.poId ? poIdToRef.get(s.poId) : null })))

const allPOs = await db.purchaseOrder.findMany({ select: { id: true, ref: true, status: true, supplierId: true, projectId: true, totalAmount: true, currency: true } })
section('all_purchaseOrders', allPOs.map(p => ({ ...p, id: p.id.slice(0, 8) + '…' })))

// materials in-transit computation source: what does '120 tonnes' map to?
const inTransitSummary = allTransitLots.reduce((acc, l) => {
  const key = l.uom
  acc[key] = (acc[key] || 0) + l.quantity
  return acc
}, {} as Record<string, number>)
section('in_transit_total_by_uom', inTransitSummary)

console.log(JSON.stringify(out, null, 1))
await db.$disconnect()
