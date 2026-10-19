import { webSearch, searchNews, fetchWebpage, formatWebSearchResultsAsText } from "../src/lib/search/web-search";

async function runTests() {
  console.log("--- 1. Testing searchNews for Bahrain Prime Minister ---");
  const newsRes = await searchNews("Bahrain Prime Minister", "last 24 hours");
  console.log("Status:", newsRes.status, "Provider:", newsRes.provider, "Count:", newsRes.results.length);
  if (newsRes.results.length > 0) {
    console.log("First Result:", newsRes.results[0].title);
    console.log("Published Date:", newsRes.results[0].publishedDate);
    console.log("URL:", newsRes.results[0].url);
  }

  console.log("\n--- 2. Testing webSearch for NASS Group Bahrain announcements ---");
  const webRes = await webSearch("NASS Group Bahrain public announcements");
  console.log("Status:", webRes.status, "Provider:", webRes.provider, "Count:", webRes.results.length);
  if (webRes.results.length > 0) {
    console.log("First Web Result:", webRes.results[0].title);
    console.log("URL:", webRes.results[0].url);
  }

  console.log("\n--- 3. Testing formatWebSearchResultsAsText ---");
  const formatted = formatWebSearchResultsAsText(newsRes);
  console.log("Formatted output preview:\n", formatted.slice(0, 450));
}

runTests();
