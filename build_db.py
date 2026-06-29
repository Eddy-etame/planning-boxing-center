"""
Boxing Center – planning database generator (v2, geometry-correct).

Reads the official ODS sources and produces src/data/plannings.js.

Why this rewrite exists
-----------------------
The previous parser (generate_plannings_db.py) expanded merged/covered cells
into a dense spatial grid and mis-counted columns. On the irregular Ramonville
sheet that inflated 12 real columns into ~17, which shifted every class onto the
wrong day and silently dropped the entire Saturday column. It then needed ~10
hardcoded `override_sessions` patches to paper over the damage.

This version models the sheet the way ODS actually encodes it:
  * the column cursor advances by `number-columns-repeated` (NOT by colspan);
  * a spanned cell sits at its start column and is followed by covered cells
    that fill the span — covered cells are skipped but still advance the cursor;
  * day columns come from the header row's day-name cells + their colspans;
  * a class is attributed to a coach by its CELL BACKGROUND COLOR (per the
    client's rule: "color = coach"), with the day-column coach as a fallback.

The result reproduces each official PDF exactly, with no manual overrides.
"""

import glob
import hashlib
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

# Make stdout UTF-8 safe on Windows consoles (cp1252 cannot encode é, →, …).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCES_DIR = os.environ.get("PLANNINGS_SOURCE_DIR", os.path.join(SCRIPT_DIR, "sources"))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "src", "data", "plannings.js")

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
    "fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}
TBL = NS["table"]

DAY_NAMES = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")

# ---------------------------------------------------------------------------
# Source → sheet → gym-id mapping. Only these sheets are imported.
# (Portet Feuille2/Feuille3 are intentionally omitted: they are empty.)
# ---------------------------------------------------------------------------
GYM_MAPPING = {
    "St Cyprien projet planning Coachs rentrée 2026.ods": {"Feuille1": "saint-cyprien"},
    "Barrière de Paris projet Coachs planning rentrée 2026 V1.ods": {"Feuille1": "minimes"},
    "Ramonville projet planning Coachs rentrée 2026.ods": {"Feuille1": "ramonville"},
    "Copie de Portet projet planning Coachs rentrée 2026 2.ods": {
        "Feuille1": "portet-combat",
        "Feuille1_2": "portet-mma",
    },
    "ETATS UNIS projet planning Coachs rentrée 2026.ods": {
        "SALLE BOXE": "etats-unis-boxe",
        "SALLE MMA SOL": "etats-unis-mma",
        "SALLE BOXING FITNESS": "etats-unis-fitness",
    },
}

# Per-venue background-color → coach. Verified against each sheet's coach row.
# Shade variants of the same colour map to the same coach on purpose.
COACH_COLORS_MAP = {
    "saint-cyprien": {
        "#55308d": "HICHAM", "#5b277d": "HICHAM",
        "#b22222": "DADI", "#c9211e": "DADI",
        "#729fcf": "DADI/ TAWEE", "#5983b0": "DADI/ TAWEE",
        "#ffb66c": "TAWEE", "#b2b2b2": "VICTOR G",
        "#ffff00": "Non Assigné", "#ffff38": "Non Assigné",
    },
    "minimes": {
        "#b22222": "MEHDI B", "#c9211e": "MEHDI B",
        "#5983b0": "REMUS", "#729fcf": "REMUS",
        "#ffb66c": "DAVID", "#55308d": "HICHAM", "#5b277d": "HICHAM",
        "#b2b2b2": "CHLOE", "#ffff00": "FAEZ", "#ffff38": "FAEZ",
    },
    "ramonville": {
        "#b2b2b2": "VALENTIN G", "#ffb66c": "JEROME",
        "#c9211e": "SONIA", "#b22222": "SONIA",
        "#3faf46": "FAROUK", "#77bc65": "FAROUK", "#00a933": "FAROUK",
        "#5983b0": "PASCAL", "#729fcf": "PASCAL",
    },
    "portet-combat": {
        "#c5000b": "PABLO", "#7e350e": "MARAMA", "#83cceb": "VAL", "#94dcf8": "VAL",
        "#e97132": "SAMUEL", "#ed7d31": "SAMUEL",
        "#747474": "MARAMA/ VAL", "#808080": "MARAMA/ VAL",
    },
    "portet-mma": {
        "#156082": "ENZO", "#4ea72e": "CALLUM",
        "#e97132": "SAMUEL", "#ed7d31": "SAMUEL",
        "#7030a0": "INGRID", "#275317": "INGRID + SAMUEL", "#94dcf8": "INGRID + SAMUEL",
    },
    "etats-unis-boxe": {
        "#ffb66c": "DAVID", "#c9211e": "VALENTIN GUTH", "#b22222": "VALENTIN GUTH",
        "#77bc65": "RENAUD",
    },
    "etats-unis-mma": {
        "#729fcf": "ZOUIR", "#5983b0": "ZOUIR", "#77bc65": "RENAUD",
    },
    "etats-unis-fitness": {
        "#ffb66c": "DAVID", "#c9211e": "VALENTIN GUTH", "#b22222": "VALENTIN GUTH",
        "#b2b2b2": "CHLOE", "#8d1d75": "YANNIS CHOUET", "#77bc65": "CLEMENT",
    },
}

ACTIVITY_ALIASES = {
    "L": "LADY PUNCH", "LADY": "LADY PUNCH", "F": "FIT BOXE",
    "PREPATION PHYSIQUE": "PREPARATION PHYSIQUE",
    "CROSS TRAINING": "CROSS-TRAINING",
    "XACCES LIBRE": "ACCES LIBRE", "ACCÈS LIBRE": "ACCES LIBRE",
}
SKIP_ACTIVITY = {"", "---", "X", "XX", "O", "??", "S", "D", "DD", "K", "SSS", "E", "L", "¨¨", "¨"}
# Fallback coach for venues effectively run by a single coach, used only when a
# cell has no colour match and no column coach (e.g. uncoloured kids' classes).
DEFAULT_COACH = {
    "etats-unis-mma": "ZOUIR",
}

COACH_HINTS = (
    "PABLO", "MARAMA", "VAL", "SAMUEL", "ENZO", "CALLUM", "INGRID", "RENAUD",
    "DAVID", "VALENTIN", "ZOUIR", "CLEMENT", "YANNIS", "MEHDI", "REMUS",
    "HICHAM", "CHLOE", "FAEZ", "SONIA", "FAROUK", "JEROME", "PASCAL", "WALID",
    "FAYEZ", "DADI", "TAWEE", "VICTOR",
)
MAX_REPEAT = 50  # guard against ODS trailing padding (huge repeat counts)


# ---------------------------------------------------------------------------
# Low-level ODS helpers
# ---------------------------------------------------------------------------
def load_style_colors(root):
    colors = {}
    for style in root.findall(".//style:style", NS):
        name = style.get(f"{{{NS['style']}}}name")
        props = style.find("style:table-cell-properties", NS)
        if props is not None:
            bg = props.get(f"{{{NS['fo']}}}background-color")
            if bg and bg != "transparent":
                colors[name] = bg.lower()
    return colors


def cell_text(cell):
    parts = []
    for p in cell.findall(".//text:p", NS):
        t = "".join(p.itertext())
        if t:
            parts.append(t)
    return "\n".join(parts).strip()


def iter_table_rows(table):
    for child in table:
        tag = child.tag.split("}")[-1]
        if tag == "table-row":
            yield child
        elif tag == "table-row-group":
            for row in child.findall("table:table-row", NS):
                yield row


def build_grid(table, style_colors):
    """Physical-column grid.

    Returns a list of rows; each row is a dict {start_col: cell}, where `cell`
    is an origin (non-covered) cell carrying its text, colour, colspan (`cs`),
    rowspan (`rs`) and start column. Covered cells are skipped but still advance
    the column cursor, so start columns line up with the header geometry.
    """
    grid = []
    for row_el in iter_table_rows(table):
        row_rep = int(row_el.get(f"{{{TBL}}}number-rows-repeated") or 1)
        if row_rep > MAX_REPEAT:
            row_rep = 1  # trailing blank padding – keep one
        row = {}
        col = 0
        for cell in row_el.findall("./*", NS):
            tag = cell.tag.split("}")[-1]
            if tag not in ("table-cell", "covered-table-cell"):
                continue
            crep = int(cell.get(f"{{{TBL}}}number-columns-repeated") or 1)
            if crep > MAX_REPEAT:
                break  # rest of the row is trailing padding
            cs = int(cell.get(f"{{{TBL}}}number-columns-spanned") or 1)
            rs = int(cell.get(f"{{{TBL}}}number-rows-spanned") or 1)
            covered = tag == "covered-table-cell"
            style = cell.get(f"{{{TBL}}}style-name")
            color = style_colors.get(style, "#ffffff")
            text = cell_text(cell)
            for _ in range(crep):
                if not covered:
                    row[col] = {"text": text, "color": color, "cs": cs, "rs": rs, "start": col}
                col += 1
        for _ in range(row_rep):
            grid.append(dict(row))
    # drop trailing fully-empty rows
    while grid and not any(c["text"] or c["color"] != "#ffffff" for c in grid[-1].values()):
        grid.pop()
    return grid


# ---------------------------------------------------------------------------
# Structure detection
# ---------------------------------------------------------------------------
def find_days_row(grid):
    for r, row in enumerate(grid):
        hits = sum(
            1 for c in row
            if any(d in row[c]["text"].strip().lower() for d in DAY_NAMES[:6])
        )
        if hits >= 3:
            return r
    return -1


def get_day_ranges(grid, days_row):
    """[(start_col, end_col, day)] from the header row's day cells."""
    ranges = []
    for c in sorted(grid[days_row]):
        cell = grid[days_row][c]
        t = cell["text"].strip().lower()
        for day in DAY_NAMES:
            if day in t:
                ranges.append((c, c + cell["cs"], day))
                break
    return ranges


def find_coach_row(grid, days_row):
    activity_words = ("BOXE", "ANGLAISE", "GRAPPLING", "MMA", "KICK", "HYROX",
                      "CROSS", "SPARRING", "BOXING", "JJB", "MUAY", "LADY PUNCH",
                      "ACCES", "BABY", "PREPA", "EDUCATIVE", "PIEDS")
    for r in range(len(grid) - 1, days_row, -1):
        texts = [grid[r][c]["text"] for c in grid[r] if grid[r][c]["text"]]
        if not texts:
            continue
        if any(len(t) > 35 for t in texts):
            continue
        if sum(1 for t in texts if any(w in t.upper() for w in activity_words)) >= 2:
            continue
        if any(any(h in t.upper() for h in COACH_HINTS) for t in texts):
            return r
    return -1


def normalize_time(text):
    t = text.strip().replace("\n", " ")
    t = re.sub(r"\s+", " ", t)
    if not t or any(d in t.lower() for d in DAY_NAMES):
        return None
    t = t.replace("/", "-").replace(" ", "").lower()
    t = re.sub(r"(\d+)h-", r"\1h-", t)
    return t or None


def time_for_row(grid, r, time_col=0):
    """Time string for row r, walking up through a rowspanned time cell."""
    cell = grid[r].get(time_col)
    if cell and cell["text"]:
        return normalize_time(cell["text"])
    for up in range(r - 1, -1, -1):
        cell = grid[up].get(time_col)
        if cell and cell["text"]:
            if up + cell["rs"] > r:
                return normalize_time(cell["text"])
            return None
    return None


def merged_time_slot(grid, r, rs, time_col=0):
    start = time_for_row(grid, r, time_col)
    if not start or rs <= 1:
        return start
    end = time_for_row(grid, r + rs - 1, time_col)
    if not end:
        return start
    s_parts, e_parts = start.split("-"), end.split("-")
    s = s_parts[0]
    e = e_parts[1] if len(e_parts) == 2 else end
    return start if s == e else f"{s}-{e}"


# ---------------------------------------------------------------------------
# Sub-columns: how many simultaneous classes a day can hold.
# ---------------------------------------------------------------------------
def build_slots(grid, day_ranges, days_row, coach_row):
    end = coach_row if coach_row > days_row else len(grid)
    starts = {day: set() for (_, _, day) in day_ranges}
    for r in range(days_row + 1, end):
        for c, cell in grid[r].items():
            if not cell["text"]:
                continue
            for (s, e, day) in day_ranges:
                if s <= c < e:
                    starts[day].add(c)
                    break
    slots = {}
    for (s, e, day) in day_ranges:
        slots[day] = sorted(starts[day]) or [s]
    return slots


def locate(c, cs, ranges, slots):
    """Map a physical column span to (day, subColumn, colSpan)."""
    day = None
    for (s, e, d) in ranges:
        if s <= c < e:
            day = d
            day_start, day_end = s, e
            break
    if day is None:  # fall back to nearest range starting at/before c
        best = None
        for (s, e, d) in ranges:
            if s <= c and (best is None or s > best[0]):
                best = (s, e, d)
        if best is None:
            return None
        day_start, day_end, day = best
    day_slots = slots[day]
    sub = 0
    for i, st in enumerate(day_slots):
        if st <= c:
            sub = i
    span_end = c + cs
    colspan = sum(1 for st in day_slots if c <= st < span_end) or 1
    return day, sub, colspan


# ---------------------------------------------------------------------------
# Value cleaning
# ---------------------------------------------------------------------------
def clean_activity(text):
    text = re.sub(r"\s+", " ", text).strip()
    if not text or text in ("¨¨", "¨") or re.fullmatch(r"[^\w\s/\-()]+", text):
        return None
    upper = text.upper()
    if upper in ACTIVITY_ALIASES:
        return ACTIVITY_ALIASES[upper]
    if upper in SKIP_ACTIVITY:
        return None
    if upper.startswith("X") and "ACCES" in upper:
        return "ACCES LIBRE"
    if len(upper) <= 2:
        return None
    if re.match(r"^\d{1,2}H", upper.replace(" ", "")):
        return None
    return upper


def clean_coach(name):
    if not name:
        return "Non Assigné"
    name = name.split("(")[0].strip().upper()
    if name in ("", "---", "?", "NON ASSIGNÉ", "NON ASSIGNE"):
        return "Non Assigné"
    return name


def resolve_coach(gym_id, color, day, ranges, coach_by_col):
    table = COACH_COLORS_MAP.get(gym_id, {})
    if color in table:
        return table[color]
    if day in coach_by_col:
        return coach_by_col[day]
    return DEFAULT_COACH.get(gym_id, "Non Assigné")


def build_coach_by_col(grid, coach_row, ranges):
    """Day → coach from the bottom coach-name row (fallback only)."""
    out = {}
    if coach_row < 0:
        return out
    for c, cell in grid[coach_row].items():
        if not cell["text"]:
            continue
        for (s, e, day) in ranges:
            if s <= c < e:
                out[day] = cell["text"].strip()
                break
    return out


# ---------------------------------------------------------------------------
# Per-sheet parse
# ---------------------------------------------------------------------------
def parse_sheet(table, gym_id, style_colors):
    grid = build_grid(table, style_colors)
    days_row = find_days_row(grid)
    if days_row < 0:
        return [], {}
    ranges = get_day_ranges(grid, days_row)
    if not ranges:
        return [], {}
    coach_row = find_coach_row(grid, days_row)
    slots = build_slots(grid, ranges, days_row, coach_row)
    coach_by_col = build_coach_by_col(grid, coach_row, ranges)

    sessions = []
    end = coach_row if coach_row > days_row else len(grid)
    for r in range(days_row + 1, end):
        for c in sorted(grid[r]):
            cell = grid[r][c]
            activity = clean_activity(cell["text"])
            if not activity:
                continue
            placed = locate(c, cell["cs"], ranges, slots)
            if not placed:
                continue
            day, sub, colspan = placed
            slot = merged_time_slot(grid, r, cell["rs"]) or time_for_row(grid, r)
            if not slot:
                continue
            coach = clean_coach(resolve_coach(gym_id, cell["color"], day, ranges, coach_by_col))
            if "ACCES" in activity and "LIBRE" in activity:
                activity, coach = "ACCES LIBRE", "ACCES LIBRE"
            sessions.append({
                "salle": gym_id, "period": "rentree-2026", "day": day,
                "subColumn": sub, "timeSlot": slot,
                "activity": activity.replace("\n", " ").strip(), "coach": coach,
                "rowSpan": cell["rs"], "colSpan": colspan,
            })

    # Sub-column count per day, dropping header-only days that carry no class
    # (e.g. an empty "dimanche" column present in the sheet header).
    used_days = {s["day"] for s in sessions}
    sub_config = {day: len(slots[day]) for day in slots if day in used_days}
    return sessions, sub_config


def parse_ods(path, filename):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("content.xml"))
    style_colors = load_style_colors(root)
    mapping = GYM_MAPPING.get(filename, {})
    sessions, configs = [], {}
    for table in root.findall(".//table:table", NS):
        name = table.get(f"{{{TBL}}}name")
        if name not in mapping:
            continue
        gym_id = mapping[name]
        s, cfg = parse_sheet(table, gym_id, style_colors)
        sessions.extend(s)
        configs[gym_id] = {"subColumns": cfg}
    return sessions, configs


def resolve_source(expected):
    exact = os.path.join(SOURCES_DIR, expected)
    if os.path.exists(exact):
        return exact
    needle = expected[:20].lower()
    for f in glob.glob(os.path.join(SOURCES_DIR, "*.ods")):
        if needle in os.path.basename(f).lower():
            return f
    return None


# Summer term (20/07 → 02/08) – from the coordinator's handwritten note.
SUMMER_SESSIONS = [
    {"id": "sum-1", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "10h-11h", "activity": "COURS ETE", "coach": "MEHDI B"},
    {"id": "sum-2", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "12h30-13h30", "activity": "COURS ETE", "coach": "DADI"},
    {"id": "sum-3", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "20h-21h", "activity": "COURS ETE", "coach": "WALID"},
    {"id": "sum-4", "salle": "ramonville", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "12h30-13h30", "activity": "COURS ETE", "coach": "RENAUD"},
    {"id": "sum-5", "salle": "ramonville", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "20h-21h", "activity": "COURS ETE", "coach": "FAYEZ"},
]

GYMS = [
    {"id": "saint-cyprien", "name": "Saint-Cyprien"},
    {"id": "minimes", "name": "Barrière de Paris – Minimes"},
    {"id": "ramonville", "name": "Ramonville"},
    {"id": "etats-unis-boxe", "name": "États-Unis — Salle Boxe"},
    {"id": "etats-unis-mma", "name": "États-Unis — Salle MMA"},
    {"id": "etats-unis-fitness", "name": "États-Unis — Boxing Fitness"},
    {"id": "portet-combat", "name": "Portet-sur-Garonne (Combat)"},
    {"id": "portet-mma", "name": "Portet-sur-Garonne (MMA)"},
]


def build():
    all_sessions, all_configs = [], {}
    for expected, _ in GYM_MAPPING.items():
        path = resolve_source(expected)
        if not path:
            print(f"  MISSING: {expected}")
            continue
        sessions, configs = parse_ods(path, expected)
        all_sessions.extend(sessions)
        all_configs.update(configs)
        per = {}
        for s in sessions:
            per[s["salle"]] = per.get(s["salle"], 0) + 1
        for gym, n in per.items():
            print(f"  {gym}: {n} sessions")
    for idx, s in enumerate(all_sessions):
        s["id"] = f"rentree-{idx + 1}"
    return all_sessions, all_configs


def write_js(sessions, configs):
    def emit(s):
        extra = ""
        if s.get("rowSpan", 1) > 1:
            extra += f",\n    rowSpan: {s['rowSpan']}"
        if s.get("colSpan", 1) > 1:
            extra += f",\n    colSpan: {s['colSpan']}"
        if s.get("subColumn", 0) > 0:
            extra += f",\n    subColumn: {s['subColumn']}"
        return (
            f"  {{\n    id: \"{s['id']}\",\n    salle: \"{s['salle']}\",\n"
            f"    period: \"{s['period']}\",\n    day: \"{s['day']}\",\n"
            f"    timeSlot: \"{s['timeSlot']}\",\n    activity: \"{s['activity']}\",\n"
            f"    coach: \"{s['coach']}\"{extra}\n  }},\n"
        )

    template_path = os.path.join(SCRIPT_DIR, "data_tables.json")
    with open(template_path, "r", encoding="utf-8") as f:
        tables = json.load(f)

    # Content-hash version: changes whenever the data changes, so the client's
    # localStorage cache (see planningStorage.js) auto-invalidates and re-seeds.
    payload = json.dumps(
        {"sessions": sessions, "summer": SUMMER_SESSIONS, "configs": configs},
        ensure_ascii=False, sort_keys=True,
    )
    version = "src-" + hashlib.md5(payload.encode("utf-8")).hexdigest()[:12]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("// AUTO-GENERATED by build_db.py — do not edit by hand.\n")
        f.write("// Source of truth: the official ODS files in ./sources/.\n\n")
        f.write(f"export const DATA_VERSION = {json.dumps(version)};\n\n")
        f.write("export const initialPlannings = [\n")
        for s in sessions:
            f.write(emit(s))
        for s in SUMMER_SESSIONS:
            f.write(emit(s))
        f.write("];\n\n")
        f.write(f"export const gymGridConfig = {json.dumps(configs, ensure_ascii=False, indent=2)};\n\n")
        f.write(f"export const coachColors = {json.dumps(tables['coachColors'], ensure_ascii=False, indent=2)};\n\n")
        f.write(f"export const activityColors = {json.dumps(tables['activityColors'], ensure_ascii=False, indent=2)};\n\n")
        f.write(f"export const gyms = {json.dumps(GYMS, ensure_ascii=False, indent=2)};\n")


if __name__ == "__main__":
    print("Building plannings.js from ODS sources…")
    sessions, configs = build()
    write_js(sessions, configs)
    print(f"Done → {OUTPUT_FILE}  ({len(sessions)} rentrée + {len(SUMMER_SESSIONS)} été)")
