"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Users, ShieldAlert, Search, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HostDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState<{ id: string; jid: string; name: string; imageUrl?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchGroups = async () => {
      try {
        const sessionId = localStorage.getItem("anon_session_id");
        if (!sessionId) {
          router.push("/link");
          return;
        }

        const res = await fetch(`/api/groups?sessionId=${sessionId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setGroups(Array.isArray(data) ? data : data.groups || []);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchGroups();
    return () => { isMounted = false; };
  }, []);

  const handleCopy = (id: string) => {
    const link = `${window.location.origin}/g/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => console.error(err));
  };

  if (!mounted) return null;

  const filteredGroups = groups.filter(group => 
    (group.name || "Unknown Target").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const displayedGroups = filteredGroups.slice(0, visibleCount);

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background layer */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/80 to-zinc-950 pointer-events-none"></div>
      
      {/* Top glowing orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 opacity-50 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        {/* Header */}
        <div className="mb-12 text-center group">
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-500">
            <ShieldAlert className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
            Burner <span className="text-emerald-400">GODMODE</span>
          </h1>
          <p className="mt-4 text-zinc-400 text-sm sm:text-base font-medium uppercase tracking-widest">
            Secure Deployment Terminal Interface
          </p>
        </div>

        {/* Dashboard Frame */}
        <div className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <h2 className="text-xl font-semibold flex items-center gap-3 text-white">
              <Users className="w-5 h-5 text-emerald-400" />
              Active Targets Payload
            </h2>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider animate-pulse border border-emerald-500/20">
              {groups.length} ONLINE
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search targets..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(5);
                }}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all duration-300"
              />
            </div>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
               <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
               <p className="text-zinc-500 text-sm font-medium animate-pulse">Establishing Secure Connection...</p>
             </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-zinc-950/50 border border-white/5 border-dashed">
              <p className="text-zinc-400 font-medium tracking-wide">No viable targets match your search.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {displayedGroups.map((group, index) => (
                  <div
                    key={index}
                    className="group relative flex items-center justify-between bg-zinc-950/50 hover:bg-zinc-800/50 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 shrink-0">
                        {group.imageUrl ? (
                          <img 
                            src={group.imageUrl} 
                            alt={group.name} 
                            className="w-full h-full rounded-full object-cover border border-white/10 shadow-lg"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border border-white/10 shadow-inner">
                            <Users className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-zinc-950 rounded-full border border-white/10 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
                          {group.name || "Unknown Target"}
                        </span>
                        <span className="text-xs text-zinc-600 font-mono mt-1 blur-sm group-hover:blur-none transition-all duration-300 cursor-default">
                          ID: {group.jid.substring(0, 15)}...
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCopy(group.id)}
                      className={`relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 shrink-0 ${
                        copiedId === group.id 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 border'
                          : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
                      }`}
                    >
                      {copiedId === group.id ? (
                        <Check className="w-4 h-4 scale-110" />
                      ) : (
                        <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      )}
                      {copiedId === group.id ? "Secured" : "Clone URL"}
                    </button>
                  </div>
                ))}
              </div>
              
              {visibleCount < filteredGroups.length && (
                <div className="mt-6 flex justify-center pb-2">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900/50 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 text-sm font-medium group shadow-inner"
                  >
                    <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Load More Targets ({filteredGroups.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
            <p className="text-zinc-600 text-xs font-mono tracking-widest">ENCRYPTED END-TO-END // [BURNER:GODMODE]</p>
        </div>
      </div>
    </div>
  );
}