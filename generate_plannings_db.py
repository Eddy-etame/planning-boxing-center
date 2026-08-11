import zipfile
import xml.etree.ElementTree as ET
import os
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLANNINGS_DIR = os.environ.get(
    "PLANNINGS_SOURCE_DIR",
    os.path.join(SCRIPT_DIR, "sources"),
)
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "src", "data", "plannings.js")

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
    "fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}

# Map ODS filename fragments -> sheet -> gym id
GYM_MAPPING = {
    "St Cyprien projet planning Coachs rentrée 2026.ods": {
        "Feuille1": "saint-cyprien",
    },
    "Barrière de Paris projet Coachs planning rentrée 2026 V1.ods": {
        "Feuille1": "minimes",
    },
    "Ramonville projet planning Coachs rentrée 2026.ods": {
        "Feuille1": "ramonville",
    },
    "Copie de Portet projet planning Coachs rentrée 2026 2.ods": {
        "Feuille1": "portet-combat",
        "Feuille1_2": "portet-mma",
    },
    "ETATS UNIS projet planning Coachs rentrée 2026.ods": {
        "SALLE BOXE": "etats-unis-boxe",
        "SALLE MMA SOL": "etats-unis-mma",
        "SALLE BOXING FITNESS": "etats-unis-fitness",
    },
}

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
        "#3faf46": "FAROUK", "#77bc65": "FAROUK",
        "#5983b0": "PASCAL", "#729fcf": "PASCAL",
    },
    "portet-combat": {
        "#c5000b": "PABLO", "#7e350e": "MARAMA", "#83cceb": "VAL",
        "#e97132": "SAMUEL", "#ed7d31": "SAMUEL", "#747474": "MARAMA/ VAL",
    },
    "portet-mma": {
        "#156082": "ENZO", "#4ea72e": "CALLUM",
        "#e97132": "SAMUEL", "#ed7d31": "SAMUEL",
        "#7030a0": "INGRID", "#275317": "INGRID + SAMUEL",
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
    "L": "LADY PUNCH",
    "LADY": "LADY PUNCH",
    "F": "FIT BOXE",
    "PREPATION PHYSIQUE": "PREPARATION PHYSIQUE",
    "CROSS TRAINING": "CROSS-TRAINING",
    "XACCES LIBRE": "ACCES LIBRE",
    "ACCÈS LIBRE": "ACCES LIBRE",
}

SKIP_ACTIVITY = {"", "---", "X", "XX", "O", "??", "S", "D", "DD", "K", "SSS", "E", "L", "¨¨", "¨"}

DAY_NAMES = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")

COACH_HINTS = (
    "PABLO", "MARAMA", "VAL", "SAMUEL", "ENZO", "CALLUM", "INGRID",
    "RENAUD", "DAVID", "VALENTIN", "ZOUIR", "CLEMENT", "YANNIS",
    "MEHDI", "REMUS", "HICHAM", "CHLOE", "FAEZ", "SONIA", "FAROUK",
    "JEROME", "PASCAL", "WALID", "FAYEZ", "DADI", "TAWEE", "VICTOR",
)


def resolve_ods_path(expected_name):
    exact = os.path.join(PLANNINGS_DIR, expected_name)
    if os.path.exists(exact):
        return exact, expected_name
    needle = expected_name[:20].lower()
    for f in os.listdir(PLANNINGS_DIR):
        if f.endswith(".ods") and needle in f.lower():
            return os.path.join(PLANNINGS_DIR, f), f
    return None, expected_name


def load_style_colors(root):
    colors = {}
    for style in root.findall(".//style:style", NS):
        name = style.get(f"{{{NS['style']}}}name")
        props = style.find("style:table-cell-properties", NS)
        if props is not None:
            bg = props.get(f"{{{NS['fo']}}}background-color")
            if bg:
                colors[name] = bg.lower()
    return colors


def cell_text(cell):
    parts = []
    for p in cell.findall(".//text:p", NS):
        t = "".join(p.itertext())
        if t:
            parts.append(t)
    return "\n".join(parts).strip()


def parse_cell_element(cell, tag, style_colors):
    repeat = int(cell.get(f"{{{NS['table']}}}number-columns-repeated") or 1)
    rs = int(cell.get(f"{{{NS['table']}}}number-rows-spanned") or 1)
    cs = int(cell.get(f"{{{NS['table']}}}number-columns-spanned") or 1)
    style_name = cell.get(f"{{{NS['table']}}}style-name")
    return {
        "text": cell_text(cell),
        "rs": rs,
        "cs": cs,
        "repeat": repeat,
        "color": style_colors.get(style_name, "#ffffff"),
        "is_covered": tag == "covered-table-cell",
    }


def iter_table_rows(table):
    """Yield all table rows including those nested in table-row-group."""
    for child in table:
        tag = child.tag.split("}")[-1]
        if tag == "table-row":
            yield child
        elif tag == "table-row-group":
            for row in child.findall("table:table-row", NS):
                yield row


def build_spatial_grid(table, style_colors):
    """Return list[dict[int, master_cell]] — sparse row maps."""
    grid = []
    r = 0
    for row_el in iter_table_rows(table):
        row_repeat = int(row_el.get(f"{{{NS['table']}}}number-rows-repeated") or 1)
        if row_repeat > 50:
            continue
        for _ in range(row_repeat):
            while len(grid) <= r:
                grid.append({})
            c = 0
            for cell in row_el.findall("./*", NS):
                tag = cell.tag.split("}")[-1]
                if tag not in ("table-cell", "covered-table-cell"):
                    continue
                while c in grid[r]:
                    c += 1
                master = parse_cell_element(cell, tag, style_colors)
                repeat = master["repeat"]
                if repeat > 50:
                    continue
                col = c
                for _rep in range(repeat):
                    while col in grid[r]:
                        col += 1
                    rs, cs = master["rs"], master["cs"]
                    for dr in range(rs):
                        while len(grid) <= r + dr:
                            grid.append({})
                        for dc in range(cs):
                            pos_c = col + dc
                            if master["is_covered"] and pos_c in grid[r + dr]:
                                continue
                            grid[r + dr][pos_c] = master
                    col += cs
                c = col
            r += 1
    return grid


def grid_max_col(grid):
    if not grid:
        return 0
    return max(max(row.keys()) if row else -1 for row in grid) + 1


def effective_max_col(grid, coach_row=-1):
    """Ignore trailing empty column-repeat padding from ODS exports."""
    max_c = 0
    limit = coach_row if coach_row > 0 else len(grid)
    for r in range(min(limit, len(grid))):
        for c in grid[r]:
            cell = grid[r][c]
            if cell.get("text") or (cell.get("color") and cell["color"] not in ("#ffffff", "#FFFFFF")):
                max_c = max(max_c, c + cell.get("cs", 1))
    return max(max_c, 1)


def get_cell(grid, r, c):
    if r < 0 or r >= len(grid):
        return None
    return grid[r].get(c)


def is_cell_origin(grid, r, c):
    master = get_cell(grid, r, c)
    if not master or not master.get("text"):
        return False
    if c > 0 and get_cell(grid, r, c - 1) is master:
        return False
    if r > 0 and get_cell(grid, r - 1, c) is master:
        return False
    return True


def normalize_time(text):
    t = text.strip().replace("\n", " ").replace(" / ", "/").replace(" - ", "-")
    t = re.sub(r"\s+", " ", t)
    if not t or any(d in t.lower() for d in DAY_NAMES):
        return None
    t = t.replace("/", "-").lower()
    t = re.sub(r"(\d+)h\s*-\s*", r"\1h-", t)
    t = re.sub(r"-\s*(\d)", r"-\1", t)
    return t


def get_time_for_row(grid, r, time_col=0):
    cell = get_cell(grid, r, time_col)
    if cell and cell.get("text"):
        return normalize_time(cell["text"])
    for up in range(r - 1, -1, -1):
        cell = get_cell(grid, up, time_col)
        if cell and cell.get("text"):
            rs = cell.get("rs", 1)
            if up + rs > r:
                return normalize_time(cell["text"])
    return None


def find_days_row(grid):
    for r, row in enumerate(grid):
        texts = [row[c]["text"].lower() for c in sorted(row) if row[c].get("text")]
        if any(any(d in t for d in DAY_NAMES[:6]) for t in texts):
            return r
    return -1


def build_column_slots(grid, days_row_idx, max_col):
    """Map column index -> (day, subColumn) using day header colspans."""
    row = grid[days_row_idx]
    day_ranges = []
    c = 1
    while c < max_col:
        if c not in row or not is_cell_origin(grid, days_row_idx, c):
            c += 1
            continue
        cell = row[c]
        text = cell.get("text", "").strip().lower()
        matched_day = None
        for day in DAY_NAMES:
            if day in text:
                matched_day = day
                break
        if matched_day:
            cs = cell.get("cs", 1)
            day_ranges.append((c, c + cs, matched_day))
            c += cs
        else:
            c += 1

    col_to_slot = {}
    for start, end, day in day_ranges:
        for col in range(start, end):
            col_to_slot[col] = (day, col - start)

    for col in range(1, max_col):
        if col in col_to_slot:
            continue
        for start, end, day in day_ranges:
            if start <= col < end + 2:
                col_to_slot[col] = (day, min(col - start, max(0, end - start - 1)))
                break
        if col not in col_to_slot and day_ranges:
            prev = day_ranges[0]
            for rng in day_ranges:
                if col >= rng[0]:
                    prev = rng
                else:
                    break
            start, end, day = prev
            col_to_slot[col] = (day, max(0, min(col - start, end - start - 1)))

    return col_to_slot


def build_sub_columns_config(col_to_slot):
    sub = {}
    for day, idx in col_to_slot.values():
        sub[day] = max(sub.get(day, 0), idx + 1)
    return sub


def find_coach_row(grid, days_row_idx):
    for r in range(len(grid) - 1, days_row_idx, -1):
        row = grid[r]
        texts = [row[c]["text"] for c in sorted(row) if row[c].get("text")]
        if not texts:
            continue
        # Coach row: mostly coach names, not long activity labels
        if any(len(t) > 35 for t in texts):
            continue
        activity_words = ("BOXE", "ANGLAISE", "GRAPPLING", "MMA", "KICK", "HYROX", "CROSS", "SPARRING", "BOXING", "JJB", "MUAY", "LADY PUNCH", "ACCES")
        if sum(1 for t in texts if any(w in t.upper() for w in activity_words)) >= 2:
            continue
        if any(any(h in t.upper() for h in COACH_HINTS) for t in texts):
            return r
    return -1


def build_coach_map(grid, coach_row_idx, col_to_slot, time_col=0):
    col_to_coach = {}
    if coach_row_idx < 0:
        return col_to_coach
    row = grid[coach_row_idx]
    # Detect if coach row aligns with data columns (has empty/time col) or starts at col 0
    data_cols = sorted(col_to_slot.keys())
    coach_cols = sorted(c for c in row if row[c].get("text"))
    if not coach_cols:
        return col_to_coach
    offset = 0
    if data_cols and coach_cols[0] < min(data_cols):
        offset = min(data_cols) - coach_cols[0]
    for c in coach_cols:
        if is_cell_origin(grid, coach_row_idx, c):
            target = c + offset if offset else c
            col_to_coach[target] = row[c]["text"].strip()
            cs = row[c].get("cs", 1)
            for dc in range(1, cs):
                col_to_coach[target + dc] = row[c]["text"].strip()
    return col_to_coach


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
    if len(upper) <= 2 and upper not in ACTIVITY_ALIASES:
        return None
    if re.match(r"^\d{1,2}H", upper.replace(" ", "")):
        return None
    return upper


def clean_coach_name(name):
    if not name:
        return "Non Assigné"
    name = name.split("(")[0].strip().upper()
    name = name.replace(" (COMMERCIAL)", "").replace(" (ALTERNANT)", "")
    if name in ("", "---", "?", "NON ASSIGNÉ", "NON ASSIGNE"):
        return "Non Assigné"
    return name


def resolve_coach(gym_id, color, col, col_to_coach, sheet_name):
    gym_coaches = COACH_COLORS_MAP.get(gym_id, {})
    if color in gym_coaches:
        return gym_coaches[color]
    return col_to_coach.get(col, "Non Assigné")


def parse_sheet(table, gym_id, sheet_name):
    style_colors = load_style_colors_from_table(table, style_colors_global=None)
    grid = build_spatial_grid(table, style_colors)
    if not grid:
        return [], {}

    max_col = grid_max_col(grid)
    days_row = find_days_row(grid)
    if days_row < 0:
        return [], {}

    col_to_slot = build_column_slots(grid, days_row, max_col)
    if not col_to_slot:
        return [], {}

    coach_row = find_coach_row(grid, days_row)
    col_to_coach = build_coach_map(grid, coach_row, col_to_slot)

    # Detect time column: col 0 if it looks like hours
    time_col = 0
    sample = get_time_for_row(grid, days_row + 1, 0)
    if not sample:
        time_col = 0

    sessions = []
    end = coach_row if coach_row > days_row else len(grid)

    for r in range(days_row + 1, end):
        time_slot = get_time_for_row(grid, r, time_col)
        if not time_slot:
            continue
        for c in sorted(col_to_slot.keys()):
            if c not in grid[r]:
                continue
            if not is_cell_origin(grid, r, c):
                continue
            master = grid[r][c]
            activity_raw = master.get("text", "")
            activity = clean_activity(activity_raw)
            if not activity:
                continue
            day, sub_col = col_to_slot[c]
            coach = clean_coach_name(
                resolve_coach(gym_id, master["color"], c, col_to_coach, sheet_name)
            )
            if "ACCES LIBRE" in activity:
                activity = "ACCES LIBRE"
                coach = "ACCES LIBRE"
            session = {
                "salle": gym_id,
                "period": "rentree-2026",
                "day": day,
                "subColumn": sub_col,
                "timeSlot": time_slot,
                "activity": activity.replace("\n", " ").strip(),
                "coach": coach,
                "rowSpan": master.get("rs", 1),
                "colSpan": master.get("cs", 1),
            }
            sessions.append(session)

    sub_config = build_sub_columns_config(col_to_slot)
    return sessions, sub_config


def load_style_colors_from_table(table, style_colors_global):
    # styles are document-level; re-read from parent if needed
    return style_colors_global or {}


def parse_ods_file(filepath, filename, style_colors):
    sessions = []
    grid_configs = {}
    with zipfile.ZipFile(filepath, "r") as z:
        root = ET.fromstring(z.read("content.xml"))
        style_colors = load_style_colors(root)
        mapping = GYM_MAPPING.get(filename, {})
        for table in root.findall(".//table:table", NS):
            sheet_name = table.get(f"{{{NS['table']}}}name")
            if sheet_name not in mapping:
                continue
            gym_id = mapping[sheet_name]
            sheet_sessions, sub_config = parse_sheet_with_styles(table, gym_id, sheet_name, style_colors)
            sessions.extend(sheet_sessions)
            if sub_config and max(sub_config.values(), default=1) > 1:
                grid_configs[gym_id] = {"subColumns": sub_config}
    return sessions, grid_configs


def parse_sheet_with_styles(table, gym_id, sheet_name, style_colors):
    grid = build_spatial_grid(table, style_colors)
    if not grid:
        return [], {}
    days_row = find_days_row(grid)
    if days_row < 0:
        return [], {}

    coach_row = find_coach_row(grid, days_row)
    max_col = effective_max_col(grid, coach_row if coach_row > 0 else len(grid))
    col_to_slot = build_column_slots(grid, days_row, max_col)
    if not col_to_slot:
        return [], {}

    col_to_coach = build_coach_map(grid, coach_row, col_to_slot)

    sessions = []
    end = coach_row if coach_row > days_row else len(grid)

    for r in range(days_row + 1, end):
        time_slot = get_time_for_row(grid, r, 0)
        if not time_slot:
            continue
        seen_at_row = set()
        for c in range(1, max_col):
            if c not in grid[r] or c not in col_to_slot:
                continue
            if not is_cell_origin(grid, r, c):
                continue
            master = grid[r][c]
            activity = clean_activity(master.get("text", ""))
            if not activity:
                continue
            day, sub_col = col_to_slot[c]
            key = (day, sub_col, activity, time_slot)
            if key in seen_at_row:
                continue
            seen_at_row.add(key)
            coach = clean_coach_name(resolve_coach(gym_id, master["color"], c, col_to_coach, sheet_name))
            if "ACCES LIBRE" in activity:
                activity = "ACCES LIBRE"
                coach = "ACCES LIBRE"
            sessions.append({
                "salle": gym_id,
                "period": "rentree-2026",
                "day": day,
                "subColumn": sub_col,
                "timeSlot": time_slot,
                "activity": activity,
                "coach": coach,
                "rowSpan": master.get("rs", 1),
                "colSpan": master.get("cs", 1),
            })

    sub_config = build_sub_columns_config(col_to_slot)
    return sessions, sub_config


def find_mapped_files():
    """Match ODS files on disk to GYM_MAPPING keys."""
    matched = {}
    for expected in GYM_MAPPING:
        if "(1)" in expected:
            continue
        path, actual = resolve_ods_path(expected)
        if path:
            matched[actual] = expected
    return matched


def generate_js():
    all_sessions = []
    all_grid_configs = {}

    file_map = find_mapped_files()
    for actual_name, mapping_key in sorted(file_map.items()):
        path = os.path.join(PLANNINGS_DIR, actual_name)
        sessions, configs = parse_ods_file(path, mapping_key, {})
        all_sessions.extend(sessions)
        all_grid_configs.update(configs)
        print(f"  {mapping_key}: {len(sessions)} sessions")

    for idx, s in enumerate(all_sessions):
        s["id"] = f"rentree-{idx + 1}"

    summer_sessions = [
        {"id": "sum-1", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "10h-11h", "activity": "COURS ETE", "coach": "MEHDI B"},
        {"id": "sum-2", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "12h30-13h30", "activity": "COURS ETE", "coach": "DADI"},
        {"id": "sum-3", "salle": "saint-cyprien", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "20h-21h", "activity": "COURS ETE", "coach": "WALID"},
        {"id": "sum-4", "salle": "ramonville", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "12h30-13h30", "activity": "COURS ETE", "coach": "RENAUD"},
        {"id": "sum-5", "salle": "ramonville", "period": "ete-2026", "day": "lundi", "subColumn": 0, "timeSlot": "20h-21h", "activity": "COURS ETE", "coach": "FAYEZ"},
    ]

    extra_activities = sorted(set(s["activity"] for s in all_sessions) - set([
        "ACCES LIBRE", "BOXING CAMP", "BOXE THAI/ K1", "ANGLAISE", "CROSS-TRAINING",
        "LADY PUNCH", "GRAPPLING", "HYROX", "BOXE EDUCATIVE 7/11 ANS", "BOXE EDUCATIVE 12/16 ANS",
        "BOXE EDUCATIVE COMPÉTITEURS", "BABY BOXE (3/6ANS)", "ASSO MMA", "BOXE COMPÉTITEURS",
        "BOXING LADY", "BOXE PIEDS POINGS", "PREPARATION PHYSIQUE", "LADY BOXING",
        "ANGLAISE LOISIRS", "SPARRING ANGLAISE", "JJB", "KICK / K1", "CRENEAU ASSO MMA",
        "LADY KICK", "KICK BOXING / K1", "SPARRING KICK BOXING", "BOXE FRANCAISE",
        "JIU-JITSU BRESILIEN", "BOXING HIIT", "COURS ETE",
    ]))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("export const initialPlannings = [\n")
        for s in all_sessions:
            extra = ""
            if s.get("rowSpan", 1) > 1:
                extra += f",\n    rowSpan: {s['rowSpan']}"
            if s.get("colSpan", 1) > 1:
                extra += f",\n    colSpan: {s['colSpan']}"
            if s.get("subColumn", 0) > 0:
                extra += f",\n    subColumn: {s['subColumn']}"
            f.write(
                f"  {{\n    id: \"{s['id']}\",\n    salle: \"{s['salle']}\",\n"
                f"    period: \"{s['period']}\",\n    day: \"{s['day']}\",\n"
                f"    timeSlot: \"{s['timeSlot']}\",\n    activity: \"{s['activity']}\",\n"
                f"    coach: \"{s['coach']}\"{extra}\n  }},\n"
            )
        for s in summer_sessions:
            f.write(
                f"  {{\n    id: \"{s['id']}\",\n    salle: \"{s['salle']}\",\n"
                f"    period: \"{s['period']}\",\n    day: \"{s['day']}\",\n"
                f"    timeSlot: \"{s['timeSlot']}\",\n    activity: \"{s['activity']}\",\n"
                f"    coach: \"{s['coach']}\"\n  }},\n"
            )
        f.write("];\n\n")

        f.write(f"export const gymGridConfig = {json.dumps(all_grid_configs, ensure_ascii=False, indent=2)};\n\n")

        f.write("""export const coachColors = {
  "HICHAM": "#38BDF8",
  "DADI": "#F59E0B",
  "TAWEE": "#EF4444",
  "VICTOR G": "#10B981",
  "JEROME": "#8B5CF6",
  "SONIA": "#EC4899",
  "FAROUK": "#6366F1",
  "PASCAL": "#14B8A6",
  "MEHDI B": "#F43F5E",
  "REMUS": "#84CC16",
  "DAVID": "#06B6D4",
  "CHLOE": "#D946EF",
  "FAEZ": "#F97316",
  "PABLO": "#475569",
  "MARAMA": "#1E293B",
  "VAL": "#059669",
  "SAMUEL": "#B45309",
  "ENZO": "#4338CA",
  "CALLUM": "#6D28D9",
  "INGRID": "#DB2777",
  "RENAUD": "#C2410C",
  "VALENTIN GUTH": "#B91C1C",
  "VALENTIN G": "#64748B",
  "ZOUIR": "#5B21B6",
  "CLEMENT": "#15803D",
  "YANNIS CHOUET": "#0F766E",
  "WALID": "#4D7C0F",
  "FAYEZ": "#701A75",
  "FIT BOXE": "#94A3B8",
  "Non Assigné": "#E2E8F0",
  "ACCES LIBRE": "#F1F5F9"
};

export const activityColors = {
  "ACCES LIBRE": "bg-slate-100 text-slate-700 border-slate-200",
  "BOXING CAMP": "bg-red-900/10 text-red-700 border-red-200",
  "BOXE THAI/ K1": "bg-blue-600/10 text-blue-700 border-blue-200",
  "ANGLAISE": "bg-blue-700/10 text-blue-700 border-blue-200",
  "ANGLAISE CONFIRMES": "bg-blue-800/10 text-blue-800 border-blue-300",
  "CROSS-TRAINING": "bg-emerald-600/10 text-emerald-700 border-emerald-200",
  "LADY PUNCH": "bg-fuchsia-600/10 text-fuchsia-700 border-fuchsia-200",
  "GRAPPLING": "bg-purple-600/10 text-purple-700 border-purple-200",
  "HYROX": "bg-green-600/10 text-green-700 border-green-200",
  "BOXE EDUCATIVE 7/11 ANS": "bg-red-500/10 text-red-600 border-red-200",
  "BOXE EDUCATIVE 7/11ANS": "bg-red-500/10 text-red-600 border-red-200",
  "BOXE EDUCATIVE 12/16 ANS": "bg-red-500/10 text-red-600 border-red-200",
  "BOXE EDUCATIVE 12/16ANS": "bg-red-500/10 text-red-600 border-red-200",
  "BOXE EDUCATIVE COMPÉTITEURS": "bg-red-600/15 text-red-700 border-red-300",
  "BOXE EDUCATIVE CONFIRMES": "bg-red-600/15 text-red-700 border-red-300",
  "BABY BOXE (3/6ANS)": "bg-rose-500/10 text-rose-600 border-rose-200",
  "ASSO MMA": "bg-violet-700/10 text-violet-700 border-violet-200",
  "BOXE COMPÉTITEURS": "bg-red-700/25 text-red-800 border-red-400 font-bold",
  "BOXE PRO": "bg-red-800/20 text-red-900 border-red-400 font-bold",
  "BOXING LADY": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200",
  "BOXE PIEDS POINGS": "bg-amber-600/10 text-amber-700 border-amber-200",
  "BOXE ANGLAISE": "bg-blue-600/10 text-blue-700 border-blue-200",
  "BOXE ANGLAISE (LOISIRS)": "bg-blue-600/10 text-blue-700 border-blue-200",
  "PREPARATION PHYSIQUE": "bg-cyan-600/10 text-cyan-700 border-cyan-200",
  "LADY BOXING": "bg-fuchsia-700/10 text-fuchsia-700 border-fuchsia-200",
  "ANGLAISE LOISIRS": "bg-blue-600/10 text-blue-700 border-blue-200",
  "SPARRING ANGLAISE": "bg-orange-600/10 text-orange-700 border-orange-200",
  "OPEN SPARRING": "bg-orange-600/10 text-orange-700 border-orange-200",
  "JJB": "bg-indigo-600/10 text-indigo-700 border-indigo-200",
  "KICK / K1": "bg-blue-500/10 text-blue-600 border-blue-200",
  "CRENEAU ASSO MMA": "bg-violet-600/10 text-violet-700 border-violet-200",
  "CRENAU ASSO MMA ADOS": "bg-violet-600/10 text-violet-700 border-violet-200",
  "LADY KICK": "bg-fuchsia-600/10 text-fuchsia-700 border-fuchsia-200",
  "KICK BOXING / K1": "bg-blue-600/15 text-blue-700 border-blue-300",
  "SPARRING KICK BOXING": "bg-orange-600/15 text-orange-700 border-orange-300",
  "BOXE FRANCAISE": "bg-teal-600/10 text-teal-700 border-teal-200",
  "BOXE AMATEURS ET PROS": "bg-red-700/15 text-red-800 border-red-300",
  "JIU-JITSU BRESILIEN": "bg-indigo-700/10 text-indigo-700 border-indigo-200",
  "BOXING HIIT": "bg-green-600/10 text-green-700 border-green-200",
  "MUAY (LOISIR ET COMPÉTITEURS)": "bg-amber-700/10 text-amber-800 border-amber-300",
  "FIT BOXE": "bg-slate-600/10 text-slate-700 border-slate-200",
  "MMA ENFANTS 10 /16 ANS": "bg-violet-500/10 text-violet-600 border-violet-200",
  "MMA ADOS": "bg-violet-500/10 text-violet-600 border-violet-200",
  "KICK ENFANTS": "bg-blue-400/10 text-blue-600 border-blue-200",
  "KICK ADOS": "bg-blue-400/10 text-blue-600 border-blue-200",
  "ASSO MMA ENFANTS 10 /16 ANS": "bg-violet-600/10 text-violet-700 border-violet-200",
  "BOXE PIEDS POINGS (3/6ANS)": "bg-amber-500/10 text-amber-600 border-amber-200",
  "BOXE PIEDS POINGS 7/11 ANS": "bg-amber-500/10 text-amber-600 border-amber-200",
  "BOXE PIEDS POINGS 12/16 ANS": "bg-amber-500/10 text-amber-600 border-amber-200",
  "COURS ETE": "bg-amber-500/10 text-amber-700 border-amber-200 border-dashed"
};

export const gyms = [
  { id: "saint-cyprien", name: "Saint-Cyprien" },
  { id: "minimes", name: "Barrière de Paris – Minimes" },
  { id: "ramonville", name: "Ramonville" },
  { id: "etats-unis-boxe", name: "États-Unis — Salle Boxe" },
  { id: "etats-unis-mma", name: "États-Unis — Salle MMA" },
  { id: "etats-unis-fitness", name: "États-Unis — Boxing Fitness" },
  { id: "portet-combat", name: "Portet-sur-Garonne (Combat)" },
  { id: "portet-mma", name: "Portet-sur-Garonne (MMA)" }
];
""")

    if extra_activities:
        print("  New activities detected:", extra_activities)


if __name__ == "__main__":
    print("Regenerating plannings.js from ODS sources...")
    generate_js()
    print("Done ->", OUTPUT_FILE)
