"""
Regression guard for the planning database.

Re-parses the ODS sources with build_db and asserts a set of invariants that
were each verified by hand against the official PDFs. If a future change to the
parser (or to a source file) silently drops a column, invents a class, or shifts
data, this fails loudly instead of shipping a wrong planning.

Run:  python validate_db.py     (exit code 0 = OK, 1 = regression)
"""

import sys

import build_db as db

# Golden per-venue session counts — each cross-checked cell-by-cell against the
# matching official PDF (Ramonville/Minimes/Etats-Unis/St-Cyprien) or the ODS
# (Portet, which has no PDF).
EXPECTED_COUNTS = {
    "saint-cyprien": 36,
    "minimes": 39,
    "ramonville": 23,
    "portet-combat": 25,
    "portet-mma": 30,
    "etats-unis-boxe": 20,
    "etats-unis-mma": 13,
    "etats-unis-fitness": 15,
}

WEEKDAYS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi")

# Covered-cell ghosts that the old parser leaked into Ramonville. They must never
# reappear as standalone classes.
FORBIDDEN = {
    ("ramonville", "jeudi"): {"LADY PUNCH"},
    ("ramonville", "mardi"): {"BOXE EDUCATIVE 7/11 ANS", "BOXE EDUCATIVE 12/16 ANS"},
}


def main():
    sessions, configs = db.build()
    errors = []

    by_venue = {}
    for s in sessions:
        by_venue.setdefault(s["salle"], []).append(s)

    # 1. Every expected venue exists with the exact validated session count.
    for venue, expected in EXPECTED_COUNTS.items():
        got = len(by_venue.get(venue, []))
        if got != expected:
            errors.append(f"{venue}: expected {expected} sessions, got {got}")

    # 2. No unexpected venues.
    for venue in by_venue:
        if venue not in EXPECTED_COUNTS:
            errors.append(f"unexpected venue in output: {venue}")

    # 3. Every venue covers all six weekdays (the Saturday-drop guard).
    for venue, items in by_venue.items():
        days = {s["day"] for s in items}
        missing = [d for d in WEEKDAYS if d not in days]
        if missing:
            errors.append(f"{venue}: missing days {missing}")

    # 4. No forbidden ghost classes.
    for (venue, day), banned in FORBIDDEN.items():
        for s in by_venue.get(venue, []):
            if s["day"] == day and s["activity"] in banned:
                errors.append(f"{venue}/{day}: forbidden ghost class '{s['activity']}'")

    # 5. Every session is well-formed.
    for s in sessions:
        if not s.get("timeSlot") or not s.get("activity"):
            errors.append(f"malformed session: {s}")
        if not s.get("coach"):
            errors.append(f"session without coach: {s}")

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    total = len(sessions)
    print(f"VALIDATION PASSED — {total} sessions across {len(by_venue)} venues, "
          f"all weekdays present, no ghost classes.")


if __name__ == "__main__":
    main()
