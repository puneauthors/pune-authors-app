import React from "react";
import { AlertOctagon } from "lucide-react";

export function BlockedScreen() {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background pulsing red lights */}
      <div className="absolute top-0 left-0 w-full h-full bg-red-600/10 animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-800 rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-red-500/30 relative z-10">
        <div className="w-full flex justify-center mb-8 relative">
          <div className="absolute -top-4 -right-4 animate-bounce">
            <AlertOctagon className="w-12 h-12 text-red-500" />
          </div>
          <img 
            src="/hacker-blocked.png" 
            alt="Funny Hacker stealing data" 
            className="w-64 h-64 object-cover rounded-2xl shadow-xl border-4 border-slate-700 animate-[wiggle_3s_ease-in-out_infinite]"
            style={{ animation: 'bounce 3s infinite' }}
          />
        </div>
        
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
          Whoa there, Speedy Gonzales! 🏎️💨
        </h1>
        
        <p className="text-slate-300 mb-8 text-xl leading-relaxed">
          Are you trying to download our entire library in 5 seconds? You're clicking way too fast! 
          <br /><br />
          Our server thought you were a robot trying to steal our precious books, so it hit the big red panic button! 🚨
        </p>
        
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 inline-block">
          <p className="text-red-400 font-mono text-sm font-bold uppercase tracking-widest mb-2">
            Status: Temporary Timeout
          </p>
          <p className="text-white text-2xl font-bold">
            Please wait 15 minutes! ☕
          </p>
          <p className="text-slate-400 mt-2 text-sm">
            Grab a coffee, take a breath, and refresh the page when the time is up.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Refresh Page Now
          </button>
        </div>
      </div>
    </div>
  );
}
