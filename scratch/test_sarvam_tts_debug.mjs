import dotenv from 'dotenv';
dotenv.config();

const key = process.env.SARVAM_API_KEY;

async function testBulbulWithAnswer() {
  const answer = `**NASS Group Executive Project Portfolio (8 Projects):**

• **Confirmed Active Projects (7):**
  - **PRJ-2201: Bahrain Marina Development (Phase 1 Main Works — Boardwalk, Marina Tower & Retail)** | Client: Bahrain Marina Development Company | Value: BHD 48,500,000 (≈ USD 128,985,750) | Progress: 52% (Planned: 50%)`;

  const sanitizedText = answer
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[`#_•—–|~]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 480)
    .trim();

  console.log("Sending length:", sanitizedText.length);
  console.log("Sending text:", sanitizedText);

  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: [sanitizedText],
      target_language_code: "en-IN",
      speaker: "aditya",
      pitch: 0,
      pace: 1.05,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v3"
    })
  });

  console.log("Status:", res.status);
  const data = await res.json();
  if (!res.ok) {
    console.error("Error:", data);
  } else {
    console.log("TTS Success! Audio base64 length:", data.audios?.[0]?.length);
  }
}

testBulbulWithAnswer();
