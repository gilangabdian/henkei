import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { Henkei } from '../src/Henkei';

// Mock opentype.js network request since we don't have the font locally
vi.mock('../src/Henkei/useFont', () => ({
  useFont: () => ({
    font: {
      getPath: (char: string) => ({
        commands: char === " " ? [] : [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }],
        getBoundingBox: () => ({ x1: 0, y1: 0, x2: 10, y2: 10 }),
      }),
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
});
