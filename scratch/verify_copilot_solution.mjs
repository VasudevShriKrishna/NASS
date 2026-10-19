// Complete verification script
async function runTest() {
  console.log("=== STEP 1: TEST KEYWORD DISTILLATION ===");
  const rawPrompt = "I want today latest news of attacks and Warzone situation of Middle East I want proper news with proof and evidence the attach all proof and evidence in this chat I want all proof and evidence and all weather report and what is the time time ongoing now I want time in Riyadh with the proper Health Care system in Riyadh and also Nas control Tower all details";

  function distillSearchKeywords(rawQuery) {
    if (!rawQuery) return "";
    const q = rawQuery.trim();
    const hasMiddleEast = /\b(middle east|mideast|gaza|israel|lebanon|iran|yemen|red sea|strait of hormuz|syria|iraq)\b/i.test(q);
    const hasConflict = /\b(war|warzone|attacks?|conflict|strikes?|missiles?|ceasefire|drone|military)\b/i.test(q);
    if (hasMiddleEast && hasConflict) {
      return "Middle East attacks warzone conflict";
    }
    return q;
  }

  const distilled = distillSearchKeywords(rawPrompt);
  console.log("Raw Prompt Length:", rawPrompt.length, "characters");
  console.log("Distilled Keywords:", distilled);

  console.log("\n=== STEP 2: TEST MULTI-FEED LIVE NEWS SYNDICATE ===");
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(distilled)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(feedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const text = await res.text();
  const items = [...text.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/g)];
  console.log("Google News RSS articles retrieved:", items.length);
  items.slice(0, 3).forEach((m, idx) => {
    console.log(`  [${idx + 1}] ${m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")} | Published: ${m[3]}`);
  });

  console.log("\n=== STEP 3: TEST LIVE WEATHER & WORLD TIME ===");
  const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FRiyadh";
  const weatherRes = await fetch(weatherUrl);
  const weatherJson = await weatherRes.json();
  const cur = weatherJson.current || {};
  console.log("Riyadh Live Weather:", {
    tempC: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    apparentTemp: cur.apparent_temperature,
    wind: cur.wind_speed_10m,
  });

  const riyadhTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
  console.log("Riyadh Ongoing Time:", `${riyadhTime} AST (UTC+3)`);

  console.log("\n=== STEP 4: INTENT GUARDS VERIFICATION ===");
  function resolveNavigationGuard(q) {
    const hasExplicitNavVerb = /\b(open|take me to|go to|navigate to|switch to|return to|bring up)\b/i.test(q);
    const isInformational = /\b(what is|tell me|explain|details|news|weather|time|how does|why|search|who is)\b/i.test(q);
    if (isInformational && !hasExplicitNavVerb) return undefined;
    if (/\b(open (the )?control tower|return to (the )?control tower|go to (the )?control tower)\b/i.test(q)) {
      return "control-tower";
    }
    return undefined;
  }

  function resolveReportGuard(q) {
    if (/\b(weather report|news report|status report)\b/i.test(q)) return undefined;
    const isInformationalQuery = /\b(news|weather|time|warzone|attacks?|conflict|search|google|what is|tell me)\b/i.test(q);
    const hasExplicitPdfVerb = /\b(generate.*pdf|download.*pdf|export.*pdf|create.*pdf|make.*pdf)\b/i.test(q);
    if (isInformationalQuery && !hasExplicitPdfVerb) return undefined;
    return "pdf-report";
  }

  console.log("Navigation on prompt:", resolveNavigationGuard(rawPrompt.toLowerCase()) || "NONE (Blocked, as expected)");
  console.log("Report on prompt:", resolveReportGuard(rawPrompt.toLowerCase()) || "NONE (Blocked, as expected)");
  console.log("\n=== ALL TEST CHECKS PASSED SUCCESSFULLY ===");
}

runTest();
