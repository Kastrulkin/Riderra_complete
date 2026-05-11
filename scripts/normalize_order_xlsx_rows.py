#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime
from pathlib import Path

import openpyxl


VEHICLE_BY_CODE = {
    "PT": "Standard class car",
    "MV": "Standard minivan 6 pax",
    "MPV": "Standard MPV",
    "MBE": "Business class car",
    "SUV": "SUV",
    "BUS": "Coach",
    "SPRINTER": "Sprinter",
    "ELECTRIC": "Standard e-vehicle 3 pax",
}


def clean(value):
    return "" if value is None else str(value).strip()


def money(value):
    if value is None or clean(value) == "":
        return None
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value))
    if not match:
        return None
    return round(float(match.group(0).replace(",", ".")), 2)


def parse_order_meta(order_number):
    raw = clean(order_number)
    match = re.search(r"\(([^)]+)\)", raw)
    if not match:
        return {
            "booking_id": raw,
            "city_code": "",
            "vehicle_code": "",
            "direction": "",
            "vehicle_type": "standard",
        }
    parts = [part for part in match.group(1).strip().split() if part]
    direction = parts[-1] if parts else ""
    vehicle_code = parts[-2] if len(parts) >= 2 else ""
    city_code = " ".join(parts[:-2]) if len(parts) >= 2 else " ".join(parts)
    return {
        "booking_id": raw.split("(", 1)[0].strip(),
        "city_code": city_code,
        "vehicle_code": vehicle_code,
        "direction": direction,
        "vehicle_type": VEHICLE_BY_CODE.get(vehicle_code.upper(), vehicle_code or "standard"),
    }


def normalize_status(price, driver, comment):
    text = f"{driver or ''} {comment or ''}".lower()
    cancelled = any(token in text for token in ["отмена", "отмен", "declined", "cancel"])
    paid_or_done = "будет оплачен" in text or "ездил" in text
    if cancelled and not paid_or_done and (price is None or price <= 0):
        return "cancelled"
    if price is not None and price != 0:
        return "completed"
    return "pending"


def has_complaint(driver, comment):
    return bool(re.search(
        r"жалоб|претензи|complaint|no[\s-]?show|did not show|опозд|late|не встрет|не приех|косяк",
        f"{driver or ''} {comment or ''}",
        re.I,
    ))


def issue_flags(row):
    flags = []
    text = f"{row['driver']} {row['comment']}".lower()
    if row["status"] == "cancelled":
        flags.append("cancelled")
    if row["has_complaint"]:
        flags.append("complaint")
    if row["client_price"] is None:
        flags.append("missing_price")
    elif row["client_price"] <= 0 and row["status"] != "cancelled":
        flags.append("non_positive_price")
    if not row["driver"]:
        flags.append("missing_driver")
    if "штраф" in text or "penalty" in text:
        flags.append("penalty")
    return flags


def to_iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return clean(value)


def normalize_compact(args):
    workbook = openpyxl.load_workbook(args.input, data_only=True, read_only=True)
    if args.sheet not in workbook.sheetnames:
        raise ValueError(f"Sheet {args.sheet!r} not found. Available sheets: {', '.join(workbook.sheetnames)}")
    worksheet = workbook[args.sheet]
    rows = []
    last_order_number = ""
    for source_row, cells in enumerate(worksheet.iter_rows(values_only=True), 1):
        values = list(cells) + [None] * 12
        date_index = next(
            (index for index, value in enumerate(values[:8]) if isinstance(value, datetime)),
            None,
        )
        if date_index is None or date_index == 0:
            continue
        pickup_at = values[date_index]
        order_number = clean(values[date_index - 1]) or last_order_number
        if clean(values[date_index - 1]):
            last_order_number = clean(values[date_index - 1])
        price = money(values[date_index + 1])
        driver = clean(values[date_index + 2])
        internal_order_number = clean(values[date_index + 3])
        comment = "\n".join(clean(value) for value in values[date_index + 4:date_index + 9] if clean(value))
        meta = parse_order_meta(order_number)
        row = {
            "sheet_source_id": args.spreadsheet_id,
            "source_name": args.source_name,
            "source_tab": worksheet.title,
            "source_row": source_row,
            "month_label": args.month_label,
            "row_marker": "",
            "counterparty": "",
            "order_number": order_number,
            "booking_id": meta["booking_id"],
            "pickup_at": to_iso(pickup_at),
            "from_point": "UNKNOWN",
            "to_point": "UNKNOWN",
            "client_price": price,
            "currency": args.currency,
            "driver": driver,
            "comment": comment,
            "internal_order_number": internal_order_number,
            "city_code": meta["city_code"],
            "vehicle_code": meta["vehicle_code"],
            "direction": meta["direction"],
            "vehicle_type": meta["vehicle_type"],
        }
        row["status"] = normalize_status(price, driver, comment)
        row["has_complaint"] = has_complaint(driver, comment)
        row["issue_flags"] = issue_flags(row)
        stable_id = internal_order_number or row["booking_id"] or row["order_number"] or "row"
        row["external_key"] = f"google_sheet:{args.spreadsheet_id}:{worksheet.title}:{source_row}:{stable_id}"
        row["raw_payload"] = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
        rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--spreadsheet-id", required=True)
    parser.add_argument("--month-label", required=True)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--sheet", default="Лист1")
    parser.add_argument("--currency", default="EUR")
    args = parser.parse_args()
    rows = normalize_compact(args)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": args.output, "rows": len(rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
