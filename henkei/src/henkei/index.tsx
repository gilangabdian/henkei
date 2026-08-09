import React, { useEffect, useLayoutEffect, useState } from "react";
import { motion, useTransform, MotionValue, useMotionValue, animate } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import opentype from "opentype.js";
import { interpolateAll, splitPathString } from "flubber";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook to load font
function useFont(url: string) {
  const [fontData, setFontData] = useState<{ font: opentype.Font | null, url: string }>({ font: null, url });
  useEffect(() => {
    setFontData({ font: null, url });
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        try {
          const f = opentype.parse(buffer);
          setFontData({ font: f, url });
        } catch (e) {
          console.error("Error parsing font:", e);
        }
      })
      .catch((err) => console.error("Error fetching font:", err));
  }, [url]);
  return fontData;
}

export interface HenkeiProps {
  text1: string;
  text2: string;
  progress: MotionValue<number>;
  className?: string;
  fontUrl: string;
}

export interface HenkeiCharItem {
  id: number;
  morphInterpolator: (t: number) => string;
  startLeft: number;
  endLeft: number;
  width1: number;
  width2: number;
}

const interpolatorCache = new Map<string, (v: number) => string>();

export const HenkeiCore: React.FC<HenkeiProps> = ({ text1, text2, progress, className, fontUrl }) => {
  const fontData = useFont(fontUrl);
  const maxLength = Math.max(text1.length, text2.length, 1);

  // Calculate characters and their morph paths with useMemo to prevent freezing
  const charactersData = React.useMemo(() => {
    if (!fontData.font || fontData.url !== fontUrl) return { chars: [], currentStartLeft: 0, currentEndLeft: 0 };
    const font = fontData.font;

    const chars: HenkeiCharItem[] = [];
    let currentStartLeft = 0;
    let currentEndLeft = 0;

    const fontSize = 100;

    for (let i = 0; i < maxLength; i++) {
      // If a word runs out of letters, use its last letter as the morphing origin/target (The Split)
      let c1 = i < text1.length ? text1[i] : text1[text1.length - 1] || " ";
      let c2 = i < text2.length ? text2[i] : text2[text2.length - 1] || " ";

      // Fix: If it's an extra character and it is a space, don't make it emerge from the last letter!
      if (i >= text1.length && c2 === " ") c1 = " ";
      if (i >= text2.length && c1 === " ") c2 = " ";

      // Get advance width to properly size the container naturally!
      const width1 = font.getAdvanceWidth(c1, fontSize);
      const width2 = font.getAdvanceWidth(c2, fontSize);

      const startLeft = (i < text1.length) 
        ? (() => { const val = currentStartLeft; currentStartLeft += width1; return val; })()
        : currentStartLeft - font.getAdvanceWidth(text1[text1.length - 1] || ' ', fontSize);

      const endLeft = (i < text2.length)
        ? (() => { const val = currentEndLeft; currentEndLeft += width2; return val; })()
        : currentEndLeft - font.getAdvanceWidth(text2[text2.length - 1] || ' ', fontSize);

      const commandsToPathData = (commands: any[], decimalPlaces = 2) => {
        const round = (val: number) => Number(val.toFixed(decimalPlaces));
        let prevX = 0;
        let prevY = 0;
        return commands.map(cmd => {
          let s = '';
          switch (cmd.type) {
            case 'M': {
              const rx = round(cmd.x);
              const ry = round(cmd.y);
              s = `M${rx} ${ry}`;
              prevX = rx; prevY = ry;
              break;
            }
            case 'L': {
              const rx = round(cmd.x);
              const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY) {
                s = `L${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'C': {
              const rx1 = round(cmd.x1); const ry1 = round(cmd.y1);
              const rx2 = round(cmd.x2); const ry2 = round(cmd.y2);
              const rx = round(cmd.x); const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY || rx1 !== prevX || ry1 !== prevY || rx2 !== prevX || ry2 !== prevY) {
                s = `C${rx1} ${ry1} ${rx2} ${ry2} ${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'Q': {
              const rx1 = round(cmd.x1); const ry1 = round(cmd.y1);
              const rx = round(cmd.x); const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY || rx1 !== prevX || ry1 !== prevY) {
                s = `Q${rx1} ${ry1} ${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'Z': 
              s = 'Z';
              break;
            default: 
              s = '';
              break;
          }
          return s;
        }).join('');
      };

      const path1 = commandsToPathData(font.getPath(c1, 0, 80, fontSize).commands);
      const path2 = commandsToPathData(font.getPath(c2, 0, 80, fontSize).commands);

      const validPath1 = path1 || "M 50 40 L 50.1 40 L 50.1 40.1 L 50 40.1 Z";
      const validPath2 = path2 || "M 50 40 L 50.1 40 L 50.1 40.1 L 50 40.1 Z";

      let morphInterpolator: (v: number) => string;

      if (validPath1 === validPath2) {
        // Bypass flubber entirely if the characters are identical (Huge CPU saver)
        morphInterpolator = () => validPath1;
      } else {
        const cacheKey = `${fontUrl}-${fontSize}-${c1}-${c2}-v3`;
        if (interpolatorCache.has(cacheKey)) {
          // Use cached interpolator (Huge CPU saver for repeated words)
          morphInterpolator = interpolatorCache.get(cacheKey)!;
        } else {
          // Compute heavy Flubber math
          const paths1 = splitPathString(validPath1);
          const paths2 = splitPathString(validPath2);

          const getSignedArea = (pathStr: string) => {
            const coords: number[][] = [];
            const regex = /([0-9.-]+)[,\s]+([0-9.-]+)/g;
            let match;
            while ((match = regex.exec(pathStr)) !== null) {
              coords.push([parseFloat(match[1]), parseFloat(match[2])]);
            }
            let area = 0;
            for (let j = 0; j < coords.length - 1; j++) {
              area += coords[j][0] * coords[j + 1][1] - coords[j + 1][0] * coords[j][1];
            }
            return area / 2;
          };

          const classifyRings = (paths: string[]) => {
            if (paths.length === 0) return { islands: [], holes: [] };
            const areas = paths.map(getSignedArea);

            let maxAbsArea = -1;
            let islandSign = 1;
            areas.forEach((a) => {
              if (Math.abs(a) > maxAbsArea) {
                maxAbsArea = Math.abs(a);
                islandSign = Math.sign(a) || 1;
              }
            });

            const islands: string[] = [];
            const holes: string[] = [];
            paths.forEach((p, idx) => {
              if (Math.sign(areas[idx]) === islandSign || Math.sign(areas[idx]) === 0) {
                islands.push(p);
              } else {
                holes.push(p);
              }
            });
            return { islands, holes };
          };

          const { islands: islands1, holes: holes1 } = classifyRings(paths1);
          const { islands: islands2, holes: holes2 } = classifyRings(paths2);

          const getCenter = (pathStr: string) => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            const matches = pathStr.matchAll(/([0-9.-]+)[,\s]+([0-9.-]+)/g);
            let found = false;
            for (const match of matches) {
              found = true;
              const x = parseFloat(match[1]);
              const y = parseFloat(match[2]);
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
            if (!found) return { x: 50, y: 50 };
            return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
          };

          const getFirstCoord = (pathStr: string) => {
            const match = pathStr.match(/M\s*([0-9.-]+)[,\s]+([0-9.-]+)/);
            return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 50, y: 50 };
          };

          // --- ISLANDS INTERPOLATION (Cell Division Logic to avoid slicing) ---

          // Find the origin coordinates for new islands to sprout from or shrink into
          const spawnCoord1 = islands1.length > 0 ? getCenter(islands1[0]) : { x: 50, y: 50 };
          const spawnCoord2 = islands2.length > 0 ? getFirstCoord(islands2[0]) : { x: 50, y: 50 };

          while (islands1.length < islands2.length) {
            const { x, y } = spawnCoord1;
            islands1.push(`M ${x} ${y} L ${x} ${y} L ${x} ${y} Z`);
          }
          while (islands2.length < islands1.length) {
            const { x, y } = spawnCoord2;
            islands2.push(`M ${x} ${y} L ${x} ${y} L ${x} ${y} Z`);
          }

          let interpsIslands: ((t: number) => string)[] = [];
          if (islands1.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            interpsIslands = (interpolateAll as any)(islands1, islands2, { maxSegmentLength: 1.5, match: false });
          }

          // --- HOLES INTERPOLATION (Easing logic to avoid slicing bodies) ---
          const originalHolesLength1 = holes1.length;
          const originalHolesLength2 = holes2.length;

          while (holes1.length < holes2.length) {
            const { x, y } = spawnCoord1;
            holes1.push(`M ${x} ${y} L ${x} ${y} L ${x} ${y} Z`);
          }
          while (holes2.length < holes1.length) {
            const { x, y } = spawnCoord2;
            holes2.push(`M ${x} ${y} L ${x} ${y} L ${x} ${y} Z`);
          }

          let interpsHoles: ((t: number) => string)[] = [];
          if (holes1.length > 0) {
            interpsHoles = (interpolateAll as any)(holes1, holes2, { maxSegmentLength: 1.5, match: false });
          }

          morphInterpolator = (v: number) => {
            const islandPaths = interpsIslands.map((fn) => fn(v));
            const holePaths = interpsHoles.map((fn, index) => {
              let modV = v;
              if (originalHolesLength1 < originalHolesLength2 && index >= originalHolesLength1) {
                modV = Math.max(0, (v - 0.5) * 2);
              } else if (originalHolesLength2 < originalHolesLength1 && index >= originalHolesLength2) {
                modV = Math.min(1, v * 2);
              }
              return fn(modV);
            });
            return [...islandPaths, ...holePaths].join(" ");
          };
          
          interpolatorCache.set(cacheKey, morphInterpolator);
        }
      }

      chars.push({
        id: i,
        morphInterpolator,
        startLeft,
        endLeft,
        width1,
        width2,
      });
    }

    return { chars, currentStartLeft, currentEndLeft };
  }, [text1, text2, fontData.font, fontData.url, maxLength, fontUrl]);

  if (!fontData.font || fontData.url !== fontUrl) {
    return <div className="text-2xl text-gray-400 font-bold tracking-widest animate-pulse">Loading Font...</div>;
  }

  const { chars: characters, currentStartLeft, currentEndLeft } = charactersData;

  return (
    <div className={cn("relative flex items-center justify-center mix-blend-darken", className)}>
      <HenkeiContainer progress={progress} startWidth={currentStartLeft} endWidth={currentEndLeft}>
        {characters.map((item) => (
          <HenkeiCharacter key={item.id} item={item} progress={progress} />
        ))}
      </HenkeiContainer>
    </div>
  );
};

const HenkeiContainer = ({ progress, startWidth, endWidth, children }: { progress: MotionValue<number>, startWidth: number, endWidth: number, children: React.ReactNode }) => {
  const widths = React.useRef({ startWidth, endWidth });
  React.useLayoutEffect(() => {
    widths.current = { startWidth, endWidth };
  }, [startWidth, endWidth]);

  const containerWidth = useTransform(progress, (v: number) => {
    const { startWidth: s, endWidth: e } = widths.current;
    return `${(s + (e - s) * v) / 100}em`;
  });

  return (
    <motion.div className="relative inline-flex items-center justify-center" style={{ width: containerWidth, height: "1em" }}>
      {children}
    </motion.div>
  );
};


const HenkeiCharacter: React.FC<{ item: HenkeiCharItem; progress: MotionValue<number> }> = ({ item, progress }) => {
  // Store the latest item in a ref to avoid stale closures in useTransform
  const itemRef = React.useRef(item);
  React.useLayoutEffect(() => {
    itemRef.current = item;
  }, [item]);

  // Smoothly interpolate the absolute X position as an em string to scale natively with CSS font-size
  const x = useTransform(progress, (v: number) => {
    const cur = itemRef.current;
    return `${(cur.startLeft + (cur.endLeft - cur.startLeft) * v) / 100}em`;
  });

  // Interpolate the SVG Path d attribute reading from the latest ref
  const morphPath = useTransform(progress, (v: number) => {
    try {
      return itemRef.current.morphInterpolator(v);
    } catch (e) {
      console.log(e);
      return "";
    }
  });

  return (
    <motion.div
      className="absolute top-0 overflow-visible"
      style={{
        left: x,
        height: "1em",
      }}>
      <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" height="1em" viewBox="0 0 100 100">
        <motion.path d={morphPath} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </motion.div>
  );
};

export const Henkei: React.FC<{ words: string[], interval?: number, duration?: number, className?: string, fontUrl?: string }> = ({ words, interval = 3000, duration = 1000, className, fontUrl = "/Chewy-Regular.ttf" }) => {
  const [index, setIndex] = useState(0);

  // Cycle through words based on the interval
  useEffect(() => {
    if (words.length <= 1) return;
    // Ensure the interval is always slightly longer than the duration to prevent cutting off the animation
    const safeInterval = Math.max(interval, duration + 100);
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % words.length);
    }, safeInterval);
    return () => clearInterval(timer);
  }, [words, interval, duration]);

  const text = words.length > 0 ? words[index] : "";

  // The animation state previously in HenkeiReactive
  const [texts, setTexts] = useState({ origin: text, target: text });
  const progress = useMotionValue(0);

  // 1. Derived state: when text prop changes, update our origin and target synchronously during render (React best practice)
  if (text !== texts.target) {
    setTexts({ origin: texts.target, target: text });
  }

  // 2. Animation trigger: when texts change (and origin != target), run the animation
  useLayoutEffect(() => {
    if (texts.origin !== texts.target) {
      progress.set(0); // Child refs are already updated by this point, so progress 0 computes perfectly
      const controls = animate(progress, 1, { duration: duration / 1000, ease: "easeInOut" });
      
      // Cleanup: if texts change again before animation finishes, stop the old animation
      return () => controls.stop();
    }
  }, [texts, progress, duration]);

  return <HenkeiCore text1={texts.origin} text2={texts.target} progress={progress} className={className} fontUrl={fontUrl} />;
};

