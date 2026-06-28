/**
 * Quick grid placement sanity check (run: node scripts/validate_grid.js)
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  buildColumnDescriptors,
  getTimeSlotsForSessions,
  resolveCellState,
} from "../src/lib/scheduleGrid.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const planningsPath = join(__dir, "../src/data/plannings.js");
const content = readFileSync(planningsPath, "utf8");

// Minimal eval of exported arrays
const initialPlannings = eval(
  content.match(/export const initialPlannings = (\[[\s\S]*?\]);/)[1]
);

function validateGym(gymId) {
  const sessions = initialPlannings.filter(
    (s) => s.salle === gymId && s.period === "rentree-2026"
  );
  const columns = buildColumnDescriptors(gymId);
  const timeSlots = getTimeSlotsForSessions(sessions);
  let origins = 0;
  let covered = 0;
  let empty = 0;
  let tableCols = 0;

  for (let ti = 0; ti < timeSlots.length; ti++) {
    let rowCols = 1; // time column
    for (const col of columns) {
      const state = resolveCellState(sessions, columns, col.colIndex, ti, timeSlots, gymId);
      if (state.kind === "origin") {
        origins++;
        rowCols += state.colSpan;
      } else if (state.kind === "covered") {
        covered++;
      } else {
        empty++;
        rowCols += 1;
      }
    }
    const expected = 1 + columns.length;
    if (rowCols !== expected) {
      console.error(`FAIL ${gymId} row ${timeSlots[ti]}: rendered ${rowCols} cols, expected ${expected}`);
      return false;
    }
    tableCols = rowCols;
  }

  console.log(
    `OK ${gymId}: ${columns.length} data cols, ${timeSlots.length} rows, origins=${origins} covered=${covered} empty=${empty}`
  );
  return true;
}

const gyms = [
  "minimes",
  "saint-cyprien",
  "ramonville",
  "etats-unis-boxe",
  "etats-unis-mma",
  "etats-unis-fitness",
  "portet-combat",
  "portet-mma",
];

let ok = true;
for (const g of gyms) {
  if (!validateGym(g)) ok = false;
}
process.exit(ok ? 0 : 1);
