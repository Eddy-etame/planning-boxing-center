"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Printer, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { gyms, initialPlannings, coachColors as defaultCoachColors, activityColors } from "@/data/plannings";

export default function GymPoster({ params }) {
  const { salle } = params;
  const [plannings, setPlannings] = useState([]);
  const [coachColors, setCoachColors] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load data from LocalStorage or defaults
    const localPlannings = localStorage.getItem("bc_plannings");
    const localColors = localStorage.getItem("bc_coach_colors");

    if (localPlannings) {
      setPlannings(JSON.parse(localPlannings));
    } else {
      setPlannings(initialPlannings);
    }

    if (localColors) {
      setCoachColors(JSON.parse(localColors));
    } else {
      setCoachColors(defaultCoachColors);
    }

    setLoading(false);
  }, []);

  const getGymName = () => {
    return gyms.find((g) => g.id === salle)?.name || salle;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const poster = document.getElementById("poster-container");
    
    // Temporarily hide scrolling/borders if any
    const canvas = await html2canvas(poster, {
      scale: 2, // high quality
      useCORS: true,
      backgroundColor: "#0A0D1A"
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

  // Filter plannings matching this gym and rentree-2026
  const gymSessions = plannings.filter(
    (c) => c.salle === salle && c.period === "rentree-2026"
  );

  const parseTime = (s) => {
    const match = s.match(/(\d+)h(\d*)/);
    if (!match) return 0;
    const h = parseInt(match[1]);
    const m = match[2] ? parseInt(match[2]) : 0;
    return h * 60 + m;
  };

  const sortTimeSlots = (slots) => {
    return [...slots].sort((a, b) => parseTime(a) - parseTime(b));
  };

  const cleanSlot = (s) => s.replace(/\s+/g, '').replace('-', '/').toLowerCase();
  
  const matchTimeSlot = (slot1, slot2) => {
    if (!slot1 || !slot2) return false;
    return cleanSlot(slot1) === cleanSlot(slot2);
  };

  const computedSlots = sortTimeSlots(
    Array.from(new Set(gymSessions.map(c => c.timeSlot)))
  );
  const timeSlots = computedSlots.length > 0 ? computedSlots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];

  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top action bar (no-print) */}
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
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <Download size={14} />
            <span>Télécharger PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <Printer size={14} />
            <span>Imprimer Poster</span>
          </button>
        </div>
      </div>

      {/* Main Poster Container (exact dimensions matching St-Cyprien design) */}
      <div className="flex-grow flex items-center justify-center p-8 bg-slate-950 overflow-auto">
        <div 
          id="poster-container" 
          className="w-[1000px] h-[1000px] bg-[#0A0D1A] flex flex-col border border-slate-900 shadow-2xl relative select-none shrink-0"
          style={{ width: "1000px", height: "1000px" }}
        >
          {/* Photographic header banner */}
          <div className="relative h-[220px] w-full overflow-hidden border-b-2 border-slate-950">
            <Image
              src="/header-bg.png"
              alt="Boxers banner background"
              fill
              className="object-cover opacity-35 filter brightness-[0.4]"
              priority
            />
            {/* Dark texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0D1A]" />
            <div className="absolute inset-0 bg-slate-950/20" />
            
            {/* Header branding elements */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xl font-black tracking-widest text-white/90">2026-2027</span>
                <img src="/logo.png" alt="Boxing Center Logo" style={{ height: "65px", objectFit: "contain" }} />
              </div>
              <h2 className="text-3xl font-extrabold text-white text-center tracking-[0.08em] uppercase mb-2" style={{ fontSize: getGymName().length > 20 ? "24px" : "36px" }}>
                SALLE {getGymName().toUpperCase()}
              </h2>
            </div>
          </div>

          {/* Grid schedule table */}
          <div className="flex-grow p-4 flex flex-col">
            {/* Columns Headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {/* Top-left empty slot */}
              <div className="bg-[#1e293b]/20 border border-slate-900 rounded-lg flex items-center justify-center" />
              {days.map((day) => (
                <div
                  key={day}
                  className="bg-[#2A4D7E] border border-slate-800 text-center py-4 rounded-lg font-black text-xs uppercase tracking-wider text-white"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            <div 
              className="flex-grow grid gap-1.5"
              style={{ gridTemplateRows: `repeat(${timeSlots.length}, minmax(0, 1fr))` }}
            >
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-7 gap-1.5 h-full">
                  {/* Left time slot indicator */}
                  <div className="bg-[#121829] border border-slate-900 rounded-lg flex items-center justify-center font-black text-[11px] text-white/80 tracking-wide text-center">
                    {time}
                  </div>

                  {/* Day session blocks */}
                  {days.map((day) => {
                    // Find course matching day, time, gym
                    const course = gymSessions.find(
                      (c) => c.day === day && matchTimeSlot(c.timeSlot, time)
                    );

                    if (!course) {
                      return (
                        <div 
                          key={day} 
                          className="bg-[#0E1222]/40 border border-slate-900/60 rounded-lg flex items-center justify-center text-[10px] text-white/10 font-black uppercase tracking-wider text-center px-1"
                        >
                          accès libre
                        </div>
                      );
                    }

                    if (course.activity === "ACCES LIBRE") {
                      return (
                        <div 
                          key={day} 
                          className="bg-[#0E1222]/40 border border-slate-900/60 rounded-lg flex items-center justify-center text-[10px] text-white/10 font-black uppercase tracking-wider text-center px-1"
                        >
                          accès libre
                        </div>
                      );
                    }

                    const bgCol = coachColors[course.coach] || "#475569";

                    return (
                      <div
                        key={day}
                        className="border border-slate-950 rounded-lg flex flex-col items-center justify-center p-1.5 text-center transition-transform hover:scale-[1.02] shadow-md shadow-black/10 select-none h-full"
                        style={{ backgroundColor: bgCol }}
                      >
                        <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight max-w-full break-words">
                          {course.activity}
                        </span>
                        <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1">
                          {course.coach}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
