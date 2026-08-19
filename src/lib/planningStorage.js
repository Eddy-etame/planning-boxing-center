import { initialPlannings, coachColors as defaultCoachColors } from "@/data/plannings";

/* La version est un hachage du CONTENU, calcule ici meme : toute edition de
   plannings.js — a la main comme par generateur — reseme les navigateurs.

   Avant : on importait un DATA_VERSION que build_db.py etait cense ecrire.
   Il n'existe plus depuis que les donnees sont transcrites depuis les PDF ;
   l'import rendait undefined, le repli "src-fallback" devenait une
   CONSTANTE, et plus aucun navigateur ne se resemait — quiconque avait
   deja ouvert l'outil voyait d'anciennes donnees, sans aucun indice. */
function hashContenu(objet) {
  const s = JSON.stringify(objet);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "c" + (h >>> 0).toString(36) + "-" + s.length;
}
export const DATA_VERSION = hashContenu([initialPlannings, defaultCoachColors]);

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
