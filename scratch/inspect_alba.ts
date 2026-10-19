import { db } from "../src/lib/db";

async function testAlba() {
  const p = await db.project.findFirst({
    where: { code: "PRJ-ALBA-06" },
    include: {
      materialRequirements: {
        include: { material: true },
      },
      workPackages: true,
      purchaseOrders: true,
    },
  });

  console.log("PRJ-ALBA-06 details:");
  console.log("ID:", p?.id);
  console.log("Name:", p?.name);
  console.log("Status:", p?.status);
  console.log("StatusClassification:", p?.statusClassification);
  console.log("Material Requirements Count:", p?.materialRequirements.length);
  console.log("Work Packages Count:", p?.workPackages.length);
  console.log("Work Packages:", p?.workPackages);
}

testAlba().catch(console.error);
