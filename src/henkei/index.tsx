import React, { useEffect, useLayoutEffect, useState } from "react";
import { motion, useTransform, MotionValue, useMotionValue, animate } from "framer-motion";
import polygonClipping from "polygon-clipping";
import { interpolateAll, splitPathString } from "flubber";
import { useFont } from "./useFont";

export interface HenkeiProps {
  text1: string;
  text2: string;
  progress: MotionValue<number>;
  className?: string;
  fontUrl?: string;
}

export interface HenkeiCharItem {
  id: number;
  morphInterpolatorIslands: (t: number) => string;
  morphInterpolatorHoles: (t: number) => string;
  startLeft: number;
  endLeft: number;
  width1: number;
  width2: number;
}

const interpolatorCache = new Map<string, { islands: (v: number) => string, holes: (v: number) => string }>();

const HenkeiInternal: React.FC<HenkeiProps> = ({ 
  text1, 
  text2, 
  progress, 
  className, 
  fontUrl = "https://unpkg.com/@fontsource/inter@5.0.19/files/inter-latin-400-normal.woff" 
}) => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commandsToPathData = (commands: any[], decimalPlaces = 2) => {
        const round = (val: number) => Number(val.toFixed(decimalPlaces));
        let prevX = 0;
        let prevY = 0;
        let s = '';
        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          switch (cmd.type) {
            case 'M': {
              if (i > 0) s += 'Z';
              const rx = round(cmd.x);
              const ry = round(cmd.y);
              s += `M${rx} ${ry}`;
              prevX = rx; prevY = ry;
              break;
            }
            case 'L': {
              const rx = round(cmd.x);
              const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY) {
                s += `L${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'C': {
              const rx1 = round(cmd.x1); const ry1 = round(cmd.y1);
              const rx2 = round(cmd.x2); const ry2 = round(cmd.y2);
              const rx = round(cmd.x); const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY || rx1 !== prevX || ry1 !== prevY || rx2 !== prevX || ry2 !== prevY) {
                s += `C${rx1} ${ry1} ${rx2} ${ry2} ${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'Q': {
              const rx1 = round(cmd.x1); const ry1 = round(cmd.y1);
              const rx = round(cmd.x); const ry = round(cmd.y);
              if (rx !== prevX || ry !== prevY || rx1 !== prevX || ry1 !== prevY) {
                s += `Q${rx1} ${ry1} ${rx} ${ry}`;
                prevX = rx; prevY = ry;
              }
              break;
            }
            case 'Z': 
              s += 'Z';
              break;
          }
        }
        if (s.length > 0 && !s.endsWith('Z')) {
          s += 'Z';
        }
        return s.replace(/ZZ/g, 'Z');
      };

      const path1 = commandsToPathData(font.getPath(c1, 0, 80, fontSize).commands);
      const path2 = commandsToPathData(font.getPath(c2, 0, 80, fontSize).commands);

      const unionPolygons = (pathsStr: string) => {
        let currentPoly: number[][] = [];
        const allRings: number[][][] = [];
        let prevX = 0, prevY = 0;

        const cmdRegex = /([MLCQZ])([^MLCQZ]*)/ig;
        let match;
        while ((match = cmdRegex.exec(pathsStr)) !== null) {
            const type = match[1].toUpperCase();
            if (type === 'Z') {
                if (currentPoly.length > 0) allRings.push([...currentPoly]);
                currentPoly = [];
                continue;
            }
            const argsStr = match[2].trim();
            if (!argsStr) continue;
            const nums = argsStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            if (type === 'M') {
                if (currentPoly.length > 0) allRings.push([...currentPoly]);
                currentPoly = [];
                if (nums.length >= 2) { prevX = nums[0]; prevY = nums[1]; currentPoly.push([prevX, prevY]); }
            } else if (type === 'L') {
                if (nums.length >= 2) { prevX = nums[0]; prevY = nums[1]; currentPoly.push([prevX, prevY]); }
            } else if (type === 'Q') {
                if (nums.length >= 4) {
                    for (let i = 1; i <= 5; i++) {
                        const t = i / 5; const mt = 1 - t;
                        currentPoly.push([mt * mt * prevX + 2 * mt * t * nums[0] + t * t * nums[2], mt * mt * prevY + 2 * mt * t * nums[1] + t * t * nums[3]]);
                    }
                    prevX = nums[2]; prevY = nums[3];
                }
            } else if (type === 'C') {
                if (nums.length >= 6) {
                    for (let i = 1; i <= 5; i++) {
                        const t = i / 5; const mt = 1 - t;
                        currentPoly.push([mt * mt * mt * prevX + 3 * mt * mt * t * nums[0] + 3 * mt * t * t * nums[2] + t * t * t * nums[4], mt * mt * mt * prevY + 3 * mt * mt * t * nums[1] + 3 * mt * t * t * nums[3] + t * t * t * nums[5]]);
                    }
                    prevX = nums[4]; prevY = nums[5];
                }
            }
        }
        if (currentPoly.length > 0) allRings.push([...currentPoly]);

        if (allRings.length === 0) return pathsStr;

        const getArea = (ring: number[][]) => {
            let a = 0;
            for (let j = 0; j < ring.length - 1; j++) {
                a += ring[j][0] * ring[j + 1][1] - ring[j + 1][0] * ring[j][1];
            }
            if (ring.length > 0) {
                a += ring[ring.length - 1][0] * ring[0][1] - ring[0][0] * ring[ring.length - 1][1];
            }
            return a / 2;
        };

        const areas = allRings.map(getArea);
        let maxAbsArea = -1;
        let dominantSign = 1;
        areas.forEach(a => {
            if (Math.abs(a) > maxAbsArea) {
                maxAbsArea = Math.abs(a);
                dominantSign = Math.sign(a) || 1;
            }
        });

        const islands: number[][][][] = [];
        const holes: number[][][][] = [];
        allRings.forEach((ring, idx) => {
            if (Math.sign(areas[idx]) === dominantSign || Math.sign(areas[idx]) === 0) {
                islands.push([[...ring]]);
            } else {
                holes.push([[...ring]]);
            }
        });

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let finalShape: any[] = [];
            if (islands.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                finalShape = (polygonClipping.union as any)(...islands);
            }
            
            if (holes.length > 0 && finalShape.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const holesUnioned = (polygonClipping.union as any)(...holes);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                finalShape = (polygonClipping.difference as any)(finalShape, holesUnioned);
            }

            let outStr = '';
            for (const multi of finalShape) {
                for (const ring of multi) {
                    if (ring.length === 0) continue;
                    outStr += `M ${Number(ring[0][0].toFixed(2))} ${Number(ring[0][1].toFixed(2))} `;
                    for (let i = 1; i < ring.length; i++) {
                        outStr += `L ${Number(ring[i][0].toFixed(2))} ${Number(ring[i][1].toFixed(2))} `;
                    }
                    outStr += 'Z ';
                }
            }

            // FALLBACK: If polygonClipping completely destroyed the shape (e.g. simplified it to nothing due to floating point precision on weird overlapping strokes)
            // A foolproof heuristic: polygonClipping converts curves to many line segments, so valid output should be LARGER than the input.
            // If the output string is shorter than the input string, it means polygonClipping destroyed the shape!
            if (!outStr.trim() || outStr.length < pathsStr.length) {
                return pathsStr;
            }

            return outStr;
        } catch {
            return pathsStr;
        }
      };

      // A symmetrical diamond is much more stable for Flubber to collapse into than a tiny square.
      const defaultDot = "M 50 49 L 51 50 L 50 51 L 49 50 Z";
      const validPath1 = unionPolygons(path1 || defaultDot);
      const validPath2 = unionPolygons(path2 || defaultDot);

      let morphInterpolatorIslands: (v: number) => string;
      let morphInterpolatorHoles: (v: number) => string;

      if (validPath1 === validPath2) {
        // Bypass flubber entirely if the characters are identical (Huge CPU saver)
        morphInterpolatorIslands = () => validPath1;
        morphInterpolatorHoles = () => "";
      } else {
        const cacheKey = `${fontUrl}-${fontSize}-${c1}-${c2}-v15`;
        if (interpolatorCache.has(cacheKey)) {
          // Use cached interpolator (Huge CPU saver for repeated words)
          const cached = interpolatorCache.get(cacheKey)!;
          morphInterpolatorIslands = cached.islands;
          morphInterpolatorHoles = cached.holes;
        } else {
          // Compute heavy Flubber math
          const paths1 = splitPathString(validPath1);
          const paths2 = splitPathString(validPath2);

          const getSignedArea = (pathStr: string) => {
            let area = 0;
            const cmdRegex = /([MLCQZ])([^MLCQZ]*)/ig;
            let match;
            const coords: number[][] = [];
            while ((match = cmdRegex.exec(pathStr)) !== null) {
              const type = match[1].toUpperCase();
              if (type === 'Z') continue;
              const argsStr = match[2].trim();
              if (!argsStr) continue;
              const nums = argsStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
              if (type === 'M' || type === 'L') {
                if (nums.length >= 2) coords.push([nums[0], nums[1]]);
              } else if (type === 'Q') {
                if (nums.length >= 4) coords.push([nums[2], nums[3]]);
              } else if (type === 'C') {
                if (nums.length >= 6) coords.push([nums[4], nums[5]]);
              }
            }
            for (let j = 0; j < coords.length - 1; j++) {
              area += coords[j][0] * coords[j + 1][1] - coords[j + 1][0] * coords[j][1];
            }
            if (coords.length > 0) {
              area += coords[coords.length - 1][0] * coords[0][1] - coords[0][0] * coords[coords.length - 1][1];
            }
            return area / 2;
          };

          const getBounds = (pathStr: string) => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            const matches = pathStr.matchAll(/([0-9.-]+)[,\s]+([0-9.-]+)/g);
            for (const match of matches) {
              const x = parseFloat(match[1]);
              const y = parseFloat(match[2]);
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
            return { minX, maxX, minY, maxY };
          };

          const classifyRings = (paths: string[]) => {
            if (paths.length === 0) return { islands: [], holes: [] };
            const areas = paths.map(getSignedArea);
            const bounds = paths.map(getBounds);

            let maxAbsArea = -1;
            let islandSign = 1;
            areas.forEach((a) => {
              if (Math.abs(a) > maxAbsArea) {
                maxAbsArea = Math.abs(a);
                islandSign = Math.sign(a) || 1;
              }
            });

            const potentialIslands: string[] = [];
            const potentialHoles: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const islandBoundsList: any[] = [];
            
            const reversePolygon = (pathStr: string) => {
              const coords = [...pathStr.matchAll(/([0-9.-]+)[,\s]+([0-9.-]+)/g)];
              if (coords.length === 0) return pathStr;
              let rev = `M ${coords[coords.length-1][1]} ${coords[coords.length-1][2]} `;
              for(let i = coords.length-2; i >= 0; i--) {
                  rev += `L ${coords[i][1]} ${coords[i][2]} `;
              }
              return rev + 'Z';
            };

            paths.forEach((p, idx) => {
              if (Math.sign(areas[idx]) === islandSign || Math.sign(areas[idx]) === 0) {
                potentialIslands.push(p);
                islandBoundsList.push(bounds[idx]);
              } else {
                potentialHoles.push(p); // Keep original for bounds lookup!
              }
            });

            const islands = [...potentialIslands];
            const holes: string[] = [];

            // A true hole MUST be geometrically contained within the bounding box of an island.
            // If it's an overlapping Kanji stroke with a weird winding sign, it will likely extend outside.
            potentialHoles.forEach((pHole) => {
              const hb = bounds[paths.indexOf(pHole)];
              let isInside = false;
              for (const ib of islandBoundsList) {
                // Allow a small 0.5px margin for rounding errors
                if (hb.minX >= ib.minX - 0.5 && hb.maxX <= ib.maxX + 0.5 &&
                    hb.minY >= ib.minY - 0.5 && hb.maxY <= ib.maxY + 0.5) {
                  isInside = true;
                  break;
                }
              }

              if (isInside) {
                holes.push(pHole);
              } else {
                // Not contained in any island? It's just a misclassified stroke!
                islands.push(pHole);
              }
            });

            // Reverse holes so they have positive area, preventing Flubber crashes!
            const finalHoles = holes.map(reversePolygon);

            return { islands, holes: finalHoles };
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

          // --- ISLANDS INTERPOLATION (Duplicate to Merge/Split naturally) ---
          // Since we use SVG <mask fill-rule="nonzero">, overlapping paths don't cancel each other out!
          // We can safely duplicate them to create natural splits and merges!

          while (islands1.length < islands2.length) {
            if (islands1.length > 0) {
              islands1.push(islands1[islands1.length - 1]);
            } else {
              const { x, y } = getCenter(islands2[islands1.length]);
              islands1.push(`M ${x} ${y} L ${x+0.1} ${y} L ${x} ${y+0.1} Z`);
            }
          }
          while (islands2.length < islands1.length) {
            if (islands2.length > 0) {
              islands2.push(islands2[islands2.length - 1]);
            } else {
              const { x, y } = getCenter(islands1[islands2.length]);
              islands2.push(`M ${x} ${y} L ${x+0.1} ${y} L ${x} ${y+0.1} Z`);
            }
          }

          let interpsIslands: ((t: number) => string)[] = [];
          if (islands1.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            interpsIslands = (interpolateAll as any)(islands1, islands2, { maxSegmentLength: 1.5, match: false });
          }

          // --- HOLES INTERPOLATION (Slide-Out or Duplicate) ---
          // Holes should also duplicate if possible. If the target has no holes, 
          // we slide the hole out to the top edge of the island so it doesn't shrink in the middle.

          while (holes1.length < holes2.length) {
            if (holes1.length > 0) {
              holes1.push(holes1[holes1.length - 1]);
            } else {
              const bounds = getBounds(islands1[0] || defaultDot);
              const { x } = getCenter(holes2[holes1.length]);
              const y = bounds.minY; // Slide in from the top
              holes1.push(`M ${x} ${y-0.1} L ${x+0.1} ${y} L ${x} ${y+0.1} L ${x-0.1} ${y} Z`);
            }
          }
          while (holes2.length < holes1.length) {
            if (holes2.length > 0) {
              holes2.push(holes2[holes2.length - 1]);
            } else {
              const bounds = getBounds(islands2[0] || defaultDot);
              const { x } = getCenter(holes1[holes2.length]);
              const y = bounds.minY; // Slide out to the top
              holes2.push(`M ${x} ${y-0.1} L ${x+0.1} ${y} L ${x} ${y+0.1} L ${x-0.1} ${y} Z`);
            }
          }

          let interpsHoles: ((t: number) => string)[] = [];
          if (holes1.length > 0) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawInterps = (interpolateAll as any)(holes1, holes2, { maxSegmentLength: 1.5, match: false });
              interpsHoles = holes1.map((h1, idx) => {
                const h2 = holes2[idx];
                if (h1 === h2) return () => h1; // Bypass identical holes, saves CPU & avoids jitter
                return (v: number) => {
                  try {
                    return rawInterps[idx](v);
                  } catch {
                    return v < 0.5 ? h1 : h2; // Fallback snap
                  }
                };
              });
            } catch {
              interpsHoles = holes1.map((h1, idx) => {
                const h2 = holes2[idx];
                return (v: number) => (v < 0.5 ? h1 : h2);
              });
            }
          }

          morphInterpolatorIslands = (v: number) => {
            if (islands1.length === 0 && islands2.length === 0) return "";
            return interpsIslands.map((fn: (t: number) => string, idx: number) => {
              try {
                return fn(v);
              } catch {
                return v < 0.5 ? islands1[idx] : islands2[idx];
              }
            }).join(" ");
          };

          morphInterpolatorHoles = (v: number) => {
            if (holes1.length === 0 && holes2.length === 0) return "";
            return interpsHoles.map((fn: (t: number) => string, idx: number) => {
              try {
                return fn(v);
              } catch {
                return v < 0.5 ? holes1[idx] : holes2[idx];
              }
            }).join(" ");
          };
          
          interpolatorCache.set(cacheKey, { islands: morphInterpolatorIslands, holes: morphInterpolatorHoles });
        }
      }

      chars.push({
        id: i,
        morphInterpolatorIslands,
        morphInterpolatorHoles,
        startLeft,
        endLeft,
        width1,
        width2,
      });
    }

    return { chars, currentStartLeft, currentEndLeft };
  }, [text1, text2, fontData.font, fontData.url, maxLength, fontUrl]);

  if (!fontData.font || fontData.url !== fontUrl) {
    return <div style={{ fontSize: '1.5rem', color: '#9ca3af', fontWeight: 'bold', letterSpacing: '0.1em' }}>Loading Font...</div>;
  }

  const { chars: characters, currentStartLeft, currentEndLeft } = charactersData;

  return (
    <div className={className} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <HenkeiContainer progress={progress} startWidth={currentStartLeft} endWidth={currentEndLeft}>
        {characters.map((item) => (
          <HenkeiCharacter key={item.id} item={item} progress={progress} charId="char" />
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
    <motion.div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: containerWidth, height: "1em" }}>
      {children}
    </motion.div>
  );
};


const HenkeiCharacter: React.FC<{ item: HenkeiCharItem; progress: MotionValue<number>; charId: string }> = ({ item, progress, charId }) => {
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

  // Interpolate islands
  const morphPathIslands = useTransform(progress, (v: number) => {
    try {
      return itemRef.current.morphInterpolatorIslands(v);
    } catch {
      return "";
    }
  });

  // Interpolate holes
  const morphPathHoles = useTransform(progress, (v: number) => {
    try {
      return itemRef.current.morphInterpolatorHoles(v);
    } catch {
      return "";
    }
  });

  const maskId = `henkei-mask-${charId}-${item.id}`;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        overflow: 'visible',
        left: x,
        height: "1em",
      }}>
      <motion.svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }} height="1em" viewBox="0 0 100 100">
        <defs>
          <mask id={maskId}>
            <rect width="200" height="200" x="-50" y="-50" fill="white" />
            <motion.path d={morphPathHoles} fill="black" fillRule="nonzero" />
          </mask>
        </defs>
        <motion.path d={morphPathIslands} fill="currentColor" fillRule="nonzero" mask={`url(#${maskId})`} />
      </motion.svg>
    </motion.div>
  );
};

export const Henkei: React.FC<{ words: string[], interval?: number, duration?: number, className?: string, fontUrl?: string }> = ({ words, interval = 3000, duration = 1000, className, fontUrl = "https://unpkg.com/@fontsource/inter@5.0.19/files/inter-latin-400-normal.woff" }) => {
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

  return <HenkeiInternal text1={texts.origin} text2={texts.target} progress={progress} className={className} fontUrl={fontUrl} />;
};

