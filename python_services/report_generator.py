"""
NASS Group AI Copilot — Native Report Generator (Excel XLSX & Safe CSV)
Implements Section 12 of Sarvam-only AI Architecture.
Generates styled Excel workbooks with openpyxl and formula-injection-safe CSV exports.
"""

import os
import sys
import csv
import json
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Formula injection trigger characters
DANGEROUS_PREFIXES = ('=', '+', '-', '@', '\t', '\r')

def sanitize_csv_cell(val):
    if val is None:
        return ""
    s = str(val)
    if s.startswith(DANGEROUS_PREFIXES):
        return "'" + s  # Escape formula triggers
    return s

def generate_csv(data: list, headers: list, output_path: str) -> dict:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)
        for row in data:
            if isinstance(row, dict):
                writer.writerow([sanitize_csv_cell(row.get(h, "")) for h in headers])
            elif isinstance(row, (list, tuple)):
                writer.writerow([sanitize_csv_cell(cell) for cell in row])

    size = os.path.getsize(output_path)
    return {
        "success": True,
        "format": "csv",
        "outputPath": output_path,
        "filename": os.path.basename(output_path),
        "rowCount": len(data),
        "sizeBytes": size,
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

def generate_excel(data: list, headers: list, title: str, output_path: str) -> dict:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel tab name limit 31 chars

    # NASS Palette Styles
    gold_fill = PatternFill(start_color="D4AF37", end_color="D4AF37", fill_type="solid")
    dark_fill = PatternFill(start_color="14110A", end_color="14110A", fill_type="solid")
    alt_fill = PatternFill(start_color="F9F7F1", end_color="F9F7F1", fill_type="solid")
    
    header_font = Font(name="Arial", size=11, bold=True, color="000000")
    data_font = Font(name="Arial", size=10, color="14110A")
    title_font = Font(name="Arial", size=14, bold=True, color="D4AF37")
    subtitle_font = Font(name="Arial", size=9, italic=True, color="6B6252")

    thin_border = Border(
        left=Side(style='thin', color='E6DDC8'),
        right=Side(style='thin', color='E6DDC8'),
        top=Side(style='thin', color='E6DDC8'),
        bottom=Side(style='thin', color='E6DDC8')
    )

    # 1. Title Block
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    title_cell = ws.cell(row=1, column=1, value=f"NASS GROUP · {title.upper()}")
    title_cell.font = title_font
    title_cell.fill = dark_fill
    title_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 36

    # 2. Metadata Subtitle
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
    gen_time_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC (Bahrain AST +3)")
    sub_cell = ws.cell(row=2, column=1, value=f"Authoritative Operational Export · Generated: {gen_time_str} · Verified Outcomes Only")
    sub_cell.font = subtitle_font
    sub_cell.fill = dark_fill
    sub_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 20

    # 3. Table Column Headers
    header_row_idx = 4
    ws.row_dimensions[header_row_idx].height = 26
    for col_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=header_row_idx, column=col_idx, value=h)
        c.font = header_font
        c.fill = gold_fill
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = thin_border

    # 4. Data Rows
    current_row = 5
    for r_idx, row in enumerate(data):
        ws.row_dimensions[current_row].height = 20
        is_even = (r_idx % 2 == 0)
        row_fill = alt_fill if is_even else None

        for col_idx, h in enumerate(headers, start=1):
            val = row.get(h) if isinstance(row, dict) else (row[col_idx - 1] if col_idx - 1 < len(row) else "")
            c = ws.cell(row=current_row, column=col_idx, value=val)
            c.font = data_font
            c.border = thin_border
            if row_fill:
                c.fill = row_fill

            # Format numbers and alignments
            if isinstance(val, (int, float)):
                c.alignment = Alignment(horizontal="right", vertical="center")
                if "pct" in h.lower() or "%" in h:
                    c.number_format = "0.0%"
                elif "price" in h.lower() or "cost" in h.lower() or "value" in h.lower():
                    c.number_format = "#,##0.00"
                else:
                    c.number_format = "#,##0"
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

        current_row += 1

    # Auto-adjust column widths
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            if cell.row < 4:
                continue
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(output_path)
    size = os.path.getsize(output_path)

    return {
        "success": True,
        "format": "xlsx",
        "outputPath": output_path,
        "filename": os.path.basename(output_path),
        "rowCount": len(data),
        "sizeBytes": size,
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    # Test execution or CLI invocation
    if len(sys.argv) > 1:
        req_file = sys.argv[1]
        if os.path.exists(req_file):
            with open(req_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            fmt = payload.get("format", "xlsx")
            data = payload.get("data", [])
            headers = payload.get("headers", [])
            title = payload.get("title", "Export Report")
            out = payload.get("outputPath", "public/download/export." + fmt)

            if fmt == "csv":
                res = generate_csv(data, headers, out)
            else:
                res = generate_excel(data, headers, title, out)
            print(json.dumps(res))
