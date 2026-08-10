import { useState, useEffect } from "react";
import opentype from "opentype.js";

export const useFont = (url: string) => {
  const [font, setFont] = useState<opentype.Font | null>(null);

  useEffect(() => {
    let active = true;
    async function loadFont() {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        if (active) {
          const loadedFont = opentype.parse(buffer);
          setFont(loadedFont);
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

  return { font, url };
};
