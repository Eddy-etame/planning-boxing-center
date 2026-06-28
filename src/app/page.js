"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ShieldAlert, ArrowRight, Activity, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Meteors } from "@/components/magicui/Meteors";
import { BlurFade } from "@/components/magicui/BlurFade";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white px-4 overflow-hidden">
      {/* Decorative backdrop grid - Premium white grid aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

      {/* Magic UI Meteors flying in the background */}
      <Meteors number={30} className="opacity-40" />

      {/* Floating abstract decorative elements (Boxing Center brand colors) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-slate-900/5 blur-3xl" />

      <BlurFade duration={0.5} yOffset={20} className="w-full max-w-md z-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-100 relative overflow-hidden">
          {/* Subtle top border bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-yellow-500 to-slate-900" />
          
          <div className="flex flex-col items-center mb-8 mt-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="mb-4"
            >
              <Image
                src="/logo.png"
                alt="Boxing Center Logo"
                width={140}
                height={70}
                priority
                className="object-contain"
              />
            </motion.div>
            
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-800 text-[10px] font-black uppercase tracking-widest mb-3">
              <Activity size={10} className="animate-pulse text-yellow-500" />
              <span>Session Interne</span>
            </div>
            
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              PORTAIL DE GESTION
            </h2>
            <p className="text-slate-500 text-[10px] text-center mt-1 uppercase tracking-widest font-bold">
              Saisissez votre mot de passe pour continuer
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">
                Mot de passe
              </label>
              <div className="relative rounded-2xl transition-all duration-300">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <KeyRound size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Ex: dadi2026@BC!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-2 p-4 bg-red-50/50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold"
                >
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="shiny-btn w-full py-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-all duration-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Connexion</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Boxing Center Toulouse &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
