"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Lock, Send, ShieldCheck, AlertTriangle, Image as ImageIcon, Mic, MicOff, X, AudioWaveform } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { applyPitchShift } from "@/lib/audioUtils";

const VOICE_PROFILES = [
  { id: 'natural', name: 'Natural', rate: 1.0, icon: '👤' },
  { id: 'deep', name: 'Deep', rate: 0.65, icon: '🌑' },
  { id: 'titan', name: 'Titan', rate: 0.45, icon: '🐲' },
  { id: 'chipmunk', name: 'Chipmunk', rate: 1.45, icon: '🐿️' },
  { id: 'alien', name: 'Alien', rate: 0.75, icon: '👽' }
];

export default function PublicDropzone() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: "" });
  const [mounted, setMounted] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(VOICE_PROFILES[1]); // Default to Deep

  useEffect(() => {
    setMounted(true);
  }, []);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatus({ type: 'error', text: 'Image exceeds 5MB limit.' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAudioBlob(null);
      setAudioPreview(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          if (selectedProfile.id === 'natural') {
            setAudioBlob(rawBlob);
            setAudioPreview(URL.createObjectURL(rawBlob));
          } else {
            setStatus({ type: null, text: `Applying ${selectedProfile.name} filter...` });
            const pitchedWavBlob = await applyPitchShift(rawBlob, selectedProfile.rate);
            setAudioBlob(pitchedWavBlob);
            setAudioPreview(URL.createObjectURL(pitchedWavBlob));
            setStatus({ type: null, text: "" });
          }
        } catch (err) {
          console.error("Vocal manipulation failed:", err);
          setStatus({ type: 'error', text: "Failed to apply voice changer." });
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setStatus({ type: 'error', text: "Microphone access denied." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    setAudioBlob(null);
    setAudioPreview(null);
  };

  const [groupData, setGroupData] = useState<{ name: string; imageUrl?: string | null } | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/groups/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setGroupData(data);
        })
        .catch(err => console.error("Metadata fetch failed:", err));
    }
  }, [id]);

  const handleSend = async () => {
    if (!message.trim() && !imageFile && !audioBlob) {
      setStatus({ type: 'error', text: 'Payload cannot be entirely empty.' });
      return;
    }

    if (!id) {
      setStatus({ type: 'error', text: 'Invalid target link.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, text: "" });

    try {
      const groupSlug = id;
      let mediaUrl = null;
      let mediaType = null;

      if (imageFile || audioBlob) {
        const fileExt = imageFile ? imageFile.name.split('.').pop() : 'wav';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const targetBlob = imageFile || audioBlob;
        
        const supabase = getSupabase();
        const { data, error } = await supabase.storage
          .from('anon-media')
          .upload(fileName, targetBlob!, { upsert: false });

        if (error) throw new Error("Storage upload failed: " + error.message);

        const { data: publicData } = supabase.storage
          .from('anon-media')
          .getPublicUrl(fileName);

        mediaUrl = publicData.publicUrl;
        mediaType = imageFile ? 'image' : 'audio';
      }
      
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSlug, message, mediaUrl, mediaType }),
      });

      if (res.ok) {
        setStatus({ type: 'success', text: 'Payload encrypted and dispatched securely.' });
        setMessage("");
        clearMedia();
      } else {
        const data = await res.json();
        setStatus({ type: 'error', text: data.error || 'Failed to dispatch payload.' });
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected transmission error occurred.';
      setStatus({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const remainingChars = 1000 - message.length;
  const progressPercentage = (message.length / 1000) * 100;

  if (!mounted) return <div className="min-h-screen bg-zinc-950" />;

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 pb-24 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_100%)]"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]"></div>
      
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 opacity-40 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.05)] overflow-hidden">
          <div className="p-8 pb-6 border-b border-white/5 bg-zinc-950/40 relative">
            <div className="absolute top-0 right-0 p-6 opacity-30">
              <ShieldCheck className="w-16 h-16 text-emerald-500/20" />
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 relative">
              <Lock className="w-5 h-5 text-emerald-400" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-20 duration-1000"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 relative z-10">
              BURNER <span className="text-emerald-400 bg-clip-text">DROP</span>
            </h1>
            <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-2 relative z-10 opacity-70">
              Burner. Who sent it?
            </p>
            <p className="text-zinc-400 text-sm sm:text-base font-medium relative z-10 flex items-center gap-2 tracking-wide">
               {groupData ? `Sending to: ${groupData.name}` : "They won't trace this back to you."}
            </p>
          </div>

          <div className="p-8 pt-6 space-y-6">
            
            {(imagePreview || audioPreview) && (
              <div className="relative p-2 rounded-xl border border-white/10 bg-zinc-950/50">
                <button 
                  onClick={clearMedia}
                  className="absolute -top-3 -right-3 p-1 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-700 transition z-50"
                >
                  <X className="w-4 h-4" />
                </button>
                {imagePreview && (
                  <img src={imagePreview} alt="Attached" className="w-full max-h-48 object-cover rounded-lg" />
                )}
                {audioPreview && (
                  <div className="p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-emerald-400 font-mono mb-2 uppercase tracking-widest">{selectedProfile.name} Filter Applied</p>
                      <audio controls src={audioPreview} className="w-full h-8" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 relative group">
              <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase flex justify-between">
                <span>Secure Payload</span>
                <span className={remainingChars < 50 ? 'text-red-400' : 'text-zinc-500'}>
                  {remainingChars}
                </span>
              </label>
              
              <div className="relative">
                <textarea
                  title="Secret Message Input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Draft your anonymous confession here..."
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-5 py-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all duration-300 resize-none shadow-inner z-10 relative"
                />
                
                <div className="absolute bottom-4 left-4 right-4 h-1 bg-zinc-800 rounded-full overflow-hidden opacity-50 z-20 pointer-events-none">
                  <div 
                    className={`h-full transition-all duration-300 ${remainingChars < 50 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 cursor-pointer transition text-xs text-zinc-300">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                
                {isRecording ? (
                  <button 
                    onClick={stopRecording}
                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition text-xs text-red-500 animate-pulse"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    Stop
                  </button>
                ) : (
                  <button 
                    onClick={startRecording}
                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-xs text-emerald-400"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Record Voice
                  </button>
                )}
              </div>

              <div className="pt-2">
                <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase mb-3 flex items-center gap-2">
                  <AudioWaveform className="w-3 h-3 text-zinc-600" />
                  Voice Profile Selection
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {VOICE_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedProfile(profile);
                        if (audioBlob) setStatus({ type: null, text: "Tip: Re-record to apply new filter." });
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all duration-300 ${
                        selectedProfile.id === profile.id 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                          : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/10 hover:bg-zinc-950/60'
                      }`}
                    >
                      <span className="text-base">{profile.icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-tighter">{profile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {status.text && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
                status.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : (status.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-500/10 text-zinc-400 border-white/5')
              }`}>
                {status.type === 'success' ? (
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <span>{status.text}</span>
              </div>
            )}

            <button
               title="Send Secret Message"
              onClick={handleSend}
              disabled={loading}
              className="w-full group relative focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded-2xl"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl px-6 py-4 flex items-center justify-center border border-emerald-500/30 overflow-hidden group-hover:border-emerald-500/50 transition-all duration-300 min-h-[60px]">
                
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                
                {loading ? (
                  <span className="flex items-center gap-3 text-emerald-400">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ENCRYPTING...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                    DISPATCH PAYLOAD
                    <Send className="w-4 h-4" />
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
        
        <p className="text-center mt-6 text-xs text-zinc-600 font-mono tracking-widest max-w-[250px] mx-auto uppercase">
          System Secured. Connection Encrypted. [BURNER]
        </p>
      </div>
    </div>
  );
}
