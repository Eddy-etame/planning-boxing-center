import { initialPlannings, coachColors as defaultCoachColors, DATA_VERSION as SRC_VERSION } from "@/data/plannings";

// Derived from a content hash of the generated data (build_db.py). Any change to
// the source plannings bumps this automatically, so stale caches re-seed.
export const DATA_VERSION = SRC_VERSION || "src-fallback";

export function loadPlanningsFromStorage() {
  if (typeof window === "undefined") {
    return { plannings: initialPlannings, coachColors: defaultCoachColors };
  }
  const version = localStorage.getItem("bc_plannings_version");
  if (version !== DATA_VERSION) {
    localStorage.setItem("bc-plannings-data-v2", JSON.stringify(initialPlannings));
    localStorage.setItem("bc_coach_colors", JSON.stringify(defaultCoachColors));
    localStorage.setItem("bc_plannings_version", DATA_VERSION);
    return { plannings: initialPlannings, coachColors: defaultCoachColors };
  }
  const localPlannings = localStorage.getItem("bc-plannings-data-v2");
  const localColors = localStorage.getItem("bc_coach_colors");
  return {
    plannings: localPlannings ? JSON.parse(localPlannings) : initialPlannings,
    coachColors: localColors ? JSON.parse(localColors) : defaultCoachColors,
  };
}

export function savePlanningsToStorage(plannings, coachColors) {
  localStorage.setItem("bc-plannings-data-v2", JSON.stringify(plannings));
  localStorage.setItem("bc_coach_colors", JSON.stringify(coachColors));
  localStorage.setItem("bc_plannings_version", DATA_VERSION);
}
