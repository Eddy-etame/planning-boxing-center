"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { gyms } from "@/data/plannings";
import { buildCoachPosterContainerHTML } from "@/lib/posterExport";
import { loadPlanningsFromStorage } from "@/lib/planningStorage";

export default function CoachPoster({ params }) {
  const rawName = decodeURIComponent(params.name || "");
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

  const getGymName = (gymId) => gyms.find((g) => g.id === gymId)?.name || gymId;

  const target = rawName.toUpperCase();
  const coachSessions = plannings.filter((c) => {
    const cn = (c.coach || "").toUpperCase();
    return (cn === target || cn.includes(target)) && c.period === "rentree-2026";
  });
  // Canonical display name (e.g. "mehdi" -> "MEHDI B" from the data).
  const coachName = coachSessions[0]?.coach || rawName.toUpperCase();

  const html = buildCoachPosterContainerHTML({
    coachName,
    sessions: coachSessions,
    coachColors,
    getGymName,
  });

  const handlePrint = () => window.print();

  const handleDownloadPNG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const poster = document.getElementById("poster-container");
    const canvas = await html2canvas(poster, { scale: 2, useCORS: true, backgroundColor: "#0A0D1A" });
    const link = document.createElement("a");
    link.download = `planning-coach-${rawName.toLowerCase()}.png`;
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
        {coachSessions.length === 0 ? (
          <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mt-20">
            Aucun cours trouvé pour « {rawName} »
          </div>
        ) : (
          <div id="poster-container" className="shrink-0" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
