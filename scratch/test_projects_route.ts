import { GET } from "../src/app/api/projects/route";

async function main() {
  try {
    const res = await GET();
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data keys:", Object.keys(data));
    console.log("Projects count:", data.data?.projects?.length);
    console.log("Requirements count:", data.data?.requirements?.length);
  } catch (err) {
    console.error("Local GET /api/projects threw error:", err);
  }
}

main();
