import { db } from "../src/lib/db";

async function inspectDb() {
  const projects = await db.project.findMany();
  console.log("Projects found:", projects.length);
  for (const p of projects) {
    console.log(`- ${p.code}: legalEntityId=${p.legalEntityId}, status=${p.status}`);
  }

  const entities = await db.legalEntity.findMany();
  console.log("\nLegal Entities found:", entities.length);
  for (const e of entities) {
    console.log(`- ID=${e.id}, code=${e.code}, name=${e.name}`);
  }
}

inspectDb().catch(console.error);
