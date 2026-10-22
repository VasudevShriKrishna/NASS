import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getPythonBin(): string {
  if (process.env.PYTHON_EXECUTABLE) return process.env.PYTHON_EXECUTABLE;
  const sysWin = ["C:", "python", "python.exe"].join("\\");
  try {
    if (fs.existsSync(sysWin)) return sysWin;
  } catch {}
  return "python";
}

export interface ExcelProcessingResult {
  success: boolean;
  filename: string;
  sheets: Array<{
    name: string;
    max_row: number;
    max_column: number;
    headers: string[];
    rows: Record<string, any>[];
    formula_count: number;
    column_sums: Record<string, number>;
  }>;
  summary: {
    sheet_count: number;
    sheet_names: string[];
    total_rows: number;
    numeric_aggregations: Record<string, number>;
  };
  error?: string;
}

export interface WordProcessingResult {
  success: boolean;
  filename: string;
  paragraphCount: number;
  tableCount: number;
  sectionCount: number;
  sections: Array<{ title: string; paragraphs: string[] }>;
  tables: Array<{ rowCount: number; colCount: number; headers: string[]; rows: string[][] }>;
  allParagraphs: string[];
  error?: string;
}

export interface ReportGenerationResult {
  success: boolean;
  format: "xlsx" | "csv";
  outputPath: string;
  filename: string;
  rowCount: number;
  sizeBytes: number;
  generatedAt: string;
  error?: string;
}

/**
 * Parses an Excel (.xlsx / .xls) workbook natively via Python openpyxl.
 */
export async function parseExcelNative(filePath: string): Promise<ExcelProcessingResult> {
  const scriptPath = path.resolve(process.cwd(), "python_services", "excel_processor.py");
  try {
    const { stdout, stderr } = await execFileAsync(getPythonBin(), [scriptPath, path.resolve(filePath)], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr && !stdout) {
      return { success: false, filename: path.basename(filePath), sheets: [], summary: { sheet_count: 0, sheet_names: [], total_rows: 0, numeric_aggregations: {} }, error: stderr };
    }
    return JSON.parse(stdout) as ExcelProcessingResult;
  } catch (err: any) {
    return {
      success: false,
      filename: path.basename(filePath),
      sheets: [],
      summary: { sheet_count: 0, sheet_names: [], total_rows: 0, numeric_aggregations: {} },
      error: `Python Excel parsing exception: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Parses a Word (.docx) document natively via Python XML parser.
 */
export async function parseWordNative(filePath: string): Promise<WordProcessingResult> {
  const scriptPath = path.resolve(process.cwd(), "python_services", "word_processor.py");
  try {
    const { stdout, stderr } = await execFileAsync(getPythonBin(), [scriptPath, path.resolve(filePath)], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr && !stdout) {
      return { success: false, filename: path.basename(filePath), paragraphCount: 0, tableCount: 0, sectionCount: 0, sections: [], tables: [], allParagraphs: [], error: stderr };
    }
    return JSON.parse(stdout) as WordProcessingResult;
  } catch (err: any) {
    return {
      success: false,
      filename: path.basename(filePath),
      paragraphCount: 0,
      tableCount: 0,
      sectionCount: 0,
      sections: [],
      tables: [],
      allParagraphs: [],
      error: `Python Word parsing exception: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Generates an Excel XLSX or Safe CSV file via openpyxl.
 */
export async function generateNativeReport(options: {
  format: "xlsx" | "csv";
  title: string;
  headers: string[];
  data: Record<string, any>[] | any[][];
  outputFilename: string;
}): Promise<ReportGenerationResult> {
  const scriptPath = path.resolve(process.cwd(), "python_services", "report_generator.py");
  const tempDir = path.resolve(process.cwd(), "public", "download");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = path.join(tempDir, options.outputFilename);
  const payloadPath = path.join(tempDir, `req_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);

  try {
    fs.writeFileSync(
      payloadPath,
      JSON.stringify({
        format: options.format,
        title: options.title,
        headers: options.headers,
        data: options.data,
        outputPath,
      }),
      "utf8"
    );

    const { stdout, stderr } = await execFileAsync(getPythonBin(), [scriptPath, payloadPath], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    try {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
    } catch {}

    if (stderr && !stdout) {
      return { success: false, format: options.format, outputPath: "", filename: options.outputFilename, rowCount: 0, sizeBytes: 0, generatedAt: new Date().toISOString(), error: stderr };
    }

    return JSON.parse(stdout) as ReportGenerationResult;
  } catch (err: any) {
    try {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
    } catch {}
    return {
      success: false,
      format: options.format,
      outputPath: "",
      filename: options.outputFilename,
      rowCount: 0,
      sizeBytes: 0,
      generatedAt: new Date().toISOString(),
      error: `Python report generation exception: ${err?.message || String(err)}`,
    };
  }
}
