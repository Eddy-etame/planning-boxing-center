import { initialPlannings, coachColors as defaultCoachColors } from "@/data/plannings";

export const DATA_VERSION = "2026-06-28-v2";

export function loadPlanningsFromStorage() {
  if (typeof window === "undefined") {
    return { plannings: initialPlannings, coachColors: defaultCoachColors };
  }
  const version = localStorage.getItem("bc_plannings_version");
  if (version !== DATA_VERSION) {
    localStorage.setItem("bc_plannings", JSON.stringify(initialPlannings));
    localStorage.setItem("bc_coach_colors", JSON.stringify(defaultCoachColors));
    localStorage.setItem("bc_plannings_version", DATA_VERSION);
    return { plannings: initialPlannings, coachColors: defaultCoachColors };
  }
  const localPlannings = localStorage.getItem("bc_plannings");
  const localColors = localStorage.getItem("bc_coach_colors");
  return {
    plannings: localPlannings ? JSON.parse(localPlannings) : initialPlannings,
    coachColors: localColors ? JSON.parse(localColors) : defaultCoachColors,
  };
}

export function savePlanningsToStorage(plannings, coachColors) {
  localStorage.setItem("bc_plannings", JSON.stringify(plannings));
  localStorage.setItem("bc_coach_colors", JSON.stringify(coachColors));
  localStorage.setItem("bc_plannings_version", DATA_VERSION);
}
