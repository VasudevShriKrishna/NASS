"""
NASS Group AI Copilot — Native Word (.docx) Parser
Implements Section 4 & Word Document Architecture.
Extracts headings, paragraphs, bullet points, tables, and document metadata directly from Word XML.
"""

import os
import sys
import json
import zipfile
import xml.etree.ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

def process_word(file_path: str) -> dict:
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}", "success": False}

    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            if 'word/document.xml' not in zf.namelist():
                return {"error": "Invalid DOCX format: word/document.xml not found", "success": False}

            xml_content = zf.read('word/document.xml')
            tree = ET.fromstring(xml_content)
    except Exception as e:
        return {"error": f"Failed to unzip or parse Word XML: {str(e)}", "success": False}

    paragraphs = []
    tables = []
    sections = []
    current_section = {"title": "Document Introduction", "paragraphs": []}

    body = tree.find('w:body', NS)
    if body is None:
        return {"success": True, "paragraphs": [], "tables": [], "summary": "Empty document"}

    for elem in body:
        tag = elem.tag.split('}')[-1]

        if tag == 'p':
            # Extract paragraph text
            texts = [node.text for node in elem.findall('.//w:t', NS) if node.text]
            full_text = "".join(texts).strip()

            if not full_text:
                continue

            # Check if this paragraph is a heading or title
            style = elem.find('.//w:pStyle', NS)
            is_heading = False
            style_val = ""
            if style is not None:
                style_val = style.attrib.get(f'{{{NS["w"]}}}val', '')
                if 'Heading' in style_val or 'Title' in style_val:
                    is_heading = True

            p_entry = {
                "text": full_text,
                "isHeading": is_heading,
                "style": style_val,
            }
            paragraphs.append(p_entry)

            if is_heading:
                if current_section["paragraphs"]:
                    sections.append(current_section)
                current_section = {"title": full_text, "paragraphs": []}
            else:
                current_section["paragraphs"].append(full_text)

        elif tag == 'tbl':
            # Extract table rows and cells
            table_rows = []
            for row in elem.findall('.//w:tr', NS):
                row_cells = []
                for cell in row.findall('.//w:tc', NS):
                    cell_texts = [node.text for node in cell.findall('.//w:t', NS) if node.text]
                    cell_str = " ".join(cell_texts).strip()
                    row_cells.append(cell_str)
                if any(row_cells):
                    table_rows.append(row_cells)

            if table_rows:
                tables.append({
                    "rowCount": len(table_rows),
                    "colCount": len(table_rows[0]) if table_rows else 0,
                    "headers": table_rows[0] if len(table_rows) > 1 else [],
                    "rows": table_rows[1:] if len(table_rows) > 1 else table_rows,
                })

    if current_section["paragraphs"] or current_section["title"] != "Document Introduction":
        sections.append(current_section)

    return {
        "success": True,
        "filename": os.path.basename(file_path),
        "paragraphCount": len(paragraphs),
        "tableCount": len(tables),
        "sectionCount": len(sections),
        "sections": sections,
        "tables": tables,
        "allParagraphs": [p["text"] for p in paragraphs],
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided", "success": False}))
        sys.exit(1)

    file_arg = sys.argv[1]
    res = process_word(file_arg)
    print(json.dumps(res, indent=2))
