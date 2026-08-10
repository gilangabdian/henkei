import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { Henkei } from '../src/Henkei';

// Mock opentype.js network request since we don't have the font locally
vi.mock('../src/Henkei/useFont', () => ({
  useFont: () => ({
    font: {
      getPath: (char: string) => {
        if (char === " ") return { commands: [], getBoundingBox: () => ({ x1: 0, y1: 0, x2: 0, y2: 0 }) };
        if (char === "i" || char === "!") return {
          // 2 islands (e.g. body and dot)
          commands: [
            { type: 'M', x: 0, y: 10 }, { type: 'L', x: 10, y: 10 }, { type: 'L', x: 10, y: 20 }, { type: 'Z' }, // body
            { type: 'M', x: 0, y: 0 }, { type: 'L', x: 5, y: 0 }, { type: 'L', x: 5, y: 5 }, { type: 'Z' }       // dot
          ],
          getBoundingBox: () => ({ x1: 0, y1: 0, x2: 10, y2: 20 }),
        };
        return {
          // 1 island
          commands: [{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 10, y: 0 }, { type: 'L', x: 10, y: 10 }, { type: 'Z' }],
          getBoundingBox: () => ({ x1: 0, y1: 0, x2: 10, y2: 10 }),
        };
      },
      getAdvanceWidth: () => 10,
    },
    url: "mock-url",
  }),
}));

describe('Henkei Component Layout Independence', () => {
  it('renders without crashing even with different word lengths (Ship -> Design)', async () => {
    // Render the component
    const { container } = render(
      <Henkei words={["Ship", "Design"]} interval={100} duration={50} fontUrl="mock-url" />
    );

    // Wait a bit for the interval to switch words from Ship to Design
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    // The container should have inline styles for position relative and display inline-flex
    const wrapper = container.querySelector('div');
    expect(wrapper).toHaveStyle('position: relative');
    expect(wrapper).toHaveStyle('display: flex');
    expect(wrapper).toHaveStyle('align-items: center');

    // It should have SVG elements for characters
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    
    // SVGs should also have inline absolute positioning
    expect(svgs[0]).toHaveStyle('position: absolute');
    expect(svgs[0]).toHaveStyle('top: 0');
  });
  it('handles letters with different island counts (shrink-in-place logic)', async () => {
    // "i" has 2 islands, "t" has 1 island based on our mock
    const { container } = render(
      <Henkei words={["i", "t"]} interval={100} duration={50} fontUrl="mock-url" />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    
    // The path should be rendered without crashing
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });
});
