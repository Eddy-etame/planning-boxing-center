"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, Calendar, MapPin, Bell, Download, ShieldAlert, Sparkles, CheckCircle2, 
  Trash2, UserCheck, Plus, Check, Save, Share2, HelpCircle, Palette
} from "lucide-react";
import Image from "next/image";
import { gyms, initialPlannings, coachColors as defaultCoachColors, activityColors } from "@/data/plannings";

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("rentree-2026");
  const [plannings, setPlannings] = useState([]);
  const [coachColors, setCoachColors] = useState({});
  const [selectedGym, setSelectedGym] = useState("saint-cyprien");
  const [activeTab, setActiveTab] = useState("schedule-editor"); // schedule-editor, color-editor, cover-requests
  const [coverRequests, setCoverRequests] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // New class form state
  const [newClass, setNewClass] = useState({
    day: "lundi",
    timeSlot: "12h40-13h20",
    activity: "BOXE ANGLAISE",
    coach: "DADI",
  });

  const router = useRouter();

  useEffect(() => {
    // Load session
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.role !== "admin") {
          router.push("/");
        } else {
          setSession(data);
          loadDatabase();
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  const loadDatabase = () => {
    // Load colors and plannings from LocalStorage if they exist, else load defaults
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

    // Set initial cover requests
    setCoverRequests([
      { id: "req-1", gym: "ramonville", day: "mardi", timeSlot: "18h40-19h40", activity: "GRAPPLING", coach: "SONIA", status: "open" },
      { id: "req-2", gym: "etats-unis", day: "jeudi", timeSlot: "12h40-13h20", activity: "BOXE ANGLAISE", coach: "VALENTIN GUTH", status: "open" }
    ]);

    setLoading(false);
  };

  // Run conflict detection whenever planning changes
  useEffect(() => {
    if (plannings.length === 0) return;
    
    const detectedConflicts = [];
    const scheduleMap = {}; // key: coach_day_timeSlot_period -> list of gyms

    plannings.forEach((slot) => {
      if (!slot.coach || slot.coach === "Non Assigné" || slot.coach === "ACCES LIBRE") return;
      
      // Standardize time slots for comparison (rough check)
      const key = `${slot.coach.toUpperCase()}_${slot.day}_${slot.timeSlot}_${slot.period}`;
      if (!scheduleMap[key]) {
        scheduleMap[key] = [];
      }
      scheduleMap[key].push(slot);
    });

    Object.keys(scheduleMap).forEach((key) => {
      if (scheduleMap[key].length > 1) {
        // Conflict detected!
        detectedConflicts.push({
          key,
          coach: scheduleMap[key][0].coach,
          day: scheduleMap[key][0].day,
          timeSlot: scheduleMap[key][0].timeSlot,
          gyms: scheduleMap[key].map(slot => gyms.find(g => g.id === slot.salle)?.name || slot.salle)
        });
      }
    });

    setConflicts(detectedConflicts);
  }, [plannings]);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  // Change slot coach
  const handleChangeCoach = (slotId, newCoach) => {
    const updated = plannings.map((slot) => {
      if (slot.id === slotId) {
        return { ...slot, coach: newCoach.toUpperCase() };
      }
      return slot;
    });
    setPlannings(updated);
    localStorage.setItem("bc_plannings", JSON.stringify(updated));
  };

  // Change coach color
  const handleChangeColor = (coach, color) => {
    const updated = { ...coachColors, [coach.toUpperCase()]: color };
    setCoachColors(updated);
    localStorage.setItem("bc_coach_colors", JSON.stringify(updated));
  };

  // Delete slot
  const handleDeleteSlot = (slotId) => {
    if (confirm("Voulez-vous vraiment supprimer ce cours ?")) {
      const updated = plannings.filter((slot) => slot.id !== slotId);
      setPlannings(updated);
      localStorage.setItem("bc_plannings", JSON.stringify(updated));
    }
  };

  // Add new slot
  const handleAddClass = (e) => {
    e.preventDefault();
    const newSlot = {
      id: `custom-${Date.now()}`,
      salle: selectedGym,
      period: period,
      day: newClass.day,
      timeSlot: newClass.timeSlot,
      activity: newClass.activity.toUpperCase(),
      coach: newClass.coach.toUpperCase(),
    };
    
    const updated = [...plannings, newSlot];
    setPlannings(updated);
    localStorage.setItem("bc_plannings", JSON.stringify(updated));
    setShowAddClassModal(false);
    
    // Trigger confetti
    import("canvas-confetti").then((module) => {
      module.default({ particleCount: 50, spread: 60 });
    });
  };

  // Approve cover request
  const handleApproveCover = (req, replacingCoach) => {
    if (!replacingCoach) {
      alert("Veuillez saisir le nom du coach remplaçant.");
      return;
    }
    
    // Find the slot matching the request in planning
    const updated = plannings.map((slot) => {
      if (
        slot.salle === req.gym &&
        slot.day === req.day &&
        slot.timeSlot === req.timeSlot &&
        slot.activity === req.activity
      ) {
        return { ...slot, coach: replacingCoach.toUpperCase() };
      }
      return slot;
    });

    setPlannings(updated);
    localStorage.setItem("bc_plannings", JSON.stringify(updated));
    
    // Close the request
    setCoverRequests(coverRequests.filter((r) => r.id !== req.id));
    
    alert(`Le cours a été attribué avec succès à Coach ${replacingCoach.toUpperCase()} !`);
  };

  // Publish changes
  const handlePublish = () => {
    setIsPublishing(true);
    
    // Emulate sending PWA / email notifications
    setTimeout(() => {
      setIsPublishing(false);
      
      import("canvas-confetti").then((module) => {
        module.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      });
      alert("Le planning et les modifications ont été diffusés à tous les coachs (PWA alerts & emails envoyés) !");
    }, 2000);
  };

  const handleDownloadAllVisuals = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const JSZip = (await import("jszip")).default;
    const activeGyms = gyms;
    const activeCoaches = allCoaches;

    const confirmDownload = confirm("Voulez-vous télécharger tous les visuels (salles + coachs) dans un fichier ZIP ? Cela peut prendre quelques secondes.");
    if (!confirmDownload) return;

    const zip = new JSZip();

    const statusDiv = document.createElement("div");
    statusDiv.style.cssText = "position:fixed;bottom:20px;right:20px;background:#0F172A;color:#FFF;padding:20px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);z-index:9999;font-family:Montserrat,sans-serif;font-size:12px;font-weight:bold;min-width:280px;";
    document.body.appendChild(statusDiv);

    const allPeriods = ["rentree-2026", "ete-2026"];
    const totalCount = (activeGyms.length + activeCoaches.length) * allPeriods.length;
    let currentCount = 0;
    const pct = () => Math.round((currentCount / totalCount) * 100);

    const updateStatus = (msg) => {
      statusDiv.innerHTML = `<div>${msg}</div><div style="margin-top:8px;background:#1e293b;border-radius:8px;height:6px;overflow:hidden;"><div style="background:linear-gradient(90deg,#38BDF8,#818CF8);height:100%;width:${pct()}%;transition:width 0.3s;"></div></div><div style="margin-top:5px;color:#94A3B8;font-size:10px;">Progression: ${currentCount}/${totalCount} (${pct()}%)</div>`;
    };

    const cleanSlot = (s) => s.replace(/\s+/g, '').replace('-', '/').toLowerCase();
    const matchTimeSlot = (slot1, slot2) => {
      if (!slot1 || !slot2) return false;
      return cleanSlot(slot1) === cleanSlot(slot2);
    };

    const parseTime = (s) => {
      const match = s.match(/(\d+)h(\d*)/);
      if (!match) return 0;
      return parseInt(match[1]) * 60 + (match[2] ? parseInt(match[2]) : 0);
    };
    const sortTimeSlots = (slots) => [...slots].sort((a, b) => parseTime(a) - parseTime(b));
    const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

    const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    for (const currentPeriod of allPeriods) {
      const periodLabel = currentPeriod === "rentree-2026" ? "Rentrée 2026" : "Été 2026";
      const periodFolder = zip.folder(currentPeriod);
      const gymFolder = periodFolder.folder("salles");
      const coachFolder = periodFolder.folder("coachs");

    // 1. Process Gyms
    for (const gym of activeGyms) {
      currentCount++;
      updateStatus(`📍 ${periodLabel} — Salle: ${gym.name}...`);

      const gymSessions = plannings.filter(c => c.salle === gym.id && c.period === currentPeriod);
      if (gymSessions.length === 0) continue;
      const computedSlots = sortTimeSlots(Array.from(new Set(gymSessions.map(c => c.timeSlot))));
      const timeSlots = computedSlots.length > 0 ? computedSlots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];
      const headerFontSize = gym.name.length > 18 ? "28px" : "40px";

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1000px;height:1000px;background:#0A0D1A;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;font-family:Montserrat,sans-serif;color:#FFF;";

      container.innerHTML = `
        <div style="position:relative;height:220px;width:100%;overflow:hidden;border-bottom:2px solid #020617;border-radius:16px;margin-bottom:16px;background:url('/header-bg.png') center/cover no-repeat;box-sizing:border-box;">
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent,#0A0D1A);opacity:0.95;"></div>
          <div style="position:absolute;inset:0;background-color:rgba(2,6,23,0.2);"></div>
          <div style="position:absolute;inset:0;padding:32px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <span style="font-size:20px;font-weight:900;letter-spacing:0.1em;color:rgba(255,255,255,0.9);">2026-2027</span>
              <img src="/logo.png" style="height:60px;object-fit:contain;" />
            </div>
            <h2 style="font-size:${headerFontSize};font-weight:900;text-align:center;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;color:#FFF;text-shadow:0 4px 6px rgba(0,0,0,0.3);">
              SALLE ${gym.name.toUpperCase()}
            </h2>
          </div>
        </div>
        <div style="flex-grow:1;display:flex;flex-direction:column;width:100%;box-sizing:border-box;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;">
            <div style="background-color:#121829;border:1px solid #1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;">Horaire</div>
            ${days.map(d => `<div style="background-color:#2A4D7E;border:1px solid #1e293b;text-align:center;padding:12px 0;border-radius:8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#FFF;">${d}</div>`).join('')}
          </div>
          <div style="flex-grow:1;display:grid;grid-template-rows:repeat(${timeSlots.length},minmax(0,1fr));gap:6px;">
            ${timeSlots.map(time => `
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:100%;">
                <div style="background-color:#121829;border:1px solid #0f172a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,0.8);text-align:center;letter-spacing:0.02em;">${time}</div>
                ${days.map(day => {
                  const course = gymSessions.find(c => c.day === day && matchTimeSlot(c.timeSlot, time));
                  if (!course || course.activity === "ACCES LIBRE") {
                    return `<div style="background-color:rgba(14,18,34,0.4);border:1px solid rgba(30,41,59,0.6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.1);text-align:center;padding:0 4px;">accès libre</div>`;
                  }
                  const bgCol = coachColors[course.coach.toUpperCase()] || "#475569";
                  return `
                    <div style="background-color:${bgCol};border:1px solid #020617;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.15);box-sizing:border-box;height:100%;">
                      <span style="font-size:9px;font-weight:900;color:#FFF;text-transform:uppercase;line-height:1.1;max-width:100%;word-break:break-all;">${course.activity}</span>
                      <span style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-top:4px;letter-spacing:0.05em;">${course.coach}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.body.appendChild(container);
      try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#0A0D1A" });
        const blob = await canvasToBlob(canvas);
        gymFolder.file(`planning-salle-${gym.id}-${period}.png`, blob);
      } catch (err) {
        console.error(`Error capturing gym ${gym.id}:`, err);
      } finally {
        document.body.removeChild(container);
      }
    }

    // 2. Process Coaches
    for (const coach of activeCoaches) {
      currentCount++;
      updateStatus(`🥊 ${periodLabel} — Coach: ${coach}...`);

      const coachSessions = plannings.filter(c => {
        const cn = c.coach.toUpperCase();
        const target = coach.toUpperCase();
        return (cn === target || cn.includes(target)) && c.period === currentPeriod;
      });
      
      // Skip coaches with no sessions in the current period
      if (coachSessions.length === 0) continue;

      const computedSlots = sortTimeSlots(Array.from(new Set(coachSessions.map(c => c.timeSlot))));
      const timeSlots = computedSlots.length > 0 ? computedSlots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1000px;height:1000px;background:#0A0D1A;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;font-family:Montserrat,sans-serif;color:#FFF;";

      container.innerHTML = `
        <div style="position:relative;height:220px;width:100%;overflow:hidden;border-bottom:2px solid #020617;border-radius:16px;margin-bottom:16px;background:url('/header-bg.png') center/cover no-repeat;box-sizing:border-box;">
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent,#0A0D1A);opacity:0.95;"></div>
          <div style="position:absolute;inset:0;background-color:rgba(2,6,23,0.2);"></div>
          <div style="position:absolute;inset:0;padding:32px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <span style="font-size:20px;font-weight:900;letter-spacing:0.1em;color:rgba(255,255,255,0.9);">2026-2027</span>
              <img src="/logo.png" style="height:60px;object-fit:contain;" />
            </div>
            <h2 style="font-size:40px;font-weight:900;text-align:center;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;color:#FFF;text-shadow:0 4px 6px rgba(0,0,0,0.3);">
              COACH ${coach.toUpperCase()}
            </h2>
          </div>
        </div>
        <div style="flex-grow:1;display:flex;flex-direction:column;width:100%;box-sizing:border-box;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;">
            <div style="background-color:#121829;border:1px solid #1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;">Horaire</div>
            ${days.map(d => `<div style="background-color:#2A4D7E;border:1px solid #1e293b;text-align:center;padding:12px 0;border-radius:8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#FFF;">${d}</div>`).join('')}
          </div>
          <div style="flex-grow:1;display:grid;grid-template-rows:repeat(${timeSlots.length},minmax(0,1fr));gap:6px;">
            ${timeSlots.map(time => `
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:100%;">
                <div style="background-color:#121829;border:1px solid #0f172a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,0.8);text-align:center;letter-spacing:0.02em;">${time}</div>
                ${days.map(day => {
                  const course = coachSessions.find(c => c.day === day && matchTimeSlot(c.timeSlot, time));
                  if (!course || course.activity === "ACCES LIBRE") {
                    return `<div style="background-color:rgba(14,18,34,0.4);border:1px solid rgba(30,41,59,0.6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.1);text-align:center;padding:0 4px;">accès libre</div>`;
                  }
                  const bgCol = coachColors[coach.toUpperCase()] || "#475569";
                  return `
                    <div style="background-color:${bgCol};border:1px solid #020617;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.15);box-sizing:border-box;height:100%;">
                      <span style="font-size:9px;font-weight:900;color:#FFF;text-transform:uppercase;line-height:1.1;max-width:100%;word-break:break-all;">${course.activity}</span>
                      <span style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-top:4px;letter-spacing:0.02em;">${getGymName(course.salle).toUpperCase()}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.body.appendChild(container);
      try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#0A0D1A" });
        const blob = await canvasToBlob(canvas);
        coachFolder.file(`planning-coach-${coach.toLowerCase()}-${period}.png`, blob);
      } catch (err) {
        console.error(`Error capturing coach ${coach}:`, err);
      } finally {
        document.body.removeChild(container);
      }
    }

    } // end of allPeriods loop

    // 3. Generate and download ZIP
    updateStatus("📦 Création du fichier ZIP...");
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `plannings-boxing-center-tous.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Error generating ZIP:", err);
      alert("Erreur lors de la génération du fichier ZIP.");
    }

    document.body.removeChild(statusDiv);
    alert("✅ Tous les visuels ont été regroupés dans un fichier ZIP et téléchargés avec succès !");
  };

  const getGymName = (gymId) => {
    return gyms.find((g) => g.id === gymId)?.name || gymId;
  };

  const getDayLabel = (day) => {
    const days = {
      lundi: "Lundi",
      mardi: "Mardi",
      mercredi: "Mercredi",
      jeudi: "Jeudi",
      vendredi: "Vendredi",
      samedi: "Samedi"
    };
    return days[day] || day;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentGymPlannings = plannings.filter(
    (c) => c.salle === selectedGym && c.period === period
  );

  // Extract list of all unique coaches from database
  const allCoaches = Array.from(
    new Set(plannings.map(c => c.coach.toUpperCase()).filter(c => c !== "ACCES LIBRE" && c !== "NON ASSIGNÉ"))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Boxing Center Logo"
              width={100}
              height={50}
              className="object-contain"
            />
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <h1 className="hidden sm:block text-sm font-black text-slate-900 uppercase tracking-widest">
              Administration
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Period Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
              <button
                onClick={() => setPeriod("rentree-2026")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                  period === "rentree-2026"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Rentrée 2026
              </button>
              <button
                onClick={() => setPeriod("ete-2026")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                  period === "ete-2026"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Été (Juil/Août)
              </button>
            </div>

            <button
              onClick={handleDownloadAllVisuals}
              className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
            >
              <Download size={12} />
              <span>Télécharger Tout</span>
            </button>

            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="shiny-btn px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-slate-900/10"
            >
              {isPublishing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 size={12} />
              )}
              <span>Diffuser</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-50 transition-all"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {/* Conflicts Alert Area */}
        <AnimatePresence>
          {conflicts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8"
            >
              <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
                <div className="flex gap-3 items-start">
                  <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-xs font-black text-red-800 uppercase tracking-wider">Alerte de conflits physiques !</h4>
                    <p className="text-[11px] text-red-600 mt-1">
                      {conflicts.length} coach{conflicts.length > 1 ? "s" : ""} affecté{conflicts.length > 1 ? "s" : ""} à plusieurs salles simultanément :
                    </p>
                    <ul className="list-disc pl-4 mt-2 text-[10px] text-red-700 font-bold uppercase space-y-1">
                      {conflicts.map((c, i) => (
                        <li key={i}>
                          {c.coach} &bull; {getDayLabel(c.day)} &bull; {c.timeSlot} ({c.gyms.join(" et ")})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab selector */}
        <div className="border-b border-slate-200 mb-8 flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("schedule-editor")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 ${
              activeTab === "schedule-editor" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Éditeur de Plannings</span>
            {activeTab === "schedule-editor" && (
              <motion.div layoutId="tab-underline-admin" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("color-editor")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 ${
              activeTab === "color-editor" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Nuancier des Coachs</span>
            {activeTab === "color-editor" && (
              <motion.div layoutId="tab-underline-admin" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("cover-requests")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
              activeTab === "cover-requests" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Bourse d'Échange</span>
            {coverRequests.length > 0 && (
              <span className="h-4 w-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-bold">
                {coverRequests.length}
              </span>
            )}
            {activeTab === "cover-requests" && (
              <motion.div layoutId="tab-underline-admin" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
        </div>

        {/* Tab content editor */}
        <AnimatePresence mode="wait">
          {activeTab === "schedule-editor" && (
            <motion.div
              key="schedule-editor-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Gym list buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {gyms.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGym(g.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all relative shrink-0 ${
                      selectedGym === g.id
                        ? "bg-slate-900 text-white shadow-md shadow-slate-950/10"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {/* Gym edit table */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase">
                      Éditeur — {getGymName(selectedGym)}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 font-semibold uppercase tracking-wider">
                      {period === "rentree-2026" ? "Rentrée 2026" : "Période d'Été"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddClassModal(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={14} />
                      <span>Ajouter un cours</span>
                    </button>
                    <button 
                      onClick={() => router.push(`/poster/${selectedGym}`)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <span>Visualiser Poster</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Jour</th>
                        <th className="py-3 px-4">Horaire</th>
                        <th className="py-3 px-4">Activité / Discipline</th>
                        <th className="py-3 px-4">Coach Assigné</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentGymPlannings.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-bold text-xs capitalize text-slate-800">
                            {getDayLabel(c.day)}
                          </td>
                          <td className="py-4 px-4 font-semibold text-xs text-slate-600">
                            {c.timeSlot}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border"
                                  style={{ 
                                    backgroundColor: coachColors[c.coach] ? coachColors[c.coach] + "15" : "#f1f5f9", 
                                    color: coachColors[c.coach] || "#475569", 
                                    borderColor: coachColors[c.coach] ? coachColors[c.coach] + "40" : "#cbd5e1" 
                                  }}>
                              {c.activity}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={c.coach}
                              onChange={(e) => handleChangeCoach(c.id, e.target.value)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-slate-900"
                            >
                              <option value="Non Assigné">Non Assigné</option>
                              <option value="ACCES LIBRE">ACCES LIBRE</option>
                              {allCoaches.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDeleteSlot(c.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "color-editor" && (
            <motion.div
              key="color-editor-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900 uppercase">Nuancier officiel des coachs</h3>
                  <p className="text-slate-500 text-xs mt-1">Configurez les couleurs des coachs pour la génération visuelle.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.keys(coachColors).map((coach) => (
                    <div key={coach} className="border border-slate-150 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-950 uppercase tracking-wide">{coach}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {coachColors[coach]}
                        </span>
                      </div>
                      <input
                        type="color"
                        value={coachColors[coach]}
                        onChange={(e) => handleChangeColor(coach, e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 overflow-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cover-requests" && (
            <motion.div
              key="cover-requests-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900 uppercase">Demandes actives de remplacement</h3>
                  <p className="text-slate-500 text-xs mt-1">Approuvez les demandes d'échange soumises par les coachs.</p>
                </div>

                <div className="space-y-4">
                  {coverRequests.length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center uppercase tracking-wider font-bold">Aucune demande en attente</p>
                  ) : (
                    coverRequests.map((req) => (
                      <div key={req.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 bg-slate-150 px-2 py-1 rounded-lg">
                              {getGymName(req.gym)}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 capitalize">
                              {req.day} &bull; {req.timeSlot}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-955 mt-2 uppercase flex items-center gap-1.5">
                            <span>{req.activity}</span>
                            <span className="text-xs text-slate-400 font-medium">demandé par {req.coach}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <input
                            type="text"
                            placeholder="Remplaçant..."
                            id={`replacer-${req.id}`}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 placeholder-slate-400 w-full md:w-36 focus:outline-none focus:border-slate-900"
                          />
                          <button
                            onClick={() => {
                              const replacerInput = document.getElementById(`replacer-${req.id}`);
                              handleApproveCover(req, replacerInput?.value);
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-colors"
                          >
                            Valider
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showAddClassModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6">Ajouter un cours</h3>

              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Jour</label>
                  <select
                    value={newClass.day}
                    onChange={(e) => setNewClass({ ...newClass, day: e.target.value })}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:outline-none"
                  >
                    <option value="lundi">Lundi</option>
                    <option value="mardi">Mardi</option>
                    <option value="mercredi">Mercredi</option>
                    <option value="jeudi">Jeudi</option>
                    <option value="vendredi">Vendredi</option>
                    <option value="samedi">Samedi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Horaire</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 12h40-13h20"
                    value={newClass.timeSlot}
                    onChange={(e) => setNewClass({ ...newClass, timeSlot: e.target.value })}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Discipline / Activité</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BOXE ANGLAISE"
                    value={newClass.activity}
                    onChange={(e) => setNewClass({ ...newClass, activity: e.target.value })}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Coach</label>
                  <select
                    value={newClass.coach}
                    onChange={(e) => setNewClass({ ...newClass, coach: e.target.value })}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:outline-none"
                  >
                    <option value="Non Assigné">Non Assigné</option>
                    {allCoaches.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end mt-8">
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(false)}
                    className="px-4 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase text-slate-800 tracking-wider"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
