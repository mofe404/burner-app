"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Users, ShieldAlert, Search, PlusCircle, LogOut, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
// renamed to NextImage to avoid shadowing browser Image constructor
const NextImage = Image;

export default function HostDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState<{ id: string; jid: string; name: string; imageUrl?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const [accounts, setAccounts] = useState<{ sessionId: string; phone: string; linkedAt: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const currentId = localStorage.getItem("anon_session_id");
    setActiveSessionId(currentId);
    
    const stored = localStorage.getItem("burner_accounts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure backward compatibility: convert 'id' to 'sessionId' for older records if mapped weirdly
        const mappedAccounts = parsed.map((a: any) => ({
          sessionId: a.sessionId || a.id,
          phone: a.phone,
          linkedAt: a.linkedAt
        }));
        setAccounts(mappedAccounts);
        
        if (currentId && !mappedAccounts.some((a: any) => a.sessionId === currentId)) {
          const fresh = { sessionId: currentId, phone: "Current Session", linkedAt: new Date().toISOString() };
          localStorage.setItem("burner_accounts", JSON.stringify([fresh, ...mappedAccounts]));
          setAccounts([fresh, ...mappedAccounts]);
        }
      } catch (e) { console.error(e); }
    } else if (currentId) {
      const fresh = { sessionId: currentId, phone: "Current Session", linkedAt: new Date().toISOString() };
      localStorage.setItem("burner_accounts", JSON.stringify([fresh]));
      setAccounts([fresh]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchGroups = async () => {
      if (!activeSessionId) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/groups?sessionId=${activeSessionId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setGroups(Array.isArray(data) ? data : data.groups || []);
        } else {
          if (isMounted) setGroups([]);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (activeSessionId) {
       fetchGroups();
    }
    return () => { isMounted = false; };
  }, [activeSessionId]);

  const handleCopy = (id: string) => {
    const link = `${window.location.origin}/g/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => console.error(err));
  };

  const handleLogout = (sessionIdToRemove: string) => {
    const updatedAccounts = accounts.filter(acc => acc.sessionId !== sessionIdToRemove);
    localStorage.setItem("burner_accounts", JSON.stringify(updatedAccounts));
    setAccounts(updatedAccounts);
    
    if (activeSessionId === sessionIdToRemove) {
      // If we removed the active one, pick the next available or clear it
      const nextActive = updatedAccounts.length > 0 ? updatedAccounts[0].sessionId : null;
      if (nextActive) {
        localStorage.setItem("anon_session_id", nextActive);
        setActiveSessionId(nextActive);
      } else {
        localStorage.removeItem("anon_session_id");
        setActiveSessionId(null);
        setGroups([]);
      }
    }
  };

  const switchSession = (sessionId: string) => {
    localStorage.setItem("anon_session_id", sessionId);
    setActiveSessionId(sessionId);
    setLoading(true);
    setGroups([]);
    setSearchQuery("");
    setVisibleCount(5);
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
            Multi-Account Control Center
          </p>
        </div>

        {accounts.length === 0 ? (
          /* State 1: No Accounts UI */
          <div className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-12 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/5 shadow-inner mb-6 relative">
               <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full"></div>
               <Smartphone className="w-16 h-16 text-emerald-400 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-4">Initialize First Node</h2>
            <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed font-medium">
               No active WhatsApp connections found in your deployment registry. Link a device to deploy burner groups.
            </p>
            <button 
              onClick={() => router.push("/link")}
              className="group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] w-full sm:w-auto"
            >
              <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="tracking-wide">Link WhatsApp Account</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            </button>
          </div>
        ) : (
          /* State 2: Has Accounts UI */
          <div className="w-full flex flex-col space-y-6">
             
            {/* Account Management Section */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Active Nodes
                </h2>
                <button 
                  onClick={() => router.push("/link")}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  Add Another Account
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accounts.map((acc) => (
                  <div 
                    key={acc.sessionId} 
                    onClick={() => switchSession(acc.sessionId)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all duration-300 group relative flex items-center justify-between overflow-hidden ${
                      activeSessionId === acc.sessionId 
                        ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' 
                        : 'bg-zinc-950/60 border-white/5 hover:border-white/10 hover:bg-zinc-900/50'
                    }`}
                  >
                    {activeSessionId === acc.sessionId && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${activeSessionId === acc.sessionId ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                        <Smartphone className={`w-5 h-5 ${activeSessionId === acc.sessionId ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm tracking-widest ${activeSessionId === acc.sessionId ? 'text-white' : 'text-zinc-300'}`}>{acc.phone}</h3>
                        <p className="text-zinc-600 text-[10px] uppercase font-mono mt-1">ID: {acc.sessionId.substring(0,8)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleLogout(acc.sessionId);
                         }}
                         className="p-2 rounded-lg bg-red-500/10 text-red-500/50 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                         title="Unlink Account"
                       >
                         <LogOut className="w-4 h-4" />
                       </button>
                       <div className={`w-2.5 h-2.5 rounded-full border-2 ${activeSessionId === acc.sessionId ? 'bg-emerald-400 border-emerald-400/20 animate-pulse ring-4 ring-emerald-500/10' : 'bg-zinc-800 border-zinc-700'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Frame (Groups) */}
            <div className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
              
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h2 className="text-xl font-semibold flex items-center gap-3 text-white">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Active Targets Payload
                </h2>
                <div className="flex items-center gap-3">
                  {loading ? (
                    <div className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold tracking-wider animate-pulse flex items-center gap-2">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div> SYNCING
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      {groups.length} Targets
                    </div>
                  )}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search active targets in selected node..." 
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
                <div className="text-center py-12 px-4 rounded-2xl bg-zinc-950/50 border border-white/5 border-dashed flex flex-col items-center">
                  <ShieldAlert className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-medium tracking-wide">No viable targets match your search criteria.</p>
                  <p className="text-zinc-600 text-xs mt-2">Make sure this account has initiated chats recently.</p>
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
                              <NextImage 
                                src={group.imageUrl} 
                                alt={group.name} 
                                width={48}
                                height={48}
                                unoptimized
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
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 text-center">
            <p className="text-zinc-600 text-xs font-mono tracking-widest">ENCRYPTED END-TO-END // [BURNER:GODMODE]</p>
        </div>
      </div>
    </div>
  );
}