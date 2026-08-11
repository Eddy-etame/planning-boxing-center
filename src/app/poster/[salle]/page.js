"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { gyms } from "@/data/plannings";
import { buildGymPosterContainerHTML } from "@/lib/posterExport";
import { loadPlanningsFromStorage } from "@/lib/planningStorage";

export default function GymPoster({ params }) {
  const { salle } = params;
  const [plannings, setPlannings] = useState([]);
  const [coachColors, setCoachColors] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { plannings: p, coachColors: c } = loadPlanningsFromStorage();
    setPlannings(p);
    setCoachColors(c);
    setLoading(false);
  }, []);

  const getGymName = () => gyms.find((g) => g.id === salle)?.name || salle;

  /* La periode n'est plus ecrite en dur : une salle peut n'exister que sur
     une periode (le planning provisoire de Portet vit sous « provisoire-2026 »).
     On prend « rentree-2026 » quand elle existe, sinon la seule que la salle
     possede — sans quoi l'affiche se replie sur une grille de secours et
     affiche cinq rangees d'acces libre, ce qui est pire que rien. */
  const periodesDeLaSalle = [...new Set(plannings.filter((c) => c.salle === salle).map((c) => c.period))];
  const periode = periodesDeLaSalle.includes("rentree-2026") ? "rentree-2026" : periodesDeLaSalle[0];
  const gymSessions = plannings.filter((c) => c.salle === salle && c.period === periode);

  const html = buildGymPosterContainerHTML({
    gymId: salle,
    gymName: getGymName(),
    sessions: gymSessions,
    coachColors,
  });

  const handlePrint = () => window.print();

  const handleDownloadPNG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const poster = document.getElementById("poster-container");
    const canvas = await html2canvas(poster, { scale: 2, useCORS: true, backgroundColor: "#0A0D1A" });
    const link = document.createElement("a");
    link.download = `planning-${salle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="no-print w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-50 sticky top-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black uppercase text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Retour</span>
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPNG}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Télécharger PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Printer size={14} />
            <span>Imprimer Poster</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex items-start justify-center p-4 sm:p-8 bg-slate-950 overflow-auto">
        <div id="poster-container" className="shrink-0" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
