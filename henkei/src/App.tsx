import { useState, useDeferredValue } from "react";
import { HenkeiAuto } from "./Henkei/Henkei";

function App() {
  // Config for Auto-Loop Mode
  const [autoWordsStr, setAutoWordsStr] = useState("Fast,Secure,Scalable,Beautiful");
  const [autoInterval, setAutoInterval] = useState(3000);
  const [autoDuration, setAutoDuration] = useState(1000);

  const deferredInterval = useDeferredValue(autoInterval);
  const deferredDuration = useDeferredValue(autoDuration);

  const autoWords = autoWordsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <div className="min-h-screen w-full bg-[#FEF9E1] text-black font-sans p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl flex flex-col items-center mb-12">
        <h1 className="text-7xl font-chewy mb-6 tracking-wide text-center">Henkei</h1>
        <p className="text-[#A6997B] font-medium max-w-2xl text-center text-lg">
          A React component that can be used to transform text with animation.
        </p>
      </div>

      {/* Floating Config Panel at Top Right */}
      <div className="fixed top-4 right-4 z-50 bg-white/20 backdrop-blur-md border border-white/30 p-3 rounded-xl shadow-sm w-72 space-y-3">
        <h3 className="text-[10px] font-bold tracking-widest text-[#8A7D63]">Attributes</h3>

        <div>
          <label className="text-[9px] font-bold uppercase text-[#A6997B] block mb-1">Words (comma separated)</label>
          <input
            type="text"
            value={autoWordsStr}
            onChange={(e) => setAutoWordsStr(e.target.value)}
            className="w-full bg-white/30 border border-white/40 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-[#8A7D63] transition-all text-[#6B5E44]"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[9px] font-bold uppercase text-[#A6997B] flex justify-between mb-1">
              <span>Delay</span> <span>{autoInterval}ms</span>
            </label>
            <input
              type="range"
              min="1000"
              max="5000"
              step="100"
              value={autoInterval}
              onChange={(e) => setAutoInterval(Number(e.target.value))}
              className="w-full accent-[#8A7D63] h-1 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="flex-1">
            <label className="text-[9px] font-bold uppercase text-[#A6997B] flex justify-between mb-1">
              <span>Morph</span> <span>{autoDuration}ms</span>
            </label>
            <input
              type="range"
              min="200"
              max="3000"
              step="100"
              value={autoDuration}
              onChange={(e) => setAutoDuration(Number(e.target.value))}
              className="w-full accent-[#8A7D63] h-1 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl relative rounded-3xl bg-[#F5E6CD] shadow-2xl overflow-hidden flex flex-col border border-[#E5D0AC]/50 min-h-[500px]">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/60 rounded-full blur-[100px] pointer-events-none" />

        {/* Render area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <HenkeiAuto
            words={autoWords}
            interval={deferredInterval}
            duration={deferredDuration}
            className="text-black z-10"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
