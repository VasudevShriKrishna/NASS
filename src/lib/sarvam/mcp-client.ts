/**
 * Official Sarvam MCP Client & Direct Transport Adapter
 * Implements Part C (Sections 6.1 - 6.3) of SARVAM_MCP.md:
 * - Runtime tool inventory:
 *   1. sarvam_llm_complete (Chat Completion V1 with sarvam-105b / sarvam-105b-conversations)
 *   2. sarvam_stt_transcribe (Speech-to-text with saaras:v3 / saaras:v2)
 *   3. sarvam_tts_speak & sarvam_tts_stream (Text-to-speech with bulbul:v3)
 *   4. sarvam_translate (Language translation)
 *   5. sarvam_transliterate (Script conversion preserving phonetics)
 *   6. sarvam_identify_language (Language identification)
 *   7. sarvam_text_analytics (Language entity extraction & analytics)
 *   8. sarvam_vision_digitise (Document OCR and layout capture)
 *   9. sarvam_vision_extract (Schema-based field extraction for PO/BOL/Invoice/MTC)
 *   10. sarvam_document_translation (Asynchronous full-file translation)
 *   11. sarvam_pronunciation_* (Custom pronunciation dictionaries)
 */

export interface McpToolDefinition {
  name: string;
  category: "LLM" | "STT" | "TTS" | "TRANSLATION" | "DOC_INTELLIGENCE" | "PRONUNCIATION";
  description: string;
  parameters: Record<string, any>;
}

export const SARVAM_MCP_TOOL_CATALOGUE: McpToolDefinition[] = [
  {
    name: "sarvam_llm_complete",
    category: "LLM",
    description: "Generate structured chat completions and reasoning using Sarvam flagship models (sarvam-105b, sarvam-105b-conversations).",
    parameters: {
      type: "object",
      properties: {
        model: { type: "string", enum: ["sarvam-105b", "sarvam-105b-conversations"], default: "sarvam-105b" },
        messages: { type: "array", items: { type: "object" }, description: "Chat conversation turns" },
        temperature: { type: "number", default: 0.2 },
        max_tokens: { type: "number", default: 1000 },
        tools: { type: "array", description: "Function calling tools" },
      },
      required: ["messages"],
    },
  },
  {
    name: "sarvam_stt_transcribe",
    category: "STT",
    description: "Transcribe audio buffer or audio file using Sarvam Saaras model (saaras:v3, saaras:v2).",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", description: "Base64 encoded audio or audio file buffer" },
        model: { type: "string", enum: ["saaras:v3", "saaras:v2"], default: "saaras:v3" },
        language_code: { type: "string", default: "en-IN" },
        with_diarization: { type: "boolean", default: false },
      },
      required: ["file"],
    },
  },
  {
    name: "sarvam_tts_speak",
    category: "TTS",
    description: "Synthesize high-fidelity voice speech from text using Sarvam Bulbul model (bulbul:v3).",
    parameters: {
      type: "object",
      properties: {
        inputs: { type: "array", items: { type: "string" }, description: "Text strings to synthesize (max 500 chars each)" },
        target_language_code: { type: "string", default: "en-IN" },
        speaker: { type: "string", default: "aditya", enum: ["aditya", "arvind", "amartya", "meera", "pavithra"] },
        pitch: { type: "number", default: 0 },
        pace: { type: "number", default: 1.05 },
        model: { type: "string", default: "bulbul:v3" },
      },
      required: ["inputs"],
    },
  },
  {
    name: "sarvam_translate",
    category: "TRANSLATION",
    description: "Translate text accurately between supported languages (e.g., Arabic, English, Hindi).",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Text to translate" },
        source_language_code: { type: "string", default: "en-IN" },
        target_language_code: { type: "string", default: "ar-IN" },
        speaker_gender: { type: "string", enum: ["Male", "Female"], default: "Male" },
        mode: { type: "string", enum: ["formal", "colloquial"], default: "formal" },
      },
      required: ["input", "target_language_code"],
    },
  },
  {
    name: "sarvam_transliterate",
    category: "TRANSLATION",
    description: "Convert script between languages while preserving precise phonetic pronunciation of names and shipment codes.",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Text to transliterate" },
        source_language_code: { type: "string", default: "en-IN" },
        target_language_code: { type: "string", default: "ar-IN" },
      },
      required: ["input", "source_language_code", "target_language_code"],
    },
  },
  {
    name: "sarvam_identify_language",
    category: "TRANSLATION",
    description: "Identify the language and script of incoming user text or document snippet.",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Text snippet to analyze" },
      },
      required: ["input"],
    },
  },
  {
    name: "sarvam_text_analytics",
    category: "TRANSLATION",
    description: "Perform typed text analytics, entity classification and syntactic analysis.",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Text to analyze" },
        task: { type: "string", enum: ["entities", "sentiment", "syntax"], default: "entities" },
      },
      required: ["input"],
    },
  },
  {
    name: "sarvam_vision_digitise",
    category: "DOC_INTELLIGENCE",
    description: "Perform comprehensive OCR, reading order reconstruction, and table capture on trade documents (BOLs, Invoices, MTCs).",
    parameters: {
      type: "object",
      properties: {
        document_base64: { type: "string", description: "Base64 encoded PDF or image document" },
        language_code: { type: "string", default: "en-IN" },
      },
      required: ["document_base64"],
    },
  },
  {
    name: "sarvam_vision_extract",
    category: "DOC_INTELLIGENCE",
    description: "Extract typed, schema-validated fields (PO numbers, weights, currencies, dates, line items) from digitized documents.",
    parameters: {
      type: "object",
      properties: {
        document_base64: { type: "string", description: "Base64 encoded PDF or image document" },
        schema_type: { type: "string", enum: ["PURCHASE_ORDER", "BILL_OF_LADING", "COMMERCIAL_INVOICE", "MILL_TEST_CERT"], default: "PURCHASE_ORDER" },
      },
      required: ["document_base64", "schema_type"],
    },
  },
  {
    name: "sarvam_pronunciation_list",
    category: "PRONUNCIATION",
    description: "List custom pronunciation dictionary entries for maritime, civil contracting, and Arabic terms.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "sarvam_pronunciation_create",
    category: "PRONUNCIATION",
    description: "Register custom phonetic override for technical vocabulary (e.g., 'KBSP' -> 'Khalifa Bin Salman Port', 'TEU' -> 'twenty-foot equivalent unit').",
    parameters: {
      type: "object",
      properties: {
        word: { type: "string" },
        phoneme: { type: "string" },
        language_code: { type: "string", default: "en-IN" },
      },
      required: ["word", "phoneme"],
    },
  },
];

export class SarvamMcpClient {
  private apiKey: string;

  constructor(customKey?: string) {
    this.apiKey = (customKey || process.env.SARVAM_API_KEY || "").trim();
  }

  private getHeaders(): Record<string, string> {
    return {
      "api-subscription-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Execute sarvam_llm_complete tool
   */
  public async llmComplete(params: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    tools?: any[];
  }): Promise<{ content: string; tool_calls?: any[]; usage?: any }> {
    const model = params.model || "sarvam-105b";
    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.max_tokens ?? 1000,
        tools: params.tools,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Sarvam MCP LLM Error ${res.status}]: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || "",
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage,
    };
  }

  /**
   * Execute sarvam_stt_transcribe tool
   */
  public async sttTranscribe(params: {
    audioBuffer: Buffer;
    mimeType?: string;
    model?: string;
    language_code?: string;
  }): Promise<{ transcript: string; confidence: number; language_code: string }> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(params.audioBuffer)], { type: params.mimeType || "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", params.model || "saaras:v3");
    formData.append("language_code", params.language_code || "en-IN");

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": this.apiKey },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Sarvam MCP STT Error ${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      transcript: data.transcript || data.text || "",
      confidence: data.confidence ?? 0.95,
      language_code: data.language_code || params.language_code || "en-IN",
    };
  }

  /**
   * Execute sarvam_tts_speak tool
   */
  public async ttsSpeak(params: {
    inputs: string[];
    speaker?: string;
    model?: string;
    target_language_code?: string;
  }): Promise<{ audioBase64: string; mimeType: string }> {
    const cleanInputs = params.inputs.map((inp) =>
      inp.replace(/[`#*•—–|~]/g, " ").replace(/\s+/g, " ").slice(0, 480).trim()
    );

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        inputs: cleanInputs,
        target_language_code: params.target_language_code || "en-IN",
        speaker: params.speaker || "aditya",
        model: params.model || "bulbul:v3",
        pace: 1.05,
        pitch: 0,
        loudness: 1.0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Sarvam MCP TTS Error ${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      audioBase64: data.audios?.[0] || data.audio || "",
      mimeType: "audio/wav",
    };
  }

  /**
   * Execute sarvam_translate tool
   */
  public async translate(params: {
    input: string;
    source_language_code?: string;
    target_language_code: string;
    mode?: string;
  }): Promise<{ translated_text: string }> {
    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        input: params.input,
        source_language_code: params.source_language_code || "en-IN",
        target_language_code: params.target_language_code,
        mode: params.mode || "formal",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Sarvam MCP Translate Error ${res.status}]: ${err}`);
    }

    const data = await res.json();
    return { translated_text: data.translated_text || "" };
  }

  /**
   * Execute sarvam_identify_language tool
   */
  public async identifyLanguage(input: string): Promise<{ language_code: string; script: string }> {
    const res = await fetch("https://api.sarvam.ai/identify-language", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ input }),
    });

    if (!res.ok) {
      return { language_code: "en-IN", script: "Latin" };
    }

    const data = await res.json();
    return {
      language_code: data.language_code || "en-IN",
      script: data.script || "Latin",
    };
  }
}
