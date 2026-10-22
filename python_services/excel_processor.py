"""
NASS Group AI Copilot — Native Excel (.xlsx) Parser & Deterministic Calculator
Implements Section 4 & 10 of Sarvam-only AI Copilot Architecture.
Uses openpyxl for native workbook extraction: sheets, formulas, cached values, and totals.
"""

import os
import sys
import json
from decimal import Decimal
import openpyxl

def sanitize_cell_value(val):
    if val is None:
        return None
    if isinstance(val, (int, float, Decimal)):
        return float(val)
    # Check for potential formula injection when interpreting as text
    s = str(val).strip()
    return s

def process_excel(file_path: str, max_rows: int = 1500) -> dict:
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}", "success": False}

    try:
        wb = openpyxl.load_workbook(file_path, data_only=False)
        wb_cached = openpyxl.load_workbook(file_path, data_only=True)
    except Exception as e:
        return {"error": f"Failed to load workbook with openpyxl: {str(e)}", "success": False}

    result = {
        "success": True,
        "filename": os.path.basename(file_path),
        "sheets": [],
        "summary": {
            "sheet_count": len(wb.sheetnames),
            "sheet_names": wb.sheetnames,
            "total_rows": 0,
            "numeric_aggregations": {},
        }
    }

    numeric_totals = {}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        ws_cached = wb_cached[sheet_name] if sheet_name in wb_cached.sheetnames else None

        sheet_data = {
            "name": sheet_name,
            "max_row": ws.max_row,
            "max_column": ws.max_column,
            "headers": [],
            "rows": [],
            "formula_count": 0,
            "column_sums": {},
        }

        # Smart header detection: identify the row with table column titles
        header_row_idx = 1
        for r in range(1, min(ws.max_row or 0, 15) + 1):
            row_vals = [ws.cell(row=r, column=c).value for c in range(1, (ws.max_column or 0) + 1)]
            non_empty = [v for v in row_vals if v is not None and str(v).strip() != ""]
            if len(non_empty) >= 2:
                header_row_idx = r
                break

        headers = []
        for col_idx in range(1, (ws.max_column or 0) + 1):
            cell_val = ws.cell(row=header_row_idx, column=col_idx).value
            headers.append(str(cell_val).strip() if cell_val is not None and str(cell_val).strip() != "" else f"Column_{col_idx}")
        sheet_data["headers"] = headers

        # Extract data rows starting immediately after header row
        row_limit = min(ws.max_row or 0, max_rows)
        for r_idx in range(header_row_idx + 1, row_limit + 1):
            row_dict = {}
            row_has_data = False
            for c_idx, h in enumerate(headers, start=1):
                raw_cell = ws.cell(row=r_idx, column=c_idx)
                cached_cell = ws_cached.cell(row=r_idx, column=c_idx) if ws_cached else None

                val = raw_cell.value
                cached_val = cached_cell.value if cached_cell else val

                is_formula = isinstance(val, str) and val.startswith("=")
                if is_formula:
                    sheet_data["formula_count"] += 1

                actual_val = cached_val if is_formula else val
                sanitized = sanitize_cell_value(actual_val)
                row_dict[h] = sanitized
                if sanitized is not None and str(sanitized).strip() != "":
                    row_has_data = True

                # Deterministic numeric aggregation for numeric columns
                if isinstance(actual_val, (int, float)):
                    sheet_data["column_sums"][h] = sheet_data["column_sums"].get(h, 0.0) + float(actual_val)
                    numeric_totals[h] = numeric_totals.get(h, 0.0) + float(actual_val)
                    key = f"{sheet_name}::{h}"
                    numeric_totals[key] = numeric_totals.get(key, 0.0) + float(actual_val)

            if row_has_data:
                sheet_data["rows"].append(row_dict)

        result["summary"]["total_rows"] += len(sheet_data["rows"])
        result["sheets"].append(sheet_data)

    result["summary"]["numeric_aggregations"] = numeric_totals
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided", "success": False}))
        sys.exit(1)

    file_arg = sys.argv[1]
    res = process_excel(file_arg)
    print(json.dumps(res, indent=2))
