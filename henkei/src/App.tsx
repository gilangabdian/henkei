import { useState, useDeferredValue } from "react";
import { useSpring, useMotionValue } from "framer-motion";
import { Henkei } from "./Henkei/Henkei";

function App() {
  const [text1, setText1] = useState("Halo");
  const [text2, setText2] = useState("Hello bro");

  // Defer the text updates passed to the heavy Henkei component 
  // so that the input fields never lag while typing!
  const deferredText1 = useDeferredValue(text1);
  const deferredText2 = useDeferredValue(text2);

  // We use a framer-motion MotionValue to hold the progress
  const progressValue = useMotionValue(0);

  // Apply spring physics for smooth "elastic" transitions even if user drags quickly
  const smoothProgress = useSpring(progressValue, {
    stiffness: 100,
    damping: 15,
    mass: 1,
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // value is from 0 to 100, we convert it to 0.0 - 1.0
    const val = parseFloat(e.target.value) / 100;
    progressValue.set(val);
  };

  return (
    <div className="flex h-screen w-full bg-[#FEF9E1] text-black font-sans overflow-hidden">
      {/* KIRI - Input Form (Mulus tanpa garis pembatas) */}
      <div className="w-[30%] lg:w-[350px] h-full flex flex-col justify-center px-10 lg:px-16 z-10 relative">
        <h1 className="text-6xl font-chewy mb-16 tracking-wide">Henkei</h1>

        <div className="space-y-12">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A6997B]">Origin Text</label>
            <input
              type="text"
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[#E5D0AC] px-0 py-2 text-2xl font-bold focus:outline-none focus:border-black transition-all"
              placeholder="e.g. Halo"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#A6997B]">Target Text</label>
            <input
              type="text"
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[#E5D0AC] px-0 py-2 text-2xl font-bold focus:outline-none focus:border-black transition-all"
              placeholder="e.g. Hello bro"
            />
          </div>
        </div>
      </div>

      {/* KANAN - Teks Henkei & Slider di bawahnya */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E5D0AC]/50 rounded-full blur-[120px] pointer-events-none" />

        {/* Area Teks Morphing (Di tengah) */}
        <div className="flex-1 flex items-center justify-center z-10">
          <Henkei text1={deferredText1} text2={deferredText2} progress={smoothProgress} className="text-black" />
        </div>

        {/* Area Slider (Di bawah) */}
        <div className="w-full flex justify-center pb-16 z-10">
          <div className="w-full max-w-xl px-8 flex flex-col items-center">
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              onChange={handleSliderChange}
              className="w-full accent-black h-3 bg-[#E5D0AC] rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
