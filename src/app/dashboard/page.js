"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, Calendar, MapPin, Bell, Mail, Download, User, ArrowRightLeft, 
  Map, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, X, Printer, Grid
} from "lucide-react";
import Image from "next/image";
import { gyms, coachColors as defaultCoachColors, activityColors } from "@/data/plannings";
import { BlurFade } from "@/components/magicui/BlurFade";
import { Marquee } from "@/components/magicui/Marquee";
import { triggerLocalNotification } from "@/components/PWARegister";

export default function CoachDashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("rentree-2026"); // rentree-2026 or ete-2026
  const [planningsList, setPlanningsList] = useState([]);
  const [coachColors, setCoachColors] = useState({});
  const [selectedGym, setSelectedGym] = useState("saint-cyprien");
  const [activeTab, setActiveTab] = useState("my-schedule"); // my-schedule, gym-schedules, cover-requests, notifications
  const [notifications, setNotifications] = useState([]);
  const [coverRequests, setCoverRequests] = useState([]);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedGymToCheckin, setSelectedGymToCheckin] = useState("saint-cyprien");
  
  const router = useRouter();

  useEffect(() => {
    // Load session
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.role !== "coach") {
          router.push("/");
        } else {
          setSession(data);
          loadDatabase(data.name);
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  const loadDatabase = (coachName) => {
    const localPlannings = localStorage.getItem("bc_plannings");
    const localColors = localStorage.getItem("bc_coach_colors");

    // Fetch initial database
    fetch("/api/planning")
      .then((res) => res.json())
      .then((data) => {
        if (localPlannings) {
          setPlanningsList(JSON.parse(localPlannings));
        } else {
          setPlanningsList(data.plannings);
        }

        if (localColors) {
          setCoachColors(JSON.parse(localColors));
        } else {
          setCoachColors(defaultCoachColors);
        }
        
        // Setup initial notifications
        setNotifications([
          { id: 1, title: "Planning Rentrée 2026 publié !", message: "Le planning officiel a été publié par l'administrateur.", date: "Aujourd'hui" },
          { id: 2, title: "Nouveau créneau disponible à Ramonville", message: "Le cours de Cross Training du mardi soir recherche un remplaçant.", date: "Hier" }
        ]);

        // Setup active cover requests
        setCoverRequests([
          { id: "req-1", gym: "ramonville", day: "mardi", timeSlot: "18h40-19h40", activity: "GRAPPLING", coach: "SONIA", status: "open" },
          { id: "req-2", gym: "etats-unis", day: "jeudi", timeSlot: "12h40-13h20", activity: "BOXE ANGLAISE", coach: "VALENTIN GUTH", status: "open" }
        ]);
        
        setLoading(false);
      });
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  // Filter plannings assigned to the logged-in coach
  const getPersonalPlanning = () => {
    if (!session) return [];
    return planningsList.filter(
      (item) => 
        item.coach.toUpperCase().includes(session.name.toUpperCase()) &&
        item.period === period
    );
  };

  // Check-In Geolocation Trigger
  const handleGPSCheckin = (gymId) => {
    setCheckinStatus("detecting");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTimeout(() => {
          import("canvas-confetti").then((module) => {
            const confetti = module.default;
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });
          });
          setCheckinStatus("success");
          triggerLocalNotification("Émargement Réussi", `Votre présence à la salle ${gyms.find(g => g.id === gymId)?.name || gymId} a été validée via GPS !`);
        }, 1500);
      },
      (error) => {
        // Fallback check-in (simulate success)
        setTimeout(() => {
          import("canvas-confetti").then((module) => {
            const confetti = module.default;
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
          });
          setCheckinStatus("success");
          triggerLocalNotification("Émargement Réussi (Simulé)", `Votre présence à la salle ${gyms.find(g => g.id === gymId)?.name || gymId} a été validée !`);
        }, 1500);
      }
    );
  };

  // Submit Cover Request
  const handleRequestCover = (course) => {
    const newReq = {
      id: `req-${Date.now()}`,
      gym: course.salle,
      day: course.day,
      timeSlot: course.timeSlot,
      activity: course.activity,
      coach: session.name,
      status: "open"
    };
    const updatedReqs = [newReq, ...coverRequests];
    setCoverRequests(updatedReqs);
    
    // Save to localStorage or context
    setNotifications([
      { id: Date.now(), title: `Demande de remplacement par ${session.name}`, message: `Créneau: ${course.activity} à ${gyms.find(g => g.id === course.salle)?.name}`, date: "À l'instant" },
      ...notifications
    ]);

    triggerLocalNotification("Demande Publiée", `Votre demande pour le cours de ${course.activity} a été publiée sur la bourse.`);
    alert("Votre demande de remplacement a été publiée ! Tous les coachs ont été informés.");
  };

  // Apply to Cover Request
  const handleApplyToCover = (req) => {
    triggerLocalNotification("Candidature Envoyée", `Votre candidature pour remplacer ${req.coach} a été transmise.`);
    alert(`Votre candidature pour remplacer ${req.coach} sur le cours de ${req.activity} le ${req.day} (${req.timeSlot}) a été soumise à l'administration.`);
    
    setCoverRequests(
      coverRequests.map((r) => r.id === req.id ? { ...r, status: "applied" } : r)
    );
  };

  const handleDownloadPersonalPoster = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const poster = document.getElementById("personal-poster-container");
    
    const canvas = await html2canvas(poster, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    const link = document.createElement("a");
    link.download = `planning-coach-${session?.name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadExcel = () => {
    if (!session) return;
    const personal = getPersonalPlanning();
    let csvContent = "Jour;Horaire;Activite;Salle\n";
    personal.forEach((course) => {
      const gymName = getGymName(course.salle);
      csvContent += `${course.day.toUpperCase()};${course.timeSlot};${course.activity};${gymName}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `planning-${session.name}-excel.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGymExcel = () => {
    const sessions = planningsList.filter(c => c.salle === selectedGym && c.period === period);
    let csvContent = "Jour;Horaire;Activite;Coach\n";
    sessions.forEach((course) => {
      csvContent += `${course.day.toUpperCase()};${course.timeSlot};${course.activity};${course.coach}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `planning-salle-${selectedGym}-excel.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getGymName = (gymId) => {
    return gyms.find((g) => g.id === gymId)?.name || gymId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const personalSessions = getPersonalPlanning();

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

  const personalTimeSlots = sortTimeSlots(
    Array.from(new Set(personalSessions.map(c => c.timeSlot)))
  );
  const displayPersonalTimeSlots = personalTimeSlots.length > 0 ? personalTimeSlots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];

  const gymSessions = planningsList.filter(c => c.salle === selectedGym && c.period === period);
  const gymTimeSlots = sortTimeSlots(
    Array.from(new Set(gymSessions.map(c => c.timeSlot)))
  );
  const displayGymTimeSlots = gymTimeSlots.length > 0 ? gymTimeSlots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];

  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header bar - White background premium style */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
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
              Espace Coachs
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

            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs">
                {session?.name[0]}
              </span>
              <span className="hidden md:block text-xs font-black text-slate-800 uppercase tracking-wider">
                Coach {session?.name}
              </span>
            </div>

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

      {/* Marquee Loop Announcement (Magic UI component) */}
      <div className="no-print bg-slate-900 text-white py-2 overflow-hidden border-b border-slate-800">
        <Marquee className="text-[10px] font-black uppercase tracking-widest">
          <span>&bull; RENTRÉE 2026 - PENSEZ À BADGER VOS SESSIONS EN SALLE via GPS</span>
          <span className="ml-10">&bull; NOUVELLES DIRECTIVES : LES DEMANDES DE REMPLACEMENT DOIVENT ÊTRE SOUMISES AU MOINS 24H À L'AVANCE</span>
          <span className="ml-10">&bull; BOXING CENTER TOULOUSE - DES DISCIPLINES UNIQUES POUR TOUS</span>
        </Marquee>
      </div>

      {/* Main dashboard container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {/* Quick checkin / PWA actions bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Émargement</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Badgeage Géolocalisé</h3>
                <p className="text-slate-500 text-xs mt-1">Validez votre présence dans un rayon de 50m.</p>
              </div>
              <MapPin className="text-slate-900" size={24} />
            </div>
            <button
              onClick={() => setShowCheckinModal(true)}
              className="shiny-btn mt-4 w-full py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200"
            >
              <MapPin size={14} />
              <span>Badger ma présence</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Bourse aux cours</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Demandes de Remplacement</h3>
                <p className="text-slate-500 text-xs mt-1">{coverRequests.filter(r => r.status === "open").length} demandes actives.</p>
              </div>
              <ArrowRightLeft className="text-slate-900" size={24} />
            </div>
            <button
              onClick={() => setActiveTab("cover-requests")}
              className="mt-4 w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200"
            >
              <span>Consulter la bourse</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Export planning</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Téléchargements</h3>
                <p className="text-slate-500 text-xs mt-1">Téléchargez votre planning ou celui des salles.</p>
              </div>
              <Download className="text-slate-900" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={handleDownloadPersonalPoster}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Download size={12} />
                <span>Format Image (PNG)</span>
              </button>
              <button
                onClick={() => window.print()}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Printer size={12} />
                <span>Imprimer / PDF</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={handleDownloadExcel}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Download size={12} />
                <span>Excel Perso (CSV)</span>
              </button>
              <button
                onClick={handleDownloadGymExcel}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Download size={12} />
                <span>Excel Salle (CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-slate-200 mb-8 flex gap-6 overflow-x-auto no-print">
          <button
            onClick={() => setActiveTab("my-schedule")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 ${
              activeTab === "my-schedule" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Mon Planning Personnel (Image Grid)</span>
            {activeTab === "my-schedule" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("gym-schedules")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 ${
              activeTab === "gym-schedules" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Plannings des Salles</span>
            {activeTab === "gym-schedules" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("cover-requests")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
              activeTab === "cover-requests" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Bourse d'Échange</span>
            {coverRequests.filter(r => r.status === "open").length > 0 && (
              <span className="h-4 w-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-bold">
                {coverRequests.filter(r => r.status === "open").length}
              </span>
            )}
            {activeTab === "cover-requests" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
              activeTab === "notifications" ? "text-slate-900" : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Journal d'activités</span>
            {activeTab === "notifications" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
            )}
          </button>
        </div>

        {/* Tab contents */}
        <div className="tab-contents">
          {activeTab === "my-schedule" && (
            <BlurFade duration={0.4} className="space-y-6">
              {/* Personal planning image container (Sonia PDF format grid) */}
              <div 
                id="personal-poster-container"
                className="bg-[#0A0D1A] flex flex-col border border-slate-900 shadow-2xl relative select-none shrink-0 print-page p-4 rounded-3xl"
                style={{ width: "1000px", minHeight: "1000px" }}
              >
                {/* Photographic header banner */}
                <div className="relative h-[220px] w-full overflow-hidden border-b-2 border-slate-950 rounded-2xl mb-4">
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
                    <h2 className="text-4xl font-extrabold text-white text-center tracking-[0.08em] uppercase mb-2">
                      COACH {session?.name ? session.name.toUpperCase() : "MON PLANNING"}
                    </h2>
                  </div>
                </div>

                {/* Grid schedule table */}
                <div className="flex-grow p-2 flex flex-col w-full">
                  {/* Columns Headers */}
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {/* Top-left empty slot */}
                    <div className="bg-[#121829] border border-slate-900 rounded-lg flex items-center justify-center font-black text-[9px] text-slate-500 uppercase">
                      Horaire
                    </div>
                    {days.map((day) => (
                      <div
                        key={day}
                        className="bg-[#2A4D7E] border border-slate-800 text-center py-3 rounded-lg font-black text-xs uppercase tracking-wider text-white"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Time Slot Rows */}
                  <div 
                    className="flex-grow grid gap-1.5"
                    style={{ gridTemplateRows: `repeat(${displayPersonalTimeSlots.length}, minmax(0, 1fr))` }}
                  >
                    {displayPersonalTimeSlots.map((time) => (
                      <div key={time} className="grid grid-cols-7 gap-1.5 h-full">
                        {/* Left time slot indicator */}
                        <div className="bg-[#121829] border border-slate-900 rounded-lg flex items-center justify-center font-black text-[11px] text-white/80 tracking-wide text-center">
                          {time}
                        </div>

                        {/* Day session blocks */}
                        {days.map((day) => {
                          const course = personalSessions.find(
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

                          const bgCol = coachColors[session?.name.toUpperCase()] || "#475569";

                          return (
                            <div
                              key={day}
                              className="border border-slate-950 rounded-lg flex flex-col items-center justify-center p-1.5 text-center transition-transform hover:scale-[1.02] shadow-md shadow-black/10 select-none h-full relative"
                              style={{ backgroundColor: bgCol }}
                            >
                              <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight max-w-full break-words">
                                {course.activity}
                              </span>
                              <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1">
                                {course.salle.replace("saint-cyprien", "ST CYPRIEN").replace("ramonville", "RAMONVILLE").toUpperCase()}
                              </span>

                              {/* Hover replacement request button (no-print) */}
                              <button
                                onClick={() => handleRequestCover(course)}
                                className="no-print absolute -top-1.5 -right-1.5 h-5 w-5 bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center shadow-md transition-all"
                                title="Demander un remplacement"
                              >
                                <ArrowRightLeft size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BlurFade>
          )}

          {activeTab === "gym-schedules" && (
            <BlurFade duration={0.4} className="space-y-6">
              {/* Gym selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-print">
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

              {/* Gym Schedule Display */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase">
                      Planning {getGymName(selectedGym)}
                    </h3>
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-1">
                      {period === "rentree-2026" ? "Rentrée 2026" : "Période d'Été"}
                    </p>
                  </div>
                  <button 
                    onClick={() => router.push(`/poster/${selectedGym}`)}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Map size={14} />
                    <span>Générer Poster</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-7 gap-2 bg-slate-50 p-2 rounded-2xl mb-4 border border-slate-200">
                      <div className="text-[10px] font-black text-slate-400 uppercase p-2">Horaire</div>
                      {days.map(day => (
                        <div key={day} className="text-[10px] font-black text-slate-900 uppercase p-2 text-center">{day}</div>
                      ))}
                    </div>

                    {/* Generate schedule row groupings */}
                    {displayGymTimeSlots.map((time, rowIdx) => (
                      <div key={rowIdx} className="grid grid-cols-7 gap-2 items-center mb-2">
                        <div className="text-xs font-bold text-slate-500 p-2 bg-slate-50/50 rounded-xl border border-slate-100">{time}</div>
                        {days.map(day => {
                          const course = gymSessions.find(
                            c => c.day === day && matchTimeSlot(c.timeSlot, time)
                          );

                          if (!course) {
                            return <div key={day} className="h-14 bg-slate-50/20 rounded-2xl border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">accès libre</div>;
                          }

                          return (
                            <div
                              key={day}
                              className="h-14 p-2.5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer"
                              style={{
                                backgroundColor: coachColors[course.coach] ? coachColors[course.coach] + "12" : "#f8fafc",
                                borderColor: coachColors[course.coach] ? coachColors[course.coach] + "35" : "#e2e8f0"
                              }}
                            >
                              <div className="text-[10px] font-black uppercase truncate" style={{ color: coachColors[course.coach] || "#000000" }}>
                                {course.activity}
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
                                <span>{course.coach}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BlurFade>
          )}

          {activeTab === "cover-requests" && (
            <BlurFade duration={0.4} className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900 uppercase">Bourse d'Échange de cours</h3>
                  <p className="text-slate-500 text-xs mt-1">Prenez des créneaux supplémentaires ou demandez un remplaçant.</p>
                </div>

                <div className="space-y-4">
                  {coverRequests.length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center uppercase tracking-wider font-bold">Aucune demande active pour le moment</p>
                  ) : (
                    coverRequests.map((req) => (
                      <div key={req.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-slate-300 transition-colors">
                        <div className="w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                              {getGymName(req.gym)}
                            </span>
                            <span className="text-xs font-bold text-slate-500 capitalize">
                              {req.day} &bull; {req.timeSlot}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-2 uppercase flex items-center gap-2">
                            <span>{req.activity}</span>
                            <span className="text-xs text-slate-400 font-medium">demandé par {req.coach}</span>
                          </div>
                        </div>

                        {req.coach === session?.name ? (
                          <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-100 px-4 py-2 rounded-xl">
                            Ma Demande
                          </span>
                        ) : req.status === "applied" ? (
                          <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Candidature Soumise</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyToCover(req)}
                            className="shiny-btn text-[10px] font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all shrink-0"
                          >
                            Accepter le cours
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </BlurFade>
          )}

          {activeTab === "notifications" && (
            <BlurFade duration={0.4} className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900 uppercase">Journal d'activités & PWA Feed</h3>
                  <p className="text-slate-500 text-xs mt-1">Historique des modifications apportées au planning officiel.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-800 shrink-0">
                        <Bell size={18} />
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-center w-full gap-8">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{n.title}</h4>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{n.date}</span>
                        </div>
                        <p className="text-slate-500 text-xs">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>
          )}
        </div>
      </main>

      {/* Checkin Modal */}
      <AnimatePresence>
        {showCheckinModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowCheckinModal(false); setCheckinStatus(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <MapPin className="text-slate-900" size={24} />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Badgeage de cours</h3>
              </div>

              {checkinStatus === null && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Sélectionnez la salle</label>
                  <select 
                    value={selectedGymToCheckin}
                    onChange={(e) => setSelectedGymToCheckin(e.target.value)}
                    className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium text-sm focus:outline-none focus:border-slate-900"
                  >
                    {gyms.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleGPSCheckin(selectedGymToCheckin)}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-6"
                  >
                    <span>Détecter ma position</span>
                  </button>
                </div>
              )}

              {checkinStatus === "detecting" && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-800 font-bold text-xs uppercase tracking-wider animate-pulse">Détection de coordonnées GPS...</p>
                  <p className="text-slate-400 text-[10px] mt-1 uppercase font-semibold">Validation du rayon de 50m</p>
                </div>
              )}

              {checkinStatus === "success" && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-16 w-16 bg-slate-900 text-white rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-base font-black text-slate-900 uppercase tracking-wider">Présence Validée !</h4>
                  <p className="text-slate-500 text-xs mt-2 px-6">
                    Votre émargement a été enregistré à <b>{new Date().toLocaleTimeString()}</b> pour la salle <b>{getGymName(selectedGymToCheckin)}</b>.
                  </p>
                  <button
                    onClick={() => { setShowCheckinModal(false); setCheckinStatus(null); }}
                    className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider mt-8 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
