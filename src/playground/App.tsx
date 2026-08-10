import { useState, useDeferredValue } from "react";
import { Icon } from "@iconify/react";
import { Henkei } from "../henkei";

function App() {
  // Config for Auto-Loop Mode
  const [autoWordsStr, setAutoWordsStr] = useState("Hi(Hello), Edit, Me, in, Here!");
  const [autoInterval, setAutoInterval] = useState(3000);
  const [autoDuration, setAutoDuration] = useState(1000);
  const [fontUrl, setFontUrl] = useState("https://unpkg.com/@fontsource/chewy@5.0.8/files/chewy-latin-400-normal.woff");
  const [fontSize, setFontSize] = useState(120);

  const deferredInterval = useDeferredValue(autoInterval);
  const deferredDuration = useDeferredValue(autoDuration);
  const deferredFontUrl = useDeferredValue(fontUrl);

  const autoWords = autoWordsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <div className="min-h-screen w-full bg-[#FEF9E1] text-black font-sans p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl flex flex-col items-start mb-8">
        <h1 className="text-7xl font-chewy mb-2 tracking-wide text-left text-[#3D3522]">Henkei</h1>
        <p className="text-[#8A7D63] font-medium text-left text-lg max-w-md leading-relaxed">
          A React component that can be used to transform text with animation
        </p>

        <div className="flex items-center space-x-6 mt-4">
          <a
            href="https://github.com/gilangabdian/henkei"
            className="text-[#3D3522]/70 hover:text-[#3D3522] transition-colors">
            <Icon icon="mdi:github" className="w-8 h-8" />
          </a>
          <a
            href="https://www.npmjs.com/package/henkei"
            className="text-[#3D3522]/70 hover:text-[#3D3522] transition-colors">
            <Icon icon="gg:npm" className="w-8 h-8" />
          </a>
        </div>
      </div>

      {/* Floating Config Panel at Top Right */}
      <div className="fixed top-4 right-4 z-50 bg-white/20 backdrop-blur-md border border-white/30 p-5 rounded-xl shadow-sm w-[500px]">
        <h3 className="text-[10px] font-bold tracking-widest text-[#8A7D63] mb-4">Attributes</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-bold uppercase text-[#A6997B] block mb-1">Words (comma separated)</label>
            <input
              type="text"
              value={autoWordsStr}
              onChange={(e) => setAutoWordsStr(e.target.value)}
              className="w-full bg-white/30 border border-white/40 rounded-md px-3 py-1.5 text-[11px] focus:outline-none focus:border-[#8A7D63] transition-all text-[#6B5E44]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase text-[#A6997B] block mb-1">Font URL (.ttf)</label>
            <input
              type="text"
              value={fontUrl}
              onChange={(e) => setFontUrl(e.target.value)}
              className="w-full bg-white/30 border border-white/40 rounded-md px-3 py-1.5 text-[11px] focus:outline-none focus:border-[#8A7D63] transition-all text-[#6B5E44]"
            />
          </div>
        </div>

        <div className="flex gap-6 mt-5">
          <div className="flex-1">
            <label className="text-[9px] font-bold uppercase text-[#A6997B] flex justify-between mb-1">
              <span>Size</span> <span>{fontSize}px</span>
            </label>
            <input
              type="range"
              min="20"
              max="200"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-[#8A7D63] h-1.5 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
            />
          </div>
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
              className="w-full accent-[#8A7D63] h-1.5 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
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
              className="w-full accent-[#8A7D63] h-1.5 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl relative rounded-3xl bg-[#F5E6CD] shadow-2xl overflow-hidden flex flex-col border border-[#E5D0AC]/50 min-h-[500px]">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/60 rounded-full blur-[100px] pointer-events-none" />

        {/* Render area */}
        <div className="flex-1 flex items-center justify-center p-8 relative" style={{ fontSize: `${fontSize}px` }}>
          <Henkei
            words={autoWords}
            interval={deferredInterval}
            duration={deferredDuration}
            fontUrl={deferredFontUrl}
            className="text-black z-10"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
