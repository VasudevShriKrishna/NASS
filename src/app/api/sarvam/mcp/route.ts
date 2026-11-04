import { NextRequest, NextResponse } from "next/server";
import { SARVAM_MCP_TOOL_CATALOGUE, SarvamMcpClient } from "@/lib/sarvam/mcp-client";
import { NASS_APPLICATION_TOOLS, executeNassTool } from "@/lib/sarvam/nass-tools";
import { fetchNassNewsBriefing, getLiveMaritimeVessels, getConnectorHealthSummary } from "@/lib/sarvam/live-connectors";
import { processTradeDocument } from "@/lib/sarvam/document-intelligence";

export const dynamic = "force-dynamic";

/**
 * GET /api/sarvam/mcp — Discover available Sarvam MCP runtime tools and NASS application tools
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    server: "sarvam-mcp-gateway",
    version: "2.1.0",
    primaryReasoningModel: "sarvam-105b",
    voiceSpecialistModel: "sarvam-105b-conversations",
    mcpTools: SARVAM_MCP_TOOL_CATALOGUE,
    nassApplicationTools: NASS_APPLICATION_TOOLS,
  });
}

/**
 * POST /api/sarvam/mcp — Execute a specific MCP or Application tool
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolName, parameters = {} } = body;

    const apiKey = process.env.SARVAM_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "SARVAM_API_KEY is required to invoke Sarvam MCP tools." },
        { status: 401 }
      );
    }

    const client = new SarvamMcpClient(apiKey);

    // 1. Check Sarvam Official MCP Tool Execution
    if (toolName === "sarvam_llm_complete") {
      const res = await client.llmComplete(parameters);
      return NextResponse.json({ success: true, toolName, result: res });
    }

    if (toolName === "sarvam_translate") {
      const res = await client.translate(parameters);
      return NextResponse.json({ success: true, toolName, result: res });
    }

    if (toolName === "sarvam_identify_language") {
      const res = await client.identifyLanguage(parameters.input);
      return NextResponse.json({ success: true, toolName, result: res });
    }

    if (toolName === "sarvam_vision_extract") {
      const res = await client.visionExtract({
        document_base64: parameters.document_base64 || "",
        fileName: parameters.fileName || "trade_document.pdf",
        schema_type: parameters.schema_type || "PURCHASE_ORDER",
      });
      return NextResponse.json({ success: true, toolName, result: res });
    }

    if (toolName === "sarvam_vision_digitise") {
      const res = await processTradeDocument(
        parameters.document_base64 || "",
        parameters.fileName || "trade_document.pdf",
        parameters.schema_type || "PURCHASE_ORDER",
        apiKey
      );
      return NextResponse.json({ success: true, toolName, result: res });
    }

    // 2. Check Live Connector Tools
    if (toolName === "get_live_news") {
      const news = await fetchNassNewsBriefing(parameters.topic);
      return NextResponse.json({ success: true, toolName, result: news });
    }

    if (toolName === "get_live_maritime_ais") {
      const vessels = await getLiveMaritimeVessels();
      return NextResponse.json({ success: true, toolName, result: vessels });
    }

    if (toolName === "get_connector_health") {
      const health = await getConnectorHealthSummary();
      return NextResponse.json({ success: true, toolName, result: health });
    }

    // 3. Check Controlled NASS Application Tools
    const appToolResult = await executeNassTool(toolName, parameters);
    return NextResponse.json({ success: true, toolName, result: appToolResult });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Tool execution failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
