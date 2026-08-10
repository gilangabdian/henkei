import { useState, useEffect } from "react";
import opentype from "opentype.js";

export const useFont = (url: string) => {
  const [fontData, setFontData] = useState<{ font: opentype.Font | null; url: string }>({ font: null, url: "" });

  useEffect(() => {
    let active = true;
    async function loadFont() {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        if (active) {
          const loadedFont = opentype.parse(buffer);
          setFontData({ font: loadedFont, url });
        }
      } catch (err) {
        console.error("Error fetching font:", err);
      }
    }
    loadFont();
    return () => {
      active = false;
    };
  }, [url]);

  return fontData;
};
