#!/usr/bin/env python3
import csv
import re
import sys
import zipfile
import xml.etree.ElementTree as ET


NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_to_index(col: str) -> int:
    result = 0
    for ch in col:
        if "A" <= ch <= "Z":
            result = result * 26 + (ord(ch) - ord("A") + 1)
    return result - 1


def parse_shared_strings(xml_bytes: bytes):
    root = ET.fromstring(xml_bytes)
    result = []
    for si in root.findall("x:si", NS):
        text = "".join(si.itertext())
        result.append(text)
    return result


def parse_sheet_rows(xml_bytes: bytes, shared_strings):
    root = ET.fromstring(xml_bytes)
    rows = []
    for row_el in root.findall(".//x:sheetData/x:row", NS):
        values = {}
        max_col = 0
        for c in row_el.findall("x:c", NS):
            ref = c.attrib.get("r", "")
            m = re.match(r"([A-Z]+)\d+", ref)
            if not m:
                continue
            idx = col_to_index(m.group(1))
            max_col = max(max_col, idx)
            t = c.attrib.get("t")
            v_el = c.find("x:v", NS)
            if v_el is None or v_el.text is None:
                val = ""
            else:
                raw = v_el.text
                if t == "s":
                    sval_idx = int(raw)
                    val = shared_strings[sval_idx] if 0 <= sval_idx < len(shared_strings) else ""
                else:
                    val = raw
            values[idx] = val
        row = [values.get(i, "") for i in range(max_col + 1)]
        rows.append(row)
    return rows


def main():
    if len(sys.argv) < 3:
        print("Usage: price_xlsx_to_csv.py <input.xlsx> <output.csv>")
        sys.exit(1)

    input_xlsx = sys.argv[1]
    output_csv = sys.argv[2]

    with zipfile.ZipFile(input_xlsx, "r") as zf:
        shared_xml = zf.read("xl/sharedStrings.xml")
        sheet_xml = zf.read("xl/worksheets/sheet1.xml")

    shared_strings = parse_shared_strings(shared_xml)
    rows = parse_sheet_rows(sheet_xml, shared_strings)

    with open(output_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerows(rows)

    print(f"Converted rows: {len(rows)} -> {output_csv}")


if __name__ == "__main__":
    main()
