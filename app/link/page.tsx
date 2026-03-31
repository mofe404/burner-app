"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Smartphone, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WORKER_URL } from "@/lib/constants";

export default function LinkDevicePage() {
  const [mounted, setMounted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPairingCode(null);

    // Clean phone number: remove spaces, dashes, parentheses
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
    
    // Simple validation: must start with + and have at least 10 digits
    if (!cleanNumber.startsWith("+") || cleanNumber.length < 10) {
      setError("Please enter a valid phone number with country code (e.g., +234...)");
      setLoading(false);
      return;
    }

    // Generate a random session ID for this onboarding flow
    const sessionId = `anon_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const response = await fetch(`${WORKER_URL}/api/sessions/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanNumber, sessionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPairingCode(data.code);
        // Persist the session ID for this user/device
        localStorage.setItem("anon_session_id", sessionId);
      } else {
        setError(data.error || data.message || "Failed to generate pairing code.");
      }
    } catch (err) {
      console.error("Link Request Failed:", err);
      setError("Worker Offline: Ensure the backend daemon is running on port 4000.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-4">
      {/* Background layer */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/80 to-zinc-950 pointer-events-none"></div>
      
      {/* Glowing orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 opacity-50 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
           <Link href="/" className="mb-6 flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors group">
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
             <span className="text-xs font-bold uppercase tracking-widest">Back to Terminal</span>
           </Link>
          
          <div className="p-3 mb-6 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Smartphone className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">LINK DEVICE</h1>
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Generate Pairing Protocol</p>
        </div>

        {/* Form Frame */}
        <div className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
          
          {!pairingCode ? (
            <form onSubmit={handleGenerateCode} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">
                  WhatsApp Phone Number
                </label>
                <input 
                  type="text" 
                  placeholder="+234 800 000 0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all duration-300 font-mono"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full group relative overflow-hidden flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Negotiating Handshake...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Generate Pairing Code</span>
                  </>
                )}
              </button>
              
              <p className="text-zinc-600 text-[10px] text-center uppercase tracking-widest font-bold">
                Meta Secure Pairing Protocol v2.4
              </p>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
               <div className="w-full py-12 bg-zinc-950/80 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center shadow-[inset_0_0_40px_rgba(16,185,129,0.05)] mb-6">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Enter this code on your device</p>
                  <div className="text-5xl sm:text-6xl font-black font-mono tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    {pairingCode}
                  </div>
               </div>
               
               <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Open WhatsApp &rsaquo; Linked Devices &rsaquo; Link a Device &rsaquo; <b>Link with phone number instead</b>
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <Link 
                      href="/"
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-300"
                    >
                      <ShieldCheck className="w-5 h-4" />
                      Continue to Dashboard
                    </Link>

                    <button 
                      onClick={() => setPairingCode(null)}
                      className="text-zinc-600 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                      Reset Handshake
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900 border border-white/5 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Daemon Status: Active on Port 4000</p>
        </div>
      </div>
    </div>
  );
}
