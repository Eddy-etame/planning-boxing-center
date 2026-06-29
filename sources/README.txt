Source ODS files (planning rentrée 2026). These are the single source of truth.

- St Cyprien projet planning Coachs rentrée 2026.ods       -> saint-cyprien
- Barrière de Paris projet Coachs planning rentrée 2026 V1.ods -> minimes
- Ramonville projet planning Coachs rentrée 2026.ods       -> ramonville
- Copie de Portet projet planning Coachs rentrée 2026 2.ods -> portet-combat (Feuille1) + portet-mma (Feuille1_2)
- ETATS UNIS projet planning Coachs rentrée 2026.ods       -> etats-unis-boxe / -mma / -fitness

Regenerate src/data/plannings.js from these sources (run from the project root):
  python build_db.py

Validate the generated data against the verified golden invariants:
  python validate_db.py

Notes:
- Coach attribution is by CELL BACKGROUND COLOUR (see COACH_COLORS_MAP in build_db.py).
- Colour tables (coachColors / activityColors) live in data_tables.json — the single
  source of truth that build_db.py inlines into plannings.js.
- "St Cyprien ... (1).ods" is a duplicate kept only for reference; build_db.py uses the
  canonical name without the "(1)" suffix.
