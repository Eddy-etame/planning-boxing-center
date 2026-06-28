"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { gyms, initialPlannings, coachColors as defaultCoachColors } from "@/data/plannings";
import ScheduleGrid from "@/components/ScheduleGrid";
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

  const gymSessions = plannings.filter(
    (c) => c.salle === salle && c.period === "rentree-2026"
  );

  const handlePrint = () => window.print();

  const handleDownloadPNG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const poster = document.getElementById("poster-container");
    const canvas = await html2canvas(poster, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0A0D1A",
    });
    const link = document.createElement("a");
    link.download = `planning-${salle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="no-print w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-50">
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
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Télécharger PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Imprimer Poster</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center p-8 bg-slate-950 overflow-auto">
        <div
          id="poster-container"
          className="w-[1200px] min-h-[1000px] bg-[#0A0D1A] flex flex-col border border-slate-900 shadow-2xl relative select-none shrink-0"
        >
          <div className="relative h-[200px] w-full overflow-hidden border-b-2 border-slate-950">
            <Image
              src="/header-bg.png"
              alt="Boxers banner background"
              fill
              className="object-cover opacity-35 brightness-[0.4]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0D1A]" />
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xl font-black tracking-widest text-white/90">2026-2027</span>
                <img src="/logo-light.png" alt="Boxing Center Logo" style={{ height: "65px", objectFit: "contain" }} />
              </div>
              <h2
                className="text-2xl font-extrabold text-white text-center tracking-wider uppercase"
                style={{ fontSize: getGymName().length > 28 ? "20px" : "28px" }}
              >
                SALLE {getGymName().toUpperCase()}
              </h2>
            </div>
          </div>

          <ScheduleGrid
            gymId={salle}
            sessions={gymSessions}
            coachColors={coachColors}
            variant="poster"
          />
        </div>
      </div>
    </div>
  );
}
